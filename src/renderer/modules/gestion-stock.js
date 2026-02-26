(function (w) {
  const SEM = (w.SEM = w.SEM || {});

  const EMPTY_DEPOT_VALUE = "";
  const DEPOT_PLACEHOLDER_LABEL = "Selectionner un depot";
  const LOCATION_NONE_LABEL = "Aucune";
  const LOCATION_EMPTY_LABEL = "Aucun emplacement";
  const ADD_SCOPE_SELECTOR = "#addItemBox, #addItemBoxMainscreen, #articleFormPopover";
  const ARTICLE_POPOVER_ID = "articleFormPopover";
  const ARTICLE_DEPOT_REMOVE_BUTTON_SELECTOR = "#articleDepotRemoveBtn";
  const ARTICLE_DEPOT_ADD_BUTTON_SELECTOR = "#articleDepotAddBtn";
  const ARTICLE_STOCK_TAB_SELECTOR = "#articleFormTabStock";
  const ARTICLE_DEPOT_TAB_SELECTOR = "[data-article-depot-tab]";
  const ARTICLE_ALL_DEPOT_TAB_BUTTON_SELECTOR = "button[data-depot-id]";
  const ARTICLE_DEPOT_TAB_BUTTON_SELECTOR = `${ARTICLE_DEPOT_TAB_SELECTOR}[data-depot-id]`;
  const ARTICLE_MAIN_TAB_SELECTOR = "[data-article-tab]";
  const ARTICLE_MAIN_TAB_PANEL_SELECTOR = "[data-article-modal-panel]";
  const ARTICLE_MAIN_STOCK_TAB = "stock";
  const MAIN_ARTICLE_DEPOT_ID = "depot-1";
  const MAX_ARTICLE_DEPOT_COUNT = 6;
  const MAX_ARTICLE_DEPOT_MESSAGE = `Maximum ${MAX_ARTICLE_DEPOT_COUNT} dépôts autorisés.`;
  let depotRecords = [];
  let articleDepotState = {
    depots: [],
    selectedDepotId: "",
    activeDepotId: "",
    stockCustomized: false
  };

  const normalizeDepotRefId = (value = "") =>
    String(value || "")
      .trim()
      .replace(/^sqlite:\/\/depots\//i, "");

  const normalizeEmplacementRecord = (entry = {}, depotIdHint = "") => {
    const row = entry && typeof entry === "object" ? entry : { code: entry };
    const id = String(
      row.id ||
        row.value ||
        row.emplacementId ||
        row.emplacement_id ||
        row.path?.replace?.(/^sqlite:\/\/emplacements\//i, "") ||
        ""
    ).trim();
    const code = String(row.code || row.name || row.label || row.value || "").trim();
    const depotId = String(row.depotId || row.depot_id || depotIdHint || "").trim();
    if (!id && !code) return null;
    return {
      id: id || code,
      depotId,
      code: code || id
    };
  };

  const normalizeEmplacementRecords = (entries = [], depotIdHint = "") => {
    const source = Array.isArray(entries) ? entries : [];
    const byId = new Set();
    const byCode = new Set();
    const normalized = [];
    source.forEach((entry) => {
      const record = normalizeEmplacementRecord(entry, depotIdHint);
      if (!record) return;
      const idKey = String(record.id || "").toLowerCase();
      const codeKey = String(record.code || "").toLowerCase();
      if (!idKey && !codeKey) return;
      if (idKey && byId.has(idKey)) return;
      if (!idKey && codeKey && byCode.has(codeKey)) return;
      if (idKey) byId.add(idKey);
      if (codeKey) byCode.add(codeKey);
      normalized.push(record);
    });
    return normalized;
  };

  const normalizeDepotRecord = (record = {}) => {
    const source = record && typeof record === "object" ? record : {};
    const id = normalizeDepotRefId(
      source.id ||
        source.value ||
        source.depotId ||
        source.path?.replace?.(/^sqlite:\/\/depots\//i, "") ||
        ""
    );
    const name = String(source.name || source.label || source.title || "").trim();
    const emplacements = normalizeEmplacementRecords(source.emplacements, id);
    if (!id) return null;
    return {
      id,
      name: name || getDepotFallbackName(id),
      emplacements
    };
  };

  const normalizeDepotRecords = (records = []) => {
    const source = Array.isArray(records) ? records : [];
    const map = new Map();
    source.forEach((entry) => {
      const normalized = normalizeDepotRecord(entry);
      if (!normalized) return;
      if (map.has(normalized.id)) return;
      map.set(normalized.id, normalized);
    });
    return Array.from(map.values());
  };

  const isArticleScope = (scope) => scope?.id === ARTICLE_POPOVER_ID;

  const normalizeScopedIdList = (value = []) => {
    const source = Array.isArray(value) ? value : String(value || "").trim() ? [value] : [];
    const seen = new Set();
    const normalized = [];
    source.forEach((entry) => {
      const id = String(entry || "").trim();
      if (!id) return;
      const key = id.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push(id);
    });
    return normalized;
  };

  const normalizeStockQty = (value = 0, fallback = 0) => {
    const fallbackNumber = Number(fallback);
    const safeFallback = Number.isFinite(fallbackNumber) ? Math.max(0, Math.trunc(fallbackNumber)) : 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return safeFallback;
    return Math.max(0, Math.trunc(parsed));
  };

  const toBooleanFlag = (value = false) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const raw = String(value).trim().toLowerCase();
    if (!raw) return false;
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
  };

  const isDepotTabId = (value = "") => Number.isFinite(parseDepotAutoNumberFromId(value));
  const toDepotTabId = (value = "", fallbackNumber = 1) => {
    const parsed = parseDepotAutoNumberFromId(value);
    const safe =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : Number.isFinite(fallbackNumber) && fallbackNumber > 0
        ? Math.trunc(fallbackNumber)
        : 1;
    return `depot-${safe}`;
  };
  const getDepotTabNumber = (entry = {}, indexHint = -1) => {
    const fromId = parseDepotAutoNumberFromId(entry?.id || "");
    if (Number.isFinite(fromId) && fromId > 0) return fromId;
    const fromName = parseDepotAutoNumber(entry?.tabLabel || entry?.tabName || entry?.name || "");
    if (Number.isFinite(fromName) && fromName > 0) return fromName;
    const fromIndex = Number.isFinite(indexHint) && indexHint >= 0 ? indexHint + 1 : 1;
    return Math.max(1, fromIndex);
  };
  const getDepotTabLabel = (entry = {}, indexHint = -1) => `Depot ${getDepotTabNumber(entry, indexHint)}`;

  const normalizeArticleDepotRecord = (entry = {}, index = 0) => {
    const source = entry && typeof entry === "object" ? entry : { id: entry, name: entry };
    const rawId = normalizeDepotRefId(source.id || source.value || source.depotId || source.path || "");
    const name = String(source.name || source.label || "").trim();
    const selectedLocationIds = normalizeScopedIdList(
      source.selectedLocationIds ??
        source.selectedLocationId ??
        source.selectedEmplacementIds ??
        source.selectedEmplacements ??
        source.defaultLocationIds ??
        source.defaultLocationId ??
        source.defaultLocation ??
        []
    );
    const selectedEmplacementIds = normalizeScopedIdList(
      source.selectedEmplacementIds ?? selectedLocationIds
    );
    const linkedDepotId = normalizeDepotRefId(
      source.linkedDepotId ??
        source.depotDbId ??
        source.magasinId ??
        source.magasin_id ??
        source.sourceDepotId ??
        source.defaultDepotId ??
        source.stockDefaultDepotId ??
        ""
    );
    const stockQty = normalizeStockQty(
      source.stockQty ??
        source.stock_qty ??
        source.quantity ??
        source.qty ??
        0
    );
    const stockQtyCustomized = toBooleanFlag(
      source.stockQtyCustomized ??
        source.stock_qty_customized ??
        source.depotStockCustomized ??
        source.depot_stock_customized ??
        false
    );
    const createdAt = String(source.createdAt || source.created_at || "").trim();
    if (!rawId && !name && !linkedDepotId && !selectedLocationIds.length) return null;
    const fallbackNumber = Number.isFinite(index) ? index + 1 : 1;
    const finalId = toDepotTabId(rawId || name, fallbackNumber);
    const legacyLinkedDepotId = rawId && !isDepotTabId(rawId) ? rawId : "";
    return {
      id: finalId,
      name: name || "",
      linkedDepotId: linkedDepotId || legacyLinkedDepotId,
      selectedLocationIds,
      selectedEmplacementIds,
      stockQty,
      stockQtyCustomized,
      createdAt: createdAt || new Date().toISOString(),
      emplacements: []
    };
  };

  const normalizeArticleDepotRecords = (records = []) => {
    const source = Array.isArray(records) ? records : [];
    const byId = new Set();
    const normalized = [];
    source.forEach((entry, index) => {
      const record = normalizeArticleDepotRecord(entry, index);
      if (!record) return;
      const tabNumber = getDepotTabNumber(record, index);
      let resolvedId = toDepotTabId(record.id, tabNumber);
      let key = String(resolvedId || "").trim().toLowerCase();
      if (!key) return;
      while (byId.has(key)) {
        resolvedId = toDepotTabId("", normalized.length + 2);
        key = String(resolvedId || "").trim().toLowerCase();
      }
      byId.add(key);
      normalized.push({
        ...record,
        id: resolvedId
      });
    });
    if (!normalized.length) {
      const firstDepot = normalizeArticleDepotRecord({ id: MAIN_ARTICLE_DEPOT_ID }, 0);
      if (firstDepot) normalized.push(firstDepot);
    }
    if (!normalized.some((entry) => entry.id === MAIN_ARTICLE_DEPOT_ID)) {
      const firstDepot = normalizeArticleDepotRecord({ id: MAIN_ARTICLE_DEPOT_ID }, 0);
      if (firstDepot) normalized.unshift(firstDepot);
    }
    return normalized;
  };

  const setArticleDepotState = ({
    depots = [],
    selectedDepotId = "",
    activeDepotId = "",
    stockCustomized = articleDepotState.stockCustomized
  } = {}) => {
    const normalizedDepots = normalizeArticleDepotRecords(depots);
    const selected = toDepotTabId(selectedDepotId || activeDepotId || "", 1);
    const hasSelected = selected && normalizedDepots.some((entry) => entry.id === selected);
    const activeCandidate = toDepotTabId(activeDepotId || selected || "", 1);
    const hasActive = activeCandidate && normalizedDepots.some((entry) => entry.id === activeCandidate);
    articleDepotState = {
      depots: normalizedDepots,
      selectedDepotId: hasSelected ? selected : MAIN_ARTICLE_DEPOT_ID,
      activeDepotId: hasActive ? activeCandidate : hasSelected ? selected : MAIN_ARTICLE_DEPOT_ID,
      stockCustomized: toBooleanFlag(stockCustomized)
    };
    return articleDepotState;
  };

  const setArticleSelectedDepotId = (selectedDepotId = "") => {
    const selected = toDepotTabId(selectedDepotId, 1);
    const hasSelected = selected && articleDepotState.depots.some((entry) => entry.id === selected);
    articleDepotState = {
      ...articleDepotState,
      selectedDepotId: hasSelected ? selected : MAIN_ARTICLE_DEPOT_ID,
      activeDepotId: hasSelected ? selected : articleDepotState.activeDepotId
    };
    return articleDepotState.selectedDepotId;
  };

  const setArticleActiveDepotId = (activeDepotId = "") => {
    const selected = toDepotTabId(activeDepotId, 1);
    const hasSelected = selected && articleDepotState.depots.some((entry) => entry.id === selected);
    articleDepotState = {
      ...articleDepotState,
      activeDepotId: hasSelected ? selected : MAIN_ARTICLE_DEPOT_ID,
      selectedDepotId: hasSelected ? selected : articleDepotState.selectedDepotId
    };
    return articleDepotState.activeDepotId;
  };

  const getArticleDepotRecords = () => articleDepotState.depots.slice();
  const isArticleDepotStockCustomized = () => toBooleanFlag(articleDepotState.stockCustomized);
  const setArticleDepotStockCustomized = (value = false) => {
    articleDepotState = {
      ...articleDepotState,
      stockCustomized: toBooleanFlag(value)
    };
    return articleDepotState.stockCustomized;
  };
  const getArticleActiveDepotId = () =>
    toDepotTabId(articleDepotState.activeDepotId || articleDepotState.selectedDepotId || MAIN_ARTICLE_DEPOT_ID, 1);
  const getArticleDepotRecordByTabId = (depotTabId = "") => {
    const target = toDepotTabId(depotTabId, 1);
    return getArticleDepotRecords().find((entry) => entry.id === target) || null;
  };
  const updateArticleDepotRecord = (depotTabId = "", updater = null) => {
    const target = toDepotTabId(depotTabId, 1);
    if (typeof updater !== "function" || !target) return null;
    const current = getArticleDepotRecords();
    let changed = false;
    const next = current.map((entry, index) => {
      if (entry.id !== target) return entry;
      const draft = updater({ ...entry }, index) || entry;
      const normalized = normalizeArticleDepotRecord(draft, index) || entry;
      const merged = {
        ...entry,
        ...normalized,
        id: target
      };
      if (JSON.stringify(merged) !== JSON.stringify(entry)) changed = true;
      return merged;
    });
    if (!changed) return getArticleDepotRecordByTabId(target);
    setArticleDepotState({
      depots: next,
      selectedDepotId: articleDepotState.selectedDepotId,
      activeDepotId: articleDepotState.activeDepotId
    });
    return getArticleDepotRecordByTabId(target);
  };

  const getScopeDepotRecords = (scope = null) => {
    if (isArticleScope(scope)) return getArticleDepotRecords();
    return depotRecords.slice();
  };

  const parseDepotAutoNumber = (name = "") => {
    const match = String(name || "").trim().match(/^depot[\s_-]*(\d+)$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
  };

  const parseDepotAutoNumberFromId = (id = "") => {
    const match = String(id || "").trim().match(/^depot[-_\s]?(\d+)$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
  };

  const isGenericDepotName = (value = "") =>
    /^depot[\s_-]*\d+$/i.test(String(value || "").trim());

  const getDepotFallbackName = (depotId = "", indexHint = -1) => {
    const fromId = parseDepotAutoNumberFromId(depotId);
    if (Number.isFinite(fromId) && fromId > 0) return `Depot ${fromId}`;
    const fromIndex = Number.isFinite(indexHint) && indexHint >= 0 ? indexHint + 1 : null;
    if (Number.isFinite(fromIndex) && fromIndex > 0) return `Depot ${fromIndex}`;
    return String(depotId || "").trim() || "Depot";
  };

  const getNextArticleDepotNumber = (records = [], { maxCount = MAX_ARTICLE_DEPOT_COUNT } = {}) => {
    const source = Array.isArray(records) ? records : [];
    const safeMax = Math.max(1, Math.trunc(Number(maxCount) || MAX_ARTICLE_DEPOT_COUNT));
    const used = new Set();
    source.forEach((entry) => {
      const parsed =
        parseDepotAutoNumberFromId(entry?.id || "") ||
        parseDepotAutoNumber(entry?.tabLabel || entry?.tabName || entry?.name || "");
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > safeMax) return;
      used.add(Math.trunc(parsed));
    });
    for (let number = 1; number <= safeMax; number += 1) {
      if (!used.has(number)) return number;
    }
    return null;
  };

  const createArticleDepotId = (records = [], numberHint = 1, { maxCount = Number.POSITIVE_INFINITY } = {}) => {
    const used = new Set(records.map((entry) => String(entry?.id || "").trim().toLowerCase()).filter(Boolean));
    const safeMax = Number.isFinite(Number(maxCount))
      ? Math.max(1, Math.trunc(Number(maxCount)))
      : Number.POSITIVE_INFINITY;
    const start = Math.max(1, Math.trunc(Number(numberHint) || 1));
    if (Number.isFinite(safeMax) && start > safeMax) return "";
    const base = toDepotTabId("", start);
    if (!used.has(base)) return base;
    let next = start + 1;
    if (Number.isFinite(safeMax) && next > safeMax) return "";
    let candidate = toDepotTabId("", next);
    while (used.has(candidate)) {
      next += 1;
      if (Number.isFinite(safeMax) && next > safeMax) return "";
      candidate = toDepotTabId("", next);
    }
    return candidate;
  };

  const getDepotById = (depotId) => {
    const target = normalizeDepotRefId(depotId);
    if (!target) return null;
    return depotRecords.find((entry) => entry.id === target) || null;
  };

  const resolveLinkedDepotRecord = (depot = {}, indexHint = -1) => {
    const source = depot && typeof depot === "object" ? depot : { id: depot };
    const linkedDepotId = normalizeDepotRefId(
      source?.linkedDepotId || source?.depotDbId || source?.magasinId || source?.magasin_id || ""
    );
    if (linkedDepotId) {
      const linked = getDepotById(linkedDepotId);
      if (linked) return linked;
    }
    const id = normalizeDepotRefId(source?.id || "");
    if (id) {
      const direct = getDepotById(id);
      if (direct) return direct;
    }
    const ownName = String(source?.name || "").trim();
    const fromId = parseDepotAutoNumberFromId(id);
    const fromName = parseDepotAutoNumber(ownName);
    const fromIndex = Number.isFinite(indexHint) && indexHint >= 0 ? indexHint + 1 : null;
    const mappedNumber = fromId || fromName || fromIndex || null;
    if (Number.isFinite(mappedNumber) && mappedNumber > 0) {
      const mapped = depotRecords[mappedNumber - 1];
      if (mapped) return mapped;
    }
    if (ownName && !isGenericDepotName(ownName)) {
      const ownNameKey = ownName.toLowerCase();
      const byName =
        depotRecords.find((entry) => String(entry?.name || "").trim().toLowerCase() === ownNameKey) || null;
      if (byName) return byName;
    }
    return null;
  };

  const resolveArticleDepotSourceId = (depot = {}, indexHint = -1) => {
    const source = depot && typeof depot === "object" ? depot : { id: depot };
    const directLinkedId = normalizeDepotRefId(
      source?.linkedDepotId || source?.depotDbId || source?.magasinId || source?.magasin_id || ""
    );
    if (directLinkedId) return directLinkedId;
    const linked = resolveLinkedDepotRecord(source, indexHint);
    return normalizeDepotRefId(linked?.id || "");
  };

  const getArticleDepotSelectedLocationIds = (depot = {}) =>
    normalizeScopedIdList(
      depot?.selectedLocationIds ??
        depot?.selectedEmplacementIds ??
        depot?.selectedEmplacements ??
        depot?.defaultLocationIds ??
        depot?.defaultLocationId ??
        depot?.defaultLocation ??
        []
    );

  const getScopeDepotById = (scope, depotId) => {
    const target = normalizeDepotRefId(depotId);
    if (!target) return null;
    if (isArticleScope(scope)) {
      const records = getArticleDepotRecords();
      const tabTarget = isDepotTabId(target) ? toDepotTabId(target, 1) : "";
      const articleDepot =
        (tabTarget ? records.find((entry, index) => entry.id === tabTarget) : null) ||
        records.find((entry, index) => resolveArticleDepotSourceId(entry, index) === target) ||
        null;
      const linked = resolveLinkedDepotRecord(articleDepot || { id: target }, records.indexOf(articleDepot));
      return linked || articleDepot;
    }
    return getScopeDepotRecords(scope).find((entry) => entry.id === target) || null;
  };

  const getLocationOptionsForMagasin = (magasinId = "") => {
    const target = normalizeDepotRefId(magasinId);
    if (!target) return [];
    const depotRecord = getDepotById(target);
    if (!depotRecord) return [];
    return normalizeEmplacementRecords(depotRecord.emplacements || [], target).filter(
      (entry) => normalizeDepotRefId(entry?.depotId || target) === target
    );
  };

  const filterLocationIdsByOptions = (values = [], options = []) => {
    const selected = normalizeLocationSelection(values);
    if (!selected.length) return [];
    const allowedSet = new Set(
      (Array.isArray(options) ? options : [])
        .map((entry) => String(entry?.id || "").trim().toLowerCase())
        .filter(Boolean)
    );
    return selected.filter((entry) => allowedSet.has(String(entry || "").trim().toLowerCase()));
  };

  const getCachedDepotDisplayName = (depot = {}, indexHint = -1) => {
    const source = depot && typeof depot === "object" ? depot : { id: depot };
    const target = normalizeDepotRefId(source?.id || "");
    const linked = resolveLinkedDepotRecord(source, indexHint);
    if (linked?.name) return String(linked.name || "").trim();
    if (!target) return "";
    return String(getDepotById(target)?.name || "").trim();
  };

  const pickPreferredDepotName = ({
    ownName = "",
    cachedName = "",
    depotId = "",
    indexHint = -1
  } = {}) => {
    const own = String(ownName || "").trim();
    const cached = String(cachedName || "").trim();
    const ownReal = own && !isGenericDepotName(own);
    const cachedReal = cached && !isGenericDepotName(cached);
    if (cachedReal) return cached;
    if (ownReal) return own;
    if (own) return own;
    if (cached) return cached;
    return getDepotFallbackName(depotId, indexHint);
  };

  const resolveDepotDisplayName = (depot = {}, indexHint = -1) => {
    const id = normalizeDepotRefId(depot?.id || "");
    const cachedName = getCachedDepotDisplayName(depot, indexHint);
    const ownName = String(depot?.name || "").trim();
    return pickPreferredDepotName({
      ownName,
      cachedName,
      depotId: id,
      indexHint
    });
  };

  const fetchDepotDisplayNameFromDb = async (depotId = "", depot = null, indexHint = -1) => {
    const target = normalizeDepotRefId(depotId);
    if (!target) return "";
    const linked = resolveLinkedDepotRecord(
      depot && typeof depot === "object" ? { ...depot, id: target } : { id: target },
      indexHint
    );
    const linkedName = String(linked?.name || "").trim();
    if (linkedName && !isGenericDepotName(linkedName)) return linkedName;
    const lookupId = normalizeDepotRefId(linked?.id || target);
    if (!lookupId || !w.electronAPI?.openDepot) return linkedName;
    try {
      const response = await w.electronAPI.openDepot({ id: lookupId });
      if (!response?.ok) return "";
      const depotSource =
        response?.depot && typeof response.depot === "object"
          ? response.depot
          : {
              id: lookupId,
              name: response?.name || response?.depotName || response?.label || ""
            };
      const depot = normalizeDepotRecord(depotSource);
      if (!depot?.id) return "";
      const existing = depotRecords.find((entry) => entry.id === depot.id);
      if (existing) {
        depotRecords = depotRecords.map((entry) => (entry.id === depot.id ? { ...entry, ...depot } : entry));
      } else {
        depotRecords = [...depotRecords, depot];
      }
      return String(depot.name || "").trim();
    } catch {
      return "";
    }
  };

  const syncArticleDepotNamesFromCache = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return false;
    const current = getArticleDepotRecords();
    if (!current.length) return false;
    let changed = false;
    const next = current.map((entry, index) => {
      const currentName = String(entry?.name || "").trim();
      const resolvedName = resolveDepotDisplayName(entry, index);
      const nextName =
        currentName && !isGenericDepotName(currentName)
          ? currentName
          : resolvedName;
      const normalizedId = toDepotTabId(entry.id || "", index + 1);
      const linkedDepotId = resolveArticleDepotSourceId(entry, index);
      if (
        normalizedId !== entry.id ||
        nextName !== entry.name ||
        linkedDepotId !== normalizeDepotRefId(entry?.linkedDepotId || "")
      ) {
        changed = true;
        return {
          ...entry,
          id: normalizedId || entry.id,
          name: nextName,
          linkedDepotId
        };
      }
      return entry;
    });
    if (!changed) return false;
    setArticleDepotState({
      depots: next,
      selectedDepotId: articleDepotState.selectedDepotId,
      activeDepotId: articleDepotState.activeDepotId
    });
    return true;
  };

  const syncActiveDepotNameFromDb = async (scopeHint = null, depotId = "", article = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return "";
    const target = toDepotTabId(depotId, 1);
    if (!target) return "";
    const current = getArticleDepotRecords();
    const targetIndex = current.findIndex((entry, index) => toDepotTabId(entry?.id || "", index + 1) === target);
    const targetEntry = targetIndex >= 0 ? current[targetIndex] : { id: target, name: "" };
    const dbName = await fetchDepotDisplayNameFromDb(target, targetEntry, targetIndex);
    if (!dbName) return "";
    let changed = false;
    const next = current.map((entry, index) => {
      const id = toDepotTabId(entry.id || "", index + 1);
      const currentName = String(entry?.name || "").trim();
      const linkedDepotId = resolveArticleDepotSourceId(entry, index);
      const name =
        id === target
          ? pickPreferredDepotName({
              ownName: entry?.name || "",
              cachedName: dbName,
              depotId: id,
              indexHint: index
            })
          : resolveDepotDisplayName(entry, index);
      const nextName =
        currentName && !isGenericDepotName(currentName)
          ? currentName
          : name;
      if (
        id !== entry.id ||
        nextName !== entry.name ||
        linkedDepotId !== normalizeDepotRefId(entry?.linkedDepotId || "")
      ) {
        changed = true;
        return {
          ...entry,
          id: id || entry.id,
          name: nextName,
          linkedDepotId
        };
      }
      return entry;
    });
    if (!changed) return dbName;
    setArticleDepotState({
      depots: next,
      selectedDepotId: articleDepotState.selectedDepotId,
      activeDepotId: articleDepotState.activeDepotId
    });
    renderDepotTabs(article, scope);
    syncDepotPicker(scope);
    return dbName;
  };

  const getActiveArticleDepotContext = () => {
    const depots = getArticleDepotRecords();
    const activeDepotId = getArticleActiveDepotId();
    const index = depots.findIndex((entry) => entry.id === activeDepotId);
    const fallbackIndex = index >= 0 ? index : 0;
    const record = depots[fallbackIndex] || null;
    const sourceDepotId = resolveArticleDepotSourceId(record, fallbackIndex);
    return {
      depots,
      activeDepotId,
      index: fallbackIndex,
      record,
      sourceDepotId
    };
  };

  const getUsedMagasinIds = (activeDepotId = "") => {
    const targetDepotId = toDepotTabId(activeDepotId || getArticleActiveDepotId(), 1);
    const used = new Set();
    getArticleDepotRecords().forEach((entry, index) => {
      const depotTabId = toDepotTabId(entry?.id || "", index + 1);
      if (!depotTabId || depotTabId === targetDepotId) return;
      const magasinId = normalizeDepotRefId(resolveArticleDepotSourceId(entry, index));
      if (!magasinId) return;
      used.add(magasinId);
    });
    return used;
  };

  const getDepotStockQty = (depot = {}, fallback = 0) =>
    normalizeStockQty(
      depot?.stockQty ??
        depot?.stock_qty ??
        depot?.quantity ??
        depot?.qty,
      fallback
    );

  const getDepotStockQtyCustomized = (depot = {}, fallback = false) =>
    toBooleanFlag(
      depot?.stockQtyCustomized ??
        depot?.stock_qty_customized ??
        depot?.depotStockCustomized ??
        depot?.depot_stock_customized ??
        fallback
    );

  const hasExplicitDepotStockQty = (entry = {}) => {
    const source = entry && typeof entry === "object" ? entry : {};
    return ["stockQty", "stock_qty", "quantity", "qty"].some((key) => {
      if (!Object.prototype.hasOwnProperty.call(source, key)) return false;
      return String(source[key] ?? "").trim() !== "";
    });
  };

  const resolveDepotStockCustomizationState = (
    sourceArticle = {},
    sourceDepots = [],
    stockManagement = {},
    totalStockQty = 0
  ) => {
    const fromArticle = toBooleanFlag(sourceArticle?.depotStockCustomized ?? sourceArticle?.depot_stock_customized);
    const fromStockManagement = toBooleanFlag(
      stockManagement?.depotStockCustomized ?? stockManagement?.depot_stock_customized
    );
    const fromDepots = (Array.isArray(sourceDepots) ? sourceDepots : []).some((entry) =>
      getDepotStockQtyCustomized(entry, false)
    );
    const hasAnyExplicitStockQty = (Array.isArray(sourceDepots) ? sourceDepots : []).some((entry) =>
      hasExplicitDepotStockQty(entry)
    );
    let stockCustomized = fromArticle || fromStockManagement || fromDepots;
    if (!stockCustomized && hasAnyExplicitStockQty) {
      const normalizedDepots = normalizeArticleDepotRecords(sourceDepots);
      const distributedDefaults = distributeDepotStocksFromTotal(totalStockQty, normalizedDepots);
      const followsDefaultDistribution = normalizedDepots.every((entry, index) => {
        const savedQty = getDepotStockQty(entry, 0);
        const defaultQty = getDepotStockQty(distributedDefaults[index], 0);
        return savedQty === defaultQty;
      });
      stockCustomized = !followsDefaultDistribution;
    }
    return {
      stockCustomized,
      hasAnyExplicitStockQty
    };
  };

  const computeDepotRemainingStockQty = (totalStockQty = 0, previousDepots = []) => {
    const total = normalizeStockQty(totalStockQty, 0);
    const depots = Array.isArray(previousDepots) ? previousDepots : [];
    const used = depots.reduce((sum, entry) => sum + getDepotStockQty(entry, 0), 0);
    return normalizeStockQty(total - used, 0);
  };

  const distributeDepotStocksFromTotal = (totalStockQty = 0, depots = []) => {
    const total = normalizeStockQty(totalStockQty, 0);
    const source = Array.isArray(depots) ? depots : [];
    const distributed = [];
    let allocated = 0;
    source.forEach((entry, index) => {
      const nextQty = index === 0 ? total : normalizeStockQty(total - allocated, 0);
      allocated += nextQty;
      distributed.push({
        ...entry,
        stockQty: nextQty,
        stockQtyCustomized: false
      });
    });
    return distributed;
  };

  const applyDefaultDepotStockDistribution = (scopeHint = null, { force = false } = {}) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return false;
    if (!force && isArticleDepotStockCustomized()) return false;
    const current = getArticleDepotRecords();
    if (!current.length) return false;
    const totalStockQty = getArticleStockQtyInputValue(scope);
    const distributed = distributeDepotStocksFromTotal(totalStockQty, current);
    setArticleDepotState({
      depots: distributed,
      selectedDepotId: articleDepotState.selectedDepotId,
      activeDepotId: articleDepotState.activeDepotId,
      stockCustomized: false
    });
    const context = getActiveArticleDepotContext();
    const activeStockQty = getDepotStockQty(context.record, totalStockQty);
    syncActiveDepotStockField(scope, context.record, context.index);
    syncReadOnlyInfo(scope, { stockQty: activeStockQty });
    return true;
  };

  const getArticleStockQtyInputValue = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return 0;
    const fields = getFields(scope);
    return normalizeStockQty(getNumValue(fields.qty, 0), 0);
  };

  const syncActiveDepotStockField = (scopeHint = null, depotRecordHint = null, depotIndexHint = -1) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return 0;
    const fields = getFields(scope);
    const context = getActiveArticleDepotContext();
    const resolvedIndex = Number.isFinite(depotIndexHint) && depotIndexHint >= 0
      ? depotIndexHint
      : Number.isFinite(context.index)
      ? context.index
      : 0;
    const fallbackRecord = context.record || { id: context.activeDepotId || MAIN_ARTICLE_DEPOT_ID };
    const record = depotRecordHint && typeof depotRecordHint === "object" ? depotRecordHint : fallbackRecord;
    const fallbackStockQty = getArticleStockQtyInputValue(scope);
    const stockQty = getDepotStockQty(record, fallbackStockQty);
    const depotNumber = getDepotTabNumber(record, resolvedIndex);

    if (fields.depotStockQtyLabel instanceof HTMLElement) {
      fields.depotStockQtyLabel.textContent = `Stock Depot ${depotNumber}`;
    }
    if (fields.depotStockQty instanceof HTMLElement) {
      fields.depotStockQty.value = String(stockQty);
      fields.depotStockQty.dataset.depotId = String(record?.id || context.activeDepotId || MAIN_ARTICLE_DEPOT_ID).trim();
    }

    return stockQty;
  };

  const persistActiveDepotStockQty = (
    scopeHint = null,
    valueHint = 0,
    { markCustomized = false } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return normalizeStockQty(valueHint, 0);
    const context = getActiveArticleDepotContext();
    if (!context.record?.id) return normalizeStockQty(valueHint, getArticleStockQtyInputValue(scope));
    const nextStockQty = normalizeStockQty(valueHint, getDepotStockQty(context.record, getArticleStockQtyInputValue(scope)));
    updateArticleDepotRecord(context.record.id, (draft) => ({
      ...draft,
      stockQty: nextStockQty,
      stockQtyCustomized: markCustomized ? true : getDepotStockQtyCustomized(draft, false)
    }));
    if (markCustomized) {
      setArticleDepotStockCustomized(true);
    }
    syncActiveDepotStockField(scope);
    return nextStockQty;
  };

  const persistActiveArticleDepotSelection = ({
    linkedDepotId = "",
    depotName = "",
    selectedLocationIds = [],
    selectedEmplacementIds = []
  } = {}) => {
    const context = getActiveArticleDepotContext();
    if (!context.record?.id) return null;
    const nextLinkedDepotId =
      normalizeDepotRefId(linkedDepotId) || normalizeDepotRefId(context.record?.linkedDepotId || "");
    const nextLocationIds = normalizeScopedIdList(
      selectedLocationIds.length ? selectedLocationIds : getArticleDepotSelectedLocationIds(context.record)
    );
    const nextEmplacementIds = normalizeScopedIdList(
      selectedEmplacementIds.length ? selectedEmplacementIds : nextLocationIds
    );
    const preferredName = String(depotName || "").trim();
    return updateArticleDepotRecord(context.record.id, (draft) => ({
      ...draft,
      linkedDepotId: nextLinkedDepotId,
      name:
        preferredName && !isGenericDepotName(preferredName)
          ? preferredName
          : String(draft?.name || "").trim(),
      selectedLocationIds: nextLocationIds.slice(),
      selectedEmplacementIds: nextEmplacementIds.slice()
    }));
  };

  const getScopeActiveDepotId = (scope, fields = null) => {
    if (isArticleScope(scope)) return getArticleActiveDepotId();
    const resolvedFields = fields || getFields(scope);
    return String(resolvedFields?.defaultDepot?.value || "").trim();
  };

  const toScopeNode = (node) => {
    if (!(node instanceof HTMLElement)) return null;
    if (node.matches?.(ADD_SCOPE_SELECTOR)) return node;
    return typeof node.closest === "function" ? node.closest(ADD_SCOPE_SELECTOR) : null;
  };

  const resolveScope = (scopeHint = null) => {
    const hinted = toScopeNode(scopeHint);
    if (hinted) return hinted;
    if (typeof SEM.resolveAddFormScope === "function") {
      const active = toScopeNode(SEM.resolveAddFormScope());
      if (active) return active;
    }
    if (typeof document === "undefined") return null;
    return (
      document.querySelector("#articleFormPopover:not([hidden])") ||
      document.getElementById("articleFormPopover") ||
      document.getElementById("addItemBoxMainscreen") ||
      document.getElementById("addItemBox")
    );
  };

  const getField = (scope, id) => {
    const scoped = scope?.querySelector?.(`#${id}`) || null;
    if (scoped) return scoped;
    if (typeof w.getEl === "function") return w.getEl(id);
    if (typeof document !== "undefined") return document.getElementById(id);
    return null;
  };

  const getNumValue = (field, fallback = 0) => {
    if (!field) return fallback;
    const raw = String(field.value ?? "").replace(",", ".").trim();
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  };

  const parseOptionalNumber = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).replace(",", ".").trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const setFieldValue = (field, value) => {
    if (!field) return;
    field.value = value ?? "";
  };

  const setDisabledState = (field, disabled) => {
    if (!(field instanceof HTMLElement)) return;
    field.disabled = !!disabled;
    field.setAttribute("aria-disabled", disabled ? "true" : "false");
  };

  const notifyDepotMessage = async (message = "", title = "Depot") => {
    const text = String(message || "").trim();
    if (!text) return;
    try {
      if (typeof w.showToast === "function") {
        w.showToast(text);
        return;
      }
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title });
        return;
      }
      if (typeof w.alert === "function") {
        w.alert(text);
      }
    } catch {}
  };

  const resolvePopover = (scope) => {
    if (scope?.id === "articleFormPopover") return scope;
    return scope?.closest?.("#articleFormPopover") || null;
  };

  const isViewMode = (scope) => {
    const popover = resolvePopover(scope);
    return String(popover?.dataset?.articleFormMode || "").toLowerCase() === "view";
  };

  const isPreviewMode = (scope) => {
    const popover = resolvePopover(scope);
    return String(popover?.dataset?.mode || "").toLowerCase() === "preview";
  };

  const getFields = (scope) => ({
    layout: scope?.querySelector?.("[data-stock-management-layout]") || null,
    panel:
      getField(scope, "addStockManagementPanel") ||
      scope?.querySelector?.("[data-stock-management-panel]") ||
      null,
    qty: getField(scope, "addStockQty"),
    purchasePrice: getField(scope, "addPurchasePrice"),
    salesPrice: getField(scope, "addPrice"),
    unit: getField(scope, "addUnit"),
    defaultDepot: getField(scope, "addStockDefaultDepot"),
    defaultDepotMenu: getField(scope, "addStockDefaultDepotMenu"),
    defaultDepotPanel: getField(scope, "addStockDefaultDepotPanel"),
    defaultDepotDisplay: getField(scope, "addStockDefaultDepotDisplay"),
    depotRemoveBtn: getField(scope, "articleDepotRemoveBtn"),
    depotAddBtn: getField(scope, "articleDepotAddBtn"),
    depotTabsRow: getField(scope, "articleDepotTabsRow"),
    defaultLocation: getField(scope, "addStockDefaultLocation"),
    defaultLocationMenu: getField(scope, "addStockDefaultLocationMenu"),
    defaultLocationPanel: getField(scope, "addStockDefaultLocationPanel"),
    defaultLocationDisplay: getField(scope, "addStockDefaultLocationDisplay"),
    depotStockQtyLabel: getField(scope, "addStockDepotQtyLabel"),
    depotStockQty: getField(scope, "addStockDepotQty"),
    allowNegative: getField(scope, "addStockAllowNegative"),
    blockInsufficient: getField(scope, "addStockBlockInsufficient"),
    alert: getField(scope, "addStockAlert"),
    min: getField(scope, "addStockMin"),
    max: getField(scope, "addStockMax"),
    unitDisplay: getField(scope, "addStockUnitDisplay"),
    availableDisplay: getField(scope, "addStockAvailableDisplay"),
    totalCostAchat: getField(scope, "addStockTotalCostAchat"),
    totalValueVente: getField(scope, "addStockTotalValueVente"),
  });

  const getMoneyDecimals = () => {
    const currency = String(SEM?.state?.meta?.currency || "DT").trim().toUpperCase();
    return currency === "DT" ? 3 : 2;
  };

  const formatMoneyValue = (value) => {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return safe.toFixed(getMoneyDecimals());
  };

  const getOptionLabel = (option) =>
    String(option?.textContent || option?.label || option?.value || "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeLocationSelection = (value = []) => {
    const source = (() => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        if (Array.isArray(value.ids)) return value.ids;
        if (Array.isArray(value.values)) return value.values;
      }
      const raw = String(value ?? "").trim();
      if (!raw) return [];
      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      return [raw];
    })();
    const seen = new Set();
    const normalized = [];
    source.forEach((entry) => {
      const id = String(entry ?? "").trim();
      if (!id) return;
      const key = id.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push(id);
    });
    return normalized;
  };

  const getSelectedLocationIds = (select) => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return [];
    return normalizeLocationSelection(
      Array.from(select.selectedOptions || []).map((option) => String(option.value || "").trim())
    );
  };

  const setSelectedLocationIds = (select, values = []) => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return [];
    const selectedIds = normalizeLocationSelection(values);
    const selectedSet = new Set(selectedIds.map((entry) => entry.toLowerCase()));
    const selectedResolved = [];
    Array.from(select.options || []).forEach((option) => {
      const value = String(option.value || "").trim();
      const key = value.toLowerCase();
      const isSelected = !!value && selectedSet.has(key);
      option.selected = isSelected;
      if (isSelected) selectedResolved.push(value);
    });
    return selectedResolved;
  };

  const getSelectedLocationCodes = (select, values = []) => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return [];
    const selectedIds = normalizeLocationSelection(values);
    const selectedSet = new Set(selectedIds.map((entry) => entry.toLowerCase()));
    const codes = [];
    Array.from(select.options || []).forEach((option) => {
      const value = String(option.value || "").trim();
      if (!value || !selectedSet.has(value.toLowerCase())) return;
      codes.push(String(option.dataset?.code || option.textContent || value).trim());
    });
    return codes.filter(Boolean);
  };

  const getLocationDisplayLabel = (select, values = []) => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") {
      return LOCATION_NONE_LABEL;
    }
    const selectedIds = normalizeLocationSelection(values);
    if (!selectedIds.length) return LOCATION_NONE_LABEL;
    if (selectedIds.length === 1) {
      const target = selectedIds[0];
      const option = Array.from(select.options || []).find(
        (entry) => String(entry.value || "").trim() === target
      );
      return getOptionLabel(option) || target;
    }
    return `${selectedIds.length} emplacements`;
  };

  const getActiveArticleMainTab = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return "";
    const tabs = Array.from(scope.querySelectorAll(ARTICLE_MAIN_TAB_SELECTOR)).filter(
      (entry) => entry instanceof HTMLElement
    );
    const activeTab =
      tabs.find((entry) => entry.getAttribute("aria-selected") === "true") ||
      tabs.find((entry) => entry.classList.contains("is-active")) ||
      null;
    return String(activeTab?.dataset?.articleTab || "").trim().toLowerCase();
  };

  const setDepotTabsActiveState = (scopeHint = null, depotId = "") => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return "";
    const targetDepotId = toDepotTabId(depotId || getArticleActiveDepotId() || MAIN_ARTICLE_DEPOT_ID, 1);
    const tabs = Array.from(scope.querySelectorAll(ARTICLE_ALL_DEPOT_TAB_BUTTON_SELECTOR)).filter(
      (entry) => entry instanceof HTMLElement && entry.tagName === "BUTTON"
    );
    if (!tabs.length) return targetDepotId;
    const hasTargetTab = tabs.some(
      (entry) => toDepotTabId(entry.dataset?.depotId || "", 1) === targetDepotId
    );
    const resolvedActiveDepotId = hasTargetTab ? targetDepotId : MAIN_ARTICLE_DEPOT_ID;
    tabs.forEach((tab) => {
      const tabDepotId = toDepotTabId(tab.dataset?.depotId || "", 1);
      const isDepotActive = tabDepotId === resolvedActiveDepotId;
      const isMainStockTab = String(tab.dataset?.articleTab || "").toLowerCase() === ARTICLE_MAIN_STOCK_TAB;
      tab.dataset.depotActive = isDepotActive ? "true" : "false";
      tab.classList.remove("is-active", "is-depot-active");
      if (isMainStockTab) return;
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    });
    const activeTab = tabs.find(
      (entry) => toDepotTabId(entry.dataset?.depotId || "", 1) === resolvedActiveDepotId
    );
    if (activeTab instanceof HTMLElement) {
      const isMainStockTab = String(activeTab.dataset?.articleTab || "").toLowerCase() === ARTICLE_MAIN_STOCK_TAB;
      if (!isMainStockTab) {
        activeTab.classList.add("is-active");
        activeTab.setAttribute("aria-selected", "true");
        activeTab.tabIndex = 0;
      }
    }
    return resolvedActiveDepotId;
  };

  const activateArticleStockMainTab = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return false;
    if (typeof SEM.articleModalTabs?.activateTab === "function") {
      SEM.articleModalTabs.activateTab(scope, ARTICLE_MAIN_STOCK_TAB, { focus: false });
      return true;
    }

    const tabs = Array.from(scope.querySelectorAll(ARTICLE_MAIN_TAB_SELECTOR)).filter(
      (entry) => entry instanceof HTMLElement
    );
    const panels = Array.from(scope.querySelectorAll(ARTICLE_MAIN_TAB_PANEL_SELECTOR)).filter(
      (entry) => entry instanceof HTMLElement
    );
    if (!tabs.length || !panels.length) return false;

    tabs.forEach((tab) => {
      const isActive = String(tab.dataset?.articleTab || "").toLowerCase() === ARTICLE_MAIN_STOCK_TAB;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = String(panel.dataset?.articleModalPanel || "").toLowerCase() === ARTICLE_MAIN_STOCK_TAB;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (isActive) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    return true;
  };

  const activateArticleDepotTab = (depotTab = null, evt = null) => {
    if (!(depotTab instanceof HTMLElement)) return false;
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    if (depotTab.getAttribute("aria-disabled") === "true") return true;
    const scope = toScopeNode(depotTab);
    if (!scope) return true;
    const depotId = String(depotTab.dataset?.depotId || "").trim();
    if (!depotId) return true;
    activateArticleStockMainTab(scope);
    setActiveDepot(null, depotId, {
      scopeHint: scope,
      clearLocation: false,
      preferredLocationIds: []
    });
    return true;
  };

  const renderDepotTabs = (article = null, scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return [];
    const fields = getFields(scope);
    const row = fields.depotTabsRow;
    if (!(row instanceof HTMLElement)) return [];

    const depots = getArticleDepotRecords();
    const activeDepotId = getArticleActiveDepotId();
    const extraDepots = depots.filter((entry, index) => getDepotTabNumber(entry, index) > 1);
    row.replaceChildren();
    extraDepots.forEach((entry, renderIndex) => {
      const sourceIndex = depots.findIndex((candidate) => candidate.id === entry.id);
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("type", "button");
      tab.className = "swbDialog__tab article-depot-tab depot-tab";
      tab.dataset.articleDepotTab = "1";
      tab.dataset.depotId = entry.id;
      tab.setAttribute("role", "tab");
      tab.addEventListener("mousedown", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
      });
      tab.addEventListener("click", (evt) => {
        activateArticleDepotTab(tab, evt);
      });
      tab.textContent = getDepotTabLabel(entry, sourceIndex >= 0 ? sourceIndex : renderIndex + 1);
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
      tab.dataset.depotActive = "false";
      row.appendChild(tab);
    });
    row.hidden = extraDepots.length === 0;
    setDepotTabsActiveState(scope, activeDepotId);
    syncArticleDepotAddButtonState(scope);

    if (article && typeof article === "object") {
      article.depots = depots.map((entry) => ({
        id: entry.id,
        name: entry.name,
        linkedDepotId: normalizeDepotRefId(entry?.linkedDepotId || ""),
        stockQty: getDepotStockQty(entry, 0),
        stockQtyCustomized: getDepotStockQtyCustomized(entry, false),
        selectedLocationIds: normalizeScopedIdList(entry?.selectedLocationIds || []),
        selectedEmplacementIds: normalizeScopedIdList(
          entry?.selectedEmplacementIds || entry?.selectedLocationIds || []
        ),
        createdAt: entry.createdAt || new Date().toISOString()
      }));
      article.activeDepotId = activeDepotId;
      article.selectedDepotId = activeDepotId;
      article.depotStockCustomized = isArticleDepotStockCustomized();
      if (article.stockManagement && typeof article.stockManagement === "object") {
        article.stockManagement.depotStockCustomized = isArticleDepotStockCustomized();
      }
    }
    return depots.slice();
  };

  const setDepotTabsDisabled = (scopeHint = null, disabled = false) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return;
    const fields = getFields(scope);
    if (!(fields.depotTabsRow instanceof HTMLElement)) return;
    fields.depotTabsRow
      .querySelectorAll(ARTICLE_DEPOT_TAB_SELECTOR)
      .forEach((tab) => {
        if (!(tab instanceof HTMLElement) || tab.tagName !== "BUTTON") return;
        tab.disabled = !!disabled;
        tab.setAttribute("aria-disabled", disabled ? "true" : "false");
      });
  };

  const setSelectOptions = (select, records = [], valueHint = "") => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;
    const preferredValue = normalizeDepotRefId(valueHint || select.value || "");
    const normalizedRecords = normalizeDepotRecords(records);
    const options = [
      {
        value: EMPTY_DEPOT_VALUE,
        label: DEPOT_PLACEHOLDER_LABEL
      },
      ...normalizedRecords.map((entry, index) => ({
      value: normalizeDepotRefId(entry.id || ""),
      label: resolveDepotDisplayName(entry, index)
      }))
    ];

    const currentSerialized = Array.from(select.options || [])
      .map((entry) => `${entry.value}::${entry.textContent}`)
      .join("||");
    const nextSerialized = options.map((entry) => `${entry.value}::${entry.label}`).join("||");
    if (currentSerialized !== nextSerialized) {
      select.replaceChildren();
      options.forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      });
    }
    const fallbackValue = options[0]?.value || EMPTY_DEPOT_VALUE;
    select.value = preferredValue && options.some((entry) => entry.value === preferredValue)
      ? preferredValue
      : fallbackValue;
  };

  const setLocationSelectOptions = (select, entries = [], valuesHint = []) => {
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return [];
    const preferredValues = normalizeLocationSelection(
      normalizeLocationSelection(valuesHint).length ? valuesHint : getSelectedLocationIds(select)
    );
    const normalizedEntries = normalizeEmplacementRecords(entries);
    const options = normalizedEntries.map((entry) => ({
      value: entry.id,
      label: entry.code,
      record: entry
    }));

    const currentSerialized = Array.from(select.options || [])
      .map((entry) => `${entry.value}::${entry.textContent}`)
      .join("||");
    const nextSerialized = options.map((entry) => `${entry.value}::${entry.label}`).join("||");
    if (currentSerialized !== nextSerialized) {
      select.replaceChildren();
      options.forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        if (entry.record?.code) option.dataset.code = entry.record.code;
        if (entry.record?.depotId) option.dataset.depotId = entry.record.depotId;
        select.appendChild(option);
      });
    }
    return setSelectedLocationIds(select, preferredValues);
  };

  const updateDepotEmplacements = (depotId, emplacements = []) => {
    const target = String(depotId || "").trim();
    if (!target) return;
    const normalized = normalizeEmplacementRecords(emplacements, target);
    let touched = false;
    const next = depotRecords.map((entry) => {
      if (entry.id !== target) return entry;
      touched = true;
      return { ...entry, emplacements: normalized };
    });
    if (!touched) {
      next.push({
        id: target,
        name: target,
        emplacements: normalized
      });
    }
    depotRecords = next;
  };

  const fetchEmplacementsByDepot = async (depotId) => {
    const target = String(depotId || "").trim();
    if (!target || !w.electronAPI?.listEmplacementsByDepot) {
      return getDepotById(target)?.emplacements || [];
    }
    try {
      const response = await w.electronAPI.listEmplacementsByDepot({ depotId: target });
      if (response?.ok && Array.isArray(response.results)) {
        updateDepotEmplacements(target, response.results);
        return getDepotById(target)?.emplacements || [];
      }
    } catch {}
    return getDepotById(target)?.emplacements || [];
  };

  const closePickerMenu = (menu) => {
    if (!(menu instanceof HTMLElement)) return;
    menu.removeAttribute("open");
    menu.querySelector("summary")?.setAttribute("aria-expanded", "false");
  };

  const wireDepotPickerMenu = (scope) => {
    const fields = getFields(scope);
    const menu = fields.defaultDepotMenu;
    if (!(menu instanceof HTMLElement) || menu.dataset.stockWired === "1") return;
    const summary = menu.querySelector("summary");
    if (!(summary instanceof HTMLElement)) return;
    menu.dataset.stockWired = "1";
    summary.setAttribute("aria-expanded", menu.hasAttribute("open") ? "true" : "false");
    menu.addEventListener("toggle", () => {
      const disabled = menu.dataset.disabled === "true";
      if (disabled && menu.hasAttribute("open")) {
        closePickerMenu(menu);
        return;
      }
      const isOpen = menu.hasAttribute("open");
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        fields.defaultDepotPanel?.querySelector?.(".model-select-option:not([disabled])")?.focus?.();
      } else {
        summary.focus?.();
      }
    });
    summary.addEventListener("click", (event) => {
      if (menu.dataset.disabled !== "true") return;
      event.preventDefault();
      event.stopPropagation();
    });
    fields.defaultDepotPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePickerMenu(menu);
      summary.focus?.();
    });
  };

  const wireLocationPickerMenu = (scope) => {
    const fields = getFields(scope);
    const menu = fields.defaultLocationMenu;
    if (!(menu instanceof HTMLElement) || menu.dataset.stockLocationWired === "1") return;
    const summary = menu.querySelector("summary");
    if (!(summary instanceof HTMLElement)) return;
    menu.dataset.stockLocationWired = "1";
    summary.setAttribute("aria-expanded", menu.hasAttribute("open") ? "true" : "false");
    menu.addEventListener("toggle", () => {
      const disabled = menu.dataset.disabled === "true";
      if (disabled && menu.hasAttribute("open")) {
        closePickerMenu(menu);
        return;
      }
      const isOpen = menu.hasAttribute("open");
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        fields.defaultLocationPanel?.querySelector?.(".model-select-option:not([disabled])")?.focus?.();
      } else {
        summary.focus?.();
      }
    });
    summary.addEventListener("click", (event) => {
      if (menu.dataset.disabled !== "true") return;
      event.preventDefault();
      event.stopPropagation();
    });
    fields.defaultLocationPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePickerMenu(menu);
      summary.focus?.();
    });
  };

  const syncDepotPicker = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const articleScope = isArticleScope(scope);
    if (articleScope) {
      syncArticleDepotNamesFromCache(scope);
    }
    const fields = getFields(scope);
    const select = fields.defaultDepot;
    const menu = fields.defaultDepotMenu;
    const panel = fields.defaultDepotPanel;
    const display = fields.defaultDepotDisplay;
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;
    const records = getScopeDepotRecords(scope);
    const pickerRecords = articleScope ? depotRecords : records;
    let activeDepotTabId = "";
    if (articleScope) {
      activeDepotTabId = String(getArticleActiveDepotId() || MAIN_ARTICLE_DEPOT_ID).trim();
      const hasActiveDepot = activeDepotTabId && records.some((entry) => entry.id === activeDepotTabId);
      if (!hasActiveDepot) {
        activeDepotTabId = String(records[0]?.id || MAIN_ARTICLE_DEPOT_ID).trim();
      }
      setArticleActiveDepotId(activeDepotTabId);
      setArticleSelectedDepotId(activeDepotTabId);
      const activeIndex = records.findIndex((entry) => entry.id === activeDepotTabId);
      const activeDepotRecord = activeIndex >= 0 ? records[activeIndex] : null;
      const sourceDepotId = resolveArticleDepotSourceId(activeDepotRecord, activeIndex);
      setSelectOptions(select, pickerRecords, sourceDepotId || EMPTY_DEPOT_VALUE);
      setFieldValue(select, sourceDepotId || EMPTY_DEPOT_VALUE);
    } else {
      setSelectOptions(select, pickerRecords, select.value);
    }
    const activeMagasinId = normalizeDepotRefId(String(select.value || "").trim());
    const usedMagasinIds = articleScope ? getUsedMagasinIds(activeDepotTabId) : new Set();

    wireDepotPickerMenu(scope);

    const selectedOption =
      (select.selectedOptions && select.selectedOptions.length ? select.selectedOptions[0] : null) ||
      Array.from(select.options || []).find((option) => option.value === select.value) ||
      null;
    const hasSelectedDepot =
      !!(selectedOption && String(selectedOption.value || "").trim());
    const selectedLabel =
      (hasSelectedDepot
        ? getOptionLabel(selectedOption)
        : "") || DEPOT_PLACEHOLDER_LABEL;
    if (display) display.textContent = selectedLabel;
    if (menu instanceof HTMLElement) {
      menu.dataset.selected = hasSelectedDepot ? "true" : "false";
    }
    if (display instanceof HTMLElement) {
      display.dataset.selected = hasSelectedDepot ? "true" : "false";
    }

    if (!(panel instanceof HTMLElement)) return;
    panel.replaceChildren();
    let count = 0;
    Array.from(select.options || []).forEach((option) => {
      if (!option.value) return;
      const magasinId = normalizeDepotRefId(String(option.value || "").trim());
      const isCurrent = articleScope && !!magasinId && magasinId === activeMagasinId;
      const isUsedElsewhere = articleScope && !!magasinId && usedMagasinIds.has(magasinId);
      const blockedByUniqueness = !!(isUsedElsewhere && !isCurrent);
      const baseOptionDisabled = !!option.disabled;
      if (articleScope) {
        option.disabled = baseOptionDisabled || blockedByUniqueness;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-select-option";
      button.dataset.value = option.value;
      button.setAttribute("role", "option");
      button.textContent = getOptionLabel(option);
      const isDisabled = !!option.disabled || !!select.disabled;
      button.disabled = isDisabled;
      button.classList.toggle("is-disabled", isDisabled);
      button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      const isActive = option.value === select.value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.addEventListener("click", () => {
        if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
        const nextValue = option.value;
        const changed = select.value !== nextValue;
        select.value = nextValue;
        if (display) display.textContent = getOptionLabel(option);
        closePickerMenu(menu);
        if (changed) {
          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        } else {
          syncDepotPicker(scope);
        }
      });
      panel.appendChild(button);
      count += 1;
    });

    if (!count) {
      const empty = document.createElement("p");
      empty.className = "model-select-empty";
      empty.textContent = "Aucun depot enregistre";
      panel.appendChild(empty);
    }
  };

  const syncLocationPicker = (
    scopeHint = null,
    { clearValue = false, forceDisabled = false, preferredLocationIds = [], magasinId = "" } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const select = fields.defaultLocation;
    const menu = fields.defaultLocationMenu;
    const panel = fields.defaultLocationPanel;
    const display = fields.defaultLocationDisplay;
    if (!(select instanceof HTMLElement) || select.tagName !== "SELECT") return;

    wireLocationPickerMenu(scope);

    const selectedDepotId = getScopeActiveDepotId(scope, fields);
    const articleContext = isArticleScope(scope) ? getActiveArticleDepotContext() : null;
    const selectedDepotLookupId = normalizeDepotRefId(
      magasinId ||
        (isArticleScope(scope)
          ? articleContext?.sourceDepotId || fields.defaultDepot?.value || ""
          : fields.defaultDepot?.value || selectedDepotId)
    );
    const selectedDepot = getScopeDepotById(scope, selectedDepotLookupId || selectedDepotId);
    const locationOptions = getLocationOptionsForMagasin(selectedDepotLookupId);
    const preferredIds = clearValue
      ? []
      : (() => {
          const normalizedPreferred = normalizeLocationSelection(preferredLocationIds);
          if (normalizedPreferred.length) return normalizedPreferred;
          if (isArticleScope(scope) && articleContext?.record) {
            return getArticleDepotSelectedLocationIds(articleContext.record);
          }
          return getSelectedLocationIds(select);
        })();
    const scopedPreferredIds = filterLocationIdsByOptions(preferredIds, locationOptions);
    const selectedLocationIds = setLocationSelectOptions(select, locationOptions, scopedPreferredIds);
    const shouldDisable = !!forceDisabled || !selectedDepotLookupId || !locationOptions.length;
    setLocationPickerDisabled(fields, shouldDisable);

    const selectedLabel = getLocationDisplayLabel(select, selectedLocationIds);
    if (display) display.textContent = selectedLabel;
    if (menu instanceof HTMLElement) {
      menu.dataset.selected = selectedLocationIds.length ? "true" : "false";
    }
    if (display instanceof HTMLElement) {
      display.dataset.selected = selectedLocationIds.length ? "true" : "false";
    }

    if (!(panel instanceof HTMLElement)) return;
    panel.setAttribute("aria-multiselectable", "true");
    panel.replaceChildren();
    let count = 0;
    Array.from(select.options || []).forEach((option) => {
      if (!option.value) return;
      const optionDepotId = normalizeDepotRefId(String(option.dataset?.depotId || "").trim());
      if (selectedDepotLookupId && optionDepotId !== selectedDepotLookupId) return;
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
      label.textContent = getOptionLabel(option);
      button.appendChild(checkbox);
      button.appendChild(label);
      const isDisabled = !!option.disabled || !!select.disabled;
      button.disabled = isDisabled;
      button.classList.toggle("is-disabled", isDisabled);
      button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      const isActive = selectedLocationIds.some((entry) => entry === option.value);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.disabled) return;
        const nextValue = String(option.value || "").trim();
        const currentIds = getSelectedLocationIds(select);
        const hasValue = currentIds.some((entry) => entry === nextValue);
        const nextIds = hasValue
          ? currentIds.filter((entry) => entry !== nextValue)
          : [...currentIds, nextValue];
        const resolvedIds = setSelectedLocationIds(select, nextIds);
        syncLocationPicker(scope, {
          clearValue: false,
          forceDisabled,
          preferredLocationIds: resolvedIds
        });
        try {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      });
      panel.appendChild(button);
      count += 1;
    });

    if (!count) {
      const empty = document.createElement("p");
      empty.className = "model-select-empty";
      empty.textContent = selectedDepotLookupId ? LOCATION_EMPTY_LABEL : "Selectionnez d'abord un depot";
      panel.appendChild(empty);
    }
    if (isArticleScope(scope)) {
      persistActiveArticleDepotSelection({
        linkedDepotId: selectedDepotLookupId,
        depotName: selectedDepot?.name || "",
        selectedLocationIds,
        selectedEmplacementIds: selectedLocationIds
      });
    }
  };

  const refreshLocationOptionsForMagasin = (
    scopeHint = null,
    magasinId = "",
    { clearValue = false, forceDisabled = false, preferredLocationIds = [] } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return [];
    syncLocationPicker(scope, {
      clearValue,
      forceDisabled,
      preferredLocationIds,
      magasinId
    });
    const fields = getFields(scope);
    return getSelectedLocationIds(fields.defaultLocation);
  };

  const handleDepotSelectionChange = async (
    scopeHint = null,
    { clearLocation = true, preferredLocationIds = [] } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const selectedDepotId = getScopeActiveDepotId(scope, fields);
    const selectedDepot = getScopeDepotById(scope, selectedDepotId);
    const selectedDepotLookupId = isArticleScope(scope)
      ? normalizeDepotRefId(resolveArticleDepotSourceId(getArticleDepotRecordByTabId(selectedDepotId)))
      : normalizeDepotRefId(selectedDepot?.id || selectedDepotId);
    const selectedMagasinId = normalizeDepotRefId(String(fields.defaultDepot?.value || selectedDepotLookupId || "").trim());
    const preferredIds = normalizeLocationSelection(preferredLocationIds);
    const previousLocationIds = isArticleScope(scope)
      ? getArticleDepotSelectedLocationIds(getArticleDepotRecordByTabId(selectedDepotId))
      : getSelectedLocationIds(fields.defaultLocation);
    const keptLocationIds = preferredIds.length ? preferredIds : previousLocationIds;
    if (!selectedMagasinId) {
      refreshLocationOptionsForMagasin(scope, "", {
        clearValue: clearLocation,
        preferredLocationIds: clearLocation ? [] : keptLocationIds
      });
      syncDepotPicker(scope);
      return;
    }
    refreshLocationOptionsForMagasin(scope, selectedMagasinId, {
      clearValue: clearLocation,
      preferredLocationIds: clearLocation ? [] : keptLocationIds
    });
    if (selectedMagasinId) {
      await fetchEmplacementsByDepot(selectedMagasinId);
    }
    refreshLocationOptionsForMagasin(scope, selectedMagasinId, {
      clearValue: false,
      preferredLocationIds: clearLocation ? [] : keptLocationIds
    });
    syncDepotPicker(scope);
  };

  const setDepotPickerDisabled = (fields, disabled) => {
    setDisabledState(fields.defaultDepot, disabled);
    if (!(fields.defaultDepotMenu instanceof HTMLElement)) return;
    const disabledText = disabled ? "true" : "false";
    fields.defaultDepotMenu.dataset.disabled = disabledText;
    const summary = fields.defaultDepotMenu.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.setAttribute("aria-disabled", disabledText);
    }
    if (disabled) {
      closePickerMenu(fields.defaultDepotMenu);
    }
  };

  const setLocationPickerDisabled = (fields, disabled) => {
    setDisabledState(fields.defaultLocation, disabled);
    if (!(fields.defaultLocationMenu instanceof HTMLElement)) return;
    const disabledText = disabled ? "true" : "false";
    fields.defaultLocationMenu.dataset.disabled = disabledText;
    const summary = fields.defaultLocationMenu.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.setAttribute("aria-disabled", disabledText);
    }
    if (disabled) {
      closePickerMenu(fields.defaultLocationMenu);
    }
  };

  const syncReadOnlyInfo = (scope, hints = {}) => {
    const fields = getFields(scope);
    const unitValue =
      hints.unit !== undefined ? String(hints.unit ?? "").trim() : String(fields.unit?.value ?? "").trim();
    const activeStockQtyValue = isArticleScope(scope)
      ? Number(getNumValue(fields.depotStockQty, getNumValue(fields.qty, 0)))
      : Number(getNumValue(fields.qty, 0));
    const availableValue =
      hints.stockQty !== undefined ? Number(hints.stockQty) : activeStockQtyValue;
    const purchasePriceValue =
      hints.purchasePrice !== undefined ? Number(hints.purchasePrice) : Number(getNumValue(fields.purchasePrice, 0));
    const salesPriceValue =
      hints.salesPrice !== undefined ? Number(hints.salesPrice) : Number(getNumValue(fields.salesPrice, 0));
    const normalizedAvailableValue = Number.isFinite(availableValue) ? availableValue : 0;
    const totalCostAchat = normalizedAvailableValue * (Number.isFinite(purchasePriceValue) ? purchasePriceValue : 0);
    const totalValueVente = normalizedAvailableValue * (Number.isFinite(salesPriceValue) ? salesPriceValue : 0);
    if (fields.unitDisplay) fields.unitDisplay.value = unitValue;
    if (fields.availableDisplay) fields.availableDisplay.value = String(normalizedAvailableValue);
    if (fields.totalCostAchat) fields.totalCostAchat.value = formatMoneyValue(totalCostAchat);
    if (fields.totalValueVente) fields.totalValueVente.value = formatMoneyValue(totalValueVente);
  };

  const enforceExclusiveStockOptions = (scopeHint = null, changedField = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    if (!fields.allowNegative || !fields.blockInsufficient) return;
    if (!fields.allowNegative.checked || !fields.blockInsufficient.checked) return;
    if (changedField === fields.blockInsufficient) {
      fields.allowNegative.checked = false;
      return;
    }
    fields.blockInsufficient.checked = false;
  };

  const setActiveDepot = (
    article = null,
    depotId = "",
    { scopeHint = null, clearLocation = true, preferredLocationIds = [] } = {}
  ) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return "";
    const fields = getFields(scope);
    const targetDepotId = isArticleScope(scope)
      ? toDepotTabId(depotId, 1)
      : normalizeDepotRefId(depotId);
    if (isArticleScope(scope)) {
      const records = getArticleDepotRecords();
      const hasTarget = targetDepotId && records.some((entry) => entry.id === targetDepotId);
      const nextDepotId = hasTarget ? targetDepotId : String(records[0]?.id || MAIN_ARTICLE_DEPOT_ID).trim();
      const nextIndex = records.findIndex((entry) => entry.id === nextDepotId);
      const nextRecord = nextIndex >= 0 ? records[nextIndex] : { id: nextDepotId };
      const sourceDepotId = resolveArticleDepotSourceId(nextRecord, nextIndex);
      const savedLocationIds = getArticleDepotSelectedLocationIds(nextRecord);
      const activeDepotStockQty = getDepotStockQty(nextRecord, getArticleStockQtyInputValue(scope));
      setArticleActiveDepotId(nextDepotId);
      setArticleSelectedDepotId(nextDepotId);
      setFieldValue(fields.defaultDepot, sourceDepotId || EMPTY_DEPOT_VALUE);
      renderDepotTabs(article, scope);
      setDepotTabsActiveState(scope, nextDepotId);
      syncActiveDepotStockField(scope, {
        ...nextRecord,
        stockQty: activeDepotStockQty
      }, nextIndex);
      handleDepotSelectionChange(scope, {
        clearLocation,
        preferredLocationIds: clearLocation ? preferredLocationIds : preferredLocationIds.length ? preferredLocationIds : savedLocationIds
      });
      syncActiveDepotNameFromDb(scope, nextDepotId, article);
      syncReadOnlyInfo(scope, { stockQty: activeDepotStockQty });
      if (article && typeof article === "object") {
        article.activeDepotId = nextDepotId;
        article.selectedDepotId = nextDepotId;
      }
      return nextDepotId;
    }
    setFieldValue(fields.defaultDepot, targetDepotId || EMPTY_DEPOT_VALUE);
    handleDepotSelectionChange(scope, {
      clearLocation,
      preferredLocationIds
    });
    return targetDepotId;
  };

  const canAddArticleDepot = (records = []) => {
    const source = Array.isArray(records) ? records : [];
    if (source.length >= MAX_ARTICLE_DEPOT_COUNT) return false;
    const nextNumber = getNextArticleDepotNumber(source, { maxCount: MAX_ARTICLE_DEPOT_COUNT });
    return Number.isFinite(nextNumber) && nextNumber >= 1 && nextNumber <= MAX_ARTICLE_DEPOT_COUNT;
  };

  const syncArticleDepotAddButtonState = (scopeHint = null, { uiInteractive = null } = {}) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return false;
    const fields = getFields(scope);
    if (!(fields.depotAddBtn instanceof HTMLElement)) return false;
    const effectiveInteractive =
      uiInteractive === null ? !isViewMode(scope) || isPreviewMode(scope) : !!uiInteractive;
    const disabled = !effectiveInteractive || !canAddArticleDepot(getArticleDepotRecords());
    if (fields.depotAddBtn.tagName === "BUTTON") {
      fields.depotAddBtn.disabled = disabled;
    }
    fields.depotAddBtn.setAttribute("aria-disabled", disabled ? "true" : "false");
    fields.depotAddBtn.classList.toggle("is-disabled", disabled);
    return !disabled;
  };

  const addDepotTab = (article = null, scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return null;
    const fields = getFields(scope);
    if (!(fields.defaultDepot instanceof HTMLElement) || fields.defaultDepot.tagName !== "SELECT") return null;
    if (fields.depotAddBtn?.getAttribute?.("aria-disabled") === "true") return null;

    const current = getArticleDepotRecords();
    if (!canAddArticleDepot(current)) {
      syncArticleDepotAddButtonState(scope);
      void notifyDepotMessage(MAX_ARTICLE_DEPOT_MESSAGE);
      return null;
    }
    const nextNumber = getNextArticleDepotNumber(current, { maxCount: MAX_ARTICLE_DEPOT_COUNT });
    if (!Number.isFinite(nextNumber)) {
      syncArticleDepotAddButtonState(scope);
      void notifyDepotMessage(MAX_ARTICLE_DEPOT_MESSAGE);
      return null;
    }
    const nextDepotId = createArticleDepotId(current, nextNumber, { maxCount: MAX_ARTICLE_DEPOT_COUNT });
    if (!nextDepotId) {
      syncArticleDepotAddButtonState(scope);
      void notifyDepotMessage(MAX_ARTICLE_DEPOT_MESSAGE);
      return null;
    }
    const mainStockQty = getArticleStockQtyInputValue(scope);
    const defaultDepotStockQty = computeDepotRemainingStockQty(mainStockQty, current);
    const nextDepot = {
      id: nextDepotId,
      name: "",
      linkedDepotId: "",
      stockQty: defaultDepotStockQty,
      stockQtyCustomized: false,
      selectedLocationIds: [],
      selectedEmplacementIds: [],
      createdAt: new Date().toISOString(),
      emplacements: []
    };
    const nextRecords = [...current, nextDepot];
    setArticleDepotState({
      depots: nextRecords,
      selectedDepotId: nextDepot.id,
      activeDepotId: nextDepot.id
    });
    renderDepotTabs(article, scope);
    setActiveDepot(article, nextDepot.id, {
      scopeHint: scope,
      clearLocation: false,
      preferredLocationIds: []
    });
    syncUi(scope);
    return nextDepot;
  };

  const removeActiveDepotTab = (article = null, scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope || !isArticleScope(scope)) return null;
    const fields = getFields(scope);
    if (fields.depotRemoveBtn?.getAttribute?.("aria-disabled") === "true") return null;

    const current = getArticleDepotRecords();
    if (!current.length) return null;
    const activeDepotId = toDepotTabId(getArticleActiveDepotId(), 1);
    if (activeDepotId === MAIN_ARTICLE_DEPOT_ID) {
      void notifyDepotMessage("Depot 1 ne peut pas etre supprime");
      return null;
    }

    const removeIndex = current.findIndex((entry) => entry.id === activeDepotId);
    if (removeIndex < 0) return null;
    const nextRecords = current.filter((entry) => entry.id !== activeDepotId);
    if (!nextRecords.length) {
      void notifyDepotMessage("Depot 1 ne peut pas etre supprime");
      return null;
    }

    const fallbackIndex = Math.max(0, removeIndex - 1);
    const fallbackEntry = nextRecords[Math.min(fallbackIndex, nextRecords.length - 1)] || nextRecords[0];
    const nextActiveDepotId = toDepotTabId(fallbackEntry?.id || MAIN_ARTICLE_DEPOT_ID, 1);
    setArticleDepotState({
      depots: nextRecords,
      selectedDepotId: nextActiveDepotId,
      activeDepotId: nextActiveDepotId,
      stockCustomized: articleDepotState.stockCustomized
    });
    renderDepotTabs(article, scope);
    setActiveDepot(article, nextActiveDepotId, {
      scopeHint: scope,
      clearLocation: false,
      preferredLocationIds: []
    });
    syncUi(scope);
    return nextActiveDepotId;
  };

  const createArticleDepotForScope = (scopeHint = null) => addDepotTab(null, scopeHint);
  const removeArticleDepotForScope = (scopeHint = null) => removeActiveDepotTab(null, scopeHint);

  const syncUi = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return null;
    const fields = getFields(scope);
    if (!fields.panel) return null;

    const viewMode = isViewMode(scope);
    const previewMode = isPreviewMode(scope);
    const panelVisible =
      !fields.panel.hidden &&
      fields.panel.closest?.('[role="tabpanel"]')?.hidden !== true;
    const interactive = !viewMode;
    const uiInteractive = interactive || previewMode;

    if (fields.layout) fields.layout.dataset.stockManagementActive = panelVisible ? "true" : "false";
    if (fields.panel) {
      fields.panel.dataset.stockManagementActive = "true";
      fields.panel.setAttribute("aria-disabled", uiInteractive ? "false" : "true");
    }

    [
      fields.allowNegative,
      fields.alert,
      fields.max,
      fields.depotStockQty,
    ].forEach((field) => setDisabledState(field, !uiInteractive));
    setDepotPickerDisabled(fields, !uiInteractive);
    syncArticleDepotAddButtonState(scope, { uiInteractive });
    if (fields.depotRemoveBtn instanceof HTMLElement) {
      fields.depotRemoveBtn.setAttribute("aria-disabled", uiInteractive ? "false" : "true");
      fields.depotRemoveBtn.classList.toggle("is-disabled", !uiInteractive);
    }
    renderDepotTabs(null, scope);
    setDepotTabsDisabled(scope, !uiInteractive);
    syncDepotPicker(scope);
    syncLocationPicker(scope, { forceDisabled: !uiInteractive });

    const alertEnabled = uiInteractive && !!fields.alert?.checked;
    setDisabledState(fields.min, !alertEnabled);

    setDisabledState(fields.blockInsufficient, !uiInteractive);

    setDisabledState(fields.unitDisplay, true);
    setDisabledState(fields.availableDisplay, true);
    setDisabledState(fields.totalCostAchat, true);
    setDisabledState(fields.totalValueVente, true);
    if (isArticleScope(scope)) {
      const activeDepotStockQty = syncActiveDepotStockField(scope);
      syncReadOnlyInfo(scope, { stockQty: activeDepotStockQty });
    } else {
      syncReadOnlyInfo(scope);
    }

    return { scope, panelVisible, interactive };
  };

  const clearForm = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    if (isArticleScope(scope)) {
      const currentArticleStockQty = getArticleStockQtyInputValue(scope);
      setArticleDepotState({
        depots: [
          {
            id: MAIN_ARTICLE_DEPOT_ID,
            name: "",
            linkedDepotId: "",
            stockQty: currentArticleStockQty,
            stockQtyCustomized: false,
            selectedLocationIds: [],
            selectedEmplacementIds: []
          }
        ],
        selectedDepotId: MAIN_ARTICLE_DEPOT_ID,
        activeDepotId: MAIN_ARTICLE_DEPOT_ID,
        stockCustomized: false
      });
      renderDepotTabs(null, scope);
    }
    setFieldValue(fields.defaultDepot, EMPTY_DEPOT_VALUE);
    setSelectedLocationIds(fields.defaultLocation, []);
    if (fields.allowNegative) fields.allowNegative.checked = false;
    if (fields.blockInsufficient) fields.blockInsufficient.checked = true;
    if (fields.alert) fields.alert.checked = false;
    setFieldValue(fields.min, "1");
    setFieldValue(fields.max, "");
    syncReadOnlyInfo(scope);
    syncUi(scope);
  };

  const fillToForm = (article = {}, scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    if (!scope) return;
    const fields = getFields(scope);
    const stockManagement =
      article.stockManagement && typeof article.stockManagement === "object" ? article.stockManagement : {};
    const stockAlertResolved = !!(
      stockManagement.alertEnabled ??
      article.stockAlert ??
      article.stockMinAlert
    );
    const stockMinResolved = Number(stockManagement.min ?? article.stockMin);
    const stockMaxResolved = stockManagement.max ?? article.stockMax;
    const allowNegativeResolved = !!stockManagement.allowNegative;
    const blockInsufficientResolved =
      stockManagement.blockInsufficient === undefined || stockManagement.blockInsufficient === null
        ? true
        : !!stockManagement.blockInsufficient;
    const selectedDepotIdResolved = normalizeDepotRefId(
      article.activeDepotId ??
        article.selectedDepotId ??
        stockManagement.selectedDepotId ??
        stockManagement.defaultDepot ??
        ""
    );
    const selectedDepotTabIdResolved = isDepotTabId(selectedDepotIdResolved)
      ? toDepotTabId(selectedDepotIdResolved, 1)
      : "";
    const legacyLinkedDepotId = selectedDepotIdResolved && !selectedDepotTabIdResolved ? selectedDepotIdResolved : "";
    const legacyLocationIds = normalizeLocationSelection(
      article.selectedEmplacements ??
        stockManagement.selectedEmplacements ??
        stockManagement.defaultLocationIds ??
        stockManagement.defaultLocationId ??
        stockManagement.defaultEmplacementId ??
        stockManagement.defaultLocation ??
        ""
    );
    const articleMainStockQty = normalizeStockQty(article.stockQty ?? getNumValue(fields.qty, 0), 0);
    if (isArticleScope(scope)) {
      const sourceDepots = Array.isArray(article.depots)
        ? article.depots
        : Array.isArray(stockManagement.depots)
        ? stockManagement.depots
        : [];
      const { stockCustomized: stockCustomizedResolved } = resolveDepotStockCustomizationState(
        article,
        sourceDepots,
        stockManagement,
        articleMainStockQty
      );
      const sourceDepotStockFlags = new Map();
      sourceDepots.forEach((entry, index) => {
        const normalized = normalizeArticleDepotRecord(entry, index);
        if (!normalized?.id) return;
        sourceDepotStockFlags.set(normalized.id, hasExplicitDepotStockQty(entry));
      });
      const normalizedDepots = normalizeArticleDepotRecords(sourceDepots).slice();
      const selectedTabId = selectedDepotTabIdResolved || String(normalizedDepots[0]?.id || MAIN_ARTICLE_DEPOT_ID).trim();
      const selectedIndex = Math.max(
        0,
        normalizedDepots.findIndex((entry) => entry.id === selectedTabId)
      );
      let allocatedStockQty = 0;
      const nextDepots = normalizedDepots.map((entry, index) => {
        const currentLocationIds = getArticleDepotSelectedLocationIds(entry);
        const resolvedLocationIds = currentLocationIds.length ? currentLocationIds : legacyLocationIds.slice();
        const hasExplicitStockQty = sourceDepotStockFlags.get(entry.id) === true;
        const fallbackStockQty = index === 0 ? articleMainStockQty : normalizeStockQty(articleMainStockQty - allocatedStockQty, 0);
        const resolvedStockQty = hasExplicitStockQty
          ? getDepotStockQty(entry, fallbackStockQty)
          : fallbackStockQty;
        allocatedStockQty += resolvedStockQty;
        const sourceStockQtyCustomized = getDepotStockQtyCustomized(entry, false);
        const baseEntry = {
          ...entry,
          stockQty: resolvedStockQty,
          stockQtyCustomized: sourceStockQtyCustomized && stockCustomizedResolved
        };
        if (index !== selectedIndex) {
          return baseEntry;
        }
        return {
          ...baseEntry,
          linkedDepotId: normalizeDepotRefId(entry?.linkedDepotId || legacyLinkedDepotId || ""),
          selectedLocationIds: resolvedLocationIds,
          selectedEmplacementIds: resolvedLocationIds
        };
      });
      setArticleDepotState({
        depots: nextDepots,
        selectedDepotId: selectedTabId,
        activeDepotId: selectedTabId,
        stockCustomized: stockCustomizedResolved
      });
      syncArticleDepotNamesFromCache(scope);
      renderDepotTabs(article, scope);
    }
    const activeDepotContext = isArticleScope(scope) ? getActiveArticleDepotContext() : null;
    const defaultLocationIds = isArticleScope(scope)
      ? getArticleDepotSelectedLocationIds(activeDepotContext?.record || {})
      : legacyLocationIds;
    const defaultDepotValue = isArticleScope(scope)
      ? normalizeDepotRefId(activeDepotContext?.sourceDepotId || "")
      : normalizeDepotRefId(stockManagement.defaultDepot ?? EMPTY_DEPOT_VALUE);
    const defaultDepotTabId = isArticleScope(scope)
      ? toDepotTabId(activeDepotContext?.activeDepotId || selectedDepotTabIdResolved || MAIN_ARTICLE_DEPOT_ID, 1)
      : defaultDepotValue;
    setFieldValue(fields.defaultDepot, defaultDepotValue || EMPTY_DEPOT_VALUE);
    setSelectedLocationIds(fields.defaultLocation, defaultLocationIds);
    if (fields.allowNegative) fields.allowNegative.checked = allowNegativeResolved;
    if (fields.blockInsufficient) {
      fields.blockInsufficient.checked = blockInsufficientResolved && !allowNegativeResolved;
    }
    if (fields.alert) fields.alert.checked = stockAlertResolved;
    setFieldValue(
      fields.min,
      String(Number.isFinite(stockMinResolved) && stockMinResolved >= 0 ? stockMinResolved : 1)
    );
    setFieldValue(
      fields.max,
      stockMaxResolved === null || stockMaxResolved === undefined ? "" : String(stockMaxResolved)
    );

    syncReadOnlyInfo(scope, {
      unit: article.unit ?? "",
      stockQty: article.stockQty ?? 0,
      purchasePrice: article.purchasePrice ?? 0,
      salesPrice: article.price ?? 0
    });
    syncUi(scope);
    setActiveDepot(article, defaultDepotTabId, {
      scopeHint: scope,
      clearLocation: false,
      preferredLocationIds: defaultLocationIds
    });
  };

  const captureFromForm = (scopeHint = null) => {
    const scope = resolveScope(scopeHint);
    const fields = getFields(scope);
    const articleScope = isArticleScope(scope);
    const allowNegative = !!fields.allowNegative?.checked;
    const alertEnabled = !!fields.alert?.checked;
    const min = Math.max(0, getNumValue(fields.min, 1));
    const max = (() => {
      const parsed = parseOptionalNumber(fields.max?.value ?? "");
      return parsed === null ? null : Math.max(0, parsed);
    })();
    const selectedEmplacements = getSelectedLocationIds(fields.defaultLocation);
    if (articleScope) {
      persistActiveDepotStockQty(scope, getNumValue(fields.depotStockQty, getArticleStockQtyInputValue(scope)));
      persistActiveArticleDepotSelection({
        linkedDepotId: normalizeDepotRefId(fields.defaultDepot?.value || ""),
        selectedLocationIds: selectedEmplacements,
        selectedEmplacementIds: selectedEmplacements
      });
    }
    const activeDepotContext = articleScope ? getActiveArticleDepotContext() : null;
    const defaultDepot = articleScope
      ? toDepotTabId(activeDepotContext?.activeDepotId || getArticleActiveDepotId() || MAIN_ARTICLE_DEPOT_ID, 1)
      : normalizeDepotRefId(fields.defaultDepot?.value || "");
    const defaultDepotSourceId = articleScope
      ? normalizeDepotRefId(activeDepotContext?.sourceDepotId || "")
      : normalizeDepotRefId(fields.defaultDepot?.value || "");
    const scopedSelectedEmplacements = articleScope
      ? getArticleDepotSelectedLocationIds(activeDepotContext?.record || {})
      : selectedEmplacements;
    const defaultLocationId = scopedSelectedEmplacements[0] || "";
    const selectedLocationCodes = getSelectedLocationCodes(
      fields.defaultLocation,
      scopedSelectedEmplacements
    );
    const defaultLocationCode = selectedLocationCodes[0] || "";
    const depotStockCustomized = articleScope ? isArticleDepotStockCustomized() : false;
    const payload = {
      stockAlert: alertEnabled,
      stockMin: min,
      stockMax: max,
      activeDepotId: defaultDepot,
      depotStockCustomized,
      selectedEmplacements: scopedSelectedEmplacements.slice(),
      stockManagement: {
        enabled: true,
        defaultDepot,
        activeDepotId: defaultDepot,
        selectedDepotId: defaultDepot,
        depotStockCustomized,
        defaultDepotSourceId: defaultDepotSourceId || "",
        defaultLocation: defaultLocationId,
        defaultLocationId,
        defaultLocationIds: scopedSelectedEmplacements.slice(),
        selectedEmplacements: scopedSelectedEmplacements.slice(),
        defaultLocationCode,
        defaultLocationCodes: selectedLocationCodes.slice(),
        allowNegative,
        blockInsufficient:
          !allowNegative && !!fields.blockInsufficient?.checked,
        alertEnabled,
        min,
        max
      }
    };
    if (articleScope) {
      payload.depots = getArticleDepotRecords().map((entry) => ({
        id: entry.id,
        name: entry.name,
        linkedDepotId: normalizeDepotRefId(entry?.linkedDepotId || ""),
        stockQty: getDepotStockQty(entry, getArticleStockQtyInputValue(scope)),
        stockQtyCustomized: getDepotStockQtyCustomized(entry, false),
        selectedLocationIds: normalizeScopedIdList(entry?.selectedLocationIds || []),
        selectedEmplacementIds: normalizeScopedIdList(
          entry?.selectedEmplacementIds || entry?.selectedLocationIds || []
        ),
        createdAt: entry.createdAt || new Date().toISOString()
      }));
      payload.selectedDepotId = defaultDepot;
      payload.stockManagement.depots = payload.depots.slice();
    }
    return payload;
  };

  const applyToItem = (item, scopeHint = null) => {
    if (!item || typeof item !== "object") return item;
    const payload = captureFromForm(scopeHint);
    const stockManagement =
      payload.stockManagement && typeof payload.stockManagement === "object"
        ? payload.stockManagement
        : {};
    item.stockAlert = !!payload.stockAlert;
    item.stockMin = Number.isFinite(Number(payload.stockMin)) ? Number(payload.stockMin) : 1;
    item.stockMax = payload.stockMax ?? null;
    if (Object.prototype.hasOwnProperty.call(payload, "depotStockCustomized")) {
      item.depotStockCustomized = toBooleanFlag(payload.depotStockCustomized);
    }
    item.stockManagement = { ...stockManagement };
    if (Array.isArray(payload.depots)) {
      item.depots = payload.depots.map((entry) => ({
        id: String(entry?.id || "").trim(),
        name: String(entry?.name || "").trim(),
        linkedDepotId: normalizeDepotRefId(entry?.linkedDepotId || ""),
        stockQty: getDepotStockQty(entry, 0),
        stockQtyCustomized: getDepotStockQtyCustomized(entry, false),
        selectedLocationIds: normalizeScopedIdList(entry?.selectedLocationIds || []),
        selectedEmplacementIds: normalizeScopedIdList(
          entry?.selectedEmplacementIds || entry?.selectedLocationIds || []
        ),
        createdAt: String(entry?.createdAt || "").trim() || new Date().toISOString()
      })).filter((entry) => entry.id);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "selectedDepotId")) {
      item.selectedDepotId = String(payload.selectedDepotId || "").trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "activeDepotId")) {
      item.activeDepotId = String(payload.activeDepotId || "").trim();
    }
    if (Array.isArray(payload.selectedEmplacements)) {
      item.selectedEmplacements = normalizeLocationSelection(payload.selectedEmplacements);
    }
    return item;
  };

  const setDepotRecords = (records = [], { sync = true } = {}) => {
    depotRecords = normalizeDepotRecords(records);
    if (!sync || typeof document === "undefined") return depotRecords.slice();
    document.querySelectorAll(ADD_SCOPE_SELECTOR).forEach((scope) => {
      const node = toScopeNode(scope);
      if (!node) return;
      const fields = getFields(node);
      const currentValue = String(fields.defaultDepot?.value || EMPTY_DEPOT_VALUE).trim();
      if (fields.defaultDepot) {
        setSelectOptions(fields.defaultDepot, getScopeDepotRecords(node), currentValue);
      }
      syncUi(node);
    });
    return depotRecords.slice();
  };

  const refreshDepotRecords = async () => {
    if (!w.electronAPI?.listDepots) return depotRecords.slice();
    try {
      const response = await w.electronAPI.listDepots();
      if (response?.ok && Array.isArray(response.results)) {
        return setDepotRecords(response.results);
      }
    } catch {}
    return depotRecords.slice();
  };

  const shouldSyncTarget = (target) =>
    target?.matches?.(
      "#addStockAlert, #addStockAllowNegative, #addStockBlockInsufficient"
    );

  const shouldSyncReadOnlyTarget = (target) =>
    target?.matches?.("#addUnit, #addStockQty, #addStockDepotQty, #addPurchasePrice, #addPrice");

  const bindEvents = () => {
    if (SEM.__stockWindowEventsBound || typeof document === "undefined") return;
    SEM.__stockWindowEventsBound = true;

    document.addEventListener("change", (evt) => {
      const target = evt?.target;
      if (!(target instanceof HTMLElement)) return;
      const scope = toScopeNode(target);
      if (!scope) return;
      if (target.matches?.("#addStockDepotQty") && isArticleScope(scope)) {
        const stockQty = persistActiveDepotStockQty(
          scope,
          getNumValue(target, getArticleStockQtyInputValue(scope)),
          { markCustomized: true }
        );
        syncReadOnlyInfo(scope, { stockQty });
        return;
      }
      if (target.matches?.("#addStockQty") && isArticleScope(scope)) {
        applyDefaultDepotStockDistribution(scope, { force: false });
      }
      if (target.matches?.("#addStockAllowNegative, #addStockBlockInsufficient")) {
        enforceExclusiveStockOptions(scope, target);
      }
      if (shouldSyncTarget(target)) syncUi(scope);
      if (shouldSyncReadOnlyTarget(target)) syncReadOnlyInfo(scope);
      if (target.matches?.("#addStockDefaultDepot")) {
        if (isArticleScope(scope)) {
          const selectedSourceDepotId = normalizeDepotRefId(String(target.value || "").trim());
          const fields = getFields(scope);
          const selectedLocationIds = getSelectedLocationIds(fields.defaultLocation);
          persistActiveArticleDepotSelection({
            linkedDepotId: selectedSourceDepotId,
            selectedLocationIds,
            selectedEmplacementIds: selectedLocationIds
          });
          handleDepotSelectionChange(scope, {
            clearLocation: false,
            preferredLocationIds: selectedLocationIds
          });
          return;
        }
        handleDepotSelectionChange(scope);
      }
      if (target.matches?.("#addStockDefaultLocation")) {
        setTimeout(() => syncLocationPicker(scope), 0);
      }
    });

    document.addEventListener("input", (evt) => {
      const target = evt?.target;
      if (!(target instanceof HTMLElement)) return;
      const scope = toScopeNode(target);
      if (!scope) return;
      if (target.matches?.("#addStockDepotQty") && isArticleScope(scope)) {
        setArticleDepotStockCustomized(true);
        const rawValue = String(target.value ?? "").trim();
        if (!rawValue) {
          syncReadOnlyInfo(scope, { stockQty: 0 });
          return;
        }
        const stockQty = persistActiveDepotStockQty(scope, getNumValue(target, 0), { markCustomized: true });
        syncReadOnlyInfo(scope, { stockQty });
        return;
      }
      if (target.matches?.("#addStockQty") && isArticleScope(scope)) {
        applyDefaultDepotStockDistribution(scope, { force: false });
      }
      if (target.matches?.("#addStockAllowNegative, #addStockBlockInsufficient")) {
        enforceExclusiveStockOptions(scope, target);
      }
      if (target.matches?.("#addStockAlert, #addStockAllowNegative, #addStockBlockInsufficient")) {
        syncUi(scope);
      }
      if (shouldSyncReadOnlyTarget(target)) syncReadOnlyInfo(scope);
    });

    document.addEventListener("keydown", (evt) => {
      const addButton = evt?.target?.closest?.(ARTICLE_DEPOT_ADD_BUTTON_SELECTOR);
      if (!(addButton instanceof HTMLElement)) return;
      if (addButton.tagName === "BUTTON") return;
      if (addButton.getAttribute("aria-disabled") === "true") return;
      if (evt.key !== "Enter" && evt.key !== " ") return;
      evt.preventDefault();
      evt.stopPropagation();
      const scope = toScopeNode(addButton);
      if (!scope) return;
      createArticleDepotForScope(scope);
    });

    document.addEventListener("click", (evt) => {
      const target = evt?.target instanceof Element ? evt.target : null;
      const mainTab = target?.closest?.(ARTICLE_MAIN_TAB_SELECTOR);
      if (mainTab instanceof HTMLElement) {
        const scope = toScopeNode(mainTab);
        if (scope && isArticleScope(scope)) {
          setTimeout(() => {
            setDepotTabsActiveState(scope, getArticleActiveDepotId());
          }, 0);
        }
      }
      const stockTab = target?.closest?.(ARTICLE_STOCK_TAB_SELECTOR);
      if (stockTab instanceof HTMLElement) {
        const scope = toScopeNode(stockTab);
        if (scope && isArticleScope(scope)) {
          setDepotTabsActiveState(scope, MAIN_ARTICLE_DEPOT_ID);
          setActiveDepot(null, MAIN_ARTICLE_DEPOT_ID, {
            scopeHint: scope,
            clearLocation: false,
            preferredLocationIds: []
          });
        }
      }
      const depotTab = target?.closest?.(ARTICLE_DEPOT_TAB_SELECTOR);
      if (depotTab instanceof HTMLElement && activateArticleDepotTab(depotTab, evt)) {
        return;
      }
      const removeButton = target?.closest?.(ARTICLE_DEPOT_REMOVE_BUTTON_SELECTOR);
      if (removeButton) {
        evt.preventDefault();
        evt.stopPropagation();
        if (removeButton.getAttribute("aria-disabled") === "true") return;
        const scope = toScopeNode(removeButton);
        if (!scope) return;
        removeArticleDepotForScope(scope);
        return;
      }
      const addButton = target?.closest?.(ARTICLE_DEPOT_ADD_BUTTON_SELECTOR);
      if (addButton) {
        evt.preventDefault();
        evt.stopPropagation();
        if (addButton.getAttribute("aria-disabled") === "true") return;
        const scope = toScopeNode(addButton);
        if (!scope) return;
        createArticleDepotForScope(scope);
        return;
      }
      if (target) {
        document
          .querySelectorAll(
            "details[id='addStockDefaultDepotMenu'][open], details[id='addStockDefaultLocationMenu'][open]"
          )
          .forEach((menu) => {
          if (menu.contains(target)) return;
          closePickerMenu(menu);
        });
      }
    });
  };

  const init = () => {
    bindEvents();
    depotRecords = normalizeDepotRecords(SEM.depotMagasin?.records || []);
    if (typeof document === "undefined") return;
    document.querySelectorAll(ADD_SCOPE_SELECTOR).forEach((scope) => {
      syncUi(scope);
      handleDepotSelectionChange(scope, { clearLocation: false });
    });
    refreshDepotRecords();
  };

  SEM.stockWindow = {
    resolveScope,
    syncUi,
    clearForm,
    fillToForm,
    captureFromForm,
    applyToItem,
    renderDepotTabs,
    addDepotTab,
    removeActiveDepotTab,
    setActiveDepot,
    syncReadOnlyInfo,
    setDepotRecords,
    refreshDepotRecords,
    getDepotRecords: () => depotRecords.slice(),
    init
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
