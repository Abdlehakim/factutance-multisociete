(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const DOC_TYPE_PURCHASE = "fa";

  const cloneValue = (value, fallback = null) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  const hasValue = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

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

  const toNumber = (value, fallback = 0) => {
    const num = parseLooseNumber(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const pickFirstValue = (source, keys = []) => {
    const candidate = source && typeof source === "object" ? source : {};
    for (const key of keys) {
      if (hasValue(candidate?.[key])) return candidate[key];
    }
    return undefined;
  };

  const extractDataRoot = (raw) => {
    const source = raw && typeof raw === "object" ? raw : {};
    return source.data && typeof source.data === "object" ? source.data : source;
  };

  const normalizeClientType = (value, fallback = "societe") => {
    const raw = String(value || fallback || "societe").trim().toLowerCase();
    if (!raw) return fallback;
    if (raw === "personne_physique" || raw === "particulier" || raw === "societe") return raw;
    return fallback;
  };

  const resolveClientIdentifier = (client = {}) =>
    String(
      client.vat ||
        client.identifiantFiscal ||
        client.identifiant ||
        client.nif ||
        client.cin ||
        client.passeport ||
        client.passport ||
        ""
    ).trim();

  const mapClientToCompany = (sourceClient = {}, sourceCompany = {}) => {
    const target = { ...sourceCompany };
    const mappedName = String(sourceClient.name || "").trim();
    const mappedVat = resolveClientIdentifier(sourceClient);
    const mappedPhone = String(sourceClient.phone || "").trim();
    const mappedEmail = String(sourceClient.email || "").trim();
    const mappedAddress = String(sourceClient.address || "").trim();
    const mappedCustomsCode = String(
      sourceClient.stegRef || sourceClient.customsCode || ""
    ).trim();
    const mappedIban = String(
      sourceClient.account || sourceClient.accountOf || sourceClient.iban || ""
    ).trim();

    if (mappedName) target.name = mappedName;
    if (mappedVat) target.vat = mappedVat;
    if (mappedPhone) target.phone = mappedPhone;
    if (mappedEmail) target.email = mappedEmail;
    if (mappedAddress) target.address = mappedAddress;
    if (mappedCustomsCode) target.customsCode = mappedCustomsCode;
    if (mappedIban) target.iban = mappedIban;

    return target;
  };

  const mapCompanyToClient = (sourceCompany = {}, sourceClient = {}) => {
    const target = { ...sourceClient };
    const mappedName = String(sourceCompany.name || "").trim();
    const mappedVat = String(sourceCompany.vat || "").trim();
    const mappedPhone = String(sourceCompany.phone || "").trim();
    const mappedEmail = String(sourceCompany.email || "").trim();
    const mappedAddress = String(sourceCompany.address || "").trim();
    const mappedAccount = String(sourceCompany.iban || sourceCompany.account || "").trim();
    const mappedStegRef = String(
      sourceCompany.customsCode || sourceCompany.stegRef || ""
    ).trim();

    target.type = normalizeClientType(sourceCompany.type || target.type || "societe");
    if (mappedName) target.name = mappedName;
    if (mappedVat) target.vat = mappedVat;
    if (mappedPhone) target.phone = mappedPhone;
    if (mappedEmail) target.email = mappedEmail;
    if (mappedAddress) target.address = mappedAddress;
    if (mappedAccount) {
      target.account = mappedAccount;
      target.accountOf = mappedAccount;
    }
    if (mappedStegRef) target.stegRef = mappedStegRef;
    if (!hasValue(target.benefit)) target.benefit = "";

    return target;
  };

  const normalizeItemsForPurchase = (items = []) => {
    if (!Array.isArray(items)) return [];
    return items.map((entry) => {
      const source = entry && typeof entry === "object" ? entry : {};
      const salesPriceSource = pickFirstValue(source, [
        "price",
        "unitPrice",
        "unit_price",
        "pu",
        "puHt",
        "pu_ht",
        "prixUnitaire",
        "prix_unitaire"
      ]);
      const salesTvaSource = pickFirstValue(source, [
        "tva",
        "vat",
        "tax",
        "taxRate",
        "tax_rate",
        "tvaRate",
        "tva_rate"
      ]);
      const salesPrice = hasValue(salesPriceSource) ? toNumber(salesPriceSource, 0) : 0;
      const salesTva = hasValue(salesTvaSource) ? toNumber(salesTvaSource, 0) : 0;
      const purchasePriceSource = pickFirstValue(source, [
        "purchasePrice",
        "purchase_price",
        "buyPrice",
        "buy_price",
        "prixAchat",
        "prix_achat",
        "purchaseHt",
        "purchase_ht",
        "puAchat",
        "pu_achat",
        "puAchatHt",
        "pu_achat_ht",
        "puAHt",
        "pu_a_ht"
      ]);
      const purchaseTvaSource = pickFirstValue(source, [
        "purchaseTva",
        "purchase_tva",
        "purchaseVat",
        "purchase_vat",
        "buyTva",
        "buy_tva",
        "tvaAchat",
        "tva_achat",
        "purchaseTax",
        "purchase_tax"
      ]);
      const purchasePriceRaw = hasValue(purchasePriceSource)
        ? toNumber(purchasePriceSource, 0)
        : salesPrice;
      const purchaseTvaRaw = hasValue(purchaseTvaSource)
        ? toNumber(purchaseTvaSource, 0)
        : salesTva;
      const purchasePrice =
        purchasePriceRaw === 0 && salesPrice !== 0 ? salesPrice : purchasePriceRaw;
      const purchaseTva =
        purchaseTvaRaw === 0 && salesTva !== 0 ? salesTva : purchaseTvaRaw;
      return {
        ...source,
        price: salesPrice,
        tva: salesTva,
        purchasePrice,
        purchaseTva
      };
    });
  };

  const applyModelConfigToMeta = (meta, modelName, modelConfig) => {
    const config = modelConfig && typeof modelConfig === "object" ? modelConfig : null;
    if (!config) return;

    const normalizedModelName = String(modelName || "").trim();
    if (normalizedModelName) {
      meta.documentModelName = normalizedModelName;
      meta.docDialogModelName = normalizedModelName;
      meta.modelName = normalizedModelName;
      meta.modelKey = normalizedModelName;
    }

    if (hasValue(config.template)) meta.template = String(config.template).trim();
    if (hasValue(config.currency)) meta.currency = String(config.currency).trim().toUpperCase();
    if (typeof config.taxesEnabled === "boolean") meta.taxesEnabled = config.taxesEnabled;
    if (Number.isFinite(Number(config.numberLength))) {
      meta.numberLength = Number(config.numberLength);
    }
    if (hasValue(config.numberFormat)) meta.numberFormat = String(config.numberFormat).trim();

    if (config.columns && typeof config.columns === "object") {
      const columns = cloneValue(config.columns, {});
      meta.modelColumns = cloneValue(columns, columns);
      meta.columns = cloneValue(columns, columns);
    }
    if (config.addForm && typeof config.addForm === "object") {
      const addForm = cloneValue(config.addForm, {});
      meta.addForm = { ...(meta.addForm || {}), ...addForm };
    }
    if (config.withholding && typeof config.withholding === "object") {
      meta.withholding = cloneValue(config.withholding, config.withholding);
    }
    if (config.acompte && typeof config.acompte === "object") {
      meta.acompte = cloneValue(config.acompte, config.acompte);
    }
    if (config.financing && typeof config.financing === "object") {
      meta.financing = cloneValue(config.financing, config.financing);
    }

    const extras = meta.extras && typeof meta.extras === "object" ? { ...meta.extras } : {};
    if (config.pdf && typeof config.pdf === "object") {
      extras.pdf = { ...(extras.pdf || {}), ...cloneValue(config.pdf, config.pdf) };
    }
    if (config.shipping && typeof config.shipping === "object") {
      extras.shipping = cloneValue(config.shipping, config.shipping);
    }
    if (config.dossier && typeof config.dossier === "object") {
      extras.dossier = cloneValue(config.dossier, config.dossier);
    }
    if (config.deplacement && typeof config.deplacement === "object") {
      extras.deplacement = cloneValue(config.deplacement, config.deplacement);
    }
    if (config.stamp && typeof config.stamp === "object") {
      extras.stamp = cloneValue(config.stamp, config.stamp);
    }
    if (Object.keys(extras).length) meta.extras = extras;
  };

  function convertFactureToPurchase(rawInvoice, options = {}) {
    const sourceRoot = extractDataRoot(rawInvoice);
    const sourceMeta =
      sourceRoot.meta && typeof sourceRoot.meta === "object" ? sourceRoot.meta : {};
    const sourceCompany =
      sourceRoot.company && typeof sourceRoot.company === "object" ? sourceRoot.company : {};
    const sourceClient =
      sourceRoot.client && typeof sourceRoot.client === "object" ? sourceRoot.client : {};
    const entry = options?.entry && typeof options.entry === "object" ? options.entry : {};
    const modelName = String(options?.modelName || "").trim();
    const modelConfig =
      options?.modelConfig && typeof options.modelConfig === "object" ? options.modelConfig : null;

    const converted = cloneValue(sourceRoot, {});
    if (!converted || typeof converted !== "object") return null;

    converted.company = mapClientToCompany(sourceClient, sourceCompany);
    converted.client = mapCompanyToClient(sourceCompany, sourceClient);
    converted.clientType = normalizeClientType(
      converted.client?.type || converted.clientType || "societe"
    );

    const meta = converted.meta && typeof converted.meta === "object" ? converted.meta : {};
    converted.meta = meta;
    meta.docType = DOC_TYPE_PURCHASE;
    if (hasValue(sourceMeta.number) && !hasValue(meta.number)) meta.number = sourceMeta.number;
    if (hasValue(sourceMeta.date) && !hasValue(meta.date)) meta.date = sourceMeta.date;
    if (!hasValue(meta.number) && hasValue(entry?.number)) meta.number = String(entry.number).trim();
    if (!hasValue(meta.date) && hasValue(entry?.date)) meta.date = String(entry.date).trim();

    delete meta.historyPath;
    delete meta.historyDocType;
    delete meta.historyStatus;
    delete meta.status;

    const sourceNumber = String(sourceMeta.number || entry?.number || "").trim();
    const sourceDate = String(sourceMeta.date || entry?.date || "").trim();
    meta.convertedFrom = {
      docType: "facture",
      number: sourceNumber,
      date: sourceDate
    };

    applyModelConfigToMeta(meta, modelName, modelConfig);

    const addForm = meta.addForm && typeof meta.addForm === "object" ? meta.addForm : {};
    meta.addForm = addForm;
    if (!hasValue(addForm.purchasePrice) && hasValue(addForm.price)) {
      addForm.purchasePrice = toNumber(addForm.price, 0);
    }
    if (!hasValue(addForm.purchaseTva) && hasValue(addForm.tva)) {
      addForm.purchaseTva = toNumber(addForm.tva, 19);
    }

    converted.items = normalizeItemsForPurchase(sourceRoot.items);

    return {
      invoiceData: converted,
      source: {
        docType: "facture",
        number: sourceNumber,
        date: sourceDate,
        path: String(entry?.path || "").trim()
      },
      target: {
        docType: DOC_TYPE_PURCHASE,
        modelName
      }
    };
  }

  AppInit.DocHistoryPurchaseConverter = {
    convertFactureToPurchase
  };
})(window);
