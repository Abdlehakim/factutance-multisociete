/// pdfView.js
(function (global) {
  const PDF_CSS_HREF = "./styles/pdf-view.css";
  const PDF_CSS_LINK_ID = "pdf-view-css";
  const electronAssets = global?.electronAPI?.assets || {};
  let pdfCssText = typeof electronAssets.pdfCss === "string" ? electronAssets.pdfCss : "";
  let cssFetchStarted = false;
  let stableRenderToken = 0;

  function ensurePdfStylesheet() {
    let link = document.getElementById(PDF_CSS_LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = PDF_CSS_LINK_ID;
      link.rel = "stylesheet";
      link.href = PDF_CSS_HREF;
      document.head.appendChild(link);
    }
    if (!link.dataset.pdfViewCss) {
      link.dataset.pdfViewCss = "ready";
      link.addEventListener("load", captureCssFromStylesheet);
      link.addEventListener("error", requestCssTextFallback);
    }
  }

  function captureCssFromStylesheet() {
    if (pdfCssText) return;
    try {
      const sheets = Array.from(document.styleSheets || []);
      const sheet = sheets.find((s) => s.ownerNode && s.ownerNode.id === PDF_CSS_LINK_ID);
      if (!sheet || !sheet.cssRules) return;
      pdfCssText = Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
    } catch {
      requestCssTextFallback();
    }
  }

  function requestCssTextFallback() {
    if (pdfCssText || cssFetchStarted || typeof fetch !== "function") return;
    cssFetchStarted = true;
    fetch(PDF_CSS_HREF)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => { if (text) pdfCssText = text; })
      .catch(() => {});
  }

  function ensurePdfCssReady() {
    ensurePdfStylesheet();
    if (pdfCssText) return;
    if (document.readyState === "complete" || document.readyState === "interactive") {
      captureCssFromStylesheet();
    } else {
      document.addEventListener("DOMContentLoaded", captureCssFromStylesheet, { once: true });
    }
    requestCssTextFallback();
  }

  function waitForPdfCssReady() {
    if (typeof document === "undefined") return Promise.resolve();
    const link = document.getElementById(PDF_CSS_LINK_ID);
    if (!link || link.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
    });
  }

  function waitForFontsReady() {
    if (typeof document === "undefined" || !document.fonts || !document.fonts.ready) {
      return Promise.resolve();
    }
    return document.fonts.ready.catch(() => {});
  }

  function waitForNextFrame() {
    if (typeof requestAnimationFrame !== "function") return Promise.resolve();
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function scheduleStableRender(state, assets, options = {}) {
    if (typeof document === "undefined") return;
    const token = ++stableRenderToken;
    const targetRoot = options?.root && options.root.nodeType === 1 ? options.root : null;
    Promise.all([waitForPdfCssReady(), waitForFontsReady(), waitForNextFrame()]).then(() => {
      if (token !== stableRenderToken) return;
      if (targetRoot && !document.contains(targetRoot)) return;
      render(state, assets, { stable: true, root: targetRoot });
    }).catch(() => {});
  }

  ensurePdfCssReady();

  const DEFAULT_ITEMS_HEADER_COLOR = "#15335e";
  const DEFAULT_TEMPLATE_KEY = "template1";
  const normalizeHexColor = (value) => {
    if (value === undefined || value === null) return "";
    const str = String(value).trim();
    if (!str) return "";
    const hex = str.startsWith("#") ? str.slice(1) : str;
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex
        .split("")
        .map((c) => `${c}${c}`)
        .join("")
        .toLowerCase()}`;
    }
    return "";
  };
  const resolveItemsHeaderColor = (meta = {}) => {
    const baseColor = normalizeHexColor(meta.itemsHeaderColor);
    return baseColor || DEFAULT_ITEMS_HEADER_COLOR;
  };
  const normalizeTemplateKey = (value) => {
    const normalized = String(value || "").trim();
    return normalized || DEFAULT_TEMPLATE_KEY;
  };
  const resolveTemplateKey = (state = {}) => {
    const metaTemplate = state?.meta?.template;
    const directTemplate = state?.template;
    return normalizeTemplateKey(metaTemplate || directTemplate || DEFAULT_TEMPLATE_KEY);
  };

  const MIN_SEAL_SIZE_MM = 30;
  const DEFAULT_SEAL_SIZE_MM = 40;
  const CURRENCY_WORDS = {
    DT:  { major: "dinars", minor: "millimes", minorFactor: 1000 },
    EUR: { major: "euros",  minor: "centimes", minorFactor: 100  },
    USD: { major: "dollars",minor: "cents",    minorFactor: 100  },
  };

  const esc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const ARTICLE_FIELD_LABELS_DEFAULTS = {
    ref: "R&eacute;f.",
    product: "D&eacute;signation",
    desc: "Description",
    qty: "Qt&eacute;",
    unit: "Unit&eacute;",
    stockQty: "Stock disponible",
    purchasePrice: "PU A. HT",
    purchaseTva: "TVA A.",
    purchaseDiscount: "Remise A.",
    price: "P.U. HT",
    tva: "TVA %",
    discount: "Remise %",
    fodec: "FODEC V.",
    fodecSale: "FODEC V.",
    fodecPurchase: "FODEC A.",
    fodecRate: "Taux %",
    fodecTva: "TVA %",
    fodecAmount: "FODEC",
    purchaseFodecAmount: "FODEC A.",
    totalPurchaseHt: "Total A. HT",
    totalPurchaseTtc: "Total A. TTC",
    totalHt: "Total HT",
    totalTtc: "Total TTC"
  };
  const resolveArticleFieldLabelDefaults = ({ strictPreview = false } = {}) => {
    const overrides = strictPreview ? {} : (global?.DEFAULT_ARTICLE_FIELD_LABELS || {});
    const resolved = { ...ARTICLE_FIELD_LABELS_DEFAULTS };
    if (overrides && typeof overrides === "object") {
      Object.keys(resolved).forEach((key) => {
        if (typeof overrides[key] === "string") {
          const trimmed = overrides[key].trim();
          if (trimmed) resolved[key] = esc(trimmed);
        }
      });
    }
    return resolved;
  };
  const resolveArticleFieldLabelSource = (state, { strictPreview = false } = {}) => {
    const fromState = state?.meta?.articleFieldLabels;
    if (fromState && typeof fromState === "object") return fromState;
    if (strictPreview) return null;
    const helper = global?.SEM?.__bindingHelpers?.getArticleFieldLabels;
    const labels = typeof helper === "function" ? helper() : null;
    return labels && typeof labels === "object" ? labels : null;
  };

  const hasVal = (v) => (v ?? "").toString().trim().length > 0;
  const hasTextContent = (html = "") => {
    const stripped = String(html)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
    return stripped.length > 0;
  };

  const DEFAULT_REGLEMENT_TEXT = "A r\u00e9ception";
  const parseReglementDaysValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(0, Math.trunc(num));
  };
  const resolveReglementInfo = (meta = {}) => {
    const regMeta = meta.reglement && typeof meta.reglement === "object" ? meta.reglement : {};
    const enabled =
      typeof regMeta.enabled === "boolean"
        ? regMeta.enabled
        : typeof meta.reglementEnabled === "boolean"
          ? meta.reglementEnabled
          : null;
    if (enabled !== true) {
      return { enabled: false, valueText: DEFAULT_REGLEMENT_TEXT };
    }
    const valueTextCandidate =
      typeof regMeta.valueText === "string"
        ? regMeta.valueText
        : typeof regMeta.text === "string"
          ? regMeta.text
          : typeof meta.reglementText === "string"
            ? meta.reglementText
            : typeof meta.reglementValue === "string"
              ? meta.reglementValue
              : "";
    const typeRaw =
      typeof regMeta.type === "string"
        ? regMeta.type
        : typeof meta.reglementType === "string"
          ? meta.reglementType
          : "";
    const normalizedType = String(typeRaw || "reception").trim().toLowerCase() === "days" ? "days" : "reception";
    const daysValue = parseReglementDaysValue(regMeta.days ?? meta.reglementDays);
    if (normalizedType === "days") {
      if (daysValue !== null) {
        return { enabled: true, valueText: `${daysValue} jours` };
      }
      const resolvedText = String(valueTextCandidate || "").trim();
      return { enabled: true, valueText: resolvedText || DEFAULT_REGLEMENT_TEXT };
    }
    return { enabled: true, valueText: DEFAULT_REGLEMENT_TEXT };
  };

  const NBSP = "\u00A0";
  const WH_NOTE_FONT_SIZES = [10, 12, 14];
  const WH_NOTE_DEFAULT_FONT_SIZE = 12;
  const FOOTER_NOTE_FONT_SIZES = [7, 8, 9];
  const FOOTER_NOTE_DEFAULT_FONT_SIZE = 8;
  const normalizeFooterNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return FOOTER_NOTE_DEFAULT_FONT_SIZE;
    return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : FOOTER_NOTE_DEFAULT_FONT_SIZE;
  };
  const normalizeWhNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    const min = Math.min(...WH_NOTE_FONT_SIZES);
    const max = Math.max(...WH_NOTE_FONT_SIZES);
    const clamped = Math.min(Math.max(parsed, min), max);
    return WH_NOTE_FONT_SIZES.includes(clamped) ? clamped : null;
  };
  const buildWhNoteSpan = (size) => `<span data-size="${size}" style="font-size:${size}px">`;
  const ensureWhNoteSizeWrapper = (html = "", size = WH_NOTE_DEFAULT_FONT_SIZE) => {
    const effectiveSize = normalizeWhNoteFontSize(size) ?? WH_NOTE_DEFAULT_FONT_SIZE;
    if (!html) return "";
    if (/data-size="/.test(html)) return html;
    return `<div data-size="${effectiveSize}" data-size-root="true" style="font-size:${effectiveSize}px">${html}</div>`;
  };
  const resolveCurrencyDecimals = (code) => {
    const upper = String(code || "").trim().toUpperCase();
    if (upper === "DT" || upper === "TND") return 3;
    return 2;
  };
  const fmtMoney = (v, c) => {
    const n = Number(v || 0);
    const upperCode = String(c || "").trim().toUpperCase();
    const decimals = resolveCurrencyDecimals(upperCode);
    const fmtOptions = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
    let numberPart;
    try {
      numberPart = new Intl.NumberFormat(undefined, fmtOptions).format(n);
    } catch {
      numberPart = n.toFixed(decimals);
    }
    numberPart = numberPart.replace(/\s/g, NBSP);
    const appendCurrencyRight = (code) => (code ? `${numberPart}${NBSP}${code}` : numberPart);

    // Keep DT (Tunisian dinar) shown after the amount in the PDF view
    if (upperCode === "DT" || upperCode === "TND") {
      const displayCode = upperCode === "TND" ? "TND" : "DT";
      return appendCurrencyRight(displayCode);
    }

    const intlCurrency = upperCode.length === 3 ? upperCode : null;
    try {
      if (intlCurrency) {
        const formatted = new Intl.NumberFormat(undefined, { ...fmtOptions, style: "currency", currency: intlCurrency }).format(n);
        return formatted.replace(/\s/g, NBSP);
      }
    } catch {
    }

    return appendCurrencyRight(upperCode || c);
  };

  const fmtPct = (n) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
      .format(Number(n || 0))
      .replace(/\s/g, "");

  const parseLooseNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value === undefined || value === null) return null;

    const raw = String(value).replace(/\u00A0/g, " ").trim();
    if (!raw) return null;

    const wrappedNegative = /^\(.*\)$/.test(raw);
    const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
    const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
    if (!cleaned || !/[0-9]/.test(cleaned)) return null;

    const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
    const unsigned = cleaned.replace(/[+\-]/g, "");
    if (!unsigned || !/[0-9]/.test(unsigned)) return null;

    const commaCount = (unsigned.match(/,/g) || []).length;
    const dotCount = (unsigned.match(/\./g) || []).length;
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");

    let decimalSep = "";
    if (commaCount > 0 && dotCount > 0) {
      decimalSep = lastComma > lastDot ? "," : ".";
    } else if (commaCount === 1 && dotCount === 0) {
      decimalSep = ",";
    } else if (dotCount === 1 && commaCount === 0) {
      decimalSep = ".";
    }

    let normalized = "";
    if (decimalSep) {
      const sepIndex = unsigned.lastIndexOf(decimalSep);
      const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
      const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
      normalized = fracPart ? `${intPart || "0"}.${fracPart}` : (intPart || "0");
    } else {
      normalized = unsigned.replace(/[.,]/g, "");
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return sign * parsed;
  };

  const toFiniteNumber = (value, fallback = 0) => {
    const numberValue = parseLooseNumber(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  };

  const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

  const clampSealSizeMm = (value) =>
    clampNumber(toFiniteNumber(value, DEFAULT_SEAL_SIZE_MM), MIN_SEAL_SIZE_MM, DEFAULT_SEAL_SIZE_MM);

  const isTaxesEnabled = (raw) => {
    const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
    if (normalized === false) return false;
    if (typeof normalized === "string") {
      return !["without", "sans", "false", "0"].includes(normalized);
    }
    return true;
  };

  const splitContactLines = (text) => {
    if (!hasVal(text)) return [];
    const normalized = String(text).trim();
    if (!normalized) return [];
    const segments = normalized
      .split(/[\r\n,;\/|]+|\s+-\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const safeSegments = (segments.length ? segments : [normalized]).map((segment) => esc(segment));
    return safeSegments;
  };

  const buildMetaLine = (label, value, options = {}) => {
    const { capitalize = false, preserveNewlines = false, allowEmpty = false, raw = false } = options;
    const hasContent = allowEmpty || hasVal(value);
    if (!hasContent) return "";

    const styles = [];
    if (capitalize) styles.push("text-transform:capitalize");
    if (preserveNewlines) styles.push("white-space:pre-line");
    const styleAttr = styles.length ? ` style="${styles.join("; ")}"` : "";

    const labelHTML = `${label}&nbsp;:`;
    const valueHTML = raw ? value : esc(value);

    return `<p class="pdf-small pdf-meta-line"${styleAttr}><span class="pdf-meta-label">${labelHTML}</span><span class="pdf-meta-value">${valueHTML}</span></p>`;
  };

  const buildPhoneHTML = (value, label = "T&eacute;l&eacute;phone") => {
    const segments = splitContactLines(value);
    if (!segments.length) return "";
    const valueHTML = segments.join("<br/>");
    return buildMetaLine(label, valueHTML, { raw: true });
  };

  const buildSealImageHTML = (seal = {}) => {
    if (!seal?.enabled || !hasVal(seal?.image)) return "";
    const widthMm = clampSealSizeMm(seal.maxWidthMm);
    const heightMm = clampSealSizeMm(seal.maxHeightMm);
    const opacity = clampNumber(toFiniteNumber(seal.opacity, 1), 0, 1);
    const rotation = toFiniteNumber(seal.rotateDeg, -2);
    const styleParts = [
      `max-width:${widthMm}mm`,
      `max-height:${heightMm}mm`,
      `opacity:${opacity}`,
      `transform:rotate(${rotation}deg)`
    ];
    return `<img class="pdf-sign-seal" src="${esc(seal.image)}" alt="Cachet de l'entreprise" style="${styleParts.join("; ")}">`;
  };

  const buildSignatureImageHTML = (signature = {}) => {
    if (!signature?.enabled || !hasVal(signature?.image)) return "";
    const widthMm = toFiniteNumber(signature.maxWidthMm, 48);
    const heightMm = toFiniteNumber(signature.maxHeightMm, 22);
    const opacity = clampNumber(toFiniteNumber(signature.opacity, 1), 0, 1);
    const rotation = toFiniteNumber(signature.rotateDeg, 0);
    const styleParts = [
      `max-width:${widthMm > 0 ? widthMm : 48}mm`,
      `max-height:${heightMm > 0 ? heightMm : 22}mm`,
      `opacity:${opacity}`,
      `transform:rotate(${rotation}deg)`
    ];
    return `<img class="pdf-sign-signature-img" src="${esc(signature.image)}" alt="Signature" style="${styleParts.join("; ")}">`;
  };

  const DEFAULT_ROWS_PER_PAGE = 17;
  const TABLE_FIRST_PAGE_MAX_HEIGHT = 1020;
  const TABLE_OTHER_PAGE_MAX_HEIGHT = 900;
  const TABLE_INNER_WIDTH_MM = 210 - (8 * 2);
  const TABLE_HEIGHT_BUFFER = 20;
  const TABLE_ROW_FIT_BUFFER = 8;
  const SUMMARY_SECOND_PAGE_MIN_SPACE = 60;
  const FIRST_PAGE_SUMMARY_THRESHOLD_PX = 400;
  function paginateRows(rowList, size) {
    const rows = Array.isArray(rowList) ? rowList : [];
    const chunkSize = Math.max(1, Number(size) || 1);
    const chunks = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push(rows.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const HEADER_NOWRAP_LABELS = new Set([
    "Qt&eacute;",
    "Unit&eacute;",
    "P.U. HT",
    "Prix unitaire",
    "FODEC",
    "FODEC V.",
    "FODEC A.",
    "TVA %",
    "Remise %",
    "Total HT",
    "Total",
    "Total TTC"
  ]);

  function buildHeaderRowHTML(columns) {
    const cols = Array.isArray(columns) ? columns : [];
    return cols.map(({ label, key, nowrap, id, labelKey }) => {
      const classes = [];
      if (nowrap || HEADER_NOWRAP_LABELS.has(label)) classes.push("no-wrap");
      classes.push(`col-${key}`);
      const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
      const idAttr = id ? ` id="${id}"` : "";
      const labelAttr = labelKey ? ` data-article-field-label="${labelKey}"` : "";
      return `<th data-col="${key}"${labelAttr}${idAttr}${classAttr}>${label}</th>`;
    }).join("");
  }

  function chunkRowsByVisualHeight(rowList, headerHTML, pageLimits = {}) {
    if (!Array.isArray(rowList) || !rowList.length) return [[]];
    if (typeof document === "undefined" || !document.body) return null;
    let wrapper;
    const chunkHeights = [];
    try {
      wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${TABLE_INNER_WIDTH_MM}mm`;
      wrapper.innerHTML = `
        <div class="tableDiv" style="height:auto; max-height:none; overflow:visible; border:0; margin:0; padding:0;">
          <table class="pdf-table" style="width:100%;">
            <thead><tr>${headerHTML}</tr></thead>
            <tbody></tbody>
          </table>
        </div>`;
      document.body.appendChild(wrapper);
      const tbody = wrapper.querySelector("tbody");
      const thead = wrapper.querySelector("thead");
      const headerHeight = thead?.offsetHeight || 0;
      const firstPageMaxHeight = Number.isFinite(pageLimits.firstPageMaxHeight)
        ? pageLimits.firstPageMaxHeight
        : TABLE_FIRST_PAGE_MAX_HEIGHT;
      const otherPageMaxHeight = Number.isFinite(pageLimits.otherPageMaxHeight)
        ? pageLimits.otherPageMaxHeight
        : TABLE_OTHER_PAGE_MAX_HEIGHT;
      const bufferPx = TABLE_ROW_FIT_BUFFER;
      const firstPageLimit = Math.max(
        120,
        firstPageMaxHeight - headerHeight - bufferPx
      );
      const otherPageLimit = Math.max(
        120,
        otherPageMaxHeight - headerHeight - bufferPx
      );

      const chunks = [];
      let current = [];
      let currentHeight = 0;
      let currentLimit = firstPageLimit;

      for (const rowHTML of rowList) {
        tbody.innerHTML = rowHTML;
        const tr = tbody.firstElementChild;
        const rowHeight = tr ? tr.offsetHeight : 0;
        tbody.innerHTML = "";
        if (current.length && currentHeight + rowHeight > currentLimit) {
          chunks.push(current);
          chunkHeights.push(currentHeight);
          current = [];
          currentHeight = 0;
          currentLimit = otherPageLimit;
        }
        current.push(rowHTML);
        currentHeight += rowHeight;
      }
      if (current.length) {
        chunks.push(current);
        chunkHeights.push(currentHeight);
      }
      if (!chunks.length) {
        chunks.push([]);
        chunkHeights.push(0);
      }
      chunks._chunkHeights = chunkHeights;
      chunks._firstPageLimit = firstPageLimit;
      chunks._otherPageLimit = otherPageLimit;
      chunks._headerHeight = headerHeight;
      return chunks;
    } catch (err) {
      console.warn("PDF pagination height fallback", err);
      return null;
    } finally {
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  }

  function measureTablePageMaxHeight(options = {}) {
    if (typeof document === "undefined" || !document.body) return null;
    const {
      topSectionHTML = "",
      bottomSectionHTML = "",
      headerHTML = "",
      pageClasses = "",
      templateKey = DEFAULT_TEMPLATE_KEY,
      pageStyleAttr = ""
    } = options;
    let wrapper;
    try {
      const pageClass = ["pdf-page", pageClasses].filter(Boolean).join(" ");
      wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.innerHTML = `
        <div class="${pageClass}" data-template="${templateKey}"${pageStyleAttr}>
          ${topSectionHTML}
          <div class="tableDiv">
            <table class="pdf-table">
              <thead><tr>${headerHTML}</tr></thead>
              <tbody></tbody>
            </table>
          </div>
          ${bottomSectionHTML}
        </div>`;
      document.body.appendChild(wrapper);
      const tableDiv = wrapper.querySelector(".tableDiv");
      return tableDiv ? tableDiv.offsetHeight : null;
    } catch {
      return null;
    } finally {
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  }

  function createPaginationWrapper(options = {}) {
    if (typeof document === "undefined" || !document.body) return null;
    const {
      topSectionHTML = "",
      bottomSectionHTML = "",
      headerHTML = "",
      pageClasses = "",
      templateKey = DEFAULT_TEMPLATE_KEY,
      pageStyleAttr = "",
      pageAttrs = "",
      tableDivStyle = "",
      tableStyle = "",
      tbodyStyle = ""
    } = options;
    const pageClass = ["pdf-page", pageClasses].filter(Boolean).join(" ");
    const pageAttr = pageAttrs ? ` ${pageAttrs}` : "";
    const tableDivAttr = tableDivStyle ? ` style="${tableDivStyle}"` : "";
    const tableAttr = tableStyle ? ` style="${tableStyle}"` : "";
    const tbodyAttr = tbodyStyle ? ` style="${tbodyStyle}"` : "";
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.visibility = "hidden";
    wrapper.style.pointerEvents = "none";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0";
    wrapper.innerHTML = `
      <div class="${pageClass}" data-template="${templateKey}"${pageAttr}${pageStyleAttr}>
        ${topSectionHTML}
        <div class="tableDiv"${tableDivAttr}>
          <table class="pdf-table"${tableAttr}>
            <thead><tr>${headerHTML}</tr></thead>
            <tbody${tbodyAttr}></tbody>
          </table>
        </div>
        ${bottomSectionHTML}
      </div>`;
    const host = document.getElementById("pdfPreviewContent") || document.body;
    host.appendChild(wrapper);
    const page = wrapper.firstElementChild;
    const tableDiv = page ? page.querySelector(".tableDiv") : null;
    const table = tableDiv ? tableDiv.querySelector("table") : null;
    const thead = table ? table.querySelector("thead") : null;
    const tbody = table ? table.querySelector("tbody") : null;
    return { wrapper, tableDiv, table, thead, tbody };
  }

  function chunkRowsByRenderedHeight(rowList, headerHTML, options = {}) {
    if (!Array.isArray(rowList) || !rowList.length) return [[]];
    if (typeof document === "undefined" || !document.body) return null;
    const bufferPx =
      Number.isFinite(options.bufferPx) && options.bufferPx >= 0
        ? options.bufferPx
        : TABLE_ROW_FIT_BUFFER;
    const measureOverrides = {
      tableDivStyle: "flex:0 0 auto; height:auto; max-height:none; overflow:visible;",
      tableStyle: "height:auto;",
      tbodyStyle: "height:auto;"
    };
    let firstLimitWrap;
    let otherLimitWrap;
    let firstMeasureWrap;
    let otherMeasureWrap;
    try {
      firstLimitWrap = createPaginationWrapper({ ...(options.firstPage || {}), headerHTML });
      otherLimitWrap = createPaginationWrapper({ ...(options.otherPage || {}), headerHTML });
      firstMeasureWrap = createPaginationWrapper({ ...(options.firstPage || {}), headerHTML, ...measureOverrides });
      otherMeasureWrap = createPaginationWrapper({ ...(options.otherPage || {}), headerHTML, ...measureOverrides });
      if (
        !firstLimitWrap?.tableDiv ||
        !otherLimitWrap?.tableDiv ||
        !firstMeasureWrap?.tbody ||
        !otherMeasureWrap?.tbody
      ) {
        return null;
      }
      const chunks = [];
      const chunkHeights = [];
      const measureLimit = (wrap) => {
        const headerHeight = wrap.thead?.offsetHeight || 0;
        const tableHeight = wrap.tableDiv?.offsetHeight || 0;
        return {
          headerHeight,
          limit: Math.max(120, tableHeight - headerHeight - bufferPx)
        };
      };
      const firstLimitInfo = measureLimit(firstLimitWrap);
      const otherLimitInfo = measureLimit(otherLimitWrap);
      let index = 0;
      let isFirst = true;
      while (index < rowList.length) {
        const wrap = isFirst ? firstMeasureWrap : otherMeasureWrap;
        const limitInfo = isFirst ? firstLimitInfo : otherLimitInfo;
        const tbody = wrap.tbody;
        tbody.innerHTML = "";
        let current = [];
        let currentHeight = 0;
        while (index < rowList.length) {
          tbody.insertAdjacentHTML("beforeend", rowList[index]);
          const tr = tbody.lastElementChild;
          if (tr) {
            tr.style.height = "auto";
            tr.querySelectorAll("td, th").forEach((cell) => {
              cell.style.height = "auto";
            });
          }
          const rowHeight = tr ? tr.offsetHeight : 0;
          if (current.length && currentHeight + rowHeight > limitInfo.limit) {
            tbody.removeChild(tr);
            break;
          }
          current.push(rowList[index]);
          currentHeight += rowHeight;
          index += 1;
        }
        if (!current.length && index < rowList.length) {
          current.push(rowList[index]);
          index += 1;
        }
        chunks.push(current);
        chunkHeights.push(currentHeight);
        isFirst = false;
      }
      chunks._chunkHeights = chunkHeights;
      chunks._firstPageLimit = firstLimitInfo.limit;
      chunks._otherPageLimit = otherLimitInfo.limit;
      chunks._headerHeight = firstLimitInfo.headerHeight;
      return chunks;
    } catch {
      return null;
    } finally {
      if (firstLimitWrap?.wrapper?.parentNode) firstLimitWrap.wrapper.parentNode.removeChild(firstLimitWrap.wrapper);
      if (otherLimitWrap?.wrapper?.parentNode) otherLimitWrap.wrapper.parentNode.removeChild(otherLimitWrap.wrapper);
      if (firstMeasureWrap?.wrapper?.parentNode) firstMeasureWrap.wrapper.parentNode.removeChild(firstMeasureWrap.wrapper);
      if (otherMeasureWrap?.wrapper?.parentNode) otherMeasureWrap.wrapper.parentNode.removeChild(otherMeasureWrap.wrapper);
    }
  }

  function measureSummaryHeight(summaryHTML, templateKey) {
    if (!summaryHTML || typeof document === "undefined" || !document.body) return null;
    let wrapper;
    try {
      wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${TABLE_INNER_WIDTH_MM}mm`;
      wrapper.innerHTML = `
        <div class="pdf-page" data-template="${templateKey || DEFAULT_TEMPLATE_KEY}" style="width:${TABLE_INNER_WIDTH_MM}mm;padding:0;height:auto;min-height:0;overflow:visible;box-sizing:border-box;">
          ${summaryHTML}
        </div>`;
      document.body.appendChild(wrapper);
      const page = wrapper.querySelector(".pdf-page");
      return page ? page.offsetHeight : null;
    } catch {
      return null;
    } finally {
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  }

  const normalizeNoteWhitespace = (html = "") =>
    String(html || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\t+/g, " ")
      .replace(/ {2,}/g, " ")
      .replace(/(<br\s*\/?>)\s+/gi, "$1")
      .replace(/\s+(<br\s*\/?>)/gi, "$1");

  function formatNoteHTML(raw) {
    if (!hasVal(raw)) return "";
    let safe = normalizeNoteWhitespace(esc(raw)).replace(/\r\n|\r|\n/g, "<br>");
    safe = safe.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    safe = safe.replace(/&lt;(\/?)(strong|em|ul|ol|li)&gt;/gi, "<$1$2>");
    safe = safe.replace(
      /&lt;(span|div)([\s\S]*?)data-size="(\d{1,3})"([\s\S]*?)&gt;/gi,
      (_match, tag, before, size, after) => {
        const normalized = normalizeWhNoteFontSize(size);
        const hasRoot =
          /data-size-root\s*=\s*"?true"?/i.test(before) || /data-size-root\s*=\s*"?true"?/i.test(after);
        const rootAttr = tag === "div" && hasRoot ? ' data-size-root="true"' : "";
        return normalized ? `<${tag} data-size="${normalized}"${rootAttr} style="font-size:${normalized}px">` : "";
      }
    );
    safe = safe.replace(/&lt;\/(span|div)&gt;/gi, "</$1>");
    safe = normalizeNoteWhitespace(safe);
    safe = ensureWhNoteSizeWrapper(safe, WH_NOTE_DEFAULT_FONT_SIZE);
    return safe;
  }

  function formatFooterNoteHtml(raw) {
    if (!hasVal(raw)) return "";
    if (typeof document === "undefined") {
      let safe = normalizeNoteWhitespace(esc(raw)).replace(/\r\n|\r|\n/g, "<br>");
      safe = safe.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
      safe = safe.replace(/&lt;(\/?)(strong|em|ul|ol|li)&gt;/gi, "<$1$2>");
      safe = safe.replace(
        /&lt;(span|div)([\s\S]*?)data-size="(\d{1,3})"([\s\S]*?)&gt;/gi,
        (_match, tag, before, size, after) => {
          const parsedSize = Number.parseInt(size, 10);
          if (!FOOTER_NOTE_FONT_SIZES.includes(parsedSize)) return tag === "div" ? "<br>" : "";
          const hasRoot =
            /data-size-root\s*=\s*"?true"?/i.test(before) || /data-size-root\s*=\s*"?true"?/i.test(after);
          const rootAttr = tag === "div" && hasRoot ? ' data-size-root="true"' : "";
          return `<${tag} data-size="${parsedSize}"${rootAttr} style="font-size:${parsedSize}px">`;
        }
      );
      safe = safe.replace(/&lt;\/(span|div)&gt;/gi, "</$1>");
      safe = safe.replace(/&lt;(div|p)(?:\s[^>]*)?&gt;/gi, "<br>");
      safe = safe.replace(/&lt;\/(div|p)&gt;/gi, "");
      safe = safe.replace(/(<br>){3,}/g, "<br><br>");
      safe = safe.replace(/^(<br>)+/, "");
      safe = safe.replace(/(<br>)+$/, "");
      return normalizeNoteWhitespace(safe);
    }
    const normalizedHTML = String(raw ?? "")
      .replace(/\r\n|\r/g, "\n")
      .replace(/\n/g, "<br>");
    const container = document.createElement("div");
    container.innerHTML = normalizedHTML || "";
    const allowed = new Set(["strong", "em", "ul", "ol", "li", "br", "span", "div"]);
    const blockTags = new Set(["div", "p", "section", "article", "header", "footer", "blockquote", "pre", "address"]);
    const parts = [];
    const pushBreak = () => {
      if (!parts.length) return;
      if (parts[parts.length - 1] !== "<br>") parts.push("<br>");
    };
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(
          node.textContent
            .replace(/\u00A0/g, " ")
            .replace(/\u200b/g, "")
        );
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      let tag = node.tagName.toLowerCase();
      if (tag === "b") tag = "strong";
      if (tag === "i") tag = "em";
      if (tag === "span" || tag === "div") {
        const sizeRaw = Number.parseInt(node.getAttribute("data-size"), 10);
        const size = FOOTER_NOTE_FONT_SIZES.includes(sizeRaw) ? sizeRaw : null;
        if (!size) {
          const isBlock = blockTags.has(tag);
          if (isBlock) pushBreak();
          node.childNodes.forEach(walk);
          if (isBlock) pushBreak();
          return;
        }
        const isRoot = tag === "div" && node.getAttribute("data-size-root");
        const rootAttr = tag === "div" && isRoot ? ' data-size-root="true"' : "";
        parts.push(`<${tag} data-size="${size}"${rootAttr} style="font-size:${size}px">`);
        node.childNodes.forEach(walk);
        parts.push(`</${tag}>`);
        return;
      }
      if (!allowed.has(tag)) {
        const isBlock = blockTags.has(tag);
        if (isBlock) pushBreak();
        node.childNodes.forEach(walk);
        if (isBlock) pushBreak();
        return;
      }
      if (tag === "br") {
        parts.push("<br>");
        return;
      }
      parts.push(`<${tag}>`);
      node.childNodes.forEach(walk);
      parts.push(`</${tag}>`);
    };
    container.childNodes.forEach(walk);
    let result = parts.join("");
    result = result.replace(/(<br>){3,}/g, "<br><br>");
    result = result.replace(/^(<br>)+/, "");
    result = result.replace(/(<br>)+$/, "");
    return normalizeNoteWhitespace(result);
  }

  function wordsFR(n) {
    if (typeof window !== "undefined" && window.n2words) return window.n2words(n, { lang: "fr" });
    const UNITS = ["zero","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
    const TENS  = ["","dix","vingt","trente","quarante","cinquante","soixante"];
    const two = (x) => {
      if (x < 17) return UNITS[x];
      if (x < 20) return "dix-" + UNITS[x - 10];
      if (x < 70) { const t = Math.floor(x / 10), u = x % 10; if (u === 1 && t !== 8) return TENS[t] + " et un"; return TENS[t] + (u ? "-" + UNITS[u] : ""); }
      if (x < 80) return "soixante-" + two(x - 60);
      const u = x - 80; if (u === 0) return "quatre-vingts"; return "quatre-vingt-" + two(u);
    };
    const hundred = (h, tail) => { if (h === 0) return tail; if (h === 1) return "cent" + (tail ? " " + tail : ""); return ("cent".replace(/^/, UNITS[h] + " ") + (tail ? " " + tail : tail === "" ? "s" : "")); };
    const three = (x) => { const h = Math.floor(x / 100), r = x % 100; const tail = r ? two(r) : ""; if (h >= 2 && r === 0) return UNITS[h] + " cents"; return hundred(h, tail); };
    const chunk = (x, sing, plur) => { if (x === 0) return ""; if (sing === "mille") return x === 1 ? "mille" : two(x) + " mille"; return x === 1 ? "un " + sing : two(x) + " " + plur; };
    if (n === 0) return UNITS[0];
    let s = ""; let g = Math.floor(n / 1e9); n %= 1e9; let m = Math.floor(n / 1e6); n %= 1e6; let k = Math.floor(n / 1e3); n %= 1e3;
    if (g) s += chunk(g, "milliard", "milliards") + " ";
    if (m) s += chunk(m, "million", "millions") + " ";
    if (k) s += chunk(k, "mille", "mille") + " ";
    s += three(n).trim();
    return s.replace(/\s+/g, " ").trim();
  }

  function amountInWords(amount, currencyCode) {
    const cfg = CURRENCY_WORDS[currencyCode] || CURRENCY_WORDS.EUR;
    const rounded = Math.round((amount + 1e-9) * cfg.minorFactor) / cfg.minorFactor;
    let major = Math.floor(rounded + 1e-9);
    let minor = Math.round((rounded - major) * cfg.minorFactor);
    if (minor === cfg.minorFactor) { major += 1; minor = 0; }
    const majorPart = `${wordsFR(major)} ${cfg.major}`;
    const minorPart = minor ? ` et ${wordsFR(minor)} ${cfg.minor}` : "";
    return (majorPart + minorPart).replace(/^./, (c) => c.toUpperCase());
  }

  function getDocType(meta) {
    const m = meta || {};
    let t = (m.type ?? m.docType ?? "").toString().trim().toLowerCase();
    const faAliases = ["fa", "factureachat", "facture-achat", "facture_achat", "facture d'achat", "facture dachat", "facture achat"];
    const blAliases = ["bl", "bon", "bon_livraison", "bon-de-livraison", "bon de livraison", "bon livraison"];
    const bcAliases = ["bc", "bon_commande", "bon-de-commande", "bon de commande", "bon commande", "commande"];
    const beAliases = ["be", "bon_entree", "bon-entree", "bon entree", "bon d'entree"];
    const bsAliases = ["bs", "bon_sortie", "bon-sortie", "bon sortie", "bon de sortie"];
    const avoirAliases = ["avoir", "facture_avoir", "facture-avoir", "facture avoir", "facture d'avoir", "facture davoir"];
    if (faAliases.includes(t)) return "fa";
    if (blAliases.includes(t)) return "bl";
    if (bcAliases.includes(t)) return "bc";
    if (beAliases.includes(t)) return "be";
    if (bsAliases.includes(t)) return "bs";
    if (avoirAliases.includes(t)) return "avoir";
    if (t === "devis") return "devis";
    return "facture";
  }

  function ensureRoot(options = {}) {
    const providedRoot = options?.root;
    if (providedRoot && providedRoot.nodeType === 1) {
      if (!providedRoot.id) providedRoot.id = "pdfRoot";
      return providedRoot;
    }
    let root = document.getElementById("pdfRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "pdfRoot";
      document.body.appendChild(root);
    }
    return root;
  }

  function resolveHiddenColumnsFromConfig(columns = {}) {
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(columns, key);
    const resolveHidden = (keys = []) => {
      for (const key of keys) {
        if (hasOwn(key)) return !columns[key];
      }
      return false;
    };
    return {
      ref:       resolveHidden(["ref"]),
      product:   resolveHidden(["product"]),
      desc:      resolveHidden(["desc"]),
      qty:       resolveHidden(["qty"]),
      unit:      resolveHidden(["unit"]),
      purchasePrice: resolveHidden(["purchasePrice", "purchaseprice"]),
      purchaseTva: resolveHidden(["purchaseTva", "purchasetva", "purchaseTVA"]),
      purchaseDiscount: resolveHidden(["purchaseDiscount", "purchase_discount", "purchasediscount"]),
      price:     resolveHidden(["price"]),
      fodec:     resolveHidden(["fodec"]),
      fodecSale: resolveHidden(["fodecSale", "fodec_sale", "fodec"]),
      fodecPurchase: resolveHidden(["fodecPurchase", "fodec_purchase", "purchaseFodec", "fodec"]),
      tva:       resolveHidden(["tva"]),
      discount:  resolveHidden(["discount"]),
      totalPurchaseHt: resolveHidden(["totalPurchaseHt", "totalpurchaseht", "totalPurchaseHT"]),
      totalHt:   resolveHidden(["totalHt", "totalht", "totalHT"]),
      totalPurchaseTtc: resolveHidden(["totalPurchaseTtc", "totalpurchasettc", "totalPurchaseTTC"]),
      ttc:       resolveHidden(["ttc", "totalTtc", "totalttc", "totalTTC"])
    };
  }

  function resolveHiddenColumns(state = {}, { strictPreview = false } = {}) {
    const meta = state?.meta || {};
    const modelColumns = meta && typeof meta.modelColumns === "object" ? meta.modelColumns : null;
    const savedColumns =
      meta && typeof meta.columns === "object" ? meta.columns : null;
    const sourceColumns = strictPreview ? (savedColumns || modelColumns || {}) : (modelColumns || savedColumns || {});
    return resolveHiddenColumnsFromConfig(sourceColumns);
  }

  function build(state, assets) {
    const company = state?.company || {};
    const client  = state?.client  || {};
    const meta    = state?.meta    || {};
    const strictPreview = meta?.__pdfPreviewStrict === true;
    const templateKey = resolveTemplateKey(state);
    const items   = Array.isArray(state?.items) ? state.items : [];
    const headerColor = resolveItemsHeaderColor(meta);
    const pageStyleAttr = headerColor
      ? ` style="--items-head-bg:${headerColor};--primary:${headerColor};"`
      : "";
    const ex      = meta?.extras || {};
    const taxesEnabled = isTaxesEnabled(meta?.taxesEnabled);
    const articleLabelDefaults = resolveArticleFieldLabelDefaults({ strictPreview });
    const articleLabelSource = resolveArticleFieldLabelSource(state, { strictPreview });
    const resolveLegacyTotalPurchaseLabelHtml = (key, value, fallbackHtml = "") => {
      const normalizedKey = String(key || "").trim();
      const normalizedValue = String(value || "").trim().toLowerCase();
      const legacyLabelMap = {
        purchasePrice: new Set(["prix unitaire d'achat ht", "pu achat ht", "prix achat ht", "pu a. ht"]),
        purchaseTva: new Set(["tva a l'achat %", "tva achat %", "tva a.", "tva a"]),
        fodec: new Set(["fodec %", "fodec % v.", "fodec % a."]),
        fodecSale: new Set(["fodec %", "fodec % v."]),
        fodecPurchase: new Set(["fodec %", "fodec % a."]),
        totalPurchaseHt: new Set(["prix unitaire d'achat ht", "total achat ht", "total a. ht"]),
        totalPurchaseTtc: new Set(["prix unitaire d'achat ttc", "total achat ttc", "total a. ttc"])
      };
      const legacySet = legacyLabelMap[normalizedKey];
      if (legacySet && legacySet.has(normalizedValue)) return fallbackHtml;
      return value;
    };
    const ARTICLE_FIELD_LABEL_KEY_ALIASES = {
      fodecSale: ["fodecAmount", "fodecSale", "fodec"],
      fodecPurchase: ["purchaseFodecAmount", "fodecPurchase", "fodec"]
    };
    const resolveArticleLabelRaw = (key) => {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) return "";
      const source = articleLabelSource && typeof articleLabelSource === "object" ? articleLabelSource : {};
      const candidates = ARTICLE_FIELD_LABEL_KEY_ALIASES[normalizedKey] || [normalizedKey];
      for (const candidate of candidates) {
        const raw = typeof source[candidate] === "string" ? source[candidate].trim() : "";
        if (raw) return raw;
      }
      return "";
    };
    const resolveArticleLabelHtml = (key, fallbackHtml = "") => {
      const raw = resolveArticleLabelRaw(key);
      if (raw) return esc(resolveLegacyTotalPurchaseLabelHtml(key, raw, fallbackHtml));
      if (fallbackHtml) return fallbackHtml;
      const candidates = ARTICLE_FIELD_LABEL_KEY_ALIASES[String(key || "").trim()] || [String(key || "").trim()];
      for (const candidate of candidates) {
        const rawDefault = typeof articleLabelDefaults[candidate] === "string"
          ? articleLabelDefaults[candidate].trim()
          : "";
        if (rawDefault) return rawDefault;
      }
      return "";
    };
    const priceLabel = resolveArticleLabelHtml(
      "price",
      taxesEnabled ? (articleLabelDefaults.price || "P.U. HT") : esc("Prix unitaire")
    );
    const totalHtLabel = resolveArticleLabelHtml(
      "totalHt",
      taxesEnabled ? (articleLabelDefaults.totalHt || "Total HT") : esc("Total")
    );
    const totalTtcLabel = resolveArticleLabelHtml(
      "totalTtc",
      articleLabelDefaults.totalTtc || "Total TTC"
    );
    const refLabel = resolveArticleLabelHtml("ref", articleLabelDefaults.ref);
    const productLabel = resolveArticleLabelHtml("product", articleLabelDefaults.product);
    const descLabel = resolveArticleLabelHtml("desc", articleLabelDefaults.desc);
    const qtyLabel = resolveArticleLabelHtml("qty", articleLabelDefaults.qty);
    const unitLabel = resolveArticleLabelHtml("unit", articleLabelDefaults.unit);
    const purchasePriceLabel = resolveArticleLabelHtml(
      "purchasePrice",
      articleLabelDefaults.purchasePrice || "PU A. HT"
    );
    const purchaseTvaLabel = resolveArticleLabelHtml(
      "purchaseTva",
      articleLabelDefaults.purchaseTva || "TVA A."
    );
    const purchaseDiscountLabel = resolveArticleLabelHtml(
      "purchaseDiscount",
      articleLabelDefaults.purchaseDiscount || "Remise A."
    );
    const fodecSaleHeaderLabel = resolveArticleLabelHtml(
      "fodecSale",
      articleLabelDefaults.fodecAmount || articleLabelDefaults.fodecSale || "FODEC"
    );
    const fodecPurchaseHeaderLabel = resolveArticleLabelHtml(
      "fodecPurchase",
      articleLabelDefaults.purchaseFodecAmount || articleLabelDefaults.fodecPurchase || "FODEC A."
    );
    const tvaLabel = resolveArticleLabelHtml("tva", articleLabelDefaults.tva);
    const discountLabel = resolveArticleLabelHtml("discount", articleLabelDefaults.discount);
    const totalPurchaseHtLabel = resolveArticleLabelHtml(
      "totalPurchaseHt",
      articleLabelDefaults.totalPurchaseHt || "Total A. HT"
    );
    const totalPurchaseTtcLabel = resolveArticleLabelHtml(
      "totalPurchaseTtc",
      articleLabelDefaults.totalPurchaseTtc || "Total A. TTC"
    );

    const shipEnabled = !!ex?.shipping?.enabled;
    const shipLabel   = (ex?.shipping?.label || "Frais de livraison");
    const shipBaseHT  = toFiniteNumber(ex?.shipping?.amount, 0);
    const shipTVApc   = toFiniteNumber(ex?.shipping?.tva, 0);
    const shipHT      = shipEnabled ? shipBaseHT : 0;
    const shipTVA     = shipEnabled && taxesEnabled ? shipHT * (shipTVApc / 100) : 0;

    const dossierEnabled = !!ex?.dossier?.enabled;
    const dossierLabel   = (ex?.dossier?.label || "Frais du dossier");
    const dossierBaseHT  = toFiniteNumber(ex?.dossier?.amount, 0);
    const dossierTVApc   = toFiniteNumber(ex?.dossier?.tva, 0);
    const dossierHT      = dossierEnabled ? dossierBaseHT : 0;
    const dossierTVA     = dossierEnabled && taxesEnabled ? dossierHT * (dossierTVApc / 100) : 0;

    const deplacementEnabled = !!ex?.deplacement?.enabled;
    const deplacementLabel   = (ex?.deplacement?.label || "Frais de deplacement");
    const deplacementBaseHT  = toFiniteNumber(ex?.deplacement?.amount, 0);
    const deplacementTVApc   = toFiniteNumber(ex?.deplacement?.tva, 0);
    const deplacementHT      = deplacementEnabled ? deplacementBaseHT : 0;
    const deplacementTVA     = deplacementEnabled && taxesEnabled ? deplacementHT * (deplacementTVApc / 100) : 0;

    const stampEnabled = !!ex?.stamp?.enabled;
    const stampLabel   = (ex?.stamp?.label || "Timbre fiscal");
    const stampBaseHT  = toFiniteNumber(ex?.stamp?.amount, 0);
    const stampHT      = stampEnabled ? stampBaseHT : 0;
    const stampTTC     = stampHT;

    const cur   = meta.currency || "DT";
    const logo = hasVal(company.logo) ? company.logo : "";
    const type  = getDocType(meta);
    const usePurchasePricing = type === "fa";
    const pdfOptions = ex?.pdf && typeof ex.pdf === "object" ? ex.pdf : {};
    const showSeal = pdfOptions.showSeal !== false;
    const showSignature = pdfOptions.showSignature !== false;
    const showAmountWords = pdfOptions.showAmountWords !== false;
    const sealImageHTML = showSeal ? buildSealImageHTML(company?.seal) : "";
    const sealOverlayHTML = sealImageHTML ? `<div class="pdf-sign-stamp">${sealImageHTML}</div>` : "";
    const signatureImageHTML = showSignature ? buildSignatureImageHTML(company?.signature) : "";
    const signatureOverlayHTML = signatureImageHTML ? `<div class="pdf-sign-signature">${signatureImageHTML}</div>` : "";

    const MAP = {
      facture: { DOC_LABEL: "Facture",           NUM_LABEL: "N&deg;",          SHOW_WORDS: true  },
      fa:      { DOC_LABEL: "Facture d'achat",   NUM_LABEL: "N&deg;",          SHOW_WORDS: true  },
      avoir:   { DOC_LABEL: "FACTURE D'AVOIR",   NUM_LABEL: "N&deg;",          SHOW_WORDS: true  },
      devis:   { DOC_LABEL: "Devis",             NUM_LABEL: "N&deg;",            SHOW_WORDS: true },
      bl:      { DOC_LABEL: "Bon de livraison",  NUM_LABEL: "N&deg;", SHOW_WORDS: true  },
      bc:      { DOC_LABEL: "Bon de commande",   NUM_LABEL: "N&deg;",  SHOW_WORDS: false },
      be:      { DOC_LABEL: "Bon d'entr\u00e9e",  NUM_LABEL: "N&deg;", SHOW_WORDS: true  },
      bs:      { DOC_LABEL: "Bon de sortie",     NUM_LABEL: "N&deg;", SHOW_WORDS: true  }
    };
    const { DOC_LABEL, NUM_LABEL, SHOW_WORDS } = MAP[type] || MAP.facture;
    const computedStatus = String(meta?.historyStatus || meta?.status || "").toLowerCase();
    const statusConfig =
      type === "facture"
        ? {
            brouillon: { text: "Brouillon", cls: "pdf-status-flag--brouillon" },
            annule: { text: "Brouillon", cls: "pdf-status-flag--brouillon" },
            avoir: { text: "d'avoir", cls: "pdf-status-flag--avoir" }
          }[computedStatus]
        : null;
    const statusBadgeHTML = statusConfig
      ? `<p class="pdf-status-flag ${statusConfig.cls}">${statusConfig.text}</p>`
      : "";

    const wordsHeader =
      type === "devis"   ? "Arr&ecirc;t&eacute; le pr&eacute;sent devis &agrave; la somme de&nbsp;:"
    : type === "facture" ? "Arr&ecirc;t&eacute;e la pr&eacute;sente facture &agrave; la somme de&nbsp;:"
    : type === "fa"      ? "Arr&ecirc;t&eacute;e la pr&eacute;sente facture d'achat &agrave; la somme de&nbsp;:"
    : type === "avoir"   ? "Arr&ecirc;t&eacute;e la pr&eacute;sente facture d'avoir &agrave; la somme de&nbsp;:"
    : type === "bl"      ? "Arr&ecirc;t&eacute; le pr&eacute;sent bon de livraison &agrave; la somme de&nbsp;:"
    : type === "be"      ? "Arr&ecirc;t&eacute; le pr&eacute;sent bon d'entr&eacute;e &agrave; la somme de&nbsp;:"
    : type === "bs"      ? "Arr&ecirc;t&eacute; le pr&eacute;sent bon de sortie &agrave; la somme de&nbsp;:"
    : "";

    const hide = resolveHiddenColumns(state, { strictPreview });
    const hidePurchaseTvaCol = hide.purchaseTva || !taxesEnabled;
    const hidePurchaseDiscountCol = hide.purchaseDiscount || hide.purchasePrice;
    const hideTvaCol = hide.tva || !taxesEnabled;
    const hideFodecSaleCol = hide.fodecSale || !taxesEnabled;
    const hideFodecPurchaseCol = hide.fodecPurchase || !taxesEnabled;
    const hideTotalPurchaseTtcCol = hide.totalPurchaseTtc || !taxesEnabled;
    const hideTotalHtCol = hide.totalHt || hide.price;
    const hideTTC = hide.ttc || hide.price;
    const showSalesFinancialColumns =
      !hide.price || !hideFodecSaleCol || !hideTvaCol || !hideTotalHtCol || !hideTTC;
    const showPurchaseFinancialColumns =
      !hide.purchasePrice ||
      !hidePurchaseTvaCol ||
      !hidePurchaseDiscountCol ||
      !hideFodecPurchaseCol ||
      !hide.totalPurchaseHt ||
      !hideTotalPurchaseTtcCol;
    const showMiniAux = showSalesFinancialColumns || showPurchaseFinancialColumns;

    const columns = [];
    if (!hide.ref)      columns.push({ key: "ref", label: refLabel, labelKey: "ref" });
    if (!hide.product)  columns.push({ key: "product", label: productLabel, labelKey: "product" });
    if (!hide.desc)     columns.push({ key: "desc", label: descLabel, labelKey: "desc" });
    if (!hide.qty)      columns.push({ key: "qty", label: qtyLabel, labelKey: "qty", nowrap: true });
    if (!hide.unit)     columns.push({ key: "unit", label: unitLabel, labelKey: "unit", nowrap: true });
    if (!hide.purchasePrice) columns.push({ key: "purchasePrice", label: purchasePriceLabel, labelKey: "purchasePrice", nowrap: true });
    if (!hidePurchaseTvaCol) columns.push({ key: "purchaseTva", label: purchaseTvaLabel, labelKey: "purchaseTva", nowrap: true });
    if (!hide.price)    columns.push({ key: "price", label: priceLabel, labelKey: "price", nowrap: true, id: "itemsPriceHeader" });
    if (!hideFodecSaleCol) columns.push({ key: "fodecSale", label: fodecSaleHeaderLabel, nowrap: true, id: "itemsFodecHeader" });
    if (!hideFodecPurchaseCol) columns.push({ key: "fodecPurchase", label: fodecPurchaseHeaderLabel, nowrap: true, id: "itemsFodecPurchaseHeader" });
    if (!hidePurchaseDiscountCol) columns.push({ key: "purchaseDiscount", label: purchaseDiscountLabel, labelKey: "purchaseDiscount", nowrap: true });
    if (!hideTvaCol)    columns.push({ key: "tva", label: tvaLabel, labelKey: "tva", nowrap: true });
    if (!hide.discount) columns.push({ key: "discount", label: discountLabel, labelKey: "discount", nowrap: true });
    if (!hide.totalPurchaseHt) columns.push({ key: "totalPurchaseHt", label: totalPurchaseHtLabel, labelKey: "totalPurchaseHt", nowrap: true });
    if (!hideTotalHtCol) columns.push({ key: "totalHt", label: totalHtLabel, labelKey: "totalHt", nowrap: true, id: "itemsTotalHtHeader" });
    if (!hideTotalPurchaseTtcCol) columns.push({ key: "totalPurchaseTtc", label: totalPurchaseTtcLabel, labelKey: "totalPurchaseTtc", nowrap: true });
    if (!hideTTC)       columns.push({ key: "ttc", label: totalTtcLabel, labelKey: "totalTtc", nowrap: true });
    const headerRowHTML = buildHeaderRowHTML(columns);

    const hasNumValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
    const toNum = (value, fallback = 0) => toFiniteNumber(value, fallback);
    const toBool = (value, fallback = false) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (value === undefined || value === null) return fallback;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized) return fallback;
      if (["1", "true", "yes", "oui", "on"].includes(normalized)) return true;
      if (["0", "false", "no", "non", "off"].includes(normalized)) return false;
      return fallback;
    };
    const pickFirstValue = (source, keys = []) => {
      const target = source && typeof source === "object" ? source : {};
      for (const key of keys) {
        if (hasNumValue(target?.[key])) return target[key];
      }
      return undefined;
    };
    const resolveNormalizedFodecConfig = (source, { purchase = false } = {}) => {
      const target = source && typeof source === "object" ? source : {};
      const rawConfig = purchase
        ? (target.purchaseFodec && typeof target.purchaseFodec === "object" ? target.purchaseFodec : {})
        : (target.fodec && typeof target.fodec === "object" ? target.fodec : {});
      const enabledSource = pickFirstValue(
        target,
        purchase ? ["purchaseFodecEnabled", "purchase_fodec_enabled"] : ["fodecEnabled", "fodec_enabled"]
      );
      const rateSource = pickFirstValue(
        target,
        purchase
          ? ["purchaseFodecRate", "purchase_fodec_rate", "purchaseFodecRatePct", "purchase_fodec_rate_pct"]
          : ["fodecRate", "fodec_rate", "fodecRatePct", "fodec_rate_pct"]
      );
      const tvaSource = pickFirstValue(
        target,
        purchase
          ? ["purchaseFodecTva", "purchase_fodec_tva", "purchaseFodecTvaPct", "purchase_fodec_tva_pct"]
          : ["fodecTva", "fodec_tva", "fodecTvaPct", "fodec_tva_pct"]
      );
      const rate = hasNumValue(rawConfig.rate) ? toNum(rawConfig.rate, 0) : toNum(rateSource, 0);
      const tva = hasNumValue(rawConfig.tva) ? toNum(rawConfig.tva, 0) : toNum(tvaSource, 0);
      const enabled =
        typeof rawConfig.enabled === "boolean"
          ? rawConfig.enabled
          : toBool(enabledSource, Math.abs(rate) > 0 || Math.abs(tva) > 0);
      const labelFallback = purchase ? "FODEC ACHAT" : "FODEC";
      const labelRaw =
        typeof rawConfig.label === "string" && rawConfig.label.trim()
          ? rawConfig.label
          : typeof target[purchase ? "purchaseFodecLabel" : "fodecLabel"] === "string"
            ? target[purchase ? "purchaseFodecLabel" : "fodecLabel"]
            : typeof target[purchase ? "purchase_fodec_label" : "fodec_label"] === "string"
              ? target[purchase ? "purchase_fodec_label" : "fodec_label"]
              : labelFallback;
      return {
        enabled: !!enabled,
        rate,
        tva,
        label: String(labelRaw || labelFallback).trim() || labelFallback
      };
    };
    const normalizePreviewItem = (raw = {}) => {
      const source = raw && typeof raw === "object" ? raw : {};
      const salesPriceSource = pickFirstValue(source, [
        "price",
        "unitPrice",
        "unit_price",
        "pu",
        "puHt",
        "pu_ht",
        "prixUnitaire",
        "prix_unitaire"
      ]);
      const salesTvaSource = pickFirstValue(source, [
        "tva",
        "vat",
        "tax",
        "taxRate",
        "tax_rate",
        "tvaRate",
        "tva_rate"
      ]);
      const purchasePriceSource = pickFirstValue(source, [
        "purchasePrice",
        "purchase_price",
        "buyPrice",
        "buy_price",
        "prixAchat",
        "prix_achat",
        "purchaseHt",
        "purchase_ht",
        "puAchat",
        "pu_achat",
        "puAchatHt",
        "pu_achat_ht",
        "puAHt",
        "pu_a_ht"
      ]);
      const purchaseTvaSource = pickFirstValue(source, [
        "purchaseTva",
        "purchase_tva",
        "purchaseVat",
        "purchase_vat",
        "buyTva",
        "buy_tva",
        "tvaAchat",
        "tva_achat",
        "purchaseTax",
        "purchase_tax"
      ]);
      const qtySource = pickFirstValue(source, ["qty", "quantity", "qte", "quantite"]);
      const discountSource = pickFirstValue(source, [
        "discount",
        "discountPct",
        "discount_pct",
        "discountRate",
        "discount_rate",
        "remise"
      ]);
      const purchaseDiscountSource = pickFirstValue(source, [
        "purchaseDiscount",
        "purchase_discount",
        "purchaseDiscountPct",
        "purchase_discount_pct",
        "purchaseDiscountRate",
        "purchase_discount_rate",
        "purchaseRemise",
        "purchase_remise",
        "remiseAchat",
        "remise_achat"
      ]);
      const salesPrice = hasNumValue(salesPriceSource) ? toNum(salesPriceSource, 0) : 0;
      const salesTva = hasNumValue(salesTvaSource) ? toNum(salesTvaSource, 0) : 0;
      const purchasePriceRaw = hasNumValue(purchasePriceSource)
        ? toNum(purchasePriceSource, 0)
        : (usePurchasePricing ? salesPrice : 0);
      const purchaseTvaRaw = hasNumValue(purchaseTvaSource)
        ? toNum(purchaseTvaSource, 0)
        : (usePurchasePricing ? salesTva : 0);
      const purchasePrice =
        usePurchasePricing && purchasePriceRaw === 0 && salesPrice !== 0
          ? salesPrice
          : purchasePriceRaw;
      const purchaseTva =
        usePurchasePricing && purchaseTvaRaw === 0 && salesTva !== 0
          ? salesTva
          : purchaseTvaRaw;
      return {
        ref: source.ref || "",
        product: source.product || "",
        desc: source.desc || (source.product ? "" : (source.desc || "")),
        qty: hasNumValue(qtySource) ? toNum(qtySource, 0) : toNum(source.qty, 0),
        unit: source.unit || "",
        purchasePrice,
        purchaseTva,
        price: salesPrice,
        tva: salesTva,
        discount: hasNumValue(discountSource)
          ? toNum(discountSource, 0)
          : toNum(source.discount, 0),
        purchaseDiscount: hasNumValue(purchaseDiscountSource)
          ? toNum(purchaseDiscountSource, 0)
          : toNum(source.purchaseDiscount ?? source.discount, 0),
        fodec: resolveNormalizedFodecConfig(source, { purchase: false }),
        purchaseFodec: resolveNormalizedFodecConfig(source, { purchase: true })
      };
    };
    const normalizedItems = items.map((raw) => normalizePreviewItem(raw));

    const rowHtml = normalizedItems.map((it) => {

      const unitPrice = usePurchasePricing ? it.purchasePrice : it.price;
      const base   = it.qty * unitPrice;
      const activeDiscountRate = usePurchasePricing ? it.purchaseDiscount : it.discount;
      const disc   = base * (activeDiscountRate / 100);
      const after  = base - disc;
      const tvaRate = taxesEnabled ? (usePurchasePricing ? it.purchaseTva : it.tva) : 0;
      const tvaAmt = after * (tvaRate / 100);
      const fCfg = it.fodec || {};
      const purchaseFCfg = it.purchaseFodec || {};
      const activeFCfg =
        usePurchasePricing && purchaseFCfg && Object.keys(purchaseFCfg).length
          ? purchaseFCfg
          : fCfg;
      const fEnabled = !!activeFCfg.enabled && Number.isFinite(Number(activeFCfg.rate));
      const fRate = Number(activeFCfg.rate || 0);
      const fTvaRate = taxesEnabled ? Number(activeFCfg.tva || 0) : 0;
      const purchaseFEnabled = !!purchaseFCfg.enabled && Number.isFinite(Number(purchaseFCfg.rate));
      const purchaseFRate = Number(purchaseFCfg.rate || 0);
      const fHt = fEnabled ? after * (fRate / 100) : 0;
      const fTva = fEnabled ? fHt * (fTvaRate / 100) : 0;
      const lineHT = after;
      const lineTT = after + tvaAmt + fHt + fTva;
      const purchaseTvaRate = taxesEnabled ? it.purchaseTva : 0;
      const purchaseBase = it.qty * it.purchasePrice;
      const purchaseDisc = purchaseBase * ((Number(it.purchaseDiscount || 0)) / 100);
      const linePurchaseHt = Math.max(0, purchaseBase - purchaseDisc);
      const linePurchaseTtc =
        usePurchasePricing
          ? lineTT
          : linePurchaseHt + (linePurchaseHt * (purchaseTvaRate / 100));

      const cells = columns.map((col) => {
        const classes = [];
        if (col.nowrap) classes.push("no-wrap");
        const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
        const dataAttr = ` data-col="${col.key}"`;
        switch (col.key) {
          case "ref":
            return `<td${dataAttr}${classAttr}>${esc(it.ref)}</td>`;
          case "product":
            return `<td${dataAttr}${classAttr}>${esc(it.product)}</td>`;
          case "desc":
            return `<td${dataAttr}${classAttr}>${esc(it.desc)}</td>`;
          case "qty":
            return `<td${dataAttr}${classAttr}>${it.qty}</td>`;
          case "unit": {
            const unitCell = it.unit ? esc(it.unit) : "&mdash;";
            return `<td${dataAttr}${classAttr}>${unitCell}</td>`;
          }
          case "purchasePrice":
            return `<td${dataAttr}${classAttr}>${fmtMoney(it.purchasePrice, cur)}</td>`;
          case "purchaseTva": {
            const purchaseTvaDisplay = `${fmtPct(purchaseTvaRate)}%`;
            return `<td${dataAttr}${classAttr}>${purchaseTvaDisplay}</td>`;
          }
          case "price":
            return `<td${dataAttr}${classAttr}>${fmtMoney(it.price, cur)}</td>`;
          case "tva": {
            const tvaDisplay = `${fmtPct(tvaRate)}%`;
            return `<td${dataAttr}${classAttr}>${tvaDisplay}</td>`;
          }
          case "fodecSale": {
            const fodecSaleDisplay = fEnabled && taxesEnabled ? `${fmtPct(fRate)}%` : "0%";
            return `<td${dataAttr}${classAttr}>${fodecSaleDisplay}</td>`;
          }
          case "fodecPurchase": {
            const fodecPurchaseDisplay = purchaseFEnabled && taxesEnabled ? `${fmtPct(purchaseFRate)}%` : "0%";
            return `<td${dataAttr}${classAttr}>${fodecPurchaseDisplay}</td>`;
          }
          case "purchaseDiscount": {
            const purchaseDiscountVal = Number(it.purchaseDiscount || 0);
            const purchaseDiscountDisplay = purchaseDiscountVal > 0 ? `${fmtPct(purchaseDiscountVal)}%` : "0%";
            return `<td${dataAttr}${classAttr}>${purchaseDiscountDisplay}</td>`;
          }
          case "discount": {
            const discountVal = Number(it.discount || 0);
            const discountDisplay = discountVal > 0 ? `${fmtPct(discountVal)}%` : "0%";
            return `<td${dataAttr}${classAttr}>${discountDisplay}</td>`;
          }
          case "totalPurchaseHt":
            return `<td${dataAttr}${classAttr}>${fmtMoney(linePurchaseHt, cur)}</td>`;
          case "totalHt":
            return `<td${dataAttr}${classAttr}>${fmtMoney(lineHT, cur)}</td>`;
          case "totalPurchaseTtc":
            return `<td${dataAttr}${classAttr}>${fmtMoney(linePurchaseTtc, cur)}</td>`;
          case "ttc":
            return `<td${dataAttr}${classAttr}>${fmtMoney(lineTT, cur)}</td>`;
          default:
            return `<td${dataAttr}${classAttr}></td>`;
        }
      });
      return `<tr class="pdf-row">${cells.join("")}</tr>`;
    });

    let subtotalItems = 0, totalDisc = 0, totalTVA_items = 0;
    let fodecHTSum = 0, fodecTVASum = 0;
    const defaultFodecLabel = usePurchasePricing ? "FODEC ACHAT" : "FODEC";
    let fodecLabel = defaultFodecLabel;
    let fodecRateDisplay = null;
    let anyFodec = false;
    const tvaBreakdownMap = new Map();
    const addBreakdown = ({ key, label, base, amount, type = "tva", rate = null }) => {
      const baseVal = Number(base || 0);
      const amountVal = Number(amount || 0);
      if (!key || !label) return;
      if (Math.abs(amountVal) < 1e-9) return;
      if (Math.abs(baseVal) < 1e-9 && Math.abs(amountVal) < 1e-9) return;
      const existing = tvaBreakdownMap.get(key);
      if (existing) {
        existing.base += baseVal;
        existing.amount += amountVal;
        return;
      }
      tvaBreakdownMap.set(key, { label, base: baseVal, amount: amountVal, type, rate });
    };
    normalizedItems.forEach((it) => {
      const qty   = Number(it.qty || 0);
      const price = Number(usePurchasePricing ? it.purchasePrice : it.price) || 0;
      const tvaRate   = taxesEnabled ? Number(usePurchasePricing ? it.purchaseTva : it.tva) : 0;
      const discP = Number(usePurchasePricing ? it.purchaseDiscount : it.discount) || 0;
      const base  = qty * price;
      const disc  = base * (discP / 100);
      const after = base - disc;
      const tvaAmt= after * (tvaRate / 100);
      const fCfg = (it && typeof it.fodec === "object") ? it.fodec : {};
      const purchaseFCfg = (it && typeof it.purchaseFodec === "object") ? it.purchaseFodec : {};
      const activeFCfg =
        usePurchasePricing && purchaseFCfg && Object.keys(purchaseFCfg).length
          ? purchaseFCfg
          : fCfg;
      const fEnabled = !!activeFCfg.enabled && Number.isFinite(Number(activeFCfg.rate));
      const fRate = Number(activeFCfg.rate || 0);
      const fTvaRate = Number(activeFCfg.tva || 0);
      const fht = fEnabled ? after * (fRate / 100) : 0;
      const ftva = fEnabled && taxesEnabled ? fht * (fTvaRate / 100) : 0;
      subtotalItems += base;
      totalDisc     += disc;
      totalTVA_items+= tvaAmt;
      fodecHTSum    += fht;
      fodecTVASum   += ftva;
      if (fEnabled && !anyFodec) {
        anyFodec = true;
        fodecLabel = activeFCfg.label || defaultFodecLabel;
        if (Number.isFinite(fRate)) fodecRateDisplay = fRate;
      }
      if (taxesEnabled && tvaRate > 0) {
        addBreakdown({
          key: `tva-${tvaRate}`,
          label: `TVA ${fmtPct(tvaRate)}%`,
          base: after,
          amount: tvaAmt,
          type: "tva",
          rate: tvaRate
        });
      }
      if (fEnabled && fRate > 0) {
        const fLabel = activeFCfg.label || fodecLabel || defaultFodecLabel;
        addBreakdown({
          key: `fodec-${fRate}`,
          label: `${fLabel} ${fmtPct(fRate)}%`,
          base: after,
          amount: fht,
          type: "fodec",
          rate: fRate
        });
      }
      if (fEnabled && taxesEnabled && fTvaRate > 0 && ftva) {
        addBreakdown({
          key: `tva-${fTvaRate}`,
          label: `TVA ${fmtPct(fTvaRate)}%`,
          base: fht,
          amount: ftva,
          type: "tva",
          rate: fTvaRate
        });
      }
    });

    const totalHT_items = subtotalItems - totalDisc;

    const totalHT_display = totalHT_items + shipHT;
    const totalTVA_disp   = totalTVA_items + shipTVA + dossierTVA + deplacementTVA + fodecTVASum;
    const totalTTC_all    = totalHT_display + totalTVA_disp + fodecHTSum + (stampEnabled ? stampTTC : 0) + dossierHT + deplacementHT;
    if (shipEnabled && taxesEnabled && shipTVApc) {
      addBreakdown({
        key: `tva-${shipTVApc}`,
        label: `TVA ${fmtPct(shipTVApc)}%`,
        base: shipHT,
        amount: shipTVA,
        type: "tva",
        rate: shipTVApc
      });
    }
    if (dossierEnabled && taxesEnabled && dossierTVApc) {
      addBreakdown({
        key: `tva-${dossierTVApc}`,
        label: `TVA ${fmtPct(dossierTVApc)}%`,
        base: dossierHT,
        amount: dossierTVA,
        type: "tva",
        rate: dossierTVApc
      });
    }
    if (deplacementEnabled && taxesEnabled && deplacementTVApc) {
      addBreakdown({
        key: `tva-${deplacementTVApc}`,
        label: `TVA ${fmtPct(deplacementTVApc)}%`,
        base: deplacementHT,
        amount: deplacementTVA,
        type: "tva",
        rate: deplacementTVApc
      });
    }

    const showTotalTTC = Math.abs(totalTTC_all - totalHT_display) > 1e-9 || stampEnabled;
    const baseTotal = showTotalTTC ? totalTTC_all : totalHT_display;

    const financingState = meta?.financing || {};
    const subventionState = financingState.subvention || {};
    const bankState = financingState.bank || {};
    const subventionAmount = subventionState.enabled ? toFiniteNumber(subventionState.amount, 0) : 0;
    const bankAmount = bankState.enabled ? toFiniteNumber(bankState.amount, 0) : 0;
    const hasNetToPay = !!subventionState.enabled || !!bankState.enabled;
    const netToPay =
      totalTTC_all
      - (Number.isFinite(subventionAmount) ? subventionAmount : 0)
      - (Number.isFinite(bankAmount) ? bankAmount : 0);

    const acompteState = meta?.acompte || {};
    const acompteEnabled = acompteState.fromCheckbox === true;
    const acomptePaidRaw = acompteEnabled ? toFiniteNumber(acompteState.paid, 0) : 0;
    const acomptePaid = Number.isFinite(acomptePaidRaw) ? acomptePaidRaw : 0;

    const wordsTarget       = hasNetToPay ? netToPay : baseTotal;
    const showWords         = SHOW_WORDS && showAmountWords;
    const wordsTgtText      = showWords ? amountInWords(wordsTarget, cur) : "";
    const wordsHeaderFinal  = wordsHeader;

    const totalTaxesDisplay = totalTVA_disp + fodecHTSum;
    const hasTaxesDisplay = Math.abs(totalTaxesDisplay) > 1e-9;
    const balanceBase = hasNetToPay ? netToPay : baseTotal;
    const balanceDue = balanceBase - (acompteEnabled ? acomptePaid : 0);
    const balanceDueDisplay = Math.abs(balanceDue) < 0.005 ? 0 : balanceDue;

    const miniRows = [];
    if (shipEnabled && Math.abs(shipHT) > 1e-9) {
      miniRows.push(`<tr><td>${esc(shipLabel)}</td><td class="right">${fmtMoney(shipHT, cur)}</td></tr>`);
    }
    miniRows.push(`<tr class="bar head"><th>${totalHtLabel}</th><th class="right">${fmtMoney(totalHT_display, cur)}</th></tr>`);
    if (hasTaxesDisplay) {
      miniRows.push(`<tr><td>Total Taxes</td><td class="right">${fmtMoney(totalTaxesDisplay, cur)}</td></tr>`);
    }
    if (stampEnabled) {
      miniRows.push(`<tr><td>${esc(stampLabel)}</td><td class="right">${fmtMoney(stampTTC, cur)}</td></tr>`);
    }
    if (dossierEnabled && Math.abs(dossierHT) > 1e-9) {
      miniRows.push(`<tr><td>${esc(dossierLabel)}</td><td class="right">${fmtMoney(dossierHT, cur)}</td></tr>`);
    }
    if (deplacementEnabled && Math.abs(deplacementHT) > 1e-9) {
      miniRows.push(`<tr><td>${esc(deplacementLabel)}</td><td class="right">${fmtMoney(deplacementHT, cur)}</td></tr>`);
    }
    if (showTotalTTC) {
      miniRows.push(`<tr class="bar grand"><th>Total TTC</th><th class="right">${fmtMoney(totalTTC_all, cur)}</th></tr>`);
    }
    if (subventionState.enabled) {
      const subventionLabelRaw = String(subventionState.label || "").trim();
      const subventionLabel =
        subventionLabelRaw && !subventionLabelRaw.toLowerCase().startsWith("subvention")
          ? `Subvention ${subventionLabelRaw}`
          : (subventionLabelRaw || "Subvention");
      miniRows.push(
        `<tr id="miniSubventionRow"><td id="miniSubventionLabel">${esc(subventionLabel)}</td>` +
        `<td class="right" data-cur="${esc(cur)}"><span id="miniSubvention">${fmtMoney(subventionAmount, cur)}</span></td></tr>`
      );
    }
    if (bankState.enabled) {
      const bankLabelRaw = String(bankState.label || "").trim();
      const bankLabel =
        bankLabelRaw && !bankLabelRaw.toLowerCase().startsWith("financement bancaire")
          ? `Financement bancaire ${bankLabelRaw}`
          : (bankLabelRaw || "Financement bancaire");
      miniRows.push(
        `<tr id="miniFinBankRow"><td id="miniFinBankLabel">${esc(bankLabel)}</td>` +
        `<td class="right" data-cur="${esc(cur)}"><span id="miniFinBank">${fmtMoney(bankAmount, cur)}</span></td></tr>`
      );
    }
    if (hasNetToPay) {
      miniRows.push(
        `<tr id="miniNetToPayRow" class="bar grand"><th id="miniNetToPayLabel">Montant net a payer</th>` +
        `<th class="right" data-cur="${esc(cur)}"><span id="miniNetToPay">${fmtMoney(netToPay, cur)}</span></th></tr>`
      );
    }
    if (acompteEnabled && Math.abs(acomptePaid) > 1e-9 && Math.abs(balanceDueDisplay) > 1e-9) {
      miniRows.push(`<tr class="bar"><td>Pay\u00E9</td><td class="right">${fmtMoney(acomptePaid, cur)}</td></tr>`);
      miniRows.push(`<tr class="bar grand"><th>Solde d\u00FB</th><th class="right">${fmtMoney(balanceDueDisplay, cur)}</th></tr>`);
    }

    const reglementInfo = resolveReglementInfo(meta);
    const reglementStyle = reglementInfo.enabled ? "" : "display:none";
    const reglementHTML = `
      <p id="miniReglement" class="mini-reglement pdf-mini-reglement" style="${reglementStyle}">
        <span class="mini-reglement__label">Conditions de r&egrave;glement :</span>
        <span id="miniReglementValue" class="mini-reglement__value">${esc(reglementInfo.valueText)}</span>
      </p>`;

    const companyVatHTML = buildMetaLine("MF", company.vat);
    const companyCustomsHTML = buildMetaLine("CD", company.customsCode);
    const companyIbanHTML = buildMetaLine("IBAN", company.iban);
    const companyAddressHTML = buildMetaLine("Adresse", company.address, { capitalize: true, preserveNewlines: true });
    const companyEmailHTML = buildMetaLine("Email", company.email);
    const companyPhoneHTML = buildPhoneHTML(company.phone);

    const clientLabelSource = state?.clientFieldLabels || (strictPreview ? {} : (global.DEFAULT_CLIENT_FIELD_LABELS || {}));
    const resolveClientLabel = (key, fallback) => {
      const raw = typeof clientLabelSource?.[key] === "string" ? clientLabelSource[key].trim() : "";
      return raw ? esc(raw) : fallback;
    };
    const clientVisibilitySource =
      state?.clientFieldVisibility || (strictPreview ? {} : (global.DEFAULT_CLIENT_FIELD_VISIBILITY || {}));
    const isClientFieldVisible = (key) => clientVisibilitySource?.[key] !== false;
    const buildClientMetaLine = (key, label, value, options = {}) => {
      if (!isClientFieldVisible(key)) return "";
      return buildMetaLine(label, value, options);
    };
    const buildClientPhoneLine = (key, value, label = "T&eacute;l&eacute;phone") => {
      if (!isClientFieldVisible(key)) return "";
      return buildPhoneHTML(value, label);
    };

    const clientTypeRaw = String(state?.clientType || state?.client?.type || "").toLowerCase();
    const isParticulier = clientTypeRaw === "particulier";
    const idLabel = isParticulier ? "CIN / Passeport" : "MF";

    const clientBenefitHTML = buildClientMetaLine(
      "benefit",
      resolveClientLabel("benefit", "Au profit de"),
      client.benefit
    );
    const clientAccountHTML = buildClientMetaLine(
      "account",
      resolveClientLabel("account", "Pour le compte de"),
      client.account
    );
    const clientIdHTML = buildClientMetaLine("taxId", idLabel, client.vat);
    const clientStegRefHTML = buildClientMetaLine(
      "stegRef",
      resolveClientLabel("stegRef", "Ref STEG"),
      client.stegRef
    );
    const clientAddressHTML = buildClientMetaLine(
      "address",
      resolveClientLabel("address", "Adresse"),
      client.address,
      { capitalize: true, preserveNewlines: true }
    );
    const clientPhoneHTML = buildClientPhoneLine("phone", client.phone, resolveClientLabel("phone", "T&eacute;l&eacute;phone"));
    const clientEmailHTML = buildClientMetaLine("email", resolveClientLabel("email", "Email"), client.email);

    const formattedNotes = formatNoteHTML(state.notes);
    const notesHTML =
      formattedNotes
        ? `<div class="pdf-notes">
             <div class="pdf-notes-title"><span style="font-weight:600">Notes&nbsp;:</span>${formattedNotes}</div>
           </div>`
        : "";

    const whNoteValue = meta?.withholding?.note;
    const safeWhNote = formatNoteHTML(whNoteValue);
    const summaryNoteHTML = hasTextContent(safeWhNote)
      ? `<div class="pdf-footer-note">${safeWhNote}</div>`
      : "";

    const footerNoteRaw =
      meta?.extras?.pdf?.footerNote ??
      meta?.pdf?.footerNote ??
      meta?.footerNote ??
      "";
    const footerNoteSizeRaw =
      meta?.extras?.pdf?.footerNoteSize ??
      meta?.pdf?.footerNoteSize ??
      meta?.footerNoteSize;
    const footerNoteSize = normalizeFooterNoteFontSize(footerNoteSizeRaw);
    const footerNoteHTML = hasVal(footerNoteRaw)
      ? `<div class="doc-design1__footer-note-left pdf-footer-note-left" style="font-size:${footerNoteSize}px">${formatFooterNoteHtml(footerNoteRaw)}</div>`
      : "";

    const amountWordsBlock =
      (showWords || notesHTML)
        ? `<div class="pdf-amount-words">
             ${showWords ? `${wordsHeaderFinal}<br/><strong>${esc(wordsTgtText)}</strong>` : ""}
             ${notesHTML}
           </div>`
        : "";

    const breakdownEntries = Array.from(tvaBreakdownMap.values());
    const hasBreakdownEntries = breakdownEntries.length > 0;
    const includeTvaBreakdown = taxesEnabled && (type === "facture" || type === "fa" || type === "devis" || type === "bl");
    let tvaBreakdownHTML = "";
    if (includeTvaBreakdown) {
      const sortedEntries = hasBreakdownEntries
        ? breakdownEntries.sort((a, b) => {
            if (a.type !== b.type) return a.type === "fodec" ? -1 : 1;
            const ra = Number.isFinite(a.rate) ? a.rate : Number.POSITIVE_INFINITY;
            const rb = Number.isFinite(b.rate) ? b.rate : Number.POSITIVE_INFINITY;
            if (ra !== rb) return ra - rb;
            return (a.label || "").localeCompare(b.label || "");
          })
        : [];
      const totalAmount = sortedEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const rowsHTML = hasBreakdownEntries
        ? sortedEntries.map((entry) => {
            const rowClass = entry.type === "fodec" ? " class=\"tva-breakdown__fodec\"" : "";
            return `<tr${rowClass}>
              <td>${esc(entry.label)}</td>
              <td class="right">${fmtMoney(entry.base, cur)}</td>
              <td class="right">${fmtMoney(entry.amount, cur)}</td>
            </tr>`;
          }).join("")
        : `<tr class="tva-breakdown__empty"><td colspan="3">Aucune taxe \u00E0 afficher</td></tr>`;
      const totalRow = hasBreakdownEntries
        ? `<tr class="tva-breakdown__total">
          <th colspan="2">Total</th>
          <th class="right">${fmtMoney(totalAmount, cur)}</th>
        </tr>`
        : "";
      tvaBreakdownHTML = `
        <div class="tva-breakdown" id="tvaBreakdownCard">
          <table id="tvaBreakdown" class="tva-breakdown__table">
            <thead>
              <tr>
                <th>Taxes</th>
                <th>Bases</th>
                <th>Montants</th>
              </tr>
            </thead>
            <tbody id="tvaBreakdownBody">${rowsHTML}${totalRow}</tbody>
          </table>
        </div>`;
    }
    const summaryMainBlock = includeTvaBreakdown
      ? `<div class="tva-breakdown-wrapper">${tvaBreakdownHTML}${amountWordsBlock}</div>`
      : amountWordsBlock;

    const docHeadHTML = `
        <div class="pdf-head">
          <div class="pdf-logo-wrap">
            ${logo ? `<img src="${logo}" class="pdf-logo" alt="Logo">` : ""}
          </div>
            ${statusBadgeHTML}
          <div class="pdf-head-right">
            <h1 class="pdf-title">${DOC_LABEL}</h1>
            <p class="pdf-date-top">Date&nbsp;: <span>${esc(meta.date || "")}</span></p>
            <p class="pdf-num">${NUM_LABEL} : <span style="font-weight:600">${esc(meta.number || "")}</span></p>
          </div>
        </div>
        <div class="pdf-divider"></div>`;

    const partyLabel = type === "fa" ? "Fournisseur" : "Client";
    const partiesBlockHTML = `
        <div class="pdf-grid-2">
          <div>
            <p style="margin:0;text-transform:uppercase;font-weight:700">${esc(company.name || "")}</p>
            ${companyVatHTML}
            ${companyCustomsHTML}
            ${companyIbanHTML}
            ${companyPhoneHTML}
            ${companyEmailHTML}
            ${companyAddressHTML}
          </div>

          <fieldset class="section-box-pdf">
            <legend style="margin:0;font-weight:700">${partyLabel}</legend>
            ${
              isClientFieldVisible("name")
                ? `<p style="margin:0;font-weight:700; text-transform:capitalize; font-size:14px;">${esc(
                    client.name || ""
                  )}</p>`
                : ""
            }
            ${clientBenefitHTML}
            ${clientAccountHTML}
            ${clientIdHTML}
            ${clientStegRefHTML}
            ${clientPhoneHTML}
            ${clientEmailHTML}
            ${clientAddressHTML}
          </fieldset>
        </div>`;

    const buildSummaryBlock = () => `
        <div class="pdf-summary-row">
          <div class="pdf-summary-left" style="display:flex;flex-direction:column;flex:1;justify-content:space-between;min-height:100%;gap: 10px;">
          ${summaryMainBlock}
            ${summaryNoteHTML}
          </div>
          ${
            showMiniAux
              ? `<div class="pdf-mini-aux" style="display:flex;flex-direction:column;gap:5px;">
            <div class="pdf-mini-sum">
              <table class="pdf-mini-table">
                <tbody>
                  ${miniRows.join("")}
                </tbody>
              </table>
            </div>
            ${reglementHTML}
          </div>`
              : ""
          }
        </div>`;

    const summaryBlockHTML = buildSummaryBlock();
    const footerBlockHTML =
      `
            <div class="pdf-footer">
              ${footerNoteHTML}
              <div class="pdf-sign">
              ${sealOverlayHTML}
              ${signatureOverlayHTML}
              <p class="pdf-sign-line">Signature et cachet</p>
              <p style="margin:0px;font-style:italic;font-size:10px">Merci pour votre confiance&nbsp;!</p>
            </div>
          </div>`;
    const bottomBlockHTML = `<div class="pdf-bottom-wrap">${summaryBlockHTML}${footerBlockHTML}</div>`;
    const summaryBlockHeight = measureSummaryHeight(bottomBlockHTML, templateKey);
    const tableHeightLimits = {
      firstPageMaxHeight: measureTablePageMaxHeight({
        topSectionHTML: `${docHeadHTML}${partiesBlockHTML}`,
        headerHTML: headerRowHTML,
        pageClasses: "first-page no-footer",
        templateKey,
        pageStyleAttr
      }),
      otherPageMaxHeight: measureTablePageMaxHeight({
        topSectionHTML: "",
        headerHTML: headerRowHTML,
        pageClasses: "no-header no-footer",
        templateKey,
        pageStyleAttr
      }),
      firstPageSummaryMaxHeight: measureTablePageMaxHeight({
        topSectionHTML: `${docHeadHTML}${partiesBlockHTML}`,
        bottomSectionHTML: bottomBlockHTML,
        headerHTML: headerRowHTML,
        pageClasses: "first-page last-page",
        templateKey,
        pageStyleAttr
      }),
      otherPageSummaryMaxHeight: measureTablePageMaxHeight({
        topSectionHTML: "",
        bottomSectionHTML: bottomBlockHTML,
        headerHTML: headerRowHTML,
        pageClasses: "no-header last-page",
        templateKey,
        pageStyleAttr
      })
    };
    const paginationOptions = {
      firstPage: {
        topSectionHTML: `${docHeadHTML}${partiesBlockHTML}`,
        headerHTML: headerRowHTML,
        pageClasses: "first-page no-footer",
        templateKey,
        pageStyleAttr
      },
      otherPage: {
        topSectionHTML: "",
        headerHTML: headerRowHTML,
        pageClasses: "no-header no-footer",
        templateKey,
        pageStyleAttr
      },
      bufferPx: TABLE_ROW_FIT_BUFFER
    };

    const rowsPerPageOverride =
      Number(meta?.layout?.rowsPerPage ?? meta?.pagination?.rowsPerPage ?? meta?.rowsPerPage);
    const rowsPerPageLimit = Number.isFinite(rowsPerPageOverride) && rowsPerPageOverride > 0
      ? rowsPerPageOverride
      : null;
    const rowsPerPageFallback = DEFAULT_ROWS_PER_PAGE;

    let rowChunks = chunkRowsByRenderedHeight(rowHtml, headerRowHTML, paginationOptions);
    if (!rowChunks || !rowChunks.length) {
      rowChunks = chunkRowsByVisualHeight(rowHtml, headerRowHTML, tableHeightLimits);
    }
    if (!rowChunks || !rowChunks.length) {
      rowChunks = paginateRows(rowHtml, rowsPerPageLimit || rowsPerPageFallback);
    } else if (rowsPerPageLimit && rowChunks.some((chunk) => chunk.length > rowsPerPageLimit)) {
      rowChunks = rowChunks.flatMap((chunk) =>
        chunk.length > rowsPerPageLimit ? paginateRows(chunk, rowsPerPageLimit) : [chunk]
      );
    }
    if (!rowChunks.length) rowChunks.push([]);

    const chunkHeightsMeta = Array.isArray(rowChunks?._chunkHeights) ? rowChunks._chunkHeights : null;
    const firstPageLimitPx = Number.isFinite(rowChunks?._firstPageLimit) ? rowChunks._firstPageLimit : null;
    const firstChunkHeight = chunkHeightsMeta && chunkHeightsMeta.length ? chunkHeightsMeta[0] : null;
      const shouldAppendSummaryPage = (() => {
        if (!chunkHeightsMeta || !chunkHeightsMeta.length || !rowChunks.length) return false;
        const lastIndex = rowChunks.length - 1;
        const lastChunk = rowChunks[lastIndex];
        if (!Array.isArray(lastChunk) || lastChunk.length === 0) return false;
        const lastHeight = chunkHeightsMeta[lastIndex];
        if (!Number.isFinite(lastHeight)) return false;
        const headerHeight = Number.isFinite(rowChunks?._headerHeight) ? rowChunks._headerHeight : 0;
        const firstChunkTotalHeight = Number.isFinite(firstChunkHeight)
          ? firstChunkHeight + headerHeight
          : null;
        const firstChunkCount = Array.isArray(rowChunks[0]) ? rowChunks[0].length : 0;
        const avgRowHeight = firstChunkCount && Number.isFinite(firstChunkHeight)
          ? firstChunkHeight / firstChunkCount
          : 0;
        const summaryThreshold = FIRST_PAGE_SUMMARY_THRESHOLD_PX;
        if (
          lastIndex === 0 &&
          Number.isFinite(firstChunkTotalHeight) &&
          firstChunkTotalHeight + avgRowHeight >= summaryThreshold
        ) {
          return true;
        }
        const summaryMaxHeight = lastIndex === 0
          ? tableHeightLimits.firstPageSummaryMaxHeight
          : tableHeightLimits.otherPageSummaryMaxHeight;
        const summaryLimit =
        Number.isFinite(summaryMaxHeight) && Number.isFinite(headerHeight)
          ? Math.max(120, summaryMaxHeight - headerHeight - TABLE_HEIGHT_BUFFER)
          : null;
      if (Number.isFinite(summaryLimit)) {
        return lastHeight > summaryLimit;
      }
      const limit = lastIndex === 0
        ? firstPageLimitPx
        : (Number.isFinite(rowChunks?._otherPageLimit) ? rowChunks._otherPageLimit : null);
      if (!Number.isFinite(limit)) return false;
      const remainingSpace = limit - lastHeight;
      if (Number.isFinite(summaryBlockHeight)) {
        return remainingSpace <= summaryBlockHeight + TABLE_HEIGHT_BUFFER;
      }
      return remainingSpace <= SUMMARY_SECOND_PAGE_MIN_SPACE;
    })();

    if (shouldAppendSummaryPage) {
      rowChunks.push([]);
      if (chunkHeightsMeta) chunkHeightsMeta.push(0);
    }

    const pagesHTML = rowChunks.map((chunk, index) => {
      const tableRows = Array.isArray(chunk) ? chunk.join("") : "";
      const includeSummary = index === rowChunks.length - 1;
      const summarySection = includeSummary ? summaryBlockHTML : "";
      const isFirstPage = index === 0;
      const includeFooter = includeSummary;
      const pageClasses = ["pdf-page"];
      if (!includeFooter) pageClasses.push("no-footer");
      if (!isFirstPage) pageClasses.push("no-header");
      if (isFirstPage) pageClasses.push("first-page");
      if (includeSummary) pageClasses.push("last-page");
      const pageClass = pageClasses.join(" ");
      const topSection = isFirstPage ? `${docHeadHTML}${partiesBlockHTML}` : "";
      const footerHTML = includeFooter ? footerBlockHTML : "";
      const bottomSection = includeSummary
        ? `<div class="pdf-bottom-wrap">${summarySection}${footerHTML}</div>`
        : "";
      const pageTemplateAttr = ` data-template="${templateKey}"`;
      return `
      <div class="${pageClass}"${pageTemplateAttr}${pageStyleAttr}>
        ${topSection}
        <div class="tableDiv">
          <table class="pdf-table">
            <thead>
              <tr>${headerRowHTML}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        ${bottomSection}
      </div>`;
    }).join("");

    return pagesHTML;
  }

  function render(state, assets, options = {}) {
    ensurePdfStylesheet();
    const root = ensureRoot(options);
    root.innerHTML = build(state, assets);
    if (!options.stable) scheduleStableRender(state, assets, { root });
  }

  function show(state, assets) {
    render(state, assets);
    document.body.classList.add("printing");
  }

  function hide() {
    document.body.classList.remove("printing");
    const root = document.getElementById("pdfRoot");
    if (root) root.innerHTML = "";
  }

  function cleanup() { hide(); }

  const PDFViewAPI = { build, render, show, hide, cleanup };
  Object.defineProperty(PDFViewAPI, "css", {
    enumerable: true,
    get() { return pdfCssText || ""; },
  });
  global.PDFView = PDFViewAPI;
})(window);
