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

function isRateLimitOrUnavailable(error) {
  const errStr = String(error?.message || "").toLowerCase();
  const status = error?.status || error?.statusCode;

  return (
    status === 429 ||
    status === 503 ||
    errStr.includes("429") ||
    errStr.includes("503") ||
    errStr.includes("resource_exhausted") ||
    errStr.includes("quota")
  );
}

function isRotatableError(error) {
  const errStr = String(error?.message || "").toLowerCase();
  const causeCode = String(error?.cause?.code || "");
  const status = error?.status || error?.statusCode;

  return (
    isRateLimitOrUnavailable(error) ||
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
  // Si la clave se quedó sin cuota (429/503) y tenemos más llaves disponibles, rotar API Key de inmediato
  if (isRateLimitOrUnavailable(error) && getKeyCount() > 1) {
    console.warn(`[Gemini Service] Saturación de cuota detectada. Rotando API Key...`);
    rotateApiKey();
  } else {
    // Si es error de modelo (404, modalidad incompatible, o sólo tenemos 1 llave), rotar modelo
    rotateModel();
  }
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

    // Si la entrega incluye canvas y el modelo actual no soporta visión, avanzar modelo
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
        await sleep(600);
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
        await sleep(600);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Todos los modelos/claves fallaron en el chat. Último error: ${lastError?.message}`);
}