import { supabase } from "../config/supabase.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// 1. REGISTRAR SESIÓN DE TRIAJE (Lote de estudiantes analizados)
// ============================================================================
export async function logTriageSession(data = {}) {
  if (!supabase) {
    console.warn("[Telemetry] Cliente Supabase no inicializado.");
    throw new Error("Cliente de base de datos no configurado.");
  }

  const {
    id,
    sessionId,
    teacherId = "docente-local",
    unitTitle,
    conceptId,
    totalStudents,
    highCertaintyCount,
    lowCertaintyCount,
    aiAnalysisDurationMs,
    totalSessionDurationMs
  } = data;

  const targetId = id || sessionId;
  const sessionRow = {
    teacher_id: teacherId || "docente-local",
    unit_title: unitTitle || "Sin título",
    concept_id: conceptId || "general",
    total_students: Number(totalStudents) || 0,
    high_certainty_count: Number(highCertaintyCount) || 0,
    low_certainty_count: Number(lowCertaintyCount) || 0,
    ai_analysis_duration_ms: Math.round(Number(aiAnalysisDurationMs) || 0),
    total_session_duration_ms: Math.round(Number(totalSessionDurationMs) || 0)
  };

  // Si el frontend envía un UUID explícito, lo conservamos como clave primaria
  if (targetId && UUID_REGEX.test(targetId)) {
    sessionRow.id = targetId;
  }

  const { data: inserted, error } = await supabase
    .from("triage_sessions")
    .insert([sessionRow])
    .select("id")
    .single();

  if (error) {
    console.error(`[Supabase Error] Fallo al insertar triage_session: ${error.message} (Código: ${error.code})`);
    throw new Error(`Error en triage_sessions: ${error.message}`);
  }

  return inserted;
}

// ============================================================================
// 2. REGISTRAR INYECCIÓN EN EDITOR (Telemetría Human-in-the-Loop)
// ============================================================================
export async function logFeedbackInjection(data = {}) {
  if (!supabase) {
    console.warn("[Telemetry] Cliente Supabase no inicializado.");
    throw new Error("Cliente de base de datos no configurado.");
  }

  const {
    sessionId,
    certaintyLevel,
    certaintyScore,
    selectedLayer,
    wasEdited,
    gradeChanged,
    aiSuggestedGrade,
    finalGrade
  } = data;

  // session_id en Supabase es tipo UUID vinculado a triage_sessions
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    console.error(`[Supabase Error] sessionId inválido o ausente: "${sessionId}". Debe ser un UUID registrado.`);
    throw new Error(`sessionId inválido o ausente (${sessionId}).`);
  }

  const injectionRow = {
    session_id: sessionId,
    certainty_level: certaintyLevel || "MEDIA",
    certainty_score: Math.min(100, Math.max(0, Number(certaintyScore) || 0)),
    selected_layer: selectedLayer || "correctiva",
    was_edited: Boolean(wasEdited),
    grade_changed: Boolean(gradeChanged),
    ai_suggested_grade: aiSuggestedGrade !== null && aiSuggestedGrade !== undefined && !isNaN(aiSuggestedGrade)
      ? Math.min(100, Math.max(0, Math.round(Number(aiSuggestedGrade))))
      : null,
    final_grade: finalGrade !== null && finalGrade !== undefined && !isNaN(finalGrade)
      ? Math.min(100, Math.max(0, Math.round(Number(finalGrade))))
      : null
  };

  const { data: inserted, error } = await supabase
    .from("feedback_injections")
    .insert([injectionRow])
    .select("id")
    .single();

  if (error) {
    console.error(`[Supabase Error] Fallo al insertar feedback_injection: ${error.message} (Código: ${error.code})`);
    throw new Error(`Error en feedback_injections: ${error.message}`);
  }

  return inserted;
}

// ============================================================================
// 3. REGISTRAR INTERACCIÓN DEL CHAT (Soporte conceptual)
// ============================================================================
export async function logChatInteraction(data = {}) {
  if (!supabase) {
    console.warn("[Telemetry] Cliente Supabase no inicializado.");
    throw new Error("Cliente de base de datos no configurado.");
  }

  const {
    teacherId = "docente-local",
    conceptContext = "general",
    userMessageLength = 0,
    aiResponseLength = 0,
    responseDurationMs = 0
  } = data;

  const chatRow = {
    teacher_id: teacherId || "docente-local",
    concept_context: conceptContext || "general",
    user_message_length: Number(userMessageLength) || 0,
    ai_response_length: Number(aiResponseLength) || 0,
    response_duration_ms: Math.round(Number(responseDurationMs) || 0)
  };

  const { data: inserted, error } = await supabase
    .from("chat_interactions")
    .insert([chatRow])
    .select("id")
    .single();

  if (error) {
    console.error(`[Supabase Error] Fallo al insertar chat_interaction: ${error.message} (Código: ${error.code})`);
    throw new Error(`Error en chat_interactions: ${error.message}`);
  }

  return inserted;
}