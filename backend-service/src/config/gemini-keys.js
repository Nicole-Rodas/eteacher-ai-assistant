import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

// Recolectar claves de todas las formas posibles
const keysSet = new Set();

// 1. Soporte para lista separada por comas: GEMINI_API_KEYS="key1,key2,key3..."
if (process.env.GEMINI_API_KEYS) {
  process.env.GEMINI_API_KEYS.split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .forEach((k) => keysSet.add(k));
}

// 2. Soporte para variables indexadas: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
for (let i = 1; i <= 20; i++) {
  const indexedKey = process.env[`GEMINI_API_KEY_${i}`];
  if (indexedKey && indexedKey.trim()) {
    keysSet.add(indexedKey.trim());
  }
}

// 3. Soporte para variables individuales clásicas
[
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_SECONDARY,
  process.env.GEMINI_API_KEY_BACKUP
].forEach((k) => {
  if (k && k.trim()) keysSet.add(k.trim());
});

const API_KEYS = Array.from(keysSet);

if (API_KEYS.length === 0) {
  console.error("[Gemini Keys] CRÍTICO: No se encontró ninguna clave GEMINI_API_KEY válida.");
} else {
  console.log(`[Gemini Keys] Pool inicializado con ${API_KEYS.length} credenciales activas.`);
}

let currentKeyIndex = 0;

export function getActiveApiKey() {
  return API_KEYS[currentKeyIndex] || "";
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