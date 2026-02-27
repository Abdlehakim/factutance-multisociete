(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;

  const MODEL_STORAGE_KEY = "facturance:model-presets:v1";
  const MODEL_LAST_KEY = "facturance:model-presets:last";
  const MODEL_DEFAULT_KEY = "facturance:model-presets:default";
  let modelCache = null;
  let modelLoadPromise = null;
  let defaultModelAutoApplied = false;
  const MODEL_SELECT_PLACEHOLDER = "S\u00e9lectionner un mod\u00e8le";
  const MODEL_SELECT_EMPTY_LABEL = "Aucun mod\u00e8le disponible";
  const TEMPLATE_SELECT_PLACEHOLDER = "S\u00e9lectionner un template";
  const TEMPLATE_SELECT_EMPTY_LABEL = "Aucun template disponible";
  const DEFAULT_ITEMS_HEADER_COLOR = "#15335e";
  const TEMPLATE_PREVIEW_ID_PREFIX = "modelTemplateSource-";
  const TEMPLATE_DEFAULT_KEY = "template1";
  const TEMPLATE_CSS_LINK_IDS = {
    template1: "template1Css",
    template2: "template2Css"
  };

  const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalizeCurrency = (value, fallback = "") => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    return raw.toUpperCase();
  };

  const normalizeTaxesEnabled = (value, fallback = true) => {
    if (value === true || value === false) return !!value;
    const normalized = String(value || "").trim().toLowerCase();
    if (["without", "sans", "false", "0", "non", "no"].includes(normalized)) return false;
    if (["with", "true", "1", "oui", "yes"].includes(normalized)) return true;
    return fallback;
  };

  const normalizeInvoiceLength = (value, fallback = 4) => {
    if (typeof normalizeInvoiceNumberLength === "function") {
      return normalizeInvoiceNumberLength(value, fallback);
    }
    const n = Number(value);
    if (n === 4 || n === 6 || n === 8 || n === 12) return n;
    const fb = Number(fallback);
    if (fb === 4 || fb === 6 || fb === 8 || fb === 12) return fb;
    return 4;
  };

  const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
  const normalizeNumberFormat = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
    const raw = String(value || "").trim().toLowerCase();
    if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
    const fb = String(fallback || "").trim().toLowerCase();
    if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
    return NUMBER_FORMAT_DEFAULT;
  };
  const FOOTER_NOTE_FONT_SIZES = [7, 8, 9];
  const DEFAULT_FOOTER_NOTE_FONT_SIZE = 8;
  const normalizeFooterNoteFontSize = (value, fallback = DEFAULT_FOOTER_NOTE_FONT_SIZE) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : fallback;
  };
  const DEFAULT_MODEL_DOC_TYPE = "facture";
  const MODEL_FEES_USED_DEFAULTS = Object.freeze({
    shipping: true,
    stamp: true,
    dossier: false,
    deplacement: false,
    financing: false
  });
  const MODEL_DOC_TYPE_ALL = "all";
  const MODEL_DOC_TYPE_LEGACY_NONE = "aucun";
  const MODEL_DOC_TYPE_LIST = ["facture", "fa", "devis", "bl", "avoir"];
  const DOC_TYPE_VALUES = new Set([
    "facture",
    "fa",
    "devis",
    "bl",
    "avoir",
    "retenue",
    MODEL_DOC_TYPE_ALL
  ]);
  const MODEL_DOC_TYPE_VALUES = new Set([
    ...MODEL_DOC_TYPE_LIST,
    MODEL_DOC_TYPE_ALL
  ]);
  const normalizeDocTypeValue = (value, fallback = "") => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw || raw === MODEL_DOC_TYPE_LEGACY_NONE) return fallback;
    const aliasMap = {
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const normalized = aliasMap[raw] || raw;
    return DOC_TYPE_VALUES.has(normalized) ? normalized : fallback;
  };
  const normalizeModelDocTypeValue = (value, fallback = "") => {
    const normalized = normalizeDocTypeValue(value, fallback);
    if (normalized === MODEL_DOC_TYPE_ALL) return normalized;
    return MODEL_DOC_TYPE_VALUES.has(normalized) ? normalized : fallback;
  };
  const normalizeDocTypeList = (value, fallback = []) => {
    const rawList = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];
    const normalized = [];
    rawList.forEach((entry) => {
      const next = normalizeModelDocTypeValue(entry, "");
      if (!next || next === MODEL_DOC_TYPE_ALL || next === MODEL_DOC_TYPE_LEGACY_NONE) return;
      if (!normalized.includes(next)) normalized.push(next);
    });
    if (!normalized.length && fallback && fallback.length) {
      return normalizeDocTypeList(fallback, []);
    }
    return normalized;
  };
  const expandModelDocTypes = (value, fallback = []) => {
    const normalized = normalizeDocTypeList(value, []);
    if (normalized.length) return normalized;
    const single = normalizeModelDocTypeValue(value, "");
    if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
    if (single) return [single];
    const fallbackList = normalizeDocTypeList(fallback, []);
    return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
  };
  helpers.normalizeModelDocTypes = normalizeDocTypeList;
  helpers.expandModelDocTypes = expandModelDocTypes;
  const shouldMigrateModelDocType = (value, docTypes) => {
    if (Array.isArray(docTypes)) {
      return !normalizeDocTypeList(docTypes, []).length;
    }
    const normalized = String(value || "").trim().toLowerCase();
    return !normalized || normalized === MODEL_DOC_TYPE_LEGACY_NONE;
  };

  const normalizeHexColor = (value, fallback = "") => {
    if (value === undefined || value === null) return fallback;
    const str = String(value).trim();
    if (!str) return fallback;
    const hex = str.startsWith("#") ? str.slice(1) : str;
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex
        .split("")
        .map((c) => `${c}${c}`)
        .join("")
        .toLowerCase()}`;
    }
    return fallback;
  };
  const normalizeTemplateKey = (value) => {
    const normalized = String(value || "").trim();
    return normalized || TEMPLATE_DEFAULT_KEY;
  };
  const readCssHexVar = (name) => {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
      return normalizeHexColor(raw, "");
    } catch {
      return "";
    }
  };

  function sanitizeModelName(rawName) {
    if (rawName === null || rawName === undefined) return "";
    return String(rawName).trim().replace(/\s+/g, " ").slice(0, 80);
  }
  helpers.sanitizeModelName = sanitizeModelName;

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  const normalizeOptionalBoolean = (value) => {
    if (value === true || value === false) return value;
    const normalized = String(value || "").trim().toLowerCase();
    if (["1", "true", "oui", "yes"].includes(normalized)) return true;
    if (["0", "false", "non", "no"].includes(normalized)) return false;
    return undefined;
  };

  const resolveModelFeeUsed = ({ used, enabled, fallback = false } = {}) => {
    const normalizedUsed = normalizeOptionalBoolean(used);
    if (typeof normalizedUsed === "boolean") return normalizedUsed;
    const normalizedEnabled = normalizeOptionalBoolean(enabled);
    if (normalizedEnabled === true) return true;
    return !!fallback;
  };

  const resolveDocTypeFilter = (value) =>
    normalizeDocTypeValue(
      value || getEl("docType")?.value || state()?.meta?.docType || "facture",
      "facture"
    );

  const resolveModelPdfShowAmountWords = (modelName) => {
    const normalized = sanitizeModelName(modelName);
    if (!normalized) return undefined;
    const entry = getModelList().find((model) => model.name === normalized);
    const value = entry?.config?.pdf?.showAmountWords;
    return typeof value === "boolean" ? value : undefined;
  };

  const resolveModelDocTypesFromConfig = (config) => {
    const safeConfig = sanitizeModelConfigForSave(config || {});
    const docTypes = expandModelDocTypes(
      safeConfig.docTypes !== undefined ? safeConfig.docTypes : safeConfig.docType,
      DEFAULT_MODEL_DOC_TYPE
    );
    return Array.isArray(docTypes) && docTypes.length ? docTypes : [DEFAULT_MODEL_DOC_TYPE];
  };

  const resolveModelEntryByName = (modelName) => {
    const normalized = sanitizeModelName(modelName);
    if (!normalized) return null;
    const list = getModelList();
    return list.find((entry) => entry?.name === normalized) || null;
  };

  const dispatchModelAppliedEvent = (modelName, config, { silent = false } = {}) => {
    const normalizedName = sanitizeModelName(modelName);
    if (!normalizedName || typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;
    const safeConfig = sanitizeModelConfigForSave(config || {});
    const docTypes = resolveModelDocTypesFromConfig(safeConfig);
    try {
      document.dispatchEvent(
        new CustomEvent("sem:model-applied", {
          detail: {
            name: normalizedName,
            silent: !!silent,
            docTypes,
            docType: docTypes[0] || DEFAULT_MODEL_DOC_TYPE,
            config: safeConfig
          }
        })
      );
    } catch {}
  };

  const persistModelSelectionToMeta = (modelName, config) => {
    const meta = state()?.meta;
    if (!meta || typeof meta !== "object") return;
    const normalized = sanitizeModelName(modelName);
    if (!normalized) return;
    const docTypes = resolveModelDocTypesFromConfig(config || {});
    meta.modelName = normalized;
    meta.modelKey = normalized;
    meta.documentModelName = normalized;
    meta.docDialogModelName = normalized;
    meta.modelDocTypes = docTypes.slice();
    meta.modelDocType = docTypes[0] || DEFAULT_MODEL_DOC_TYPE;
    const safeConfig = sanitizeModelConfigForSave(config || {});
    const showAmountWords = safeConfig?.pdf?.showAmountWords;
    const footerNote = typeof safeConfig?.pdf?.footerNote === "string" ? safeConfig.pdf.footerNote : "";
    const footerNoteSize = normalizeFooterNoteFontSize(
      safeConfig?.pdf?.footerNoteSize,
      DEFAULT_FOOTER_NOTE_FONT_SIZE
    );
    if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
    if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
    if (typeof showAmountWords === "boolean") {
      meta.extras.pdf.showAmountWords = showAmountWords;
    }
    meta.extras.pdf.footerNote = footerNote;
    meta.extras.pdf.footerNoteSize = footerNoteSize;
    const financingUsed = safeConfig?.financing?.used;
    if (typeof financingUsed === "boolean") {
      if (!meta.financing || typeof meta.financing !== "object") meta.financing = {};
      meta.financing.used = financingUsed;
    }
  };

  const migratePdfShowAmountWords = (meta, fallbackName) => {
    if (!meta || typeof meta !== "object") return;
    if (typeof meta?.extras?.pdf?.showAmountWords === "boolean") return;
    const sourceName =
      meta.modelName ||
      meta.modelKey ||
      fallbackName ||
      getDefaultModelName() ||
      getLastModelName() ||
      "";
    let resolved = resolveModelPdfShowAmountWords(sourceName);
    if (typeof resolved !== "boolean") resolved = true;
    if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
    if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
    meta.extras.pdf.showAmountWords = resolved;
  };

  const isTemplateSelectMenu = (menu) => {
    if (!menu) return false;
    const managedFlag = String(menu?.dataset?.modelSelectManaged || "").trim().toLowerCase();
    if (managedFlag === "false" || managedFlag === "0" || managedFlag === "off") return true;
    return menu?.dataset?.selectSource === "template";
  };

  function getModelSelectElements() {
    const select = typeof getEl === "function" ? getEl("modelSelect") : null;
    const actionsSelect = typeof getEl === "function" ? getEl("modelActionsSelect") : null;
    const docTypeSelect = typeof getEl === "function" ? getEl("docTypeModelSelect") : null;
    const doc = w?.document;
    const menus = [];
    const actionsMenus = [];
    const docTypeMenus = [];
    const fallbackMenu = typeof getEl === "function" ? getEl("modelSelectMenu") : null;
    const fallbackPanel = typeof getEl === "function" ? getEl("modelSelectPanel") : null;
    const fallbackDisplay = typeof getEl === "function" ? getEl("modelSelectDisplay") : null;
    const fallbackActionsMenu = typeof getEl === "function" ? getEl("modelActionsSelectMenu") : null;
    const fallbackActionsPanel = typeof getEl === "function" ? getEl("modelActionsSelectPanel") : null;
    const fallbackActionsDisplay = typeof getEl === "function" ? getEl("modelActionsSelectDisplay") : null;
    const fallbackDocTypeMenu = typeof getEl === "function" ? getEl("docTypeModelSelectMenu") : null;
    const fallbackDocTypePanel = typeof getEl === "function" ? getEl("docTypeModelSelectPanel") : null;
    const fallbackDocTypeDisplay = typeof getEl === "function" ? getEl("docTypeModelSelectDisplay") : null;

    if (doc?.querySelectorAll) {
      doc.querySelectorAll(".model-select-menu").forEach((menu) => {
        if (isTemplateSelectMenu(menu)) return;
        const panel = menu.querySelector(".model-select-panel");
        const display =
          menu.querySelector(".model-select-display") ||
          menu.querySelector("#modelSelectDisplay") ||
          null;
        const target =
          menu.id === "modelActionsSelectMenu"
            ? actionsMenus
            : menu.id === "docTypeModelSelectMenu"
              ? docTypeMenus
              : menus;
        target.push({ menu, panel, display });
      });
    }

    if (!menus.length && (fallbackMenu || fallbackPanel || fallbackDisplay)) {
      menus.push({ menu: fallbackMenu, panel: fallbackPanel, display: fallbackDisplay });
    }
    if (!actionsMenus.length && (fallbackActionsMenu || fallbackActionsPanel || fallbackActionsDisplay)) {
      actionsMenus.push({ menu: fallbackActionsMenu, panel: fallbackActionsPanel, display: fallbackActionsDisplay });
    }
    if (!docTypeMenus.length && (fallbackDocTypeMenu || fallbackDocTypePanel || fallbackDocTypeDisplay)) {
      docTypeMenus.push({ menu: fallbackDocTypeMenu, panel: fallbackDocTypePanel, display: fallbackDocTypeDisplay });
    }

    const primary = menus[0] || { menu: fallbackMenu, panel: fallbackPanel, display: fallbackDisplay };
    const primaryActions =
      actionsMenus[0] || { menu: fallbackActionsMenu, panel: fallbackActionsPanel, display: fallbackActionsDisplay };
    const primaryDocType =
      docTypeMenus[0] || { menu: fallbackDocTypeMenu, panel: fallbackDocTypePanel, display: fallbackDocTypeDisplay };

    return {
      select,
      menu: primary.menu || null,
      panel: primary.panel || null,
      display: primary.display || null,
      menus,
      actionsSelect,
      actionsMenu: primaryActions.menu || null,
      actionsPanel: primaryActions.panel || null,
      actionsDisplay: primaryActions.display || null,
      actionsMenus,
      docTypeSelect,
      docTypeMenu: primaryDocType.menu || null,
      docTypePanel: primaryDocType.panel || null,
      docTypeDisplay: primaryDocType.display || null,
      docTypeMenus
    };
  }

  function updateNewButtonState() {
    const doc = w?.document;
    if (!doc) return;
    const metaBox = doc.getElementById("docMetaBoxMainscreen");
    if (!metaBox) return;
    const newBtn = metaBox.querySelector("#docTypeActionNew");
    if (!newBtn) return;
    newBtn.classList.remove("is-disabled");
    newBtn.removeAttribute("disabled");
    newBtn.setAttribute("aria-disabled", "false");
  }
  SEM.updateNewButtonState = updateNewButtonState;
  helpers.updateNewButtonState = updateNewButtonState;

  const resolveModelDocTypesFromOption = (option) => {
    if (!option || !option.dataset) return [DEFAULT_MODEL_DOC_TYPE];
    const rawList = option.dataset.modelDocTypes;
    if (rawList) {
      const normalized = normalizeDocTypeList(rawList, []);
      if (normalized.length) return normalized;
    }
    const rawSingle = option.dataset.modelDocType || rawList || "";
    return expandModelDocTypes(rawSingle, []);
  };

  function applyModelDocTypeFilter(docTypeValue, { fireChange = false } = {}) {
    const filterValue = resolveDocTypeFilter(docTypeValue);
    const docTypeSelect = typeof getEl === "function" ? getEl("docTypeModelSelect") : null;
    if (!docTypeSelect) return;

    let selectionCleared = false;
    const currentValue = sanitizeModelName(docTypeSelect.value || "");
    let hasAllowedSelection = false;
    Array.from(docTypeSelect.options || []).forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        option.hidden = false;
        option.dataset.modelUnavailable = "false";
        return;
      }
      const optionDocTypes = resolveModelDocTypesFromOption(option);
      const isAllowed = optionDocTypes.includes(filterValue);
      option.disabled = !isAllowed;
      option.hidden = false;
      option.dataset.modelUnavailable = isAllowed ? "false" : "true";
      if (isAllowed && sanitizeModelName(option.value) === currentValue) {
        hasAllowedSelection = true;
      }
    });
    if (currentValue && !hasAllowedSelection) {
      docTypeSelect.value = "";
      selectionCleared = true;
    }

    syncDocTypeModelSelectMenu();

    if (selectionCleared && fireChange) {
      try {
        docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    }
    updateNewButtonState();
  }
  SEM.applyModelDocTypeFilter = applyModelDocTypeFilter;
  helpers.applyModelDocTypeFilter = applyModelDocTypeFilter;

  function updateModelSelectDisplayFor(targetSelect, targetMenus) {
    if (!targetSelect) return;
    const selectedOption =
      targetSelect.selectedOptions && targetSelect.selectedOptions.length > 0
        ? targetSelect.selectedOptions[0]
        : null;
    const label = (selectedOption?.textContent || selectedOption?.label || "").trim() || MODEL_SELECT_PLACEHOLDER;
    const targets = targetMenus && targetMenus.length ? targetMenus : [];
    if (!targets.length) return;
    targets.forEach(({ display, panel }) => {
      if (display) display.textContent = label;
      if (panel) {
        const currentValue = targetSelect.value || "";
        panel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = btn.dataset.value === currentValue;
          if (isActive) btn.classList.add("is-active");
          else btn.classList.remove("is-active");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
    });
  }

  function updateMainModelSelectDisplay() {
    const { select, menus } = getModelSelectElements();
    updateModelSelectDisplayFor(select, menus);
  }

  function updateActionsModelSelectDisplay() {
    const { actionsSelect, actionsMenus } = getModelSelectElements();
    updateModelSelectDisplayFor(actionsSelect, actionsMenus);
  }

  function updateDocTypeModelSelectDisplay() {
    const { docTypeSelect, docTypeMenus } = getModelSelectElements();
    updateModelSelectDisplayFor(docTypeSelect, docTypeMenus);
  }

  function updateModelSelectDisplay() {
    updateMainModelSelectDisplay();
    updateActionsModelSelectDisplay();
    updateDocTypeModelSelectDisplay();
  }
  helpers.updateModelSelectDisplay = updateModelSelectDisplay;

  function ensureModelSelectMenuWiring() {
    const { select, menus, actionsSelect, actionsMenus, docTypeSelect, docTypeMenus } = getModelSelectElements();
    const doc = w?.document;
    if (select && select.dataset.menuWatcher !== "1") {
      select.dataset.menuWatcher = "1";
      select.addEventListener("change", updateMainModelSelectDisplay);
    }
    if (actionsSelect && actionsSelect.dataset.menuWatcher !== "1") {
      actionsSelect.dataset.menuWatcher = "1";
      actionsSelect.addEventListener("change", updateActionsModelSelectDisplay);
    }
    if (docTypeSelect && docTypeSelect.dataset.menuWatcher !== "1") {
      docTypeSelect.dataset.menuWatcher = "1";
      docTypeSelect.addEventListener("change", () => {
        updateDocTypeModelSelectDisplay();
        updateNewButtonState();
      });
    }
    const targets = [...(menus || []), ...(actionsMenus || []), ...(docTypeMenus || [])];
    targets.forEach(({ menu, panel }) => {
      if (!menu || menu.dataset.wired === "1" || !doc) return;
      const summary = menu.querySelector("summary");
      if (!summary) return;
      menu.dataset.wired = "1";
      summary.setAttribute("aria-expanded", "false");
      menu.addEventListener("toggle", () => {
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (menu.open) {
          const firstOption = panel?.querySelector(".model-select-option:not([disabled])");
          firstOption?.focus();
        } else {
          summary.focus();
        }
      });
      panel?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          menu.removeAttribute("open");
          summary.setAttribute("aria-expanded", "false");
        }
      });
      doc.addEventListener("click", (event) => {
        if (!menu.open) return;
        if (menu.contains(event.target)) return;
        menu.removeAttribute("open");
        summary.setAttribute("aria-expanded", "false");
      });
    });
  }

  function syncModelSelectMenuFor(targetSelect, targetMenus) {
    if (!targetSelect || !targetMenus || !targetMenus.length) return;
    const doc = w?.document;
    const optionList = Array.from(targetSelect.options || []);
    targetMenus.forEach(({ menu, panel }) => {
      if (!panel) return;
      const panelDoc = panel.ownerDocument || doc;
      if (!panelDoc) return;
      panel.innerHTML = "";
      let added = 0;
      optionList.forEach((option) => {
        if (!option.value) return;
        const btn = panelDoc.createElement("button");
        btn.type = "button";
        btn.className = "model-select-option";
        btn.dataset.value = option.value;
        btn.setAttribute("role", "option");
        btn.textContent = (option.textContent || option.label || option.value || "").trim();
        const isDisabled = !!option.disabled;
        btn.disabled = isDisabled;
        btn.dataset.unavailable = isDisabled ? "true" : "false";
        btn.classList.toggle("is-disabled", isDisabled);
        btn.setAttribute("aria-disabled", isDisabled ? "true" : "false");
        if (isDisabled) {
          btn.title = "Indisponible pour ce type de document";
        }
        const isActive = option.value === targetSelect.value;
        if (isActive) btn.classList.add("is-active");
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          const nextValue = option.value;
          const changed = targetSelect.value !== nextValue;
          targetSelect.value = nextValue;
          if (changed) {
            targetSelect.dispatchEvent(new Event("change", { bubbles: true }));
          }
          updateModelSelectDisplayFor(targetSelect, targetMenus);
          if (menu) {
            menu.removeAttribute("open");
            const summary = menu.querySelector("summary");
            summary?.setAttribute("aria-expanded", "false");
          }
        });
        panel.appendChild(btn);
        added += 1;
      });

      if (!added) {
        const emptyMsg = panelDoc.createElement("p");
        emptyMsg.className = "model-select-empty";
        emptyMsg.textContent = MODEL_SELECT_EMPTY_LABEL;
        panel.appendChild(emptyMsg);
      }
    });
    updateModelSelectDisplayFor(targetSelect, targetMenus);
  }

  function syncModelSelectMenu() {
    const { select, menus, actionsSelect, actionsMenus, docTypeSelect, docTypeMenus } = getModelSelectElements();
    syncModelSelectMenuFor(select, menus);
    syncModelSelectMenuFor(actionsSelect, actionsMenus);
    syncModelSelectMenuFor(docTypeSelect, docTypeMenus);
    updateModelSelectDisplay();
  }

  function syncDocTypeModelSelectMenu() {
    const { docTypeSelect, docTypeMenus } = getModelSelectElements();
    syncModelSelectMenuFor(docTypeSelect, docTypeMenus);
  }

  function getTemplateSelectElements() {
    const select = typeof getEl === "function" ? getEl("modelTemplate") : null;
    const menu = typeof getEl === "function" ? getEl("modelTemplateMenu") : null;
    const panel = typeof getEl === "function" ? getEl("modelTemplatePanel") : null;
    const display = typeof getEl === "function" ? getEl("modelTemplateDisplay") : null;
    return { select, menu, panel, display };
  }

  function getTemplatePreviewNode(value) {
    const doc = w?.document;
    if (!doc) return null;
    const normalized = normalizeTemplateKey(value);
    const template = doc.getElementById(`${TEMPLATE_PREVIEW_ID_PREFIX}${normalized}`);
    const node = template?.content?.firstElementChild;
    if (!node) return null;
    const cloned = node.cloneNode(true);
    if (cloned?.dataset) cloned.dataset.templateKey = normalized;
    return cloned;
  }

  function syncTemplateStyles(value) {
    const doc = w?.document;
    if (!doc) return;
    const normalized = normalizeTemplateKey(value);
    Object.entries(TEMPLATE_CSS_LINK_IDS).forEach(([key, id]) => {
      const link = doc.getElementById(id);
      if (!link) return;
      link.disabled = key !== normalized;
    });
  }

  function syncItemsSectionTemplate(value) {
    const doc = w?.document;
    if (!doc) return;
    const normalized = normalizeTemplateKey(value);
    doc.querySelectorAll("#itemsSection").forEach((section) => {
      if (!section) return;
      section.dataset.template = normalized;
    });
  }

  function applyTemplatePreview(value, options = {}) {
    const doc = w?.document;
    if (!doc) return;
    const normalized = normalizeTemplateKey(value);
    const applyToDocument = options?.applyToDocument !== false;
    if (applyToDocument) {
      syncTemplateStyles(normalized);
      syncItemsSectionTemplate(normalized);
    }
    const currentPreview = doc.querySelector(".model-actions-layout__preview");
    if (!currentPreview) return;
    const currentKey = currentPreview.dataset?.templateKey || "";
    const effectiveKey = currentKey || TEMPLATE_DEFAULT_KEY;
    if (!currentKey) {
      currentPreview.dataset.templateKey = effectiveKey;
    }
    if (effectiveKey === normalized) {
      if (typeof helpers.updateModelPreview === "function") helpers.updateModelPreview();
      return;
    }
    const nextPreview = getTemplatePreviewNode(normalized);
    if (!nextPreview) return;
    currentPreview.replaceWith(nextPreview);
    if (typeof helpers.updateModelPreview === "function") helpers.updateModelPreview();
  }

  function updateTemplateSelectDisplay(options = {}) {
    const { select, panel, display } = getTemplateSelectElements();
    if (!select) return;
    const applyToDocument = options?.applyToDocument !== false;
    const selectedOption = select.selectedOptions && select.selectedOptions.length > 0 ? select.selectedOptions[0] : null;
    const label =
      (selectedOption?.textContent || selectedOption?.label || "").trim() || TEMPLATE_SELECT_PLACEHOLDER;
    if (display) display.textContent = label;
    if (panel) {
      const currentValue = select.value || "";
      panel.querySelectorAll(".model-select-option").forEach((btn) => {
        const isActive = btn.dataset.value === currentValue;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }
    applyTemplatePreview(select.value, { applyToDocument });
  }
  helpers.updateTemplateSelectDisplay = updateTemplateSelectDisplay;

  function ensureTemplateSelectMenuWiring() {
    const { select, menu, panel } = getTemplateSelectElements();
    const doc = w?.document;
    if (select && select.dataset.menuWatcher !== "1") {
      select.dataset.menuWatcher = "1";
      select.addEventListener("change", () => {
        const applyToDocument = w.__modelTemplateApplyToDocument === true;
        const st = typeof state === "function" ? state() : null;
        const normalized = normalizeTemplateKey(select.value);
        if (applyToDocument) {
          if (st?.meta && typeof st.meta === "object") {
            st.meta.template = normalized;
          }
          if (st && typeof st === "object" && "template" in st) {
            st.template = normalized;
          }
        }
        updateTemplateSelectDisplay({ applyToDocument });
      });
    }
    if (!menu || menu.dataset.wired === "1" || !doc) return;
    const summary = menu.querySelector("summary");
    if (!summary) return;
    menu.dataset.wired = "1";
    summary.setAttribute("aria-expanded", "false");
    menu.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
      if (menu.open) {
        const firstOption = panel?.querySelector(".model-select-option:not([disabled])");
        firstOption?.focus();
      } else {
        summary.focus();
      }
    });
    panel?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        menu.removeAttribute("open");
        summary.setAttribute("aria-expanded", "false");
      }
    });
    doc.addEventListener("click", (event) => {
      if (!menu.open) return;
      if (menu.contains(event.target)) return;
      menu.removeAttribute("open");
      summary.setAttribute("aria-expanded", "false");
    });
  }

  function syncTemplateSelectMenu() {
    const { select, menu, panel } = getTemplateSelectElements();
    if (!select || !panel) return;
    const optionList = Array.from(select.options || []);
    const doc = w?.document;
    const panelDoc = panel.ownerDocument || doc;
    if (!panelDoc) return;
    const st = typeof state === "function" ? state() : null;
    const metaTemplate = st?.meta?.template;
    const normalizedMeta = metaTemplate ? normalizeTemplateKey(metaTemplate) : "";
    if (normalizedMeta && optionList.some((option) => option.value === normalizedMeta)) {
      select.value = normalizedMeta;
    }
    panel.innerHTML = "";
    let added = 0;
    optionList.forEach((option) => {
      if (!option.value) return;
      const btn = panelDoc.createElement("button");
      btn.type = "button";
      btn.className = "model-select-option";
      btn.dataset.value = option.value;
      btn.setAttribute("role", "option");
      btn.textContent = (option.textContent || option.label || option.value || "").trim();
      const isActive = option.value === select.value;
      if (isActive) btn.classList.add("is-active");
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.addEventListener("click", () => {
        const nextValue = option.value;
        const changed = select.value !== nextValue;
        select.value = nextValue;
        if (changed) {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        updateTemplateSelectDisplay({ applyToDocument: w.__modelTemplateApplyToDocument === true });
        if (menu) {
          menu.removeAttribute("open");
          const summary = menu.querySelector("summary");
          summary?.setAttribute("aria-expanded", "false");
        }
      });
      panel.appendChild(btn);
      added += 1;
    });

    if (!added) {
      const emptyMsg = panelDoc.createElement("p");
      emptyMsg.className = "model-select-empty";
      emptyMsg.textContent = TEMPLATE_SELECT_EMPTY_LABEL;
      panel.appendChild(emptyMsg);
    }

    updateTemplateSelectDisplay();
  }

  function normalizeColumnKey(raw) {
    let key = String(raw || "").trim();
    if (!key) return "";
    key = key.replace(/^colToggle/i, "");
    key = key.replace(/[^a-zA-Z0-9]+/g, "");
    if (!key) return "";
    return key.charAt(0).toLowerCase() + key.slice(1);
  }

  function resolveColumnEl(id) {
    if (!id) return null;
    if (typeof getEl === "function") return getEl(id);
    if (w?.document?.getElementById) return w.document.getElementById(id);
    return null;
  }

  function isModelColumnToggle(el) {
    if (!el) return false;
    if (typeof el.closest === "function" && el.closest("#modelActionsModal")) return true;
    const id = typeof el.id === "string" ? el.id : "";
    return id.endsWith("Modal");
  }

  function collectColumnToggleEntries(options = {}) {
    const entries = [];
    const seen = new Set();
    const scope = typeof options === "string" ? options : options?.scope || "all";
    const shouldInclude = (el) => {
      if (!el) return false;
      if (scope === "all") return true;
      const isModel = isModelColumnToggle(el);
      return scope === "model" ? isModel : !isModel;
    };

    const toggleMap = SEM.consts?.FIELD_TOGGLE_MAP;
    if (toggleMap && typeof toggleMap === "object") {
      Object.entries(toggleMap).forEach(([key, id]) => {
        const el = resolveColumnEl(id);
        if (el && !seen.has(el) && shouldInclude(el)) {
          entries.push([key, el]);
          seen.add(el);
        }
      });
    }

    if (w?.document?.querySelectorAll) {
      w.document
        .querySelectorAll("input.col-toggle[id^='colToggle']")
        .forEach((el) => {
          if (seen.has(el) || !shouldInclude(el)) return;
          const dataKey = normalizeColumnKey(el.getAttribute("data-column-key"));
          const idKey = normalizeColumnKey(el.id);
          const key = dataKey || idKey;
          if (!key) return;
          entries.push([key, el]);
          seen.add(el);
        });
    }

    return entries;
  }

  function collectModelColumnToggleEntries() {
    const modelEntries = collectColumnToggleEntries({ scope: "model" });
    return modelEntries.length ? modelEntries : collectColumnToggleEntries({ scope: "main" });
  }

  const MODEL_COLUMN_STATE_DEFAULTS = {
    ref: true,
    product: true,
    desc: false,
    qty: true,
    unit: true,
    discount: true,
    price: true,
    tva: true,
    fodec: true,
    fodecSale: true,
    fodecPurchase: false,
    purchasePrice: false,
    purchaseTva: false,
    purchaseDiscount: false,
    totalPurchaseHt: false,
    totalPurchaseTtc: false,
    totalHt: true,
    totalTtc: true
  };

  function normalizeModelColumnState(rawColumns = {}, { docTypes = [], taxesEnabled = true } = {}) {
    const source = rawColumns && typeof rawColumns === "object" ? rawColumns : {};
    const normalizedDocTypes = normalizeDocTypeList(docTypes, []);
    const isPurchaseContext = normalizedDocTypes.includes("fa");
    const normalized = {};
    Object.entries(MODEL_COLUMN_STATE_DEFAULTS).forEach(([key, fallback]) => {
      if (hasOwn(source, key)) normalized[key] = !!source[key];
      else normalized[key] = fallback;
    });
    const hasFodecSale = hasOwn(source, "fodecSale");
    const hasFodecPurchase = hasOwn(source, "fodecPurchase");

    normalized.fodecSale = hasFodecSale
      ? !!source.fodecSale
      : !!normalized.fodecSale;
    normalized.fodecPurchase = hasFodecPurchase
      ? !!source.fodecPurchase
      : !!normalized.fodecPurchase;

    if (!normalized.price) {
      normalized.tva = false;
      normalized.discount = false;
      normalized.fodecSale = false;
      normalized.totalHt = false;
      normalized.totalTtc = false;
    }
    if (!normalized.purchasePrice) {
      normalized.purchaseTva = false;
      normalized.purchaseDiscount = false;
      normalized.fodecPurchase = false;
      normalized.totalPurchaseHt = false;
      normalized.totalPurchaseTtc = false;
    }
    if (!taxesEnabled) {
      normalized.tva = false;
      normalized.purchaseTva = false;
      normalized.fodecSale = false;
      normalized.fodecPurchase = false;
      normalized.totalPurchaseTtc = false;
      normalized.totalTtc = false;
    }

    normalized.fodec = isPurchaseContext ? normalized.fodecPurchase : normalized.fodecSale;
    normalized.purchaseDependenciesLocked = !normalized.purchasePrice;
    return normalized;
  }

  function getSelectedModelDocTypesFromUi() {
    const panelValues = Array.from(
      getEl("modelDocTypePanel")?.querySelectorAll?.('input[type="checkbox"][name="modelDocTypeChoice"]:checked') || []
    )
      .map((input) => String(input.value || "").trim().toLowerCase())
      .filter(Boolean);
    if (panelValues.length) return normalizeDocTypeList(panelValues, []);
    const selectValues = Array.from(getEl("modelDocType")?.selectedOptions || [])
      .map((opt) => String(opt.value || "").trim().toLowerCase())
      .filter(Boolean);
    if (selectValues.length) return normalizeDocTypeList(selectValues, []);
    const fallbackValue = String(getEl("modelDocType")?.value || "").trim().toLowerCase();
    return normalizeDocTypeList(fallbackValue, []);
  }

  function resolveContextualModelFodecChecked({ docTypes } = {}) {
    const normalizedDocTypes = normalizeDocTypeList(
      Array.isArray(docTypes) ? docTypes : getSelectedModelDocTypesFromUi(),
      []
    );
    const isPurchaseContext = normalizedDocTypes.includes("fa");
    const saleToggle = resolveColumnEl("colToggleFodecModal");
    const purchaseToggle = resolveColumnEl("colTogglePurchaseFodecModal");
    const activeToggle = isPurchaseContext ? purchaseToggle || saleToggle : saleToggle || purchaseToggle;
    if (!activeToggle) return false;
    return !!activeToggle.checked;
  }

  function isFilesystemModelStorageAvailable() {
    return !!(
      w.electronAPI?.listModels &&
      typeof w.electronAPI.listModels === "function" &&
      typeof w.electronAPI.saveModel === "function" &&
      typeof w.electronAPI.deleteModel === "function"
    );
  }

  function readModelStorage() {
    if (!w.localStorage) return [];
    try {
      const raw = w.localStorage.getItem(MODEL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
        const unique = new Map();
        let migrated = false;
        parsed.filter(isValidModelEntry).forEach((entry) => {
          if (entry?.config && shouldMigrateModelDocType(entry.config.docType, entry.config.docTypes)) {
            entry.config.docTypes = [DEFAULT_MODEL_DOC_TYPE];
            entry.config.docType = DEFAULT_MODEL_DOC_TYPE;
            migrated = true;
          }
          const normalized = normalizeModelEntry(entry);
          if (normalized.name) unique.set(normalized.name, normalized);
        });
        const result = Array.from(unique.values());
        if (migrated || unique.size !== parsed.length) writeModelStorage(result);
        return result;
    } catch (err) {
      console.error("model presets: load", err);
      return [];
    }
  }

  function writeModelStorage(list) {
    if (!w.localStorage) return;
    try {
      w.localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("model presets: save", err);
    }
  }

  async function loadModelsFromFilesystem() {
    if (!isFilesystemModelStorageAvailable()) return [];
    try {
      const res = await w.electronAPI.listModels();
      if (!res?.ok) throw new Error(res?.error || "Liste des modèles indisponible.");
      const rawList = Array.isArray(res.models) ? res.models : [];
        const unique = new Map();
        const migrations = [];
        rawList.filter(isValidModelEntry).forEach((entry) => {
          if (entry?.config && shouldMigrateModelDocType(entry.config.docType, entry.config.docTypes)) {
            entry.config.docTypes = [DEFAULT_MODEL_DOC_TYPE];
            entry.config.docType = DEFAULT_MODEL_DOC_TYPE;
            migrations.push({ name: entry.name, config: cloneConfig(entry.config) });
          }
          const normalized = normalizeModelEntry(entry);
          if (normalized.name) unique.set(normalized.name, normalized);
        });
        if (migrations.length && typeof w.electronAPI?.saveModel === "function") {
          for (const migration of migrations) {
            try {
              await w.electronAPI.saveModel(migration);
            } catch (err) {
              console.warn("model presets: docType migrate failed", err);
            }
          }
        }
        return Array.from(unique.values());
      } catch (err) {
        console.error("model presets: list", err);
        return [];
      }
  }

  async function migrateLegacyModelsIfNeeded() {
    if (!isFilesystemModelStorageAvailable()) return;
    if (!w.localStorage) return;
    if (typeof w.electronAPI?.saveModel !== "function") return;
    let legacy = [];
    try {
      const raw = w.localStorage.getItem(MODEL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) legacy = parsed.filter(isValidModelEntry).map(normalizeModelEntry);
      }
    } catch {
      legacy = [];
    }
    if (!legacy.length) return;
    for (const entry of legacy) {
      try {
        await w.electronAPI.saveModel({ name: entry.name, config: cloneConfig(entry.config) });
      } catch (err) {
        console.error("model presets: migrate", err);
      }
    }
    try {
      w.localStorage.removeItem(MODEL_STORAGE_KEY);
    } catch {}
  }

  async function ensureModelCache(options = {}) {
    const force = !!options?.force;
    if (force) modelCache = null;
    if (Array.isArray(modelCache)) return modelCache;
    if (modelLoadPromise) return modelLoadPromise;

    modelLoadPromise = (async () => {
      if (isFilesystemModelStorageAvailable()) {
        await migrateLegacyModelsIfNeeded();
        return await loadModelsFromFilesystem();
      }
      return readModelStorage();
    })();

    try {
      const list = await modelLoadPromise;
      modelCache = Array.isArray(list) ? list : [];
      return modelCache;
    } catch (err) {
      modelCache = [];
      return modelCache;
    } finally {
      modelLoadPromise = null;
    }
  }
  helpers.ensureModelCache = ensureModelCache;

  function getModelList() {
    if (!Array.isArray(modelCache)) {
      if (isFilesystemModelStorageAvailable()) return [];
      modelCache = readModelStorage();
    }
    return Array.isArray(modelCache) ? modelCache : [];
  }
  helpers.getModelList = getModelList;

  function setModelList(list) {
    const unique = new Map();
    (Array.isArray(list) ? list : []).filter(isValidModelEntry).forEach((entry) => {
      const normalized = normalizeModelEntry(entry);
      if (normalized.name) unique.set(normalized.name, normalized);
    });
    modelCache = Array.from(unique.values());
    if (!isFilesystemModelStorageAvailable()) {
      writeModelStorage(modelCache);
    }
    return modelCache;
  }

  function getLastModelName() {
    if (!w.localStorage) return "";
    try {
      return sanitizeModelName(w.localStorage.getItem(MODEL_LAST_KEY) || "");
    } catch {
      return "";
    }
  }

  function setLastModelName(name) {
    if (!w.localStorage) return;
    try {
      const sanitized = sanitizeModelName(name);
      if (sanitized) w.localStorage.setItem(MODEL_LAST_KEY, sanitized);
      else w.localStorage.removeItem(MODEL_LAST_KEY);
    } catch (err) {
      console.error("model presets: remember", err);
    }
  }

  function getDefaultModelName() {
    if (!w.localStorage) return "";
    try {
      return sanitizeModelName(w.localStorage.getItem(MODEL_DEFAULT_KEY) || "");
    } catch {
      return "";
    }
  }
  helpers.getDefaultModelName = getDefaultModelName;

  function setDefaultModelName(name) {
    if (!w.localStorage) return;
    try {
      const sanitized = sanitizeModelName(name);
      if (sanitized) w.localStorage.setItem(MODEL_DEFAULT_KEY, sanitized);
      else w.localStorage.removeItem(MODEL_DEFAULT_KEY);
    } catch (err) {
      console.error("model presets: remember default", err);
    }
  }
  helpers.setDefaultModelName = setDefaultModelName;

  function cloneConfig(config) {
    try {
      return JSON.parse(JSON.stringify(config || {}));
    } catch {
      return {};
    }
  }

  // Preserve minimal rich text for notes (bold/italic + line breaks) and drop everything else.
  function sanitizeRichNote(raw) {
    if (raw === undefined || raw === null) return "";
    let str = String(raw);
    str = str.replace(/\r\n|\r/g, "\n");
    str = str.replace(/<br\s*\/?>/gi, "\n");
    str = str.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "");
    str = str.replace(/<(strong|b)[^>]*>/gi, "<strong>");
    str = str.replace(/<\/(strong|b)>/gi, "</strong>");
    str = str.replace(/<(em|i)[^>]*>/gi, "<em>");
    str = str.replace(/<\/(em|i)>/gi, "</em>");
    str = str.replace(/<(ul|ol)[^>]*>/gi, "<$1>");
    str = str.replace(/<\/(ul|ol)>/gi, "</$1>");
    str = str.replace(/<li[^>]*>/gi, "<li>");
    str = str.replace(/<\/li>/gi, "</li>");
    str = str.replace(/<(?!\/?(strong|em|ul|ol|li)\b)[^>]+>/gi, "");
    str = str.replace(/\n{3,}/g, "\n\n");
    return str;
  }

  function sanitizeModelConfigForSave(raw = {}) {
    const src = raw && typeof raw === "object" ? raw : {};
    const cleaned = {};
    const rawColumns = {};

    // Champs affichés (column toggles)
    if (src.columns && typeof src.columns === "object") {
      Object.entries(src.columns).forEach(([key, value]) => {
        rawColumns[key] = !!value;
      });
    }

    // Devise et taxe
    const hasCurrency = hasOwn(src, "currency") || hasOwn(src.meta, "currency");
    if (hasCurrency) {
      const currencyValue = hasOwn(src, "currency") ? src.currency : src.meta?.currency;
      const normalizedCurrency = normalizeCurrency(currencyValue, "");
      if (normalizedCurrency) cleaned.currency = normalizedCurrency;
    }
    const hasTemplate = hasOwn(src, "template") || (src.meta && hasOwn(src.meta, "template"));
    if (hasTemplate) {
      const templateValue = hasOwn(src, "template") ? src.template : src.meta?.template;
      const normalizedTemplate = normalizeTemplateKey(templateValue);
      if (normalizedTemplate) cleaned.template = normalizedTemplate;
    }
    const hasTaxesFlag =
      hasOwn(src, "taxesEnabled") ||
      hasOwn(src, "taxMode") ||
      hasOwn(src.meta, "taxesEnabled");
    if (hasTaxesFlag) {
      const rawTaxFlag = hasOwn(src, "taxesEnabled")
        ? src.taxesEnabled
        : (hasOwn(src, "taxMode") ? src.taxMode : src.meta?.taxesEnabled);
      cleaned.taxesEnabled = normalizeTaxesEnabled(rawTaxFlag, true);
    }

    // Taux de TVA du formulaire d'ajout d'article
    const rawAddTva =
      (src.addForm && src.addForm.tva !== undefined ? src.addForm.tva : undefined) ??
      src.addTva ??
      src.tva;
    const addTva = toNumber(rawAddTva, 19);
    const addFormFodec =
      (src.addForm && typeof src.addForm.fodec === "object" ? src.addForm.fodec : null) ||
      (src.fodec && typeof src.fodec === "object" ? src.fodec : {});
    cleaned.addForm = {
      tva: addTva,
      fodec: {
        enabled: !!addFormFodec.enabled,
        label: addFormFodec.label || "FODEC",
        rate: toNumber(addFormFodec.rate, 1),
        tva: toNumber(addFormFodec.tva, 19)
      }
    };

    // Retenue à la source
    const wh = src.withholding && typeof src.withholding === "object" ? src.withholding : {};
    cleaned.withholding = {
      enabled: !!wh.enabled,
      rate: toNumber(wh.rate, 1.5),
      base: "ttc",
      label: wh.label || "Retenue a la source",
      threshold: toNumber(wh.threshold, 1000),
      note: typeof wh.note === "string" ? sanitizeRichNote(wh.note) : ""
    };
    const acompte = src.acompte && typeof src.acompte === "object" ? src.acompte : {};
    cleaned.acompte = {
      enabled: !!acompte.enabled,
      paid: toNumber(acompte.paid, 0)
    };
    const financing = src.financing && typeof src.financing === "object" ? src.financing : {};
    const subvention = financing.subvention && typeof financing.subvention === "object" ? financing.subvention : {};
    const bank = financing.bank && typeof financing.bank === "object" ? financing.bank : {};
    const financingEnabledFallback = !!subvention.enabled || !!bank.enabled;
    cleaned.financing = {
      used: resolveModelFeeUsed({
        used: financing.used,
        enabled: financingEnabledFallback,
        fallback: MODEL_FEES_USED_DEFAULTS.financing
      }),
      subvention: {
        enabled: !!subvention.enabled,
        label: subvention.label || "",
        amount: toNumber(subvention.amount, 0)
      },
      bank: {
        enabled: !!bank.enabled,
        label: bank.label || "",
        amount: toNumber(bank.amount, 0)
      }
    };

    // Frais & options
    const ship = src.shipping && typeof src.shipping === "object" ? src.shipping : {};
    cleaned.shipping = {
      enabled: !!ship.enabled,
      used: resolveModelFeeUsed({
        used: ship.used,
        enabled: ship.enabled,
        fallback: MODEL_FEES_USED_DEFAULTS.shipping
      }),
      label: ship.label || "",
      amount: toNumber(ship.amount, 0),
      tva: toNumber(ship.tva, 7)
    };

    const dossier = src.dossier && typeof src.dossier === "object" ? src.dossier : {};
    cleaned.dossier = {
      enabled: !!dossier.enabled,
      used: resolveModelFeeUsed({
        used: dossier.used,
        enabled: dossier.enabled,
        fallback: MODEL_FEES_USED_DEFAULTS.dossier
      }),
      label: dossier.label || "",
      amount: toNumber(dossier.amount, 0),
      tva: toNumber(dossier.tva, 0)
    };

    const deplacement = src.deplacement && typeof src.deplacement === "object" ? src.deplacement : {};
    cleaned.deplacement = {
      enabled: !!deplacement.enabled,
      used: resolveModelFeeUsed({
        used: deplacement.used,
        enabled: deplacement.enabled,
        fallback: MODEL_FEES_USED_DEFAULTS.deplacement
      }),
      label: deplacement.label || "",
      amount: toNumber(deplacement.amount, 0),
      tva: toNumber(deplacement.tva, 0)
    };

    const stamp = src.stamp && typeof src.stamp === "object" ? src.stamp : {};
    cleaned.stamp = {
      enabled: !!stamp.enabled,
      used: resolveModelFeeUsed({
        used: stamp.used,
        enabled: stamp.enabled,
        fallback: MODEL_FEES_USED_DEFAULTS.stamp
      }),
      label: stamp.label || "",
      amount: toNumber(stamp.amount, 1)
    };

    // Note PDF
    const rawNote = src.notes !== undefined ? src.notes : src.note;
    cleaned.notes = rawNote !== undefined ? sanitizeRichNote(rawNote) : "";

    // Options PDF (cachet / signature / total en lettres)
    const pdf = src.pdf && typeof src.pdf === "object" ? src.pdf : {};
    const footerNote =
      typeof pdf.footerNote === "string"
        ? sanitizeFooterNoteHtml(pdf.footerNote).trim()
        : "";
    const footerNoteSize = normalizeFooterNoteFontSize(pdf.footerNoteSize, DEFAULT_FOOTER_NOTE_FONT_SIZE);
    cleaned.pdf = {
      showSeal: pdf.showSeal !== false,
      showSignature: pdf.showSignature !== false,
      showAmountWords: pdf.showAmountWords !== false,
      footerNote,
      footerNoteSize
    };

    const hasNumberLength =
      hasOwn(src, "numberLength") ||
      hasOwn(src.meta, "numberLength");
    if (hasNumberLength) {
      const rawNumberLength = hasOwn(src, "numberLength") ? src.numberLength : src.meta?.numberLength;
      cleaned.numberLength = normalizeInvoiceLength(rawNumberLength, 4);
    }

    const hasNumberFormat =
      hasOwn(src, "numberFormat") ||
      hasOwn(src.meta, "numberFormat");
    if (hasNumberFormat) {
      const rawNumberFormat = hasOwn(src, "numberFormat") ? src.numberFormat : src.meta?.numberFormat;
      cleaned.numberFormat = normalizeNumberFormat(rawNumberFormat, NUMBER_FORMAT_DEFAULT);
    }

    const rawDocTypes = hasOwn(src, "docTypes")
      ? src.docTypes
      : (src.meta && hasOwn(src.meta, "docTypes") ? src.meta.docTypes : undefined);
    const docTypes = expandModelDocTypes(
      rawDocTypes !== undefined ? rawDocTypes : src.docType,
      DEFAULT_MODEL_DOC_TYPE
    );
    cleaned.docTypes = Array.isArray(docTypes) && docTypes.length ? docTypes : [DEFAULT_MODEL_DOC_TYPE];
    cleaned.docType = cleaned.docTypes[0] || DEFAULT_MODEL_DOC_TYPE;
    const resolvedTaxesEnabled = hasOwn(cleaned, "taxesEnabled")
      ? cleaned.taxesEnabled
      : normalizeTaxesEnabled(
          hasOwn(src, "taxesEnabled")
            ? src.taxesEnabled
            : (hasOwn(src, "taxMode") ? src.taxMode : src.meta?.taxesEnabled),
          true
        );
    cleaned.columns = normalizeModelColumnState(rawColumns, {
      docTypes: cleaned.docTypes,
      taxesEnabled: resolvedTaxesEnabled
    });

    const hasHeaderColor =
      hasOwn(src, "itemsHeaderColor") ||
      (src.meta && hasOwn(src.meta, "itemsHeaderColor"));
    if (hasHeaderColor) {
      const rawColor = hasOwn(src, "itemsHeaderColor") ? src.itemsHeaderColor : src.meta?.itemsHeaderColor;
      const normalizedColor = normalizeHexColor(rawColor);
      if (normalizedColor) cleaned.itemsHeaderColor = normalizedColor;
    }

    return cleaned;
  }

  function isValidModelEntry(entry) {
    if (!entry || typeof entry !== "object") return false;
    const name = sanitizeModelName(entry.name);
    if (!name) return false;
    if (!entry.config || typeof entry.config !== "object") return false;
    return true;
  }

  function normalizeModelEntry(entry) {
    return {
      name: sanitizeModelName(entry.name),
      config: sanitizeModelConfigForSave(entry.config)
    };
  }

  function stripHtmlAndStyles(raw) {
    if (raw === undefined || raw === null) return "";
    const str = String(raw);
    // Remove style blocks entirely, then strip remaining tags to keep only text content.
    return str
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "");
  }

  function sanitizeFooterNoteHtml(raw = "") {
    if (raw === undefined || raw === null) return "";
    const input = String(raw);
    if (typeof document === "undefined") {
      return stripHtmlAndStyles(input);
    }
    const normalizedHTML = input
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
        const open = `<div data-size="${size}"${isRoot ? ' data-size-root="true"' : ""}>`;
        parts.push(tag === "span" ? `<span data-size="${size}">` : open);
        node.childNodes.forEach(walk);
        parts.push(tag === "span" ? "</span>" : "</div>");
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
    return result;
  }

  function toCleanString(value) {
    return stripHtmlAndStyles(value);
  }

  function normalizeModelItem(raw) {
    const item = raw && typeof raw === "object" ? raw : {};
    return {
      ref: toCleanString(item.ref),
      product: toCleanString(item.product),
      desc: toCleanString(item.desc),
      qty: toNumber(item.qty, 1),
      stockQty: toNumber(item.stockQty, 0),
      unit: toCleanString(item.unit),
      price: toNumber(item.price, 0),
      tva: toNumber(item.tva, 19),
      discount: toNumber(item.discount, 0),
      purchaseDiscount: toNumber(item.purchaseDiscount, 0),
      fodec: {
        enabled: !!item.fodec?.enabled,
        label: toCleanString(item.fodec?.label || "FODEC"),
        rate: toNumber(item.fodec?.rate, 1),
        tva: toNumber(item.fodec?.tva, 19)
      }
    };
  }

  function normalizeArticleForm(raw) {
    const form = raw && typeof raw === "object" ? raw : {};
    const cleaned = {
      ref: toCleanString(form.ref),
      product: toCleanString(form.product),
      desc: toCleanString(form.desc),
      stockQty: toNumber(form.stockQty, 0),
      unit: toCleanString(form.unit),
      price: toNumber(form.price, 0),
      tva: toNumber(form.tva, 19),
      discount: toNumber(form.discount, 0),
      purchaseDiscount: toNumber(form.purchaseDiscount, 0),
      fodec: {
        enabled: !!form.fodec?.enabled,
        label: toCleanString(form.fodec?.label || "FODEC"),
        rate: toNumber(form.fodec?.rate, 1),
        tva: toNumber(form.fodec?.tva, 19)
      },
      purchaseFodec: {
        enabled: !!form.purchaseFodec?.enabled,
        label: toCleanString(form.purchaseFodec?.label || "FODEC ACHAT"),
        rate: toNumber(form.purchaseFodec?.rate, 1),
        tva: toNumber(form.purchaseFodec?.tva, 19)
      }
    };
    const qtyValue = toNumber(form.qty, NaN);
    if (Number.isFinite(qtyValue)) cleaned.qty = qtyValue;
    if (form.use && typeof form.use === "object") {
      const use = {};
      Object.entries(form.use).forEach(([key, value]) => {
        if (typeof value === "boolean") use[key] = value;
      });
      if (Object.keys(use).length) cleaned.use = use;
    }
    return cleaned;
  }

  function captureArticleFormSnapshot() {
    try {
      if (typeof SEM.forms?.captureArticleFromForm === "function") {
        return normalizeArticleForm(SEM.forms.captureArticleFromForm());
      }
    } catch (err) {
      console.error("model presets: capture article form", err);
    }
    const fallback = {
      ref: typeof getStr === "function" ? getStr("addRef") : "",
      product: typeof getStr === "function" ? getStr("addProduct") : "",
      desc: typeof getStr === "function" ? getStr("addDesc") : "",
      stockQty: typeof getNum === "function" ? getNum("addStockQty", 0) : 0,
      unit: typeof getStr === "function" ? getStr("addUnit") : "",
      price: typeof getNum === "function" ? getNum("addPrice", 0) : 0,
      tva: typeof getNum === "function" ? getNum("addTva", 19) : 19,
      discount: typeof getNum === "function" ? getNum("addDiscount", 0) : 0,
      purchaseDiscount: typeof getNum === "function" ? getNum("addPurchaseDiscount", 0) : 0,
      fodec: {
        enabled: typeof getEl === "function" ? !!getEl("addFodecEnabled")?.checked : false,
        label: state()?.meta?.addForm?.fodec?.label || "FODEC",
        rate: typeof getNum === "function" ? getNum("addFodecRate", 1) : 1,
        tva: typeof getNum === "function" ? getNum("addFodecTva", 19) : 19
      },
      purchaseFodec: {
        enabled: typeof getEl === "function" ? !!getEl("addPurchaseFodecEnabled")?.checked : false,
        label: state()?.meta?.addForm?.purchaseFodec?.label || "FODEC ACHAT",
        rate: typeof getNum === "function" ? getNum("addPurchaseFodecRate", 1) : 1,
        tva: typeof getNum === "function" ? getNum("addPurchaseFodecTva", 19) : 19
      },
      use: {}
    };
    collectModelColumnToggleEntries().forEach(([key, el]) => {
      fallback.use[key] = !!el?.checked;
    });
    const saleFodecToggle = resolveColumnEl("colToggleFodecModal");
    const purchaseFodecToggle = resolveColumnEl("colTogglePurchaseFodecModal");
    fallback.use.fodecSale = saleFodecToggle ? !!saleFodecToggle.checked : !!fallback.use.fodec;
    fallback.use.fodecPurchase = purchaseFodecToggle
      ? !!purchaseFodecToggle.checked
      : !!fallback.use.fodecPurchase;
    fallback.use = normalizeModelColumnState(fallback.use, {
      docTypes: getSelectedModelDocTypesFromUi(),
      taxesEnabled: true
    });
    return normalizeArticleForm(fallback);
  }

  function captureModelConfiguration() {
    if (typeof SEM.readInputs === "function") SEM.readInputs();
    const st = state();
    const meta = st.meta || {};
    const modelActionsRoot = getEl("modelActionsModal");
    const getModelScopedEl = (id) => modelActionsRoot?.querySelector?.(`#${id}`) || null;
    const columns = {};
    collectModelColumnToggleEntries().forEach(([key, el]) => {
      columns[key] = !!el?.checked;
    });

    const checkedValue = (container, fallbackId) => {
      const input = container?.querySelector("input:checked");
      if (input?.value) return input.value;
      const sel = fallbackId ? getEl(fallbackId) : null;
      return sel?.value;
    };
    const readInputText = (input, fallback = "") => {
      if (!input) return fallback;
      const raw = input.value;
      if (raw === undefined || raw === null) return fallback;
      return String(raw).trim();
    };
    const readInputNumber = (input, fallback = 0) => {
      if (!input) return fallback;
      const raw = String(input.value ?? "").replace(",", ".").trim();
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const readModelFeeOptionChecked = (optionId, feeKey, enabledFallback = false) => {
      const optionInput = getEl(optionId);
      if (optionInput) return !!optionInput.checked;
      return resolveModelFeeUsed({
        used: meta.extras?.[feeKey]?.used,
        enabled: enabledFallback,
        fallback: MODEL_FEES_USED_DEFAULTS[feeKey]
      });
    };

    const getSelectedModelDocTypes = () => {
      const panelValues = Array.from(
        getEl("modelDocTypePanel")?.querySelectorAll?.('input[type="checkbox"][name="modelDocTypeChoice"]:checked') || []
      )
        .map((input) => String(input.value || "").trim().toLowerCase())
        .filter(Boolean);
      if (panelValues.length) return normalizeDocTypeList(panelValues, []);
      const selectValues = Array.from(getEl("modelDocType")?.selectedOptions || [])
        .map((opt) => String(opt.value || "").trim().toLowerCase())
        .filter(Boolean);
      if (selectValues.length) return normalizeDocTypeList(selectValues, []);
      const fallbackValue = String(getEl("modelDocType")?.value || "").trim().toLowerCase();
      return normalizeDocTypeList(fallbackValue, []);
    };
    const docTypesRaw = getSelectedModelDocTypes();
    const docTypes =
      docTypesRaw.length
        ? docTypesRaw
        : expandModelDocTypes(getEl("docType")?.value || meta.docType || DEFAULT_MODEL_DOC_TYPE, []);
    const docType = docTypes[0] || DEFAULT_MODEL_DOC_TYPE;
    const saleFodecToggle = resolveColumnEl("colToggleFodecModal");
    const purchaseFodecToggle = resolveColumnEl("colTogglePurchaseFodecModal");
    columns.fodecSale = saleFodecToggle ? !!saleFodecToggle.checked : !!columns.fodec;
    columns.fodecPurchase = purchaseFodecToggle
      ? !!purchaseFodecToggle.checked
      : !!columns.fodecPurchase;
    columns.fodec = resolveContextualModelFodecChecked({
      docTypes
    });

    const readWhNoteValue = () => {
      const modalHidden = getEl("whNoteModal");
      if (modalHidden) {
        return typeof modalHidden.value === "string" ? modalHidden.value.trim() : "";
      }
      if (w?.document?.querySelectorAll) {
        const nodes = Array.from(w.document.querySelectorAll("#whNote"));
        for (const node of nodes) {
          const val = typeof node.value === "string" ? node.value.trim() : "";
          if (val) return val;
        }
      }
      const fallback = state()?.meta?.withholding?.note;
      return typeof fallback === "string" ? fallback : "";
    };
    const readFooterNoteValue = () => {
      const modalField = getEl("footerNoteModal");
      if (modalField) {
        return typeof modalField.value === "string" ? modalField.value.trim() : "";
      }
      const fallback = meta?.extras?.pdf?.footerNote;
      return typeof fallback === "string" ? fallback : "";
    };
    const readFooterNoteSize = () => {
      const modalSize = getEl("footerNoteFontSizeModal")?.value;
      const fallback = meta?.extras?.pdf?.footerNoteSize;
      return normalizeFooterNoteFontSize(
        modalSize ?? fallback,
        DEFAULT_FOOTER_NOTE_FONT_SIZE
      );
    };

    const whInputs = {
      enabled: getEl("whEnabledModal") ?? getEl("whEnabled"),
      rate: getEl("whRateModal") ?? getEl("whRate"),
      threshold: getEl("whThresholdModal") ?? getEl("whThreshold"),
      label: getEl("whLabelModal") ?? getEl("whLabel"),
      note: readWhNoteValue()
    };
    const wh = {
      enabled: !!whInputs.enabled?.checked ?? !!meta.withholding?.enabled,
      rate: typeof getNum === "function" ? getNum(whInputs.rate?.id, meta.withholding?.rate ?? 1.5) : meta.withholding?.rate,
      threshold:
        typeof getNum === "function" ? getNum(whInputs.threshold?.id, meta.withholding?.threshold ?? 1000) : meta.withholding?.threshold,
      label: typeof getStr === "function" ? getStr(whInputs.label?.id, meta.withholding?.label) : meta.withholding?.label,
      note: typeof whInputs.note === "string"
        ? whInputs.note
        : (typeof getStr === "function" ? getStr(whInputs.note?.id, meta.withholding?.note) : meta.withholding?.note)
    };
    const acompte = meta.acompte || {};
    const financing = meta.financing || {};
    const subventionInputs = {
      enabled: getModelScopedEl("subventionEnabled") ?? getEl("subventionEnabled"),
      label: getModelScopedEl("subventionLabel") ?? getEl("subventionLabel"),
      amount: getModelScopedEl("subventionAmount") ?? getEl("subventionAmount")
    };
    const subvention = {
      enabled: !!subventionInputs.enabled?.checked ?? !!financing.subvention?.enabled,
      label: readInputText(subventionInputs.label, financing.subvention?.label || ""),
      amount: readInputNumber(subventionInputs.amount, financing.subvention?.amount ?? 0)
    };
    const bankInputs = {
      enabled: getModelScopedEl("finBankEnabled") ?? getEl("finBankEnabled"),
      label: getModelScopedEl("finBankLabel") ?? getEl("finBankLabel"),
      amount: getModelScopedEl("finBankAmount") ?? getEl("finBankAmount")
    };
    const bank = {
      enabled: !!bankInputs.enabled?.checked ?? !!financing.bank?.enabled,
      label: readInputText(bankInputs.label, financing.bank?.label || ""),
      amount: readInputNumber(bankInputs.amount, financing.bank?.amount ?? 0)
    };
    const financingOptionInput = getModelScopedEl("financingOptToggleModal") ?? getEl("financingOptToggleModal");
    const financingUsed = financingOptionInput
      ? !!financingOptionInput.checked
      : resolveModelFeeUsed({
          used: financing.used,
          enabled: subvention.enabled || bank.enabled,
          fallback: MODEL_FEES_USED_DEFAULTS.financing
        });
    const shipInputs = {
      enabled: getEl("shipEnabledModal") ?? getEl("shipEnabled"),
      label: getEl("shipLabelModal") ?? getEl("shipLabel"),
      amount: getEl("shipAmountModal") ?? getEl("shipAmount"),
      tva: getEl("shipTvaModal") ?? getEl("shipTva")
    };
    const shipEnabled = shipInputs.enabled?.checked ?? meta.extras?.shipping?.enabled;
    const ship = {
      enabled: shipEnabled === true,
      used: readModelFeeOptionChecked("shipOptToggleModal", "shipping", shipEnabled),
      label: typeof getStr === "function" ? getStr(shipInputs.label?.id, meta.extras?.shipping?.label) : meta.extras?.shipping?.label,
      amount: typeof getNum === "function" ? getNum(shipInputs.amount?.id, meta.extras?.shipping?.amount ?? 0) : meta.extras?.shipping?.amount,
      tva: typeof getNum === "function" ? getNum(shipInputs.tva?.id, meta.extras?.shipping?.tva ?? 0) : meta.extras?.shipping?.tva
    };
    const dossierInputs = {
      enabled: getEl("dossierEnabledModal") ?? getEl("dossierEnabled"),
      label: getEl("dossierLabelModal") ?? getEl("dossierLabel"),
      amount: getEl("dossierAmountModal") ?? getEl("dossierAmount"),
      tva: getEl("dossierTvaModal") ?? getEl("dossierTva")
    };
    const dossierEnabled = dossierInputs.enabled?.checked ?? meta.extras?.dossier?.enabled;
    const dossier = {
      enabled: dossierEnabled === true,
      used: readModelFeeOptionChecked("dossierOptToggleModal", "dossier", dossierEnabled),
      label: typeof getStr === "function" ? getStr(dossierInputs.label?.id, meta.extras?.dossier?.label) : meta.extras?.dossier?.label,
      amount: typeof getNum === "function" ? getNum(dossierInputs.amount?.id, meta.extras?.dossier?.amount ?? 0) : meta.extras?.dossier?.amount,
      tva: typeof getNum === "function" ? getNum(dossierInputs.tva?.id, meta.extras?.dossier?.tva ?? 0) : meta.extras?.dossier?.tva
    };
    const deplacementInputs = {
      enabled: getEl("deplacementEnabledModal") ?? getEl("deplacementEnabled"),
      label: getEl("deplacementLabelModal") ?? getEl("deplacementLabel"),
      amount: getEl("deplacementAmountModal") ?? getEl("deplacementAmount"),
      tva: getEl("deplacementTvaModal") ?? getEl("deplacementTva")
    };
    const deplacementEnabled = deplacementInputs.enabled?.checked ?? meta.extras?.deplacement?.enabled;
    const deplacement = {
      enabled: deplacementEnabled === true,
      used: readModelFeeOptionChecked("deplacementOptToggleModal", "deplacement", deplacementEnabled),
      label: typeof getStr === "function" ? getStr(deplacementInputs.label?.id, meta.extras?.deplacement?.label) : meta.extras?.deplacement?.label,
      amount: typeof getNum === "function" ? getNum(deplacementInputs.amount?.id, meta.extras?.deplacement?.amount ?? 0) : meta.extras?.deplacement?.amount,
      tva: typeof getNum === "function" ? getNum(deplacementInputs.tva?.id, meta.extras?.deplacement?.tva ?? 0) : meta.extras?.deplacement?.tva
    };
    const stampInputs = {
      enabled: getEl("stampEnabledModal") ?? getEl("stampEnabled"),
      label: getEl("stampLabelModal") ?? getEl("stampLabel"),
      amount: getEl("stampAmountModal") ?? getEl("stampAmount")
    };
    const stampEnabled = stampInputs.enabled?.checked ?? meta.extras?.stamp?.enabled;
    const stamp = {
      enabled: stampEnabled === true,
      used: readModelFeeOptionChecked("stampOptToggleModal", "stamp", stampEnabled),
      label: typeof getStr === "function" ? getStr(stampInputs.label?.id, meta.extras?.stamp?.label) : meta.extras?.stamp?.label,
      amount: typeof getNum === "function" ? getNum(stampInputs.amount?.id, meta.extras?.stamp?.amount ?? 1) : meta.extras?.stamp?.amount
    };
    const addFodec = {
      enabled: !!getEl("addFodecEnabled")?.checked,
      label: state()?.meta?.addForm?.fodec?.label || "FODEC",
      rate: typeof getNum === "function" ? toNumber(getNum("addFodecRate", 1), 1) : 1,
      tva: typeof getNum === "function" ? toNumber(getNum("addFodecTva", 19), 19) : 19
    };
    const addPurchaseFodec = {
      enabled: !!getEl("addPurchaseFodecEnabled")?.checked,
      label: state()?.meta?.addForm?.purchaseFodec?.label || "FODEC ACHAT",
      rate: typeof getNum === "function" ? toNumber(getNum("addPurchaseFodecRate", 1), 1) : 1,
      tva: typeof getNum === "function" ? toNumber(getNum("addPurchaseFodecTva", 19), 19) : 19
    };
    const addTva =
      (typeof getNum === "function" ? getNum("addTva", 19) : undefined) ?? toNumber(meta.addTva, 19);
    const noteValue = typeof getStr === "function" ? getStr("notes") : st.notes || "";
    const currencyValue =
      checkedValue(getEl("modelCurrencyPanel"), "modelCurrency") ||
      (typeof getStr === "function" ? getStr("currency", meta.currency || "DT") : meta.currency || "DT");
    const normalizedCurrency = normalizeCurrency(currencyValue, meta.currency || "DT");
    const taxesEnabledRaw =
      checkedValue(getEl("modelTaxPanel"), "modelTaxMode") ||
      (typeof getStr === "function" ? getStr("taxMode") : undefined) ||
      (meta.taxesEnabled === false ? "without" : "with");
    const taxesEnabled = normalizeTaxesEnabled(taxesEnabledRaw === "without" ? false : true, true);
    const normalizedColumns = normalizeModelColumnState(columns, { docTypes, taxesEnabled });
    const rawNumberLength =
      (typeof getStr === "function" ? getStr("invNumberLength", meta.numberLength ?? 4) : undefined) ??
      meta.numberLength ??
      4;
    const numberLength = normalizeInvoiceLength(rawNumberLength, meta.numberLength ?? 4);
    const rawNumberFormat =
      checkedValue(getEl("modelNumberFormatPanel"), "modelNumberFormat") ||
      meta.numberFormat ||
      NUMBER_FORMAT_DEFAULT;
    const numberFormat = normalizeNumberFormat(rawNumberFormat, meta.numberFormat || NUMBER_FORMAT_DEFAULT);
    const headerColorInput = getEl("modelItemsHeaderColor") || getEl("itemsHeaderColor");
    const headerColorHexInput = getEl("modelItemsHeaderHex");
    const cssHeaderColor = readCssHexVar("--items-head-bg");
    const headerColorValue =
      headerColorInput?.value ||
      headerColorHexInput?.value ||
      meta.itemsHeaderColor ||
      cssHeaderColor ||
      "";
    const itemsHeaderColor = normalizeHexColor(
      headerColorValue || meta.itemsHeaderColor || cssHeaderColor || DEFAULT_ITEMS_HEADER_COLOR,
      DEFAULT_ITEMS_HEADER_COLOR
    );
    const templateValue = getEl("modelTemplate")?.value || meta.template || TEMPLATE_DEFAULT_KEY;
    const template = normalizeTemplateKey(templateValue);

    const fallbackPdf = meta.extras?.pdf && typeof meta.extras.pdf === "object" ? meta.extras.pdf : {};
    const pdfShowSealEl = getEl("pdfShowSealModal");
    const pdfShowSignatureEl = getEl("pdfShowSignatureModal");
    const pdfShowAmountWordsEl = getEl("pdfShowAmountWordsModal");
    const pdf = {
      showSeal: pdfShowSealEl ? !!pdfShowSealEl.checked : fallbackPdf.showSeal !== false,
      showSignature: pdfShowSignatureEl ? !!pdfShowSignatureEl.checked : fallbackPdf.showSignature !== false,
      showAmountWords: pdfShowAmountWordsEl ? !!pdfShowAmountWordsEl.checked : fallbackPdf.showAmountWords !== false,
      footerNote: readFooterNoteValue(),
      footerNoteSize: readFooterNoteSize()
    };

    const rawConfig = {
      currency: normalizedCurrency,
      taxesEnabled,
      numberLength,
      numberFormat,
      columns: normalizedColumns,
      addForm: { tva: addTva, fodec: addFodec, purchaseFodec: addPurchaseFodec },
      withholding: {
        enabled: !!wh.enabled,
        rate: toNumber(wh.rate, 1.5),
        base: "ttc",
        label: wh.label || "Retenue a la source",
        threshold: toNumber(wh.threshold, 1000),
        note: typeof wh.note === "string" ? wh.note : ""
      },
      acompte: {
        enabled: !!acompte.enabled,
        paid: toNumber(acompte.paid, 0)
      },
      financing: {
        used: !!financingUsed,
        subvention: {
          enabled: !!subvention.enabled,
          label: subvention.label || "",
          amount: toNumber(subvention.amount, 0)
        },
        bank: {
          enabled: !!bank.enabled,
          label: bank.label || "",
          amount: toNumber(bank.amount, 0)
        }
      },
      shipping: {
        enabled: !!ship.enabled,
        used: !!ship.used,
        label: ship.label || "",
        amount: toNumber(ship.amount, 0),
        tva: toNumber(ship.tva, 7)
      },
      dossier: {
        enabled: !!dossier.enabled,
        used: !!dossier.used,
        label: dossier.label || "",
        amount: toNumber(dossier.amount, 0),
        tva: toNumber(dossier.tva, 0)
      },
      deplacement: {
        enabled: !!deplacement.enabled,
        used: !!deplacement.used,
        label: deplacement.label || "",
        amount: toNumber(deplacement.amount, 0),
        tva: toNumber(deplacement.tva, 0)
      },
      stamp: {
        enabled: !!stamp.enabled,
        used: !!stamp.used,
        label: stamp.label || "",
        amount: toNumber(stamp.amount, 1)
      },
      pdf,
      itemsHeaderColor,
      template,
      docTypes,
      docType,
      notes: noteValue
    };

    return sanitizeModelConfigForSave(rawConfig);
  }

  function setFieldValue(id, value) {
    if (value === undefined || value === null) return;
    const el = getEl(id);
    if (!el) return;
    const str = typeof value === "string" ? value : String(value);
    if (typeof setVal === "function") setVal(id, str);
    else el.value = str;
  }

  function setCheckboxValue(id, checked) {
    const el = getEl(id);
    if (el) el.checked = !!checked;
  }

  function normalizeModelApplyScope(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "items-section" || normalized === "itemssection" || normalized === "items") {
      return "items-section";
    }
    return "full";
  }

  function applyModelConfiguration(config, options = {}) {
    if (!config || typeof config !== "object") return false;
    const safeConfig = sanitizeModelConfigForSave(config);
    const resolvedDocTypes = resolveModelDocTypesFromConfig(safeConfig);
    const applyScope = normalizeModelApplyScope(options?.scope);
    const itemsSectionOnly = applyScope === "items-section";
    const forceModelOwnedOverwrite = !!w.__itemsModalForceModelOwnedOverwrite;
    const st = state && typeof state === "function" ? state() : null;
    const prevModelApplyGuard = w.__modelApplyAddFormGuard;
    w.__modelApplyAddFormGuard = true;
    const prevAddFormScope =
      typeof SEM?.resolveAddFormScope === "function" ? SEM.resolveAddFormScope() : null;
    const addItemBox = document.getElementById("addItemBox");
    const addItemBoxMainscreen = document.getElementById("addItemBoxMainscreen");
    const overrideAddFormScope =
      (prevAddFormScope?.id === "addItemBoxMainscreen" || (!prevAddFormScope && addItemBoxMainscreen))
        ? addItemBox || document.getElementById("articleFormPopover")
        : null;
    if (overrideAddFormScope && typeof SEM?.setActiveAddFormScope === "function") {
      SEM.setActiveAddFormScope(overrideAddFormScope);
    }

    try {
      if (!itemsSectionOnly && hasOwn(safeConfig, "currency")) {
        const currencySelect = getEl("currency");
        const normalizedCurrency = normalizeCurrency(
          safeConfig.currency,
          st?.meta?.currency || (currencySelect?.value ?? "DT")
        );
        if (currencySelect) {
          currencySelect.value = normalizedCurrency;
          try {
            currencySelect.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (err) {
            console.error("model presets: apply currency", err);
          }
        }
        if (st?.meta) st.meta.currency = normalizedCurrency;
        if (typeof w.syncCurrencyMenuUi === "function") {
          w.syncCurrencyMenuUi(normalizedCurrency, { updateSelect: true });
        }
        if (!currencySelect && typeof SEM.renderItems === "function") SEM.renderItems();
      }

    if (!itemsSectionOnly && hasOwn(safeConfig, "taxesEnabled")) {
      const taxSelect = getEl("taxMode");
      const taxMode = safeConfig.taxesEnabled === false ? "without" : "with";
      if (taxSelect) {
        taxSelect.value = taxMode;
        try {
          taxSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          console.error("model presets: apply tax mode", err);
        }
      }
      if (st?.meta) st.meta.taxesEnabled = taxMode !== "without";
      if (typeof w.syncTaxMenuUi === "function") {
        w.syncTaxMenuUi(taxMode, { updateSelect: true });
      }
      if (!taxSelect) {
        SEM.applyColumnHiding?.();
        SEM.renderItems?.();
      }
    }

    if (!itemsSectionOnly && hasOwn(safeConfig, "numberLength")) {
      const invNumberLengthSelect = getEl("invNumberLength");
      const targetLength = normalizeInvoiceLength(
        safeConfig.numberLength,
        invNumberLengthSelect?.value || st?.meta?.numberLength || 4
      );
      const targetLengthStr = String(targetLength);
      let changeHandled = false;
      if (invNumberLengthSelect) {
        const prevValue = invNumberLengthSelect.value;
        invNumberLengthSelect.value = targetLengthStr;
        if (prevValue !== targetLengthStr) {
          try {
            invNumberLengthSelect.dispatchEvent(new Event("change", { bubbles: true }));
            changeHandled = true;
          } catch (err) {
            console.error("model presets: apply number length", err);
            changeHandled = false;
          }
        }
      }
      if (!changeHandled) {
        if (st?.meta) st.meta.numberLength = targetLength;
        if (typeof w.syncInvNumberLengthUi === "function") {
          w.syncInvNumberLengthUi(targetLength, { updateSelect: !invNumberLengthSelect });
        }
        if (typeof w.syncInvoiceNumberControls === "function") {
          w.syncInvoiceNumberControls({ force: true });
        }
      }
    }

    if (!itemsSectionOnly && hasOwn(safeConfig, "numberFormat")) {
      const targetFormat = normalizeNumberFormat(
        safeConfig.numberFormat,
        st?.meta?.numberFormat || NUMBER_FORMAT_DEFAULT
      );
      if (st?.meta) st.meta.numberFormat = targetFormat;
      const formatSelect = getEl("modelNumberFormat");
      if (formatSelect && formatSelect.value !== targetFormat) {
        formatSelect.value = targetFormat;
      }
      if (typeof w.syncModelNumberFormatUi === "function") {
        w.syncModelNumberFormatUi(targetFormat, { updateSelect: true });
      }
      if (typeof w.syncInvoiceNumberControls === "function") {
        w.syncInvoiceNumberControls({ force: true, overrideWithNext: true });
      }
    }

    if (safeConfig.columns && typeof safeConfig.columns === "object") {
      const hasMainscreenAddForm = !!document.getElementById("addItemBoxMainscreen");
      const normalizedColumns = {};
      Object.entries(safeConfig.columns).forEach(([key, value]) => {
        normalizedColumns[key] = !!value;
      });
      if (st?.meta) st.meta.modelColumns = { ...normalizedColumns };
      if (!hasMainscreenAddForm) {
        collectColumnToggleEntries().forEach(([key, el]) => {
          if (!el) return;
          const hasExplicitValue = hasOwn(normalizedColumns, key);
          if (!hasExplicitValue) return;
          el.checked = !!normalizedColumns[key];
        });
        if (st?.meta) st.meta.columns = { ...normalizedColumns };
      } else {
        const modelEntries = collectColumnToggleEntries({ scope: "model" });
        if (modelEntries.length) {
          modelEntries.forEach(([key, el]) => {
            if (!el) return;
            const hasExplicitValue = hasOwn(normalizedColumns, key);
            if (!hasExplicitValue) return;
            el.checked = !!normalizedColumns[key];
          });
        }
        const mainEntries = collectColumnToggleEntries({ scope: "main" });
        if (mainEntries.length && st?.meta) {
          const nextColumns = {};
          mainEntries.forEach(([key, el]) => {
            nextColumns[key] = !!el?.checked;
          });
          st.meta.columns = { ...(st.meta.columns || {}), ...nextColumns };
        }
      }
    }

    if (st?.meta && typeof st.meta === "object") {
      st.meta.modelDocTypes = resolvedDocTypes.slice();
      st.meta.modelDocType = resolvedDocTypes[0] || DEFAULT_MODEL_DOC_TYPE;
    }

    if (typeof w.syncModelDocTypeMenuUi === "function") {
      w.syncModelDocTypeMenuUi(resolvedDocTypes, { updateSelect: true });
    }

    if (safeConfig.itemsHeaderColor) {
      const normalizedHeaderColor = normalizeHexColor(
        safeConfig.itemsHeaderColor,
        st?.meta?.itemsHeaderColor || DEFAULT_ITEMS_HEADER_COLOR
      );
      if (normalizedHeaderColor) {
        const colorInput = getEl("itemsHeaderColor");
        if (colorInput) colorInput.value = normalizedHeaderColor;
        if (SEM.applyItemsHeaderColor) {
          SEM.applyItemsHeaderColor(normalizedHeaderColor, { setBaseline: true });
        } else if (st?.meta) {
          st.meta.itemsHeaderColor = normalizedHeaderColor;
        }
        if (typeof SEM.applyModelItemsHeaderColor === "function") {
          SEM.applyModelItemsHeaderColor(normalizedHeaderColor, { setBaseline: true });
        } else {
          const modelColorInput = getEl("modelItemsHeaderColor");
          if (modelColorInput) modelColorInput.value = normalizedHeaderColor;
          const modelHexInput = getEl("modelItemsHeaderHex");
          if (modelHexInput) modelHexInput.value = normalizedHeaderColor;
        }
      }
    }

    if (!itemsSectionOnly) {
      const templateKey = normalizeTemplateKey(
        hasOwn(safeConfig, "template") ? safeConfig.template : TEMPLATE_DEFAULT_KEY
      );
      const templateSelect = getEl("modelTemplate");
      const prevTemplateApplyGuard = w.__modelTemplateApplyToDocument;
      w.__modelTemplateApplyToDocument = true;
      try {
        if (templateSelect) {
          const prevValue = templateSelect.value;
          templateSelect.value = templateKey;
          if (prevValue !== templateKey) {
            try {
              templateSelect.dispatchEvent(new Event("change", { bubbles: true }));
            } catch {}
          } else {
            updateTemplateSelectDisplay({ applyToDocument: true });
          }
        } else {
          applyTemplatePreview(templateKey, { applyToDocument: true });
        }
      } finally {
        w.__modelTemplateApplyToDocument = prevTemplateApplyGuard;
      }
      if (st?.meta) st.meta.template = templateKey;
    }

    if (!itemsSectionOnly && safeConfig.withholding && typeof safeConfig.withholding === "object") {
      setCheckboxValue("whEnabled", safeConfig.withholding.enabled);
      setCheckboxValue("whEnabledModal", safeConfig.withholding.enabled);
      setFieldValue("whRate", safeConfig.withholding.rate ?? undefined);
      setFieldValue("whRateModal", safeConfig.withholding.rate ?? undefined);
      setFieldValue("whBase", "ttc");
      setFieldValue("whBaseModal", "ttc");
      setFieldValue("whLabel", safeConfig.withholding.label ?? undefined);
      setFieldValue("whLabelModal", safeConfig.withholding.label ?? undefined);
      const stateMeta = state()?.meta || {};
      const existingNote = stateMeta.withholding?.note;
      const loadedDocContext = !!stateMeta.historyPath || !!stateMeta.historyDocType;
      const hasExistingNote = !!String(existingNote || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;|\u00a0/g, " ")
        .trim();
      const modelNoteValue = typeof safeConfig.withholding.note === "string" ? safeConfig.withholding.note : "";
      const docNoteValue =
        forceModelOwnedOverwrite
          ? modelNoteValue
          : loadedDocContext && hasExistingNote
            ? existingNote
            : modelNoteValue;
      const setWhNoteValues = (mainValue, modalValue) => {
        const mainNote = typeof mainValue === "string" ? mainValue : "";
        const modalNote = typeof modalValue === "string" ? modalValue : "";
        const syncEditor = (editor, value) => {
          if (!editor) return;
          editor.innerHTML = value || "";
          const text = (editor.textContent || "")
            .replace(/\u00a0/g, " ")
            .trim();
          editor.dataset.empty = text ? "false" : "true";
        };
        if (typeof SEM.updateWhNoteEditor === "function") {
          SEM.updateWhNoteEditor(mainNote, { group: "main" });
          SEM.updateWhNoteEditor(modalNote, { group: "modal" });
          return;
        }
        if (w?.document?.querySelectorAll) {
          w.document.querySelectorAll("#whNote").forEach((el) => {
            if (el) el.value = mainNote;
          });
          w.document.querySelectorAll("#whNoteModal").forEach((el) => {
            if (el) el.value = modalNote;
          });
          w.document.querySelectorAll("#whNoteEditor").forEach((editor) => syncEditor(editor, mainNote));
          w.document.querySelectorAll("#whNoteEditorModal").forEach((editor) => syncEditor(editor, modalNote));
        } else {
          setFieldValue("whNote", mainNote);
          setFieldValue("whNoteModal", modalNote);
        }
      };
      setWhNoteValues(docNoteValue, modelNoteValue);
      if (state().meta?.withholding) state().meta.withholding.note = docNoteValue;
      setFieldValue("whThreshold", safeConfig.withholding.threshold ?? undefined);
      setFieldValue("whThresholdModal", safeConfig.withholding.threshold ?? undefined);
      if (state().meta?.withholding) state().meta.withholding.base = "ttc";
      SEM.toggleWHFields?.(!!safeConfig.withholding.enabled);
    }

    if (!itemsSectionOnly && safeConfig.acompte && typeof safeConfig.acompte === "object") {
      setCheckboxValue("acompteEnabled", safeConfig.acompte.enabled);
      setFieldValue("acomptePaid", safeConfig.acompte.paid ?? undefined);
      SEM.toggleAcompteFields?.(!!safeConfig.acompte.enabled);
    }
    const modelActionsRoot = getEl("modelActionsModal");
    const getModelScopedEl = (id) => modelActionsRoot?.querySelector?.(`#${id}`) || null;
    const setModelScopedCheckboxValue = (id, checked) => {
      const el = getModelScopedEl(id);
      if (el) {
        el.checked = !!checked;
        el.setAttribute("aria-checked", checked ? "true" : "false");
      }
    };
    const setModelScopedFieldValue = (id, value) => {
      const el = getModelScopedEl(id);
      if (!el) return;
      if (value === undefined || value === null) {
        el.value = "";
        return;
      }
      el.value = String(value);
    };
    const setModelFinancingFieldsVisibility = (id, visible) => {
      const field = getModelScopedEl(id);
      if (!field) return;
      const isVisible = !!visible;
      field.hidden = !isVisible;
      field.style.display = isVisible ? "" : "none";
    };
    if (!itemsSectionOnly && safeConfig.financing && typeof safeConfig.financing === "object") {
      const subvention = safeConfig.financing.subvention || {};
      const bank = safeConfig.financing.bank || {};
      setCheckboxValue("subventionEnabled", subvention.enabled);
      setFieldValue("subventionLabel", subvention.label ?? undefined);
      setFieldValue("subventionAmount", subvention.amount ?? undefined);
      SEM.toggleSubventionFields?.(!!subvention.enabled);
      setCheckboxValue("finBankEnabled", bank.enabled);
      setFieldValue("finBankLabel", bank.label ?? undefined);
      setFieldValue("finBankAmount", bank.amount ?? undefined);
      SEM.toggleFinBankFields?.(!!bank.enabled);
      setModelScopedCheckboxValue("subventionEnabled", !!subvention.enabled);
      setModelScopedFieldValue("subventionLabel", subvention.label ?? undefined);
      setModelScopedFieldValue("subventionAmount", subvention.amount ?? undefined);
      setModelFinancingFieldsVisibility("subventionFields", !!subvention.enabled);
      setModelScopedCheckboxValue("finBankEnabled", !!bank.enabled);
      setModelScopedFieldValue("finBankLabel", bank.label ?? undefined);
      setModelScopedFieldValue("finBankAmount", bank.amount ?? undefined);
      setModelFinancingFieldsVisibility("finBankFields", !!bank.enabled);
      w.updateModelFinancingNetPreview?.();
      if (st?.meta) {
        if (!st.meta.financing || typeof st.meta.financing !== "object") st.meta.financing = {};
        st.meta.financing.used = safeConfig.financing.used === true;
      }
    }

    const setFeesOptionToggleValue = (optionId, checked) => {
      const optionInput = getModelScopedEl(optionId) || getEl(optionId);
      if (!optionInput) return null;
      const isChecked = !!checked;
      optionInput.checked = isChecked;
      optionInput.setAttribute("aria-checked", isChecked ? "true" : "false");
      const optionLabel = optionInput.closest?.("label.toggle-option");
      if (optionLabel) optionLabel.setAttribute("aria-selected", isChecked ? "true" : "false");
      return optionInput;
    };
    const setFeesOptionGroupVisibility = (entry, visible) => {
      const isVisible = !!visible;
      if (entry?.targetId) {
        const target = getModelScopedEl(entry.targetId) || getEl(entry.targetId);
        if (!target) return;
        target.hidden = !isVisible;
        target.style.display = isVisible ? "" : "none";
        return;
      }
      const enabledInput = getModelScopedEl(entry.enabledModalId) || getEl(entry.enabledModalId);
      const group = enabledInput?.closest?.(".shipping-flex-group");
      if (!group) return;
      group.hidden = !isVisible;
      group.style.display = isVisible ? "" : "none";
    };

    if (!itemsSectionOnly && safeConfig.shipping && typeof safeConfig.shipping === "object") {
      setCheckboxValue("shipEnabled", safeConfig.shipping.enabled);
      setCheckboxValue("shipEnabledModal", safeConfig.shipping.enabled);
      setFieldValue("shipLabel", safeConfig.shipping.label ?? undefined);
      setFieldValue("shipLabelModal", safeConfig.shipping.label ?? undefined);
      setFieldValue("shipAmount", safeConfig.shipping.amount ?? undefined);
      setFieldValue("shipAmountModal", safeConfig.shipping.amount ?? undefined);
      setFieldValue("shipTva", safeConfig.shipping.tva ?? undefined);
      setFieldValue("shipTvaModal", safeConfig.shipping.tva ?? undefined);
      SEM.toggleShipFields?.(!!safeConfig.shipping.enabled);
    }

    if (!itemsSectionOnly && safeConfig.dossier && typeof safeConfig.dossier === "object") {
      setCheckboxValue("dossierEnabled", safeConfig.dossier.enabled);
      setCheckboxValue("dossierEnabledModal", safeConfig.dossier.enabled);
      setFieldValue("dossierLabel", safeConfig.dossier.label ?? undefined);
      setFieldValue("dossierLabelModal", safeConfig.dossier.label ?? undefined);
      setFieldValue("dossierAmount", safeConfig.dossier.amount ?? undefined);
      setFieldValue("dossierAmountModal", safeConfig.dossier.amount ?? undefined);
      setFieldValue("dossierTva", safeConfig.dossier.tva ?? undefined);
      setFieldValue("dossierTvaModal", safeConfig.dossier.tva ?? undefined);
      SEM.toggleDossierFields?.(!!safeConfig.dossier.enabled);
    }

    if (!itemsSectionOnly && safeConfig.deplacement && typeof safeConfig.deplacement === "object") {
      setCheckboxValue("deplacementEnabled", safeConfig.deplacement.enabled);
      setCheckboxValue("deplacementEnabledModal", safeConfig.deplacement.enabled);
      setFieldValue("deplacementLabel", safeConfig.deplacement.label ?? undefined);
      setFieldValue("deplacementLabelModal", safeConfig.deplacement.label ?? undefined);
      setFieldValue("deplacementAmount", safeConfig.deplacement.amount ?? undefined);
      setFieldValue("deplacementAmountModal", safeConfig.deplacement.amount ?? undefined);
      setFieldValue("deplacementTva", safeConfig.deplacement.tva ?? undefined);
      setFieldValue("deplacementTvaModal", safeConfig.deplacement.tva ?? undefined);
      if (st?.meta) {
        if (!st.meta.extras || typeof st.meta.extras !== "object") st.meta.extras = {};
        if (!st.meta.extras.deplacement || typeof st.meta.extras.deplacement !== "object") {
          st.meta.extras.deplacement = {};
        }
        st.meta.extras.deplacement.tva = toNumber(safeConfig.deplacement.tva, 0);
      }
      SEM.toggleDeplacementFields?.(!!safeConfig.deplacement.enabled);
    }

    if (!itemsSectionOnly && safeConfig.stamp && typeof safeConfig.stamp === "object") {
      setCheckboxValue("stampEnabled", safeConfig.stamp.enabled);
      setCheckboxValue("stampEnabledModal", safeConfig.stamp.enabled);
      setFieldValue("stampLabel", safeConfig.stamp.label ?? undefined);
      setFieldValue("stampLabelModal", safeConfig.stamp.label ?? undefined);
      setFieldValue("stampAmount", safeConfig.stamp.amount ?? undefined);
      setFieldValue("stampAmountModal", safeConfig.stamp.amount ?? undefined);
      SEM.toggleStampFields?.(!!safeConfig.stamp.enabled);
    }

    if (!itemsSectionOnly) {
      const feesOptionEntries = [
        {
          feeKey: "shipping",
          optionId: "shipOptToggleModal",
          enabledModalId: "shipEnabledModal",
          used: safeConfig.shipping?.used
        },
        {
          feeKey: "stamp",
          optionId: "stampOptToggleModal",
          enabledModalId: "stampEnabledModal",
          used: safeConfig.stamp?.used
        },
        {
          feeKey: "dossier",
          optionId: "dossierOptToggleModal",
          enabledModalId: "dossierEnabledModal",
          used: safeConfig.dossier?.used
        },
        {
          feeKey: "deplacement",
          optionId: "deplacementOptToggleModal",
          enabledModalId: "deplacementEnabledModal",
          used: safeConfig.deplacement?.used
        },
        {
          feeKey: "financing",
          optionId: "financingOptToggleModal",
          targetId: "financingBox",
          used: safeConfig.financing?.used
        }
      ];
      if (st?.meta) {
        if (!st.meta.extras || typeof st.meta.extras !== "object") st.meta.extras = {};
        feesOptionEntries.forEach((entry) => {
          if (entry.feeKey === "financing") {
            if (!st.meta.financing || typeof st.meta.financing !== "object") st.meta.financing = {};
            st.meta.financing.used = entry.used !== false;
            return;
          }
          if (!st.meta.extras[entry.feeKey] || typeof st.meta.extras[entry.feeKey] !== "object") {
            st.meta.extras[entry.feeKey] = {};
          }
          st.meta.extras[entry.feeKey].used = entry.used !== false;
        });
      }
      const optionInputs = feesOptionEntries
        .map((entry) => ({
          ...entry,
          input: setFeesOptionToggleValue(entry.optionId, entry.used !== false)
        }))
        .filter((entry) => !!entry.input);
      if (typeof w.syncFeesTaxesOptionsUi === "function") {
        w.syncFeesTaxesOptionsUi();
      } else if (typeof w.handleFeesOptionsToggle === "function") {
        optionInputs.forEach((entry) => {
          w.handleFeesOptionsToggle(entry.input, { schedulePreview: false });
        });
      } else {
        optionInputs.forEach((entry) => {
          setFeesOptionGroupVisibility(entry, entry.input.checked);
        });
      }
    }

    const activeAddFormScope =
      typeof SEM?.resolveAddFormScope === "function" ? SEM.resolveAddFormScope() : null;
    const isMainscreenScope = activeAddFormScope?.id === "addItemBoxMainscreen";
    const itemsDocOptionsModal = document.getElementById("itemsDocOptionsModal");
    const isItemsModalOpen =
      itemsDocOptionsModal &&
      itemsDocOptionsModal.classList.contains("is-open") &&
      itemsDocOptionsModal.getAttribute("aria-hidden") === "false";
    // Keep the mainscreen add form and items modal add form untouched when applying a model.
    if (
      safeConfig.addForm &&
      typeof safeConfig.addForm === "object" &&
      !itemsSectionOnly &&
      !isMainscreenScope &&
      (!isItemsModalOpen || forceModelOwnedOverwrite)
    ) {
      const formConfig = normalizeArticleForm({
        tva: safeConfig.addForm.tva,
        fodec: safeConfig.addForm.fodec,
        purchaseFodec: safeConfig.addForm.purchaseFodec
      });
      try {
        setVal("addTva", String(formConfig.tva ?? 19));
        setCheckboxValue("addFodecEnabled", formConfig.fodec?.enabled);
        setFieldValue("addFodecRate", formConfig.fodec?.rate ?? undefined);
        setFieldValue("addFodecTva", formConfig.fodec?.tva ?? undefined);
        setCheckboxValue("addPurchaseFodecEnabled", formConfig.purchaseFodec?.enabled);
        setFieldValue("addPurchaseFodecRate", formConfig.purchaseFodec?.rate ?? undefined);
        setFieldValue("addPurchaseFodecTva", formConfig.purchaseFodec?.tva ?? undefined);
        if (st?.meta) {
          if (!st.meta.addForm || typeof st.meta.addForm !== "object") st.meta.addForm = {};
          st.meta.addForm.tva = formConfig.tva ?? 19;
          st.meta.addForm.fodec = formConfig.fodec;
          st.meta.addForm.purchaseFodec = formConfig.purchaseFodec;
        }
      } catch (err) {
        console.error("model presets: apply article form", err);
      }
    }

    if (!itemsSectionOnly && typeof safeConfig.notes === "string") {
      const noteVal = safeConfig.notes;
      setVal("notes", noteVal);
      if (st && typeof st === "object") st.notes = noteVal;
    }

    if (!itemsSectionOnly && safeConfig.pdf && typeof safeConfig.pdf === "object") {
      setCheckboxValue("pdfShowSealModal", safeConfig.pdf.showSeal !== false);
      setCheckboxValue("pdfShowSignatureModal", safeConfig.pdf.showSignature !== false);
      setCheckboxValue("pdfShowAmountWordsModal", safeConfig.pdf.showAmountWords !== false);
      const footerNote = typeof safeConfig.pdf.footerNote === "string" ? safeConfig.pdf.footerNote : "";
      const footerNoteSize = normalizeFooterNoteFontSize(
        safeConfig.pdf.footerNoteSize,
        DEFAULT_FOOTER_NOTE_FONT_SIZE
      );
      setFieldValue("footerNoteModal", footerNote);
      setFieldValue("footerNoteFontSizeModal", footerNoteSize);
      setFieldValue("footerNote", footerNote);
      setFieldValue("footerNoteFontSize", footerNoteSize);
      if (typeof SEM.updateFooterNoteEditor === "function") {
        SEM.updateFooterNoteEditor(footerNote, { size: footerNoteSize });
      }
      if (st?.meta) {
        if (!st.meta.extras || typeof st.meta.extras !== "object") st.meta.extras = {};
        if (!st.meta.extras.pdf || typeof st.meta.extras.pdf !== "object") st.meta.extras.pdf = {};
        st.meta.extras.pdf.showSeal = safeConfig.pdf.showSeal !== false;
        st.meta.extras.pdf.showSignature = safeConfig.pdf.showSignature !== false;
        st.meta.extras.pdf.showAmountWords = safeConfig.pdf.showAmountWords !== false;
        st.meta.extras.pdf.footerNote = footerNote;
        st.meta.extras.pdf.footerNoteSize = footerNoteSize;
      }
    }

      if (typeof SEM.applyColumnHiding === "function") SEM.applyColumnHiding();
      if (!w.__modelApplySkipReadInputs && typeof SEM.readInputs === "function") SEM.readInputs();
      if (typeof updateFodecAutoField === "function") updateFodecAutoField();
      if (typeof SEM.computeTotals === "function") SEM.computeTotals();
    } finally {
      if (typeof SEM?.setActiveAddFormScope === "function") {
        SEM.setActiveAddFormScope(prevAddFormScope);
      }
      w.__modelApplyAddFormGuard = prevModelApplyGuard;
    }
    return true;
  }

  SEM.getModelEntries = function () {
    return getModelList().map((entry) => ({ name: entry.name, config: cloneConfig(entry.config) }));
  };

  SEM.getLastModelName = function () {
    return getLastModelName();
  };

  SEM.refreshModelSelect = async function (selectedName, refreshOptions = {}) {
    const select = getEl("modelSelect");
    const selectActions = getEl("modelActionsSelect");
    const docTypeSelect = getEl("docTypeModelSelect");
    if (!select && !selectActions && !docTypeSelect) return;
    const force = !!refreshOptions?.force;
    try {
      await ensureModelCache({ force });
    } catch (err) {
      console.error("model presets: refresh select", err);
    }

    const nameInput = getEl("modelName");
    const deleteBtn = getEl("btnModelDelete");

    const st = w.SEM?.state || {};
    const metaState = st.meta || {};
    const loadedDocContext =
      !!metaState.historyPath ||
      !!metaState.historyDocType ||
      (metaState.docType && metaState.docType !== "facture");
    const defaultNamePref = getDefaultModelName();
    const currentSelection = sanitizeModelName(getEl("modelSelect")?.value || getEl("modelActionsSelect")?.value || "");
    const docTypeSelection = sanitizeModelName(docTypeSelect?.value || "");
    const desiredName = loadedDocContext
      ? sanitizeModelName(selectedName || currentSelection || "")
      : sanitizeModelName(selectedName || defaultNamePref || getLastModelName() || currentSelection);
    const models = getModelList()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    if (st?.meta) {
      migratePdfShowAmountWords(st.meta, desiredName);
    }

    const options = ['<option value="">S&eacute;lectionner un mod&egrave;le</option>'];
    models.forEach((model) => {
      const text = escapeHTML(model.name);
      const docTypes = expandModelDocTypes(
        model?.config?.docTypes !== undefined ? model?.config?.docTypes : model?.config?.docType,
        DEFAULT_MODEL_DOC_TYPE
      );
      const docTypeValue = docTypes[0] || DEFAULT_MODEL_DOC_TYPE;
      const docTypesAttr = docTypes.join(",");
      options.push(
        `<option value="${text}" data-model-doc-type="${docTypeValue}" data-model-doc-types="${docTypesAttr}">${text}</option>`
      );
    });

    const applyOptions = (el, desiredValue) => {
      if (!el) return;
      el.innerHTML = options.join("");
      if (desiredValue && models.some((m) => m.name === desiredValue)) {
        el.value = desiredValue;
      } else {
        el.value = "";
      }
    };

    applyOptions(select, desiredName);
    applyOptions(selectActions, desiredName);
    applyOptions(docTypeSelect, docTypeSelection);

    const hasSelection = !!(select?.value || selectActions?.value);
    const activeValue = select?.value || selectActions?.value || "";
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
    if (nameInput) nameInput.value = hasSelection ? activeValue : "";
    // Notify listeners (e.g., to refresh button states) that the selection has settled.
    const fireChange = (el) => {
      if (!el) return;
      try {
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    };
    fireChange(select);
    if (selectActions && selectActions !== select) fireChange(selectActions);
    applyModelDocTypeFilter(getEl("docType")?.value || state()?.meta?.docType, { fireChange: false });

    if (!defaultModelAutoApplied) {
      const st = w.SEM?.state || {};
      const meta = st.meta || {};
      const loadedDocContext = !!meta.historyPath || !!meta.historyDocType || (meta.docType && meta.docType !== "facture");
      if (loadedDocContext) {
        defaultModelAutoApplied = true;
      }
    }

    if (!defaultModelAutoApplied) {
      const sanitizedDefault = sanitizeModelName(getDefaultModelName());
      defaultModelAutoApplied = true;
      if (sanitizedDefault) {
        const available = models.some((entry) => entry.name === sanitizedDefault);
        if (!available) {
          setDefaultModelName("");
          return;
        }
        const currentSelection = sanitizeModelName(select.value || "");
        if (sanitizedDefault !== currentSelection) {
          select.value = sanitizedDefault;
          if (nameInput) nameInput.value = sanitizedDefault;
          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        }
      }
    }

    ensureModelSelectMenuWiring();
    syncModelSelectMenu();
    ensureTemplateSelectMenuWiring();
    syncTemplateSelectMenu();
    updateNewButtonState();
  };

  SEM.saveModel = async function (rawName) {
    const name = sanitizeModelName(rawName);
    if (!name) throw new Error("Nom de modele requis.");
    const config = captureModelConfiguration();

    if (!isFilesystemModelStorageAvailable()) {
      const list = getModelList().slice();
      const idx = list.findIndex((entry) => entry.name === name);
      if (idx >= 0) list[idx] = { name, config };
      else list.push({ name, config });
      setModelList(list);
      setLastModelName(name);
      await SEM.refreshModelSelect(name);
      return name;
    }

    try {
      const res = await w.electronAPI.saveModel({ name, config });
      if (!res?.ok) throw new Error(res?.error || "Enregistrement impossible.");
      await ensureModelCache({ force: true });
      setLastModelName(name);
      await SEM.refreshModelSelect(name);
      return name;
    } catch (err) {
      console.error("model presets: save (filesystem)", err);
      throw err;
    }
  };

  SEM.deleteModel = async function (rawName) {
    const name = sanitizeModelName(rawName);
    if (!name) return false;

    if (!isFilesystemModelStorageAvailable()) {
      const list = getModelList().slice();
      const idx = list.findIndex((entry) => entry.name === name);
      if (idx === -1) return false;
      list.splice(idx, 1);
      setModelList(list);
      if (getLastModelName() === name) setLastModelName("");
      if (getDefaultModelName() === name) setDefaultModelName("");
      await SEM.refreshModelSelect("");
      return true;
    }

    try {
      const res = await w.electronAPI.deleteModel({ name });
      if (!res?.ok && !res?.missing) throw new Error(res?.error || "Suppression impossible.");
      await ensureModelCache({ force: true });
      if (getLastModelName() === name) setLastModelName("");
      if (getDefaultModelName() === name) setDefaultModelName("");
      await SEM.refreshModelSelect("");
      return true;
    } catch (err) {
      console.error("model presets: delete (filesystem)", err);
      throw err;
    }
  };

  const invalidatePdfPreviewAfterModelSwitch = () => {
    try {
      if (typeof w.invalidatePdfPreviewCache === "function") {
        w.invalidatePdfPreviewCache({ closeModal: true });
      }
    } catch {}
  };

  SEM.applyModelByName = async function (rawName) {
    const name = sanitizeModelName(rawName);
    if (!name) return false;

    if (!isFilesystemModelStorageAvailable()) {
      const entryLegacy = resolveModelEntryByName(name);
      if (!entryLegacy) return false;
      const appliedLegacy = applyModelConfiguration(entryLegacy.config);
      if (appliedLegacy) {
        persistModelSelectionToMeta(name, entryLegacy.config);
        setLastModelName(name);
        await SEM.refreshModelSelect(name);
        dispatchModelAppliedEvent(name, entryLegacy.config, { silent: false });
        invalidatePdfPreviewAfterModelSwitch();
      }
      return appliedLegacy;
    }

    await ensureModelCache();
    const entry = resolveModelEntryByName(name);
    if (!entry) return false;
    const applied = applyModelConfiguration(entry.config);
    if (applied) {
      persistModelSelectionToMeta(name, entry.config);
      setLastModelName(name);
      await SEM.refreshModelSelect(name);
      dispatchModelAppliedEvent(name, entry.config, { silent: false });
      invalidatePdfPreviewAfterModelSwitch();
    }
    return applied;
  };

  SEM.applyModelByNameSilent = async function (rawName, options = {}) {
    const name = sanitizeModelName(rawName);
    if (!name) return false;
    const scope = normalizeModelApplyScope(options?.scope);
    const shouldPersistMeta = options?.persistMeta !== false;

    if (!isFilesystemModelStorageAvailable()) {
      const entryLegacy = resolveModelEntryByName(name);
      if (!entryLegacy) return false;
      const appliedLegacy = applyModelConfiguration(entryLegacy.config, { scope });
      if (appliedLegacy) {
        if (shouldPersistMeta) {
          persistModelSelectionToMeta(name, entryLegacy.config);
        }
        setLastModelName(name);
        dispatchModelAppliedEvent(name, entryLegacy.config, { silent: true });
        invalidatePdfPreviewAfterModelSwitch();
      }
      return appliedLegacy;
    }

    await ensureModelCache();
    const entry = resolveModelEntryByName(name);
    if (!entry) return false;
    const applied = applyModelConfiguration(entry.config, { scope });
    if (applied) {
      if (shouldPersistMeta) {
        persistModelSelectionToMeta(name, entry.config);
      }
      setLastModelName(name);
      dispatchModelAppliedEvent(name, entry.config, { silent: true });
      invalidatePdfPreviewAfterModelSwitch();
    }
    return applied;
  };

  SEM.getModelDocTypesByName = async function (rawName) {
    const name = sanitizeModelName(rawName);
    if (!name) return [];
    try {
      await ensureModelCache();
    } catch {}
    const entry = resolveModelEntryByName(name);
    if (!entry?.config) return [];
    return resolveModelDocTypesFromConfig(entry.config);
  };

  SEM.captureModelConfiguration = captureModelConfiguration;

})(window);
