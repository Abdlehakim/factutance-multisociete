(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  registerCoreBootstrapModule("state-init", (ctx = {}) => {
    const runtimeState = (ctx.__bootstrapState = ctx.__bootstrapState || {});
    runtimeState.initialized = true;
    runtimeState.coreModule = "bootstrap";

    if (!Array.isArray(ctx.clientSearchData)) {
      ctx.clientSearchData = [];
    }
    const searchPage = Number(ctx.clientSearchPage);
    ctx.clientSearchPage =
      Number.isFinite(searchPage) && searchPage > 0 ? Math.trunc(searchPage) : 1;
  });
})(window);
