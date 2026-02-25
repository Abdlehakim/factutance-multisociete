"use strict";
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { runMigrations: runSchemaMigrations } = require("./migrate");
const { createDepotMagasinRepository } = require("./depot-magasin");
const {
  DOC_TYPE_TABLES,
  DOC_ITEM_TABLES,
  alignSchema
} = require("./schema-definition");

const DEFAULT_DB_FILENAME = "entreprise1.db";
const COMPANY_DB_FILENAME_REGEX = /^entreprise\d+$/i;
const CLIENT_BALANCE_DOC_TABLE = DOC_TYPE_TABLES.facture;
const CLIENT_BALANCE_MIGRATION_KEY = "migration_client_balance_rebuild_v4";
const CLIENT_PATH_PREFIX = "sqlite://clients/";
const DEPOT_PATH_PREFIX = "sqlite://depots/";
const ARTICLE_PATH_PREFIX = "sqlite://articles/";
const DOCUMENT_PATH_PREFIX = "sqlite://documents/";
const DOC_TYPE_PREFIX = {
  facture: "Fact",
  fa: "FA",
  devis: "Dev",
  bl: "BL",
  bc: "BC",
  be: "BE",
  bs: "BS",
  avoir: "AV",
  retenue: "RET"
};
const VALID_NUMBER_LENGTHS = [4, 6, 8, 12];
const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
const NUMBER_FORMATS = new Set(["prefix_date_counter", "prefix_counter", "counter"]);
const DOC_LOCK_TTL_MS = 300000;
const INSTANCE_ID = `${(crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString("hex")}:${process.pid}`;

let getRootDir = null;
let dbFileName = "";
let dbInstance = null;
let currentDbPath = "";

const ensureAccessor = () => {
  if (typeof getRootDir !== "function") {
    throw new Error("Facturance DB requires a root directory accessor.");
  }
};

const getDatabasePath = () => {
  ensureAccessor();
  const root = getRootDir();
  if (!root) {
    throw new Error("Unable to resolve Facturance root directory.");
  }
  const configuredName = typeof dbFileName === "string" ? dbFileName.trim() : "";
  const fallbackFromRoot = (() => {
    const base = path.basename(String(root || ""));
    return COMPANY_DB_FILENAME_REGEX.test(base) ? `${base}.db` : DEFAULT_DB_FILENAME;
  })();
  const fileName = configuredName || fallbackFromRoot;
  return path.join(root, fileName);
};

const initDatabase = () => {
  ensureAccessor();
  const targetPath = getDatabasePath();
  if (dbInstance && currentDbPath === targetPath) return dbInstance;
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      console.warn("Facturance DB close failed", err);
    }
    dbInstance = null;
    currentDbPath = "";
  }
  const parentDir = path.dirname(targetPath);
  fs.mkdirSync(parentDir, { recursive: true });
  dbInstance = new Database(targetPath);
  currentDbPath = targetPath;
  ensureTables(dbInstance);
  return dbInstance;
};

const resetConnection = () => {
  if (!dbInstance) {
    currentDbPath = "";
    return true;
  }
  try {
    dbInstance.close();
  } catch (err) {
    console.warn("Facturance DB close failed", err);
  }
  dbInstance = null;
  currentDbPath = "";
  return true;
};

const ensureTables = (db) => {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  runSchemaMigrations(db, path.join(__dirname, "migrations"));
  // Backfill depot/magasin stock schema on existing company DBs even when
  // historical migration files are absent in this branch.
  alignSchema(db, {
    tables: ["articles", "depot_magasin", "depot_magasin_emplacement"]
  });
  runLegacyDataMigrations(db);
  ensureClientBalanceTriggers(db);
  ensurePaymentHistoryBalanceTriggers(db);
};

const ensureSchemaTables = (db, tables = []) => {
  if (!db) return;
  alignSchema(db, { tables });
};

const tableHasColumn = (db, table, column) => {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    return columns.some((col) => col.name === column);
  } catch {
    return false;
  }
};

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

const ensureClientBalanceTriggers = (db) => {
  db.exec(`
    DROP TRIGGER IF EXISTS trg_client_balance_facture_insert;
    DROP TRIGGER IF EXISTS trg_client_balance_facture_delete;
    DROP TRIGGER IF EXISTS trg_client_balance_facture_update;
  `);
};

const ensurePaymentHistoryBalanceTriggers = (db) => {
  db.exec(`
    DROP TRIGGER IF EXISTS trg_client_balance_payment_insert;
    DROP TRIGGER IF EXISTS trg_client_balance_payment_delete;
    DROP TRIGGER IF EXISTS trg_client_balance_payment_update;
  `);
};
const rebuildClientBalancesFromInvoices = (db) => {
  if (!db) return;
};

const hasMigrationFlag = (db, key) => !!db.prepare("SELECT 1 FROM app_settings WHERE key = ?").get(key);

const markMigrationFlag = (db, key) => {
  const now = new Date().toISOString();
  db
    .prepare(
      `
      INSERT INTO app_settings (key, updated_at)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        updated_at = excluded.updated_at
    `
    )
    .run(key, now);
};

const runClientBalanceRebuildMigration = (db) => {
  if (!db || !tableExists(db, "app_settings")) return;
  if (hasMigrationFlag(db, CLIENT_BALANCE_MIGRATION_KEY)) return;
  markMigrationFlag(db, CLIENT_BALANCE_MIGRATION_KEY);
};

const createLockId = () =>
  (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString("hex");

const pruneStaleDocLocks = (db, now = Date.now()) => {
  db.prepare("DELETE FROM doc_edit_locks WHERE last_seen < ?").run(now - DOC_LOCK_TTL_MS);
};

const acquireDocEditLock = (docKey) => {
  const key = typeof docKey === "string" ? docKey.trim() : "";
  if (!key) return { ok: false, error: "Chemin du document introuvable." };
  const db = initDatabase();
  const now = Date.now();
  const tx = db.transaction(() => {
    pruneStaleDocLocks(db, now);
    const existing = db
      .prepare("SELECT lock_id, instance_id FROM doc_edit_locks WHERE doc_key = ?")
      .get(key);
    if (existing) {
      if (existing.instance_id === INSTANCE_ID) {
        db.prepare("UPDATE doc_edit_locks SET last_seen = ? WHERE doc_key = ?").run(now, key);
        return { ok: true, lockId: existing.lock_id, acquired: false };
      }
      return { ok: false, locked: true, error: "Document deja ouvert en modification." };
    }
    const lockId = createLockId();
    db.prepare(
      `
      INSERT INTO doc_edit_locks (doc_key, lock_id, instance_id, acquired_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(key, lockId, INSTANCE_ID, now, now);
    return { ok: true, lockId, acquired: true };
  });
  return tx();
};

const touchDocEditLock = (docKey, lockId) => {
  const key = typeof docKey === "string" ? docKey.trim() : "";
  const id = typeof lockId === "string" ? lockId.trim() : "";
  if (!key || !id) return { ok: false, error: "Verrou de document introuvable." };
  const db = initDatabase();
  const now = Date.now();
  const result = db
    .prepare(
      "UPDATE doc_edit_locks SET last_seen = ? WHERE doc_key = ? AND lock_id = ? AND instance_id = ?"
    )
    .run(now, key, id, INSTANCE_ID);
  if (!result.changes) {
    return { ok: false, locked: true, error: "Document deja ouvert en modification." };
  }
  return { ok: true };
};

const releaseDocEditLock = (docKey, lockId) => {
  const key = typeof docKey === "string" ? docKey.trim() : "";
  const id = typeof lockId === "string" ? lockId.trim() : "";
  if (!key || !id) return { ok: false, error: "Verrou de document introuvable." };
  const db = initDatabase();
  const result = db
    .prepare("DELETE FROM doc_edit_locks WHERE doc_key = ? AND lock_id = ? AND instance_id = ?")
    .run(key, id, INSTANCE_ID);
  return { ok: true, released: !!result.changes };
};

const migrateLegacyClients = (db) => {
  if (!tableHasColumn(db, "clients", "data")) return;
  const legacyRows = db
    .prepare("SELECT id, type, name, data, search_text, legacy_path, created_at, updated_at FROM clients")
    .all();
  db.exec("ALTER TABLE clients RENAME TO clients_legacy_json");
  ensureSchemaTables(db, ["clients"]);
  const insertClient = db.prepare(
    `
    INSERT INTO clients (
      id,
      type,
      name,
      client_type,
      benefit,
      account,
      account_normalized,
      vat,
      identifiant_fiscal,
      cin,
      passport,
      steg_ref,
      phone,
      email,
      address,
      sold_client,
      search_text,
      legacy_path,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  );
  const tx = db.transaction(() => {
    legacyRows.forEach((row) => {
      const dataRaw = parseJsonSafeForMigration(row.data);
      const data = dataRaw && typeof dataRaw === "object" ? dataRaw : {};
      const normalizedClient = normalizeClientRecord(data);
      const accountValue = normalizeAccountValue(normalizedClient.account);
      const searchText = buildSearchText([
        normalizedClient.name,
        normalizedClient.benefit,
        normalizedClient.account,
        normalizedClient.vat,
        normalizedClient.identifiantFiscal,
        normalizedClient.cin,
        normalizedClient.passport,
        normalizedClient.stegRef,
        normalizedClient.phone,
        normalizedClient.email,
        normalizedClient.address,
        normalizedClient.soldClient
      ]);
      const nameValue = row.name || normalizedClient.name || "client";
      insertClient.run(
        row.id,
        row.type,
        nameValue,
        normalizedClient.clientType || null,
        normalizedClient.benefit || null,
        normalizedClient.account || null,
        accountValue || null,
        normalizedClient.vat || null,
        normalizedClient.identifiantFiscal || null,
        normalizedClient.cin || null,
        normalizedClient.passport || null,
        normalizedClient.stegRef || null,
        normalizedClient.phone || null,
        normalizedClient.email || null,
        normalizedClient.address || null,
        normalizedClient.soldClient || null,
        searchText || row.search_text,
        row.legacy_path || null,
        row.created_at,
        row.updated_at
      );
    });
  });
  tx();
  db.exec("DROP TABLE clients_legacy_json");
};

const migrateLegacyArticles = (db) => {
  if (!tableHasColumn(db, "articles", "data")) return;
  const legacyRows = db
    .prepare(
      "SELECT id, name, data, search_text, ref_normalized, product_normalized, desc_normalized, legacy_path, created_at, updated_at FROM articles"
    )
    .all();
  db.exec("ALTER TABLE articles RENAME TO articles_legacy_json");
  ensureSchemaTables(db, ["articles"]);
  const insertArticle = db.prepare(
    `
    INSERT INTO articles (
      id,
      name,
      ref,
      product,
      desc,
      qty,
      stock_qty,
      stock_min,
      stock_alert,
      unit,
      purchase_price,
      purchase_tva,
      price,
      tva,
      discount,
      fodec_enabled,
      fodec_label,
      fodec_rate,
      fodec_tva,
      purchase_fodec_enabled,
      purchase_fodec_label,
      purchase_fodec_rate,
      purchase_fodec_tva,
      use_ref,
      use_product,
      use_desc,
      use_unit,
      use_price,
      use_fodec,
      use_tva,
      use_discount,
      use_total_ht,
      use_total_ttc,
      search_text,
      ref_normalized,
      product_normalized,
      desc_normalized,
      legacy_path,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  );
  const tx = db.transaction(() => {
    legacyRows.forEach((row) => {
      const dataRaw = parseJsonSafeForMigration(row.data);
      const data = dataRaw && typeof dataRaw === "object" ? dataRaw : {};
      const normalized = normalizeArticleRecord(data);
      const use = normalized.use;
      insertArticle.run(
        row.id,
        row.name || normalized.ref || normalized.product || normalized.desc || "article",
        normalized.ref,
        normalized.product,
        normalized.desc,
        normalized.qty,
        normalized.stockQty,
        normalized.stockMin,
        normalizeDbBool(normalized.stockAlert),
        normalized.unit,
        normalized.purchasePrice,
        normalized.purchaseTva,
        normalized.price,
        normalized.tva,
        normalized.discount,
        normalizeDbBool(normalized.fodec?.enabled),
        normalizeTextValue(normalized.fodec?.label || "FODEC"),
        Number(normalized.fodec?.rate || 0),
        Number(normalized.fodec?.tva || 0),
        normalizeDbBool(normalized.purchaseFodec?.enabled),
        normalizeTextValue(normalized.purchaseFodec?.label || "FODEC ACHAT"),
        Number(normalized.purchaseFodec?.rate || 0),
        Number(normalized.purchaseFodec?.tva || 0),
        resolveArticleUseFlag(use, "ref"),
        resolveArticleUseFlag(use, "product"),
        resolveArticleUseFlag(use, "desc"),
        resolveArticleUseFlag(use, "unit"),
        resolveArticleUseFlag(use, "price"),
        resolveArticleUseFlag(use, "fodec"),
        resolveArticleUseFlag(use, "tva"),
        resolveArticleUseFlag(use, "discount"),
        resolveArticleUseFlag(use, "totalHt"),
        resolveArticleUseFlag(use, "totalTtc"),
        buildArticleSearchText(normalized) || row.search_text,
        normalizeArticleField(normalized.ref) || row.ref_normalized,
        normalizeArticleField(normalized.product) || row.product_normalized,
        normalizeArticleField(normalized.desc) || row.desc_normalized,
        row.legacy_path || null,
        row.created_at,
        row.updated_at
      );
    });
  });
  tx();
  db.exec("DROP TABLE articles_legacy_json");
};

const migrateLegacyDocuments = (db) => {
  if (!tableHasColumn(db, "documents", "data")) return;
  const legacyRows = db
    .prepare(
      "SELECT id, doc_type, period, number, idx, data, note_interne, created_at, updated_at FROM documents"
    )
    .all();
  db.exec("ALTER TABLE documents RENAME TO documents_legacy_json");
  ensureSchemaTables(db, ["documents"]);
  const insertDocument = db.prepare(
    `
    INSERT INTO documents (
      id,
      doc_type,
      period,
      number,
      idx,
      status,
      note_interne,
      converted_from_type,
      converted_from_id,
      converted_from_number,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  );
  const tx = db.transaction(() => {
    legacyRows.forEach((row) => {
      const dataRaw = parseJsonSafeForMigration(row.data);
      const data = dataRaw && typeof dataRaw === "object" ? dataRaw : {};
      const meta = data && typeof data === "object" ? data.meta : null;
      const legacyStatus =
        meta && typeof meta === "object"
          ? normalizeDocumentStatus(meta.status ?? meta.historyStatus)
          : null;
      const noteInterne =
        typeof row.note_interne === "string"
          ? row.note_interne
          : (meta && typeof meta.noteInterne === "string" ? meta.noteInterne : "");
      const convertedFromStorage = resolveConvertedFromForStorage(data);
      insertDocument.run(
        row.id,
        row.doc_type,
        row.period,
        row.number,
        row.idx,
        legacyStatus,
        noteInterne || null,
        convertedFromStorage.type,
        convertedFromStorage.id,
        convertedFromStorage.number,
        row.created_at,
        row.updated_at
      );
      if (meta && typeof meta === "object") meta.noteInterne = noteInterne || meta.noteInterne;
      saveDocumentData(db, row.doc_type, row.id, data);
    });
  });
  tx();
  db.exec("DROP TABLE documents_legacy_json");
};

const migrateClientFieldsToColumns = (db) => {
  if (!tableExists(db, "client_fields")) return;
  const fieldRowCount = db.prepare("SELECT COUNT(1) AS count FROM client_fields").get()?.count || 0;
  if (fieldRowCount <= 0) return;
  const rows = db
    .prepare("SELECT id, type, name, legacy_path, created_at, updated_at FROM clients")
    .all();
  const update = db.prepare(
    `
    UPDATE clients SET
      name = ?,
      client_type = ?,
      benefit = ?,
      account = ?,
      account_normalized = ?,
      vat = ?,
      identifiant_fiscal = ?,
      cin = ?,
      passport = ?,
      steg_ref = ?,
      phone = ?,
      email = ?,
      address = ?,
      sold_client = ?,
      search_text = ?,
      updated_at = ?
    WHERE id = ?
  `
  );
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      const data = loadFieldRows(db, "client_fields", "client_id", row.id);
      const normalized = normalizeClientRecord(data);
      const accountValue = normalizeAccountValue(normalized.account);
      const searchText = buildSearchText([
        normalized.name,
        normalized.benefit,
        normalized.account,
        normalized.vat,
        normalized.identifiantFiscal,
        normalized.cin,
        normalized.passport,
        normalized.stegRef,
        normalized.phone,
        normalized.email,
        normalized.address,
        normalized.soldClient
      ]);
      const nameValue = row.name || normalized.name || "client";
      update.run(
        nameValue,
        normalized.clientType || null,
        normalized.benefit || null,
        normalized.account || null,
        accountValue || null,
        normalized.vat || null,
        normalized.identifiantFiscal || null,
        normalized.cin || null,
        normalized.passport || null,
        normalized.stegRef || null,
        normalized.phone || null,
        normalized.email || null,
        normalized.address || null,
        normalized.soldClient || null,
        searchText || null,
        row.updated_at || new Date().toISOString(),
        row.id
      );
    });
  });
  tx();
  db.exec("DELETE FROM client_fields");
};

const migrateArticleFieldsToColumns = (db) => {
  if (!tableExists(db, "article_fields")) return;
  const fieldRowCount = db.prepare("SELECT COUNT(1) AS count FROM article_fields").get()?.count || 0;
  if (fieldRowCount <= 0) return;
  const rows = db
    .prepare("SELECT id, name, legacy_path, created_at, updated_at FROM articles")
    .all();
  const update = db.prepare(
    `
    UPDATE articles SET
      name = ?,
      ref = ?,
      product = ?,
      desc = ?,
      qty = ?,
      stock_qty = ?,
      stock_min = ?,
      stock_alert = ?,
      unit = ?,
      purchase_price = ?,
      purchase_tva = ?,
      price = ?,
      tva = ?,
      discount = ?,
      fodec_enabled = ?,
      fodec_label = ?,
      fodec_rate = ?,
      fodec_tva = ?,
      purchase_fodec_enabled = ?,
      purchase_fodec_label = ?,
      purchase_fodec_rate = ?,
      purchase_fodec_tva = ?,
      use_ref = ?,
      use_product = ?,
      use_desc = ?,
      use_unit = ?,
      use_price = ?,
      use_fodec = ?,
      use_tva = ?,
      use_discount = ?,
      use_total_ht = ?,
      use_total_ttc = ?,
      search_text = ?,
      ref_normalized = ?,
      product_normalized = ?,
      desc_normalized = ?,
      updated_at = ?
    WHERE id = ?
  `
  );
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      const data = loadFieldRows(db, "article_fields", "article_id", row.id);
      const normalized = normalizeArticleRecord(data);
      const use = normalized.use;
      update.run(
        row.name || normalized.ref || normalized.product || normalized.desc || "article",
        normalized.ref,
        normalized.product,
        normalized.desc,
        normalized.qty,
        normalized.stockQty,
        normalized.stockMin,
        normalizeDbBool(normalized.stockAlert),
        normalized.unit,
        normalized.purchasePrice,
        normalized.purchaseTva,
        normalized.price,
        normalized.tva,
        normalized.discount,
        normalizeDbBool(normalized.fodec?.enabled),
        normalizeTextValue(normalized.fodec?.label || "FODEC"),
        Number(normalized.fodec?.rate || 0),
        Number(normalized.fodec?.tva || 0),
        normalizeDbBool(normalized.purchaseFodec?.enabled),
        normalizeTextValue(normalized.purchaseFodec?.label || "FODEC ACHAT"),
        Number(normalized.purchaseFodec?.rate || 0),
        Number(normalized.purchaseFodec?.tva || 0),
        resolveArticleUseFlag(use, "ref"),
        resolveArticleUseFlag(use, "product"),
        resolveArticleUseFlag(use, "desc"),
        resolveArticleUseFlag(use, "unit"),
        resolveArticleUseFlag(use, "price"),
        resolveArticleUseFlag(use, "fodec"),
        resolveArticleUseFlag(use, "tva"),
        resolveArticleUseFlag(use, "discount"),
        resolveArticleUseFlag(use, "totalHt"),
        resolveArticleUseFlag(use, "totalTtc"),
        buildArticleSearchText(normalized),
        normalizeArticleField(normalized.ref),
        normalizeArticleField(normalized.product),
        normalizeArticleField(normalized.desc),
        row.updated_at || new Date().toISOString(),
        row.id
      );
    });
  });
  tx();
  db.exec("DELETE FROM article_fields");
};

const migrateDocumentFieldsToColumns = (db) => {
  if (!tableExists(db, "document_fields")) return;
  const fieldRowCount = db.prepare("SELECT COUNT(1) AS count FROM document_fields").get()?.count || 0;
  if (fieldRowCount <= 0) return;
  const rows = db
    .prepare("SELECT id, doc_type, number, note_interne FROM documents")
    .all();
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      const data = loadFieldRows(db, "document_fields", "document_id", row.id);
      if (!data || typeof data !== "object") return;
      if (typeof row.note_interne === "string" && row.note_interne.trim()) {
        if (!data.meta || typeof data.meta !== "object") data.meta = {};
        data.meta.noteInterne = data.meta.noteInterne || row.note_interne;
      }
      const docType = row.doc_type || data.meta?.docType || "facture";
      const legacyStatus = resolveLegacyStatusFromData(data);
      const convertedFromStorage = resolveConvertedFromForStorage(data);
      if (legacyStatus) {
        db.prepare("UPDATE documents SET status = ? WHERE id = ?").run(legacyStatus, row.id);
      }
      db
        .prepare(
          "UPDATE documents SET converted_from_type = ?, converted_from_id = ?, converted_from_number = ? WHERE id = ?"
        )
        .run(
          convertedFromStorage.type,
          convertedFromStorage.id,
          convertedFromStorage.number,
          row.id
        );
      saveDocumentData(db, docType, row.id, data);
    });
  });
  tx();
  db.exec("DELETE FROM document_fields");
};

