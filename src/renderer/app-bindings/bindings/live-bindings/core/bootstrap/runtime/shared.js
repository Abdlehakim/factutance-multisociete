(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("shared", function (ctx) {
          helpers = ctx.helpers || (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
          state = ctx.state || (() => SEM.state);
          getMessage =
            ctx.getMessage ||
            ((key, options = {}) =>
              (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
                text: options?.fallbackText || key || "",
                title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
              });
          bindingShared = ctx.bindingShared || SEM.__bindingShared || {};
          formatSoldClientValue =
            ctx.formatSoldClientValue ||
            bindingShared.formatSoldClientValue ||
            ((value) => {
              const cleaned = String(value ?? "").replace(",", ".").trim();
              if (!cleaned) return "";
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return String(value ?? "").trim();
              return num.toFixed(3);
            });
          refreshClientSummary =
            ctx.refreshClientSummary || bindingShared.refreshClientSummary || (() => {});
          refreshInvoiceSummary =
            ctx.refreshInvoiceSummary || bindingShared.refreshInvoiceSummary || (() => {});
          setWhNoteEditorContent =
            ctx.setWhNoteEditorContent || bindingShared.setWhNoteEditorContent || (() => {});
          runGlobalBootstrapGuards =
            ctx.runGlobalBootstrapGuards ||
            (() => {
              if (SEM.wireItemsHeaderColorPicker) {
                SEM.wireItemsHeaderColorPicker();
              }
              if (SEM.wireModelItemsHeaderColorPicker) {
                SEM.wireModelItemsHeaderColorPicker();
              }
            });
          runGlobalBootstrapGuards();
          sanitizeModelName =
            helpers.sanitizeModelName ||
            ((value) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80));
          ensureModelCache = helpers.ensureModelCache || (async () => []);
          getModelList = helpers.getModelList || (() => []);
          mergeItemIntoState = helpers.mergeItemIntoState || (() => -1);
          sanitizeClientSnapshot = helpers.sanitizeClientSnapshot || ((snapshot) => snapshot);

          MAIN_CLIENT_SCOPE_ID = "clientBoxMainscreenClientsPanel";
          MAIN_VENDOR_SCOPE_ID = "clientBoxMainscreenFournisseursPanel";
          MAIN_CLIENT_SCOPE_SELECTOR = `#${MAIN_CLIENT_SCOPE_ID}`;
          MAIN_VENDOR_SCOPE_SELECTOR = `#${MAIN_VENDOR_SCOPE_ID}`;
          MAIN_SCOPE_SELECTOR = `${MAIN_CLIENT_SCOPE_SELECTOR}, ${MAIN_VENDOR_SCOPE_SELECTOR}`;
          clientSearchInput = getEl("clientSearch");
          clientSearchResults = getEl("clientSearchResults");
          CLIENT_SEARCH_PAGE_SIZE = 3;
          MIN_CLIENT_SEARCH_LENGTH = 2;
          clientSearchTimer = null;
          clientSearchData = [];
          clientSearchPage = 1;
          CLIENT_SCOPE_SELECTOR = "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientFormPopover, #fournisseurFormPopover";
          CLIENT_SCOPE_WITH_ROOT_SELECTOR = `${CLIENT_SCOPE_SELECTOR}, #clientBoxMainscreen`;
          resolveClientEntityType = (scopeNode) =>
            scopeNode &&
            (scopeNode.dataset?.clientEntityType === "vendor" ||
              scopeNode.id === "FournisseurBoxNewDoc" ||
              scopeNode.id === "fournisseurSavedModal" ||
              scopeNode.id === "fournisseurSavedModalNv" ||
              scopeNode.id === "fournisseurFormPopover" ||
              scopeNode.id === MAIN_VENDOR_SCOPE_ID)
              ? "vendor"
              : "client";
          CLIENT_FORM_VENDOR_ID_ALIASES = {
            clientType: "fournisseurType",
            clientTypeLabel: "fournisseurTypeLabel",
            clientTypeMenu: "fournisseurTypeMenu",
            clientTypeDisplay: "fournisseurTypeDisplay",
            clientTypePanel: "fournisseurTypePanel",
            clientName: "fournisseurName",
            clientBeneficiary: "fournisseurBeneficiary",
            clientAccount: "fournisseurAccount",
            clientSoldClient: "fournisseurSoldClient",
            clientVat: "fournisseurVat",
            clientStegRef: "fournisseurStegRef",
            clientPhone: "fournisseurPhone",
            clientEmail: "fournisseurEmail",
            clientAddress: "fournisseurAddress",
            clientIdLabel: "fournisseurIdLabel",
            btnSaveClient: "btnSaveFournisseur",
            btnUpdateClient: "btnUpdateFournisseur",
            btnNewClient: "btnNewFournisseur"
          };
          CLIENT_FORM_VENDOR_ID_REVERSE = Object.entries(CLIENT_FORM_VENDOR_ID_ALIASES).reduce(
            (acc, [clientId, vendorId]) => {
              if (vendorId) acc[vendorId] = clientId;
              return acc;
            },
            {}
          );
          uniqClientFormIds = (ids = []) => Array.from(new Set(ids.filter(Boolean)));
          toCanonicalClientFormId = (id) => CLIENT_FORM_VENDOR_ID_REVERSE[id] || id;
          resolveClientFormIdCandidates = (id, scopeNode = null) => {
            const canonicalId = toCanonicalClientFormId(id);
            const vendorId = CLIENT_FORM_VENDOR_ID_ALIASES[canonicalId] || "";
            if (scopeNode && resolveClientEntityType(scopeNode) === "vendor") {
              return uniqClientFormIds([vendorId, canonicalId]);
            }
            return uniqClientFormIds([canonicalId, vendorId]);
          };
          queryScopedClientFormElement = (scopeNode, id) => {
            if (!scopeNode || typeof scopeNode.querySelector !== "function") return null;
            const ids = resolveClientFormIdCandidates(id, scopeNode);
            for (const candidate of ids) {
              const match = scopeNode.querySelector(`#${candidate}`);
              if (match) return match;
            }
            return null;
          };
          queryGlobalClientFormElement = (id, scopeNode = null) => {
            const ids = resolveClientFormIdCandidates(id, scopeNode);
            for (const candidate of ids) {
              const match = getEl(candidate);
              if (match) return match;
            }
            return null;
          };
          resolveClientScopeFromNode = (node) =>
            node && typeof node.closest === "function" ? node.closest(CLIENT_SCOPE_SELECTOR) : null;
          resolveClientSearchScope = (inputEl, resultsEl) =>
            resolveClientScopeFromNode(inputEl) || resolveClientScopeFromNode(resultsEl);
          getActiveMainClientScope = () => {
            const mainScope = document.getElementById("clientBoxMainscreen");
            if (!mainScope) return null;
            const activePanel = mainScope.querySelector(
              `${MAIN_CLIENT_SCOPE_SELECTOR}.is-active, ${MAIN_VENDOR_SCOPE_SELECTOR}.is-active`
            );
            if (activePanel) return activePanel;
            return mainScope.querySelector(MAIN_SCOPE_SELECTOR);
          };
            clientSavedListBtnSelector =
              "#clientSavedListBtn, #FournisseurSavedListBtn, #btnAddClientMenu, #btnAddFournisseurMenu";
            clientFieldsSettingsBtnSelector = "#clientFieldsSettingsBtn";
            articleFieldsSettingsBtnSelector = "#articleFieldsSettingsBtn";
            ARTICLE_FIELD_LABELS_DEFAULTS = {
              ref: "Réf.",
              product: "Désignation",
              desc: "Description",
              qty: "Qté",
              unit: "Unité",
              stockQty: "Stock disponible",
              purchasePrice: "PU A. HT",
              purchaseTva: "TVA A.",
              price: "P.U. HT",
              fodecSale: "FODEC V.",
              fodecPurchase: "FODEC A.",
              tva: "TVA %",
              discount: "Remise %",
              fodec: "FODEC V.",
              fodecRate: "Taux FODEC V.",
              fodecTva: "TVA FODEC V.",
              fodecAmount: "FODEC",
              purchaseFodecRate: "Taux FODEC A.",
              purchaseFodecTva: "TVA FODEC A.",
              purchaseFodecAmount: "FODEC A.",
              totalPurchaseHt: "Total A. HT",
              totalPurchaseTtc: "Total A. TTC",
              totalHt: "Total HT",
              totalTtc: "Total TTC"
            };
            resolveArticleFieldLabelDefaults = () => {
              const defaults = w.DEFAULT_ARTICLE_FIELD_LABELS || {};
              return { ...ARTICLE_FIELD_LABELS_DEFAULTS, ...defaults };
            };
            normalizeArticleFieldLabels = (raw = {}) => {
              const base = resolveArticleFieldLabelDefaults();
              const normalized = { ...base };
              const legacyPurchaseLabelMap = {
                purchasePrice: new Set(["prix unitaire d'achat ht", "pu achat ht", "prix achat ht", "pu a. ht"]),
                purchaseTva: new Set(["tva a l'achat %", "tva achat %", "tva a.", "tva a"]),
                fodec: new Set(["fodec %", "fodec % v.", "fodec % a."]),
                fodecSale: new Set(["fodec %", "fodec % v."]),
                fodecPurchase: new Set(["fodec %", "fodec % a."]),
                fodecAmount: new Set(["montant (auto)", "montant fodec (auto)"]),
                purchaseFodecAmount: new Set(["montant (auto)", "montant fodec achat (auto)"]),
                totalPurchaseHt: new Set(["prix unitaire d'achat ht", "total achat ht", "total a. ht"]),
                totalPurchaseTtc: new Set(["prix unitaire d'achat ttc", "total achat ttc", "total a. ttc"])
              };
              if (raw && typeof raw === "object") {
                Object.keys(base).forEach((key) => {
                  if (typeof raw[key] === "string") {
                    const nextValue = raw[key].trim();
                    if (!nextValue) return;
                    const normalizedKey = String(key || "");
                    const legacySet = legacyPurchaseLabelMap[normalizedKey];
                    const legacyToken = nextValue.toLowerCase();
                    if (legacySet && legacySet.has(legacyToken)) {
                      normalized[normalizedKey] = base[normalizedKey];
                      return;
                    }
                    normalized[normalizedKey] = nextValue;
                  }
                });
              }
              const saleHeaderLabel = typeof normalized.fodecSale === "string" ? normalized.fodecSale.trim() : "";
              const saleAmountLabel = typeof normalized.fodecAmount === "string" ? normalized.fodecAmount.trim() : "";
              if (!saleAmountLabel && saleHeaderLabel) normalized.fodecAmount = saleHeaderLabel;
              if (!saleHeaderLabel && saleAmountLabel) normalized.fodecSale = saleAmountLabel;
              const purchaseHeaderLabel =
                typeof normalized.fodecPurchase === "string" ? normalized.fodecPurchase.trim() : "";
              const purchaseAmountLabel =
                typeof normalized.purchaseFodecAmount === "string"
                  ? normalized.purchaseFodecAmount.trim()
                  : "";
              if (!purchaseAmountLabel && purchaseHeaderLabel) {
                normalized.purchaseFodecAmount = purchaseHeaderLabel;
              }
              if (!purchaseHeaderLabel && purchaseAmountLabel) {
                normalized.fodecPurchase = purchaseAmountLabel;
              }
              return normalized;
            };
            ARTICLE_FIELD_DEFAULTS = {
              purchaseTva: 19,
              tva: 19,
              fodecTva: 19,
              fodecRate: 1,
              purchaseFodecTva: 19,
              purchaseFodecRate: 1
            };
            resolveArticleFieldDefaults = () => {
              const defaults = w.DEFAULT_ARTICLE_FIELD_DEFAULTS || {};
              return { ...ARTICLE_FIELD_DEFAULTS, ...defaults };
            };
            normalizeArticleFieldDefaults = (raw = {}) => {
              const base = resolveArticleFieldDefaults();
              const normalized = { ...base };
              if (raw && typeof raw === "object") {
                Object.keys(base).forEach((key) => {
                  if (!(key in raw)) return;
                  const num = Number(raw[key]);
                  if (Number.isFinite(num)) normalized[key] = num;
                });
              }
              return normalized;
            };
            ARTICLE_FIELD_VISIBILITY_DEFAULTS = {
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
              purchaseSectionEnabled: true,
              salesSectionEnabled: true,
              totalHt: true,
              totalTtc: true
            };
            ARTICLE_PURCHASE_TOGGLE_KEYS = [
              "purchasePrice",
              "purchaseTva",
              "purchaseDiscount",
              "addPurchaseFodec",
              "totalPurchaseHt",
              "totalPurchaseTtc"
            ];
            ARTICLE_PURCHASE_TOGGLE_KEY_SET = new Set(ARTICLE_PURCHASE_TOGGLE_KEYS);
            ARTICLE_SALES_TOGGLE_KEYS = [
              "price",
              "tva",
              "discount",
              "addFodec",
              "totalHt",
              "totalTtc"
            ];
            ARTICLE_SALES_TOGGLE_KEY_SET = new Set(ARTICLE_SALES_TOGGLE_KEYS);
            resolveArticleFieldVisibilityDefaults = () => {
              const defaults = w.DEFAULT_ARTICLE_FIELD_VISIBILITY || {};
              return { ...ARTICLE_FIELD_VISIBILITY_DEFAULTS, ...defaults };
            };
            normalizeArticleFieldVisibility = (raw = {}) => {
              const base = resolveArticleFieldVisibilityDefaults();
              const normalized = { ...base };
              if (raw && typeof raw === "object") {
                Object.keys(base).forEach((key) => {
                  if (key in raw) normalized[key] = !!raw[key];
                });
              }
              return normalized;
            };
            articleFieldVisibility = normalizeArticleFieldVisibility();
            articleFieldVisibilityDraft = { ...articleFieldVisibility };
            SEM.getArticleFieldVisibility = () => ({ ...articleFieldVisibility });
            articleFieldDefaults = normalizeArticleFieldDefaults({
              purchaseTva: state().meta?.addForm?.purchaseTva,
              tva: state().meta?.addForm?.tva,
              fodecTva: state().meta?.addForm?.fodec?.tva,
              fodecRate: state().meta?.addForm?.fodec?.rate,
              purchaseFodecTva: state().meta?.addForm?.purchaseFodec?.tva,
              purchaseFodecRate: state().meta?.addForm?.purchaseFodec?.rate
            });
            articleFieldDefaultsDraft = { ...articleFieldDefaults };
            articleFieldLabels = normalizeArticleFieldLabels(state().meta?.articleFieldLabels || {});
            articleFieldLabelsDraft = { ...articleFieldLabels };
            syncArticleFieldsSettingsPreview = (scope = document, options = {}) => {
              if (!scope) return;
              const modal =
                scope.id === "articleFieldsSettingsModal"
                  ? scope
                  : scope.querySelector?.("#articleFieldsSettingsModal");
              if (!modal) return;
              const preview = modal.querySelector?.("[data-article-form-preview]");
              if (!preview) return;
              const defaults =
                options.defaults && typeof options.defaults === "object"
                  ? options.defaults
                  : articleFieldDefaultsDraft;
              const visibility =
                options.visibility && typeof options.visibility === "object"
                  ? options.visibility
                  : articleFieldVisibilityDraft;
              preview
                .querySelectorAll?.("input[data-article-preview-default-key]")
                .forEach((input) => {
                  const key = String(input?.dataset?.articlePreviewDefaultKey || "").trim();
                  if (!key) return;
                  input.value = String(defaults?.[key] ?? "");
                });
              preview
                .querySelectorAll?.("[data-article-preview-field]")
                .forEach((node) => {
                  const key = String(node?.dataset?.articlePreviewField || "").trim();
                  if (!key) return;
                  const isVisible = visibility?.[key] !== false;
                  node.style.display = isVisible ? "" : "none";
                });
              preview
                .querySelectorAll?.("input[data-article-preview-toggle]")
                .forEach((input) => {
                  const key = String(input?.dataset?.articlePreviewToggle || "").trim();
                  if (!key) return;
                  input.checked = visibility?.[key] !== false;
                });
              const isPurchaseSectionVisible = visibility?.purchaseSectionEnabled !== false;
              const isSalesSectionVisible = visibility?.salesSectionEnabled !== false;
              const pricingLayout = preview.querySelector?.(".article-pricing-layout");
              const purchaseColumn = preview.querySelector?.(".article-pricing-column--purchase");
              const salesColumn = preview.querySelector?.(".article-pricing-column--sales");
              if (pricingLayout) {
                pricingLayout.classList.toggle("is-purchase-hidden", !isPurchaseSectionVisible);
                pricingLayout.classList.toggle("is-sales-hidden", !isSalesSectionVisible);
              }
              if (purchaseColumn) {
                purchaseColumn.style.display = isPurchaseSectionVisible ? "" : "none";
                if (!isPurchaseSectionVisible) purchaseColumn.setAttribute("aria-hidden", "true");
                else purchaseColumn.removeAttribute("aria-hidden");
              }
              if (salesColumn) {
                salesColumn.style.display = isSalesSectionVisible ? "" : "none";
                if (!isSalesSectionVisible) salesColumn.setAttribute("aria-hidden", "true");
                else salesColumn.removeAttribute("aria-hidden");
              }
            };
            applyArticleFieldDefaults = (scope = document, defaults = articleFieldDefaults) => {
              if (!scope || !scope.querySelectorAll) return;
              const pairs = [
                ["addPurchaseTva", defaults.purchaseTva],
                ["addTva", defaults.tva],
                ["addFodecTva", defaults.fodecTva],
                ["addFodecRate", defaults.fodecRate],
                ["addPurchaseFodecTva", defaults.purchaseFodecTva],
                ["addPurchaseFodecRate", defaults.purchaseFodecRate]
              ];
              pairs.forEach(([id, value]) => {
                scope.querySelectorAll(`#${id}`).forEach((input) => {
                  input.value = String(value ?? "");
                });
              });
            };
            syncArticleFieldDefaultInputs = (scope = document, defaults = articleFieldDefaults, exclude = null) => {
              if (!scope) return;
              scope.querySelectorAll(".article-fields-modal input[data-article-default-input]").forEach((input) => {
                if (exclude && input === exclude) return;
                const key = input.dataset.articleDefaultInput;
                if (!key) return;
                input.value = String(defaults[key] ?? "");
              });
            };
            syncArticleFieldDefaultsToState = (defaults = articleFieldDefaults) => {
              const st = state();
              if (!st || typeof st !== "object") return;
              st.meta = st.meta || {};
              st.meta.addForm = st.meta.addForm || {};
              st.meta.addForm.purchaseTva = defaults.purchaseTva;
              st.meta.addForm.tva = defaults.tva;
              st.meta.addForm.fodec = st.meta.addForm.fodec || { enabled: false, label: "FODEC", rate: 1, tva: 19 };
              st.meta.addForm.fodec.rate = defaults.fodecRate;
              st.meta.addForm.fodec.tva = defaults.fodecTva;
              st.meta.addForm.purchaseFodec =
                st.meta.addForm.purchaseFodec || { enabled: false, label: "FODEC ACHAT", rate: 1, tva: 19 };
              st.meta.addForm.purchaseFodec.rate = defaults.purchaseFodecRate;
              st.meta.addForm.purchaseFodec.tva = defaults.purchaseFodecTva;
            };
            updateArticleFieldDefaultsDraft = (patch = {}, options = {}) => {
              articleFieldDefaultsDraft = normalizeArticleFieldDefaults({
                ...articleFieldDefaultsDraft,
                ...(patch && typeof patch === "object" ? patch : {})
              });
              applyArticleFieldDefaults(document, articleFieldDefaultsDraft);
              syncArticleFieldDefaultInputs(document, articleFieldDefaultsDraft, options.sourceInput || null);
              syncArticleFieldDefaultsToState(articleFieldDefaultsDraft);
              syncArticleFieldsSettingsPreview(document, {
                defaults: articleFieldDefaultsDraft,
                visibility: articleFieldVisibilityDraft
              });
            };
            commitArticleFieldDefaultsDraft = () => {
              articleFieldDefaults = normalizeArticleFieldDefaults(articleFieldDefaultsDraft);
              applyArticleFieldDefaults(document, articleFieldDefaults);
              syncArticleFieldDefaultInputs(document, articleFieldDefaults);
              syncArticleFieldDefaultsToState(articleFieldDefaults);
              syncArticleFieldsSettingsPreview(document, {
                defaults: articleFieldDefaults,
                visibility: articleFieldVisibilityDraft
              });
            };
            ARTICLE_FIELD_LABEL_KEY_ALIASES = {
              fodecSale: ["fodecAmount", "fodecSale", "fodec"],
              fodecPurchase: ["purchaseFodecAmount", "fodecPurchase", "fodec"]
            };
            resolveArticleFieldLabelValue = (labels, key) => {
              const labelSource = labels && typeof labels === "object" ? labels : {};
              const normalizedKey = String(key || "").trim();
              if (!normalizedKey) return "";
              const candidates = ARTICLE_FIELD_LABEL_KEY_ALIASES[normalizedKey] || [normalizedKey];
              for (const candidate of candidates) {
                const raw = typeof labelSource[candidate] === "string" ? labelSource[candidate].trim() : "";
                if (raw) return raw;
              }
              return "";
            };
            resolveArticleFieldLabelDefault = (defaults, key) => {
              const defaultSource = defaults && typeof defaults === "object" ? defaults : {};
              const normalizedKey = String(key || "").trim();
              if (!normalizedKey) return "";
              const candidates = ARTICLE_FIELD_LABEL_KEY_ALIASES[normalizedKey] || [normalizedKey];
              for (const candidate of candidates) {
                const raw = typeof defaultSource[candidate] === "string" ? defaultSource[candidate].trim() : "";
                if (raw) return raw;
              }
              return "";
            };
            applyArticleFieldLabels = (scope = document, labels = articleFieldLabels) => {
              if (!scope) return;
              const defaults = resolveArticleFieldLabelDefaults();
              scope.querySelectorAll("[data-article-field-label]").forEach((node) => {
                const key = node.dataset.articleFieldLabel;
                if (!key) return;
                const isModalDefaultLabel =
                  node.classList?.contains("article-field-label-default") &&
                  node.closest(".article-fields-modal");
                const fallback = resolveArticleFieldLabelDefault(defaults, key);
                if (isModalDefaultLabel) {
                  if (fallback) node.textContent = fallback;
                  return;
                }
                const label = resolveArticleFieldLabelValue(labels, key);
                const next = label || fallback;
                if (!next) return;
                node.textContent = next;
              });
            };
            helpers.getArticleFieldLabels = () => ({ ...(articleFieldLabels || {}) });
            helpers.resolveArticleFieldLabel = (key, fallback = "") => {
              const raw = resolveArticleFieldLabelValue(articleFieldLabels, key);
              return raw || fallback || "";
            };
            syncArticleFieldLabelInputs = (scope = document, labels = articleFieldLabels, exclude = null) => {
              if (!scope) return;
              scope.querySelectorAll(".article-fields-modal input[data-article-field-label-input]").forEach((input) => {
                if (exclude && input === exclude) return;
                const key = input.dataset.articleFieldLabelInput;
                if (!key) return;
                const defaults = resolveArticleFieldLabelDefaults();
                const hasExplicitValue = !!(
                  labels &&
                  Object.prototype.hasOwnProperty.call(labels, key) &&
                  typeof labels[key] === "string"
                );
                input.value = hasExplicitValue ? labels[key] : defaults[key] || "";
              });
            };
            syncArticleFieldLabelsToState = (labels = articleFieldLabels) => {
              const st = state();
              if (!st || typeof st !== "object") return;
              st.meta = st.meta || {};
              st.meta.articleFieldLabels = { ...labels };
            };
            updateArticleFieldLabelsDraft = (patch = {}, options = {}) => {
              articleFieldLabelsDraft = normalizeArticleFieldLabels({
                ...articleFieldLabelsDraft,
                ...(patch && typeof patch === "object" ? patch : {})
              });
              applyArticleFieldLabels(document, articleFieldLabelsDraft);
              syncArticleFieldLabelInputs(
                document,
                articleFieldLabelsDraft,
                options.sourceInput || null
              );
            };
            commitArticleFieldLabelsDraft = () => {
              articleFieldLabels = normalizeArticleFieldLabels(articleFieldLabelsDraft);
              applyArticleFieldLabels(document, articleFieldLabels);
              syncArticleFieldLabelInputs(document, articleFieldLabels);
              syncArticleFieldLabelsToState(articleFieldLabels);
              void saveArticleFieldSettings({
                visibility: articleFieldVisibility,
                defaults: articleFieldDefaults,
                labels: articleFieldLabels
              });
            if (articleImportModal && articleImportModal.classList.contains("is-open")) {
              updateArticleImportExampleVisibility(articleFieldVisibility);
              updateArticleImportCopyHeaders(articleFieldVisibility);
            }
            };
          getArticleColumnVisibilitySnapshot = () => {
            const snapshot = {};
            const map = SEM.consts?.FIELD_TOGGLE_MAP || {};
            const metaColumns = state().meta?.columns || {};
            Object.entries(map).forEach(([key, id]) => {
              if (Object.prototype.hasOwnProperty.call(metaColumns, key)) {
                snapshot[key] = !!metaColumns[key];
                return;
              }
              const toggle = getEl(id);
              if (toggle) snapshot[key] = !!toggle.checked;
            });
            return snapshot;
          };
          syncArticleFieldToggleStates = (scope = document, visibility = articleFieldVisibility) => {
            if (!scope || typeof scope.querySelectorAll !== "function") return;
            const source = visibility && typeof visibility === "object" ? visibility : {};
            scope.querySelectorAll(".article-fields-modal input[data-column-key]").forEach((input) => {
              const key = String(input?.dataset?.columnKey || "").trim();
              if (!key) return;
              input.checked = source[key] !== false;
              input.disabled = false;
              const label = input.closest?.("label.toggle-option");
              if (label) {
                label.classList.remove("is-disabled");
                label.removeAttribute("aria-disabled");
              }
            });
            const purchaseColumn =
              scope.querySelector?.("[data-article-fields-purchase-toggles]") ||
              document.querySelector?.("#articleFieldsSettingsModal [data-article-fields-purchase-toggles]");
            if (purchaseColumn) {
              const purchaseGrid = purchaseColumn.querySelector?.("[data-article-fields-purchase-grid]");
              const masterToggle = purchaseColumn.querySelector?.("input[data-article-fields-hide-purchase]");
              const purchaseSectionEnabled = source.purchaseSectionEnabled !== false;
              purchaseColumn.classList.toggle("is-disabled", !purchaseSectionEnabled);
              purchaseColumn.setAttribute(
                "data-article-fields-purchase-enabled",
                purchaseSectionEnabled ? "true" : "false"
              );
              if (purchaseGrid) {
                purchaseGrid.hidden = false;
                if (!purchaseSectionEnabled) purchaseGrid.setAttribute("aria-disabled", "true");
                else purchaseGrid.removeAttribute("aria-disabled");
              }
              if (masterToggle) {
                masterToggle.checked = purchaseSectionEnabled;
                masterToggle.setAttribute("aria-checked", purchaseSectionEnabled ? "true" : "false");
              }
              purchaseColumn.querySelectorAll?.("input[data-column-key]").forEach((input) => {
                const key = String(input?.dataset?.columnKey || "").trim();
                if (!ARTICLE_PURCHASE_TOGGLE_KEY_SET.has(key)) return;
                input.disabled = !purchaseSectionEnabled;
                const label = input.closest?.("label.toggle-option");
                if (label) {
                  label.classList.toggle("is-disabled", !purchaseSectionEnabled);
                  if (!purchaseSectionEnabled) label.setAttribute("aria-disabled", "true");
                  else label.removeAttribute("aria-disabled");
                }
              });
            }
            const salesColumn =
              scope.querySelector?.("[data-article-fields-sales-toggles]") ||
              document.querySelector?.("#articleFieldsSettingsModal [data-article-fields-sales-toggles]");
            if (salesColumn) {
              const salesGrid = salesColumn.querySelector?.("[data-article-fields-sales-grid]");
              const masterToggle = salesColumn.querySelector?.("input[data-article-fields-hide-sales]");
              const salesSectionEnabled = source.salesSectionEnabled !== false;
              salesColumn.classList.toggle("is-disabled", !salesSectionEnabled);
              salesColumn.setAttribute(
                "data-article-fields-sales-enabled",
                salesSectionEnabled ? "true" : "false"
              );
              if (salesGrid) {
                salesGrid.hidden = false;
                if (!salesSectionEnabled) salesGrid.setAttribute("aria-disabled", "true");
                else salesGrid.removeAttribute("aria-disabled");
              }
              if (masterToggle) {
                masterToggle.checked = salesSectionEnabled;
                masterToggle.setAttribute("aria-checked", salesSectionEnabled ? "true" : "false");
              }
              salesColumn.querySelectorAll?.("input[data-column-key]").forEach((input) => {
                const key = String(input?.dataset?.columnKey || "").trim();
                if (!ARTICLE_SALES_TOGGLE_KEY_SET.has(key)) return;
                input.disabled = !salesSectionEnabled;
                const label = input.closest?.("label.toggle-option");
                if (label) {
                  label.classList.toggle("is-disabled", !salesSectionEnabled);
                  if (!salesSectionEnabled) label.setAttribute("aria-disabled", "true");
                  else label.removeAttribute("aria-disabled");
                }
              });
            }
          };
          setArticlePurchaseSectionEnabled = (isEnabled) => {
            const nextEnabled = !!isEnabled;
            const modal = document.getElementById("articleFieldsSettingsModal");
            const masterToggle = modal?.querySelector?.("input[data-article-fields-hide-purchase]");
            if (masterToggle) {
              masterToggle.checked = nextEnabled;
              masterToggle.setAttribute("aria-checked", nextEnabled ? "true" : "false");
            }
            updateArticleFieldVisibilityDraft({ purchaseSectionEnabled: nextEnabled });
          };
          setArticleSalesSectionEnabled = (isEnabled) => {
            const nextEnabled = !!isEnabled;
            const modal = document.getElementById("articleFieldsSettingsModal");
            const masterToggle = modal?.querySelector?.("input[data-article-fields-hide-sales]");
            if (masterToggle) {
              masterToggle.checked = nextEnabled;
              masterToggle.setAttribute("aria-checked", nextEnabled ? "true" : "false");
            }
            updateArticleFieldVisibilityDraft({ salesSectionEnabled: nextEnabled });
          };
          applyArticleColumnVisibility = (visibility = {}) => {
            const map = SEM.consts?.FIELD_TOGGLE_MAP || {};
            const meta = state().meta || (state().meta = {});
            meta.columns = meta.columns || {};
            Object.entries(map).forEach(([key, id]) => {
              if (!Object.prototype.hasOwnProperty.call(visibility, key)) return;
              const checked = !!visibility[key];
              meta.columns[key] = checked;
              const toggle = getEl(id);
              if (toggle) toggle.checked = checked;
            });
            syncArticleFieldToggleStates(document, visibility);
            SEM.applyColumnHiding?.();
          };
          updateArticleFieldVisibilityDraft = (patch = {}) => {
            articleFieldVisibilityDraft = normalizeArticleFieldVisibility({
              ...articleFieldVisibilityDraft,
              ...(patch && typeof patch === "object" ? patch : {})
            });
            applyArticleColumnVisibility(articleFieldVisibilityDraft);
            syncArticleFieldsSettingsPreview(document, {
              defaults: articleFieldDefaultsDraft,
              visibility: articleFieldVisibilityDraft
            });
          };
          commitArticleFieldVisibilityDraft = () => {
            articleFieldVisibility = normalizeArticleFieldVisibility(articleFieldVisibilityDraft);
            applyArticleColumnVisibility(articleFieldVisibility);
            syncArticleFieldsSettingsPreview(document, {
              defaults: articleFieldDefaultsDraft,
              visibility: articleFieldVisibility
            });
            void saveArticleFieldSettings({
              visibility: articleFieldVisibility,
              defaults: articleFieldDefaults,
              labels: articleFieldLabels
            });
            updateArticleImportExampleVisibility(articleFieldVisibility);
            updateArticleImportCopyHeaders(articleFieldVisibility);
            updateArticlesExportExampleVisibility(articleFieldVisibility);
          };
          CLIENT_FIELD_VISIBILITY_DEFAULTS = {
            benefit: true,
            account: true,
            soldClient: false,
            name: true,
            stegRef: true,
            taxId: true,
            phone: true,
            email: true,
            address: true
          };
          CLIENT_FIELD_LABELS_DEFAULTS = {
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
          resolveClientFieldVisibilityDefaults = () => {
            const defaults = w.DEFAULT_CLIENT_FIELD_VISIBILITY || {};
            return { ...CLIENT_FIELD_VISIBILITY_DEFAULTS, ...defaults };
          };
          resolveClientFieldLabelDefaults = () => {
            const defaults = w.DEFAULT_CLIENT_FIELD_LABELS || {};
            return { ...CLIENT_FIELD_LABELS_DEFAULTS, ...defaults };
          };
          normalizeClientFieldVisibility = (raw = {}) => {
            const base = resolveClientFieldVisibilityDefaults();
            const normalized = { ...base };
            const source = raw && typeof raw === "object" ? { ...raw } : {};
            Object.keys(base).forEach((key) => {
              if (key in source) normalized[key] = !!source[key];
            });
            return normalized;
          };
          normalizeClientFieldLabels = (raw = {}) => {
            const base = resolveClientFieldLabelDefaults();
            const normalized = { ...base };
            const legacyTaxLabels = new Set(["Identifiant fiscal / TVA", "Identifiant fiscal"]);
            const legacySoldClientLabels = new Set(["Solde client"]);
            const source = raw && typeof raw === "object" ? { ...raw } : {};
            Object.keys(base).forEach((key) => {
              if (typeof source[key] === "string") {
                const trimmed = source[key].trim();
                if (key === "taxId" && legacyTaxLabels.has(trimmed)) {
                  normalized[key] = base[key];
                  return;
                }
                if (key === "soldClient" && legacySoldClientLabels.has(trimmed)) {
                  normalized[key] = base[key];
                  return;
                }
                normalized[key] = trimmed;
              }
            });
            return normalized;
          };
          loadClientFieldSettings = async () => {
            if (typeof w.electronAPI?.loadClientFieldSettings !== "function") {
              return { visibility: normalizeClientFieldVisibility(), labels: normalizeClientFieldLabels() };
            }
            const res = await w.electronAPI.loadClientFieldSettings();
            if (!res?.ok) {
              return { visibility: normalizeClientFieldVisibility(), labels: normalizeClientFieldLabels() };
            }
            const settings = res.settings && typeof res.settings === "object" ? res.settings : {};
            return {
              visibility: normalizeClientFieldVisibility(settings.visibility),
              labels: normalizeClientFieldLabels(settings.labels)
            };
          };
          saveClientFieldSettings = async (settings = {}) => {
            if (typeof w.electronAPI?.saveClientFieldSettings !== "function") return;
            const payload = {
              visibility: normalizeClientFieldVisibility(settings.visibility),
              labels: normalizeClientFieldLabels(settings.labels)
            };
            await w.electronAPI.saveClientFieldSettings(payload);
          };
          loadArticleFieldSettings = async () => {
            if (typeof w.electronAPI?.loadArticleFieldSettings !== "function") {
              return {
                visibility: normalizeArticleFieldVisibility(),
                defaults: normalizeArticleFieldDefaults(),
                labels: normalizeArticleFieldLabels()
              };
            }
            const res = await w.electronAPI.loadArticleFieldSettings();
            if (!res?.ok) {
              return {
                visibility: normalizeArticleFieldVisibility(),
                defaults: normalizeArticleFieldDefaults(),
                labels: normalizeArticleFieldLabels()
              };
            }
            const settings = res.settings && typeof res.settings === "object" ? res.settings : {};
            return {
              visibility: normalizeArticleFieldVisibility(settings.visibility),
              defaults: normalizeArticleFieldDefaults(settings.defaults),
              labels: normalizeArticleFieldLabels(settings.labels)
            };
          };
          saveArticleFieldSettings = async (settings = {}) => {
            if (typeof w.electronAPI?.saveArticleFieldSettings !== "function") return;
            const payload = {
              visibility: normalizeArticleFieldVisibility(settings.visibility),
              defaults: normalizeArticleFieldDefaults(settings.defaults),
              labels: normalizeArticleFieldLabels(settings.labels)
            };
            await w.electronAPI.saveArticleFieldSettings(payload);
          };
          clientFieldVisibility = normalizeClientFieldVisibility();
          clientFieldVisibilityDraft = { ...clientFieldVisibility };
          clientFieldLabels = normalizeClientFieldLabels();
          clientFieldLabelsDraft = { ...clientFieldLabels };
          resolveClientFieldLabel = (key, labels = clientFieldLabels) =>
            labels?.[key] || resolveClientFieldLabelDefaults()[key] || "";
          updateClientImportExampleHeaderCopy = (
            visibility = clientFieldVisibility,
            labels = clientFieldLabels
          ) => {
            if (typeof document === "undefined") return;
            const modal = document.getElementById("clientImportModal");
            if (!modal) return;
            const copyBtn =
              modal.querySelector("[data-client-import-copy]") ||
              modal.querySelector(".client-import-modal__example-table [data-doc-history-copy]");
            if (!copyBtn) return;
            const table = modal.querySelector(".client-import-modal__example-table table");
            const headerRow = table?.querySelector("thead tr");
            const isHiddenCell = (cell) => {
              if (!cell) return true;
              if (cell.hidden || cell.getAttribute("hidden") !== null) return true;
              if (cell.classList?.contains("is-hidden")) return true;
              if (cell.style?.display === "none") return true;
              return false;
            };
            const headersFromDom = headerRow
              ? Array.from(headerRow.children || [])
                .filter((cell) => !isHiddenCell(cell))
                .map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim())
                .filter(Boolean)
              : [];
            if (headersFromDom.length) {
              copyBtn.dataset.docHistoryCopyValue = headersFromDom.join("\t");
              return;
            }
            const headers = [
              "Nom",
              "Matricule fiscal (ou CIN / passeport)",
              "Type"
            ];
            if (visibility?.soldClient !== false) headers.push(resolveClientFieldLabel("soldClient", labels));
            headers.push("Telephone", "Email", "Adresse");
            if (visibility?.benefit !== false) headers.push(resolveClientFieldLabel("benefit", labels));
            if (visibility?.account !== false) headers.push(resolveClientFieldLabel("account", labels));
            if (visibility?.stegRef !== false) headers.push(resolveClientFieldLabel("stegRef", labels));
            copyBtn.dataset.docHistoryCopyValue = headers.join("\t");
          };
          applyClientFieldVisibility = (scope = document, visibility = clientFieldVisibility) => {
            if (!scope) return;
            const labels = Array.from(scope.querySelectorAll("[data-client-field]"));
            const gridRows = new Set();
            labels.forEach((label) => {
              const key = label.dataset.clientField;
              const isVisible = visibility[key] !== false;
              label.hidden = !isVisible;
              label.style.display = isVisible ? "" : "none";
              if (label.classList) label.classList.toggle("is-hidden", !isVisible);
              const row = label.closest(".grid.three.full");
              if (row) gridRows.add(row);
            });
            gridRows.forEach((row) => {
              const visibleCount = Array.from(row.querySelectorAll("[data-client-field]")).filter(
                (node) => !node.hidden
              ).length;
              const hasVisible = visibleCount > 0;
              row.hidden = !hasVisible;
              row.style.display = hasVisible ? "" : "none";
              if (hasVisible) {
                const maxColumns = Number.parseInt(row.dataset.gridColumns || "", 10);
                const allowedColumns = Number.isFinite(maxColumns) && maxColumns > 0 ? maxColumns : 3;
                const columns = Math.max(1, Math.min(visibleCount, allowedColumns));
                row.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
              } else {
                row.style.gridTemplateColumns = "";
              }
            });
          };
          applyClientFieldLabels = (scope = document, labels = clientFieldLabels) => {
            if (!scope) return;
            const labelDefaults = resolveClientFieldLabelDefaults();
            scope.querySelectorAll("[data-client-field-label]").forEach((node) => {
              const key = node.dataset.clientFieldLabel;
              const isModalDefaultLabel =
                node.classList?.contains("client-field-label-default") &&
                node.closest(".client-fields-modal");
              if (isModalDefaultLabel) {
                const defaultLabel = labelDefaults[key];
                if (defaultLabel) node.textContent = defaultLabel;
                return;
              }
              const label = resolveClientFieldLabel(key, labels);
              const customLabel =
                typeof labels?.[key] === "string" ? labels[key].trim() : "";
              const hasCustomLabel = !!customLabel && customLabel !== labelDefaults[key];
              if (key === "taxId" && !hasCustomLabel) return;
              if (label) node.textContent = label;
            });
          };
          syncClientFieldToggleStates = (scope = document, visibility = clientFieldVisibility) => {
            if (!scope) return;
            scope.querySelectorAll(".client-fields-modal input[data-field-key]").forEach((input) => {
              const key = input.dataset.fieldKey;
              input.checked = visibility[key] !== false;
            });
          };
          syncClientFieldLabelInputs = (scope = document, labels = clientFieldLabels, exclude = null) => {
            if (!scope) return;
            scope.querySelectorAll(".client-fields-modal input[data-field-label-input]").forEach((input) => {
              if (exclude && input === exclude) return;
              const key = input.dataset.fieldLabelInput;
              const defaults = resolveClientFieldLabelDefaults();
              const hasExplicitValue = !!(
                labels &&
                Object.prototype.hasOwnProperty.call(labels, key) &&
                typeof labels[key] === "string"
              );
              input.value = hasExplicitValue ? labels[key] : defaults[key] || "";
            });
          };
          syncClientFieldSettingsToState = (
            visibility = clientFieldVisibility,
            labels = clientFieldLabels
          ) => {
            const st = state();
            if (!st || typeof st !== "object") return;
            st.clientFieldVisibility = { ...visibility };
            st.clientFieldLabels = { ...labels };
          };
          updateClientFieldVisibilityDraft = (patch = {}) => {
            clientFieldVisibilityDraft = normalizeClientFieldVisibility({
              ...clientFieldVisibilityDraft,
              ...(patch && typeof patch === "object" ? patch : {})
            });
            applyClientFieldVisibility(document, clientFieldVisibilityDraft);
            syncClientFieldToggleStates(document, clientFieldVisibilityDraft);
            updateClientImportExampleHeaderCopy(clientFieldVisibilityDraft, clientFieldLabelsDraft);
          };
          updateClientFieldLabelsDraft = (patch = {}, options = {}) => {
            clientFieldLabelsDraft = normalizeClientFieldLabels({
              ...clientFieldLabelsDraft,
              ...(patch && typeof patch === "object" ? patch : {})
            });
            applyClientFieldLabels(document, clientFieldLabelsDraft);
            syncClientFieldLabelInputs(
              document,
              clientFieldLabelsDraft,
              options.sourceInput || null
            );
            updateClientImportExampleHeaderCopy(clientFieldVisibilityDraft, clientFieldLabelsDraft);
          };
          commitClientFieldVisibilityDraft = () => {
            clientFieldVisibility = normalizeClientFieldVisibility(clientFieldVisibilityDraft);
            applyClientFieldVisibility(document, clientFieldVisibility);
            syncClientFieldToggleStates(document, clientFieldVisibility);
            clientFieldLabels = normalizeClientFieldLabels(clientFieldLabelsDraft);
            applyClientFieldLabels(document, clientFieldLabels);
            syncClientFieldLabelInputs(document, clientFieldLabels);
            syncClientFieldSettingsToState(clientFieldVisibility, clientFieldLabels);
            updateClientImportExampleHeaderCopy(clientFieldVisibility, clientFieldLabels);
            void saveClientFieldSettings({
              visibility: clientFieldVisibility,
              labels: clientFieldLabels
            });
          };
          clientFieldsModalRestoreFocus = new WeakMap();
          closeClientFieldsSettingsModal = (modal) => {
            if (!modal) return;
            modal.classList.remove("is-open");
            modal.hidden = true;
            modal.setAttribute("hidden", "");
            modal.setAttribute("aria-hidden", "true");
            clientFieldVisibilityDraft = { ...clientFieldVisibility };
            clientFieldLabelsDraft = { ...clientFieldLabels };
            applyClientFieldVisibility(document, clientFieldVisibility);
            syncClientFieldToggleStates(document, clientFieldVisibility);
            applyClientFieldLabels(document, clientFieldLabels);
            syncClientFieldLabelInputs(document, clientFieldLabels);
            const restoreEl = clientFieldsModalRestoreFocus.get(modal);
            if (restoreEl && typeof restoreEl.focus === "function") {
              try {
                restoreEl.focus();
              } catch {}
            }
            if (!document.querySelector(".client-fields-modal.is-open")) {
              document.removeEventListener("keydown", onClientFieldsSettingsKeyDown);
            }
          };
          openClientFieldsSettingsModal = (modal, trigger) => {
            if (!modal) return;
            clientFieldsModalRestoreFocus.set(
              modal,
              trigger && trigger.focus ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null
            );
            clientFieldVisibilityDraft = { ...clientFieldVisibility };
            clientFieldLabelsDraft = { ...clientFieldLabels };
            applyClientFieldVisibility(document, clientFieldVisibilityDraft);
            syncClientFieldToggleStates(modal, clientFieldVisibilityDraft);
            applyClientFieldLabels(document, clientFieldLabelsDraft);
            syncClientFieldLabelInputs(modal, clientFieldLabelsDraft);
            modal.hidden = false;
            modal.removeAttribute("hidden");
            modal.setAttribute("aria-hidden", "false");
            modal.classList.add("is-open");
            document.addEventListener("keydown", onClientFieldsSettingsKeyDown);
            const firstToggle = modal.querySelector("input[data-field-key]");
            if (firstToggle && typeof firstToggle.focus === "function") {
              try {
                firstToggle.focus({ preventScroll: true });
              } catch {
                try {
                  firstToggle.focus();
                } catch {}
              }
            }
          };
          onClientFieldsSettingsKeyDown = (evt) => {
            if (evt.key !== "Escape") return;
            const modal = document.querySelector(".client-fields-modal.is-open");
            if (!modal) return;
            evt.preventDefault();
            closeClientFieldsSettingsModal(modal);
          };
          articleFieldsModalRestoreFocus = new WeakMap();
          articleFieldLabelsSnapshot = null;
          articleFieldSettingsCommitted = false;
          articleFieldsStepperActive = 1;
          articleFieldsStepperMax = 1;
          syncArticleFieldsStepper = (modal, targetStep, options = {}) => {
            if (!modal) return;
            const tabs = Array.from(modal.querySelectorAll("[data-article-fields-step]"));
            const panels = Array.from(modal.querySelectorAll("[data-article-fields-step-panel]"));
            const maxStep = panels.length || tabs.length || 1;
            const requested = Number(targetStep);
            const nextStep = Math.min(
              Math.max(1, Number.isFinite(requested) ? requested : articleFieldsStepperActive || 1),
              maxStep
            );
            articleFieldsStepperActive = nextStep;
            articleFieldsStepperMax = maxStep;
            modal.dataset.articleFieldsStep = String(nextStep);
            modal.dataset.articleFieldsStepMax = String(maxStep);
            tabs.forEach((tab) => {
              const stepNum = Number(tab.dataset.articleFieldsStep);
              const isActive = stepNum === nextStep;
              tab.classList.toggle("is-active", isActive);
              tab.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            panels.forEach((panel) => {
              const stepNum = Number(panel.dataset.articleFieldsStepPanel);
              const isActive = stepNum === nextStep;
              panel.classList.toggle("is-active", isActive);
              panel.hidden = !isActive;
              if (isActive) panel.removeAttribute("hidden");
              else panel.setAttribute("hidden", "");
            });
            const prevBtns = Array.from(
              modal.querySelectorAll("[data-article-fields-step-prev]")
            );
            prevBtns.forEach((btn) => {
              btn.disabled = nextStep <= 1;
            });
            const nextBtns = Array.from(
              modal.querySelectorAll("[data-article-fields-step-next]")
            );
            nextBtns.forEach((btn) => {
              const isFinalStep = nextStep >= maxStep;
              btn.hidden = isFinalStep;
              btn.disabled = isFinalStep;
              btn.setAttribute("aria-hidden", isFinalStep ? "true" : "false");
            });
            const saveBtns = Array.from(
              modal.querySelectorAll("[data-article-fields-modal-save]")
            );
            saveBtns.forEach((btn) => {
              btn.hidden = false;
              btn.disabled = false;
              btn.setAttribute("aria-hidden", "false");
            });
            if (options.focusPanel) {
              const activePanel = modal.querySelector(
                `[data-article-fields-step-panel="${nextStep}"]`
              );
              const focusTarget = activePanel?.querySelector?.(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
              );
              if (focusTarget && typeof focusTarget.focus === "function") {
                try {
                  focusTarget.focus({ preventScroll: true });
                } catch {
                  try {
                    focusTarget.focus();
                  } catch {}
                }
              }
            }
          };
          commitArticleFieldSettings = (modal) => {
            articleFieldSettingsCommitted = true;
            commitArticleFieldDefaultsDraft();
            commitArticleFieldVisibilityDraft();
            commitArticleFieldLabelsDraft();
            closeArticleFieldsSettingsModal(modal);
          };
          closeArticleFieldsSettingsModal = (modal) => {
            if (!modal) return;
            syncArticleFieldsStepper(modal, 1);
            modal.classList.remove("is-open");
            modal.hidden = true;
            modal.setAttribute("hidden", "");
            modal.setAttribute("aria-hidden", "true");
            if (!articleFieldSettingsCommitted) {
              articleFieldVisibilityDraft = { ...articleFieldVisibility };
              applyArticleColumnVisibility(articleFieldVisibility);
              articleFieldDefaultsDraft = { ...articleFieldDefaults };
              applyArticleFieldDefaults(document, articleFieldDefaults);
              syncArticleFieldDefaultInputs(document, articleFieldDefaults);
              syncArticleFieldDefaultsToState(articleFieldDefaults);
              articleFieldLabelsDraft = { ...articleFieldLabels };
              applyArticleFieldLabels(document, articleFieldLabels);
            }
            articleFieldLabelsSnapshot = null;
            articleFieldSettingsCommitted = false;
            const restoreEl = articleFieldsModalRestoreFocus.get(modal);
            if (restoreEl && typeof restoreEl.focus === "function") {
              try {
                restoreEl.focus();
              } catch {}
            }
            if (!document.querySelector(".article-fields-settings-modal.is-open")) {
              document.removeEventListener("keydown", onArticleFieldsSettingsKeyDown);
            }
          };
          openArticleFieldsSettingsModal = (modal, trigger) => {
            if (!modal) return;
            if (document.body && modal.parentElement !== document.body) {
              document.body.appendChild(modal);
            }
            articleFieldSettingsCommitted = false;
            articleFieldVisibilityDraft = { ...articleFieldVisibility };
            applyArticleColumnVisibility(articleFieldVisibilityDraft);
            syncArticleFieldToggleStates(modal, articleFieldVisibilityDraft);
            articleFieldDefaultsDraft = { ...articleFieldDefaults };
            syncArticleFieldDefaultInputs(modal, articleFieldDefaultsDraft);
            articleFieldLabelsSnapshot = { ...articleFieldLabels };
            articleFieldLabelsDraft = { ...articleFieldLabels };
            applyArticleFieldLabels(document, articleFieldLabelsDraft);
            articleFieldsModalRestoreFocus.set(
              modal,
              trigger && trigger.focus ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null
            );
            syncArticleFieldsStepper(modal, 1);
            modal.hidden = false;
            modal.removeAttribute("hidden");
            modal.setAttribute("aria-hidden", "false");
            modal.classList.add("is-open");
            document.addEventListener("keydown", onArticleFieldsSettingsKeyDown);
            syncArticleFieldLabelInputs(modal, articleFieldLabelsDraft);
            syncArticleFieldsSettingsPreview(modal, {
              defaults: articleFieldDefaultsDraft,
              visibility: articleFieldVisibilityDraft
            });
            syncArticleFieldsStepper(modal, 1, { focusPanel: true });
          };
          onArticleFieldsSettingsKeyDown = (evt) => {
            if (evt.key !== "Escape") return;
            const modal = document.querySelector(".article-fields-settings-modal.is-open");
            if (!modal) return;
            evt.preventDefault();
            closeArticleFieldsSettingsModal(modal);
          };
  }, { order: 100 });
})(window);
