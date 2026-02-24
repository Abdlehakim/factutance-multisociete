(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  registerCoreBootstrapModule("formatting-summary", (ctx = {}) => {
    const bindingShared = ctx.bindingShared || SEM.__bindingShared || {};

    if (typeof ctx.formatSoldClientValue !== "function") {
      ctx.formatSoldClientValue =
        bindingShared.formatSoldClientValue ||
        ((value) => {
          const cleaned = String(value ?? "").replace(",", ".").trim();
          if (!cleaned) return "";
          const num = Number(cleaned);
          if (!Number.isFinite(num)) return String(value ?? "").trim();
          return num.toFixed(3);
        });
    }

    if (typeof ctx.refreshClientSummary !== "function") {
      ctx.refreshClientSummary = bindingShared.refreshClientSummary || (() => {});
    }
    if (typeof ctx.refreshInvoiceSummary !== "function") {
      ctx.refreshInvoiceSummary = bindingShared.refreshInvoiceSummary || (() => {});
    }
    if (typeof ctx.setWhNoteEditorContent !== "function") {
      ctx.setWhNoteEditorContent = bindingShared.setWhNoteEditorContent || (() => {});
    }
  });
})(window);
