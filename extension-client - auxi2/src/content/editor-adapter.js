window.ETeacherEditor = {
  escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  scrollToEditor(editorNode) {
    if (!editorNode) return;
    editorNode.scrollIntoView({ behavior: "smooth", block: "center" });
    editorNode.classList.add("et-highlight-editor");
    setTimeout(() => editorNode.classList.remove("et-highlight-editor"), 2500);
  },

  async injectFeedbackIntoProseMirror(exerciseBlock, { customText = "", calificacion = 0, certeza = 0 }) {
    const scope = exerciseBlock || document;
    let proseMirror = scope.querySelector("div.ProseMirror[contenteditable='true']") || 
                      document.querySelector("div.ProseMirror[contenteditable='true']");

    if (!proseMirror) {
      const buttons = Array.from(document.querySelectorAll("button, a, span[role='button'], div[role='button']"));
      const addCommentBtn = buttons.find(btn => 
        /a[ñn]adir comentarios|agregar comentario|add comment/i.test(window.ETeacherDOM?.cleanText(btn.innerText || ""))
      );
      if (addCommentBtn) {
        addCommentBtn.click();
        await new Promise(r => setTimeout(r, 450));
        proseMirror = document.querySelector("div.ProseMirror[contenteditable='true']");
      }
    }

    if (!proseMirror) return { ok: false, error: "No se encontró el editor ProseMirror." };

    const lines = customText.split("\n").map(line => line.trim()).filter(Boolean);
    const paragraphsHtml = lines.map(line => `<p>${this.escapeHtml(line)}</p>`).join("");
    const scoreLabel = window.ETeacherI18n?.getText ? window.ETeacherI18n.getText("SCORE") : "Calificación:";

    proseMirror.focus();
    proseMirror.innerHTML = `${paragraphsHtml}<p><strong>${scoreLabel}</strong> ${this.escapeHtml(String(calificacion))}/100</p><p><br class="ProseMirror-trailingBreak"></p>`;
    proseMirror.dispatchEvent(new Event("input", { bubbles: true }));
    proseMirror.dispatchEvent(new Event("change", { bubbles: true }));

    if (certeza >= 85) {
      await new Promise(r => setTimeout(r, 500));
      const botones = Array.from(document.querySelectorAll("button"));
      const btnEnviar = botones.find(btn => 
        window.ETeacherDOM.cleanText(btn.innerText).toLowerCase().includes("guardar")
      );
      if (btnEnviar) {
        btnEnviar.click();
      }
    }

    return { ok: true };
  }
};