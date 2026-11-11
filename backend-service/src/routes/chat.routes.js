import { Router } from "express";
import { generateChatResponse } from "../services/gemini-service.js";
import { buildChatSystemPrompt } from "../services/prompt-builder.js";
import { logChatInteraction } from "../services/supabase-service.js";

const router = Router();

router.post("/", async (req, res) => {
  const startTime = Date.now();
  try {
    const { 
      userLangCode = "es", 
      messages = [], 
      teacherId = "docente-local",
      conceptContext = "general" 
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: "El cuerpo de la petición debe contener un arreglo de 'messages'." 
      });
    }

    const systemPrompt = buildChatSystemPrompt(userLangCode);
    const aiText = await generateChatResponse(systemPrompt, messages);
    const durationMs = Date.now() - startTime;

    // Telemetría no bloqueante a Supabase
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    logChatInteraction({
      teacherId,
      conceptContext,
      userMessageLength: lastUserMessage.length,
      aiResponseLength: aiText.length,
      responseDurationMs: durationMs
    }).catch((err) => console.warn("[Chat Telemetry] Aviso no bloqueante:", err.message));

    // Mantenemos la propiedad 'respuesta' que tu frontend ya conoce
    return res.json({ 
      ok: true, 
      respuesta: aiText 
    });
  } catch (error) {
    console.error("Error en la ruta de chat:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Error procesando el chat" 
    });
  }
});

export default router;