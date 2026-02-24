"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const fs = require("fs");
const fsp = require("fs/promises");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { spawn } = require("child_process");
const crypto = require("crypto");

const app = express();

// ------------------------------------------------------------------
// Basic middleware
// ------------------------------------------------------------------
app.use(express.json({ limit: "100kb" }));
app.use(helmet());

// IMPORTANT for o2switch/cPanel / reverse proxy
app.set("trust proxy", 1);

// ------------------------------------------------------------------
// CONFIG (set via environment variables)
// ------------------------------------------------------------------
const ADMIN_USER = String(process.env.ADMIN_USER || "admin").trim();
const ADMIN_PASS_HASH = String(process.env.ADMIN_PASS_HASH || "").trim(); // MUST be bcrypt hash ($2a$ / $2b$ / $2y$)
const SESSION_SECRET = String(process.env.SESSION_SECRET || "CHANGE_ME_PLEASE");
const NODE_ENV = String(process.env.NODE_ENV || "development").trim().toLowerCase();
const PORT = Number(process.env.PORT || 5050);

const DEFAULT_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h
const REMEMBER_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

function isBcryptHash(value) {
  // Typical bcrypt hashes start with $2a$, $2b$ or $2y$ and are ~60 chars.
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

if (NODE_ENV === "production" && SESSION_SECRET === "CHANGE_ME_PLEASE") {
  console.warn("[WARN] SESSION_SECRET is still default. Set a strong SESSION_SECRET in production!");
}
if (ADMIN_PASS_HASH && !isBcryptHash(ADMIN_PASS_HASH)) {
  console.warn(
    "[WARN] ADMIN_PASS_HASH does not look like a bcrypt hash. It should start with $2a$ / $2b$ / $2y$."
  );
}

// ------------------------------------------------------------------
// Sessions
// ------------------------------------------------------------------
app.use(
  session({
    name: "facturance_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // In production you typically run behind HTTPS -> secure cookie
      secure: NODE_ENV === "production",
      maxAge: DEFAULT_SESSION_MAX_AGE_MS,
    },
  })
);

// ------------------------------------------------------------------
// Rate limit brute force on login
// ------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function openInDefaultBrowser(url) {
  try {
    let command = "";
    let args = [];

    if (process.platform === "win32") {
      command = "cmd";
      args = ["/c", "start", "", url];
    } else if (process.platform === "darwin") {
      command = "open";
      args = [url];
    } else {
      command = "xdg-open";
      args = [url];
    }

    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", (err) => console.warn(`Could not auto-open browser: ${err.message}`));
    child.unref();
  } catch (err) {
    console.warn(`Could not auto-open browser: ${err.message}`);
  }
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();

  if (req.originalUrl.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.redirect("/");
}

function getNpmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

// ------------------------------------------------------------------
// Static pages
// ------------------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, "public");

