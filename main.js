// main.js
"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const http = require("http");
const crypto = require("crypto");
const os = require("os");
const { AsyncLocalStorage } = require("async_hooks");
const dns = require("node:dns");
const { spawn } = require("child_process");
const nodemailer = require("nodemailer");
let BonjourClass = null;
try {
  ({ Bonjour: BonjourClass } = require("bonjour-service"));
} catch {
  // bonjour-service is optional at runtime; LAN will still work via IP URLs
}
let setGlobalDispatcher = null;
let EnvHttpProxyAgent = null;
try {
  ({ setGlobalDispatcher, EnvHttpProxyAgent } = require("undici"));
} catch {
  // undici is optional in this app bundle
}

dns.setDefaultResultOrder("ipv4first");
const PROXY_ENABLED = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
if (PROXY_ENABLED && setGlobalDispatcher && EnvHttpProxyAgent) {
  const existingNoProxy = String(process.env.NO_PROXY || process.env.no_proxy || "");
  const entries = existingNoProxy
    ? existingNoProxy.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  const hasLocalhost = entries.some((entry) => entry === "localhost");
  const hasLoopback = entries.some((entry) => entry === "127.0.0.1");
  const nextEntries = [...entries];
  if (!hasLocalhost) nextEntries.push("localhost");
  if (!hasLoopback) nextEntries.push("127.0.0.1");
  if (nextEntries.length) {
    process.env.NO_PROXY = nextEntries.join(",");
  }
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const defaults = require("./src/renderer/config/defaults.js");
const { saveWithholdingXml } = require("./src/main/withholding-xml");
const { buildUnsignedTeifXml } = require("./src/main/teif-xml");
const { signTeifXml } = require("./src/main/idtrust-signer");
const FactDb = require("./src/main/db");
const CompanyManager = require("./src/main/company-manager");
const { hasCompanyContextMismatch } = require("./src/main/company-context-guards");
const APP_VERSION =
  typeof defaults?.APP_VERSION === "string" ? defaults.APP_VERSION.trim() : "";
const NORMALIZED_APP_VERSION =
  APP_VERSION && APP_VERSION.replace(/^v/i, "");
const DEFAULT_COMPANY_TEMPLATE =
  (defaults?.DEFAULT_COMPANY_TEMPLATE && typeof defaults.DEFAULT_COMPANY_TEMPLATE === "object")
    ? defaults.DEFAULT_COMPANY_TEMPLATE
    : (defaults?.DEFAULT_COMPANY && typeof defaults.DEFAULT_COMPANY === "object")
      ? defaults.DEFAULT_COMPANY
      : {};
const DEFAULT_COMPANY_NAME =
  (DEFAULT_COMPANY_TEMPLATE?.name && String(DEFAULT_COMPANY_TEMPLATE.name).trim()) ||
  "Facturance";
let BUNDLED_COMPANY_GROUP = null;
try {
  BUNDLED_COMPANY_GROUP = require("./src/renderer/config/generated-company-group.js");
} catch {
  try {
    const branding = require("./src/renderer/config/branding.js");
    BUNDLED_COMPANY_GROUP = branding?.companyGroup || null;
  } catch {
    BUNDLED_COMPANY_GROUP = null;
  }
}

function normalizeCompanyDisplayName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function getBundledGroupCompanyNames() {
  const group = BUNDLED_COMPANY_GROUP && typeof BUNDLED_COMPANY_GROUP === "object"
    ? BUNDLED_COMPANY_GROUP
    : null;
  if (!group) return [];
  if (String(group.mode || "").trim().toLowerCase() !== "group") return [];
  const source = Array.isArray(group.companies) ? group.companies : [];
  const seen = new Set();
  const out = [];
  source.forEach((entry) => {
    const name = normalizeCompanyDisplayName(entry);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  });
  return out;
}
function companyNameSlug(name, fallback = "company") {
  const normalized = String(name || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function sanitizeFileBase(value, fallback = "document") {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .trim();
  return cleaned || fallback;
}

function normalizeThumbprint(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function resolveIdTrustThumbprint() {
  const record = FactDb.loadSetting(IDTRUST_THUMBPRINT_KEY);
  const stored = record?.value;
  let thumbprint = "";
  if (typeof stored === "string") {
    thumbprint = stored;
  } else if (stored && typeof stored === "object") {
    thumbprint = stored.thumbprint || stored.idTrustThumbprint || "";
  }
  thumbprint = normalizeThumbprint(thumbprint);
  if (!thumbprint) {
    thumbprint = DEFAULT_IDTRUST_THUMBPRINT;
    try {
      FactDb.saveSetting({ key: IDTRUST_THUMBPRINT_KEY, value: thumbprint });
    } catch (err) {
      console.warn("Failed to persist default ID-Trust thumbprint", err);
    }
  }
  return thumbprint;
}

function buildSignedTeifPath(unsignedAbsPath) {
  const parsed = path.parse(unsignedAbsPath);
  const base = parsed.ext && parsed.ext.toLowerCase() === ".xml" ? parsed.name : parsed.base;
  return path.join(parsed.dir, `${base}.signed.xml`);
}
const DEFAULT_COMPANY_SLUG = companyNameSlug(DEFAULT_COMPANY_NAME, "Facturance");
const CLIENT_FIELD_SETTINGS_KEY = "client-field-settings";
const ARTICLE_FIELD_SETTINGS_KEY = "articles-field-settings";
const WITHHOLDING_FA_SETTINGS_KEY = "withholding-fa-settings";
const IDTRUST_THUMBPRINT_KEY = "idTrustThumbprint";
const DEFAULT_IDTRUST_THUMBPRINT = "0C3F79E3A28744FE011BB18767A0D531668F79F8";
const DOCUMENT_STORAGE_MODE = String(process.env.FACTURANCE_DOCUMENT_STORAGE || "database")
  .trim()
  .toLowerCase();
const DOCUMENTS_DB_ONLY = DOCUMENT_STORAGE_MODE === "database";
const isDocumentDbPath = (value) => !!FactDb.parseDocumentNumberFromPath(value);
const LEGACY_FS_STORAGE = String(process.env.FACTURANCE_LEGACY_FS || "off")
  .trim()
  .toLowerCase();
const CLIENTS_FS_ENABLED = LEGACY_FS_STORAGE === "on";
const ARTICLES_FS_ENABLED = LEGACY_FS_STORAGE === "on";

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

if (NORMALIZED_APP_VERSION) {
  try {
    app.setVersion(NORMALIZED_APP_VERSION);
  } catch (err) {
    console.warn("Unable to set app version from APP_VERSION", err);
  }
}

if (!app.isPackaged) {
  const programData = process.env.PROGRAMDATA || "C:\\ProgramData";
  const devData = path.join(programData, "Facturance", `${DEFAULT_COMPANY_SLUG}DevData`);
  app.setPath("userData", devData);
}
CompanyManager.configure({
  getUserDataDir: () => app.getPath("userData")
});
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

const isSquirrel =
  process.platform === "win32" &&
  process.argv.some((a) => a.startsWith("--squirrel"));
if (isSquirrel) app.quit();

const DEFAULT_WINDOW_BOUNDS = { width: 1150, height: 760 };
const MIN_WINDOW_BOUNDS = { width: 1024, height: 700 };
const SPLASH_WINDOW_BOUNDS = { width: 520, height: 300 };
const SPLASH_MIN_VISIBLE_MS = 2000;
const SHOW_MAIN_FALLBACK_MS = 90000;
const SHOW_MAIN_FALLBACK_RETRY_MS = 15000;
const MAIN_REVEAL_FADE_MS = 200;

let mainWindow;
let splashWindow;
let allowAppClose = false;
let mainWindowReady = false;
let mainWindowRendererReady = false;
let hasShownMainWindow = false;
let splashShownAt = 0;
let pendingRevealRequest = false;
let showMainFallbackTimer = null;
let revealMainTimer = null;

function clearShowFallback() {
  if (showMainFallbackTimer) {
    clearTimeout(showMainFallbackTimer);
    showMainFallbackTimer = null;
  }
}

function clearRevealMainTimer() {
  if (revealMainTimer) {
    clearTimeout(revealMainTimer);
    revealMainTimer = null;
  }
}

function scheduleShowFallback(delayMs = SHOW_MAIN_FALLBACK_MS) {
  clearShowFallback();
  showMainFallbackTimer = setTimeout(() => {
    void handleStartupFallback();
  }, Math.max(1000, Number(delayMs) || SHOW_MAIN_FALLBACK_MS));
}

function updateSplashLoadingMessage(label = "Still loading...") {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const message = String(label || "Still loading...").trim() || "Still loading...";
  const script = `
    (() => {
      const textEl = document.querySelector(".app-loader__text");
      if (textEl) textEl.textContent = ${JSON.stringify(message)};
      return true;
    })();
  `;
  splashWindow.webContents.executeJavaScript(script, true).catch(() => {});
}

async function handleStartupFallback() {
  if (hasShownMainWindow) return;
  updateSplashLoadingMessage("Still loading...");
  scheduleShowFallback(SHOW_MAIN_FALLBACK_RETRY_MS);
}

function closeSplashWindow({ destroy = true } = {}) {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    return;
  }
  if (destroy) splashWindow.destroy();
  else splashWindow.close();
  splashWindow = null;
}

function fadeInMainWindow(durationMs = MAIN_REVEAL_FADE_MS) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const duration = Math.max(0, Number(durationMs) || 0);
  if (duration <= 0) {
    mainWindow.setOpacity(1);
    return;
  }
  const startedAt = Date.now();
  const tick = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const elapsed = Date.now() - startedAt;
    const progress = Math.min(1, elapsed / duration);
    mainWindow.setOpacity(Math.max(0.01, progress));
    if (progress < 1) setTimeout(tick, 16);
  };
  tick();
}

function revealMainWindow() {
  if (hasShownMainWindow) return false;
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (!mainWindowReady) {
    pendingRevealRequest = true;
    return false;
  }
  clearRevealMainTimer();
  clearShowFallback();
  closeSplashWindow({ destroy: true });

  mainWindow.setMinimumSize(MIN_WINDOW_BOUNDS.width, MIN_WINDOW_BOUNDS.height);
  mainWindow.setOpacity(0.01);
  if (!mainWindow.isVisible()) mainWindow.show();
  if (!mainWindow.isMaximized()) mainWindow.maximize();
  hasShownMainWindow = true;
  pendingRevealRequest = false;
  fadeInMainWindow();
  mainWindow.focus();
  return true;
}

function scheduleMainRevealAfterMinimumSplash() {
  if (hasShownMainWindow || !mainWindowRendererReady) return;
  pendingRevealRequest = true;
  const elapsed = splashShownAt > 0 ? Date.now() - splashShownAt : SPLASH_MIN_VISIBLE_MS;
  const remaining = SPLASH_MIN_VISIBLE_MS - elapsed;
  clearRevealMainTimer();
  if (remaining > 0) {
    revealMainTimer = setTimeout(() => {
      revealMainTimer = null;
      revealMainWindow();
    }, remaining);
    return;
  }
  revealMainWindow();
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) return;
  splashWindow = new BrowserWindow({
    width: 520,
    height: 300,
    minWidth: SPLASH_WINDOW_BOUNDS.width,
    minHeight: SPLASH_WINDOW_BOUNDS.height,
    useContentSize: true,
    backgroundColor: "#00000000",
    center: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  splashWindow.once("ready-to-show", () => {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    splashWindow.show();
  });
  splashShownAt = Date.now();
  splashWindow.on("show", () => {
    splashShownAt = Date.now();
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
  splashWindow.loadFile(path.join(__dirname, "src", "renderer", "splash.html"));
}

function createMainWindow() {
  mainWindowReady = false;
  mainWindowRendererReady = false;
  hasShownMainWindow = false;
  pendingRevealRequest = false;
  clearRevealMainTimer();
  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_BOUNDS.width,
    height: DEFAULT_WINDOW_BOUNDS.height,
    minWidth: MIN_WINDOW_BOUNDS.width,
    minHeight: MIN_WINDOW_BOUNDS.height,
    backgroundColor: "#f3f4f6",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });
  Menu.setApplicationMenu(null);
  mainWindow.once("ready-to-show", () => {
    mainWindowReady = true;
    if (pendingRevealRequest || mainWindowRendererReady) {
      scheduleMainRevealAfterMinimumSplash();
    }
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    const isDevToolsCombo = (input.control || input.meta) && input.shift && key === "i";
    if (isDevToolsCombo || key === "f12") {
      event.preventDefault();
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });
  mainWindow.on("close", (event) => {
    if (allowAppClose || mainWindow?.webContents?.isDestroyed()) return;
    event.preventDefault();
    if (!mainWindow?.webContents?.isDestroyed()) {
      mainWindow.webContents.send("app:close-request");
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    allowAppClose = false;
    mainWindowReady = false;
    mainWindowRendererReady = false;
    hasShownMainWindow = false;
    pendingRevealRequest = false;
    clearRevealMainTimer();
    clearShowFallback();
    closeSplashWindow({ destroy: true });
  });
  mainWindow.loadFile(path.join(__dirname, "src", "renderer", "index.html"));
}

ipcMain.on("app:ready", () => {
  mainWindowRendererReady = true;
  scheduleMainRevealAfterMinimumSplash();
});
if (hasSingleInstanceLock) {
  app.on("second-instance", (_event, argv = []) => {
    if (mainWindow && mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.focus();
    } else {
      if (!splashWindow || splashWindow.isDestroyed()) createSplashWindow();
      if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
      scheduleShowFallback();
    }
  });
}

/* ---------- helpers ---------- */
function sanitizeFileName(name = "") {
  let out = String(name)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const base = out.split(".")[0]?.trim();
  if (!base || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) {
    out = `file-${Date.now()}`;
  }
  out = out.replace(/[.\s]+$/g, "");
  if (out.length > 120) out = out.slice(0, 120).trim();
  return out || "file";
}
function withPdfExt(name = "document") {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function docTypeLabelFromValue(val = "") {
  const v = String(val || "").toLowerCase();
  if (v === "fa") return "Facture d'achat";
  if (v === "devis") return "Devis";
  if (v === "bl") return "Bon de livraison";
  if (v === "bc") return "Bon de commande";
  if (v === "retenue") return "Retenue";
  return "Facture";
}
function normalizeDocTypeForIndex(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "facture";
  if (normalized === "fact" || normalized === "facture") return "facture";
  if (normalized === "fa" || normalized === "factureachat" || normalized === "facture-achat") return "fa";
  if (normalized === "devis" || normalized === "dev") return "devis";
  if (normalized === "bl" || normalized === "bonlivraison" || normalized === "bon-livraison") return "bl";
  if (normalized === "bc" || normalized === "boncommande" || normalized === "bon-commande") return "bc";
  if (normalized === "retenue" || normalized === "wh" || normalized === "rt") return "retenue";
  return normalized;
}
function compactDocBaseName(meta = {}, fallback = "Document") {
  const typeLabel = docTypeLabelFromValue(meta.docType);
  const safeType = sanitizeFileName(typeLabel).replace(/\s+/g, "");
  const safeNumber = sanitizeFileName(meta.number || "").replace(/\s+/g, "");
  const safeDate = sanitizeFileName(meta.date || todayStr()).replace(/\s+/g, "");
  const head = safeType + safeNumber;
  if (head && safeDate) return `${head}-${safeDate}`;
  if (head) return head;
  return safeDate || fallback;
}
function compactPdfBaseName(meta = {}, fallback = "Document") {
  const safeNumber = sanitizeFileName(meta.number || "").replace(/\s+/g, "");
  return safeNumber || fallback;
}
const DOC_TYPE_DIR_MAP = {
  facture: "Factures",
  fa: "Factures d'achat",
  devis: "Devis",
  bl: "Bon de livraison",
  bc: "Bon de commande",
  retenue: "Retenues"
};
const DOC_INDEX_RESET_TTL_MS = 30000;
const docIndexResetCache = new Map();
const ENTREPRISE_DIR_NAME = "Entreprise";
const FACTURANCE_ROOT_NAME = "FacturanceData";
const LAN_SERVER_DEFAULT_PORT = 8080;
const LAN_SERVER_DEFAULT_HOST = "0.0.0.0";
const LAN_MDNS_DEFAULT_NAME = "facturance";
const LAN_HTTP_REDIRECT_PORT = 80;
const ACTIVE_COMPANY_CHANGED_CHANNEL = "companies:activeChanged";
const COMPANY_CATALOG_CHANGED_CHANNEL = "companies:catalogChanged";
const LAN_COMPANY_CATALOG_EVENT = "company-catalog-changed";

let cachedFacturanceRootDir = null;
const blockedFacturanceRoots = new Set();
function normalizeFacturanceDir(dir) {
  try {
    return path.resolve(dir);
  } catch {
    return dir || "";
  }
}
function markFacturanceRootAsBlocked(dir) {
  const normalized = normalizeFacturanceDir(dir);
  if (normalized) blockedFacturanceRoots.add(normalized);
}
function isFacturanceRootBlocked(dir) {
  const normalized = normalizeFacturanceDir(dir);
  if (!normalized) return false;
  return blockedFacturanceRoots.has(normalized);
}
function getPreferredInstallDataDir() {
  const programData = process.env.PROGRAMDATA || "C:\\ProgramData";
  // Keep data outside the app install dir so uninstall/updates don't wipe it
  return path.join(programData, "Facturance", FACTURANCE_ROOT_NAME);
}
function ensureWritableDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-test-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch (err) {
    console.warn("Unable to ensure writable dir:", dir, err?.message || err);
    return false;
  }
}
const LEGACY_FACTURANCE_DIRS = [];
function migrateLegacyFacturanceDir(targetDir) {
  if (!targetDir) return;
  for (const legacy of LEGACY_FACTURANCE_DIRS) {
    if (!legacy || legacy === targetDir) continue;
    try {
      if (!fs.existsSync(legacy)) continue;
      const targetHasFiles = fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0;
      if (targetHasFiles) continue;
      ensureWritableDirSync(targetDir);
      fs.cpSync(legacy, targetDir, { recursive: true, force: false, errorOnExist: false });
      console.log("Migrated Facturance data directory from", legacy, "to", targetDir);
      break;
    } catch (err) {
      console.warn("Unable to migrate legacy Facturance data directory", legacy, err?.message || err);
    }
  }
}
async function copyFacturanceDataDir(sourceDir, targetDir) {
  if (!sourceDir || !targetDir || sourceDir === targetDir) return;
  try {
    if (!fs.existsSync(sourceDir)) return;
    const targetHasFiles = fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0;
    if (!targetHasFiles) {
      if (typeof fsp.cp === "function") {
        await fsp.cp(sourceDir, targetDir, { recursive: true, errorOnExist: false });
      } else {
        fs.cpSync(sourceDir, targetDir, { recursive: true, force: false, errorOnExist: false });
      }
      console.log("Copied Facturance data directory from", sourceDir, "to", targetDir);
    }
  } catch (err) {
    console.warn("Unable to copy Facturance data directory", sourceDir, "to", targetDir, err?.message || err);
  }
}
async function relocateFacturanceRootDir(failedRoot) {
  const current = failedRoot || cachedFacturanceRootDir;
  if (current) markFacturanceRootAsBlocked(current);
  cachedFacturanceRootDir = null;
  desktopRendererCompanyContext.clear();
  lanSessionContexts.clear();
  const nextRoot = getFacturanceRootDir();
  if (nextRoot && current && nextRoot !== current) {
    try {
      await copyFacturanceDataDir(current, nextRoot);
    } catch {
      // best-effort copy; continue even if it fails
    }
  }
  try {
    refreshActiveCompanyContext();
  } catch (err) {
    console.warn("Unable to refresh active company context after root relocation", err);
  }
  return nextRoot;
}
function getFacturanceRootDir() {
  if (cachedFacturanceRootDir && !isFacturanceRootBlocked(cachedFacturanceRootDir)) {
    return cachedFacturanceRootDir;
  }
  const preferred = getPreferredInstallDataDir();
  const candidates = [preferred]
    .filter(Boolean)
    .map((p) => normalizeFacturanceDir(p))
    .filter((p, idx, arr) => p && arr.indexOf(p) === idx && !isFacturanceRootBlocked(p));
  for (const candidate of candidates) {
    ensureWritableDirSync(candidate);
    cachedFacturanceRootDir = candidate;
    migrateLegacyFacturanceDir(candidate);
    return candidate;
  }
  cachedFacturanceRootDir = preferred || "";
  return cachedFacturanceRootDir;
}

function seedBundledGroupCompanies(rootDir) {
  const bundledCompanyNames = getBundledGroupCompanyNames();
  if (!bundledCompanyNames.length) return;
  const root = rootDir || getFacturanceRootDir();
  let companies = CompanyManager.listCompanies(root);
  let safety = 0;
  while (companies.length < bundledCompanyNames.length && safety < 256) {
    const nextName = bundledCompanyNames[companies.length] || "";
    CompanyManager.createCompany(root, {
      setActive: false,
      displayName: nextName
    });
    companies = CompanyManager.listCompanies(root);
    safety += 1;
  }
  companies.forEach((company, index) => {
    const name = bundledCompanyNames[index] || "";
    if (!company?.id || !name) return;
    try {
      CompanyManager.setCompanyDisplayName(root, company.id, name, { ifEmpty: true });
    } catch (err) {
      console.warn("Unable to seed bundled company display name", company.id, err?.message || err);
    }
  });
}

function resolveRequestedCompanyId(payload = {}) {
  if (typeof payload === "string") return String(payload).trim();
  if (!payload || typeof payload !== "object") return "";
  return String(payload.id ?? payload.companyId ?? payload.activeCompanyId ?? "").trim();
}

const companyRequestContextStorage = new AsyncLocalStorage();
const desktopRendererCompanyContext = new Map();
const lanSessionContexts = new Map();
const LAN_SESSION_COOKIE_NAME = "facturance_sid";
const LAN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LAN_SESSION_COOKIE_MAX_AGE_SEC = Math.floor(LAN_SESSION_TTL_MS / 1000);

function normalizeCompanyIdForContext(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^entreprise\d+$/i.test(normalized) ? normalized : "";
}

function createFallbackActiveCompanyPaths(rootDir) {
  return {
    rootDir,
    activeCompanyId: "entreprise1",
    id: "entreprise1",
    name: CompanyManager.getCompanyDisplayName(rootDir, "entreprise1") || "entreprise1",
    folder: "entreprise1",
    companyDir: path.join(rootDir, "entreprise1"),
    dbFileName: "entreprise1.db",
    dbPath: path.join(rootDir, "entreprise1", "entreprise1.db"),
    paths: {
      root: rootDir,
      company: path.join(rootDir, "entreprise1"),
      db: path.join(rootDir, "entreprise1", "entreprise1.db"),
      pdf: path.join(rootDir, "entreprise1", "pdf"),
      xml: path.join(rootDir, "entreprise1", "xml"),
      exportedData: path.join(rootDir, "entreprise1", "exportedData"),
      factures: path.join(rootDir, "entreprise1", "Factures")
    }
  };
}

function resolveDefaultCompanyPaths() {
  const rootDir = getFacturanceRootDir();
  seedBundledGroupCompanies(rootDir);
  try {
    return CompanyManager.getActiveCompanyPaths(rootDir);
  } catch (err) {
    console.error("Unable to resolve default company paths", err);
    return createFallbackActiveCompanyPaths(rootDir);
  }
}

function resolveCompanyPathsById(companyId, options = {}) {
  const rootDir = getFacturanceRootDir();
  seedBundledGroupCompanies(rootDir);
  const normalized = normalizeCompanyIdForContext(companyId);
  if (!normalized) {
    if (options?.fallbackToDefault === false) {
      throw new Error("Invalid company id.");
    }
    return resolveDefaultCompanyPaths();
  }
  const paths = CompanyManager.getCompanyPaths(rootDir, normalized);
  if (!paths || String(paths.id || "").toLowerCase() !== normalized) {
    if (options?.fallbackToDefault === false) {
      throw new Error("Company not found.");
    }
    return resolveDefaultCompanyPaths();
  }
  return paths;
}

function withCompanyRequestContext(context = {}, fn) {
  if (typeof fn !== "function") {
    throw new Error("Company request context wrapper requires a callback.");
  }
  const initialPaths =
    context?.companyPaths && typeof context.companyPaths === "object"
      ? context.companyPaths
      : resolveCompanyPathsById(
          context?.companyId || context?.activeCompanyId || "",
          { fallbackToDefault: true }
        );
  const scopedContext = {
    ...(context && typeof context === "object" ? context : {}),
    companyId: initialPaths.id,
    activeCompanyId: initialPaths.id,
    companyPaths: initialPaths
  };
  return companyRequestContextStorage.run(scopedContext, () =>
    FactDb.runWithContext(
      {
        rootDir: initialPaths.companyDir,
        filename: initialPaths.dbFileName
      },
      () => fn(scopedContext)
    )
  );
}

function getCurrentCompanyRequestContext() {
  const scoped = companyRequestContextStorage.getStore();
  return scoped && typeof scoped === "object" ? scoped : null;
}

function listCompanyCatalog() {
  const rootDir = getFacturanceRootDir();
  seedBundledGroupCompanies(rootDir);
  return CompanyManager.listCompanies(rootDir);
}

function buildCatalogChangePayload(reason = "updated") {
  const companies = listCompanyCatalog();
  return {
    reason: String(reason || "updated"),
    updatedAt: new Date().toISOString(),
    companies
  };
}

function ensureDesktopRendererContext(webContents) {
  const webContentsId = Number(webContents?.id);
  const fallback = resolveDefaultCompanyPaths();
  if (!Number.isFinite(webContentsId) || webContentsId <= 0) {
    return {
      clientId: 0,
      companyId: fallback.id,
      companyPaths: fallback
    };
  }
  let entry = desktopRendererCompanyContext.get(webContentsId);
  if (!entry || !entry.companyId) {
    entry = { companyId: fallback.id, updatedAt: Date.now() };
    desktopRendererCompanyContext.set(webContentsId, entry);
    if (webContents && typeof webContents.once === "function") {
      webContents.once("destroyed", () => {
        desktopRendererCompanyContext.delete(webContentsId);
      });
    }
  }
  const companyPaths = resolveCompanyPathsById(entry.companyId, { fallbackToDefault: true });
  if (entry.companyId !== companyPaths.id) {
    entry.companyId = companyPaths.id;
    entry.updatedAt = Date.now();
    desktopRendererCompanyContext.set(webContentsId, entry);
  }
  return {
    clientId: webContentsId,
    companyId: entry.companyId,
    companyPaths
  };
}

function setDesktopRendererCompany(webContents, companyId) {
  const webContentsId = Number(webContents?.id);
  if (!Number.isFinite(webContentsId) || webContentsId <= 0) {
    return resolveCompanyPathsById(companyId, { fallbackToDefault: false });
  }
  const nextPaths = resolveCompanyPathsById(companyId, { fallbackToDefault: false });
  desktopRendererCompanyContext.set(webContentsId, {
    companyId: nextPaths.id,
    updatedAt: Date.now()
  });
  return nextPaths;
}

function emitRendererCompanyChanged(webContents, payload = {}) {
  if (!webContents || webContents.isDestroyed?.()) return;
  try {
    webContents.send(ACTIVE_COMPANY_CHANGED_CHANNEL, payload);
  } catch {}
}

function parseCookieHeader(headerValue = "") {
  const out = {};
  String(headerValue || "")
    .split(";")
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      const idx = token.indexOf("=");
      if (idx <= 0) return;
      const key = token.slice(0, idx).trim();
      const value = token.slice(idx + 1).trim();
      if (!key) return;
      out[key] = value;
    });
  return out;
}

function pruneLanSessions(now = Date.now()) {
  Array.from(lanSessionContexts.entries()).forEach(([sessionId, session]) => {
    const touchedAt = Number(session?.touchedAt || 0);
    if (!touchedAt || now - touchedAt > LAN_SESSION_TTL_MS) {
      lanSessionContexts.delete(sessionId);
    }
  });
}

function createLanSessionContext() {
  const defaultPaths = resolveDefaultCompanyPaths();
  return {
    id: crypto.randomBytes(24).toString("hex"),
    companyId: defaultPaths.id,
    createdAt: Date.now(),
    touchedAt: Date.now()
  };
}

function ensureLanSessionContext(req, res) {
  pruneLanSessions();
  const cookies = parseCookieHeader(req?.headers?.cookie || "");
  const cookieSid = String(cookies[LAN_SESSION_COOKIE_NAME] || "").trim();
  let session = cookieSid ? lanSessionContexts.get(cookieSid) : null;
  if (!session) {
    session = createLanSessionContext();
    lanSessionContexts.set(session.id, session);
    try {
      res.setHeader(
        "Set-Cookie",
        `${LAN_SESSION_COOKIE_NAME}=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LAN_SESSION_COOKIE_MAX_AGE_SEC}`
      );
    } catch {}
  }
  session.touchedAt = Date.now();
  return session;
}

function getLanSessionCompanyPaths(session) {
  if (!session || typeof session !== "object") {
    return resolveDefaultCompanyPaths();
  }
  const paths = resolveCompanyPathsById(session.companyId, { fallbackToDefault: true });
  if (session.companyId !== paths.id) {
    session.companyId = paths.id;
    session.touchedAt = Date.now();
  }
  return paths;
}

function setLanSessionCompany(session, companyId) {
  if (!session || typeof session !== "object") {
    throw new Error("LAN session is unavailable.");
  }
  const paths = resolveCompanyPathsById(companyId, { fallbackToDefault: false });
  session.companyId = paths.id;
  session.touchedAt = Date.now();
  return paths;
}

function broadcastCompanyCatalogChange(payload = {}) {
  const data = payload && typeof payload === "object" ? payload : buildCatalogChangePayload("updated");
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win || win.isDestroyed()) return;
    try {
      win.webContents.send(COMPANY_CATALOG_CHANGED_CHANNEL, data);
    } catch {}
  });
  pushLanCatalogEvent(data);
}

