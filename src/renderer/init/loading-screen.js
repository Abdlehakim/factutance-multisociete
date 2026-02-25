(function () {
  // Boot overlay is visible by default and stays up until app-init.js hides it.
  const ensureBootOverlayVisible = () => {
    const body = document.body;
    if (body) body.classList.remove("app-loaded");
    const overlay = document.getElementById("bootOverlay");
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.setAttribute("aria-hidden", "false");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBootOverlayVisible, { once: true });
  } else {
    ensureBootOverlayVisible();
  }
})();
