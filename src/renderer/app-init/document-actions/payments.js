(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const MIN_CLIENT_QUERY_LENGTH = 2;
  const UNPAID_STATUSES = new Set(["partiellement-payee", "impayee", "impaye", "pas-encore-payer"]);

  const getElSafe = (id) =>
    typeof getEl === "function"
      ? getEl(id)
      : typeof document !== "undefined"
        ? document.getElementById(id)
        : null;

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const normalizeFactureStatusValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "annule") return "brouillon";
    return normalized;
  };

  const stripDiacritics = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const normalizeClientLookup = (value) => stripDiacritics(normalizeText(value));

  const getCurrentYearValue = () => String(new Date().getFullYear());

  const normalizeYearValue = (value) => {
    const num = Number.parseInt(String(value || "").trim(), 10);
    if (!Number.isFinite(num) || num < 1900 || num > 9999) return "";
    return String(num);
  };

  const parseDayMonthParts = (value) => {
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
      const match = text.match(/^(\d{1,2})[\\/.\-](\d{1,2})$/);
      if (!match) return null;
      dayRaw = match[1];
      monthRaw = match[2];
    }
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(day) || !Number.isFinite(month)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return { day: String(day).padStart(2, "0"), month: String(month).padStart(2, "0") };
  };

  const normalizeDayMonthValue = (value) => {
    const parsed = parseDayMonthParts(value);
    if (!parsed) return "";
    return `${parsed.day}-${parsed.month}`;
  };

  const isValidDateParts = (year, month, day) => {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
    const candidate = new Date(year, month - 1, day);
    return (
      !Number.isNaN(candidate.getTime()) &&
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    );
  };

  const composeFilterIsoDate = (dayMonthValue, yearValue) => {
    const parsed = parseDayMonthParts(dayMonthValue);
    const year = normalizeYearValue(yearValue);
    if (!parsed || !year) return "";
    const yearNum = Number(year);
    const monthNum = Number(parsed.month);
    const dayNum = Number(parsed.day);
    if (!isValidDateParts(yearNum, monthNum, dayNum)) return "";
    return `${year}-${parsed.month}-${parsed.day}`;
  };

  const normalizeIsoDateValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return "";
    const date = new Date(parsed);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const formatMoneySafe =
    typeof w.formatMoney === "function"
      ? (value, currency) => w.formatMoney(value, currency)
      : (value, currency) => {
          const num = Number(value);
          if (!Number.isFinite(num)) return "-";
          const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          return currency ? `${formatted} ${currency}` : formatted;
        };

  const formatAmountFixed3 = (value, currency) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    const formatted = num.toFixed(3);
    return currency ? `${formatted} ${currency}` : formatted;
  };

  const PAYMENT_HISTORY_LIMIT = 200;

  let paymentHistoryCache = [];
  let paymentHistoryLoaded = false;
  let paymentHistoryLoadPromise = null;

  const setPaymentHistoryCache = (items) => {
    paymentHistoryCache = Array.isArray(items) ? items.slice() : [];
    paymentHistoryLoaded = true;
  };

  const hydratePaymentHistory = async () => {
    if (paymentHistoryLoadPromise) return paymentHistoryLoadPromise;
    paymentHistoryLoadPromise = (async () => {
      if (w.electronAPI?.readPaymentHistory) {
        const res = await w.electronAPI.readPaymentHistory();
        if (res?.ok && Array.isArray(res.items)) {
          setPaymentHistoryCache(res.items);
          return;
        }
      }
      setPaymentHistoryCache([]);
    })();
    return paymentHistoryLoadPromise;
  };

  const readPaymentHistory = () => paymentHistoryCache.slice();

  const writePaymentHistory = (items) => {
    setPaymentHistoryCache(items);
    if (w.electronAPI?.writePaymentHistory) {
      return w.electronAPI.writePaymentHistory(items).then((res) => {
        if (res?.ok && Array.isArray(res.items)) {
          setPaymentHistoryCache(res.items);
          try {
            window.dispatchEvent(new CustomEvent("payment-history-updated"));
          } catch {}
        }
        return res;
      });
    }
    return Promise.resolve({ ok: false });
  };

  const hasPaymentHistoryForInvoice = (invoicePath) => {
    if (!invoicePath) return false;
    const target = String(invoicePath || "").trim();
    if (!target) return false;
    return readPaymentHistory().some((entry) => String(entry?.invoicePath || "").trim() === target);
  };

  const paymentHistoryItemKey = (entry, fallback = "") => {
    if (!entry || typeof entry !== "object") return fallback;
    const id = String(entry.id || "").trim();
    if (id) return id;
    const parts = [
      String(entry.invoicePath || "").trim(),
      String(entry.savedAt || "").trim(),
      String(entry.paymentDate || "").trim(),
      String(entry.invoiceNumber || "").trim(),
      String(entry.clientName || "").trim()
    ].filter(Boolean);
    return parts.join("|") || fallback;
  };

  const renumberPaymentHistory = (items) => {
    if (!Array.isArray(items)) return [];
    const cloned = items.map((item) => (item && typeof item === "object" ? { ...item } : item));
    const withMeta = cloned.map((item, index) => {
      const primary = item?.savedAt || item?.paymentDate || "";
      const parsed = Date.parse(primary);
      const ts = Number.isFinite(parsed) ? parsed : 0;
      return {
        item,
        ts,
        key: paymentHistoryItemKey(item, String(index)),
        index
      };
    });
    withMeta.sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts;
      const keyCompare = String(a.key || "").localeCompare(String(b.key || ""));
      if (keyCompare !== 0) return keyCompare;
      return a.index - b.index;
    });
    withMeta.forEach((entry, idx) => {
      if (entry?.item && typeof entry.item === "object") {
        entry.item.paymentNumber = idx + 1;
      }
    });
    return cloned;
  };

  const removePaymentHistoryForInvoice = (invoicePath) => {
    if (!invoicePath) return 0;
    const target = String(invoicePath || "").trim();
    if (!target) return 0;
    const history = readPaymentHistory();
    const next = history.filter((entry) => String(entry?.invoicePath || "").trim() !== target);
    if (next.length === history.length) return 0;
    writePaymentHistory(next);
    try {
      window.dispatchEvent(new CustomEvent("payment-history-updated"));
    } catch {}
    return history.length - next.length;
  };

  const getPaymentHistoryEntryByKey = (targetKey) => {
    const key = String(targetKey || "").trim();
    if (!key) return null;
    const history = readPaymentHistory();
    return (
      history.find((entry) => String(entry?.id || "").trim() === key) ||
      history.find((entry) => paymentHistoryItemKey(entry, "") === key) ||
      null
    );
  };

  const removePaymentHistoryEntryByKey = (targetKey) => {
    const key = String(targetKey || "").trim();
    if (!key) return 0;
    const history = readPaymentHistory();
    const next = history.filter((entry) => {
      const entryKey = paymentHistoryItemKey(entry, "");
      const entryId = String(entry?.id || "").trim();
      return entryId !== key && entryKey !== key;
    });
    if (next.length === history.length) return 0;
    writePaymentHistory(next);
    try {
      window.dispatchEvent(new CustomEvent("payment-history-updated"));
    } catch {}
    return history.length - next.length;
  };

  let paymentHistorySyncInFlight = false;

  const generatePaymentHistoryId = (seed = "") => {
    const base = String(seed || "").trim();
    const time = new Date().toISOString();
    const rand = Math.random().toString(36).slice(2, 8);
    return base ? `${base}-${time}-${rand}` : `${time}-${rand}`;
  };

  const extractInvoiceNumberFromInvoiceKey = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const [numberPart] = raw.split("__");
    return String(numberPart || "").trim();
  };

  const sanitizeInvoiceNumber = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^sqlite:\/\//i.test(raw)) return "";
    return raw;
  };

  const addPaymentHistoryEntry = (entry) => {
      if (!entry || typeof entry !== "object") return null;
      const paymentDateRaw = String(entry.paymentDate || "").trim();
      const savedAtFallback = paymentDateRaw
        ? paymentDateRaw.includes("T")
          ? paymentDateRaw
          : `${paymentDateRaw}T00:00:00Z`
        : "";
      const savedAt = String(entry.savedAt || "").trim() || savedAtFallback || new Date().toISOString();
      const invoiceKey = String(entry.invoiceKey || "").trim();
      const invoiceNumber = sanitizeInvoiceNumber(
        String(entry.invoiceNumber || "").trim() || extractInvoiceNumberFromInvoiceKey(invoiceKey)
      );
      const history = readPaymentHistory();
      const maxNumber = history.reduce((max, item) => {
        const value = Number(item?.paymentNumber);
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, 0);
      const normalized = {
        id: entry.id || `${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
        paymentNumber: maxNumber + 1,
        entryType: String(entry.entryType || "").trim(),
        invoiceKey,
        invoiceNumber,
        invoicePath: String(entry.invoicePath || "").trim(),
        clientName: String(entry.clientName || "").trim(),
        clientAccount: String(entry.clientAccount || entry.client?.account || entry.client?.accountOf || "").trim(),
        clientPath: String(entry.clientPath || entry.client?.__path || "").trim(),
        paymentDate: paymentDateRaw || savedAt.slice(0, 10),
        paymentRef: String(entry.paymentRef || "").trim(),
        amount: Number(entry.amount),
        balanceDue: Number(entry.balanceDue),
        currency: String(entry.currency || "").trim(),
        mode: String(entry.mode || "").trim(),
        savedAt
      };
    history.unshift(normalized);
    const writePromise = writePaymentHistory(history.slice(0, PAYMENT_HISTORY_LIMIT));
    try {
      window.dispatchEvent(new CustomEvent("payment-history-updated"));
    } catch {}
    return { entry: normalized, writePromise };
  };

  const resolveHistoryClientName = (item) => {
    if (!item) return "";
    const direct = item.clientName || "";
    if (direct && String(direct).trim()) return String(direct).trim();
    const nested = item.client?.name || "";
    return String(nested || "").trim();
  };

  const resolveHistoryNumber = (item) => {
    if (!item) return "";
    const direct = item.number || item.name || "";
    return String(direct || "").trim();
  };
  const resolveHistoryClientAccount = (item) => {
    if (!item) return "";
    const direct = item.clientAccount || item.client?.account || item.client?.accountOf || "";
    return String(direct || "").trim();
  };

  const PAYMENT_HISTORY_EXCLUDED_STATUSES = new Set([
    "pas-encore-payer",
    "impayee",
    "impaye",
    "brouillon",
    "avoir"
  ]);
  const isPaymentHistoryExcludedStatus = (statusValue) => {
    const normalized = normalizeFactureStatusValue(statusValue);
    return PAYMENT_HISTORY_EXCLUDED_STATUSES.has(normalized);
  };

  const isValidClientLabel = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^facture[-_]/i.test(raw)) return false;
    return true;
  };

  const syncPaymentHistoryFromInvoices = () => {
    if (paymentHistorySyncInFlight) return;
    if (typeof w.getDocumentHistoryFull !== "function") return;
    paymentHistorySyncInFlight = true;
    try {
      const history = readPaymentHistory();
      const knownPaths = new Set(
        history.map((item) => String(item?.invoicePath || "").trim()).filter((path) => path)
      );
      const entries = w.getDocumentHistoryFull("facture") || [];
      const pending = [];
      entries.forEach((entry) => {
        const statusValue =
          entry?.status ?? entry?.historyStatus ?? entry?.meta?.historyStatus ?? "";
        if (isPaymentHistoryExcludedStatus(statusValue)) return;
        const paidRaw = toNumber(entry?.paid ?? entry?.totals?.paid ?? null);
        if (!Number.isFinite(paidRaw) || paidRaw <= 0) return;
        const entryPath = String(entry?.path || "").trim();
        if (!entryPath || knownPaths.has(entryPath)) return;
        const total = toNumber(entry?.totalTTC ?? entry?.totalHT ?? entry?.total ?? entry?.totalHt ?? null);
        const balanceDueRaw = toNumber(entry?.balanceDue ?? entry?.totals?.balanceDue ?? null);
        const balanceDue =
          Number.isFinite(balanceDueRaw)
            ? balanceDueRaw
            : Number.isFinite(total)
              ? Math.max(0, total - paidRaw)
              : null;
        const paymentDate = String(entry?.paymentDate || entry?.date || "").trim();
        let savedAt = "";
        if (paymentDate) {
          savedAt = paymentDate.includes("T") ? paymentDate : `${paymentDate}T00:00:00Z`;
        }
        const clientNameValue = resolveHistoryClientName(entry);
        const clientAccountValue = resolveHistoryClientAccount(entry);
        pending.push({
          invoiceNumber: resolveHistoryNumber(entry),
          invoicePath: entryPath,
          clientName: isValidClientLabel(clientNameValue) ? clientNameValue : "",
          clientAccount: clientAccountValue,
          paymentDate,
          paymentRef: String(
            entry?.paymentRef ||
              entry?.paymentReference ||
              entry?.meta?.paymentRef ||
              entry?.meta?.paymentReference ||
              ""
          ).trim(),
          amount: paidRaw,
          balanceDue,
          currency: String(entry?.currency || "").trim(),
          mode: String(entry?.paymentMethod || entry?.mode || "").trim(),
          entryType: "invoice",
          savedAt
        });
      });
      if (!pending.length) return;
      pending.sort((a, b) => {
        const aTs = Date.parse(a.savedAt || a.paymentDate || "") || 0;
        const bTs = Date.parse(b.savedAt || b.paymentDate || "") || 0;
        if (aTs !== bTs) return aTs - bTs;
        return String(a.invoicePath || "").localeCompare(String(b.invoicePath || ""));
      });
      pending.forEach((entry) => addPaymentHistoryEntry(entry));
    } finally {
      paymentHistorySyncInFlight = false;
    }
  };

  w.addPaymentHistoryEntry = addPaymentHistoryEntry;
  w.hasPaymentHistoryForInvoice = hasPaymentHistoryForInvoice;
  w.removePaymentHistoryForInvoice = removePaymentHistoryForInvoice;
  w.hydratePaymentHistory = async (options = {}) => {
    await hydratePaymentHistory();
    if (!options || options.skipInvoiceSync !== true) {
      syncPaymentHistoryFromInvoices();
    }
  };

  const collectInvoicePaths = async () => {
    if (typeof w.getDocumentHistoryFull === "function") {
      const entries = w.getDocumentHistoryFull("facture") || [];
      const paths = new Set();
      entries.forEach((entry) => {
        const path = String(entry?.path || "").trim();
        if (path) paths.add(path);
      });
      return paths;
    }
    if (w.electronAPI?.listInvoiceFiles) {
      const res = await w.electronAPI.listInvoiceFiles({ docType: "facture" });
      const items = Array.isArray(res?.items) ? res.items : [];
      const paths = new Set();
      items.forEach((entry) => {
        const path = String(entry?.path || entry?.docPath || "").trim();
        if (path) paths.add(path);
      });
      return paths;
    }
    return null;
  };

  const isBalanceOnlyHistoryEntry = (entry) => {
    if (!entry || typeof entry !== "object") return false;
    const invoicePath = String(entry.invoicePath || "").trim();
    const invoiceNumber = String(entry.invoiceNumber || "").trim();
    const clientName = String(entry.clientName || "").trim();
    const amountValue = Number(entry.amount);
    if (invoicePath || invoiceNumber) return false;
    return !!clientName && Number.isFinite(amountValue) && amountValue > 0;
  };

  const clearOrphanPaymentHistory = async () => {
    await w.hydratePaymentHistory({ skipInvoiceSync: true });
    const history = readPaymentHistory();
    if (!history.length) return 0;
    const knownPaths = await collectInvoicePaths();
    let filtered = [];
    if (knownPaths) {
      filtered = history.filter((entry) => {
        const path = String(entry?.invoicePath || "").trim();
        if (!path) return isBalanceOnlyHistoryEntry(entry);
        return knownPaths.has(path);
      });
    } else if (w.electronAPI?.openInvoiceJSON) {
      for (const entry of history) {
        const path = String(entry?.invoicePath || "").trim();
        if (!path) {
          if (isBalanceOnlyHistoryEntry(entry)) filtered.push(entry);
          continue;
        }
        try {
          const loaded = await w.electronAPI.openInvoiceJSON({ path, docType: "facture" });
          if (loaded) filtered.push(entry);
        } catch {}
      }
    } else {
      return 0;
    }
    if (filtered.length === history.length) return 0;
    writePaymentHistory(filtered);
    try {
      window.dispatchEvent(new CustomEvent("payment-history-updated"));
    } catch {}
    return history.length - filtered.length;
  };

  const escapeText = (value) => {
    if (typeof w.escapeHTML === "function") return w.escapeHTML(String(value ?? ""));
    return String(value ?? "");
  };

  const parseIsoDate = (value) => {
    if (!value) return null;
    const str = String(value).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const parsed = new Date(str);
    if (!parsed || Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

    const formatPaymentDateTime = (dateValue, savedAt) => {
      const rawDate = String(dateValue || "").trim();
      if (rawDate) {
        return rawDate.includes("T") ? rawDate.slice(0, 10) : rawDate;
      }
      const saved = String(savedAt || "").trim();
      if (saved.includes("T")) {
        return saved.slice(0, 10);
      }
      return saved || "N.R.";
    };

  const isOverdue = (dateValue) => {
    const parsed = parseIsoDate(dateValue);
    if (!parsed) return null;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return parsed < todayMidnight;
  };

  const resolveClientName = (item) => {
    if (!item) return "";
    const direct = String(item.name || item.clientName || "").trim();
    if (direct && direct.toLowerCase() !== "client") return direct;
    const nested = String(item.client?.name || "").trim();
    if (nested && nested.toLowerCase() !== "client") return nested;
    return "";
  };

  const resolveClientAccount = (item) => {
    if (!item) return "";
    const direct =
      item.account ||
      item.accountOf ||
      item.clientAccount ||
      item.client?.account ||
      item.client?.accountOf ||
      "";
    return String(direct || "").trim();
  };

  const resolveClientFieldLabelText = (key, fallback) => {
    const labelState = w.SEM?.state?.clientFieldLabels || {};
    const custom = typeof labelState?.[key] === "string" ? labelState[key].trim() : "";
    if (custom) return custom;
    if (typeof document !== "undefined") {
      const node = document.querySelector(`[data-client-field-label="${key}"]`);
      const domLabel = String(node?.textContent || "").trim();
      if (domLabel) return domLabel;
    }
    const defaults = w.DEFAULT_CLIENT_FIELD_LABELS || {};
    const base = String(defaults[key] || fallback || "").trim();
    return base || String(fallback || "");
  };

  const resolveClientBenefit = (item) => {
    if (!item) return "";
    const direct = item.benefit || item.beneficiary || "";
    if (direct && String(direct).trim()) return String(direct).trim();
    const nested = item.client?.benefit || item.client?.beneficiary || "";
    return String(nested || "").trim();
  };

  const resolveClientStegRef = (item) => {
    if (!item) return "";
    const direct = item.stegRef || item.steg || "";
    if (direct && String(direct).trim()) return String(direct).trim();
    const nested = item.client?.stegRef || item.client?.steg || "";
    return String(nested || "").trim();
  };

  const resolveClientIdentifier = (item) => {
    if (!item) return "";
    const direct =
      item.identifier ||
      item.vat ||
      item.identifiantFiscal ||
      item.identifiant ||
      item.tva ||
      item.nif ||
      "";
    if (direct && String(direct).trim()) return String(direct).trim();
    const nested =
      item.client?.vat ||
      item.client?.identifiantFiscal ||
      item.client?.identifiant ||
      item.client?.tva ||
      item.client?.nif ||
      "";
    return String(nested || "").trim();
  };

  const getInvoiceTotalsFromData = (loaded) => {
    const totals = loaded?.totals && typeof loaded.totals === "object" ? loaded.totals : {};
    const base = toNumber(
      totals.totalTTC ??
        totals.total ??
        totals.grand ??
        totals.totalHt ??
        totals.totalHT ??
        loaded?.totalTTC ??
        loaded?.total ??
        null
    );
    const paid = toNumber(
      totals.acompte?.paid ??
        totals.paid ??
        loaded?.paid ??
        loaded?.totals?.paid ??
        loaded?.meta?.acompte?.paid ??
        null
    );
    const balanceDue = toNumber(
      totals.balanceDue ??
        totals.acompte?.remaining ??
        loaded?.balanceDue ??
        loaded?.totals?.balanceDue ??
        null
    );
    return { total: base, paid: paid ?? 0, balanceDue };
  };

  const normalizePaymentDateValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.includes("T") ? raw.slice(0, 10) : raw;
  };

  const truncateDisplayText = (value, maxChars = 20) => {
    const text = String(value || "");
    const chars = Array.from(text);
    if (!text || chars.length <= maxChars) return text;
    return `${chars.slice(0, maxChars).join("")}...`;
  };

  const normalizeHistoryAmount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const paymentHistoryEntryMatchesKey = (item, key) => {
    if (!item || !key) return false;
    const entryKey = paymentHistoryItemKey(item, "");
    const entryId = String(item?.id || "").trim();
    return entryId === key || entryKey === key;
  };

  const resolveInvoiceHistoryEntries = (items, entry, { excludeKey = "" } = {}) => {
    const list = Array.isArray(items) ? items : [];
    const invoicePath = String(entry?.invoicePath || "").trim();
    const invoiceNumber = String(entry?.invoiceNumber || "").trim();
    if (!invoicePath && !invoiceNumber) return [];
    return list.filter((item) => {
      if (!item || typeof item !== "object") return false;
      if (excludeKey && paymentHistoryEntryMatchesKey(item, excludeKey)) return false;
      if (invoicePath) {
        return String(item?.invoicePath || "").trim() === invoicePath;
      }
      return invoiceNumber && String(item?.invoiceNumber || "").trim() === invoiceNumber;
    });
  };

  const resolveLatestPaymentEntry = (items) => {
    let best = null;
    let bestTs = -Infinity;
    (Array.isArray(items) ? items : []).forEach((item) => {
      const raw = String(item?.savedAt || item?.paymentDate || "");
      const parsed = Date.parse(raw);
      const ts = Number.isFinite(parsed) ? parsed : 0;
      if (!best || ts > bestTs) {
        best = item;
        bestTs = ts;
      }
    });
    return best;
  };

  const summarizeInvoicePayments = (items) => {
    const list = Array.isArray(items) ? items : [];
    const totalPaid = list.reduce((sum, item) => sum + normalizeHistoryAmount(item?.amount), 0);
    const latest = resolveLatestPaymentEntry(list) || {};
    return {
      totalPaid,
      paymentMethod: String(latest?.mode || "").trim(),
      paymentReference: String(
        latest?.paymentRef || latest?.paymentReference || ""
      ).trim(),
      paymentDate: normalizePaymentDateValue(latest?.paymentDate || latest?.savedAt || "")
    };
  };

  const refreshDocHistoryModalIfOpen = () => {
    const modal = getElSafe("docHistoryModal");
    if (!modal) return;
    if (!modal.classList.contains("is-open")) return;
    if (modal.getAttribute("aria-hidden") === "true") return;
    const refreshBtn = getElSafe("docHistoryModalRefresh");
    if (refreshBtn && typeof refreshBtn.click === "function") {
      refreshBtn.click();
    }
  };

  const revertPaymentFromInvoice = async (entry, options = {}) => {
    const amount = Number(entry?.amount);
    const invoicePath = String(entry?.invoicePath || "").trim();
    if (!invoicePath) throw new Error("Facture introuvable.");
    if (!w.electronAPI?.openInvoiceJSON || !w.electronAPI?.saveInvoiceJSON) {
      throw new Error("Enregistrement indisponible.");
    }
    const loaded = await w.electronAPI.openInvoiceJSON({ path: invoicePath, docType: "facture" });
    if (!loaded || typeof loaded !== "object") throw new Error("Facture introuvable.");

    const meta = loaded.meta && typeof loaded.meta === "object" ? loaded.meta : (loaded.meta = {});
    const totals =
      loaded.totals && typeof loaded.totals === "object" ? loaded.totals : (loaded.totals = {});
    const totalsAcompte =
      totals.acompte && typeof totals.acompte === "object"
        ? totals.acompte
        : (totals.acompte = {});

    const { total, paid: previousPaid, balanceDue: previousBalance } = getInvoiceTotalsFromData(loaded);
    const remainingPayments = Array.isArray(options?.remainingPayments)
      ? options.remainingPayments
      : null;
    const remainingSummary = remainingPayments ? summarizeInvoicePayments(remainingPayments) : null;
    const nextPaid = remainingSummary
      ? Math.max(0, remainingSummary.totalPaid)
      : Math.max(0, (previousPaid || 0) - (Number.isFinite(amount) ? amount : 0));
    const nextBalance = Number.isFinite(total)
      ? Math.max(0, total - nextPaid)
      : Number.isFinite(previousBalance)
        ? Math.max(0, previousBalance + amount)
        : null;
    const status =
      Number.isFinite(total) && Number.isFinite(nextBalance) && nextBalance <= 0
        ? "payee"
        : nextPaid > 0
          ? "partiellement-payee"
          : "pas-encore-payer";

    meta.acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : {};
    meta.acompte.enabled = nextPaid > 0;
    meta.acompte.paid = nextPaid;
    if (nextPaid <= 0) {
      meta.paymentMethod = "";
      meta.paymentDate = "";
      meta.paymentReference = "";
      meta.paymentRef = "";
    } else if (remainingSummary) {
      meta.paymentMethod = remainingSummary.paymentMethod || "";
      meta.paymentDate = remainingSummary.paymentDate || "";
      meta.paymentReference = remainingSummary.paymentReference || "";
      meta.paymentRef = meta.paymentReference || "";
    }

    totalsAcompte.enabled = nextPaid > 0;
    totalsAcompte.paid = nextPaid;
    if (Number.isFinite(total)) totalsAcompte.base = total;
    if (Number.isFinite(nextBalance)) {
      totalsAcompte.remaining = nextBalance;
      totals.balanceDue = nextBalance;
    }

    const saveMeta = {
      silent: true,
      to: "invoices",
      historyPath: invoicePath,
      historyDocType: "facture",
      status,
      forceOverwrite: true
    };
    const saveRes = await w.electronAPI.saveInvoiceJSON({
      data: loaded,
      meta: saveMeta,
      forceOverwrite: true
    });
    if (!saveRes?.ok) throw new Error(saveRes?.error || "Enregistrement impossible.");

    if (typeof w.addDocumentHistory === "function") {
      w.addDocumentHistory({
        docType: "facture",
        path: invoicePath,
        number: entry.invoiceNumber || loaded?.number || loaded?.name || "",
        date: loaded?.date || entry.paymentDate || "",
        name: loaded?.name || "",
        clientName: entry.clientName || resolveHistoryClientName(loaded) || "",
        clientAccount: entry.clientAccount || resolveHistoryClientAccount(loaded) || "",
        totalTTC: total,
        currency: entry.currency || loaded?.currency || "",
        paid: nextPaid,
        balanceDue: nextBalance,
        acompteEnabled: nextPaid > 0,
        status,
        paymentMethod: meta.paymentMethod || "",
        paymentRef: meta.paymentReference || meta.paymentRef || "",
        paymentDate: meta.paymentDate || ""
      });
    }
    return { nextPaid, nextBalance, status };
  };

  const revertPaymentToClientSolde = async () => null;

  const findClientMatchInResults = (results, lookupName, options = {}) => {
    if (!Array.isArray(results) || !results.length) return null;
    const normalizedLookup = normalizeClientLookup(lookupName);
    const matches = (value) => {
      const normalizedValue = normalizeClientLookup(value);
      if (!normalizedValue || !normalizedLookup) return false;
      return (
        normalizedValue === normalizedLookup ||
        normalizedValue.includes(normalizedLookup) ||
        normalizedLookup.includes(normalizedValue)
      );
    };
    let match =
      results.find((item) => matches(resolveClientName(item))) ||
      results.find((item) => matches(resolveClientAccount(item))) ||
      results.find((item) => matches(resolveClientIdentifier(item)));
    if (!match && options.fallbackToFirst !== false) {
      match = results[0];
    }
    return match || null;
  };

  const findClientPathInResults = (results, lookupName, options = {}) => {
    const match = findClientMatchInResults(results, lookupName, options);
    return match?.path || match?.client?.__path || "";
  };

    const scanClientsForMatch = async (lookupName) => {
    if (!w.electronAPI?.searchClients) return "";
    const normalizedLookup = normalizeClientLookup(lookupName);
    if (!normalizedLookup) return "";
    const pageSize = 200;
    let offset = 0;
    let total = null;
    while (total === null || offset < total) {
      const res = await w.electronAPI.searchClients({
        query: "",
        limit: pageSize,
        offset,
        entityType: "client"
      });
      if (!res?.ok) return "";
      const results = Array.isArray(res?.results) ? res.results : [];
      const match = findClientMatchInResults(results, lookupName, { fallbackToFirst: false });
      if (match) return match?.path || match?.client?.__path || "";
      if (total === null) total = Number(res.total) || results.length;
      if (!results.length) break;
      offset += results.length;
      if (results.length < pageSize) break;
    }
    return "";
  };

  const resolveClientPhone = (item) => {
    if (!item) return "";
    const direct = item.phone || item.telephone || item.tel || "";
    if (direct && String(direct).trim()) return String(direct).trim();
    const nested = item.client?.phone || item.client?.telephone || item.client?.tel || "";
    return String(nested || "").trim();
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

  AppInit.registerPaymentActions = function registerPaymentActions() {
    const state = {
      overlay: null,
      closeBtn: null,
      closeFooterBtn: null,
      dateInput: null,
      amountInput: null,
      paymentReferenceInput: null,
      clientSoldeValueEl: null,
      baseSoldeReference: 0,
      addToSoldBtn: null,
      methodSelect: null,
      methodMenu: null,
      methodMenuToggle: null,
      methodMenuDisplay: null,
      methodMenuPanel: null,
      clientInput: null,
      clientResults: null,
      invoicesBody: null,
      outstandingEl: null,
      paymentHistoryBtn: null,
      paymentHistoryModal: null,
      paymentHistoryClose: null,
      paymentHistoryCloseFooter: null,
      paymentHistoryList: null,
      paymentHistoryPrev: null,
      paymentHistoryNext: null,
      paymentHistoryPage: null,
      paymentHistoryPageInput: null,
      paymentHistoryTotalPages: null,
      paymentInvoicePrev: null,
      paymentInvoiceNext: null,
      paymentInvoicePage: null,
      paymentInvoicePageInput: null,
      paymentInvoiceTotalPages: null,
      paymentInvoiceFilterYear: null,
      paymentInvoiceFilterYearMenu: null,
      paymentInvoiceFilterYearMenuToggle: null,
      paymentInvoiceFilterYearDisplay: null,
      paymentInvoiceFilterYearPanel: null,
      historyOpen: false,
      historyPreviousFocus: null,
      historyPage: 1,
      historyPageSize: 15,
      invoicePage: 1,
      invoicePageSize: 5,
      datePicker: null,
      historyDatePicker: null,
      isOpen: false,
      previousFocus: null,
      searchTimer: null,
      clientRequestId: 0,
      invoiceRequestId: 0,
      clientQuery: "",
      clientLoading: false,
      clientError: "",
      clientResultsData: [],
      selectedClient: null,
      invoices: [],
      removedInvoices: new Set(),
      invoiceError: "",
      invoicesLoading: false,
      listenersBound: false,
      paymentHistoryFilterNumber: null,
      paymentHistoryFilterInvoice: null,
      paymentHistoryFilterClient: null,
      paymentHistoryFilterYear: null,
      paymentHistoryFilterYearMenu: null,
      paymentHistoryFilterYearMenuToggle: null,
      paymentHistoryFilterYearDisplay: null,
      paymentHistoryFilterYearPanel: null,
      paymentHistoryFilterDate: null,
      paymentHistoryFilterClear: null,
      invoiceFilters: {
        year: String(new Date().getFullYear())
      },
      historyFilters: {
        paymentNumber: "",
        invoiceNumber: "",
        clientQuery: "",
        date: "",
        year: String(new Date().getFullYear())
      }
    };

    const getPaymentMethodLabel = (value) => {
      if (!state.methodSelect) return "";
      const options = Array.from(state.methodSelect.options || []);
      const match = options.find((opt) => opt.value === value);
      return (match?.textContent || match?.label || "").trim();
    };

    const normalizePaymentMethodValue = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const isSoldClientPaymentMethod = (value) => {
      const normalized = normalizePaymentMethodValue(value);
      return normalized === "sold_client" || normalized === "soldclient";
    };

    const getPaymentMethodPlaceholder = () => getPaymentMethodLabel("") || "Choisir un mode";

    const syncPaymentModalMenuOpenClass = () => {
      if (!state.overlay) return;
      const hasOpenMenu = Boolean(state.methodMenu?.open || state.paymentInvoiceFilterYearMenu?.open);
      state.overlay.classList.toggle("payment-modal--menu-open", hasOpenMenu);
    };

    const setPaymentMethodMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.methodMenu) state.methodMenu.open = open;
      if (state.methodMenuToggle) {
        state.methodMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
      syncPaymentModalMenuOpenClass();
    };

    const syncPaymentMethodMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!state.methodSelect) return "";
      const nextValue = value !== undefined ? String(value || "") : String(state.methodSelect.value || "");
      if (updateSelect) state.methodSelect.value = nextValue;
      if (state.methodMenuDisplay) {
        state.methodMenuDisplay.textContent = getPaymentMethodLabel(nextValue) || getPaymentMethodPlaceholder();
      }
      if (state.methodMenuPanel) {
        state.methodMenuPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = String(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setPaymentMethodMenuState(false);
      return nextValue;
    };

    const wirePaymentMethodMenu = () => {
      if (
        !state.methodMenu ||
        !state.methodMenuToggle ||
        !state.methodMenuPanel ||
        !state.methodSelect ||
        state.methodMenu.dataset.wired === "1"
      ) {
        return;
      }
      state.methodMenu.dataset.wired = "1";
      setPaymentMethodMenuState(state.methodMenu.open);

      state.methodSelect.addEventListener("change", () => {
        syncPaymentMethodMenuUi(state.methodSelect.value);
      });

      state.methodMenuPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = String(btn.dataset.value || "");
        const changed = state.methodSelect.value !== nextValue;
        state.methodSelect.value = nextValue;
        if (changed) {
          state.methodSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncPaymentMethodMenuUi(nextValue);
        }
        setPaymentMethodMenuState(false);
      });

      state.methodMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setPaymentMethodMenuState(!state.methodMenu.open);
        if (!state.methodMenu.open) state.methodMenuToggle.focus();
      });

      state.methodMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setPaymentMethodMenuState(false);
        state.methodMenuToggle.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!state.methodMenu?.open) return;
        if (state.methodMenu.contains(evt.target)) return;
        setPaymentMethodMenuState(false);
      });

      syncPaymentMethodMenuUi(state.methodSelect.value);
    };

    const resolvePaymentHistoryEntryDateIso = (item) =>
      normalizeIsoDateValue(item?.date || item?.paymentDate || item?.savedAt || "");

    const isDefaultPaymentHistoryYear = (value) =>
      normalizeYearValue(value) === getCurrentYearValue();

    const getPaymentHistoryYearLabel = (value) => {
      if (!state.paymentHistoryFilterYear) return "";
      const options = Array.from(state.paymentHistoryFilterYear.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };

    const setPaymentHistoryYearMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.paymentHistoryFilterYearMenu) state.paymentHistoryFilterYearMenu.open = open;
      if (state.paymentHistoryFilterYearMenuToggle) {
        state.paymentHistoryFilterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };

    const syncPaymentHistoryYearMenuUi = (
      value,
      { updateSelect = false, closeMenu = false } = {}
    ) => {
      if (!state.paymentHistoryFilterYear) return "";
      const nextValue =
        value !== undefined
          ? normalizeYearValue(value)
          : normalizeYearValue(state.paymentHistoryFilterYear.value);
      if (updateSelect) state.paymentHistoryFilterYear.value = nextValue;
      if (state.paymentHistoryFilterYearDisplay) {
        state.paymentHistoryFilterYearDisplay.textContent =
          getPaymentHistoryYearLabel(nextValue) || nextValue;
      }
      if (state.paymentHistoryFilterYearPanel) {
        state.paymentHistoryFilterYearPanel
          .querySelectorAll(".model-select-option")
          .forEach((btn) => {
            const isActive = normalizeYearValue(btn.dataset.value || "") === nextValue;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
      }
      if (closeMenu) setPaymentHistoryYearMenuState(false);
      return nextValue;
    };

    const syncPaymentHistoryDatePickerFromState = () => {
      const selectedYear = normalizeYearValue(state.historyFilters.year) || getCurrentYearValue();
      const dayMonth = normalizeDayMonthValue(state.historyFilters.date);
      state.historyFilters.date = dayMonth;
      const isoDate = composeFilterIsoDate(dayMonth, selectedYear);
      state.historyDatePicker?.setValue(isoDate || "", { silent: true });
      if (state.paymentHistoryFilterDate) state.paymentHistoryFilterDate.value = dayMonth;
    };

    const syncPaymentHistoryYearOptions = (entries = readPaymentHistory()) => {
      if (!state.paymentHistoryFilterYear) return;
      const parseYearNumber = (value) => {
        const normalized = normalizeYearValue(value);
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const currentYear = getCurrentYearValue();
      const selectedYearRaw = normalizeYearValue(state.historyFilters.year) || currentYear;
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(entries) ? entries : [])
        .map((entry) => parseYearNumber(resolvePaymentHistoryEntryDateIso(entry).slice(0, 4)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum = minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      state.paymentHistoryFilterYear.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        state.paymentHistoryFilterYear.appendChild(option);
      });
      const nextYear = normalizeYearValue(state.historyFilters.year) || currentYear;
      state.historyFilters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        state.paymentHistoryFilterYear.insertBefore(option, state.paymentHistoryFilterYear.firstChild);
      }
      state.paymentHistoryFilterYear.value = nextYear;
      if (state.paymentHistoryFilterYearPanel) {
        state.paymentHistoryFilterYearPanel.innerHTML = "";
        Array.from(state.paymentHistoryFilterYear.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizeYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          state.paymentHistoryFilterYearPanel.appendChild(btn);
        });
      }
      syncPaymentHistoryYearMenuUi(nextYear);
      syncPaymentHistoryDatePickerFromState();
    };

    const wirePaymentHistoryYearMenu = (onFilterChange) => {
      if (
        !state.paymentHistoryFilterYearMenu ||
        !state.paymentHistoryFilterYearMenuToggle ||
        !state.paymentHistoryFilterYearPanel ||
        !state.paymentHistoryFilterYear ||
        state.paymentHistoryFilterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      state.paymentHistoryFilterYearMenu.dataset.wired = "1";
      setPaymentHistoryYearMenuState(state.paymentHistoryFilterYearMenu.open);

      state.paymentHistoryFilterYear.addEventListener("change", () => {
        const nextYear =
          normalizeYearValue(state.paymentHistoryFilterYear.value || "") || getCurrentYearValue();
        state.paymentHistoryFilterYear.value = nextYear;
        state.historyFilters.year = nextYear;
        syncPaymentHistoryYearMenuUi(nextYear);
        syncPaymentHistoryDatePickerFromState();
        if (typeof onFilterChange === "function") onFilterChange();
      });

      state.paymentHistoryFilterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizeYearValue(btn.dataset.value || "") || getCurrentYearValue();
        const changed = normalizeYearValue(state.paymentHistoryFilterYear.value || "") !== nextValue;
        state.paymentHistoryFilterYear.value = nextValue;
        if (changed) {
          state.paymentHistoryFilterYear.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncPaymentHistoryYearMenuUi(nextValue);
          state.historyFilters.year = nextValue;
          syncPaymentHistoryDatePickerFromState();
          if (typeof onFilterChange === "function") onFilterChange();
        }
        setPaymentHistoryYearMenuState(false);
      });

      state.paymentHistoryFilterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setPaymentHistoryYearMenuState(!state.paymentHistoryFilterYearMenu.open);
        if (!state.paymentHistoryFilterYearMenu.open) state.paymentHistoryFilterYearMenuToggle.focus();
      });

      state.paymentHistoryFilterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setPaymentHistoryYearMenuState(false);
        state.paymentHistoryFilterYearMenuToggle.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!state.paymentHistoryFilterYearMenu?.open) return;
        if (state.paymentHistoryFilterYearMenu.contains(evt.target)) return;
        setPaymentHistoryYearMenuState(false);
      });

      syncPaymentHistoryYearMenuUi(state.paymentHistoryFilterYear.value);
    };

    const resolvePaymentInvoiceEntryDateIso = (item) =>
      normalizeIsoDateValue(item?.date || item?.paymentDate || item?.savedAt || "");

    const resolvePaymentInvoiceEntryYear = (item) => {
      const normalizedDate = resolvePaymentInvoiceEntryDateIso(item);
      if (normalizedDate) return normalizedDate.slice(0, 4);
      const raw = String(item?.date || item?.paymentDate || item?.savedAt || "").trim();
      if (!raw) return "";
      const match = raw.match(/\b(19|20)\d{2}\b/);
      return match ? match[0] : "";
    };

    const getPaymentInvoiceYearLabel = (value) => {
      if (!state.paymentInvoiceFilterYear) return "";
      const options = Array.from(state.paymentInvoiceFilterYear.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };

    const setPaymentInvoiceYearMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.paymentInvoiceFilterYearMenu) state.paymentInvoiceFilterYearMenu.open = open;
      if (state.paymentInvoiceFilterYearMenuToggle) {
        state.paymentInvoiceFilterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
      syncPaymentModalMenuOpenClass();
    };

    const syncPaymentInvoiceYearMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!state.paymentInvoiceFilterYear) return "";
      const nextValue =
        value !== undefined
          ? normalizeYearValue(value)
          : normalizeYearValue(state.paymentInvoiceFilterYear.value);
      if (updateSelect) state.paymentInvoiceFilterYear.value = nextValue;
      if (state.paymentInvoiceFilterYearDisplay) {
        state.paymentInvoiceFilterYearDisplay.textContent =
          getPaymentInvoiceYearLabel(nextValue) || nextValue;
      }
      if (state.paymentInvoiceFilterYearPanel) {
        state.paymentInvoiceFilterYearPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = normalizeYearValue(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setPaymentInvoiceYearMenuState(false);
      return nextValue;
    };

    const syncPaymentInvoiceYearOptions = (entries = state.invoices) => {
      if (!state.paymentInvoiceFilterYear) return;
      const parseYearNumber = (value) => {
        const normalized = normalizeYearValue(value);
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const currentYear = getCurrentYearValue();
      const selectedYearRaw = normalizeYearValue(state.invoiceFilters.year) || currentYear;
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(entries) ? entries : [])
        .map((entry) => parseYearNumber(resolvePaymentInvoiceEntryYear(entry)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum = minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      state.paymentInvoiceFilterYear.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        state.paymentInvoiceFilterYear.appendChild(option);
      });
      const nextYear = normalizeYearValue(state.invoiceFilters.year) || currentYear;
      state.invoiceFilters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        state.paymentInvoiceFilterYear.insertBefore(option, state.paymentInvoiceFilterYear.firstChild);
      }
      state.paymentInvoiceFilterYear.value = nextYear;
      if (state.paymentInvoiceFilterYearPanel) {
        state.paymentInvoiceFilterYearPanel.innerHTML = "";
        Array.from(state.paymentInvoiceFilterYear.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizeYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          state.paymentInvoiceFilterYearPanel.appendChild(btn);
        });
      }
      syncPaymentInvoiceYearMenuUi(nextYear);
    };

    const wirePaymentInvoiceYearMenu = (onFilterChange) => {
      if (
        !state.paymentInvoiceFilterYearMenu ||
        !state.paymentInvoiceFilterYearMenuToggle ||
        !state.paymentInvoiceFilterYearPanel ||
        !state.paymentInvoiceFilterYear ||
        state.paymentInvoiceFilterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      state.paymentInvoiceFilterYearMenu.dataset.wired = "1";
      setPaymentInvoiceYearMenuState(state.paymentInvoiceFilterYearMenu.open);

      state.paymentInvoiceFilterYear.addEventListener("change", () => {
        const nextYear =
          normalizeYearValue(state.paymentInvoiceFilterYear.value || "") || getCurrentYearValue();
        state.paymentInvoiceFilterYear.value = nextYear;
        state.invoiceFilters.year = nextYear;
        syncPaymentInvoiceYearMenuUi(nextYear);
        if (typeof onFilterChange === "function") onFilterChange();
      });

      state.paymentInvoiceFilterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizeYearValue(btn.dataset.value || "") || getCurrentYearValue();
        const changed = normalizeYearValue(state.paymentInvoiceFilterYear.value || "") !== nextValue;
        state.paymentInvoiceFilterYear.value = nextValue;
        if (changed) {
          state.paymentInvoiceFilterYear.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncPaymentInvoiceYearMenuUi(nextValue);
          state.invoiceFilters.year = nextValue;
          if (typeof onFilterChange === "function") onFilterChange();
        }
        setPaymentInvoiceYearMenuState(false);
      });

      state.paymentInvoiceFilterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setPaymentInvoiceYearMenuState(!state.paymentInvoiceFilterYearMenu.open);
        if (!state.paymentInvoiceFilterYearMenu.open) state.paymentInvoiceFilterYearMenuToggle.focus();
      });

      state.paymentInvoiceFilterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setPaymentInvoiceYearMenuState(false);
        state.paymentInvoiceFilterYearMenuToggle.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!state.paymentInvoiceFilterYearMenu?.open) return;
        if (state.paymentInvoiceFilterYearMenu.contains(evt.target)) return;
        setPaymentInvoiceYearMenuState(false);
      });

      syncPaymentInvoiceYearMenuUi(state.paymentInvoiceFilterYear.value);
    };

    const ensureBindings = () => {
      if (state.listenersBound) return;
      const overlay = getElSafe("paymentModal");
      const actionBtn = getElSafe("btnPaymentAdd");
      if (!overlay || !actionBtn) return;
      state.listenersBound = true;
      state.overlay = overlay;
      state.closeBtn = getElSafe("paymentModalClose");
      state.closeFooterBtn = getElSafe("paymentModalCloseFooter");
      state.dateInput = getElSafe("paymentDate");
      state.amountInput = getElSafe("paymentAmount");
      state.paymentReferenceInput = getElSafe("paymentReference");
      state.clientSoldeValueEl = getElSafe("paymentClientSoldeValue");
      state.addToSoldBtn = getElSafe("paymentAddToSold");
      state.methodSelect = getElSafe("paymentMethodSelect") || getElSafe("paymentMethod");
      state.methodMenu = getElSafe("paymentMethodMenu");
      state.methodMenuToggle = state.methodMenu?.querySelector("summary") || null;
      state.methodMenuDisplay = getElSafe("paymentMethodDisplay");
      state.methodMenuPanel = getElSafe("paymentMethodPanel");
      state.clientInput = getElSafe("paymentClientSearch");
      state.clientResults = getElSafe("paymentClientResults");
      state.invoicesBody = getElSafe("paymentInvoiceTableBody");
      state.outstandingEl = getElSafe("paymentOutstanding");
      state.paymentHistoryBtn = getElSafe("btnPaymentHistory");
      state.paymentHistoryModal = getElSafe("paymentHistoryModal");
      state.paymentHistoryClose = getElSafe("paymentHistoryClose");
      state.paymentHistoryCloseFooter = getElSafe("paymentHistoryCloseFooter");
      state.paymentHistoryList = getElSafe("paymentsHistoryModalList");
      state.paymentHistoryPrev = getElSafe("paymentHistoryPrev");
      state.paymentHistoryNext = getElSafe("paymentHistoryNext");
      state.paymentHistoryPage = getElSafe("paymentHistoryPage");
      state.paymentHistoryPageInput = getElSafe("paymentHistoryPageInput");
      state.paymentHistoryTotalPages = getElSafe("paymentHistoryTotalPages");
      state.paymentInvoicePrev = getElSafe("paymentInvoicePrev");
      state.paymentInvoiceNext = getElSafe("paymentInvoiceNext");
      state.paymentInvoicePage = getElSafe("paymentInvoicePage");
      state.paymentInvoicePageInput = getElSafe("paymentInvoicePageInput");
      state.paymentInvoiceTotalPages = getElSafe("paymentInvoiceTotalPages");
      state.paymentInvoiceFilterYear = getElSafe("paymentInvoiceFilterYear");
      state.paymentInvoiceFilterYearMenu = getElSafe("paymentInvoiceFilterYearMenu");
      state.paymentInvoiceFilterYearMenuToggle =
        state.paymentInvoiceFilterYearMenu?.querySelector("summary") || null;
      state.paymentInvoiceFilterYearDisplay = getElSafe("paymentInvoiceFilterYearDisplay");
      state.paymentInvoiceFilterYearPanel = getElSafe("paymentInvoiceFilterYearPanel");
      state.paymentHistoryFilterNumber = getElSafe("paymentHistoryFilterNumber");
      state.paymentHistoryFilterInvoice = getElSafe("paymentHistoryFilterInvoice");
      state.paymentHistoryFilterClient = getElSafe("paymentHistoryFilterClient");
      state.paymentHistoryFilterYear = getElSafe("paymentHistoryFilterYear");
      state.paymentHistoryFilterYearMenu = getElSafe("paymentHistoryFilterYearMenu");
      state.paymentHistoryFilterYearMenuToggle =
        state.paymentHistoryFilterYearMenu?.querySelector("summary") || null;
      state.paymentHistoryFilterYearDisplay = getElSafe("paymentHistoryFilterYearDisplay");
      state.paymentHistoryFilterYearPanel = getElSafe("paymentHistoryFilterYearPanel");
      state.paymentHistoryFilterDate = getElSafe("paymentHistoryFilterDate");
      state.paymentHistoryFilterClear = getElSafe("paymentHistoryFilterClear");
      window.addEventListener("payment-history-updated", () => {
        if (state.historyOpen) renderPaymentsHistoryList(state.paymentHistoryList);
      });

      if (state.dateInput && w.AppDatePicker?.create) {
        state.datePicker = w.AppDatePicker.create(state.dateInput, { allowManualInput: true });
      }
      if (state.paymentHistoryFilterDate && w.AppDatePicker?.create) {
        state.historyDatePicker = w.AppDatePicker.create(state.paymentHistoryFilterDate, {
          allowManualInput: false,
          onChange(value) {
            state.historyFilters.date = normalizeDayMonthValue(value);
            if (state.paymentHistoryFilterDate) {
              state.paymentHistoryFilterDate.value = state.historyFilters.date || "";
            }
            state.historyPage = 1;
            renderPaymentsHistoryList(state.paymentHistoryList);
          }
        });
      }

      wirePaymentMethodMenu();
      wirePaymentInvoiceYearMenu(() => {
        state.invoicePage = 1;
        renderInvoiceTable();
      });
      syncPaymentInvoiceYearOptions(state.invoices);

      state.closeBtn?.addEventListener("click", () => closePaymentModal());
      state.closeFooterBtn?.addEventListener("click", () => closePaymentModal());
      state.overlay?.addEventListener("click", (evt) => {
        if (evt.target === state.overlay) evt.stopPropagation();
      });
      state.addToSoldBtn?.addEventListener("click", () => {
        applyAmountToClientSolde();
      });

      state.clientInput?.addEventListener("input", (evt) => {
        const value = String(evt.target?.value || "");
        state.clientQuery = value.trim();
        state.invoiceError = "";
        state.invoicePage = 1;
        state.removedInvoices = new Set();
        if (state.clientQuery) {
          state.selectedClient = { name: state.clientQuery, identifier: "", path: "" };
        } else {
          state.selectedClient = null;
          state.invoices = [];
          syncPaymentInvoiceYearOptions(state.invoices);
        }
        if (!state.selectedClient?.path) {
          setClientSoldeEmpty();
        }
        renderInvoiceTable();
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(() => {
          fetchClientResults(state.clientQuery);
          if (state.clientQuery.length >= MIN_CLIENT_QUERY_LENGTH) {
            loadInvoicesForClient(state.clientQuery);
          } else {
            state.invoices = [];
            syncPaymentInvoiceYearOptions(state.invoices);
            renderInvoiceTable();
          }
        }, 240);
      });

      state.clientInput?.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape") {
          state.clientInput.value = state.clientInput.value || "";
          hideClientResults();
        }
      });

      state.clientResults?.addEventListener("click", (evt) => {
        const btn = evt.target.closest("[data-payment-client-index]");
        if (!btn) return;
        const idx = Number(btn.dataset.paymentClientIndex);
        const selected = state.clientResultsData[idx];
        if (!selected) return;
        applySelectedClient(selected);
      });

      state.amountInput?.addEventListener("input", () => {
        renderInvoiceTable();
      });
      state.amountInput?.addEventListener("blur", () => {
        if (!state.amountInput) return;
        const nextValue = formatAmountInputValue(state.amountInput.value);
        if (nextValue) state.amountInput.value = nextValue;
      });

      state.invoicesBody?.addEventListener("click", async (evt) => {
        const actionBtn = evt.target.closest("[data-payment-action]");
        if (!actionBtn) return;
        const action = actionBtn.dataset.paymentAction;
        const key = actionBtn.dataset.paymentInvoiceKey || "";
        if (!action) return;
        if (action === "copy-invoice") {
          const invoiceNumber = actionBtn.dataset.paymentInvoiceNumber || "";
          if (invoiceNumber) await copyTextToClipboard(invoiceNumber);
          return;
        }
        if (!key) return;
        const invoice = state.invoices.find((item) => invoiceKey(item) === key);
        if (!invoice) return;
        if (action === "fill-amount") {
          const amount = Number(actionBtn.dataset.paymentAmount || "");
          if (!Number.isFinite(amount) || amount <= 0) return;
          if (state.amountInput) state.amountInput.value = formatAmountInputValue(amount);
          renderInvoiceTable();
          return;
        }
        if (action === "remove") {
          const confirmed = await confirmAction(
            `Retirer la facture ${invoice.number || "-"} de la liste ?`
          );
          if (!confirmed) return;
          state.removedInvoices.add(key);
          renderInvoiceTable();
          return;
        }
        if (action === "pay") {
          const targetAmount = getPaymentAmount();
          if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;
          const { balance } = resolveInvoiceTotals(invoice);
          const appliedAmount = Number.isFinite(balance)
            ? Math.min(targetAmount, balance)
            : targetAmount;
          const paymentMethod = getPaymentMethodValue();
          const isSoldePayment = isSoldClientPaymentMethod(paymentMethod);
          const amountLabel = formatMoneySafe(targetAmount, invoice.currency);
          const confirmed = await confirmAction(
            `Appliquer le paiement de ${amountLabel} \u00e0 la facture ${invoice.number || "-"} ?`
          );
          if (!confirmed) return;
          const clientName = invoice.clientName || state.selectedClient?.name || "";
          let soldClientPath = "";
          let adjustedSoldeValue = null;
          if (isSoldePayment) {
            soldClientPath = await resolveClientPathForSoldeUpdate(clientName);
            if (!soldClientPath) {
              await showPaymentError("Client introuvable.");
              return;
            }
            if (!w.electronAPI?.adjustClientSold) {
              await showPaymentError("Enregistrement indisponible.");
              return;
            }
            const suggestedName = clientName || state.clientInput?.value || "client";
            const invoiceSourceId = invoice?.path || invoice?.number || "";
            const adjustRes = await w.electronAPI.adjustClientSold({
              path: soldClientPath,
              delta: -appliedAmount,
              precision: 3,
              clamp: false,
              rejectIfInsufficient: true,
              suggestedName,
              entityType: "client",
              ledgerType: "debit",
              ledgerSource: "invoice",
              ledgerSourceId: invoiceSourceId,
              skipLedger: true
            });
            if (!adjustRes?.ok) {
              await showPaymentError(adjustRes?.error || "Enregistrement impossible.");
              return;
            }
            const adjustedRaw = String(
              adjustRes?.soldClient ?? adjustRes?.client?.soldClient ?? ""
            );
            const parsedAdjusted = Number(adjustedRaw.replace(",", "."));
            adjustedSoldeValue = Number.isFinite(parsedAdjusted) ? parsedAdjusted : null;
            if (Number.isFinite(adjustedSoldeValue)) {
              setClientSoldeDisplay(adjustedSoldeValue);
            }
          }
          try {
            await applyPaymentToInvoice(invoice, targetAmount, { invoiceKeyHint: key });
            await refreshClientSoldeDisplay({
              clientName,
              clientPath: isSoldePayment ? soldClientPath : "",
              client: isSoldePayment
                ? (Number.isFinite(adjustedSoldeValue)
                    ? {
                        soldClient: String(adjustedSoldeValue)
                      }
                    : null)
                : null,
              skipFetch: isSoldePayment && Number.isFinite(adjustedSoldeValue)
            });
            if (state.selectedClient?.name) {
              loadInvoicesForClient(state.selectedClient.name);
            } else {
              renderInvoiceTable();
              }
            renderPaymentsHistoryList(state.paymentHistoryList);
          } catch (err) {
            await showPaymentError(err?.message || err);
          }
        }
      });

      state.paymentHistoryBtn?.addEventListener("click", () => {
        openPaymentHistoryModal();
      });
      state.paymentHistoryClose?.addEventListener("click", () => closePaymentHistoryModal());
      state.paymentHistoryCloseFooter?.addEventListener("click", () => closePaymentHistoryModal());
      state.paymentHistoryPrev?.addEventListener("click", () => {
        if (state.historyPage > 1) {
          state.historyPage -= 1;
          renderPaymentsHistoryList(state.paymentHistoryList);
        }
      });
      state.paymentHistoryNext?.addEventListener("click", () => {
        state.historyPage += 1;
        renderPaymentsHistoryList(state.paymentHistoryList);
      });
      state.paymentHistoryPageInput?.addEventListener("change", (evt) => {
        const raw = Number(evt.target?.value);
        if (!Number.isFinite(raw)) return;
        state.historyPage = Math.max(1, Math.floor(raw));
        renderPaymentsHistoryList(state.paymentHistoryList);
      });
      state.paymentHistoryPageInput?.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          state.paymentHistoryPageInput?.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      const onFilterInput = () => {
        state.historyFilters.paymentNumber = String(state.paymentHistoryFilterNumber?.value || "").trim();
        state.historyFilters.invoiceNumber = String(state.paymentHistoryFilterInvoice?.value || "").trim();
        state.historyFilters.clientQuery = String(state.paymentHistoryFilterClient?.value || "").trim();
        state.historyFilters.date = normalizeDayMonthValue(
          String(state.paymentHistoryFilterDate?.value || "").trim()
        );
        state.historyFilters.year =
          normalizeYearValue(state.paymentHistoryFilterYear?.value || "") || getCurrentYearValue();
        if (state.paymentHistoryFilterDate) {
          state.paymentHistoryFilterDate.value = state.historyFilters.date;
        }
        syncPaymentHistoryYearMenuUi(state.historyFilters.year, { updateSelect: true });
        syncPaymentHistoryDatePickerFromState();
        state.historyPage = 1;
        renderPaymentsHistoryList(state.paymentHistoryList);
      };
      state.paymentHistoryFilterNumber?.addEventListener("input", onFilterInput);
      state.paymentHistoryFilterInvoice?.addEventListener("input", onFilterInput);
      state.paymentHistoryFilterClient?.addEventListener("input", onFilterInput);
      state.paymentHistoryFilterDate?.addEventListener("input", onFilterInput);
      wirePaymentHistoryYearMenu(onFilterInput);
      syncPaymentHistoryYearOptions(readPaymentHistory());
      state.paymentHistoryList?.addEventListener("click", async (evt) => {
        const deleteBtn = evt.target.closest("[data-payment-history-delete]");
        if (deleteBtn) {
          evt.preventDefault();
          const key = deleteBtn.dataset.paymentHistoryDelete || "";
          if (!key) return;
          const confirmed = await confirmAction("Supprimer ce paiement de l'historique ?");
          if (!confirmed) return;
          const result = await deletePaymentHistoryEntryByKey(key, {
            refreshUi: true
          });
          if (!result?.ok) {
            await showPaymentError(result?.error || "Suppression impossible.");
            return;
          }
          if (Array.isArray(result.warnings) && result.warnings.length) {
            if (typeof w.showToast === "function") {
              w.showToast(result.warnings[0]);
            } else {
              console.warn("payment deletion warnings:", result.warnings);
            }
          }
          return;
        }
        const copyBtn = evt.target.closest("[data-payment-history-copy]");
        if (!copyBtn) return;
        evt.preventDefault();
        const copyValue = copyBtn.dataset.paymentHistoryCopyValue || "";
        if (copyValue) await copyTextToClipboard(copyValue);
      });
      state.paymentHistoryFilterClear?.addEventListener("click", () => {
        state.historyFilters.paymentNumber = "";
        state.historyFilters.invoiceNumber = "";
        state.historyFilters.clientQuery = "";
        state.historyFilters.date = "";
        state.historyFilters.year = getCurrentYearValue();
        if (state.paymentHistoryFilterNumber) state.paymentHistoryFilterNumber.value = "";
        if (state.paymentHistoryFilterInvoice) state.paymentHistoryFilterInvoice.value = "";
        if (state.paymentHistoryFilterClient) state.paymentHistoryFilterClient.value = "";
        if (state.paymentHistoryFilterDate) state.paymentHistoryFilterDate.value = "";
        syncPaymentHistoryYearOptions(readPaymentHistory());
        syncPaymentHistoryYearMenuUi(state.historyFilters.year, {
          updateSelect: true,
          closeMenu: true
        });
        syncPaymentHistoryDatePickerFromState();
        state.historyPage = 1;
        renderPaymentsHistoryList(state.paymentHistoryList);
      });

      state.paymentInvoicePrev?.addEventListener("click", () => {
        const totalPages = getInvoiceTotalPages();
        if (totalPages <= 1) return;
        state.invoicePage = Math.max(1, state.invoicePage - 1);
        renderInvoiceTable();
      });
      state.paymentInvoiceNext?.addEventListener("click", () => {
        const totalPages = getInvoiceTotalPages();
        if (totalPages <= 1) return;
        state.invoicePage = Math.min(totalPages, state.invoicePage + 1);
        renderInvoiceTable();
      });
      state.paymentInvoicePageInput?.addEventListener("change", (evt) => {
        const totalPages = getInvoiceTotalPages();
        if (totalPages <= 0) return;
        const nextValue = Number(evt.target?.value || "");
        if (!Number.isFinite(nextValue)) return;
        const nextPage = Math.min(totalPages, Math.max(1, Math.floor(nextValue)));
        state.invoicePage = nextPage;
        renderInvoiceTable();
      });
      state.paymentInvoicePageInput?.addEventListener("keydown", (evt) => {
        if (evt.key !== "Enter") return;
        evt.preventDefault();
        state.paymentInvoicePageInput?.dispatchEvent(new Event("change", { bubbles: true }));
      });

      actionBtn.addEventListener("click", () => {
        openPaymentModal();
      });
    };

    const openPaymentModal = () => {
      ensureBindings();
      if (!state.overlay) return;
      if (state.isOpen) return;
      state.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      state.overlay.hidden = false;
      state.overlay.removeAttribute("hidden");
      state.overlay.setAttribute("aria-hidden", "false");
      state.overlay.classList.add("is-open");
      state.isOpen = true;
      resetPaymentForm();
      setPaymentSoldClientVisibility(true);
      initializePaymentSoldeBase();
      document.addEventListener("keydown", onModalKeyDown);
      document.addEventListener("click", onDocumentClick, true);
      const focusTarget = state.dateInput || state.clientInput || state.amountInput || state.closeBtn;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    };

    const closePaymentModal = () => {
      if (!state.overlay || !state.isOpen) return;
      state.overlay.classList.remove("is-open");
      state.overlay.hidden = true;
      state.overlay.setAttribute("hidden", "");
      state.overlay.setAttribute("aria-hidden", "true");
      state.isOpen = false;
      setPaymentInvoiceYearMenuState(false);
      setPaymentMethodMenuState(false);
      document.removeEventListener("keydown", onModalKeyDown);
      document.removeEventListener("click", onDocumentClick, true);
      hideClientResults();
      if (state.previousFocus && typeof state.previousFocus.focus === "function") {
        try {
          state.previousFocus.focus();
        } catch {}
      }
      state.previousFocus = null;
    };

    const onModalKeyDown = (evt) => {
      if (evt.key === "Escape") {
        if (state.paymentInvoiceFilterYearMenu?.open) {
          evt.preventDefault();
          setPaymentInvoiceYearMenuState(false);
          try {
            state.paymentInvoiceFilterYearMenuToggle?.focus?.();
          } catch {}
          return;
        }
        if (state.methodMenu?.open) {
          evt.preventDefault();
          setPaymentMethodMenuState(false);
          try {
            state.methodMenuToggle?.focus?.();
          } catch {}
          return;
        }
        evt.preventDefault();
        closePaymentModal();
      }
    };

    const openPaymentHistoryModal = () => {
      ensureBindings();
      if (!state.paymentHistoryModal || state.historyOpen) return;
      state.historyPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      state.historyPage = 1;
      state.historyFilters.paymentNumber = String(state.paymentHistoryFilterNumber?.value || "").trim();
      state.historyFilters.invoiceNumber = String(state.paymentHistoryFilterInvoice?.value || "").trim();
      state.historyFilters.clientQuery = String(state.paymentHistoryFilterClient?.value || "").trim();
      state.historyFilters.date = normalizeDayMonthValue(
        String(state.paymentHistoryFilterDate?.value || "").trim()
      );
      state.historyFilters.year =
        normalizeYearValue(state.paymentHistoryFilterYear?.value || "") || getCurrentYearValue();
      if (state.paymentHistoryFilterDate) {
        state.paymentHistoryFilterDate.value = state.historyFilters.date;
      }
      syncPaymentHistoryYearOptions(readPaymentHistory());
      syncPaymentHistoryYearMenuUi(state.historyFilters.year, { updateSelect: true, closeMenu: true });
      syncPaymentHistoryDatePickerFromState();
      state.paymentHistoryModal.hidden = false;
      state.paymentHistoryModal.removeAttribute("hidden");
      state.paymentHistoryModal.setAttribute("aria-hidden", "false");
      state.paymentHistoryModal.classList.add("is-open");
      state.historyOpen = true;
      renderPaymentsHistoryList(state.paymentHistoryList);
      w.hydratePaymentHistory()
        .then(async () => {
          await clearOrphanPaymentHistory();
          if (state.historyOpen) renderPaymentsHistoryList(state.paymentHistoryList);
        })
        .catch(() => {});
      document.addEventListener("keydown", onHistoryKeyDown);
      const focusTarget = state.paymentHistoryClose || state.paymentHistoryCloseFooter;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    };

    const closePaymentHistoryModal = () => {
      if (!state.paymentHistoryModal || !state.historyOpen) return;
      setPaymentHistoryYearMenuState(false);
      state.historyDatePicker?.close?.();
      state.paymentHistoryModal.classList.remove("is-open");
      state.paymentHistoryModal.hidden = true;
      state.paymentHistoryModal.setAttribute("hidden", "");
      state.paymentHistoryModal.setAttribute("aria-hidden", "true");
      state.historyOpen = false;
      document.removeEventListener("keydown", onHistoryKeyDown);
      if (state.historyPreviousFocus && typeof state.historyPreviousFocus.focus === "function") {
        try {
          state.historyPreviousFocus.focus();
        } catch {}
      }
      state.historyPreviousFocus = null;
    };

    const onHistoryKeyDown = (evt) => {
      if (evt.key === "Escape") {
        if (state.paymentHistoryFilterYearMenu?.open) {
          evt.preventDefault();
          setPaymentHistoryYearMenuState(false);
          try {
            state.paymentHistoryFilterYearMenuToggle?.focus?.();
          } catch {}
          return;
        }
        evt.preventDefault();
        closePaymentHistoryModal();
      }
    };

    const onDocumentClick = (evt) => {
      if (!state.isOpen) return;
      if (!state.clientResults || !state.clientInput) return;
      if (state.clientResults.contains(evt.target) || state.clientInput.contains(evt.target)) return;
      hideClientResults();
    };

    const resetPaymentForm = () => {
      const today = new Date().toISOString().slice(0, 10);
      if (state.datePicker) {
        state.datePicker.setValue(today, { silent: true });
      } else if (state.dateInput) {
        state.dateInput.value = today;
      }
      if (state.amountInput) state.amountInput.value = "";
      if (state.paymentReferenceInput) state.paymentReferenceInput.value = "";
      state.invoicePage = 1;
      if (state.methodSelect && state.methodSelect.options.length) {
        const options = Array.from(state.methodSelect.options || []);
        const firstValueOption = options.find((opt) => opt.value) || options[0] || null;
        state.methodSelect.value = firstValueOption ? firstValueOption.value : "";
        syncPaymentMethodMenuUi(state.methodSelect.value);
      }
      if (state.clientInput) state.clientInput.value = "";
      state.clientQuery = "";
      state.clientLoading = false;
      state.clientError = "";
      state.clientResultsData = [];
      state.selectedClient = null;
      state.invoices = [];
      state.removedInvoices = new Set();
      state.invoiceError = "";
      state.invoicesLoading = false;
      state.invoiceFilters.year = getCurrentYearValue();
      syncPaymentInvoiceYearOptions(state.invoices);
      syncPaymentInvoiceYearMenuUi(state.invoiceFilters.year, {
        updateSelect: true,
        closeMenu: true
      });
      setClientSoldeEmpty();
      renderClientResults();
      renderInvoiceTable();
    };

    const hideClientResults = () => {
      if (!state.clientResults) return;
      state.clientResults.hidden = true;
      state.clientResults.innerHTML = "";
    };

    const renderClientResults = () => {
      if (!state.clientResults) return;
      state.clientResults.innerHTML = "";
      if (!state.clientQuery) {
        hideClientResults();
        return;
      }
      state.clientResults.hidden = false;
      if (state.clientLoading) {
        state.clientResults.innerHTML = '<div class="client-search__status">Chargement...</div>';
        return;
      }
      if (state.clientError) {
        state.clientResults.innerHTML = `<div class="client-search__status">${escapeText(
          state.clientError
        )}</div>`;
        return;
      }
      if (!state.clientResultsData.length) {
        state.clientResults.innerHTML = '<div class="client-search__status">Aucun client trouve.</div>';
        return;
      }
      const fragment = document.createDocumentFragment();
      const list = document.createElement("div");
      list.className = "article-search__list";
      const formatValue = (value) => {
        if (!value) return '<span class="client-search__empty">N.R.</span>';
        return escapeText(value);
      };
      state.clientResultsData.forEach((item, index) => {
        const nameValue = resolveClientName(item);
        const accountValue = resolveClientAccount(item);
        const hasName = !!String(nameValue || "").trim();
        const useAccountLabel = !hasName && !!String(accountValue || "").trim();
        const nameLabel = useAccountLabel
          ? resolveClientFieldLabelText("account", "Pour le compte de")
          : resolveClientFieldLabelText("name", "Nom");
        const name = useAccountLabel ? accountValue : hasName ? nameValue : "Sans nom";
        const identifierLabel = useAccountLabel
          ? resolveClientFieldLabelText("benefit", "Au profit de")
          : resolveClientFieldLabelText("taxId", "Matricule fiscal");
        const identifier = useAccountLabel ? resolveClientBenefit(item) : resolveClientIdentifier(item);
        const phoneLabel = useAccountLabel
          ? resolveClientFieldLabelText("stegRef", "Ref STEG")
          : resolveClientFieldLabelText("phone", "Telephone");
        const phone = useAccountLabel ? resolveClientStegRef(item) : resolveClientPhone(item);
        const option = document.createElement("div");
        option.className = "client-search__option";
        option.dataset.paymentClientIndex = String(index);
        option.innerHTML = `
          <button type="button" class="client-search__select client-search__select--detailed" data-payment-client-index="${index}" role="option">
            <div class="client-search__details-grid">
              <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                <span class="client-search__detail-label">${nameLabel}</span>
                <span class="client-search__detail-value">${formatValue(name)}</span>
              </div>
              <div class="client-search__detail client-search__detail--inline">
                <span class="client-search__detail-label">${identifierLabel}</span>
                <span class="client-search__detail-value">${formatValue(identifier)}</span>
              </div>
              <div class="client-search__detail client-search__detail--inline client-search__detail--phone">
                <span class="client-search__detail-label">${phoneLabel}</span>
                <span class="client-search__detail-value">${formatValue(phone)}</span>
              </div>
            </div>
          </button>
        `;
        list.appendChild(option);
      });
      fragment.appendChild(list);
      state.clientResults.appendChild(fragment);
    };

    const resolvePaymentDate = (item) => {
      if (!item) return "";
      const direct = item.paymentDate || item.date || "";
      return String(direct || "").trim();
    };

const normalizePaymentModeLabel = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "-";

  // canonical keys
  if (raw === "cash") return "Esp\u00e8ces";
  if (raw === "cash_deposit") return "Versement Esp\u00e8ces";
  if (raw === "cheque") return "Ch\u00e8que";
  if (raw === "bill_of_exchange") return "Effet";
  if (raw === "transfer") return "Virement";
  if (raw === "card") return "Carte bancaire";
  if (raw === "withholding_tax") return "Retenue \u00e0 la source";
  if (raw === "sold_client") return "Solde client";

  // keep your existing legacy key
  if (raw === "bank") return "D\u00e9p\u00f4t bancaire";

  // labels / user-entered variants
  if (raw === "esp\u00e8ces" || raw === "especes") return "Esp\u00e8ces";
  if (raw === "versement esp\u00e8ces" || raw === "versement especes") return "Versement Esp\u00e8ces";
  if (raw === "ch\u00e8que" || raw === "cheque") return "Ch\u00e8que";
  if (raw === "effet") return "Effet";
  if (raw === "virement") return "Virement";
  if (raw === "carte bancaire") return "Carte bancaire";
  if (raw === "retenue \u00e0 la source" || raw === "retenue a la source") return "Retenue \u00e0 la source";
  if (raw === "d\u00e9p\u00f4t bancaire" || raw === "depot bancaire") return "D\u00e9p\u00f4t bancaire";

  return value;
};


    const hasPaymentHistoryFilters = () => {
      const { paymentNumber, invoiceNumber, clientQuery, date, year } = state.historyFilters || {};
      return !!(
        String(paymentNumber || "").trim() ||
        String(invoiceNumber || "").trim() ||
        String(clientQuery || "").trim() ||
        String(date || "").trim() ||
        !isDefaultPaymentHistoryYear(year)
      );
    };

    const normalizeFilterValue = (value) => normalizeText(value);

    const renderPaymentsHistoryList = (listEl) => {
      if (!listEl) return;
      listEl.innerHTML = "";
      const historyEntries =
        typeof w.getDocumentHistoryFull === "function" ? w.getDocumentHistoryFull("facture") || [] : [];
      const accountByInvoicePath = new Map();
      historyEntries.forEach((entry) => {
        const path = String(entry?.path || "").trim();
        if (!path || accountByInvoicePath.has(path)) return;
        const account = String(entry?.clientAccount || entry?.client?.account || entry?.client?.accountOf || "").trim();
        if (account) accountByInvoicePath.set(path, account);
      });
      const paymentEntries = readPaymentHistory();
      const items = paymentEntries.map((entry) => ({
        key: paymentHistoryItemKey(entry, ""),
        number: entry.invoiceNumber,
        clientName: isValidClientLabel(entry.clientName) ? entry.clientName : "",
        clientAccount:
          String(entry.clientAccount || "").trim() ||
          accountByInvoicePath.get(String(entry?.invoicePath || "").trim()) ||
          "",
        date: entry.paymentDate || entry.savedAt || "",
        paymentRef: String(entry.paymentRef || "").trim(),
        paid: Number(entry.amount),
        balanceDue: Number.isFinite(entry.balanceDue) ? entry.balanceDue : null,
        currency: entry.currency,
        mode: entry.mode,
        invoicePath: String(entry.invoicePath || "").trim(),
        savedAt: String(entry.savedAt || "").trim(),
        paymentNumber: Number(entry.paymentNumber)
      }));
      const filters = state.historyFilters || {};
      const filterPayment = normalizeFilterValue(filters.paymentNumber);
      const filterInvoice = normalizeFilterValue(filters.invoiceNumber);
      const filterClient = normalizeFilterValue(filters.clientQuery);
      const selectedYear = normalizeYearValue(filters.year) || getCurrentYearValue();
      state.historyFilters.year = selectedYear;
      const filterDateDayMonth = normalizeDayMonthValue(filters.date);
      state.historyFilters.date = filterDateDayMonth;
      const filterDateIso = composeFilterIsoDate(filterDateDayMonth, selectedYear);
      syncPaymentHistoryYearOptions(items);
      const hasFilters = hasPaymentHistoryFilters();
      if (!items.length) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = hasFilters
          ? "Aucun paiement ne correspond aux filtres."
          : "Aucun paiement trouve.";
        row.appendChild(cell);
        listEl.appendChild(row);
        if (state.paymentHistoryPage) state.paymentHistoryPage.setAttribute("aria-label", "Page 0 sur 0");
        if (state.paymentHistoryTotalPages) state.paymentHistoryTotalPages.textContent = "0";
        if (state.paymentHistoryPageInput) {
          state.paymentHistoryPageInput.value = "0";
          state.paymentHistoryPageInput.max = "0";
          state.paymentHistoryPageInput.setAttribute("aria-valuemax", "0");
          state.paymentHistoryPageInput.setAttribute("aria-valuenow", "0");
        }
        if (state.paymentHistoryPrev) state.paymentHistoryPrev.disabled = true;
        if (state.paymentHistoryNext) state.paymentHistoryNext.disabled = true;
        if (state.paymentHistoryFilterClear) {
          state.paymentHistoryFilterClear.disabled = !hasFilters;
        }
        return;
      }
      const toTimestamp = (item) => {
        const primary = item.date || item.savedAt || "";
        const parsed = Date.parse(primary);
        if (Number.isFinite(parsed)) return parsed;
        const fallback = parseIsoDate(item.date);
        return fallback ? fallback.getTime() : 0;
      };
      const stableKey = (item) => {
        const parts = [
          String(item.ts || 0),
          String(item.invoicePath || ""),
          String(item.number || ""),
          String(item.savedAt || ""),
          String(item.date || "")
        ];
        return parts.join("|");
      };
      items.forEach((item) => {
        item.ts = toTimestamp(item);
        item._stableKey = stableKey(item);
      });
      const itemsAsc = items
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0) || a._stableKey.localeCompare(b._stableKey));
      itemsAsc.forEach((item) => {
        item.displayNumber = Number.isFinite(item.paymentNumber) ? item.paymentNumber : null;
      });
      items.sort((a, b) => {
        const numberA = Number.isFinite(a.displayNumber) ? a.displayNumber : 0;
        const numberB = Number.isFinite(b.displayNumber) ? b.displayNumber : 0;
        if (numberA !== numberB) return numberB - numberA;
        return (b.ts || 0) - (a.ts || 0) || a._stableKey.localeCompare(b._stableKey);
      });
      const filteredItems = items.filter((item) => {
        if (filterPayment) {
          const numberValue = Number.isFinite(item.displayNumber)
            ? String(item.displayNumber)
            : Number.isFinite(item.paymentNumber)
              ? String(item.paymentNumber)
              : "";
          const numberLabel = `pm${numberValue}`;
          const match =
            normalizeFilterValue(numberValue).includes(filterPayment) ||
            normalizeFilterValue(numberLabel).includes(filterPayment);
          if (!match) return false;
        }
        if (filterInvoice) {
          const invoiceValue = normalizeFilterValue(item.number);
          if (!invoiceValue.includes(filterInvoice)) return false;
        }
        if (filterClient) {
          const clientValue = normalizeFilterValue(item.clientName);
          const accountValue = normalizeFilterValue(item.clientAccount);
          if (!clientValue.includes(filterClient) && !accountValue.includes(filterClient)) return false;
        }
        const normalizedDate = resolvePaymentHistoryEntryDateIso(item);
        if (!normalizedDate) return false;
        if (!normalizedDate.startsWith(`${selectedYear}-`)) return false;
        if (filterDateIso && normalizedDate !== filterDateIso) return false;
        return true;
      });
      if (!filteredItems.length) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = "Aucun paiement ne correspond aux filtres.";
        row.appendChild(cell);
        listEl.appendChild(row);
        if (state.paymentHistoryPage) state.paymentHistoryPage.setAttribute("aria-label", "Page 0 sur 0");
        if (state.paymentHistoryTotalPages) state.paymentHistoryTotalPages.textContent = "0";
        if (state.paymentHistoryPageInput) {
          state.paymentHistoryPageInput.value = "0";
          state.paymentHistoryPageInput.max = "0";
          state.paymentHistoryPageInput.setAttribute("aria-valuemax", "0");
          state.paymentHistoryPageInput.setAttribute("aria-valuenow", "0");
        }
        if (state.paymentHistoryPrev) state.paymentHistoryPrev.disabled = true;
        if (state.paymentHistoryNext) state.paymentHistoryNext.disabled = true;
        if (state.paymentHistoryFilterClear) {
          state.paymentHistoryFilterClear.disabled = !hasFilters;
        }
        return;
      }
      const totalPages = Math.max(1, Math.ceil(filteredItems.length / state.historyPageSize));
      if (state.historyPage > totalPages) state.historyPage = totalPages;
      if (state.historyPage < 1) state.historyPage = 1;
      const startIdx = (state.historyPage - 1) * state.historyPageSize;
      const slice = filteredItems.slice(startIdx, startIdx + state.historyPageSize);
      const totalCount = filteredItems.length;
      if (state.paymentHistoryPage) {
        state.paymentHistoryPage.setAttribute("aria-label", `Page ${state.historyPage} sur ${totalPages}`);
      }
      if (state.paymentHistoryTotalPages) state.paymentHistoryTotalPages.textContent = String(totalPages);
      if (state.paymentHistoryPageInput) {
        state.paymentHistoryPageInput.value = String(state.historyPage);
        state.paymentHistoryPageInput.max = String(totalPages);
        state.paymentHistoryPageInput.setAttribute("aria-valuemax", String(totalPages));
        state.paymentHistoryPageInput.setAttribute("aria-valuenow", String(state.historyPage));
      }
      if (state.paymentHistoryPrev) state.paymentHistoryPrev.disabled = state.historyPage <= 1;
      if (state.paymentHistoryNext) state.paymentHistoryNext.disabled = state.historyPage >= totalPages;
      if (state.paymentHistoryFilterClear) {
        state.paymentHistoryFilterClear.disabled = !hasFilters;
      }
      const fragment = document.createDocumentFragment();
      slice.forEach((item, index) => {
        const row = document.createElement("tr");

        const numberCell = document.createElement("td");
          const paymentNumber =
            Number.isFinite(item.displayNumber) && item.displayNumber > 0
              ? item.displayNumber
              : Number.isFinite(item.paymentNumber) && item.paymentNumber > 0
                ? item.paymentNumber
                : "-";
          numberCell.textContent = `PM${paymentNumber}`;

        const factureCell = document.createElement("td");
        factureCell.className = "payment-history__align-right";
        const invoiceWrap = document.createElement("div");
        invoiceWrap.className = "payment-history__value payment-history__value--right";
        const invoiceText = document.createElement("span");
        invoiceText.className = "payment-history__text";
        invoiceText.textContent = item.number || "-";
        const invoiceCopyBtn = document.createElement("button");
        invoiceCopyBtn.type = "button";
        invoiceCopyBtn.className = "payment-history__copy";
        invoiceCopyBtn.setAttribute("aria-label", "Copier N\u00b0 de facture");
        invoiceCopyBtn.title = "Copier N\u00b0 de facture";
        invoiceCopyBtn.dataset.paymentHistoryCopy = "invoice";
        invoiceCopyBtn.dataset.paymentHistoryCopyValue = item.number || "";
        if (!item.number) invoiceCopyBtn.disabled = true;
        invoiceCopyBtn.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/></svg>';
        invoiceWrap.append(invoiceText, invoiceCopyBtn);
        factureCell.appendChild(invoiceWrap);

        const clientCell = document.createElement("td");
        clientCell.className = "payment-history__align-right";
        const clientWrap = document.createElement("div");
        clientWrap.className = "payment-history__value payment-history__value--right";
        const clientText = document.createElement("span");
        clientText.className = "payment-history__text";
        const clientNameValue = isValidClientLabel(item.clientName) ? item.clientName : "";
        const clientAccountValue = String(item.clientAccount || "").trim();
        const clientValue = clientNameValue || clientAccountValue;
        const clientLabel = clientNameValue || !clientAccountValue ? "Client" : "Pour le compte de";
        const clientValueDisplay = truncateDisplayText(clientValue, 20);
        clientText.textContent = clientValue ? `${clientLabel} : ${clientValueDisplay}` : "N.R.";
        if (clientValue) {
          clientText.title = `${clientLabel} : ${clientValue}`;
        }
        const clientCopyBtn = document.createElement("button");
        clientCopyBtn.type = "button";
        clientCopyBtn.className = "payment-history__copy";
        clientCopyBtn.setAttribute("aria-label", clientLabel === "Client" ? "Copier le client" : "Copier Pour le compte de");
        clientCopyBtn.title = clientLabel === "Client" ? "Copier le client" : "Copier Pour le compte de";
        clientCopyBtn.dataset.paymentHistoryCopy = "client";
        clientCopyBtn.dataset.paymentHistoryCopyValue = clientValue;
        if (!clientValue) clientCopyBtn.disabled = true;
        clientCopyBtn.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/></svg>';
        clientWrap.append(clientText, clientCopyBtn);
        clientCell.appendChild(clientWrap);

        const dateCell = document.createElement("td");
        dateCell.className = "payment-history__align-center";
        dateCell.textContent = formatPaymentDateTime(item.date, item.savedAt);

        const refCell = document.createElement("td");
        refCell.className = "payment-history__align-center";
        refCell.textContent = item.paymentRef || "-";

        const paidCell = document.createElement("td");
        paidCell.className = "num";
        paidCell.textContent = formatAmountFixed3(item.paid, item.currency);

          const modeCell = document.createElement("td");
          modeCell.className = "payment-history__align-center";
          modeCell.textContent = normalizePaymentModeLabel(item.mode);

        const actionCell = document.createElement("td");
        actionCell.className = "payment-history__align-center";
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "payment-history__copy payment-history__delete";
        deleteBtn.setAttribute("aria-label", "Supprimer le paiement");
        deleteBtn.title = "Supprimer le paiement";
        deleteBtn.dataset.paymentHistoryDelete = item.key || "";
        deleteBtn.innerHTML =
          '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5z"></path></svg>';
        if (!item.key) deleteBtn.disabled = true;
        actionCell.appendChild(deleteBtn);

        row.append(
          numberCell,
          factureCell,
          clientCell,
          dateCell,
          refCell,
          paidCell,
          modeCell,
          actionCell
        );
        fragment.appendChild(row);
      });
      listEl.appendChild(fragment);
    };

    const fetchClientResults = async (query) => {
      if (!state.clientResults) return;
      const trimmed = String(query || "").trim();
      if (!trimmed || trimmed.length < MIN_CLIENT_QUERY_LENGTH) {
        state.clientResultsData = [];
        state.clientLoading = false;
        state.clientError = trimmed ? `Tapez au moins ${MIN_CLIENT_QUERY_LENGTH} caracteres.` : "";
        renderClientResults();
        return;
      }
      if (!w.electronAPI?.searchClients) {
        state.clientResultsData = [];
        state.clientLoading = false;
        state.clientError = "Recherche des clients indisponible.";
        renderClientResults();
        return;
      }
      const requestId = ++state.clientRequestId;
      state.clientLoading = true;
      state.clientError = "";
      renderClientResults();
      try {
        const res = await w.electronAPI.searchClients({ query: trimmed, entityType: "client" });
        if (requestId !== state.clientRequestId) return;
        if (!res?.ok) {
          state.clientResultsData = [];
          state.clientError = res?.error || "Recherche impossible.";
          return;
        }
        state.clientResultsData = Array.isArray(res.results) ? res.results : [];
        state.clientError = "";
      } catch (err) {
        if (requestId !== state.clientRequestId) return;
        state.clientResultsData = [];
        state.clientError = "Erreur de recherche.";
      } finally {
        if (requestId !== state.clientRequestId) return;
        state.clientLoading = false;
        renderClientResults();
      }
    };

    const applySelectedClient = (item) => {
      const name = resolveClientName(item);
      if (!name) return;
      const soldValue = item?.client?.soldClient ?? item?.soldClient ?? "";
      state.selectedClient = {
        name,
        identifier: resolveClientIdentifier(item),
        path: item?.path || item?.client?.__path || "",
        soldClient: soldValue
      };
      if (state.clientInput) state.clientInput.value = name;
      state.removedInvoices = new Set();
      state.invoicePage = 1;
      setClientSoldeDisplay(soldValue);
      setPaymentSoldClientVisibility(true);
      initializePaymentSoldeBase();
      hideClientResults();
      loadInvoicesForClient(name);
    };

    const matchesClient = (entryName, clientName) => {
      const entryValue = normalizeText(entryName);
      const targetValue = normalizeText(clientName);
      if (!entryValue || !targetValue) return false;
      return (
        entryValue === targetValue ||
        entryValue.includes(targetValue) ||
        targetValue.includes(entryValue)
      );
    };

    const isUnpaidStatus = (statusValue) => {
      const normalized = String(statusValue || "").trim().toLowerCase();
      return UNPAID_STATUSES.has(normalized);
    };

    const parseMoneyValue = (value, fallback = 0) => {
      const cleaned = String(value ?? "0").replace(",", ".").trim();
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : fallback;
    };

    const getPaymentAmount = () => {
      const raw = state.amountInput?.value ?? "";
      const value = Number(String(raw).replace(",", "."));
      return Number.isFinite(value) ? value : null;
    };
    const getSoldeBaseValue = () => {
      const raw =
        state.clientSoldeValueEl?.dataset?.baseSolde ?? state.selectedClient?.soldClient ?? "";
      const cleaned = String(raw ?? "").replace(",", ".").trim();
      if (!cleaned) return 0;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    };
    const updateClientSoldePreview = () => {
      if (!state.clientSoldeValueEl) return;
      state.baseSoldeReference = parseMoneyValue(
        state.clientSoldeValueEl.dataset?.baseSolde ?? state.clientSoldeValueEl.textContent,
        state.baseSoldeReference
      );
    };

    const initializePaymentSoldeBase = async () => {
      if (!state.clientSoldeValueEl) return;
      state.baseSoldeReference = parseMoneyValue(
        state.clientSoldeValueEl.dataset?.baseSolde ?? state.clientSoldeValueEl.textContent,
        state.baseSoldeReference
      );
      const clientPath = String(state.selectedClient?.path || "").trim();
      if (!clientPath || !w.electronAPI?.openClient) return;
      try {
        const openRes = await w.electronAPI.openClient({ path: clientPath, entityType: "client" });
        if (openRes?.ok && openRes?.client) {
          const soldValue = parseMoneyValue(
            openRes.client.soldClient,
            state.baseSoldeReference
          );
          setClientSoldeDisplay(soldValue);
        }
      } catch {}
    };

    const resolveClientPathForSoldeUpdate = async (lookupName) => {
      let clientPath = String(state.selectedClient?.path || "").trim();
      if (!clientPath && lookupName) {
        if (Array.isArray(state.clientResultsData) && state.clientResultsData.length) {
          const match = findClientMatchInResults(state.clientResultsData, lookupName);
          if (match) {
            clientPath = match?.path || match?.client?.__path || "";
          }
        }
        if (!clientPath && w.electronAPI?.searchClients) {
          const res = await w.electronAPI.searchClients({ query: lookupName, entityType: "client" });
          if (res?.ok) {
            const results = Array.isArray(res.results) ? res.results : [];
            const match = findClientMatchInResults(results, lookupName);
            if (match) {
              clientPath = match?.path || match?.client?.__path || "";
            }
          }
        }
        if (!clientPath) {
          clientPath = await scanClientsForMatch(lookupName);
        }
      }
      return String(clientPath || "").trim();
    };

    const resolveSoldeBaseValue = async (clientPath) => {
      const baseValue = getSoldeBaseValue();
      if (Number.isFinite(baseValue)) return baseValue;
      if (clientPath && w.electronAPI?.openClient) {
        const openRes = await w.electronAPI.openClient({ path: clientPath, entityType: "client" });
        const soldRaw = String(openRes?.client?.soldClient ?? "").replace(",", ".");
        const soldValue = Number(soldRaw);
        if (Number.isFinite(soldValue)) return soldValue;
      }
      return null;
    };

    const refreshClientSoldeDisplay = async (options = {}) => {
      if (!state.clientSoldeValueEl) return;
      const lookupName = String(
        options.clientName || state.selectedClient?.name || state.clientInput?.value || ""
      ).trim();
      let clientPath = String(options.clientPath || state.selectedClient?.path || "").trim();
      let client = options.client && typeof options.client === "object" ? options.client : null;
      const skipFetch = options.skipFetch === true;
      if (!skipFetch) {
        if (!clientPath && lookupName) {
          if (Array.isArray(state.clientResultsData) && state.clientResultsData.length) {
            const match = findClientMatchInResults(state.clientResultsData, lookupName);
            if (match) {
              clientPath = match?.path || match?.client?.__path || "";
              client = client || match?.client || match;
            }
          }
          if (!clientPath && w.electronAPI?.searchClients) {
            const res = await w.electronAPI.searchClients({ query: lookupName, entityType: "client" });
            if (res?.ok) {
              const results = Array.isArray(res.results) ? res.results : [];
              const match = findClientMatchInResults(results, lookupName);
              if (match) {
                clientPath = match?.path || match?.client?.__path || "";
                client = client || match?.client || match;
              }
            }
          }
          if (!clientPath) {
            clientPath = await scanClientsForMatch(lookupName);
          }
        }
        if (clientPath && w.electronAPI?.openClient) {
          const openRes = await w.electronAPI.openClient({ path: clientPath, entityType: "client" });
          if (openRes?.ok && openRes?.client) {
            client = openRes.client;
          }
        }
      }
      if (!client || typeof client !== "object") return;
      const soldRaw = String(client.soldClient ?? "").replace(",", ".");
      const soldValue = Number(soldRaw);
      if (!Number.isFinite(soldValue)) return;
      setClientSoldeDisplay(soldValue);
      setPaymentSoldClientVisibility(true);
      setClientSoldeInlineDisplay(soldValue);
      setClientSoldeByName(soldValue);
      dispatchClientSoldeUpdated(soldValue);
      if (state.selectedClient) {
        if (clientPath) state.selectedClient.path = clientPath;
        state.selectedClient.soldClient = String(soldValue);
      }
    };

    const resolveClientForHistoryEntry = async (entry) => {
      let clientPath = String(entry?.clientPath || "").trim();
      const lookupName = String(entry?.clientName || entry?.clientAccount || "").trim();
      let client = null;
      if (!clientPath && lookupName) {
        if (Array.isArray(state.clientResultsData) && state.clientResultsData.length) {
          const match = findClientMatchInResults(state.clientResultsData, lookupName);
          if (match) {
            clientPath = match?.path || match?.client?.__path || "";
            client = match?.client || match;
          }
        }
      }
      if (!clientPath && lookupName && w.electronAPI?.searchClients) {
        const res = await w.electronAPI.searchClients({ query: lookupName, entityType: "client" });
        if (res?.ok) {
          const results = Array.isArray(res.results) ? res.results : [];
          const match = findClientMatchInResults(results, lookupName);
          if (match) {
            clientPath = match?.path || match?.client?.__path || "";
            client = client || match?.client || match;
          }
        }
      }
      if (!clientPath && lookupName) {
        clientPath = await scanClientsForMatch(lookupName);
      }
      if (clientPath && w.electronAPI?.openClient) {
        const openRes = await w.electronAPI.openClient({ path: clientPath, entityType: "client" });
        if (openRes?.ok && openRes?.client) {
          client = openRes.client;
        }
      }
      return { clientPath: String(clientPath || "").trim(), client };
    };

    const revertPaymentToClientSolde = async (entry, options = {}) => {
      if (!entry || typeof entry !== "object") return null;
      const invoiceNumber = String(entry.invoiceNumber || "").trim();
      const invoicePath = String(entry.invoicePath || "").trim();
      if (invoiceNumber || invoicePath) return null;
      const amountRaw = Number(String(entry?.amount ?? "").replace(",", "."));
      if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
        throw new Error("Montant invalide, suppression annulée.");
      }
      if (!w.electronAPI?.adjustClientSold) {
        throw new Error("Enregistrement indisponible.");
      }
      const { clientPath } = await resolveClientForHistoryEntry(entry);
      if (!clientPath) throw new Error("Client introuvable. Suppression annulée.");
      const suggestedName =
        String(
          entry?.clientName || state.selectedClient?.name || state.clientInput?.value || "client"
        ).trim() || "client";
      const updateRes = await w.electronAPI.adjustClientSold({
        path: clientPath,
        amount: amountRaw,
        precision: 3,
        clamp: true,
        suggestedName,
        entityType: "client",
        ledgerType: "debit",
        ledgerSource: "payment",
        ledgerSourceId: entry?.id || "",
        skipLedger: options.skipLedger === true
      });
      if (!updateRes?.ok) {
        throw new Error(updateRes?.error || "Enregistrement impossible.");
      }
      const targetSoldValueRaw = Number(
        String(updateRes?.soldClient ?? updateRes?.client?.soldClient ?? "").replace(",", ".")
      );
      const targetSoldValue = Number.isFinite(targetSoldValueRaw) ? targetSoldValueRaw : 0;
      if (updateRes?.clamped) {
        console.warn("client solde clamped to zero after payment deletion");
        if (typeof w.showToast === "function") {
          w.showToast("Solde client insuffisant: ajusté à 0.");
        }
      }
      await refreshClientSoldeDisplay({
        clientPath,
        clientName: entry?.clientName || "",
        skipFetch: false
      });
      const selectedPath = String(state.selectedClient?.path || "").trim();
      const selectedName = normalizeText(state.selectedClient?.name || state.clientInput?.value || "");
      const entryName = normalizeText(entry?.clientName || "");
      const shouldUpdateSelected =
        (!!clientPath && !!selectedPath && clientPath === selectedPath) ||
        (!!entryName &&
          !!selectedName &&
          (entryName === selectedName ||
            entryName.includes(selectedName) ||
            selectedName.includes(entryName)));
      if (shouldUpdateSelected) {
        const soldInput = getElSafe("clientSoldClient");
        if (soldInput) soldInput.value = targetSoldValue.toFixed(2);
      }
      return { clientPath, targetSoldValue };
    };

    const restoreDeletedPaymentToSolde = async (entry, options = {}) => {
      const mode = String(entry?.mode || "").trim();
      if (mode !== "sold_client") return null;
      const amount = Number(entry?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      if (!w.electronAPI?.adjustClientSold) {
        throw new Error("Enregistrement indisponible.");
      }
      const { clientPath } = await resolveClientForHistoryEntry(entry);
      if (!clientPath) throw new Error("Client introuvable.");
      const suggestedName =
        String(entry?.clientName || state.selectedClient?.name || state.clientInput?.value || "client").trim() ||
        "client";
      const sourceId =
        String(entry?.invoicePath || entry?.invoiceNumber || entry?.id || "").trim();
      const updateRes = await w.electronAPI.adjustClientSold({
        path: clientPath,
        delta: amount,
        precision: 3,
        clamp: false,
        suggestedName,
        entityType: "client",
        ledgerType: "credit",
        ledgerSource: "invoice",
        ledgerSourceId: sourceId,
        skipLedger: options.skipLedger === true
      });
      if (!updateRes?.ok) {
        throw new Error(updateRes?.error || "Enregistrement impossible.");
      }
      const raw = String(updateRes?.soldClient ?? updateRes?.client?.soldClient ?? "").replace(",", ".");
      const baseValue = Number(raw);
      const targetSoldValue = Number.isFinite(baseValue) ? baseValue : 0;
      const selectedPath = String(state.selectedClient?.path || "").trim();
      const selectedName = normalizeText(state.selectedClient?.name || state.clientInput?.value || "");
      const entryName = normalizeText(entry?.clientName || "");
      const shouldUpdateSelected =
        (!!clientPath && !!selectedPath && clientPath === selectedPath) ||
        (!!entryName &&
          !!selectedName &&
          (entryName === selectedName ||
            entryName.includes(selectedName) ||
            selectedName.includes(entryName)));
      if (shouldUpdateSelected) {
        setClientSoldeDisplay(targetSoldValue);
        setClientSoldeInlineDisplay(targetSoldValue);
        setClientSoldeByName(targetSoldValue);
        dispatchClientSoldeUpdated(targetSoldValue);
        if (state.selectedClient) {
          state.selectedClient.soldClient = String(targetSoldValue);
        }
        updateClientSoldePreview();
      } else if (entry?.clientName) {
        setClientSoldeByName(targetSoldValue);
      }
      return { clientPath, targetSoldValue };
    };

    const normalizeLedgerField = (value) => String(value || "").trim().toLowerCase();

    const normalizeLedgerAmount = (value) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return null;
      return Math.round((num + Number.EPSILON) * 1000) / 1000;
    };

    const amountsMatch = (left, right) =>
      Number.isFinite(left) &&
      Number.isFinite(right) &&
      Math.abs(left - right) <= 0.0005;

    const persistInvoicePaymentLedgerEntry = async ({
      invoice,
      loadedInvoice,
      historyEntry,
      appliedAmount,
      paymentMethod,
      paymentRef,
      paymentDate
    } = {}) => {
      if (isSoldClientPaymentMethod(paymentMethod)) return true;
      if (!w.electronAPI?.addClientLedgerEntry) return true;
      const normalizedAmount = normalizeLedgerAmount(appliedAmount);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return true;
      const historyId = String(historyEntry?.id || "").trim();
      if (!historyId) {
        throw new Error("Identifiant de paiement introuvable.");
      }
      const invoicePath = String(invoice?.path || historyEntry?.invoicePath || "").trim();
      const invoiceNumber = String(
        invoice?.number || historyEntry?.invoiceNumber || loadedInvoice?.name || ""
      ).trim();
      const loadedClient =
        loadedInvoice?.client && typeof loadedInvoice.client === "object" ? loadedInvoice.client : {};
      const lookupName = String(
        invoice?.clientName ||
          historyEntry?.clientName ||
          loadedClient?.name ||
          state.selectedClient?.name ||
          state.clientInput?.value ||
          ""
      ).trim();
      let clientPath = String(
        historyEntry?.clientPath || loadedClient?.__path || state.selectedClient?.path || ""
      ).trim();
      if (!clientPath && lookupName) {
        clientPath = await resolveClientPathForSoldeUpdate(lookupName);
      }
      if (!clientPath) {
        throw new Error("Client introuvable pour le releve.");
      }
      const taxId = String(
        loadedClient?.identifiantFiscal || loadedClient?.vat || loadedClient?.tva || ""
      ).trim();
      const addRes = await w.electronAPI.addClientLedgerEntry({
        path: clientPath,
        taxId,
        effectiveDate: paymentDate,
        type: "credit",
        amount: normalizedAmount,
        source: "payment",
        sourceId: historyId,
        invoicePath,
        invoiceNumber,
        paymentMode: String(paymentMethod || historyEntry?.mode || "").trim(),
        paymentRef: String(paymentRef || historyEntry?.paymentRef || "").trim()
      });
      if (!addRes?.ok) {
        throw new Error(addRes?.error || "Ajout au releve client impossible.");
      }
      try {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
      } catch {}
      return true;
    };

    const resolveLedgerRemovalTargets = (entry) => {
      if (!entry || typeof entry !== "object") return [];
      const paymentId = String(entry.id || "").trim();
      const invoicePath = String(entry.invoicePath || "").trim();
      const invoiceNumber = String(entry.invoiceNumber || "").trim();
      const invoiceSourceId = invoicePath || invoiceNumber;
      const amount = normalizeLedgerAmount(entry.amount);
      const mode = normalizeLedgerField(entry.mode);
      const targets = [];
      if (paymentId) {
        targets.push({
          source: "payment",
          sourceId: paymentId,
          type: "credit",
          amount
        });
      }
      if (mode === "sold_client" && invoiceSourceId) {
        targets.push({
          source: "invoice",
          sourceId: invoiceSourceId,
          type: "debit",
          amount
        });
      }
      // Backward compatibility for legacy rows keyed by invoice path/number.
      if (invoiceSourceId) {
        targets.push({
          source: "invoice_payment",
          sourceId: invoiceSourceId,
          type: "credit",
          amount
        });
      }
      const unique = new Map();
      targets.forEach((target) => {
        const key = [
          normalizeLedgerField(target?.source),
          String(target?.sourceId || "").trim(),
          normalizeLedgerField(target?.type),
          Number.isFinite(target?.amount) ? String(target.amount) : ""
        ].join("|");
        if (!unique.has(key)) unique.set(key, target);
      });
      return Array.from(unique.values());
    };

    const pickLedgerEntryForRemoval = (items, target, entryTimestamp, blockedIds = new Set()) => {
      const normalizedSource = normalizeLedgerField(target?.source);
      const normalizedSourceId = String(target?.sourceId || "").trim();
      const normalizedType = normalizeLedgerField(target?.type);
      const targetAmount = target?.amount;
      let matches = (Array.isArray(items) ? items : []).filter((item) => {
        const entryId = String(item?.id || "").trim();
        if (!entryId || blockedIds.has(entryId)) return false;
        return (
          normalizeLedgerField(item?.source) === normalizedSource &&
          String(item?.sourceId || "").trim() === normalizedSourceId
        );
      });
      if (!matches.length) return null;
      if (normalizedType) {
        const typeMatches = matches.filter(
          (item) => normalizeLedgerField(item?.type) === normalizedType
        );
        if (typeMatches.length) matches = typeMatches;
      }
      if (Number.isFinite(targetAmount)) {
        const amountMatches = matches.filter((item) => {
          const itemAmount = normalizeLedgerAmount(item?.amount);
          return amountsMatch(itemAmount, targetAmount);
        });
        if (amountMatches.length) matches = amountMatches;
      }
      let targetEntry = matches[0] || null;
      if (matches.length > 1 && Number.isFinite(entryTimestamp)) {
        let best = null;
        let bestDiff = Infinity;
        matches.forEach((item) => {
          const itemTimestamp = Date.parse(String(item?.createdAt || ""));
          if (!Number.isFinite(itemTimestamp)) return;
          const diff = Math.abs(itemTimestamp - entryTimestamp);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = item;
          }
        });
        if (best) targetEntry = best;
      }
      return targetEntry;
    };

    const removeLedgerEntryForPayment = async (entry) => {
      if (!w.electronAPI?.readClientLedger || !w.electronAPI?.deleteClientLedgerEntry) {
        return 0;
      }
      const targets = resolveLedgerRemovalTargets(entry);
      if (!targets.length) return 0;
      const clientPath = String(entry?.clientPath || "").trim();
      const ledgerRes = await w.electronAPI.readClientLedger(
        clientPath ? { path: clientPath } : {}
      );
      if (!ledgerRes?.ok) return 0;
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      const removedIds = new Set();
      const entryTimestamp = Date.parse(String(entry?.savedAt || entry?.paymentDate || ""));
      let removed = 0;
      for (const target of targets) {
        const targetEntry = pickLedgerEntryForRemoval(items, target, entryTimestamp, removedIds);
        const entryId = String(targetEntry?.id || "").trim();
        if (!entryId) continue;
        const deleteRes = await w.electronAPI.deleteClientLedgerEntry({ id: entryId });
        if (!deleteRes?.ok) continue;
        removedIds.add(entryId);
        removed += Number(deleteRes.removed) || 1;
      }
      return removed;
    };

    const refreshAfterPaymentDeletion = async (entry) => {
      if (!state.isOpen) return;
      const activeName = String(state.selectedClient?.name || state.clientInput?.value || "").trim();
      const entryName = String(entry?.clientName || entry?.clientAccount || "").trim();
      const lookupName = activeName || entryName;
      if (lookupName) {
        await loadInvoicesForClient(lookupName);
      } else {
        renderInvoiceTable();
      }
      if (lookupName || entry?.clientPath) {
        await refreshClientSoldeDisplay({
          clientPath: entry?.clientPath || state.selectedClient?.path || "",
          clientName: lookupName || entryName,
          skipFetch: false
        });
        updateClientSoldePreview();
      }
    };

    const createPaymentDeletionWarning = (error, fallbackText) => {
      const raw = String(error?.message || error || "").trim();
      const normalized = raw.toLowerCase();
      if (normalized.includes("client introuvable")) {
        return "Paiement supprime, client introuvable: ajustement non applique.";
      }
      if (normalized.includes("facture introuvable")) {
        return "Paiement supprime, facture introuvable: ajustement non applique.";
      }
      return fallbackText || "Paiement supprime, ajustement partiel non applique.";
    };

    const appendDeletionWarning = (warnings, warningText, detail) => {
      const text = String(warningText || "").trim();
      if (!text) return;
      if (!warnings.includes(text)) warnings.push(text);
      if (detail) console.warn(detail);
    };

    const deletePaymentHistoryEntryByKey = async (key, options = {}) => {
      const entryKey = String(key || "").trim();
      if (!entryKey) return { ok: false, error: "Paiement introuvable." };
      if (!w.electronAPI?.readPaymentHistory) {
        return { ok: false, error: "Historique indisponible." };
      }
      const historyRes = await w.electronAPI.readPaymentHistory();
      if (!historyRes?.ok) {
        return { ok: false, error: historyRes?.error || "Historique indisponible." };
      }
      const items = Array.isArray(historyRes.items) ? historyRes.items : [];
      const entry =
        items.find((item) => String(item?.id || "").trim() === entryKey) ||
        items.find((item) => paymentHistoryItemKey(item, "") === entryKey) ||
        null;
      if (!entry) return { ok: false, error: "Paiement introuvable." };
      const next = items.filter((item) => {
        const id = String(item?.id || "").trim();
        const computed = paymentHistoryItemKey(item, "");
        return id !== entryKey && computed !== entryKey;
      });
      const removed = items.length - next.length;
      if (removed <= 0) return { ok: false, error: "Paiement introuvable." };
      const writeRes = await writePaymentHistory(next);
      if (!writeRes?.ok) {
        return { ok: false, error: writeRes?.error || "Suppression impossible." };
      }
      const warnings = [];
      let removedLedger = 0;
      try {
        removedLedger = await removeLedgerEntryForPayment(entry);
      } catch (err) {
        appendDeletionWarning(
          warnings,
          createPaymentDeletionWarning(err, "Paiement supprime, releve client non synchronise."),
          "payment ledger deletion skipped"
        );
      }
      if (options.skipAdjustments !== true) {
        const hasInvoice =
          !!String(entry.invoicePath || "").trim() || !!String(entry.invoiceNumber || "").trim();
        if (hasInvoice) {
          const remainingPayments = resolveInvoiceHistoryEntries(next, entry);
          try {
            await revertPaymentFromInvoice(entry, { remainingPayments });
          } catch (err) {
            appendDeletionWarning(
              warnings,
              createPaymentDeletionWarning(err, "Paiement supprime, facture non synchronisee."),
              "payment invoice revert skipped"
            );
          }
          try {
            await restoreDeletedPaymentToSolde(entry, { skipLedger: true });
          } catch (err) {
            appendDeletionWarning(
              warnings,
              createPaymentDeletionWarning(err, "Paiement supprime, solde client non ajuste."),
              "payment sold_client restore skipped"
            );
          }
        } else {
          try {
            await revertPaymentToClientSolde(entry, { skipLedger: true });
          } catch (err) {
            appendDeletionWarning(
              warnings,
              createPaymentDeletionWarning(err, "Paiement supprime, solde client non ajuste."),
              "payment client sold revert skipped"
            );
          }
        }
      }
      if (options.refreshUi !== false) {
        try {
          await refreshAfterPaymentDeletion(entry);
        } catch (err) {
          appendDeletionWarning(
            warnings,
            createPaymentDeletionWarning(err, "Paiement supprime, rafraichissement partiel."),
            "payment deletion ui refresh partial failure"
          );
        }
        if (state.historyOpen) renderPaymentsHistoryList(state.paymentHistoryList);
      }
      refreshDocHistoryModalIfOpen();
      return { ok: true, removed, entry, removedLedger, warnings };
    };

    w.deletePaymentHistoryEntryByKey = deletePaymentHistoryEntryByKey;

    const applyAmountToClientSolde = async () => {
      const amount = getPaymentAmount();
      if (!Number.isFinite(amount) || amount <= 0) {
        await showPaymentError("Montant invalide.");
        return;
      }
      const inputName = String(
        state.selectedClient?.name || state.clientInput?.value || ""
      ).trim();
      if (!inputName) {
        await showPaymentError("Selectionnez un client en premier.");
        return;
      }
      const amountLabel = formatMoneySafe(amount);
      const confirmed = await confirmAction(
        `Ajouter ${amountLabel} au solde du client ${inputName} ?`
      );
      if (!confirmed) return;
      if (!w.electronAPI?.adjustClientSold) {
        await showPaymentError("Enregistrement indisponible.");
        return;
      }

      const { clientPath, client } = await resolveClientForHistoryEntry({
        clientPath: state.selectedClient?.path || "",
        clientName: inputName,
        clientAccount: state.selectedClient?.identifier || ""
      });
      if (!clientPath) {
        await showPaymentError("Client introuvable.");
        return;
      }
      if (state.selectedClient) {
        state.selectedClient.path = clientPath;
      }

      const resolvedName = String(client?.name || state.selectedClient?.name || inputName).trim();
      const resolvedAccount = String(
        client?.account ||
          state.selectedClient?.identifier ||
          state.selectedClient?.account ||
          state.selectedClient?.accountOf ||
          ""
      ).trim();
      const suggestedName = resolvedName || inputName || "client";
      const historyId = generatePaymentHistoryId("credit");
      const paymentDate = getPaymentDateValue();
      const paymentRef = getPaymentReferenceValue();
      const paymentMode = getPaymentMethodValue() || "sold_client";
      const historyResult = addPaymentHistoryEntry({
        id: historyId,
        invoiceNumber: "",
        invoicePath: "",
        clientName: resolvedName || inputName,
        clientAccount: resolvedAccount,
        clientPath,
        paymentDate,
        paymentRef,
        amount,
        balanceDue: null,
        currency: "",
        mode: paymentMode,
        entryType: "credit"
      });
      if (!historyResult?.entry) {
        await showPaymentError("Enregistrement impossible.");
        return;
      }
      if (historyResult?.writePromise) {
        const writeRes = await historyResult.writePromise;
        if (!writeRes?.ok) {
          await showPaymentError(writeRes?.error || "Enregistrement impossible.");
          return;
        }
      }

      let adjustRes = null;
      try {
        adjustRes = await w.electronAPI.adjustClientSold({
          path: clientPath,
          delta: amount,
          precision: 3,
          clamp: false,
          suggestedName,
          entityType: "client",
          ledgerType: "credit",
          ledgerSource: "payment",
          ledgerSourceId: historyId,
          ledgerEffectiveDate: paymentDate
        });
      } catch (err) {
        removePaymentHistoryEntryByKey(historyId);
        await showPaymentError(err?.message || err || "Enregistrement impossible.");
        return;
      }
      if (!adjustRes?.ok) {
        removePaymentHistoryEntryByKey(historyId);
        await showPaymentError(adjustRes?.error || "Enregistrement impossible.");
        return;
      }
      const adjustedRaw = String(
        adjustRes?.soldClient ?? adjustRes?.client?.soldClient ?? ""
      ).replace(",", ".");
      const adjustedValue = Number(adjustedRaw);
      if (Number.isFinite(adjustedValue)) {
        setClientSoldeDisplay(adjustedValue);
        setClientSoldeInlineDisplay(adjustedValue);
        setClientSoldeByName(adjustedValue);
        dispatchClientSoldeUpdated(adjustedValue);
        if (!state.selectedClient) {
          state.selectedClient = {
            name: resolvedName || inputName,
            identifier: resolvedAccount || "",
            path: clientPath,
            soldClient: String(adjustedValue)
          };
        } else {
          state.selectedClient.soldClient = String(adjustedValue);
          if (resolvedName) state.selectedClient.name = resolvedName;
          if (resolvedAccount) state.selectedClient.identifier = resolvedAccount;
          state.selectedClient.path = clientPath;
        }
        if (resolvedName && state.clientInput) {
          state.clientInput.value = resolvedName;
        }
      }
      if (state.amountInput) {
        state.amountInput.value = "";
        renderInvoiceTable();
        updateClientSoldePreview();
      }
      if (historyResult?.entry && state.historyOpen) {
        state.historyPage = 1;
        renderPaymentsHistoryList(state.paymentHistoryList);
      }
    };

    const formatAmountInputValue = (value) => {
      const raw = String(value ?? "").replace(",", ".").trim();
      if (!raw) return "";
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return raw;
      return parsed.toFixed(3);
    };

    const invoiceKey = (invoice) => `${invoice?.number || ""}__${invoice?.date || ""}`;

    const confirmAction = async (message) => {
      if (typeof w.showConfirm === "function") {
        try {
          const confirmed = await w.showConfirm(message, {
            title: "Paiement",
            okText: "Confirmer",
            cancelText: "Annuler"
          });
          return !!confirmed;
        } catch {}
      }
      return typeof window.confirm === "function" ? window.confirm(message) : false;
    };

    const getPaymentDateValue = () => {
      const raw = state.dateInput?.value ?? "";
      const trimmed = String(raw || "").trim();
      return trimmed || new Date().toISOString().slice(0, 10);
    };

    const getPaymentMethodValue = () => {
      const raw = state.methodSelect?.value ?? "";
      return String(raw || "").trim();
    };

    const getPaymentReferenceValue = () => {
      const raw = state.paymentReferenceInput?.value ?? "";
      return String(raw || "").trim();
    };

    const formatSoldValue = (value) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return "-";
      return num.toFixed(3);
    };

    const setPaymentSoldClientVisibility = (isVisible) => {
      if (!state.overlay) return;
      const field = state.overlay.querySelector('[data-client-field="soldClient"]');
      if (!field) return;
      const shouldShow = !!isVisible;
      field.hidden = !shouldShow;
      if (shouldShow) field.removeAttribute("hidden");
      field.style.display = shouldShow ? "" : "none";
      if (field.classList) field.classList.toggle("is-hidden", !shouldShow);
    };

    const setClientSoldeEmpty = () => {
      if (!state.clientSoldeValueEl) return;
      setPaymentSoldClientVisibility(true);
      state.clientSoldeValueEl.textContent = formatSoldValue(0);
      state.clientSoldeValueEl.dataset.baseSolde = "";
      state.baseSoldeReference = null;
    };

    const setClientSoldeInlineDisplay = (value) => {
      if (!state.overlay) return;
      const formatted = formatSoldValue(value);
      state.overlay
        .querySelectorAll('[data-client-field="soldClient"] .client-search__detail-value')
        .forEach((node) => {
          node.textContent = formatted;
        });
    };

    const dispatchClientSoldeUpdated = (value) => {
      if (typeof window === "undefined") return;
      const clientPath = String(state.selectedClient?.path || "").trim();
      const clientName = String(state.selectedClient?.name || state.clientInput?.value || "").trim();
      if (!clientPath && !clientName) return;
      try {
        window.dispatchEvent(
          new CustomEvent("client-sold-updated", {
            detail: {
              clientPath,
              clientName,
              soldClient: value
            }
          })
        );
      } catch {}
    };

    const setClientSoldeByName = (value) => {
      if (typeof document === "undefined") return;
      const name = String(state.selectedClient?.name || state.clientInput?.value || "").trim();
      if (!name) return;
      const normalizedName = normalizeText(name);
      if (!normalizedName) return;
      const formatted = formatSoldValue(value);
      document.querySelectorAll('[data-client-field="soldClient"]').forEach((node) => {
        const container =
          node.closest(".client-search__details-grid") ||
          node.closest(".client-search__detail") ||
          node.parentElement;
        if (!container) return;
        const nameNode = container.querySelector(
          '[data-client-field="name"] .client-search__detail-value'
        );
        if (!nameNode) return;
        const candidate = normalizeText(nameNode.textContent);
        if (!candidate) return;
        if (
          candidate !== normalizedName &&
          !candidate.includes(normalizedName) &&
          !normalizedName.includes(candidate)
        )
          return;
        const valueNode = node.querySelector(".client-search__detail-value") || node;
        if (valueNode) valueNode.textContent = formatted;
      });
    };

    const setClientSoldeDisplay = (value, options = {}) => {
      if (!state.clientSoldeValueEl) return;
      const storeBase = options.storeBase !== false;
      state.clientSoldeValueEl.textContent = formatSoldValue(value);
      if (storeBase) {
        state.baseSoldeReference = parseMoneyValue(value);
        const cleaned = String(value ?? "").replace(",", ".").trim();
        if (!cleaned) {
          state.clientSoldeValueEl.dataset.baseSolde = "";
          return;
        }
        const num = Number(cleaned);
        const serialized = Number.isFinite(num) ? String(num) : "";
        state.clientSoldeValueEl.dataset.baseSolde = serialized;
      }
    };

    const resolveInvoiceTotals = (invoice) => {
      const total = Number.isFinite(invoice?.total) ? invoice.total : null;
      const paid = Number.isFinite(invoice?.paid) ? invoice.paid : 0;
      let balance =
        Number.isFinite(invoice?.balanceDue)
          ? invoice.balanceDue
          : Number.isFinite(total)
            ? Math.max(0, total - paid)
            : null;
      if (isUnpaidStatus(invoice?.status) && Number.isFinite(total)) {
        const computed = Math.max(0, total - paid);
        if (!Number.isFinite(balance) || balance <= 0) {
          balance = computed;
        }
      }
      return { total, paid, balance };
    };

    const showPaymentError = async (message) => {
      const text = String(message || "Enregistrement impossible.");
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title: "Paiement" });
        return;
      }
      if (typeof window.alert === "function") window.alert(text);
    };

    const applyPaymentToInvoice = async (invoice, amount, options = {}) => {
      const targetAmount = Number(amount);
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
      if (!invoice?.path) throw new Error("Facture introuvable.");
      const invoiceKeyHint =
        String(options?.invoiceKeyHint || "").trim() || invoiceKey(invoice);
      const invoiceNumberForHistory = sanitizeInvoiceNumber(
        String(invoice?.number || "").trim() || extractInvoiceNumberFromInvoiceKey(invoiceKeyHint)
      );

      const { total, paid: previousPaid, balance: previousBalance } = resolveInvoiceTotals(invoice);
      const appliedAmount = Number.isFinite(previousBalance)
        ? Math.min(targetAmount, previousBalance)
        : targetAmount;
      if (appliedAmount <= 0) return null;

      const nextPaid = Math.max(0, previousPaid + appliedAmount);
      const nextBalance = Number.isFinite(total)
        ? Math.max(0, total - nextPaid)
        : Number.isFinite(previousBalance)
          ? Math.max(0, previousBalance - appliedAmount)
          : null;
      const status =
        Number.isFinite(total) && Number.isFinite(nextBalance) && nextBalance <= 0
          ? "payee"
          : nextPaid > 0
            ? "partiellement-payee"
            : "pas-encore-payer";
      const paymentDate = getPaymentDateValue();
      const paymentMethod = getPaymentMethodValue();
      const paymentReference = getPaymentReferenceValue();
      const shouldSkipLedgerJournal = isSoldClientPaymentMethod(paymentMethod);

      if (!w.electronAPI?.openInvoiceJSON || !w.electronAPI?.saveInvoiceJSON) {
        throw new Error("Enregistrement indisponible.");
      }
      const loaded = await w.electronAPI.openInvoiceJSON({ path: invoice.path, docType: "facture" });
      if (!loaded || typeof loaded !== "object") throw new Error("Facture introuvable.");

      const meta = loaded.meta && typeof loaded.meta === "object" ? loaded.meta : (loaded.meta = {});
      const totals =
        loaded.totals && typeof loaded.totals === "object" ? loaded.totals : (loaded.totals = {});
      const totalsAcompte =
        totals.acompte && typeof totals.acompte === "object"
          ? totals.acompte
          : (totals.acompte = {});
      const loadedClient =
        loaded.client && typeof loaded.client === "object" ? loaded.client : {};
      const invoiceClientPath = String(
        loadedClient.__path || state.selectedClient?.path || ""
      ).trim();

      meta.acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : {};
      meta.acompte.enabled = true;
      meta.acompte.paid = nextPaid;
      if (paymentMethod) meta.paymentMethod = paymentMethod;
      meta.paymentDate = paymentDate;

      totalsAcompte.enabled = true;
      totalsAcompte.paid = nextPaid;
      const totalsBase = Number.isFinite(total)
        ? total
        : Number(totals.totalTTC ?? totals.total ?? totals.grand ?? totals.totalHt ?? totals.totalHT ?? NaN);
      if (Number.isFinite(totalsBase)) totalsAcompte.base = totalsBase;
      if (Number.isFinite(nextBalance)) {
        totalsAcompte.remaining = nextBalance;
        totals.balanceDue = nextBalance;
      }

      const saveMeta = {
        silent: true,
        to: "invoices",
        historyPath: invoice.path,
        historyDocType: "facture",
        status,
        forceOverwrite: true
      };
      const saveRes = await w.electronAPI.saveInvoiceJSON({
        data: loaded,
        meta: saveMeta,
        forceOverwrite: true
      });
      if (!saveRes?.ok) {
        throw new Error(saveRes?.error || "Enregistrement impossible.");
      }

      if (typeof w.addDocumentHistory === "function") {
        w.addDocumentHistory({
          docType: "facture",
          path: invoice.path,
          number: invoiceNumberForHistory || invoice.number,
          date: invoice.date,
          name: invoice.name,
          clientName: invoice.clientName,
          clientAccount: invoice.clientAccount,
          totalTTC: total,
          currency: invoice.currency,
          paid: nextPaid,
          balanceDue: nextBalance,
          acompteEnabled: true,
          status,
          paymentMethod,
          paymentRef: paymentReference,
          paymentReference,
          paymentDate
        });
      }
      await w.hydratePaymentHistory({ skipInvoiceSync: true });
      const historyId = generatePaymentHistoryId(invoice.path || invoice.number || "payment");
      const historyResult = addPaymentHistoryEntry({
        id: historyId,
        invoiceKey: invoiceKeyHint,
        invoiceNumber: invoiceNumberForHistory,
        invoicePath: invoice.path,
        clientName: invoice.clientName,
        clientAccount: invoice.clientAccount,
        clientPath: invoiceClientPath,
        paymentDate,
        paymentRef: paymentReference,
        amount: appliedAmount,
        balanceDue: nextBalance,
        currency: invoice.currency,
        mode: paymentMethod,
        entryType: "invoice"
      });
      if (!historyResult?.entry) {
        throw new Error("Enregistrement du paiement impossible.");
      }
      if (historyResult?.writePromise) {
        const writeRes = await historyResult.writePromise;
        if (!writeRes?.ok) {
          throw new Error(writeRes?.error || "Enregistrement du paiement impossible.");
        }
      }
      if (!shouldSkipLedgerJournal) {
        await persistInvoicePaymentLedgerEntry({
          invoice,
          loadedInvoice: loaded,
          historyEntry: historyResult.entry,
          appliedAmount,
          paymentMethod,
          paymentRef: paymentReference,
          paymentDate
        });
      }
      if (historyResult?.entry && state.historyOpen) {
        state.historyPage = 1;
        renderPaymentsHistoryList(state.paymentHistoryList);
      }

      return { nextPaid, nextBalance, status, paymentDate };
    };

    const loadInvoicesForClient = async (clientName) => {
      const requestId = ++state.invoiceRequestId;
      state.invoicesLoading = true;
      state.invoiceError = "";
      state.invoices = [];
      syncPaymentInvoiceYearOptions(state.invoices);
      renderInvoiceTable();
      if (!clientName) {
        state.invoicesLoading = false;
        renderInvoiceTable();
        return;
      }
      try {
        let entries = [];
        if (typeof w.electronAPI?.listInvoiceFiles === "function") {
          const res = await w.electronAPI.listInvoiceFiles({ docType: "facture" });
          entries = Array.isArray(res?.items) ? res.items : [];
        } else if (typeof w.getDocumentHistoryFull === "function") {
          entries = w.getDocumentHistoryFull("facture") || [];
        } else {
          state.invoiceError = "Historique indisponible.";
          return;
        }
        const filtered = entries.filter((entry) => {
          const statusValue =
            entry?.status ?? entry?.historyStatus ?? entry?.meta?.historyStatus ?? "";
          return (
            matchesClient(resolveHistoryClientName(entry), clientName) &&
            (entry?.docType ? String(entry.docType).toLowerCase() === "facture" : true) &&
            isUnpaidStatus(statusValue)
          );
        });
        const mapped = filtered.map((entry) => {
          const statusValue =
            entry?.status ?? entry?.historyStatus ?? entry?.meta?.historyStatus ?? "";
          const total = toNumber(entry?.totalTTC ?? entry?.totalHT ?? entry?.total ?? entry?.totalHt ?? null);
          const currency = String(entry?.currency || "").trim();
          const paid = toNumber(entry?.paid ?? entry?.totals?.paid ?? null);
          const balanceDueRaw = toNumber(entry?.balanceDue ?? entry?.totals?.balanceDue ?? null);
          const balanceDue =
            Number.isFinite(balanceDueRaw) ? balanceDueRaw : Number.isFinite(total) ? Math.max(0, total - (paid || 0)) : null;
          return {
            path: String(entry?.path || "").trim(),
            number: String(entry?.number || entry?.name || "").trim(),
            date: String(entry?.date || "").trim(),
            dueDate: String(entry?.due || entry?.echeance || "").trim(),
            total,
            currency,
            paid,
            balanceDue,
            mode: String(entry?.paymentMethod || entry?.mode || "").trim(),
            status: String(statusValue || "").trim(),
          clientName: resolveHistoryClientName(entry) || "",
            paymentDate: String(entry?.paymentDate || "").trim()
          };
        });
        if (requestId !== state.invoiceRequestId) return;
        state.invoices = mapped;
        syncPaymentInvoiceYearOptions(state.invoices);
      } catch (err) {
        if (requestId !== state.invoiceRequestId) return;
        state.invoiceError = "Chargement impossible.";
      } finally {
        if (requestId !== state.invoiceRequestId) return;
        state.invoicesLoading = false;
        renderInvoiceTable();
      }
    };

    const getVisibleInvoices = () => {
      const selectedYear = normalizeYearValue(state.invoiceFilters?.year) || getCurrentYearValue();
      state.invoiceFilters.year = selectedYear;
      syncPaymentInvoiceYearMenuUi(selectedYear, { updateSelect: true });
      return state.invoices.filter((invoice) => {
        if (state.removedInvoices.has(invoiceKey(invoice))) return false;
        const year = resolvePaymentInvoiceEntryYear(invoice);
        if (!year) return false;
        return year === selectedYear;
      });
    };

    const getInvoiceTotalPages = (totalCount = getVisibleInvoices().length) =>
      totalCount > 0 ? Math.max(1, Math.ceil(totalCount / state.invoicePageSize)) : 0;

    const updateInvoicePager = (totalCount = getVisibleInvoices().length) => {
      const totalPages = getInvoiceTotalPages(totalCount);
      if (totalPages <= 0) {
        if (state.paymentInvoicePage) state.paymentInvoicePage.setAttribute("aria-label", "Page 0 sur 0");
        if (state.paymentInvoiceTotalPages) state.paymentInvoiceTotalPages.textContent = "0";
        if (state.paymentInvoicePageInput) {
          state.paymentInvoicePageInput.value = "0";
          state.paymentInvoicePageInput.max = "0";
          state.paymentInvoicePageInput.setAttribute("aria-valuemax", "0");
          state.paymentInvoicePageInput.setAttribute("aria-valuenow", "0");
        }
        if (state.paymentInvoicePrev) state.paymentInvoicePrev.disabled = true;
        if (state.paymentInvoiceNext) state.paymentInvoiceNext.disabled = true;
        return 0;
      }
      if (state.invoicePage > totalPages) state.invoicePage = totalPages;
      if (state.invoicePage < 1) state.invoicePage = 1;
      if (state.paymentInvoicePage) {
        state.paymentInvoicePage.setAttribute("aria-label", `Page ${state.invoicePage} sur ${totalPages}`);
      }
      if (state.paymentInvoiceTotalPages) state.paymentInvoiceTotalPages.textContent = String(totalPages);
      if (state.paymentInvoicePageInput) {
        state.paymentInvoicePageInput.value = String(state.invoicePage);
        state.paymentInvoicePageInput.max = String(totalPages);
        state.paymentInvoicePageInput.setAttribute("aria-valuemax", String(totalPages));
        state.paymentInvoicePageInput.setAttribute("aria-valuenow", String(state.invoicePage));
      }
      if (state.paymentInvoicePrev) state.paymentInvoicePrev.disabled = state.invoicePage <= 1;
      if (state.paymentInvoiceNext) state.paymentInvoiceNext.disabled = state.invoicePage >= totalPages;
      return totalPages;
    };

    const renderInvoiceTable = () => {
      if (!state.invoicesBody) return;
      state.invoicesBody.innerHTML = "";
      if (state.outstandingEl) state.outstandingEl.textContent = "0";

      if (state.invoicesLoading) {
        const row = document.createElement("tr");
        row.className = "payment-modal__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "Chargement des factures...";
        row.appendChild(cell);
        state.invoicesBody.appendChild(row);
        updateInvoicePager(0);
        return;
      }
      if (!state.selectedClient) {
        setClientSoldeEmpty();
        const row = document.createElement("tr");
        row.className = "payment-modal__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "Selectionnez un client pour voir les factures impayees.";
        row.appendChild(cell);
        state.invoicesBody.appendChild(row);
        updateInvoicePager(0);
        return;
      }
      if (state.invoiceError) {
        const row = document.createElement("tr");
        row.className = "payment-modal__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = state.invoiceError;
        row.appendChild(cell);
        state.invoicesBody.appendChild(row);
        updateInvoicePager(0);
        return;
      }
      const visibleInvoices = getVisibleInvoices();
      if (!visibleInvoices.length) {
        const selectedYear = normalizeYearValue(state.invoiceFilters?.year) || getCurrentYearValue();
        const row = document.createElement("tr");
        row.className = "payment-modal__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = state.invoices.length
          ? `Aucune facture disponible pour l'annee ${selectedYear}.`
          : "Aucune facture disponible pour ce client.";
        row.appendChild(cell);
        state.invoicesBody.appendChild(row);
        updateInvoicePager(0);
        return;
      }

      const totalPages = updateInvoicePager(visibleInvoices.length);
      const startIdx = totalPages > 0 ? (state.invoicePage - 1) * state.invoicePageSize : 0;
      const pageSlice = totalPages > 0
        ? visibleInvoices.slice(startIdx, startIdx + state.invoicePageSize)
        : [];

      let outstandingSum = 0;
      let outstandingCurrency = "";
      visibleInvoices.forEach((invoice) => {
        const { balance } = resolveInvoiceTotals(invoice);
        if (balance !== null) {
          outstandingSum += balance;
          if (!outstandingCurrency && invoice.currency) {
            outstandingCurrency = invoice.currency;
          }
        }
      });
      pageSlice.forEach((invoice) => {
        const row = document.createElement("tr");

        const numberCell = document.createElement("td");
        const numberWrap = document.createElement("div");
        numberWrap.className = "payment-modal__invoice-number";
        const numberText = document.createElement("span");
        numberText.textContent = invoice.number || "-";
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "payment-modal__amount-transfer payment-modal__copy";
        copyBtn.setAttribute("aria-label", "Copier N\u00b0 de facture");
        copyBtn.title = "Copier N\u00b0 de facture";
        copyBtn.dataset.paymentAction = "copy-invoice";
        copyBtn.dataset.paymentInvoiceNumber = invoice.number || "";
        if (!invoice.number) {
          copyBtn.disabled = true;
        }
        copyBtn.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/></svg>';
        numberWrap.append(numberText, copyBtn);
        numberCell.appendChild(numberWrap);

        const dateCell = document.createElement("td");
        dateCell.className = "center";
        dateCell.textContent = invoice.date || "-";

        const dueCell = document.createElement("td");
        dueCell.className = "num";
        dueCell.textContent =
          Number.isFinite(invoice.paid) ? formatMoneySafe(invoice.paid, invoice.currency) : "-";

        const totalCell = document.createElement("td");
        totalCell.className = "num";
        totalCell.textContent =
          invoice.total !== null ? formatMoneySafe(invoice.total, invoice.currency) : "-";

        const paidCell = document.createElement("td");
        const { balance: balanceValue } = resolveInvoiceTotals(invoice);
        if (Number.isFinite(balanceValue)) {
          paidCell.className = "payment-modal__amount-cell";
          const amountValue = document.createElement("span");
          amountValue.className = "num";
          amountValue.textContent = formatMoneySafe(balanceValue, invoice.currency);
          const transferBtn = document.createElement("button");
          transferBtn.type = "button";
          transferBtn.className = "payment-modal__amount-transfer";
          transferBtn.setAttribute("aria-label", "Utiliser ce montant");
          transferBtn.title = "Utiliser ce montant";
          transferBtn.dataset.paymentAction = "fill-amount";
          transferBtn.dataset.paymentInvoiceKey = invoiceKey(invoice);
          transferBtn.dataset.paymentAmount = String(balanceValue);
          transferBtn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h10v10h-2V9.41l-9.29 9.3-1.42-1.42 9.3-9.29H8z"/></svg>';
          paidCell.append(amountValue, transferBtn);
        } else {
          paidCell.className = "num";
          paidCell.textContent = "-";
        }

        const actionCell = document.createElement("td");
        const actionWrap = document.createElement("div");
        actionWrap.className = "payment-modal__actions-cell";
        const payBtn = document.createElement("button");
        payBtn.type = "button";
        payBtn.className = "client-search__add";
        payBtn.textContent = "Payer";
        payBtn.dataset.paymentAction = "pay";
        payBtn.dataset.paymentInvoiceKey = invoiceKey(invoice);
        const payAmount = getPaymentAmount();
        payBtn.disabled = !Number.isFinite(payAmount) || payAmount <= 0;
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "client-search__delete";
        removeBtn.textContent = "Supprimer";
        removeBtn.dataset.paymentAction = "remove";
        removeBtn.dataset.paymentInvoiceKey = invoiceKey(invoice);
        actionWrap.append(payBtn, removeBtn);
        actionCell.append(actionWrap);

        row.append(numberCell, dateCell, dueCell, totalCell, paidCell, actionCell);
        state.invoicesBody.appendChild(row);
      });
      if (state.outstandingEl) {
        state.outstandingEl.textContent = formatMoneySafe(outstandingSum, outstandingCurrency);
      }
    };

    const boot = () => {
      if (state.listenersBound) return;
      ensureBindings();
      if (state.listenersBound) return;
      w.hydratePaymentHistory();
      let attempts = 0;
      const retry = () => {
        if (state.listenersBound) return;
        attempts += 1;
        ensureBindings();
        if (!state.listenersBound && attempts < 10) {
          setTimeout(retry, 200);
        }
      };
      setTimeout(retry, 200);
    };

    boot();

    AppInit.renderPaymentsHistoryList = () => renderPaymentsHistoryList(state.paymentHistoryList);
  };
})(window);