app.get("/", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/app");
  return res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/app", requireAdmin, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "app.html")));

// public assets if needed
app.use("/public", express.static(PUBLIC_DIR));

// ------------------------------------------------------------------
// AUTH API
// ------------------------------------------------------------------
app.post("/api/login", loginLimiter, async (req, res) => {
  if (!ADMIN_PASS_HASH) {
    return res.status(500).json({ error: "ADMIN_PASS_HASH is not set on server." });
  }
  if (!isBcryptHash(ADMIN_PASS_HASH)) {
    return res.status(500).json({
      error: "ADMIN_PASS_HASH must be a bcrypt hash (should start with $2a$ / $2b$ / $2y$).",
    });
  }

  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const remember = Boolean(req.body?.remember);

  if (username !== ADMIN_USER) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.isAdmin = true;
  req.session.cookie.maxAge = remember ? REMEMBER_SESSION_MAX_AGE_MS : DEFAULT_SESSION_MAX_AGE_MS;
  return res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ------------------------------------------------------------------
// BUILD LOGIC (protected)
// ------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const BRANDING_FILE = path.join(REPO_ROOT, "src/renderer/config/branding.js");
const GENERATED_GROUP_JSON_FILE = path.join(REPO_ROOT, "build", "generated-company-group.json");
const GENERATED_GROUP_MODULE_FILE = path.join(REPO_ROOT, "src/renderer/config/generated-company-group.js");
const BUILDS_ROOT = path.join(__dirname, "builds");
const COMPANIES_FILE = path.join(__dirname, "companies.json");
const MULTICOMPANIES_FILE = path.join(__dirname, "multicompanies.js");

function normalizeCompanyName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeGroupId(value, fallback = "group") {
  const normalized = String(value || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || fallback;
}

function sanitizeGroupName(value) {
  return normalizeCompanyName(value).slice(0, 80);
}

function sanitizeCompanyList(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = normalizeCompanyName(item);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function buildGroupPayload(input = {}) {
  const mode = String(input?.mode || "single").trim().toLowerCase() === "group" ? "group" : "single";
  const groupId = mode === "group" ? sanitizeGroupId(input?.groupId || "default") : "";
  const groupName = mode === "group" ? sanitizeGroupName(input?.groupName || input?.name || groupId) : "";
  const companies = mode === "group" ? sanitizeCompanyList(input?.companies) : [];
  return {
    mode,
    groupId,
    groupName,
    companies,
    createdAt: new Date().toISOString(),
  };
}

function ensureUniqueGroupId(baseId, groups = [], excludeId = "") {
  const normalizedBase = sanitizeGroupId(baseId, "group");
  let candidate = normalizedBase;
  let i = 2;
  while (groups.some((g) => g.id === candidate && g.id !== excludeId)) {
    candidate = `${normalizedBase}-${i}`;
    i += 1;
  }
  return candidate;
}

function sanitizeGroups(rawGroups) {
  const source = Array.isArray(rawGroups) ? rawGroups : [];
  const out = [];

  for (const item of source) {
    const name = sanitizeGroupName(item?.name || item?.id || "");
    const companies = sanitizeCompanyList(item?.companies);
    if (!name || !companies.length) continue;

    const id = ensureUniqueGroupId(item?.id || name, out);
    out.push({ id, name, companies });
  }
  return out;
}

async function readCompanyGroups() {
  try {
    if (!fs.existsSync(MULTICOMPANIES_FILE)) return [];
    const resolved = require.resolve(MULTICOMPANIES_FILE);
    delete require.cache[resolved];
    const loaded = require(resolved);
    return sanitizeGroups(loaded?.groups);
  } catch {
    return [];
  }
}

async function writeCompanyGroups(groups = []) {
  const sanitized = sanitizeGroups(groups);
  const content = `module.exports = {\n  groups: ${JSON.stringify(sanitized, null, 2)}\n};\n`;
  await fsp.writeFile(MULTICOMPANIES_FILE, content, "utf8");
  return sanitized;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function cleanDistDirectory() {
  await fsp.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(DIST_DIR);
}

const jobs = new Map();
let building = false;
const queue = [];

function pushLog(jobId, line) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.log.push(line);
  if (job.log.length > 2000) job.log.splice(0, job.log.length - 2000);
}

async function writeBranding(companyName) {
  const normalizedCompanyName = normalizeCompanyName(companyName);
  const payload = {
    companyName: normalizedCompanyName,
    companyGroup: buildGroupPayload({ mode: "single" }),
  };
  const content =
    `// AUTO-GENERATED. Do not commit.\n` +
    `(function(g){\n` +
    `  g.__FACTURANCE_BRANDING__ = ${JSON.stringify(payload)};\n` +
    `  if (typeof module !== "undefined" && module.exports) module.exports = g.__FACTURANCE_BRANDING__;\n` +
    `})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));\n`;
  await fsp.writeFile(BRANDING_FILE, content, "utf8");
}

async function writeGeneratedCompanyGroup(payloadInput = {}) {
  const payload = buildGroupPayload(payloadInput);

  await ensureDir(path.dirname(GENERATED_GROUP_JSON_FILE));
  await fsp.writeFile(GENERATED_GROUP_JSON_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const moduleContent =
    `// AUTO-GENERATED. Do not commit.\n` +
    `(function(g){\n` +
    `  g.__FACTURANCE_BUILD_COMPANY_GROUP__ = ${JSON.stringify(payload)};\n` +
    `  if (typeof module !== "undefined" && module.exports) module.exports = g.__FACTURANCE_BUILD_COMPANY_GROUP__;\n` +
    `})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));\n`;
  await fsp.writeFile(GENERATED_GROUP_MODULE_FILE, moduleContent, "utf8");

  return payload;
}

async function writeBuildContextForJob(job = {}) {
  if (job.mode === "group") {
    const payload = await writeGeneratedCompanyGroup({
      mode: "group",
      groupId: job.groupId,
      groupName: job.groupName,
      companies: job.companies,
    });

    const brandingPayload = {
      companyName: "",
      companyGroup: payload,
    };
    const content =
      `// AUTO-GENERATED. Do not commit.\n` +
      `(function(g){\n` +
      `  g.__FACTURANCE_BRANDING__ = ${JSON.stringify(brandingPayload)};\n` +
      `  if (typeof module !== "undefined" && module.exports) module.exports = g.__FACTURANCE_BRANDING__;\n` +
      `})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));\n`;
    await fsp.writeFile(BRANDING_FILE, content, "utf8");
    return payload;
  }

  await writeGeneratedCompanyGroup({ mode: "single" });
  await writeBranding(job.companyName || job.name || "");
  return buildGroupPayload({ mode: "single" });
}

async function listExeArtifacts() {
  try {
    const files = await fsp.readdir(DIST_DIR);
    return files.filter((f) => f.toLowerCase().endsWith(".exe"));
  } catch {
    return [];
  }
}

async function copyArtifactsToJob(jobId, exeFiles) {
  await ensureDir(BUILDS_ROOT);
  const jobDir = path.join(BUILDS_ROOT, jobId);
  await ensureDir(jobDir);
  const job = jobs.get(jobId) || {};

  const usedNames = new Set();
  function buildGroupArtifactName(sourceFile) {
    const arch = /ia32/i.test(sourceFile) ? "ia32" : "x64";
    const gid = sanitizeGroupId(job.groupId || "multi-societe", "multi-societe");
    return `Facturance MultiSociete-${gid}-${arch}.exe`;
  }
  function ensureUniqueName(fileName) {
    if (!usedNames.has(fileName)) {
      usedNames.add(fileName);
      return fileName;
    }
    const parsed = path.parse(fileName);
    let i = 2;
    while (usedNames.has(`${parsed.name} (${i})${parsed.ext}`)) i += 1;
    const next = `${parsed.name} (${i})${parsed.ext}`;
    usedNames.add(next);
    return next;
  }

  const copied = [];
  for (const file of exeFiles) {
    const outputFile = ensureUniqueName(
      job.mode === "group" ? buildGroupArtifactName(file) : file
    );
    const src = path.join(DIST_DIR, file);
    const dst = path.join(jobDir, outputFile);
    await fsp.copyFile(src, dst);
    copied.push(outputFile);
  }
  return copied;
}

function runCommand(jobId, cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, shell: true });
    p.stdout.on("data", (d) => pushLog(jobId, d.toString()));
    p.stderr.on("data", (d) => pushLog(jobId, d.toString()));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function runBuildJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.state = "building";
  pushLog(jobId, `== Building for: ${job.name}\n`);

  try {
    await writeBuildContextForJob(job);

    pushLog(jobId, "== Cleaning dist directory...\n");
    await cleanDistDirectory();

    const scriptName = job.buildVariant === "ia32" ? "dist:win:ia32" : "dist:win:both";
    pushLog(jobId, `== Using script: npm run ${scriptName}\n`);

    await runCommand(jobId, getNpmCmd(), ["run", scriptName], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        FACTURANCE_COMPANY_NAME: job.mode === "single" ? String(job.companyName || job.name || "") : "",
        FACTURANCE_COMPANY_GROUP_ID: job.mode === "group" ? String(job.groupId || "") : "",
      },
    });

    const exeFiles = await listExeArtifacts();
    if (!exeFiles.length) throw new Error("Build finished but no .exe found in dist/");

    const copied = await copyArtifactsToJob(jobId, exeFiles);

    job.files = copied;
    job.state = "done";
    pushLog(jobId, `\n== DONE. Artifacts: ${copied.join(", ")}\n`);
  } catch (err) {
    job.state = "error";
    pushLog(jobId, `\n== ERROR: ${String(err?.message || err)}\n`);
  }
}

async function processQueue() {
  if (building) return;
  const next = queue.shift();
  if (!next) return;
  building = true;
  try {
    await runBuildJob(next);
  } finally {
    building = false;
    processQueue();
  }
}

function enqueueBuildJob(name, buildVariant) {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    state: "queued",
    mode: "single",
    name,
    companyName: name,
    buildVariant,
    groupId: "",
    groupName: "",
    companies: [],
    log: [],
    files: [],
  });
  queue.push(jobId);
  processQueue();
  return jobId;
}

