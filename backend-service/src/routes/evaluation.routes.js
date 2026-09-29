import { Router } from "express";
import { ETEACHER_CONCEPTS, detectConcept } from "../config/concepts.js";
import { buildEvaluationPrompt } from "../services/prompt-builder.js";
import { generateFormativeFeedback } from "../services/gemini-service.js";
import { saveEvaluationLog } from "../services/supabase-service.js";

const router = Router();

// 1. Obtener todos los conceptos disponibles
router.get("/concepts", (req, res) => {
  res.json({ ok: true, concepts: ETEACHER_CONCEPTS });
});

// 2. Analizar respuesta del estudiante con IA
router.post("/analyze", async (req, res) => {
  try {
    const { unitTitle, problemStatement, studentCode, conceptId, maxScore = 100 } = req.body;

    // Validación 1: Respuesta vacía
    if (!studentCode || studentCode.trim() === "") {
      return res.status(400).json({
        ok: false,
        errorType: "EMPTY_CODE",
        error: "El estudiante no envió código o la respuesta está vacía."
      });
    }

    const concept = detectConcept(unitTitle, conceptId);

    // Validación 2: Respuesta demasiado corta o sin código real (menos de 5 caracteres) -> Certeza BAJA directa sin gastar tokens
    if (studentCode.trim().length < 5) {
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
            pregunta_guia: "¿Qué pasos de entrada, proceso y salida necesitas plantear antes de escribir tu solución?",
            recomendacion_estructural: "Intenta dividir el problema en partes pequeñas y escribe al menos la declaración de variables inicial.",
            raiz_del_error: "La respuesta enviada no contiene una estructura mínima evaluable."
          }
        }
      });
    }

    // Flujo normal: Construir prompt y consultar a Gemini
    const prompt = buildEvaluationPrompt({
      unitTitle,
      problemStatement,
      studentCode,
      concept,
      maxScore
    });

    const aiResponse = await generateFormativeFeedback(prompt);

    res.json({
      ok: true,
      detectedConceptId: concept.id,
      data: aiResponse
    });
  } catch (error) {
    console.error("Error en /analyze:", error);
    res.status(500).json({
      ok: false,
      errorType: "AI_SERVICE_ERROR",
      error: error.message || "Error al procesar la solicitud con Gemini."
    });
  }
});

// 3. Guardar la decisión final del docente (Human-in-the-Loop Telemetry)
router.post("/save-feedback", async (req, res) => {
  try {
    const {
      unitTitle,
      conceptId,
      certaintyLevel,
      certaintyScore,
      aiSuggestedGrade,
      teacherFinalGrade,
      aiDraftFeedback,
      teacherFinalFeedback,
      wasEditedByTeacher,
      reviewTimeSeconds
    } = req.body;

    const result = await saveEvaluationLog({
      unit_title: unitTitle || "Sin unidad",
      concept_id: conceptId || "general",
      certainty_level: certaintyLevel,
      certainty_score: certaintyScore,
      ai_suggested_grade: aiSuggestedGrade,
      teacher_final_grade: teacherFinalGrade,
      ai_draft_feedback: aiDraftFeedback,
      teacher_final_feedback: teacherFinalFeedback,
      was_edited: Boolean(wasEditedByTeacher),
      review_time_seconds: reviewTimeSeconds || 0
    });

    res.json({ ok: true, result });
  } catch (error) {
    console.error("Error en /save-feedback:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Error al guardar el registro de auditoría."
    });
  }
});

export default router;