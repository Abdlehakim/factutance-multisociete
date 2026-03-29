"use strict";

const { alignSchema } = require("../schema-definition");

module.exports = function documentsConvertedFromNumbersAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["documents"] });

  const rows = db
    .prepare(
      `
        SELECT id, converted_from_number, converted_from_numbers_json
        FROM documents
        WHERE converted_from_number IS NOT NULL
          AND TRIM(converted_from_number) <> ''
          AND (converted_from_numbers_json IS NULL OR TRIM(converted_from_numbers_json) = '')
      `
    )
    .all();

  if (!Array.isArray(rows) || !rows.length) return;

  const update = db.prepare(
    "UPDATE documents SET converted_from_numbers_json = ? WHERE id = ?"
  );

  const tx = db.transaction(() => {
    rows.forEach((row) => {
      const number = String(row?.converted_from_number || "").trim();
      if (!number) return;
      update.run(JSON.stringify([number]), row.id);
    });
  });

  tx();
};
