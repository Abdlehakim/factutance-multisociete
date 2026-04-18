(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const SEM = (w.SEM = w.SEM || {});
  const createDatePicker =
    w.AppDatePicker && typeof w.AppDatePicker.create === "function"
      ? w.AppDatePicker.create.bind(w.AppDatePicker)
      : null;

  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';
  const extractDocNumberFromPath = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    const sqlitePrefix = "sqlite://documents/";
    if (str.startsWith(sqlitePrefix)) {
      return str.slice(sqlitePrefix.length);
    }
    const normalized = str.replace(/\\/g, "/");
    const filename = normalized.split("/").filter(Boolean).pop() || normalized;
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
  };
  const extractYearDigits = (value) => {
    const match = String(value ?? "").match(/(\d{4})/);
    return match ? match[1] : null;
  };
  const normalizeSourceNumbers = (value) => {
    const list = Array.isArray(value) ? value : [];
    const seen = new Set();
    const normalized = [];
    list.forEach((entry) => {
      const raw = String(entry ?? "").trim();
      if (!raw) return;
      const number = extractDocNumberFromPath(raw);
      if (!number || seen.has(number)) return;
      seen.add(number);
      normalized.push(number);
    });
    return normalized;
  };
  const pickFirstTrimmedText = (...values) => {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) return text;
    }
    return "";
  };
  const resolveSourcePayloadMeta = (raw) => {
    const level1 = raw && raw.data && typeof raw.data === "object" ? raw.data : raw;
    const level2 = level1 && level1.data && typeof level1.data === "object" ? level1.data : null;
    const meta =
      level2 && level2.meta && typeof level2.meta === "object"
        ? level2.meta
        : level1 && level1.meta && typeof level1.meta === "object"
          ? level1.meta
          : null;
    return meta && typeof meta === "object" ? meta : {};
  };
  const resolveConvertedSourceSnapshot = (entry, raw, sourceDocType = "devis") => {
    const payloadMeta = resolveSourcePayloadMeta(raw);
    const candidates = [
      entry?.number,
      entry?.invNumber,
      payloadMeta?.number,
      entry?.name,
      entry?.label
    ];
    let number = "";
    for (const value of candidates) {
      const str = String(value ?? "").trim();
      if (!str) continue;
      number = extractDocNumberFromPath(str);
      break;
    }
    if (!number) {
      number = extractDocNumberFromPath(entry?.path);
    }
    const sourceNumbers = normalizeSourceNumbers(
      entry?.sourceNumbers ||
        entry?.sourceDocs ||
        entry?.convertedFrom?.numbers ||
        payloadMeta?.convertedFrom?.numbers
    );
    if (!number && sourceNumbers.length) {
      number = sourceNumbers[0];
    }
    return {
      sourceDocType: String(sourceDocType || "devis").trim().toLowerCase() || "devis",
      sourceDocNumber: number,
      sourceDocDate: pickFirstTrimmedText(entry?.date, payloadMeta?.date),
      sourceDocPath: String(entry?.path || "").trim(),
      sourceNumbers
    };
  };
  const getConvertedFromInfo = (entry, raw, sourceDocType = "devis") => {
    if (!entry) return null;
    const resolvedSource = resolveConvertedSourceSnapshot(entry, raw, sourceDocType);
    const normalizedDocType = resolvedSource.sourceDocType;
    const convertedFrom = { docType: normalizedDocType, type: normalizedDocType };
    const payloadMeta = resolveSourcePayloadMeta(raw);
    const sourceId = String(entry.id || raw?.id || payloadMeta?.id || "").trim();
    if (sourceId) convertedFrom.id = sourceId;
    if (resolvedSource.sourceDocNumber) convertedFrom.number = resolvedSource.sourceDocNumber;
    if (resolvedSource.sourceNumbers.length) convertedFrom.numbers = resolvedSource.sourceNumbers;
    if (resolvedSource.sourceDocPath) convertedFrom.path = resolvedSource.sourceDocPath;
    if (resolvedSource.sourceDocDate) convertedFrom.date = resolvedSource.sourceDocDate;
    return convertedFrom;
  };
  const normalizeConvertedFrom = (value) => {
    if (!value || typeof value !== "object") return null;
    const docType = String(value.docType || value.type || "").trim().toLowerCase();
    const id = String(value.id || value.documentId || value.rowid || "").trim();
    let number = String(value.number || "").trim();
    const numbers = normalizeSourceNumbers(value.numbers || value.sourceNumbers);
    if (!number && numbers.length) number = numbers[0];
    const path = String(value.path || "").trim();
    const date = String(value.date || "").trim();
    if (!docType && !id && !number && !path && !date && !numbers.length) return null;
    const normalized = {};
    if (docType) {
      normalized.docType = docType;
      normalized.type = docType;
    }
    if (id) normalized.id = id;
    if (number) normalized.number = number;
    if (numbers.length) normalized.numbers = numbers;
    if (path) normalized.path = path;
    if (date) normalized.date = date;
    return normalized;
  };
  const captureHistorySummary = () => {
    try {
      const st = w.SEM?.state || {};
      const clientName = String(st.client?.name || "").trim();
      const clientAccount = String(st.client?.account || st.client?.accountOf || "").trim();
      const clientCode = String(
        st.client?.codeClient ||
          st.client?.code_client ||
          st.client?.clientCode ||
          st.client?.codeFournisseur ||
          st.client?.code_fournisseur ||
          st.client?.codeTransporteur ||
          st.client?.code_transporteur ||
          st.client?.code ||
          ""
      ).trim();
      const totalsFn = w.SEM?.computeTotalsReturn;
      const totals = typeof totalsFn === "function" ? totalsFn() : null;
      const totalHT = totals?.totalHT;
      const totalTTC = totals?.totalTTC ?? totals?.grand;
      const currency = totals?.currency || st.meta?.currency || "";
      const resolveReglementInfo = () => {
        if (typeof document === "undefined") return { enabled: false, valueText: "" };
        const enabled = !!document.getElementById("reglementEnabled")?.checked;
        const daysSelected = !!document.getElementById("reglementTypeDays")?.checked;
        let valueText = "A r\u00e9ception";
        if (daysSelected) {
          const daysInput = document.getElementById("reglementDays");
          const raw = String(daysInput?.value ?? "").trim();
          let days = raw ? Number(raw) : Number(daysInput?.getAttribute("value") || 30);
          if (!Number.isFinite(days)) days = 30;
          valueText = `${days} jours`;
        }
        return { enabled, valueText };
      };
      const reglementInfo = resolveReglementInfo();
      const acompteEnabled =
        totals && totals.acompte && typeof totals.acompte.enabled === "boolean"
          ? totals.acompte.enabled
          : undefined;
      const paid = totals?.acompte?.paid;
      const balanceDue = totals?.balanceDue ?? totals?.acompte?.remaining;
      return {
        clientName,
        clientAccount,
        clientCode,
        totalHT,
        totalTTC,
        currency,
        paid,
        balanceDue,
        acompteEnabled,
        reglementEnabled: reglementInfo.enabled,
        reglementText: reglementInfo.enabled ? reglementInfo.valueText : ""
      };
    } catch {
      return {};
    }
  };
  const PAYMENT_METHOD_OPTIONS = [
   { value: "cash", label: "Esp\u00E8ces" },
  { value: "cash_deposit", label: "Versement Esp\u00E8ces" },
  { value: "cheque", label: "Ch\u00E8que" },
  { value: "bill_of_exchange", label: "Effet" },
  { value: "transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "withholding_tax", label: "Retenue \u00E0 la source" }
  ];
  const FACTURE_STATUS_OPTIONS = [
    { value: "payee", label: "Pay\u00E9e" },
    { value: "partiellement-payee", label: "Partiellement pay\u00E9es" },
    { value: "pas-encore-payer", label: "Impay\u00E9e" },
    { value: "brouillon", label: "Brouillon" }
  ];
  const NO_PAYMENT_METHOD_LABEL = "N.R";
  const UNPAID_STATUS_VALUES = new Set(["pas-encore-payer", "impayee", "impaye"]);
  const NO_PAYMENT_METHOD_STATUS_VALUES = new Set([
    "pas-encore-payer",
    "impayee",
    "impaye",
    "brouillon",
    "avoir"
  ]);
  const AVOIR_DOC_TYPE = "avoir";
  const AVOIR_NUMBER_PREFIX = "AV";
  const AVOIR_NUMBER_FORMAT = "prefix_date_counter";
  const normalizeFactureStatusValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "annule") return "brouillon";
    return normalized;
  };
  const isNoPaymentMethodStatus = (value) =>
    NO_PAYMENT_METHOD_STATUS_VALUES.has(normalizeFactureStatusValue(value));
  const isUnpaidStatus = (value) =>
    UNPAID_STATUS_VALUES.has(normalizeFactureStatusValue(value));
  const normalizeLedgerAmount = (value) => {
    const num = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(num)) return null;
    return Math.round((num + Number.EPSILON) * 1000) / 1000;
  };
  const MANUAL_NUMBER_DOC_TYPES = new Set(["fa"]);
  const isManualNumberDocType = (value) =>
    MANUAL_NUMBER_DOC_TYPES.has(String(value || "").trim().toLowerCase());
  const normalizeBeReceptionText = (value = "") =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  const normalizeBeReceptionDepotId = (value = "") =>
    String(value || "")
      .trim()
      .replace(/^sqlite:\/\/depots\//i, "");
  const normalizeBeReceptionLocationId = (value = "") =>
    String(value || "")
      .trim()
      .replace(/^sqlite:\/\/emplacements\//i, "");
  const normalizeBeReceptionDestinationIds = (value = []) => {
    const source = Array.isArray(value) ? value : [value];
    const seen = new Set();
    return source
      .map((entry) => normalizeBeReceptionLocationId(entry))
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const normalizeBeReceptionDestinationLabels = (value = []) => {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [value];
    return source.map((entry) => normalizeBeReceptionText(entry)).filter(Boolean);
  };
  const formatBeReceptionDestinationText = (labels = []) =>
    normalizeBeReceptionDestinationLabels(labels).join(", ");
  const formatBeReceptionTime = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    return `${String(safeDate.getHours()).padStart(2, "0")}:${String(
      safeDate.getMinutes()
    ).padStart(2, "0")}`;
  };
  const isValidBeReceptionDate = (value) => {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const parsed = new Date(`${text}T00:00:00`);
    return Number.isFinite(parsed.getTime());
  };
  const isValidBeReceptionTime = (value) =>
    /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value || "").trim());
  const normalizeBeReceptionSourceDocType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const aliases = {
      fa: "fa",
      factureachat: "fa",
      "facture d'achat": "fa",
      "facture_achat": "fa",
      "facture-achat": "fa",
      bc: "bc",
      bondecommande: "bc",
      "bon de commande": "bc",
      "bon_de_commande": "bc",
      "bon-de-commande": "bc"
    };
    return aliases[raw] || "";
  };
  const getBeReceptionSourceDocTypeLabel = (value) => {
    const normalized = normalizeBeReceptionSourceDocType(value);
    if (normalized === "fa") return "Facture d'achat";
    if (normalized === "bc") return "Bon de commande";
    return "Document";
  };
  const normalizeBeReceptionSourceSelection = (value) => {
    const raw = value && typeof value === "object" ? value : {};
    const rawSupplier = raw.supplier && typeof raw.supplier === "object" ? raw.supplier : {};
    const rawItems = Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.documents)
        ? raw.documents
        : [];
    const normalizedItems = rawItems
      .map((entry, index) => {
        const item = entry && typeof entry === "object" ? entry : {};
        const id = String(item.id || "").trim();
        const path = String(item.path || "").trim();
        const number = String(item.number || "").trim();
        const date = String(item.date || "").trim();
        const displayName =
          String(item.displayName || item.name || number || "").trim() || `Document ${index + 1}`;
        const docType = normalizeBeReceptionSourceDocType(
          item.docType || item.type || raw.docType || raw.type || ""
        );
        const key =
          String(item.key || "").trim() ||
          (id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:${index}` : `idx:${index}`);
        if (!id && !path && !number && !displayName) return null;
        return {
          key,
          id,
          path,
          number,
          date,
          displayName,
          docType,
          clientName: String(item.clientName || "").trim(),
          clientPath: String(item.clientPath || "").trim()
        };
      })
      .filter(Boolean);
    const docType = normalizeBeReceptionSourceDocType(
      raw.docType || raw.type || normalizedItems[0]?.docType || ""
    );
    if (!normalizedItems.length || !docType) return null;
    const supplierPath = String(rawSupplier.path || normalizedItems[0]?.clientPath || "").trim();
    const supplierName = String(rawSupplier.name || normalizedItems[0]?.clientName || "").trim();
    const supplierLabel = String(rawSupplier.label || supplierName || "").trim();
    const supplierIdentifier = String(rawSupplier.identifier || "").trim();
    return {
      docType,
      supplier:
        supplierPath || supplierName || supplierLabel || supplierIdentifier
          ? {
              path: supplierPath,
              name: supplierName,
              label: supplierLabel || supplierName,
              identifier: supplierIdentifier
            }
          : null,
      items: normalizedItems.map((item) => ({
        ...item,
        docType: item.docType || docType
      }))
    };
  };
  const normalizeBeReceptionImportedSourceKeys = (value = [], fallbackSelection = null) => {
    const fallbackItems = normalizeBeReceptionSourceSelection(fallbackSelection)?.items || [];
    const hasExplicitValue =
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && !String(value).trim());
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];
    const seen = new Set();
    return [...source, ...(!hasExplicitValue ? fallbackItems.map((entry) => entry?.key || "") : [])]
      .map((entry) => String(entry || "").trim())
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const formatBeReceptionSourceSelectionText = (selection) => {
    const normalized = normalizeBeReceptionSourceSelection(selection);
    if (!normalized) return "";
    const label = getBeReceptionSourceDocTypeLabel(normalized.docType);
    const refs = normalized.items
      .map((item) => String(item.number || item.displayName || "").trim())
      .filter(Boolean);
    return refs.length ? `${label} : ${refs.join(", ")}` : label;
  };
  const buildBeReceptionSourceSelectionFromEntry = (entry, sourceDocType = "") => {
    const docType = normalizeBeReceptionSourceDocType(sourceDocType || entry?.docType || "");
    if (!docType) return null;
    const id = String(entry?.id || "").trim();
    const path = String(entry?.path || "").trim();
    const number = String(entry?.number || entry?.invNumber || entry?.name || "").trim();
    const date = String(entry?.date || "").trim();
    const displayName = String(entry?.name || number || "").trim() || number || "Document 1";
    const key = id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:0` : "idx:0";
    return normalizeBeReceptionSourceSelection({
      docType,
      supplier:
        entry?.clientName || entry?.clientPath || entry?.clientAccount
          ? {
              path: String(entry?.clientPath || "").trim(),
              name: String(entry?.clientName || "").trim(),
              label: String(entry?.clientName || "").trim(),
              identifier: String(entry?.clientAccount || "").trim()
            }
          : null,
      items: [
        {
          key,
          id,
          path,
          number,
          date,
          displayName,
          docType,
          clientName: String(entry?.clientName || "").trim(),
          clientPath: String(entry?.clientPath || "").trim()
        }
      ]
    });
  };
  const normalizeBeReceptionChoice = (value = {}, { meta = {}, fallbackDate = "" } = {}) => {
    const raw = value && typeof value === "object" ? value : {};
    const sourceSelection = normalizeBeReceptionSourceSelection(
      raw.sourceSelection ?? raw.sourceDocuments ?? raw.sourceDocs ?? meta.beSourceSelection ?? null
    );
    const destinationIds = normalizeBeReceptionDestinationIds(
      raw.destinationIds ??
        raw.destinationIdList ??
        raw.destinationSelection?.ids ??
        raw.destinationSelection ??
        raw.destinationId ??
        raw.destinationLocationId ??
        raw.locationId ??
        raw.emplacementId ??
        raw.emplacement_id ??
        meta.beReceptionDestinationIds ??
        meta.beReceptionDestinationId ??
        []
    );
    const destinationLabels = normalizeBeReceptionDestinationLabels(
      raw.destinationLabels ?? raw.destinationLabelList ?? raw.destinationSelection?.labels ?? []
    );
    const normalized = {
      depot: normalizeBeReceptionText(raw.depot ?? raw.depotName ?? meta.beReceptionDepot ?? meta.beDepot ?? ""),
      depotId: normalizeBeReceptionDepotId(
        raw.depotId ?? raw.depotDbId ?? raw.magasinId ?? raw.magasin_id ?? meta.beReceptionDepotId ?? ""
      ),
      destination: normalizeBeReceptionText(
        raw.destination ??
          raw.destinationLocation ??
          raw.location ??
          meta.beReceptionDestination ??
          meta.beDestination ??
          ""
      ),
      destinationId: normalizeBeReceptionLocationId(
        destinationIds[0] ??
          raw.destinationId ??
          raw.destinationLocationId ??
          raw.locationId ??
          raw.emplacementId ??
          raw.emplacement_id ??
          meta.beReceptionDestinationId ??
          ""
      ),
      destinationIds,
      destinationLabels,
      date: String(raw.date ?? raw.receptionDate ?? meta.beReceptionDate ?? fallbackDate ?? "").trim(),
      time: String(raw.time ?? raw.receptionTime ?? meta.beReceptionTime ?? "").trim(),
      sourceRef: normalizeBeReceptionText(raw.sourceRef ?? raw.referenceSource ?? raw.source ?? meta.beSourceRef ?? ""),
      sourceSelection,
      importedSourceKeys: normalizeBeReceptionImportedSourceKeys(
        raw.importedSourceKeys ?? raw.sourceImportedKeys ?? raw.importedSources ?? meta.beSourceImportedKeys,
        sourceSelection
      )
    };
    if (!normalized.sourceRef && sourceSelection) {
      normalized.sourceRef = formatBeReceptionSourceSelectionText(sourceSelection);
    }
    if (normalized.destinationLabels.length && !normalized.destination) {
      normalized.destination = formatBeReceptionDestinationText(normalized.destinationLabels);
    }
    if (normalized.destination && !normalized.destinationLabels.length) {
      normalized.destinationLabels = normalizeBeReceptionDestinationLabels(normalized.destination);
    }
    if (!normalized.date) normalized.date = String(fallbackDate || meta.date || "").trim();
    if (!normalized.time) normalized.time = formatBeReceptionTime();
    return normalized;
  };
  const createDefaultBeReceptionChoice = ({ entry, sourceDocType, date }) => {
    const sourceSelection = buildBeReceptionSourceSelectionFromEntry(entry, sourceDocType);
    return normalizeBeReceptionChoice(
      {
        date,
        time: formatBeReceptionTime(),
        sourceSelection,
        sourceRef: sourceSelection ? formatBeReceptionSourceSelectionText(sourceSelection) : ""
      },
      { fallbackDate: date }
    );
  };
  const validateBeReceptionChoice = (value = {}, options = {}) => {
    const reception = normalizeBeReceptionChoice(value, {
      meta: options?.meta || {},
      fallbackDate: options?.fallbackDate || ""
    });
    const requireStorageFields = options?.requireStorageFields !== false;
    if (requireStorageFields) {
      if (!reception.depotId) {
        return { ok: false, error: "Selectionnez un depot / magasin." };
      }
      if (!reception.destinationIds.length) {
        return { ok: false, error: "Selectionnez un emplacement de destination." };
      }
    }
    if (!isValidBeReceptionDate(reception.date)) {
      return { ok: false, error: "Renseignez une date de reception valide." };
    }
    if (!isValidBeReceptionTime(reception.time)) {
      return { ok: false, error: "Renseignez une heure de reception valide au format HH:MM." };
    }
    if (!reception.sourceRef) {
      return { ok: false, error: "Renseignez la reference source." };
    }
    return { ok: true, value: reception };
  };
  const shouldRequireBeReceptionStorageFields = (sourceDocType, targetDocType) => {
    const target = String(targetDocType || "").trim().toLowerCase();
    return target === "be";
  };
  const applyBeReceptionChoiceToMeta = (metaInput, value, { fallbackDate = "" } = {}) => {
    const meta = metaInput && typeof metaInput === "object" ? metaInput : {};
    const reception = normalizeBeReceptionChoice(value, { meta, fallbackDate });
    meta.beReception = reception;
    meta.beReceptionDepot = reception.depot;
    meta.beReceptionDepotId = reception.depotId;
    meta.beReceptionDestination = reception.destination;
    meta.beReceptionDestinationId = reception.destinationId;
    meta.beReceptionDestinationIds = reception.destinationIds.slice();
    meta.beReceptionDestinationLabels = reception.destinationLabels.slice();
    meta.beReceptionDate = reception.date;
    meta.beReceptionTime = reception.time;
    meta.beSourceRef = reception.sourceRef;
    meta.beSourceSelection = reception.sourceSelection;
    meta.beSourceImportedKeys = reception.importedSourceKeys.slice();
    return reception;
  };
  const clearCrossTypeNumberingMetadata = (metaInput, sourceDocType, targetDocType) => {
    const meta = metaInput && typeof metaInput === "object" ? metaInput : null;
    const source = String(sourceDocType || "").trim().toLowerCase();
    const target = String(targetDocType || "").trim().toLowerCase();
    if (!meta || !source || !target || source === target) return;
    [
      "number",
      "previewNumber",
      "numberYear",
      "numberPrefix",
      "numberFormat",
      "requestedNumber",
      "documentNumber",
      "invoiceNumber",
      "documentModelName",
      "docDialogModelName",
      "modelName",
      "modelKey"
    ].forEach((key) => {
      if (key in meta) delete meta[key];
    });
  };
  const clearCrossTypeNumberingControls = (sourceDocType, targetDocType) => {
    const source = String(sourceDocType || "").trim().toLowerCase();
    const target = String(targetDocType || "").trim().toLowerCase();
    if (!source || !target || source === target) return;
    ["invNumber", "invNumberSuffix", "invNumberDatePart", "invNumberPrefix"].forEach((id) => {
      const input = getEl(id);
      if (input) input.value = "";
    });
  };
  const normalizeBeReceptionDepotRecord = (record = {}, indexHint = -1) => {
    const source = record && typeof record === "object" ? record : {};
    const id = normalizeBeReceptionDepotId(
      source.id || source.value || source.depotId || source.path?.replace?.(/^sqlite:\/\/depots\//i, "") || ""
    );
    const fallbackNumber = Number.isFinite(indexHint) && indexHint >= 0 ? indexHint + 1 : null;
    const fallbackName = Number.isFinite(fallbackNumber) ? `Depot ${fallbackNumber}` : "Depot";
    const name = normalizeBeReceptionText(source.name || source.label || source.title || fallbackName);
    if (!id) return null;
    return {
      id,
      name: name || fallbackName,
      emplacements: Array.isArray(source.emplacements) ? source.emplacements : []
    };
  };
  const normalizeBeReceptionDepotRecords = (records = []) => {
    const seen = new Set();
    return (Array.isArray(records) ? records : [])
      .map((entry, index) => normalizeBeReceptionDepotRecord(entry, index))
      .filter((entry) => {
        if (!entry?.id) return false;
        const key = entry.id.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const normalizeBeReceptionLocationRecord = (entry = {}, depotIdHint = "") => {
    const source = entry && typeof entry === "object" ? entry : { code: entry };
    const id = normalizeBeReceptionLocationId(
      source.id ||
        source.value ||
        source.emplacementId ||
        source.emplacement_id ||
        source.path?.replace?.(/^sqlite:\/\/emplacements\//i, "") ||
        ""
    );
    const code = normalizeBeReceptionText(source.code || source.name || source.label || source.value || "");
    const depotId = normalizeBeReceptionDepotId(source.depotId || source.depot_id || depotIdHint || "");
    if (!id && !code) return null;
    return { id: id || code, code: code || id, depotId };
  };
  const normalizeBeReceptionLocationRecords = (records = [], depotIdHint = "") => {
    const seen = new Set();
    return (Array.isArray(records) ? records : [])
      .map((entry) => normalizeBeReceptionLocationRecord(entry, depotIdHint))
      .filter((entry) => {
        if (!entry?.id) return false;
        const key = entry.id.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const fetchBeReceptionDepotRecords = async ({ refresh = false } = {}) => {
    let records = normalizeBeReceptionDepotRecords(
      SEM?.stockWindow?.getDepotRecords?.() || SEM?.depotMagasin?.getRecords?.() || []
    );
    if ((!records.length || refresh) && typeof SEM?.stockWindow?.refreshDepotRecords === "function") {
      try {
        records = normalizeBeReceptionDepotRecords(await SEM.stockWindow.refreshDepotRecords());
      } catch {}
    }
    if ((!records.length || refresh) && typeof w.electronAPI?.listDepots === "function") {
      try {
        const response = await w.electronAPI.listDepots();
        if (response?.ok && Array.isArray(response.results)) {
          records = normalizeBeReceptionDepotRecords(response.results);
          if (typeof SEM?.stockWindow?.setDepotRecords === "function") {
            SEM.stockWindow.setDepotRecords(records);
          }
        }
      } catch {}
    }
    return records;
  };
  const fetchBeReceptionLocationsForDepot = async (depotId = "") => {
    const targetDepotId = normalizeBeReceptionDepotId(depotId);
    if (!targetDepotId) return [];
    let records = normalizeBeReceptionDepotRecords(
      SEM?.stockWindow?.getDepotRecords?.() || SEM?.depotMagasin?.getRecords?.() || []
    );
    let depotRecord =
      records.find((entry) => normalizeBeReceptionDepotId(entry?.id || "") === targetDepotId) || null;
    let locations = normalizeBeReceptionLocationRecords(depotRecord?.emplacements || [], targetDepotId);
    if (locations.length) return locations;
    if (typeof w.electronAPI?.listEmplacementsByDepot === "function") {
      try {
        const response = await w.electronAPI.listEmplacementsByDepot({ depotId: targetDepotId });
        if (response?.ok && Array.isArray(response.results)) {
          locations = normalizeBeReceptionLocationRecords(response.results, targetDepotId);
          if (locations.length) {
            const nextRecords = (
              records.length ? records : [{ id: targetDepotId, name: depotRecord?.name || targetDepotId }]
            ).map((entry) =>
              normalizeBeReceptionDepotId(entry?.id || "") === targetDepotId
                ? { ...entry, emplacements: locations }
                : entry
            );
            if (typeof SEM?.stockWindow?.setDepotRecords === "function") {
              SEM.stockWindow.setDepotRecords(nextRecords);
            }
          }
        }
      } catch {}
    }
    return locations;
  };

  async function collectModelChoices() {
    const models = [];
    const seen = new Set();
    const pushModel = (entry = {}) => {
      const name = String(entry?.name || "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      models.push({
        value: name,
        label: name,
        docTypes: entry?.config?.docTypes !== undefined ? entry?.config?.docTypes : entry?.config?.docType || ""
      });
    };

    if (typeof SEM?.__bindingHelpers?.ensureModelCache === "function") {
      try {
        await SEM.__bindingHelpers.ensureModelCache();
      } catch (err) {
        console.warn("collectModelChoices cache hydrate failed", err);
      }
    }

    if (typeof SEM?.getModelEntries === "function") {
      try {
        const entries = SEM.getModelEntries() || [];
        entries.forEach((entry = {}) => pushModel(entry));
      } catch (err) {
        console.warn("collectModelChoices failed", err);
      }
    }
    if (!models.length && typeof w.electronAPI?.listModels === "function") {
      try {
        const res = await w.electronAPI.listModels();
        const entries = Array.isArray(res?.models) ? res.models : [];
        entries.forEach((entry = {}) => pushModel(entry));
      } catch (err) {
        console.warn("collectModelChoices listModels fallback failed", err);
      }
    }
    if (!models.length) {
      const selectEl = typeof getEl === "function" ? getEl("modelSelect") : null;
      if (selectEl?.options) {
        Array.from(selectEl.options).forEach((opt) => {
          if (!opt.value || seen.has(opt.value)) return;
          seen.add(opt.value);
          models.push({
            value: opt.value,
            label: (opt.textContent || opt.label || opt.value).trim() || opt.value,
            docTypes: ""
          });
        });
      }
    }
    return models;
  }

  const MAIN_CONVERSION_SOURCE_TYPE_CONFIGS = [
    {
      docType: "devis",
      label: "Devis",
      partyType: "client",
      promptOptions: {
        titleText: "Convertir le devis",
        targetDocTypes: ["facture", "bl"],
        defaultTarget: "facture"
      }
    },
    {
      docType: "facture",
      label: "Facture",
      partyType: "client",
      promptOptions: {
        titleText: "Convertir la facture",
        targetDocTypes: ["avoir"],
        defaultTarget: "avoir",
        showTargetChoice: true,
        allowedModelDocTypes: ["avoir"]
      }
    },
    {
      docType: "bl",
      label: "Bon de livraison",
      partyType: "client",
      promptOptions: {
        titleText: "Convertir le bon de livraison",
        targetDocTypes: ["facture"],
        defaultTarget: "facture"
      }
    },
    {
      docType: "bc",
      label: "Bon de commande",
      partyType: "vendor",
      promptOptions: {
        titleText: "Convertir le bon de commande",
        targetDocTypes: ["be"],
        defaultTarget: "be"
      }
    },
    {
      docType: "fa",
      label: "Facture d'achat",
      partyType: "vendor",
      promptOptions: {
        titleText: "Convertir la facture d'achat",
        targetDocTypes: ["be"],
        defaultTarget: "be"
      }
    }
  ];

  const normalizeMainSourceDocType = (value) => String(value || "").trim().toLowerCase();
  const getMainSourceTypeConfig = (value) => {
    const normalized = normalizeMainSourceDocType(value);
    return (
      MAIN_CONVERSION_SOURCE_TYPE_CONFIGS.find(
        (entry) => normalizeMainSourceDocType(entry?.docType) === normalized
      ) || null
    );
  };

  const pickMainSourceTypeDialog = async (trigger = null) => {
    if (typeof showConfirm !== "function") {
      return MAIN_CONVERSION_SOURCE_TYPE_CONFIGS[0] || null;
    }
    let selectedDocType = normalizeMainSourceDocType(
      MAIN_CONVERSION_SOURCE_TYPE_CONFIGS[0]?.docType || "devis"
    );
    const confirmed = await showConfirm("Selectionner un document", {
      title: "Selectionner un document",
      okText: "Continuer",
      cancelText: "Annuler",
      trigger,
      onOk: () => !!selectedDocType,
      renderMessage(container) {
        if (!container) return;
        container.innerHTML = "";
        const panel = document.createElement("div");
        panel.className = "doc-convert-source-dialog";

        const message = document.createElement("p");
        message.className = "be-reception-source-type-dialog__message";
        message.textContent = "Choisissez le type de document source :";
        panel.appendChild(message);

        const options = document.createElement("div");
        options.className = "swbDialog__options be-reception-source-type-dialog__options";
        options.setAttribute("role", "group");
        panel.appendChild(options);

        const okBtn = document.getElementById("swbDialogOk");
        const setOkEnabled = (enabled) => {
          if (!okBtn) return;
          okBtn.disabled = !enabled;
          okBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
        };
        const syncActiveButtons = () => {
          const activeDocType = normalizeMainSourceDocType(selectedDocType);
          options.querySelectorAll("button[data-convert-source-doc-type]").forEach((btn) => {
            const isActive =
              normalizeMainSourceDocType(btn.dataset.convertSourceDocType) === activeDocType;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
          });
          setOkEnabled(!!activeDocType);
        };

        MAIN_CONVERSION_SOURCE_TYPE_CONFIGS.forEach((entry) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn better-style-v2";
          btn.dataset.convertSourceDocType = entry.docType;
          btn.setAttribute("aria-pressed", "false");
          btn.textContent = String(entry.label || entry.docType).trim() || entry.docType;
          btn.addEventListener("click", () => {
            selectedDocType = normalizeMainSourceDocType(entry.docType);
            syncActiveButtons();
          });
          options.appendChild(btn);
        });

        container.appendChild(panel);
        syncActiveButtons();
      }
    });

    if (!confirmed) return null;
    return getMainSourceTypeConfig(selectedDocType);
  };

  const openMainSourceDocumentPicker = async (sourceConfig, trigger = null) => {
    if (!sourceConfig || !sourceConfig.docType) return { ok: false, canceled: true };
    const docType = normalizeMainSourceDocType(sourceConfig.docType);
    const picker =
      sourceConfig.partyType === "vendor"
        ? w.AppInit?.BonEntreeSourceDocumentPicker
        : w.AppInit?.BonSortieSourceDocumentPicker;
    if (!picker || typeof picker.open !== "function") {
      await w.showDialog?.("Fenetre de selection indisponible.", { title: "Erreur" });
      return { ok: false, canceled: false };
    }
    return picker.open(trigger, {
      docType,
      docTypeChoices: [{ docType, label: sourceConfig.label || docType }],
      sourceChooserTitle: "Selectionner un document",
      sourceChooserMessage: "Choisissez le type de document source :"
    });
  };

  const toConversionEntryFromPickerItem = (item, sourceDocType) => {
    const raw = item && typeof item === "object" ? item : {};
    return {
      id: String(raw.id || "").trim(),
      path: String(raw.path || "").trim(),
      number: String(raw.number || raw.displayName || "").trim(),
      name: String(raw.displayName || raw.number || "").trim(),
      docType: normalizeMainSourceDocType(sourceDocType || raw.docType || ""),
      date: String(raw.date || "").trim(),
      clientName: String(raw.clientName || "").trim(),
      clientPath: String(raw.clientPath || "").trim(),
      clientAccount: String(raw.clientAccount || "").trim()
    };
  };

  async function promptDevisConversion(entry, options = {}) {
    if (!entry) return null;
    let selectedModel = "";
    let selectedDate = "";
    let selectedPaymentMethod = "";
    let selectedPaymentReference = String(
      entry?.paymentReference || entry?.paymentRef || ""
    ).trim();
    let selectedFactureStatus = "";
    let lastPaymentMethod = "";
    let selectedPaidAmount = 0;
    let selectedBeReception = null;
    let beReceptionDateTouched = false;
    const normalizePaidValue = (value) => {
      const raw = String(value ?? "").trim();
      if (!raw) return 0;
      const parsed = Number(raw.replace(",", "."));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };
    const promptOptions = options && typeof options === "object" ? options : {};
    const promptSourceDocType = String(
      promptOptions.sourceDocType || entry?.docType || ""
    ).trim().toLowerCase();
    const showTwoStepWizard = !!promptOptions.showTwoStepWizard;
    const wizardStep1Label =
      String(promptOptions.wizardStep1Label || "S\u00E9lection du document source").trim() ||
      "S\u00E9lection du document source";
    const wizardStep2Label =
      String(promptOptions.wizardStep2Label || "Param\u00E8tres du document converti").trim() ||
      "Param\u00E8tres du document converti";
    const wizardSourceTypeLabel = String(promptOptions.wizardSourceTypeLabel || "").trim();
    const wizardSourceDocLabel =
      String(
        promptOptions.wizardSourceDocLabel ||
          entry?.number ||
          entry?.invNumber ||
          entry?.name ||
          entry?.label ||
          ""
      ).trim();
    const SELECTABLE_DOC_TYPES = new Set([
      "facture",
      "fa",
      "bc",
      "be",
      "bs",
      "avoir",
      "devis",
      "bl"
    ]);
    const targetDocTypesRaw = Array.isArray(promptOptions.targetDocTypes)
      ? promptOptions.targetDocTypes
      : ["facture", "bl"];
    const normalizedTargetDocTypes = Array.from(
      new Set(
        targetDocTypesRaw
          .map((value) => String(value || "").trim().toLowerCase())
          .filter((value) => SELECTABLE_DOC_TYPES.has(value))
      )
    );
    const defaultTargetCandidate = String(
      promptOptions.defaultTarget || normalizedTargetDocTypes[0] || "facture"
    ).trim().toLowerCase();
    const defaultTargetDocType = SELECTABLE_DOC_TYPES.has(defaultTargetCandidate)
      ? defaultTargetCandidate
      : normalizedTargetDocTypes[0] || "facture";
    if (defaultTargetDocType && !normalizedTargetDocTypes.includes(defaultTargetDocType)) {
      normalizedTargetDocTypes.unshift(defaultTargetDocType);
    }
    const showTargetChoice =
      typeof promptOptions.showTargetChoice === "boolean"
        ? promptOptions.showTargetChoice
        : normalizedTargetDocTypes.length > 1;
    const MODEL_DOC_TYPE_ALL = "all";
    const DEFAULT_MODEL_DOC_TYPE = "facture";
    const DOC_TYPE_LABELS = {
      facture: "Facture",
      fa: "Facture d'achat",
      bc: "Bon de commande",
      be: "Bon d'entrée",
      bs: "Bon de sortie",
      avoir: "Facture d'avoir",
      devis: "Devis",
      bl: "Bon de livraison"
    };
    const getDocTypeDisplayLabel = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "Document";
      if (typeof w.docTypeLabel === "function") {
        const fromGlobal = String(w.docTypeLabel(normalized) || "").trim();
        if (fromGlobal) return fromGlobal;
      }
      return DOC_TYPE_LABELS[normalized] || normalized.toUpperCase();
    };
    const escapeHtmlText = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const CONVERT_BE_RECEPTION_IDS = {
      section: "docHistoryBeReceptionBox",
      depot: "docHistoryBeReceptionDepotInput",
      depotMenu: "docHistoryBeReceptionDepotMenu",
      depotPanel: "docHistoryBeReceptionDepotPanel",
      depotDisplay: "docHistoryBeReceptionDepotDisplay",
      destination: "docHistoryBeReceptionDestinationInput",
      destinationMenu: "docHistoryBeReceptionDestinationMenu",
      destinationPanel: "docHistoryBeReceptionDestinationPanel",
      destinationDisplay: "docHistoryBeReceptionDestinationDisplay",
      date: "docHistoryBeReceptionDateInput",
      datePanel: "docHistoryBeReceptionDatePanel",
      time: "docHistoryBeReceptionTimeInput",
      timePanel: "docHistoryBeReceptionTimePanel",
      sourceRef: "docHistoryBeReceptionSourceInput"
    };
    const getSelectedOptionText = (select) => {
      if (!(select instanceof HTMLSelectElement)) return "";
      const selected =
        (select.selectedOptions && select.selectedOptions.length ? select.selectedOptions[0] : null) ||
        Array.from(select.options || []).find((option) => option.value === select.value) ||
        null;
      return normalizeBeReceptionText(selected?.textContent || "");
    };
    const readBeReceptionFormValues = (section, current = selectedBeReception) => {
      const base = normalizeBeReceptionChoice(current, { fallbackDate: selectedDate || today });
      if (!(section instanceof HTMLElement)) return base;
      const depotSelect = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.depot}`);
      const destinationSelect = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.destination}`);
      const dateInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.date}`);
      const timeInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.time}`);
      const sourceInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.sourceRef}`);
      const destinationIds = normalizeBeReceptionDestinationIds(
        Array.from(destinationSelect?.selectedOptions || []).map((option) => option.value)
      );
      const destinationLabels = normalizeBeReceptionDestinationLabels(
        destinationIds
          .map((id) => {
            const option = Array.from(destinationSelect?.options || []).find(
              (entry) => String(entry.value || "").trim() === id
            );
            return option?.textContent || "";
          })
          .filter(Boolean)
      );
      return normalizeBeReceptionChoice(
        {
          ...base,
          depotId: normalizeBeReceptionDepotId(depotSelect?.value || base.depotId || ""),
          depot: normalizeBeReceptionDepotId(depotSelect?.value || "")
            ? getSelectedOptionText(depotSelect)
            : "",
          destinationId: destinationIds[0] || "",
          destinationIds,
          destinationLabels,
          destination: destinationLabels.length
            ? formatBeReceptionDestinationText(destinationLabels)
            : "",
          date: String(dateInput?.value || base.date || selectedDate || today).trim(),
          time: String(timeInput?.value || base.time || "").trim(),
          sourceRef: normalizeBeReceptionText(sourceInput?.value || base.sourceRef || "")
        },
        { fallbackDate: selectedDate || today }
      );
    };
    const allowedModelDocTypes = Array.isArray(promptOptions.allowedModelDocTypes)
      ? promptOptions.allowedModelDocTypes
      : [MODEL_DOC_TYPE_ALL, ...normalizedTargetDocTypes];
    let targetDocType = defaultTargetDocType || "facture";
    const dialogTitle = promptOptions.titleText || "Convertir le devis";
    const okText = promptOptions.okText || "Convertir";
    const cancelText = promptOptions.cancelText || "Annuler";
    const models = await collectModelChoices();
    const today = new Date().toISOString().slice(0, 10);
    if (!selectedDate) selectedDate = today;
    const getBeReceptionValidationOptions = (fallbackDate = selectedDate || today) => ({
      fallbackDate,
      requireStorageFields: shouldRequireBeReceptionStorageFields(promptSourceDocType, targetDocType)
    });
    selectedBeReception = createDefaultBeReceptionChoice({
      entry,
      sourceDocType: promptSourceDocType,
      date: selectedDate
    });
    let dialogModelSelect = null;
    let dialogDateInput = null;
    let dialogPaymentMethodSelect = null;
    let dialogPaymentStatusSelect = null;
    let dialogPaymentReferenceInput = null;
    let dialogAcomptePaidInput = null;
    let dialogBeReceptionSection = null;
    let dialogTargetSelect = null;
    let dialogTargetRadios = [];
    const submitHandler = typeof promptOptions.onSubmit === "function" ? promptOptions.onSubmit : null;
    let submitInFlight = false;
    let submittedChoices = null;
    let submitResult = null;
    let submitErrorElement = null;
    const setSubmitError = (value) => {
      if (!submitErrorElement) return;
      const text = String(value || "").trim();
      submitErrorElement.textContent = text;
      submitErrorElement.hidden = !text;
      submitErrorElement.style.display = text ? "" : "none";
    };
    const syncSelectionsFromForm = () => {
      if (dialogModelSelect) {
        selectedModel = String(dialogModelSelect.value || "").trim();
      }
      const chosenTarget =
        dialogTargetRadios.find((radio) => radio?.checked)?.value ||
        dialogTargetSelect?.value ||
        targetDocType ||
        defaultTargetDocType ||
        "facture";
      targetDocType = String(chosenTarget || "").trim().toLowerCase() || targetDocType || "facture";
      if (dialogDateInput) {
        selectedDate = String(dialogDateInput.value || selectedDate || "").trim();
      }
      if (dialogPaymentMethodSelect) {
        selectedPaymentMethod = String(dialogPaymentMethodSelect.value || selectedPaymentMethod || "").trim();
      }
      if (dialogPaymentStatusSelect) {
        selectedFactureStatus = String(dialogPaymentStatusSelect.value || selectedFactureStatus || "").trim();
      }
      if (dialogPaymentReferenceInput) {
        selectedPaymentReference = String(dialogPaymentReferenceInput.value || selectedPaymentReference || "").trim();
      }
      if (dialogAcomptePaidInput) {
        selectedPaidAmount = normalizePaidValue(dialogAcomptePaidInput.value);
      }
      if (dialogBeReceptionSection) {
        selectedBeReception = readBeReceptionFormValues(dialogBeReceptionSection, selectedBeReception);
      }
    };
    const buildChoicePayload = () => {
      const normalizedTarget = String(targetDocType || "").trim().toLowerCase();
      const paymentMethod = normalizedTarget === "facture" ? selectedPaymentMethod : "";
      const paymentReference = normalizedTarget === "facture" ? selectedPaymentReference : "";
      const status = normalizedTarget === "facture" ? selectedFactureStatus : "";
      const paidAmount =
        normalizedTarget === "facture" &&
        normalizeFactureStatusValue(selectedFactureStatus) === "partiellement-payee"
          ? selectedPaidAmount
          : null;
      return {
        model: selectedModel,
        target: targetDocType,
        date: selectedDate,
        paymentMethod,
        paymentReference,
        status,
        paidAmount,
        beReception:
          normalizedTarget === "be"
            ? normalizeBeReceptionChoice(selectedBeReception, {
                fallbackDate: selectedDate || today
              })
            : null
      };
    };
    const handleConfirmOk = async () => {
      syncSelectionsFromForm();
      const draftChoices = buildChoicePayload();
      console.info("[doc-convert] click Convertir", {
        sourcePath: String(entry?.path || ""),
        target: draftChoices.target || "",
        model: draftChoices.model || "",
        hasDate: !!draftChoices.date,
        hasPaymentMethod: !!draftChoices.paymentMethod,
        hasStatus: !!draftChoices.status
      });
      setSubmitError("");
      if (String(draftChoices.target || "").trim().toLowerCase() === "be") {
        const beValidation = validateBeReceptionChoice(
          draftChoices.beReception,
          getBeReceptionValidationOptions(selectedDate || today)
        );
        if (!beValidation.ok) {
          setSubmitError(beValidation.error || "Informations de reception incompletes.");
          return false;
        }
        draftChoices.beReception = beValidation.value;
      }
      if (!submitHandler) {
        submittedChoices = draftChoices;
        submitResult = true;
        return true;
      }
      if (submitInFlight) return false;
      submitInFlight = true;
      try {
        submitResult = await submitHandler(draftChoices);
        const failedWithDetails =
          submitResult && typeof submitResult === "object" && submitResult.ok === false;
        const success = !failedWithDetails && submitResult !== false;
        const submitErrorText = failedWithDetails
          ? String(submitResult.error || submitResult.message || "").trim()
          : "";
        console.info("[doc-convert] submit validation result", {
          success,
          target: draftChoices.target || "",
          model: draftChoices.model || ""
        });
        if (!success) {
          setSubmitError(submitErrorText || "Impossible de convertir le document.");
          return false;
        }
        submittedChoices = draftChoices;
        return true;
      } catch (err) {
        console.error("convert submit failed", err);
        submitResult = false;
        setSubmitError(String(err?.message || "Impossible de convertir le document."));
        return false;
      } finally {
        submitInFlight = false;
      }
    };
    const confirmed = await showConfirm(dialogTitle, {
      title: dialogTitle,
      okText,
      cancelText,
      onOk: handleConfirmOk,
      renderMessage(container) {
        container.innerHTML = "";
        container.style.maxHeight = "none";
        container.style.overflow = "visible";
        const wrapper = document.createElement("div");
        wrapper.className = "doc-history-convert-form";
        if (showTwoStepWizard) {
          const wizard = document.createElement("div");
          wizard.className = "doc-history-convert-wizard";

          const stepper = document.createElement("div");
          stepper.className = "model-stepper__labels";
          stepper.setAttribute("role", "list");
          stepper.setAttribute("aria-label", "Etapes de conversion");

          const step1 = document.createElement("div");
          step1.className = "model-stepper__step is-complete";
          step1.setAttribute("role", "listitem");
          const step1Badge = document.createElement("span");
          step1Badge.className = "model-stepper__badge";
          step1Badge.textContent = "1";
          const step1Title = document.createElement("span");
          step1Title.className = "model-stepper__title";
          step1Title.textContent = wizardStep1Label;
          step1.append(step1Badge, step1Title);

          const step2 = document.createElement("div");
          step2.className = "model-stepper__step is-active";
          step2.setAttribute("role", "listitem");
          const step2Badge = document.createElement("span");
          step2Badge.className = "model-stepper__badge";
          step2Badge.textContent = "2";
          const step2Title = document.createElement("span");
          step2Title.className = "model-stepper__title";
          step2Title.textContent = wizardStep2Label;
          step2.append(step2Badge, step2Title);

          stepper.append(step1, step2);
          wizard.appendChild(stepper);

          if (wizardSourceTypeLabel || wizardSourceDocLabel) {
            const summary = document.createElement("p");
            summary.className = "doc-history-convert-wizard__source";
            const parts = [];
            if (wizardSourceTypeLabel) parts.push(wizardSourceTypeLabel);
            if (wizardSourceDocLabel) parts.push(wizardSourceDocLabel);
            summary.textContent = `Source : ${parts.join(" - ")}`;
            wizard.appendChild(summary);
          }

          container.appendChild(wizard);
        }

        const modelGroup = document.createElement("div");
        modelGroup.className = "doc-history-convert__field";
        const modelLabel = document.createElement("label");
        modelLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
        modelLabel.id = "docHistoryConvertModelLabel";
        modelLabel.textContent = "Mod\u00E8le";

        const modelField = document.createElement("div");
        modelField.className = "doc-dialog-model-picker__field";

        const modelMenu = document.createElement("details");
        modelMenu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
        modelMenu.dataset.wired = "1";
        const modelSummary = document.createElement("summary");
        modelSummary.className = "btn success field-toggle-trigger";
        modelSummary.setAttribute("role", "button");
        modelSummary.setAttribute("aria-haspopup", "listbox");
        modelSummary.setAttribute("aria-expanded", "false");
        modelSummary.setAttribute("aria-labelledby", "docHistoryConvertModelLabel docHistoryConvertModelDisplay");
        const MODEL_PLACEHOLDER = "S\u00E9lectionner un mod\u00E8le";
        const modelDisplay = document.createElement("span");
        modelDisplay.id = "docHistoryConvertModelDisplay";
        modelDisplay.className = "model-select-display";
        modelDisplay.textContent = MODEL_PLACEHOLDER;
        modelSummary.appendChild(modelDisplay);
        modelSummary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
        modelMenu.appendChild(modelSummary);

        const modelPanel = document.createElement("div");
        modelPanel.id = "docHistoryConvertModelPanel";
        modelPanel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
        modelPanel.setAttribute("role", "listbox");
        modelPanel.setAttribute("aria-labelledby", "docHistoryConvertModelLabel");
        modelMenu.appendChild(modelPanel);
        const modelPanelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
        if (modelPanel.parentNode) {
          try {
            modelPanel.parentNode.insertBefore(modelPanelPlaceholder, modelPanel);
          } catch {}
        }
        let modelPanelPortaled = false;

        const modelSelect = document.createElement("select");
        modelSelect.id = "docHistoryConvertModelSelect";
        modelSelect.className = "model-select doc-dialog-model-select";
        modelSelect.setAttribute("aria-hidden", "true");
        modelSelect.tabIndex = -1;
        modelLabel.htmlFor = modelSelect.id;

        const seenModels = new Set();
        const MODEL_DOC_TYPE_LIST = ["facture", "fa", "bc", "be", "bs", "devis", "bl", "avoir"];
        const normalizeModelDocType = (value, fallback = "") => {
          const normalized = String(value || "").trim().toLowerCase();
          if (!normalized || normalized === "aucun") return fallback;
          if (normalized === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_ALL;
          return MODEL_DOC_TYPE_LIST.includes(normalized) ? normalized : fallback;
        };
        const normalizeModelDocTypeList = (value) => {
          const rawList = Array.isArray(value)
            ? value
            : typeof value === "string"
              ? value.split(",")
              : [];
          const normalized = [];
          rawList.forEach((entry) => {
            const next = normalizeModelDocType(entry, "");
            if (!next || next === MODEL_DOC_TYPE_ALL) return;
            if (!normalized.includes(next)) normalized.push(next);
          });
          return normalized;
        };
        const expandModelDocTypes = (value, fallback = DEFAULT_MODEL_DOC_TYPE) => {
          const normalized = normalizeModelDocTypeList(value);
          if (normalized.length) return normalized;
          const single = normalizeModelDocType(value, "");
          if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
          if (single) return [single];
          const fallbackList = normalizeModelDocTypeList(fallback);
          return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
        };
        const allowedDocTypes = new Set(
          allowedModelDocTypes
            .map((value) => normalizeModelDocType(value, ""))
            .filter(Boolean)
        );
        const allowAllModels = !allowedDocTypes.size || allowedDocTypes.has(MODEL_DOC_TYPE_ALL);
        const normalizeModelName = (value) =>
          String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const strictAllowedModelsByDocTypeRaw =
          promptOptions.allowedModelsByDocType &&
          typeof promptOptions.allowedModelsByDocType === "object"
            ? promptOptions.allowedModelsByDocType
            : null;
        const strictAllowedModelsByDocType = {};
        Object.entries(strictAllowedModelsByDocTypeRaw || {}).forEach(([docTypeKey, modelNames]) => {
          const normalizedDocType = String(docTypeKey || "").trim().toLowerCase();
          if (!normalizedDocType) return;
          const normalizedNames = new Set(
            (Array.isArray(modelNames) ? modelNames : [])
              .map((name) => normalizeModelName(name))
              .filter(Boolean)
          );
          strictAllowedModelsByDocType[normalizedDocType] = normalizedNames;
        });
        const allModelOptions = [];
        let visibleModelOptions = [];
        models.forEach((model) => {
          const value = model.value || "";
          if (!value || seenModels.has(value)) return;
          const modelDocTypes = expandModelDocTypes(model.docTypes, DEFAULT_MODEL_DOC_TYPE);
          const isAllowed =
            allowAllModels || modelDocTypes.some((docType) => allowedDocTypes.has(docType));
          if (!isAllowed) return;
          seenModels.add(value);
          const label = model.label || value;
          allModelOptions.push({ value, label, docTypes: modelDocTypes });
        });

        const getModelLabel = (value) => {
          if (!value) return MODEL_PLACEHOLDER;
          const match =
            visibleModelOptions.find((opt) => opt.value === value) ||
            allModelOptions.find((opt) => opt.value === value);
          return match?.label || MODEL_PLACEHOLDER;
        };
        const okBtn = document.getElementById("swbDialogOk");
        const setOkEnabled = (enabled) => {
          if (!okBtn) return;
          okBtn.disabled = !enabled;
          okBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
        };
        let targetRadios = [];
        let targetSelect = null;
        let syncTargetToggle = () => {};
        let paymentMethodSelectEl = null;
        let paymentStatusSelectEl = null;
        let paymentReferenceInputEl = null;
        let paymentRow = null;
        let acompteRow = null;
        let acomptePaidInput = null;
        let acompteDueInput = null;
        let updateAcompteVisibility = () => {};
        let beReceptionSection = null;
        let updateBeReceptionVisibility = () => {};
        const normalizeDocTypeValue = (value) => String(value || "").trim().toLowerCase();
        const allowedTargetDocTypes = new Set(
          (normalizedTargetDocTypes.length ? normalizedTargetDocTypes : ["facture"])
            .map((value) => normalizeDocTypeValue(value))
            .filter(Boolean)
        );
        if (!allowedTargetDocTypes.size) allowedTargetDocTypes.add("facture");
        const supportsBonEntreeTarget = allowedTargetDocTypes.has("be");
        if (!allowedTargetDocTypes.has(normalizeDocTypeValue(targetDocType))) {
          targetDocType = Array.from(allowedTargetDocTypes)[0] || "facture";
        }
        const getSelectedTargetValue = () => {
          const chosen = targetRadios.find((radio) => radio.checked);
          return normalizeDocTypeValue(chosen?.value || targetSelect?.value || targetDocType);
        };
        const hasValidModelSelectionForTarget = (targetValue) => {
          if (!selectedModel) return false;
          const normalizedTarget = normalizeDocTypeValue(targetValue) || normalizeDocTypeValue(targetDocType);
          return resolveVisibleModelOptions(normalizedTarget).some((opt) => opt.value === selectedModel);
        };
        const resolveVisibleModelOptions = (targetValue) => {
          const normalizedTarget = normalizeDocTypeValue(targetValue);
          const strictNames = strictAllowedModelsByDocType[normalizedTarget];
          const useStrictList = strictNames instanceof Set && strictNames.size > 0;
          return allModelOptions.filter((opt) => {
            const docTypes = Array.isArray(opt?.docTypes) ? opt.docTypes : [];
            if (normalizedTarget && !docTypes.includes(normalizedTarget)) return false;
            if (!useStrictList) return true;
            const normalizedValue = normalizeModelName(opt?.value || "");
            const normalizedLabel = normalizeModelName(opt?.label || "");
            return strictNames.has(normalizedValue) || strictNames.has(normalizedLabel);
          });
        };
        const isFactureTarget = () => {
          if (!targetRadios.length) {
            return normalizeDocTypeValue(targetDocType) === "facture";
          }
          const factureRadio = targetRadios.find(
            (radio) => normalizeDocTypeValue(radio?.value) === "facture"
          );
          if (!factureRadio) return false;
          const label = factureRadio.closest(".doc-type-toggle");
          const isSelected =
            !!factureRadio.checked ||
            label?.classList.contains("is-active") ||
            label?.getAttribute("aria-selected") === "true";
          const isDisabled =
            !!factureRadio.disabled ||
            label?.classList.contains("is-disabled") ||
            label?.getAttribute("aria-disabled") === "true";
          return isSelected && !isDisabled;
        };
        const isPartialStatus = () =>
          normalizeFactureStatusValue(selectedFactureStatus) === "partiellement-payee";
        const isBonEntreeTarget = () => getSelectedTargetValue() === "be";
        const resolveAcompteBase = () => {
          const totalTTC = Number(entry?.totalTTC);
          if (Number.isFinite(totalTTC)) return totalTTC;
          const totalHT = Number(entry?.totalHT);
          if (Number.isFinite(totalHT)) return totalHT;
          return null;
        };
        const formatMoneyValue =
          typeof w.formatMoney === "function"
            ? w.formatMoney
            : (value, currency) => {
                const num = Number(value || 0);
                const formatted = num.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
                return currency ? `${formatted} ${currency}` : formatted;
              };
        const resolveCurrency = () => String(entry?.currency || SEM?.state?.meta?.currency || "").trim();
        const updateAcompteAmounts = (paidValue) => {
          const normalizedPaid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;
          selectedPaidAmount = normalizedPaid;
          if (!acompteDueInput) return;
          const base = resolveAcompteBase();
          if (!Number.isFinite(base)) {
            acompteDueInput.value = "";
            return;
          }
          const due = Math.max(0, base - normalizedPaid);
          acompteDueInput.value = formatMoneyValue(due, resolveCurrency());
        };
        const updateConfirmState = () => {
          const hasValidModel = hasValidModelSelectionForTarget(getSelectedTargetValue());
          if (!hasValidModel) {
            setOkEnabled(false);
            return;
          }
          if (!targetRadios.length) {
            if (isFactureTarget()) {
              const hasPayment = !!(selectedPaymentMethod && selectedFactureStatus);
              setOkEnabled(hasPayment);
              return;
            }
            if (isBonEntreeTarget()) {
              setOkEnabled(
                validateBeReceptionChoice(
                  selectedBeReception,
                  getBeReceptionValidationOptions(selectedDate || today)
                ).ok
              );
              return;
            }
            setOkEnabled(true);
            return;
          }
          const hasEnabled = targetRadios.some((radio) => !radio.disabled);
          if (!hasEnabled) {
            setOkEnabled(false);
            return;
          }
          if (isFactureTarget()) {
            const hasPayment = !!(selectedPaymentMethod && selectedFactureStatus);
            setOkEnabled(hasPayment);
            return;
          }
          if (isBonEntreeTarget()) {
            setOkEnabled(
              validateBeReceptionChoice(
                selectedBeReception,
                getBeReceptionValidationOptions(selectedDate || today)
              ).ok
            );
            return;
          }
          setOkEnabled(true);
        };
        const updatePaymentVisibility = () => {
          if (!paymentRow) return;
          const show = isFactureTarget();
          paymentRow.hidden = !show;
          paymentRow.style.display = show ? "grid" : "none";
          updateAcompteVisibility();
          updateConfirmState();
        };
        updateBeReceptionVisibility = () => {
          if (!beReceptionSection) return;
          const show = isBonEntreeTarget();
          beReceptionSection.hidden = !show;
          beReceptionSection.style.display = show ? "" : "none";
          beReceptionSection.setAttribute("aria-hidden", show ? "false" : "true");
          updateConfirmState();
        };
        const updateTargetDocTypeAvailability = () => {
          const fallbackTarget =
            normalizeDocTypeValue(targetDocType) ||
            Array.from(allowedTargetDocTypes)[0] ||
            "facture";
          if (!targetRadios.length) {
            targetDocType = allowedTargetDocTypes.has(fallbackTarget)
              ? fallbackTarget
              : Array.from(allowedTargetDocTypes)[0] || fallbackTarget;
            updateConfirmState();
            updatePaymentVisibility();
            updateBeReceptionVisibility();
            return;
          }
          let firstAllowed = null;
          targetRadios.forEach((radio) => {
            const value = normalizeDocTypeValue(radio.value);
            const isAllowed = allowedTargetDocTypes.has(value);
            radio.disabled = !isAllowed;
            radio.setAttribute("aria-disabled", isAllowed ? "false" : "true");
            const label = radio.closest(".doc-type-toggle");
            if (label) {
              label.classList.toggle("is-disabled", !isAllowed);
              label.setAttribute("aria-disabled", isAllowed ? "false" : "true");
            }
            if (isAllowed && !firstAllowed) firstAllowed = value;
          });
          if (targetSelect) {
            targetSelect.disabled = !firstAllowed;
            targetSelect.setAttribute("aria-disabled", firstAllowed ? "false" : "true");
            Array.from(targetSelect.options || []).forEach((opt) => {
              if (!opt.value) return;
              const optValue = normalizeDocTypeValue(opt.value);
              opt.disabled = !allowedTargetDocTypes.has(optValue);
            });
          }
          const currentValue = getSelectedTargetValue();
          const nextValue =
            (currentValue && allowedTargetDocTypes.has(currentValue) && currentValue) ||
            firstAllowed ||
            Array.from(allowedTargetDocTypes)[0] ||
            fallbackTarget;
          if (nextValue && currentValue !== nextValue) {
            syncTargetToggle(nextValue);
            return;
          }
          targetDocType = nextValue || targetDocType;
          if (targetSelect && targetDocType) {
            targetSelect.value = targetDocType;
          }
          updatePaymentVisibility();
          updateBeReceptionVisibility();
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
          const isMenuDisabled = () => menu.dataset.disabled === "true";

          panel.textContent = "";
          options.forEach((opt) => {
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

          const setSelection = (value, { closeMenu = true, notify = true, forceLabel } = {}) => {
            const nextValue = value || "";
            hiddenSelect.value = nextValue;
            const activeLabel =
              typeof forceLabel === "string" ? forceLabel : getOptionLabel(nextValue);
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
          const setDisabled = (disabled) => {
            const isDisabled = !!disabled;
            menu.dataset.disabled = isDisabled ? "true" : "false";
            summary.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            if (isDisabled) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
              summary.tabIndex = -1;
            } else {
              summary.removeAttribute("tabindex");
            }
            hiddenSelect.disabled = isDisabled;
            hiddenSelect.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            panel.querySelectorAll(".model-select-option").forEach((btn) => {
              btn.disabled = isDisabled;
            });
          };

          panel.addEventListener("click", (evt) => {
            if (isMenuDisabled()) return;
            const btn = evt.target.closest(".model-select-option");
            if (!btn) return;
            setSelection(btn.dataset.value || "");
          });

          summary.addEventListener("click", (evt) => {
            if (isMenuDisabled()) return;
            evt.preventDefault();
            menu.open = !menu.open;
            summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
            if (!menu.open) summary.focus();
          });

          menu.addEventListener("keydown", (evt) => {
            if (isMenuDisabled()) return;
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
          return { group, hiddenSelect, setSelection, setDisabled };
        };

        const closeBeReceptionMenu = (menu) => {
          if (!(menu instanceof HTMLElement)) return;
          menu.removeAttribute("open");
          menu.querySelector("summary.field-toggle-trigger")?.setAttribute("aria-expanded", "false");
        };
        const setBeReceptionPickerDisabled = (menu, select, disabled) => {
          const isDisabled = !!disabled;
          if (menu instanceof HTMLElement) {
            menu.dataset.disabled = isDisabled ? "true" : "false";
            const summary = menu.querySelector("summary.field-toggle-trigger");
            summary?.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            if (isDisabled) {
              closeBeReceptionMenu(menu);
              if (summary) summary.tabIndex = -1;
            } else if (summary) {
              summary.removeAttribute("tabindex");
            }
          }
          if (select instanceof HTMLSelectElement) {
            select.disabled = isDisabled;
            select.setAttribute("aria-disabled", isDisabled ? "true" : "false");
          }
        };
        const wireBeReceptionMenu = (menu, panel) => {
          if (!(menu instanceof HTMLElement) || !(panel instanceof HTMLElement) || menu.dataset.convertBeWired === "1") {
            return;
          }
          const summary = menu.querySelector("summary.field-toggle-trigger");
          summary?.addEventListener("click", (event) => {
            if (menu.dataset.disabled === "true") return;
            event.preventDefault();
            menu.open = !menu.open;
            summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
          });
          menu.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            closeBeReceptionMenu(menu);
            summary?.focus?.();
          });
          document.addEventListener(
            "click",
            (event) => {
              if (!menu.open) return;
              if (menu.contains(event.target) || panel.contains(event.target)) return;
              closeBeReceptionMenu(menu);
            },
            true
          );
          menu.dataset.convertBeWired = "1";
        };
        const renderBeReceptionSelectField = ({
          fieldKey,
          labelText,
          menuId,
          panelId,
          displayId,
          placeholder,
          multiple = false
        } = {}) => `
          <label class="items-be-reception-form__field doc-history-modal__filter article-stock-depot-filter">
            <span>${labelText}</span>
            <div class="doc-dialog-model-picker__field">
              <details id="${menuId}" class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu" data-disabled="false">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-disabled="false">
                  <span id="${displayId}" class="model-select-display">${placeholder}</span>
                  ${CHEVRON_SVG}
                </summary>
                <div id="${panelId}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox"></div>
              </details>
              <select id="${CONVERT_BE_RECEPTION_IDS[fieldKey]}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1" ${multiple ? "multiple" : ""}>
                <option value="">${placeholder}</option>
              </select>
            </div>
          </label>
        `;
        const renderBeReceptionTimeField = () =>
          typeof w.BeReceptionTimeField?.render === "function"
            ? w.BeReceptionTimeField.render({
                inputId: CONVERT_BE_RECEPTION_IDS.time,
                panelId: CONVERT_BE_RECEPTION_IDS.timePanel
              })
            : `
              <label class="items-be-reception-form__field">
                <span>Heure</span>
                <input id="${CONVERT_BE_RECEPTION_IDS.time}" type="text" inputmode="numeric" placeholder="HH:MM" autocomplete="off">
              </label>
            `;
        const setBeReceptionSelectOptions = (
          select,
          records = [],
          { placeholder = "", selectedValue = "", selectedValues = [], valueKey = "id", labelKey = "name" } = {}
        ) => {
          if (!(select instanceof HTMLSelectElement)) return [];
          const isMultiple = !!select.multiple;
          const selectedSet = new Set(
            (isMultiple ? selectedValues : [selectedValue])
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
          );
          select.replaceChildren();
          const placeholderOption = document.createElement("option");
          placeholderOption.value = "";
          placeholderOption.textContent = placeholder;
          select.appendChild(placeholderOption);
          const values = [];
          records.forEach((record) => {
            const value = String(record?.[valueKey] || "").trim();
            const label = normalizeBeReceptionText(record?.[labelKey] || value);
            if (!value) return;
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label || value;
            option.selected = selectedSet.has(value);
            select.appendChild(option);
            if (option.selected) values.push(value);
          });
          if (!isMultiple) {
            const resolved = values[0] || "";
            select.value = resolved;
            return resolved ? [resolved] : [];
          }
          return values;
        };
        const renderBeReceptionDepotPanel = (section, records = [], selectedDepotId = "") => {
          const select = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.depot}`);
          const menu = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.depotMenu}`);
          const panel = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.depotPanel}`);
          const display = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.depotDisplay}`);
          if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
            return { selectedDepotId: "", selectedDepotLabel: "" };
          }
          const selectedValues = setBeReceptionSelectOptions(select, records, {
            placeholder: "Selectionner un depot",
            selectedValue: normalizeBeReceptionDepotId(selectedDepotId),
            valueKey: "id",
            labelKey: "name"
          });
          const selectedValue = selectedValues[0] || "";
          const selectedLabel = getSelectedOptionText(select);
          if (display) {
            display.textContent = selectedLabel || "Selectionner un depot";
            display.dataset.selected = selectedValue ? "true" : "false";
          }
          menu.dataset.selected = selectedValue ? "true" : "false";
          setBeReceptionPickerDisabled(menu, select, !records.length);
          panel.replaceChildren();
          if (!records.length) {
            const empty = document.createElement("p");
            empty.className = "model-select-empty";
            empty.textContent = "Aucun depot enregistre";
            panel.appendChild(empty);
          } else {
            records.forEach((record) => {
              const button = document.createElement("button");
              button.type = "button";
              button.className = "model-select-option";
              button.dataset.value = record.id;
              button.setAttribute("role", "option");
              button.textContent = record.name;
              const isActive = record.id === selectedValue;
              button.classList.toggle("is-active", isActive);
              button.setAttribute("aria-selected", isActive ? "true" : "false");
              button.addEventListener("click", () => {
                if (select.disabled) return;
                select.value = record.id;
                closeBeReceptionMenu(menu);
                selectedBeReception = {
                  ...normalizeBeReceptionChoice(selectedBeReception, { fallbackDate: selectedDate || today }),
                  depotId: record.id,
                  depot: record.name,
                  destinationId: "",
                  destinationIds: [],
                  destinationLabels: [],
                  destination: ""
                };
                try {
                  select.dispatchEvent(new Event("change", { bubbles: true }));
                } catch {}
              });
              panel.appendChild(button);
            });
          }
          wireBeReceptionMenu(menu, panel);
          return { selectedDepotId: selectedValue, selectedDepotLabel: selectedLabel };
        };
        const renderBeReceptionDestinationPanel = (
          section,
          locations = [],
          { selectedLocationIds = [], depotSelected = false } = {}
        ) => {
          const select = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.destination}`);
          const menu = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.destinationMenu}`);
          const panel = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.destinationPanel}`);
          const display = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.destinationDisplay}`);
          if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
            return { selectedLocationIds: [], selectedLocationLabels: [] };
          }
          const selectedIds = setBeReceptionSelectOptions(select, locations, {
            placeholder: depotSelected ? "Aucun emplacement" : "Selectionnez d'abord un depot",
            selectedValues: normalizeBeReceptionDestinationIds(selectedLocationIds),
            valueKey: "id",
            labelKey: "code"
          });
          const selectedLabels = normalizeBeReceptionDestinationLabels(
            selectedIds
              .map((id) => {
                const option = Array.from(select.options || []).find((entry) => entry.value === id);
                return option?.textContent || "";
              })
              .filter(Boolean)
          );
          const displayText = selectedLabels.length
            ? formatBeReceptionDestinationText(selectedLabels)
            : depotSelected
              ? "Aucun emplacement"
              : "Selectionnez d'abord un depot";
          if (display) {
            display.textContent = displayText;
            display.dataset.selected = selectedIds.length ? "true" : "false";
          }
          menu.dataset.selected = selectedIds.length ? "true" : "false";
          setBeReceptionPickerDisabled(menu, select, !depotSelected || !locations.length);
          panel.replaceChildren();
          if (!depotSelected) {
            const empty = document.createElement("p");
            empty.className = "model-select-empty";
            empty.textContent = "Selectionnez d'abord un depot";
            panel.appendChild(empty);
          } else if (!locations.length) {
            const empty = document.createElement("p");
            empty.className = "model-select-empty";
            empty.textContent = "Aucun emplacement";
            panel.appendChild(empty);
          } else {
            Array.from(select.options || []).forEach((option) => {
              if (!option.value) return;
              const button = document.createElement("button");
              button.type = "button";
              button.className = "model-select-option model-select-option--multiselect stock-location-option";
              button.dataset.value = option.value;
              button.setAttribute("role", "option");
              const checkbox = document.createElement("span");
              checkbox.className = "stock-location-option__checkbox";
              checkbox.setAttribute("aria-hidden", "true");
              const checkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              checkIcon.classList.add("stock-location-option__check");
              checkIcon.setAttribute("viewBox", "0 0 20 20");
              checkIcon.setAttribute("fill", "none");
              checkIcon.setAttribute("focusable", "false");
              checkIcon.setAttribute("aria-hidden", "true");
              const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
              checkPath.setAttribute("d", "M5 10.5L8.5 14L15 7.5");
              checkPath.setAttribute("stroke", "currentColor");
              checkPath.setAttribute("stroke-width", "2");
              checkPath.setAttribute("stroke-linecap", "round");
              checkPath.setAttribute("stroke-linejoin", "round");
              checkIcon.appendChild(checkPath);
              checkbox.appendChild(checkIcon);
              const label = document.createElement("span");
              label.className = "stock-location-option__label";
              label.textContent = normalizeBeReceptionText(option.textContent || "");
              button.append(checkbox, label);
              const isActive = selectedIds.includes(option.value);
              button.classList.toggle("is-active", isActive);
              button.setAttribute("aria-selected", isActive ? "true" : "false");
              button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (select.disabled) return;
                const currentIds = normalizeBeReceptionDestinationIds(
                  Array.from(select.selectedOptions || []).map((entry) => entry.value)
                );
                const hasValue = currentIds.includes(option.value);
                const nextIds = hasValue
                  ? currentIds.filter((entry) => entry !== option.value)
                  : [...currentIds, option.value];
                Array.from(select.options || []).forEach((entry) => {
                  entry.selected = nextIds.includes(entry.value);
                });
                try {
                  select.dispatchEvent(new Event("change", { bubbles: true }));
                } catch {}
              });
              panel.appendChild(button);
            });
          }
          wireBeReceptionMenu(menu, panel);
          return { selectedLocationIds: selectedIds, selectedLocationLabels: selectedLabels };
        };
        const syncBeReceptionSelectors = async (section) => {
          if (!(section instanceof HTMLElement)) return false;
          const syncToken = String((Number(section.dataset.beReceptionSyncToken || "0") || 0) + 1);
          section.dataset.beReceptionSyncToken = syncToken;
          selectedBeReception = normalizeBeReceptionChoice(selectedBeReception, {
            fallbackDate: selectedDate || today
          });
          const depots = await fetchBeReceptionDepotRecords();
          if (section.dataset.beReceptionSyncToken !== syncToken) return false;
          const depotState = renderBeReceptionDepotPanel(section, depots, selectedBeReception.depotId);
          const depotId = normalizeBeReceptionDepotId(depotState.selectedDepotId || "");
          const depotLabel = normalizeBeReceptionText(depotState.selectedDepotLabel || "");
          let locations = [];
          if (depotId) locations = await fetchBeReceptionLocationsForDepot(depotId);
          if (section.dataset.beReceptionSyncToken !== syncToken) return false;
          const destinationState = renderBeReceptionDestinationPanel(section, locations, {
            selectedLocationIds: selectedBeReception.destinationIds || [],
            depotSelected: !!depotId
          });
          selectedBeReception = normalizeBeReceptionChoice(
            {
              ...selectedBeReception,
              depotId,
              depot: depotId ? depotLabel : "",
              destinationId: destinationState.selectedLocationIds[0] || "",
              destinationIds: destinationState.selectedLocationIds,
              destinationLabels: destinationState.selectedLocationLabels,
              destination: destinationState.selectedLocationLabels.length
                ? formatBeReceptionDestinationText(destinationState.selectedLocationLabels)
                : ""
            },
            { fallbackDate: selectedDate || today }
          );
          updateConfirmState();
          return true;
        };
        const wireBeReceptionTimeInput = (section) => {
          const input = section?.querySelector?.(`#${CONVERT_BE_RECEPTION_IDS.time}`);
          const wrapper = input?.closest?.("[data-time-picker]") || null;
          const toggle = wrapper?.querySelector?.("[data-time-picker-toggle]") || null;
          const panel = wrapper?.querySelector?.("[data-time-picker-panel]") || null;
          if (!(input instanceof HTMLInputElement) || !(panel instanceof HTMLElement) || !toggle || input.dataset.convertTimeWired === "1") {
            return;
          }
          panel.innerHTML = `
            <div class="swb-time-picker__footer">
              <button type="button" class="swb-time-picker__footer-btn" data-convert-time-now>Maintenant</button>
              <button type="button" class="swb-time-picker__footer-btn swb-time-picker__footer-btn--muted" data-convert-time-clear>Effacer</button>
            </div>
          `;
          const setOpen = (open) => {
            panel.hidden = !open;
            wrapper.classList.toggle("is-open", !!open);
            input.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
          };
          toggle.addEventListener("click", (event) => {
            event.preventDefault();
            setOpen(panel.hidden);
          });
          panel.querySelector("[data-convert-time-now]")?.addEventListener("click", () => {
            input.value = formatBeReceptionTime();
            input.dispatchEvent(new Event("change", { bubbles: true }));
            setOpen(false);
          });
          panel.querySelector("[data-convert-time-clear]")?.addEventListener("click", () => {
            input.value = "";
            input.dispatchEvent(new Event("change", { bubbles: true }));
            setOpen(false);
          });
          document.addEventListener(
            "click",
            (event) => {
              if (wrapper.contains(event.target)) return;
              setOpen(false);
            },
            true
          );
          input.dataset.convertTimeWired = "1";
        };
        const createBeReceptionSection = () => {
          const section = document.createElement("fieldset");
          section.id = CONVERT_BE_RECEPTION_IDS.section;
          section.className = "section-box items-be-reception-form doc-history-convert__be-reception";
          section.hidden = true;
          section.innerHTML = `
            <legend>Informations de r&eacute;ception</legend>
            <div class="items-be-reception-form__grid">
              ${renderBeReceptionSelectField({
                fieldKey: "depot",
                labelText: "D&eacute;p&ocirc;t / Magasin",
                menuId: CONVERT_BE_RECEPTION_IDS.depotMenu,
                panelId: CONVERT_BE_RECEPTION_IDS.depotPanel,
                displayId: CONVERT_BE_RECEPTION_IDS.depotDisplay,
                placeholder: "Selectionner un depot"
              })}
              ${renderBeReceptionSelectField({
                fieldKey: "destination",
                labelText: "Emplacement de destination",
                menuId: CONVERT_BE_RECEPTION_IDS.destinationMenu,
                panelId: CONVERT_BE_RECEPTION_IDS.destinationPanel,
                displayId: CONVERT_BE_RECEPTION_IDS.destinationDisplay,
                placeholder: "Aucun emplacement",
                multiple: true
              })}
              <label class="items-be-reception-form__field">
                <span>Date de r&eacute;ception</span>
                <div class="swb-date-picker" data-date-picker>
                  <input id="${CONVERT_BE_RECEPTION_IDS.date}" type="text" inputmode="numeric" placeholder="AAAA-MM-JJ" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="${CONVERT_BE_RECEPTION_IDS.datePanel}">
                  <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle aria-label="Choisir une date de r&eacute;ception" aria-haspopup="dialog" aria-expanded="false" aria-controls="${CONVERT_BE_RECEPTION_IDS.datePanel}">
                    <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                      <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                    </svg>
                  </button>
                  <div class="swb-date-picker__panel" data-date-picker-panel hidden role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="${CONVERT_BE_RECEPTION_IDS.datePanel}"></div>
                </div>
              </label>
              ${renderBeReceptionTimeField()}
              <label class="items-be-reception-form__field items-be-reception-form__field--wide items-be-reception-form__field--source" for="${CONVERT_BE_RECEPTION_IDS.sourceRef}">
                <span>R&eacute;f&eacute;rence source</span>
                <div class="items-be-reception-form__input-group items-be-reception-form__input-group--source">
                  <input id="${CONVERT_BE_RECEPTION_IDS.sourceRef}" type="text" placeholder="ex : Facture d'achat / Bon de commande" autocomplete="off">
                </div>
              </label>
            </div>
          `;
          const reception = normalizeBeReceptionChoice(selectedBeReception, {
            fallbackDate: selectedDate || today
          });
          const dateInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.date}`);
          const timeInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.time}`);
          const sourceInput = section.querySelector(`#${CONVERT_BE_RECEPTION_IDS.sourceRef}`);
          if (dateInput) {
            dateInput.value = reception.date || selectedDate || today;
            if (createDatePicker) {
              const picker = createDatePicker(dateInput, {
                allowManualInput: true,
                onChange(value) {
                  beReceptionDateTouched = true;
                  selectedBeReception = normalizeBeReceptionChoice(
                    { ...selectedBeReception, date: value || "" },
                    { fallbackDate: selectedDate || today }
                  );
                  updateConfirmState();
                }
              });
              if (picker) picker.setValue(dateInput.value, { silent: true });
            } else {
              dateInput.addEventListener("input", () => {
                beReceptionDateTouched = true;
                selectedBeReception = normalizeBeReceptionChoice(
                  { ...selectedBeReception, date: dateInput.value || "" },
                  { fallbackDate: selectedDate || today }
                );
                updateConfirmState();
              });
            }
          }
          if (timeInput) {
            timeInput.value = reception.time || formatBeReceptionTime();
            timeInput.addEventListener("input", () => {
              selectedBeReception = normalizeBeReceptionChoice(
                { ...selectedBeReception, time: timeInput.value || "" },
                { fallbackDate: selectedDate || today }
              );
              updateConfirmState();
            });
            timeInput.addEventListener("change", () => {
              selectedBeReception = normalizeBeReceptionChoice(
                { ...selectedBeReception, time: timeInput.value || "" },
                { fallbackDate: selectedDate || today }
              );
              updateConfirmState();
            });
          }
          if (sourceInput) {
            sourceInput.value = reception.sourceRef || "";
            sourceInput.addEventListener("input", () => {
              selectedBeReception = normalizeBeReceptionChoice(
                { ...selectedBeReception, sourceRef: sourceInput.value || "" },
                { fallbackDate: selectedDate || today }
              );
              updateConfirmState();
            });
          }
          section
            .querySelector(`#${CONVERT_BE_RECEPTION_IDS.depot}`)
            ?.addEventListener("change", () => void syncBeReceptionSelectors(section));
          section
            .querySelector(`#${CONVERT_BE_RECEPTION_IDS.destination}`)
            ?.addEventListener("change", () => {
              selectedBeReception = readBeReceptionFormValues(section, selectedBeReception);
              void syncBeReceptionSelectors(section);
            });
          wireBeReceptionTimeInput(section);
          void syncBeReceptionSelectors(section);
          return section;
        };

        let floatingScrollContainers = [];
        let outsideClickHandler = null;

        const detachFloatingListeners = () => {
          window.removeEventListener("resize", positionModelPanel, true);
          window.removeEventListener("scroll", positionModelPanel, true);
          floatingScrollContainers.forEach((node) => {
            try {
              node.removeEventListener("scroll", positionModelPanel, true);
            } catch {}
          });
          if (outsideClickHandler) {
            document.removeEventListener("click", outsideClickHandler, true);
            outsideClickHandler = null;
          }
          floatingScrollContainers = [];
        };

        const collectFloatingScrollContainers = () => {
          const parents = [];
          let node = modelMenu?.parentElement || null;
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

        const clearFloatingPanelStyles = () => {
          modelPanel.classList.remove("is-floating");
          modelPanel.style.position = "";
          modelPanel.style.display = "";
          modelPanel.style.top = "";
          modelPanel.style.left = "";
          modelPanel.style.right = "";
          modelPanel.style.minWidth = "";
          modelPanel.style.maxHeight = "";
          modelPanel.style.zIndex = "";
        };

        const restoreFloatingPanel = () => {
          if (modelPanelPlaceholder.parentNode && modelPanel.parentNode !== modelPanelPlaceholder.parentNode) {
            try {
              modelPanelPlaceholder.parentNode.insertBefore(modelPanel, modelPanelPlaceholder);
            } catch {}
          }
          modelPanelPortaled = false;
        };

        const resetFloatingPanel = () => {
          detachFloatingListeners();
          clearFloatingPanelStyles();
          restoreFloatingPanel();
        };

        const setModelSelection = (value, { closeMenu = true } = {}) => {
          selectedModel = value || "";
          modelSelect.value = selectedModel;
          modelDisplay.textContent = getModelLabel(selectedModel);
          modelPanel.querySelectorAll(".model-select-option").forEach((btn) => {
            const isActive = btn.dataset.value === selectedModel;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          updateConfirmState();
          if (closeMenu) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
          }
        };

        const shouldFloatModelPanel = () => {
          if (!modelPanel || !modelSummary) return false;
          const panelHeight = modelPanel.offsetHeight || modelPanel.scrollHeight || 0;
          if (!panelHeight) return false;
          const containers = collectFloatingScrollContainers();
          if (!containers.length) return false;
          const container = containers[0];
          const containerRect = container.getBoundingClientRect();
          const summaryRect = modelSummary.getBoundingClientRect();
          const gap = 4;
          const availableBelow = containerRect.bottom - summaryRect.bottom - gap;
          return availableBelow < panelHeight;
        };

        const positionModelPanel = () => {
          if (!modelPanel || !modelSummary) return;
          const rect = modelSummary.getBoundingClientRect();
          const gap = 4;
          const panelWidth = Math.max(rect.width, 180);
          const viewportPadding = 8;
          const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
          const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);
          const top = rect.bottom + gap;
          modelPanel.style.top = `${Math.round(top)}px`;
          modelPanel.style.left = `${Math.round(left)}px`;
          modelPanel.style.right = "auto";
          modelPanel.style.minWidth = `${Math.round(panelWidth)}px`;
          modelPanel.style.maxHeight = "fit-content";
        };

        const attachFloatingListeners = () => {
          detachFloatingListeners();
          floatingScrollContainers = collectFloatingScrollContainers();
          window.addEventListener("resize", positionModelPanel, true);
          window.addEventListener("scroll", positionModelPanel, true);
          floatingScrollContainers.forEach((node) => {
            try {
              node.addEventListener("scroll", positionModelPanel, true);
            } catch {}
          });
          outsideClickHandler = (evt) => {
            if (modelMenu.contains(evt.target) || modelPanel.contains(evt.target)) return;
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
          };
          document.addEventListener("click", outsideClickHandler, true);
        };

        const portalFloatingPanel = () => {
          if (modelPanelPortaled) {
            positionModelPanel();
            return;
          }
          if (modelPanel.parentNode !== document.body) {
            try {
              document.body.appendChild(modelPanel);
            } catch {}
          }
          modelPanel.classList.add("is-floating");
          modelPanel.style.position = "fixed";
          modelPanel.style.display = "flex";
          modelPanel.style.zIndex = "100010";
          positionModelPanel();
          attachFloatingListeners();
          modelPanelPortaled = true;
        };

        const openFloatingPanel = () => {
          if (!shouldFloatModelPanel()) {
            resetFloatingPanel();
            return;
          }
          portalFloatingPanel();
        };
        const isModelPickerDisabled = () => modelMenu.dataset.disabled === "true";
        const setModelPickerEnabled = (enabled) => {
          const isEnabled = !!enabled;
          modelMenu.dataset.disabled = isEnabled ? "false" : "true";
          modelSummary.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          if (!isEnabled) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            modelSummary.tabIndex = -1;
            resetFloatingPanel();
          } else {
            modelSummary.removeAttribute("tabindex");
          }
          modelSelect.disabled = !isEnabled;
          modelSelect.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          modelPanel.querySelectorAll(".model-select-option").forEach((btn) => {
            btn.disabled = !isEnabled;
            btn.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          });
        };

        const renderModelOptions = () => {
          modelPanel.textContent = "";
          modelSelect.innerHTML = "";
          const placeholderOption = document.createElement("option");
          placeholderOption.value = "";
          placeholderOption.textContent = MODEL_PLACEHOLDER;
          modelSelect.appendChild(placeholderOption);
          visibleModelOptions.forEach((opt) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "model-select-option";
            btn.dataset.value = opt.value;
            btn.setAttribute("role", "option");
            btn.setAttribute("aria-selected", opt.value === selectedModel ? "true" : "false");
            btn.textContent = opt.label;
            btn.addEventListener("click", () => setModelSelection(opt.value));
            modelPanel.appendChild(btn);
            const optEl = document.createElement("option");
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            modelSelect.appendChild(optEl);
          });
        };
        const applyModelFilterForTarget = (targetValue) => {
          visibleModelOptions = resolveVisibleModelOptions(targetValue);
          renderModelOptions();
          setModelPickerEnabled(visibleModelOptions.length > 0);
          const hasSelectedModel = visibleModelOptions.some((opt) => opt.value === selectedModel);
          const fallbackModel = hasSelectedModel ? selectedModel : "";
          setModelSelection(fallbackModel, { closeMenu: false });
        };

        visibleModelOptions = resolveVisibleModelOptions(getSelectedTargetValue() || targetDocType);
        renderModelOptions();
        setModelPickerEnabled(visibleModelOptions.length > 0);
        setModelSelection(
          visibleModelOptions.some((opt) => opt.value === selectedModel) ? selectedModel : "",
          { closeMenu: false }
        );

        modelSummary.addEventListener("click", (evt) => {
          if (isModelPickerDisabled()) {
            evt.preventDefault();
            return;
          }
          evt.preventDefault();
          const nextOpen = !modelMenu.open;
          modelMenu.open = nextOpen;
          modelSummary.setAttribute("aria-expanded", nextOpen ? "true" : "false");
          if (nextOpen) {
            openFloatingPanel();
            const firstBtn = modelPanel.querySelector(".model-select-option:not([disabled])");
            firstBtn?.focus();
          } else {
            resetFloatingPanel();
            modelSummary.focus();
          }
        });

        modelMenu.addEventListener("toggle", () => {
          if (isModelPickerDisabled()) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
            return;
          }
          modelSummary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
          if (modelMenu.open) openFloatingPanel();
          else {
            resetFloatingPanel();
          }
        });

        modelPanel.addEventListener("keydown", (evt) => {
          if (isModelPickerDisabled()) return;
          if (evt.key === "Escape") {
            evt.preventDefault();
            setModelSelection(selectedModel);
            modelSummary.focus();
          }
        });

        wrapper.addEventListener(
          "click",
          (evt) => {
            if (!modelMenu.contains(evt.target) && !modelPanel.contains(evt.target)) {
              modelMenu.open = false;
              modelSummary.setAttribute("aria-expanded", "false");
              resetFloatingPanel();
            }
          },
          { capture: true }
        );

        modelField.appendChild(modelMenu);
        modelField.appendChild(modelSelect);
        modelGroup.appendChild(modelLabel);
        modelGroup.appendChild(modelField);

        let targetGroup = null;
        if (showTargetChoice) {
          const targetOptionValues = (
            normalizedTargetDocTypes.length ? normalizedTargetDocTypes : [defaultTargetDocType || "facture"]
          ).filter(Boolean);
          const activeTargetValue =
            (targetDocType && targetOptionValues.includes(targetDocType) && targetDocType) ||
            (defaultTargetDocType &&
              targetOptionValues.includes(defaultTargetDocType) &&
              defaultTargetDocType) ||
            targetOptionValues[0] ||
            "facture";
          targetDocType = activeTargetValue;
          const targetOptionsMarkup = targetOptionValues
            .map((docTypeValue) => {
              const isSelected = docTypeValue === activeTargetValue;
              const selectedClass = isSelected ? " is-active" : "";
              const ariaSelected = isSelected ? "true" : "false";
              const ariaChecked = isSelected ? "true" : "false";
              const checkedAttr = isSelected ? " checked" : "";
              const label = escapeHtmlText(getDocTypeDisplayLabel(docTypeValue));
              return `<label class="toggle-option doc-type-toggle currency-toggle${selectedClass}" data-doc-type-option="${docTypeValue}" aria-selected="${ariaSelected}">
                  <input type="radio" name="docHistoryConvertTarget" value="${docTypeValue}" class="col-toggle"${checkedAttr} aria-checked="${ariaChecked}">
                  <span class="model-save-dot">${label}</span>
                </label>`;
            })
            .join("");
          const targetSelectMarkup = targetOptionValues
            .map((docTypeValue) => {
              const isSelected = docTypeValue === activeTargetValue;
              const selectedAttr = isSelected ? " selected" : "";
              const label = escapeHtmlText(getDocTypeDisplayLabel(docTypeValue));
              return `<option value="${docTypeValue}"${selectedAttr}>${label}</option>`;
            })
            .join("");
          targetGroup = document.createElement("label");
          targetGroup.className = "doc-history-convert__field doc-type-field";
          targetGroup.innerHTML = `
            <span class="model-save-dot">Convertir vers:</span>
            <div class="doc-type-field__controls">
              <div class="doc-type-panel doc-type-panel--inline doc-history-convert-panel currency-panel currency-panel--inline" role="radiogroup" aria-label="Convertir vers">
                ${targetOptionsMarkup}
              </div>
              <select class="doc-type-select" aria-hidden="true" tabindex="-1">
                ${targetSelectMarkup}
              </select>
            </div>
          `;
          const targetPanel = targetGroup.querySelector(".doc-type-panel");
          targetRadios = Array.from(targetGroup.querySelectorAll('input[name="docHistoryConvertTarget"]'));
          targetSelect = targetGroup.querySelector(".doc-type-select");
          syncTargetToggle = (value) => {
            const nextValue = String(value || "").toLowerCase();
            targetDocType = nextValue || targetDocType;
            targetRadios.forEach((radio) => {
              const isMatch = String(radio.value || "").toLowerCase() === nextValue;
              if (isMatch && radio.disabled) return;
              radio.checked = isMatch;
              radio.setAttribute("aria-checked", isMatch ? "true" : "false");
              const label = radio.closest(".doc-type-toggle");
              if (label) {
                label.classList.toggle("is-active", isMatch);
                label.setAttribute("aria-selected", isMatch ? "true" : "false");
              }
            });
            if (targetSelect) targetSelect.value = nextValue;
            applyModelFilterForTarget(nextValue);
            updatePaymentVisibility();
            updateBeReceptionVisibility();
          };
          targetRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
              if (radio.disabled) return;
              syncTargetToggle(radio.value);
            });
          });
          if (targetPanel) {
            targetPanel.addEventListener("click", (evt) => {
              const btn = evt.target.closest(".doc-type-toggle input[type=\"radio\"]");
              if (btn && !btn.disabled) syncTargetToggle(btn.value);
            });
          }
          updateTargetDocTypeAvailability();
          syncTargetToggle(
            targetDocType ||
              getSelectedTargetValue() ||
              defaultTargetDocType ||
              targetOptionValues[0] ||
              "facture"
          );
        } else {
          targetDocType = defaultTargetDocType || targetDocType || "facture";
          updateTargetDocTypeAvailability();
          applyModelFilterForTarget(targetDocType);
        }

        const dateGroup = document.createElement("label");
        dateGroup.className = "doc-history-convert__field doc-date-field";
        dateGroup.innerHTML = `
          <span>Date</span>
          <div class="swb-date-picker" data-date-picker>
            <input
              id="docHistoryConvertDate"
              type="text"
              inputmode="numeric"
              placeholder="AAAA-MM-JJ"
              autocomplete="off"
              spellcheck="false"
              aria-haspopup="dialog"
              aria-expanded="false"
              role="combobox"
              aria-controls="docHistoryConvertDatePanel"
            >
            <button
              type="button"
              class="swb-date-picker__toggle"
              data-date-picker-toggle
              aria-label="Choisir une date"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-controls="docHistoryConvertDatePanel"
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
              id="docHistoryConvertDatePanel"
            ></div>
          </div>
        `;
        const dateInput = dateGroup.querySelector("#docHistoryConvertDate");
        const initialDate = today;
        selectedDate = initialDate;
        if (dateInput) {
          dateInput.value = initialDate;
          if (createDatePicker) {
            const picker = createDatePicker(dateInput, {
              allowManualInput: true,
              onChange(value) {
                selectedDate = value || "";
                if (!beReceptionDateTouched) {
                  selectedBeReception = normalizeBeReceptionChoice(
                    { ...selectedBeReception, date: selectedDate },
                    { fallbackDate: selectedDate || today }
                  );
                  const beDateInput = dialogBeReceptionSection?.querySelector?.(
                    `#${CONVERT_BE_RECEPTION_IDS.date}`
                  );
                  if (beDateInput && beDateInput.value !== selectedDate) {
                    beDateInput.value = selectedDate;
                  }
                }
                updateConfirmState();
              }
            });
            if (picker) picker.setValue(initialDate, { silent: true });
          } else {
            dateInput.readOnly = false;
            dateInput.addEventListener("input", () => {
              selectedDate = dateInput.value || "";
              if (!beReceptionDateTouched) {
                selectedBeReception = normalizeBeReceptionChoice(
                  { ...selectedBeReception, date: selectedDate },
                  { fallbackDate: selectedDate || today }
                );
                const beDateInput = dialogBeReceptionSection?.querySelector?.(
                  `#${CONVERT_BE_RECEPTION_IDS.date}`
                );
                if (beDateInput && beDateInput.value !== selectedDate) {
                  beDateInput.value = selectedDate;
                }
              }
              updateConfirmState();
            });
          }
        }

        paymentRow = document.createElement("div");
        paymentRow.className = "doc-dialog-model-picker__row";
        paymentRow.style.gridColumn = "1 / -1";
        let syncPaymentMethodState = () => {};
        const paymentStatusGroup = createMenuGroup({
          idPrefix: "docPaymentStatus",
          labelText: "Statut de la facture",
          placeholderText: "Choisir un statut",
          options: FACTURE_STATUS_OPTIONS,
          selectedValue: selectedFactureStatus,
          onChange: (value) => {
            selectedFactureStatus = value || "";
            syncPaymentMethodState();
            updateAcompteVisibility();
          }
        });
        paymentStatusSelectEl = paymentStatusGroup.hiddenSelect;
        const paymentMethodGroup = createMenuGroup({
          idPrefix: "docPaymentMethod",
          labelText: "Mode de paiement",
          placeholderText: "Choisir un mode",
          options: PAYMENT_METHOD_OPTIONS,
          selectedValue: selectedPaymentMethod,
          onChange: (value) => {
            selectedPaymentMethod = value || "";
            if (selectedPaymentMethod && selectedPaymentMethod !== NO_PAYMENT_METHOD_LABEL) {
              lastPaymentMethod = selectedPaymentMethod;
            }
            updateConfirmState();
          }
        });
        paymentMethodSelectEl = paymentMethodGroup.hiddenSelect;
        const paymentReferenceField = document.createElement("div");
        paymentReferenceField.className = "doc-history-convert__field";
        const paymentReferenceLabel = document.createElement("label");
        paymentReferenceLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
        const paymentReferenceId = `docHistoryPaymentReferenceInput-${Date.now()}`;
        paymentReferenceLabel.setAttribute("for", paymentReferenceId);
        paymentReferenceLabel.textContent = "R\u00e9f. paiement";
        const paymentReferenceInput = document.createElement("input");
        paymentReferenceInput.id = paymentReferenceId;
        paymentReferenceInput.type = "text";
        paymentReferenceInput.className = "doc-history-convert__input";
        paymentReferenceInput.placeholder = "R\u00e9f. paiement";
        paymentReferenceInput.value = selectedPaymentReference;
        paymentReferenceInput.addEventListener("input", () => {
          selectedPaymentReference = String(paymentReferenceInput.value || "").trim();
        });
        paymentReferenceField.append(paymentReferenceLabel, paymentReferenceInput);
        paymentReferenceInputEl = paymentReferenceInput;
        syncPaymentMethodState = () => {
          if (!paymentMethodGroup) return;
          const shouldDisable = isNoPaymentMethodStatus(selectedFactureStatus);
          if (shouldDisable) {
            if (selectedPaymentMethod && selectedPaymentMethod !== NO_PAYMENT_METHOD_LABEL) {
              lastPaymentMethod = selectedPaymentMethod;
            }
            selectedPaymentMethod = NO_PAYMENT_METHOD_LABEL;
            paymentMethodGroup.setSelection(selectedPaymentMethod, {
              closeMenu: false,
              notify: false,
              forceLabel: NO_PAYMENT_METHOD_LABEL
            });
            paymentMethodGroup.setDisabled(true);
            if (paymentReferenceInputEl) paymentReferenceInputEl.disabled = true;
          } else {
            paymentMethodGroup.setDisabled(false);
            if (selectedPaymentMethod === NO_PAYMENT_METHOD_LABEL) {
              selectedPaymentMethod = lastPaymentMethod || "";
            }
            paymentMethodGroup.setSelection(selectedPaymentMethod, {
              closeMenu: false,
              notify: false
            });
            if (paymentReferenceInputEl) paymentReferenceInputEl.disabled = false;
          }
          updateConfirmState();
        };
        syncPaymentMethodState();
        paymentRow.append(
          paymentStatusGroup.group,
          paymentMethodGroup.group,
          paymentReferenceField
        );

        acompteRow = document.createElement("div");
        acompteRow.className = "doc-dialog-model-picker__row";
        acompteRow.style.gridColumn = "1 / -1";
        acompteRow.hidden = true;
        acompteRow.style.display = "none";
        const paidField = document.createElement("label");
        paidField.className = "doc-history-convert__field";
        paidField.innerHTML = `
          <span>Pay\u00e9</span>
          <input id="acomptePaid" class="doc-history-convert__input" type="number" inputmode="decimal" min="0" step="0.01" value="0">
        `;
        acomptePaidInput = paidField.querySelector("#acomptePaid");
        if (acomptePaidInput) {
          const entryPaid = Number(entry?.paid);
          const initialPaid = Number.isFinite(entryPaid) ? entryPaid : 0;
          acomptePaidInput.value = String(initialPaid);
          selectedPaidAmount = initialPaid;
          acomptePaidInput.addEventListener("input", () => {
            updateAcompteAmounts(normalizePaidValue(acomptePaidInput.value));
          });
        }
        const dueField = document.createElement("label");
        dueField.className = "doc-history-convert__field";
        dueField.innerHTML = `
          <span>Solde d\u00fb</span>
          <input id="acompteDue" class="doc-history-convert__input" readonly>
        `;
        acompteDueInput = dueField.querySelector("#acompteDue");
        if (acompteDueInput) acompteDueInput.readOnly = true;
        acompteRow.append(paidField, dueField);
        updateAcompteVisibility = () => {
          if (!acompteRow) return;
          const show = isFactureTarget() && isPartialStatus();
          acompteRow.hidden = !show;
          acompteRow.style.display = show ? "grid" : "none";
          if (show) updateAcompteAmounts(selectedPaidAmount);
        };
        if (supportsBonEntreeTarget) {
          beReceptionSection = createBeReceptionSection();
        }

        if (targetGroup) wrapper.appendChild(targetGroup);
        wrapper.appendChild(modelGroup);
        wrapper.appendChild(dateGroup);
        wrapper.appendChild(paymentRow);
        wrapper.appendChild(acompteRow);
        if (beReceptionSection) wrapper.appendChild(beReceptionSection);
        submitErrorElement = document.createElement("p");
        submitErrorElement.className = "doc-dialog-error";
        submitErrorElement.hidden = true;
        submitErrorElement.style.display = "none";
        wrapper.appendChild(submitErrorElement);
        container.appendChild(wrapper);
        dialogModelSelect = modelSelect;
        dialogDateInput = dateInput;
        dialogPaymentMethodSelect = paymentMethodSelectEl;
        dialogPaymentStatusSelect = paymentStatusSelectEl;
        dialogPaymentReferenceInput = paymentReferenceInputEl;
        dialogAcomptePaidInput = acomptePaidInput;
        dialogBeReceptionSection = beReceptionSection;
        dialogTargetSelect = targetSelect;
        dialogTargetRadios = targetRadios.slice();
        updatePaymentVisibility();
        updateBeReceptionVisibility();
      }
    });
    if (!confirmed) return null;
    syncSelectionsFromForm();
    const finalizedChoices = submittedChoices || buildChoicePayload();
    if (submitHandler) {
      return {
        submitted: submitResult !== false,
        submitResult,
        choices: finalizedChoices
      };
    }
    return finalizedChoices;
  }

  function forceDocTypeSelection(docType) {
    const normalized = String(docType || "facture").toLowerCase();
    const docTypeEl = getEl("docType");
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    meta.docType = normalized;
    if (docTypeEl) {
      docTypeEl.value = normalized;
      try {
        docTypeEl.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    }
    if (typeof w.syncDocTypeMenuUi === "function") {
      w.syncDocTypeMenuUi(normalized, { updateSelect: true });
    }
    if (typeof w.syncInvoiceNumberControls === "function") {
      w.syncInvoiceNumberControls({
        force: true,
        useNextIfEmpty: true,
        overrideWithNext: true
      });
    }
  }

  function syncModelSelectionUi(modelName) {
    const name = String(modelName || "").trim();
    if (!name || typeof getEl !== "function") return;
    const modelSelect = getEl("modelSelect");
    const modelActionsSelect = getEl("modelActionsSelect");
    if (modelSelect && modelSelect.value !== name) modelSelect.value = name;
    if (modelActionsSelect && modelActionsSelect.value !== name) modelActionsSelect.value = name;
    if (modelSelect) {
      w.__suppressModelApplyOnce = true;
      try {
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    }
  }

  const ensureNextNumberForDocType = async (docType = "facture") => {
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    const normalizedDocType = String(docType || meta.docType || "facture").toLowerCase();
    meta.docType = normalizedDocType;
    if (isManualNumberDocType(normalizedDocType)) {
      const inputNumber = getEl("invNumber")?.value;
      const resolved = String(inputNumber ?? meta.number ?? "").trim();
      if (resolved && meta.number !== resolved) meta.number = resolved;
      return resolved || "";
    }
    const lengthRaw = getEl("invNumberLength")?.value ?? meta.numberLength ?? 4;
    const normalizedLength =
      typeof normalizeInvoiceNumberLength === "function"
        ? normalizeInvoiceNumberLength(lengthRaw, meta.numberLength || 4)
        : Number(lengthRaw) || Number(meta.numberLength) || 4;
    meta.numberLength = normalizedLength;
    const dateValue = meta.date || getEl("invDate")?.value || "";
    const prefixValue = getEl("invNumberPrefix")?.value || "";
    if (typeof w.electronAPI?.previewDocumentNumber === "function") {
      try {
        const res = await w.electronAPI.previewDocumentNumber({
          docType: normalizedDocType,
          date: dateValue,
          numberLength: normalizedLength,
          prefix: prefixValue,
          numberFormat: meta.numberFormat
        });
        if (res?.ok && res.number) {
          meta.number = res.number;
          meta.previewNumber = res.number;
          if (res.prefix) {
            meta.numberPrefix = res.prefix;
            const prefixInput = getEl("invNumberPrefix");
            if (prefixInput && !String(prefixInput.value || "").trim()) {
              prefixInput.value = res.prefix;
            }
          }
        }
      } catch (err) {
        console.warn("preview number failed", err);
      }
    }
    if (typeof w.syncInvoiceNumberControls === "function") {
      w.syncInvoiceNumberControls({ force: true });
      const inputNumber = getEl("invNumber")?.value;
      if (inputNumber) meta.number = inputNumber;
    }
    return meta.number || "";
  };


  async function saveConvertedDocument(
    docType,
    {
      dateOverride,
      convertedFrom,
      paymentMethod,
      paymentReference,
      historyStatus,
      paidAmount,
      beReception,
      beReceptionRequireStorageFields = true
    } = {}
  ) {
    const logConvert = (stage, data) => {
      try {
        console.info("[doc-convert]", stage, data || {});
      } catch {}
    };
    const normalizedDocType = String(docType || "facture").toLowerCase();
    const isFacture = normalizedDocType === "facture";
    const isBonEntree = normalizedDocType === "be";
    const normalizedPaymentMethod = String(paymentMethod || "").trim();
    const normalizedPaymentReference = String(paymentReference || "").trim();
    const normalizedStatus = normalizeFactureStatusValue(historyStatus);
    let payeePaymentDelta = null;
    const resolvedPaymentMethod = isNoPaymentMethodStatus(normalizedStatus)
      ? NO_PAYMENT_METHOD_LABEL
      : normalizedPaymentMethod === NO_PAYMENT_METHOD_LABEL
        ? ""
        : normalizedPaymentMethod;
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    meta.docType = normalizedDocType;
    const date =
      (dateOverride || meta.date || getEl("invDate")?.value || new Date().toISOString().slice(0, 10)).slice(0, 10);
    meta.date = date;
    let normalizedBeReception = null;
    if (isBonEntree) {
      const validation = validateBeReceptionChoice(
        beReception || meta.beReception || {},
        {
          fallbackDate: date,
          requireStorageFields: beReceptionRequireStorageFields !== false
        }
      );
      if (!validation.ok) {
        logConvert("be-reception-validation-failed", {
          error: String(validation.error || "")
        });
        return { ok: false, error: validation.error || "Informations de reception incompletes." };
      }
      normalizedBeReception = applyBeReceptionChoiceToMeta(meta, validation.value, {
        fallbackDate: date
      });
    }
    const normalizedConvertedFrom = normalizeConvertedFrom(convertedFrom);
    if (normalizedConvertedFrom) {
      meta.convertedFrom = normalizedConvertedFrom;
    } else if ("convertedFrom" in meta) {
      delete meta.convertedFrom;
    }
    if (normalizedDocType === AVOIR_DOC_TYPE) {
      // Credit notes must keep their own numbering identity.
      meta.numberFormat = AVOIR_NUMBER_FORMAT;
      meta.numberPrefix = AVOIR_NUMBER_PREFIX;
      const invNumberPrefixInput = getEl("invNumberPrefix");
      if (invNumberPrefixInput && invNumberPrefixInput.value !== AVOIR_NUMBER_PREFIX) {
        invNumberPrefixInput.value = AVOIR_NUMBER_PREFIX;
      }
      const invNumberInput = getEl("invNumber");
      if (invNumberInput && invNumberInput.value) invNumberInput.value = "";
      meta.number = "";
      meta.previewNumber = "";
    }
    const assignedNumber = await ensureNextNumberForDocType(normalizedDocType);
    logConvert("generated-number", {
      targetDocType: normalizedDocType,
      assignedNumber: String(assignedNumber || ""),
      sourceNumber: String(convertedFrom?.number || "")
    });
    meta.number = assignedNumber || meta.number || getEl("invNumber")?.value || meta.number || "";
      const normalizedLength =
        typeof normalizeInvoiceNumberLength === "function"
          ? normalizeInvoiceNumberLength(meta.numberLength || getEl("invNumberLength")?.value || 4, meta.numberLength || 4)
          : Number(meta.numberLength || getEl("invNumberLength")?.value || 4) || 4;
      meta.numberLength = normalizedLength;
      meta.numberYear = extractYearDigits(date) || meta.numberYear || null;
      if (meta.historyPath && typeof w.releaseDocumentEditLock === "function") {
        w.releaseDocumentEditLock(meta.historyPath);
      }
    meta.historyPath = null;
    meta.historyDocType = normalizedDocType;
    if (isFacture) {
      if (resolvedPaymentMethod) meta.paymentMethod = resolvedPaymentMethod;
      else if ("paymentMethod" in meta) delete meta.paymentMethod;
      if (!isNoPaymentMethodStatus(normalizedStatus) && normalizedPaymentReference) {
        meta.paymentReference = normalizedPaymentReference;
        meta.paymentRef = normalizedPaymentReference;
      } else {
        if ("paymentReference" in meta) delete meta.paymentReference;
        if ("paymentRef" in meta) delete meta.paymentRef;
      }
      const normalizedStatusValue = normalizedStatus;
      if (
        (normalizedStatusValue === "payee" || normalizedStatusValue === "partiellement-payee") &&
        !String(meta.paymentDate || "").trim()
      ) {
        meta.paymentDate = date;
      }
      if (isNoPaymentMethodStatus(normalizedStatusValue) && "paymentDate" in meta) {
        delete meta.paymentDate;
      }
      meta.status = normalizedStatus;
    } else {
      if ("paymentMethod" in meta) delete meta.paymentMethod;
      if ("paymentReference" in meta) delete meta.paymentReference;
      if ("paymentRef" in meta) delete meta.paymentRef;
      if ("paymentDate" in meta) delete meta.paymentDate;
      if ("status" in meta) delete meta.status;
    }
    if (isBonEntree && normalizedBeReception) {
      applyBeReceptionChoiceToMeta(meta, normalizedBeReception, { fallbackDate: date });
    }
    if (!meta.number && !isManualNumberDocType(normalizedDocType)) {
      const fallbackPrefix =
        normalizedDocType === "facture"
          ? "Fact"
          : normalizedDocType === "avoir"
            ? "AV"
          : normalizedDocType === "devis"
            ? "Dev"
            : normalizedDocType
              ? normalizedDocType.toUpperCase()
              : "Doc";
      const fallbackNumber =
        typeof formatInvoiceNumber === "function"
          ? formatInvoiceNumber(1, normalizedLength, { docType: normalizedDocType, date, meta })
          : `${fallbackPrefix}_${date.replace(/-/g, "") || "1"}-1`;
      meta.number = fallbackNumber;
    }
    const invNumberInput = getEl("invNumber");
    if (invNumberInput && invNumberInput.value !== meta.number) {
      invNumberInput.value = meta.number;
    }

    try {
      if (w.SEM?.readInputs) w.SEM.readInputs();
      else if (typeof w.readInputs === "function") w.readInputs();
    } catch {}
    if (isBonEntree && normalizedBeReception) {
      applyBeReceptionChoiceToMeta(meta, normalizedBeReception, { fallbackDate: date });
    }
    const paidAmountValue = Number(paidAmount);
    if (
      isFacture &&
      normalizedStatus === "partiellement-payee" &&
      Number.isFinite(paidAmountValue)
    ) {
      const paidValue = Math.max(0, paidAmountValue);
      const acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : (meta.acompte = {});
      acompte.enabled = true;
      acompte.paid = paidValue;
      const acompteEnabledInput = getEl("acompteEnabled");
      if (acompteEnabledInput) acompteEnabledInput.checked = true;
      const acomptePaidInput = getEl("acomptePaid");
      if (acomptePaidInput) acomptePaidInput.value = String(paidValue);
    }
    if (isFacture && normalizedStatus === "payee") {
      const previousPaidRaw = Number(
        meta.acompte?.paid ?? meta?.acompte?.paid ?? NaN
      );
      const previousPaid = Number.isFinite(previousPaidRaw) ? previousPaidRaw : 0;
      const paymentDateValue =
        meta.paymentDate || date || new Date().toISOString().slice(0, 10);
      if (paymentDateValue) meta.paymentDate = paymentDateValue;
      const totalsSnapshot = typeof w.SEM?.computeTotalsReturn === "function"
        ? w.SEM.computeTotalsReturn()
        : null;
      const totalValue = Number(
        totalsSnapshot?.totalTTC ?? totalsSnapshot?.totalHT ?? totalsSnapshot?.grand ?? NaN
      );
      if (Number.isFinite(totalValue) && totalValue > 0) {
        const acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : (meta.acompte = {});
        acompte.enabled = true;
        acompte.paid = totalValue;
        acompte.base = totalValue;
        acompte.remaining = 0;
        payeePaymentDelta = Math.max(0, totalValue - previousPaid);
      }
    }
    try {
      w.SEM?.computeTotals?.();
    } catch {}

    const snapshot =
      (w.SEM?.captureForm && w.SEM.captureForm({ includeCompany: true })) ||
      (w.SEM?.state ? { ...w.SEM.state } : st);
    const snapMeta = snapshot.meta && typeof snapshot.meta === "object" ? snapshot.meta : (snapshot.meta = {});
    Object.assign(snapMeta, meta);
    snapMeta.docType = normalizedDocType;
    snapMeta.date = date;
    snapMeta.number = meta.number;
    snapMeta.numberLength = meta.numberLength;
    snapMeta.numberYear = meta.numberYear;
    snapMeta.historyPath = null;
    snapMeta.historyDocType = normalizedDocType;
    if (isBonEntree && normalizedBeReception) {
      applyBeReceptionChoiceToMeta(snapMeta, normalizedBeReception, { fallbackDate: date });
    }
    if (isFacture) {
      if (resolvedPaymentMethod) snapMeta.paymentMethod = resolvedPaymentMethod;
      else if ("paymentMethod" in snapMeta) delete snapMeta.paymentMethod;
      snapMeta.status = normalizedStatus;
      if (meta.paymentDate) snapMeta.paymentDate = meta.paymentDate;
    } else {
      if ("paymentMethod" in snapMeta) delete snapMeta.paymentMethod;
      if ("status" in snapMeta) delete snapMeta.status;
      if ("paymentDate" in snapMeta) delete snapMeta.paymentDate;
    }
    if (normalizedConvertedFrom) {
      snapMeta.convertedFrom = normalizedConvertedFrom;
    } else if ("convertedFrom" in snapMeta) {
      delete snapMeta.convertedFrom;
    }

    if (isFacture && normalizedStatus === "payee") {
      const totals =
        snapshot.totals && typeof snapshot.totals === "object"
          ? snapshot.totals
          : (snapshot.totals = {});
      const totalsAcompte =
        totals.acompte && typeof totals.acompte === "object"
          ? totals.acompte
          : (totals.acompte = {});
      const metaAcompte =
        snapMeta.acompte && typeof snapMeta.acompte === "object"
          ? snapMeta.acompte
          : (snapMeta.acompte = {});
      const totalValue = Number(
        totals.totalTTC ?? totals.total ?? totals.grand ?? totals.totalHT ?? totals.totalHt ?? NaN
      );
      if (Number.isFinite(totalValue) && totalValue > 0) {
        totals.balanceDue = 0;
        totalsAcompte.enabled = true;
        totalsAcompte.paid = totalValue;
        totalsAcompte.base = totalValue;
        totalsAcompte.remaining = 0;
        metaAcompte.enabled = true;
        metaAcompte.paid = totalValue;
      }
    }

    const savePayload = {
      data: snapshot,
      meta: { ...snapMeta, status: isFacture ? normalizedStatus : "", silent: true }
    };
    logConvert("built-payload", {
      targetDocType: normalizedDocType,
      number: String(savePayload?.meta?.number || ""),
      date: String(savePayload?.meta?.date || ""),
      status: String(savePayload?.meta?.status || ""),
      itemCount: Array.isArray(savePayload?.data?.items) ? savePayload.data.items.length : 0,
      hasClient: !!savePayload?.data?.client
    });

    const handleMarkNumber = () => {
      if (typeof w.markDocumentNumberUsed === "function") {
        try {
          w.markDocumentNumberUsed({
            docType: normalizedDocType,
            numberLength: snapMeta.numberLength,
            number: snapMeta.number,
            year: snapMeta.numberYear
          });
        } catch (err) {
          console.warn("convert numbering update failed", err);
        }
      }
    };

    const handleHistoryUpdate = async (resPath, resName) => {
      const historySummary = captureHistorySummary();
      if (typeof w.addDocumentHistory === "function" && resPath) {
        try {
          w.addDocumentHistory({
            docType: normalizedDocType,
            path: resPath,
            number: snapMeta.number,
            date: snapMeta.date,
            name: resName,
            clientName: historySummary.clientName,
            clientAccount: historySummary.clientAccount,
            codeClient: historySummary.clientCode || "",
            totalHT: historySummary.totalHT,
            totalTTC: historySummary.totalTTC,
            currency: historySummary.currency,
            paid: historySummary.paid,
            balanceDue: historySummary.balanceDue,
            acompteEnabled: historySummary.acompteEnabled,
            reglementEnabled: historySummary.reglementEnabled,
            reglementText: historySummary.reglementText,
            status: isFacture ? normalizedStatus : undefined,
            paymentMethod: isFacture ? resolvedPaymentMethod || snapMeta.paymentMethod : undefined,
            hasComment: !!String(snapMeta.noteInterne || "").trim(),
            convertedFrom: normalizedConvertedFrom || undefined
          });
        } catch (historyErr) {
          console.warn("convert history update failed", historyErr);
        }
      }
      if (
        isFacture &&
        resPath &&
        normalizedStatus === "payee" &&
        Number.isFinite(payeePaymentDelta) &&
        payeePaymentDelta > 0 &&
        typeof w.addPaymentHistoryEntry === "function"
      ) {
        if (typeof w.hydratePaymentHistory === "function") {
          await w.hydratePaymentHistory({ skipInvoiceSync: true });
        }
        const paymentDate = snapMeta.paymentDate || snapMeta.date || new Date().toISOString().slice(0, 10);
        w.addPaymentHistoryEntry({
          invoiceNumber: snapMeta.number,
          invoicePath: resPath,
          clientName: historySummary?.clientName,
          clientAccount: historySummary?.clientAccount,
          paymentDate,
          amount: payeePaymentDelta,
          balanceDue: 0,
          currency: historySummary?.currency,
          mode: resolvedPaymentMethod || snapMeta.paymentMethod || "",
          paymentRef: snapMeta.paymentRef || "",
          entryType: "invoice"
        });
      }
      if (
        isFacture &&
        resPath &&
        typeof w.syncFactureLedger === "function"
      ) {
        try {
          const clientPath =
            String(snapshot?.client?.__path || "").trim() ||
            String(w.SEM?.state?.client?.__path || "").trim() ||
            String(w.SEM?.clientFormBaseline?.__path || "").trim();
          if (clientPath) {
            const taxId = String(
              snapshot?.client?.identifiantFiscal ||
                snapshot?.client?.vat ||
                snapshot?.client?.tva ||
                ""
            ).trim();
            const invoiceTotal =
              historySummary?.totalTTC ??
              historySummary?.totalHT ??
              snapshot?.totals?.totalTTC ??
              snapshot?.totals?.totalHT ??
              NaN;
            const paidAmountForLedger =
              normalizedStatus === "payee"
                ? invoiceTotal
                : Number(String(paidAmount ?? "").replace(",", "."));
            await w.syncFactureLedger({
              clientPath,
              taxId,
              invoicePath: resPath,
              invoiceNumber: snapMeta.number,
              invoiceTotal,
              status: normalizedStatus,
              paidAmount: paidAmountForLedger,
              paymentMethod: resolvedPaymentMethod || snapMeta.paymentMethod || "",
              paymentReference: snapMeta.paymentReference || snapMeta.paymentRef || ""
            });
          } else {
            console.warn("client ledger entry skipped: client path missing");
          }
        } catch (ledgerErr) {
          console.warn("client ledger entry failed", ledgerErr);
        }
      }
      meta.historyPath = resPath || meta.historyPath || null;
      meta.historyDocType = normalizedDocType;
      if (!isFacture && "paymentMethod" in meta) delete meta.paymentMethod;
      if (typeof w.syncInvoiceNumberControls === "function") {
        w.syncInvoiceNumberControls({ force: true });
      }
      handleMarkNumber();
      if (typeof w.SEM?.markDocumentDirty === "function") {
        w.SEM.markDocumentDirty(false);
      }
    };

    const buildSaveFailureResult = (res, fallbackText = "Enregistrement impossible.") => {
      const errorText = String(res?.error || res?.message || fallbackText).trim() || fallbackText;
      const failure = {
        ok: false,
        error: errorText
      };
      const reason = String(res?.reason || "").trim();
      if (reason) failure.reason = reason;
      if (res?.details && typeof res.details === "object") {
        failure.details = res.details;
      }
      return failure;
    };

    if (w.electronAPI?.saveInvoiceJSON) {
      try {
        logConvert("save-call-start", {
          targetDocType: normalizedDocType,
          number: String(savePayload?.meta?.number || "")
        });
        let res = await w.electronAPI.saveInvoiceJSON(savePayload);
        logConvert("save-call-result", {
          ok: !!res?.ok,
          reason: String(res?.reason || ""),
          number: String(res?.number || ""),
          error: String(res?.error || "")
        });
        const outOfSequence = res?.reason === "number_out_of_sequence";
        if ((res?.reason === "number_changed" || outOfSequence) && res?.suggestedNumber) {
          const suggestedNumber = String(res.suggestedNumber || "").trim();
          if (suggestedNumber) {
            const activeNumber = String(meta.number || snapMeta.number || "").trim();
            const previewNumber = activeNumber || suggestedNumber;
            const changeMessage = outOfSequence
              ? `Ce numero ne suit pas la sequence.\n` +
                `Le prochain numero disponible est ${suggestedNumber}.\n\n` +
                `Voulez-vous continuer avec ${previewNumber} ?`
              : `Un autre document utilise deja ce numero.\n` +
                `Le nouveau numero sera ${suggestedNumber}.\n\n` +
                "Voulez-vous continuer ?";
            let confirmed = false;
            if (typeof showConfirm === "function") {
              confirmed = await showConfirm(changeMessage, {
                title: outOfSequence ? "Numero hors sequence" : "Numero deja utilise",
                okText: "Continuer",
                cancelText: "Annuler"
              });
            } else if (typeof w.confirm === "function") {
              confirmed = w.confirm(changeMessage);
            }
            if (!confirmed) return false;

            if (!outOfSequence) {
              meta.number = suggestedNumber;
              meta.previewNumber = suggestedNumber;
              snapMeta.number = suggestedNumber;
              snapMeta.previewNumber = suggestedNumber;
              if (snapshot?.meta && typeof snapshot.meta === "object") {
                snapshot.meta.number = suggestedNumber;
                snapshot.meta.previewNumber = suggestedNumber;
              }
              const invNumberInput = getEl("invNumber");
              if (invNumberInput && invNumberInput.value !== suggestedNumber) {
                invNumberInput.value = suggestedNumber;
              }
              const invNumberSuffix = getEl("invNumberSuffix");
              if (invNumberSuffix) {
                const suffixMatch = suggestedNumber.match(/(\d+)\s*$/);
                if (suffixMatch?.[1]) invNumberSuffix.value = suffixMatch[1];
              }
            }

            res = await w.electronAPI.saveInvoiceJSON({
              data: snapshot,
              meta: outOfSequence
                ? { ...savePayload.meta, acceptNumberChange: true, allowProvidedNumber: true }
                : { ...savePayload.meta, number: suggestedNumber, previewNumber: suggestedNumber, acceptNumberChange: true }
            });
            logConvert("save-call-result-retry", {
              ok: !!res?.ok,
              reason: String(res?.reason || ""),
              number: String(res?.number || ""),
              error: String(res?.error || "")
            });
          }
        }
        if (res?.ok) {
          const savedNumberRaw = String(res?.number || snapMeta.number || "").trim();
          const savedNumber = savedNumberRaw || snapMeta.number || "";
          const previewNumber = String(res?.previewNumber || snapMeta.previewNumber || "").trim();
          const numberChanged =
            !!res?.numberChanged || (previewNumber && savedNumber && previewNumber !== savedNumber);

          if (savedNumber) {
            snapMeta.number = savedNumber;
            snapMeta.previewNumber = savedNumber;
            meta.number = savedNumber;
            meta.previewNumber = savedNumber;
            if (snapshot?.meta && typeof snapshot.meta === "object") {
              snapshot.meta.number = savedNumber;
              snapshot.meta.previewNumber = savedNumber;
            }
            const invNumberInput = getEl("invNumber");
            if (invNumberInput && invNumberInput.value !== savedNumber) {
              invNumberInput.value = savedNumber;
            }
            const invNumberSuffix = getEl("invNumberSuffix");
            if (invNumberSuffix) {
              const suffixMatch = savedNumber.match(/(\d+)\s*$/);
              if (suffixMatch?.[1]) invNumberSuffix.value = suffixMatch[1];
            }
          }
          await handleHistoryUpdate(res.path, res.name);
          if (numberChanged && savedNumber) {
            await w.showDialog?.(`Number was used by another document; saved as ${savedNumber}`, {
              title: getMessage("GENERIC_INFO").title
            });
          }
          return {
            ok: true,
            path: String(res?.path || ""),
            number: String(savedNumber || ""),
            docType: normalizedDocType,
            name: String(res?.name || "")
          };
        }
        logConvert("save-call-failed", {
          ok: !!res?.ok,
          reason: String(res?.reason || ""),
          error: String(res?.error || "")
        });
        return buildSaveFailureResult(res);
      } catch (err) {
        console.error("convert devis save failed", err);
        logConvert("save-call-exception", {
          message: String(err?.message || err || "")
        });
        return buildSaveFailureResult({
          error: String(err?.message || err || "")
        });
      }
    }

    if (typeof w.saveInvoiceJSON === "function") {
      try {
        await w.saveInvoiceJSON();
        meta.historyDocType = normalizedDocType;
        if (!isFacture && "paymentMethod" in meta) delete meta.paymentMethod;
        if (typeof w.syncInvoiceNumberControls === "function") {
          w.syncInvoiceNumberControls({ force: true });
        }
        handleMarkNumber();
        if (typeof w.SEM?.markDocumentDirty === "function") {
          w.SEM.markDocumentDirty(false);
        }
        return {
          ok: true,
          path: String(meta.historyPath || ""),
          number: String(meta.number || ""),
          docType: normalizedDocType
        };
      } catch (err) {
        console.error("convert devis fallback save failed", err);
        return buildSaveFailureResult({
          error: String(err?.message || err || "")
        });
      }
    }

    return false;
  }

  const deepCloneValue = (value) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  };
  const getInvoiceSourcePayload = (raw) => {
    const sourceLevel1 = raw && raw.data && typeof raw.data === "object" ? raw.data : raw;
    const source =
      sourceLevel1 && sourceLevel1.data && typeof sourceLevel1.data === "object"
        ? sourceLevel1.data
        : sourceLevel1;
    return source && typeof source === "object" ? source : null;
  };
  const cloneSourceItemWithSourceMeta = (item, sourceMeta = {}) => {
    const clonedItem = deepCloneValue(item && typeof item === "object" ? item : {});
    const sourceDocType = String(
      clonedItem.sourceDocType ||
        clonedItem.source_doc_type ||
        clonedItem.sourceType ||
        clonedItem.source_type ||
        sourceMeta.sourceDocType ||
        ""
    )
      .trim()
      .toLowerCase();
    const sourceDocNumber = String(
      clonedItem.sourceDocNumber ||
        clonedItem.source_doc_number ||
        clonedItem.sourceNumber ||
        clonedItem.source_number ||
        sourceMeta.sourceDocNumber ||
        ""
    ).trim();
    const sourceDocDate = String(
      clonedItem.sourceDocDate ||
        clonedItem.source_doc_date ||
        clonedItem.sourceDate ||
        clonedItem.source_date ||
        sourceMeta.sourceDocDate ||
        ""
    ).trim();
    if (sourceDocType) {
      clonedItem.sourceDocType = sourceDocType;
      clonedItem.source_doc_type = sourceDocType;
    }
    if (sourceDocNumber) {
      clonedItem.sourceDocNumber = sourceDocNumber;
      clonedItem.source_doc_number = sourceDocNumber;
    }
    if (sourceDocDate) {
      clonedItem.sourceDocDate = sourceDocDate;
      clonedItem.source_doc_date = sourceDocDate;
    }
    return clonedItem;
  };
  const collectSourceItemsForConversion = (sources = [], fallbackSourceDocType = "") => {
    const collectedItems = [];
    sources.forEach((entryLike) => {
      const entry = entryLike?.entry && typeof entryLike.entry === "object" ? entryLike.entry : {};
      const rawDoc = entryLike?.raw ?? entryLike;
      const payload = getInvoiceSourcePayload(rawDoc);
      const sourceItems = Array.isArray(payload?.items) ? payload.items : [];
      const sourceMeta = resolveConvertedSourceSnapshot(
        entry,
        rawDoc,
        fallbackSourceDocType || entry?.docType || ""
      );
      sourceItems.forEach((sourceItem) => {
        collectedItems.push(cloneSourceItemWithSourceMeta(sourceItem, sourceMeta));
      });
    });
    return collectedItems;
  };

  async function convertHistoryEntry(
    entry,
    { onClose, sourceDocType, promptOptions, directChoices, rawOverride } = {}
  ) {
    if (!entry || (!entry.path && !rawOverride)) return false;
    const normalizedSource = String(sourceDocType || "").trim().toLowerCase();
    const entryDocType = String(entry.docType || "").trim().toLowerCase();
    if (entryDocType && normalizedSource && entryDocType !== normalizedSource) return false;
    const resolvedSourceDocType = normalizedSource || entryDocType || "facture";
    console.info("[doc-convert] start", {
      sourceDocType: resolvedSourceDocType,
      sourcePath: String(entry.path || ""),
      sourceNumber: String(entry.number || entry.invNumber || "")
    });
    let raw = rawOverride || null;
    if (!raw) {
      try {
        raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType: resolvedSourceDocType });
      } catch (err) {
        console.error("convert document open failed", err);
      }
    }
    if (!raw) {
      const sourceLabel =
        typeof w.docTypeLabel === "function" ? w.docTypeLabel(resolvedSourceDocType) : "document";
      const lowerLabel = String(sourceLabel || "document").toLowerCase();
      const isFeminine = ["facture", "fa", "retenue", "avoir"].includes(resolvedSourceDocType);
      const article = isFeminine ? "la" : "le";
      const notFound = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED", {
        fallbackText: `Impossible de charger ${article} ${lowerLabel}.`
      });
      await w.showDialog?.(notFound.text, { title: notFound.title });
      return false;
    }
    const convertedFrom = getConvertedFromInfo(entry, raw, resolvedSourceDocType);
    const fallbackTarget = String(promptOptions?.defaultTarget || "facture").trim().toLowerCase();
    const performConversion = async (choices = {}) => {
      const targetDocType = String(choices.target || fallbackTarget || "facture").toLowerCase();
      console.info("[doc-convert] apply conversion choices", {
        sourceDocType: resolvedSourceDocType,
        targetDocType,
        model: String(choices.model || ""),
        date: String(choices.date || ""),
        paymentMethod: String(choices.paymentMethod || ""),
        status: String(choices.status || "")
      });
      let cloned = null;
      try {
        cloned = JSON.parse(JSON.stringify(raw));
      } catch {
        cloned = raw;
      }
      const payloadTarget = getInvoiceSourcePayload(cloned) || (cloned && typeof cloned === "object" ? cloned : {});
      const metaTarget =
        payloadTarget.meta && typeof payloadTarget.meta === "object"
          ? payloadTarget.meta
          : (payloadTarget.meta = {});
      const normalizedTarget = String(choices.target || fallbackTarget || "facture").toLowerCase();
      metaTarget.docType = normalizedTarget || "facture";
      if (choices.date) metaTarget.date = choices.date;
      clearCrossTypeNumberingMetadata(metaTarget, resolvedSourceDocType, normalizedTarget);
      metaTarget.historyPath = null;
      metaTarget.historyDocType = null;
      let normalizedBeReception = null;
      const requireBeReceptionStorageFields = shouldRequireBeReceptionStorageFields(
        resolvedSourceDocType,
        normalizedTarget
      );
      if (normalizedTarget === "be") {
        const beValidation = validateBeReceptionChoice(choices.beReception, {
          meta: metaTarget,
          fallbackDate: choices.date || metaTarget.date || new Date().toISOString().slice(0, 10),
          requireStorageFields: requireBeReceptionStorageFields
        });
        if (!beValidation.ok) {
          return { ok: false, error: beValidation.error || "Informations de reception incompletes." };
        }
        normalizedBeReception = applyBeReceptionChoiceToMeta(metaTarget, beValidation.value, {
          fallbackDate: choices.date || metaTarget.date || ""
        });
      }
      const clonedPayload = getInvoiceSourcePayload(cloned);
      if (clonedPayload && Array.isArray(clonedPayload.items)) {
        const sourceMeta = resolveConvertedSourceSnapshot(entry, raw, resolvedSourceDocType);
        clonedPayload.items = clonedPayload.items.map((sourceItem) =>
          cloneSourceItemWithSourceMeta(sourceItem, sourceMeta)
        );
      }
      if (normalizedTarget === "facture") {
        if (choices.paymentMethod) metaTarget.paymentMethod = choices.paymentMethod;
        else if ("paymentMethod" in metaTarget) delete metaTarget.paymentMethod;
        if (choices.paymentReference) {
          metaTarget.paymentReference = choices.paymentReference;
          metaTarget.paymentRef = choices.paymentReference;
        } else {
          if ("paymentReference" in metaTarget) delete metaTarget.paymentReference;
          if ("paymentRef" in metaTarget) delete metaTarget.paymentRef;
        }
      } else {
        if ("paymentMethod" in metaTarget) delete metaTarget.paymentMethod;
        if ("paymentReference" in metaTarget) delete metaTarget.paymentReference;
        if ("paymentRef" in metaTarget) delete metaTarget.paymentRef;
      }
      if (typeof w.mergeInvoiceDataIntoState === "function") {
        try {
          w.mergeInvoiceDataIntoState(cloned);
        } catch (err) {
          console.warn("mergeInvoiceDataIntoState failed", err);
        }
      }
      clearCrossTypeNumberingControls(resolvedSourceDocType, normalizedTarget);
      if (normalizedTarget === "be" && normalizedBeReception) {
        const st = SEM.state || (SEM.state = {});
        const meta = st.meta || (st.meta = {});
        applyBeReceptionChoiceToMeta(meta, normalizedBeReception, {
          fallbackDate: choices.date || meta.date || ""
        });
      }
      if (typeof w.SEM?.bind === "function") {
        w.__suppressModelApplyOnce = 2;
        w.SEM.bind();
      }
      forceDocTypeSelection(metaTarget.docType);
      if (choices.date) {
        const dateInput = getEl("invDate");
        if (dateInput) {
          dateInput.value = choices.date;
          try {
            dateInput.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        }
        const st = SEM.state || (SEM.state = {});
        const meta = st.meta || (st.meta = {});
        meta.date = choices.date;
      }
      if (choices.model && typeof SEM?.applyModelByName === "function") {
        try {
          await SEM.applyModelByName(choices.model);
        } catch (err) {
          console.warn("apply model on convert failed", err);
        }
        syncModelSelectionUi(choices.model);
      }
      if (normalizedTarget === "be" && normalizedBeReception) {
        const st = SEM.state || (SEM.state = {});
        const meta = st.meta || (st.meta = {});
        applyBeReceptionChoiceToMeta(meta, normalizedBeReception, {
          fallbackDate: choices.date || meta.date || ""
        });
      }
      if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
        w.setDocTypeMenuAllowedDocTypes(null);
      }
      forceDocTypeSelection(targetDocType);
      if (typeof SEM?.computeTotals === "function") {
        try {
          SEM.computeTotals();
        } catch {}
      }
      const saved = await saveConvertedDocument(targetDocType, {
        dateOverride: choices.date,
        convertedFrom,
        paymentMethod: choices.paymentMethod,
        paymentReference: choices.paymentReference,
        historyStatus: choices.status,
        paidAmount: choices.paidAmount,
        beReception: normalizedBeReception || choices.beReception,
        beReceptionRequireStorageFields: requireBeReceptionStorageFields
      });
      const failedSave = !saved || (saved && typeof saved === "object" && saved.ok === false);
      if (failedSave) {
        const label = typeof w.docTypeLabel === "function" ? w.docTypeLabel(targetDocType) : "document";
        const isFeminine = ["facture", "retenue", "avoir"].includes(targetDocType);
        const article = isFeminine ? "la" : "le";
        const fallbackText = `Impossible de cr\u00e9er ${article} ${String(label || "document").toLowerCase()}.`;
        const saveError = getMessage("DOCUMENT_SAVE_FAILED", { fallbackText });
        console.warn("[doc-convert] save failed", { targetDocType, sourcePath: String(entry.path || "") });
        const failureResult = {
          ok: false,
          error: String(saved?.error || saved?.message || saveError.text || fallbackText)
        };
        const reason = String(saved?.reason || "").trim();
        if (reason) failureResult.reason = reason;
        if (saved?.details && typeof saved.details === "object") {
          failureResult.details = saved.details;
        }
        return failureResult;
      }
      const savedInfo =
        saved && typeof saved === "object"
          ? saved
          : {
              ok: saved !== false,
              path: "",
              number: "",
              docType: targetDocType
            };
      try {
        const st = SEM.state || {};
        const meta = st.meta || {};
        const invNumber = getEl("invNumber")?.value;
        const invDate = getEl("invDate")?.value;
        if (invNumber) meta.number = invNumber;
        if (invDate) meta.date = invDate;
        if (typeof SEM.refreshInvoiceSummary === "function") SEM.refreshInvoiceSummary();
      } catch {}
      const resolvedSavedPath = String(
        savedInfo?.path || w.SEM?.state?.meta?.historyPath || ""
      ).trim();
      const resolvedSavedNumber = String(
        savedInfo?.number || getEl("invNumber")?.value || ""
      ).trim();
      if (typeof onClose === "function") {
        console.info("[doc-convert] close source dialog after success", {
          targetDocType,
          sourcePath: String(entry.path || "")
        });
        onClose();
      }
      try {
        const historyApi = w.AppInit?.__runtime?.history || null;
        if (historyApi) {
          console.info("[doc-convert] open history modal for converted target", {
            targetDocType,
            savedPath: resolvedSavedPath,
            savedNumber: resolvedSavedNumber
          });
          if (typeof historyApi.setSelectedType === "function") {
            historyApi.setSelectedType(targetDocType);
          }
          if (typeof historyApi.resetFilters === "function") {
            historyApi.resetFilters({ renderIfOpen: false });
          }
          if (typeof historyApi.openModalAfterRefresh === "function") {
            await historyApi.openModalAfterRefresh({
              docType: targetDocType,
              focusPath: resolvedSavedPath,
              focusNumber: resolvedSavedNumber
            });
          } else {
            if (typeof historyApi.refreshFromDisk === "function") {
              await historyApi.refreshFromDisk(targetDocType, { force: true });
            }
            if (typeof historyApi.openModal === "function") {
              historyApi.openModal({
                docType: targetDocType,
                focusPath: resolvedSavedPath,
                focusNumber: resolvedSavedNumber
              });
            }
          }
        }
      } catch (historyErr) {
        console.warn("convert history modal open failed", historyErr);
      }
      return { ok: true };
    };
    if (directChoices && typeof directChoices === "object") {
      const directSubmit = await performConversion(directChoices);
      if (directSubmit && typeof directSubmit === "object") {
        return directSubmit;
      }
      return directSubmit !== false;
    }

    const promptConfig =
      promptOptions && typeof promptOptions === "object" ? { ...promptOptions } : {};
    promptConfig.sourceDocType = resolvedSourceDocType;
    promptConfig.onSubmit = performConversion;
    let promptResult = null;
    try {
      promptResult = await promptDevisConversion(entry, promptConfig);
    } catch (err) {
      console.error("convert prompt failed", err);
      const convertPromptError = getMessage("HISTORY_CONVERT_PROMPT_FAILED", {
        fallbackText: "Impossible d'initialiser la conversion."
      });
      await w.showDialog?.(convertPromptError.text, { title: convertPromptError.title });
      return false;
    }
    if (!promptResult) {
      console.info("[doc-convert] user canceled conversion");
      return false;
    }
    if (
      promptResult &&
      typeof promptResult === "object" &&
      Object.prototype.hasOwnProperty.call(promptResult, "submitted")
    ) {
      return promptResult.submitted !== false;
    }
    const fallbackSubmit = await performConversion(promptResult?.choices || promptResult);
    if (fallbackSubmit && typeof fallbackSubmit === "object") {
      return fallbackSubmit;
    }
    return fallbackSubmit !== false;
  }

  async function openMainScreenConversionWizard({ trigger = null } = {}) {
    const sourceConfig = await pickMainSourceTypeDialog(trigger);
    if (!sourceConfig) return false;

    const pickerResult = await openMainSourceDocumentPicker(sourceConfig, trigger);
    if (!pickerResult?.ok) return false;

    const pickedItems = Array.isArray(pickerResult?.items) ? pickerResult.items : [];
    if (!pickedItems.length) {
      await w.showDialog?.("Aucun document source selectionne.", { title: "Conversion" });
      return false;
    }

    const firstPicked = pickedItems[0];
    if (pickedItems.length > 1) {
      await w.showDialog?.(
        "Plusieurs documents ont ete selectionnes. Seul le premier document sera converti.",
        { title: "Conversion" }
      );
    }

    const entry = toConversionEntryFromPickerItem(firstPicked, sourceConfig.docType);
    if (!entry?.path) {
      await w.showDialog?.("Document source invalide.", { title: "Conversion" });
      return false;
    }

    const sourceDisplayLabel =
      String(entry.number || firstPicked?.displayName || extractDocumentLabel(entry.path) || "").trim();
    const promptOptions = {
      ...(sourceConfig.promptOptions || {}),
      showTwoStepWizard: true,
      wizardStep1Label: "S\u00E9lection du document source",
      wizardStep2Label: "Param\u00E8tres du document converti",
      wizardSourceTypeLabel: String(sourceConfig.label || sourceConfig.docType || "").trim(),
      wizardSourceDocLabel: sourceDisplayLabel
    };

    return convertHistoryEntry(entry, {
      sourceDocType: sourceConfig.docType,
      promptOptions
    });
  }

  const getMainScreenSourceTypeConfigs = () =>
    MAIN_CONVERSION_SOURCE_TYPE_CONFIGS.map((entry) => ({
      ...entry,
      promptOptions:
        entry?.promptOptions && typeof entry.promptOptions === "object"
          ? { ...entry.promptOptions }
          : {}
    }));

  async function convertSourceEntryWithChoices(
    entry,
    { sourceDocType, choices, promptOptions, onClose } = {}
  ) {
    return convertHistoryEntry(entry, {
      onClose,
      sourceDocType,
      promptOptions,
      directChoices: choices && typeof choices === "object" ? { ...choices } : {}
    });
  }

  async function convertSourceEntriesWithChoices(
    entries,
    { sourceDocType, choices, promptOptions, onClose } = {}
  ) {
    const sourceEntries = Array.isArray(entries)
      ? entries.filter((entry) => entry && typeof entry === "object")
      : [];
    if (!sourceEntries.length) return false;
    if (sourceEntries.length === 1) {
      return convertSourceEntryWithChoices(sourceEntries[0], {
        sourceDocType,
        choices,
        promptOptions,
        onClose
      });
    }

    const clientPathSet = new Set(
      sourceEntries
        .map((entry) => String(entry?.clientPath || "").trim())
        .filter(Boolean)
    );
    if (clientPathSet.size > 1) {
      await w.showDialog?.("Les documents selectionnes doivent appartenir au meme client.", {
        title: "Conversion"
      });
      return false;
    }

    const normalizedSourceDocType = String(
      sourceDocType || sourceEntries[0]?.docType || ""
    ).trim().toLowerCase();
    const loadedEntries = [];
    for (const entry of sourceEntries) {
      const path = String(entry?.path || "").trim();
      if (!path) return false;
      let raw = null;
      try {
        raw = await w.openInvoiceFromFilePicker({
          path,
          docType: normalizedSourceDocType || String(entry?.docType || "").trim().toLowerCase()
        });
      } catch (err) {
        console.error("convert multi-source open failed", err);
      }
      if (!raw) {
        await w.showDialog?.("Impossible de charger un des documents sources selectionnes.", {
          title: "Conversion"
        });
        return false;
      }
      loadedEntries.push({
        entry,
        raw
      });
    }
    if (!loadedEntries.length) return false;

    const mergedRaw = deepCloneValue(loadedEntries[0].raw);
    const mergedPayload = getInvoiceSourcePayload(mergedRaw);
    if (!mergedPayload) return false;
    mergedPayload.items = collectSourceItemsForConversion(loadedEntries, normalizedSourceDocType);
    const sourceNumbers = normalizeSourceNumbers(
      sourceEntries.map((entry) => entry?.number || entry?.name || entry?.path || "")
    );

    const primaryEntry = loadedEntries[0].entry || {};
    const mergedEntry = {
      ...primaryEntry,
      docType:
        normalizedSourceDocType || String(primaryEntry?.docType || "").trim().toLowerCase(),
      sourceNumbers,
      number:
        String(primaryEntry?.number || primaryEntry?.name || "").trim() ||
        `${sourceEntries.length} document(s)`,
      name:
        String(primaryEntry?.name || primaryEntry?.number || "").trim() ||
        `${sourceEntries.length} document(s)`
    };

    return convertHistoryEntry(mergedEntry, {
      onClose,
      sourceDocType: normalizedSourceDocType || mergedEntry.docType,
      promptOptions,
      directChoices: choices && typeof choices === "object" ? { ...choices } : {},
      rawOverride: mergedRaw
    });
  }

  async function convertDevisEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, { onClose, sourceDocType: "devis" });
  }

  async function convertBlEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, {
      onClose,
      sourceDocType: "bl",
      promptOptions: {
        titleText: "Convertir le bon de livraison",
        targetDocTypes: ["facture"]
      }
    });
  }

  async function convertFactureEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, {
      onClose,
      sourceDocType: "facture",
      promptOptions: {
        titleText: "Convertir le devis",
        targetDocTypes: ["avoir"],
        defaultTarget: "avoir",
        showTargetChoice: true,
        allowedModelDocTypes: ["avoir"]
      }
    });
  }

  const BonEntreeReception = {
    normalizeChoice: normalizeBeReceptionChoice,
    createDefaultChoice: createDefaultBeReceptionChoice,
    validateChoice: validateBeReceptionChoice,
    fetchDepotRecords: fetchBeReceptionDepotRecords,
    fetchLocationsForDepot: fetchBeReceptionLocationsForDepot,
    normalizeDepotId: normalizeBeReceptionDepotId,
    normalizeLocationId: normalizeBeReceptionLocationId,
    normalizeDestinationIds: normalizeBeReceptionDestinationIds,
    normalizeDestinationLabels: normalizeBeReceptionDestinationLabels,
    formatDestinationText: formatBeReceptionDestinationText,
    formatTime: formatBeReceptionTime
  };

  AppInit.DocConversion = {
    openMainScreenConversionWizard,
    getMainScreenSourceTypeConfigs,
    convertSourceEntryWithChoices,
    convertSourceEntriesWithChoices,
    convertDevisEntry,
    convertBlEntry,
    convertFactureEntry,
    BonEntreeReception
  };
})(window);
