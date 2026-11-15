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
    const forced = localStorage.getItem("et_forced_lang");
    if (forced && ["es", "en", "fr", "nl"].includes(forced)) {
      return forced;
    }

    const bodyText = (document.body?.innerText || "").slice(0, 4000);
    if (/\b(Exercises?|Chapter|Submissions?|Add feedback|Grade)\b/i.test(bodyText) && !/\b(Ejercicio|Capítulo|Entregas|Calificación)\b/i.test(bodyText)) {
      return "en";
    }
    if (/\b(Exercice|Chapitre|Soumissions)\b/i.test(bodyText)) return "fr";
    if (/\b(Oefening|Hoofdstuk|Inzendingen)\b/i.test(bodyText)) return "nl";

    const navLang = (navigator.language || "").substring(0, 2).toLowerCase();
    if (["en", "fr", "nl"].includes(navLang)) {
      return navLang;
    }

    const htmlLang = (document.documentElement.lang || "").substring(0, 2).toLowerCase();
    if (["es", "en", "fr", "nl"].includes(htmlLang)) {
      return htmlLang;
    }

    return "es";
  },

  // 2. DICCIONARIO CENTRAL MULTILINGÜE (UI + CHAT + TRIAJE)
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
        CHAPTER_LABEL: "Capítulo",
        TAB_HIGH: "Certeza Alta",
        TAB_LOW: "Baja Certeza / Por Revisar",
        BTN_ANALYZE: "Analizar Entregas con IA",
        BTN_REANALYZE: "Re-analizar con IA",
        BTN_ANALYZING: "Analizando con IA...",
        PROGRESS_LABEL: "Analizando entregas con IA...",
        PROGRESS_STUDENT: "Analizando entrega de:",
        TH_NAME: "Nombre",
        TH_GRADE: "Nota",
        TH_SUGGESTION: "Sugerencia Formativa (Selector de Capa + Edición)",
        EMPTY_TAB: "No hay entregas en esta pestaña.",
        STUDENT_ANSWER: "Respuesta del alumno:",
        DIAGRAM_DETECTED: "[Diagrama Gráfico Detectado]",
        NO_LAYER_TEXT: "Sin texto en esta capa",
        BTN_EDIT: "Editar",
        BTN_DONE: "Listo",
        CERTAINTY_LABEL: "Certeza:",
        EDITED_BADGE: "• Editado",
        HINT_HIGH: "Selecciona la capa pedagógica que prefieras o edita el texto.",
        HINT_LOW: "Revisa las entregas con certeza baja, entregas en blanco o respuestas muy cortas.",
        BTN_CANCEL: "Cancelar",
        BTN_CLEAR: "Borrar",
        BTN_INJECT: "Inyectar en Editor Actual",
        INJECTING_PROGRESS: "Inyectando",
        BANNER_EVALUATING: "Evaluando entregas de los estudiantes en tiempo real...",
        BANNER_SELECT_CLEAR: "Selecciona al menos una fila para borrar.",
        BANNER_CLEARED: "Se limpió el contenido seleccionado.",
        BANNER_SELECT_INJECT: "Selecciona al menos un estudiante para inyectar.",
        BANNER_INJECT_ERR: "No se pudo encontrar o abrir el editor en Programino.",
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
        CHAPTER_LABEL: "Chapter",
        TAB_HIGH: "High Certainty",
        TAB_LOW: "Low Certainty / Needs Review",
        BTN_ANALYZE: "Analyze Submissions with AI",
        BTN_REANALYZE: "Re-analyze with AI",
        BTN_ANALYZING: "Analyzing with AI...",
        PROGRESS_LABEL: "Analyzing submissions with AI...",
        PROGRESS_STUDENT: "Analyzing submission from:",
        TH_NAME: "Student",
        TH_GRADE: "Grade",
        TH_SUGGESTION: "Formative Suggestion (Layer Selector + Edit)",
        EMPTY_TAB: "No submissions in this tab.",
        STUDENT_ANSWER: "Student answer:",
        DIAGRAM_DETECTED: "[Visual Diagram Detected]",
        NO_LAYER_TEXT: "No text in this layer",
        BTN_EDIT: "Edit",
        BTN_DONE: "Done",
        CERTAINTY_LABEL: "Certainty:",
        EDITED_BADGE: "• Edited",
        HINT_HIGH: "Select your preferred pedagogical layer or edit the text.",
        HINT_LOW: "Review low-certainty, blank, or very short submissions.",
        BTN_CANCEL: "Cancel",
        BTN_CLEAR: "Clear",
        BTN_INJECT: "Inject into Current Editor",
        INJECTING_PROGRESS: "Injecting",
        BANNER_EVALUATING: "Evaluating student submissions in real time...",
        BANNER_SELECT_CLEAR: "Select at least one row to clear.",
        BANNER_CLEARED: "Selected content cleared.",
        BANNER_SELECT_INJECT: "Select at least one student to inject.",
        BANNER_INJECT_ERR: "Could not find or open the editor in Programino.",
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
        CHAPTER_LABEL: "Chapitre",
        TAB_HIGH: "Haute Certitude",
        TAB_LOW: "Faible Certitude / À Réviser",
        BTN_ANALYZE: "Analyser avec l'IA",
        BTN_REANALYZE: "Ré-analyser avec l'IA",
        BTN_ANALYZING: "Analyse en cours...",
        PROGRESS_LABEL: "Analyse des soumissions...",
        PROGRESS_STUDENT: "Analyse de :",
        TH_NAME: "Étudiant",
        TH_GRADE: "Note",
        TH_SUGGESTION: "Suggestion Formative (Couche + Édition)",
        EMPTY_TAB: "Aucune soumission dans cet onglet.",
        STUDENT_ANSWER: "Réponse de l'étudiant :",
        DIAGRAM_DETECTED: "[Diagramme Visuel Détecté]",
        NO_LAYER_TEXT: "Aucun texte dans cette couche",
        BTN_EDIT: "Modifier",
        BTN_DONE: "Terminé",
        CERTAINTY_LABEL: "Certitude :",
        EDITED_BADGE: "• Modifié",
        HINT_HIGH: "Sélectionnez la couche pédagogique souhaitée ou modifiez le texte.",
        HINT_LOW: "Vérifiez les soumissions à faible certitude, vides ou très courtes.",
        BTN_CANCEL: "Annuler",
        BTN_CLEAR: "Effacer",
        BTN_INJECT: "Injecter dans l'éditeur",
        INJECTING_PROGRESS: "Injection",
        BANNER_EVALUATING: "Évaluation des soumissions en temps réel...",
        BANNER_SELECT_CLEAR: "Sélectionnez au moins une ligne à effacer.",
        BANNER_CLEARED: "Contenu sélectionné effacé.",
        BANNER_SELECT_INJECT: "Sélectionnez au moins un étudiant.",
        BANNER_INJECT_ERR: "Impossible d'ouvrir l'éditeur dans Programino.",
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
        CHAPTER_LABEL: "Hoofdstuk",
        TAB_HIGH: "Hoge Zekerheid",
        TAB_LOW: "Lage Zekerheid / Te Controleren",
        BTN_ANALYZE: "Analyseren met AI",
        BTN_REANALYZE: "Opnieuw analyseren met AI",
        BTN_ANALYZING: "Analyseren met AI...",
        PROGRESS_LABEL: "Inzendingen analyseren...",
        PROGRESS_STUDENT: "Analyse van:",
        TH_NAME: "Student",
        TH_GRADE: "Cijfer",
        TH_SUGGESTION: "Formatieve Suggestie (Laag + Bewerken)",
        EMPTY_TAB: "Geen inzendingen op dit tabblad.",
        STUDENT_ANSWER: "Antwoord van student:",
        DIAGRAM_DETECTED: "[Visueel Diagram Gedetecteerd]",
        NO_LAYER_TEXT: "Geen tekst in deze laag",
        BTN_EDIT: "Bewerken",
        BTN_DONE: "Klaar",
        CERTAINTY_LABEL: "Zekerheid:",
        EDITED_BADGE: "• Bewerkt",
        HINT_HIGH: "Selecteer de gewenste pedagogische laag of bewerk de tekst.",
        HINT_LOW: "Controleer inzendingen met lage zekerheid of lege antwoorden.",
        BTN_CANCEL: "Annuleren",
        BTN_CLEAR: "Wissen",
        BTN_INJECT: "Invoegen in huidige editor",
        INJECTING_PROGRESS: "Invoegen",
        BANNER_EVALUATING: "Inzendingen in realtime evalueren...",
        BANNER_SELECT_CLEAR: "Selecteer ten minste één rij om te wissen.",
        BANNER_CLEARED: "Geselecteerde inhoud gewist.",
        BANNER_SELECT_INJECT: "Selecteer ten minste één student.",
        BANNER_INJECT_ERR: "Kan de editor in Programino niet openen.",
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