import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Asegura que siempre encuentre el archivo .env en la raíz de backend-service
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Modelos reales disponibles en tu cuenta en orden de velocidad y estabilidad
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-pro"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateFormativeFeedback(promptText) {
  const modelsToTry = [...new Set(FALLBACK_MODELS)];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const result = await model.generateContent(promptText);
      const rawText = result.response.text();

      console.log(`Respuesta de evaluacion generada con exito usando el modelo: [${modelName}]`);

      try {
        return JSON.parse(rawText);
      } catch {
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      }
    } catch (error) {
      lastError = error;
      console.warn(`Modelo [${modelName}] saturado o no disponible en evaluacion (${error.status || "Error"}). Saltando al siguiente...`);
      await sleep(400);
      continue;
    }
  }

  throw new Error(`No se pudo obtener respuesta de ningun modelo: ${lastError?.message}`);
}

export async function generateChatResponse(systemPrompt, messages) {
  const modelsToTry = [...new Set(FALLBACK_MODELS)];
  let lastError = null;

  // Extraemos el ultimo mensaje enviado por el usuario
  const lastMessage = messages[messages.length - 1].content;
  
  // Transformamos el historial previo al formato que requiere el SDK de Gemini
  const geminiHistory = messages.slice(0, -1).map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.7 // Temperatura ligeramente mas alta para conversacion natural
        }
      });

      // Iniciamos el chat inyectando el historial y el prompt del sistema
      const chatSession = model.startChat({
        history: geminiHistory
      });

      const result = await chatSession.sendMessage(lastMessage);
      const rawText = result.response.text();

      console.log(`Respuesta de chat generada con exito usando el modelo: [${modelName}]`);
      
      return rawText;
      
    } catch (error) {
      lastError = error;
      console.warn(`Modelo [${modelName}] saturado o no disponible para chat (${error.status || "Error"}). Saltando al siguiente...`);
      await sleep(400);
      continue;
    }
  }

  throw new Error(`No se pudo obtener respuesta del chat de ningun modelo: ${lastError?.message}`);
}