import { supabase } from "./src/config/supabase.js";
import crypto from "node:crypto";

async function test() {
  console.log("Probando inserción directa...");

  const payload = {
    id: crypto.randomUUID(), // UUID v4 válido
    unit_title: "Test de Conexión",
    concept_id: "cap1_lenguaje",
    total_students: 1,
    high_certainty_count: 1,
    low_certainty_count: 0,
    ai_analysis_duration_ms: 50,
    total_session_duration_ms: 100
  };

  const { data, error } = await supabase
    .from("triage_sessions")
    .insert([payload])
    .select();

  if (error) {
    console.error("❌ Error de Supabase:", error);
  } else {
    console.log("✅ Inserción exitosa:", data);
  }
}

test();