window.ETeacherDOM = {
  cleanText(str = "") {
    return str.replace(/[\u2066-\u2069\u200B-\u200F\uFEFF]/g, "").trim();
  },

  isRealEvaluableTask(container) {
    if (!container) return false;
    
    const icons = Array.from(container.querySelectorAll("svg.history-icon, .history-icon"));
    
    return icons.some(icon => {
      const viewBox = icon.getAttribute("viewBox") || "";
      if (viewBox.includes("384 512")) return true;

      const path = icon.querySelector("path");
      if (path) {
        const d = path.getAttribute("d") || "";
        if (d.startsWith("M192")) return true;
      }
      return false;
    });
  },

  injectExerciseButtons(onOpenAssistant) {
    document.querySelectorAll(".et-bar-trigger-btn").forEach(btn => {
      const block = btn.closest(".section-item-container");
      if (block) {
        if (!this.isRealEvaluableTask(block)) {
          btn.remove();
          const header = block.querySelector(".section-item-header");
          if (header) header.removeAttribute("data-et-injected");
        }
      } else {
        btn.remove();
      }
    });

    const exerciseContainers = Array.from(document.querySelectorAll(".section-item-container"));

    exerciseContainers.forEach((container, idx) => {
      if (!this.isRealEvaluableTask(container)) {
        return; 
      }

      const header = container.querySelector(".section-item-header");
      if (!header) return;

      if (header.dataset.etInjected === "true" || header.querySelector(".et-bar-trigger-btn")) return;
      header.dataset.etInjected = "true";

      let titleText = "Tarea Evaluable";
      const titleSpan = header.querySelector("span.markdown span") || header.querySelector(".markdown");
      if (titleSpan) titleText = this.cleanText(titleSpan.innerText);

      const pageChapter = this.detectChapterFromPage();
      
      this.appendButtonToElement(header, {
        chapterNum: pageChapter,
        conceptId: this.mapChapterToConceptId(pageChapter),
        exerciseCode: `ej-${pageChapter}-${idx + 1}`,
        unitTitle: titleText,
        problemStatement: this.extractStatementFromBlock(container, titleText),
        exerciseBlock: container
      }, onOpenAssistant);
    });
  },

  appendButtonToElement(container, exerciseData, onOpenAssistant) {
    if (container.querySelector(".et-bar-trigger-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "et-bar-trigger-btn";
    
    btn.innerHTML = window.ETeacherI18n.getText("EVAL_BTN");
    btn.title = `${window.ETeacherI18n.getText("EVAL_TITLE")} ${exerciseData.unitTitle}`;
    
    btn.style.cssText = "margin-left: auto; align-self: center; padding: 4px 12px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 6px; border: none; background: #e67e22; color: white; display: flex; align-items: center; gap: 5px; height: fit-content;";

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

  extractStatementFromBlock(block, headerText) {
    if (!block) return "Analizar la entrega.";
    const candidates = Array.from(block.querySelectorAll("p, .statement, .description"));
    for (const el of candidates) {
      const txt = this.cleanText(el.innerText || "");
      if (txt.length > 15 && !this.isRealEvaluableTask(el)) {
        return txt.split("\n")[0].trim();
      }
    }
    return headerText || "Analizar el ejercicio entregado.";
  },

  mapChapterToConceptId(chapterNum) {
    const map = {
      1: "cap1_lenguaje", 2: "cap2_pensar", 3: "cap3_hablar", 4: "cap4_variables",
      5: "cap5_condicionales", 6: "cap6_bucle_while", 7: "cap7_funciones", 
      8: "cap8_bucle_for", 9: "cap9_errores", 10: "cap10_algoritmos", 11: "cap11_archivos"
    };
    return map[chapterNum] || "cap7_funciones";
  },

  // ============================================================================
  // MOTOR DE EXTRACCIÓN EN LOTE (CON STORAGE LOCAL Y CONTADOR EN VIVO EN REVISION)
  // ============================================================================
  
  observeModalAndInjectButton(onBatchCollect) {
    const observer = new MutationObserver(() => {
      const modalContent = document.querySelector(".submission_modal_content");
      
      // Si el modal está abierto y nuestro botón de lote aún no existe
      if (modalContent && !document.querySelector(".et-batch-btn")) {
        const headerBox = document.querySelector(".thaw-combobox")?.parentElement;
        
        if (headerBox) {
          const btnBatch = document.createElement("button");
          btnBatch.className = "et-batch-btn";
          btnBatch.innerHTML = "⚡ Recolectar Datos de Clase";
          btnBatch.style.cssText = "margin-left: 20px; padding: 6px 14px; font-weight: bold; background: #8e44ad; color: white; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background 0.3s;";
          
          btnBatch.onclick = async (e) => {
            e.preventDefault();
            btnBatch.disabled = true;
            btnBatch.style.background = "#e67e22";

            // Le pasamos el botón a la función para que pueda actualizar el texto dinámicamente
            const allStudentsData = await this.harvestAllClassSubmissions(btnBatch);
            
            btnBatch.innerHTML = `${allStudentsData.length} Capturados`;
            btnBatch.style.background = "#2980b9";
            
            if (onBatchCollect) {
              onBatchCollect(allStudentsData);
            }
          };
          
          headerBox.appendChild(btnBatch);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },

  async harvestAllClassSubmissions(btnElement) {
    console.log("[eTeacher] Iniciando recolección segura...");
    const allStudentsData = [];
    let hasNext = true;
    let failsafe = 0; // Subimos el límite a 300 para cubrir cursos grandes

    // Limpiamos el almacenamiento temporal antes de un nuevo lote
    await chrome.storage.local.set({ 'et_current_batch': [] });

    while (hasNext && failsafe < 300) {
      failsafe++;
      
      const currentStudent = this.extractSubmissionsForExercise()[0];
      
      if (currentStudent && !allStudentsData.find(s => s.nombre === currentStudent.nombre)) {
        allStudentsData.push(currentStudent);
        
        // 1. Actualización visual en el botón
        if (btnElement) {
          btnElement.innerHTML = `Recolectando: ${allStudentsData.length}...`;
        }
        
        // 2. Guardado persistente inmediato en la memoria de la extensión
        await chrome.storage.local.set({ 'et_current_batch': allStudentsData });
        console.log(`💾 [eTeacher] Guardado en local: ${currentStudent.nombre}`);
      }

      const nextBtn = document.querySelector(".submission_modal_next");
      const isHidden = !nextBtn || nextBtn.classList.contains("hidden") || nextBtn.style.display === "none";

      if (!isHidden) {
        nextBtn.click(); // 🖱️ Clic fantasma
        await new Promise(r => setTimeout(r, 700)); // Espera a que renderice la red
      } else {
        console.log("[eTeacher] Fin de la lista alcanzado.");
        hasNext = false; 
      }
    }

    console.log(`🎉 [eTeacher] ¡Escaneo completado! ${allStudentsData.length} estudiantes recolectados y guardados de forma segura.`);
    return allStudentsData;
  },

  extractSubmissionsForExercise() {
    const modal = document.querySelector(".submission_modal_content")?.parentElement || document.body;
    let canvasBase64 = null;

    const inputNombre = document.querySelector(".thaw-combobox__input");
    const nombreEstudiante = inputNombre ? inputNombre.value.trim() : "Estudiante";

    const extractores = [
      {
        nombre: "Código",
        extraer: (node) => {
          const cm = node.querySelector(".cm-content, .CodeMirror, pre, .monaco-editor");
          if (!cm) return null;
          const lines = Array.from(cm.querySelectorAll(".cm-line, pre.CodeMirror-line"));
          return lines.length > 0
            ? lines.map(l => this.cleanText(l.innerText)).join("\n")
            : this.cleanText(cm.innerText);
        }
      },
      {
        nombre: "Texto Abierto",
        extraer: (node) => {
          const area = node.querySelector("textarea");
          return (area && area.value.trim().length > 0) ? this.cleanText(area.value) : null;
        }
      },
      {
        nombre: "Opción Marcada",
        extraer: (node) => {
          const inputs = Array.from(node.querySelectorAll("input[type='radio']:checked, input[type='checkbox']:checked"));
          if (inputs.length === 0) return null;
          return inputs.map(opt => {
            const label = opt.closest("label") || opt.parentElement;
            return this.cleanText(label ? label.innerText : opt.value);
          }).join(" | ");
        }
      },
      {
        nombre: "Botón Activo",
        extraer: (node) => {
          const divs = Array.from(node.querySelectorAll(".selected, .active, .checked, [aria-checked='true'], .is-checked"));
          if (divs.length === 0) return null;
          return divs.map(opt => this.cleanText(opt.innerText)).join(" | ");
        }
      },
      {
        nombre: "Diagrama",
        extraer: (node) => {
          const canvas = node.querySelector("canvas");
          if (!canvas) return null;
          try { canvasBase64 = canvas.toDataURL("image/png"); } catch(e) {}
          return "Imagen gráfica detectada.";
        }
      }
    ];

    let partesEncontradas = [];
    let tiposDetectados = [];

    for (const extractor of extractores) {
      const resultado = extractor.extraer(modal);
      if (resultado) {
        partesEncontradas.push(`[${extractor.nombre.toUpperCase()}]:\n${resultado}`);
        tiposDetectados.push(extractor.nombre);
      }
    }

    if (partesEncontradas.length === 0) {
      tiposDetectados.push("Raspado de Emergencia");
      const clone = modal.cloneNode(true);
      clone.querySelectorAll(".et-bar-trigger-btn, .section-item-header, .thaw-combobox").forEach(el => el.remove());
      partesEncontradas.push(`[TEXTO PLANO]:\n${this.cleanText(clone.innerText)}`);
    }

    const currentCode = partesEncontradas.join("\n\n");
    const typeDetected = tiposDetectados.join(" + ");

    return [{
      id: "stu-" + Math.floor(Math.random() * 10000), // Genera un ID temporal único
      numero: 1, 
      correo: "estudiante@umss.edu.bo", 
      nombre: nombreEstudiante, 
      studentCode: currentCode, 
      canvasImage: canvasBase64, 
      editorNode: modal, 
      tipoRespuesta: typeDetected 
    }];
  },

  scrollToEditor(editorNode) {
    if (!editorNode) return;
    editorNode.scrollIntoView({ behavior: "smooth", block: "center" });
    editorNode.classList.add("et-highlight-editor");
    setTimeout(() => editorNode.classList.remove("et-highlight-editor"), 2500);
  },

  // ============================================================================
  // OBJETIVO 5: INYECCIÓN Y ENVÍO AUTOMÁTICO (HUMAN-IN-THE-LOOP VS AUTOMATIC)
  // ============================================================================
  async injectFeedbackIntoProseMirror(exerciseBlock, { customText = "", calificacion = 0, certeza = 0 }) {
    const scope = exerciseBlock || document;
    let proseMirror = scope.querySelector("div.ProseMirror[contenteditable='true']") || document.querySelector("div.ProseMirror[contenteditable='true']");

    if (!proseMirror) {
      const buttons = Array.from(document.querySelectorAll("button, a, span[role='button'], div[role='button']"));
      const addCommentBtn = buttons.find(btn => /a[ñn]adir comentarios|agregar comentario|add comment/i.test(this.cleanText(btn.innerText || "")));
      if (addCommentBtn) {
        addCommentBtn.click();
        await new Promise(r => setTimeout(r, 450));
        proseMirror = document.querySelector("div.ProseMirror[contenteditable='true']");
      }
    }

    if (!proseMirror) return { ok: false, error: "No se encontró el editor ProseMirror." };

    const lines = customText.split("\n").map(line => line.trim()).filter(Boolean);
    const paragraphsHtml = lines.map(line => `<p>${this.escapeHtml(line)}</p>`).join("");

    proseMirror.focus();
    proseMirror.innerHTML = `${paragraphsHtml}<p><strong>${window.ETeacherI18n.getText("SCORE")}</strong> ${this.escapeHtml(String(calificacion))}/100</p><p><br class="ProseMirror-trailingBreak"></p>`;
    proseMirror.dispatchEvent(new Event("input", { bubbles: true }));
    proseMirror.dispatchEvent(new Event("change", { bubbles: true }));

    // Filtro Híbrido: Envío automático si la certeza de la IA es >= 85%
    if (certeza >= 85) {
      console.log(`🚀 [Certeza Alta: ${certeza}%] Enviando retroalimentación automáticamente...`);
      await new Promise(r => setTimeout(r, 500)); 
      
      const botones = Array.from(document.querySelectorAll("button"));
      const btnEnviar = botones.find(btn => this.cleanText(btn.innerText).toLowerCase().includes("guardar")); 
      
      if (btnEnviar) {
        btnEnviar.click();
      } else {
        console.warn("⚠️ Certeza alta, pero no se encontró el botón de enviar para automatizar.");
      }
    } else {
      console.log(`👨‍🏫 [Certeza: ${certeza}%] Derivando al docente para revisión manual.`);
    }

    return { ok: true };
  },

  escapeHtml(str = "") {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
};