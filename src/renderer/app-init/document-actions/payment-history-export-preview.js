(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const previewState = {
    overlay: null,
    content: null,
    title: null,
    closeBtn: null,
    closeFooterBtn: null,
    exportBtn: null,
    printBtn: null,
    openFolderBtn: null,
    isOpen: false,
    previousFocus: null,
    lastExportPath: "",
    snapshot: null
  };

  const showDialogMessage = async (message, title = "Historique paiements") => {
    const text = String(message || "").trim();
    if (!text) return;
    if (typeof w.showDialog === "function") {
      await w.showDialog(text, { title });
      return;
    }
    if (typeof w.alert === "function") w.alert(text);
  };

  const resolveDirFromPath = (filePath) => {
    const raw = String(filePath || "").trim();
    if (!raw) return "";
    const separator = raw.includes("\\") ? "\\" : "/";
    const parts = raw.split(/[\\/]/);
    parts.pop();
    return parts.join(separator);
  };

  const updateActions = () => {
    const hasRows = Array.isArray(previewState.snapshot?.rows) && previewState.snapshot.rows.length > 0;
    [previewState.exportBtn, previewState.printBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !hasRows;
      btn.setAttribute("aria-disabled", hasRows ? "false" : "true");
    });
    if (previewState.openFolderBtn) {
      const canOpen = !!previewState.lastExportPath;
      previewState.openFolderBtn.disabled = !canOpen;
      previewState.openFolderBtn.setAttribute("aria-disabled", canOpen ? "false" : "true");
    }
  };

  const renderContent = () => {
    if (!previewState.content) return;
    const pdf = AppInit.PaymentHistoryExportPdf;
    const snapshot = previewState.snapshot || {};
    if (!pdf || typeof pdf.buildPaymentHistoryExportHtml !== "function") {
      previewState.content.innerHTML =
        '<div class="report-tax-preview__status report-tax-preview__status--error">Apercu indisponible.</div>';
      updateActions();
      return;
    }
    previewState.content.innerHTML = pdf.buildPaymentHistoryExportHtml(snapshot);
    updateActions();
  };

  const closePreviewModal = () => {
    if (!previewState.overlay || !previewState.isOpen) return;
    previewState.overlay.classList.remove("is-open");
    previewState.overlay.hidden = true;
    previewState.overlay.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onPreviewKeyDown);
    if (previewState.previousFocus && typeof previewState.previousFocus.focus === "function") {
      try {
        previewState.previousFocus.focus();
      } catch {}
    }
    previewState.previousFocus = null;
    previewState.isOpen = false;
  };

  const onPreviewKeyDown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    closePreviewModal();
  };

  const exportPreviewPdf = async () => {
    const pdf = AppInit.PaymentHistoryExportPdf;
    if (!pdf || typeof pdf.exportPaymentHistoryPdf !== "function") {
      await showDialogMessage("Export PDF indisponible.", "Export PDF");
      return;
    }
    const res = await pdf.exportPaymentHistoryPdf({ snapshot: previewState.snapshot || {} });
    if (res?.ok) {
      previewState.lastExportPath = res.path || "";
      updateActions();
    }
  };

  const printPreview = async () => {
    const pdf = AppInit.PaymentHistoryExportPdf;
    if (!pdf) {
      await showDialogMessage("Impression indisponible.", "Impression");
      return;
    }
    if (!w.electronAPI?.printHTML) {
      await showDialogMessage("Impression indisponible.", "Impression");
      return;
    }
    if (typeof pdf.buildPaymentHistoryExportHtml !== "function" || typeof pdf.buildPaymentHistoryExportCss !== "function") {
      await showDialogMessage("Apercu d'impression indisponible.", "Impression");
      return;
    }
    const snapshot = previewState.snapshot || {};
    const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
    if (!rows.length) {
      await showDialogMessage("Aucune donnee a imprimer.", "Impression");
      return;
    }
    try {
      const res = await w.electronAPI.printHTML({
        html: pdf.buildPaymentHistoryExportHtml(snapshot),
        css: pdf.buildPaymentHistoryExportCss(),
        print: { silent: false, printBackground: true }
      });
      if (res?.ok) return;
      await showDialogMessage(res?.error || "Impossible d'imprimer le rapport.", "Impression");
    } catch (err) {
      await showDialogMessage(String(err?.message || err || "Impossible d'imprimer le rapport."), "Impression");
    }
  };

  const openPreviewFolder = async () => {
    const filePath = previewState.lastExportPath || "";
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
    await showDialogMessage("Impossible d'ouvrir l'emplacement du rapport.", "Dossier PDF");
  };

  const ensurePreviewModal = () => {
    if (previewState.overlay) return previewState.overlay;

    const overlay = document.createElement("div");
    overlay.id = "paymentHistoryDetailModal";
    overlay.className = "swbDialog doc-history-modal report-tax-modal";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel report-tax-modal__panel" role="dialog" aria-modal="true" aria-labelledby="paymentHistoryDetailTitle">
        <div class="swbDialog__header">
          <div id="paymentHistoryDetailTitle" class="swbDialog__title">Historique paiements</div>
          <button id="paymentHistoryDetailClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="pdf-preview-modal__body report-tax-modal__body swbDialog__msg">
          <div id="paymentHistoryDetailContent" class="pdf-preview-modal__content report-tax-modal__content"></div>
        </div>
        <div class="pdf-preview-modal__actions report-tax-modal__actions">
          <div class="pdf-preview-modal__buttons report-tax-modal__buttons">
            <button id="paymentHistoryDetailCloseFooter" type="button" class="client-search__edit">Fermer</button>
            <button id="paymentHistoryDetailPrint" type="button" class="client-search__addSTK" disabled aria-disabled="true">Imprimer Rapport</button>
            <button id="paymentHistoryDetailExport" type="button" class="client-search__edit" disabled aria-disabled="true">Exporter PDF</button>
            <button id="paymentHistoryDetailOpenFolder" type="button" class="client-search__edit doc-history__open-folder" title="Ouvrir le dossier PDF" aria-label="Ouvrir le dossier PDF" disabled aria-disabled="true">
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

    previewState.overlay = overlay;
    previewState.content = overlay.querySelector("#paymentHistoryDetailContent");
    previewState.title = overlay.querySelector("#paymentHistoryDetailTitle");
    previewState.closeBtn = overlay.querySelector("#paymentHistoryDetailClose");
    previewState.closeFooterBtn = overlay.querySelector("#paymentHistoryDetailCloseFooter");
    previewState.exportBtn = overlay.querySelector("#paymentHistoryDetailExport");
    previewState.printBtn = overlay.querySelector("#paymentHistoryDetailPrint");
    previewState.openFolderBtn = overlay.querySelector("#paymentHistoryDetailOpenFolder");

    previewState.closeBtn?.addEventListener("click", closePreviewModal);
    previewState.closeFooterBtn?.addEventListener("click", closePreviewModal);
    previewState.exportBtn?.addEventListener("click", exportPreviewPdf);
    previewState.printBtn?.addEventListener("click", printPreview);
    previewState.openFolderBtn?.addEventListener("click", openPreviewFolder);
    overlay.addEventListener("click", (evt) => {
      if (evt.target === overlay) closePreviewModal();
    });

    return overlay;
  };

  const showPaymentHistoryExportPreview = async ({ snapshot = {} } = {}) => {
    ensurePreviewModal();
    previewState.snapshot = snapshot && typeof snapshot === "object" ? { ...snapshot } : {};
    previewState.lastExportPath = "";
    if (previewState.title) previewState.title.textContent = "Historique paiements";
    previewState.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previewState.overlay.hidden = false;
    previewState.overlay.setAttribute("aria-hidden", "false");
    previewState.overlay.classList.add("is-open");
    previewState.isOpen = true;
    document.addEventListener("keydown", onPreviewKeyDown);
    renderContent();
    previewState.closeBtn?.focus();
  };

  AppInit.PaymentHistoryExportPreview = {
    ensurePreviewModal,
    showPaymentHistoryExportPreview,
    closePreviewModal
  };
})(window);