const migrateLegacyModels = (db) => {
  if (!tableHasColumn(db, "models", "data")) return;
  const legacyRows = db
    .prepare("SELECT name, data, created_at, updated_at FROM models")
    .all();
  db.exec("ALTER TABLE models RENAME TO models_legacy_json");
  ensureSchemaTables(db, ["models", "model_fields"]);
  const insertModel = db.prepare(
    `
    INSERT INTO models (name, created_at, updated_at)
    VALUES (?, ?, ?)
  `
  );
  const tx = db.transaction(() => {
    legacyRows.forEach((row) => {
      const dataRaw = parseJsonSafeForMigration(row.data);
      const data = dataRaw && typeof dataRaw === "object" ? dataRaw : {};
      insertModel.run(row.name, row.created_at, row.updated_at);
      replaceFieldRows(db, "model_fields", "model_name", row.name, data);
    });
  });
  tx();
  db.exec("DROP TABLE models_legacy_json");
};

const migrateLegacyAppSettings = (db) => {
  if (!tableHasColumn(db, "app_settings", "value")) return;
  const legacyRows = db
    .prepare("SELECT key, value, updated_at FROM app_settings")
    .all();
  db.exec("ALTER TABLE app_settings RENAME TO app_settings_legacy_json");
  ensureSchemaTables(db, ["app_settings", "app_setting_fields"]);
  const insertSetting = db.prepare(
    `
    INSERT INTO app_settings (key, updated_at)
    VALUES (?, ?)
  `
  );
  const tx = db.transaction(() => {
    legacyRows.forEach((row) => {
      const value = parseJsonSafeForMigration(row.value);
      const payload = value === undefined ? null : value;
      insertSetting.run(row.key, row.updated_at);
      replaceFieldRows(db, "app_setting_fields", "setting_key", row.key, payload);
    });
  });
  tx();
  db.exec("DROP TABLE app_settings_legacy_json");
};

const migrateDocumentNumbering = (db) => {
  try {
    db.prepare(
      "UPDATE documents SET period = substr(period, 3) WHERE length(period) = 7 AND period GLOB '????-??'"
    ).run();
    const missingIdx = db.prepare("SELECT id, number FROM documents WHERE idx IS NULL").all();
    if (missingIdx.length) {
      const updateIdx = db.prepare("UPDATE documents SET idx = ? WHERE id = ?");
      const updateTx = db.transaction((rows) => {
        rows.forEach((row) => {
          const parsed = parseNumericSuffix(row.number);
          if (parsed !== null) updateIdx.run(parsed, row.id);
        });
      });
      updateTx(missingIdx);
    }
  } catch (err) {
    console.warn("documents migration failed", err);
  }
};

const runLegacyDataMigrations = (db) => {
  try {
    migrateLegacyClients(db);
    migrateLegacyArticles(db);
    migrateLegacyDocuments(db);
    migrateClientFieldsToColumns(db);
    migrateArticleFieldsToColumns(db);
    migrateDocumentFieldsToColumns(db);
    migrateLegacyModels(db);
    migrateLegacyAppSettings(db);
    migrateDocumentNumbering(db);
    runClientBalanceRebuildMigration(db);
    renumberPaymentHistory(db);
  } catch (err) {
    console.warn("schema migration failed", err);
  }
};

const normalizeClientEntityType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "vendor" ||
    normalized === "vendedor" ||
    normalized === "fournisseur" ||
    normalized === "fournisseurs" ||
    normalized === "vendors"
  ) {
    return "vendor";
  }
  return "client";
};

const normalizeClientProfileType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "particulier" || normalized === "personne_physique") return "particulier";
  if (normalized === "societe" || normalized === "societes") return "societe";
  return normalized;
};

const buildSearchText = (values = []) =>
  values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase())
    .join(" ");

const normalizeTextValue = (value) => String(value ?? "").trim();

const normalizeDbBool = (value) => (value ? 1 : 0);

const normalizeOptionalBool = (value) => (value === undefined || value === null ? null : (value ? 1 : 0));

const parseLooseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === undefined || value === null) return null;

  const raw = String(value).replace(/\u00A0/g, " ").trim();
  if (!raw) return null;

  const wrappedNegative = /^\(.*\)$/.test(raw);
  const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
  const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;

  const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
  const unsigned = cleaned.replace(/[+\-]/g, "");
  if (!unsigned || !/[0-9]/.test(unsigned)) return null;

  const commaCount = (unsigned.match(/,/g) || []).length;
  const dotCount = (unsigned.match(/\./g) || []).length;
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  let decimalSep = "";
  if (commaCount > 0 && dotCount > 0) {
    decimalSep = lastComma > lastDot ? "," : ".";
  } else if (commaCount === 1 && dotCount === 0) {
    decimalSep = ",";
  } else if (dotCount === 1 && commaCount === 0) {
    decimalSep = ".";
  }

  let normalized = "";
  if (decimalSep) {
    const sepIndex = unsigned.lastIndexOf(decimalSep);
    const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
    const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
    normalized = fracPart ? `${intPart || "0"}.${fracPart}` : (intPart || "0");
  } else {
    normalized = unsigned.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return sign * parsed;
};

const normalizeOptionalNumber = (value) => {
  const num = parseLooseNumber(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeOptionalText = (value) => {
  const text = normalizeTextValue(value);
  return text ? text : null;
};

const normalizeAccountValue = (value) => String(value || "").trim().toLowerCase();

const parseBalanceValue = (value) => {
  const cleaned = String(value ?? "").replace(",", ".").trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const formatBalanceValue = (value, precision = 3) => {
  if (!Number.isFinite(value)) return "";
  const scale = Math.pow(10, precision);
  const rounded = Math.round((value + Number.EPSILON) * scale) / scale;
  let text = rounded.toFixed(precision);
  text = text.replace(/\.?0+$/, "");
  return text;
};

const normalizeClientBalanceValue = (value, precision = 2) => {
  const num = parseBalanceValue(value);
  const normalizedPrecision = Math.max(0, Math.min(6, Math.trunc(Number(precision) || 0)));
  return num.toFixed(normalizedPrecision);
};

const getClientFactureCounts = (clientIds = [], dbInstance) => {
  const ids = Array.isArray(clientIds)
    ? clientIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return new Map();
  const db = dbInstance || initDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT client_id, COUNT(*) AS count FROM ${CLIENT_BALANCE_DOC_TABLE} WHERE client_id IN (${placeholders}) GROUP BY client_id`
    )
    .all(...ids);
  const counts = new Map();
  rows.forEach((row) => {
    const key = String(row?.client_id || "").trim();
    if (!key) return;
    const value = Number(row?.count);
    counts.set(key, Number.isFinite(value) ? value : 0);
  });
  return counts;
};

const applyClientFactureCounts = (records = [], dbInstance) => {
  if (!Array.isArray(records) || !records.length) return records;
  const ids = records.map((record) => String(record?.id || "").trim()).filter(Boolean);
  if (!ids.length) return records;
  const counts = getClientFactureCounts(ids, dbInstance);
  records.forEach((record) => {
    if (!record || !record.id) return;
    const client =
      record.client && typeof record.client === "object" ? record.client : record;
    const count = counts.get(String(record.id)) ?? 0;
    record.factureCount = count;
    if (client && typeof client === "object") {
      client.factureCount = count;
    }
  });
  return records;
};

const buildClientIdentifier = (client = {}) => {
  const candidate =
    client.vat ||
    client.identifiantFiscal ||
    client.cin ||
    client.id ||
    client.identifiant ||
    client.nif ||
    client.passeport ||
    client.passport ||
    client.email ||
    "";
  return String(candidate || "").trim();
};

const normalizeClientRecord = (client = {}) => ({
  clientType: normalizeClientProfileType(client.type),
  name: normalizeTextValue(client.name || client.company),
  benefit: normalizeTextValue(client.benefit),
  account: normalizeTextValue(client.account || client.accountOf),
  vat: normalizeTextValue(client.vat),
  identifiantFiscal: normalizeTextValue(client.identifiantFiscal),
  cin: normalizeTextValue(client.cin),
  passport: normalizeTextValue(client.passport || client.passeport),
  stegRef: normalizeTextValue(client.stegRef),
  phone: normalizeTextValue(client.phone || client.telephone || client.tel),
  email: normalizeTextValue(client.email),
  address: normalizeTextValue(client.address),
  soldClient: normalizeClientBalanceValue(client.soldClient)
});

const normalizeArticleField = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeArticleUse = (raw = {}) => {
  if (!raw || typeof raw !== "object") return null;
  const result = {};
  let hasAny = false;
  ["ref", "product", "desc", "unit", "price", "fodec", "tva", "discount", "totalHt", "totalTtc"].forEach(
    (key) => {
      if (typeof raw[key] === "boolean") {
        result[key] = raw[key];
        hasAny = true;
      }
    }
  );
  return hasAny ? result : null;
};

const buildArticleSearchText = (article = {}) => {
  const parts = [article.name, article.ref, article.product, article.desc].map((value) =>
    typeof value === "string" ? value.trim().toLowerCase() : ""
  );
  return parts.filter(Boolean).join(" ");
};

const generateId = (prefix) => {
  const base = String(prefix || "item").replace(/[^a-zA-Z0-9]+/g, "");
  return `${base || "item"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeDocType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "facture";
  if (normalized === "fact" || normalized === "facture") return "facture";
  if (normalized === "fa" || normalized === "factureachat" || normalized === "facture-achat") return "fa";
  if (
    [
      "be",
      "bonentree",
      "bon_entree",
      "bon-entree",
      "bon entree",
      "bon d'entree",
      "bon d'entr\u00e9e"
    ].includes(normalized)
  ) {
    return "be";
  }
  if (
    ["bs", "bonsortie", "bon_sortie", "bon-sortie", "bon sortie", "bon de sortie"].includes(normalized)
  ) {
    return "bs";
  }
  if (
    [
      "avoir",
      "factureavoir",
      "facture_avoir",
      "facture-avoir",
      "facture avoir",
      "facture d'avoir",
      "facture davoir"
    ].includes(normalized)
  ) {
    return "avoir";
  }
  if (normalized === "devis" || normalized === "dev") return "devis";
  if (normalized === "bl" || normalized === "bonlivraison" || normalized === "bon-livraison") return "bl";
  if (normalized === "bc" || normalized === "boncommande" || normalized === "bon-commande") return "bc";
  if (normalized === "retenue" || normalized === "wh" || normalized === "rt") return "retenue";
  return normalized;
};

const resolveDocTableName = (docType) => {
  const normalized = normalizeDocType(docType);
  return DOC_TYPE_TABLES[normalized] || DOC_TYPE_TABLES.facture;
};

const resolveDocItemsTableName = (docType) => {
  const normalized = normalizeDocType(docType);
  return DOC_ITEM_TABLES[normalized] || DOC_ITEM_TABLES.facture;
};

const normalizeDocumentStatus = (value) => {
  const trimmed = String(value || "").trim().toLowerCase();
  if (trimmed === "annule") return "brouillon";
  return trimmed || null;
};

const normalizeConvertedFromPayload = (value) => {
  if (!value || typeof value !== "object") return null;
  const rawType = value.docType ?? value.type;
  const type = normalizeDocType(rawType);
  const id = normalizeOptionalText(value.id ?? value.documentId ?? value.rowid);
  const numberRaw = normalizeOptionalText(value.number);
  const path = normalizeOptionalText(value.path);
  const date = normalizeOptionalText(value.date);
  const numberFromPath = (() => {
    const parsedDbPath = parseDocumentNumberFromPath(path);
    if (parsedDbPath) return normalizeOptionalText(parsedDbPath);
    const normalizedPath = String(path || "").replace(/\\/g, "/");
    const filename = normalizedPath.split("/").filter(Boolean).pop() || "";
    if (!filename) return null;
    const dotIndex = filename.lastIndexOf(".");
    const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
    return normalizeOptionalText(base);
  })();
  const number = numberRaw || numberFromPath;
  if (!type && !id && !number && !path && !date) return null;
  const normalized = {};
  if (type) {
    normalized.type = type;
    normalized.docType = type;
  }
  if (id) normalized.id = id;
  if (number) normalized.number = number;
  if (path) normalized.path = path;
  if (date) normalized.date = date;
  return normalized;
};

const resolveConvertedFromForStorage = (payload = {}) => {
  const target = payload && typeof payload === "object" ? payload : {};
  const meta = target.meta && typeof target.meta === "object" ? target.meta : {};
  const normalized = normalizeConvertedFromPayload(meta.convertedFrom || target.convertedFrom);
  return {
    convertedFrom: normalized,
    type: normalized?.type || null,
    id: normalized?.id || null,
    number: normalized?.number || null
  };
};

const resolveLegacyStatusFromData = (data) => {
  if (!data || typeof data !== "object") return null;
  const target =
    data.data && typeof data.data === "object"
      ? data.data
      : data;
  const meta = target.meta && typeof target.meta === "object" ? target.meta : null;
  if (!meta) return null;
  return normalizeDocumentStatus(meta.status ?? meta.historyStatus);
};

const normalizeNumberLength = (value, fallback = 4) => {
  const num = Number(value);
  if (VALID_NUMBER_LENGTHS.includes(num)) return num;
  const fb = Number(fallback);
  return VALID_NUMBER_LENGTHS.includes(fb) ? fb : 4;
};

const normalizeNumberFormat = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
  const raw = String(value || "").trim().toLowerCase();
  if (NUMBER_FORMATS.has(raw)) return raw;
  const fb = String(fallback || "").trim().toLowerCase();
  return NUMBER_FORMATS.has(fb) ? fb : NUMBER_FORMAT_DEFAULT;
};

const resolveNumberPrefix = (value, docType) => {
  const trimmed = String(value || "").trim();
  if (trimmed) return trimmed.replace(/\s+/g, "");
  const normalized = normalizeDocType(docType);
  if (DOC_TYPE_PREFIX[normalized]) return DOC_TYPE_PREFIX[normalized];
  if (normalized && /^[a-z]/i.test(normalized)) {
    const cleaned = normalized.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
    return cleaned || "DOC";
  }
  return "DOC";
};

const normalizeDocPeriod = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{2,4})-(\d{1,2})$/);
  if (!match) return trimmed;
  const year = match[1].slice(-2);
  const month = match[2].padStart(2, "0");
  return `${year}-${month}`;
};

const resolveDocPeriod = (dateLike) => {
  const parsedRaw = dateLike ? new Date(dateLike) : new Date();
  const parsed = Number.isFinite(parsedRaw.getTime()) ? parsedRaw : new Date();
  const year = String(parsed.getFullYear()).slice(-2);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return normalizeDocPeriod(`${year}-${month}`);
};

const parseNumericSuffix = (value) => {
  const match = String(value ?? "").match(/(\d+)\s*$/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
};

const formatDocumentNumber = ({ docType, period, counter, length, prefix, numberFormat } = {}) => {
  const normalizedDocType = normalizeDocType(docType);
  const normalizedLength = normalizeNumberLength(length, 4);
  const normalizedFormat = normalizeNumberFormat(numberFormat, NUMBER_FORMAT_DEFAULT);
  const usePrefix = normalizedFormat !== "counter";
  const useDate = normalizedFormat === "prefix_date_counter";
  const safePrefix = usePrefix ? resolveNumberPrefix(prefix, normalizedDocType) : "";
  const rawSuffix = String(Number.isFinite(counter) && counter > 0 ? Math.trunc(counter) : 1);
  const suffix = rawSuffix.length > normalizedLength ? rawSuffix.slice(-normalizedLength) : rawSuffix;
  const counterValue = suffix || "1";
  if (!useDate) {
    const padded = counterValue.padStart(normalizedLength, "0");
    return usePrefix ? `${safePrefix}_${padded}` : padded;
  }
  const parts = String(period || resolveDocPeriod()).split("-");
  const year = parts[0] || String(new Date().getFullYear());
  const month = parts[1] || String(new Date().getMonth() + 1).padStart(2, "0");
  const shortYear = year.slice(-2);
  return `${safePrefix}_${shortYear}-${month}-${counterValue}`;
};

const formatClientPath = (id) => `${CLIENT_PATH_PREFIX}${id}`;
const formatDepotPath = (id) => `${DEPOT_PATH_PREFIX}${id}`;
const formatArticlePath = (id) => `${ARTICLE_PATH_PREFIX}${id}`;
const formatDocumentPath = (number) => `${DOCUMENT_PATH_PREFIX}${String(number || "").trim()}`;

const parseClientIdFromPath = (value) => {
  if (typeof value !== "string") return null;
  if (value.startsWith(CLIENT_PATH_PREFIX)) return value.slice(CLIENT_PATH_PREFIX.length);
  return null;
};

const parseDepotIdFromPath = (value) => {
  if (typeof value !== "string") return null;
  if (value.startsWith(DEPOT_PATH_PREFIX)) return value.slice(DEPOT_PATH_PREFIX.length);
  return null;
};

const parseArticleIdFromPath = (value) => {
  if (typeof value !== "string") return null;
  if (value.startsWith(ARTICLE_PATH_PREFIX)) return value.slice(ARTICLE_PATH_PREFIX.length);
  return null;
};

const parseDocumentNumberFromPath = (value) => {
  if (typeof value !== "string") return null;
  if (value.startsWith(DOCUMENT_PATH_PREFIX)) return value.slice(DOCUMENT_PATH_PREFIX.length);
  return null;
};

let depotMagasinRepository = null;

const getDepotMagasinRepository = () => {
  if (!depotMagasinRepository) {
    depotMagasinRepository = createDepotMagasinRepository({
      getDb: initDatabase,
      generateId,
      parseDepotIdFromPath,
      formatDepotPath
    });
  }
  return depotMagasinRepository;
};

const normalizeDocumentItem = (item = {}, position = 0, { docType = "" } = {}) => {
  const source = item && typeof item === "object" ? item : {};
  const fodec = source.fodec && typeof source.fodec === "object" ? source.fodec : {};
  const purchaseFodec =
    source.purchaseFodec && typeof source.purchaseFodec === "object" ? source.purchaseFodec : {};
  const salesPrice = normalizeOptionalNumber(source.price) ?? 0;
  const salesTva = normalizeOptionalNumber(source.tva) ?? 0;
  const normalizedPurchasePrice = normalizeOptionalNumber(
    source.purchasePrice ??
      source.purchase_price ??
      source.buyPrice ??
      source.buy_price ??
      source.prixAchat ??
      source.prix_achat ??
      source.purchaseHt
  );
  const normalizedPurchaseTva = normalizeOptionalNumber(
    source.purchaseTva ??
      source.purchase_tva ??
      source.buyTva ??
      source.buy_tva ??
      source.tvaAchat ??
      source.tva_achat ??
      source.purchaseVat
  );
  const purchasePrice = normalizedPurchasePrice ?? 0;
  const purchaseTva = normalizedPurchaseTva ?? 0;
  const articlePath =
    (typeof source.__articlePath === "string" && source.__articlePath.trim()) ||
    (typeof source.path === "string" && source.path.trim()) ||
    "";
  return {
    position,
    ref: normalizeTextValue(source.ref),
    product: normalizeTextValue(source.product),
    desc: normalizeTextValue(source.desc),
    qty: normalizeOptionalNumber(source.qty) ?? 0,
    unit: normalizeTextValue(source.unit),
    purchasePrice,
    purchaseTva,
    price: salesPrice,
    tva: salesTva,
    discount: normalizeOptionalNumber(source.discount) ?? 0,
    fodecEnabled: normalizeDbBool(fodec.enabled),
    fodecLabel: normalizeTextValue(fodec.label || "FODEC"),
    fodecRate: normalizeOptionalNumber(fodec.rate) ?? 0,
    fodecTva: normalizeOptionalNumber(fodec.tva) ?? 0,
    purchaseFodecEnabled: normalizeOptionalBool(
      purchaseFodec.enabled ??
        source.purchaseFodecEnabled ??
        source.purchase_fodec_enabled ??
        false
    ),
    purchaseFodecLabel: normalizeTextValue(
      purchaseFodec.label ||
        source.purchaseFodecLabel ||
        source.purchase_fodec_label ||
        "" ||
        "FODEC ACHAT"
    ),
    purchaseFodecRate:
      normalizeOptionalNumber(
        purchaseFodec.rate ??
          source.purchaseFodecRate ??
          source.purchase_fodec_rate ??
          0
      ) ?? 0,
    purchaseFodecTva:
      normalizeOptionalNumber(
        purchaseFodec.tva ??
          source.purchaseFodecTva ??
          source.purchase_fodec_tva ??
          0
      ) ?? 0,
    articlePath
  };
};

const DOCUMENT_COLUMN_DEFAULTS = {
  ref: true,
  product: true,
  desc: false,
  qty: true,
  unit: true,
  stockQty: true,
  purchasePrice: false,
  purchaseTva: false,
  price: true,
  fodec: true,
  fodecSale: true,
  fodecPurchase: false,
  addFodec: true,
  tva: true,
  discount: true,
  totalPurchaseHt: false,
  totalPurchaseTtc: false,
  totalHt: true,
  totalTtc: true
};

const normalizeDocumentColumnState = (
  rawColumns = {},
  { docType = "facture", taxesEnabled = true } = {}
) => {
  const source = rawColumns && typeof rawColumns === "object" ? rawColumns : {};
  const normalizedDocType = normalizeDocType(docType);
  const isPurchaseContext = normalizedDocType === "fa";
  const normalized = {};
  Object.entries(DOCUMENT_COLUMN_DEFAULTS).forEach(([key, fallback]) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) normalized[key] = !!source[key];
    else normalized[key] = fallback;
  });
  const hasLegacyFodec = Object.prototype.hasOwnProperty.call(source, "fodec");
  const hasFodecSale = Object.prototype.hasOwnProperty.call(source, "fodecSale");
  const hasFodecPurchase = Object.prototype.hasOwnProperty.call(source, "fodecPurchase");
  const legacyFodecValue = hasLegacyFodec ? !!source.fodec : normalized.fodec;

  normalized.fodecSale = hasFodecSale
    ? !!source.fodecSale
    : (isPurchaseContext ? false : legacyFodecValue);
  normalized.fodecPurchase = hasFodecPurchase
    ? !!source.fodecPurchase
    : (isPurchaseContext ? legacyFodecValue : false);

  if (!normalized.price) {
    normalized.tva = false;
    normalized.fodecSale = false;
    normalized.totalHt = false;
    normalized.totalTtc = false;
  }
  if (!normalized.purchasePrice) {
    normalized.purchaseTva = false;
    normalized.fodecPurchase = false;
    normalized.totalPurchaseHt = false;
    normalized.totalPurchaseTtc = false;
  }
  if (!taxesEnabled) {
    normalized.tva = false;
    normalized.purchaseTva = false;
    normalized.fodecSale = false;
    normalized.fodecPurchase = false;
    normalized.totalPurchaseTtc = false;
    normalized.totalTtc = false;
  }

  normalized.fodec = isPurchaseContext ? normalized.fodecPurchase : normalized.fodecSale;
  normalized.purchaseDependenciesLocked = !normalized.purchasePrice;
  return normalized;
};

