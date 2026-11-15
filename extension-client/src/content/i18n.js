window.ETeacherI18n = {
  // Permite forzar idioma manualmente para pruebas: ETeacherI18n.setLanguage("en") o null para automático
  setLanguage(langCode) {
    if (!langCode) {
      localStorage.removeItem("et_forced_lang");
    } else {
      localStorage.setItem("et_forced_lang", langCode.substring(0, 2).toLowerCase());
    }
    if (window.ETeacherChat?.refreshLanguage) {
      window.ETeacherChat.refreshLanguage();
    }
    if (window.ETeacherUI?.refreshLanguage) {
      window.ETeacherUI.refreshLanguage();
    }
    console.log(`[eTeacher i18n] Idioma activo: ${this.detectLanguage()}`);
  },

  // 1. MOTOR DE DETECCIÓN DINÁMICA
  detectLanguage() {
    // A. Idioma forzado manualmente (útil para pruebas y demostración)
    const forced = localStorage.getItem("et_forced_lang");
    if (forced && ["es", "en", "fr", "nl"].includes(forced)) {
      return forced;
    }

    // B. Detección por interfaz visible de Programino (si el docente cambió el idioma de la plataforma)
    const bodyText = (document.body?.innerText || "").slice(0, 4000);
    if (/\b(Exercises?|Chapter|Submissions?|Add feedback|Grade)\b/i.test(bodyText) && !/\b(Ejercicio|Capítulo|Entregas|Calificación)\b/i.test(bodyText)) {
      return "en";
    }
    if (/\b(Exercice|Chapitre|Soumissions)\b/i.test(bodyText)) return "fr";
    if (/\b(Oefening|Hoofdstuk|Inzendingen)\b/i.test(bodyText)) return "nl";

    // C. Idioma del navegador (Chrome) si está configurado en inglés, francés o neerlandés
    const navLang = (navigator.language || "").substring(0, 2).toLowerCase();
    if (["en", "fr", "nl"].includes(navLang)) {
      return navLang;
    }

    // D. Atributo lang del documento HTML
    const htmlLang = (document.documentElement.lang || "").substring(0, 2).toLowerCase();
    if (["es", "en", "fr", "nl"].includes(htmlLang)) {
      return htmlLang;
    }

    return "es";
  },

  // 2. DICCIONARIO CENTRAL MULTILINGÜE
  getText(key) {
    const lang = this.detectLanguage();
    const dictionary = {
      es: {
        EVAL_BTN: "Asistente IA",
        EVAL_TITLE: "Abrir asistente para",
        SCORE: "Calificación:",
        CHAT_TITLE: "Tutor IA",
        CHAT_PLACEHOLDER: "Escribe tu duda...",
        CHAT_SEND: "Enviar",
        CHAT_TYPING: "escribiendo...",
        CHAT_GREETING: "Hola. Soy tu asistente pedagógico. Puedes consultarme dudas conceptuales o pedirme recomendaciones de retroalimentación.",
        TAB_HIGH: "Certeza Alta",
        TAB_LOW: "Baja Certeza / Por Revisar",
        BTN_ANALYZE: "Analizar Entregas con IA",
        BTN_REANALYZE: "Re-analizar con IA",
        BTN_CANCEL: "Cancelar",
        BTN_CLEAR: "Borrar",
        BTN_INJECT: "Inyectar en Editor Actual",
        LAYER_CORRECTIVE: "1. Retroalimentación Correctiva",
        LAYER_SOCRATIC: "2. Pregunta Socrática (Reflexiva)",
        LAYER_MOTIVATIONAL: "3. Mensaje Motivacional",
        LAYER_ALL: "Todas las capas combinadas"
      },
      en: {
        EVAL_BTN: "AI Assistant",
        EVAL_TITLE: "Open assistant for",
        SCORE: "Score:",
        CHAT_TITLE: "AI Tutor",
        CHAT_PLACEHOLDER: "Type your question...",
        CHAT_SEND: "Send",
        CHAT_TYPING: "typing...",
        CHAT_GREETING: "Hello. I am your pedagogical assistant. You can ask conceptual questions or request feedback suggestions.",
        TAB_HIGH: "High Certainty",
        TAB_LOW: "Low Certainty / Needs Review",
        BTN_ANALYZE: "Analyze Submissions with AI",
        BTN_REANALYZE: "Re-analyze with AI",
        BTN_CANCEL: "Cancel",
        BTN_CLEAR: "Clear",
        BTN_INJECT: "Inject into Current Editor",
        LAYER_CORRECTIVE: "1. Corrective Feedback",
        LAYER_SOCRATIC: "2. Socratic Question (Reflective)",
        LAYER_MOTIVATIONAL: "3. Motivational Message",
        LAYER_ALL: "All layers combined"
      },
      fr: {
        EVAL_BTN: "Assistant IA",
        EVAL_TITLE: "Ouvrir l'assistant pour",
        SCORE: "Note :",
        CHAT_TITLE: "Tuteur IA",
        CHAT_PLACEHOLDER: "Posez votre question...",
        CHAT_SEND: "Envoyer",
        CHAT_TYPING: "écrit...",
        CHAT_GREETING: "Bonjour. Je suis votre assistant pédagogique. Vous pouvez me poser des questions conceptuelles ou me demander des suggestions de rétroaction.",
        TAB_HIGH: "Haute Certitude",
        TAB_LOW: "Faible Certitude / À Réviser",
        BTN_ANALYZE: "Analyser avec l'IA",
        BTN_REANALYZE: "Ré-analyser avec l'IA",
        BTN_CANCEL: "Annuler",
        BTN_CLEAR: "Effacer",
        BTN_INJECT: "Injecter dans l'éditeur",
        LAYER_CORRECTIVE: "1. Rétroaction Corrective",
        LAYER_SOCRATIC: "2. Question Socratique",
        LAYER_MOTIVATIONAL: "3. Message Motivationnel",
        LAYER_ALL: "Toutes les couches combinées"
      },
      nl: {
        EVAL_BTN: "AI-assistent",
        EVAL_TITLE: "Open assistent voor",
        SCORE: "Score:",
        CHAT_TITLE: "AI-tutor",
        CHAT_PLACEHOLDER: "Typ je vraag...",
        CHAT_SEND: "Verzenden",
        CHAT_TYPING: "typt...",
        CHAT_GREETING: "Hallo. Ik ben je pedagogisch assistent. Je kunt conceptuele vragen stellen of feedbacksuggesties aanvragen.",
        TAB_HIGH: "Hoge Zekerheid",
        TAB_LOW: "Lage Zekerheid / Te Controleren",
        BTN_ANALYZE: "Analyseren met AI",
        BTN_REANALYZE: "Opnieuw analyseren met AI",
        BTN_CANCEL: "Annuleren",
        BTN_CLEAR: "Wissen",
        BTN_INJECT: "Invoegen in huidige editor",
        LAYER_CORRECTIVE: "1. Corrigerende Feedback",
        LAYER_SOCRATIC: "2. Socratische Vraag",
        LAYER_MOTIVATIONAL: "3. Motiverend Bericht",
        LAYER_ALL: "Alle lagen gecombineerd"
      }
    };

    const activeDict = dictionary[lang] || dictionary["en"];
    return activeDict[key] || key;
  }
};