import { performance } from "node:perf_hooks";
import { getActiveApiKey } from "../config/gemini-keys.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 3000;
const ATTEMPT_TIMEOUT_MS = 6000;
const TOTAL_TIMEOUT_MS = 14000;
const MAX_ATTEMPTS = 6;
const REFRESH_RETRY_MS = 30000;

let cachedModels = [];
let cacheExpiresAt = 0;
let refreshPromise = null;
let nextRefreshAllowedAt = 0;

// Evita reintroducir inmediatamente un modelo que respondió 404.
// También protege frente a un refresco concurrente ya iniciado.
const retiredUntil = new Map();

// Los modelos saturados se omiten temporalmente entre peticiones.
const cooldownUntil = new Map();

export class GeminiError extends Error {
  constructor(message, {
    status = 502,
    retryable = false,
    retryAfterMs = 0,
    code = "GEMINI_ERROR"
  } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.code = code;
  }
}

function timeoutError(message) {
  return new GeminiError(message, {
    status: 504,
    retryable: true,
    code: "GEMINI_TIMEOUT"
  });
}

function remainingMs(deadline) {
  return Math.max(0, Math.floor(deadline - performance.now()));
}

function parseRetryAfter(value) {
  if (!value) return 0;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

/**
 * El timeout cubre fetch y la lectura del cuerpo.
 * Promise.race limita la espera; AbortController cancela la petición.
 */
async function requestJson(url, options, timeoutMs) {
  if (timeoutMs <= 0) {
    throw timeoutError("Se agotó el presupuesto de espera de Gemini.");
  }

  const controller = new AbortController();
  let timer;

  const operation = (async () => {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Un proxy o error HTTP puede devolver HTML en vez de JSON.
    }

    if (!response.ok) {
      const providerMessage = String(data?.error?.message || "");
      const capabilityMismatch =
        response.status === 400 &&
        /unsupported|not supported|not enabled/i.test(providerMessage) &&
        /image|modality|response.?mime|application\/json|json mode/i.test(
          providerMessage
        );

      throw new GeminiError(
        `Gemini respondió HTTP ${response.status}.`,
        {
          status: response.status,
          retryable:
            [404, 408, 429, 500, 502, 503, 504].includes(response.status) ||
            capabilityMismatch,
          retryAfterMs: parseRetryAfter(
            response.headers.get("retry-after")
          ),
          code: capabilityMismatch
            ? "GEMINI_CAPABILITY_MISMATCH"
            : "GEMINI_HTTP_ERROR"
        }
      );
    }

    if (!data || typeof data !== "object") {
      throw new GeminiError("Gemini devolvió una respuesta HTTP no válida.", {
        retryable: true,
        code: "GEMINI_INVALID_RESPONSE"
      });
    }

    return data;
  })();

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(timeoutError("Se agotó el tiempo del intento con Gemini."));
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } catch (error) {
    if (error instanceof GeminiError) throw error;

    if (controller.signal.aborted || error?.name === "AbortError") {
      throw timeoutError("La petición a Gemini fue cancelada por timeout.");
    }

    if (error instanceof TypeError || error?.cause?.code) {
      throw new GeminiError("Error de conexión con Gemini.", {
        retryable: true,
        code: "GEMINI_NETWORK_ERROR"
      });
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Un solicitante puede dejar de esperar sin cancelar el refresco compartido.
async function waitWithin(promise, timeoutMs) {
  if (timeoutMs <= 0) {
    throw timeoutError("Se agotó el tiempo de espera del catálogo.");
  }

  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(timeoutError("El catálogo de Gemini no estuvo listo a tiempo."));
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function isRetired(name) {
  const until = retiredUntil.get(name) || 0;

  if (until <= Date.now()) {
    retiredUntil.delete(name);
    return false;
  }

  return true;
}

function isCoolingDown(name) {
  const until = cooldownUntil.get(name) || 0;

  if (until <= Date.now()) {
    cooldownUntil.delete(name);
    return false;
  }

  return true;
}

function isSpecialized(model) {
  const name = model.name.toLowerCase();

  // Se aplican a nombres, no a descripciones: un modelo multimodal
  // general puede mencionar imágenes en su descripción.
  return /embedding|imagen|(?:^|[-/])veo(?:-|$)|(?:^|[-/])tts(?:-|$)|(?:^|[-/])aqa(?:-|$)|audio|transcribe|robotics|computer-use|customtools|image|banana|deep-research|live|realtime/.test(
    name
  );
}

function isUnstable(model) {
  return /(?:^|[-/])(preview|exp|experimental)(?:-|$)/i.test(model.name);
}

function preferenceTier(model) {
  const name = model.name.toLowerCase();

  if (/(?:^|-)pro(?:-|$)|ultra|heavy/.test(name)) return 2;
  if (/lite|lightweight|mini|nano/.test(name)) return 1;

  // Incluye Flash, modelos estándar y futuras familias desconocidas.
  return 0;
}

function numericVersion(model) {
  const id = model.name.replace(/^models\//, "");
  const match =
    id.match(/\d+(?:\.\d+)*/) ||
    String(model.version || "").match(/\d+(?:\.\d+)*/);

  return match ? match[0].split(".").map(Number) : [];
}

function compareVersionsNewestFirst(a, b) {
  const av = numericVersion(a);
  const bv = numericVersion(b);

  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const difference = (bv[i] || 0) - (av[i] || 0);
    if (difference) return difference;
  }

  return a.name.localeCompare(b.name, undefined, { numeric: true });
}

function orderModels(models) {
  const unique = Array.from(
    new Map(models.map(model => [model.name, model])).values()
  );

  const generalModels = unique.filter(model =>
    Array.isArray(model.supportedGenerationMethods) &&
    model.supportedGenerationMethods.includes("generateContent") &&
    /^models\/[a-zA-Z0-9._-]+$/.test(model.name || "") &&
    !isSpecialized(model) &&
    !isRetired(model.name)
  );

  // Si hay estables, no se usan variantes preview/exp.
  const stableModels = generalModels.filter(model => !isUnstable(model));
  const eligible = stableModels.length ? stableModels : generalModels;

  // Preferencia por familias rápidas conocidas.
  const preferred = eligible.filter(model =>
    /flash|lite|lightweight|mini|nano|standard/i.test(model.name)
  );

  // Respaldo independiente del nombre de familia.
  // No se pierden modelos generales desconocidos, incluidos modelos Pro.
  const preferredNames = new Set(preferred.map(model => model.name));
  const catchAll = eligible.filter(model => !preferredNames.has(model.name));

  return [...preferred, ...catchAll].sort((a, b) =>
    preferenceTier(a) - preferenceTier(b) ||
    compareVersionsNewestFirst(a, b)
  );
}

async function loadCatalog() {
  const deadline = performance.now() + DISCOVERY_TIMEOUT_MS;
  const models = [];
  const seenTokens = new Set();
  let pageToken = "";

  do {
    const url = new URL(`${API_BASE}/models`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    // La misma clave se utiliza en descubrimiento y generación.
    // Se envía por cabecera para no exponerla en URLs o logs.
    const data = await requestJson(
      url,
      { headers: { "x-goog-api-key": getActiveApiKey() } },
      remainingMs(deadline)
    );

    if (!Array.isArray(data.models)) {
      throw new GeminiError("El catálogo no contiene una lista de modelos.");
    }

    models.push(...data.models);
    pageToken = String(data.nextPageToken || "");

    if (pageToken) {
      if (seenTokens.has(pageToken)) {
        throw new GeminiError("El catálogo devolvió paginación repetida.");
      }
      seenTokens.add(pageToken);
    }
  } while (pageToken);

  return models;
}

export function refreshModelsCatalogInBackground() {
  if (refreshPromise) return refreshPromise;

  if (Date.now() < nextRefreshAllowedAt) {
    return Promise.resolve();
  }

  nextRefreshAllowedAt = Date.now() + REFRESH_RETRY_MS;

  refreshPromise = (async () => {
    const rawModels = await loadCatalog();
    const ordered = orderModels(rawModels);

    if (!ordered.length) {
      throw new GeminiError(
        "No hay modelos generales disponibles con generateContent.",
        { status: 503, code: "GEMINI_NO_MODELS" }
      );
    }

    cachedModels = ordered;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    console.info(
      `[Gemini Registry] Catálogo actualizado: ${ordered.length} modelos.`
    );
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function scheduleRefresh() {
  void refreshModelsCatalogInBackground().catch(error => {
    // No se registran la clave, los prompts ni las respuestas estudiantiles.
    console.warn(
      `[Gemini Registry] No se pudo actualizar el catálogo: ${
        error.code || "CATALOG_ERROR"
      }.`
    );
  });
}

async function getModels(deadline) {
  const available = cachedModels.filter(model => !isRetired(model.name));

  if (available.length) {
    // Stale-while-revalidate: una caché vencida todavía puede servir.
    if (Date.now() >= cacheExpiresAt) scheduleRefresh();
    return available;
  }

  await waitWithin(
    refreshModelsCatalogInBackground(),
    remainingMs(deadline)
  );

  const refreshed = cachedModels.filter(model => !isRetired(model.name));

  if (!refreshed.length) {
    throw new GeminiError(
      "No hay un catálogo utilizable. Intenta nuevamente en unos segundos.",
      { status: 503, code: "GEMINI_CATALOG_UNAVAILABLE" }
    );
  }

  return refreshed;
}

// Conserva una función útil para diagnóstico, sin revelar la clave.
export async function fetchAvailableModels() {
  const models = await getModels(
    performance.now() + DISCOVERY_TIMEOUT_MS + 100
  );
  return models.map(model => model.name.replace(/^models\//, ""));
}

function recordFailure(modelName, error) {
  if (error.status === 404) {
    retiredUntil.set(modelName, Date.now() + CACHE_TTL_MS);
    cachedModels = cachedModels.filter(model => model.name !== modelName);
    cacheExpiresAt = 0;
    scheduleRefresh();
    return;
  }

  const defaultDelay =
    error.status === 429 ? 60000 :
    error.code === "GEMINI_CAPABILITY_MISMATCH" ? 60000 :
    5000;

  cooldownUntil.set(
    modelName,
    Date.now() + Math.max(defaultDelay, error.retryAfterMs || 0)
  );
}

/**
 * Cada solicitud tiene su propio recorrido.
 * No hay índice global que pueda cambiar por otra solicitud concurrente.
 *
 * parseResponse es síncrona y permite validar/leer la respuesta dentro
 * del mismo presupuesto de ejecución.
 */
export async function generateWithFallback(body, parseResponse) {
  const deadline = performance.now() + TOTAL_TIMEOUT_MS;
  const models = await getModels(deadline);
  let attempts = 0;
  let lastError = null;

  for (const model of models) {
    if (isRetired(model.name) || isCoolingDown(model.name)) continue;
    if (attempts >= MAX_ATTEMPTS || remainingMs(deadline) < 100) break;

    attempts += 1;

    try {
      const data = await requestJson(
        `${API_BASE}/${model.name}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getActiveApiKey()
          },
          body: JSON.stringify(body)
        },
        Math.min(ATTEMPT_TIMEOUT_MS, remainingMs(deadline))
      );

      const result = parseResponse(data);

      if (remainingMs(deadline) <= 0) {
        throw timeoutError("Se agotó el presupuesto total de Gemini.");
      }

      cooldownUntil.delete(model.name);
      console.info(`[Gemini] Solicitud completada con ${model.name}.`);
      return result;
    } catch (error) {
      if (!(error instanceof GeminiError) || !error.retryable) {
        throw error;
      }

      lastError = error;
      recordFailure(model.name, error);

      console.warn(
        `[Gemini] Intento ${attempts} fallido: ${model.name}; ${
          error.code
        }; HTTP ${error.status}.`
      );

      // Sin reintentar el mismo modelo ni añadir pausas a esta petición.
      // El cooldown se aplica a nuevas solicitudes de este proceso.
    }
  }

  if (remainingMs(deadline) <= 0) {
    throw timeoutError("Se agotó el presupuesto total de 14 segundos.");
  }

  throw new GeminiError(
    "No se pudo completar la solicitud con los modelos disponibles.",
    {
      status: lastError?.status === 429 ? 429 : 503,
      retryAfterMs: lastError?.retryAfterMs || 0,
      code: "GEMINI_MODELS_UNAVAILABLE"
    }
  );
}