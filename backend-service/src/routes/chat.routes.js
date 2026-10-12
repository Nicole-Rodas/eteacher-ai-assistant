import { Router } from "express";
import { generateChatResponse } from "../services/gemini-service.js";
import { buildChatSystemPrompt } from "../services/prompt-builder.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { userLangCode, messages } = req.body;
    
    // 1. Armamos el prompt con el idioma correcto
    const systemPrompt = buildChatSystemPrompt(userLangCode);
    
    // 2. Llamamos a Gemini
    const aiText = await generateChatResponse(systemPrompt, messages);
    
    // 3. Devolvemos la respuesta al frontend
    res.json({ respuesta: aiText });
  } catch (error) {
    console.error("Error en la ruta de chat:", error);
    res.status(500).json({ error: "Error procesando el chat" });
  }
});

export default router;