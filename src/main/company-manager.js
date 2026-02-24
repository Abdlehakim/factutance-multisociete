"use strict";

const fs = require("fs");
const path = require("path");

const REGISTRY_FILE_NAME = "companies.json";
const COMPANY_FOLDER_PREFIX = "entreprise";
const COMPANY_FOLDER_REGEX = /^entreprise(\d+)$/i;
const LEGACY_DB_BASENAMES = ["facturance", "facturance.db"];
const LEGACY_DB_SIDE_CAR_SUFFIXES = ["-wal", "-shm", "-journal"];
const ROOT_SKIP_FILE_NAMES = new Set([REGISTRY_FILE_NAME.toLowerCase()]);

const registryCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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

function getRegistryPath(rootDir) {
  return path.join(normalizeRootDir(rootDir), REGISTRY_FILE_NAME);
}

function parseFolderIndex(folderName) {
  const match = String(folderName || "").trim().match(COMPANY_FOLDER_REGEX);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFolderName(value) {
  const match = String(value || "").trim().match(COMPANY_FOLDER_REGEX);
  if (!match) return "";
  const idx = Number.parseInt(match[1], 10);
  if (!Number.isFinite(idx) || idx <= 0) return "";
  return `${COMPANY_FOLDER_PREFIX}${idx}`;
}

function defaultCompanyNameForFolder(folder) {
  const idx = parseFolderIndex(folder);
  return Number.isFinite(idx) ? `Entreprise ${idx}` : "Entreprise";
}

function normalizeCompanyName(value, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function compareCompanyFolders(a, b) {
  const aIdx = parseFolderIndex(a.folder);
  const bIdx = parseFolderIndex(b.folder);
  if (Number.isFinite(aIdx) && Number.isFinite(bIdx)) return aIdx - bIdx;
  return String(a.folder || "").localeCompare(String(b.folder || ""));
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
    .map((entry) => normalizeFolderName(entry.name))
    .filter(Boolean)
    .sort((a, b) => {
      const aIdx = parseFolderIndex(a) || 0;
      const bIdx = parseFolderIndex(b) || 0;
      return aIdx - bIdx;
    });
}

function normalizeRegistryRecord(rawRecord) {
  const record = rawRecord && typeof rawRecord === "object" ? rawRecord : {};
  const folder = normalizeFolderName(record.folder || record.id || record.companyId || "");
  if (!folder) return null;
  const fallbackName = defaultCompanyNameForFolder(folder);
  const createdAtRaw = String(record.createdAt || "").trim();
  const createdAt = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw)) ? createdAtRaw : nowIso();
  return {
    id: folder,
    folder,
    companyName: normalizeCompanyName(record.companyName, fallbackName),
    createdAt
  };
}

function readRegistryFromDisk(rootDir) {
  const registryPath = getRegistryPath(rootDir);
  if (!fs.existsSync(registryPath)) return null;
  try {
    const text = fs.readFileSync(registryPath, "utf8");
    if (!text.trim()) return null;
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return { companies: parsed, activeCompanyId: "" };
    }
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    return null;
  }
}

function sanitizeRegistry(rawRegistry, rootDir) {
  const raw = rawRegistry && typeof rawRegistry === "object" ? rawRegistry : {};
  const sourceCompanies = Array.isArray(raw.companies)
    ? raw.companies
    : Array.isArray(raw)
      ? raw
      : [];
  const dedup = new Map();
  sourceCompanies.forEach((rawRecord) => {
    const normalized = normalizeRegistryRecord(rawRecord);
    if (!normalized) return;
    if (!dedup.has(normalized.id)) dedup.set(normalized.id, normalized);
  });

  listCompanyFolders(rootDir).forEach((folder) => {
    if (dedup.has(folder)) return;
    dedup.set(folder, {
      id: folder,
      folder,
      companyName: defaultCompanyNameForFolder(folder),
      createdAt: nowIso()
    });
  });

  const companies = Array.from(dedup.values()).sort(compareCompanyFolders);
  const activeRaw = String(raw.activeCompanyId || "").trim();
  const activeNormalized = normalizeFolderName(activeRaw);
  const activeRecord =
    companies.find((entry) => entry.id === activeRaw) ||
    companies.find((entry) => entry.id === activeNormalized || entry.folder === activeNormalized) ||
    companies[0] ||
    null;
  return {
    companies,
    activeCompanyId: activeRecord ? activeRecord.id : ""
  };
}

