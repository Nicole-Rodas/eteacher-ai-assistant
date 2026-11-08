import { 
  logTriageSession, 
  logFeedbackInjection, 
  logChatInteraction 
} from "../services/supabase-service.js";

export async function recordSession(req, res) {
  try {
    const session = await logTriageSession(req.body);
    return res.json({ ok: true, sessionId: session?.id || null });
  } catch (error) {
    console.error("[TelemetryController] Error en /telemetry/session:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Error al registrar la sesión de triaje." 
    });
  }
}

export async function recordInjection(req, res) {
  try {
    const injection = await logFeedbackInjection(req.body);
    return res.json({ ok: true, injectionId: injection?.id || null });
  } catch (error) {
    console.error("[TelemetryController] Error en /telemetry/injection:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Error al registrar la inyección de feedback." 
    });
  }
}

export async function recordChat(req, res) {
  try {
    const chatLog = await logChatInteraction(req.body);
    return res.json({ ok: true, logId: chatLog?.id || null });
  } catch (error) {
    console.error("[TelemetryController] Error en /telemetry/chat:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Error al registrar la interacción de chat." 
    });
  }
}