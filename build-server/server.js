const express = require("express");
require("dotenv").config();
const path = require("path");
const fsp = require("fs/promises");
const { spawn } = require("child_process");
const crypto = require("crypto");

const session = require("express-session");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(helmet());

// --- CONFIG (à mettre via variables d’environnement sur o2switch) ---
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || ""; // bcrypt hash obligatoire
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE_ME_PLEASE";
const NODE_ENV = process.env.NODE_ENV || "development";
const DEFAULT_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const REMEMBER_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// IMPORTANT pour o2switch/cPanel: utiliser PORT fourni
const PORT = Number(process.env.PORT || 5050);

app.set("trust proxy", 1); // utile derrière proxy (o2switch / nginx)
app.use(
  session({
    name: "facturance_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: NODE_ENV === "production", 
      maxAge: DEFAULT_SESSION_MAX_AGE_MS,
    },
  })
);

// Limite brute force sur login
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
});

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

    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", (err) => {
      console.warn(`Could not auto-open browser: ${err.message}`);
    });

    child.unref();
  } catch (err) {
    console.warn(`Could not auto-open browser: ${err.message}`);
  }
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();

  // API requests should return 401
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Browser pages: redirect to login
  return res.redirect("/");
}

// Pages statiques: on sert login.html publiquement
const PUBLIC_DIR = path.join(__dirname, "public");
app.get("/", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/app");
  return res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

// Page admin protégée
app.get("/app", requireAdmin, (_req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "app.html"))
);

// Optionnel: assets publics (si besoin) -> à toi de gérer
app.use("/public", express.static(PUBLIC_DIR));

// --- API AUTH ---
app.post("/api/login", loginLimiter, async (req, res) => {
  if (!ADMIN_PASS_HASH) {
    return res.status(500).json({ error: "ADMIN_PASS_HASH is not set on server." });
  }
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const remember = Boolean(req.body?.remember);

  if (username !== ADMIN_USER) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.isAdmin = true;
  req.session.cookie.maxAge = remember ? REMEMBER_SESSION_MAX_AGE_MS : DEFAULT_SESSION_MAX_AGE_MS;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ------------------------------------------------------------------
// --- BUILD LOGIC (ta logique existante, mais protégée) -------------
// ------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const BRANDING_FILE = path.join(REPO_ROOT, "src/renderer/config/branding.js");
const BUILDS_ROOT = path.join(__dirname, "builds");
const COMPANIES_FILE = path.join(__dirname, "companies.json");

function sanitizeForFileName(value, fallback = "Company") {
  const src = String(value || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return src || fallback;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function cleanDistDirectory() {
  // Remove all previous build outputs to guarantee a fresh build.
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
  const payload = { companyName: String(companyName || "").trim() };

  const content =
    `// AUTO-GENERATED. Do not commit.\n` +
    `(function(g){\n` +
    `  g.__FACTURANCE_BRANDING__ = ${JSON.stringify(payload)};\n` +
    `  if (typeof module !== "undefined" && module.exports) module.exports = g.__FACTURANCE_BRANDING__;\n` +
    `})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));\n`;

  await fsp.writeFile(BRANDING_FILE, content, "utf8");
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

  const copied = [];
  for (const file of exeFiles) {
    const src = path.join(DIST_DIR, file);
    const dst = path.join(jobDir, file);
    await fsp.copyFile(src, dst);
    copied.push(file);
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
    await writeBranding(job.name);

    pushLog(jobId, "== Cleaning dist directory...\n");
    await cleanDistDirectory();

    const scriptName = job.buildVariant === "ia32" ? "dist:win:ia32" : "dist:win:both";
    pushLog(jobId, `== Using script: npm run ${scriptName}\n`);

    await runCommand(jobId, "npm", ["run", scriptName], {
      cwd: REPO_ROOT,
      env: { ...process.env, FACTURANCE_COMPANY_NAME: job.name },
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


app.get("/api/companies", requireAdmin, async (_req, res) => {
  try {
    const raw = await fsp.readFile(COMPANIES_FILE, "utf8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return res.json([]);
    res.json(list.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean));
  } catch {
    // if file doesn't exist yet, return empty list
    res.json([]);
  }
});

// --- API protégées ---
app.post("/api/build", requireAdmin, async (req, res) => {
  const name = String(req.body?.companyName || "").trim();
  const buildVariant = String(req.body?.buildVariant || "both").trim();

  if (!name || name.length < 2) return res.status(400).json({ error: "companyName required (min 2 chars)" });
  if (name.length > 80) return res.status(400).json({ error: "companyName too long (max 80)" });

  const allowed = new Set(["both", "ia32"]);
  if (!allowed.has(buildVariant)) {
    return res.status(400).json({ error: "Invalid buildVariant. Use 'both' or 'ia32'." });
  }

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { state: "queued", name, buildVariant, log: [], files: [] });
  queue.push(jobId);
  processQueue();

  res.json({ jobId });
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

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`Build server running on port ${PORT}`);
  openInDefaultBrowser(url);
});
