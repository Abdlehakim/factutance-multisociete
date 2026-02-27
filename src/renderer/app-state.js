(function (w) {
  const SEM = (w.SEM = w.SEM || {});

  const DEF = w.DEFAULTS || {};
  const COMPANY = DEF.company || w.DEFAULT_COMPANY_TEMPLATE || w.DEFAULT_COMPANY || {};
  const CLIENT  = DEF.client  || w.DEFAULT_CLIENT  || { type: "societe" };
  const META    = DEF.meta    || w.DEFAULT_META    || {};
  const NOTES   = typeof DEF.notes === "string" ? DEF.notes : (w.DEFAULT_NOTES || "");
  const ITEMS   = Array.isArray(DEF.items) ? DEF.items : (w.DEFAULT_ITEMS || []);

  SEM.state =
    (SEM.createDefaultState && SEM.createDefaultState()) ||
    {
      company: { ...COMPANY },
      client : { __path: "", ...CLIENT  },
      meta   : { ...META    },
      notes  : NOTES,
      items  : ITEMS.map((x) => ({ ...x }))
    };
  if (typeof SEM.state.client.__path !== "string") SEM.state.client.__path = "";

  SEM.COMPANY_LOCKED = true;
  SEM.selectedItemIndex = null;

  const COMPANY_PHONE_INPUT_IDS = ["companyPhone", "companyPhoneAlt1", "companyPhoneAlt2"];

  function collectCompanyPhoneValue() {
    const values = COMPANY_PHONE_INPUT_IDS.map((id) => getStr(id, "").trim()).filter(Boolean);
    return values.join(" - ");
  }

  function jsonCloneOr(value, fallback) {
    const source = value !== undefined ? value : fallback;
    if (source === undefined) return undefined;
    return JSON.parse(JSON.stringify(source));
  }

  const DEFAULT_ITEMS_HEADER_COLOR = "#15335e";
  const normalizeHexColor = (value) => {
    if (value === undefined || value === null) return "";
    const str = String(value).trim();
    if (!str) return "";
    const hex = str.startsWith("#") ? str.slice(1) : str;
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex
        .split("")
        .map((c) => `${c}${c}`)
        .join("")
        .toLowerCase()}`;
    }
    return "";
  };
  const parseLooseNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value === undefined || value === null) return null;

    const raw = String(value).replace(/\u00A0/g, " ").trim();
    if (!raw) return null;

    const wrappedNegative = /^\(.*\)$/.test(raw);
    const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
    const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
    if (!cleaned || !/[0-9]/.test(cleaned)) return null;

    const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
    const unsigned = cleaned.replace(/[+\-]/g, "");
    if (!unsigned || !/[0-9]/.test(unsigned)) return null;

    const commaCount = (unsigned.match(/,/g) || []).length;
    const dotCount = (unsigned.match(/\./g) || []).length;
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");

    let decimalSep = "";
    if (commaCount > 0 && dotCount > 0) {
      decimalSep = lastComma > lastDot ? "," : ".";
    } else if (commaCount === 1 && dotCount === 0) {
      decimalSep = ",";
    } else if (dotCount === 1 && commaCount === 0) {
      decimalSep = ".";
    }

    let normalized = "";
    if (decimalSep) {
      const sepIndex = unsigned.lastIndexOf(decimalSep);
      const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
      const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
      normalized = fracPart ? `${intPart || "0"}.${fracPart}` : (intPart || "0");
    } else {
      normalized = unsigned.replace(/[.,]/g, "");
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return sign * parsed;
  };
  const getPrefixForDocType = (docType, rawPrefix) => {
    const map = {
      facture: "Fact",
      fa: "FA",
      devis: "Dev",
      bl: "BL",
      bc: "BC",
      be: "BE",
      bs: "BS",
      avoir: "AV"
    };
    const normalizedType = String(docType || "facture").toLowerCase();
    if (rawPrefix && String(rawPrefix).trim()) return String(rawPrefix).trim();
    if (map[normalizedType]) return map[normalizedType];
    if (normalizedType && /^[a-z]/i.test(normalizedType)) {
      const cleaned = normalizedType.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
      return cleaned || "DOC";
    }
    return "DOC";
  };
  const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
  const normalizeNumberFormat = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
    const raw = String(value || "").trim().toLowerCase();
    if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
    const fb = String(fallback || "").trim().toLowerCase();
    if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
    return NUMBER_FORMAT_DEFAULT;
  };
  const numberFormatHasPrefix = (format) => format !== "counter";
  const numberFormatHasDate = (format) => format === "prefix_date_counter";
  const syncInvNumberSplitFieldsLocal = (formatted, meta) => {
    const invNumberHidden = getEl("invNumber");
    const invNumberPrefix = getEl("invNumberPrefix");
    const invNumberDatePart = getEl("invNumberDatePart");
    const invNumberSuffix = getEl("invNumberSuffix");
    const numberFormat = normalizeNumberFormat(meta?.numberFormat, NUMBER_FORMAT_DEFAULT);
    if (invNumberPrefix) {
      const hidePrefix = !numberFormatHasPrefix(numberFormat);
      invNumberPrefix.hidden = hidePrefix;
      invNumberPrefix.setAttribute("aria-hidden", hidePrefix ? "true" : "false");
    }
    if (invNumberDatePart) {
      const hideDate = !numberFormatHasDate(numberFormat);
      invNumberDatePart.hidden = hideDate;
      invNumberDatePart.setAttribute("aria-hidden", hideDate ? "true" : "false");
    }
    if (invNumberDatePart) {
      if (numberFormatHasDate(numberFormat)) {
        const parsedDateRaw = meta?.date ? new Date(meta.date) : new Date();
        const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
        const year = String(parsedDate.getFullYear());
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const shortYear = year.slice(-2);
        invNumberDatePart.value = `_${shortYear}-${month}-`;
      } else {
        invNumberDatePart.value = "";
      }
    }
    let suffixDigits = "";
    let prefixRaw = "";
    if (numberFormatHasDate(numberFormat)) {
      const match = String(formatted || "").match(/^(.*?)[_-]?(\d{2})-(\d{2})-(\d+)\s*$/);
      suffixDigits = match?.[4] || "";
      prefixRaw = match?.[1] || "";
    } else if (numberFormatHasPrefix(numberFormat)) {
      const match = String(formatted || "").match(/^(.*?)[_-]?(\d+)\s*$/);
      suffixDigits = match?.[2] || "";
      prefixRaw = match?.[1] || "";
    } else {
      const match = String(formatted || "").match(/(\d+)\s*$/);
      suffixDigits = match?.[1] || "";
    }
    if (numberFormatHasPrefix(numberFormat) && invNumberPrefix && !invNumberPrefix.value.trim()) {
      invNumberPrefix.value = getPrefixForDocType(meta?.docType, prefixRaw);
    }
    if (invNumberSuffix) {
      const suffixStr = suffixDigits || "";
      if (suffixStr) invNumberSuffix.value = suffixStr;
    }
    if (invNumberHidden) invNumberHidden.value = formatted;
  };

  const BASE_CLIENT_DEFAULT = (() => {
    const raw = jsonCloneOr(DEF.client, w.DEFAULT_CLIENT);
    return raw && typeof raw === "object" ? raw : {};
  })();

  const BASE_META_DEFAULT = (() => {
    const raw = jsonCloneOr(DEF.meta, w.DEFAULT_META);
    return raw && typeof raw === "object" ? raw : {};
  })();

  const BASE_NOTES_DEFAULT =
    typeof DEF.notes === "string"
      ? DEF.notes
      : (typeof NOTES === "string" ? NOTES : "");

  const BASE_ITEMS_DEFAULT = (() => {
    const src = Array.isArray(DEF.items)
      ? DEF.items
      : (Array.isArray(w.DEFAULT_ITEMS) ? w.DEFAULT_ITEMS : []);
    const cloned = jsonCloneOr(src, []);
    return Array.isArray(cloned) ? cloned : [];
  })();

  const isTaxesEnabled = (raw, fallback = true) => {
    const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
    if (normalized === false) return false;
    if (typeof normalized === "string") {
      if (["without", "sans", "false", "0"].includes(normalized)) return false;
      if (["with", "true", "1"].includes(normalized)) return true;
    }
    return fallback;
  };
  const normalizeDocType = (raw) => {
    const t = String(raw || "").trim().toLowerCase();
    const faAliases = ["fa", "factureachat", "facture-achat", "facture_achat", "facture d'achat", "facture dachat", "facture achat"];
    const blAliases = ["bl", "bon", "bon_livraison", "bon-de-livraison", "bon de livraison", "bon livraison"];
    const bcAliases = ["bc", "bon_commande", "bon-de-commande", "bon de commande", "bon commande", "commande"];
    const beAliases = ["be", "bon_entree", "bon-entree", "bon entree", "bon d'entree"];
    const bsAliases = ["bs", "bon_sortie", "bon-sortie", "bon sortie", "bon de sortie"];
    const avoirAliases = ["avoir", "facture_avoir", "facture-avoir", "facture avoir", "facture d'avoir", "facture davoir"];
    if (faAliases.includes(t)) return "fa";
    if (blAliases.includes(t)) return "bl";
    if (bcAliases.includes(t)) return "bc";
    if (beAliases.includes(t)) return "be";
    if (bsAliases.includes(t)) return "bs";
    if (avoirAliases.includes(t)) return "avoir";
    if (t === "devis") return "devis";
    return "facture";
  };

  function normalizeInvoiceMeta(metaInput, options = {}) {
    const { refreshDates = false } = options;
    const baseMeta = jsonCloneOr(BASE_META_DEFAULT, {});
    const meta = jsonCloneOr(metaInput, {}) || {};

    const todayISO = new Date().toISOString().slice(0, 10);
    const dueISO = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    meta.docType = String(meta.docType || baseMeta.docType || "facture");
    const baseNumber = baseMeta.number ?? "";
    const resolvedNumber = meta.number ?? baseNumber;
    meta.number = (resolvedNumber === undefined || resolvedNumber === null) ? "" : String(resolvedNumber);
    meta.stockAdjusted = !!meta.stockAdjusted;
    const suffixMatchInit = String(meta.number || "").match(/(\d+)\s*$/);
    const suffixLength = suffixMatchInit ? suffixMatchInit[1].length : undefined;
    const desiredNumberLength = meta.numberLength ?? baseMeta.numberLength ?? suffixLength;
    const normalizedLength =
      typeof normalizeInvoiceNumberLength === "function"
        ? normalizeInvoiceNumberLength(desiredNumberLength, baseMeta.numberLength || 4)
        : ([4, 6, 8, 12].includes(Number(desiredNumberLength)) ? Number(desiredNumberLength) : 4);
    meta.numberLength = normalizedLength;
    meta.numberFormat = normalizeNumberFormat(meta.numberFormat ?? baseMeta.numberFormat, NUMBER_FORMAT_DEFAULT);
    const isManualNumberDocType = String(meta.docType || "").toLowerCase() === "fa";
    if (!isManualNumberDocType && (!meta.number || suffixLength)) {
      if (typeof formatInvoiceNumber === "function") {
        const customPrefix = numberFormatHasPrefix(meta.numberFormat)
          ? String(meta.number || "").split(/[_-]/)?.[0]
          : "";
        meta.number = formatInvoiceNumber(meta.number, normalizedLength, {
          docType: meta.docType,
          date: meta.date,
          meta,
          numberFormat: meta.numberFormat,
          prefixOverride: customPrefix || ""
        });
      } else {
        const prefixMap = { facture: "Fact", fa: "FA", devis: "Dev", bl: "BL", bc: "BC" };
        const prefix =
          prefixMap[String(meta.docType || "").toLowerCase()] ||
          String(meta.docType || "DOC").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() ||
          "DOC";
        const digits = (String(meta.number || "1").replace(/\D+/g, "") || "1").slice(-normalizedLength);
        const numericCounter = Number(digits);
        const counter =
          Number.isFinite(numericCounter) && numericCounter > 0 ? String(Math.trunc(numericCounter)) : "1";
        if (!numberFormatHasDate(meta.numberFormat)) {
          const padded = counter.padStart(normalizedLength, "0");
          meta.number = numberFormatHasPrefix(meta.numberFormat) ? `${prefix}_${padded}` : padded;
        } else {
          const parsedDateRaw = meta.date ? new Date(meta.date) : new Date();
          const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
          const year = String(parsedDate.getFullYear());
          const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
          const shortYear = year.slice(-2);
          meta.number = `${prefix}_${shortYear}-${month}-${counter}`;
        }
      }
    }
    if (!isManualNumberDocType) {
      syncInvNumberSplitFieldsLocal(meta.number, meta);
    }
    const baseWithholding = typeof baseMeta.withholding === "object" ? baseMeta.withholding : {};
    const withholdingDefaults = {
      enabled: false,
      rate: 1.5,
      base: "ttc",
      label: typeof baseWithholding.label === "string" ? baseWithholding.label : "Retenue a la source",
      threshold: 1000,
      note: typeof baseWithholding.note === "string" ? baseWithholding.note : ""
    };
    meta.withholding = { ...withholdingDefaults, ...(baseWithholding || {}), ...(meta.withholding || {}) };
    meta.withholding.base = "ttc";
    const baseNoteInterne = typeof baseMeta.noteInterne === "string" ? baseMeta.noteInterne : "";
    const rawNoteInterne = meta.noteInterne ?? baseNoteInterne;
    meta.noteInterne =
      typeof rawNoteInterne === "string" ? rawNoteInterne : (rawNoteInterne == null ? "" : String(rawNoteInterne));
    const baseAcompte = typeof baseMeta.acompte === "object" ? baseMeta.acompte : {};
    const acompteDefaults = { enabled: false, paid: 0 };
    meta.acompte = { ...acompteDefaults, ...(baseAcompte || {}), ...(meta.acompte || {}) };

    const baseExtras = (baseMeta && typeof baseMeta.extras === "object") ? baseMeta.extras : {};
    const inputExtras = (meta.extras && typeof meta.extras === "object") ? meta.extras : {};
    const shippingDefaults = { enabled:false, label:"Frais de livraison", amount:7, tva:7 };
    const stampDefaults = { enabled:false, label:"Timbre fiscal", amount:1 };
    const dossierDefaults = { enabled:false, label:"Frais du dossier", amount:0, tva:0 };
    const deplacementDefaults = { enabled:false, label:"Frais de deplacement", amount:0, tva:0 };
    const fodecDefaults = { enabled:false, label:"FODEC", rate:1, tva:19 };
    const purchaseFodecDefaults = { enabled:false, label:"FODEC ACHAT", rate:1, tva:19 };
    meta.currency = String(meta.currency || baseMeta.currency || "DT");
    meta.date = refreshDates ? todayISO : (meta.date || baseMeta.date || todayISO);
    meta.due = refreshDates ? dueISO : (meta.due || baseMeta.due || dueISO);
    const taxesBase = typeof baseMeta.taxesEnabled === "boolean" ? baseMeta.taxesEnabled : true;
    meta.taxesEnabled = isTaxesEnabled(meta.taxesEnabled, taxesBase !== false);

    meta.extras = {
      shipping: { ...shippingDefaults, ...(baseExtras.shipping || {}), ...(inputExtras.shipping || {}) },
      stamp: { ...stampDefaults, ...(baseExtras.stamp || {}), ...(inputExtras.stamp || {}) },
      dossier: { ...dossierDefaults, ...(baseExtras.dossier || {}), ...(inputExtras.dossier || {}) },
      deplacement: { ...deplacementDefaults, ...(baseExtras.deplacement || {}), ...(inputExtras.deplacement || {}) }
    };
    const addFormRaw = (meta.addForm && typeof meta.addForm === "object") ? meta.addForm : {};
    const addFormFodecRaw = addFormRaw.fodec && typeof addFormRaw.fodec === "object" ? addFormRaw.fodec : {};
    const addFormPurchaseFodecRaw =
      addFormRaw.purchaseFodec && typeof addFormRaw.purchaseFodec === "object"
        ? addFormRaw.purchaseFodec
        : {};
    meta.addForm = {
      ...addFormRaw,
      fodec: { ...fodecDefaults, ...(baseExtras.fodec || {}), ...(inputExtras.fodec || {}), ...addFormFodecRaw },
      purchaseFodec: { ...purchaseFodecDefaults, ...addFormPurchaseFodecRaw }
    };
    if (meta.extras?.stamp) delete meta.extras.stamp.tva;

    [baseExtras, inputExtras].forEach((src) => {
      if (!src || typeof src !== "object") return;
      Object.keys(src).forEach((key) => {
        if (!(key in meta.extras)) meta.extras[key] = jsonCloneOr(src[key], src[key]);
      });
    });
    const headerColor =
      normalizeHexColor(meta.itemsHeaderColor || baseMeta.itemsHeaderColor) || DEFAULT_ITEMS_HEADER_COLOR;
    meta.itemsHeaderColor = headerColor;

    return meta;
  }

  function getDefaultClient() {
    const base = jsonCloneOr(BASE_CLIENT_DEFAULT, {}) || {};
    const template = {
      type: "societe",
      name: "",
      email: "",
      phone: "",
      address: "",
      vat: ""
    };
    const client = { ...template, ...base };
    client.type = String(client.type || "societe");
    client.name = String(client.name || "");
    client.email = String(client.email || "");
    client.phone = String(client.phone || "");
    client.address = String(client.address || "");
    client.vat = String(client.vat || "");
    client.__path = "";
    delete client.__dirty;
    return client;
  }

  function getDefaultNotes() {
    return BASE_NOTES_DEFAULT;
  }

  function getDefaultItems() {
    const cloned = jsonCloneOr(BASE_ITEMS_DEFAULT, []);
    return Array.isArray(cloned) ? cloned.map((item) => ({ ...item })) : [];
  }

  function getDefaultMeta() {
    const base = jsonCloneOr(BASE_META_DEFAULT, {});
    return normalizeInvoiceMeta(base, { refreshDates: true });
  }

  (function () {
    const IS_DESKTOP = !!(w.electronAPI && typeof w.electronAPI.openPath === "function");
    SEM.IS_DESKTOP = IS_DESKTOP;
    SEM.IS_WEB = !IS_DESKTOP;
  })();

  SEM.saveCompanyToLocal = function () {
    const snapshot = (() => {
      try {
        return JSON.parse(JSON.stringify(SEM.state.company || {}));
      } catch {
        return { ...(SEM.state.company || {}) };
      }
    })();
    if (window.electronAPI?.saveCompanyData) {
      window.electronAPI
        .saveCompanyData(snapshot)
        .catch((err) => console.warn("company/saveCompanyData failed", err));
    }
    const smtpProfiles =
      snapshot && typeof snapshot.smtpProfiles === "object" ? snapshot.smtpProfiles : null;
    if (smtpProfiles && window.electronAPI?.saveSmtpSettings) {
      window.electronAPI
        .saveSmtpSettings({ profiles: smtpProfiles })
        .catch((err) => console.warn("smtp/saveSmtpSettings failed", err));
    }
  };

  SEM.loadCompanyFromLocal = async function () {
    const apply = (data) => {
      if (data && typeof data === "object") {
        SEM.state.company = { ...SEM.state.company, ...data };
      }
    };
    if (window.electronAPI?.loadCompanyData) {
      try {
        const res = await window.electronAPI.loadCompanyData();
        if (res?.ok && res.data) {
          apply(res.data);
        }
      } catch (err) {
        console.warn("company/loadCompanyData failed", err);
      }
    }
    if (window.electronAPI?.loadSmtpSettings) {
      try {
        const smtpRes = await window.electronAPI.loadSmtpSettings();
        if (smtpRes?.ok && smtpRes.profiles && typeof smtpRes.profiles === "object") {
          const company = SEM.state.company || (SEM.state.company = {});
          company.smtpProfiles = { ...(company.smtpProfiles || {}), ...smtpRes.profiles };
          if (!company.smtpPreset) {
            company.smtpPreset = company.smtpProfiles.professional ? "professional" : "gmail";
          }
        }
      } catch (err) {
        console.warn("smtp/loadSmtpSettings failed", err);
      }
    }
  };

  SEM.computeTotalsReturn = function () {
    const st = SEM.state;
    const currency = st.meta.currency || "DT";
    const DEC = currency === "DT" ? 3 : 2;
    const R = (n) => Number((+n || 0).toFixed(DEC));
    const toNum = (value, fallback = 0) => {
      const parsed = parseLooseNumber(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const pickValue = (...values) => {
      for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") return value;
      }
      return undefined;
    };
    const taxesEnabled = isTaxesEnabled(st.meta?.taxesEnabled);
    const docType = normalizeDocType(st.meta?.docType || "facture");
    const usePurchasePricing = docType === "fa";

    let subtotal = 0, totalTax = 0, totalDiscount = 0;
    let fodecHTSum = 0, fodecTVASum = 0, fodecBaseSum = 0;
    let anyFodec = false;
    let fodecLabel = "FODEC";
    let fodecRateDisplay = null;
    const taxBreakdown = new Map();
    const fodecBreakdown = new Map();

    st.items.forEach((it) => {
      const hasPurchasePrice =
        it && it.purchasePrice !== undefined && it.purchasePrice !== null && String(it.purchasePrice).trim() !== "";
      const hasPurchaseTva =
        it && it.purchaseTva !== undefined && it.purchaseTva !== null && String(it.purchaseTva).trim() !== "";
      const salesPrice = toNum(it.price, 0);
      const salesTva = toNum(it.tva, 0);
      const salesDiscount = toNum(it.discount, 0);
      const purchaseDiscountSource = pickValue(
        it?.purchaseDiscount,
        it?.purchase_discount,
        it?.purchaseDiscountPct,
        it?.purchase_discount_pct,
        it?.purchaseDiscountPercent,
        it?.purchase_discount_percent,
        it?.purchaseDiscountRate,
        it?.purchase_discount_rate,
        it?.purchaseRemise,
        it?.purchase_remise,
        it?.remiseAchat,
        it?.remise_achat
      );
      const purchaseDiscountRaw =
        purchaseDiscountSource !== undefined ? toNum(purchaseDiscountSource, 0) : salesDiscount;
      const purchaseDiscount =
        usePurchasePricing && purchaseDiscountRaw === 0 && salesDiscount !== 0
          ? salesDiscount
          : purchaseDiscountRaw;
      const purchasePriceRaw = hasPurchasePrice ? toNum(it.purchasePrice, 0) : salesPrice;
      const purchaseTvaRaw = hasPurchaseTva ? toNum(it.purchaseTva, 0) : salesTva;
      const purchasePrice =
        usePurchasePricing && purchasePriceRaw === 0 && salesPrice !== 0
          ? salesPrice
          : purchasePriceRaw;
      const purchaseTva =
        usePurchasePricing && purchaseTvaRaw === 0 && salesTva !== 0
          ? salesTva
          : purchaseTvaRaw;
      const qty = toNum(it.qty, 0);
      const unitPrice = usePurchasePricing ? purchasePrice : salesPrice;
      const base = qty * unitPrice;
      const activeDiscountRate = usePurchasePricing ? purchaseDiscount : salesDiscount;
      const disc = base * (activeDiscountRate / 100);
      const taxedBase = Math.max(0, base - disc);
      const taxRate = taxesEnabled ? (usePurchasePricing ? purchaseTva : salesTva) : 0;
      const tax = taxedBase * (taxRate / 100);
      const salesFcfg = (it && typeof it.fodec === "object") ? it.fodec : {};
      const purchaseFcfg = (it && typeof it.purchaseFodec === "object") ? it.purchaseFodec : {};
      const activeFcfg =
        usePurchasePricing && purchaseFcfg && Object.keys(purchaseFcfg).length
          ? purchaseFcfg
          : salesFcfg;
      const fRate = toNum(activeFcfg.rate, 0);
      const fTvaRate = toNum(activeFcfg.tva, 0);
      const fEnabled = !!activeFcfg.enabled && Number.isFinite(fRate);
      const fht = fEnabled ? taxedBase * (fRate / 100) : 0;
      const ftva = fEnabled && taxesEnabled ? fht * (fTvaRate / 100) : 0;
      subtotal      += base;
      totalDiscount += disc;
      totalTax      += tax;
      fodecHTSum    += fht;
      fodecTVASum   += ftva;
      if (fEnabled) {
        fodecBaseSum += taxedBase;
        const fRateKey = Number.isFinite(fRate) ? fRate.toFixed(3) : "0.000";
        const fTvaKey = Number.isFinite(fTvaRate) ? fTvaRate.toFixed(3) : "0.000";
        const fKey = `${fRateKey}|${fTvaKey}`;
        const entry =
          fodecBreakdown.get(fKey) || { rate: Number(fRate) || 0, tvaRate: Number(fTvaRate) || 0, base: 0, fodec: 0, fodecTva: 0 };
        entry.base   += taxedBase;
        entry.fodec  += fht;
        entry.fodecTva += ftva;
        fodecBreakdown.set(fKey, entry);
      }
      if (fEnabled && !anyFodec) {
        anyFodec = true;
        fodecLabel = String(activeFcfg.label || (usePurchasePricing ? "FODEC ACHAT" : "FODEC"));
        if (Number.isFinite(fRate)) fodecRateDisplay = fRate;
      }

      if (taxesEnabled) {
        const rateKey = Number.isFinite(taxRate) ? taxRate.toFixed(3) : "0.000";
        const entry = taxBreakdown.get(rateKey) || { rate: Number(taxRate) || 0, ht: 0, tva: 0 };
        entry.ht  += taxedBase;
        entry.tva += tax;
        taxBreakdown.set(rateKey, entry);
      }
    });

    const totalHT_items = subtotal - totalDiscount;

    const ex = st.meta.extras || (st.meta.extras = { shipping:{}, stamp:{}, dossier:{}, deplacement:{} });

    const shipHT  = ex.shipping?.enabled ? toNum(ex.shipping.amount, 0) : 0;
    const shipTVA = taxesEnabled ? shipHT * (toNum(ex.shipping?.tva, 0) / 100) : 0;
    const shipTT  = shipHT + shipTVA;
    if (taxesEnabled && ex.shipping?.enabled && (Math.abs(shipHT) > 1e-9 || Math.abs(shipTVA) > 1e-9)) {
      const shipRate = toNum(ex.shipping?.tva, 0);
      const rateKey = Number.isFinite(shipRate) ? shipRate.toFixed(3) : "0.000";
      const entry = taxBreakdown.get(rateKey) || { rate: Number(shipRate) || 0, ht: 0, tva: 0 };
      entry.ht  += shipHT;
      entry.tva += shipTVA;
      taxBreakdown.set(rateKey, entry);
    }

    const stampHT  = ex.stamp?.enabled ? toNum(ex.stamp.amount, 0) : 0;
    const stampTVA = 0;
    const stampTT  = stampHT;

    const dossierHT  = ex.dossier?.enabled ? toNum(ex.dossier.amount, 0) : 0;
    const dossierTVA = taxesEnabled ? dossierHT * (toNum(ex.dossier?.tva, 0) / 100) : 0;
    const dossierTT  = dossierHT + dossierTVA;
    if (taxesEnabled && ex.dossier?.enabled && (Math.abs(dossierHT) > 1e-9 || Math.abs(dossierTVA) > 1e-9)) {
      const dossierRate = toNum(ex.dossier?.tva, 0);
      const rateKey = Number.isFinite(dossierRate) ? dossierRate.toFixed(3) : "0.000";
      const entry = taxBreakdown.get(rateKey) || { rate: Number(dossierRate) || 0, ht: 0, tva: 0 };
      entry.ht  += dossierHT;
      entry.tva += dossierTVA;
      taxBreakdown.set(rateKey, entry);
    }

    const deplacementHT  = ex.deplacement?.enabled ? toNum(ex.deplacement.amount, 0) : 0;
    const deplacementTVA = taxesEnabled ? deplacementHT * (toNum(ex.deplacement?.tva, 0) / 100) : 0;
    const deplacementTT  = deplacementHT + deplacementTVA;
    if (taxesEnabled && ex.deplacement?.enabled && (Math.abs(deplacementHT) > 1e-9 || Math.abs(deplacementTVA) > 1e-9)) {
      const deplacementRate = toNum(ex.deplacement?.tva, 0);
      const rateKey = Number.isFinite(deplacementRate) ? deplacementRate.toFixed(3) : "0.000";
      const entry = taxBreakdown.get(rateKey) || { rate: Number(deplacementRate) || 0, ht: 0, tva: 0 };
      entry.ht  += deplacementHT;
      entry.tva += deplacementTVA;
      taxBreakdown.set(rateKey, entry);
    }

    const totalHT_display  = totalHT_items + shipHT;
    const totalTVA_display = totalTax + shipTVA + dossierTVA + deplacementTVA + fodecTVASum;
    const totalTTC_all     = totalHT_display + totalTVA_display + stampTT + fodecHTSum + dossierHT + deplacementHT;

    const tvaBreakdown = taxesEnabled
      ? Array.from(taxBreakdown.values())
          .filter((row) => Math.abs(row.ht) > 1e-9 || Math.abs(row.tva) > 1e-9 || Math.abs(row.rate) > 1e-9)
          .map((row) => ({ rate: Number(row.rate) || 0, ht: R(row.ht), tva: R(row.tva) }))
          .sort((a, b) => a.rate - b.rate)
      : [];

    const fodecBreakdownArr = Array.from(fodecBreakdown.values())
      .filter(
        (row) =>
          Math.abs(row.base) > 1e-9 || Math.abs(row.fodec) > 1e-9 || Math.abs(row.rate) > 1e-9
      )
      .map((row) => ({
        rate: Number(row.rate) || 0,
        tvaRate: Number(row.tvaRate) || 0,
        base: R(row.base),
        fodec: R(row.fodec),
        fodecTva: R(row.fodecTva)
      }))
      .sort((a, b) => a.rate - b.rate);

    // Base RAS calculee sur le TTC incluant le timbre fiscal
    const rasBaseHT  = totalHT_items + shipHT + dossierHT + deplacementHT + fodecHTSum;
    const rasBaseTTC = totalTTC_all;

    const wh = st.meta.withholding || {};
    const baseVal = rasBaseTTC;
    if (wh.base !== "ttc") wh.base = "ttc";
    const rate = toNum(wh.rate, 0) / 100;
    const thresholdRaw = toNum(wh.threshold, 1000);
    const threshold = Number.isFinite(thresholdRaw) ? thresholdRaw : 1000;
    const meetsThreshold = threshold <= 0 || baseVal >= threshold;
    const whAmount = (wh.enabled && meetsThreshold && rate > 0)
      ? Math.max(0, baseVal) * rate
      : 0;

    const acompteState = st.meta.acompte || {};
    const acompteEnabled = !!acompteState.enabled;
    const acomptePaidRaw = acompteEnabled ? toNum(acompteState.paid, 0) : 0;
    const acomptePaid = Number.isFinite(acomptePaidRaw) ? acomptePaidRaw : 0;
    const acompteBaseRaw = Math.abs(totalTTC_all) > 1e-9 ? totalTTC_all : totalHT_display;
    const acompteRemaining = acompteEnabled ? Math.max(0, acompteBaseRaw - acomptePaid) : acompteBaseRaw;

    const net = totalTTC_all - whAmount;

    const financingState = st.meta.financing || {};
    const subventionState = financingState.subvention || {};
    const bankState = financingState.bank || {};
    const subventionAmount = subventionState.enabled ? toNum(subventionState.amount, 0) : 0;
    const bankAmount = bankState.enabled ? toNum(bankState.amount, 0) : 0;
    const financingTotal = subventionAmount + bankAmount;
    const financingNetToPay = totalTTC_all - financingTotal;

    return {
      currency,
      subtotal : R(subtotal),
      discount : R(totalDiscount),
      tax      : R(totalTVA_display),
      totalHT  : R(totalHT_display),
      grand    : R(totalTTC_all),
      totalTTC : R(totalTTC_all),
      whAmount : R(whAmount),
      net      : R(net),
      balanceDue: R(acompteRemaining),
      acompte: {
        enabled: acompteEnabled,
        paid: R(acomptePaid),
        base: R(acompteBaseRaw),
        remaining: R(acompteRemaining)
      },
      financing: {
        subventionEnabled: !!subventionState.enabled,
        subventionLabel: String(subventionState.label || "Subvention"),
        subventionAmount: R(subventionAmount),
        bankEnabled: !!bankState.enabled,
        bankLabel: String(bankState.label || "Financement bancaire"),
        bankAmount: R(bankAmount),
        total: R(financingTotal),
        netToPay: R(financingNetToPay)
      },
      tvaBreakdown,
      extras: {
        shipHT : R(shipHT),
        shipTT : R(shipTT),
        shipTVA: R(shipTVA),
        dossierHT: R(dossierHT),
        dossierTT: R(dossierTT),
        dossierTVA: R(dossierTVA),
        deplacementHT: R(deplacementHT),
        deplacementTT: R(deplacementTT),
        deplacementTVA: R(deplacementTVA),
        stampHT: R(stampHT),
        stampTT: R(stampTT),
        stampTVA: R(stampTVA),
        fodecBase: R(fodecBaseSum),
        fodecHT : R(fodecHTSum),
        fodecTT : R(fodecHTSum + fodecTVASum),
        fodecTVA: R(fodecTVASum),
        fodecEnabled: anyFodec,
        fodecLabel: fodecLabel,
        fodecRate: fodecRateDisplay,
        fodecBreakdown: fodecBreakdownArr,
        stampEnabled: !!ex.stamp?.enabled,
        stampLabel: String(ex.stamp?.label || "Timbre fiscal"),
        dossierEnabled: !!ex.dossier?.enabled,
        dossierLabel: String(ex.dossier?.label || "Frais du dossier"),
        deplacementEnabled: !!ex.deplacement?.enabled,
        deplacementLabel: String(ex.deplacement?.label || "Frais de deplacement")
      }
    };
  };

  SEM.readInputs = function () {
    const st = SEM.state;
    if (!SEM.COMPANY_LOCKED) {
      st.company.name    = getStr("companyName",  st.company.name);
      st.company.vat     = getStr("companyVat",   st.company.vat);
      st.company.customsCode = getStr("companyCustomsCode", st.company.customsCode);
      st.company.iban    = getStr("companyIban", st.company.iban);
      st.company.phone   = collectCompanyPhoneValue();
      st.company.email   = getStr("companyEmail", st.company.email);
      st.company.address = getStr("companyAddress", st.company.address);
    }

    const invNumberLengthRaw = getStr("invNumberLength", st.meta.numberLength || 4);
    if (typeof normalizeInvoiceNumberLength === "function") {
      st.meta.numberLength = normalizeInvoiceNumberLength(invNumberLengthRaw, st.meta.numberLength || 4);
    } else {
      const requestedLength = Number(invNumberLengthRaw);
      const isValidLength = (val) => [4, 6, 8, 12].includes(Number(val));
      if (isValidLength(requestedLength)) {
        st.meta.numberLength = Number(requestedLength);
      } else if (!isValidLength(st.meta.numberLength)) {
        st.meta.numberLength = 4;
      }
    }
    st.meta.numberFormat = normalizeNumberFormat(st.meta.numberFormat, NUMBER_FORMAT_DEFAULT);
    st.meta.docType  = getStr("docType",   st.meta.docType) || st.meta.docType;
    const invoiceNumberValue = getStr("invNumber", st.meta.number);
    st.meta.number = invoiceNumberValue;
    const suffixMatchInput = String(invoiceNumberValue || "").match(/(\d+)\s*$/);
    const hasNumericSuffix = !!suffixMatchInput;
    const isManualNumberDocType = String(st.meta.docType || "").toLowerCase() === "fa";
    if (!isManualNumberDocType && (!invoiceNumberValue || hasNumericSuffix)) {
      if (typeof formatInvoiceNumber === "function") {
        const customPrefix = numberFormatHasPrefix(st.meta.numberFormat)
          ? String(invoiceNumberValue || st.meta.number || "").split(/[_-]/)?.[0]
          : "";
        st.meta.number = formatInvoiceNumber(invoiceNumberValue, st.meta.numberLength, {
          docType: st.meta.docType,
          date: st.meta.date,
          meta: st.meta,
          numberFormat: st.meta.numberFormat,
          prefixOverride: customPrefix || ""
        });
        const inputEl = getEl("invNumber");
        if (inputEl && inputEl.value !== st.meta.number) inputEl.value = st.meta.number;
      } else {
        const prefixMap = { facture: "Fact", fa: "FA", devis: "Dev", bl: "BL", bc: "BC" };
        const prefix =
          prefixMap[String(st.meta.docType || "").toLowerCase()] ||
          String(st.meta.docType || "DOC").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() ||
          "DOC";
        const digits =
          (suffixMatchInput ? suffixMatchInput[1] : (String(invoiceNumberValue || "1").replace(/\D+/g, "") || "1")).slice(
            -st.meta.numberLength
          );
        const numericCounter = Number(digits);
        const counter =
          Number.isFinite(numericCounter) && numericCounter > 0 ? String(Math.trunc(numericCounter)) : "1";
        if (!numberFormatHasDate(st.meta.numberFormat)) {
          const padded = counter.padStart(st.meta.numberLength, "0");
          st.meta.number = numberFormatHasPrefix(st.meta.numberFormat) ? `${prefix}_${padded}` : padded;
        } else {
          const parsedDateRaw = st.meta.date ? new Date(st.meta.date) : new Date();
          const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
          const year = String(parsedDate.getFullYear());
          const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
          const shortYear = year.slice(-2);
          st.meta.number = `${prefix}_${shortYear}-${month}-${counter}`;
        }
        const inputEl = getEl("invNumber");
        if (inputEl && inputEl.value !== st.meta.number) inputEl.value = st.meta.number;
      }
      syncInvNumberSplitFieldsLocal(st.meta.number, st.meta);
    }
    const taxModeVal = getStr("taxMode", st.meta.taxesEnabled !== false ? "with" : "without");
    st.meta.taxesEnabled = isTaxesEnabled(taxModeVal, st.meta.taxesEnabled !== false);
    st.meta.currency = getStr("currency",  st.meta.currency) || st.meta.currency;
    st.meta.date     = getStr("invDate",   st.meta.date);
    st.meta.due      = getStr("invDue",    st.meta.due);
    const collectHeaderColors = () => {
      const values = [];
      if (typeof document !== "undefined" && document.querySelectorAll) {
        document.querySelectorAll("#itemsHeaderColor, #itemsHeaderHex").forEach((el) => {
          const val = (el && typeof el.value === "string") ? el.value.trim() : "";
          if (val) values.push(val);
        });
      }
      return values;
    };
    const headerColorInputs = collectHeaderColors();
    const headerColorValue =
      (headerColorInputs.length ? headerColorInputs[headerColorInputs.length - 1] : "") ||
      st.meta.itemsHeaderColor ||
      DEFAULT_ITEMS_HEADER_COLOR;
    const normalizedHeaderColor = normalizeHexColor(headerColorValue) || DEFAULT_ITEMS_HEADER_COLOR;
    st.meta.itemsHeaderColor = normalizedHeaderColor;
    if (typeof document !== "undefined") {
      try {
        document.documentElement?.style?.setProperty("--items-head-bg", normalizedHeaderColor);
      } catch {}
      if (document.querySelectorAll) {
        document.querySelectorAll("#itemsHeaderColor, #itemsHeaderHex").forEach((el) => {
          if (!el) return;
          if (el.value !== normalizedHeaderColor) el.value = normalizedHeaderColor;
        });
      }
    }

    const clientSnapshot =
      typeof SEM.getClientFormSnapshot === "function" ? SEM.getClientFormSnapshot() : null;
    if (clientSnapshot && typeof clientSnapshot === "object") {
      st.client = { ...(st.client || {}), ...clientSnapshot };
      if (clientSnapshot.__path || st.client.__path) {
        st.client.__path = clientSnapshot.__path || st.client.__path || "";
      }
    } else {
      st.client.type    = getStr("clientType", st.client.type || "societe");
      st.client.name    = getStr("clientName", st.client.name);
      st.client.email   = getStr("clientEmail", st.client.email);
      st.client.phone   = getStr("clientPhone", st.client.phone);
      st.client.vat     = getStr("clientVat", st.client.vat);
      st.client.address = getStr("clientAddress", st.client.address);
    }

    const wh =
      st.meta.withholding ||
      (st.meta.withholding = { enabled:false, rate:1.5, base:"ttc", label:"Retenue a la source", threshold:1000 });
    wh.enabled   = !!getEl("whEnabled")?.checked;
    wh.rate      = getNum("whRate", wh.rate);
    wh.base      = "ttc";
    wh.label     = getStr("whLabel", wh.label);
    const noteCandidates = [];
    if (typeof document !== "undefined" && document.querySelectorAll) {
      document.querySelectorAll("#whNote").forEach((el) => {
        const val = (el && typeof el.value === "string") ? el.value.trim() : "";
        if (val) noteCandidates.push(val);
      });
    }
    const noteValue = noteCandidates[0] || getStr("whNote", wh.note ?? "");
    wh.note      = noteValue;
    if (typeof SEM.updateWhNoteEditor === "function") {
      SEM.updateWhNoteEditor(noteValue, { group: "main" });
    } else if (typeof document !== "undefined" && document.querySelectorAll) {
      const selection = typeof document.getSelection === "function" ? document.getSelection() : null;
      const activeEl = document.activeElement;
      const isEditing = (editor) => {
        if (!editor) return false;
        if (editor === activeEl || editor.contains(activeEl)) return true;
        const anchor = selection?.rangeCount ? selection.anchorNode : null;
        return !!(anchor && editor.contains(anchor));
      };
      document.querySelectorAll("#whNote").forEach((el) => {
        if (!el) return;
        if (el.value !== noteValue) el.value = noteValue;
      });
      document.querySelectorAll("#whNoteEditor").forEach((editor) => {
        if (!editor) return;
        if (!isEditing(editor) && editor.innerHTML !== (noteValue || "")) {
          editor.innerHTML = noteValue || "";
        }
        const text = (editor.textContent || "")
          .replace(/\u00a0/g, " ")
          .trim();
        editor.dataset.empty = text ? "false" : "true";
      });
    }
    wh.threshold = getNum("whThreshold", wh.threshold ?? 1000);
    st.meta.noteInterne = getStr("noteInterne", st.meta.noteInterne ?? "");

    const acompte = st.meta.acompte || (st.meta.acompte = { enabled:false, paid:0 });
    const acompteChecked = !!getEl("acompteEnabled")?.checked;
    acompte.enabled = acompteChecked;
    acompte.fromCheckbox = acompteChecked;
    acompte.paid    = getNum("acomptePaid", acompte.paid ?? 0);

    const financing = st.meta.financing || (st.meta.financing = { subvention: {}, bank: {} });
    const subvention = financing.subvention || (financing.subvention = {});
    const bank = financing.bank || (financing.bank = {});
    subvention.enabled = !!getEl("subventionEnabled")?.checked;
    subvention.label   = getStr("subventionLabel", subvention.label || "Subvention");
    subvention.amount  = getNum("subventionAmount", subvention.amount ?? 0);
    bank.enabled = !!getEl("finBankEnabled")?.checked;
    bank.label   = getStr("finBankLabel", bank.label || "Financement bancaire");
    bank.amount  = getNum("finBankAmount", bank.amount ?? 0);

    const ex = st.meta.extras || (st.meta.extras = { shipping:{}, stamp:{}, dossier:{}, deplacement:{} });
    const s  = ex.shipping || (ex.shipping = {});
    const t  = ex.stamp    || (ex.stamp    = {});
    const d  = ex.dossier  || (ex.dossier  = {});
    const p  = ex.deplacement || (ex.deplacement = {});
    const addForm = st.meta.addForm || (st.meta.addForm = {});
    const f  = addForm.fodec || (addForm.fodec = { enabled:false, label:"FODEC", rate:1, tva:19 });
    const pf = addForm.purchaseFodec || (addForm.purchaseFodec = { enabled:false, label:"FODEC ACHAT", rate:1, tva:19 });

    s.enabled = !!getEl("shipEnabled")?.checked;
    s.label   = getStr("shipLabel", s.label || "Frais de livraison");
    s.amount  = getNum("shipAmount", s.amount ?? 7);
    s.tva     = getNum("shipTva", s.tva ?? 7);

    t.enabled = !!getEl("stampEnabled")?.checked;
    t.label   = getStr("stampLabel", t.label || "Timbre fiscal");
    t.amount  = getNum("stampAmount", t.amount ?? 1);
    delete t.tva;

    d.enabled = !!getEl("dossierEnabled")?.checked;
    d.label   = getStr("dossierLabel", d.label || "Frais du dossier");
    d.amount  = getNum("dossierAmount", d.amount ?? 0);
    d.tva     = getNum("dossierTva", d.tva ?? 0);

    p.enabled = !!getEl("deplacementEnabled")?.checked;
    p.label   = getStr("deplacementLabel", p.label || "Frais de deplacement");
    p.amount  = getNum("deplacementAmount", p.amount ?? 0);
    p.tva     = getNum("deplacementTva", p.tva ?? 0);

    f.enabled = !!getEl("addFodecEnabled")?.checked;
    f.rate    = getNum("addFodecRate", f.rate ?? 1);
    f.tva     = getNum("addFodecTva",  f.tva  ?? 19);
    pf.enabled = !!getEl("addPurchaseFodecEnabled")?.checked;
    pf.rate    = getNum("addPurchaseFodecRate", pf.rate ?? 1);
    pf.tva     = getNum("addPurchaseFodecTva",  pf.tva  ?? 19);
    addForm.purchaseTva = getNum("addPurchaseTva", addForm.purchaseTva ?? 0);
    addForm.purchaseDiscount = getNum("addPurchaseDiscount", addForm.purchaseDiscount ?? 0);

      const columnMap = SEM.consts?.FIELD_TOGGLE_MAP || {};
      const columnVisibilityDefaults = {
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
        totalTtc: true,
        ...(w.DEFAULT_ARTICLE_FIELD_VISIBILITY && typeof w.DEFAULT_ARTICLE_FIELD_VISIBILITY === "object"
          ? w.DEFAULT_ARTICLE_FIELD_VISIBILITY
          : {})
      };
      const prevColumns = st.meta && typeof st.meta.columns === "object" ? st.meta.columns : {};
      const columnState = {};
      Object.entries(columnMap).forEach(([key, id]) => {
        const el = getEl(id);
        if (el) {
          columnState[key] = !!el.checked;
        } else {
          columnState[key] = Object.prototype.hasOwnProperty.call(prevColumns, key)
            ? !!prevColumns[key]
            : columnVisibilityDefaults[key] !== false;
        }
      });
      st.meta.columns = columnState;

      const reglementState = st.meta.reglement || (st.meta.reglement = {});
      const reglementEnabled = !!getEl("reglementEnabled")?.checked;
      const daysSelected = !!getEl("reglementTypeDays")?.checked;
      const reglementType = daysSelected ? "days" : "reception";
      let reglementDays = null;
      if (daysSelected) {
        const daysInput = getEl("reglementDays");
        const rawDays = String(
          daysInput?.value ??
            daysInput?.getAttribute("value") ??
            reglementState.days ??
            "30"
        )
          .trim();
        let parsedDays = Number(rawDays);
        if (!Number.isFinite(parsedDays)) {
          parsedDays = Number(
            daysInput?.getAttribute("value") ??
              reglementState.days ??
              30
          );
        }
        if (!Number.isFinite(parsedDays)) parsedDays = 30;
        parsedDays = Math.max(0, Math.trunc(parsedDays));
        reglementState.days = parsedDays;
        reglementDays = parsedDays;
      } else {
        if ("days" in reglementState) delete reglementState.days;
      }
      const receptionText = "A réception";
      let reglementText = "";
      if (reglementEnabled) {
        reglementText = daysSelected
          ? `${reglementDays ?? reglementState.days ?? 30} jours`
          : receptionText;
      }
      reglementState.enabled = reglementEnabled;
      reglementState.type = reglementType;
      reglementState.valueText = reglementText;
      reglementState.text = reglementText;
      st.meta.reglementEnabled = reglementEnabled;
      st.meta.reglementText = reglementText;
      st.meta.reglementValue = reglementText;
      st.meta.reglementType = reglementType;
      if (reglementDays !== null) {
        st.meta.reglementDays = reglementDays;
      } else {
        delete st.meta.reglementDays;
      }
  };

  SEM.captureForm = function (opts = {}) {
    const { includeCompany = true } = opts;
    SEM.readInputs();
    const st = SEM.state;
    const companySnapshot = includeCompany ? { ...st.company } : null;
    if (companySnapshot && typeof companySnapshot === "object") {
      if ("smtp" in companySnapshot) delete companySnapshot.smtp;
      if ("smtpProfiles" in companySnapshot) delete companySnapshot.smtpProfiles;
      if ("smtpPreset" in companySnapshot) delete companySnapshot.smtpPreset;
      if ("lanServer" in companySnapshot) delete companySnapshot.lanServer;
    }
    return {
      ...(includeCompany ? { company: companySnapshot || {} } : {}),
      client: { ...st.client },
      meta  : { ...st.meta },
      notes : st.notes,
      items : st.items.map((x) => ({ ...x })),
      totals: SEM.computeTotalsReturn(),
      _schemaVersion: 1
    };
  };

  SEM.newInvoice = function () {
    const st = SEM.state;
    st.client = getDefaultClient();
    if (typeof st.client.__path !== "string") st.client.__path = "";
    if (st.client && "__dirty" in st.client) delete st.client.__dirty;

    st.meta = getDefaultMeta();
    if (typeof BASE_META_DEFAULT.number !== "undefined" && BASE_META_DEFAULT.number !== null) {
      st.meta.number = String(BASE_META_DEFAULT.number || "");
    }
    st.notes = getDefaultNotes();
    st.items = getDefaultItems();
    SEM.selectedItemIndex = null;

    if (typeof setVal === "function") {
      try {
        setVal("docType", st.meta.docType || "facture");
        setVal("invNumber", st.meta.number || "");
        setVal("currency", st.meta.currency || "DT");
        setVal("taxMode", st.meta.taxesEnabled !== false ? "with" : "without");
        setVal("invDate", st.meta.date || "");
        setVal("invDue", st.meta.due || "");
      } catch (err) {
        console.warn("bind meta fields on new invoice", err);
      }
    }
  };
})(window);
