(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const IDS = {
    modalId: "clientStatementsModal",
    toolsId: "clientStatementsExportTools",
    buttonId: "clientStatementsExportBtn"
  };

  const EXPORT_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
      <path d="M6 9V2h12v7" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke-linecap="round" stroke-linejoin="round"></path>
      <rect x="6" y="14" width="12" height="8" rx="1"></rect>
    </svg>
  `;

  const ensureClientStatementsExportButton = () => {
    if (typeof document === "undefined") return null;
    const modal = document.getElementById(IDS.modalId);
    if (!modal) return null;
    const body = modal.querySelector(".payments-history-modal__body");
    const statusRow = body?.querySelector(".doc-history-modal__status-row");
    const tableWrap =
      body?.querySelector(".table-wrap.payments-history__table-wrap.credit-clients__table-wrap") ||
      body?.querySelector(".table-wrap.payments-history__table-wrap");
    if (!body || !tableWrap) return null;

    let tools = modal.querySelector(`#${IDS.toolsId}`);
    if (!tools) {
      tools = document.createElement("div");
      tools.id = IDS.toolsId;
      tools.className = "payments-history__table-tools";
    }
    if (statusRow) {
      if (tools.parentElement !== statusRow) statusRow.appendChild(tools);
    } else if (tools.parentElement !== body) {
      body.insertBefore(tools, tableWrap);
    }

    let button = tools.querySelector(`#${IDS.buttonId}`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = IDS.buttonId;
      button.className = "items-preview-action client-statements-export__action";
      button.setAttribute("aria-label", "Exporter solde clients");
      button.title = "Exporter solde clients";
      tools.appendChild(button);
    }
    button.innerHTML = EXPORT_ICON_SVG;

    return button;
  };

  const bindClientStatementsExportButton = (onClick) => {
    const button = ensureClientStatementsExportButton();
    if (!button || typeof onClick !== "function") return null;
    if (button.dataset.wired === "1") return button;
    button.dataset.wired = "1";
    button.addEventListener("click", onClick);
    return button;
  };

  AppInit.ClientStatementsExportUi = {
    ids: IDS,
    ensureClientStatementsExportButton,
    bindClientStatementsExportButton
  };
})(window);
