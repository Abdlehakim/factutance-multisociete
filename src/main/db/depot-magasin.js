"use strict";

const {
  normalizeDepotCodeValue,
  isGeneratedDepotCodeFormat,
  generateUniqueDepotCode
} = require("./depot-code");

const normalizeText = (value) => String(value || "").trim();
const normalizeDepotCode = (value) => normalizeDepotCodeValue(value);
const DEPOT_CODE_UNIQUE_INDEX = "idx_depot_magasin_code_depot_unique";
const MAX_DEPOT_CODE_ATTEMPTS = 48;

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

const isDepotCodeConstraintError = (error) => {
  const message = String(error?.message || error || "");
  if (!message) return false;
  return (
    message.includes(DEPOT_CODE_UNIQUE_INDEX) ||
    message.includes("depot_magasin.code_depot") ||
    (/UNIQUE constraint failed/i.test(message) && /code_depot/i.test(message))
  );
};

const depotCodeExists = (db, codeDepot = "", exceptId = "") => {
  const normalizedCode = normalizeDepotCode(codeDepot);
  if (!normalizedCode) return false;
  const normalizedExceptId = normalizeText(exceptId);
  const match = db
    .prepare(
      `
      SELECT id
      FROM depot_magasin
      WHERE upper(trim(COALESCE(code_depot, ''))) = ?
        AND (? = '' OR id != ?)
      LIMIT 1
    `
    )
    .get(normalizedCode, normalizedExceptId, normalizedExceptId);
  return !!match;
};

const generateNextDepotCode = (db, { exceptId = "" } = {}) => {
  const normalizedExceptId = normalizeText(exceptId);
  const rows = db
    .prepare(
      `
      SELECT code_depot AS code_value
      FROM depot_magasin
      WHERE (? = '' OR id != ?)
        AND code_depot IS NOT NULL
        AND trim(code_depot) <> ''
    `
    )
    .all(normalizedExceptId, normalizedExceptId);
  const usedCodes = new Set();
  rows.forEach((row) => {
    const normalizedCode = normalizeDepotCode(row?.code_value);
    if (normalizedCode) usedCodes.add(normalizedCode);
  });
  return generateUniqueDepotCode({
    exists: (candidate) => usedCodes.has(normalizeDepotCode(candidate))
  });
};

const generateDepotCodeWithDbGuard = (db, { exceptId = "" } = {}) => {
  const normalizedExceptId = normalizeText(exceptId);
  return generateUniqueDepotCode({
    exists: (candidate) => depotCodeExists(db, candidate, normalizedExceptId)
  });
};

const shouldRepairDepotCodeValue = (db, codeDepot = "", exceptId = "") => {
  const normalizedCode = normalizeDepotCode(codeDepot);
  if (!normalizedCode) return true;
  if (!isGeneratedDepotCodeFormat(normalizedCode)) return true;
  return depotCodeExists(db, normalizedCode, exceptId);
};

