(function initETeacherAssistant() {
  
  if (window.ETeacherUI) {
    window.ETeacherUI.init();
  }

  if (window.ETeacherChat) {
    window.ETeacherChat.init();
  }

  const observerUI = new MutationObserver(() => {
    if (window.ETeacherUI) {
      window.ETeacherUI.scanExercises();
    }
  });
  observerUI.observe(document.body, { childList: true, subtree: true });

  // =========================================================
  // LA CONEXIÓN MÁGICA: Del DOM al Chat IA automáticamente
  // =========================================================
  if (window.ETeacherDOM && window.ETeacherDOM.observeModalAndInjectButton) {
    window.ETeacherDOM.observeModalAndInjectButton((allStudentsData) => {
      
      console.log("📥 [Core] Datos del lote recibidos:", allStudentsData);
      
      if (window.ETeacherChat) {
        // 1. Abrimos el panel lateral del asistente automáticamente
        // Asumiendo que tienes una función para abrirlo (ej. toggle, open, show)
        if (typeof window.ETeacherChat.show === "function") {
          window.ETeacherChat.show(); 
        }

        // 2. Le pasamos la lista completa para que empiece a evaluar uno por uno
        if (typeof window.ETeacherChat.processBatch === "function") {
          window.ETeacherChat.processBatch(allStudentsData);
        } else {
          console.warn("⚠️ [eTeacher] Falta crear la función 'processBatch' en tu chat-panel.js");
        }
      }
      
    });
  }

})();