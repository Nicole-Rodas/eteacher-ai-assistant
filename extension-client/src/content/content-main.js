(function initETeacherAssistant() {
  window.ETeacherUI.init();

  // Si la página carga más ejercicios dinámicamente al hacer scroll, les inyecta su botón
  const observer = new MutationObserver(() => {
    window.ETeacherUI.scanExercises();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();