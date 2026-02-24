(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBindingModule = SEM.registerCoreBindingModule;
  if (typeof registerCoreBindingModule !== "function") {
    console.warn("[core-bindings] registerCoreBindingModule is unavailable");
    return;
  }

  const bootstrapRegistry = (SEM.__coreBootstrapRegistry = SEM.__coreBootstrapRegistry || []);

  SEM.registerCoreBootstrapModule = function (name, setup) {
    if (typeof setup !== "function") return;
    const normalizedName = String(name || `bootstrap-module-${bootstrapRegistry.length + 1}`);
    const existingIndex = bootstrapRegistry.findIndex(
      (entry) => entry && entry.name === normalizedName
    );
    const nextEntry = { name: normalizedName, setup };
    if (existingIndex >= 0) {
      bootstrapRegistry[existingIndex] = nextEntry;
      return;
    }
    bootstrapRegistry.push(nextEntry);
  };

  registerCoreBindingModule("bootstrap", (ctx = {}) => {
    for (const entry of bootstrapRegistry) {
      try {
        entry.setup(ctx);
      } catch (err) {
        console.error(
          `[core-bootstrap] failed to wire bootstrap module: ${entry.name}`,
          err
        );
      }
    }
  });
})(window);
