// preload.js
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const defaults = require("./src/renderer/config/defaults.js");
const APP_VERSION = defaults?.APP_VERSION || "";
function companyApiKey(name) {
  const normalized = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w$]+/g, "");
  if (!normalized) return "";
  return /^[A-Za-z_$]/.test(normalized) ? normalized : `_${normalized}`;
}
const DEFAULT_COMPANY_API_KEY = companyApiKey(defaults?.DEFAULT_COMPANY?.name || "");

function toFileURL(p) {
  if (!p) return null;
  const norm = String(p).replace(/\\/g, "/");
  return "file://" + (norm.startsWith("/") ? norm : "/" + norm);
}

function fileToDataURL(absPath) {
  try {
    const b = fs.readFileSync(absPath);
    const ext = path.extname(absPath).slice(1).toLowerCase();
    const mime =
      ext === "svg" ? "image/svg+xml" :
      ext === "png" ? "image/png" :
      (ext === "jpg" || ext === "jpeg") ? "image/jpeg" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      ext === "bmp" ? "image/bmp" :
      "application/octet-stream";
    return `data:${mime};base64,${b.toString("base64")}`;
  } catch {
    return null;
  }
}

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, "src", "renderer", "assets", "logo.png"),
    path.join(__dirname, "assets", "logo.png"),
    path.join(process.resourcesPath || "", "src", "renderer", "assets", "logo.png"),
    path.join(process.resourcesPath || "", "assets", "logo.png"),
    path.join(__dirname, "src", "renderer", "assets", "logoIMG.png"),
    path.join(__dirname, "assets", "logoIMG.png"),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}
const logoPath = resolveLogoPath();
const logoDataURL = logoPath ? fileToDataURL(logoPath) : "";

function readFirstExistingText(candidates = []) {
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, "utf8");
      }
    } catch {
      // ignore and keep searching
    }
  }
  return "";
}

const pdfCssText = readFirstExistingText([
  path.join(__dirname, "src", "renderer", "styles", "pdf-view.css"),
  path.join(__dirname, "styles", "pdf-view.css"),
  path.join(process.resourcesPath || "", "src", "renderer", "styles", "pdf-view.css"),
  path.join(process.resourcesPath || "", "styles", "pdf-view.css"),
]);

const pdfWhCssText = readFirstExistingText([
  path.join(__dirname, "src", "renderer", "styles", "pdf-wh.css"),
  path.join(__dirname, "styles", "pdf-wh.css"),
  path.join(process.resourcesPath || "", "src", "renderer", "styles", "pdf-wh.css"),
  path.join(process.resourcesPath || "", "styles", "pdf-wh.css"),
]);

function normalizeSavePayload(p) {
  if (!p) return { data: {}, meta: {} };
  if (p.data || p.meta || p.filename) return p;
  return p;
}

