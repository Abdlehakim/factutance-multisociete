(function (w) {
  const modalState = new WeakMap();

  const getFocusable = (root, selector) => {
    if (!root) return null;
    if (selector) {
      const found = root.querySelector(selector);
      if (found instanceof HTMLElement) return found;
    }
    const fallback = root.querySelector("button, input, select, textarea, [tabindex]");
    return fallback instanceof HTMLElement ? fallback : null;
  };

  const openModal = (modal, { trigger = null, focusSelector = "", onEscape = null } = {}) => {
    if (!modal) return;
    const restoreFocus =
      trigger && typeof trigger.focus === "function"
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

    const keydownHandler =
      typeof onEscape === "function"
        ? (evt) => {
            if (evt.key !== "Escape") return;
            evt.preventDefault();
            onEscape();
          }
        : null;

    if (keydownHandler) {
      document.addEventListener("keydown", keydownHandler);
    }

    modalState.set(modal, { restoreFocus, keydownHandler });
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");

    const focusTarget = getFocusable(modal, focusSelector);
    if (focusTarget && typeof focusTarget.focus === "function") {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        try {
          focusTarget.focus();
        } catch {}
      }
    }
  };

  const closeModal = (modal) => {
    if (!modal) return;
    const current = modalState.get(modal) || {};
    if (current.keydownHandler) {
      document.removeEventListener("keydown", current.keydownHandler);
    }
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    if (current.restoreFocus && typeof current.restoreFocus.focus === "function") {
      try {
        current.restoreFocus.focus();
      } catch {}
    }
    modalState.delete(modal);
  };

  const wireBackdropPassthrough = (modal) => {
    if (!modal || modal.dataset.depotModalBackdropWired === "true") return;
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) evt.stopPropagation();
    });
    modal.dataset.depotModalBackdropWired = "true";
  };

  w.DepotMagasinModal = {
    open: openModal,
    close: closeModal,
    wireBackdropPassthrough
  };
})(window);
