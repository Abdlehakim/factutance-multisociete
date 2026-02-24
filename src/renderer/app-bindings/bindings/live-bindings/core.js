(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerLiveBindingSet = SEM.registerLiveBindingSet;
  if (typeof registerLiveBindingSet !== "function") {
    console.warn("[live-bindings] registerLiveBindingSet is unavailable");
    return;
  }

  const coreRegistry = (SEM.__coreBindingRegistry = SEM.__coreBindingRegistry || []);
  SEM.registerCoreBindingModule = function (name, setup) {
    if (typeof setup !== "function") return;
    const normalizedName = String(name || `core-module-${coreRegistry.length + 1}`);
    const existingIndex = coreRegistry.findIndex((entry) => entry && entry.name === normalizedName);
    const nextEntry = { name: normalizedName, setup };
    if (existingIndex >= 0) {
      coreRegistry[existingIndex] = nextEntry;
      return;
    }
    coreRegistry.push(nextEntry);
  };

  registerLiveBindingSet("core", () => {
    const runtimeContext = (SEM.__coreBindingRuntimeContext = SEM.__coreBindingRuntimeContext || {});
    for (const entry of coreRegistry) {
      try {
        entry.setup(runtimeContext);
      } catch (err) {
        console.error(`[core-bindings] failed to wire core module: ${entry.name}`, err);
      }
    }
  });
})(window);
