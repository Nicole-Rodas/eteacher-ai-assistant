import {
  GeminiError,
  generateWithFallback
} from "../clients/gemini-registry.js";

function inputError(message) {
  return new GeminiError(message, {
    status: 400,
    code: "GEMINI_INVALID_INPUT"
  });
}

function cleanJsonString(raw) {
  return String(raw || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Se excluyen partes de pensamiento y se evita reutilizar respuestas
 * truncadas o bloqueadas como si fueran evaluaciones completas.
 */
function extractText(response) {
  if (response.promptFeedback?.blockReason) {
    throw new GeminiError(
      "Gemini bloqueó la solicitud. Requiere revisión manual.",
      {
        status: 422,
        code: "GEMINI_BLOCKED_RESPONSE"
      }
    );
  }

  const candidate = response.candidates?.[0];

  if (!candidate) {
    throw new GeminiError("Gemini no devolvió una respuesta.", {
      retryable: true,
      code: "GEMINI_EMPTY_RESPONSE"
    });
  }

  if (candidate.finishReason === "MAX_TOKENS") {
    throw new GeminiError("Gemini devolvió una respuesta truncada.", {
      retryable: true,
      code: "GEMINI_TRUNCATED_RESPONSE"
    });
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new GeminiError(
      "La generación no finalizó normalmente. Requiere revisión manual.",
      {
        status: 422,
        code: "GEMINI_INCOMPLETE_RESPONSE"
      }
    );
  }

  const text = (candidate.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === "string")
    .map(part => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError("Gemini devolvió texto vacío.", {
      retryable: true,
      code: "GEMINI_EMPTY_RESPONSE"
    });
  }

  return text;
}

function parseEvaluation(response) {
  const text = extractText(response);
  let result;

  try {
    result = JSON.parse(cleanJsonString(text));
  } catch {
    throw new GeminiError("Gemini devolvió JSON no válido.", {
      retryable: true,
      code: "GEMINI_INVALID_JSON"
    });
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new GeminiError("La evaluación no contiene un objeto JSON.", {
      retryable: true,
      code: "GEMINI_INVALID_JSON"
    });
  }

  // Conserva el objeto que espera el controlador de evaluación.
  return result;
}

function imagePart(canvasImage) {
  if (
    canvasImage == null ||
    canvasImage === "" ||
    canvasImage === "[DIAGRAMA_EN_CANVAS]"
  ) {
    return null;
  }

  if (typeof canvasImage !== "string") {
    throw inputError("canvasImage debe ser una cadena base64.");
  }

  const value = canvasImage.trim();
  const dataUrl = value.match(
    /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,([\s\S]+)$/i
  );

  if (value.startsWith("data:") && !dataUrl) {
    throw inputError("El formato de la imagen no es compatible.");
  }

  const mimeType = dataUrl ? dataUrl[1].toLowerCase() : "image/png";
  const data = (dataUrl ? dataUrl[2] : value).replace(/\s/g, "");

  if (
    !data ||
    data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
  ) {
    throw inputError("La imagen no contiene base64 válido.");
  }

  return { inlineData: { mimeType, data } };
}

export async function generateFormativeFeedback(inputData) {
  const input =
    typeof inputData === "string"
      ? { promptText: inputData }
      : inputData;

  if (
    !input ||
    typeof input.promptText !== "string" ||
    !input.promptText.trim()
  ) {
    throw inputError("La evaluación requiere un promptText no vacío.");
  }

  const parts = [];
  const image = imagePart(input.canvasImage);

  if (image) parts.push(image);
  parts.push({ text: input.promptText });

  return generateWithFallback(
    {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    },
    parseEvaluation
  );
}

export async function generateChatResponse(systemPrompt, messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw inputError("El arreglo de mensajes no puede estar vacío.");
  }

  const contents = [];

  for (const message of messages) {
    if (
      !message ||
      !["user", "assistant", "model"].includes(message.role) ||
      typeof message.content !== "string" ||
      !message.content.trim()
    ) {
      throw inputError(
        "Cada mensaje debe tener un rol válido y contenido no vacío."
      );
    }

    const role = message.role === "user" ? "user" : "model";
    const previous = contents[contents.length - 1];

    // Evita turnos consecutivos del mismo rol en el historial.
    if (previous?.role === role) {
      previous.parts.push({ text: message.content });
    } else {
      contents.push({
        role,
        parts: [{ text: message.content }]
      });
    }
  }

  if (
    contents[0].role !== "user" ||
    contents[contents.length - 1].role !== "user"
  ) {
    throw inputError(
      "El historial del chat debe comenzar y terminar con un mensaje del usuario."
    );
  }

  const body = { contents };

  if (typeof systemPrompt === "string" && systemPrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  return generateWithFallback(body, extractText);
}