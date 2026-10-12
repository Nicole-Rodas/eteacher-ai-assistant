window.ETeacherUI = {
  activeExercise: null,
  activeTab: "HIGH", // "HIGH" (Certeza Alta) | "LOW" (Baja Certeza / Por Revisar)
  rowsData: [],

  LAYER_LABELS: {
    pregunta_guia: "1. Pregunta guía (Inductiva)",
    recomendacion_estructural: "2. Recomendación estructural",
    raiz_del_error: "3. Explicación raíz del error",
    completa: "Todas las capas combinadas"
  },

  init() {
    this.createModalContainer();
    this.scanExercises();
  },

  scanExercises() {
    window.ETeacherDOM.injectExerciseButtons((exerciseInfo) => {
      this.openAssistantForExercise(exerciseInfo);
    });
  },

  createModalContainer() {
    if (document.getElementById("et-triage-modal")) return;

    const modal = document.createElement("div");
    modal.id = "et-triage-modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="et-modal-card">
        <!-- Cabecera del Panel -->
        <div class="et-modal-header">
          <div>
            <span class="et-modal-badge" id="et-modal-chapter">Capítulo detectado</span>
            <h3 class="et-modal-title" id="et-modal-title">Ejercicio</h3>
            <p class="et-modal-subtitle" id="et-modal-statement"></p>
          </div>
          <button class="et-close-x" id="et-close-x" title="Cerrar">✕</button>
        </div>

        <!-- Barra de Pestañas -->
        <div class="et-tabs-bar">
          <button class="et-tab-btn active" id="et-tab-high">
            🟢 Certeza Alta <span class="et-count-pill" id="et-count-high">0</span>
          </button>
          <button class="et-tab-btn" id="et-tab-low">
            🟠 Baja Certeza / Por Revisar <span class="et-count-pill" id="et-count-low">0</span>
          </button>
          <button class="et-reanalyze-btn" id="et-reanalyze-btn">
             Analizar Entregas con IA
          </button>
        </div>

        <div id="et-status-banner" class="et-status-banner" style="display:none;"></div>

        <!-- Tabla de Entregas -->
        <div class="et-table-wrapper">
          <table class="et-table">
            <thead>
              <tr>
                <th style="width:40px;"><input type="checkbox" id="et-check-all" checked /></th>
                <th style="width:45px;">N°</th>
                <th style="width:170px;">Correo</th>
                <th style="width:160px;">Nombre</th>
                <th style="width:115px;">Nota</th>
                <th>Sugerencia Formativa (Selector de Capa + Edición)</th>
              </tr>
            </thead>
            <tbody id="et-table-body"></tbody>
          </table>
        </div>

        <!-- Botones Inferiores: Aceptar, Borrar, Cancelar -->
        <div class="et-modal-footer">
          <span class="et-footer-hint" id="et-footer-hint">
             Elige el tipo de respuesta en el menú y usa el lápiz (✏️) si deseas editar el texto o la nota.
          </span>
          <div class="et-footer-actions">
            <button class="et-btn et-btn-cancel" id="et-btn-cancel">Cancelar</button>
            <button class="et-btn et-btn-delete" id="et-btn-clear">Borrar</button>
            <button class="et-btn et-btn-accept" id="et-btn-accept">Aceptar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.bindModalEvents();
  },

  bindModalEvents() {
    document.getElementById("et-close-x").addEventListener("click", () => this.closeModal());
    document.getElementById("et-btn-cancel").addEventListener("click", () => this.closeModal());

    document.getElementById("et-tab-high").addEventListener("click", () => {
      this.activeTab = "HIGH";
      this.updateTabsUI();
      this.renderTable();
    });

    document.getElementById("et-tab-low").addEventListener("click", () => {
      this.activeTab = "LOW";
      this.updateTabsUI();
      this.renderTable();
    });

    document.getElementById("et-reanalyze-btn").addEventListener("click", () => {
      this.analyzeAllSubmissions();
    });

    document.getElementById("et-check-all").addEventListener("change", (e) => {
      const checked = e.target.checked;
      this.getFilteredRows().forEach(r => { r.selected = checked; });
      this.renderTable();
    });

    // Botón BORRAR: Limpia la sugerencia activa y la nota de las filas seleccionadas
    document.getElementById("et-btn-clear").addEventListener("click", () => {
      const selected = this.getFilteredRows().filter(r => r.selected);
      if (selected.length === 0) {
        this.showBanner("Selecciona al menos una fila para borrar.", true);
        return;
      }
      selected.forEach(r => {
        r.nota = 0;
        r.layers[r.selectedLayer] = "";
        r.wasEdited = true;
      });
      this.renderTable();
      this.showBanner("Se limpió el contenido seleccionado. Puedes escribir desde cero con el lápiz (✏️).", false);
    });

    // Botón ACEPTAR: Inyecta la capa seleccionada (y editada) en ProseMirror y guarda telemetría
    document.getElementById("et-btn-accept").addEventListener("click", async () => {
      const selected = this.getFilteredRows().filter(r => r.selected);
      if (selected.length === 0) {
        this.showBanner("Selecciona al menos una fila para aceptar.", true);
        return;
      }

      const firstRow = selected[0];
      const activeText = firstRow.layers[firstRow.selectedLayer] || "";

      const res = await window.ETeacherDOM.injectFeedbackIntoProseMirror(
        this.activeExercise?.exerciseBlock,
        {
          customText: activeText,
          calificacion: firstRow.nota
        }
      );

      // Registrar en el backend
      selected.forEach(row => {
        const finalSentText = row.layers[row.selectedLayer] || "";
        const origLayerText = row.originalLayers[row.selectedLayer] || "";
        const wasEdited =
          row.wasEdited ||
          finalSentText.trim() !== origLayerText.trim() ||
          Number(row.nota) !== Number(row.originalNota);

        chrome.runtime.sendMessage({
          action: "SAVE_FEEDBACK_LOG",
          payload: {
            unitTitle: this.activeExercise?.unitTitle,
            conceptId: this.activeExercise?.conceptId,
            certaintyLevel: row.certaintyLevel,
            certaintyScore: row.certaintyScore,
            aiSuggestedGrade: row.originalNota,
            teacherFinalGrade: row.nota,
            aiDraftFeedback: `[${row.selectedLayer}] ${origLayerText}`,
            teacherFinalFeedback: `[${row.selectedLayer}] ${finalSentText}`,
            wasEditedByTeacher: wasEdited,
            reviewTimeSeconds: 15
          }
        });
      });

      if (res.ok) {
        this.showBanner(`Se aceptaron ${selected.length} evaluación(es) y se inyectó en el editor ProseMirror.`, false);
      } else {
        this.showBanner(`Evaluaciones guardadas. (${res.error})`, false);
      }
    });
  },

  openAssistantForExercise(exerciseInfo) {
    this.activeExercise = exerciseInfo;
    document.getElementById("et-modal-chapter").textContent = `Capítulo ${exerciseInfo.chapterNum} (${exerciseInfo.conceptId})`;
    document.getElementById("et-modal-title").textContent = exerciseInfo.unitTitle;
    document.getElementById("et-modal-statement").textContent = exerciseInfo.problemStatement;

    document.getElementById("et-triage-modal").style.display = "flex";

    const rawSubmissions = window.ETeacherDOM.extractSubmissionsForExercise(exerciseInfo);
    this.rowsData = rawSubmissions.map(sub => ({
      ...sub,
      selected: true,
      certaintyLevel: "PENDIENTE",
      certaintyScore: 0,
      justificacion: "Analizando...",
      nota: 0,
      originalNota: 0,
      selectedLayer: "pregunta_guia", // Por defecto muestra la 1ra capa (o el docente la cambia en el menú)
      layers: {
        pregunta_guia: "",
        recomendacion_estructural: "",
        raiz_del_error: "",
        completa: ""
      },
      originalLayers: {
        pregunta_guia: "",
        recomendacion_estructural: "",
        raiz_del_error: "",
        completa: ""
      },
      isEditingGrade: false,
      isEditingSuggestion: false,
      wasEdited: false
    }));

    this.analyzeAllSubmissions();
  },

  closeModal() {
    document.getElementById("et-triage-modal").style.display = "none";
  },

  async analyzeAllSubmissions() {
    const btn = document.getElementById("et-reanalyze-btn");
    btn.disabled = true;
    btn.textContent = "Analizando con Gemini...";
    this.showBanner("Evaluando entregas del ejercicio y generando las 3 capas formativas...", false);

    for (const row of this.rowsData) {
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage(
          {
            action: "ANALYZE_SUBMISSION",
            payload: {
              unitTitle: this.activeExercise.unitTitle,
              problemStatement: this.activeExercise.problemStatement,
              studentCode: row.studentCode,
              conceptId: this.activeExercise.conceptId
            }
          },
          res => resolve(res)
        );
      });

      if (response && response.ok && response.data) {
        const d = response.data;
        row.certaintyLevel = (d.certeza?.nivel || "MEDIA").toUpperCase();
        row.certaintyScore = d.certeza?.porcentaje ?? 70;
        row.justificacion = d.certeza?.justificacion_docente || "";
        row.nota = d.calificacion_sugerida ?? 0;
        row.originalNota = row.nota;

        const q = d.retroalimentacion?.pregunta_guia || "";
        const r = d.retroalimentacion?.recomendacion_estructural || "";
        const e = d.retroalimentacion?.raiz_del_error || "";
        const all = `Pregunta guía: ${q}\n Recomendación: ${r}\n Raíz del error: ${e}`;

        row.layers = {
          pregunta_guia: q,
          recomendacion_estructural: r,
          raiz_del_error: e,
          completa: all
        };

        row.originalLayers = { ...row.layers };
      } else {
        row.certaintyLevel = "BAJA";
        row.certaintyScore = 20;
        row.justificacion = response?.error || "Sin conexión con el Backend.";
      }
    }

    btn.disabled = false;
    btn.textContent = "Re-analizar con IA";
    document.getElementById("et-status-banner").style.display = "none";

    this.updateTabsUI();
    this.renderTable();
  },

  getFilteredRows() {
    if (this.activeTab === "HIGH") {
      return this.rowsData.filter(r => r.certaintyLevel === "ALTA");
    }
    return this.rowsData.filter(r => r.certaintyLevel !== "ALTA");
  },

  updateTabsUI() {
    const highCount = this.rowsData.filter(r => r.certaintyLevel === "ALTA").length;
    const lowCount = this.rowsData.filter(r => r.certaintyLevel !== "ALTA").length;

    document.getElementById("et-count-high").textContent = highCount;
    document.getElementById("et-count-low").textContent = lowCount;

    document.getElementById("et-tab-high").classList.toggle("active", this.activeTab === "HIGH");
    document.getElementById("et-tab-low").classList.toggle("active", this.activeTab === "LOW");

    const hint = document.getElementById("et-footer-hint");
    hint.textContent = this.activeTab === "LOW"
      ? "Haz clic en el correo/nombre para saltar al editor en la página, o elige una capa y edítala con el lápiz (✏️)."
      : "Selecciona entre las 3 capas formativas en el menú desplegable y usa el lápiz (✏️) para personalizar el texto.";
  },

  renderTable() {
    const tbody = document.getElementById("et-table-body");
    tbody.innerHTML = "";
    const rows = this.getFilteredRows();

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="et-empty-row">
            No hay entregas registradas en esta pestaña.
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const currentText = row.layers[row.selectedLayer] || "";

      const formattedText = currentText.trim()
        ? window.ETeacherDOM.escapeHtml(currentText).replace(/\n/g, "<br>")
        : `<em style="color:#64748b;">Sin texto en esta capa (Haz clic en ✏️ para escribir)</em>`;

      const selectOptionsHtml = Object.entries(this.LAYER_LABELS)
        .map(([key, label]) => `<option value="${key}" ${row.selectedLayer === key ? "selected" : ""}>${label}</option>`)
        .join("");

      tr.innerHTML = `
        <td>
          <input type="checkbox" class="et-row-check" ${row.selected ? "checked" : ""} />
        </td>
        <td><strong>${row.numero}</strong></td>
        <td class="et-cell-jump" title="Clic para ir al editor en la página">${row.correo}</td>
        <td class="et-cell-jump" title="Clic para ir al editor en la página">
          <strong>${row.nombre}</strong>
          ${this.activeTab === "LOW" ? `<span class="et-jump-link">↗ Ir al editor</span>` : ""}
        </td>
        <td>
          <div class="et-grade-cell">
            ${row.isEditingGrade
              ? `<input type="number" class="et-inline-grade" value="${row.nota}" min="0" max="100" />`
              : `<span class="et-grade-val">${row.nota}/100</span>`
            }
            <button type="button" class="et-pencil-btn et-edit-grade-btn" title="${row.isEditingGrade ? "Confirmar nota" : "Editar nota"}">
              ${row.isEditingGrade ? "✔️" : "✏️"}
            </button>
          </div>
        </td>
        <td>
          <div class="et-sug-wrapper">
            <!-- Barra superior de la celda: Menú selector de las 3 respuestas + Botón Lápiz -->
            <div class="et-sug-toolbar">
              <select class="et-layer-select" title="Seleccionar tipo de respuesta formativa">
                ${selectOptionsHtml}
              </select>
              <button type="button" class="et-pencil-btn et-edit-sug-btn" title="${row.isEditingSuggestion ? "Confirmar edición" : "Editar o escribir texto"}">
                ${row.isEditingSuggestion ? "✔️ Listo" : "✏️ Editar"}
              </button>
            </div>

            <!-- Contenido de la respuesta seleccionada (Lectura o Textarea editable) -->
            <div class="et-sug-content">
              ${row.isEditingSuggestion
                ? `<textarea class="et-inline-ta" rows="3" placeholder="Escribe o modifica aquí la retroalimentación...">${currentText}</textarea>`
                : `<div class="et-sug-line">${formattedText}</div>`
              }
              <div class="et-cert-mini">
                Certeza: <strong>${row.certaintyLevel} (${row.certaintyScore}%)</strong> — ${row.justificacion}
                ${row.wasEdited ? `<span style="color:#fb923c; margin-left:6px;">• Editado</span>` : ""}
              </div>
            </div>
          </div>
        </td>
      `;

      // 1. Checkbox de fila
      tr.querySelector(".et-row-check").addEventListener("change", (e) => {
        row.selected = e.target.checked;
      });

      // 2. Clic en correo o nombre -> Saltar al editor en la página
      tr.querySelectorAll(".et-cell-jump").forEach(cell => {
        cell.addEventListener("click", () => {
          this.closeModal();
          window.ETeacherDOM.scrollToEditor(row.editorNode);
        });
      });

      // 3. Selector de las 3 Capas Pedagógicas
      tr.querySelector(".et-layer-select").addEventListener("change", (e) => {
        row.selectedLayer = e.target.value;
        this.renderTable();
      });

      // 4. Edición de NOTA en tiempo real
      const gradeInput = tr.querySelector(".et-inline-grade");
      if (gradeInput) {
        gradeInput.addEventListener("input", (e) => {
          row.nota = Number(e.target.value);
          row.wasEdited = true;
        });
        gradeInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            row.isEditingGrade = false;
            this.renderTable();
          }
        });
      }

      // Botón Lápiz de NOTA
      tr.querySelector(".et-edit-grade-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        row.isEditingGrade = !row.isEditingGrade;
        this.renderTable();
        if (row.isEditingGrade) {
          const newInput = tbody.querySelectorAll("tr")[rows.indexOf(row)]?.querySelector(".et-inline-grade");
          if (newInput) {
            newInput.focus();
            newInput.select();
          }
        }
      });

      // 5. Edición de SUGERENCIA en tiempo real sobre la capa activa
      const sugTextarea = tr.querySelector(".et-inline-ta");
      if (sugTextarea) {
        sugTextarea.addEventListener("input", (e) => {
          row.layers[row.selectedLayer] = e.target.value;
          row.wasEdited = true;
        });
      }

      // Botón Lápiz de SUGERENCIA
      tr.querySelector(".et-edit-sug-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        row.isEditingSuggestion = !row.isEditingSuggestion;
        this.renderTable();
        if (row.isEditingSuggestion) {
          const newTa = tbody.querySelectorAll("tr")[rows.indexOf(row)]?.querySelector(".et-inline-ta");
          if (newTa) {
            newTa.focus();
            newTa.setSelectionRange(newTa.value.length, newTa.value.length);
          }
        }
      });

      tbody.appendChild(tr);
    });
  },

  showBanner(msg, isError = false) {
    const b = document.getElementById("et-status-banner");
    b.style.display = "block";
    b.textContent = msg;
    b.className = "et-status-banner " + (isError ? "et-banner-err" : "et-banner-ok");
  }
};