(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBindingModule = SEM.registerCoreBindingModule;
  if (typeof registerCoreBindingModule !== "function") {
    console.warn("[core-bindings] registerCoreBindingModule is unavailable");
    return;
  }

  registerCoreBindingModule("document-ui", (ctx = {}) => {
    const fallbackGetMessage = (key, options = {}) =>
      (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
        text: options?.fallbackText || key || "",
        title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
      };
    const fallbackFormatSoldClientValue = (value) => {
      const cleaned = String(value ?? "").replace(",", ".").trim();
      if (!cleaned) return "";
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return String(value ?? "").trim();
      return num.toFixed(3);
    };
    const {
      state = () => SEM.state,
      getMessage = fallbackGetMessage,
      formatSoldClientValue = fallbackFormatSoldClientValue,
      refreshClientSummary = () => {},
      refreshInvoiceSummary = () => {},
      MAIN_CLIENT_SCOPE_ID = "clientBoxMainscreenClientsPanel",
      MAIN_VENDOR_SCOPE_ID = "clientBoxMainscreenFournisseursPanel",
      MAIN_SCOPE_SELECTOR = `#${MAIN_CLIENT_SCOPE_ID}, #${MAIN_VENDOR_SCOPE_ID}`,
      CLIENT_SCOPE_SELECTOR = "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientFormPopover, #fournisseurFormPopover",
      CLIENT_SCOPE_WITH_ROOT_SELECTOR = `${CLIENT_SCOPE_SELECTOR}, #clientBoxMainscreen`,
      CLIENT_FORM_VENDOR_ID_ALIASES = {},
      uniqClientFormIds = (ids = []) => Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean))),
      toCanonicalClientFormId = (id) => id,
      queryScopedClientFormElement = (scopeNode, id) =>
        scopeNode && typeof scopeNode.querySelector === "function" ? scopeNode.querySelector(`#${id}`) : null,
      queryGlobalClientFormElement = (id) => getEl(id),
      resolveClientEntityType = () => "client",
      sanitizeClientSnapshot = (snapshot) => snapshot,
      applyClientFieldVisibility = () => {},
      applyClientFieldLabels = () => {},
      clientFieldVisibility = {},
      clientFieldVisibilityDraft = {},
      clientFieldLabels = {},
      clientFieldLabelsDraft = {},
      clientSavedModal = null,
      clientSavedModalState = { items: [] },
      clientSavedSearchInput = null,
      isItemsDocOptionsModalOpen = () => false,
      getDefaultClientSearchInput = () => null,
      getDefaultClientSearchResults = () => null,
      hideClientSearchResults = () => {},
      clearClientSearchInputValue = () => {},
      renderClientSearchResults = () => {},
      renderClientSavedModal = () => {},
      fetchSavedClientsPage = async () => {},
      setActiveAddFormScope = () => {},
      syncClientFormFields = () => {},
      addArticleToItems = () => {},
      isArticleSavedModalOpen = () => false,
      closeArticleSavedModal = () => {},
      scheduleModelDirtyCheck = () => {},
      syncTaxModeDependentColumnToggles = () => {},
      updateTaxDependentLabels = () => {},
      updateModelButtons = () => {},
      modelSelect = null
    } = ctx;
    const getModelBaselineString = () => ctx.modelBaselineString;
    const setModelDirty = (value) => {
      ctx.modelDirty = !!value;
    };
    const getClientSearchData = () =>
      Array.isArray(ctx.clientSearchData) ? ctx.clientSearchData : [];
    const getClientSavedModalEntityType = () =>
      ctx.clientSavedModalEntityType === "vendor" ? "vendor" : "client";

            const docTypeSelect = getEl("docType");
            docTypeSelect?.addEventListener("change", () => {
              state().meta.docType = getStr("docType", state().meta.docType);
              if (typeof w.syncDocTypeMenuUi === "function") {
                w.syncDocTypeMenuUi(docTypeSelect.value, { updateSelect: false });
              }
              refreshInvoiceSummary();
              SEM.updateAmountWordsBlock?.();
              if (typeof SEM.applyModelDocTypeFilter === "function") {
                SEM.applyModelDocTypeFilter(docTypeSelect.value, { fireChange: false });
              }
              scheduleModelDirtyCheck();
              if (modelSelect?.value && getModelBaselineString()) {
                setModelDirty(true);
                updateModelButtons();
              }
            });

            const invNumberLengthField = getEl("invNumberLength");
            const invNumberHiddenField = getEl("invNumber");
            const invNumberPrefixField = getEl("invNumberPrefix");
            const invNumberDatePartField = getEl("invNumberDatePart");
            const invNumberSuffixField = getEl("invNumberSuffix");
            const hasServerNumbering = typeof w.electronAPI?.previewDocumentNumber === "function";
            const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
            const getNormalizedInvoiceLength = () => {
              const meta = state().meta;
              const raw = getStr("invNumberLength", meta.numberLength || 4);
              if (typeof normalizeInvoiceNumberLength === "function") {
                return normalizeInvoiceNumberLength(raw, meta.numberLength || 4);
              }
              const num = Number(raw);
              const isValidLength = (val) => [4, 6, 8, 12].includes(Number(val));
              if (isValidLength(num)) return Number(num);
              return isValidLength(meta.numberLength) ? meta.numberLength : 4;
            };
            const normalizeNumberFormat = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
              const raw = String(value || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
              const fb = String(fallback || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
              return NUMBER_FORMAT_DEFAULT;
            };
            const numberFormatHasPrefix = (format) => format !== "counter";
            const numberFormatHasDate = (format) => format === "prefix_date_counter";
            const getDocTypeForNumber = () => String(state().meta?.docType || "facture").toLowerCase();
            const getDateForNumber = () => state().meta?.date;
            const getNumberFormatForNumber = () =>
              normalizeNumberFormat(state().meta?.numberFormat, NUMBER_FORMAT_DEFAULT);
            const isManualNumberDocType = () => getDocTypeForNumber() === "fa";
            const getPrefixForNumber = (docType, rawPrefix) => {
              const prefixMap = {
                facture: "Fact",
                fa: "FA",
                devis: "Dev",
                bl: "BL",
                bc: "BC",
                be: "BE",
                bs: "BS",
                avoir: "AV"
              };
              if (rawPrefix && String(rawPrefix).trim()) return String(rawPrefix).trim();
              if (prefixMap[docType]) return prefixMap[docType];
              if (docType && /^[a-z]/i.test(docType)) {
                const cleaned = docType.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
                return cleaned || "DOC";
              }
              return "DOC";
            };
            const formatInvoiceNumberLocal = (raw, len) => {
              if (isManualNumberDocType()) return String(raw ?? "").trim();
              const meta = state().meta || {};
              const docType = getDocTypeForNumber();
              const dateValue = getDateForNumber();
              const numberFormat = getNumberFormatForNumber();
              const prefixOverride = getPrefixForNumber(docType, invNumberPrefixField?.value);
              if (typeof formatInvoiceNumber === "function") {
                return formatInvoiceNumber(raw, len, {
                  docType,
                  date: dateValue,
                  meta,
                  numberFormat,
                  prefixOverride: numberFormatHasPrefix(numberFormat) ? prefixOverride : ""
                });
              }
              const suffixDigits = (String(raw ?? "").match(/(\d+)\s*$/)?.[1] || "").replace(/\D+/g, "");
              const trimmed = suffixDigits.length > len ? suffixDigits.slice(-len) : suffixDigits;
              const counter = trimmed || "1";
              if (!numberFormatHasDate(numberFormat)) {
                if (!numberFormatHasPrefix(numberFormat)) return counter;
                return `${prefixOverride}_${counter}`;
              }
              const parsedDateRaw = dateValue ? new Date(dateValue) : new Date();
              const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
              const year = String(parsedDate.getFullYear());
              const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
              const shortYear = year.slice(-2);
              return `${prefixOverride}_${shortYear}-${month}-${counter}`;
            };
            const syncSplitNumberFields = (formatted) => {
              const meta = state().meta || {};
              if (isManualNumberDocType()) {
                const inputValue = invNumberHiddenField ? String(invNumberHiddenField.value || "") : "";
                const metaValue = meta.number ?? "";
                const resolved = inputValue.trim() ? inputValue.trim() : String(metaValue || "").trim();
                if (invNumberHiddenField && invNumberHiddenField.value !== resolved) {
                  invNumberHiddenField.value = resolved;
                }
                meta.number = resolved;
                return;
              }
              const docType = getDocTypeForNumber();
              const dateValue = getDateForNumber();
              const numberFormat = getNumberFormatForNumber();
              if (invNumberDatePartField) {
                if (numberFormatHasDate(numberFormat)) {
                  const parsedDateRaw = dateValue ? new Date(dateValue) : new Date();
                  const parsedDate = Number.isFinite(parsedDateRaw.getTime()) ? parsedDateRaw : new Date();
                  const year = String(parsedDate.getFullYear());
                  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
                  const shortYear = year.slice(-2);
                  const segment = `_${shortYear}-${month}-`;
                  if (invNumberDatePartField.value !== segment) invNumberDatePartField.value = segment;
                } else if (invNumberDatePartField.value) {
                  invNumberDatePartField.value = "";
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
              if (numberFormatHasPrefix(numberFormat) && invNumberPrefixField && !invNumberPrefixField.value.trim()) {
                invNumberPrefixField.value = getPrefixForNumber(docType, prefixRaw);
              }
              if (invNumberSuffixField) {
                const suffixStr = suffixDigits || "";
                if (suffixStr && invNumberSuffixField.value !== suffixStr) invNumberSuffixField.value = suffixStr;
              }
              if (invNumberHiddenField && invNumberHiddenField.value !== formatted) invNumberHiddenField.value = formatted;
              meta.number = formatted;
            };

            const sanitizeSuffixField = () => {
              if (!invNumberSuffixField) return null;
              const len = getNormalizedInvoiceLength();
              const digits = String(invNumberSuffixField.value || "").replace(/\D+/g, "");
              const trimmed = digits.slice(-len);
              invNumberSuffixField.value = trimmed || "";
              return trimmed || null;
            };

            invNumberLengthField?.addEventListener("change", () => {
              if (hasServerNumbering) return;
              const meta = state().meta;
              const len = getNormalizedInvoiceLength();
              meta.numberLength = len;
              const suffixVal = sanitizeSuffixField();
              const formatted = formatInvoiceNumberLocal(suffixVal || meta.number || "1", len);
              syncSplitNumberFields(formatted);
              refreshInvoiceSummary();
            });

            invNumberPrefixField?.addEventListener("input", () => {
              if (hasServerNumbering) return;
              const len = getNormalizedInvoiceLength();
              const suffixVal = sanitizeSuffixField();
              const formatted = formatInvoiceNumberLocal(suffixVal || state().meta.number || "1", len);
              syncSplitNumberFields(formatted);
              refreshInvoiceSummary();
            });

            invNumberSuffixField?.addEventListener("input", () => {
              if (hasServerNumbering) return;
              const len = getNormalizedInvoiceLength();
              const suffixVal = sanitizeSuffixField();
              const formatted = formatInvoiceNumberLocal(suffixVal || "1", len);
              syncSplitNumberFields(formatted);
              refreshInvoiceSummary();
            });

            invNumberSuffixField?.addEventListener("blur", () => {
              if (hasServerNumbering) return;
              const len = getNormalizedInvoiceLength();
              const suffixVal = sanitizeSuffixField();
              const formatted = formatInvoiceNumberLocal(suffixVal || "1", len);
              syncSplitNumberFields(formatted);
              refreshInvoiceSummary();
            });

            invNumberHiddenField?.addEventListener("input", () => {
              if (hasServerNumbering) return;
              if (!isManualNumberDocType()) return;
              state().meta.number = String(invNumberHiddenField.value || "").trim();
              refreshInvoiceSummary();
            });

            syncSplitNumberFields(state().meta.number);

            getEl("invDate")  ?.addEventListener("input",  () => {
              state().meta.date = getStr("invDate", state().meta.date);
              syncSplitNumberFields(state().meta.number);
              refreshInvoiceSummary();
            });
            getEl("invDue")   ?.addEventListener("input",  () => { state().meta.due     = getStr("invDue",    state().meta.due); });
            const currencySelectEl = getEl("currency");
            currencySelectEl?.addEventListener("change", () => {
              state().meta.currency = getStr("currency", state().meta.currency);
              if (typeof w.syncCurrencyMenuUi === "function") {
                w.syncCurrencyMenuUi(currencySelectEl.value, { updateSelect: false });
              }
              SEM.renderItems();
            });

            const taxSelectEl = getEl("taxMode");
            const syncTaxMenuUiLocal = (value, opts = {}) => {
              if (typeof w.syncTaxMenuUi === "function") {
                w.syncTaxMenuUi(value, opts);
              }
            };
            taxSelectEl?.addEventListener("change", () => {
              const val = getStr("taxMode", state().meta.taxesEnabled !== false ? "with" : "without");
              state().meta.taxesEnabled = String(val || "").toLowerCase() !== "without";
              syncTaxMenuUiLocal(val, { updateSelect: false });
              syncTaxModeDependentColumnToggles({ scope: "main" });
              updateTaxDependentLabels(state().meta.taxesEnabled !== false);
              SEM.renderItems();
              SEM.applyColumnHiding?.();
            });
            syncTaxMenuUiLocal(state().meta.taxesEnabled !== false ? "with" : "without", { updateSelect: true });
            syncTaxModeDependentColumnToggles({ scope: "main" });

            const clientTypeSelectEl = getEl("clientType");
            const clientTypeMenu = getEl("clientTypeMenu");
            const clientTypePanel = getEl("clientTypePanel");
            const clientTypeDisplay = getEl("clientTypeDisplay");
            const clientTypeToggle = clientTypeMenu?.querySelector("summary") || null;
            const CLIENT_TYPE_LABELS = {
              societe: "Societe / personne morale",
              particulier: "Particulier",
              personne_physique: "Personne physique"
            };
            const normalizeClientTypeValue = (value) =>
              CLIENT_TYPE_LABELS[String(value || "").toLowerCase()] ? String(value || "").toLowerCase() : "societe";

            function syncClientTypeMenuUiLocal(value, { updateSelect = false, closeMenu = false } = {}) {
              const normalized = normalizeClientTypeValue(value);
              if (updateSelect && clientTypeSelectEl) {
                clientTypeSelectEl.value = normalized;
              }
              if (clientTypeDisplay) {
                clientTypeDisplay.textContent = CLIENT_TYPE_LABELS[normalized];
              }
              if (clientTypePanel) {
                clientTypePanel.querySelectorAll("[data-client-type-option]").forEach((btn) => {
                  const isMatch = btn.dataset.clientTypeOption === normalized;
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                });
              }
              if (closeMenu && clientTypeMenu && clientTypeMenu.open) {
                clientTypeMenu.open = false;
              }
              if (clientTypeToggle) {
                clientTypeToggle.setAttribute("aria-expanded", clientTypeMenu?.open ? "true" : "false");
              }
              return normalized;
            }

            if (typeof w === "object") {
              w.syncClientTypeMenuUi = syncClientTypeMenuUiLocal;
            }

            clientTypeMenu?.addEventListener("toggle", () => {
              if (!clientTypeToggle) return;
              clientTypeToggle.setAttribute("aria-expanded", clientTypeMenu.open ? "true" : "false");
            });

            clientTypePanel?.addEventListener("click", (evt) => {
              const btn = evt.target.closest("[data-client-type-option]");
              if (!btn) return;
              evt.preventDefault();
              const optionValue = btn.dataset.clientTypeOption;
              if (!optionValue) return;
              syncClientTypeMenuUiLocal(optionValue, { updateSelect: true, closeMenu: true });
              clientTypeSelectEl?.dispatchEvent(new Event("change", { bubbles: true }));
              clientTypeToggle?.focus();
            });

            document.addEventListener("click", (evt) => {
              if (!clientTypeMenu?.open) return;
              if (clientTypeMenu.contains(evt.target)) return;
              clientTypeMenu.open = false;
              clientTypeToggle?.setAttribute("aria-expanded", "false");
            });

            syncClientTypeMenuUiLocal(clientTypeSelectEl?.value || "societe");

            clientTypeSelectEl?.addEventListener("change", () => {
              const normalized = normalizeClientTypeValue(
                getStr("clientType", state().client.type || "societe")
              );
              state().client.type = normalized;
              syncClientTypeMenuUiLocal(normalized, { updateSelect: false });
              SEM.updateClientIdLabel();
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientName")   ?.addEventListener("input", () => {
              state().client.name = getStr("clientName", state().client.name);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientBeneficiary")?.addEventListener("input", () => {
              state().client.benefit = getStr("clientBeneficiary", state().client.benefit);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientAccount")?.addEventListener("input", () => {
              state().client.account = getStr("clientAccount", state().client.account);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientSoldClient")?.addEventListener("input", () => {
              const raw = getStr("clientSoldClient", state().client.soldClient);
              state().client.soldClient = formatSoldClientValue(raw);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientSoldClient")?.addEventListener("blur", (evt) => {
              const input = evt.currentTarget;
              const formatted = formatSoldClientValue(input?.value ?? "");
              if (input && formatted && input.value !== formatted) {
                input.value = formatted;
              }
              if (formatted) state().client.soldClient = formatted;
            });
            getEl("clientStegRef")?.addEventListener("input", () => {
              state().client.stegRef = getStr("clientStegRef", state().client.stegRef);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientEmail")  ?.addEventListener("input", () => {
              state().client.email = getStr("clientEmail", state().client.email);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientPhone")  ?.addEventListener("input", () => {
              state().client.phone = getStr("clientPhone", state().client.phone);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientVat")    ?.addEventListener("input", () => {
              state().client.vat = getStr("clientVat", state().client.vat);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("clientAddress")?.addEventListener("input", () => {
              state().client.address = getStr("clientAddress", state().client.address);
              SEM.evaluateClientDirtyState?.();
              refreshClientSummary();
            });
            getEl("notes")?.addEventListener("input", () => {
              state().notes = getStr("notes", state().notes);
              SEM.updateAmountWordsBlock?.();
            });
            getEl("noteInterne")?.addEventListener("input", () => {
              const meta = state().meta || (state().meta = {});
              meta.noteInterne = getStr("noteInterne", meta.noteInterne ?? "");
            });

            const CLIENT_SNAPSHOT_FIELDS = [
              "type",
              "name",
              "benefit",
              "account",
              "soldClient",
              "vat",
              "stegRef",
              "phone",
              "email",
              "address",
              "__path"
            ];
            const CLIENT_FORM_BASE_INPUT_IDS = [
              "clientType",
              "clientName",
              "clientBeneficiary",
              "clientAccount",
              "clientSoldClient",
              "clientVat",
              "clientStegRef",
              "clientPhone",
              "clientEmail",
              "clientAddress"
            ];
            const CLIENT_FORM_INPUT_IDS = new Set(
              uniqClientFormIds([
                ...CLIENT_FORM_BASE_INPUT_IDS,
                ...CLIENT_FORM_BASE_INPUT_IDS.map((id) => CLIENT_FORM_VENDOR_ID_ALIASES[id])
              ])
            );
            const getClientFormValue = (scopeNode, id, fallback = "") => {
              const canonicalId = toCanonicalClientFormId(id);
              const scopedInput = queryScopedClientFormElement(scopeNode, canonicalId);
              if (scopedInput && "value" in scopedInput) return String(scopedInput.value ?? "");
              const input = queryGlobalClientFormElement(canonicalId, scopeNode);
              if (input && "value" in input) return String(input.value ?? "");
              return String(fallback ?? "");
            };
            const updateClientIdLabelScoped = (scopeNode, typeValue) => {
              if (!scopeNode) return;
              const labelEl = queryScopedClientFormElement(scopeNode, "clientIdLabel");
              const vatInput = queryScopedClientFormElement(scopeNode, "clientVat");
              const resolvedType = normalizeClientTypeValue(typeValue);
              const isParticulier = resolvedType === "particulier";
              const labelText = isParticulier ? "CIN / passeport" : "Matricule fiscal";
              const placeholder = isParticulier ? "CIN ou Passeport" : "ex: 1284118/W/A/M/000";
              if (labelEl) labelEl.textContent = labelText;
              if (vatInput) vatInput.placeholder = placeholder;
            };
            const updateClientTypeDisplayScoped = (scopeNode, typeValue) => {
              if (!scopeNode) return;
              const resolvedType = normalizeClientTypeValue(typeValue);
              const displayText = CLIENT_TYPE_LABELS[resolvedType] || CLIENT_TYPE_LABELS.societe;
              const displayEl = queryScopedClientFormElement(scopeNode, "clientTypeDisplay");
              if (displayEl) displayEl.textContent = displayText;
              const panel = queryScopedClientFormElement(scopeNode, "clientTypePanel");
              if (panel) {
                panel.querySelectorAll("[data-client-type-option]").forEach((btn) => {
                  const isMatch = btn.dataset.clientTypeOption === resolvedType;
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                });
              }
              const menu = queryScopedClientFormElement(scopeNode, "clientTypeMenu");
              if (menu && menu.open) {
                menu.open = false;
              }
              const toggle = menu?.querySelector("summary");
              if (toggle) {
                toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
              }
            };
            const captureClientSnapshotFromScope = (scopeNode) => {
              const currentState = state().client || {};
              const soldFallback = currentState.soldClient ?? "";
              const typeRaw = getClientFormValue(scopeNode, "clientType", currentState.type || "societe");
              const snapshot = {
                type: normalizeClientTypeValue(typeRaw),
                name: getClientFormValue(scopeNode, "clientName", currentState.name || ""),
                benefit: getClientFormValue(scopeNode, "clientBeneficiary", currentState.benefit || ""),
                account: getClientFormValue(scopeNode, "clientAccount", currentState.account || ""),
                soldClient: formatSoldClientValue(getClientFormValue(scopeNode, "clientSoldClient", soldFallback)),
                vat: getClientFormValue(scopeNode, "clientVat", currentState.vat || ""),
                stegRef: getClientFormValue(scopeNode, "clientStegRef", currentState.stegRef || ""),
                phone: getClientFormValue(scopeNode, "clientPhone", currentState.phone || ""),
                email: getClientFormValue(scopeNode, "clientEmail", currentState.email || ""),
                address: getClientFormValue(scopeNode, "clientAddress", currentState.address || ""),
                __path: currentState.__path || SEM.clientFormBaseline?.__path || ""
              };
              return sanitizeClientSnapshot(snapshot);
            };
            const applyClientSnapshotToState = (snapshot) => {
              const st = SEM.state || (SEM.state = {});
              st.client = { ...(st.client || {}), ...snapshot, __path: snapshot.__path || st.client?.__path || "" };
              refreshClientSummary();
            };
            const evaluateClientDirtyFromSnapshot = (snapshot, scopeNode) => {
              const baseline = SEM.clientFormBaseline;
              if (!baseline?.__path) {
                SEM.clientFormDirty = false;
                if (state().client) state().client.__dirty = false;
                SEM.refreshUpdateClientButton?.(scopeNode);
                return false;
              }
              const normalized = sanitizeClientSnapshot(snapshot);
              const dirty = CLIENT_SNAPSHOT_FIELDS.some((field) => normalized[field] !== baseline[field]);
              SEM.clientFormDirty = dirty;
              if (state().client) state().client.__dirty = dirty;
              SEM.refreshUpdateClientButton?.(scopeNode);
              return dirty;
            };
            const handleClientBoxInput = (evt) => {
              const target = evt.target;
              if (!(target instanceof HTMLElement)) return;
              const canonicalTargetId = toCanonicalClientFormId(target.id);
              if (!CLIENT_FORM_INPUT_IDS.has(target.id) && !CLIENT_FORM_INPUT_IDS.has(canonicalTargetId)) return;
              const formScope = target.closest(CLIENT_SCOPE_SELECTOR);
              if (!formScope) return;
              const snapshot = captureClientSnapshotFromScope(formScope);
              applyClientSnapshotToState(snapshot);
              if (canonicalTargetId === "clientType") {
                updateClientIdLabelScoped(formScope, snapshot.type);
                updateClientTypeDisplayScoped(formScope, snapshot.type);
              }
              evaluateClientDirtyFromSnapshot(snapshot, formScope);
              SEM.refreshClientActionButtons?.();
            };
            document.addEventListener("input", handleClientBoxInput);
            document.addEventListener("change", handleClientBoxInput);

            const getClientFormPopoverContext = (node) => {
              const scope = node?.closest?.(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              if (!scope) return null;
              let popover = null;
              if (
                scope.id === "clientSavedModal" ||
                scope.id === "clientSavedModalNv" ||
                scope.id === "fournisseurSavedModal" ||
                scope.id === "fournisseurSavedModalNv"
              ) {
                popover = scope.querySelector(
                  getClientSavedModalEntityType() === "vendor" ? "#fournisseurFormPopover" : "#clientFormPopover"
                );
              }
              if (!popover) {
                popover = scope.querySelector("#clientFormPopover, #fournisseurFormPopover");
              }
              const toggle = scope.querySelector("#clientFormToggleBtn");
              if (!popover) return null;
              return { scope, popover, toggle };
            };

            const resetClientFormPopoverFields = (scopeNode) => {
              if (!scopeNode) return;
              const blankClient = {
                type: "societe",
                name: "",
                vat: "",
                phone: "",
                email: "",
                address: ""
              };
              syncClientFormFields(blankClient, scopeNode);
              SEM.clientFormDirty = false;
              if (state().client) state().client.__dirty = false;
              SEM.refreshUpdateClientButton?.(scopeNode);
              SEM.refreshClientActionButtons?.();
            };

            const setClientFormPopoverMode = (ctx, mode = "default") => {
              if (!ctx?.popover) return;
              ctx.popover.dataset.clientFormMode = mode;
              const isItemsDocOptionsContext =
                !!ctx.scope?.closest?.("#itemsDocOptionsModal") || isItemsDocOptionsModalOpen();
              const entityType = resolveClientEntityType(ctx.popover);
              const resolvedModeForVendor = mode === "default" ? "create" : mode;
              const effectiveMode = entityType === "vendor" ? resolvedModeForVendor : mode;
              if (entityType === "vendor") {
                ctx.popover.dataset.fournisseurFormMode = resolvedModeForVendor;
              } else {
                delete ctx.popover.dataset.fournisseurFormMode;
              }
              const updateBtn = queryScopedClientFormElement(ctx.popover, "btnUpdateClient");
              const saveBtn = queryScopedClientFormElement(ctx.popover, "btnSaveClient");
              const newBtn = queryScopedClientFormElement(ctx.popover, "btnNewClient");
              const rightActionsGroup = ctx.popover.querySelector(".swbDialog__group--right");
              const soldInput = queryScopedClientFormElement(ctx.popover, "clientSoldClient");
              const body = ctx.popover.querySelector(".client-form-modal__body");
              const isViewMode = effectiveMode === "view";
              if (rightActionsGroup) {
                rightActionsGroup.hidden = isViewMode;
                rightActionsGroup.setAttribute("aria-hidden", isViewMode ? "true" : "false");
              }
              if (body) {
                if (isViewMode) {
                  body.setAttribute("inert", "");
                  body.setAttribute("aria-disabled", "true");
                } else {
                  body.removeAttribute("inert");
                  body.removeAttribute("aria-disabled");
                }
                const formControls = body.querySelectorAll("input, textarea, select, button");
                formControls.forEach((control) => {
                  if (!(control instanceof HTMLElement)) return;
                  if (isViewMode) {
                    control.dataset.clientReadonlyPrevDisabled = control.disabled ? "1" : "0";
                    if ("readOnly" in control) {
                      control.dataset.clientReadonlyPrevReadonly = control.readOnly ? "1" : "0";
                      control.readOnly = true;
                    }
                    control.disabled = true;
                    control.setAttribute("aria-disabled", "true");
                    return;
                  }
                  if (control.dataset.clientReadonlyPrevDisabled !== undefined) {
                    control.disabled = control.dataset.clientReadonlyPrevDisabled === "1";
                    delete control.dataset.clientReadonlyPrevDisabled;
                  }
                  if ("readOnly" in control) {
                    if (control.dataset.clientReadonlyPrevReadonly !== undefined) {
                      control.readOnly = control.dataset.clientReadonlyPrevReadonly === "1";
                      delete control.dataset.clientReadonlyPrevReadonly;
                    } else {
                      control.readOnly = false;
                    }
                  }
                  control.setAttribute("aria-disabled", control.disabled ? "true" : "false");
                });
                if (!isViewMode && effectiveMode === "edit") {
                  body.querySelectorAll("input, textarea, select").forEach((control) => {
                    if (!(control instanceof HTMLElement)) return;
                    delete control.dataset.clientReadonlyPrevDisabled;
                    delete control.dataset.clientReadonlyPrevReadonly;
                    control.disabled = false;
                    if ("readOnly" in control) control.readOnly = false;
                    control.setAttribute("aria-disabled", "false");
                  });
                }
                const typeMenu = queryScopedClientFormElement(ctx.popover, "clientTypeMenu");
                const typeSummary = typeMenu?.querySelector("summary");
                if (typeMenu?.open && isViewMode) {
                  typeMenu.open = false;
                }
                if (typeSummary instanceof HTMLElement) {
                  if (isViewMode) {
                    typeSummary.dataset.clientReadonlyPrevTabIndex = String(typeSummary.tabIndex);
                    typeSummary.tabIndex = -1;
                    typeSummary.style.pointerEvents = "none";
                    typeSummary.setAttribute("aria-disabled", "true");
                  } else {
                    const prevTabIndex = typeSummary.dataset.clientReadonlyPrevTabIndex;
                    if (prevTabIndex !== undefined) {
                      const parsedTabIndex = Number(prevTabIndex);
                      if (Number.isFinite(parsedTabIndex)) {
                        typeSummary.tabIndex = parsedTabIndex;
                      } else {
                        typeSummary.removeAttribute("tabindex");
                      }
                      delete typeSummary.dataset.clientReadonlyPrevTabIndex;
                    } else {
                      typeSummary.removeAttribute("tabindex");
                    }
                    typeSummary.style.pointerEvents = "";
                    typeSummary.setAttribute("aria-disabled", "false");
                  }
                }
              }
              if (updateBtn) {
                const hideUpdate = isItemsDocOptionsContext || effectiveMode === "create" || isViewMode;
                updateBtn.hidden = hideUpdate;
                if (hideUpdate) {
                  updateBtn.disabled = true;
                  updateBtn.setAttribute("aria-disabled", "true");
                } else {
                  updateBtn.disabled = true;
                  updateBtn.setAttribute("aria-disabled", "true");
                  if (typeof SEM?.refreshUpdateClientButton === "function") {
                    SEM.refreshUpdateClientButton(ctx.popover);
                    updateBtn.setAttribute("aria-disabled", updateBtn.disabled ? "true" : "false");
                  }
                }
                updateBtn.setAttribute("aria-hidden", hideUpdate ? "true" : "false");
              }
              if (saveBtn) {
                const hideSave = effectiveMode === "edit" || isViewMode;
                saveBtn.hidden = hideSave;
                saveBtn.disabled = hideSave;
                saveBtn.setAttribute("aria-hidden", hideSave ? "true" : "false");
                if (effectiveMode === "create") {
                  saveBtn.disabled = true;
                  saveBtn.setAttribute("aria-disabled", "true");
                }
              }
              if (newBtn) {
                const hideNew = effectiveMode === "edit" || isViewMode;
                newBtn.hidden = hideNew;
                newBtn.disabled = hideNew;
                newBtn.setAttribute("aria-hidden", hideNew ? "true" : "false");
                if (effectiveMode === "create") {
                  newBtn.disabled = true;
                  newBtn.setAttribute("aria-disabled", "true");
                }
              }
              if (soldInput) {
                const lockSold = isViewMode;
                soldInput.disabled = lockSold;
                soldInput.readOnly = lockSold;
                soldInput.setAttribute("aria-disabled", lockSold ? "true" : "false");
              }
            };

            const setClientFormPopoverOpen = (ctx, open) => {
              if (!ctx) return;
              ctx.popover.classList.toggle("is-open", open);
              ctx.popover.hidden = !open;
              if (open) {
                ctx.popover.removeAttribute("hidden");
                ctx.popover.setAttribute("aria-hidden", "false");
              } else {
                ctx.popover.setAttribute("hidden", "");
                ctx.popover.setAttribute("aria-hidden", "true");
                resetClientFormPopoverFields(ctx.scope);
              }
              if (ctx.toggle) {
                ctx.toggle.setAttribute("aria-expanded", open ? "true" : "false");
              }
              if (open) {
                const modalIsOpen = document.querySelector(".client-fields-modal.is-open");
                const visibilityState = modalIsOpen ? clientFieldVisibilityDraft : clientFieldVisibility;
                const labelState = modalIsOpen ? clientFieldLabelsDraft : clientFieldLabels;
                applyClientFieldVisibility(ctx.popover, visibilityState);
                applyClientFieldLabels(ctx.popover, labelState);
                const popoverMode = String(ctx.popover.dataset.clientFormMode || "").toLowerCase();
                const focusTarget =
                  (popoverMode === "view"
                    ? ctx.popover.querySelector("[data-client-form-close]")
                    : queryScopedClientFormElement(ctx.popover, "clientName") ||
                      ctx.popover.querySelector("input, textarea, select"));
                if (focusTarget && typeof focusTarget.focus === "function") {
                  try {
                    focusTarget.focus({ preventScroll: true });
                  } catch {
                    try {
                      focusTarget.focus();
                    } catch {}
                  }
                }
              } else if (ctx.toggle && typeof ctx.toggle.focus === "function") {
                setClientFormPopoverMode(ctx, "default");
                try {
                  ctx.toggle.focus({ preventScroll: true });
                } catch {
                  try {
                    ctx.toggle.focus();
                  } catch {}
                }
              }
            };

            // Expose popover helpers for bootstrap runtime modules (e.g. saved-modals).
            SEM.getClientFormPopoverContext = getClientFormPopoverContext;
            SEM.setClientFormPopoverMode = setClientFormPopoverMode;
            SEM.setClientFormPopoverOpen = setClientFormPopoverOpen;

            const closeClientFormPopover = (scopeNode) => {
              const ctx =
                getClientFormPopoverContext(scopeNode) || {
                  scope: scopeNode,
                  popover: scopeNode?.querySelector?.("#clientFormPopover, #fournisseurFormPopover"),
                  toggle: scopeNode?.querySelector?.("#clientFormToggleBtn")
                };
              if (!ctx?.popover) return;
              setClientFormPopoverOpen(ctx, false);
            };

              document.addEventListener("click", (evt) => {
                const toggleBtn = evt.target?.closest?.("#clientFormToggleBtn");
                if (toggleBtn) {
                  evt.preventDefault();
                  let ctx = getClientFormPopoverContext(toggleBtn);
                  if (!ctx) {
                    const fallbackScope = toggleBtn.closest("#clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv")
                      ? document.getElementById("FournisseurBoxNewDoc")
                      : document.getElementById("clientBoxNewDoc");
                    ctx = getClientFormPopoverContext(fallbackScope);
                  }
                  if (!ctx) return;
                  const isOpen = !ctx.popover.hidden;
                  if (!isOpen) {
                    resetClientFormToNew(ctx.scope);
                  }
                  const mode = toggleBtn.closest("#clientBoxMainscreen") ? "create" : "default";
                  setClientFormPopoverMode(ctx, mode);
                  setClientFormPopoverOpen(ctx, !isOpen);
                  if (typeof SEM?.refreshClientActionButtons === "function") {
                    SEM.refreshClientActionButtons();
                  }
                  return;
                }
                const closeBtn = evt.target?.closest?.("[data-client-form-close]");
                if (closeBtn) {
                  const ctx = getClientFormPopoverContext(closeBtn);
                  if (ctx) {
                    setClientFormPopoverOpen(ctx, false);
                    return;
                  }
                  const popover = closeBtn.closest("#clientFormPopover, #fournisseurFormPopover");
                  if (popover) {
                    popover.classList.remove("is-open");
                    popover.hidden = true;
                    popover.setAttribute("aria-hidden", "true");
                    const scopeNode = popover.closest(
                      `#clientBoxNewDoc, #clientBoxMainscreen, ${MAIN_SCOPE_SELECTOR}, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv`
                    );
                    if (scopeNode) resetClientFormPopoverFields(scopeNode);
                  }
                  return;
                }
                const openPopover = document.querySelector(
                  `#clientBoxNewDoc #clientFormPopover:not([hidden]), ${MAIN_CLIENT_SCOPE_SELECTOR} #clientFormPopover:not([hidden]), #FournisseurBoxNewDoc #fournisseurFormPopover:not([hidden]), ${MAIN_VENDOR_SCOPE_SELECTOR} #fournisseurFormPopover:not([hidden]), #clientSavedModal #clientFormPopover:not([hidden]), #clientSavedModal #fournisseurFormPopover:not([hidden]), #clientSavedModalNv #clientFormPopover:not([hidden]), #clientSavedModalNv #fournisseurFormPopover:not([hidden]), #fournisseurSavedModal #clientFormPopover:not([hidden]), #fournisseurSavedModal #fournisseurFormPopover:not([hidden]), #fournisseurSavedModalNv #clientFormPopover:not([hidden]), #fournisseurSavedModalNv #fournisseurFormPopover:not([hidden])`
                );
                if (!openPopover) return;
                const dialogTarget = evt.target?.closest?.("#swbDialog");
                if (dialogTarget) return;
                if (openPopover.contains(evt.target)) return;
                const confirmDialog = document.getElementById("swbDialog");
                if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                  return;
                }
                const scopeNode = openPopover.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                const toggle = scopeNode?.querySelector("#clientFormToggleBtn");
                if (toggle && toggle.contains(evt.target)) return;
                closeClientFormPopover(scopeNode);
              });

              document.addEventListener("keydown", (evt) => {
                if (evt.key !== "Escape") return;
                const openPopover = document.querySelector(
                  `#clientBoxNewDoc #clientFormPopover:not([hidden]), ${MAIN_CLIENT_SCOPE_SELECTOR} #clientFormPopover:not([hidden]), #FournisseurBoxNewDoc #fournisseurFormPopover:not([hidden]), ${MAIN_VENDOR_SCOPE_SELECTOR} #fournisseurFormPopover:not([hidden]), #clientSavedModal #clientFormPopover:not([hidden]), #clientSavedModal #fournisseurFormPopover:not([hidden]), #clientSavedModalNv #clientFormPopover:not([hidden]), #clientSavedModalNv #fournisseurFormPopover:not([hidden]), #fournisseurSavedModal #clientFormPopover:not([hidden]), #fournisseurSavedModal #fournisseurFormPopover:not([hidden]), #fournisseurSavedModalNv #clientFormPopover:not([hidden]), #fournisseurSavedModalNv #fournisseurFormPopover:not([hidden])`
                );
                if (!openPopover) return;
                const dialogTarget = evt.target?.closest?.("#swbDialog");
                if (dialogTarget) return;
                const confirmDialog = document.getElementById("swbDialog");
                if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                  return;
                }
                const scopeNode = openPopover.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                closeClientFormPopover(scopeNode);
              });

            const resolveArticleFormToggle = (node) => {
              const directToggle = node?.closest?.("#articleFormToggleBtn, #articleCreateBtn");
              if (directToggle) return directToggle;
              const expandedToggle = document.querySelector(
                "#articleFormToggleBtn[aria-expanded='true'], #articleCreateBtn[aria-expanded='true']"
              );
              if (expandedToggle) return expandedToggle;
              return (
                document.getElementById("articleFormToggleBtn") ||
                document.getElementById("articleCreateBtn") ||
                null
              );
            };
            const getArticleFormPopoverContext = (node) => {
              const popover = getEl("articleFormPopover");
              if (!popover) return null;
              const toggle = resolveArticleFormToggle(node);
              return { scope: popover, popover, toggle };
            };

            let articleFormPopoverPrevScope = null;

            const setArticlePopoverSelectedRecord = (popover, record = null, index = null) => {
              if (!popover) return;
              delete popover.dataset.articleSavedIndex;
              delete popover.dataset.articleSavedPath;
              if (!record || typeof record !== "object") return;
              if (Number.isFinite(index)) {
                popover.dataset.articleSavedIndex = String(Math.max(0, Math.trunc(index)));
              }
              const path = String(record.path || record?.article?.__path || record?.article?.__articlePath || "").trim();
              if (path) popover.dataset.articleSavedPath = path;
            };

            const resolveArticlePopoverSelectedRecord = (popover) => {
              if (!popover) return null;
              const list = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items : [];
              const idxRaw = popover.dataset.articleSavedIndex;
              if (idxRaw !== undefined) {
                const idx = Number(idxRaw);
                if (Number.isFinite(idx) && idx >= 0 && idx < list.length) {
                  const direct = list[idx];
                  if (direct) return direct;
                }
              }
              const selectedPath = String(popover.dataset.articleSavedPath || "").trim();
              if (!selectedPath) return null;
              return list.find((entry) => String(entry?.path || "").trim() === selectedPath) || null;
            };

            const addArticleFromPopoverSelection = async (popover) => {
              if (!popover) return false;
              const selected = resolveArticlePopoverSelectedRecord(popover);
              if (selected) {
                addArticleToItems(selected.article || {}, { path: selected.path });
                return true;
              }
              const captured = SEM.forms?.captureArticleFromForm?.() || {};
              const hasRef = (captured.ref || "").trim();
              const hasProduct = (captured.product || "").trim();
              const hasDesc = (captured.desc || "").trim();
              if (!hasRef && !hasProduct && !hasDesc) {
                const missingItemMessage = getMessage("ITEM_REQUIRED_FIELDS");
                await showDialog?.(missingItemMessage.text, { title: missingItemMessage.title });
                return false;
              }
              addArticleToItems(captured, { path: SEM.articleEditContext?.path || "" });
              return true;
            };

            const resetArticleFormPopoverFields = (scopeNode) => {
              if (!scopeNode) return;
              SEM.clearArticleEditContext?.();
              SEM.clearAddForm?.();
              SEM.markItemFormDirty?.(false);
              SEM.markArticleFormDirty?.(false);
              SEM.updateAddFormTotals?.();
            };

            const setArticleFormPopoverMode = (ctx, mode = "default") => {
              if (!ctx?.popover) return;
              ctx.popover.dataset.articleFormMode = mode;
              ctx.popover.dataset.mode = mode === "view" ? "preview" : "edit";
              if (mode !== "edit") delete ctx.popover.dataset.itemEditIndex;
              const saveBtn = ctx.popover.querySelector("#btnSaveArticle");
              const addBtn = ctx.popover.querySelector("#btnAddArticleFromPopover");
              const addAndSaveBtn = ctx.popover.querySelector("#btnAddAndSaveArticleFromPopover");
              const newBtn = ctx.popover.querySelector("#btnNewItem");
              const updateBtn = ctx.popover.querySelector("#btnUpdateSavedArticle");
              const updateInvoiceBtn = ctx.popover.querySelector("#btnUpdateInvoiceItem");
              const rightActionsGroup = ctx.popover.querySelector(".swbDialog__group--right");
              const body = ctx.popover.querySelector(".article-form-modal__body");
              const isEdit = mode === "edit";
              const isViewMode = mode === "view";
              const useQuickAddActions = !isEdit && ctx.toggle?.id === "articleFormToggleBtn";
              ctx.popover.dataset.articleActionMode = useQuickAddActions ? "add-save" : "default";
              if (rightActionsGroup) {
                const hideRightActions = isViewMode;
                rightActionsGroup.hidden = hideRightActions;
                rightActionsGroup.setAttribute("aria-hidden", hideRightActions ? "true" : "false");
              }
              if (saveBtn) {
                const hideSave = useQuickAddActions || isEdit || isViewMode;
                saveBtn.hidden = hideSave;
                saveBtn.disabled = true;
                saveBtn.setAttribute("aria-hidden", hideSave ? "true" : "false");
                saveBtn.setAttribute("aria-disabled", "true");
              }
              if (addBtn) {
                addBtn.hidden = !useQuickAddActions;
                addBtn.disabled = true;
                addBtn.setAttribute("aria-hidden", useQuickAddActions ? "false" : "true");
                addBtn.setAttribute("aria-disabled", "true");
              }
              if (addAndSaveBtn) {
                addAndSaveBtn.hidden = !useQuickAddActions;
                addAndSaveBtn.disabled = true;
                addAndSaveBtn.setAttribute("aria-hidden", useQuickAddActions ? "false" : "true");
                addAndSaveBtn.setAttribute("aria-disabled", "true");
              }
              if (newBtn) {
                const hideNew = isEdit || isViewMode;
                newBtn.hidden = hideNew;
                newBtn.disabled = true;
                newBtn.setAttribute("aria-hidden", hideNew ? "true" : "false");
                newBtn.setAttribute("aria-disabled", "true");
              }
              if (updateBtn) {
                const showUpdate = !useQuickAddActions && isEdit && !isViewMode;
                updateBtn.hidden = !showUpdate;
                updateBtn.setAttribute("aria-hidden", showUpdate ? "false" : "true");
                if (!showUpdate) {
                  updateBtn.disabled = true;
                  updateBtn.setAttribute("aria-disabled", "true");
                } else {
                  updateBtn.disabled = true;
                  updateBtn.setAttribute("aria-disabled", "true");
                  if (typeof SEM?.refreshArticleUpdateButton === "function") {
                    SEM.refreshArticleUpdateButton(ctx.popover);
                    updateBtn.setAttribute("aria-disabled", updateBtn.disabled ? "true" : "false");
                  }
                }
              }
              if (updateInvoiceBtn) {
                const showInvoiceUpdate = !useQuickAddActions && isEdit && !isViewMode;
                updateInvoiceBtn.hidden = !showInvoiceUpdate;
                updateInvoiceBtn.setAttribute("aria-hidden", showInvoiceUpdate ? "false" : "true");
                if (!showInvoiceUpdate) {
                  updateInvoiceBtn.disabled = true;
                  updateInvoiceBtn.setAttribute("aria-disabled", "true");
                } else {
                  updateInvoiceBtn.disabled = true;
                  updateInvoiceBtn.setAttribute("aria-disabled", "true");
                }
              }
              if (body) {
                if (isViewMode) {
                  body.setAttribute("inert", "");
                  body.setAttribute("aria-disabled", "true");
                } else {
                  body.removeAttribute("inert");
                  body.removeAttribute("aria-disabled");
                }
                const formControls = body.querySelectorAll("input, textarea, select, button, summary");
                formControls.forEach((control) => {
                  if (!(control instanceof HTMLElement)) return;
                  if (isViewMode) {
                    if (control.dataset.articleReadonlyPrevDisabled === undefined) {
                      control.dataset.articleReadonlyPrevDisabled = control.disabled ? "1" : "0";
                    }
                    if ("readOnly" in control && control.dataset.articleReadonlyPrevReadonly === undefined) {
                      control.dataset.articleReadonlyPrevReadonly = control.readOnly ? "1" : "0";
                    }
                    if (control.dataset.articleReadonlyPrevTabindex === undefined) {
                      control.dataset.articleReadonlyPrevTabindex = control.hasAttribute("tabindex")
                        ? String(control.getAttribute("tabindex") ?? "")
                        : "__none__";
                    }
                    if ("readOnly" in control) {
                      control.readOnly = true;
                    }
                    control.disabled = false;
                    control.setAttribute("tabindex", "-1");
                    control.setAttribute("aria-disabled", "false");
                    return;
                  }
                  if (control.dataset.articleReadonlyPrevDisabled !== undefined) {
                    control.disabled = control.dataset.articleReadonlyPrevDisabled === "1";
                    delete control.dataset.articleReadonlyPrevDisabled;
                  }
                  if ("readOnly" in control && control.dataset.articleReadonlyPrevReadonly !== undefined) {
                    control.readOnly = control.dataset.articleReadonlyPrevReadonly === "1";
                    delete control.dataset.articleReadonlyPrevReadonly;
                  }
                  if (control.dataset.articleReadonlyPrevTabindex !== undefined) {
                    const prevTabindex = control.dataset.articleReadonlyPrevTabindex;
                    if (prevTabindex === "__none__") {
                      control.removeAttribute("tabindex");
                    } else {
                      control.setAttribute("tabindex", prevTabindex);
                    }
                    delete control.dataset.articleReadonlyPrevTabindex;
                  }
                  control.setAttribute("aria-disabled", control.disabled ? "true" : "false");
                });
              }
              if (SEM.stockWindow?.syncUi) {
                SEM.stockWindow.syncUi(ctx.popover);
              }
              if (typeof SEM?.refreshArticleUpdateButton === "function") {
                SEM.refreshArticleUpdateButton(ctx.popover);
              }
            };

            const setArticleFormPopoverOpen = (ctx, open) => {
              if (!ctx) return;
              ctx.popover.classList.toggle("is-open", open);
              ctx.popover.hidden = !open;
              if (open) {
                ctx.popover.removeAttribute("hidden");
                ctx.popover.setAttribute("aria-hidden", "false");
                articleFormPopoverPrevScope = resolveAddFormScope();
                if (typeof SEM.setActiveAddFormScope === "function") {
                  SEM.setActiveAddFormScope(ctx.scope);
                }
                resetArticleFormPopoverFields(ctx.scope);
                const mode = String(ctx.popover.dataset.articleFormMode || "").toLowerCase();
                if (typeof SEM.setArticleFormBaseline === "function" && mode !== "edit") {
                  SEM.setArticleFormBaseline(null, {
                    scopeHint: ctx.scope,
                    path: SEM.ARTICLE_NEW_BASELINE_PATH || "__article_form_new__"
                  });
                }
                if (typeof SEM.evaluateArticleDirtyState === "function") {
                  SEM.evaluateArticleDirtyState(ctx.scope, { markDirtyWithoutBaseline: false });
                }
                SEM.applyColumnHiding?.();
              } else {
                ctx.popover.setAttribute("hidden", "");
                ctx.popover.setAttribute("aria-hidden", "true");
                setArticlePopoverSelectedRecord(ctx.popover, null);
                delete ctx.popover.dataset.itemEditIndex;
                if (typeof SEM.setActiveAddFormScope === "function") {
                  SEM.setActiveAddFormScope(ctx.scope);
                }
                resetArticleFormPopoverFields(ctx.scope);
                if (typeof SEM.setActiveAddFormScope === "function") {
                  SEM.setActiveAddFormScope(articleFormPopoverPrevScope);
                }
                articleFormPopoverPrevScope = null;
              }
              const articleFormToggles = Array.from(
                document.querySelectorAll("#articleFormToggleBtn, #articleCreateBtn")
              );
              if (articleFormToggles.length) {
                articleFormToggles.forEach((btn) => {
                  const isActiveToggle = open && ctx.toggle && btn === ctx.toggle;
                  btn.setAttribute("aria-expanded", isActiveToggle ? "true" : "false");
                });
              } else if (ctx.toggle) {
                ctx.toggle.setAttribute("aria-expanded", open ? "true" : "false");
              }
              if (open) {
                const popoverMode = String(ctx.popover.dataset.articleFormMode || "").toLowerCase();
                const focusTarget =
                  (popoverMode === "view"
                    ? ctx.popover.querySelector("[data-article-form-close]")
                    : ctx.popover.querySelector("#addRef") ||
                      ctx.popover.querySelector("#addProduct") ||
                      ctx.popover.querySelector("input, textarea, select"));
                if (focusTarget && typeof focusTarget.focus === "function") {
                  try {
                    focusTarget.focus({ preventScroll: true });
                  } catch {
                    try {
                      focusTarget.focus();
                    } catch {}
                  }
                }
              } else if (ctx.toggle && typeof ctx.toggle.focus === "function") {
                try {
                  ctx.toggle.focus({ preventScroll: true });
                } catch {
                  try {
                    ctx.toggle.focus();
                  } catch {}
                }
              }
            };

            // Expose article popover helpers for bootstrap runtime modules (e.g. saved-modals).
            SEM.getArticleFormPopoverContext = getArticleFormPopoverContext;
            SEM.setArticlePopoverSelectedRecord = setArticlePopoverSelectedRecord;
            SEM.setArticleFormPopoverMode = setArticleFormPopoverMode;
            SEM.setArticleFormPopoverOpen = setArticleFormPopoverOpen;

            const closeArticleFormPopover = (scopeNode) => {
              const ctx =
                getArticleFormPopoverContext(scopeNode) || {
                  scope: scopeNode,
                  popover: scopeNode?.querySelector?.("#articleFormPopover"),
                  toggle: scopeNode?.querySelector?.("#articleFormToggleBtn") || getEl("articleCreateBtn")
                };
              if (!ctx?.popover) return;
              setArticleFormPopoverOpen(ctx, false);
            };
            SEM.openArticleFormPopoverForUpdate = function openArticleFormPopoverForUpdate(options = {}) {
              const trigger =
                typeof HTMLElement !== "undefined" && options?.trigger instanceof HTMLElement
                  ? options.trigger
                  : null;
              const selectedItemIndex = Number(options?.selectedItemIndex);
              if (isArticleSavedModalOpen()) closeArticleSavedModal();
              const ctx =
                getArticleFormPopoverContext(trigger) ||
                getArticleFormPopoverContext(getEl("articleCreateBtn")) ||
                getArticleFormPopoverContext(getEl("articleFormToggleBtn"));
              if (!ctx?.popover) return null;
              if (Number.isFinite(selectedItemIndex) && selectedItemIndex >= 0) {
                ctx.popover.dataset.itemEditIndex = String(Math.trunc(selectedItemIndex));
              } else {
                delete ctx.popover.dataset.itemEditIndex;
              }
              setArticlePopoverSelectedRecord(ctx.popover, null);
              setArticleFormPopoverMode(ctx, "edit");
              setArticleFormPopoverOpen(ctx, true);
              return ctx;
            };

            document.addEventListener("click", async (evt) => {
              const toggleBtn = evt.target?.closest?.("#articleFormToggleBtn");
              if (toggleBtn) {
                evt.preventDefault();
                const ctx = getArticleFormPopoverContext(toggleBtn);
                if (!ctx) return;
                const isOpen = !ctx.popover.hidden;
                if (!isOpen) {
                  setArticlePopoverSelectedRecord(ctx.popover, null);
                  setArticleFormPopoverMode(ctx, "create");
                }
                setArticleFormPopoverOpen(ctx, !isOpen);
                return;
              }
              const createBtn = evt.target?.closest?.("#articleCreateBtn");
              if (createBtn) {
                evt.preventDefault();
                if (isArticleSavedModalOpen()) closeArticleSavedModal();
                const ctx = getArticleFormPopoverContext(createBtn);
                if (ctx) {
                  setArticlePopoverSelectedRecord(ctx.popover, null);
                  setArticleFormPopoverMode(ctx, "create");
                  setArticleFormPopoverOpen(ctx, true);
                }
                return;
              }
              const addOnlyBtn = evt.target?.closest?.("#btnAddArticleFromPopover");
              if (addOnlyBtn) {
                evt.preventDefault();
                if (addOnlyBtn.disabled) return;
                const ctx = getArticleFormPopoverContext(addOnlyBtn);
                if (!ctx?.popover) return;
                const added = await addArticleFromPopoverSelection(ctx.popover);
                if (added) {
                  setArticleFormPopoverOpen(ctx, false);
                }
                return;
              }
              const addAndSaveBtn = evt.target?.closest?.("#btnAddAndSaveArticleFromPopover");
              if (addAndSaveBtn) {
                evt.preventDefault();
                if (addAndSaveBtn.disabled) return;
                const ctx = getArticleFormPopoverContext(addAndSaveBtn);
                if (!ctx?.popover) return;
                const added = await addArticleFromPopoverSelection(ctx.popover);
                if (!added) return;
                if (typeof SEM.handleArticleSave === "function") {
                  await SEM.handleArticleSave({
                    requireUpdate: false,
                    trigger: ctx.popover.querySelector("#btnSaveArticle") || addAndSaveBtn
                  });
                  return;
                }
                const fallbackSaveBtn = ctx.popover.querySelector("#btnSaveArticle");
                if (fallbackSaveBtn && !fallbackSaveBtn.disabled) fallbackSaveBtn.click();
                return;
              }
              const updateInvoiceBtn = evt.target?.closest?.("#btnUpdateInvoiceItem");
              if (updateInvoiceBtn) {
                evt.preventDefault();
                if (updateInvoiceBtn.disabled) return;
                const ctx = getArticleFormPopoverContext(updateInvoiceBtn);
                if (!ctx?.popover || typeof SEM.submitItemForm !== "function") return;
                if (typeof SEM.setActiveAddFormScope === "function") {
                  SEM.setActiveAddFormScope(ctx.scope);
                }
                const datasetIndex = Number(ctx.popover.dataset.itemEditIndex);
                if (
                  (SEM.selectedItemIndex === null || SEM.selectedItemIndex === undefined) &&
                  Number.isFinite(datasetIndex) &&
                  datasetIndex >= 0
                ) {
                  SEM.selectedItemIndex = Math.trunc(datasetIndex);
                }
                if (typeof SEM.setSubmitMode === "function") {
                  SEM.setSubmitMode("update");
                }
                const updated = await SEM.submitItemForm({ updateLinkedArticle: false });
                if (updated) {
                  setArticleFormPopoverOpen(ctx, false);
                }
                return;
              }
              const closeBtn = evt.target?.closest?.("[data-article-form-close]");
              if (closeBtn) {
                const ctx = getArticleFormPopoverContext(closeBtn);
                if (ctx) setArticleFormPopoverOpen(ctx, false);
                return;
              }
              const openPopover = document.querySelector("#articleFormPopover:not([hidden])");
              if (!openPopover) return;
              const articlePopover = document.getElementById("articleFormPopover");
              const composedPath = typeof evt.composedPath === "function" ? evt.composedPath() : [];
              if (
                articlePopover &&
                (articlePopover.contains(evt.target) || composedPath.includes(articlePopover))
              ) {
                return;
              }
              const dialogTarget = evt.target?.closest?.("#swbDialog");
              if (dialogTarget) return;
              if (openPopover.contains(evt.target)) return;
              const confirmDialog = document.getElementById("swbDialog");
              if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                return;
              }
              return;
            });

            document.addEventListener("keydown", (evt) => {
              if (evt.key !== "Escape") return;
              const openPopover = document.querySelector("#articleFormPopover:not([hidden])");
              if (!openPopover) return;
              const dialogTarget = evt.target?.closest?.("#swbDialog");
              if (dialogTarget) return;
              const confirmDialog = document.getElementById("swbDialog");
              if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                return;
              }
              return;
            });

            document.addEventListener("click", (evt) => {
              const optionBtn = evt.target?.closest?.("[data-client-type-option]");
              if (!optionBtn) return;
              const scopeNode = optionBtn.closest(CLIENT_SCOPE_SELECTOR);
              if (!scopeNode) return;
              evt.preventDefault();
              const normalized = normalizeClientTypeValue(optionBtn.dataset.clientTypeOption);
              const select = queryScopedClientFormElement(scopeNode, "clientType");
              if (select) {
                select.value = normalized;
                select.dispatchEvent(new Event("change", { bubbles: true }));
              } else {
                updateClientTypeDisplayScoped(scopeNode, normalized);
                updateClientIdLabelScoped(scopeNode, normalized);
              }
            });

            let clientFolderFallbackWarned = false;

            const resetClientSearchScope = (scopeNode) => {
              if (!scopeNode) {
                clearClientSearchInputValue();
                hideClientSearchResults();
                return;
              }
              const scopedSearchInput = scopeNode.querySelector("#clientSearch");
              if (scopedSearchInput) scopedSearchInput.value = "";
              const scopedSearchResults = scopeNode.querySelector("#clientSearchResults");
              if (scopedSearchResults) {
                scopedSearchResults.innerHTML = "";
                scopedSearchResults.hidden = true;
                scopedSearchResults.classList.remove("client-search--paged");
              }
            };

              const resetClientFormToNew = (formScope, options = {}) => {
                const useScope =
                  formScope?.id === "clientBoxNewDoc" ||
                  formScope?.id === "FournisseurBoxNewDoc" ||
                  formScope?.id === "clientSavedModal" ||
                  formScope?.id === "clientSavedModalNv" ||
                  formScope?.id === "fournisseurSavedModal" ||
                  formScope?.id === "fournisseurSavedModalNv" ||
                  formScope?.id === "clientBoxMainscreen" ||
                  formScope?.id === MAIN_CLIENT_SCOPE_ID ||
                  formScope?.id === MAIN_VENDOR_SCOPE_ID ||
                  formScope?.id === "clientFormPopover" ||
                  formScope?.id === "fournisseurFormPopover"
                    ? formScope
                    : null;
                const performReset = () => {
                  const blankClient = { type: "societe", name: "", vat: "", phone: "", email: "", address: "", __path: "" };
                  if (SEM.forms?.fillClientToForm && !useScope) {
                    SEM.forms.fillClientToForm(blankClient);
                  } else {
                    syncClientFormFields(blankClient, useScope);
                  }
                  resetClientSearchScope(formScope);
                  const st = SEM.state || (SEM.state = {});
                  st.client = { ...blankClient };
                  refreshClientSummary();
                  SEM.clientFormDirty = false;
                  SEM.clientFormAllowUpdate = false;
                  if (SEM.setClientFormBaseline) SEM.setClientFormBaseline(null);
                  else SEM.refreshUpdateClientButton?.();
                  if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
                  if (!useScope && SEM.readInputs) SEM.readInputs();
                };
                const hasBaseline = !!SEM.clientFormBaseline?.__path;
                const hasContent =
                  typeof SEM.clientFormHasContent === "function"
                    ? SEM.clientFormHasContent(formScope)
                    : true;
                const unsavedChanges = hasBaseline ? !!SEM.clientFormDirty : hasContent;
                if (options.confirmDiscard && unsavedChanges && typeof SEM.confirmDiscardClientChanges === "function") {
                  SEM.confirmDiscardClientChanges(performReset);
                } else {
                  performReset();
                }
              };

              const handleNewClientClick = (evt) => {
                const trigger = evt.target?.closest?.("#btnNewClient, #btnNewFournisseur");
                if (!trigger) return;
                const formScope = trigger.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                resetClientFormToNew(formScope, { confirmDiscard: true });
              };
            document.addEventListener("click", handleNewClientClick);

            let clientSaveInProgress = false;
            const setSaveButtonBusyState = (button, busy) => {
              if (!(button instanceof HTMLElement)) return;
              if (busy) {
                button.dataset.saveInProgress = "1";
                button.disabled = true;
                button.setAttribute("aria-disabled", "true");
              } else {
                delete button.dataset.saveInProgress;
                button.disabled = false;
                button.setAttribute("aria-disabled", "false");
              }
            };
            const setUpdateButtonBusyState = (button, busy, scopeHint = null) => {
              if (!(button instanceof HTMLElement)) return;
              if (busy) {
                button.dataset.updateInProgress = "1";
              } else {
                delete button.dataset.updateInProgress;
              }
              SEM.clientUpdateInProgress = !!busy;
              if (busy) {
                button.disabled = true;
                button.setAttribute("aria-disabled", "true");
              }
              SEM.refreshUpdateClientButton?.(
                scopeHint || button.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR) || null
              );
            };

            const handleSaveClientClick = async (evt) => {
              const trigger = evt.target?.closest?.("#btnSaveClient, #btnSaveFournisseur");
              if (!trigger) return;
              if (clientSaveInProgress || trigger.dataset.saveInProgress === "1") return;
              const formScope = trigger.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              if (
                !formScope ||
                (formScope.id !== "clientBoxNewDoc" &&
                  formScope.id !== "FournisseurBoxNewDoc" &&
                  formScope.id !== "clientSavedModal" &&
                  formScope.id !== "clientSavedModalNv" &&
                  formScope.id !== "fournisseurSavedModal" && formScope.id !== "fournisseurSavedModalNv" &&
                  formScope.id !== "clientFormPopover" && formScope.id !== "fournisseurFormPopover")
              ) {
                return;
              }
              evt.preventDefault();
              clientSaveInProgress = true;
              setSaveButtonBusyState(trigger, true);
              const entityType = resolveClientEntityType(formScope);
              const client = captureClientSnapshotFromScope(formScope);
              applyClientSnapshotToState(client);
              evaluateClientDirtyFromSnapshot(client, formScope);
              try {
                const clientName = String(client.name || "").trim();
                const clientAccount = String(client.account || "").trim();
                const identifierCandidates = [
                  client.vat,
                  client.identifiantFiscal,
                  client.identifiant,
                  client.tva,
                  client.nif
                ];
                const hasIdentifier = identifierCandidates.some((value) => String(value || "").trim().length > 0);
                if (!clientName && !clientAccount && !hasIdentifier) {
                  const validationMessage = getMessage("CLIENT_REQUIRED_FIELDS");
                  await showDialog?.(validationMessage.text, { title: validationMessage.title });
                  return;
                }

                if (window.electronAPI?.ensureClientsSystemFolder) {
                  try {
                    const ensured = await window.electronAPI.ensureClientsSystemFolder({ entityType });
                    if (!ensured?.ok) {
                      const folderErrorMessage = getMessage("CLIENT_FOLDER_ADMIN_ERROR");
                      await showDialog?.(ensured?.message || folderErrorMessage.text, { title: folderErrorMessage.title });
                      return;
                    }
                    if (ensured?.fallback && ensured?.message && !clientFolderFallbackWarned) {
                      const infoMessage = getMessage("GENERIC_INFO");
                      await showDialog?.(ensured.message, { title: infoMessage.title });
                      clientFolderFallbackWarned = true;
                    }
                  } catch (err) {
                    console.error(err);
                    const genericFolderError = getMessage("CLIENT_FOLDER_GENERIC_ERROR");
                    await showDialog?.(genericFolderError.text, { title: genericFolderError.title });
                    return;
                  }
                }

                if (!window.electronAPI?.saveClientDirect) {
                  const featureUnavailable = getMessage("FEATURE_UNAVAILABLE");
                  await showDialog?.(featureUnavailable.text, { title: featureUnavailable.title });
                  return;
                }

                const suggested =
                  SEM.forms?.pickSuggestedClientName?.(client) ||
                  client.name ||
                  client.vat ||
                  client.email ||
                  client.phone ||
                  "client";
                const res = await window.electronAPI.saveClientDirect({
                  client,
                  suggestedName: suggested,
                  entityType
                });
                if (res?.ok) {
                  const resolvedPath = res.path || client.__path || SEM.state?.client?.__path || "";
                  if (resolvedPath) client.__path = resolvedPath;
                  const st = SEM.state || (SEM.state = {});
                  st.client = { ...(st.client || {}), ...client, __path: client.__path || st.client?.__path || "" };
                  refreshClientSummary();
                  if (SEM.setClientFormBaseline) {
                    const snapshotBase = sanitizeClientSnapshot({ ...client, __path: client.__path || "" });
                    SEM.setClientFormBaseline(snapshotBase, entityType);
                  } else {
                    SEM.clientFormBaseline = sanitizeClientSnapshot({ ...client, __path: client.__path || "" });
                    SEM.clientFormDirty = false;
                    SEM.refreshClientActionButtons?.();
                  }
                  SEM.clientFormAllowUpdate = false;
                  evaluateClientDirtyFromSnapshot(client, formScope);
                  const formCtx = getClientFormPopoverContext(formScope);
                  if (formCtx) {
                    setClientFormPopoverOpen(formCtx, false);
                  } else if (formScope?.id === "clientFormPopover" || formScope?.id === "fournisseurFormPopover") {
                    formScope.classList.remove("is-open");
                    formScope.hidden = true;
                    formScope.setAttribute("aria-hidden", "true");
                    resetClientFormPopoverFields(formScope);
                  }
                  if (clientSavedModal?.classList.contains("is-open")) {
                    clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
                    const targetPage = Math.max(1, clientSavedModalState.page || 1);
                    fetchSavedClientsPage(targetPage);
                  }
                  const successMessage = getMessage("CLIENT_SAVE_SUCCESS");
                  if (typeof w.showToast === "function") {
                    w.showToast(successMessage.text);
                  } else {
                    await showDialog?.(successMessage.text, { title: successMessage.title });
                  }
                } else if (!res?.canceled) {
                  const saveError = getMessage("CLIENT_SAVE_FAILED");
                  await showDialog?.(res?.error || saveError.text, { title: saveError.title });
                }
              } catch (err) {
                console.error(err);
                const saveError = getMessage("CLIENT_SAVE_FAILED");
                await showDialog?.(saveError.text, { title: saveError.title });
              } finally {
                clientSaveInProgress = false;
                setSaveButtonBusyState(trigger, false);
                SEM.refreshClientActionButtons?.();
              }
            };
            document.addEventListener("click", handleSaveClientClick);

            const handleUpdateClientClick = async (evt) => {
              const trigger = evt.target?.closest?.("#btnUpdateClient, #btnUpdateFournisseur");
              if (!trigger) return;
              if (SEM.clientUpdateInProgress || trigger.dataset.updateInProgress === "1") return;
              const formScope = trigger.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              const entityType = resolveClientEntityType(formScope);
              const snapshot = captureClientSnapshotFromScope(formScope);
              applyClientSnapshotToState(snapshot);
              evaluateClientDirtyFromSnapshot(snapshot, formScope);
              if (!window.electronAPI?.updateClientDirect) {
                const unavailable = getMessage("CLIENT_UPDATE_UNAVAILABLE");
                await showDialog?.(unavailable.text, { title: unavailable.title });
                return;
              }
              const baseline = SEM.clientFormBaseline;
              if (!baseline?.__path) {
                const loadPrompt = getMessage("CLIENT_LOAD_OR_SAVE_REQUIRED");
                await showDialog?.(loadPrompt.text, { title: loadPrompt.title });
                return;
              }
              if (SEM.clientFormAllowUpdate === false) {
                const loadPrompt = getMessage("CLIENT_LOAD_OR_SAVE_REQUIRED");
                await showDialog?.(loadPrompt.text, { title: loadPrompt.title });
                return;
              }
              if (!SEM.clientFormDirty) {
                const noChanges = getMessage("CLIENT_NO_CHANGES");
                await showDialog?.(noChanges.text, { title: noChanges.title });
                return;
              }
              const client = { ...snapshot };
              const path = baseline.__path || client.__path || SEM.state?.client?.__path || "";
              if (!path) {
                const pathMissing = getMessage("CLIENT_PATH_MISSING");
                await showDialog?.(pathMissing.text, { title: pathMissing.title });
                return;
              }
              setUpdateButtonBusyState(trigger, true, formScope);
              try {
                const suggested =
                  SEM.forms?.pickSuggestedClientName?.(client) ||
                  client.name ||
                  client.vat ||
                  client.email ||
                  client.phone ||
                  "client";
                const res = await window.electronAPI.updateClientDirect({
                  client,
                  path,
                  suggestedName: suggested,
                  entityType
                });
                if (res?.ok) {
                  const resolvedPath = res.path || path;
                  client.__path = resolvedPath;
                  const st = SEM.state || (SEM.state = {});
                  st.client = { ...(st.client || {}), ...client, __path: resolvedPath };
                  refreshClientSummary();
                  if (
                    !formScope ||
                    (formScope.id !== "clientBoxNewDoc" &&
                      formScope.id !== "FournisseurBoxNewDoc" &&
                      formScope.id !== "fournisseurSavedModal" && formScope.id !== "fournisseurSavedModalNv")
                  ) {
                    if (SEM.readInputs) SEM.readInputs();
                  }
                  if (SEM.setClientFormBaseline) {
                    const snapshotBase = { ...client, __path: resolvedPath };
                    SEM.setClientFormBaseline(snapshotBase, entityType);
                  }
                  SEM.clientFormAllowUpdate = true;
                  if (
                    formScope?.id === "clientBoxNewDoc" ||
                    formScope?.id === "FournisseurBoxNewDoc" ||
                    formScope?.id === "fournisseurSavedModal" || formScope?.id === "fournisseurSavedModalNv"
                  ) {
                    evaluateClientDirtyFromSnapshot(client, formScope);
                  } else if (SEM.evaluateClientDirtyState) {
                    SEM.evaluateClientDirtyState();
                  }
                  const formCtx = getClientFormPopoverContext(formScope);
                  if (formCtx) setClientFormPopoverOpen(formCtx, false);
                  if (clientSavedModal?.classList.contains("is-open")) {
                    clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
                    const targetPage = Math.max(1, clientSavedModalState.page || 1);
                    fetchSavedClientsPage(targetPage);
                  }
                  const updateSuccess = getMessage("CLIENT_UPDATE_SUCCESS");
                  await showDialog?.(updateSuccess.text, { title: updateSuccess.title });
                } else if (!res?.canceled) {
                  const updateError = getMessage("CLIENT_UPDATE_FAILED");
                  await showDialog?.(res?.error || updateError.text, { title: updateError.title });
                }
              } catch (err) {
                console.error(err);
                const updateError = getMessage("CLIENT_UPDATE_FAILED");
                await showDialog?.(updateError.text, { title: updateError.title });
              } finally {
                setUpdateButtonBusyState(trigger, false, formScope);
              }
            };
            document.addEventListener("click", handleUpdateClientClick);


            const normalizeClientMatchValue = (value) =>
              String(value || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");
            const updateClientSoldInItem = (item, soldValue) => {
              if (!item || typeof item !== "object") return false;
              const formatted = formatSoldClientValue(soldValue);
              let updated = false;
              if ("soldClient" in item) {
                item.soldClient = formatted;
                updated = true;
              }
              if (item.client && typeof item.client === "object") {
                if ("soldClient" in item.client) {
                  item.client.soldClient = formatted;
                  updated = true;
                }
              }
              return updated;
            };
            const matchesClientSoldUpdate = (item, detail) => {
              if (!item || typeof item !== "object") return false;
              const targetPath = String(detail?.clientPath || "").trim();
              if (targetPath) {
                const candidatePath =
                  String(item.path || item.clientPath || item?.client?.__path || item?.client?.path || "").trim();
                if (candidatePath && candidatePath === targetPath) return true;
              }
              const targetName = normalizeClientMatchValue(detail?.clientName || "");
              if (!targetName) return false;
              const candidateName = normalizeClientMatchValue(
                item.name || item.clientName || item?.client?.name || ""
              );
              if (!candidateName) return false;
              return (
                candidateName === targetName ||
                candidateName.includes(targetName) ||
                targetName.includes(candidateName)
              );
            };
            window.addEventListener("client-sold-updated", (evt) => {
              const detail = evt?.detail || {};
              const soldValue = detail.soldClient;
              let searchUpdated = false;
              const clientSearchData = getClientSearchData();
              if (clientSearchData.length) {
                clientSearchData.forEach((item) => {
                  if (matchesClientSoldUpdate(item, detail)) {
                    if (updateClientSoldInItem(item, soldValue)) searchUpdated = true;
                  }
                });
                const activeSearchResults = getDefaultClientSearchResults();
                const activeSearchInput = getDefaultClientSearchInput();
                if (searchUpdated && activeSearchResults && !activeSearchResults.hidden) {
                  const queryValue = activeSearchInput?.value || "";
                  renderClientSearchResults(clientSearchData, queryValue, activeSearchResults);
                }
              }
              if (clientSavedModalState?.items?.length) {
                let savedUpdated = false;
                clientSavedModalState.items.forEach((item) => {
                  if (matchesClientSoldUpdate(item, detail)) {
                    if (updateClientSoldInItem(item, soldValue)) savedUpdated = true;
                  }
                });
                if (savedUpdated && clientSavedModal?.classList?.contains("is-open")) {
                  renderClientSavedModal();
                }
              }
            });

            SEM.refreshUpdateClientButton?.();

            const existingPath = state()?.client?.__path || "";
            if (SEM.setClientFormBaseline) {
              if (existingPath) {
                const snapshot = SEM.getClientFormSnapshot ? SEM.getClientFormSnapshot() : (SEM.forms?.captureClientFromForm?.() || {});
                snapshot.__path = existingPath;
                SEM.setClientFormBaseline(snapshot, "client");
              } else {
                SEM.setClientFormBaseline(null);
              }
            }
            if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
  });
})(window);
