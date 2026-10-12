window.ETeacherChat = {
  history: [], 
  isOpen: false,

  init() {
    if (document.getElementById("et-chat-wrapper")) return;

    const style = document.createElement("style");
    style.textContent = `
      #et-chat-wrapper { position: fixed; top: 0; right: -360px; width: 360px; height: 100vh; background: #fff; box-shadow: -4px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease; display: flex; flex-direction: column; font-family: system-ui, sans-serif; }
      #et-chat-wrapper.et-open { right: 0; }
      #et-chat-toggle-btn { position: absolute; left: -45px; top: 50%; transform: translateY(-50%); width: 45px; height: 70px; background: #e67e22; color: white; border-radius: 10px 0 0 10px; border: none; cursor: pointer; font-size: 24px; box-shadow: -2px 0 5px rgba(0,0,0,0.1); }
      #et-chat-header { background: #2c3e50; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
      #et-chat-close-btn { background: none; border: none; color: white; cursor: pointer; font-size: 18px; }
      #et-chat-messages { flex-grow: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
      .et-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
      .et-msg-ai { background: #fff; border: 1px solid #ddd; align-self: flex-start; border-bottom-left-radius: 2px; }
      .et-msg-user { background: #e67e22; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
      #et-chat-typing { font-size: 12px; color: #888; padding: 0 15px 5px; display: none; }
      #et-chat-input-area { padding: 15px; background: #fff; border-top: 1px solid #ddd; display: flex; gap: 8px; }
      #et-chat-input { flex-grow: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; outline: none; }
      #et-chat-send { background: #e67e22; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.id = "et-chat-wrapper";
    
    // AQUI INYECTAMOS LOS TEXTOS GLOBALES DEL I18N
    wrapper.innerHTML = `
      <button id="et-chat-toggle-btn" title="Chat">🤖</button>
      <div id="et-chat-header"><span>${window.ETeacherI18n.getText("CHAT_TITLE")}</span><button id="et-chat-close-btn">✖</button></div>
      <div id="et-chat-messages"></div>
      <div id="et-chat-typing">IA ${window.ETeacherI18n.getText("CHAT_TYPING")}</div>
      <div id="et-chat-input-area">
        <input type="text" id="et-chat-input" placeholder="${window.ETeacherI18n.getText("CHAT_PLACEHOLDER")}" autocomplete="off">
        <button id="et-chat-send">${window.ETeacherI18n.getText("CHAT_SEND")}</button>
      </div>
    `;
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
      if (this.isOpen) inputField.focus();
    };

    toggleBtn.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", toggleChat);

    const handleSend = () => {
      const text = inputField.value.trim();
      if (!text) return;
      this.addMessage("user", text);
      inputField.value = "";
      this.processAIResponse(text);
    };

    sendBtn.addEventListener("click", handleSend);
    inputField.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });
  },

  addMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `et-msg et-msg-${role === "user" ? "user" : "ai"}`;
    msgDiv.innerHTML = text.replace(/\n/g, "<br>");
    
    const container = document.getElementById("et-chat-messages");
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  async sendInitialGreeting() {
    document.getElementById("et-chat-typing").style.display = "block";
    const userLang = window.ETeacherI18n.detectLanguage();
    
    setTimeout(() => {
      document.getElementById("et-chat-typing").style.display = "none";
      let saludo = "¡Hola! Soy tu tutor IA. ¿En qué concepto te puedo ayudar hoy?";
      if (userLang === "en") saludo = "Hello! I'm your AI tutor. How can I help you today?";
      if (userLang === "fr") saludo = "Bonjour ! Je suis votre tuteur IA. Comment puis-je vous aider ?";
      if (userLang === "nl") saludo = "Hallo! Ik ben je AI-tutor. Hoe kan ik je vandaag helpen?";
      
      this.addMessage("ai", saludo);
    }, 800);
  },

  async processAIResponse(userText) {
    document.getElementById("et-chat-typing").style.display = "block";
    this.history.push({ role: "user", content: userText });

    try {
      const userLangCode = window.ETeacherI18n.detectLanguage();
      
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLangCode: userLangCode,
          messages: this.history
        })
      });

      if (!response.ok) throw new Error("Error en el servidor");
      
      const data = await response.json();
      const aiText = data.respuesta;
      
      document.getElementById("et-chat-typing").style.display = "none";
      this.history.push({ role: "assistant", content: aiText });
      this.addMessage("ai", aiText);

    } catch (error) {
      document.getElementById("et-chat-typing").style.display = "none";
      this.addMessage("ai", "❌ Error de conexión con el tutor IA.");
      console.error(error);
    }
  }
};