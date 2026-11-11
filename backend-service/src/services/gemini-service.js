import {
  getClient,
  getCurrentModelName,
  rotateModel,
  getMaxRotationAttempts,
  fetchAvailableModels
} from "../clients/gemini-registry.js";
import { rotateApiKey, getKeyCount } from "../config/gemini-keys.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanJsonString(raw) {
  return String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Determina si el error es estrictamente agotamiento de cuota de la API key (429)
function isQuotaExhausted(error) {
  const errStr = String(error?.message || "").toLowerCase();
  const status = error?.status || error?.statusCode;

  return (
    status === 429 ||
    errStr.includes("429") ||
    errStr.includes("resource_exhausted") ||
    errStr.includes("quota")
  );
}

// Determina si el modelo está saturado en Google (503 Service Unavailable)
function isModelOverloaded(error) {
  const errStr = String(error?.message || "").toLowerCase();
  const status = error?.status || error?.statusCode;

  return (
    status === 503 ||
    errStr.includes("503") ||
    errStr.includes("service unavailable") ||
    errStr.includes("high demand")
  );
}

function isRotatableError(error) {
  const errStr = String(error?.message || "").toLowerCase();
  const causeCode = String(error?.cause?.code || "");
  const status = error?.status || error?.statusCode;

  return (
    isQuotaExhausted(error) ||
    isModelOverloaded(error) ||
    status === 404 ||
    (status === 400 && (errStr.includes("image") || errStr.includes("modality") || errStr.includes("not enabled"))) ||
    errStr.includes("404") ||
    errStr.includes("image input modality is not enabled") ||
    errStr.includes("unsupported modality") ||
    errStr.includes("fetch failed") ||
    errStr.includes("timeout") ||
    causeCode.includes("ECONNRESET") ||
    causeCode.includes("UND_ERR")
  );
}

function handleRotation(error) {
  // Si SOLO la llave se quedó sin cuota (429), rotar API Key
  if (isQuotaExhausted(error) && getKeyCount() > 1) {
    console.warn(`[Gemini Service] Cuota 429 agotada en credencial actual. Rotando API Key...`);
    rotateApiKey();
    return;
  }

  // Si es 503 (servidor saturado/high demand), 404, modalidad incompatible, etc., rotar MODELO de inmediato
  if (isModelOverloaded(error)) {
    console.warn(`[Gemini Service] Modelo saturado en Google (503 High Demand). Rotando inmediatamente de modelo...`);
  }
  rotateModel();
}

export async function generateFormativeFeedback(inputData) {
  await fetchAvailableModels();

  const maxAttempts = getMaxRotationAttempts();
  let lastError = null;

  const promptText = typeof inputData === "string" ? inputData : inputData.promptText;
  const canvasImage = typeof inputData === "object" ? inputData.canvasImage : null;

  const hasImage = Boolean(
    canvasImage &&
    typeof canvasImage === "string" &&
    canvasImage.trim().length > 50 &&
    canvasImage !== "[DIAGRAMA_EN_CANVAS]"
  );

  const parts = [];
  if (hasImage) {
    const cleanBase64 = String(canvasImage)
      .replace(/^data:image\/[a-z]+;base64,/, "")
      .replace(/\s/g, "");

    if (cleanBase64.length > 50) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64
        }
      });
    }
  }
  parts.push({ text: promptText });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let modelName = getCurrentModelName();

    if (hasImage && (modelName.includes("transcribe") || modelName.includes("embedding") || modelName.includes("text-"))) {
      console.warn(`[Gemini Triaje] El modelo [${modelName}] no soporta visión. Rotando modelo...`);
      rotateModel();
      modelName = getCurrentModelName();
    }

    try {
      const client = getClient();
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.0,
          topP: 1.0
        }
      });

      const result = await model.generateContent(parts);
      const rawText = result.response.text();

      console.log(`[Gemini Triaje] Evaluación exitosa con [${modelName}].`);

      try {
        return JSON.parse(rawText);
      } catch {
        const cleaned = cleanJsonString(rawText);
        return JSON.parse(cleaned);
      }
    } catch (error) {
      lastError = error;

      if (isRotatableError(error) && attempt < maxAttempts) {
        console.warn(`[Gemini Triaje] Intento ${attempt}/${maxAttempts} falló con [${modelName}] (${error.message}).`);
        handleRotation(error);
        await sleep(500);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Todos los modelos/claves fallaron. Último error: ${lastError?.message}`);
}

export async function generateChatResponse(systemPrompt, messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("El arreglo de mensajes no puede estar vacío.");
  }

  await fetchAvailableModels();

  const maxAttempts = getMaxRotationAttempts();
  let lastError = null;

  const lastMessage = messages[messages.length - 1]?.content || "";
  const geminiHistory = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content || "" }]
  }));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const modelName = getCurrentModelName();

    try {
      const client = getClient();
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95
        }
      });

      const chatSession = model.startChat({ history: geminiHistory });
      const result = await chatSession.sendMessage(lastMessage);
      const rawText = result.response.text();

      console.log(`[Gemini Chat] Respuesta exitosa con [${modelName}].`);
      return rawText;
    } catch (error) {
      lastError = error;

      if (isRotatableError(error) && attempt < maxAttempts) {
        console.warn(`[Gemini Chat] Intento ${attempt}/${maxAttempts} falló con [${modelName}] (${error.message}).`);
        handleRotation(error);
        await sleep(500);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Todos los modelos/claves fallaron en el chat. Último error: ${lastError?.message}`);
}