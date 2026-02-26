"use strict";

const { alignSchema } = require("../schema-definition");

const ARTICLE_DEPOT_MAX_COUNT = 6;
const ARTICLE_DEPOTS_JSON_VERSION = 1;

const tableExists = (db, table) => {
  try {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table);
    return !!row;
  } catch {
    return false;
  }
};

const tableHasColumn = (db, table, column) => {
  try {
    const rows = db.prepare(`PRAGMA table_info("${String(table).replace(/"/g, "\"\"")}")`).all();
    return rows.some((row) => row?.name === column);
  } catch {
    return false;
  }
};

const normalizeText = (value) => String(value ?? "").trim();

const normalizeLinkedDepotId = (value = "") =>
  normalizeText(value).replace(/^sqlite:\/\/depots\//i, "");

const normalizeBool = (value = false) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = normalizeText(value).toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
};

const normalizeStockQty = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(0, Number(fallback) || 0);
  return Math.max(0, parsed);
};

const parseDepotTabNumber = (value = "") => {
  const match = normalizeText(value).match(/^depot[-_\s]?(\d+)$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

const toDepotTabId = (value = "", fallback = 1) => {
  const parsed = parseDepotTabNumber(value);
  const fallbackParsed = Number(fallback);
  const number =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : Number.isFinite(fallbackParsed) && fallbackParsed > 0
      ? Math.trunc(fallbackParsed)
      : 1;
  return `depot-${number}`;
};

const parseScopedIds = (value = []) => {
  const source = (() => {
    if (Array.isArray(value)) return value;
    const raw = normalizeText(value);
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
    const id = normalizeText(entry);
    if (!id) return;
    const key = id.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(id);
  });
  return normalized;
};

const isGenericDepotName = (value = "") =>
  /^depot[\s_-]*\d+$/i.test(normalizeText(value));

const parseDepotsPayload = (value) => {
  if (Array.isArray(value)) {
    return { v: 0, activeTabId: "", customized: false, tabs: value.slice() };
  }
  if (value && typeof value === "object") {
    const tabs = Array.isArray(value.tabs)
      ? value.tabs
      : Array.isArray(value.depots)
      ? value.depots
      : [];
    return {
      v: Number(value.v || value.version || 0) || 0,
      activeTabId: normalizeText(
        value.activeTabId ||
          value.activeDepotId ||
          value.selectedDepotId ||
          value.defaultDepot ||
          ""
      ),
      customized: normalizeBool(
        value.customized ??
          value.depotStockCustomized ??
          value.stockCustomized ??
          value.depot_stock_customized ??
          false
      ),
      tabs
    };
  }
  const raw = normalizeText(value);
  if (!raw) return { v: 0, activeTabId: "", customized: false, tabs: [] };
  try {
    return parseDepotsPayload(JSON.parse(raw));
  } catch {
    return { v: 0, activeTabId: "", customized: false, tabs: [] };
  }
};

const normalizeDepotEntries = (tabs = []) => {
  const source = Array.isArray(tabs) ? tabs : [];
  const seen = new Set();
  const normalized = [];
  source.forEach((entry, index) => {
    const row = entry && typeof entry === "object" ? entry : { id: entry, name: entry };
    const rawId = normalizeLinkedDepotId(row.id || row.value || row.depotId || row.path || "");
    const name = normalizeText(row.name || row.label || "");
    const fallbackNumber = index + 1;
    const tabId = toDepotTabId(rawId || name, fallbackNumber);
    const tabNumber = parseDepotTabNumber(tabId);
    if (!Number.isFinite(tabNumber) || tabNumber < 1 || tabNumber > ARTICLE_DEPOT_MAX_COUNT) return;
    const key = tabId.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const selectedLocationIds = parseScopedIds(
      row.selectedLocationIds ??
        row.selectedLocationId ??
        row.selectedEmplacementIds ??
        row.selectedEmplacements ??
        row.defaultLocationIds ??
        row.defaultLocationId ??
        row.defaultLocation ??
        []
    );
    const selectedEmplacementIds = parseScopedIds(
      row.selectedEmplacementIds ??
        row.selectedLocationIds ??
        row.selectedEmplacements ??
        row.defaultLocationIds ??
        row.defaultLocationId ??
        row.defaultLocation ??
        selectedLocationIds
    );
    const hasExplicitStockQty = Object.prototype.hasOwnProperty.call(row, "stockQty") ||
      Object.prototype.hasOwnProperty.call(row, "stock_qty") ||
      Object.prototype.hasOwnProperty.call(row, "quantity") ||
      Object.prototype.hasOwnProperty.call(row, "qty");
    const stockQty = normalizeStockQty(
      row.stockQty ?? row.stock_qty ?? row.quantity ?? row.qty,
      0
    );
    const stockQtyCustomized = normalizeBool(
      row.stockQtyCustomized ??
        row.stock_qty_customized ??
        row.depotStockCustomized ??
        row.depot_stock_customized ??
        false
    );
    normalized.push({
      id: tabId,
      name,
      linkedDepotId: normalizeLinkedDepotId(
        row.linkedDepotId ??
          row.depotDbId ??
          row.magasinId ??
          row.magasin_id ??
          row.defaultDepotSourceId ??
          row.selectedDepotSourceId ??
          row.sourceDepotId ??
          row.defaultDepotId ??
          row.stockDefaultDepotId ??
          ""
      ),
      selectedLocationIds,
      selectedEmplacementIds: selectedEmplacementIds.length
        ? selectedEmplacementIds
        : selectedLocationIds.slice(),
      stockQty,
      hasExplicitStockQty,
      stockQtyCustomized,
      createdAt: normalizeText(row.createdAt || row.created_at || "") || new Date().toISOString()
    });
  });
  if (!normalized.some((entry) => entry.id === "depot-1")) {
    normalized.unshift({
      id: "depot-1",
      name: "",
      linkedDepotId: "",
      selectedLocationIds: [],
      selectedEmplacementIds: [],
      stockQty: 0,
      hasExplicitStockQty: false,
      stockQtyCustomized: false,
      createdAt: new Date().toISOString()
    });
  }
  normalized.sort((a, b) => {
    const aNum = parseDepotTabNumber(a.id) || 1;
    const bNum = parseDepotTabNumber(b.id) || 1;
    return aNum - bNum;
  });
  return normalized.slice(0, ARTICLE_DEPOT_MAX_COUNT);
};

const applyDefaultStockDistribution = (tabs = [], totalStockQty = 0) => {
  const total = normalizeStockQty(totalStockQty, 0);
  let allocated = 0;
  return tabs.map((entry, index) => {
    const stockQty = index === 0 ? total : normalizeStockQty(total - allocated, 0);
    allocated += stockQty;
    return {
      ...entry,
      stockQty,
      stockQtyCustomized: false
    };
  });
};

const normalizeDepotsEnvelope = (
  rawPayload,
  {
    totalStockQty = 0,
    activeTabIdHint = "",
    linkedDepotIdHint = "",
    emplacementIdsHint = []
  } = {}
) => {
  const payload = parseDepotsPayload(rawPayload);
  const normalized = normalizeDepotEntries(payload.tabs);
  const initialActiveTabId = normalizeText(payload.activeTabId || activeTabIdHint);
  let activeTabId = parseDepotTabNumber(initialActiveTabId)
    ? toDepotTabId(initialActiveTabId, 1)
    : "depot-1";
  if (!normalized.some((entry) => entry.id === activeTabId)) {
    activeTabId = normalizeText(normalized[0]?.id || "depot-1");
  }
  const activeIndex = Math.max(
    0,
    normalized.findIndex((entry) => entry.id === activeTabId)
  );

  const legacyLinkedDepotId = normalizeLinkedDepotId(linkedDepotIdHint);
  const legacyEmplacementIds = parseScopedIds(emplacementIdsHint);
  if (legacyLinkedDepotId || legacyEmplacementIds.length) {
    const current = normalized[activeIndex];
    if (current) {
      normalized[activeIndex] = {
        ...current,
        linkedDepotId: current.linkedDepotId || legacyLinkedDepotId,
        selectedLocationIds: current.selectedLocationIds.length
          ? current.selectedLocationIds
          : legacyEmplacementIds.slice(),
        selectedEmplacementIds: current.selectedEmplacementIds.length
          ? current.selectedEmplacementIds
          : legacyEmplacementIds.slice()
      };
    }
  }

  let customized = normalizeBool(payload.customized);
  const hasExplicitStockQty = normalized.some((entry) => entry.hasExplicitStockQty);
  if (!customized && !hasExplicitStockQty) {
    const distributed = applyDefaultStockDistribution(normalized, totalStockQty);
    for (let index = 0; index < distributed.length; index += 1) {
      normalized[index] = distributed[index];
    }
  }
  if (!customized) {
    customized = normalized.some((entry) => normalizeBool(entry.stockQtyCustomized));
  }

  const tabs = normalized.map((entry) => {
    const row = {
      id: entry.id,
      stockQty: normalizeStockQty(entry.stockQty, 0),
      createdAt: entry.createdAt || new Date().toISOString()
    };
    if (entry.stockQtyCustomized) row.stockQtyCustomized = true;
    if (entry.name && !isGenericDepotName(entry.name)) row.name = entry.name;
    if (entry.linkedDepotId) row.linkedDepotId = entry.linkedDepotId;
    if (entry.selectedLocationIds.length) row.selectedLocationIds = entry.selectedLocationIds.slice();
    if (entry.selectedEmplacementIds.length) {
      row.selectedEmplacementIds = entry.selectedEmplacementIds.slice();
    }
    return row;
  });
  return {
    v: ARTICLE_DEPOTS_JSON_VERSION,
    activeTabId: activeTabId || "depot-1",
    customized,
    tabs
  };
};

module.exports = function articlesFormPersistenceAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["articles"] });
  if (!tableExists(db, "articles")) return;

  if (tableHasColumn(db, "articles", "purchase_discount")) {
    db.exec(
      "UPDATE articles SET purchase_discount = COALESCE(purchase_discount, discount, 0) WHERE purchase_discount IS NULL"
    );
  }
  if (tableHasColumn(db, "articles", "stock_alert_enabled")) {
    db.exec(
      "UPDATE articles SET stock_alert_enabled = COALESCE(stock_alert_enabled, stock_alert, 0) WHERE stock_alert_enabled IS NULL"
    );
  }
  if (tableHasColumn(db, "articles", "stock_min_qty")) {
    db.exec(
      "UPDATE articles SET stock_min_qty = COALESCE(stock_min_qty, stock_min, 1) WHERE stock_min_qty IS NULL"
    );
  }
  if (tableHasColumn(db, "articles", "stock_block_insufficient")) {
    db.exec(
      "UPDATE articles SET stock_block_insufficient = COALESCE(stock_block_insufficient, 1) WHERE stock_block_insufficient IS NULL"
    );
  }
  if (tableHasColumn(db, "articles", "stock_allow_negative")) {
    db.exec(
      "UPDATE articles SET stock_allow_negative = COALESCE(stock_allow_negative, 0) WHERE stock_allow_negative IS NULL"
    );
  }

  if (!tableHasColumn(db, "articles", "stock_depots_json")) return;

  const hasDefaultDepotCol = tableHasColumn(db, "articles", "stock_default_depot_id");
  const hasDefaultEmplacementCol = tableHasColumn(db, "articles", "stock_default_emplacement_id");
  const rows = db
    .prepare(
      `SELECT
         id,
         stock_qty,
         stock_depots_json,
         ${hasDefaultDepotCol ? "stock_default_depot_id" : "NULL AS stock_default_depot_id"},
         ${hasDefaultEmplacementCol ? "stock_default_emplacement_id" : "NULL AS stock_default_emplacement_id"}
       FROM articles`
    )
    .all();
  const now = new Date().toISOString();
  const update = db.prepare(
    "UPDATE articles SET stock_depots_json = ?, stock_default_depot_id = ?, updated_at = ? WHERE id = ?"
  );
  const tx = db.transaction((entries = []) => {
    entries.forEach((row) => {
      const rawSerialized = normalizeText(row?.stock_depots_json || "");
      const legacyDepotValue = normalizeLinkedDepotId(row?.stock_default_depot_id || "");
      const activeTabIdHint = parseDepotTabNumber(legacyDepotValue) ? toDepotTabId(legacyDepotValue, 1) : "";
      const linkedDepotIdHint = activeTabIdHint ? "" : legacyDepotValue;
      const emplacementsHint = parseScopedIds(row?.stock_default_emplacement_id || "");
      const envelope = normalizeDepotsEnvelope(rawSerialized, {
        totalStockQty: row?.stock_qty,
        activeTabIdHint,
        linkedDepotIdHint,
        emplacementIdsHint: emplacementsHint
      });
      let nextSerialized = "";
      try {
        nextSerialized = JSON.stringify(envelope);
      } catch {
        return;
      }
      if (!nextSerialized) return;
      const nextActiveTabId = normalizeText(envelope.activeTabId || "depot-1");
      if (
        nextSerialized === rawSerialized &&
        normalizeText(row?.stock_default_depot_id || "") === nextActiveTabId
      ) {
        return;
      }
      update.run(nextSerialized, nextActiveTabId, now, row.id);
    });
  });
  tx(rows);
};
