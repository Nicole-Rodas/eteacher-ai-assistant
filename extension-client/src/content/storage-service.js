// La revisión se conserva únicamente en memoria de esta página.
// Cerrar el panel no la borra; recargar o abandonar la página sí.
(function initializeVolatileStorage() {
  "use strict";

  const cache = new Map();
  const PREFIX = "et_cache_";

  // Migración: retirar únicamente las cachés creadas por versiones anteriores.
  // No se borran preferencias ni información original de Programino.
  function removeLegacyCaches() {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
      }
    } catch {
      console.warn("[eTeacher] No se pudo limpiar la caché de sesión anterior.");
    }

    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.remove("et_current_batch", () => {
          if (chrome.runtime?.lastError) {
            console.warn("[eTeacher] No se pudo eliminar el lote persistente anterior.");
          }
        });
      }
    } catch {
      console.warn("[eTeacher] No se pudo eliminar el lote persistente anterior.");
    }
  }

  window.ETeacherStorage = {
    PREFIX,

    buildKey(exerciseInfo) {
      if (!exerciseInfo) return PREFIX + "default";
      const title = (exerciseInfo.unitTitle || "")
        .replace(/\s+/g, "_").toLowerCase();
      const concept = exerciseInfo.conceptId || "";
      const chapter = exerciseInfo.chapterNum || "";
      return `${PREFIX}${chapter}__${concept}__${title}`;
    },

    getExerciseRows(exerciseInfo) {
      try {
        const raw = cache.get(this.buildKey(exerciseInfo));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    saveExerciseRows(exerciseInfo, rowsData) {
      try {
        // La serialización mantiene el comportamiento de copia de la versión
        // anterior, pero la cadena nunca se escribe en almacenamiento persistente.
        cache.set(this.buildKey(exerciseInfo), JSON.stringify(rowsData || []));
      } catch {
        console.warn("[eTeacher] No se pudo conservar la revisión en memoria.");
      }
    },

    clearExercise(exerciseInfo) {
      cache.delete(this.buildKey(exerciseInfo));
    },

    clearAllCurrentTab() {
      cache.clear();
    }
  };

  function discardPageReview() {
    cache.clear();

    const network = window.ETeacherNetwork;
    if (network) network._interceptedBatch = null;

    const ui = window.ETeacherUI;
    if (ui) {
      // Invalidar resultados que lleguen después de abandonar la página.
      ui.currentAnalysisRunId = (Number(ui.currentAnalysisRunId) || 0) + 1;
      ui.isAnalyzing = false;
      ui.rowsData = [];
      ui.activeExercise = null;
      ui.currentSessionId = null;
      ui.sessionStartTime = 0;
      ui.aiAnalysisDurationMs = 0;
    }

    if (window.ETeacherChat) {
      window.ETeacherChat.pageGeneration =
        (Number(window.ETeacherChat.pageGeneration) || 0) + 1;
      window.ETeacherChat.history = [];
    }

    // Retirar también el contenido visible si el navegador conserva esta página
    // en su caché de navegación (atrás/adelante).
    const modal = document.getElementById("et-triage-modal");
    if (modal) modal.style.setProperty("display", "none", "important");
    for (const id of ["et-table-body", "et-chat-messages"]) {
      const node = document.getElementById(id);
      if (node) node.replaceChildren();
    }
    const chatInput = document.getElementById("et-chat-input");
    if (chatInput) chatInput.value = "";
  }

  removeLegacyCaches();
  window.addEventListener("pagehide", discardPageReview);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) discardPageReview();
  });
})();
