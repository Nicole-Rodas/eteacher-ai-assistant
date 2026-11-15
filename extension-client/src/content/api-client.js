window.ETeacherClient = {
  cleanStudentAnswer(rawCode = "") {
    if (!rawCode || rawCode === "[SIN ENTREGA]") return "";
    return String(rawCode).replace(/^\[[^\]]+\]:\s*/gm, "").trim();
  },

  async evaluateSubmission({ exerciseInfo, rawCode, canvasImage }) {
    const cleanAnswer = this.cleanStudentAnswer(rawCode);
    const hasCanvas = Boolean(canvasImage && String(canvasImage).length > 0);
    const activeLang = window.ETeacherI18n?.detectLanguage ? window.ETeacherI18n.detectLanguage() : "es";

    const localStrings = {
      es: {
        blankJust: "Sin respuesta ni diagrama registrado en la plataforma.",
        blankText: "Entrega en blanco.",
        shortJust: `Respuesta recibida ("${cleanAnswer}") consta de muy pocos caracteres.`,
        shortText: "Entrega demasiado corta.",
        evalDefault: "Evaluado con IA.",
        allPrefix: (c, s, m) => `Correctiva: ${c}\nSocrática: ${s}\nMotivacional: ${m}`,
        errUnavail: (err) => `Servicio IA no disponible (${err}). Requiere revisión manual.`
      },
      en: {
        blankJust: "No answer or diagram submitted on the platform.",
        blankText: "Blank submission.",
        shortJust: `Received answer ("${cleanAnswer}") has too few characters.`,
        shortText: "Submission too short.",
        evalDefault: "Evaluated by AI.",
        allPrefix: (c, s, m) => `Corrective: ${c}\nSocratic: ${s}\nMotivational: ${m}`,
        errUnavail: (err) => `AI service unavailable (${err}). Manual review required.`
      },
      fr: {
        blankJust: "Aucune réponse ni diagramme enregistré sur la plateforme.",
        blankText: "Soumission vide.",
        shortJust: `La réponse reçue (« ${cleanAnswer} ») contient trop peu de caractères.`,
        shortText: "Soumission trop courte.",
        evalDefault: "Évalué par l'IA.",
        allPrefix: (c, s, m) => `Corrective : ${c}\nSocratique : ${s}\nMotivationnelle : ${m}`,
        errUnavail: (err) => `Service IA indisponible (${err}). Révision manuelle requise.`
      },
      nl: {
        blankJust: "Geen antwoord of diagram geregistreerd op het platform.",
        blankText: "Lege inzending.",
        shortJust: `Ontvangen antwoord ("${cleanAnswer}") bevat te weinig tekens.`,
        shortText: "Inzending te kort.",
        evalDefault: "Geëvalueerd door AI.",
        allPrefix: (c, s, m) => `Corrigerend: ${c}\nSocratisch: ${s}\nMotiverend: ${m}`,
        errUnavail: (err) => `AI-service niet beschikbaar (${err}). Handmatige controle vereist.`
      }
    };

    const str = localStrings[activeLang] || localStrings.en;

    if (!cleanAnswer && !hasCanvas) {
      return {
        certaintyLevel: "BAJA",
        certaintyScore: 100,
        nota: 0,
        justificacion: str.blankJust,
        layers: {
          correctiva: str.blankText,
          socratica: str.blankText,
          motivacional: str.blankText,
          completa: str.blankText
        }
      };
    }

    if (!hasCanvas && cleanAnswer.length < 5) {
      return {
        certaintyLevel: "BAJA",
        certaintyScore: 80,
        nota: 10,
        justificacion: str.shortJust,
        layers: {
          correctiva: str.shortText,
          socratica: str.shortText,
          motivacional: str.shortText,
          completa: str.shortText
        }
      };
    }

    let backendResponse = null;
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        backendResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "ANALYZE_SUBMISSION",
              payload: {
                unitTitle: exerciseInfo.unitTitle,
                problemStatement: exerciseInfo.problemStatement,
                studentCode: rawCode,
                conceptId: exerciseInfo.conceptId,
                canvasImage: canvasImage || null,
                userLangCode: activeLang,
                lang: activeLang
              }
            },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve(null);
              } else {
                resolve(res);
              }
            }
          );
        });
      }
    } catch {
      backendResponse = null;
    }

    if (backendResponse && backendResponse.ok && backendResponse.data) {
      const d = backendResponse.data;
      const c = (d.retroalimentacion && d.retroalimentacion.correctiva) || "";
      const s = (d.retroalimentacion && d.retroalimentacion.socratica) || "";
      const m = (d.retroalimentacion && d.retroalimentacion.motivacional) || "";

      return {
        certaintyLevel: (d.certeza && d.certeza.nivel ? d.certeza.nivel : "MEDIA").toUpperCase(),
        certaintyScore: d.certeza && d.certeza.porcentaje !== undefined ? d.certeza.porcentaje : 75,
        justificacion: (d.certeza && d.certeza.justificacion_docente) ? d.certeza.justificacion_docente : str.evalDefault,
        nota: d.calificacion_sugerida !== undefined ? d.calificacion_sugerida : 70,
        layers: {
          correctiva: c,
          socratica: s,
          motivacional: m,
          completa: str.allPrefix(c, s, m)
        }
      };
    }

    const errorReason = backendResponse?.error || "HTTP 500";
    return {
      certaintyLevel: "BAJA",
      certaintyScore: 0,
      nota: 0,
      justificacion: str.errUnavail(errorReason),
      layers: {
        correctiva: "",
        socratica: "",
        motivacional: "",
        completa: ""
      }
    };
  }
};