import {
  getClient,
  getCurrentModelName,
  rotateModel,
  getMaxRotationAttempts,
  fetchAvailableModels
} from "../clients/gemini-registry.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanJsonString(raw) {
  return String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function isRotatableError(error) {
  const errStr = String(error?.message || "");
  const causeCode = String(error?.cause?.code || "");
  const status = error?.status || error?.statusCode;

  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    errStr.includes("503") ||
    errStr.includes("429") ||
    errStr.includes("404") ||
    errStr.includes("fetch failed") ||
    errStr.includes("timeout") ||
    causeCode.includes("ECONNRESET") ||
    causeCode.includes("UND_ERR")
  );
}

export async function generateFormativeFeedback(inputData) {
  await fetchAvailableModels();

  const maxAttempts = getMaxRotationAttempts();
  let lastError = null;

  const promptText = typeof inputData === "string" ? inputData : inputData.promptText;
  const canvasImage = typeof inputData === "object" ? inputData.canvasImage : null;

  const parts = [];
  if (canvasImage) {
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
    const modelName = getCurrentModelName();

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
        console.warn(`[Gemini Triaje] [${modelName}] falló (${error.message}). Reintentando con siguiente modelo/clave...`);
        rotateModel();
        await sleep(1000);
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
        console.warn(`[Gemini Chat] [${modelName}] falló. Reintentando...`);
        rotateModel();
        await sleep(1000);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Todos los modelos/claves fallaron en el chat. Último error: ${lastError?.message}`);
}