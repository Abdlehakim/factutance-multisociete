"use strict";

const fs = require("fs");
const path = require("path");

const MIGRATION_FILE_PATTERN = /^\d+_.+\.(sql|js)$/i;

const ensureMigrationsTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
};

const getMigrationFiles = (migrationsDir) => {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MIGRATION_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aPrefix = Number.parseInt(a.split("_", 1)[0], 10);
      const bPrefix = Number.parseInt(b.split("_", 1)[0], 10);
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.localeCompare(b);
    });
};

const runSqlMigration = (db, absolutePath) => {
  const sql = fs.readFileSync(absolutePath, "utf8");
  if (sql && sql.trim()) {
    db.exec(sql);
  }
};

const runJsMigration = (db, absolutePath) => {
  delete require.cache[require.resolve(absolutePath)];
  const loaded = require(absolutePath);
  const migrationFn =
    typeof loaded === "function"
      ? loaded
      : (loaded && typeof loaded.default === "function" ? loaded.default : null);
  if (typeof migrationFn !== "function") {
    throw new Error(`Migration ${path.basename(absolutePath)} must export a function(db).`);
  }
  migrationFn(db);
};

const runMigrations = (db, options = {}) => {
  if (!db) return [];
  const normalizedOptions =
    typeof options === "string" ? { migrationsDir: options } : (options || {});
  const migrationsDir =
    normalizedOptions.migrationsDir || path.join(__dirname, "migrations");

  db.pragma("foreign_keys = ON");
  ensureMigrationsTable(db);

  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id)
  );
  const files = getMigrationFiles(migrationsDir);
  const hasUserTables = !!db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations' LIMIT 1"
    )
    .get();
  const applyMigration = db.transaction((filename) => {
    const absolutePath = path.join(migrationsDir, filename);
    if (filename.toLowerCase().endsWith(".sql")) {
      runSqlMigration(db, absolutePath);
    } else if (filename.toLowerCase().endsWith(".js")) {
      runJsMigration(db, absolutePath);
    } else {
      throw new Error(`Unsupported migration file extension: ${filename}`);
    }
    db.prepare(
      "INSERT INTO schema_migrations (id, applied_at) VALUES (?, datetime('now'))"
    ).run(filename);
  });
  const markApplied = db.transaction((filename) => {
    db.prepare(
      "INSERT INTO schema_migrations (id, applied_at) VALUES (?, datetime('now'))"
    ).run(filename);
  });

  const appliedNow = [];
  files.forEach((filename) => {
    if (applied.has(filename)) return;
    const isBaselineInitMigration = /^0*1_.+\.(sql|js)$/i.test(filename);
    if (hasUserTables && isBaselineInitMigration) {
      markApplied(filename);
      applied.add(filename);
      appliedNow.push(filename);
      return;
    }
    applyMigration(filename);
    applied.add(filename);
    appliedNow.push(filename);
  });

  return appliedNow;
};

module.exports = {
  runMigrations
};
