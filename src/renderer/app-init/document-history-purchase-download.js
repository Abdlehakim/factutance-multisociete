(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const canonicalize = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => canonicalize(entry));
    }
    if (isPlainObject(value)) {
      const out = {};
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
          out[key] = canonicalize(value[key]);
        });
      return out;
    }
    return value;
  };

  const stringifyCanonicalJson = (value) =>
    `${JSON.stringify(canonicalize(value), null, 2)}\n`;

  const sanitizeFilenameToken = (value, fallback = "document") => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    const normalized = raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  };

  async function downloadCanonicalJson(envelope, options = {}) {
    const payload = envelope && typeof envelope === "object" ? envelope : null;
    if (!payload) return { ok: false, canceled: false, error: "Export invalide." };
    const fileName = String(options?.fileName || "facture-achat-export.json").trim();
    const safeFileName = fileName.toLowerCase().endsWith(".json") ? fileName : `${fileName}.json`;
    const serialized = stringifyCanonicalJson(payload);

    if (w.electronAPI?.exportPurchaseInvoiceFile) {
      const res = await w.electronAPI.exportPurchaseInvoiceFile({
        fileName: safeFileName,
        data: serialized
      });
      if (!res || res.canceled) return { ok: false, canceled: true };
      if (res.ok === false) {
        return { ok: false, canceled: false, error: String(res.error || "Exportation impossible.") };
      }
      return {
        ok: true,
        canceled: false,
        filePath: res.path || "",
        name: res.name || safeFileName
      };
    }

    if (w.electronAPI?.saveFile) {
      const res = await w.electronAPI.saveFile({
        title: options?.title || "Exporter la facture d'achat",
        defaultPath: safeFileName,
        filters: [{ name: "Fichier JSON", extensions: ["json"] }],
        data: serialized
      });
      if (!res || res.canceled) return { ok: false, canceled: true };
      if (res.ok === false) {
        return { ok: false, canceled: false, error: String(res.error || "Exportation impossible.") };
      }
      return {
        ok: true,
        canceled: false,
        filePath: res.path || "",
        name: res.name || safeFileName
      };
    }

    if (!w.Blob || typeof document === "undefined") {
      return { ok: false, canceled: false, error: "Exportation indisponible." };
    }

    const blob = new Blob([serialized], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { ok: true, canceled: false, filePath: "", name: safeFileName };
  }

  AppInit.DocHistoryPurchaseDownload = {
    canonicalize,
    stringifyCanonicalJson,
    sanitizeFilenameToken,
    downloadCanonicalJson
  };
})(window);
