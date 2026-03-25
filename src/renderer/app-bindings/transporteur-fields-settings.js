(function (w) {
  const API =
    w.electronAPI ||
    (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) ||
    null;
  const SEM = w.SEM || {};
  const state = () => SEM.state || {};

  const TRANSPORTEUR_FIELDS_TRIGGER_SELECTOR = "#transporteurFieldsSettingsBtn";
  const TRANSPORTEUR_FIELDS_MODAL_SELECTOR = ".transporteur-fields-modal";
  const TRANSPORTEUR_FIELDS_MODAL_SCOPE_SELECTOR = "#transporteurFieldsSettingsModal";
  const TRANSPORTEUR_SETTINGS_KEY = "transporteur";

  const TRANSPORTEUR_FIELD_DEFAULT_VISIBILITY = {
    name: true,
    driverName: true,
    vehiclePlate: true,
    transportMode: true,
    phone: true,
    email: true,
    address: true
  };
  const TRANSPORTEUR_FIELD_DEFAULT_LABELS = {
    name: "Transporteur / Nom",
    driverName: "Nom du chauffeur",
    vehiclePlate: "Matricule vehicule",
    transportMode: "Mode de transport",
    phone: "Telephone",
    email: "E-mail",
    address: "Adresse"
  };
  const TRANSPORTEUR_FIELD_KEYS = Object.keys(TRANSPORTEUR_FIELD_DEFAULT_VISIBILITY);

  const normalizeVisibility = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = { ...TRANSPORTEUR_FIELD_DEFAULT_VISIBILITY };
    if (!("vehiclePlate" in source) && "taxId" in source) {
      next.vehiclePlate = source.taxId !== false;
    }
    TRANSPORTEUR_FIELD_KEYS.forEach((key) => {
      if (!(key in source)) return;
      next[key] = source[key] !== false;
    });
    return next;
  };

  const normalizeLabels = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = { ...TRANSPORTEUR_FIELD_DEFAULT_LABELS };
    if (!source.vehiclePlate && typeof source.taxId === "string" && source.taxId.trim()) {
      next.vehiclePlate = source.taxId.trim();
    }
    TRANSPORTEUR_FIELD_KEYS.forEach((key) => {
      if (typeof source[key] !== "string") return;
      const trimmed = source[key].trim();
      if (trimmed) next[key] = trimmed;
    });
    return next;
  };

  const getLabel = (key, labels) =>
    (labels && typeof labels[key] === "string" && labels[key].trim()) ||
    TRANSPORTEUR_FIELD_DEFAULT_LABELS[key] ||
    "";

  let transporteurFieldVisibility = normalizeVisibility();
  let transporteurFieldVisibilityDraft = { ...transporteurFieldVisibility };
  let transporteurFieldLabels = normalizeLabels();
  let transporteurFieldLabelsDraft = { ...transporteurFieldLabels };

  const modalRestoreFocus = new WeakMap();

  const syncTransporteurSettingsToState = (
    visibility = transporteurFieldVisibility,
    labels = transporteurFieldLabels
  ) => {
    const st = state();
    if (!st || typeof st !== "object") return;
    st.transporteurFieldVisibility = { ...visibility };
    st.transporteurFieldLabels = { ...labels };
  };

  const applyTransporteurFieldVisibility = (
    scope = document,
    visibility = transporteurFieldVisibility
  ) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    const groupedRows = new Set();

    scope.querySelectorAll("[data-transporteur-field]").forEach((node) => {
      const key = node.dataset.transporteurField;
      if (!key) return;
      const isVisible = visibility[key] !== false;
      node.hidden = !isVisible;
      node.style.display = isVisible ? "" : "none";
      node.classList.toggle("is-hidden", !isVisible);
      const row = node.closest("[data-transporteur-field-group]");
      if (row) groupedRows.add(row);
    });

    groupedRows.forEach((row) => {
      const fields = Array.from(row.querySelectorAll("[data-transporteur-field]"));
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

  const applyTransporteurFieldLabels = (
    scope = document,
    labels = transporteurFieldLabels
  ) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope.querySelectorAll("[data-transporteur-field-label]").forEach((node) => {
      const key = node.dataset.transporteurFieldLabel;
      if (!key) return;
      const isDefaultLabel =
        node.classList?.contains("fournisseur-field-label-default") &&
        node.closest(TRANSPORTEUR_FIELDS_MODAL_SELECTOR);
      if (isDefaultLabel) {
        const defaultLabel = TRANSPORTEUR_FIELD_DEFAULT_LABELS[key];
        if (defaultLabel) node.textContent = defaultLabel;
        return;
      }
      const nextLabel = getLabel(key, labels);
      if (nextLabel) node.textContent = nextLabel;
    });
  };

  const syncTransporteurToggleStates = (
    scope = document,
    visibility = transporteurFieldVisibility
  ) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope
      .querySelectorAll("input[data-transporteur-field-key]")
      .forEach((input) => {
        const key = input.dataset.transporteurFieldKey;
        if (!key) return;
        input.checked = visibility[key] !== false;
      });
  };

  const syncTransporteurLabelInputs = (
    scope = document,
    labels = transporteurFieldLabels
  ) => {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    scope
      .querySelectorAll("input[data-transporteur-field-label-input]")
      .forEach((input) => {
        const key = input.dataset.transporteurFieldLabelInput;
        if (!key) return;
        input.value = getLabel(key, labels);
      });
  };

  const loadTransporteurSettingsEnvelope = async () => {
    if (typeof API?.loadClientFieldSettings !== "function") return {};
    const res = await API.loadClientFieldSettings();
    if (!res?.ok || !res.settings || typeof res.settings !== "object") return {};
    return res.settings;
  };

  const loadTransporteurFieldSettings = async () => {
    const envelope = await loadTransporteurSettingsEnvelope();
    const settings =
      envelope[TRANSPORTEUR_SETTINGS_KEY] &&
      typeof envelope[TRANSPORTEUR_SETTINGS_KEY] === "object"
        ? envelope[TRANSPORTEUR_SETTINGS_KEY]
        : {};
    return {
      visibility: normalizeVisibility(settings.visibility),
      labels: normalizeLabels(settings.labels)
    };
  };

  const saveTransporteurFieldSettings = async (settings = {}) => {
    if (typeof API?.saveClientFieldSettings !== "function") return;
    const envelope = await loadTransporteurSettingsEnvelope();
    const nextEnvelope = {
      ...envelope,
      [TRANSPORTEUR_SETTINGS_KEY]: {
        visibility: normalizeVisibility(settings.visibility),
        labels: normalizeLabels(settings.labels)
      }
    };
    await API.saveClientFieldSettings({ settings: nextEnvelope });
  };

  const updateTransporteurVisibilityDraft = (patch = {}) => {
    transporteurFieldVisibilityDraft = normalizeVisibility({
      ...transporteurFieldVisibilityDraft,
      ...(patch && typeof patch === "object" ? patch : {})
    });
    applyTransporteurFieldVisibility(document, transporteurFieldVisibilityDraft);
    syncTransporteurToggleStates(document, transporteurFieldVisibilityDraft);
  };

  const updateTransporteurLabelsDraft = (patch = {}) => {
    transporteurFieldLabelsDraft = normalizeLabels({
      ...transporteurFieldLabelsDraft,
      ...(patch && typeof patch === "object" ? patch : {})
    });
    applyTransporteurFieldLabels(document, transporteurFieldLabelsDraft);
    syncTransporteurLabelInputs(document, transporteurFieldLabelsDraft);
  };

  const commitTransporteurDraft = async () => {
    transporteurFieldVisibility = normalizeVisibility(transporteurFieldVisibilityDraft);
    transporteurFieldLabels = normalizeLabels(transporteurFieldLabelsDraft);
    applyTransporteurFieldVisibility(document, transporteurFieldVisibility);
    applyTransporteurFieldLabels(document, transporteurFieldLabels);
    syncTransporteurToggleStates(document, transporteurFieldVisibility);
    syncTransporteurLabelInputs(document, transporteurFieldLabels);
    syncTransporteurSettingsToState(transporteurFieldVisibility, transporteurFieldLabels);
    await saveTransporteurFieldSettings({
      visibility: transporteurFieldVisibility,
      labels: transporteurFieldLabels
    });
  };

  const closeTransporteurFieldsModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    transporteurFieldVisibilityDraft = { ...transporteurFieldVisibility };
    transporteurFieldLabelsDraft = { ...transporteurFieldLabels };
    applyTransporteurFieldVisibility(document, transporteurFieldVisibility);
    applyTransporteurFieldLabels(document, transporteurFieldLabels);
    syncTransporteurToggleStates(document, transporteurFieldVisibility);
    syncTransporteurLabelInputs(document, transporteurFieldLabels);

    const restoreEl = modalRestoreFocus.get(modal);
    if (restoreEl && typeof restoreEl.focus === "function") {
      try {
        restoreEl.focus();
      } catch {}
    }
    if (!document.querySelector(`${TRANSPORTEUR_FIELDS_MODAL_SELECTOR}.is-open`)) {
      document.removeEventListener("keydown", onTransporteurFieldsModalKeyDown);
    }
  };

  const openTransporteurFieldsModal = (modal, trigger) => {
    if (!modal) return;
    modalRestoreFocus.set(
      modal,
      trigger && trigger.focus
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    );
    transporteurFieldVisibilityDraft = { ...transporteurFieldVisibility };
    transporteurFieldLabelsDraft = { ...transporteurFieldLabels };
    applyTransporteurFieldVisibility(document, transporteurFieldVisibilityDraft);
    applyTransporteurFieldLabels(document, transporteurFieldLabelsDraft);
    syncTransporteurToggleStates(modal, transporteurFieldVisibilityDraft);
    syncTransporteurLabelInputs(modal, transporteurFieldLabelsDraft);
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.addEventListener("keydown", onTransporteurFieldsModalKeyDown);
    const firstToggle = modal.querySelector("input[data-transporteur-field-key]");
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

  const onTransporteurFieldsModalKeyDown = (evt) => {
    if (evt.key !== "Escape") return;
    const modal = document.querySelector(`${TRANSPORTEUR_FIELDS_MODAL_SELECTOR}.is-open`);
    if (!modal) return;
    evt.preventDefault();
    closeTransporteurFieldsModal(modal);
  };

  document.addEventListener("click", (evt) => {
    const trigger = evt.target?.closest?.(TRANSPORTEUR_FIELDS_TRIGGER_SELECTOR);
    if (trigger) {
      const modalId = trigger.getAttribute("aria-controls");
      const modal = modalId ? document.getElementById(modalId) : null;
      if (!modal) return;
      if (modal.classList.contains("is-open")) {
        closeTransporteurFieldsModal(modal);
      } else {
        openTransporteurFieldsModal(modal, trigger);
      }
      return;
    }

    const closeBtn = evt.target?.closest?.("[data-transporteur-fields-modal-close]");
    if (!closeBtn) return;
    const modal = closeBtn.closest(TRANSPORTEUR_FIELDS_MODAL_SELECTOR);
    closeTransporteurFieldsModal(modal);
  });

  document.addEventListener("click", async (evt) => {
    const saveBtn = evt.target?.closest?.("[data-transporteur-fields-modal-save]");
    if (!saveBtn) return;
    const modal = saveBtn.closest(TRANSPORTEUR_FIELDS_MODAL_SELECTOR);
    try {
      await commitTransporteurDraft();
      closeTransporteurFieldsModal(modal);
    } catch (err) {
      if (typeof w.showDialog === "function") {
        await w.showDialog(String(err?.message || err || "Enregistrement impossible."), {
          title: "Champs transporteur"
        });
      }
    }
  });

  document.addEventListener("change", (evt) => {
    const toggle = evt.target?.closest?.(
      `${TRANSPORTEUR_FIELDS_MODAL_SELECTOR} input[data-transporteur-field-key]`
    );
    if (!toggle) return;
    const key = toggle.dataset.transporteurFieldKey;
    if (!key) return;
    updateTransporteurVisibilityDraft({ [key]: toggle.checked });
  });

  document.addEventListener("input", (evt) => {
    const labelInput = evt.target?.closest?.(
      `${TRANSPORTEUR_FIELDS_MODAL_SELECTOR} input[data-transporteur-field-label-input]`
    );
    if (!labelInput) return;
    const key = labelInput.dataset.transporteurFieldLabelInput;
    if (!key) return;
    updateTransporteurLabelsDraft({ [key]: labelInput.value });
  });

  document.addEventListener("click", (evt) => {
    const resetBtn = evt.target?.closest?.(
      `${TRANSPORTEUR_FIELDS_MODAL_SELECTOR} [data-transporteur-field-label-reset]`
    );
    if (!resetBtn) return;
    const key = resetBtn.dataset.transporteurFieldLabelReset;
    if (!key) return;
    updateTransporteurLabelsDraft({ [key]: TRANSPORTEUR_FIELD_DEFAULT_LABELS[key] || "" });
  });

  document.addEventListener("click", (evt) => {
    const popoverTrigger = evt.target?.closest?.('[aria-controls="transporteurFormPopover"]');
    if (!popoverTrigger) return;
    setTimeout(() => {
      applyTransporteurFieldVisibility(document, transporteurFieldVisibility);
      applyTransporteurFieldLabels(document, transporteurFieldLabels);
    }, 0);
  });

  const initTransporteurFieldSettings = async () => {
    applyTransporteurFieldVisibility(document, transporteurFieldVisibility);
    applyTransporteurFieldLabels(document, transporteurFieldLabels);

    const loaded = await loadTransporteurFieldSettings();
    transporteurFieldVisibility = loaded.visibility;
    transporteurFieldLabels = loaded.labels;
    transporteurFieldVisibilityDraft = { ...transporteurFieldVisibility };
    transporteurFieldLabelsDraft = { ...transporteurFieldLabels };
    applyTransporteurFieldVisibility(document, transporteurFieldVisibility);
    applyTransporteurFieldLabels(document, transporteurFieldLabels);
    const modal = document.querySelector(TRANSPORTEUR_FIELDS_MODAL_SCOPE_SELECTOR);
    syncTransporteurToggleStates(modal || document, transporteurFieldVisibility);
    syncTransporteurLabelInputs(modal || document, transporteurFieldLabels);
    syncTransporteurSettingsToState(transporteurFieldVisibility, transporteurFieldLabels);
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          void initTransporteurFieldSettings();
        },
        { once: true }
      );
    } else {
      void initTransporteurFieldSettings();
    }
  }
})(window);
