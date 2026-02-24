(function bootstrapDefaults(globalScope) {
  const w = globalScope || {};

  const APP_NAME = "Facturance";
  const APP_VERSION = "v2.2.0";
  const TODAY = new Date().toISOString().slice(0, 10);
  const DUE = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);


function getBrandedCompanyName() {
  // 1) If branding was loaded as a browser script
  try {
    const n = w?.__FACTURANCE_BRANDING__?.companyName;
    if (typeof n === "string" && n.trim()) return n.trim();
  } catch (_) {}

  try {
    if (typeof require === "function") {
      const branding = require("./branding.js");
      const n = typeof branding?.companyName === "string" ? branding.companyName.trim() : "";
      if (n) return n;
    }
  } catch (_) {}
}

  const DEFAULT_COMPANY_TEMPLATE = {
    name: getBrandedCompanyName(),
    type: "societe",
    vat: "",
    customsCode: "",
    iban: "",
    phone: "",
    fax: "",
    email: "",
    address: "",
    smtpPreset: "professional",
    smtpProfiles: {
      professional: {
        enabled: false,
        host: "",
        port: 587,
        secure: false,
        user: "",
        pass: "",
        fromEmail: "",
        fromName: ""
      },
      gmail: {
        enabled: false,
        host: "smtp.gmail.com",
        port: 587,
        
        secure: false,
        user: "",
        pass: "",
        fromEmail: "",
        fromName: ""
      }
    },
    logo: "",
    seal: { enabled:false, image:"", maxWidthMm:40, maxHeightMm:40, opacity:1, rotateDeg:-2 },
    signature: { enabled:false, image:"", rotateDeg:0 }
  };

  const DEFAULT_CLIENT = {
    type: "societe",
    name: "",
    email: "",
    phone: "",
    address: "",
    vat: "",
    benefit: "",
    account: "",
    soldClient: "0",
    stegRef: ""
  };
  const DEFAULT_CLIENT_FIELD_VISIBILITY = {
    benefit: false,
    account: false,
    soldClient: false,
    name: true,
    stegRef: false,
    taxId: true,
    phone: true,
    email: true,
    address: true
  };
  const DEFAULT_CLIENT_FIELD_LABELS = {
    benefit: "Au profit de",
    account: "Pour le compte de",
    soldClient: "Solde client initial",
    name: "Nom",
    stegRef: "Ref STEG",
    taxId: "Matricule fiscal",
    phone: "Telephone",
    email: "E-mail",
    address: "Adresse"
  };
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

  const DEFAULT_META = {
    number: "",
    currency: "DT",
    date: TODAY,
    due: DUE,
    docType: "facture",
    stockAdjusted: false,
    reglement: { enabled: false, type: "reception", days: 30 },
    reglementDays: 30,
    withholding: { enabled:false, rate:1.5, base:"ttc", label:"Retenue A la source", threshold:1000 },
    financing: {
      subvention: { enabled:false, label:"Subvention", amount:0 },
      bank: { enabled:false, label:"Financement bancaire", amount:0 }
    },
    extras: {
      shipping: { enabled:false, label:"Frais de livraison", amount:7, tva:0 },
      stamp:    { enabled:false, label:"Timbre fiscal",       amount:1 },
      dossier:  { enabled:false, label:"Frais du dossier",    amount:0, tva:0 },
      deplacement: { enabled:false, label:"Frais de deplacement", amount:0, tva:0 }
    },
    itemsHeaderColor: "#15335e",
    addForm: {
      fodec: { enabled:false, label:"FODEC", rate:1, tva:19 }
    }
  };

  const DEFAULT_NOTES = "";
  const DEFAULT_ITEMS = [];

  const DEFAULTS = {
    company: DEFAULT_COMPANY_TEMPLATE,
    client:  DEFAULT_CLIENT,
    meta:    DEFAULT_META,
    notes:   DEFAULT_NOTES,
    items:   DEFAULT_ITEMS,
    articleFieldVisibility: DEFAULT_ARTICLE_FIELD_VISIBILITY,
    clientFieldVisibility: DEFAULT_CLIENT_FIELD_VISIBILITY,
    clientFieldLabels: DEFAULT_CLIENT_FIELD_LABELS
  };

  w.APP_NAME = APP_NAME;
  w.APP_VERSION = APP_VERSION;
  w.DEFAULT_COMPANY_TEMPLATE = DEFAULT_COMPANY_TEMPLATE;
  w.DEFAULT_COMPANY = DEFAULT_COMPANY_TEMPLATE;
  w.DEFAULT_CLIENT = DEFAULT_CLIENT;
  w.DEFAULT_ARTICLE_FIELD_VISIBILITY = DEFAULT_ARTICLE_FIELD_VISIBILITY;
  w.DEFAULT_CLIENT_FIELD_VISIBILITY = DEFAULT_CLIENT_FIELD_VISIBILITY;
  w.DEFAULT_CLIENT_FIELD_LABELS = DEFAULT_CLIENT_FIELD_LABELS;
  w.DEFAULT_META = DEFAULT_META;
  w.DEFAULT_NOTES = DEFAULT_NOTES;
  w.DEFAULT_ITEMS = DEFAULT_ITEMS;
  w.DEFAULTS = DEFAULTS;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      APP_NAME,
      APP_VERSION,
      DEFAULT_COMPANY_TEMPLATE,
      DEFAULT_COMPANY: DEFAULT_COMPANY_TEMPLATE,
      DEFAULT_CLIENT,
      DEFAULT_ARTICLE_FIELD_VISIBILITY,
      DEFAULT_CLIENT_FIELD_VISIBILITY,
      DEFAULT_CLIENT_FIELD_LABELS,
      DEFAULT_META,
      DEFAULT_NOTES,
      DEFAULT_ITEMS,
      DEFAULTS
    };
  }
})(typeof window !== "undefined" ? window : undefined);