function writeRegistryToDisk(rootDir, registry) {
  const root = ensureRootDir(rootDir);
  const registryPath = getRegistryPath(root);
  const payload = {
    companies: Array.isArray(registry.companies) ? registry.companies : [],
    activeCompanyId: String(registry.activeCompanyId || "")
  };
  const tempPath = `${registryPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, registryPath);
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

function copyLegacyDbToCompany(rootDir, companyDir, dbBaseName) {
  const targetDbPath = path.join(companyDir, dbBaseName);
  if (fs.existsSync(targetDbPath)) return targetDbPath;

  let sourceDbPath = resolveLegacyDbPath(rootDir);
  if (!sourceDbPath) {
    sourceDbPath = resolveLegacyDbPath(companyDir);
  }
  if (!sourceDbPath) return "";

  fs.copyFileSync(sourceDbPath, targetDbPath);
  LEGACY_DB_SIDE_CAR_SUFFIXES.forEach((suffix) => {
    const sourceSideCar = `${sourceDbPath}${suffix}`;
    if (!fs.existsSync(sourceSideCar)) return;
    const targetSideCar = `${targetDbPath}${suffix}`;
    if (fs.existsSync(targetSideCar)) return;
    fs.copyFileSync(sourceSideCar, targetSideCar);
  });
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
  const companyFolder = `${COMPANY_FOLDER_PREFIX}1`;
  const companyDir = path.join(rootDir, companyFolder);
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
      if (entry.isDirectory()) {
        copyDirMergeSync(sourcePath, targetPath);
        return;
      }
      if (entry.isFile() && !fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    } catch (err) {
      console.warn("Unable to copy legacy company entry:", sourcePath, err?.message || err);
    }
  });

  copyLegacyDbToCompany(rootDir, companyDir, companyFolder);
}

function ensureRegistryInitialized(rootDir) {
  const root = ensureRootDir(rootDir);
  const cacheKey = root;
  const cached = registryCache.get(cacheKey);
  if (cached) return deepClone(cached);

  const existing = readRegistryFromDisk(root);
  if (existing) {
    const normalized = sanitizeRegistry(existing, root);
    if (!normalized.companies.length) {
      const companyFolder = `${COMPANY_FOLDER_PREFIX}1`;
      fs.mkdirSync(path.join(root, companyFolder), { recursive: true });
      normalized.companies = [
        {
          id: companyFolder,
          folder: companyFolder,
          companyName: defaultCompanyNameForFolder(companyFolder),
          createdAt: nowIso()
        }
      ];
      normalized.activeCompanyId = companyFolder;
    }
    writeRegistryToDisk(root, normalized);
    registryCache.set(cacheKey, deepClone(normalized));
    return deepClone(normalized);
  }

  const hasLegacyDb = !!resolveLegacyDbPath(root);
  const hasLegacyEntries = hasLegacyRootEntries(root);
  if (hasLegacyDb || hasLegacyEntries) {
    migrateLegacyRootIntoEntreprise1(root);
  }

  let next = sanitizeRegistry({ companies: [], activeCompanyId: "" }, root);
  if (!next.companies.length) {
    const companyFolder = `${COMPANY_FOLDER_PREFIX}1`;
    fs.mkdirSync(path.join(root, companyFolder), { recursive: true });
    next = {
      companies: [
        {
          id: companyFolder,
          folder: companyFolder,
          companyName: defaultCompanyNameForFolder(companyFolder),
          createdAt: nowIso()
        }
      ],
      activeCompanyId: companyFolder
    };
  }

  if (hasLegacyDb || (hasLegacyEntries && next.companies.some((entry) => entry.id === "entreprise1"))) {
    const entreprise1 = next.companies.find((entry) => entry.id === "entreprise1");
    if (entreprise1) next.activeCompanyId = entreprise1.id;
  }

  writeRegistryToDisk(root, next);
  registryCache.set(cacheKey, deepClone(next));
  return deepClone(next);
}

function saveRegistry(rootDir, registry) {
  const root = ensureRootDir(rootDir);
  const normalized = sanitizeRegistry(registry, root);
  writeRegistryToDisk(root, normalized);
  registryCache.set(root, deepClone(normalized));
  return deepClone(normalized);
}

function listCompanies(rootDir) {
  const registry = ensureRegistryInitialized(rootDir);
  return registry.companies.map((entry) => ({ ...entry }));
}

function createCompany(rootDir, options = {}) {
  const root = ensureRootDir(rootDir);
  const registry = ensureRegistryInitialized(root);
  const physicalFolders = listCompanyFolders(root);
  const maxIdx = Math.max(
    0,
    ...registry.companies.map((entry) => parseFolderIndex(entry.folder) || 0),
    ...physicalFolders.map((folder) => parseFolderIndex(folder) || 0)
  );
  const nextIdx = maxIdx + 1;
  const folder = `${COMPANY_FOLDER_PREFIX}${nextIdx}`;
  const record = {
    id: folder,
    folder,
    companyName: normalizeCompanyName(options.companyName, defaultCompanyNameForFolder(folder)),
    createdAt: nowIso()
  };
  fs.mkdirSync(path.join(root, folder), { recursive: true });
  registry.companies.push(record);
  registry.companies.sort(compareCompanyFolders);
  if (options.setActive !== false || !registry.activeCompanyId) {
    registry.activeCompanyId = record.id;
  }
  saveRegistry(root, registry);
  return { ...record };
}

function setActiveCompany(rootDir, companyId) {
  const root = ensureRootDir(rootDir);
  const registry = ensureRegistryInitialized(root);
  const requested = normalizeFolderName(companyId) || String(companyId || "").trim();
  const target =
    registry.companies.find((entry) => entry.id === requested) ||
    registry.companies.find((entry) => entry.folder === requested);
  if (!target) {
    throw new Error("Company not found.");
  }
  registry.activeCompanyId = target.id;
  saveRegistry(root, registry);
  return { ...target };
}

function getActiveCompanyRecord(registry) {
  if (!registry || !Array.isArray(registry.companies) || !registry.companies.length) return null;
  return (
    registry.companies.find((entry) => entry.id === registry.activeCompanyId) ||
    registry.companies[0] ||
    null
  );
}

function getActiveCompanyPaths(rootDir) {
  const root = ensureRootDir(rootDir);
  const registry = ensureRegistryInitialized(root);
  const active = getActiveCompanyRecord(registry);
  if (!active) throw new Error("No active company available.");

  if (registry.activeCompanyId !== active.id) {
    registry.activeCompanyId = active.id;
    saveRegistry(root, registry);
  }

  const companyDir = path.join(root, active.folder);
  fs.mkdirSync(companyDir, { recursive: true });

  const dbFileName = active.folder;
  const dbPath = path.join(companyDir, dbFileName);
  return {
    rootDir: root,
    registryPath: getRegistryPath(root),
    activeCompanyId: active.id,
    id: active.id,
    folder: active.folder,
    companyName: active.companyName,
    createdAt: active.createdAt,
    companyDir,
    dbFileName,
    dbPath,
    paths: {
      root: root,
      company: companyDir,
      db: dbPath,
      pdf: path.join(companyDir, "pdf"),
      xml: path.join(companyDir, "xml"),
      exportedData: path.join(companyDir, "exportedData"),
      factures: path.join(companyDir, "Factures")
    }
  };
}

function updateActiveCompanyName(rootDir, companyName) {
  const root = ensureRootDir(rootDir);
  const registry = ensureRegistryInitialized(root);
  const active = getActiveCompanyRecord(registry);
  if (!active) return null;
  const nextName = normalizeCompanyName(companyName, active.companyName || defaultCompanyNameForFolder(active.folder));
  if (!nextName || active.companyName === nextName) return { ...active };
  const target = registry.companies.find((entry) => entry.id === active.id);
  if (!target) return null;
  target.companyName = nextName;
  saveRegistry(root, registry);
  return { ...target };
}

function getRegistrySnapshot(rootDir) {
  const registry = ensureRegistryInitialized(rootDir);
  return deepClone(registry);
}

module.exports = {
  REGISTRY_FILE_NAME,
  createCompany,
  listCompanies,
  setActiveCompany,
  getActiveCompanyPaths,
  getRegistrySnapshot,
  updateActiveCompanyName
};
