"use strict";

const { alignSchema } = require("../schema-definition");

module.exports = function legacyAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db);
};
