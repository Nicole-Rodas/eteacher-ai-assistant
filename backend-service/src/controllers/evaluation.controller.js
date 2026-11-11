import { ETEACHER_CONCEPTS, detectConcept } from "../config/concepts.js";
import { buildEvaluationPrompt } from "../services/prompt-builder.js";
import { generateFormativeFeedback } from "../services/gemini-service.js";

// ============================================================================
// 1. LISTADO DE CONCEPTOS DISPONIBLES
// ============================================================================
export function getConcepts(req, res) {
  return res.json({ ok: true, concepts: ETEACHER_CONCEPTS });
}

// ============================================================================
// 2. EVALUACIÓN Y TRIAJE DE ENTREGA DE ESTUDIANTE
// ============================================================================
export async function analyzeSubmission(req, res) {
  try {
    const {
      unitTitle,
      problemStatement,
      studentCode,
      conceptId,
      canvasImage,
      maxScore = 100,
      userLangCode = "es",
      lang = "es"
    } = req.body;

    const cleanCode = String(studentCode || "").trim();
    const hasCanvas = Boolean(
      canvasImage && 
      typeof canvasImage === "string" && 
      canvasImage.trim().length > 30 &&
      canvasImage !== "[DIAGRAMA_EN_CANVAS]"
    );

    if (!cleanCode && !hasCanvas) {
      return res.status(400).json({
        ok: false,
        errorType: "EMPTY_CODE",
        error: "El estudiante no envió código ni diagrama gráfico."
      });
    }

    const concept = detectConcept(unitTitle, conceptId);
    const targetLang = (userLangCode || lang || "es").toLowerCase();

    // Caso borde: entrega de texto demasiado corta sin diagrama visual en canvas
    if (!hasCanvas && cleanCode.length < 5) {
      return res.json({
        ok: true,
        detectedConceptId: concept.id,
        data: {
          concepto_aplicado: concept.title,
          certeza: {
            nivel: "BAJA",
            porcentaje: 15,
            justificacion_docente: "La entrega del estudiante es demasiado breve o incompleta para evaluar estructura algorítmica."
          },
          calificacion_sugerida: 0,
          retroalimentacion: {
            correctiva: "La respuesta enviada no contiene una estructura mínima evaluable. Intenta definir las variables y los pasos iniciales.",
            socratica: "¿Qué pasos de entrada, proceso y salida necesitas plantear antes de estructurar tu solución?",
            motivacional: "Todo algoritmo comienza con un primer boceto. Revisa el enunciado e inténtalo paso a paso."
          }
        }
      });
    }

    const prompt = buildEvaluationPrompt({
      unitTitle,
      problemStatement,
      studentCode: cleanCode || "[DIAGRAMA_EN_CANVAS]",
      concept,
      maxScore,
      targetLang,
      hasCanvas
    });

    const aiResponse = await generateFormativeFeedback({
      promptText: prompt,
      canvasImage: hasCanvas ? canvasImage : null
    });

    return res.json({
      ok: true,
      detectedConceptId: concept.id,
      data: aiResponse
    });
  } catch (error) {
    console.error("[EvaluationController] Error en /analyze:", error);
    return res.status(500).json({
      ok: false,
      errorType: "AI_SERVICE_ERROR",
      error: error.message || "Error al procesar la evaluación con Gemini."
    });
  }
}