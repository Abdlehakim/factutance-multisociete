"use strict";

const normalizeText = (value) => String(value || "").trim();

const normalizeOptionalText = (value) => {
  const normalized = normalizeText(value);
  return normalized || "";
};

const makeFallbackId = (prefix) =>
  `${normalizeText(prefix) || "item"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeDepotPathId = (value, parseDepotIdFromPath) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (typeof parseDepotIdFromPath === "function") {
    const parsed = normalizeText(parseDepotIdFromPath(raw));
    if (parsed) return parsed;
  }
  return raw;
};

const toLowerSearch = (value) => normalizeText(value).toLowerCase();

const normalizeDepotPayload = (payload = {}) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const emplacementsSource = Array.isArray(source.emplacements)
    ? source.emplacements
    : (Array.isArray(source.locations) ? source.locations : []);
  const seenCodes = new Set();
  const emplacements = [];
  emplacementsSource.forEach((entry) => {
    const row = entry && typeof entry === "object" ? entry : { code: entry };
    const code = normalizeOptionalText(row.code || row.name || row.label || row.emplacement || row.value);
    if (!code) return;
    const dedupeKey = code.toLowerCase();
    if (seenCodes.has(dedupeKey)) return;
    seenCodes.add(dedupeKey);
    emplacements.push({
      id: normalizeText(row.id),
      code
    });
  });
  return {
    id: normalizeText(source.id || source.depotId || source.value || source.path),
    name: normalizeOptionalText(source.name || source.label || source.title || source.depot || source.magasin),
    address: normalizeOptionalText(source.address || source.adresse),
    emplacements
  };
};

const buildDepotRecord = (row, emplacements, formatDepotPath) => {
  const id = normalizeText(row?.id);
  const path =
    typeof formatDepotPath === "function"
      ? formatDepotPath(id)
      : `sqlite://depots/${id}`;
  const normalizedEmplacements = Array.isArray(emplacements) ? emplacements : [];
  return {
    id,
    path,
    name: normalizeOptionalText(row?.name),
    address: normalizeOptionalText(row?.address),
    createdAt: normalizeOptionalText(row?.created_at),
    updatedAt: normalizeOptionalText(row?.updated_at),
    emplacements: normalizedEmplacements.map((entry) => ({
      id: normalizeText(entry?.id),
      depotId: normalizeText(entry?.depot_id || id),
      code: normalizeOptionalText(entry?.code),
      name: normalizeOptionalText(entry?.code),
      createdAt: normalizeOptionalText(entry?.created_at),
      updatedAt: normalizeOptionalText(entry?.updated_at)
    })),
    emplacementCount: normalizedEmplacements.length
  };
};

