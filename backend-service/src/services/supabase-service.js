import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Solo inicializa Supabase si las credenciales existen en el .env
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function saveEvaluationLog(logData) {
  if (!supabase) {
    console.log("[Modo Local - Sin Supabase configurado] Registro de evaluación:", logData);
    return { savedInCloud: false, localLog: logData };
  }

  const { data, error } = await supabase
    .from("evaluation_logs")
    .insert([logData])
    .select();

  if (error) {
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  return { savedInCloud: true, data };
}