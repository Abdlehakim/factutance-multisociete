(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerSalesTaxReportActions = function registerSalesTaxReportActions() {
    const SEM = (w.SEM = w.SEM || {});
    if (SEM.__salesTaxReportBound) return;
    SEM.__salesTaxReportBound = true;

    const getElSafe =
      typeof getEl === "function"
        ? getEl
        : (id) => (typeof document !== "undefined" ? document.getElementById(id) : null);

    const safeHtml =
      typeof escapeHTML === "function" ? escapeHTML : (value) => String(value ?? "");
    const formatMoneySafe =
      typeof w.formatMoney === "function"
        ? (value, currency) => w.formatMoney(value, currency)
        : (value, currency) => {
            const num = Number(value || 0);
            const formatted = num.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            return currency ? `${formatted} ${currency}` : formatted;
          };
    const formatPctSafe =
      typeof w.formatPct === "function"
        ? (value) => w.formatPct(value)
        : (value) => {
            const num = Number(value || 0);
            return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
          };

    const reportTaxState = {
      overlay: null,
      content: null,
      title: null,
      closeBtn: null,
      closeFooterBtn: null,
      exportBtn: null,
      printBtn: null,
      openFolderBtn: null,
      lastExportPath: "",
      isOpen: false,
      previousFocus: null,
      loading: false,
      error: "",
      startDate: "",
      endDate: "",
      invoiceCount: 0,
      currency: "",
      fodecLabel: "FODEC",
      fodecRows: [],
      tvaRows: [],
      reportType: "paid-only",
      requestId: 0
    };

    const normalizeIsoDate = (value) => {
      const raw = String(value || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
      const parsed = new Date(`${raw}T00:00:00`);
      if (!parsed || Number.isNaN(parsed.getTime())) return "";
      return raw;
    };

    const isDateInRange = (value, startDate, endDate) => {
      const iso = normalizeIsoDate(value);
      if (!iso) return false;
      if (startDate && iso < startDate) return false;
      if (endDate && iso > endDate) return false;
      return true;
    };

    const normalizeStatusValue = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return "";
      const normalized = raw.normalize ? raw.normalize("NFD") : raw;
      return normalized.replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    };
    const PAID_STATUS_VALUES = new Set([
      "payee",
      "paye",
      "payees",
      "payes",
      "partiellementpayee",
      "partiellementpaye",
      "partiellementpayees",
      "partiellementpayes"
    ]);
    const UNPAID_STATUS_VALUES = new Set([
      "pasencorepayer",
      "impayee",
      "impaye"
    ]);
    const PAID_OR_UNPAID_STATUS_VALUES = new Set([
      ...PAID_STATUS_VALUES,
      ...UNPAID_STATUS_VALUES
    ]);
    const isAllowedStatus = (value, reportType) => {
      const normalized = normalizeStatusValue(value);
      if (!normalized) return false;
      const allowUnpaid = reportType === "paid-and-unpaid";
      const set = allowUnpaid ? PAID_OR_UNPAID_STATUS_VALUES : PAID_STATUS_VALUES;
      return set.has(normalized);
    };
    const resolveReportStatus = (entry, raw) => {
      const data = pickReportInvoiceData(raw);
      const meta =
        (data && typeof data.meta === "object" && data.meta) ||
        (raw && typeof raw.meta === "object" && raw.meta) ||
        {};
      return meta?.status || entry?.status || "";
    };

    const pickReportInvoiceData = (raw) =>
      raw && typeof raw === "object"
        ? (raw.data && typeof raw.data === "object" ? raw.data : raw)
        : {};

    const cloneReportInvoiceData = (raw) => {
      try {
        return JSON.parse(JSON.stringify(pickReportInvoiceData(raw) || {}));
      } catch {
        const src = pickReportInvoiceData(raw) || {};
        return { ...src };
      }
    };

    const ensureReportStateDefaults = (target = {}) => {
      const st = target && typeof target === "object" ? target : {};
      if (!Array.isArray(st.items)) st.items = [];
      if (typeof st.meta !== "object" || !st.meta) st.meta = {};
      if (typeof st.company !== "object" || !st.company) st.company = {};
      if (typeof st.client !== "object" || !st.client) st.client = {};
      if (typeof st.meta.extras !== "object" || !st.meta.extras) {
        st.meta.extras = { shipping: {}, dossier: {}, deplacement: {}, stamp: {} };
      } else {
        st.meta.extras.shipping = st.meta.extras.shipping || {};
        st.meta.extras.stamp = st.meta.extras.stamp || {};
      }
      if (typeof st.meta.addForm !== "object" || !st.meta.addForm) st.meta.addForm = {};
      if (typeof st.meta.addForm.fodec !== "object" || !st.meta.addForm.fodec) {
        st.meta.addForm.fodec = { enabled: false, label: "FODEC", rate: 1, tva: 19 };
      }
      return st;
    };

    const computeTotalsForReportSnapshot = (snapshot, fallbackTotals = null) => {
      const sem = w.SEM;
      if (!sem || typeof sem.computeTotalsReturn !== "function") return fallbackTotals;
      const originalState = sem.state;
      if (originalState === snapshot) {
        return sem.computeTotalsReturn();
      }
      let totals = fallbackTotals || null;
      try {
        sem.state = snapshot;
        totals = sem.computeTotalsReturn();
      } catch (err) {
        console.warn("computeTotalsForReportSnapshot failed", err);
      } finally {
        if (sem.state !== originalState) sem.state = originalState;
      }
      return totals;
    };

    const resolveReportTotals = (raw) => {
      const data = pickReportInvoiceData(raw);
      const directTotals =
        (data && typeof data.totals === "object" && data.totals) ||
        (raw && typeof raw.totals === "object" && raw.totals) ||
        null;
      const hasBreakdown =
        directTotals &&
        (Array.isArray(directTotals.tvaBreakdown) ||
          (directTotals.extras &&
            (directTotals.extras.fodecEnabled ||
              Array.isArray(directTotals.extras.fodecBreakdown))));
      if (hasBreakdown) return directTotals;
      const snapshot = ensureReportStateDefaults(cloneReportInvoiceData(raw));
      return computeTotalsForReportSnapshot(snapshot, directTotals);
    };

    const extractReportFodecRows = (totals = {}) => {
      const extras = totals?.extras || {};
      const fodecEnabled = !!extras.fodecEnabled;
      const fodecLabel = String(extras.fodecLabel || "FODEC");
      const baseFodecRows = Array.isArray(extras.fodecBreakdown) ? extras.fodecBreakdown : [];
      const normalizedFodecRows = [];
      const fodecTvaRows = [];
      const fallbackFodecRate = Number(extras.fodecRate);
      const fallbackFodecTvaRate = Number(extras.fodecTva ?? extras.fodecTVA ?? extras.fodecRate ?? 0);
      const fallbackFodecAmount = Number(extras.fodecHT);
      const fallbackFodecTvaAmount = Number(extras.fodecTVA);
      const extrasFodecBase = Number(extras.fodecBase);
      const fallbackFodecBase =
        Number.isFinite(extrasFodecBase)
          ? extrasFodecBase
          : (Number.isFinite(fallbackFodecRate) && Math.abs(fallbackFodecRate) > 1e-9
              ? fallbackFodecAmount / (fallbackFodecRate / 100)
              : null);

      baseFodecRows.forEach((row) => {
        const base = Number(row.base ?? row.ht ?? 0);
        const fodecAmt = Number(row.fodec ?? row.amount ?? 0);
        const fodecTva = Number(row.fodecTva ?? row.tva ?? 0);
        const rate = Number(row.rate ?? extras.fodecRate ?? 0);
        const fodecTvaRate = Number(row.tvaRate ?? row.fodecTvaRate ?? extras.fodecTVA ?? 0);
        if (!Number.isFinite(base) && !Number.isFinite(fodecAmt)) return;
        const fodecAmount = Number.isFinite(fodecAmt) ? fodecAmt : 0;
        const fodecTvaAmount = Number.isFinite(fodecTva) ? fodecTva : 0;
        normalizedFodecRows.push({
          rate: rate,
          base: Number.isFinite(base) ? base : 0,
          fodecAmount,
          fodecTvaAmount,
          fodecTvaRate
        });

        if (Math.abs(fodecTvaAmount) > 1e-9) {
          const tvaRate = Number.isFinite(fodecTvaRate) ? fodecTvaRate : fallbackFodecTvaRate;
          fodecTvaRows.push({
            rate: Number.isFinite(tvaRate) ? tvaRate : 0,
            ht: fodecAmount,
            tva: fodecTvaAmount
          });
        }
      });

      if (fodecEnabled && !normalizedFodecRows.length && Number.isFinite(fallbackFodecAmount)) {
        const computedBase = Number.isFinite(fallbackFodecBase) ? fallbackFodecBase : 0;
        const fodecAmount = Number.isFinite(fallbackFodecAmount) ? fallbackFodecAmount : 0;
        const fodecTvaAmount = Number.isFinite(fallbackFodecTvaAmount) ? fallbackFodecTvaAmount : 0;
        normalizedFodecRows.push({
          rate: Number.isFinite(fallbackFodecRate) ? fallbackFodecRate : 0,
          base: computedBase,
          fodecAmount,
          fodecTvaAmount,
          fodecTvaRate: fallbackFodecTvaRate
        });

        if (Math.abs(fodecTvaAmount) > 1e-9) {
          const tvaRate = Number.isFinite(fallbackFodecTvaRate) ? fallbackFodecTvaRate : 0;
          fodecTvaRows.push({
            rate: tvaRate,
            ht: fodecAmount,
            tva: fodecTvaAmount
          });
        }
      }

      return { fodecLabel, fodecRows: normalizedFodecRows, fodecTvaRows };
    };

    const buildReportTaxTableRows = ({
      fodecLabel,
      fodecRows,
      tvaRows,
      currency,
      invoiceCount
    }) => {
      const rows = [];
      let totalAmount = 0;
      const shouldSkipZeroRate = (rate) => {
        const num = Number(rate);
        return !Number.isFinite(num) || num <= 0;
      };
      if (Array.isArray(fodecRows) && fodecRows.length) {
        fodecRows.forEach((row) => {
          if (shouldSkipZeroRate(row.rate)) return;
          const rateLabel = Number.isFinite(row.rate) ? `${formatPctSafe(row.rate)}%` : "";
          const label = safeHtml(fodecLabel || "FODEC");
          const labelWithRate = rateLabel ? `${label} ${rateLabel}` : label;
          const baseVal = Number.isFinite(row.base) ? row.base : 0;
          const amountVal = Number.isFinite(row.fodecAmount) ? row.fodecAmount : 0;
          totalAmount += amountVal;
          rows.push(`
            <tr class="tva-breakdown__fodec">
              <td>${labelWithRate}</td>
              <td class="right">${formatMoneySafe(baseVal, currency)}</td>
              <td class="right">${formatMoneySafe(amountVal, currency)}</td>
            </tr>
          `);
        });
      }
      if (Array.isArray(tvaRows) && tvaRows.length) {
        tvaRows.forEach((row) => {
          if (shouldSkipZeroRate(row.rate)) return;
          const rateLabel = `${formatPctSafe(row.rate)}%`;
          const taxLabel = `TVA ${rateLabel}`;
          const baseVal = Number.isFinite(row.ht) ? row.ht : 0;
          const amtVal = Number.isFinite(row.tva) ? row.tva : 0;
          totalAmount += amtVal;
          rows.push(`
            <tr>
              <td>${taxLabel}</td>
              <td class="right">${formatMoneySafe(baseVal, currency)}</td>
              <td class="right">${formatMoneySafe(amtVal, currency)}</td>
            </tr>
          `);
        });
      }
      if (!rows.length) {
        const emptyMessage = invoiceCount
          ? "Aucune taxe a afficher"
          : "Aucune facture sur cette periode";
        return {
          html: `<tr class="tva-breakdown__empty"><td colspan="3">${emptyMessage}</td></tr>`,
          totalAmount: 0
        };
      }
      rows.push(`
        <tr class="tva-breakdown__total">
          <th colspan="2">Total</th>
          <th class="right">${formatMoneySafe(totalAmount, currency)}</th>
        </tr>
      `);
      return { html: rows.join(""), totalAmount };
    };

    const buildSalesTaxReportSnapshot = () => {
      const company = w.SEM?.state?.company || {};
      return {
        company,
        startDate: reportTaxState.startDate || "",
        endDate: reportTaxState.endDate || "",
        invoiceCount: reportTaxState.invoiceCount || 0,
        currency: reportTaxState.currency || "",
        fodecLabel: reportTaxState.fodecLabel,
        fodecRows: reportTaxState.fodecRows,
        tvaRows: reportTaxState.tvaRows
      };
    };

    const buildSalesTaxReportHtml = (snapshot = {}) => {
      const company = snapshot.company || {};
      const companyName = safeHtml(company?.name || "Societe");
      const companyVat = safeHtml(company?.vat || "");
      const companyPhone = safeHtml(company?.phone || "");
      const companyEmail = safeHtml(company?.email || "");
      const companyAddress = safeHtml(company?.address || "").replace(/\n/g, "<br>");
      const reportTitle = "Rapport de taxes a la vente";
      const startDate = snapshot.startDate || "";
      const endDate = snapshot.endDate || "";
      const periodValue = startDate && endDate ? `Du ${startDate} au ${endDate}` : "-";
      const invoiceCount = snapshot.invoiceCount || 0;

      const tableRows = buildReportTaxTableRows({
        fodecLabel: snapshot.fodecLabel || "FODEC",
        fodecRows: snapshot.fodecRows || [],
        tvaRows: snapshot.tvaRows || [],
        currency: snapshot.currency || "",
        invoiceCount
      });

      return `
        <div class="pdf-preview-root report-tax-preview__root">
          <div class="pdf-page report-tax-preview__page">
            <div class="report-tax-preview__heading">
              <h1 class="pdf-title report-tax-preview__title">${reportTitle}</h1>
            </div>
            <div class="pdf-divider"></div>
            <div class="pdf-grid-2 report-tax-preview__meta">
              <div class="report-tax-preview__company">
                <p class="report-tax-preview__company-name">${companyName}</p>
                ${companyVat ? `
                  <p class="pdf-small pdf-meta-line">
                    <span class="pdf-meta-label">MF :</span>
                    <span class="pdf-meta-value">${companyVat}</span>
                  </p>
                ` : ""}
                ${companyPhone ? `
                  <p class="pdf-small pdf-meta-line">
                    <span class="pdf-meta-label">Telephone :</span>
                    <span class="pdf-meta-value" style="white-space:pre-line">${companyPhone}</span>
                  </p>
                ` : ""}
                ${companyEmail ? `
                  <p class="pdf-small pdf-meta-line">
                    <span class="pdf-meta-label">Email :</span>
                    <span class="pdf-meta-value">${companyEmail}</span>
                  </p>
                ` : ""}
                ${companyAddress ? `
                  <p class="pdf-small pdf-meta-line">
                    <span class="pdf-meta-label">Adresse :</span>
                    <span class="pdf-meta-value" style="white-space:pre-line">${companyAddress}</span>
                  </p>
                ` : ""}
              </div>
              <div class="report-tax-preview__period">
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">Periode :</span>
                  <span class="pdf-meta-value">${periodValue}</span>
                </p>
                <p class="pdf-small pdf-meta-line">
                  <span class="pdf-meta-label">Factures :</span>
                  <span class="pdf-meta-value">${invoiceCount}</span>
                </p>
              </div>
            </div>
            <div class="report-tax-preview__table">
              <div class="tva-breakdown" id="reportTaxBreakdownCard">
                <table id="reportTaxBreakdown" class="tva-breakdown__table">
                  <thead>
                    <tr>
                      <th>Taxes</th>
                      <th>Bases</th>
                      <th>Montants</th>
                    </tr>
                  </thead>
                  <tbody id="reportTaxBreakdownBody">${tableRows.html}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const updateSalesTaxReportActions = () => {
      const canUse = !reportTaxState.loading && !reportTaxState.error;
      [reportTaxState.exportBtn, reportTaxState.printBtn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = !canUse;
        btn.setAttribute("aria-disabled", canUse ? "false" : "true");
      });
      if (reportTaxState.openFolderBtn) {
        const canOpen = !!reportTaxState.lastExportPath;
        reportTaxState.openFolderBtn.disabled = !canOpen;
        reportTaxState.openFolderBtn.setAttribute("aria-disabled", canOpen ? "false" : "true");
      }
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
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    };

    const buildSalesTaxReportCss = () => {
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
      return [rootVars, pdfCss, tableCss, reportCss].filter(Boolean).join("\n");
    };

    const showReportDialog = async (message, title) => {
      const text = String(message || "");
      const dialogTitle = title || "Rapport";
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title: dialogTitle });
        return;
      }
      if (typeof w.alert === "function") w.alert(text);
    };

    const showReportToast = (message, opts) => {
      if (typeof w.showToast !== "function") return;
      w.showToast(message, opts);
    };

    const resolveReportPdfName = (res, fallbackName) => {
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

    const resolveReportTaxPdfDir = async () => {
      if (!w.electronAPI?.getReportTaxPdfDir) return "";
      try {
        const res = await w.electronAPI.getReportTaxPdfDir();
        if (res?.ok && res.path) return res.path;
      } catch (err) {
        console.warn("report tax dir resolve failed", err);
      }
      return "";
    };

    const buildReportTaxFilename = (startDate, endDate, index) => {
      const fallback = new Date().toISOString().slice(0, 10);
      const start = normalizeIsoDate(startDate) || fallback;
      const end = normalizeIsoDate(endDate) || start;
      const safeIndex =
        Number.isFinite(Number(index)) && Number(index) > 0 ? Math.floor(Number(index)) : 1;
      return `RPTV-${start}-${end}-${safeIndex}`;
    };

    const exportSalesTaxReportPdf = async () => {
      if (reportTaxState.loading) return;
      if (reportTaxState.error) {
        await showReportDialog(reportTaxState.error, "Export PDF");
        return;
      }
      if (!w.electronAPI?.exportPDFFromHTML) {
        await showReportDialog("Export PDF indisponible.", "Export PDF");
        return;
      }
      const saveDir = await resolveReportTaxPdfDir();
      if (!saveDir) {
        await showReportDialog("Impossible de preparer le dossier d'export.", "Export PDF");
        return;
      }
      const snapshot = buildSalesTaxReportSnapshot();
      const html = buildSalesTaxReportHtml(snapshot);
      const css = buildSalesTaxReportCss();
      let index = 1;
      let res = null;
      while (index <= 999) {
        const filename = buildReportTaxFilename(snapshot.startDate, snapshot.endDate, index);
        try {
          res = await w.electronAPI.exportPDFFromHTML({
            html,
            css,
            meta: {
              filename,
              silent: true,
              saveDir,
              docType: "rapporttv"
            }
          });
        } catch (err) {
          res = { ok: false, error: String(err?.message || err) };
        }
        if (res?.ok) {
          reportTaxState.lastExportPath = res.path || "";
          updateSalesTaxReportActions();
          const displayName = resolveReportPdfName(res, filename);
          if (displayName) {
            showReportToast(`Rapport PDF cree : ${displayName}`);
          } else {
            showReportToast("Rapport PDF cree.");
          }
          return;
        }
        if (res?.reason === "exists") {
          index += 1;
          continue;
        }
        if (res?.canceled) return;
        await showReportDialog(res?.error || "Impossible d'exporter le rapport.", "Export PDF");
        return;
      }
      await showReportDialog("Trop de rapports existent deja pour cette periode.", "Export PDF");
    };

    const resolveDirFromPath = (filePath) => {
      const raw = String(filePath || "").trim();
      if (!raw) return "";
      const separator = raw.includes("\\") ? "\\" : "/";
      const parts = raw.split(/[\\/]/);
      parts.pop();
      return parts.join(separator);
    };

    const openSalesTaxReportFolder = async () => {
      const filePath = reportTaxState.lastExportPath || "";
      if (!filePath) return;
      if (w.electronAPI?.showInFolder) {
        try {
          const ok = await w.electronAPI.showInFolder(filePath);
          if (ok) return;
        } catch (err) {
          console.warn("showInFolder failed", err);
        }
      }
      if (w.electronAPI?.openPath) {
        const dir = resolveDirFromPath(filePath);
        if (dir) {
          try {
            const ok = await w.electronAPI.openPath(dir);
            if (ok) return;
          } catch (err) {
            console.warn("openPath failed", err);
          }
        }
      }
      await showReportDialog("Impossible d'ouvrir l'emplacement du rapport.", "Dossier PDF");
    };

    const printSalesTaxReport = async () => {
      if (reportTaxState.loading) return;
      if (reportTaxState.error) {
        await showReportDialog(reportTaxState.error, "Impression");
        return;
      }
      if (!w.electronAPI?.printHTML) {
        await showReportDialog("Impression indisponible.", "Impression");
        return;
      }
      const snapshot = buildSalesTaxReportSnapshot();
      const html = buildSalesTaxReportHtml(snapshot);
      const css = buildSalesTaxReportCss();
      try {
        const res = await w.electronAPI.printHTML({
          html,
          css,
          print: { silent: false, printBackground: true }
        });
        if (res?.ok) return;
        await showReportDialog(res?.error || "Impossible d'imprimer le rapport.", "Impression");
      } catch (err) {
        await showReportDialog(
          String(err?.message || err || "Impossible d'imprimer le rapport."),
          "Impression"
        );
      }
    };

    const buildSalesTaxReportData = async ({ startDate, endDate, reportType } = {}) => {
      if (!w.electronAPI?.listInvoiceFiles || !w.electronAPI?.openInvoiceJSON) {
        return { error: "Indisponible dans ce mode." };
      }
      const normalizedReportType = reportType === "paid-and-unpaid" ? "paid-and-unpaid" : "paid-only";
      const normalizedStart = normalizeIsoDate(startDate);
      const normalizedEnd = normalizeIsoDate(endDate);
      if (!normalizedStart || !normalizedEnd) {
        return { error: "Dates invalides." };
      }
      let listRes = null;
      try {
        listRes = await w.electronAPI.listInvoiceFiles({ docType: "facture" });
      } catch (err) {
        return { error: String(err?.message || err || "Erreur de lecture.") };
      }
      if (!listRes?.ok || !Array.isArray(listRes.items)) {
        return {
          error: listRes?.error || "Impossible de recuperer les factures."
        };
      }
      const entries = listRes.items;
      const filtered = entries.filter((entry) =>
        isDateInRange(entry?.date, normalizedStart, normalizedEnd)
      );
      const fodecMap = new Map();
      const tvaMap = new Map();
      const currencies = new Set();
      let fodecLabel = "FODEC";
      let invoiceCount = 0;

      for (const entry of filtered) {
        if (!entry?.path) continue;
        const entryStatus = entry?.status || "";
        if (entryStatus && !isAllowedStatus(entryStatus, normalizedReportType)) {
          continue;
        }
        let raw = null;
        try {
          raw = await w.electronAPI.openInvoiceJSON({
            path: entry.path,
            docType: entry.docType || "facture"
          });
        } catch (err) {
          console.warn("open invoice failed for report", err);
        }
        if (!raw) continue;
        const data = pickReportInvoiceData(raw);
        const statusValue = resolveReportStatus(entry, raw);
        const statusAllowed = isAllowedStatus(statusValue || entryStatus, normalizedReportType);
        if (!statusAllowed) continue;
        const totals = resolveReportTotals(raw);
        if (!totals || typeof totals !== "object") continue;
        invoiceCount += 1;

        const currencyRaw = totals.currency || data?.meta?.currency || entry?.currency || "";
        const currency = String(currencyRaw || "").trim();
        if (currency) currencies.add(currency);

        const { fodecLabel: entryFodecLabel, fodecRows, fodecTvaRows } = extractReportFodecRows(totals);
        if (entryFodecLabel && fodecLabel === "FODEC") fodecLabel = entryFodecLabel;

        fodecRows.forEach((row) => {
          const rateVal = Number(row.rate);
          const rate = Number.isFinite(rateVal) ? rateVal : 0;
          const key = rate.toFixed(3);
          const baseVal = Number(row.base);
          const fodecVal = Number(row.fodecAmount);
          const entryRow = fodecMap.get(key) || { rate, base: 0, fodecAmount: 0 };
          if (Number.isFinite(baseVal)) entryRow.base += baseVal;
          if (Number.isFinite(fodecVal)) entryRow.fodecAmount += fodecVal;
          fodecMap.set(key, entryRow);
        });

        const tvaRows = Array.isArray(totals.tvaBreakdown) ? totals.tvaBreakdown : [];
        const combinedTvaRows = [...tvaRows, ...fodecTvaRows].filter((row) =>
          Number.isFinite(Number(row?.rate))
        );
        combinedTvaRows.forEach((row) => {
          const rateVal = Number(row.rate);
          const rate = Number.isFinite(rateVal) ? rateVal : 0;
          const key = rate.toFixed(3);
          const htVal = Number(row.ht);
          const tvaVal = Number(row.tva);
          const entryRow = tvaMap.get(key) || { rate, ht: 0, tva: 0 };
          if (Number.isFinite(htVal)) entryRow.ht += htVal;
          if (Number.isFinite(tvaVal)) entryRow.tva += tvaVal;
          tvaMap.set(key, entryRow);
        });
      }

      const fodecRows = Array.from(fodecMap.values())
        .filter(
          (row) =>
            Math.abs(row.base) > 1e-9 || Math.abs(row.fodecAmount) > 1e-9 || Math.abs(row.rate) > 1e-9
        )
        .sort((a, b) => a.rate - b.rate);
      const tvaRows = Array.from(tvaMap.values())
        .filter(
          (row) => Math.abs(row.ht) > 1e-9 || Math.abs(row.tva) > 1e-9 || Math.abs(row.rate) > 1e-9
        )
        .sort((a, b) => a.rate - b.rate);
      const currency = currencies.size === 1 ? Array.from(currencies)[0] : "";

      return {
        startDate: normalizedStart,
        endDate: normalizedEnd,
        invoiceCount,
        fodecLabel,
        fodecRows,
        tvaRows,
        currency
      };
    };

    const renderSalesTaxReportModal = () => {
      if (!reportTaxState.content) return;
      if (reportTaxState.loading) {
        reportTaxState.content.innerHTML =
          '<div class="report-tax-preview__status">Chargement du rapport...</div>';
        updateSalesTaxReportActions();
        return;
      }
      if (reportTaxState.error) {
        reportTaxState.content.innerHTML = `
          <div class="report-tax-preview__status report-tax-preview__status--error">
            ${safeHtml(reportTaxState.error)}
          </div>
        `;
        updateSalesTaxReportActions();
        return;
      }
      const snapshot = buildSalesTaxReportSnapshot();
      reportTaxState.content.innerHTML = buildSalesTaxReportHtml(snapshot);
      updateSalesTaxReportActions();
    };

    const closeSalesTaxReportModal = () => {
      if (!reportTaxState.overlay || !reportTaxState.isOpen) return;
      reportTaxState.overlay.classList.remove("is-open");
      reportTaxState.overlay.hidden = true;
      reportTaxState.overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onSalesTaxReportKeyDown);
      if (reportTaxState.previousFocus && typeof reportTaxState.previousFocus.focus === "function") {
        try {
          reportTaxState.previousFocus.focus();
        } catch {}
      }
      reportTaxState.previousFocus = null;
      reportTaxState.isOpen = false;
    };

    const onSalesTaxReportKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeSalesTaxReportModal();
      }
    };

    const ensureSalesTaxReportModal = () => {
      if (reportTaxState.overlay) return reportTaxState.overlay;
      const overlay = document.createElement("div");
      overlay.id = "salesTaxReportModal";
      overlay.className = "swbDialog doc-history-modal report-tax-modal";
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `
        <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel report-tax-modal__panel" role="dialog" aria-modal="true" aria-labelledby="salesTaxReportModalTitle">
          <div class="swbDialog__header">
            <div id="salesTaxReportModalTitle" class="swbDialog__title">Rapport de taxes a la vente</div>
            <button id="salesTaxReportModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
              <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="pdf-preview-modal__body report-tax-modal__body swbDialog__msg">
            <div id="salesTaxReportContent" class="pdf-preview-modal__content report-tax-modal__content"></div>
          </div>
          <div class="pdf-preview-modal__actions report-tax-modal__actions">
            <div class="pdf-preview-modal__buttons report-tax-modal__buttons">
              <button id="salesTaxReportModalCloseFooter" type="button" class="client-search__edit">Fermer</button>
              <button id="salesTaxReportModalPrint" type="button" class="client-search__addSTK" disabled aria-disabled="true">Imprimer Rapport</button>
              <button id="salesTaxReportModalExport" type="button" class="client-search__edit" disabled aria-disabled="true">Exporter PDF</button>
              <button id="salesTaxReportModalOpenFolder" type="button" class="client-search__edit doc-history__open-folder" title="Ouvrir le dossier PDF" aria-label="Ouvrir le dossier PDF" disabled aria-disabled="true">
                <span class="doc-history__folder-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                    <path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      reportTaxState.overlay = overlay;
      reportTaxState.content = overlay.querySelector("#salesTaxReportContent");
      reportTaxState.title = overlay.querySelector("#salesTaxReportModalTitle");
      reportTaxState.closeBtn = overlay.querySelector("#salesTaxReportModalClose");
      reportTaxState.closeFooterBtn = overlay.querySelector("#salesTaxReportModalCloseFooter");
      reportTaxState.exportBtn = overlay.querySelector("#salesTaxReportModalExport");
      reportTaxState.printBtn = overlay.querySelector("#salesTaxReportModalPrint");
      reportTaxState.openFolderBtn = overlay.querySelector("#salesTaxReportModalOpenFolder");

      reportTaxState.closeBtn?.addEventListener("click", closeSalesTaxReportModal);
      reportTaxState.closeFooterBtn?.addEventListener("click", closeSalesTaxReportModal);
      reportTaxState.exportBtn?.addEventListener("click", exportSalesTaxReportPdf);
      reportTaxState.printBtn?.addEventListener("click", printSalesTaxReport);
      reportTaxState.openFolderBtn?.addEventListener("click", openSalesTaxReportFolder);
      overlay.addEventListener("click", (evt) => {
        if (evt.target === overlay) closeSalesTaxReportModal();
      });
      return overlay;
    };

    const showSalesTaxReportModal = async ({ startDate, endDate, reportType } = {}) => {
      ensureSalesTaxReportModal();
      reportTaxState.startDate = normalizeIsoDate(startDate);
      reportTaxState.endDate = normalizeIsoDate(endDate);
      reportTaxState.invoiceCount = 0;
      reportTaxState.currency = "";
      reportTaxState.fodecLabel = "FODEC";
      reportTaxState.fodecRows = [];
      reportTaxState.tvaRows = [];
      reportTaxState.error = "";
      reportTaxState.loading = true;
      reportTaxState.lastExportPath = "";
      reportTaxState.reportType = reportType === "paid-and-unpaid" ? "paid-and-unpaid" : "paid-only";
      reportTaxState.requestId += 1;
      const requestId = reportTaxState.requestId;

      if (reportTaxState.title) {
        reportTaxState.title.textContent = "Rapport de taxes a la vente";
      }
      if (reportTaxState.overlay) {
        reportTaxState.overlay.hidden = false;
        reportTaxState.overlay.setAttribute("aria-hidden", "false");
        reportTaxState.overlay.classList.add("is-open");
      }
      reportTaxState.isOpen = true;
      reportTaxState.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onSalesTaxReportKeyDown);
      renderSalesTaxReportModal();

      const data = await buildSalesTaxReportData({
        startDate: reportTaxState.startDate,
        endDate: reportTaxState.endDate,
        reportType: reportTaxState.reportType
      });
      if (requestId !== reportTaxState.requestId) return;
      reportTaxState.loading = false;
      if (data?.error) {
        reportTaxState.error = data.error;
        renderSalesTaxReportModal();
        return;
      }
      reportTaxState.startDate = data.startDate || reportTaxState.startDate;
      reportTaxState.endDate = data.endDate || reportTaxState.endDate;
      reportTaxState.invoiceCount = data.invoiceCount || 0;
      reportTaxState.currency = data.currency || "";
      reportTaxState.fodecLabel = data.fodecLabel || "FODEC";
      reportTaxState.fodecRows = Array.isArray(data.fodecRows) ? data.fodecRows : [];
      reportTaxState.tvaRows = Array.isArray(data.tvaRows) ? data.tvaRows : [];
      renderSalesTaxReportModal();
      reportTaxState.closeBtn?.focus();
    };

    const promptSalesTaxReportRange = async () => {
      let startDate = "";
      let endDate = "";
      let reportType = "paid-and-unpaid";
      let hintEl = null;
      const setOkState = (okBtn, startRaw, endRaw) => {
        const validStart = normalizeIsoDate(startRaw);
        const validEnd = normalizeIsoDate(endRaw);
        startDate = validStart;
        endDate = validEnd;
        let message = "";
        if ((startRaw && !validStart) || (endRaw && !validEnd)) {
          message = "Format attendu: AAAA-MM-JJ.";
        } else if (validStart && validEnd && validStart > validEnd) {
          message = "La date de debut doit preceder la date de fin.";
        }
        if (hintEl) {
          hintEl.textContent = message;
          hintEl.hidden = !message;
        }
        const isValidRange = !!(validStart && validEnd && validStart <= validEnd);
        if (okBtn) {
          okBtn.disabled = !isValidRange;
          okBtn.setAttribute("aria-disabled", isValidRange ? "false" : "true");
        }
      };

      if (typeof w.showConfirm !== "function") {
        const fallbackStart = prompt("Date de debut (AAAA-MM-JJ)");
        if (!fallbackStart) return null;
        const fallbackEnd = prompt("Date de fin (AAAA-MM-JJ)");
        if (!fallbackEnd) return null;
        return { startDate: fallbackStart, endDate: fallbackEnd, reportType };
      }

      const confirmed = await w.showConfirm("Selectionnez la periode du rapport.", {
        title: "Rapport de taxes a la vente",
        okText: "Valider",
        cancelText: "Annuler",
        renderMessage: (container) => {
          if (!container) return;
          container.textContent = "";
          container.style.maxHeight = "none";
          container.style.overflow = "visible";
          const doc = container.ownerDocument || document;
          const presetOptions = [
            { value: "custom", label: "Par dates" },
            { value: "today", label: "Aujourd'hui" },
            { value: "this-month", label: "Ce mois" },
            { value: "last-month", label: "Mois dernier" },
            { value: "this-year", label: "Cette annee" },
            { value: "last-year", label: "L'annee derniere" }
          ];
          const reportTypeOptions = [
            { value: "paid-and-unpaid", label: "Exercice payé, partiellement payé et impayé" },
            { value: "paid-only", label: "Exercice payé et partiellement payé" }
          ];
          const presetButtons = presetOptions
            .map((opt) => {
              const isActive = opt.value === "custom";
              return `
                <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-report-tax-preset="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
                  ${opt.label}
                </button>
              `;
            })
            .join("");
          const presetSelectOptions = presetOptions
            .map((opt) => {
              const isSelected = opt.value === "custom";
              return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
            })
            .join("");
          const presetLabelMap = new Map(presetOptions.map((opt) => [opt.value, opt.label]));
          const reportTypeButtons = reportTypeOptions
            .map((opt) => {
              const isActive = opt.value === "paid-and-unpaid";
              return `
                <button type="button" class="model-select-option${isActive ? " is-active" : ""}" data-report-tax-type="${opt.value}" role="option" aria-selected="${isActive ? "true" : "false"}">
                  ${opt.label}
                </button>
              `;
            })
            .join("");
          const reportTypeSelectOptions = reportTypeOptions
            .map((opt) => {
              const isSelected = opt.value === "paid-and-unpaid";
              return `<option value="${opt.value}"${isSelected ? " selected" : ""}>${opt.label}</option>`;
            })
            .join("");
          const reportTypeLabelMap = new Map(reportTypeOptions.map((opt) => [opt.value, opt.label]));

          const wrapper = doc.createElement("div");
          wrapper.className = "report-tax-date-range";
          wrapper.innerHTML = `
            <div class="report-tax-date-range__selectors report-tax-date-range__selectors--single">
              <label class="report-tax-date-range__selector">
                <span id="reportTaxTypeLabel">Type de rapport</span>
                <div class="report-tax-date-range__controls">
                  <details id="reportTaxTypeMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                    <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="reportTaxTypeLabel reportTaxTypeDisplay">
                      <span id="reportTaxTypeDisplay">Exercice payé, partiellement payé et impayé</span>
                      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                    </summary>
                    <div id="reportTaxTypePanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="reportTaxTypeLabel">
                      ${reportTypeButtons}
                    </div>
                  </details>
                  <select id="reportTaxTypeSelect" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
                    ${reportTypeSelectOptions}
                  </select>
                </div>
              </label>
            </div>
            <div class="report-tax-date-range__selectors report-tax-date-range__selectors--triple">
              <label class="report-tax-date-range__selector">
                <span id="reportTaxPresetLabel">Selection</span>
                <div class="report-tax-date-range__controls">
                  <details id="reportTaxPresetMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                    <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="reportTaxPresetLabel reportTaxPresetDisplay">
                      <span id="reportTaxPresetDisplay">Par dates</span>
                      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                    </summary>
                    <div id="reportTaxPresetPanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="reportTaxPresetLabel">
                      ${presetButtons}
                    </div>
                  </details>
                  <select id="reportTaxPreset" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">
                    ${presetSelectOptions}
                  </select>
                </div>
              </label>
              <label class="report-tax-date-range__selector">
                <span>Du</span>
                <div class="swb-date-picker" data-date-picker>
                  <input id="reportTaxStartDate" type="text" inputmode="numeric" placeholder="AAAA-MM-JJ" autocomplete="off" spellcheck="false">
                  <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle aria-label="Choisir une date">
                    <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
                    </svg>
                  </button>
                  <!--swb-date-picker__panel-placeholder-->
                  <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
                </div>
              </label>
              <label class="report-tax-date-range__selector">
                <span>Au</span>
                <div class="swb-date-picker" data-date-picker>
                  <input id="reportTaxEndDate" type="text" inputmode="numeric" placeholder="AAAA-MM-JJ" autocomplete="off" spellcheck="false">
                  <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle aria-label="Choisir une date">
                    <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
                    </svg>
                  </button>
                  <!--swb-date-picker__panel-placeholder-->
                  <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
                </div>
              </label>
            </div>
            <p class="report-tax-date-range__hint" hidden></p>
          `;
          container.appendChild(wrapper);
          const startInput = wrapper.querySelector("#reportTaxStartDate");
          const endInput = wrapper.querySelector("#reportTaxEndDate");
          const presetSelect = wrapper.querySelector("#reportTaxPreset");
          const presetMenu = wrapper.querySelector("#reportTaxPresetMenu");
          const presetPanel = wrapper.querySelector("#reportTaxPresetPanel");
          const presetSummary = presetMenu?.querySelector("summary");
          const presetDisplay = wrapper.querySelector("#reportTaxPresetDisplay");
          const reportTypeSelect = wrapper.querySelector("#reportTaxTypeSelect");
          const reportTypeMenu = wrapper.querySelector("#reportTaxTypeMenu");
          const reportTypePanel = wrapper.querySelector("#reportTaxTypePanel");
          const reportTypeSummary = reportTypeMenu?.querySelector("summary");
          const reportTypeDisplay = wrapper.querySelector("#reportTaxTypeDisplay");
          const fieldsWrap = wrapper.querySelector(".report-tax-date-range__fields");
          hintEl = wrapper.querySelector(".report-tax-date-range__hint");

          const okBtn = doc.getElementById("swbDialogOk");
          const updateState = () => {
            const startRaw = startInput?.value || "";
            const endRaw = endInput?.value || "";
            setOkState(okBtn, startRaw, endRaw);
          };
          const toIsoDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };
          const getPresetRange = (preset) => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            if (preset === "today") {
              const today = toIsoDate(now);
              return { start: today, end: today };
            }
            if (preset === "this-month") {
              return {
                start: toIsoDate(new Date(year, month, 1)),
                end: toIsoDate(new Date(year, month + 1, 0))
              };
            }
            if (preset === "last-month") {
              return {
                start: toIsoDate(new Date(year, month - 1, 1)),
                end: toIsoDate(new Date(year, month, 0))
              };
            }
            if (preset === "this-year") {
              return {
                start: toIsoDate(new Date(year, 0, 1)),
                end: toIsoDate(new Date(year, 11, 31))
              };
            }
            if (preset === "last-year") {
              return {
                start: toIsoDate(new Date(year - 1, 0, 1)),
                end: toIsoDate(new Date(year - 1, 11, 31))
              };
            }
            return null;
          };
          const setInputValue = (input, controller, value) => {
            if (controller && typeof controller.setValue === "function") {
              controller.setValue(value || "", { silent: true });
              return;
            }
            if (input) input.value = value || "";
          };
          const setFieldsEnabled = (enabled) => {
            const isEnabled = !!enabled;
            if (fieldsWrap) {
              fieldsWrap.classList.toggle("is-disabled", !isEnabled);
            }
            [startInput, endInput].forEach((input) => {
              if (!input) return;
              input.disabled = !isEnabled;
              input.setAttribute("aria-disabled", !isEnabled ? "true" : "false");
            });
            wrapper.querySelectorAll(".swb-date-picker__toggle").forEach((btn) => {
              btn.disabled = !isEnabled;
              btn.setAttribute("aria-disabled", !isEnabled ? "true" : "false");
            });
            if (!isEnabled) {
              startPicker?.close?.();
              endPicker?.close?.();
            }
          };
          if (startInput) startInput.addEventListener("input", updateState);
          if (endInput) endInput.addEventListener("input", updateState);

          let startPicker = null;
          let endPicker = null;
          if (w.AppDatePicker && typeof w.AppDatePicker.create === "function") {
            startPicker = w.AppDatePicker.create(startInput, {
              labels: {
                today: "Aujourd'hui",
                clear: "Effacer",
                prevMonth: "Mois precedent",
                nextMonth: "Mois suivant",
                dialog: "Choisir une date"
              },
              allowManualInput: true,
              onChange: updateState
            });
            endPicker = w.AppDatePicker.create(endInput, {
              labels: {
                today: "Aujourd'hui",
                clear: "Effacer",
                prevMonth: "Mois precedent",
                nextMonth: "Mois suivant",
                dialog: "Choisir une date"
              },
              allowManualInput: true,
              onChange: updateState
            });
          }

          const applyPreset = () => {
            const preset = presetSelect?.value || "custom";
            if (preset === "custom") {
              setFieldsEnabled(true);
              updateState();
              return;
            }
            const range = getPresetRange(preset);
            if (range) {
              setInputValue(startInput, startPicker, range.start);
              setInputValue(endInput, endPicker, range.end);
            }
            setFieldsEnabled(false);
            updateState();
          };
          const setPresetSelection = (value, { closeMenu = true, notify = true } = {}) => {
            const nextValue = value || "custom";
            if (presetSelect) presetSelect.value = nextValue;
            if (presetDisplay) {
              presetDisplay.textContent = presetLabelMap.get(nextValue) || "Par dates";
            }
            presetPanel?.querySelectorAll("[data-report-tax-preset]").forEach((btn) => {
              const isActive = btn.dataset.reportTaxPreset === nextValue;
              btn.classList.toggle("is-active", isActive);
              btn.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            if (notify) applyPreset();
            if (closeMenu && presetMenu && presetSummary) {
              presetMenu.open = false;
              presetSummary.setAttribute("aria-expanded", "false");
            }
          };
          const setReportTypeSelection = (value, { closeMenu = true } = {}) => {
            const nextValue = value || "paid-and-unpaid";
            reportType = nextValue;
            if (reportTypeSelect) reportTypeSelect.value = nextValue;
            if (reportTypeDisplay) {
              reportTypeDisplay.textContent =
              reportTypeLabelMap.get(nextValue) || "Exercice payé, partiellement payé et impayé";
            }
            reportTypePanel?.querySelectorAll("[data-report-tax-type]").forEach((btn) => {
              const isActive = btn.dataset.reportTaxType === nextValue;
              btn.classList.toggle("is-active", isActive);
              btn.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            if (closeMenu && reportTypeMenu && reportTypeSummary) {
              reportTypeMenu.open = false;
              reportTypeSummary.setAttribute("aria-expanded", "false");
            }
          };

          presetPanel?.addEventListener("click", (evt) => {
            const btn = evt.target.closest("[data-report-tax-preset]");
            if (!btn) return;
            setPresetSelection(btn.dataset.reportTaxPreset || "custom");
          });
          reportTypePanel?.addEventListener("click", (evt) => {
            const btn = evt.target.closest("[data-report-tax-type]");
            if (!btn) return;
            setReportTypeSelection(btn.dataset.reportTaxType || "paid-and-unpaid");
          });
          presetSummary?.addEventListener("click", (evt) => {
            evt.preventDefault();
            if (!presetMenu) return;
            presetMenu.open = !presetMenu.open;
            presetSummary.setAttribute("aria-expanded", presetMenu.open ? "true" : "false");
            if (!presetMenu.open) presetSummary.focus();
          });
          reportTypeSummary?.addEventListener("click", (evt) => {
            evt.preventDefault();
            if (!reportTypeMenu) return;
            reportTypeMenu.open = !reportTypeMenu.open;
            reportTypeSummary.setAttribute("aria-expanded", reportTypeMenu.open ? "true" : "false");
            if (!reportTypeMenu.open) reportTypeSummary.focus();
          });
          presetMenu?.addEventListener("keydown", (evt) => {
            if (evt.key !== "Escape") return;
            evt.preventDefault();
            if (!presetMenu.open) return;
            presetMenu.open = false;
            presetSummary?.setAttribute("aria-expanded", "false");
            presetSummary?.focus();
          });
          reportTypeMenu?.addEventListener("keydown", (evt) => {
            if (evt.key !== "Escape") return;
            evt.preventDefault();
            if (!reportTypeMenu.open) return;
            reportTypeMenu.open = false;
            reportTypeSummary?.setAttribute("aria-expanded", "false");
            reportTypeSummary?.focus();
          });
          doc.addEventListener("click", (evt) => {
            if (!presetMenu?.open) return;
            if (presetMenu.contains(evt.target)) return;
            presetMenu.open = false;
            presetSummary?.setAttribute("aria-expanded", "false");
          });
          doc.addEventListener("click", (evt) => {
            if (!reportTypeMenu?.open) return;
            if (reportTypeMenu.contains(evt.target)) return;
            reportTypeMenu.open = false;
            reportTypeSummary?.setAttribute("aria-expanded", "false");
          });
          if (presetSelect) {
            presetSelect.addEventListener("change", () => {
              setPresetSelection(presetSelect.value);
            });
          }
          if (reportTypeSelect) {
            reportTypeSelect.addEventListener("change", () => {
              setReportTypeSelection(reportTypeSelect.value);
            });
          }

          setPresetSelection(presetSelect?.value || "custom", { closeMenu: false, notify: false });
          setReportTypeSelection(reportTypeSelect?.value || "paid-and-unpaid", { closeMenu: false });
          applyPreset();
        }
      });

      if (!confirmed) return null;
      if (!startDate || !endDate) return null;
      return { startDate, endDate, reportType };
    };

    const reportButton = getElSafe("btnReportSalesTax");
    reportButton?.addEventListener("click", async () => {
      const range = await promptSalesTaxReportRange();
      if (!range) return;
      await showSalesTaxReportModal(range);
    });

  };
})(window);