const getRowsByDepotIds = (db, depotIds) => {
  const ids = Array.isArray(depotIds) ? depotIds.map((id) => normalizeText(id)).filter(Boolean) : [];
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
      SELECT
        id,
        depot_id,
        code,
        created_at,
        updated_at
      FROM depot_magasin_emplacement
      WHERE depot_id IN (${placeholders})
      ORDER BY code COLLATE NOCASE ASC, created_at ASC
    `
    )
    .all(...ids);
  const byDepot = new Map();
  rows.forEach((row) => {
    const key = normalizeText(row?.depot_id);
    if (!key) return;
    if (!byDepot.has(key)) byDepot.set(key, []);
    byDepot.get(key).push(row);
  });
  return byDepot;
};

const createDepotMagasinRepository = ({
  getDb,
  generateId,
  parseDepotIdFromPath,
  formatDepotPath
} = {}) => {
  if (typeof getDb !== "function") {
    throw new Error("Depot repository requires a getDb() function.");
  }

  const buildId = (prefix) =>
    (typeof generateId === "function" ? generateId(prefix) : "") || makeFallbackId(prefix);

  const getDepot = (id) => {
    const db = getDb();
    const depotId = normalizeDepotPathId(id, parseDepotIdFromPath);
    if (!depotId) return null;
    const row = db
      .prepare(
        `
        SELECT id, name, address, created_at, updated_at
        FROM depot_magasin
        WHERE id = ?
      `
      )
      .get(depotId);
    if (!row) return null;
    const emplacements = db
      .prepare(
        `
        SELECT id, depot_id, code, created_at, updated_at
        FROM depot_magasin_emplacement
        WHERE depot_id = ?
        ORDER BY code COLLATE NOCASE ASC, created_at ASC
      `
      )
      .all(depotId);
    return buildDepotRecord(row, emplacements, formatDepotPath);
  };

  const saveDepot = (payload = {}) => {
    const db = getDb();
    const normalized = normalizeDepotPayload(payload);
    const depotId = normalizeDepotPathId(
      normalized.id || payload?.id || payload?.path,
      parseDepotIdFromPath
    ) || buildId("depot");
    const depotName = normalizeOptionalText(normalized.name || payload?.suggestedName);
    if (!depotName) {
      throw new Error("Nom du depot/magasin requis.");
    }
    const now = new Date().toISOString();

    const selectDepotMeta = db.prepare(
      "SELECT created_at FROM depot_magasin WHERE id = ?"
    );
    const upsertDepot = db.prepare(
      `
      INSERT INTO depot_magasin (id, name, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        updated_at = excluded.updated_at
    `
    );
    const clearEmplacements = db.prepare("DELETE FROM depot_magasin_emplacement WHERE depot_id = ?");
    const insertEmplacement = db.prepare(
      `
      INSERT OR IGNORE INTO depot_magasin_emplacement (
        id,
        depot_id,
        code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `
    );

    const tx = db.transaction(() => {
      const previous = selectDepotMeta.get(depotId);
      upsertDepot.run(
        depotId,
        depotName,
        normalized.address || null,
        normalizeOptionalText(previous?.created_at) || now,
        now
      );
      clearEmplacements.run(depotId);
      normalized.emplacements.forEach((entry) => {
        insertEmplacement.run(
          normalizeText(entry.id) || buildId("emplacement"),
          depotId,
          entry.code,
          now,
          now
        );
      });
    });

    tx();
    return getDepot(depotId);
  };

  const deleteDepot = (id) => {
    const depotId = normalizeDepotPathId(id, parseDepotIdFromPath);
    if (!depotId) return { ok: false, error: "Identifiant depot/magasin requis." };
    const db = getDb();
    const result = db.prepare("DELETE FROM depot_magasin WHERE id = ?").run(depotId);
    return { ok: true, missing: result.changes === 0 };
  };

  const searchDepots = ({ query = "", limit, offset } = {}) => {
    const db = getDb();
    const normalizedQuery = toLowerSearch(query);
    const clauses = [];
    const countParams = [];
    if (normalizedQuery) {
      clauses.push("LOWER(COALESCE(name, '') || ' ' || COALESCE(address, '')) LIKE ?");
      countParams.push(`%${normalizedQuery}%`);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM depot_magasin ${whereClause}`)
      .get(...countParams)?.total || 0;

    const sql = [
      "SELECT id, name, address, created_at, updated_at FROM depot_magasin",
      whereClause,
      "ORDER BY updated_at DESC, created_at DESC"
    ];
    const params = [...countParams];
    if (Number.isFinite(limit) && limit > 0) {
      sql.push("LIMIT ?");
      params.push(Math.floor(limit));
    }
    if (Number.isFinite(offset) && offset > 0) {
      sql.push("OFFSET ?");
      params.push(Math.floor(offset));
    }

    const rows = db.prepare(sql.join(" ")).all(...params);
    const depotIds = rows.map((row) => normalizeText(row?.id)).filter(Boolean);
    const emplacementsByDepot = getRowsByDepotIds(db, depotIds);
    const results = rows.map((row) =>
      buildDepotRecord(
        row,
        emplacementsByDepot.get(normalizeText(row?.id)) || [],
        formatDepotPath
      )
    );
    return { results, total };
  };

  const listDepots = (query = "") => {
    const source =
      query && typeof query === "object"
        ? query
        : { query: normalizeText(query), limit: null, offset: 0 };
    return searchDepots(source).results;
  };

  const listEmplacementsByDepot = (id) => {
    const depot = getDepot(id);
    if (!depot || !Array.isArray(depot.emplacements)) return [];
    return depot.emplacements;
  };

  return {
    listDepots,
    searchDepots,
    getDepot,
    listEmplacementsByDepot,
    saveDepot,
    deleteDepot
  };
};

module.exports = {
  createDepotMagasinRepository
};