function buildCompanySwitchSnapshot(activePaths) {
  const active =
    activePaths && typeof activePaths === "object" ? activePaths : getActiveCompanyPaths();
  const root = getFacturanceRootDir();
  let profile = null;
  try {
    profile = FactDb.loadCompanyProfile();
  } catch (err) {
    console.warn("Unable to load company profile during company switch", err);
  }
  const profileData = profile && typeof profile === "object" ? profile : {};
  const profileName = normalizeCompanyDisplayName(profileData?.name || "");
  if (profileName) {
    CompanyManager.setCompanyDisplayName(root, active.id, profileName, {
      ifEmpty: true
    });
  }
  const fallbackName = CompanyManager.getCompanyDisplayName(root, active.id) || active.id;
  const company =
    !String(profileData?.name || "").trim() && fallbackName
      ? { ...profileData, name: fallbackName }
      : profileData;
  let smtpProfiles = {};
  try {
    const loaded = FactDb.loadSmtpSettings();
    smtpProfiles = loaded && typeof loaded === "object" ? loaded : {};
  } catch (err) {
    console.warn("Unable to load SMTP profiles during company switch", err);
  }
  return {
    activeCompanyId: active.id,
    activeCompany: active,
    company,
    smtpProfiles
  };
}

function createCompanyRuntime(payload = {}, options = {}) {
  const root = getFacturanceRootDir();
  seedBundledGroupCompanies(root);
  const created = CompanyManager.createCompany(root, {
    setActive: false,
    displayName: payload?.name || payload?.displayName
  });
  broadcastCompanyCatalogChange(buildCatalogChangePayload("created"));

  const shouldSetActive = payload?.setActive !== false;
  if (!shouldSetActive) {
    const current = getActiveCompanyPaths();
    return {
      company: created,
      switched: false,
      activeCompanyId: current.id,
      activeCompany: current
    };
  }
  const switched = switchActiveCompanyRuntime(
    { id: created.id },
    { source: options?.source || payload?.source || "unknown", emitLocalEvent: true }
  );
  return {
    company: created,
    switched: !!switched.switched,
    activeCompanyId: switched.activeCompanyId,
    activeCompany: switched.activeCompany
  };
}

function switchActiveCompanyRuntime(payload = {}, options = {}) {
  const requestedId = resolveRequestedCompanyId(payload);
  if (!requestedId) {
    throw new Error("Invalid company id.");
  }
  const scoped = getCurrentCompanyRequestContext();
  const previous = getActiveCompanyPaths();
  const nextPaths = resolveCompanyPathsById(requestedId, { fallbackToDefault: false });
  const switched = String(previous?.id || "") !== String(nextPaths?.id || "");

  if (scoped?.scope === "desktop" && scoped?.webContents) {
    setDesktopRendererCompany(scoped.webContents, nextPaths.id);
  } else if (scoped?.scope === "lan" && scoped?.session) {
    setLanSessionCompany(scoped.session, nextPaths.id);
  }

  const response = withCompanyRequestContext(
    {
      ...(scoped && typeof scoped === "object" ? scoped : {}),
      companyId: nextPaths.id,
      companyPaths: nextPaths
    },
    () => {
      const snapshot = buildCompanySwitchSnapshot(nextPaths);
      return {
        switched,
        ...snapshot
      };
    }
  );

  if (scoped?.scope === "desktop" && scoped?.webContents && options?.emitLocalEvent !== false) {
    emitRendererCompanyChanged(scoped.webContents, {
      source: options?.source || payload?.source || "desktop",
      switched,
      switchedAt: new Date().toISOString(),
      activeCompanyId: response.activeCompanyId,
      activeCompany: response.activeCompany,
      snapshot: {
        company: response.company || {},
        smtpProfiles: response.smtpProfiles || {}
      }
    });
  }

  return response;
}

function getActiveCompanyPaths() {
  const scoped = getCurrentCompanyRequestContext();
  if (scoped?.companyPaths && typeof scoped.companyPaths === "object") {
    return scoped.companyPaths;
  }
  return resolveDefaultCompanyPaths();
}

function getActiveCompanyDataDir() {
  return getActiveCompanyPaths()?.companyDir || getFacturanceRootDir();
}

function getActiveCompanyId() {
  return String(getActiveCompanyPaths()?.id || "").trim();
}

function refreshActiveCompanyContext() {
  return getActiveCompanyPaths();
}

function withIpcSenderCompanyContext(event, fn) {
  if (typeof fn !== "function") return undefined;
  const sender = event?.sender;
  if (!sender) return withCompanyRequestContext({}, fn);
  const rendererContext = ensureDesktopRendererContext(sender);
  return withCompanyRequestContext(
    {
      scope: "desktop",
      source: "desktop-ipc",
      clientId: rendererContext.clientId,
      webContents: sender,
      companyId: rendererContext.companyId,
      companyPaths: rendererContext.companyPaths
    },
    fn
  );
}

const ipcMainHandleBase = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, listener) =>
  ipcMainHandleBase(channel, (event, ...args) =>
    withIpcSenderCompanyContext(event, () => listener(event, ...args))
  );

const ipcMainOnBase = ipcMain.on.bind(ipcMain);
ipcMain.on = (channel, listener) =>
  ipcMainOnBase(channel, (event, ...args) =>
    withIpcSenderCompanyContext(event, () => listener(event, ...args))
  );

try {
  const defaultPaths = resolveDefaultCompanyPaths();
  FactDb.configure({
    getRootDir: () => defaultPaths.companyDir,
    filename: defaultPaths.dbFileName
  });
} catch (err) {
  console.error("Unable to initialize multi-company storage context", err);
  FactDb.configure({
    getRootDir: () => path.join(getFacturanceRootDir(), "entreprise1"),
    filename: "entreprise1.db"
  });
}
function formatMonthYearSegment(dateLike) {
  const fallback = new Date();
  let dt = fallback;
  if (dateLike) {
    const parsed = new Date(dateLike);
    if (!Number.isNaN(parsed?.getTime())) dt = parsed;
  }
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = String(dt.getFullYear());
  return {
    yearSegment: year,
    monthYearSegment: `${month}_${year}`
  };
}
function formatYearMonthSegments(dateLike) {
  const fallback = new Date();
  let dt = fallback;
  if (dateLike) {
    const parsed = new Date(dateLike);
    if (!Number.isNaN(parsed?.getTime())) dt = parsed;
  }
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = String(dt.getFullYear());
  return { yearSegment: year, monthSegment: month };
}
function resolveWithholdingPdfDir(meta = {}) {
  const docType = String(meta.docType || "").toLowerCase();
  if (docType !== "retenue") return "";
  const sourceType = String(
    meta.withholdingDocType || meta.sourceDocType || meta.parentDocType || ""
  ).toLowerCase();
  let subDir = "";
  if (sourceType === "fa") subDir = "factureAchat";
  else if (sourceType === "facture") subDir = "facture";
  else return "";
  const base = ensureDocTypeBaseDir("retenue", ["pdf"]);
  const { yearSegment, monthSegment } = formatYearMonthSegments(meta.date);
  const dir = path.join(base, subDir, yearSegment, monthSegment);
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (err) {
    console.error("Unable to prepare withholding pdf directory:", err);
    return getActiveCompanyDataDir();
  }
}
function ensureDocTypeBaseDir(docType = "facture", extraSegments = []) {
  const key = String(docType || "facture").toLowerCase();
  const sub = DOC_TYPE_DIR_MAP[key] || DOC_TYPE_DIR_MAP.facture;
  const segments = Array.isArray(extraSegments)
    ? extraSegments.filter(Boolean)
    : (extraSegments ? [extraSegments] : []);
  const dir = path.join(getActiveCompanyDataDir(), ...segments, sub);
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (err) {
    console.error("Unable to prepare doc-type base directory:", err);
    return getActiveCompanyDataDir();
  }
}
function resolveDocPeriodKey(dateLike) {
  const parsedRaw = dateLike ? new Date(dateLike) : new Date();
  const parsed = Number.isFinite(parsedRaw.getTime()) ? parsedRaw : new Date();
  const year = String(parsed.getFullYear()).slice(-2);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
function maybeResetDocumentIndex(docType = "facture", dateLike) {
  return;
}
function ensureDocTypeDirSync(meta = {}, extraSegments = []) {
  const base = ensureDocTypeBaseDir(meta.docType, extraSegments);
  const { yearSegment, monthYearSegment } = formatMonthYearSegment(meta.date);
  const dir = path.join(base, yearSegment, monthYearSegment);
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (err) {
    console.error("Unable to prepare doc-type directory:", err);
    return getActiveCompanyDataDir();
  }
}
function resolveSaveDir(meta = {}) {
  if (meta.to === "desktop") return app.getPath("desktop");
  if (meta.to === "invoices") return ensureDocTypeDirSync(meta);
  if (meta.to === "pdf") {
    const withholdingDir = resolveWithholdingPdfDir(meta);
    if (withholdingDir) return withholdingDir;
    return ensureDocTypeDirSync(meta, ["pdf"]);
  }
  if (meta.useSameDirAs) return path.dirname(meta.useSameDirAs);
  if (meta.saveDir) return meta.saveDir;
  if (meta.docType) return ensureDocTypeDirSync(meta);
  return ensureDocTypeDirSync(meta);
}

async function ensureEntrepriseDir() {
  const dir = path.join(getActiveCompanyDataDir(), ENTREPRISE_DIR_NAME);
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function getClientExportDir() {
  return path.join(getActiveCompanyDataDir(), "exportedData", "clientData");
}

function getDocumentExportDir() {
  return path.join(getActiveCompanyDataDir(), "exportedData", "documentData");
}

function getPurchaseInvoiceExportDir() {
  return path.join(getActiveCompanyDataDir(), "exportedData", "facture-achat");
}

function getModelExportDir() {
  return path.join(getActiveCompanyDataDir(), "exportedData", "modeles");
}

function sanitizeCompanyPayload(payload = {}) {
  try {
    return JSON.parse(JSON.stringify(payload || {}));
  } catch {
    return {};
  }
}

function ensureUniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const { dir, name, ext } = path.parse(filePath);
  let i = 2;
  let candidate = path.join(dir, `${name} (${i})${ext}`);
  while (fs.existsSync(candidate)) {
    i += 1;
    candidate = path.join(dir, `${name} (${i})${ext}`);
  }
  return candidate;
}

function buildHtmlDoc(html, css, baseHref) {
  const safeBase = typeof baseHref === "string" && baseHref ? String(baseHref) : "";
  const baseTag = safeBase ? `  <base href="${safeBase}">\n` : "";
  const pdfFontStack =
    '"Segoe UI", "Helvetica Neue", Arial, Helvetica, "Liberation Sans", "Noto Sans", "DejaVu Sans", sans-serif';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
${baseTag}  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    ${css || ""}
    html, body { margin:0; padding:0; background:#fff; font-family:${pdfFontStack}; }
  </style>
</head>
<body>${html || ""}</body>
</html>`;
}

async function renderToPdfBuffer(html, css) {
  const baseDir = "file://" + path.join(__dirname, "src", "renderer").replace(/\\/g, "/") + "/";
  const doc = buildHtmlDoc(html, css, baseDir);
  let win;
  try {
    win = new BrowserWindow({
      show: false,
      backgroundColor: "#ffffff",
      width: 900,
      height: 1273,
      webPreferences: { sandbox: true, offscreen: true },
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(doc)}`, {
      baseURLForDataURL: baseDir
    });
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      marginsType: 1,
      pageSize: "A4",
      landscape: false,
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
  }
}

