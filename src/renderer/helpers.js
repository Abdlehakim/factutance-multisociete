(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helperStore = (SEM.helpers = SEM.helpers || {});

  function registerHelpers(map = {}) {
    Object.entries(map).forEach(([key, value]) => {
      if (!key) return;
      helperStore[key] = value;
      w[key] = value;
    });
  }

  w.registerHelpers = registerHelpers;
  w.helpers = helperStore;
})(window);
