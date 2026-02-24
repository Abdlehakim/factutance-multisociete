(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const PREFER_NON_MODEL_MODAL_IDS = new Set([
    "financingBox",
    "subventionEnabled",
    "subventionFields",
    "subventionLabel",
    "subventionAmount",
    "finBankEnabled",
    "finBankFields",
    "finBankLabel",
    "finBankAmount",
    "financingNetRow",
    "financingNet"
  ]);
  const getEl = (id) => {
    try {
      if (w.SEM?.getScopedElement && typeof w.SEM.getScopedElement === "function") {
        const scoped = w.SEM.getScopedElement(id);
        if (scoped) return scoped;
      }
      if (w.__modelApplyAddFormGuard && w.SEM?.__addFormScopedIds?.has(id)) {
        return null;
      }
      if (PREFER_NON_MODEL_MODAL_IDS.has(id)) {
        const all = Array.from(document.querySelectorAll(`#${id}`));
        if (all.length > 1) {
          const nonModel = all.find((el) => !el.closest?.("#modelActionsModal"));
          if (nonModel) return nonModel;
        }
      }
    } catch {}
    return document.getElementById(id);
  };

  const setVal = (id, v) => {
    const el = getEl(id);
    if (!el) return;
    if (el.__swbDatePickerController && typeof el.__swbDatePickerController.setValue === "function") {
      el.__swbDatePickerController.setValue(v ?? "", { silent: true });
      return;
    }
    el.value = v;
    if (id === "invNumberLength" && typeof w.syncInvNumberLengthUi === "function") {
      w.syncInvNumberLengthUi(v, { updateSelect: false });
    }
    if (id === "docType" && typeof w.syncDocTypeMenuUi === "function") {
      w.syncDocTypeMenuUi(v, { updateSelect: false });
    }
    if (id === "currency" && typeof w.syncCurrencyMenuUi === "function") {
      w.syncCurrencyMenuUi(v, { updateSelect: false });
    }
    if (id === "clientType" && typeof w.syncClientTypeMenuUi === "function") {
      w.syncClientTypeMenuUi(v, { updateSelect: false });
    }
  };

  const getStr = (id, def = "") => {
    const el = getEl(id);
    return el ? String(el.value ?? "").trim() : def;
  };

  const getNum = (id, def = 0) => {
    const val = getStr(id, String(def));
    const n = Number((val.replace?.(",", ".") ?? val));
    return Number.isFinite(n) ? n : def;
  };

  const setText = (id, v) => {
    const el = getEl(id);
    if (el) el.textContent = v;
  };

  const setSrc = (id, v) => {
    const el = getEl(id);
    if (el) el.src = v;
  };

  function slugForFile(s = "") {
    let out = String(s ?? "")
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/[\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const base = out.split(".")[0]?.trim().toUpperCase();
    const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (!base || reserved.test(base)) out = `file-${Date.now()}`;
    out = out.replace(/[.\s]+$/g, "");
    if (out.length > 120) out = out.slice(0, 120).trim();
    return out || "file";
  }
  const sanitizeFilename = slugForFile;

  function ensurePdfExt(name) {
    const n = String(name || "document").trim();
    return n.toLowerCase().endsWith(".pdf") ? n : n + ".pdf";
  }

  function docTypeLabel(t) {
    const aliasMap = {
      bonentree: "be",
      bon_entree: "be",
      "bon-entree": "be",
      "bon entree": "be",
      "bon d'entree": "be",
      "bon d'entr\u00e9e": "be",
      bonsortie: "bs",
      bon_sortie: "bs",
      "bon-sortie": "bs",
      "bon sortie": "bs",
      "bon de sortie": "bs",
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const map = {
      facture: "Facture",
      fa: "Facture d'achat",
      devis: "Devis",
      bl: "Bon de livraison",
      bc: "Bon de commande",
      be: "Bon d'entr\u00e9e",
      bs: "Bon de sortie",
      avoir: "Facture d'avoir",
      retenue: "Retenue a la source"
    };
    const raw = String(t || "").toLowerCase();
    const normalized = aliasMap[raw] || raw;
    return map[normalized] || "Document";
  }

  function formatMoney(v, currency) {
    const n = Number(v || 0);
    const cur = String(currency || "").trim();
    const upper = cur.toUpperCase();
    const digits = upper === "DT" ? 3 : 2;
    const hasIsoCurrency = upper.length === 3;

    try {
      if (hasIsoCurrency) {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: upper,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n);
      }
      return (
        new Intl.NumberFormat(undefined, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n) + (cur ? " " + cur : "")
      );
    } catch {
      return (
        new Intl.NumberFormat(undefined, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n) + (cur ? " " + cur : "")
      );
    }
  }

  function formatQty(v) {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(
      Number(v || 0)
    );
  }

  function formatInt(v) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(v || 0));
  }

  function formatPct(v) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(v || 0));
  }

  function enableFirstClickSelectSecondClickCaret(input) {
    if (!input) return;
    let suppressNextMouseUp = false;
    let firstClickDone = false;
    input.addEventListener("mousedown", () => {
      if (document.activeElement !== input || !firstClickDone) {
        setTimeout(() => {
          input.select();
          try {
            input.setSelectionRange(0, input.value.length);
          } catch {}
        }, 0);
        suppressNextMouseUp = true;
        firstClickDone = true;
      } else {
        suppressNextMouseUp = false;
      }
    });
    input.addEventListener(
      "mouseup",
      (e) => {
        if (suppressNextMouseUp) {
          e.preventDefault();
          suppressNextMouseUp = false;
        }
      },
      true
    );
    input.addEventListener("blur", () => {
      firstClickDone = false;
      suppressNextMouseUp = false;
    });
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function escapeHTML(str = "") {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  w.registerHelpers({
    $,
    $$,
    getEl,
    setVal,
    getStr,
    getNum,
    setText,
    setSrc,
    slugForFile,
    sanitizeFilename,
    ensurePdfExt,
    docTypeLabel,
    formatMoney,
    formatQty,
    formatInt,
    formatPct,
    enableFirstClickSelectSecondClickCaret,
    onReady,
    escapeHTML
  });
})(window);
