"use strict";

const fs = require("fs");
const path = require("path");

const SCHEMA_FILE_PATTERN = /^\d+_.+\.sql$/i;

const listSchemaFiles = (schemaDir) => {
  if (!fs.existsSync(schemaDir)) return [];
  return fs
    .readdirSync(schemaDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SCHEMA_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aPrefix = Number.parseInt(a.split("_", 1)[0], 10);
      const bPrefix = Number.parseInt(b.split("_", 1)[0], 10);
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.localeCompare(b);
    });
};

module.exports = function initSchemaMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  const schemaDir = path.join(__dirname, "..", "schema");
  const files = listSchemaFiles(schemaDir);
  files.forEach((filename) => {
    const sql = fs.readFileSync(path.join(schemaDir, filename), "utf8");
    if (sql && sql.trim()) {
      db.exec(sql);
    }
  });
};
