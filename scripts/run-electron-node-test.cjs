"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
let electronBinary = "";
try {
  electronBinary = require("electron");
} catch {
  electronBinary =
    process.platform === "win32"
      ? path.join(rootDir, "node_modules", ".bin", "electron.cmd")
      : path.join(rootDir, "node_modules", ".bin", "electron");
}

const args = process.argv.slice(2);

if (!args.length) {
  console.error("Missing Node test arguments. Example: --test scripts/tests/company-context-guards.test.cjs");
  process.exit(1);
}

const result = spawnSync(electronBinary, args, {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1"
  },
  shell: process.platform === "win32" && electronBinary.endsWith(".cmd")
});

if (result.error) {
  console.error(result.error.message || String(result.error));
  process.exit(typeof result.status === "number" ? result.status : 1);
}

process.exit(typeof result.status === "number" ? result.status : 0);
