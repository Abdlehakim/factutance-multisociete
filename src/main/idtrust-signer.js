"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
let electronApp = null;
try {
  ({ app: electronApp } = require("electron"));
} catch {
  electronApp = null;
}

const PROD_SIGNER_EXE = "teif-signer.exe";

function resolveRepoRoot() {
  if (electronApp && typeof electronApp.getAppPath === "function") {
    return path.resolve(electronApp.getAppPath());
  }
  return path.resolve(__dirname, "..", "..");
}

function resolveCsprojPath() {
  const repoRoot = resolveRepoRoot();
  return path.join(repoRoot, "tools", "teif-signer", "TeifSigner", "TeifSigner.csproj");
}

function resolveSignerCommand() {
  const isPackaged = !!electronApp?.isPackaged;
  if (isPackaged) {
    return {
      cmd: path.join(process.resourcesPath || "", "bin", PROD_SIGNER_EXE),
      baseArgs: [],
      mode: "prod"
    };
  }
  const csprojPath = resolveCsprojPath();
  return {
    cmd: "dotnet",
    baseArgs: ["run", "--project", csprojPath, "--"],
    mode: "dev",
    csprojPath
  };
}

function ensureJsonArg(args) {
  if (!args.includes("--json")) args.push("--json");
  return args;
}

function parseJsonFromStdout(stdout) {
  if (!stdout) return null;
  const trimmed = String(stdout).trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const end = trimmed.lastIndexOf("}");
    if (end < 0) return null;
    const start = trimmed.lastIndexOf("{", end);
    if (start < 0) return null;
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function runSigner(args = []) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(args) || args.length === 0) {
      const err = new Error("INVALID_ARGS");
      err.code = "INVALID_ARGS";
      reject(err);
      return;
    }
    const verb = String(args[0] || "").trim().toLowerCase();
    if (verb !== "sign" && verb !== "list") {
      const err = new Error("INVALID_CMD");
      err.code = "INVALID_CMD";
      reject(err);
      return;
    }

    const cmdInfo = resolveSignerCommand();
    if (!cmdInfo?.cmd) {
      const err = new Error("SIGNER_NOT_FOUND");
      err.code = "SIGNER_NOT_FOUND";
      reject(err);
      return;
    }

    if (cmdInfo.mode === "prod") {
      if (!cmdInfo.cmd || !fs.existsSync(cmdInfo.cmd)) {
        const err = new Error("SIGNER_NOT_FOUND");
        err.code = "SIGNER_NOT_FOUND";
        reject(err);
        return;
      }
    } else if (cmdInfo.mode === "dev") {
      if (!cmdInfo.csprojPath || !fs.existsSync(cmdInfo.csprojPath)) {
        const err = new Error("SIGNER_PROJECT_NOT_FOUND");
        err.code = "SIGNER_PROJECT_NOT_FOUND";
        reject(err);
        return;
      }
    }

    const normalizedArgs = ensureJsonArg([...args]);
    const finalArgs = [...(cmdInfo.baseArgs || []), ...normalizedArgs];

    console.log("[IDTRUST] spawn:", cmdInfo.cmd, finalArgs.join(" "));

    const child = spawn(cmdInfo.cmd, finalArgs, { windowsHide: true });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      const wrapped = new Error(err?.message || "SIGNER_LAUNCH_FAILED");
      wrapped.code = "SIGNER_LAUNCH_FAILED";
      wrapped.stderr = stderr;
      wrapped.stdout = stdout;
      wrapped.cause = err;
      reject(wrapped);
    });

    child.on("close", (code) => {
      const parsed = parseJsonFromStdout(stdout);
      if (code === 0 && parsed && parsed.ok) {
        resolve(parsed);
        return;
      }
      const trimmedStdout = String(stdout || "").trim();
      const message = parsed?.error || stderr.trim() || trimmedStdout || `SIGNER_EXIT_${code}`;
      const err = new Error(message);
      err.code = parsed?.error || `SIGNER_EXIT_${code}`;
      err.exitCode = code;
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });
  });
}

function signTeifXml({ unsignedPath, signedPath, thumbprint } = {}) {
  const inputPath = String(unsignedPath || "").trim();
  const outputPath = String(signedPath || "").trim();
  const certThumbprint = String(thumbprint || "").trim();
  if (!inputPath || !outputPath || !certThumbprint) {
    const err = new Error("INVALID_ARGS");
    err.code = "INVALID_ARGS";
    return Promise.reject(err);
  }
  const args = [
    "sign",
    "--in",
    inputPath,
    "--out",
    outputPath,
    "--thumbprint",
    certThumbprint,
    "--json"
  ];
  return runSigner(args);
}

function listCerts() {
  return runSigner(["list", "--json"]);
}

module.exports = { signTeifXml, listCerts };
