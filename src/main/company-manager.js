"use strict";

const fs = require("fs");
const path = require("path");

const COMPANY_FOLDER_PREFIX = "entreprise";
const COMPANY_FOLDER_REGEX = /^entreprise(\d+)$/i;
const LEGACY_REGISTRY_FILE_NAME = "companies.json";
const LEGACY_ACTIVE_POINTER_FILE_NAME = ".active-company";
const USERDATA_ACTIVE_FILE_NAME = "active-company.json";
const COMPANY_SETTINGS_FILE_NAME = "company.settings.json";
const LEGACY_DB_BASENAMES = ["facturance", "facturance.db"];
const GENERIC_DB_BASENAMES = ["database", "database.db", "sqlite", "sqlite.db", "db"];
const LEGACY_DB_SIDE_CAR_SUFFIXES = ["-wal", "-shm", "-journal"];
const ROOT_SKIP_FILE_NAMES = new Set([
  LEGACY_REGISTRY_FILE_NAME.toLowerCase(),
  LEGACY_ACTIVE_POINTER_FILE_NAME.toLowerCase()
]);

let getUserDataDir = null;

function configure(options = {}) {
  const accessor = options?.getUserDataDir;
  if (typeof accessor === "function") {
    getUserDataDir = accessor;
  }
}

function normalizeRootDir(rootDir) {
  return path.resolve(String(rootDir || ""));
}

function ensureRootDir(rootDir) {
  const normalized = normalizeRootDir(rootDir);
  if (!normalized) throw new Error("Invalid Facturance root directory.");
  fs.mkdirSync(normalized, { recursive: true });
  return normalized;
}

function parseFolderIndex(folderName) {
  const match = String(folderName || "").trim().match(COMPANY_FOLDER_REGEX);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCompanyId(value) {
  const idx = parseFolderIndex(value);
  return Number.isFinite(idx) ? `${COMPANY_FOLDER_PREFIX}${idx}` : "";
}

function companyDbFileName(companyId) {
  const normalized = normalizeCompanyId(companyId);
  return normalized ? `${normalized}.db` : "";
}

function compareCompanyIds(a, b) {
  const aIdx = parseFolderIndex(a) || 0;
  const bIdx = parseFolderIndex(b) || 0;
  if (aIdx !== bIdx) return aIdx - bIdx;
  return String(a || "").localeCompare(String(b || ""));
}

function listCompanyFolders(rootDir) {
  const root = normalizeRootDir(rootDir);
  if (!root || !fs.existsSync(root)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry && entry.isDirectory() && COMPANY_FOLDER_REGEX.test(entry.name || ""))
    .map((entry) => normalizeCompanyId(entry.name))
    .filter(Boolean)
    .sort(compareCompanyIds);
}

function normalizeCompanyDisplayName(value) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return normalized;
}

function resolveCompanyDir(rootDir, companyId) {
  const root = normalizeRootDir(rootDir);
  const normalizedId = normalizeCompanyId(companyId);
  if (!root || !normalizedId) return "";
  return path.join(root, normalizedId);
}

function getCompanySettingsPath(rootDir, companyId) {
  const companyDir = resolveCompanyDir(rootDir, companyId);
  return companyDir ? path.join(companyDir, COMPANY_SETTINGS_FILE_NAME) : "";
}

