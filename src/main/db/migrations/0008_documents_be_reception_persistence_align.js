"use strict";

const { alignSchema } = require("../schema-definition");

module.exports = function documentsBeReceptionPersistenceAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db);
};

