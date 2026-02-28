(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const extractDocumentLabel = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    const sqlitePrefix = "sqlite://documents/";
    if (str.startsWith(sqlitePrefix)) {
      return str.slice(sqlitePrefix.length);
    }
    const normalized = str.replace(/\\/g, "/");
    const base = normalized.split("/").filter(Boolean).pop() || str;
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
  };
  const getDisplayFilename = (value) => {
    const normalized = extractDocumentLabel(value).replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts.pop() || normalized || "";
  };

  AppInit.createDocumentHistory = function createDocumentHistory({ numbering } = {}) {
    const SEM = (w.SEM = w.SEM || {});
    const getMessage = (key, options = {}) =>
      (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
        text: options?.fallbackText || key || "",
        title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
      };
    const docConversion = (w.AppInit && w.AppInit.DocConversion) || null;
    const purchaseInvoiceExport =
      (w.AppInit && w.AppInit.DocHistoryPurchaseExport) || null;
    const CHEVRON_SVG =
      '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';

    const historyModalBtn = getEl("docHistoryModalBtn");
    const historyModal = getEl("docHistoryModal");
    const historyModalClose = getEl("docHistoryModalClose");
    const historyModalList = getEl("docHistoryModalList");
    const historyModalStatus = getEl("docHistoryModalStatus");
    const historyModalRecap = getEl("docHistoryModalRecap");
    const historyModalRecapInfoBtn = getEl("docHistoryRecapInfoBtn");
    const historyModalRecapPopover = getEl("docHistoryRecapPopover");
    const historyModalRecapPopoverClose = getEl("docHistoryRecapPopoverClose");
    const historyModalPage = getEl("docHistoryModalPage");
    const historyModalPageInput = getEl("docHistoryModalPageInput");
    const historyModalTotalPages = getEl("docHistoryModalTotalPages");
    const historyModalPrev = getEl("docHistoryModalPrev");
    const historyModalNext = getEl("docHistoryModalNext");
    const historyModalCloseFooter = getEl("docHistoryModalCloseFooter");
    const historyModalTitle = getEl("docHistoryModalTitle");
    const historyModalRefresh = getEl("docHistoryModalRefresh");
    const historyEmailModal = getEl("docHistoryEmailModal");
    const historyEmailForm = getEl("docHistoryEmailForm");
    const historyEmailClose = getEl("docHistoryEmailModalClose");
    const historyEmailCancel = getEl("docHistoryEmailModalCancel");
    const historyEmailSend = getEl("docHistoryEmailModalSend");
    const historyEmailTo = getEl("docHistoryEmailTo");
    const historyEmailSubject = getEl("docHistoryEmailSubject");
    const historyEmailMessage = getEl("docHistoryEmailMessage");
    const historyEmailAttachPdf = getEl("docHistoryEmailAttachPdf");
    const historyEmailAttachPurchase = getEl("docHistoryEmailAttachPurchase");
    const historyEmailAttachment = getEl("docHistoryEmailAttachment");
    const historyEmailStatus = getEl("docHistoryEmailStatus");
    const docHistoryFilterNumber = getEl("docHistoryFilterNumber");
    const docHistoryFilterQuery = getEl("docHistoryFilterQuery");
    const docHistoryFilterQueryLabel = docHistoryFilterQuery?.closest("label")?.querySelector("span");
    const docHistoryFilterStart = getEl("docHistoryFilterStart");
    const docHistoryFilterEnd = getEl("docHistoryFilterEnd");
    const docHistoryFilterYear = getEl("docHistoryFilterYear");
    const docHistoryFilterYearMenu = getEl("docHistoryFilterYearMenu");
    const docHistoryFilterYearDisplay = getEl("docHistoryFilterYearDisplay");
    const docHistoryFilterYearPanel = getEl("docHistoryFilterYearPanel");
    const docHistoryFilterYearMenuToggle = docHistoryFilterYearMenu?.querySelector("summary") || null;
    const docHistoryFilterClear = getEl("docHistoryFilterClear");
    const docTypeSelect = getEl("docType");
    const docTypeDisplay = getEl("docTypeDisplay");
    const docTypeActionOpen = getEl("docTypeActionOpen");
    const createDatePicker =
      w.AppDatePicker && typeof w.AppDatePicker.create === "function"
        ? w.AppDatePicker.create.bind(w.AppDatePicker)
        : null;
    let docHistoryStartDatePickerController = null;
    let docHistoryEndDatePickerController = null;
    const HISTORY_MODAL_PAGE_SIZE = 5;
    const historyModalState = {
      docType: docTypeSelect?.value || "facture",
      page: 1,
      items: [],
      filters: {
        number: "",
        query: "",
        startDate: "",
        endDate: "",
        year: String(new Date().getFullYear())
      }
    };
    let historyModalRestoreFocus = null;
    let docHistoryStatusPopover = null;
    let docHistoryStatusPopoverPanel = null;
    let docHistoryStatusActiveIndex = null;
    let docHistoryStatusActiveMenu = null;
    let docHistoryStatusActiveToggle = null;
    let docHistoryActionsPopover = null;
    let docHistoryActionsPopoverPanel = null;
    let docHistoryActionsActiveIndex = null;
    let docHistoryActionsActiveMenu = null;
    let docHistoryActionsActiveToggle = null;
    let docHistoryExportPopover = null;
    let docHistoryExportPopoverPanel = null;
    let docHistoryExportActiveIndex = null;
    let docHistoryExportActiveMenu = null;
    let docHistoryExportActiveToggle = null;
    let historyEmailRestoreFocus = null;
    let historyEmailEntry = null;
    let historyEmailDocType = null;
    let historyEmailAttachmentPath = "";
    let historyEmailPurchaseAttachmentPath = "";
    let historyEmailSuppressPdfAttachment = false;
    let historyEmailRawData = null;
    let historyEmailSendPending = false;
    let historyEmailAttachmentPending = false;
    let historyEmailLoadToken = 0;
    let historyRenderToken = 0;
    const historyPaymentMetaCache = new Map();
 
    const safeHtml = typeof escapeHTML === "function" ? escapeHTML : (value) => String(value ?? "");
    const escapeAttr = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const DOC_HISTORY_SELECTABLE_TYPE_LABELS = {
      facture: "Facture",
      fa: "Facture d'achat",
      avoir: "Facture d'avoir",
      devis: "Devis",
      bl: "Bon de livraison"
    };
    const DOC_HISTORY_LEGACY_TYPE_LABELS = {
      bc: "Bon de commande",
      be: "Bon d'entr\u00e9e",
      bs: "Bon de sortie"
    };
    const DOC_HISTORY_TYPE_LABELS = {
      ...DOC_HISTORY_SELECTABLE_TYPE_LABELS,
      ...DOC_HISTORY_LEGACY_TYPE_LABELS
    };
    const DOC_HISTORY_SELECTABLE_TYPES = new Set(Object.keys(DOC_HISTORY_SELECTABLE_TYPE_LABELS));
    const DOC_HISTORY_LEGACY_TYPES = new Set(Object.keys(DOC_HISTORY_LEGACY_TYPE_LABELS));
    const DOC_HISTORY_STATUS_OPTIONS = [
      { value: "payee", label: "Pay\u00E9e" },
      { value: "partiellement-payee", label: "Partiellement pay\u00E9es" },
      { value: "pas-encore-payer", label: "Impay\u00E9e" },
      { value: "brouillon", label: "Brouillon" }
    ];
    const UNPAID_STATUS_VALUES = new Set(["pas-encore-payer", "impayee", "impaye"]);
    const DOC_HISTORY_PAYMENT_OPTIONS = [
       { value: "cash", label: "Esp\u00E8ces" },
  { value: "cash_deposit", label: "Versement Esp\u00E8ces" },
  { value: "cheque", label: "Ch\u00E8que" },
  { value: "bill_of_exchange", label: "Effet" },
  { value: "transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "withholding_tax", label: "Retenue \u00E0 la source" }
    ];
    const truncateClientName = (value, maxLength = 30) => {
      const normalized = value == null ? "" : String(value);
      if (!maxLength || normalized.length <= maxLength) return normalized;
      return `${normalized.slice(0, maxLength).trimEnd()}...`;
    };
    const formatDocHistoryDate = (entry) => {
      const raw = entry?.date || entry?.savedAt || entry?.createdAt || "";
      const text = String(raw || "").trim();
      if (!text) return "";

      const expandTwoDigitYear = (yy) => {
        const year = Number(yy);
        if (!Number.isFinite(year)) return "";
        return String(year >= 70 ? 1900 + year : 2000 + year);
      };

      // ISO-like input: 2026-01-19...
      if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        const [year, month, day] = text.slice(0, 10).split("-");
        return `${day}-${month}-${year}`;
      }

      // Legacy short-year input: 19-01-26 (yy-mm-dd)
      if (/^\d{2}-\d{2}-\d{2}$/.test(text)) {
        const [yy, month, day] = text.split("-");
        const fullYear = expandTwoDigitYear(yy);
        return fullYear ? `${day}-${month}-${fullYear}` : "";
      }

      const parsed = Date.parse(text);
      if (!Number.isFinite(parsed)) return "";
      const dt = new Date(parsed);
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = String(dt.getFullYear());
      return `${day}-${month}-${year}`;
    };
    const getCurrentHistoryYearValue = () => String(new Date().getFullYear());
    const normalizeHistoryYearValue = (value) => {
      const num = Number.parseInt(String(value || "").trim(), 10);
      if (!Number.isFinite(num)) return "";
      if (num < 1900 || num > 9999) return "";
      return String(num);
    };
    const isValidHistoryDateParts = (year, month, day) => {
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
      const candidate = new Date(year, month - 1, day);
      return (
        !Number.isNaN(candidate.getTime()) &&
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      );
    };
    const normalizeHistoryIsoDateValue = (value) => {
      const text = String(value || "").trim();
      if (!text) return "";
      if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        return text.slice(0, 10);
      }
      if (/^\d{2}-\d{2}-\d{2}$/.test(text)) {
        const [yy, month, day] = text.split("-");
        const year = Number(yy);
        if (!Number.isFinite(year)) return "";
        const fullYear = year >= 70 ? 1900 + year : 2000 + year;
        const monthNum = Number(month);
        const dayNum = Number(day);
        if (!isValidHistoryDateParts(fullYear, monthNum, dayNum)) return "";
        return `${fullYear}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
        const [day, month, year] = text.split("-");
        const yearNum = Number(year);
        const monthNum = Number(month);
        const dayNum = Number(day);
        if (!isValidHistoryDateParts(yearNum, monthNum, dayNum)) return "";
        return `${String(yearNum)}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      }
      const parsed = Date.parse(text);
      if (!Number.isFinite(parsed)) return "";
      const dt = new Date(parsed);
      if (Number.isNaN(dt.getTime())) return "";
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const parseHistoryDayMonthParts = (value) => {
      const text = String(value || "").trim();
      if (!text) return null;
      let dayRaw = "";
      let monthRaw = "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        monthRaw = text.slice(5, 7);
        dayRaw = text.slice(8, 10);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
        const [day, month] = text.split("-");
        dayRaw = day;
        monthRaw = month;
      } else {
        const compactMatch = text.match(/^(\d{1,2})[\\/.\-](\d{1,2})$/);
        if (!compactMatch) return null;
        dayRaw = compactMatch[1];
        monthRaw = compactMatch[2];
      }
      const dayNum = Number(dayRaw);
      const monthNum = Number(monthRaw);
      if (!Number.isFinite(dayNum) || !Number.isFinite(monthNum)) return null;
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) return null;
      return {
        day: String(dayNum).padStart(2, "0"),
        month: String(monthNum).padStart(2, "0")
      };
    };
    const normalizeHistoryDayMonthValue = (value) => {
      const parsed = parseHistoryDayMonthParts(value);
      if (!parsed) return "";
      return `${parsed.day}-${parsed.month}`;
    };
    const composeHistoryFilterIsoDate = (dayMonthValue, yearValue) => {
      const parsed = parseHistoryDayMonthParts(dayMonthValue);
      const year = normalizeHistoryYearValue(yearValue);
      if (!parsed || !year) return "";
      const yearNum = Number(year);
      const monthNum = Number(parsed.month);
      const dayNum = Number(parsed.day);
      if (!isValidHistoryDateParts(yearNum, monthNum, dayNum)) return "";
      return `${year}-${parsed.month}-${parsed.day}`;
    };
    const getHistoryEntryIsoDate = (entry) =>
      normalizeHistoryIsoDateValue(entry?.date) ||
      normalizeHistoryIsoDateValue(entry?.savedAt) ||
      normalizeHistoryIsoDateValue(entry?.createdAt);
    const getHistoryEntryYearValue = (entry) => {
      const isoDate = getHistoryEntryIsoDate(entry);
      if (!isoDate) return "";
      return normalizeHistoryYearValue(isoDate.slice(0, 4));
    };
    const isHistoryYearDefault = (value) =>
      normalizeHistoryYearValue(value) === getCurrentHistoryYearValue();
    const normalizeFilterText = (value) => String(value || "").trim().toLowerCase();
    const extractDocNumberFromPath = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const sqlitePrefix = "sqlite://documents/";
      if (raw.startsWith(sqlitePrefix)) return raw.slice(sqlitePrefix.length).trim();
      const normalizedPath = raw.replace(/\\/g, "/");
      const filename = normalizedPath.split("/").filter(Boolean).pop() || normalizedPath;
      const dotIndex = filename.lastIndexOf(".");
      return dotIndex > 0 ? filename.slice(0, dotIndex).trim() : filename.trim();
    };
    const normalizeDocHistoryStatusValue = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "";
      if (normalized === "annule") return "brouillon";
      return normalized;
    };
    const docHistoryStatusLabel = (value) => {
      const normalized =
        normalizeDocHistoryStatusValue(value) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      const match = DOC_HISTORY_STATUS_OPTIONS.find((opt) => opt.value === normalized);
      return match ? match.label : DOC_HISTORY_STATUS_OPTIONS[0].label;
    };
    const docHistoryPaymentLabel = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const normalized = raw.toLowerCase();
      const match = DOC_HISTORY_PAYMENT_OPTIONS.find((opt) => opt.value === normalized);
      return match ? match.label : raw;
    };
    const normalizePaymentMetaValue = (value) => {
      const raw = value == null ? "" : String(value).trim();
      return raw;
    };
    const extractHistoryPaymentMeta = (payload) => {
      const root = payload && typeof payload === "object" ? payload : {};
      const data = root.data && typeof root.data === "object" ? root.data : root;
      const meta =
        data.meta && typeof data.meta === "object"
          ? data.meta
          : root.meta && typeof root.meta === "object"
            ? root.meta
            : {};
      const paymentMethod = normalizePaymentMetaValue(meta.paymentMethod || meta.mode);
      const paymentReference = normalizePaymentMetaValue(
        meta.paymentReference || meta.paymentRef
      );
      return { paymentMethod, paymentReference };
    };
    const applyHistoryPaymentMeta = (entry, meta) => {
      if (!entry || !meta) return false;
      let updated = false;
      const currentMethod = normalizePaymentMetaValue(entry.paymentMethod || entry.mode);
      const currentRef = normalizePaymentMetaValue(entry.paymentReference || entry.paymentRef);
      if (meta.paymentMethod && !currentMethod) {
        entry.paymentMethod = meta.paymentMethod;
        updated = true;
      }
      if (meta.paymentReference && !currentRef) {
        entry.paymentReference = meta.paymentReference;
        entry.paymentRef = meta.paymentReference;
        updated = true;
      }
      return updated;
    };
    const hydrateHistoryPaymentMeta = async (items, docTypeHint) => {
      if (!Array.isArray(items) || items.length === 0) return false;
      if (!w.electronAPI?.openInvoiceJSON) return false;
      const entryDocType = String(docTypeHint || "").trim().toLowerCase();
      if (entryDocType && entryDocType !== "facture") return false;
      const pending = [];
      const seenPaths = new Set();
      items.forEach((item) => {
        const entry = item?.entry || item;
        if (!entry || !entry.path) return;
        const resolvedDocType = String(entry.docType || entryDocType || "").trim().toLowerCase();
        if (resolvedDocType && resolvedDocType !== "facture") return;
        const currentMethod = normalizePaymentMetaValue(entry.paymentMethod || entry.mode);
        const currentRef = normalizePaymentMetaValue(entry.paymentReference || entry.paymentRef);
        if (currentMethod && currentRef) return;
        const path = String(entry.path || "").trim();
        if (!path || seenPaths.has(path)) return;
        const cached = historyPaymentMetaCache.get(path);
        if (cached) {
          applyHistoryPaymentMeta(entry, cached);
          return;
        }
        seenPaths.add(path);
        pending.push(
          w.electronAPI
            .openInvoiceJSON({ path, docType: "facture" })
            .then((loaded) => {
              const meta = extractHistoryPaymentMeta(loaded);
              historyPaymentMetaCache.set(path, meta);
              applyHistoryPaymentMeta(entry, meta);
            })
            .catch((err) => {
              console.warn("doc-history payment meta hydrate failed", err);
            })
        );
      });
      if (!pending.length) return false;
      await Promise.all(pending);
      return true;
    };
    const isUnpaidStatus = (value) =>
      UNPAID_STATUS_VALUES.has(normalizeDocHistoryStatusValue(value));
    const isBrouillonStatus = (value) =>
      normalizeDocHistoryStatusValue(value) === "brouillon";
    const isPaidStatus = (value) => {
      const normalized = normalizeDocHistoryStatusValue(value);
      return normalized === "payee" || normalized === "partiellement-payee";
    };
    const NO_PAYMENT_METHOD_STATUS_VALUES = new Set([
      ...UNPAID_STATUS_VALUES,
      "brouillon",
      "avoir"
    ]);
    const isNoPaymentMethodStatus = (value) =>
      NO_PAYMENT_METHOD_STATUS_VALUES.has(normalizeDocHistoryStatusValue(value));
    const HISTORY_MODAL_BASE_TITLE = "Documents enregistr\u00E9s";
    const docHistoryDisplayLabel = (docType) => {
      const normalized = String(docType || "").toLowerCase();
      if (typeof w.docTypeLabel === "function") {
        try {
          const label = w.docTypeLabel(normalized || docType);
          if (label) return String(label);
        } catch {}
      }
      if (normalized && DOC_HISTORY_TYPE_LABELS[normalized]) return DOC_HISTORY_TYPE_LABELS[normalized];
      if (!normalized) return "";
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };
    const DOC_HISTORY_TYPE_ARTICLES = {
      facture: "la",
      fa: "la",
      avoir: "la",
      devis: "le",
      bl: "le",
      bc: "le",
      be: "le",
      bs: "le"
    };
    const docHistoryLabelWithArticle = (docType) => {
      const label = docHistoryDisplayLabel(docType);
      if (!label) return "";
      const normalized = String(docType || "").toLowerCase();
      const article = DOC_HISTORY_TYPE_ARTICLES[normalized];
      const labelLower = label.toLowerCase();
      return article ? `${article} ${labelLower}` : labelLower;
    };
    const getHistoryPartyLabels = (docType) => {
      const normalized = String(docType || "").toLowerCase();
      const isVendor = normalized === "fa";
      const label = isVendor ? "Fournisseur" : "Client";
      return {
        label,
        labelWithColon: `${label} :`,
        filterLabel: isVendor ? "Nom du fournisseur ou identifiant" : "Nom du client ou identifiant",
        filterPlaceholder: isVendor
          ? "Rechercher un fournisseur ou une r\u00E9f\u00E9rence"
          : "Rechercher un client ou une r\u00E9f\u00E9rence",
        copyLabel: isVendor ? "Copier le fournisseur" : "Copier le client"
      };
    };
    const resolveClientAccountLabel = () => {
      const labelSource = SEM?.state?.clientFieldLabels || w.DEFAULT_CLIENT_FIELD_LABELS || {};
      const label = String(labelSource?.account || "Pour le compte de").trim();
      return label || "Pour le compte de";
    };

    const normalizeEmailText = (value) => String(value ?? "").trim();
    const resolveCompanySmtpSettings = () => {
      const company = SEM?.state?.company || {};
      const profiles =
        company.smtpProfiles && typeof company.smtpProfiles === "object"
          ? company.smtpProfiles
          : company.smtp && typeof company.smtp === "object"
            ? { professional: company.smtp }
            : {};
      const preset =
        (company.smtpPreset && profiles[company.smtpPreset] && company.smtpPreset) ||
        (profiles.gmail && !profiles.professional ? "gmail" : "professional");
      const smtpRaw = profiles[preset] && typeof profiles[preset] === "object" ? profiles[preset] : {};
      const secure = !!smtpRaw.secure;
      const portValue = Number(smtpRaw.port);
      const fallbackPort = preset === "gmail" ? (secure ? 465 : 587) : secure ? 465 : 587;
      const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : fallbackPort;
      const hostValue = preset === "gmail" ? "smtp.gmail.com" : smtpRaw.host;
      const fromEmailFallback =
        normalizeEmailText(smtpRaw.fromEmail || company.email || smtpRaw.user || "");
      return {
        enabled: !!smtpRaw.enabled,
        host: normalizeEmailText(hostValue),
        port,
        secure,
        user: normalizeEmailText(smtpRaw.user),
        pass: String(smtpRaw.pass ?? ""),
        fromEmail: fromEmailFallback,
        fromName: normalizeEmailText(smtpRaw.fromName || company.name || "")
      };
    };
    const isSmtpReady = (smtp) =>
      !!(
        smtp &&
        smtp.enabled &&
        smtp.host &&
        smtp.port &&
        smtp.fromEmail &&
        typeof w.electronAPI?.sendSmtpEmail === "function"
      );
    const buildMailtoUrl = (to, subject, body) => {
      const target = normalizeEmailText(to).replace(/\s+/g, "");
      if (!target) return "";
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (body) params.set("body", body);
      const query = params.toString();
      return `mailto:${encodeURI(target)}${query ? `?${query}` : ""}`;
    };

    const setHistoryEmailStatus = (message, variant) => {
      if (!historyEmailStatus) return;
      historyEmailStatus.textContent = message || "";
      historyEmailStatus.classList.toggle("is-warning", variant === "warning");
    };
    const updateHistoryEmailPurchaseAttachVisibility = (docTypeValue) => {
      if (!historyEmailAttachPurchase) return;
      const normalized = String(docTypeValue || "").trim().toLowerCase();
      const visible = normalized === "facture";
      historyEmailAttachPurchase.hidden = !visible;
      historyEmailAttachPurchase.setAttribute("aria-hidden", visible ? "false" : "true");
      if (!visible) {
        historyEmailAttachPurchase.disabled = true;
        historyEmailAttachPurchase.setAttribute("aria-disabled", "true");
        historyEmailAttachPurchase.classList.remove("is-attached");
      }
    };
    const updateHistoryEmailAttachButtonState = () => {
      const hasPdfAttachment = !!normalizeEmailText(historyEmailAttachmentPath);
      const hasPurchaseAttachment = !!normalizeEmailText(historyEmailPurchaseAttachmentPath);
      const shouldDisable = historyEmailAttachmentPending || historyEmailSendPending;
      if (historyEmailAttachPdf) {
        const disablePdf = shouldDisable || hasPdfAttachment;
        historyEmailAttachPdf.disabled = disablePdf;
        historyEmailAttachPdf.setAttribute("aria-disabled", disablePdf ? "true" : "false");
        historyEmailAttachPdf.classList.toggle("is-attached", hasPdfAttachment);
      }
      if (historyEmailAttachPurchase) {
        const isVisible = !historyEmailAttachPurchase.hidden;
        const disablePurchase = !isVisible || shouldDisable || hasPurchaseAttachment;
        historyEmailAttachPurchase.disabled = disablePurchase;
        historyEmailAttachPurchase.setAttribute("aria-disabled", disablePurchase ? "true" : "false");
        historyEmailAttachPurchase.classList.toggle("is-attached", isVisible && hasPurchaseAttachment);
      }
    };
    const setHistoryEmailFormDisabled = (disabled) => {
      if (!historyEmailForm) return;
      const controls = historyEmailForm.querySelectorAll("input, select, textarea, button");
      controls.forEach((control) => {
        if (disabled) {
          control.dataset.historyEmailWasDisabled = control.disabled ? "true" : "false";
          control.disabled = true;
        } else if (control.dataset.historyEmailWasDisabled) {
          control.disabled = control.dataset.historyEmailWasDisabled === "true";
          delete control.dataset.historyEmailWasDisabled;
        }
      });
      if (disabled) {
        historyEmailForm.setAttribute("aria-disabled", "true");
      } else {
        historyEmailForm.removeAttribute("aria-disabled");
      }
    };
    const updateHistoryEmailStatus = () => {
      const smtp = resolveCompanySmtpSettings();
      if (isSmtpReady(smtp)) {
        setHistoryEmailStatus("Envoi via SMTP actif.");
      } else {
        setHistoryEmailStatus(
          "SMTP desactive ou incomplet. L'envoi ouvrira votre client e-mail.",
          "warning"
        );
      }
    };
    const buildHistoryEmailAttachmentItem = ({ type, label, pathValue }) => {
      const item = document.createElement("div");
      item.className = "email-compose-modal__attachment-item";
      const name = document.createElement("span");
      name.className = "email-compose-modal__attachment-name";
      name.textContent = `${label}: ${String(pathValue || "").replace(/.*[\\/]/, "")}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "email-compose-modal__attachment-remove";
      removeBtn.dataset.historyEmailAttachmentRemove = type;
      removeBtn.setAttribute("aria-label", `Retirer ${label}`);
      removeBtn.title = `Retirer ${label}`;
      removeBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>`;
      item.append(name, removeBtn);
      return item;
    };
    const updateHistoryEmailAttachmentSummary = () => {
      if (!historyEmailAttachment) {
        updateHistoryEmailAttachButtonState();
        return;
      }
      const pdfPath = normalizeEmailText(historyEmailAttachmentPath);
      const purchasePath = normalizeEmailText(historyEmailPurchaseAttachmentPath);
      historyEmailAttachment.innerHTML = "";
      if (!pdfPath && !purchasePath) {
        historyEmailAttachment.textContent = "Aucune piece jointe.";
        historyEmailAttachment.classList.add("is-empty");
        updateHistoryEmailAttachButtonState();
        return;
      }
      historyEmailAttachment.classList.remove("is-empty");
      const list = document.createElement("div");
      list.className = "email-compose-modal__attachment-list";
      if (pdfPath) {
        list.appendChild(
          buildHistoryEmailAttachmentItem({
            type: "pdf",
            label: "PDF",
            pathValue: pdfPath
          })
        );
      }
      if (purchasePath) {
        list.appendChild(
          buildHistoryEmailAttachmentItem({
            type: "purchase",
            label: "Facture d'achat",
            pathValue: purchasePath
          })
        );
      }
      historyEmailAttachment.appendChild(list);
      updateHistoryEmailAttachButtonState();
    };
    const setHistoryEmailAttachment = (pathValue) => {
      historyEmailAttachmentPath = normalizeEmailText(pathValue || "");
      if (historyEmailAttachmentPath) {
        historyEmailSuppressPdfAttachment = false;
      }
      updateHistoryEmailAttachmentSummary();
    };
    const setHistoryEmailPurchaseAttachment = (pathValue) => {
      historyEmailPurchaseAttachmentPath = normalizeEmailText(pathValue || "");
      updateHistoryEmailAttachmentSummary();
    };

    function initHistoryEmailModal() {
      if (!historyEmailModal || !historyEmailForm) return;
      if (SEM._historyEmailModalInitialized) return;
      SEM._historyEmailModalInitialized = true;
      updateHistoryEmailPurchaseAttachVisibility(historyModalState.docType || "");
      historyEmailClose?.addEventListener("click", closeHistoryEmailModal);
      historyEmailCancel?.addEventListener("click", closeHistoryEmailModal);
      historyEmailAttachPdf?.addEventListener("click", () => {
        handleHistoryEmailAttachPdf();
      });
      historyEmailAttachPurchase?.addEventListener("click", () => {
        handleHistoryEmailAttachPurchase();
      });
      historyEmailAttachment?.addEventListener("click", (evt) => {
        const targetEl = evt.target instanceof Element ? evt.target : null;
        const removeBtn = targetEl?.closest("[data-history-email-attachment-remove]");
        if (!removeBtn) return;
        evt.preventDefault();
        if (historyEmailAttachmentPending || historyEmailSendPending) return;
        const targetType = String(removeBtn.dataset.historyEmailAttachmentRemove || "")
          .trim()
          .toLowerCase();
        if (targetType === "pdf") {
          historyEmailSuppressPdfAttachment = true;
          setHistoryEmailAttachment("");
          setHistoryEmailStatus("Piece jointe PDF retiree.");
          return;
        }
        if (targetType === "purchase") {
          setHistoryEmailPurchaseAttachment("");
          setHistoryEmailStatus("Piece jointe Facture d'achat retiree.");
        }
      });
      historyEmailForm.addEventListener("submit", (evt) => {
        evt.preventDefault();
        handleHistoryEmailSend();
      });
    }

    function onHistoryEmailKeyDown(evt) {
      if (evt.key === "Escape") {
        if (historyEmailSendPending) return;
        evt.preventDefault();
        closeHistoryEmailModal();
      }
    }

    async function loadHistoryEmailData(entry, docType, token) {
      if (!entry?.path || typeof w.openInvoiceFromFilePicker !== "function") return;
      try {
        const raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType });
        if (!raw || token !== historyEmailLoadToken) return;
        historyEmailRawData = raw;
        const data =
          raw && typeof raw === "object" && raw.data && typeof raw.data === "object" ? raw.data : raw;
        const clientEmail = normalizeEmailText(data?.client?.email || data?.clientEmail || "");
        if (clientEmail && historyEmailTo && !normalizeEmailText(historyEmailTo.value)) {
          historyEmailTo.value = clientEmail;
        }
      } catch (err) {
        console.warn("doc-history email preload failed", err);
      }
    }

    function openHistoryEmailModal(entry) {
      if (!historyEmailModal || !historyEmailForm || !entry) return;
      const entryDocType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
      const docLabel = docHistoryDisplayLabel(entryDocType) || "Document";
      const docLabelWithArticle = docHistoryLabelWithArticle(entryDocType) || docLabel.toLowerCase();
      const docNumber = String(entry.number || entry.name || getDisplayFilename(entry.path) || "").trim();
      const subject = docNumber ? `${docLabel} ${docNumber}` : docLabel;
      const companyName = String(SEM?.state?.company?.name || "").trim();
      const signature = companyName ? `\n${companyName}` : "";
      const message = `Bonjour,\n\nVeuillez trouver en piece jointe ${docLabelWithArticle}${
        docNumber ? ` ${docNumber}` : ""
      }.\n\nCordialement,${signature}`;

      historyEmailEntry = entry;
      historyEmailDocType = entryDocType;
      historyEmailRawData = null;
      historyEmailAttachmentPending = false;
      historyEmailSuppressPdfAttachment = false;
      updateHistoryEmailPurchaseAttachVisibility(entryDocType);
      const entryEmail = normalizeEmailText(entry.clientEmail || entry.email || "");
      if (historyEmailTo) historyEmailTo.value = entryEmail;
      if (historyEmailSubject) historyEmailSubject.value = subject;
      if (historyEmailMessage) historyEmailMessage.value = message;
      setHistoryEmailPurchaseAttachment("");
      setHistoryEmailAttachment(typeof entry.pdfPath === "string" ? entry.pdfPath.trim() : "");
      updateHistoryEmailStatus();

      historyEmailRestoreFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      historyEmailModal.hidden = false;
      historyEmailModal.removeAttribute("hidden");
      historyEmailModal.setAttribute("aria-hidden", "false");
      historyEmailModal.classList.add("is-open");
      document.addEventListener("keydown", onHistoryEmailKeyDown);
      historyEmailTo?.focus();

      const token = ++historyEmailLoadToken;
      loadHistoryEmailData(entry, entryDocType, token);
    }

    function closeHistoryEmailModal() {
      if (!historyEmailModal || historyEmailSendPending || historyEmailAttachmentPending) return;
      historyEmailModal.classList.remove("is-open");
      historyEmailModal.hidden = true;
      historyEmailModal.setAttribute("hidden", "");
      historyEmailModal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onHistoryEmailKeyDown);
      historyEmailEntry = null;
      historyEmailDocType = null;
      historyEmailRawData = null;
      historyEmailAttachmentPending = false;
      historyEmailAttachmentPath = "";
      historyEmailPurchaseAttachmentPath = "";
      historyEmailSuppressPdfAttachment = false;
      historyEmailLoadToken += 1;
      if (historyEmailRestoreFocus && typeof historyEmailRestoreFocus.focus === "function") {
        try {
          historyEmailRestoreFocus.focus();
        } catch {}
      }
    }

    async function ensureHistoryEmailAttachment(entry) {
      if (historyEmailAttachmentPath) return historyEmailAttachmentPath;
      if (typeof w.exportInvoiceDataAsPDF !== "function") return "";
      if (!w.electronAPI?.exportPDFFromHTML) return "";
      const entryType = String(historyEmailDocType || entry?.docType || historyModalState.docType || "facture").toLowerCase();
      let raw = historyEmailRawData;
      if (!raw && entry?.path && typeof w.openInvoiceFromFilePicker === "function") {
        raw = await w.openInvoiceFromFilePicker({
          path: entry.path,
          docType: entryType
        });
        if (raw) {
          historyEmailRawData = raw;
        }
      }
      if (!raw) return "";
      try {
        if (entryType === "facture" && entry?.status) {
          injectHistoryStatusIntoRawData(raw, entry.status);
        }
        const res = await w.exportInvoiceDataAsPDF(raw, {
          historyPath: entry?.path,
          historyDocType: entryType,
          strictDb: true
        });
        const exportedPath = String(res?.invoicePath || res?.path || "").trim();
        if (exportedPath) {
          if (entry && typeof entry === "object") {
            entry.pdfPath = exportedPath;
          }
          setHistoryEmailAttachment(exportedPath);
          return exportedPath;
        }
      } catch (err) {
        console.warn("doc-history email pdf export failed", err);
      }
      return "";
    }

    async function ensureHistoryEmailPurchaseAttachment(entry) {
      if (historyEmailPurchaseAttachmentPath) {
        return { path: historyEmailPurchaseAttachmentPath, canceled: false, error: "" };
      }
      const entryType = String(historyEmailDocType || entry?.docType || historyModalState.docType || "facture")
        .trim()
        .toLowerCase();
      if (entryType !== "facture") {
        return {
          path: "",
          canceled: false,
          error: "Cette action est disponible uniquement pour les documents de type Facture."
        };
      }
      if (
        !purchaseInvoiceExport ||
        typeof purchaseInvoiceExport.exportFactureEntryAsPurchase !== "function"
      ) {
        return {
          path: "",
          canceled: false,
          error: "Export facture d'achat indisponible."
        };
      }
      try {
        const result = await purchaseInvoiceExport.exportFactureEntryAsPurchase({ entry });
        if (result?.canceled) {
          return { path: "", canceled: true, error: "" };
        }
        if (!result?.ok) {
          return {
            path: "",
            canceled: false,
            error: String(result?.error || "Impossible d'exporter la facture d'achat.")
          };
        }
        const exportedPath = normalizeEmailText(result?.filePath || "");
        if (!exportedPath) {
          return {
            path: "",
            canceled: false,
            error: "Le fichier facture d'achat exporte ne peut pas etre attache automatiquement."
          };
        }
        setHistoryEmailPurchaseAttachment(exportedPath);
        return { path: exportedPath, canceled: false, error: "" };
      } catch (err) {
        return {
          path: "",
          canceled: false,
          error: String(err?.message || err || "Impossible d'exporter la facture d'achat.")
        };
      }
    }

    async function handleHistoryEmailAttachPdf() {
      if (historyEmailSendPending || historyEmailAttachmentPending) return;
      const entry = historyEmailEntry;
      if (!entry) return;
      if (historyEmailAttachmentPath) {
        updateHistoryEmailAttachButtonState();
        return;
      }
      historyEmailSuppressPdfAttachment = false;
      historyEmailAttachmentPending = true;
      updateHistoryEmailAttachButtonState();
      setHistoryEmailStatus("Generation du PDF en cours...");
      try {
        const attachmentPath = await ensureHistoryEmailAttachment(entry);
        if (attachmentPath) {
          setHistoryEmailStatus("Facture PDF attachee.");
        } else {
          const errorMessage = "Impossible d'attacher le PDF a cet e-mail.";
          setHistoryEmailStatus(errorMessage, "warning");
          await w.showDialog?.(errorMessage, { title: "E-mail" });
        }
      } finally {
        historyEmailAttachmentPending = false;
        updateHistoryEmailAttachButtonState();
      }
    }

    async function handleHistoryEmailAttachPurchase() {
      if (historyEmailSendPending || historyEmailAttachmentPending) return;
      const entry = historyEmailEntry;
      if (!entry) return;
      if (historyEmailPurchaseAttachmentPath) {
        updateHistoryEmailAttachButtonState();
        return;
      }
      historyEmailSuppressPdfAttachment = false;
      historyEmailAttachmentPending = true;
      updateHistoryEmailAttachButtonState();
      setHistoryEmailStatus("Generation des pieces jointes en cours...");
      try {
        const pdfAttachmentPath = await ensureHistoryEmailAttachment(entry);
        if (!pdfAttachmentPath) {
          const pdfError = "Impossible d'attacher le PDF a cet e-mail.";
          setHistoryEmailStatus(pdfError, "warning");
          await w.showDialog?.(pdfError, { title: "E-mail" });
          return;
        }
        const purchaseAttachment = await ensureHistoryEmailPurchaseAttachment(entry);
        if (purchaseAttachment.path) {
          setHistoryEmailStatus("Facture d'achat et PDF attaches.");
          return;
        }
        if (purchaseAttachment.canceled) {
          setHistoryEmailStatus("Export facture d'achat annule.", "warning");
          return;
        }
        const errorMessage =
          String(purchaseAttachment.error || "").trim() ||
          "Impossible d'attacher la facture d'achat a cet e-mail.";
        setHistoryEmailStatus(errorMessage, "warning");
        await w.showDialog?.(errorMessage, { title: "E-mail" });
      } finally {
        historyEmailAttachmentPending = false;
        updateHistoryEmailAttachButtonState();
      }
    }

    async function handleHistoryEmailSend() {
      if (historyEmailSendPending) return;
      const entry = historyEmailEntry;
      if (!entry) return;
      const to = normalizeEmailText(historyEmailTo?.value);
      if (!to) {
        const message = "Veuillez saisir un destinataire.";
        setHistoryEmailStatus(message, "warning");
        await w.showDialog?.(message, { title: "E-mail" });
        historyEmailTo?.focus();
        return;
      }
      const subject = String(historyEmailSubject?.value || "").trim();
      const body = String(historyEmailMessage?.value || "");
      historyEmailSendPending = true;
      if (historyEmailSend) historyEmailSend.disabled = true;
      updateHistoryEmailAttachButtonState();
      setHistoryEmailFormDisabled(true);
      setHistoryEmailStatus("Envoi en cours...");
      const finishHistoryEmailSend = () => {
        historyEmailSendPending = false;
        if (historyEmailSend) historyEmailSend.disabled = false;
        setHistoryEmailFormDisabled(false);
        updateHistoryEmailAttachButtonState();
      };

      let smtpError = "";
      let smtpAttempted = false;
      try {
        const smtp = resolveCompanySmtpSettings();
        if (isSmtpReady(smtp)) {
          smtpAttempted = true;
          const attachmentPath = historyEmailSuppressPdfAttachment
            ? ""
            : await ensureHistoryEmailAttachment(entry);
          const attachmentPaths = [];
          if (attachmentPath) attachmentPaths.push(attachmentPath);
          if (historyEmailPurchaseAttachmentPath) attachmentPaths.push(historyEmailPurchaseAttachmentPath);
          const attachments = Array.from(
            new Set(
              attachmentPaths
                .map((pathValue) => normalizeEmailText(pathValue))
                .filter((pathValue) => !!pathValue)
            )
          ).map((pathValue) => ({ path: pathValue }));
          const res = await w.electronAPI.sendSmtpEmail({
            smtp,
            message: { to, subject, text: body, attachments }
          });
          if (res?.ok) {
            if (typeof w.showToast === "function") {
              w.showToast("E-mail envoye.");
            }
            finishHistoryEmailSend();
            closeHistoryEmailModal();
            return;
          }
          smtpError = res?.error || "Envoi SMTP impossible.";
        }
      } catch (err) {
        smtpError = String(err?.message || err || "Envoi SMTP impossible.");
      }

      const mailtoUrl = buildMailtoUrl(to, subject, body);
      if (smtpAttempted && smtpError) {
        await w.showDialog?.(`${smtpError}\n\nOuverture du client e-mail.`, { title: "E-mail" });
      }
      if (mailtoUrl) {
        if (w.electronAPI?.openExternal) {
          await w.electronAPI.openExternal(mailtoUrl);
        } else if (typeof window !== "undefined") {
          window.open(mailtoUrl, "_blank", "noopener");
        }
      }
      closeHistoryEmailModal();
      finishHistoryEmailSend();
    }

    const normalizeHistoryTypeValue = (value, fallback = "facture", { allowLegacy = false } = {}) => {
      const normalized = String(value || fallback || "facture").trim().toLowerCase();
      if (!normalized) return "facture";
      const aliasMap = {
        factureachat: "fa",
        "facture-achat": "fa",
        "facture_achat": "fa",
        "facture d'achat": "fa",
        "facture dachat": "fa",
        "facture achat": "fa",
        bon: "bl",
        bon_livraison: "bl",
        "bon-de-livraison": "bl",
        "bon de livraison": "bl",
        "bon livraison": "bl",
        bon_commande: "bc",
        "bon-de-commande": "bc",
        "bon de commande": "bc",
        "bon commande": "bc",
        commande: "bc",
        bonentree: "be",
        bon_entree: "be",
        "bon-entree": "be",
        "bon entree": "be",
        "bon d'entree": "be",
        "bon d'entr\u00e9e": "be",
        bondentree: "be",
        bonsortie: "bs",
        bon_sortie: "bs",
        "bon-sortie": "bs",
        "bon sortie": "bs",
        "bon de sortie": "bs",
        bondesortie: "bs",
        factureavoir: "avoir",
        facture_avoir: "avoir",
        "facture-avoir": "avoir",
        "facture avoir": "avoir",
        "facture d'avoir": "avoir",
        "facture davoir": "avoir"
      };
      const resolved = aliasMap[normalized] || normalized;
      if (DOC_HISTORY_SELECTABLE_TYPES.has(resolved)) return resolved;
      if (allowLegacy && DOC_HISTORY_LEGACY_TYPES.has(resolved)) return resolved;
      const normalizedFallback = String(fallback || "facture").trim().toLowerCase();
      const resolvedFallback = aliasMap[normalizedFallback] || normalizedFallback;
      if (DOC_HISTORY_SELECTABLE_TYPES.has(resolvedFallback)) return resolvedFallback;
      if (allowLegacy && DOC_HISTORY_LEGACY_TYPES.has(resolvedFallback)) return resolvedFallback;
      return "facture";
    };

    const normalizedInitialHistoryType = normalizeHistoryTypeValue(
      docTypeSelect?.value || historyModalState.docType || "facture"
    );
    historyModalState.docType = normalizedInitialHistoryType;
    initHistoryEmailModal();

    const docHistoryTypeFromDocControls = (fallback = "facture") => {
      const selectValue = docTypeSelect?.value;
      if (selectValue) return normalizeHistoryTypeValue(selectValue, fallback);
      const displayText = docTypeDisplay?.textContent || "";
      if (displayText) {
        const match = Object.entries(DOC_HISTORY_SELECTABLE_TYPE_LABELS).find(
          ([, label]) => String(label || "").toLowerCase() === displayText.trim().toLowerCase()
        );
        if (match) return match[0];
      }
      return normalizeHistoryTypeValue(fallback);
    };

    const DIGIGO_LOGIN_URL = "https://digigo.tuntrust.tn/login";
    const openDigigoLogin = () => {
      try {
        if (w.electronAPI?.openExternal) {
          w.electronAPI.openExternal(DIGIGO_LOGIN_URL);
          return;
        }
      } catch {}
      if (typeof window !== "undefined") {
        window.open(DIGIGO_LOGIN_URL, "_blank", "noopener,noreferrer");
      }
    };

    function syncHistoryTypeWithDocSelection({ forceRender = false } = {}) {
      const nextType = docHistoryTypeFromDocControls(historyModalState.docType || "facture");
      const currentType = normalizeHistoryTypeValue(historyModalState.docType || "facture");
      const changed = nextType !== currentType || forceRender;
      const normalized = normalizeHistoryTypeValue(nextType, currentType);
      historyModalState.docType = normalized;
      updateHistoryModalTitle(normalized);
      updateHistoryModalPartyLabels(normalized);
      if (!changed) return normalized;
      renderHistoryList(normalized);
      if (isHistoryModalOpen()) {
        updateHistoryModalData(normalized);
        renderHistoryModal();
      }
      return normalized;
    }

    const historyRefreshQueue = new Map();
    const historyRefreshInFlightTypes = new Set();
    const historyRefreshLatestTokens = new Map();
    let historyRefreshToken = 0;

    const reserveHistoryRefreshToken = (docType) => {
      const token = ++historyRefreshToken;
      historyRefreshLatestTokens.set(docType, token);
      return token;
    };

    const isHistoryRefreshTokenCurrent = (docType, token) =>
      historyRefreshLatestTokens.get(docType) === token;

    const setHistoryRefreshTail = (docType, promise) => {
      historyRefreshQueue.set(docType, { tail: promise });
      promise.finally(() => {
        const current = historyRefreshQueue.get(docType);
        if (current?.tail === promise) {
          historyRefreshQueue.delete(docType);
        }
      });
      return promise;
    };

    async function hydrateHistoryFromDisk(docType, { token } = {}) {
      if (typeof w.addDocumentHistory !== "function" || !w.electronAPI?.listInvoiceFiles) return;
      const normalized = normalizeHistoryTypeValue(docType, "facture");
      const isTokenValid = () => !token || isHistoryRefreshTokenCurrent(normalized, token);
      if (!isTokenValid()) return;
      try {
        historyPaymentMetaCache.clear();
        if (typeof w.clearDocumentHistory === "function") {
          w.clearDocumentHistory(normalized);
        }
        const res = await w.electronAPI.listInvoiceFiles({ docType: normalized });
        if (!isTokenValid()) return;
        if (!res?.ok || !Array.isArray(res.items)) return;
        res.items.forEach((item) => {
          const entryDocType = item?.docType || normalized;
          w.addDocumentHistory({
            id: item?.id,
            docType: entryDocType,
            path: item?.path,
            number: item?.number,
            date: item?.date,
            createdAt: item?.createdAt || item?.modifiedAt,
            name: item?.name,
            clientName: item?.clientName,
            clientAccount: item?.clientAccount,
            totalHT: item?.totalHT,
            totalTTC: item?.totalTTC,
            totalTTCExclStamp: item?.totalTTCExclStamp,
            stampTT: item?.stampTT,
            currency: item?.currency,
            paid: item?.paid,
            balanceDue: item?.balanceDue,
            acompteEnabled: item?.acompteEnabled,
            reglementEnabled: item?.reglementEnabled,
            reglementText: item?.reglementText,
            paymentMethod: item?.paymentMethod || item?.mode,
            paymentRef: item?.paymentRef || item?.paymentReference,
            paymentReference: item?.paymentReference || item?.paymentRef,
            paymentDate: item?.paymentDate,
            status: item?.status,
            pdfPath: item?.pdfPath,
            pdfExportedAt: item?.pdfExportedAt,
            has_comment: item?.has_comment,
            convertedFrom: item?.convertedFrom
          });
        });
      } catch (err) {
        console.warn("document history hydrate failed", err);
      }
    }

    async function runHistoryRefresh(normalized, tokenOverride) {
      const token = tokenOverride ?? reserveHistoryRefreshToken(normalized);
      historyRefreshInFlightTypes.add(normalized);
      const previousStatus = historyModalStatus?.textContent || "";
      if (historyModalRefresh) {
        historyModalRefresh.disabled = true;
        historyModalRefresh.setAttribute("aria-busy", "true");
      }
      if (historyModalStatus) {
        historyModalStatus.textContent = "Actualisation des documents...";
      }
      try {
        await hydrateHistoryFromDisk(normalized, { token });
        if (!isHistoryRefreshTokenCurrent(normalized, token)) return false;
        updateHistoryModalData(normalized);
        renderHistoryModal();
        return true;
      } catch (err) {
        console.warn("document history refresh failed", err);
        if (historyModalStatus) {
          historyModalStatus.textContent = "Impossible d'actualiser la liste.";
        }
        return false;
      } finally {
        historyRefreshInFlightTypes.delete(normalized);
        if (historyModalRefresh) {
          historyModalRefresh.disabled = false;
          historyModalRefresh.removeAttribute("aria-busy");
        }
        if (!isHistoryModalOpen() && historyModalStatus && previousStatus) {
          historyModalStatus.textContent = previousStatus;
        }
      }
    }

    function refreshHistoryFromDisk(docType, { force = false } = {}) {
      if (typeof w.addDocumentHistory !== "function" || !w.electronAPI?.listInvoiceFiles) {
        return Promise.resolve(false);
      }
      const normalized = normalizeHistoryTypeValue(docType || historyModalState.docType || "facture");
      const existing = historyRefreshQueue.get(normalized);
      if (existing?.tail) {
        if (historyModalStatus && isHistoryModalOpen()) {
          historyModalStatus.textContent = "Actualisation des documents...";
        }
        if (!force) return existing.tail;
        const forcedToken = reserveHistoryRefreshToken(normalized);
        const chained = existing.tail.then(() => runHistoryRefresh(normalized, forcedToken));
        return setHistoryRefreshTail(normalized, chained);
      }
      return setHistoryRefreshTail(normalized, runHistoryRefresh(normalized));
    }

    const normalizeDocTypeValue = (value) =>
      normalizeHistoryTypeValue(value, historyModalState.docType || "facture");
    const updateHistoryModalTitle = (docType) => {
      if (!historyModalTitle) return;
      const label = docHistoryDisplayLabel(docType);
      historyModalTitle.textContent = label ? `${HISTORY_MODAL_BASE_TITLE} - ${label}` : HISTORY_MODAL_BASE_TITLE;
    };
    const updateHistoryModalPartyLabels = (docType) => {
      const labels = getHistoryPartyLabels(docType);
      if (docHistoryFilterQueryLabel) {
        docHistoryFilterQueryLabel.textContent = labels.filterLabel;
      }
      if (docHistoryFilterQuery) {
        docHistoryFilterQuery.placeholder = labels.filterPlaceholder;
      }
    };
    updateHistoryModalTitle(historyModalState.docType);
    updateHistoryModalPartyLabels(historyModalState.docType);

    const metaApi = numbering || {};
    const getInvoiceMeta =
      metaApi.getInvoiceMeta ||
      function fallbackMeta() {
        const st = SEM.state || (SEM.state = {});
        return st.meta || (st.meta = {});
      };
    const normalizeInvoiceLength = metaApi.normalizeInvoiceLength || ((value, fallback) => Number(value) || Number(fallback) || 4);
    const getInvoiceYear = metaApi.getInvoiceYear || (() => null);
    const clearPendingNumberLocal = metaApi.clearPendingNumberLocal || (() => {});
    const syncInvoiceNumberControls = metaApi.syncInvoiceNumberControls || (() => {});
    const elements = metaApi.elements || {};
    const invNumberInput = elements.invNumberInput;
    const invNumberLengthSelect = elements.invNumberLengthSelect;
    const EDIT_LOCK_PING_MS = 60000;
    const editLocks =
      (SEM.editLocks instanceof Map && SEM.editLocks) || (SEM.editLocks = new Map());
    let activeDocKey = "";

    const stopEditLockHeartbeat = (docKey) => {
      const entry = editLocks.get(docKey);
      if (entry?.heartbeat) {
        clearInterval(entry.heartbeat);
        entry.heartbeat = null;
      }
    };

    const startEditLockHeartbeat = (docKey, lockId) => {
      stopEditLockHeartbeat(docKey);
      if (typeof w.electronAPI?.docLockTouch !== "function") return;
      const entry = editLocks.get(docKey);
      if (!entry) return;
      entry.heartbeat = setInterval(async () => {
        try {
          await w.electronAPI.docLockTouch({ docKey, lockId });
        } catch (err) {
          console.warn("edit lock refresh failed", err);
        }
      }, EDIT_LOCK_PING_MS);
    };

    const releaseDocumentEditLock = async (path) => {
      const targetPath = path || activeDocKey;
      if (!targetPath) return { ok: true, released: false };
      const entry = editLocks.get(targetPath);
      stopEditLockHeartbeat(targetPath);
      editLocks.delete(targetPath);
      if (targetPath === activeDocKey) activeDocKey = "";
      if (!entry?.lockId || typeof w.electronAPI?.docLockRelease !== "function") {
        return { ok: true, released: true, skipped: !entry?.lockId };
      }
      try {
        return await w.electronAPI.docLockRelease({ docKey: targetPath, lockId: entry.lockId });
      } catch (err) {
        console.warn("edit lock release failed", err);
        return { ok: false, error: String(err?.message || err) };
      }
    };

    const touchDocumentEditLock = async (docKey, lockId) => {
      const targetKey = docKey || activeDocKey;
      if (!targetKey) return { ok: false, error: "Document introuvable." };
      const entry = editLocks.get(targetKey);
      const effectiveLockId = lockId || entry?.lockId || "";
      if (!effectiveLockId) return { ok: false, error: "Verrou de document introuvable." };
      if (typeof w.electronAPI?.docLockTouch !== "function") return { ok: true, skipped: true };
      try {
        const res = await w.electronAPI.docLockTouch({ docKey: targetKey, lockId: effectiveLockId });
        if (!res?.ok) {
          return { ok: false, locked: !!res?.locked, error: res?.error || "Document verrouille." };
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: String(err?.message || err) };
      }
    };

    const acquireDocumentEditLock = async (entry) => {
      if (!entry || !entry.path) return { ok: false, error: "Document introuvable." };
      const targetPath = entry.path;
      if (activeDocKey && activeDocKey !== targetPath) {
        try {
          await releaseDocumentEditLock(activeDocKey);
        } catch {}
      }
      if (typeof w.electronAPI?.docLockAcquire !== "function") {
        return { ok: false, error: "Verrou indisponible." };
      }
      let res = null;
      try {
        res = await w.electronAPI.docLockAcquire({ docKey: targetPath });
      } catch (err) {
        return { ok: false, error: String(err?.message || err) };
      }
      if (!res?.ok) {
        return { ok: false, locked: !!res?.locked, error: res?.error || "Document verrouille." };
      }
      editLocks.set(targetPath, { lockId: res.lockId, heartbeat: null });
      activeDocKey = targetPath;
      startEditLockHeartbeat(targetPath, res.lockId);
      return { ok: true, lockId: res.lockId };
    };

    w.docLockAcquire = acquireDocumentEditLock;
    w.docLockTouch = touchDocumentEditLock;
    w.docLockRelease = releaseDocumentEditLock;
    w.releaseDocumentEditLock = releaseDocumentEditLock;
    w.acquireDocumentEditLock = acquireDocumentEditLock;
    if (!w.__docEditLockUnloadBound) {
      w.__docEditLockUnloadBound = true;
      w.addEventListener("pagehide", () => {
        releaseDocumentEditLock();
      });
    }

    const getAllHistoryEntries = (docType) => {
      const fnFull = typeof w.getDocumentHistoryFull === "function" ? w.getDocumentHistoryFull : null;
      if (fnFull) return fnFull(docType);
      return typeof w.getDocumentHistory === "function" ? w.getDocumentHistory(docType) : [];
    };

    async function pruneMissingHistoryEntries(docType) {
      if (!w.electronAPI?.listInvoiceFiles) return 0;
      if (typeof w.getDocumentHistoryFull !== "function") return 0;
      if (typeof w.removeDocumentHistory !== "function") return 0;
      const normalized = normalizeHistoryTypeValue(docType || historyModalState.docType || "facture");
      try {
        const res = await w.electronAPI.listInvoiceFiles({ docType: normalized });
        if (!res?.ok || !Array.isArray(res.items)) return 0;
        const existingPaths = new Set(
          res.items.map((item) => (item && item.path ? String(item.path) : null)).filter(Boolean)
        );
        const current = getAllHistoryEntries(normalized);
        const staleEntries = Array.isArray(current)
          ? current.filter((entry) => entry?.path && !existingPaths.has(entry.path))
          : [];
        staleEntries.forEach((entry) => {
          try {
            w.removeDocumentHistory(normalized, entry.path);
          } catch (err) {
            console.warn("pruneMissingHistoryEntries remove failed", err);
          }
        });
        if (staleEntries.length && typeof w.recomputeDocumentNumbering === "function") {
          try {
            w.recomputeDocumentNumbering(normalized);
          } catch (err) {
            console.warn("pruneMissingHistoryEntries recompute failed", err);
          }
        }
        return staleEntries.length;
      } catch (err) {
        console.warn("pruneMissingHistoryEntries failed", err);
        return 0;
      }
    }

    const isHistoryModalOpen = () =>
      !!(
        historyModal &&
        historyModal.classList.contains("is-open") &&
        historyModal.getAttribute("aria-hidden") === "false"
      );

    // Prevent closing the history modal with Escape when another dialog is on top (e.g. swbDialog).
    const isAnotherDialogOpen = () => {
      const overlays = Array.from(document.querySelectorAll(".swbDialog"));
      return overlays.some((overlay) => {
        if (!overlay || overlay === historyModal) return false;
        if (overlay.hidden || overlay.getAttribute("aria-hidden") === "true") return false;
        const inlineDisplay = overlay.style?.display || "";
        if (inlineDisplay && inlineDisplay.toLowerCase() === "none") return false;
        try {
          const computed = window.getComputedStyle(overlay);
          if (computed.display === "none" || computed.visibility === "hidden") return false;
        } catch {}
        return true;
      });
    };

    function applyHistoryEntryToMeta(entry, docTypeHint) {
      if (!entry || !entry.path) return;
      const meta = getInvoiceMeta();
      if (!meta || typeof meta !== "object") return;
      const normalizedType = String(docTypeHint || entry.docType || meta.docType || "facture").toLowerCase();
      meta.historyPath = entry.path;
      meta.historyDocType = normalizedType;
      if (normalizedType === "facture") {
        meta.status =
          normalizeDocHistoryStatusValue(entry.status) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      } else if ("status" in meta) {
        delete meta.status;
      }
      if ("historyStatus" in meta) delete meta.historyStatus;
    }

    function updateActiveInvoiceHistoryStatus(path, statusValue) {
      if (!path) return;
      const meta = getInvoiceMeta();
      if (!meta || meta.historyPath !== path) return;
      if (meta.historyDocType && meta.historyDocType !== "facture") return;
      meta.status =
        normalizeDocHistoryStatusValue(statusValue) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      if ("historyStatus" in meta) delete meta.historyStatus;
    }

    function injectHistoryStatusIntoRawData(rawData, statusValue) {
      return;
    }

    const parsePaidAmountInput = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return null;
      const normalized = raw.replace(/\s+/g, "").replace(",", ".");
      const num = Number(normalized);
      return Number.isFinite(num) ? num : null;
    };

    const parseNumberInput = (value, fallback = null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return fallback;
      const normalized = raw.replace(/\s+/g, "").replace(",", ".");
      const num = Number(normalized);
      return Number.isFinite(num) ? num : fallback;
    };

    const pickInvoiceData = (raw) =>
      raw && typeof raw === "object"
        ? raw.data && typeof raw.data === "object"
          ? raw.data
          : raw
        : {};

    const resolveLedgerClientInfo = async (entry) => {
      if (!entry?.path || !w.electronAPI?.openInvoiceJSON) return null;
      try {
        const loaded = await w.electronAPI.openInvoiceJSON({
          path: entry.path,
          docType: "facture"
        });
        const data = pickInvoiceData(loaded);
        const client = data?.client && typeof data.client === "object" ? data.client : {};
        const clientPath =
          typeof client.__path === "string" && client.__path.trim()
            ? client.__path.trim()
            : "";
        const taxId = String(
          client?.identifiantFiscal || client?.vat || client?.tva || ""
        ).trim();
        if (!clientPath) return null;
        return { clientPath, taxId, invoiceData: data };
      } catch (err) {
        console.warn("doc-history ledger client resolve failed", err);
        return null;
      }
    };

    const LEDGER_UNPAID_SOURCE = "invoice_unpaid";
    const normalizeLedgerAmount = (value) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return null;
      return Math.round((num + Number.EPSILON) * 1000) / 1000;
    };
    const sanitizeLedgerInvoiceNumber = (value) => {
      const raw = String(value || "").trim();
      if (!raw || /^sqlite:\/\//i.test(raw)) return "";
      return raw;
    };
    const buildInvoiceLedgerRef = (entry, loadedInvoiceData = null) => {
      const loaded = loadedInvoiceData && typeof loadedInvoiceData === "object" ? loadedInvoiceData : {};
      const invoicePath = String(entry?.path || loaded?.path || "").trim();
      const invoiceNumber = sanitizeLedgerInvoiceNumber(
        String(
          entry?.number ||
            entry?.name ||
            loaded?.number ||
            loaded?.name ||
            loaded?.meta?.number ||
            ""
        ).trim()
      );
      const invoiceDate = String(entry?.date || loaded?.date || "").trim();
      const invoiceKey = invoiceNumber && invoiceDate ? `${invoiceNumber}__${invoiceDate}` : "";
      const sourceId = String(invoiceKey || invoicePath || invoiceNumber).trim();
      return {
        invoicePath,
        invoiceNumber,
        invoiceDate,
        invoiceKey,
        sourceId
      };
    };
    const journalPaymentDeltaToLedger = async (
      entry,
      paidAmount,
      paymentDate,
      ledgerType,
      ledgerSource
    ) => {
      if (!w.electronAPI?.addClientLedgerEntry) return false;
      const normalizedAmount = normalizeLedgerAmount(paidAmount);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return false;
      const resolved = await resolveLedgerClientInfo(entry);
      if (!resolved?.clientPath) {
        console.warn("doc-history ledger entry skipped: client path missing");
        return false;
      }
      const effectiveDate = String(
        paymentDate || entry?.paymentDate || entry?.date || new Date().toISOString().slice(0, 10)
      ).trim();
      const invoiceRef = buildInvoiceLedgerRef(entry, resolved?.invoiceData);
      const sourceId = invoiceRef.sourceId;
      if (!sourceId) return false;
      const invoicePath = invoiceRef.invoicePath;
      const invoiceNumber = invoiceRef.invoiceNumber;
      const paymentMode =
        ledgerSource === "invoice_payment"
          ? String(entry?.paymentMethod || entry?.mode || "").trim()
          : "";
      const paymentRef =
        ledgerSource === "invoice_payment"
          ? String(entry?.paymentReference || entry?.paymentRef || "").trim()
          : "";
      const payload = {
        path: resolved.clientPath,
        taxId: resolved.taxId || "",
        effectiveDate,
        type: ledgerType,
        amount: normalizedAmount,
        source: ledgerSource,
        sourceId,
        invoicePath,
        invoiceNumber,
        paymentMode,
        paymentRef
      };
      const result = await w.electronAPI.addClientLedgerEntry(payload);
      if (result?.ok) {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
        return true;
      }
      if (result?.error) {
        console.warn("doc-history ledger entry failed", result.error);
      }
      return false;
    };

    const removePaidInvoiceLedgerEntries = async (entry) => {
      if (!entry || !w.electronAPI?.readClientLedger || !w.electronAPI?.deleteClientLedgerEntry) {
        return 0;
      }
      const resolved = await resolveLedgerClientInfo(entry);
      if (!resolved?.clientPath) {
        console.warn("doc-history ledger entry skipped: client path missing");
        return 0;
      }
      const invoiceRef = buildInvoiceLedgerRef(entry, resolved?.invoiceData);
      if (!invoiceRef.invoicePath && !invoiceRef.invoiceNumber && !invoiceRef.invoiceKey) return 0;
      const ledgerRes = await w.electronAPI.readClientLedger({ path: resolved.clientPath });
      if (!ledgerRes?.ok) return 0;
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      const targets = items.filter(
        (item) => {
          if (String(item?.source || "").trim().toLowerCase() !== "invoice_payment") return false;
          const itemSourceId = String(item?.sourceId || "").trim();
          const itemInvoicePath = String(item?.invoicePath || "").trim();
          const itemInvoiceNumber = sanitizeLedgerInvoiceNumber(item?.invoiceNumber);
          if (
            invoiceRef.invoicePath &&
            (itemSourceId === invoiceRef.invoicePath || itemInvoicePath === invoiceRef.invoicePath)
          ) {
            return true;
          }
          if (
            invoiceRef.invoiceNumber &&
            (itemSourceId === invoiceRef.invoiceNumber || itemInvoiceNumber === invoiceRef.invoiceNumber)
          ) {
            return true;
          }
          if (invoiceRef.invoiceKey && itemSourceId === invoiceRef.invoiceKey) {
            return true;
          }
          return false;
        }
      );
      if (!targets.length) return 0;
      let removed = 0;
      for (const target of targets) {
        const entryId = String(target?.id || "").trim();
        if (!entryId) continue;
        const res = await w.electronAPI.deleteClientLedgerEntry({ id: entryId });
        if (res?.ok) removed += Number(res.removed) || 1;
      }
      if (removed > 0) {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
      }
      return removed;
    };

    const syncUnpaidInvoiceLedgerEntry = async (entry) => {
      if (
        !entry ||
        !w.electronAPI?.addClientLedgerEntry ||
        !w.electronAPI?.readClientLedger ||
        !w.electronAPI?.deleteClientLedgerEntry
      ) {
        return false;
      }
      const resolved = await resolveLedgerClientInfo(entry);
      if (!resolved?.clientPath) {
        console.warn("doc-history ledger entry skipped: client path missing");
        return false;
      }
      const invoiceRef = buildInvoiceLedgerRef(entry, resolved?.invoiceData);
      const invoicePath = invoiceRef.invoicePath;
      if (!invoicePath) return false;
      const invoiceNumber = invoiceRef.invoiceNumber;
      const invoiceSourceId = invoiceRef.sourceId || invoicePath;
      const totalValue = resolveHistoryEntryTotal(entry);
      const normalizedAmount = normalizeLedgerAmount(totalValue);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return false;

      const ledgerRes = await w.electronAPI.readClientLedger({ path: resolved.clientPath });
      if (!ledgerRes?.ok) return false;
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      const existing = items.filter((item) => {
        const sourceType = String(item?.source || "").trim().toLowerCase();
        if (sourceType !== LEDGER_UNPAID_SOURCE) return false;
        const itemSourceId = String(item?.sourceId || "").trim();
        const itemInvoicePath = String(item?.invoicePath || "").trim();
        const itemInvoiceNumber = sanitizeLedgerInvoiceNumber(item?.invoiceNumber);
        if (invoicePath && (itemSourceId === invoicePath || itemInvoicePath === invoicePath)) {
          return true;
        }
        if (invoiceNumber && (itemSourceId === invoiceNumber || itemInvoiceNumber === invoiceNumber)) {
          return true;
        }
        if (invoiceRef.invoiceKey && itemSourceId === invoiceRef.invoiceKey) {
          return true;
        }
        return false;
      });
      if (existing.length === 1) {
        const one = existing[0];
        const existingType = String(one?.type || "").trim().toLowerCase();
        const existingAmount = normalizeLedgerAmount(one?.amount);
        const existingInvoiceNumber = sanitizeLedgerInvoiceNumber(one?.invoiceNumber);
        const invoiceNumberMatches = !invoiceNumber || existingInvoiceNumber === invoiceNumber;
        if (existingType === "debit" && existingAmount === normalizedAmount && invoiceNumberMatches) {
          return true;
        }
      }
      for (const row of existing) {
        const entryId = String(row?.id || "").trim();
        if (!entryId) continue;
        await w.electronAPI.deleteClientLedgerEntry({ id: entryId });
      }
      const payload = {
        path: resolved.clientPath,
        taxId: resolved.taxId || "",
        effectiveDate: String(entry?.date || entry?.createdAt || new Date().toISOString()).trim(),
        type: "debit",
        amount: normalizedAmount,
        source: LEDGER_UNPAID_SOURCE,
        sourceId: invoiceSourceId,
        invoicePath,
        invoiceNumber
      };
      const addRes = await w.electronAPI.addClientLedgerEntry(payload);
      if (addRes?.ok) {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
        return true;
      }
      if (addRes?.error) {
        console.warn("doc-history ledger entry failed", addRes.error);
      }
      return false;
    };

    const removeInvoiceLedgerEntries = async (entry) => {
      if (!entry || !w.electronAPI?.readClientLedger || !w.electronAPI?.deleteClientLedgerEntry) {
        return 0;
      }
      const resolved = await resolveLedgerClientInfo(entry);
      if (!resolved?.clientPath) {
        console.warn("doc-history ledger entry skipped: client path missing");
        return 0;
      }
      const invoiceRef = buildInvoiceLedgerRef(entry, resolved?.invoiceData);
      const invoicePath = invoiceRef.invoicePath;
      const invoiceNumber = invoiceRef.invoiceNumber;
      const invoiceKey = invoiceRef.invoiceKey;
      if (!invoicePath && !invoiceNumber && !invoiceKey) return 0;
      const ledgerRes = await w.electronAPI.readClientLedger({ path: resolved.clientPath });
      if (!ledgerRes?.ok) return 0;
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      const targets = items.filter((item) => {
        const sourceType = String(item?.source || "").trim().toLowerCase();
        if (
          sourceType !== "invoice" &&
          sourceType !== "invoice_unpaid" &&
          sourceType !== "invoice_payment"
        ) {
          return false;
        }
        const itemSourceId = String(item?.sourceId || "").trim();
        const itemInvoicePath = String(item?.invoicePath || "").trim();
        const itemInvoiceNumber = String(item?.invoiceNumber || "").trim();
        if (invoicePath && (itemSourceId === invoicePath || itemInvoicePath === invoicePath)) {
          return true;
        }
        if (invoiceNumber && (itemSourceId === invoiceNumber || itemInvoiceNumber === invoiceNumber)) {
          return true;
        }
        if (invoiceKey && itemSourceId === invoiceKey) {
          return true;
        }
        return false;
      });
      if (!targets.length) return 0;
      let removed = 0;
      for (const target of targets) {
        const entryId = String(target?.id || "").trim();
        if (!entryId) continue;
        const res = await w.electronAPI.deleteClientLedgerEntry({ id: entryId });
        if (res?.ok) removed += Number(res.removed) || 1;
      }
      if (removed > 0) {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
      }
      return removed;
    };

    const cloneInvoiceData = (raw) => {
      try {
        return JSON.parse(JSON.stringify(pickInvoiceData(raw) || {}));
      } catch {
        const src = pickInvoiceData(raw) || {};
        return { ...src };
      }
    };

    const ensureHistorySnapshotDefaults = (snapshot) => {
      const st = snapshot && typeof snapshot === "object" ? snapshot : {};
      if (!Array.isArray(st.items)) st.items = [];
      if (!st.meta || typeof st.meta !== "object") st.meta = {};
      if (!st.meta.extras || typeof st.meta.extras !== "object") {
        st.meta.extras = { shipping: {}, dossier: {}, deplacement: {}, stamp: {} };
      } else {
        st.meta.extras.shipping = st.meta.extras.shipping || {};
        st.meta.extras.dossier = st.meta.extras.dossier || {};
        st.meta.extras.deplacement = st.meta.extras.deplacement || {};
        st.meta.extras.stamp = st.meta.extras.stamp || {};
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
        console.warn("doc-history computeTotalsForSnapshot failed", err);
      } finally {
        if (sem.state !== originalState) sem.state = originalState;
      }
      return totals;
    };

    const copyTextToClipboard = async (text) => {
      const value = String(text || "").trim();
      if (!value) return false;
      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          return true;
        } catch {}
      }
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand && document.execCommand("copy");
        textarea.remove();
        return !!ok;
      } catch {
        return false;
      }
    };

    const resolveHistoryEntryTotal = (entry) => {
      const totalTTC = Number(entry?.totalTTC);
      if (Number.isFinite(totalTTC)) return totalTTC;
      const totalHT = Number(entry?.totalHT);
      if (Number.isFinite(totalHT)) return totalHT;
      return null;
    };

    function applyHistoryPaymentUpdate(entry, paymentUpdate) {
      if (!entry || !paymentUpdate) return null;
      const paidValue = Number(paymentUpdate.paid);
      if (!Number.isFinite(paidValue) || paidValue < 0) return null;
      const total = resolveHistoryEntryTotal(entry);
      const balanceDue = Number.isFinite(total) ? Math.max(0, total - paidValue) : null;
      entry.acompteEnabled = true;
      entry.paid = paidValue;
      if (Number.isFinite(balanceDue)) entry.balanceDue = balanceDue;
      return { paid: paidValue, balanceDue };
    }

    async function persistHistoryStatusToDisk(
      entry,
      statusValue,
      paymentUpdate,
      paymentMethod,
      paymentDate,
      paymentReference
    ) {
      if (!entry?.path || !statusValue) return;
      if (!w.electronAPI?.openInvoiceJSON || !w.electronAPI?.saveInvoiceJSON) return;
      const targetType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
      if (targetType !== "facture") return;
      const normalizedStatus = normalizeDocHistoryStatusValue(statusValue);
      if (!normalizedStatus) return;
      const shouldClearPaymentMeta = isUnpaidStatus(normalizedStatus);
      try {
        const loaded = await w.electronAPI.openInvoiceJSON({ path: entry.path, docType: targetType });
        if (!loaded || typeof loaded !== "object") return;
        const root = loaded;
        const dataTarget =
          root.data && typeof root.data === "object" ? root.data : root;
        const metaTarget =
          dataTarget.meta && typeof dataTarget.meta === "object" ? dataTarget.meta : (dataTarget.meta = {});
        if (shouldClearPaymentMeta) {
          delete metaTarget.paymentMethod;
          delete metaTarget.paymentDate;
          delete metaTarget.paymentReference;
          delete metaTarget.paymentRef;
        } else {
          if (paymentMethod) metaTarget.paymentMethod = paymentMethod;
          if (paymentDate) metaTarget.paymentDate = paymentDate;
          if (typeof paymentReference === "string") {
            metaTarget.paymentReference = paymentReference;
            metaTarget.paymentRef = paymentReference;
          }
        }
        if (paymentUpdate && Number.isFinite(paymentUpdate.paid)) {
          metaTarget.acompte =
            metaTarget.acompte && typeof metaTarget.acompte === "object" ? metaTarget.acompte : {};
          metaTarget.acompte.enabled = true;
          metaTarget.acompte.paid = paymentUpdate.paid;
          if (shouldClearPaymentMeta) {
            delete metaTarget.acompte.base;
            delete metaTarget.acompte.remaining;
          }
        } else if (shouldClearPaymentMeta && metaTarget.acompte) {
          metaTarget.acompte.enabled = true;
          metaTarget.acompte.paid = 0;
          delete metaTarget.acompte.base;
          delete metaTarget.acompte.remaining;
        }
        if (root !== dataTarget) {
          const rootMeta =
            root.meta && typeof root.meta === "object" ? root.meta : (root.meta = {});
          if (shouldClearPaymentMeta) {
            delete rootMeta.paymentMethod;
            delete rootMeta.paymentDate;
            delete rootMeta.paymentReference;
            delete rootMeta.paymentRef;
          } else {
            if (paymentMethod) rootMeta.paymentMethod = paymentMethod;
            if (paymentDate) rootMeta.paymentDate = paymentDate;
            if (typeof paymentReference === "string") {
              rootMeta.paymentReference = paymentReference;
              rootMeta.paymentRef = paymentReference;
            }
          }
          if (paymentUpdate && Number.isFinite(paymentUpdate.paid)) {
            rootMeta.acompte = rootMeta.acompte && typeof rootMeta.acompte === "object" ? rootMeta.acompte : {};
            rootMeta.acompte.enabled = true;
            rootMeta.acompte.paid = paymentUpdate.paid;
            if (shouldClearPaymentMeta) {
              delete rootMeta.acompte.base;
              delete rootMeta.acompte.remaining;
            }
          } else if (shouldClearPaymentMeta && rootMeta.acompte) {
            rootMeta.acompte.enabled = true;
            rootMeta.acompte.paid = 0;
            delete rootMeta.acompte.base;
            delete rootMeta.acompte.remaining;
          }
        }
        if (paymentUpdate && Number.isFinite(paymentUpdate.paid)) {
          const totals =
            dataTarget.totals && typeof dataTarget.totals === "object"
              ? dataTarget.totals
              : (dataTarget.totals = {});
          const totalsAcompte =
            totals.acompte && typeof totals.acompte === "object" ? totals.acompte : (totals.acompte = {});
          totalsAcompte.enabled = true;
          totalsAcompte.paid = paymentUpdate.paid;
          if (Number.isFinite(paymentUpdate.balanceDue)) {
            totalsAcompte.remaining = paymentUpdate.balanceDue;
            totals.balanceDue = paymentUpdate.balanceDue;
          }
        } else if (shouldClearPaymentMeta) {
          const totals =
            dataTarget.totals && typeof dataTarget.totals === "object"
              ? dataTarget.totals
              : (dataTarget.totals = {});
          const totalsAcompte =
            totals.acompte && typeof totals.acompte === "object" ? totals.acompte : (totals.acompte = {});
          const totalValue = Number(
            totals.totalTTC ?? totals.total ?? totals.grand ?? totals.totalHT ?? totals.totalHt ?? NaN
          );
          totalsAcompte.enabled = true;
          totalsAcompte.paid = 0;
          if (Number.isFinite(totalValue)) {
            totalsAcompte.base = totalValue;
            totalsAcompte.remaining = totalValue;
            totals.balanceDue = totalValue;
          } else {
            delete totalsAcompte.base;
            delete totalsAcompte.remaining;
            delete totals.balanceDue;
          }
        }
        await w.electronAPI.saveInvoiceJSON({
          data: root,
          meta: {
            silent: true,
            to: "invoices",
            historyPath: entry.path,
            historyDocType: targetType,
            status: normalizedStatus,
            forceOverwrite: true
          },
          forceOverwrite: true
        });
      } catch (err) {
        console.warn("persist history status failed", err);
      }
    }

    function persistDocHistoryStatus(
      entry,
      statusValue,
      paymentUpdate,
      paymentMethod,
      paymentDate,
      paymentReference
    ) {
      if (!entry || !entry.path) return;
      const targetType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
      if (targetType !== "facture") return;
      const normalizedStatus =
        normalizeDocHistoryStatusValue(statusValue) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      if (typeof w.setDocumentHistoryStatus === "function") {
        try {
          w.setDocumentHistoryStatus(targetType, entry.path, normalizedStatus);
        } catch (err) {
          console.warn("setDocumentHistoryStatus failed", err);
        }
      }
      persistHistoryStatusToDisk(
        entry,
        normalizedStatus,
        paymentUpdate,
        paymentMethod,
        paymentDate,
        paymentReference
      );
      if (paymentUpdate && typeof w.addPaymentHistoryEntry === "function") {
        const historyAmount = Number(paymentUpdate.historyAmount);
        if (Number.isFinite(historyAmount) && historyAmount > 0) {
          const resolvedPaymentDate = String(paymentDate || entry?.paymentDate || "").trim();
          const historyDate =
            resolvedPaymentDate || new Date().toISOString().slice(0, 10);
          const addHistoryEntry = () =>
            w.addPaymentHistoryEntry({
              invoiceNumber: entry?.number || entry?.name || "",
              invoicePath: entry.path,
              clientName: entry?.clientName || "",
              clientAccount: entry?.clientAccount || "",
              paymentDate: historyDate,
              savedAt: historyDate,
              amount: historyAmount,
              balanceDue: Number(paymentUpdate.historyBalanceDue ?? entry?.balanceDue),
              currency: entry?.currency || "",
              mode: entry?.paymentMethod || entry?.mode || "",
              paymentRef: entry?.paymentReference || entry?.paymentRef || "",
              entryType: "invoice"
            });
          const shouldReplaceHistory =
            normalizedStatus === "partiellement-payee" &&
            typeof w.removePaymentHistoryForInvoice === "function";
          const runWithHydration = (handler) => {
            if (typeof w.hydratePaymentHistory === "function") {
              w.hydratePaymentHistory({ skipInvoiceSync: true })
                .then(handler)
                .catch(() => handler());
            } else {
              handler();
            }
          };
          if (shouldReplaceHistory) {
            runWithHydration(() => {
              w.removePaymentHistoryForInvoice(entry.path);
              addHistoryEntry();
            });
          } else {
            runWithHydration(addHistoryEntry);
          }
        }
      }
      if (isNoPaymentMethodStatus(normalizedStatus) && typeof w.removePaymentHistoryForInvoice === "function") {
        if (typeof w.hydratePaymentHistory === "function") {
          w.hydratePaymentHistory()
            .then(() => w.removePaymentHistoryForInvoice(entry.path))
            .catch(() => {});
        } else {
          w.removePaymentHistoryForInvoice(entry.path);
        }
      }
    }

    const isSameAmount = (left, right) => {
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      return Math.abs(left - right) < 0.01;
    };

    function ensurePaidStatusIfSettled(entry, docType) {
      const normalizedType = String(docType || entry?.docType || historyModalState.docType || "facture")
        .trim()
        .toLowerCase();
      if (normalizedType !== "facture") return;
      const currentStatus = normalizeDocHistoryStatusValue(entry?.status);
      if (currentStatus && currentStatus !== "partiellement-payee" && currentStatus !== "payee") {
        return;
      }
      const paid = Number(entry?.paid);
      const balanceDue = Number(entry?.balanceDue);
      if (!Number.isFinite(paid) || !Number.isFinite(balanceDue)) return;
      if (balanceDue > 0.009) return;
      const totalTTC = Number(entry?.totalTTC);
      const totalHT = Number(entry?.totalHT);
      let matchesTotal = false;
      if (Number.isFinite(totalTTC)) {
        matchesTotal = isSameAmount(paid, totalTTC);
      } else if (Number.isFinite(totalHT)) {
        matchesTotal = isSameAmount(paid, totalHT);
      }
      if (!matchesTotal && Number.isFinite(totalHT) && Number.isFinite(totalTTC)) {
        if (isSameAmount(totalHT, totalTTC)) {
          matchesTotal = isSameAmount(paid, totalHT);
        }
      }
      if (!matchesTotal) return;
      if (currentStatus === "payee") return;
      entry.status = "payee";
      persistDocHistoryStatus(entry, "payee");
    }

    function openItemsDocOptionsModal(options = {}) {
      const modalApi = w.AppInit?.itemsDocOptionsModalApi;
      if (typeof modalApi?.openItemsModal === "function") {
        return !!modalApi.openItemsModal(options);
      }
      return false;
    }

    function resolveActiveDocumentModelName() {
      const meta = getInvoiceMeta();
      if (!meta || typeof meta !== "object") return "";
      return String(
        meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || ""
      ).trim();
    }

    function syncItemsModalClientFieldsFromState() {
      const modal = getEl("itemsDocOptionsModal");
      if (!modal || modal.getAttribute("aria-hidden") === "true") return;
      const resolveItemsModalDocType = () => {
        const modalDocType = String(
          modal.querySelector?.("#docMetaBoxNewDoc #docType")?.value ||
            modal.querySelector?.("#docType")?.value ||
            ""
        )
          .trim()
          .toLowerCase();
        const stateDocType = String(SEM?.state?.meta?.docType || "")
          .trim()
          .toLowerCase();
        const historyDocType = String(historyModalState.docType || "")
          .trim()
          .toLowerCase();
        return modalDocType || stateDocType || historyDocType || "facture";
      };
      const preferredScopeSelector =
        resolveItemsModalDocType() === "fa" ? "#FournisseurBoxNewDoc" : "#clientBoxNewDoc";
      const scope =
        modal.querySelector(preferredScopeSelector) ||
        modal.querySelector("#clientBoxNewDoc, #FournisseurBoxNewDoc");
      if (!scope) return;
      const CLIENT_VENDOR_FORM_ID_ALIASES = {
        clientType: "fournisseurType",
        clientTypeLabel: "fournisseurTypeLabel",
        clientTypeMenu: "fournisseurTypeMenu",
        clientTypeDisplay: "fournisseurTypeDisplay",
        clientTypePanel: "fournisseurTypePanel",
        clientName: "fournisseurName",
        clientBeneficiary: "fournisseurBeneficiary",
        clientAccount: "fournisseurAccount",
        clientSoldClient: "fournisseurSoldClient",
        clientVat: "fournisseurVat",
        clientStegRef: "fournisseurStegRef",
        clientPhone: "fournisseurPhone",
        clientEmail: "fournisseurEmail",
        clientAddress: "fournisseurAddress",
        clientIdLabel: "fournisseurIdLabel"
      };
      const CLIENT_VENDOR_FORM_ID_REVERSE = Object.entries(CLIENT_VENDOR_FORM_ID_ALIASES).reduce(
        (acc, [clientId, vendorId]) => {
          if (vendorId) acc[vendorId] = clientId;
          return acc;
        },
        {}
      );
      const toCanonicalClientFormId = (id) => CLIENT_VENDOR_FORM_ID_REVERSE[id] || id;
      const resolveScopeEntityType = () => (scope.id === "FournisseurBoxNewDoc" ? "vendor" : "client");
      const resolveClientFormIdCandidates = (id) => {
        const canonicalId = toCanonicalClientFormId(id);
        const vendorId = CLIENT_VENDOR_FORM_ID_ALIASES[canonicalId] || "";
        if (resolveScopeEntityType() === "vendor") {
          return [vendorId, canonicalId].filter(Boolean);
        }
        return [canonicalId, vendorId].filter(Boolean);
      };
      const queryScopedClientField = (id) => {
        const candidates = resolveClientFormIdCandidates(id);
        for (const candidate of candidates) {
          const match = scope.querySelector(`#${candidate}`);
          if (match) return match;
        }
        return null;
      };
      const st = SEM?.state || w.state || {};
      const client = st?.client || {};
      const normalize = (value) => (value ?? "").toString();
      const typeRaw = String(client.type || "").toLowerCase();
      const type =
        typeRaw === "particulier" || typeRaw === "personne_physique" ? typeRaw : "societe";
      const isParticulier = type === "particulier";
      const setScopedVal = (id, value) => {
        const target = queryScopedClientField(id);
        if (target && "value" in target) {
          target.value = value;
        }
      };
      setScopedVal("clientType", type);
      setScopedVal("clientName", normalize(client.name));
      setScopedVal("clientBeneficiary", normalize(client.benefit || client.beneficiary || ""));
      setScopedVal("clientAccount", normalize(client.account || ""));
      const vat =
        client.vat ||
        client.identifiantFiscal ||
        client.identifiant ||
        client.tva ||
        client.nif ||
        "";
      setScopedVal("clientVat", normalize(vat));
      setScopedVal("clientStegRef", normalize(client.stegRef || ""));
      setScopedVal(
        "clientSoldClient",
        normalize(
          typeof client.soldClient !== "undefined" ? client.soldClient : ""
        )
      );
      setScopedVal("clientPhone", normalize(client.phone || client.telephone || client.tel));
      setScopedVal("clientEmail", normalize(client.email));
      setScopedVal("clientAddress", normalize(client.address || client.adresse));

      const labelText = isParticulier ? "CIN / passeport" : "Matricule fiscal";
      const placeholder = isParticulier ? "CIN ou Passeport" : "ex: 1284118/W/A/M/000";
      const labelEl = queryScopedClientField("clientIdLabel");
      if (labelEl) labelEl.textContent = labelText;
      const vatInput = queryScopedClientField("clientVat");
      if (vatInput) vatInput.placeholder = placeholder;

      const displayEl = queryScopedClientField("clientTypeDisplay");
      if (displayEl) {
        displayEl.textContent =
          type === "particulier"
            ? "Particulier"
            : type === "personne_physique"
              ? "Personne physique"
              : "Societe / personne morale";
      }
      const panel = queryScopedClientField("clientTypePanel");
      if (panel) {
        panel.querySelectorAll("[data-client-type-option]").forEach((btn) => {
          const isMatch = btn.dataset.clientTypeOption === type;
          btn.classList.toggle("is-active", isMatch);
          btn.setAttribute("aria-selected", isMatch ? "true" : "false");
        });
      }
      const menu = queryScopedClientField("clientTypeMenu");
      if (menu && menu.open) {
        menu.open = false;
      }
      const toggle = menu?.querySelector("summary");
      if (toggle) {
        toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
      }

      if (typeof SEM?.refreshClientActionButtons === "function") {
        SEM.refreshClientActionButtons();
      }
      if (typeof SEM?.evaluateClientDirtyState === "function") {
        SEM.evaluateClientDirtyState();
      }
    }

    async function openHistoryEntry(entry) {
      if (!entry || !entry.path) return false;
      try {
        const lockResult = await acquireDocumentEditLock(entry);
        if (!lockResult?.ok) {
          const lockMessage = getMessage("DOCUMENT_EDIT_LOCKED", {
            fallbackText: lockResult?.error || "Document deja ouvert en modification.",
            fallbackTitle: "Modification impossible"
          });
          await w.showDialog?.(lockMessage.text, { title: lockMessage.title });
          return false;
        }
        const entryType = String(entry.docType || "facture");
          await (typeof w.onOpenInvoiceClick === "function"
            ? w.onOpenInvoiceClick({
                path: entry.path,
                docType: entryType,
                number: entry.number,
                skipClientInputs: true
              })
            : null);
        applyHistoryEntryToMeta(entry, entryType);
        renderHistoryList(entryType);
        syncInvoiceNumberControls({ force: true });
        return true;
      } catch (err) {
        console.error("openHistoryEntry error", err);
        try {
          await releaseDocumentEditLock(entry.path);
        } catch {}
        const openError = getMessage("OPEN_FAILED_GENERIC");
        await w.showDialog?.(String(err?.message || err || openError.text), { title: openError.title });
        return false;
      }
    }

    async function openHistoryEntryInItemsModal(entry, docTypeHint) {
      if (!entry) return false;
      const openedOk = await openHistoryEntry(entry);
      if (!openedOk) return false;
      const modalApi = w.AppInit?.itemsDocOptionsModalApi;
      const activeModel = resolveActiveDocumentModelName();
      const openedModal = openItemsDocOptionsModal({
        mode: "edit",
        docType: entry.docType || docTypeHint || historyModalState.docType,
        ...(activeModel ? { model: activeModel } : {})
      });
      if (openedModal && typeof modalApi?.setItemsModalTitle === "function") {
        modalApi.setItemsModalTitle({
          mode: "edit",
          docType: entry.docType || docTypeHint || historyModalState.docType
        });
      }
      if (openedModal) {
        syncItemsModalClientFieldsFromState();
        if (typeof modalApi?.syncDocMetaBoxFromState === "function") {
          modalApi.syncDocMetaBoxFromState();
        }
      }
      return openedOk;
    }

    function renderHistoryList(typeValue) {
      const docType = String(typeValue || "facture").toLowerCase();
      const entries = typeof w.getDocumentHistory === "function" ? w.getDocumentHistory(docType) : [];
      if (typeof w.recomputeDocumentNumbering === "function") {
        try {
          w.recomputeDocumentNumbering(docType);
        } catch (err) {
          console.warn("recomputeDocumentNumbering failed", err);
        }
      }
      if (!Array.isArray(entries) || entries.length === 0) {
        const meta = getInvoiceMeta();
        if (meta.docType === docType) {
          const yearKey = typeof meta.numberYear === "undefined" ? getInvoiceYear() : meta.numberYear;
          clearPendingNumberLocal(docType, meta.numberLength || 4, yearKey);
          meta.number = "";
          if (invNumberInput) invNumberInput.value = "";
          syncInvoiceNumberControls({ force: true, useNextIfEmpty: true });
        }
        return;
      }
    }

    async function deleteHistoryEntry(entry, docTypeHint) {
      if (!entry || !entry.path) return false;
      const docKey = String(entry.docType || docTypeHint || historyModalState.docType || "facture").toLowerCase();
      const labelBase = typeof w.docTypeLabel === "function" ? w.docTypeLabel(docKey) : "Document";
      const docLabel = entry.number ? `${labelBase} ${entry.number}` : labelBase;
      const deleteWarning = getMessage("HISTORY_FILE_DELETE_WARNING");
      const displayName = getDisplayFilename(entry.path) || stripJsonExtension(entry.path) || entry.path || "";
      const confirmMessage = `${displayName} - ${deleteWarning.text}`;
      const confirmRenderer =
        typeof document !== "undefined"
          ? (container) => {
              if (!container) return;
              container.textContent = "";
              const line = document.createElement("p");
              const strong = document.createElement("strong");
              strong.textContent = displayName;
              line.appendChild(strong);
              line.appendChild(document.createTextNode(` ${deleteWarning.text}`));
              container.appendChild(line);
            }
          : null;
      let confirmed = true;
      const isFacture = docKey === "facture";
      if (isFacture && typeof w.confirmFactureDeleteWithCode === "function" && isHistoryModalOpen()) {
        confirmed = await w.confirmFactureDeleteWithCode(confirmMessage, {
          title: deleteWarning.title || docLabel || "Supprimer",
          okText: "Supprimer",
          cancelText: "Annuler",
          displayName,
          warningText: deleteWarning.text
        });
      } else if (typeof w.showConfirm === "function") {
        confirmed = await w.showConfirm(confirmMessage, {
          title: deleteWarning.title || docLabel || "Supprimer",
          okText: "Supprimer",
          cancelText: "Annuler",
          renderMessage: confirmRenderer
        });
      } else if (typeof w.confirm === "function") {
        confirmed = w.confirm(confirmMessage);
      }
      if (!confirmed) return false;
      try {
        const deleteNumber = String(
          entry.number || entry.name || extractDocumentLabel(entry.path) || ""
        ).trim();
        if (w.electronAPI?.deleteInvoiceFile) {
          const res = await w.electronAPI.deleteInvoiceFile({
            id: entry.id,
            path: entry.path,
            number: deleteNumber,
            docType: docKey
          });
          if (res?.ok === false) {
            const errorText = String(res?.error || "");
            const isMissing = !!res?.missing || /introuvable/i.test(errorText);
            if (!isMissing) {
              const fallback = getMessage("HISTORY_FILE_DELETE_FAILED");
              await w.showDialog?.(errorText || fallback.text, {
                title: fallback.title || "Erreur"
              });
              return false;
            }
          }
        }
        if (typeof w.removeDocumentHistory === "function") {
          w.removeDocumentHistory(docKey, entry.path);
        }
        if (docKey === "facture" && typeof w.removePaymentHistoryForInvoice === "function") {
          if (typeof w.hydratePaymentHistory === "function") {
            try {
              await w.hydratePaymentHistory();
            } catch {}
          }
          try {
            w.removePaymentHistoryForInvoice(entry.path);
          } catch {}
        }
        await refreshHistoryFromDisk(docKey, { force: true });
        if (typeof w.recomputeDocumentNumbering === "function") {
          try {
            w.recomputeDocumentNumbering(docKey);
          } catch (err) {
            console.warn("recomputeDocumentNumbering failed", err);
          }
        }
        syncHistoryAfterChange(docKey);
        return true;
      } catch (err) {
        console.error("delete history entry failed", err);
        const deleteError = getMessage("DELETE_FAILED");
        await w.showDialog?.(String(err?.message || err || deleteError.text), { title: deleteError.title });
        return false;
      }
    }

    function syncHistoryAfterChange(docKey) {
      const normalized = String(docKey || "facture").toLowerCase();
      renderHistoryList(normalized);
      const metaAfter = getInvoiceMeta();
      if (metaAfter.docType === normalized) {
        const updatedEntries =
          typeof w.getDocumentHistory === "function" ? w.getDocumentHistory(normalized) : [];
        const targetYear = getInvoiceYear();
        if (Array.isArray(updatedEntries) && updatedEntries.length > 0) {
          const latest = updatedEntries[0];
          const raw = String(latest.number || "");
          const digitsOnly = raw.replace(/\D+/g, "");
          const requestedLength = digitsOnly.length || raw.length || metaAfter.numberLength || 4;
          const length = normalizeInvoiceLength(requestedLength, metaAfter.numberLength || 4);
          metaAfter.numberLength = length;
          if (invNumberLengthSelect && invNumberLengthSelect.value !== String(length)) {
            invNumberLengthSelect.value = String(length);
          }
          if (typeof w.syncInvNumberLengthUi === "function") {
            w.syncInvNumberLengthUi(length, { updateSelect: false });
          }
          metaAfter.number = "";
          metaAfter.numberYear = targetYear || null;
          if (invNumberInput) invNumberInput.value = "";
          clearPendingNumberLocal(normalized, length, targetYear);
          syncInvoiceNumberControls({ force: true, useNextIfEmpty: true });
        } else {
          const activeLength = metaAfter.numberLength || normalizeInvoiceLength(invNumberLengthSelect?.value || 4, 4);
          metaAfter.numberLength = activeLength;
          metaAfter.number = "";
          metaAfter.numberYear = targetYear || null;
          if (invNumberLengthSelect && invNumberLengthSelect.value !== String(activeLength)) {
            invNumberLengthSelect.value = String(activeLength);
          }
          if (typeof w.syncInvNumberLengthUi === "function") {
            w.syncInvNumberLengthUi(activeLength, { updateSelect: false });
          }
          if (invNumberInput) invNumberInput.value = "";
          clearPendingNumberLocal(normalized, activeLength, targetYear);
          syncInvoiceNumberControls({ force: true, useNextIfEmpty: true });
        }
      }
      if (isHistoryModalOpen()) {
        updateHistoryModalData(historyModalState.docType);
        renderHistoryModal();
      }
    }

    function updateHistoryModalData(docType) {
      const nextType = String(docType || historyModalState.docType || "facture").toLowerCase();
      const typeChanged = historyModalState.docType !== nextType;
      historyModalState.docType = nextType;
      updateHistoryModalTitle(nextType);
      updateHistoryModalPartyLabels(nextType);
      historyModalState.items = getAllHistoryEntries(nextType);
      if (typeChanged) historyModalState.page = 1;
      if (historyModalState.page < 1) historyModalState.page = 1;
    }

    function getHistoryYearFilterLabel(value) {
      if (!docHistoryFilterYear) return "";
      const options = Array.from(docHistoryFilterYear.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    }

    function setHistoryYearMenuState(isOpen) {
      const open = !!isOpen;
      if (docHistoryFilterYearMenu) docHistoryFilterYearMenu.open = open;
      if (docHistoryFilterYearMenuToggle) {
        docHistoryFilterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }

    function syncHistoryYearMenuUi(value, { updateSelect = false, closeMenu = false } = {}) {
      if (!docHistoryFilterYear) return "";
      const nextValue =
        value !== undefined
          ? normalizeHistoryYearValue(value)
          : normalizeHistoryYearValue(docHistoryFilterYear.value);
      if (updateSelect) {
        docHistoryFilterYear.value = nextValue;
      }
      if (docHistoryFilterYearDisplay) {
        docHistoryFilterYearDisplay.textContent = getHistoryYearFilterLabel(nextValue) || nextValue;
      }
      if (docHistoryFilterYearPanel) {
        docHistoryFilterYearPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive =
            normalizeHistoryYearValue(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setHistoryYearMenuState(false);
      return nextValue;
    }

    function syncHistoryYearFilterOptions() {
      if (!docHistoryFilterYear) return;
      const parseYearNumber = (value) => {
        const normalized = normalizeHistoryYearValue(value);
        const yearNum = Number.parseInt(normalized, 10);
        return Number.isFinite(yearNum) ? yearNum : null;
      };
      const currentYear = getCurrentHistoryYearValue();
      const selectedYearRaw = normalizeHistoryYearValue(historyModalState.filters.year);
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(historyModalState.items) ? historyModalState.items : [])
        .map((entry) => parseYearNumber(getHistoryEntryYearValue(entry)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum =
        minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      docHistoryFilterYear.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        docHistoryFilterYear.appendChild(option);
      });
      const nextYear = normalizeHistoryYearValue(historyModalState.filters.year) || currentYear;
      historyModalState.filters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        docHistoryFilterYear.insertBefore(option, docHistoryFilterYear.firstChild);
      }
      docHistoryFilterYear.value = nextYear;
      if (docHistoryFilterYearPanel) {
        docHistoryFilterYearPanel.innerHTML = "";
        Array.from(docHistoryFilterYear.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizeHistoryYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          docHistoryFilterYearPanel.appendChild(btn);
        });
      }
      syncHistoryYearMenuUi(nextYear);
    }

    function wireHistoryYearFilterMenu() {
      if (
        !docHistoryFilterYearMenu ||
        !docHistoryFilterYearMenuToggle ||
        !docHistoryFilterYearPanel ||
        !docHistoryFilterYear ||
        docHistoryFilterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      docHistoryFilterYearMenu.dataset.wired = "1";
      setHistoryYearMenuState(docHistoryFilterYearMenu.open);
      docHistoryFilterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue =
          normalizeHistoryYearValue(btn.dataset.value || "") || getCurrentHistoryYearValue();
        const changed =
          normalizeHistoryYearValue(docHistoryFilterYear.value || "") !== nextValue;
        docHistoryFilterYear.value = nextValue;
        if (changed) {
          docHistoryFilterYear.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncHistoryYearMenuUi(nextValue);
          historyModalState.filters.year = nextValue;
          handleHistoryFilterChange();
        }
        setHistoryYearMenuState(false);
      });
      docHistoryFilterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setHistoryYearMenuState(!docHistoryFilterYearMenu.open);
        if (!docHistoryFilterYearMenu.open) {
          try {
            docHistoryFilterYearMenuToggle.focus();
          } catch {}
        }
      });
      docHistoryFilterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setHistoryYearMenuState(false);
        try {
          docHistoryFilterYearMenuToggle.focus();
        } catch {}
      });
      document.addEventListener("click", (evt) => {
        if (!docHistoryFilterYearMenu?.open) return;
        if (docHistoryFilterYearMenu.contains(evt.target)) return;
        setHistoryYearMenuState(false);
      });
      syncHistoryYearMenuUi(docHistoryFilterYear.value);
    }

    function syncHistoryModalFilterControls() {
      if (docHistoryFilterNumber) {
        docHistoryFilterNumber.value = historyModalState.filters.number || "";
      }
      if (docHistoryFilterQuery) {
        docHistoryFilterQuery.value = historyModalState.filters.query || "";
      }
      historyModalState.filters.year =
        normalizeHistoryYearValue(historyModalState.filters.year) || getCurrentHistoryYearValue();
      syncHistoryYearFilterOptions();
      const selectedYear = historyModalState.filters.year || getCurrentHistoryYearValue();
      const startDayMonth = normalizeHistoryDayMonthValue(historyModalState.filters.startDate);
      const endDayMonth = normalizeHistoryDayMonthValue(historyModalState.filters.endDate);
      historyModalState.filters.startDate = startDayMonth;
      historyModalState.filters.endDate = endDayMonth;
      if (docHistoryFilterStart) {
        docHistoryFilterStart.value = startDayMonth;
      }
      if (docHistoryFilterEnd) {
        docHistoryFilterEnd.value = endDayMonth;
      }
      if (docHistoryStartDatePickerController) {
        const composedStartDate = composeHistoryFilterIsoDate(startDayMonth, selectedYear);
        docHistoryStartDatePickerController.setValue(composedStartDate || "", { silent: true });
        if (docHistoryFilterStart) docHistoryFilterStart.value = startDayMonth;
      }
      if (docHistoryEndDatePickerController) {
        const composedEndDate = composeHistoryFilterIsoDate(endDayMonth, selectedYear);
        docHistoryEndDatePickerController.setValue(composedEndDate || "", { silent: true });
        if (docHistoryFilterEnd) docHistoryFilterEnd.value = endDayMonth;
      }
      if (docHistoryFilterClear) {
        const hasFilters =
          Boolean(historyModalState.filters.number?.trim()) ||
          Boolean(historyModalState.filters.query?.trim()) ||
          Boolean(historyModalState.filters.startDate?.trim()) ||
          Boolean(historyModalState.filters.endDate?.trim()) ||
          !isHistoryYearDefault(historyModalState.filters.year);
        docHistoryFilterClear.disabled = !hasFilters;
      }
    }

    function hasActiveHistoryFilters() {
      return Boolean(
        (historyModalState.filters.number || "").trim() ||
          (historyModalState.filters.query || "").trim() ||
          (historyModalState.filters.startDate || "").trim() ||
          (historyModalState.filters.endDate || "").trim() ||
          !isHistoryYearDefault(historyModalState.filters.year)
      );
    }

    function extractHistoryNumberValue(entry) {
      const rawNumber = entry?.number ?? entry?.invNumber;
      if (rawNumber === undefined || rawNumber === null) return null;
      const match = String(rawNumber).match(/(\d+)\s*$/);
      if (!match) return null;
      const num = Number(match[1]);
      return Number.isFinite(num) ? num : null;
    }

    function sortHistoryModalEntries(items) {
      if (!Array.isArray(items) || items.length === 0) return [];
      const docTypeValue = String(historyModalState.docType || "").toLowerCase();
      const sortByCreatedAt = docTypeValue === "fa";
      const resolveEntryTimestamp = (item, useCreatedAt) => {
        const entry = item?.entry;
        if (!entry) return NaN;
        if (useCreatedAt) {
          return Date.parse(entry.createdAt || entry.savedAt || entry.date || "");
        }
        return Date.parse(entry.savedAt || entry.date || "");
      };
      return [...items].sort((a, b) => {
        const aDate = resolveEntryTimestamp(a, sortByCreatedAt);
        const bDate = resolveEntryTimestamp(b, sortByCreatedAt);
        const aHasDate = Number.isFinite(aDate);
        const bHasDate = Number.isFinite(bDate);
        if (sortByCreatedAt) {
          if (aDate !== bDate && (aHasDate || bHasDate)) {
            if (!aHasDate) return 1;
            if (!bHasDate) return -1;
            return bDate - aDate;
          }
          return (b?.index ?? 0) - (a?.index ?? 0);
        }
        const aNumber = extractHistoryNumberValue(a?.entry);
        const bNumber = extractHistoryNumberValue(b?.entry);
        if (aNumber !== bNumber) {
          if (!Number.isFinite(aNumber)) return 1;
          if (!Number.isFinite(bNumber)) return -1;
          return bNumber - aNumber;
        }
        if (aDate !== bDate && (aHasDate || bHasDate)) {
          if (!aHasDate) return 1;
          if (!bHasDate) return -1;
          return bDate - aDate;
        }
        return (a?.index ?? 0) - (b?.index ?? 0);
      });
    }

    function getFilteredHistoryModalEntries() {
      const baseItems = Array.isArray(historyModalState.items) ? historyModalState.items : [];
      const numberFilter = normalizeFilterText(historyModalState.filters.number);
      const query = normalizeFilterText(historyModalState.filters.query);
      const selectedYear =
        normalizeHistoryYearValue(historyModalState.filters.year) || getCurrentHistoryYearValue();
      historyModalState.filters.year = selectedYear;
      const filterStartDayMonth = normalizeHistoryDayMonthValue(historyModalState.filters.startDate);
      const filterEndDayMonth = normalizeHistoryDayMonthValue(historyModalState.filters.endDate);
      const filterStartDate = composeHistoryFilterIsoDate(filterStartDayMonth, selectedYear);
      const filterEndDate = composeHistoryFilterIsoDate(filterEndDayMonth, selectedYear);
      const hasNumber = !!numberFilter;
      const hasQuery = !!query;
      const hasYearFilter = !!selectedYear;
      const hasStartDate = !!filterStartDayMonth && !!filterStartDate;
      const hasEndDate = !!filterEndDayMonth && !!filterEndDate;
      const decoratedItems = baseItems.map((entry, index) => ({ entry, index }));
      if (!hasNumber && !hasQuery && !hasYearFilter && !hasStartDate && !hasEndDate) {
        return sortHistoryModalEntries(decoratedItems);
      }
      const filtered = decoratedItems.reduce((acc, item) => {
        const entry = item.entry;
        if (hasNumber) {
          const matchNumber = String(entry?.number || "")
            .toLowerCase()
            .includes(numberFilter);
          if (!matchNumber) return acc;
        }
        if (hasQuery) {
          const haystack = [
            entry?.clientName,
            entry?.clientAccount,
            entry?.label,
            entry?.name,
            entry?.number,
            entry?.docType,
            entry?.path
          ];
          const match = haystack.some((value) => {
            if (value === undefined || value === null) return false;
            return String(value).toLowerCase().includes(query);
          });
          if (!match) return acc;
        }
        const normalizedDate = getHistoryEntryIsoDate(entry);
        if (hasYearFilter) {
          if (!normalizedDate) return acc;
          if (!normalizedDate.startsWith(`${selectedYear}-`)) return acc;
        }
        if (hasStartDate || hasEndDate) {
          if (!normalizedDate) return acc;
          if (hasStartDate && normalizedDate < filterStartDate) return acc;
          if (hasEndDate && normalizedDate > filterEndDate) return acc;
        }
        acc.push(item);
        return acc;
      }, []);
      return sortHistoryModalEntries(filtered);
    }

    function getHistoryModalTotalPages() {
      const total = getFilteredHistoryModalEntries().length;
      return total ? Math.max(1, Math.ceil(total / HISTORY_MODAL_PAGE_SIZE)) : 1;
    }

    async function renderHistoryModal() {
      closeDocHistoryStatusMenu();
      closeDocHistoryActionsMenu();
      closeDocHistoryExportMenu();
      if (!historyModalList) return;
      const renderToken = ++historyRenderToken;
      const filteredEntries = getFilteredHistoryModalEntries();
      const total = filteredEntries.length;
      const isEmpty = total === 0;
      const totalPages = total ? Math.max(1, Math.ceil(total / HISTORY_MODAL_PAGE_SIZE)) : 1;
      const safePage = Math.min(Math.max(historyModalState.page, 1), totalPages);
      historyModalState.page = safePage;
      historyModalList.innerHTML = "";
      historyModalList.classList.toggle("is-empty", isEmpty);
      syncHistoryModalFilterControls();
      const hasFilters = hasActiveHistoryFilters();
      const moneyFormatter =
        typeof formatMoney === "function"
          ? formatMoney
          : (value, currency) => {
              const num = Number(value || 0);
              const formatted = num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
              return currency ? `${formatted} ${currency}` : formatted;
            };
      const resolveHistoryPaymentTotals = (entry) => {
        const totalValue = resolveHistoryEntryTotal(entry);
        const paidRaw = Number(entry?.paid);
        const balanceRaw = Number(entry?.balanceDue);
        const status = normalizeDocHistoryStatusValue(entry?.status);
        const isUnpaid = isUnpaidStatus(status);
        const isPaid = status === "payee";
        const hasPaid = Number.isFinite(paidRaw);
        const hasBalance = Number.isFinite(balanceRaw);
        let paid = hasPaid ? paidRaw : NaN;
        let balanceDue = hasBalance ? balanceRaw : NaN;

        if (!Number.isFinite(paid)) {
          if (isPaid && Number.isFinite(totalValue)) {
            paid = totalValue;
          } else if (isUnpaid) {
            paid = 0;
          } else if (Number.isFinite(totalValue) && Number.isFinite(balanceDue)) {
            paid = Math.max(0, totalValue - balanceDue);
          }
        }

        if (!Number.isFinite(balanceDue)) {
          if (Number.isFinite(totalValue) && Number.isFinite(paid)) {
            balanceDue = Math.max(0, totalValue - paid);
          } else if (isUnpaid && Number.isFinite(totalValue)) {
            balanceDue = totalValue;
          } else if (isPaid) {
            balanceDue = 0;
          }
        }

        return { paid, balanceDue };
      };

      const recapTotals = filteredEntries.reduce(
        (acc, { entry }) => {
          const totalHT = Number(entry?.totalHT);
          if (Number.isFinite(totalHT)) {
            acc.totalHT += totalHT;
            acc.hasHT = true;
          }
          const totalTTC = Number(entry?.totalTTC);
          if (Number.isFinite(totalTTC)) {
            acc.totalTTC += totalTTC;
            acc.hasTTC = true;
          }
          if (Number.isFinite(totalHT) && Number.isFinite(totalTTC)) {
            acc.totalTaxes += totalTTC - totalHT;
            acc.hasTaxes = true;
          }
          const paymentTotals = resolveHistoryPaymentTotals(entry);
          if (Number.isFinite(paymentTotals.paid)) {
            acc.totalPaid += paymentTotals.paid;
            acc.hasPaid = true;
          }
          if (Number.isFinite(paymentTotals.balanceDue)) {
            acc.totalBalanceDue += paymentTotals.balanceDue;
            acc.hasBalanceDue = true;
          }
          const currency = typeof entry?.currency === "string" ? entry.currency.trim() : "";
          if (currency) acc.currencies.add(currency);
          return acc;
        },
        {
          totalHT: 0,
          totalTTC: 0,
          totalTaxes: 0,
          totalPaid: 0,
          totalBalanceDue: 0,
          hasHT: false,
          hasTTC: false,
          hasTaxes: false,
          hasPaid: false,
          hasBalanceDue: false,
          currencies: new Set()
        }
      );
      const recapCurrency =
        recapTotals.currencies.size === 1 ? Array.from(recapTotals.currencies)[0] : "";
      const formatRecapValue = (value, hasValue) => {
        if (hasValue) return moneyFormatter(value, recapCurrency);
        if (!total) return moneyFormatter(0, recapCurrency);
        return "--";
      };
      if (historyModalRecap) {
        const recapHT = formatRecapValue(recapTotals.totalHT, recapTotals.hasHT);
        const recapTTC = formatRecapValue(recapTotals.totalTTC, recapTotals.hasTTC);
        const recapTaxes = formatRecapValue(recapTotals.totalTaxes, recapTotals.hasTaxes);
        const recapPaid = formatRecapValue(recapTotals.totalPaid, recapTotals.hasPaid);
        const recapBalance = formatRecapValue(
          recapTotals.totalBalanceDue,
          recapTotals.hasBalanceDue
        );
        historyModalRecap.textContent = "";
        const appendRecapItem = (label, value) => {
          const itemEl = document.createElement("li");
          itemEl.appendChild(document.createTextNode(`${label} `));
          const valueEl = document.createElement("span");
          valueEl.className = "doc-history-modal__recap-value";
          valueEl.textContent = value;
          itemEl.appendChild(valueEl);
          historyModalRecap.appendChild(itemEl);
        };
        appendRecapItem("TG TTC:", recapTTC);
        appendRecapItem("TG taxes:", recapTaxes);
        appendRecapItem("TG HT:", recapHT);
        appendRecapItem("TG Pay\u00E9:", recapPaid);
        appendRecapItem("TG Solde d\u00FB:", recapBalance);
      }

      if (isEmpty) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "doc-history-modal__empty";
        emptyEl.textContent = hasFilters
          ? "Aucun document ne correspond aux filtres."
          : "Aucun document enregistr\u00E9 pour ce type.";
        historyModalList.appendChild(emptyEl);
      } else {
        const startIdx = (safePage - 1) * HISTORY_MODAL_PAGE_SIZE;
        const slice = filteredEntries.slice(startIdx, startIdx + HISTORY_MODAL_PAGE_SIZE);
        try {
          await hydrateHistoryPaymentMeta(slice, historyModalState.docType);
        } catch (err) {
          console.warn("doc-history payment meta hydrate failed", err);
        }
        if (renderToken !== historyRenderToken) return;
        const totalsRowHtml = (entry, currency) => {
          const totals = [];
           if (typeof entry.totalHT === "number") {
             totals.push(`<div class="client-search__detail client-search__detail--inline">
                <span class="client-search__detail-label">Total HT :</span>
               <span class="client-search__detail-value">${safeHtml(moneyFormatter(entry.totalHT, currency))}</span>
             </div>`);
           }
           if (typeof entry.totalTTC === "number") {
             totals.push(`<div class="client-search__detail client-search__detail--inline">
               <span class="client-search__detail-label">Total TTC :</span>
               <span class="client-search__detail-value">${safeHtml(moneyFormatter(entry.totalTTC, currency))}</span>
             </div>`);
           }
          return totals.length
            ? `<div class="client-search__details-row client-search__details-row--metrics">${totals.join("")}</div>`
            : "";
        };
          const paymentRowHtml = (entry, currency, docType) => {
            if (docType !== "facture") return "";
            const emptyValue = '<span class="client-search__empty">N.R.</span>';
            const paid = Number(entry?.paid);
            const balanceDue = Number(entry?.balanceDue);
            const hasPaid = Number.isFinite(paid);
            const hasBalance = Number.isFinite(balanceDue);
            const totalTTC = Number(entry?.totalTTC);
            const totalHT = Number(entry?.totalHT);
            const fallbackBalance = Number.isFinite(totalTTC)
              ? totalTTC
              : Number.isFinite(totalHT)
                ? totalHT
                : NaN;
            const paymentFlag = entry?.acompteEnabled;
            const status = normalizeDocHistoryStatusValue(entry?.status);
            const isUnpaid = isUnpaidStatus(status);
            const showValues =
              paymentFlag === true || (paymentFlag !== false && (hasPaid || hasBalance)) || isUnpaid;
            const paidHtml =
              showValues && (hasPaid || isUnpaid)
                ? safeHtml(moneyFormatter(hasPaid ? paid : 0, currency))
                : emptyValue;
            const balanceHtml =
              showValues && (hasBalance || (isUnpaid && Number.isFinite(fallbackBalance)))
                ? safeHtml(moneyFormatter(hasBalance ? balanceDue : fallbackBalance, currency))
                : emptyValue;
          return `<div class="client-search__details-row client-search__details-row--metrics">
                <div class="client-search__detail client-search__detail--inline">
                  <span class="client-search__detail-label">Pay\u00e9 :</span>
                  <span class="client-search__detail-value">${paidHtml}</span>
                </div>
                <div class="client-search__detail client-search__detail--inline">
                  <span class="client-search__detail-label">Solde d\u00fb :</span>
                  <span class="client-search__detail-value">${balanceHtml}</span>
                </div>
              </div>`;
        };
        const reglementRowHtml = (entry) => {
          const emptyValue = '<span class="client-search__empty">N.R.</span>';
          const reglementText =
            typeof entry?.reglementText === "string" ? entry.reglementText.trim() : "";
          const reglementEnabled = entry?.reglementEnabled;
          const showValue =
            reglementEnabled === true || (reglementEnabled !== false && !!reglementText);
          const valueHtml = showValue && reglementText ? safeHtml(reglementText) : emptyValue;
          return `<div class="client-search__details-row client-search__details-row--metrics">
                <div class="client-search__detail client-search__detail--inline">
                  <span class="client-search__detail-label">Conditions de r\u00e8glement :</span>
                  <span class="client-search__detail-value">${valueHtml}</span>
                </div>
              </div>`;
        };
        slice.forEach(({ entry, index: actualIndex }) => {
          ensurePaidStatusIfSettled(entry, historyModalState.docType);
          const row = document.createElement("div");
          row.className = "client-search__option doc-history-item";
          const baseLabel =
            entry.label ||
            entry.name ||
            entry.number ||
            getDisplayFilename(entry.path) ||
            (typeof w.docTypeLabel === "function"
              ? w.docTypeLabel(historyModalState.docType)
              : "Document");
          const currency = entry.currency || "";
          const headingText =
            entry.number ||
            entry.name ||
            entry.label ||
            getDisplayFilename(entry.path) ||
            baseLabel;
          const copyIconHtml =
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/></svg>';
          const documentCopyValue = entry?.number ? String(entry.number).trim() : "";
          const documentCopyButtonHtml = documentCopyValue
            ? `<span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier N\u00b0 de facture" title="Copier N\u00b0 de facture" data-doc-history-copy="document" data-doc-history-copy-value="${escapeAttr(documentCopyValue)}">${copyIconHtml}</span>`
            : "";
          const documentValueHtml = `<span class="client-search__detail-value client-search__detail-value--with-copy"><span class="client-search__detail-text">${safeHtml(headingText)}</span>${documentCopyButtonHtml}</span>`;
          const documentDateValue = formatDocHistoryDate(entry);
          const documentDateHtml = `<span class="doc-history__document-date">Date: ${safeHtml(documentDateValue || "-")}</span>`;
          const rawClientName = entry?.clientName ? String(entry.clientName).trim() : "";
          const rawClientAccount = entry?.clientAccount ? String(entry.clientAccount).trim() : "";
          const resolvedClientValue = rawClientName || rawClientAccount;
          const clientCopyValue = resolvedClientValue ? resolvedClientValue : "";
          const clientValueText = resolvedClientValue ? truncateClientName(resolvedClientValue) : "";
          const disabledCopyButtonHtml = `<span class="client-search__detail-copy is-disabled" role="button" tabindex="0" aria-disabled="true" aria-label="Copier N\u00b0 de facture" title="Copier N\u00b0 de facture" data-doc-history-copy="document" data-doc-history-copy-value="${escapeAttr(documentCopyValue)}">${copyIconHtml}</span>`;
          const entryDocType = String(entry.docType || historyModalState.docType || "").toLowerCase();
          const partyLabels = getHistoryPartyLabels(entryDocType || historyModalState.docType);
          const signerFactureMenuItemHtml = entryDocType === "facture"
            ? `<button type="button" class="client-search__edit" data-doc-history-signer="${actualIndex}" role="menuitem">Signer Facture</button>`
            : "";
          const accountLabel = resolveClientAccountLabel();
          const clientLabel = rawClientName || !rawClientAccount ? partyLabels.labelWithColon : `${accountLabel} :`;
          const clientValueHtml = clientValueText
            ? `<span class="client-search__detail-value client-search__detail-value--with-copy"><span class="client-search__detail-text">${safeHtml(clientValueText)}</span><span class="client-search__detail-copy" role="button" tabindex="0" aria-label="${partyLabels.copyLabel}" title="${partyLabels.copyLabel}" data-doc-history-copy="client" data-doc-history-copy-value="${escapeAttr(clientCopyValue)}">${copyIconHtml}</span></span>`
            : `<span class="client-search__detail-value client-search__detail-value--with-copy"><span class="client-search__empty">N.R.</span>${disabledCopyButtonHtml}</span>`;
          const clientHtml = `<div class="client-search__detail client-search__detail--inline">
                 <span class="client-search__detail-label">${clientLabel}</span>
                 ${clientValueHtml}
               </div>`;
          const totalsRow = totalsRowHtml(entry, currency);
          const paymentRow = paymentRowHtml(entry, currency, entryDocType);
          const reglementRow = reglementRowHtml(entry);
          const convertedFrom = entry && typeof entry.convertedFrom === "object" ? entry.convertedFrom : null;
          const convertedFromDocType = convertedFrom?.docType || convertedFrom?.type
            ? String(convertedFrom.docType || convertedFrom.type).toLowerCase()
            : "";
          const convertedFromPath = convertedFrom?.path ? String(convertedFrom.path).trim() : "";
          const convertedFromNumberRaw = convertedFrom?.number ? String(convertedFrom.number).trim() : "";
          const convertedFromNumber =
            convertedFromNumberRaw || extractDocNumberFromPath(convertedFromPath);
          const isDevisOrBlOrigin =
            ["devis", "bl"].includes(convertedFromDocType) ||
            (!convertedFromDocType && !!convertedFromNumber);
          const showFactureConvertedFrom =
            entryDocType === "facture" &&
            isDevisOrBlOrigin &&
            convertedFromNumber;
          const showAvoirConvertedFrom =
            entryDocType === "avoir" &&
            !!convertedFromNumber;
          const showConvertedFrom = showFactureConvertedFrom || showAvoirConvertedFrom;
          const paymentMethodRaw =
            entry && (entry.paymentMethod || entry.mode)
              ? String(entry.paymentMethod || entry.mode).trim()
              : "";
          const normalizedStatus = normalizeDocHistoryStatusValue(entry?.status);
          const isPaymentMethodUnavailable = isNoPaymentMethodStatus(normalizedStatus);
          const paymentMethodLabel =
            isPaymentMethodUnavailable && paymentMethodRaw
              ? "N.R."
              : docHistoryPaymentLabel(paymentMethodRaw);
          const paymentReferenceRaw =
            entry && (entry.paymentReference || entry.paymentRef)
              ? String(entry.paymentReference || entry.paymentRef).trim()
              : "";
          const showPaymentBlock = entryDocType === "facture";
          const paymentMethodDisplay = showPaymentBlock
            ? paymentMethodLabel || "N.R."
            : "";
          const paymentReferenceDisplay = showPaymentBlock
            ? paymentReferenceRaw || "N.R."
            : "";
          const convertedFromHtml = showConvertedFrom
            ? `<span class="doc-history__converted-label">Converti de :</span>
                  <span class="doc-history__converted-number">${safeHtml(convertedFromNumber)}</span>`
            : "";
          const paymentMethodHtml = showPaymentBlock
            ? `<span class="doc-history__converted-label">Mode de paiement :</span>
                  <span class="doc-history__converted-number">${safeHtml(paymentMethodDisplay)}</span>`
            : "";
          const paymentReferenceHtml = showPaymentBlock
            ? `<span class="doc-history__converted-label">R\u00e9f. paiement :</span>
                  <span class="doc-history__converted-number">${safeHtml(paymentReferenceDisplay)}</span>`
            : "";
          const convertedFromRowHtml =
            showConvertedFrom || showPaymentBlock
              ? `<div class="client-search__details-row">
                <div class="doc-history__converted-badge">
                  ${convertedFromHtml}
                  ${paymentMethodHtml}
                  ${paymentReferenceHtml}
                </div>
              </div>`
              : "";
          const showStatusSelect = historyModalState.docType === "facture";
          const statusMenuHtml = showStatusSelect
              ? (() => {
                const defaultValue =
                  normalizeDocHistoryStatusValue(entry.status) ||
                  DOC_HISTORY_STATUS_OPTIONS[0].value;
                return `<div class="field-toggle-menu doc-history-status-menu" data-doc-history-status-menu="${actualIndex}" data-current-value="${defaultValue}">
                  <button type="button" class="btn success field-toggle-trigger doc-history__status" data-doc-history-status-toggle="${actualIndex}" aria-haspopup="listbox" aria-expanded="false">
                    <span class="doc-history__status-label">${safeHtml(docHistoryStatusLabel(defaultValue))}</span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                      <path fill="none" d="M0 0h24v24H0V0z"></path>
                      <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path>
                    </svg>
                  </button>
                </div>`;
              })()
            : "";
          const showConvert = ["devis", "bl", "facture"].includes(
            String(historyModalState.docType || "").toLowerCase()
          );
          const convertMenuItemHtml = showConvert
            ? `<button type="button" class="client-search__edit" data-doc-history-convert="${actualIndex}" role="menuitem">Convertir</button>`
            : "";
          const docTypeValue = String(historyModalState.docType || "").toLowerCase();
          const showWithholdingExport = docTypeValue === "fa";
          const withholdingMenuItemHtml = showWithholdingExport
            ? `<button type="button" class="client-search__edit" data-doc-history-withholding="${actualIndex}" role="menuitem">Cr\u00E9er la retenue \u00E0 la source</button>`
            : "";
          const showPurchaseExport = docTypeValue === "facture";
          const purchaseExportMenuItemHtml = showPurchaseExport
            ? `<button type="button" class="client-search__edit" data-doc-history-export-purchase="${actualIndex}" role="menuitem">Exporter tant que Facture d'achat</button>`
            : "";
          const viewButtonHtml = `<button type="button" class="client-search__edit doc-history__open-view" data-doc-history-view="${actualIndex}" title="Voir" aria-label="Voir">
                <span class="doc-history__view-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M12 6a9.77 9.77 0 0 0-8.94 6A9.77 9.77 0 0 0 12 18a9.77 9.77 0 0 0 8.94-6A9.77 9.77 0 0 0 12 6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>`;
          const pdfPath = typeof entry.pdfPath === "string" ? entry.pdfPath.trim() : "";
          const hasPdfExport = !!pdfPath;
          const folderButtonHtml = `<button type="button" class="client-search__edit doc-history__open-folder" data-doc-history-open-pdf="${actualIndex}" title="Ouvrir le dossier PDF" aria-label="Ouvrir le dossier PDF" ${hasPdfExport ? "" : "disabled"}>
                <span class="doc-history__folder-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>`;
          const emailButtonHtml = `<button type="button" class="client-search__edit doc-history__open-email" data-doc-history-email="${actualIndex}" title="Envoyer par e-mail" aria-label="Envoyer par e-mail">
                <span class="doc-history__email-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.01L12 13l8-6V7H4zm0 10h16V9l-8 6-8-6v8z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>`;
          const showTtn = docTypeValue === "facture";
          const ttnButtonHtml = showTtn
            ? `<button type="button" class="client-search__edit doc-history__open-ttn" data-doc-history-ttn="${actualIndex}" title="TTN" aria-label="TTN">
                <span class="doc-history__ttn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">                    
                    <text x="12" y="12" dominant-baseline="middle" text-anchor="middle" font-size="12" font-weight="700" font-family="Arial, sans-serif" fill="currentColor">TTN</text>
                  </svg>
                </span>
              </button>`
            : "";
          const hasComment = entry?.has_comment === 1 || entry?.has_comment === true;
          const commentButtonHtml = `<button type="button" class="client-search__edit doc-history__open-comment" data-doc-history-comment="${actualIndex}" title="Afficher le commentaire" aria-label="Afficher le commentaire" ${hasComment ? "" : "disabled"}>
                <span class="doc-history__comment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>`;
          const actionsMenuHtml = `<details class="field-toggle-menu doc-history-actions-menu" data-doc-history-actions-menu="${actualIndex}">
                <summary class="client-search__edit field-toggle-trigger doc-history-actions-trigger" role="button" aria-haspopup="menu" aria-controls="docHistoryActionsPanel-${actualIndex}">
                  <span>Action</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path>
                  </svg>
                </summary>
                <div id="docHistoryActionsPanel-${actualIndex}" class="field-toggle-panel doc-history-actions-panel" role="menu" aria-label="Action">
                  <button type="button" class="client-search__edit" data-doc-history-open="${actualIndex}" role="menuitem">Modifier</button>
                  <button type="button" class="client-search__edit" data-doc-history-duplicate="${actualIndex}" role="menuitem">Dupliquer</button>
                  ${convertMenuItemHtml}
                  ${withholdingMenuItemHtml}
                  ${signerFactureMenuItemHtml}
                  <button type="button" class="client-search__deleteDoc" data-doc-history-delete="${actualIndex}" role="menuitem">Supprimer</button>
                </div>
              </details>`;
          const exportMenuHtml = `<details class="field-toggle-menu doc-history-export-menu" data-doc-history-export-menu="${actualIndex}">
                <summary class="client-search__edit field-toggle-trigger doc-history-export-trigger" role="button" aria-haspopup="menu" aria-controls="docHistoryExportPanel-${actualIndex}">
                  <span>Exporter</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path>
                  </svg>
                </summary>
                <div id="docHistoryExportPanel-${actualIndex}" class="field-toggle-panel doc-history-export-panel" role="menu" aria-label="Export">
                  <button type="button" class="client-search__edit" data-doc-history-export="${actualIndex}" role="menuitem">Exporter PDF</button>
                  ${purchaseExportMenuItemHtml}
                </div>
              </details>`;
          const iconColumnHtml = `<div class="documents-list__column">
                ${viewButtonHtml}
                ${folderButtonHtml}
                ${commentButtonHtml}
              </div>`;
          const emailColumnHtml = `<div class="documents-list__column">
                ${emailButtonHtml}
                ${ttnButtonHtml}
              </div>`;
          row.innerHTML = `
            <button type="button" class="client-search__select client-search__select--detailed" data-doc-history-open="${actualIndex}">
              <div class="client-search__details-grid">
               <div class="client-search__detail client-search__detail--inline client-search__detail--name doc-history__document-row">
                 <span class="client-search__detail-label">Document :</span>
                 ${documentValueHtml}
                 ${documentDateHtml}
               </div>
              ${clientHtml}
              ${totalsRow}
              ${paymentRow}
              ${reglementRow}
            </div>
          </button>
            ${convertedFromRowHtml}
            <div class="client-search__actions client-search__actions--with-export">
              <div class="documents-list documents-list--icons">
                  ${iconColumnHtml}
                  ${emailColumnHtml}
              </div>
              <div class="documents-list">
                ${statusMenuHtml}
                ${actionsMenuHtml}
                ${exportMenuHtml}
              </div>
            </div>`;
          historyModalList.appendChild(row);
        });
      }

      if (historyModalPage) {
        historyModalPage.setAttribute(
          "aria-label",
          `Page ${historyModalState.page} sur ${totalPages}`
        );
      }
      if (historyModalTotalPages) {
        historyModalTotalPages.textContent = String(totalPages);
      }
      if (historyModalPageInput) {
        const hasPages = total > 0;
        historyModalPageInput.disabled = !hasPages;
        historyModalPageInput.min = "1";
        historyModalPageInput.max = String(totalPages);
        historyModalPageInput.value = String(safePage);
        historyModalPageInput.setAttribute("aria-valuemin", "1");
        historyModalPageInput.setAttribute("aria-valuemax", String(totalPages));
        historyModalPageInput.setAttribute(
          "aria-valuenow",
          String(safePage)
        );
      }

      const typeLabel =
        (docHistoryDisplayLabel(historyModalState.docType) || "documents").toLowerCase();
      let statusText = "";
      if (!total) {
        statusText = hasFilters
          ? "Aucun document ne correspond aux filtres appliqu\u00E9s."
          : `Aucun ${typeLabel} enregistr\u00E9.`;
      } else {
        const start = (historyModalState.page - 1) * HISTORY_MODAL_PAGE_SIZE + 1;
        const end = Math.min(total, start + HISTORY_MODAL_PAGE_SIZE - 1);
        statusText = `Affichage ${start}\u2013${end} sur ${total} ${typeLabel}${
          hasFilters ? " filtr\u00E9s" : ""
        }`;
      }
      if (historyModalStatus) historyModalStatus.textContent = statusText;

      const disablePrev = historyModalState.page <= 1 || !total;
      const disableNext = !total || historyModalState.page >= totalPages;
      if (historyModalPrev) historyModalPrev.disabled = disablePrev;
      if (historyModalNext) historyModalNext.disabled = disableNext;
      if (historyModalCloseFooter) historyModalCloseFooter.disabled = false;
    }

    function applyHistoryModalPageInput() {
      if (!historyModalPageInput) return;
      const rawValue = String(historyModalPageInput.value || "").trim();
      if (!rawValue) {
        historyModalPageInput.value = String(historyModalState.page);
        return;
      }
      const requested = Number(rawValue);
      if (!Number.isFinite(requested)) {
        historyModalPageInput.value = String(historyModalState.page);
        return;
      }
      const totalPages = getHistoryModalTotalPages();
      const targetPage = Math.min(Math.max(Math.trunc(requested), 1), totalPages);
      if (targetPage !== historyModalState.page) {
        historyModalState.page = targetPage;
        renderHistoryModal();
      } else {
        historyModalPageInput.value = String(historyModalState.page);
      }
    }

    function setHistoryRecapPopoverOpenState(shouldOpen) {
      const isOpen = Boolean(shouldOpen);
      if (historyModalRecapInfoBtn) {
        historyModalRecapInfoBtn.setAttribute("aria-expanded", String(isOpen));
      }
      if (!historyModalRecapPopover) return;
      historyModalRecapPopover.hidden = !isOpen;
      historyModalRecapPopover.classList.toggle("is-open", isOpen);
    }

    function openHistoryRecapPopover() {
      if (!historyModalRecapInfoBtn || !historyModalRecapPopover) return;
      setHistoryRecapPopoverOpenState(true);
    }

    function closeHistoryRecapPopover() {
      setHistoryRecapPopoverOpenState(false);
    }

    function toggleHistoryRecapPopover() {
      if (!historyModalRecapPopover || !historyModalRecapInfoBtn) return;
      if (historyModalRecapPopover.hidden) {
        openHistoryRecapPopover();
      } else {
        closeHistoryRecapPopover();
      }
    }

    function openHistoryModal({ docType } = {}) {
      if (!historyModal) return false;
      historyModalRestoreFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const normalizedType =
        docType !== undefined && docType !== null
          ? String(docType || "facture").toLowerCase()
          : null;
      const targetType = normalizedType || historyModalState.docType || "facture";
      if (normalizedType) {
        renderHistoryList(normalizedType);
      }
      updateHistoryModalData(targetType);
      renderHistoryModal();
      closeHistoryRecapPopover();
      historyModal.hidden = false;
      historyModal.removeAttribute("hidden");
      historyModal.setAttribute("aria-hidden", "false");
      historyModal.classList.add("is-open");
      focusHistoryModalInitialControl();
      document.addEventListener("keydown", onHistoryModalKeyDown);
      return true;
    }

    function closeHistoryModal() {
      if (!historyModal) return;
      closeDocHistoryStatusMenu();
      closeDocHistoryActionsMenu();
      closeDocHistoryExportMenu();
      setHistoryYearMenuState(false);
      closeHistoryRecapPopover();
      docHistoryStartDatePickerController?.close();
      docHistoryEndDatePickerController?.close();
      historyModal.classList.remove("is-open");
      historyModal.hidden = true;
      historyModal.setAttribute("hidden", "");
      historyModal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onHistoryModalKeyDown);
      if (historyModalRestoreFocus && typeof historyModalRestoreFocus.focus === "function") {
        try {
          historyModalRestoreFocus.focus();
        } catch {}
      }
    }

    function onHistoryModalKeyDown(evt) {
      if (evt.key === "Escape") {
        if (isAnotherDialogOpen()) return;
        if (docHistoryFilterYearMenu && docHistoryFilterYearMenu.open) {
          evt.preventDefault();
          setHistoryYearMenuState(false);
          if (docHistoryFilterYearMenuToggle && typeof docHistoryFilterYearMenuToggle.focus === "function") {
            try {
              docHistoryFilterYearMenuToggle.focus();
            } catch {}
          }
          return;
        }
        if (docHistoryActionsPopover && !docHistoryActionsPopover.hidden) {
          evt.preventDefault();
          closeDocHistoryActionsMenu();
          return;
        }
        if (docHistoryExportPopover && !docHistoryExportPopover.hidden) {
          evt.preventDefault();
          closeDocHistoryExportMenu();
          return;
        }
        if (docHistoryStatusPopover && !docHistoryStatusPopover.hidden) {
          evt.preventDefault();
          closeDocHistoryStatusMenu();
          return;
        }
        if (historyModalRecapPopover && !historyModalRecapPopover.hidden) {
          evt.preventDefault();
          closeHistoryRecapPopover();
          return;
        }
        evt.preventDefault();
        closeHistoryModal();
      }
    }

    function setDocHistoryStatusMenuOpenState(menu, shouldOpen) {
      if (!menu) return;
      const isOpen = Boolean(shouldOpen);
      menu.classList.toggle("is-open", isOpen);
      const toggleBtn = menu.querySelector("[data-doc-history-status-toggle]");
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      }
    }

    function ensureDocHistoryStatusPopover() {
      if (docHistoryStatusPopover) return;
      docHistoryStatusPopover = document.createElement("div");
      docHistoryStatusPopover.className = "doc-history-status-popover";
      docHistoryStatusPopover.hidden = true;
      docHistoryStatusPopoverPanel = document.createElement("div");
      docHistoryStatusPopoverPanel.className = "doc-history-status-panel";
      docHistoryStatusPopoverPanel.setAttribute("role", "listbox");
      docHistoryStatusPopoverPanel.setAttribute("aria-label", "Statut du document");
      docHistoryStatusPopover.appendChild(docHistoryStatusPopoverPanel);
      document.body.appendChild(docHistoryStatusPopover);
      docHistoryStatusPopoverPanel.addEventListener("click", onDocHistoryStatusPopoverClick);
    }

    function renderDocHistoryStatusPopoverOptions(menuIndex, currentValue) {
      if (!docHistoryStatusPopoverPanel) return;
      const normalizedValue =
        normalizeDocHistoryStatusValue(currentValue) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      docHistoryStatusPopoverPanel.innerHTML = DOC_HISTORY_STATUS_OPTIONS.map((option) => {
        const isActive = option.value === normalizedValue;
        const activeClass = isActive ? " doc-history-status-option--active" : "";
        return `<button type="button" class="doc-history-status-option${activeClass}" data-doc-history-status-value="${option.value}" data-doc-history-status-index="${menuIndex}" role="option" aria-selected="${isActive}">${safeHtml(option.label)}</button>`;
      }).join("");
    }

    function positionDocHistoryStatusPopover(triggerEl) {
      if (!docHistoryStatusPopover || docHistoryStatusPopover.hidden || !triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const popoverRect = docHistoryStatusPopover.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      let left = triggerRect.left;
      let top = triggerRect.bottom + 4;
      if (left + popoverRect.width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - popoverRect.width - 8);
      }
      if (top + popoverRect.height > viewportHeight - 8) {
        top = Math.max(8, triggerRect.top - popoverRect.height - 4);
      }
      docHistoryStatusPopover.style.left = `${left}px`;
      docHistoryStatusPopover.style.top = `${top}px`;
    }

    function openDocHistoryStatusMenu(index, toggleBtn) {
      if (typeof index !== "number" || Number.isNaN(index) || !toggleBtn) return;
      const menu = toggleBtn.closest("[data-doc-history-status-menu]");
      if (!menu) return;
      ensureDocHistoryStatusPopover();
      if (!docHistoryStatusPopover || !docHistoryStatusPopoverPanel) return;
      const currentValue =
        normalizeDocHistoryStatusValue(menu.dataset.currentValue) ||
        DOC_HISTORY_STATUS_OPTIONS[0].value;
      renderDocHistoryStatusPopoverOptions(index, currentValue);
      if (docHistoryStatusPopoverPanel) {
        const triggerRect = toggleBtn.getBoundingClientRect();
        const triggerWidth = Math.max(Math.round(triggerRect.width), 150);
        docHistoryStatusPopoverPanel.style.width = `${triggerWidth}px`;
        docHistoryStatusPopoverPanel.style.minWidth = `${triggerWidth}px`;
      }
      docHistoryStatusPopover.hidden = false;
      docHistoryStatusPopover.classList.add("is-open");
      docHistoryStatusActiveIndex = index;
      docHistoryStatusActiveMenu = menu;
      docHistoryStatusActiveToggle = toggleBtn;
      setDocHistoryStatusMenuOpenState(menu, true);
      requestAnimationFrame(() => positionDocHistoryStatusPopover(toggleBtn));
    }

    function closeDocHistoryStatusMenu() {
      if (!docHistoryStatusPopover || docHistoryStatusPopover.hidden) return;
      docHistoryStatusPopover.hidden = true;
      docHistoryStatusPopover.classList.remove("is-open");
      docHistoryStatusPopover.style.left = "";
      docHistoryStatusPopover.style.top = "";
      if (docHistoryStatusPopoverPanel) {
        docHistoryStatusPopoverPanel.style.width = "";
        docHistoryStatusPopoverPanel.style.minWidth = "";
      }
      if (docHistoryStatusActiveMenu) {
        setDocHistoryStatusMenuOpenState(docHistoryStatusActiveMenu, false);
      }
      docHistoryStatusActiveIndex = null;
      docHistoryStatusActiveMenu = null;
      docHistoryStatusActiveToggle = null;
    }

    function setDocHistoryActionsMenuOpenState(menu, shouldOpen) {
      if (!menu) return;
      const isOpen = Boolean(shouldOpen);
      if (isOpen) {
        menu.setAttribute("open", "");
      } else {
        menu.removeAttribute("open");
      }
      const toggleBtn = menu.querySelector(".doc-history-actions-trigger");
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      }
    }

    function ensureDocHistoryActionsPopover() {
      if (docHistoryActionsPopover) return;
      docHistoryActionsPopover = document.createElement("div");
      docHistoryActionsPopover.className = "doc-history-actions-popover";
      docHistoryActionsPopover.hidden = true;
      docHistoryActionsPopoverPanel = document.createElement("div");
      docHistoryActionsPopoverPanel.className = "doc-history-actions-panel";
      docHistoryActionsPopoverPanel.setAttribute("role", "menu");
      docHistoryActionsPopoverPanel.setAttribute("aria-label", "Action");
      docHistoryActionsPopover.appendChild(docHistoryActionsPopoverPanel);
      document.body.appendChild(docHistoryActionsPopover);
      docHistoryActionsPopoverPanel.addEventListener("click", onDocHistoryActionsPopoverClick);
    }

    function renderDocHistoryActionsPopoverOptions(menuIndex) {
      if (!docHistoryActionsPopoverPanel) return;
      const showConvert = ["devis", "bl", "facture"].includes(
        String(historyModalState.docType || "").toLowerCase()
      );
      const convertMenuItemHtml = showConvert
        ? `<button type="button" class="client-search__edit" data-doc-history-convert="${menuIndex}" role="menuitem">Convertir</button>`
        : "";
      const docTypeValue = String(historyModalState.docType || "").toLowerCase();
      const showWithholdingExport = docTypeValue === "fa";
      const withholdingMenuItemHtml = showWithholdingExport
        ? `<button type="button" class="client-search__edit" data-doc-history-withholding="${menuIndex}" role="menuitem">Cr\u00E9er la retenue \u00E0 la source</button>`
        : "";
      const showSignerFacture = docTypeValue === "facture";
      const signerFactureMenuItemHtml = showSignerFacture
        ? `<button type="button" class="client-search__edit" data-doc-history-signer="${menuIndex}" role="menuitem">Signer Facture</button>`
        : "";
      docHistoryActionsPopoverPanel.innerHTML = `
        <button type="button" class="client-search__edit" data-doc-history-open="${menuIndex}" role="menuitem">Modifier</button>
        <button type="button" class="client-search__edit" data-doc-history-duplicate="${menuIndex}" role="menuitem">Dupliquer</button>
        ${convertMenuItemHtml}
        ${withholdingMenuItemHtml}
        ${signerFactureMenuItemHtml}
        <button type="button" class="client-search__deleteDoc" data-doc-history-delete="${menuIndex}" role="menuitem">Supprimer</button>
      `;
    }

    function positionDocHistoryActionsPopover(triggerEl) {
      if (!docHistoryActionsPopover || docHistoryActionsPopover.hidden || !triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const popoverRect = docHistoryActionsPopover.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      let left = triggerRect.left;
      let top = triggerRect.bottom + 4;
      if (left + popoverRect.width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - popoverRect.width - 8);
      }
      if (top + popoverRect.height > viewportHeight - 8) {
        top = Math.max(8, triggerRect.top - popoverRect.height - 4);
      }
      docHistoryActionsPopover.style.left = `${left}px`;
      docHistoryActionsPopover.style.top = `${top}px`;
    }

    function openDocHistoryActionsMenu(index, toggleBtn) {
      if (typeof index !== "number" || Number.isNaN(index) || !toggleBtn) return;
      const menu = toggleBtn.closest("[data-doc-history-actions-menu]");
      if (!menu) return;
      closeDocHistoryExportMenu();
      ensureDocHistoryActionsPopover();
      if (!docHistoryActionsPopover || !docHistoryActionsPopoverPanel) return;
      renderDocHistoryActionsPopoverOptions(index);
      const triggerRect = toggleBtn.getBoundingClientRect();
      const triggerWidth = Math.max(Math.round(triggerRect.width), 150);
      docHistoryActionsPopoverPanel.style.width = `${triggerWidth}px`;
      docHistoryActionsPopoverPanel.style.minWidth = `${triggerWidth}px`;
      docHistoryActionsPopover.hidden = false;
      docHistoryActionsPopover.classList.add("is-open");
      docHistoryActionsActiveIndex = index;
      docHistoryActionsActiveMenu = menu;
      docHistoryActionsActiveToggle = toggleBtn;
      setDocHistoryActionsMenuOpenState(menu, true);
      requestAnimationFrame(() => positionDocHistoryActionsPopover(toggleBtn));
    }

    function closeDocHistoryActionsMenu() {
      if (!docHistoryActionsPopover || docHistoryActionsPopover.hidden) return;
      docHistoryActionsPopover.hidden = true;
      docHistoryActionsPopover.classList.remove("is-open");
      docHistoryActionsPopover.style.left = "";
      docHistoryActionsPopover.style.top = "";
      if (docHistoryActionsPopoverPanel) {
        docHistoryActionsPopoverPanel.style.width = "";
        docHistoryActionsPopoverPanel.style.minWidth = "";
      }
      if (docHistoryActionsActiveMenu) {
        setDocHistoryActionsMenuOpenState(docHistoryActionsActiveMenu, false);
      }
      docHistoryActionsActiveIndex = null;
      docHistoryActionsActiveMenu = null;
      docHistoryActionsActiveToggle = null;
    }

    function setDocHistoryExportMenuOpenState(menu, shouldOpen) {
      if (!menu) return;
      const isOpen = Boolean(shouldOpen);
      if (isOpen) {
        menu.setAttribute("open", "");
      } else {
        menu.removeAttribute("open");
      }
      const toggleBtn = menu.querySelector(".doc-history-export-trigger");
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      }
    }

    function ensureDocHistoryExportPopover() {
      if (docHistoryExportPopover) return;
      docHistoryExportPopover = document.createElement("div");
      docHistoryExportPopover.className = "doc-history-export-popover";
      docHistoryExportPopover.hidden = true;
      docHistoryExportPopoverPanel = document.createElement("div");
      docHistoryExportPopoverPanel.className = "doc-history-export-panel";
      docHistoryExportPopoverPanel.setAttribute("role", "menu");
      docHistoryExportPopoverPanel.setAttribute("aria-label", "Export");
      docHistoryExportPopover.appendChild(docHistoryExportPopoverPanel);
      document.body.appendChild(docHistoryExportPopover);
      docHistoryExportPopoverPanel.addEventListener("click", onDocHistoryExportPopoverClick);
    }

    function renderDocHistoryExportPopoverOptions(menuIndex) {
      if (!docHistoryExportPopoverPanel) return;
      const docTypeValue = String(historyModalState.docType || "").toLowerCase();
      const showPurchaseExport = docTypeValue === "facture";
      const purchaseExportMenuItemHtml = showPurchaseExport
        ? `<button type="button" class="client-search__edit" data-doc-history-export-purchase="${menuIndex}" role="menuitem">Exporter tant que Facture d'achat</button>`
        : "";
      docHistoryExportPopoverPanel.innerHTML = `
        <button type="button" class="client-search__edit" data-doc-history-export="${menuIndex}" role="menuitem">Exporter PDF</button>
        ${purchaseExportMenuItemHtml}
      `;
    }

    function positionDocHistoryExportPopover(triggerEl) {
      if (!docHistoryExportPopover || docHistoryExportPopover.hidden || !triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const popoverRect = docHistoryExportPopover.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      let left = triggerRect.left;
      let top = triggerRect.bottom + 4;
      if (left + popoverRect.width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - popoverRect.width - 8);
      }
      if (top + popoverRect.height > viewportHeight - 8) {
        top = Math.max(8, triggerRect.top - popoverRect.height - 4);
      }
      docHistoryExportPopover.style.left = `${left}px`;
      docHistoryExportPopover.style.top = `${top}px`;
    }

    function openDocHistoryExportMenu(index, toggleBtn) {
      if (typeof index !== "number" || Number.isNaN(index) || !toggleBtn) return;
      const menu = toggleBtn.closest("[data-doc-history-export-menu]");
      if (!menu) return;
      closeDocHistoryActionsMenu();
      closeDocHistoryStatusMenu();
      ensureDocHistoryExportPopover();
      if (!docHistoryExportPopover || !docHistoryExportPopoverPanel) return;
      renderDocHistoryExportPopoverOptions(index);
      const triggerRect = toggleBtn.getBoundingClientRect();
      const triggerWidth = Math.max(Math.round(triggerRect.width), 150);
      docHistoryExportPopoverPanel.style.width = `${triggerWidth}px`;
      docHistoryExportPopoverPanel.style.minWidth = `${triggerWidth}px`;
      docHistoryExportPopover.hidden = false;
      docHistoryExportPopover.classList.add("is-open");
      docHistoryExportActiveIndex = index;
      docHistoryExportActiveMenu = menu;
      docHistoryExportActiveToggle = toggleBtn;
      setDocHistoryExportMenuOpenState(menu, true);
      requestAnimationFrame(() => positionDocHistoryExportPopover(toggleBtn));
    }

    function closeDocHistoryExportMenu() {
      if (!docHistoryExportPopover || docHistoryExportPopover.hidden) return;
      docHistoryExportPopover.hidden = true;
      docHistoryExportPopover.classList.remove("is-open");
      docHistoryExportPopover.style.left = "";
      docHistoryExportPopover.style.top = "";
      if (docHistoryExportPopoverPanel) {
        docHistoryExportPopoverPanel.style.width = "";
        docHistoryExportPopoverPanel.style.minWidth = "";
      }
      if (docHistoryExportActiveMenu) {
        setDocHistoryExportMenuOpenState(docHistoryExportActiveMenu, false);
      }
      docHistoryExportActiveIndex = null;
      docHistoryExportActiveMenu = null;
      docHistoryExportActiveToggle = null;
    }

    async function onDocHistoryActionsPopoverClick(evt) {
      const openBtn = evt.target.closest("[data-doc-history-open]");
      if (openBtn) {
        evt.preventDefault();
        const idx = Number(openBtn.dataset.docHistoryOpen);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryOpen(idx);
        return;
      }
      const duplicateBtn = evt.target.closest("[data-doc-history-duplicate]");
      if (duplicateBtn) {
        evt.preventDefault();
        const idx = Number(duplicateBtn.dataset.docHistoryDuplicate);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryDuplicate(idx);
        return;
      }
      const convertBtn = evt.target.closest("[data-doc-history-convert]");
      if (convertBtn) {
        evt.preventDefault();
        const idx = Number(convertBtn.dataset.docHistoryConvert);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        closeDocHistoryActionsMenu();
        await handleDocHistoryConvert(entry);
        return;
      }
      const signerFactureBtn = evt.target.closest("[data-doc-history-signer]");
      if (signerFactureBtn) {
        evt.preventDefault();
        const idx = Number(signerFactureBtn.dataset.docHistorySigner);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistorySignerFacture(idx);
        return;
      }
      const teifBtn = evt.target.closest("[data-doc-history-teif]");
      if (teifBtn) {
        evt.preventDefault();
        const idx = Number(teifBtn.dataset.docHistoryTeif);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryTeifUnsigned(idx, teifBtn);
        return;
      }
      const idTrustBtn = evt.target.closest("[data-doc-history-idtrust]");
      if (idTrustBtn) {
        evt.preventDefault();
        const idx = Number(idTrustBtn.dataset.docHistoryIdtrust);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryIdTrustSign(idx, idTrustBtn);
        return;
      }
      const digigoBtn = evt.target.closest("[data-doc-history-digigo]");
      if (digigoBtn) {
        evt.preventDefault();
        closeDocHistoryActionsMenu();
        openDigigoLogin();
        return;
      }
      const withholdingBtn = evt.target.closest("[data-doc-history-withholding]");
      if (withholdingBtn) {
        evt.preventDefault();
        const idx = Number(withholdingBtn.dataset.docHistoryWithholding);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryWithholdingExport(idx, withholdingBtn);
        return;
      }
      const deleteBtn = evt.target.closest("[data-doc-history-delete]");
      if (deleteBtn) {
        evt.preventDefault();
        const idx = Number(deleteBtn.dataset.docHistoryDelete);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        await handleDocHistoryDelete(idx);
      }
    }

    async function onDocHistoryExportPopoverClick(evt) {
      const exportBtn = evt.target.closest("[data-doc-history-export]");
      if (exportBtn) {
        evt.preventDefault();
        const idx = Number(exportBtn.dataset.docHistoryExport);
        if (Number.isNaN(idx)) return;
        closeDocHistoryExportMenu();
        await handleDocHistoryExport(idx, exportBtn);
        return;
      }
      const exportPurchaseBtn = evt.target.closest("[data-doc-history-export-purchase]");
      if (exportPurchaseBtn) {
        evt.preventDefault();
        const idx = Number(exportPurchaseBtn.dataset.docHistoryExportPurchase);
        if (Number.isNaN(idx)) return;
        closeDocHistoryExportMenu();
        await handleDocHistoryExportPurchase(idx, exportPurchaseBtn);
      }
    }

    async function onDocHistoryStatusPopoverClick(evt) {
      const statusBtn = evt.target.closest("[data-doc-history-status-value]");
      if (!statusBtn) return;
      evt.preventDefault();
      const idx = Number(statusBtn.dataset.docHistoryStatusIndex);
      const nextValue = normalizeDocHistoryStatusValue(statusBtn.dataset.docHistoryStatusValue);
      if (Number.isNaN(idx) || !nextValue) return;
      const entry = historyModalState.items?.[idx];
      const currentValue = normalizeDocHistoryStatusValue(entry?.status);
      if (currentValue && currentValue === nextValue) {
        closeDocHistoryStatusMenu();
        return;
      }
      const confirmResult = await confirmDocHistoryStatusChange(entry, nextValue);
      if (!confirmResult?.confirmed) return;
      const paymentUpdate =
        Number.isFinite(confirmResult?.paidAmount) && confirmResult.paidAmount > 0
          ? { paid: confirmResult.paidAmount }
          : null;
      updateDocHistoryStatusMenu(idx, nextValue, {
        paymentUpdate,
        paymentMethod: confirmResult?.paymentMethod || "",
        paymentDate: confirmResult?.paymentDate || "",
        paymentReference: confirmResult?.paymentReference
      });
      closeDocHistoryStatusMenu();
      if (paymentUpdate && isHistoryModalOpen()) {
        renderHistoryModal();
      }
    }

    function syncDocHistoryStatusPopoverSelection(value) {
      if (!docHistoryStatusPopover || docHistoryStatusPopover.hidden) return;
      const normalizedValue =
        normalizeDocHistoryStatusValue(value) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      docHistoryStatusPopover.querySelectorAll("[data-doc-history-status-value]").forEach((btn) => {
        const isActive = btn.dataset.docHistoryStatusValue === normalizedValue;
        btn.classList.toggle("doc-history-status-option--active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
    }

    function updateDocHistoryStatusMenu(index, value, options = {}) {
      if (typeof index !== "number" || Number.isNaN(index)) return;
      const normalizedValue =
        normalizeDocHistoryStatusValue(value) || DOC_HISTORY_STATUS_OPTIONS[0].value;
      const targetMenu = historyModalList?.querySelector(
        `[data-doc-history-status-menu="${index}"]`
      );
      if (!targetMenu) return;
      targetMenu.dataset.currentValue = normalizedValue;
      const labelEl = targetMenu.querySelector(".doc-history__status-label");
      if (labelEl) labelEl.textContent = docHistoryStatusLabel(normalizedValue);
      if (docHistoryStatusActiveIndex === index) {
        syncDocHistoryStatusPopoverSelection(normalizedValue);
      }
      const entry = historyModalState.items?.[index];
      if (entry) {
        const previousStatusValue = normalizeDocHistoryStatusValue(entry?.status);
        let paymentUpdate = null;
        const previousPaid = Number(entry?.paid);
        const normalizedNextStatus = normalizedValue;
        const isReactivatingFromBrouillon =
          isBrouillonStatus(previousStatusValue) && isPaidStatus(normalizedNextStatus);
        const entryDocType = String(entry?.docType || historyModalState.docType || "").toLowerCase();
        const paymentMethod =
          typeof options?.paymentMethod === "string" && options.paymentMethod.trim()
            ? options.paymentMethod.trim()
            : "";
        const paymentDate =
          typeof options?.paymentDate === "string" && options.paymentDate.trim()
            ? options.paymentDate.trim()
            : "";
        const shouldClearReference = isUnpaidStatus(normalizedValue);
        const hasPaymentReference =
          shouldClearReference || typeof options?.paymentReference === "string";
        const paymentReference = shouldClearReference
          ? ""
          : hasPaymentReference
            ? String(options?.paymentReference ?? "").trim()
            : "";
        if (options && options.paymentUpdate) {
          paymentUpdate = applyHistoryPaymentUpdate(entry, options.paymentUpdate);
        } else if (normalizedValue === "payee") {
          const totalValue = resolveHistoryEntryTotal(entry);
          if (Number.isFinite(totalValue) && totalValue > 0) {
            paymentUpdate = applyHistoryPaymentUpdate(entry, { paid: totalValue });
          }
        } else if (isUnpaidStatus(normalizedValue)) {
          paymentUpdate = applyHistoryPaymentUpdate(entry, { paid: 0 });
        }
        if (paymentUpdate) {
          const nextPaid = Number(paymentUpdate.paid);
          if (normalizedValue === "payee") {
            const totalValue = resolveHistoryEntryTotal(entry);
            const priorPaid = Number.isFinite(previousPaid) ? previousPaid : 0;
            const delta = Number.isFinite(totalValue)
              ? Math.max(0, totalValue - priorPaid)
              : nextPaid;
            paymentUpdate.historyAmount = delta;
            paymentUpdate.historyBalanceDue = 0;
          } else if (normalizedValue === "partiellement-payee") {
            paymentUpdate.historyAmount = Number.isFinite(nextPaid) ? nextPaid : null;
            paymentUpdate.historyBalanceDue = Number(paymentUpdate.balanceDue);
          } else if (isUnpaidStatus(normalizedValue)) {
            paymentUpdate.historyAmount = 0;
            paymentUpdate.historyBalanceDue = Number(paymentUpdate.balanceDue);
          }
        }
        let ledgerDelta = null;
        if (paymentUpdate && entryDocType === "facture" && isPaidStatus(normalizedNextStatus)) {
          const nextPaid = Number(paymentUpdate.paid);
          const priorPaid = Number.isFinite(previousPaid) ? previousPaid : 0;
          if (Number.isFinite(nextPaid)) {
            ledgerDelta = isReactivatingFromBrouillon ? nextPaid : nextPaid - priorPaid;
          }
        }
        if (isUnpaidStatus(normalizedValue)) {
          entry.paymentMethod = "";
          entry.paymentDate = "";
          entry.paymentReference = "";
          entry.paymentRef = "";
        } else {
          if (paymentMethod) {
            entry.paymentMethod = paymentMethod;
          }
          if (hasPaymentReference) {
            entry.paymentReference = paymentReference;
            entry.paymentRef = paymentReference;
          }
          if (paymentDate) {
            entry.paymentDate = paymentDate;
          }
        }
        entry.status = normalizedValue;
        if (paymentUpdate && typeof w.addDocumentHistory === "function") {
          try {
            w.addDocumentHistory({
              docType: entry.docType || historyModalState.docType || "facture",
              path: entry.path,
              number: entry.number,
              date: entry.date,
              name: entry.name,
              clientName: entry.clientName,
              clientAccount: entry.clientAccount,
              totalHT: entry.totalHT,
              totalTTC: entry.totalTTC,
              currency: entry.currency,
              paid: entry.paid,
              balanceDue: entry.balanceDue,
              acompteEnabled: true,
              status: entry.status,
              paymentMethod: paymentMethod || entry.paymentMethod || entry.mode || "",
              paymentRef: entry.paymentReference || entry.paymentRef || "",
              paymentReference: entry.paymentReference || entry.paymentRef || "",
              paymentDate: entry.paymentDate || ""
            });
          } catch (err) {
            console.warn("history payment update failed", err);
          }
        }
        persistDocHistoryStatus(
          entry,
          normalizedValue,
          paymentUpdate,
          paymentMethod || entry.paymentMethod,
          paymentDate || entry.paymentDate,
          hasPaymentReference ? paymentReference : undefined
        );
        if (Number.isFinite(ledgerDelta) && ledgerDelta !== 0) {
          const ledgerType = ledgerDelta > 0 ? "credit" : "debit";
          const ledgerSource = ledgerDelta > 0 ? "invoice_payment" : LEDGER_UNPAID_SOURCE;
          const ledgerAmount = Math.abs(ledgerDelta);
          if (isReactivatingFromBrouillon && entryDocType === "facture") {
            syncUnpaidInvoiceLedgerEntry(entry)
              .then(() =>
                journalPaymentDeltaToLedger(
                  entry,
                  ledgerAmount,
                  paymentDate || entry.paymentDate,
                  ledgerType,
                  ledgerSource
                )
              )
              .catch((err) => {
                console.warn("doc-history ledger entry failed", err);
              });
          } else {
            journalPaymentDeltaToLedger(
              entry,
              ledgerAmount,
              paymentDate || entry.paymentDate,
              ledgerType,
              ledgerSource
            ).catch((err) => {
              console.warn("doc-history ledger entry failed", err);
            });
          }
        } else if (isBrouillonStatus(normalizedValue)) {
          removeInvoiceLedgerEntries(entry).catch((err) => {
            console.warn("doc-history ledger entry failed", err);
          });
        } else if (isUnpaidStatus(normalizedValue)) {
          removePaidInvoiceLedgerEntries(entry).catch((err) => {
            console.warn("doc-history ledger entry failed", err);
          });
          syncUnpaidInvoiceLedgerEntry(entry).catch((err) => {
            console.warn("doc-history ledger entry failed", err);
          });
        }
      }
    }

    async function confirmDocHistoryStatusChange(entry, nextValue) {
      const nextLabel = docHistoryStatusLabel(nextValue);
      const entryNumber = String(entry?.number || entry?.name || "").trim();
      const entrySuffix = entryNumber ? ` ${entryNumber}` : "";
      const message = `Changer le statut de la facture${entrySuffix} vers \"${nextLabel}\" ?`;
      if (String(nextValue || "").trim().toLowerCase() === "partiellement-payee") {
        let paidAmount = null;
        const maxAllowed = Number(entry?.totalTTC);
        const hasMax = Number.isFinite(maxAllowed) && maxAllowed > 0;
        const paymentDateInitial = (() => {
          const rawPaymentDate = entry?.paymentDate || entry?.date || "";
          if (rawPaymentDate) return String(rawPaymentDate).slice(0, 10);
          return new Date().toISOString().slice(0, 10);
        })();
        let paymentDateValue = paymentDateInitial;
        let paymentReference = String(
          entry?.paymentReference || entry?.paymentRef || ""
        ).trim();
        const normalizeMethod = (value) => {
          const raw = String(value || "").trim().toLowerCase();
          if (!raw) return "";
          return DOC_HISTORY_PAYMENT_OPTIONS.some((opt) => opt.value === raw) ? raw : "";
        };
        const initialMethod = normalizeMethod(entry?.paymentMethod || entry?.mode) || "cash";
        let selectedPaymentMethod = initialMethod;
        const formatMoneyForDialog =
          typeof w.formatMoney === "function"
            ? w.formatMoney
            : (value, currency) => {
                const num = Number(value);
                if (!Number.isFinite(num)) return "--";
                const formatted = num.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
                return currency ? `${formatted} ${currency}` : formatted;
              };
        if (typeof w.showConfirm === "function") {
          const confirmed = await w.showConfirm(message, {
            title: "Statut de facture",
            okText: "Modifier",
            cancelText: "Annuler",
            renderMessage(container) {
              if (!container) return;
              container.innerHTML = "";
              container.style.maxHeight = "none";
              container.style.overflow = "visible";
              const messageEl = document.createElement("p");
              messageEl.textContent = message;
              const row = document.createElement("div");
              row.className = "payment-modal__row";
              const field = document.createElement("div");
              field.className = "payment-modal__field";
              const label = document.createElement("label");
              label.textContent = "Pay\u00e9";
              const input = document.createElement("input");
              const inputId = `docHistoryPaidInput-${Date.now()}`;
              const paymentDateInputId = `docHistoryPaymentDateInput-${Date.now()}`;
              const paymentDatePanelId = `${paymentDateInputId}Panel`;
              label.setAttribute("for", inputId);
              input.type = "text";
              input.id = inputId;
              input.inputMode = "decimal";
              input.autocomplete = "off";
              input.placeholder = "Montant pay\u00e9";
              const paymentDateField = document.createElement("div");
              paymentDateField.className = "payment-modal__field";
              const paymentDateLabel = document.createElement("label");
              paymentDateLabel.textContent = "Date de paiement";
              paymentDateLabel.setAttribute("for", paymentDateInputId);
              const paymentDatePicker = document.createElement("div");
              paymentDatePicker.className = "swb-date-picker";
              paymentDatePicker.setAttribute("data-date-picker", "");
              paymentDatePicker.innerHTML = `
                <input
                  id="${paymentDateInputId}"
                  type="text"
                  inputmode="numeric"
                  placeholder="AAAA-MM-JJ"
                  autocomplete="off"
                  spellcheck="false"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  role="combobox"
                  aria-controls="${paymentDatePanelId}"
                >
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="${paymentDatePanelId}"
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
                  id="${paymentDatePanelId}"
                ></div>
              `;
              paymentDateField.append(paymentDateLabel, paymentDatePicker);
              const balanceField = document.createElement("div");
              balanceField.className = "payment-modal__field";
              const balanceLabel = document.createElement("label");
              balanceLabel.className = "payment-modal__field-label";
              balanceLabel.textContent = "Solde d\u00fb";
              const balanceValue = document.createElement("div");
              balanceValue.className = "payment-modal__amount-cell";
              const balanceAmount = document.createElement("span");
              balanceAmount.className = "payment-modal__field-value";
              const transferBtn = document.createElement("button");
              transferBtn.type = "button";
              transferBtn.className = "payment-modal__amount-transfer";
              transferBtn.setAttribute("aria-label", "Utiliser ce montant");
              transferBtn.title = "Utiliser ce montant";
              transferBtn.innerHTML =
                '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h10v10h-2V9.41l-9.29 9.3-1.42-1.42 9.3-9.29H8z"/></svg>';
              let balanceAmountValue = null;
              selectedPaymentMethod = initialMethod;

              const createMenuGroup = ({
                idPrefix,
                labelText,
                placeholderText,
                options,
                selectedValue,
                onChange
              }) => {
                const group = document.createElement("div");
                group.className = "doc-history-convert__field";
                const label = document.createElement("label");
                label.className = "doc-history-convert__label doc-dialog-model-picker__label";
                label.id = `${idPrefix}Label`;
                label.textContent = labelText;
                const field = document.createElement("div");
                field.className = "doc-dialog-model-picker__field";

                const menu = document.createElement("details");
                menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
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
                display.textContent = placeholderText || "";
                summary.appendChild(display);
                summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
                menu.appendChild(summary);

                const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
                const panel = document.createElement("div");
                panel.id = `${idPrefix}Panel`;
                panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
                panel.setAttribute("role", "listbox");
                panel.setAttribute("aria-labelledby", label.id);
                menu.appendChild(panelPlaceholder);
                menu.appendChild(panel);

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
                  const match = options.find((opt) => opt.value === value);
                  return match?.label || "";
                };

                panel.textContent = "";
                options.forEach((opt) => {
                  const value = opt.value || "";
                  const labelText = opt.label || value;
                  const btn = document.createElement("button");
                  btn.type = "button";
                  btn.className = "model-select-option";
                  btn.dataset.value = value;
                  btn.setAttribute("role", "option");
                  btn.setAttribute("aria-selected", "false");
                  btn.textContent = labelText;
                  panel.appendChild(btn);

                  const option = document.createElement("option");
                  option.value = value;
                  option.textContent = labelText;
                  hiddenSelect.appendChild(option);
                });

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
                  menu.open = !menu.open;
                  summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
                  if (!menu.open) summary.focus();
                });

                menu.addEventListener("keydown", (evt) => {
                  if (evt.key === "Escape") {
                    evt.preventDefault();
                    menu.open = false;
                    summary.setAttribute("aria-expanded", "false");
                    summary.focus();
                  }
                });

                document.addEventListener("click", (evt) => {
                  if (!menu.open) return;
                  if (menu.contains(evt.target)) return;
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                });

                field.append(menu, hiddenSelect);
                group.append(label, field);
                setSelection(selectedValue, { closeMenu: false, notify: false });
                return group;
              };

              const methodGroup = createMenuGroup({
                idPrefix: "docPaymentMethod",
                labelText: "Mode de paiement",
                placeholderText: "Choisir un mode",
                options: DOC_HISTORY_PAYMENT_OPTIONS,
                selectedValue: selectedPaymentMethod,
                onChange: (value) => {
                  selectedPaymentMethod = value || "";
                  updateState();
                }
              });
              const refField = document.createElement("div");
              refField.className = "doc-history-convert__field";
              const refLabel = document.createElement("label");
              refLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
              refLabel.textContent = "R\u00e9f. paiement";
              const refInput = document.createElement("input");
              const refInputId = `docHistoryPaymentReferenceInput-${Date.now()}`;
              refInput.id = refInputId;
              refInput.type = "text";
              refInput.className = "doc-history-convert__input";
              refInput.placeholder = "R\u00e9f. paiement";
              refInput.value = paymentReference;
              refInput.addEventListener("input", () => {
                paymentReference = String(refInput.value || "").trim();
              });
              refLabel.htmlFor = refInputId;
              refField.append(refLabel, refInput);
              const okBtn =
                (typeof getEl === "function" && getEl("swbDialogOk")) ||
                document.getElementById("swbDialogOk");
              const updateState = () => {
                const parsed = parsePaidAmountInput(input.value);
                paidAmount = parsed;
                const withinMax = !hasMax || (Number.isFinite(parsed) && parsed <= maxAllowed);
                const hasMethod = !!selectedPaymentMethod;
                const isValid = Number.isFinite(parsed) && parsed > 0 && withinMax && hasMethod;
                if (okBtn) okBtn.disabled = !isValid;
                if (hasMax && Number.isFinite(parsed)) {
                  const nextBalance = Math.max(0, maxAllowed - parsed);
                  balanceAmountValue = nextBalance;
                  balanceAmount.textContent = formatMoneyForDialog(
                    nextBalance,
                    entry?.currency || ""
                  );
                } else if (hasMax) {
                  balanceAmountValue = maxAllowed;
                  balanceAmount.textContent = formatMoneyForDialog(
                    maxAllowed,
                    entry?.currency || ""
                  );
                } else {
                  balanceAmountValue = null;
                  balanceAmount.textContent = "--";
                }
              };
              input.addEventListener("input", updateState);
              transferBtn.addEventListener("click", () => {
                if (!Number.isFinite(balanceAmountValue)) return;
                input.value = String(balanceAmountValue);
                updateState();
              });
              const paymentDateInput = paymentDatePicker.querySelector(
                `#${paymentDateInputId}`
              );
              if (paymentDateInput) {
                paymentDateInput.value = paymentDateInitial;
                if (createDatePicker) {
                  const picker = createDatePicker(paymentDateInput, {
                    onChange: (value) => {
                      paymentDateValue = String(value || "").slice(0, 10);
                    }
                  });
                  if (picker) picker.setValue(paymentDateInitial, { silent: true });
                } else {
                  paymentDateInput.addEventListener("input", () => {
                    paymentDateValue = paymentDateInput.value || "";
                  });
                }
              }
              field.append(label, input);
              balanceValue.append(balanceAmount, transferBtn);
              balanceField.append(balanceLabel, balanceValue);
              row.append(field, paymentDateField, methodGroup, refField, balanceField);
              container.append(messageEl, row);
              if (okBtn) okBtn.disabled = true;
              updateState();
              requestAnimationFrame(() => {
                try {
                  input.focus();
                } catch {}
              });
            }
          });
          return confirmed && Number.isFinite(paidAmount) && paidAmount > 0
            ? {
                confirmed: true,
                paidAmount,
                paymentMethod: selectedPaymentMethod,
                paymentDate: paymentDateValue,
                paymentReference
              }
            : { confirmed: false };
        }
        if (typeof window.prompt === "function") {
          const raw = window.prompt("Montant pay\u00e9 :", "");
          const parsed = parsePaidAmountInput(raw);
          return Number.isFinite(parsed) && parsed > 0
            ? {
                confirmed: true,
                paidAmount: parsed,
                paymentMethod: selectedPaymentMethod,
                paymentDate: paymentDateValue,
                paymentReference
              }
            : { confirmed: false };
        }
        return { confirmed: false };
      }
      if (String(nextValue || "").trim().toLowerCase() === "payee") {
        const normalizeMethod = (value) => {
          const raw = String(value || "").trim().toLowerCase();
          if (!raw) return "";
          return DOC_HISTORY_PAYMENT_OPTIONS.some((opt) => opt.value === raw) ? raw : "";
        };
        let selectedPaymentMethod = normalizeMethod(entry?.paymentMethod || entry?.mode) || "cash";
        let paymentReference = String(
          entry?.paymentReference || entry?.paymentRef || ""
        ).trim();
        if (typeof w.showConfirm === "function") {
          const confirmed = await w.showConfirm(message, {
            title: "Statut de facture",
            okText: "Modifier",
            cancelText: "Annuler",
            renderMessage(container) {
              if (!container) return;
              container.innerHTML = "";
              container.style.maxHeight = "none";
              container.style.overflow = "visible";
              const messageEl = document.createElement("p");
              messageEl.textContent = message;

              const createMenuGroup = ({
                idPrefix,
                labelText,
                placeholderText,
                options,
                selectedValue,
                onChange
              }) => {
                const group = document.createElement("div");
                group.className = "doc-history-convert__field";
                const label = document.createElement("label");
                label.className = "doc-history-convert__label doc-dialog-model-picker__label";
                label.id = `${idPrefix}Label`;
                label.textContent = labelText;
                const field = document.createElement("div");
                field.className = "doc-dialog-model-picker__field";

                const menu = document.createElement("details");
                menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
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
                display.textContent = placeholderText || "";
                summary.appendChild(display);
                summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
                menu.appendChild(summary);

                const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
                const panel = document.createElement("div");
                panel.id = `${idPrefix}Panel`;
                panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
                panel.setAttribute("role", "listbox");
                panel.setAttribute("aria-labelledby", label.id);
                menu.appendChild(panelPlaceholder);
                menu.appendChild(panel);

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
                  const match = options.find((opt) => opt.value === value);
                  return match?.label || "";
                };

                panel.textContent = "";
                options.forEach((opt) => {
                  const value = opt.value || "";
                  const labelText = opt.label || value;
                  const btn = document.createElement("button");
                  btn.type = "button";
                  btn.className = "model-select-option";
                  btn.dataset.value = value;
                  btn.setAttribute("role", "option");
                  btn.setAttribute("aria-selected", "false");
                  btn.textContent = labelText;
                  panel.appendChild(btn);

                  const option = document.createElement("option");
                  option.value = value;
                  option.textContent = labelText;
                  hiddenSelect.appendChild(option);
                });

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
                  menu.open = !menu.open;
                  summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
                  if (!menu.open) summary.focus();
                });

                menu.addEventListener("keydown", (evt) => {
                  if (evt.key === "Escape") {
                    evt.preventDefault();
                    menu.open = false;
                    summary.setAttribute("aria-expanded", "false");
                    summary.focus();
                  }
                });

                document.addEventListener("click", (evt) => {
                  if (!menu.open) return;
                  if (menu.contains(evt.target)) return;
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                });

                field.append(menu, hiddenSelect);
                group.append(label, field);
                setSelection(selectedValue, { closeMenu: false, notify: false });
                return group;
              };

              const methodGroup = createMenuGroup({
                idPrefix: "docPaymentMethod",
                labelText: "Mode de paiement",
                placeholderText: "Choisir un mode",
                options: DOC_HISTORY_PAYMENT_OPTIONS,
                selectedValue: selectedPaymentMethod,
                onChange: (value) => {
                  selectedPaymentMethod = value || "";
                }
              });
              const refField = document.createElement("div");
              refField.className = "doc-history-convert__field";
              const refLabel = document.createElement("label");
              refLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
              refLabel.textContent = "R\u00e9f. paiement";
              const refInput = document.createElement("input");
              const refInputId = `docHistoryPaymentReferenceInput-${Date.now()}`;
              refInput.id = refInputId;
              refInput.type = "text";
              refInput.className = "doc-history-convert__input";
              refInput.placeholder = "R\u00e9f. paiement";
              refInput.value = paymentReference;
              refInput.addEventListener("input", () => {
                paymentReference = String(refInput.value || "").trim();
              });
              refLabel.htmlFor = refInputId;
              refField.append(refLabel, refInput);

              const okBtn =
                (typeof getEl === "function" && getEl("swbDialogOk")) ||
                document.getElementById("swbDialogOk");
              const setOkState = () => {
                const hasMethod = !!selectedPaymentMethod;
                if (okBtn) {
                  okBtn.disabled = !hasMethod;
                  okBtn.setAttribute("aria-disabled", hasMethod ? "false" : "true");
                }
              };

              const totalField = document.createElement("div");
              totalField.className = "doc-history-convert__field";
              const totalLabel = document.createElement("label");
              totalLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
              totalLabel.textContent = "Total TTC";
              const totalValue = document.createElement("div");
              totalValue.className = "payment-modal__amount-cell";
              const totalAmount = document.createElement("span");
              totalAmount.className = "payment-modal__field-value";
              const totalRaw = Number(entry?.totalTTC);
              const formattedTotal = Number.isFinite(totalRaw)
                ? (typeof w.formatMoney === "function"
                    ? w.formatMoney(totalRaw, entry?.currency || "")
                    : totalRaw.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }))
                : "--";
              totalAmount.textContent = formattedTotal;
              totalValue.appendChild(totalAmount);
              totalField.append(totalLabel, totalValue);

              const row = document.createElement("div");
              row.className = "payment-modal__row";
              row.append(methodGroup, refField, totalField);

              container.append(messageEl, row);
              setOkState();
            }
          });
          return confirmed
            ? {
                confirmed: true,
                paymentMethod: selectedPaymentMethod,
                paymentReference
              }
            : { confirmed: false };
        }
        return { confirmed: false };
      }
      if (typeof w.showConfirm === "function") {
        try {
          const confirmed = await w.showConfirm(message, {
            title: "Statut de facture",
            okText: "Modifier",
            cancelText: "Annuler",
            okKeepsOpen: false
          });
          return { confirmed: !!confirmed };
        } catch {}
      }
      return { confirmed: typeof window.confirm === "function" ? window.confirm(message) : false };
    }

    function focusHistoryModalInitialControl() {
      const focusTarget =
        docHistoryFilterNumber ||
        docHistoryFilterQuery ||
        docHistoryFilterStart ||
        docHistoryFilterEnd ||
        docHistoryFilterYear ||
        historyModalCloseFooter ||
        historyModalPrev ||
        historyModalClose;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    }

    function handleHistoryFilterChange() {
      historyModalState.page = 1;
      if (isHistoryModalOpen()) {
        renderHistoryModal();
      } else {
        syncHistoryModalFilterControls();
      }
    }

    if (docHistoryFilterStart) {
      if (createDatePicker) {
        docHistoryStartDatePickerController = createDatePicker(docHistoryFilterStart, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois precedent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: false,
          onChange(value) {
            historyModalState.filters.startDate = normalizeHistoryDayMonthValue(value);
            if (docHistoryFilterStart) {
              docHistoryFilterStart.value = historyModalState.filters.startDate || "";
            }
            handleHistoryFilterChange();
          }
        });
      } else {
        docHistoryFilterStart.readOnly = false;
      }
    }
    if (docHistoryFilterEnd) {
      if (createDatePicker) {
        docHistoryEndDatePickerController = createDatePicker(docHistoryFilterEnd, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois precedent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: false,
          onChange(value) {
            historyModalState.filters.endDate = normalizeHistoryDayMonthValue(value);
            if (docHistoryFilterEnd) {
              docHistoryFilterEnd.value = historyModalState.filters.endDate || "";
            }
            handleHistoryFilterChange();
          }
        });
      } else {
        docHistoryFilterEnd.readOnly = false;
      }
    }

    historyModalBtn?.addEventListener("click", () => {
      const targetType = docHistoryTypeFromDocControls(historyModalState.docType);
      openHistoryModal({ docType: targetType });
      refreshHistoryFromDisk(targetType);
    });
    docTypeActionOpen?.addEventListener("click", async () => {
      const chooser = w.showOptionsDialog;
      if (typeof chooser === "function") {
        const typeOptions = Object.entries(DOC_HISTORY_SELECTABLE_TYPE_LABELS).map(([value, label]) => ({
          value,
          label
        }));
        const choiceIndex = await chooser({
          title: "Ouvrir un document",
          message: "Choisissez le type de document a ouvrir :",
          options: typeOptions.map((entry) => ({ label: entry.label, value: entry.value }))
        });
        if (choiceIndex === null || choiceIndex === undefined) return;
        const picked = typeOptions[choiceIndex] || typeOptions[0];
        const targetType = normalizeHistoryTypeValue(picked?.value || "facture", "facture");
        openHistoryModal({ docType: targetType });
        refreshHistoryFromDisk(targetType);
        return;
      }
      const rawDocType = docTypeSelect?.value || "facture";
      const targetType = normalizeHistoryTypeValue(rawDocType, "facture");
      openHistoryModal({ docType: targetType });
      refreshHistoryFromDisk(targetType);
    });
    historyModalRefresh?.addEventListener("click", () => {
      refreshHistoryFromDisk(historyModalState.docType);
    });
    historyModalClose?.addEventListener("click", closeHistoryModal);
    historyModalRecapInfoBtn?.addEventListener("click", (evt) => {
      evt.preventDefault();
      toggleHistoryRecapPopover();
    });
    historyModalRecapPopoverClose?.addEventListener("click", (evt) => {
      evt.preventDefault();
      closeHistoryRecapPopover();
    });
    historyModal?.addEventListener("click", (evt) => {
      if (evt.target === historyModal) evt.stopPropagation();
    });
    historyModalPrev?.addEventListener("click", () => {
      if (historyModalState.page <= 1) return;
      const total = getFilteredHistoryModalEntries().length;
      if (!total) return;
      historyModalState.page -= 1;
      renderHistoryModal();
    });
    historyModalNext?.addEventListener("click", () => {
      const total = getFilteredHistoryModalEntries().length;
      if (!total) return;
      const totalPages = Math.max(1, Math.ceil(total / HISTORY_MODAL_PAGE_SIZE));
      if (historyModalState.page >= totalPages) return;
      historyModalState.page += 1;
      renderHistoryModal();
    });
    historyModalPageInput?.addEventListener("focus", (evt) => {
      if (evt?.target?.select) {
        try {
          evt.target.select();
        } catch {}
      }
    });
    historyModalPageInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        applyHistoryModalPageInput();
      } else if (evt.key === "Escape") {
        historyModalPageInput.value = String(historyModalState.page);
        historyModalPageInput.blur();
      }
    });
    historyModalPageInput?.addEventListener("blur", applyHistoryModalPageInput);
    historyModalCloseFooter?.addEventListener("click", () => {
      closeHistoryModal();
    });

    const handleHistoryFilterInput = (target) => {
      if (!target) return;
      if (target.id === "docHistoryFilterNumber") {
        historyModalState.filters.number = target.value || "";
        handleHistoryFilterChange();
      } else if (target.id === "docHistoryFilterQuery") {
        historyModalState.filters.query = target.value || "";
        handleHistoryFilterChange();
      } else if (target.id === "docHistoryFilterStart") {
        historyModalState.filters.startDate = normalizeHistoryDayMonthValue(target.value || "");
        if (docHistoryFilterStart) {
          docHistoryFilterStart.value = historyModalState.filters.startDate || "";
        }
        handleHistoryFilterChange();
      } else if (target.id === "docHistoryFilterEnd") {
        historyModalState.filters.endDate = normalizeHistoryDayMonthValue(target.value || "");
        if (docHistoryFilterEnd) {
          docHistoryFilterEnd.value = historyModalState.filters.endDate || "";
        }
        handleHistoryFilterChange();
      } else if (target.id === "docHistoryFilterYear") {
        historyModalState.filters.year =
          normalizeHistoryYearValue(target.value || "") || getCurrentHistoryYearValue();
        syncHistoryYearMenuUi(historyModalState.filters.year, { updateSelect: true });
        handleHistoryFilterChange();
      }
    };
    if (docHistoryFilterQuery) {
      docHistoryFilterQuery.addEventListener("input", (evt) =>
        handleHistoryFilterInput(evt.target)
      );
    }
    if (docHistoryFilterNumber) {
      docHistoryFilterNumber.addEventListener("input", (evt) =>
        handleHistoryFilterInput(evt.target)
      );
    }
    if (docHistoryFilterStart && !docHistoryStartDatePickerController) {
      docHistoryFilterStart.addEventListener("change", (evt) =>
        handleHistoryFilterInput(evt.target)
      );
    }
    if (docHistoryFilterEnd && !docHistoryEndDatePickerController) {
      docHistoryFilterEnd.addEventListener("change", (evt) =>
        handleHistoryFilterInput(evt.target)
      );
    }
    if (docHistoryFilterYear) {
      docHistoryFilterYear.addEventListener("change", (evt) =>
        handleHistoryFilterInput(evt.target)
      );
    }
    wireHistoryYearFilterMenu();
    historyModal?.addEventListener(
      "input",
      (evt) => {
        if (!evt.target) return;
        if (
          evt.target === docHistoryFilterNumber ||
          evt.target === docHistoryFilterQuery ||
          evt.target.id === "docHistoryFilterNumber" ||
          evt.target.id === "docHistoryFilterQuery"
        ) {
          handleHistoryFilterInput(evt.target);
        }
      },
      true
    );
    docHistoryFilterClear?.addEventListener("click", () => {
      if (
        !historyModalState.filters.number &&
        !historyModalState.filters.query &&
        !historyModalState.filters.startDate &&
        !historyModalState.filters.endDate &&
        isHistoryYearDefault(historyModalState.filters.year)
      )
        return;
      historyModalState.filters.number = "";
      historyModalState.filters.query = "";
      historyModalState.filters.startDate = "";
      historyModalState.filters.endDate = "";
      historyModalState.filters.year = getCurrentHistoryYearValue();
      if (docHistoryStartDatePickerController) {
        docHistoryStartDatePickerController.setValue("", { silent: true });
        docHistoryStartDatePickerController.close();
      } else if (docHistoryFilterStart) {
        docHistoryFilterStart.value = "";
      }
      if (docHistoryEndDatePickerController) {
        docHistoryEndDatePickerController.setValue("", { silent: true });
        docHistoryEndDatePickerController.close();
      } else if (docHistoryFilterEnd) {
        docHistoryFilterEnd.value = "";
      }
      if (docHistoryFilterYear) {
        docHistoryFilterYear.value = historyModalState.filters.year;
      }
      handleHistoryFilterChange();
    });

    async function previewHistoryEntry(entry) {
      if (!entry || !entry.path) return;
      if (
        typeof w.openInvoiceFromFilePicker !== "function" ||
        typeof w.previewInvoiceDataAsPDF !== "function"
      ) {
        const unavailable = getMessage("HISTORY_EXPORT_DIRECT_UNAVAILABLE");
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }
      try {
        const entryType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
        const raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType: entryType });
        if (!raw) {
          const docLoadError = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED");
          await w.showDialog?.(docLoadError.text, { title: docLoadError.title });
          return;
        }
        if (entryType === "facture" && entry.status) {
          injectHistoryStatusIntoRawData(raw, entry.status);
        }
        const data =
          raw && typeof raw === "object" && raw.data && typeof raw.data === "object" ? raw.data : raw;
        if (data && typeof data === "object") {
          const fallbackMeta = raw && typeof raw.meta === "object" ? raw.meta : null;
          if (!data.meta || typeof data.meta !== "object") {
            data.meta = fallbackMeta ? { ...fallbackMeta } : {};
          } else if (fallbackMeta) {
            Object.entries(fallbackMeta).forEach(([key, value]) => {
              if (data.meta[key] === undefined) data.meta[key] = value;
            });
          }
          data.meta.__pdfPreviewStrict = true;
        }
        await w.previewInvoiceDataAsPDF(raw);
      } catch (err) {
        console.error("doc-history preview failed", err);
        const previewError = getMessage("HISTORY_EXPORT_FAILED");
        await w.showDialog?.(String(err?.message || err || previewError.text), { title: previewError.title });
      }
    }

    async function handleDocHistoryOpen(idx) {
      const entry = historyModalState.items[idx];
      if (!entry) return;
      const openedOk = await openHistoryEntry(entry);
      if (!openedOk) return;
      closeHistoryModal();
      const modalApi = w.AppInit?.itemsDocOptionsModalApi;
      const activeModel = resolveActiveDocumentModelName();
      const openedModal = openItemsDocOptionsModal({
        mode: "edit",
        docType: entry.docType || historyModalState.docType,
        ...(activeModel ? { model: activeModel } : {})
      });
      if (openedModal && typeof modalApi?.setItemsModalTitle === "function") {
        modalApi.setItemsModalTitle({
          mode: "edit",
          docType: entry.docType || historyModalState.docType
        });
      }
      if (openedModal) {
        syncItemsModalClientFieldsFromState();
        if (typeof modalApi?.syncDocMetaBoxFromState === "function") {
          modalApi.syncDocMetaBoxFromState();
        }
        if (openedOk && typeof w.showToast === "function") {
          w.showToast("Document chargé avec succès pour modification.");
        }
      }
    }

    async function handleDocHistoryDuplicate(idx) {
      const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
      if (!entry) return;
      const openedOk = await openHistoryEntry(entry);
      if (!openedOk) return;

      let duplicatedDocType = "facture";
      let numberLength = 4;
      const meta = getInvoiceMeta();
      if (meta && typeof meta === "object") {
        duplicatedDocType = String(entry.docType || meta.docType || historyModalState.docType || "facture").toLowerCase();
        meta.docType = duplicatedDocType;
        if (meta.historyPath && typeof releaseDocumentEditLock === "function") {
          try {
            await releaseDocumentEditLock(meta.historyPath);
          } catch (err) {
            console.warn("doc-history duplicate lock release failed", err);
          }
        }
        delete meta.historyPath;
        delete meta.historyDocType;
        delete meta.historyStatus;
        numberLength = normalizeInvoiceLength(
          meta.numberLength ?? invNumberLengthSelect?.value ?? 4,
          meta.numberLength || 4
        );
        meta.numberLength = numberLength;
        const yearKey = typeof meta.numberYear === "undefined" ? getInvoiceYear() : meta.numberYear;
        clearPendingNumberLocal(duplicatedDocType, numberLength, yearKey);
      }

      let assignedFromPreview = false;
      if (w.electronAPI?.previewDocumentNumber && meta && typeof meta === "object") {
        try {
          const previewRes = await w.electronAPI.previewDocumentNumber({
            docType: duplicatedDocType,
            date: meta.date,
            numberLength,
            prefix: meta.numberPrefix,
            numberFormat: meta.numberFormat
          });
          if (previewRes?.ok && previewRes.number) {
            const nextNumber = String(previewRes.number || "").trim();
            if (nextNumber) {
              meta.number = nextNumber;
              meta.previewNumber = nextNumber;
              if (typeof previewRes.prefix === "string" && previewRes.prefix.trim()) {
                meta.numberPrefix = previewRes.prefix.trim();
              }
              if (invNumberInput && invNumberInput.value !== nextNumber) {
                invNumberInput.value = nextNumber;
              }
              if (invNumberLengthSelect && invNumberLengthSelect.value !== String(numberLength)) {
                invNumberLengthSelect.value = String(numberLength);
              }
              assignedFromPreview = true;
            }
          }
        } catch (err) {
          console.warn("doc-history duplicate preview number failed", err);
        }
      }

      if (assignedFromPreview) {
        syncInvoiceNumberControls({ force: true });
      } else {
        syncInvoiceNumberControls({
          force: true,
          useNextIfEmpty: true,
          overrideWithNext: true
        });
      }

      closeHistoryModal();
      const modalApi = w.AppInit?.itemsDocOptionsModalApi;
      const openedModal = openItemsDocOptionsModal({
        mode: "new",
        docType: entry.docType || historyModalState.docType
      });
      if (openedModal && typeof modalApi?.setItemsModalTitle === "function") {
        modalApi.setItemsModalTitle({
          mode: "new",
          docType: entry.docType || historyModalState.docType
        });
      }
      if (openedModal) {
        syncItemsModalClientFieldsFromState();
        if (typeof modalApi?.syncDocMetaBoxFromState === "function") {
          modalApi.syncDocMetaBoxFromState();
        }
        if (typeof w.showToast === "function") {
          w.showToast("Copie creee. Le numero du document a ete regenere.");
        }
      }
    }

    async function handleDocHistoryConvert(entry) {
      if (!entry) return;
      const entryDocType = String(entry.docType || historyModalState.docType || "").toLowerCase();
      if (entryDocType === "devis") {
        if (docConversion?.convertDevisEntry) {
          await docConversion.convertDevisEntry(entry, { onClose: closeHistoryModal });
        } else {
          console.warn("DocConversion helper missing");
        }
        return;
      }
      if (entryDocType === "bl") {
        if (docConversion?.convertBlEntry) {
          await docConversion.convertBlEntry(entry, { onClose: closeHistoryModal });
        } else {
          console.warn("DocConversion helper missing");
        }
        return;
      }
      if (entryDocType === "facture") {
        if (docConversion?.convertFactureEntry) {
          await docConversion.convertFactureEntry(entry, { onClose: closeHistoryModal });
        } else {
          console.warn("DocConversion helper missing");
        }
      }
    }

    async function handleDocHistoryDelete(idx) {
      const entry = historyModalState.items[idx];
      if (!entry) return;
      await deleteHistoryEntry(entry, historyModalState.docType);
    }

    async function handleDocHistoryExport(idx, exportBtn) {
      const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
      if (!entry || !entry.path) {
        const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND");
        await w.showDialog?.(notFound.text, { title: notFound.title });
        return;
      }
      if (
        typeof w.openInvoiceFromFilePicker !== "function" ||
        typeof w.exportInvoiceDataAsPDF !== "function"
      ) {
        if (typeof w.exportCurrentPDF === "function") {
          w.exportCurrentPDF();
        } else {
          const directUnavailable = getMessage("HISTORY_EXPORT_DIRECT_UNAVAILABLE");
          await w.showDialog?.(directUnavailable.text, { title: directUnavailable.title });
        }
        return;
      }
      const previousDisabled = exportBtn ? exportBtn.disabled : false;
      if (exportBtn) exportBtn.disabled = true;
      let shouldRefreshAfterExport = false;
      try {
        const entryType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
        const raw = await w.openInvoiceFromFilePicker({
          path: entry.path,
          docType: entryType
        });
        if (!raw) {
          const docLoadError = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED");
          await w.showDialog?.(docLoadError.text, { title: docLoadError.title });
          return;
        }
        if (entryType === "facture" && entry.status) {
          injectHistoryStatusIntoRawData(raw, entry.status);
        }
        const exportResult = await w.exportInvoiceDataAsPDF(raw, {
          historyPath: entry.path,
          historyDocType: entryType,
          strictDb: true
        });
        if (exportResult?.invoicePath) {
          entry.pdfPath = exportResult.invoicePath;
          shouldRefreshAfterExport = true;
        }
      } catch (err) {
        console.error("doc-history export failed", err);
        const exportError = getMessage("HISTORY_EXPORT_FAILED");
        await w.showDialog?.(String(err?.message || err || exportError.text), { title: exportError.title });
      } finally {
        if (exportBtn) exportBtn.disabled = previousDisabled;
      }
      if (shouldRefreshAfterExport) {
        renderHistoryModal();
      }
    }

    async function handleDocHistoryExportPurchase(idx, actionBtn) {
      const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
      if (!entry || !entry.path) {
        const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND", {
          fallbackText: "Document introuvable.",
          fallbackTitle: "Facture d'achat"
        });
        await w.showDialog?.(notFound.text, { title: notFound.title });
        return;
      }
      const entryType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
      if (entryType !== "facture") {
        const wrongType = getMessage("FEATURE_UNAVAILABLE", {
          fallbackText:
            "Cette action est disponible uniquement pour les documents enregistres de type Facture.",
          fallbackTitle: "Facture d'achat"
        });
        await w.showDialog?.(wrongType.text, { title: wrongType.title });
        return;
      }
      if (
        !purchaseInvoiceExport ||
        typeof purchaseInvoiceExport.exportFactureEntryAsPurchase !== "function"
      ) {
        const unavailable = getMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Export facture d'achat indisponible.",
          fallbackTitle: "Facture d'achat"
        });
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }

      const previousDisabled = actionBtn ? actionBtn.disabled : false;
      if (actionBtn) actionBtn.disabled = true;
      try {
        const result = await purchaseInvoiceExport.exportFactureEntryAsPurchase({ entry });
        if (result?.canceled) return;
        if (!result?.ok) {
          const exportError = getMessage("HISTORY_EXPORT_FAILED", {
            fallbackText: "Impossible d'exporter la facture d'achat.",
            fallbackTitle: "Facture d'achat"
          });
          await w.showDialog?.(
            String(result?.error || exportError.text),
            { title: exportError.title }
          );
          return;
        }
        if (typeof w.showToast === "function") {
          w.showToast(`Fichier exporte: ${result?.name || "facture_achat_import.json"}`);
        }
      } catch (err) {
        console.error("doc-history purchase export failed", err);
        const exportError = getMessage("HISTORY_EXPORT_FAILED", {
          fallbackText: "Impossible d'exporter la facture d'achat.",
          fallbackTitle: "Facture d'achat"
        });
        await w.showDialog?.(String(err?.message || err || exportError.text), {
          title: exportError.title
        });
      } finally {
        if (actionBtn) actionBtn.disabled = previousDisabled;
      }
    }

    const docHistorySigner =
      typeof AppInit.createDocHistorySignerDialog === "function"
        ? AppInit.createDocHistorySignerDialog({
            getEntryByIndex: (idx) =>
              Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null,
            getDocType: () => historyModalState.docType,
            getMessage,
            getDisplayFilename,
            openDigigoLogin
          })
        : null;

    const runDocHistorySignerAction = async (runner) => {
      if (typeof runner === "function") {
        return runner();
      }
      const unavailable = getMessage("FEATURE_UNAVAILABLE", {
        fallbackText: "Signature TEIF indisponible.",
        fallbackTitle: "TEIF"
      });
      await w.showDialog?.(unavailable.text, { title: unavailable.title });
      return null;
    };

    async function handleDocHistoryTeifUnsigned(idx, actionBtn) {
      return runDocHistorySignerAction(
        docHistorySigner && typeof docHistorySigner.handleTeifUnsigned === "function"
          ? () => docHistorySigner.handleTeifUnsigned(idx, actionBtn)
          : null
      );
    }

    async function handleDocHistoryIdTrustSign(idx, actionBtn) {
      return runDocHistorySignerAction(
        docHistorySigner && typeof docHistorySigner.handleIdTrustSign === "function"
          ? () => docHistorySigner.handleIdTrustSign(idx, actionBtn)
          : null
      );
    }

    async function handleDocHistorySignerFacture(idx) {
      return runDocHistorySignerAction(
        docHistorySigner && typeof docHistorySigner.handleSignerFacture === "function"
          ? () => docHistorySigner.handleSignerFacture(idx)
          : null
      );
    }

    async function handleDocHistoryWithholdingExport(idx, exportBtn) {
      const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
      if (!entry || !entry.path) {
        const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND");
        await w.showDialog?.(notFound.text, { title: notFound.title });
        return;
      }
      if (
        typeof w.openInvoiceFromFilePicker !== "function" ||
        typeof w.exportWithholdingDataAsPDF !== "function"
      ) {
        const directUnavailable = getMessage("HISTORY_EXPORT_DIRECT_UNAVAILABLE");
        await w.showDialog?.(directUnavailable.text, { title: directUnavailable.title });
        return;
      }
      const previousDisabled = exportBtn ? exportBtn.disabled : false;
      if (exportBtn) exportBtn.disabled = true;
      try {
        const entryType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
        const raw = await w.openInvoiceFromFilePicker({
          path: entry.path,
          docType: entryType
        });
        if (!raw) {
          const docLoadError = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED");
          await w.showDialog?.(docLoadError.text, { title: docLoadError.title });
          return;
        }
        if (entryType === "facture" && entry.status) {
          injectHistoryStatusIntoRawData(raw, entry.status);
        }

        const snapshot = ensureHistorySnapshotDefaults(cloneInvoiceData(raw));
        const whDefaults = { rate: 1.5, base: "ttc", threshold: 1000 };
        const existingWh =
          snapshot.meta?.withholding && typeof snapshot.meta.withholding === "object"
            ? snapshot.meta.withholding
            : {};
        let whConfig = {
          rate: Number.isFinite(Number(existingWh.rate)) ? Number(existingWh.rate) : whDefaults.rate,
          base: "ttc",
          threshold: Number.isFinite(Number(existingWh.threshold))
            ? Number(existingWh.threshold)
            : whDefaults.threshold
        };
        const totalsSnapshot = computeTotalsForSnapshot(snapshot, null);
        const stampValue = Number(totalsSnapshot?.extras?.stampTT);
        const baseValue = (() => {
          const totalTtcValue = Number.isFinite(Number(totalsSnapshot?.totalTTC))
            ? Number(totalsSnapshot.totalTTC)
            : Number.isFinite(Number(totalsSnapshot?.grand))
              ? Number(totalsSnapshot.grand)
              : null;
          if (Number.isFinite(totalTtcValue)) {
            return Number.isFinite(stampValue) ? totalTtcValue - stampValue : totalTtcValue;
          }
          if (Number.isFinite(Number(entry?.totalTTC))) return Number(entry.totalTTC);
          if (Number.isFinite(Number(entry?.totalHT))) return Number(entry.totalHT);
          return null;
        })();
        const currency =
          totalsSnapshot?.currency ||
          snapshot.meta?.currency ||
          entry?.currency ||
          "";
        const formatMoneyForDialog =
          typeof w.formatMoney === "function"
            ? w.formatMoney
            : (value, currencyCode) => {
                const num = Number(value);
                if (!Number.isFinite(num)) return "--";
                const formatted = num.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
                return currencyCode ? `${formatted} ${currencyCode}` : formatted;
              };
        const normalizeBinaryFlag = (value, fallback = 0) => {
          const parsed = parseNumberInput(value, fallback);
          if (!Number.isFinite(parsed)) return fallback;
          return parsed >= 1 ? 1 : 0;
        };
        const generationDateInitial = (() => {
          const rawGenerationDate = snapshot.meta?.date || entry?.date || "";
          if (rawGenerationDate) return String(rawGenerationDate).slice(0, 10);
          return new Date().toISOString().slice(0, 10);
        })();
        let generationDateValue = generationDateInitial;
        const paymentDateInitial = (() => {
          const rawPaymentDate =
            snapshot.meta?.paymentDate || generationDateInitial || entry?.date || "";
          if (rawPaymentDate) return String(rawPaymentDate).slice(0, 10);
          return new Date().toISOString().slice(0, 10);
        })();
        let paymentDateValue = paymentDateInitial;
        const operationTypeBaseDefault = "RS7_000001";
        const operationTypeInitial = String(
          snapshot.meta?.operationType ||
          snapshot.meta?.operation_type ||
          snapshot.meta?.withholding?.operationType ||
          operationTypeBaseDefault
        ).trim() || operationTypeBaseDefault;
        const operationCategoryInitial = String(
          snapshot.meta?.operationCategory ||
          snapshot.meta?.operation_category ||
          snapshot.meta?.withholding?.operationCategory ||
          ""
        ).trim();
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
        const operationCategoryFallback =
          normalizeOperationCategory(operationCategoryInitial) ||
          resolveOperationCategoryFromType(operationTypeInitial) ||
          resolveOperationCategoryFromType(operationTypeBaseDefault) ||
          operationCategoryOptions[0]?.value ||
          "";
        let operationCategoryValue = operationCategoryFallback;
        const resolveOperationTypesForCategory = (value) => {
          const normalized = normalizeOperationCategory(value) || operationCategoryFallback;
          const types = operationTypesByCategory[normalized];
          return Array.isArray(types) ? types : [];
        };
        let operationTypeDefault =
          resolveOperationTypesForCategory(operationCategoryValue)[0] || operationTypeBaseDefault;
        let operationTypeValue = operationTypeInitial;
        if (!resolveOperationTypesForCategory(operationCategoryValue).includes(operationTypeValue)) {
          operationTypeValue = operationTypeDefault;
        }
        const acteDepotInitial = normalizeBinaryFlag(
          snapshot.meta?.acteDepot ?? snapshot.meta?.codeActe ?? snapshot.meta?.acte ?? 0,
          0
        );
        let acteDepotValue = acteDepotInitial;
        const cnpcInitial = normalizeBinaryFlag(
          snapshot.meta?.cnpc ?? snapshot.meta?.CNPC ?? 0,
          0
        );
        const pChargeInitial = normalizeBinaryFlag(
          snapshot.meta?.pCharge ?? snapshot.meta?.p_charge ?? snapshot.meta?.P_Charge ?? 0,
          0
        );
        let cnpcValue = cnpcInitial;
        let pChargeValue = pChargeInitial;
        let xmlRequested = false;
        let xmlOnlyTriggered = false;
        const resolveWithholdingExportData = () => {
          const resolvedRate = parseNumberInput(whConfig.rate, whDefaults.rate);
          const resolvedThreshold = parseNumberInput(whConfig.threshold, whDefaults.threshold);
          const rateValue = Math.max(0, Number.isFinite(resolvedRate) ? resolvedRate : whDefaults.rate);
          const thresholdValue =
            Number.isFinite(resolvedThreshold) ? resolvedThreshold : whDefaults.threshold;
          const updatedData = ensureHistorySnapshotDefaults(cloneInvoiceData(raw));
          const metaTarget =
            updatedData.meta && typeof updatedData.meta === "object"
              ? updatedData.meta
              : (updatedData.meta = {});
          const prevWithholding =
            metaTarget.withholding && typeof metaTarget.withholding === "object"
              ? metaTarget.withholding
              : {};
          metaTarget.withholding = {
            ...prevWithholding,
            enabled: true,
            base: "ttc",
            rate: rateValue,
            threshold: thresholdValue
          };
          const resolvedGenerationDate = String(generationDateValue || "").trim();
          metaTarget.date = resolvedGenerationDate;
          const resolvedPaymentDate = String(paymentDateValue || "").trim();
          metaTarget.paymentDate = resolvedPaymentDate;
          const resolvedCnpc = normalizeBinaryFlag(cnpcValue, cnpcInitial);
          const resolvedPCharge = normalizeBinaryFlag(pChargeValue, pChargeInitial);
          metaTarget.cnpc = resolvedCnpc;
          metaTarget.pCharge = resolvedPCharge;
          const resolvedActeDepot = normalizeBinaryFlag(acteDepotValue, acteDepotInitial);
          metaTarget.acteDepot = resolvedActeDepot;
          const resolvedOperationType =
            String(operationTypeValue || "").trim() || operationTypeDefault;
          metaTarget.operationType = resolvedOperationType;
          const resolvedOperationCategory = String(operationCategoryValue || "").trim();
          if (resolvedOperationCategory) {
            metaTarget.operationCategory = resolvedOperationCategory;
          }
          const rawForExport =
            raw && typeof raw === "object" && raw.data && typeof raw.data === "object"
              ? { ...raw, data: updatedData }
              : updatedData;
          const totalsForXml = computeTotalsForSnapshot(updatedData, totalsSnapshot);
          return {
            rateValue,
            thresholdValue,
            updatedData,
            rawForExport,
            totalsForXml,
            paymentDate: resolvedPaymentDate,
            cnpc: resolvedCnpc,
            pCharge: resolvedPCharge,
            operationType: resolvedOperationType,
            acteDepot: resolvedActeDepot
          };
        };
        const exportWithholdingXml = async (exportData, options = {}) => {
          if (!xmlRequested || !exportData) return null;
          if (typeof w.exportWithholdingXml !== "function") {
            await w.showDialog?.("Export XML indisponible.", { title: "XML" });
            return { ok: false };
          }
          const isPurchaseWithholding = entryType === "fa";
          const declarant = isPurchaseWithholding
            ? exportData.updatedData?.company
            : exportData.updatedData?.client;
          const beneficiary = isPurchaseWithholding
            ? exportData.updatedData?.client
            : exportData.updatedData?.company;
          const res = await w.exportWithholdingXml({
            state: exportData.updatedData,
            totals: exportData.totalsForXml || totalsSnapshot || {},
            rate: exportData.rateValue,
            threshold: exportData.thresholdValue,
            reference: exportData.updatedData?.meta?.number,
            declarant,
            beneficiary,
            operationType: exportData.operationType,
            acteDepot: exportData.acteDepot,
            date: exportData.updatedData?.meta?.date,
            paymentDate: exportData.paymentDate,
            cnpc: exportData.cnpc,
            pCharge: exportData.pCharge,
            docType: entryType
          });
          if (!res?.ok) {
            const errText = res?.error || "Export XML impossible.";
            await w.showDialog?.(String(errText), { title: "XML" });
            return res;
          }
          if (options.notify) {
            await w.showDialog?.("Fichier XML genere.", { title: "XML" });
          }
          return res;
        };
        let confirmed = true;
        if (typeof w.showConfirm === "function") {
          confirmed = await w.showConfirm("", {
            title: "Retenue a la source",
            okText: "Cr\u00E9er le certificat",
            cancelText: "Annuler",
            extra: {
              text: "Just generate XML file",
              onClick: () => {
                if (!xmlRequested) return;
                xmlOnlyTriggered = true;
                const cancelBtn =
                  (typeof getEl === "function" && getEl("swbDialogCancel")) ||
                  document.getElementById("swbDialogCancel");
                if (cancelBtn) cancelBtn.click();
              }
            },
            renderMessage(container) {
              if (!container) return;
              container.innerHTML = "";
              container.style.maxHeight = "none";
              container.style.overflow = "visible";

              const idBase = `docHistoryWh-${Date.now()}`;
              const createField = (labelText, inputEl) => {
                const field = document.createElement("div");
                field.className = "doc-history-convert__field";
                const label = document.createElement("label");
                label.className = "doc-history-convert__label";
                label.textContent = labelText;
                if (inputEl?.id) label.setAttribute("for", inputEl.id);
                field.append(label, inputEl);
                return field;
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
                display.textContent = placeholderText || "";
                summary.appendChild(display);
                summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
                menu.appendChild(summary);

                const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
                const panel = document.createElement("div");
                panel.id = `${idPrefix}Panel`;
                panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
                panel.setAttribute("role", "listbox");
                panel.setAttribute("aria-labelledby", label.id);
                menu.appendChild(panelPlaceholder);
                menu.appendChild(panel);

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

                const ensureOption = (value, labelText) => {
                  const nextValue = String(value || "").trim();
                  if (!nextValue) return;
                  const nextLabel = labelText || nextValue;
                  if (!currentOptions.some((opt) => opt.value === nextValue)) {
                    currentOptions.push({ value: nextValue, label: nextLabel });
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "model-select-option";
                    btn.dataset.value = nextValue;
                    btn.setAttribute("role", "option");
                    btn.setAttribute("aria-selected", "false");
                    btn.textContent = nextLabel;
                    panel.appendChild(btn);

                    const option = document.createElement("option");
                    option.value = nextValue;
                    option.textContent = nextLabel;
                    hiddenSelect.appendChild(option);
                  }
                };

                renderOptions(currentOptions);

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
                  menu.open = !menu.open;
                  summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
                  if (!menu.open) summary.focus();
                });

                menu.addEventListener("keydown", (evt) => {
                  if (evt.key === "Escape") {
                    evt.preventDefault();
                    menu.open = false;
                    summary.setAttribute("aria-expanded", "false");
                    summary.focus();
                  }
                });

                document.addEventListener("click", (evt) => {
                  if (!menu.open) return;
                  if (menu.contains(evt.target)) return;
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                });

                field.append(menu, hiddenSelect);
                group.append(label, field);
                group._setSelection = setSelection;
                group._setOptions = (nextOptions, { selectedValue, notify = false } = {}) => {
                  const nextSelection = selectedValue ?? hiddenSelect.value;
                  renderOptions(nextOptions);
                  setSelection(nextSelection, { closeMenu: false, notify });
                };
                group._ensureOption = ensureOption;
                setSelection(selectedValue, { closeMenu: false, notify: false });
                return group;
              };
              const createBinaryMenuGroup = ({
                idPrefix,
                labelText,
                selectedValue,
                onChange
              }) => {
                const options = [
                  { value: "0", label: "0" },
                  { value: "1", label: "1" }
                ];
                const normalized = normalizeBinaryFlag(selectedValue, 0);
                return createMenuGroup({
                  idPrefix,
                  labelText,
                  placeholderText: "0",
                  options,
                  selectedValue: String(normalized),
                  onChange: (value) => {
                    const resolved = normalizeBinaryFlag(value, 0);
                    if (typeof onChange === "function") onChange(resolved);
                  }
                });
              };

              const rateInput = document.createElement("input");
              rateInput.id = `${idBase}-rate`;
              rateInput.type = "number";
              rateInput.min = "0";
              rateInput.step = "0.01";
              rateInput.value = String(whConfig.rate ?? whDefaults.rate);

              const baseInput = document.createElement("input");
              baseInput.id = `${idBase}-base`;
              baseInput.type = "text";
              baseInput.readOnly = true;
              baseInput.value = Number.isFinite(baseValue)
                ? formatMoneyForDialog(baseValue, currency)
                : "--";

              const generationDateInputId = `${idBase}-generationDate`;
              const generationDatePanelId = `${idBase}-generationDatePanel`;
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

              const paymentDateInputId = `${idBase}-paymentDate`;
              const paymentDatePanelId = `${idBase}-paymentDatePanel`;
              const paymentDateField = document.createElement("div");
              paymentDateField.className = "doc-history-convert__field doc-date-field";
              const paymentDateLabel = document.createElement("label");
              paymentDateLabel.className = "doc-history-convert__label";
              paymentDateLabel.textContent = "Date de paiement";
              paymentDateLabel.setAttribute("for", paymentDateInputId);
              const paymentDatePicker = document.createElement("div");
              paymentDatePicker.className = "swb-date-picker";
              paymentDatePicker.setAttribute("data-date-picker", "");
              paymentDatePicker.innerHTML = `
                <input
                  id="${paymentDateInputId}"
                  type="text"
                  inputmode="numeric"
                  placeholder="AAAA-MM-JJ"
                  autocomplete="off"
                  spellcheck="false"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  role="combobox"
                  aria-controls="${paymentDatePanelId}"
                >
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="${paymentDatePanelId}"
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
                  id="${paymentDatePanelId}"
                ></div>
              `;
              paymentDateField.append(paymentDateLabel, paymentDatePicker);

              const cnpcGroup = createBinaryMenuGroup({
                idPrefix: `${idBase}-cnpc`,
                labelText: "CNPC",
                selectedValue: cnpcInitial,
                onChange: (value) => {
                  cnpcValue = value;
                }
              });
              const pChargeGroup = createBinaryMenuGroup({
                idPrefix: `${idBase}-pCharge`,
                labelText: "P_Charge",
                selectedValue: pChargeInitial,
                onChange: (value) => {
                  pChargeValue = value;
                }
              });
              const acteDepotGroup = createBinaryMenuGroup({
                idPrefix: `${idBase}-acteDepot`,
                labelText: "Code acte",
                selectedValue: acteDepotInitial,
                onChange: (value) => {
                  acteDepotValue = value;
                }
              });
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
              let operationTypeGroup = null;
              const handleOperationTypeChange = (value) => {
                const nextValue = String(value || "").trim();
                operationTypeValue = nextValue || operationTypeDefault;
              };
              const handleOperationCategoryChange = (value) => {
                const nextCategory = normalizeOperationCategory(value) || operationCategoryFallback;
                operationCategoryValue = nextCategory;
                const nextOptions = buildOperationTypeOptions(nextCategory);
                operationTypeDefault = nextOptions[0]?.value || operationTypeBaseDefault;
                const nextType = nextOptions.some((opt) => opt.value === operationTypeValue)
                  ? operationTypeValue
                  : operationTypeDefault;
                operationTypeValue = nextType;
                if (operationTypeGroup && typeof operationTypeGroup._setOptions === "function") {
                  operationTypeGroup._setOptions(nextOptions, { selectedValue: nextType });
                } else if (operationTypeGroup && typeof operationTypeGroup._setSelection === "function") {
                  operationTypeGroup._setSelection(nextType, { closeMenu: false, notify: false });
                }
              };
              const operationCategoryGroup = createMenuGroup({
                idPrefix: `${idBase}-operationCategory`,
                labelText: "Cat\u00E9gorie",
                placeholderText: operationCategoryOptions[0]?.label || "",
                options: operationCategoryOptions,
                selectedValue: operationCategoryValue,
                onChange: handleOperationCategoryChange
              });
              const operationTypeOptions = buildOperationTypeOptions(operationCategoryValue);
              if (operationTypeOptions.length === 0) {
                operationTypeOptions.push({
                  value: operationTypeBaseDefault,
                  label: getOperationTypeLabel(operationTypeBaseDefault)
                });
              }
              if (!operationTypeOptions.some((opt) => opt.value === operationTypeValue)) {
                operationTypeValue = operationTypeOptions[0].value;
                operationTypeDefault = operationTypeValue;
              } else {
                operationTypeDefault = operationTypeOptions[0].value;
              }
              operationTypeGroup = createMenuGroup({
                idPrefix: `${idBase}-operationType`,
                labelText: "Type d'operation",
                placeholderText: operationTypeOptions[0]?.value || operationTypeBaseDefault,
                options: operationTypeOptions,
                selectedValue: operationTypeValue,
                onChange: handleOperationTypeChange
              });

              const thresholdInput = document.createElement("input");
              thresholdInput.id = `${idBase}-threshold`;
              thresholdInput.type = "number";
              thresholdInput.min = "0";
              thresholdInput.step = "0.01";
              thresholdInput.value = String(whConfig.threshold ?? whDefaults.threshold);

              const amountInput = document.createElement("input");
              amountInput.id = `${idBase}-amount`;
              amountInput.type = "text";
              amountInput.readOnly = true;

              const xmlInput = document.createElement("input");
              xmlInput.id = `${idBase}-xml`;
              xmlInput.type = "checkbox";
              xmlInput.className = "col-toggle";
              const xmlField = document.createElement("div");
              xmlField.className = "doc-history-convert__field";
              const xmlLabel = document.createElement("label");
              xmlLabel.className = "smtp-modal__toggle";
              const xmlLabelText = document.createElement("span");
              xmlLabelText.textContent = "Generate XML";
              xmlLabel.append(xmlInput, xmlLabelText);
              xmlField.append(xmlLabel);

              const form = document.createElement("div");
              form.className = "doc-history-convert-form";

              const totalsRow = document.createElement("div");
              totalsRow.className = "doc-history-convert__row doc-history-convert__row--totals";
                totalsRow.append(
                  createField("Total TTC ( sans Timbre)", baseInput),
                  createField("Taux %", rateInput),
                  createField("Seuil (Montant >)", thresholdInput),
                  createField("Montant (auto)", amountInput)
                );

              const flagsRow = document.createElement("div");
              flagsRow.className = "doc-history-convert__row doc-history-convert__row--flags";
              flagsRow.append(
                generationDateField,
                acteDepotGroup,
                cnpcGroup,
                pChargeGroup,
                paymentDateField
              );

              const operationRow = document.createElement("div");
              operationRow.className = "doc-history-convert__row doc-history-convert__row--operation";
              operationRow.append(operationCategoryGroup, operationTypeGroup);

              form.append(
                totalsRow,
                xmlField,
                flagsRow,
                operationRow
              );
              container.append(form);

              const okBtn =
                (typeof getEl === "function" && getEl("swbDialogOk")) ||
                document.getElementById("swbDialogOk");
              const extraBtn =
                (typeof getEl === "function" && getEl("swbDialogExtra")) ||
                document.getElementById("swbDialogExtra");

              const updatePreview = () => {
                const rate = parseNumberInput(rateInput.value, whConfig.rate);
                const threshold = parseNumberInput(thresholdInput.value, whConfig.threshold);
                whConfig = {
                  rate,
                  threshold
                };
                const baseResolved = Number.isFinite(baseValue) ? baseValue : 0;
                const meetsThreshold =
                  !Number.isFinite(threshold) || threshold <= 0 || baseResolved >= threshold;
                const amount =
                  meetsThreshold && Number.isFinite(rate) && rate > 0
                    ? Math.max(0, baseResolved) * (rate / 100)
                    : 0;
                amountInput.value = Number.isFinite(baseValue)
                  ? formatMoneyForDialog(amount, currency)
                  : "--";
                if (okBtn) {
                  const shouldDisable =
                    Number.isFinite(baseValue) &&
                    Number.isFinite(threshold) &&
                    threshold > baseValue;
                  okBtn.disabled = shouldDisable;
                  okBtn.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
                }
              };
              const updateXmlButton = () => {
                const enabled = !!xmlInput.checked;
                xmlRequested = enabled;
                if (!extraBtn) return;
                extraBtn.disabled = !enabled;
                extraBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
              };

              const generationDateInput =
                generationDatePicker.querySelector(`#${generationDateInputId}`);
              if (generationDateInput) {
                generationDateInput.value = generationDateInitial;
                if (createDatePicker) {
                  const picker = createDatePicker(generationDateInput, {
                    allowManualInput: true,
                    onChange(value) {
                      generationDateValue = value || "";
                    }
                  });
                  if (picker) picker.setValue(generationDateInitial, { silent: true });
                } else {
                  generationDateInput.readOnly = false;
                }
                generationDateInput.addEventListener("input", () => {
                  generationDateValue = generationDateInput.value || "";
                });
              }

              const paymentDateInput = paymentDatePicker.querySelector(`#${paymentDateInputId}`);
              if (paymentDateInput) {
                paymentDateInput.value = paymentDateInitial;
                if (createDatePicker) {
                  const picker = createDatePicker(paymentDateInput, {
                    allowManualInput: true,
                    onChange(value) {
                      paymentDateValue = value || "";
                    }
                  });
                  if (picker) picker.setValue(paymentDateInitial, { silent: true });
                } else {
                  paymentDateInput.readOnly = false;
                }
                paymentDateInput.addEventListener("input", () => {
                  paymentDateValue = paymentDateInput.value || "";
                });
              }

              rateInput.addEventListener("input", updatePreview);
              thresholdInput.addEventListener("input", updatePreview);
              xmlInput.addEventListener("change", updateXmlButton);
              updatePreview();
              updateXmlButton();
              requestAnimationFrame(() => {
                try {
                  rateInput.focus();
                } catch {}
              });
            }
          });
        } else if (typeof window.confirm === "function") {
          confirmed = window.confirm("Creer la retenue a la source ?");
        }
        if (!confirmed) {
          if (xmlOnlyTriggered) {
            const exportData = resolveWithholdingExportData();
            await exportWithholdingXml(exportData, { notify: true });
          }
          return;
        }

        const exportData = resolveWithholdingExportData();
        if (xmlRequested) {
          await exportWithholdingXml(exportData);
        }
        await w.exportWithholdingDataAsPDF(exportData.rawForExport, {
          historyPath: entry.path,
          historyDocType: entryType,
          force: true
        });
      } catch (err) {
        console.error("doc-history withholding export failed", err);
        const exportError = getMessage("WITHHOLDING_EXPORT_FAILED");
        await w.showDialog?.(String(err?.message || err || exportError.text), { title: exportError.title });
      } finally {
        if (exportBtn) exportBtn.disabled = previousDisabled;
      }
    }

    historyModalList?.addEventListener("click", async (evt) => {
      const copyBtn = evt.target.closest("[data-doc-history-copy]");
      if (copyBtn) {
        if (copyBtn.getAttribute("aria-disabled") === "true" || copyBtn.classList.contains("is-disabled")) {
          return;
        }
        evt.preventDefault();
        evt.stopPropagation();
        const copyValue = copyBtn.dataset.docHistoryCopyValue || "";
        if (copyValue) await copyTextToClipboard(copyValue);
        return;
      }
      const convertBtn = evt.target.closest("[data-doc-history-convert]");
      if (convertBtn) {
        evt.preventDefault();
        const idx = Number(convertBtn.dataset.docHistoryConvert);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        await handleDocHistoryConvert(entry);
        return;
      }

      const actionsTrigger = evt.target.closest(".doc-history-actions-trigger");
      if (actionsTrigger) {
        evt.preventDefault();
        const actionsMenu = actionsTrigger.closest("[data-doc-history-actions-menu]");
        const idx = Number(actionsMenu?.dataset.docHistoryActionsMenu);
        if (!actionsMenu || Number.isNaN(idx)) return;
        if (docHistoryActionsActiveIndex === idx) {
          closeDocHistoryActionsMenu();
        } else {
          closeDocHistoryActionsMenu();
          closeDocHistoryExportMenu();
          closeDocHistoryStatusMenu();
          openDocHistoryActionsMenu(idx, actionsTrigger);
        }
        return;
      }

      const exportTrigger = evt.target.closest(".doc-history-export-trigger");
      if (exportTrigger) {
        evt.preventDefault();
        const exportMenu = exportTrigger.closest("[data-doc-history-export-menu]");
        const idx = Number(exportMenu?.dataset.docHistoryExportMenu);
        if (!exportMenu || Number.isNaN(idx)) return;
        if (docHistoryExportActiveIndex === idx) {
          closeDocHistoryExportMenu();
        } else {
          closeDocHistoryExportMenu();
          closeDocHistoryActionsMenu();
          closeDocHistoryStatusMenu();
          openDocHistoryExportMenu(idx, exportTrigger);
        }
        return;
      }

      const exportBtn = evt.target.closest("[data-doc-history-export]");
      if (exportBtn) {
        evt.preventDefault();
        const idx = Number(exportBtn.dataset.docHistoryExport);
        if (Number.isNaN(idx)) return;
        closeDocHistoryExportMenu();
        const parentMenu = exportBtn.closest("[data-doc-history-export-menu]");
        if (parentMenu) parentMenu.removeAttribute("open");
        await handleDocHistoryExport(idx, exportBtn);
        return;
      }
      const exportPurchaseBtn = evt.target.closest("[data-doc-history-export-purchase]");
      if (exportPurchaseBtn) {
        evt.preventDefault();
        const idx = Number(exportPurchaseBtn.dataset.docHistoryExportPurchase);
        if (Number.isNaN(idx)) return;
        closeDocHistoryExportMenu();
        const parentMenu = exportPurchaseBtn.closest("[data-doc-history-export-menu]");
        if (parentMenu) parentMenu.removeAttribute("open");
        await handleDocHistoryExportPurchase(idx, exportPurchaseBtn);
        return;
      }
      const signerFactureBtn = evt.target.closest("[data-doc-history-signer]");
      if (signerFactureBtn) {
        evt.preventDefault();
        const idx = Number(signerFactureBtn.dataset.docHistorySigner);
        if (Number.isNaN(idx)) return;
        await handleDocHistorySignerFacture(idx);
        return;
      }
      const teifBtn = evt.target.closest("[data-doc-history-teif]");
      if (teifBtn) {
        evt.preventDefault();
        const idx = Number(teifBtn.dataset.docHistoryTeif);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryTeifUnsigned(idx, teifBtn);
        return;
      }
      const idTrustBtn = evt.target.closest("[data-doc-history-idtrust]");
      if (idTrustBtn) {
        evt.preventDefault();
        const idx = Number(idTrustBtn.dataset.docHistoryIdtrust);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryIdTrustSign(idx, idTrustBtn);
        return;
      }
      const digigoBtn = evt.target.closest("[data-doc-history-digigo]");
      if (digigoBtn) {
        evt.preventDefault();
        openDigigoLogin();
        return;
      }
      const withholdingBtn = evt.target.closest("[data-doc-history-withholding]");
      if (withholdingBtn) {
        evt.preventDefault();
        const idx = Number(withholdingBtn.dataset.docHistoryWithholding);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryWithholdingExport(idx, withholdingBtn);
        return;
      }

      const openPdfFolderBtn = evt.target.closest("[data-doc-history-open-pdf]");
      if (openPdfFolderBtn) {
        evt.preventDefault();
        if (openPdfFolderBtn.disabled) return;
        const idx = Number(openPdfFolderBtn.dataset.docHistoryOpenPdf);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        const pdfPath = entry?.pdfPath;
        if (!pdfPath) {
          const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND", {
            fallbackText: "Aucun PDF exporté pour ce document.",
            fallbackTitle: "Export PDF"
          });
          await w.showDialog?.(notFound.text, { title: notFound.title });
          return;
        }
        try {
          const opened = await w.electronAPI?.showInFolder?.(pdfPath);
          if (!opened) {
            const openError = getMessage("PDF_OPEN_UNAVAILABLE", {
              fallbackText: "Impossible d'ouvrir le dossier du PDF.",
              fallbackTitle: "Export PDF"
            });
            await w.showDialog?.(openError.text, { title: openError.title });
          }
        } catch (err) {
          console.warn("doc-history open pdf folder failed", err);
        }
        return;
      }

      const emailBtn = evt.target.closest("[data-doc-history-email]");
      if (emailBtn) {
        evt.preventDefault();
        const idx = Number(emailBtn.dataset.docHistoryEmail);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        if (!entry || !entry.path) {
          const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND", {
            fallbackText: "Document introuvable.",
            fallbackTitle: "E-mail"
          });
          await w.showDialog?.(notFound.text, { title: notFound.title });
          return;
        }
        openHistoryEmailModal(entry);
        return;
      }

      const commentBtn = evt.target.closest("[data-doc-history-comment]");
      if (commentBtn) {
        evt.preventDefault();
        const idx = Number(commentBtn.dataset.docHistoryComment);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        if (!entry || !entry.path) {
          const notFound = getMessage("HISTORY_EXPORT_NOT_FOUND", {
            fallbackText: "Document introuvable.",
            fallbackTitle: "Commentaire"
          });
          await w.showDialog?.(notFound.text, { title: notFound.title });
          return;
        }
        if (typeof w.openInvoiceFromFilePicker !== "function") {
          const unavailable = getMessage("HISTORY_EXPORT_DIRECT_UNAVAILABLE", {
            fallbackText: "Chargement du document indisponible.",
            fallbackTitle: "Commentaire"
          });
          await w.showDialog?.(unavailable.text, { title: unavailable.title });
          return;
        }
        const previousDisabled = commentBtn.disabled;
        commentBtn.disabled = true;
        try {
          const entryType = String(entry.docType || historyModalState.docType || "facture").toLowerCase();
          const raw = await w.openInvoiceFromFilePicker({
            path: entry.path,
            docType: entryType
          });
          if (!raw) {
            const docLoadError = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED", {
              fallbackText: "Impossible de charger le document.",
              fallbackTitle: "Commentaire"
            });
            await w.showDialog?.(docLoadError.text, { title: docLoadError.title });
            return;
          }
          const data =
            raw && typeof raw === "object" && raw.data && typeof raw.data === "object" ? raw.data : raw;
          const rawComment =
            typeof data?.meta?.noteInterne === "string" ? data.meta.noteInterne : "";
          const normalizedComment = String(rawComment || "").replace(/\r\n/g, "\n").trim();
          const hasComment = normalizedComment.length > 0;
          const message = hasComment ? normalizedComment : "Aucun commentaire sur ce document.";
          await w.showDialog?.(message, {
            title: "Commentaire sur document",
            renderMessage: (node, safeMessage) => {
              const content = document.createElement("div");
              content.style.whiteSpace = "pre-wrap";
              content.textContent = safeMessage;
              node.textContent = "";
              node.appendChild(content);
            }
          });
        } catch (err) {
          console.error("doc-history comment display failed", err);
          const loadError = getMessage("HISTORY_EXPORT_FAILED", {
            fallbackText: "Impossible d'afficher le commentaire.",
            fallbackTitle: "Commentaire"
          });
          await w.showDialog?.(String(err?.message || err || loadError.text), { title: loadError.title });
        } finally {
          commentBtn.disabled = previousDisabled;
        }
        return;
      }

      const viewBtn = evt.target.closest("[data-doc-history-view]");
      if (viewBtn) {
        evt.preventDefault();
        const idx = Number(viewBtn.dataset.docHistoryView);
        const entry = Array.isArray(historyModalState.items) ? historyModalState.items[idx] : null;
        await previewHistoryEntry(entry);
        return;
      }
      const openBtn = evt.target.closest("[data-doc-history-open]");
      if (openBtn) {
        const idx = Number(openBtn.dataset.docHistoryOpen);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryOpen(idx);
        return;
      }
      const duplicateBtn = evt.target.closest("[data-doc-history-duplicate]");
      if (duplicateBtn) {
        evt.preventDefault();
        const idx = Number(duplicateBtn.dataset.docHistoryDuplicate);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryDuplicate(idx);
        return;
      }
      const deleteBtn = evt.target.closest("[data-doc-history-delete]");
      if (deleteBtn) {
        const idx = Number(deleteBtn.dataset.docHistoryDelete);
        if (Number.isNaN(idx)) return;
        await handleDocHistoryDelete(idx);
        return;
      }
      const statusToggleBtn = evt.target.closest("[data-doc-history-status-toggle]");
      if (statusToggleBtn) {
        evt.preventDefault();
        const idx = Number(statusToggleBtn.dataset.docHistoryStatusToggle);
        if (Number.isNaN(idx)) return;
        closeDocHistoryActionsMenu();
        closeDocHistoryExportMenu();
        if (docHistoryStatusActiveIndex === idx) {
          closeDocHistoryStatusMenu();
        } else {
          closeDocHistoryStatusMenu();
          openDocHistoryStatusMenu(idx, statusToggleBtn);
        }
        return;
      }
    });

    historyModalList?.addEventListener("keydown", async (evt) => {
      if (evt.key !== "Enter" && evt.key !== " ") return;
      const copyBtn = evt.target.closest("[data-doc-history-copy]");
      if (!copyBtn) return;
      if (copyBtn.getAttribute("aria-disabled") === "true" || copyBtn.classList.contains("is-disabled")) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      const copyValue = copyBtn.dataset.docHistoryCopyValue || "";
      if (copyValue) await copyTextToClipboard(copyValue);
    });

    document.addEventListener("click", (evt) => {
      if (
        historyModalRecapPopover &&
        !historyModalRecapPopover.hidden &&
        !evt.target.closest("#docHistoryRecapInfoBtn") &&
        !historyModalRecapPopover.contains(evt.target)
      ) {
        closeHistoryRecapPopover();
      }
      if (docHistoryActionsPopover && !docHistoryActionsPopover.hidden) {
        if (
          evt.target.closest(".doc-history-actions-trigger") ||
          docHistoryActionsPopover.contains(evt.target)
        ) {
          return;
        }
        closeDocHistoryActionsMenu();
      }
      if (docHistoryExportPopover && !docHistoryExportPopover.hidden) {
        if (
          evt.target.closest(".doc-history-export-trigger") ||
          docHistoryExportPopover.contains(evt.target)
        ) {
          return;
        }
        closeDocHistoryExportMenu();
      }
      if (!docHistoryStatusPopover || docHistoryStatusPopover.hidden) return;
      if (
        evt.target.closest("[data-doc-history-status-toggle]") ||
        docHistoryStatusPopover.contains(evt.target)
      ) {
        return;
      }
      closeDocHistoryStatusMenu();
    });
    window.addEventListener("resize", () => {
      closeDocHistoryActionsMenu();
      closeDocHistoryExportMenu();
      closeDocHistoryStatusMenu();
    });
    window.addEventListener(
      "scroll",
      () => {
        closeDocHistoryActionsMenu();
        closeDocHistoryExportMenu();
        if (!docHistoryStatusPopover || docHistoryStatusPopover.hidden) return;
        closeDocHistoryStatusMenu();
      },
      true
    );

    docTypeSelect?.addEventListener("change", () => {
      syncHistoryTypeWithDocSelection({ forceRender: true });
    });

    // Keep history type aligned when only the displayed label changes (e.g., via external UI helpers).
    if (docTypeDisplay && typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => syncHistoryTypeWithDocSelection({ forceRender: true }));
      observer.observe(docTypeDisplay, { characterData: true, subtree: true, childList: true });
    }

    window.addEventListener("document-history-updated", (event) => {
      const updatedType = event?.detail?.docType;
      const updatedEntry = event?.detail?.entry;
      const normalizedUpdatedType =
        updatedType !== undefined && updatedType !== null
          ? normalizeHistoryTypeValue(updatedType, historyModalState.docType || "facture")
          : "";
      const shouldDeferRenderDuringRefresh =
        normalizedUpdatedType && historyRefreshInFlightTypes.has(normalizedUpdatedType);
      if (updatedEntry?.path) {
        const meta = getInvoiceMeta();
        if (meta && meta.historyPath === updatedEntry.path) {
          const normalizedType = String(
            updatedEntry.docType || meta.historyDocType || meta.docType || "facture"
          ).toLowerCase();
          if (normalizedType === "facture") {
            meta.status =
              normalizeDocHistoryStatusValue(updatedEntry.status) ||
              DOC_HISTORY_STATUS_OPTIONS[0].value;
          } else if ("status" in meta) {
            delete meta.status;
          }
          if (normalizedType !== "facture" && "historyStatus" in meta) {
            delete meta.historyStatus;
          }
        }
      }
        const removedPath = event?.detail?.removed;
        if (removedPath) {
          const meta = getInvoiceMeta();
          if (meta && meta.historyPath === removedPath) {
            releaseDocumentEditLock(removedPath);
            delete meta.historyPath;
            delete meta.historyDocType;
          }
        }
      if (!shouldDeferRenderDuringRefresh) {
        renderHistoryList(normalizedUpdatedType || "facture");
      }
      if (isHistoryModalOpen() && !shouldDeferRenderDuringRefresh) {
        if (!normalizedUpdatedType || normalizedUpdatedType === historyModalState.docType) {
          updateHistoryModalData(historyModalState.docType);
          renderHistoryModal();
        }
      }
    });

    const initialType = docHistoryTypeFromDocControls(historyModalState.docType);
    historyModalState.docType = initialType;
    updateHistoryModalTitle(initialType);
    updateHistoryModalPartyLabels(initialType);
    renderHistoryList(initialType);
    hydrateHistoryFromDisk(initialType);
    pruneMissingHistoryEntries(initialType).then((removedCount) => {
      if (removedCount > 0) {
        renderHistoryList(initialType);
        if (isHistoryModalOpen()) {
          updateHistoryModalData(initialType);
          renderHistoryModal();
        }
      }
    });

    const activeMeta = getInvoiceMeta?.() || {};
    const shouldForceNextNumber = !activeMeta.historyPath;
    syncInvoiceNumberControls({
      force: true,
      useNextIfEmpty: true,
      advanceSequence: !shouldForceNextNumber,
      overrideWithNext: shouldForceNextNumber
    });

    return {
      renderHistoryList,
      openHistoryEntry,
      getSelectedType: () => historyModalState.docType || "facture",
      setSelectedType: (value) => {
        if (!value) return;
        const normalized = normalizeDocTypeValue(value);
        historyModalState.docType = normalized;
        updateHistoryModalTitle(normalized);
        updateHistoryModalPartyLabels(normalized);
        renderHistoryList(normalized);
        if (isHistoryModalOpen()) {
          updateHistoryModalData(normalized);
          renderHistoryModal();
        }
      },
      openModal: (options) => openHistoryModal(options || {})
    };
  };
})(window);


