window.ETeacherUI = {
  activeExercise: null,
  activeTab: "PENDING", // Arranca en PENDING para ver la lista antes de evaluar
  testGroup: "all", // "all" | "groupA" (Prueba a Prueba 8) | "groupB" (Prueba 9 a 16)
  rowsData: [],
  currentAnalysisRunId: 0,
  isAnalyzing: false,

  currentSessionId: null,
  sessionStartTime: 0,
  aiAnalysisDurationMs: 0,

  ICONS: {
    checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  },

  LAYER_LABELS: {
    correctiva: "1. Retroalimentación Correctiva",
    socratica: "2. Pregunta Socrática (Reflexiva)",
    motivacional: "3. Mensaje Motivacional",
    todas: "Todas las capas combinadas"
  },

  init() {
    this.createModalContainer();
  },

  scanExercises() {
    if (window.ETeacherDOM && window.ETeacherDOM.injectExerciseButtons) {
      window.ETeacherDOM.injectExerciseButtons();
    }
  },

  // Validador de pertenencia por nombre textual exacto
  matchesSelectedGroup(row) {
    if (this.testGroup === "all") return true;
    const name = String(row.nombre || "").trim();

    if (this.testGroup === "groupA") {
      // Coincide con "Usuario Prueba" (sin número) O "Usuario Prueba2" a "Usuario Prueba8"
      const isBasePrueba = /^Usuario\s*Prueba$/i.test(name);
      const isPrueba2to8 = /Usuario\s*Prueba\s*[2-8]\b/i.test(name);
      return isBasePrueba || isPrueba2to8;
    }

    if (this.testGroup === "groupB") {
      // Coincide con "Usuario Prueba9" hasta "Usuario Prueba16"
      return /Usuario\s*Prueba\s*(9|1[0-6])\b/i.test(name);
    }

    return true;
  },

  createModalContainer() {
    if (document.getElementById("et-triage-modal")) return;

    const modal = document.createElement("div");
    modal.id = "et-triage-modal";
    modal.style.setProperty("display", "none", "important");
    modal.innerHTML = [
      "<div class=\"et-modal-card\">",
      "  <div class=\"et-modal-header\">",
      "    <div>",
      "      <span class=\"et-modal-badge\" id=\"et-modal-chapter\">Capítulo detectado</span>",
      "      <h3 class=\"et-modal-title\" id=\"et-modal-title\">Ejercicio</h3>",
      "      <p class=\"et-modal-subtitle\" id=\"et-modal-statement\"></p>",
      "    </div>",
      "    <button class=\"et-close-x\" id=\"et-close-x\" title=\"Cerrar\">" + this.ICONS.close + "</button>",
      "  </div>",
      "  <div class=\"et-tabs-bar\" style=\"display:flex; align-items:center; gap:8px; flex-wrap:wrap;\">",
      "    <button class=\"et-tab-btn\" id=\"et-tab-pending\">",
      "      ⏳ Por Evaluar <span class=\"et-count-pill\" id=\"et-count-pending\">0</span>",
      "    </button>",
      "    <button class=\"et-tab-btn\" id=\"et-tab-high\">",
      "      " + this.ICONS.checkCircle + " Certeza Alta <span class=\"et-count-pill\" id=\"et-count-high\">0</span>",
      "    </button>",
      "    <button class=\"et-tab-btn\" id=\"et-tab-low\">",
      "      " + this.ICONS.alertCircle + " Certeza Media/Baja <span class=\"et-count-pill\" id=\"et-count-low\">0</span>",
      "    </button>",
      "    <div style=\"margin-left:auto; display:flex; align-items:center; gap:6px;\">",
      "      <select id=\"et-test-group-select\" style=\"padding:5px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px; font-weight:600; background:#f8fafc; color:#334155; cursor:pointer;\">",
      "        <option value=\"all\">Lote: Todos</option>",
      "        <option value=\"groupA\">Grupo A (Prueba a Prueba 8)</option>",
      "        <option value=\"groupB\">Grupo B (Prueba 9 a Prueba 16)</option>",
      "      </select>",
      "      <button class=\"et-reanalyze-btn\" id=\"et-reanalyze-btn\">",
      "        " + this.ICONS.sparkles + " Analizar con IA",
      "      </button>",
      "    </div>",
      "  </div>",
      "  <div id=\"et-progress-wrapper\" class=\"et-progress-wrapper\">",
      "    <div class=\"et-progress-info\">",
      "      <span id=\"et-progress-label\">Analizando entregas con IA...</span>",
      "      <span id=\"et-progress-percent\">0% (0/0)</span>",
      "    </div>",
      "    <div class=\"et-progress-track\">",
      "      <div id=\"et-progress-fill\" class=\"et-progress-fill\"></div>",
      "    </div>",
      "  </div>",
      "  <div id=\"et-status-banner\" class=\"et-status-banner\" style=\"display:none;\"></div>",
      "  <div class=\"et-table-wrapper\">",
      "    <table class=\"et-table\">",
      "      <thead>",
      "        <tr>",
      "          <th style=\"width:38px;\"><input type=\"checkbox\" id=\"et-check-all\" checked /></th>",
      "          <th style=\"width:42px;\">N°</th>",
      "          <th style=\"width:200px;\">Nombre</th>",
      "          <th style=\"width:110px;\">Nota</th>",
      "          <th>Sugerencia Formativa (Selector de Capa + Edición)</th>",
      "        </tr>",
      "      </thead>",
      "      <tbody id=\"et-table-body\"></tbody>",
      "    </table>",
      "  </div>",
      "  <div class=\"et-modal-footer\">",
      "    <span class=\"et-footer-hint\" id=\"et-footer-hint\">",
      "      Selecciona tu lote de prueba y presiona \"Analizar con IA\" para comenzar.",
      "    </span>",
      "    <div class=\"et-footer-actions\">",
      "      <button class=\"et-btn et-btn-cancel\" id=\"et-btn-cancel\">Cancelar</button>",
      "      <button class=\"et-btn et-btn-delete\" id=\"et-btn-clear\">Borrar</button>",
      "      <button class=\"et-btn et-btn-accept\" id=\"et-btn-accept\">Inyectar en Editor Actual</button>",
      "    </div>",
      "  </div>",
      "</div>"
    ].join("\n");

    document.body.appendChild(modal);
    this.bindModalEvents();
  },

  bindModalEvents() {
    document.getElementById("et-close-x").addEventListener("click", () => this.closeModal());
    document.getElementById("et-btn-cancel").addEventListener("click", () => this.closeModal());

    document.getElementById("et-tab-pending").addEventListener("click", () => {
      this.activeTab = "PENDING";
      this.updateTabsUI();
      this.renderTable();
    });

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

    const groupSelect = document.getElementById("et-test-group-select");
    if (groupSelect) {
      groupSelect.addEventListener("change", (e) => {
        this.testGroup = e.target.value;
        this.updateTabsUI();
        this.renderTable();
      });
    }

    document.getElementById("et-reanalyze-btn").addEventListener("click", () => {
      this.analyzeAllSubmissions({ forceAll: true });
    });

    document.getElementById("et-check-all").addEventListener("change", (e) => {
      const checked = e.target.checked;
      this.getFilteredRows().forEach(r => { r.selected = checked; });
      this.renderTable();
    });

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
      if (window.ETeacherStorage) {
        window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
      }
      this.renderTable();
      this.showBanner("Se limpió el contenido seleccionado.", false);
    });

    document.getElementById("et-btn-accept").addEventListener("click", async () => {
      const selected = this.getFilteredRows().filter(r => r.selected);
      if (selected.length === 0) {
        this.showBanner("Selecciona al menos un estudiante para inyectar.", true);
        return;
      }

      const btnAccept = document.getElementById("et-btn-accept");
      const originalText = btnAccept.innerText;
      const triageModal = document.getElementById("et-triage-modal");

      try {
        btnAccept.disabled = true;

        if (triageModal) {
          triageModal.style.opacity = "0.15";
          triageModal.style.pointerEvents = "none";
        }

        let successCount = 0;

        for (let i = 0; i < selected.length; i++) {
          const row = selected[i];
          btnAccept.innerText = `Inyectando (${i + 1}/${selected.length}): ${row.nombre.split(" ")[0]}...`;

          if (window.ETeacherDOM?.selectStudentInCombobox) {
            await window.ETeacherDOM.selectStudentInCombobox(row.nombre);
          }

          const activeText = row.layers[row.selectedLayer] || "";

          let injectedOk = false;
          if (window.ETeacherDOM?.injectFeedbackAndGrade) {
            injectedOk = await window.ETeacherDOM.injectFeedbackAndGrade(activeText, row.nota);
          }

          if (injectedOk) {
            row.selected = false;
            successCount++;

            const layerToSend = row.selectedLayer === "completa" ? "todas" : row.selectedLayer;

            if (this.currentSessionId && window.ETeacherTelemetry) {
              window.ETeacherTelemetry.logInjection({
                sessionId: this.currentSessionId,
                certaintyLevel: row.certaintyLevel,
                certaintyScore: row.certaintyScore,
                selectedLayer: layerToSend,
                wasEdited: Boolean(row.wasEdited),
                gradeChanged: row.nota !== row.originalNota,
                aiSuggestedGrade: row.originalNota,
                finalGrade: row.nota
              });
            }
          }

          if (selected.length > 1) {
            await new Promise(res => setTimeout(res, 450));
          }
        }

        if (window.ETeacherStorage) {
          window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
        }

        this.renderTable();
        this.showBanner(
          successCount > 0
            ? `¡Se inyectaron y guardaron ${successCount} de ${selected.length} evaluaciones!`
            : "No se pudo encontrar o abrir el editor en Programino.",
          successCount === 0
        );

      } catch (err) {
        console.error("Error durante la inyección en lote:", err);
        this.showBanner("Error en el proceso de inyección: " + (err.message || err), true);
      } finally {
        if (triageModal) {
          triageModal.style.opacity = "1";
          triageModal.style.pointerEvents = "auto";
        }
        btnAccept.innerText = originalText;
        btnAccept.disabled = false;
      }
    });
  },

  openAssistantForBatch(exerciseInfo, batchData) {
    this.activeExercise = exerciseInfo || {};
    this.currentAnalysisRunId++;
    this.isAnalyzing = false;

    this.currentSessionId = (typeof crypto !== "undefined" && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
      );
    this.sessionStartTime = Date.now();
    this.aiAnalysisDurationMs = 0;

    document.getElementById("et-modal-chapter").textContent = "Capítulo " + (this.activeExercise.chapterNum || "-") + " (" + (this.activeExercise.conceptId || "general") + ")";
    document.getElementById("et-modal-title").textContent = this.activeExercise.unitTitle || "Evaluación de Clase";
    document.getElementById("et-modal-statement").textContent = this.activeExercise.problemStatement || "";

    const cached = window.ETeacherStorage ? window.ETeacherStorage.getExerciseRows(this.activeExercise) : null;
    const isCacheValid = cached && 
                         Array.isArray(cached) && 
                         cached.length > 0 && 
                         cached[0].problemStatement === this.activeExercise.problemStatement;

    if (isCacheValid) {
      this.rowsData = cached;
    } else {
      this.rowsData = (batchData || []).map((sub, idx) => ({
        ...sub,
        numero: sub.numero || (idx + 1),
        selected: true,
        certaintyLevel: "PENDIENTE",
        certaintyScore: 0,
        justificacion: "Pendiente de análisis con IA...",
        nota: 0,
        originalNota: 0,
        selectedLayer: "correctiva",
        problemStatement: this.activeExercise.problemStatement || "",
        layers: {
          correctiva: "",
          socratica: "",
          motivacional: "",
          todas: ""
        },
        originalLayers: {
          correctiva: "",
          socratica: "",
          motivacional: "",
          todas: ""
        },
        isEditingGrade: false,
        isEditingSuggestion: false,
        wasEdited: false
      }));

      if (window.ETeacherStorage) {
        window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
      }
    }

    if (window.ETeacherTelemetry && this.rowsData.length > 0) {
      const highCount = this.rowsData.filter(r => r.certaintyLevel === "ALTA").length;
      const lowCount = this.rowsData.filter(r => r.certaintyLevel !== "ALTA" && r.certaintyLevel !== "PENDIENTE").length;

      window.ETeacherTelemetry.logSession({
        id: this.currentSessionId,
        teacherId: "docente-local",
        unitTitle: this.activeExercise?.unitTitle || "Sin título",
        conceptId: this.activeExercise?.conceptId || "general",
        totalStudents: this.rowsData.length,
        highCertaintyCount: highCount,
        lowCertaintyCount: lowCount,
        aiAnalysisDurationMs: 0,
        totalSessionDurationMs: 0
      });
    }

    const modal = document.getElementById("et-triage-modal");
    if (modal) {
      modal.style.setProperty("display", "flex", "important");
    }

    // Si todo está pendiente, empezar en la pestaña de pendientes
    const targetPending = this.rowsData.filter(r => this.matchesSelectedGroup(r) && r.certaintyLevel === "PENDIENTE");
    this.activeTab = targetPending.length > 0 ? "PENDING" : "HIGH";

    this.updateTabsUI();
    this.renderTable();

    // NOTA: NO se dispara el análisis automático. Espera a que el usuario presione "Analizar con IA".
  },

  closeModal() {
    const modal = document.getElementById("et-triage-modal");
    if (modal && modal.style.display !== "none") {
      modal.style.setProperty("display", "none", "important");

      this.currentAnalysisRunId++;
      this.isAnalyzing = false;

      if (this.sessionStartTime > 0 && this.rowsData.length > 0 && window.ETeacherTelemetry) {
        const totalSessionMs = Date.now() - this.sessionStartTime;
        const highCount = this.rowsData.filter(r => r.certaintyLevel === "ALTA").length;
        const lowCount = this.rowsData.filter(r => r.certaintyLevel !== "ALTA" && r.certaintyLevel !== "PENDIENTE").length;

        window.ETeacherTelemetry.logSession({
          id: this.currentSessionId,
          teacherId: "docente-local",
          unitTitle: this.activeExercise?.unitTitle || "Sin título",
          conceptId: this.activeExercise?.conceptId || "general",
          totalStudents: this.rowsData.length,
          highCertaintyCount: highCount,
          lowCertaintyCount: lowCount,
          aiAnalysisDurationMs: this.aiAnalysisDurationMs,
          totalSessionDurationMs: totalSessionMs
        });

        this.sessionStartTime = 0;
      }
    }
  },

  updateProgressUI(completed, total, currentStudentName = "") {
    const wrapper = document.getElementById("et-progress-wrapper");
    const label = document.getElementById("et-progress-label");
    const percentEl = document.getElementById("et-progress-percent");
    const fill = document.getElementById("et-progress-fill");
    if (!wrapper || !fill) return;

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    wrapper.style.display = "block";
    label.textContent = currentStudentName
      ? "Analizando entrega de: " + currentStudentName + "..."
      : "Analizando entregas con IA...";
    percentEl.textContent = pct + "% (" + completed + "/" + total + ")";
    fill.style.width = pct + "%";
  },

  syncRowProgress(total, studentName) {
    if (window.ETeacherStorage) {
      window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
    }
    const targetRows = this.rowsData.filter(r => this.matchesSelectedGroup(r));
    const completed = targetRows.filter(r => r.certaintyLevel !== "PENDIENTE").length;
    this.updateProgressUI(completed, total, studentName);
    this.updateTabsUI();
    this.renderTable();
  },

  async analyzeAllSubmissions(options = { forceAll: false }) {
    const runId = ++this.currentAnalysisRunId;
    this.isAnalyzing = true;

    const btn = document.getElementById("et-reanalyze-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = this.ICONS.sparkles + " Analizando con IA...";
    }
    this.showBanner("Evaluando entregas del lote en tiempo real...", false);

    // Filtrar estrictamente solo los que entran en el grupo seleccionado
    const targetRows = this.rowsData.filter(r => this.matchesSelectedGroup(r));

    if (options && options.forceAll) {
      targetRows.forEach(r => { r.certaintyLevel = "PENDIENTE"; });
      this.activeTab = "PENDING";
      this.updateTabsUI();
      this.renderTable();
    }

    const total = targetRows.length;
    const aiStartTime = Date.now();

    for (const row of targetRows) {
      if (runId !== this.currentAnalysisRunId) {
        this.isAnalyzing = false;
        return;
      }

      if (!options?.forceAll && row.certaintyLevel !== "PENDIENTE") {
        continue;
      }

      const result = await window.ETeacherClient.evaluateSubmission({
        exerciseInfo: this.activeExercise,
        rawCode: row.studentCode,
        canvasImage: row.canvasImage
      });

      if (runId !== this.currentAnalysisRunId) {
        this.isAnalyzing = false;
        return;
      }

      const layersNormalized = {
        correctiva: result.layers?.correctiva || "",
        socratica: result.layers?.socratica || "",
        motivacional: result.layers?.motivacional || "",
        todas: result.layers?.todas || result.layers?.completa || ""
      };

      row.certaintyLevel = result.certaintyLevel;
      row.certaintyScore = result.certaintyScore;
      row.justificacion = result.justificacion;
      row.nota = result.nota;
      row.originalNota = result.nota;
      row.layers = layersNormalized;
      row.originalLayers = { ...layersNormalized };

      this.syncRowProgress(total, row.nombre);
    }

    this.aiAnalysisDurationMs += (Date.now() - aiStartTime);
    this.isAnalyzing = false;

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = this.ICONS.sparkles + " Re-analizar con IA";
    }
    const banner = document.getElementById("et-status-banner");
    if (banner) banner.style.display = "none";

    setTimeout(() => {
      const prog = document.getElementById("et-progress-wrapper");
      if (prog) prog.style.display = "none";
    }, 800);

    // Cambiar automáticamente a la pestaña con resultados
    const highCount = targetRows.filter(r => r.certaintyLevel === "ALTA").length;
    this.activeTab = highCount > 0 ? "HIGH" : "LOW";

    this.updateTabsUI();
    this.renderTable();
  },

  getFilteredRows() {
    const groupRows = this.rowsData.filter(r => this.matchesSelectedGroup(r));

    if (this.activeTab === "PENDING") {
      return groupRows.filter(r => r.certaintyLevel === "PENDIENTE");
    }
    if (this.activeTab === "HIGH") {
      return groupRows.filter(r => r.certaintyLevel === "ALTA");
    }
    return groupRows.filter(r => r.certaintyLevel !== "ALTA" && r.certaintyLevel !== "PENDIENTE");
  },

  updateTabsUI() {
    const groupRows = this.rowsData.filter(r => this.matchesSelectedGroup(r));
    const pendingCount = groupRows.filter(r => r.certaintyLevel === "PENDIENTE").length;
    const highCount = groupRows.filter(r => r.certaintyLevel === "ALTA").length;
    const lowCount = groupRows.filter(r => r.certaintyLevel !== "ALTA" && r.certaintyLevel !== "PENDIENTE").length;

    document.getElementById("et-count-pending").textContent = pendingCount;
    document.getElementById("et-count-high").textContent = highCount;
    document.getElementById("et-count-low").textContent = lowCount;

    document.getElementById("et-tab-pending").classList.toggle("active", this.activeTab === "PENDING");
    document.getElementById("et-tab-high").classList.toggle("active", this.activeTab === "HIGH");
    document.getElementById("et-tab-low").classList.toggle("active", this.activeTab === "LOW");

    const hint = document.getElementById("et-footer-hint");
    if (this.activeTab === "PENDING") {
      hint.textContent = "Entregas listas para evaluar. Pulsa \"Analizar con IA\" para comenzar.";
    } else if (this.activeTab === "LOW") {
      hint.textContent = "Revisa las entregas con certeza baja, entregas en blanco o respuestas muy cortas.";
    } else {
      hint.textContent = "Selecciona la capa pedagógica que prefieras o edita el texto antes de inyectar.";
    }
  },

  renderTable() {
    const tbody = document.getElementById("et-table-body");
    tbody.innerHTML = "";
    const rows = this.getFilteredRows();

    if (rows.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"5\" class=\"et-empty-row\">No hay entregas en este grupo o pestaña.</td></tr>";
      return;
    }

    const escapeFn = window.ETeacherEditor?.escapeHtml || window.ETeacherDOM?.escapeHtml || ((s) => String(s));

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const currentText = row.layers[row.selectedLayer] || "";

      const formattedText = currentText.trim()
        ? escapeFn(currentText).replace(/\n/g, "<br>")
        : "<em style=\"color:#64748b;\">" + escapeFn(row.justificacion || "Sin análisis") + "</em>";

      const selectOptionsHtml = Object.entries(this.LAYER_LABELS)
        .map(([key, label]) => "<option value=\"" + key + "\" " + (row.selectedLayer === key ? "selected" : "") + ">" + label + "</option>")
        .join("");

      const cleanPreview = window.ETeacherClient?.cleanStudentAnswer ? window.ETeacherClient.cleanStudentAnswer(row.studentCode) : row.studentCode;
      const answerSnippet = cleanPreview
        ? "<div style=\"font-size:11px; color:#475569; padding:4px 8px; background:#f1f5f9; border-left:3px solid #e67e22; border-radius:4px; margin-bottom:4px;\"><strong>Respuesta del alumno:</strong> " + escapeFn(cleanPreview) + "</div>"
        : (row.canvasImage ? "<div style=\"font-size:11px; color:#475569; padding:4px 8px; background:#f1f5f9; border-left:3px solid #2980b9; border-radius:4px; margin-bottom:4px;\"><strong>Respuesta del alumno:</strong> [Diagrama Gráfico Detectado]</div>" : "");

      tr.innerHTML = [
        "<td><input type=\"checkbox\" class=\"et-row-check\" " + (row.selected ? "checked" : "") + " /></td>",
        "<td><strong>" + row.numero + "</strong></td>",
        "<td><strong>" + escapeFn(row.nombre) + "</strong></td>",
        "<td>",
        "  <div class=\"et-grade-cell\">",
        row.isEditingGrade
          ? "    <input type=\"number\" class=\"et-inline-grade\" value=\"" + row.nota + "\" min=\"0\" max=\"100\" />"
          : "    <span class=\"et-grade-val\">" + row.nota + "/100</span>",
        "    <button type=\"button\" class=\"et-pencil-btn et-edit-grade-btn\">",
        row.isEditingGrade ? this.ICONS.check : this.ICONS.pencil,
        "    </button>",
        "  </div>",
        "</td>",
        "<td>",
        "  <div class=\"et-sug-wrapper\">",
        answerSnippet,
        "    <div class=\"et-sug-toolbar\">",
        "      <select class=\"et-layer-select\">" + selectOptionsHtml + "</select>",
        "      <button type=\"button\" class=\"et-pencil-btn et-edit-sug-btn\">",
        row.isEditingSuggestion ? this.ICONS.check + " Listo" : this.ICONS.pencil + " Editar",
        "      </button>",
        "    </div>",
        row.isEditingSuggestion
          ? "    <textarea class=\"et-inline-ta\" rows=\"3\">" + escapeFn(currentText) + "</textarea>"
          : "    <div class=\"et-sug-line\">" + formattedText + "</div>",
        "    <div class=\"et-cert-mini\">",
        "      Certeza: <strong>" + row.certaintyLevel + " (" + row.certaintyScore + "%)</strong> — " + escapeFn(row.justificacion || ""),
        row.wasEdited ? "<span style=\"color:#e67e22; margin-left:6px; font-weight:600;\">• Editado</span>" : "",
        "    </div>",
        "  </div>",
        "</td>"
      ].join("\n");

      tr.querySelector(".et-row-check").addEventListener("change", (e) => {
        row.selected = e.target.checked;
      });

      tr.querySelector(".et-layer-select").addEventListener("change", (e) => {
        row.selectedLayer = e.target.value;
        this.renderTable();
      });

      const gradeInput = tr.querySelector(".et-inline-grade");
      if (gradeInput) {
        gradeInput.addEventListener("input", (e) => {
          row.nota = Number(e.target.value);
          row.wasEdited = true;
          if (window.ETeacherStorage) {
            window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
          }
        });
        gradeInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            row.isEditingGrade = false;
            this.renderTable();
          }
        });
      }

      tr.querySelector(".et-edit-grade-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        row.isEditingGrade = !row.isEditingGrade;
        this.renderTable();
      });

      const sugTextarea = tr.querySelector(".et-inline-ta");
      if (sugTextarea) {
        sugTextarea.addEventListener("input", (e) => {
          row.layers[row.selectedLayer] = e.target.value;
          row.wasEdited = true;
          if (window.ETeacherStorage) {
            window.ETeacherStorage.saveExerciseRows(this.activeExercise, this.rowsData);
          }
        });
      }

      tr.querySelector(".et-edit-sug-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        row.isEditingSuggestion = !row.isEditingSuggestion;
        this.renderTable();
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