function enqueueGroupBuildJob({ groupId, groupName, companies, buildVariant }) {
  const jobId = crypto.randomUUID();
  const normalizedGroupId = sanitizeGroupId(groupId || groupName || "group");
  const normalizedGroupName = sanitizeGroupName(groupName || normalizedGroupId);
  const normalizedCompanies = sanitizeCompanyList(companies);

  jobs.set(jobId, {
    state: "queued",
    mode: "group",
    name: `Group ${normalizedGroupName}`,
    companyName: "",
    buildVariant,
    groupId: normalizedGroupId,
    groupName: normalizedGroupName,
    companies: normalizedCompanies,
    log: [],
    files: [],
  });
  queue.push(jobId);
  processQueue();
  return jobId;
}

// ------------------------------------------------------------------
// API (protected)
// ------------------------------------------------------------------
app.get("/api/companies", requireAdmin, async (_req, res) => {
  try {
    const raw = await fsp.readFile(COMPANIES_FILE, "utf8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return res.json([]);
    res.json(list.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean));
  } catch {
    res.json([]);
  }
});

app.get("/api/company-groups", requireAdmin, async (_req, res) => {
  const groups = await readCompanyGroups();
  res.json(groups);
});

app.post("/api/company-groups/save", requireAdmin, async (req, res) => {
  const name = sanitizeGroupName(req.body?.name);
  const companies = sanitizeCompanyList(req.body?.companies);

  if (!name || name.length < 2) return res.status(400).json({ error: "Group name required (min 2 chars)" });
  if (!companies.length) return res.status(400).json({ error: "companies[] required (at least 1 company)" });

  const groups = await readCompanyGroups();
  const candidateId = sanitizeGroupId(name);
  const existingIndex = groups.findIndex(
    (g) => g.id === candidateId || g.name.toLowerCase() === name.toLowerCase()
  );

  let savedGroup = null;
  if (existingIndex >= 0) {
    const previous = groups[existingIndex];
    const id = ensureUniqueGroupId(candidateId, groups, previous.id);
    savedGroup = { id, name, companies };
    groups[existingIndex] = savedGroup;
  } else {
    const id = ensureUniqueGroupId(candidateId, groups);
    savedGroup = { id, name, companies };
    groups.push(savedGroup);
  }

  const written = await writeCompanyGroups(groups);
  const finalGroup = written.find((g) => g.id === savedGroup.id) || savedGroup;
  res.json({ ok: true, group: finalGroup, groups: written });
});

