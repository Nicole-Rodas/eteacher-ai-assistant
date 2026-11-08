(function initETeacherAssistant() {
  if (window.ETeacherUI) {
    window.ETeacherUI.init();
  }

  if (window.ETeacherChat) {
    window.ETeacherChat.init();
  }

  if (window.ETeacherDOM && window.ETeacherDOM.observeModalAndInjectButton) {
    window.ETeacherDOM.observeModalAndInjectButton((allStudentsData) => {
      console.log(`[Core] Lote de ${allStudentsData.length} estudiantes recibido.`);
      
      if (window.ETeacherUI && typeof window.ETeacherUI.openAssistantForBatch === "function") {
        const context = window.ETeacherDOM.extractModalExerciseContext();
        window.ETeacherUI.openAssistantForBatch(context, allStudentsData);
      }
    });
  }
})();