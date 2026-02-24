(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const MODAL_ID = "modelImportModal";
  const FILE_ID = "modelImportFile";
  const SUMMARY_ID = "modelImportSummary";
  const ERRORS_ID = "modelImportErrors";
  const CLOSE_ID = "modelImportModalClose";
  const CANCEL_ID = "modelImportModalCancel";
  const SAVE_ID = "modelImportModalSave";

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const resolveValidationApi = () => AppInit.ModelTransferValidation || null;

  const buildImportModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog client-import-modal model-transfer-modal" hidden aria-hidden="true" aria-busy="false">
      <div
        class="swbDialog__panel client-import-modal__panel model-transfer-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modelImportModalTitle"
        aria-describedby="modelImportModalHint"
      >
        <div class="swbDialog__header">
          <div id="modelImportModalTitle" class="swbDialog__title">Importer un modele</div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-import-modal__body swbDialog__msg model-transfer-modal__body">
          <p id="modelImportModalHint" class="client-import-modal__hint model-transfer-modal__hint">
            Selectionnez un fichier JSON exporte de modele.
          </p>
          <label class="client-import-modal__file model-transfer-modal__file">
            <span class="client-import-modal__label">Fichier</span>
            <input id="${FILE_ID}" type="file" accept=".json,application/json" />
          </label>
          <div id="${SUMMARY_ID}" class="client-import-modal__summary model-transfer-modal__summary" aria-live="polite"></div>
          <ul id="${ERRORS_ID}" class="client-import-modal__errors model-transfer-modal__errors" aria-live="polite"></ul>
        </div>
        <div class="swbDialog__actions client-import-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="${SAVE_ID}" type="button" class="swbDialog__ok" disabled>Importer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureImportModal = () => {
    if (typeof document === "undefined") return null;
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    const host = document.getElementById("app") || document.body;
    if (!host) return null;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildImportModalMarkup().trim();
    modal = wrapper.firstElementChild;
    if (!modal) return null;
    host.appendChild(modal);
    return modal;
  };

  const readFileText = async (file) => {
    if (!file) throw new Error("Fichier introuvable.");
    if (typeof file.text === "function") return await file.text();
    if (typeof FileReader === "undefined") throw new Error("Lecture de fichier indisponible.");
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(file, "utf-8");
    });
  };

  async function importModelFile(file) {
    if (!file) {
      return {
        ok: false,
        canceled: false,
        error: "Fichier introuvable."
      };
    }

    const validationApi = resolveValidationApi();
    if (!validationApi) {
      return {
        ok: false,
        canceled: false,
        error: "Validation des modeles indisponible."
      };
    }

    if (!w.electronAPI?.listModels || !w.electronAPI?.saveModel) {
      return {
        ok: false,
        canceled: false,
        error: "Import de modele indisponible."
      };
    }

    let text = "";
    try {
      text = await readFileText(file);
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Lecture du fichier impossible.")
      };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(String(text || "").replace(/^\uFEFF/, ""));
    } catch {
      return {
        ok: false,
        canceled: false,
        error: "Fichier JSON invalide."
      };
    }

    const parsedEnvelope = validationApi.parseModelImportEnvelope(parsed);
    if (!parsedEnvelope.ok) {
      return {
        ok: false,
        canceled: false,
        error: String(parsedEnvelope.error || "Fichier de modele invalide.")
      };
    }

    const importedModel = isPlainObject(parsedEnvelope.model) ? parsedEnvelope.model : {};
    const importedName = validationApi.sanitizeModelName(importedModel.name);
    const importedConfig = isPlainObject(importedModel.config) ? importedModel.config : {};
    if (!importedName) {
      return {
        ok: false,
        canceled: false,
        error: "Nom du modele manquant dans le fichier."
      };
    }

    let listRes = null;
    try {
      listRes = await w.electronAPI.listModels();
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Chargement des modeles impossible.")
      };
    }
    if (!listRes?.ok) {
      return {
        ok: false,
        canceled: false,
        error: String(listRes?.error || "Chargement des modeles impossible.")
      };
    }

    const existingModels = Array.isArray(listRes.models) ? listRes.models : [];
    const duplicateName = validationApi.findEquivalentModel(importedName, existingModels);
    if (duplicateName) {
      return {
        ok: false,
        canceled: false,
        duplicate: true,
        error: `Import refuse: un modele equivalent existe deja (${duplicateName}).`
      };
    }

    let saveRes = null;
    try {
      saveRes = await w.electronAPI.saveModel({
        name: importedName,
        config: importedConfig
      });
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Enregistrement du modele impossible.")
      };
    }
    if (!saveRes?.ok) {
      return {
        ok: false,
        canceled: false,
        error: String(saveRes?.error || "Enregistrement du modele impossible.")
      };
    }

    const savedName = validationApi.sanitizeModelName(saveRes?.name || importedName);
    if (typeof w.SEM?.refreshModelSelect === "function") {
      try {
        await w.SEM.refreshModelSelect(savedName, { force: true });
      } catch (err) {
        console.warn("model import refresh select failed", err);
      }
    }

    return {
      ok: true,
      canceled: false,
      name: savedName
    };
  }

  let importModalController = null;

  const createImportModalController = () => {
    if (importModalController) return importModalController;
    const modal = ensureImportModal();
    if (!modal) return null;

    const fileInput = modal.querySelector(`#${FILE_ID}`);
    const summaryEl = modal.querySelector(`#${SUMMARY_ID}`);
    const errorsEl = modal.querySelector(`#${ERRORS_ID}`);
    const closeBtn = modal.querySelector(`#${CLOSE_ID}`);
    const cancelBtn = modal.querySelector(`#${CANCEL_ID}`);
    const saveBtn = modal.querySelector(`#${SAVE_ID}`);

    const state = {
      file: null,
      busy: false,
      pendingPromise: null,
      resolvePending: null,
      restoreFocus: null
    };

    const setSummary = (value) => {
      if (!summaryEl) return;
      const text = String(value || "").trim();
      summaryEl.textContent = text;
      summaryEl.hidden = !text;
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

    const setBusy = (busy) => {
      state.busy = !!busy;
      if (state.busy) modal.setAttribute("aria-busy", "true");
      else modal.removeAttribute("aria-busy");
      if (fileInput) fileInput.disabled = state.busy;
      if (closeBtn) closeBtn.disabled = state.busy;
      if (cancelBtn) cancelBtn.disabled = state.busy;
      if (saveBtn) saveBtn.disabled = state.busy || !state.file;
    };

    const hideModal = () => {
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
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
      state.file = null;
      if (fileInput) fileInput.value = "";
      setSummary("");
      setErrors([]);
      setBusy(false);
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      closeModal({ ok: false, canceled: true });
    };

    const closeModal = (result = { ok: false, canceled: true }) => {
      if (state.busy) return;
      hideModal();
      document.removeEventListener("keydown", onKeydown, true);
      const focusTarget = state.restoreFocus;
      state.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
      finalizePending(result);
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
      fileInput?.focus?.();
      return state.pendingPromise;
    };

    const handleFileChange = () => {
      state.file = fileInput?.files?.[0] || null;
      setErrors([]);
      setSummary(state.file ? state.file.name : "");
      setBusy(false);
    };

    const handleSave = async () => {
      if (state.busy) return;
      if (!state.file) {
        setErrors(["Veuillez selectionner un fichier JSON a importer."]);
        setSummary("");
        return;
      }
      setErrors([]);
      setSummary(`Import en cours: ${state.file.name}`);
      setBusy(true);

      let result = null;
      try {
        result = await importModelFile(state.file);
      } catch (err) {
        result = {
          ok: false,
          canceled: false,
          error: String(err?.message || err || "Import du modele impossible.")
        };
      }

      if (result?.ok) {
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
      setErrors([String(result?.error || "Import du modele impossible.")]);
      setSummary(state.file?.name || "");
    };

    closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    cancelBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    saveBtn?.addEventListener("click", handleSave);
    fileInput?.addEventListener("change", handleFileChange);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) {
        evt.stopPropagation();
      }
    });

    importModalController = {
      open: openModal,
      close: closeModal
    };
    return importModalController;
  };

  async function openModelImportModal(trigger = null) {
    const controller = createImportModalController();
    if (!controller || typeof controller.open !== "function") {
      return {
        ok: false,
        canceled: false,
        error: "Fenetre d'import modele indisponible."
      };
    }
    return await controller.open(trigger);
  }

  AppInit.ModelTransferImport = {
    importModelFile,
    openModelImportModal
  };
})(window);
