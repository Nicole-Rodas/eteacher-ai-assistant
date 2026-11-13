import dns from "node:dns";
// Forzar resolución IPv4 antes de IPv6 para evitar 'fetch failed' por caídas de socket/DNS
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import evaluationRoutes from "./routes/evaluation.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Lista blanca de orígenes autorizados (sin barra final '/')
const allowedOrigins = [
  "https://programino.eteacher.be",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin origen (keep-alive / health checks) o desde la extensión de Chrome
      if (!origin || origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }

      // Permitir solo si proviene de Programino eTeacher
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Bloqueado por política CORS: Origen no autorizado"));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Aumentar límites para soportar payloads grandes de diagramas en Base64 sin cortar la conexión
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Ruta raíz para keep-alive (cron-job) y verificación rápida en el navegador
app.get("/", (req, res) => {
  res.status(200).send("eTeacher Backend running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", model: process.env.GEMINI_MODEL || "gemini-flash-latest" });
});

// Soporta tanto /api/... como /api/evaluation/... para no romper analyze ni la telemetría
app.use("/api", evaluationRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Backend eTeacher AI corriendo en http://localhost:${PORT}`);
});