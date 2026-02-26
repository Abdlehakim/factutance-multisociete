(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const bindingShared = SEM.__bindingShared || {};
  const sharedConstants = bindingShared.constants || {};
  const FOOTER_NOTE_DEFAULT_FONT_SIZE = sharedConstants.FOOTER_NOTE_DEFAULT_FONT_SIZE || 8;
  const formatSoldClientValue =
    bindingShared.formatSoldClientValue ||
    ((value) => {
      const cleaned = String(value ?? "").replace(",", ".").trim();
      if (!cleaned) return "";
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return String(value ?? "").trim();
      return num.toFixed(3);
    });
  const parseCompanyPhoneList =
    bindingShared.parseCompanyPhoneList ||
    ((raw = "") =>
      String(raw || "")
        .replace(/\s+-\s+/g, "\n")
        .split(/[\n,;\/]+/u)
        .map((part) => String(part || "").trim())
        .filter(Boolean)
    );
  const setCompanyPhoneInputs = bindingShared.setCompanyPhoneInputs || (() => {});
  const ensureCompanyPhoneInputsListeners =
    bindingShared.ensureCompanyPhoneInputsListeners || (() => {});
  const refreshCompanySummary = bindingShared.refreshCompanySummary || (() => {});
  const refreshClientSummary = bindingShared.refreshClientSummary || (() => {});
  const refreshInvoiceSummary = bindingShared.refreshInvoiceSummary || (() => {});
  const setWhNoteEditorContent = bindingShared.setWhNoteEditorContent || (() => {});
  const normalizeFooterNoteFontSize =
    bindingShared.normalizeFooterNoteFontSize ||
    ((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    });
  const setFooterNoteEditorContent = bindingShared.setFooterNoteEditorContent || (() => {});
  const updateCompanyLogoImage = bindingShared.updateCompanyLogoImage || (() => {});
  SEM.bind = function (options = {}) {
      const st = state();

      [["companyName","name"],["companyVat","vat"],["companyCustomsCode","customsCode"],["companyIban","iban"],["companyEmail","email"],["companyAddress","address"]]
        .forEach(([id, key]) => {
          const el = getEl(id); if (!el) return;
          el.value = st.company[key] || "";
          if (SEM.COMPANY_LOCKED) { el.readOnly = true; el.classList.add("locked"); el.setAttribute("tabindex", "-1"); }
        });

      updateCompanyLogoImage(st.company.logo);
      SEM.refreshSealPreview?.();
      SEM.refreshSignaturePreview?.();
      const h1 = document.querySelector(".brand h1");
      const appName = w.APP_NAME || "Facturance";
      const appVer = w.APP_VERSION ? ` ${w.APP_VERSION}` : "";
      const companyName =
        (st.company && typeof st.company.name === "string" && st.company.name.trim()) ||
        (
          ((w.DEFAULT_COMPANY_TEMPLATE && typeof w.DEFAULT_COMPANY_TEMPLATE.name === "string")
            ? w.DEFAULT_COMPANY_TEMPLATE.name
            : (w.DEFAULT_COMPANY && typeof w.DEFAULT_COMPANY.name === "string")
              ? w.DEFAULT_COMPANY.name
              : "") || ""
        ).trim() ||
        "";
      const brandDisplay = `${appName}${appVer}${companyName ? ` ${companyName}` : ""}`;
      if (h1) h1.textContent = brandDisplay;
      try { if (document && brandDisplay) document.title = `${brandDisplay} - Gestionnaire de factures`; } catch {}
      try { const img = document.getElementById("facturanceLogo"); if (img) img.alt = `Logo ${brandDisplay}`; } catch {}

      const setLabelText = (id, text) => {
        const el = getEl(id);
        if (el) el.textContent = text;
      };
      const updateTaxDependentLabels = (enabled) => {
        const resolveArticleLabel = (key, fallback) => {
          if (typeof helpers.resolveArticleFieldLabel === "function") {
            const resolved = String(helpers.resolveArticleFieldLabel(key, fallback) || "").trim();
            if (resolved) return resolved;
          }
          const labels = st?.meta?.articleFieldLabels || {};
          const fromState = typeof labels[key] === "string" ? labels[key].trim() : "";
          return fromState || fallback;
        };
        const priceLabel = resolveArticleLabel("price", enabled ? "P.U. HT" : "Prix unitaire");
        const totalHtLabel = resolveArticleLabel("totalHt", enabled ? "Total HT" : "Total");
        setLabelText("itemsPriceHeader", priceLabel);
        setLabelText("itemsTotalHtHeader", totalHtLabel);
        setLabelText("togglePriceLabel", priceLabel);
        setLabelText("toggleTotalHtLabel", totalHtLabel);
        if (!w.__modelApplyAddFormGuard || !document.getElementById("addItemBoxMainscreen")) {
          setLabelText("addPriceLabel", priceLabel);
        }
        setLabelText("miniHTLabel", totalHtLabel);
        const priceToggle = getEl("colTogglePrice");
        if (priceToggle) priceToggle.setAttribute("aria-label", `Masquer colonne ${priceLabel}`);
        const totalHtToggle = getEl("colToggleTotalHt");
        if (totalHtToggle) totalHtToggle.setAttribute("aria-label", `Masquer ${totalHtLabel}`);
      };
      // Expose so external flows (e.g., model apply before bind runs) can reuse it safely.
      w.updateTaxDependentLabels = updateTaxDependentLabels;

      setVal("docType",  st.meta.docType || "facture");
      const suffixMatch = String(st.meta.number || "").match(/(\d+)\s*$/);
      const suffixLength = suffixMatch ? suffixMatch[1].length : null;
      const numberLength =
        typeof normalizeInvoiceNumberLength === "function"
          ? normalizeInvoiceNumberLength(st.meta.numberLength || suffixLength || 4, st.meta.numberLength || 4)
          : ([4, 6, 8, 12].includes(Number(st.meta.numberLength || suffixLength)) ? Number(st.meta.numberLength || suffixLength) : 4);
      st.meta.numberLength = numberLength;
      const isManualNumberDocTypeOnBind = String(st.meta.docType || "").toLowerCase() === "fa";
      if (!isManualNumberDocTypeOnBind && (!st.meta.number || suffixLength)) {
        if (typeof formatInvoiceNumber === "function") {
          st.meta.number = formatInvoiceNumber(st.meta.number, numberLength, {
            docType: st.meta.docType,
            date: st.meta.date,
            meta: st.meta
          });
        } else {
          const prefixMap = {
            facture: "Fact",
            fa: "FA",
            devis: "Devis",
            bl: "BL",
            bc: "BC",
            be: "BE",
            bs: "BS",
            avoir: "AV"
          };
          const prefix =
            prefixMap[String(st.meta.docType || "").toLowerCase()] ||
            String(st.meta.docType || "DOC").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() ||
            "DOC";
          const parsedDate = new Date(st.meta.date || Date.now());
          const year = Number.isFinite(parsedDate.getFullYear()) ? String(parsedDate.getFullYear()) : "2000";
          const month = Number.isFinite(parsedDate.getMonth())
            ? String(parsedDate.getMonth() + 1).padStart(2, "0")
            : "01";
          const shortYear = year.slice(-2);
          const digits =
            (suffixMatch ? suffixMatch[1] : (String(st.meta.number || "1").replace(/\D+/g, "") || "1")).slice(-numberLength);
          const numericCounter = Number(digits);
          const counter =
            Number.isFinite(numericCounter) && numericCounter > 0 ? String(Math.trunc(numericCounter)) : "1";
          st.meta.number = `${prefix}_${shortYear}-${month}-${counter}`;
        }
      }
      setVal("invNumberLength", String(numberLength));
      setVal("invNumber", st.meta.number);
      setVal("currency",  st.meta.currency);
      const taxesEnabled = st.meta.taxesEnabled !== false;
      setVal("taxMode", taxesEnabled ? "with" : "without");
      updateTaxDependentLabels(taxesEnabled);
      setVal("invDate",   st.meta.date);
      setVal("invDue",    st.meta.due);
      refreshInvoiceSummary();
      if (SEM.applyItemsHeaderColor) {
        SEM.applyItemsHeaderColor(st.meta?.itemsHeaderColor, { setBaseline: true });
      }

      try {
        const DC = w.DEFAULT_COMPANY_TEMPLATE || w.DEFAULT_COMPANY || {};
        const companyNameEl = getEl("companyName");
        if (companyNameEl && DC.name) companyNameEl.placeholder = String(DC.name);
      } catch {}
      setCompanyPhoneInputs(parseCompanyPhoneList(st.company.phone));
      ensureCompanyPhoneInputsListeners();
      refreshCompanySummary();

      const skipClientInputs = options?.skipClientInputs === true;
      if (!skipClientInputs) {
        setVal("clientType",  st.client.type || "societe");
        setVal("clientName",  st.client.name);
        setVal("clientBeneficiary", st.client.benefit);
        setVal("clientAccount", st.client.account);
        setVal("clientSoldClient", formatSoldClientValue(st.client.soldClient));
        setVal("clientStegRef", st.client.stegRef);
        setVal("clientEmail", st.client.email);
        setVal("clientPhone", st.client.phone);
        setVal("clientVat",   st.client.vat);
        setVal("clientAddress", st.client.address);
        SEM.updateClientIdLabel();
      }
      refreshClientSummary();
      if (typeof SEM.refreshClientActionButtons === "function") {
        SEM.refreshClientActionButtons();
      }

      const wh = st.meta.withholding || { enabled:false, rate:1.5, base:"ttc", label:"Retenue a la source", threshold:1000 };
      if (wh.base !== "ttc") wh.base = "ttc";
      if (getEl("whEnabled")) getEl("whEnabled").checked = !!wh.enabled;
      if (getEl("whEnabledModal")) getEl("whEnabledModal").checked = !!wh.enabled;
      setVal("whRate",  String(wh.rate ?? 1.5));
      setVal("whRateModal",  String(wh.rate ?? 1.5));
      setVal("whBase",  String(wh.base ?? "ttc"));
      setVal("whBaseModal",  String(wh.base ?? "ttc"));
      setVal("whLabel", String(wh.label ?? "Retenue a la source"));
      setVal("whLabelModal", String(wh.label ?? "Retenue a la source"));
      const whNoteValue = String(wh.note ?? "");
      setVal("whNote", whNoteValue);
      setWhNoteEditorContent(whNoteValue);
      setVal("whThreshold", String(wh.threshold ?? 1000));
      setVal("whThresholdModal", String(wh.threshold ?? 1000));
      setVal("noteInterne", String(st.meta?.noteInterne ?? ""));
      SEM.toggleWHFields(!!wh.enabled);

      const acompte = st.meta.acompte || { enabled:false, paid:0 };
      if (getEl("acompteEnabled")) getEl("acompteEnabled").checked = !!acompte.enabled;
      setVal("acomptePaid", String(acompte.paid ?? 0));
      SEM.toggleAcompteFields?.(!!acompte.enabled);

      const financing = st.meta.financing || { subvention: {}, bank: {} };
      const subvention = financing.subvention || {};
      const bank = financing.bank || {};
      if (getEl("subventionEnabled")) getEl("subventionEnabled").checked = !!subvention.enabled;
      setVal("subventionLabel", String(subvention.label ?? "Subvention"));
      setVal("subventionAmount", String(subvention.amount ?? 0));
      SEM.toggleSubventionFields?.(!!subvention.enabled);
      if (getEl("finBankEnabled")) getEl("finBankEnabled").checked = !!bank.enabled;
      setVal("finBankLabel", String(bank.label ?? "Financement bancaire"));
      setVal("finBankAmount", String(bank.amount ?? 0));
      SEM.toggleFinBankFields?.(!!bank.enabled);

      const ex = st.meta.extras || {};
      const s = ex.shipping || {};
      const d = ex.dossier || {};
      const p = ex.deplacement || {};
      const t = ex.stamp || {};
      const pdfOptions = ex.pdf && typeof ex.pdf === "object" ? ex.pdf : {};
      if (getEl("pdfShowSealModal")) getEl("pdfShowSealModal").checked = pdfOptions.showSeal !== false;
      if (getEl("pdfShowSignatureModal")) getEl("pdfShowSignatureModal").checked = pdfOptions.showSignature !== false;
      if (getEl("pdfShowAmountWordsModal")) getEl("pdfShowAmountWordsModal").checked = pdfOptions.showAmountWords !== false;
      const footerNoteValue = String(pdfOptions.footerNote ?? "");
      const footerNoteSize =
        normalizeFooterNoteFontSize(pdfOptions.footerNoteSize) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
      setVal("footerNote", footerNoteValue);
      setVal("footerNoteFontSize", String(footerNoteSize));
      if (typeof SEM.updateFooterNoteEditor === "function") {
        SEM.updateFooterNoteEditor(footerNoteValue, { size: footerNoteSize });
      } else {
        setFooterNoteEditorContent(footerNoteValue, { size: footerNoteSize });
      }

      if (getEl("shipEnabled")) getEl("shipEnabled").checked = !!s.enabled;
      if (getEl("shipEnabledModal")) getEl("shipEnabledModal").checked = !!s.enabled;
      setVal("shipLabel",  String(s.label ?? "Frais de livraison"));
      setVal("shipLabelModal",  String(s.label ?? "Frais de livraison"));
      setVal("shipAmount", String(s.amount ?? 7));
      setVal("shipAmountModal", String(s.amount ?? 7));
      setVal("shipTva",    String(s.tva ?? 7));
      setVal("shipTvaModal",    String(s.tva ?? 7));
      SEM.toggleShipFields(!!s.enabled);

      if (getEl("dossierEnabled")) getEl("dossierEnabled").checked = !!d.enabled;
      if (getEl("dossierEnabledModal")) getEl("dossierEnabledModal").checked = !!d.enabled;
      setVal("dossierLabel",  String(d.label ?? "Frais du dossier"));
      setVal("dossierLabelModal",  String(d.label ?? "Frais du dossier"));
      setVal("dossierAmount", String(d.amount ?? 0));
      setVal("dossierAmountModal", String(d.amount ?? 0));
      setVal("dossierTva", String(d.tva ?? 0));
      setVal("dossierTvaModal", String(d.tva ?? 0));
      SEM.toggleDossierFields?.(!!d.enabled);

      if (getEl("deplacementEnabled")) getEl("deplacementEnabled").checked = !!p.enabled;
      if (getEl("deplacementEnabledModal")) getEl("deplacementEnabledModal").checked = !!p.enabled;
      setVal("deplacementLabel",  String(p.label ?? "Frais de deplacement"));
      setVal("deplacementLabelModal",  String(p.label ?? "Frais de deplacement"));
      setVal("deplacementAmount", String(p.amount ?? 0));
      setVal("deplacementAmountModal", String(p.amount ?? 0));
      setVal("deplacementTva", String(p.tva ?? 0));
      setVal("deplacementTvaModal", String(p.tva ?? 0));
      SEM.toggleDeplacementFields?.(!!p.enabled);

      if (getEl("stampEnabled")) getEl("stampEnabled").checked = !!t.enabled;
      if (getEl("stampEnabledModal")) getEl("stampEnabledModal").checked = !!t.enabled;
      setVal("stampLabel",  String(t.label ?? "Timbre fiscal"));
      setVal("stampLabelModal",  String(t.label ?? "Timbre fiscal"));
      setVal("stampAmount", String(t.amount ?? 1));
      setVal("stampAmountModal", String(t.amount ?? 1));
      SEM.toggleStampFields(!!t.enabled);

      const addFormFodec = (st.meta?.addForm && st.meta.addForm.fodec) || ex.fodec || {};
      if (getEl("addFodecEnabled")) getEl("addFodecEnabled").checked = !!addFormFodec.enabled;
      setVal("addFodecRate",  String(addFormFodec.rate  ?? 1));
      setVal("addFodecTva",   String(addFormFodec.tva   ?? 19));
      const addFormPurchaseFodec =
        (st.meta?.addForm && st.meta.addForm.purchaseFodec) || {};
      if (getEl("addPurchaseFodecEnabled")) getEl("addPurchaseFodecEnabled").checked = !!addFormPurchaseFodec.enabled;
      setVal("addPurchaseFodecRate",  String(addFormPurchaseFodec.rate  ?? 1));
      setVal("addPurchaseFodecTva",   String(addFormPurchaseFodec.tva   ?? 19));
      SEM.updateAddFormTotals?.();

      setVal("notes", st.notes);
      setText("year", new Date().getFullYear());

      const reglementMetaRaw = st.meta?.reglement || {};
      const reglementEnabled =
        typeof reglementMetaRaw.enabled === "boolean"
          ? reglementMetaRaw.enabled
          : typeof st.meta?.reglementEnabled === "boolean"
            ? st.meta.reglementEnabled
            : false;
      const reglementTypeRaw =
        typeof reglementMetaRaw.type === "string"
          ? reglementMetaRaw.type
          : typeof st.meta?.reglementType === "string"
            ? st.meta.reglementType
            : "reception";
      const reglementType = String(reglementTypeRaw || "reception").trim().toLowerCase() === "days" ? "days" : "reception";
      const reglementDaysCandidate =
        typeof reglementMetaRaw.days !== "undefined"
          ? reglementMetaRaw.days
          : typeof st.meta?.reglementDays !== "undefined"
            ? st.meta.reglementDays
            : null;
      let reglementDays = null;
      if (Number.isFinite(Number(reglementDaysCandidate))) {
        reglementDays = Math.max(0, Math.trunc(Number(reglementDaysCandidate)));
      }

      const elReglementEnabled = getEl("reglementEnabled");
      const elReglementTypeReception = getEl("reglementTypeReception");
      const elReglementTypeDays = getEl("reglementTypeDays");
      const elReglementDays = getEl("reglementDays");
      if (elReglementEnabled) elReglementEnabled.checked = reglementEnabled;
      if (elReglementTypeReception) elReglementTypeReception.checked = reglementType !== "days";
      if (elReglementTypeDays) elReglementTypeDays.checked = reglementType === "days";
      if (elReglementDays) {
        if (reglementDays !== null) {
          elReglementDays.value = String(reglementDays);
        } else if (reglementType === "days") {
          elReglementDays.value = elReglementDays.value || "30";
        }
      }
      const normalizedReglement = { ...reglementMetaRaw, enabled: reglementEnabled, type: reglementType };
      if (reglementDays !== null) {
        normalizedReglement.days = reglementDays;
      } else {
        delete normalizedReglement.days;
      }
      st.meta = st.meta || {};
      st.meta.reglement = normalizedReglement;
      st.meta.reglementEnabled = reglementEnabled;
      st.meta.reglementType = reglementType;
      if (reglementDays !== null) {
        st.meta.reglementDays = reglementDays;
      } else {
        delete st.meta.reglementDays;
      }
      if (elReglementDays) {
        const shouldEnableDays = Boolean(
          elReglementEnabled?.checked && elReglementTypeDays?.checked
        );
        elReglementDays.disabled = !shouldEnableDays;
      }
      if (typeof SEM.updateReglementMiniRow === "function") {
        SEM.updateReglementMiniRow();
      }

      const articleVisibilityDefaults = {
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
      const columnDefaults = st.meta?.columns || {};
      const toggleMap = SEM.consts?.FIELD_TOGGLE_MAP || {};
      Object.entries(toggleMap).forEach(([key, id]) => {
        const el = getEl(id);
        if (!el) return;
        const hasValue = Object.prototype.hasOwnProperty.call(columnDefaults, key);
        el.checked = hasValue ? !!columnDefaults[key] : articleVisibilityDefaults[key] !== false;
      });

      SEM.renderItems();
      SEM.computeTotals();
      SEM.applyColumnHiding();
      SEM.refreshModelSelect();
    };


  
})(window);

