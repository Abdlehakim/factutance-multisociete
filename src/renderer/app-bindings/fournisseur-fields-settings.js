(function (w) {
  const API =
    w.electronAPI ||
    (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) ||
    null;
  const SEM = w.SEM || {};
  const state = () => SEM.state || {};

  const FOURNISSEUR_FIELDS_TRIGGER_SELECTOR = "#fournisseurFieldsSettingsBtn";
  const FOURNISSEUR_FIELDS_MODAL_SELECTOR = ".fournisseur-fields-modal";
  const FOURNISSEUR_FIELDS_MODAL_SCOPE_SELECTOR = "#fournisseurFieldsSettingsModal";
  const FOURNISSEUR_SETTINGS_KEY = "fournisseur";

  const FOURNISSEUR_FIELD_DEFAULT_VISIBILITY = {
    type: true,
    name: true,
    taxId: true,
    phone: true,
    email: true,
    address: true
  };
  const FOURNISSEUR_FIELD_DEFAULT_LABELS = {
    type: "Type de fournisseur",
    name: "Nom du fournisseur",
    taxId: "Matricule fiscal",
    phone: "Telephone du fournisseur",
    email: "E-mail du fournisseur",
    address: "Adresse du fournisseur"
  };
  const FOURNISSEUR_FIELD_KEYS = Object.keys(FOURNISSEUR_FIELD_DEFAULT_VISIBILITY);

  const normalizeVisibility = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = { ...FOURNISSEUR_FIELD_DEFAULT_VISIBILITY };
    FOURNISSEUR_FIELD_KEYS.forEach((key) => {
      if (!(key in source)) return;
      next[key] = source[key] !== false;
    });
    return next;
  };

  const normalizeLabels = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = { ...FOURNISSEUR_FIELD_DEFAULT_LABELS };
    FOURNISSEUR_FIELD_KEYS.forEach((key) => {
      if (typeof source[key] !== "string") return;
      const trimmed = source[key].trim();
      if (trimmed) next[key] = trimmed;
    });
    return next;
  };

  const getLabel = (key, labels) =>
    (labels && typeof labels[key] === "string" && labels[key].trim()) ||
    FOURNISSEUR_FIELD_DEFAULT_LABELS[key] ||
    "";

  let fournisseurFieldVisibility = normalizeVisibility();
  let fournisseurFieldVisibilityDraft = { ...fournisseurFieldVisibility };
  let fournisseurFieldLabels = normalizeLabels();
  let fournisseurFieldLabelsDraft = { ...fournisseurFieldLabels };

  const modalRestoreFocus = new WeakMap();

  const syncFournisseurSettingsToState = (
    visibility = fournisseurFieldVisibility,
    labels = fournisseurFieldLabels
  ) => {
    const st = state();
    if (!st || typeof st !== "object") return;
    st.fournisseurFieldVisibility = { ...visibility };
    st.fournisseurFieldLabels = { ...labels };
  };

  const applyFournisseurFieldVisibility = (scope = document, visibility = fournisseurFieldVisibility) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    const groupedRows = new Set();

    scope.querySelectorAll("[data-fournisseur-field]").forEach((node) => {
      const key = node.dataset.fournisseurField;
      if (!key) return;
      const isVisible = visibility[key] !== false;
      node.hidden = !isVisible;
      node.style.display = isVisible ? "" : "none";
      node.classList.toggle("is-hidden", !isVisible);
      const row = node.closest("[data-fournisseur-field-group]");
      if (row) groupedRows.add(row);
    });

    groupedRows.forEach((row) => {
      const fields = Array.from(row.querySelectorAll("[data-fournisseur-field]"));
      const visibleCount = fields.filter((field) => !field.hidden).length;
      const hasVisible = visibleCount > 0;
      row.hidden = !hasVisible;
      row.style.display = hasVisible ? "" : "none";
      if (!hasVisible) {
        row.style.gridTemplateColumns = "";
        return;
      }
      const maxColumns = Number.parseInt(row.dataset.gridColumns || "", 10);
      const columnLimit = Number.isFinite(maxColumns) && maxColumns > 0 ? maxColumns : 2;
      const columns = Math.max(1, Math.min(visibleCount, columnLimit));
      row.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    });
  };

  const applyFournisseurFieldLabels = (scope = document, labels = fournisseurFieldLabels) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope.querySelectorAll("[data-fournisseur-field-label]").forEach((node) => {
      const key = node.dataset.fournisseurFieldLabel;
      if (!key) return;
      const isDefaultLabel =
        node.classList?.contains("fournisseur-field-label-default") &&
        node.closest(FOURNISSEUR_FIELDS_MODAL_SELECTOR);
      if (isDefaultLabel) {
        const defaultLabel = FOURNISSEUR_FIELD_DEFAULT_LABELS[key];
        if (defaultLabel) node.textContent = defaultLabel;
        return;
      }
      const nextLabel = getLabel(key, labels);
      if (nextLabel) node.textContent = nextLabel;
    });
  };

  const syncFournisseurToggleStates = (
    scope = document,
    visibility = fournisseurFieldVisibility
  ) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope
      .querySelectorAll("input[data-fournisseur-field-key]")
      .forEach((input) => {
        const key = input.dataset.fournisseurFieldKey;
        if (!key) return;
        input.checked = visibility[key] !== false;
      });
  };

  const syncFournisseurLabelInputs = (scope = document, labels = fournisseurFieldLabels) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope
      .querySelectorAll("input[data-fournisseur-field-label-input]")
      .forEach((input) => {
        const key = input.dataset.fournisseurFieldLabelInput;
        if (!key) return;
        input.value = getLabel(key, labels);
      });
  };

  const loadFournisseurSettingsEnvelope = async () => {
    if (typeof API?.loadClientFieldSettings !== "function") return {};
    const res = await API.loadClientFieldSettings();
    if (!res?.ok || !res.settings || typeof res.settings !== "object") return {};
    return res.settings;
  };

  const loadFournisseurFieldSettings = async () => {
    const envelope = await loadFournisseurSettingsEnvelope();
    const settings =
      envelope[FOURNISSEUR_SETTINGS_KEY] &&
      typeof envelope[FOURNISSEUR_SETTINGS_KEY] === "object"
        ? envelope[FOURNISSEUR_SETTINGS_KEY]
        : {};
    return {
      visibility: normalizeVisibility(settings.visibility),
      labels: normalizeLabels(settings.labels)
    };
  };

  const saveFournisseurFieldSettings = async (settings = {}) => {
    if (typeof API?.saveClientFieldSettings !== "function") return;
    const envelope = await loadFournisseurSettingsEnvelope();
    const nextEnvelope = {
      ...envelope,
      [FOURNISSEUR_SETTINGS_KEY]: {
        visibility: normalizeVisibility(settings.visibility),
        labels: normalizeLabels(settings.labels)
      }
    };
    await API.saveClientFieldSettings({ settings: nextEnvelope });
  };

  const updateFournisseurVisibilityDraft = (patch = {}) => {
    fournisseurFieldVisibilityDraft = normalizeVisibility({
      ...fournisseurFieldVisibilityDraft,
      ...(patch && typeof patch === "object" ? patch : {})
    });
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibilityDraft);
    syncFournisseurToggleStates(document, fournisseurFieldVisibilityDraft);
  };

  const updateFournisseurLabelsDraft = (patch = {}) => {
    fournisseurFieldLabelsDraft = normalizeLabels({
      ...fournisseurFieldLabelsDraft,
      ...(patch && typeof patch === "object" ? patch : {})
    });
    applyFournisseurFieldLabels(document, fournisseurFieldLabelsDraft);
    syncFournisseurLabelInputs(document, fournisseurFieldLabelsDraft);
  };

  const commitFournisseurDraft = async () => {
    fournisseurFieldVisibility = normalizeVisibility(fournisseurFieldVisibilityDraft);
    fournisseurFieldLabels = normalizeLabels(fournisseurFieldLabelsDraft);
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibility);
    applyFournisseurFieldLabels(document, fournisseurFieldLabels);
    syncFournisseurToggleStates(document, fournisseurFieldVisibility);
    syncFournisseurLabelInputs(document, fournisseurFieldLabels);
    syncFournisseurSettingsToState(fournisseurFieldVisibility, fournisseurFieldLabels);
    await saveFournisseurFieldSettings({
      visibility: fournisseurFieldVisibility,
      labels: fournisseurFieldLabels
    });
  };

  const closeFournisseurFieldsModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    fournisseurFieldVisibilityDraft = { ...fournisseurFieldVisibility };
    fournisseurFieldLabelsDraft = { ...fournisseurFieldLabels };
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibility);
    applyFournisseurFieldLabels(document, fournisseurFieldLabels);
    syncFournisseurToggleStates(document, fournisseurFieldVisibility);
    syncFournisseurLabelInputs(document, fournisseurFieldLabels);

    const restoreEl = modalRestoreFocus.get(modal);
    if (restoreEl && typeof restoreEl.focus === "function") {
      try {
        restoreEl.focus();
      } catch {}
    }
    if (!document.querySelector(`${FOURNISSEUR_FIELDS_MODAL_SELECTOR}.is-open`)) {
      document.removeEventListener("keydown", onFournisseurFieldsModalKeyDown);
    }
  };

  const openFournisseurFieldsModal = (modal, trigger) => {
    if (!modal) return;
    modalRestoreFocus.set(
      modal,
      trigger && trigger.focus
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    );
    fournisseurFieldVisibilityDraft = { ...fournisseurFieldVisibility };
    fournisseurFieldLabelsDraft = { ...fournisseurFieldLabels };
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibilityDraft);
    applyFournisseurFieldLabels(document, fournisseurFieldLabelsDraft);
    syncFournisseurToggleStates(modal, fournisseurFieldVisibilityDraft);
    syncFournisseurLabelInputs(modal, fournisseurFieldLabelsDraft);
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.addEventListener("keydown", onFournisseurFieldsModalKeyDown);
    const firstToggle = modal.querySelector("input[data-fournisseur-field-key]");
    if (firstToggle && typeof firstToggle.focus === "function") {
      try {
        firstToggle.focus({ preventScroll: true });
      } catch {
        try {
          firstToggle.focus();
        } catch {}
      }
    }
  };

  const onFournisseurFieldsModalKeyDown = (evt) => {
    if (evt.key !== "Escape") return;
    const modal = document.querySelector(`${FOURNISSEUR_FIELDS_MODAL_SELECTOR}.is-open`);
    if (!modal) return;
    evt.preventDefault();
    closeFournisseurFieldsModal(modal);
  };

  document.addEventListener("click", (evt) => {
    const trigger = evt.target?.closest?.(FOURNISSEUR_FIELDS_TRIGGER_SELECTOR);
    if (trigger) {
      const modalId = trigger.getAttribute("aria-controls");
      const modal = modalId ? document.getElementById(modalId) : null;
      if (!modal) return;
      if (modal.classList.contains("is-open")) {
        closeFournisseurFieldsModal(modal);
      } else {
        openFournisseurFieldsModal(modal, trigger);
      }
      return;
    }

    const closeBtn = evt.target?.closest?.("[data-fournisseur-fields-modal-close]");
    if (!closeBtn) return;
    const modal = closeBtn.closest(FOURNISSEUR_FIELDS_MODAL_SELECTOR);
    closeFournisseurFieldsModal(modal);
  });

  document.addEventListener("click", async (evt) => {
    const saveBtn = evt.target?.closest?.("[data-fournisseur-fields-modal-save]");
    if (!saveBtn) return;
    const modal = saveBtn.closest(FOURNISSEUR_FIELDS_MODAL_SELECTOR);
    try {
      await commitFournisseurDraft();
      closeFournisseurFieldsModal(modal);
    } catch (err) {
      if (typeof w.showDialog === "function") {
        await w.showDialog(String(err?.message || err || "Enregistrement impossible."), {
          title: "Champs fournisseur"
        });
      }
    }
  });

  document.addEventListener("change", (evt) => {
    const toggle = evt.target?.closest?.(
      `${FOURNISSEUR_FIELDS_MODAL_SELECTOR} input[data-fournisseur-field-key]`
    );
    if (!toggle) return;
    const key = toggle.dataset.fournisseurFieldKey;
    if (!key) return;
    updateFournisseurVisibilityDraft({ [key]: toggle.checked });
  });

  document.addEventListener("input", (evt) => {
    const labelInput = evt.target?.closest?.(
      `${FOURNISSEUR_FIELDS_MODAL_SELECTOR} input[data-fournisseur-field-label-input]`
    );
    if (!labelInput) return;
    const key = labelInput.dataset.fournisseurFieldLabelInput;
    if (!key) return;
    updateFournisseurLabelsDraft({ [key]: labelInput.value });
  });

  document.addEventListener("click", (evt) => {
    const resetBtn = evt.target?.closest?.(
      `${FOURNISSEUR_FIELDS_MODAL_SELECTOR} [data-fournisseur-field-label-reset]`
    );
    if (!resetBtn) return;
    const key = resetBtn.dataset.fournisseurFieldLabelReset;
    if (!key) return;
    updateFournisseurLabelsDraft({ [key]: FOURNISSEUR_FIELD_DEFAULT_LABELS[key] || "" });
  });

  document.addEventListener("click", (evt) => {
    const popoverTrigger = evt.target?.closest?.('[aria-controls="fournisseurFormPopover"]');
    if (!popoverTrigger) return;
    setTimeout(() => {
      applyFournisseurFieldVisibility(document, fournisseurFieldVisibility);
      applyFournisseurFieldLabels(document, fournisseurFieldLabels);
    }, 0);
  });

  const initFournisseurFieldSettings = async () => {
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibility);
    applyFournisseurFieldLabels(document, fournisseurFieldLabels);

    const loaded = await loadFournisseurFieldSettings();
    fournisseurFieldVisibility = loaded.visibility;
    fournisseurFieldLabels = loaded.labels;
    fournisseurFieldVisibilityDraft = { ...fournisseurFieldVisibility };
    fournisseurFieldLabelsDraft = { ...fournisseurFieldLabels };
    applyFournisseurFieldVisibility(document, fournisseurFieldVisibility);
    applyFournisseurFieldLabels(document, fournisseurFieldLabels);
    const modal = document.querySelector(FOURNISSEUR_FIELDS_MODAL_SCOPE_SELECTOR);
    syncFournisseurToggleStates(modal || document, fournisseurFieldVisibility);
    syncFournisseurLabelInputs(modal || document, fournisseurFieldLabels);
    syncFournisseurSettingsToState(fournisseurFieldVisibility, fournisseurFieldLabels);
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        void initFournisseurFieldSettings();
      }, { once: true });
    } else {
      void initFournisseurFieldSettings();
    }
  }
})(window);
