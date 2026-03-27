"use strict";

const { alignSchema } = require("../schema-definition");
const {
  normalizeDepotCodeValue,
  isGeneratedDepotCodeFormat,
  generateUniqueDepotCode
} = require("../depot-code");

const normalizeText = (value) => String(value ?? "").trim();

const isDepotCodeConstraintError = (error) => {
  const message = String(error?.message || error || "");
  if (!message) return false;
  return (
    message.includes("idx_depot_magasin_code_depot_unique") ||
    message.includes("depot_magasin.code_depot") ||
    (/UNIQUE constraint failed/i.test(message) && /code_depot/i.test(message))
  );
};

module.exports = function depotCodeDepotBackfillMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["depot_magasin"] });

  const rows = db
    .prepare(
      `
      SELECT rowid, id, code_depot
      FROM depot_magasin
      ORDER BY
        CASE WHEN updated_at IS NULL OR trim(updated_at) = '' THEN 1 ELSE 0 END,
        updated_at ASC,
        CASE WHEN created_at IS NULL OR trim(created_at) = '' THEN 1 ELSE 0 END,
        created_at ASC,
        rowid ASC
    `
    )
    .all();

  if (!rows.length) {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_depot_magasin_code_depot_unique ON depot_magasin (UPPER(TRIM(code_depot))) WHERE code_depot IS NOT NULL AND TRIM(code_depot) <> ''"
    );
    return;
  }

  const used = new Set();
  const maxAttemptsPerRow = 64;

  const tx = db.transaction((entries = []) => {
    const stmt = db.prepare(
      "UPDATE depot_magasin SET code_depot = ?, updated_at = ? WHERE id = ?"
    );
    entries.forEach((row) => {
      const depotId = normalizeText(row?.id);
      if (!depotId) return;
      const normalized = normalizeDepotCodeValue(row?.code_depot);
      const hasValidUniqueExisting =
        !!normalized &&
        isGeneratedDepotCodeFormat(normalized) &&
        !used.has(normalized);
      if (hasValidUniqueExisting) {
        used.add(normalized);
        return;
      }

      let assigned = false;
      for (let attempt = 0; attempt < maxAttemptsPerRow && !assigned; attempt += 1) {
        const generated = generateUniqueDepotCode({
          exists: (candidate) => used.has(normalizeDepotCodeValue(candidate))
        });
        try {
          stmt.run(generated, new Date().toISOString(), depotId);
          used.add(normalizeDepotCodeValue(generated));
          assigned = true;
        } catch (error) {
          if (
            !isDepotCodeConstraintError(error) ||
            attempt >= maxAttemptsPerRow - 1
          ) {
            throw error;
          }
          console.warn(
            "[depot-code][migration] collision detected during backfill",
            JSON.stringify({
              depotId,
              attempt: attempt + 1,
              maxAttempts: maxAttemptsPerRow,
              candidate: generated
            })
          );
          used.add(normalizeDepotCodeValue(generated));
        }
      }

      if (!assigned) {
        throw new Error(`Impossible de generer un code depot unique pour ${depotId}.`);
      }
    });
  });

  tx(rows);

  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_depot_magasin_code_depot_unique ON depot_magasin (UPPER(TRIM(code_depot))) WHERE code_depot IS NOT NULL AND TRIM(code_depot) <> ''"
  );
};
