"use strict";

const { DOC_TYPE_TABLES, alignSchema } = require("../schema-definition");

const DOC_TYPE_BY_TABLE = Object.entries(DOC_TYPE_TABLES).reduce((acc, [docType, table]) => {
  acc[table] = docType;
  return acc;
}, {});

const tableHasColumn = (db, table, column) => {
  try {
    const rows = db.prepare(`PRAGMA table_info("${String(table).replace(/"/g, "\"\"")}")`).all();
    return rows.some((row) => row?.name === column);
  } catch {
    return false;
  }
};

const normalizeDocTypeValue = (value, fallback = "facture") => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || fallback;
};

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

const upsertModelBool = (stmt, modelName, path, value) => {
  stmt.run(modelName, path, "boolean", value ? "1" : "0");
};

module.exports = function achatColumnsAlignMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db);

  const docTables = Object.values(DOC_TYPE_TABLES);
  const tx = db.transaction(() => {
    docTables.forEach((table) => {
      const quotedTable = `"${String(table).replace(/"/g, "\"\"")}"`;
      const defaultDocType = DOC_TYPE_BY_TABLE[table] || "facture";
      const hasPurchasePrice = tableHasColumn(db, table, "meta_col_purchase_price");
      const hasPurchaseTva = tableHasColumn(db, table, "meta_col_purchase_tva");
      const hasPurchaseFodec = tableHasColumn(db, table, "meta_col_fodec_purchase");
      const hasTotalPurchaseHt = tableHasColumn(db, table, "meta_col_total_purchase_ht");
      const hasTotalPurchaseTtc = tableHasColumn(db, table, "meta_col_total_purchase_ttc");
      const hasPurchaseLock = tableHasColumn(db, table, "meta_col_purchase_dependencies_locked");
      const hasTaxesEnabled = tableHasColumn(db, table, "meta_taxes_enabled");
      const hasSaleTva = tableHasColumn(db, table, "meta_col_tva");
      const hasSaleFodec = tableHasColumn(db, table, "meta_col_fodec_sale");
      const hasContextualFodec = tableHasColumn(db, table, "meta_col_fodec");
      const hasTotalTtc = tableHasColumn(db, table, "meta_col_total_ttc");
      const hasMetaDocType = tableHasColumn(db, table, "meta_doc_type");

      if (hasPurchasePrice && hasPurchaseTva) {
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_purchase_tva = 0
           WHERE COALESCE(meta_col_purchase_price, 0) = 0
             AND COALESCE(meta_col_purchase_tva, 0) <> 0`
        );
      }
      if (hasPurchasePrice && hasPurchaseFodec) {
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_fodec_purchase = 0
           WHERE COALESCE(meta_col_purchase_price, 0) = 0
             AND COALESCE(meta_col_fodec_purchase, 0) <> 0`
        );
      }
      if (hasPurchasePrice && hasTotalPurchaseHt) {
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_total_purchase_ht = 0
           WHERE COALESCE(meta_col_purchase_price, 0) = 0
             AND COALESCE(meta_col_total_purchase_ht, 0) <> 0`
        );
      }
      if (hasPurchasePrice && hasTotalPurchaseTtc) {
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_total_purchase_ttc = 0
           WHERE COALESCE(meta_col_purchase_price, 0) = 0
             AND COALESCE(meta_col_total_purchase_ttc, 0) <> 0`
        );
      }
      if (hasPurchasePrice && hasPurchaseLock) {
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_purchase_dependencies_locked = CASE
             WHEN COALESCE(meta_col_purchase_price, 0) = 0 THEN 1
             ELSE 0
           END`
        );
      }

      if (hasTaxesEnabled) {
        if (hasPurchaseTva) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_purchase_tva = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_purchase_tva, 0) <> 0`
          );
        }
        if (hasPurchaseFodec) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_fodec_purchase = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_fodec_purchase, 0) <> 0`
          );
        }
        if (hasTotalPurchaseTtc) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_total_purchase_ttc = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_total_purchase_ttc, 0) <> 0`
          );
        }
        if (hasSaleTva) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_tva = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_tva, 0) <> 0`
          );
        }
        if (hasSaleFodec) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_fodec_sale = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_fodec_sale, 0) <> 0`
          );
        }
        if (hasContextualFodec) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_fodec = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_fodec, 0) <> 0`
          );
        }
        if (hasTotalTtc) {
          db.exec(
            `UPDATE ${quotedTable}
             SET meta_col_total_ttc = 0
             WHERE COALESCE(meta_taxes_enabled, 1) = 0
               AND COALESCE(meta_col_total_ttc, 0) <> 0`
          );
        }
      }

      if (hasContextualFodec && hasSaleFodec && hasPurchaseFodec) {
        const docTypeExpr = hasMetaDocType
          ? `LOWER(TRIM(COALESCE(NULLIF(meta_doc_type, ''), '${defaultDocType}')))`
          : `'${defaultDocType}'`;
        db.exec(
          `UPDATE ${quotedTable}
           SET meta_col_fodec = CASE
             WHEN ${docTypeExpr} = 'fa' THEN COALESCE(meta_col_fodec_purchase, 0)
             ELSE COALESCE(meta_col_fodec_sale, 0)
           END`
        );
      }
    });

    const hasModels = !!db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'models' LIMIT 1")
      .get();
    const hasModelFields = !!db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'model_fields' LIMIT 1")
      .get();
    if (!hasModels || !hasModelFields) return;

    const modelRows = db.prepare("SELECT name FROM models").all();
    if (!Array.isArray(modelRows) || !modelRows.length) return;
    const readFields = db.prepare(
      "SELECT path, type, value FROM model_fields WHERE model_name = ?"
    );
    const upsertField = db.prepare(
      `INSERT INTO model_fields (model_name, path, type, value)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(model_name, path) DO UPDATE SET
         type = excluded.type,
         value = excluded.value`
    );

    modelRows.forEach((modelRow) => {
      const modelName = String(modelRow?.name || "").trim();
      if (!modelName) return;
      const rows = readFields.all(modelName);
      const byPath = new Map(rows.map((row) => [String(row.path || ""), row]));
      const readBool = (path) => parseFieldBool(byPath.get(path));
      const hasPath = (path) => byPath.has(path);

      const docTypeValues = [];
      rows.forEach((row) => {
        const path = String(row.path || "");
        if (path === "docType" || /^docTypes\[\d+\]$/.test(path)) {
          const normalized = normalizeDocTypeValue(row.value, "");
          if (normalized) docTypeValues.push(normalized);
        }
      });
      const isPurchaseModel = docTypeValues.includes("fa");
      const taxesEnabled = readBool("taxesEnabled");
      const purchasePrice = readBool("columns.purchasePrice");
      const purchasePriceEnabled = purchasePrice === true;
      const legacyFodec = readBool("columns.fodec");

      let saleFodecValue = hasPath("columns.fodecSale")
        ? readBool("columns.fodecSale")
        : (isPurchaseModel ? false : !!legacyFodec);
      let purchaseFodecValue = hasPath("columns.fodecPurchase")
        ? readBool("columns.fodecPurchase")
        : (isPurchaseModel ? !!legacyFodec : false);

      if (!purchasePriceEnabled) {
        upsertModelBool(upsertField, modelName, "columns.purchaseTva", false);
        upsertModelBool(upsertField, modelName, "columns.totalPurchaseHt", false);
        upsertModelBool(upsertField, modelName, "columns.totalPurchaseTtc", false);
        purchaseFodecValue = false;
      }
      if (taxesEnabled === false) {
        upsertModelBool(upsertField, modelName, "columns.tva", false);
        upsertModelBool(upsertField, modelName, "columns.totalTtc", false);
        upsertModelBool(upsertField, modelName, "columns.purchaseTva", false);
        upsertModelBool(upsertField, modelName, "columns.totalPurchaseTtc", false);
        saleFodecValue = false;
        purchaseFodecValue = false;
      }

      upsertModelBool(upsertField, modelName, "columns.fodecSale", !!saleFodecValue);
      upsertModelBool(upsertField, modelName, "columns.fodecPurchase", !!purchaseFodecValue);
      upsertModelBool(
        upsertField,
        modelName,
        "columns.purchaseDependenciesLocked",
        !purchasePriceEnabled
      );
      upsertModelBool(
        upsertField,
        modelName,
        "columns.fodec",
        isPurchaseModel ? !!purchaseFodecValue : !!saleFodecValue
      );
    });
  });

  tx();
};
