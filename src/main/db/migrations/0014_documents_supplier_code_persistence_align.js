"use strict";

const { DOC_TYPE_TABLES, alignSchema } = require("../schema-definition");

const SUPPLIER_DOC_TYPES = ["fa", "bc", "be"];

module.exports = function documentsSupplierCodePersistenceAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: Object.values(DOC_TYPE_TABLES) });

  SUPPLIER_DOC_TYPES.forEach((docType) => {
    const table = DOC_TYPE_TABLES[docType];
    if (!table) return;
    db.exec(`
      UPDATE ${table}
      SET client_code_fournisseur = COALESCE(
        NULLIF(TRIM(client_code_fournisseur), ''),
        NULLIF(TRIM(client_code), '')
      )
      WHERE (client_code_fournisseur IS NULL OR TRIM(client_code_fournisseur) = '')
        AND client_code IS NOT NULL
        AND TRIM(client_code) <> ''
    `);
  });
};
