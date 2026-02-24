(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const SEM = (w.SEM = w.SEM || {});
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';

  const MODEL_DOC_TYPE_ALL = "all";
  const MODEL_DOC_TYPE_PURCHASE = "fa";

  const normalizeDocType = (value, fallback = "") => {
    const raw = String(value || fallback || "").trim().toLowerCase();
    if (!raw) return fallback;
    const aliasMap = {
      factureachat: "fa",
      facture_achat: "fa",
      "facture-achat": "fa",
      "facture achat": "fa",
      "facture d'achat": "fa",
      "facture dachat": "fa",
      fact: "facture"
    };
    const normalized = aliasMap[raw] || raw;
    return normalized;
  };

  const normalizeDocTypeList = (value) => {
    const rawList = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];
    const out = [];
    rawList.forEach((entry) => {
      const normalized = normalizeDocType(entry, "");
      if (!normalized) return;
      if (!out.includes(normalized)) out.push(normalized);
    });
    return out;
  };

  const expandModelDocTypes = (value) => {
    const normalizedList = normalizeDocTypeList(value);
    if (normalizedList.length) return normalizedList;
    const single = normalizeDocType(value, "");
    if (single) return [single];
    return [];
  };

  const supportsPurchaseDocType = (docTypesValue) => {
    const docTypes = expandModelDocTypes(docTypesValue);
    if (!docTypes.length) return false;
    return docTypes.includes(MODEL_DOC_TYPE_ALL) || docTypes.includes(MODEL_DOC_TYPE_PURCHASE);
  };

  const cloneValue = (value, fallback = null) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  const collectModelEntries = () => {
    const options = [];
    const seen = new Set();

    if (typeof SEM?.getModelEntries === "function") {
      try {
        const entries = SEM.getModelEntries() || [];
        entries.forEach((entry = {}) => {
          const value = String(entry?.name || "").trim();
          if (!value) return;
          const key = value.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          options.push({
            value,
            label: value,
            docTypes: entry?.config?.docTypes !== undefined ? entry.config.docTypes : entry?.config?.docType,
            config: cloneValue(entry?.config, null)
          });
        });
      } catch (err) {
        console.warn("doc-history purchase model list failed", err);
      }
    }

    if (!options.length) {
      const selectEl = typeof getEl === "function" ? getEl("modelSelect") : null;
      if (selectEl?.options) {
        Array.from(selectEl.options).forEach((opt) => {
          const value = String(opt.value || "").trim();
          if (!value) return;
          const key = value.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          options.push({
            value,
            label: String(opt.textContent || opt.label || value).trim() || value,
            docTypes: opt.dataset?.modelDocTypes || opt.dataset?.modelDocType || "",
            config: null
          });
        });
      }
    }

    return options;
  };

  const collectPurchaseModelOptions = () => {
    const all = collectModelEntries();
    if (!all.length) return [];
    const purchaseOnly = all.filter((entry) => supportsPurchaseDocType(entry.docTypes));
    return purchaseOnly.length ? purchaseOnly : all;
  };

  const resolveModelConfigByName = async (modelName, fallbackConfig = null) => {
    const normalized = String(modelName || "").trim();
    if (!normalized) return null;
    if (fallbackConfig && typeof fallbackConfig === "object") {
      return cloneValue(fallbackConfig, fallbackConfig);
    }

    if (typeof SEM?.getModelEntries === "function") {
      try {
        const entries = SEM.getModelEntries() || [];
        const found = entries.find(
          (entry) => String(entry?.name || "").trim().toLowerCase() === normalized.toLowerCase()
        );
        const cfg = found?.config;
        if (cfg && typeof cfg === "object") return cloneValue(cfg, cfg);
      } catch (err) {
        console.warn("doc-history purchase model resolve runtime failed", err);
      }
    }

    if (w.electronAPI?.loadModel) {
      try {
        const res = await w.electronAPI.loadModel({ name: normalized });
        const cfg = res?.model?.config;
        if (res?.ok && cfg && typeof cfg === "object") return cloneValue(cfg, cfg);
      } catch (err) {
        console.warn("doc-history purchase model resolve db failed", err);
      }
    }

    return null;
  };

  async function promptPurchaseModelChoice(options = {}) {
    const modelOptions = collectPurchaseModelOptions();
    if (!modelOptions.length) return null;

    if (typeof w.showConfirm === "function") {
      const safeInitialIndex = (() => {
        const raw = Number(options.initialChoice);
        if (!Number.isFinite(raw)) return 0;
        const normalized = Math.trunc(raw);
        if (normalized < 0 || normalized >= modelOptions.length) return 0;
        return normalized;
      })();
      let selectedIndex = safeInitialIndex;
      let detachGlobalPickerHandlers = () => {};
      const confirmed = await w.showConfirm("", {
        title: options.title || "Facture d'achat",
        okText: options.confirmText || "Valider",
        cancelText: options.cancelText || "Annuler",
        renderMessage: (container) => {
          if (!container) return;
          container.innerHTML = "";
          container.style.maxHeight = "none";
          container.style.overflow = "visible";
          const doc = container.ownerDocument || document;
          const wrapper = doc.createElement("div");
          wrapper.className = "doc-history-convert-form";

          const note = doc.createElement("p");
          note.className = "doc-dialog-question";
          note.textContent =
            options.message ||
            "Selectionnez le modele de facture d'achat a utiliser pour le fichier d'export.";

          const modelGroup = doc.createElement("div");
          modelGroup.className = "doc-history-convert__field";
          const modelLabel = doc.createElement("label");
          modelLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
          modelLabel.id = "docHistoryPurchaseModelLabel";
          modelLabel.textContent = options.choiceLabel || "Modele";

          const modelField = doc.createElement("div");
          modelField.className = "doc-dialog-model-picker__field";

          const modelMenu = doc.createElement("details");
          modelMenu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
          modelMenu.dataset.wired = "1";
          const modelSummary = doc.createElement("summary");
          modelSummary.className = "btn success field-toggle-trigger";
          modelSummary.setAttribute("role", "button");
          modelSummary.setAttribute("aria-haspopup", "listbox");
          modelSummary.setAttribute("aria-expanded", "false");
          modelSummary.setAttribute(
            "aria-labelledby",
            "docHistoryPurchaseModelLabel docHistoryPurchaseModelDisplay"
          );
          const modelDisplay = doc.createElement("span");
          modelDisplay.id = "docHistoryPurchaseModelDisplay";
          modelDisplay.className = "model-select-display";
          modelSummary.appendChild(modelDisplay);
          modelSummary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
          modelMenu.appendChild(modelSummary);

          const modelPanel = doc.createElement("div");
          modelPanel.id = "docHistoryPurchaseModelPanel";
          modelPanel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
          modelPanel.setAttribute("role", "listbox");
          modelPanel.setAttribute("aria-labelledby", "docHistoryPurchaseModelLabel");
          modelMenu.appendChild(modelPanel);

          const modelSelect = doc.createElement("select");
          modelSelect.id = "docHistoryPurchaseModelSelect";
          modelSelect.className = "model-select doc-dialog-model-select";
          modelSelect.setAttribute("aria-hidden", "true");
          modelSelect.tabIndex = -1;
          modelLabel.htmlFor = modelSelect.id;
          const byValue = new Map();

          const setSelectionByIndex = (index, { closeMenu = true } = {}) => {
            const target = modelOptions[index] || modelOptions[0];
            if (!target) return;
            const nextValue = String(target.value || "");
            const nextLabel = String(target.label || target.value || "").trim() || nextValue;
            selectedIndex = index >= 0 ? index : 0;
            modelSelect.value = nextValue;
            modelDisplay.textContent = nextLabel;
            modelPanel.querySelectorAll(".model-select-option").forEach((btn) => {
              const isActive = btn.dataset.value === nextValue;
              btn.classList.toggle("is-active", isActive);
              btn.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            if (closeMenu) {
              modelMenu.open = false;
              modelSummary.setAttribute("aria-expanded", "false");
            }
          };

          modelOptions.forEach((entry, index) => {
            const value = String(entry.value || "").trim();
            if (!value) return;
            const label = String(entry.label || value).trim() || value;
            byValue.set(value, index);

            const btn = doc.createElement("button");
            btn.type = "button";
            btn.className = "model-select-option";
            btn.dataset.value = value;
            btn.dataset.index = String(index);
            btn.setAttribute("role", "option");
            btn.setAttribute("aria-selected", "false");
            btn.textContent = label;
            modelPanel.appendChild(btn);

            const opt = doc.createElement("option");
            opt.value = value;
            opt.textContent = label;
            modelSelect.appendChild(opt);
          });

          modelPanel.addEventListener("click", (evt) => {
            const btn = evt.target.closest(".model-select-option");
            if (!btn || btn.disabled) return;
            const index = Number(btn.dataset.index);
            if (!Number.isFinite(index)) return;
            setSelectionByIndex(index);
          });

          modelSelect.addEventListener("change", () => {
            const value = String(modelSelect.value || "");
            const index = byValue.get(value);
            if (!Number.isFinite(index)) return;
            setSelectionByIndex(index, { closeMenu: false });
          });

          modelSummary.addEventListener("click", (evt) => {
            evt.preventDefault();
            modelMenu.open = !modelMenu.open;
            modelSummary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
            if (!modelMenu.open) modelSummary.focus();
          });

          modelMenu.addEventListener("keydown", (evt) => {
            if (evt.key !== "Escape") return;
            evt.preventDefault();
            evt.stopPropagation();
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            modelSummary.focus();
          });

          const onDocumentClick = (evt) => {
            if (!modelMenu.open) return;
            if (modelMenu.contains(evt.target)) return;
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
          };
          doc.addEventListener("click", onDocumentClick, true);
          detachGlobalPickerHandlers = () => {
            doc.removeEventListener("click", onDocumentClick, true);
          };

          setSelectionByIndex(safeInitialIndex, { closeMenu: false });

          modelField.append(modelMenu, modelSelect);
          modelGroup.append(modelLabel, modelField);
          wrapper.appendChild(modelGroup);
          container.append(note, wrapper);
        }
      });
      try {
        if (!confirmed) return null;
        return modelOptions[selectedIndex] || null;
      } finally {
        try {
          detachGlobalPickerHandlers();
        } catch {}
      }
    }

    if (typeof w.showOptionsDialog !== "function") {
      return modelOptions[0];
    }

    const selectedIndex = await w.showOptionsDialog({
      title: options.title || "Facture d'achat",
      message:
        options.message ||
        "Selectionnez le modele de facture d'achat a utiliser pour le fichier d'export.",
      choiceLayout: "model-picker",
      choiceLabel: options.choiceLabel || "Modele",
      choicePlaceholder: options.choicePlaceholder || "Selectionner un modele",
      options: modelOptions.map((option) => ({
        label: option.label,
        value: option.value
      })),
      confirmChoice: true,
      confirmText: options.confirmText || "Valider",
      initialChoice: 0
    });

    if (!Number.isFinite(selectedIndex) || selectedIndex < 0) return null;
    return modelOptions[selectedIndex] || null;
  }

  AppInit.DocHistoryPurchaseModelChoice = {
    collectPurchaseModelOptions,
    promptPurchaseModelChoice,
    resolveModelConfigByName
  };
})(window);
