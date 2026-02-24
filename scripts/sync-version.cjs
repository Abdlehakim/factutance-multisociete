#!/usr/bin/env node
/**
 * Sync package.json version and artifact name from src/renderer/config/defaults.js.
 * APP_VERSION stays the single source of truth; strips leading "v".
 * DEFAULT_COMPANY.name drives the installer file name (artifactName).
 */
const fs = require("fs");
const path = require("path");

function loadAppVersion() {
  try {
    const defaults = require(path.resolve(__dirname, "../src/renderer/config/defaults.js"));
    const raw = defaults && typeof defaults.APP_VERSION === "string" ? defaults.APP_VERSION.trim() : "";
    return raw ? raw.replace(/^v/i, "") : null;
  } catch (err) {
    console.error("[sync-version] Unable to load defaults.js", err);
    return null;
  }
}

function loadCompanyName() {
  try {
    const defaults = require(path.resolve(__dirname, "../src/renderer/config/defaults.js"));
    const name = defaults?.DEFAULT_COMPANY?.name;
    if (typeof name !== "string") return null;
    const cleaned = name.trim();
    return cleaned || null;
  } catch (err) {
    console.error("[sync-version] Unable to load DEFAULT_COMPANY.name", err);
    return null;
  }
}

function sanitizeForFileName(value, fallback = "Company") {
  const src = (value || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:\"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return src || fallback;
}

function readPackageJson(pkgPath) {
  const text = fs.readFileSync(pkgPath, "utf8");
  return JSON.parse(text);
}

function writePackageJson(pkgPath, data) {
  fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main() {
  const appVersion = loadAppVersion();
  const companyName = loadCompanyName();
  const companyFileLabel = companyName ? sanitizeForFileName(companyName) : null;
  if (!appVersion) {
    console.warn("[sync-version] No APP_VERSION found; leaving package.json unchanged.");
    return;
  }

  const pkgPath = path.resolve(__dirname, "../package.json");
  const pkg = readPackageJson(pkgPath);
  const current = pkg.version;
  const currentArtifact = pkg?.build?.win?.artifactName;

  if (current === appVersion) {
    console.log(`[sync-version] package.json already at ${current}`);
  } else {
    pkg.version = appVersion;
    console.log(`[sync-version] Updated package.json version ${current} -> ${appVersion}`);
  }

  if (companyFileLabel) {
    const desiredArtifact = `Facturance v\${version} ${companyFileLabel}-\${arch}.exe`;
    if (currentArtifact !== desiredArtifact) {
      if (pkg.build?.win) {
        pkg.build.win.artifactName = desiredArtifact;
        console.log(`[sync-version] Updated artifactName -> ${desiredArtifact}`);
      } else {
        console.warn("[sync-version] build.win is missing; cannot set artifactName.");
      }
    }
  }

  writePackageJson(pkgPath, pkg);
}

main();
