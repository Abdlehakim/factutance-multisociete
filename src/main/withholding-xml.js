"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

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

function withXmlExt(name = "document") {
  return name.toLowerCase().endsWith(".xml") ? name : `${name}.xml`;
}

function resolveXmlDir(baseDir, dateLike, subDir) {
  let dt = new Date();
  if (dateLike) {
    const parsed = new Date(dateLike);
    if (Number.isFinite(parsed?.getTime())) dt = parsed;
  }
  const year = String(dt.getFullYear());
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const baseXml = path.join(baseDir, "xml");
  const subPath = typeof subDir === "string" && subDir.trim() ? subDir.trim() : "";
  const targetBase = subPath ? path.join(baseXml, subPath) : baseXml;
  const dir = path.join(targetBase, year, month);
  return { dir, year, month };
}

async function saveWithholdingXml({ baseDir, xml, fileBase, fileName, date, subDir } = {}) {
  if (!baseDir) throw new Error("Missing base directory.");
  const xmlText = typeof xml === "string" ? xml : String(xml ?? "");
  if (!xmlText.trim()) throw new Error("Empty XML payload.");
  const { dir, year, month } = resolveXmlDir(baseDir, date, subDir);
  await fsp.mkdir(dir, { recursive: true });
  const rawName = fileName || fileBase || `xmlRS-${Date.now()}`;
  const safeName = withXmlExt(sanitizeFileName(rawName));
  const targetPath = path.join(dir, safeName);
  await fsp.writeFile(targetPath, xmlText, "utf8");
  return { path: targetPath, name: safeName, dir, year, month };
}

module.exports = {
  saveWithholdingXml
};
