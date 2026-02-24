(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerItemAndUiActions = function registerItemAndUiActions(ctx = {}) {
    const SEM = ctx.SEM || (w.SEM = w.SEM || {});
    const focusApi = ctx.focusApi || ctx.focus || SEM.ui || {};

    if (typeof document !== "undefined" && !SEM.__newItemHandlerWired) {
      SEM.__newItemHandlerWired = true;
      document.addEventListener("click", (event) => {
        const btn = event?.target?.closest?.("#btnNewItem");
        if (!btn) return;
        const scope = typeof btn.closest === "function"
          ? btn.closest("#addItemBoxMainscreen, #articleFormPopover")
          : null;
        if (scope && typeof SEM.setActiveAddFormScope === "function") {
          SEM.setActiveAddFormScope(scope);
        }
        if (typeof SEM.clearAddFormAndMode === "function") SEM.clearAddFormAndMode();
        if (scope && (scope.id === "addItemBoxMainscreen" || scope.id === "articleFormPopover")) {
          const fodecRow = scope.querySelector("#addFodecRow");
          const fodecToggle = scope.querySelector("#addFodecEnabled");
          if (fodecRow?.dataset?.fodecActive === "true" && fodecToggle?.checked) {
            fodecToggle.checked = false;
            fodecToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const purchaseFodecRow = scope.querySelector("#addPurchaseFodecRow");
          const purchaseFodecToggle = scope.querySelector("#addPurchaseFodecEnabled");
          if (purchaseFodecRow?.dataset?.fodecActive === "true" && purchaseFodecToggle?.checked) {
            purchaseFodecToggle.checked = false;
            purchaseFodecToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        if (typeof w.updateFodecAutoField === "function") w.updateFodecAutoField();
      });
    }

    ["addRef", "addProduct", "addDesc", "addUnit", "addStockQty", "addPurchasePrice", "addPurchaseTva", "addPurchaseFodecRate", "addPurchaseFodecTva", "addPrice", "addTva", "addDiscount", "addFodecRate", "addFodecTva"].forEach((id) => {
      const el = getEl(id);
      el?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (typeof SEM.submitItemForm === "function") SEM.submitItemForm();
          if (typeof w.updateFodecAutoField === "function") w.updateFodecAutoField();
        }
      });
      if (el) {
        el.addEventListener("focus", () => {
          try {
            el.select();
          } catch {}
        });
        el.addEventListener("click", () => {
          try {
            el.select();
          } catch {}
        });
      }
    });

    getEl("companyLogo")?.addEventListener("click", async () => {
      if (!w.electronAPI?.pickLogo) return;
      const res = await w.electronAPI.pickLogo();
      if (res?.dataUrl) {
        SEM.state.company.logo = res.dataUrl;
        SEM.state.company.logoPath = res.path || "";
        if (typeof SEM.updateCompanyLogoImage === "function") {
          SEM.updateCompanyLogoImage(res.dataUrl);
        } else {
          setSrc("companyLogo", res.dataUrl);
          const img = document.getElementById("companyLogo");
          if (img) {
            img.dataset.logoState = "set";
            img.classList.remove("company-logo--placeholder");
          }
        }
        SEM.saveCompanyToLocal?.();
      }
    });

    w.electronAPI?.onEnterPrintMode?.(() => {
      w.PDFView?.show?.(SEM.state, w.electronAPI?.assets || {});
    });
    w.electronAPI?.onExitPrintMode?.(() => {
      w.PDFView?.hide?.();
      focusApi.recoverFocus?.();
    });
  };
})(window);
