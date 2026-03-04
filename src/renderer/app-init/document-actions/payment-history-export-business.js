(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const getCurrentYearValue = () => String(new Date().getFullYear());

  const normalizeYearValue = (value) => {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 9999) return "";
    return String(parsed);
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
    return {
      day: String(day).padStart(2, "0"),
      month: String(month).padStart(2, "0")
    };
  };

  const normalizeDayMonthValue = (value) => {
    const parsed = parseDayMonthParts(value);
    if (!parsed) return "";
    return `${parsed.day}-${parsed.month}`;
  };

  const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeIsoDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split("-");
      return `${year}-${month}-${day}`;
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return "";
    const date = new Date(parsed);
    if (Number.isNaN(date.getTime())) return "";
    return toIsoDate(date);
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
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split("-");
      return `${year}-${month}-${day}`;
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return "";
    const date = new Date(parsed);
    if (Number.isNaN(date.getTime())) return "";
    return toIsoDate(date);
  };

  const toTimestamp = (value) => {
    const parsed = Date.parse(String(value || "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isValidClientLabel = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^facture[-_]/i.test(raw)) return false;
    return true;
  };

  const normalizePaymentModeLabel = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "-";
    if (raw === "cash") return "Especes";
    if (raw === "cash_deposit") return "Versement Especes";
    if (raw === "cheque") return "Cheque";
    if (raw === "bill_of_exchange") return "Effet";
    if (raw === "transfer") return "Virement";
    if (raw === "card") return "Carte bancaire";
    if (raw === "withholding_tax") return "Retenue a la source";
    if (raw === "sold_client") return "Solde client";
    if (raw === "bank") return "Depot bancaire";
    if (raw === "especes") return "Especes";
    if (raw === "versement especes") return "Versement Especes";
    if (raw === "cheque") return "Cheque";
    if (raw === "effet") return "Effet";
    if (raw === "virement") return "Virement";
    if (raw === "carte bancaire") return "Carte bancaire";
    if (raw === "retenue a la source") return "Retenue a la source";
    if (raw === "depot bancaire") return "Depot bancaire";
    return String(value || "").trim() || "-";
  };

  const formatAmountFixed3 = (value, currency = "") => {
    const num = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(num)) return "-";
    const amount = num.toFixed(3);
    return currency ? `${amount} ${currency}` : amount;
  };

  const resolvePaymentHistoryEntryDateIso = (item) =>
    normalizeIsoDateValue(item?.date || item?.paymentDate || item?.savedAt || "");

  const formatPaymentDate = (dateValue, savedAt) => {
    const iso = normalizeIsoDateValue(dateValue || savedAt || "");
    return iso || "N.R.";
  };

  const buildAccountByInvoicePath = (documentEntries) => {
    const map = new Map();
    (Array.isArray(documentEntries) ? documentEntries : []).forEach((entry) => {
      const path = String(entry?.path || "").trim();
      if (!path || map.has(path)) return;
      const account = String(
        entry?.clientAccount || entry?.client?.account || entry?.client?.accountOf || ""
      ).trim();
      if (account) map.set(path, account);
    });
    return map;
  };

  const buildHistoryItems = (paymentEntries, accountByInvoicePath) => {
    const mapped = (Array.isArray(paymentEntries) ? paymentEntries : []).map((entry) => ({
      key: String(entry?.id || "").trim(),
      number: String(entry?.invoiceNumber || "").trim(),
      clientName: isValidClientLabel(entry?.clientName) ? String(entry?.clientName || "").trim() : "",
      clientAccount:
        String(entry?.clientAccount || "").trim() ||
        accountByInvoicePath.get(String(entry?.invoicePath || "").trim()) ||
        "",
      date: String(entry?.paymentDate || entry?.date || "").trim(),
      paymentRef: String(entry?.paymentRef || "").trim(),
      paid: Number(entry?.amount),
      currency: String(entry?.currency || "").trim(),
      mode: String(entry?.mode || "").trim(),
      invoicePath: String(entry?.invoicePath || "").trim(),
      savedAt: String(entry?.savedAt || "").trim(),
      paymentNumber: Number(entry?.paymentNumber)
    }));

    mapped.forEach((item) => {
      item.ts = toTimestamp(item.date || item.savedAt);
      item._stableKey = [
        String(item.ts || 0),
        String(item.invoicePath || ""),
        String(item.number || ""),
        String(item.savedAt || ""),
        String(item.date || "")
      ].join("|");
    });

    const asc = mapped
      .slice()
      .sort((a, b) => (a.ts || 0) - (b.ts || 0) || a._stableKey.localeCompare(b._stableKey));
    asc.forEach((item, idx) => {
      const explicit = Number(item.paymentNumber);
      item.displayNumber = Number.isFinite(explicit) && explicit > 0 ? explicit : idx + 1;
    });

    return asc.sort((a, b) => {
      const aNum = Number.isFinite(a.displayNumber) ? a.displayNumber : 0;
      const bNum = Number.isFinite(b.displayNumber) ? b.displayNumber : 0;
      if (aNum !== bNum) return bNum - aNum;
      return (b.ts || 0) - (a.ts || 0) || a._stableKey.localeCompare(b._stableKey);
    });
  };

  const applyModalFilters = (items, filters = {}) => {
    const selectedYear = normalizeYearValue(filters.year) || getCurrentYearValue();
    const filterPayment = normalizeText(filters.paymentNumber);
    const filterInvoice = normalizeText(filters.invoiceNumber);
    const filterClient = normalizeText(filters.clientQuery);
    const filterDateDayMonth = normalizeDayMonthValue(filters.date);
    const filterDateIso = composeFilterIsoDate(filterDateDayMonth, selectedYear);

    return (Array.isArray(items) ? items : []).filter((item) => {
      if (filterPayment) {
        const numberValue =
          Number.isFinite(item.displayNumber) && item.displayNumber > 0
            ? String(item.displayNumber)
            : "";
        const numberLabel = numberValue ? `pm${numberValue}` : "";
        const matchesPayment =
          normalizeText(numberValue).includes(filterPayment) ||
          normalizeText(numberLabel).includes(filterPayment);
        if (!matchesPayment) return false;
      }

      if (filterInvoice && !normalizeText(item.number).includes(filterInvoice)) return false;

      if (filterClient) {
        const clientValue = normalizeText(item.clientName);
        const accountValue = normalizeText(item.clientAccount);
        if (!clientValue.includes(filterClient) && !accountValue.includes(filterClient)) return false;
      }

      const isoDate = resolvePaymentHistoryEntryDateIso(item);
      if (!isoDate) return false;
      if (!isoDate.startsWith(`${selectedYear}-`)) return false;
      if (filterDateIso && isoDate !== filterDateIso) return false;

      return true;
    });
  };

  const applyDateRange = (items, startDate, endDate) => {
    const start = normalizeIsoDate(startDate);
    const end = normalizeIsoDate(endDate);
    if (!start || !end) return Array.isArray(items) ? items.slice() : [];
    const minDate = start <= end ? start : end;
    const maxDate = start <= end ? end : start;
    return (Array.isArray(items) ? items : []).filter((item) => {
      const iso = resolvePaymentHistoryEntryDateIso(item);
      return !!iso && iso >= minDate && iso <= maxDate;
    });
  };

  const buildRows = (items) => {
    const rows = [];
    let totalAmount = 0;
    const currencies = new Set();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const amount = Number(item.paid);
      if (Number.isFinite(amount)) totalAmount += amount;
      const currency = String(item.currency || "").trim();
      if (currency) currencies.add(currency);

      const clientName = isValidClientLabel(item.clientName) ? String(item.clientName || "").trim() : "";
      const clientAccount = String(item.clientAccount || "").trim();
      const clientValue = clientName || clientAccount || "N.R.";
      const paymentNumberValue =
        Number.isFinite(item.displayNumber) && item.displayNumber > 0 ? `PM${item.displayNumber}` : "-";

      rows.push({
        paymentNumber: paymentNumberValue,
        invoiceNumber: item.number || "-",
        client: clientValue,
        paymentDate: formatPaymentDate(item.date, item.savedAt),
        paymentRef: item.paymentRef || "-",
        paymentMode: normalizePaymentModeLabel(item.mode),
        amount,
        amountLabel: formatAmountFixed3(amount, currency),
        currency
      });
    });

    const currency = currencies.size === 1 ? Array.from(currencies)[0] : "";
    return {
      rows,
      totalAmount,
      currency,
      totalAmountLabel: formatAmountFixed3(totalAmount, currency)
    };
  };

  const getPresetRange = (preset, { referenceYear = "" } = {}) => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const refYear = Number.parseInt(normalizeYearValue(referenceYear), 10);
    const year = Number.isFinite(refYear) ? refYear : nowYear;
    if (preset === "today") {
      const today = toIsoDate(now);
      return { startDate: today, endDate: today };
    }
    if (preset === "this-month") {
      return {
        startDate: toIsoDate(new Date(nowYear, now.getMonth(), 1)),
        endDate: toIsoDate(new Date(nowYear, now.getMonth() + 1, 0))
      };
    }
    if (preset === "last-month") {
      return {
        startDate: toIsoDate(new Date(nowYear, now.getMonth() - 1, 1)),
        endDate: toIsoDate(new Date(nowYear, now.getMonth(), 0))
      };
    }
    if (preset === "this-year") {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`
      };
    }
    if (preset === "last-year") {
      const prevYear = year - 1;
      return {
        startDate: `${prevYear}-01-01`,
        endDate: `${prevYear}-12-31`
      };
    }
    return null;
  };

  const getPaymentHistoryModalFilters = (doc = typeof document !== "undefined" ? document : null) => {
    const getValue = (id) => {
      if (!doc || typeof doc.getElementById !== "function") return "";
      return String(doc.getElementById(id)?.value || "").trim();
    };

    const year = normalizeYearValue(getValue("paymentHistoryFilterYear")) || getCurrentYearValue();
    return {
      paymentNumber: getValue("paymentHistoryFilterNumber"),
      invoiceNumber: getValue("paymentHistoryFilterInvoice"),
      clientQuery: getValue("paymentHistoryFilterClient"),
      date: normalizeDayMonthValue(getValue("paymentHistoryFilterDate")),
      year
    };
  };

  const buildExportDataset = ({
    paymentEntries = [],
    documentEntries = [],
    modalFilters = null,
    scope = "modal-filters",
    startDate = "",
    endDate = ""
  } = {}) => {
    const accountByInvoicePath = buildAccountByInvoicePath(documentEntries);
    const scopeValue = scope === "all-records" ? "all-records" : "modal-filters";
    const filters = modalFilters && typeof modalFilters === "object" ? { ...modalFilters } : {};
    filters.year = normalizeYearValue(filters.year) || getCurrentYearValue();
    filters.date = normalizeDayMonthValue(filters.date);

    let items = buildHistoryItems(paymentEntries, accountByInvoicePath);
    if (scopeValue === "modal-filters") {
      items = applyModalFilters(items, filters);
    }
    items = applyDateRange(items, startDate, endDate);

    const summary = buildRows(items);
    return {
      ...summary,
      items,
      rowCount: summary.rows.length,
      scope: scopeValue,
      startDate: normalizeIsoDate(startDate),
      endDate: normalizeIsoDate(endDate),
      filters
    };
  };

  AppInit.PaymentHistoryExportBusiness = {
    normalizeIsoDate,
    normalizeIsoDateValue,
    normalizeYearValue,
    normalizeDayMonthValue,
    composeFilterIsoDate,
    getCurrentYearValue,
    getPresetRange,
    getPaymentHistoryModalFilters,
    buildExportDataset
  };
})(window);
