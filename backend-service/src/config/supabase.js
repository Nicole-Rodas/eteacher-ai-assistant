import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

// Sanitizar credenciales: remover comillas, espacios en blanco y trailing slash en la URL
const cleanEnv = (val) => String(val || "").replace(/['"]/g, "").trim();
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL).replace(/\/+$/, "");
const supabaseKey = cleanEnv(process.env.SUPABASE_SECRET_KEY);

export const supabase = (supabaseUrl.startsWith("https://") && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        // fetch nativo con keepalive para estabilizar el socket HTTP en Node.js
        fetch: (url, options = {}) => fetch(url, { ...options, keepalive: true })
      }
    })
  : null;

if (!supabase) {
  console.warn("[Supabase Config] Credenciales no encontradas o inválidas en SUPABASE_URL / SUPABASE_SECRET_KEY. Operando con simulador local de telemetría.");
} else {
  console.log(`[Supabase Config] Cliente inicializado correctamente hacia: ${supabaseUrl}`);
}