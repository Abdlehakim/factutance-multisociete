(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const MODAL_ID = "modelExportModal";
  const CLOSE_ID = "modelExportModalClose";
  const CANCEL_ID = "modelExportModalCancel";
  const SAVE_ID = "modelExportModalSave";
  const EXPORT_DIR_BUTTON_ID = "modelExportOpenFolderBtn";
  const ERRORS_ID = "modelExportErrors";
  const OPEN_LOCATION_ID = "modelExportOpenLocation";
  const MODEL_LABEL_ID = "modelExportModelLabel";
  const MODEL_MENU_ID = "modelExportModelMenu";
  const MODEL_SUMMARY_ID = "modelExportModelSummary";
  const MODEL_DISPLAY_ID = "modelExportModelDisplay";
  const MODEL_PANEL_ID = "modelExportModelPanel";
  const MODEL_SELECT_ID = "modelExportModelSelect";
  const OPEN_EXPORT_DIR_LABEL = "Ouvrir le dossier d'export des modeles";
  const PICKER_PLACEHOLDER = "Selectionner un modele";
  const PICKER_EMPTY_TEXT = "Aucun modele disponible";
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';
  const FOLDER_ICON_SVG =
    '<svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true"><path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path></svg>';

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const canonicalize = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => canonicalize(entry));
    }
    if (isPlainObject(value)) {
      const out = {};
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
          out[key] = canonicalize(value[key]);
        });
      return out;
    }
    return value;
  };

  const stringifyCanonicalJson = (value) =>
    `${JSON.stringify(canonicalize(value), null, 2)}\n`;

  const resolveValidationApi = () => AppInit.ModelTransferValidation || null;

  const buildExportModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog client-export-modal model-transfer-modal" hidden aria-hidden="true" aria-busy="false">
      <div
        class="swbDialog__panel client-export-modal__panel model-transfer-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modelExportModalTitle"
        aria-describedby="modelExportModalHint"
      >
        <div class="swbDialog__header">
          <div id="modelExportModalTitle" class="swbDialog__title">Exporter un modele</div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-export-modal__body swbDialog__msg model-transfer-modal__body">
          <p id="modelExportModalHint" class="client-export-modal__hint model-transfer-modal__hint">
            Selectionnez le modele a exporter.
          </p>
          <div class="doc-dialog-model-picker model-transfer-modal__picker">
            <label class="doc-dialog-model-picker__label" id="${MODEL_LABEL_ID}" for="${MODEL_SELECT_ID}">
              Modele
            </label>
            <div class="doc-dialog-model-picker__field">
              <details id="${MODEL_MENU_ID}" class="field-toggle-menu model-select-menu doc-dialog-model-menu model-transfer-modal__menu" data-wired="1">
                <summary id="${MODEL_SUMMARY_ID}" class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${MODEL_LABEL_ID} ${MODEL_DISPLAY_ID}">
                  <span id="${MODEL_DISPLAY_ID}" class="model-select-display">${PICKER_PLACEHOLDER}</span>
                  ${CHEVRON_SVG}
                </summary>
                <div id="${MODEL_PANEL_ID}" class="field-toggle-panel model-select-panel doc-history-model-panel model-transfer-modal__panel-list" role="listbox" aria-labelledby="${MODEL_LABEL_ID}">
                </div>
              </details>
              <select id="${MODEL_SELECT_ID}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1"></select>
            </div>
          </div>
          <label class="client-export-modal__checkbox model-transfer-modal__open-location">
            <input id="${OPEN_LOCATION_ID}" type="checkbox" />
            <span>Ouvrir l'emplacement apres export</span>
          </label>
          <div class="model-transfer-modal__open-folder-row">
            <span class="model-transfer-modal__open-folder-label">Emplacement de fichier exporte</span>
            <button
              id="${EXPORT_DIR_BUTTON_ID}"
              type="button"
              class="client-search__edit doc-history__open-folder model-transfer-modal__open-folder-btn"
              title="${OPEN_EXPORT_DIR_LABEL}"
              aria-label="${OPEN_EXPORT_DIR_LABEL}"
            >
              <span class="doc-history__folder-icon" aria-hidden="true">${FOLDER_ICON_SVG}</span>
            </button>
          </div>
          <ul id="${ERRORS_ID}" class="client-import-modal__errors model-transfer-modal__errors" aria-live="polite"></ul>
        </div>
        <div class="swbDialog__actions client-export-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="${SAVE_ID}" type="button" class="swbDialog__ok" disabled>Exporter</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureExportModal = () => {
    if (typeof document === "undefined") return null;
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    const host = document.getElementById("app") || document.body;
    if (!host) return null;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildExportModalMarkup().trim();
    modal = wrapper.firstElementChild;
    if (!modal) return null;
    host.appendChild(modal);
    return modal;
  };

  async function exportModelByName(rawModelName) {
    const validationApi = resolveValidationApi();
    if (!validationApi) {
      return {
        ok: false,
        canceled: false,
        error: "Validation des modeles indisponible."
      };
    }
    if (!w.electronAPI?.loadModel || !w.electronAPI?.exportModelsFile) {
      return {
        ok: false,
        canceled: false,
        error: "Export de modele indisponible."
      };
    }

    const modelName = validationApi.sanitizeModelName(rawModelName);
    if (!modelName) {
      return {
        ok: false,
        canceled: false,
        error: "Nom de modele requis."
      };
    }

    let loadRes = null;
    try {
      loadRes = await w.electronAPI.loadModel({ name: modelName });
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Chargement du modele impossible.")
      };
    }

    if (!loadRes?.ok) {
      return {
        ok: false,
        canceled: !!loadRes?.canceled,
        error: String(loadRes?.error || "Modele introuvable.")
      };
    }

    const safeName = validationApi.sanitizeModelName(loadRes?.name || modelName);
    const safeConfig = isPlainObject(loadRes?.config) ? loadRes.config : {};
    const envelope = validationApi.buildModelExportEnvelope({
      name: safeName,
      config: safeConfig
    });
    if (!envelope) {
      return {
        ok: false,
        canceled: false,
        error: "Donnees de modele invalides."
      };
    }

    const serialized = stringifyCanonicalJson(envelope);
    const fileName = `modele_${validationApi.sanitizeFilenameToken(safeName, "modele")}.json`;

    let saveRes = null;
    try {
      saveRes = await w.electronAPI.exportModelsFile({
        fileName,
        data: serialized
      });
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Export du modele impossible.")
      };
    }

    if (!saveRes || saveRes.canceled) return { ok: false, canceled: true };
    if (saveRes.ok === false) {
      return {
        ok: false,
        canceled: false,
        error: String(saveRes.error || "Export du modele impossible.")
      };
    }

    return {
      ok: true,
      canceled: false,
      name: safeName,
      filePath: String(saveRes.path || "").trim(),
      exportedFileName: String(saveRes.name || fileName).trim()
    };
  }

  async function openModelExportDirectory() {
    if (w.electronAPI?.openModelExportDir) {
      const res = await w.electronAPI.openModelExportDir();
      if (res?.ok) return { ok: true, path: String(res.path || "").trim() };
      return {
        ok: false,
        error: String(res?.error || "Ouverture du dossier d'export impossible.")
      };
    }
    return {
      ok: false,
      error: "Ouverture du dossier d'export indisponible."
    };
  }

  let exportModalController = null;

  const createExportModalController = () => {
    if (exportModalController) return exportModalController;
    const modal = ensureExportModal();
    if (!modal) return null;

    const closeBtn = modal.querySelector(`#${CLOSE_ID}`);
    const cancelBtn = modal.querySelector(`#${CANCEL_ID}`);
    const saveBtn = modal.querySelector(`#${SAVE_ID}`);
    const openFolderBtn = modal.querySelector(`#${EXPORT_DIR_BUTTON_ID}`);
    const errorsEl = modal.querySelector(`#${ERRORS_ID}`);
    const openLocationInput = modal.querySelector(`#${OPEN_LOCATION_ID}`);
    const modelMenu = modal.querySelector(`#${MODEL_MENU_ID}`);
    const modelSummary = modal.querySelector(`#${MODEL_SUMMARY_ID}`);
    const modelDisplay = modal.querySelector(`#${MODEL_DISPLAY_ID}`);
    const modelPanel = modal.querySelector(`#${MODEL_PANEL_ID}`);
    const modelSelect = modal.querySelector(`#${MODEL_SELECT_ID}`);

    const state = {
      selectedName: "",
      models: [],
      busy: false,
      pendingPromise: null,
      resolvePending: null,
      restoreFocus: null
    };

    const closePicker = ({ restoreFocus = false } = {}) => {
      if (!modelMenu) return;
      modelMenu.open = false;
      modelSummary?.setAttribute("aria-expanded", "false");
      if (restoreFocus) modelSummary?.focus?.();
    };

    const setErrors = (errors = []) => {
      if (!errorsEl) return;
      errorsEl.innerHTML = "";
      const list = Array.isArray(errors) ? errors : [errors];
      const normalized = list
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      if (!normalized.length) {
        errorsEl.hidden = true;
        return;
      }
      normalized.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        errorsEl.appendChild(li);
      });
      errorsEl.hidden = false;
    };

    const syncSaveButton = () => {
      if (!saveBtn) return;
      const hasSelection = !!state.selectedName;
      saveBtn.disabled = state.busy || !hasSelection;
    };

    const setPickerEnabled = (enabled) => {
      const canUse = !!enabled;
      if (modelMenu) modelMenu.dataset.disabled = canUse ? "false" : "true";
      if (modelSummary) {
        modelSummary.setAttribute("aria-disabled", canUse ? "false" : "true");
        modelSummary.tabIndex = canUse ? 0 : -1;
      }
      if (modelSelect) {
        modelSelect.disabled = !canUse;
        modelSelect.setAttribute("aria-disabled", canUse ? "false" : "true");
      }
      if (!canUse) closePicker();
    };

    const setBusy = (busy) => {
      state.busy = !!busy;
      if (state.busy) modal.setAttribute("aria-busy", "true");
      else modal.removeAttribute("aria-busy");
      if (closeBtn) closeBtn.disabled = state.busy;
      if (cancelBtn) cancelBtn.disabled = state.busy;
      if (openFolderBtn) openFolderBtn.disabled = state.busy;
      if (openLocationInput) openLocationInput.disabled = state.busy;
      syncSaveButton();
    };

    const setSelectionByName = (rawName, { closeMenu = true } = {}) => {
      const validationApi = resolveValidationApi();
      const normalized = validationApi?.sanitizeModelName(rawName) || "";
      const found = state.models.find((entry) => entry.name === normalized) || null;
      state.selectedName = found ? found.name : "";

      if (modelSelect) modelSelect.value = state.selectedName;
      if (modelDisplay) {
        modelDisplay.textContent = state.selectedName || PICKER_PLACEHOLDER;
      }
      modelPanel?.querySelectorAll(".model-select-option").forEach((btn) => {
        const active = btn.dataset.value === state.selectedName;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      if (closeMenu) closePicker();
      syncSaveButton();
    };

    const renderModelOptions = (list = []) => {
      state.models = Array.isArray(list) ? list : [];
      if (modelPanel) modelPanel.innerHTML = "";
      if (modelSelect) modelSelect.innerHTML = '<option value="">Selectionner un modele</option>';

      if (!state.models.length) {
        setPickerEnabled(false);
        state.selectedName = "";
        if (modelDisplay) modelDisplay.textContent = PICKER_EMPTY_TEXT;
        if (modelPanel) {
          const emptyEl = document.createElement("div");
          emptyEl.className = "model-select-empty model-transfer-modal__empty";
          emptyEl.textContent = PICKER_EMPTY_TEXT;
          modelPanel.appendChild(emptyEl);
        }
        syncSaveButton();
        return;
      }

      state.models.forEach((entry, index) => {
        if (modelPanel) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-select-option";
          btn.dataset.value = entry.name;
          btn.dataset.index = String(index);
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", "false");
          btn.textContent = entry.name;
          modelPanel.appendChild(btn);
        }

        if (modelSelect) {
          const option = document.createElement("option");
          option.value = entry.name;
          option.textContent = entry.name;
          modelSelect.appendChild(option);
        }
      });

      setPickerEnabled(true);
      setSelectionByName(state.models[0].name, { closeMenu: false });
    };

    const hideModal = () => {
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
      closePicker();
    };

    const showModal = () => {
      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
    };

    const finalizePending = (result) => {
      if (typeof state.resolvePending === "function") {
        state.resolvePending(result);
      }
      state.resolvePending = null;
      state.pendingPromise = null;
    };

    const resetState = () => {
      state.selectedName = "";
      state.models = [];
      setErrors([]);
      if (openLocationInput) openLocationInput.checked = false;
      renderModelOptions([]);
      setBusy(false);
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      if (modelMenu?.open) {
        closePicker({ restoreFocus: true });
        return;
      }
      closeModal({ ok: false, canceled: true });
    };

    const onDocumentClick = (evt) => {
      if (!modelMenu?.open) return;
      if (modelMenu.contains(evt.target)) return;
      closePicker();
    };

    const closeModal = (result = { ok: false, canceled: true }) => {
      if (state.busy) return;
      hideModal();
      document.removeEventListener("keydown", onKeydown, true);
      document.removeEventListener("click", onDocumentClick, true);
      const focusTarget = state.restoreFocus;
      state.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
      finalizePending(result);
    };

    const loadModels = async () => {
      const validationApi = resolveValidationApi();
      if (!validationApi || !w.electronAPI?.listModels) {
        renderModelOptions([]);
        setBusy(false);
        setErrors(["Chargement des modeles indisponible."]);
        return;
      }

      let res = null;
      try {
        res = await w.electronAPI.listModels();
      } catch (err) {
        renderModelOptions([]);
        setBusy(false);
        setErrors([String(err?.message || err || "Chargement des modeles impossible.")]);
        return;
      }

      if (!res?.ok) {
        renderModelOptions([]);
        setBusy(false);
        setErrors([String(res?.error || "Chargement des modeles impossible.")]);
        return;
      }

      const uniqueByComparable = new Set();
      const list = (Array.isArray(res.models) ? res.models : [])
        .map((entry) => ({ name: validationApi.sanitizeModelName(entry?.name) }))
        .filter((entry) => !!entry.name)
        .filter((entry) => {
          const comparable = validationApi.normalizeComparableModelName(entry.name);
          if (!comparable || uniqueByComparable.has(comparable)) return false;
          uniqueByComparable.add(comparable);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

      renderModelOptions(list);
      setBusy(false);
      if (list.length) {
        setErrors([]);
      } else {
        setErrors(["Aucun modele enregistre a exporter."]);
      }
    };

    const openModal = (trigger = null) => {
      if (state.pendingPromise) {
        return state.pendingPromise;
      }
      state.pendingPromise = new Promise((resolve) => {
        state.resolvePending = resolve;
      });
      state.restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

      resetState();
      showModal();
      document.addEventListener("keydown", onKeydown, true);
      document.addEventListener("click", onDocumentClick, true);
      setBusy(true);
      void loadModels().finally(() => {
        if (state.busy) setBusy(false);
        const nextFocus = state.models.length ? modelSummary : cancelBtn;
        nextFocus?.focus?.();
      });
      return state.pendingPromise;
    };

    const handleSave = async () => {
      if (state.busy) return;
      if (!state.selectedName) {
        setErrors(["Veuillez selectionner un modele a exporter."]);
        return;
      }
      const openLocation = !!openLocationInput?.checked;

      setErrors([]);
      setBusy(true);

      let result = null;
      try {
        result = await exportModelByName(state.selectedName);
      } catch (err) {
        result = {
          ok: false,
          canceled: false,
          error: String(err?.message || err || "Export du modele impossible.")
        };
      }

      if (result?.ok) {
        if (openLocation && result?.filePath && (w.electronAPI?.showInFolder || w.electronAPI?.openPath)) {
          try {
            if (w.electronAPI?.showInFolder) {
              await w.electronAPI.showInFolder(result.filePath);
            } else {
              await w.electronAPI.openPath(result.filePath);
            }
          } catch {}
        }
        setBusy(false);
        closeModal(result);
        return;
      }
      if (result?.canceled) {
        setBusy(false);
        closeModal({ ok: false, canceled: true });
        return;
      }

      setBusy(false);
      setErrors([String(result?.error || "Export du modele impossible.")]);
    };

    closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    cancelBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    openFolderBtn?.addEventListener("click", async () => {
      if (state.busy) return;
      const res = await openModelExportDirectory();
      if (res?.ok) return;
      await w.showDialog?.(
        String(res?.error || "Ouverture du dossier d'export impossible."),
        { title: "Export modele" }
      );
    });
    saveBtn?.addEventListener("click", handleSave);

    modelPanel?.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".model-select-option");
      if (!btn || btn.disabled) return;
      setSelectionByName(btn.dataset.value || "");
    });

    modelSelect?.addEventListener("change", () => {
      setSelectionByName(modelSelect.value || "", { closeMenu: false });
    });

    modelSummary?.addEventListener("click", (evt) => {
      if (modelSummary.getAttribute("aria-disabled") === "true") {
        evt.preventDefault();
        return;
      }
      evt.preventDefault();
      modelMenu.open = !modelMenu.open;
      modelSummary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
      if (!modelMenu.open) modelSummary.focus();
    });

    modelMenu?.addEventListener("keydown", (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      evt.stopPropagation();
      closePicker({ restoreFocus: true });
    });

    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) {
        evt.stopPropagation();
      }
    });

    exportModalController = {
      open: openModal,
      close: closeModal
    };
    return exportModalController;
  };

  async function openModelExportModal(trigger = null) {
    const controller = createExportModalController();
    if (!controller || typeof controller.open !== "function") {
      return {
        ok: false,
        canceled: false,
        error: "Fenetre d'export modele indisponible."
      };
    }
    return await controller.open(trigger);
  }

  AppInit.ModelTransferExport = {
    exportModelByName,
    openModelExportModal
  };
})(window);
