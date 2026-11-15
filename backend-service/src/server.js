import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import evaluationRoutes from "./routes/evaluation.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://programino.eteacher.be"
];

app.use(
  cors({
    origin: function (origin, callback) {
     
      if (!origin || origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }

      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Ruta raíz para keep-alive (cron-job) y verificación rápida en el navegador
app.get("/", (req, res) => {
  res.status(200).send("eTeacher Backend running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", model: process.env.GEMINI_MODEL || "gemini-flash-latest" });
});

app.use("/api/chat", chatRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use("/api", evaluationRoutes);

const server = app.listen(PORT, () => {
  console.log(`Backend eTeacher AI corriendo en el puerto ${PORT}`);
});


server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;