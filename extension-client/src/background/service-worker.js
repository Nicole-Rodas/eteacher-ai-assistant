const BACKEND_URL = "http://localhost:3000/api/evaluation";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_SUBMISSION") {
    fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({
        ok: false,
        error: "No se pudo conectar con el Backend local (http://localhost:3000). Verifica que esté corriendo."
      }));
    return true; // Mantiene el canal asíncrono abierto
  }

  if (request.action === "SAVE_FEEDBACK_LOG") {
    fetch(`${BACKEND_URL}/save-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});