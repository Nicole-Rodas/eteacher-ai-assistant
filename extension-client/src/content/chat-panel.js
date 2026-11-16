window.ETeacherChat = {
  history: [],
  isOpen: false,

  ICONS: {
    messageSquare: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>',
    alert: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  },

  t(key) {
    if (window.ETeacherI18n && typeof window.ETeacherI18n.getText === "function") {
      return window.ETeacherI18n.getText(key);
    }
    const fallbacks = {
      CHAT_TITLE: "Asistente Pedagógico IA",
      CHAT_TYPING: "escribiendo",
      CHAT_PLACEHOLDER: "Escribe tu consulta aquí...",
      CHAT_SEND: "Enviar",
      CHAT_GREETING: "Hola. Soy tu asistente pedagógico. Puedes consultarme dudas conceptuales o pedirme recomendaciones de retroalimentación."
    };
    return fallbacks[key] || key;
  },

  getLang() {
    if (window.ETeacherI18n && typeof window.ETeacherI18n.detectLanguage === "function") {
      return window.ETeacherI18n.detectLanguage();
    }
    return "es";
  },

  refreshLanguage() {
    const titleSpan = document.getElementById("et-chat-title-text");
    const inputField = document.getElementById("et-chat-input");
    const sendBtn = document.getElementById("et-chat-send");
    const typingText = document.getElementById("et-chat-typing-text");

    if (titleSpan) titleSpan.textContent = this.t("CHAT_TITLE");
    if (inputField) inputField.placeholder = this.t("CHAT_PLACEHOLDER");
    if (sendBtn) sendBtn.title = this.t("CHAT_SEND");
    if (typingText) typingText.textContent = `IA ${this.t("CHAT_TYPING")}`;

    if (this.history.length === 0) {
      const container = document.getElementById("et-chat-messages");
      if (container) {
        container.innerHTML = "";
        this.addMessage("ai", this.t("CHAT_GREETING"));
      }
    }
  },

  init() {
    if (document.getElementById("et-chat-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "et-chat-wrapper";

    wrapper.innerHTML = [
      "<button id=\"et-chat-toggle-btn\" title=\"Abrir Asistente IA\">",
      "  " + this.ICONS.messageSquare,
      "</button>",
      "<div id=\"et-chat-header\">",
      "  <span style=\"display:flex; align-items:center; gap:8px;\">",
      "    " + this.ICONS.sparkles,
      "    <span id=\"et-chat-title-text\">" + this.t("CHAT_TITLE") + "</span>",
      "  </span>",
      "  <button id=\"et-chat-close-btn\" title=\"Cerrar\">",
      "    " + this.ICONS.close,
      "  </button>",
      "</div>",
      "<div id=\"et-chat-messages\"></div>",
      "<div id=\"et-chat-typing\">",
      "  <span id=\"et-chat-typing-text\">IA " + this.t("CHAT_TYPING") + "</span> <span class=\"et-typing-dots\"></span>",
      "</div>",
      "<div id=\"et-chat-input-area\">",
      "  <textarea id=\"et-chat-input\" rows=\"1\" placeholder=\"" + this.t("CHAT_PLACEHOLDER") + "\" autocomplete=\"off\"></textarea>",
      "  <button id=\"et-chat-send\" title=\"" + this.t("CHAT_SEND") + "\">",
      "    " + this.ICONS.send,
      "  </button>",
      "</div>"
    ].join("\n");

    document.body.appendChild(wrapper);

    this.bindEvents();
    this.sendInitialGreeting();
  },

  bindEvents() {
    const wrapper = document.getElementById("et-chat-wrapper");
    const toggleBtn = document.getElementById("et-chat-toggle-btn");
    const closeBtn = document.getElementById("et-chat-close-btn");
    const sendBtn = document.getElementById("et-chat-send");
    const inputField = document.getElementById("et-chat-input");

    const toggleChat = () => {
      this.isOpen = !this.isOpen;
      wrapper.classList.toggle("et-open", this.isOpen);
      if (this.isOpen) {
        this.refreshLanguage();
        inputField.focus();
      }
    };

    toggleBtn.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", toggleChat);

    const autoResize = () => {
      inputField.style.height = "auto";
      const maxHeight = 120;
      if (inputField.scrollHeight > maxHeight) {
        inputField.style.height = maxHeight + "px";
        inputField.style.overflowY = "auto";
      } else {
        inputField.style.height = inputField.scrollHeight + "px";
        inputField.style.overflowY = "hidden";
      }
    };

    inputField.addEventListener("input", autoResize);

    const handleSend = () => {
      const text = inputField.value.trim();
      if (!text) return;
      this.addMessage("user", text);
      inputField.value = "";
      inputField.style.height = "auto";
      inputField.style.overflowY = "hidden";
      this.processAIResponse(text);
    };

    sendBtn.addEventListener("click", handleSend);
    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  },

  cleanAIResponse(raw) {
    if (!raw) return "";

    if (typeof raw === "object") {
      return raw.respuesta || raw.response || raw.message || raw.reply || raw.justificacion || JSON.stringify(raw);
    }

    let text = String(raw).trim();
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .replace(/^JSON\s*:?\s*/i, "")
      .trim();

    if (text.startsWith("{") && text.endsWith("}")) {
      try {
        const parsed = JSON.parse(text);
        const extracted = parsed.respuesta || parsed.response || parsed.message || parsed.reply || parsed.justificacion || parsed.correctiva;
        if (extracted) {
          return String(extracted).trim();
        }
      } catch {
        const match = text.match(/"(?:respuesta|response|message|reply)"\s*:\s*"([\s\S]*)"\s*\}$/i);
        if (match && match[1]) {
          return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
        }
      }
    }

    return text;
  },

  addMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "et-msg et-msg-" + (role === "user" ? "user" : "ai");
    msgDiv.innerHTML = this.escapeHtml(text).replace(/\n/g, "<br>");

    const container = document.getElementById("et-chat-messages");
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  addErrorNotice(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "et-msg et-msg-ai";
    msgDiv.style.borderColor = "#fecaca";
    msgDiv.style.background = "#fef2f2";
    msgDiv.style.color = "#991b1b";
    msgDiv.innerHTML = this.ICONS.alert + " " + this.escapeHtml(text);

    const container = document.getElementById("et-chat-messages");
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  async sendInitialGreeting() {
    document.getElementById("et-chat-typing").style.display = "block";
    setTimeout(() => {
      document.getElementById("et-chat-typing").style.display = "none";
      this.addMessage("ai", this.t("CHAT_GREETING"));
    }, 400);
  },

  async processAIResponse(userText) {
    document.getElementById("et-chat-typing").style.display = "block";
    this.history.push({ role: "user", content: userText });

    try {
      const userLangCode = this.getLang();
      const currentConceptId = (window.ETeacherUI && window.ETeacherUI.activeExercise)
        ? window.ETeacherUI.activeExercise.conceptId
        : "general";

      const response = await fetch("https://eateacher.zer4c.dev/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLangCode: userLangCode,
          conceptContext: currentConceptId,
          messages: this.history
        })
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawReply = data.respuesta ?? data.response ?? data;
      const aiText = this.cleanAIResponse(rawReply) || "Respuesta sin contenido.";

      document.getElementById("et-chat-typing").style.display = "none";
      this.history.push({ role: "assistant", content: aiText });
      this.addMessage("ai", aiText);
    } catch (error) {
      document.getElementById("et-chat-typing").style.display = "none";
      this.addErrorNotice("Error de conexión con el tutor IA. Comprueba la conexión con el servidor.");
      console.error("[eTeacher Chat Error]:", error);
    }
  },

  escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
};