async function printHtmlSilent(html, css, printOptions = {}) {
  const baseDir = "file://" + path.join(__dirname, "src", "renderer").replace(/\\/g, "/") + "/";
  const doc = buildHtmlDoc(html, css, baseDir);
  let win;
  try {
    win = new BrowserWindow({
      show: false,
      backgroundColor: "#ffffff",
      width: 900,
      height: 1273,
      webPreferences: { sandbox: true },
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(doc)}`, {
      baseURLForDataURL: baseDir
    });

    const settings = {
      silent: printOptions.silent !== false,
      printBackground: printOptions.printBackground !== false,
    };
    let deviceName = typeof printOptions.deviceName === "string" ? printOptions.deviceName.trim() : "";
    if (settings.silent && !deviceName) {
      try {
        const printers = await win.webContents.getPrintersAsync();
        const defaultPrinter = printers.find((printer) => printer.isDefault);
        if (defaultPrinter?.name) deviceName = defaultPrinter.name;
      } catch (err) {
        console.warn("silent print: getPrintersAsync failed", err);
      }
    }
    if (deviceName) settings.deviceName = deviceName;
    if (settings.silent && !settings.deviceName) {
      return { ok: false, error: "No default printer configured." };
    }

    return await new Promise((resolve) => {
      win.webContents.print(settings, (success, failureReason) => {
        if (success) return resolve({ ok: true });
        return resolve({ ok: false, error: failureReason || "Print failed." });
      });
    });
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
  }
}

/* ---------- LAN server ---------- */
const LAN_MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".xml": "application/xml; charset=utf-8",
  ".wasm": "application/wasm"
};

let lanServer = null;
let lanServerPort = LAN_SERVER_DEFAULT_PORT;
let lanServerHost = LAN_SERVER_DEFAULT_HOST;
let lanServerRootDir = "";
let lanServerMdnsName = LAN_MDNS_DEFAULT_NAME;
let lanServerMdns = null;
let lanServerMdnsService = null;
let lanServerMdnsPublished = false;
let lanServerMdnsError = "";
let lanRedirectServer = null;
let lanRedirectEnabled = false;
let lanRedirectError = "";
const lanCatalogEventClients = new Set();

function closeLanCatalogEventClient(client) {
  if (!client || typeof client !== "object") return;
  lanCatalogEventClients.delete(client);
  if (client.heartbeat) {
    clearInterval(client.heartbeat);
    client.heartbeat = null;
  }
  try {
    if (client.res && !client.res.writableEnded) {
      client.res.end();
    }
  } catch {}
}

function closeLanCatalogEventClients() {
  Array.from(lanCatalogEventClients).forEach((client) => {
    closeLanCatalogEventClient(client);
  });
}

function pushLanCatalogEvent(payload = {}) {
  if (!lanCatalogEventClients.size) return;
  const serialized = JSON.stringify(payload && typeof payload === "object" ? payload : {});
  const packet = `event: ${LAN_COMPANY_CATALOG_EVENT}\ndata: ${serialized}\n\n`;
  Array.from(lanCatalogEventClients).forEach((client) => {
    if (!client || !client.res || client.res.destroyed || client.res.writableEnded) {
      closeLanCatalogEventClient(client);
      return;
    }
    try {
      client.res.write(packet);
    } catch {
      closeLanCatalogEventClient(client);
    }
  });
}

function registerLanCatalogEventClient(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  try {
    res.write(": connected\n\n");
  } catch {}

  const client = {
    req,
    res,
    heartbeat: null
  };
  client.heartbeat = setInterval(() => {
    if (!res || res.writableEnded || res.destroyed) {
      closeLanCatalogEventClient(client);
      return;
    }
    try {
      res.write(": ping\n\n");
    } catch {
      closeLanCatalogEventClient(client);
    }
  }, 25000);
  lanCatalogEventClients.add(client);

  const initialPayload = buildCatalogChangePayload("init");
  try {
    const serialized = JSON.stringify(initialPayload);
    res.write(`event: ${LAN_COMPANY_CATALOG_EVENT}\ndata: ${serialized}\n\n`);
  } catch {
    closeLanCatalogEventClient(client);
    return;
  }

  const cleanup = () => {
    closeLanCatalogEventClient(client);
  };
  req.on("close", cleanup);
  req.on("aborted", cleanup);
  res.on("close", cleanup);
}

function normalizeLanPort(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0 && num <= 65535) return Math.trunc(num);
  return LAN_SERVER_DEFAULT_PORT;
}

function normalizeLanMdnsName(value) {
  const raw = String(value || "").trim();
  if (!raw) return LAN_MDNS_DEFAULT_NAME;
  const cleaned = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 63);
  return cleaned || LAN_MDNS_DEFAULT_NAME;
}

function getLanMdnsHost() {
  return `${normalizeLanMdnsName(lanServerMdnsName)}.local`;
}

function getLanServerRootDir() {
  const appRoot = app.getAppPath();
  const candidates = [
    path.join(appRoot, "src", "renderer"),
    path.join(__dirname, "src", "renderer")
  ];
  return candidates.find((dir) => dir && fs.existsSync(dir)) || candidates[0];
}

function listLanAddresses() {
  const seen = new Set();
  const result = [];
  const nets = os.networkInterfaces();
  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== "IPv4" || entry.internal) return;
      if (seen.has(entry.address)) return;
      seen.add(entry.address);
      result.push(entry.address);
    });
  });
  return result;
}

function buildLanServerUrls(port) {
  const urls = new Set();
  const redirectRunning = !!(lanRedirectServer && lanRedirectServer.listening);
  const mdnsHost = lanServerMdnsPublished ? getLanMdnsHost() : "";
  if (mdnsHost) {
    if (redirectRunning) urls.add(`http://${mdnsHost}`);
    if (port) urls.add(`http://${mdnsHost}:${port}`);
  }
  if (port) {
    if (redirectRunning) urls.add("http://localhost");
    urls.add(`http://localhost:${port}`);
    listLanAddresses().forEach((ip) => {
      if (redirectRunning) urls.add(`http://${ip}`);
      urls.add(`http://${ip}:${port}`);
    });
  }
  return Array.from(urls);
}

function buildLanStatusWarnings() {
  const warnings = [];
  if (lanServerMdnsError) warnings.push(lanServerMdnsError);
  if (lanRedirectEnabled && lanRedirectError) warnings.push(lanRedirectError);
  return warnings;
}

function getLanServerStatus() {
  const running = !!(lanServer && lanServer.listening);
  let port = lanServerPort;
  if (running) {
    const address = lanServer.address();
    if (address && typeof address === "object" && address.port) {
      port = address.port;
    }
  }
  const urls = running ? buildLanServerUrls(port) : [];
  const mdnsHost = getLanMdnsHost();
  const warnings = buildLanStatusWarnings();
  const status = {
    ok: true,
    running,
    port,
    host: lanServerHost,
    urls,
    mdns: {
      name: normalizeLanMdnsName(lanServerMdnsName),
      host: mdnsHost,
      published: lanServerMdnsPublished,
      url: `http://${mdnsHost}:${port}`,
      error: lanServerMdnsError || ""
    },
    redirectHttp80: {
      enabled: lanRedirectEnabled,
      running: !!(lanRedirectServer && lanRedirectServer.listening),
      port: LAN_HTTP_REDIRECT_PORT,
      url: `http://${mdnsHost}`,
      error: lanRedirectError || ""
    }
  };
  if (warnings.length) status.warnings = warnings;
  return status;
}

function stopLanMdnsAdvertisement({ preserveName = false, resetError = true } = {}) {
  lanServerMdnsPublished = false;
  if (lanServerMdnsService) {
    try {
      if (typeof lanServerMdnsService.stop === "function") {
        lanServerMdnsService.stop(() => {});
      }
    } catch {}
    lanServerMdnsService = null;
  }
  if (lanServerMdns) {
    try {
      if (typeof lanServerMdns.unpublishAll === "function") {
        lanServerMdns.unpublishAll(() => {});
      }
    } catch {}
    try {
      if (typeof lanServerMdns.destroy === "function") {
        lanServerMdns.destroy();
      }
    } catch {}
    lanServerMdns = null;
  }
  if (!preserveName) lanServerMdnsName = LAN_MDNS_DEFAULT_NAME;
  if (resetError) lanServerMdnsError = "";
}

function startLanMdnsAdvertisement(port, mdnsName = LAN_MDNS_DEFAULT_NAME) {
  const normalizedName = normalizeLanMdnsName(mdnsName);
  const mdnsHost = `${normalizedName}.local`;
  lanServerMdnsName = normalizedName;
  stopLanMdnsAdvertisement({ preserveName: true, resetError: false });
  lanServerMdnsError = "";
  if (!BonjourClass) {
    lanServerMdnsError = "Publication mDNS indisponible (module bonjour-service manquant).";
    return { ok: false, code: "MDNS_UNAVAILABLE", error: lanServerMdnsError };
  }
  try {
    lanServerMdns = new BonjourClass();
    lanServerMdnsService = lanServerMdns.publish({
      name: normalizedName,
      host: mdnsHost,
      type: "http",
      port,
      txt: { app: "facturance" }
    });
    lanServerMdnsPublished = true;
    if (lanServerMdnsService && typeof lanServerMdnsService.on === "function") {
      lanServerMdnsService.on("up", () => {
        lanServerMdnsPublished = true;
      });
      lanServerMdnsService.on("down", () => {
        lanServerMdnsPublished = false;
      });
      lanServerMdnsService.on("error", (err) => {
        lanServerMdnsPublished = false;
        lanServerMdnsError = String(err?.message || err || "Erreur mDNS.");
      });
    }
    return { ok: true };
  } catch (err) {
    lanServerMdnsPublished = false;
    lanServerMdnsError = String(err?.message || err || "Erreur mDNS.");
    return { ok: false, code: "MDNS_START_FAILED", error: lanServerMdnsError };
  }
}

function extractRedirectHostFromHeader(hostHeader) {
  const raw = String(hostHeader || "").trim();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const closing = raw.indexOf("]");
    return closing >= 0 ? raw.slice(0, closing + 1) : raw;
  }
  const host = raw.split(":")[0] || "";
  return host.trim();
}

function buildLanRedirectLocation(req) {
  let host = extractRedirectHostFromHeader(req?.headers?.host);
  if (!host) {
    host = getLanMdnsHost() || listLanAddresses()[0] || "localhost";
  }
  const needsPort = lanServerPort !== LAN_HTTP_REDIRECT_PORT;
  const rawPath = typeof req?.url === "string" && req.url ? req.url : "/";
  const pathWithSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `http://${host}${needsPort ? `:${lanServerPort}` : ""}${pathWithSlash}`;
}

function handleLanRedirectRequest(req, res) {
  const location = buildLanRedirectLocation(req);
  res.statusCode = 307;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

async function stopLanRedirectServer({ resetError = true } = {}) {
  if (!lanRedirectServer) {
    if (resetError) lanRedirectError = "";
    return { ok: true, running: false };
  }
  return await new Promise((resolve) => {
    lanRedirectServer.close(() => {
      lanRedirectServer = null;
      if (resetError) lanRedirectError = "";
      resolve({ ok: true, running: false });
    });
  });
}

async function startLanRedirectServer({ enabled = false, host = LAN_SERVER_DEFAULT_HOST } = {}) {
  lanRedirectEnabled = !!enabled;
  if (!lanRedirectEnabled) {
    await stopLanRedirectServer();
    return { ok: true, running: false };
  }
  if (lanServerPort === LAN_HTTP_REDIRECT_PORT) {
    await stopLanRedirectServer({ resetError: false });
    lanRedirectError = "Redirection HTTP inactive: le serveur LAN utilise deja le port 80.";
    return { ok: false, code: "REDIRECT_NOT_REQUIRED", error: lanRedirectError };
  }
  if (lanRedirectServer && lanRedirectServer.listening) {
    lanRedirectError = "";
    return { ok: true, running: true };
  }
  return await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        handleLanRedirectRequest(req, res);
      } catch {
        sendLanServerText(res, 500, "Server Error");
      }
    });
    let resolved = false;
    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      resolve(payload);
    };
    server.on("error", (err) => {
      lanRedirectServer = null;
      lanRedirectError = String(err?.message || err);
      finish({ ok: false, error: lanRedirectError, code: err?.code || "REDIRECT_ERROR" });
    });
    server.listen(LAN_HTTP_REDIRECT_PORT, host, () => {
      lanRedirectServer = server;
      lanRedirectError = "";
      finish({ ok: true, running: true });
    });
  });
}

function sendLanServerText(res, status, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message || "");
}

function sendLanServerJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload || {}));
}

const LAN_API_BODY_LIMIT = 5 * 1024 * 1024;

