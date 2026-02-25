(function () {
  const COMPANY_SWITCH_OVERLAY_UNTIL_KEY = "companySwitchOverlayUntil";
  const COMPANY_SWITCH_OVERLAY_NAME_KEY = "companySwitchOverlayName";

  // Boot overlay is visible by default and stays up until app-init.js hides it.
  const ensureBootOverlayVisible = () => {
    const body = document.body;
    if (body) body.classList.remove("app-loaded");
    const overlay = document.getElementById("bootOverlay");
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.setAttribute("aria-hidden", "false");
  };

  const readCompanySwitchOverlayDeadline = () => {
    try {
      const raw = sessionStorage.getItem(COMPANY_SWITCH_OVERLAY_UNTIL_KEY);
      const parsed = Number(raw || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  };

  const clearCompanySwitchOverlayState = () => {
    try {
      sessionStorage.removeItem(COMPANY_SWITCH_OVERLAY_UNTIL_KEY);
      sessionStorage.removeItem(COMPANY_SWITCH_OVERLAY_NAME_KEY);
    } catch {
      // ignore storage access errors
    }
  };

  const setCompanySwitchOverlayLabel = () => {
    const overlay = document.getElementById("companySwitchOverlay");
    if (!overlay) return;
    const textEl = overlay.querySelector(".company-switch-overlay__text");
    if (!textEl) return;
    let name = "";
    try {
      name = String(sessionStorage.getItem(COMPANY_SWITCH_OVERLAY_NAME_KEY) || "").trim();
    } catch {
      name = "";
    }
    textEl.textContent = name ? `Chargement de ${name}...` : "Chargement de la societe...";
  };

  const showCompanySwitchOverlay = () => {
    const body = document.body;
    if (body) body.classList.add("company-switch-loading");
    const overlay = document.getElementById("companySwitchOverlay");
    if (!overlay) return;
    setCompanySwitchOverlayLabel();
    overlay.hidden = false;
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  };

  const hideCompanySwitchOverlay = () => {
    const body = document.body;
    if (body) body.classList.remove("company-switch-loading");
    const overlay = document.getElementById("companySwitchOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-visible");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  };

  const restoreCompanySwitchOverlayFromSession = () => {
    const deadline = readCompanySwitchOverlayDeadline();
    if (!deadline) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      clearCompanySwitchOverlayState();
      hideCompanySwitchOverlay();
      return;
    }
    showCompanySwitchOverlay();
    setTimeout(() => {
      hideCompanySwitchOverlay();
      clearCompanySwitchOverlayState();
    }, remaining);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      ensureBootOverlayVisible();
      restoreCompanySwitchOverlayFromSession();
    }, { once: true });
  } else {
    ensureBootOverlayVisible();
    restoreCompanySwitchOverlayFromSession();
  }
})();
