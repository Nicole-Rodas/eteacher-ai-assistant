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

      console.log(`✅ Respuesta generada con éxito usando el modelo: [${modelName}]`);

      try {
        return JSON.parse(rawText);
      } catch {
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      }
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Modelo [${modelName}] saturado o no disponible (${error.status || "Error"}). Saltando al siguiente...`);
      await sleep(400);
      continue;
    }
  }

  throw new Error(`No se pudo obtener respuesta de ningún modelo: ${lastError?.message}`);
}