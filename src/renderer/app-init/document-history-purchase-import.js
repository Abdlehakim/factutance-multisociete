(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const SCHEMA_VERSION = "facturance.purchase-invoice.v1";
  const DOC_TYPE_PURCHASE = "fa";
  const SUPPLIER_ENTITY_TYPE = "vendor";
  const SUPPLIER_FALLBACK_NAME = "fournisseur";
  const PURCHASE_IMPORT_MODAL_ID = "docHistoryPurchaseImportModal";
  const PURCHASE_IMPORT_FILE_ID = "docHistoryPurchaseImportFile";
  const PURCHASE_IMPORT_SUMMARY_ID = "docHistoryPurchaseImportSummary";
  const PURCHASE_IMPORT_ERRORS_ID = "docHistoryPurchaseImportErrors";
  const PURCHASE_IMPORT_CLOSE_ID = "docHistoryPurchaseImportClose";
  const PURCHASE_IMPORT_CANCEL_ID = "docHistoryPurchaseImportCancel";
  const PURCHASE_IMPORT_SAVE_ID = "docHistoryPurchaseImportSave";
  const DEFAULT_COMPANY_SEAL = {
    enabled: false,
    image: "",
    maxWidthMm: 40,
    maxHeightMm: 40,
    opacity: 1,
    rotateDeg: -2
  };
  const DEFAULT_COMPANY_SIGNATURE = {
    enabled: false,
    image: "",
    maxWidthMm: 40,
    maxHeightMm: 20,
    opacity: 1,
    rotateDeg: 0
  };

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

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

  const toNumberOrNull = (value) => {
    const num = parseLooseNumber(value);
    return Number.isFinite(num) ? num : null;
  };

  const toNumber = (value, fallback = 0) => {
    const num = parseLooseNumber(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const pickFirstValue = (source, keys = []) => {
    const target = isPlainObject(source) ? source : {};
    for (const key of keys) {
      if (hasValue(target?.[key])) return target[key];
    }
    return undefined;
  };

  const resolveDataRoot = (value) => {
    const source = isPlainObject(value) ? value : {};
    if (isPlainObject(source.data)) return source.data;
    return source;
  };

  const normalizeText = (value) => String(value ?? "").trim();

  const normalizeKey = (value) => normalizeText(value).toLowerCase();

  const normalizePhoneKey = (value) =>
    normalizeKey(value).replace(/[^0-9+]/g, "");

  const normalizeSupplierProfileType = (value, fallback = "societe") => {
    const normalized = normalizeKey(value || fallback || "societe");
    if (normalized === "particulier" || normalized === "personne_physique") {
      return normalized;
    }
    if (normalized === "societe" || normalized === "societes") return "societe";
    return fallback;
  };

  const dedupeTextValues = (values = []) => {
    const seen = new Set();
    const result = [];
    values.forEach((entry) => {
      const text = normalizeText(entry);
      if (!text) return;
      const key = normalizeKey(text);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(text);
    });
    return result;
  };

  const toBoolean = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    return fallback;
  };

  const sanitizeCompanyProfileForInvoice = (rawCompany) => {
    const source = isPlainObject(rawCompany) ? rawCompany : {};
    const sealSource = isPlainObject(source.seal) ? source.seal : {};
    const signatureSource = isPlainObject(source.signature) ? source.signature : {};

    return {
      name: normalizeText(source.name),
      type: normalizeText(source.type || "societe"),
      vat: normalizeText(source.vat),
      customsCode: normalizeText(source.customsCode),
      iban: normalizeText(source.iban),
      phone: normalizeText(source.phone),
      fax: normalizeText(source.fax),
      email: normalizeText(source.email),
      address: normalizeText(source.address),
      logo: normalizeText(source.logo),
      logoPath: normalizeText(source.logoPath),
      seal: {
        enabled: toBoolean(sealSource.enabled, DEFAULT_COMPANY_SEAL.enabled),
        image: normalizeText(sealSource.image),
        maxWidthMm: toNumber(sealSource.maxWidthMm, DEFAULT_COMPANY_SEAL.maxWidthMm),
        maxHeightMm: toNumber(sealSource.maxHeightMm, DEFAULT_COMPANY_SEAL.maxHeightMm),
        opacity: toNumber(sealSource.opacity, DEFAULT_COMPANY_SEAL.opacity),
        rotateDeg: toNumber(sealSource.rotateDeg, DEFAULT_COMPANY_SEAL.rotateDeg)
      },
      signature: {
        enabled: toBoolean(signatureSource.enabled, DEFAULT_COMPANY_SIGNATURE.enabled),
        image: normalizeText(signatureSource.image),
        maxWidthMm: toNumber(signatureSource.maxWidthMm, DEFAULT_COMPANY_SIGNATURE.maxWidthMm),
        maxHeightMm: toNumber(signatureSource.maxHeightMm, DEFAULT_COMPANY_SIGNATURE.maxHeightMm),
        opacity: toNumber(signatureSource.opacity, DEFAULT_COMPANY_SIGNATURE.opacity),
        rotateDeg: toNumber(signatureSource.rotateDeg, DEFAULT_COMPANY_SIGNATURE.rotateDeg)
      }
    };
  };

  const readPersistedCompanyProfile = async () => {
    if (!w.electronAPI?.loadCompanyData) {
      throw new Error(
        "Import impossible: chargement du profil entreprise depuis la base de donnees indisponible."
      );
    }

    let res = null;
    try {
      res = await w.electronAPI.loadCompanyData();
    } catch (err) {
      throw new Error(
        String(
          err?.message ||
            err ||
            "Import impossible: echec du chargement du profil entreprise depuis la base de donnees."
        )
      );
    }

    if (!res?.ok) {
      throw new Error(
        String(
          res?.error ||
            "Import impossible: profil entreprise introuvable dans la base de donnees."
        )
      );
    }

    if (!isPlainObject(res.data)) {
      throw new Error(
        "Import impossible: profil entreprise invalide ou absent dans la base de donnees."
      );
    }

    return sanitizeCompanyProfileForInvoice(cloneValue(res.data, {}));
  };

  const overwriteSnapshotCompanyWithStoredProfile = async (snapshot) => {
    const root = resolveDataRoot(snapshot);
    root.company = await readPersistedCompanyProfile();
    return root.company;
  };

  const buildSupplierDraftFromClient = (clientSource) => {
    const source = isPlainObject(clientSource) ? clientSource : {};
    const profileType = normalizeSupplierProfileType(source.type, "societe");
    const name = normalizeText(source.name || source.company);
    const benefit = normalizeText(source.benefit);
    const account = normalizeText(source.account || source.accountOf || source.iban);
    const identifiantFiscal = normalizeText(
      source.identifiantFiscal || source.identifiant || source.nif || source.vat || source.tva
    );
    const vat = normalizeText(source.vat || identifiantFiscal);
    const cin = normalizeText(source.cin);
    const passport = normalizeText(source.passport || source.passeport);
    const stegRef = normalizeText(source.stegRef);
    const phone = normalizeText(source.phone || source.telephone || source.tel);
    const email = normalizeText(source.email);
    const address = normalizeText(source.address);

    const data = {
      type: profileType,
      name,
      benefit,
      account,
      accountOf: account,
      vat,
      identifiantFiscal,
      cin,
      passport,
      stegRef,
      phone,
      email,
      address
    };

    const keys = {
      name: normalizeKey(name),
      account: normalizeKey(account),
      tax: normalizeKey(identifiantFiscal || vat),
      cin: normalizeKey(cin || passport),
      email: normalizeKey(email),
      phone: normalizePhoneKey(phone)
    };

    const hasIdentity = !!(
      keys.name ||
      keys.account ||
      keys.tax ||
      keys.cin ||
      keys.email ||
      keys.phone
    );

    return {
      data,
      keys,
      hasIdentity,
      suggestedName: name || account || SUPPLIER_FALLBACK_NAME,
      queries: dedupeTextValues([
        account,
        identifiantFiscal,
        vat,
        cin,
        passport,
        email,
        phone,
        name
      ])
    };
  };

  const doesVendorMatchDraft = (item, draft) => {
    if (!item || !draft) return false;
    const existing = isPlainObject(item.client) ? item.client : {};
    const existingName = normalizeKey(existing.name || item.name);
    const existingAccount = normalizeKey(existing.account || existing.accountOf);
    const existingTax = normalizeKey(
      existing.identifiantFiscal || existing.identifiant || existing.nif || existing.vat || existing.tva
    );
    const existingCin = normalizeKey(existing.cin || existing.passport || existing.passeport);
    const existingEmail = normalizeKey(existing.email);
    const existingPhone = normalizePhoneKey(existing.phone || existing.telephone || existing.tel);

    if (draft.keys.account && existingAccount && draft.keys.account === existingAccount) return true;
    if (draft.keys.tax && existingTax && draft.keys.tax === existingTax) return true;
    if (draft.keys.cin && existingCin && draft.keys.cin === existingCin) return true;
    if (draft.keys.email && existingEmail && draft.keys.email === existingEmail) return true;
    if (draft.keys.phone && existingPhone && draft.keys.phone === existingPhone) return true;

    const hasStrongKey = !!(
      draft.keys.account ||
      draft.keys.tax ||
      draft.keys.cin ||
      draft.keys.email ||
      draft.keys.phone
    );
    if (!hasStrongKey && draft.keys.name && existingName && draft.keys.name === existingName) {
      return true;
    }

    return false;
  };

  const findExistingVendorPath = async (draft) => {
    if (!draft?.queries?.length || !w.electronAPI?.searchClients) return "";
    const visited = new Set();
    for (const query of draft.queries) {
      let res = null;
      try {
        res = await w.electronAPI.searchClients({
          query,
          entityType: SUPPLIER_ENTITY_TYPE,
          limit: 100
        });
      } catch {
        res = null;
      }
      if (!res?.ok) continue;
      const rows = Array.isArray(res.results) ? res.results : [];
      for (const row of rows) {
        const pathValue = normalizeText(row?.path);
        if (!pathValue || visited.has(pathValue)) continue;
        visited.add(pathValue);
        if (doesVendorMatchDraft(row, draft)) return pathValue;
      }
    }
    return "";
  };

  const ensureImportedSupplierLink = async (snapshot) => {
    const root = resolveDataRoot(snapshot);
    if (!isPlainObject(root.client)) root.client = {};
    const client = root.client;
    const draft = buildSupplierDraftFromClient(client);

    delete client.__path;

    if (!draft.hasIdentity) {
      return { ok: true, skipped: true };
    }

    if (!hasValue(client.type)) {
      client.type = draft.data.type || "societe";
    }

    const existingPath = await findExistingVendorPath(draft);
    if (existingPath) {
      client.__path = existingPath;
      return { ok: true, path: existingPath, reused: true };
    }

    if (!w.electronAPI?.saveClientDirect) {
      return { ok: true, skipped: true };
    }

    let saveRes = null;
    try {
      saveRes = await w.electronAPI.saveClientDirect({
        client: draft.data,
        suggestedName: draft.suggestedName,
        entityType: SUPPLIER_ENTITY_TYPE
      });
    } catch (err) {
      return {
        ok: false,
        error: String(err?.message || err || "Enregistrement du fournisseur impossible.")
      };
    }

    if (!saveRes?.ok || !saveRes?.path) {
      const recoveredPath = await findExistingVendorPath(draft);
      if (recoveredPath) {
        client.__path = recoveredPath;
        return { ok: true, path: recoveredPath, reused: true };
      }
      return {
        ok: false,
        error: String(saveRes?.error || "Enregistrement du fournisseur impossible.")
      };
    }

    const savedPath = normalizeText(saveRes.path);
    if (savedPath) {
      client.__path = savedPath;
      return { ok: true, path: savedPath, reused: false };
    }

    return {
      ok: false,
      error: "Fournisseur enregistre sans chemin exploitable."
    };
  };

  const readFileText = async (file) => {
    if (!file) throw new Error("Fichier introuvable.");
    if (typeof file.text === "function") return await file.text();
    if (typeof FileReader === "undefined") throw new Error("Lecture de fichier indisponible.");
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(file, "utf-8");
    });
  };

  const parseEnvelope = (raw) => {
    const source = isPlainObject(raw) ? raw : {};
    const schemaVersion = String(source.schemaVersion || "").trim();
    if (!schemaVersion) {
      return { ok: false, error: "Fichier invalide: schemaVersion manquant." };
    }
    if (schemaVersion !== SCHEMA_VERSION) {
      return {
        ok: false,
        error: `Schema non pris en charge (${schemaVersion}). Version attendue: ${SCHEMA_VERSION}.`
      };
    }

    const payload = isPlainObject(source.payload) ? source.payload : null;
    if (!payload) return { ok: false, error: "Fichier invalide: payload manquant." };

    const targetDocType = String(payload?.target?.docType || "").trim().toLowerCase();
    if (targetDocType && targetDocType !== DOC_TYPE_PURCHASE) {
      return { ok: false, error: "Ce fichier n'est pas un export de facture d'achat." };
    }

    const invoice = isPlainObject(payload.invoice) ? payload.invoice : null;
    if (!invoice) {
      return { ok: false, error: "Fichier invalide: facture exportee introuvable." };
    }

    return {
      ok: true,
      schemaVersion,
      payload: cloneValue(payload, {}),
      invoiceData: cloneValue(invoice, {})
    };
  };

  const normalizeImportedSnapshot = (invoiceData, envelopePayload) => {
    const snapshot = cloneValue(invoiceData, {});
    if (!isPlainObject(snapshot)) return null;

    const root = resolveDataRoot(snapshot);
    if (!isPlainObject(root.meta)) root.meta = {};
    const meta = root.meta;
    meta.docType = DOC_TYPE_PURCHASE;

    if (!meta.number) {
      const sourceNumber = String(envelopePayload?.source?.number || "").trim();
      if (sourceNumber) meta.number = sourceNumber;
    }
    if (!meta.date) {
      const sourceDate = String(envelopePayload?.source?.date || "").trim();
      if (sourceDate) meta.date = sourceDate;
    }

    delete meta.historyPath;
    delete meta.historyDocType;
    delete meta.historyStatus;
    delete meta.status;

    if (Array.isArray(root.items)) {
      root.items = root.items.map((entry) => {
        const source = isPlainObject(entry) ? entry : {};
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
        const qtySource = pickFirstValue(source, ["qty", "quantity", "qte", "quantite"]);
        const discountSource = pickFirstValue(source, [
          "discount",
          "discountPct",
          "discount_pct",
          "discountRate",
          "discount_rate",
          "remise"
        ]);

        const salesPrice = hasValue(salesPriceSource) ? toNumber(salesPriceSource, 0) : 0;
        const salesTva = hasValue(salesTvaSource) ? toNumber(salesTvaSource, 0) : 0;
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
          qty: hasValue(qtySource) ? toNumber(qtySource, 0) : toNumber(source.qty, 0),
          discount: hasValue(discountSource)
            ? toNumber(discountSource, 0)
            : toNumber(source.discount, 0),
          price: salesPrice,
          tva: salesTva,
          purchasePrice,
          purchaseTva
        };
      });
    }

    return snapshot;
  };

  const buildHistorySummary = (snapshot) => {
    const root = resolveDataRoot(snapshot);
    const meta = isPlainObject(root.meta) ? root.meta : {};
    const totals = isPlainObject(root.totals) ? root.totals : {};
    const client = isPlainObject(root.client) ? root.client : {};
    const acompte = isPlainObject(totals.acompte) ? totals.acompte : {};
    const reglement = isPlainObject(meta.reglement) ? meta.reglement : {};

    return {
      clientName: String(client.name || "").trim(),
      clientAccount: String(client.account || client.accountOf || "").trim(),
      totalHT: toNumberOrNull(totals.totalHT ?? totals.totalHt),
      totalTTC: toNumberOrNull(totals.totalTTC ?? totals.totalTtc ?? totals.grand),
      currency: String(totals.currency || meta.currency || "").trim(),
      paid: toNumberOrNull(acompte.paid),
      balanceDue: toNumberOrNull(totals.balanceDue ?? acompte.remaining),
      acompteEnabled: typeof acompte.enabled === "boolean" ? acompte.enabled : undefined,
      reglementEnabled:
        typeof reglement.enabled === "boolean" ? reglement.enabled : undefined,
      reglementText: String(reglement.valueText || reglement.text || "").trim()
    };
  };

  const addImportedHistoryEntry = (snapshot, saveResult) => {
    if (!saveResult?.path || typeof w.addDocumentHistory !== "function") return;
    const root = resolveDataRoot(snapshot);
    const meta = isPlainObject(root.meta) ? root.meta : {};
    const summary = buildHistorySummary(snapshot);
    w.addDocumentHistory({
      docType: DOC_TYPE_PURCHASE,
      path: saveResult.path,
      number: String(saveResult.number || meta.number || "").trim(),
      date: String(meta.date || "").trim(),
      name: String(saveResult.name || "").trim(),
      clientName: summary.clientName,
      clientAccount: summary.clientAccount,
      totalHT: summary.totalHT,
      totalTTC: summary.totalTTC,
      currency: summary.currency,
      paid: summary.paid,
      balanceDue: summary.balanceDue,
      acompteEnabled: summary.acompteEnabled,
      reglementEnabled: summary.reglementEnabled,
      reglementText: summary.reglementText,
      hasComment: !!String(meta.noteInterne || "").trim(),
      convertedFrom: isPlainObject(meta.convertedFrom) ? meta.convertedFrom : undefined
    });
    if (typeof w.updateDocumentHistoryComment === "function") {
      w.updateDocumentHistoryComment(DOC_TYPE_PURCHASE, saveResult.path, meta.noteInterne ?? "");
    }
  };

  const buildPurchaseImportModalMarkup = () => `
    <div id="${PURCHASE_IMPORT_MODAL_ID}" class="swbDialog client-import-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel client-import-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docHistoryPurchaseImportTitle"
        aria-describedby="docHistoryPurchaseImportHint"
      >
        <div class="swbDialog__header">
          <div id="docHistoryPurchaseImportTitle" class="swbDialog__title">Importer une facture d'achat</div>
          <button id="${PURCHASE_IMPORT_CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-import-modal__body swbDialog__msg">
          <p id="docHistoryPurchaseImportHint" class="client-import-modal__hint">
            Selectionnez le fichier JSON versionne exporte depuis "Expoter tant que Facture d'achat".
          </p>
          <label class="client-import-modal__file">
            <span class="client-import-modal__label">Fichier</span>
            <input id="${PURCHASE_IMPORT_FILE_ID}" type="file" accept=".json,application/json" />
          </label>
          <div id="${PURCHASE_IMPORT_SUMMARY_ID}" class="client-import-modal__summary" aria-live="polite"></div>
          <ul id="${PURCHASE_IMPORT_ERRORS_ID}" class="client-import-modal__errors" aria-live="polite"></ul>
        </div>
        <div class="swbDialog__actions client-import-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${PURCHASE_IMPORT_CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="${PURCHASE_IMPORT_SAVE_ID}" type="button" class="swbDialog__ok" disabled>Importer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensurePurchaseImportModal = () => {
    if (typeof document === "undefined") return null;
    let modal = document.getElementById(PURCHASE_IMPORT_MODAL_ID);
    if (modal) return modal;
    const host = document.getElementById("app") || document.body;
    if (!host) return null;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildPurchaseImportModalMarkup().trim();
    modal = wrapper.firstElementChild;
    if (!modal) return null;
    host.appendChild(modal);
    return modal;
  };

  let purchaseImportModalController = null;

  const createPurchaseImportModalController = () => {
    if (purchaseImportModalController) return purchaseImportModalController;
    const modal = ensurePurchaseImportModal();
    if (!modal) return null;

    const fileInput = modal.querySelector(`#${PURCHASE_IMPORT_FILE_ID}`);
    const summaryEl = modal.querySelector(`#${PURCHASE_IMPORT_SUMMARY_ID}`);
    const errorsEl = modal.querySelector(`#${PURCHASE_IMPORT_ERRORS_ID}`);
    const closeBtn = modal.querySelector(`#${PURCHASE_IMPORT_CLOSE_ID}`);
    const cancelBtn = modal.querySelector(`#${PURCHASE_IMPORT_CANCEL_ID}`);
    const saveBtn = modal.querySelector(`#${PURCHASE_IMPORT_SAVE_ID}`);

    const state = {
      file: null,
      busy: false,
      restoreFocus: null,
      pendingPromise: null,
      resolvePending: null
    };

    const setSummary = (text) => {
      if (!summaryEl) return;
      const content = normalizeText(text);
      summaryEl.textContent = content;
      summaryEl.hidden = !content;
    };

    const setErrors = (errors = []) => {
      if (!errorsEl) return;
      errorsEl.innerHTML = "";
      const list = Array.isArray(errors) ? errors : [errors];
      const normalized = list
        .map((entry) => normalizeText(entry))
        .filter(Boolean);
      if (!normalized.length) {
        errorsEl.hidden = true;
        return;
      }
      normalized.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        errorsEl.appendChild(li);
      });
      errorsEl.hidden = false;
    };

    const setBusy = (busy) => {
      state.busy = !!busy;
      if (state.busy) modal.setAttribute("aria-busy", "true");
      else modal.removeAttribute("aria-busy");
      if (fileInput) fileInput.disabled = state.busy;
      if (closeBtn) closeBtn.disabled = state.busy;
      if (cancelBtn) cancelBtn.disabled = state.busy;
      if (saveBtn) saveBtn.disabled = state.busy || !state.file;
    };

    const finalizePending = (result) => {
      if (typeof state.resolvePending === "function") {
        state.resolvePending(result);
      }
      state.resolvePending = null;
      state.pendingPromise = null;
    };

    const resetState = () => {
      state.file = null;
      if (fileInput) fileInput.value = "";
      setSummary("");
      setErrors([]);
      setBusy(false);
    };

    const hideModal = () => {
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    };

    const showModal = () => {
      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      closeModal({ ok: false, canceled: true });
    };

    const closeModal = (result = { ok: false, canceled: true }) => {
      if (state.busy) return;
      hideModal();
      document.removeEventListener("keydown", onKeydown, true);
      const focusTarget = state.restoreFocus;
      state.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
      finalizePending(result);
    };

    const openModal = (trigger = null) => {
      if (state.pendingPromise) {
        return state.pendingPromise;
      }
      state.pendingPromise = new Promise((resolve) => {
        state.resolvePending = resolve;
      });
      state.restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      resetState();
      showModal();
      document.addEventListener("keydown", onKeydown, true);
      if (fileInput && typeof fileInput.focus === "function") {
        try {
          fileInput.focus({ preventScroll: true });
        } catch {
          try {
            fileInput.focus();
          } catch {}
        }
      }
      return state.pendingPromise;
    };

    const handleFileChange = () => {
      const file = fileInput?.files?.[0] || null;
      state.file = file;
      setErrors([]);
      if (!file) {
        setSummary("");
      } else {
        setSummary(`${file.name}`);
      }
      setBusy(false);
    };

    const handleSave = async () => {
      if (state.busy) return;
      if (!state.file) {
        setErrors(["Veuillez selectionner un fichier JSON a importer."]);
        setSummary("");
        return;
      }
      setErrors([]);
      setSummary(`Import en cours: ${state.file.name}`);
      setBusy(true);
      let result = null;
      try {
        result = await importPurchaseInvoiceFile(state.file);
      } catch (err) {
        result = {
          ok: false,
          canceled: false,
          error: String(err?.message || err || "Import du fichier impossible.")
        };
      }
      if (result?.ok) {
        setBusy(false);
        closeModal(result);
        return;
      }
      if (result?.canceled) {
        setBusy(false);
        closeModal({ ok: false, canceled: true });
        return;
      }
      setBusy(false);
      setErrors([String(result?.error || "Import du fichier impossible.")]);
      setSummary(state.file?.name || "");
    };

    closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    cancelBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    saveBtn?.addEventListener("click", handleSave);
    fileInput?.addEventListener("change", handleFileChange);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) {
        evt.stopPropagation();
      }
    });

    purchaseImportModalController = {
      open: openModal,
      close: closeModal
    };
    return purchaseImportModalController;
  };

  const pickJsonFileFromDialog = async () => {
    if (typeof document === "undefined") {
      return { ok: false, canceled: false, error: "Selection de fichier indisponible." };
    }
    return await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.hidden = true;
      let settled = false;

      const cleanup = () => {
        window.removeEventListener("focus", onWindowFocus, true);
        input.remove();
      };

      const finalize = (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const onWindowFocus = () => {
        setTimeout(() => {
          if (settled) return;
          const file = input.files && input.files[0] ? input.files[0] : null;
          if (!file) finalize({ ok: false, canceled: true });
        }, 300);
      };

      input.addEventListener("change", () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (!file) {
          finalize({ ok: false, canceled: true });
          return;
        }
        finalize({ ok: true, canceled: false, file });
      });

      document.body.appendChild(input);
      window.addEventListener("focus", onWindowFocus, true);
      try {
        input.click();
      } catch (err) {
        finalize({
          ok: false,
          canceled: false,
          error: String(err?.message || err || "Impossible d'ouvrir le selecteur de fichiers.")
        });
      }
    });
  };

  async function importPurchaseInvoiceFile(file) {
    if (!file) return { ok: false, canceled: false, error: "Fichier introuvable." };
    if (!w.electronAPI?.saveInvoiceJSON) {
      return { ok: false, canceled: false, error: "Enregistrement de document indisponible." };
    }

    let text = "";
    try {
      text = await readFileText(file);
    } catch (err) {
      return { ok: false, canceled: false, error: String(err?.message || err || "") };
    }

    const normalizedText = String(text || "").replace(/^\uFEFF/, "");

    let parsed = null;
    try {
      parsed = JSON.parse(normalizedText);
    } catch {
      return { ok: false, canceled: false, error: "Fichier JSON invalide." };
    }

    const envelope = parseEnvelope(parsed);
    if (!envelope.ok) return { ok: false, canceled: false, error: envelope.error };

    const snapshot = normalizeImportedSnapshot(envelope.invoiceData, envelope.payload);
    if (!snapshot) {
      return { ok: false, canceled: false, error: "Contenu de facture invalide dans le fichier." };
    }

    try {
      await overwriteSnapshotCompanyWithStoredProfile(snapshot);
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: String(err?.message || err || "Chargement du profil entreprise impossible.")
      };
    }

    const supplierLinkResult = await ensureImportedSupplierLink(snapshot);
    if (!supplierLinkResult?.ok) {
      return {
        ok: false,
        canceled: false,
        error: String(supplierLinkResult?.error || "Impossible de lier le fournisseur importe.")
      };
    }

    const root = resolveDataRoot(snapshot);
    const meta = isPlainObject(root.meta) ? root.meta : {};
    const requestedNumber = String(meta.number || "").trim();

    const saveMeta = {
      ...meta,
      docType: DOC_TYPE_PURCHASE,
      silent: true,
      allowProvidedNumber: true
    };
    if (requestedNumber) {
      saveMeta.number = requestedNumber;
      saveMeta.previewNumber = requestedNumber;
      saveMeta.confirmNumberChange = false;
      saveMeta.acceptNumberChange = true;
    }

    let saveResult = null;
    try {
      saveResult = await w.electronAPI.saveInvoiceJSON({
        data: snapshot,
        meta: saveMeta
      });
    } catch (err) {
      return { ok: false, canceled: false, error: String(err?.message || err || "") };
    }

    if (!saveResult?.ok) {
      return {
        ok: false,
        canceled: !!saveResult?.canceled,
        error: String(saveResult?.error || "Import impossible.")
      };
    }

    const savedNumber = String(saveResult.number || meta.number || "").trim();
    if (savedNumber) {
      meta.number = savedNumber;
      if (isPlainObject(root.meta)) root.meta.number = savedNumber;
    }

    addImportedHistoryEntry(snapshot, saveResult);

    return {
      ok: true,
      canceled: false,
      path: String(saveResult.path || "").trim(),
      name: String(saveResult.name || savedNumber || "").trim(),
      number: savedNumber,
      date: String(meta.date || "").trim(),
      sourceNumber: requestedNumber,
      numberChanged: !!saveResult.numberChanged
    };
  }

  async function importPurchaseInvoiceFromDialog() {
    const picked = await pickJsonFileFromDialog();
    if (!picked?.ok) {
      return {
        ok: false,
        canceled: !!picked?.canceled,
        error: String(picked?.error || "")
      };
    }
    return await importPurchaseInvoiceFile(picked.file);
  }

  async function openImportPurchaseInvoiceModal(trigger = null) {
    const controller = createPurchaseImportModalController();
    if (!controller || typeof controller.open !== "function") {
      return {
        ok: false,
        canceled: false,
        error: "Fenetre d'import indisponible."
      };
    }
    return await controller.open(trigger);
  }

  AppInit.DocHistoryPurchaseImport = {
    SCHEMA_VERSION,
    parseEnvelope,
    importPurchaseInvoiceFile,
    importPurchaseInvoiceFromDialog,
    openImportPurchaseInvoiceModal
  };
})(window);
