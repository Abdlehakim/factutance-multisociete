(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const AppInit = (w.AppInit = w.AppInit || {});
  let initialized = false;

  async function init() {
    if (typeof SEM.loadCompanyFromLocal === "function") {
      try {
        await SEM.loadCompanyFromLocal();
      } catch (err) {
        console.warn("loadCompanyFromLocal failed", err);
      }
    }
    SEM.bind?.();
    SEM.wireLiveBindings?.();
    SEM.setSubmitMode?.("add");

    AppInit.ensurePdfWorker?.();
    AppInit.wireSignatureModal?.();

    const focus = SEM.ui || {};
    focus.installFocusGuards?.();
    ["addPurchasePrice", "addPurchaseTva", "addPurchaseFodecRate", "addPurchaseFodecTva", "addPrice", "addTva", "addDiscount", "addFodecRate", "addFodecTva", "addStockQty"].forEach((id) =>
      focus.enableFirstClickSelectSecondClickCaret?.(getEl(id))
    );

    AppInit.wireFodecAuto?.();

    const numbering = AppInit.createDocumentNumbering?.() || null;
    const history = AppInit.createDocumentHistory?.({ numbering }) || null;

    AppInit.registerDocumentActions?.({
      numbering,
      history,
      focus,
      forms: SEM.forms
    });
  }

  w.onReady(() => {
    if (initialized) return;
    initialized = true;
    Promise.resolve(init()).catch((err) => console.error("App init error", err));
  });
})(window);
