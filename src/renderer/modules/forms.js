(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const MAP = () => SEM.consts?.FIELD_TOGGLE_MAP || {};
  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const getStockWindowApi = () =>
    SEM.stockWindow && typeof SEM.stockWindow === "object" ? SEM.stockWindow : null;
  const syncStockManagementUi = (scopeHint = null) =>
    getStockWindowApi()?.syncUi?.(scopeHint);

  const DEFAULT_ARTICLE_FIELD_VISIBILITY = {
    ref: true,
    product: true,
    desc: false,
    qty: true,
    unit: true,
    stockQty: true,
    purchasePrice: false,
    purchaseTva: false,
    price: true,
    fodec: true,
    addFodec: true,
    addPurchaseFodec: false,
    tva: true,
    discount: true,
    totalPurchaseHt: false,
    totalPurchaseTtc: false,
    totalHt: true,
    totalTtc: true
  };
  const getMetaColumns = () => {
    const st = SEM.state;
    return st?.meta && typeof st.meta.columns === "object" ? st.meta.columns : {};
  };

  function isEnabled(key) {
    const el = getEl(MAP()[key]);
    if (el) return !!el.checked;
    const metaColumns = getMetaColumns();
    if (hasOwn(metaColumns, key)) return !!metaColumns[key];
    const defaults = {
      ...DEFAULT_ARTICLE_FIELD_VISIBILITY,
      ...(w.DEFAULT_ARTICLE_FIELD_VISIBILITY && typeof w.DEFAULT_ARTICLE_FIELD_VISIBILITY === "object"
        ? w.DEFAULT_ARTICLE_FIELD_VISIBILITY
        : {})
    };
    return defaults[key] !== false;
  }
  function setEnabled(key, enabled) {
    const el = getEl(MAP()[key]); if (el) el.checked = !!enabled;
    const st = SEM.state;
    if (st?.meta) {
      if (!st.meta.columns || typeof st.meta.columns !== "object") st.meta.columns = {};
      st.meta.columns[key] = !!enabled;
    }
  }

  function captureArticleFromForm() {
    const use = {};
    Object.keys(MAP()).forEach((key) => {
      use[key] = isEnabled(key);
    });
    const stockPayload = getStockWindowApi()?.captureFromForm?.() || {};
    const stockManagement =
      stockPayload.stockManagement && typeof stockPayload.stockManagement === "object"
        ? stockPayload.stockManagement
        : {};
    const depots = Array.isArray(stockPayload.depots) ? stockPayload.depots : [];
    const selectedDepotId = String(
      stockPayload.selectedDepotId ?? stockManagement.selectedDepotId ?? stockManagement.defaultDepot ?? ""
    ).trim();
    const activeDepotId = String(
      stockPayload.activeDepotId ?? selectedDepotId
    ).trim();
    const selectedEmplacements = (() => {
      const sourceRaw =
        stockPayload.selectedEmplacements ??
        stockManagement.selectedEmplacements ??
        stockManagement.defaultLocationIds ??
        stockManagement.defaultLocationId ??
        stockManagement.defaultLocation ??
        [];
      const source = Array.isArray(sourceRaw) ? sourceRaw : String(sourceRaw || "").trim() ? [sourceRaw] : [];
      const seen = new Set();
      return source
        .map((entry) => String(entry || "").trim())
        .filter((entry) => {
          if (!entry) return false;
          const key = entry.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    })();
    const stockAlert = !!(stockPayload.stockAlert ?? stockManagement.alertEnabled);
    const stockMin = Number.isFinite(Number(stockPayload.stockMin))
      ? Number(stockPayload.stockMin)
      : 1;
    const stockMax = stockPayload.stockMax ?? null;
    const fodecEnabled = !!getEl("addFodecEnabled")?.checked;
    const fodecRate = getNum("addFodecRate",1);
    const fodecTva = getNum("addFodecTva",19);
    const purchaseFodecEnabled = !!getEl("addPurchaseFodecEnabled")?.checked;
    const purchaseFodecRate = getNum("addPurchaseFodecRate",1);
    const purchaseFodecTva = getNum("addPurchaseFodecTva",19);
    return {
      ref:getStr("addRef"), product:getStr("addProduct"), desc:getStr("addDesc"),
      stockQty:getNum("addStockQty",0),
      stockAlert,
      stockMin,
      stockMax,
      unit:getStr("addUnit"),
      purchasePrice:getNum("addPurchasePrice",0),
      purchaseTva:getNum("addPurchaseTva",0),
      price:getNum("addPrice",0),
      tva:getNum("addTva",19),
      discount:getNum("addDiscount",0),
      fodec:{
        enabled: fodecEnabled,
        label:"FODEC",
        rate:fodecRate,
        tva:fodecTva
      },
      purchaseFodec:{
        enabled: purchaseFodecEnabled,
        label:"FODEC ACHAT",
        rate:purchaseFodecRate,
        tva:purchaseFodecTva
      },
      stockManagement,
      depots: depots.map((entry) => ({
        id: String(entry?.id || "").trim(),
        name: String(entry?.name || "").trim(),
        linkedDepotId: String(entry?.linkedDepotId || "").trim(),
        selectedLocationIds: Array.isArray(entry?.selectedLocationIds)
          ? entry.selectedLocationIds.map((value) => String(value || "").trim()).filter(Boolean)
          : [],
        selectedEmplacementIds: Array.isArray(entry?.selectedEmplacementIds)
          ? entry.selectedEmplacementIds.map((value) => String(value || "").trim()).filter(Boolean)
          : [],
        createdAt: String(entry?.createdAt || "").trim()
      })).filter((entry) => entry.id),
      selectedDepotId,
      activeDepotId,
      selectedEmplacements,
      use
    };
  }
  function fillArticleToForm(a = {}) {
    setVal("addRef", a.ref ?? ""); setVal("addProduct", a.product ?? ""); setVal("addDesc", a.desc ?? "");
    setVal("addStockQty", String(a.stockQty ?? 0)); setVal("addUnit", a.unit ?? ""); setVal("addPrice", String(a.price ?? 0));
    setVal("addPurchasePrice", String(a.purchasePrice ?? 0));
    setVal("addPurchaseTva", String(a.purchaseTva ?? 0));
    setVal("addTva", String(a.tva ?? 19)); setVal("addDiscount", String(a.discount ?? 0));
    const fodec = a.fodec && typeof a.fodec === "object" ? a.fodec : {};
    const fodecToggle = getEl("addFodecEnabled");
    if (fodecToggle) fodecToggle.checked = !!fodec.enabled;
    setVal("addFodecRate", String(fodec.rate ?? 1));
    setVal("addFodecTva", String(fodec.tva ?? 19));
    const purchaseFodec = a.purchaseFodec && typeof a.purchaseFodec === "object" ? a.purchaseFodec : {};
    const purchaseFodecToggle = getEl("addPurchaseFodecEnabled");
    if (purchaseFodecToggle) purchaseFodecToggle.checked = !!purchaseFodec.enabled;
    setVal("addPurchaseFodecRate", String(purchaseFodec.rate ?? 1));
    setVal("addPurchaseFodecTva", String(purchaseFodec.tva ?? 19));
    getStockWindowApi()?.fillToForm?.(a);
    if (a.use && typeof a.use === "object") {
      Object.keys(MAP()).forEach((k) => typeof a.use[k] === "boolean" && setEnabled(k, a.use[k]));
      SEM.applyColumnHiding?.();
    }
    syncStockManagementUi();
    SEM.updateAddFormTotals?.();
  }
  function pickSuggestedName(a = {}) {
    const u = { ref:isEnabled("ref"), product:isEnabled("product"), desc:isEnabled("desc") };
    const ref = (a.ref||"").trim(), product = (a.product||"").trim(), desc = (a.desc||"").trim();
    return (u.ref && ref) || (u.product && product) || (u.desc && desc) || "article";
  }

  function captureClientFromForm() {
    if (typeof w.SEM?.getClientFormSnapshot === "function") {
      return w.SEM.getClientFormSnapshot();
    }
    const currentPath = w.SEM?.state?.client?.__path || "";
    return {
      type:getStr("clientType"), name:getStr("clientName"), vat:getStr("clientVat"),
      phone:getStr("clientPhone"), email:getStr("clientEmail"), address:getStr("clientAddress"),
      __path: currentPath
    };
  }
  function fillClientToForm(c = {}) {
    setVal("clientType", c.type ?? "societe"); setVal("clientName", c.name ?? "");
    setVal("clientVat", c.vat ?? ""); setVal("clientPhone", c.phone ?? "");
    setVal("clientEmail", c.email ?? ""); setVal("clientAddress", c.address ?? "");
    SEM.updateClientIdLabel?.();
  }
  function safeClientName(s="client") {
    return String(s).trim().replace(/[\/\\:*?"<>|]/g,"-").replace(/\s+/g," ").slice(0,80) || "client";
  }
  function pickSuggestedClientName(c = {}) {
    const n=(c.name||"").trim(), v=(c.vat||"").trim(), e=(c.email||"").trim(), p=(c.phone||"").trim();
    return safeClientName(n || v || e || p || "client");
  }

  SEM.forms = {
    isEnabled, setEnabled,
    captureArticleFromForm, fillArticleToForm, pickSuggestedName, syncStockManagementUi,
    captureClientFromForm, fillClientToForm, safeClientName, pickSuggestedClientName,
  };
})(window);
