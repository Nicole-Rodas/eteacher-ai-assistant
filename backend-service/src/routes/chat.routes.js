import { Router } from "express";
import { generateChatResponse } from "../services/gemini-service.js";
import { buildChatSystemPrompt } from "../services/prompt-builder.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { userLangCode, messages } = req.body;
    
    const systemPrompt = buildChatSystemPrompt(userLangCode);
    
    const aiText = await generateChatResponse(systemPrompt, messages);
    
    res.json({ respuesta: aiText });
  } catch (error) {
    console.error("Error en la ruta de chat:", error);
    res.status(500).json({ error: "Error procesando el chat" });
  }
});

export default router;