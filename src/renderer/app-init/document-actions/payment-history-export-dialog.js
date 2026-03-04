(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const PRESET_OPTIONS = [
    { value: "custom", label: "Par dates" },
    { value: "today", label: "Aujourd'hui" },
    { value: "this-month", label: "Ce mois" },
    { value: "last-month", label: "Mois dernier" },
    { value: "this-year", label: "Cette annee" },
    { value: "last-year", label: "L'annee derniere" }
  ];

  const SCOPE_OPTIONS = [
    { value: "modal-filters", label: "Filtres actifs du tableau" },
    { value: "all-records", label: "Tous les paiements" }
  ];

  const getBusiness = () => AppInit.PaymentHistoryExportBusiness || {};

  const normalizeIsoDate = (value) => {
    const api = getBusiness();
    if (typeof api.normalizeIsoDate === "function") return api.normalizeIsoDate(value);
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return "";
  };

  const normalizeYearValue = (value) => {
    const api = getBusiness();
    if (typeof api.normalizeYearValue === "function") return api.normalizeYearValue(value);
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 9999) return "";
    return String(parsed);
  };

  const getCurrentYearValue = () => {
    const api = getBusiness();
    if (typeof api.getCurrentYearValue === "function") return api.getCurrentYearValue();
    return String(new Date().getFullYear());
  };

  const getPresetRange = (preset, options = {}) => {
    const api = getBusiness();
    if (typeof api.getPresetRange === "function") {
      return api.getPresetRange(preset, options);
    }
    return null;
  };

  const setInputValue = (input, picker, value) => {
    if (picker && typeof picker.setValue === "function") {
      picker.setValue(value || "", { silent: true });
      return;
    }
    if (input) input.value = value || "";
  };

  const openPaymentHistoryExportDialog = async ({ currentFilters = {} } = {}) => {
    if (typeof w.showConfirm !== "function") {
      const start = typeof w.prompt === "function" ? w.prompt("Date debut (AAAA-MM-JJ)") : "";
      if (!start) return null;
      const end = typeof w.prompt === "function" ? w.prompt("Date fin (AAAA-MM-JJ)") : "";
      if (!end) return null;
      const normalizedStart = normalizeIsoDate(start);
      const normalizedEnd = normalizeIsoDate(end);
      if (!normalizedStart || !normalizedEnd || normalizedStart > normalizedEnd) return null;
      return {
        scope: "modal-filters",
        preset: "custom",
        startDate: normalizedStart,
        endDate: normalizedEnd
      };
    }

    const referenceYear = normalizeYearValue(currentFilters?.year) || getCurrentYearValue();
    const defaultStart = `${referenceYear}-01-01`;
    const defaultEnd = `${referenceYear}-12-31`;
    const state = {
      scope: "modal-filters",
      preset: referenceYear === getCurrentYearValue() ? "this-year" : "custom",
      startDate: defaultStart,
      endDate: defaultEnd
    };

    let startInput = null;
    let endInput = null;
    let scopeSelect = null;
    let presetSelect = null;
    let hintEl = null;
    let infoEl = null;
    let dateFields = null;
    let startPicker = null;
    let endPicker = null;
    const cleanupFns = [];

    const addListener = (el, eventName, handler) => {
      if (!el || typeof el.addEventListener !== "function") return;
      el.addEventListener(eventName, handler);
      cleanupFns.push(() => {
        try {
          el.removeEventListener(eventName, handler);
        } catch {}
      });
    };

    const setDateFieldsEnabled = (enabled) => {
      const isEnabled = !!enabled;
      if (dateFields) dateFields.classList.toggle("is-disabled", !isEnabled);
      [startInput, endInput].forEach((input) => {
        if (!input) return;
        input.disabled = !isEnabled;
        input.setAttribute("aria-disabled", isEnabled ? "false" : "true");
      });
      const root = startInput?.closest?.("#swbDialogMsg") || endInput?.closest?.("#swbDialogMsg");
      root?.querySelectorAll?.(".swb-date-picker__toggle")?.forEach((btn) => {
        btn.disabled = !isEnabled;
        btn.setAttribute("aria-disabled", isEnabled ? "false" : "true");
      });
      if (!isEnabled) {
        startPicker?.close?.();
        endPicker?.close?.();
      }
    };

    const updateScopeInfo = () => {
      if (!infoEl) return;
      if (state.scope === "all-records") {
        infoEl.textContent = "Tous les paiements seront inclus sur la periode choisie.";
        return;
      }
      const details = [];
      const paymentNumber = String(currentFilters?.paymentNumber || "").trim();
      const invoiceNumber = String(currentFilters?.invoiceNumber || "").trim();
      const clientQuery = String(currentFilters?.clientQuery || "").trim();
      const year = normalizeYearValue(currentFilters?.year) || getCurrentYearValue();
      const dayMonth = String(currentFilters?.date || "").trim();
      if (paymentNumber) details.push(`N paiement: ${paymentNumber}`);
      if (invoiceNumber) details.push(`Facture: ${invoiceNumber}`);
      if (clientQuery) details.push(`Client: ${clientQuery}`);
      details.push(`Annee: ${year}`);
      if (dayMonth) details.push(`Date: ${dayMonth}`);
      infoEl.textContent = `Filtres actifs appliques: ${details.join(" | ")}`;
    };

    const setOkState = () => {
      const okBtn = document.getElementById("swbDialogOk");
      if (!okBtn) return;

      const startRaw = String(startInput?.value || "").trim();
      const endRaw = String(endInput?.value || "").trim();
      const validStart = normalizeIsoDate(startRaw);
      const validEnd = normalizeIsoDate(endRaw);
      state.startDate = startRaw;
      state.endDate = endRaw;

      let message = "";
      if ((startRaw && !validStart) || (endRaw && !validEnd)) {
        message = "Format attendu: AAAA-MM-JJ.";
      } else if (validStart && validEnd && validStart > validEnd) {
        message = "La date de debut doit preceder la date de fin.";
      }
      if (hintEl) {
        hintEl.textContent = message;
        hintEl.hidden = !message;
      }

      const isValidRange = !!(validStart && validEnd && validStart <= validEnd);
      okBtn.disabled = !isValidRange;
      okBtn.setAttribute("aria-disabled", isValidRange ? "false" : "true");
    };

    const applyPreset = () => {
      const presetValue = String(presetSelect?.value || state.preset || "custom").trim();
      state.preset = presetValue;
      if (presetValue === "custom") {
        setDateFieldsEnabled(true);
        setOkState();
        return;
      }

      const range = getPresetRange(presetValue, { referenceYear });
      if (range?.startDate && range?.endDate) {
        setInputValue(startInput, startPicker, range.startDate);
        setInputValue(endInput, endPicker, range.endDate);
        state.startDate = range.startDate;
        state.endDate = range.endDate;
      }
      setDateFieldsEnabled(false);
      setOkState();
    };

    const renderMessage = (container) => {
      if (!container) return;
      container.textContent = "";
      container.style.maxHeight = "none";
      container.style.overflow = "visible";

      const doc = container.ownerDocument || document;
      const wrapper = doc.createElement("div");
      wrapper.className = "report-tax-date-range payment-history-export-dialog";
      wrapper.innerHTML = `
        <p class="report-tax-date-range__intro">
          Configurez les options d'export PDF de l'historique des paiements.
        </p>
        <p id="paymentHistoryExportInfo" class="report-tax-date-range__intro"></p>
        <div class="report-tax-date-range__selectors report-tax-date-range__selectors--single">
          <label class="report-tax-date-range__selector">
            <span>Perimetre</span>
            <select id="paymentHistoryExportScope">
              ${SCOPE_OPTIONS.map(
                (opt) =>
                  `<option value="${opt.value}"${
                    opt.value === state.scope ? " selected" : ""
                  }>${opt.label}</option>`
              ).join("")}
            </select>
          </label>
        </div>
        <div class="report-tax-date-range__selectors report-tax-date-range__selectors--triple">
          <label class="report-tax-date-range__selector">
            <span>Selection</span>
            <select id="paymentHistoryExportPreset">
              ${PRESET_OPTIONS.map(
                (opt) =>
                  `<option value="${opt.value}"${
                    opt.value === state.preset ? " selected" : ""
                  }>${opt.label}</option>`
              ).join("")}
            </select>
          </label>
          <label class="report-tax-date-range__selector">
            <span>Date debut</span>
            <div class="swb-date-picker" data-date-picker>
              <input
                id="paymentHistoryExportStart"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-JJ"
                autocomplete="off"
                spellcheck="false"
                aria-haspopup="dialog"
                aria-expanded="false"
                role="combobox"
                aria-controls="paymentHistoryExportStartPanel"
              >
              <button
                type="button"
                class="swb-date-picker__toggle"
                data-date-picker-toggle
                aria-label="Choisir une date"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="paymentHistoryExportStartPanel"
              >
                <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                  <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                  <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                </svg>
              </button>
              <div
                class="swb-date-picker__panel"
                data-date-picker-panel
                hidden
                role="dialog"
                aria-modal="false"
                aria-label="Choisir une date"
                tabindex="-1"
                id="paymentHistoryExportStartPanel"
              ></div>
            </div>
          </label>
          <label class="report-tax-date-range__selector">
            <span>Date fin</span>
            <div class="swb-date-picker" data-date-picker>
              <input
                id="paymentHistoryExportEnd"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-JJ"
                autocomplete="off"
                spellcheck="false"
                aria-haspopup="dialog"
                aria-expanded="false"
                role="combobox"
                aria-controls="paymentHistoryExportEndPanel"
              >
              <button
                type="button"
                class="swb-date-picker__toggle"
                data-date-picker-toggle
                aria-label="Choisir une date"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="paymentHistoryExportEndPanel"
              >
                <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                  <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                  <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                </svg>
              </button>
              <div
                class="swb-date-picker__panel"
                data-date-picker-panel
                hidden
                role="dialog"
                aria-modal="false"
                aria-label="Choisir une date"
                tabindex="-1"
                id="paymentHistoryExportEndPanel"
              ></div>
            </div>
          </label>
        </div>
        <p id="paymentHistoryExportHint" class="report-tax-date-range__hint" hidden></p>
      `;
      container.appendChild(wrapper);

      scopeSelect = wrapper.querySelector("#paymentHistoryExportScope");
      presetSelect = wrapper.querySelector("#paymentHistoryExportPreset");
      startInput = wrapper.querySelector("#paymentHistoryExportStart");
      endInput = wrapper.querySelector("#paymentHistoryExportEnd");
      hintEl = wrapper.querySelector("#paymentHistoryExportHint");
      infoEl = wrapper.querySelector("#paymentHistoryExportInfo");
      dateFields = wrapper.querySelector(".report-tax-date-range__selectors--triple");

      if (startInput && w.AppDatePicker?.create) {
        startPicker = w.AppDatePicker.create(startInput, {
          allowManualInput: true,
          onChange(value) {
            if (startInput) startInput.value = String(value || "").trim();
            setOkState();
          }
        });
      }
      if (endInput && w.AppDatePicker?.create) {
        endPicker = w.AppDatePicker.create(endInput, {
          allowManualInput: true,
          onChange(value) {
            if (endInput) endInput.value = String(value || "").trim();
            setOkState();
          }
        });
      }

      setInputValue(startInput, startPicker, state.startDate);
      setInputValue(endInput, endPicker, state.endDate);
      if (scopeSelect) scopeSelect.value = state.scope;
      if (presetSelect) presetSelect.value = state.preset;

      addListener(scopeSelect, "change", () => {
        state.scope = String(scopeSelect?.value || "modal-filters").trim();
        updateScopeInfo();
      });
      addListener(presetSelect, "change", applyPreset);
      addListener(startInput, "input", setOkState);
      addListener(endInput, "input", setOkState);

      updateScopeInfo();
      applyPreset();
    };

    const confirmed = await w.showConfirm("Configuration export", {
      title: "Historique paiements",
      okText: "Valider",
      cancelText: "Annuler",
      renderMessage
    });

    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    startPicker?.close?.();
    endPicker?.close?.();

    if (!confirmed) return null;

    const startDate = normalizeIsoDate(state.startDate);
    const endDate = normalizeIsoDate(state.endDate);
    if (!startDate || !endDate || startDate > endDate) return null;

    return {
      scope: state.scope === "all-records" ? "all-records" : "modal-filters",
      preset: String(state.preset || "custom"),
      startDate,
      endDate
    };
  };

  AppInit.PaymentHistoryExportDialog = {
    openPaymentHistoryExportDialog
  };
})(window);