const normalizeDocumentPayload = (payload = {}, { docType = "" } = {}) => {
  const data = payload && typeof payload === "object" ? payload : {};
  const company = data.company && typeof data.company === "object" ? data.company : {};
  const client = data.client && typeof data.client === "object" ? data.client : {};
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {};
  const normalizedDocType = normalizeDocType(meta.docType || docType || "facture");
  const totals = data.totals && typeof data.totals === "object" ? data.totals : {};
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const notes = typeof data.notes === "string" ? data.notes : "";
  const schemaVersion = normalizeOptionalNumber(data._schemaVersion);
  const seal = company.seal && typeof company.seal === "object" ? company.seal : {};
  const signature = company.signature && typeof company.signature === "object" ? company.signature : {};
  const clientPath = typeof client.__path === "string" ? client.__path.trim() : "";
  const clientId = parseClientIdFromPath(clientPath) || "";
  const reglement = meta.reglement && typeof meta.reglement === "object" ? meta.reglement : {};
  const wh = meta.withholding && typeof meta.withholding === "object" ? meta.withholding : {};
  const financing = meta.financing && typeof meta.financing === "object" ? meta.financing : {};
  const subvention = financing.subvention && typeof financing.subvention === "object" ? financing.subvention : {};
  const bank = financing.bank && typeof financing.bank === "object" ? financing.bank : {};
  const extras = meta.extras && typeof meta.extras === "object" ? meta.extras : {};
  const shipping = extras.shipping && typeof extras.shipping === "object" ? extras.shipping : {};
  const stamp = extras.stamp && typeof extras.stamp === "object" ? extras.stamp : {};
  const dossier = extras.dossier && typeof extras.dossier === "object" ? extras.dossier : {};
  const deplacement = extras.deplacement && typeof extras.deplacement === "object" ? extras.deplacement : {};
  const pdf = extras.pdf && typeof extras.pdf === "object" ? extras.pdf : {};
  const addForm = meta.addForm && typeof meta.addForm === "object" ? meta.addForm : {};
  const addFormFodec = addForm.fodec && typeof addForm.fodec === "object" ? addForm.fodec : {};
  const columns = meta.columns && typeof meta.columns === "object" ? meta.columns : {};
  const modelColumns =
    meta.modelColumns && typeof meta.modelColumns === "object" ? meta.modelColumns : {};
  const savedColumns = Object.keys(modelColumns).length ? modelColumns : columns;
  const labels =
    meta.articleFieldLabels && typeof meta.articleFieldLabels === "object"
      ? meta.articleFieldLabels
      : {};
  const normalizedColumns = normalizeDocumentColumnState(savedColumns, {
    docType: normalizedDocType,
    taxesEnabled: meta.taxesEnabled !== false
  });
  const fodecSaleColumn = normalizedColumns.fodecSale;
  const fodecPurchaseColumn = normalizedColumns.fodecPurchase;
  const contextualFodecColumn = normalizedColumns.fodec;
  const resolvedSaleFodecLabel =
    (typeof labels.fodecAmount === "string" && labels.fodecAmount.trim()) ||
    (typeof labels.fodecSale === "string" && labels.fodecSale.trim()) ||
    (typeof labels.fodec === "string" && labels.fodec.trim()) ||
    "";
  const resolvedPurchaseFodecLabel =
    (typeof labels.purchaseFodecAmount === "string" && labels.purchaseFodecAmount.trim()) ||
    (typeof labels.fodecPurchase === "string" && labels.fodecPurchase.trim()) ||
    (typeof labels.fodec === "string" && labels.fodec.trim()) ||
    "";
  const contextualFodecLabel =
    (typeof labels.fodec === "string" && labels.fodec.trim()) ||
    (normalizedDocType === "fa" ? resolvedPurchaseFodecLabel : resolvedSaleFodecLabel);
  const totalsAcompte = totals.acompte && typeof totals.acompte === "object" ? totals.acompte : {};
  const totalsFin = totals.financing && typeof totals.financing === "object" ? totals.financing : {};
  const totalsExtras = totals.extras && typeof totals.extras === "object" ? totals.extras : {};
  const tvaBreakdown = Array.isArray(totals.tvaBreakdown) ? totals.tvaBreakdown : [];
  const fodecBreakdown = Array.isArray(totalsExtras.fodecBreakdown) ? totalsExtras.fodecBreakdown : [];
  const row = {
    number: normalizeOptionalText(meta.number),
    company_name: normalizeOptionalText(company.name),
    company_type: normalizeOptionalText(company.type),
    company_vat: normalizeOptionalText(company.vat),
    company_customs_code: normalizeOptionalText(company.customsCode),
    company_iban: normalizeOptionalText(company.iban),
    company_phone: normalizeOptionalText(company.phone),
    company_fax: normalizeOptionalText(company.fax),
    company_email: normalizeOptionalText(company.email),
    company_address: normalizeOptionalText(company.address),
    company_logo: normalizeOptionalText(company.logo),
    company_logo_path: normalizeOptionalText(company.logoPath),
    company_seal_enabled: normalizeOptionalBool(seal.enabled),
    company_seal_image: normalizeOptionalText(seal.image),
    company_seal_max_width_mm: normalizeOptionalNumber(seal.maxWidthMm),
    company_seal_max_height_mm: normalizeOptionalNumber(seal.maxHeightMm),
    company_seal_opacity: normalizeOptionalNumber(seal.opacity),
    company_seal_rotate_deg: normalizeOptionalNumber(seal.rotateDeg),
    company_signature_enabled: normalizeOptionalBool(signature.enabled),
    company_signature_image: normalizeOptionalText(signature.image),
    company_signature_max_width_mm: normalizeOptionalNumber(signature.maxWidthMm),
    company_signature_max_height_mm: normalizeOptionalNumber(signature.maxHeightMm),
    company_signature_opacity: normalizeOptionalNumber(signature.opacity),
    company_signature_rotate_deg: normalizeOptionalNumber(signature.rotateDeg),
    client_path: normalizeOptionalText(clientPath),
    client_id: normalizeOptionalText(clientId),
    client_type: normalizeOptionalText(client.type),
    client_name: normalizeOptionalText(client.name),
    client_benefit: normalizeOptionalText(client.benefit),
    client_account: normalizeOptionalText(client.account || client.accountOf),
    client_vat: normalizeOptionalText(client.vat),
    client_identifiant_fiscal: normalizeOptionalText(client.identifiantFiscal),
    client_cin: normalizeOptionalText(client.cin),
    client_passport: normalizeOptionalText(client.passport || client.passeport),
    client_steg_ref: normalizeOptionalText(client.stegRef),
    client_phone: normalizeOptionalText(client.phone || client.telephone || client.tel),
    client_email: normalizeOptionalText(client.email),
    client_address: normalizeOptionalText(client.address),
    meta_number: normalizeOptionalText(meta.number),
    meta_currency: normalizeOptionalText(meta.currency),
    meta_date: normalizeOptionalText(meta.date),
    meta_due: normalizeOptionalText(meta.due),
    meta_doc_type: normalizeOptionalText(meta.docType || normalizedDocType),
    meta_stock_adjusted: normalizeOptionalBool(meta.stockAdjusted),
    meta_number_length: normalizeOptionalNumber(meta.numberLength),
    meta_number_format: normalizeOptionalText(meta.numberFormat),
    meta_number_prefix: normalizeOptionalText(meta.numberPrefix),
    meta_items_header_color: normalizeOptionalText(meta.itemsHeaderColor),
    meta_template: normalizeOptionalText(meta.template),
    meta_model_name: normalizeOptionalText(meta.documentModelName || meta.modelName),
    meta_model_key: normalizeOptionalText(meta.modelKey || meta.documentModelName || meta.modelName),
    meta_pdf_show_seal: normalizeOptionalBool(pdf.showSeal),
    meta_pdf_show_signature: normalizeOptionalBool(pdf.showSignature),
    meta_pdf_show_amount_words: normalizeOptionalBool(pdf.showAmountWords),
    meta_pdf_footer_note: normalizeOptionalText(pdf.footerNote),
    meta_pdf_footer_note_size: normalizeOptionalNumber(pdf.footerNoteSize),
    meta_taxes_enabled: normalizeOptionalBool(meta.taxesEnabled),
    meta_note_interne: normalizeOptionalText(meta.noteInterne),
    meta_reglement_enabled: normalizeOptionalBool(meta.reglementEnabled ?? reglement.enabled),
    meta_reglement_type: normalizeOptionalText(meta.reglementType ?? reglement.type),
    meta_reglement_days: normalizeOptionalNumber(meta.reglementDays ?? reglement.days),
    meta_reglement_text: normalizeOptionalText(meta.reglementText ?? reglement.text ?? reglement.valueText),
    meta_reglement_value: normalizeOptionalText(meta.reglementValue),
    meta_payment_method: normalizeOptionalText(meta.paymentMethod ?? meta.mode),
    meta_payment_reference: normalizeOptionalText(
      meta.paymentReference ?? meta.paymentRef
    ),
    meta_withholding_enabled: normalizeOptionalBool(wh.enabled),
    meta_withholding_rate: normalizeOptionalNumber(wh.rate),
    meta_withholding_base: normalizeOptionalText(wh.base),
    meta_withholding_label: normalizeOptionalText(wh.label),
    meta_withholding_threshold: normalizeOptionalNumber(wh.threshold),
    meta_withholding_note: normalizeOptionalText(wh.note),
    meta_acompte_enabled: normalizeOptionalBool(meta.acompte?.enabled),
    meta_acompte_paid: normalizeOptionalNumber(meta.acompte?.paid),
    meta_financing_subvention_enabled: normalizeOptionalBool(subvention.enabled),
    meta_financing_subvention_label: normalizeOptionalText(subvention.label),
    meta_financing_subvention_amount: normalizeOptionalNumber(subvention.amount),
    meta_financing_bank_enabled: normalizeOptionalBool(bank.enabled),
    meta_financing_bank_label: normalizeOptionalText(bank.label),
    meta_financing_bank_amount: normalizeOptionalNumber(bank.amount),
    meta_extras_shipping_enabled: normalizeOptionalBool(shipping.enabled),
    meta_extras_shipping_label: normalizeOptionalText(shipping.label),
    meta_extras_shipping_amount: normalizeOptionalNumber(shipping.amount),
    meta_extras_shipping_tva: normalizeOptionalNumber(shipping.tva),
    meta_extras_stamp_enabled: normalizeOptionalBool(stamp.enabled),
    meta_extras_stamp_label: normalizeOptionalText(stamp.label),
    meta_extras_stamp_amount: normalizeOptionalNumber(stamp.amount),
    meta_extras_dossier_enabled: normalizeOptionalBool(dossier.enabled),
    meta_extras_dossier_label: normalizeOptionalText(dossier.label),
    meta_extras_dossier_amount: normalizeOptionalNumber(dossier.amount),
    meta_extras_dossier_tva: normalizeOptionalNumber(dossier.tva),
    meta_extras_deplacement_enabled: normalizeOptionalBool(deplacement.enabled),
    meta_extras_deplacement_label: normalizeOptionalText(deplacement.label),
    meta_extras_deplacement_amount: normalizeOptionalNumber(deplacement.amount),
    meta_extras_deplacement_tva: normalizeOptionalNumber(deplacement.tva),
    meta_add_form_fodec_enabled: normalizeOptionalBool(addFormFodec.enabled),
    meta_add_form_fodec_label: normalizeOptionalText(addFormFodec.label),
    meta_add_form_fodec_rate: normalizeOptionalNumber(addFormFodec.rate),
    meta_add_form_fodec_tva: normalizeOptionalNumber(addFormFodec.tva),
    meta_add_form_purchase_tva: normalizeOptionalNumber(addForm.purchaseTva),
    meta_add_form_tva: normalizeOptionalNumber(addForm.tva),
    meta_col_ref: normalizeOptionalBool(normalizedColumns.ref),
    meta_col_product: normalizeOptionalBool(normalizedColumns.product),
    meta_col_desc: normalizeOptionalBool(normalizedColumns.desc),
    meta_col_qty: normalizeOptionalBool(normalizedColumns.qty),
    meta_col_unit: normalizeOptionalBool(normalizedColumns.unit),
    meta_col_stock_qty: normalizeOptionalBool(normalizedColumns.stockQty),
    meta_col_purchase_price: normalizeOptionalBool(normalizedColumns.purchasePrice),
    meta_col_purchase_tva: normalizeOptionalBool(normalizedColumns.purchaseTva),
    meta_col_price: normalizeOptionalBool(normalizedColumns.price),
    meta_col_fodec_sale: normalizeOptionalBool(fodecSaleColumn),
    meta_col_fodec_purchase: normalizeOptionalBool(fodecPurchaseColumn),
    meta_col_fodec: normalizeOptionalBool(contextualFodecColumn),
    meta_col_add_fodec: normalizeOptionalBool(normalizedColumns.addFodec),
    meta_col_tva: normalizeOptionalBool(normalizedColumns.tva),
    meta_col_discount: normalizeOptionalBool(normalizedColumns.discount),
    meta_col_total_purchase_ht: normalizeOptionalBool(normalizedColumns.totalPurchaseHt),
    meta_col_total_purchase_ttc: normalizeOptionalBool(normalizedColumns.totalPurchaseTtc),
    meta_col_purchase_dependencies_locked: normalizeOptionalBool(
      normalizedColumns.purchaseDependenciesLocked
    ),
    meta_col_total_ht: normalizeOptionalBool(normalizedColumns.totalHt),
    meta_col_total_ttc: normalizeOptionalBool(normalizedColumns.totalTtc),
    meta_article_label_ref: normalizeOptionalText(labels.ref),
    meta_article_label_product: normalizeOptionalText(labels.product),
    meta_article_label_desc: normalizeOptionalText(labels.desc),
    meta_article_label_qty: normalizeOptionalText(labels.qty),
    meta_article_label_unit: normalizeOptionalText(labels.unit),
    meta_article_label_stock_qty: normalizeOptionalText(labels.stockQty),
    meta_article_label_purchase_price: normalizeOptionalText(labels.purchasePrice),
    meta_article_label_purchase_tva: normalizeOptionalText(labels.purchaseTva),
    meta_article_label_price: normalizeOptionalText(labels.price),
    meta_article_label_tva: normalizeOptionalText(labels.tva),
    meta_article_label_discount: normalizeOptionalText(labels.discount),
    meta_article_label_fodec_sale: normalizeOptionalText(resolvedSaleFodecLabel),
    meta_article_label_fodec_purchase: normalizeOptionalText(resolvedPurchaseFodecLabel),
    meta_article_label_fodec: normalizeOptionalText(contextualFodecLabel),
    meta_article_label_fodec_rate: normalizeOptionalText(labels.fodecRate),
    meta_article_label_fodec_tva: normalizeOptionalText(labels.fodecTva),
    meta_article_label_fodec_amount: normalizeOptionalText(
      (typeof labels.fodecAmount === "string" && labels.fodecAmount.trim()) || resolvedSaleFodecLabel
    ),
    meta_article_label_total_purchase_ht: normalizeOptionalText(labels.totalPurchaseHt),
    meta_article_label_total_purchase_ttc: normalizeOptionalText(labels.totalPurchaseTtc),
    meta_article_label_total_ht: normalizeOptionalText(labels.totalHt),
    meta_article_label_total_ttc: normalizeOptionalText(labels.totalTtc),
    notes: normalizeOptionalText(notes),
    schema_version: schemaVersion,
    totals_currency: normalizeOptionalText(totals.currency),
    totals_subtotal: normalizeOptionalNumber(totals.subtotal),
    totals_discount: normalizeOptionalNumber(totals.discount),
    totals_tax: normalizeOptionalNumber(totals.tax),
    totals_total_ht: normalizeOptionalNumber(totals.totalHT),
    totals_total_ttc: normalizeOptionalNumber(totals.totalTTC),
    totals_grand: normalizeOptionalNumber(totals.grand),
    totals_wh_amount: normalizeOptionalNumber(totals.whAmount),
    totals_net: normalizeOptionalNumber(totals.net),
    totals_balance_due: normalizeOptionalNumber(totals.balanceDue),
    totals_acompte_enabled: normalizeOptionalBool(totalsAcompte.enabled),
    totals_acompte_paid: normalizeOptionalNumber(totalsAcompte.paid),
    totals_acompte_base: normalizeOptionalNumber(totalsAcompte.base),
    totals_acompte_remaining: normalizeOptionalNumber(totalsAcompte.remaining),
    totals_financing_subvention_enabled: normalizeOptionalBool(totalsFin.subventionEnabled),
    totals_financing_subvention_label: normalizeOptionalText(totalsFin.subventionLabel),
    totals_financing_subvention_amount: normalizeOptionalNumber(totalsFin.subventionAmount),
    totals_financing_bank_enabled: normalizeOptionalBool(totalsFin.bankEnabled),
    totals_financing_bank_label: normalizeOptionalText(totalsFin.bankLabel),
    totals_financing_bank_amount: normalizeOptionalNumber(totalsFin.bankAmount),
    totals_financing_total: normalizeOptionalNumber(totalsFin.total),
    totals_financing_net_to_pay: normalizeOptionalNumber(totalsFin.netToPay),
    totals_extras_ship_ht: normalizeOptionalNumber(totalsExtras.shipHT),
    totals_extras_ship_ttc: normalizeOptionalNumber(totalsExtras.shipTT),
    totals_extras_ship_tva: normalizeOptionalNumber(totalsExtras.shipTVA),
    totals_extras_dossier_ht: normalizeOptionalNumber(totalsExtras.dossierHT),
    totals_extras_dossier_ttc: normalizeOptionalNumber(totalsExtras.dossierTT),
    totals_extras_dossier_tva: normalizeOptionalNumber(totalsExtras.dossierTVA),
    totals_extras_deplacement_ht: normalizeOptionalNumber(totalsExtras.deplacementHT),
    totals_extras_deplacement_ttc: normalizeOptionalNumber(totalsExtras.deplacementTT),
    totals_extras_deplacement_tva: normalizeOptionalNumber(totalsExtras.deplacementTVA),
    totals_extras_stamp_ht: normalizeOptionalNumber(totalsExtras.stampHT),
    totals_extras_stamp_ttc: normalizeOptionalNumber(totalsExtras.stampTT),
    totals_extras_stamp_tva: normalizeOptionalNumber(totalsExtras.stampTVA),
    totals_extras_fodec_base: normalizeOptionalNumber(totalsExtras.fodecBase),
    totals_extras_fodec_ht: normalizeOptionalNumber(totalsExtras.fodecHT),
    totals_extras_fodec_ttc: normalizeOptionalNumber(totalsExtras.fodecTT),
    totals_extras_fodec_tva: normalizeOptionalNumber(totalsExtras.fodecTVA),
    totals_extras_fodec_enabled: normalizeOptionalBool(totalsExtras.fodecEnabled),
    totals_extras_fodec_label: normalizeOptionalText(totalsExtras.fodecLabel),
    totals_extras_fodec_rate: normalizeOptionalNumber(totalsExtras.fodecRate),
    totals_extras_stamp_enabled: normalizeOptionalBool(totalsExtras.stampEnabled),
    totals_extras_stamp_label: normalizeOptionalText(totalsExtras.stampLabel),
    totals_extras_dossier_enabled: normalizeOptionalBool(totalsExtras.dossierEnabled),
    totals_extras_dossier_label: normalizeOptionalText(totalsExtras.dossierLabel),
    totals_extras_deplacement_enabled: normalizeOptionalBool(totalsExtras.deplacementEnabled),
    totals_extras_deplacement_label: normalizeOptionalText(totalsExtras.deplacementLabel)
  };
  const items = itemsRaw.map((item, index) =>
    normalizeDocumentItem(item, index, { docType: normalizedDocType })
  );
  return { row, items, tvaBreakdown, fodecBreakdown };
};

const hasAnyValue = (obj = {}) =>
  Object.values(obj).some((value) => value !== undefined && value !== null && value !== "");

const readTextValue = (value) => (value === null || value === undefined ? "" : String(value));

const readBoolValue = (value) => (value === null || value === undefined ? undefined : !!value);

