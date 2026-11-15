import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveApiKey, rotateApiKey, getKeyCount } from "../config/gemini-keys.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Modelos activos de texto/multimodal (excluye 3.8 por latencia y variantes -image)
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

const clientCache = new Map();

export function getClient() {
  const key = getActiveApiKey();
  if (!clientCache.has(key)) {
    clientCache.set(key, new GoogleGenerativeAI(key));
  }
  return clientCache.get(key);
}

export function getCurrentModelName() {
  return cachedModels[currentModelIndex] || EMERGENCY_FALLBACKS[0];
}

export function rotateModel() {
  currentModelIndex = (currentModelIndex + 1) % cachedModels.length;
  console.warn(`[Gemini Registry] Rotando a modelo: [${cachedModels[currentModelIndex]}]`);

  if (currentModelIndex === 0 && getKeyCount() > 1) {
    rotateApiKey();
  }
}

export function getMaxRotationAttempts() {
  return Math.min(cachedModels.length * getKeyCount(), 6);
}

export async function fetchAvailableModels() {
  return cachedModels;
}

async function refreshModelsCatalogInBackground() {
  if (isUpdating) return;
  isUpdating = true;

  const apiKey = getActiveApiKey();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );

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

        const isExcluded =
          name.includes("image") || // Bloquea gemini-3.1-flash-lite-image (limit: 0)
          name.includes("3.1") ||
          name.includes("3.8") ||
          name.includes("2.5") ||
          name.includes("2.0") ||
          name.includes("1.5") ||
          name.includes("1.0") ||
          name.includes("pro") ||
          name.includes("thinking") ||
          name.includes("omni") ||
          name.includes("hydrogen") ||
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
          name.includes("customtools");

        return supportsGenerate && name.includes("gemini") && !isExcluded;
      })
      .map((m) => m.name.replace(/^models\//, ""));

    if (validTextModels.length > 0) {
      validTextModels.sort((a, b) => {
        const getScore = (name) => {
          const n = name.toLowerCase();
          if (n === "gemini-flash-latest") return 150;
          if (n.includes("3.7-flash") && !n.includes("lite")) return 140;
          if (n.includes("3.6-flash") && !n.includes("lite")) return 130;
          if (n.includes("3.5-flash") && !n.includes("lite")) return 120;
          if (n === "gemini-flash-lite-latest") return 110;
          if (n.includes("lite")) return 100;
          return 40;
        };
        return getScore(b) - getScore(a);
      });

      cachedModels = validTextModels;
      currentModelIndex = 0;
      console.log("[Gemini Registry] Catálogo Flash rápido actualizado:", cachedModels);
    }
  } catch (error) {
    console.warn(`[Gemini Registry] Catálogo no actualizado (${error.message}). Se mantienen los fallbacks.`);
  } finally {
    isUpdating = false;
  }
}

setTimeout(refreshModelsCatalogInBackground, 200);
setInterval(refreshModelsCatalogInBackground, CACHE_TTL_MS);