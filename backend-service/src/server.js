import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import evaluationRoutes from "./routes/evaluation.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", model: process.env.GEMINI_MODEL || "gemini-flash-latest" });
});

app.use("/api/evaluation", evaluationRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Backend eTeacher AI corriendo en http://localhost:${PORT}`);
});