const readNumberValue = (value) => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const buildDocumentPayloadFromRow = (row = {}, items = [], taxRows = []) => {
  const company = {
    name: readTextValue(row.company_name),
    type: readTextValue(row.company_type),
    vat: readTextValue(row.company_vat),
    customsCode: readTextValue(row.company_customs_code),
    iban: readTextValue(row.company_iban),
    phone: readTextValue(row.company_phone),
    fax: readTextValue(row.company_fax),
    email: readTextValue(row.company_email),
    address: readTextValue(row.company_address),
    logo: readTextValue(row.company_logo),
    logoPath: readTextValue(row.company_logo_path),
    seal: {
      enabled: !!row.company_seal_enabled,
      image: readTextValue(row.company_seal_image),
      maxWidthMm: readNumberValue(row.company_seal_max_width_mm),
      maxHeightMm: readNumberValue(row.company_seal_max_height_mm),
      opacity: readNumberValue(row.company_seal_opacity),
      rotateDeg: readNumberValue(row.company_seal_rotate_deg)
    },
    signature: {
      enabled: !!row.company_signature_enabled,
      image: readTextValue(row.company_signature_image),
      maxWidthMm: readNumberValue(row.company_signature_max_width_mm),
      maxHeightMm: readNumberValue(row.company_signature_max_height_mm),
      opacity: readNumberValue(row.company_signature_opacity),
      rotateDeg: readNumberValue(row.company_signature_rotate_deg)
    }
  };
  const client = {
    __path: readTextValue(row.client_path),
    type: readTextValue(row.client_type),
    name: readTextValue(row.client_name),
    benefit: readTextValue(row.client_benefit),
    account: readTextValue(row.client_account),
    vat: readTextValue(row.client_vat),
    identifiantFiscal: readTextValue(row.client_identifiant_fiscal),
    cin: readTextValue(row.client_cin),
    passport: readTextValue(row.client_passport),
    stegRef: readTextValue(row.client_steg_ref),
    phone: readTextValue(row.client_phone),
    email: readTextValue(row.client_email),
    address: readTextValue(row.client_address),
  };
  const normalizedDocType = normalizeDocType(readTextValue(row.meta_doc_type || row.doc_type));
  const rawColumns = {
    ref: readBoolValue(row.meta_col_ref),
    product: readBoolValue(row.meta_col_product),
    desc: readBoolValue(row.meta_col_desc),
    qty: readBoolValue(row.meta_col_qty),
    unit: readBoolValue(row.meta_col_unit),
    stockQty: readBoolValue(row.meta_col_stock_qty),
    purchasePrice: readBoolValue(row.meta_col_purchase_price),
    purchaseTva: readBoolValue(row.meta_col_purchase_tva),
    price: readBoolValue(row.meta_col_price),
    fodecSale: readBoolValue(row.meta_col_fodec_sale),
    fodecPurchase: readBoolValue(row.meta_col_fodec_purchase),
    fodec: readBoolValue(row.meta_col_fodec),
    addFodec: readBoolValue(row.meta_col_add_fodec),
    tva: readBoolValue(row.meta_col_tva),
    discount: readBoolValue(row.meta_col_discount),
    totalPurchaseHt: readBoolValue(row.meta_col_total_purchase_ht),
    totalPurchaseTtc: readBoolValue(row.meta_col_total_purchase_ttc),
    purchaseDependenciesLocked: readBoolValue(row.meta_col_purchase_dependencies_locked),
    totalHt: readBoolValue(row.meta_col_total_ht),
    totalTtc: readBoolValue(row.meta_col_total_ttc)
  };
  const columns = normalizeDocumentColumnState(rawColumns, {
    docType: normalizedDocType,
    taxesEnabled: readBoolValue(row.meta_taxes_enabled) !== false
  });
  const legacyFodecLabel = readTextValue(row.meta_article_label_fodec);
  const fodecSaleLabel =
    readTextValue(row.meta_article_label_fodec_sale) || readTextValue(row.meta_article_label_fodec_amount);
  const fodecPurchaseLabel =
    readTextValue(row.meta_article_label_fodec_purchase) || readTextValue(row.meta_article_label_fodec_amount);
  const contextualFodecLabel =
    legacyFodecLabel ||
    (normalizedDocType === "fa"
      ? (fodecPurchaseLabel || fodecSaleLabel)
      : (fodecSaleLabel || fodecPurchaseLabel));
  const articleFieldLabels = {
    ref: readTextValue(row.meta_article_label_ref),
    product: readTextValue(row.meta_article_label_product),
    desc: readTextValue(row.meta_article_label_desc),
    qty: readTextValue(row.meta_article_label_qty),
    unit: readTextValue(row.meta_article_label_unit),
    stockQty: readTextValue(row.meta_article_label_stock_qty),
    purchasePrice: readTextValue(row.meta_article_label_purchase_price),
    purchaseTva: readTextValue(row.meta_article_label_purchase_tva),
    price: readTextValue(row.meta_article_label_price),
    tva: readTextValue(row.meta_article_label_tva),
    discount: readTextValue(row.meta_article_label_discount),
    fodecSale: fodecSaleLabel,
    fodecPurchase: fodecPurchaseLabel,
    fodec: contextualFodecLabel,
    fodecRate: readTextValue(row.meta_article_label_fodec_rate),
    fodecTva: readTextValue(row.meta_article_label_fodec_tva),
    fodecAmount: readTextValue(row.meta_article_label_fodec_amount) || fodecSaleLabel,
    purchaseFodecAmount: fodecPurchaseLabel,
    totalPurchaseHt: readTextValue(row.meta_article_label_total_purchase_ht),
    totalPurchaseTtc: readTextValue(row.meta_article_label_total_purchase_ttc),
    totalHt: readTextValue(row.meta_article_label_total_ht),
    totalTtc: readTextValue(row.meta_article_label_total_ttc)
  };
  const resolvedModelName = readTextValue(row.meta_model_name || row.meta_model_key);
  const resolvedModelKey = readTextValue(row.meta_model_key || row.meta_model_name);
  const meta = {
    number: readTextValue(row.meta_number || row.number),
    currency: readTextValue(row.meta_currency),
    date: readTextValue(row.meta_date),
    due: readTextValue(row.meta_due),
    docType: readTextValue(row.meta_doc_type),
    stockAdjusted: !!row.meta_stock_adjusted,
    numberLength: readNumberValue(row.meta_number_length),
    numberFormat: readTextValue(row.meta_number_format),
    numberPrefix: readTextValue(row.meta_number_prefix),
    itemsHeaderColor: readTextValue(row.meta_items_header_color),
    template: readTextValue(row.meta_template),
    documentModelName: resolvedModelName,
    modelName: resolvedModelName,
    modelKey: resolvedModelKey,
    taxesEnabled: readBoolValue(row.meta_taxes_enabled),
    noteInterne: readTextValue(row.meta_note_interne),
    reglementEnabled: readBoolValue(row.meta_reglement_enabled),
    reglementType: readTextValue(row.meta_reglement_type),
    reglementDays: readNumberValue(row.meta_reglement_days),
    reglementText: readTextValue(row.meta_reglement_text),
    reglementValue: readTextValue(row.meta_reglement_value),
    paymentMethod: readTextValue(row.meta_payment_method),
    paymentReference: readTextValue(row.meta_payment_reference),
    paymentRef: readTextValue(row.meta_payment_reference),
    withholding: {
      enabled: !!row.meta_withholding_enabled,
      rate: readNumberValue(row.meta_withholding_rate),
      base: readTextValue(row.meta_withholding_base),
      label: readTextValue(row.meta_withholding_label),
      threshold: readNumberValue(row.meta_withholding_threshold),
      note: readTextValue(row.meta_withholding_note)
    },
    acompte: {
      enabled: !!row.meta_acompte_enabled,
      paid: readNumberValue(row.meta_acompte_paid)
    },
    financing: {
      subvention: {
        enabled: !!row.meta_financing_subvention_enabled,
        label: readTextValue(row.meta_financing_subvention_label),
        amount: readNumberValue(row.meta_financing_subvention_amount)
      },
      bank: {
        enabled: !!row.meta_financing_bank_enabled,
        label: readTextValue(row.meta_financing_bank_label),
        amount: readNumberValue(row.meta_financing_bank_amount)
      }
    },
    extras: {
      shipping: {
        enabled: !!row.meta_extras_shipping_enabled,
        label: readTextValue(row.meta_extras_shipping_label),
        amount: readNumberValue(row.meta_extras_shipping_amount),
        tva: readNumberValue(row.meta_extras_shipping_tva)
      },
      stamp: {
        enabled: !!row.meta_extras_stamp_enabled,
        label: readTextValue(row.meta_extras_stamp_label),
        amount: readNumberValue(row.meta_extras_stamp_amount)
      },
      dossier: {
        enabled: !!row.meta_extras_dossier_enabled,
        label: readTextValue(row.meta_extras_dossier_label),
        amount: readNumberValue(row.meta_extras_dossier_amount),
        tva: readNumberValue(row.meta_extras_dossier_tva)
      },
      deplacement: {
        enabled: !!row.meta_extras_deplacement_enabled,
        label: readTextValue(row.meta_extras_deplacement_label),
        amount: readNumberValue(row.meta_extras_deplacement_amount),
        tva: readNumberValue(row.meta_extras_deplacement_tva)
      },
      pdf: {
        showSeal: readBoolValue(row.meta_pdf_show_seal),
        showSignature: readBoolValue(row.meta_pdf_show_signature),
        showAmountWords: readBoolValue(row.meta_pdf_show_amount_words),
        footerNote: readTextValue(row.meta_pdf_footer_note),
        footerNoteSize: readNumberValue(row.meta_pdf_footer_note_size)
      }
    },
    addForm: {
      purchaseTva: readNumberValue(row.meta_add_form_purchase_tva),
      tva: readNumberValue(row.meta_add_form_tva),
      fodec: {
        enabled: !!row.meta_add_form_fodec_enabled,
        label: readTextValue(row.meta_add_form_fodec_label),
        rate: readNumberValue(row.meta_add_form_fodec_rate),
        tva: readNumberValue(row.meta_add_form_fodec_tva)
      }
    }
  };
  if (hasAnyValue(rawColumns)) {
    meta.columns = columns;
    meta.modelColumns = { ...columns };
  }
  if (hasAnyValue(articleFieldLabels)) meta.articleFieldLabels = articleFieldLabels;
  const totalsExtras = {
    shipHT: readNumberValue(row.totals_extras_ship_ht),
    shipTT: readNumberValue(row.totals_extras_ship_ttc),
    shipTVA: readNumberValue(row.totals_extras_ship_tva),
    dossierHT: readNumberValue(row.totals_extras_dossier_ht),
    dossierTT: readNumberValue(row.totals_extras_dossier_ttc),
    dossierTVA: readNumberValue(row.totals_extras_dossier_tva),
    deplacementHT: readNumberValue(row.totals_extras_deplacement_ht),
    deplacementTT: readNumberValue(row.totals_extras_deplacement_ttc),
    deplacementTVA: readNumberValue(row.totals_extras_deplacement_tva),
    stampHT: readNumberValue(row.totals_extras_stamp_ht),
    stampTT: readNumberValue(row.totals_extras_stamp_ttc),
    stampTVA: readNumberValue(row.totals_extras_stamp_tva),
    fodecBase: readNumberValue(row.totals_extras_fodec_base),
    fodecHT: readNumberValue(row.totals_extras_fodec_ht),
    fodecTT: readNumberValue(row.totals_extras_fodec_ttc),
    fodecTVA: readNumberValue(row.totals_extras_fodec_tva),
    fodecEnabled: readBoolValue(row.totals_extras_fodec_enabled),
    fodecLabel: readTextValue(row.totals_extras_fodec_label),
    fodecRate: readNumberValue(row.totals_extras_fodec_rate),
    stampEnabled: readBoolValue(row.totals_extras_stamp_enabled),
    stampLabel: readTextValue(row.totals_extras_stamp_label),
    dossierEnabled: readBoolValue(row.totals_extras_dossier_enabled),
    dossierLabel: readTextValue(row.totals_extras_dossier_label),
    deplacementEnabled: readBoolValue(row.totals_extras_deplacement_enabled),
    deplacementLabel: readTextValue(row.totals_extras_deplacement_label)
  };
  const totals = {
    currency: readTextValue(row.totals_currency),
    subtotal: readNumberValue(row.totals_subtotal),
    discount: readNumberValue(row.totals_discount),
    tax: readNumberValue(row.totals_tax),
    totalHT: readNumberValue(row.totals_total_ht),
    totalTTC: readNumberValue(row.totals_total_ttc),
    grand: readNumberValue(row.totals_grand),
    whAmount: readNumberValue(row.totals_wh_amount),
    net: readNumberValue(row.totals_net),
    balanceDue: readNumberValue(row.totals_balance_due),
    acompte: {
      enabled: !!row.totals_acompte_enabled,
      paid: readNumberValue(row.totals_acompte_paid),
      base: readNumberValue(row.totals_acompte_base),
      remaining: readNumberValue(row.totals_acompte_remaining)
    },
    financing: {
      subventionEnabled: !!row.totals_financing_subvention_enabled,
      subventionLabel: readTextValue(row.totals_financing_subvention_label),
      subventionAmount: readNumberValue(row.totals_financing_subvention_amount),
      bankEnabled: !!row.totals_financing_bank_enabled,
      bankLabel: readTextValue(row.totals_financing_bank_label),
      bankAmount: readNumberValue(row.totals_financing_bank_amount),
      total: readNumberValue(row.totals_financing_total),
      netToPay: readNumberValue(row.totals_financing_net_to_pay)
    },
    extras: totalsExtras
  };
  const tvaBreakdown = [];
  const fodecBreakdown = [];
  taxRows.forEach((entry) => {
    if (entry.kind === "tva") {
      tvaBreakdown.push({
        rate: readNumberValue(entry.rate) ?? 0,
        ht: readNumberValue(entry.ht) ?? 0,
        tva: readNumberValue(entry.tva) ?? 0
      });
      return;
    }
    if (entry.kind === "fodec") {
      fodecBreakdown.push({
        rate: readNumberValue(entry.rate) ?? 0,
        tvaRate: readNumberValue(entry.tva_rate) ?? 0,
        base: readNumberValue(entry.base) ?? 0,
        fodec: readNumberValue(entry.fodec) ?? 0,
        fodecTva: readNumberValue(entry.fodec_tva) ?? 0
      });
    }
  });
  if (tvaBreakdown.length) totals.tvaBreakdown = tvaBreakdown;
  if (fodecBreakdown.length) {
    totals.extras = totals.extras || {};
    totals.extras.fodecBreakdown = fodecBreakdown;
  }
  const payload = {
    company,
    client,
    meta,
    notes: readTextValue(row.notes),
    items,
    totals,
    _schemaVersion: readNumberValue(row.schema_version) ?? 1
  };
  return payload;
};

const buildDocumentItemsFromRows = (rows = [], { docType = "" } = {}) => {
  return rows.map((row) => {
    const salesPrice = readNumberValue(row.price) ?? 0;
    const salesTva = readNumberValue(row.tva) ?? 0;
    const purchasePriceFromRow = readNumberValue(row.purchase_price);
    const purchaseTvaFromRow = readNumberValue(row.purchase_tva);
    const purchasePrice = purchasePriceFromRow ?? 0;
    const purchaseTva = purchaseTvaFromRow ?? 0;
    const purchaseFodecEnabledRaw = readBoolValue(row.purchase_fodec_enabled);
    const purchaseFodecRateRaw = readNumberValue(row.purchase_fodec_rate);
    const purchaseFodecTvaRaw = readNumberValue(row.purchase_fodec_tva);
    const purchaseFodecLabelRaw = readTextValue(row.purchase_fodec_label);
    const purchaseFodecEnabled =
      purchaseFodecEnabledRaw !== undefined
        ? !!purchaseFodecEnabledRaw
        : false;
    const purchaseFodecRate = purchaseFodecRateRaw ?? 0;
    const purchaseFodecTva = purchaseFodecTvaRaw ?? 0;
    const purchaseFodecLabel =
      purchaseFodecLabelRaw ||
      "" ||
      "FODEC ACHAT";
    return {
      ref: readTextValue(row.ref),
      product: readTextValue(row.product),
      desc: readTextValue(row.desc),
      qty: readNumberValue(row.qty) ?? 0,
      unit: readTextValue(row.unit),
      purchasePrice,
      purchaseTva,
      price: salesPrice,
      tva: salesTva,
      discount: readNumberValue(row.discount) ?? 0,
      fodec: {
        enabled: !!row.fodec_enabled,
        label: readTextValue(row.fodec_label || "FODEC"),
        rate: readNumberValue(row.fodec_rate) ?? 0,
        tva: readNumberValue(row.fodec_tva) ?? 0
      },
      purchaseFodec: {
        enabled: purchaseFodecEnabled,
        label: purchaseFodecLabel,
        rate: purchaseFodecRate,
        tva: purchaseFodecTva
      },
      __articlePath: readTextValue(row.article_path)
    };
  });
};

const FIELD_TYPE = {
  ARRAY: "array",
  BOOLEAN: "boolean",
  NULL: "null",
  NUMBER: "number",
  OBJECT: "object",
  STRING: "string"
};

const flattenFields = (value, basePath = "", rows = []) => {
  if (Array.isArray(value)) {
    rows.push({ path: basePath, type: FIELD_TYPE.ARRAY, value: null });
    value.forEach((entry, index) => {
      const childPath = `${basePath}[${index}]`;
      flattenFields(entry, childPath, rows);
    });
    return rows;
  }
  if (value && typeof value === "object") {
    rows.push({ path: basePath, type: FIELD_TYPE.OBJECT, value: null });
    Object.keys(value).forEach((key) => {
      const childPath = basePath ? `${basePath}.${key}` : key;
      flattenFields(value[key], childPath, rows);
    });
    return rows;
  }
  if (value === null) {
    rows.push({ path: basePath, type: FIELD_TYPE.NULL, value: null });
    return rows;
  }
  if (typeof value === "string") {
    rows.push({ path: basePath, type: FIELD_TYPE.STRING, value });
    return rows;
  }
  if (typeof value === "number") {
    const safeValue = Number.isFinite(value) ? String(value) : null;
    rows.push({ path: basePath, type: FIELD_TYPE.NUMBER, value: safeValue });
    return rows;
  }
  if (typeof value === "boolean") {
    rows.push({ path: basePath, type: FIELD_TYPE.BOOLEAN, value: value ? "1" : "0" });
  }
  return rows;
};

const parseFieldPath = (path) => {
  if (!path) return [];
  const segments = [];
  const matcher = /([^.[]+)|\[(\d+)\]/g;
  let match;
  while ((match = matcher.exec(path))) {
    if (match[1]) segments.push(match[1]);
    else segments.push(Number(match[2]));
  }
  return segments;
};

const coerceFieldValue = (type, value) => {
  switch (type) {
    case FIELD_TYPE.STRING:
      return value == null ? "" : String(value);
    case FIELD_TYPE.NUMBER: {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    case FIELD_TYPE.BOOLEAN:
      return value === "1" || value === "true";
    case FIELD_TYPE.NULL:
      return null;
    default:
      return value;
  }
};

const setFieldValue = (holder, path, type, value) => {
  const segments = parseFieldPath(path);
  if (!segments.length) {
    if (type === FIELD_TYPE.ARRAY) holder.value = Array.isArray(holder.value) ? holder.value : [];
    else if (type === FIELD_TYPE.OBJECT) {
      holder.value = holder.value && typeof holder.value === "object" ? holder.value : {};
    }
    else holder.value = coerceFieldValue(type, value);
    return;
  }
  if (!holder.value || typeof holder.value !== "object") {
    holder.value = typeof segments[0] === "number" ? [] : {};
  }
  let current = holder.value;
  let parent = null;
  let parentSegment = null;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    const nextIsIndex = typeof segments[i + 1] === "number";
    if (isLast) {
      if (type === FIELD_TYPE.ARRAY) {
        current[segment] = Array.isArray(current[segment]) ? current[segment] : [];
      } else if (type === FIELD_TYPE.OBJECT) {
        const existing = current[segment];
        current[segment] = existing && typeof existing === "object" ? existing : {};
      } else {
        current[segment] = coerceFieldValue(type, value);
      }
      return;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        const replacement = [];
        if (parent) parent[parentSegment] = replacement;
        else holder.value = replacement;
        current = replacement;
      }
      if (!current[segment] || typeof current[segment] !== "object") {
        current[segment] = nextIsIndex ? [] : {};
      }
      parent = current;
      parentSegment = segment;
      current = current[segment];
      continue;
    }
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = nextIsIndex ? [] : {};
    }
    parent = current;
    parentSegment = segment;
    current = current[segment];
  }
};

const inflateFields = (rows) => {
  const holder = { value: {} };
  rows.forEach((row) => {
    setFieldValue(holder, row.path, row.type, row.value);
  });
  return holder.value;
};

const replaceFieldRows = (db, table, ownerColumn, ownerId, value) => {
  const rows = flattenFields(value, "", []);
  const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE ${ownerColumn} = ?`);
  const insertStmt = db.prepare(
    `INSERT INTO ${table} (${ownerColumn}, path, type, value) VALUES (?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    deleteStmt.run(ownerId);
    rows.forEach((row) => {
      insertStmt.run(ownerId, row.path, row.type, row.value);
    });
  });
  tx();
};

const loadFieldRows = (db, table, ownerColumn, ownerId) => {
  const rows = db
    .prepare(`SELECT path, type, value FROM ${table} WHERE ${ownerColumn} = ? ORDER BY path ASC`)
    .all(ownerId);
  return inflateFields(rows);
};

const parseJsonSafeForMigration = (text) => {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/* ---------- payment history ---------- */
const normalizeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeItemsBulk = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((entry, index) => {
    const normalized = entry && typeof entry === "object" ? entry : {};
    const paymentDateRaw = String(normalized.paymentDate || "").trim();
    const savedAtFromPaymentDate = paymentDateRaw
      ? paymentDateRaw.includes("T")
        ? paymentDateRaw
        : `${paymentDateRaw}T00:00:00.000Z`
      : "";
    const savedAt =
      String(normalized.savedAt || "").trim() ||
      savedAtFromPaymentDate ||
      new Date().toISOString();
    const clientPath = String(normalized.clientPath || "").trim();
    const clientId = parseClientIdFromPath(clientPath) || String(normalized.clientId || "").trim();
    return {
      id: String(normalized.id || `${savedAt}-${index}`),
      position: Number.isFinite(index) ? index : 0,
      paymentNumber: normalizeNumber(normalized.paymentNumber),
      entryType: String(normalized.entryType || "").trim(),
      invoiceNumber: String(normalized.invoiceNumber || "").trim(),
      invoicePath: String(normalized.invoicePath || "").trim(),
      clientName: String(normalized.clientName || "").trim(),
      clientAccount: String(normalized.clientAccount || "").trim(),
      clientPath,
      clientId,
      paymentDate: paymentDateRaw || savedAt.slice(0, 10),
      paymentRef: String(
        normalized.paymentRef || normalized.paymentReference || normalized.reference || ""
      ).trim(),
      amount: normalizeNumber(normalized.amount),
      balanceDue: normalizeNumber(normalized.balanceDue),
      currency: String(normalized.currency || "").trim(),
      mode: String(normalized.mode || "").trim(),
      savedAt
    };
  });
};

