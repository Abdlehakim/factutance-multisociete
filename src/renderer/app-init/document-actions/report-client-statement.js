(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerClientStatementReportActions = function registerClientStatementReportActions() {
    const SEM = (w.SEM = w.SEM || {});
    if (SEM.__clientStatementReportBound) return;
    SEM.__clientStatementReportBound = true;

    const getElSafe =
      typeof getEl === "function"
        ? getEl
        : (id) => (typeof document !== "undefined" ? document.getElementById(id) : null);

    const normalizeIsoDate = (value) => {
      const raw = String(value || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
      const parsed = new Date(`${raw}T00:00:00`);
      if (!parsed || Number.isNaN(parsed.getTime())) return "";
      return raw;
    };

    const reportClientState = {
      overlay: null,
      closeBtn: null,
      closeFooterBtn: null,
      exportBtn: null,
      clientInput: null,
      clientField: null,
      clientPanel: null,
      startInput: null,
      endInput: null,
      presetSelect: null,
      presetMenu: null,
      presetPanel: null,
      presetSummary: null,
      presetDisplay: null,
      startPicker: null,
      endPicker: null,
      clientMap: new Map(),
      clientsLoaded: false,
      clientsLoading: false,
      isOpen: false,
      previousFocus: null,
      suppressClientInputOpenUntil: 0
    };
    const CLIENT_PANEL_REOPEN_SUPPRESS_MS = 200;
    const reportClientDetailState = {
      overlay: null,
      content: null,
      title: null,
      closeBtn: null,
      closeFooterBtn: null,
      exportBtn: null,
      printBtn: null,
      openFolderBtn: null,
      list: null,
      rangeLabel: null,
      clientLabel: null,
      totalDebitLabel: null,
      totalCreditLabel: null,
      finalBalanceLabel: null,
      lastExportPath: "",
      startDate: "",
      endDate: "",
      clientPath: "",
      clientName: "",
      isOpen: false,
      previousFocus: null,
      loading: false,
      error: "",
      entries: [],
      paymentHistoryById: new Map(),
      paymentHistoryByInvoicePath: new Map(),
      invoiceNumberByPaymentId: new Map(),
      invoiceNumberByPath: new Map()
    };

    const clientReportPresetOptions = [
      { value: "custom", label: "Par dates" },
      { value: "today", label: "Aujourd'hui" },
      { value: "this-month", label: "Ce mois" },
      { value: "last-month", label: "Mois dernier" },
      { value: "this-year", label: "Cette année" },
      { value: "last-year", label: "L'année dernière" }
    ];
    const getClientReportPresetOptionsFromSelect = (select) => {
      const seenValues = new Set();
      const options = [];
      Array.from(select?.options || []).forEach((option) => {
        const value = String(option?.value || "").trim();
        if (!value || seenValues.has(value)) return;
        seenValues.add(value);
        const label = String(option?.textContent || option?.label || value).trim() || value;
        options.push({ value, label });
      });
      return options.length ? options : clientReportPresetOptions.slice();
    };

    const getClientReportPresetLabelMap = () =>
      new Map(
        getClientReportPresetOptionsFromSelect(reportClientState.presetSelect).map((opt) => [
          opt.value,
          opt.label
        ])
      );

    const getClientReportDefaultPresetValue = (labelMap) => {
      if (labelMap?.has("custom")) return "custom";
      const first = labelMap?.keys?.().next?.();
      return first && !first.done ? first.value : "custom";
    };

    const rebuildClientReportPresetPanel = () => {
      const panel = reportClientState.presetPanel;
      if (!panel) return;
      const panelDoc = panel.ownerDocument || document;
      const options = getClientReportPresetOptionsFromSelect(reportClientState.presetSelect);
      const fragment = panelDoc.createDocumentFragment();
      options.forEach((opt) => {
        const btn = panelDoc.createElement("button");
        btn.type = "button";
        btn.className = "model-select-option";
        btn.dataset.reportClientPreset = opt.value;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", "false");
        btn.textContent = opt.label;
        fragment.appendChild(btn);
      });
      panel.replaceChildren(fragment);
    };

    const buildClientOptionLabel = (client) => {
      const name = String(client?.name || client?.client?.name || "").trim() || "Sans nom";
      const account = String(
        client?.account ||
          client?.accountOf ||
          client?.client?.account ||
          client?.client?.accountOf ||
          ""
      ).trim();
      return account ? `${name} (${account})` : name;
    };

    const normalizeClientSearchToken = (value) => {
      const base = String(value || "").trim().toLowerCase();
      if (!base) return "";
      try {
        return base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      } catch {
        return base;
      }
    };

    const truncateClientPanelLabel = (value, maxChars = 30) => {
      const text = String(value || "");
      if (!text || text.length <= maxChars) return text;
      return `${text.slice(0, maxChars)}...`;
    };

    const setClientReportClientPanelOpen = (open) => {
      const panel = reportClientState.clientPanel;
      const input = reportClientState.clientInput;
      if (!panel || !input) return;
      const shouldOpen = !!open;
      panel.hidden = !shouldOpen;
      panel.style.display = shouldOpen ? "flex" : "none";
      panel.classList.toggle("is-open", shouldOpen);
      input.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    };

    const listClientReportOptions = () => {
      const items = Array.from(reportClientState.clientMap.entries()).map(([label, info]) => ({
        label,
        path: String(info?.path || "").trim(),
        name: String(info?.name || "").trim()
      }));
      items.sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), undefined, {
          sensitivity: "base"
        })
      );
      return items;
    };

    const filterClientReportOptions = (query) => {
      const token = normalizeClientSearchToken(query);
      const options = listClientReportOptions();
      if (!token) return options;
      return options.filter((item) => {
        const labelToken = normalizeClientSearchToken(item.label);
        const nameToken = normalizeClientSearchToken(item.name);
        return labelToken.includes(token) || nameToken.includes(token);
      });
    };

    const rebuildClientReportClientPanel = (query) => {
      const panel = reportClientState.clientPanel;
      if (!panel) return;
      const panelDoc = panel.ownerDocument || document;
      const activeLabel = String(reportClientState.clientInput?.value || "").trim();
      panel.innerHTML = "";
      if (reportClientState.clientsLoading) {
        const loading = panelDoc.createElement("p");
        loading.className = "model-select-empty";
        loading.textContent = "Chargement...";
        panel.appendChild(loading);
        return;
      }
      const filtered = filterClientReportOptions(query);
      if (!filtered.length) {
        const empty = panelDoc.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = reportClientState.clientMap.size ? "Aucun client." : "Aucun client disponible.";
        panel.appendChild(empty);
        return;
      }
      const fragment = panelDoc.createDocumentFragment();
      filtered.forEach((item) => {
        const btn = panelDoc.createElement("button");
        btn.type = "button";
        btn.className = "model-select-option";
        btn.dataset.reportClientOption = item.label;
        btn.dataset.fullName = item.label;
        btn.setAttribute("role", "option");
        const isActive = item.label === activeLabel;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.title = item.label;
        btn.textContent = truncateClientPanelLabel(item.label, 30);
        fragment.appendChild(btn);
      });
      panel.appendChild(fragment);
    };

    const selectClientReportClient = (label, { closePanel = true } = {}) => {
      if (!reportClientState.clientInput) return;
      const value = String(label || "").trim();
      reportClientState.clientInput.value = value;
      rebuildClientReportClientPanel(value);
      if (closePanel) {
        reportClientState.suppressClientInputOpenUntil =
          Date.now() + CLIENT_PANEL_REOPEN_SUPPRESS_MS;
        setClientReportClientPanelOpen(false);
      }
      updateClientReportActions();
    };

    const updateClientReportActions = () => {
      const startRaw = String(reportClientState.startInput?.value || "").trim();
      const endRaw = String(reportClientState.endInput?.value || "").trim();
      const validStart = normalizeIsoDate(startRaw);
      const validEnd = normalizeIsoDate(endRaw);
      let message = "";
      if ((startRaw && !validStart) || (endRaw && !validEnd)) {
        message = "Format attendu: AAAA-MM-JJ.";
      } else if (validStart && validEnd && validStart > validEnd) {
        message = "La date de debut doit preceder la date de fin.";
      }
      if (reportClientState.hintEl) {
        reportClientState.hintEl.textContent = message;
        reportClientState.hintEl.hidden = !message;
      }
      const isValidRange = !!(validStart && validEnd && validStart <= validEnd);
      const canExport = isValidRange;
      if (reportClientState.exportBtn) {
        reportClientState.exportBtn.disabled = !canExport;
        reportClientState.exportBtn.setAttribute("aria-disabled", canExport ? "false" : "true");
      }
      return { startDate: validStart, endDate: validEnd, canExport };
    };

    const formatLedgerAmount = (value, precision = 3) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return "-";
      const scale = Math.pow(10, precision);
      const rounded = Math.round((num + Number.EPSILON) * scale) / scale;
      let text = rounded.toFixed(precision);
      text = text.replace(/\.?0+$/, "");
      return text;
    };

    const formatLedgerDate = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "-";
      if (raw.includes("T")) return raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return "-";
      const date = new Date(parsed);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const formatLedgerModeLabel = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return "-";
      if (raw === "cash") return "Esp\u00e8ces";
      if (raw === "cash_deposit") return "Versement Esp\u00e8ces";
      if (raw === "cheque") return "Ch\u00e8que";
      if (raw === "bill_of_exchange") return "Effet";
      if (raw === "transfer") return "Virement";
      if (raw === "card") return "Carte bancaire";
      if (raw === "withholding_tax") return "Retenue \u00e0 la source";
      if (raw === "sold_client") return "Solde client";
      if (raw === "bank") return "D\u00e9p\u00f4t bancaire";
      return value;
    };

    const buildLedgerPaymentIndexes = (items) => {
      const byId = new Map();
      const byInvoicePath = new Map();
      const invoiceNumberByPaymentId = new Map();
      const toTimestamp = (entry) => {
        const primary = String(entry?.savedAt || entry?.paymentDate || "");
        const parsed = Date.parse(primary);
        if (Number.isFinite(parsed)) return parsed;
        return 0;
      };
      (Array.isArray(items) ? items : []).forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const id = String(entry.id || "").trim();
        if (id) byId.set(id, entry);
        const invoiceNumber = String(entry.invoiceNumber || "").trim();
        if (id && invoiceNumber && !/^sqlite:\/\//i.test(invoiceNumber)) {
          invoiceNumberByPaymentId.set(id, invoiceNumber);
        }
        const invoicePath = String(entry.invoicePath || "").trim();
        if (!invoicePath) return;
        if (!byInvoicePath.has(invoicePath)) {
          byInvoicePath.set(invoicePath, entry);
          return;
        }
        const existing = byInvoicePath.get(invoicePath);
        if (toTimestamp(entry) >= toTimestamp(existing)) {
          byInvoicePath.set(invoicePath, entry);
        }
      });
      return { byId, byInvoicePath, invoiceNumberByPaymentId };
    };

    const buildLedgerInvoiceNumberIndex = () => {
      const index = new Map();
      if (typeof w.getDocumentHistoryFull !== "function") return index;
      const entries = w.getDocumentHistoryFull("facture") || [];
      entries.forEach((entry) => {
        const path = String(entry?.path || "").trim();
        const number = String(entry?.number || entry?.name || "").trim();
        const date = String(entry?.date || "").trim();
        const key = number && date ? `${number}__${date}` : "";
        if (path && number && !index.has(path)) {
          index.set(path, number);
        }
        if (key && !index.has(key)) {
          index.set(key, number);
        }
      });
      return index;
    };

    const resolveReportMenuScope = (details) => {
      if (!details) return null;
      const root = details.closest(".report-tax-date-range__controls, .doc-dialog-model-picker__field");
      if (!root) return null;
      return {
        root,
        details,
        panel: root.querySelector(".model-select-panel"),
        display: root.querySelector(".model-select-display"),
        select: root.querySelector("select"),
        summary: details.querySelector("summary")
      };
    };

    const toIsoDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getClientReportPresetRange = (preset) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      if (preset === "today") {
        const today = toIsoDate(now);
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

    const setClientReportInputValue = (input, controller, value) => {
      if (controller && typeof controller.setValue === "function") {
        controller.setValue(value || "", { silent: true });
        return;
      }
      if (input) input.value = value || "";
    };

    const setClientReportFieldsEnabled = (enabled) => {
      const isEnabled = !!enabled;
      [reportClientState.startInput, reportClientState.endInput].forEach((input) => {
        if (!input) return;
        input.disabled = !isEnabled;
        input.setAttribute("aria-disabled", !isEnabled ? "true" : "false");
      });
      reportClientState.overlay
        ?.querySelectorAll(".swb-date-picker__toggle")
        .forEach((btn) => {
          btn.disabled = !isEnabled;
          btn.setAttribute("aria-disabled", !isEnabled ? "true" : "false");
        });
      if (!isEnabled) {
        reportClientState.startPicker?.close?.();
        reportClientState.endPicker?.close?.();
      }
    };

    const applyClientReportPreset = () => {
      const presetLabelMap = getClientReportPresetLabelMap();
      const fallbackPreset = getClientReportDefaultPresetValue(presetLabelMap);
      const rawPreset = String(reportClientState.presetSelect?.value || fallbackPreset).trim();
      const preset = presetLabelMap.has(rawPreset) ? rawPreset : fallbackPreset;
      if (reportClientState.presetSelect && reportClientState.presetSelect.value !== preset) {
        reportClientState.presetSelect.value = preset;
      }
      if (preset === "custom") {
        setClientReportFieldsEnabled(true);
        updateClientReportActions();
        return;
      }
      const range = getClientReportPresetRange(preset);
      if (range) {
        setClientReportInputValue(
          reportClientState.startInput,
          reportClientState.startPicker,
          range.start
        );
        setClientReportInputValue(
          reportClientState.endInput,
          reportClientState.endPicker,
          range.end
        );
      }
      setClientReportFieldsEnabled(false);
      updateClientReportActions();
    };

    const setClientReportPresetSelection = (
      value,
      { closeMenu = true, notify = true, menuScope = null } = {}
    ) => {
      rebuildClientReportPresetPanel();
      const presetLabelMap = getClientReportPresetLabelMap();
      const fallbackPreset = getClientReportDefaultPresetValue(presetLabelMap);
      const scope = menuScope || resolveReportMenuScope(reportClientState.presetMenu);
      const requestedValue = value !== undefined ? String(value || "").trim() : "";
      const nextValue = presetLabelMap.has(requestedValue)
        ? requestedValue
        : fallbackPreset;
      if (scope?.select) scope.select.value = nextValue;
      if (reportClientState.presetSelect) {
        reportClientState.presetSelect.value = nextValue;
      }
      const display = scope?.display || reportClientState.presetDisplay;
      if (display) {
        display.textContent = presetLabelMap.get(nextValue) || "Par dates";
      }
      const panel = scope?.panel || reportClientState.presetPanel;
      panel
        ?.querySelectorAll("[data-report-client-preset]")
        .forEach((btn) => {
          const isActive = btn.dataset.reportClientPreset === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      if (notify) applyClientReportPreset();
      if (closeMenu && scope?.details && scope?.summary) {
        scope.details.open = false;
        scope.summary.setAttribute("aria-expanded", "false");
      }
    };

    const loadClientReportOptions = async () => {
      if (reportClientState.clientsLoading || reportClientState.clientsLoaded) return;
      reportClientState.clientsLoading = true;
      rebuildClientReportClientPanel(reportClientState.clientInput?.value || "");
      if (!w.electronAPI?.searchClients) {
        reportClientState.clientMap = new Map();
        reportClientState.clientsLoaded = true;
        reportClientState.clientsLoading = false;
        rebuildClientReportClientPanel(reportClientState.clientInput?.value || "");
        return;
      }
      const items = [];
      const limit = 200;
      let offset = 0;
      let total = null;
      try {
        while (true) {
          const res = await w.electronAPI.searchClients({
            query: "",
            limit,
            offset,
            entityType: "client"
          });
          if (!res?.ok) break;
          const results = Array.isArray(res.results) ? res.results : [];
          items.push(...results);
          const resTotal = Number(res.total);
          if (Number.isFinite(resTotal)) total = resTotal;
          offset += results.length;
          if (results.length < limit) break;
          if (total !== null && offset >= total) break;
        }
      } catch (err) {
        console.warn("client report list failed", err);
      }
      const optionMap = new Map();
      items.forEach((item) => {
        const label = buildClientOptionLabel(item);
        if (!label || optionMap.has(label)) return;
        const path = String(item?.path || item?.client?.__path || "").trim();
        optionMap.set(label, { path, name: item?.name || "" });
      });
      reportClientState.clientMap = optionMap;
      reportClientState.clientsLoaded = true;
      reportClientState.clientsLoading = false;
      rebuildClientReportClientPanel(reportClientState.clientInput?.value || "");
    };

    const closeClientReportModal = () => {
      if (!reportClientState.overlay || !reportClientState.isOpen) return;
      setClientReportClientPanelOpen(false);
      reportClientState.overlay.classList.remove("is-open");
      reportClientState.overlay.hidden = true;
      reportClientState.overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onClientReportKeyDown);
      if (reportClientState.previousFocus && typeof reportClientState.previousFocus.focus === "function") {
        try {
          reportClientState.previousFocus.focus();
        } catch {}
      }
      reportClientState.previousFocus = null;
      reportClientState.isOpen = false;
    };

    const onClientReportKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeClientReportModal();
      }
    };

    const showClientReportMessage = async (message) => {
      const text = String(message || "");
      if (!text) return;
      if (typeof w.showToast === "function") {
        w.showToast(text);
        return;
      }
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title: "Relev\u00e9 clients" });
        return;
      }
      if (typeof window.alert === "function") window.alert(text);
    };

    const showClientStatementDetailDialog = async (message, title) => {
      const text = String(message || "");
      if (!text) return;
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title: title || "Relevé clients" });
        return;
      }
      if (typeof w.alert === "function") w.alert(text);
    };

    const showClientStatementDetailToast = (message) => {
      if (typeof w.showToast !== "function") return;
      w.showToast(String(message || ""));
    };

    const updateClientStatementDetailActions = () => {
      const canUse = !reportClientDetailState.loading && !reportClientDetailState.error;
      [reportClientDetailState.exportBtn, reportClientDetailState.printBtn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = !canUse;
        btn.setAttribute("aria-disabled", canUse ? "false" : "true");
      });
      if (reportClientDetailState.openFolderBtn) {
        const canOpen = !!reportClientDetailState.lastExportPath;
        reportClientDetailState.openFolderBtn.disabled = !canOpen;
        reportClientDetailState.openFolderBtn.setAttribute(
          "aria-disabled",
          canOpen ? "false" : "true"
        );
      }
    };

    const readCssVarValue = (name, fallback = "") => {
      if (!name || typeof document === "undefined") return fallback;
      try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
        const value = String(raw || "").trim();
        return value || fallback;
      } catch {
        return fallback;
      }
    };

    const getCssTextFromStylesheet = (needle) => {
      if (!needle || typeof document === "undefined") return "";
      try {
        const sheets = Array.from(document.styleSheets || []);
        const sheet = sheets.find((s) => typeof s?.href === "string" && s.href.includes(needle));
        if (!sheet || !sheet.cssRules) return "";
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    };

    const buildClientStatementDetailCss = () => {
      const assets = w.electronAPI?.assets || {};
      const pdfCss =
        (w.PDFView && typeof w.PDFView.css === "string" && w.PDFView.css) ||
        (typeof assets.pdfCss === "string" ? assets.pdfCss : "") ||
        getCssTextFromStylesheet("pdf-view.css");
      const tableCss = getCssTextFromStylesheet("table-and-totals.css");
      const reportCss = getCssTextFromStylesheet("report-tax.css");
      const primary = readCssVarValue("--primary", "#1d4ed8");
      const itemsHead = readCssVarValue("--items-head-bg", primary || "#1d4ed8");
      const rootVars = `:root{--primary:${primary};--items-head-bg:${itemsHead};}`;
      return [rootVars, pdfCss, tableCss, reportCss].filter(Boolean).join("\n");
    };

    const buildClientStatementDetailHtmlSnapshot = () =>
      String(reportClientDetailState.content?.innerHTML || "").trim();

    const resolveClientStatementPdfDir = async () => {
      if (!w.electronAPI?.getClientStatementPdfDir) return "";
      try {
        const res = await w.electronAPI.getClientStatementPdfDir();
        if (res?.ok && res.path) return res.path;
      } catch (err) {
        console.warn("client statement dir resolve failed", err);
      }
      return "";
    };

    const resolveExportPdfName = (res, fallbackName) => {
      let name = "";
      if (res && typeof res.name === "string") name = res.name.trim();
      if (!name && res && typeof res.path === "string") {
        const parts = res.path.split(/[\\/]/);
        name = parts[parts.length - 1] || "";
      }
      if (!name && fallbackName) name = String(fallbackName).trim();
      if (name && !name.toLowerCase().endsWith(".pdf")) name = `${name}.pdf`;
      return name;
    };

    const buildClientStatementFilename = (startDate, endDate, index) => {
      const fallback = new Date().toISOString().slice(0, 10);
      const start = normalizeIsoDate(startDate) || fallback;
      const end = normalizeIsoDate(endDate) || start;
      const rawName = String(reportClientDetailState.clientName || "")
        .trim()
        .toLowerCase();
      const safeName = rawName
        .normalize?.("NFD")
        ?.replace(/[\u0300-\u036f]/g, "")
        ?.replace(/[^a-z0-9]+/g, "-")
        ?.replace(/^-+|-+$/g, "")
        ?.slice(0, 24);
      const clientPart = safeName || "client";
      const safeIndex =
        Number.isFinite(Number(index)) && Number(index) > 0 ? Math.floor(Number(index)) : 1;
      return `RPCL-${clientPart}-${start}-${end}-${safeIndex}`;
    };

    const exportClientStatementDetailPdf = async () => {
      if (reportClientDetailState.loading) return;
      if (reportClientDetailState.error) {
        await showClientStatementDetailDialog(reportClientDetailState.error, "Export PDF");
        return;
      }
      if (!w.electronAPI?.exportPDFFromHTML) {
        await showClientStatementDetailDialog("Export PDF indisponible.", "Export PDF");
        return;
      }
      const html = buildClientStatementDetailHtmlSnapshot();
      if (!html) {
        await showClientStatementDetailDialog("Aucune donnée à exporter.", "Export PDF");
        return;
      }
      const saveDir = await resolveClientStatementPdfDir();
      if (!saveDir) {
        await showClientStatementDetailDialog(
          "Impossible de préparer le dossier d'export.",
          "Export PDF"
        );
        return;
      }
      const css = buildClientStatementDetailCss();
      let index = 1;
      let res = null;
      while (index <= 999) {
        const filename = buildClientStatementFilename(
          reportClientDetailState.startDate,
          reportClientDetailState.endDate,
          index
        );
        try {
          res = await w.electronAPI.exportPDFFromHTML({
            html,
            css,
            meta: {
              filename,
              silent: true,
              saveDir,
              docType: "rapportclient"
            }
          });
        } catch (err) {
          res = { ok: false, error: String(err?.message || err) };
        }
        if (res?.ok) {
          reportClientDetailState.lastExportPath = res.path || "";
          updateClientStatementDetailActions();
          const displayName = resolveExportPdfName(res, filename);
          if (displayName) {
            showClientStatementDetailToast(`Rapport PDF créé : ${displayName}`);
          } else {
            showClientStatementDetailToast("Rapport PDF créé.");
          }
          return;
        }
        if (res?.reason === "exists") {
          index += 1;
          continue;
        }
        if (res?.canceled) return;
        await showClientStatementDetailDialog(
          res?.error || "Impossible d'exporter le rapport.",
          "Export PDF"
        );
        return;
      }
      await showClientStatementDetailDialog(
        "Trop de rapports existent déjà pour cette période.",
        "Export PDF"
      );
    };

    const resolveDirFromPath = (filePath) => {
      const raw = String(filePath || "").trim();
      if (!raw) return "";
      const separator = raw.includes("\\") ? "\\" : "/";
      const parts = raw.split(/[\\/]/);
      parts.pop();
      return parts.join(separator);
    };

    const openClientStatementDetailFolder = async () => {
      const filePath = reportClientDetailState.lastExportPath || "";
      if (!filePath) return;
      if (w.electronAPI?.showInFolder) {
        try {
          const ok = await w.electronAPI.showInFolder(filePath);
          if (ok) return;
        } catch (err) {
          console.warn("showInFolder failed", err);
        }
      }
      if (w.electronAPI?.openPath) {
        const dir = resolveDirFromPath(filePath);
        if (dir) {
          try {
            const ok = await w.electronAPI.openPath(dir);
            if (ok) return;
          } catch (err) {
            console.warn("openPath failed", err);
          }
        }
      }
      await showClientStatementDetailDialog(
        "Impossible d'ouvrir l'emplacement du rapport.",
        "Dossier PDF"
      );
    };

    const printClientStatementDetail = async () => {
      if (reportClientDetailState.loading) return;
      if (reportClientDetailState.error) {
        await showClientStatementDetailDialog(reportClientDetailState.error, "Impression");
        return;
      }
      if (!w.electronAPI?.printHTML) {
        await showClientStatementDetailDialog("Impression indisponible.", "Impression");
        return;
      }
      const html = buildClientStatementDetailHtmlSnapshot();
      if (!html) {
        await showClientStatementDetailDialog("Aucune donnée à imprimer.", "Impression");
        return;
      }
      const css = buildClientStatementDetailCss();
      try {
        const res = await w.electronAPI.printHTML({
          html,
          css,
          print: { silent: false, printBackground: true }
        });
        if (res?.ok) return;
        await showClientStatementDetailDialog(
          res?.error || "Impossible d'imprimer le rapport.",
          "Impression"
        );
      } catch (err) {
        await showClientStatementDetailDialog(
          String(err?.message || err || "Impossible d'imprimer le rapport."),
          "Impression"
        );
      }
    };

    const closeClientStatementDetailModal = () => {
      if (!reportClientDetailState.overlay || !reportClientDetailState.isOpen) return;
      reportClientDetailState.overlay.classList.remove("is-open");
      reportClientDetailState.overlay.hidden = true;
      reportClientDetailState.overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onClientStatementDetailKeyDown);
      if (
        reportClientDetailState.previousFocus &&
        typeof reportClientDetailState.previousFocus.focus === "function"
      ) {
        try {
          reportClientDetailState.previousFocus.focus();
        } catch {}
      }
      reportClientDetailState.previousFocus = null;
      reportClientDetailState.isOpen = false;
    };

    const onClientStatementDetailKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeClientStatementDetailModal();
      }
    };

    const setClientStatementSummary = ({ debit = null, credit = null, balance = null } = {}) => {
      if (reportClientDetailState.totalDebitLabel) {
        reportClientDetailState.totalDebitLabel.textContent =
          debit === null ? "-" : formatLedgerAmount(debit);
      }
      if (reportClientDetailState.totalCreditLabel) {
        reportClientDetailState.totalCreditLabel.textContent =
          credit === null ? "-" : formatLedgerAmount(credit);
      }
      if (reportClientDetailState.finalBalanceLabel) {
        reportClientDetailState.finalBalanceLabel.textContent =
          balance === null ? "-" : formatLedgerAmount(balance);
      }
    };

    const renderClientStatementDetailRows = () => {
      if (!reportClientDetailState.list) {
        updateClientStatementDetailActions();
        return;
      }
      reportClientDetailState.list.innerHTML = "";
      if (reportClientDetailState.loading) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "Chargement...";
        row.appendChild(cell);
        reportClientDetailState.list.appendChild(row);
        setClientStatementSummary({ debit: null, credit: null, balance: null });
        updateClientStatementDetailActions();
        return;
      }
      if (reportClientDetailState.error) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = reportClientDetailState.error;
        row.appendChild(cell);
        reportClientDetailState.list.appendChild(row);
        setClientStatementSummary({ debit: null, credit: null, balance: null });
        updateClientStatementDetailActions();
        return;
      }
      const entries = Array.isArray(reportClientDetailState.entries)
        ? reportClientDetailState.entries.slice()
        : [];
      if (!entries.length) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "Aucune operation.";
        row.appendChild(cell);
        reportClientDetailState.list.appendChild(row);
        setClientStatementSummary({ debit: 0, credit: 0, balance: 0 });
        updateClientStatementDetailActions();
        return;
      }
      const resolveSortTime = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return NaN;
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          return Date.parse(`${raw}T00:00:00.000Z`);
        }
        return Date.parse(raw);
      };
      entries.sort((a, b) => {
        const aEffectiveDate = resolveSortTime(a?.effectiveDate || a?.createdAt || "");
        const bEffectiveDate = resolveSortTime(b?.effectiveDate || b?.createdAt || "");
        const aEffectiveValid = Number.isFinite(aEffectiveDate);
        const bEffectiveValid = Number.isFinite(bEffectiveDate);
        if (aEffectiveValid && bEffectiveValid && aEffectiveDate !== bEffectiveDate) {
          return aEffectiveDate - bEffectiveDate;
        }
        if (aEffectiveValid && !bEffectiveValid) return -1;
        if (!aEffectiveValid && bEffectiveValid) return 1;
        const aCreatedAt = resolveSortTime(a?.createdAt || "");
        const bCreatedAt = resolveSortTime(b?.createdAt || "");
        const aCreatedValid = Number.isFinite(aCreatedAt);
        const bCreatedValid = Number.isFinite(bCreatedAt);
        if (aCreatedValid && bCreatedValid && aCreatedAt !== bCreatedAt) {
          return aCreatedAt - bCreatedAt;
        }
        if (aCreatedValid && !bCreatedValid) return -1;
        if (!aCreatedValid && bCreatedValid) return 1;
        const aRowid = Number(a?.rowid);
        const bRowid = Number(b?.rowid);
        if (Number.isFinite(aRowid) && Number.isFinite(bRowid) && aRowid !== bRowid) {
          return aRowid - bRowid;
        }
        const aId = String(a?.id || "").trim();
        const bId = String(b?.id || "").trim();
        if (aId !== bId) return aId.localeCompare(bId);
        return 0;
      });
      const fragment = document.createDocumentFragment();
      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;
      entries.forEach((entry) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.className = "payment-history__align-left";
        dateCell.textContent = formatLedgerDate(entry.effectiveDate || entry.createdAt);

        const sourceCell = document.createElement("td");
        sourceCell.className = "payment-history__align-center";
        const sourceType = String(entry?.source || "").trim().toLowerCase();
        const sourceId = String(entry?.sourceId || "").trim();
        const entryInvoicePath = String(entry?.invoicePath || "").trim();
        const resolvedSourceId =
          sourceType === "payment" ? sourceId : sourceId || entryInvoicePath;
        const entryInvoiceNumber = String(entry?.invoiceNumber || "").trim();
        const historyEntry =
          sourceType === "payment"
            ? reportClientDetailState.paymentHistoryById.get(resolvedSourceId)
            : sourceType === "invoice_payment"
              ? reportClientDetailState.paymentHistoryById.get(resolvedSourceId) ||
                reportClientDetailState.paymentHistoryByInvoicePath.get(resolvedSourceId)
              : sourceType === "invoice" || sourceType === "invoice_unpaid"
              ? reportClientDetailState.paymentHistoryByInvoicePath.get(resolvedSourceId)
              : null;
        let facture = "";
        if (sourceType === "payment" || sourceType === "invoice_payment") {
          const historyInvoicePath = String(historyEntry?.invoicePath || "").trim();
          facture =
            String(reportClientDetailState.invoiceNumberByPaymentId.get(sourceId) || "").trim() ||
            String(historyEntry?.invoiceNumber || "").trim() ||
            String(reportClientDetailState.invoiceNumberByPath.get(sourceId) || "").trim() ||
            String(reportClientDetailState.invoiceNumberByPath.get(historyInvoicePath) || "").trim();
        } else {
          facture =
            entryInvoiceNumber ||
            String(historyEntry?.invoiceNumber || "").trim() ||
            String(reportClientDetailState.invoiceNumberByPath.get(sourceId) || "").trim() ||
            String(reportClientDetailState.invoiceNumberByPath.get(entryInvoicePath) || "").trim();
        }
        if (/^sqlite:\/\//i.test(facture)) facture = "";
        sourceCell.textContent = facture;

        const modeCell = document.createElement("td");
        let modeValue = "";
        if (sourceType === "payment") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice_payment") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice_unpaid") {
          modeValue = "";
        }
        modeCell.textContent = modeValue ? formatLedgerModeLabel(modeValue) : "";

        const paymentRefCell = document.createElement("td");
        paymentRefCell.className = "payment-history__align-center";
        let paymentRefLabel = "";
        if (
          sourceType === "payment" ||
          sourceType === "invoice_payment" ||
          sourceType === "invoice"
        ) {
          paymentRefLabel = String(
            historyEntry?.paymentRef || historyEntry?.paymentReference || ""
          ).trim();
        }
        paymentRefCell.textContent = paymentRefLabel;

        const amountValue = Number(entry?.amount);
        const typeValue = String(entry?.type || "").trim().toLowerCase();
        let debitValue = 0;
        let creditValue = 0;
        if (typeValue === "credit" && Number.isFinite(amountValue)) {
          creditValue = amountValue;
          totalCredit += amountValue;
        } else if (typeValue === "debit" && Number.isFinite(amountValue)) {
          debitValue = amountValue;
          totalDebit += amountValue;
        }
        const deltaValue = creditValue - debitValue;
        if (Number.isFinite(deltaValue)) {
          runningBalance += deltaValue;
        }

        const debitCell = document.createElement("td");
        debitCell.className = "num right";
        debitCell.textContent =
          typeValue === "debit" && Number.isFinite(debitValue)
            ? formatLedgerAmount(debitValue)
            : "-";

        const creditCell = document.createElement("td");
        creditCell.className = "num right";
        creditCell.textContent =
          typeValue === "credit" && Number.isFinite(creditValue)
            ? formatLedgerAmount(creditValue)
            : "-";

        const balanceCell = document.createElement("td");
        balanceCell.className = "num right";
        balanceCell.textContent = formatLedgerAmount(runningBalance);

        row.append(
          dateCell,
          sourceCell,
          paymentRefCell,
          modeCell,
          debitCell,
          creditCell,
          balanceCell
        );
        fragment.appendChild(row);
      });
      reportClientDetailState.list.appendChild(fragment);
      setClientStatementSummary({
        debit: totalDebit,
        credit: totalCredit,
        balance: runningBalance
      });
      updateClientStatementDetailActions();
    };

    const ensureClientStatementDetailModal = () => {
      if (reportClientDetailState.overlay) return reportClientDetailState.overlay;
      const overlay = document.createElement("div");
      overlay.id = "clientStatementDetailModal";
      overlay.className = "swbDialog doc-history-modal report-tax-modal";
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `
        <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel report-tax-modal__panel" role="dialog" aria-modal="true" aria-labelledby="clientStatementDetailTitle">
          <div class="swbDialog__header">
            <div id="clientStatementDetailTitle" class="swbDialog__title">Relev\u00e9 clients</div>
            <button id="clientStatementDetailClose" type="button" class="swbDialog__close" aria-label="Fermer">
              <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="pdf-preview-modal__body report-tax-modal__body swbDialog__msg">
            <div id="clientStatementDetailContent" class="pdf-preview-modal__content report-tax-modal__content">
              <div class="pdf-preview-root report-tax-preview__root">
                <div class="pdf-page report-tax-preview__page">
                  <div class="report-tax-preview__heading">
                    <h1 class="pdf-title report-tax-preview__title">Relev\u00e9 client</h1>
                  </div>
                  <div class="pdf-divider"></div>
                  <div class="pdf-grid-2 report-tax-preview__meta">
                    <div class="report-tax-preview__company">
                      <p class="pdf-small pdf-meta-line">
                        <span class="pdf-meta-label">Client :</span>
                        <span id="clientStatementDetailClient" class="pdf-meta-value">-</span>
                      </p>
                    </div>
                  <div class="report-tax-preview__period">
                    <p class="pdf-small pdf-meta-line">
                      <span class="pdf-meta-label">Periode :</span>
                      <span id="clientStatementDetailRange" class="pdf-meta-value">-</span>
                    </p>
                    <div class="tva-breakdown client-statement-summary-wrap">
                      <table class="tva-breakdown__table client-statement-summary">
                        <thead>
                          <tr>
                            <th>Total D\u00e9bit</th>
                            <th>Total Cr\u00e9dit</th>
                            <th>Solde final</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td id="clientStatementDetailTotalDebit">-</td>
                            <td id="clientStatementDetailTotalCredit">-</td>
                            <td id="clientStatementDetailFinalBalance">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                  <div class="report-tax-preview__table">
                    <div class="tva-breakdown" id="clientStatementDetailTable">
                      <table class="tva-breakdown__table payments-history__table client-ledger__table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Facture</th>
                            <th>R\u00e9f. paiement</th>
                            <th>M.paiement</th>
                            <th>D\u00e9bit</th>
                            <th>Cr\u00e9dit</th>
                            <th>Solde</th>
                          </tr>
                        </thead>
                        <tbody id="clientStatementDetailList"></tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="pdf-preview-modal__actions report-tax-modal__actions">
            <div class="pdf-preview-modal__buttons report-tax-modal__buttons">
              <button id="clientStatementDetailCloseFooter" type="button" class="client-search__edit">Fermer</button>
              <button id="clientStatementDetailPrint" type="button" class="client-search__addSTK" disabled aria-disabled="true">Imprimer Rapport</button>
              <button id="clientStatementDetailExport" type="button" class="client-search__edit" disabled aria-disabled="true">Exporter PDF</button>
              <button id="clientStatementDetailOpenFolder" type="button" class="client-search__edit doc-history__open-folder" title="Ouvrir le dossier PDF" aria-label="Ouvrir le dossier PDF" disabled aria-disabled="true">
                <span class="doc-history__folder-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      reportClientDetailState.overlay = overlay;
      reportClientDetailState.content = overlay.querySelector("#clientStatementDetailContent");
      reportClientDetailState.title = overlay.querySelector("#clientStatementDetailTitle");
      reportClientDetailState.closeBtn = overlay.querySelector("#clientStatementDetailClose");
      reportClientDetailState.closeFooterBtn = overlay.querySelector("#clientStatementDetailCloseFooter");
      reportClientDetailState.exportBtn = overlay.querySelector("#clientStatementDetailExport");
      reportClientDetailState.printBtn = overlay.querySelector("#clientStatementDetailPrint");
      reportClientDetailState.openFolderBtn = overlay.querySelector("#clientStatementDetailOpenFolder");
      reportClientDetailState.list = overlay.querySelector("#clientStatementDetailList");
      reportClientDetailState.rangeLabel = overlay.querySelector("#clientStatementDetailRange");
      reportClientDetailState.clientLabel = overlay.querySelector("#clientStatementDetailClient");
      reportClientDetailState.totalDebitLabel = overlay.querySelector("#clientStatementDetailTotalDebit");
      reportClientDetailState.totalCreditLabel = overlay.querySelector("#clientStatementDetailTotalCredit");
      reportClientDetailState.finalBalanceLabel = overlay.querySelector("#clientStatementDetailFinalBalance");

      reportClientDetailState.closeBtn?.addEventListener("click", closeClientStatementDetailModal);
      reportClientDetailState.closeFooterBtn?.addEventListener("click", closeClientStatementDetailModal);
      reportClientDetailState.exportBtn?.addEventListener("click", exportClientStatementDetailPdf);
      reportClientDetailState.printBtn?.addEventListener("click", printClientStatementDetail);
      reportClientDetailState.openFolderBtn?.addEventListener("click", openClientStatementDetailFolder);
      overlay.addEventListener("click", (evt) => {
        if (evt.target === overlay) closeClientStatementDetailModal();
      });
      updateClientStatementDetailActions();

      return overlay;
    };

    const loadClientStatementDetail = async ({ clientLabel, clientPath, startDate, endDate }) => {
      ensureClientStatementDetailModal();
      reportClientDetailState.clientName = String(clientLabel || "").trim();
      reportClientDetailState.clientPath = String(clientPath || "").trim();
      reportClientDetailState.startDate = normalizeIsoDate(startDate);
      reportClientDetailState.endDate = normalizeIsoDate(endDate);
      reportClientDetailState.lastExportPath = "";
      reportClientDetailState.loading = true;
      reportClientDetailState.error = "";
      reportClientDetailState.entries = [];
      updateClientStatementDetailActions();
      renderClientStatementDetailRows();

      if (reportClientDetailState.title) {
        reportClientDetailState.title.textContent = "Relev\u00e9 clients";
      }
      if (reportClientDetailState.clientLabel) {
        reportClientDetailState.clientLabel.textContent = reportClientDetailState.clientName || "-";
      }
      if (reportClientDetailState.rangeLabel) {
        const rangeText =
          reportClientDetailState.startDate && reportClientDetailState.endDate
            ? `Du ${reportClientDetailState.startDate} au ${reportClientDetailState.endDate}`
            : "";
        reportClientDetailState.rangeLabel.textContent = rangeText;
      }

      if (!w.electronAPI?.readClientLedger) {
        reportClientDetailState.error = "Lecture du relev\u00e9 indisponible.";
        reportClientDetailState.loading = false;
        renderClientStatementDetailRows();
        return;
      }

      try {
        const [ledgerRes, paymentHistoryRes] = await Promise.all([
          w.electronAPI.readClientLedger({
            path: clientPath,
            dateFrom: startDate || "",
            dateTo: endDate || ""
          }),
          w.electronAPI.readPaymentHistory ? w.electronAPI.readPaymentHistory() : Promise.resolve(null)
        ]);
        if (!ledgerRes?.ok) {
          reportClientDetailState.error = ledgerRes?.error || "Chargement impossible.";
          reportClientDetailState.entries = [];
        } else {
          reportClientDetailState.entries = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
        }
        const paymentItems = Array.isArray(paymentHistoryRes?.items) ? paymentHistoryRes.items : [];
        const indexes = buildLedgerPaymentIndexes(paymentItems);
        reportClientDetailState.paymentHistoryById = indexes.byId;
        reportClientDetailState.paymentHistoryByInvoicePath = indexes.byInvoicePath;
        reportClientDetailState.invoiceNumberByPaymentId = indexes.invoiceNumberByPaymentId;
        reportClientDetailState.invoiceNumberByPath = buildLedgerInvoiceNumberIndex();
      } catch (err) {
        reportClientDetailState.error = "Chargement impossible.";
        reportClientDetailState.entries = [];
        reportClientDetailState.paymentHistoryById = new Map();
        reportClientDetailState.paymentHistoryByInvoicePath = new Map();
        reportClientDetailState.invoiceNumberByPaymentId = new Map();
        reportClientDetailState.invoiceNumberByPath = new Map();
      } finally {
        reportClientDetailState.loading = false;
        renderClientStatementDetailRows();
      }
    };

    const openClientStatementDetailModal = async ({ clientLabel, clientPath, startDate, endDate }) => {
      ensureClientStatementDetailModal();
      reportClientDetailState.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      reportClientDetailState.overlay.hidden = false;
      reportClientDetailState.overlay.setAttribute("aria-hidden", "false");
      reportClientDetailState.overlay.classList.add("is-open");
      reportClientDetailState.isOpen = true;
      document.addEventListener("keydown", onClientStatementDetailKeyDown);
      await loadClientStatementDetail({ clientLabel, clientPath, startDate, endDate });
      reportClientDetailState.closeBtn?.focus();
    };

    const openClientStatementFromReport = async () => {
      const { startDate, endDate, canExport } = updateClientReportActions();
      if (!canExport) return;
      const clientLabel = String(reportClientState.clientInput?.value || "").trim();
      const clientMatch = reportClientState.clientMap.get(clientLabel);
      const clientPath = clientMatch?.path || "";
      if (!clientPath) {
        await showClientReportMessage("S\u00e9lectionnez un client.");
        return;
      }
      closeClientReportModal();
      await openClientStatementDetailModal({ clientLabel, clientPath, startDate, endDate });
    };
    const ensureClientReportModal = () => {
      if (reportClientState.overlay) return reportClientState.overlay;
      const overlay = document.createElement("div");
      overlay.id = "clientStatementReportModal";
      overlay.className = "swbDialog";
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      const presetButtons = clientReportPresetOptions
        .map((opt) => {
          const isActive = opt.value === "custom";
          return `
            <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-report-client-preset="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
              ${opt.label}
            </button>
          `;
        })
        .join("");
      const presetSelectOptions = clientReportPresetOptions
        .map((opt) => {
          const isSelected = opt.value === "custom";
          return `<option value="${opt.value}" ${isSelected ? "selected" : ""}>${opt.label}</option>`;
        })
        .join("");
      overlay.innerHTML = `
        <div class="swbDialog__panel" role="dialog" aria-modal="true" aria-labelledby="clientStatementReportModalTitle">
          <div class="swbDialog__header">
            <div id="clientStatementReportModalTitle" class="swbDialog__title">Relev\u00e9s clients</div>
            <button id="clientStatementReportModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
              <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="swbDialog__msg">
            <div class="report-tax-date-range">
              <div class="report-tax-date-range__selectors">
                <label id="clientStatementReportClientField" class="report-tax-date-range__selector report-tax-date-range__selector--client">
                  <span id="clientStatementReportClientLabel">Client</span>
                  <input
                    id="clientStatementReportClient"
                    type="text"
                    placeholder="Tous les clients"
                    autocomplete="off"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-controls="clientStatementReportClientPanel"
                    aria-labelledby="clientStatementReportClientLabel"
                  >
                  <div
                    id="clientStatementReportClientPanel"
                    class="field-toggle-panel model-select-panel report-tax-date-range__panel"
                    role="listbox"
                    aria-labelledby="clientStatementReportClientLabel"
                    hidden
                  ></div>
                </label>
              </div>
              <div class="report-tax-date-range__selectors report-tax-date-range__selectors--triple">
                <label class="report-tax-date-range__selector">
                  <span id="clientStatementReportPresetLabel">Selection</span>
                  <div class="report-tax-date-range__controls">
                    <details id="clientStatementReportPresetMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu" data-model-select-managed="false" data-report-client-preset-menu="1">
                      <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="clientStatementReportPresetLabel clientStatementReportPresetDisplay">
                        <span id="clientStatementReportPresetDisplay" class="model-select-display">Par dates</span>
                        <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                      </summary>
                      <div id="clientStatementReportPresetPanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="clientStatementReportPresetLabel" data-report-client-preset-panel="1">
                        ${presetButtons}
                      </div>
                    </details>
                    <select id="clientStatementReportPreset" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1" data-report-client-preset-source="1">
                      ${presetSelectOptions}
                    </select>
                  </div>
                </label>
                <label class="report-tax-date-range__selector">
                  <span>Date d\u00e9but</span>
                  <div class="swb-date-picker" data-date-picker>
                    <input
                      id="clientStatementReportStart"
                      type="text"
                      inputmode="numeric"
                      placeholder="AAAA-MM-JJ"
                      autocomplete="off"
                      spellcheck="false"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      role="combobox"
                      aria-controls="clientStatementReportStartPanel"
                    >
                    <button
                      type="button"
                      class="swb-date-picker__toggle"
                      data-date-picker-toggle
                      aria-label="Choisir une date"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      aria-controls="clientStatementReportStartPanel"
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
                      id="clientStatementReportStartPanel"
                    ></div>
                  </div>
                </label>
                <label class="report-tax-date-range__selector">
                  <span>Date fin</span>
                  <div class="swb-date-picker" data-date-picker>
                    <input
                      id="clientStatementReportEnd"
                      type="text"
                      inputmode="numeric"
                      placeholder="AAAA-MM-JJ"
                      autocomplete="off"
                      spellcheck="false"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      role="combobox"
                      aria-controls="clientStatementReportEndPanel"
                    >
                    <button
                      type="button"
                      class="swb-date-picker__toggle"
                      data-date-picker-toggle
                      aria-label="Choisir une date"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      aria-controls="clientStatementReportEndPanel"
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
                      id="clientStatementReportEndPanel"
                    ></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div class="swbDialog__actions">
            <div class="swbDialog__group swbDialog__group--left">
              <button id="clientStatementReportCancel" type="button" class="swbDialog__cancel">Annuler</button>
            </div>
            <div class="swbDialog__group swbDialog__group--right">
              <button id="clientStatementReportOk" type="button" class="swbDialog__ok" disabled aria-disabled="true">Valider</button>
              <button id="clientStatementReportExtra" type="button" class="swbDialog__ok" style="display:none"></button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      reportClientState.overlay = overlay;
      reportClientState.closeBtn = overlay.querySelector("#clientStatementReportModalClose");
      reportClientState.closeFooterBtn = overlay.querySelector("#clientStatementReportCancel");
      reportClientState.exportBtn = overlay.querySelector("#clientStatementReportOk");
      reportClientState.clientInput = overlay.querySelector("#clientStatementReportClient");
      reportClientState.clientField = overlay.querySelector("#clientStatementReportClientField");
      reportClientState.clientPanel = overlay.querySelector("#clientStatementReportClientPanel");
      reportClientState.startInput = overlay.querySelector("#clientStatementReportStart");
      reportClientState.endInput = overlay.querySelector("#clientStatementReportEnd");
      reportClientState.presetSelect = overlay.querySelector("#clientStatementReportPreset");
      reportClientState.presetMenu = overlay.querySelector("#clientStatementReportPresetMenu");
      reportClientState.presetPanel = overlay.querySelector("#clientStatementReportPresetPanel");
      reportClientState.presetSummary = reportClientState.presetMenu?.querySelector("summary");
      reportClientState.presetDisplay = overlay.querySelector("#clientStatementReportPresetDisplay");
      rebuildClientReportPresetPanel();

      reportClientState.closeBtn?.addEventListener("click", closeClientReportModal);
      reportClientState.closeFooterBtn?.addEventListener("click", closeClientReportModal);
      reportClientState.exportBtn?.addEventListener("click", openClientStatementFromReport);
      overlay.addEventListener("click", (evt) => {
        if (evt.target !== overlay) return;
        evt.preventDefault();
        evt.stopPropagation();
      });

      const onDateInputChange = () => updateClientReportActions();
      const openClientPanel = () => {
        if (Date.now() < Number(reportClientState.suppressClientInputOpenUntil || 0)) {
          return;
        }
        rebuildClientReportClientPanel(reportClientState.clientInput?.value || "");
        setClientReportClientPanelOpen(true);
      };
      reportClientState.clientInput?.addEventListener("focus", openClientPanel);
      reportClientState.clientInput?.addEventListener("click", openClientPanel);
      reportClientState.clientInput?.addEventListener("input", () => {
        const query = reportClientState.clientInput?.value || "";
        rebuildClientReportClientPanel(query);
        setClientReportClientPanelOpen(true);
        updateClientReportActions();
      });
      reportClientState.clientInput?.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape") {
          evt.preventDefault();
          setClientReportClientPanelOpen(false);
          return;
        }
        if (evt.key !== "ArrowDown") return;
        const panel = reportClientState.clientPanel;
        if (!panel) return;
        if (panel.hidden) {
          evt.preventDefault();
          openClientPanel();
          return;
        }
        const first = panel.querySelector("[data-report-client-option]");
        if (first instanceof HTMLElement) {
          evt.preventDefault();
          first.focus();
        }
      });
      reportClientState.clientPanel?.addEventListener("keydown", (evt) => {
        const options = Array.from(
          reportClientState.clientPanel?.querySelectorAll("[data-report-client-option]") || []
        );
        const active = evt.target instanceof HTMLElement ? evt.target.closest("[data-report-client-option]") : null;
        const activeIndex = options.indexOf(active);
        if (evt.key === "Escape") {
          evt.preventDefault();
          setClientReportClientPanelOpen(false);
          reportClientState.clientInput?.focus();
          return;
        }
        if (evt.key === "Enter" && active instanceof HTMLElement) {
          evt.preventDefault();
          selectClientReportClient(active.dataset.reportClientOption || "", { closePanel: true });
          reportClientState.clientInput?.focus();
          return;
        }
        if (evt.key === "ArrowDown" || evt.key === "ArrowUp") {
          if (!options.length) return;
          evt.preventDefault();
          const step = evt.key === "ArrowDown" ? 1 : -1;
          const start = activeIndex >= 0 ? activeIndex : evt.key === "ArrowDown" ? -1 : 0;
          const nextIndex = (start + step + options.length) % options.length;
          const next = options[nextIndex];
          if (next instanceof HTMLElement) next.focus();
        }
      });
      const onClientPanelPointerSelect = (evt) => {
        const target = evt.target;
        if (!(target instanceof Element)) return;
        const clientBtn = target.closest("[data-report-client-option]");
        if (!(clientBtn instanceof HTMLElement)) return;
        evt.preventDefault();
        evt.stopPropagation();
        selectClientReportClient(clientBtn.dataset.reportClientOption || "", { closePanel: true });
        reportClientState.clientInput?.focus();
      };
      reportClientState.clientPanel?.addEventListener("pointerdown", onClientPanelPointerSelect, true);
      reportClientState.clientPanel?.addEventListener("mousedown", onClientPanelPointerSelect, true);
      reportClientState.startInput?.addEventListener("input", onDateInputChange);
      reportClientState.endInput?.addEventListener("input", onDateInputChange);
      overlay.addEventListener("click", (evt) => {
        const presetBtn = evt.target.closest("[data-report-client-preset]");
        if (presetBtn) {
          const scope = resolveReportMenuScope(presetBtn.closest("details"));
          setClientReportPresetSelection(presetBtn.dataset.reportClientPreset || "custom", {
            closeMenu: true,
            notify: true,
            menuScope: scope
          });
        }
      });
      reportClientState.presetMenu?.querySelector("summary")?.addEventListener("click", (evt) => {
        evt.preventDefault();
        const details = evt.currentTarget?.closest("details");
        const scope = resolveReportMenuScope(details);
        if (!scope) return;
        if (!scope.details.open) rebuildClientReportPresetPanel();
        scope.details.open = !scope.details.open;
        scope.summary?.setAttribute("aria-expanded", scope.details.open ? "true" : "false");
        if (!scope.details.open) scope.summary?.focus();
      });
      reportClientState.presetMenu?.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        const scope = resolveReportMenuScope(evt.currentTarget);
        if (!scope?.details?.open) return;
        evt.preventDefault();
        scope.details.open = false;
        scope.summary?.setAttribute("aria-expanded", "false");
        scope.summary?.focus();
      });
      const doc = overlay.ownerDocument || document;
      doc.addEventListener("click", (evt) => {
        if (!reportClientState.overlay) return;
        const openMenus = reportClientState.overlay.querySelectorAll(
          "details.model-select-menu[open]"
        );
        if (openMenus.length) {
          openMenus.forEach((menu) => {
            if (menu.contains(evt.target)) return;
            menu.open = false;
            menu.querySelector("summary")?.setAttribute("aria-expanded", "false");
          });
        }
        if (
          reportClientState.clientField &&
          !reportClientState.clientField.contains(evt.target)
        ) {
          setClientReportClientPanelOpen(false);
        }
      });
      if (reportClientState.presetSelect) {
        reportClientState.presetSelect.addEventListener("change", (evt) => {
          const select = evt.currentTarget;
          const root = select.closest(".report-tax-date-range__controls");
          const scope = resolveReportMenuScope(root?.querySelector("details"));
          rebuildClientReportPresetPanel();
          setClientReportPresetSelection(select.value, { menuScope: scope });
        });
      }

      if (reportClientState.startInput && w.AppDatePicker?.create) {
        reportClientState.startPicker = w.AppDatePicker.create(reportClientState.startInput, {
          allowManualInput: true,
          onChange(value) {
            reportClientState.startInput.value = String(value || "").trim();
            updateClientReportActions();
          }
        });
      }
      if (reportClientState.endInput && w.AppDatePicker?.create) {
        reportClientState.endPicker = w.AppDatePicker.create(reportClientState.endInput, {
          allowManualInput: true,
          onChange(value) {
            reportClientState.endInput.value = String(value || "").trim();
            updateClientReportActions();
          }
        });
      }

      return overlay;
    };

    const showClientReportModal = async () => {
      ensureClientReportModal();
      if (reportClientState.clientInput) reportClientState.clientInput.value = "";
      if (reportClientState.startInput) reportClientState.startInput.value = "";
      if (reportClientState.endInput) reportClientState.endInput.value = "";
      rebuildClientReportClientPanel("");
      setClientReportClientPanelOpen(false);
      rebuildClientReportPresetPanel();
      setClientReportPresetSelection("custom", {
        closeMenu: false,
        notify: true,
        menuScope: resolveReportMenuScope(reportClientState.presetMenu)
      });
      reportClientState.overlay.hidden = false;
      reportClientState.overlay.setAttribute("aria-hidden", "false");
      reportClientState.overlay.classList.add("is-open");
      reportClientState.isOpen = true;
      reportClientState.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onClientReportKeyDown);
      await loadClientReportOptions();
      rebuildClientReportClientPanel("");
      reportClientState.closeBtn?.focus();
    };

    const clientReportButton = getElSafe("btnReportClientStatement");
    clientReportButton?.addEventListener("click", () => {
      showClientReportModal();
    });
  };
})(window);
