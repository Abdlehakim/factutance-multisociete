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
  const whPdfNoteComponent = SEM.__whPdfNoteComponent || {};
  const footerNoteComponent = SEM.__footerNoteComponent || {};
  const sharedConstants = bindingShared.constants || {};
  const MAX_COMPANY_PHONE_COUNT = sharedConstants.MAX_COMPANY_PHONE_COUNT || 3;
  const formatSoldClientValue =
    bindingShared.formatSoldClientValue ||
    ((value) => {
      const cleaned = String(value ?? "").replace(",", ".").trim();
      if (!cleaned) return "";
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return String(value ?? "").trim();
      return num.toFixed(3);
    });
  const formatCompanyPhoneList = bindingShared.formatCompanyPhoneList || ((list = []) =>
    (Array.isArray(list) ? list : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ")
  );
  const setCompanyPhoneInputs = bindingShared.setCompanyPhoneInputs || (() => {});
  const collectCompanyPhoneInputs = bindingShared.collectCompanyPhoneInputs || (() => []);
  const persistCompanyProfile = bindingShared.persistCompanyProfile || (() => {});
  const persistSmtpSettings = bindingShared.persistSmtpSettings || (() => {});
  const updateCompanyLogoImage = bindingShared.updateCompanyLogoImage || (() => {});
  const refreshCompanySummary = bindingShared.refreshCompanySummary || (() => {});
  const refreshClientSummary = bindingShared.refreshClientSummary || (() => {});
  const refreshInvoiceSummary = bindingShared.refreshInvoiceSummary || (() => {});

  const registerLiveBindingSet = SEM.registerLiveBindingSet;
  if (typeof registerLiveBindingSet !== "function") {
    console.warn("[live-bindings] registerLiveBindingSet is unavailable");
    return;
  }

  registerLiveBindingSet("financial", () => {
      const liveBindingsContext = SEM.__liveBindingsContext || {};
      const ADD_FORM_SCOPE_SELECTOR =
        liveBindingsContext.ADD_FORM_SCOPE_SELECTOR ||
        "#addItemBox, #addItemBoxMainscreen, #articleFormPopover";
      const normalizeAddFormScope =
        liveBindingsContext.normalizeAddFormScope ||
        ((node) => {
          if (!node) return null;
          if (node.id === "articleFormPopover") return node;
          if (typeof node.closest !== "function") return null;
          const root = node.closest(ADD_FORM_SCOPE_SELECTOR);
          if (!root) return null;
          if (root.id === "articleFormPopover") return root;
          return root;
        });
      const scheduleModelPreviewUpdate =
        liveBindingsContext.scheduleModelPreviewUpdate ||
        (() => {
          if (typeof helpers.updateModelPreview === "function") helpers.updateModelPreview();
        });
      ["colToggleRef","colToggleProduct","colToggleDesc","colToggleQty","colToggleUnit","colTogglePrice","colToggleFodec","colToggleTva","colToggleDiscount","colToggleTotalHt","colToggleTotalTtc"]
        .forEach(id => getEl(id)?.addEventListener("change", SEM.applyColumnHiding));

      const ensureAcompteState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.acompte || typeof meta.acompte !== "object") {
          meta.acompte = { enabled: false, paid: 0 };
        }
        return meta.acompte;
      };
      const ensureFinancingState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.financing || typeof meta.financing !== "object") {
          meta.financing = { subvention: { enabled: false, label: "Subvention", amount: 0 }, bank: { enabled: false, label: "Financement bancaire", amount: 0 } };
        }
        if (!meta.financing.subvention || typeof meta.financing.subvention !== "object") {
          meta.financing.subvention = { enabled: false, label: "Subvention", amount: 0 };
        }
        if (!meta.financing.bank || typeof meta.financing.bank !== "object") {
          meta.financing.bank = { enabled: false, label: "Financement bancaire", amount: 0 };
        }
        meta.financing.used = resolveFeesOptionUsed(
          {
            used: meta.financing.used,
            enabled: !!meta.financing.subvention?.enabled || !!meta.financing.bank?.enabled
          },
          FEES_OPTIONS_DEFAULTS.financing
        );
        return meta.financing;
      };

      const whEnabledInput = getEl("whEnabled");
      const whRateInput = getEl("whRate");
      const whBaseInput = getEl("whBase");
      const whThresholdInput = getEl("whThreshold");
      const whLabelInput = getEl("whLabel");
      const whEnabledModalInput = getEl("whEnabledModal");
      const whRateModalInput = getEl("whRateModal");
      const whBaseModalInput = getEl("whBaseModal");
      const whThresholdModalInput = getEl("whThresholdModal");
      const whLabelModalInput = getEl("whLabelModal");

      const whEnabledInputs = [whEnabledInput];
      const whRateInputs = [whRateInput];
      const whBaseInputs = [whBaseInput];
      const whThresholdInputs = [whThresholdInput];
      const whLabelInputs = [whLabelInput];

      const setCheckedInputsWH = (inputs, value) => inputs.forEach((input) => { if (input) input.checked = !!value; });
      const setValueInputsWH = (inputs, value) => {
        const str = value === undefined || value === null ? "" : String(value);
        inputs.forEach((input) => {
          if (!input) return;
          if (input.value !== str) input.value = str;
        });
      };
      const setCheckedInputWH = (input, value) => {
        if (input) input.checked = !!value;
      };
      const setValueInputWH = (input, value) => {
        if (!input) return;
        const str = value === undefined || value === null ? "" : String(value);
        if (input.value !== str) input.value = str;
      };
      const toNumberOrWH = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      const syncWhEnabled = (checked, { silent, updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputsWH(whEnabledInputs, enabled);
        if (updateModal) setCheckedInputWH(whEnabledModalInput, enabled);
        state().meta.withholding.enabled = enabled;
        SEM.toggleWHFields(enabled);
        if (!silent) SEM.computeTotals();
      };
      const syncWhRate = (value, { silent, updateModal = true } = {}) => {
        const rate = toNumberOrWH(value, state().meta.withholding.rate ?? 1.5);
        setValueInputsWH(whRateInputs, value);
        if (updateModal) setValueInputWH(whRateModalInput, value);
        state().meta.withholding.rate = rate;
        if (!silent) SEM.computeTotals();
      };
      const syncWhBase = (_value, { silent, updateModal = true } = {}) => {
        setValueInputsWH(whBaseInputs, "ttc");
        if (updateModal) setValueInputWH(whBaseModalInput, "ttc");
        state().meta.withholding.base = "ttc";
        if (!silent) SEM.computeTotals();
      };
      const syncWhThreshold = (value, { silent, updateModal = true } = {}) => {
        const threshold = toNumberOrWH(value, state().meta.withholding.threshold ?? 1000);
        setValueInputsWH(whThresholdInputs, value);
        if (updateModal) setValueInputWH(whThresholdModalInput, value);
        state().meta.withholding.threshold = threshold;
        if (!silent) SEM.computeTotals();
      };
      const syncWhLabel = (value, { silent, updateModal = true } = {}) => {
        const label = value === undefined || value === null ? "" : String(value);
        setValueInputsWH(whLabelInputs, label);
        if (updateModal) setValueInputWH(whLabelModalInput, label);
        state().meta.withholding.label = label;
        if (!silent) SEM.updateWHAmountPreview();
      };

      whEnabledInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncWhEnabled(evt.target.checked));
      });
      whRateInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncWhRate(evt.target.value));
      });
      whBaseInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncWhBase(evt.target.value));
      });
      whThresholdInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncWhThreshold(evt.target.value));
      });
      whLabelInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncWhLabel(evt.target.value));
      });
      getEl("acompteEnabled")?.addEventListener("change", () => {
        const acompteState = ensureAcompteState();
        acompteState.enabled = !!getEl("acompteEnabled").checked;
        SEM.toggleAcompteFields(acompteState.enabled);
        SEM.computeTotals();
      });
      getEl("acomptePaid")?.addEventListener("input", () => {
        const acompteState = ensureAcompteState();
        acompteState.paid = getNum("acomptePaid", acompteState.paid ?? 0);
        SEM.computeTotals();
      });
      getEl("subventionEnabled")?.addEventListener("change", () => {
        const financing = ensureFinancingState();
        financing.subvention.enabled = !!getEl("subventionEnabled").checked;
        SEM.toggleSubventionFields(financing.subvention.enabled);
        SEM.computeTotals();
      });
      getEl("subventionLabel")?.addEventListener("input", () => {
        const financing = ensureFinancingState();
        financing.subvention.label = getStr("subventionLabel", financing.subvention.label || "Subvention");
        SEM.computeTotals();
      });
      getEl("subventionAmount")?.addEventListener("input", () => {
        const financing = ensureFinancingState();
        financing.subvention.amount = getNum("subventionAmount", financing.subvention.amount ?? 0);
        SEM.computeTotals();
      });
      getEl("finBankEnabled")?.addEventListener("change", () => {
        const financing = ensureFinancingState();
        financing.bank.enabled = !!getEl("finBankEnabled").checked;
        SEM.toggleFinBankFields(financing.bank.enabled);
        SEM.computeTotals();
      });
      getEl("finBankLabel")?.addEventListener("input", () => {
        const financing = ensureFinancingState();
        financing.bank.label = getStr("finBankLabel", financing.bank.label || "Financement bancaire");
        SEM.computeTotals();
      });
      getEl("finBankAmount")?.addEventListener("input", () => {
        const financing = ensureFinancingState();
        financing.bank.amount = getNum("finBankAmount", financing.bank.amount ?? 0);
        SEM.computeTotals();
      });
      const syncReglementDays = () => {
        const enabled = !!getEl("reglementEnabled")?.checked;
        const daysSelected = !!getEl("reglementTypeDays")?.checked;
        const daysInput = getEl("reglementDays");
        if (daysInput) {
          daysInput.disabled = !(enabled && daysSelected);
        }
        if (typeof SEM.updateReglementMiniRow === "function") {
          SEM.updateReglementMiniRow();
        }
      };
      ["reglementEnabled", "reglementTypeReception", "reglementTypeDays"].forEach((id) => {
        getEl(id)?.addEventListener("change", syncReglementDays);
      });
      getEl("reglementDays")?.addEventListener("input", syncReglementDays);
      syncReglementDays();
      if (typeof whPdfNoteComponent.wireAll === "function") {
        whPdfNoteComponent.wireAll("main", {
          state,
          onChange: () => {
            if (typeof scheduleModelPreviewUpdate === "function") scheduleModelPreviewUpdate();
          }
        });
      }

      const ensureFooterNotePdfState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
        if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
        return meta.extras.pdf;
      };
      const wireFooterNoteEditor = () => {
        if (typeof footerNoteComponent.wireEditor !== "function") return;
        footerNoteComponent.wireEditor({
          ids: {
            editorId: "footerNoteEditor",
            hiddenId: "footerNote",
            sizeId: "footerNoteFontSize",
            boldId: "footerNoteBold",
            italicId: "footerNoteItalic",
            listId: "footerNoteList"
          },
          wireFlag: "footerNoteWired",
          onStateChange: ({ serialized, resolvedSize }) => {
            const pdfState = ensureFooterNotePdfState();
            pdfState.footerNote = serialized;
            pdfState.footerNoteSize = resolvedSize;
            SEM.updateAmountWordsBlock?.();
          }
        });
      };
      wireFooterNoteEditor();

      const ensureAddFormFodecState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.addForm || typeof meta.addForm !== "object") meta.addForm = {};
        if (!meta.addForm.fodec || typeof meta.addForm.fodec !== "object") {
          meta.addForm.fodec = { enabled: false, label: "FODEC", rate: 1, tva: 19 };
        }
        return meta.addForm.fodec;
      };
      const ensureAddFormPurchaseFodecState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.addForm || typeof meta.addForm !== "object") meta.addForm = {};
        if (!meta.addForm.purchaseFodec || typeof meta.addForm.purchaseFodec !== "object") {
          meta.addForm.purchaseFodec = { enabled: false, label: "FODEC ACHAT", rate: 1, tva: 19 };
        }
        return meta.addForm.purchaseFodec;
      };
      const toggleAddFodecFields = (enabled, scopeHint = null) => {
        const scopeNode = scopeHint ? normalizeAddFormScope(scopeHint) || scopeHint : null;
        const rows = scopeNode
          ? [scopeNode.querySelector("#addFodecRow")].filter(Boolean)
          : Array.from(document.querySelectorAll("#addFodecRow"));
        if (!rows.length) return;
        const isEnabled = !!enabled;
        rows.forEach((row) => {
          row.dataset.fodecActive = isEnabled ? "true" : "false";
          row.querySelectorAll("input").forEach((input) => {
            if (
              input.id === "addFodecEnabled" ||
              input.id === "addFodecRate" ||
              input.id === "addFodecTva"
            )
              return;
            input.disabled = !isEnabled;
          });
        });
      };
      const toggleAddPurchaseFodecFields = (enabled, scopeHint = null) => {
        const scopeNode = scopeHint ? normalizeAddFormScope(scopeHint) || scopeHint : null;
        const rows = scopeNode
          ? [scopeNode.querySelector("#addPurchaseFodecRow")].filter(Boolean)
          : Array.from(document.querySelectorAll("#addPurchaseFodecRow"));
        if (!rows.length) return;
        const isEnabled = !!enabled;
        rows.forEach((row) => {
          row.dataset.fodecActive = isEnabled ? "true" : "false";
          row.querySelectorAll("input").forEach((input) => {
            if (
              input.id === "addPurchaseFodecEnabled" ||
              input.id === "addPurchaseFodecRate" ||
              input.id === "addPurchaseFodecTva"
            )
              return;
            input.disabled = !isEnabled;
          });
        });
      };

      const FEES_OPTIONS_DEFAULTS = Object.freeze({
        shipping: true,
        stamp: true,
        dossier: false,
        deplacement: false,
        financing: false
      });
      const normalizeOptionalBool = (value) => {
        if (value === true || value === false) return value;
        const normalized = String(value || "").trim().toLowerCase();
        if (["1", "true", "oui", "yes"].includes(normalized)) return true;
        if (["0", "false", "non", "no"].includes(normalized)) return false;
        return undefined;
      };
      const resolveFeesOptionUsed = (feeState, fallback = false) => {
        const normalizedUsed = normalizeOptionalBool(feeState?.used);
        if (typeof normalizedUsed === "boolean") return normalizedUsed;
        const normalizedEnabled = normalizeOptionalBool(feeState?.enabled);
        if (normalizedEnabled === true) return true;
        return !!fallback;
      };
      const ensureExtrasState = () => {
        const meta = state().meta || (state().meta = {});
        if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
        if (!meta.extras.shipping || typeof meta.extras.shipping !== "object") meta.extras.shipping = {};
        if (!meta.extras.dossier || typeof meta.extras.dossier !== "object") meta.extras.dossier = {};
        if (!meta.extras.deplacement || typeof meta.extras.deplacement !== "object") meta.extras.deplacement = {};
        if (!meta.extras.stamp || typeof meta.extras.stamp !== "object") meta.extras.stamp = {};
        meta.extras.shipping.used = resolveFeesOptionUsed(meta.extras.shipping, FEES_OPTIONS_DEFAULTS.shipping);
        meta.extras.stamp.used = resolveFeesOptionUsed(meta.extras.stamp, FEES_OPTIONS_DEFAULTS.stamp);
        meta.extras.dossier.used = resolveFeesOptionUsed(meta.extras.dossier, FEES_OPTIONS_DEFAULTS.dossier);
        meta.extras.deplacement.used = resolveFeesOptionUsed(meta.extras.deplacement, FEES_OPTIONS_DEFAULTS.deplacement);
        return meta.extras;
      };
      const ensurePdfOptionsState = () => {
        const ex = ensureExtrasState();
        if (!ex.pdf || typeof ex.pdf !== "object") ex.pdf = {};
        return ex.pdf;
      };
      ensureExtrasState();

      const shipEnabledInput = getEl("shipEnabled");
      const shipLabelInput = getEl("shipLabel");
      const shipAmountInput = getEl("shipAmount");
      const shipTvaInput = getEl("shipTva");
      const shipEnabledModalInput = getEl("shipEnabledModal");
      const shipLabelModalInput = getEl("shipLabelModal");
      const shipAmountModalInput = getEl("shipAmountModal");
      const shipTvaModalInput = getEl("shipTvaModal");

      const shipEnabledInputs = [shipEnabledInput];
      const shipLabelInputs = [shipLabelInput];
      const shipAmountInputs = [shipAmountInput];
      const shipTvaInputs = [shipTvaInput];
      const dossierEnabledInput = getEl("dossierEnabled");
      const dossierLabelInput = getEl("dossierLabel");
      const dossierAmountInput = getEl("dossierAmount");
      const dossierTvaInput = getEl("dossierTva");
      const dossierEnabledModalInput = getEl("dossierEnabledModal");
      const dossierLabelModalInput = getEl("dossierLabelModal");
      const dossierAmountModalInput = getEl("dossierAmountModal");
      const dossierTvaModalInput = getEl("dossierTvaModal");
      const dossierEnabledInputs = [dossierEnabledInput];
      const dossierLabelInputs = [dossierLabelInput];
      const dossierAmountInputs = [dossierAmountInput];
      const dossierTvaInputs = [dossierTvaInput];
      const deplacementEnabledInput = getEl("deplacementEnabled");
      const deplacementLabelInput = getEl("deplacementLabel");
      const deplacementAmountInput = getEl("deplacementAmount");
      const deplacementTvaInput = getEl("deplacementTva");
      const deplacementEnabledModalInput = getEl("deplacementEnabledModal");
      const deplacementLabelModalInput = getEl("deplacementLabelModal");
      const deplacementAmountModalInput = getEl("deplacementAmountModal");
      const deplacementTvaModalInput = getEl("deplacementTvaModal");
      const deplacementEnabledInputs = [deplacementEnabledInput];
      const deplacementLabelInputs = [deplacementLabelInput];
      const deplacementAmountInputs = [deplacementAmountInput];
      const deplacementTvaInputs = [deplacementTvaInput];
      const stampEnabledInput = getEl("stampEnabled");
      const stampLabelInput = getEl("stampLabel");
      const stampAmountInput = getEl("stampAmount");
      const stampEnabledModalInput = getEl("stampEnabledModal");
      const stampLabelModalInput = getEl("stampLabelModal");
      const stampAmountModalInput = getEl("stampAmountModal");

      const stampEnabledInputs = [stampEnabledInput];
      const stampLabelInputs = [stampLabelInput];
      const stampAmountInputs = [stampAmountInput];
      const pdfShowSealInput = getEl("pdfShowSeal");
      const pdfShowSignatureInput = getEl("pdfShowSignature");
      const pdfShowAmountWordsInput = getEl("pdfShowAmountWords");
      const pdfShowSealModalInput = getEl("pdfShowSealModal");
      const pdfShowSignatureModalInput = getEl("pdfShowSignatureModal");
      const pdfShowAmountWordsModalInput = getEl("pdfShowAmountWordsModal");

      const pdfShowSealInputs = [pdfShowSealInput];
      const pdfShowSignatureInputs = [pdfShowSignatureInput];
      const pdfShowAmountWordsInputs = [pdfShowAmountWordsInput];
      const pdfShowSealModalInputs = [pdfShowSealModalInput];
      const pdfShowSignatureModalInputs = [pdfShowSignatureModalInput];
      const pdfShowAmountWordsModalInputs = [pdfShowAmountWordsModalInput];

      const setCheckedInputs = (inputs, value) => inputs.forEach((input) => { if (input) input.checked = !!value; });
      const setValueInputs = (inputs, value) => {
        const str = value === undefined || value === null ? "" : String(value);
        inputs.forEach((input) => {
          if (!input) return;
          if (input.value !== str) input.value = str;
        });
      };
      const setCheckedInput = (input, value) => {
        if (input) input.checked = !!value;
      };
      const setValueInput = (input, value) => {
        if (!input) return;
        const str = value === undefined || value === null ? "" : String(value);
        if (input.value !== str) input.value = str;
      };
      const parseNumber = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      const syncShipEnabled = (checked, { silent, updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(shipEnabledInputs, enabled);
        if (updateModal) setCheckedInput(shipEnabledModalInput, enabled);
        state().meta.extras.shipping.enabled = enabled;
        SEM.toggleShipFields(enabled);
        if (!silent) SEM.computeTotals();
      };
      const syncShipLabel = (value, { silent, updateModal = true } = {}) => {
        const label = value === undefined || value === null ? "" : String(value);
        setValueInputs(shipLabelInputs, label);
        if (updateModal) setValueInput(shipLabelModalInput, label);
        state().meta.extras.shipping.label = label;
        if (!silent) SEM.updateExtrasMiniRows();
      };
      const syncShipAmount = (value, { silent, updateModal = true } = {}) => {
        const amount = parseNumber(value, state().meta.extras.shipping.amount ?? 0);
        setValueInputs(shipAmountInputs, value);
        if (updateModal) setValueInput(shipAmountModalInput, value);
        state().meta.extras.shipping.amount = amount;
        if (!silent) SEM.computeTotals();
      };
      const syncShipTva = (value, { silent, updateModal = true } = {}) => {
        const tva = parseNumber(value, state().meta.extras.shipping.tva ?? 0);
        setValueInputs(shipTvaInputs, value);
        if (updateModal) setValueInput(shipTvaModalInput, value);
        state().meta.extras.shipping.tva = tva;
        if (!silent) SEM.computeTotals();
      };

      const syncDossierEnabled = (checked, { silent, updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(dossierEnabledInputs, enabled);
        if (updateModal) setCheckedInput(dossierEnabledModalInput, enabled);
        state().meta.extras.dossier.enabled = enabled;
        SEM.toggleDossierFields?.(enabled);
        if (!silent) SEM.computeTotals();
      };
      const syncDossierLabel = (value, { silent, updateModal = true } = {}) => {
        const label = value === undefined || value === null ? "" : String(value);
        setValueInputs(dossierLabelInputs, label);
        if (updateModal) setValueInput(dossierLabelModalInput, label);
        state().meta.extras.dossier.label = label;
        if (!silent) SEM.updateExtrasMiniRows();
      };
      const syncDossierAmount = (value, { silent, updateModal = true } = {}) => {
        const amount = parseNumber(value, state().meta.extras.dossier.amount ?? 0);
        setValueInputs(dossierAmountInputs, value);
        if (updateModal) setValueInput(dossierAmountModalInput, value);
        state().meta.extras.dossier.amount = amount;
        if (!silent) SEM.computeTotals();
      };
      const syncDossierTva = (value, { silent, updateModal = true } = {}) => {
        const tva = parseNumber(value, state().meta.extras.dossier.tva ?? 0);
        setValueInputs(dossierTvaInputs, value);
        if (updateModal) setValueInput(dossierTvaModalInput, value);
        state().meta.extras.dossier.tva = tva;
        if (!silent) SEM.computeTotals();
      };

      const syncDeplacementEnabled = (checked, { silent, updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(deplacementEnabledInputs, enabled);
        if (updateModal) setCheckedInput(deplacementEnabledModalInput, enabled);
        state().meta.extras.deplacement.enabled = enabled;
        SEM.toggleDeplacementFields?.(enabled);
        if (!silent) SEM.computeTotals();
      };
      const syncDeplacementLabel = (value, { silent, updateModal = true } = {}) => {
        const label = value === undefined || value === null ? "" : String(value);
        setValueInputs(deplacementLabelInputs, label);
        if (updateModal) setValueInput(deplacementLabelModalInput, label);
        state().meta.extras.deplacement.label = label;
        if (!silent) SEM.updateExtrasMiniRows();
      };
      const syncDeplacementAmount = (value, { silent, updateModal = true } = {}) => {
        const amount = parseNumber(value, state().meta.extras.deplacement.amount ?? 0);
        setValueInputs(deplacementAmountInputs, value);
        if (updateModal) setValueInput(deplacementAmountModalInput, value);
        state().meta.extras.deplacement.amount = amount;
        if (!silent) SEM.computeTotals();
      };
      const syncDeplacementTva = (value, { silent, updateModal = true } = {}) => {
        const tva = parseNumber(value, state().meta.extras.deplacement.tva ?? 0);
        setValueInputs(deplacementTvaInputs, value);
        if (updateModal) setValueInput(deplacementTvaModalInput, value);
        state().meta.extras.deplacement.tva = tva;
        if (!silent) SEM.computeTotals();
      };

      const syncStampEnabled = (checked, { silent, updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(stampEnabledInputs, enabled);
        if (updateModal) setCheckedInput(stampEnabledModalInput, enabled);
        state().meta.extras.stamp.enabled = enabled;
        SEM.toggleStampFields(enabled);
        if (!silent) SEM.computeTotals();
      };
      const syncStampLabel = (value, { silent, updateModal = true } = {}) => {
        const label = value === undefined || value === null ? "" : String(value);
        setValueInputs(stampLabelInputs, label);
        if (updateModal) setValueInput(stampLabelModalInput, label);
        state().meta.extras.stamp.label = label;
        if (!silent) SEM.updateExtrasMiniRows();
      };
      const syncStampAmount = (value, { silent, updateModal = true } = {}) => {
        const amount = parseNumber(value, state().meta.extras.stamp.amount ?? 0);
        setValueInputs(stampAmountInputs, value);
        if (updateModal) setValueInput(stampAmountModalInput, value);
        state().meta.extras.stamp.amount = amount;
        if (!silent) SEM.computeTotals();
      };

      const modelStepPanel3 = getEl("modelStepPanel3");
      const getModelStep3El = (id) => modelStepPanel3?.querySelector?.(`#${id}`) || null;
      const modelSubventionEnabledInput = getModelStep3El("subventionEnabled");
      const modelSubventionLabelInput = getModelStep3El("subventionLabel");
      const modelSubventionAmountInput = getModelStep3El("subventionAmount");
      const modelSubventionFields = getModelStep3El("subventionFields");
      const modelFinBankEnabledInput = getModelStep3El("finBankEnabled");
      const modelFinBankLabelInput = getModelStep3El("finBankLabel");
      const modelFinBankAmountInput = getModelStep3El("finBankAmount");
      const modelFinBankFields = getModelStep3El("finBankFields");
      const modelFinancingNetRow = getModelStep3El("financingNetRow");
      const modelFinancingNetInput = getModelStep3El("financingNet");
      const updateModelFinancingNetPreview = () => {
        if (!modelFinancingNetInput) return;
        const subEnabled = !!modelSubventionEnabledInput?.checked;
        const bankEnabled = !!modelFinBankEnabledInput?.checked;
        const subAmount = subEnabled ? parseNumber(modelSubventionAmountInput?.value, 0) : 0;
        const bankAmount = bankEnabled ? parseNumber(modelFinBankAmountInput?.value, 0) : 0;
        const totals = typeof SEM.computeTotalsReturn === "function" ? SEM.computeTotalsReturn() : null;
        const baseTotalRaw = Number(totals?.totalTTC ?? state()?.totals?.totalTTC ?? 0);
        const baseTotal = Number.isFinite(baseTotalRaw) ? baseTotalRaw : 0;
        const net = baseTotal - (subAmount + bankAmount);
        const currency = state()?.meta?.currency || totals?.currency || "DT";
        modelFinancingNetInput.value = formatMoney(net, currency);
        if (modelFinancingNetRow) {
          const showNet = subEnabled || bankEnabled;
          modelFinancingNetRow.hidden = !showNet;
          modelFinancingNetRow.style.display = showNet ? "" : "none";
        }
      };
      const syncModelFinancingFieldsVisibility = () => {
        if (modelSubventionFields) {
          const showSubvention = !!modelSubventionEnabledInput?.checked;
          modelSubventionFields.hidden = !showSubvention;
          modelSubventionFields.style.display = showSubvention ? "" : "none";
        }
        if (modelFinBankFields) {
          const showBank = !!modelFinBankEnabledInput?.checked;
          modelFinBankFields.hidden = !showBank;
          modelFinBankFields.style.display = showBank ? "" : "none";
        }
      };
      const syncModelFinancingState = ({ schedulePreview = true } = {}) => {
        syncModelFinancingFieldsVisibility();
        updateModelFinancingNetPreview();
        if (schedulePreview) scheduleModelPreviewUpdate();
      };

      const feesTaxesOptions = [
        { feeKey: "shipping", optionId: "shipOptToggleModal", enabledModalId: "shipEnabledModal" },
        { feeKey: "stamp", optionId: "stampOptToggleModal", enabledModalId: "stampEnabledModal" },
        { feeKey: "dossier", optionId: "dossierOptToggleModal", enabledModalId: "dossierEnabledModal" },
        { feeKey: "deplacement", optionId: "deplacementOptToggleModal", enabledModalId: "deplacementEnabledModal" },
        { feeKey: "financing", optionId: "financingOptToggleModal", targetId: "financingBox" }
      ];

      const setToggleOptionState = (input, enabled) => {
        if (!input) return;
        const isEnabled = !!enabled;
        if (input.checked !== isEnabled) input.checked = isEnabled;
        input.setAttribute("aria-checked", isEnabled ? "true" : "false");
        const label = input.closest("label.toggle-option");
        if (label) {
          label.setAttribute("aria-selected", isEnabled ? "true" : "false");
        }
      };

      const setFeesOptionGroupVisibility = (config, visible) => {
        const isVisible = !!visible;
        if (config?.targetId) {
          const target = getModelStep3El(config.targetId) || getEl(config.targetId);
          if (!target) return;
          target.hidden = !isVisible;
          target.style.display = isVisible ? "" : "none";
          return;
        }
        const enabledInput = getModelStep3El(config?.enabledModalId) || document.getElementById(config?.enabledModalId);
        const group = enabledInput?.closest?.(".shipping-flex-group");
        if (!group) return;
        group.hidden = !isVisible;
        group.style.display = isVisible ? "" : "none";
      };

      const applyFeesOptionChange = (config, checked, { schedulePreview = false } = {}) => {
        const optionInput = getModelStep3El(config.optionId) || getEl(config.optionId);
        const isChecked = !!checked;
        setToggleOptionState(optionInput, isChecked);
        setFeesOptionGroupVisibility(config, isChecked);
        if (config.feeKey === "financing") {
          const financing = ensureFinancingState();
          financing.used = isChecked;
        } else {
          const extras = ensureExtrasState();
          if (config.feeKey && extras[config.feeKey] && typeof extras[config.feeKey] === "object") {
            extras[config.feeKey].used = isChecked;
          }
        }
        if (schedulePreview) scheduleModelPreviewUpdate();
      };

      const handleFeesOptionsToggle = (optionInput, { schedulePreview = false } = {}) => {
        if (!optionInput || !optionInput.id) return;
        const config = feesTaxesOptions.find((entry) => entry.optionId === optionInput.id);
        if (!config) return;
        applyFeesOptionChange(config, !!optionInput.checked, { schedulePreview });
      };

      const syncFeesTaxesOptionsUi = () => {
        feesTaxesOptions.forEach((config) => {
          const optionInput = getModelStep3El(config.optionId) || getEl(config.optionId);
          applyFeesOptionChange(config, !!optionInput?.checked, { schedulePreview: false });
        });
      };
      const initializeFeesTaxesOptionsFromState = () => {
        const extras = ensureExtrasState();
        const financing = ensureFinancingState();
        feesTaxesOptions.forEach((config) => {
          const optionInput = getModelStep3El(config.optionId) || getEl(config.optionId);
          if (!optionInput) return;
          const feeState =
            config.feeKey === "financing"
              ? {
                  used: financing.used,
                  enabled: !!financing.subvention?.enabled || !!financing.bank?.enabled
                }
              : extras?.[config.feeKey];
          const checked = resolveFeesOptionUsed(
            feeState,
            FEES_OPTIONS_DEFAULTS[config.feeKey]
          );
          setToggleOptionState(optionInput, checked);
        });
      };

      const syncPdfShowSeal = (checked, { updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(pdfShowSealInputs, enabled);
        if (updateModal) setCheckedInput(pdfShowSealModalInput, enabled);
        ensurePdfOptionsState().showSeal = enabled;
        SEM.updateAmountWordsBlock?.();
      };
      const syncPdfShowSignature = (checked, { updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(pdfShowSignatureInputs, enabled);
        if (updateModal) setCheckedInput(pdfShowSignatureModalInput, enabled);
        ensurePdfOptionsState().showSignature = enabled;
        SEM.updateAmountWordsBlock?.();
      };
      const syncPdfShowAmountWords = (checked, { updateModal = true } = {}) => {
        const enabled = !!checked;
        setCheckedInputs(pdfShowAmountWordsInputs, enabled);
        if (updateModal) setCheckedInput(pdfShowAmountWordsModalInput, enabled);
        ensurePdfOptionsState().showAmountWords = enabled;
        SEM.updateAmountWordsBlock?.();
      };

      const initialPdfOptions = ensurePdfOptionsState();
      setCheckedInputs(pdfShowSealInputs, initialPdfOptions.showSeal !== false);
      setCheckedInputs(pdfShowSignatureInputs, initialPdfOptions.showSignature !== false);
      setCheckedInputs(pdfShowAmountWordsInputs, initialPdfOptions.showAmountWords !== false);
      setCheckedInputs(pdfShowSealModalInputs, initialPdfOptions.showSeal !== false);
      setCheckedInputs(pdfShowSignatureModalInputs, initialPdfOptions.showSignature !== false);
      setCheckedInputs(pdfShowAmountWordsModalInputs, initialPdfOptions.showAmountWords !== false);

      initializeFeesTaxesOptionsFromState();
      syncFeesTaxesOptionsUi();
      w.syncFeesTaxesOptionsUi = syncFeesTaxesOptionsUi;
      w.handleFeesOptionsToggle = handleFeesOptionsToggle;
      w.updateModelFinancingNetPreview = updateModelFinancingNetPreview;

      if (modelStepPanel3 && typeof MutationObserver === "function") {
        const optionsObserver = new MutationObserver(() => {
          if (!modelStepPanel3.hidden) {
            syncFeesTaxesOptionsUi();
            syncModelFinancingFieldsVisibility();
            updateModelFinancingNetPreview();
          }
        });
        optionsObserver.observe(modelStepPanel3, { attributes: true, attributeFilter: ["hidden"] });
      }

      feesTaxesOptions.forEach((config) => {
        const optionInput = getModelStep3El(config.optionId) || getEl(config.optionId);
        optionInput?.addEventListener("change", () =>
          handleFeesOptionsToggle(optionInput, { schedulePreview: true })
        );
      });
      [modelSubventionEnabledInput, modelSubventionLabelInput, modelSubventionAmountInput].forEach((input) => {
        if (!input) return;
        const eventName = input.type === "checkbox" ? "change" : "input";
        input.addEventListener(eventName, () => syncModelFinancingState({ schedulePreview: true }));
      });
      [modelFinBankEnabledInput, modelFinBankLabelInput, modelFinBankAmountInput].forEach((input) => {
        if (!input) return;
        const eventName = input.type === "checkbox" ? "change" : "input";
        input.addEventListener(eventName, () => syncModelFinancingState({ schedulePreview: true }));
      });
      syncModelFinancingFieldsVisibility();
      updateModelFinancingNetPreview();

      shipEnabledInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncShipEnabled(evt.target.checked));
      });
      shipLabelInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncShipLabel(evt.target.value));
      });
      shipAmountInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncShipAmount(evt.target.value));
      });
      shipTvaInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncShipTva(evt.target.value));
      });

      dossierEnabledInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncDossierEnabled(evt.target.checked));
      });
      dossierLabelInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDossierLabel(evt.target.value));
      });
      dossierAmountInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDossierAmount(evt.target.value));
      });
      dossierTvaInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDossierTva(evt.target.value));
      });

      deplacementEnabledInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncDeplacementEnabled(evt.target.checked));
      });
      deplacementLabelInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDeplacementLabel(evt.target.value));
      });
      deplacementAmountInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDeplacementAmount(evt.target.value));
      });
      deplacementTvaInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncDeplacementTva(evt.target.value));
      });

      stampEnabledInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncStampEnabled(evt.target.checked));
      });
      stampLabelInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncStampLabel(evt.target.value));
      });
      stampAmountInputs.forEach((input) => {
        input?.addEventListener("input", (evt) => syncStampAmount(evt.target.value));
      });

      pdfShowSealInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncPdfShowSeal(evt.target.checked));
      });
      pdfShowSignatureInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncPdfShowSignature(evt.target.checked));
      });
      pdfShowAmountWordsInputs.forEach((input) => {
        input?.addEventListener("change", (evt) => syncPdfShowAmountWords(evt.target.checked));
      });
      document.addEventListener("change", (evt) => {
        const target = evt.target;
        if (!target || typeof target.id !== "string") return;
        if (target.id === "pdfShowSealModal") {
          syncPdfShowSeal(target.checked, { updateModal: true });
        } else if (target.id === "pdfShowSignatureModal") {
          syncPdfShowSignature(target.checked, { updateModal: true });
        } else if (target.id === "pdfShowAmountWordsModal") {
          syncPdfShowAmountWords(target.checked, { updateModal: true });
        }
      });

      const addFodecState = ensureAddFormFodecState();
      const addPurchaseFodecState = ensureAddFormPurchaseFodecState();
      const addFormScopes = Array.from(document.querySelectorAll(ADD_FORM_SCOPE_SELECTOR));
      if (addFormScopes.length) {
        addFormScopes.forEach((scope) => {
          const toggle = scope.querySelector("#addFodecEnabled");
          if (toggle) toggle.checked = !!addFodecState.enabled;
          toggleAddFodecFields(!!addFodecState.enabled, scope);
          const purchaseToggle = scope.querySelector("#addPurchaseFodecEnabled");
          if (purchaseToggle) purchaseToggle.checked = !!addPurchaseFodecState.enabled;
          toggleAddPurchaseFodecFields(!!addPurchaseFodecState.enabled, scope);
        });
      } else {
        toggleAddFodecFields(addFodecState.enabled);
        toggleAddPurchaseFodecFields(addPurchaseFodecState.enabled);
      }
      document.addEventListener("change", (evt) => {
        const toggle = evt.target?.closest?.("#addFodecEnabled");
        if (toggle) {
          const enabled = !!toggle.checked;
          const f = ensureAddFormFodecState();
          f.enabled = enabled;
          toggleAddFodecFields(enabled, toggle);
          SEM.updateAddFormTotals?.();
          return;
        }
        const purchaseToggle = evt.target?.closest?.("#addPurchaseFodecEnabled");
        if (!purchaseToggle) return;
        const purchaseEnabled = !!purchaseToggle.checked;
        const pf = ensureAddFormPurchaseFodecState();
        pf.enabled = purchaseEnabled;
        toggleAddPurchaseFodecFields(purchaseEnabled, purchaseToggle);
        SEM.updateAddFormTotals?.();
      });
      getEl("addFodecRate")?.addEventListener("input", () => {
        const f = ensureAddFormFodecState();
        f.rate = getNum("addFodecRate", f.rate ?? 1);
        SEM.updateAddFormTotals?.();
      });
      getEl("addFodecTva")?.addEventListener("input", () => {
        const f = ensureAddFormFodecState();
        f.tva = getNum("addFodecTva", f.tva ?? 19);
        SEM.updateAddFormTotals?.();
      });
      getEl("addPurchaseFodecRate")?.addEventListener("input", () => {
        const pf = ensureAddFormPurchaseFodecState();
        pf.rate = getNum("addPurchaseFodecRate", pf.rate ?? 1);
        SEM.updateAddFormTotals?.();
      });
      getEl("addPurchaseFodecTva")?.addEventListener("input", () => {
        const pf = ensureAddFormPurchaseFodecState();
        pf.tva = getNum("addPurchaseFodecTva", pf.tva ?? 19);
        SEM.updateAddFormTotals?.();
      });

  });
})(window);
