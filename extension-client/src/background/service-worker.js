const BACKEND_URL = "https://eateacher.zer4c.dev/api/evaluation";
const FETCH_TIMEOUT_MS = 55000; // 55 segundos máximo por entrega

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_SUBMISSION") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload),
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return sendResponse({
            ok: false,
            error: data.error || `Error HTTP ${res.status} en el servidor de evaluación.`
          });
        }
        return sendResponse(data);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        const isTimeout = err?.name === "AbortError";
        sendResponse({
          ok: false,
          error: isTimeout
            ? "Tiempo de espera agotado al analizar la entrega con la IA."
            : `No se pudo conectar con el servidor (${BACKEND_URL}).`
        });
      });

    return true; // Mantiene el canal de mensajes asíncrono abierto en Manifest V3
  }
});