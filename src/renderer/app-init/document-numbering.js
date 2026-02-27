(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.createDocumentNumbering = function createDocumentNumbering() {
    const SEM = (w.SEM = w.SEM || {});
    const invNumberInput = getEl("invNumber");
    const invNumberLengthSelect = getEl("invNumberLength");
    const docTypeSelect = getEl("docType");
    const docTypeMenu = getEl("docTypeMenu");
    const docTypePanel = getEl("docTypePanel");
    const docTypeDisplay = getEl("docTypeDisplay");
    const docTypeToggle = docTypeMenu?.querySelector("summary") || null;
    const modelDocTypeSelect = getEl("modelDocType");
    const modelDocTypeMenu = getEl("modelDocTypeMenu");
    const modelDocTypePanel = getEl("modelDocTypePanel");
    const modelDocTypeDisplay = getEl("modelDocTypeDisplay");
    const modelDocTypeToggle = modelDocTypeMenu?.querySelector("summary") || null;
    const modelActionsModal = getEl("modelActionsModal");
    const currencySelect = getEl("currency");
    const currencyMenu = getEl("currencyMenu");
    const currencyPanel = getEl("currencyPanel");
    const currencyDisplay = getEl("currencyDisplay");
    const currencyToggle = currencyMenu?.querySelector("summary") || null;
    const modelCurrencySelect = getEl("modelCurrency");
    const modelCurrencyMenu = getEl("modelCurrencyMenu");
    const modelCurrencyPanel = getEl("modelCurrencyPanel");
    const modelCurrencyDisplay = getEl("modelCurrencyDisplay");
    const modelCurrencyToggle = modelCurrencyMenu?.querySelector("summary") || null;
    const taxSelect = getEl("taxMode");
    const taxMenu = getEl("taxMenu");
    const taxPanel = getEl("taxPanel");
    const taxDisplay = getEl("taxDisplay");
    const taxToggle = taxMenu?.querySelector("summary") || null;
    const modelTaxSelect = getEl("modelTaxMode");
    const modelTaxMenu = getEl("modelTaxMenu");
    const modelTaxPanel = getEl("modelTaxPanel");
    const modelTaxDisplay = getEl("modelTaxDisplay");
    const modelTaxToggle = modelTaxMenu?.querySelector("summary") || null;
    const modelNumberFormatSelect = getEl("modelNumberFormat");
    const modelNumberFormatPanel = getEl("modelNumberFormatPanel");
    const invDateInput = getEl("invDate");
    const invNumberPrefixInput = getEl("invNumberPrefix");
    const invNumberDatePartInput = getEl("invNumberDatePart");
    const invNumberSuffixInput = getEl("invNumberSuffix");
    const createDatePicker =
      w.AppDatePicker && typeof w.AppDatePicker.create === "function"
        ? w.AppDatePicker.create.bind(w.AppDatePicker)
        : null;
    if (invDateInput) {
      if (createDatePicker) {
        createDatePicker(invDateInput, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois précédent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: true
        });
      } else {
        invDateInput.readOnly = false;
      }
    }

    function getInvoiceMeta() {
      const st = SEM.state || (SEM.state = {});
      return st.meta || (st.meta = {});
    }

    function normalizeInvoiceLengthLocal(value, fallback) {
      if (typeof normalizeInvoiceNumberLength === "function") {
        return normalizeInvoiceNumberLength(value, fallback);
      }
      const n = Number(value);
      if (n === 4 || n === 6 || n === 8 || n === 12) return n;
      const fb = Number(fallback);
      if (fb === 4 || fb === 6 || fb === 8 || fb === 12) return fb;
      return 4;
    }

    const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
    const normalizeNumberFormatLocal = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
      const raw = String(value || "").trim().toLowerCase();
      if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
      const fb = String(fallback || "").trim().toLowerCase();
      if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
      return NUMBER_FORMAT_DEFAULT;
    };
    const numberFormatHasPrefix = (format) => format !== "counter";
    const numberFormatHasDate = (format) => format === "prefix_date_counter";
    const getActiveNumberFormat = () => {
      const meta = getInvoiceMeta();
      return normalizeNumberFormatLocal(meta.numberFormat, NUMBER_FORMAT_DEFAULT);
    };

    const DOC_TYPE_LABELS = {
      facture: "Facture",
      fa: "Facture d'achat",
      devis: "Devis",
      bl: "Bon de livraison",
      avoir: "Facture d'avoir"
    };

    const MODEL_DOC_TYPE_ALL = "all";
    const MODEL_DOC_TYPE_ALL_LABEL = "Compatible avec tous les types";
    const MODEL_DOC_TYPE_LIST = ["facture", "fa", "devis", "bl", "avoir"];
    const MODEL_DOC_TYPE_SET = new Set(MODEL_DOC_TYPE_LIST);
    const MODEL_DOC_TYPE_ALIAS_MAP = {
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const DEFAULT_MODEL_DOC_TYPE = "facture";

    const DOC_TYPE_PREFIX_DEFAULTS = {
      facture: "Fact",
      fa: "FA",
      devis: "Dev",
      bl: "BL",
      avoir: "AV"
    };
    const docTypeControls = [
      {
        kind: "main",
        select: docTypeSelect,
        menu: docTypeMenu,
        panel: docTypePanel,
        display: docTypeDisplay,
        toggle: docTypeToggle
      },
      {
        kind: "model",
        select: modelDocTypeSelect,
        menu: modelDocTypeMenu,
        panel: modelDocTypePanel,
        display: modelDocTypeDisplay,
        toggle: modelDocTypeToggle
      }
    ].filter(({ select, menu, panel, display }) => select || menu || panel || display);

    let currentDocTypeValue;
    let docTypeAllowedSet = null;

    const normalizeAllowedDocTypes = (list) => {
      if (!Array.isArray(list)) return null;
      const normalized = list
        .map((val) => normalizeDocTypeValue(val))
          .filter((val) => val && val !== MODEL_DOC_TYPE_ALL);
      if (!normalized.length) return null;
      return new Set(normalized);
    };

    function normalizeDocTypeValue(value, fallback = "facture") {
      const fallbackRaw = String(fallback ?? "").trim().toLowerCase();
      const hasFallback = !!fallbackRaw;
      const normalizedFallback = hasFallback
        ? (DOC_TYPE_LABELS[fallbackRaw] ? fallbackRaw : "facture")
        : "";
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return hasFallback ? normalizedFallback : "";
      const aliasMap = {
        factureavoir: "avoir",
        facture_avoir: "avoir",
        "facture-avoir": "avoir",
        "facture avoir": "avoir",
        "facture d'avoir": "avoir",
        "facture davoir": "avoir"
      };
      const normalized = aliasMap[raw] || raw;
      if (DOC_TYPE_LABELS[normalized]) return normalized;
      return hasFallback ? normalizedFallback : "";
    }
    const normalizeModelDocTypeList = (value, fallback = []) => {
      const rawList = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [];
      const normalized = [];
      rawList.forEach((entry) => {
        const raw = String(entry || "").trim().toLowerCase();
        if (!raw || raw === MODEL_DOC_TYPE_ALL || raw === "aucun") return;
        const mapped = MODEL_DOC_TYPE_ALIAS_MAP[raw] || raw;
        const next = MODEL_DOC_TYPE_SET.has(mapped) ? mapped : "";
        if (!next) return;
        if (!normalized.includes(next)) normalized.push(next);
      });
      if (!normalized.length && fallback && fallback.length) {
        return normalizeModelDocTypeList(fallback, []);
      }
      return normalized;
    };
    const expandModelDocTypeList = (value, fallback = []) => {
      const normalized = normalizeModelDocTypeList(value, []);
      if (normalized.length) return normalized;
      const single = String(value || "").trim().toLowerCase();
      if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
      const normalizedSingle =
        MODEL_DOC_TYPE_SET.has(MODEL_DOC_TYPE_ALIAS_MAP[single] || single)
          ? (MODEL_DOC_TYPE_ALIAS_MAP[single] || single)
          : "";
      if (MODEL_DOC_TYPE_SET.has(normalizedSingle)) return [normalizedSingle];
      const fallbackList = normalizeModelDocTypeList(fallback, []);
      return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
    };

    function getDocTypeLabel(value) {
      const normalized = normalizeDocTypeValue(value);
      return DOC_TYPE_LABELS[normalized] || DOC_TYPE_LABELS.facture;
    }

    const DOC_TYPE_ACTION_LABEL_SELECTOR = "[data-doc-type-action-label]";
    function updateDocTypeActionLabels(label) {
      if (typeof document === "undefined") return;
      const safeLabel = String(label || "").trim() || "Document";
      document.querySelectorAll(DOC_TYPE_ACTION_LABEL_SELECTOR).forEach((node) => {
        if (!node || !node.dataset) return;
        const prefix = String(node.dataset.docTypeActionLabel || "").trim();
        if (!prefix) return;
        node.textContent = `${prefix} (${safeLabel})`;
      });
    }

    function getModelDocTypeLabel(value) {
      const list = expandModelDocTypeList(value);
      if (list.length === MODEL_DOC_TYPE_LIST.length) return MODEL_DOC_TYPE_ALL_LABEL;
      if (list.length <= 1) return getDocTypeLabel(list[0] || "facture");
      return list.map((entry) => getDocTypeLabel(entry)).join(" + ");
    }

    function getSelectedModelDocTypes() {
      const panelValues = Array.from(
        modelDocTypePanel?.querySelectorAll?.('input[type="checkbox"][name="modelDocTypeChoice"]:checked') || []
      )
        .map((input) => String(input.value || "").trim().toLowerCase())
        .filter(Boolean);
      if (panelValues.length) return normalizeModelDocTypeList(panelValues, []);
      const selectValues = Array.from(modelDocTypeSelect?.selectedOptions || [])
        .map((opt) => String(opt.value || "").trim().toLowerCase())
        .filter(Boolean);
      if (selectValues.length) return normalizeModelDocTypeList(selectValues, []);
      const fallbackValue = String(modelDocTypeSelect?.value || "").trim().toLowerCase();
      return normalizeModelDocTypeList(fallbackValue, []);
    }

    const MODEL_DOC_TYPE_SWITCH_FACTURE = "facture";
    const MODEL_DOC_TYPE_SWITCH_FA = "fa";
    const MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY = "docTypeFaPrevChecked";
    const MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY = "docTypeFaForced";
    const MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY = "docTypeFacturePurchaseLocked";
    const MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY = "docTypeFacturePurchasePrevChecked";
    const MODEL_DOC_TYPE_PRICE_DEP_LOCK_DATASET_KEY = "docTypePriceDepPrevChecked";
    const MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY = "docTypePriceDepForced";
    const MODEL_DOC_TYPE_PRICE_TOGGLE_ID = "colTogglePriceModal";
    const MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_LOCK_DATASET_KEY = "docTypePurchasePriceDepPrevChecked";
    const MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_FORCED_DATASET_KEY = "docTypePurchasePriceDepForced";
    const MODEL_DOC_TYPE_PURCHASE_PRICE_TOGGLE_ID = "colTogglePurchasePriceModal";
    const MODEL_DOC_TYPE_CONTEXTUAL_SALE_FODEC_TOGGLE_ID = "colToggleFodecModal";
    const MODEL_DOC_TYPE_CONTEXTUAL_PURCHASE_FODEC_TOGGLE_ID = "colTogglePurchaseFodecModal";
    const MODEL_DOC_TYPE_FA_VENTE_TOGGLE_IDS = [
      "colTogglePriceModal",
      "colToggleTvaModal",
      "colToggleFodecModal",
      "colToggleDiscountModal",
      "colToggleTotalHtModal",
      "colToggleTotalTtcModal"
    ];
    const MODEL_DOC_TYPE_FA_PURCHASE_TOGGLE_IDS = [
      "colTogglePurchasePriceModal",
      "colTogglePurchaseTvaModal",
      "colTogglePurchaseFodecModal",
      "colTogglePurchaseDiscountModal",
      "colToggleTotalPurchaseHtModal",
      "colToggleTotalPurchaseTtcModal"
    ];
    const MODEL_DOC_TYPE_FA_TRACKED_TOGGLE_IDS = new Set([
      ...MODEL_DOC_TYPE_FA_VENTE_TOGGLE_IDS,
      ...MODEL_DOC_TYPE_FA_PURCHASE_TOGGLE_IDS
    ]);
    const MODEL_DOC_TYPE_TAX_DEPENDENT_VENTE_TOGGLE_IDS = new Set([
      "colToggleTvaModal",
      "colToggleFodecModal",
      "colToggleTotalTtcModal"
    ]);
    const MODEL_DOC_TYPE_PRICE_DEPENDENT_VENTE_TOGGLE_IDS = [
      "colToggleTvaModal",
      "colToggleDiscountModal",
      "colToggleTotalHtModal",
      "colToggleTotalTtcModal"
    ];
    const MODEL_DOC_TYPE_PURCHASE_PRICE_DEPENDENT_TOGGLE_IDS = [
      "colTogglePurchaseTvaModal",
      "colTogglePurchaseFodecModal",
      "colTogglePurchaseDiscountModal",
      "colToggleTotalPurchaseHtModal",
      "colToggleTotalPurchaseTtcModal"
    ];
    const MODEL_DOC_TYPE_SWITCH_SET = new Set([
      MODEL_DOC_TYPE_SWITCH_FACTURE,
      MODEL_DOC_TYPE_SWITCH_FA
    ]);
    let modelDocTypeFaLockSyncInProgress = false;

    const normalizeModelDocTypeSwitchSelection = (value, preferredSwitchValue = "") => {
      let normalizedList = expandModelDocTypeList(value, getSelectedModelDocTypes());
      if (!normalizedList.length) normalizedList = [DEFAULT_MODEL_DOC_TYPE];

      const hasFacture = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FACTURE);
      const hasFa = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FA);
      if (!hasFacture || !hasFa) return normalizedList;

      const preferredRaw = String(preferredSwitchValue || "").trim().toLowerCase();
      const preferred =
        MODEL_DOC_TYPE_SWITCH_SET.has(preferredRaw)
          ? preferredRaw
          : "";
      const factureIndex = normalizedList.indexOf(MODEL_DOC_TYPE_SWITCH_FACTURE);
      const faIndex = normalizedList.indexOf(MODEL_DOC_TYPE_SWITCH_FA);
      const keepValue =
        preferred ||
        (faIndex > -1 && factureIndex > -1 && faIndex < factureIndex
          ? MODEL_DOC_TYPE_SWITCH_FA
          : MODEL_DOC_TYPE_SWITCH_FACTURE);
      const dropValue =
        keepValue === MODEL_DOC_TYPE_SWITCH_FA
          ? MODEL_DOC_TYPE_SWITCH_FACTURE
          : MODEL_DOC_TYPE_SWITCH_FA;
      return normalizedList.filter((entry) => entry !== dropValue);
    };

    const setModelColumnToggleDisabledState = (input, disabled) => {
      if (!input) return;
      input.disabled = !!disabled;
      const label = input.closest?.("label.toggle-option");
      if (!label) return;
      label.classList.toggle("is-disabled", !!disabled);
      if (disabled) {
        label.setAttribute("aria-disabled", "true");
      } else {
        label.removeAttribute("aria-disabled");
      }
    };

    const setModelColumnToggleChecked = (input, checked) => {
      if (!input) return false;
      const changed = input.checked !== checked;
      input.checked = checked;
      input.setAttribute("aria-checked", checked ? "true" : "false");
      if (changed) {
        try {
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      }
      return changed;
    };

    const getModelColumnToggleById = (id) => {
      if (!id) return null;
      if (typeof getEl === "function") return getEl(id);
      return document.getElementById(id);
    };

    const syncModelPriceDependentSaleToggles = ({ reapplyTaxLocksOnUnlock = true } = {}) => {
      const priceToggle = getModelColumnToggleById(MODEL_DOC_TYPE_PRICE_TOGGLE_ID);
      const dependentToggles = MODEL_DOC_TYPE_PRICE_DEPENDENT_VENTE_TOGGLE_IDS
        .map((id) => getModelColumnToggleById(id))
        .filter(Boolean);
      if (!priceToggle || !dependentToggles.length) return;

      const syncTaxLocks = w.SEM?.__bindingHelpers?.syncTaxModeDependentColumnToggles;
      const isPriceActive = !!priceToggle.checked && !priceToggle.disabled;

      if (!isPriceActive) {
        dependentToggles.forEach((toggle) => {
          if (toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY] !== "1") {
            toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_LOCK_DATASET_KEY] = String(!!toggle.checked);
          }
          setModelColumnToggleChecked(toggle, false);
          setModelColumnToggleDisabledState(toggle, true);
          toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY] = "1";
        });
        return;
      }

      dependentToggles.forEach((toggle) => {
        const wasForced = toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY] === "1";
        setModelColumnToggleDisabledState(toggle, false);
        if (wasForced) {
          const previousValue = toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_LOCK_DATASET_KEY];
          if (previousValue === "true" || previousValue === "false") {
            setModelColumnToggleChecked(toggle, previousValue === "true");
          }
        }
        delete toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY];
        delete toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_LOCK_DATASET_KEY];
      });

      if (reapplyTaxLocksOnUnlock && typeof syncTaxLocks === "function") {
        syncTaxLocks({ scope: "model" });
      }
    };
    const syncModelPurchasePriceDependentToggles = ({ reapplyTaxLocksOnUnlock = true } = {}) => {
      const purchasePriceToggle = getModelColumnToggleById(MODEL_DOC_TYPE_PURCHASE_PRICE_TOGGLE_ID);
      const dependentToggles = MODEL_DOC_TYPE_PURCHASE_PRICE_DEPENDENT_TOGGLE_IDS
        .map((id) => getModelColumnToggleById(id))
        .filter(Boolean);
      if (!purchasePriceToggle || !dependentToggles.length) return;

      const syncTaxLocks = w.SEM?.__bindingHelpers?.syncTaxModeDependentColumnToggles;
      const isPurchasePriceActive = !!purchasePriceToggle.checked && !purchasePriceToggle.disabled;

      if (!isPurchasePriceActive) {
        dependentToggles.forEach((toggle) => {
          if (toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_FORCED_DATASET_KEY] !== "1") {
            toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_LOCK_DATASET_KEY] = String(!!toggle.checked);
          }
          setModelColumnToggleChecked(toggle, false);
          setModelColumnToggleDisabledState(toggle, true);
          toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_FORCED_DATASET_KEY] = "1";
        });
        return;
      }

      dependentToggles.forEach((toggle) => {
        const wasForced = toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_FORCED_DATASET_KEY] === "1";
        setModelColumnToggleDisabledState(toggle, false);
        if (wasForced) {
          const previousValue = toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_LOCK_DATASET_KEY];
          if (previousValue === "true" || previousValue === "false") {
            setModelColumnToggleChecked(toggle, previousValue === "true");
          }
        }
        delete toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_FORCED_DATASET_KEY];
        delete toggle.dataset[MODEL_DOC_TYPE_PURCHASE_PRICE_DEP_LOCK_DATASET_KEY];
      });

      if (reapplyTaxLocksOnUnlock && typeof syncTaxLocks === "function") {
        syncTaxLocks({ scope: "model" });
      }
    };

    const syncModelContextualFodecToggles = (modelDocTypes = getSelectedModelDocTypes()) => {
      const normalizedList = normalizeModelDocTypeSwitchSelection(modelDocTypes);
      const isPurchaseContext = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FA);
      const saleToggle = getModelColumnToggleById(MODEL_DOC_TYPE_CONTEXTUAL_SALE_FODEC_TOGGLE_ID);
      const purchaseToggle = getModelColumnToggleById(MODEL_DOC_TYPE_CONTEXTUAL_PURCHASE_FODEC_TOGGLE_ID);
      if (!saleToggle && !purchaseToggle) return;
      const purchasePriceToggle = getModelColumnToggleById(MODEL_DOC_TYPE_PURCHASE_PRICE_TOGGLE_ID);
      const purchaseContextLocked =
        !purchasePriceToggle || !!purchasePriceToggle.disabled || !purchasePriceToggle.checked;
      const rawModelTaxMode =
        modelTaxSelect?.value ||
        modelTaxPanel?.querySelector?.("input:checked")?.value ||
        "with";
      const taxesEnabled = normalizeTaxValue(rawModelTaxMode, "with") !== "without";
      if (saleToggle) {
        setModelColumnToggleDisabledState(saleToggle, isPurchaseContext || !taxesEnabled);
      }
      if (purchaseToggle) {
        setModelColumnToggleDisabledState(
          purchaseToggle,
          !isPurchaseContext || purchaseContextLocked || !taxesEnabled
        );
      }
    };

    const applyModelDocTypeFaColumnLocks = (modelDocTypes = getSelectedModelDocTypes()) => {
      const normalizedList = normalizeModelDocTypeSwitchSelection(modelDocTypes);
      if (modelDocTypeFaLockSyncInProgress) {
        return normalizedList;
      }
      modelDocTypeFaLockSyncInProgress = true;
      try {
      const isFaActive = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FA);
      const isFactureActive = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FACTURE);
      const saleToggles = MODEL_DOC_TYPE_FA_VENTE_TOGGLE_IDS
        .map((id) => getModelColumnToggleById(id))
        .filter(Boolean);
      const purchaseToggles = MODEL_DOC_TYPE_FA_PURCHASE_TOGGLE_IDS
        .map((id) => getModelColumnToggleById(id))
        .filter(Boolean);
      const allToggles = [...saleToggles, ...purchaseToggles];
      const syncTaxLocks = w.SEM?.__bindingHelpers?.syncTaxModeDependentColumnToggles;
      const enforceFaSalesGridLock = () => {
        saleToggles.forEach((toggle) => {
          if (toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY] !== "1") {
            toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY] = String(!!toggle.checked);
          }
          setModelColumnToggleChecked(toggle, false);
          setModelColumnToggleDisabledState(toggle, true);
          toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY] = "1";
        });
      };
      const enforceFacturePurchaseGridLock = () => {
        purchaseToggles.forEach((toggle) => {
          const alreadyLocked =
            toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY] === "1";
          if (!alreadyLocked) {
            toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY] = String(!!toggle.checked);
            toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY] = "1";
          }
          // Facture lock takes precedence over tax-lock restore state.
          delete toggle.dataset.taxLockPrevChecked;
          setModelColumnToggleChecked(toggle, false);
          setModelColumnToggleDisabledState(toggle, true);
        });
      };

      if (!allToggles.length) {
        syncModelContextualFodecToggles(normalizedList);
        return normalizedList;
      }

      if (isFaActive) {
        MODEL_DOC_TYPE_PRICE_DEPENDENT_VENTE_TOGGLE_IDS.forEach((id) => {
          const toggle = getModelColumnToggleById(id);
          if (!toggle) return;
          delete toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_FORCED_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_PRICE_DEP_LOCK_DATASET_KEY];
        });

        purchaseToggles.forEach((toggle) => {
          const wasFactureLocked =
            toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY] === "1";
          if (wasFactureLocked) {
            const previousValue = toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY];
            if (previousValue === "true" || previousValue === "false") {
              setModelColumnToggleChecked(toggle, previousValue === "true");
            }
          }
          delete toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY];
        });

        // Apply tax locks first, then force FA column mode.
        if (typeof syncTaxLocks === "function") {
          syncTaxLocks({ scope: "model" });
        }

        enforceFaSalesGridLock();

        purchaseToggles.forEach((toggle) => {
          delete toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY];
          setModelColumnToggleDisabledState(toggle, false);
        });

        // Purchase price is the base purchase column in FA mode.
        syncModelPurchasePriceDependentToggles({ reapplyTaxLocksOnUnlock: true });
        // Keep sales grid locked even after purchase dependency / tax relocking side effects.
        enforceFaSalesGridLock();
      } else if (isFactureActive) {
        // Facture has its own rules; clear FA markers before applying them.
        allToggles.forEach((toggle) => {
          const wasForced = toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY] === "1";
          if (wasForced) {
            const previousValue = toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY];
            if (previousValue === "true" || previousValue === "false") {
              setModelColumnToggleChecked(toggle, previousValue === "true");
            }
          }
          delete toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY];
        });

        // Keep tax-mode locks (without taxes) working independently of doc-type.
        if (typeof syncTaxLocks === "function") {
          syncTaxLocks({ scope: "model" });
        }

        saleToggles.forEach((toggle) => {
          const isTaxDependentSale = MODEL_DOC_TYPE_TAX_DEPENDENT_VENTE_TOGGLE_IDS.has(String(toggle.id || ""));
          // Non-tax sale columns must stay editable in Facture mode.
          if (!isTaxDependentSale) {
            setModelColumnToggleDisabledState(toggle, false);
          }
        });

        enforceFacturePurchaseGridLock();

        // Price is the base sales column: dependent sales columns cannot stay active when it's off.
        syncModelPriceDependentSaleToggles({ reapplyTaxLocksOnUnlock: true });
        // Keep purchase grid locked even after dependency/tax relocking side effects.
        enforceFacturePurchaseGridLock();
      } else {
        purchaseToggles.forEach((toggle) => {
          const wasFactureLocked =
            toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY] === "1";
          setModelColumnToggleDisabledState(toggle, false);
          if (wasFactureLocked) {
            const previousValue = toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY];
            if (previousValue === "true" || previousValue === "false") {
              setModelColumnToggleChecked(toggle, previousValue === "true");
            }
          }
          delete toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_LOCK_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_FACTURE_PURCHASE_PREV_DATASET_KEY];
        });

        allToggles.forEach((toggle) => {
          const wasForced = toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY] === "1";
          setModelColumnToggleDisabledState(toggle, false);
          if (wasForced) {
            const previousValue = toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY];
            if (previousValue === "true" || previousValue === "false") {
              setModelColumnToggleChecked(toggle, previousValue === "true");
            }
          }
          delete toggle.dataset[MODEL_DOC_TYPE_FA_FORCED_DATASET_KEY];
          delete toggle.dataset[MODEL_DOC_TYPE_FA_LOCK_DATASET_KEY];
        });

        if (typeof syncTaxLocks === "function") {
          syncTaxLocks({ scope: "model" });
        }

        syncModelPriceDependentSaleToggles({ reapplyTaxLocksOnUnlock: true });
        syncModelPurchasePriceDependentToggles({ reapplyTaxLocksOnUnlock: true });
      }

      syncModelContextualFodecToggles(normalizedList);
      return normalizedList;
      } finally {
        modelDocTypeFaLockSyncInProgress = false;
      }
    };

    function getDocTypePrefixPlaceholder(value) {
      const normalized = normalizeDocTypeValue(value);
      return DOC_TYPE_PREFIX_DEFAULTS[normalized] || DOC_TYPE_PREFIX_DEFAULTS.facture;
    }

    function updateInvPrefixPlaceholder(nextDocTypeValue, previousDocTypeValue = currentDocTypeValue) {
      if (!invNumberPrefixInput) return;
      if (!numberFormatHasPrefix(getActiveNumberFormat())) return;
      const nextPlaceholder = getDocTypePrefixPlaceholder(nextDocTypeValue);
      const prevPlaceholder = getDocTypePrefixPlaceholder(previousDocTypeValue);
      invNumberPrefixInput.placeholder = nextPlaceholder;
      const currentVal = (invNumberPrefixInput.value || "").trim();
      if (!currentVal || currentVal === prevPlaceholder) {
        invNumberPrefixInput.value = nextPlaceholder;
      }
    }

    const CURRENCY_LABELS = {
      DT: "DT",
      EUR: "EUR",
      USD: "USD"
    };
    const TAX_LABELS = {
      with: "Avec taxe",
      without: "Sans taxe"
    };
    const currencyControls = [
      {
        select: currencySelect,
        menu: currencyMenu,
        panel: currencyPanel,
        display: currencyDisplay,
        toggle: currencyToggle
      },
      {
        select: modelCurrencySelect,
        menu: modelCurrencyMenu,
        panel: modelCurrencyPanel,
        display: modelCurrencyDisplay,
        toggle: modelCurrencyToggle
      }
    ].filter(({ select, menu, panel, display }) => select || menu || panel || display);
    const taxControls = [
      { select: taxSelect, menu: taxMenu, panel: taxPanel, display: taxDisplay, toggle: taxToggle },
      { select: modelTaxSelect, menu: modelTaxMenu, panel: modelTaxPanel, display: modelTaxDisplay, toggle: modelTaxToggle }
    ].filter(({ select, menu, panel, display }) => select || menu || panel || display);
    const refreshTaxUi = () => {
      try {
        SEM.renderItems?.();
        SEM.applyColumnHiding?.();
        SEM.computeTotals?.();
      } catch (err) {
        console.warn("refreshTaxUi", err);
      }
    };

    function normalizeCurrencyValue(value, fallback = "DT") {
      const normalized = String(value || fallback || "DT").toUpperCase();
      return CURRENCY_LABELS[normalized] ? normalized : "DT";
    }

    function getCurrencyLabel(value) {
      const normalized = normalizeCurrencyValue(value);
      return CURRENCY_LABELS[normalized] || CURRENCY_LABELS.DT;
    }

    function normalizeTaxValue(value, fallback = "with") {
      const normalized = String(value || fallback || "with").toLowerCase();
      return TAX_LABELS[normalized] ? normalized : "with";
    }

    function getTaxLabel(value) {
      const normalized = normalizeTaxValue(value);
      return TAX_LABELS[normalized] || TAX_LABELS.with;
    }

    function syncInvNumberLengthUi(value, { updateSelect = false } = {}) {
      const meta = getInvoiceMeta();
      const fallbackLength =
        Number(invNumberLengthSelect?.value) || Number(meta?.numberLength) || 4;
      const normalized = normalizeInvoiceLengthLocal(value, fallbackLength);
      const normalizedStr = String(normalized);
      if (updateSelect && invNumberLengthSelect) {
        invNumberLengthSelect.value = normalizedStr;
      }
      return normalized;
    }

    const resolveNodes = (node, selector) => {
      const nodes = [];
      if (node) nodes.push(node);
      if (selector && typeof document !== "undefined") {
        document.querySelectorAll(selector).forEach((el) => nodes.push(el));
      }
      return nodes.filter((item, idx) => item && nodes.indexOf(item) === idx);
    };

    function syncDocTypeMenuUi(
      value,
      { updateSelect = false, closeMenu = false, forceModelSync = false, allowedDocTypes } = {}
    ) {
      const meta = getInvoiceMeta();
      const fallbackValue = docTypeSelect?.value || meta?.docType || "facture";
      const nextAllowedSet =
        allowedDocTypes !== undefined ? normalizeAllowedDocTypes(allowedDocTypes) : docTypeAllowedSet;
      if (allowedDocTypes !== undefined) {
        docTypeAllowedSet = nextAllowedSet;
      }
      let normalized = normalizeDocTypeValue(value, fallbackValue);
      if (nextAllowedSet && nextAllowedSet.size && !nextAllowedSet.has(normalized)) {
        normalized = nextAllowedSet.values().next().value;
      }
      const prevDocType = currentDocTypeValue ?? normalized;
      const mainLabel = getDocTypeLabel(normalized);
      const shouldUpdateSelects = updateSelect !== false;

      docTypeControls.forEach(({ kind, select, display, panel, menu, toggle }) => {
        const isModel = kind === "model";
        if (isModel) {
          if (!forceModelSync) return;
          syncModelDocTypeMenuUi(value, { updateSelect: shouldUpdateSelects, closeMenu });
          return;
        }
        const nextValue = normalized;
        const selectNodes = isModel
          ? resolveNodes(select)
          : resolveNodes(select, "select#docType");
        const displayNodes = isModel
          ? resolveNodes(display)
          : resolveNodes(display, "#docTypeDisplay");
        const panelNodes = isModel
          ? resolveNodes(panel)
          : resolveNodes(panel, "#docTypePanel");

        selectNodes.forEach((selectEl) => {
          if (!selectEl) return;
          if (shouldUpdateSelects || selectEl !== docTypeSelect) {
            selectEl.value = nextValue;
          }
        });
        displayNodes.forEach((displayEl) => {
          if (!displayEl) return;
          displayEl.textContent = isModel ? getModelDocTypeLabel(nextValue) : mainLabel;
        });
        panelNodes.forEach((panelEl) => {
          if (!panelEl) return;
          panelEl.querySelectorAll("[data-doc-type-option]").forEach((btn) => {
            const isMatch = btn.dataset.docTypeOption === nextValue;
            btn.classList.toggle("is-active", isMatch);
            btn.setAttribute("aria-selected", isMatch ? "true" : "false");
            const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input) {
              input.checked = isMatch;
              input.setAttribute("aria-checked", isMatch ? "true" : "false");
            }
            if (!isModel && nextAllowedSet) {
              const isAllowed = nextAllowedSet.has(btn.dataset.docTypeOption);
              btn.disabled = !isAllowed;
              btn.classList.toggle("is-disabled", !isAllowed);
              btn.setAttribute("aria-disabled", isAllowed ? "false" : "true");
            } else if (!isModel && !nextAllowedSet) {
              btn.disabled = false;
              btn.classList.remove("is-disabled");
              btn.setAttribute("aria-disabled", "false");
            }
          });
        });
        if (!isModel && selectNodes.length && nextAllowedSet) {
          selectNodes.forEach((selectEl) => {
            Array.from(selectEl.options || []).forEach((opt) => {
              if (!opt?.value) return;
              const isAllowed = nextAllowedSet.has(opt.value);
              opt.disabled = !isAllowed;
            });
          });
        } else if (!isModel && selectNodes.length && !nextAllowedSet) {
          selectNodes.forEach((selectEl) => {
            Array.from(selectEl.options || []).forEach((opt) => {
              opt.disabled = false;
            });
          });
        }
        if (closeMenu && menu && menu.open) {
          menu.open = false;
        }
        if (toggle) {
          toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
        }
      });
      updateDocTypeActionLabels(mainLabel);
      updateInvPrefixPlaceholder(normalized, prevDocType);
      SEM.updateNewButtonState?.();
      currentDocTypeValue = normalized;
      return normalized;
    }

    function syncModelDocTypeMenuUi(
      value,
      { updateSelect = true, closeMenu = false, preferredSwitchValue = "" } = {}
    ) {
      const normalizedList = normalizeModelDocTypeSwitchSelection(value, preferredSwitchValue);

      if (modelDocTypeSelect && updateSelect !== false) {
        const allowed = new Set(normalizedList);
        Array.from(modelDocTypeSelect.options || []).forEach((opt) => {
          if (!opt?.value) return;
          opt.selected = allowed.has(String(opt.value || "").toLowerCase());
        });
        if (!normalizedList.length && modelDocTypeSelect.options?.length) {
          modelDocTypeSelect.value = DEFAULT_MODEL_DOC_TYPE;
        }
      }
      if (modelDocTypeDisplay) {
        modelDocTypeDisplay.textContent = getModelDocTypeLabel(normalizedList);
      }
      if (modelDocTypePanel) {
        modelDocTypePanel.querySelectorAll("[data-doc-type-option]").forEach((btn) => {
          const key = String(btn.dataset.docTypeOption || "").toLowerCase();
          const isMatch = normalizedList.includes(key);
          btn.classList.toggle("is-active", isMatch);
          btn.setAttribute("aria-selected", isMatch ? "true" : "false");
          const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) {
            input.checked = isMatch;
            input.setAttribute("aria-checked", isMatch ? "true" : "false");
          }
        });
      }
      if (closeMenu && modelDocTypeMenu && modelDocTypeMenu.open) {
        modelDocTypeMenu.open = false;
      }
      if (modelDocTypeToggle) {
        modelDocTypeToggle.setAttribute("aria-expanded", modelDocTypeMenu?.open ? "true" : "false");
      }
      applyModelDocTypeFaColumnLocks(normalizedList);
      return normalizedList;
    }

    function syncModelCurrencyMenuUi(value, { updateSelect = true, closeMenu = false } = {}) {
      const fallbackValue =
        modelCurrencySelect?.value ||
        modelCurrencyPanel?.querySelector?.("input:checked")?.value ||
        "DT";
      const normalized = normalizeCurrencyValue(value, fallbackValue);
      if (modelCurrencySelect && updateSelect !== false) {
        modelCurrencySelect.value = normalized;
      }
      if (modelCurrencyDisplay) {
        modelCurrencyDisplay.textContent = getCurrencyLabel(normalized);
      }
      if (modelCurrencyPanel) {
        modelCurrencyPanel.querySelectorAll("[data-currency-option]").forEach((btn) => {
          const isMatch = btn.dataset.currencyOption === normalized;
          btn.classList.toggle("is-active", isMatch);
          btn.setAttribute("aria-selected", isMatch ? "true" : "false");
          const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) {
            input.checked = isMatch;
            input.setAttribute("aria-checked", isMatch ? "true" : "false");
          }
        });
      }
      if (closeMenu && modelCurrencyMenu && modelCurrencyMenu.open) {
        modelCurrencyMenu.open = false;
      }
      if (modelCurrencyToggle) {
        modelCurrencyToggle.setAttribute("aria-expanded", modelCurrencyMenu?.open ? "true" : "false");
      }
      return normalized;
    }

    function setDocTypeMenuAllowedDocTypes(list, { enforceSelection = true } = {}) {
      docTypeAllowedSet = normalizeAllowedDocTypes(list);
      const allowedList = docTypeAllowedSet ? Array.from(docTypeAllowedSet) : null;
      if (!enforceSelection) {
        syncDocTypeMenuUi(undefined, { allowedDocTypes: allowedList, updateSelect: true });
        return;
      }
      const preferred =
        docTypeSelect?.value ||
        modelDocTypeSelect?.value ||
        currentDocTypeValue ||
        getInvoiceMeta()?.docType ||
        "facture";
      const normalizedPreferred = normalizeDocTypeValue(preferred, "facture");
      const nextValue =
        docTypeAllowedSet && !docTypeAllowedSet.has(normalizedPreferred) && allowedList?.length
          ? allowedList[0]
          : normalizedPreferred;
      syncDocTypeMenuUi(nextValue, { allowedDocTypes: allowedList, updateSelect: true, forceModelSync: false });
    }

    function syncCurrencyMenuUi(value, { updateSelect = false, closeMenu = false } = {}) {
      const meta = getInvoiceMeta();
      const fallbackValue = currencySelect?.value || modelCurrencySelect?.value || meta?.currency || "DT";
      const normalized = normalizeCurrencyValue(value, fallbackValue);
      const shouldUpdateSelects = updateSelect !== false;
      currencyControls.forEach(({ select, display, panel, menu, toggle }) => {
        if (select && (shouldUpdateSelects || select !== currencySelect)) {
          select.value = normalized;
        }
        if (display) {
          display.textContent = getCurrencyLabel(normalized);
        }
        if (panel) {
          panel.querySelectorAll("[data-currency-option]").forEach((btn) => {
            const isMatch = btn.dataset.currencyOption === normalized;
            btn.classList.toggle("is-active", isMatch);
            btn.setAttribute("aria-selected", isMatch ? "true" : "false");
            const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input) {
              input.checked = isMatch;
              input.setAttribute("aria-checked", isMatch ? "true" : "false");
            }
          });
        }
        if (closeMenu && menu && menu.open) {
          menu.open = false;
        }
        if (toggle) {
          toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
        }
      });
      try {
        window.SEM?.__bindingHelpers?.updateModelPreview?.();
      } catch {}
      return normalized;
    }

    function syncTaxMenuUi(value, { updateSelect = false, closeMenu = false } = {}) {
      const meta = getInvoiceMeta();
      const fallbackValue =
        taxSelect?.value || modelTaxSelect?.value || (meta?.taxesEnabled === false ? "without" : "with");
      const normalized = normalizeTaxValue(value, fallbackValue);
      const shouldUpdateSelects = updateSelect !== false;
      taxControls.forEach(({ select, display, panel, menu, toggle }) => {
        if (select && (shouldUpdateSelects || select !== taxSelect)) {
          select.value = normalized;
        }
        if (display) {
          display.textContent = getTaxLabel(normalized);
        }
        if (panel) {
          panel.querySelectorAll("[data-tax-option]").forEach((btn) => {
            const isMatch = btn.dataset.taxOption === normalized;
            btn.classList.toggle("is-active", isMatch);
            btn.setAttribute("aria-selected", isMatch ? "true" : "false");
            const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input) {
              input.checked = isMatch;
              input.setAttribute("aria-checked", isMatch ? "true" : "false");
            }
          });
        }
        if (closeMenu && menu && menu.open) {
          menu.open = false;
        }
        if (toggle) {
          toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
        }
      });
      return normalized;
    }

    function syncModelTaxMenuUi(value, { updateSelect = true, closeMenu = false } = {}) {
      const fallbackValue =
        modelTaxSelect?.value ||
        modelTaxPanel?.querySelector?.("input:checked")?.value ||
        "with";
      const normalized = normalizeTaxValue(value, fallbackValue);
      if (modelTaxSelect && updateSelect !== false) {
        modelTaxSelect.value = normalized;
      }
      if (modelTaxDisplay) {
        modelTaxDisplay.textContent = getTaxLabel(normalized);
      }
      if (modelTaxPanel) {
        modelTaxPanel.querySelectorAll("[data-tax-option]").forEach((btn) => {
          const isMatch = btn.dataset.taxOption === normalized;
          btn.classList.toggle("is-active", isMatch);
          btn.setAttribute("aria-selected", isMatch ? "true" : "false");
          const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) {
            input.checked = isMatch;
            input.setAttribute("aria-checked", isMatch ? "true" : "false");
          }
        });
      }
      if (closeMenu && modelTaxMenu && modelTaxMenu.open) {
        modelTaxMenu.open = false;
      }
      if (modelTaxToggle) {
        modelTaxToggle.setAttribute("aria-expanded", modelTaxMenu?.open ? "true" : "false");
      }
      const syncTaxLocks = w.SEM?.__bindingHelpers?.syncTaxModeDependentColumnToggles;
      if (typeof syncTaxLocks === "function") {
        syncTaxLocks({ scope: "model" });
      }
      applyModelDocTypeFaColumnLocks(getSelectedModelDocTypes());
      return normalized;
    }

    function syncModelNumberFormatUi(value, { updateSelect = true } = {}) {
      const meta = getInvoiceMeta();
      const fallbackValue =
        modelNumberFormatSelect?.value ||
        modelNumberFormatPanel?.querySelector?.("input:checked")?.value ||
        meta?.numberFormat ||
        NUMBER_FORMAT_DEFAULT;
      const normalized = normalizeNumberFormatLocal(value, fallbackValue);
      if (modelNumberFormatSelect && updateSelect !== false) {
        modelNumberFormatSelect.value = normalized;
      }
      if (modelNumberFormatPanel) {
        modelNumberFormatPanel.querySelectorAll("[data-number-format-option]").forEach((btn) => {
          const isMatch = btn.dataset.numberFormatOption === normalized;
          btn.classList.toggle("is-active", isMatch);
          btn.setAttribute("aria-selected", isMatch ? "true" : "false");
          const input = btn.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) {
            input.checked = isMatch;
            input.setAttribute("aria-checked", isMatch ? "true" : "false");
          }
        });
      }
      return normalized;
    }

    if (typeof w === "object") {
      w.syncInvNumberLengthUi = syncInvNumberLengthUi;
      w.syncDocTypeMenuUi = syncDocTypeMenuUi;
      w.syncModelDocTypeMenuUi = syncModelDocTypeMenuUi;
      w.syncModelCurrencyMenuUi = syncModelCurrencyMenuUi;
      w.syncModelTaxMenuUi = syncModelTaxMenuUi;
      w.syncModelNumberFormatUi = syncModelNumberFormatUi;
      w.syncInvoiceNumberControls = syncInvoiceNumberControls;
      w.setDocTypeMenuAllowedDocTypes = setDocTypeMenuAllowedDocTypes;
      w.syncCurrencyMenuUi = syncCurrencyMenuUi;
      w.syncTaxMenuUi = syncTaxMenuUi;
      w.applyModelDocTypeFaColumnLocks = applyModelDocTypeFaColumnLocks;
    }

    syncInvNumberLengthUi(invNumberLengthSelect?.value || getInvoiceMeta()?.numberLength || 4);
    const initialDocType = docTypeSelect?.value || getInvoiceMeta()?.docType || "facture";
    currentDocTypeValue = normalizeDocTypeValue(initialDocType);
    syncDocTypeMenuUi(currentDocTypeValue, { updateSelect: true });
    const initialCurrency =
      currencySelect?.value || modelCurrencySelect?.value || getInvoiceMeta()?.currency || "DT";
    syncCurrencyMenuUi(initialCurrency, { updateSelect: true });
    const initialTaxMode =
      taxSelect?.value ||
      modelTaxSelect?.value ||
      (getInvoiceMeta()?.taxesEnabled === false ? "without" : "with");
    syncTaxMenuUi(initialTaxMode, { updateSelect: true });
    const initialNumberFormat =
      modelNumberFormatSelect?.value ||
      modelNumberFormatPanel?.querySelector?.("input:checked")?.value ||
      getInvoiceMeta()?.numberFormat ||
      NUMBER_FORMAT_DEFAULT;
    syncModelNumberFormatUi(initialNumberFormat, { updateSelect: true });

    docTypeMenu?.addEventListener("toggle", () => {
      if (!docTypeToggle) return;
      docTypeToggle.setAttribute("aria-expanded", docTypeMenu.open ? "true" : "false");
    });
    modelDocTypeMenu?.addEventListener("toggle", () => {
      if (!modelDocTypeToggle) return;
      modelDocTypeToggle.setAttribute("aria-expanded", modelDocTypeMenu.open ? "true" : "false");
    });

    docTypePanel?.addEventListener("click", (evt) => {
      const optionBtn = evt.target.closest("[data-doc-type-option]");
      if (!optionBtn || optionBtn.disabled) return;
      evt.preventDefault();
      const rawValue = optionBtn.dataset.docTypeOption;
      if (!rawValue) return;
      const previousValue = docTypeSelect ? String(docTypeSelect.value || "").toLowerCase() : null;
      const normalized = syncDocTypeMenuUi(rawValue, { updateSelect: true, closeMenu: true });
      if (docTypeSelect) {
        if (previousValue !== normalized) {
          docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncInvoiceNumberControls({ force: true });
        }
      }
      docTypeToggle?.focus();
    });
    const applyModelDocTypeSelection = (focusTarget) => {
      let selected = getSelectedModelDocTypes();
      const preferredSwitchValue =
        focusTarget && focusTarget.checked
          ? String(focusTarget.value || "").trim().toLowerCase()
          : "";
      if (!selected.length) {
        const fallbackValue =
          String(focusTarget?.value || "").trim().toLowerCase() === MODEL_DOC_TYPE_SWITCH_FA
            ? MODEL_DOC_TYPE_SWITCH_FACTURE
            : DEFAULT_MODEL_DOC_TYPE;
        selected = [fallbackValue];
        if (focusTarget) {
          focusTarget.checked = false;
          focusTarget.setAttribute("aria-checked", "false");
        }
      }
      syncModelDocTypeMenuUi(selected, {
        updateSelect: true,
        closeMenu: true,
        preferredSwitchValue
      });
      focusTarget?.focus();
    };
    const enforceModelFaToggleGuard = (input) => {
      if (!input) return;
      const id = String(input.id || "");
      if (!MODEL_DOC_TYPE_FA_TRACKED_TOGGLE_IDS.has(id)) return;
      applyModelDocTypeFaColumnLocks(getSelectedModelDocTypes());
    };

    modelDocTypePanel?.addEventListener("change", (evt) => {
      const checkbox = evt.target.closest('input[type="checkbox"][name="modelDocTypeChoice"]');
      if (!checkbox) return;
      applyModelDocTypeSelection(checkbox);
    });
    modelActionsModal?.addEventListener("change", (evt) => {
      const input = evt.target?.closest?.("input.col-toggle[data-column-key]");
      if (!input) return;
      enforceModelFaToggleGuard(input);
    });

    docTypeSelect?.addEventListener("change", (evt) => {
      syncDocTypeMenuUi(evt?.target?.value, { updateSelect: true });
      syncInvoiceNumberControls({ force: true });
    });
    modelDocTypeSelect?.addEventListener("change", (evt) => {
      const selectedValues = Array.from(evt?.target?.selectedOptions || [])
        .map((opt) => String(opt.value || "").trim().toLowerCase())
        .filter(Boolean);
      syncModelDocTypeMenuUi(selectedValues, { updateSelect: true });
    });

    currencyMenu?.addEventListener("toggle", () => {
      if (!currencyToggle) return;
      currencyToggle.setAttribute("aria-expanded", currencyMenu.open ? "true" : "false");
    });
    modelCurrencyMenu?.addEventListener("toggle", () => {
      if (!modelCurrencyToggle) return;
      modelCurrencyToggle.setAttribute("aria-expanded", modelCurrencyMenu.open ? "true" : "false");
    });

    currencyPanel?.addEventListener("click", (evt) => {
      const optionBtn = evt.target.closest("[data-currency-option]");
      if (!optionBtn) return;
      evt.preventDefault();
      const rawValue = optionBtn.dataset.currencyOption;
      if (!rawValue) return;
      const previousValue = currencySelect ? String(currencySelect.value || "").toUpperCase() : null;
      const normalized = syncCurrencyMenuUi(rawValue, { updateSelect: true, closeMenu: true });
      if (currencySelect) {
        if (previousValue !== normalized) {
          currencySelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      currencyToggle?.focus();
    });
    const applyModelCurrencySelection = (rawValue, focusTarget) => {
      if (!rawValue) return;
      syncModelCurrencyMenuUi(rawValue, { updateSelect: true, closeMenu: true });
      focusTarget?.querySelector?.("input")?.focus();
    };
    modelCurrencyPanel?.addEventListener("click", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelCurrencyChoice"]');
      if (radio) return;
      const optionBtn = evt.target.closest("[data-currency-option]");
      if (!optionBtn) return;
      evt.preventDefault();
      applyModelCurrencySelection(optionBtn.dataset.currencyOption, optionBtn);
    });
    modelCurrencyPanel?.addEventListener("change", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelCurrencyChoice"]');
      if (!radio) return;
      applyModelCurrencySelection(radio.value);
    });

    currencySelect?.addEventListener("change", (evt) => {
      syncCurrencyMenuUi(evt?.target?.value, { updateSelect: true });
    });
    modelCurrencySelect?.addEventListener("change", (evt) => {
      syncModelCurrencyMenuUi(evt?.target?.value, { updateSelect: true });
    });

    taxMenu?.addEventListener("toggle", () => {
      if (!taxToggle) return;
      taxToggle.setAttribute("aria-expanded", taxMenu.open ? "true" : "false");
    });
    modelTaxMenu?.addEventListener("toggle", () => {
      if (!modelTaxToggle) return;
      modelTaxToggle.setAttribute("aria-expanded", modelTaxMenu.open ? "true" : "false");
    });

    taxPanel?.addEventListener("click", (evt) => {
      const optionBtn = evt.target.closest("[data-tax-option]");
      if (!optionBtn) return;
      evt.preventDefault();
      const rawValue = optionBtn.dataset.taxOption;
      if (!rawValue) return;
      const previousValue = taxSelect ? String(taxSelect.value || "").toLowerCase() : null;
      const normalized = syncTaxMenuUi(rawValue, { updateSelect: true, closeMenu: true });
      if (taxSelect) {
        if (previousValue !== normalized) {
          taxSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          refreshTaxUi();
        }
      } else {
        const meta = getInvoiceMeta();
        meta.taxesEnabled = normalized !== "without";
        refreshTaxUi();
      }
      taxToggle?.focus();
    });
    const applyModelTaxSelection = (rawValue, focusTarget) => {
      if (!rawValue) return;
      syncModelTaxMenuUi(rawValue, { updateSelect: true, closeMenu: true });
      focusTarget?.querySelector?.("input")?.focus();
    };
    modelTaxPanel?.addEventListener("click", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelTaxModeChoice"]');
      if (radio) return;
      const optionBtn = evt.target.closest("[data-tax-option]");
      if (!optionBtn) return;
      evt.preventDefault();
      applyModelTaxSelection(optionBtn.dataset.taxOption, optionBtn);
    });
    modelTaxPanel?.addEventListener("change", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelTaxModeChoice"]');
      if (!radio) return;
      applyModelTaxSelection(radio.value);
    });

    const applyModelNumberFormatSelection = (rawValue, focusTarget) => {
      if (!rawValue) return;
      const normalized = syncModelNumberFormatUi(rawValue, { updateSelect: true });
      const meta = getInvoiceMeta();
      if (meta) meta.numberFormat = normalized;
      if (typeof w.syncInvoiceNumberControls === "function") {
        w.syncInvoiceNumberControls({ force: true, overrideWithNext: true });
      }
      w.SEM?.__bindingHelpers?.updateModelPreview?.();
      focusTarget?.querySelector?.("input")?.focus();
    };
    modelNumberFormatPanel?.addEventListener("click", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelNumberFormatChoice"]');
      if (radio) return;
      const optionBtn = evt.target.closest("[data-number-format-option]");
      if (!optionBtn) return;
      evt.preventDefault();
      applyModelNumberFormatSelection(optionBtn.dataset.numberFormatOption, optionBtn);
    });
    modelNumberFormatPanel?.addEventListener("change", (evt) => {
      const radio = evt.target.closest('input[type="radio"][name="modelNumberFormatChoice"]');
      if (!radio) return;
      applyModelNumberFormatSelection(radio.value);
    });

    taxSelect?.addEventListener("change", (evt) => {
      syncTaxMenuUi(evt?.target?.value, { updateSelect: true });
      refreshTaxUi();
    });
    modelTaxSelect?.addEventListener("change", (evt) => {
      syncModelTaxMenuUi(evt?.target?.value, { updateSelect: true });
    });
    modelNumberFormatSelect?.addEventListener("change", (evt) => {
      const normalized = syncModelNumberFormatUi(evt?.target?.value, { updateSelect: true });
      const meta = getInvoiceMeta();
      if (meta) meta.numberFormat = normalized;
      if (typeof w.syncInvoiceNumberControls === "function") {
        w.syncInvoiceNumberControls({ force: true, overrideWithNext: true });
      }
      w.SEM?.__bindingHelpers?.updateModelPreview?.();
    });

    function handleOutsideClick(evt) {
      if (docTypeMenu?.open && !docTypeMenu.contains(evt.target)) {
        docTypeMenu.open = false;
        docTypeToggle?.setAttribute("aria-expanded", "false");
      }
      if (modelDocTypeMenu?.open && !modelDocTypeMenu.contains(evt.target)) {
        modelDocTypeMenu.open = false;
        modelDocTypeToggle?.setAttribute("aria-expanded", "false");
      }
      if (currencyMenu?.open && !currencyMenu.contains(evt.target)) {
        currencyMenu.open = false;
        currencyToggle?.setAttribute("aria-expanded", "false");
      }
      if (modelCurrencyMenu?.open && !modelCurrencyMenu.contains(evt.target)) {
        modelCurrencyMenu.open = false;
        modelCurrencyToggle?.setAttribute("aria-expanded", "false");
      }
      if (taxMenu?.open && !taxMenu.contains(evt.target)) {
        taxMenu.open = false;
        taxToggle?.setAttribute("aria-expanded", "false");
      }
      if (modelTaxMenu?.open && !modelTaxMenu.contains(evt.target)) {
        modelTaxMenu.open = false;
        modelTaxToggle?.setAttribute("aria-expanded", "false");
      }
    }
    document.addEventListener("click", handleOutsideClick);

    const LOCAL_NUMBERING_YEAR_DEFAULT = "__default";

    function extractYearDigits(value) {
      if (value === undefined || value === null) return null;
      const str = String(value).trim();
      if (!str) return null;
      const match = str.match(/(\d{4})/);
      if (!match) return null;
      const num = Number(match[1]);
      if (!Number.isFinite(num) || num < 1900 || num > 9999) return null;
      return match[1];
    }

    function getInvoiceYear() {
      const inputYear = extractYearDigits(invDateInput?.value);
      if (inputYear) return inputYear;
      const meta = getInvoiceMeta();
      const metaYear = extractYearDigits(meta.date);
      if (metaYear) return metaYear;
      const now = new Date();
      const nowYear = Number.isFinite(now.getFullYear()) ? now.getFullYear() : null;
      return Number.isFinite(nowYear) ? String(nowYear) : null;
    }

    // Keep local numbering state global per doc type so counters don't reset each year.
    function makeNumberingStateKey(docType) {
      const base = String(docType || "facture").toLowerCase();
      return `${base}::${LOCAL_NUMBERING_YEAR_DEFAULT}`;
    }

    const pendingNumberingState = (SEM.__pendingNumbering = SEM.__pendingNumbering || {});

    function integerOrNull(value) {
      const match = String(value ?? "").match(/(\d+)\s*$/);
      if (!match) return null;
      const num = Number(match[1]);
      return Number.isFinite(num) && num > 0 ? num : null;
    }

    function getPendingSlot(docType, length, year, create = false) {
      const key = makeNumberingStateKey(docType, year);
      const lenKey = String(length);
      let bucket = pendingNumberingState[key];
      if (!bucket) {
        if (!create) return null;
        bucket = pendingNumberingState[key] = {};
      }
      let slot = bucket[lenKey];
      if (!slot || typeof slot !== "object") {
        if (!create) return null;
        slot = {};
        bucket[lenKey] = slot;
      }
      if (slot.value && typeof slot.value !== "string") slot.value = String(slot.value);
      if (slot.numeric !== undefined) {
        const numeric = Number(slot.numeric);
        if (Number.isFinite(numeric) && numeric > 0) slot.numeric = numeric;
        else delete slot.numeric;
      }
      return slot;
    }

    function getPendingNumberLocal(docType, length, year) {
      const slot = getPendingSlot(docType, length, year, false);
      return slot?.value || null;
    }

    function setPendingNumberLocal(docType, length, formattedValue, numericValue, year) {
      if (!formattedValue) return;
      const slot = getPendingSlot(docType, length, year, true);
      slot.value = String(formattedValue);
      const numeric = Number.isFinite(numericValue) ? numericValue : integerOrNull(formattedValue);
      if (Number.isFinite(numeric) && numeric > 0) {
        slot.numeric = numeric;
      } else {
        delete slot.numeric;
      }
    }

    function clearPendingNumberLocal(docType, length, year) {
      const key = makeNumberingStateKey(docType, year);
      const lenKey = String(length);
      const bucket = pendingNumberingState[key];
      if (bucket) {
        delete bucket[lenKey];
        if (Object.keys(bucket).length === 0) delete pendingNumberingState[key];
      }
    }

    function getDocTypePrefixForValue(docTypeValue) {
      const normalized = String(docTypeValue || "").toLowerCase();
      if (DOC_TYPE_PREFIX_DEFAULTS[normalized]) return DOC_TYPE_PREFIX_DEFAULTS[normalized];
      if (docTypeValue && /^[a-z]/i.test(docTypeValue)) {
        return docTypeValue.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "DOC";
      }
      return "DOC";
    }

    function isManualNumberDocType(docTypeValue) {
      return String(docTypeValue || "").toLowerCase() === "fa";
    }

    function getDatePartsForNumber(dateValue, fallbackDate) {
      const parsedDateRaw = dateValue ? new Date(dateValue) : fallbackDate ? new Date(fallbackDate) : new Date();
      const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
      const year = String(parsedDate.getFullYear());
      const monthNum = parsedDate.getMonth() + 1;
      return { shortYear: year.slice(-2), month: String(monthNum).padStart(2, "0") };
    }

    function formatWithLength(value, length, { prefixOverride } = {}) {
      const meta = getInvoiceMeta();
      const docTypeValue = (docTypeSelect?.value || meta.docType || "facture").toLowerCase();
      const dateValue = invDateInput?.value || meta.date;
      const numberFormat = getActiveNumberFormat();
      const prefix =
        (prefixOverride !== undefined && prefixOverride !== null && String(prefixOverride).trim()) ||
        getDocTypePrefixForValue(docTypeValue);
      if (typeof formatInvoiceNumber === "function") {
        return formatInvoiceNumber(value, length, {
          docType: docTypeValue,
          date: dateValue,
          meta,
          prefixOverride: numberFormatHasPrefix(numberFormat) ? prefix : ""
        });
      }
        const digits = String(value ?? "").replace(/\D+/g, "");
        const trimmed = digits.length > length ? digits.slice(-length) : digits;
        const counter = trimmed || "1";
        if (!numberFormatHasDate(numberFormat)) {
          if (!numberFormatHasPrefix(numberFormat)) return counter;
          return `${prefix}_${counter}`;
        }
      const { shortYear, month } = getDatePartsForNumber(dateValue, meta.date);
      return `${prefix}_${shortYear}-${month}-${counter}`;
    }

    const previewState = { requestId: 0, pendingKey: "" };
    const buildPreviewKey = (docType, length, dateValue, prefixOverride, numberFormat) =>
      `${docType || ""}|${length || ""}|${dateValue || ""}|${prefixOverride || ""}|${numberFormat || ""}`;

    function applyPreviewNumber(formatted, { docTypeValue, length, prefixToUse } = {}) {
      const meta = getInvoiceMeta();
      const safeFormatted = String(formatted || "").trim();
      const numberFormat = getActiveNumberFormat();
      if (!safeFormatted) return;
      meta.number = safeFormatted;
      meta.previewNumber = safeFormatted;
      if (numberFormatHasPrefix(numberFormat) && prefixToUse) meta.numberPrefix = prefixToUse;
      if (invNumberInput && invNumberInput.value !== safeFormatted) {
        invNumberInput.value = safeFormatted;
      }
      if (invNumberSuffixInput) {
        const suffixVal = integerOrNull(safeFormatted);
        let suffixStr = suffixVal !== null ? String(suffixVal) : "";
        if (invNumberSuffixInput.value !== suffixStr) {
          invNumberSuffixInput.value = suffixStr;
        }
      }
      if (numberFormatHasPrefix(numberFormat) && invNumberPrefixInput && !invNumberPrefixInput.value.trim()) {
        const prefixFromFormatted = safeFormatted.match(/^([^_-]+)/)?.[1] || "";
        invNumberPrefixInput.value =
          prefixToUse || prefixFromFormatted || getDocTypePrefixForValue(docTypeValue);
      }
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    }

    function requestPreviewNumber({ docTypeValue, length, dateValue, prefixToUse } = {}) {
      if (typeof w.electronAPI?.previewDocumentNumber !== "function") return;
      const numberFormat = getActiveNumberFormat();
      const key = buildPreviewKey(docTypeValue, length, dateValue, prefixToUse, numberFormat);
      previewState.pendingKey = key;
      const requestId = ++previewState.requestId;
      w.electronAPI
        .previewDocumentNumber({
          docType: docTypeValue,
          date: dateValue,
          numberLength: length,
          prefix: prefixToUse,
          numberFormat
        })
        .then((res) => {
          if (previewState.requestId !== requestId) return;
          if (previewState.pendingKey !== key) return;
          if (!res?.ok || !res.number) return;
          applyPreviewNumber(res.number, { docTypeValue, length, prefixToUse: res.prefix || prefixToUse });
        })
        .catch(() => {});
    }
    SEM.requestDocumentNumberPreview = requestPreviewNumber;

    function syncInvoiceNumberControls({
      force = false,
      useNextIfEmpty = false,
      advanceSequence = false,
      overrideWithNext = false
    } = {}) {
      if (!invNumberInput && !invNumberLengthSelect && !invNumberPrefixInput && !invNumberSuffixInput) return;
      const meta = getInvoiceMeta();
      const docTypeValue = (getEl("docType")?.value || meta.docType || "facture").toLowerCase();
      meta.docType = docTypeValue;
      meta.numberFormat = normalizeNumberFormatLocal(meta.numberFormat, NUMBER_FORMAT_DEFAULT);
      const numberFormat = getActiveNumberFormat();
      const numberField =
        invNumberPrefixInput?.closest?.(".inv-number-field") ||
        invNumberSuffixInput?.closest?.(".inv-number-field") ||
        invNumberInput?.closest?.(".inv-number-field");
      if (numberField?.dataset) {
        numberField.dataset.numberFormat = numberFormat;
      }
      if (invNumberPrefixInput) {
        const hidePrefix = numberFormat === "counter";
        invNumberPrefixInput.hidden = hidePrefix;
        invNumberPrefixInput.setAttribute("aria-hidden", hidePrefix ? "true" : "false");
      }
      if (invNumberDatePartInput) {
        const hideDate = numberFormat !== "prefix_date_counter";
        invNumberDatePartInput.hidden = hideDate;
        invNumberDatePartInput.setAttribute("aria-hidden", hideDate ? "true" : "false");
      }
      if (isManualNumberDocType(docTypeValue)) {
        const inputValue = invNumberInput ? String(invNumberInput.value || "") : "";
        const metaValue = meta.number ?? "";
        const resolved = inputValue.trim() ? inputValue.trim() : String(metaValue || "").trim();
        if (invNumberInput && invNumberInput.value !== resolved) invNumberInput.value = resolved;
        if (meta.number !== resolved) meta.number = resolved;
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }
      const suffixLength = String(meta.number || "").match(/(\d+)\s*$/)?.[1]?.length;
      const requestedLength =
        invNumberLengthSelect?.value ?? meta.numberLength ?? suffixLength ?? 4;
      const length = normalizeInvoiceLengthLocal(requestedLength, meta.numberLength || 4);
      if (meta.numberLength !== length) meta.numberLength = length;
      if (invNumberLengthSelect && invNumberLengthSelect.value !== String(length)) {
        invNumberLengthSelect.value = String(length);
      }
      syncInvNumberLengthUi(length, { updateSelect: false });
      const previousYear = typeof meta.numberYear === "undefined" ? null : meta.numberYear;
      const invoiceYear = getInvoiceYear();
      const activeYear = invoiceYear || null;
      if (previousYear !== activeYear) {
        clearPendingNumberLocal(docTypeValue, length, previousYear);
      }
      meta.numberYear = activeYear;

      const dateParts = getDatePartsForNumber(invDateInput?.value || meta.date, meta.date);
      if (invNumberDatePartInput) {
        const dateSegment = numberFormatHasDate(numberFormat)
          ? `_${dateParts.shortYear}-${dateParts.month}-`
          : "";
        if (invNumberDatePartInput.value !== dateSegment) invNumberDatePartInput.value = dateSegment;
      }

      const prefixRaw = (invNumberPrefixInput?.value ?? "").trim();
      const prefixToUse = numberFormatHasPrefix(numberFormat)
        ? (prefixRaw || getDocTypePrefixForValue(docTypeValue))
        : "";
      meta.numberPrefix = numberFormatHasPrefix(numberFormat) ? prefixToUse : "";
      const suffixFromField = integerOrNull(invNumberSuffixInput?.value);
      const currentSuffix = suffixFromField !== null ? suffixFromField : integerOrNull(meta.number);

      if (overrideWithNext) {
        requestPreviewNumber({
          docTypeValue,
          length,
          dateValue: invDateInput?.value || meta.date,
          prefixToUse
        });
        return;
      }

      const shouldAdvance = advanceSequence && currentSuffix !== null;
      const trimmedHidden = String(invNumberInput?.value ?? meta.number ?? "").trim();
      const hasExistingValue = !!trimmedHidden;

      if (shouldAdvance || (useNextIfEmpty && (!hasExistingValue || currentSuffix === null))) {
        requestPreviewNumber({
          docTypeValue,
          length,
          dateValue: invDateInput?.value || meta.date,
          prefixToUse
        });
        return;
      }

      const baseValue = currentSuffix !== null ? currentSuffix : trimmedHidden;
      if (!baseValue) return;
      const formatted = formatWithLength(baseValue, length, { prefixOverride: prefixToUse });
      if (invNumberInput && invNumberInput.value !== formatted) invNumberInput.value = formatted;
      meta.number = formatted;
      meta.previewNumber = formatted;
      if (numberFormatHasPrefix(numberFormat) && invNumberPrefixInput && !invNumberPrefixInput.value.trim()) {
        invNumberPrefixInput.value = prefixToUse;
      }
      if (invNumberSuffixInput) {
        const suffixVal = integerOrNull(formatted);
        let suffixStr = suffixVal !== null ? String(suffixVal) : "";
        if (invNumberSuffixInput.value !== suffixStr) invNumberSuffixInput.value = suffixStr;
      }

      const pendingCurrent = getPendingNumberLocal(docTypeValue, length, activeYear);
      if (pendingCurrent && meta.number && meta.number !== pendingCurrent) {
        clearPendingNumberLocal(docTypeValue, length, activeYear);
      }

      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    }

    invNumberLengthSelect?.addEventListener("change", (e) => {
      const meta = getInvoiceMeta();
      const targetValue = e?.target?.value;
      syncInvNumberLengthUi(targetValue, { updateSelect: false });
      meta.numberLength = normalizeInvoiceLengthLocal(targetValue, meta.numberLength || 4);
      syncInvoiceNumberControls({ force: true, overrideWithNext: true });
    });

    invNumberPrefixInput?.addEventListener("input", () => {
      syncInvoiceNumberControls({ force: true, overrideWithNext: true });
    });

    invNumberSuffixInput?.addEventListener("input", () => {
      const meta = getInvoiceMeta();
      const activeLength = normalizeInvoiceLengthLocal(
        invNumberLengthSelect?.value || meta.numberLength || 4,
        meta.numberLength || 4
      );
        const cleaned = String(invNumberSuffixInput.value || "").replace(/\D+/g, "").slice(-activeLength);
        invNumberSuffixInput.value = cleaned;
        syncInvoiceNumberControls({ force: true });
      });

    invNumberSuffixInput?.addEventListener("blur", () => {
      syncInvoiceNumberControls({ force: true });
    });

    invNumberInput?.addEventListener("input", () => {
      const meta = getInvoiceMeta();
      const docTypeValue = (docTypeSelect?.value || meta.docType || "facture").toLowerCase();
      if (!isManualNumberDocType(docTypeValue)) return;
      meta.number = String(invNumberInput.value || "").trim();
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    });

    invDateInput?.addEventListener("input", () => {
      const meta = getInvoiceMeta();
      meta.date = invDateInput.value || "";
      syncInvoiceNumberControls({ force: true, overrideWithNext: true });
    });

    invDateInput?.addEventListener("change", () => {
      const meta = getInvoiceMeta();
      meta.date = invDateInput.value || "";
      syncInvoiceNumberControls({ force: true, useNextIfEmpty: true, overrideWithNext: true });
    });


    return {
      getInvoiceMeta,
      normalizeInvoiceLength: normalizeInvoiceLengthLocal,
      extractYearDigits,
      getInvoiceYear,
      syncInvoiceNumberControls,
      requestPreviewNumber,
      clearPendingNumberLocal,
      integerOrNull,
      syncInvNumberLengthUi,
      syncDocTypeMenuUi,
      syncCurrencyMenuUi,
      elements: {
        invNumberInput,
        invNumberPrefixInput,
        invNumberDatePartInput,
        invNumberSuffixInput,
        invNumberLengthSelect,
        invDateInput
      }
    };
  };
})(window);
