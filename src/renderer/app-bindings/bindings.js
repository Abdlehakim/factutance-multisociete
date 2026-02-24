(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const required = ["bind", "wireLiveBindings"];
  const missing = required.filter((key) => typeof SEM[key] !== "function");
  if (missing.length) {
    console.warn("[bindings] Missing binding modules:", missing.join(", "));
  }
})(window);

