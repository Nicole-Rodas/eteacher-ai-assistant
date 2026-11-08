import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const rawKeys = [
  (process.env.GEMINI_API_KEY || "").trim(),
  (process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY_BACKUP || "").trim()
].filter(Boolean);

if (rawKeys.length === 0) {
  console.error("[Gemini Keys] CRÍTICO: No se encontró ninguna clave GEMINI_API_KEY válida.");
}

const API_KEYS = rawKeys.length > 0 ? rawKeys : [""];
let currentKeyIndex = 0;

export function getActiveApiKey() {
  return API_KEYS[currentKeyIndex];
}

export function rotateApiKey() {
  if (API_KEYS.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.warn(`[Gemini Keys] Rotación de credencial. Usando clave ${currentKeyIndex + 1}/${API_KEYS.length}`);
  return true;
}

export function getKeyCount() {
  return API_KEYS.length;
}