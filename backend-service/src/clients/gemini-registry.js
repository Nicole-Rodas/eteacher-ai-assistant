import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveApiKey, rotateApiKey, getKeyCount } from "../config/gemini-keys.js";

const CACHE_TTL_MS = 60 * 60 * 1000;

// Lista priorizada local. Arranca de inmediato sin esperar a la red.
const EMERGENCY_FALLBACKS = [
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-pro-latest"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let cachedModels = [...EMERGENCY_FALLBACKS];
let lastModelFetch = 0;
let currentModelIndex = 0;

// Pool de clientes en memoria para reutilizar sockets HTTP/2
const clientPool = new Map();

export function getClient() {
  const key = getActiveApiKey();
  if (!clientPool.has(key)) {
    clientPool.set(key, new GoogleGenerativeAI(key));
  }
  return clientPool.get(key);
}

// Descubrimiento asíncrono no bloqueante
export async function fetchAvailableModels() {
  const now = Date.now();
  if (cachedModels.length > 0 && now - lastModelFetch < CACHE_TTL_MS) {
    return cachedModels;
  }

  const apiKey = getActiveApiKey();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawModels = Array.isArray(data.models) ? data.models : [];

    const validTextModels = rawModels
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        const name = (m.name || "").toLowerCase();
        const supportsGenerate = methods.includes("generateContent");

        const isUnsupported =
          name.includes("2.5") ||
          name.includes("1.0") ||
          name.includes("embedding") ||
          name.includes("aqa") ||
          name.includes("tts") ||
          name.includes("audio") ||
          name.includes("transcribe") ||
          name.includes("robotics") ||
          name.includes("computer-use") ||
          name.includes("banana") ||
          name.includes("argon") ||
          name.includes("carbon") ||
          name.includes("customtools") ||
          name.includes("thinking");

        return supportsGenerate && name.includes("gemini") && !isUnsupported;
      })
      .map((m) => m.name.replace(/^models\//, ""));

    if (validTextModels.length > 0) {
      validTextModels.sort((a, b) => {
        const getScore = (name) => {
          const n = name.toLowerCase();
          if (n === "gemini-flash-latest") return 150;
          if (n.includes("3.7-flash")) return 140;
          if (n.includes("3.6-flash")) return 130;
          if (n.includes("3.5-flash") && !n.includes("lite")) return 120;
          if (n.includes("3.8-flash")) return 95;
          if (n.includes("3-flash")) return 90;
          if (n.includes("flash-lite") || n.includes("lite")) return 80;
          if (n.includes("pro-latest")) return 70;
          return 40;
        };
        return getScore(b) - getScore(a);
      });

      cachedModels = validTextModels;
      lastModelFetch = now;
      currentModelIndex = 0;
      console.log("[Gemini Registry] Catálogo dinámico actualizado:", cachedModels);
    }
  } catch (error) {
    console.warn(`[Gemini Registry] Aviso en catálogo (${error.message}). Continuando con lista activa.`);
    lastModelFetch = now; // Evita reintentar en bucle inmediato
  }

  return cachedModels;
}

export function rotateModel() {
  if (!cachedModels || cachedModels.length === 0) {
    cachedModels = [...EMERGENCY_FALLBACKS];
  }
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
  const modelCount = cachedModels?.length || EMERGENCY_FALLBACKS.length;
  return Math.min(modelCount * getKeyCount(), 15);
}

export async function verifyModelHealth() {
  try {
    const modelName = getCurrentModelName();
    const client = getClient();
    const model = client.getGenerativeModel({ model: modelName });
    await model.generateContent("ping");
    console.log(`[Gemini Registry] ✅ Modelo verificado y operativo: [${modelName}]`);
  } catch (err) {
    console.warn(`[Gemini Registry] ⚠️ Modelo inicial falló ping (${err.message}). Rotando...`);
    rotateModel();
  }
}

// Warm-up inicial en background sin bloquear
setTimeout(() => {
  verifyModelHealth();
  fetchAvailableModels();
}, 100);

setInterval(fetchAvailableModels, CACHE_TTL_MS);