import { supabase } from "../config/supabase.js";

// ============================================================================
// 1. REGISTRAR SESIÓN DE TRIAJE (Lote de estudiantes analizados)
// ============================================================================
export async function logTriageSession(data = {}) {
  if (!supabase) {
    console.log("[Modo Local] Simulando guardado de Triage Session:", data);
    return { id: `local-session-${Date.now()}` };
  }

  const {
    teacherId = "docente-local",
    unitTitle,
    conceptId,
    totalStudents,
    highCertaintyCount,
    lowCertaintyCount,
    aiAnalysisDurationMs,
    totalSessionDurationMs
  } = data;

  try {
    const { data: inserted, error } = await supabase
      .from("triage_sessions")
      .insert([
        {
          teacher_id: teacherId,
          unit_title: unitTitle || "Sin título",
          concept_id: conceptId || "general",
          total_students: Number(totalStudents) || 0,
          high_certainty_count: Number(highCertaintyCount) || 0,
          low_certainty_count: Number(lowCertaintyCount) || 0,
          ai_analysis_duration_ms: Math.round(aiAnalysisDurationMs || 0),
          total_session_duration_ms: Math.round(totalSessionDurationMs || 0)
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase] Advertencia al insertar triage_session: ${error.message}`);
      return { id: `fallback-session-${Date.now()}`, error: error.message };
    }

    return inserted;
  } catch (err) {
    console.warn(`[Supabase] Fallo de conexión en logTriageSession: ${err.message}`);
    return { id: `fallback-session-${Date.now()}`, error: err.message };
  }
}

// ============================================================================
// 2. REGISTRAR INYECCIÓN EN EDITOR (Telemetría Human-in-the-Loop)
// ============================================================================
export async function logFeedbackInjection(data = {}) {
  if (!supabase) {
    console.log("[Modo Local] Simulando guardado de Feedback Injection:", data);
    return { id: `local-injection-${Date.now()}` };
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

  try {
    const { data: inserted, error } = await supabase
      .from("feedback_injections")
      .insert([
        {
          session_id: sessionId,
          certainty_level: certaintyLevel,
          certainty_score: Math.min(100, Math.max(0, Number(certaintyScore) || 0)),
          selected_layer: selectedLayer,
          was_edited: Boolean(wasEdited),
          grade_changed: Boolean(gradeChanged),
          ai_suggested_grade: Math.min(100, Math.max(0, Number(aiSuggestedGrade) || 0)),
          final_grade: Math.min(100, Math.max(0, Number(finalGrade) || 0))
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase] Advertencia al insertar feedback_injection: ${error.message}`);
      return { id: `fallback-injection-${Date.now()}`, error: error.message };
    }

    return inserted;
  } catch (err) {
    console.warn(`[Supabase] Fallo de conexión en logFeedbackInjection: ${err.message}`);
    return { id: `fallback-injection-${Date.now()}`, error: err.message };
  }
}

// ============================================================================
// 3. REGISTRAR INTERACCIÓN DEL CHAT (Soporte conceptual)
// ============================================================================
export async function logChatInteraction(data = {}) {
  if (!supabase) {
    console.log("[Modo Local] Simulando guardado de Chat Interaction:", data);
    return { id: `local-chat-${Date.now()}` };
  }

  const {
    teacherId = "docente-local",
    conceptContext = "general",
    userMessageLength = 0,
    aiResponseLength = 0,
    responseDurationMs = 0
  } = data;

  try {
    const { data: inserted, error } = await supabase
      .from("chat_interactions")
      .insert([
        {
          teacher_id: teacherId,
          concept_context: conceptContext,
          user_message_length: Number(userMessageLength) || 0,
          ai_response_length: Number(aiResponseLength) || 0,
          response_duration_ms: Math.round(responseDurationMs || 0)
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.warn(`[Supabase] Advertencia al insertar chat_interaction: ${error.message}`);
      return { id: `fallback-chat-${Date.now()}`, error: error.message };
    }

    return inserted;
  } catch (err) {
    console.warn(`[Supabase] Fallo de conexión en logChatInteraction: ${err.message}`);
    return { id: `fallback-chat-${Date.now()}`, error: err.message };
  }
}