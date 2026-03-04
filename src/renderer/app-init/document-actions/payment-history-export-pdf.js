(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const safeHtml = (value) => {
    if (typeof w.escapeHTML === "function") return w.escapeHTML(String(value ?? ""));
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const readCssVarValue = (name, fallback = "") => {
    if (!name || typeof document === "undefined") return fallback;
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
      const value = String(raw || "").trim();
      return value || fallback;
    } catch {
      return fallback;
    }
  };

  const getCssTextFromStylesheet = (needle) => {
    if (!needle || typeof document === "undefined") return "";
    try {
      const sheets = Array.from(document.styleSheets || []);
      const sheet = sheets.find((s) => typeof s?.href === "string" && s.href.includes(needle));
      if (!sheet || !sheet.cssRules) return "";
      return Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
    } catch {
      return "";
    }
  };

  const buildPaymentHistoryExportCss = () => {
    const assets = w.electronAPI?.assets || {};
    const pdfCss =
      (w.PDFView && typeof w.PDFView.css === "string" && w.PDFView.css) ||
      (typeof assets.pdfCss === "string" ? assets.pdfCss : "") ||
      getCssTextFromStylesheet("pdf-view.css");
    const tableCss = getCssTextFromStylesheet("table-and-totals.css");
    const reportCss = getCssTextFromStylesheet("report-tax.css");
    const primary = readCssVarValue("--primary", "#1d4ed8");
    const itemsHead = readCssVarValue("--items-head-bg", primary || "#1d4ed8");
    const rootVars = `:root{--primary:${primary};--items-head-bg:${itemsHead};}`;
    const localCss = `
      .payment-history-export-preview {
        display: block;
      }
      .payment-history-export-preview .pdf-page {
        width: 210mm;
        min-height: 296.5mm;
        height: auto;
        display: block;
        overflow: visible;
        page-break-inside: auto;
        break-inside: auto;
        page-break-after: auto;
        break-after: auto;
      }
      .payment-history-export-preview .report-tax-preview__heading,
      .payment-history-export-preview .payment-history-export-preview__meta {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .payment-history-export-preview__meta {
        margin-bottom: 10px;
      }
      .payment-history-export-preview__table-wrap {
        width: 100%;
        overflow: visible;
        page-break-inside: auto;
        break-inside: auto;
      }
      .payment-history-export-preview__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .payment-history-export-preview__table tbody {
        font-size: 11px;
      }
      .payment-history-export-preview__table thead {
        display: table-header-group;
      }
      .payment-history-export-preview__table th,
      .payment-history-export-preview__table td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        font-size: 11px;
        line-height: 1.3;
        vertical-align: top;
      }
      .payment-history-export-preview__table tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .payment-history-export-preview__table thead th {
        background: #eff6ff;
        color: #0f172a;
        text-align: left;
      }
      .payment-history-export-preview__table .is-right {
        text-align: right;
      }
      .payment-history-export-preview__table .is-center {
        text-align: center;
      }
      .payment-history-export-preview__empty td {
        text-align: center;
        color: #64748b;
      }
    `;
    return [rootVars, pdfCss, tableCss, reportCss, localCss].filter(Boolean).join("\n");
  };

  const buildRowsHtml = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      return `
        <tr class="payment-history-export-preview__empty">
          <td colspan="6">Aucun paiement pour cette periode.</td>
        </tr>
      `;
    }

    return list
      .map(
        (row) => `
          <tr>
            <td>${safeHtml(row.invoiceNumber || "-")}</td>
            <td>${safeHtml(row.client || "-")}</td>
            <td class="is-center">${safeHtml(row.paymentDate || "-")}</td>
            <td>${safeHtml(row.paymentRef || "-")}</td>
            <td>${safeHtml(row.paymentMode || "-")}</td>
            <td class="is-right">${safeHtml(row.amountLabel || "-")}</td>
          </tr>
        `
      )
      .join("");
  };

  const buildPaymentHistoryExportHtml = (snapshot = {}) => {
    const company = snapshot.company || {};
    const companyName = safeHtml(company?.name || "Societe");
    const companyVat = safeHtml(company?.vat || "");
    const companyPhone = safeHtml(company?.phone || "");
    const companyEmail = safeHtml(company?.email || "");
    const companyAddress = safeHtml(company?.address || "").replace(/\n/g, "<br>");
    const startDate = safeHtml(snapshot.startDate || "-");
    const endDate = safeHtml(snapshot.endDate || "-");
    const rowCount = Number.isFinite(Number(snapshot.rowCount)) ? Number(snapshot.rowCount) : 0;
    const totalAmountLabel = safeHtml(snapshot.totalAmountLabel || "0.000");
    const rowsHtml = buildRowsHtml(snapshot.rows);

    return `
      <div class="pdf-preview-root report-tax-preview__root payment-history-export-preview">
        <div class="pdf-page report-tax-preview__page">
          <div class="report-tax-preview__heading">
            <h1 class="pdf-title report-tax-preview__title">Historique paiements</h1>
          </div>
          <div class="pdf-divider"></div>
          <div class="pdf-grid-2 report-tax-preview__meta payment-history-export-preview__meta">
            <div class="report-tax-preview__company">
              <p class="report-tax-preview__company-name">${companyName}</p>
              ${
                companyVat
                  ? `
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">MF :</span>
                  <span class="pdf-meta-value">${companyVat}</span>
                </p>
              `
                  : ""
              }
              ${
                companyPhone
                  ? `
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">Telephone :</span>
                  <span class="pdf-meta-value" style="white-space:pre-line">${companyPhone}</span>
                </p>
              `
                  : ""
              }
              ${
                companyEmail
                  ? `
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">Email :</span>
                  <span class="pdf-meta-value">${companyEmail}</span>
                </p>
              `
                  : ""
              }
              ${
                companyAddress
                  ? `
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">Adresse :</span>
                  <span class="pdf-meta-value" style="white-space:pre-line">${companyAddress}</span>
                </p>
              `
                  : ""
              }
            </div>
            <div class="report-tax-preview__period">
              <p class="pdf-small pdf-meta-line">
                <span class="pdf-meta-label">Periode :</span>
                <span class="pdf-meta-value">Du ${startDate} au ${endDate}</span>
              </p>
              <p class="pdf-small pdf-meta-line">
                <span class="pdf-meta-label">Paiements :</span>
                <span class="pdf-meta-value">${safeHtml(String(rowCount))}</span>
              </p>
              <p class="pdf-small pdf-meta-line">
                <span class="pdf-meta-label">Total :</span>
                <span class="pdf-meta-value">${totalAmountLabel}</span>
              </p>
            </div>
          </div>
          <div class="payment-history-export-preview__table-wrap">
            <table class="payment-history-export-preview__table">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Client</th>
                  <th class="is-center">Date</th>
                  <th>Reference</th>
                  <th>Mode</th>
                  <th class="is-right">Montant</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  const showDialogMessage = async (message, title = "Export PDF") => {
    const text = String(message || "").trim();
    if (!text) return;
    if (typeof w.showDialog === "function") {
      await w.showDialog(text, { title });
      return;
    }
    if (typeof w.alert === "function") w.alert(text);
  };

  const showToastMessage = (message) => {
    if (typeof w.showToast !== "function") return;
    w.showToast(String(message || ""));
  };

  const resolveExportPdfName = (res, fallbackName) => {
    let name = "";
    if (res && typeof res.name === "string") name = res.name.trim();
    if (!name && res && typeof res.path === "string") {
      const parts = res.path.split(/[\\/]/);
      name = parts[parts.length - 1] || "";
    }
    if (!name && fallbackName) name = String(fallbackName).trim();
    if (name && !name.toLowerCase().endsWith(".pdf")) name = `${name}.pdf`;
    return name;
  };

  const resolvePaymentHistoryPdfDir = async () => {
    if (w.electronAPI?.getClientStatementPdfDir) {
      try {
        const res = await w.electronAPI.getClientStatementPdfDir();
        if (res?.ok && res.path) return res.path;
      } catch (err) {
        console.warn("client statement dir resolve failed", err);
      }
    }
    if (w.electronAPI?.getReportTaxPdfDir) {
      try {
        const res = await w.electronAPI.getReportTaxPdfDir();
        if (res?.ok && res.path) return res.path;
      } catch (err) {
        console.warn("report tax dir resolve failed", err);
      }
    }
    return "";
  };

  const buildPaymentHistoryFilename = (startDate, endDate, index) => {
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const start = String(startDate || fallbackDate).trim() || fallbackDate;
    const end = String(endDate || start).trim() || start;
    const safeIndex =
      Number.isFinite(Number(index)) && Number(index) > 0 ? Math.floor(Number(index)) : 1;
    return `RPH-${start}-${end}-${safeIndex}`;
  };

  const exportPaymentHistoryPdf = async ({ snapshot = {} } = {}) => {
    if (!w.electronAPI?.exportPDFFromHTML) {
      await showDialogMessage("Export PDF indisponible.", "Export PDF");
      return { ok: false, error: "Export PDF indisponible." };
    }
    if (!Array.isArray(snapshot.rows) || !snapshot.rows.length) {
      await showDialogMessage("Aucune donnee a exporter.", "Export PDF");
      return { ok: false, error: "Aucune donnee a exporter." };
    }

    const saveDir = await resolvePaymentHistoryPdfDir();
    if (!saveDir) {
      await showDialogMessage("Impossible de preparer le dossier d'export.", "Export PDF");
      return { ok: false, error: "Dossier d'export introuvable." };
    }

    const html = buildPaymentHistoryExportHtml(snapshot);
    const css = buildPaymentHistoryExportCss();
    let index = 1;
    let res = null;
    while (index <= 999) {
      const filename = buildPaymentHistoryFilename(snapshot.startDate, snapshot.endDate, index);
      try {
        res = await w.electronAPI.exportPDFFromHTML({
          html,
          css,
          meta: {
            filename,
            silent: true,
            saveDir,
            docType: "rapportclient"
          }
        });
      } catch (err) {
        res = { ok: false, error: String(err?.message || err) };
      }

      if (res?.ok) {
        const displayName = resolveExportPdfName(res, filename);
        showToastMessage(displayName ? `Rapport PDF cree : ${displayName}` : "Rapport PDF cree.");
        return { ok: true, path: res.path || "", name: displayName || "" };
      }
      if (res?.reason === "exists") {
        index += 1;
        continue;
      }
      if (res?.canceled) {
        return { ok: false, canceled: true };
      }
      await showDialogMessage(res?.error || "Impossible d'exporter le rapport.", "Export PDF");
      return { ok: false, error: res?.error || "Export impossible." };
    }

    await showDialogMessage("Trop de rapports existent deja pour cette periode.", "Export PDF");
    return { ok: false, error: "Limite de noms atteinte." };
  };

  AppInit.PaymentHistoryExportPdf = {
    buildPaymentHistoryExportCss,
    buildPaymentHistoryExportHtml,
    exportPaymentHistoryPdf
  };
})(window);