const savePaymentHistoryInternal = (normalizedItems) => {
  const db = initDatabase();
  const deleteStmt = db.prepare("DELETE FROM payment_history");
  const insertStmt = db.prepare(`
    INSERT INTO payment_history (
      id,
      position,
      paymentNumber,
      entryType,
      invoiceNumber,
      invoicePath,
      clientName,
      clientAccount,
      clientPath,
      clientId,
      paymentDate,
      paymentRef,
      amount,
      balanceDue,
      currency,
      mode,
      savedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((rows) => {
    deleteStmt.run();
    for (const row of rows) {
      insertStmt.run(
        row.id,
        row.position,
        row.paymentNumber,
        row.entryType,
        row.invoiceNumber,
        row.invoicePath,
        row.clientName,
        row.clientAccount,
        row.clientPath,
        row.clientId,
        row.paymentDate,
        row.paymentRef,
        row.amount,
        row.balanceDue,
        row.currency,
        row.mode,
        row.savedAt
      );
    }
    db.exec(
      "UPDATE payment_history SET clientId = replace(clientPath, 'sqlite://clients/', '') WHERE (clientId IS NULL OR TRIM(clientId) = '') AND clientPath LIKE 'sqlite://clients/%'"
    );
  });
  transaction(normalizedItems);
  renumberPaymentHistory(db);
};

const getPaymentHistory = () => {
  const db = initDatabase();
  const rows = db
    .prepare(
      "SELECT id, paymentNumber, entryType, invoiceNumber, invoicePath, clientName, clientAccount, clientPath, clientId, paymentDate, paymentRef, amount, balanceDue, currency, mode, savedAt FROM payment_history ORDER BY position ASC"
    )
    .all();
  return rows.map((row) => ({
    id: row.id,
    paymentNumber: row.paymentNumber,
    entryType: row.entryType,
    invoiceNumber: row.invoiceNumber,
    invoicePath: row.invoicePath,
    clientName: row.clientName,
    clientAccount: row.clientAccount,
    clientPath: row.clientPath,
    clientId: row.clientId,
    paymentDate: row.paymentDate,
    paymentRef: row.paymentRef,
    amount: row.amount,
    balanceDue: row.balanceDue,
    currency: row.currency,
    mode: row.mode,
    savedAt: row.savedAt
  }));
};

const savePaymentHistory = (items) => {
  const normalizedItems = normalizeItemsBulk(Array.isArray(items) ? items : []);
  savePaymentHistoryInternal(normalizedItems);
};

const renumberPaymentHistory = (db) => {
  if (!tableExists(db, "payment_history")) return;
  const rows = db
    .prepare(
      `
      SELECT id
      FROM payment_history
      ORDER BY position DESC, id ASC
    `
    )
    .all();
  const update = db.prepare("UPDATE payment_history SET paymentNumber = ? WHERE id = ?");
  const tx = db.transaction(() => {
    rows.forEach((row, index) => {
      update.run(index + 1, row.id);
    });
  });
  tx();
};

/* ---------- client ledger ---------- */
const CLIENT_LEDGER_TYPES = new Set(["credit", "debit"]);
const CLIENT_LEDGER_SOURCES = new Set([
  "payment",
  "invoice",
  "invoice_payment",
  "invoice_unpaid",
  "manual"
]);

const normalizeLedgerType = (value, fallback = "credit") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (CLIENT_LEDGER_TYPES.has(normalized)) return normalized;
  return fallback === "credit" || fallback === "debit" ? fallback : "credit";
};

const normalizeLedgerSource = (value, fallback = "manual") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (CLIENT_LEDGER_SOURCES.has(normalized)) return normalized;
  return CLIENT_LEDGER_SOURCES.has(fallback) ? fallback : "manual";
};

const normalizeLedgerCreatedAt = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00.000Z`;
  }
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return raw;
};

const normalizeLedgerEffectiveDate = (value, fallbackCreatedAt = "") => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const fallbackRaw = String(fallbackCreatedAt || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fallbackRaw)) return fallbackRaw;
  const fallbackParsed = Date.parse(fallbackRaw);
  if (Number.isFinite(fallbackParsed)) return new Date(fallbackParsed).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};

const normalizeLedgerDateFilter = (value, boundary = "start") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return boundary === "end" ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`;
  }
  return raw;
};

const generateLedgerId = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const addClientLedgerEntry = ({
  id,
  clientId,
  taxId,
  createdAt,
  effectiveDate,
  type,
  amount,
  source,
  sourceId,
  invoicePath,
  invoiceNumber,
  paymentMode,
  paymentRef,
  paymentReference
} = {}) => {
  const normalizedClientId = String(clientId || "").trim();
  if (!normalizedClientId) throw new Error("Client introuvable.");
  const normalizedAmount = Number(amount);
  const normalizedSourceId = String(sourceId || "").trim();
  const entrySource = normalizeLedgerSource(source, "manual");
  const isInitialBalanceEntry =
    entrySource === "manual" && normalizedSourceId.toLowerCase() === "initial";
  if (
    !Number.isFinite(normalizedAmount) ||
    normalizedAmount === 0 ||
    (!isInitialBalanceEntry && normalizedAmount <= 0)
  ) {
    throw new Error("Montant invalide.");
  }
  const entryType = normalizeLedgerType(type, normalizedAmount >= 0 ? "credit" : "debit");
  const entryId = String(id || generateLedgerId());
  const entryCreatedAt = normalizeLedgerCreatedAt(createdAt);
  const entryEffectiveDate = normalizeLedgerEffectiveDate(effectiveDate, entryCreatedAt);
  const entryTaxId = normalizeTextValue(taxId);
  const entrySourceId = normalizeTextValue(normalizedSourceId);
  const rawInvoicePath = normalizeTextValue(invoicePath);
  const entryInvoicePath =
    rawInvoicePath ||
    ((entrySource === "invoice" ||
      entrySource === "invoice_payment" ||
      entrySource === "invoice_unpaid") &&
    entrySourceId
      ? entrySourceId
      : "");
  const rawInvoiceNumber = normalizeTextValue(invoiceNumber);
  const isInvoiceLedgerSource =
    entrySource === "invoice" ||
    entrySource === "invoice_payment" ||
    entrySource === "invoice_unpaid";
  const entryInvoiceNumber =
    isInvoiceLedgerSource && rawInvoiceNumber && !/^sqlite:\/\//i.test(rawInvoiceNumber)
      ? rawInvoiceNumber
      : "";
  const entryPaymentMode = normalizeTextValue(paymentMode);
  const entryPaymentRef = normalizeTextValue(paymentRef || paymentReference);
  const db = initDatabase();
  db
    .prepare(
      `
      INSERT INTO client_ledger (
        id,
        client_id,
        tax_id,
        created_at,
        effective_date,
        type,
        amount,
        source,
        source_id,
        invoice_path,
        invoice_number,
        payment_mode,
        payment_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      entryId,
      normalizedClientId,
      entryTaxId || null,
      entryCreatedAt,
      entryEffectiveDate,
      entryType,
      normalizedAmount,
      entrySource,
      entrySourceId || null,
      entryInvoicePath || null,
      entryInvoiceNumber || null,
      entryPaymentMode || null,
      entryPaymentRef || null
    );
  return {
    id: entryId,
    clientId: normalizedClientId,
    taxId: entryTaxId || "",
    createdAt: entryCreatedAt,
    effectiveDate: entryEffectiveDate,
    type: entryType,
    amount: normalizedAmount,
    source: entrySource,
    sourceId: entrySourceId || "",
    invoicePath: entryInvoicePath || "",
    invoiceNumber: entryInvoiceNumber || "",
    paymentMode: entryPaymentMode || "",
    paymentRef: entryPaymentRef || ""
  };
};

