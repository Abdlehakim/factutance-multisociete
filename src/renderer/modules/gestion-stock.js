(function (w) {
  const SEM = (w.SEM = w.SEM || {});

  const EMPTY_DEPOT_VALUE = "";
  const DEPOT_PLACEHOLDER_LABEL = "Selectionner un depot";
  const EMPTY_LOCATION_VALUE = "";
  const LOCATION_PLACEHOLDER_LABEL = "Selectionner un emplacement";
  const LOCATION_EMPTY_LABEL = "Aucun emplacement enregistre";
  const ADD_SCOPE_SELECTOR = "#addItemBox, #addItemBoxMainscreen, #articleFormPopover";
  let depotRecords = [];

  const normalizeEmplacementRecord = (entry = {}, depotIdHint = "") => {
    const row = entry && typeof entry === "object" ? entry : { code: entry };
    const id = String(
      row.id ||
        row.value ||
        row.emplacementId ||
        row.emplacement_id ||
        row.path?.replace?.(/^sqlite:\/\/emplacements\//i, "") ||
        ""
    ).trim();
    const code = String(row.code || row.name || row.label || row.value || "").trim();
    const depotId = String(row.depotId || row.depot_id || depotIdHint || "").trim();
    if (!id && !code) return null;
    return {
      id: id || code,
      depotId,
      code: code || id
    };
  };

  const normalizeEmplacementRecords = (entries = [], depotIdHint = "") => {
    const source = Array.isArray(entries) ? entries : [];
    const byId = new Set();
    const byCode = new Set();
    const normalized = [];
    source.forEach((entry) => {
      const record = normalizeEmplacementRecord(entry, depotIdHint);
      if (!record) return;
      const idKey = String(record.id || "").toLowerCase();
      const codeKey = String(record.code || "").toLowerCase();
      if (!idKey && !codeKey) return;
      if (idKey && byId.has(idKey)) return;
      if (!idKey && codeKey && byCode.has(codeKey)) return;
      if (idKey) byId.add(idKey);
      if (codeKey) byCode.add(codeKey);
      normalized.push(record);
    });
    return normalized;
  };

  const normalizeDepotRecord = (record = {}) => {
    const source = record && typeof record === "object" ? record : {};
    const id = String(
      source.id ||
        source.value ||
        source.depotId ||
        source.path?.replace?.(/^sqlite:\/\/depots\//i, "") ||
        ""
    ).trim();
    const name = String(source.name || source.label || source.title || "").trim();
    const emplacements = normalizeEmplacementRecords(source.emplacements, id);
    if (!id) return null;
    return {
      id,
      name: name || id,
      emplacements
    };
  };

  const normalizeDepotRecords = (records = []) => {
    const source = Array.isArray(records) ? records : [];
    const map = new Map();
    source.forEach((entry) => {
      const normalized = normalizeDepotRecord(entry);
      if (!normalized) return;
      if (map.has(normalized.id)) return;
      map.set(normalized.id, normalized);
    });
    return Array.from(map.values());
  };

  const getDepotById = (depotId) => {
    const target = String(depotId || "").trim();
    if (!target) return null;
    return depotRecords.find((entry) => entry.id === target) || null;
  };

  const toScopeNode = (node) => {
    if (!(node instanceof HTMLElement)) return null;
    if (node.matches?.(ADD_SCOPE_SELECTOR)) return node;
    return typeof node.closest === "function" ? node.closest(ADD_SCOPE_SELECTOR) : null;
  };

  const resolveScope = (scopeHint = null) => {
    const hinted = toScopeNode(scopeHint);
    if (hinted) return hinted;
    if (typeof SEM.resolveAddFormScope === "function") {
      const active = toScopeNode(SEM.resolveAddFormScope());
      if (active) return active;
    }
    if (typeof document === "undefined") return null;
    return (
      document.querySelector("#articleFormPopover:not([hidden])") ||
      document.getElementById("articleFormPopover") ||
      document.getElementById("addItemBoxMainscreen") ||
      document.getElementById("addItemBox")
    );
  };

  const getField = (scope, id) => {
    const scoped = scope?.querySelector?.(`#${id}`) || null;
    if (scoped) return scoped;
    if (typeof w.getEl === "function") return w.getEl(id);
    if (typeof document !== "undefined") return document.getElementById(id);
    return null;
  };

  const getNumValue = (field, fallback = 0) => {
    if (!field) return fallback;
    const raw = String(field.value ?? "").replace(",", ".").trim();
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  };

  const parseOptionalNumber = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).replace(",", ".").trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const setFieldValue = (field, value) => {
    if (!field) return;
    field.value = value ?? "";
  };

  const setDisabledState = (field, disabled) => {
    if (!(field instanceof HTMLElement)) return;
    field.disabled = !!disabled;
    field.setAttribute("aria-disabled", disabled ? "true" : "false");
  };

  const resolvePopover = (scope) => {
    if (scope?.id === "articleFormPopover") return scope;
    return scope?.closest?.("#articleFormPopover") || null;
  };

  const isViewMode = (scope) => {
    const popover = resolvePopover(scope);
    return String(popover?.dataset?.articleFormMode || "").toLowerCase() === "view";
  };

  const isPreviewMode = (scope) => {
    const popover = resolvePopover(scope);
    return String(popover?.dataset?.mode || "").toLowerCase() === "preview";
  };

  const getFields = (scope) => ({
    layout: scope?.querySelector?.("[data-stock-management-layout]") || null,
    panel:
      getField(scope, "addStockManagementPanel") ||
      scope?.querySelector?.("[data-stock-management-panel]") ||
      null,
    qty: getField(scope, "addStockQty"),
    purchasePrice: getField(scope, "addPurchasePrice"),
    salesPrice: getField(scope, "addPrice"),
    unit: getField(scope, "addUnit"),
    defaultDepot: getField(scope, "addStockDefaultDepot"),
    defaultDepotMenu: getField(scope, "addStockDefaultDepotMenu"),
    defaultDepotPanel: getField(scope, "addStockDefaultDepotPanel"),
    defaultDepotDisplay: getField(scope, "addStockDefaultDepotDisplay"),
    defaultLocation: getField(scope, "addStockDefaultLocation"),
    defaultLocationMenu: getField(scope, "addStockDefaultLocationMenu"),
    defaultLocationPanel: getField(scope, "addStockDefaultLocationPanel"),
    defaultLocationDisplay: getField(scope, "addStockDefaultLocationDisplay"),
    allowNegative: getField(scope, "addStockAllowNegative"),
    blockInsufficient: getField(scope, "addStockBlockInsufficient"),
    alert: getField(scope, "addStockAlert"),
    min: getField(scope, "addStockMin"),
    max: getField(scope, "addStockMax"),
    unitDisplay: getField(scope, "addStockUnitDisplay"),
    availableDisplay: getField(scope, "addStockAvailableDisplay"),
    totalCostAchat: getField(scope, "addStockTotalCostAchat"),
    totalValueVente: getField(scope, "addStockTotalValueVente"),
  });

  const getMoneyDecimals = () => {
    const currency = String(SEM?.state?.meta?.currency || "DT").trim().toUpperCase();
    return currency === "DT" ? 3 : 2;
  };

  const formatMoneyValue = (value) => {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return safe.toFixed(getMoneyDecimals());
  };

  const getOptionLabel = (option) =>
    String(option?.textContent || option?.label || option?.value || "")
      .replace(/\s+/g, " ")
      .trim();

  const setSelectOptions = (select, valueHint = "") => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;
    const preferredValue = String(valueHint || select.value || "").trim();
    const options = [
      {
        value: EMPTY_DEPOT_VALUE,
        label: DEPOT_PLACEHOLDER_LABEL
      },
      ...depotRecords.map((entry) => ({
      value: entry.id,
      label: entry.name || entry.id
      }))
    ];

    const currentSerialized = Array.from(select.options || [])
      .map((entry) => `${entry.value}::${entry.textContent}`)
      .join("||");
    const nextSerialized = options.map((entry) => `${entry.value}::${entry.label}`).join("||");
    if (currentSerialized !== nextSerialized) {
      select.replaceChildren();
      options.forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      });
    }
    const fallbackValue = options[0]?.value || EMPTY_DEPOT_VALUE;
    select.value = preferredValue && options.some((entry) => entry.value === preferredValue)
      ? preferredValue
      : fallbackValue;
  };

  const setLocationSelectOptions = (select, entries = [], valueHint = "") => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;
    const preferredValue = String(valueHint || select.value || "").trim();
    const normalizedEntries = normalizeEmplacementRecords(entries);
    const options = [
      {
        value: EMPTY_LOCATION_VALUE,
        label: LOCATION_PLACEHOLDER_LABEL
      },
      ...normalizedEntries.map((entry) => ({
        value: entry.id,
        label: entry.code,
        record: entry
      }))
    ];

    const currentSerialized = Array.from(select.options || [])
      .map((entry) => `${entry.value}::${entry.textContent}`)
      .join("||");
    const nextSerialized = options.map((entry) => `${entry.value}::${entry.label}`).join("||");
    if (currentSerialized !== nextSerialized) {
      select.replaceChildren();
      options.forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        if (entry.record?.code) option.dataset.code = entry.record.code;
        if (entry.record?.depotId) option.dataset.depotId = entry.record.depotId;
        select.appendChild(option);
      });
    }
    const fallbackValue = options[0]?.value || EMPTY_LOCATION_VALUE;
    select.value = preferredValue && options.some((entry) => entry.value === preferredValue)
      ? preferredValue
      : fallbackValue;
  };

  const updateDepotEmplacements = (depotId, emplacements = []) => {
    const target = String(depotId || "").trim();
    if (!target) return;
    const normalized = normalizeEmplacementRecords(emplacements, target);
    let touched = false;
    const next = depotRecords.map((entry) => {
      if (entry.id !== target) return entry;
      touched = true;
      return { ...entry, emplacements: normalized };
    });
    if (!touched) {
      next.push({
        id: target,
        name: target,
        emplacements: normalized
      });
    }
    depotRecords = next;
  };

  const fetchEmplacementsByDepot = async (depotId) => {
    const target = String(depotId || "").trim();
    if (!target || !w.electronAPI?.listEmplacementsByDepot) {
      return getDepotById(target)?.emplacements || [];
    }
    try {
      const response = await w.electronAPI.listEmplacementsByDepot({ depotId: target });
      if (response?.ok && Array.isArray(response.results)) {
        updateDepotEmplacements(target, response.results);
        return getDepotById(target)?.emplacements || [];
      }
    } catch {}
    return getDepotById(target)?.emplacements || [];
  };

  const closePickerMenu = (menu) => {
    if (!(menu instanceof HTMLElement)) return;
    menu.removeAttribute("open");
    menu.querySelector("summary")?.setAttribute("aria-expanded", "false");
  };

  const wireDepotPickerMenu = (scope) => {
    const fields = getFields(scope);
    const menu = fields.defaultDepotMenu;
    if (!(menu instanceof HTMLElement) || menu.dataset.stockWired === "1") return;
    const summary = menu.querySelector("summary");
    if (!(summary instanceof HTMLElement)) return;
    menu.dataset.stockWired = "1";
    summary.setAttribute("aria-expanded", menu.hasAttribute("open") ? "true" : "false");
    menu.addEventListener("toggle", () => {
      const disabled = menu.dataset.disabled === "true";
      if (disabled && menu.hasAttribute("open")) {
        closePickerMenu(menu);
        return;
      }
      const isOpen = menu.hasAttribute("open");
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        fields.defaultDepotPanel?.querySelector?.(".model-select-option:not([disabled])")?.focus?.();
      } else {
        summary.focus?.();
      }
    });
    summary.addEventListener("click", (event) => {
      if (menu.dataset.disabled !== "true") return;
      event.preventDefault();
      event.stopPropagation();
    });
    fields.defaultDepotPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePickerMenu(menu);
      summary.focus?.();
    });
  };

  const wireLocationPickerMenu = (scope) => {
    const fields = getFields(scope);
    const menu = fields.defaultLocationMenu;
    if (!(menu instanceof HTMLElement) || menu.dataset.stockLocationWired === "1") return;
    const summary = menu.querySelector("summary");
    if (!(summary instanceof HTMLElement)) return;
    menu.dataset.stockLocationWired = "1";
    summary.setAttribute("aria-expanded", menu.hasAttribute("open") ? "true" : "false");
    menu.addEventListener("toggle", () => {
      const disabled = menu.dataset.disabled === "true";
      if (disabled && menu.hasAttribute("open")) {
        closePickerMenu(menu);
        return;
      }
      const isOpen = menu.hasAttribute("open");
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        fields.defaultLocationPanel?.querySelector?.(".model-select-option:not([disabled])")?.focus?.();
      } else {
        summary.focus?.();
      }
    });
    summary.addEventListener("click", (event) => {
      if (menu.dataset.disabled !== "true") return;
      event.preventDefault();
      event.stopPropagation();
    });
    fields.defaultLocationPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePickerMenu(menu);
      summary.focus?.();
    });
  };

  const syncDepotPicker = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const select = fields.defaultDepot;
    const menu = fields.defaultDepotMenu;
    const panel = fields.defaultDepotPanel;
    const display = fields.defaultDepotDisplay;
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;
    setSelectOptions(select, select.value);

    wireDepotPickerMenu(scope);

    const selectedOption =
      (select.selectedOptions && select.selectedOptions.length ? select.selectedOptions[0] : null) ||
      Array.from(select.options || []).find((option) => option.value === select.value) ||
      null;
    const hasSelectedDepot =
      !!(selectedOption && String(selectedOption.value || "").trim());
    const selectedLabel =
      (hasSelectedDepot
        ? getOptionLabel(selectedOption)
        : "") || DEPOT_PLACEHOLDER_LABEL;
    if (display) display.textContent = selectedLabel;
    if (menu instanceof HTMLElement) {
      menu.dataset.selected = hasSelectedDepot ? "true" : "false";
    }
    if (display instanceof HTMLElement) {
      display.dataset.selected = hasSelectedDepot ? "true" : "false";
    }

    if (!(panel instanceof HTMLElement)) return;
    panel.replaceChildren();
    let count = 0;
    Array.from(select.options || []).forEach((option) => {
      if (!option.value) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-select-option";
      button.dataset.value = option.value;
      button.setAttribute("role", "option");
      button.textContent = getOptionLabel(option);
      const isDisabled = !!option.disabled || !!select.disabled;
      button.disabled = isDisabled;
      button.classList.toggle("is-disabled", isDisabled);
      button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      const isActive = option.value === select.value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.addEventListener("click", () => {
        if (button.disabled) return;
        const nextValue = option.value;
        const changed = select.value !== nextValue;
        select.value = nextValue;
        if (display) display.textContent = getOptionLabel(option);
        closePickerMenu(menu);
        if (changed) {
          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        } else {
          syncDepotPicker(scope);
        }
      });
      panel.appendChild(button);
      count += 1;
    });

    if (!count) {
      const empty = document.createElement("p");
      empty.className = "model-select-empty";
      empty.textContent = "Aucun depot enregistre";
      panel.appendChild(empty);
    }
  };

  const syncLocationPicker = (
    scopeHint = null,
    { clearValue = false, forceDisabled = false } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const select = fields.defaultLocation;
    const menu = fields.defaultLocationMenu;
    const panel = fields.defaultLocationPanel;
    const display = fields.defaultLocationDisplay;
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;

    wireLocationPickerMenu(scope);

    const selectedDepotId = String(fields.defaultDepot?.value || "").trim();
    const selectedDepot = getDepotById(selectedDepotId);
    const locationOptions = normalizeEmplacementRecords(
      selectedDepot?.emplacements || [],
      selectedDepotId
    );
    if (clearValue) {
      select.value = EMPTY_LOCATION_VALUE;
    }
    setLocationSelectOptions(select, locationOptions, select.value);
    const shouldDisable = !!forceDisabled || !selectedDepotId || !locationOptions.length;
    setLocationPickerDisabled(fields, shouldDisable);

    const selectedOption =
      (select.selectedOptions && select.selectedOptions.length ? select.selectedOptions[0] : null) ||
      Array.from(select.options || []).find((option) => option.value === select.value) ||
      null;
    const hasSelectedLocation =
      !!(selectedOption && String(selectedOption.value || "").trim());
    const selectedLabel =
      (hasSelectedLocation
        ? getOptionLabel(selectedOption)
        : "") || LOCATION_PLACEHOLDER_LABEL;
    if (display) display.textContent = selectedLabel;
    if (menu instanceof HTMLElement) {
      menu.dataset.selected = hasSelectedLocation ? "true" : "false";
    }
    if (display instanceof HTMLElement) {
      display.dataset.selected = hasSelectedLocation ? "true" : "false";
    }

    if (!(panel instanceof HTMLElement)) return;
    panel.replaceChildren();
    let count = 0;
    Array.from(select.options || []).forEach((option) => {
      if (!option.value) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-select-option";
      button.dataset.value = option.value;
      button.setAttribute("role", "option");
      button.textContent = getOptionLabel(option);
      const isDisabled = !!option.disabled || !!select.disabled;
      button.disabled = isDisabled;
      button.classList.toggle("is-disabled", isDisabled);
      button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      const isActive = option.value === select.value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.addEventListener("click", () => {
        if (button.disabled) return;
        const nextValue = option.value;
        const changed = select.value !== nextValue;
        select.value = nextValue;
        if (display) display.textContent = getOptionLabel(option);
        closePickerMenu(menu);
        if (changed) {
          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        } else {
          setTimeout(() => syncLocationPicker(scope), 0);
        }
      });
      panel.appendChild(button);
      count += 1;
    });

    if (!count) {
      const empty = document.createElement("p");
      empty.className = "model-select-empty";
      empty.textContent = selectedDepotId ? LOCATION_EMPTY_LABEL : "Selectionnez d'abord un depot";
      panel.appendChild(empty);
    }
  };

  const handleDepotSelectionChange = async (
    scopeHint = null,
    { clearLocation = true, preferredLocationId = "" } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const selectedDepotId = String(fields.defaultDepot?.value || "").trim();
    const previousLocationValue = String(
      fields.defaultLocation?.value || preferredLocationId || ""
    ).trim();
    if (!selectedDepotId) {
      syncLocationPicker(scope, { clearValue: clearLocation });
      syncDepotPicker(scope);
      return;
    }
    syncLocationPicker(scope, { clearValue: clearLocation });
    await fetchEmplacementsByDepot(selectedDepotId);
    if (
      !clearLocation &&
      previousLocationValue &&
      !String(fields.defaultLocation?.value || "").trim()
    ) {
      setFieldValue(fields.defaultLocation, previousLocationValue);
    }
    syncLocationPicker(scope, { clearValue: false });
    syncDepotPicker(scope);
  };

  const setDepotPickerDisabled = (fields, disabled) => {
    setDisabledState(fields.defaultDepot, disabled);
    if (!(fields.defaultDepotMenu instanceof HTMLElement)) return;
    const disabledText = disabled ? "true" : "false";
    fields.defaultDepotMenu.dataset.disabled = disabledText;
    const summary = fields.defaultDepotMenu.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.setAttribute("aria-disabled", disabledText);
    }
    if (disabled) {
      closePickerMenu(fields.defaultDepotMenu);
    }
  };

  const setLocationPickerDisabled = (fields, disabled) => {
    setDisabledState(fields.defaultLocation, disabled);
    if (!(fields.defaultLocationMenu instanceof HTMLElement)) return;
    const disabledText = disabled ? "true" : "false";
    fields.defaultLocationMenu.dataset.disabled = disabledText;
    const summary = fields.defaultLocationMenu.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.setAttribute("aria-disabled", disabledText);
    }
    if (disabled) {
      closePickerMenu(fields.defaultLocationMenu);
    }
  };

  const syncReadOnlyInfo = (scope, hints = {}) => {
    const fields = getFields(scope);
    const unitValue =
      hints.unit !== undefined ? String(hints.unit ?? "").trim() : String(fields.unit?.value ?? "").trim();
    const availableValue =
      hints.stockQty !== undefined ? Number(hints.stockQty) : Number(getNumValue(fields.qty, 0));
    const purchasePriceValue =
      hints.purchasePrice !== undefined ? Number(hints.purchasePrice) : Number(getNumValue(fields.purchasePrice, 0));
    const salesPriceValue =
      hints.salesPrice !== undefined ? Number(hints.salesPrice) : Number(getNumValue(fields.salesPrice, 0));
    const normalizedAvailableValue = Number.isFinite(availableValue) ? availableValue : 0;
    const totalCostAchat = normalizedAvailableValue * (Number.isFinite(purchasePriceValue) ? purchasePriceValue : 0);
    const totalValueVente = normalizedAvailableValue * (Number.isFinite(salesPriceValue) ? salesPriceValue : 0);
    if (fields.unitDisplay) fields.unitDisplay.value = unitValue;
    if (fields.availableDisplay) fields.availableDisplay.value = String(normalizedAvailableValue);
    if (fields.totalCostAchat) fields.totalCostAchat.value = formatMoneyValue(totalCostAchat);
    if (fields.totalValueVente) fields.totalValueVente.value = formatMoneyValue(totalValueVente);
  };

  const enforceExclusiveStockOptions = (scopeHint = null, changedField = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    if (!fields.allowNegative || !fields.blockInsufficient) return;
    if (!fields.allowNegative.checked || !fields.blockInsufficient.checked) return;
    if (changedField === fields.blockInsufficient) {
      fields.allowNegative.checked = false;
      return;
    }
    fields.blockInsufficient.checked = false;
  };

  const syncUi = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return null;
    const fields = getFields(scope);
    if (!fields.panel) return null;

    const viewMode = isViewMode(scope);
    const previewMode = isPreviewMode(scope);
    const panelVisible =
      !fields.panel.hidden &&
      fields.panel.closest?.('[role="tabpanel"]')?.hidden !== true;
    const interactive = !viewMode;
    const uiInteractive = interactive || previewMode;

    if (fields.layout) fields.layout.dataset.stockManagementActive = panelVisible ? "true" : "false";
    if (fields.panel) {
      fields.panel.dataset.stockManagementActive = "true";
      fields.panel.setAttribute("aria-disabled", uiInteractive ? "false" : "true");
    }

    [
      fields.allowNegative,
      fields.alert,
      fields.max,
    ].forEach((field) => setDisabledState(field, !uiInteractive));
    setDepotPickerDisabled(fields, !uiInteractive);
    syncDepotPicker(scope);
    syncLocationPicker(scope, { forceDisabled: !uiInteractive });

    const alertEnabled = uiInteractive && !!fields.alert?.checked;
    setDisabledState(fields.min, !alertEnabled);

    setDisabledState(fields.blockInsufficient, !uiInteractive);

    setDisabledState(fields.unitDisplay, true);
    setDisabledState(fields.availableDisplay, true);
    setDisabledState(fields.totalCostAchat, true);
    setDisabledState(fields.totalValueVente, true);
    syncReadOnlyInfo(scope);

    return { scope, panelVisible, interactive };
  };

  const clearForm = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    setFieldValue(fields.defaultDepot, EMPTY_DEPOT_VALUE);
    setFieldValue(fields.defaultLocation, "");
    if (fields.allowNegative) fields.allowNegative.checked = false;
    if (fields.blockInsufficient) fields.blockInsufficient.checked = true;
    if (fields.alert) fields.alert.checked = false;
    setFieldValue(fields.min, "1");
    setFieldValue(fields.max, "");
    syncReadOnlyInfo(scope);
    syncUi(scope);
  };

  const fillToForm = (article = {}, scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const stockManagement =
      article.stockManagement && typeof article.stockManagement === "object" ? article.stockManagement : {};
    const stockAlertResolved = !!(
      stockManagement.alertEnabled ??
      article.stockAlert ??
      article.stockMinAlert
    );
    const stockMinResolved = Number(stockManagement.min ?? article.stockMin);
    const stockMaxResolved = stockManagement.max ?? article.stockMax;
    const allowNegativeResolved = !!stockManagement.allowNegative;
    const blockInsufficientResolved =
      stockManagement.blockInsufficient === undefined || stockManagement.blockInsufficient === null
        ? true
        : !!stockManagement.blockInsufficient;
    const defaultLocationId = String(
      stockManagement.defaultLocationId ??
        stockManagement.defaultEmplacementId ??
        stockManagement.defaultLocation ??
        ""
    ).trim();
    setFieldValue(fields.defaultDepot, stockManagement.defaultDepot ?? EMPTY_DEPOT_VALUE);
    setFieldValue(fields.defaultLocation, defaultLocationId);
    if (fields.allowNegative) fields.allowNegative.checked = allowNegativeResolved;
    if (fields.blockInsufficient) {
      fields.blockInsufficient.checked = blockInsufficientResolved && !allowNegativeResolved;
    }
    if (fields.alert) fields.alert.checked = stockAlertResolved;
    setFieldValue(
      fields.min,
      String(Number.isFinite(stockMinResolved) && stockMinResolved >= 0 ? stockMinResolved : 1)
    );
    setFieldValue(
      fields.max,
      stockMaxResolved === null || stockMaxResolved === undefined ? "" : String(stockMaxResolved)
    );

    syncReadOnlyInfo(scope, {
      unit: article.unit ?? "",
      stockQty: article.stockQty ?? 0,
      purchasePrice: article.purchasePrice ?? 0,
      salesPrice: article.price ?? 0
    });
    syncUi(scope);
    if (defaultLocationId) {
      setFieldValue(fields.defaultLocation, defaultLocationId);
    }
    handleDepotSelectionChange(scope, {
      clearLocation: false,
      preferredLocationId: defaultLocationId
    });
  };

  const captureFromForm = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    const fields = getFields(scope);
    const allowNegative = !!fields.allowNegative?.checked;
    const alertEnabled = !!fields.alert?.checked;
    const min = Math.max(0, getNumValue(fields.min, 1));
    const max = (() => {
      const parsed = parseOptionalNumber(fields.max?.value ?? "");
      return parsed === null ? null : Math.max(0, parsed);
    })();
    const defaultDepot = String(fields.defaultDepot?.value || "").trim();
    const defaultLocationId = String(fields.defaultLocation?.value || "").trim();
    const selectedLocationOption =
      fields.defaultLocation?.selectedOptions?.[0] ||
      Array.from(fields.defaultLocation?.options || []).find(
        (option) => String(option.value || "").trim() === defaultLocationId
      ) ||
      null;
    const defaultLocationCode = defaultLocationId
      ? String(selectedLocationOption?.dataset?.code || selectedLocationOption?.textContent || "").trim()
      : "";
    return {
      stockAlert: alertEnabled,
      stockMin: min,
      stockMax: max,
      stockManagement: {
        enabled: true,
        defaultDepot,
        defaultLocation: defaultLocationId,
        defaultLocationId,
        defaultLocationCode,
        allowNegative,
        blockInsufficient:
          !allowNegative && !!fields.blockInsufficient?.checked,
        alertEnabled,
        min,
        max
      }
    };
  };

  const applyToItem = (item, scopeHint = null) => {
    if (!item || typeof item !== "object") return item;
    const payload = captureFromForm(scopeHint);
    const stockManagement =
      payload.stockManagement && typeof payload.stockManagement === "object"
        ? payload.stockManagement
        : {};
    item.stockAlert = !!payload.stockAlert;
    item.stockMin = Number.isFinite(Number(payload.stockMin)) ? Number(payload.stockMin) : 1;
    item.stockMax = payload.stockMax ?? null;
    item.stockManagement = { ...stockManagement };
    return item;
  };

  const setDepotRecords = (records = [], { sync = true } = {}) => {
    depotRecords = normalizeDepotRecords(records);
    if (!sync || typeof document === "undefined") return depotRecords.slice();
    document.querySelectorAll(ADD_SCOPE_SELECTOR).forEach((scope) => {
      const node = toScopeNode(scope);
      if (!node) return;
      const fields = getFields(node);
      const currentValue = String(fields.defaultDepot?.value || EMPTY_DEPOT_VALUE).trim();
      if (fields.defaultDepot) setSelectOptions(fields.defaultDepot, currentValue);
      syncUi(node);
    });
    return depotRecords.slice();
  };

  const refreshDepotRecords = async () => {
    if (!w.electronAPI?.listDepots) return depotRecords.slice();
    try {
      const response = await w.electronAPI.listDepots();
      if (response?.ok && Array.isArray(response.results)) {
        return setDepotRecords(response.results);
      }
    } catch {}
    return depotRecords.slice();
  };

  const shouldSyncTarget = (target) =>
    target?.matches?.(
      "#addStockAlert, #addStockAllowNegative, #addStockBlockInsufficient"
    );

  const shouldSyncReadOnlyTarget = (target) =>
    target?.matches?.("#addUnit, #addStockQty, #addPurchasePrice, #addPrice");

  const bindEvents = () => {
    if (SEM.__stockWindowEventsBound || typeof document === "undefined") return;
    SEM.__stockWindowEventsBound = true;

    document.addEventListener("change", (evt) => {
      const target = evt?.target;
      if (!(target instanceof HTMLElement)) return;
      const scope = toScopeNode(target);
      if (!scope) return;
      if (target.matches?.("#addStockAllowNegative, #addStockBlockInsufficient")) {
        enforceExclusiveStockOptions(scope, target);
      }
      if (shouldSyncTarget(target)) syncUi(scope);
      if (shouldSyncReadOnlyTarget(target)) syncReadOnlyInfo(scope);
      if (target.matches?.("#addStockDefaultDepot")) {
        handleDepotSelectionChange(scope);
      }
      if (target.matches?.("#addStockDefaultLocation")) {
        setTimeout(() => syncLocationPicker(scope), 0);
      }
    });

    document.addEventListener("input", (evt) => {
      const target = evt?.target;
      if (!(target instanceof HTMLElement)) return;
      const scope = toScopeNode(target);
      if (!scope) return;
      if (target.matches?.("#addStockAllowNegative, #addStockBlockInsufficient")) {
        enforceExclusiveStockOptions(scope, target);
      }
      if (target.matches?.("#addStockAlert, #addStockAllowNegative, #addStockBlockInsufficient")) {
        syncUi(scope);
      }
      if (shouldSyncReadOnlyTarget(target)) syncReadOnlyInfo(scope);
    });

    document.addEventListener("click", (evt) => {
      const target = evt?.target instanceof Element ? evt.target : null;
      if (target) {
        document
          .querySelectorAll(
            "details[id='addStockDefaultDepotMenu'][open], details[id='addStockDefaultLocationMenu'][open]"
          )
          .forEach((menu) => {
          if (menu.contains(target)) return;
          closePickerMenu(menu);
        });
      }
    });
  };

  const init = () => {
    bindEvents();
    depotRecords = normalizeDepotRecords(SEM.depotMagasin?.records || []);
    if (typeof document === "undefined") return;
    document.querySelectorAll(ADD_SCOPE_SELECTOR).forEach((scope) => {
      syncUi(scope);
      handleDepotSelectionChange(scope, { clearLocation: false });
    });
    refreshDepotRecords();
  };

  SEM.stockWindow = {
    resolveScope,
    syncUi,
    clearForm,
    fillToForm,
    captureFromForm,
    applyToItem,
    syncReadOnlyInfo,
    setDepotRecords,
    refreshDepotRecords,
    getDepotRecords: () => depotRecords.slice(),
    init
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
