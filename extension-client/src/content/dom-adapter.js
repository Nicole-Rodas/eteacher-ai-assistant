window.ETeacherDOM = {
  ICONS: {
    bolt: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    loader: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>'
  },

  cleanText(str = "") {
    return String(str || "").replace(/[\u2066-\u2069\u200B-\u200F\uFEFF]/g, "").trim();
  },

  extractCanvasBase64(containerElement) {
    if (!containerElement) return null;
    const canvas = containerElement.querySelector("canvas");
    if (!canvas) return null;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      return dataUrl.split(",")[1] || null;
    } catch {
      return null;
    }
  },

  extractDeepContent(obj) {
    if (obj === null || obj === undefined) return "";
    if (typeof obj === "string") return this.cleanText(obj);
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

    if (Array.isArray(obj)) {
      return obj
        .map(item => this.extractDeepContent(item))
        .filter(Boolean)
        .join(" | ");
    }

    if (typeof obj === "object") {
      if (typeof obj.content === "string") return this.cleanText(obj.content);
      if (obj.content && typeof obj.content === "object") {
        const nested = this.extractDeepContent(obj.content);
        if (nested) return nested;
      }
      if (typeof obj.code === "string") return this.cleanText(obj.code);
      if (typeof obj.text === "string") return this.cleanText(obj.text);
      if (typeof obj.value === "string") return this.cleanText(obj.value);
      if (obj.selected_options !== undefined) {
        return "Opciones: " + this.extractDeepContent(obj.selected_options);
      }
      if (obj.selected !== undefined) {
        return "Selección: " + this.extractDeepContent(obj.selected);
      }

      const collected = [];
      for (const key of Object.keys(obj)) {
        if (key === "data" || key === "given_feedback" || key === "marks" || key.endsWith("_id")) {
          continue;
        }
        const val = this.extractDeepContent(obj[key]);
        if (val) collected.push(val);
      }
      return collected.join("\n");
    }

    return "";
  },

  parsePrograminoNetworkBatch(rawData) {
    if (!Array.isArray(rawData)) return [];

    let rows = rawData;
    if (Array.isArray(rawData[0]) && Array.isArray(rawData[0][0]) && !Array.isArray(rawData[0][0][0])) {
      rows = rawData[0];
    }

    const context = this.extractModalExerciseContext();

    return rows.map((row, index) => {
      if (!Array.isArray(row)) return null;

      const studentInfo = row[0] || {};
      const classInfo = row[1] || {};
      const submissions = Array.isArray(row[2]) ? row[2] : [];

      const partesEncontradas = [];
      const tiposDetectados = [];
      const submissionsMeta = [];

      submissions.forEach((sub, idx) => {
        if (!sub || typeof sub !== "object") return;

        const subType = sub.submission_type || {};
        const tipoKeys = Object.keys(subType);
        const tipoKey = tipoKeys[0] || "Respuesta";
        let givenFeedback = null;

        if (tipoKeys.length > 0 && subType[tipoKey]) {
          tiposDetectados.push(tipoKey);
          const typeObj = subType[tipoKey];
          givenFeedback = typeObj?.data?.given_feedback || null;

          const extractedContent = this.extractDeepContent(typeObj);
          if (extractedContent && extractedContent.length > 0) {
            const label = submissions.length > 1
              ? `[PARTE ${idx + 1} - ${tipoKey.toUpperCase()}]:\n${extractedContent}`
              : `[${tipoKey.toUpperCase()}]:\n${extractedContent}`;
            partesEncontradas.push(label);
          }
        }

        submissionsMeta.push({
          submission_id: sub.submission_id || null,
          section_item_part_id: sub.section_item_part_id || null,
          marks: Array.isArray(sub.marks) ? sub.marks : [],
          given_feedback: givenFeedback
        });
      });

      const modalContent = document.querySelector(".submission_modal_content") || document.body;
      const canvasExtracted = this.extractCanvasBase64(modalContent);

      const finalCode = partesEncontradas.join("\n\n").trim();
      const hasSubmission = finalCode.length > 0 || Boolean(canvasExtracted);
      const alreadyGraded = submissionsMeta.some(
        m => m.given_feedback !== null || (m.marks && m.marks.length > 0)
      );

      return {
        id: studentInfo.id || (`stu-${index + 1}`),
        numero: index + 1,
        correo: "estudiante@umss.edu.bo",
        nombre: this.cleanText(studentInfo.name || (`Estudiante ${index + 1}`)),
        grupo: this.cleanText(classInfo.name || ""),
        gestion: classInfo.year || "",
        studentCode: finalCode || (canvasExtracted ? "[DIAGRAMA_EN_CANVAS]" : "[SIN ENTREGA]"),
        canvasImage: canvasExtracted,
        tipoRespuesta: tiposDetectados.length > 0 ? tiposDetectados.join(" + ") : (canvasExtracted ? "Diagrama" : "Sin Entrega"),
        hasSubmission: hasSubmission,
        alreadyGraded: alreadyGraded,
        submissionsMeta: submissionsMeta,
        chapterNum: context.chapterNum,
        conceptId: context.conceptId,
        unitTitle: context.unitTitle,
        problemStatement: context.problemStatement
      };
    }).filter(Boolean);
  },

  extractModalExerciseContext() {
    const pageChapter = this.detectChapterFromPage();
    const modal = document.querySelector(".submission_modal_content") || document.body;
    const titleEl = modal.querySelector(".section-item-header, h1, h2, h3");
    const unitTitle = titleEl ? this.cleanText(titleEl.innerText).split("\n")[0] : "Tarea Evaluable";

    return {
      chapterNum: pageChapter,
      conceptId: this.mapChapterToConceptId(pageChapter),
      unitTitle: unitTitle,
      problemStatement: this.extractStatementFromBlock(modal, unitTitle)
    };
  },

  detectChapterFromPage() {
    const bodyText = this.cleanText(document.body.innerText || "");
    const match = bodyText.match(/(?:Cap[ií]tulo|Secci[oó]n|Ejercicio(?:\s+de\s+programaci[oó]n)?)\s*(\d{1,2})/i);
    return match ? parseInt(match[1], 10) : 7;
  },

  extractStatementFromBlock(block, headerText) {
    const currentTitle = (headerText || "").toLowerCase().trim();

    // 1. Encontrar el contenedor de la sección en la página que coincide con el título
    let matchedSection = null;
    const allSections = Array.from(document.querySelectorAll(".section-item, .content-item"));

    for (const section of allSections) {
      const titleEl = section.querySelector(".section-item-header, h1, h2, h3, .title");
      const secTitle = titleEl ? this.cleanText(titleEl.innerText).toLowerCase() : "";
      
      // Coincidencia exacta o cruzada del título del ejercicio
      if (currentTitle && secTitle && (secTitle.includes(currentTitle) || currentTitle.includes(secTitle))) {
        matchedSection = section;
        break;
      }
    }

    // 2. Definir el ámbito de búsqueda: priorizar la sección coincidente, luego el bloque pasado
    const scope = matchedSection || block || document.querySelector(".submission_modal_content");

    if (scope) {
      // A) Si esta sección específica tiene un blockquote (ej. preguntas de opción múltiple / definiciones)
      const bq = scope.querySelector("blockquote");
      if (bq) {
        const bqText = this.cleanText(bq.innerText || "");
        if (bqText.length > 8) {
          const parentSpan = bq.closest("span.markdown, .markdown") || bq.parentElement;
          const introP = parentSpan ? parentSpan.querySelector("p") : null;
          const introText = (introP && introP !== bq.querySelector("p"))
            ? this.cleanText(introP.innerText) + "\n"
            : "";
          return `${introText}"${bqText}"`;
        }
      }

      // B) Si no tiene blockquote, extraer los párrafos de su propio contenedor markdown
      const md = scope.querySelector(".section-item-content span.markdown, span.markdown, .markdown");
      if (md) {
        const txt = this.cleanText(md.innerText || "");
        if (txt.length > 15 && !txt.toLowerCase().includes("ejercicio de pensamiento")) {
          return txt;
        }
      }

      // C) Párrafos directos de la consigna dentro de la sección
      const paragraphs = Array.from(scope.querySelectorAll("p, .statement, .description"))
        .map(p => this.cleanText(p.innerText || ""))
        .filter(t => t.length > 15 &&
                     !t.toLowerCase().includes("guardar") &&
                     !t.toLowerCase().includes("comentario") &&
                     !t.toLowerCase().includes("ejercicio de pensamiento"));

      if (paragraphs.length > 0) {
        return paragraphs.join("\n\n");
      }
    }

    // 3. Fallback
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

  injectExerciseButtons() {
    window.ETeacherNetwork?.init();
  },

  observeModalAndInjectButton(onBatchCollect) {
    window.ETeacherNetwork?.init((batch) => {
      const btnBatch = document.querySelector(".et-batch-btn");
      if (btnBatch && !btnBatch.disabled) {
        btnBatch.innerHTML = `${this.ICONS.bolt}Evaluar ${batch.length} Entregas (Instantáneo)`;
        btnBatch.style.background = "#27ae60";
      }
    });

    const observer = new MutationObserver(() => {
      const modalContent = document.querySelector(".submission_modal_content");

      if (modalContent && !document.querySelector(".et-batch-btn")) {
        const combobox = document.querySelector(".thaw-combobox");
        const headerBox = combobox ? combobox.parentElement : null;

        if (headerBox) {
          const btnBatch = document.createElement("button");
          btnBatch.type = "button";
          btnBatch.className = "et-batch-btn";

          const intercepted = window.ETeacherNetwork?._interceptedBatch;
          const hasInstantData = intercepted && intercepted.length > 0;

          btnBatch.innerHTML = hasInstantData
            ? `${this.ICONS.bolt}Evaluar ${intercepted.length} Entregas (Instantáneo)`
            : `${this.ICONS.bolt}Recolectar Datos de Clase`;

          btnBatch.style.cssText = `margin-left: 20px; padding: 6px 14px; font-weight: 600; font-size: 13px; background: ${hasInstantData ? "#27ae60" : "#2c3e50"}; color: white; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: background 0.2s;`;

          btnBatch.onclick = async (e) => {
            e.preventDefault();
            btnBatch.disabled = true;
            btnBatch.style.background = "#e67e22";

            const allStudentsData = await this.harvestAllClassSubmissions(btnBatch);

            btnBatch.innerHTML = `${this.ICONS.check}${allStudentsData.length} Capturados`;
            btnBatch.style.background = "#2980b9";
            btnBatch.disabled = false;

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

  async waitForStudentChange(previousName, maxWaitMs = 4000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const inputNombre = document.querySelector(".thaw-combobox__input");
      const currentName = inputNombre ? this.cleanText(inputNombre.value) : "";
      if (currentName && currentName !== previousName) {
        await new Promise(r => setTimeout(r, 150));
        return true;
      }
      await new Promise(r => setTimeout(r, 80));
    }
    return false;
  },

  async harvestAllClassSubmissions(btnElement) {
    const intercepted = window.ETeacherNetwork?._interceptedBatch;
    if (intercepted && intercepted.length > 0) {
      return intercepted;
    }

    const allStudentsData = [];
    let hasNext = true;
    let failsafe = 0;
    const context = this.extractModalExerciseContext();

    while (hasNext && failsafe < 300) {
      failsafe++;
      const currentStudent = this.extractSubmissionsForExercise(context, false)[0];

      if (currentStudent) {
        currentStudent.id = `stu-${allStudentsData.length + 1}`;
        currentStudent.numero = allStudentsData.length + 1;
        allStudentsData.push(currentStudent);

        if (btnElement) {
          btnElement.innerHTML = `${this.ICONS.loader}Recolectando: ${allStudentsData.length}...`;
        }

        try {
          if (typeof chrome !== "undefined" && chrome.storage?.local) {
            await chrome.storage.local.set({ et_current_batch: allStudentsData });
          }
        } catch {}
      }

      const nextBtn = document.querySelector(".submission_modal_next");
      const isHidden = !nextBtn || nextBtn.classList.contains("hidden") || nextBtn.style.display === "none" || nextBtn.disabled;

      if (!isHidden) {
        const previousName = currentStudent ? currentStudent.nombre : "";
        nextBtn.click();
        const changed = await this.waitForStudentChange(previousName, 2500);
        if (!changed) hasNext = false;
      } else {
        hasNext = false;
      }
    }

    return allStudentsData;
  },

  extractSubmissionsForExercise(exerciseInfo = null, includeDomNode = true) {
    const modalContent = document.querySelector(".submission_modal_content") || document.body;
    const canvasBase64 = this.extractCanvasBase64(modalContent);
    const inputNombre = document.querySelector(".thaw-combobox__input");
    const nombreEstudiante = inputNombre ? this.cleanText(inputNombre.value) : "Estudiante";

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
          const areas = Array.from(node.querySelectorAll("textarea"));
          const textosArea = areas
            .map(a => this.cleanText(a.value || a.textContent || a.innerText || ""))
            .filter(t => t.length > 0);
          if (textosArea.length > 0) return textosArea.join("\n");

          const inputs = Array.from(node.querySelectorAll("input[type='text'], input:not([type])"));
          const validInputs = inputs
            .filter(i => !i.classList.contains("thaw-combobox__input"))
            .map(i => this.cleanText(i.value || ""))
            .filter(t => t.length > 0);
          if (validInputs.length > 0) return validInputs.join(" | ");

          const editables = Array.from(node.querySelectorAll("[contenteditable='true']:not(.ProseMirror)"));
          const textosEdit = editables
            .map(el => this.cleanText(el.innerText || ""))
            .filter(t => t.length > 0);
          if (textosEdit.length > 0) return textosEdit.join("\n");

          return null;
        }
      },
      {
        nombre: "Opción Marcada",
        extraer: (node) => {
          const checkedInputs = Array.from(node.querySelectorAll("input[type='radio']:checked, input[type='checkbox']:checked"));
          if (checkedInputs.length === 0) return null;

          const seleccionadas = checkedInputs.map(opt => {
            const label = opt.closest("label") || opt.parentElement;
            return this.cleanText(label ? label.innerText : opt.value);
          }).join(" | ");

          const todasLasOpciones = Array.from(node.querySelectorAll("input[type='radio'], input[type='checkbox']"))
            .map(opt => {
              const lbl = opt.closest("label") || opt.parentElement;
              return this.cleanText(lbl ? lbl.innerText : opt.value);
            })
            .filter((v, i, a) => v && a.indexOf(v) === i);

          if (todasLasOpciones.length > 0) {
            return `Opción elegida: [${seleccionadas}]\n(Alternativas disponibles: ${todasLasOpciones.join(" / ")})`;
          }

          return seleccionadas;
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
        extraer: () => null
      }
    ];

    const partesEncontradas = [];
    const tiposDetectados = [];

    for (const extractor of extractores) {
      const resultado = extractor.extraer(modalContent);
      if (resultado && resultado.trim().length > 0) {
        partesEncontradas.push(`[${extractor.nombre.toUpperCase()}]:\n${resultado}`);
        tiposDetectados.push(extractor.nombre);
      }
    }

    const currentCode = partesEncontradas.join("\n\n").trim();
    const hasSubmission = currentCode.length > 0 || Boolean(canvasBase64);
    const typeDetected = tiposDetectados.length > 0 ? tiposDetectados.join(" + ") : (canvasBase64 ? "Diagrama" : "Sin Entrega");
    const context = exerciseInfo || this.extractModalExerciseContext();

    const studentObj = {
      id: "stu-1",
      numero: 1,
      correo: "estudiante@umss.edu.bo",
      nombre: nombreEstudiante,
      studentCode: currentCode || (canvasBase64 ? "[DIAGRAMA_EN_CANVAS]" : "[SIN ENTREGA]"),
      canvasImage: canvasBase64,
      tipoRespuesta: typeDetected,
      hasSubmission: hasSubmission,
      chapterNum: context.chapterNum,
      conceptId: context.conceptId,
      unitTitle: context.unitTitle,
      problemStatement: context.problemStatement
    };

    if (includeDomNode) {
      studentObj.editorNode = modalContent;
    }

    return [studentObj];
  }
};