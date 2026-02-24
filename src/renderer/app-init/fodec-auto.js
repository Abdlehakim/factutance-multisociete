(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.wireFodecAuto = function wireFodecAuto() {
    const ids = [
      "addFodecEnabled",
      "addFodecRate",
      "addFodecTva",
      "addPurchaseFodecEnabled",
      "addPurchaseFodecRate",
      "addPurchaseFodecTva",
      "shipEnabled",
      "shipAmount",
      "shipTva",
      "dossierEnabled",
      "dossierAmount",
      "dossierTva",
      "deplacementEnabled",
      "deplacementAmount",
      "deplacementTva",
      "stampEnabled",
      "stampAmount",
      "addUnit",
      "addPrice",
      "addTva",
      "addDiscount",
      "addStockQty",
      "addRef",
      "addProduct",
      "addDesc"
    ];
    ids.forEach((id) => {
      const el = getEl(id);
      if (!el) return;
      el.addEventListener("input", () => {
        if (w.SEM?.computeTotals) w.SEM.computeTotals();
        if (typeof updateFodecAutoField === "function") updateFodecAutoField();
      });
      el.addEventListener("change", () => {
        if (typeof updateFodecAutoField === "function") updateFodecAutoField();
        if (w.SEM?.computeTotals) w.SEM.computeTotals();
      });
    });
    if (typeof updateFodecAutoField === "function") updateFodecAutoField();
  };
})(window);
