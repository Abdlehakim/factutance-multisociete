(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  const runtimeRegistry = (SEM.__coreBootstrapRuntimeRegistry =
    SEM.__coreBootstrapRuntimeRegistry || []);

  SEM.registerCoreBootstrapRuntimeModule = function (name, setup) {
    if (typeof setup !== "function") return;
    const normalizedName = String(name || `runtime-module-${runtimeRegistry.length + 1}`);
    const existingIndex = runtimeRegistry.findIndex(
      (entry) => entry && entry.name === normalizedName
    );
    const nextEntry = { name: normalizedName, setup };
    if (existingIndex >= 0) {
      runtimeRegistry[existingIndex] = nextEntry;
      return;
    }
    runtimeRegistry.push(nextEntry);
  };

  registerCoreBootstrapModule("runtime", (ctx = {}) => {
    for (const entry of runtimeRegistry) {
      try {
        entry.setup(ctx);
      } catch (err) {
        console.error(
          `[core-bootstrap-runtime] failed to wire runtime module: ${entry.name}`,
          err
        );
      }
    }
  });
})(window);
