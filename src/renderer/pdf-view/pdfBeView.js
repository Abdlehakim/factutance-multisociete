/// pdfBeView.js
(function (global) {
  const PDF_CSS_HREF = "./styles/pdf-be-view.css";
  const PDF_CSS_LINK_ID = "pdf-be-view-css";
  const MODEL_ACTIONS_CSS_HREF = "./styles/modelActionsModal.css";

  const electronAssets = global?.electronAPI?.assets || {};
  let pdfCssText = typeof electronAssets.pdfBeCss === "string" ? electronAssets.pdfBeCss : "";
  let cssFetchStarted = false;

  let modelActionsCssText = "";
  let modelCssFetchPromise = null;
  let transformedModelActionsCssText = "";
  let transformedModelActionsCssSource = "";

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const hasText = (value) => String(value ?? "").trim().length > 0;

  function ensurePdfStylesheet() {
    let link = document.getElementById(PDF_CSS_LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = PDF_CSS_LINK_ID;
      link.rel = "stylesheet";
      link.href = PDF_CSS_HREF;
      document.head.appendChild(link);
    }
    if (!link.dataset.pdfBeViewCss) {
      link.dataset.pdfBeViewCss = "ready";
      link.addEventListener("load", capturePdfCssFromStylesheet);
      link.addEventListener("error", requestPdfCssTextFallback);
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

  function capturePdfCssFromStylesheet() {
    if (pdfCssText) return;
    const css = readStyleSheetText((_owner, href) => href.includes("pdf-be-view.css"));
    if (css) {
      pdfCssText = css;
      return;
    }
    requestPdfCssTextFallback();
  }

  function captureModelActionsCssFromStylesheet() {
    if (modelActionsCssText) return;
    const css = readStyleSheetText((_owner, href) => href.includes("modelactionsmodal.css"));
    if (css) {
      modelActionsCssText = css;
      return;
    }
    requestModelActionsCssFallback();
  }

  function requestPdfCssTextFallback() {
    if (pdfCssText || cssFetchStarted || typeof fetch !== "function") return;
    cssFetchStarted = true;
    fetch(PDF_CSS_HREF)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        if (text) pdfCssText = text;
      })
      .catch(() => {});
  }

  function requestModelActionsCssFallback() {
    if (modelActionsCssText || modelCssFetchPromise || typeof fetch !== "function") {
      return modelCssFetchPromise || Promise.resolve();
    }
    modelCssFetchPromise = fetch(MODEL_ACTIONS_CSS_HREF)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        if (text) modelActionsCssText = text;
      })
      .catch(() => {})
      .finally(() => {
        modelCssFetchPromise = null;
      });
    return modelCssFetchPromise;
  }

  function ensurePdfCssReady() {
    ensurePdfStylesheet();
    if (!pdfCssText) {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        capturePdfCssFromStylesheet();
      } else {
        document.addEventListener("DOMContentLoaded", capturePdfCssFromStylesheet, { once: true });
      }
      requestPdfCssTextFallback();
    }

    if (!modelActionsCssText) {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        captureModelActionsCssFromStylesheet();
      } else {
        document.addEventListener("DOMContentLoaded", captureModelActionsCssFromStylesheet, { once: true });
      }
      requestModelActionsCssFallback();
    }
  }

  function waitForPdfCssReady() {
    if (typeof document === "undefined") return Promise.resolve();
    ensurePdfCssReady();
    const link = document.getElementById(PDF_CSS_LINK_ID);
    const linkReadyPromise =
      !link || link.sheet || pdfCssText
        ? Promise.resolve()
        : new Promise((resolve) => {
            const done = () => resolve();
            link.addEventListener("load", done, { once: true });
            link.addEventListener("error", done, { once: true });
          });
    const modelReadyPromise = modelActionsCssText
      ? Promise.resolve()
      : requestModelActionsCssFallback();
    return Promise.all([linkReadyPromise, modelReadyPromise]).then(() => {});
  }

  function transformModelActionsCss(rawCss) {
    if (!rawCss) return "";
    if (rawCss === transformedModelActionsCssSource) return transformedModelActionsCssText;
    transformedModelActionsCssSource = rawCss;
    transformedModelActionsCssText = String(rawCss)
      .replace(/#modelActionsModal\b/g, ".be-model-template")
      .replace(/#modelActionsPreview\b/g, ".be-model-preview-page");
    return transformedModelActionsCssText;
  }

  function getCombinedCssText() {
    ensurePdfCssReady();
    return [pdfCssText || "", transformModelActionsCss(modelActionsCssText || "")]
      .filter(Boolean)
      .join("\n");
  }

  const normalizeDocType = (value) => {
    const raw = String(value || "be").trim().toLowerCase();
    if (["be", "bon_entree", "bon-entree", "bon entree", "bon d'entree"].includes(raw)) return "be";
    return raw || "be";
  };

  const decodeHtmlEntities = (value) => {
    const raw = String(value ?? "");
    if (!/[&<>]/.test(raw) || typeof document === "undefined") return raw;
    const el = document.createElement("textarea");
    el.innerHTML = raw;
    return el.value || raw;
  };

  const parseLooseNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const normalized = raw.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatQtyValue = (value) => {
    const parsed = parseLooseNumber(value);
    if (!Number.isFinite(parsed)) return String(value ?? "").trim();
    return Number.isInteger(parsed) ? String(parsed) : String(parsed).replace(/\.?0+$/, "");
  };

  const normalizeRichText = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/[<>]/.test(raw)) return raw;
    return esc(raw).replace(/\r?\n/g, "<br/>");
  };

  const stripHtmlText = (value) =>
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|\u00a0/gi, " ")
      .trim();

  const normalizeDestinationIds = (value = []) => {
    const source = Array.isArray(value) ? value : [value];
    const seen = new Set();
    return source
      .map((entry) =>
        String(entry ?? "")
          .trim()
          .replace(/^sqlite:\/\/emplacements\//i, "")
      )
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const normalizeDestinationLabels = (value = []) => {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [value];
    return source
      .map((entry) => String(entry ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  };

  function resolveBonEntreeReception(meta = {}) {
    const raw = meta?.beReception && typeof meta.beReception === "object" ? meta.beReception : {};
    const destinationIds = normalizeDestinationIds(
      raw.destinationIds ??
        raw.destinationIdList ??
        raw.destinationSelection?.ids ??
        raw.destinationSelection ??
        raw.destinationId ??
        raw.destinationLocationId ??
        raw.locationId ??
        raw.emplacementId ??
        raw.emplacement_id ??
        meta?.beReceptionDestinationIds ??
        meta?.beReceptionDestinationId ??
        []
    );
    const destinationLabels = normalizeDestinationLabels(
      raw.destinationLabels ??
        raw.destinationLabelList ??
        raw.destinationSelection?.labels ??
        raw.destination ??
        raw.destinationLocation ??
        raw.location ??
        meta?.beReceptionDestination ??
        meta?.beDestination ??
        ""
    );
    const destination =
      String(
        raw.destination ??
          raw.destinationLocation ??
          raw.location ??
          meta?.beReceptionDestination ??
          meta?.beDestination ??
          ""
      ).trim() || destinationLabels.join(", ");

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

    return {
      depot: String(raw.depot ?? raw.depotName ?? meta?.beReceptionDepot ?? meta?.beDepot ?? "").trim(),
      destination,
      destinationIds,
      destinationLabels,
      date: String(raw.date ?? raw.receptionDate ?? meta?.beReceptionDate ?? meta?.date ?? "").trim(),
      time: String(raw.time ?? raw.receptionTime ?? meta?.beReceptionTime ?? "").trim(),
      sourceRef,
      transporter: String(raw.transporter ?? raw.transporteur ?? meta?.beTransporter ?? "").trim(),
      driverName: String(raw.driverName ?? raw.chauffeur ?? meta?.beDriverName ?? "").trim(),
      vehiclePlate: String(raw.vehiclePlate ?? raw.vehicle ?? raw.matriculeVehicule ?? meta?.beVehiclePlate ?? "").trim()
    };
  }

  const pickFirstValue = (source, keys = []) => {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source || {}, key) && source[key] != null) {
        const value = source[key];
        if (typeof value === "string") {
          if (value.trim()) return value;
        } else {
          return value;
        }
      }
    }
    return "";
  };

  const normalizePreviewItem = (raw = {}) => {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      ref: String(pickFirstValue(source, ["ref", "reference", "code", "sku"]) || "").trim(),
      product: String(
        pickFirstValue(source, ["product", "designation", "name", "label", "article"]) || ""
      ).trim(),
      desc: String(pickFirstValue(source, ["desc", "description", "detail", "details"]) || "").trim(),
      qty: pickFirstValue(source, ["qty", "quantity", "qte", "quantite"]),
      unit: String(pickFirstValue(source, ["unit", "unite"]) || "").trim()
    };
  };

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
    beTransporter: true,
    beDriverName: true,
    beVehiclePlate: true,
    purchasePrice: false,
    purchaseTva: false,
    purchaseDiscount: false,
    price: true,
    fodec: true,
    fodecSale: true,
    fodecPurchase: false,
    tva: true,
    discount: true,
    totalPurchaseHt: false,
    totalHt: true,
    totalPurchaseTtc: false,
    totalTtc: true
  };

  function resolveColumnVisibilityMap(state = {}, { strictPreview = false } = {}) {
    const meta = state?.meta || {};
    const modelColumns = meta && typeof meta.modelColumns === "object" ? meta.modelColumns : null;
    const savedColumns = meta && typeof meta.columns === "object" ? meta.columns : null;
    const sourceColumns = strictPreview ? (savedColumns || modelColumns || {}) : (modelColumns || savedColumns || {});
    const visibility = { ...COLUMN_VISIBILITY_DEFAULTS };
    if (sourceColumns && typeof sourceColumns === "object") {
      Object.entries(sourceColumns).forEach(([key, value]) => {
        visibility[key] = value !== false;
      });
    }
    return visibility;
  }

  const ARTICLE_FIELD_LABEL_DEFAULTS = {
    ref: "R\u00e9f.",
    product: "D\u00e9signation(s)",
    desc: "Description(s)",
    qty: "Qt\u00e9",
    unit: "Unit\u00e9"
  };

  function resolveArticleLabels(state = {}, { strictPreview = false } = {}) {
    const defaults = { ...ARTICLE_FIELD_LABEL_DEFAULTS };
    if (!strictPreview && global?.DEFAULT_ARTICLE_FIELD_LABELS && typeof global.DEFAULT_ARTICLE_FIELD_LABELS === "object") {
      Object.entries(defaults).forEach(([key, fallback]) => {
        const override = global.DEFAULT_ARTICLE_FIELD_LABELS?.[key];
        defaults[key] = hasText(override) ? decodeHtmlEntities(String(override).trim()) : fallback;
      });
    }

    const fromState = state?.meta?.articleFieldLabels;
    const fromHelper =
      !strictPreview && typeof global?.SEM?.__bindingHelpers?.getArticleFieldLabels === "function"
        ? global.SEM.__bindingHelpers.getArticleFieldLabels()
        : null;
    const source = fromState && typeof fromState === "object" ? fromState : fromHelper;

    const resolved = { ...defaults };
    if (source && typeof source === "object") {
      Object.entries(resolved).forEach(([key, fallback]) => {
        const candidate = source?.[key];
        resolved[key] = hasText(candidate) ? decodeHtmlEntities(String(candidate).trim()) : fallback;
      });
    }
    return resolved;
  }

  function resolveTemplateKey(state = {}) {
    const raw = String(state?.meta?.template || state?.template || "template1")
      .trim()
      .toLowerCase();
    if (raw === "template2") return "template2";
    return "template1";
  }

  function cloneTemplatePreviewPage(templateKey) {
    const candidateIds = [
      `modelTemplateSource-${templateKey}`,
      "modelTemplateSource-template1"
    ];
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
          <h1 class="doc-design1__title" id="modelPreviewDoc">Bon d'entree</h1>
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

  function setText(page, id, value, fallback = "") {
    const node = page?.querySelector?.(`#${id}`);
    if (!node) return;
    node.textContent = hasText(value) ? String(value).trim() : String(fallback ?? "");
  }

  function setHtml(page, id, html, fallback = "") {
    const node = page?.querySelector?.(`#${id}`);
    if (!node) return;
    node.innerHTML = hasText(stripHtmlText(html)) ? String(html) : String(fallback ?? "");
  }

  function setNodeVisibility(node, visible) {
    if (!node) return;
    const show = !!visible;
    node.hidden = !show;
    node.style.display = show ? "" : "none";
    node.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function normalizeNoteSize(sizeValue) {
    const parsed = Number.parseInt(sizeValue, 10);
    return [10, 12, 14].includes(parsed) ? parsed : 12;
  }

  function ensureSizedNoteHtml(htmlValue, sizeValue) {
    const html = String(htmlValue || "");
    if (!hasText(stripHtmlText(html))) return "";
    const size = normalizeNoteSize(sizeValue);
    if (/data-size="/i.test(html)) return html;
    return `<div data-size="${size}" data-size-root="true" style="font-size:${size}px">${html}</div>`;
  }

  function applyCompanyAndSupplier(page, state) {
    const company = state?.company && typeof state.company === "object" ? state.company : {};
    const supplier = state?.client && typeof state.client === "object" ? state.client : {};

    setText(page, "modelPreviewCompanyName", company.name || "-", "-");
    setText(page, "modelPreviewCompanyMf", company.vat || company.mf || "-", "-");
    setText(page, "modelPreviewCompanyPhone", company.phone || "-", "-");
    setText(page, "modelPreviewCompanyEmail", company.email || "-", "-");
    setText(page, "modelPreviewCompanyAddress", company.address || "-", "-");

    const partyLegend =
      page.querySelector('[data-model-preview-party-legend]') ||
      page.querySelector(".doc-design1__section > legend");
    if (partyLegend) partyLegend.textContent = "Fournisseur";

    const partySection = partyLegend?.closest("fieldset") || page.querySelector(".doc-design1__grid fieldset.doc-design1__section");
    const partyName = partySection?.querySelector(".doc-design1__client-name");
    if (partyName) partyName.textContent = hasText(supplier.name) ? String(supplier.name).trim() : "-";

    const lines = partySection ? Array.from(partySection.querySelectorAll(".doc-design1__meta-line")) : [];
    const supplierValues = [
      supplier.vat || supplier.mf || "-",
      supplier.phone || "-",
      supplier.email || "-",
      supplier.address || "-"
    ];
    lines.forEach((line, index) => {
      const valueNode = line.querySelector(".doc-design1__meta-value");
      if (!valueNode) return;
      valueNode.textContent = hasText(supplierValues[index]) ? String(supplierValues[index]).trim() : "-";
    });
  }

  function applyHeader(page, state, assets) {
    const meta = state?.meta && typeof state.meta === "object" ? state.meta : {};
    const reception = resolveBonEntreeReception(meta);
    const docType = normalizeDocType(meta.docType || "be");
    const title = docType === "be" ? "Bon d'entree" : "Document";
    const date = String(meta.date || reception.date || "").trim();
    const number = String(meta.number || "").trim();

    setText(page, "modelPreviewDoc", title, title);
    setText(page, "modelPreviewDate", date, "");
    setText(page, "modelPreviewNumber", number, "");

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

  function applyTable(page, state, visibility, labels) {
    const table = page?.querySelector?.(".doc-design1__table");
    if (!table) return;

    const headerCells = Array.from(table.querySelectorAll("thead th[data-col]"));
    if (!headerCells.length) return;

    const allColumns = headerCells
      .map((cell) => String(cell.dataset?.col || "").trim())
      .filter(Boolean);
    const generalColumns = new Set(["ref", "product", "desc", "qty", "unit"]);
    const visibleByColumn = {};
    allColumns.forEach((column) => {
      visibleByColumn[column] = generalColumns.has(column) && visibility[column] !== false;
    });

    const labelByColumn = {
      ref: labels.ref,
      product: labels.product,
      desc: labels.desc,
      qty: labels.qty,
      unit: labels.unit
    };

    headerCells.forEach((cell) => {
      const column = String(cell.dataset?.col || "").trim();
      if (!column) return;
      if (Object.prototype.hasOwnProperty.call(labelByColumn, column)) {
        cell.textContent = labelByColumn[column];
      }
      setNodeVisibility(cell, visibleByColumn[column] !== false);
    });

    const body = table.querySelector("tbody");
    if (!body) return;
    body.innerHTML = "";

    const items = Array.isArray(state?.items) ? state.items.map((item) => normalizePreviewItem(item)) : [];
    const rows = items.length ? items : [{}];

    rows.forEach((item) => {
      const row = document.createElement("tr");
      allColumns.forEach((column) => {
        const cell = document.createElement("td");
        cell.dataset.col = column;
        const header = headerCells.find((h) => String(h.dataset?.col || "").trim() === column);
        if (header?.className) cell.className = header.className;
        let value = "";
        if (column === "ref") value = String(item.ref || "").trim();
        else if (column === "product") value = String(item.product || "").trim();
        else if (column === "desc") value = String(item.desc || "").trim();
        else if (column === "qty") value = formatQtyValue(item.qty);
        else if (column === "unit") value = String(item.unit || "").trim();
        else value = "";
        cell.textContent = value;
        if (!hasText(value)) cell.innerHTML = "&nbsp;";
        setNodeVisibility(cell, visibleByColumn[column] !== false);
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
      if (!cell) return false;
      if (cell.hidden) return false;
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

  function applyBonEntreeContext(page, state, visibility) {
    const meta = state?.meta && typeof state.meta === "object" ? state.meta : {};
    const reception = resolveBonEntreeReception(meta);
    const previewDate = String(meta.date || reception.date || "").trim();

    setText(page, "modelPreviewBeDepot", reception.depot, "");
    setText(page, "modelPreviewBeDestination", reception.destination, "");
    setText(page, "modelPreviewBeReceptionDate", reception.date || previewDate, "");
    setText(page, "modelPreviewBeReceptionTime", reception.time, "");
    setText(page, "modelPreviewBeSourceRef", reception.sourceRef, "");

    setText(page, "modelPreviewBeTransporter", reception.transporter, "");
    setText(page, "modelPreviewBeDriverName", reception.driverName, "");
    setText(page, "modelPreviewBeVehiclePlate", reception.vehiclePlate, "");

    const beFieldRows = {
      beDepot: page.querySelector("#modelPreviewBeDepotRow"),
      beDestination: page.querySelector("#modelPreviewBeDestinationRow"),
      beReceptionDate: page.querySelector("#modelPreviewBeReceptionDateRow"),
      beReceptionTime: page.querySelector("#modelPreviewBeReceptionTimeRow"),
      beSourceRef: page.querySelector("#modelPreviewBeSourceRefRow")
    };

    Object.entries(beFieldRows).forEach(([key, node]) => {
      setNodeVisibility(node, visibility[key] !== false);
    });

    const beTransportRows = {
      beTransporter: page.querySelector("#modelPreviewBeTransporterRow"),
      beDriverName: page.querySelector("#modelPreviewBeDriverNameRow"),
      beVehiclePlate: page.querySelector("#modelPreviewBeVehiclePlateRow")
    };
    const transportValues = {
      beTransporter: reception.transporter,
      beDriverName: reception.driverName,
      beVehiclePlate: reception.vehiclePlate
    };
    Object.entries(beTransportRows).forEach(([key, node]) => {
      const show = visibility[key] !== false && hasText(transportValues[key]);
      setNodeVisibility(node, show);
    });

    const beTransportSection = page.querySelector("#modelPreviewBeTransportSection");
    const showTransportSection = Object.keys(beTransportRows).some((key) => {
      const row = beTransportRows[key];
      return !!row && !row.hidden && row.style.display !== "none";
    });
    setNodeVisibility(beTransportSection, showTransportSection);

    const beContext = page.querySelector("#modelPreviewBeContext");
    const showContext =
      Object.values(beFieldRows).some((row) => row && !row.hidden && row.style.display !== "none") ||
      showTransportSection;
    setNodeVisibility(beContext, showContext);
  }

  function applyBonEntreeBottom(page, state) {
    const meta = state?.meta && typeof state.meta === "object" ? state.meta : {};
    const pdfOptions = meta?.extras?.pdf && typeof meta.extras.pdf === "object" ? meta.extras.pdf : {};

    const beBottom = page.querySelector("#modelPreviewBeBottom");
    const bsBottom = page.querySelector("#modelPreviewBsBottom");
    const bsContext = page.querySelector("#modelPreviewBsContext");
    const summary = page.querySelector("#modelPreviewInvoiceSummary");
    const footer = page.querySelector("#modelPreviewInvoiceFooter");
    setNodeVisibility(bsContext, false);
    setNodeVisibility(bsBottom, false);
    setNodeVisibility(summary, false);
    setNodeVisibility(footer, false);

    const beRemarksNode = page.querySelector("#modelPreviewBeRemarks");
    const remarksRaw =
      pdfOptions.beRemarks ?? meta?.pdf?.beRemarks ?? meta?.beRemarks ?? "";
    const remarksSource = hasText(stripHtmlText(remarksRaw))
      ? String(remarksRaw)
      : "";
    const remarksSize = normalizeNoteSize(
      pdfOptions.beRemarksSize ?? meta?.pdf?.beRemarksSize ?? meta?.beRemarksSize
    );
    const remarksHtml = ensureSizedNoteHtml(normalizeRichText(remarksSource), remarksSize);
    setHtml(page, "modelPreviewBeRemarks", remarksHtml, "");

    const remarksSection = beRemarksNode?.closest("fieldset");
    const hasRemarks = hasText(stripHtmlText(remarksHtml));
    setNodeVisibility(remarksSection, hasRemarks);

    const approvalConfig = [
      {
        blockId: "modelPreviewBeReceivedByBlock",
        nameId: "modelPreviewBeReceivedBy",
        show: pdfOptions.showBeReceivedBy !== false,
        value:
          pdfOptions.beReceivedByName ??
          pdfOptions.receivedByName ??
          meta?.beReceivedByName ??
          ""
      },
      {
        blockId: "modelPreviewBeControlledByBlock",
        nameId: "modelPreviewBeControlledBy",
        show: pdfOptions.showBeControlledBy !== false,
        value:
          pdfOptions.beControlledByName ??
          pdfOptions.controlledByName ??
          meta?.beControlledByName ??
          ""
      },
      {
        blockId: "modelPreviewBeValidatedByBlock",
        nameId: "modelPreviewBeValidatedBy",
        show: pdfOptions.showBeValidatedBy !== false,
        value:
          pdfOptions.beValidatedByName ??
          pdfOptions.validatedByName ??
          meta?.beValidatedByName ??
          ""
      }
    ];

    const approvalsContainer = page.querySelector("#modelPreviewBeApprovals");
    let visibleApprovals = 0;
    approvalConfig.forEach((entry) => {
      const block = page.querySelector(`#${entry.blockId}`);
      const nameNode = page.querySelector(`#${entry.nameId}`);
      if (nameNode) {
        const fallbackName = String(nameNode.dataset?.default || nameNode.textContent || "").trim();
        nameNode.textContent = hasText(entry.value) ? String(entry.value).trim() : fallbackName;
      }
      const show = entry.show !== false;
      setNodeVisibility(block, show);
      if (show) visibleApprovals += 1;
    });

    if (approvalsContainer) {
      if (visibleApprovals > 0) approvalsContainer.dataset.visibleCount = String(visibleApprovals);
      else delete approvalsContainer.dataset.visibleCount;
    }
    setNodeVisibility(approvalsContainer, visibleApprovals > 0);
    setNodeVisibility(beBottom, hasRemarks || visibleApprovals > 0);
  }

  function applyBonEntreeMode(page) {
    if (!page) return;
    page.classList.add("doc-design1--be");
    page.classList.remove("doc-design1--bs");
    page.dataset.previewDocType = "be";
  }

  function buildTemplateBoundPage(state, assets) {
    const templateKey = resolveTemplateKey(state);
    const page = cloneTemplatePreviewPage(templateKey) || createFallbackPreviewPage();
    page.classList.add("be-model-preview-page");
    page.removeAttribute("id");

    const meta = state?.meta && typeof state.meta === "object" ? state.meta : {};
    const strictPreview = meta?.__pdfPreviewStrict === true;
    const headerColor = String(meta?.itemsHeaderColor || "").trim() || "#15335e";
    page.style.setProperty("--items-head-bg", headerColor);

    applyBonEntreeMode(page);
    applyHeader(page, state, assets);
    applyCompanyAndSupplier(page, state);

    const visibility = resolveColumnVisibilityMap(state, { strictPreview });
    const labels = resolveArticleLabels(state, { strictPreview });
    applyTable(page, state, visibility, labels);
    applyBonEntreeContext(page, state, visibility);
    applyBonEntreeBottom(page, state);

    return { page, templateKey };
  }

  function build(state, assets) {
    ensurePdfCssReady();
    const st = state && typeof state === "object" ? state : {};
    const { page, templateKey } = buildTemplateBoundPage(st, assets || {});

    const shell = document.createElement("div");
    shell.className = "be-model-template";

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

    return shell.outerHTML;
  }

  function render(state, assets, options = {}) {
    ensurePdfCssReady();
    const root = options?.root || document.getElementById("bePdfRoot");
    if (!root) return;
    root.innerHTML = build(state, assets);
  }

  function cleanup(options = {}) {
    const root = options?.root || document.getElementById("bePdfRoot");
    if (root) root.innerHTML = "";
  }

  const PDFBeViewAPI = {
    build,
    render,
    cleanup,
    ready: waitForPdfCssReady
  };

  Object.defineProperty(PDFBeViewAPI, "css", {
    enumerable: true,
    get() {
      return getCombinedCssText();
    }
  });

  global.PDFBeView = PDFBeViewAPI;
})(window);