function readCompanySettings(rootDir, companyId) {
  const filePath = getCompanySettingsPath(rootDir, companyId);
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCompanySettings(rootDir, companyId, payload = {}) {
  const normalizedId = normalizeCompanyId(companyId);
  if (!normalizedId) throw new Error("Invalid company id.");
  const companyDir = resolveCompanyDir(rootDir, normalizedId);
  if (!companyDir) throw new Error("Invalid company directory.");
  fs.mkdirSync(companyDir, { recursive: true });
  const filePath = getCompanySettingsPath(rootDir, normalizedId);
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(safePayload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function getCompanyDisplayName(rootDir, companyId) {
  const normalizedId = normalizeCompanyId(companyId);
  if (!normalizedId) return "";
  const settings = readCompanySettings(rootDir, normalizedId);
  const fromName = normalizeCompanyDisplayName(
    settings.name ?? settings.companyName ?? settings.displayName
  );
  return fromName || "";
}

function setCompanyDisplayName(rootDir, companyId, displayName, options = {}) {
  const root = ensureRootDir(rootDir);
  const normalizedId = normalizeCompanyId(companyId);
  if (!normalizedId) throw new Error("Invalid company id.");
  ensureCompanyDbFile(root, normalizedId);

  const normalizedDisplayName = normalizeCompanyDisplayName(displayName);
  if (!normalizedDisplayName) {
    return { id: normalizedId, name: getCompanyDisplayName(root, normalizedId) || normalizedId };
  }

  const existing = getCompanyDisplayName(root, normalizedId);
  const shouldTreatAsEmpty =
    !existing || existing.toLowerCase() === normalizedId.toLowerCase();
  if (options?.ifEmpty && !shouldTreatAsEmpty) {
    return { id: normalizedId, name: existing };
  }

  const settings = readCompanySettings(root, normalizedId);
  const nextSettings = { ...settings, name: normalizedDisplayName };
  writeCompanySettings(root, normalizedId, nextSettings);
  return { id: normalizedId, name: normalizedDisplayName };
}

function getLegacyRegistryPath(rootDir) {
  return path.join(normalizeRootDir(rootDir), LEGACY_REGISTRY_FILE_NAME);
}

function getLegacyActivePointerPath(rootDir) {
  return path.join(normalizeRootDir(rootDir), LEGACY_ACTIVE_POINTER_FILE_NAME);
}

function resolveUserDataDir() {
  if (typeof getUserDataDir === "function") {
    const resolved = path.resolve(String(getUserDataDir() || ""));
    if (resolved) {
      fs.mkdirSync(resolved, { recursive: true });
      return resolved;
    }
  }
  throw new Error("Company manager userData accessor is not configured.");
}

function getUserDataActiveStatePath() {
  return path.join(resolveUserDataDir(), USERDATA_ACTIVE_FILE_NAME);
}

function readUserDataActiveCompanyId() {
  const activePath = getUserDataActiveStatePath();
  if (!fs.existsSync(activePath)) return "";
  try {
    const raw = fs.readFileSync(activePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "";
    return normalizeCompanyId(parsed.activeCompanyId || "");
  } catch {
    return "";
  }
}

function writeUserDataActiveCompanyId(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (!normalized) throw new Error("Invalid company id.");
  const activePath = getUserDataActiveStatePath();
  const payload = { activeCompanyId: normalized };
  const tempPath = `${activePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, activePath);
  return normalized;
}

function removeFileIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    // ignore cleanup errors
  }
  return false;
}

function readLegacyActiveFromPointer(rootDir) {
  const pointerPath = getLegacyActivePointerPath(rootDir);
  if (!fs.existsSync(pointerPath)) return "";
  try {
    const raw = fs.readFileSync(pointerPath, "utf8").trim();
    return normalizeCompanyId(raw);
  } catch {
    return "";
  }
}

function readLegacyActiveFromRegistry(rootDir) {
  const registryPath = getLegacyRegistryPath(rootDir);
  if (!fs.existsSync(registryPath)) return "";
  try {
    const raw = fs.readFileSync(registryPath, "utf8").trim();
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "";
    return normalizeCompanyId(parsed.activeCompanyId || "");
  } catch {
    return "";
  }
}

function copyDirMergeSync(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });
  if (typeof fs.cpSync === "function") {
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: false, errorOnExist: false });
    return;
  }
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  entries.forEach((entry) => {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirMergeSync(sourcePath, targetPath);
      return;
    }
    if (entry.isFile() && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function moveFileOrCopy(sourcePath, targetPath) {
  if (!sourcePath || !targetPath) return;
  if (!fs.existsSync(sourcePath)) return;
  if (fs.existsSync(targetPath)) return;
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.renameSync(sourcePath, targetPath);
    return;
  } catch {
    // fallback below
  }
  fs.copyFileSync(sourcePath, targetPath);
}

function movePathOrCopy(sourcePath, targetPath, isDirectory) {
  if (!sourcePath || !targetPath) return;
  if (!fs.existsSync(sourcePath)) return;
  if (isDirectory) {
    copyDirMergeSync(sourcePath, targetPath);
    return;
  }
  moveFileOrCopy(sourcePath, targetPath);
}

function isLegacyDbNameOrSideCar(fileName) {
  const lower = String(fileName || "").toLowerCase();
  return LEGACY_DB_BASENAMES.some((base) => {
    const baseLower = base.toLowerCase();
    if (lower === baseLower) return true;
    return LEGACY_DB_SIDE_CAR_SUFFIXES.some((suffix) => lower === `${baseLower}${suffix}`);
  });
}

function resolveLegacyDbPath(dirPath) {
  for (const baseName of LEGACY_DB_BASENAMES) {
    const candidate = path.join(dirPath, baseName);
    if (!fs.existsSync(candidate)) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // ignore unreadable paths
    }
  }
  return "";
}

function isSideCarFileName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  return LEGACY_DB_SIDE_CAR_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function isSqliteFilePath(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (stat.size === 0) return true;
    if (stat.size < 16) return false;
    const fd = fs.openSync(filePath, "r");
    try {
      const header = Buffer.alloc(16);
      const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
      if (bytesRead < 16) return false;
      return header.toString("utf8", 0, 15) === "SQLite format 3";
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

function moveDbSideCars(sourceDbPath, targetDbPath) {
  LEGACY_DB_SIDE_CAR_SUFFIXES.forEach((suffix) => {
    const sourceSideCar = `${sourceDbPath}${suffix}`;
    if (!fs.existsSync(sourceSideCar)) return;
    const targetSideCar = `${targetDbPath}${suffix}`;
    moveFileOrCopy(sourceSideCar, targetSideCar);
  });
}

function resolveCompanyDbSourcePath(companyDir, companyId) {
  const targetDbFile = companyDbFileName(companyId);
  const targetDbPath = path.join(companyDir, targetDbFile);
  try {
    if (fs.existsSync(targetDbPath) && fs.statSync(targetDbPath).isFile()) {
      return targetDbPath;
    }
  } catch {
    // ignore invalid target path
  }

  const preferredNames = [companyId, `${companyId}.db`, ...LEGACY_DB_BASENAMES, ...GENERIC_DB_BASENAMES];
  for (const preferredName of preferredNames) {
    const candidate = path.join(companyDir, preferredName);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }

  let entries = [];
  try {
    entries = fs.readdirSync(companyDir, { withFileTypes: true });
  } catch {
    return "";
  }
  const files = entries
    .filter((entry) => entry && entry.isFile())
    .map((entry) => String(entry.name || ""))
    .filter(Boolean)
    .filter((name) => name !== companyId && name !== targetDbFile)
    .filter((name) => !isSideCarFileName(name));

  const sqliteByHeader = files.find((name) => isSqliteFilePath(path.join(companyDir, name)));
  if (sqliteByHeader) return path.join(companyDir, sqliteByHeader);

  const sqliteByExt = files.find((name) => /\.db$/i.test(name));
  if (sqliteByExt) return path.join(companyDir, sqliteByExt);
  return "";
}

function createEmptyFileIfMissing(filePath) {
  if (!filePath || fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fd = fs.openSync(filePath, "a");
  fs.closeSync(fd);
}

function ensureCompanyDbFile(rootDir, companyId) {
  const normalizedId = normalizeCompanyId(companyId);
  if (!normalizedId) return "";
  const companyDir = path.join(rootDir, normalizedId);
  fs.mkdirSync(companyDir, { recursive: true });

  const targetDbPath = path.join(companyDir, companyDbFileName(normalizedId));
  const sourceDbPath = resolveCompanyDbSourcePath(companyDir, normalizedId);
  if (sourceDbPath && path.resolve(sourceDbPath) !== path.resolve(targetDbPath)) {
    moveFileOrCopy(sourceDbPath, targetDbPath);
    moveDbSideCars(sourceDbPath, targetDbPath);
  }

  createEmptyFileIfMissing(targetDbPath);
  return targetDbPath;
}

function normalizeAllCompanyDbFiles(rootDir, companyIds = []) {
  companyIds.forEach((companyId) => {
    ensureCompanyDbFile(rootDir, companyId);
  });
}

function migrateLegacyDbToCompany(rootDir, companyDir, dbFileName) {
  const targetDbPath = path.join(companyDir, dbFileName);
  if (fs.existsSync(targetDbPath)) return targetDbPath;

  let sourceDbPath = resolveLegacyDbPath(rootDir);
  if (!sourceDbPath) {
    sourceDbPath = resolveLegacyDbPath(companyDir);
  }
  if (!sourceDbPath) return "";

  movePathOrCopy(sourceDbPath, targetDbPath, false);
  moveDbSideCars(sourceDbPath, targetDbPath);
  createEmptyFileIfMissing(targetDbPath);
  return targetDbPath;
}

function hasLegacyRootEntries(rootDir) {
  let entries = [];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((entry) => {
    const name = String(entry.name || "");
    const lower = name.toLowerCase();
    if (lower.startsWith(".write-test-")) return false;
    if (ROOT_SKIP_FILE_NAMES.has(lower)) return false;
    if (COMPANY_FOLDER_REGEX.test(name)) return false;
    return true;
  });
}

function migrateLegacyRootIntoEntreprise1(rootDir) {
  const companyId = `${COMPANY_FOLDER_PREFIX}1`;
  const companyDir = path.join(rootDir, companyId);
  fs.mkdirSync(companyDir, { recursive: true });

  let entries = [];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    entries = [];
  }

  entries.forEach((entry) => {
    const name = String(entry.name || "");
    const lower = name.toLowerCase();
    if (lower.startsWith(".write-test-")) return;
    if (ROOT_SKIP_FILE_NAMES.has(lower)) return;
    if (COMPANY_FOLDER_REGEX.test(name)) return;
    if (isLegacyDbNameOrSideCar(name)) return;

    const sourcePath = path.join(rootDir, name);
    const targetPath = path.join(companyDir, name);

    try {
      movePathOrCopy(sourcePath, targetPath, entry.isDirectory());
    } catch (err) {
      console.warn("Unable to copy legacy company entry:", sourcePath, err?.message || err);
    }
  });

  migrateLegacyDbToCompany(rootDir, companyDir, companyDbFileName(companyId));
}

function resolveLegacyImportedActive(rootDir, companyIds = []) {
  const pointerCandidate = readLegacyActiveFromPointer(rootDir);
  const registryCandidate = readLegacyActiveFromRegistry(rootDir);

  let imported = "";
  if (pointerCandidate && companyIds.includes(pointerCandidate)) {
    imported = pointerCandidate;
  } else if (registryCandidate && companyIds.includes(registryCandidate)) {
    imported = registryCandidate;
  }

  removeFileIfExists(getLegacyActivePointerPath(rootDir));
  removeFileIfExists(getLegacyRegistryPath(rootDir));

  return imported;
}

function ensureStorageInitialized(rootDir) {
  const root = ensureRootDir(rootDir);

  let companyIds = listCompanyFolders(root);
  const hasLegacyDb = !!resolveLegacyDbPath(root);
  const hasLegacyEntries = hasLegacyRootEntries(root);
  if (!companyIds.length && (hasLegacyDb || hasLegacyEntries)) {
    migrateLegacyRootIntoEntreprise1(root);
    companyIds = listCompanyFolders(root);
  }

  if (hasLegacyDb) {
    const legacyTargetId = `${COMPANY_FOLDER_PREFIX}1`;
    const legacyTargetDir = path.join(root, legacyTargetId);
    fs.mkdirSync(legacyTargetDir, { recursive: true });
    migrateLegacyDbToCompany(root, legacyTargetDir, companyDbFileName(legacyTargetId));
    companyIds = listCompanyFolders(root);
  }

  if (!companyIds.length) {
    const firstId = `${COMPANY_FOLDER_PREFIX}1`;
    fs.mkdirSync(path.join(root, firstId), { recursive: true });
    companyIds = [firstId];
    if (hasLegacyDb || hasLegacyEntries) {
      migrateLegacyDbToCompany(root, path.join(root, firstId), companyDbFileName(firstId));
    }
  }

  normalizeAllCompanyDbFiles(root, companyIds);

  const userDataActive = readUserDataActiveCompanyId();
  const legacyImportedActive = resolveLegacyImportedActive(root, companyIds);

  let activeCompanyId = "";
  if (userDataActive && companyIds.includes(userDataActive)) {
    activeCompanyId = userDataActive;
  } else if (legacyImportedActive && companyIds.includes(legacyImportedActive)) {
    activeCompanyId = legacyImportedActive;
  }

  if (!activeCompanyId || !companyIds.includes(activeCompanyId)) {
    const defaultId = `${COMPANY_FOLDER_PREFIX}1`;
    if (!companyIds.includes(defaultId)) {
      fs.mkdirSync(path.join(root, defaultId), { recursive: true });
      companyIds = listCompanyFolders(root);
    }
    activeCompanyId = companyIds.includes(defaultId) ? defaultId : companyIds[0];
  }

  writeUserDataActiveCompanyId(activeCompanyId);

  return {
    root,
    companies: companyIds,
    activeCompanyId
  };
}

function listCompanies(rootDir) {
  const state = ensureStorageInitialized(rootDir);
  return state.companies.map((id) => ({
    id,
    name: getCompanyDisplayName(state.root, id) || id
  }));
}

function createCompany(rootDir, options = {}) {
  const root = ensureRootDir(rootDir);
  const state = ensureStorageInitialized(root);
  const maxIdx = Math.max(0, ...state.companies.map((id) => parseFolderIndex(id) || 0));
  const nextId = `${COMPANY_FOLDER_PREFIX}${maxIdx + 1}`;
  ensureCompanyDbFile(root, nextId);
  const displayName =
    normalizeCompanyDisplayName(options?.displayName ?? options?.name ?? "");
  if (displayName) {
    setCompanyDisplayName(root, nextId, displayName, { ifEmpty: true });
  }
  if (options?.setActive !== false) {
    writeUserDataActiveCompanyId(nextId);
  }
  return { id: nextId, name: getCompanyDisplayName(root, nextId) || nextId };
}

function setActiveCompany(rootDir, companyId) {
  const root = ensureRootDir(rootDir);
  const normalized = normalizeCompanyId(companyId);
  if (!normalized) {
    throw new Error("Invalid company id.");
  }
  const companyDir = path.join(root, normalized);
  if (!fs.existsSync(companyDir) || !fs.statSync(companyDir).isDirectory()) {
    throw new Error("Company not found.");
  }
  ensureCompanyDbFile(root, normalized);
  writeUserDataActiveCompanyId(normalized);
  return { id: normalized, name: getCompanyDisplayName(root, normalized) || normalized };
}

function getActiveCompanyId(rootDir) {
  return ensureStorageInitialized(rootDir).activeCompanyId;
}

function getActiveCompany(rootDir) {
  const root = ensureRootDir(rootDir);
  const id = getActiveCompanyId(root);
  return { id, name: getCompanyDisplayName(root, id) || id };
}

function getCompanyPaths(rootDir, companyId) {
  const root = ensureRootDir(rootDir);
  const state = ensureStorageInitialized(root);
  const normalizedId = normalizeCompanyId(companyId);
  const resolvedId =
    normalizedId && state.companies.includes(normalizedId)
      ? normalizedId
      : state.activeCompanyId;
  const companyDir = path.join(root, resolvedId);
  ensureCompanyDbFile(root, resolvedId);
  const dbFileName = companyDbFileName(resolvedId);
  const dbPath = path.join(companyDir, dbFileName);

  return {
    rootDir: root,
    activeCompanyId: resolvedId,
    id: resolvedId,
    name: getCompanyDisplayName(root, resolvedId) || resolvedId,
    folder: resolvedId,
    companyDir,
    dbFileName,
    dbPath,
    paths: {
      root,
      company: companyDir,
      db: dbPath,
      pdf: path.join(companyDir, "pdf"),
      xml: path.join(companyDir, "xml"),
      exportedData: path.join(companyDir, "exportedData"),
      factures: path.join(companyDir, "Factures")
    }
  };
}

function getActiveCompanyPaths(rootDir) {
  const root = ensureRootDir(rootDir);
  const activeCompanyId = getActiveCompanyId(root);
  return getCompanyPaths(root, activeCompanyId);
}

module.exports = {
  LEGACY_REGISTRY_FILE_NAME,
  LEGACY_ACTIVE_POINTER_FILE_NAME,
  USERDATA_ACTIVE_FILE_NAME,
  configure,
  createCompany,
  getCompanyDisplayName,
  getActiveCompany,
  getActiveCompanyId,
  getActiveCompanyPaths,
  getCompanyPaths,
  listCompanies,
  setCompanyDisplayName,
  setActiveCompany
};

