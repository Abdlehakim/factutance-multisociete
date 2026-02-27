"use strict";

const { alignSchema } = require("../schema-definition");

const tableExists = (db, table) => {
  try {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table);
    return !!row;
  } catch {
    return false;
  }
};

const tableHasColumn = (db, table, column) => {
  try {
    const rows = db
      .prepare(`PRAGMA table_info("${String(table).replace(/"/g, "\"\"")}")`)
      .all();
    return rows.some((row) => row?.name === column);
  } catch {
    return false;
  }
};

module.exports = function articlesPurchaseDiscountPersistenceMigration(db) {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  alignSchema(db, { tables: ["articles"] });
  if (!tableExists(db, "articles")) return;

  if (!tableHasColumn(db, "articles", "purchase_discount")) {
    db.exec("ALTER TABLE articles ADD COLUMN purchase_discount REAL NOT NULL DEFAULT 0");
  }

  if (tableHasColumn(db, "articles", "purchase_discount")) {
    if (tableHasColumn(db, "articles", "purchaseDiscount")) {
      db.exec(
        "UPDATE articles SET purchase_discount = COALESCE(purchase_discount, purchaseDiscount, discount, 0) WHERE purchase_discount IS NULL"
      );
    } else {
      db.exec(
        "UPDATE articles SET purchase_discount = COALESCE(purchase_discount, discount, 0) WHERE purchase_discount IS NULL"
      );
    }
    db.exec("UPDATE articles SET purchase_discount = 0 WHERE purchase_discount IS NULL");
  }
};
