(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  function enableFirstClickSelectSecondClickCaret(input){
    if (!input) return;
    let suppress = false, first = false;
    input.addEventListener("mousedown", () => {
      if (document.activeElement !== input || !first) {
        setTimeout(() => { input.select(); try { input.setSelectionRange(0, input.value.length); } catch {} }, 0);
        suppress = true; first = true;
      } else suppress = false;
    });
    input.addEventListener("mouseup", (e) => { if (suppress){ e.preventDefault(); suppress = false; } }, true);
    input.addEventListener("blur", () => { first = false; suppress = false; });
  }
  function killOverlays(){
    document.body.classList.remove("printing","print-mode");
    const pdfRoot = document.getElementById("pdfRoot");
    if (pdfRoot){ pdfRoot.style.display="none"; pdfRoot.style.pointerEvents="none"; pdfRoot.setAttribute("aria-hidden","true"); }
  }
  function unlockAddInputs(){
  ["addRef","addProduct","addDesc","addUnit","addStockQty","addPurchasePrice","addPurchaseTva","addPurchaseDiscount","addPrice","addTva","addDiscount"].forEach((id)=>{
      const el = getEl(id); if (el){ el.disabled = false; el.readOnly = false; }
    });
  }
  function recoverFocus(){ killOverlays(); try{ window.focus(); }catch{} unlockAddInputs(); }
  function installFocusGuards(){
    const handler = () => recoverFocus();
    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("keydown", handler, true);
    document.addEventListener("focusin", handler, true);
    window.addEventListener("focus", recoverFocus);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") recoverFocus(); });
  }
  SEM.ui = { enableFirstClickSelectSecondClickCaret, killOverlays, unlockAddInputs, recoverFocus, installFocusGuards };
})(window);
