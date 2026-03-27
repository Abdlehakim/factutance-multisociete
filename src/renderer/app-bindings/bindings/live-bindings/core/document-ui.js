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
      MAIN_TRANSPORTER_SCOPE_ID = "clientBoxMainscreenTransporteursPanel",
      MAIN_SCOPE_SELECTOR = `#${MAIN_CLIENT_SCOPE_ID}, #${MAIN_VENDOR_SCOPE_ID}, #${MAIN_TRANSPORTER_SCOPE_ID}`,
      CLIENT_SCOPE_SELECTOR = "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #transporteurSavedModal, #transporteurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientBoxMainscreenTransporteursPanel, #clientFormPopover, #fournisseurFormPopover, #transporteurFormPopover",
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
      ctx.clientSavedModalEntityType === "transporter"
        ? "transporter"
        : ctx.clientSavedModalEntityType === "vendor"
          ? "vendor"
          : "client";
    const resolveClientPopoverSelector = (entityType = "client") =>
      entityType === "transporter"
        ? "#transporteurFormPopover"
        : entityType === "vendor"
          ? "#fournisseurFormPopover"
          : "#clientFormPopover";
    const CLIENT_OUTER_SCOPE_SELECTOR =
      "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #transporteurSavedModal, #transporteurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientBoxMainscreenTransporteursPanel, #clientBoxMainscreen";
    const CLIENT_POPOVER_SELECTOR =
      "#clientFormPopover, #fournisseurFormPopover, #transporteurFormPopover";
    const CLIENT_OPEN_POPOVER_SELECTOR =
      `#clientBoxNewDoc #clientFormPopover:not([hidden]), ${MAIN_CLIENT_SCOPE_ID ? `#${MAIN_CLIENT_SCOPE_ID}` : "#clientBoxMainscreenClientsPanel"} #clientFormPopover:not([hidden]), #FournisseurBoxNewDoc #fournisseurFormPopover:not([hidden]), ${MAIN_VENDOR_SCOPE_ID ? `#${MAIN_VENDOR_SCOPE_ID}` : "#clientBoxMainscreenFournisseursPanel"} #fournisseurFormPopover:not([hidden]), #clientSavedModal #clientFormPopover:not([hidden]), #clientSavedModalNv #clientFormPopover:not([hidden]), #fournisseurSavedModal #fournisseurFormPopover:not([hidden]), #fournisseurSavedModalNv #fournisseurFormPopover:not([hidden]), #transporteurSavedModal #transporteurFormPopover:not([hidden]), #transporteurSavedModalNv #transporteurFormPopover:not([hidden]), #${MAIN_TRANSPORTER_SCOPE_ID} #transporteurFormPopover:not([hidden])`;

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
              "codeClient",
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
              "clientCode",
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
            const getClientBindingHelpers = () => SEM.__bindingHelpers || {};
            const CLIENT_ENTITY_DIRECT_FIELD_IDS = {
              client: {
                clientType: ["clientType"],
                clientCode: ["clientCode"],
                clientName: ["clientName"],
                clientBeneficiary: ["clientBeneficiary"],
                clientAccount: ["clientAccount"],
                clientSoldClient: ["clientSoldClient"],
                clientVat: ["clientVat"],
                clientStegRef: ["clientStegRef"],
                clientPhone: ["clientPhone"],
                clientEmail: ["clientEmail"],
                clientAddress: ["clientAddress"]
              },
              vendor: {
                clientType: ["fournisseurType", "clientType"],
                clientName: ["fournisseurName", "clientName"],
                clientBeneficiary: ["fournisseurBeneficiary", "clientBeneficiary"],
                clientAccount: ["fournisseurAccount", "clientAccount"],
                clientSoldClient: ["fournisseurSoldClient", "clientSoldClient"],
                clientVat: ["fournisseurVat", "clientVat"],
                clientStegRef: ["fournisseurStegRef", "clientStegRef"],
                clientPhone: ["fournisseurPhone", "clientPhone"],
                clientEmail: ["fournisseurEmail", "clientEmail"],
                clientAddress: ["fournisseurAddress", "clientAddress"]
              },
              transporter: {
                clientType: ["transporteurType", "clientType"],
                clientName: ["transporteurName", "clientName"],
                clientBeneficiary: ["transporteurDriverName", "clientBeneficiary"],
                clientAccount: ["transporteurVehiclePlate", "clientAccount"],
                clientSoldClient: ["transporteurSoldClient", "clientSoldClient"],
                clientVat: ["transporteurVat", "clientVat"],
                clientStegRef: ["transporteurTransportMode", "clientStegRef"],
                clientPhone: ["transporteurPhone", "clientPhone"],
                clientEmail: ["transporteurEmail", "clientEmail"],
                clientAddress: ["transporteurAddress", "clientAddress"]
              }
            };
            const resolveScopedClientEntityType = (scopeNode, fallbackNode = null) => {
              const candidate =
                scopeNode ||
                fallbackNode?.closest?.(CLIENT_SCOPE_WITH_ROOT_SELECTOR) ||
                fallbackNode ||
                null;
              const candidateId = String(candidate?.id || "").trim();
              const fallbackId = String(fallbackNode?.id || "").trim();
              if (
                candidateId === "FournisseurBoxNewDoc" ||
                candidateId === "fournisseurSavedModal" ||
                candidateId === "fournisseurSavedModalNv" ||
                candidateId === "fournisseurFormPopover" ||
                fallbackId === "btnSaveFournisseur" ||
                fallbackId === "btnUpdateFournisseur" ||
                fallbackId === "btnNewFournisseur"
              ) {
                return "vendor";
              }
              if (
                candidateId === "transporteurSavedModal" ||
                candidateId === "transporteurSavedModalNv" ||
                candidateId === "transporteurFormPopover" ||
                fallbackId === "btnSaveTransporteur" ||
                fallbackId === "btnUpdateTransporteur" ||
                fallbackId === "btnNewTransporteur"
              ) {
                return "transporter";
              }
              return resolveClientEntityType(candidate);
            };
            const readDirectScopedClientValue = (scopeNode, canonicalId, entityType) => {
              const ids =
                CLIENT_ENTITY_DIRECT_FIELD_IDS[entityType]?.[canonicalId] ||
                CLIENT_ENTITY_DIRECT_FIELD_IDS.client[canonicalId] ||
                [canonicalId];
              for (const id of ids) {
                const scopedInput =
                  scopeNode && typeof scopeNode.querySelector === "function"
                    ? scopeNode.querySelector(`#${id}`)
                    : null;
                if (scopedInput && "value" in scopedInput) {
                  return String(scopedInput.value ?? "");
                }
              }
              for (const id of ids) {
                const input = getEl(id);
                if (input && "value" in input) return String(input.value ?? "");
              }
              return "";
            };
            const getClientFormValue = (scopeNode, id, fallback = "") => {
              const canonicalId = toCanonicalClientFormId(id);
              const entityType = resolveScopedClientEntityType(scopeNode);
              const directValue = readDirectScopedClientValue(scopeNode, canonicalId, entityType);
              if (String(directValue || "").trim()) return String(directValue ?? "");
              const scopedInput = queryScopedClientFormElement(scopeNode, canonicalId);
              if (scopedInput && "value" in scopedInput) return String(scopedInput.value ?? "");
              const input = queryGlobalClientFormElement(canonicalId, scopeNode);
              if (input && "value" in input) return String(input.value ?? "");
              return String(fallback ?? "");
            };
            const resolveClientEntityDraft = (scopeNode) => {
              const helper = getClientBindingHelpers().getEntityClientStateForScope;
              if (typeof helper === "function") {
                const resolved = helper(scopeNode);
                if (resolved && typeof resolved === "object") return resolved;
              }
              return {
                ...(state().client || {}),
                __entityType: resolveScopedClientEntityType(scopeNode)
              };
            };
            const persistClientEntityDraft = (snapshot, scopeNode, options = {}) => {
              const entityType =
                options.entityType ||
                snapshot?.__entityType ||
                resolveScopedClientEntityType(scopeNode);
              const clearPath = options.clearPath === true;
              const setEntityState = getClientBindingHelpers().setEntityClientFormState;
              if (typeof setEntityState === "function") {
                setEntityState(entityType, {
                  ...snapshot,
                  __entityType: entityType,
                  __clearPath: clearPath
                });
              }
              const resolveDocumentScope =
                getClientBindingHelpers().resolveEntityDocumentPartyStateScope;
              const mirrorScope =
                typeof resolveDocumentScope === "function" ? resolveDocumentScope(scopeNode) : null;
              const shouldMirror =
                options.mirrorToDocumentState !== undefined
                  ? !!options.mirrorToDocumentState
                  : !!mirrorScope;
              if (shouldMirror) {
                const st = SEM.state || (SEM.state = {});
                st.client = {
                  ...(st.client || {}),
                  ...snapshot,
                  __path: clearPath ? "" : snapshot.__path || st.client?.__path || "",
                  __entityType: entityType
                };
                refreshClientSummary();
              }
              return entityType;
            };
            const setClientEntityDirty = (entityType, dirty) => {
              const markDirty = getClientBindingHelpers().setEntityClientFormDirty;
              if (typeof markDirty === "function") {
                markDirty(entityType, dirty);
                return;
              }
              if (state().client) state().client.__dirty = !!dirty;
            };
            const shouldMirrorEntityStateToDocument = (scopeNode) => {
              const helper = getClientBindingHelpers().shouldMirrorEntityClientStateToDocument;
              if (typeof helper === "function") {
                return !!helper(scopeNode);
              }
              return false;
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
            const resolveScopedClientTypeMenu = (scopeOrMenu) => {
              if (
                scopeOrMenu instanceof HTMLElement &&
                scopeOrMenu.matches?.("details.client-type-menu")
              ) {
                return scopeOrMenu;
              }
              return queryScopedClientFormElement(scopeOrMenu, "clientTypeMenu");
            };
            const syncScopedClientTypeMenuExpandedState = (scopeOrMenu) => {
              const menu = resolveScopedClientTypeMenu(scopeOrMenu);
              if (!(menu instanceof HTMLElement)) return false;
              const toggle = menu.querySelector("summary");
              if (toggle instanceof HTMLElement) {
                toggle.setAttribute("aria-expanded", menu.open ? "true" : "false");
              }
              return true;
            };
            const closeScopedClientTypeMenu = (scopeOrMenu, { focusToggle = false } = {}) => {
              const menu = resolveScopedClientTypeMenu(scopeOrMenu);
              if (!(menu instanceof HTMLElement)) return false;
              if (menu.open) {
                menu.open = false;
              } else {
                menu.removeAttribute("open");
              }
              const toggle = menu.querySelector("summary");
              if (toggle instanceof HTMLElement) {
                syncScopedClientTypeMenuExpandedState(menu);
                if (focusToggle) {
                  try {
                    toggle.focus();
                  } catch {}
                }
              }
              return true;
            };
            const syncScopedClientTypeSelection = (scopeNode, typeValue) => {
              if (!scopeNode) return null;
              const normalized = normalizeClientTypeValue(typeValue);
              const select = queryScopedClientFormElement(scopeNode, "clientType");
              if (select) {
                select.value = normalized;
                if (select instanceof HTMLSelectElement) {
                  Array.from(select.options).forEach((option) => {
                    option.selected = option.value === normalized;
                  });
                }
              }
              updateClientIdLabelScoped(scopeNode, normalized);
              updateClientTypeDisplayScoped(scopeNode, normalized);
              const snapshot = captureClientSnapshotFromScope(scopeNode);
              snapshot.type = normalized;
              applyClientSnapshotToState(snapshot, scopeNode);
              evaluateClientDirtyFromSnapshot(snapshot, scopeNode);
              SEM.refreshClientActionButtons?.();
              return { normalized, select, snapshot };
            };
            const findOpenClientTypeMenus = (rootNode = document) =>
              Array.from(rootNode?.querySelectorAll?.("details.client-type-menu[open]") || []).filter(
                (menu) => menu instanceof HTMLElement && !!menu.closest?.(CLIENT_SCOPE_SELECTOR)
              );
            const captureClientSnapshotFromScope = (scopeNode) => {
              const currentState = resolveClientEntityDraft(scopeNode);
              const soldFallback = currentState.soldClient ?? "";
              const typeRaw = getClientFormValue(scopeNode, "clientType", currentState.type || "societe");
              const entityType = resolveScopedClientEntityType(scopeNode);
              const snapshot = {
                type: normalizeClientTypeValue(typeRaw),
                codeClient:
                  entityType === "client"
                    ? String(
                        getClientFormValue(scopeNode, "clientCode", currentState.codeClient || "")
                      ).trim()
                    : "",
                name: getClientFormValue(scopeNode, "clientName", currentState.name || ""),
                benefit: getClientFormValue(scopeNode, "clientBeneficiary", currentState.benefit || ""),
                account: getClientFormValue(scopeNode, "clientAccount", currentState.account || ""),
                soldClient: formatSoldClientValue(getClientFormValue(scopeNode, "clientSoldClient", soldFallback)),
                vat: getClientFormValue(scopeNode, "clientVat", currentState.vat || ""),
                stegRef: getClientFormValue(scopeNode, "clientStegRef", currentState.stegRef || ""),
                phone: getClientFormValue(scopeNode, "clientPhone", currentState.phone || ""),
                email: getClientFormValue(scopeNode, "clientEmail", currentState.email || ""),
                address: getClientFormValue(scopeNode, "clientAddress", currentState.address || ""),
                __path: currentState.__path || SEM.clientFormBaseline?.__path || "",
                __entityType: entityType
              };
              return sanitizeClientSnapshot(snapshot);
            };
            const applyClientSnapshotToState = (snapshot, scopeNode, options = {}) => {
              persistClientEntityDraft(snapshot, scopeNode, options);
            };
            const evaluateClientDirtyFromSnapshot = (snapshot, scopeNode) => {
              const entityType = resolveScopedClientEntityType(scopeNode);
              const baseline = SEM.clientFormBaseline;
              if (!baseline?.__path || SEM.clientFormBaselineEntityType !== entityType) {
                SEM.clientFormDirty = false;
                setClientEntityDirty(entityType, false);
                SEM.refreshUpdateClientButton?.(scopeNode);
                return false;
              }
              const normalized = sanitizeClientSnapshot(snapshot);
              const dirty = CLIENT_SNAPSHOT_FIELDS.some((field) => normalized[field] !== baseline[field]);
              SEM.clientFormDirty = dirty;
              setClientEntityDirty(entityType, dirty);
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
              applyClientSnapshotToState(snapshot, formScope);
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
              const directPopover = node?.closest?.(CLIENT_POPOVER_SELECTOR) || null;
              const scope =
                directPopover?.closest?.(CLIENT_OUTER_SCOPE_SELECTOR) ||
                node?.closest?.(CLIENT_OUTER_SCOPE_SELECTOR) ||
                node?.closest?.(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              if (!scope) return null;
              const entityType = resolveScopedClientEntityType(scope, node);
              const preferredPopoverSelector = resolveClientPopoverSelector(entityType);
              let popover = null;
              if (directPopover) {
                popover = directPopover;
              }
              if (
                !popover &&
                (
                  scope.id === "clientSavedModal" ||
                  scope.id === "clientSavedModalNv" ||
                  scope.id === "fournisseurSavedModal" ||
                  scope.id === "fournisseurSavedModalNv" ||
                  scope.id === "transporteurSavedModal" ||
                  scope.id === "transporteurSavedModalNv"
                )
              ) {
                popover = scope.querySelector(preferredPopoverSelector);
              }
              if (!popover) {
                popover = scope.querySelector(preferredPopoverSelector);
              }
              if (!popover && directPopover?.matches?.(preferredPopoverSelector)) {
                popover = directPopover;
              }
              if (
                !popover &&
                scope.id !== "clientSavedModal" &&
                scope.id !== "clientSavedModalNv" &&
                scope.id !== "fournisseurSavedModal" &&
                scope.id !== "fournisseurSavedModalNv" &&
                scope.id !== "transporteurSavedModal" &&
                scope.id !== "transporteurSavedModalNv"
              ) {
                popover = scope.querySelector(CLIENT_POPOVER_SELECTOR);
              }
              const toggle = scope.querySelector("#clientFormToggleBtn");
              if (!popover) return null;
              return { scope, popover, toggle };
            };

            const resetClientFormPopoverFields = (scopeNode) => {
              if (!scopeNode) return;
              const entityType = resolveScopedClientEntityType(scopeNode);
              const blankClient = {
                type: "societe",
                codeClient: "",
                name: "",
                vat: "",
                phone: "",
                email: "",
                address: ""
              };
              syncClientFormFields(blankClient, scopeNode);
              SEM.clientFormDirty = false;
              setClientEntityDirty(entityType, false);
              SEM.refreshUpdateClientButton?.(scopeNode);
              SEM.refreshClientActionButtons?.();
            };

            const setClientFormPopoverMode = (ctx, mode = "default") => {
              if (!ctx?.popover) return;
              const rawMode = String(mode || "default").trim().toLowerCase();
              const normalizedMode =
                rawMode === "load"
                  ? "view"
                  : ["default", "create", "edit", "view"].includes(rawMode)
                    ? rawMode
                    : "default";
              ctx.popover.dataset.clientFormMode = normalizedMode;
              const isItemsDocOptionsContext =
                !!ctx.scope?.closest?.("#itemsDocOptionsModal") || isItemsDocOptionsModalOpen();
              const entityType = resolveClientEntityType(ctx.popover);
              const resolvedModeForVendor = normalizedMode === "default" ? "create" : normalizedMode;
              const effectiveMode = entityType === "client" ? normalizedMode : resolvedModeForVendor;
              if (entityType === "vendor") {
                ctx.popover.dataset.fournisseurFormMode = resolvedModeForVendor;
                delete ctx.popover.dataset.transporteurFormMode;
              } else if (entityType === "transporter") {
                ctx.popover.dataset.transporteurFormMode = resolvedModeForVendor;
                delete ctx.popover.dataset.fournisseurFormMode;
              } else {
                delete ctx.popover.dataset.fournisseurFormMode;
                delete ctx.popover.dataset.transporteurFormMode;
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
                    if (control.id === "clientCode") {
                      control.readOnly = true;
                      delete control.dataset.clientReadonlyPrevReadonly;
                    } else if (control.dataset.clientReadonlyPrevReadonly !== undefined) {
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
                    if ("readOnly" in control) {
                      control.readOnly = control.id === "clientCode";
                    }
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
                const hideUpdate =
                  effectiveMode === "create" ||
                  isViewMode ||
                  (isItemsDocOptionsContext && effectiveMode !== "edit");
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
                  popover: scopeNode?.querySelector?.(CLIENT_POPOVER_SELECTOR),
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
                    const fallbackScope = toggleBtn.closest(
                      "#clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #transporteurSavedModal, #transporteurSavedModalNv"
                    )
                      ? document.getElementById("FournisseurBoxNewDoc") ||
                        document.getElementById("clientBoxMainscreenTransporteursPanel")
                      : document.getElementById("clientBoxNewDoc");
                    ctx = getClientFormPopoverContext(fallbackScope);
                  }
                  if (!ctx) return;
                  resetClientFormToNew(ctx.scope, { confirmDiscard: false });
                  return;
                }
                const closeBtn = evt.target?.closest?.("[data-client-form-close]");
                if (closeBtn) {
                  const ctx = getClientFormPopoverContext(closeBtn);
                  if (ctx) {
                    setClientFormPopoverOpen(ctx, false);
                    return;
                  }
                  const popover = closeBtn.closest(CLIENT_POPOVER_SELECTOR);
                  if (popover) {
                    popover.classList.remove("is-open");
                    popover.hidden = true;
                    popover.setAttribute("aria-hidden", "true");
                    const scopeNode = popover.closest(
                      `#clientBoxNewDoc, #clientBoxMainscreen, ${MAIN_SCOPE_SELECTOR}, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #transporteurSavedModal, #transporteurSavedModalNv`
                    );
                    if (scopeNode) resetClientFormPopoverFields(scopeNode);
                  }
                  return;
                }
                const openPopover = document.querySelector(CLIENT_OPEN_POPOVER_SELECTOR);
                if (!openPopover) return;
                const dialogTarget = evt.target?.closest?.("#swbDialog");
                if (dialogTarget) return;
                if (openPopover.contains(evt.target)) return;
                const confirmDialog = document.getElementById("swbDialog");
                if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                  return;
                }
                const scopeNode = openPopover.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                const openTypeMenus = findOpenClientTypeMenus(openPopover);
                if (openTypeMenus.length) {
                  openTypeMenus.forEach((menu) => closeScopedClientTypeMenu(menu));
                  return;
                }
                const toggle = scopeNode?.querySelector("#clientFormToggleBtn");
                if (toggle && toggle.contains(evt.target)) return;
                closeClientFormPopover(scopeNode);
              });

              document.addEventListener("keydown", (evt) => {
                if (evt.key !== "Escape") return;
                const openPopover = document.querySelector(CLIENT_OPEN_POPOVER_SELECTOR);
                if (!openPopover) return;
                const dialogTarget = evt.target?.closest?.("#swbDialog");
                if (dialogTarget) return;
                const confirmDialog = document.getElementById("swbDialog");
                if (confirmDialog && !confirmDialog.hidden && confirmDialog.getAttribute("aria-hidden") !== "true") {
                  return;
                }
                const scopeNode = openPopover.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                const openTypeMenus = findOpenClientTypeMenus(openPopover);
                if (openTypeMenus.length) {
                  evt.preventDefault();
                  openTypeMenus.forEach((menu) => closeScopedClientTypeMenu(menu, { focusToggle: true }));
                  return;
                }
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

            const captureArticlePopoverDraft = (popover) => {
              if (!popover) return null;
              const ctx = getArticleFormPopoverContext(popover);
              if (ctx?.scope && typeof SEM.setActiveAddFormScope === "function") {
                SEM.setActiveAddFormScope(ctx.scope);
              }
              const selected = resolveArticlePopoverSelectedRecord(popover);
              const captured = SEM.forms?.captureArticleFromForm?.() || {};
              const hasRef = (captured.ref || "").trim();
              const hasProduct = (captured.product || "").trim();
              const hasDesc = (captured.desc || "").trim();
              const hasTypedContent = !!(hasRef || hasProduct || hasDesc);
              const selectedArticle =
                selected && selected.article && typeof selected.article === "object"
                  ? selected.article
                  : {};
              const mergedArticle = { ...selectedArticle, ...captured };
              const resolvedPath =
                (SEM.articleEditContext?.path || "").trim() ||
                String(selected?.path || "").trim();
              return {
                ctx,
                selected,
                captured,
                hasTypedContent,
                mergedArticle,
                resolvedPath,
                label:
                  (mergedArticle.product || "").trim() ||
                  (mergedArticle.ref || "").trim() ||
                  String(selected?.name || "").trim()
              };
            };

            const restoreArticlePopoverDraft = (draft) => {
              if (!draft?.ctx?.scope) return;
              if (typeof SEM.setActiveAddFormScope === "function") {
                SEM.setActiveAddFormScope(draft.ctx.scope);
              }
              if (typeof SEM.fillAddFormFromItem === "function") {
                SEM.fillAddFormFromItem(draft.mergedArticle || {});
              }
              if (draft.resolvedPath) {
                SEM.enterArticleEditContext?.({ path: draft.resolvedPath, name: draft.label || "" });
              } else {
                SEM.clearArticleEditContext?.();
              }
              SEM.markItemFormDirty?.(true);
              SEM.markArticleFormDirty?.(true);
            };

            const addArticleFromPopoverSelection = async (popover, options = {}) => {
              if (!popover) return false;
              const draft = captureArticlePopoverDraft(popover);
              if (!draft) return false;
              if (draft.hasTypedContent) {
                if (draft.ctx?.scope && typeof SEM.setActiveAddFormScope === "function") {
                  SEM.setActiveAddFormScope(draft.ctx.scope);
                }
                if (typeof SEM.setSubmitMode === "function") {
                  SEM.setSubmitMode("add");
                }
                SEM.selectedItemIndex = null;
                if (typeof SEM.submitItemForm === "function") {
                  const added = await SEM.submitItemForm({ updateLinkedArticle: false });
                  if (added && options.restoreFormAfterAdd) {
                    restoreArticlePopoverDraft(draft);
                  }
                  return !!added;
                }
                addArticleToItems(draft.mergedArticle, { path: draft.resolvedPath });
                if (options.restoreFormAfterAdd) {
                  restoreArticlePopoverDraft(draft);
                }
                return true;
              }
              if (draft.selected) {
                addArticleToItems(draft.selected.article || {}, { path: draft.selected.path });
                return true;
              }
              const missingItemMessage = getMessage("ITEM_REQUIRED_FIELDS");
              await showDialog?.(missingItemMessage.text, { title: missingItemMessage.title });
              return false;
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
                const added = await addArticleFromPopoverSelection(ctx.popover, {
                  restoreFormAfterAdd: true
                });
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
              const summary = evt.target?.closest?.("details.client-type-menu > summary");
              if (!(summary instanceof HTMLElement)) return;
              const menu = summary.closest("details.client-type-menu");
              if (!(menu instanceof HTMLElement)) return;
              requestAnimationFrame(() => {
                syncScopedClientTypeMenuExpandedState(menu);
              });
            });

            document.addEventListener("click", (evt) => {
              const optionBtn = evt.target?.closest?.("[data-client-type-option]");
              if (!optionBtn) return;
              const menu = optionBtn.closest("details.client-type-menu");
              const scopeNode = menu?.closest(CLIENT_SCOPE_SELECTOR) || optionBtn.closest(CLIENT_SCOPE_SELECTOR);
              if (!scopeNode) return;
              evt.preventDefault();
              const synced = syncScopedClientTypeSelection(
                scopeNode,
                optionBtn.dataset.clientTypeOption
              );
              const select = synced?.select || null;
              if (select) {
                select.dispatchEvent(new Event("input", { bubbles: true }));
                select.dispatchEvent(new Event("change", { bubbles: true }));
              }
              closeScopedClientTypeMenu(menu, { focusToggle: true });
            });

            document.addEventListener("change", (evt) => {
              const target = evt.target;
              if (!(target instanceof HTMLSelectElement)) return;
              if (toCanonicalClientFormId(target.id) !== "clientType") return;
              const scopeNode = target.closest(CLIENT_SCOPE_SELECTOR);
              if (!scopeNode) return;
              syncScopedClientTypeSelection(scopeNode, target.value);
            });

            document.addEventListener("click", (evt) => {
              const target = evt.target instanceof Element ? evt.target : null;
              if (!target) return;
              findOpenClientTypeMenus(document).forEach((menu) => {
                if (menu.contains(target)) return;
                closeScopedClientTypeMenu(menu);
              });
            });

            let clientFolderFallbackWarned = false;
            const getEntityLabel = (entityType) =>
              entityType === "vendor"
                ? "fournisseur"
                : entityType === "transporter"
                  ? "transporteur"
                  : "client";
            const getEntitySuggestedNameFallback = (entityType) =>
              entityType === "vendor"
                ? "fournisseur"
                : entityType === "transporter"
                  ? "transporteur"
                  : "client";
            const getEntityValidationMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_REQUIRED_FIELDS", {
                    fallbackText: "Veuillez saisir le nom du fournisseur ou son matricule fiscal / TVA.",
                    fallbackTitle: "Fournisseur incomplet"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_REQUIRED_FIELDS", {
                      fallbackText: "Veuillez saisir le nom du transporteur ou le matricule vehicule.",
                      fallbackTitle: "Transporteur incomplet"
                    })
                  : getMessage("CLIENT_REQUIRED_FIELDS");
            const getEntitySaveSuccessMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_SAVE_SUCCESS", {
                    fallbackText: "Fournisseur enregistre.",
                    fallbackTitle: "Succes"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_SAVE_SUCCESS", {
                      fallbackText: "Transporteur enregistre.",
                      fallbackTitle: "Succes"
                    })
                  : getMessage("CLIENT_SAVE_SUCCESS");
            const getEntitySaveErrorMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_SAVE_FAILED", {
                    fallbackText: "Echec de l'enregistrement du fournisseur.",
                    fallbackTitle: "Erreur"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_SAVE_FAILED", {
                      fallbackText: "Echec de l'enregistrement du transporteur.",
                      fallbackTitle: "Erreur"
                    })
                  : getMessage("CLIENT_SAVE_FAILED");
            const getEntityUpdateUnavailableMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_UPDATE_UNAVAILABLE", {
                    fallbackText: "La mise a jour du fournisseur n'est pas disponible.",
                    fallbackTitle: "Information"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_UPDATE_UNAVAILABLE", {
                      fallbackText: "La mise a jour du transporteur n'est pas disponible.",
                      fallbackTitle: "Information"
                    })
                  : getMessage("CLIENT_UPDATE_UNAVAILABLE");
            const getEntityLoadOrSaveRequiredMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_LOAD_OR_SAVE_REQUIRED", {
                    fallbackText: "Veuillez d'abord charger ou enregistrer un fournisseur.",
                    fallbackTitle: "Information"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_LOAD_OR_SAVE_REQUIRED", {
                      fallbackText: "Veuillez d'abord charger ou enregistrer un transporteur.",
                      fallbackTitle: "Information"
                    })
                  : getMessage("CLIENT_LOAD_OR_SAVE_REQUIRED");
            const getEntityNoChangesMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_NO_CHANGES", {
                    fallbackText: "Aucune modification detectee.",
                    fallbackTitle: "Information"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_NO_CHANGES", {
                      fallbackText: "Aucune modification detectee.",
                      fallbackTitle: "Information"
                    })
                  : getMessage("CLIENT_NO_CHANGES");
            const getEntityPathMissingMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_PATH_MISSING", {
                    fallbackText: "Chemin du fournisseur introuvable.",
                    fallbackTitle: "Erreur"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_PATH_MISSING", {
                      fallbackText: "Chemin du transporteur introuvable.",
                      fallbackTitle: "Erreur"
                    })
                  : getMessage("CLIENT_PATH_MISSING");
            const getEntityUpdateSuccessMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_UPDATE_SUCCESS", {
                    fallbackText: "Fournisseur mis a jour.",
                    fallbackTitle: "Succes"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_UPDATE_SUCCESS", {
                      fallbackText: "Transporteur mis a jour.",
                      fallbackTitle: "Succes"
                    })
                  : getMessage("CLIENT_UPDATE_SUCCESS");
            const getEntityUpdateErrorMessage = (entityType) =>
              entityType === "vendor"
                ? getMessage("SUPPLIER_UPDATE_FAILED", {
                    fallbackText: "Echec de la mise a jour du fournisseur.",
                    fallbackTitle: "Erreur"
                  })
                : entityType === "transporter"
                  ? getMessage("TRANSPORTER_UPDATE_FAILED", {
                      fallbackText: "Echec de la mise a jour du transporteur.",
                      fallbackTitle: "Erreur"
                    })
                  : getMessage("CLIENT_UPDATE_FAILED");

            const resetClientSearchScope = (scopeNode) => {
              if (!scopeNode) {
                clearClientSearchInputValue();
                hideClientSearchResults();
                return;
              }
              const scopedSearchInput = scopeNode.querySelector(
                "#transporteurSearch, #fournisseurSearch, #clientSearch"
              );
              if (scopedSearchInput) scopedSearchInput.value = "";
              const scopedSearchResults = scopeNode.querySelector(
                "#transporteurSearchResults, #fournisseurSearchResults, #clientSearchResults"
              );
              if (scopedSearchResults) {
                scopedSearchResults.innerHTML = "";
                scopedSearchResults.hidden = true;
                scopedSearchResults.classList.remove("client-search--paged");
              }
            };

            const hydrateNewClientCodePreview = async (scopeNode) => {
              const target =
                queryScopedClientFormElement(scopeNode, "clientCode") ||
                queryGlobalClientFormElement("clientCode", scopeNode);
              if (!(target instanceof HTMLInputElement)) return;
              if (typeof window.electronAPI?.previewClientCode !== "function") return;
              try {
                const result = await window.electronAPI.previewClientCode();
                const resolvedCode =
                  typeof result === "string"
                    ? result
                    : String(result?.codeClient || "").trim();
                if (!resolvedCode) return;
                target.value = resolvedCode;
                const formScope = target.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR) || scopeNode || null;
                if (!formScope) return;
                const snapshot = captureClientSnapshotFromScope(formScope);
                snapshot.codeClient = resolvedCode;
                applyClientSnapshotToState(snapshot, formScope, {
                  entityType: "client",
                  mirrorToDocumentState: shouldMirrorEntityStateToDocument(formScope)
                });
                evaluateClientDirtyFromSnapshot(snapshot, formScope);
                SEM.refreshClientActionButtons?.();
              } catch (error) {
                console.warn("client code preview failed", error);
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
                  formScope?.id === "transporteurSavedModal" ||
                  formScope?.id === "transporteurSavedModalNv" ||
                  formScope?.id === "clientBoxMainscreen" ||
                  formScope?.id === MAIN_CLIENT_SCOPE_ID ||
                  formScope?.id === MAIN_VENDOR_SCOPE_ID ||
                  formScope?.id === MAIN_TRANSPORTER_SCOPE_ID ||
                  formScope?.id === "clientFormPopover" ||
                  formScope?.id === "fournisseurFormPopover" ||
                  formScope?.id === "transporteurFormPopover"
                    ? formScope
                    : null;
                const targetScope = useScope || formScope || null;
                const performReset = () => {
                  const clearValidationState = (container) => {
                    if (!container?.querySelectorAll) return;
                    container
                      .querySelectorAll("input, textarea, select")
                      .forEach((field) => {
                        if (typeof field.setCustomValidity === "function") {
                          field.setCustomValidity("");
                        }
                        field.removeAttribute("aria-invalid");
                        field.classList?.remove("is-invalid", "has-error", "input-error");
                      });
                  };
                  const hardResetScopedInputs = (container, blankType = "societe") => {
                    if (!container?.querySelectorAll) return;
                    container.querySelectorAll("input, textarea, select").forEach((field) => {
                      if (!(field instanceof HTMLElement)) return;
                      if (field instanceof HTMLSelectElement) {
                        if (field.id === "clientType" || field.id === "fournisseurType") {
                          field.value = blankType;
                        } else if (field.options.length > 0) {
                          field.selectedIndex = 0;
                        } else {
                          field.value = "";
                        }
                        return;
                      }
                      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) return;
                      const inputType = String(field.getAttribute("type") || "").toLowerCase();
                      if (inputType === "checkbox" || inputType === "radio") {
                        field.checked = false;
                        return;
                      }
                      field.value = "";
                    });
                  };
                  const entityType = resolveScopedClientEntityType(targetScope);
                  const blankClient = {
                    type: "societe",
                    codeClient: "",
                    name: "",
                    benefit: "",
                    account: "",
                    soldClient: "",
                    vat: "",
                    stegRef: "",
                    phone: "",
                    email: "",
                    address: "",
                    __path: "",
                    __entityType: entityType
                  };
                  hardResetScopedInputs(targetScope, blankClient.type);
                  if (SEM.forms?.fillClientToForm && !useScope) {
                    SEM.forms.fillClientToForm(blankClient);
                  } else {
                    syncClientFormFields(blankClient, targetScope);
                  }
                  resetClientSearchScope(targetScope || formScope);
                  const shouldMirror = shouldMirrorEntityStateToDocument(targetScope);
                  persistClientEntityDraft(blankClient, targetScope, {
                    entityType,
                    mirrorToDocumentState: shouldMirror,
                    clearPath: true
                  });
                  const st = SEM.state || (SEM.state = {});
                  const currentStateEntityType =
                    st.client?.__entityType === "vendor"
                      ? "vendor"
                      : st.client?.__entityType === "transporter"
                        ? "transporter"
                        : "client";
                  if (st.client && currentStateEntityType === entityType) {
                    st.client = {
                      ...st.client,
                      ...blankClient,
                      __path: "",
                      __dirty: false,
                      __entityType: entityType
                    };
                  }
                  SEM.clientFormDirty = false;
                  SEM.clientFormAllowUpdate = false;
                  setClientEntityDirty(entityType, false);
                  if (SEM.setClientFormBaseline) SEM.setClientFormBaseline(null, entityType);
                  else SEM.refreshUpdateClientButton?.();
                  if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState(targetScope);
                  const popoverCtx = getClientFormPopoverContext(targetScope);
                  if (popoverCtx) {
                    hardResetScopedInputs(popoverCtx.popover, blankClient.type);
                    syncClientFormFields(blankClient, popoverCtx.popover);
                    clearValidationState(popoverCtx.popover);
                    setClientFormPopoverMode(popoverCtx, "create");
                    setClientFormPopoverOpen(popoverCtx, true);
                  }
                  if (entityType === "client") {
                    const codeScope = popoverCtx?.popover || targetScope || formScope || null;
                    if (codeScope) void hydrateNewClientCodePreview(codeScope);
                  }
                  SEM.refreshClientActionButtons?.();
                  SEM.refreshFournisseurActionButtons?.();
                  SEM.refreshTransporteurActionButtons?.();
                  if (!useScope && SEM.readInputs) SEM.readInputs();
                };
                const baselineEntityType = SEM.clientFormBaselineEntityType || "client";
                const currentEntityType = resolveScopedClientEntityType(targetScope);
                const hasBaseline =
                  !!SEM.clientFormBaseline?.__path &&
                  baselineEntityType === currentEntityType;
                const hasContent =
                  typeof SEM.clientFormHasContent === "function"
                    ? SEM.clientFormHasContent(targetScope)
                    : true;
                const unsavedChanges = hasBaseline ? !!SEM.clientFormDirty : hasContent;
                if (options.confirmDiscard && unsavedChanges && typeof SEM.confirmDiscardClientChanges === "function") {
                  SEM.confirmDiscardClientChanges(performReset);
                } else {
                  performReset();
                }
              };
              SEM.resetClientFormToNew = resetClientFormToNew;

              const handleNewClientClick = (evt) => {
                const trigger = evt.target?.closest?.("#btnNewClient, #btnNewFournisseur, #btnNewTransporteur");
                if (!trigger) return;
                evt.preventDefault();
                const popoverCtx = getClientFormPopoverContext(trigger);
                const fallbackScope = trigger.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
                const resetScope = popoverCtx?.popover || popoverCtx?.scope || fallbackScope;
                resetClientFormToNew(resetScope, { confirmDiscard: true });
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
            const emitSavedClientModalRefreshEvent = ({ entityType = "client", snapshot = {}, path = "" } = {}) => {
              try {
                w.dispatchEvent(
                  new CustomEvent("client-saved-modal-entity-updated", {
                    detail: {
                      entityType,
                      path: String(path || snapshot?.__path || "").trim(),
                      snapshot: snapshot && typeof snapshot === "object" ? { ...snapshot } : {}
                    }
                  })
                );
              } catch {}
            };

            const handleSaveClientClick = async (evt) => {
              const trigger = evt.target?.closest?.("#btnSaveClient, #btnSaveFournisseur, #btnSaveTransporteur");
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
                  formScope.id !== "transporteurSavedModal" && formScope.id !== "transporteurSavedModalNv" &&
                  formScope.id !== "clientFormPopover" && formScope.id !== "fournisseurFormPopover" &&
                  formScope.id !== "transporteurFormPopover")
              ) {
                return;
              }
              evt.preventDefault();
              clientSaveInProgress = true;
              setSaveButtonBusyState(trigger, true);
              const entityType = resolveScopedClientEntityType(formScope, trigger);
              const client = captureClientSnapshotFromScope(formScope);
              applyClientSnapshotToState(client, formScope, { entityType });
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
                const hasMinimalIdentity =
                  entityType === "vendor"
                    ? !!(clientName || hasIdentifier)
                    : entityType === "transporter"
                      ? !!(clientName || clientAccount)
                    : !!(clientName || clientAccount || hasIdentifier);
                if (!hasMinimalIdentity) {
                  const validationMessage = getEntityValidationMessage(entityType);
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
                  getEntitySuggestedNameFallback(entityType);
                const res = await window.electronAPI.saveClientDirect({
                  client,
                  suggestedName: suggested,
                  entityType
                });
                if (res?.ok) {
                  if (entityType === "client") {
                    const returnedCode = String(res.codeClient || "").trim();
                    if (returnedCode) {
                      client.codeClient = returnedCode;
                      const codeInput = queryScopedClientFormElement(formScope, "clientCode");
                      if (codeInput && "value" in codeInput) codeInput.value = returnedCode;
                    } else if (!String(client.codeClient || "").trim()) {
                      const inputCode = queryScopedClientFormElement(formScope, "clientCode");
                      if (inputCode && typeof inputCode.value === "string") {
                        client.codeClient = inputCode.value.trim();
                      }
                    }
                  }
                  const getEntityState = getClientBindingHelpers().getEntityClientFormState;
                  const entityState =
                    typeof getEntityState === "function" ? getEntityState(entityType) : {};
                  const resolvedPath = res.path || client.__path || entityState.__path || "";
                  if (resolvedPath) client.__path = resolvedPath;
                  applyClientSnapshotToState(client, formScope, {
                    entityType,
                    mirrorToDocumentState: shouldMirrorEntityStateToDocument(formScope)
                  });
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
                  } else if (
                    formScope?.id === "clientFormPopover" ||
                    formScope?.id === "fournisseurFormPopover" ||
                    formScope?.id === "transporteurFormPopover"
                  ) {
                    formScope.classList.remove("is-open");
                    formScope.hidden = true;
                    formScope.setAttribute("aria-hidden", "true");
                    resetClientFormPopoverFields(formScope);
                  }
                  emitSavedClientModalRefreshEvent({
                    entityType,
                    snapshot: client,
                    path: client.__path || resolvedPath
                  });
                  const successMessage = getEntitySaveSuccessMessage(entityType);
                  if (typeof w.showToast === "function") {
                    w.showToast(successMessage.text);
                  } else {
                    await showDialog?.(successMessage.text, { title: successMessage.title });
                  }
                } else if (!res?.canceled) {
                  const saveError = getEntitySaveErrorMessage(entityType);
                  await showDialog?.(res?.error || saveError.text, { title: saveError.title });
                }
              } catch (err) {
                console.error(err);
                const saveError = getEntitySaveErrorMessage(entityType);
                await showDialog?.(saveError.text, { title: saveError.title });
              } finally {
                clientSaveInProgress = false;
                setSaveButtonBusyState(trigger, false);
                SEM.refreshClientActionButtons?.();
              }
            };
            document.addEventListener("click", handleSaveClientClick);

            const handleUpdateClientClick = async (evt) => {
              const trigger = evt.target?.closest?.("#btnUpdateClient, #btnUpdateFournisseur, #btnUpdateTransporteur");
              if (!trigger) return;
              if (SEM.clientUpdateInProgress || trigger.dataset.updateInProgress === "1") return;
              const formScope = trigger.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              const entityType = resolveScopedClientEntityType(formScope, trigger);
              const snapshot = captureClientSnapshotFromScope(formScope);
              applyClientSnapshotToState(snapshot, formScope, { entityType });
              evaluateClientDirtyFromSnapshot(snapshot, formScope);
              if (!window.electronAPI?.updateClientDirect) {
                const unavailable = getEntityUpdateUnavailableMessage(entityType);
                await showDialog?.(unavailable.text, { title: unavailable.title });
                return;
              }
              const baseline = SEM.clientFormBaseline;
              if (!baseline?.__path || SEM.clientFormBaselineEntityType !== entityType) {
                const loadPrompt = getEntityLoadOrSaveRequiredMessage(entityType);
                await showDialog?.(loadPrompt.text, { title: loadPrompt.title });
                return;
              }
              if (SEM.clientFormAllowUpdate === false) {
                const loadPrompt = getEntityLoadOrSaveRequiredMessage(entityType);
                await showDialog?.(loadPrompt.text, { title: loadPrompt.title });
                return;
              }
              if (!SEM.clientFormDirty) {
                const noChanges = getEntityNoChangesMessage(entityType);
                await showDialog?.(noChanges.text, { title: noChanges.title });
                return;
              }
              const client = { ...snapshot };
              const getEntityState = getClientBindingHelpers().getEntityClientFormState;
              const entityState =
                typeof getEntityState === "function" ? getEntityState(entityType) : {};
              const path = baseline.__path || client.__path || entityState.__path || "";
              if (!path) {
                const pathMissing = getEntityPathMissingMessage(entityType);
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
                  getEntitySuggestedNameFallback(entityType);
                const res = await window.electronAPI.updateClientDirect({
                  client,
                  path,
                  suggestedName: suggested,
                  entityType
                });
                if (res?.ok) {
                  if (entityType === "client") {
                    const returnedCode = String(res.codeClient || "").trim();
                    if (returnedCode) {
                      client.codeClient = returnedCode;
                      const codeInput = queryScopedClientFormElement(formScope, "clientCode");
                      if (codeInput && "value" in codeInput) codeInput.value = returnedCode;
                    } else if (!String(client.codeClient || "").trim()) {
                      const inputCode = queryScopedClientFormElement(formScope, "clientCode");
                      if (inputCode && typeof inputCode.value === "string") {
                        client.codeClient = inputCode.value.trim();
                      }
                    }
                  }
                  const resolvedPath = res.path || path;
                  client.__path = resolvedPath;
                  applyClientSnapshotToState(client, formScope, {
                    entityType,
                    mirrorToDocumentState: shouldMirrorEntityStateToDocument(formScope)
                  });
                  if (
                    !formScope ||
                    (formScope.id !== "clientBoxNewDoc" &&
                      formScope.id !== "FournisseurBoxNewDoc" &&
                      formScope.id !== "fournisseurSavedModal" && formScope.id !== "fournisseurSavedModalNv" &&
                      formScope.id !== "transporteurSavedModal" && formScope.id !== "transporteurSavedModalNv")
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
                    formScope?.id === "fournisseurSavedModal" || formScope?.id === "fournisseurSavedModalNv" ||
                    formScope?.id === "transporteurSavedModal" || formScope?.id === "transporteurSavedModalNv"
                  ) {
                    evaluateClientDirtyFromSnapshot(client, formScope);
                  } else if (SEM.evaluateClientDirtyState) {
                    SEM.evaluateClientDirtyState();
                  }
                  const formCtx = getClientFormPopoverContext(formScope);
                  if (formCtx) setClientFormPopoverOpen(formCtx, false);
                  emitSavedClientModalRefreshEvent({
                    entityType,
                    snapshot: client,
                    path: resolvedPath
                  });
                  const updateSuccess = getEntityUpdateSuccessMessage(entityType);
                  await showDialog?.(updateSuccess.text, { title: updateSuccess.title });
                } else if (!res?.canceled) {
                  const updateError = getEntityUpdateErrorMessage(entityType);
                  await showDialog?.(res?.error || updateError.text, { title: updateError.title });
                }
              } catch (err) {
                console.error(err);
                const updateError = getEntityUpdateErrorMessage(entityType);
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
