import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveApiKey, rotateApiKey, getKeyCount } from "../config/gemini-keys.js";

const CACHE_TTL_MS = 60 * 60 * 1000;
const EMERGENCY_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let cachedModels = null;
let lastModelFetch = 0;
let currentModelIndex = 0;

export async function fetchAvailableModels() {
  const now = Date.now();
  if (cachedModels && cachedModels.length > 0 && now - lastModelFetch < CACHE_TTL_MS) {
    return cachedModels;
  }

  const apiKey = getActiveApiKey();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawModels = Array.isArray(data.models) ? data.models : [];

    const validTextModels = rawModels
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        const name = (m.name || "").toLowerCase();
        const supportsGenerate = methods.includes("generateContent");
        const isGemini = name.includes("gemini");
        const isUnsupported =
          name.includes("embedding") ||
          name.includes("aqa") ||
          name.includes("tts") ||
          name.includes("audio") ||
          name.includes("thinking") ||
          name.includes("1.0");

        return supportsGenerate && isGemini && !isUnsupported;
      })
      .map((m) => m.name.replace(/^models\//, ""));

    if (validTextModels.length === 0) {
      throw new Error("El filtrado no arrojó modelos compatibles.");
    }

    validTextModels.sort((a, b) => {
      const score = (name) => {
        if (name.includes("2.0-flash")) return 100;
        if (name.includes("1.5-flash")) return 90;
        if (name.includes("1.5-flash-8b")) return 80;
        if (name.includes("flash")) return 70;
        if (name.includes("pro")) return 60;
        return 40;
      };
      return score(b) - score(a);
    });

    cachedModels = validTextModels;
    lastModelFetch = now;
    currentModelIndex = 0;
    console.log("[Gemini Registry] Modelos descubiertos y activos:", cachedModels);
    return cachedModels;
  } catch (error) {
    console.warn(`[Gemini Registry] Catálogo dinámico falló (${error.message}).`);
    if (rotateApiKey()) {
      return fetchAvailableModels();
    }
    cachedModels = EMERGENCY_FALLBACKS;
    lastModelFetch = now;
    currentModelIndex = 0;
    return cachedModels;
  }
}

export function rotateModel() {
  if (!cachedModels || cachedModels.length === 0) return;
  currentModelIndex = (currentModelIndex + 1) % cachedModels.length;

  if (currentModelIndex === 0 && getKeyCount() > 1) {
    rotateApiKey();
  }

  console.warn(`[Gemini Registry] Rotación a modelo: [${cachedModels[currentModelIndex]}]`);
}

export function getCurrentModelName() {
  if (!cachedModels || cachedModels.length === 0) {
    return EMERGENCY_FALLBACKS[0];
  }
  return cachedModels[currentModelIndex] || EMERGENCY_FALLBACKS[0];
}

export function getMaxRotationAttempts() {
  return (cachedModels?.length || EMERGENCY_FALLBACKS.length) * getKeyCount();
}

export function getClient() {
  return new GoogleGenerativeAI(getActiveApiKey());
}

export async function verifyModelHealth() {
  try {
    await fetchAvailableModels();
    console.log("[Gemini Registry] Comprobando conectividad (Ping inicial)...");

    const maxTests = cachedModels.length;
    let tested = 0;
    let verified = false;

    while (tested < maxTests && !verified) {
      const modelName = getCurrentModelName();
      try {
        const client = getClient();
        const model = client.getGenerativeModel({ model: modelName });
        await model.generateContent("ping");

        console.log(`[Gemini Registry] ✅ Modelo verificado y operativo: [${modelName}]`);
        verified = true;
      } catch (err) {
        console.warn(`[Gemini Registry] ⚠️ Modelo [${modelName}] falló ping (${err.message}). Rotando...`);
        rotateModel();
        tested++;
        await sleep(500);
      }
    }

    if (!verified) {
      console.warn("[Gemini Registry] ❌ Ping inicial no completado. Recuperación diferida a ejecución.");
    }
  } catch (err) {
    console.warn("[Gemini Registry] Error en warm-up:", err.message);
  }
}

// Inicialización automática y refresco periódico
verifyModelHealth();
setInterval(() => {
  lastModelFetch = 0;
  verifyModelHealth();
}, CACHE_TTL_MS);