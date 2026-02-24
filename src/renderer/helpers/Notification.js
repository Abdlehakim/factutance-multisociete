(function (w) {
  const register = typeof w.registerHelpers === "function" ? w.registerHelpers : null;

  function getToastEl() {
    let el = document.querySelector(".dev-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "dev-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message, opts = {}) {
    if (!message) return;
    const duration = Number(opts.duration) || 5000;
    const el = getToastEl();
    el.textContent = message;
    el.classList.add("in");
    clearTimeout(el.__hideTimer);
    el.__hideTimer = setTimeout(() => {
      el.classList.remove("in");
    }, duration);
  }

  if (register) register({ showToast });
  else w.showToast = showToast;
})(window);
