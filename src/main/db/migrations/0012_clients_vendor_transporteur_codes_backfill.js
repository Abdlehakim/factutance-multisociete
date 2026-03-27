"use strict";

const { alignSchema } = require("../schema-definition");
const {
  resolveEntityCodeConfig,
  normalizeEntityCodeValue,
  isGeneratedEntityCodeFormat,
  generateUniqueEntityCode
} = require("../client-code");

const normalizeText = (value) => String(value ?? "").trim();
const ENTITY_TYPES = ["vendor", "transporter"];

const isEntityCodeConstraintError = (error, entityType) => {
  const message = String(error?.message || error || "");
  if (!message) return false;
  const config = resolveEntityCodeConfig(entityType);
  return (
    message.includes(config.uniqueIndex) ||
    message.includes(`clients.${config.column}`) ||
    (/UNIQUE constraint failed/i.test(message) && message.toLowerCase().includes(config.column))
  );
};

const ensureEntityUniqueIndex = (db, entityType) => {
  const config = resolveEntityCodeConfig(entityType);
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${config.uniqueIndex} ON clients (UPPER(TRIM(${config.column}))) WHERE lower(trim(type)) = '${entityType}' AND ${config.column} IS NOT NULL AND TRIM(${config.column}) <> ''`
  );
};

const backfillEntityCodes = (db, entityType) => {
  const config = resolveEntityCodeConfig(entityType);
  const rows = db
    .prepare(
      `
      SELECT rowid, id, type, ${config.column} AS code_value
      FROM clients
      WHERE lower(trim(type)) = ?
      ORDER BY
        CASE WHEN updated_at IS NULL OR trim(updated_at) = '' THEN 1 ELSE 0 END,
        updated_at ASC,
        CASE WHEN created_at IS NULL OR trim(created_at) = '' THEN 1 ELSE 0 END,
        created_at ASC,
        rowid ASC
    `
    )
    .all(entityType);
  if (!rows.length) {
    ensureEntityUniqueIndex(db, entityType);
    return;
  }

  const used = new Set();
  const maxAttemptsPerRow = 64;
  const tx = db.transaction((entries = []) => {
    const stmt = db.prepare(
      `UPDATE clients SET ${config.column} = ? WHERE id = ? AND lower(trim(type)) = ?`
    );
    entries.forEach((row) => {
      const rowId = normalizeText(row?.id);
      if (!rowId) return;
      const normalized = normalizeEntityCodeValue(row?.code_value, entityType);
      const hasValidUniqueExisting =
        !!normalized && isGeneratedEntityCodeFormat(normalized, entityType) && !used.has(normalized);
      if (hasValidUniqueExisting) {
        used.add(normalized);
        return;
      }

      let assigned = false;
      for (let attempt = 0; attempt < maxAttemptsPerRow && !assigned; attempt += 1) {
        const generated = generateUniqueEntityCode({
          entityType,
          exists: (candidate) => used.has(normalizeEntityCodeValue(candidate, entityType))
        });
        try {
          stmt.run(generated, rowId, entityType);
          used.add(normalizeEntityCodeValue(generated, entityType));
          assigned = true;
        } catch (error) {
          if (!isEntityCodeConstraintError(error, entityType) || attempt >= maxAttemptsPerRow - 1) {
            throw error;
          }
          console.warn(
            `[${entityType}-code][migration] collision detected during backfill`,
            JSON.stringify({
              entityType,
              entityId: rowId,
              attempt: attempt + 1,
              maxAttempts: maxAttemptsPerRow,
              candidate: generated
            })
          );
          used.add(normalizeEntityCodeValue(generated, entityType));
        }
      }
      if (!assigned) {
        throw new Error(`Impossible de generer un code unique (${entityType}) pour ${rowId}.`);
      }
    });
  });
  tx(rows);
  ensureEntityUniqueIndex(db, entityType);
};

module.exports = function clientsVendorTransporteurCodesBackfillMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["clients"] });
  ENTITY_TYPES.forEach((entityType) => {
    backfillEntityCodes(db, entityType);
  });
};

