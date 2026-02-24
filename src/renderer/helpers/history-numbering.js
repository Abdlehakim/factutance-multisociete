(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  const INVOICE_NUMBER_LENGTHS = [4, 6, 8, 12];
  const NUMBER_YEAR_DEFAULT = "__default";
  const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
  const NUMBER_FORMATS = new Set(["prefix_date_counter", "prefix_counter", "counter"]);
  const DOC_TYPE_PREFIX = {
    facture: "Fact",
    fa: "FA",
    devis: "Dev",
    bl: "BL",
    bc: "BC",
    avoir: "AV",
    be: "BE",
    bs: "BS"
  };

  function normalizeInvoiceNumberLength(value, fallback = 4) {
    const n = Number(value);
    if (INVOICE_NUMBER_LENGTHS.includes(n)) return n;
    return INVOICE_NUMBER_LENGTHS.includes(Number(fallback)) ? Number(fallback) : 4;
  }

  function normalizeNumberFormat(value, fallback = NUMBER_FORMAT_DEFAULT) {
    const raw = String(value || "").trim().toLowerCase();
    if (NUMBER_FORMATS.has(raw)) return raw;
    const fb = String(fallback || "").trim().toLowerCase();
    return NUMBER_FORMATS.has(fb) ? fb : NUMBER_FORMAT_DEFAULT;
  }

  function numberFormatHasPrefix(format) {
    return format !== "counter";
  }

  function numberFormatHasDate(format) {
    return format === "prefix_date_counter";
  }

  function getDocTypePrefix(docType) {
    const normalized = String(docType || "facture").toLowerCase();
    if (DOC_TYPE_PREFIX[normalized]) return DOC_TYPE_PREFIX[normalized];
    const letters = normalized.replace(/[^a-z]/gi, "").slice(0, 3);
    return letters ? letters.toUpperCase() : "DOC";
  }

  function extractNumericSuffix(value) {
    const match = String(value ?? "").match(/(\d+)\s*$/);
    if (!match) return null;
    const num = Number(match[1]);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  function getYearMonthParts(dateLike) {
    const now = new Date();
    const fallbackYear = Number.isFinite(now.getFullYear()) ? String(now.getFullYear()) : "2000";
    const fallbackMonth = Number.isFinite(now.getMonth()) ? String(now.getMonth() + 1).padStart(2, "0") : "01";
    if (!dateLike) {
      return { year: fallbackYear, shortYear: fallbackYear.slice(-2), month: fallbackMonth };
    }
    const str = String(dateLike).trim();
    let year = null;
    let month = null;
    const isoMatch = str.match(/(\d{4})[-\/](\d{1,2})/);
    if (isoMatch) {
      year = isoMatch[1];
      month = isoMatch[2];
    } else {
      const yearMatch = str.match(/(\d{4})/);
      if (yearMatch) year = yearMatch[1];
      const monthMatch = str.match(/(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/);
      if (monthMatch) month = monthMatch[1];
    }
    const parsed = new Date(str);
    if (!year && Number.isFinite(parsed.getTime())) year = String(parsed.getFullYear());
    if (!month && Number.isFinite(parsed.getTime())) month = String(parsed.getMonth() + 1);
    const safeYear =
      Number.isFinite(Number(year)) && Number(year) >= 1900 && Number(year) <= 9999 ? String(Math.trunc(Number(year))) : fallbackYear;
    const safeMonth =
      Number.isFinite(Number(month)) && Number(month) >= 1 && Number(month) <= 12
        ? String(Math.trunc(Number(month))).padStart(2, "0")
        : fallbackMonth;
    return { year: safeYear, shortYear: safeYear.slice(-2), month: safeMonth };
  }

  function formatInvoiceNumber(raw, digits = 4, options = {}) {
    const len = normalizeInvoiceNumberLength(digits, 4);
    const str = String(raw ?? "").trim();
    const meta = options.meta || (w.SEM && w.SEM.state && w.SEM.state.meta) || {};
    const docType = String(options.docType || meta.docType || "facture").toLowerCase();
    const dateValue = options.date || meta.date;
    const numberFormat = normalizeNumberFormat(options.numberFormat || meta.numberFormat, NUMBER_FORMAT_DEFAULT);
    const prefixCandidate =
      options.prefixOverride !== undefined && options.prefixOverride !== null
        ? String(options.prefixOverride || "").trim()
        : String(options.prefix || meta.numberPrefix || "").trim();
    const prefix = numberFormatHasPrefix(numberFormat)
      ? (prefixCandidate || getDocTypePrefix(docType))
      : "";
    const numeric = extractNumericSuffix(str);
    const suffixDigits = String(str.match(/(\d+)\s*$/)?.[1] || "");
    const looksFormatted =
      /^[a-z]+[_-]?\d{2,4}-\d{1,2}-\d+/i.test(str) ||
      /^[a-z]+[_-]?\d+$/i.test(str) ||
      /^\d+$/.test(str);
    if (str && numeric === null && !looksFormatted) return str;
    const trimmed = suffixDigits.length > len ? suffixDigits.slice(-len) : suffixDigits;
    const counter = trimmed || "1";
    if (!numberFormatHasDate(numberFormat)) {
      if (!numberFormatHasPrefix(numberFormat)) return counter;
      return `${prefix}_${counter}`;
    }
    const { shortYear, month } = getYearMonthParts(dateValue);
    return `${prefix}_${shortYear}-${month}-${counter}`;
  }

  // Numbering is intentionally year-agnostic to avoid annual counter resets.
  function normalizeNumberingYear() {
    return NUMBER_YEAR_DEFAULT;
  }

  function makeNumberingStoreKey(docType) {
    const base = String(docType || "facture").toLowerCase();
    return base;
  }

  function extractYearFromDateLike(value) {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;
    const match = str.match(/(\d{4})/);
    if (!match) return null;
    const num = Number(match[1]);
    if (!Number.isFinite(num) || num < 1900 || num > 9999) return null;
    return match[1];
  }

  const HISTORY_KEY = "facturance.history.v1";
  const HISTORY_VISIBLE_LIMIT = 3;
  const HISTORY_STORE_LIMIT = 50;
  const DEFAULT_HISTORY_STATUS = "payee";

  const stripHistoryStatus = (store) => {
    if (!store || typeof store !== "object") return store || {};
    const cleaned = {};
    Object.entries(store).forEach(([key, value]) => {
      if (!Array.isArray(value)) {
        cleaned[key] = value;
        return;
      }
      cleaned[key] = value.map((item) => {
        if (!item || typeof item !== "object") return item;
        const next = { ...item };
        delete next.status;
        delete next.historyStatus;
        return next;
      });
    });
    return cleaned;
  };

  function readHistoryStorage() {
    if (typeof localStorage === "undefined") return {};
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? stripHistoryStatus(parsed) : {};
    } catch {
      return {};
    }
  }

  function writeHistoryStorage(data) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(stripHistoryStatus(data || {})));
    } catch {}
  }

  let documentHistoryStore = readHistoryStorage();

  const numberOrNull = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  function normalizeHistoryStatus(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim().toLowerCase();
    if (!str) return null;
    if (str === "annule") return "brouillon";
    return str;
  }
  function normalizeConvertedFrom(value) {
    if (!value || typeof value !== "object") return null;
    const docType = String(value.docType || value.type || "").trim().toLowerCase();
    const id = String(value.id || value.documentId || value.rowid || "").trim();
    const number = String(value.number || "").trim();
    const path = String(value.path || "").trim();
    const date = String(value.date || "").trim();
    if (!docType && !id && !number && !path && !date) return null;
    const normalized = {};
    if (docType) {
      normalized.docType = docType;
      normalized.type = docType;
    }
    if (id) normalized.id = id;
    if (number) normalized.number = number;
    if (path) normalized.path = path;
    if (date) normalized.date = date;
    return normalized;
  }

  function getDocumentHistory(docType = "facture") {
    const key = String(docType || "facture").toLowerCase();
    const arr = documentHistoryStore[key];
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, HISTORY_VISIBLE_LIMIT).map((item) => ({ ...item }));
  }

  function getDocumentHistoryFull(docType = "facture") {
    const key = String(docType || "facture").toLowerCase();
    const arr = documentHistoryStore[key];
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => ({ ...item }));
  }

  function clearDocumentHistory(docType = "facture") {
    const key = String(docType || "facture").toLowerCase();
    documentHistoryStore[key] = [];
    writeHistoryStorage(documentHistoryStore);
    return [];
  }

  function addDocumentHistory(entry = {}) {
    if (!entry || !entry.path) return getDocumentHistory(entry?.docType);
    const docType = String(entry.docType || "facture").toLowerCase();
    const labelBase = typeof w.docTypeLabel === "function" ? w.docTypeLabel(docType) : "Document";
    const normalizedPdfPath =
      typeof entry.pdfPath === "string" && entry.pdfPath.trim() ? entry.pdfPath.trim() : "";
    const normalizedPdfExportedAt =
      typeof entry.pdfExportedAt === "string" && entry.pdfExportedAt.trim() ? entry.pdfExportedAt.trim() : "";
    const normalized = {
      docType,
      path: String(entry.path),
      number: entry.number !== undefined && entry.number !== null ? String(entry.number) : "",
      date: entry.date ? String(entry.date) : "",
      name: entry.name ? String(entry.name) : "",
      savedAt: entry.savedAt || new Date().toISOString()
    };
    if (entry.id !== undefined && entry.id !== null && String(entry.id).trim()) {
      normalized.id = String(entry.id).trim();
    }
    const numPart = normalized.number ? ` ${normalized.number}` : "";
    const datePart = normalized.date ? ` (${normalized.date})` : "";
    const baseLabel =
      normalized.name && normalized.name !== normalized.number
        ? normalized.name
        : `${labelBase}${numPart}`.trim();
    const computedLabel = entry.label || `${baseLabel}${datePart}`;
    normalized.label = String(computedLabel || baseLabel || labelBase).trim();

    const clientName = entry.clientName ?? entry.client?.name ?? "";
    if (clientName && String(clientName).trim()) normalized.clientName = String(clientName).trim();
    const clientAccount = entry.clientAccount ?? entry.client?.account ?? entry.client?.accountOf ?? "";
    if (clientAccount && String(clientAccount).trim()) {
      normalized.clientAccount = String(clientAccount).trim();
    }
    const totalHT = numberOrNull(entry.totalHT ?? entry.totals?.totalHT);
    if (totalHT !== null) normalized.totalHT = totalHT;
    const totalTTC = numberOrNull(entry.totalTTC ?? entry.totals?.totalTTC ?? entry.total);
    if (totalTTC !== null) normalized.totalTTC = totalTTC;
    const stampTT = numberOrNull(
      entry.stampTT ??
        entry.totals?.extras?.stampTT ??
        entry.totals?.extras?.stampHT ??
        entry.totals?.extras?.stamp
    );
    if (stampTT !== null) normalized.stampTT = stampTT;
    const totalTTCExclStamp = numberOrNull(entry.totalTTCExclStamp ?? entry.totalTTCSansTimbre);
    if (totalTTCExclStamp !== null) {
      normalized.totalTTCExclStamp = totalTTCExclStamp;
    } else if (totalTTC !== null && stampTT !== null) {
      normalized.totalTTCExclStamp = totalTTC - stampTT;
    }
    const currency = entry.currency || entry.totals?.currency || "";
    if (currency && String(currency).trim()) normalized.currency = String(currency).trim();
    const paymentMethod =
      entry.paymentMethod || entry.mode || entry.meta?.paymentMethod || "";
    if (paymentMethod && String(paymentMethod).trim()) {
      normalized.paymentMethod = String(paymentMethod).trim();
    }
    const paymentDate =
      entry.paymentDate || entry.meta?.paymentDate || "";
    if (paymentDate && String(paymentDate).trim()) {
      normalized.paymentDate = String(paymentDate).trim();
    }

    const noteInterneValue =
      typeof entry.noteInterne === "string"
        ? entry.noteInterne
        : (typeof entry.note_interne === "string" ? entry.note_interne : "");
    const existingBucket = Array.isArray(documentHistoryStore[docType]) ? documentHistoryStore[docType] : [];
    const existingMatch = existingBucket.find((item) => item && item.path === normalized.path);
    const createdAtValue = entry?.createdAt;
    const normalizedCreatedAt =
      createdAtValue === undefined || createdAtValue === null ? "" : String(createdAtValue).trim();
    if (normalizedCreatedAt) {
      normalized.createdAt = normalizedCreatedAt;
    } else if (typeof existingMatch?.createdAt === "string" && existingMatch.createdAt.trim()) {
      normalized.createdAt = existingMatch.createdAt.trim();
    } else if (normalized.savedAt) {
      normalized.createdAt = normalized.savedAt;
    }
    if (!normalized.id && existingMatch?.id) {
      const fallbackId = String(existingMatch.id || "").trim();
      if (fallbackId) normalized.id = fallbackId;
    }
    if (!normalized.paymentMethod && existingMatch?.paymentMethod) {
      const fallbackPayment = String(existingMatch.paymentMethod || "").trim();
      if (fallbackPayment) normalized.paymentMethod = fallbackPayment;
    }
    if (!normalized.paymentDate && existingMatch?.paymentDate) {
      const fallbackDate = String(existingMatch.paymentDate || "").trim();
      if (fallbackDate) normalized.paymentDate = fallbackDate;
    }
    const entryAcompte = entry && typeof entry.acompte === "object" ? entry.acompte : null;
    const metaAcompte = entry?.meta && typeof entry.meta === "object" ? entry.meta.acompte : null;
    const totalsAcompte =
      entry?.totals && typeof entry.totals === "object" && typeof entry.totals.acompte === "object"
        ? entry.totals.acompte
        : null;
    const acompteEnabledRaw =
      typeof entry.acompteEnabled === "boolean"
        ? entry.acompteEnabled
        : typeof entryAcompte?.enabled === "boolean"
          ? entryAcompte.enabled
          : typeof metaAcompte?.enabled === "boolean"
            ? metaAcompte.enabled
            : typeof totalsAcompte?.enabled === "boolean"
              ? totalsAcompte.enabled
              : null;
    const paidValue = numberOrNull(entry.paid ?? entryAcompte?.paid ?? metaAcompte?.paid ?? totalsAcompte?.paid);
    const balanceValue = numberOrNull(
      entry.balanceDue ?? entry.totals?.balanceDue ?? totalsAcompte?.remaining
    );
    if (acompteEnabledRaw === true) {
      normalized.acompteEnabled = true;
      const paidResolved = paidValue !== null ? paidValue : 0;
      if (paidResolved !== null) normalized.paid = paidResolved;
      const balanceResolved =
        balanceValue !== null
          ? balanceValue
          : Number.isFinite(totalTTC) && Number.isFinite(paidResolved)
            ? Math.max(0, totalTTC - paidResolved)
            : null;
      if (balanceResolved !== null) normalized.balanceDue = balanceResolved;
    } else if (acompteEnabledRaw === false) {
      normalized.acompteEnabled = false;
    } else {
      if (typeof existingMatch?.acompteEnabled === "boolean") {
        normalized.acompteEnabled = existingMatch.acompteEnabled;
      }
      if (paidValue !== null) {
        normalized.paid = paidValue;
      } else if (Number.isFinite(existingMatch?.paid)) {
        normalized.paid = existingMatch.paid;
      }
      if (balanceValue !== null) {
        normalized.balanceDue = balanceValue;
      } else if (Number.isFinite(existingMatch?.balanceDue)) {
        normalized.balanceDue = existingMatch.balanceDue;
      }
    }
    const reglementObj = entry && typeof entry.reglement === "object" ? entry.reglement : null;
    const metaReglement =
      entry?.meta && typeof entry.meta === "object" ? entry.meta.reglement : null;
    const reglementEnabledRaw =
      typeof entry.reglementEnabled === "boolean"
        ? entry.reglementEnabled
        : typeof reglementObj?.enabled === "boolean"
          ? reglementObj.enabled
          : typeof metaReglement?.enabled === "boolean"
            ? metaReglement.enabled
            : typeof entry?.meta?.reglementEnabled === "boolean"
              ? entry.meta.reglementEnabled
              : null;
    const reglementTextRaw =
      typeof entry.reglementText === "string"
        ? entry.reglementText
        : typeof entry.reglementValue === "string"
          ? entry.reglementValue
          : typeof entry.reglement === "string"
            ? entry.reglement
            : typeof reglementObj?.valueText === "string"
              ? reglementObj.valueText
              : typeof reglementObj?.text === "string"
                ? reglementObj.text
                : typeof metaReglement?.valueText === "string"
                  ? metaReglement.valueText
                  : typeof metaReglement?.text === "string"
                    ? metaReglement.text
                    : typeof entry?.meta?.reglementText === "string"
                      ? entry.meta.reglementText
                      : "";
    const reglementDaysValue = numberOrNull(
      entry.reglementDays ?? reglementObj?.days ?? metaReglement?.days ?? entry?.meta?.reglementDays
    );
    const reglementTypeRaw =
      entry.reglementType ?? reglementObj?.type ?? metaReglement?.type ?? entry?.meta?.reglementType;
    let reglementText = String(reglementTextRaw || "").trim();
    if (!reglementText) {
      if (reglementDaysValue !== null) {
        const daysInt = Math.max(0, Math.trunc(reglementDaysValue));
        reglementText = `${daysInt} jours`;
      } else if (reglementEnabledRaw === true) {
        reglementText = "A r\u00e9ception";
      } else if (String(reglementTypeRaw || "").trim().toLowerCase() === "reception") {
        reglementText = "A r\u00e9ception";
      }
    }
    if (reglementEnabledRaw === true) {
      normalized.reglementEnabled = true;
      normalized.reglementText = reglementText || "A r\u00e9ception";
    } else if (reglementEnabledRaw === false) {
      normalized.reglementEnabled = false;
      normalized.reglementText = "";
    } else {
      if (typeof existingMatch?.reglementEnabled === "boolean") {
        normalized.reglementEnabled = existingMatch.reglementEnabled;
      }
      if (reglementText) {
        normalized.reglementText = reglementText;
      } else if (typeof existingMatch?.reglementText === "string") {
        normalized.reglementText = existingMatch.reglementText;
      }
    }
    if (docType === "facture") {
      const requestedStatus = normalizeHistoryStatus(
        entry.status ?? entry.historyStatus ?? entry.meta?.historyStatus
      );
      const fallbackStatus = normalizeHistoryStatus(existingMatch?.status);
      const appliedStatus = requestedStatus || fallbackStatus || DEFAULT_HISTORY_STATUS;
      if (appliedStatus) normalized.status = appliedStatus;
    }
    if (docType === "facture" && normalizeHistoryStatus(normalized.status) === "payee") {
      const settledTotal =
        Number.isFinite(totalTTC) ? totalTTC : (Number.isFinite(totalHT) ? totalHT : null);
      if (settledTotal !== null) {
        normalized.paid = settledTotal;
        normalized.balanceDue = 0;
      }
    }
    if (noteInterneValue) normalized.note_interne = noteInterneValue;
    const requestedHasComment =
      typeof entry.has_comment === "number"
        ? entry.has_comment === 1
        : (typeof entry.has_comment === "boolean"
          ? entry.has_comment
          : (typeof entry.hasComment === "boolean" ? entry.hasComment : null));
    const computedHasComment =
      requestedHasComment !== null ? requestedHasComment : (noteInterneValue.trim() ? true : null);
    if (computedHasComment !== null) {
      normalized.has_comment = computedHasComment ? 1 : 0;
    } else if (typeof existingMatch?.has_comment === "number") {
      normalized.has_comment = existingMatch.has_comment;
    } else if (typeof existingMatch?.hasComment === "boolean") {
      normalized.has_comment = existingMatch.hasComment ? 1 : 0;
    }
    const convertedFrom = normalizeConvertedFrom(entry.convertedFrom);
    const existingConvertedFrom = normalizeConvertedFrom(existingMatch?.convertedFrom);
    if (convertedFrom) {
      normalized.convertedFrom = convertedFrom;
    } else if (existingConvertedFrom) {
      normalized.convertedFrom = existingConvertedFrom;
    }
    if (normalizedPdfPath) {
      normalized.pdfPath = normalizedPdfPath;
      if (normalizedPdfExportedAt) {
        normalized.pdfExportedAt = normalizedPdfExportedAt;
      } else if (
        existingMatch?.pdfPath === normalizedPdfPath &&
        typeof existingMatch?.pdfExportedAt === "string" &&
        existingMatch.pdfExportedAt.trim()
      ) {
        normalized.pdfExportedAt = existingMatch.pdfExportedAt.trim();
      }
    } else if (existingMatch?.pdfPath) {
      normalized.pdfPath = existingMatch.pdfPath;
      if (typeof existingMatch?.pdfExportedAt === "string" && existingMatch.pdfExportedAt.trim()) {
        normalized.pdfExportedAt = existingMatch.pdfExportedAt.trim();
      }
    }
    const existing = existingBucket.filter((item) => item && item.path !== normalized.path);
    const updated = [normalized, ...existing];
    documentHistoryStore[docType] = updated.slice(0, HISTORY_STORE_LIMIT);
    writeHistoryStorage(documentHistoryStore);
    try {
      window.dispatchEvent(
        new CustomEvent("document-history-updated", { detail: { docType, entry: { ...normalized } } })
      );
    } catch {}
    return getDocumentHistory(docType);
  }

  function removeDocumentHistory(docType = "facture", path) {
    if (!path) return getDocumentHistory(docType);
    const key = String(docType || "facture").toLowerCase();
    const bucket = documentHistoryStore[key];
    if (!Array.isArray(bucket)) return [];
    const filtered = bucket.filter((item) => item && item.path !== path);
    documentHistoryStore[key] = filtered.slice(0, HISTORY_STORE_LIMIT);
    writeHistoryStorage(documentHistoryStore);
    try {
      window.dispatchEvent(new CustomEvent("document-history-updated", { detail: { docType: key, removed: path } }));
    } catch {}
    return getDocumentHistory(key);
  }

  function updateDocumentHistoryComment(docType = "facture", path, note) {
    if (!path) return null;
    const key = String(docType || "facture").toLowerCase();
    const bucket = documentHistoryStore[key];
    if (!Array.isArray(bucket)) return null;
    const normalizedNote =
      typeof note === "string" ? note : (note == null ? "" : String(note));
    const hasComment = normalizedNote.trim() ? 1 : 0;
    const updated = bucket.map((item) => {
      if (!item || item.path !== path) return item;
      return { ...item, note_interne: normalizedNote, has_comment: hasComment };
    });
    documentHistoryStore[key] = updated.slice(0, HISTORY_STORE_LIMIT);
    writeHistoryStorage(documentHistoryStore);
    try {
      const entry = updated.find((item) => item && item.path === path);
      window.dispatchEvent(
        new CustomEvent("document-history-updated", { detail: { docType: key, entry: entry ? { ...entry } : null } })
      );
    } catch {}
    return getDocumentHistory(key);
  }

  function getDocumentHistoryEntry(docType = "facture", path) {
    if (!path) return null;
    const key = String(docType || "facture").toLowerCase();
    const bucket = documentHistoryStore[key];
    if (!Array.isArray(bucket)) return null;
    const match = bucket.find((item) => item && item.path === path);
    return match ? { ...match } : null;
  }

  function setDocumentHistoryPdfPath(docType = "facture", path, pdfPath) {
    if (!path) return getDocumentHistory(docType);
    const key = String(docType || "facture").toLowerCase();
    const normalizedPdfPath = typeof pdfPath === "string" && pdfPath.trim() ? pdfPath.trim() : "";
    const normalizedPdfExportedAt = normalizedPdfPath ? new Date().toISOString() : "";
    if (typeof w.electronAPI?.updateDocumentPdfPath === "function") {
      Promise.resolve(
        w.electronAPI.updateDocumentPdfPath({
          docType: key,
          path,
          pdfPath: normalizedPdfPath,
          pdfExportedAt: normalizedPdfExportedAt
        })
      )
        .then((res) => {
          if (!res?.ok && !res?.missing) {
            console.warn("updateDocumentPdfPath failed", res?.error || res);
          }
        })
        .catch((err) => {
          console.warn("updateDocumentPdfPath failed", err);
        });
    }
    const bucket = documentHistoryStore[key];
    if (!Array.isArray(bucket)) return [];
    let mutated = false;
    let targetEntry = null;
    bucket.forEach((item) => {
      if (item && item.path === path) {
        targetEntry = item;
        if (normalizedPdfPath) {
          if (item.pdfPath !== normalizedPdfPath) {
            item.pdfPath = normalizedPdfPath;
            mutated = true;
          }
          if (item.pdfExportedAt !== normalizedPdfExportedAt) {
            item.pdfExportedAt = normalizedPdfExportedAt;
            mutated = true;
          }
        } else if (item.pdfPath) {
          delete item.pdfPath;
          if ("pdfExportedAt" in item) delete item.pdfExportedAt;
          mutated = true;
        } else if ("pdfExportedAt" in item) {
          delete item.pdfExportedAt;
          mutated = true;
        }
      }
    });
    if (mutated) {
      writeHistoryStorage(documentHistoryStore);
      try {
        window.dispatchEvent(
          new CustomEvent("document-history-updated", {
            detail: { docType: key, entry: targetEntry ? { ...targetEntry } : null }
          })
        );
      } catch {}
    }
    return getDocumentHistory(key);
  }

  function setDocumentHistoryStatus(docType = "facture", path, status) {
    if (!path) return getDocumentHistory(docType);
    const key = String(docType || "facture").toLowerCase();
    if (key !== "facture") return getDocumentHistory(key);
    const bucket = documentHistoryStore[key];
    if (!Array.isArray(bucket)) return [];
    const normalizedStatus = normalizeHistoryStatus(status) || DEFAULT_HISTORY_STATUS;
    let mutated = false;
    let targetEntry = null;
    bucket.forEach((item) => {
      if (item && item.path === path) {
        targetEntry = item;
        if (item.status !== normalizedStatus) {
          item.status = normalizedStatus;
          mutated = true;
        }
      }
    });
    if (mutated) {
      writeHistoryStorage(documentHistoryStore);
      try {
        window.dispatchEvent(
          new CustomEvent("document-history-updated", {
            detail: { docType: key, entry: targetEntry ? { ...targetEntry } : null }
          })
        );
      } catch {}
    }
    return getDocumentHistory(key);
  }

  const NUMBER_KEY = "facturance.numbering.v1";

  function readNumberingStorage() {
    if (typeof localStorage === "undefined") return {};
    try {
      const raw = localStorage.getItem(NUMBER_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeNumberingStorage(data) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(NUMBER_KEY, JSON.stringify(data || {}));
    } catch {}
  }

  let documentNumberingStore = readNumberingStorage();
  let numberingSaveTimer = null;
  let numberingStoreFlattened = false;

  function scheduleNumberingSave() {
    if (typeof localStorage === "undefined") return;
    if (numberingSaveTimer) return;
    numberingSaveTimer = setTimeout(() => {
      numberingSaveTimer = null;
      writeNumberingStorage(documentNumberingStore);
    }, 50);
  }

  function flattenLegacyNumberingStore() {
    if (numberingStoreFlattened) return;
    numberingStoreFlattened = true;
    const merged = {};
    Object.entries(documentNumberingStore || {}).forEach(([key, bucket]) => {
      if (!bucket || typeof bucket !== "object") return;
      const baseKey = String(key || "").split("::")[0]?.toLowerCase() || "facture";
      const targetBucket = merged[baseKey] || (merged[baseKey] = {});
      Object.entries(bucket).forEach(([lenKey, slot]) => {
        const length = normalizeInvoiceNumberLength(lenKey, 4);
        const lenKeyStr = String(length);
        const dest = targetBucket[lenKeyStr] || (targetBucket[lenKeyStr] = {});
        const slotObj = typeof slot === "number" ? { last: slot } : slot;
        const candidates = [];
        const lastNum = Number(slotObj?.last);
        if (Number.isFinite(lastNum) && lastNum > 0) candidates.push(lastNum);
        const pendingNum = Number(slotObj?.pending);
        if (Number.isFinite(pendingNum) && pendingNum > 0) candidates.push(pendingNum);
        const existingNum = Number(dest.last);
        if (Number.isFinite(existingNum) && existingNum > 0) candidates.push(existingNum);
        const best = candidates.length ? Math.max(...candidates) : null;
        dest.last = Number.isFinite(best) && best > 0 ? best : null;
        dest.pending = null;
      });
    });
    documentNumberingStore = merged;
    scheduleNumberingSave();
  }

  function parseDigits(value) {
    return extractNumericSuffix(value);
  }

  function ensureNumberEntry(docType, length) {
    flattenLegacyNumberingStore();
    const lenKey = String(normalizeInvoiceNumberLength(length, 4));
    const key = makeNumberingStoreKey(docType);
    const bucket = documentNumberingStore[key] || (documentNumberingStore[key] = {});
    let entry = bucket[lenKey];
    let mutated = false;
    if (typeof entry === "number") {
      entry = { last: Number.isFinite(entry) && entry > 0 ? entry : null, pending: null };
      bucket[lenKey] = entry;
      mutated = true;
    } else if (!entry || typeof entry !== "object") {
      entry = {};
      bucket[lenKey] = entry;
      mutated = true;
    }
    const lastNum = Number(entry.last);
    const validLast = Number.isFinite(lastNum) && lastNum > 0 ? lastNum : null;
    if (entry.last !== validLast) {
      entry.last = validLast;
      mutated = true;
    }
    const pendingNum = Number(entry.pending);
    const validPending = Number.isFinite(pendingNum) && pendingNum > 0 ? pendingNum : null;
    if (entry.pending !== validPending) {
      entry.pending = validPending;
      mutated = true;
    }
    if (mutated) scheduleNumberingSave();
    return entry;
  }

  function recordNumberUsage(docType, length, numericValue) {
    if (!Number.isFinite(numericValue) || numericValue <= 0) return false;
    const entry = ensureNumberEntry(docType, length);
    if (!Number.isFinite(entry.last) || numericValue > entry.last) entry.last = numericValue;
    if (Number.isFinite(entry.pending) && entry.pending <= numericValue) entry.pending = null;
    scheduleNumberingSave();
    return true;
  }

  function getNextDocumentNumber(docType = "facture", length = 4) {
    const len = normalizeInvoiceNumberLength(length, 4);
    const entry = ensureNumberEntry(docType, len);
    if (Number.isFinite(entry.pending)) {
      return formatInvoiceNumber(entry.pending, len, { docType });
    }
    const base = Number.isFinite(entry.last) ? entry.last : 0;
    const nextNumeric = base + 1;
    entry.pending = nextNumeric;
    scheduleNumberingSave();
    return formatInvoiceNumber(nextNumeric, len, { docType });
  }

  function markDocumentNumberUsed({ docType = "facture", numberLength = 4, number } = {}) {
    const numericValue = parseDigits(number);
    if (numericValue === null) return false;
    return recordNumberUsage(docType, numberLength, numericValue);
  }

  function recomputeDocumentNumbering(docType = "facture") {
    flattenLegacyNumberingStore();
    const key = String(docType || "facture").toLowerCase();
    const entries = Array.isArray(documentHistoryStore[key]) ? documentHistoryStore[key] : [];
    const maximaByYear = {};
    entries.forEach((entry) => {
      if (!entry) return;
      const numericValue = parseDigits(entry.number);
      if (numericValue === null) return;
      const raw = String(entry.number || "");
      const suffixLen = raw.match(/(\d+)\s*$/)?.[1]?.length;
      const length = normalizeInvoiceNumberLength(suffixLen || raw.length || 4, 4);
      const entryYear =
        extractYearFromDateLike(entry.date) || extractYearFromDateLike(entry.savedAt) || NUMBER_YEAR_DEFAULT;
      const yearKey = normalizeNumberingYear(entryYear);
      const bucket = maximaByYear[yearKey] || (maximaByYear[yearKey] = {});
      const current = bucket[length];
      if (!Number.isFinite(current) || numericValue > current) {
        bucket[length] = numericValue;
      }
    });

    const historyYearKeys = new Set(Object.keys(maximaByYear));
    if (historyYearKeys.size === 0) {
      historyYearKeys.add(NUMBER_YEAR_DEFAULT);
    }

    const prefix = `${key}::`;
    Object.keys(documentNumberingStore).forEach((storeKey) => {
      if (storeKey && storeKey.startsWith(prefix)) {
        delete documentNumberingStore[storeKey];
      }
    });

    historyYearKeys.forEach((yearKey) => {
      INVOICE_NUMBER_LENGTHS.forEach((length) => {
        const slot = ensureNumberEntry(docType, length);
        const max = maximaByYear[yearKey]?.[length];
        slot.last = Number.isFinite(max) && max > 0 ? max : null;
        slot.pending = null;
      });
    });

    scheduleNumberingSave();
  }

  w.registerHelpers({
    normalizeInvoiceNumberLength,
    formatInvoiceNumber,
    getDocumentHistory,
    getDocumentHistoryFull,
    getDocumentHistoryEntry,
    addDocumentHistory,
    clearDocumentHistory,
    removeDocumentHistory,
    setDocumentHistoryPdfPath,
    setDocumentHistoryStatus,
    updateDocumentHistoryComment,
    recomputeDocumentNumbering,
    getNextDocumentNumber,
    markDocumentNumberUsed
  });
})(window);
