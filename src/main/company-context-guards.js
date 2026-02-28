"use strict";

function normalizeCompanyId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^entreprise\d+$/i.test(normalized) ? normalized : "";
}

function resolveCompanyIdFromPath(pathValue) {
  if (!pathValue || typeof pathValue !== "string") return "";
  const normalizedPath = pathValue.replace(/\\/g, "/");
  const match = normalizedPath.match(/(?:^|\/)(entreprise\d+)(?:\/|$)/i);
  return match ? normalizeCompanyId(match[1]) : "";
}

function hasCompanyContextMismatch({ expectedCompanyId, activeCompanyId, path } = {}) {
  const expected = normalizeCompanyId(expectedCompanyId);
  const active = normalizeCompanyId(activeCompanyId);
  const fromPath = resolveCompanyIdFromPath(path);
  if (expected && active && expected !== active) return true;
  if (fromPath && active && fromPath !== active) return true;
  return false;
}

module.exports = {
  hasCompanyContextMismatch,
  normalizeCompanyId,
  resolveCompanyIdFromPath
};
