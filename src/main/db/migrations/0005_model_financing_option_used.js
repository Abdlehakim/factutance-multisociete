"use strict";

const { alignSchema } = require("../schema-definition");

const parseFieldBool = (row) => {
  if (!row) return undefined;
  const raw = String(row.value ?? "").trim().toLowerCase();
  if (row.type === "boolean") {
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
  }
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
};

module.exports = function modelFinancingOptionUsedMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db);

  const hasModels = !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'models' LIMIT 1")
    .get();
  const hasModelFields = !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'model_fields' LIMIT 1")
    .get();
  if (!hasModels || !hasModelFields) return;

  const readModelNames = db.prepare("SELECT name FROM models");
  const readFields = db.prepare("SELECT path, type, value FROM model_fields WHERE model_name = ?");
  const upsertField = db.prepare(
    `INSERT INTO model_fields (model_name, path, type, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(model_name, path) DO UPDATE SET
       type = excluded.type,
       value = excluded.value`
  );

  const tx = db.transaction(() => {
    const modelRows = readModelNames.all();
    if (!Array.isArray(modelRows) || !modelRows.length) return;
    modelRows.forEach((modelRow) => {
      const modelName = String(modelRow?.name || "").trim();
      if (!modelName) return;
      const byPath = new Map(
        readFields.all(modelName).map((row) => [String(row.path || ""), row])
      );
      if (byPath.has("financing.used")) return;
      const subventionEnabled = parseFieldBool(byPath.get("financing.subvention.enabled"));
      const bankEnabled = parseFieldBool(byPath.get("financing.bank.enabled"));
      const used = subventionEnabled === true || bankEnabled === true;
      upsertField.run(modelName, "financing.used", "boolean", used ? "1" : "0");
    });
  });

  tx();
};
