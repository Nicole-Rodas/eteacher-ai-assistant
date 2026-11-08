window.ETeacherNetwork = {
  _interceptedBatch: null,
  _initialized: false,

  init(onBatchReceived) {
    if (this._initialized) return;
    this._initialized = true;

    window.addEventListener("message", async (event) => {
      if (event.source !== window || !event.data || event.data.type !== "ET_SUBMISSIONS_INTERCEPTED") {
        return;
      }

      try {
        const rawPayload = event.data.payload;
        const parsedBatch = window.ETeacherDOM.parsePrograminoNetworkBatch(rawPayload);

        if (parsedBatch.length > 0) {
          this._interceptedBatch = parsedBatch;

          try {
            if (typeof chrome !== "undefined" && chrome.storage?.local) {
              await chrome.storage.local.set({ et_current_batch: parsedBatch });
            }
          } catch {}

          if (typeof onBatchReceived === "function") {
            onBatchReceived(parsedBatch);
          }
        }
      } catch (err) {
        console.error("[ETeacherNetwork] Error al parsear lote interceptado:", err);
      }
    });

    this.injectMainWorldFetchHook();
  },

  injectMainWorldFetchHook() {
    if (document.getElementById("et-network-hook")) return;

    const script = document.createElement("script");
    script.id = "et-network-hook";
    script.textContent = [
      "(function() {",
      "  if (window.__etNetHooked) return;",
      "  window.__etNetHooked = true;",
      "",
      "  const originalFetch = window.fetch;",
      "  window.fetch = async function(...args) {",
      "    const response = await originalFetch.apply(this, args);",
      "    try {",
      "      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');",
      "      if (url.includes('load_submissions_for_class')) {",
      "        const clone = response.clone();",
      "        clone.json().then(function(data) {",
      "          window.postMessage({ type: 'ET_SUBMISSIONS_INTERCEPTED', payload: data }, '*');",
      "        }).catch(function() {});",
      "      }",
      "    } catch (e) {}",
      "    return response;",
      "  };",
      "",
      "  const XHR = XMLHttpRequest.prototype;",
      "  const open = XHR.open;",
      "  const send = XHR.send;",
      "  XHR.open = function(method, url) {",
      "    this._etUrl = url;",
      "    return open.apply(this, arguments);",
      "  };",
      "  XHR.send = function() {",
      "    this.addEventListener('load', function() {",
      "      try {",
      "        if (this._etUrl && String(this._etUrl).includes('load_submissions_for_class')) {",
      "          const data = JSON.parse(this.responseText);",
      "          window.postMessage({ type: 'ET_SUBMISSIONS_INTERCEPTED', payload: data }, '*');",
      "        }",
      "      } catch (e) {}",
      "    });",
      "    return send.apply(this, arguments);",
      "  };",
      "})();"
    ].join("\n");

    (document.head || document.documentElement).appendChild(script);
  }
};