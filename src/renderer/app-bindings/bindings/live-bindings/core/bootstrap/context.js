(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  registerCoreBootstrapModule("context-core", (ctx = {}) => {
    ctx.helpers = ctx.helpers || (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
    ctx.state = typeof ctx.state === "function" ? ctx.state : () => SEM.state;
    ctx.bindingShared = ctx.bindingShared || SEM.__bindingShared || {};
  });
})(window);