const getClientLedgerEntries = ({ clientId, dateFrom, dateTo } = {}) => {
  const db = initDatabase();
  const conditions = [];
  const params = [];
  const normalizedClientId = String(clientId || "").trim();
  if (normalizedClientId) {
    conditions.push("l.client_id = ?");
    params.push(normalizedClientId);
  }
  const normalizedFrom = normalizeLedgerDateFilter(dateFrom, "start");
  if (normalizedFrom) {
    conditions.push("date(COALESCE(NULLIF(l.effective_date, ''), l.created_at)) >= date(?)");
    params.push(normalizedFrom);
  }
  const normalizedTo = normalizeLedgerDateFilter(dateTo, "end");
  if (normalizedTo) {
    conditions.push("date(COALESCE(NULLIF(l.effective_date, ''), l.created_at)) <= date(?)");
    params.push(normalizedTo);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
      SELECT
        l.rowid AS rowid,
        l.id,
        l.client_id AS clientId,
        l.tax_id AS taxId,
        l.created_at AS createdAt,
        l.effective_date AS effectiveDate,
        l.type,
        l.amount,
        l.source,
        l.source_id AS sourceId,
        l.invoice_path AS invoicePath,
        l.invoice_number AS invoiceNumber,
        l.payment_mode AS paymentMode,
        l.payment_ref AS paymentRef,
        c.name AS clientName,
        c.identifiant_fiscal AS clientTaxId
      FROM client_ledger l
      LEFT JOIN clients c ON c.id = l.client_id
      ${whereClause}
      ORDER BY datetime(l.created_at) DESC, l.rowid DESC
    `
    )
    .all(...params);
  return rows.map((row) => ({
    rowid: row.rowid,
    id: row.id,
    clientId: row.clientId,
    taxId: row.taxId || row.clientTaxId || "",
    createdAt: row.createdAt,
    effectiveDate: normalizeLedgerEffectiveDate(row.effectiveDate, row.createdAt),
    type: String(row.type || "").trim(),
    amount: row.amount,
    source: String(row.source || "").trim(),
    sourceId: row.sourceId || "",
    invoicePath: row.invoicePath || "",
    invoiceNumber: row.invoiceNumber || "",
    paymentMode: row.paymentMode || "",
    paymentRef: row.paymentRef || "",
    clientName: row.clientName || ""
  }));
};

const deleteClientLedgerEntry = (id) => {
  const entryId = String(id || "").trim();
  if (!entryId) return 0;
  const db = initDatabase();
  const existing = db
    .prepare(
      `
      SELECT
        client_id AS clientId,
        source AS source,
        source_id AS sourceId
      FROM client_ledger
      WHERE id = ?
    `
    )
    .get(entryId);
  const res = db.prepare("DELETE FROM client_ledger WHERE id = ?").run(entryId);
  const removed = res?.changes || 0;
  if (removed > 0) {
    const source = String(existing?.source || "").trim().toLowerCase();
    const sourceId = String(existing?.sourceId || "").trim().toLowerCase();
    const clientId = String(existing?.clientId || "").trim();
    if (source === "manual" && sourceId === "initial" && clientId) {
      db.prepare("UPDATE clients SET sold_client = ?, updated_at = ? WHERE id = ?").run(
        normalizeClientBalanceValue(0),
        new Date().toISOString(),
        clientId
      );
    }
  }
  return removed;
};

const getClientInitialLedgerEntry = (clientId) => {
  const normalizedClientId = String(clientId || "").trim();
  if (!normalizedClientId) return null;
  const db = initDatabase();
  return (
    db
      .prepare(
        `
      SELECT
        id,
        amount
      FROM client_ledger
      WHERE client_id = ?
        AND lower(trim(source)) = 'manual'
        AND lower(trim(source_id)) = 'initial'
      ORDER BY rowid ASC
      LIMIT 1
    `
      )
      .get(normalizedClientId) || null
  );
};

const updateClientLedgerAmount = (entryId, amount) => {
  const normalizedEntryId = String(entryId || "").trim();
  const normalizedAmount = Number(amount);
  if (!normalizedEntryId || !Number.isFinite(normalizedAmount)) return 0;
  const db = initDatabase();
  const res = db.prepare("UPDATE client_ledger SET amount = ? WHERE id = ?").run(normalizedAmount, normalizedEntryId);
  return Number(res?.changes || 0);
};

/* ---------- clients ---------- */
const persistClientRecord = ({
  id,
  type,
  name,
  clientType,
  benefit,
  account,
  accountNormalized,
  vat,
  identifiantFiscal,
  cin,
  passport,
  stegRef,
  phone,
  email,
  address,
  soldClient,
  searchText,
  legacyPath,
  createdAt,
  updatedAt
}) => {
  const db = initDatabase();
  db
    .prepare(
      `
      INSERT INTO clients (
        id,
        type,
        name,
        client_type,
        benefit,
        account,
        account_normalized,
        vat,
        identifiant_fiscal,
        cin,
        passport,
        steg_ref,
        phone,
        email,
        address,
        sold_client,
        search_text,
        legacy_path,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        client_type = excluded.client_type,
        benefit = excluded.benefit,
        account = excluded.account,
        account_normalized = excluded.account_normalized,
        vat = excluded.vat,
        identifiant_fiscal = excluded.identifiant_fiscal,
        cin = excluded.cin,
        passport = excluded.passport,
        steg_ref = excluded.steg_ref,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        sold_client = excluded.sold_client,
        search_text = excluded.search_text,
        legacy_path = COALESCE(excluded.legacy_path, clients.legacy_path),
        updated_at = excluded.updated_at
    `
    )
    .run(
      id,
      type,
      name,
      clientType || null,
      benefit || null,
      account || null,
      accountNormalized || null,
      vat || null,
      identifiantFiscal || null,
      cin || null,
      passport || null,
      stegRef || null,
      phone || null,
      email || null,
      address || null,
      soldClient || null,
      searchText,
      legacyPath || null,
      createdAt,
      updatedAt
    );
};

const saveClient = ({ client = {}, entityType = "client", suggestedName = "", id, legacyPath } = {}) => {
  const normalizedType = normalizeClientEntityType(entityType);
  const assignedId = id ? parseClientIdFromPath(id) || id : generateId("client");
  const db = initDatabase();
  const existingRecord = getClientById(assignedId);
  const normalizedClient = normalizeClientRecord(client);
  const baseName =
    String(suggestedName || normalizedClient.name || client.name || client.company || "")
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 80) || "client";
  const accountValue = normalizeAccountValue(normalizedClient.account);
  if (accountValue) {
    const match = db
      .prepare("SELECT id FROM clients WHERE account_normalized = ? AND type = ? AND id != ?")
      .get(accountValue, normalizedType, assignedId);
    if (match) {
      throw new Error("Un client avec le meme champ 'Pour le compte de' existe deja.");
    }
  }
  const now = new Date().toISOString();
  const searchText = buildSearchText([
    normalizedClient.name,
    normalizedClient.benefit,
    normalizedClient.account,
    normalizedClient.vat,
    normalizedClient.identifiantFiscal,
    normalizedClient.cin,
    normalizedClient.passport,
    normalizedClient.stegRef,
    normalizedClient.phone,
    normalizedClient.email,
    normalizedClient.address,
    normalizedClient.soldClient
  ]);
  persistClientRecord({
    id: assignedId,
    type: normalizedType,
    name: baseName,
    clientType: normalizedClient.clientType,
    benefit: normalizedClient.benefit,
    account: normalizedClient.account,
    accountNormalized: accountValue,
    vat: normalizedClient.vat,
    identifiantFiscal: normalizedClient.identifiantFiscal,
    cin: normalizedClient.cin,
    passport: normalizedClient.passport,
    stegRef: normalizedClient.stegRef,
    phone: normalizedClient.phone,
    email: normalizedClient.email,
    address: normalizedClient.address,
    soldClient: normalizedClient.soldClient,
    searchText,
    legacyPath: legacyPath || null,
    createdAt: now,
    updatedAt: now
  });
  if (!existingRecord) {
    const initialValue = parseBalanceValue(normalizedClient.soldClient);
    if (Number.isFinite(initialValue) && initialValue !== 0) {
      addClientLedgerEntry({
        clientId: assignedId,
        taxId: normalizedClient.identifiantFiscal || normalizedClient.vat || "",
        createdAt: now,
        effectiveDate: now.slice(0, 10),
        type: "credit",
        amount: initialValue,
        source: "manual",
        sourceId: "initial"
      });
    }
  }
  return { id: assignedId, path: formatClientPath(assignedId), name: baseName };
};

const updateClient = ({
  id,
  client = {},
  entityType,
  suggestedName,
  legacyPath,
  ledger,
  skipLedger
} = {}) => {
  if (!id) throw new Error("Client ID requis.");
  const record = getClientById(parseClientIdFromPath(id) || id);
  if (!record) throw new Error("Client introuvable.");
  const merged = { ...record.client, ...client };
  const previousSold = parseBalanceValue(record.client?.soldClient ?? 0);
  const nextSold = parseBalanceValue(merged?.soldClient ?? 0);
  const deltaRaw = nextSold - previousSold;
  const deltaRounded = Math.round((deltaRaw + Number.EPSILON) * 1000) / 1000;
  const hasLedgerPayload = !!(ledger && typeof ledger === "object");
  const shouldSyncInitialLedgerEntry =
    !skipLedger && !hasLedgerPayload && Number.isFinite(deltaRounded) && deltaRounded !== 0;
  const initialLedgerEntry = shouldSyncInitialLedgerEntry ? getClientInitialLedgerEntry(record.id) : null;
  const normalizedType = normalizeClientEntityType(entityType || record.entityType);
  const accountValue = normalizeAccountValue(merged.account || merged.accountOf || "");
  if (accountValue) {
    const db = initDatabase();
    const match = db
      .prepare("SELECT id FROM clients WHERE account_normalized = ? AND type = ? AND id != ?")
      .get(accountValue, normalizedType, record.id);
    if (match) {
      throw new Error("Un client avec le meme champ 'Pour le compte de' existe deja.");
    }
  }
  const node = saveClient({
    id,
    client: merged,
    entityType: normalizedType,
    suggestedName: suggestedName || record.name,
    legacyPath: legacyPath || record.legacyPath
  });
  let initialLedgerUpdated = false;
  if (initialLedgerEntry?.id) {
    initialLedgerUpdated = updateClientLedgerAmount(initialLedgerEntry.id, nextSold) > 0;
  }
  if (!initialLedgerUpdated && !skipLedger && Number.isFinite(deltaRounded) && deltaRounded !== 0) {
    const ledgerType =
      ledger?.type ||
      ledger?.ledgerType ||
      (deltaRounded > 0 ? "credit" : "debit");
    const ledgerSource = ledger?.source || ledger?.ledgerSource || "manual";
    const ledgerSourceId = ledger?.sourceId || ledger?.ledgerSourceId || "";
    const ledgerCreatedAt = ledger?.createdAt || ledger?.ledgerCreatedAt || "";
    const ledgerEffectiveDate = ledger?.effectiveDate || ledger?.ledgerEffectiveDate || "";
    const ledgerTaxId =
      ledger?.taxId ||
      ledger?.ledgerTaxId ||
      merged.identifiantFiscal ||
      merged.vat ||
      "";
    addClientLedgerEntry({
      clientId: record.id,
      taxId: ledgerTaxId,
      createdAt: ledgerCreatedAt,
      effectiveDate: ledgerEffectiveDate,
      type: ledgerType,
      amount: Math.abs(deltaRounded),
      source: ledgerSource,
      sourceId: ledgerSourceId
    });
  }
  return node;
};

const adjustClientSold = ({
  id,
  amount,
  delta,
  precision = 2,
  clamp = true,
  rejectIfInsufficient = false,
  entityType,
  suggestedName,
  legacyPath,
  ledgerType,
  ledgerSource,
  ledgerSourceId,
  ledgerCreatedAt,
  ledgerEffectiveDate,
  ledgerTaxId,
  skipLedger
} = {}) => {
  if (!id) throw new Error("Client ID requis.");
  const record = getClientById(parseClientIdFromPath(id) || id);
  if (!record) throw new Error("Client introuvable.");
  const precisionValue = Math.max(0, Math.min(6, Math.trunc(Number(precision) || 0)));
  const scale = Math.pow(10, precisionValue);
  const rawDelta =
    delta !== undefined && delta !== null ? Number(String(delta ?? "").replace(",", ".")) : null;
  const rawAmount =
    delta !== undefined && delta !== null ? null : Number(String(amount ?? "").replace(",", "."));
  if (rawDelta === null) {
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      throw new Error("Montant invalide.");
    }
  }
  if (rawDelta !== null && (!Number.isFinite(rawDelta) || rawDelta === 0)) {
    throw new Error("Montant invalide.");
  }
  const soldRaw = Number(String(record.client?.soldClient ?? "0").replace(",", "."));
  const currentValue = Number.isFinite(soldRaw) ? soldRaw : 0;
  const toUnits = (value) => Math.round((value + Number.EPSILON) * scale);
  const currentUnits = toUnits(currentValue);
  const deltaUnits = rawDelta !== null ? toUnits(rawDelta) : -toUnits(Math.abs(rawAmount));
  let nextUnits = currentUnits + deltaUnits;
  let clamped = false;
  if (nextUnits < 0) {
    if (rejectIfInsufficient && deltaUnits < 0) {
      throw new Error("Solde client insuffisant.");
    }
    if (clamp) {
      clamped = true;
      nextUnits = 0;
    }
  }
  const nextValue = nextUnits / scale;
  const soldClient = nextValue.toFixed(precisionValue);
  const node = updateClient({
    id,
    client: { soldClient },
    entityType: entityType || record.entityType,
    suggestedName: suggestedName || record.name,
    legacyPath: legacyPath || record.legacyPath,
    skipLedger: skipLedger === true,
    ledger: {
      type: ledgerType || (deltaUnits >= 0 ? "credit" : "debit"),
      source: ledgerSource,
      sourceId: ledgerSourceId,
      createdAt: ledgerCreatedAt,
      effectiveDate: ledgerEffectiveDate,
      taxId: ledgerTaxId
    }
  });
  return { ...node, soldClient, clamped };
};

const getClientById = (id) => {
  if (!id) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!row) return null;
  const parsed = {
    type: row.client_type || "",
    name: row.name || "",
    benefit: row.benefit || "",
    account: row.account || "",
    vat: row.vat || "",
    identifiantFiscal: row.identifiant_fiscal || "",
    cin: row.cin || "",
    passport: row.passport || "",
    stegRef: row.steg_ref || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    soldClient: row.sold_client ?? ""
  };
  return {
    id: row.id,
    entityType: row.type,
    name: row.name || parsed.name || "",
    client: parsed,
    legacyPath: row.legacy_path || "",
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
};

const deleteClient = (id) => {
  if (!id) return { ok: false, error: "Identifiant client requis." };
  const db = initDatabase();
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return { ok: true };
};

const searchClients = ({ query = "", limit, offset, entityType } = {}) => {
  const db = initDatabase();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const params = [];
  let whereClause = "";
  const clauses = [];
  if (entityType) {
    clauses.push("type = ?");
    params.push(normalizeClientEntityType(entityType));
  }
  if (normalizedQuery) {
    clauses.push("search_text LIKE ?");
    params.push(`%${normalizedQuery}%`);
  }
  if (clauses.length) {
    whereClause = `WHERE ${clauses.join(" AND ")}`;
  }
  const countSql = `SELECT COUNT(*) as total FROM clients ${whereClause}`;
  const total = db.prepare(countSql).get(...params)?.total || 0;
  const parts = [
    "SELECT id, type, name, client_type, benefit, account, vat, identifiant_fiscal, cin, passport, steg_ref, phone, email, address, sold_client, updated_at, created_at FROM clients",
    whereClause,
    "ORDER BY updated_at DESC"
  ];
  if (Number.isFinite(limit) && limit > 0) {
    parts.push("LIMIT ?");
    params.push(limit);
  }
  if (Number.isFinite(offset) && offset > 0) {
    parts.push("OFFSET ?");
    params.push(offset);
  }
  const rows = db.prepare(parts.join(" ")).all(...params);
    const results = rows.map((row) => {
      const data = {
        type: row.client_type || "",
        name: row.name || "",
        benefit: row.benefit || "",
      account: row.account || "",
      vat: row.vat || "",
      identifiantFiscal: row.identifiant_fiscal || "",
      cin: row.cin || "",
      passport: row.passport || "",
      stegRef: row.steg_ref || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      soldClient: row.sold_client ?? ""
    };
    return {
      id: row.id,
      name: row.name || data.name || "",
      entityType: row.type,
      identifier: buildClientIdentifier(data),
      email: data.email || "",
      phone: data.phone || data.telephone || data.tel || "",
      path: formatClientPath(row.id),
      fileName: row.name || data.name || "",
        modifiedMs: Date.parse(row.updated_at || row.created_at || "") || 0,
        client: data
      };
    });
    applyClientFactureCounts(results, db);
    return { results, total };
  };

const getClientIdByLegacyPath = (legacyPath) => {
  if (!legacyPath) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT id FROM clients WHERE legacy_path = ?").get(legacyPath);
  return row ? row.id : null;
};

/* ---------- depots / emplacements ---------- */
const getDepotById = (id) => {
  return getDepotMagasinRepository().getDepot(id);
};

const saveDepot = ({ depot = {}, suggestedName = "", id } = {}) => {
  const source = depot && typeof depot === "object" ? depot : {};
  const payload = {
    ...source,
    id: id || source.id || source.path,
    name: String(source.name || source.label || suggestedName || "").trim(),
    address: source.address,
    emplacements: Array.isArray(source.emplacements) ? source.emplacements : []
  };
  const result = getDepotMagasinRepository().saveDepot(payload);
  return {
    id: result?.id || "",
    path: result?.path || formatDepotPath(result?.id || ""),
    name: result?.name || ""
  };
};

const updateDepot = ({ id, depot = {}, suggestedName = "" } = {}) => {
  const depotId = parseDepotIdFromPath(id) || String(id || "").trim();
  if (!depotId) throw new Error("Identifiant depot/magasin requis.");
  const existing = getDepotMagasinRepository().getDepot(depotId);
  if (!existing) throw new Error("Depot/magasin introuvable.");
  return saveDepot({
    id: depotId,
    depot: {
      ...existing,
      ...depot,
      name:
        String(
          depot?.name ||
            depot?.label ||
            existing?.name ||
            suggestedName ||
            ""
        ).trim() || existing?.name
    },
    suggestedName
  });
};

const deleteDepot = (id) => {
  return getDepotMagasinRepository().deleteDepot(id);
};

const searchDepots = ({ query = "", limit, offset } = {}) => {
  return getDepotMagasinRepository().searchDepots({ query, limit, offset });
};

const listDepots = (query = "") => getDepotMagasinRepository().listDepots(query);

const listEmplacementsByDepot = (depotId) => {
  const id = parseDepotIdFromPath(depotId) || String(depotId || "").trim();
  if (!id) return [];
  return getDepotMagasinRepository().listEmplacementsByDepot(id);
};

/* ---------- articles ---------- */
const normalizeStockNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
};

const clampStockQuantity = (value) => {
  const normalized = normalizeStockNumber(value);
  return normalized < 0 ? 0 : normalized;
};

const persistArticleRecord = ({
  id,
  name,
  ref,
  product,
  desc,
  qty,
  stockQty,
  stockMin,
  stockAlert,
  unit,
  purchasePrice,
  purchaseTva,
  price,
  tva,
  discount,
  fodecEnabled,
  fodecLabel,
  fodecRate,
  fodecTva,
  purchaseFodecEnabled,
  purchaseFodecLabel,
  purchaseFodecRate,
  purchaseFodecTva,
  useRef,
  useProduct,
  useDesc,
  useUnit,
  usePrice,
  useFodec,
  useTva,
  useDiscount,
  useTotalHt,
  useTotalTtc,
  searchText,
  refNormalized,
  productNormalized,
  descNormalized,
  legacyPath,
  createdAt,
  updatedAt
}) => {
  const db = initDatabase();
  db
    .prepare(
      `
      INSERT INTO articles (
        id,
        name,
        ref,
        product,
        desc,
        qty,
        stock_qty,
        stock_min,
        stock_alert,
        unit,
        purchase_price,
        purchase_tva,
        price,
        tva,
        discount,
        fodec_enabled,
        fodec_label,
        fodec_rate,
        fodec_tva,
        purchase_fodec_enabled,
        purchase_fodec_label,
        purchase_fodec_rate,
        purchase_fodec_tva,
        use_ref,
        use_product,
        use_desc,
        use_unit,
        use_price,
        use_fodec,
        use_tva,
        use_discount,
        use_total_ht,
        use_total_ttc,
        search_text,
        ref_normalized,
        product_normalized,
        desc_normalized,
        legacy_path,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        ref = excluded.ref,
        product = excluded.product,
        desc = excluded.desc,
        qty = excluded.qty,
        stock_qty = excluded.stock_qty,
        stock_min = excluded.stock_min,
        stock_alert = excluded.stock_alert,
        unit = excluded.unit,
        purchase_price = excluded.purchase_price,
        purchase_tva = excluded.purchase_tva,
        price = excluded.price,
        tva = excluded.tva,
        discount = excluded.discount,
        fodec_enabled = excluded.fodec_enabled,
        fodec_label = excluded.fodec_label,
        fodec_rate = excluded.fodec_rate,
        fodec_tva = excluded.fodec_tva,
        purchase_fodec_enabled = excluded.purchase_fodec_enabled,
        purchase_fodec_label = excluded.purchase_fodec_label,
        purchase_fodec_rate = excluded.purchase_fodec_rate,
        purchase_fodec_tva = excluded.purchase_fodec_tva,
        use_ref = excluded.use_ref,
        use_product = excluded.use_product,
        use_desc = excluded.use_desc,
        use_unit = excluded.use_unit,
        use_price = excluded.use_price,
        use_fodec = excluded.use_fodec,
        use_tva = excluded.use_tva,
        use_discount = excluded.use_discount,
        use_total_ht = excluded.use_total_ht,
        use_total_ttc = excluded.use_total_ttc,
        search_text = excluded.search_text,
        ref_normalized = excluded.ref_normalized,
        product_normalized = excluded.product_normalized,
        desc_normalized = excluded.desc_normalized,
        legacy_path = COALESCE(excluded.legacy_path, articles.legacy_path),
        updated_at = excluded.updated_at
    `
    )
    .run(
      id,
      name,
      ref,
      product,
      desc,
      qty,
      stockQty,
      stockMin,
      stockAlert,
      unit,
      purchasePrice,
      purchaseTva,
      price,
      tva,
      discount,
      fodecEnabled,
      fodecLabel,
      fodecRate,
      fodecTva,
      purchaseFodecEnabled,
      purchaseFodecLabel,
      purchaseFodecRate,
      purchaseFodecTva,
      useRef,
      useProduct,
      useDesc,
      useUnit,
      usePrice,
      useFodec,
      useTva,
      useDiscount,
      useTotalHt,
      useTotalTtc,
      searchText,
      refNormalized,
      productNormalized,
      descNormalized,
      legacyPath || null,
      createdAt,
      updatedAt
    );
};

const normalizeArticleNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeArticleFodec = (source = {}) => {
  const raw = source && typeof source === "object" ? source : {};
  const f = raw.fodec && typeof raw.fodec === "object" ? raw.fodec : {};
  const rate = normalizeArticleNumber(
    f.rate ?? raw.fodecRate ?? raw.fodec_rate ?? raw.fodec_rate_pct ?? raw.fodecRatePct,
    0
  );
  const tva = normalizeArticleNumber(
    f.tva ?? raw.fodecTva ?? raw.fodec_tva ?? raw.fodecTvaPct ?? raw.fodec_tva_pct,
    0
  );
  const enabledFlag = f.enabled ?? raw.fodecEnabled ?? raw.fodec_enabled;
  const labelRaw = f.label || raw.fodecLabel;
  const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : "FODEC";
  const hasValue = Math.abs(rate) > 0 || Math.abs(tva) > 0;
  const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
  return { enabled, label, rate, tva };
};

const normalizeArticlePurchaseFodec = (source = {}) => {
  const raw = source && typeof source === "object" ? source : {};
  const purchaseFodec =
    raw.purchaseFodec && typeof raw.purchaseFodec === "object" ? raw.purchaseFodec : {};
  const rate = normalizeArticleNumber(
    purchaseFodec.rate ??
      raw.purchaseFodecRate ??
      raw.purchase_fodec_rate ??
      raw.purchaseFodecRatePct ??
      raw.purchase_fodec_rate_pct,
    0
  );
  const tva = normalizeArticleNumber(
    purchaseFodec.tva ??
      raw.purchaseFodecTva ??
      raw.purchase_fodec_tva ??
      raw.purchaseFodecTvaPct ??
      raw.purchase_fodec_tva_pct,
    0
  );
  const enabledFlag =
    purchaseFodec.enabled ?? raw.purchaseFodecEnabled ?? raw.purchase_fodec_enabled;
  const labelRaw =
    purchaseFodec.label || raw.purchaseFodecLabel || raw.purchase_fodec_label;
  const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : "FODEC ACHAT";
  const hasValue = Math.abs(rate) > 0 || Math.abs(tva) > 0;
  const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
  return { enabled, label, rate, tva };
};

const normalizeArticleRecord = (raw = {}) => {
  const stockMinNum = Number(raw?.stockMin);
  const normalized = {
    ref: raw?.ref ?? "",
    product: raw?.product ?? "",
    desc: raw?.desc ?? "",
    qty: Number(raw?.qty ?? 1) || 1,
    stockQty: Number(raw?.stockQty ?? 0) || 0,
    stockMin: Number.isFinite(stockMinNum) && stockMinNum >= 0 ? stockMinNum : 1,
    stockAlert: !!(raw?.stockAlert ?? raw?.stockMinAlert),
    unit: raw?.unit ?? "",
    purchasePrice: normalizeArticleNumber(raw?.purchasePrice ?? raw?.purchase_price, 0),
    purchaseTva: normalizeArticleNumber(raw?.purchaseTva ?? raw?.purchase_tva, 0),
    price: Number(raw?.price ?? 0) || 0,
    tva: Number(raw?.tva ?? 19) || 19,
    discount: Number(raw?.discount ?? 0) || 0,
    fodec: normalizeArticleFodec(raw),
    purchaseFodec: normalizeArticlePurchaseFodec(raw),
    use: normalizeArticleUse(raw?.use)
  };
  return normalized;
};

const resolveArticleUseFlag = (use, key) => {
  if (!use || typeof use !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(use, key)) return null;
  return use[key] ? 1 : 0;
};

const saveArticle = ({ article = {}, suggestedName = "article", id, legacyPath } = {}) => {
  const db = initDatabase();
  const assignedId = id ? parseArticleIdFromPath(id) || id : generateId("article");
  const normalized = normalizeArticleRecord(article);
  const name =
    String(suggestedName || normalized.ref || normalized.product || normalized.desc || "")
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 80) || "article";
  const now = new Date().toISOString();
  const refNorm = normalizeArticleField(normalized.ref);
  const productNorm = normalizeArticleField(normalized.product);
  const descNorm = normalizeArticleField(normalized.desc);
  const use = normalized.use;
  persistArticleRecord({
    id: assignedId,
    name,
    ref: normalized.ref,
    product: normalized.product,
    desc: normalized.desc,
    qty: normalized.qty,
    stockQty: normalized.stockQty,
    stockMin: normalized.stockMin,
    stockAlert: normalizeDbBool(normalized.stockAlert),
    unit: normalized.unit,
    purchasePrice: normalized.purchasePrice,
    purchaseTva: normalized.purchaseTva,
    price: normalized.price,
    tva: normalized.tva,
    discount: normalized.discount,
    fodecEnabled: normalizeDbBool(normalized.fodec?.enabled),
    fodecLabel: normalizeTextValue(normalized.fodec?.label || "FODEC"),
    fodecRate: Number.isFinite(normalized.fodec?.rate) ? normalized.fodec.rate : 0,
    fodecTva: Number.isFinite(normalized.fodec?.tva) ? normalized.fodec.tva : 0,
    purchaseFodecEnabled: normalizeDbBool(normalized.purchaseFodec?.enabled),
    purchaseFodecLabel: normalizeTextValue(normalized.purchaseFodec?.label || "FODEC ACHAT"),
    purchaseFodecRate: Number.isFinite(normalized.purchaseFodec?.rate) ? normalized.purchaseFodec.rate : 0,
    purchaseFodecTva: Number.isFinite(normalized.purchaseFodec?.tva) ? normalized.purchaseFodec.tva : 0,
    useRef: resolveArticleUseFlag(use, "ref"),
    useProduct: resolveArticleUseFlag(use, "product"),
    useDesc: resolveArticleUseFlag(use, "desc"),
    useUnit: resolveArticleUseFlag(use, "unit"),
    usePrice: resolveArticleUseFlag(use, "price"),
    useFodec: resolveArticleUseFlag(use, "fodec"),
    useTva: resolveArticleUseFlag(use, "tva"),
    useDiscount: resolveArticleUseFlag(use, "discount"),
    useTotalHt: resolveArticleUseFlag(use, "totalHt"),
    useTotalTtc: resolveArticleUseFlag(use, "totalTtc"),
    searchText: buildArticleSearchText(normalized),
    refNormalized: refNorm,
    productNormalized: productNorm,
    descNormalized: descNorm,
    legacyPath: legacyPath || null,
    createdAt: now,
    updatedAt: now
  });
  return { id: assignedId, path: formatArticlePath(assignedId), name };
};

const getArticleById = (id) => {
  if (!id) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(id);
  if (!row) return null;
  const articleData = {
    ref: row.ref || "",
    product: row.product || "",
    desc: row.desc || "",
    qty: Number(row.qty ?? 1) || 1,
    stockQty: Number(row.stock_qty ?? 0) || 0,
    stockMin: Number(row.stock_min ?? 1) || 1,
    stockAlert: !!row.stock_alert,
    unit: row.unit || "",
    purchasePrice: Number(row.purchase_price ?? 0) || 0,
    purchaseTva: Number(row.purchase_tva ?? 0) || 0,
    price: Number(row.price ?? 0) || 0,
    tva: Number(row.tva ?? 0) || 0,
    discount: Number(row.discount ?? 0) || 0,
    fodec: {
      enabled: !!row.fodec_enabled,
      label: row.fodec_label || "FODEC",
      rate: Number(row.fodec_rate ?? 0) || 0,
      tva: Number(row.fodec_tva ?? 0) || 0
    },
    purchaseFodec: {
      enabled: !!row.purchase_fodec_enabled,
      label: row.purchase_fodec_label || "FODEC ACHAT",
      rate: Number(row.purchase_fodec_rate ?? 0) || 0,
      tva: Number(row.purchase_fodec_tva ?? 0) || 0
    },
    use: {
      ref: row.use_ref == null ? undefined : !!row.use_ref,
      product: row.use_product == null ? undefined : !!row.use_product,
      desc: row.use_desc == null ? undefined : !!row.use_desc,
      unit: row.use_unit == null ? undefined : !!row.use_unit,
      price: row.use_price == null ? undefined : !!row.use_price,
      fodec: row.use_fodec == null ? undefined : !!row.use_fodec,
      tva: row.use_tva == null ? undefined : !!row.use_tva,
      discount: row.use_discount == null ? undefined : !!row.use_discount,
      totalHt: row.use_total_ht == null ? undefined : !!row.use_total_ht,
      totalTtc: row.use_total_ttc == null ? undefined : !!row.use_total_ttc
    }
  };
  return {
    id: row.id,
    name: row.name,
    article: articleData,
    legacyPath: row.legacy_path || "",
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
};

const deleteArticle = (id) => {
  if (!id) return { ok: false, error: "Identifiant article requis." };
  const db = initDatabase();
  db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  return { ok: true };
};

const searchArticles = ({ query = "", limit, offset } = {}) => {
  const db = initDatabase();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const params = [];
  const clauses = [];
  if (normalizedQuery) {
    clauses.push("search_text LIKE ?");
    params.push(`%${normalizedQuery}%`);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const countSql = `SELECT COUNT(*) as total FROM articles ${whereClause}`;
  const total = db.prepare(countSql).get(...params)?.total || 0;
  const parts = [
    "SELECT id, name, ref, product, desc, qty, stock_qty, stock_min, stock_alert, unit, purchase_price, purchase_tva, price, tva, discount,",
    "fodec_enabled, fodec_label, fodec_rate, fodec_tva, purchase_fodec_enabled, purchase_fodec_label, purchase_fodec_rate, purchase_fodec_tva, use_ref, use_product, use_desc, use_unit, use_price,",
    "use_fodec, use_tva, use_discount, use_total_ht, use_total_ttc FROM articles",
    whereClause,
    "ORDER BY updated_at DESC"
  ];
  if (Number.isFinite(limit) && limit > 0) {
    parts.push("LIMIT ?");
    params.push(limit);
  }
  if (Number.isFinite(offset) && offset > 0) {
    parts.push("OFFSET ?");
    params.push(offset);
  }
  const rows = db.prepare(parts.join(" ")).all(...params);
  const results = rows.map((row) => ({
    path: formatArticlePath(row.id),
    name: row.name,
    article: normalizeArticleRecord({
      ref: row.ref,
      product: row.product,
      desc: row.desc,
      qty: row.qty,
      stockQty: row.stock_qty,
      stockMin: row.stock_min,
      stockAlert: !!row.stock_alert,
      unit: row.unit,
      purchasePrice: row.purchase_price,
      purchaseTva: row.purchase_tva,
      price: row.price,
      tva: row.tva,
      discount: row.discount,
      fodec: {
        enabled: !!row.fodec_enabled,
        label: row.fodec_label || "FODEC",
        rate: row.fodec_rate,
        tva: row.fodec_tva
      },
      purchaseFodec: {
        enabled: !!row.purchase_fodec_enabled,
        label: row.purchase_fodec_label || "FODEC ACHAT",
        rate: row.purchase_fodec_rate,
        tva: row.purchase_fodec_tva
      },
      use: {
        ref: row.use_ref == null ? undefined : !!row.use_ref,
        product: row.use_product == null ? undefined : !!row.use_product,
        desc: row.use_desc == null ? undefined : !!row.use_desc,
        unit: row.use_unit == null ? undefined : !!row.use_unit,
        price: row.use_price == null ? undefined : !!row.use_price,
        fodec: row.use_fodec == null ? undefined : !!row.use_fodec,
        tva: row.use_tva == null ? undefined : !!row.use_tva,
        discount: row.use_discount == null ? undefined : !!row.use_discount,
        totalHt: row.use_total_ht == null ? undefined : !!row.use_total_ht,
        totalTtc: row.use_total_ttc == null ? undefined : !!row.use_total_ttc
      }
    })
  }));
  return { results, total };
};

const findDuplicateArticle = (article = {}, { excludeId } = {}) => {
  const db = initDatabase();
  const normalized = {
    ref: normalizeArticleField(article.ref),
    product: normalizeArticleField(article.product),
    desc: normalizeArticleField(article.desc)
  };
  const checks = [
    { column: "ref_normalized", value: normalized.ref, field: "reference" },
    { column: "product_normalized", value: normalized.product, field: "product" },
    { column: "desc_normalized", value: normalized.desc, field: "description" }
  ];
  for (const check of checks) {
    if (!check.value) continue;
    let sql = `SELECT id, name FROM articles WHERE ${check.column} = ?`;
    const params = [check.value];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const row = db.prepare(sql).get(...params);
    if (row) {
      return {
        field: check.field,
        conflict: {
          name: row.name,
          id: row.id
        }
      };
    }
  }
  return null;
};

const adjustArticleStockById = (id, deltaRaw) => {
  const record = getArticleById(id);
  if (!record) return { ok: false, error: "Article introuvable." };
  const article = record.article;
  if (typeof article !== "object" || article === null) {
    return { ok: false, error: "Article invalide." };
  }
  const delta = normalizeStockNumber(deltaRaw);
  if (!Number.isFinite(delta)) return { ok: false, error: "Quantite invalide." };
  const previous = clampStockQuantity(article.stockQty ?? 0);
  const next = clampStockQuantity(previous + delta);
  const appliedDelta = normalizeStockNumber(next - previous);
  article.stockQty = next;
  persistArticleRecord({
    id,
    name: record.name,
    searchText: buildArticleSearchText(article),
    refNormalized: normalizeArticleField(article.ref),
    productNormalized: normalizeArticleField(article.product),
    descNormalized: normalizeArticleField(article.desc),
    ref: article.ref,
    product: article.product,
    desc: article.desc,
    qty: article.qty,
    stockQty: article.stockQty,
    stockMin: article.stockMin,
    stockAlert: normalizeDbBool(article.stockAlert),
    unit: article.unit,
    purchasePrice: article.purchasePrice,
    purchaseTva: article.purchaseTva,
    price: article.price,
    tva: article.tva,
    discount: article.discount,
    fodecEnabled: normalizeDbBool(article.fodec?.enabled),
    fodecLabel: normalizeTextValue(article.fodec?.label || "FODEC"),
    fodecRate: Number(article.fodec?.rate || 0),
    fodecTva: Number(article.fodec?.tva || 0),
    purchaseFodecEnabled: normalizeDbBool(article.purchaseFodec?.enabled),
    purchaseFodecLabel: normalizeTextValue(article.purchaseFodec?.label || "FODEC ACHAT"),
    purchaseFodecRate: Number(article.purchaseFodec?.rate || 0),
    purchaseFodecTva: Number(article.purchaseFodec?.tva || 0),
    useRef: resolveArticleUseFlag(article.use, "ref"),
    useProduct: resolveArticleUseFlag(article.use, "product"),
    useDesc: resolveArticleUseFlag(article.use, "desc"),
    useUnit: resolveArticleUseFlag(article.use, "unit"),
    usePrice: resolveArticleUseFlag(article.use, "price"),
    useFodec: resolveArticleUseFlag(article.use, "fodec"),
    useTva: resolveArticleUseFlag(article.use, "tva"),
    useDiscount: resolveArticleUseFlag(article.use, "discount"),
    useTotalHt: resolveArticleUseFlag(article.use, "totalHt"),
    useTotalTtc: resolveArticleUseFlag(article.use, "totalTtc"),
    legacyPath: record.legacyPath,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return { ok: true, previous, next, appliedDelta, path: formatArticlePath(id), name: record.name };
};

const getArticleIdByLegacyPath = (legacyPath) => {
  if (!legacyPath) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT id FROM articles WHERE legacy_path = ?").get(legacyPath);
  return row ? row.id : null;
};

/* ---------- documents ---------- */
const previewDocumentNumber = ({ docType, date, numberLength, prefix, numberFormat } = {}) => {
  const normalizedDocType = normalizeDocType(docType);
  const period = resolveDocPeriod(date);
  const normalizedLength = normalizeNumberLength(numberLength, 4);
  const normalizedFormat = normalizeNumberFormat(numberFormat, NUMBER_FORMAT_DEFAULT);
  const normalizedPrefix = resolveNumberPrefix(prefix, normalizedDocType);
  const db = initDatabase();
  const row = db
    .prepare("SELECT MAX(idx) as max_idx FROM documents WHERE doc_type = ?")
    .get(normalizedDocType);
  const lastNumber = Number(row?.max_idx) || 0;
  const nextCounter = lastNumber + 1;
  const number = formatDocumentNumber({
    docType: normalizedDocType,
    period,
    counter: nextCounter,
    length: normalizedLength,
    prefix: normalizedPrefix,
    numberFormat: normalizedFormat
  });
  return {
    ok: true,
    docType: normalizedDocType,
    period,
    number,
    nextCounter,
    numberLength: normalizedLength,
    prefix: normalizedPrefix,
    numberFormat: normalizedFormat
  };
};

const saveDocumentWithNumber = ({
  docType,
  date,
  numberLength,
  prefix,
  numberFormat,
  data,
  status,
  previewNumber,
  number,
  allowExisting,
  reuseExistingNumber,
  isNumberAvailable,
  confirmNumberChange,
  acceptNumberChange,
  allowProvidedNumber
} = {}) => {
  const normalizedDocType = normalizeDocType(docType);
  const period = resolveDocPeriod(date);
  const normalizedLength = normalizeNumberLength(numberLength, 4);
  const normalizedFormat = normalizeNumberFormat(numberFormat, NUMBER_FORMAT_DEFAULT);
  const normalizedPrefix = resolveNumberPrefix(prefix, normalizedDocType);
  const payload = data && typeof data === "object" ? data : {};
  const normalizedStatus =
    normalizeDocumentStatus(
      status ??
        payload?.status ??
        payload?.meta?.status ??
        payload?.meta?.historyStatus
    );
  const noteInterne =
    payload &&
    typeof payload === "object" &&
    payload.meta &&
    typeof payload.meta === "object" &&
    typeof payload.meta.noteInterne === "string"
      ? payload.meta.noteInterne
      : "";
  const convertedFromStorage = resolveConvertedFromForStorage(payload);
  const preview = typeof previewNumber === "string" ? previewNumber.trim() : "";
  const providedNumber = typeof number === "string" ? number.trim() : "";
  const allowProvided = allowExisting === true;
  const reuseExisting = reuseExistingNumber === true;
  const allowCustomNumber = allowProvidedNumber === true;
  let allowFreeProvidedNumber = false;
  let behindSequenceRequested = false;
  const shouldConfirm =
    confirmNumberChange !== false && !acceptNumberChange && !allowProvided && !reuseExisting && !!preview;
  const now = new Date().toISOString();
  const db = initDatabase();
  const getMaxIdx = () => {
    const row = db
      .prepare("SELECT MAX(idx) as max_idx FROM documents WHERE doc_type = ?")
      .get(normalizedDocType);
    const value = Number(row?.max_idx);
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  };

  const findNextAvailableNumber = (startFrom) => {
    let lastIdx = Number(startFrom) || 0;
    let attempts = 0;
    const maxAttempts = 250;
    while (attempts < maxAttempts) {
      const nextIdx = lastIdx + 1;
      const candidate = formatDocumentNumber({
        docType: normalizedDocType,
        period,
        counter: nextIdx,
        length: normalizedLength,
        prefix: normalizedPrefix,
        numberFormat: normalizedFormat
      });
      if (typeof isNumberAvailable === "function") {
        let ok = true;
        try {
          ok = !!isNumberAvailable(candidate, {
            docType: normalizedDocType,
            period,
            counter: nextIdx,
            length: normalizedLength,
            prefix: normalizedPrefix,
            numberFormat: normalizedFormat
          });
        } catch {
          ok = true;
        }
        if (!ok) {
          lastIdx = nextIdx;
          attempts += 1;
          continue;
        }
      }
      const existing = db.prepare("SELECT id FROM documents WHERE number = ?").get(candidate);
      if (existing) {
        lastIdx = nextIdx;
        attempts += 1;
        continue;
      }
      return { number: candidate, idx: nextIdx };
    }
    return null;
  };

  if (shouldConfirm) {
    const candidate = findNextAvailableNumber(getMaxIdx());
    if (!candidate) {
      return { ok: false, error: "Numero indisponible." };
    }
    if (candidate.number !== preview) {
      const previewRow = db
        .prepare("SELECT id, doc_type FROM documents WHERE number = ?")
        .get(preview);
      const previewTaken = !!previewRow;
      const previewTakenSameDocType =
        previewTaken && normalizeDocType(previewRow.doc_type) === normalizedDocType;
      if (previewTakenSameDocType || previewTaken) {
        return {
          ok: false,
          reason: "number_changed",
          previewNumber: preview,
          suggestedNumber: candidate.number,
          docType: normalizedDocType,
          period,
          numberLength: normalizedLength,
          prefix: normalizedPrefix,
          numberFormat: normalizedFormat
        };
      }
      const previewSuffix = parseNumericSuffix(preview);
      const candidateSuffix = parseNumericSuffix(candidate.number);
      let previewAllowed = true;
      if (typeof isNumberAvailable === "function") {
        try {
          previewAllowed = !!isNumberAvailable(preview, {
            docType: normalizedDocType,
            period,
            counter: previewSuffix,
            length: normalizedLength,
            prefix: normalizedPrefix,
            numberFormat: normalizedFormat
          });
        } catch {
          previewAllowed = true;
        }
      }
      if (!previewAllowed) {
        return {
          ok: false,
          reason: "number_changed",
          previewNumber: preview,
          suggestedNumber: candidate.number,
          docType: normalizedDocType,
          period,
          numberLength: normalizedLength,
          prefix: normalizedPrefix,
          numberFormat: normalizedFormat
        };
      }
      const canSkipSequence =
        previewSuffix !== null &&
        candidateSuffix !== null &&
        previewSuffix > candidateSuffix;
      if (canSkipSequence) {
        return {
          ok: false,
          reason: "number_out_of_sequence",
          previewNumber: preview,
          suggestedNumber: candidate.number,
          docType: normalizedDocType,
          period,
          numberLength: normalizedLength,
          prefix: normalizedPrefix,
          numberFormat: normalizedFormat
        };
      }
      allowFreeProvidedNumber = true;
      behindSequenceRequested =
        previewSuffix !== null &&
        candidateSuffix !== null &&
        previewSuffix < candidateSuffix;
    }
  }

  const runTx = db.transaction(() => {
    let finalNumber = "";
    let documentId = "";

    if (providedNumber && (allowProvided || reuseExisting || allowCustomNumber || allowFreeProvidedNumber)) {
      const existing = db
        .prepare("SELECT id, idx, doc_type FROM documents WHERE number = ?")
        .get(providedNumber);
      if (existing) {
        if (allowProvided || reuseExisting) {
          const parsedIdx = parseNumericSuffix(providedNumber);
          const existingIdx = Number(existing?.idx);
          const idxValue =
            parsedIdx !== null
              ? parsedIdx
              : Number.isFinite(existingIdx) && existingIdx > 0
                ? Math.trunc(existingIdx)
                : null;
          db
            .prepare(
              `
              UPDATE documents
              SET
                doc_type = ?,
                period = ?,
                idx = ?,
                status = COALESCE(?, status),
                note_interne = ?,
                converted_from_type = ?,
                converted_from_id = ?,
                converted_from_number = ?,
                updated_at = ?
              WHERE number = ?
            `
            )
            .run(
              normalizedDocType,
              period,
              idxValue,
              normalizedStatus,
              noteInterne,
              convertedFromStorage.type,
              convertedFromStorage.id,
              convertedFromStorage.number,
              now,
              providedNumber
            );
          if (existing.doc_type && normalizeDocType(existing.doc_type) !== normalizedDocType) {
            const previousDocTable = resolveDocTableName(existing.doc_type);
            const previousItemsTable = resolveDocItemsTableName(existing.doc_type);
            db.prepare(`DELETE FROM ${previousDocTable} WHERE document_id = ?`).run(existing.id);
            db.prepare(`DELETE FROM ${previousItemsTable} WHERE document_id = ?`).run(existing.id);
          }
          documentId = existing.id;
          finalNumber = providedNumber;
        }
      } else if (allowProvided || allowCustomNumber || allowFreeProvidedNumber) {
        const parsedIdx = parseNumericSuffix(providedNumber);
        const idxValue = parsedIdx !== null ? parsedIdx : null;
        const id = generateId("doc");
        db
          .prepare(
            `
              INSERT INTO documents (
                id,
                doc_type,
                period,
                number,
                idx,
                status,
                note_interne,
                converted_from_type,
                converted_from_id,
                converted_from_number,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            id,
            normalizedDocType,
            period,
            providedNumber,
            idxValue,
            normalizedStatus,
            noteInterne,
            convertedFromStorage.type,
            convertedFromStorage.id,
            convertedFromStorage.number,
            now,
            now
          );
        documentId = id;
        finalNumber = providedNumber;
      }
    }

    if (!finalNumber) {
      let attempts = 0;
      let startIdx = getMaxIdx();
      while (attempts < 250) {
        const candidate = findNextAvailableNumber(startIdx);
        if (!candidate) break;
        try {
          const id = generateId("doc");
          db
            .prepare(
              `
              INSERT INTO documents (
                id,
                doc_type,
                period,
                number,
                idx,
                status,
                note_interne,
                converted_from_type,
                converted_from_id,
                converted_from_number,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            )
            .run(
              id,
              normalizedDocType,
              period,
              candidate.number,
              candidate.idx,
              normalizedStatus,
              noteInterne,
              convertedFromStorage.type,
              convertedFromStorage.id,
              convertedFromStorage.number,
              now,
              now
          );
          documentId = id;
          finalNumber = candidate.number;
          break;
        } catch (err) {
          if (err && String(err.code || "").includes("SQLITE_CONSTRAINT")) {
            startIdx = candidate.idx;
            attempts += 1;
            continue;
          }
          throw err;
        }
      }
      if (!finalNumber) throw new Error("Numero indisponible.");
    }
    if (documentId) {
      saveDocumentData(db, normalizedDocType, documentId, payload);
    }
    const numberBehindSequence =
      behindSequenceRequested && !!providedNumber && finalNumber === providedNumber;

    return {
      ok: true,
      docType: normalizedDocType,
      period,
      number: finalNumber,
      numberLength: normalizedLength,
      prefix: normalizedPrefix,
      previewNumber: preview,
      numberChanged: preview ? preview !== finalNumber : false,
      ...(numberBehindSequence
        ? {
            reason: "number_behind_sequence",
            numberBehindSequence: true
          }
        : {})
    };
  });

  return runTx();
};

const deleteDocumentByNumber = (rawNumber) => {
  const safeNumber = String(rawNumber || "").trim();
  if (!safeNumber) return { ok: false, error: "Numero requis." };
  const db = initDatabase();
  const docRow = db.prepare("SELECT id, doc_type FROM documents WHERE number = ?").get(safeNumber);
  const result = db.prepare("DELETE FROM documents WHERE number = ?").run(safeNumber);
  if (docRow?.id) {
    const docTable = resolveDocTableName(docRow.doc_type);
    const itemsTable = resolveDocItemsTableName(docRow.doc_type);
    db.prepare(`DELETE FROM ${docTable} WHERE document_id = ?`).run(docRow.id);
    db.prepare(`DELETE FROM ${itemsTable} WHERE document_id = ?`).run(docRow.id);
    db.prepare("DELETE FROM document_tax_breakdown WHERE document_id = ?").run(docRow.id);
  }
  return { ok: true, missing: result.changes === 0 };
};

const getDocumentById = (rawId) => {
  const safeId = String(rawId || "").trim();
  if (!safeId) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT number FROM documents WHERE id = ?").get(safeId);
  if (!row?.number) return null;
  return getDocumentByNumber(row.number);
};

const deleteDocumentById = (rawId) => {
  const safeId = String(rawId || "").trim();
  if (!safeId) return { ok: false, error: "Identifiant requis." };
  const db = initDatabase();
  const row = db.prepare("SELECT number FROM documents WHERE id = ?").get(safeId);
  if (!row?.number) return { ok: true, missing: true };
  return deleteDocumentByNumber(row.number);
};

const clearDocumentsByDocType = (docType) => {
  const normalizedDocType = normalizeDocType(docType);
  const db = initDatabase();
  const rows = db.prepare("SELECT id FROM documents WHERE doc_type = ?").all(normalizedDocType);
  const result = db.prepare("DELETE FROM documents WHERE doc_type = ?").run(normalizedDocType);
  rows.forEach((row) => {
    const docTable = resolveDocTableName(normalizedDocType);
    const itemsTable = resolveDocItemsTableName(normalizedDocType);
    db.prepare(`DELETE FROM ${docTable} WHERE document_id = ?`).run(row.id);
    db.prepare(`DELETE FROM ${itemsTable} WHERE document_id = ?`).run(row.id);
    db.prepare("DELETE FROM document_tax_breakdown WHERE document_id = ?").run(row.id);
  });
  return { ok: true, removed: result.changes || 0, docType: normalizedDocType };
};

const clearDocumentsByDocTypePeriod = (docType, period) => {
  const normalizedDocType = normalizeDocType(docType);
  const normalizedPeriod = normalizeDocPeriod(period);
  if (!normalizedPeriod) return { ok: false, error: "Periode requise." };
  const db = initDatabase();
  const rows = db
    .prepare("SELECT id FROM documents WHERE doc_type = ? AND period = ?")
    .all(normalizedDocType, normalizedPeriod);
  const result = db
    .prepare("DELETE FROM documents WHERE doc_type = ? AND period = ?")
    .run(normalizedDocType, normalizedPeriod);
  rows.forEach((row) => {
    const docTable = resolveDocTableName(normalizedDocType);
    const itemsTable = resolveDocItemsTableName(normalizedDocType);
    db.prepare(`DELETE FROM ${docTable} WHERE document_id = ?`).run(row.id);
    db.prepare(`DELETE FROM ${itemsTable} WHERE document_id = ?`).run(row.id);
    db.prepare("DELETE FROM document_tax_breakdown WHERE document_id = ?").run(row.id);
  });
  return {
    ok: true,
    removed: result.changes || 0,
    docType: normalizedDocType,
    period: normalizedPeriod
  };
};

const getDocumentByNumber = (rawNumber) => {
  const safeNumber = String(rawNumber || "").trim();
  if (!safeNumber) return null;
  const db = initDatabase();
  const row = db
    .prepare(
      "SELECT id, doc_type, period, number, status, note_interne, converted_from_type, converted_from_id, converted_from_number, pdf_path, pdf_exported_at, created_at, updated_at FROM documents WHERE number = ?"
    )
    .get(safeNumber);
  if (!row) return null;
  const docTable = resolveDocTableName(row.doc_type);
  const itemsTable = resolveDocItemsTableName(row.doc_type);
  const dataRow = db.prepare(`SELECT * FROM ${docTable} WHERE document_id = ?`).get(row.id) || {};
  const itemsRows = db
    .prepare(`SELECT * FROM ${itemsTable} WHERE document_id = ? ORDER BY position ASC`)
    .all(row.id);
  const taxRows = db
    .prepare("SELECT * FROM document_tax_breakdown WHERE document_id = ? ORDER BY kind, position ASC")
    .all(row.id);
  const items = buildDocumentItemsFromRows(itemsRows, { docType: row.doc_type });
  const data = buildDocumentPayloadFromRow(dataRow, items, taxRows);
  if (row.doc_type && (!data.meta || !data.meta.docType)) {
    if (!data.meta || typeof data.meta !== "object") data.meta = {};
    data.meta.docType = row.doc_type;
  }
  if (typeof row.note_interne === "string" && row.note_interne.trim()) {
    if (!data.meta || typeof data.meta !== "object") data.meta = {};
    if (!data.meta.noteInterne) data.meta.noteInterne = row.note_interne;
  }
  const convertedFromMeta = normalizeConvertedFromPayload(data?.meta?.convertedFrom || data?.convertedFrom);
  const convertedFromRow = normalizeConvertedFromPayload({
    type: row.converted_from_type,
    id: row.converted_from_id,
    number: row.converted_from_number
  });
  const convertedFromResolved = convertedFromMeta || convertedFromRow;
  if (convertedFromResolved) {
    if (!data.meta || typeof data.meta !== "object") data.meta = {};
    data.meta.convertedFrom = convertedFromResolved;
  } else if (data.meta && typeof data.meta === "object" && "convertedFrom" in data.meta) {
    delete data.meta.convertedFrom;
  }
  let status = row.status;
  if (!status) {
    const legacyStatus = resolveLegacyStatusFromData(data);
    if (legacyStatus) {
      const now = new Date().toISOString();
      db.prepare("UPDATE documents SET status = ?, updated_at = ? WHERE id = ?")
        .run(legacyStatus, now, row.id);
      status = legacyStatus;
    }
  }
  return {
    id: row.id,
    docType: row.doc_type,
    period: row.period,
    number: row.number,
    status,
    pdfPath: String(row.pdf_path || "").trim(),
    pdfExportedAt: String(row.pdf_exported_at || "").trim(),
    convertedFrom: convertedFromResolved || null,
    data,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const saveDocumentData = (db, docType, documentId, payload = {}) => {
  const table = resolveDocTableName(docType);
  const itemsTable = resolveDocItemsTableName(docType);
  const normalized = normalizeDocumentPayload(payload, { docType });
  const row = { ...normalized.row, document_id: documentId };
  const entries = Object.entries(row);
  const columns = entries.map(([key]) => key);
  const placeholders = entries.map(() => "?").join(", ");
  const updateAssignments = columns
    .filter((key) => key !== "document_id")
    .map((key) => `${key} = excluded.${key}`)
    .join(", ");
  const values = entries.map(([, value]) => (value === undefined ? null : value));
  db
    .prepare(
      `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${placeholders})
      ON CONFLICT(document_id) DO UPDATE SET
        ${updateAssignments}
    `
    )
    .run(...values);

  db.prepare(`DELETE FROM ${itemsTable} WHERE document_id = ?`).run(documentId);
  if (normalized.items.length) {
    const insertItem = db.prepare(
      `
        INSERT INTO ${itemsTable} (
          document_id,
          position,
          ref,
          product,
          desc,
          qty,
          unit,
          purchase_price,
          purchase_tva,
          price,
          tva,
          discount,
          fodec_enabled,
          fodec_label,
          fodec_rate,
          fodec_tva,
          purchase_fodec_enabled,
          purchase_fodec_label,
          purchase_fodec_rate,
          purchase_fodec_tva,
          article_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );
    normalized.items.forEach((item) => {
      insertItem.run(
        documentId,
        item.position,
        item.ref,
        item.product,
        item.desc,
        item.qty,
        item.unit,
        item.purchasePrice,
        item.purchaseTva,
        item.price,
        item.tva,
        item.discount,
        item.fodecEnabled,
        item.fodecLabel,
        item.fodecRate,
        item.fodecTva,
        item.purchaseFodecEnabled,
        item.purchaseFodecLabel,
        item.purchaseFodecRate,
        item.purchaseFodecTva,
        item.articlePath
      );
    });
  }

  db.prepare("DELETE FROM document_tax_breakdown WHERE document_id = ?").run(documentId);
  if (normalized.tvaBreakdown.length || normalized.fodecBreakdown.length) {
    const insertBreakdown = db.prepare(
      `
        INSERT INTO document_tax_breakdown (
          document_id,
          kind,
          position,
          rate,
          tva_rate,
          base,
          ht,
          tva,
          fodec,
          fodec_tva
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );
    normalized.tvaBreakdown.forEach((rowEntry, index) => {
      insertBreakdown.run(
        documentId,
        "tva",
        index,
        normalizeOptionalNumber(rowEntry.rate) ?? 0,
        null,
        null,
        normalizeOptionalNumber(rowEntry.ht) ?? 0,
        normalizeOptionalNumber(rowEntry.tva) ?? 0,
        null,
        null
      );
    });
    normalized.fodecBreakdown.forEach((rowEntry, index) => {
      insertBreakdown.run(
        documentId,
        "fodec",
        index,
        normalizeOptionalNumber(rowEntry.rate) ?? 0,
        normalizeOptionalNumber(rowEntry.tvaRate) ?? 0,
        normalizeOptionalNumber(rowEntry.base) ?? 0,
        null,
        null,
        normalizeOptionalNumber(rowEntry.fodec) ?? 0,
        normalizeOptionalNumber(rowEntry.fodecTva) ?? 0
      );
    });
  }
};

const listDocuments = ({ docType, limit, offset } = {}) => {
  const db = initDatabase();
  const params = [];
  const normalizedType = docType ? normalizeDocType(docType) : "";
  const whereClause = normalizedType ? "WHERE doc_type = ?" : "";
  if (normalizedType) params.push(normalizedType);
  const countSql = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
  const total = db.prepare(countSql).get(...params)?.total || 0;
  const parts = [
    "SELECT id, doc_type, period, number, status, note_interne, converted_from_type, converted_from_id, converted_from_number, pdf_path, pdf_exported_at, created_at, updated_at,",
    "CASE WHEN note_interne IS NOT NULL AND LENGTH(TRIM(note_interne)) > 0 THEN 1 ELSE 0 END AS has_comment",
    "FROM documents",
    whereClause,
    "ORDER BY updated_at DESC"
  ];
  if (Number.isFinite(limit) && limit > 0) {
    parts.push("LIMIT ?");
    params.push(limit);
  }
  if (Number.isFinite(offset) && offset > 0) {
    parts.push("OFFSET ?");
    params.push(offset);
  }
  const rows = db.prepare(parts.join(" ")).all(...params);
  const results = rows.map((row) => {
    const docTable = resolveDocTableName(row.doc_type);
    const itemsTable = resolveDocItemsTableName(row.doc_type);
    const dataRow = db.prepare(`SELECT * FROM ${docTable} WHERE document_id = ?`).get(row.id) || {};
    const itemsRows = db
      .prepare(`SELECT * FROM ${itemsTable} WHERE document_id = ? ORDER BY position ASC`)
      .all(row.id);
    const taxRows = db
      .prepare("SELECT * FROM document_tax_breakdown WHERE document_id = ? ORDER BY kind, position ASC")
      .all(row.id);
    const items = buildDocumentItemsFromRows(itemsRows, { docType: row.doc_type });
    const data = buildDocumentPayloadFromRow(dataRow, items, taxRows);
    if (row.doc_type && (!data.meta || !data.meta.docType)) {
      if (!data.meta || typeof data.meta !== "object") data.meta = {};
      data.meta.docType = row.doc_type;
    }
    if (typeof row.note_interne === "string" && row.note_interne.trim()) {
      if (!data.meta || typeof data.meta !== "object") data.meta = {};
      if (!data.meta.noteInterne) data.meta.noteInterne = row.note_interne;
    }
    const convertedFromMeta = normalizeConvertedFromPayload(data?.meta?.convertedFrom || data?.convertedFrom);
    const convertedFromRow = normalizeConvertedFromPayload({
      type: row.converted_from_type,
      id: row.converted_from_id,
      number: row.converted_from_number
    });
    const convertedFromResolved = convertedFromMeta || convertedFromRow;
    if (convertedFromResolved) {
      if (!data.meta || typeof data.meta !== "object") data.meta = {};
      data.meta.convertedFrom = convertedFromResolved;
    } else if (data.meta && typeof data.meta === "object" && "convertedFrom" in data.meta) {
      delete data.meta.convertedFrom;
    }
    let status = row.status;
    if (!status) {
      const legacyStatus = resolveLegacyStatusFromData(data);
      if (legacyStatus) {
        const now = new Date().toISOString();
        db.prepare("UPDATE documents SET status = ?, updated_at = ? WHERE id = ?")
          .run(legacyStatus, now, row.id);
        status = legacyStatus;
      }
    }
    return {
      id: row.id,
      docType: row.doc_type,
      period: row.period,
      number: row.number,
      status,
      pdfPath: String(row.pdf_path || "").trim(),
      pdfExportedAt: String(row.pdf_exported_at || "").trim(),
      convertedFrom: convertedFromResolved || null,
      has_comment: row.has_comment,
      data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
  return { results, total };
};

const updateDocumentStatus = (number, status) => {
  const safeNumber = String(number || "").trim();
  if (!safeNumber) return { ok: false, error: "Numero requis." };
  const normalizedStatus = normalizeDocumentStatus(status);
  if (!normalizedStatus) return { ok: false, error: "Statut requis." };
  const db = initDatabase();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE documents SET status = ?, updated_at = ? WHERE number = ?")
    .run(normalizedStatus, now, safeNumber);
  return { ok: result.changes > 0 };
};

const updateDocumentPdfPath = ({ number, path, pdfPath, pdfExportedAt } = {}) => {
  const directNumber = String(number || "").trim();
  const pathValue = String(path || "").trim();
  const resolvedNumber = directNumber || parseDocumentNumberFromPath(pathValue) || pathValue;
  if (!resolvedNumber) return { ok: false, error: "Numero requis." };
  const normalizedPdfPath = String(pdfPath || "").trim();
  const explicitExportedAt = String(pdfExportedAt || "").trim();
  const normalizedExportedAt = normalizedPdfPath ? (explicitExportedAt || new Date().toISOString()) : "";
  const db = initDatabase();
  const result = db
    .prepare("UPDATE documents SET pdf_path = ?, pdf_exported_at = ? WHERE number = ?")
    .run(
      normalizedPdfPath || null,
      normalizedExportedAt || null,
      resolvedNumber
    );
  if (!result.changes) {
    return { ok: false, missing: true, error: "Document introuvable." };
  }
  return {
    ok: true,
    number: resolvedNumber,
    pdfPath: normalizedPdfPath,
    pdfExportedAt: normalizedExportedAt
  };
};

/* ---------- models ---------- */
const sanitizeModelName = (rawName) => {
  if (rawName === null || rawName === undefined) return "";
  return String(rawName).trim().replace(/\s+/g, " ").slice(0, 80);
};

const saveModel = ({ name, config } = {}) => {
  const safeName = sanitizeModelName(name);
  if (!safeName) throw new Error("Nom de modele requis.");
  const db = initDatabase();
  const existing = db.prepare("SELECT created_at FROM models WHERE name = ?").get(safeName);
  const now = new Date().toISOString();
  const createdAt = existing?.created_at || now;
  const normalizedConfig = config && typeof config === "object" ? config : {};
  db
    .prepare(
      `
      INSERT INTO models (name, created_at, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        updated_at = excluded.updated_at
    `
    )
    .run(safeName, createdAt, now);
  replaceFieldRows(db, "model_fields", "model_name", safeName, normalizedConfig);
  return { name: safeName };
};

const loadModel = (rawName) => {
  const safeName = sanitizeModelName(rawName);
  if (!safeName) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT name FROM models WHERE name = ?").get(safeName);
  if (!row) return null;
  return { name: row.name, config: loadFieldRows(db, "model_fields", "model_name", row.name) };
};

const listModels = () => {
  const db = initDatabase();
  const rows = db
    .prepare("SELECT name FROM models ORDER BY updated_at DESC")
    .all();
  return rows.map((row) => ({
    name: row.name,
    config: loadFieldRows(db, "model_fields", "model_name", row.name)
  }));
};

const deleteModel = (rawName) => {
  const safeName = sanitizeModelName(rawName);
  if (!safeName) return { ok: false, error: "Nom de modele requis." };
  const db = initDatabase();
  const result = db.prepare("DELETE FROM models WHERE name = ?").run(safeName);
  db.prepare("DELETE FROM model_fields WHERE model_name = ?").run(safeName);
  return { ok: true, missing: result.changes === 0 };
};

/* ---------- app settings ---------- */
const sanitizeSettingKey = (rawKey) => {
  if (rawKey === null || rawKey === undefined) return "";
  return String(rawKey).trim().replace(/\s+/g, "_").slice(0, 80);
};

const saveSetting = ({ key, value } = {}) => {
  const safeKey = sanitizeSettingKey(key);
  if (!safeKey) throw new Error("Cle de parametre requise.");
  const db = initDatabase();
  const now = new Date().toISOString();
  const payload = value === undefined ? null : value;
  db
    .prepare(
      `
      INSERT INTO app_settings (key, updated_at)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        updated_at = excluded.updated_at
    `
    )
    .run(safeKey, now);
  replaceFieldRows(db, "app_setting_fields", "setting_key", safeKey, payload);
  return { key: safeKey };
};

const loadSetting = (rawKey) => {
  const safeKey = sanitizeSettingKey(rawKey);
  if (!safeKey) return null;
  const db = initDatabase();
  const row = db.prepare("SELECT key FROM app_settings WHERE key = ?").get(safeKey);
  if (!row) return null;
  return { key: row.key, value: loadFieldRows(db, "app_setting_fields", "setting_key", row.key) };
};

/* ---------- company profile ---------- */
const COMPANY_PROFILE_ID = 1;
const DEFAULT_SEAL = { enabled: false, image: "", maxWidthMm: 40, maxHeightMm: 40, opacity: 1, rotateDeg: -2 };
const DEFAULT_SIGNATURE = { enabled: false, image: "", rotateDeg: 0 };
const DEFAULT_LAN_SERVER = { enabled: false, port: 8080, redirectHttp80: false };

const normalizeTextField = (value) => String(value ?? "").trim();
const normalizeNumericField = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const rebuildClientBalances = () => {
  return { ok: true };
};
const normalizeBoolField = (value) => (value ? 1 : 0);
const parseAddressParts = (raw = "") => {
  const parts = String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    street: parts[0] || "",
    postal: parts[1] || "",
    city: parts[2] || ""
  };
};
const parsePhoneCode = (raw = "") => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const first = trimmed.split(/[,;]/)[0] || trimmed;
  const match = first.trim().match(/^(\+\d{1,4})\b/);
  return match ? match[1] : "";
};

const normalizeCompanyProfile = (payload = {}, base = {}) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const sealSource = source.seal && typeof source.seal === "object" ? source.seal : {};
  const sealBase = base.seal && typeof base.seal === "object" ? base.seal : DEFAULT_SEAL;
  const signatureSource =
    source.signature && typeof source.signature === "object" ? source.signature : {};
  const signatureBase =
    base.signature && typeof base.signature === "object" ? base.signature : DEFAULT_SIGNATURE;
  const lanSource =
    source.lanServer && typeof source.lanServer === "object" ? source.lanServer : {};
  const lanBase =
    base.lanServer && typeof base.lanServer === "object" ? base.lanServer : DEFAULT_LAN_SERVER;

  return {
    name: normalizeTextField(source.name ?? base.name),
    type: normalizeTextField(source.type ?? base.type),
    vat: normalizeTextField(source.vat ?? base.vat),
    customsCode: normalizeTextField(source.customsCode ?? base.customsCode),
    iban: normalizeTextField(source.iban ?? base.iban),
    phone: normalizeTextField(source.phone ?? base.phone),
    phoneCode: normalizeTextField(source.phoneCode ?? base.phoneCode),
    fax: normalizeTextField(source.fax ?? base.fax),
    email: normalizeTextField(source.email ?? base.email),
    address: normalizeTextField(source.address ?? base.address),
    addressStreet: normalizeTextField(source.addressStreet ?? base.addressStreet),
    addressPostal: normalizeTextField(source.addressPostal ?? base.addressPostal),
    addressCity: normalizeTextField(source.addressCity ?? base.addressCity),
    logo: normalizeTextField(source.logo ?? base.logo),
    logoPath: normalizeTextField(source.logoPath ?? base.logoPath),
    seal: {
      enabled: !!(sealSource.enabled ?? sealBase.enabled),
      image: normalizeTextField(sealSource.image ?? sealBase.image),
      maxWidthMm: normalizeNumericField(sealSource.maxWidthMm ?? sealBase.maxWidthMm),
      maxHeightMm: normalizeNumericField(sealSource.maxHeightMm ?? sealBase.maxHeightMm),
      opacity: normalizeNumericField(sealSource.opacity ?? sealBase.opacity),
      rotateDeg: normalizeNumericField(sealSource.rotateDeg ?? sealBase.rotateDeg)
    },
    signature: {
      enabled: !!(signatureSource.enabled ?? signatureBase.enabled),
      image: normalizeTextField(signatureSource.image ?? signatureBase.image),
      rotateDeg: normalizeNumericField(signatureSource.rotateDeg ?? signatureBase.rotateDeg)
    },
    lanServer: {
      enabled: !!(lanSource.enabled ?? lanBase.enabled),
      port: normalizeNumericField(lanSource.port ?? lanBase.port),
      redirectHttp80: !!(lanSource.redirectHttp80 ?? lanBase.redirectHttp80)
    }
  };
};

const loadCompanyProfile = () => {
  const db = initDatabase();
  const row = db.prepare("SELECT * FROM company_profile WHERE id = ?").get(COMPANY_PROFILE_ID);
  if (!row) return null;
  const sealDefaults = DEFAULT_SEAL;
  const signatureDefaults = DEFAULT_SIGNATURE;
  const lanDefaults = DEFAULT_LAN_SERVER;
  return {
    name: row.name || "",
    type: row.type || "",
    vat: row.vat || "",
    customsCode: row.customs_code || "",
    iban: row.iban || "",
    phone: row.phone || "",
    phoneCode: row.phone_code || "",
    fax: row.fax || "",
    email: row.email || "",
    address: row.address || "",
    addressStreet: row.address_street || "",
    addressPostal: row.address_postal || "",
    addressCity: row.address_city || "",
    logo: row.logo || "",
    logoPath: row.logo_path || "",
    seal: {
      enabled: !!row.seal_enabled,
      image: row.seal_image || "",
      maxWidthMm: normalizeNumericField(row.seal_max_width_mm) ?? sealDefaults.maxWidthMm,
      maxHeightMm: normalizeNumericField(row.seal_max_height_mm) ?? sealDefaults.maxHeightMm,
      opacity: normalizeNumericField(row.seal_opacity) ?? sealDefaults.opacity,
      rotateDeg: normalizeNumericField(row.seal_rotate_deg) ?? sealDefaults.rotateDeg
    },
    signature: {
      enabled: !!row.signature_enabled,
      image: row.signature_image || "",
      rotateDeg: normalizeNumericField(row.signature_rotate_deg) ?? signatureDefaults.rotateDeg
    },
    lanServer: {
      enabled: !!row.lan_enabled,
      port: normalizeNumericField(row.lan_port) ?? lanDefaults.port,
      redirectHttp80: !!row.lan_redirect_http80
    },
    updatedAt: row.updated_at
  };
};

const saveCompanyProfile = (payload = {}) => {
  const db = initDatabase();
  const existing = loadCompanyProfile() || {};
  const normalized = normalizeCompanyProfile(payload, existing);
  const addressParts =
    normalized.addressStreet || normalized.addressPostal || normalized.addressCity
      ? {
          street: normalized.addressStreet,
          postal: normalized.addressPostal,
          city: normalized.addressCity
        }
      : parseAddressParts(normalized.address);
  const phoneCode = normalized.phoneCode || parsePhoneCode(normalized.phone);
  const now = new Date().toISOString();
  db
    .prepare(
      `
      INSERT INTO company_profile (
        id,
        name,
        type,
        vat,
        customs_code,
        iban,
        phone,
        phone_code,
        fax,
        email,
        address,
        address_street,
        address_postal,
        address_city,
        logo,
        logo_path,
        seal_enabled,
        seal_image,
        seal_max_width_mm,
        seal_max_height_mm,
        seal_opacity,
        seal_rotate_deg,
        signature_enabled,
        signature_image,
        signature_rotate_deg,
        lan_enabled,
        lan_port,
        lan_redirect_http80,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        vat = excluded.vat,
        customs_code = excluded.customs_code,
        iban = excluded.iban,
        phone = excluded.phone,
        phone_code = excluded.phone_code,
        fax = excluded.fax,
        email = excluded.email,
        address = excluded.address,
        address_street = excluded.address_street,
        address_postal = excluded.address_postal,
        address_city = excluded.address_city,
        logo = excluded.logo,
        logo_path = excluded.logo_path,
        seal_enabled = excluded.seal_enabled,
        seal_image = excluded.seal_image,
        seal_max_width_mm = excluded.seal_max_width_mm,
        seal_max_height_mm = excluded.seal_max_height_mm,
        seal_opacity = excluded.seal_opacity,
        seal_rotate_deg = excluded.seal_rotate_deg,
        signature_enabled = excluded.signature_enabled,
        signature_image = excluded.signature_image,
        signature_rotate_deg = excluded.signature_rotate_deg,
        lan_enabled = excluded.lan_enabled,
        lan_port = excluded.lan_port,
        lan_redirect_http80 = excluded.lan_redirect_http80,
        updated_at = excluded.updated_at
    `
    )
    .run(
      COMPANY_PROFILE_ID,
      normalized.name,
      normalized.type,
      normalized.vat,
      normalized.customsCode,
      normalized.iban,
      normalized.phone,
      phoneCode,
      normalized.fax,
      normalized.email,
      normalized.address,
      addressParts.street,
      addressParts.postal,
      addressParts.city,
      normalized.logo,
      normalized.logoPath,
      normalizeBoolField(normalized.seal.enabled),
      normalized.seal.image,
      normalized.seal.maxWidthMm,
      normalized.seal.maxHeightMm,
      normalized.seal.opacity,
      normalized.seal.rotateDeg,
      normalizeBoolField(normalized.signature.enabled),
      normalized.signature.image,
      normalized.signature.rotateDeg,
      normalizeBoolField(normalized.lanServer.enabled),
      normalized.lanServer.port,
      normalizeBoolField(normalized.lanServer.redirectHttp80),
      now
    );
  return {
    ...normalized,
    phoneCode,
    addressStreet: addressParts.street,
    addressPostal: addressParts.postal,
    addressCity: addressParts.city
  };
};

/* ---------- smtp settings ---------- */
const SMTP_PRESETS = ["professional", "gmail"];
const DEFAULT_SMTP = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromEmail: "",
  fromName: ""
};

const normalizeSmtpPreset = (value) => (value === "gmail" ? "gmail" : "professional");

const normalizeSmtpSettings = (payload = {}, base = {}) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const secure = !!(source.secure ?? base.secure ?? DEFAULT_SMTP.secure);
  const port =
    normalizeNumericField(source.port ?? base.port ?? DEFAULT_SMTP.port) ??
    (secure ? 465 : DEFAULT_SMTP.port);
  return {
    enabled: !!(source.enabled ?? base.enabled ?? DEFAULT_SMTP.enabled),
    host: normalizeTextField(source.host ?? base.host ?? DEFAULT_SMTP.host),
    port,
    secure,
    user: normalizeTextField(source.user ?? base.user ?? DEFAULT_SMTP.user),
    pass: String(source.pass ?? base.pass ?? DEFAULT_SMTP.pass),
    fromEmail: normalizeTextField(source.fromEmail ?? base.fromEmail ?? DEFAULT_SMTP.fromEmail),
    fromName: normalizeTextField(source.fromName ?? base.fromName ?? DEFAULT_SMTP.fromName)
  };
};

const loadSmtpSettings = (preset) => {
  const db = initDatabase();
  if (preset) {
    const normalizedPreset = normalizeSmtpPreset(preset);
    const row = db
      .prepare("SELECT * FROM smtp_settings WHERE preset = ?")
      .get(normalizedPreset);
    if (!row) return null;
    return {
      enabled: !!row.enabled,
      host: row.host || "",
      port: normalizeNumericField(row.port) ?? DEFAULT_SMTP.port,
      secure: !!row.secure,
      user: row.user || "",
      pass: row.pass != null ? String(row.pass) : "",
      fromEmail: row.from_email || "",
      fromName: row.from_name || "",
      updatedAt: row.updated_at,
      preset: normalizedPreset
    };
  }
  const rows = db.prepare("SELECT * FROM smtp_settings").all() || [];
  const profiles = {};
  rows.forEach((row) => {
    const normalizedPreset = normalizeSmtpPreset(row.preset);
    profiles[normalizedPreset] = {
      enabled: !!row.enabled,
      host: row.host || "",
      port: normalizeNumericField(row.port) ?? DEFAULT_SMTP.port,
      secure: !!row.secure,
      user: row.user || "",
      pass: row.pass != null ? String(row.pass) : "",
      fromEmail: row.from_email || "",
      fromName: row.from_name || "",
      updatedAt: row.updated_at
    };
  });
  return profiles;
};

const saveSmtpProfile = (preset, payload = {}) => {
  const db = initDatabase();
  const normalizedPreset = normalizeSmtpPreset(preset);
  const existing = loadSmtpSettings(normalizedPreset) || {};
  const normalized = normalizeSmtpSettings(payload, existing);
  const now = new Date().toISOString();
  db
    .prepare(
      `
      INSERT INTO smtp_settings (
        preset,
        enabled,
        host,
        port,
        secure,
        user,
        pass,
        from_email,
        from_name,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(preset) DO UPDATE SET
        enabled = excluded.enabled,
        host = excluded.host,
        port = excluded.port,
        secure = excluded.secure,
        user = excluded.user,
        pass = excluded.pass,
        from_email = excluded.from_email,
        from_name = excluded.from_name,
        updated_at = excluded.updated_at
    `
    )
    .run(
      normalizedPreset,
      normalizeBoolField(normalized.enabled),
      normalized.host,
      normalized.port,
      normalizeBoolField(normalized.secure),
      normalized.user,
      normalized.pass,
      normalized.fromEmail,
      normalized.fromName,
      now
    );
  return { ...normalized };
};

const saveSmtpSettings = (payload = {}) => {
  const source = payload && typeof payload === "object" ? payload : {};
  if (source.profiles && typeof source.profiles === "object") {
    const results = {};
    SMTP_PRESETS.forEach((preset) => {
      if (source.profiles[preset]) {
        results[preset] = saveSmtpProfile(preset, source.profiles[preset]);
      }
    });
    return results;
  }
  const preset = normalizeSmtpPreset(source.preset || source.profile);
  const settings = source.settings && typeof source.settings === "object" ? source.settings : source;
  return saveSmtpProfile(preset, settings || {});
};

module.exports = {
  configure: ({ getRootDir: accessor, filename } = {}) => {
    if (typeof accessor !== "function") {
      throw new Error("Facturance DB requires a getRootDir accessor.");
    }
    getRootDir = accessor;
    dbFileName = typeof filename === "string" && filename.trim() ? filename.trim() : "";
  },
  getDatabasePath,
  getPaymentHistory,
  savePaymentHistory,
  getClientLedgerEntries,
  addClientLedgerEntry,
  deleteClientLedgerEntry,
  updateClientLedgerAmount,
  saveClient,
  updateClient,
  adjustClientSold,
  deleteClient,
  searchClients,
  formatClientPath,
  parseClientIdFromPath,
  getClientIdByLegacyPath,
  saveDepot,
  updateDepot,
  deleteDepot,
  searchDepots,
  listDepots,
  listEmplacementsByDepot,
  getDepotById,
  formatDepotPath,
  parseDepotIdFromPath,
  saveArticle,
  updateArticle: saveArticle,
  deleteArticle,
  searchArticles,
  listArticles: () => searchArticles({ query: "", limit: null, offset: 0 }).results.map((item) => item.path),
  formatArticlePath,
  parseArticleIdFromPath,
  formatDocumentPath,
  parseDocumentNumberFromPath,
  findDuplicateArticle,
  adjustArticleStockById,
  getArticleById,
  getArticleIdByLegacyPath,
  previewDocumentNumber,
  saveDocumentWithNumber,
  deleteDocumentByNumber,
  deleteDocumentById,
  clearDocumentsByDocType,
  clearDocumentsByDocTypePeriod,
  getDocumentByNumber,
  getDocumentById,
  listDocuments,
  updateDocumentStatus,
  updateDocumentPdfPath,
  acquireDocEditLock,
  touchDocEditLock,
  releaseDocEditLock,
  saveModel,
  loadModel,
  listModels,
  deleteModel,
  saveSetting,
  loadSetting,
  rebuildClientBalances,
  loadCompanyProfile,
  saveCompanyProfile,
  loadSmtpSettings,
  saveSmtpSettings,
  resetConnection
};
