"use strict";

const { alignSchema } = require("../schema-definition");

module.exports = function documentsBePdfRemarksAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["documents_be"] });
};
