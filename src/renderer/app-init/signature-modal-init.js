(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.wireSignatureModal = function () {
    if (AppInit._signatureModalWired) return;
    AppInit._signatureModalWired = true;
    if (typeof getEl !== "function") return;

    const overlay = getEl("companySignatureModal");
    const openBtn = getEl("btnCompanySignatureElectronic");
    const closeBtn = getEl("companySignatureModalClose");
    const cancelBtn = getEl("companySignatureModalCancel");
    const tabList = overlay?.querySelector(".signature-tabs") || null;
    const tabButtons = Array.from(overlay?.querySelectorAll("[data-signature-tab]") || []);
    const tabPanels = Array.from(overlay?.querySelectorAll("[data-signature-panel]") || []);
    if (!overlay || !openBtn || !tabButtons.length || !tabPanels.length) return;

    let restoreFocusEl = null;
    let activeTab = tabButtons[0]?.dataset.signatureTab || "";

    const setActiveTab = (value, { focus = false } = {}) => {
      const next = value || tabButtons[0]?.dataset.signatureTab || "";
      if (!next) return;
      activeTab = next;
      tabButtons.forEach((btn) => {
        const isActive = btn.dataset.signatureTab === next;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.tabIndex = isActive ? 0 : -1;
        if (focus && isActive) {
          try {
            btn.focus();
          } catch {}
        }
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.dataset.signaturePanel === next;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    };

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.signatureTab, { focus: true }));
    });

    tabList?.addEventListener("keydown", (evt) => {
      if (evt.key !== "ArrowRight" && evt.key !== "ArrowLeft") return;
      evt.preventDefault();
      const currentIndex = tabButtons.findIndex((btn) => btn.dataset.signatureTab === activeTab);
      if (currentIndex < 0) return;
      const delta = evt.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + delta + tabButtons.length) % tabButtons.length;
      const nextTab = tabButtons[nextIndex]?.dataset.signatureTab;
      if (nextTab) setActiveTab(nextTab, { focus: true });
    });

    const onKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeModal();
      }
    };

    const openModal = () => {
      restoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      overlay.removeAttribute("hidden");
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("is-open");
      setActiveTab(activeTab || tabButtons[0]?.dataset.signatureTab, { focus: true });
      document.addEventListener("keydown", onKeyDown);
    };

    const closeModal = () => {
      overlay.classList.remove("is-open");
      overlay.hidden = true;
      overlay.setAttribute("hidden", "");
      overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocusEl && typeof restoreFocusEl.focus === "function") {
        try {
          restoreFocusEl.focus();
        } catch {}
      }
    };

    openBtn.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
  };
})(window);