function readLanJsonBody(req, limitBytes = LAN_API_BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      const text = Buffer.concat(chunks).toString("utf-8");
      if (!text.trim()) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeLanApiPath(pathname = "/") {
  if (!pathname) return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

async function handleLanApiRequest(req, res, url, pathname, requestContext = {}) {
  const lanSession = requestContext?.session && typeof requestContext.session === "object"
    ? requestContext.session
    : null;
  const method = String(req.method || "GET").toUpperCase();
  const pathKey = normalizeLanApiPath(pathname);

  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  if ((method === "GET" || method === "POST") && (pathKey === "/api" || pathKey === "/api/status" || pathKey === "/api/ping")) {
    sendLanServerJson(res, 200, { ok: true, status: "ok" });
    return;
  }

  if (method === "GET" && pathKey === "/api/number/preview") {
    try {
      const docType = url?.searchParams?.get("docType") || "";
      const date = url?.searchParams?.get("date") || "";
      const lengthRaw = url?.searchParams?.get("length") || url?.searchParams?.get("numberLength") || "";
      const prefix = url?.searchParams?.get("prefix") || "";
      const numberFormat = url?.searchParams?.get("numberFormat") || "";
      const numberLength = lengthRaw ? Number(lengthRaw) : undefined;
      maybeResetDocumentIndex(docType || "facture", date);
      const result = FactDb.previewDocumentNumber({
        docType,
        date,
        numberLength,
        prefix,
        numberFormat
      });
      sendLanServerJson(res, 200, result);
      return;
    } catch (err) {
      sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
      return;
    }
  }

  if (method === "GET" && pathKey === "/api/companies/events") {
    registerLanCatalogEventClient(req, res);
    return;
  }

  if (method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    sendLanServerText(res, 405, "Method Not Allowed");
    return;
  }

  let body = {};
  try {
    body = await readLanJsonBody(req);
  } catch (err) {
    const code = err?.message === "payload_too_large" ? 413 : 400;
    const message = err?.message === "payload_too_large" ? "Payload Too Large" : "Invalid JSON";
    sendLanServerJson(res, code, { ok: false, error: message });
    return;
  }

  try {
      switch (pathKey) {
        case "/api/company/load": {
          try {
            let data = FactDb.loadCompanyProfile();
            if (!data) {
              await ensureEntrepriseDir();
            }
            const active = getActiveCompanyPaths();
            const profileName = normalizeCompanyDisplayName(data?.name || "");
            if (profileName) {
              CompanyManager.setCompanyDisplayName(getFacturanceRootDir(), active.id, profileName, {
                ifEmpty: true
              });
            }
            const fallbackName =
              CompanyManager.getCompanyDisplayName(getFacturanceRootDir(), active.id) || active.id;
            if ((!data || typeof data !== "object")) {
              data = {};
            }
            if (!String(data?.name || "").trim() && fallbackName) {
              data = { ...data, name: fallbackName };
            }
            sendLanServerJson(res, 200, { ok: true, data });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/company/save": {
          try {
            const snapshot = sanitizeCompanyPayload(body);
            const companySnapshot = { ...snapshot };
            delete companySnapshot.smtp;
            const saved = FactDb.saveCompanyProfile(companySnapshot);
            const active = getActiveCompanyPaths();
            const savedName = normalizeCompanyDisplayName(saved?.name || companySnapshot?.name || "");
            if (savedName) {
              CompanyManager.setCompanyDisplayName(getFacturanceRootDir(), active.id, savedName);
              broadcastCompanyCatalogChange(buildCatalogChangePayload("metadata-updated"));
            }
            sendLanServerJson(res, 200, { ok: true, data: saved });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/companies/list": {
          try {
            const companies = listCompanyCatalog();
            const activeCompanyId = getActiveCompanyId();
            sendLanServerJson(res, 200, {
              ok: true,
              companies,
              activeCompanyId
            });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/companies/create": {
          try {
            const created = createCompanyRuntime(body || {}, {
              source: "lan-session"
            });
            sendLanServerJson(res, 200, {
              ok: true,
              company: created.company,
              switched: !!created.switched,
              activeCompanyId: created.activeCompanyId,
              activeCompany: created.activeCompany
            });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/companies/set-active": {
          try {
            if (!lanSession) {
              throw new Error("LAN session unavailable.");
            }
            const switched = switchActiveCompanyRuntime(body || {}, {
              source: "lan-session"
            });
            sendLanServerJson(res, 200, {
              ok: true,
              switched: !!switched.switched,
              activeCompanyId: switched.activeCompanyId,
              active: switched.activeCompany
            });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/companies/switch": {
          try {
            if (!lanSession) {
              throw new Error("LAN session unavailable.");
            }
            const switched = switchActiveCompanyRuntime(body || {}, {
              source: "lan-session"
            });
            sendLanServerJson(res, 200, {
              ok: true,
              switched: !!switched.switched,
              activeCompanyId: switched.activeCompanyId,
              active: switched.activeCompany,
              snapshot: {
                company: switched.company || {},
                smtpProfiles: switched.smtpProfiles || {}
              }
            });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/companies/active-paths": {
          try {
            const active = getActiveCompanyPaths();
            sendLanServerJson(res, 200, { ok: true, activeCompanyId: active.id, active });
            return;
          } catch (err) {
            sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
            return;
          }
        }
        case "/api/invoices/save": {
          const result = await saveInvoiceJson(body, { allowDialog: false, enforceRoot: true, forceSilent: true });
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/documents": {
          const result = await saveInvoiceJson(body, { allowDialog: false, enforceRoot: true, forceSilent: true });
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/documents/lock/acquire": {
          const result = FactDb.acquireDocEditLock(body?.docKey || body?.path || "");
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/documents/lock/touch": {
          const result = FactDb.touchDocEditLock(body?.docKey || body?.path || "", body?.lockId || "");
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/documents/lock/release": {
          const result = FactDb.releaseDocEditLock(body?.docKey || body?.path || "", body?.lockId || "");
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/documents/pdf-path": {
          const result = await updateDocumentPdfPath(body);
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/invoices/open": {
          if (!body?.path && !body?.number) {
            sendLanServerJson(res, 400, { ok: false, error: "Missing invoice path or number." });
            return;
          }
          const data = await openInvoiceJson(body, { allowDialog: false, enforceRoot: true });
          if (!data) {
            sendLanServerJson(res, 404, { ok: false, error: "Invoice not found." });
            return;
          }
          sendLanServerJson(res, 200, { ok: true, data });
          return;
        }
        case "/api/invoices/list": {
          const result = await listInvoiceFiles(body);
          sendLanServerJson(res, 200, result);
          return;
        }
        case "/api/invoices/delete": {
          const result = await deleteInvoiceFile(body, { enforceRoot: true });
          sendLanServerJson(res, 200, result);
          return;
        }
      case "/api/payments/read": {
        const result = await readPaymentHistory();
        sendLanServerJson(res, 200, result);
        return;
      }
      case "/api/payments/write": {
        const result = await writePaymentHistory(body);
        sendLanServerJson(res, 200, result);
        return;
      }
      case "/api/clients/ensure": {
        const entityType = body?.entityType || body?.type;
        const result = await ensureClientsSystemFolder(entityType);
        sendLanServerJson(res, 200, result);
        return;
      }
      case "/api/clients/save": {
        try {
          const { client = {}, suggestedName = "client", entityType } = body || {};
          const result = FactDb.saveClient({ client, entityType, suggestedName });
          sendLanServerJson(res, 200, { ok: true, ...result });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/update": {
        try {
          const { client = {}, path: currentPath, suggestedName = "client", entityType } = body || {};
          const id =
            FactDb.parseClientIdFromPath(currentPath) || FactDb.getClientIdByLegacyPath(currentPath);
          if (!id) {
            sendLanServerJson(res, 200, { ok: false, error: "Chemin introuvable." });
            return;
          }
          const result = FactDb.updateClient({ id, client, entityType, suggestedName });
          sendLanServerJson(res, 200, { ok: true, ...result });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/adjustSold": {
        try {
          const {
            path: currentPath,
            id: clientId,
            clientId: clientIdAlias,
            amount,
            delta,
            precision,
            clamp,
            rejectIfInsufficient,
            suggestedName = "client",
            entityType,
            ledgerType,
            ledgerSource,
            ledgerSourceId,
            ledgerCreatedAt,
            ledgerEffectiveDate,
            ledgerTaxId,
            skipLedger
          } = body || {};
          const id =
            clientId ||
            clientIdAlias ||
            FactDb.parseClientIdFromPath(currentPath) ||
            FactDb.getClientIdByLegacyPath(currentPath);
          if (!id) {
            sendLanServerJson(res, 200, { ok: false, error: "Client introuvable." });
            return;
          }
          const result = FactDb.adjustClientSold({
            id,
            amount,
            delta,
            precision,
            clamp,
            rejectIfInsufficient,
            entityType,
            suggestedName,
            ledgerType,
            ledgerSource,
            ledgerSourceId,
            ledgerCreatedAt,
            ledgerEffectiveDate,
            ledgerTaxId,
            skipLedger
          });
          sendLanServerJson(res, 200, { ok: true, ...result });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/ledger": {
        try {
          const normalizeDate = (value, endOfDay = false) => {
            const trimmed = String(value || "").trim();
            if (!trimmed) return "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
              return `${trimmed}T${endOfDay ? "23:59:59.999Z" : "00:00:00Z"}`;
            }
            return trimmed;
          };
          const {
            clientId: rawClientId,
            path: clientPath,
            dateFrom,
            dateTo
          } = body || {};
          const clientId =
            rawClientId ||
            FactDb.parseClientIdFromPath(clientPath) ||
            FactDb.getClientIdByLegacyPath(clientPath);
          const result = FactDb.getClientLedgerEntries({
            clientId,
            dateFrom: normalizeDate(dateFrom, false),
            dateTo: normalizeDate(dateTo, true)
          });
          sendLanServerJson(res, 200, { ok: true, items: result });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/ledger/delete": {
        try {
          const entryId = String(body?.id || "").trim();
          if (!entryId) {
            sendLanServerJson(res, 200, { ok: false, error: "Identifiant manquant." });
            return;
          }
          const removed = FactDb.deleteClientLedgerEntry(entryId);
          sendLanServerJson(res, 200, { ok: true, removed });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/ledger/add": {
        try {
          const {
            path: clientPath,
            id: clientId,
            clientId: clientIdAlias,
            taxId,
            createdAt,
            effectiveDate,
            type,
            amount,
            source,
            sourceId
          } = body || {};
          const resolvedId =
            clientId ||
            clientIdAlias ||
            FactDb.parseClientIdFromPath(clientPath) ||
            FactDb.getClientIdByLegacyPath(clientPath);
          if (!resolvedId) {
            sendLanServerJson(res, 200, { ok: false, error: "Client introuvable." });
            return;
          }
          const entry = FactDb.addClientLedgerEntry({
            clientId: resolvedId,
            taxId,
            createdAt,
            effectiveDate,
            type,
            amount,
            source,
            sourceId
          });
          sendLanServerJson(res, 200, { ok: true, entry });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/ledger/update-amount": {
        try {
          const entryId = String(body?.id || "").trim();
          const amount = Number(body?.amount);
          if (!entryId) {
            sendLanServerJson(res, 200, { ok: false, error: "Identifiant manquant." });
            return;
          }
          if (!Number.isFinite(amount)) {
            sendLanServerJson(res, 200, { ok: false, error: "Montant invalide." });
            return;
          }
          const updated = FactDb.updateClientLedgerAmount(entryId, amount);
          sendLanServerJson(res, 200, { ok: true, updated });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/delete": {
        try {
          const targetPath = body?.path;
          if (!targetPath) {
            sendLanServerJson(res, 200, { ok: false, error: "Chemin du client introuvable" });
            return;
          }
          const id =
            FactDb.parseClientIdFromPath(targetPath) || FactDb.getClientIdByLegacyPath(targetPath);
          if (id) {
            const result = FactDb.deleteClient(id);
            sendLanServerJson(res, 200, result);
            return;
          }
          sendLanServerJson(res, 200, { ok: false, error: "Client introuvable." });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/open": {
        try {
          const targetPath = body?.path;
          if (targetPath) {
            const id = FactDb.parseClientIdFromPath(targetPath);
            if (id) {
              const record = FactDb.getClientById(id);
              if (record) {
                sendLanServerJson(res, 200, { ok: true, client: record.client, path: targetPath, name: record.name });
                return;
              }
              sendLanServerJson(res, 200, { ok: false, error: "Client introuvable." });
              return;
            }
          }
          if (!targetPath) {
            sendLanServerJson(res, 400, { ok: false, error: "Chemin du client introuvable" });
            return;
          }
          const entityType = body?.entityType || body?.type;
          const ensure = await ensureClientsSystemFolder(entityType);
          if (!ensure.ok) {
            sendLanServerJson(res, 200, ensure);
            return;
          }
          const baseDir = ensure.path || getClientsSystemFolder(entityType);
          const resolved = path.resolve(targetPath);
          if (!isPathInside(baseDir, resolved)) {
            sendLanServerJson(res, 200, {
              ok: false,
              error: "Le fichier client selectionne est en dehors du dossier autorise."
            });
            return;
          }
          const raw = await fsp.readFile(resolved, "utf-8");
          const client = JSON.parse(raw);
          sendLanServerJson(res, 200, { ok: true, client, path: resolved, name: path.basename(resolved) });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/clients/search": {
        try {
          const queryRaw = typeof body === "string" ? body : body?.query;
          const limitRaw = typeof body === "object" && body !== null ? body.limit : undefined;
          const offsetRaw = typeof body === "object" && body !== null ? body.offset : undefined;
          const entityType =
            typeof body === "object" && body !== null ? body.entityType || body.type : undefined;
          const query = String(queryRaw || "").trim();
          const limitValue = Number(limitRaw);
          const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : null;
          const offset = Math.max(0, Number(offsetRaw) || 0);
          const results = FactDb.searchClients({ query, entityType, limit, offset });
          sendLanServerJson(res, 200, { ok: true, results: results.results, total: results.total });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/articles/save": {
        try {
          const { article = {}, suggestedName = "article" } = body || {};
          const safe = ensureSafeName(suggestedName || article.ref || article.product || "article");
          const duplicate = await findDuplicateArticle(article);
          if (duplicate) {
            sendLanServerJson(res, 200, buildDuplicateArticleError(duplicate));
            return;
          }
          const dbResult = FactDb.saveArticle({ article, suggestedName: safe });
          sendLanServerJson(res, 200, { ok: true, path: dbResult.path, name: dbResult.name });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/articles/save-auto": {
        try {
          const { article = {}, suggestedName = "article" } = body || {};
          const safe = ensureSafeName(suggestedName || article.ref || article.product || "article");
          const duplicate = await findDuplicateArticle(article);
          if (duplicate) {
            sendLanServerJson(res, 200, buildDuplicateArticleError(duplicate));
            return;
          }
          const dbResult = FactDb.saveArticle({ article, suggestedName: safe });
          sendLanServerJson(res, 200, { ok: true, path: dbResult.path, name: dbResult.name });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/articles/update": {
        try {
          const targetPath = body?.path;
          if (!targetPath) throw new Error("Chemin introuvable.");
          const article = body?.article || {};
          const target = resolveArticleUpdateTarget(targetPath, article);
          if (!target.id || !target.record?.article) throw new Error("Article introuvable.");
          const duplicatePayload = buildArticleDuplicateCheckPayload(article, target.record.article);
          const duplicate = await findDuplicateArticle(duplicatePayload, { excludeId: target.id });
          if (duplicate) {
            sendLanServerJson(res, 200, buildDuplicateArticleError(duplicate));
            return;
          }
          const dbResult = FactDb.saveArticle({
            id: target.id,
            article,
            suggestedName: body?.suggestedName || article.ref || article.product || "article"
          });
          sendLanServerJson(res, 200, { ok: true, path: dbResult.path, name: dbResult.name });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/articles/adjust-stock": {
        const targetPath = body?.path;
        if (targetPath && !FactDb.parseArticleIdFromPath(targetPath)) {
          const rootDir = getActiveCompanyDataDir();
          if (!isPathInside(rootDir, targetPath)) {
            sendLanServerJson(res, 200, { ok: false, error: "Chemin introuvable." });
            return;
          }
        }
        const result = await adjustArticleStockFile(targetPath, body?.delta ?? body?.stockDelta ?? 0);
        sendLanServerJson(res, 200, result);
        return;
      }
      case "/api/articles/list": {
        const result = FactDb.listArticles();
        sendLanServerJson(res, 200, result);
        return;
      }
      case "/api/articles/search": {
        try {
          const { query = "", limit, offset } = body || {};
          const limitValue = Number(limit);
          const offsetValue = Number(offset);
          const resSearch = FactDb.searchArticles({
            query,
            limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : null,
            offset: Number.isFinite(offsetValue) && offsetValue > 0 ? Math.floor(offsetValue) : 0
          });
          sendLanServerJson(res, 200, { ok: true, results: resSearch.results, total: resSearch.total });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/articles/delete": {
        try {
          const targetPath = body?.path;
          if (!targetPath) throw new Error("Chemin introuvable.");
          const id =
            FactDb.parseArticleIdFromPath(targetPath) || FactDb.getArticleIdByLegacyPath(targetPath);
          if (id) {
            const result = FactDb.deleteArticle(id);
            sendLanServerJson(res, 200, result);
            return;
          }
          const dir = await ensureArticlesDir();
          const safeDir = path.resolve(dir);
          const resolved = path.resolve(targetPath);
          if (!resolved.startsWith(safeDir)) {
            throw new Error("Suppression non autorisee.");
          }
          await fsp.unlink(resolved);
          sendLanServerJson(res, 200, { ok: true });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/models/list": {
        try {
          await migrateLegacyModelsToDb();
          const models = FactDb.listModels();
          sendLanServerJson(res, 200, { ok: true, models });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err), models: [] });
          return;
        }
      }
      case "/api/models/load": {
        try {
          await migrateLegacyModelsToDb();
          const name = sanitizeModelPresetName(body?.name);
          if (!name) {
            sendLanServerJson(res, 200, { ok: false, error: "Nom de modele requis." });
            return;
          }
          const record = FactDb.loadModel(name);
          if (!record) {
            sendLanServerJson(res, 200, { ok: false, missing: true, error: "Modele introuvable." });
            return;
          }
          sendLanServerJson(res, 200, { ok: true, name: record.name, config: record.config });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/models/save": {
        try {
          const name = sanitizeModelPresetName(body?.name);
          if (!name) {
            sendLanServerJson(res, 200, { ok: false, error: "Nom de modele requis." });
            return;
          }
          const config = body?.config && typeof body.config === "object" ? body.config : {};
          FactDb.saveModel({ name, config });
          sendLanServerJson(res, 200, { ok: true, name });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/models/delete": {
        try {
          const name = sanitizeModelPresetName(body?.name);
          if (!name) {
            sendLanServerJson(res, 200, { ok: false, error: "Nom de modele requis." });
            return;
          }
          const result = FactDb.deleteModel(name);
          sendLanServerJson(res, 200, result);
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/client-fields/load": {
        try {
          const record = FactDb.loadSetting(CLIENT_FIELD_SETTINGS_KEY);
          const settings = record?.value && typeof record.value === "object" ? record.value : {};
          sendLanServerJson(res, 200, { ok: true, settings });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/client-fields/save": {
        try {
          const incoming =
            body?.settings && typeof body.settings === "object"
              ? body.settings
              : {
                  visibility: body?.visibility,
                  labels: body?.labels
                };
          const record = FactDb.loadSetting(CLIENT_FIELD_SETTINGS_KEY);
          const existing = record?.value && typeof record.value === "object" ? record.value : {};
          const payload =
            incoming && typeof incoming === "object"
              ? Object.fromEntries(
                  Object.entries(incoming).filter(([, value]) => value !== undefined)
                )
              : {};
          FactDb.saveSetting({
            key: CLIENT_FIELD_SETTINGS_KEY,
            value: { ...existing, ...payload }
          });
          sendLanServerJson(res, 200, { ok: true });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/article-fields/load": {
        try {
          const record = FactDb.loadSetting(ARTICLE_FIELD_SETTINGS_KEY);
          const settings = record?.value && typeof record.value === "object" ? record.value : {};
          sendLanServerJson(res, 200, { ok: true, settings });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/article-fields/save": {
        try {
          const incoming =
            body?.settings && typeof body.settings === "object"
              ? body.settings
              : {
                  visibility: body?.visibility,
                  defaults: body?.defaults,
                  labels: body?.labels
                };
          const record = FactDb.loadSetting(ARTICLE_FIELD_SETTINGS_KEY);
          const existing = record?.value && typeof record.value === "object" ? record.value : {};
          const settings =
            incoming && typeof incoming === "object"
              ? Object.fromEntries(
                  Object.entries(incoming).filter(([, value]) => value !== undefined)
                )
              : {};
          FactDb.saveSetting({
            key: ARTICLE_FIELD_SETTINGS_KEY,
            value: { ...existing, ...settings }
          });
          sendLanServerJson(res, 200, { ok: true });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/withholding-fa-settings/load": {
        try {
          const record = FactDb.loadSetting(WITHHOLDING_FA_SETTINGS_KEY);
          const settings = record?.value && typeof record.value === "object" ? record.value : {};
          sendLanServerJson(res, 200, { ok: true, settings });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      case "/api/withholding-fa-settings/save": {
        try {
          const settings =
            body?.settings && typeof body.settings === "object"
              ? body.settings
              : {
                  threshold: body?.threshold,
                  cnpc: body?.cnpc,
                  pCharge: body?.pCharge,
                  rate: body?.rate,
                  operationCategory: body?.operationCategory,
                  operationType: body?.operationType
                };
          FactDb.saveSetting({ key: WITHHOLDING_FA_SETTINGS_KEY, value: settings || {} });
          sendLanServerJson(res, 200, { ok: true });
          return;
        } catch (err) {
          sendLanServerJson(res, 200, { ok: false, error: String(err?.message || err) });
          return;
        }
      }
      default:
        sendLanServerJson(res, 404, { ok: false, error: "Not Found" });
        return;
    }
  } catch (err) {
    console.error("LAN API error:", err);
    sendLanServerJson(res, 500, { ok: false, error: "Server Error" });
  }
}

async function handleLanServerRequest(req, res) {
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    sendLanServerText(res, 400, "Bad Request");
    return;
  }

  let pathname = parsedUrl.pathname || "/";
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    sendLanServerText(res, 400, "Bad Request");
    return;
  }

  if (pathname.includes("\0")) {
    sendLanServerText(res, 400, "Bad Request");
    return;
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const session = ensureLanSessionContext(req, res);
    const companyPaths = getLanSessionCompanyPaths(session);
    await withCompanyRequestContext(
      {
        scope: "lan",
        source: "lan-api",
        sessionId: session.id,
        session,
        companyId: companyPaths.id,
        companyPaths
      },
      () => handleLanApiRequest(req, res, parsedUrl, pathname, { session })
    );
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    sendLanServerText(res, 405, "Method Not Allowed");
    return;
  }

  const rootDir = lanServerRootDir || getLanServerRootDir();
  const root = path.resolve(rootDir);
  let rel = pathname.replace(/^\/+/, "");
  if (!rel) rel = "index.html";
  let filePath = path.resolve(path.join(root, rel));

  if (!isPathInside(root, filePath)) {
    sendLanServerText(res, 403, "Forbidden");
    return;
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    sendLanServerText(res, 404, "Not Found");
    return;
  }

  if (!fs.existsSync(filePath)) {
    sendLanServerText(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = LAN_MIME_TYPES[ext] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", mime);
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.statusCode = 500;
    sendLanServerText(res, 500, "Server Error");
  });
  stream.pipe(res);
}

async function startLanServer(options = {}) {
  const port = normalizeLanPort(options?.port);
  const host =
    typeof options?.host === "string" && options.host.trim()
      ? options.host.trim()
      : LAN_SERVER_DEFAULT_HOST;
  const mdnsName = normalizeLanMdnsName(options?.mdnsName || LAN_MDNS_DEFAULT_NAME);
  const redirectHttp80 = options?.redirectHttp80 === true;

  if (lanServer && lanServer.listening) {
    const address = lanServer.address();
    const currentPort = address && typeof address === "object" ? address.port : port;
    if (currentPort === port && lanServerHost === host) {
      const warnings = [];
      const mdnsResult = startLanMdnsAdvertisement(port, mdnsName);
      if (!mdnsResult.ok && mdnsResult.error) warnings.push(mdnsResult.error);
      const redirectResult = await startLanRedirectServer({ enabled: redirectHttp80, host });
      if (!redirectResult.ok && redirectResult.error) warnings.push(redirectResult.error);
      const status = getLanServerStatus();
      if (warnings.length) status.warnings = warnings;
      return status;
    }
    await stopLanServer();
  }

  lanServerHost = host;
  lanServerPort = port;
  lanServerMdnsName = mdnsName;
  lanServerRootDir = getLanServerRootDir();
  const serverResult = await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      Promise.resolve(handleLanServerRequest(req, res)).catch((err) => {
        console.error("LAN server error:", err);
        if (res.writableEnded) return;
        if (!res.headersSent) {
          sendLanServerText(res, 500, "Server Error");
          return;
        }
        try { res.end(); } catch {}
      });
    });
    let resolved = false;
    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      resolve(payload);
    };
    server.on("error", (err) => {
      lanServer = null;
      finish({ ok: false, error: String(err?.message || err), code: err?.code || "SERVER_ERROR" });
    });
    server.listen(port, host, () => {
      lanServer = server;
      finish(getLanServerStatus());
    });
  });
  if (!serverResult?.ok) return serverResult;
  const warnings = [];
  const mdnsResult = startLanMdnsAdvertisement(port, mdnsName);
  if (!mdnsResult.ok && mdnsResult.error) warnings.push(mdnsResult.error);
  const redirectResult = await startLanRedirectServer({ enabled: redirectHttp80, host });
  if (!redirectResult.ok && redirectResult.error) warnings.push(redirectResult.error);
  const status = getLanServerStatus();
  if (warnings.length) status.warnings = warnings;
  return status;
}

async function stopLanServer() {
  await stopLanRedirectServer();
  lanRedirectEnabled = false;
  stopLanMdnsAdvertisement();
  closeLanCatalogEventClients();
  if (!lanServer) return getLanServerStatus();
  return await new Promise((resolve) => {
    lanServer.close(() => {
      lanServer = null;
      resolve(getLanServerStatus());
    });
  });
}

app.on("before-quit", () => {
  closeLanCatalogEventClients();
  try {
    if (lanRedirectServer) lanRedirectServer.close();
  } catch {}
  try {
    stopLanMdnsAdvertisement();
  } catch {}
  try {
    if (lanServer) lanServer.close();
  } catch {}
});

function getPdfMetaPaths(targetPath) {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const metaDir = path.join(dir, "meta");
  const primary = path.join(metaDir, `${base}.meta.json`);
  const legacy = `${targetPath}.meta.json`;
  return { primary, legacy, metaDir };
}

function writePdfMetadataFile(targetPath, meta = {}) {
  if (!targetPath) return;
  const name = typeof meta.clientName === "string" ? meta.clientName.trim() : "";
  const vat = typeof meta.clientVat === "string" ? meta.clientVat.trim() : "";
  const payload = {
    clientName: name || "",
    clientVat: vat || "",
    docType: typeof meta.docType === "string" ? meta.docType : "",
    number: typeof meta.number === "string" ? meta.number : "",
    date: typeof meta.date === "string" ? meta.date : "",
    generatedAt: new Date().toISOString()
  };
  if (!payload.clientName && !payload.clientVat) return;
  const { primary, metaDir } = getPdfMetaPaths(targetPath);
  try {
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(primary, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("writePdfMetadataFile failed", err);
  }
}

/* central save routine used by both IPCs */
async function savePdfToDisk(pdfBuffer, meta = {}, browserEventSender = null) {
  const requestedName =
    typeof meta.filename === "string" && meta.filename.trim() ? meta.filename : "";
  const baseName = requestedName || compactPdfBaseName(meta, "Document");
  const fileName = withPdfExt(sanitizeFileName(baseName).replace(/\s+/g, ""));
  const isSilent = meta.silent === true || !!meta.to || !!meta.saveDir;

  if (isSilent) {
    const saveDir = resolveSaveDir(meta);
    const target = path.join(saveDir, fileName);
    const allowOverwrite = meta.forceOverwrite === true;
    if (fs.existsSync(target) && !allowOverwrite) {
      return { ok: false, reason: "exists", path: target, name: path.basename(target) };
    }
    fs.writeFileSync(target, pdfBuffer);
    writePdfMetadataFile(target, meta);
    return { ok: true, path: target, name: path.basename(target) };
  }

  const browserWin = browserEventSender ? BrowserWindow.fromWebContents(browserEventSender) : mainWindow;
  const { canceled, filePath } = await dialog.showSaveDialog(browserWin, {
    title: "Exporter PDF",
    defaultPath: path.join(app.getPath("desktop"), fileName),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, pdfBuffer);
  writePdfMetadataFile(filePath, meta);
  return { ok: true, path: filePath, name: path.basename(filePath) };
}

function resolveSaveFileData(data, filePath) {
  if (!data) return null;
  let payload = data;
  if (data && typeof data === "object" && ("csv" in data || "xlsx" in data)) {
    const ext = String(path.extname(filePath || "")).toLowerCase();
    payload = ext === ".csv" ? data.csv ?? data.xlsx : data.xlsx ?? data.csv;
  }
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload;
  if (payload instanceof ArrayBuffer) return Buffer.from(new Uint8Array(payload));
  if (ArrayBuffer.isView(payload)) {
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  }
  return null;
}

/* ---------- app lifecycle ---------- */
app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();
  scheduleShowFallback();
  migrateLegacyData().catch((err) => {
    console.warn("Legacy data migration failed", err);
  });
  app.on("activate", () => {
    if (!mainWindow && !splashWindow) {
      createSplashWindow();
      createMainWindow();
      scheduleShowFallback();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------- Clients system folder (unchanged) ---------- */
const CLIENTS_DIR_NAME = "Clients";
const VENDORS_DIR_NAME = "fournisseur";
function normalizeClientEntityType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "vendor" ||
    normalized === "fournisseur" ||
    normalized === "fournisseurs" ||
    normalized === "vendors"
  ) {
    return "vendor";
  }
  return "client";
}
function getClientsSystemFolder(entityType) {
  const normalized = normalizeClientEntityType(entityType);
  const dirName = normalized === "vendor" ? VENDORS_DIR_NAME : CLIENTS_DIR_NAME;
  return path.join(getActiveCompanyDataDir(), dirName);
}
async function canWriteTo(dir) {
  try {
    await fsp.mkdir(dir, { recursive: true });
    const test = path.join(dir, `.write-test-${Date.now()}.tmp`);
    await fsp.writeFile(test, "ok", "utf-8");
    await fsp.unlink(test);
    return true;
  } catch {
    return false;
  }
}
function runElevatedWin(commands) {
  return new Promise((resolve) => {
    const args = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process cmd -Verb RunAs -ArgumentList '/c ${commands.replace(/'/g, "''")}'`,
    ];
    const child = spawn("powershell.exe", args, { windowsHide: true, stdio: "ignore" });
    child.on("error", () => resolve({ ok: false, error: "spawn error" }));
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    setTimeout(() => resolve({ ok: true, deferred: true }), 1200);
  });
}
async function ensureClientsFolderWin(entityType) {
  const dir = getClientsSystemFolder(entityType);
  try {
    await fsp.mkdir(dir, { recursive: true });
    if (await canWriteTo(dir)) return { ok: true, path: dir, elevated: false };
    return { ok: false, error: "Cannot write to folder", path: dir };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), path: dir };
  }
}

const clientsFolderCache = new Map();
const ensuringClientsFolderPromise = new Map();
async function ensureClientsSystemFolder(entityType) {
  const normalized = normalizeClientEntityType(entityType);
  const cacheKey = `${getActiveCompanyId()}:${normalized}`;
  if (!CLIENTS_FS_ENABLED) {
    return { ok: true, path: getClientsSystemFolder(normalized), skipped: true, disabled: true };
  }
  const cached = clientsFolderCache.get(cacheKey);
  if (cached) return { ...cached };
  if (ensuringClientsFolderPromise.has(cacheKey)) {
    const pending = await ensuringClientsFolderPromise.get(cacheKey);
    return pending && typeof pending === "object" ? { ...pending } : pending;
  }

  const promise = (async () => {
    if (process.platform === "win32") {
      return await ensureClientsFolderWin(normalized);
    }
    const dir = getClientsSystemFolder(normalized);
    try {
      await fsp.mkdir(dir, { recursive: true });
      if (await canWriteTo(dir)) return { ok: true, path: dir, elevated: false };
      return { ok: false, error: "Cannot write to folder", path: dir };
    } catch (e) {
      return { ok: false, error: String(e?.message || e), path: dir };
    }
  })();
  ensuringClientsFolderPromise.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result?.ok) clientsFolderCache.set(cacheKey, result);
    return result && typeof result === "object" ? { ...result } : result;
  } finally {
    ensuringClientsFolderPromise.delete(cacheKey);
  }
}
function isPathInside(baseDir, candidatePath) {
  if (!candidatePath) return false;
  const base = path.resolve(baseDir);
  const target = path.resolve(candidatePath);
  const relative = path.relative(base, target);
  if (!relative) return true;
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

 
ipcMain.handle("clients:ensureSystemFolder", async (_evt, payload = {}) => {
  try {
    const entityType = payload?.entityType || payload?.type;
    const res = await ensureClientsSystemFolder(entityType);
    return res;
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});
ipcMain.handle("clients:saveDirect", async (_evt, payload = {}) => {
  try {
    const { client = {}, suggestedName = "client", entityType } = payload || {};
    const result = FactDb.saveClient({
      client,
      entityType,
      suggestedName
    });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:updateDirect", async (_evt, payload = {}) => {
  try {
    const { client = {}, path: currentPath, suggestedName = "client", entityType } = payload || {};
    const id = FactDb.parseClientIdFromPath(currentPath) || FactDb.getClientIdByLegacyPath(currentPath);
    if (!id) return { ok: false, error: "Chemin introuvable." };
    const result = FactDb.updateClient({
      id,
      client,
      entityType,
      suggestedName
    });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:adjustSold", async (_evt, payload = {}) => {
  try {
    const {
      path: currentPath,
      id: clientId,
      clientId: clientIdAlias,
      amount,
      delta,
      precision,
      clamp,
      rejectIfInsufficient,
      suggestedName = "client",
      entityType,
      ledgerType,
      ledgerSource,
      ledgerSourceId,
      ledgerCreatedAt,
      ledgerEffectiveDate,
      ledgerTaxId,
      skipLedger
    } = payload || {};
    const resolvedId =
      clientId ||
      clientIdAlias ||
      FactDb.parseClientIdFromPath(currentPath) ||
      FactDb.getClientIdByLegacyPath(currentPath);
    if (!resolvedId) return { ok: false, error: "Client introuvable." };
    const result = FactDb.adjustClientSold({
      id: resolvedId,
      amount,
      delta,
      precision,
      clamp,
      rejectIfInsufficient,
      entityType,
      suggestedName,
      ledgerType,
      ledgerSource,
      ledgerSourceId,
      ledgerCreatedAt,
      ledgerEffectiveDate,
      ledgerTaxId,
      skipLedger
    });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:readLedger", async (_evt, payload = {}) => {
  try {
    const normalizeDate = (value, endOfDay = false) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return `${trimmed}T${endOfDay ? "23:59:59.999Z" : "00:00:00Z"}`;
      }
      return trimmed;
    };
    const { clientId: rawClientId, path: clientPath, dateFrom, dateTo } = payload || {};
    const resolvedId =
      rawClientId ||
      FactDb.parseClientIdFromPath(clientPath) ||
      FactDb.getClientIdByLegacyPath(clientPath);
    const items = FactDb.getClientLedgerEntries({
      clientId: resolvedId,
      dateFrom: normalizeDate(dateFrom, false),
      dateTo: normalizeDate(dateTo, true)
    });
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:deleteLedgerEntry", async (_evt, payload = {}) => {
  try {
    const entryId = String(payload?.id || "").trim();
    if (!entryId) return { ok: false, error: "Identifiant manquant." };
    const removed = FactDb.deleteClientLedgerEntry(entryId);
    return { ok: true, removed };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:addLedgerEntry", async (_evt, payload = {}) => {
  try {
    const {
      path: clientPath,
      id: clientId,
      clientId: clientIdAlias,
      taxId,
      createdAt,
      effectiveDate,
      type,
      amount,
      source,
      sourceId
    } = payload || {};
    const resolvedId =
      clientId ||
      clientIdAlias ||
      FactDb.parseClientIdFromPath(clientPath) ||
      FactDb.getClientIdByLegacyPath(clientPath);
    if (!resolvedId) return { ok: false, error: "Client introuvable." };
    const entry = FactDb.addClientLedgerEntry({
      clientId: resolvedId,
      taxId,
      createdAt,
      effectiveDate,
      type,
      amount,
      source,
      sourceId
    });
    return { ok: true, entry };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:updateLedgerAmount", async (_evt, payload = {}) => {
  try {
    const entryId = String(payload?.id || "").trim();
    const amount = Number(payload?.amount);
    if (!entryId) return { ok: false, error: "Identifiant manquant." };
    if (!Number.isFinite(amount)) return { ok: false, error: "Montant invalide." };
    const updated = FactDb.updateClientLedgerAmount(entryId, amount);
    return { ok: true, updated };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:delete", async (_evt, payload = {}) => {
  try {
    const targetPath = payload?.path;
    if (!targetPath) return { ok: false, error: "Chemin du client introuvable" };
    const id = FactDb.parseClientIdFromPath(targetPath) || FactDb.getClientIdByLegacyPath(targetPath);
    if (id) return FactDb.deleteClient(id);
    return { ok: false, error: "Client introuvable." };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:open", async (_evt, payload = {}) => {
  try {
    const targetPath = payload?.path;
    if (targetPath) {
      const id = FactDb.parseClientIdFromPath(targetPath);
      if (id) {
        const record = FactDb.getClientById(id);
        if (record) {
          FactDb.applyClientDebitTotals([record]);
          return { ok: true, client: record.client, path: targetPath, name: record.name };
        }
      }
    }
    const entityType = payload?.entityType || payload?.type;
    const ensure = await ensureClientsSystemFolder(entityType);
    if (!ensure.ok) return { ok: false, ...ensure };
    const baseDir = ensure.path || getClientsSystemFolder(entityType);
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Charger un client",
      defaultPath: baseDir,
      properties: ["openFile"],
      filters: [
        { name: "Clients", extensions: ["json"] },
        { name: "Tous les fichiers", extensions: ["*"] }
      ]
    });
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
    const selected = path.resolve(filePaths[0]);
    if (!isPathInside(baseDir, selected)) {
      return { ok: false, error: "Le fichier client selectionne est en dehors du dossier autorise." };
    }
    const raw = await fsp.readFile(selected, "utf-8");
    const client = JSON.parse(raw);
    return { ok: true, client, path: selected, name: path.basename(selected) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("clients:search", async (_evt, payload = {}) => {
  try {
    const queryRaw = typeof payload === "string" ? payload : payload?.query;
    const limitRaw = typeof payload === "object" && payload !== null ? payload.limit : undefined;
    const offsetRaw = typeof payload === "object" && payload !== null ? payload.offset : undefined;
    const entityType =
      typeof payload === "object" && payload !== null ? payload.entityType || payload.type : undefined;
    const query = String(queryRaw || "").trim();
    const limitValue = Number(limitRaw);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : null;
    const offset = Math.max(0, Number(offsetRaw) || 0);
    const results = FactDb.searchClients({
      query,
      entityType,
      limit,
      offset
    });
    return { ok: true, results: results.results, total: results.total };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("depots:list", async () => {
  try {
    const results = FactDb.listDepots();
    return { ok: true, results, total: Array.isArray(results) ? results.length : 0 };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), results: [] };
  }
});

ipcMain.handle("depots:listEmplacements", async (_evt, payload = {}) => {
  try {
    const pathValue = String(payload?.path || "").trim();
    const idValue = String(payload?.depotId || payload?.id || "").trim();
    const depotId = FactDb.parseDepotIdFromPath(pathValue) || idValue;
    if (!depotId) return { ok: true, results: [], total: 0 };
    const results = FactDb.listEmplacementsByDepot(depotId);
    return { ok: true, results, total: Array.isArray(results) ? results.length : 0 };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), results: [] };
  }
});

ipcMain.handle("depots:search", async (_evt, payload = {}) => {
  try {
    const queryRaw = typeof payload === "string" ? payload : payload?.query;
    const limitRaw = typeof payload === "object" && payload !== null ? payload.limit : undefined;
    const offsetRaw = typeof payload === "object" && payload !== null ? payload.offset : undefined;
    const query = String(queryRaw || "").trim();
    const limitValue = Number(limitRaw);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : null;
    const offset = Math.max(0, Number(offsetRaw) || 0);
    const results = FactDb.searchDepots({ query, limit, offset });
    return { ok: true, results: results.results, total: results.total };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), results: [] };
  }
});

ipcMain.handle("depots:saveDirect", async (_evt, payload = {}) => {
  try {
    const { depot = {}, suggestedName = "depot-magasin" } = payload || {};
    const result = FactDb.saveDepot({ depot, suggestedName });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("depots:updateDirect", async (_evt, payload = {}) => {
  try {
    const { depot = {}, path: currentPath, id: rawId, suggestedName = "depot-magasin" } = payload || {};
    const id = String(rawId || "").trim() || FactDb.parseDepotIdFromPath(currentPath);
    if (!id) return { ok: false, error: "Chemin du depot/magasin introuvable." };
    const result = FactDb.updateDepot({ id, depot, suggestedName });
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("depots:delete", async (_evt, payload = {}) => {
  try {
    const pathValue = String(payload?.path || "").trim();
    const idValue = String(payload?.id || "").trim();
    const id = FactDb.parseDepotIdFromPath(pathValue) || idValue;
    if (!id) return { ok: false, error: "Identifiant depot/magasin introuvable." };
    return FactDb.deleteDepot(id);
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("depots:open", async (_evt, payload = {}) => {
  try {
    const pathValue = String(payload?.path || "").trim();
    const idValue = String(payload?.id || "").trim();
    const id = FactDb.parseDepotIdFromPath(pathValue) || idValue;
    if (!id) return { ok: false, error: "Identifiant depot/magasin introuvable." };
    const depot = FactDb.getDepotById(id);
    if (!depot) return { ok: false, error: "Depot/magasin introuvable." };
    return { ok: true, depot, path: depot.path, name: depot.name };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

async function migrateClientsFromDir(entityType) {
  if (!CLIENTS_FS_ENABLED) return;
  try {
    const ensure = await ensureClientsSystemFolder(entityType);
    if (!ensure.ok) return;
    const dir = ensure.path || getClientsSystemFolder(entityType);
    if (!dir || !fs.existsSync(dir)) return;
    const entries = await fsp.readdir(dir);
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".json")) continue;
      const legacyPath = path.join(dir, entry);
      if (FactDb.getClientIdByLegacyPath(legacyPath)) continue;
      try {
        const raw = await fsp.readFile(legacyPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") continue;
        const name = path.basename(entry, ".json");
        FactDb.saveClient({
          client: parsed,
          entityType,
          suggestedName: name,
          legacyPath
        });
      } catch (err) {
        console.warn("client migration skipped", legacyPath, err?.message || err);
      }
    }
  } catch (err) {
    console.warn("Client legacy migration failed", err?.message || err);
  }
}

async function migrateLegacyClients() {
  await migrateClientsFromDir("client");
  await migrateClientsFromDir("vendor");
}

async function migrateLegacyArticles() {
  if (!ARTICLES_FS_ENABLED) return;
  try {
    const dir = await ensureArticlesDir();
    if (!dir || !fs.existsSync(dir)) return;
    const entries = await fsp.readdir(dir);
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".json")) continue;
      const legacyPath = path.join(dir, entry);
      if (FactDb.getArticleIdByLegacyPath(legacyPath)) continue;
      try {
        const raw = await fsp.readFile(legacyPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") continue;
        const name = entry.replace(/\.json$/i, "");
        FactDb.saveArticle({
          article: parsed,
          suggestedName: name,
          legacyPath
        });
      } catch (err) {
        console.warn("article migration skipped", legacyPath, err?.message || err);
      }
    }
  } catch (err) {
    console.warn("Article legacy migration failed", err?.message || err);
  }
}

async function migrateLegacyData() {
  await migrateLegacyClients();
  await migrateLegacyArticles();
}

/* ---------- Invoice JSON save/open ---------- */
async function saveInvoiceJson(payload = {}, options = {}) {
  const allowDialog = options?.allowDialog !== false;
  const forceSilent = options?.forceSilent === true;
  const incoming = (payload && payload.data && typeof payload.data === "object") ? payload.data : payload;
  const baseMeta = (incoming && typeof incoming.meta === "object") ? incoming.meta : {};
  const requestMeta = (payload && typeof payload.meta === "object") ? payload.meta : {};
  let meta = { ...baseMeta, ...requestMeta };
  if (forceSilent || !allowDialog) meta.silent = true;
  const TRANSIENT_META_KEYS = new Set([
    "silent",
    "to",
    "saveDir",
    "useSameDirAs",
    "forceOverwrite",
    "filename",
    "previewNumber",
    "reuseExistingNumber",
    "confirmNumberChange",
    "acceptNumberChange",
    "allowProvidedNumber",
    "status",
    "historyStatus"
  ]);
  if (incoming && typeof incoming === "object") {
    const mergedMeta = { ...(incoming.meta && typeof incoming.meta === "object" ? incoming.meta : {}) };
    if (meta && typeof meta === "object") {
      Object.entries(meta).forEach(([key, value]) => {
        if (TRANSIENT_META_KEYS.has(key)) return;
        mergedMeta[key] = value;
      });
    }
    incoming.meta = mergedMeta;
  }
  const rawStatus =
    meta?.status ??
    meta?.historyStatus ??
    incoming?.status ??
    incoming?.meta?.status ??
    incoming?.meta?.historyStatus ??
    payload?.status ??
    payload?.historyStatus ??
    "";
  const statusValue = String(rawStatus || "").trim().toLowerCase();
  if (incoming && typeof incoming === "object") {
    delete incoming.status;
    if (incoming.meta && typeof incoming.meta === "object") {
      delete incoming.meta.status;
      delete incoming.meta.historyStatus;
    }
  }

  const normalizeDocType = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "facture";
    if (normalized === "fact") return "facture";
    return normalized;
  };
  const isManualNumberDocType = (value) => String(value || "").trim().toLowerCase() === "fa";
  const docTypeValue = normalizeDocType(meta?.docType || incoming?.meta?.docType || "facture");
  meta.docType = docTypeValue;
  if (incoming?.meta && typeof incoming.meta === "object") {
    incoming.meta.docType = docTypeValue;
  }

  const dateValue = String(meta?.date || incoming?.meta?.date || todayStr()).slice(0, 10);
  meta.date = dateValue;
  if (incoming?.meta && typeof incoming.meta === "object") {
    incoming.meta.date = dateValue;
  }
  maybeResetDocumentIndex(docTypeValue, dateValue);

  const previewNumberRaw =
    (typeof meta?.previewNumber === "string" && meta.previewNumber.trim()) ||
    (typeof incoming?.meta?.previewNumber === "string" && incoming.meta.previewNumber.trim()) ||
    "";
  const numberFallbackRaw =
    (typeof meta?.number === "string" && meta.number.trim()) ||
    (typeof incoming?.meta?.number === "string" && incoming.meta.number.trim()) ||
    "";
  const previewNumber =
    previewNumberRaw || (!isManualNumberDocType(docTypeValue) ? numberFallbackRaw : "");
  const previewToken =
    previewNumber ||
    numberFallbackRaw ||
    "";
  const numberPrefixRaw =
    (typeof meta?.numberPrefix === "string" && meta.numberPrefix.trim()) ||
    (typeof incoming?.meta?.numberPrefix === "string" && incoming.meta.numberPrefix.trim()) ||
    "";
  const reuseExistingNumber = meta?.reuseExistingNumber === true || meta?.reuseNumber === true;
  const acceptNumberChange = meta?.acceptNumberChange === true;
  const allowProvidedNumber = meta?.allowProvidedNumber === true;
  const historyPathRaw = typeof meta?.historyPath === "string" ? meta.historyPath.trim() : "";
  const historyDocType = typeof meta?.historyDocType === "string" ? meta.historyDocType.trim().toLowerCase() : "";
  const normalizedDocType = String(docTypeValue || "").trim().toLowerCase();
  const historyNumber = historyPathRaw ? FactDb.parseDocumentNumberFromPath(historyPathRaw) : "";
  const useHistoryPath =
    historyNumber && (!historyDocType || !normalizedDocType || historyDocType === normalizedDocType);
  const confirmNumberChange =
    meta?.confirmNumberChange === false
      ? false
      : !!previewNumber && !acceptNumberChange && !useHistoryPath && !reuseExistingNumber;

  let numberingResult = null;
  try {
    numberingResult = FactDb.saveDocumentWithNumber({
      docType: docTypeValue,
      date: dateValue,
      numberLength: meta?.numberLength || incoming?.meta?.numberLength,
      prefix: numberPrefixRaw,
      numberFormat: meta?.numberFormat || incoming?.meta?.numberFormat,
      data: incoming,
      status: statusValue,
      previewNumber,
      number: historyNumber || (typeof meta?.number === "string" ? meta.number.trim() : ""),
      allowExisting: !!useHistoryPath,
      reuseExistingNumber,
      confirmNumberChange,
      acceptNumberChange,
      allowProvidedNumber
    });
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
  if (numberingResult && typeof numberingResult === "object" && numberingResult.ok === false) {
    return numberingResult;
  }

  if (numberingResult?.number) {
    meta.number = numberingResult.number;
    if (incoming?.meta && typeof incoming.meta === "object") {
      incoming.meta.number = numberingResult.number;
    }
  }
  const numberValue = numberingResult?.number || meta.number || "";
  const response = {
    ok: true,
    path: FactDb.formatDocumentPath(numberValue),
    name: numberValue,
    number: numberValue,
    previewNumber: numberingResult?.previewNumber || previewNumber || "",
    numberChanged: !!numberingResult?.numberChanged
  };
  if (typeof numberingResult?.reason === "string" && numberingResult.reason.trim()) {
    response.reason = numberingResult.reason.trim();
  }
  if (numberingResult?.numberBehindSequence === true) {
    response.numberBehindSequence = true;
  }
  return response;
}

ipcMain.handle("save-invoice-json", async (_evt, payload = {}) => {
  return await saveInvoiceJson(payload, { allowDialog: true, enforceRoot: false });
});
// DB-accurate alias kept alongside legacy name for backward compatibility.
ipcMain.handle("save-invoice-record", async (_evt, payload = {}) => {
  return await saveInvoiceJson(payload, { allowDialog: true, enforceRoot: false });
});

ipcMain.handle("docLock:acquire", async (_evt, payload = {}) => {
  return FactDb.acquireDocEditLock(payload?.docKey || payload?.path || "");
});

ipcMain.handle("docLock:touch", async (_evt, payload = {}) => {
  return FactDb.touchDocEditLock(payload?.docKey || payload?.path || "", payload?.lockId || "");
});

ipcMain.handle("docLock:release", async (_evt, payload = {}) => {
  return FactDb.releaseDocEditLock(payload?.docKey || payload?.path || "", payload?.lockId || "");
});

async function openInvoiceJson(payload = {}, options = {}) {
  const allowDialog = options?.allowDialog !== false;
  const directPath = payload?.path;
  const directNumber = typeof payload?.number === "string" ? payload.number.trim() : "";
  const expectedCompanyId = String(
    payload?.expectedCompanyId || payload?.activeCompanyId || payload?.companyId || ""
  )
    .trim()
    .toLowerCase();
  const activeCompanyId = String(getActiveCompanyId() || "").trim().toLowerCase();
  const staleContextMessage = "La societe active a change. Les donnees ont ete rechargees.";
  if (hasCompanyContextMismatch({
    expectedCompanyId,
    activeCompanyId,
    path: directPath
  })) {
    if (allowDialog) {
      dialog.showErrorBox("Ouverture impossible", staleContextMessage);
    }
    return null;
  }

  if (directPath || directNumber) {
    try {
      const resolveNumberFromPath = (pathValue) => {
        if (!pathValue || typeof pathValue !== "string") return "";
        const normalized = pathValue.replace(/\\/g, "/");
        const base = normalized.split("/").filter(Boolean).pop() || "";
        const dot = base.lastIndexOf(".");
        return dot > 0 ? base.slice(0, dot) : base;
      };
      const dbNumber = directPath ? FactDb.parseDocumentNumberFromPath(directPath) : "";
      const fallbackNumber = directPath ? resolveNumberFromPath(directPath) : "";
      const number = dbNumber || directNumber || fallbackNumber;
      if (!number) throw new Error("Document introuvable.");
      const record = FactDb.getDocumentByNumber(number);
      if (!record) throw new Error("Document introuvable.");
      if (record?.data && typeof record.data === "object") {
        const target =
          record.data.data && typeof record.data.data === "object" ? record.data.data : record.data;
        if (target && typeof target === "object") {
          const meta = target.meta && typeof target.meta === "object" ? target.meta : (target.meta = {});
          if (record?.status) meta.status = record.status;
          if (record.id && !meta.id) meta.id = String(record.id);
        }
      }
      return record.data || null;
    } catch (err) {
      if (allowDialog) {
        dialog.showErrorBox("Ouverture impossible", String(err?.message || err));
      }
      return null;
    }
  }
  return null;
}

ipcMain.handle("open-invoice-json", async (_evt, payload = {}) => {
  return await openInvoiceJson(payload, { allowDialog: true, enforceRoot: false });
});
// DB-accurate alias kept alongside legacy name for backward compatibility.
ipcMain.handle("open-invoice-record", async (_evt, payload = {}) => {
  return await openInvoiceJson(payload, { allowDialog: true, enforceRoot: false });
});

ipcMain.handle("open-invoice-folder", async (_evt, payload = {}) => {
  try {
    const docType = payload?.docType || "facture";
    const scope = String(payload?.scope || "").toLowerCase();
    const normalized = String(docType || "facture").toLowerCase();
    if (normalized === "rapporttv" && scope === "pdf") {
      const dir = path.join(getActiveCompanyDataDir(), "pdf", "rapportTV");
      fs.mkdirSync(dir, { recursive: true });
      const result = await shell.openPath(dir);
      if (result && result.trim()) throw new Error(result);
      return { ok: true, path: dir };
    }
    if (normalized === "rapportclient" && scope === "pdf") {
      const dir = path.join(getActiveCompanyDataDir(), "pdf", "ReleveClients");
      fs.mkdirSync(dir, { recursive: true });
      const result = await shell.openPath(dir);
      if (result && result.trim()) throw new Error(result);
      return { ok: true, path: dir };
    }
    const normalizeSubDir = (value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      const normalizedPath = path.normalize(trimmed);
      if (path.isAbsolute(normalizedPath)) return "";
      if (normalizedPath.startsWith("..") || normalizedPath.includes(`..${path.sep}`)) return "";
      return normalizedPath;
    };
    const segments = [];
    if (scope === "pdf") segments.push("pdf");
    let dir = ensureDocTypeBaseDir(docType, segments);
    const subDir = normalizeSubDir(payload?.subDir);
    if (scope === "pdf" && subDir) {
      dir = path.join(dir, subDir);
    }
    fs.mkdirSync(dir, { recursive: true });
    const result = await shell.openPath(dir);
    if (result && result.trim()) throw new Error(result);
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("facturance:openDataDir", async () => {
  try {
    const dir = getFacturanceRootDir();
    const result = await shell.openPath(dir);
    if (result && result.trim()) throw new Error(result);
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("models:openExportDir", async () => {
  try {
    const dir = getModelExportDir();
    fs.mkdirSync(dir, { recursive: true });
    const result = await shell.openPath(dir);
    if (result && result.trim()) throw new Error(result);
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("facturance:getReportTaxPdfDir", async () => {
  try {
    const dir = path.join(getActiveCompanyDataDir(), "pdf", "rapportTV");
    await fsp.mkdir(dir, { recursive: true });
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("facturance:getClientStatementPdfDir", async () => {
  try {
    const dir = path.join(getActiveCompanyDataDir(), "pdf", "ReleveClients");
    await fsp.mkdir(dir, { recursive: true });
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("withholding:openXmlFile", async () => {
  try {
    const baseDir = path.join(getActiveCompanyDataDir(), "xml");
    await fsp.mkdir(baseDir, { recursive: true });
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Ouvrir un fichier XML",
      filters: [{ name: "XML", extensions: ["xml"] }],
      properties: ["openFile"],
      defaultPath: baseDir
    });
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
    const target = filePaths[0];
    const result = await shell.openPath(target);
    if (result && result.trim()) throw new Error(result);
    return { ok: true, path: target };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("withholding:saveXml", async (_evt, payload = {}) => {
  try {
    const baseDir = getActiveCompanyDataDir();
    const normalizeSubDir = (value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      const normalized = path.normalize(trimmed);
      if (path.isAbsolute(normalized)) return "";
      if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return "";
      return normalized;
    };
    const docType = String(payload?.docType || "").toLowerCase();
    let subDir = normalizeSubDir(payload?.subDir);
    if (!subDir && docType === "fa") {
      subDir = path.join("retenues", "factureAchat");
    } else if (!subDir && docType === "facture") {
      subDir = path.join("retenues", "facture");
    }
    const result = await saveWithholdingXml({ ...payload, baseDir, subDir });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

  ipcMain.handle("teif:generateUnsigned", async (_evt, payload = {}) => {
    try {
      const historyPath = String(payload?.historyPath || "").trim();
      const docType = String(payload?.docType || "facture").toLowerCase();
      if (!historyPath) return { ok: false, error: "Document introuvable." };
      if (docType !== "facture") return { ok: false, error: "Type de document non pris en charge." };
      const factureData = await openInvoiceJson({ path: historyPath, docType }, { allowDialog: false });
      if (!factureData) return { ok: false, error: "Document introuvable." };
      const companyProfile = FactDb.loadCompanyProfile?.() || null;
      const resolvedPayload = (() => {
        if (!companyProfile || typeof factureData !== "object" || factureData === null) return factureData;
        const payloadRoot = factureData;
        const dataRoot =
          payloadRoot.data && typeof payloadRoot.data === "object" ? payloadRoot.data : payloadRoot;
        const currentCompany =
          dataRoot.company && typeof dataRoot.company === "object" ? dataRoot.company : {};
        const mergedCompany = { ...companyProfile, ...currentCompany };
        const applyFallback = (key) => {
          const currentValue = String(mergedCompany[key] ?? "").trim();
          if (currentValue) return;
          const fallback = String(companyProfile[key] ?? "").trim();
          if (fallback) mergedCompany[key] = fallback;
        };
        [
          "name",
          "type",
          "vat",
          "customsCode",
          "iban",
          "phone",
          "fax",
          "email",
          "address",
          "logo"
        ].forEach(applyFallback);
        if (dataRoot === payloadRoot) {
          return { ...payloadRoot, company: mergedCompany };
        }
        return { ...payloadRoot, data: { ...dataRoot, company: mergedCompany } };
      })();
      const xml = buildUnsignedTeifXml(resolvedPayload);
    if (!xml || !String(xml).trim()) return { ok: false, error: "XML vide." };

    const baseDir = path.join(getActiveCompanyDataDir(), "xml", "factures");
    await fsp.mkdir(baseDir, { recursive: true });
    const metaNumber =
      factureData?.meta?.number || factureData?.number || FactDb.parseDocumentNumberFromPath(historyPath) || "";
    const fileBase = sanitizeFileBase(metaNumber || path.basename(historyPath, path.extname(historyPath)), "facture");
    const fileName = `${fileBase}.xml`;
    const targetPath = path.join(baseDir, fileName);
    await fsp.writeFile(targetPath, xml, "utf8");
    return { ok: true, path: targetPath, name: fileName, xml };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
    }
  });

ipcMain.handle("idtrust:thumbprint:get", async () => {
  try {
    const thumbprint = resolveIdTrustThumbprint();
    return { ok: true, thumbprint };
  } catch (err) {
    console.error("[idtrust:thumbprint:get] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("idtrust:thumbprint:set", async (_evt, payload = {}) => {
  try {
    const thumbprint = normalizeThumbprint(payload?.thumbprint);
    if (!thumbprint) return { ok: false, error: "Thumbprint requis." };
    FactDb.saveSetting({ key: IDTRUST_THUMBPRINT_KEY, value: thumbprint });
    return { ok: true, thumbprint };
  } catch (err) {
    console.error("[idtrust:thumbprint:set] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("idtrust:signTeif", async (_evt, payload = {}) => {
  try {
    const rawUnsigned = String(payload?.unsignedPath || "").trim();
    if (!rawUnsigned) {
      return { ok: false, error: "TEIF non g\u00e9n\u00e9r\u00e9 / fichier introuvable" };
    }
    const unsignedPath = path.resolve(rawUnsigned);
    if (!fs.existsSync(unsignedPath)) {
      return { ok: false, error: "TEIF non g\u00e9n\u00e9r\u00e9 / fichier introuvable" };
    }
    const signedPath = buildSignedTeifPath(unsignedPath);
    const thumbprint = normalizeThumbprint(payload?.thumbprint || resolveIdTrustThumbprint());
    if (!thumbprint) {
      return { ok: false, error: "Thumbprint de certificat introuvable." };
    }
    const result = await signTeifXml({ unsignedPath, signedPath, thumbprint });
    return {
      ok: true,
      signedPath: result?.signedPath || signedPath,
      thumbprint
    };
  } catch (err) {
    if (err?.stderr) {
      console.warn("[idtrust:signTeif] signer stderr:", err.stderr);
    }
    return {
      ok: false,
      error: String(err?.message || err || "Signature TEIF echouee."),
      stderr: err?.stderr || "",
      stdout: err?.stdout || ""
    };
  }
});

ipcMain.handle("xml:readFile", async (_evt, payload = {}) => {
  try {
    const targetPath = String(payload?.path || "").trim();
    if (!targetPath) return { ok: false, error: "Missing XML path." };
    const baseDir = path.join(getActiveCompanyDataDir(), "xml");
    const resolved = path.resolve(targetPath);
    if (!isPathInside(baseDir, resolved)) {
      return { ok: false, error: "Le fichier XML est en dehors du dossier autorise." };
    }
    if (!resolved.toLowerCase().endsWith(".xml")) {
      return { ok: false, error: "Le fichier doit etre un XML." };
    }
    const xml = await fsp.readFile(resolved, "utf-8");
    return { ok: true, xml, path: resolved, name: path.basename(resolved) };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("list-pdf-documents", async (_evt, payload = {}) => {
  try {
    const docType = String(payload?.docType || "facture").toLowerCase();
    const isReportTax = docType === "rapporttv";
    const normalizeSubDir = (value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      const normalized = path.normalize(trimmed);
      if (path.isAbsolute(normalized)) return "";
      if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return "";
      return normalized;
    };
    let baseDir = "";
    let jsonBaseDir = "";
    if (isReportTax) {
      baseDir = path.join(getActiveCompanyDataDir(), "pdf", "rapportTV");
      jsonBaseDir = "";
      fs.mkdirSync(baseDir, { recursive: true });
    } else {
      const subDir = normalizeSubDir(payload?.subDir);
      baseDir = ensureDocTypeBaseDir(docType, ["pdf"]);
      jsonBaseDir = ensureDocTypeBaseDir(docType);
      if (subDir) {
        baseDir = path.join(baseDir, subDir);
        jsonBaseDir = path.join(jsonBaseDir, subDir);
      }
      fs.mkdirSync(baseDir, { recursive: true });
    }
    const walker = [baseDir];
    const items = [];
    const dirCache = new Map();
    const readDirSafe = (dirPath) => {
      if (dirCache.has(dirPath)) return dirCache.get(dirPath);
      let entries = [];
      try {
        entries = fs.readdirSync(dirPath);
      } catch {
        entries = [];
      }
      dirCache.set(dirPath, entries);
      return entries;
    };
    const metaCache = new Map();
    const readClientNameFromMeta = (pdfPath) => {
      const { primary, legacy } = getPdfMetaPaths(pdfPath);
      const candidates = [primary, legacy].filter(Boolean);
      for (const metaPath of candidates) {
        if (metaCache.has(metaPath)) {
          const cached = metaCache.get(metaPath);
          if (cached) return cached;
          continue;
        }
        let value = "";
        try {
          const raw = fs.readFileSync(metaPath, "utf-8");
          const parsed = JSON.parse(raw);
          const name = parsed?.clientName;
          if (typeof name === "string") value = name.trim();
        } catch (err) {
          value = "";
        }
        metaCache.set(metaPath, value);
        if (value) return value;
      }
      return "";
    };
    const readClientNameFromJson = (pdfPath) => {
      if (!jsonBaseDir) return "";
      try {
        const relativePdf = path.relative(baseDir, pdfPath);
        if (!relativePdf || relativePdf.startsWith("..")) return "";
        const relDir = path.dirname(relativePdf);
        const baseName = path.basename(pdfPath, path.extname(pdfPath));
        const targetDir = path.join(jsonBaseDir, relDir);
        const files = readDirSafe(targetDir);
        const normalizedBase = baseName.toLowerCase();
        const match = files.find((file) => {
          const lower = file.toLowerCase();
          return lower.endsWith(".json") && lower.startsWith(normalizedBase);
        });
        if (!match) return "";
        const jsonPath = path.join(targetDir, match);
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const parsed = JSON.parse(raw);
        const payload = parsed && typeof parsed === "object" ? parsed : {};
        const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
        const name = data?.client?.name || data?.clientName || "";
        return typeof name === "string" ? name.trim() : "";
      } catch {
        return "";
      }
    };
    const resolveClientNameForPdf = (pdfPath) => {
      const fromMeta = readClientNameFromMeta(pdfPath);
      if (fromMeta) return fromMeta;
      return readClientNameFromJson(pdfPath);
    };
    const toIso = (value) => {
      try {
        const dt = value instanceof Date ? value : new Date(value);
        if (!dt || Number.isNaN(dt.getTime())) return null;
        return dt.toISOString();
      } catch {
        return null;
      }
    };

    while (walker.length > 0) {
      const current = walker.pop();
      let dirEntries = [];
      try {
        dirEntries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      dirEntries.forEach((entry) => {
        try {
          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walker.push(fullPath);
            return;
          }
          if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".pdf")) return;
          const stat = fs.statSync(fullPath);
          items.push({
            docType,
            path: fullPath,
            name: entry.name,
            relativePath: path.relative(baseDir, fullPath),
            directory: path.dirname(fullPath),
            size: stat.size,
            modifiedAt: toIso(stat.mtime),
            createdAt: toIso(stat.birthtime),
            clientName: resolveClientNameForPdf(fullPath)
          });
        } catch (err) {
          console.warn("list-pdf-documents entry failed", err);
        }
      });
    }

    items.sort((a, b) => {
      const aTime = Date.parse(a.modifiedAt || "") || 0;
      const bTime = Date.parse(b.modifiedAt || "") || 0;
      return bTime - aTime;
    });

    const total = items.length;
    const limit = Number(payload?.limit);
    const offset = Number(payload?.offset) || 0;
    const paged =
      Number.isFinite(limit) && limit > 0 ? items.slice(offset, offset + limit) : items;

    return { ok: true, items: paged, total };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("list-xml-documents", async (_evt, payload = {}) => {
  try {
    const baseRoot = path.join(getActiveCompanyDataDir(), "xml");
    const normalizeSubDir = (value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      const normalized = path.normalize(trimmed);
      if (path.isAbsolute(normalized)) return "";
      if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return "";
      return normalized;
    };
    const subDir = normalizeSubDir(payload?.subDir);
    const baseDir = subDir ? path.join(baseRoot, subDir) : baseRoot;
    fs.mkdirSync(baseDir, { recursive: true });
    const walker = [baseDir];
    const items = [];
    const toIso = (value) => {
      try {
        const dt = value instanceof Date ? value : new Date(value);
        if (!dt || Number.isNaN(dt.getTime())) return null;
        return dt.toISOString();
      } catch {
        return null;
      }
    };
    while (walker.length > 0) {
      const current = walker.pop();
      let dirEntries = [];
      try {
        dirEntries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      dirEntries.forEach((entry) => {
        try {
          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walker.push(fullPath);
            return;
          }
          if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".xml")) return;
          const stat = fs.statSync(fullPath);
          const baseName = path.basename(entry.name, ".xml");
          const reference = baseName.replace(/^xmlrs/i, "").replace(/^[-_\s]+/, "");
          items.push({
            docType: "retenue",
            path: fullPath,
            name: entry.name,
            reference: reference || baseName,
            relativePath: path.relative(baseDir, fullPath),
            directory: path.dirname(fullPath),
            size: stat.size,
            modifiedAt: toIso(stat.mtime),
            createdAt: toIso(stat.birthtime)
          });
        } catch (err) {
          console.warn("list-xml-documents entry failed", err);
        }
      });
    }

    items.sort((a, b) => {
      const aTime = Date.parse(a.modifiedAt || "") || 0;
      const bTime = Date.parse(b.modifiedAt || "") || 0;
      return bTime - aTime;
    });

    const total = items.length;
    const limit = Number(payload?.limit);
    const offset = Number(payload?.offset) || 0;
    const paged =
      Number.isFinite(limit) && limit > 0 ? items.slice(offset, offset + limit) : items;

    return { ok: true, items: paged, total };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

async function listInvoiceFiles(payload = {}) {
  try {
    const docType = String(payload?.docType || "facture").toLowerCase();
    const toIso = (value) => {
      try {
        const dt = value instanceof Date ? value : new Date(value);
        if (!dt || Number.isNaN(dt.getTime())) return null;
        return dt.toISOString();
      } catch {
        return null;
      }
    };
    const normalizeAmount = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const normalizeClientEntityType = (value, fallbackDocType = "") => {
      const normalized = String(value || "").trim().toLowerCase();
      if (["fournisseur", "fournisseurs", "vendor", "supplier"].includes(normalized)) {
        return "fournisseur";
      }
      if (["client", "clients", "customer"].includes(normalized)) {
        return "client";
      }
      const normalizedDocType = String(fallbackDocType || "").trim().toLowerCase();
      if (["fa", "be"].includes(normalizedDocType)) return "fournisseur";
      return normalizedDocType ? "client" : "";
    };
    const buildDocumentItem = ({
      id,
      payload,
      fallbackDocType,
      path: docPath,
      name,
      size,
      modifiedAt,
      createdAt,
      baseDir,
      hasComment,
      status,
      pdfPath,
      pdfExportedAt,
      convertedFrom: convertedFromInput
    }) => {
      const dataLevel1 = payload && typeof payload === "object" ? payload : {};
      const data = dataLevel1.data && typeof dataLevel1.data === "object" ? dataLevel1.data : dataLevel1;
      const meta = data?.meta && typeof data.meta === "object" ? data.meta : dataLevel1.meta || {};
      const client = data?.client && typeof data.client === "object" ? data.client : {};
      const totals =
        (data && typeof data.totals === "object" && data.totals) ||
        (dataLevel1 && typeof dataLevel1.totals === "object" && dataLevel1.totals) ||
        {};
      const totalHT = normalizeAmount(totals.totalHT ?? totals.totalHt ?? totals.ht);
      const totalTTC = normalizeAmount(
        totals.totalTTC ?? totals.totalTtc ?? totals.grand ?? totals.total ?? totals.ttc
      );
      const stampTT = normalizeAmount(
        totals?.extras?.stampTT ?? totals?.extras?.stampHT ?? totals?.extras?.stamp
      );
      const totalTTCExclStamp =
        Number.isFinite(totalTTC) && Number.isFinite(stampTT) ? totalTTC - stampTT : null;
      const currency = totals?.currency || meta?.currency || "";
      const paymentMethod = meta?.paymentMethod || meta?.mode || "";
      const paymentDate = meta?.paymentDate || "";
      const paymentReference = meta?.paymentReference || meta?.paymentRef || "";
      const historyStatus = status || "";
      const metaAcompte = meta?.acompte && typeof meta.acompte === "object" ? meta.acompte : {};
      const totalsAcompte =
        totals?.acompte && typeof totals.acompte === "object" ? totals.acompte : {};
      const metaReglement = meta?.reglement && typeof meta.reglement === "object" ? meta.reglement : null;
      const acompteEnabledRaw =
        typeof totalsAcompte.enabled === "boolean"
          ? totalsAcompte.enabled
          : typeof metaAcompte.enabled === "boolean"
            ? metaAcompte.enabled
            : null;
      const paidValue = normalizeAmount(totalsAcompte.paid ?? metaAcompte.paid);
      const balanceValue = normalizeAmount(
        totals.balanceDue ?? totals.balance_due ?? totals.balance ?? totalsAcompte.remaining
      );
      const reglementEnabledRaw =
        typeof meta?.reglementEnabled === "boolean"
          ? meta.reglementEnabled
          : typeof metaReglement?.enabled === "boolean"
            ? metaReglement.enabled
            : null;
      const reglementTextRaw =
        typeof meta?.reglementText === "string"
          ? meta.reglementText
          : typeof meta?.reglementValue === "string"
            ? meta.reglementValue
            : typeof metaReglement?.valueText === "string"
              ? metaReglement.valueText
              : typeof metaReglement?.text === "string"
                ? metaReglement.text
                : typeof meta?.reglement === "string"
                  ? meta.reglement
                  : "";
      const reglementDaysValue = normalizeAmount(metaReglement?.days ?? meta?.reglementDays);
      const reglementTypeRaw = metaReglement?.type ?? meta?.reglementType;
      let reglementText = String(reglementTextRaw || "").trim();
      if (!reglementText) {
        if (reglementDaysValue !== null) {
          const daysInt = Math.max(0, Math.trunc(reglementDaysValue));
          reglementText = `${daysInt} jours`;
        } else if (
          reglementEnabledRaw === true ||
          String(reglementTypeRaw || "").trim().toLowerCase() === "reception"
        ) {
          reglementText = "A r\u00e9ception";
        }
      }

      const resolvedDocType = meta?.docType ? String(meta.docType).toLowerCase() : fallbackDocType;
      const clientType = String(client?.type || "").trim();
      const clientEntityType = normalizeClientEntityType(
        client?.entityType || client?.role,
        resolvedDocType
      );
      const item = {
        id: id || "",
        docType: resolvedDocType || "facture",
        path: docPath || "",
        name: name || "",
        relativePath: baseDir && docPath ? path.relative(baseDir, docPath) : "",
        directory: baseDir && docPath ? path.dirname(docPath) : "",
        size: Number.isFinite(size) ? size : 0,
        modifiedAt: toIso(modifiedAt),
        createdAt: toIso(createdAt),
        number: meta?.number || "",
        date: meta?.date || "",
        clientName: client?.name || "",
        clientAccount: client?.account || client?.accountOf || ""
      };
      if (clientType) item.clientType = clientType;
      if (clientEntityType) item.clientEntityType = clientEntityType;
      const normalizedPdfPath = String(pdfPath || "").trim();
      if (normalizedPdfPath) {
        let exists = false;
        try {
          exists = fs.existsSync(normalizedPdfPath);
        } catch {
          exists = false;
        }
        if (exists) {
          item.pdfPath = normalizedPdfPath;
          const normalizedPdfExportedAt = String(pdfExportedAt || "").trim();
          if (normalizedPdfExportedAt) {
            item.pdfExportedAt = normalizedPdfExportedAt;
          }
        }
      }
      if (typeof hasComment === "number") item.has_comment = hasComment;
      const convertedFrom = convertedFromInput && typeof convertedFromInput === "object"
        ? convertedFromInput
        : meta?.convertedFrom;
      if (convertedFrom && typeof convertedFrom === "object") {
        const convertedFromDocType = convertedFrom.docType || convertedFrom.type
          ? String(convertedFrom.docType || convertedFrom.type).toLowerCase()
          : "";
        const convertedFromId = convertedFrom.id ? String(convertedFrom.id) : "";
        const convertedFromNumber = convertedFrom.number ? String(convertedFrom.number) : "";
        const convertedFromPath = convertedFrom.path ? String(convertedFrom.path) : "";
        const convertedFromDate = convertedFrom.date ? String(convertedFrom.date) : "";
        const normalizedConvertedFrom = {};
        if (convertedFromDocType) {
          normalizedConvertedFrom.docType = convertedFromDocType;
          normalizedConvertedFrom.type = convertedFromDocType;
        }
        if (convertedFromId) normalizedConvertedFrom.id = convertedFromId;
        if (convertedFromNumber) normalizedConvertedFrom.number = convertedFromNumber;
        if (convertedFromPath) normalizedConvertedFrom.path = convertedFromPath;
        if (convertedFromDate) normalizedConvertedFrom.date = convertedFromDate;
        if (Object.keys(normalizedConvertedFrom).length) {
          item.convertedFrom = normalizedConvertedFrom;
        }
      }
      if (totalHT !== null) item.totalHT = totalHT;
      if (totalTTC !== null) item.totalTTC = totalTTC;
      if (stampTT !== null) item.stampTT = stampTT;
      if (totalTTCExclStamp !== null) item.totalTTCExclStamp = totalTTCExclStamp;
      if (currency && String(currency).trim()) item.currency = String(currency).trim();
      if (paymentMethod && String(paymentMethod).trim()) {
        item.paymentMethod = String(paymentMethod).trim();
      }
      if (paymentDate && String(paymentDate).trim()) {
        item.paymentDate = String(paymentDate).trim();
      }
      if (paymentReference && String(paymentReference).trim()) {
        const referenceValue = String(paymentReference).trim();
        item.paymentReference = referenceValue;
        item.paymentRef = referenceValue;
      }
      if (historyStatus && String(historyStatus).trim()) {
        item.status = String(historyStatus).trim();
      }
      if (acompteEnabledRaw === true) {
        item.acompteEnabled = true;
        if (paidValue !== null) item.paid = paidValue;
        const balanceResolved =
          balanceValue !== null
            ? balanceValue
            : totalTTC !== null && paidValue !== null
              ? Math.max(0, totalTTC - paidValue)
              : null;
        if (balanceResolved !== null) item.balanceDue = balanceResolved;
      } else if (acompteEnabledRaw === false) {
        item.acompteEnabled = false;
      }
      if (reglementEnabledRaw === true) {
        item.reglementEnabled = true;
        if (reglementText) item.reglementText = reglementText;
      } else if (reglementEnabledRaw === false) {
        item.reglementEnabled = false;
      } else if (reglementText) {
        item.reglementText = reglementText;
      }
      return item;
    };

    const res = FactDb.listDocuments({
      docType,
      limit: payload?.limit,
      offset: payload?.offset
    });
    const items = res.results.map((row) =>
      buildDocumentItem({
        id: row.id,
        payload: row.data,
        convertedFrom: row.convertedFrom,
        fallbackDocType: row.docType,
        path: FactDb.formatDocumentPath(row.number),
        name: row.number,
        size: 0,
        modifiedAt: row.updatedAt || row.createdAt,
        createdAt: row.createdAt,
        hasComment: row.has_comment,
        status: row.status,
        pdfPath: row.pdfPath,
        pdfExportedAt: row.pdfExportedAt
      })
    );
    return { ok: true, items, total: res.total };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}


ipcMain.handle("list-invoice-files", async (_evt, payload = {}) => {
  return await listInvoiceFiles(payload);
});

async function updateDocumentPdfPath(payload = {}) {
  try {
    const pathValue = typeof payload?.path === "string" ? payload.path.trim() : "";
    const directNumber = typeof payload?.number === "string" ? payload.number.trim() : "";
    const parsedNumber = pathValue ? FactDb.parseDocumentNumberFromPath(pathValue) : "";
    const resolvedNumber = directNumber || parsedNumber || "";
    return FactDb.updateDocumentPdfPath({
      number: resolvedNumber,
      path: pathValue,
      pdfPath: payload?.pdfPath,
      pdfExportedAt: payload?.pdfExportedAt
    });
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

ipcMain.handle("documents:updatePdfPath", async (_evt, payload = {}) => {
  return await updateDocumentPdfPath(payload);
});

async function readPaymentHistory() {
  try {
    const items = FactDb.getPaymentHistory();
    return { ok: true, items };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), items: [] };
  }
}

async function writePaymentHistory(payload = {}) {
  try {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    FactDb.savePaymentHistory(items);
    const updated = FactDb.getPaymentHistory();
    return { ok: true, items: updated };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

ipcMain.handle("payments:history:read", async () => {
  return await readPaymentHistory();
});

ipcMain.handle("payments:history:write", async (_evt, payload = {}) => {
  return await writePaymentHistory(payload);
});

ipcMain.on("app:confirm-close", () => {
  allowAppClose = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.on("app:cancel-close", () => {
  allowAppClose = false;
});

function extractDeleteNumberFromPath(pathValue) {
  const raw = typeof pathValue === "string" ? pathValue.trim() : "";
  if (!raw) return "";
  const dbNumber = FactDb.parseDocumentNumberFromPath(raw);
  if (dbNumber) return String(dbNumber).trim();
  const normalized = raw.replace(/\\/g, "/");
  const filename = normalized.split("/").filter(Boolean).pop() || normalized;
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {}
  const dot = decoded.lastIndexOf(".");
  return (dot > 0 ? decoded.slice(0, dot) : decoded).trim();
}

function collectDeleteNumberCandidates(payload = {}) {
  const candidates = [];
  const pushCandidate = (value) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };
  pushCandidate(payload?.number);
  if (typeof payload?.path === "string" && payload.path.trim()) {
    const pathValue = payload.path.trim();
    pushCandidate(FactDb.parseDocumentNumberFromPath(pathValue));
    pushCandidate(extractDeleteNumberFromPath(pathValue));
  }
  return candidates;
}

async function deleteInvoiceFile(payload = {}, options = {}) {
  try {
    const payloadId = typeof payload?.id === "string" ? payload.id.trim() : "";
    const numberCandidates = collectDeleteNumberCandidates(payload);

    let record = null;
    if (payloadId && typeof FactDb.getDocumentById === "function") {
      record = FactDb.getDocumentById(payloadId);
    }
    if (!record) {
      for (const candidate of numberCandidates) {
        const match = FactDb.getDocumentByNumber(candidate);
        if (match) {
          record = match;
          break;
        }
      }
    }

    const resolvedNumber =
      (record?.number && String(record.number).trim()) ||
      numberCandidates[0] ||
      "";

    if (!resolvedNumber && !payloadId) {
      return { ok: false, missing: true, error: "Document introuvable." };
    }

    const restoredStock = false;
    let documentNumber = resolvedNumber;
    const invoicePayload = record?.data || null;
    if (invoicePayload) {
      try {
        const dataLevel1 = invoicePayload && typeof invoicePayload === "object" ? invoicePayload : {};
        const data =
          dataLevel1.data && typeof dataLevel1.data === "object"
            ? dataLevel1.data
            : dataLevel1;
        const meta =
          data?.meta && typeof data.meta === "object"
            ? data.meta
            : (dataLevel1.meta && typeof dataLevel1.meta === "object" ? dataLevel1.meta : {});
        const metaNumber = String(meta?.number || "").trim();
        if (metaNumber) documentNumber = metaNumber;
      } catch (err) {
        return { ok: false, error: String(err?.message || err) };
      }
    }

    const numbersToTry = [];
    const pushNumberToTry = (value) => {
      const normalized = typeof value === "string" ? value.trim() : "";
      if (!normalized || numbersToTry.includes(normalized)) return;
      numbersToTry.push(normalized);
    };
    pushNumberToTry(documentNumber);
    pushNumberToTry(resolvedNumber);
    numberCandidates.forEach((candidate) => pushNumberToTry(candidate));

    let deleteResult = null;
    if (payloadId && typeof FactDb.deleteDocumentById === "function") {
      try {
        deleteResult = FactDb.deleteDocumentById(payloadId);
      } catch (err) {
        console.warn("document db delete failed", err);
      }
      if (deleteResult && deleteResult.ok === false && !deleteResult.missing) {
        return { ok: false, error: String(deleteResult.error || "Suppression impossible."), restoredStock };
      }
      if (deleteResult && !deleteResult.missing) {
        return { ok: true, restoredStock };
      }
    }
    for (const numberToDelete of numbersToTry) {
      try {
        deleteResult = FactDb.deleteDocumentByNumber(numberToDelete);
      } catch (err) {
        console.warn("document db delete failed", err);
        return { ok: false, error: String(err?.message || err), restoredStock };
      }
      if (deleteResult && deleteResult.ok === false && !deleteResult.missing) {
        return { ok: false, error: String(deleteResult.error || "Suppression impossible."), restoredStock };
      }
      if (deleteResult && !deleteResult.missing) {
        break;
      }
    }
    if (!deleteResult || deleteResult.missing) {
      return { ok: false, missing: true, error: "Document introuvable.", restoredStock };
    }
    return { ok: true, restoredStock };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}


ipcMain.handle("delete-invoice-file", async (_evt, payload = {}) => {
  return await deleteInvoiceFile(payload, { enforceRoot: false });
});

/* ---------- Logo picker (stores in active company /Entreprise) ---------- */
ipcMain.handle("app:pickLogo", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir un logo",
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif", "ico", "svg"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths?.[0]) return null;
  const sourcePath = filePaths[0];
  try {
    const targetDir = await ensureEntrepriseDir();
    const parsed = path.parse(sourcePath);
    const safeBase = sanitizeFileName(parsed.name || "logo");
    const ext = parsed.ext || ".png";
    let targetPath = path.join(targetDir, `${safeBase}${ext}`);
    targetPath = ensureUniquePath(targetPath);
    await fsp.copyFile(sourcePath, targetPath);
    const buffer = await fsp.readFile(targetPath);
    const extLower = path.extname(targetPath).slice(1).toLowerCase();
    const mime =
      extLower === "svg" ? "image/svg+xml" :
      extLower === "jpg" || extLower === "jpeg" ? "image/jpeg" :
      `image/${extLower || "png"}`;
    return { dataUrl: `data:${mime};base64,${buffer.toString("base64")}`, path: targetPath };
  } catch (err) {
    console.error("app:pickLogo failed", err);
    dialog.showErrorBox("Logo", "Impossible d'enregistrer le logo dans le dossier de l'entreprise active.");
    try {
      const fallbackExt = path.extname(sourcePath).slice(1).toLowerCase();
      const buffer = await fsp.readFile(sourcePath);
      const mime =
        fallbackExt === "svg" ? "image/svg+xml" :
        fallbackExt === "jpg" || fallbackExt === "jpeg" ? "image/jpeg" :
        `image/${fallbackExt || "png"}`;
      return { dataUrl: `data:${mime};base64,${buffer.toString("base64")}` };
    } catch (readErr) {
      console.error("app:pickLogo fallback read failed", readErr);
      return null;
    }
  }
});

/* ---------- PDF export (NEW) ---------- */
ipcMain.handle("export-pdf", async (event, opts = {}) => {
  const { html = "", css = "", meta = {} } = opts || {};
  try {
    const pdfBuffer = await renderToPdfBuffer(html, css);
    return await savePdfToDisk(pdfBuffer, meta, event.sender);
  } catch (err) {
    console.error("export-pdf error:", err);
    dialog.showErrorBox("Erreur PDF", String(err?.message || err));
    return { ok: false, error: String(err?.message || err) };
  }
});

/* ---------- PDF export (legacy, kept for compatibility) ---------- */
ipcMain.handle("app:exportPDFFromHTML", async (event, payload) => {
  const { html = "", css = "", meta = {} } = payload || {};
  try {
    const pdfBuffer = await renderToPdfBuffer(html, css);
    return await savePdfToDisk(pdfBuffer, meta, event.sender);
  } catch (err) {
    console.error("app:exportPDFFromHTML error:", err);
    dialog.showErrorBox("Erreur PDF", String(err?.message || err));
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("app:printHTML", async (_event, payload = {}) => {
  const { html = "", css = "", print = {} } = payload || {};
  try {
    return await printHtmlSilent(html, css, print);
  } catch (err) {
    console.error("app:printHTML error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("app:saveFile", async (event, payload = {}) => {
  const data = payload?.data;
  const defaultPath =
    typeof payload?.defaultPath === "string" && payload.defaultPath.trim()
      ? payload.defaultPath.trim()
      : path.join(app.getPath("desktop"), "export.xlsx");
  const dialogOptions = {
    title: payload?.title || "Enregistrer le fichier",
    defaultPath,
  };
  if (Array.isArray(payload?.filters)) {
    dialogOptions.filters = payload.filters;
  }
  const browserWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const { canceled, filePath } = await dialog.showSaveDialog(browserWin, dialogOptions);
  if (canceled || !filePath) return { ok: false, canceled: true };

  const payloadData = resolveSaveFileData(data, filePath);
  if (!payloadData) return { ok: false, error: "Aucune donnee a enregistrer." };
  if (typeof payloadData === "string") {
    fs.writeFileSync(filePath, payloadData, "utf8");
  } else {
    fs.writeFileSync(filePath, payloadData);
  }
  return { ok: true, path: filePath, name: path.basename(filePath) };
});

ipcMain.handle("clients:exportFile", async (_event, payload = {}) => {
  const extRaw = String(payload?.ext || "xlsx").toLowerCase().replace(/^\./, "");
  const ext = extRaw === "csv" ? "csv" : "xlsx";
  const baseNameRaw = typeof payload?.baseName === "string" ? payload.baseName.trim() : "";
  const baseName = sanitizeFileName(baseNameRaw || "clients");
  const exportDir = getClientExportDir();
  ensureWritableDirSync(exportDir);
  const targetPath = path.join(exportDir, `${baseName}.${ext}`);
  const payloadData = resolveSaveFileData(payload?.data, targetPath);
  if (!payloadData) return { ok: false, error: "Aucune donnee a enregistrer." };
  try {
    if (typeof payloadData === "string") {
      fs.writeFileSync(targetPath, payloadData, "utf8");
    } else {
      fs.writeFileSync(targetPath, payloadData);
    }
    return { ok: true, path: targetPath, name: path.basename(targetPath) };
  } catch (err) {
    console.error("clients:exportFile failed", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("documents:exportFile", async (_event, payload = {}) => {
  const extRaw = String(payload?.ext || "xlsx").toLowerCase().replace(/^\./, "");
  const ext = extRaw === "csv" ? "csv" : "xlsx";
  const baseNameRaw = typeof payload?.baseName === "string" ? payload.baseName.trim() : "";
  const baseName = sanitizeFileName(baseNameRaw || "documents");
  const exportDir = getDocumentExportDir();
  ensureWritableDirSync(exportDir);
  const targetPath = path.join(exportDir, `${baseName}.${ext}`);
  const payloadData = resolveSaveFileData(payload?.data, targetPath);
  if (!payloadData) return { ok: false, error: "Aucune donnee a enregistrer." };
  try {
    if (typeof payloadData === "string") {
      fs.writeFileSync(targetPath, payloadData, "utf8");
    } else {
      fs.writeFileSync(targetPath, payloadData);
    }
    return { ok: true, path: targetPath, name: path.basename(targetPath) };
  } catch (err) {
    console.error("documents:exportFile failed", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("purchase:exportFile", async (_event, payload = {}) => {
  const fileNameRaw =
    typeof payload?.fileName === "string" && payload.fileName.trim()
      ? payload.fileName.trim()
      : "facture-achat-export.json";
  const parsed = path.parse(path.basename(fileNameRaw));
  const safeBase = sanitizeFileName(parsed.name || "facture-achat-export");
  const extRaw = String(parsed.ext || ".json").toLowerCase();
  const ext = extRaw === ".json" ? ".json" : ".json";
  const finalFileName = `${safeBase}${ext}`;
  const exportDir = getPurchaseInvoiceExportDir();
  ensureWritableDirSync(exportDir);
  const targetPath = ensureUniquePath(path.join(exportDir, finalFileName));
  const payloadData = resolveSaveFileData(payload?.data, targetPath);
  if (!payloadData) return { ok: false, error: "Aucune donnee a enregistrer." };
  try {
    if (typeof payloadData === "string") {
      fs.writeFileSync(targetPath, payloadData, "utf8");
    } else {
      fs.writeFileSync(targetPath, payloadData);
    }
    return { ok: true, path: targetPath, name: path.basename(targetPath) };
  } catch (err) {
    console.error("purchase:exportFile failed", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("models:exportFile", async (_event, payload = {}) => {
  const fileNameRaw =
    typeof payload?.fileName === "string" && payload.fileName.trim()
      ? payload.fileName.trim()
      : "modele-export.json";
  const parsed = path.parse(path.basename(fileNameRaw));
  const safeBase = sanitizeFileName(parsed.name || "modele-export");
  const finalFileName = `${safeBase}.json`;
  const exportDir = getModelExportDir();
  ensureWritableDirSync(exportDir);
  const targetPath = ensureUniquePath(path.join(exportDir, finalFileName));
  const payloadData = resolveSaveFileData(payload?.data, targetPath);
  if (!payloadData) return { ok: false, error: "Aucune donnee a enregistrer." };
  try {
    if (typeof payloadData === "string") {
      fs.writeFileSync(targetPath, payloadData, "utf8");
    } else {
      fs.writeFileSync(targetPath, payloadData);
    }
    return { ok: true, path: targetPath, name: path.basename(targetPath) };
  } catch (err) {
    console.error("models:exportFile failed", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

/* ---------- OS helpers (unchanged) ---------- */
ipcMain.handle("app:openPath", async (_evt, absPath) => {
  try { const res = await shell.openPath(absPath); return res === ""; } catch { return false; }
});
ipcMain.handle("app:showInFolder", async (_evt, absPath) => {
  try { shell.showItemInFolder(absPath); return true; } catch { return false; }
});
ipcMain.handle("app:openExternal", async (_evt, url) => {
  try { await shell.openExternal(url); return true; } catch { return false; }
});

ipcMain.handle("smtp:send", async (_evt, payload = {}) => {
  try {
    const smtp = payload && typeof payload.smtp === "object" ? payload.smtp : {};
    const msg = payload && typeof payload.message === "object" ? payload.message : {};
    const host = String(smtp.host || "").trim();
    const port = Number(smtp.port);
    const secure = !!smtp.secure;
    const user = String(smtp.user || "").trim();
    const pass = String(smtp.pass || "");
    const fromEmail = String(smtp.fromEmail || user || "").trim();
    const fromName = String(smtp.fromName || "").trim();
    const to = String(msg.to || "").trim();
    const subject = String(msg.subject || "");
    const text = typeof msg.text === "string" ? msg.text : (msg.text == null ? "" : String(msg.text));

    if (!host || !Number.isFinite(port) || !to || !fromEmail) {
      return { ok: false, error: "Parametres SMTP incomplets." };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    const attachmentsRaw = Array.isArray(msg.attachments) ? msg.attachments : [];
    const attachments = attachmentsRaw
      .map((att) => {
        const filePath = typeof att?.path === "string" ? att.path.trim() : "";
        if (!filePath || !fs.existsSync(filePath)) return null;
        const fileName = typeof att?.filename === "string" && att.filename.trim()
          ? att.filename.trim()
          : path.basename(filePath);
        return { path: filePath, filename: fileName };
      })
      .filter(Boolean);

    const mailOptions = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to,
      subject,
      text,
      attachments
    };
    const info = await transporter.sendMail(mailOptions);
    return { ok: true, messageId: info?.messageId || null };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("lan-server:start", async (_evt, payload = {}) => {
  return await startLanServer(payload);
});

ipcMain.handle("lan-server:stop", async () => {
  return await stopLanServer();
});

ipcMain.handle("lan-server:status", async () => {
  return getLanServerStatus();
});

ipcMain.handle("number:preview", async (_evt, payload = {}) => {
  try {
    maybeResetDocumentIndex(payload?.docType || "facture", payload?.date);
    return FactDb.previewDocumentNumber(payload || {});
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

/* ---------- Articles (unchanged) ---------- */
function ensureSafeName(s = "article") {
  return String(s).trim().replace(/[\/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").substring(0, 60) || "article";
}
function getArticlesDir() {
  return path.join(getActiveCompanyDataDir(), "Articles");
}
async function ensureArticlesDir() {
  const dir = getArticlesDir();
  if (!ARTICLES_FS_ENABLED) return dir;
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function normalizeStockNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

function clampStockQuantity(value) {
  const n = normalizeStockNumber(value);
  return n < 0 ? 0 : n;
}

function normalizeArticleNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeArticleDuplicateField(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveArticleIdFromPath(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return (
    FactDb.parseArticleIdFromPath(trimmed) ||
    FactDb.getArticleIdByLegacyPath(trimmed) ||
    null
  );
}

function resolveArticleUpdateTarget(targetPath, article = {}) {
  const idFromPath = resolveArticleIdFromPath(targetPath);
  if (!idFromPath) return { id: null, record: null };
  let resolvedId = idFromPath;
  let record = FactDb.getArticleById(resolvedId);
  if (record?.article) return { id: resolvedId, record };
  const fallbackDuplicate = FactDb.findDuplicateArticle(article, { excludeId: null });
  const fallbackId = fallbackDuplicate?.conflict?.id || null;
  if (fallbackId && fallbackId !== resolvedId) {
    const fallbackRecord = FactDb.getArticleById(fallbackId);
    if (fallbackRecord?.article) {
      resolvedId = fallbackId;
      record = fallbackRecord;
    }
  }
  return { id: resolvedId, record: record?.article ? record : null };
}

function buildArticleDuplicateCheckPayload(article = {}, baselineArticle = null) {
  if (!baselineArticle || typeof baselineArticle !== "object") return article;
  const payload = article && typeof article === "object" ? { ...article } : {};
  ["ref", "product", "desc"].forEach((field) => {
    const nextValue = normalizeArticleDuplicateField(payload[field]);
    const previousValue = normalizeArticleDuplicateField(baselineArticle[field]);
    // Allow editing existing duplicate records as long as the duplicate key value itself is unchanged.
    if (nextValue === previousValue) payload[field] = "";
  });
  return payload;
}

function normalizeArticleFodec(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const f = source.fodec && typeof source.fodec === "object" ? source.fodec : {};
  const rate = normalizeArticleNumber(
    f.rate ?? source.fodecRate ?? source.fodec_rate ?? source.fodec_rate_pct ?? source.fodecRatePct,
    0
  );
  const tva = normalizeArticleNumber(
    f.tva ?? source.fodecTva ?? source.fodec_tva ?? source.fodecTvaPct ?? source.fodec_tva_pct,
    0
  );
  const enabledFlag = f.enabled ?? source.fodecEnabled ?? source.fodec_enabled;
  const labelRaw = f.label || source.fodecLabel;
  const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : "FODEC";
  const hasValue = Math.abs(rate) > 0 || Math.abs(tva) > 0;
  const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
  return { enabled, label, rate, tva };
}

async function adjustArticleStockFile(targetPath, deltaRaw) {
  if (!targetPath) return { ok: false, error: "Chemin introuvable." };
  const dbId = FactDb.parseArticleIdFromPath(targetPath);
  if (dbId) {
    return FactDb.adjustArticleStockById(dbId, deltaRaw);
  }
  try {
    const txt = await fsp.readFile(targetPath, "utf-8");
    const article = JSON.parse(txt);
    if (!article || typeof article !== "object") throw new Error("Article invalide.");
    const suggested = article.ref || article.product || article.desc || "article";
    const record = FactDb.saveArticle({ article, suggestedName: suggested, legacyPath: targetPath });
    return FactDb.adjustArticleStockById(record.id, deltaRaw);
  } catch (err) {
    if (err?.code === "ENOENT") return { ok: false, missing: true, error: "Article introuvable." };
    return { ok: false, error: String(err?.message || err) };
  }
}

async function findDuplicateArticle(article = {}, { excludePath = null, excludeId = null } = {}) {
  if (!article || typeof article !== "object") return null;
  const resolvedExcludeId =
    (typeof excludeId === "string" && excludeId.trim()) ||
    (excludePath ? resolveArticleIdFromPath(excludePath) : null) ||
    null;
  const duplicate = FactDb.findDuplicateArticle(article, { excludeId: resolvedExcludeId });
  if (!duplicate) return null;
  const conflictPath = duplicate.conflict?.id
    ? FactDb.formatArticlePath(duplicate.conflict.id)
    : "";
  return {
    field: duplicate.field,
    name: duplicate.conflict?.name || "",
    path: conflictPath || "",
    conflict: {
      ...duplicate.conflict,
      path: conflictPath
    }
  };
}

function buildDuplicateArticleError(conflict = {}) {
  const labels = { reference: "référence", product: "produit", description: "description" };
  const label = labels[conflict.field] || "référence";
  const name = conflict.name ? ` (${conflict.name})` : "";
  return {
    ok: false,
    code: "duplicate_article",
    field: conflict.field || "reference",
    message: `Un article avec la même ${label} existe déjà${name}.`,
    conflict
  };
}

ipcMain.handle("articles:save", async (_event, payload = {}) => {
  try {
    const { article = {}, suggestedName = "article" } = payload || {};
    const safe = ensureSafeName(suggestedName || article.ref || article.product || "article");
    const duplicate = await findDuplicateArticle(article);
    if (duplicate) return buildDuplicateArticleError(duplicate);
    const dbResult = FactDb.saveArticle({
      article,
      suggestedName: safe
    });
    return { ok: true, path: dbResult.path, name: dbResult.name };
  } catch (e) {
    console.error("[articles:save] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("articles:saveAuto", async (_evt, payload = {}) => {
  try {
    const { article = {}, suggestedName = "article" } = payload || {};
    const safe = ensureSafeName(suggestedName || article.ref || article.product || "article");
    const duplicate = await findDuplicateArticle(article);
    if (duplicate) return buildDuplicateArticleError(duplicate);
    const dbResult = FactDb.saveArticle({
      article,
      suggestedName: safe
    });
    return { ok: true, path: dbResult.path, name: dbResult.name };
  } catch (e) {
    console.error("[articles:saveAuto] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("articles:update", async (_evt, payload = {}) => {
  try {
    const targetPath = payload?.path;
    if (!targetPath) throw new Error("Chemin introuvable.");
    const article = payload?.article || {};
    const target = resolveArticleUpdateTarget(targetPath, article);
    if (!target.id || !target.record?.article) throw new Error("Article introuvable.");
    const duplicatePayload = buildArticleDuplicateCheckPayload(article, target.record.article);
    const duplicate = await findDuplicateArticle(duplicatePayload, { excludeId: target.id });
    if (duplicate) return buildDuplicateArticleError(duplicate);
    const dbResult = FactDb.saveArticle({
      id: target.id,
      article,
      suggestedName: payload?.suggestedName || article.ref || article.product || "article"
    });
    return { ok: true, path: dbResult.path, name: dbResult.name };
  } catch (e) {
    console.error("[articles:update] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("articles:adjustStock", async (_evt, payload = {}) => {
  const res = await adjustArticleStockFile(payload?.path, payload?.delta ?? payload?.stockDelta ?? 0);
  if (!res.ok) console.error("[articles:adjustStock] error:", res.error);
  return res;
});

ipcMain.handle("articles:open", async () => {
  try {
    const dir = await ensureArticlesDir();
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Charger un article",
      defaultPath: dir,
      properties: ["openFile"],
      filters: [
        { name: "Articles", extensions: ["json"] },
        { name: "Tous les fichiers", extensions: ["*"] },
      ],
    });
    if (canceled || !filePaths?.[0]) return null;
    const txt = await fsp.readFile(filePaths[0], "utf-8");
    const data = JSON.parse(txt);
    return {
      ref: data.ref ?? "",
      product: data.product ?? "",
      desc: data.desc ?? "",
      qty: Number(data.qty ?? 1),
      stockQty: Number(data.stockQty ?? 0),
      price: Number(data.price ?? 0),
      tva: Number(data.tva ?? 19),
      discount: Number(data.discount ?? 0),
      fodec: normalizeArticleFodec(data)
    };
  } catch (e) {
    console.error("[articles:open] error:", e);
    throw e;
  }
});

ipcMain.handle("articles:list", async () => {
  try {
    return FactDb.listArticles();
  } catch (e) {
    console.error("[articles:list] error:", e);
    return [];
  }
});

ipcMain.handle("articles:search", async (_evt, payload = {}) => {
  try {
    const { query = "", limit, offset } = payload || {};
    const limitValue = Number(limit);
    const offsetValue = Number(offset);
    const res = FactDb.searchArticles({
      query,
      limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : null,
      offset: Number.isFinite(offsetValue) && offsetValue > 0 ? Math.floor(offsetValue) : 0
    });
    return { ok: true, results: res.results, total: res.total };
  } catch (e) {
    console.error("[articles:search] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});



ipcMain.handle("articles:delete", async (_evt, payload = {}) => {
  try {
    const targetPath = payload?.path;
    if (!targetPath) throw new Error("Chemin introuvable.");
    const id =
      FactDb.parseArticleIdFromPath(targetPath) || FactDb.getArticleIdByLegacyPath(targetPath);
    if (id) return FactDb.deleteArticle(id);
    const dir = await ensureArticlesDir();
    const safeDir = path.resolve(dir);
    const resolved = path.resolve(targetPath);
    if (!resolved.startsWith(safeDir)) {
      throw new Error("Suppression non autorisAce.");
    }
    await fsp.unlink(resolved);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});


/* ---------- Models (Facturance\\Models) ---------- */
function sanitizeModelPresetName(rawName) {
  if (rawName === null || rawName === undefined) return "";
  return String(rawName).trim().replace(/\s+/g, " ").slice(0, 80);
}

function getModelsDir() {
  return path.join(getActiveCompanyDataDir(), "Models");
}

const legacyModelsMigrated = new Set();

async function migrateLegacyModelsToDb() {
  const companyKey = getActiveCompanyId() || "entreprise0";
  if (legacyModelsMigrated.has(companyKey)) return;
  legacyModelsMigrated.add(companyKey);
  const dir = getModelsDir();
  if (!dir || !fs.existsSync(dir)) return;
  let files = [];
  try {
    files = await fsp.readdir(dir);
  } catch {
    return;
  }
  let existing = new Set();
  try {
    const current = FactDb.listModels();
    existing = new Set((Array.isArray(current) ? current : []).map((entry) => entry?.name).filter(Boolean));
  } catch (err) {
    console.warn("models migration list failed", err?.message || err);
  }
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".json")) continue;
    const filePath = path.join(dir, file);
    try {
      const txt = await fsp.readFile(filePath, "utf-8");
      const data = JSON.parse(txt);
      const inferred = path.parse(file).name.replace(/\.model$/i, "");
      const name = sanitizeModelPresetName(data?.name || inferred);
      if (!name || existing.has(name)) continue;
      const config = data?.config && typeof data.config === "object" ? data.config : {};
      FactDb.saveModel({ name, config });
      existing.add(name);
    } catch (err) {
      console.warn("models migration skipped", file, err?.message || err);
    }
  }
}

ipcMain.handle("models:list", async () => {
  try {
    await migrateLegacyModelsToDb();
    const models = FactDb.listModels();
    return { ok: true, models };
  } catch (err) {
    console.error("[models:list] error:", err);
    return { ok: false, error: String(err?.message || err), models: [] };
  }
});

ipcMain.handle("models:load", async (_evt, payload = {}) => {
  try {
    await migrateLegacyModelsToDb();
    const name = sanitizeModelPresetName(payload?.name);
    if (!name) return { ok: false, error: "Nom de modele requis." };
    const record = FactDb.loadModel(name);
    if (!record) return { ok: false, missing: true, error: "Modele introuvable." };
    return { ok: true, name: record.name, config: record.config };
  } catch (err) {
    console.error("[models:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("models:save", async (_evt, payload = {}) => {
  try {
    const name = sanitizeModelPresetName(payload?.name);
    if (!name) return { ok: false, error: "Nom de modele requis." };
    const config = payload?.config && typeof payload.config === "object" ? payload.config : {};
    FactDb.saveModel({ name, config });
    return { ok: true, name };
  } catch (err) {
    console.error("[models:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("models:delete", async (_evt, payload = {}) => {
  try {
    const name = sanitizeModelPresetName(payload?.name);
    if (!name) return { ok: false, error: "Nom de modele requis." };
    const result = FactDb.deleteModel(name);
    return result;
  } catch (err) {
    console.error("[models:delete] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("client-fields:load", async () => {
  try {
    const record = FactDb.loadSetting(CLIENT_FIELD_SETTINGS_KEY);
    const settings = record?.value && typeof record.value === "object" ? record.value : {};
    return { ok: true, settings };
  } catch (err) {
    console.error("[client-fields:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("client-fields:save", async (_evt, payload = {}) => {
  try {
    const incoming =
      payload?.settings && typeof payload.settings === "object"
        ? payload.settings
        : {
            visibility: payload?.visibility,
            labels: payload?.labels
          };
    const record = FactDb.loadSetting(CLIENT_FIELD_SETTINGS_KEY);
    const existing = record?.value && typeof record.value === "object" ? record.value : {};
    const settings =
      incoming && typeof incoming === "object"
        ? Object.fromEntries(
            Object.entries(incoming).filter(([, value]) => value !== undefined)
          )
        : {};
    FactDb.saveSetting({
      key: CLIENT_FIELD_SETTINGS_KEY,
      value: { ...existing, ...settings }
    });
    return { ok: true };
  } catch (err) {
    console.error("[client-fields:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("article-fields:load", async () => {
  try {
    const record = FactDb.loadSetting(ARTICLE_FIELD_SETTINGS_KEY);
    const settings = record?.value && typeof record.value === "object" ? record.value : {};
    return { ok: true, settings };
  } catch (err) {
    console.error("[article-fields:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("article-fields:save", async (_evt, payload = {}) => {
  try {
    const incoming =
      payload?.settings && typeof payload.settings === "object"
        ? payload.settings
        : {
            visibility: payload?.visibility,
            defaults: payload?.defaults,
            labels: payload?.labels
          };
    const record = FactDb.loadSetting(ARTICLE_FIELD_SETTINGS_KEY);
    const existing = record?.value && typeof record.value === "object" ? record.value : {};
    const settings =
      incoming && typeof incoming === "object"
        ? Object.fromEntries(
            Object.entries(incoming).filter(([, value]) => value !== undefined)
          )
        : {};
    FactDb.saveSetting({
      key: ARTICLE_FIELD_SETTINGS_KEY,
      value: { ...existing, ...settings }
    });
    return { ok: true };
  } catch (err) {
    console.error("[article-fields:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("withholding-fa-settings:load", async () => {
  try {
    const record = FactDb.loadSetting(WITHHOLDING_FA_SETTINGS_KEY);
    const settings = record?.value && typeof record.value === "object" ? record.value : {};
    return { ok: true, settings };
  } catch (err) {
    console.error("[withholding-fa-settings:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("withholding-fa-settings:save", async (_evt, payload = {}) => {
  try {
    const settings =
      payload?.settings && typeof payload.settings === "object"
        ? payload.settings
        : {
            threshold: payload?.threshold,
            cnpc: payload?.cnpc,
            pCharge: payload?.pCharge,
            rate: payload?.rate,
            operationCategory: payload?.operationCategory,
            operationType: payload?.operationType
          };
    FactDb.saveSetting({ key: WITHHOLDING_FA_SETTINGS_KEY, value: settings || {} });
    return { ok: true };
  } catch (err) {
    console.error("[withholding-fa-settings:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("company:load", async () => {
  try {
    let data = FactDb.loadCompanyProfile();
    if (!data) {
      await ensureEntrepriseDir();
    }
    const active = getActiveCompanyPaths();
    const profileName = normalizeCompanyDisplayName(data?.name || "");
    if (profileName) {
      CompanyManager.setCompanyDisplayName(getFacturanceRootDir(), active.id, profileName, {
        ifEmpty: true
      });
    }
    const fallbackName =
      CompanyManager.getCompanyDisplayName(getFacturanceRootDir(), active.id) || active.id;
    if ((!data || typeof data !== "object")) {
      data = {};
    }
    if (!String(data?.name || "").trim() && fallbackName) {
      data = { ...data, name: fallbackName };
    }
    return { ok: true, data, activeCompanyId: active.id, activeCompany: active };
  } catch (err) {
    console.error("[company:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("company:save", async (_evt, payload = {}) => {
  try {
    const snapshot = sanitizeCompanyPayload(payload);
    const companySnapshot = { ...snapshot };
    delete companySnapshot.smtp;
    const saved = FactDb.saveCompanyProfile(companySnapshot);
    const active = getActiveCompanyPaths();
    const savedName = normalizeCompanyDisplayName(saved?.name || companySnapshot?.name || "");
    if (savedName) {
      CompanyManager.setCompanyDisplayName(getFacturanceRootDir(), active.id, savedName);
      broadcastCompanyCatalogChange(buildCatalogChangePayload("metadata-updated"));
    }
    return { ok: true, data: saved, activeCompanyId: active.id, activeCompany: active };
  } catch (err) {
    console.error("[company:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("companies:list", async () => {
  try {
    const companies = listCompanyCatalog();
    const activeCompanyId = getActiveCompanyId();
    return { ok: true, companies, activeCompanyId };
  } catch (err) {
    console.error("[companies:list] error:", err);
    return { ok: false, error: String(err?.message || err), companies: [] };
  }
});

ipcMain.handle("companies:create", async (_evt, payload = {}) => {
  try {
    const created = createCompanyRuntime(payload || {}, {
      source: "desktop-ipc"
    });
    return {
      ok: true,
      company: created.company,
      switched: !!created.switched,
      activeCompanyId: created.activeCompanyId,
      activeCompany: created.activeCompany
    };
  } catch (err) {
    console.error("[companies:create] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("companies:setActive", async (_evt, payload = {}) => {
  try {
    const switched = switchActiveCompanyRuntime(payload, {
      source: "desktop-ipc",
      emitLocalEvent: true
    });
    return {
      ok: true,
      switched: !!switched.switched,
      activeCompanyId: switched.activeCompanyId,
      activeCompany: switched.activeCompany
    };
  } catch (err) {
    console.error("[companies:setActive] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("companies:switch", async (_evt, payload = {}) => {
  try {
    const switched = switchActiveCompanyRuntime(payload, {
      source: "desktop-ipc",
      emitLocalEvent: true
    });
    return {
      ok: true,
      switched: !!switched.switched,
      activeCompanyId: switched.activeCompanyId,
      activeCompany: switched.activeCompany,
      snapshot: {
        company: switched.company || {},
        smtpProfiles: switched.smtpProfiles || {}
      }
    };
  } catch (err) {
    console.error("[companies:switch] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("companies:getActivePaths", async () => {
  try {
    const active = getActiveCompanyPaths();
    return { ok: true, activeCompanyId: active.id, activeCompany: active };
  } catch (err) {
    console.error("[companies:getActivePaths] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("smtp:load", async () => {
  try {
    const profiles = FactDb.loadSmtpSettings();
    return { ok: true, profiles };
  } catch (err) {
    console.error("[smtp:load] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("smtp:save", async (_evt, payload = {}) => {
  try {
    const saved = FactDb.saveSmtpSettings(payload || {});
    return { ok: true, data: saved };
  } catch (err) {
    console.error("[smtp:save] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("company:saveSealFile", async (_evt, payload = {}) => {
  try {
    const sourcePath = payload?.path;
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error("Fichier introuvable.");
    }
    const dir = await ensureEntrepriseDir();
    const parsed = path.parse(sourcePath);
    const preferredName = payload?.name ? path.parse(payload.name).name : parsed.name;
    const safeBase = sanitizeFileName(preferredName || "cachet");
    const ext = parsed.ext || ".png";
    let targetPath = path.join(dir, `${safeBase}${ext}`);
    targetPath = ensureUniquePath(targetPath);
    await fsp.copyFile(sourcePath, targetPath);
    return { ok: true, path: targetPath };
  } catch (err) {
    console.error("[company:saveSealFile] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("company:saveSignatureFile", async (_evt, payload = {}) => {
  try {
    const sourcePath = payload?.path;
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error("Fichier introuvable.");
    }
    const dir = await ensureEntrepriseDir();
    const parsed = path.parse(sourcePath);
    const preferredName = payload?.name ? path.parse(payload.name).name : parsed.name;
    const safeBase = sanitizeFileName(preferredName || "signature");
    const ext = parsed.ext || ".png";
    let targetPath = path.join(dir, `${safeBase}${ext}`);
    targetPath = ensureUniquePath(targetPath);
    await fsp.copyFile(sourcePath, targetPath);
    return { ok: true, path: targetPath };
  } catch (err) {
    console.error("[company:saveSignatureFile] error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});
