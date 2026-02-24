(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registry = (SEM.__liveBindingRegistry = SEM.__liveBindingRegistry || []);

  SEM.registerLiveBindingSet = function (name, setup) {
    if (typeof setup !== "function") return;
    const normalizedName = String(name || `binding-set-${registry.length + 1}`);
    const existingIndex = registry.findIndex((entry) => entry && entry.name === normalizedName);
    const nextEntry = { name: normalizedName, setup };
    if (existingIndex >= 0) {
      registry[existingIndex] = nextEntry;
      return;
    }
    registry.push(nextEntry);
  };

  SEM.wireLiveBindings = function () {
    if (SEM._bindingsWired) return;
    SEM._bindingsWired = true;

    for (const entry of registry) {
      try {
        entry.setup();
      } catch (err) {
        console.error(`[live-bindings] failed to wire binding set: ${entry.name}`, err);
      }
    }
  };
})(window);
