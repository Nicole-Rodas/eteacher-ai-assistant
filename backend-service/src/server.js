import dns from "node:dns";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import evaluationRoutes from "./routes/evaluation.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dns.setDefaultResultOrder("ipv4first");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

const PROGRAMINO_ORIGIN = "https://programino.eteacher.be";

/*
 * Identificadores exactos de las instalaciones autorizadas.
 * Se obtienen desde chrome://extensions.
 *
 * Esta lista restringe los orígenes declarados, pero no autentica
 * a las personas ni sustituye un control de acceso del servidor.
 */
const extensionIds = String(process.env.ALLOWED_EXTENSION_IDS || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

for (const id of extensionIds) {
  if (!/^[a-p]{32}$/.test(id)) {
    throw new Error(
      "ALLOWED_EXTENSION_IDS contiene un identificador de Chrome no válido."
    );
  }
}

const allowedOrigins = new Set([
  PROGRAMINO_ORIGIN,
  ...extensionIds.map(id => `chrome-extension://${id}`)
]);

if (extensionIds.length === 0) {
  console.warn(
    "[Server] No se configuraron identificadores de extensión. " +
    "Las solicitudes que declaren un origen chrome-extension:// " +
    "serán rechazadas."
  );
}

/*
 * CORS por sí solo regula la lectura de respuestas en navegadores.
 * Este middleware añade un rechazo HTTP explícito para /api cuando
 * una solicitud declara un origen ajeno a la lista.
 *
 * La ausencia de Origin se conserva por compatibilidad con clientes
 * que no envían esa cabecera. No debe interpretarse como autenticación.
 */
app.use("/api", (req, res, next) => {
  const origin = req.get("Origin");

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      ok: false,
      error: "Origen no permitido."
    });
  }

  return next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        // La petición continúa sin añadir cabeceras CORS.
        return callback(null, false);
      }

      return callback(null, allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
    maxAge: 600
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));

// Comprobaciones públicas de disponibilidad del backend.
app.get("/", (req, res) => {
  res.status(200).send("eTeacher Backend running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Se conservan los puntos de acceso utilizados por la extensión.
app.use("/api/chat", chatRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use("/api", evaluationRoutes);

// Respuesta controlada para cuerpos demasiado grandes o JSON inválido.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      error: "La solicitud supera el tamaño permitido."
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      ok: false,
      error: "El cuerpo de la solicitud contiene JSON no válido."
    });
  }

  console.error("[Server] Error no controlado:", error.name || "Error");

  return res.status(500).json({
    ok: false,
    error: "Error interno del servidor."
  });
});

const server = app.listen(PORT, () => {
  console.log(`Backend eTeacher AI corriendo en el puerto ${PORT}`);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;