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
    purchasePrice: true,
    purchaseTva: true,
    purchaseDiscount: true,
    price: true,
    fodec: true,
    addFodec: true,
    addPurchaseFodec: true,
    tva: true,
    discount: true,
    totalPurchaseHt: true,
    totalPurchaseTtc: true,
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
  function formatArticlePriceInputValue(value, maxDecimals = 3) {
    const num = Number(typeof value === "string" ? value.replace(",", ".") : value);
    const safe = Number.isFinite(num) ? Math.max(0, num) : 0;
    const rounded = Math.round((safe + Number.EPSILON) * 10 ** maxDecimals) / 10 ** maxDecimals;
    const fixed = rounded.toFixed(maxDecimals);
    const trimmed = fixed.replace(/\.?0+$/, "");
    return trimmed || "0";
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
      : 0;
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
      purchaseDiscount:getNum("addPurchaseDiscount",0),
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
      depotStockCustomized: !!(stockPayload.depotStockCustomized ?? stockManagement.depotStockCustomized),
      depots: depots.map((entry) => ({
        id: String(entry?.id || "").trim(),
        name: String(entry?.name || "").trim(),
        linkedDepotId: String(entry?.linkedDepotId || "").trim(),
        stockQty: (() => {
          const parsed = Number(entry?.stockQty ?? entry?.stock_qty ?? entry?.quantity ?? entry?.qty);
          return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
        })(),
        stockQtyCustomized: !!(
          entry?.stockQtyCustomized ??
          entry?.stock_qty_customized ??
          entry?.depotStockCustomized ??
          entry?.depot_stock_customized
        ),
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
    const salesPriceRaw = Number(a.price ?? a.priceHt ?? a.prix ?? a.prixHt ?? 0);
    const salesPrice = Number.isFinite(salesPriceRaw) ? Math.max(0, salesPriceRaw) : 0;
    const salesTvaRaw = Number(
      a.tva ??
        a.vat ??
        a.tax ??
        a.taxRate ??
        a.tax_rate ??
        a.tvaRate ??
        a.tva_rate ??
        a.tvaPct ??
        a.tva_pct ??
        19
    );
    const salesTva = Number.isFinite(salesTvaRaw) ? Math.max(0, salesTvaRaw) : 19;
    const resolveFodecTvaValue = (source = {}, { purchase = false, fallback = 19 } = {}) => {
      const article = source && typeof source === "object" ? source : {};
      const fodecSource = purchase
        ? article.purchaseFodec && typeof article.purchaseFodec === "object"
          ? article.purchaseFodec
          : {}
        : article.fodec && typeof article.fodec === "object"
        ? article.fodec
        : {};
      const raw = purchase
        ? fodecSource.tva ??
          fodecSource.vat ??
          fodecSource.tax ??
          fodecSource.taxRate ??
          fodecSource.tax_rate ??
          fodecSource.tvaRate ??
          fodecSource.tva_rate ??
          fodecSource.tvaPct ??
          fodecSource.tva_pct ??
          article.purchaseFodecTva ??
          article.purchase_fodec_tva ??
          article.purchaseFodecTvaPct ??
          article.purchase_fodec_tva_pct ??
          fallback
        : fodecSource.tva ??
          fodecSource.vat ??
          fodecSource.tax ??
          fodecSource.taxRate ??
          fodecSource.tax_rate ??
          fodecSource.tvaRate ??
          fodecSource.tva_rate ??
          fodecSource.tvaPct ??
          fodecSource.tva_pct ??
          article.fodecTva ??
          article.fodec_tva ??
          article.fodecTvaPct ??
          article.fodec_tva_pct ??
          fallback;
      const parsed = Number(typeof raw === "string" ? raw.replace(",", ".") : raw);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
    };
    const salesFodecTvaValue = resolveFodecTvaValue(a, { purchase: false, fallback: 19 });
    const fodec = a.fodec && typeof a.fodec === "object" ? a.fodec : {};
    const salesFodecRateRaw = Number(fodec.rate ?? 1);
    const salesFodecRate =
      fodec.enabled && Number.isFinite(salesFodecRateRaw) ? Math.max(0, salesFodecRateRaw) : 0;
    const salesPriceTtc =
      Math.round((salesPrice * (1 + salesTva / 100) * (1 + salesFodecRate / 100) + Number.EPSILON) * 1e3) / 1e3;
    const purchasePriceRaw = Number(
      a.purchasePrice ?? a.purchase_price ?? a.buyPrice ?? a.buy_price ?? a.prixAchat ?? a.prix_achat ?? 0
    );
    const purchasePrice = Number.isFinite(purchasePriceRaw) ? Math.max(0, purchasePriceRaw) : 0;
    const purchaseTvaRaw = Number(
      a.purchaseTva ??
        a.purchase_tva ??
        a.purchaseVat ??
        a.buyTva ??
        a.buy_tva ??
        a.tvaAchat ??
        a.tva_achat ??
        0
    );
    const purchaseTva = Number.isFinite(purchaseTvaRaw) ? Math.max(0, purchaseTvaRaw) : 0;
    const purchaseFodecTvaValue = resolveFodecTvaValue(a, { purchase: true, fallback: 19 });
    const purchaseFodec = a.purchaseFodec && typeof a.purchaseFodec === "object" ? a.purchaseFodec : {};
    const purchaseFodecRateRaw = Number(purchaseFodec.rate ?? 1);
    const purchaseFodecRate =
      purchaseFodec.enabled && Number.isFinite(purchaseFodecRateRaw) ? Math.max(0, purchaseFodecRateRaw) : 0;
    const purchasePriceTtc =
      Math.round((purchasePrice * (1 + purchaseTva / 100) * (1 + purchaseFodecRate / 100) + Number.EPSILON) * 1e3) /
      1e3;
    setVal("addRef", a.ref ?? ""); setVal("addProduct", a.product ?? ""); setVal("addDesc", a.desc ?? "");
    setVal("addStockQty", String(a.stockQty ?? 0)); setVal("addUnit", a.unit ?? ""); setVal("addPrice", formatArticlePriceInputValue(salesPrice));
    setVal("addPriceTtc", formatArticlePriceInputValue(salesPriceTtc));
    setVal("addPurchasePrice", formatArticlePriceInputValue(purchasePrice));
    setVal("addPurchasePriceTtc", formatArticlePriceInputValue(purchasePriceTtc));
    setVal("addPurchaseTva", String(purchaseTva));
    setVal("addPurchaseDiscount", String(a.purchaseDiscount ?? 0));
    setVal("addTva", String(salesTva)); setVal("addDiscount", String(a.discount ?? 0));
    const fodecToggle = getEl("addFodecEnabled");
    if (fodecToggle) fodecToggle.checked = !!fodec.enabled;
    setVal("addFodecRate", String(fodec.rate ?? 1));
    setVal("addFodecTva", String(salesFodecTvaValue));
    const purchaseFodecToggle = getEl("addPurchaseFodecEnabled");
    if (purchaseFodecToggle) purchaseFodecToggle.checked = !!purchaseFodec.enabled;
    setVal("addPurchaseFodecRate", String(purchaseFodec.rate ?? 1));
    setVal("addPurchaseFodecTva", String(purchaseFodecTvaValue));
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

  function resolveClientFormCaptureScope(scopeHint = null) {
    if (typeof document === "undefined") return null;
    if (scopeHint instanceof HTMLElement) {
      return (
        scopeHint.closest?.(
          "#clientFormPopover, #fournisseurFormPopover, #transporteurFormPopover, #clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #transporteurSavedModal, #transporteurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientBoxMainscreenTransporteursPanel"
        ) || scopeHint
      );
    }
    if (scopeHint?.target instanceof HTMLElement) {
      return resolveClientFormCaptureScope(scopeHint.target);
    }
    const activeScope = resolveClientFormCaptureScope(document.activeElement);
    if (activeScope) return activeScope;
    return (
      document.querySelector(
        "#fournisseurFormPopover.is-open, #transporteurFormPopover.is-open, #clientFormPopover.is-open, #fournisseurFormPopover:not([hidden]), #transporteurFormPopover:not([hidden]), #clientFormPopover:not([hidden])"
      ) ||
      document.querySelector(
        "#FournisseurBoxNewDoc, #clientBoxNewDoc, #fournisseurSavedModalNv, #clientSavedModalNv, #transporteurSavedModalNv"
      ) ||
      null
    );
  }
  function readScopedClientValue(scopeNode, ids = []) {
    const idList = Array.isArray(ids) ? ids : [ids];
    for (const id of idList.filter(Boolean)) {
      const input =
        scopeNode?.querySelector?.(`#${id}`) ||
        (typeof document !== "undefined" ? document.getElementById(id) : null);
      if (input && "value" in input) return String(input.value ?? "").trim();
    }
    return "";
  }
  function normalizeClientTaxesValue(value, fallback = "non_exonore") {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[éèêë]/g, "e");
    if (normalized === "exonore" || normalized === "exoneree") return "exonore";
    if (normalized === "non_exonore" || normalized === "non_exonoree") return "non_exonore";
    return fallback;
  }
  function captureClientFromForm(scopeHint = null) {
    const scopeNode = resolveClientFormCaptureScope(scopeHint);
    if (typeof w.SEM?.getClientFormSnapshot === "function") {
      return w.SEM.getClientFormSnapshot(scopeNode || scopeHint || null);
    }
    const isVendor =
      scopeNode?.id === "FournisseurBoxNewDoc" ||
      scopeNode?.id === "fournisseurFormPopover" ||
      scopeNode?.id === "fournisseurSavedModal" ||
      scopeNode?.id === "fournisseurSavedModalNv";
    const isTransporter =
      scopeNode?.id === "transporteurFormPopover" ||
      scopeNode?.id === "transporteurSavedModal" ||
      scopeNode?.id === "transporteurSavedModalNv";
    const typeIds = isVendor
      ? ["fournisseurType", "clientType"]
      : isTransporter
        ? ["transporteurType", "clientType"]
        : ["clientType", "fournisseurType"];
    const nameIds = isVendor
      ? ["fournisseurName", "clientName"]
      : isTransporter
        ? ["transporteurName", "clientName"]
        : ["clientName", "fournisseurName"];
    const vatIds = isVendor
      ? ["fournisseurVat", "clientVat"]
      : isTransporter
        ? ["transporteurVat", "clientVat"]
        : ["clientVat", "fournisseurVat"];
    const phoneIds = isVendor
      ? ["fournisseurPhone", "clientPhone"]
      : isTransporter
        ? ["transporteurPhone", "clientPhone"]
        : ["clientPhone", "fournisseurPhone"];
    const emailIds = isVendor
      ? ["fournisseurEmail", "clientEmail"]
      : isTransporter
        ? ["transporteurEmail", "clientEmail"]
        : ["clientEmail", "fournisseurEmail"];
    const addressIds = isVendor
      ? ["fournisseurAddress", "clientAddress"]
      : isTransporter
        ? ["transporteurAddress", "clientAddress"]
        : ["clientAddress", "fournisseurAddress"];
    const currentPath = w.SEM?.state?.client?.__path || "";
    return {
      type: readScopedClientValue(scopeNode, typeIds) || "societe",
      taxes: normalizeClientTaxesValue(
        readScopedClientValue(
          scopeNode,
          isVendor
            ? ["fournisseurTaxes", "clientTaxes"]
            : isTransporter
              ? ["transporteurTaxes", "clientTaxes"]
              : ["clientTaxes", "fournisseurTaxes", "transporteurTaxes"]
        ) || "non_exonore"
      ),
      codeClient: readScopedClientValue(
        scopeNode,
        isVendor
          ? ["fournisseurCode"]
          : isTransporter
            ? ["transporteurCode"]
            : ["clientCode"]
      ),
      codeFournisseur: isVendor ? readScopedClientValue(scopeNode, ["fournisseurCode"]) : "",
      codeTransporteur: isTransporter
        ? readScopedClientValue(scopeNode, ["transporteurCode"])
        : "",
      name: readScopedClientValue(scopeNode, nameIds),
      benefit: readScopedClientValue(
        scopeNode,
        isVendor
          ? ["fournisseurBeneficiary", "clientBeneficiary"]
          : isTransporter
            ? ["transporteurDriverName", "clientBeneficiary"]
            : ["clientBeneficiary", "fournisseurBeneficiary"]
      ),
      account: readScopedClientValue(
        scopeNode,
        isVendor
          ? ["fournisseurAccount", "clientAccount"]
          : isTransporter
            ? ["transporteurVehiclePlate", "clientAccount"]
            : ["clientAccount", "fournisseurAccount"]
      ),
      soldClient: readScopedClientValue(
        scopeNode,
        isVendor
          ? ["fournisseurSoldClient", "clientSoldClient"]
          : isTransporter
            ? ["transporteurSoldClient", "clientSoldClient"]
            : ["clientSoldClient", "fournisseurSoldClient"]
      ),
      vat: readScopedClientValue(scopeNode, vatIds),
      stegRef: readScopedClientValue(
        scopeNode,
        isVendor
          ? ["fournisseurStegRef", "clientStegRef"]
          : isTransporter
            ? ["transporteurTransportMode", "clientStegRef"]
            : ["clientStegRef", "fournisseurStegRef"]
      ),
      phone: readScopedClientValue(scopeNode, phoneIds),
      email: readScopedClientValue(scopeNode, emailIds),
      address: readScopedClientValue(scopeNode, addressIds),
      __path: currentPath
    };
  }
  function fillClientToForm(c = {}) {
    setVal("clientType", c.type ?? "societe"); setVal("clientName", c.name ?? "");
    setVal("clientTaxes", normalizeClientTaxesValue(c.taxes ?? c.taxesStatus ?? "non_exonore"));
    setVal("clientCode", c.codeClient ?? c.code_client ?? c.code ?? "");
    setVal(
      "fournisseurCode",
      c.codeFournisseur ?? c.code_fournisseur ?? c.codeClient ?? c.code_client ?? c.code ?? ""
    );
    setVal(
      "transporteurCode",
      c.codeTransporteur ?? c.code_transporteur ?? c.codeClient ?? c.code_client ?? c.code ?? ""
    );
    setVal(
      "fournisseurTaxes",
      normalizeClientTaxesValue(c.taxes ?? c.taxesStatus ?? "non_exonore")
    );
    setVal(
      "transporteurTaxes",
      normalizeClientTaxesValue(c.taxes ?? c.taxesStatus ?? "non_exonore")
    );
    setVal("clientVat", c.vat ?? ""); setVal("clientPhone", c.phone ?? "");
    setVal("clientEmail", c.email ?? ""); setVal("clientAddress", c.address ?? "");
    SEM.updateClientIdLabel?.();
  }
  function safeClientName(s="client") {
    return String(s).trim().replace(/[\/\\:*?"<>|]/g,"-").replace(/\s+/g," ").slice(0,80) || "client";
  }
  function pickSuggestedClientName(c = {}) {
    const n=(c.name||"").trim(), a=(c.account||"").trim(), v=(c.vat||"").trim(), e=(c.email||"").trim(), p=(c.phone||"").trim();
    return safeClientName(n || a || v || e || p || "client");
  }

  SEM.forms = {
    isEnabled, setEnabled,
    captureArticleFromForm, fillArticleToForm, pickSuggestedName, syncStockManagementUi,
    captureClientFromForm, fillClientToForm, safeClientName, pickSuggestedClientName,
  };
})(window);
