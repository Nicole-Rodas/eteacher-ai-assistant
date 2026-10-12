window.ETeacherI18n = {
  // 1. MOTOR DE DETECCIÓN
  detectLanguage() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang.substring(0, 2).toLowerCase();

    // Respaldo por palabras clave en la página
    const bodyText = document.body.innerText || "";
    if (bodyText.includes("Ejercicio") || bodyText.includes("práctico")) return "es";
    if (bodyText.includes("Exercice")) return "fr"; 
    if (bodyText.includes("Oefening")) return "nl"; 

    // Idioma del navegador
    return (navigator.language || "es").substring(0, 2).toLowerCase();
  },

  // 2. DICCIONARIO CENTRAL
  getText(key) {
    const lang = this.detectLanguage();
    const dictionary = {
      "es": { 
        EVAL_BTN: "Asistente IA", 
        EVAL_TITLE: "Abrir asistente para", 
        SCORE: "Calificación:",
        CHAT_TITLE: "Tutor IA",
        CHAT_PLACEHOLDER: "Escribe tu duda...",
        CHAT_SEND: "Enviar",
        CHAT_TYPING: "escribiendo..."
      },
      "en": { 
        EVAL_BTN: "AI Assistant", 
        EVAL_TITLE: "Open assistant for", 
        SCORE: "Score:",
        CHAT_TITLE: "AI Tutor",
        CHAT_PLACEHOLDER: "Type your question...",
        CHAT_SEND: "Send",
        CHAT_TYPING: "typing..."
      },
      "fr": { // Francés (Bélgica / Francia)
        EVAL_BTN: "Assistant IA", 
        EVAL_TITLE: "Ouvrir l'assistant pour", 
        SCORE: "Note :",
        CHAT_TITLE: "Tuteur IA",
        CHAT_PLACEHOLDER: "Posez votre question...",
        CHAT_SEND: "Envoyer",
        CHAT_TYPING: "écrit..."
      },
      "nl": { // Neerlandés / Flamenco (Bélgica / Países Bajos)
        EVAL_BTN: "AI-assistent", 
        EVAL_TITLE: "Open assistent voor", 
        SCORE: "Score:",
        CHAT_TITLE: "AI-tutor",
        CHAT_PLACEHOLDER: "Typ je vraag...",
        CHAT_SEND: "Verzenden",
        CHAT_TYPING: "typt..."
      }
    };

    const activeDict = dictionary[lang] || dictionary["en"];
    return activeDict[key] || key;
  }
};