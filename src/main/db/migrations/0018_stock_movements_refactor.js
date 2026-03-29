"use strict";

const { DOC_TYPE_TABLES, alignSchema } = require("../schema-definition");

module.exports = function stockMovementsRefactorMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, {
    tables: [
      ...Object.values(DOC_TYPE_TABLES),
      "stock_movements"
    ]
  });
};