const ensureDepotCodeForRow = (db, row = {}) => {
  if (!db || !row) return row;
  const rowId = normalizeText(row.id);
  if (!rowId) return row;
  if (!shouldRepairDepotCodeValue(db, row.code_depot, rowId)) {
    return { ...row, code_depot: normalizeDepotCode(row.code_depot) };
  }
  for (let attempt = 0; attempt < MAX_DEPOT_CODE_ATTEMPTS; attempt += 1) {
    const generatedCode =
      attempt >= Math.floor(MAX_DEPOT_CODE_ATTEMPTS / 2)
        ? generateDepotCodeWithDbGuard(db, { exceptId: rowId })
        : generateNextDepotCode(db, { exceptId: rowId });
    const updatedAt = new Date().toISOString();
    try {
      db
        .prepare("UPDATE depot_magasin SET code_depot = ?, updated_at = ? WHERE id = ?")
        .run(generatedCode, updatedAt, rowId);
      return {
        ...row,
        code_depot: generatedCode,
        updated_at: updatedAt
      };
    } catch (error) {
      if (
        isDepotCodeConstraintError(error) &&
        attempt < MAX_DEPOT_CODE_ATTEMPTS - 1
      ) {
        console.warn(
          "[depot-code] collision detected during code repair",
          JSON.stringify({
            depotId: rowId,
            attempt: attempt + 1,
            maxAttempts: MAX_DEPOT_CODE_ATTEMPTS,
            candidate: generatedCode
          })
        );
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Impossible de reparer le code depot pour ${rowId}.`);
};

const resolveDepotCodeForPersist = ({
  db,
  id = "",
  requestedCode = "",
  existingCode = "",
  fallbackToGenerate = true
} = {}) => {
  const normalizedId = normalizeText(id);
  const requested = normalizeDepotCode(requestedCode);
  const existing = normalizeDepotCode(existingCode);
  if (
    existing &&
    isGeneratedDepotCodeFormat(existing) &&
    !depotCodeExists(db, existing, normalizedId)
  ) {
    return existing;
  }
  if (
    requested &&
    isGeneratedDepotCodeFormat(requested) &&
    !depotCodeExists(db, requested, normalizedId)
  ) {
    return requested;
  }
  if (!fallbackToGenerate) return "";
  return generateNextDepotCode(db, { exceptId: normalizedId });
};

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
    codeDepot: normalizeDepotCode(source.codeDepot || source.code_depot || source.code),
    name: normalizeOptionalText(source.name || source.label || source.title || source.depot || source.magasin),
    address: normalizeOptionalText(source.address || source.adresse),
    emplacements
  };
};

const buildDepotRecord = (row, emplacements, formatDepotPath) => {
  const id = normalizeText(row?.id);
  const codeDepot = normalizeDepotCode(row?.code_depot || row?.codeDepot || row?.code);
  const path =
    typeof formatDepotPath === "function"
      ? formatDepotPath(id)
      : `sqlite://depots/${id}`;
  const normalizedEmplacements = Array.isArray(emplacements) ? emplacements : [];
  return {
    id,
    path,
    codeDepot,
    code_depot: codeDepot,
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
    const rowRaw = db
      .prepare(
        `
        SELECT id, name, code_depot, address, created_at, updated_at
        FROM depot_magasin
        WHERE id = ?
      `
      )
      .get(depotId);
    if (!rowRaw) return null;
    const row = ensureDepotCodeForRow(db, rowRaw);
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
      "SELECT created_at, code_depot FROM depot_magasin WHERE id = ?"
    );
    const upsertDepot = db.prepare(
      `
      INSERT INTO depot_magasin (id, name, code_depot, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        code_depot = excluded.code_depot,
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

    const existingDepotMeta = selectDepotMeta.get(depotId);
    let persistedCodeDepot = resolveDepotCodeForPersist({
      db,
      id: depotId,
      requestedCode:
        normalized.codeDepot ||
        payload?.codeDepot ||
        payload?.code_depot ||
        payload?.code ||
        "",
      existingCode: existingDepotMeta?.code_depot || ""
    });

    const tx = db.transaction((nextCodeDepot) => {
      const previous = selectDepotMeta.get(depotId);
      upsertDepot.run(
        depotId,
        depotName,
        normalizeDepotCode(nextCodeDepot) || null,
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

    let persisted = false;
    let lastPersistError = null;
    for (
      let attempt = 0;
      attempt < MAX_DEPOT_CODE_ATTEMPTS && !persisted;
      attempt += 1
    ) {
      try {
        tx(persistedCodeDepot);
        persisted = true;
        lastPersistError = null;
      } catch (error) {
        lastPersistError = error;
        if (
          isDepotCodeConstraintError(error) &&
          attempt < MAX_DEPOT_CODE_ATTEMPTS - 1
        ) {
          console.warn(
            "[depot-code] collision detected during depot save",
            JSON.stringify({
              depotId,
              attempt: attempt + 1,
              maxAttempts: MAX_DEPOT_CODE_ATTEMPTS,
              candidate: persistedCodeDepot
            })
          );
          persistedCodeDepot =
            attempt >= Math.floor(MAX_DEPOT_CODE_ATTEMPTS / 2)
              ? generateDepotCodeWithDbGuard(db, { exceptId: depotId })
              : generateNextDepotCode(db, { exceptId: depotId });
          continue;
        }
        throw error;
      }
    }
    if (!persisted && lastPersistError) throw lastPersistError;
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
      clauses.push(
        "LOWER(COALESCE(name, '') || ' ' || COALESCE(code_depot, '') || ' ' || COALESCE(address, '')) LIKE ?"
      );
      countParams.push(`%${normalizedQuery}%`);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM depot_magasin ${whereClause}`)
      .get(...countParams)?.total || 0;

    const sql = [
      "SELECT id, name, code_depot, address, created_at, updated_at FROM depot_magasin",
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

    const rowsRaw = db.prepare(sql.join(" ")).all(...params);
    const rows = rowsRaw.map((row) => ensureDepotCodeForRow(db, row));
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

  const previewDepotCode = ({ id } = {}) => {
    const db = getDb();
    const normalizedId = normalizeDepotPathId(id, parseDepotIdFromPath);
    const codeDepot = generateNextDepotCode(db, { exceptId: normalizedId });
    return {
      code: codeDepot,
      codeDepot
    };
  };

  return {
    listDepots,
    searchDepots,
    getDepot,
    listEmplacementsByDepot,
    saveDepot,
    deleteDepot,
    previewDepotCode
  };
};

module.exports = {
  createDepotMagasinRepository
};
