(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  registerCoreBootstrapModule("global-guards", (ctx = {}) => {
    ctx.runGlobalBootstrapGuards =
      ctx.runGlobalBootstrapGuards ||
      (() => {
        if (SEM._coreBootstrapGuardsWired) return;
        SEM._coreBootstrapGuardsWired = true;
        if (SEM.wireItemsHeaderColorPicker) {
          SEM.wireItemsHeaderColorPicker();
        }
        if (SEM.wireModelItemsHeaderColorPicker) {
          SEM.wireModelItemsHeaderColorPicker();
        }
      });
  });
})(window);
