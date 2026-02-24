(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapModule = SEM.registerCoreBootstrapModule;
  if (typeof registerCoreBootstrapModule !== "function") {
    console.warn("[core-bootstrap] registerCoreBootstrapModule is unavailable");
    return;
  }

  registerCoreBootstrapModule("messages", (ctx = {}) => {
    if (typeof ctx.getMessage !== "function") {
      ctx.getMessage = (key, options = {}) =>
        (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
          text: options?.fallbackText || key || "",
          title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
        };
    }

    if (typeof ctx.showToast !== "function") {
      ctx.showToast = (message, options = {}) => {
        if (typeof w.showToast === "function") return w.showToast(message, options);
        return null;
      };
    }
  });
})(window);
