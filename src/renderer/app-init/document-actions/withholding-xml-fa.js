(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const createDatePicker = w.AppDatePicker?.create;

  const getElSafe =
    typeof getEl === "function"
      ? getEl
      : (id) => (typeof document !== "undefined" ? document.getElementById(id) : null);

  const showDialogSafe =
    typeof w.showDialog === "function"
      ? (message, options) => w.showDialog(message, options)
      : async (message) => {
          if (typeof window !== "undefined" && window.alert) window.alert(message);
        };
  const formatMoneySafe =
    typeof w.formatMoney === "function"
      ? (value, currency) => w.formatMoney(value, currency)
      : (value, currency) => {
          const num = Number(value);
          if (!Number.isFinite(num)) return "--";
          const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          return currency ? `${formatted} ${currency}` : formatted;
        };
  const normalizeMatriculeFiscalSafe =
    typeof w.normalizeMatriculeFiscal === "function"
      ? (value) => w.normalizeMatriculeFiscal(value)
      : (value) => {
          const raw = String(value ?? "").toUpperCase();
          const match = raw.match(/\d{7}[A-Z]/);
          if (match) return match[0];
          const cleaned = raw.replace(/[^0-9A-Z]/g, "");
          const fallbackMatch = cleaned.match(/\d{7}[A-Z]/);
          return fallbackMatch ? fallbackMatch[0] : "";
        };
  const resolveBeneficiaryKey = (beneficiary, entry) => {
    const identifiant = normalizeMatriculeFiscalSafe(
      beneficiary?.vat || beneficiary?.customsCode || beneficiary?.matriculeFiscal || ""
    );
    if (identifiant) return `mf:${identifiant}`;
    const name = String(beneficiary?.name || entry?.supplierName || entry?.clientName || "")
      .trim()
      .toLowerCase();
    const address = String(beneficiary?.address || "").trim().toLowerCase();
    const parts = [name, address].filter(Boolean);
    if (parts.length) return `name:${parts.join("|")}`;
    return `path:${entry?.path || ""}`;
  };

  const normalizeIsoDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const normalizeDatePrefix = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return normalizeIsoDate(raw);
  };
  const toIsoDate = (date) => {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const isDateInRange = (value, startDate, endDate) => {
    const iso = normalizeIsoDate(value);
    if (!iso) return false;
    if (startDate && iso < startDate) return false;
    if (endDate && iso > endDate) return false;
    return true;
  };

  const pickInvoiceData = (raw) =>
    raw && typeof raw === "object"
      ? raw.data && typeof raw.data === "object"
        ? raw.data
        : raw
      : {};

  const cloneInvoiceData = (raw) => {
    try {
      return JSON.parse(JSON.stringify(pickInvoiceData(raw) || {}));
    } catch {
      const src = pickInvoiceData(raw) || {};
      return { ...src };
    }
  };

  const ensureSnapshotDefaults = (snapshot) => {
    const st = snapshot && typeof snapshot === "object" ? snapshot : {};
    if (!Array.isArray(st.items)) st.items = [];
    if (!st.meta || typeof st.meta !== "object") st.meta = {};
    if (!st.company || typeof st.company !== "object") st.company = {};
    if (!st.client || typeof st.client !== "object") st.client = {};
    if (!st.meta.extras || typeof st.meta.extras !== "object") {
      st.meta.extras = { shipping: {}, dossier: {}, deplacement: {}, stamp: {} };
    } else {
      st.meta.extras.shipping = st.meta.extras.shipping || {};
      st.meta.extras.stamp = st.meta.extras.stamp || {};
    }
    if (!st.meta.addForm || typeof st.meta.addForm !== "object") st.meta.addForm = {};
    if (!st.meta.addForm.fodec || typeof st.meta.addForm.fodec !== "object") {
      st.meta.addForm.fodec = { enabled: false, label: "FODEC", rate: 1, tva: 19 };
    }
    return st;
  };

  const computeTotalsForSnapshot = (snapshot, fallbackTotals = null) => {
    const sem = w.SEM;
    if (!sem || typeof sem.computeTotalsReturn !== "function") return fallbackTotals;
    const originalState = sem.state;
    if (originalState === snapshot) return sem.computeTotalsReturn();
    let totals = fallbackTotals;
    try {
      sem.state = snapshot;
      totals = sem.computeTotalsReturn();
    } catch (err) {
      console.warn("withholding-xml-fa computeTotalsForSnapshot failed", err);
    } finally {
      if (sem.state !== originalState) sem.state = originalState;
    }
    return totals;
  };

  const parseNumberInput = (value, fallback = null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : fallback;
  };

  const normalizeBinaryFlag = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num >= 1 ? 1 : 0;
  };
  const WITHHOLDING_FA_SETTINGS_DEFAULTS = Object.freeze({
    threshold: 1000,
    cnpc: 0,
    pCharge: 0,
    rate: 1.5,
    operationCategory: "Acquisitions des marchandises, mat\u00E9riel \u00E9quipements et de services",
    operationType: "RS7_000001"
  });
  let withholdingFaSettingsCache = { ...WITHHOLDING_FA_SETTINGS_DEFAULTS };

  const normalizeWithholdingFaSettings = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const threshold = parseNumberInput(source.threshold, WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold);
    const rate = parseNumberInput(source.rate, WITHHOLDING_FA_SETTINGS_DEFAULTS.rate);
    const operationCategory = String(
      source.operationCategory || WITHHOLDING_FA_SETTINGS_DEFAULTS.operationCategory
    ).trim();
    const operationType = String(
      source.operationType || WITHHOLDING_FA_SETTINGS_DEFAULTS.operationType
    ).trim();
    return {
      threshold: Number.isFinite(threshold)
        ? threshold
        : WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold,
      cnpc: normalizeBinaryFlag(source.cnpc, WITHHOLDING_FA_SETTINGS_DEFAULTS.cnpc),
      pCharge: normalizeBinaryFlag(source.pCharge, WITHHOLDING_FA_SETTINGS_DEFAULTS.pCharge),
      rate: Number.isFinite(rate) ? rate : WITHHOLDING_FA_SETTINGS_DEFAULTS.rate,
      operationCategory: operationCategory || WITHHOLDING_FA_SETTINGS_DEFAULTS.operationCategory,
      operationType: operationType || WITHHOLDING_FA_SETTINGS_DEFAULTS.operationType
    };
  };

  const loadWithholdingFaSettings = async () => {
    const fallback = normalizeWithholdingFaSettings(withholdingFaSettingsCache);
    if (typeof w.electronAPI?.loadWithholdingFaSettings !== "function") {
      withholdingFaSettingsCache = { ...fallback };
      return fallback;
    }
    try {
      const res = await w.electronAPI.loadWithholdingFaSettings();
      if (!res?.ok) {
        withholdingFaSettingsCache = { ...fallback };
        return fallback;
      }
      const normalized = normalizeWithholdingFaSettings(res.settings || {});
      withholdingFaSettingsCache = { ...normalized };
      return normalized;
    } catch (err) {
      console.warn("loadWithholdingFaSettings failed", err);
      withholdingFaSettingsCache = { ...fallback };
      return fallback;
    }
  };

  const saveWithholdingFaSettings = async (settings = {}) => {
    const normalized = normalizeWithholdingFaSettings(settings);
    if (typeof w.electronAPI?.saveWithholdingFaSettings === "function") {
      const res = await w.electronAPI.saveWithholdingFaSettings({ settings: normalized });
      if (!res?.ok) {
        throw new Error(res?.error || "Impossible d'enregistrer les parametres Retenue FA.");
      }
    }
    withholdingFaSettingsCache = { ...normalized };
    return normalized;
  };

  const normalizeEntryLabel = (entry) => {
    const number = entry.number ? String(entry.number).trim() : "";
    if (number) return number;
    const name = entry.name ? String(entry.name).trim() : "";
    if (name) return name;
    if (entry.path) {
      const parts = String(entry.path).split(/[\\/]/);
      const fileName = parts[parts.length - 1];
      if (fileName) return fileName;
    }
    return "Facture d'achat";
  };

  const normalizeFaEntry = (entry) => {
    const path = entry?.path ? String(entry.path) : "";
    if (!path) return null;
    const rawDate = entry?.date || entry?.meta?.date || "";
    const isoDate = normalizeIsoDate(rawDate);
    const number = entry?.number ?? entry?.meta?.number ?? "";
    const name = entry?.name ?? "";
    const supplierName =
      entry?.clientName ||
      entry?.client?.name ||
      entry?.supplierName ||
      entry?.fournisseurName ||
      "";
    const createdAt = normalizeDatePrefix(
      entry?.createdAt || entry?.meta?.createdAt || entry?.created || ""
    );
    const stampTT = parseNumberInput(
      entry?.stampTT ??
        entry?.totals?.extras?.stampTT ??
        entry?.totals?.extras?.stampHT ??
        entry?.totals?.extras?.stamp,
      null
    );
    const totalTTCExclStamp = (() => {
      const direct = parseNumberInput(
        entry?.totalTTCExclStamp ?? entry?.totalTTCSansTimbre,
        null
      );
      if (direct !== null) return direct;
      const totalTTC = parseNumberInput(entry?.totalTTC, null);
      if (totalTTC === null || stampTT === null) return null;
      return totalTTC - stampTT;
    })();
    const cnpc = normalizeBinaryFlag(
      entry?.cnpc ?? entry?.CNPC ?? entry?.meta?.cnpc ?? entry?.meta?.CNPC ?? 0,
      0
    );
    const pCharge = normalizeBinaryFlag(
      entry?.pCharge ??
        entry?.p_charge ??
        entry?.P_Charge ??
        entry?.meta?.pCharge ??
        entry?.meta?.p_charge ??
        entry?.meta?.P_Charge ??
        0,
      0
    );
    const operationCategory = String(
      entry?.operationCategory ??
        entry?.operation_category ??
        entry?.meta?.operationCategory ??
        entry?.meta?.operation_category ??
        entry?.meta?.withholding?.operationCategory ??
        ""
    ).trim();
    const operationType = String(
      entry?.operationType ??
        entry?.operation_type ??
        entry?.meta?.operationType ??
        entry?.meta?.operation_type ??
        entry?.meta?.withholding?.operationType ??
        ""
    ).trim();
    return {
      path,
      number: number ? String(number) : "",
      name: name ? String(name) : "",
      clientName: entry?.clientName || entry?.client?.name || "",
      supplierName: supplierName ? String(supplierName) : "",
      date: isoDate || "",
      createdAt: createdAt || "",
      totalHT: entry?.totalHT,
      totalTTC: entry?.totalTTC,
      totalTTCExclStamp,
      stampTT,
      currency: entry?.currency,
      label: normalizeEntryLabel({ number, name, path }),
      cnpc,
      pCharge,
      operationCategory,
      operationType
    };
  };

  const fetchFaEntries = async () => {
    if (typeof w.electronAPI?.listInvoiceFiles === "function") {
      try {
        const res = await w.electronAPI.listInvoiceFiles({ docType: "fa" });
        if (res?.ok && Array.isArray(res.items)) return res.items;
      } catch (err) {
        console.warn("listInvoiceFiles failed", err);
      }
    }
    if (typeof w.getDocumentHistoryFull === "function") return w.getDocumentHistoryFull("fa") || [];
    if (typeof w.getDocumentHistory === "function") return w.getDocumentHistory("fa") || [];
    return [];
  };

  const buildTotalsFallback = (entry, meta) => {
    const totals = {};
    const totalHT = Number(entry?.totalHT);
    const totalTTC = Number(entry?.totalTTC);
    if (Number.isFinite(totalHT)) totals.totalHT = totalHT;
    if (Number.isFinite(totalTTC)) totals.totalTTC = totalTTC;
    if (Number.isFinite(totalHT) && Number.isFinite(totalTTC)) {
      totals.tax = totalTTC - totalHT;
    }
    const currency = entry?.currency || meta?.currency || "";
    if (currency) totals.currency = currency;
    if (!Number.isFinite(totals.grand) && Number.isFinite(totals.totalTTC)) {
      totals.grand = totals.totalTTC;
    }
    return totals;
  };

  const showFaSelectionDialog = async (entries) => {
    if (typeof w.showConfirm !== "function") {
      await showDialogSafe("Selection indisponible.");
      return [];
    }
    if (!entries.length) {
      await showDialogSafe("Aucune facture d'achat a afficher.");
      return [];
    }

    const normalized = entries
      .map(normalizeFaEntry)
      .filter(Boolean)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!normalized.length) {
      await showDialogSafe("Aucune facture d'achat a afficher.");
      return [];
    }

    const entryByPath = new Map(normalized.map((entry) => [entry.path, entry]));
    const now = new Date();
    const defaultStart = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultEnd = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    let startDateValue = defaultStart;
    let endDateValue = defaultEnd;
    let withholdingSettings = await loadWithholdingFaSettings();
    let thresholdValue = parseNumberInput(
      withholdingSettings.threshold,
      WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold
    );
    const defaultGenerationDate = toIsoDate(new Date());
    let generationDateValue = defaultGenerationDate;
    let acteDepotValue = 0;
    const PAGE_SIZE = 6;
    let page = 1;
    const selectedPaths = new Set();
    const paymentDateByPath = new Map();
    const cnpcByPath = new Map();
    const pChargeByPath = new Map();
    const operationCategoryByPath = new Map();
    const operationTypeByPath = new Map();
    const chevronSvg = `
      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
        <path fill="none" d="M0 0h24v24H0V0z"></path>
        <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path>
      </svg>
    `.trim();

    let menuRoot = null;
    const closeAllOpenMenus = (exceptMenu = null) => {
      const root = menuRoot || document;
      root.querySelectorAll("details.field-toggle-menu[open]").forEach((menu) => {
        if (menu === exceptMenu) return;
        menu.open = false;
        const summary = menu.querySelector("summary.field-toggle-trigger");
        if (summary) summary.setAttribute("aria-expanded", "false");
      });
    };

    const wireFloatingMenuPanel = (menu, summary, panel, panelPlaceholder) => {
      if (!menu || !summary || !panel || !panelPlaceholder) return;
      if (typeof window === "undefined" || typeof document === "undefined") return;

      let panelPortaled = false;
      let floatingScrollContainers = [];

      const collectFloatingScrollContainers = () => {
        const parents = [];
        let node = menu.parentElement;
        while (node && node !== document.body) {
          try {
            const style = window.getComputedStyle(node);
            const overflowY = style?.overflowY || style?.overflow || "";
            const overflowX = style?.overflowX || style?.overflow || "";
            if (/(auto|scroll)/i.test(overflowY) || /(auto|scroll)/i.test(overflowX)) {
              parents.push(node);
            }
          } catch {}
          node = node.parentElement;
        }
        return parents;
      };

      const detachFloatingListeners = () => {
        window.removeEventListener("resize", positionPanel, true);
        window.removeEventListener("scroll", positionPanel, true);
        floatingScrollContainers.forEach((node) => {
          try {
            node.removeEventListener("scroll", positionPanel, true);
          } catch {}
        });
        floatingScrollContainers = [];
      };

      const clearFloatingPanelStyles = () => {
        panel.classList.remove("is-floating");
        panel.style.position = "";
        panel.style.display = "";
        panel.style.top = "";
        panel.style.left = "";
        panel.style.right = "";
        panel.style.width = "";
        panel.style.minWidth = "";
        panel.style.maxHeight = "";
        panel.style.zIndex = "";
      };

      const restoreFloatingPanel = () => {
        if (panelPlaceholder.parentNode && panel.parentNode !== panelPlaceholder.parentNode) {
          try {
            panelPlaceholder.parentNode.insertBefore(panel, panelPlaceholder.nextSibling);
          } catch {}
        }
        panelPortaled = false;
      };

      const resetFloatingPanel = () => {
        detachFloatingListeners();
        clearFloatingPanelStyles();
        restoreFloatingPanel();
      };

      const positionPanel = () => {
        const rect = summary.getBoundingClientRect();
        const gap = 4;
        const rawWidth = rect.width || summary.offsetWidth || panel.offsetWidth || 0;
        const isXmlRetFaCategoryPanel =
          panel.id &&
          panel.id.startsWith("xmlRetFa-") &&
          panel.id.endsWith("-operationCategoryPanel");
        const minPanelWidth = isXmlRetFaCategoryPanel ? 360 : 1;
        const panelWidth = Math.max(rawWidth, minPanelWidth);
        const viewportPadding = 8;
        const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
        const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);
        const top = rect.bottom + gap;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.left = `${Math.round(left)}px`;
        panel.style.right = "auto";
        panel.style.width = `${Math.round(panelWidth)}px`;
        panel.style.minWidth = `${Math.round(panelWidth)}px`;
        panel.style.maxHeight = "fit-content";
      };

      const attachFloatingListeners = () => {
        detachFloatingListeners();
        floatingScrollContainers = collectFloatingScrollContainers();
        window.addEventListener("resize", positionPanel, true);
        window.addEventListener("scroll", positionPanel, true);
        floatingScrollContainers.forEach((node) => {
          try {
            node.addEventListener("scroll", positionPanel, true);
          } catch {}
        });
      };

      const portalFloatingPanel = () => {
        if (panelPortaled) {
          positionPanel();
          return;
        }
        if (panel.parentNode !== document.body) {
          try {
            document.body.appendChild(panel);
          } catch {}
        }
        panel.classList.add("is-floating");
        panel.style.position = "fixed";
        panel.style.display = "flex";
        panel.style.zIndex = "100040";
        positionPanel();
        attachFloatingListeners();
        panelPortaled = true;
      };

      const openFloatingPanel = () => {
        const scrollContainers = collectFloatingScrollContainers();
        if (!scrollContainers.length) {
          resetFloatingPanel();
          return;
        }
        portalFloatingPanel();
      };

      menu.addEventListener("toggle", () => {
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (menu.open) openFloatingPanel();
        else resetFloatingPanel();
      });
    };

    const createMenuGroup = ({
      idPrefix,
      labelText,
      placeholderText,
      options,
      selectedValue,
      onChange
    }) => {
      const group = document.createElement("div");
      let currentOptions = Array.isArray(options) ? options.slice() : [];
      group.className = "doc-history-convert__field";
      const label = document.createElement("label");
      label.className = "doc-history-convert__label doc-dialog-model-picker__label";
      label.id = `${idPrefix}Label`;
      label.textContent = labelText;
      const field = document.createElement("div");
      field.className = "doc-dialog-model-picker__field";

      const menu = document.createElement("details");
      menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu";
      menu.id = `${idPrefix}Menu`;
      menu.dataset.wired = "1";
      const summary = document.createElement("summary");
      summary.className = "btn success field-toggle-trigger";
      summary.setAttribute("role", "button");
      summary.setAttribute("aria-haspopup", "listbox");
      summary.setAttribute("aria-expanded", "false");
      summary.setAttribute("aria-labelledby", `${label.id} ${idPrefix}Display`);
      const display = document.createElement("span");
      display.id = `${idPrefix}Display`;
      display.className = "model-select-display";
      summary.append(display);
      summary.insertAdjacentHTML("beforeend", chevronSvg);
      menu.appendChild(summary);

      const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
      const panel = document.createElement("div");
      panel.id = `${idPrefix}Panel`;
      panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
      panel.setAttribute("role", "listbox");
      panel.setAttribute("aria-labelledby", label.id);
      menu.appendChild(panelPlaceholder);
      menu.appendChild(panel);
      wireFloatingMenuPanel(menu, summary, panel, panelPlaceholder);

      const hiddenSelect = document.createElement("select");
      hiddenSelect.id = `${idPrefix}Select`;
      hiddenSelect.className = "model-select doc-dialog-model-select";
      hiddenSelect.setAttribute("aria-hidden", "true");
      hiddenSelect.tabIndex = -1;
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = placeholderText || "";
      hiddenSelect.appendChild(placeholderOption);

      label.htmlFor = hiddenSelect.id;

      const getOptionLabel = (value) => {
        if (!value) return "";
        const match = currentOptions.find((opt) => opt.value === value);
        return match?.label || "";
      };

      const renderOptions = (nextOptions) => {
        currentOptions = Array.isArray(nextOptions) ? nextOptions.slice() : [];
        panel.textContent = "";
        hiddenSelect.textContent = "";
        placeholderOption.textContent = placeholderText || "";
        hiddenSelect.appendChild(placeholderOption);
        currentOptions.forEach((opt) => {
          const value = opt.value || "";
          const optionLabel = opt.label || value;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-select-option";
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", "false");
          btn.textContent = optionLabel;
          panel.appendChild(btn);

          const option = document.createElement("option");
          option.value = value;
          option.textContent = optionLabel;
          hiddenSelect.appendChild(option);
        });
      };

      const setSelection = (value, { closeMenu = true, notify = true } = {}) => {
        const nextValue = value || "";
        hiddenSelect.value = nextValue;
        const activeLabel = getOptionLabel(nextValue);
        display.textContent = activeLabel || placeholderText || "";
        panel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = btn.dataset.value === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        if (notify && typeof onChange === "function") onChange(nextValue);
        if (closeMenu) {
          menu.open = false;
          summary.setAttribute("aria-expanded", "false");
        }
      };

      panel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        setSelection(btn.dataset.value || "");
      });

      summary.addEventListener("click", (evt) => {
        evt.preventDefault();
        const willOpen = !menu.open;
        if (willOpen) closeAllOpenMenus(menu);
        menu.open = willOpen;
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (!menu.open) summary.focus();
      });

      menu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        menu.open = false;
        summary.setAttribute("aria-expanded", "false");
        summary.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!menu.open) return;
        if (menu.contains(evt.target) || panel.contains(evt.target)) return;
        menu.open = false;
        summary.setAttribute("aria-expanded", "false");
      });

      hiddenSelect.addEventListener("change", () => {
        setSelection(hiddenSelect.value || "");
      });

      field.append(menu, hiddenSelect);
      group.append(label, field);
      group._setSelection = setSelection;
      group._setOptions = (nextOptions, { selectedValue, notify = false } = {}) => {
        const nextSelection = selectedValue ?? hiddenSelect.value;
        renderOptions(nextOptions);
        setSelection(nextSelection, { closeMenu: false, notify });
      };
      renderOptions(currentOptions);
      setSelection(selectedValue, { closeMenu: false, notify: false });
      return group;
    };

    const createBinaryMenuGroup = ({ idPrefix, labelText, selectedValue, onChange }) => {
      const group = document.createElement("div");
      group.className = "doc-history-convert__field";
      const label = document.createElement("label");
      label.className = "doc-history-convert__label doc-dialog-model-picker__label";
      label.id = `${idPrefix}Label`;
      label.textContent = labelText;
      const field = document.createElement("div");
      field.className = "doc-dialog-model-picker__field";

      const menu = document.createElement("details");
      menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu";
      menu.id = `${idPrefix}Menu`;
      menu.dataset.wired = "1";
      const summary = document.createElement("summary");
      summary.className = "btn success field-toggle-trigger";
      summary.setAttribute("role", "button");
      summary.setAttribute("aria-haspopup", "listbox");
      summary.setAttribute("aria-expanded", "false");
      summary.setAttribute("aria-labelledby", `${label.id} ${idPrefix}Display`);
      const display = document.createElement("span");
      display.id = `${idPrefix}Display`;
      display.className = "model-select-display";
      summary.append(display);
      summary.insertAdjacentHTML("beforeend", chevronSvg);
      menu.appendChild(summary);

      const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
      const panel = document.createElement("div");
      panel.id = `${idPrefix}Panel`;
      panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
      panel.setAttribute("role", "listbox");
      panel.setAttribute("aria-labelledby", label.id);
      menu.appendChild(panelPlaceholder);
      menu.appendChild(panel);
      wireFloatingMenuPanel(menu, summary, panel, panelPlaceholder);

      const hiddenSelect = document.createElement("select");
      hiddenSelect.id = `${idPrefix}Select`;
      hiddenSelect.className = "model-select doc-dialog-model-select";
      hiddenSelect.setAttribute("aria-hidden", "true");
      hiddenSelect.tabIndex = -1;
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = "0";
      hiddenSelect.appendChild(placeholderOption);

      ["0", "1"].forEach((value) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "model-select-option";
        btn.dataset.value = value;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", "false");
        btn.textContent = value;
        panel.appendChild(btn);

        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        hiddenSelect.appendChild(option);
      });

      label.htmlFor = hiddenSelect.id;

      const setSelection = (value, { closeMenu = true, notify = true } = {}) => {
        const normalized = normalizeBinaryFlag(value, 0);
        const nextValue = String(normalized);
        hiddenSelect.value = nextValue;
        display.textContent = nextValue;
        panel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = btn.dataset.value === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        if (notify && typeof onChange === "function") onChange(normalized);
        if (closeMenu) {
          menu.open = false;
          summary.setAttribute("aria-expanded", "false");
        }
      };

      panel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        setSelection(btn.dataset.value || "0");
      });

      summary.addEventListener("click", (evt) => {
        evt.preventDefault();
        const willOpen = !menu.open;
        if (willOpen) closeAllOpenMenus(menu);
        menu.open = willOpen;
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (!menu.open) summary.focus();
      });

      menu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        menu.open = false;
        summary.setAttribute("aria-expanded", "false");
        summary.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!menu.open) return;
        if (menu.contains(evt.target) || panel.contains(evt.target)) return;
        menu.open = false;
        summary.setAttribute("aria-expanded", "false");
      });

      hiddenSelect.addEventListener("change", () => {
        setSelection(hiddenSelect.value || "0");
      });

      field.append(menu, hiddenSelect);
      group.append(label, field);

      const normalized = normalizeBinaryFlag(selectedValue, 0);
      setSelection(String(normalized), { closeMenu: false, notify: false });
      return group;
    };

    const operationTypeBaseDefault = "RS7_000001";
    const operationCategoryOptions = [
      { value: "Loyers", label: "Loyers" },
      {
        value: "R\u00E9mun\u00E9ration des activit\u00E9s non commerciales",
        label: "R\u00E9mun\u00E9ration des activit\u00E9s non commerciales"
      },
      {
        value: "Revenus des capitaux mobiliers",
        label: "Revenus des capitaux mobiliers"
      },
      { value: "Cession de valeurs mobili\u00E8res", label: "Cession de valeurs mobili\u00E8res" },
      { value: "Dividendes", label: "Dividendes" },
      { value: "Cessions FC et immeubles", label: "Cessions FC et immeubles" },
      {
        value: "Acquisitions des marchandises, mat\u00E9riel \u00E9quipements et de services",
        label: "Acquisitions des marchandises, mat\u00E9riel \u00E9quipements et de services"
      }
    ];
    const operationTypesByCategory = {
      [operationCategoryOptions[0].value]: ["RS1_000001", "RS1_000002"],
      [operationCategoryOptions[1].value]: [
        "RS2_000001",
        "RS2_000002",
        "RS2_000003",
        "RS2_000004"
      ],
      [operationCategoryOptions[2].value]: [
        "RS3_000001",
        "RS3_000003",
        "RS3_000004",
        "RS3_000005"
      ],
      [operationCategoryOptions[3].value]: ["RS4_000001", "RS4_000002"],
      [operationCategoryOptions[4].value]: ["RS5_000001", "RS5_000002", "RS5_000003"],
      [operationCategoryOptions[5].value]: [
        "RS6_000001",
        "RS6_000002",
        "RS6_000003",
        "RS6_000005"
      ],
      [operationCategoryOptions[6].value]: [
        "RS7_000001",
        "RS7_000002",
        "RS7_000003",
        "RS7_000004",
        "RS7_000005"
      ]
    };
    const normalizeOperationCategory = (value) => {
      const normalized = String(value || "").trim();
      if (!normalized) return "";
      return operationCategoryOptions.some((opt) => opt.value === normalized) ? normalized : "";
    };
    const resolveOperationCategoryFromType = (value) => {
      const normalized = String(value || "").trim();
      if (!normalized) return "";
      const entries = Object.entries(operationTypesByCategory);
      for (const [categoryValue, types] of entries) {
        if (Array.isArray(types) && types.includes(normalized)) {
          return categoryValue;
        }
      }
      return "";
    };
    const resolveOperationTypesForCategory = (value) => {
      const normalized = normalizeOperationCategory(value) || operationCategoryOptions[0]?.value || "";
      const types = operationTypesByCategory[normalized];
      return Array.isArray(types) ? types : [];
    };
    const getOperationTypeLabel = (value) => {
      if (value === "RS7_000001") return "RS7_000001 (1.5%)";
      if (value === "RS7_000002") return "RS7_000002 (1%)";
      if (value === "RS7_000003") return "RS7_000003 (0.5%)";
      if (value === "RS7_000004") return "RS7_000004 (1.5%)";
      if (value === "RS7_000005") return "RS7_000005 (1%)";
      return value;
    };
    const buildOperationTypeOptions = (categoryValue) => {
      const types = resolveOperationTypesForCategory(categoryValue);
      return types.map((typeValue) => ({
        value: typeValue,
        label: getOperationTypeLabel(typeValue)
      }));
    };
    const resolveWithholdingSettingsForDialog = (rawSettings = {}) => {
      const normalized = normalizeWithholdingFaSettings(rawSettings);
      const resolvedCategory =
        normalizeOperationCategory(normalized.operationCategory) ||
        resolveOperationCategoryFromType(normalized.operationType) ||
        operationCategoryOptions[operationCategoryOptions.length - 1]?.value ||
        operationCategoryOptions[0]?.value ||
        WITHHOLDING_FA_SETTINGS_DEFAULTS.operationCategory;
      let resolvedType = String(normalized.operationType || "").trim();
      let typeOptions = buildOperationTypeOptions(resolvedCategory);
      if (!typeOptions.length) {
        typeOptions = [
          {
            value: operationTypeBaseDefault,
            label: getOperationTypeLabel(operationTypeBaseDefault)
          }
        ];
      }
      if (!typeOptions.some((opt) => opt.value === resolvedType)) {
        resolvedType = typeOptions[0].value;
      }
      return {
        threshold: parseNumberInput(normalized.threshold, WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold),
        cnpc: normalizeBinaryFlag(normalized.cnpc, WITHHOLDING_FA_SETTINGS_DEFAULTS.cnpc),
        pCharge: normalizeBinaryFlag(normalized.pCharge, WITHHOLDING_FA_SETTINGS_DEFAULTS.pCharge),
        rate: parseNumberInput(normalized.rate, WITHHOLDING_FA_SETTINGS_DEFAULTS.rate),
        operationCategory: resolvedCategory,
        operationType: resolvedType
      };
    };
    withholdingSettings = resolveWithholdingSettingsForDialog(withholdingSettings);
    thresholdValue = withholdingSettings.threshold;

    const openWithholdingFaSettingsModal = (currentSettings, triggerEl = null) =>
      new Promise((resolve) => {
        if (typeof document === "undefined") {
          resolve(null);
          return;
        }

        const initial = resolveWithholdingSettingsForDialog(currentSettings);
        const existing = document.getElementById("xmlRetFaSettingsModal");
        if (existing && typeof existing.remove === "function") existing.remove();

        const modal = document.createElement("div");
        modal.id = "xmlRetFaSettingsModal";
        modal.className = "swbDialog client-fields-modal xml-ret-fa-settings-modal";
        modal.hidden = true;
        modal.setAttribute("hidden", "");
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
          <div class="swbDialog__panel client-fields-modal__panel" role="dialog" aria-modal="true" aria-labelledby="xmlRetFaSettingsModalTitle">
            <div class="swbDialog__header">
              <div id="xmlRetFaSettingsModalTitle" class="swbDialog__title">Retenue a la source</div>
              <button type="button" class="swbDialog__close" data-xml-ret-fa-settings-close aria-label="Fermer">
                <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
                </svg>
              </button>
            </div>
            <div class="client-fields-modal__body swbDialog__msg xml-ret-fa-settings-modal__body">
              <div class="xml-ret-fa-settings-modal__content">
                <div class="xml-ret-fa-settings-modal__grid" id="xmlRetFaSettingsGrid"></div>
              </div>
            </div>
            <div class="client-fields-modal__actions swbDialog__actions">
              <div class="swbDialog__group swbDialog__group--left">
                <button type="button" class="swbDialog__cancel" data-xml-ret-fa-settings-close>Annuler</button>
              </div>
              <div class="swbDialog__group swbDialog__group--right">
                <button type="button" class="swbDialog__ok" data-xml-ret-fa-settings-save>Enregistrer</button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const restoreEl =
          triggerEl && typeof triggerEl.focus === "function"
            ? triggerEl
            : document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        const grid = modal.querySelector("#xmlRetFaSettingsGrid");
        const saveBtn = modal.querySelector("[data-xml-ret-fa-settings-save]");
        const closeButtons = modal.querySelectorAll("[data-xml-ret-fa-settings-close]");
        const modalState = {
          threshold: initial.threshold,
          rate: initial.rate,
          cnpc: initial.cnpc,
          pCharge: initial.pCharge,
          operationCategory: initial.operationCategory,
          operationType: initial.operationType
        };

        const createNumberField = ({ id, labelText, value, onInput }) => {
          const field = document.createElement("div");
          field.className = "doc-history-convert__field xml-ret-fa-settings-modal__field";
          const label = document.createElement("label");
          label.className = "doc-history-convert__label";
          label.textContent = labelText;
          label.setAttribute("for", id);
          const input = document.createElement("input");
          input.id = id;
          input.type = "number";
          input.min = "0";
          input.step = "0.01";
          input.value = String(value ?? "");
          input.addEventListener("input", () => onInput(input.value));
          input.addEventListener("change", () => onInput(input.value));
          field.append(label, input);
          return { field, input };
        };

        const { field: thresholdField, input: thresholdInput } = createNumberField({
          id: "xmlRetFaSettingsThreshold",
          labelText: "Seuil (Montant >)",
          value: modalState.threshold,
          onInput(value) {
            modalState.threshold = parseNumberInput(
              value,
              WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold
            );
          }
        });

        const { field: rateField, input: rateInput } = createNumberField({
          id: "xmlRetFaSettingsRate",
          labelText: "Taux %",
          value: modalState.rate,
          onInput(value) {
            modalState.rate = parseNumberInput(value, WITHHOLDING_FA_SETTINGS_DEFAULTS.rate);
          }
        });

        const cnpcGroup = createBinaryMenuGroup({
          idPrefix: "xmlRetFaSettingsCnpc",
          labelText: "CNPC",
          selectedValue: modalState.cnpc,
          onChange(value) {
            modalState.cnpc = normalizeBinaryFlag(value, WITHHOLDING_FA_SETTINGS_DEFAULTS.cnpc);
          }
        });
        cnpcGroup.classList.add("xml-ret-fa-settings-modal__field");

        const pChargeGroup = createBinaryMenuGroup({
          idPrefix: "xmlRetFaSettingsPCharge",
          labelText: "P_Charge",
          selectedValue: modalState.pCharge,
          onChange(value) {
            modalState.pCharge = normalizeBinaryFlag(value, WITHHOLDING_FA_SETTINGS_DEFAULTS.pCharge);
          }
        });
        pChargeGroup.classList.add("xml-ret-fa-settings-modal__field");

        const normalizedInitialCategory =
          normalizeOperationCategory(modalState.operationCategory) ||
          operationCategoryOptions[0]?.value ||
          "";
        let initialTypeOptions = buildOperationTypeOptions(normalizedInitialCategory);
        if (!initialTypeOptions.length) {
          initialTypeOptions = [
            {
              value: operationTypeBaseDefault,
              label: getOperationTypeLabel(operationTypeBaseDefault)
            }
          ];
        }
        if (!initialTypeOptions.some((opt) => opt.value === modalState.operationType)) {
          modalState.operationType = initialTypeOptions[0].value;
        }
        modalState.operationCategory = normalizedInitialCategory;

        let operationTypeGroup = null;
        const handleOperationTypeChange = (value) => {
          const nextValue = String(value || "").trim();
          modalState.operationType = nextValue || operationTypeBaseDefault;
        };
        const handleOperationCategoryChange = (value) => {
          const nextCategory = normalizeOperationCategory(value) || operationCategoryOptions[0]?.value || "";
          modalState.operationCategory = nextCategory;
          const nextOptions = buildOperationTypeOptions(nextCategory);
          const resolvedOptions =
            nextOptions.length > 0
              ? nextOptions
              : [
                  {
                    value: operationTypeBaseDefault,
                    label: getOperationTypeLabel(operationTypeBaseDefault)
                  }
                ];
          const nextType = resolvedOptions.some((opt) => opt.value === modalState.operationType)
            ? modalState.operationType
            : resolvedOptions[0].value;
          modalState.operationType = nextType;
          if (operationTypeGroup && typeof operationTypeGroup._setOptions === "function") {
            operationTypeGroup._setOptions(resolvedOptions, { selectedValue: nextType });
          }
        };

        const operationCategoryGroup = createMenuGroup({
          idPrefix: "xmlRetFaSettingsOperationCategory",
          labelText: "Categorie",
          placeholderText: operationCategoryOptions[0]?.label || "",
          options: operationCategoryOptions,
          selectedValue: modalState.operationCategory,
          onChange: handleOperationCategoryChange
        });
        operationCategoryGroup.classList.add(
          "xml-ret-fa-settings-modal__field",
          "xml-ret-fa-settings-modal__field--full"
        );

        operationTypeGroup = createMenuGroup({
          idPrefix: "xmlRetFaSettingsOperationType",
          labelText: "Type d'operation",
          placeholderText: initialTypeOptions[0]?.label || operationTypeBaseDefault,
          options: initialTypeOptions,
          selectedValue: modalState.operationType,
          onChange: handleOperationTypeChange
        });
        operationTypeGroup.classList.add(
          "xml-ret-fa-settings-modal__field",
          "xml-ret-fa-settings-modal__field--full"
        );

        grid?.append(
          thresholdField,
          rateField,
          cnpcGroup,
          pChargeGroup,
          operationCategoryGroup,
          operationTypeGroup
        );

        const finish = (result = null) => {
          document.removeEventListener("keydown", onKeyDown, true);
          if (modal && typeof modal.remove === "function") {
            modal.remove();
          }
          if (restoreEl && typeof restoreEl.focus === "function") {
            try {
              restoreEl.focus();
            } catch {}
          }
          resolve(result);
        };

        const onKeyDown = (evt) => {
          if (evt.key !== "Escape") return;
          evt.preventDefault();
          finish(null);
        };

        closeButtons.forEach((btn) => {
          btn.addEventListener("click", () => finish(null));
        });

        modal.addEventListener("click", (evt) => {
          if (evt.target === modal) finish(null);
        });

        saveBtn?.addEventListener("click", async () => {
          try {
            if (saveBtn) saveBtn.disabled = true;
            const draft = resolveWithholdingSettingsForDialog({
              threshold: modalState.threshold,
              cnpc: modalState.cnpc,
              pCharge: modalState.pCharge,
              rate: modalState.rate,
              operationCategory: modalState.operationCategory || initial.operationCategory,
              operationType: modalState.operationType || initial.operationType
            });
            const saved = await saveWithholdingFaSettings(draft);
            finish(resolveWithholdingSettingsForDialog(saved));
          } catch (err) {
            await showDialogSafe(
              String(err?.message || err || "Impossible d'enregistrer les parametres."),
              { title: "Retenue a la source" }
            );
            if (saveBtn) saveBtn.disabled = false;
          }
        });

        modal.hidden = false;
        modal.removeAttribute("hidden");
        modal.setAttribute("aria-hidden", "false");
        modal.classList.add("is-open");
        document.addEventListener("keydown", onKeyDown, true);
        const firstInput = thresholdInput || rateInput;
        if (firstInput && typeof firstInput.focus === "function") {
          try {
            firstInput.focus({ preventScroll: true });
          } catch {
            try {
              firstInput.focus();
            } catch {}
          }
        }
      });

    const applyWithholdingSettingsToRows = (rawSettings) => {
      const resolved = resolveWithholdingSettingsForDialog(rawSettings);
      withholdingSettings = resolved;
      thresholdValue = resolved.threshold;
      normalized.forEach((entry) => {
        cnpcByPath.set(entry.path, resolved.cnpc);
        pChargeByPath.set(entry.path, resolved.pCharge);
        operationCategoryByPath.set(entry.path, resolved.operationCategory);
        operationTypeByPath.set(entry.path, resolved.operationType);
        entry.cnpc = resolved.cnpc;
        entry.pCharge = resolved.pCharge;
        entry.rate = resolved.rate;
        entry.operationCategory = resolved.operationCategory;
        entry.operationType = resolved.operationType;
      });
    };

    const resolveTtcSansTimbre = (entry) => {
      const direct = parseNumberInput(entry?.totalTTCExclStamp ?? entry?.totalTTCSansTimbre, null);
      if (direct !== null) return direct;
      const totalTtcValue = parseNumberInput(entry?.totalTTC, null);
      if (totalTtcValue === null) return null;
      const stampValue = parseNumberInput(entry?.stampTT, 0);
      return totalTtcValue - stampValue;
    };

    const confirmed = await w.showConfirm("", {
      title: "Retenue a la source FA",
      okText: "Generer XML",
      cancelText: "Annuler",
      renderMessage(container) {
        container.innerHTML = "";
        const previousMaxHeight = container.style.maxHeight;
        const previousOverflow = container.style.overflow;
        const previousOverflowX = container.style.overflowX;
        const previousOverflowY = container.style.overflowY;
        container.style.maxHeight = "";
        container.style.overflow = "";
        container.style.overflowX = "";
        container.style.overflowY = "";

        const cleanupCallbacks = [];
        const registerCleanup = (cb) => {
          if (typeof cb === "function") cleanupCallbacks.push(cb);
        };
        const withClasses = (el, classNames = []) => {
          if (!el || !Array.isArray(classNames) || !classNames.length) return;
          classNames.forEach((className) => {
            if (!className) return;
            el.classList.add(className);
          });
          registerCleanup(() => {
            classNames.forEach((className) => {
              if (!className) return;
              el.classList.remove(className);
            });
          });
        };
        const runCleanup = (() => {
          let cleaned = false;
          return () => {
            if (cleaned) return;
            cleaned = true;
            while (cleanupCallbacks.length) {
              const cb = cleanupCallbacks.pop();
              try {
                cb();
              } catch {}
            }
            container.style.maxHeight = previousMaxHeight;
            container.style.overflow = previousOverflow;
            container.style.overflowX = previousOverflowX;
            container.style.overflowY = previousOverflowY;
          };
        })();

        const dialogOverlay = container.closest("#swbDialog");
        const dialogPanel = dialogOverlay?.querySelector(".swbDialog__panel") || null;
        const dialogActions = dialogOverlay?.querySelector(".swbDialog__actions") || null;
        const dialogLeftActions = dialogActions?.querySelector(".swbDialog__group--left") || null;
        const dialogRightActions = dialogActions?.querySelector(".swbDialog__group--right") || null;
        const dialogCancelBtn = getElSafe("swbDialogCancel");
        const dialogOkBtn = getElSafe("swbDialogOk");
        const dialogTargetId = "xmlRetFaDialog";
        if (dialogOverlay) {
          dialogOverlay.setAttribute("data-dialog-id", dialogTargetId);
          registerCleanup(() => {
            if (dialogOverlay.getAttribute("data-dialog-id") === dialogTargetId) {
              dialogOverlay.removeAttribute("data-dialog-id");
            }
          });
        }

        withClasses(dialogOverlay, ["is-open", "payments-history-modal", "xml-ret-fa-dialog"]);
        withClasses(dialogPanel, [
          "payments-history-modal__panel",
          "doc-history-modal__panel",
          "xml-ret-fa-dialog__panel"
        ]);
        withClasses(container, [
          "payments-history-modal__body",
          "doc-history-modal__body",
          "xml-ret-fa-dialog__body"
        ]);
        withClasses(dialogActions, [
          "client-saved-modal__actions",
          "doc-history-modal__actions",
          "xml-ret-fa-dialog__actions"
        ]);
        withClasses(dialogLeftActions, [
          "client-search__actions",
          "client-saved-modal__actions-left",
          "doc-history-modal__actions-left",
          "xml-ret-fa-dialog__actions-left"
        ]);
        withClasses(dialogRightActions, [
          "client-search__actions",
          "client-saved-modal__pager",
          "doc-history-modal__pager",
          "xml-ret-fa-dialog__actions-right"
        ]);
        withClasses(dialogCancelBtn, ["client-search__close", "xml-ret-fa-dialog__cancel"]);
        withClasses(dialogOkBtn, ["client-search__add", "xml-ret-fa-dialog__ok"]);

        if (dialogOverlay) {
          const observer = new MutationObserver(() => {
            const hidden =
              dialogOverlay.getAttribute("aria-hidden") === "true" ||
              dialogOverlay.style.display === "none";
            if (!hidden) return;
            runCleanup();
            observer.disconnect();
          });
          observer.observe(dialogOverlay, {
            attributes: true,
            attributeFilter: ["aria-hidden", "style"]
          });
          registerCleanup(() => observer.disconnect());
        }

        const wrapper = document.createElement("div");
        wrapper.className = "xml-ret-fa-picker doc-history-modal__content";
        wrapper.id = "xmlRetFaPicker";
        menuRoot = wrapper;
        registerCleanup(() => {
          if (menuRoot === wrapper) menuRoot = null;
        });

        const filters = document.createElement("div");
        filters.className = "xml-ret-fa-picker__filters doc-history-modal__filters payments-history__filters";

        const dateRangeFields = document.createElement("div");
        dateRangeFields.className = "report-tax-date-range__fields";
        const presetOptions = [
          { value: "custom", label: "Par dates" },
          { value: "today", label: "Aujourd'hui" },
          { value: "this-month", label: "Ce mois" },
          { value: "last-month", label: "Mois dernier" },
          { value: "this-year", label: "Cette annee" },
          { value: "last-year", label: "L'annee derniere" }
        ];
        const presetLabelMap = new Map(presetOptions.map((opt) => [opt.value, opt.label]));
        const presetButtons = presetOptions
          .map((opt) => {
            const isActive = opt.value === "custom";
            return `
              <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-report-tax-preset="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
                ${opt.label}
              </button>
            `;
          })
          .join("");
        const presetSelectOptions = presetOptions
          .map((opt) => {
            const isSelected = opt.value === "custom";
            return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
          })
          .join("");
        const presetLabelId = "xmlRetFaPresetLabel";
        const presetMenuId = "xmlRetFaPresetMenu";
        const presetDisplayId = "xmlRetFaPresetDisplay";
        const presetPanelId = "xmlRetFaPresetPanel";
        const presetSelectId = "xmlRetFaPreset";
        const presetLabel = document.createElement("label");
        presetLabel.className = "report-tax-date-range__selector";
        presetLabel.innerHTML = `
          <span id="${presetLabelId}">Selection</span>
          <div class="report-tax-date-range__controls">
            <details id="${presetMenuId}" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
              <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${presetLabelId} ${presetDisplayId}">
                <span id="${presetDisplayId}">Par dates</span>
                ${chevronSvg}
              </summary>
              <div id="${presetPanelId}" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="${presetLabelId}">
                ${presetButtons}
              </div>
            </details>
            <select id="${presetSelectId}" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
              ${presetSelectOptions}
            </select>
          </div>
        `;

        const startField = document.createElement("label");
        startField.className = "report-tax-date-range__field";
        const startLabel = document.createElement("span");
        startLabel.textContent = "Du";
        const startInputId = "xmlRetFaStartDate";
        const startPanelId = "xmlRetFaStartDatePanel";
        const startPicker = document.createElement("div");
        startPicker.className = "swb-date-picker";
        startPicker.setAttribute("data-date-picker", "");
        startPicker.innerHTML = `
          <input
            id="${startInputId}"
            type="text"
            inputmode="numeric"
            placeholder="AAAA-MM-JJ"
            autocomplete="off"
            spellcheck="false"
            aria-haspopup="dialog"
            aria-expanded="false"
            role="combobox"
            aria-controls="${startPanelId}"
          >
          <button
            type="button"
            class="swb-date-picker__toggle"
            data-date-picker-toggle
            aria-label="Choisir une date"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="${startPanelId}"
          >
            <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"></path>
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
            id="${startPanelId}"
          ></div>
        `;
        startField.append(startLabel, startPicker);

        const endField = document.createElement("label");
        endField.className = "report-tax-date-range__field";
        const endLabel = document.createElement("span");
        endLabel.textContent = "Au";
        const endInputId = "xmlRetFaEndDate";
        const endPanelId = "xmlRetFaEndDatePanel";
        const endPicker = document.createElement("div");
        endPicker.className = "swb-date-picker";
        endPicker.setAttribute("data-date-picker", "");
        endPicker.innerHTML = `
          <input
            id="${endInputId}"
            type="text"
            inputmode="numeric"
            placeholder="AAAA-MM-JJ"
            autocomplete="off"
            spellcheck="false"
            aria-haspopup="dialog"
            aria-expanded="false"
            role="combobox"
            aria-controls="${endPanelId}"
          >
          <button
            type="button"
            class="swb-date-picker__toggle"
            data-date-picker-toggle
            aria-label="Choisir une date"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="${endPanelId}"
          >
            <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"></path>
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
            id="${endPanelId}"
          ></div>
        `;
        endField.append(endLabel, endPicker);

        const thresholdInputId = "xmlRetFaThreshold";
        const thresholdField = document.createElement("div");
        thresholdField.className = "doc-history-convert__field";
        const thresholdLabel = document.createElement("label");
        thresholdLabel.className = "doc-history-convert__label";
        thresholdLabel.textContent = "Seuil (Montant >)";
        thresholdLabel.setAttribute("for", thresholdInputId);
        const thresholdInput = document.createElement("input");
        thresholdInput.id = thresholdInputId;
        thresholdInput.type = "number";
        thresholdInput.min = "0";
        thresholdInput.step = "0.01";
        thresholdInput.value = String(thresholdValue);
        thresholdField.append(thresholdLabel, thresholdInput);

        const generationDateInputId = "xmlRetFaGenerationDate";
        const generationDatePanelId = "xmlRetFaGenerationDatePanel";
        const generationDateField = document.createElement("div");
        generationDateField.className = "doc-history-convert__field doc-date-field";
        const generationDateLabel = document.createElement("label");
        generationDateLabel.className = "doc-history-convert__label";
        generationDateLabel.textContent = "Date de Generation";
        generationDateLabel.setAttribute("for", generationDateInputId);
        const generationDatePicker = document.createElement("div");
        generationDatePicker.className = "swb-date-picker";
        generationDatePicker.setAttribute("data-date-picker", "");
        generationDatePicker.innerHTML = `
          <input
            id="${generationDateInputId}"
            type="text"
            inputmode="numeric"
            placeholder="AAAA-MM-JJ"
            autocomplete="off"
            spellcheck="false"
            aria-haspopup="dialog"
            aria-expanded="false"
            role="combobox"
            aria-controls="${generationDatePanelId}"
          >
          <button
            type="button"
            class="swb-date-picker__toggle"
            data-date-picker-toggle
            aria-label="Choisir une date"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="${generationDatePanelId}"
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
            id="${generationDatePanelId}"
          ></div>
        `;
        generationDateField.append(generationDateLabel, generationDatePicker);

        const acteDepotField = createBinaryMenuGroup({
          idPrefix: "xmlRetFaActeDepot",
          labelText: "Code acte",
          selectedValue: acteDepotValue,
          onChange(value) {
            acteDepotValue = value;
          }
        });
        const headerRow2 = document.createElement("div");
        headerRow2.className = "xml-ret-fa-picker__header-row2";
        headerRow2.append(generationDateField, acteDepotField, thresholdField);

        const headerControls = document.createElement("div");
        headerControls.className = "xml-ret-fa-picker__header-controls";
        const headerRow1 = document.createElement("div");
        headerRow1.className = "xml-ret-fa-picker__header-row1";
        headerRow1.append(presetLabel, startField, endField);
        headerControls.append(headerRow1, headerRow2);

        const settingsBtn = document.createElement("button");
        settingsBtn.type = "button";
        settingsBtn.id = "xmlRetFaSettingsBtn";
        settingsBtn.className = "doc-type-action-btn xml-ret-fa-picker__settings-btn";
        settingsBtn.setAttribute("aria-controls", "xmlRetFaSettingsModal");
        settingsBtn.innerHTML = `
          <span class="doc-type-action-icon" aria-hidden="true">
            <svg
              stroke="currentColor"
              fill="none"
              stroke-width="2"
              viewBox="0 0 24 24"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.72 1.72 0 0 0 2.573 1.066c1.52-.878 3.31.912 2.432 2.431a1.72 1.72 0 0 0 1.065 2.574c1.756.426 1.756 2.924 0 3.35a1.72 1.72 0 0 0-1.066 2.573c.878 1.52-.912 3.31-2.431 2.432a1.72 1.72 0 0 0-2.574 1.065c-.426 1.756-2.924 1.756-3.35 0a1.72 1.72 0 0 0-2.573-1.066c-1.52.878-3.31-.912-2.432-2.431a1.72 1.72 0 0 0-1.065-2.574c-1.756-.426-1.756-2.924 0-3.35a1.72 1.72 0 0 0 1.066-2.573c-.878-1.52.912-3.31 2.431-2.432.997.576 2.296.109 2.574-1.065Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </span>
          <span class="doc-type-action-label">Retenue a la source</span>
        `;

        dateRangeFields.append(headerControls, settingsBtn);

        const statusRow = document.createElement("div");
        statusRow.className = "doc-history-modal__status-row xml-ret-fa-picker__status-row";
        const statusLabel = document.createElement("p");
        statusLabel.className = "doc-history-modal__status xml-ret-fa-picker__status";
        statusLabel.textContent = "Factures d'achat";
        const countEl = document.createElement("p");
        countEl.className = "doc-history-modal__recap xml-ret-fa-picker__count";
        countEl.textContent = "0 / 0 selectionnee(s)";
        statusRow.append(statusLabel, countEl);

        filters.append(dateRangeFields);

        const listWrap = document.createElement("div");
        listWrap.className = "table-wrap payments-history__table-wrap xml-ret-fa-picker__list-wrap";
        const listPanel = document.createElement("div");
        listPanel.className = "field-toggle-panel xml-ret-fa-picker__list model-field-toggles";
        const pager = document.createElement("div");
        pager.className = "client-search__actions client-saved-modal__pager doc-history-modal__pager xml-ret-fa-picker__pager";
        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "client-search__edit";
        prevBtn.textContent = "Precedent";
        const pageText = document.createElement("span");
        pageText.className = "client-saved-modal__page doc-history-modal__page";
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "client-search__add";
        nextBtn.textContent = "Suivant";
        pager.append(prevBtn, pageText, nextBtn);
        listWrap.append(listPanel);
        if (dialogRightActions) {
          dialogRightActions.insertBefore(pager, dialogOkBtn || null);
          registerCleanup(() => pager.remove());
        } else {
          statusRow.append(pager);
        }

        const updateOkState = () => {
          const hasSelection = selectedPaths.size > 0;
          if (!dialogOkBtn) return;
          dialogOkBtn.disabled = !hasSelection;
          dialogOkBtn.setAttribute("aria-disabled", hasSelection ? "false" : "true");
        };

        const updateCount = (filteredCount) => {
          countEl.textContent = `${selectedPaths.size} / ${filteredCount} selectionnee(s)`;
        };

        const renderList = () => {
          listPanel.textContent = "";
          const thresholdActive = Number.isFinite(thresholdValue) && thresholdValue > 0;
          const filtered = normalized.filter((entry) => {
            if ((startDateValue || endDateValue) && !isDateInRange(entry.date, startDateValue, endDateValue)) {
              return false;
            }
            if (thresholdActive) {
              const totalValue = resolveTtcSansTimbre(entry);
              if (!Number.isFinite(totalValue) || totalValue <= thresholdValue) return false;
            }
            return true;
          });
          if (!filtered.length) {
            const empty = document.createElement("div");
            empty.className = "doc-history-modal__empty";
            empty.textContent = "Aucune facture d'achat pour cette periode.";
            listPanel.appendChild(empty);
            pager.hidden = true;
            updateCount(0);
            updateOkState();
            return;
          }

          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          if (page > totalPages) page = totalPages;
          const startIdx = (page - 1) * PAGE_SIZE;
          const pageEntries = filtered.slice(startIdx, startIdx + PAGE_SIZE);

          pageText.textContent = `${page} / ${totalPages}`;
          prevBtn.disabled = page <= 1;
          nextBtn.disabled = page >= totalPages;
          pager.hidden = totalPages <= 1;

          const todayIso = new Date().toISOString().slice(0, 10);
          const defaultCnpc = normalizeBinaryFlag(
            withholdingSettings.cnpc,
            WITHHOLDING_FA_SETTINGS_DEFAULTS.cnpc
          );
          const defaultPCharge = normalizeBinaryFlag(
            withholdingSettings.pCharge,
            WITHHOLDING_FA_SETTINGS_DEFAULTS.pCharge
          );
          const defaultRate = parseNumberInput(
            withholdingSettings.rate,
            WITHHOLDING_FA_SETTINGS_DEFAULTS.rate
          );
          const defaultOperationCategory =
            normalizeOperationCategory(withholdingSettings.operationCategory) ||
            resolveOperationCategoryFromType(withholdingSettings.operationType) ||
            operationCategoryOptions[operationCategoryOptions.length - 1]?.value ||
            operationCategoryOptions[0]?.value ||
            "";
          let defaultOperationType =
            String(withholdingSettings.operationType || "").trim() || operationTypeBaseDefault;
          let defaultOperationTypes = buildOperationTypeOptions(defaultOperationCategory);
          if (defaultOperationTypes.length === 0) {
            defaultOperationTypes = [
              {
                value: operationTypeBaseDefault,
                label: getOperationTypeLabel(operationTypeBaseDefault)
              }
            ];
          }
          if (!defaultOperationTypes.some((opt) => opt.value === defaultOperationType)) {
            defaultOperationType = defaultOperationTypes[0].value;
          }
          pageEntries.forEach((entry, index) => {
            const item = document.createElement("label");
            item.className = "toggle-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "col-toggle";
            checkbox.setAttribute("aria-label", entry.label);
            checkbox.checked = selectedPaths.has(entry.path);

            const details = document.createElement("span");
            details.className = "xml-ret-fa-picker__details";
            const headerRow = document.createElement("span");
            headerRow.className = "xml-ret-fa-picker__header";
            const title = document.createElement("span");
            title.className = "model-save-dot xml-ret-fa-picker__title";
            title.textContent = entry.label;
            const supplierText = entry.supplierName || "--";
            const supplierLine = document.createElement("span");
            supplierLine.className = "xml-ret-fa-picker__meta";
            supplierLine.textContent = `FOURNISSEUR : ${supplierText}`;
            const totalHtValue = parseNumberInput(entry.totalHT, null);
            const totalHtText = Number.isFinite(totalHtValue)
              ? formatMoneySafe(totalHtValue, entry.currency)
              : "--";
            const totalHtLine = document.createElement("span");
            totalHtLine.className = "xml-ret-fa-picker__meta";
            totalHtLine.textContent = `TOTAL HT : ${totalHtText}`;
            const totalValue = resolveTtcSansTimbre(entry);
            const totalText = Number.isFinite(totalValue)
              ? formatMoneySafe(totalValue, entry.currency)
              : "--";
            const totalLine = document.createElement("span");
            totalLine.className = "xml-ret-fa-picker__meta";
            totalLine.textContent = `TOTAL TTC : ${totalText} (sans timbre fiscal)`;
            const totalTtcForAmount = Number.isFinite(totalValue) ? totalValue : null;
            const paymentField = document.createElement("div");
            paymentField.className = "doc-history-convert__field doc-date-field xml-ret-fa-picker__payment";
            const paymentInputId = `xmlRetFaPaymentDate-${startIdx + index}`;
            const paymentPanelId = `${paymentInputId}Panel`;
            const paymentLabel = document.createElement("label");
            paymentLabel.className = "doc-history-convert__label";
            paymentLabel.setAttribute("for", paymentInputId);
            paymentLabel.textContent = "Date de paiement";
            const paymentPicker = document.createElement("div");
            paymentPicker.className = "swb-date-picker";
            paymentPicker.setAttribute("data-date-picker", "");
            paymentPicker.innerHTML = `
              <input
                id="${paymentInputId}"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-JJ"
                autocomplete="off"
                spellcheck="false"
                aria-haspopup="dialog"
                aria-expanded="false"
                role="combobox"
                aria-controls="${paymentPanelId}"
              >
              <button
                type="button"
                class="swb-date-picker__toggle"
                data-date-picker-toggle
                aria-label="Choisir une date"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="${paymentPanelId}"
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
                id="${paymentPanelId}"
              ></div>
            `;
            paymentField.append(paymentLabel, paymentPicker);
            const entryIdBase = `xmlRetFa-${startIdx + index}`;
            const cnpcValue = cnpcByPath.has(entry.path)
              ? cnpcByPath.get(entry.path)
              : normalizeBinaryFlag(entry?.cnpc ?? entry?.CNPC ?? defaultCnpc, defaultCnpc);
            const pChargeValue = pChargeByPath.has(entry.path)
              ? pChargeByPath.get(entry.path)
              : normalizeBinaryFlag(
                  entry?.pCharge ?? entry?.p_charge ?? entry?.P_Charge ?? defaultPCharge,
                  defaultPCharge
                );
            cnpcByPath.set(entry.path, cnpcValue);
            pChargeByPath.set(entry.path, pChargeValue);
            entry.cnpc = cnpcValue;
            entry.pCharge = pChargeValue;

            const cnpcField = createBinaryMenuGroup({
              idPrefix: `${entryIdBase}-cnpc`,
              labelText: "CNPC",
              selectedValue: cnpcValue,
              onChange(value) {
                cnpcByPath.set(entry.path, value);
                entry.cnpc = value;
              }
            });
            cnpcField.classList.add("xml-ret-fa-picker__binary");
            const pChargeField = createBinaryMenuGroup({
              idPrefix: `${entryIdBase}-pCharge`,
              labelText: "P_Charge",
              selectedValue: pChargeValue,
              onChange(value) {
                pChargeByPath.set(entry.path, value);
                entry.pCharge = value;
              }
            });
            pChargeField.classList.add("xml-ret-fa-picker__binary");
            const binaryRow = document.createElement("div");
            binaryRow.className = "xml-ret-fa-binary-row";
            binaryRow.append(cnpcField, pChargeField);
            const rateValue = parseNumberInput(
              entry?.rate ?? entry?.withholdingRate,
              defaultRate
            );
            const rateField = document.createElement("div");
            rateField.className = "doc-history-convert__field";
            rateField.classList.add("xml-ret-fa-picker__rate");
            const rateLabel = document.createElement("label");
            rateLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
            rateLabel.textContent = "Taux %";
            const rateInput = document.createElement("input");
            rateInput.id = `${entryIdBase}-rate`;
            rateInput.type = "number";
            rateInput.min = "0";
            rateInput.step = "0.01";
            rateInput.value = String(rateValue ?? "");
            rateLabel.setAttribute("for", rateInput.id);
            rateField.append(rateLabel, rateInput);
            entry.rate = rateValue;
            const amountField = document.createElement("div");
            amountField.className = "doc-history-convert__field";
            amountField.classList.add("xml-ret-fa-picker__amount");
            const amountLabel = document.createElement("label");
            amountLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
            amountLabel.textContent = "Montant RS";
            const amountInput = document.createElement("input");
            amountInput.id = `${entryIdBase}-amountRs`;
            amountInput.type = "text";
            amountInput.readOnly = true;
            amountLabel.setAttribute("for", amountInput.id);
            amountField.append(amountLabel, amountInput);
            const rateRow = document.createElement("div");
            rateRow.className = "xml-ret-fa-rate-row";
            rateRow.append(rateField, amountField);
            const inlineRow = document.createElement("div");
            inlineRow.className = "xml-ret-fa-inline-row";
            inlineRow.append(binaryRow, rateRow);
            const updateAmountValue = (rate) => {
              const resolvedRate = Number.isFinite(rate)
                ? rate
                : parseNumberInput(rateInput.value, defaultRate);
              const amount =
                Number.isFinite(totalTtcForAmount) && Number.isFinite(resolvedRate)
                  ? totalTtcForAmount * (resolvedRate / 100)
                  : null;
              amountInput.value = Number.isFinite(amount)
                ? formatMoneySafe(amount)
                : "--";
            };
            updateAmountValue(rateValue);
            rateInput.addEventListener("input", () => {
              const resolvedRate = parseNumberInput(rateInput.value, defaultRate);
              entry.rate = resolvedRate;
              updateAmountValue(resolvedRate);
            });
            rateInput.addEventListener("change", () => {
              const resolvedRate = parseNumberInput(rateInput.value, defaultRate);
              entry.rate = resolvedRate;
              updateAmountValue(resolvedRate);
            });

            const operationCategoryRaw = operationCategoryByPath.has(entry.path)
              ? operationCategoryByPath.get(entry.path)
              : entry?.operationCategory || "";
            const operationTypeRaw = operationTypeByPath.has(entry.path)
              ? operationTypeByPath.get(entry.path)
              : entry?.operationType || "";
            let operationCategoryValue =
              normalizeOperationCategory(operationCategoryRaw) ||
              resolveOperationCategoryFromType(operationTypeRaw) ||
              defaultOperationCategory ||
              "";
            let operationTypeValue = String(operationTypeRaw || "").trim() || defaultOperationType;
            let operationTypeOptions = buildOperationTypeOptions(operationCategoryValue);
            if (operationTypeOptions.length === 0) {
              operationTypeOptions = [
                {
                  value: operationTypeBaseDefault,
                  label: getOperationTypeLabel(operationTypeBaseDefault)
                }
              ];
            }
            if (!operationTypeOptions.some((opt) => opt.value === operationTypeValue)) {
              operationTypeValue = operationTypeOptions[0].value;
            }
            let operationTypeDefault = operationTypeOptions[0]?.value || operationTypeBaseDefault;
            operationCategoryByPath.set(entry.path, operationCategoryValue);
            operationTypeByPath.set(entry.path, operationTypeValue);
            entry.operationCategory = operationCategoryValue;
            entry.operationType = operationTypeValue;

            let operationTypeGroup = null;
            const handleOperationTypeChange = (value) => {
              const nextValue = String(value || "").trim();
              operationTypeValue = nextValue || operationTypeDefault;
              operationTypeByPath.set(entry.path, operationTypeValue);
              entry.operationType = operationTypeValue;
            };
            const handleOperationCategoryChange = (value) => {
              const nextCategory =
                normalizeOperationCategory(value) || operationCategoryOptions[0]?.value || "";
              operationCategoryValue = nextCategory;
              operationCategoryByPath.set(entry.path, nextCategory);
              entry.operationCategory = nextCategory;
              const nextOptions = buildOperationTypeOptions(nextCategory);
              const resolvedOptions =
                nextOptions.length > 0
                  ? nextOptions
                  : [
                      {
                        value: operationTypeBaseDefault,
                        label: getOperationTypeLabel(operationTypeBaseDefault)
                      }
                    ];
              operationTypeDefault = resolvedOptions[0]?.value || operationTypeBaseDefault;
              const nextType = resolvedOptions.some((opt) => opt.value === operationTypeValue)
                ? operationTypeValue
                : operationTypeDefault;
              operationTypeValue = nextType;
              operationTypeByPath.set(entry.path, nextType);
              entry.operationType = nextType;
              if (operationTypeGroup && typeof operationTypeGroup._setOptions === "function") {
                operationTypeGroup._setOptions(resolvedOptions, { selectedValue: nextType });
              } else if (
                operationTypeGroup &&
                typeof operationTypeGroup._setSelection === "function"
              ) {
                operationTypeGroup._setSelection(nextType, {
                  closeMenu: false,
                  notify: false
                });
              }
            };

            const operationCategoryGroup = createMenuGroup({
              idPrefix: `${entryIdBase}-operationCategory`,
              labelText: "Cat\u00E9gorie",
              placeholderText: operationCategoryOptions[0]?.label || "",
              options: operationCategoryOptions,
              selectedValue: operationCategoryValue,
              onChange: handleOperationCategoryChange
            });
            operationTypeGroup = createMenuGroup({
              idPrefix: `${entryIdBase}-operationType`,
              labelText: "Type d'operation",
              placeholderText: operationTypeOptions[0]?.label || operationTypeBaseDefault,
              options: operationTypeOptions,
              selectedValue: operationTypeValue,
              onChange: handleOperationTypeChange
            });
            const operationRow = document.createElement("div");
            operationRow.className = "doc-history-convert__row doc-history-convert__row--operation";
            operationRow.append(operationCategoryGroup, operationTypeGroup);
            headerRow.append(checkbox, title);
            details.append(
              headerRow,
              supplierLine,
              totalHtLine,
              totalLine,
              paymentField,
              inlineRow,
              operationRow
            );

            let paymentDateValue = "";
            if (paymentDateByPath.has(entry.path)) {
              paymentDateValue = paymentDateByPath.get(entry.path) || "";
            } else {
              paymentDateValue =
                normalizeDatePrefix(entry.createdAt || "") ||
                normalizeIsoDate(entry.date || "") ||
                todayIso;
              paymentDateByPath.set(entry.path, paymentDateValue);
            }
            entry.paymentDate = paymentDateValue;

            const paymentInput = paymentPicker.querySelector(`#${paymentInputId}`);
            if (paymentInput) {
              paymentInput.value = paymentDateValue;
              const updatePaymentDate = () => {
                const normalizedValue = normalizeIsoDate(paymentInput.value || "");
                const resolvedValue = normalizedValue || "";
                paymentDateByPath.set(entry.path, resolvedValue);
                entry.paymentDate = resolvedValue;
              };
              if (typeof createDatePicker === "function") {
                const picker = createDatePicker(paymentInput, {
                  allowManualInput: true,
                  onChange(value) {
                    const normalizedValue = normalizeIsoDate(value || "");
                    const resolvedValue = normalizedValue || "";
                    paymentDateByPath.set(entry.path, resolvedValue);
                    entry.paymentDate = resolvedValue;
                  }
                });
                if (picker && paymentDateValue) {
                  picker.setValue(paymentDateValue, { silent: true });
                }
              } else {
                paymentInput.readOnly = false;
              }
              paymentInput.addEventListener("input", updatePaymentDate);
              paymentInput.addEventListener("change", updatePaymentDate);
            }

            checkbox.addEventListener("change", () => {
              if (checkbox.checked) selectedPaths.add(entry.path);
              else selectedPaths.delete(entry.path);
              updateCount(filtered.length);
              updateOkState();
            });

            item.append(details);
            listPanel.appendChild(item);
          });

          updateCount(filtered.length);
          updateOkState();
        };

        const startInput = startPicker.querySelector(`#${startInputId}`);
        const endInput = endPicker.querySelector(`#${endInputId}`);
        const generationDateInput = generationDatePicker.querySelector(
          `#${generationDateInputId}`
        );
        const presetSelect = presetLabel.querySelector(`#${presetSelectId}`);
        const presetMenu = presetLabel.querySelector(`#${presetMenuId}`);
        const presetPanel = presetLabel.querySelector(`#${presetPanelId}`);
        const presetSummary = presetMenu?.querySelector("summary");
        const presetDisplay = presetLabel.querySelector(`#${presetDisplayId}`);
        if (startInput) startInput.value = startDateValue;
        if (endInput) endInput.value = endDateValue;
        if (generationDateInput) generationDateInput.value = generationDateValue;

        let startDatePicker = null;
        let endDatePicker = null;
        let generationDatePickerController = null;
        const setInputValue = (input, controller, value) => {
          if (controller && typeof controller.setValue === "function") {
            controller.setValue(value || "", { silent: true });
            return;
          }
          if (input) input.value = value || "";
        };
        const getPresetRange = (preset) => {
          const current = new Date();
          const year = current.getFullYear();
          const month = current.getMonth();
          if (preset === "today") {
            const today = toIsoDate(current);
            return { start: today, end: today };
          }
          if (preset === "this-month") {
            return {
              start: toIsoDate(new Date(year, month, 1)),
              end: toIsoDate(new Date(year, month + 1, 0))
            };
          }
          if (preset === "last-month") {
            return {
              start: toIsoDate(new Date(year, month - 1, 1)),
              end: toIsoDate(new Date(year, month, 0))
            };
          }
          if (preset === "this-year") {
            return {
              start: toIsoDate(new Date(year, 0, 1)),
              end: toIsoDate(new Date(year, 11, 31))
            };
          }
          if (preset === "last-year") {
            return {
              start: toIsoDate(new Date(year - 1, 0, 1)),
              end: toIsoDate(new Date(year - 1, 11, 31))
            };
          }
          return null;
        };
        const applyPreset = (presetValue) => {
          if (!presetValue || presetValue === "custom") return;
          const range = getPresetRange(presetValue);
          if (!range) return;
          setInputValue(startInput, startDatePicker, range.start);
          setInputValue(endInput, endDatePicker, range.end);
          startDateValue = range.start;
          endDateValue = range.end;
          selectedPaths.clear();
          page = 1;
          renderList();
        };
        const setPresetSelection = (value, { closeMenu = true, notify = true } = {}) => {
          const nextValue = value || "custom";
          if (presetSelect) presetSelect.value = nextValue;
          if (presetDisplay) {
            presetDisplay.textContent = presetLabelMap.get(nextValue) || "Par dates";
          }
          presetPanel?.querySelectorAll("[data-report-tax-preset]").forEach((btn) => {
            const isActive = btn.dataset.reportTaxPreset === nextValue;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          if (notify) applyPreset(nextValue);
          if (closeMenu && presetMenu && presetSummary) {
            presetMenu.open = false;
            presetSummary.setAttribute("aria-expanded", "false");
          }
        };
        const updateDateRange = () => {
          if (presetSelect && presetSelect.value !== "custom") {
            setPresetSelection("custom", { closeMenu: false, notify: false });
          }
          startDateValue = normalizeIsoDate(startInput?.value || "");
          endDateValue = normalizeIsoDate(endInput?.value || "");
          selectedPaths.clear();
          page = 1;
          renderList();
        };

        if (startInput) {
          if (typeof createDatePicker === "function") {
            startDatePicker = createDatePicker(startInput, {
              allowManualInput: true,
              onChange(value) {
                startDateValue = normalizeIsoDate(value || "");
                if (presetSelect && presetSelect.value !== "custom") {
                  setPresetSelection("custom", { closeMenu: false, notify: false });
                }
                selectedPaths.clear();
                page = 1;
                renderList();
              }
            });
            if (startDatePicker && startDateValue) {
              startDatePicker.setValue(startDateValue, { silent: true });
            }
          } else {
            startInput.readOnly = false;
          }
          startInput.addEventListener("input", updateDateRange);
          startInput.addEventListener("change", updateDateRange);
        }

        if (endInput) {
          if (typeof createDatePicker === "function") {
            endDatePicker = createDatePicker(endInput, {
              allowManualInput: true,
              onChange(value) {
                endDateValue = normalizeIsoDate(value || "");
                if (presetSelect && presetSelect.value !== "custom") {
                  setPresetSelection("custom", { closeMenu: false, notify: false });
                }
                selectedPaths.clear();
                page = 1;
                renderList();
              }
            });
            if (endDatePicker && endDateValue) {
              endDatePicker.setValue(endDateValue, { silent: true });
            }
          } else {
            endInput.readOnly = false;
          }
          endInput.addEventListener("input", updateDateRange);
          endInput.addEventListener("change", updateDateRange);
        }

        if (thresholdInput) {
          const updateThreshold = () => {
            thresholdValue = parseNumberInput(thresholdInput.value, null);
            selectedPaths.clear();
            page = 1;
            renderList();
          };
          thresholdInput.addEventListener("input", updateThreshold);
          thresholdInput.addEventListener("change", updateThreshold);
        }

        settingsBtn?.addEventListener("click", async () => {
          try {
            closeAllOpenMenus();
            const savedSettings = await openWithholdingFaSettingsModal(
              withholdingSettings,
              settingsBtn
            );
            if (!savedSettings) return;
            applyWithholdingSettingsToRows(savedSettings);
            if (thresholdInput) {
              thresholdInput.value = String(thresholdValue);
            }
            selectedPaths.clear();
            page = 1;
            renderList();
          } catch (err) {
            await showDialogSafe(
              String(err?.message || err || "Impossible de mettre a jour les parametres."),
              { title: "Retenue a la source" }
            );
          }
        });

        if (generationDateInput) {
          const updateGenerationDate = () => {
            generationDateValue = normalizeIsoDate(generationDateInput.value || "");
          };
          if (typeof createDatePicker === "function") {
            generationDatePickerController = createDatePicker(generationDateInput, {
              allowManualInput: true,
              onChange(value) {
                generationDateValue = normalizeIsoDate(value || "");
              }
            });
            if (generationDatePickerController && generationDateValue) {
              generationDatePickerController.setValue(generationDateValue, { silent: true });
            }
          } else {
            generationDateInput.readOnly = false;
          }
          generationDateInput.addEventListener("input", updateGenerationDate);
          generationDateInput.addEventListener("change", updateGenerationDate);
        }

        presetPanel?.addEventListener("click", (evt) => {
          const btn = evt.target.closest("[data-report-tax-preset]");
          if (!btn) return;
          setPresetSelection(btn.dataset.reportTaxPreset || "custom");
        });
        presetSummary?.addEventListener("click", (evt) => {
          evt.preventDefault();
          if (!presetMenu) return;
          const willOpen = !presetMenu.open;
          if (willOpen) closeAllOpenMenus(presetMenu);
          presetMenu.open = willOpen;
          presetSummary.setAttribute("aria-expanded", presetMenu.open ? "true" : "false");
          if (!presetMenu.open) presetSummary.focus();
        });
        presetMenu?.addEventListener("keydown", (evt) => {
          if (evt.key !== "Escape") return;
          evt.preventDefault();
          if (!presetMenu.open) return;
          presetMenu.open = false;
          presetSummary?.setAttribute("aria-expanded", "false");
          presetSummary?.focus();
        });
        const handlePresetOutsideClick = (evt) => {
          if (!presetMenu?.open) return;
          if (presetMenu.contains(evt.target) || presetPanel?.contains(evt.target)) return;
          presetMenu.open = false;
          presetSummary?.setAttribute("aria-expanded", "false");
        };
        document.addEventListener("click", handlePresetOutsideClick);
        registerCleanup(() => document.removeEventListener("click", handlePresetOutsideClick));
        if (presetSelect) {
          presetSelect.addEventListener("change", () => {
            setPresetSelection(presetSelect.value);
          });
        }
        setPresetSelection(presetSelect?.value || "custom", { closeMenu: false, notify: false });

        prevBtn.addEventListener("click", () => {
          if (page <= 1) return;
          page -= 1;
          renderList();
        });
        nextBtn.addEventListener("click", () => {
          page += 1;
          renderList();
        });

        renderList();
        wrapper.append(filters, statusRow, listWrap);
        container.append(wrapper);
      }
    });

    if (!confirmed) return [];
    const resolvedGenerationDate = normalizeIsoDate(generationDateValue || "");
    return Array.from(selectedPaths)
      .map((path) => entryByPath.get(path))
      .filter(Boolean)
      .map((entry) => {
        entry.generationDate = resolvedGenerationDate;
        entry.cnpc = cnpcByPath.get(entry.path) ?? entry.cnpc ?? 0;
        entry.pCharge = pChargeByPath.get(entry.path) ?? entry.pCharge ?? 0;
        entry.acteDepot = acteDepotValue;
        entry.operationCategory =
          operationCategoryByPath.get(entry.path) ?? entry.operationCategory ?? "";
        entry.operationType = operationTypeByPath.get(entry.path) ?? entry.operationType ?? "";
        entry.rate = parseNumberInput(entry.rate, withholdingSettings.rate);
        entry.threshold = parseNumberInput(thresholdValue, withholdingSettings.threshold);
        return entry;
      });
  };

  const exportWithholdingXmlForEntry = async (entry) => {
    if (typeof w.openInvoiceFromFilePicker !== "function") {
      return { ok: false, error: "Chargement du document indisponible." };
    }
    if (typeof w.exportWithholdingXml !== "function") {
      return { ok: false, error: "Export XML indisponible." };
    }

    const raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType: "fa" });
    if (!raw) return { ok: false, error: "Facture introuvable." };

    const snapshot = ensureSnapshotDefaults(cloneInvoiceData(raw));
    const meta = snapshot.meta || (snapshot.meta = {});
    if (!meta.docType) meta.docType = "fa";

    const resolvedGenerationDate =
      normalizeIsoDate(entry?.generationDate || meta.date || entry.date || "") ||
      new Date().toISOString().slice(0, 10);
    meta.date = resolvedGenerationDate;

    const paymentDate =
      normalizeIsoDate(entry?.paymentDate || "") ||
      normalizeIsoDate(meta.paymentDate || "") ||
      resolvedGenerationDate;

    const totalsFallback = buildTotalsFallback(entry, meta);
    const totalsSnapshot = computeTotalsForSnapshot(snapshot, totalsFallback) || totalsFallback;

    const rateValue = parseNumberInput(
      entry?.rate ?? meta?.withholding?.rate,
      1.5
    );
    const thresholdValue = parseNumberInput(
      entry?.threshold ?? meta?.withholding?.threshold,
      WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold
    );
    const operationType =
      String(
        entry?.operationType ||
        meta.operationType ||
        meta.operation_type ||
        meta.withholding?.operationType ||
        "RS7_000001"
      ).trim() || "RS7_000001";
    const operationCategory = String(
      entry?.operationCategory ||
        meta.operationCategory ||
        meta.operation_category ||
        meta.withholding?.operationCategory ||
        ""
    ).trim();
    const cnpc = normalizeBinaryFlag(entry?.cnpc ?? meta.cnpc ?? meta.CNPC ?? 0, 0);
    const pCharge = normalizeBinaryFlag(
      entry?.pCharge ??
        entry?.p_charge ??
        entry?.P_Charge ??
        meta.pCharge ??
        meta.p_charge ??
        meta.P_Charge ??
        0,
      0
    );
    meta.cnpc = cnpc;
    meta.pCharge = pCharge;
    meta.operationType = operationType;
    if (operationCategory) meta.operationCategory = operationCategory;
    const acteDepot = normalizeBinaryFlag(
      entry?.acteDepot ?? meta.acteDepot ?? meta.codeActe ?? meta.acte ?? 0,
      0
    );
    meta.acteDepot = acteDepot;
    const reference = meta.number || entry.number || "";

    const res = await w.exportWithholdingXml({
      state: snapshot,
      totals: totalsSnapshot,
      rate: rateValue,
      threshold: thresholdValue,
      reference,
      declarant: snapshot.company,
      beneficiary: snapshot.client,
      operationType,
      acteDepot,
      date: resolvedGenerationDate,
      generationDate: resolvedGenerationDate,
      depositDate: resolvedGenerationDate,
      paymentDate,
      cnpc,
      pCharge,
      docType: "fa",
      subDir: "retenues/factureAchat"
    });

    if (!res?.ok) {
      return { ok: false, error: res?.error || "Export XML impossible." };
    }
    return { ok: true, result: res };
  };

  const exportWithholdingXmlForEntries = async (entries) => {
    if (typeof w.openInvoiceFromFilePicker !== "function") {
      return { ok: false, error: "Chargement du document indisponible.", errors: [] };
    }
    if (typeof w.exportWithholdingXml !== "function") {
      return { ok: false, error: "Export XML indisponible.", errors: [] };
    }

    const errors = [];
    const groups = new Map();
    let baseState = null;
    let declarant = null;
    let resolvedGenerationDate = "";

    for (const entry of entries) {
      try {
        const raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType: "fa" });
        if (!raw) {
          errors.push({ entry, error: "Facture introuvable." });
          continue;
        }

        const snapshot = ensureSnapshotDefaults(cloneInvoiceData(raw));
        const meta = snapshot.meta || (snapshot.meta = {});
        if (!meta.docType) meta.docType = "fa";

        const generationDate =
          normalizeIsoDate(entry?.generationDate || "") ||
          normalizeIsoDate(meta.date || entry.date || "") ||
          new Date().toISOString().slice(0, 10);
        if (!resolvedGenerationDate) resolvedGenerationDate = generationDate;

        const paymentDate =
          normalizeIsoDate(entry?.paymentDate || "") ||
          normalizeIsoDate(meta.paymentDate || "") ||
          generationDate;

        const totalsFallback = buildTotalsFallback(entry, meta);
        const totalsSnapshot = computeTotalsForSnapshot(snapshot, totalsFallback) || totalsFallback;

        const rateValue = parseNumberInput(entry?.rate ?? meta?.withholding?.rate, 1.5);
        const thresholdValue = parseNumberInput(
          entry?.threshold ?? meta?.withholding?.threshold,
          WITHHOLDING_FA_SETTINGS_DEFAULTS.threshold
        );
        const operationType =
          String(
            entry?.operationType ||
              meta.operationType ||
              meta.operation_type ||
              meta.withholding?.operationType ||
              "RS7_000001"
          ).trim() || "RS7_000001";
        const cnpc = normalizeBinaryFlag(entry?.cnpc ?? meta.cnpc ?? meta.CNPC ?? 0, 0);
        const pCharge = normalizeBinaryFlag(
          entry?.pCharge ??
            entry?.p_charge ??
            entry?.P_Charge ??
            meta.pCharge ??
            meta.p_charge ??
            meta.P_Charge ??
            0,
          0
        );

        const beneficiary = snapshot.client || {};
        const beneficiaryKey = resolveBeneficiaryKey(beneficiary, entry);
        const groupKey = `${beneficiaryKey}::${paymentDate || "no-date"}`;
        const group = groups.get(groupKey) || {
          beneficiary,
          paymentDate,
          operations: [],
          references: []
        };
        const entryReference = String(meta.number || entry.number || entry.label || "").trim();
        if (entryReference) group.references.push(entryReference);
        group.operations.push({
          state: snapshot,
          totals: totalsSnapshot,
          rate: rateValue,
          threshold: thresholdValue,
          operationType,
          cnpc,
          pCharge,
          invoiceDate: meta.date || entry.date || ""
        });
        groups.set(groupKey, group);

        if (!baseState) baseState = snapshot;
        if (!declarant) declarant = snapshot.company || {};
      } catch (err) {
        errors.push({
          entry,
          error: String(err?.message || err || "Export XML impossible.")
        });
      }
    }

    if (!resolvedGenerationDate) {
      resolvedGenerationDate = new Date().toISOString().slice(0, 10);
    }

    if (!groups.size) {
      return {
        ok: false,
        error: errors[0]?.error || "Export XML impossible.",
        errors
      };
    }

    const usedReferences = new Set();
    const certificates = Array.from(groups.values()).map((group) => {
      const baseReference =
        group.references.find((value) => String(value || "").trim()) ||
        `RSFA-${resolvedGenerationDate.replace(/-/g, "")}`;
      let candidate = baseReference;
      let suffix = 1;
      while (usedReferences.has(candidate)) {
        suffix += 1;
        candidate = `${baseReference}-${suffix}`;
      }
      usedReferences.add(candidate);
      return {
        beneficiary: group.beneficiary,
        paymentDate: group.paymentDate || resolvedGenerationDate,
        reference: candidate,
        operations: group.operations
      };
    });

    const acteDepot = normalizeBinaryFlag(entries?.[0]?.acteDepot ?? 0, 0);
    const res = await w.exportWithholdingXml({
      state: baseState || {},
      declarant,
      certificates,
      acteDepot,
      date: resolvedGenerationDate,
      generationDate: resolvedGenerationDate,
      depositDate: resolvedGenerationDate,
      docType: "fa",
      subDir: "retenues/factureAchat"
    });

    if (!res?.ok) {
      return {
        ok: false,
        error: res?.error || "Export XML impossible.",
        errors
      };
    }
    return { ok: true, result: res, errors };
  };

  const generateXmlForEntries = async (entries) => {
    if (entries.length > 1) {
      const res = await exportWithholdingXmlForEntries(entries);
      const errorLines = (res.errors || [])
        .slice(0, 5)
        .map((item) => `- ${item.entry?.label || "Facture"}: ${item.error}`);
      const suffix = res.errors && res.errors.length > 5 ? "\n..." : "";
      if (res.ok && (!res.errors || res.errors.length === 0)) {
        await showDialogSafe("XML genere.", { title: "XML" });
        return;
      }
      if (res.ok && res.errors && res.errors.length > 0) {
        await showDialogSafe(
          `XML genere.\nFactures ignorees: ${res.errors.length}.\n${errorLines.join("\n")}${suffix}`,
          { title: "XML" }
        );
        return;
      }
      if (res.errors && res.errors.length > 0) {
        await showDialogSafe(
          `Aucun XML genere.\n${errorLines.join("\n")}${suffix}`,
          { title: "XML" }
        );
        return;
      }
      await showDialogSafe(res.error || "Export XML impossible.", { title: "XML" });
      return;
    }

    const errors = [];
    let successCount = 0;
    for (const entry of entries) {
      try {
        const res = await exportWithholdingXmlForEntry(entry);
        if (res.ok) {
          successCount += 1;
        } else {
          errors.push({ entry, error: res.error || "Export XML impossible." });
        }
      } catch (err) {
        errors.push({
          entry,
          error: String(err?.message || err || "Export XML impossible.")
        });
      }
    }

    if (successCount > 0 && errors.length === 0) {
      await showDialogSafe(`XML generes: ${successCount}.`, { title: "XML" });
      return;
    }
    if (successCount === 0 && errors.length > 0) {
      const lines = errors.slice(0, 5).map((item) =>
        `- ${item.entry?.label || "Facture"}: ${item.error}`
      );
      const suffix = errors.length > 5 ? "\n..." : "";
      await showDialogSafe(
        `Aucun XML genere.\n${lines.join("\n")}${suffix}`,
        { title: "XML" }
      );
      return;
    }
    if (errors.length > 0) {
      const lines = errors.slice(0, 5).map((item) =>
        `- ${item.entry?.label || "Facture"}: ${item.error}`
      );
      const suffix = errors.length > 5 ? "\n..." : "";
      await showDialogSafe(
        `XML generes: ${successCount}.\nErreurs: ${errors.length}.\n${lines.join("\n")}${suffix}`,
        { title: "XML" }
      );
    }
  };

  AppInit.registerWithholdingXmlFaActions = function registerWithholdingXmlFaActions() {
    const SEM = (w.SEM = w.SEM || {});
    if (SEM.__withholdingXmlFaBound) return;
    SEM.__withholdingXmlFaBound = true;

    const btn = getElSafe("btnGenerateXmlRetenueFA");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        const entries = await fetchFaEntries();
        const selected = await showFaSelectionDialog(entries);
        if (!selected.length) return;
        await generateXmlForEntries(selected);
      } catch (err) {
        console.error("generate withholding xml fa failed", err);
        await showDialogSafe(
          String(err?.message || err || "Export XML impossible."),
          { title: "XML" }
        );
      }
    });
  };
})(window);
