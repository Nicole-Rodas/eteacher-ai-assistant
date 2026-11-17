import { performance } from "node:perf_hooks";
import { getActiveApiKey } from "../config/gemini-keys.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 3000;
// Margen para evaluaciones completas; el cliente espera hasta 55 segundos.
const ATTEMPT_TIMEOUT_MS = 18000;
const TOTAL_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 6;
const REFRESH_RETRY_MS = 30000;
let cachedModels = [];
let cacheExpiresAt = 0;
let refreshPromise = null;
let nextRefreshAllowedAt = 0;
const retiredUntil = new Map();
const cooldownUntil = new Map();

export class GeminiError extends Error {
  constructor(message, { status = 502, retryable = false, retryAfterMs = 0,
    code = "GEMINI_ERROR" } = {}) {
    super(message);
    this.name = "GeminiError";
    Object.assign(this, { status, retryable, retryAfterMs, code });
  }
}
function timeoutError(message) {
  return new GeminiError(message, {
    status: 504, retryable: true, code: "GEMINI_TIMEOUT"
  });
}
const remainingMs = deadline => Math.max(0, Math.floor(deadline - performance.now()));
function parseRetryAfter(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

// El límite abarca la conexión y la lectura del cuerpo HTTP.
async function requestJson(url, options, timeoutMs) {
  if (timeoutMs <= 0) throw timeoutError("Se agotó el presupuesto de espera de Gemini.");
  const controller = new AbortController();
  let timer;
  const operation = (async () => {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* HTTP puede devolver HTML. */ }
    if (!response.ok) {
      const message = String(data?.error?.message || "");
      const capabilityMismatch = response.status === 400 &&
        /unsupported|not supported|not enabled/i.test(message) &&
        /image|modality|response.?mime|application\/json|json mode/i.test(message);
      throw new GeminiError(`Gemini respondió HTTP ${response.status}.`, {
        status: response.status,
        retryable: [404, 408, 429, 500, 502, 503, 504].includes(response.status) || capabilityMismatch,
        retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
        code: capabilityMismatch ? "GEMINI_CAPABILITY_MISMATCH" : "GEMINI_HTTP_ERROR"
      });
    }
    if (!data || typeof data !== "object") {
      throw new GeminiError("Gemini devolvió una respuesta HTTP no válida.", {
        retryable: true, code: "GEMINI_INVALID_RESPONSE"
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
  try { return await Promise.race([operation, timeout]); }
  catch (error) {
    if (error instanceof GeminiError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw timeoutError("La petición a Gemini fue cancelada por timeout.");
    }
    if (error instanceof TypeError || error?.cause?.code) {
      throw new GeminiError("Error de conexión con Gemini.", {
        retryable: true, code: "GEMINI_NETWORK_ERROR"
      });
    }
    throw error;
  } finally { clearTimeout(timer); }
}
async function waitWithin(promise, timeoutMs) {
  if (timeoutMs <= 0) throw timeoutError("Se agotó el tiempo de espera del catálogo.");
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(timeoutError("El catálogo no estuvo listo a tiempo.")), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
function isExcluded(map, name) {
  if ((map.get(name) || 0) > Date.now()) return true;
  map.delete(name);
  return false;
}

// Política cerrada por familias, sin enumerar versiones concretas.
// Solo Flash, Flash Lite y Pro estables; no Gemma, nombres desconocidos,
// variantes especializadas, preview o experimentales. Un catálogo sin
// candidatos permitidos produce error: NO activa un respaldo desconocido.
function modelPolicy(model) {
  const name = String(model.name || "");
  if (!model.supportedGenerationMethods?.includes("generateContent")) return null;
  const match = name.match(
    /^models\/gemini-(\d+(?:\.\d+)*|flash-lite|flash|pro)-(flash-lite|flash|pro|latest)(?:-(\d{3}))?$/i
  );
  if (!match) return null;
  const [, versionOrFamily, familyOrAlias] = match;
  const alias = familyOrAlias.toLowerCase() === "latest";
  if (alias && !/^(flash-lite|flash|pro)$/i.test(versionOrFamily)) return null;
  if (!alias && !/^\d/.test(versionOrFamily)) return null;
  const family = alias ? versionOrFamily.toLowerCase() : familyOrAlias.toLowerCase();
  return {
    tier: family === "flash-lite" ? 0 : family === "flash" ? 1 : 2,
    version: alias ? [] : versionOrFamily.split(".").map(Number),
    alias
  };
}
function orderModels(models) {
  const unique = [...new Map(models.map(m => [m.name, m])).values()];
  return unique.map(model => ({ model, policy: modelPolicy(model) }))
    .filter(x => x.policy && !isExcluded(retiredUntil, x.model.name))
    .sort((a, b) => {
      const tier = a.policy.tier - b.policy.tier;
      if (tier) return tier;
      // Las versiones explícitas se ordenan antes de los alias latest.
      if (a.policy.alias !== b.policy.alias) return a.policy.alias ? 1 : -1;
      const av = a.policy.version, bv = b.policy.version;
      for (let i = 0; i < Math.max(av.length, bv.length); i++) {
        const difference = (bv[i] || 0) - (av[i] || 0);
        if (difference) return difference;
      }
      return a.model.name.localeCompare(b.model.name, undefined, { numeric: true });
    }).map(x => x.model);
}
async function loadCatalog() {
  const deadline = performance.now() + DISCOVERY_TIMEOUT_MS;
  const models = [], seenTokens = new Set();
  let pageToken = "";
  do {
    const url = new URL(`${API_BASE}/models`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await requestJson(url, {
      headers: { "x-goog-api-key": getActiveApiKey() }
    }, remainingMs(deadline));
    if (!Array.isArray(data.models)) throw new GeminiError("El catálogo no contiene modelos.");
    models.push(...data.models);
    pageToken = String(data.nextPageToken || "");
    if (pageToken && seenTokens.has(pageToken)) throw new GeminiError("Paginación repetida.");
    if (pageToken) seenTokens.add(pageToken);
  } while (pageToken);
  return models;
}
export function refreshModelsCatalogInBackground() {
  if (refreshPromise) return refreshPromise;
  if (Date.now() < nextRefreshAllowedAt) return Promise.resolve();
  nextRefreshAllowedAt = Date.now() + REFRESH_RETRY_MS;
  refreshPromise = (async () => {
    const ordered = orderModels(await loadCatalog());
    if (!ordered.length) {
      throw new GeminiError("No hay modelos estables permitidos disponibles.", {
        status: 503, code: "GEMINI_NO_MODELS"
      });
    }
    cachedModels = ordered;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    console.info(`[Gemini Registry] Catálogo actualizado: ${ordered.length} modelos permitidos.`);
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
function scheduleRefresh() {
  void refreshModelsCatalogInBackground().catch(error => {
    console.warn(`[Gemini Registry] Catálogo no actualizado: ${error.code || "CATALOG_ERROR"}.`);
  });
}
async function getModels(deadline) {
  const available = cachedModels.filter(m => !isExcluded(retiredUntil, m.name));
  if (available.length) {
    if (Date.now() >= cacheExpiresAt) scheduleRefresh();
    return available;
  }
  await waitWithin(refreshModelsCatalogInBackground(), remainingMs(deadline));
  const refreshed = cachedModels.filter(m => !isExcluded(retiredUntil, m.name));
  if (!refreshed.length) throw new GeminiError("No hay un catálogo utilizable.", {
    status: 503, code: "GEMINI_CATALOG_UNAVAILABLE"
  });
  return refreshed;
}
export async function fetchAvailableModels() {
  return (await getModels(performance.now() + DISCOVERY_TIMEOUT_MS + 100))
    .map(m => m.name.replace(/^models\//, ""));
}
function recordFailure(name, error) {
  if (error.status === 404) {
    retiredUntil.set(name, Date.now() + CACHE_TTL_MS);
    cachedModels = cachedModels.filter(m => m.name !== name);
    cacheExpiresAt = 0;
    scheduleRefresh();
    return;
  }
  const delay = error.status === 429 || error.code === "GEMINI_CAPABILITY_MISMATCH" ? 60000 : 5000;
  cooldownUntil.set(name, Date.now() + Math.max(delay, error.retryAfterMs || 0));
}
// Cada petición recorre su propia lista, sin rotación de claves ni índice global.
export async function generateWithFallback(body, parseResponse) {
  const deadline = performance.now() + TOTAL_TIMEOUT_MS;
  const models = await getModels(deadline);
  let attempts = 0, lastError = null;
  for (const model of models) {
    if (isExcluded(retiredUntil, model.name) || isExcluded(cooldownUntil, model.name)) continue;
    if (attempts >= MAX_ATTEMPTS || remainingMs(deadline) < 100) break;
    attempts++;
    try {
      const data = await requestJson(`${API_BASE}/${model.name}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": getActiveApiKey() },
        body: JSON.stringify(body)
      }, Math.min(ATTEMPT_TIMEOUT_MS, remainingMs(deadline)));
      const result = parseResponse(data);
      if (remainingMs(deadline) <= 0) throw timeoutError("Se agotó el presupuesto total de Gemini.");
      cooldownUntil.delete(model.name);
      console.info(`[Gemini] Solicitud completada con ${model.name}.`);
      return result;
    } catch (error) {
      if (!(error instanceof GeminiError) || !error.retryable) throw error;
      lastError = error;
      recordFailure(model.name, error);
      console.warn(`[Gemini] Intento ${attempts} fallido: ${model.name}; ${error.code}; HTTP ${error.status}.`);
    }
  }
  if (remainingMs(deadline) <= 0) throw timeoutError("Se agotó el presupuesto total de 45 segundos.");
  throw new GeminiError("No se pudo completar la solicitud con los modelos permitidos.", {
    status: lastError?.status === 429 ? 429 : 503,
    retryAfterMs: lastError?.retryAfterMs || 0, code: "GEMINI_MODELS_UNAVAILABLE"
  });
}
