import { supabase } from "../config/supabase.js";
import crypto from "crypto";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// 1. REGISTRAR SESIÓN DE TRIAJE (Lote de estudiantes analizados)
// ============================================================================
export async function logTriageSession(data = {}) {
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

  const rawTargetId = id || sessionId;
  const targetId = rawTargetId && UUID_REGEX.test(rawTargetId) 
    ? rawTargetId 
    : crypto.randomUUID();

  const sessionRow = {
    id: targetId,
    teacher_id: teacherId || "docente-local",
    unit_title: unitTitle || "Sin título",
    concept_id: conceptId || "general",
    total_students: Number(totalStudents) || 0,
    high_certainty_count: Number(highCertaintyCount) || 0,
    low_certainty_count: Number(lowCertaintyCount) || 0,
    ai_analysis_duration_ms: Math.round(Number(aiAnalysisDurationMs) || 0),
    total_session_duration_ms: Math.round(Number(totalSessionDurationMs) || 0)
  };

  if (!supabase) {
    console.warn("[Telemetry] Cliente Supabase no configurado. Continuando sin persistencia.");
    return { id: targetId };
  }

  try {
    // upsert evita la colisión de clave primaria (23505) si el ID ya existe
    const { data: result, error } = await supabase
      .from("triage_sessions")
      .upsert(sessionRow, { onConflict: "id" })
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase Warning] No se pudo persistir triage_session (${error.message}). Flujo no interrumpido.`);
      return { id: targetId };
    }

    return result || { id: targetId };
  } catch (err) {
    console.warn(`[Supabase Error] Excepción en triage_sessions: ${err.message}. Continuando triaje.`);
    return { id: targetId };
  }
}

// ============================================================================
// 2. REGISTRAR INYECCIÓN EN EDITOR (Telemetría Human-in-the-Loop)
// ============================================================================
export async function logFeedbackInjection(data = {}) {
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

  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    console.warn(`[Supabase Warning] sessionId inválido ("${sessionId}"). Telemetría de inyección omitida.`);
    return { id: null };
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

  if (!supabase) {
    return { id: null };
  }

  try {
    const { data: inserted, error } = await supabase
      .from("feedback_injections")
      .insert([injectionRow])
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase Warning] Fallo en feedback_injections: ${error.message}`);
      return { id: null };
    }

    return inserted;
  } catch (err) {
    console.warn(`[Supabase Error] Excepción en feedback_injections: ${err.message}`);
    return { id: null };
  }
}

// ============================================================================
// 3. REGISTRAR INTERACCIÓN DEL CHAT (Soporte conceptual)
// ============================================================================
export async function logChatInteraction(data = {}) {
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

  if (!supabase) {
    return { id: null };
  }

  try {
    const { data: inserted, error } = await supabase
      .from("chat_interactions")
      .insert([chatRow])
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase Warning] Fallo en chat_interactions: ${error.message}`);
      return { id: null };
    }

    return inserted;
  } catch (err) {
    console.warn(`[Supabase Error] Excepción en chat_interactions: ${err.message}`);
    return { id: null };
  }
}