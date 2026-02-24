(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const isTaxesEnabled = (raw) => {
    const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
    if (normalized === false) return false;
    if (typeof normalized === "string") return !["without", "false", "0"].includes(normalized);
    return true;
  };

  const COLUMN_DEFAULTS = {
    ref: true,
    product: true,
    desc: true,
    qty: true,
    unit: true,
    stockQty: true,
    purchasePrice: false,
    purchaseTva: false,
    price: true,
    fodec: true,
    addFodec: true,
    addPurchaseFodec: false,
    tva: true,
    discount: true,
    totalPurchaseHt: false,
    totalPurchaseTtc: false,
    totalHt: true,
    totalTtc: true
  };
  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const normalizeColumnKey = (raw) => {
    const str = String(raw || "").trim();
    if (!str) return "";
    const cleaned = str.replace(/[^a-zA-Z0-9]+/g, "");
    if (!cleaned) return "";
    return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  };
  const isModelColumnToggle = (input) => {
    if (!input) return false;
    if (typeof input.closest === "function" && input.closest("#modelActionsModal")) return true;
    const id = typeof input.id === "string" ? input.id : "";
    return id.endsWith("Modal");
  };
  const isArticleFieldsModalToggle = (input) =>
    !!(input && typeof input.closest === "function" && input.closest(".article-fields-modal"));
  function readColumnToggleState() {
    const result = {};
    if (typeof document === "undefined" || !document.querySelectorAll) return result;
    document.querySelectorAll("input.col-toggle[data-column-key]").forEach((input) => {
      if (isModelColumnToggle(input)) return;
      if (isArticleFieldsModalToggle(input)) return;
      const key = normalizeColumnKey(input?.dataset?.columnKey);
      if (!key) return;
      result[key] = !!input.checked;
    });
    return result;
  }
  function readModelColumnToggleState() {
    const result = {};
    if (typeof document === "undefined" || !document.querySelectorAll) return result;
    document.querySelectorAll("input.col-toggle[data-column-key]").forEach((input) => {
      if (!isModelColumnToggle(input)) return;
      if (isArticleFieldsModalToggle(input)) return;
      const key = normalizeColumnKey(input?.dataset?.columnKey);
      if (!key) return;
      result[key] = !!input.checked;
    });
    return result;
  }
  function resolveSelectedModelColumns() {
    const st = state();
    const meta = st?.meta || {};
    const sanitize =
      (helpers && typeof helpers.sanitizeModelName === "function" && helpers.sanitizeModelName) ||
      ((value) => String(value ?? "").trim());
    const selected =
      sanitize(meta?.documentModelName || meta?.docDialogModelName || "") ||
      sanitize(meta?.modelName || meta?.modelKey || "");
    if (!selected) return null;
    let entries = [];
    if (typeof SEM.getModelEntries === "function") {
      entries = SEM.getModelEntries();
    } else if (helpers && typeof helpers.getModelList === "function") {
      entries = helpers.getModelList().map((entry) => ({ name: entry?.name, config: entry?.config }));
    }
    const match = Array.isArray(entries)
      ? entries.find((entry) => sanitize(entry?.name) === selected)
      : null;
    const columns = match?.config?.columns;
    return columns && typeof columns === "object" ? columns : null;
  }
  function resolveModelColumnVisibility() {
    const st = state();
    const meta = st?.meta || {};
    const metaColumns = meta && typeof meta.modelColumns === "object" ? meta.modelColumns : null;
    const selectedColumns = resolveSelectedModelColumns();
    const source =
      metaColumns ||
      (selectedColumns && typeof selectedColumns === "object" ? selectedColumns : null);
    const resolved = {};
    Object.keys(COLUMN_DEFAULTS).forEach((key) => {
      if (source && hasOwn(source, key)) resolved[key] = !!source[key];
      else resolved[key] = COLUMN_DEFAULTS[key];
    });
    const resolvedDocType = normalizeDocType(meta?.docType || getStr("docType", "facture"));
    const hasLegacyFodec = !!(source && hasOwn(source, "fodec"));
    const hasSaleFodec = !!(source && hasOwn(source, "fodecSale"));
    const hasPurchaseFodec = !!(source && hasOwn(source, "fodecPurchase"));
    const contextualFallback = hasLegacyFodec
      ? !!source.fodec
      : (COLUMN_DEFAULTS.fodec !== false);
    resolved.fodecSale = hasSaleFodec
      ? !!source.fodecSale
      : hasLegacyFodec
        ? (resolvedDocType === "fa" ? false : contextualFallback)
        : (resolvedDocType === "fa" ? false : contextualFallback);
    resolved.fodecPurchase = hasPurchaseFodec
      ? !!source.fodecPurchase
      : hasLegacyFodec
        ? (resolvedDocType === "fa" ? contextualFallback : false)
        : (resolvedDocType === "fa" ? contextualFallback : false);
    if (!hasLegacyFodec) {
      resolved.fodec = resolvedDocType === "fa" ? resolved.fodecPurchase : resolved.fodecSale;
    }
    if (meta && source) meta.modelColumns = { ...resolved };
    return resolved;
  }
  function resolveColumnVisibility() {
    const explicitColumns =
      typeof SEM.getArticleFieldVisibility === "function" ? SEM.getArticleFieldVisibility() : null;
    const st = state();
    const metaColumns = st?.meta && typeof st.meta.columns === "object" ? st.meta.columns : {};
    const toggleColumns = explicitColumns && typeof explicitColumns === "object" ? {} : readColumnToggleState();
    const resolved = {};
    Object.keys(COLUMN_DEFAULTS).forEach((key) => {
      if (explicitColumns && hasOwn(explicitColumns, key)) resolved[key] = !!explicitColumns[key];
      else if (hasOwn(toggleColumns, key)) resolved[key] = !!toggleColumns[key];
      else if (hasOwn(metaColumns, key)) resolved[key] = !!metaColumns[key];
      else resolved[key] = COLUMN_DEFAULTS[key];
    });
    if (explicitColumns && hasOwn(explicitColumns, "purchaseSectionEnabled")) {
      resolved.purchaseSectionEnabled = !!explicitColumns.purchaseSectionEnabled;
    } else if (hasOwn(metaColumns, "purchaseSectionEnabled")) {
      resolved.purchaseSectionEnabled = !!metaColumns.purchaseSectionEnabled;
    } else {
      resolved.purchaseSectionEnabled = true;
    }
    if (explicitColumns && hasOwn(explicitColumns, "salesSectionEnabled")) {
      resolved.salesSectionEnabled = !!explicitColumns.salesSectionEnabled;
    } else if (hasOwn(metaColumns, "salesSectionEnabled")) {
      resolved.salesSectionEnabled = !!metaColumns.salesSectionEnabled;
    } else {
      resolved.salesSectionEnabled = true;
    }
    if (st?.meta) st.meta.columns = { ...resolved };
    return resolved;
  }

  function getItemsSectionElement() {
    return getEl("itemsSection");
  }

  function getItemsScopedEl(id) {
    const section = getItemsSectionElement();
    const scoped = section?.querySelector?.(`#${id}`) || null;
    return scoped || getEl(id);
  }

  function queryItemsScoped(selector) {
    const section = getItemsSectionElement();
    const scoped = section?.querySelector?.(selector) || null;
    if (scoped) return scoped;
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return null;
    return document.querySelector(selector);
  }

  const DEFAULT_ITEMS_HEADER_COLOR = "#15335e";
  const ITEMS_HEADER_SWATCHES = ["#15335e", "#0ea5e9", "#10b981", "#eab308", "#ef4444", "#6b7280"];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const hexToRgb = (hex) => {
    const normalized = normalizeItemsHeaderColor(hex);
    if (!normalized) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16)
    };
  };
  const rgbToHex = ({ r, g, b }) => {
    const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  const hexToHsv = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60;
      else if (max === gN) h = ((bN - rN) / d + 2) * 60;
      else h = ((rN - gN) / d + 4) * 60;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
  };
  const hsvToHex = ({ h, s, v }) => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
  };
  const hexToHsl = (hex) => {
    const normalized = normalizeItemsHeaderColor(hex);
    if (!normalized) return { h: 0, s: 0, l: 0 };
    let r = parseInt(normalized.slice(1, 3), 16) / 255;
    let g = parseInt(normalized.slice(3, 5), 16) / 255;
    let b = parseInt(normalized.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / d + 2) * 60;
          break;
        default:
          h = ((r - g) / d + 4) * 60;
      }
    }
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  };
  const hslToHex = ({ h, s, l }) => {
    const S = clamp(s, 0, 100) / 100;
    const L = clamp(l, 0, 100) / 100;
    const C = (1 - Math.abs(2 * L - 1)) * S;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - C / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) [r, g, b] = [C, X, 0];
    else if (60 <= h && h < 120) [r, g, b] = [X, C, 0];
    else if (120 <= h && h < 180) [r, g, b] = [0, C, X];
    else if (180 <= h && h < 240) [r, g, b] = [0, X, C];
    else if (240 <= h && h < 300) [r, g, b] = [X, 0, C];
    else [r, g, b] = [C, 0, X];
    const toHex = (v) => Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  const normalizeItemsHeaderColor = (value) => {
    if (value === undefined || value === null) return "";
    const str = String(value).trim();
    if (!str) return "";
    const hex = str.startsWith("#") ? str.slice(1) : str;
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex
        .split("")
        .map((c) => `${c}${c}`)
        .join("")
        .toLowerCase()}`;
    }
    return "";
  };
  const readCssHexVar = (name) => {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
      return normalizeItemsHeaderColor(raw);
    } catch {
      return "";
    }
  };
  let initialItemsHeaderColor = "";
  const getStoredInitialItemsHeaderColor = () => normalizeItemsHeaderColor(initialItemsHeaderColor);
  const setInitialItemsHeaderColor = (value) => {
    const normalized = normalizeItemsHeaderColor(value);
    if (normalized) initialItemsHeaderColor = normalized;
    return getStoredInitialItemsHeaderColor();
  };
  const resolveInitialItemsHeaderColor = () =>
    getStoredInitialItemsHeaderColor() ||
    normalizeItemsHeaderColor(state()?.meta?.itemsHeaderColor) ||
    readCssHexVar("--items-head-bg") ||
    readCssHexVar("--primary") ||
    DEFAULT_ITEMS_HEADER_COLOR;
  const getDefaultItemsHeaderColor = () => resolveInitialItemsHeaderColor();
  const pickerState = { h: 180, s: 1, v: 1 };
  const setHueBg = (h) => {
    const area = getEl("itemsPickerArea");
    if (area) area.style.setProperty("--picker-hue", `hsl(${h}, 100%, 50%)`);
    const hueBar = getEl("itemsPickerHueBar");
    if (hueBar) hueBar.style.setProperty("--hue-x", `${(h / 360) * 100}%`);
  };
  const positionPickerThumb = () => {
    const thumb = getEl("itemsPickerThumb");
    if (thumb) {
      thumb.style.left = `${pickerState.s * 100}%`;
      thumb.style.top = `${(1 - pickerState.v) * 100}%`;
    }
  };
  function syncItemsColorResetButton(currentColor) {
    const resetBtn = getEl("itemsColorReset");
    if (!resetBtn) return;
    const baseline = resolveInitialItemsHeaderColor();
    const normalizedCurrent =
      normalizeItemsHeaderColor(currentColor) ||
      normalizeItemsHeaderColor(state()?.meta?.itemsHeaderColor) ||
      baseline;
    const isDirty = !!baseline && !!normalizedCurrent && baseline !== normalizedCurrent;
    resetBtn.disabled = !isDirty;
  }
  function applyItemsHeaderColor(value, options = {}) {
    const { setBaseline = false } = options || {};
    const prevColor = normalizeItemsHeaderColor(state()?.meta?.itemsHeaderColor);
    const normalized = normalizeItemsHeaderColor(value) || getDefaultItemsHeaderColor();
    if (setBaseline || !getStoredInitialItemsHeaderColor()) {
      setInitialItemsHeaderColor(normalized);
    }
    const root = document.documentElement;
    if (root && normalized) {
      root.style.setProperty("--items-head-bg", normalized);
    }
    if (state()?.meta) {
      state().meta.itemsHeaderColor = normalized;
    }
    const { h, s, v } = hexToHsv(normalized);
    pickerState.h = h;
    pickerState.s = s;
    pickerState.v = v;
    setHueBg(h);
    positionPickerThumb();
    syncItemsHeaderColorUi(normalized);
    syncItemsColorResetButton(normalized);
    const colorChanged =
      !!prevColor && !!normalized && prevColor !== normalized && !setBaseline;
    if (colorChanged && typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("itemsHeaderColorChanged", {
          bubbles: true,
          detail: { color: normalized, previous: prevColor }
        })
      );
    }
    return normalized;
  }
  function syncItemsHeaderColorUi(color) {
    const normalized = normalizeItemsHeaderColor(color);
    const input = getEl("itemsHeaderColor");
    if (input && normalized && input.value.toLowerCase() !== normalized.toLowerCase()) {
      input.value = normalized;
    }
    const hexInput = getEl("itemsHeaderHex");
    if (hexInput && normalized && hexInput.value.toLowerCase() !== normalized.toLowerCase()) {
      hexInput.value = normalized;
    }
    const swatches = Array.from(document.querySelectorAll?.("[data-items-color-swatch]") || []);
    swatches.forEach((btn) => {
      const swatchColor = normalizeItemsHeaderColor(btn.dataset.itemsColorSwatch);
      const isActive = normalized && swatchColor && swatchColor === normalized;
      btn.classList.toggle("is-active", isActive);
    });
  }
  function wireItemsHeaderColorPicker() {
    if (SEM._itemsHeaderColorWired) return;
    const input = getEl("itemsHeaderColor");
    const area = getEl("itemsPickerArea");
    const hueBar = getEl("itemsPickerHueBar");
    if (!input || !area) return;
    SEM._itemsHeaderColorWired = true;
    const initialResolved =
      normalizeItemsHeaderColor(input.value) ||
      resolveInitialItemsHeaderColor();
    setInitialItemsHeaderColor(initialResolved);
    const handleInput = (event) => {
      applyItemsHeaderColor(event?.target?.value);
    };
    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    const hexInput = getEl("itemsHeaderHex");
    if (hexInput) {
      const handleHexInput = (event) => {
        const normalized = normalizeItemsHeaderColor(event?.target?.value);
        if (normalized) applyItemsHeaderColor(normalized);
      };
      hexInput.addEventListener("input", handleHexInput);
      hexInput.addEventListener("change", handleHexInput);
    }
    const resetBtn = getEl("itemsColorReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const baseline = resolveInitialItemsHeaderColor();
        applyItemsHeaderColor(baseline, { setBaseline: true });
      });
    }
    const swatches = Array.from(document.querySelectorAll?.("[data-items-color-swatch]") || []);
    swatches.forEach((btn) => {
      btn.addEventListener("click", () => {
        const swatchColor = normalizeItemsHeaderColor(btn.dataset.itemsColorSwatch);
        if (swatchColor) applyItemsHeaderColor(swatchColor);
      });
    });
    const setColorFromSV = (clientX, clientY) => {
      const rect = area.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);
      pickerState.s = rect.width ? x / rect.width : pickerState.s;
      pickerState.v = rect.height ? 1 - y / rect.height : pickerState.v;
      const hex = hsvToHex(pickerState);
      applyItemsHeaderColor(hex);
    };
    let draggingArea = false;
    area.addEventListener("pointerdown", (event) => {
      draggingArea = true;
      setColorFromSV(event.clientX, event.clientY);
      event.preventDefault();
    });
    window.addEventListener("pointermove", (event) => {
      if (draggingArea) setColorFromSV(event.clientX, event.clientY);
    });
    window.addEventListener("pointerup", () => {
      draggingArea = false;
    });
    const setHueFromX = (clientX) => {
      if (!hueBar) return;
      const rect = hueBar.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const pct = rect.width ? x / rect.width : 0;
      pickerState.h = pct * 360;
      setHueBg(pickerState.h);
      const hex = hsvToHex(pickerState);
      applyItemsHeaderColor(hex);
    };
    if (hueBar) {
      let draggingHue = false;
      hueBar.addEventListener("pointerdown", (event) => {
        draggingHue = true;
        setHueFromX(event.clientX);
        event.preventDefault();
      });
      window.addEventListener("pointermove", (event) => {
        if (draggingHue) setHueFromX(event.clientX);
      });
      window.addEventListener("pointerup", () => {
        draggingHue = false;
      });
    }
    const initialHex = input.value || getDefaultItemsHeaderColor();
    applyItemsHeaderColor(initialHex, { setBaseline: true });
  }

  let initialModelItemsHeaderColor = "";
  const getStoredInitialModelItemsHeaderColor = () => normalizeItemsHeaderColor(initialModelItemsHeaderColor);
  const setInitialModelItemsHeaderColor = (value) => {
    const normalized = normalizeItemsHeaderColor(value);
    if (normalized) initialModelItemsHeaderColor = normalized;
    return getStoredInitialModelItemsHeaderColor();
  };
  const resolveInitialModelItemsHeaderColor = () =>
    getStoredInitialModelItemsHeaderColor() ||
    normalizeItemsHeaderColor(getEl("modelItemsHeaderColor")?.value) ||
    normalizeItemsHeaderColor(getEl("modelItemsHeaderHex")?.value) ||
    normalizeItemsHeaderColor(state()?.meta?.itemsHeaderColor) ||
    readCssHexVar("--items-head-bg") ||
    readCssHexVar("--primary") ||
    DEFAULT_ITEMS_HEADER_COLOR;
  const modelPickerState = { h: 180, s: 1, v: 1 };
  const setModelHueBg = (h) => {
    const area = getEl("modelItemsPickerArea");
    if (area) area.style.setProperty("--picker-hue", `hsl(${h}, 100%, 50%)`);
    const hueBar = getEl("modelItemsPickerHueBar");
    if (hueBar) hueBar.style.setProperty("--hue-x", `${(h / 360) * 100}%`);
  };
  const positionModelPickerThumb = () => {
    const thumb = getEl("modelItemsPickerThumb");
    if (thumb) {
      thumb.style.left = `${modelPickerState.s * 100}%`;
      thumb.style.top = `${(1 - modelPickerState.v) * 100}%`;
    }
  };
  function syncModelItemsColorResetButton(currentColor) {
    const resetBtn = getEl("modelItemsColorReset");
    if (!resetBtn) return;
    const baseline = resolveInitialModelItemsHeaderColor();
    const normalizedCurrent =
      normalizeItemsHeaderColor(currentColor) ||
      normalizeItemsHeaderColor(getEl("modelItemsHeaderColor")?.value) ||
      normalizeItemsHeaderColor(getEl("modelItemsHeaderHex")?.value) ||
      baseline;
    const isDirty = !!baseline && !!normalizedCurrent && baseline !== normalizedCurrent;
    resetBtn.disabled = !isDirty;
  }
  function syncModelItemsHeaderColorUi(color) {
    const normalized = normalizeItemsHeaderColor(color);
    const input = getEl("modelItemsHeaderColor");
    if (input && normalized && input.value.toLowerCase() !== normalized.toLowerCase()) {
      input.value = normalized;
    }
    const hexInput = getEl("modelItemsHeaderHex");
    if (hexInput && normalized && hexInput.value.toLowerCase() !== normalized.toLowerCase()) {
      hexInput.value = normalized;
    }
    const swatches = Array.from(document.querySelectorAll?.("[data-model-items-color-swatch]") || []);
    swatches.forEach((btn) => {
      const swatchColor = normalizeItemsHeaderColor(btn.dataset.modelItemsColorSwatch);
      const isActive = normalized && swatchColor && swatchColor === normalized;
      btn.classList.toggle("is-active", isActive);
    });
  }
  function applyModelItemsHeaderColor(value, options = {}) {
    const { setBaseline = false } = options || {};
    const prevColor = normalizeItemsHeaderColor(
      getEl("modelItemsHeaderColor")?.value || getEl("modelItemsHeaderHex")?.value || ""
    );
    const normalized = normalizeItemsHeaderColor(value) || resolveInitialModelItemsHeaderColor();
    if (setBaseline || !getStoredInitialModelItemsHeaderColor()) {
      setInitialModelItemsHeaderColor(normalized);
    }
    const modalRoot = getEl("modelActionsModal");
    const previewRoot = getEl("modelActionsPreview");
    const root = modalRoot || previewRoot;
    if (root && normalized) {
      root.style.setProperty("--items-head-bg", normalized);
    }
    const { h, s, v } = hexToHsv(normalized);
    modelPickerState.h = h;
    modelPickerState.s = s;
    modelPickerState.v = v;
    setModelHueBg(h);
    positionModelPickerThumb();
    syncModelItemsHeaderColorUi(normalized);
    syncModelItemsColorResetButton(normalized);
    const colorChanged =
      !!prevColor && !!normalized && prevColor !== normalized && !setBaseline;
    if (colorChanged && typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("modelItemsHeaderColorChanged", {
          bubbles: true,
          detail: { color: normalized, previous: prevColor }
        })
      );
    }
    return normalized;
  }
  function wireModelItemsHeaderColorPicker() {
    if (SEM._modelItemsHeaderColorWired) return;
    const input = getEl("modelItemsHeaderColor");
    const area = getEl("modelItemsPickerArea");
    const hueBar = getEl("modelItemsPickerHueBar");
    if (!input || !area) return;
    SEM._modelItemsHeaderColorWired = true;
    const initialResolved =
      normalizeItemsHeaderColor(input.value) ||
      resolveInitialModelItemsHeaderColor();
    setInitialModelItemsHeaderColor(initialResolved);
    const handleInput = (event) => {
      applyModelItemsHeaderColor(event?.target?.value);
    };
    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    const hexInput = getEl("modelItemsHeaderHex");
    if (hexInput) {
      const handleHexInput = (event) => {
        const normalized = normalizeItemsHeaderColor(event?.target?.value);
        if (normalized) applyModelItemsHeaderColor(normalized);
      };
      hexInput.addEventListener("input", handleHexInput);
      hexInput.addEventListener("change", handleHexInput);
    }
    const resetBtn = getEl("modelItemsColorReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const baseline = resolveInitialModelItemsHeaderColor();
        applyModelItemsHeaderColor(baseline, { setBaseline: true });
      });
    }
    const swatches = Array.from(document.querySelectorAll?.("[data-model-items-color-swatch]") || []);
    swatches.forEach((btn) => {
      btn.addEventListener("click", () => {
        const swatchColor = normalizeItemsHeaderColor(btn.dataset.modelItemsColorSwatch);
        if (swatchColor) applyModelItemsHeaderColor(swatchColor);
      });
    });
    const setColorFromSV = (clientX, clientY) => {
      const rect = area.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);
      modelPickerState.s = rect.width ? x / rect.width : modelPickerState.s;
      modelPickerState.v = rect.height ? 1 - y / rect.height : modelPickerState.v;
      const hex = hsvToHex(modelPickerState);
      applyModelItemsHeaderColor(hex);
    };
    let draggingArea = false;
    area.addEventListener("pointerdown", (event) => {
      draggingArea = true;
      setColorFromSV(event.clientX, event.clientY);
      event.preventDefault();
    });
    window.addEventListener("pointermove", (event) => {
      if (draggingArea) setColorFromSV(event.clientX, event.clientY);
    });
    window.addEventListener("pointerup", () => {
      draggingArea = false;
    });
    const setHueFromX = (clientX) => {
      if (!hueBar) return;
      const rect = hueBar.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const pct = rect.width ? x / rect.width : 0;
      modelPickerState.h = pct * 360;
      setModelHueBg(modelPickerState.h);
      const hex = hsvToHex(modelPickerState);
      applyModelItemsHeaderColor(hex);
    };
    if (hueBar) {
      let draggingHue = false;
      hueBar.addEventListener("pointerdown", (event) => {
        draggingHue = true;
        setHueFromX(event.clientX);
        event.preventDefault();
      });
      window.addEventListener("pointermove", (event) => {
        if (draggingHue) setHueFromX(event.clientX);
      });
      window.addEventListener("pointerup", () => {
        draggingHue = false;
      });
    }
    const initialHex = input.value || resolveInitialModelItemsHeaderColor();
    applyModelItemsHeaderColor(initialHex, { setBaseline: true });
  }
  SEM.normalizeItemsHeaderColor = normalizeItemsHeaderColor;
  SEM.getDefaultItemsHeaderColor = getDefaultItemsHeaderColor;
  SEM.applyItemsHeaderColor = applyItemsHeaderColor;
  SEM.wireItemsHeaderColorPicker = wireItemsHeaderColorPicker;
  SEM.applyModelItemsHeaderColor = applyModelItemsHeaderColor;
  SEM.wireModelItemsHeaderColorPicker = wireModelItemsHeaderColorPicker;
  SEM.resetModelItemsColorPicker = (value) => applyModelItemsHeaderColor(value, { setBaseline: true });

  SEM.articleEditContext = SEM.articleEditContext || null;
  SEM.articleFormBaseline = SEM.articleFormBaseline || null;
  SEM.articleUpdateInProgress = !!SEM.articleUpdateInProgress;
  let articleFormDirty = false;
  let articleSaveLocked = false;
  let articleUpdateInProgress = !!SEM.articleUpdateInProgress;
  let addFormDirty = false;
  let itemFormMode = "add";

  const ARTICLE_FORM_SNAPSHOT_FIELDS = [
    "ref",
    "product",
    "desc",
    "stockQty",
    "purchasePrice",
    "purchaseTva",
    "unit",
    "price",
    "tva",
    "discount",
    "fodecEnabled",
    "fodecRate",
    "fodecTva",
    "purchaseFodecEnabled",
    "purchaseFodecRate",
    "purchaseFodecTva",
    "__path"
  ];
  const ARTICLE_NEW_BASELINE_PATH = "__article_form_new__";
  SEM.ARTICLE_NEW_BASELINE_PATH = ARTICLE_NEW_BASELINE_PATH;
  const normalizeArticleSnapshotText = (value) => String(value ?? "").trim();
  const normalizeArticleSnapshotNumber = (value, fallback = 0) => {
    const normalized = String(value ?? "").replace(",", ".").trim();
    if (!normalized) return String(Number(fallback) || 0);
    const num = Number(normalized);
    return Number.isFinite(num) ? String(num) : String(Number(fallback) || 0);
  };
  const sanitizeArticleFormSnapshot = (article = {}, pathHint = "") => {
    const fodec = article?.fodec && typeof article.fodec === "object" ? article.fodec : {};
    const purchaseFodec =
      article?.purchaseFodec && typeof article.purchaseFodec === "object" ? article.purchaseFodec : {};
    return {
      ref: normalizeArticleSnapshotText(article?.ref),
      product: normalizeArticleSnapshotText(article?.product),
      desc: normalizeArticleSnapshotText(article?.desc),
      stockQty: normalizeArticleSnapshotNumber(article?.stockQty, 0),
      purchasePrice: normalizeArticleSnapshotNumber(article?.purchasePrice, 0),
      purchaseTva: normalizeArticleSnapshotNumber(article?.purchaseTva, 0),
      unit: normalizeArticleSnapshotText(article?.unit),
      price: normalizeArticleSnapshotNumber(article?.price, 0),
      tva: normalizeArticleSnapshotNumber(article?.tva, 19),
      discount: normalizeArticleSnapshotNumber(article?.discount, 0),
      fodecEnabled: fodec?.enabled ? "1" : "0",
      fodecRate: normalizeArticleSnapshotNumber(fodec?.rate, 1),
      fodecTva: normalizeArticleSnapshotNumber(fodec?.tva, 19),
      purchaseFodecEnabled: purchaseFodec?.enabled ? "1" : "0",
      purchaseFodecRate: normalizeArticleSnapshotNumber(purchaseFodec?.rate, 1),
      purchaseFodecTva: normalizeArticleSnapshotNumber(purchaseFodec?.tva, 19),
      __path: normalizeArticleSnapshotText(
        pathHint || article?.__path || article?.__articlePath || SEM.articleEditContext?.path || ""
      )
    };
  };
  const captureRawArticleFromForm = () => {
    const docType = normalizeDocType(state().meta?.docType || getStr("docType", "facture"));
    const usePurchasePricing = docType === "fa";
    const salesPriceFromForm = getNum("addPrice", 0);
    const salesTvaFromForm = getNum("addTva", 19);
    const purchasePriceFromForm = getNum("addPurchasePrice", usePurchasePricing ? salesPriceFromForm : 0);
    const purchaseTvaFromForm = getNum("addPurchaseTva", usePurchasePricing ? salesTvaFromForm : 0);
    if (typeof SEM.forms?.captureArticleFromForm === "function") {
      const captured = SEM.forms.captureArticleFromForm() || {};
      captured.purchasePrice = purchasePriceFromForm;
      captured.purchaseTva = purchaseTvaFromForm;
      captured.price = salesPriceFromForm;
      captured.tva = salesTvaFromForm;
      return captured;
    }
    return {
      ref: getStr("addRef"),
      product: getStr("addProduct"),
      desc: getStr("addDesc"),
      stockQty: getNum("addStockQty", 0),
      purchasePrice: purchasePriceFromForm,
      purchaseTva: purchaseTvaFromForm,
      unit: getStr("addUnit"),
      price: salesPriceFromForm,
      tva: salesTvaFromForm,
      discount: getNum("addDiscount", 0),
      fodec: {
        enabled: !!getEl("addFodecEnabled")?.checked,
        label: "FODEC",
        rate: getNum("addFodecRate", 1),
        tva: getNum("addFodecTva", 19)
      },
      purchaseFodec: {
        enabled: !!getEl("addPurchaseFodecEnabled")?.checked,
        label: "FODEC ACHAT",
        rate: getNum("addPurchaseFodecRate", 1),
        tva: getNum("addPurchaseFodecTva", 19)
      }
    };
  };
  const captureArticleFormSnapshot = (scopeHint = null, pathHint = "") => {
    if (scopeHint && typeof SEM.resolveAddFormScope === "function") {
      const scope = SEM.resolveAddFormScope(scopeHint);
      if (scope && typeof SEM.setActiveAddFormScope === "function") {
        SEM.setActiveAddFormScope(scope);
      }
    }
    const raw = captureRawArticleFromForm();
    return sanitizeArticleFormSnapshot(raw, pathHint);
  };

  const applyArticleFormBaseline = (snapshot = null, options = {}) => {
    const resolvedPath = normalizeArticleSnapshotText(
      options?.path || snapshot?.__path || snapshot?.__articlePath || SEM.articleEditContext?.path || ""
    );
    if (!resolvedPath) {
      SEM.articleFormBaseline = null;
      articleFormDirty = false;
      updateArticleSaveButtonAvailability();
      updateItemSubmitAvailability();
      return null;
    }
    const baselineSnapshot =
      snapshot && typeof snapshot === "object"
        ? sanitizeArticleFormSnapshot(snapshot, resolvedPath)
        : captureArticleFormSnapshot(options?.scopeHint || null, resolvedPath);
    SEM.articleFormBaseline = baselineSnapshot;
    articleFormDirty = false;
    updateArticleSaveButtonAvailability();
    updateItemSubmitAvailability();
    return baselineSnapshot;
  };
  SEM.setArticleFormBaseline = applyArticleFormBaseline;

  const updateArticleSaveButtonAvailability = () => {
    const hasRowSelection =
      SEM.selectedItemIndex !== null && SEM.selectedItemIndex !== undefined;
    const hasLinkedArticle = !!SEM.articleEditContext?.path;
    const isUpdateBusy = articleUpdateInProgress || !!SEM.articleUpdateInProgress;
    const canSaveUnsyncedSelection = !articleSaveLocked && !hasLinkedArticle && hasRowSelection;
    const dirty = !!articleFormDirty;

    const setDisabledState = (button, disabled) => {
      if (!button) return;
      const shouldDisable = !!disabled;
      button.disabled = shouldDisable;
      button.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
    };
    const popover =
      typeof document !== "undefined" ? document.querySelector("#articleFormPopover:not([hidden])") : null;
    const popoverMode = String(popover?.dataset?.articleFormMode || "").toLowerCase();
    const applyPopoverDirtyState = (button, canEnable) => {
      if (!button) return;
      const hidden = button.hidden || button.getAttribute("aria-hidden") === "true";
      setDisabledState(button, hidden || !canEnable);
    };

    const btn = getArticleSaveButton();
    if (btn) {
      const inPopover = !!btn.closest?.("#articleFormPopover");
      const hidden = btn.hidden || btn.getAttribute("aria-hidden") === "true";
      const shouldDisable = inPopover
        ? hidden || !dirty
        : articleSaveLocked || (!dirty && !canSaveUnsyncedSelection);
      setDisabledState(btn, shouldDisable);
    }
    const updateBtn = getSavedArticleUpdateButton();
    if (updateBtn) {
      const updatePopover = updateBtn.closest("#articleFormPopover");
      const mode = updatePopover?.dataset?.articleFormMode || "";
      const shouldShow = !updatePopover || mode === "edit";
      updateBtn.hidden = !shouldShow;
      updateBtn.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      if (shouldShow) {
        const hasSelection = articleSaveLocked || hasRowSelection;
        const shouldDisable = isUpdateBusy || !hasSelection || !dirty;
        setDisabledState(updateBtn, shouldDisable);
        updateBtn.classList.toggle("is-dirty", !shouldDisable);
      } else {
        setDisabledState(updateBtn, true);
        updateBtn.classList.remove("is-dirty");
      }
    }
    const updateInvoiceBtn = getInvoiceItemUpdateButton();
    if (updateInvoiceBtn) {
      const updatePopover = updateInvoiceBtn.closest("#articleFormPopover");
      const mode = updatePopover?.dataset?.articleFormMode || "";
      const shouldShow = !updatePopover || mode === "edit";
      updateInvoiceBtn.hidden = !shouldShow;
      updateInvoiceBtn.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      if (shouldShow) {
        const shouldDisable = !hasRowSelection || !dirty;
        setDisabledState(updateInvoiceBtn, shouldDisable);
        updateInvoiceBtn.classList.toggle("is-dirty", !shouldDisable);
      } else {
        setDisabledState(updateInvoiceBtn, true);
        updateInvoiceBtn.classList.remove("is-dirty");
      }
    }
    if (popover) {
      const addBtn = popover.querySelector("#btnAddArticleFromPopover");
      const addAndSaveBtn = popover.querySelector("#btnAddAndSaveArticleFromPopover");
      const newBtn = popover.querySelector("#btnNewItem");
      applyPopoverDirtyState(addBtn, dirty);
      applyPopoverDirtyState(addAndSaveBtn, dirty);
      const canEnableNew = popoverMode !== "edit" && popoverMode !== "view";
      applyPopoverDirtyState(newBtn, dirty && canEnableNew);
    }
  };

  const setArticleUpdateBusyState = (busy, buttonHint = null) => {
    articleUpdateInProgress = !!busy;
    SEM.articleUpdateInProgress = articleUpdateInProgress;
    const updateBtn =
      buttonHint instanceof HTMLElement ? buttonHint : getSavedArticleUpdateButton();
    if (updateBtn) {
      if (articleUpdateInProgress) {
        updateBtn.dataset.updateInProgress = "1";
      } else {
        delete updateBtn.dataset.updateInProgress;
      }
    }
    updateArticleSaveButtonAvailability();
  };
  SEM.setArticleUpdateBusyState = setArticleUpdateBusyState;
  SEM.refreshArticleUpdateButton = function () {
    updateArticleSaveButtonAvailability();
  };

  const setArticleSaveLocked = (locked) => {
    articleSaveLocked = !!locked;
    updateArticleSaveButtonAvailability();
  };

  SEM.showSavedArticleButtons = function () {
    setArticleSaveLocked(true);
  };

  SEM.hideSavedArticleButtons = function () {
    setArticleSaveLocked(false);
  };

  const updateItemSubmitAvailability = () => {
    if (itemFormMode === "update" && SEM.selectedItemIndex === null) {
      itemFormMode = "add";
    }
  };

  SEM.markItemFormDirty = function markItemFormDirty(dirty = true) {
    addFormDirty = !!dirty;
    updateItemSubmitAvailability();
  };

  const updateLinkedArticleFromForm = async (path, article) => {
    if (!path || !window.electronAPI?.updateArticle) return;
    const payload = { ...article };
    delete payload.__articlePath;
    try {
      const suggestedName =
        SEM.forms?.pickSuggestedName?.(payload) ||
        payload.product ||
        payload.ref ||
        "article";
      const res = await window.electronAPI.updateArticle({ path, article: payload, suggestedName });
      if (!res?.ok) {
        const updateError = getMessage("ARTICLE_UPDATE_FAILED");
        await showDialog?.(res?.error || updateError.text, { title: updateError.title });
      } else {
        SEM.refreshArticleSearchResults?.();
        SEM.updateLinkedInvoiceItemsFromArticle?.(path, article);
      }
    } catch (err) {
      console.error("items/updateLinkedArticleFromForm", err);
      const updateError = getMessage("ARTICLE_UPDATE_FAILED");
      await showDialog?.(updateError.text, { title: updateError.title });
    }
  };

  

  SEM.markArticleFormDirty = function markArticleFormDirty(dirty = true) {
    articleFormDirty = !!dirty;
    updateArticleSaveButtonAvailability();
    updateItemSubmitAvailability();
  };

  SEM.evaluateArticleDirtyState = function evaluateArticleDirtyState(scopeHint, options = {}) {
    const baseline = SEM.articleFormBaseline;
    if (!baseline?.__path) {
      articleFormDirty = options?.markDirtyWithoutBaseline === true;
      updateArticleSaveButtonAvailability();
      updateItemSubmitAvailability();
      return articleFormDirty;
    }
    const currentSnapshot = captureArticleFormSnapshot(scopeHint, baseline.__path);
    const dirty = ARTICLE_FORM_SNAPSHOT_FIELDS.some(
      (field) => currentSnapshot[field] !== baseline[field]
    );
    articleFormDirty = dirty;
    updateArticleSaveButtonAvailability();
    updateItemSubmitAvailability();
    return dirty;
  };

  function getArticleSaveButton() {
    const popover = typeof document !== "undefined" ? document.querySelector("#articleFormPopover:not([hidden])") : null;
    if (popover) {
      const btn = popover.querySelector("#btnSaveArticle");
      if (btn) return btn;
    }
    return getEl("btnSaveArticle");
  }

  function getSavedArticleUpdateButton() {
    const popover = typeof document !== "undefined" ? document.querySelector("#articleFormPopover:not([hidden])") : null;
    if (popover) {
      const btn = popover.querySelector("#btnUpdateSavedArticle");
      if (btn) return btn;
    }
    return getEl("btnUpdateSavedArticle");
  }

  function getInvoiceItemUpdateButton() {
    const popover = typeof document !== "undefined" ? document.querySelector("#articleFormPopover:not([hidden])") : null;
    if (popover) {
      const btn = popover.querySelector("#btnUpdateInvoiceItem");
      if (btn) return btn;
    }
    return getEl("btnUpdateInvoiceItem");
  }

  function ensureArticleSaveLabels(btn) {
    if (!btn) return;
    if (!btn.dataset.labelSave) btn.dataset.labelSave = (btn.textContent || "Enregistrer l'article").trim();
    if (!btn.dataset.labelUpdate) btn.dataset.labelUpdate = "Mettre a jour";
  }

  SEM.setArticleSaveButtonMode = function setArticleSaveButtonMode(mode = "save") {
    const btn = getArticleSaveButton();
    if (!btn) return;
    ensureArticleSaveLabels(btn);
    const normalized = mode === "update" ? "update" : "save";
    btn.dataset.articleMode = normalized;
    // Keep the visible label constant so the three-button layout is stable.
    btn.textContent = btn.dataset.labelSave;
    updateArticleSaveButtonAvailability();
  };

  SEM.clearArticleEditContext = function clearArticleEditContext() {
    SEM.articleEditContext = null;
    setArticleUpdateBusyState(false);
    applyArticleFormBaseline(null);
    SEM.setArticleSaveButtonMode?.("save");
    setArticleSaveLocked(false);
  };

  SEM.enterArticleEditContext = function enterArticleEditContext(ctx = {}) {
    if (!ctx?.path) {
      SEM.clearArticleEditContext?.();
      return;
    }
    SEM.articleEditContext = { path: ctx.path, name: ctx.name || "" };
    SEM.setArticleSaveButtonMode?.("update");
    setArticleSaveLocked(true);
    setArticleUpdateBusyState(false);
    applyArticleFormBaseline(null, { path: ctx.path });
    SEM.evaluateArticleDirtyState?.(null, { markDirtyWithoutBaseline: false });
  };

  function renderTvaBreakdownTable(totals, currency) {
    const body = getItemsScopedEl("tvaBreakdownBody");
    const card = getItemsScopedEl("tvaBreakdownCard");
    if (!body || !card) return;
    const taxesEnabled = isTaxesEnabled(state().meta?.taxesEnabled);
    card.style.display = "none";
    body.innerHTML = "";

    const rows = Array.isArray(totals?.tvaBreakdown) ? totals.tvaBreakdown : [];
    const extras = totals?.extras || {};
    const fodecEnabled = !!extras.fodecEnabled;
    const fodecLabel = extras.fodecLabel || "FODEC";
    const baseFodecRows = Array.isArray(extras.fodecBreakdown) ? extras.fodecBreakdown : [];
    const normalizedFodecRows = [];
    const fodecTvaRows = [];
    let totalBases = 0;
    let totalAmount = 0;
    const fallbackFodecRate = Number(extras.fodecRate);
    const fallbackFodecTvaRate = Number(extras.fodecTva ?? extras.fodecTVA ?? extras.fodecRate ?? 0);
    const fallbackFodecAmount = Number(extras.fodecHT);
    const fallbackFodecTvaAmount = Number(extras.fodecTVA);
    const extrasFodecBase = Number(extras.fodecBase);
    const fallbackFodecBase =
      Number.isFinite(extrasFodecBase)
        ? extrasFodecBase
        : (Number.isFinite(fallbackFodecRate) && Math.abs(fallbackFodecRate) > 1e-9
            ? fallbackFodecAmount / (fallbackFodecRate / 100)
            : null);

    baseFodecRows.forEach((row) => {
      const base = Number(row.base ?? row.ht ?? 0);
      const fodecAmt = Number(row.fodec ?? row.amount ?? 0);
      const fodecTva = Number(row.fodecTva ?? row.tva ?? 0);
      const rate = Number(row.rate ?? extras.fodecRate ?? 0);
      const fodecTvaRate = Number(row.tvaRate ?? row.fodecTvaRate ?? extras.fodecTVA ?? 0);
      if (!Number.isFinite(base) && !Number.isFinite(fodecAmt)) return;
      const fodecAmount = Number.isFinite(fodecAmt) ? fodecAmt : 0;
      const fodecTvaAmount = Number.isFinite(fodecTva) ? fodecTva : 0;
      normalizedFodecRows.push({
        rate: rate,
        base: Number.isFinite(base) ? base : 0,
        fodecAmount,
        fodecTvaAmount,
        fodecTvaRate
      });

      if (taxesEnabled && Math.abs(fodecTvaAmount) > 0) {
        const tvaRate = Number.isFinite(fodecTvaRate) ? fodecTvaRate : fallbackFodecTvaRate;
        fodecTvaRows.push({
          rate: Number.isFinite(tvaRate) ? tvaRate : 0,
          ht: fodecAmount,
          tva: fodecTvaAmount
        });
      }
    });

    if (fodecEnabled && !normalizedFodecRows.length && Number.isFinite(fallbackFodecAmount)) {
      const computedBase = Number.isFinite(fallbackFodecBase) ? fallbackFodecBase : 0;
      const fodecAmount = Number.isFinite(fallbackFodecAmount) ? fallbackFodecAmount : 0;
      const fodecTvaAmount = Number.isFinite(fallbackFodecTvaAmount) ? fallbackFodecTvaAmount : 0;
      normalizedFodecRows.push({
        rate: Number.isFinite(fallbackFodecRate) ? fallbackFodecRate : 0,
        base: computedBase,
        fodecAmount,
        fodecTvaAmount,
        fodecTvaRate: fallbackFodecTvaRate
      });

      if (taxesEnabled && Math.abs(fodecTvaAmount) > 0) {
        const tvaRate = Number.isFinite(fallbackFodecTvaRate) ? fallbackFodecTvaRate : 0;
        fodecTvaRows.push({
          rate: tvaRate,
          ht: fodecAmount,
          tva: fodecTvaAmount
        });
      }
    }

    const combinedTvaRows = taxesEnabled
      ? [...rows, ...fodecTvaRows].filter((r) => Number.isFinite(r?.rate))
      : [];

    const aggregatedTvaRows = (() => {
      const map = new Map();
      combinedTvaRows.forEach((row) => {
        const rate = Number(row.rate) || 0;
        const key = rate.toFixed(3);
        const htVal = Number(row.ht) || 0;
        const tvaVal = Number(row.tva) || 0;
        const entry = map.get(key) || { rate, ht: 0, tva: 0 };
        entry.ht  += htVal;
        entry.tva += tvaVal;
        map.set(key, entry);
      });
        return Array.from(map.values())
          .filter((r) => Math.abs(r.tva) > 1e-9 && r.rate > 0)
          .sort((a, b) => a.rate - b.rate);
      })();

    const aggregatedFodecRows = (() => {
      const map = new Map();
      normalizedFodecRows.forEach((row) => {
        const rateVal = Number(row.rate);
        const rate = Number.isFinite(rateVal) ? rateVal : 0;
        const key = rate.toFixed(3);
        const baseVal = Number(row.base);
        const fodecVal = Number(row.fodecAmount);
        const fodecTvaVal = Number(row.fodecTvaAmount);
        const entry = map.get(key) || { rate, base: 0, fodecAmount: 0, fodecTvaAmount: 0 };
        entry.base += Number.isFinite(baseVal) ? baseVal : 0;
        entry.fodecAmount += Number.isFinite(fodecVal) ? fodecVal : 0;
        entry.fodecTvaAmount += Number.isFinite(fodecTvaVal) ? fodecTvaVal : 0;
        map.set(key, entry);
      });
        return Array.from(map.values())
          .filter((r) => Math.abs(r.fodecAmount) > 1e-9 && r.rate > 0)
          .sort((a, b) => a.rate - b.rate);
    })();

    const hasTvaRows = aggregatedTvaRows.length > 0;
    const hasFodecRows = fodecEnabled && aggregatedFodecRows.length > 0;
    const hasAnyRow = taxesEnabled && (hasTvaRows || hasFodecRows);

    if (!hasAnyRow) {
      card.style.display = "none";
      return;
    }

    card.style.display = "";

    if (hasFodecRows) {
      aggregatedFodecRows.forEach((row) => {
        const pct = Number.isFinite(row.rate) ? `${formatPct(row.rate)}%` : "";
        const label = escapeHTML(fodecLabel || "FODEC");
        const labelWithRate = pct ? `${label} ${pct}` : label;
        const fBase = Number.isFinite(row.base) ? row.base : 0;
        const fAmount = Number.isFinite(row.fodecAmount) ? row.fodecAmount : 0;
        const fTvaAmount = Number.isFinite(row.fodecTvaAmount) ? row.fodecTvaAmount : 0;
        if (Number.isFinite(fBase)) totalBases += fBase;
        if (Number.isFinite(fAmount)) totalAmount += fAmount;
        const tr = document.createElement("tr");
        tr.classList.add("tva-breakdown__fodec");
        tr.innerHTML = `
          <td>${labelWithRate}</td>
          <td class="right">${formatMoney(fBase, currency)}</td>
          <td class="right">${formatMoney(fAmount, currency)}</td>
        `;
        body.appendChild(tr);
      });
    }

    if (hasTvaRows) {
      aggregatedTvaRows.forEach((row) => {
        const rateLabel = `${formatPct(row.rate)}%`;
        const taxLabel = `TVA ${rateLabel}`;
        const baseVal = Number.isFinite(row.ht) ? row.ht : 0;
        const amtVal = Number.isFinite(row.tva) ? row.tva : 0;
        if (Number.isFinite(baseVal)) totalBases += baseVal;
        if (Number.isFinite(amtVal)) totalAmount += amtVal;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${taxLabel}</td>
          <td class="right">${formatMoney(baseVal, currency)}</td>
          <td class="right">${formatMoney(amtVal, currency)}</td>
        `;
        body.appendChild(tr);
      });
    }

    if (hasAnyRow) {
      const tr = document.createElement("tr");
      tr.classList.add("tva-breakdown__total");
      tr.innerHTML = `
        <th colspan="2">Total</th>
        <th class="right">${formatMoney(totalAmount, currency)}</th>
      `;
      body.appendChild(tr);
    }
  }

  const CURRENCY_WORDS = {
    DT:  { major: "dinars",  minor: "millimes", minorFactor: 1000 },
    EUR: { major: "euros",   minor: "centimes", minorFactor: 100  },
    USD: { major: "dollars", minor: "cents",    minorFactor: 100  },
  };

  function wordsFR(n) {
    if (typeof window !== "undefined" && window.n2words) return window.n2words(n, { lang: "fr" });
    const UNITS = ["zero","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
    const TENS  = ["","dix","vingt","trente","quarante","cinquante","soixante"];
    const two = (x) => {
      if (x < 17) return UNITS[x];
      if (x < 20) return "dix-" + UNITS[x - 10];
      if (x < 70) { const t = Math.floor(x / 10), u = x % 10; if (u === 1 && t !== 8) return TENS[t] + " et un"; return TENS[t] + (u ? "-" + UNITS[u] : ""); }
      if (x < 80) return "soixante-" + two(x - 60);
      const u = x - 80; if (u === 0) return "quatre-vingts"; return "quatre-vingt-" + two(u);
    };
    const hundred = (h, tail) => { if (h === 0) return tail; if (h === 1) return "cent" + (tail ? " " + tail : ""); return ("cent".replace(/^/, UNITS[h] + " ") + (tail ? " " + tail : tail === "" ? "s" : "")); };
    const three = (x) => { const h = Math.floor(x / 100), r = x % 100; const tail = r ? two(r) : ""; if (h >= 2 && r === 0) return UNITS[h] + " cents"; return hundred(h, tail); };
    const chunk = (x, sing, plur) => { if (x === 0) return ""; if (sing === "mille") return x === 1 ? "mille" : two(x) + " mille"; return x === 1 ? "un " + sing : two(x) + " " + plur; };
    if (n === 0) return UNITS[0];
    let s = ""; let g = Math.floor(n / 1e9); n %= 1e9; let m = Math.floor(n / 1e6); n %= 1e6; let k = Math.floor(n / 1e3); n %= 1e3;
    if (g) s += chunk(g, "milliard", "milliards") + " ";
    if (m) s += chunk(m, "million", "millions") + " ";
    if (k) s += chunk(k, "mille", "mille") + " ";
    s += three(n).trim();
    return s.replace(/\s+/g, " ").trim();
  }

  function amountInWords(amount, currencyCode) {
    const cfg = CURRENCY_WORDS[currencyCode] || CURRENCY_WORDS.EUR;
    const rounded = Math.round((Number(amount || 0) + 1e-9) * cfg.minorFactor) / cfg.minorFactor;
    let major = Math.floor(rounded + 1e-9);
    let minor = Math.round((rounded - major) * cfg.minorFactor);
    if (minor === cfg.minorFactor) { major += 1; minor = 0; }
    const majorPart = `${wordsFR(major)} ${cfg.major}`;
    const minorPart = minor ? ` et ${wordsFR(minor)} ${cfg.minor}` : "";
    return (majorPart + minorPart).replace(/^./, (c) => c.toUpperCase());
  }

  const hasVal = (v) => (v ?? "").toString().trim().length > 0;
  const hasTextContent = (html = "") => {
    const stripped = String(html)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
    return stripped.length > 0;
  };
  const normalizeNoteWhitespace = (value = "") =>
    String(value)
      .replace(/\s+<br\s*\/?>/gi, "<br>")
      .replace(/<br\s*\/?>\s+/gi, "<br>")
      .replace(/\r\n|\r|\n/g, "<br>")
      .replace(/\t+/g, " ")
      .replace(/ {2,}/g, " ")
      .replace(/(<br\s*\/?>)\s+/gi, "$1")
      .replace(/\s+(<br\s*\/?>)/gi, "$1");

  const WH_NOTE_FONT_SIZES = [10, 12, 14];
  const WH_NOTE_DEFAULT_FONT_SIZE = 12;
  const normalizeWhNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    const min = Math.min(...WH_NOTE_FONT_SIZES);
    const max = Math.max(...WH_NOTE_FONT_SIZES);
    const clamped = Math.min(Math.max(parsed, min), max);
    return WH_NOTE_FONT_SIZES.includes(clamped) ? clamped : null;
  };
  const ensureWhNoteSizeWrapper = (html = "", size = WH_NOTE_DEFAULT_FONT_SIZE) => {
    const effectiveSize = normalizeWhNoteFontSize(size) ?? WH_NOTE_DEFAULT_FONT_SIZE;
    if (!html) return "";
    if (/data-size="/.test(html)) return html;
    return `<div data-size="${effectiveSize}" data-size-root="true" style="font-size:${effectiveSize}px">${html}</div>`;
  };
  const FOOTER_NOTE_FONT_SIZES = [7, 8, 9];
  const FOOTER_NOTE_DEFAULT_FONT_SIZE = 8;
  const normalizeFooterNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return FOOTER_NOTE_DEFAULT_FONT_SIZE;
    return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : FOOTER_NOTE_DEFAULT_FONT_SIZE;
  };

  function formatNoteHTML(raw) {
    if (!hasVal(raw)) return "";
    let safe = normalizeNoteWhitespace(escapeHTML(raw)).replace(/\r\n|\r|\n/g, "<br>");
    safe = safe.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    safe = safe.replace(/&lt;(\/?)(strong|em|ul|ol|li)&gt;/gi, "<$1$2>");
    safe = safe.replace(
      /&lt;(span|div)([\s\S]*?)data-size="(\d{1,3})"([\s\S]*?)&gt;/gi,
      (_match, tag, before, size, after) => {
        const normalized = normalizeWhNoteFontSize(size);
        const hasRoot =
          /data-size-root\s*=\s*"?true"?/i.test(before) || /data-size-root\s*=\s*"?true"?/i.test(after);
        const rootAttr = tag === "div" && hasRoot ? ' data-size-root="true"' : "";
        return normalized ? `<${tag} data-size="${normalized}"${rootAttr} style="font-size:${normalized}px">` : "";
      }
    );
    safe = safe.replace(/&lt;\/(span|div)&gt;/gi, "</$1>");
    safe = normalizeNoteWhitespace(safe);
    safe = ensureWhNoteSizeWrapper(safe, WH_NOTE_DEFAULT_FONT_SIZE);
    return safe;
  }

  function formatFooterNoteHTML(raw) {
    if (!hasVal(raw)) return "";
    if (typeof document === "undefined") {
      let safe = normalizeNoteWhitespace(escapeHTML(raw)).replace(/\r\n|\r|\n/g, "<br>");
      safe = safe.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
      safe = safe.replace(/&lt;(\/?)(strong|em|ul|ol|li)&gt;/gi, "<$1$2>");
      safe = safe.replace(
        /&lt;(span|div)([\s\S]*?)data-size="(\d{1,3})"([\s\S]*?)&gt;/gi,
        (_match, tag, before, size, after) => {
          const parsedSize = Number.parseInt(size, 10);
          if (!FOOTER_NOTE_FONT_SIZES.includes(parsedSize)) return tag === "div" ? "<br>" : "";
          const hasRoot =
            /data-size-root\s*=\s*"?true"?/i.test(before) || /data-size-root\s*=\s*"?true"?/i.test(after);
          const rootAttr = tag === "div" && hasRoot ? ' data-size-root="true"' : "";
          return `<${tag} data-size="${parsedSize}"${rootAttr} style="font-size:${parsedSize}px">`;
        }
      );
      safe = safe.replace(/&lt;\/(span|div)&gt;/gi, "</$1>");
      safe = safe.replace(/&lt;(div|p)(?:\s[^>]*)?&gt;/gi, "<br>");
      safe = safe.replace(/&lt;\/(div|p)&gt;/gi, "");
      safe = safe.replace(/(<br>){3,}/g, "<br><br>");
      safe = safe.replace(/^(<br>)+/, "");
      safe = safe.replace(/(<br>)+$/, "");
      return normalizeNoteWhitespace(safe);
    }
    const normalizedHTML = String(raw ?? "")
      .replace(/\r\n|\r/g, "\n")
      .replace(/\n/g, "<br>");
    const container = document.createElement("div");
    container.innerHTML = normalizedHTML || "";
    const allowed = new Set(["strong", "em", "ul", "ol", "li", "br", "span", "div"]);
    const blockTags = new Set(["div", "p", "section", "article", "header", "footer", "blockquote", "pre", "address"]);
    const parts = [];
    const pushBreak = () => {
      if (!parts.length) return;
      if (parts[parts.length - 1] !== "<br>") parts.push("<br>");
    };
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(
          node.textContent
            .replace(/\u00A0/g, " ")
            .replace(/\u200b/g, "")
        );
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      let tag = node.tagName.toLowerCase();
      if (tag === "b") tag = "strong";
      if (tag === "i") tag = "em";
      if (tag === "span" || tag === "div") {
        const sizeRaw = Number.parseInt(node.getAttribute("data-size"), 10);
        const size = FOOTER_NOTE_FONT_SIZES.includes(sizeRaw) ? sizeRaw : null;
        if (!size) {
          const isBlock = blockTags.has(tag);
          if (isBlock) pushBreak();
          node.childNodes.forEach(walk);
          if (isBlock) pushBreak();
          return;
        }
        const isRoot = tag === "div" && node.getAttribute("data-size-root");
        const rootAttr = tag === "div" && isRoot ? ' data-size-root="true"' : "";
        parts.push(`<${tag} data-size="${size}"${rootAttr} style="font-size:${size}px">`);
        node.childNodes.forEach(walk);
        parts.push(`</${tag}>`);
        return;
      }
      if (!allowed.has(tag)) {
        const isBlock = blockTags.has(tag);
        if (isBlock) pushBreak();
        node.childNodes.forEach(walk);
        if (isBlock) pushBreak();
        return;
      }
      if (tag === "br") {
        parts.push("<br>");
        return;
      }
      parts.push(`<${tag}>`);
      node.childNodes.forEach(walk);
      parts.push(`</${tag}>`);
    };
    container.childNodes.forEach(walk);
    let result = parts.join("");
    result = result.replace(/(<br>){3,}/g, "<br><br>");
    result = result.replace(/^(<br>)+/, "");
    result = result.replace(/(<br>)+$/, "");
    return normalizeNoteWhitespace(result);
  }

  function normalizeDocType(raw) {
    const t = String(raw || "").trim().toLowerCase();
    const faAliases = ["fa", "factureachat", "facture-achat", "facture_achat", "facture d'achat", "facture dachat", "facture achat"];
    const blAliases = ["bl","bon","bon_livraison","bon-de-livraison","bon de livraison","bon livraison"];
    const bcAliases = ["bc","bon_commande","bon-de-commande","bon de commande","bon commande","commande"];
    const beAliases = ["be", "bon_entree", "bon-entree", "bon entree", "bon d'entree", "bon d'entr\u00e9e"];
    const bsAliases = ["bs", "bon_sortie", "bon-sortie", "bon sortie", "bon de sortie"];
    const avoirAliases = ["avoir", "facture_avoir", "facture-avoir", "facture avoir", "facture d'avoir", "facture davoir"];
    if (faAliases.includes(t)) return "fa";
    if (blAliases.includes(t)) return "bl";
    if (bcAliases.includes(t)) return "bc";
    if (beAliases.includes(t)) return "be";
    if (bsAliases.includes(t)) return "bs";
    if (avoirAliases.includes(t)) return "avoir";
    if (t === "devis") return "devis";
    return "facture";
  }

  function hasItemValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function parseItemNumber(value, fallback = 0) {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    if (value === undefined || value === null) return fallback;

    const raw = String(value).replace(/\u00A0/g, " ").trim();
    if (!raw) return fallback;

    const wrappedNegative = /^\(.*\)$/.test(raw);
    const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
    const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
    if (!cleaned || !/[0-9]/.test(cleaned)) return fallback;

    const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
    const unsigned = cleaned.replace(/[+\-]/g, "");
    if (!unsigned || !/[0-9]/.test(unsigned)) return fallback;

    const commaCount = (unsigned.match(/,/g) || []).length;
    const dotCount = (unsigned.match(/\./g) || []).length;
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");
    let decimalSep = "";
    if (commaCount > 0 && dotCount > 0) {
      decimalSep = lastComma > lastDot ? "," : ".";
    } else if (commaCount === 1 && dotCount === 0) {
      decimalSep = ",";
    } else if (dotCount === 1 && commaCount === 0) {
      decimalSep = ".";
    }

    let normalized = "";
    if (decimalSep) {
      const sepIndex = unsigned.lastIndexOf(decimalSep);
      const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
      const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
      normalized = fracPart ? `${intPart || "0"}.${fracPart}` : (intPart || "0");
    } else {
      normalized = unsigned.replace(/[.,]/g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? sign * parsed : fallback;
  }

  function pickItemNumericValue(source = {}, keys = []) {
    const target = source && typeof source === "object" ? source : {};
    for (const key of keys) {
      if (hasItemValue(target?.[key])) return target[key];
    }
    return undefined;
  }

  function resolveItemPricingValues(rawItem = {}) {
    const source = rawItem && typeof rawItem === "object" ? rawItem : {};
    const salesPriceSource = pickItemNumericValue(source, [
      "price",
      "unitPrice",
      "unit_price",
      "pu",
      "puHt",
      "pu_ht",
      "prixUnitaire",
      "prix_unitaire"
    ]);
    const salesTvaSource = pickItemNumericValue(source, [
      "tva",
      "vat",
      "tax",
      "taxRate",
      "tax_rate",
      "tvaRate",
      "tva_rate"
    ]);
    const salesPrice = hasItemValue(salesPriceSource) ? parseItemNumber(salesPriceSource, 0) : 0;
    const salesTva = hasItemValue(salesTvaSource) ? parseItemNumber(salesTvaSource, 0) : 0;
    const purchasePriceSource = pickItemNumericValue(source, [
      "purchasePrice",
      "purchase_price",
      "buyPrice",
      "buy_price",
      "prixAchat",
      "prix_achat",
      "purchaseHt",
      "purchase_ht",
      "puAchat",
      "pu_achat",
      "puAchatHt",
      "pu_achat_ht",
      "puAHt",
      "pu_a_ht"
    ]);
    const purchaseTvaSource = pickItemNumericValue(source, [
      "purchaseTva",
      "purchase_tva",
      "purchaseVat",
      "purchase_vat",
      "buyTva",
      "buy_tva",
      "tvaAchat",
      "tva_achat",
      "purchaseTax",
      "purchase_tax"
    ]);
    const purchasePrice = hasItemValue(purchasePriceSource)
      ? parseItemNumber(purchasePriceSource, 0)
      : 0;
    const purchaseTva = hasItemValue(purchaseTvaSource)
      ? parseItemNumber(purchaseTvaSource, 0)
      : 0;
    return { salesPrice, salesTva, purchasePrice, purchaseTva };
  }

  SEM.updateAmountWordsBlock = function updateAmountWordsBlock(totalsInput) {
    const amountWordsHost = getItemsScopedEl("itemsAmountWordsBlock");
    const summaryNoteHost = getItemsScopedEl("itemsSummaryNoteBlock");
    const footerNoteHost = getItemsScopedEl("itemsFooterNote");
    const sealOverlay = getItemsScopedEl("itemsSealOverlay");
    const sealImg = getItemsScopedEl("itemsSealImg");
    const signatureOverlay = getItemsScopedEl("itemsSignatureOverlay");
    const signatureImg = getItemsScopedEl("itemsSignatureImg");
    if (!amountWordsHost && !summaryNoteHost && !footerNoteHost && !sealOverlay && !signatureOverlay) return;

    const st = state();
    const meta = st?.meta || {};
    const ex = meta?.extras && typeof meta.extras === "object" ? meta.extras : {};
    const pdfOptions = ex?.pdf && typeof ex.pdf === "object" ? ex.pdf : {};
    const resolveModelPdfOption = (key) => {
      const sanitize =
        (helpers && typeof helpers.sanitizeModelName === "function" && helpers.sanitizeModelName) ||
        ((value) => String(value ?? "").trim());
      const selected =
        sanitize(meta?.documentModelName || meta?.docDialogModelName || "") ||
        sanitize(meta?.modelName || meta?.modelKey || "");
      if (!selected || typeof SEM.getModelEntries !== "function") return undefined;
      const entries = SEM.getModelEntries();
      const match = Array.isArray(entries)
        ? entries.find((entry) => sanitize(entry?.name) === selected)
        : null;
      const pdf = match?.config?.pdf;
      return (pdf && typeof pdf[key] === "boolean") ? pdf[key] : undefined;
    };
    const resolvePdfOption = (key, fallback) => {
      if (typeof pdfOptions[key] === "boolean") return pdfOptions[key];
      const modelValue = resolveModelPdfOption(key);
      if (typeof modelValue === "boolean") return modelValue;
      return fallback;
    };
    const showAmountWords = resolvePdfOption("showAmountWords", true);
    const showSeal = resolvePdfOption("showSeal", true);
    const showSignature = resolvePdfOption("showSignature", true);

    const totals = totalsInput || SEM.computeTotalsReturn?.();
    const currency = totals?.currency || meta?.currency || "DT";
    const docType = normalizeDocType(meta?.docType || getStr("docType", "facture"));

    const showWordsByType =
      docType === "facture" || docType === "fa" || docType === "devis" || docType === "bl";
    const showWords = showWordsByType && showAmountWords && docType !== "bc";
    const wordsHeader =
      docType === "devis"   ? "Arr&ecirc;t&eacute; le pr&eacute;sent devis &agrave; la somme de&nbsp;:"
    : docType === "facture" ? "Arr&ecirc;t&eacute;e la pr&eacute;sente facture &agrave; la somme de&nbsp;:"
    : docType === "fa"      ? "Arr&ecirc;t&eacute;e la pr&eacute;sente facture d'achat &agrave; la somme de&nbsp;:"
    : docType === "bl"      ? "Arr&ecirc;t&eacute; le pr&eacute;sent bon de livraison &agrave; la somme de&nbsp;:"
    : "";

    const acompte = totals?.acompte || {};
    const htVal = Number(totals?.totalHT || 0);
    const ttcVal = Number(totals?.totalTTC || 0);
    const showTTC = Math.abs(ttcVal - htVal) > 1e-9;
    const baseTotal = showTTC ? totals?.totalTTC : totals?.totalHT;
    const financing = totals?.financing || {};
    const netToPayRaw = Number(financing?.netToPay);
    const hasNetToPay =
      (financing?.subventionEnabled || financing?.bankEnabled) && Number.isFinite(netToPayRaw);
    const fallbackTotal = Number(baseTotal ?? totals?.grand ?? totals?.totalHT ?? 0);
    const wordsTarget = hasNetToPay ? netToPayRaw : fallbackTotal;
    const wordsTgtText = showWords ? amountInWords(wordsTarget, currency) : "";
    const wordsHeaderFinal = wordsHeader;

    const formattedNotes = formatNoteHTML(st?.notes);
    const notesHTML =
      formattedNotes
        ? `<div class="pdf-notes">
             <div class="pdf-notes-title"><span style="font-weight:600">Notes&nbsp;:</span>${formattedNotes}</div>
           </div>`
        : "";

    const amountWordsBlock =
      (showWords || notesHTML)
        ? `<div class="pdf-amount-words">
             ${showWords ? `${wordsHeaderFinal}<br/><strong>${escapeHTML(wordsTgtText)}</strong>` : ""}
             ${notesHTML}
           </div>`
        : "";

    if (amountWordsHost) {
      amountWordsHost.innerHTML = amountWordsBlock;
      amountWordsHost.hidden = !amountWordsBlock;
      amountWordsHost.style.display = amountWordsBlock ? "" : "none";
    }

    const whNoteValue = meta?.withholding?.note;
    const safeWhNote = formatNoteHTML(whNoteValue);
    const summaryNoteContent = hasTextContent(safeWhNote) ? safeWhNote : "";
    if (summaryNoteHost) {
      summaryNoteHost.innerHTML = summaryNoteContent;
      summaryNoteHost.hidden = !summaryNoteContent;
      summaryNoteHost.style.display = summaryNoteContent ? "" : "none";
    }

    const footerNoteRaw =
      meta?.extras?.pdf?.footerNote ??
      meta?.pdf?.footerNote ??
      meta?.footerNote ??
      "";
    const footerNoteSizeRaw =
      meta?.extras?.pdf?.footerNoteSize ??
      meta?.pdf?.footerNoteSize ??
      meta?.footerNoteSize;
    const footerNoteSize = normalizeFooterNoteFontSize(footerNoteSizeRaw);
    const footerNoteHTML = hasVal(footerNoteRaw) ? formatFooterNoteHTML(footerNoteRaw) : "";
    const footerNoteContent = hasTextContent(footerNoteHTML) ? footerNoteHTML : "";
    if (footerNoteHost) {
      footerNoteHost.innerHTML = footerNoteContent;
      footerNoteHost.style.fontSize = `${footerNoteSize}px`;
      footerNoteHost.hidden = !footerNoteContent;
      footerNoteHost.style.display = footerNoteContent ? "" : "none";
    }

    const company = st?.company || {};
    const seal = company?.seal && typeof company.seal === "object" ? company.seal : {};
    const signature = company?.signature && typeof company.signature === "object" ? company.signature : {};

    if (sealOverlay && sealImg) {
      const sealSrc = seal?.enabled && typeof seal?.image === "string" ? seal.image : "";
      if (showSeal && sealSrc) {
        if (sealImg.getAttribute("src") !== sealSrc) sealImg.setAttribute("src", sealSrc);
        const rotation = Number(seal?.rotateDeg);
        sealImg.style.transform = Number.isFinite(rotation) ? `rotate(${rotation}deg)` : "";
        const opacity = Number(seal?.opacity);
        sealImg.style.opacity = Number.isFinite(opacity) ? String(opacity) : "";
        const widthMm = Number(seal?.maxWidthMm);
        const heightMm = Number(seal?.maxHeightMm);
        sealImg.style.maxWidth = `${Number.isFinite(widthMm) && widthMm > 0 ? widthMm : 40}mm`;
        sealImg.style.maxHeight = `${Number.isFinite(heightMm) && heightMm > 0 ? heightMm : 40}mm`;
        sealOverlay.hidden = false;
      } else {
        sealImg.removeAttribute("src");
        sealImg.style.transform = "";
        sealImg.style.opacity = "";
        sealImg.style.maxWidth = "";
        sealImg.style.maxHeight = "";
        sealOverlay.hidden = true;
      }
    }

    if (signatureOverlay && signatureImg) {
      const signatureSrc = signature?.enabled && typeof signature?.image === "string" ? signature.image : "";
      if (showSignature && signatureSrc) {
        if (signatureImg.getAttribute("src") !== signatureSrc) signatureImg.setAttribute("src", signatureSrc);
        const rotation = Number(signature?.rotateDeg);
        signatureImg.style.transform = Number.isFinite(rotation) ? `rotate(${rotation}deg)` : "";
        const opacity = Number(signature?.opacity);
        signatureImg.style.opacity = Number.isFinite(opacity) ? String(opacity) : "";
        const widthMm = Number(signature?.maxWidthMm);
        const heightMm = Number(signature?.maxHeightMm);
        signatureImg.style.maxWidth = `${Number.isFinite(widthMm) && widthMm > 0 ? widthMm : 48}mm`;
        signatureImg.style.maxHeight = `${Number.isFinite(heightMm) && heightMm > 0 ? heightMm : 22}mm`;
        signatureOverlay.hidden = false;
      } else {
        signatureImg.removeAttribute("src");
        signatureImg.style.transform = "";
        signatureImg.style.opacity = "";
        signatureImg.style.maxWidth = "";
        signatureImg.style.maxHeight = "";
        signatureOverlay.hidden = true;
      }
    }
  };

  const shouldSkipMainscreenAddFormUpdate = () => {
    if (!window.__modelApplyAddFormGuard) return false;
    const mainscreen = document.getElementById("addItemBoxMainscreen");
    if (mainscreen) return true;
    const scope = typeof SEM.resolveAddFormScope === "function" ? SEM.resolveAddFormScope() : null;
    return scope?.id === "addItemBoxMainscreen";
  };

  SEM.computeTotals = function () {
    SEM.readInputs();
    const totals = SEM.computeTotalsReturn();
    const currency = totals.currency || state().meta.currency || "DT";
    const fodecAmount = Number(totals?.extras?.fodecHT || 0);
    const fodecTvaAmount = Number(totals?.extras?.fodecTVA || 0);
    const tvaBreakdownSum = Array.isArray(totals?.tvaBreakdown)
      ? totals.tvaBreakdown.reduce((sum, row) => sum + Number(row?.tva || 0), 0)
      : 0;
    const combinedTaxes = fodecAmount + fodecTvaAmount + tvaBreakdownSum;

    if (typeof SEM.updateAddFormTotals === "function") SEM.updateAddFormTotals();

    renderTvaBreakdownTable(totals, currency);

    const miniHTEl = getItemsScopedEl("miniHT");
    if (miniHTEl) miniHTEl.textContent = formatMoney(totals.totalHT, currency);
    const miniTaxesEl = getItemsScopedEl("miniTaxes");
    if (miniTaxesEl) miniTaxesEl.textContent = formatMoney(combinedTaxes, currency);
    const miniTTCEl = getItemsScopedEl("miniTTC");
    if (miniTTCEl) miniTTCEl.textContent = formatMoney(totals.totalTTC, currency);

    const miniTaxesRow = getItemsScopedEl("miniTaxesRow");
    if (miniTaxesRow) {
      const hasTax = Math.abs(combinedTaxes) > 0;
      miniTaxesRow.style.display = hasTax ? "" : "none";
      miniTaxesRow.hidden = !hasTax;
    }

    const miniTTCRow = getItemsScopedEl("miniTTCRow");
    if (miniTTCRow) {
      const htVal = Number(totals.totalHT || 0);
      const ttcVal = Number(totals.totalTTC || 0);
      const showTTC = Math.abs(ttcVal - htVal) > 1e-9;
      miniTTCRow.style.display = showTTC ? "" : "none";
      miniTTCRow.hidden = !showTTC;
    }

    SEM.updateWHAmountPreview(totals);
    SEM.updateExtrasMiniRows(totals);
    SEM.updateAcomptePreview?.(totals);
    SEM.updateFinancingPreview?.(totals);
    SEM.updateAmountWordsBlock?.(totals);
  };

  const normalizeAddFormNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const getAddFormDefaults = () => {
    const meta = state()?.meta || {};
    const addForm = (meta.addForm && typeof meta.addForm === "object") ? meta.addForm : {};
    const fodec = (addForm.fodec && typeof addForm.fodec === "object") ? addForm.fodec : {};
    const purchaseFodec =
      addForm.purchaseFodec && typeof addForm.purchaseFodec === "object" ? addForm.purchaseFodec : {};
    return {
      purchaseTva: normalizeAddFormNumber(addForm.purchaseTva, 0),
      tva: normalizeAddFormNumber(addForm.tva, 19),
      fodec: {
        enabled: !!fodec.enabled,
        rate: normalizeAddFormNumber(fodec.rate, 1),
        tva: normalizeAddFormNumber(fodec.tva, 19)
      },
      purchaseFodec: {
        enabled: !!purchaseFodec.enabled,
        rate: normalizeAddFormNumber(purchaseFodec.rate, 1),
        tva: normalizeAddFormNumber(purchaseFodec.tva, 19)
      }
    };
  };

  SEM.clearAddForm = function () {
    if (shouldSkipMainscreenAddFormUpdate()) return;
    const defaults = getAddFormDefaults();
    setVal("addRef","");
    setVal("addProduct","");
    setVal("addDesc","");
    setVal("addStockQty","0");
    setVal("addUnit","");
    setVal("addPurchasePrice","0");
    setVal("addPurchaseTva", String(defaults.purchaseTva));
    setVal("addPrice","0");
    setVal("addTva", String(defaults.tva));
    setVal("addDiscount","0");
    const fodecToggle = getEl("addFodecEnabled");
    if (fodecToggle) fodecToggle.checked = !!defaults.fodec.enabled;
    setVal("addFodecRate", String(defaults.fodec.rate));
    setVal("addFodecTva", String(defaults.fodec.tva));
    setVal("addFodecAmount","0");
    const purchaseFodecToggle = getEl("addPurchaseFodecEnabled");
    if (purchaseFodecToggle) purchaseFodecToggle.checked = !!defaults.purchaseFodec.enabled;
    setVal("addPurchaseFodecRate", String(defaults.purchaseFodec.rate));
    setVal("addPurchaseFodecTva", String(defaults.purchaseFodec.tva));
    setVal("addPurchaseFodecAmount","0");
    if (typeof SEM.updateAddFormTotals === "function") SEM.updateAddFormTotals();
    SEM.markItemFormDirty?.(false);
  };
  SEM.fillAddFormFromItem = function (it) {
    if (shouldSkipMainscreenAddFormUpdate()) return;
    const pricing = resolveItemPricingValues(it);
    const salesTva = hasItemValue(it?.tva) ? parseItemNumber(it.tva, 0) : 19;
    setVal("addRef", it.ref ?? ""); setVal("addProduct", it.product ?? "");
    setVal("addDesc", it.desc ?? ""); setVal("addStockQty", String(it.stockQty ?? 0));
    setVal("addUnit", it.unit ?? "");
    setVal("addPurchasePrice", String(pricing.purchasePrice));
    setVal("addPurchaseTva", String(pricing.purchaseTva));
    setVal("addPrice", String(pricing.salesPrice)); setVal("addTva", String(salesTva));
    setVal("addDiscount", String(it.discount ?? 0));
    const fodec = it.fodec && typeof it.fodec === "object" ? it.fodec : {};
    const fodecToggle = getEl("addFodecEnabled");
    if (fodecToggle) fodecToggle.checked = !!fodec.enabled;
    setVal("addFodecRate",  String(fodec.rate  ?? 1));
    setVal("addFodecTva",   String(fodec.tva   ?? 19));
    const purchaseFodec = it.purchaseFodec && typeof it.purchaseFodec === "object" ? it.purchaseFodec : {};
    const purchaseFodecToggle = getEl("addPurchaseFodecEnabled");
    if (purchaseFodecToggle) purchaseFodecToggle.checked = !!purchaseFodec.enabled;
    setVal("addPurchaseFodecRate", String(purchaseFodec.rate ?? 1));
    setVal("addPurchaseFodecTva", String(purchaseFodec.tva ?? 19));
    if (typeof SEM.updateAddFormTotals === "function") SEM.updateAddFormTotals();
    SEM.markItemFormDirty?.(false);
  };

  SEM.setSubmitMode = function (mode) {
    itemFormMode = mode === "update" ? "update" : "add";
    const newBtn = getEl("btnNewItem");
    if (newBtn) newBtn.disabled = itemFormMode !== "update";
    updateItemSubmitAvailability();
  };
  function resetArticleFormState() {
    SEM.selectedItemIndex = null;
    const popover = typeof document !== "undefined" ? document.getElementById("articleFormPopover") : null;
    if (popover) delete popover.dataset.itemEditIndex;
    SEM.clearAddForm();
    SEM.setSubmitMode("add");
    SEM._markAddFormPristine?.();
    SEM.clearArticleEditContext?.();
  }

  SEM.clearAddFormAndMode = function () {
    resetArticleFormState();
    const scope = typeof SEM.resolveAddFormScope === "function" ? SEM.resolveAddFormScope() : null;
    if (scope?.id === "articleFormPopover") {
      SEM.setArticleFormBaseline?.(null, {
        scopeHint: scope,
        path: SEM.ARTICLE_NEW_BASELINE_PATH || ARTICLE_NEW_BASELINE_PATH
      });
      SEM.evaluateArticleDirtyState?.(scope, { markDirtyWithoutBaseline: false });
    }
  };
  SEM.enterUpdateMode = function (i) {
    SEM.selectedItemIndex = i;
    const popover = typeof document !== "undefined" ? document.getElementById("articleFormPopover") : null;
    if (popover) {
      popover.dataset.itemEditIndex = String(Math.max(0, Math.trunc(Number(i) || 0)));
    }
    const item = state().items[i] || {};
    SEM.fillAddFormFromItem(item);
    SEM.setSubmitMode("update");
    const path = item.__articlePath || item.path;
    const label = item.product || item.ref || "";
    if (path) {
      SEM.enterArticleEditContext?.({ path, name: label });
      SEM.showSavedArticleButtons?.();
    } else {
      SEM.clearArticleEditContext?.();
      SEM.hideSavedArticleButtons?.();
      const syntheticItemPath = `__invoice_item_${Math.max(0, Math.trunc(Number(i) || 0))}__`;
      SEM.setArticleFormBaseline?.(null, { path: syntheticItemPath });
      SEM.evaluateArticleDirtyState?.(null, { markDirtyWithoutBaseline: false });
    }
    SEM.enableNewItemButton?.();
    SEM.markItemFormDirty?.(false);
  };

  function resolveCurrentEditItemIndex() {
    const selected = Number(SEM.selectedItemIndex);
    if (Number.isFinite(selected) && selected >= 0) {
      return Math.trunc(selected);
    }
    if (typeof document === "undefined") return null;
    const popover =
      document.querySelector("#articleFormPopover:not([hidden])") ||
      document.getElementById("articleFormPopover");
    const fromPopover = Number(popover?.dataset?.itemEditIndex);
    if (Number.isFinite(fromPopover) && fromPopover >= 0) {
      return Math.trunc(fromPopover);
    }
    return null;
  }

  SEM.submitItemForm = async function (options = {}) {
    const submitOptions = options && typeof options === "object" ? options : {};
    const shouldUpdateLinkedArticle = submitOptions.updateLinkedArticle !== false;
    const docType = normalizeDocType(state().meta?.docType || getStr("docType", "facture"));
    const usePurchasePricing = docType === "fa";
    const salesPrice = getNum("addPrice", 0);
    const salesTva = getNum("addTva", 19);
    const mode = itemFormMode;
    const items = Array.isArray(state().items) ? state().items : [];
    const resolvedUpdateIndex = mode === "update" ? resolveCurrentEditItemIndex() : null;
    const isValidUpdateIndex =
      Number.isFinite(resolvedUpdateIndex) &&
      resolvedUpdateIndex >= 0 &&
      resolvedUpdateIndex < items.length;
    const existingItem = isValidUpdateIndex ? items[resolvedUpdateIndex] : null;
    if (mode === "update" && !isValidUpdateIndex) return false;
    const existingQty = parseItemNumber(existingItem?.qty, 1);
    const existingStockQty = parseItemNumber(existingItem?.stockQty, 0);
    const baseItem =
      mode === "update" && existingItem && typeof existingItem === "object"
        ? { ...existingItem }
        : {};
    const item = {
      ...baseItem,
      ref: getStr("addRef"), product: getStr("addProduct"), desc: getStr("addDesc"),
      qty: getNum("addQty", existingQty),
      stockQty: getNum("addStockQty", existingStockQty),
      unit: getStr("addUnit"),
      purchasePrice: getNum("addPurchasePrice", usePurchasePricing ? salesPrice : 0),
      purchaseTva: getNum("addPurchaseTva", usePurchasePricing ? salesTva : 0),
      price: salesPrice,
      tva: salesTva,
      discount: getNum("addDiscount",0)
    };
    const fodecEnabled = !!getEl("addFodecEnabled")?.checked;
    const fodecLabel = state().meta?.addForm?.fodec?.label || "FODEC";
    item.fodec = {
      enabled: fodecEnabled,
      label: fodecLabel,
      rate: getNum("addFodecRate", 1),
      tva: getNum("addFodecTva", 19)
    };
    const purchaseFodecEnabled = !!getEl("addPurchaseFodecEnabled")?.checked;
    const purchaseFodecLabel = state().meta?.addForm?.purchaseFodec?.label || "FODEC ACHAT";
    item.purchaseFodec = {
      enabled: purchaseFodecEnabled,
      label: purchaseFodecLabel,
      rate: getNum("addPurchaseFodecRate", 1),
      tva: getNum("addPurchaseFodecTva", 19)
    };
    if (!item.ref && !item.product && !item.desc) {
      const missingItemMessage = getMessage("ITEM_REQUIRED_FIELDS");
      await showDialog(missingItemMessage.text, { title: missingItemMessage.title });
      return false;
    }
    const linkedPath = String(
      SEM.articleEditContext?.path ||
      existingItem?.__articlePath ||
      existingItem?.path ||
      ""
    ).trim();
    if (linkedPath) item.__articlePath = linkedPath;

    if (mode === "update" && isValidUpdateIndex) {
      state().items[resolvedUpdateIndex] = item;
      SEM.selectedItemIndex = resolvedUpdateIndex;
    } else {
      mergeItemIntoState(item);
    }

    SEM.renderItems();
    if (mode === "update" && linkedPath && shouldUpdateLinkedArticle) {
      await updateLinkedArticleFromForm(linkedPath, item);
      SEM.markArticleFormDirty?.(false);
    }
    SEM.markItemFormDirty?.(false);
    SEM.clearAddFormAndMode();
    return true;
  };

  SEM.renderItems = function () {
    const body = getEl("itemBody"); if (!body) return;
    body.innerHTML = "";
    const currency = state().meta.currency || "DT";
    const taxesEnabled = isTaxesEnabled(state().meta?.taxesEnabled);
    const docType = normalizeDocType(state().meta?.docType || getStr("docType", "facture"));
    const usePurchasePricing = docType === "fa";
    const resolveLegacyTotalPurchaseLabel = (key, value, fallback) => {
      const normalizedKey = String(key || "").trim();
      const normalizedValue = String(value || "").trim().toLowerCase();
      const legacyLabelMap = {
        purchasePrice: new Set([
          "prix unitaire d'achat ht",
          "pu achat ht",
          "prix achat ht",
          "pu a. ht"
        ]),
        purchaseTva: new Set([
          "tva a l'achat %",
          "tva achat %",
          "tva a.",
          "tva a"
        ]),
        totalPurchaseHt: new Set([
          "prix unitaire d'achat ht",
          "total achat ht",
          "total a. ht"
        ]),
        totalPurchaseTtc: new Set([
          "prix unitaire d'achat ttc",
          "total achat ttc",
          "total a. ttc"
        ]),
        fodecSale: new Set([
          "fodec %",
          "fodec % v."
        ]),
        fodecPurchase: new Set([
          "fodec %",
          "fodec % a."
        ]),
        fodec: new Set([
          "fodec %",
          "fodec % v.",
          "fodec % a."
        ])
      };
      const legacySet = legacyLabelMap[normalizedKey];
      if (legacySet && legacySet.has(normalizedValue)) return fallback;
      return value;
    };
    const resolveArticleLabel = (key, fallback) => {
      const labelKeyAliases = {
        fodecSale: ["fodecAmount", "fodecSale", "fodec"],
        fodecPurchase: ["purchaseFodecAmount", "fodecPurchase", "fodec"]
      };
      const resolveRawFromState = (labels, labelKey) => {
        const source = labels && typeof labels === "object" ? labels : {};
        const normalizedKey = String(labelKey || "").trim();
        if (!normalizedKey) return "";
        const candidates = labelKeyAliases[normalizedKey] || [normalizedKey];
        for (const candidate of candidates) {
          const value = typeof source[candidate] === "string" ? source[candidate].trim() : "";
          if (value) return value;
        }
        return "";
      };
      const normalizeResolved = (value) => {
        const resolved = typeof value === "string" ? value.trim() : "";
        const safe = resolved || fallback;
        return resolveLegacyTotalPurchaseLabel(key, safe, fallback);
      };
      if (typeof helpers.resolveArticleFieldLabel === "function") {
        return normalizeResolved(helpers.resolveArticleFieldLabel(key, fallback));
      }
      const articleLabels = state().meta?.articleFieldLabels || {};
      const raw = resolveRawFromState(articleLabels, key);
      return normalizeResolved(raw);
    };
    const tableHeaderFallbacks = {
      purchasePrice: taxesEnabled ? "PU A. HT" : "PU A.",
      purchaseTva: "TVA A.",
      fodecPurchase: "FODEC A.",
      price: taxesEnabled ? "P.U. HT" : "Prix unitaire",
      fodecSale: "FODEC",
      totalPurchaseHt: taxesEnabled ? "Total A. HT" : "Total A.",
      totalPurchaseTtc: taxesEnabled ? "Total A. TTC" : "Total A.",
      totalHt: taxesEnabled ? "Total HT" : "Total"
    };
    document.querySelectorAll("#items thead th[data-article-field-label]").forEach((cell) => {
      const key = String(cell?.dataset?.articleFieldLabel || "").trim();
      if (!key) return;
      const staticFallback = String(cell.textContent || "").trim();
      const fallback = Object.prototype.hasOwnProperty.call(tableHeaderFallbacks, key)
        ? tableHeaderFallbacks[key]
        : staticFallback;
      const nextLabel = resolveArticleLabel(key, fallback);
      if (nextLabel) cell.textContent = nextLabel;
    });

    const priceLabel = String(getEl("itemsPriceHeader")?.textContent || "").trim() ||
      resolveArticleLabel("price", tableHeaderFallbacks.price);
    const totalLabel = String(getEl("itemsTotalHtHeader")?.textContent || "").trim() ||
      resolveArticleLabel("totalHt", tableHeaderFallbacks.totalHt);
    const saleFodecLabel = String(getEl("itemsFodecHeader")?.textContent || "").trim() ||
      resolveArticleLabel("fodecSale", "");
    const purchaseFodecLabel = String(getEl("itemsFodecPurchaseHeader")?.textContent || "").trim() ||
      resolveArticleLabel("fodecPurchase", "");
    const resolvedFodecLabel = (
      usePurchasePricing
      ? (purchaseFodecLabel || saleFodecLabel)
      : (saleFodecLabel || purchaseFodecLabel)
    ) || "FODEC";

    const setLabel = (id, text) => { const el = getEl(id); if (el) el.textContent = text; };
    setLabel("togglePriceLabel", priceLabel);
    setLabel("toggleFodecLabel", resolvedFodecLabel);
    setLabel("toggleTotalHtLabel", totalLabel);
    if (!shouldSkipMainscreenAddFormUpdate()) {
      setLabel("addPriceLabel", priceLabel);
    }
    setLabel("miniHTLabel", totalLabel);
    const priceToggle = getEl("colTogglePrice");
    if (priceToggle) priceToggle.setAttribute("aria-label", `Masquer colonne ${priceLabel}`);
    const fodecToggle = getEl("colToggleFodec");
    if (fodecToggle) fodecToggle.setAttribute("aria-label", `Masquer colonne ${resolvedFodecLabel}`);
    const totalHtToggle = getEl("colToggleTotalHt");
    if (totalHtToggle) totalHtToggle.setAttribute("aria-label", `Masquer ${totalLabel}`);

    state().items.forEach((raw, i) => {
      const pricing = resolveItemPricingValues(raw);
      const qtySource = pickItemNumericValue(raw, ["qty", "quantity", "qte", "quantite"]);
      const discountSource = pickItemNumericValue(raw, [
        "discount",
        "discountPct",
        "discount_pct",
        "discountRate",
        "discount_rate",
        "remise"
      ]);
      const it = {
        ref: raw.ref ?? "",
        product: raw.product ?? (raw.desc ? String(raw.desc) : ""),
        desc: raw.product ? (raw.desc ?? "") : (raw.desc ?? ""),
        qty: hasItemValue(qtySource) ? parseItemNumber(qtySource, 0) : parseItemNumber(raw.qty, 0),
        unit: raw.unit ?? "",
        purchasePrice: pricing.purchasePrice,
        purchaseTva: pricing.purchaseTva,
        price: pricing.salesPrice,
        tva: pricing.salesTva,
        discount: hasItemValue(discountSource)
          ? parseItemNumber(discountSource, 0)
          : parseItemNumber(raw.discount, 0),
        fodec: normalizeItemFodec(raw.fodec),
        purchaseFodec: normalizeItemPurchaseFodec(raw.purchaseFodec)
      };
      const salesBase = it.qty * it.price;
      const salesDiscount = salesBase * (it.discount / 100);
      const salesTaxedBase = Math.max(0, salesBase - salesDiscount);
      const tvaRate = taxesEnabled ? it.tva : 0;
      const tax = salesTaxedBase * (tvaRate / 100);
      const fEnabled = !!it.fodec?.enabled && Number.isFinite(Number(it.fodec?.rate));
      const fRate = Number(it.fodec?.rate || 0);
      const fTvaRate = taxesEnabled ? Number(it.fodec?.tva || 0) : 0;
      const fodec = fEnabled ? salesTaxedBase * (fRate / 100) : 0;
      const fodecTva = fEnabled && taxesEnabled ? fodec * (fTvaRate / 100) : 0;
      const purchaseBase = it.qty * it.purchasePrice;
      const purchaseDiscount = purchaseBase * (it.discount / 100);
      const purchaseTaxedBase = Math.max(0, purchaseBase - purchaseDiscount);
      const purchaseTvaRate = taxesEnabled ? it.purchaseTva : 0;
      const purchaseFEnabled =
        !!it.purchaseFodec?.enabled && Number.isFinite(Number(it.purchaseFodec?.rate));
      const purchaseFRate = Number(it.purchaseFodec?.rate || 0);
      const purchaseFTvaRate = taxesEnabled ? Number(it.purchaseFodec?.tva || 0) : 0;
      const purchaseFodec = purchaseFEnabled ? purchaseTaxedBase * (purchaseFRate / 100) : 0;
      const purchaseFodecTva =
        purchaseFEnabled && taxesEnabled ? purchaseFodec * (purchaseFTvaRate / 100) : 0;
      const linePurchaseHt = purchaseTaxedBase;
      const linePurchaseTtc =
        linePurchaseHt + linePurchaseHt * (purchaseTvaRate / 100) + purchaseFodec + purchaseFodecTva;
      const lineHT = usePurchasePricing ? linePurchaseHt : salesTaxedBase;
      const lineTotal = usePurchasePricing
        ? linePurchaseTtc
        : (salesTaxedBase + tax + fodec + fodecTva);
      const saleFodecDisplayRate = Number.isFinite(fRate) ? fRate : 0;
      const purchaseFodecDisplayRate = Number.isFinite(purchaseFRate) ? purchaseFRate : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="cell-ref">${escapeHTML(it.ref)}</td>
        <td class="cell-product">${escapeHTML(it.product)}</td>
        <td class="cell-desc">${escapeHTML(it.desc)}</td>
        <td class="cell-qty right">${formatQty(it.qty)}</td>
        <td class="cell-unit">${it.unit ? escapeHTML(it.unit) : "&mdash;"}</td>
        <td class="cell-purchase-price right">${formatMoney(it.purchasePrice, currency)}</td>
        <td class="cell-purchase-tva right">${formatPct(purchaseTvaRate)}</td>
        <td class="cell-fodec-purchase right">${formatPct(purchaseFEnabled ? purchaseFodecDisplayRate : 0)}</td>
        <td class="cell-price right">${formatMoney(it.price, currency)}</td>
        <td class="cell-tva right">${formatPct(tvaRate)}</td>
        <td class="cell-fodec-sale right">${formatPct(fEnabled ? saleFodecDisplayRate : 0)}</td>
        <td class="cell-discount right">
          <input
            type="number"
            class="discount-input"
            min="0"
            step="0.01"
            value="${Number.isFinite(it.discount) ? it.discount : 0}"
            data-discount-input="${i}"
            aria-label="Remise de la ligne ${i + 1}"
          />
        </td>
        <td class="cell-total-purchase-ht right">${formatMoney(linePurchaseHt, currency)}</td>
        <td class="cell-total-purchase-ttc right">${formatMoney(linePurchaseTtc, currency)}</td>
        <td class="cell-total-ht right">${formatMoney(lineHT, currency)}</td>
        <td class="cell-ttc right">${formatMoney(lineTotal, currency)}</td>
        <td class="add-actions cell-action">
          <div class="actions-stack">
            <div class="qty-controls" aria-label="Actions quantité">
              <button class="btn tiny qty-btn dec" data-qty-dec="${i}" title="Diminuer la quantité" aria-label="Diminuer la quantité">&minus;</button>
              <input type="number" class="qty-input" min="0.01" step="0.01" value="${Number(it.qty ?? 1)}" data-qty-input="${i}" aria-label="Quantité de la ligne ${i + 1}" />
              <button class="btn tiny qty-btn inc" data-qty-inc="${i}" title="Augmenter la quantité" aria-label="Augmenter la quantité">+</button>
            </div>
            <div class="action-buttons">
              <button class="btn tiny sel" data-sel="${i}">Editer</button>
              <button class="del" data-del="${i}">Supprimer</button>
            </div>
          </div>
        </td>`;
      body.appendChild(tr);
    });

    body.querySelectorAll("button.del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.del);
        state().items.splice(idx, 1);
        if (SEM.selectedItemIndex === idx) SEM.clearAddFormAndMode();
        SEM.renderItems();
      });
    });
    body.querySelectorAll("button.sel").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const selectedIndex = Number(e.currentTarget.dataset.sel);
        const trigger = e.currentTarget;
        const applySelectionToAddForm = () => {
          if (typeof SEM.setActiveAddFormScope === "function") {
            const addFormScope =
              document.getElementById("articleFormPopover") ||
              document.getElementById("addItemBoxMainscreen") ||
              document.getElementById("addItemBox");
            if (addFormScope) SEM.setActiveAddFormScope(addFormScope);
          }
          SEM.enterUpdateMode(selectedIndex);
        };
        if (typeof SEM.openArticleFormPopoverForUpdate === "function") {
          setTimeout(() => {
            SEM.openArticleFormPopoverForUpdate({ trigger, selectedItemIndex: selectedIndex });
            applySelectionToAddForm();
          }, 0);
          return;
        }
        applySelectionToAddForm();
      });
    });
    body.querySelectorAll("[data-qty-inc]").forEach(btn => {
      btn.addEventListener("click", (e) => adjustItemQuantity(Number(e.currentTarget.dataset.qtyInc), 1));
    });
    body.querySelectorAll("[data-qty-dec]").forEach(btn => {
      btn.addEventListener("click", (e) => adjustItemQuantity(Number(e.currentTarget.dataset.qtyDec), -1));
    });
    body.querySelectorAll("[data-qty-input]").forEach(input => {
      const commit = () => setItemQuantity(Number(input.dataset.qtyInput), input.value);
      input.addEventListener("change", commit);
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      });
    });
    body.querySelectorAll("[data-discount-input]").forEach(input => {
      const commit = () => setItemDiscount(Number(input.dataset.discountInput), input.value);
      input.addEventListener("change", commit);
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      });
    });

    SEM.computeTotals();
    SEM.applyColumnHiding();
  };

  // Merge duplicate articles instead of duplicating rows.
  function mergeItemIntoState(candidate = {}) {
    const items = state().items;
    if (!Array.isArray(items)) return -1;
    const idx = items.findIndex((existing) => itemsCanMerge(existing, candidate));
    if (idx !== -1) {
      const currentQty = Number(items[idx].qty ?? 0) || 0;
      const incomingQty = Number(candidate.qty ?? 0) || 0;
      items[idx].qty = currentQty + incomingQty;
      return idx;
    }
    items.push(candidate);
    return items.length - 1;
  }
  helpers.mergeItemIntoState = mergeItemIntoState;

  function itemsCanMerge(a = {}, b = {}) {
    const fA = normalizeItemFodec(a.fodec);
    const fB = normalizeItemFodec(b.fodec);
    const pfA = normalizeItemPurchaseFodec(a.purchaseFodec);
    const pfB = normalizeItemPurchaseFodec(b.purchaseFodec);
    return (
      normalizeItemStr(a.ref) === normalizeItemStr(b.ref) &&
      normalizeItemStr(a.product) === normalizeItemStr(b.product) &&
      normalizeItemStr(a.desc) === normalizeItemStr(b.desc) &&
      normalizeItemStr(a.unit) === normalizeItemStr(b.unit) &&
      normalizeItemNum(a.purchasePrice) === normalizeItemNum(b.purchasePrice) &&
      normalizeItemNum(a.purchaseTva) === normalizeItemNum(b.purchaseTva) &&
      normalizeItemNum(a.price) === normalizeItemNum(b.price) &&
      normalizeItemNum(a.tva) === normalizeItemNum(b.tva) &&
      fA.enabled === fB.enabled &&
      fA.label === fB.label &&
      fA.rate === fB.rate &&
      fA.tva === fB.tva &&
      pfA.enabled === pfB.enabled &&
      pfA.label === pfB.label &&
      pfA.rate === pfB.rate &&
      pfA.tva === pfB.tva
    );
  }

  function normalizeItemStr(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function normalizeItemNum(value) {
    return parseItemNumber(value, 0);
  }

  function normalizeItemFodec(raw = {}) {
    const f = raw && typeof raw === "object" ? raw : {};
    return {
      enabled: !!f.enabled,
      label: normalizeItemStr(f.label || "FODEC"),
      rate: normalizeItemNum(f.rate),
      tva: normalizeItemNum(f.tva)
    };
  }

  function normalizeItemPurchaseFodec(raw = {}) {
    const f = raw && typeof raw === "object" ? raw : {};
    return {
      enabled: !!f.enabled,
      label: normalizeItemStr(f.label || "FODEC ACHAT"),
      rate: normalizeItemNum(f.rate),
      tva: normalizeItemNum(f.tva)
    };
  }

  const MIN_QTY = 0.01;
  const MIN_DISCOUNT = 0;

  function setItemQuantity(index, value) {
    const items = state().items;
    if (!Array.isArray(items) || typeof index !== "number") return;
    if (index < 0 || index >= items.length) return;
    const numeric =
      typeof value === "string" ? Number(value.replace?.(",", ".") ?? value) : Number(value);
    const safeValue = Math.max(MIN_QTY, Number.isFinite(numeric) ? numeric : MIN_QTY);
    const currentQty = Number(items[index].qty ?? 0) || 0;
    if (safeValue === currentQty) return;
    items[index].qty = safeValue;
    SEM.renderItems();
  }

  function setItemDiscount(index, value) {
    const items = state().items;
    if (!Array.isArray(items) || typeof index !== "number") return;
    if (index < 0 || index >= items.length) return;
    const numeric =
      typeof value === "string" ? Number(value.replace?.(",", ".") ?? value) : Number(value);
    const safeValue = Math.max(MIN_DISCOUNT, Number.isFinite(numeric) ? numeric : MIN_DISCOUNT);
    const currentDiscount = Number(items[index].discount ?? 0) || 0;
    if (safeValue === currentDiscount) return;
    items[index].discount = safeValue;
    SEM.renderItems();
  }

  function adjustItemQuantity(index, delta) {
    const items = state().items;
    if (!Array.isArray(items) || typeof index !== "number") return;
    if (index < 0 || index >= items.length || delta === 0) return;
    const currentQty = Number(items[index].qty ?? 0) || 0;
    setItemQuantity(index, currentQty + delta);
  }

  function getAddFormInputs() {
    return [
      getEl("addRef"),
      getEl("addProduct"),
      getEl("addDesc"),
      getEl("addStockQty"),
      getEl("addUnit"),
      getEl("addPurchasePrice"),
      getEl("addPurchaseTva"),
      getEl("addPrice"),
      getEl("addTva"),
      getEl("addDiscount"),
      getEl("addFodecEnabled"),
      getEl("addFodecRate"),
      getEl("addFodecTva"),
      getEl("addPurchaseFodecEnabled"),
      getEl("addPurchaseFodecRate"),
      getEl("addPurchaseFodecTva")
    ].filter(Boolean);
  }

  function setAddInputVisibility(options = {}) {
    const mainscreenForm = typeof document !== "undefined" ? document.getElementById("addItemBoxMainscreen") : null;
    const scope = typeof SEM.resolveAddFormScope === "function" ? SEM.resolveAddFormScope() : null;
    const roots = [];
    const addRoot = (node) => {
      if (node && !roots.includes(node)) roots.push(node);
    };
    addRoot(scope);
    addRoot(mainscreenForm);
    if (!roots.length && typeof document !== "undefined") {
      roots.push(document);
    }
    if (!roots.length) return;
    const taxesEnabled = isTaxesEnabled(state().meta?.taxesEnabled);
    const resolved = {
      ref: true,
      product: true,
      desc: true,
      stockQty: true,
      unit: true,
      purchasePrice: false,
      purchaseTva: false,
      totalPurchaseHt: false,
      price: true,
      tva: true,
      discount: true,
      addPurchaseFodec: false,
      addFodec: true,
      totalPurchaseTtc: false,
      totalHt: true,
      totalTtc: true,
      fodec: true,
      fodecAmount: true,
      purchaseSectionEnabled: true,
      salesSectionEnabled: true,
      ...options
    };
    const map = {
      addRef: resolved.ref,
      addProduct: resolved.product,
      addDesc: resolved.desc,
      addStockQty: resolved.stockQty,
      addUnit: resolved.unit,
      addPurchasePrice: resolved.purchasePrice,
      addPurchaseTva: resolved.purchaseTva,
      addTotalPurchaseHt: resolved.totalPurchaseHt,
      addPrice: resolved.price,
      addTva: resolved.tva,
      addDiscount: resolved.discount,
      addTotalPurchaseTtc: resolved.totalPurchaseTtc,
      addTotalHt: resolved.totalHt,
      addTotalTtc: resolved.totalTtc,
      addFodecEnabled: resolved.addFodec,
      addFodecRate: resolved.addFodec,
      addFodecTva: resolved.addFodec,
      addFodecAmount: resolved.addFodec,
      addPurchaseFodecEnabled: resolved.addPurchaseFodec,
      addPurchaseFodecRate: resolved.addPurchaseFodec,
      addPurchaseFodecTva: resolved.addPurchaseFodec,
      addPurchaseFodecAmount: resolved.addPurchaseFodec
    };
    const skipAddFormUpdate = shouldSkipMainscreenAddFormUpdate();
    roots.forEach((root) => {
      if (skipAddFormUpdate && (root?.id === "addItemBoxMainscreen" || root?.id === "addItemBox")) return;
      Object.entries(map).forEach(([id, vis]) => {
        const el = root.querySelector ? root.querySelector(`#${id}`) : getEl(id);
        if (!el) return;
        let shouldShow = vis;
        if (
          !taxesEnabled &&
          (
            id === "addTva" ||
            id === "addPurchaseTva" ||
            id === "addPurchaseFodecTva" ||
            id === "addTotalPurchaseTtc" ||
            id === "addTotalTtc"
          )
        ) {
          shouldShow = false;
        }
        const label = root.querySelector ? root.querySelector(`label[for="${id}"]`) : null;
        const wrapper = el.parentElement && el.parentElement.tagName === "DIV" ? el.parentElement : null;

        if (wrapper) {
          // Hide the whole field block so the CSS grid reflows without gaps.
          wrapper.style.display = shouldShow ? "" : "none";
          el.style.display = "";
          if (label) label.style.display = "";
        } else {
          el.style.display = shouldShow ? "" : "none";
          if (label) label.style.display = shouldShow ? "" : "none";
        }
      });
      const fodecRow = root.querySelector ? root.querySelector("#addFodecRow") : null;
      if (fodecRow) {
        const fodecVisible = typeof resolved.addFodec === "boolean" ? resolved.addFodec : resolved.fodec;
        fodecRow.style.display = fodecVisible ? "" : "none";
      }
      const purchaseFodecRow = root.querySelector ? root.querySelector("#addPurchaseFodecRow") : null;
      if (purchaseFodecRow) {
        const purchaseFodecVisible =
          typeof resolved.addPurchaseFodec === "boolean" ? resolved.addPurchaseFodec : resolved.purchasePrice;
        purchaseFodecRow.style.display = purchaseFodecVisible ? "" : "none";
      }
      const pricingLayout = root.querySelector ? root.querySelector(".article-pricing-layout") : null;
      if (pricingLayout) {
        const showPurchaseSection = resolved.purchaseSectionEnabled !== false;
        const showSalesSection = resolved.salesSectionEnabled !== false;
        pricingLayout.classList.toggle("is-purchase-hidden", !showPurchaseSection);
        pricingLayout.classList.toggle("is-sales-hidden", !showSalesSection);
        const purchaseColumn = pricingLayout.querySelector(".article-pricing-column--purchase");
        if (purchaseColumn) purchaseColumn.style.display = showPurchaseSection ? "" : "none";
        const salesColumn = pricingLayout.querySelector(".article-pricing-column--sales");
        if (salesColumn) salesColumn.style.display = showSalesSection ? "" : "none";
      }
    });
  }
  function setReadOnlyNumberValue(id, value) {
    const el = getEl(id);
    if (!el) return;
    const currency = state().meta.currency || "DT";
    const dec = String(currency || "").trim().toUpperCase() === "DT" ? 3 : 2;
    const safe = Number.isFinite(value) ? value.toFixed(dec) : (dec === 3 ? "0.000" : "0.00");
    if (el.value !== safe) el.value = safe;
  }

  SEM.enableNewItemButton = function () {
    const newBtn = getEl("btnNewItem");
    if (newBtn) newBtn.disabled = false;
  };

  SEM._markAddFormDirty = function () {
    SEM.enableNewItemButton();
    SEM.markItemFormDirty?.(true);
  };

  SEM._markAddFormPristine = function () {
    const newBtn = getEl("btnNewItem");
    if (newBtn) newBtn.disabled = true;
    SEM.markItemFormDirty?.(false);
  };

  function sanitizeLinkedItemText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function sanitizeLinkedItemNumber(value, fallback = 0) {
    return parseItemNumber(value, fallback);
  }

  function sanitizeLinkedItemFodec(value = {}) {
    const f = value && typeof value === "object" ? value : {};
    return {
      enabled: !!f.enabled,
      label: sanitizeLinkedItemText(f.label || "FODEC"),
      rate: sanitizeLinkedItemNumber(f.rate, 0),
      tva: sanitizeLinkedItemNumber(f.tva, 0)
    };
  }

  function sanitizeLinkedItemPurchaseFodec(value = {}) {
    const f = value && typeof value === "object" ? value : {};
    return {
      enabled: !!f.enabled,
      label: sanitizeLinkedItemText(f.label || "FODEC ACHAT"),
      rate: sanitizeLinkedItemNumber(f.rate, 0),
      tva: sanitizeLinkedItemNumber(f.tva, 0)
    };
  }

  function normalizeArticleForInvoiceItem(article = {}) {
    const pricing = resolveItemPricingValues(article);
    return {
      ref: sanitizeLinkedItemText(article.ref),
      product: sanitizeLinkedItemText(article.product),
      desc: sanitizeLinkedItemText(article.desc),
      unit: sanitizeLinkedItemText(article.unit),
      purchasePrice: sanitizeLinkedItemNumber(pricing.purchasePrice),
      purchaseTva: sanitizeLinkedItemNumber(pricing.purchaseTva),
      price: sanitizeLinkedItemNumber(pricing.salesPrice),
      tva: sanitizeLinkedItemNumber(pricing.salesTva),
      discount: sanitizeLinkedItemNumber(article.discount),
      fodec: sanitizeLinkedItemFodec(article.fodec),
      purchaseFodec: sanitizeLinkedItemPurchaseFodec(article.purchaseFodec)
    };
  }

  function updateLinkedInvoiceItemsFromArticle(path, article = {}) {
    if (!path) return false;
    const items = state().items;
    if (!Array.isArray(items)) return false;
    const normalized = normalizeArticleForInvoiceItem(article);
    let touched = false;

    items.forEach((item = {}) => {
      const itemPath = item.__articlePath || item.path || "";
      if (itemPath !== path) return;
      const previousQty = item.qty;
      const currentFodec = sanitizeLinkedItemFodec(item.fodec);
      const nextFodec = normalized.fodec;
      const currentPurchaseFodec = sanitizeLinkedItemPurchaseFodec(item.purchaseFodec);
      const nextPurchaseFodec = normalized.purchaseFodec;
      const alreadySynced =
        sanitizeLinkedItemText(item.ref) === normalized.ref &&
        sanitizeLinkedItemText(item.product) === normalized.product &&
        sanitizeLinkedItemText(item.desc) === normalized.desc &&
        sanitizeLinkedItemText(item.unit) === normalized.unit &&
        sanitizeLinkedItemNumber(item.purchasePrice) === normalized.purchasePrice &&
        sanitizeLinkedItemNumber(item.purchaseTva) === normalized.purchaseTva &&
        sanitizeLinkedItemNumber(item.price) === normalized.price &&
        sanitizeLinkedItemNumber(item.tva) === normalized.tva &&
        sanitizeLinkedItemNumber(item.discount) === normalized.discount &&
        currentFodec.enabled === nextFodec.enabled &&
        currentFodec.label === nextFodec.label &&
        currentFodec.rate === nextFodec.rate &&
        currentFodec.tva === nextFodec.tva &&
        currentPurchaseFodec.enabled === nextPurchaseFodec.enabled &&
        currentPurchaseFodec.label === nextPurchaseFodec.label &&
        currentPurchaseFodec.rate === nextPurchaseFodec.rate &&
        currentPurchaseFodec.tva === nextPurchaseFodec.tva;
      item.__articlePath = path;
      if (alreadySynced) return;

      item.ref = normalized.ref;
      item.product = normalized.product;
      item.desc = normalized.desc;
      item.unit = normalized.unit;
      item.purchasePrice = normalized.purchasePrice;
      item.purchaseTva = normalized.purchaseTva;
      item.price = normalized.price;
      item.tva = normalized.tva;
      item.discount = normalized.discount;
      item.fodec = { ...nextFodec };
      item.purchaseFodec = { ...nextPurchaseFodec };
      item.qty = previousQty;
      touched = true;
    });

    if (touched) {
      SEM.renderItems?.();
    }
    return touched;
  }
  SEM.updateLinkedInvoiceItemsFromArticle = updateLinkedInvoiceItemsFromArticle;

    (function initAddFormDirtyTracking() {
      if (SEM.__addFormDirtyDelegated) return;
      SEM.__addFormDirtyDelegated = true;
      const watchedIds = new Set([
        "addRef",
        "addProduct",
        "addDesc",
        "addStockQty",
        "addUnit",
        "addPurchasePrice",
        "addPurchaseTva",
        "addPrice",
        "addTva",
        "addDiscount",
        "addFodecEnabled",
        "addFodecRate",
        "addFodecTva",
        "addPurchaseFodecEnabled",
        "addPurchaseFodecRate",
        "addPurchaseFodecTva"
      ]);
      const scopeSelector = "#addItemBox, #addItemBoxMainscreen, #articleFormPopover";
      const handleDirtyInput = (evt) => {
        const target = evt?.target;
        if (!target || !watchedIds.has(target.id)) return;
        const scope = typeof target.closest === "function" ? target.closest(scopeSelector) : null;
        if (scope && typeof SEM.setActiveAddFormScope === "function") {
          SEM.setActiveAddFormScope(scope);
        }
        SEM._markAddFormDirty();
        if (typeof SEM.evaluateArticleDirtyState === "function") {
          const markDirtyWithoutBaseline = scope?.id !== "articleFormPopover";
          SEM.evaluateArticleDirtyState(scope, { markDirtyWithoutBaseline });
        } else {
          SEM.markArticleFormDirty?.(true);
        }
        SEM.updateAddFormTotals?.();
      };
      document.addEventListener("input", handleDirtyInput);
      document.addEventListener("change", handleDirtyInput);
    })();


  SEM.updateAddFormTotals = function () {
    if (shouldSkipMainscreenAddFormUpdate()) return;
    const qty = getNum("addQty", 1);
    const purchasePrice = getNum("addPurchasePrice", 0);
    const purchaseTva = getNum("addPurchaseTva", 0);
    const price = getNum("addPrice", 0);
    const discount = getNum("addDiscount", 0);
    const tva = getNum("addTva", 19);
    const fodecEnabled = !!getEl("addFodecEnabled")?.checked;
    const fodecRate = getNum("addFodecRate", 1);
    const fodecTvaRate = getNum("addFodecTva", 19);
    const purchaseFodecEnabled = !!getEl("addPurchaseFodecEnabled")?.checked;
    const purchaseFodecRate = getNum("addPurchaseFodecRate", 1);
    const purchaseFodecTvaRate = getNum("addPurchaseFodecTva", 19);
    const taxesEnabled = isTaxesEnabled(state().meta?.taxesEnabled);
    const docType = normalizeDocType(state().meta?.docType || getStr("docType", "facture"));
    const usePurchasePricing = docType === "fa";

    const salesBase = qty * price;
    const purchaseBase = qty * purchasePrice;
    const activeBase = usePurchasePricing ? purchaseBase : salesBase;
    const discountAmount = activeBase * (discount / 100);
    const totalHT = Math.max(0, activeBase - discountAmount);
    const activeTvaRate = usePurchasePricing ? purchaseTva : tva;
    const tax = taxesEnabled ? totalHT * (activeTvaRate / 100) : 0;
    const fodec = !usePurchasePricing && fodecEnabled ? totalHT * (fodecRate / 100) : 0;
    const fodecTva = taxesEnabled && !usePurchasePricing && fodecEnabled ? fodec * (fodecTvaRate / 100) : 0;
    const purchaseDiscountAmount = purchaseBase * (discount / 100);
    const totalPurchaseHT = Math.max(0, purchaseBase - purchaseDiscountAmount);
    const purchaseTax = taxesEnabled ? totalPurchaseHT * (purchaseTva / 100) : 0;
    const purchaseFodec = purchaseFodecEnabled ? totalPurchaseHT * (purchaseFodecRate / 100) : 0;
    const purchaseFodecTva =
      taxesEnabled && purchaseFodecEnabled ? purchaseFodec * (purchaseFodecTvaRate / 100) : 0;
    const purchaseTtc = totalPurchaseHT + purchaseTax + purchaseFodec + purchaseFodecTva;
    const totalTTC = usePurchasePricing
      ? totalHT + tax + purchaseFodec + purchaseFodecTva
      : totalHT + tax + fodec + fodecTva;

    const fodecRow = getEl("addFodecRow");
    if (fodecRow) fodecRow.dataset.fodecActive = fodecEnabled ? "true" : "false";
    const purchaseFodecRow = getEl("addPurchaseFodecRow");
    if (purchaseFodecRow) purchaseFodecRow.dataset.fodecActive = purchaseFodecEnabled ? "true" : "false";

    setReadOnlyNumberValue("addTotalPurchaseHt", totalPurchaseHT);
    setReadOnlyNumberValue("addTotalPurchaseTtc", purchaseTtc);
    setReadOnlyNumberValue("addTotalHt", totalHT);
    setReadOnlyNumberValue("addPurchaseFodecAmount", purchaseFodecEnabled ? purchaseFodec : 0);
    setReadOnlyNumberValue("addFodecAmount", fodecEnabled ? fodec : 0);
    setReadOnlyNumberValue("addTotalTtc", totalTTC);
  };

  SEM.applyColumnHiding = function () {
    const columns = resolveColumnVisibility();
    const tableColumns = resolveModelColumnVisibility();
    const taxesEnabled = isTaxesEnabled(state().meta?.taxesEnabled);

    const tableRefVis = tableColumns.ref !== false;
    const tableProductVis = tableColumns.product !== false;
    const tableDescVis = tableColumns.desc !== false;
    const tableQtyVis = tableColumns.qty !== false;
    const tableUnitVis = tableColumns.unit !== false;
    const tablePurchasePriceVis = tableColumns.purchasePrice !== false;
    const tablePurchaseTvaVis = taxesEnabled && tableColumns.purchaseTva !== false;
    const tablePriceVis = tableColumns.price !== false;
    const tableShowFodecSale =
      taxesEnabled &&
      tablePriceVis &&
      tableColumns.fodecSale !== false;
    const tableShowFodecPurchase =
      taxesEnabled &&
      tablePurchasePriceVis &&
      tableColumns.fodecPurchase !== false;
    const tableShowTva = taxesEnabled && tableColumns.tva !== false;
    const tableDiscountVis = tableColumns.discount !== false;
    const tableShowTotalPurchaseHt = tableColumns.totalPurchaseHt !== false;
    const tableShowTotalPurchaseTtc = taxesEnabled && tableColumns.totalPurchaseTtc !== false;
    const tableShowTotalHt = tablePriceVis && tableColumns.totalHt !== false;
    const tableShowTotalTtc = tablePriceVis && tableColumns.totalTtc !== false;
    const showSalesFinancialColumns =
      tablePriceVis || tableShowFodecSale || tableShowTva || tableShowTotalHt || tableShowTotalTtc;
    const showPurchaseFinancialColumns =
      tablePurchasePriceVis ||
      tablePurchaseTvaVis ||
      tableShowFodecPurchase ||
      tableShowTotalPurchaseHt ||
      tableShowTotalPurchaseTtc;
    const showFinancialSummary = showSalesFinancialColumns || showPurchaseFinancialColumns;

    document.body.classList.toggle("hide-col-ref", !tableRefVis);
    document.body.classList.toggle("hide-col-product", !tableProductVis);
    document.body.classList.toggle("hide-col-desc", !tableDescVis);
    document.body.classList.toggle("hide-col-qty", !tableQtyVis);
    document.body.classList.toggle("hide-col-unit", !tableUnitVis);
    document.body.classList.toggle("hide-col-purchase-price", !tablePurchasePriceVis);
    document.body.classList.toggle("hide-col-purchase-tva", !tablePurchaseTvaVis);
    document.body.classList.toggle("hide-col-price", !tablePriceVis);
    document.body.classList.toggle("hide-col-fodec-sale", !tableShowFodecSale);
    document.body.classList.toggle("hide-col-fodec-purchase", !tableShowFodecPurchase);
    document.body.classList.toggle("hide-col-fodec", !(tableShowFodecSale || tableShowFodecPurchase));
    document.body.classList.toggle("hide-col-tva", !tableShowTva);
    document.body.classList.toggle("hide-col-discount", !tableDiscountVis);
    document.body.classList.toggle("hide-col-total-purchase-ht", !tableShowTotalPurchaseHt);
    document.body.classList.toggle("hide-col-total-purchase-ttc", !tableShowTotalPurchaseTtc);
    document.body.classList.toggle("hide-col-total-ht", !tableShowTotalHt);
    document.body.classList.toggle("hide-col-ttc", !tableShowTotalTtc);

    const totalsRow = queryItemsScoped(".totals-row");
    if (totalsRow) totalsRow.style.display = "";

    const mini = queryItemsScoped(".mini-sum");
    if (mini) mini.style.display = showFinancialSummary ? "" : "none";

    const tvaCard = getItemsScopedEl("tvaBreakdownCard");
    const tvaBody = getItemsScopedEl("tvaBreakdownBody");
    const hasTvaRows = !!tvaBody?.querySelector("tr");
    const showTvaCard = showFinancialSummary && taxesEnabled && hasTvaRows;
    if (tvaCard) tvaCard.style.display = showTvaCard ? "" : "none";

    const formRefVis = columns.ref !== false;
    const formProductVis = columns.product !== false;
    const formDescVis = columns.desc !== false;
    const formUnitVis = columns.unit !== false;
    const formPriceVis = columns.price !== false;
    const formShowTva = taxesEnabled && columns.tva !== false;
    const formDiscountVis = columns.discount !== false;
    const formShowTotalHt = formPriceVis && columns.totalHt !== false;
    const formShowTotalTtc = formPriceVis && columns.totalTtc !== false;
    const purchaseSectionEnabled = columns.purchaseSectionEnabled !== false;
    const salesSectionEnabled = columns.salesSectionEnabled !== false;

    setAddInputVisibility({
      ref: formRefVis,
      product: formProductVis,
      desc: formDescVis,
      stockQty: columns.stockQty !== false,
      unit: formUnitVis,
      purchasePrice: purchaseSectionEnabled && columns.purchasePrice !== false,
      purchaseTva: purchaseSectionEnabled && columns.purchaseTva !== false,
      addPurchaseFodec: purchaseSectionEnabled && columns.addPurchaseFodec !== false,
      price: salesSectionEnabled && formPriceVis,
      fodec: salesSectionEnabled && formPriceVis,
      fodecAmount: salesSectionEnabled && formPriceVis,
      addFodec: salesSectionEnabled && columns.addFodec !== false,
      tva: salesSectionEnabled && formShowTva,
      discount: salesSectionEnabled && formDiscountVis,
      totalPurchaseHt: purchaseSectionEnabled && columns.totalPurchaseHt !== false,
      totalPurchaseTtc: purchaseSectionEnabled && columns.totalPurchaseTtc !== false,
      totalHt: salesSectionEnabled && formShowTotalHt,
      totalTtc: salesSectionEnabled && formShowTotalTtc,
      purchaseSectionEnabled,
      salesSectionEnabled
    });
  };

  SEM.resetItemsSection = function () {
    const st = state();
    const toggleDefaults = { ...COLUMN_DEFAULTS };
    const allToggles =
      (typeof document !== "undefined" && document.querySelectorAll
        ? Array.from(document.querySelectorAll("input.col-toggle[id^='colToggle']"))
        : []);
    const mainToggles = allToggles.filter((input) => !isModelColumnToggle(input));
    const modelToggles = allToggles.filter((input) => isModelColumnToggle(input));
    if (st?.meta) {
      st.meta.columns = { ...toggleDefaults };
      st.meta.modelColumns = { ...toggleDefaults };
    }
    const resetToggles = (inputs) => {
      inputs.forEach((input) => {
        const key = normalizeColumnKey(input?.dataset?.columnKey || input?.id);
        const defaultOn = hasOwn(toggleDefaults, key) ? toggleDefaults[key] !== false : true;
        input.checked = defaultOn;
      });
    };
    resetToggles(mainToggles);
    resetToggles(modelToggles);
    if (typeof SEM.applyColumnHiding === "function") SEM.applyColumnHiding();
    if (typeof SEM.renderItems === "function") SEM.renderItems();
    if (typeof SEM.computeTotals === "function") SEM.computeTotals();
  };

})(window);
