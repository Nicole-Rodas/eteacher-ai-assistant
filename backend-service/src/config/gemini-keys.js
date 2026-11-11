import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const keysSet = new Set();

// 1. GEMINI_API_KEYS (separadas por coma)
if (process.env.GEMINI_API_KEYS) {
  process.env.GEMINI_API_KEYS.split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .forEach((k) => keysSet.add(k));
}

// 2. GEMINI_API_KEY_1 .. GEMINI_API_KEY_20
for (let i = 1; i <= 20; i++) {
  const k = process.env[`GEMINI_API_KEY_${i}`];
  if (k && k.trim()) keysSet.add(k.trim());
}

// 3. Fallbacks individuales
[
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_SECONDARY,
  process.env.GEMINI_API_KEY_BACKUP
].forEach((k) => {
  if (k && k.trim()) keysSet.add(k.trim());
});

const API_KEYS = Array.from(keysSet);

if (API_KEYS.length === 0) {
  console.error("[Gemini Keys] ❌ No se encontró ninguna clave GEMINI_API_KEY válida.");
} else {
  console.log(`[Gemini Keys] Pool activo con ${API_KEYS.length} credenciales.`);
}

let currentKeyIndex = 0;

export function getActiveApiKey() {
  return API_KEYS[currentKeyIndex] || "";
}

export function rotateApiKey() {
  if (API_KEYS.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.warn(`[Gemini Keys] 🔄 Rotando a clave ${currentKeyIndex + 1}/${API_KEYS.length}`);
  return true;
}

export function getKeyCount() {
  return API_KEYS.length;
}