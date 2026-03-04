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
    { value: "all-records", label: "Tous les clients" }
  ];
  const SOLD_OPTIONS = [
    { value: "", label: "Tous les soldes" },
    { value: "eq0", label: "Solde = 0" },
    { value: "lt0", label: "Solde < 0" },
    { value: "gt0", label: "Solde > 0" }
  ];

  const FIELD_TOGGLE_CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';

  const getBusiness = () => AppInit.ClientStatementsExportBusiness || {};

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
    if (typeof api.getPresetRange === "function") return api.getPresetRange(preset, options);
    return null;
  };

  const getSoldFilterLabel = (value) => {
    const api = getBusiness();
    if (typeof api.getSoldFilterLabel === "function") return api.getSoldFilterLabel(value);
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "eq0") return "Solde = 0";
    if (raw === "lt0") return "Solde < 0";
    if (raw === "gt0") return "Solde > 0";
    return "Tous les soldes";
  };

  const normalizeSoldFilterValue = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "eq0" || raw === "lt0" || raw === "gt0") return raw;
    return "";
  };

  const setInputValue = (input, picker, value) => {
    if (picker && typeof picker.setValue === "function") {
      picker.setValue(value || "", { silent: true });
      return;
    }
    if (input) input.value = value || "";
  };

  const openClientStatementsExportDialog = async ({ currentFilters = {} } = {}) => {
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
        soldFilter: normalizeSoldFilterValue(currentFilters?.sold),
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
      sold: normalizeSoldFilterValue(currentFilters?.sold),
      startDate: defaultStart,
      endDate: defaultEnd
    };

    let startInput = null;
    let endInput = null;
    let scopeSelect = null;
    let presetSelect = null;
    let scopeMenu = null;
    let scopeSummary = null;
    let scopeDisplay = null;
    let scopePanel = null;
    let soldSelect = null;
    let soldMenu = null;
    let soldSummary = null;
    let soldDisplay = null;
    let soldPanel = null;
    let presetMenu = null;
    let presetSummary = null;
    let presetDisplay = null;
    let presetPanel = null;
    let hintEl = null;
    let infoEl = null;
    let dateFields = null;
    let startPicker = null;
    let endPicker = null;
    let dialogDoc = null;
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

    const optionLabelFor = (options, value, fallback = "") => {
      const key = String(value ?? "");
      const match = (Array.isArray(options) ? options : []).find(
        (opt) => String(opt?.value ?? "") === key
      );
      if (match && typeof match.label === "string") return match.label;
      return fallback || (options && options[0] ? String(options[0].label || "") : "");
    };

    const setMenuOpenState = (menu, open) => {
      if (!menu) return;
      const isOpen = !!open;
      menu.open = isOpen;
      const summary = menu.querySelector("summary");
      if (summary) summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    const syncMenuSelection = ({
      select,
      display,
      panel,
      options,
      dataAttribute,
      value
    }) => {
      const normalizedOptions = Array.isArray(options) ? options : [];
      const availableValues = new Set(normalizedOptions.map((opt) => String(opt?.value ?? "")));
      const fallbackValue = normalizedOptions.length ? String(normalizedOptions[0].value ?? "") : "";
      const requested = String(value ?? "");
      const nextValue = availableValues.has(requested) ? requested : fallbackValue;

      if (select) select.value = nextValue;
      if (display) {
        display.textContent = optionLabelFor(normalizedOptions, nextValue, nextValue) || nextValue;
      }
      if (panel) {
        panel.querySelectorAll(`[${dataAttribute}]`).forEach((btn) => {
          const isActive = String(btn.getAttribute(dataAttribute) || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      return nextValue;
    };

    const wireMenuDropdown = ({
      menu,
      summary,
      panel,
      select,
      display,
      options,
      dataAttribute,
      onChange
    }) => {
      if (!menu || !summary || !panel || !select) return;

      addListener(summary, "click", (evt) => {
        evt.preventDefault();
        setMenuOpenState(menu, !menu.open);
        if (!menu.open) summary.focus();
      });

      addListener(menu, "keydown", (evt) => {
        if (evt.key !== "Escape" || !menu.open) return;
        evt.preventDefault();
        setMenuOpenState(menu, false);
        summary.focus();
      });

      addListener(panel, "click", (evt) => {
        const target = evt.target instanceof Element ? evt.target.closest(`[${dataAttribute}]`) : null;
        if (!target) return;
        const nextValue = String(target.getAttribute(dataAttribute) || "");
        const changed = String(select.value || "") !== nextValue;
        select.value = nextValue;
        syncMenuSelection({
          select,
          display,
          panel,
          options,
          dataAttribute,
          value: nextValue
        });
        setMenuOpenState(menu, false);
        if (typeof onChange === "function") {
          if (changed) {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            onChange(nextValue);
          }
        }
      });
    };

    const updateScopeInfo = () => {
      if (!infoEl) return;
      const details = [];
      if (state.scope === "all-records") {
        details.push("Perimetre: Tous les clients");
      }
      const clientQuery = String(currentFilters?.client || "").trim();
      const soldFilter = normalizeSoldFilterValue(state.sold);
      const year = normalizeYearValue(currentFilters?.year) || getCurrentYearValue();
      const fromValue = String(currentFilters?.dateFrom || "").trim();
      const toValue = String(currentFilters?.dateTo || "").trim();

      if (clientQuery) details.push(`Client: ${clientQuery}`);
      details.push(`Solde: ${getSoldFilterLabel(soldFilter)}`);
      details.push(`Annee: ${year}`);
      if (fromValue || toValue) {
        details.push(`Du ${fromValue || "--"} au ${toValue || "--"}`);
      }
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
      dialogDoc = doc;
      const wrapper = doc.createElement("div");
      wrapper.className = "report-tax-date-range client-statements-export-dialog";

      const scopeButtons = SCOPE_OPTIONS.map((opt) => {
        const isActive = opt.value === state.scope;
        return `
          <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-client-statements-export-scope="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
            ${opt.label}
          </button>
        `;
      }).join("");
      const scopeSelectOptions = SCOPE_OPTIONS.map((opt) => {
        const isSelected = opt.value === state.scope;
        return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
      }).join("");
      const soldButtons = SOLD_OPTIONS.map((opt) => {
        const isActive = String(opt.value) === String(state.sold || "");
        return `
          <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-client-statements-export-sold="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
            ${opt.label}
          </button>
        `;
      }).join("");
      const soldSelectOptions = SOLD_OPTIONS.map((opt) => {
        const isSelected = String(opt.value) === String(state.sold || "");
        return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
      }).join("");
      const presetButtons = PRESET_OPTIONS.map((opt) => {
        const isActive = opt.value === state.preset;
        return `
          <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-client-statements-export-preset="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
            ${opt.label}
          </button>
        `;
      }).join("");
      const presetSelectOptions = PRESET_OPTIONS.map((opt) => {
        const isSelected = opt.value === state.preset;
        return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
      }).join("");

      wrapper.innerHTML = `
        <p class="report-tax-date-range__intro">
          Configurez les options d'export PDF du solde clients.
        </p>
        <p id="clientStatementsExportInfo" class="report-tax-date-range__intro"></p>
        <div class="report-tax-date-range__selectors">
          <label class="report-tax-date-range__selector">
            <span id="clientStatementsExportScopeLabel">Perimetre</span>
            <div class="report-tax-date-range__controls">
              <details id="clientStatementsExportScopeMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="clientStatementsExportScopeLabel clientStatementsExportScopeDisplay">
                  <span id="clientStatementsExportScopeDisplay" class="model-select-display"></span>
                  ${FIELD_TOGGLE_CHEVRON_SVG}
                </summary>
                <div id="clientStatementsExportScopePanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="clientStatementsExportScopeLabel">
                  ${scopeButtons}
                </div>
              </details>
              <select id="clientStatementsExportScope" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
                ${scopeSelectOptions}
              </select>
            </div>
          </label>
          <label class="report-tax-date-range__selector">
            <span id="clientStatementsExportSoldLabel">Solde</span>
            <div class="report-tax-date-range__controls">
              <details id="clientStatementsExportSoldMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="clientStatementsExportSoldLabel clientStatementsExportSoldDisplay">
                  <span id="clientStatementsExportSoldDisplay" class="model-select-display"></span>
                  ${FIELD_TOGGLE_CHEVRON_SVG}
                </summary>
                <div id="clientStatementsExportSoldPanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="clientStatementsExportSoldLabel">
                  ${soldButtons}
                </div>
              </details>
              <select id="clientStatementsExportSold" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
                ${soldSelectOptions}
              </select>
            </div>
          </label>
        </div>
        <div class="report-tax-date-range__selectors report-tax-date-range__selectors--triple">
          <label class="report-tax-date-range__selector">
            <span id="clientStatementsExportPresetLabel">Selection</span>
            <div class="report-tax-date-range__controls">
              <details id="clientStatementsExportPresetMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="clientStatementsExportPresetLabel clientStatementsExportPresetDisplay">
                  <span id="clientStatementsExportPresetDisplay" class="model-select-display"></span>
                  ${FIELD_TOGGLE_CHEVRON_SVG}
                </summary>
                <div id="clientStatementsExportPresetPanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="clientStatementsExportPresetLabel">
                  ${presetButtons}
                </div>
              </details>
              <select id="clientStatementsExportPreset" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
                ${presetSelectOptions}
              </select>
            </div>
          </label>
          <label class="report-tax-date-range__selector">
            <span>Date debut</span>
            <div class="swb-date-picker" data-date-picker>
              <input
                id="clientStatementsExportStart"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-JJ"
                autocomplete="off"
                spellcheck="false"
                aria-haspopup="dialog"
                aria-expanded="false"
                role="combobox"
                aria-controls="clientStatementsExportStartPanel"
              >
              <button
                type="button"
                class="swb-date-picker__toggle"
                data-date-picker-toggle
                aria-label="Choisir une date"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="clientStatementsExportStartPanel"
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
                id="clientStatementsExportStartPanel"
              ></div>
            </div>
          </label>
          <label class="report-tax-date-range__selector">
            <span>Date fin</span>
            <div class="swb-date-picker" data-date-picker>
              <input
                id="clientStatementsExportEnd"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-JJ"
                autocomplete="off"
                spellcheck="false"
                aria-haspopup="dialog"
                aria-expanded="false"
                role="combobox"
                aria-controls="clientStatementsExportEndPanel"
              >
              <button
                type="button"
                class="swb-date-picker__toggle"
                data-date-picker-toggle
                aria-label="Choisir une date"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="clientStatementsExportEndPanel"
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
                id="clientStatementsExportEndPanel"
              ></div>
            </div>
          </label>
        </div>
        <p id="clientStatementsExportHint" class="report-tax-date-range__hint" hidden></p>
      `;
      container.appendChild(wrapper);

      scopeSelect = wrapper.querySelector("#clientStatementsExportScope");
      presetSelect = wrapper.querySelector("#clientStatementsExportPreset");
      scopeMenu = wrapper.querySelector("#clientStatementsExportScopeMenu");
      scopeSummary = scopeMenu?.querySelector("summary") || null;
      scopeDisplay = wrapper.querySelector("#clientStatementsExportScopeDisplay");
      scopePanel = wrapper.querySelector("#clientStatementsExportScopePanel");
      soldSelect = wrapper.querySelector("#clientStatementsExportSold");
      soldMenu = wrapper.querySelector("#clientStatementsExportSoldMenu");
      soldSummary = soldMenu?.querySelector("summary") || null;
      soldDisplay = wrapper.querySelector("#clientStatementsExportSoldDisplay");
      soldPanel = wrapper.querySelector("#clientStatementsExportSoldPanel");
      presetMenu = wrapper.querySelector("#clientStatementsExportPresetMenu");
      presetSummary = presetMenu?.querySelector("summary") || null;
      presetDisplay = wrapper.querySelector("#clientStatementsExportPresetDisplay");
      presetPanel = wrapper.querySelector("#clientStatementsExportPresetPanel");
      startInput = wrapper.querySelector("#clientStatementsExportStart");
      endInput = wrapper.querySelector("#clientStatementsExportEnd");
      hintEl = wrapper.querySelector("#clientStatementsExportHint");
      infoEl = wrapper.querySelector("#clientStatementsExportInfo");
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
      if (soldSelect) soldSelect.value = state.sold;
      if (presetSelect) presetSelect.value = state.preset;

      syncMenuSelection({
        select: scopeSelect,
        display: scopeDisplay,
        panel: scopePanel,
        options: SCOPE_OPTIONS,
        dataAttribute: "data-client-statements-export-scope",
        value: state.scope
      });
      syncMenuSelection({
        select: soldSelect,
        display: soldDisplay,
        panel: soldPanel,
        options: SOLD_OPTIONS,
        dataAttribute: "data-client-statements-export-sold",
        value: state.sold
      });
      syncMenuSelection({
        select: presetSelect,
        display: presetDisplay,
        panel: presetPanel,
        options: PRESET_OPTIONS,
        dataAttribute: "data-client-statements-export-preset",
        value: state.preset
      });

      addListener(scopeSelect, "change", () => {
        state.scope = syncMenuSelection({
          select: scopeSelect,
          display: scopeDisplay,
          panel: scopePanel,
          options: SCOPE_OPTIONS,
          dataAttribute: "data-client-statements-export-scope",
          value: scopeSelect?.value || "modal-filters"
        });
        updateScopeInfo();
      });
      addListener(soldSelect, "change", () => {
        state.sold = syncMenuSelection({
          select: soldSelect,
          display: soldDisplay,
          panel: soldPanel,
          options: SOLD_OPTIONS,
          dataAttribute: "data-client-statements-export-sold",
          value: soldSelect?.value || ""
        });
        updateScopeInfo();
      });
      addListener(presetSelect, "change", applyPreset);
      addListener(startInput, "input", setOkState);
      addListener(endInput, "input", setOkState);

      wireMenuDropdown({
        menu: scopeMenu,
        summary: scopeSummary,
        panel: scopePanel,
        select: scopeSelect,
        display: scopeDisplay,
        options: SCOPE_OPTIONS,
        dataAttribute: "data-client-statements-export-scope",
        onChange: (value) => {
          state.scope = String(value || "modal-filters").trim();
          syncMenuSelection({
            select: scopeSelect,
            display: scopeDisplay,
            panel: scopePanel,
            options: SCOPE_OPTIONS,
            dataAttribute: "data-client-statements-export-scope",
            value: state.scope
          });
          updateScopeInfo();
        }
      });
      wireMenuDropdown({
        menu: soldMenu,
        summary: soldSummary,
        panel: soldPanel,
        select: soldSelect,
        display: soldDisplay,
        options: SOLD_OPTIONS,
        dataAttribute: "data-client-statements-export-sold",
        onChange: (value) => {
          state.sold = normalizeSoldFilterValue(value);
          syncMenuSelection({
            select: soldSelect,
            display: soldDisplay,
            panel: soldPanel,
            options: SOLD_OPTIONS,
            dataAttribute: "data-client-statements-export-sold",
            value: state.sold
          });
          updateScopeInfo();
        }
      });
      wireMenuDropdown({
        menu: presetMenu,
        summary: presetSummary,
        panel: presetPanel,
        select: presetSelect,
        display: presetDisplay,
        options: PRESET_OPTIONS,
        dataAttribute: "data-client-statements-export-preset",
        onChange: (value) => {
          state.preset = String(value || "custom").trim();
          syncMenuSelection({
            select: presetSelect,
            display: presetDisplay,
            panel: presetPanel,
            options: PRESET_OPTIONS,
            dataAttribute: "data-client-statements-export-preset",
            value: state.preset
          });
          applyPreset();
        }
      });

      addListener(dialogDoc, "click", (evt) => {
        const target = evt.target;
        if (!(target instanceof Element)) return;
        if (scopeMenu?.open && !scopeMenu.contains(target)) {
          setMenuOpenState(scopeMenu, false);
        }
        if (soldMenu?.open && !soldMenu.contains(target)) {
          setMenuOpenState(soldMenu, false);
        }
        if (presetMenu?.open && !presetMenu.contains(target)) {
          setMenuOpenState(presetMenu, false);
        }
      });

      updateScopeInfo();
      applyPreset();
    };

    const confirmed = await w.showConfirm("Configuration export", {
      title: "Solde clients",
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
      soldFilter: normalizeSoldFilterValue(state.sold),
      startDate,
      endDate
    };
  };

  AppInit.ClientStatementsExportDialog = {
    openClientStatementsExportDialog
  };
})(window);
