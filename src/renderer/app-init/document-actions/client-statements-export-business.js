(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const SOLD_FILTER_LABELS = {
    "": "Tous les soldes",
    eq0: "Solde = 0",
    lt0: "Solde < 0",
    gt0: "Solde > 0"
  };

  const normalizeLookup = (value) =>
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

  const maxIsoDate = (a, b) => {
    const left = normalizeIsoDate(a);
    const right = normalizeIsoDate(b);
    if (!left) return right;
    if (!right) return left;
    return left >= right ? left : right;
  };

  const minIsoDate = (a, b) => {
    const left = normalizeIsoDate(a);
    const right = normalizeIsoDate(b);
    if (!left) return right;
    if (!right) return left;
    return left <= right ? left : right;
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

  const parseBalanceValue = (value) => {
    const cleaned = String(value ?? "").replace(",", ".").trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  const formatBalanceValue = (value, precision = 3) => {
    if (!Number.isFinite(value)) return "-";
    const scale = Math.pow(10, precision);
    const rounded = Math.round((value + Number.EPSILON) * scale) / scale;
    return rounded.toFixed(precision);
  };

  const normalizeLedgerDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.includes("T")) return raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return "";
    const date = new Date(parsed);
    if (Number.isNaN(date.getTime())) return "";
    return toIsoDate(date);
  };

  const resolveClientRow = (record) => {
    const client =
      record?.client && typeof record.client === "object" ? record.client : record || {};
    const name = String(record?.name || client.name || "").trim();
    const account = String(
      client.account || client.accountOf || record.account || record.accountOf || ""
    ).trim();
    const identifier = String(
      record?.identifier ||
        client.vat ||
        client.identifiantFiscal ||
        client.cin ||
        client.passport ||
        client.email ||
        client.phone ||
        ""
    ).trim();
    const soldRaw = client.soldClient ?? record.soldClient ?? "";
    const rawFactureCount = record?.factureCount ?? client.factureCount ?? 0;
    const factureCount = Number.isFinite(Number(rawFactureCount))
      ? Number(rawFactureCount)
      : 0;
    const soldValue = parseBalanceValue(soldRaw);
    return {
      id: String(record?.id || client?.id || record?.clientId || "").trim(),
      name: name || "Sans nom",
      account,
      identifier,
      soldValue,
      soldText: soldValue === null ? "-" : formatBalanceValue(soldValue),
      factureCount
    };
  };

  const getSoldFilterLabel = (value) => {
    const key = String(value || "").trim().toLowerCase();
    return SOLD_FILTER_LABELS[key] || SOLD_FILTER_LABELS[""];
  };

  const sanitizeSoldFilter = (value) => {
    const key = String(value || "").trim().toLowerCase();
    if (key === "eq0" || key === "lt0" || key === "gt0") return key;
    return "";
  };

  const normalizeModalFilters = (filters = {}) => ({
    client: String(filters.client || "").trim(),
    sold: sanitizeSoldFilter(filters.sold),
    dateFrom: normalizeDayMonthValue(filters.dateFrom),
    dateTo: normalizeDayMonthValue(filters.dateTo),
    year: normalizeYearValue(filters.year) || getCurrentYearValue()
  });

  const getClientStatementsModalFilters = (
    doc = typeof document !== "undefined" ? document : null
  ) => {
    const getValue = (id) => {
      if (!doc || typeof doc.getElementById !== "function") return "";
      return String(doc.getElementById(id)?.value || "").trim();
    };

    return normalizeModalFilters({
      client: getValue("clientStatementsFilterClient"),
      sold: getValue("clientStatementsFilterSold"),
      dateFrom: getValue("clientStatementsFilterStart"),
      dateTo: getValue("clientStatementsFilterEnd"),
      year: getValue("clientStatementsFilterYear")
    });
  };

  const loadClientRecords = async () => {
    if (!w.electronAPI?.searchClients) {
      throw new Error("Recherche des clients indisponible.");
    }
    const items = [];
    const limit = 200;
    let offset = 0;
    let total = null;
    while (true) {
      const res = await w.electronAPI.searchClients({
        query: "",
        limit,
        offset,
        entityType: "client"
      });
      if (!res?.ok) {
        throw new Error(res?.error || "Chargement des clients impossible.");
      }
      const results = Array.isArray(res.results) ? res.results : [];
      items.push(...results);
      const resTotal = Number(res.total);
      if (Number.isFinite(resTotal)) total = resTotal;
      offset += results.length;
      if (results.length < limit) break;
      if (total !== null && offset >= total) break;
    }
    return items;
  };

  const loadLedgerEntries = async () => {
    if (!w.electronAPI?.readClientLedger) {
      throw new Error("Lecture du grand livre client indisponible.");
    }
    const res = await w.electronAPI.readClientLedger({});
    if (!res?.ok) {
      throw new Error(res?.error || "Chargement du grand livre client impossible.");
    }
    return Array.isArray(res.items) ? res.items : [];
  };

  const buildLedgerTotals = (entries, { dateFrom = "", dateTo = "", year = "" } = {}) => {
    const totals = new Map();
    const normalizedFrom = normalizeIsoDate(dateFrom);
    const normalizedTo = normalizeIsoDate(dateTo);
    const selectedYear = normalizeYearValue(year);
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const clientId = String(entry?.clientId || "").trim();
      if (!clientId) return;
      const entryDate = normalizeLedgerDate(entry?.effectiveDate || entry?.createdAt);
      if (!entryDate) return;
      if (selectedYear && !entryDate.startsWith(`${selectedYear}-`)) return;
      if (normalizedFrom && entryDate < normalizedFrom) return;
      if (normalizedTo && entryDate > normalizedTo) return;
      const amount = Number(entry?.amount);
      if (!Number.isFinite(amount)) return;
      const type = String(entry?.type || "").trim().toLowerCase();
      if (type !== "credit" && type !== "debit") return;
      const bucket = totals.get(clientId) || { debit: 0, credit: 0 };
      if (type === "debit") bucket.debit += amount;
      if (type === "credit") bucket.credit += amount;
      totals.set(clientId, bucket);
    });
    return totals;
  };

  const hasMovement = (totals) => {
    const debit = Number(totals?.debit);
    const credit = Number(totals?.credit);
    return Number.isFinite(debit) && debit > 0 || Number.isFinite(credit) && credit > 0;
  };

  const computeClientSoldValue = (item, ledgerTotals) => {
    const totals = ledgerTotals?.get(item.id);
    if (totals) return Number(totals.credit || 0) - Number(totals.debit || 0);
    return Number(item?.soldValue);
  };

  const matchesModalFilters = (item, ledgerTotals, filters = {}) => {
    const clientQuery = normalizeLookup(filters.client);
    if (clientQuery) {
      const clientText = normalizeLookup(`${item.name} ${item.account} ${item.identifier}`);
      if (!clientText.includes(clientQuery)) return false;
    }

    const soldFilter = sanitizeSoldFilter(filters.sold);
    if (soldFilter) {
      const soldValue = computeClientSoldValue(item, ledgerTotals);
      const epsilon = 0.0005;
      if (!Number.isFinite(soldValue)) return false;
      if (soldFilter === "eq0" && Math.abs(soldValue) > epsilon) return false;
      if (soldFilter === "lt0" && soldValue >= -epsilon) return false;
      if (soldFilter === "gt0" && soldValue <= epsilon) return false;
    }

    const hasTemporalFilter =
      Boolean(normalizeDayMonthValue(filters.dateFrom)) ||
      Boolean(normalizeDayMonthValue(filters.dateTo)) ||
      Boolean(normalizeYearValue(filters.year));
    if (hasTemporalFilter && !hasMovement(ledgerTotals?.get(item.id))) return false;

    return true;
  };

  const resolveDateRange = ({ scope, filters, startDate, endDate }) => {
    const scopeValue = scope === "all-records" ? "all-records" : "modal-filters";
    const normalizedStart = normalizeIsoDate(startDate);
    const normalizedEnd = normalizeIsoDate(endDate);
    let rangeStart = normalizedStart;
    let rangeEnd = normalizedEnd;

    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
      const tmp = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = tmp;
    }

    if (scopeValue === "modal-filters") {
      const modalFrom = composeFilterIsoDate(filters.dateFrom, filters.year);
      const modalTo = composeFilterIsoDate(filters.dateTo, filters.year);
      rangeStart = maxIsoDate(rangeStart, modalFrom);
      rangeEnd = minIsoDate(rangeEnd, modalTo);
    }

    return {
      scope: scopeValue,
      startDate: rangeStart,
      endDate: rangeEnd
    };
  };

  const buildExportDataset = async ({
    modalFilters = null,
    scope = "modal-filters",
    soldFilter = null,
    startDate = "",
    endDate = ""
  } = {}) => {
    const filters = normalizeModalFilters(modalFilters && typeof modalFilters === "object" ? modalFilters : {});
    if (soldFilter !== null && soldFilter !== undefined) {
      filters.sold = sanitizeSoldFilter(soldFilter);
    }
    const range = resolveDateRange({
      scope,
      filters,
      startDate,
      endDate
    });

    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      return {
        rows: [],
        rowCount: 0,
        totalDebit: 0,
        totalCredit: 0,
        totalSold: 0,
        totalDebitLabel: formatBalanceValue(0),
        totalCreditLabel: formatBalanceValue(0),
        totalSoldLabel: formatBalanceValue(0),
        startDate: normalizeIsoDate(startDate),
        endDate: normalizeIsoDate(endDate),
        scope: range.scope,
        filters
      };
    }

    const [clientRecords, ledgerEntries] = await Promise.all([
      loadClientRecords(),
      loadLedgerEntries()
    ]);

    const baseRows = clientRecords
      .map((record) => resolveClientRow(record))
      .filter((row) => row.id && (Number(row.factureCount) || 0) > 0);

    const yearConstraint = range.scope === "modal-filters" ? filters.year : "";
    const totalsByClient = buildLedgerTotals(ledgerEntries, {
      year: yearConstraint,
      dateFrom: range.startDate,
      dateTo: range.endDate
    });

    let selectedRows = baseRows.slice();
    if (range.scope === "modal-filters") {
      selectedRows = selectedRows.filter((item) => matchesModalFilters(item, totalsByClient, filters));
    } else {
      selectedRows = selectedRows.filter((item) => {
        const totals = totalsByClient.get(item.id);
        if (!hasMovement(totals)) return false;
        const sold = computeClientSoldValue(item, totalsByClient);
        const soldMode = sanitizeSoldFilter(filters.sold);
        if (!soldMode) return true;
        if (!Number.isFinite(sold)) return false;
        const epsilon = 0.0005;
        if (soldMode === "eq0") return Math.abs(sold) <= epsilon;
        if (soldMode === "lt0") return sold < -epsilon;
        if (soldMode === "gt0") return sold > epsilon;
        return true;
      });
    }

    selectedRows.sort((a, b) => {
      const nameCompare = String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base"
      });
      if (nameCompare !== 0) return nameCompare;
      return String(a.account || "").localeCompare(String(b.account || ""), undefined, {
        sensitivity: "base"
      });
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const rows = selectedRows.map((item) => {
      const totals = totalsByClient.get(item.id) || { debit: 0, credit: 0 };
      const debit = Number.isFinite(Number(totals.debit)) ? Number(totals.debit) : 0;
      const credit = Number.isFinite(Number(totals.credit)) ? Number(totals.credit) : 0;
      const sold = credit - debit;
      totalDebit += debit;
      totalCredit += credit;
      const clientLabel = item.account ? `${item.name} (${item.account})` : item.name;
      return {
        client: clientLabel,
        totalDebit: debit,
        totalCredit: credit,
        sold,
        totalDebitLabel: formatBalanceValue(debit),
        totalCreditLabel: formatBalanceValue(credit),
        soldLabel: formatBalanceValue(sold)
      };
    });

    const totalSold = totalCredit - totalDebit;
    return {
      rows,
      rowCount: rows.length,
      totalDebit,
      totalCredit,
      totalSold,
      totalDebitLabel: formatBalanceValue(totalDebit),
      totalCreditLabel: formatBalanceValue(totalCredit),
      totalSoldLabel: formatBalanceValue(totalSold),
      startDate: range.startDate || normalizeIsoDate(startDate),
      endDate: range.endDate || normalizeIsoDate(endDate),
      scope: range.scope,
      filters
    };
  };

  AppInit.ClientStatementsExportBusiness = {
    normalizeIsoDate,
    normalizeYearValue,
    normalizeDayMonthValue,
    composeFilterIsoDate,
    getCurrentYearValue,
    getPresetRange,
    getSoldFilterLabel,
    getClientStatementsModalFilters,
    buildExportDataset
  };
})(window);
