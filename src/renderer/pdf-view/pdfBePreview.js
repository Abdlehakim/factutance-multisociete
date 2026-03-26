/// pdfBePreview.js
(function (global) {
  const MODAL_ID = "bePdfPreviewModal";
  const CONTENT_ID = "bePdfPreviewContent";
  const ROOT_ID = "bePdfRoot";
  const STYLE_ID = "bePdfPreviewStyle";
  const TITLE_ID = "bePdfPreviewModalTitle";
  const PRINT_ID = "bePdfPreviewModalPrint";
  const EXPORT_ID = "bePdfPreviewModalExport";

  let lastState = null;
  let lastOptions = {};

  function close() {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    const content = overlay.querySelector(`#${CONTENT_ID}`);
    if (content) content.innerHTML = "";
  }

  function reset(options = {}) {
    lastState = null;
    lastOptions = {};
    if (options?.closeModal !== false) close();
  }

  function getState() {
    return lastState;
  }

  function ensureModal() {
    let overlay = document.getElementById(MODAL_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "swbDialog doc-history-modal pdf-preview-modal be-pdf-preview-modal";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div id="${TITLE_ID}" class="swbDialog__title">Apercu Bon d'entree</div>
          <button id="bePdfPreviewModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="pdf-preview-modal__body swbDialog__msg">
          <style id="${STYLE_ID}"></style>
          <div id="${CONTENT_ID}" class="pdf-preview-modal__content"></div>
        </div>
        <div class="pdf-preview-modal__actions">
          <div class="pdf-preview-modal__buttons">
            <button id="${PRINT_ID}" type="button" class="client-search__addSTK">Imprimer</button>
            <button id="${EXPORT_ID}" type="button" class="client-search__edit">Exporter PDF</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#bePdfPreviewModalClose")?.addEventListener("click", close);
    overlay.addEventListener("click", (evt) => {
      if (evt.target === overlay) close();
    });
    overlay.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") close();
    });
    overlay.querySelector(`#${PRINT_ID}`)?.addEventListener("click", () => {
      if (typeof lastOptions?.onPrint === "function") lastOptions.onPrint();
    });
    overlay.querySelector(`#${EXPORT_ID}`)?.addEventListener("click", () => {
      if (typeof lastOptions?.onExport === "function") lastOptions.onExport();
    });

    return overlay;
  }

  async function preview(state, options = {}) {
    if (!global.PDFBeView) return;
    const overlay = ensureModal();
    await global.PDFBeView.ready?.();

    lastState = state && typeof state === "object" ? state : null;
    lastOptions = options || {};

    const titleEl = overlay.querySelector(`#${TITLE_ID}`);
    if (titleEl) titleEl.textContent = String(options?.title || "Apercu Bon d'entree");
    const styleEl = overlay.querySelector(`#${STYLE_ID}`);
    if (styleEl) styleEl.textContent = global.PDFBeView.css || "";

    const content = overlay.querySelector(`#${CONTENT_ID}`);
    if (content) {
      content.innerHTML = "";
      content.classList.add("pdf-preview-surface");
      const root = document.createElement("div");
      root.id = ROOT_ID;
      root.className = "be-pdf-preview-root";
      content.appendChild(root);
      global.PDFBeView.render(lastState || {}, global?.electronAPI?.assets || {}, { root });
      content.scrollTop = 0;
    }

    const printBtn = overlay.querySelector(`#${PRINT_ID}`);
    if (printBtn) {
      printBtn.textContent = String(options?.printLabel || "Imprimer Bon d'entree");
      printBtn.disabled = typeof options?.onPrint !== "function";
    }
    const exportBtn = overlay.querySelector(`#${EXPORT_ID}`);
    if (exportBtn) {
      exportBtn.textContent = String(options?.exportLabel || "Exporter Bon d'entree PDF");
      exportBtn.disabled = typeof options?.onExport !== "function";
    }

    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.querySelector("#bePdfPreviewModalClose")?.focus();
  }

  global.PDFBePreview = {
    preview,
    close,
    reset,
    getState
  };
})(window);
