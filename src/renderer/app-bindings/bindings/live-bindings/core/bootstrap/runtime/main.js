(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeModule = SEM.registerCoreBootstrapRuntimeModule;
  if (typeof registerCoreBootstrapRuntimeModule !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeModule is unavailable");
    return;
  }

  const sourceRegistry = (SEM.__coreBootstrapRuntimeSourceRegistry =
    SEM.__coreBootstrapRuntimeSourceRegistry || []);

  SEM.registerCoreBootstrapRuntimeSource = function (name, sourceFn, options = {}) {
    if (typeof sourceFn !== "function") return;
    const normalizedName = String(name || `runtime-source-${sourceRegistry.length + 1}`);
    const orderValue = Number(options.order);
    const order = Number.isFinite(orderValue) ? orderValue : 1000;
    const existingIndex = sourceRegistry.findIndex(
      (entry) => entry && entry.name === normalizedName
    );
    const nextEntry = {
      name: normalizedName,
      order,
      sourceFn,
      seq: sourceRegistry.length
    };
    if (existingIndex >= 0) {
      const prev = sourceRegistry[existingIndex] || {};
      sourceRegistry[existingIndex] = { ...nextEntry, seq: prev.seq ?? nextEntry.seq };
      return;
    }
    sourceRegistry.push(nextEntry);
  };

  registerCoreBootstrapRuntimeModule("main", (ctx = {}) => {
    const orderedSources = sourceRegistry
      .slice()
      .sort((a, b) => (a.order - b.order) || (a.seq - b.seq));
    if (!orderedSources.length) return;

    for (const entry of orderedSources) {
      try {
        entry.sourceFn(ctx);
      } catch (err) {
        console.error(
          `[core-bootstrap-runtime] failed to execute runtime source: ${entry.name}`,
          err
        );
        break;
      }
    }
  });
})(window);
