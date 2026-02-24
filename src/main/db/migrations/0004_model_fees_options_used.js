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

const FEES_OPTIONS = [
  { key: "shipping", enabledPath: "shipping.enabled", usedPath: "shipping.used", defaultUsed: true },
  { key: "stamp", enabledPath: "stamp.enabled", usedPath: "stamp.used", defaultUsed: true },
  { key: "dossier", enabledPath: "dossier.enabled", usedPath: "dossier.used", defaultUsed: false },
  { key: "deplacement", enabledPath: "deplacement.enabled", usedPath: "deplacement.used", defaultUsed: false }
];

module.exports = function modelFeesOptionsUsedMigration(db) {
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
      FEES_OPTIONS.forEach((fee) => {
        if (byPath.has(fee.usedPath)) return;
        const enabled = parseFieldBool(byPath.get(fee.enabledPath));
        const used = enabled === true ? true : fee.defaultUsed;
        upsertField.run(modelName, fee.usedPath, "boolean", used ? "1" : "0");
      });
    });
  });

  tx();
};
