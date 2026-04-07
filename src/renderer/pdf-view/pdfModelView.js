/// pdfModelView.js
(function (global) {
  const PDF_MODEL_CSS_HREF = "./styles/pdf-model-view.css";
  const PDF_MODEL_CSS_LINK_ID = "pdf-model-view-css";
  const MODEL_ACTIONS_CSS_HREF = "./styles/modelActionsModal.css";
  const TEMPLATE_CSS_HREFS = {
    template1: "./template/templateStyle/template1.css",
    template2: "./template/templateStyle/template2.css"
  };

  const electronAssets = global?.electronAPI?.assets || {};
  let pdfCssText = typeof electronAssets.pdfModelCss === "string" ? electronAssets.pdfModelCss : "";
  let modelActionsCssText = "";
  let templateCssTexts = {
    template1: typeof electronAssets.template1Css === "string" ? electronAssets.template1Css : "",
    template2: typeof electronAssets.template2Css === "string" ? electronAssets.template2Css : ""
  };
  let cssFetchStarted = false;
  let modelCssFetchPromise = null;
  let templateCssFetchPromises = {};
  let transformedModelActionsCssText = "";
  let transformedModelActionsCssSource = "";
  let transformedTemplateCssTexts = { template1: "", template2: "" };
  let transformedTemplateCssSource = { template1: "", template2: "" };

  const COLUMN_VISIBILITY_DEFAULTS = {
    ref: true,
    product: true,
    desc: false,
    qty: true,
    unit: true,
    beDepot: true,
    beDestination: true,
    beReceptionDate: true,
    beReceptionTime: true,
    beSourceRef: true,
    bsDepot: true,
    bsLocation: true,
    bsSortieDate: true,
    bsSortieTime: true,
    bsSourceRef: true,
    bsTransporter: true,
    bsDriverName: true,
    bsVehiclePlate: true,
    bsTransportMode: true,
    bsExitReason: true,
    beTransporter: true,
    beDriverName: true,
    beVehiclePlate: true,
    purchasePrice: false,
    purchaseTva: false,
    purchaseDiscount: false,
    price: true,
    fodec: true,
    fodecPurchase: false,
    tva: true,
    discount: true,
    totalPurchaseHt: false,
    totalHt: true,
    totalPurchaseTtc: false,
    totalTtc: true
  };
  const COLUMN_KEY_ALIASES = {
    ttc: "totalTtc",
    totalttc: "totalTtc",
    totalht: "totalHt"
  };
  const ARTICLE_FIELD_LABEL_DEFAULTS = {
    ref: "R\u00e9f.",
    product: "D\u00e9signation(s)",
    desc: "Description(s)",
    qty: "Qt\u00e9",
    unit: "Unit\u00e9",
    purchasePrice: "PU A. HT",
    purchaseTva: "TVA A.",
    purchaseDiscount: "Remise A.",
    price: "P.U. HT",
    tva: "TVA %",
    fodecSale: "FODEC",
    fodecPurchase: "FODEC A.",
    discount: "Remise %",
    totalPurchaseHt: "Total A. HT",
    totalHt: "Total HT",
    totalPurchaseTtc: "Total A. TTC",
    totalTtc: "Total TTC"
  };
  const ARTICLE_FIELD_LABEL_CANDIDATES = {
    fodecSale: ["fodecAmount", "fodecSale", "fodec"],
    fodecPurchase: ["purchaseFodecAmount", "fodecPurchase", "fodec"]
  };
  const MODEL_DOC_TYPE_PURCHASE_VALUES = new Set(["fa", "bc", "be"]);
  const MODEL_DOC_TYPE_STOCK_VALUES = new Set(["be", "bs"]);
  const NBSP = "\u00A0";
  const CURRENCY_WORDS = {
    DT: { major: "dinars", minor: "millimes", minorFactor: 1000 },
    TND: { major: "dinars", minor: "millimes", minorFactor: 1000 },
    EUR: { major: "euros", minor: "centimes", minorFactor: 100 },
    USD: { major: "dollars", minor: "cents", minorFactor: 100 }
  };

  function ensurePdfStylesheet() {
    let link = document.getElementById(PDF_MODEL_CSS_LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = PDF_MODEL_CSS_LINK_ID;
      link.rel = "stylesheet";
      link.href = PDF_MODEL_CSS_HREF;
      document.head.appendChild(link);
    }
    if (!link.dataset.pdfModelCss) {
      link.dataset.pdfModelCss = "ready";
      link.addEventListener("load", captureCssFromStylesheet);
      link.addEventListener("error", requestCssTextFallback);
    }
  }

  function readStyleSheetText(predicate) {
    try {
      const sheets = Array.from(document.styleSheets || []);
      for (const sheet of sheets) {
        const owner = sheet?.ownerNode;
        const href = String(sheet?.href || owner?.href || "").toLowerCase();
        if (!predicate(owner, href)) continue;
        if (!sheet.cssRules) continue;
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      }
    } catch {
      return "";
    }
    return "";
  }

  function captureCssFromStylesheet() {
    if (!pdfCssText) {
      const css = readStyleSheetText((_owner, href) => href.includes("pdf-model-view.css"));
      if (css) pdfCssText = css;
    }
    if (!modelActionsCssText) {
      const css = readStyleSheetText((_owner, href) => href.includes("modelactionsmodal.css"));
      if (css) modelActionsCssText = css;
    }
    if (!templateCssTexts.template1) {
      const css = readStyleSheetText(
        (owner, href) =>
          owner?.id === "template1Css" || href.includes("/template1.css") || href.endsWith("template1.css")
      );
      if (css) templateCssTexts.template1 = css;
    }
    if (!templateCssTexts.template2) {
      const css = readStyleSheetText(
        (owner, href) =>
          owner?.id === "template2Css" || href.includes("/template2.css") || href.endsWith("template2.css")
      );
      if (css) templateCssTexts.template2 = css;
    }
  }

  function requestCssTextFallback() {
    if (!pdfCssText && !cssFetchStarted && typeof fetch === "function") {
      cssFetchStarted = true;
      fetch(PDF_MODEL_CSS_HREF)
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          if (text) pdfCssText = text;
        })
        .catch(() => {});
    }
    if (!modelActionsCssText && !modelCssFetchPromise && typeof fetch === "function") {
      modelCssFetchPromise = fetch(MODEL_ACTIONS_CSS_HREF)
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          if (text) modelActionsCssText = text;
        })
        .catch(() => {})
        .finally(() => {
          modelCssFetchPromise = null;
        });
    }
    Object.entries(TEMPLATE_CSS_HREFS).forEach(([key, href]) => {
      if (templateCssTexts[key] || templateCssFetchPromises[key] || typeof fetch !== "function") return;
      templateCssFetchPromises[key] = fetch(href)
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          if (text) templateCssTexts[key] = text;
        })
        .catch(() => {})
        .finally(() => {
          templateCssFetchPromises[key] = null;
        });
    });
  }

  function ensureCssReady() {
    ensurePdfStylesheet();
    captureCssFromStylesheet();
    requestCssTextFallback();
  }

  function waitForCssReady() {
    if (typeof document === "undefined") return Promise.resolve();
    ensureCssReady();
    const link = document.getElementById(PDF_MODEL_CSS_LINK_ID);
    const linkReadyPromise =
      !link || link.sheet || pdfCssText
        ? Promise.resolve()
        : new Promise((resolve) => {
            const done = () => resolve();
            link.addEventListener("load", done, { once: true });
            link.addEventListener("error", done, { once: true });
          });
    const waits = [linkReadyPromise];
    if (!modelActionsCssText && modelCssFetchPromise) waits.push(modelCssFetchPromise);
    Object.keys(TEMPLATE_CSS_HREFS).forEach((key) => {
      if (!templateCssTexts[key] && templateCssFetchPromises[key]) waits.push(templateCssFetchPromises[key]);
    });
    return Promise.all(waits).then(() => {});
  }

  function transformModelActionsCss(rawCss) {
    if (!rawCss) return "";
    if (rawCss === transformedModelActionsCssSource) return transformedModelActionsCssText;
    transformedModelActionsCssSource = rawCss;
    transformedModelActionsCssText = String(rawCss)
      .replace(/#modelActionsModal\b/g, ".pdf-model-template")
      .replace(/#modelActionsPreview\b/g, ".pdf-model-preview-page");
    return transformedModelActionsCssText;
  }

  function transformTemplateCss(rawCss, key) {
    if (!rawCss) return "";
    if (rawCss === transformedTemplateCssSource[key]) return transformedTemplateCssTexts[key];
    transformedTemplateCssSource[key] = rawCss;
    transformedTemplateCssTexts[key] = String(rawCss)
      .replace(/#modelActionsPreview\b/g, ".pdf-model-preview-page")
      .replace(/#modelActionsModal\b/g, ".pdf-model-template");
    return transformedTemplateCssTexts[key];
  }

  function getCombinedCssText(templateKeyInput = "template1") {
    ensureCssReady();
    const key = normalizeTemplateKey(templateKeyInput);
    const templateCss = transformTemplateCss(templateCssTexts[key] || "", key);
    return [pdfCssText || "", transformModelActionsCss(modelActionsCssText || ""), templateCss]
      .filter(Boolean)
      .join("\n");
  }

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const hasText = (value) => String(value ?? "").trim().length > 0;

  const stripHtmlText = (value) =>
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|\u00a0/gi, " ")
      .trim();

  function decodeHtmlEntities(value) {
    const raw = String(value ?? "");
    if (!/[&<>]/.test(raw) || typeof document === "undefined") return raw;
    const el = document.createElement("textarea");
    el.innerHTML = raw;
    return el.value || raw;
  }

  const parseLooseNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value == null) return null;
    const raw = String(value).replace(/\u00A0/g, " ").trim();
    if (!raw) return null;
    const wrappedNegative = /^\(.*\)$/.test(raw);
    const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
    const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
    if (!cleaned || !/[0-9]/.test(cleaned)) return null;
    const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
    const unsigned = cleaned.replace(/[+\-]/g, "");
    const commaCount = (unsigned.match(/,/g) || []).length;
    const dotCount = (unsigned.match(/\./g) || []).length;
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");
    let decimalSep = "";
    if (commaCount > 0 && dotCount > 0) decimalSep = lastComma > lastDot ? "," : ".";
    else if (commaCount === 1 && dotCount === 0) decimalSep = ",";
    else if (dotCount === 1 && commaCount === 0) decimalSep = ".";
    let normalized = "";
    if (decimalSep) {
      const sepIndex = unsigned.lastIndexOf(decimalSep);
      const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
      const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
      normalized = fracPart ? `${intPart || "0"}.${fracPart}` : intPart || "0";
    } else {
      normalized = unsigned.replace(/[.,]/g, "");
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? sign * parsed : null;
  };

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = parseLooseNumber(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const fmtQty = (value) => {
    const parsed = parseLooseNumber(value);
    if (!Number.isFinite(parsed)) return String(value ?? "").trim();
    if (Math.abs(parsed - Math.trunc(parsed)) < 1e-9) return String(Math.trunc(parsed));
    return String(parsed).replace(/\.?0+$/, "");
  };

  const resolveCurrencyDecimals = (code) => {
    const upper = String(code || "").trim().toUpperCase();
    return upper === "DT" || upper === "TND" ? 3 : 2;
  };

  const fmtMoney = (value, currency) => {
    const amount = toFiniteNumber(value, 0);
    const code = String(currency || "DT").trim().toUpperCase();
    const decimals = resolveCurrencyDecimals(code);
    const fmtOptions = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
    let numberPart;
    try {
      numberPart = new Intl.NumberFormat(undefined, fmtOptions).format(amount);
    } catch {
      numberPart = amount.toFixed(decimals);
    }
    numberPart = numberPart.replace(/\s/g, NBSP);
    if (code === "DT" || code === "TND") {
      const displayCode = code === "TND" ? "TND" : "DT";
      return `${numberPart}${NBSP}${displayCode}`;
    }
    return `${numberPart}${NBSP}${code || currency || "DT"}`;
  };

  const fmtPct = (value) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
      .format(toFiniteNumber(value, 0))
      .replace(/\s/g, "");

  const clonePlain = (value, fallback) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  const normalizeDocType = (value) => {
    const raw = String(value || "facture").trim().toLowerCase();
    const aliasMap = {
      factureachat: "fa",
      facture_achat: "fa",
      "facture-achat": "fa",
      "facture achat": "fa",
      "facture d'achat": "fa",
      "facture dachat": "fa",
      bonentree: "be",
      bon_entree: "be",
      "bon-entree": "be",
      "bon entree": "be",
      "bon d'entree": "be",
      "bon d'entr\u00e9e": "be",
      bonsortie: "bs",
      bon_sortie: "bs",
      "bon-sortie": "bs",
      "bon sortie": "bs",
      "bon de sortie": "bs",
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const normalized = aliasMap[raw] || raw;
    const allowed = new Set(["facture", "fa", "devis", "bl", "bc", "be", "bs", "avoir"]);
    return allowed.has(normalized) ? normalized : "facture";
  };

  const docTypeTitle = (docType) => {
    if (docType === "fa") return "Facture d'achat";
    if (docType === "devis") return "Devis";
    if (docType === "bl") return "Bon de livraison";
    if (docType === "bc") return "Bon de commande";
    if (docType === "be") return "Bon d'entr\u00e9e";
    if (docType === "bs") return "Bon de sortie";
    if (docType === "avoir") return "Facture d'avoir";
    return "Facture";
  };

  const normalizeTemplateKey = (value) => {
    const raw = String(value || "template1").trim().toLowerCase();
    const normalized = raw.replace(/[\s_-]+/g, "");
    if (normalized === "template2" || normalized === "wellcom" || normalized === "welcome") {
      return "template2";
    }
    if (
      normalized === "template1" ||
      normalized === "facturence" ||
      normalized === "facturance"
    ) {
      return "template1";
    }
    return "template1";
  };

  const resolveTemplateKey = (state = {}) =>
    normalizeTemplateKey(state?.meta?.template || state?.template || "template1");

  const normalizeColumnKey = (raw) => {
    const str = String(raw || "").trim();
    if (!str) return "";
    const cleaned = str.replace(/[^a-zA-Z0-9]+/g, "");
    if (!cleaned) return "";
    const aliasKey = cleaned.toLowerCase();
    if (COLUMN_KEY_ALIASES[aliasKey]) return COLUMN_KEY_ALIASES[aliasKey];
    return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  };

  function resolveColumnVisibilityMap(state = {}, { strictPreview = false } = {}) {
    const meta = state?.meta || {};
    const modelColumns = meta && typeof meta.modelColumns === "object" ? meta.modelColumns : null;
    const savedColumns = meta && typeof meta.columns === "object" ? meta.columns : null;
    const sourceColumns = strictPreview ? savedColumns || modelColumns || {} : modelColumns || savedColumns || {};
    const visibility = { ...COLUMN_VISIBILITY_DEFAULTS };
    if (sourceColumns && typeof sourceColumns === "object") {
      Object.entries(sourceColumns).forEach(([rawKey, value]) => {
        const key = normalizeColumnKey(rawKey);
        if (!key) return;
        visibility[key] = value !== false;
      });
    }
    return visibility;
  }

  function resolveArticleLabels(state = {}, { strictPreview = false } = {}) {
    const defaults = { ...ARTICLE_FIELD_LABEL_DEFAULTS };
    if (!strictPreview && global?.DEFAULT_ARTICLE_FIELD_LABELS && typeof global.DEFAULT_ARTICLE_FIELD_LABELS === "object") {
      Object.entries(defaults).forEach(([key, fallback]) => {
        const rawCandidates = ARTICLE_FIELD_LABEL_CANDIDATES[key] || [key];
        let replacement = "";
        rawCandidates.some((candidate) => {
          const raw = typeof global.DEFAULT_ARTICLE_FIELD_LABELS?.[candidate] === "string"
            ? global.DEFAULT_ARTICLE_FIELD_LABELS[candidate].trim()
            : "";
          if (!raw) return false;
          replacement = decodeHtmlEntities(raw);
          return true;
        });
        defaults[key] = replacement || fallback;
      });
    }
    const fromState = state?.meta?.articleFieldLabels;
    const fromHelper =
      !strictPreview && typeof global?.SEM?.__bindingHelpers?.getArticleFieldLabels === "function"
        ? global.SEM.__bindingHelpers.getArticleFieldLabels()
        : null;
    const source = fromState && typeof fromState === "object" ? fromState : fromHelper;
    if (source && typeof source === "object") {
      Object.entries(defaults).forEach(([key, fallback]) => {
        const rawCandidates = ARTICLE_FIELD_LABEL_CANDIDATES[key] || [key];
        let replacement = "";
        rawCandidates.some((candidate) => {
          const raw = typeof source?.[candidate] === "string" ? source[candidate].trim() : "";
          if (!raw) return false;
          replacement = decodeHtmlEntities(raw);
          return true;
        });
        defaults[key] = replacement || fallback;
      });
    }
    return defaults;
  }

  function pickFirstValue(source, keys = []) {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source || {}, key)) continue;
      const value = source[key];
      if (typeof value === "string") {
        if (value.trim()) return value;
        continue;
      }
      if (value != null) return value;
    }
    return "";
  }

  function resolvePreviewFodecRate(source, { purchase = false } = {}) {
    const target = source && typeof source === "object" ? source : {};
    const objectKey = purchase ? "purchaseFodec" : "fodec";
    const objectValue = target[objectKey];
    if (objectValue && typeof objectValue === "object") {
      const hasConfigValue =
        Object.prototype.hasOwnProperty.call(objectValue, "enabled") ||
        Object.prototype.hasOwnProperty.call(objectValue, "rate");
      if (hasConfigValue) {
        const rate = toFiniteNumber(objectValue.rate, 0);
        const enabled = Object.prototype.hasOwnProperty.call(objectValue, "enabled")
          ? !!objectValue.enabled
          : Math.abs(rate) > 1e-9;
        return enabled ? rate : 0;
      }
    } else if (objectValue != null && objectValue !== "") {
      return objectValue;
    }

    const scalar = pickFirstValue(
      target,
      purchase
        ? ["fodecPurchase", "purchaseFodecRate", "purchase_fodec_rate", "fodecA"]
        : ["fodecSale", "fodecRate", "fodec_rate", "fodecV"]
    );
    if (scalar && typeof scalar === "object") {
      const rate = toFiniteNumber(scalar.rate, 0);
      const enabled = Object.prototype.hasOwnProperty.call(scalar, "enabled")
        ? !!scalar.enabled
        : Math.abs(rate) > 1e-9;
      return enabled ? rate : 0;
    }
    return scalar;
  }

  function normalizePreviewItem(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      ref: String(pickFirstValue(source, ["ref", "reference", "code", "sku"]) || "").trim(),
      product: String(
        pickFirstValue(source, ["product", "designation", "name", "label", "article", "itemName"]) || ""
      ).trim(),
      desc: String(pickFirstValue(source, ["desc", "description", "detail", "details"]) || "").trim(),
      qty: pickFirstValue(source, ["qty", "quantity", "qte", "quantite"]),
      unit: String(pickFirstValue(source, ["unit", "unite"]) || "").trim(),
      price: pickFirstValue(source, ["price", "unitPrice", "pu", "pu_ht", "puHT"]),
      purchasePrice: pickFirstValue(source, [
        "purchasePrice",
        "purchase_price",
        "purchasePU",
        "purchaseUnitPrice",
        "puAchat",
        "pu_achat",
        "purchasePriceHT"
      ]),
      tva: pickFirstValue(source, ["tva", "tvaRate", "tax", "taxRate"]),
      purchaseTva: pickFirstValue(source, [
        "purchaseTva",
        "purchase_tva",
        "purchaseTax",
        "purchaseTaxRate",
        "tvaAchat",
        "tva_achat"
      ]),
      discount: pickFirstValue(source, ["discount", "discountPct", "discountRate", "remise", "remisePct"]),
      purchaseDiscount: pickFirstValue(source, [
        "purchaseDiscount",
        "purchase_discount",
        "purchaseDiscountPct",
        "purchaseDiscountRate",
        "purchaseRemise",
        "remiseAchat"
      ]),
      fodecSale: resolvePreviewFodecRate(source),
      fodecPurchase: resolvePreviewFodecRate(source, { purchase: true }),
      totalHt: pickFirstValue(source, ["totalHt", "total_ht", "lineTotalHT", "total"]),
      totalPurchaseHt: pickFirstValue(source, [
        "totalPurchaseHt",
        "total_purchase_ht",
        "purchaseTotalHT",
        "totalAchatHT"
      ]),
      totalTtc: pickFirstValue(source, ["ttc", "totalTtc", "total_ttc", "lineTotalTTC"]),
      totalPurchaseTtc: pickFirstValue(source, [
        "totalPurchaseTtc",
        "total_purchase_ttc",
        "purchaseTotalTTC",
        "totalAchatTTC"
      ]),
      sourceDocType: String(
        pickFirstValue(source, ["sourceDocType", "source_doc_type", "sourceType", "source_type"]) || ""
      )
        .trim()
        .toLowerCase(),
      sourceDocNumber: String(
        pickFirstValue(source, ["sourceDocNumber", "source_doc_number", "sourceNumber", "source_number"]) || ""
      ).trim(),
      sourceDocDate: String(
        pickFirstValue(source, ["sourceDocDate", "source_doc_date", "sourceDate", "source_date"]) || ""
      ).trim()
    };
  }

  function normalizeRichText(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/[<>]/.test(raw)) return raw;
    return esc(raw).replace(/\r?\n/g, "<br/>");
  }

  function setNodeVisibility(node, visible) {
    if (!node) return;
    const show = !!visible;
    node.hidden = !show;
    node.style.display = show ? "" : "none";
    node.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function setText(page, id, value, fallback = "") {
    const node = page?.querySelector?.(`#${id}`);
    if (!node) return;
    const text = hasText(value) ? String(value).trim() : String(fallback ?? "").trim();
    node.textContent = text || node.dataset?.default || "";
  }

  function normalizeContactLines(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parts = raw
      .split(/[\r\n,;\/|]+|\s+-\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return (parts.length ? parts : [raw]).join("\n");
  }

  function setHtml(page, id, html, fallback = "") {
    const node = page?.querySelector?.(`#${id}`);
    if (!node) return;
    const content = hasText(stripHtmlText(html)) ? String(html) : String(fallback ?? "");
    node.innerHTML = content;
  }

  function resolveTotals(state = {}) {
    const metaTotals = state?.meta?.__pdfPreviewTotals;
    if (metaTotals && typeof metaTotals === "object") {
      return clonePlain(metaTotals, { ...metaTotals });
    }
    const sem = global?.SEM;
    if (sem && typeof sem.computeTotalsReturn === "function") {
      const originalState = sem.state;
      try {
        sem.state = state;
        const totals = sem.computeTotalsReturn();
        if (totals && typeof totals === "object") return clonePlain(totals, { ...totals });
      } catch (err) {
        console.warn("PDFModelView totals compute failed", err);
      } finally {
        sem.state = originalState;
      }
    }
    return {
      currency: state?.meta?.currency || "DT",
      totalHT: 0,
      totalTTC: 0,
      tax: 0,
      tvaBreakdown: [],
      extras: {}
    };
  }

  function resolveBonEntreeReception(meta = {}) {
    const raw = meta?.beReception && typeof meta.beReception === "object" ? meta.beReception : {};
    const sourceSelection = raw.sourceSelection && typeof raw.sourceSelection === "object" ? raw.sourceSelection : null;
    const sourceRef =
      String(raw.sourceRef ?? raw.referenceSource ?? raw.source ?? meta?.beSourceRef ?? "").trim() ||
      (Array.isArray(sourceSelection?.documents)
        ? sourceSelection.documents
            .map((entry) => {
              const typeLabel = String(entry?.typeLabel || entry?.docTypeLabel || "").trim();
              const number = String(entry?.number || entry?.ref || "").trim();
              return [typeLabel, number].filter(Boolean).join(" ");
            })
            .filter(Boolean)
            .join(", ")
        : "");
    const destinationLabels = Array.isArray(raw.destinationLabels)
      ? raw.destinationLabels
      : typeof raw.destination === "string"
        ? raw.destination.split(",")
        : [];
    return {
      depot: String(raw.depot ?? raw.depotName ?? meta?.beReceptionDepot ?? meta?.beDepot ?? "").trim(),
      destination:
        String(raw.destination ?? raw.destinationLocation ?? raw.location ?? meta?.beReceptionDestination ?? "").trim() ||
        destinationLabels.map((entry) => String(entry || "").trim()).filter(Boolean).join(", "),
      date: String(raw.date ?? raw.receptionDate ?? meta?.beReceptionDate ?? meta?.date ?? "").trim(),
      time: String(raw.time ?? raw.receptionTime ?? meta?.beReceptionTime ?? "").trim(),
      sourceRef,
      transporter: String(raw.transporter ?? raw.transporteur ?? meta?.beTransporter ?? "").trim(),
      driverName: String(raw.driverName ?? raw.chauffeur ?? meta?.beDriverName ?? "").trim(),
      vehiclePlate: String(raw.vehiclePlate ?? raw.vehicle ?? raw.matriculeVehicule ?? meta?.beVehiclePlate ?? "").trim()
    };
  }

  function resolveBonSortieContext(meta = {}) {
    const raw =
      (meta?.bsSortie && typeof meta.bsSortie === "object" && meta.bsSortie) ||
      (meta?.bs && typeof meta.bs === "object" && meta.bs) ||
      {};
    const locationLabels = Array.isArray(raw.locationLabels)
      ? raw.locationLabels
      : Array.isArray(raw.destinationLabels)
        ? raw.destinationLabels
        : typeof raw.location === "string"
          ? raw.location.split(",")
          : [];
    return {
      depot: String(raw.depot ?? raw.depotName ?? raw.magasin ?? meta?.bsDepot ?? "").trim(),
      location:
        String(raw.location ?? raw.emplacement ?? raw.destination ?? meta?.bsLocation ?? "").trim() ||
        locationLabels.map((entry) => String(entry || "").trim()).filter(Boolean).join(", "),
      date: String(raw.date ?? raw.sortieDate ?? raw.movementDate ?? meta?.bsSortieDate ?? meta?.date ?? "").trim(),
      time: String(raw.time ?? raw.sortieTime ?? raw.movementTime ?? meta?.bsSortieTime ?? "").trim(),
      sourceRef: String(raw.sourceRef ?? raw.referenceSource ?? raw.source ?? meta?.bsSourceRef ?? "").trim(),
      transporter: String(raw.transporter ?? raw.transporteur ?? meta?.bsTransporter ?? "").trim(),
      driverName: String(raw.driverName ?? raw.chauffeur ?? meta?.bsDriverName ?? "").trim(),
      vehiclePlate: String(raw.vehiclePlate ?? raw.vehicle ?? raw.matriculeVehicule ?? meta?.bsVehiclePlate ?? "").trim(),
      transportMode: String(raw.transportMode ?? raw.modeTransport ?? meta?.bsTransportMode ?? "").trim(),
      exitReason: String(raw.exitReason ?? raw.reason ?? raw.motifSortie ?? meta?.bsExitReason ?? "").trim()
    };
  }

  function normalizeConvertedSourceNumbers(value) {
    const list = Array.isArray(value) ? value : [];
    const seen = new Set();
    const normalized = [];
    list.forEach((entry) => {
      const number = String(entry || "").trim();
      if (!number || seen.has(number)) return;
      seen.add(number);
      normalized.push(number);
    });
    return normalized;
  }

  function resolveConvertedSourceNumbers(meta = {}) {
    const convertedFrom =
      meta && typeof meta.convertedFrom === "object" ? meta.convertedFrom : null;
    if (!convertedFrom) return [];
    const numbers = normalizeConvertedSourceNumbers(
      convertedFrom.numbers || convertedFrom.sourceNumbers
    );
    if (numbers.length) return numbers;
    const single = String(convertedFrom.number || "").trim();
    return single ? [single] : [];
  }

  function formatConvertedSourceHeadingDate(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return raw;
  }

  function resolveConvertedSourceHeadingLabel(sourceType = "") {
    const normalizedType = normalizeDocType(sourceType || "bl");
    const labelByType = {
      bl: "BL N\u00B0 :",
      devis: "Devis N\u00B0 :",
      facture: "Facture N\u00B0 :",
      fa: "FA N\u00B0 :",
      bc: "BC N\u00B0 :",
      be: "BE N\u00B0 :",
      bs: "BS N\u00B0 :",
      avoir: "Avoir N\u00B0 :"
    };
    return labelByType[normalizedType] || `${docTypeTitle(normalizedType)} N\u00B0 :`;
  }

  function shouldRenderConvertedSourceGroups(docType = "", sourceType = "") {
    const normalizedDocType = normalizeDocType(docType);
    const normalizedSourceType = normalizeDocType(sourceType);
    return (
      (normalizedDocType === "facture" && normalizedSourceType === "bl") ||
      (normalizedDocType === "bl" && normalizedSourceType === "facture")
    );
  }

  function resolveConvertedItemSourceGroup(item = {}, meta = {}, docType = "") {
    const convertedFrom =
      meta && typeof meta.convertedFrom === "object" ? meta.convertedFrom : null;
    const sourceType = normalizeDocType(
      item.sourceDocType || convertedFrom?.docType || convertedFrom?.type || "bl"
    );
    if (!shouldRenderConvertedSourceGroups(docType, sourceType)) return null;
    let sourceNumber = String(item.sourceDocNumber || "").trim();
    let sourceDate = String(item.sourceDocDate || "").trim();
    const docLevelNumbers = resolveConvertedSourceNumbers(meta);
    if (!sourceNumber && docLevelNumbers.length === 1) {
      sourceNumber = String(docLevelNumbers[0] || "").trim();
    }
    if (!sourceDate && docLevelNumbers.length <= 1) {
      sourceDate = String(convertedFrom?.date || "").trim();
    }
    if (!sourceNumber) return null;
    const displayDate = formatConvertedSourceHeadingDate(sourceDate);
    const headingText = `${resolveConvertedSourceHeadingLabel(sourceType)} ${sourceNumber}${
      displayDate ? ` date ${displayDate}` : ""
    }`;
    return {
      key: `${sourceType || "document"}|${sourceNumber.toLowerCase()}|${displayDate.toLowerCase()}`,
      text: headingText
    };
  }

  function buildConvertedSourceRenderRows(items = [], meta = {}, docType = "") {
    const normalizedDocType = normalizeDocType(docType);
    if (
      !Array.isArray(items) ||
      !items.length ||
      !["facture", "bl"].includes(normalizedDocType)
    ) {
      return Array.isArray(items)
        ? items.map((item) => ({ type: "item", item }))
        : [];
    }
    const renderRows = [];
    let lastGroupKey = "";
    let hasRenderedSourceGroup = false;
    items.forEach((item) => {
      const group = resolveConvertedItemSourceGroup(item, meta, docType);
      if (group?.key && group.key !== lastGroupKey) {
        renderRows.push({
          type: "source",
          group,
          spaced: hasRenderedSourceGroup
        });
        lastGroupKey = group.key;
        hasRenderedSourceGroup = true;
      }
      renderRows.push({ type: "item", item });
    });
    return renderRows;
  }

  function applyConvertedSourcesLine(page, state, docType) {
    if (!page) return;
    let node = page.querySelector("#modelPreviewConvertedSources");
    if (node) node.remove();
  }

  function setApprovalName(page, nodeId, value) {
    const node = page.querySelector(`#${nodeId}`);
    if (!node) return;
    const fallback = String(node.dataset?.default || node.textContent || "").trim();
    node.textContent = hasText(value) ? String(value).trim() : fallback;
  }

  function applyHeader(page, state, assets, docType) {
    const meta = state?.meta && typeof state.meta === "object" ? state.meta : {};
    setText(page, "modelPreviewDoc", docTypeTitle(docType), docTypeTitle(docType));
    setText(page, "modelPreviewDate", meta.date || "", "");
    setText(page, "modelPreviewNumber", meta.number || "", "");
    const logo = page?.querySelector?.("#modelPreviewLogo");
    if (logo) {
      const src = String(state?.company?.logo || assets?.companyLogo || "").trim();
      if (src) {
        logo.src = src;
        logo.hidden = false;
        logo.style.display = "";
      } else {
        logo.removeAttribute("src");
        logo.hidden = true;
        logo.style.display = "none";
      }
    }
  }

  function applyCompanyAndParty(page, state, docType) {
    const company = state?.company && typeof state.company === "object" ? state.company : {};
    const party = state?.client && typeof state.client === "object" ? state.client : {};
    setText(page, "modelPreviewCompanyName", company.name || "-", "-");
    setText(page, "modelPreviewCompanyMf", company.vat || company.mf || "-", "-");
    setText(page, "modelPreviewCompanyPhone", normalizeContactLines(company.phone || ""), "-");
    setText(page, "modelPreviewCompanyEmail", company.email || "-", "-");
    setText(page, "modelPreviewCompanyAddress", company.address || "-", "-");

    const isPurchaseDocType = MODEL_DOC_TYPE_PURCHASE_VALUES.has(docType);
    const legendText = docType === "bs" ? "Destinataire" : isPurchaseDocType ? "Fournisseur" : "Client";
    const partyLegend =
      page.querySelector('[data-model-preview-party-legend]') ||
      page.querySelector(".doc-design1__section > legend");
    if (partyLegend) partyLegend.textContent = legendText;
    const partySection =
      partyLegend?.closest("fieldset") ||
      page.querySelector(".doc-design1__grid fieldset.doc-design1__section");
    const partyName = partySection?.querySelector(".doc-design1__client-name");
    if (partyName) partyName.textContent = hasText(party.name) ? String(party.name).trim() : "-";
    const lines = partySection ? Array.from(partySection.querySelectorAll(".doc-design1__meta-line")) : [];
    const legacyValues = [party.vat || party.mf || "-", party.phone || "-", party.email || "-", party.address || "-"];
    const codeLabelText = isPurchaseDocType ? "Code fournisseur :" : "Code client :";
    const codeLine = lines.find((line) => {
      const valueNode = line.querySelector(".doc-design1__meta-value");
      const field = String(line.dataset?.partyField || valueNode?.dataset?.partyField || "")
        .trim()
        .toLowerCase();
      return field === "code";
    });
    const codeLabelNode = codeLine?.querySelector(".doc-design1__meta-label");
    if (codeLabelNode) codeLabelNode.textContent = codeLabelText;
    const partyCode = isPurchaseDocType
      ? (
          party.codeFournisseur ||
          party.code_fournisseur ||
          party.codeClient ||
          party.code_client ||
          party.codeTransporteur ||
          party.code_transporteur ||
          party.code ||
          "-"
        )
      : (
          party.codeClient ||
          party.code_client ||
          party.code ||
          "-"
        );
    lines.forEach((line, index) => {
      const valueNode = line.querySelector(".doc-design1__meta-value");
      if (!valueNode) return;
      const field = String(line.dataset?.partyField || valueNode.dataset?.partyField || "")
        .trim()
        .toLowerCase();
      const valueByField = {
        code: partyCode,
        vat: party.vat || party.mf || "-",
        phone: party.phone || "-",
        email: party.email || "-",
        address: party.address || "-"
      };
      const rawValue =
        Object.prototype.hasOwnProperty.call(valueByField, field)
          ? valueByField[field]
          : legacyValues[index];
      valueNode.textContent = hasText(rawValue) ? String(rawValue).trim() : "-";
    });
  }

  function applyTable(page, state, visibilityInput, labels, docType, currency, taxesEnabled) {
    const table = page?.querySelector?.(".doc-design1__table");
    if (!table) return;
    const headerCells = Array.from(table.querySelectorAll("thead th[data-col]"));
    if (!headerCells.length) return;
    const isPurchaseDoc = MODEL_DOC_TYPE_PURCHASE_VALUES.has(docType);
    const isStock = MODEL_DOC_TYPE_STOCK_VALUES.has(docType);
    const visibility = { ...visibilityInput };
    const priceVis = visibility.price !== false;
    const purchasePriceVis = visibility.purchasePrice !== false;
    const visibleByKey = {
      ref: visibility.ref !== false,
      product: visibility.product !== false,
      desc: visibility.desc !== false,
      qty: visibility.qty !== false,
      unit: visibility.unit !== false,
      purchasePrice: purchasePriceVis,
      purchaseTva: purchasePriceVis && taxesEnabled && visibility.purchaseTva !== false,
      purchaseDiscount: purchasePriceVis && visibility.purchaseDiscount !== false,
      price: priceVis,
      tva: priceVis && taxesEnabled && visibility.tva !== false,
      discount: priceVis && visibility.discount !== false,
      fodecSale: !isPurchaseDoc && taxesEnabled && visibility.fodec !== false,
      fodecPurchase: isPurchaseDoc && taxesEnabled && visibility.fodecPurchase !== false,
      totalPurchaseHt: purchasePriceVis && visibility.totalPurchaseHt !== false,
      totalHt: priceVis && visibility.totalHt !== false,
      totalPurchaseTtc: purchasePriceVis && taxesEnabled && visibility.totalPurchaseTtc !== false,
      totalTtc: priceVis && taxesEnabled && visibility.totalTtc !== false
    };
    if (isStock) {
      [
        "purchasePrice",
        "purchaseTva",
        "purchaseDiscount",
        "price",
        "tva",
        "discount",
        "fodecSale",
        "fodecPurchase",
        "totalPurchaseHt",
        "totalHt",
        "totalPurchaseTtc",
        "totalTtc"
      ].forEach((key) => {
        visibleByKey[key] = false;
      });
    }
    const labelByKey = {
      ref: labels.ref,
      product: labels.product,
      desc: labels.desc,
      qty: labels.qty,
      unit: labels.unit,
      purchasePrice: labels.purchasePrice,
      purchaseTva: labels.purchaseTva,
      purchaseDiscount: labels.purchaseDiscount,
      price: taxesEnabled ? labels.price : "Prix unitaire",
      tva: labels.tva,
      discount: labels.discount,
      fodecSale: labels.fodecSale,
      fodecPurchase: labels.fodecPurchase,
      totalPurchaseHt: labels.totalPurchaseHt,
      totalHt: labels.totalHt,
      totalPurchaseTtc: labels.totalPurchaseTtc,
      totalTtc: labels.totalTtc
    };
    const columns = headerCells.map((cell) => {
      const domKey = String(cell.dataset?.col || "").trim();
      const key = normalizeColumnKey(domKey);
      if (key && labelByKey[key]) cell.textContent = labelByKey[key];
      setNodeVisibility(cell, visibleByKey[key] !== false);
      return { domKey, key };
    });
    const body = table.querySelector("tbody");
    if (!body) return;
    body.innerHTML = "";
    const inputItems = Array.isArray(state?.items)
      ? state.items.map((item) => normalizePreviewItem(item))
      : [];
    const hasProductContent = inputItems.some((item) => hasText(item?.product));
    const hasDescContent = inputItems.some((item) => hasText(item?.desc));
    const contentColumnKey =
      visibleByKey.product !== false && hasProductContent
        ? "product"
        : visibleByKey.desc !== false && hasDescContent
          ? "desc"
          : visibleByKey.product !== false
            ? "product"
            : visibleByKey.desc !== false
              ? "desc"
              : columns.find(({ key }) => visibleByKey[key] !== false)?.key || "";
    const renderRows = buildConvertedSourceRenderRows(
      inputItems,
      state?.meta && typeof state.meta === "object" ? state.meta : {},
      docType
    );
    const rows = renderRows.length ? renderRows : [{ type: "item", item: {} }];
    rows.forEach((entry) => {
      if (entry?.type === "source") {
        const row = document.createElement("tr");
        row.classList.add("doc-design1__source-row");
        if (entry?.spaced) row.classList.add("doc-design1__source-row--spaced");
        columns.forEach(({ domKey, key }) => {
          const cell = document.createElement("td");
          cell.dataset.col = domKey;
          const headerCell = headerCells.find((node) => String(node.dataset?.col || "").trim() === domKey);
          if (headerCell?.className) cell.className = headerCell.className;
          if (key === contentColumnKey) {
            const heading = document.createElement("div");
            heading.className = "doc-design1__source-heading";
            heading.textContent = String(entry?.group?.text || "").trim();
            cell.appendChild(heading);
          } else {
            cell.innerHTML = "&nbsp;";
          }
          setNodeVisibility(cell, visibleByKey[key] !== false);
          row.appendChild(cell);
        });
        body.appendChild(row);
        return;
      }
      const item = entry?.item && typeof entry.item === "object" ? entry.item : {};
      const qty = toFiniteNumber(item.qty, 0);
      const price = toFiniteNumber(item.price, 0);
      const purchasePrice = toFiniteNumber(item.purchasePrice, price);
      const discount = toFiniteNumber(item.discount, 0);
      const purchaseDiscount = toFiniteNumber(item.purchaseDiscount, discount);
      const tva = toFiniteNumber(item.tva, 0);
      const purchaseTva = toFiniteNumber(item.purchaseTva, tva);
      const fodecSaleRate = toFiniteNumber(item.fodecSale, 0);
      const fodecPurchaseRate = toFiniteNumber(item.fodecPurchase, 0);
      const saleHtComputed = qty * price * (1 - discount / 100);
      const saleFodecAmount = taxesEnabled ? saleHtComputed * (fodecSaleRate / 100) : 0;
      const saleTvaAmount = taxesEnabled ? (saleHtComputed + saleFodecAmount) * (tva / 100) : 0;
      const saleTtcComputed = saleHtComputed + saleFodecAmount + saleTvaAmount;
      const purchaseHtComputed = qty * purchasePrice * (1 - purchaseDiscount / 100);
      const purchaseFodecAmount = taxesEnabled ? purchaseHtComputed * (fodecPurchaseRate / 100) : 0;
      const purchaseTvaAmount = taxesEnabled ? (purchaseHtComputed + purchaseFodecAmount) * (purchaseTva / 100) : 0;
      const purchaseTtcComputed = purchaseHtComputed + purchaseFodecAmount + purchaseTvaAmount;
      const explicitSaleHt = parseLooseNumber(item.totalHt);
      const explicitPurchaseHt = parseLooseNumber(item.totalPurchaseHt);
      const explicitSaleTtc = taxesEnabled ? parseLooseNumber(item.totalTtc) : NaN;
      const explicitPurchaseTtc = taxesEnabled ? parseLooseNumber(item.totalPurchaseTtc) : NaN;
      const row = document.createElement("tr");
      row.classList.add("doc-design1__row");
      columns.forEach(({ domKey, key }) => {
        const cell = document.createElement("td");
        cell.dataset.col = domKey;
        const headerCell = headerCells.find((node) => String(node.dataset?.col || "").trim() === domKey);
        if (headerCell?.className) cell.className = headerCell.className;
        let textValue = "";
        if (key === "ref") textValue = String(item.ref || "").trim();
        else if (key === "product") textValue = String(item.product || "").trim();
        else if (key === "desc") textValue = String(item.desc || "").trim();
        else if (key === "qty") textValue = fmtQty(item.qty);
        else if (key === "unit") textValue = String(item.unit || "").trim();
        else if (key === "price") textValue = fmtMoney(price, currency);
        else if (key === "purchasePrice") textValue = fmtMoney(purchasePrice, currency);
        else if (key === "discount") textValue = `${fmtPct(discount)}%`;
        else if (key === "purchaseDiscount") textValue = `${fmtPct(purchaseDiscount)}%`;
        else if (key === "tva") textValue = `${fmtPct(tva)}%`;
        else if (key === "purchaseTva") textValue = `${fmtPct(purchaseTva)}%`;
        else if (key === "fodecSale") textValue = `${fmtPct(fodecSaleRate)}%`;
        else if (key === "fodecPurchase") textValue = `${fmtPct(fodecPurchaseRate)}%`;
        else if (key === "totalHt") textValue = fmtMoney(Number.isFinite(explicitSaleHt) ? explicitSaleHt : saleHtComputed, currency);
        else if (key === "totalPurchaseHt")
          textValue = fmtMoney(Number.isFinite(explicitPurchaseHt) ? explicitPurchaseHt : purchaseHtComputed, currency);
        else if (key === "totalTtc")
          textValue = fmtMoney(Number.isFinite(explicitSaleTtc) ? explicitSaleTtc : saleTtcComputed, currency);
        else if (key === "totalPurchaseTtc")
          textValue = fmtMoney(Number.isFinite(explicitPurchaseTtc) ? explicitPurchaseTtc : purchaseTtcComputed, currency);
        cell.textContent = textValue;
        if (!hasText(textValue)) cell.innerHTML = "&nbsp;";
        setNodeVisibility(cell, visibleByKey[key] !== false);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    syncLastVisibleTableColumn(page);
  }

  function syncLastVisibleTableColumn(page) {
    const table = page?.querySelector?.(".doc-design1__table");
    if (!table) return;
    table
      .querySelectorAll(".doc-design1__table-cell--be-last-visible")
      .forEach((cell) => cell.classList.remove("doc-design1__table-cell--be-last-visible"));
    const visibleHeaderCells = Array.from(table.querySelectorAll("thead th[data-col]")).filter((cell) => {
      if (!cell || cell.hidden) return false;
      if (String(cell.getAttribute("aria-hidden") || "").toLowerCase() === "true") return false;
      if (cell.style.display === "none") return false;
      if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
        const computed = window.getComputedStyle(cell);
        if (computed?.display === "none") return false;
      }
      return true;
    });
    const lastHeader = visibleHeaderCells[visibleHeaderCells.length - 1];
    const lastColumn = String(lastHeader?.dataset?.col || "").trim();
    if (!lastColumn) return;
    table
      .querySelectorAll(`[data-col="${lastColumn}"]`)
      .forEach((cell) => cell.classList.add("doc-design1__table-cell--be-last-visible"));
  }

  function applyBonEntreeSections(page, state, visibility, docType, pdfOptions) {
    const isBe = docType === "be";
    const meta = state?.meta || {};
    const reception = resolveBonEntreeReception(meta);
    const beContext = page.querySelector("#modelPreviewBeContext");
    const beBottom = page.querySelector("#modelPreviewBeBottom");
    const beRows = {
      beDepot: page.querySelector("#modelPreviewBeDepotRow"),
      beDestination: page.querySelector("#modelPreviewBeDestinationRow"),
      beReceptionDate: page.querySelector("#modelPreviewBeReceptionDateRow"),
      beReceptionTime: page.querySelector("#modelPreviewBeReceptionTimeRow"),
      beSourceRef: page.querySelector("#modelPreviewBeSourceRefRow")
    };
    const beTransportRows = {
      beTransporter: page.querySelector("#modelPreviewBeTransporterRow"),
      beDriverName: page.querySelector("#modelPreviewBeDriverNameRow"),
      beVehiclePlate: page.querySelector("#modelPreviewBeVehiclePlateRow")
    };
    setText(page, "modelPreviewBeDepot", reception.depot, "");
    setText(page, "modelPreviewBeDestination", reception.destination, "");
    setText(page, "modelPreviewBeReceptionDate", reception.date || meta.date || "", "");
    setText(page, "modelPreviewBeReceptionTime", reception.time, "");
    setText(page, "modelPreviewBeSourceRef", reception.sourceRef, "");
    setText(page, "modelPreviewBeTransporter", reception.transporter, "");
    setText(page, "modelPreviewBeDriverName", reception.driverName, "");
    setText(page, "modelPreviewBeVehiclePlate", reception.vehiclePlate, "");
    Object.entries(beRows).forEach(([key, node]) => setNodeVisibility(node, isBe && visibility[key] !== false));
    Object.entries(beTransportRows).forEach(([key, node]) => setNodeVisibility(node, isBe && visibility[key] !== false));
    const beTransportSection = page.querySelector("#modelPreviewBeTransportSection");
    const hasBeTransport = isBe && Object.keys(beTransportRows).some((key) => visibility[key] !== false);
    const hasBeContext =
      isBe &&
      (Object.keys(beRows).some((key) => visibility[key] !== false) || hasBeTransport);
    setNodeVisibility(beTransportSection, hasBeTransport);
    setNodeVisibility(beContext, hasBeContext);

    const remarksNode = page.querySelector("#modelPreviewBeRemarks");
    const remarksRaw = pdfOptions.beRemarks ?? meta?.beRemarks ?? "";
    const remarksHtml = normalizeRichText(remarksRaw);
    setHtml(page, "modelPreviewBeRemarks", remarksHtml, "");
    const remarksSection = remarksNode?.closest("fieldset");
    const showRemarks = isBe && hasText(stripHtmlText(remarksHtml));
    setNodeVisibility(remarksSection, showRemarks);

    setApprovalName(
      page,
      "modelPreviewBeReceivedBy",
      pdfOptions.beReceivedByName ?? pdfOptions.receivedByName ?? meta?.beReceivedByName
    );
    setApprovalName(
      page,
      "modelPreviewBeControlledBy",
      pdfOptions.beControlledByName ?? pdfOptions.controlledByName ?? meta?.beControlledByName
    );
    setApprovalName(
      page,
      "modelPreviewBeValidatedBy",
      pdfOptions.beValidatedByName ?? pdfOptions.validatedByName ?? meta?.beValidatedByName
    );

    const approvalBlocks = {
      receivedBy: page.querySelector("#modelPreviewBeReceivedByBlock"),
      controlledBy: page.querySelector("#modelPreviewBeControlledByBlock"),
      validatedBy: page.querySelector("#modelPreviewBeValidatedByBlock")
    };
    const approvalVisibility = {
      receivedBy: pdfOptions.showBeReceivedBy !== false,
      controlledBy: pdfOptions.showBeControlledBy !== false,
      validatedBy: pdfOptions.showBeValidatedBy !== false
    };
    Object.entries(approvalBlocks).forEach(([key, node]) => {
      setNodeVisibility(node, isBe && approvalVisibility[key] !== false);
    });
    const approvalsContainer = page.querySelector("#modelPreviewBeApprovals");
    const visibleCount = isBe
      ? Object.values(approvalVisibility).filter((visible) => visible !== false).length
      : 0;
    if (approvalsContainer) {
      if (visibleCount > 0) approvalsContainer.dataset.visibleCount = String(visibleCount);
      else delete approvalsContainer.dataset.visibleCount;
    }
    setNodeVisibility(approvalsContainer, visibleCount > 0);
    setNodeVisibility(beBottom, isBe && (showRemarks || visibleCount > 0));
  }

  function applyBonSortieSections(page, state, visibility, docType, pdfOptions) {
    const isBs = docType === "bs";
    const meta = state?.meta || {};
    const sortie = resolveBonSortieContext(meta);
    setText(page, "modelPreviewBsDepot", sortie.depot, "");
    setText(page, "modelPreviewBsLocation", sortie.location, "");
    setText(page, "modelPreviewBsSortieDate", sortie.date || meta.date || "", "");
    setText(page, "modelPreviewBsSortieTime", sortie.time, "");
    setText(page, "modelPreviewBsSourceRef", sortie.sourceRef, "");
    setText(page, "modelPreviewBsTransporter", sortie.transporter, "");
    setText(page, "modelPreviewBsDriverName", sortie.driverName, "");
    setText(page, "modelPreviewBsVehiclePlate", sortie.vehiclePlate, "");
    setText(page, "modelPreviewBsTransportMode", sortie.transportMode, "");
    setText(page, "modelPreviewBsExitReason", sortie.exitReason, "");

    const bsRows = {
      bsDepot: page.querySelector("#modelPreviewBsDepotRow"),
      bsLocation: page.querySelector("#modelPreviewBsLocationRow"),
      bsSortieDate: page.querySelector("#modelPreviewBsSortieDateRow"),
      bsSortieTime: page.querySelector("#modelPreviewBsSortieTimeRow"),
      bsSourceRef: page.querySelector("#modelPreviewBsSourceRefRow"),
      bsTransporter: page.querySelector("#modelPreviewBsTransporterRow"),
      bsDriverName: page.querySelector("#modelPreviewBsDriverNameRow"),
      bsVehiclePlate: page.querySelector("#modelPreviewBsVehiclePlateRow"),
      bsTransportMode: page.querySelector("#modelPreviewBsTransportModeRow"),
      bsExitReason: page.querySelector("#modelPreviewBsExitReasonRow")
    };
    Object.entries(bsRows).forEach(([key, node]) => setNodeVisibility(node, isBs && visibility[key] !== false));
    const bsContext = page.querySelector("#modelPreviewBsContext");
    const bsTransportSection = page.querySelector("#modelPreviewBsTransportSection");
    const hasTransport =
      isBs &&
      ["bsTransporter", "bsDriverName", "bsVehiclePlate", "bsTransportMode", "bsExitReason"].some(
        (key) => visibility[key] !== false
      );
    const hasContext = isBs && Object.keys(bsRows).some((key) => visibility[key] !== false);
    setNodeVisibility(bsTransportSection, hasTransport);
    setNodeVisibility(bsContext, hasContext);

    const remarksNode = page.querySelector("#modelPreviewBsRemarks");
    const remarksRaw = pdfOptions.bsRemarks ?? meta?.bsRemarks ?? "";
    const remarksHtml = normalizeRichText(remarksRaw);
    setHtml(page, "modelPreviewBsRemarks", remarksHtml, "");
    const remarksSection = remarksNode?.closest("fieldset");
    const showRemarks = isBs && hasText(stripHtmlText(remarksHtml));
    setNodeVisibility(remarksSection, showRemarks);

    setApprovalName(
      page,
      "modelPreviewBsIssuedBy",
      pdfOptions.bsIssuedByName ?? pdfOptions.issuedByName ?? meta?.bsIssuedByName
    );
    setApprovalName(
      page,
      "modelPreviewBsCheckedBy",
      pdfOptions.bsCheckedByName ?? pdfOptions.checkedByName ?? meta?.bsCheckedByName
    );
    setApprovalName(
      page,
      "modelPreviewBsValidatedBy",
      pdfOptions.bsValidatedByName ?? pdfOptions.validatedByName ?? meta?.bsValidatedByName
    );
    const approvalBlocks = {
      issuedBy: page.querySelector("#modelPreviewBsIssuedByBlock"),
      checkedBy: page.querySelector("#modelPreviewBsCheckedByBlock"),
      validatedBy: page.querySelector("#modelPreviewBsValidatedByBlock")
    };
    const approvalVisibility = {
      issuedBy: pdfOptions.showBsIssuedBy !== false,
      checkedBy: pdfOptions.showBsCheckedBy !== false,
      validatedBy: pdfOptions.showBsValidatedBy !== false
    };
    Object.entries(approvalBlocks).forEach(([key, node]) =>
      setNodeVisibility(node, isBs && approvalVisibility[key] !== false)
    );
    const approvalsContainer = page.querySelector("#modelPreviewBsApprovals");
    const visibleCount = isBs
      ? Object.values(approvalVisibility).filter((visible) => visible !== false).length
      : 0;
    if (approvalsContainer) {
      if (visibleCount > 0) approvalsContainer.dataset.visibleCount = String(visibleCount);
      else delete approvalsContainer.dataset.visibleCount;
    }
    setNodeVisibility(approvalsContainer, visibleCount > 0);
    const bsBottom = page.querySelector("#modelPreviewBsBottom");
    setNodeVisibility(bsBottom, isBs && (showRemarks || visibleCount > 0));
  }

  function wordsFR(value) {
    if (typeof global.n2words === "function") {
      try {
        return global.n2words(value, { lang: "fr" });
      } catch {}
    }
    const UNITS = ["zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    if (value < UNITS.length) return UNITS[value];
    return String(value);
  }

  function amountInWords(amount, currencyCode) {
    const cfg = CURRENCY_WORDS[String(currencyCode || "DT").toUpperCase()] || CURRENCY_WORDS.DT;
    const rounded = Math.round((toFiniteNumber(amount, 0) + 1e-9) * cfg.minorFactor) / cfg.minorFactor;
    let major = Math.floor(rounded + 1e-9);
    let minor = Math.round((rounded - major) * cfg.minorFactor);
    if (minor === cfg.minorFactor) {
      major += 1;
      minor = 0;
    }
    const majorPart = `${wordsFR(major)} ${cfg.major}`;
    const minorPart = minor ? ` et ${wordsFR(minor)} ${cfg.minor}` : "";
    const full = `${majorPart}${minorPart}`.trim();
    return full ? full.charAt(0).toUpperCase() + full.slice(1) : "";
  }

  const AMOUNT_WORDS_PHRASES = {
    devis: "Arr\u00eat\u00e9 le pr\u00e9sent devis \u00e0 la somme de :",
    facture: "Arr\u00eat\u00e9e la pr\u00e9sente facture \u00e0 la somme de :",
    fa: "Arr\u00eat\u00e9e la pr\u00e9sente facture d'achat \u00e0 la somme de :",
    avoir: "Arr\u00eat\u00e9e la pr\u00e9sente facture d'avoir \u00e0 la somme de :",
    bl: "Arr\u00eat\u00e9 le pr\u00e9sent bon de livraison \u00e0 la somme de :"
  };

  function resolveAmountWordsContent(docType, totals, currency, pdfOptions = {}) {
    const normalizedDocType = normalizeDocType(docType);
    const phrase = AMOUNT_WORDS_PHRASES[normalizedDocType] || "";
    const wordsAllowed = !!phrase;
    const totalHt = toFiniteNumber(totals?.totalHT, 0);
    const totalTtc = toFiniteNumber(totals?.totalTTC ?? totals?.grand, totalHt);
    const showTtc = Math.abs(totalTtc - totalHt) > 1e-9;
    const financing = totals?.financing && typeof totals.financing === "object" ? totals.financing : {};
    const netToPay = toFiniteNumber(financing?.netToPay, NaN);
    const hasNetToPay =
      (financing?.subventionEnabled || financing?.bankEnabled) && Number.isFinite(netToPay);
    const target = hasNetToPay ? netToPay : (showTtc ? totalTtc : totalHt);
    return {
      visible: pdfOptions.showAmountWords !== false && wordsAllowed,
      phrase,
      words: amountInWords(target, currency)
    };
  }

  function buildInvoiceTaxSummary(totals, currency, taxesEnabled) {
    const extras = totals?.extras && typeof totals.extras === "object" ? totals.extras : {};
    if (!taxesEnabled) {
      return {
        rowsHtml: "",
        totalAmount: 0,
        hasAnyRow: false
      };
    }

    const tvaRows = Array.isArray(totals?.tvaBreakdown) ? totals.tvaBreakdown : [];
    const fodecLabel = String(extras?.fodecLabel || "FODEC").trim() || "FODEC";
    const baseFodecRows = Array.isArray(extras?.fodecBreakdown) ? extras.fodecBreakdown : [];
    const normalizedFodecRows = [];
    const fodecTvaRows = [];
    const fallbackFodecRate = toFiniteNumber(extras?.fodecRate, NaN);
    const fallbackFodecTvaRate = toFiniteNumber(
      extras?.fodecTva ?? extras?.fodecTVA ?? extras?.fodecRate,
      NaN
    );
    const fallbackFodecAmount = toFiniteNumber(extras?.fodecHT, NaN);
    const fallbackFodecTvaAmount = toFiniteNumber(extras?.fodecTVA, NaN);
    const extrasFodecBase = toFiniteNumber(extras?.fodecBase, NaN);
    const fallbackFodecBase =
      Number.isFinite(extrasFodecBase)
        ? extrasFodecBase
        : (Number.isFinite(fallbackFodecRate) && Math.abs(fallbackFodecRate) > 1e-9
            ? fallbackFodecAmount / (fallbackFodecRate / 100)
            : NaN);

    baseFodecRows.forEach((row) => {
      const base = toFiniteNumber(row?.base ?? row?.ht, NaN);
      const fodecAmount = toFiniteNumber(row?.fodec ?? row?.amount, 0);
      const fodecTvaAmount = toFiniteNumber(row?.fodecTva ?? row?.tva, 0);
      const rate = toFiniteNumber(row?.rate ?? extras?.fodecRate, 0);
      const fodecTvaRate = toFiniteNumber(
        row?.tvaRate ?? row?.fodecTvaRate ?? extras?.fodecTva ?? extras?.fodecTVA,
        0
      );
      if (!Number.isFinite(base) && !Number.isFinite(fodecAmount)) return;
      normalizedFodecRows.push({
        rate,
        base: Number.isFinite(base) ? base : 0,
        fodecAmount,
        fodecTvaAmount,
        fodecTvaRate
      });
      if (Math.abs(fodecTvaAmount) > 1e-9) {
        fodecTvaRows.push({
          rate: Number.isFinite(fodecTvaRate) ? fodecTvaRate : 0,
          base: fodecAmount,
          amount: fodecTvaAmount
        });
      }
    });

    if (
      extras?.fodecEnabled &&
      !normalizedFodecRows.length &&
      Number.isFinite(fallbackFodecAmount) &&
      Math.abs(fallbackFodecAmount) > 1e-9
    ) {
      normalizedFodecRows.push({
        rate: Number.isFinite(fallbackFodecRate) ? fallbackFodecRate : 0,
        base: Number.isFinite(fallbackFodecBase) ? fallbackFodecBase : 0,
        fodecAmount: fallbackFodecAmount,
        fodecTvaAmount: Number.isFinite(fallbackFodecTvaAmount) ? fallbackFodecTvaAmount : 0,
        fodecTvaRate: Number.isFinite(fallbackFodecTvaRate) ? fallbackFodecTvaRate : 0
      });
      if (Number.isFinite(fallbackFodecTvaAmount) && Math.abs(fallbackFodecTvaAmount) > 1e-9) {
        fodecTvaRows.push({
          rate: Number.isFinite(fallbackFodecTvaRate) ? fallbackFodecTvaRate : 0,
          base: fallbackFodecAmount,
          amount: fallbackFodecTvaAmount
        });
      }
    }

    const aggregatedFodecRows = (() => {
      const map = new Map();
      normalizedFodecRows.forEach((row) => {
        const rate = toFiniteNumber(row?.rate, 0);
        const key = rate.toFixed(3);
        const entry = map.get(key) || { rate, base: 0, amount: 0 };
        entry.base += toFiniteNumber(row?.base, 0);
        entry.amount += toFiniteNumber(row?.fodecAmount, 0);
        map.set(key, entry);
      });
      return Array.from(map.values())
        .filter((row) => Math.abs(row.amount) > 1e-9 && row.rate > 0)
        .sort((a, b) => a.rate - b.rate);
    })();

    const aggregatedTvaRows = (() => {
      const map = new Map();
      [...tvaRows, ...fodecTvaRows].forEach((row) => {
        const rate = toFiniteNumber(row?.rate, 0);
        const key = rate.toFixed(3);
        const entry = map.get(key) || { rate, base: 0, amount: 0 };
        entry.base += toFiniteNumber(row?.base ?? row?.ht, 0);
        entry.amount += toFiniteNumber(row?.tva ?? row?.amount, 0);
        map.set(key, entry);
      });
      return Array.from(map.values())
        .filter((row) => Math.abs(row.amount) > 1e-9 && row.rate > 0)
        .sort((a, b) => a.rate - b.rate);
    })();

    let totalAmount = 0;
    const rowHtml = [];
    aggregatedFodecRows.forEach((row) => {
      totalAmount += toFiniteNumber(row.amount, 0);
      rowHtml.push(`
        <tr class="doc-design1__tva-fodec">
          <td>${esc(`${fodecLabel} ${fmtPct(row.rate)}%`)}</td>
          <td class="right">${fmtMoney(row.base, currency)}</td>
          <td class="right">${fmtMoney(row.amount, currency)}</td>
        </tr>`);
    });
    aggregatedTvaRows.forEach((row) => {
      totalAmount += toFiniteNumber(row.amount, 0);
      rowHtml.push(`
        <tr>
          <td>${esc(`TVA ${fmtPct(row.rate)}%`)}</td>
          <td class="right">${fmtMoney(row.base, currency)}</td>
          <td class="right">${fmtMoney(row.amount, currency)}</td>
        </tr>`);
    });

    return {
      rowsHtml: rowHtml.join(""),
      totalAmount,
      hasAnyRow: rowHtml.length > 0
    };
  }

  function applyInvoiceSummaryAndFooter(page, state, docType, totals, currency, taxesEnabled, pdfOptions) {
    const isStock = MODEL_DOC_TYPE_STOCK_VALUES.has(docType);
    const summary = page.querySelector("#modelPreviewInvoiceSummary");
    const footer = page.querySelector("#modelPreviewInvoiceFooter");
    setNodeVisibility(summary, !isStock);
    setNodeVisibility(footer, !isStock);
    if (isStock) return;

    const extras = totals?.extras && typeof totals.extras === "object" ? totals.extras : {};
    const metaExtras = state?.meta?.extras && typeof state.meta.extras === "object" ? state.meta.extras : {};
    const isPurchaseDoc = MODEL_DOC_TYPE_PURCHASE_VALUES.has(docType);
    const taxSummary = buildInvoiceTaxSummary(totals, currency, taxesEnabled);

    const tvaPanel = page.querySelector("[data-tax-panel]");
    setNodeVisibility(tvaPanel, taxesEnabled);
    const tvaBody = page.querySelector(".doc-design1__tva-table tbody");
    if (tvaBody) {
      if (!taxesEnabled) {
        tvaBody.innerHTML = "";
      } else {
        const rows = taxSummary.hasAnyRow
          ? taxSummary.rowsHtml
          : `
            <tr>
              <td>TVA 0%</td>
              <td class="right">${fmtMoney(0, currency)}</td>
              <td class="right">${fmtMoney(0, currency)}</td>
            </tr>`;
        tvaBody.innerHTML = `
          ${rows}
          <tr class="doc-design1__tva-total">
            <th colspan="2">Total</th>
            <th class="right">${fmtMoney(taxSummary.totalAmount, currency)}</th>
          </tr>
        `;
      }
    }

    const amountWordsNode = page.querySelector(".doc-design1__amount-words");
    const amountWords = resolveAmountWordsContent(docType, totals, currency, pdfOptions);
    setNodeVisibility(amountWordsNode, amountWords.visible);
    if (amountWordsNode && amountWords.visible) {
      amountWordsNode.innerHTML = `${amountWords.phrase}<br/><strong>${esc(amountWords.words)}</strong>`;
    }

    const noteNode = page.querySelector("#modelPreviewNote");
    const noteHtml = normalizeRichText(state?.meta?.withholding?.note || state?.notes || "");
    setHtml(page, "modelPreviewNote", noteHtml, "");
    setNodeVisibility(noteNode, hasText(stripHtmlText(noteHtml)));

    const footerNoteNode = page.querySelector("#modelPreviewFooterNote");
    const footerNoteHtml = normalizeRichText(pdfOptions.footerNote || "");
    setHtml(page, "modelPreviewFooterNote", footerNoteHtml, "");
    setNodeVisibility(footerNoteNode, hasText(stripHtmlText(footerNoteHtml)));

    const setMiniSummaryRow = (rowKey, { visible = true, label = "", value = "" } = {}) => {
      const row = page.querySelector(`[data-mini-key="${rowKey}"]`);
      if (!row) return;
      setNodeVisibility(row, visible);
      if (!visible) return;
      const cells = Array.from(row.querySelectorAll("th, td"));
      const labelCell = cells[0] || null;
      const valueCell = cells[1] || null;
      if (labelCell && hasText(label)) labelCell.textContent = label;
      if (valueCell && hasText(value)) valueCell.innerHTML = value;
    };
    const shippingEnabled = !!metaExtras?.shipping?.enabled;
    const dossierEnabled = !!metaExtras?.dossier?.enabled;
    const deplacementEnabled = !!metaExtras?.deplacement?.enabled;
    const stampEnabled = taxesEnabled && !!metaExtras?.stamp?.enabled;

    setMiniSummaryRow("shipping", {
      visible: shippingEnabled,
      label: String(metaExtras?.shipping?.label || "Frais de livraison"),
      value: fmtMoney(extras?.shipHT, currency)
    });
    setMiniSummaryRow("dossier", {
      visible: dossierEnabled,
      label: String(metaExtras?.dossier?.label || "Frais du dossier"),
      value: fmtMoney(extras?.dossierHT, currency)
    });
    setMiniSummaryRow("deplacement", {
      visible: deplacementEnabled,
      label: String(metaExtras?.deplacement?.label || "Frais de deplacement"),
      value: fmtMoney(extras?.deplacementHT, currency)
    });
    setMiniSummaryRow("stamp", {
      visible: stampEnabled,
      label: String(metaExtras?.stamp?.label || "Timbre fiscal"),
      value: fmtMoney(extras?.stampTT ?? extras?.stampHT, currency)
    });
    setMiniSummaryRow("taxes", {
      visible: taxesEnabled,
      label: "Total Taxes",
      value: fmtMoney(taxSummary.totalAmount, currency)
    });
    setMiniSummaryRow("total-ht", {
      visible: !isPurchaseDoc,
      label: "Total HT",
      value: fmtMoney(totals?.totalHT, currency)
    });
    setMiniSummaryRow("total-purchase-ht", {
      visible: isPurchaseDoc,
      label: "Total A. HT",
      value: fmtMoney(totals?.totalHT, currency)
    });
    setMiniSummaryRow("total-purchase-ttc", {
      visible: isPurchaseDoc && taxesEnabled,
      label: "Total A. TTC",
      value: fmtMoney(totals?.totalTTC ?? totals?.grand, currency)
    });
    setMiniSummaryRow("total-ttc", {
      visible: !isPurchaseDoc && taxesEnabled,
      label: "Total TTC",
      value: fmtMoney(totals?.totalTTC ?? totals?.grand, currency)
    });
  }

  function applySignatureAndSeal(page, state, docType, pdfOptions) {
    const isStock = MODEL_DOC_TYPE_STOCK_VALUES.has(docType);
    const company = state?.company && typeof state.company === "object" ? state.company : {};
    const showSeal = pdfOptions.showSeal !== false && !isStock;
    const showSignature = pdfOptions.showSignature !== false && !isStock;
    const sealOverlay = page.querySelector("#modelPreviewSealOverlay");
    const sealImg = page.querySelector("#modelPreviewSealImg");
    if (sealOverlay && sealImg) {
      const sealSrc = String(company?.seal?.image || "").trim();
      if (showSeal && sealSrc) {
        sealImg.src = sealSrc;
        setNodeVisibility(sealOverlay, true);
      } else {
        sealImg.removeAttribute("src");
        setNodeVisibility(sealOverlay, false);
      }
    }
    const signatureOverlay = page.querySelector("#modelPreviewSignatureOverlay");
    const signatureImg = page.querySelector("#modelPreviewSignatureImg");
    if (signatureOverlay && signatureImg) {
      const signatureSrc = String(company?.signature?.image || "").trim();
      if (showSignature && signatureSrc) {
        signatureImg.src = signatureSrc;
        setNodeVisibility(signatureOverlay, true);
      } else {
        signatureImg.removeAttribute("src");
        setNodeVisibility(signatureOverlay, false);
      }
    }
  }

  function cloneTemplatePreviewPage(templateKey) {
    const candidateIds = [`modelTemplateSource-${templateKey}`, "modelTemplateSource-template1"];
    for (const id of candidateIds) {
      const tpl = document.getElementById(id);
      if (!tpl) continue;
      const fragment = tpl.content ? tpl.content.cloneNode(true) : null;
      if (!fragment) continue;
      const preview = fragment.querySelector("#modelActionsPreview");
      if (preview) return preview.cloneNode(true);
    }
    return null;
  }

  function createFallbackPreviewPage() {
    const node = document.createElement("div");
    node.className = "doc-design1 model-actions-layout__preview-page";
    node.innerHTML = `
      <div class="doc-design1__head">
        <div class="doc-design1__logo-wrap"><img id="modelPreviewLogo" class="doc-design1__logo" alt="Logo"></div>
        <div class="doc-design1__head-right">
          <h1 class="doc-design1__title" id="modelPreviewDoc">Facture</h1>
          <p class="doc-design1__date"><span class="doc-design1__head-label">Date :</span><span id="modelPreviewDate"></span></p>
          <p class="doc-design1__number"><span class="doc-design1__head-label">N&deg; :</span><span id="modelPreviewNumber"></span></p>
        </div>
      </div>
      <div class="doc-design1__divider"></div>
      <div class="doc-design1__grid"></div>
      <div class="doc-design1__table-wrap">
        <table class="doc-design1__table">
          <thead><tr></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    return node;
  }

  function buildTemplateBoundPage(state, assets) {
    const st = state && typeof state === "object" ? state : {};
    const meta = st?.meta && typeof st.meta === "object" ? st.meta : {};
    const templateKey = resolveTemplateKey(st);
    const page = cloneTemplatePreviewPage(templateKey) || createFallbackPreviewPage();
    page.classList.add("pdf-model-preview-page");
    page.removeAttribute("id");
    const docType = normalizeDocType(meta?.docType || "facture");
    page.dataset.previewDocType = docType;
    page.classList.toggle("doc-design1--be", docType === "be");
    page.classList.toggle("doc-design1--bs", docType === "bs");
    const headerColor = String(meta?.itemsHeaderColor || "").trim() || "#15335e";
    page.style.setProperty("--items-head-bg", headerColor);

    const strictPreview = meta?.__pdfPreviewStrict === true;
    const visibility = resolveColumnVisibilityMap(st, { strictPreview });
    const labels = resolveArticleLabels(st, { strictPreview });
    const totals = resolveTotals(st);
    const currency = String(totals?.currency || meta?.currency || "DT").toUpperCase();
    const taxesEnabled = meta?.taxesEnabled !== false;
    const pdfOptions = meta?.extras?.pdf && typeof meta.extras.pdf === "object" ? meta.extras.pdf : {};

    applyHeader(page, st, assets || {}, docType);
    applyCompanyAndParty(page, st, docType);
    applyConvertedSourcesLine(page, st, docType);
    applyTable(page, st, visibility, labels, docType, currency, taxesEnabled);
    applyBonEntreeSections(page, st, visibility, docType, pdfOptions);
    applyBonSortieSections(page, st, visibility, docType, pdfOptions);
    applyInvoiceSummaryAndFooter(page, st, docType, totals, currency, taxesEnabled, pdfOptions);
    applySignatureAndSeal(page, st, docType, pdfOptions);
    return { page, templateKey };
  }

  function buildBundle(state, assets) {
    ensureCssReady();
    const { page, templateKey } = buildTemplateBoundPage(state, assets);
    const shell = document.createElement("div");
    shell.className = "pdf-model-template";
    const previewWrap = document.createElement("div");
    previewWrap.className = "model-actions-layout__preview";
    previewWrap.dataset.templateKey = templateKey;
    const previewScroll = document.createElement("div");
    previewScroll.className = "model-actions-layout__preview-scroll";
    const previewStage = document.createElement("div");
    previewStage.className = "model-actions-layout__preview-stage";
    previewStage.appendChild(page);
    previewScroll.appendChild(previewStage);
    previewWrap.appendChild(previewScroll);
    shell.appendChild(previewWrap);
    return {
      html: shell.outerHTML,
      css: getCombinedCssText(templateKey),
      templateKey
    };
  }

  function build(state, assets) {
    return buildBundle(state, assets).html;
  }

  function render(state, assets, options = {}) {
    ensureCssReady();
    const root = options?.root || document.getElementById("pdfRoot");
    if (!root) return;
    const bundle = buildBundle(state, assets);
    root.innerHTML = bundle.html;
    return bundle;
  }

  function show(state, assets, options = {}) {
    render(state, assets, options);
    document.body.classList.add("printing");
  }

  function hide(options = {}) {
    document.body.classList.remove("printing");
    cleanup(options);
  }

  function cleanup(options = {}) {
    const root = options?.root || document.getElementById("pdfRoot");
    if (root) root.innerHTML = "";
  }

  const PDFModelViewAPI = {
    buildBundle,
    build,
    render,
    show,
    hide,
    cleanup,
    ready: waitForCssReady,
    getCssForState(state) {
      return getCombinedCssText(resolveTemplateKey(state));
    },
    getCssForTemplate(templateKey) {
      return getCombinedCssText(templateKey);
    }
  };

  Object.defineProperty(PDFModelViewAPI, "css", {
    enumerable: true,
    get() {
      return getCombinedCssText("template1");
    }
  });

  global.PDFModelView = PDFModelViewAPI;
})(window);
