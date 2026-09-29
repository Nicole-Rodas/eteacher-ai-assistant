window.ETeacherDOM = {
  /**
   * Limpia los caracteres invisibles Unicode (\u2068, \u2069, \u200B) que inyecta Programino eTeacher
   */
  cleanText(str = "") {
    return str.replace(/[\u2066-\u2069\u200B-\u200F\uFEFF]/g, "").trim();
  },

  /**
   * Busca barras de ejercicios (por título o por contenedor de código/respuesta) e inyecta el botón
   */
  injectExerciseButtons(onOpenAssistant) {
    // 1. Buscar por el texto del encabezado (ej. "Ejercicio de programación 7.9.1 - Multiplicar")
    const textNodes = Array.from(document.querySelectorAll("span, h1, h2, h3, h4, h5, p, div, header"));

    textNodes.forEach((node) => {
      // Solo evaluar nodos que no tengan muchos hijos para no duplicar en contenedores padres gigantes
      if (node.children.length > 6) return;

      const cleaned = this.cleanText(node.innerText || "");
      const firstLine = cleaned.split("\n")[0].trim();

      const match = firstLine.match(/Ejercicio(?:\s+de\s+programaci[oó]n)?\s*(\d+)\.(\d+)(?:\.(\d+))?\s*-\s*(.+)/i);
      if (!match) return;

      const barContainer = node.closest("header, .exercise-bar") || node.parentElement || node;
      if (!barContainer || barContainer.querySelector(".et-bar-trigger-btn")) return;

      const chapterNum = parseInt(match[1], 10);
      const exerciseCode = `${match[1]}.${match[2]}${match[3] ? "." + match[3] : ""}`;
      const exerciseTitle = firstLine;
      const exerciseBlock = this.findExerciseBlock(barContainer);
      const problemStatement = this.extractStatementFromBlock(exerciseBlock, firstLine);

      this.appendButtonToElement(barContainer, {
        chapterNum,
        conceptId: this.mapChapterToConceptId(chapterNum),
        exerciseCode,
        unitTitle: exerciseTitle,
        problemStatement,
        exerciseBlock
      }, onOpenAssistant);
    });

    // 2. Respaldo directo: Si hay un editor CodeMirror o textarea[name='answer'] sin botón en su título, se lo inyectamos arriba
    const editors = Array.from(document.querySelectorAll("div.cm-editor, textarea[name='answer']"));
    editors.forEach((editor, idx) => {
      const block = this.findExerciseBlock(editor);
      if (block && block.querySelector(".et-bar-trigger-btn")) return;

      const parent = editor.parentElement;
      if (!parent || parent.querySelector(".et-bar-trigger-btn")) return;

      const pageChapter = this.detectChapterFromPage();
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex; justify-content:flex-end; margin-bottom:6px;";
      parent.insertBefore(wrapper, editor);

      this.appendButtonToElement(wrapper, {
        chapterNum: pageChapter,
        conceptId: this.mapChapterToConceptId(pageChapter),
        exerciseCode: `${pageChapter}.x.${idx + 1}`,
        unitTitle: this.extractUnitTitle(),
        problemStatement: this.extractStatementFromBlock(block, ""),
        exerciseBlock: block
      }, onOpenAssistant);
    });
  },

  appendButtonToElement(container, exerciseData, onOpenAssistant) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "et-bar-trigger-btn";
    btn.innerHTML = `🤖 Asistente IA`;
    btn.title = `Abrir asistente para ${exerciseData.unitTitle}`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onOpenAssistant(exerciseData);
    });

    container.appendChild(btn);
  },

  detectChapterFromPage() {
    const bodyText = this.cleanText(document.body.innerText || "");
    const match = bodyText.match(/(?:Cap[ií]tulo|Secci[oó]n|Ejercicio(?:\s+de\s+programaci[oó]n)?)\s*(\d{1,2})/i);
    return match ? parseInt(match[1], 10) : 7;
  },

  extractUnitTitle() {
    const bodyText = this.cleanText(document.body.innerText || "");
    const match = bodyText.match(/Ejercicio(?:\s+de\s+programaci[oó]n)?\s*\d+\.\d+(?:\.\d+)?\s*-\s*[^\n]+/i);
    if (match) return match[0].trim();
    return document.title || "Ejercicio en Programino eTeacher";
  },

  findExerciseBlock(startNode) {
    let current = startNode;
    let steps = 0;
    while (current && current !== document.body && steps < 6) {
      if (
        current.querySelector("div.cm-editor") ||
        current.querySelector("textarea[name='answer']") ||
        current.querySelector("div.drawer-part canvas")
      ) {
        return current;
      }
      current = current.parentElement;
      steps++;
    }
    return startNode?.parentElement || document.body;
  },

  extractStatementFromBlock(block, headerText) {
    if (!block) return "Analizar la entrega del estudiante según los criterios pedagógicos del capítulo.";
    const candidates = Array.from(block.querySelectorAll("p, .statement, .description, div"));
    for (const el of candidates) {
      const txt = this.cleanText(el.innerText || "");
      if (
        txt.length > 15 &&
        txt.length < 500 &&
        !txt.includes("Ejercicio de programación") &&
        txt !== headerText &&
        !el.querySelector("div.cm-editor")
      ) {
        return txt.split("\n")[0].trim();
      }
    }
    return headerText || "Analizar la lógica del ejercicio.";
  },

  mapChapterToConceptId(chapterNum) {
    const map = {
      1: "cap1_lenguaje",
      2: "cap2_pensar",
      3: "cap3_hablar",
      4: "cap4_variables",
      5: "cap5_condicionales",
      6: "cap6_bucle_while",
      7: "cap7_funciones",
      8: "cap8_bucle_for",
      9: "cap9_errores",
      10: "cap10_algoritmos",
      11: "cap11_archivos"
    };
    return map[chapterNum] || "cap7_funciones";
  },

  extractSubmissionsForExercise(exerciseInfo) {
    const block = exerciseInfo?.exerciseBlock || document;
    let currentCode = "";
    const cmContent = block.querySelector("div.cm-editor div.cm-content") || document.querySelector("div.cm-editor div.cm-content");
    const plainText = block.querySelector("textarea[name='answer']") || document.querySelector("textarea[name='answer']");

    if (cmContent) {
      const lines = Array.from(cmContent.querySelectorAll(".cm-line"));
      currentCode = lines.length > 0
        ? lines.map(l => this.cleanText(l.innerText)).join("\n").trim()
        : this.cleanText(cmContent.innerText);
    } else if (plainText) {
      currentCode = this.cleanText(plainText.value || plainText.innerText || "");
    }

    const editorElement = block.querySelector("div.cm-editor") || plainText || document.querySelector("div.cm-editor") || document.body;

    return [
      {
        id: "stu-1",
        numero: 1,
        correo: "est.garcia@umss.edu.bo",
        nombre: "García Pérez, Mateo",
        studentCode: currentCode || `def multiplicar(x, y):\n    return x * y`,
        editorNode: editorElement
      },
      {
        id: "stu-2",
        numero: 2,
        correo: "est.rojas@umss.edu.bo",
        nombre: "Rojas Camacho, Valeria",
        studentCode: `def multiplicar(x, y):\n    print(x * y)`,
        editorNode: editorElement
      },
      {
        id: "stu-3",
        numero: 3,
        correo: "est.vargas@umss.edu.bo",
        nombre: "Vargas Flores, Diego",
        studentCode: `def multiplicar(x, y):\n    resultado = x + y`,
        editorNode: editorElement
      }
    ];
  },

  scrollToEditor(editorNode) {
    if (!editorNode) return;
    editorNode.scrollIntoView({ behavior: "smooth", block: "center" });
    editorNode.classList.add("et-highlight-editor");
    setTimeout(() => editorNode.classList.remove("et-highlight-editor"), 2500);
  },

  async injectFeedbackIntoProseMirror(exerciseBlock, { customText = "", calificacion = 0 }) {
    const scope = exerciseBlock || document;
    let proseMirror = scope.querySelector("div.ProseMirror[contenteditable='true']") ||
                      document.querySelector("div.ProseMirror[contenteditable='true']");

    if (!proseMirror) {
      const buttons = Array.from(document.querySelectorAll("button, a, span[role='button'], div[role='button']"));
      const addCommentBtn = buttons.find(btn =>
        /a[ñn]adir comentarios|agregar comentario|add comment/i.test(this.cleanText(btn.innerText || ""))
      );
      if (addCommentBtn) {
        addCommentBtn.click();
        await new Promise(r => setTimeout(r, 450));
        proseMirror = document.querySelector("div.ProseMirror[contenteditable='true']");
      }
    }

    if (!proseMirror) {
      return { ok: false, error: "No se encontró el editor ProseMirror ('Añadir comentarios') en esta vista." };
    }

    const lines = customText.split("\n").map(line => line.trim()).filter(Boolean);
    const paragraphsHtml = lines.map(line => `<p>${this.escapeHtml(line)}</p>`).join("");

    proseMirror.focus();
    proseMirror.innerHTML = `
      ${paragraphsHtml}
      <p><strong>📊 Calificación:</strong> ${this.escapeHtml(String(calificacion))}/100</p>
      <p><br class="ProseMirror-trailingBreak"></p>
    `;

    proseMirror.dispatchEvent(new Event("input", { bubbles: true }));
    proseMirror.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  },

  escapeHtml(str = "") {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
};