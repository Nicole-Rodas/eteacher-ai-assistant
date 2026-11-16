import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Conserva la ubicación de configuración del proyecto.
// Las variables del entorno del servidor tienen prioridad.
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: false
});
dotenv.config({ override: false });

export function getActiveApiKey() {
  const key = String(process.env.GEMINI_API_KEY || "").trim();

  if (!key) {
    const error = new Error(
      "Falta GEMINI_API_KEY en la configuración del backend."
    );
    error.status = 500;
    throw error;
  }

  return key;
}

// Compatibilidad con posibles importaciones anteriores.
// No existe un pool de claves ni rotación.
export function getKeyCount() {
  return String(process.env.GEMINI_API_KEY || "").trim() ? 1 : 0;
}

export function rotateApiKey() {
  return false;
}