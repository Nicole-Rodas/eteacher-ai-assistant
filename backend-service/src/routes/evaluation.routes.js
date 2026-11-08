import { Router } from "express";
import { getConcepts, analyzeSubmission } from "../controllers/evaluation.controller.js";
import { recordSession, recordInjection, recordChat } from "../controllers/telemetry.controller.js";

const router = Router();

// Evaluación y conceptos
router.get("/concepts", getConcepts);
router.post("/analyze", analyzeSubmission);

// Telemetría Human-in-the-Loop
router.post("/telemetry/session", recordSession);
router.post("/telemetry/injection", recordInjection);
router.post("/telemetry/chat", recordChat);

export default router;