const api = {
  // Invoices
  saveInvoiceJSON: async (payload) => {
    const normalized = normalizeSavePayload(payload);
    return await ipcRenderer.invoke("save-invoice-json", normalized);
  },
  saveInvoiceRecord: async (payload) => {
    const normalized = normalizeSavePayload(payload);
    return await ipcRenderer.invoke("save-invoice-record", normalized);
  },
  openInvoiceJSON: (opts = {}) => ipcRenderer.invoke("open-invoice-json", opts),
  openInvoiceRecord: (opts = {}) => ipcRenderer.invoke("open-invoice-record", opts),
  openInvoiceFolder: (opts = {}) => ipcRenderer.invoke("open-invoice-folder", opts),
  deleteInvoiceFile: (opts = {}) => ipcRenderer.invoke("delete-invoice-file", opts),
  listPdfDocuments: (opts = {}) => ipcRenderer.invoke("list-pdf-documents", opts),
  listXmlDocuments: (opts = {}) => ipcRenderer.invoke("list-xml-documents", opts),
  listInvoiceFiles: (opts = {}) => ipcRenderer.invoke("list-invoice-files", opts),
  updateDocumentPdfPath: (payload = {}) => ipcRenderer.invoke("documents:updatePdfPath", payload),
  docLockAcquire: (payload = {}) => ipcRenderer.invoke("docLock:acquire", payload),
  docLockTouch: (payload = {}) => ipcRenderer.invoke("docLock:touch", payload),
  docLockRelease: (payload = {}) => ipcRenderer.invoke("docLock:release", payload),
  readXmlFile: (payload) => ipcRenderer.invoke("xml:readFile", payload || {}),
  readPaymentHistory: () => ipcRenderer.invoke("payments:history:read"),
  writePaymentHistory: (items) => ipcRenderer.invoke("payments:history:write", { items }),

  // PDF export (NEW: used by app-export.js)
  exportPDF: (opts) => ipcRenderer.invoke("export-pdf", opts),
  printHTML: (payload) => ipcRenderer.invoke("app:printHTML", payload),

  // Legacy HTML->PDF path (kept for compatibility)
  exportPDFFromHTML: async (payload) => {
    const res = await ipcRenderer.invoke("app:exportPDFFromHTML", payload);
    if (!res || res.ok !== true) return res || { ok: false, canceled: true };
    const t = String(payload?.meta?.docType || "facture").toLowerCase();
    const label =
      t === "fa" ? "Facture d'achat"
      : t === "devis" ? "Devis"
      : t === "bl" ? "Bon de livraison"
      : t === "bc" ? "Bon de commande"
      : "Facture";
    const name = payload?.meta?.filename || `${label} - ${payload?.meta?.number || new Date().toISOString().slice(0, 10)}.pdf`;
    return { ...res, url: toFileURL(res.path), name };
  },

  // OS helpers
  pickLogo: () => ipcRenderer.invoke("app:pickLogo"),
  saveFile: (payload) => ipcRenderer.invoke("app:saveFile", payload || {}),
  exportClientsFile: (payload) => ipcRenderer.invoke("clients:exportFile", payload || {}),
  exportDocumentsFile: (payload) => ipcRenderer.invoke("documents:exportFile", payload || {}),
  exportPurchaseInvoiceFile: (payload) => ipcRenderer.invoke("purchase:exportFile", payload || {}),
  exportModelsFile: (payload) => ipcRenderer.invoke("models:exportFile", payload || {}),
  openPath: (absPath) => ipcRenderer.invoke("app:openPath", absPath),
  showInFolder: (absPath) => ipcRenderer.invoke("app:showInFolder", absPath),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  sendSmtpEmail: (payload) => ipcRenderer.invoke("smtp:send", payload || {}),
  openFacturanceDataDir: () => ipcRenderer.invoke("facturance:openDataDir"),
  openModelExportDir: () => ipcRenderer.invoke("models:openExportDir"),
  getReportTaxPdfDir: () => ipcRenderer.invoke("facturance:getReportTaxPdfDir"),
  getClientStatementPdfDir: () => ipcRenderer.invoke("facturance:getClientStatementPdfDir"),
  saveWithholdingXml: (payload) => ipcRenderer.invoke("withholding:saveXml", payload || {}),
  openWithholdingXmlFile: () => ipcRenderer.invoke("withholding:openXmlFile"),
  generateTeifUnsigned: (payload) => ipcRenderer.invoke("teif:generateUnsigned", payload || {}),
  signTeifIdTrust: (payload) => ipcRenderer.invoke("idtrust:signTeif", payload || {}),
  getIdTrustThumbprint: () => ipcRenderer.invoke("idtrust:thumbprint:get"),
  setIdTrustThumbprint: (thumbprint) =>
    ipcRenderer.invoke("idtrust:thumbprint:set", { thumbprint }),
  lanServerStart: (payload) => ipcRenderer.invoke("lan-server:start", payload || {}),
  lanServerStop: () => ipcRenderer.invoke("lan-server:stop"),
  lanServerStatus: () => ipcRenderer.invoke("lan-server:status"),
  previewDocumentNumber: (payload) => ipcRenderer.invoke("number:preview", payload || {}),

  // Optional print-mode events (not required by app-export.js)
  onEnterPrintMode: (cb) => {
    ipcRenderer.removeAllListeners("app:enterPrint");
    ipcRenderer.on("app:enterPrint", () => cb?.());
  },
  onExitPrintMode: (cb) => {
    ipcRenderer.removeAllListeners("app:exitPrint");
    ipcRenderer.on("app:exitPrint", () => cb?.());
  },
  onAppCloseRequest: (cb) => {
    ipcRenderer.removeAllListeners("app:close-request");
    ipcRenderer.on("app:close-request", () => cb?.());
  },
  approveAppClose: () => ipcRenderer.send("app:confirm-close"),
  rejectAppClose: () => ipcRenderer.send("app:cancel-close"),
  notifyAppReady: () => ipcRenderer.send("app:ready"),

  // Articles
  saveArticle: (payload) => ipcRenderer.invoke("articles:save", payload),
  saveArticleAuto: (payload) => ipcRenderer.invoke("articles:saveAuto", payload),
  updateArticle: (payload) => ipcRenderer.invoke("articles:update", payload),
  adjustArticleStock: (payload) => ipcRenderer.invoke("articles:adjustStock", payload),
  openArticle: () => ipcRenderer.invoke("articles:open"),
  listArticles: () => ipcRenderer.invoke("articles:list"),
  searchArticles: (payload) => ipcRenderer.invoke("articles:search", payload || {}),
  deleteArticle: (payload) => ipcRenderer.invoke("articles:delete", payload || {}),

  // Models
  listModels: () => ipcRenderer.invoke("models:list"),
  saveModel: (payload) => ipcRenderer.invoke("models:save", payload),
  deleteModel: (payload) => ipcRenderer.invoke("models:delete", payload),
  loadModel: (payload) => ipcRenderer.invoke("models:load", payload),
  loadClientFieldSettings: () => ipcRenderer.invoke("client-fields:load"),
  saveClientFieldSettings: (payload) => ipcRenderer.invoke("client-fields:save", payload),
  loadArticleFieldSettings: () => ipcRenderer.invoke("article-fields:load"),
  saveArticleFieldSettings: (payload) => ipcRenderer.invoke("article-fields:save", payload),
  loadWithholdingFaSettings: () => ipcRenderer.invoke("withholding-fa-settings:load"),
  saveWithholdingFaSettings: (payload) =>
    ipcRenderer.invoke("withholding-fa-settings:save", payload),

  // Company coordinates
  loadCompanyData: () => ipcRenderer.invoke("company:load"),
  saveCompanyData: (payload) => ipcRenderer.invoke("company:save", payload || {}),
  saveSealFile: (payload) => ipcRenderer.invoke("company:saveSealFile", payload || {}),
  saveSignatureFile: (payload) => ipcRenderer.invoke("company:saveSignatureFile", payload || {}),
  loadSmtpSettings: () => ipcRenderer.invoke("smtp:load"),
  saveSmtpSettings: (payload) => ipcRenderer.invoke("smtp:save", payload || {}),

  // Clients system folder
  ensureClientsSystemFolder: (payload) => ipcRenderer.invoke("clients:ensureSystemFolder", payload || {}),
  saveClientDirect: (payload) => ipcRenderer.invoke("clients:saveDirect", payload),
  updateClientDirect: (payload) => ipcRenderer.invoke("clients:updateDirect", payload),
  adjustClientSold: (payload) => ipcRenderer.invoke("clients:adjustSold", payload),
  readClientLedger: (payload) => ipcRenderer.invoke("clients:readLedger", payload),
  deleteClientLedgerEntry: (payload) => ipcRenderer.invoke("clients:deleteLedgerEntry", payload),
  addClientLedgerEntry: (payload) => ipcRenderer.invoke("clients:addLedgerEntry", payload),
  updateClientLedgerAmount: (payload) => ipcRenderer.invoke("clients:updateLedgerAmount", payload),
  searchClients: (payload) => {
    if (typeof payload === "string") return ipcRenderer.invoke("clients:search", payload);
    return ipcRenderer.invoke("clients:search", payload || {});
  },
  openClient: (payload) => ipcRenderer.invoke("clients:open", payload || {}),
  deleteClient: (payload) => ipcRenderer.invoke("clients:delete", payload),

  // Assets exposed to renderer (PDF views use this for logo + styles)
  assets: { logo: logoDataURL, pdfCss: pdfCssText, pdfWhCss: pdfWhCssText },
};

contextBridge.exposeInMainWorld("electronAPI", api);
if (DEFAULT_COMPANY_API_KEY && DEFAULT_COMPANY_API_KEY !== "electronAPI") {
  contextBridge.exposeInMainWorld(DEFAULT_COMPANY_API_KEY, api);
}
if (APP_VERSION) {
  contextBridge.exposeInMainWorld("APP_VERSION", APP_VERSION);
}
