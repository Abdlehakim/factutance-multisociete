"use strict";

const { alignSchema } = require("../schema-definition");
const {
  normalizeClientCodeValue,
  generateUniqueClientCode,
  isGeneratedClientCodeFormat
} = require("../client-code");

const normalizeText = (value) => String(value ?? "").trim();
const isClientEntityType = (value) => normalizeText(value).toLowerCase() === "client";
const isClientCodeConstraintError = (error) => {
  const message = String(error?.message || error || "");
  if (!message) return false;
  return (
    message.includes("idx_clients_code_client_unique") ||
    message.includes("clients.code_client") ||
    (/UNIQUE constraint failed/i.test(message) && /code_client/i.test(message))
  );
};

module.exports = function clientsCodeClientBackfillMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["clients"] });

  const rows = db
    .prepare(
      `
      SELECT rowid, id, type, code_client
      FROM clients
      WHERE lower(trim(type)) = 'client'
      ORDER BY
        CASE WHEN updated_at IS NULL OR trim(updated_at) = '' THEN 1 ELSE 0 END,
        updated_at ASC,
        CASE WHEN created_at IS NULL OR trim(created_at) = '' THEN 1 ELSE 0 END,
        created_at ASC,
        rowid ASC
    `
    )
    .all();
  if (!rows.length) return;

  const used = new Set();
  const maxAttemptsPerRow = 64;
  const tx = db.transaction((entries = []) => {
    const stmt = db.prepare("UPDATE clients SET code_client = ? WHERE id = ? AND lower(trim(type)) = 'client'");
    entries.forEach((row) => {
      if (!isClientEntityType(row?.type)) return;
      const rowId = String(row?.id || "").trim();
      if (!rowId) return;
      const rawCode = normalizeText(row?.code_client);
      const normalized = normalizeClientCodeValue(rawCode);
      const hasValidUniqueExisting =
        !!normalized && isGeneratedClientCodeFormat(normalized) && !used.has(normalized);
      if (hasValidUniqueExisting) {
        used.add(normalized);
        return;
      }

      let assigned = false;
      for (let attempt = 0; attempt < maxAttemptsPerRow && !assigned; attempt += 1) {
        const generated = generateUniqueClientCode({
          exists: (candidate) => used.has(normalizeClientCodeValue(candidate))
        });
        try {
          stmt.run(generated, rowId);
          used.add(normalizeClientCodeValue(generated));
          assigned = true;
        } catch (error) {
          if (!isClientCodeConstraintError(error) || attempt >= maxAttemptsPerRow - 1) {
            throw error;
          }
          console.warn(
            "[client-code][migration] collision detected during backfill",
            JSON.stringify({
              clientId: rowId,
              attempt: attempt + 1,
              maxAttempts: maxAttemptsPerRow,
              candidate: generated
            })
          );
          used.add(normalizeClientCodeValue(generated));
        }
      }
      if (!assigned) {
        throw new Error(`Impossible de generer un code client unique pour ${rowId}.`);
      }
    });
  });
  tx(rows);

  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_code_client_unique ON clients (UPPER(TRIM(code_client))) WHERE lower(trim(type)) = 'client' AND code_client IS NOT NULL AND TRIM(code_client) <> ''"
  );
};