app.post("/api/build", requireAdmin, async (req, res) => {
  const mode = String(req.body?.mode || "single").trim().toLowerCase();
  const companyName = normalizeCompanyName(req.body?.companyName);
  const groupId = sanitizeGroupId(req.body?.groupId || "", "");
  const requestedCompanies = sanitizeCompanyList(req.body?.companies);
  const buildVariant = String(req.body?.buildVariant || "both").trim();

  const allowed = new Set(["both", "ia32"]);
  if (!allowed.has(buildVariant)) {
    return res.status(400).json({ error: "Invalid buildVariant. Use 'both' or 'ia32'." });
  }

  if (mode === "group") {
    if (!groupId) return res.status(400).json({ error: "groupId required for group mode" });

    const groups = await readCompanyGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const companiesForJob = requestedCompanies.length
      ? requestedCompanies
      : sanitizeCompanyList(group.companies);
    if (!companiesForJob.length) return res.status(400).json({ error: "Group has no companies" });

    const jobId = enqueueGroupBuildJob({
      groupId: group.id,
      groupName: group.name,
      companies: companiesForJob,
      buildVariant,
    });

    return res.json({
      mode: "group",
      jobId,
      groupId: group.id,
      groupName: group.name,
      companies: companiesForJob,
    });
  }

  const singleName = companyName;
  if (!singleName || singleName.length < 2) return res.status(400).json({ error: "companyName required (min 2 chars)" });
  if (singleName.length > 80) return res.status(400).json({ error: "companyName too long (max 80)" });

  const jobId = enqueueBuildJob(singleName, buildVariant);
  return res.json({ mode: "single", jobId, jobs: [{ jobId, companyName: singleName }] });
});

app.get("/api/status/:jobId", requireAdmin, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json({ state: job.state, files: job.files });
});

app.get("/api/logs/:jobId", requireAdmin, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).send("job not found");
  res.type("text/plain").send(job.log.join(""));
});

app.get("/download/:jobId/:file", requireAdmin, (req, res) => {
  const { jobId, file } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).send("job not found");
  if (!job.files.includes(file)) return res.status(404).send("file not found");
  const abs = path.join(BUILDS_ROOT, jobId, file);
  res.download(abs, file);
});

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`Build server running on port ${PORT}`);
  openInDefaultBrowser(url);
});
