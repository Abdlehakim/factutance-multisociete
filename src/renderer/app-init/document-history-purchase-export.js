(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const SCHEMA_VERSION = "facturance.purchase-invoice.v1";

  const toIsoTimestamp = () => new Date().toISOString();

  const resolveConverterApi = () => AppInit.DocHistoryPurchaseConverter || null;
  const resolveModelChoiceApi = () => AppInit.DocHistoryPurchaseModelChoice || null;
  const resolveDownloadApi = () => AppInit.DocHistoryPurchaseDownload || null;

  const buildExportEnvelope = (conversionResult, options = {}) => {
    const converted = conversionResult && typeof conversionResult === "object" ? conversionResult : {};
    const invoiceData =
      converted.invoiceData && typeof converted.invoiceData === "object" ? converted.invoiceData : {};
    const source = converted.source && typeof converted.source === "object" ? converted.source : {};
    const target = converted.target && typeof converted.target === "object" ? converted.target : {};
    const entry = options?.entry && typeof options.entry === "object" ? options.entry : {};
    const modelName = String(options?.modelName || target.modelName || "").trim();
    return {
      schemaVersion: SCHEMA_VERSION,
      payload: {
        exportedAt: toIsoTimestamp(),
        exportType: "facture_to_facture_achat",
        source: {
          docType: "facture",
          number: String(source.number || entry.number || "").trim(),
          date: String(source.date || entry.date || "").trim(),
          path: String(source.path || entry.path || "").trim()
        },
        target: {
          docType: "fa",
          modelName
        },
        invoice: invoiceData
      }
    };
  };

  const buildDefaultFileName = (conversionResult, fallbackNumber = "") => {
    const downloadApi = resolveDownloadApi();
    const sanitizeToken =
      typeof downloadApi?.sanitizeFilenameToken === "function"
        ? downloadApi.sanitizeFilenameToken
        : (value, fallback = "document") => {
            const raw = String(value || "").trim();
            if (!raw) return fallback;
            return raw.replace(/[^\w.-]+/g, "_");
          };
    const source = conversionResult?.source || {};
    const numberToken = sanitizeToken(source.number || fallbackNumber || "", "");
    if (numberToken) return `fa_${numberToken}.json`;
    const dateToken = sanitizeToken(source.date || "", "");
    return `fa_${dateToken || "document"}.json`;
  };

  async function exportFactureEntryAsPurchase(options = {}) {
    const entry = options?.entry && typeof options.entry === "object" ? options.entry : null;
    if (!entry || !entry.path) {
      return { ok: false, canceled: false, error: "Document introuvable." };
    }
    if (typeof w.openInvoiceFromFilePicker !== "function") {
      return { ok: false, canceled: false, error: "Chargement du document indisponible." };
    }

    const modelChoiceApi = resolveModelChoiceApi();
    const converterApi = resolveConverterApi();
    const downloadApi = resolveDownloadApi();
    if (
      !modelChoiceApi ||
      typeof modelChoiceApi.promptPurchaseModelChoice !== "function" ||
      !converterApi ||
      typeof converterApi.convertFactureToPurchase !== "function" ||
      !downloadApi ||
      typeof downloadApi.downloadCanonicalJson !== "function"
    ) {
      return { ok: false, canceled: false, error: "Module d'export facture d'achat indisponible." };
    }

    let raw = null;
    try {
      raw = await w.openInvoiceFromFilePicker({
        path: entry.path,
        docType: "facture"
      });
    } catch (err) {
      return { ok: false, canceled: false, error: String(err?.message || err || "") };
    }
    if (!raw) {
      return { ok: false, canceled: false, error: "Impossible de charger la facture source." };
    }

    const selectedModel = await modelChoiceApi.promptPurchaseModelChoice({
      title: "Exporter en Facture d'achat",
      message: "Selectionnez le modele de facture d'achat pour l'export.",
      confirmText: "Exporter"
    });
    if (!selectedModel) return { ok: false, canceled: true };

    const modelName = String(selectedModel.value || selectedModel.label || "").trim();
    const modelConfig = await modelChoiceApi.resolveModelConfigByName(
      modelName,
      selectedModel.config
    );

    const converted = converterApi.convertFactureToPurchase(raw, {
      entry,
      modelName,
      modelConfig
    });
    if (!converted || !converted.invoiceData) {
      return { ok: false, canceled: false, error: "Conversion vers la facture d'achat impossible." };
    }

    const envelope = buildExportEnvelope(converted, { entry, modelName });
    const fileName = buildDefaultFileName(converted, entry?.number || "");
    const download = await downloadApi.downloadCanonicalJson(envelope, {
      fileName,
      title: "Exporter la facture d'achat"
    });
    if (!download?.ok) {
      return {
        ok: false,
        canceled: !!download?.canceled,
        error: String(download?.error || "Exportation impossible.")
      };
    }

    return {
      ok: true,
      canceled: false,
      filePath: download.filePath || "",
      name: download.name || fileName,
      modelName,
      envelope
    };
  }

  AppInit.DocHistoryPurchaseExport = {
    SCHEMA_VERSION,
    buildExportEnvelope,
    exportFactureEntryAsPurchase
  };
})(window);
