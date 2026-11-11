import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveApiKey, rotateApiKey, getKeyCount } from "../config/gemini-keys.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora exacta

const EMERGENCY_FALLBACKS = [
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite"
];

let cachedModels = [...EMERGENCY_FALLBACKS];
let currentModelIndex = 0;
let isUpdating = false;

// Reutilización de sockets HTTP/2 por clave
const clientCache = new Map();

export function getClient() {
  const key = getActiveApiKey();
  if (!clientCache.has(key)) {
    clientCache.set(key, new GoogleGenerativeAI(key));
  }
  return clientCache.get(key);
}

export function getCurrentModelName() {
  return cachedModels[currentModelIndex] || cachedModels[0];
}

export function rotateModel() {
  currentModelIndex = (currentModelIndex + 1) % cachedModels.length;
  console.warn(`[Gemini Registry] 🔄 Rotando a modelo: [${cachedModels[currentModelIndex]}]`);

  if (currentModelIndex === 0 && getKeyCount() > 1) {
    rotateApiKey();
  }
}

export function getMaxRotationAttempts() {
  return Math.min(cachedModels.length * getKeyCount(), 10);
}

// Devuelve la lista en memoria al instante (0 ms de bloqueo para el triaje/chat)
export async function fetchAvailableModels() {
  return cachedModels;
}

// Tarea en segundo plano para actualizar el catálogo dinámico desde Google
async function refreshModelsCatalogInBackground() {
  if (isUpdating) return;
  isUpdating = true;

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
      currentModelIndex = 0;
      console.log("[Gemini Registry] 🔄 Catálogo actualizado en segundo plano:", cachedModels);
    }
  } catch (error) {
    console.warn(`[Gemini Registry] Consulta horaria de modelos no completada (${error.message}). Se mantiene la lista actual.`);
  } finally {
    isUpdating = false;
  }
}

// 1. Warm-up y primer chequeo dinámico al arrancar en background
setTimeout(async () => {
  try {
    const modelName = getCurrentModelName();
    const client = getClient();
    const model = client.getGenerativeModel({ model: modelName });
    await model.generateContent("ping");
    console.log(`[Gemini Registry] ✅ Modelo inicial verificado: [${modelName}]`);
  } catch (err) {
    console.warn(`[Gemini Registry] Warmup inicial: ${err.message}`);
  }

  // Refresca catálogo dinámico por primera vez sin estorbar el arranque
  refreshModelsCatalogInBackground();
}, 500);

// 2. Programador estricto para ejecutarse únicamente cada 1 hora
setInterval(refreshModelsCatalogInBackground, CACHE_TTL_MS);