(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("saved-modals-prelude", function (ctx) {
          clientSavedModal =
            getEl("clientSavedModal") ||
            getEl("clientSavedModalNv") ||
            getEl("fournisseurSavedModal") ||
            getEl("fournisseurSavedModalNv") ||
            getEl("transporteurSavedModal") ||
            getEl("transporteurSavedModalNv");
          clientSavedModalClose = clientSavedModal?.querySelector("#clientSavedModalClose") || getEl("clientSavedModalClose");
          clientSavedModalTitle =
            clientSavedModal?.querySelector("#clientSavedModalTitle") || getEl("clientSavedModalTitle");
          clientSavedModalList = clientSavedModal?.querySelector("#clientSavedModalList") || getEl("clientSavedModalList");
          clientSavedModalStatus =
            clientSavedModal?.querySelector("#clientSavedModalStatus") || getEl("clientSavedModalStatus");
          clientSavedModalPage = clientSavedModal?.querySelector("#clientSavedModalPage");
          clientSavedModalPageInput = clientSavedModal?.querySelector("#clientSavedModalPageInput");
          clientSavedModalTotalPages = clientSavedModal?.querySelector("#clientSavedModalTotalPages");
          clientSavedModalPrev = clientSavedModal?.querySelector("#clientSavedModalPrev");
          clientSavedModalNext = clientSavedModal?.querySelector("#clientSavedModalNext");
          clientSavedModalCloseFooter = clientSavedModal?.querySelector("#clientSavedModalCloseFooter");
          clientSavedSearchInput = getEl("clientSavedSearch");
          clientSavedSearchButton = getEl("clientSavedSearchBtn");
          CLIENT_SAVED_PAGE_SIZE = 5;
          CLIENT_SAVED_MIN_SEARCH_LENGTH = 2;
          createClientSavedModalEntityState = () => ({
            page: 1,
            total: 0,
            query: "",
            items: [],
            loading: false,
            message: ""
          });
          clientSavedModalStateByEntity = {
            client: createClientSavedModalEntityState(),
            vendor: createClientSavedModalEntityState(),
            transporter: createClientSavedModalEntityState()
          };
          clientSavedModalState = {
            page: 1,
            total: 0,
            query: "",
            items: [],
            loading: false,
            message: ""
          };
          resolveClientSavedModalEntityKey = (entityType = "client") =>
            entityType === "vendor"
              ? "vendor"
              : entityType === "transporter"
                ? "transporter"
                : "client";
          readClientSavedModalEntityState = (entityType = "client") =>
            clientSavedModalStateByEntity[resolveClientSavedModalEntityKey(entityType)] ||
            clientSavedModalStateByEntity.client;
          storeClientSavedModalEntityState = (entityType = "client") => {
            const targetState = readClientSavedModalEntityState(entityType);
            targetState.page = Math.max(1, Number(clientSavedModalState.page) || 1);
            targetState.total = Math.max(0, Number(clientSavedModalState.total) || 0);
            targetState.query = String(clientSavedModalState.query || "").trim();
            targetState.items = Array.isArray(clientSavedModalState.items)
              ? [...clientSavedModalState.items]
              : [];
            targetState.loading = !!clientSavedModalState.loading;
            targetState.message = String(clientSavedModalState.message || "");
          };
          applyClientSavedModalEntityState = (entityType = "client") => {
            const targetState = readClientSavedModalEntityState(entityType);
            clientSavedModalState.page = Math.max(1, Number(targetState.page) || 1);
            clientSavedModalState.total = Math.max(0, Number(targetState.total) || 0);
            clientSavedModalState.query = String(targetState.query || "").trim();
            clientSavedModalState.items = Array.isArray(targetState.items)
              ? [...targetState.items]
              : [];
            clientSavedModalState.loading = !!targetState.loading;
            clientSavedModalState.message = String(targetState.message || "");
            if (clientSavedSearchInput) {
              clientSavedSearchInput.value = clientSavedModalState.query;
            }
          };
          resetClientSavedModalEntityState = (entityType = "client") => {
            const targetState = readClientSavedModalEntityState(entityType);
            targetState.page = 1;
            targetState.total = 0;
            targetState.query = "";
            targetState.items = [];
            targetState.loading = false;
            targetState.message = "";
            clientSavedModalState.page = 1;
            clientSavedModalState.total = 0;
            clientSavedModalState.query = "";
            clientSavedModalState.items = [];
            clientSavedModalState.loading = false;
            clientSavedModalState.message = "";
            if (clientSavedSearchInput) {
              clientSavedSearchInput.value = "";
            }
          };
          clientSavedModalRefresh =
            clientSavedModal?.querySelector("#clientSavedModalRefresh") || getEl("clientSavedModalRefresh");
          getClientSavedModalLabels = (entityType = clientSavedModalEntityType) => {
            const isTransporter = entityType === "transporter";
            const isVendor = entityType === "vendor";
            const singular = isTransporter ? "transporteur" : isVendor ? "fournisseur" : "client";
            const plural = isTransporter ? "transporteurs" : isVendor ? "fournisseurs" : "clients";
            return {
              singular,
              plural,
              title: isTransporter
                ? "Transporteurs enregistres"
                : isVendor
                  ? "Fournisseurs enregistres"
                  : "Clients enregistres",
              searchPlaceholder: `Rechercher un ${singular} enregistre`,
              searchAriaLabel: `Rechercher un ${singular} enregistre`,
              formToggleLabel: `Afficher la fiche ${singular}`,
              importLabel: `Importer des ${plural}`,
              formTitle: `Fiche ${singular}`,
              typeLabel: isTransporter
                ? ""
                : isVendor
                  ? "Type de fournisseur"
                  : "Type de client",
              nameLabel: isTransporter
                ? "Transporteur / Nom"
                : isVendor
                  ? "Nom du fournisseur"
                  : "Nom du client",
              namePlaceholder: isTransporter
                ? "Transporteur ou Entreprise"
                : isVendor
                  ? "Fournisseur ou Entreprise"
                  : "Client ou Entreprise",
              phoneLabel: isTransporter
                ? "Telephone"
                : isVendor
                  ? "Telephone du fournisseur"
                  : "Telephone du client",
              emailLabel: isTransporter
                ? "E-mail"
                : isVendor
                  ? "E-mail du fournisseur"
                  : "E-mail du client",
              emailPlaceholder: isTransporter
                ? "transporteur@email.com"
                : isVendor
                  ? "fournisseur@email.com"
                  : "client@email.com",
              addressLabel: isTransporter
                ? "Adresse"
                : isVendor
                  ? "Adresse du fournisseur"
                  : "Adresse du client",
              emptyText: `Aucun ${singular} enregistre.`,
              emptyStatusText: `Aucun ${singular} enregistre pour le moment.`,
              loadingText: `Chargement des ${plural}...`,
              noneFoundText: `Aucun ${singular} trouve`,
              typeFieldKey: null,
              popoverSelector: isTransporter
                ? "#transporteurFormPopover"
                : isVendor
                  ? "#fournisseurFormPopover"
                  : "#clientFormPopover",
              popoverTitleId: isTransporter
                ? "#transporteurFormPopoverTitle"
                : isVendor
                  ? "#fournisseurFormPopoverTitle"
                  : "#clientFormPopoverTitle",
              allowParticulier: !isVendor && !isTransporter
            };
          };
          applyClientSavedModalLabels = (entityType = clientSavedModalEntityType) => {
            const labels = getClientSavedModalLabels(entityType);
            if (clientSavedModalTitle) clientSavedModalTitle.textContent = labels.title;
            if (clientSavedSearchInput) clientSavedSearchInput.placeholder = labels.searchPlaceholder;
            if (clientSavedSearchButton) {
              clientSavedSearchButton.setAttribute("aria-label", labels.searchAriaLabel);
            }
            if (!clientSavedModal) return;
            const toggleBtn = clientSavedModal.querySelector("#clientFormToggleBtn");
            if (toggleBtn) toggleBtn.setAttribute("aria-label", labels.formToggleLabel);
            const importBtn = clientSavedModal.querySelector("#clientImportBtn");
            if (importBtn) importBtn.setAttribute("aria-label", labels.importLabel);
            const popover = clientSavedModal.querySelector(labels.popoverSelector);
            const popoverTitle = popover?.querySelector?.(labels.popoverTitleId);
            if (popoverTitle) popoverTitle.textContent = labels.formTitle;
            const typeLabel = queryScopedClientFormElement(popover, "clientTypeLabel");
            if (typeLabel) typeLabel.textContent = labels.typeLabel;
            const updateFormLabel = (inputId, labelText, placeholder) => {
              const input = queryScopedClientFormElement(popover, inputId);
              if (!input) return;
              if (placeholder !== undefined) input.placeholder = placeholder;
              const label = input.closest("label");
              if (!label) return;
              const dynamicLabelNode = label.querySelector(
                "[data-client-field-label], [data-fournisseur-field-label], [data-transporteur-field-label]"
              );
              if (dynamicLabelNode) {
                dynamicLabelNode.textContent = labelText;
                return;
              }
              const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
              if (textNode) {
                textNode.textContent = `${labelText} `;
              } else {
                label.insertBefore(document.createTextNode(`${labelText} `), input);
              }
            };
            updateFormLabel("clientName", labels.nameLabel, labels.namePlaceholder);
            updateFormLabel("clientPhone", labels.phoneLabel);
            updateFormLabel("clientEmail", labels.emailLabel, labels.emailPlaceholder);
            updateFormLabel("clientAddress", labels.addressLabel);
            const typePanel = queryScopedClientFormElement(popover, "clientTypePanel");
            const typeSelect = queryScopedClientFormElement(popover, "clientType");
            const particulierOption = typePanel?.querySelector?.('[data-client-type-option="particulier"]');
            const particulierSelect = typeSelect?.querySelector?.('option[value="particulier"]');
            if (particulierOption) {
              particulierOption.hidden = !labels.allowParticulier;
              particulierOption.setAttribute("aria-hidden", labels.allowParticulier ? "false" : "true");
            }
            if (particulierSelect) {
              if (!labels.allowParticulier) {
                particulierSelect.setAttribute("hidden", "");
                particulierSelect.setAttribute("aria-hidden", "true");
              } else {
                particulierSelect.removeAttribute("hidden");
                particulierSelect.setAttribute("aria-hidden", "false");
              }
            }
            if (!labels.allowParticulier && typeSelect?.value === "particulier") {
              typeSelect.value = "societe";
              typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
            if (popover) {
              if (entityType === "transporter") {
                popover.querySelectorAll("[data-transporteur-field-label]").forEach((node) => {
                  const key = String(node.dataset.transporteurFieldLabel || "").trim();
                  if (!key) return;
                  node.textContent = resolveScopedClientFieldLabel(key, "transporter");
                });
                popover.querySelectorAll("[data-transporteur-field]").forEach((node) => {
                  const key = String(node.dataset.transporteurField || "").trim();
                  if (!key) return;
                  const isVisible = getScopedClientFieldVisibility("transporter")[key] !== false;
                  node.hidden = !isVisible;
                  node.style.display = isVisible ? "" : "none";
                  node.classList.toggle("is-hidden", !isVisible);
                });
              } else {
                applyClientFieldLabels(popover, clientFieldLabels);
              }
            }
          };
          setClientSavedRefreshBusy = (isBusy) => {
            if (!clientSavedModalRefresh) return;
            clientSavedModalRefresh.disabled = !!isBusy;
            if (isBusy) {
              clientSavedModalRefresh.setAttribute("aria-busy", "true");
            } else {
              clientSavedModalRefresh.removeAttribute("aria-busy");
            }
          };
          getClientSavedModalTotalPages = () =>
            clientSavedModalState.total > 0
              ? Math.max(1, Math.ceil(clientSavedModalState.total / CLIENT_SAVED_PAGE_SIZE))
              : 1;
          clientSavedModalRestoreFocus = null;
          clientSavedSearchTimer = null;
          clientSavedModalRequestId = 0;
          clientSavedModalAllowAddAction = true;
          clientSavedModalFormScope = null;
          clientSavedModalEntityType = "client";
          isItemsDocOptionsModalOpen = () => {
            const itemsModal = document.getElementById("itemsDocOptionsModal");
            return (
              itemsModal &&
              itemsModal.classList.contains("is-open") &&
              itemsModal.getAttribute("aria-hidden") === "false"
            );
          };
          setClientSavedModalId = (entityType, options = {}) => {
            if (!clientSavedModal) return;
            const fromItemsModal = !!options.fromItemsModal;
            const nextId =
              entityType === "transporter"
                ? fromItemsModal
                  ? "transporteurSavedModalNv"
                  : "transporteurSavedModal"
                : entityType === "vendor"
                  ? fromItemsModal
                    ? "fournisseurSavedModalNv"
                    : "fournisseurSavedModal"
                  : fromItemsModal
                    ? "clientSavedModalNv"
                    : "clientSavedModal";
            if (clientSavedModal.id !== nextId) {
              clientSavedModal.id = nextId;
            }
            clientSavedModal.dataset.clientEntityType = entityType;
          };
          buildClientSavedModalPopoverContext = (entityType = clientSavedModalEntityType) => {
            if (!clientSavedModal) return null;
            const popoverSelector =
              entityType === "transporter"
                ? "#transporteurFormPopover"
                : entityType === "vendor"
                  ? "#fournisseurFormPopover"
                  : "#clientFormPopover";
            const popover = clientSavedModal.querySelector(popoverSelector);
            if (!popover) return null;
            const toggle = clientSavedModal.querySelector("#clientFormToggleBtn");
            return { scope: clientSavedModal, popover, toggle };
          };
          setClientSavedModalPopoverIds = (entityType) => {
            if (!clientSavedModal) return;
            const clientPopover = clientSavedModal.querySelector("#clientFormPopover");
            const vendorPopover = clientSavedModal.querySelector("#fournisseurFormPopover");
            const transporterPopover = clientSavedModal.querySelector("#transporteurFormPopover");
            const nextPopover =
              entityType === "transporter"
                ? transporterPopover
                : entityType === "vendor"
                  ? vendorPopover
                  : clientPopover;
            [clientPopover, vendorPopover, transporterPopover].forEach((popover) => {
              if (!popover || popover === nextPopover) return;
              popover.classList.remove("is-open");
              popover.hidden = true;
              popover.setAttribute("hidden", "");
              popover.setAttribute("aria-hidden", "true");
            });
            if (nextPopover) {
              const nextTitleId =
                entityType === "transporter"
                  ? "transporteurFormPopoverTitle"
                  : entityType === "vendor"
                    ? "fournisseurFormPopoverTitle"
                    : "clientFormPopoverTitle";
              nextPopover.setAttribute("aria-labelledby", nextTitleId);
            }
            const toggleBtn = clientSavedModal.querySelector("#clientFormToggleBtn");
            if (toggleBtn) {
              toggleBtn.setAttribute(
                "aria-controls",
                entityType === "transporter"
                  ? "transporteurFormPopover"
                  : entityType === "vendor"
                    ? "fournisseurFormPopover"
                    : "clientFormPopover"
              );
            }
          };
          initClientFieldVisibility = async () => {
            applyClientFieldVisibility(document, clientFieldVisibility);
            syncClientFieldToggleStates(document, clientFieldVisibility);
            applyClientFieldLabels(document, clientFieldLabels);
            updateClientImportExampleHeaderCopy(clientFieldVisibility, clientFieldLabels);
            const loaded = await loadClientFieldSettings();
            clientFieldVisibility = normalizeClientFieldVisibility(loaded.visibility);
            clientFieldLabels = normalizeClientFieldLabels(loaded.labels);
            clientFieldVisibilityDraft = { ...clientFieldVisibility };
            clientFieldLabelsDraft = { ...clientFieldLabels };
            applyClientFieldVisibility(document, clientFieldVisibility);
            syncClientFieldToggleStates(document, clientFieldVisibility);
            applyClientFieldLabels(document, clientFieldLabels);
            syncClientFieldLabelInputs(document, clientFieldLabels);
            syncClientFieldSettingsToState(clientFieldVisibility, clientFieldLabels);
            updateClientImportExampleHeaderCopy(clientFieldVisibility, clientFieldLabels);
          };
          if (typeof document !== "undefined") {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", initClientFieldVisibility, { once: true });
            } else {
              initClientFieldVisibility();
            }
          }
          initArticleFieldVisibility = async () => {
            applyArticleColumnVisibility(articleFieldVisibility);
            const loaded = await loadArticleFieldSettings();
            articleFieldVisibility = normalizeArticleFieldVisibility(loaded.visibility);
            articleFieldDefaults = normalizeArticleFieldDefaults(loaded.defaults);
            articleFieldLabels = normalizeArticleFieldLabels(loaded.labels || {});
            articleFieldVisibilityDraft = { ...articleFieldVisibility };
            articleFieldDefaultsDraft = { ...articleFieldDefaults };
            articleFieldLabelsDraft = { ...articleFieldLabels };
            applyArticleColumnVisibility(articleFieldVisibility);
            applyArticleFieldDefaults(document, articleFieldDefaults);
            syncArticleFieldDefaultInputs(document, articleFieldDefaults);
            syncArticleFieldDefaultsToState(articleFieldDefaults);
            applyArticleFieldLabels(document, articleFieldLabels);
            syncArticleFieldLabelInputs(document, articleFieldLabels);
            syncArticleFieldLabelsToState(articleFieldLabels);
            updateArticleImportExampleVisibility(articleFieldVisibility);
            updateArticleImportCopyHeaders(articleFieldVisibility);
            updateArticlesExportExampleVisibility(articleFieldVisibility);
          };
          if (typeof document !== "undefined") {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", initArticleFieldVisibility, { once: true });
            } else {
              initArticleFieldVisibility();
            }
          }
          initArticleFieldLabels = () => {
            articleFieldLabels = normalizeArticleFieldLabels(state().meta?.articleFieldLabels || {});
            articleFieldLabelsDraft = { ...articleFieldLabels };
            applyArticleFieldLabels(document, articleFieldLabels);
            syncArticleFieldLabelInputs(document, articleFieldLabels);
            syncArticleFieldLabelsToState(articleFieldLabels);
          };
          if (typeof document !== "undefined") {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", initArticleFieldLabels, { once: true });
            } else {
              initArticleFieldLabels();
            }
          }
          document.addEventListener("click", (evt) => {
            const trigger = evt.target?.closest?.(clientFieldsSettingsBtnSelector);
            if (trigger) {
              const modalId = trigger.getAttribute("aria-controls");
              const modal = modalId ? document.getElementById(modalId) : null;
              if (!modal) return;
              if (modal.classList.contains("is-open")) {
                closeClientFieldsSettingsModal(modal);
              } else {
                openClientFieldsSettingsModal(modal, trigger);
              }
              return;
            }
            const closeBtn = evt.target?.closest?.("[data-client-fields-modal-close]");
            if (!closeBtn) return;
            const modal = closeBtn.closest(".client-fields-modal");
            closeClientFieldsSettingsModal(modal);
          });
          document.addEventListener("click", (evt) => {
            const trigger = evt.target?.closest?.(articleFieldsSettingsBtnSelector);
            if (trigger) {
              const modalId = trigger.getAttribute("aria-controls");
              const modal = modalId ? document.getElementById(modalId) : null;
              if (!modal) return;
              if (modal.classList.contains("is-open")) {
                closeArticleFieldsSettingsModal(modal);
              } else {
                openArticleFieldsSettingsModal(modal, trigger);
              }
              return;
            }
            const closeBtn = evt.target?.closest?.("[data-article-fields-modal-close]");
            if (!closeBtn) return;
            const modal = closeBtn.closest(".article-fields-settings-modal");
            closeArticleFieldsSettingsModal(modal);
          });
          document.addEventListener("click", (evt) => {
            const stepTab = evt.target?.closest?.(".article-fields-modal [data-article-fields-step]");
            if (!stepTab) return;
            const modal = stepTab.closest(".article-fields-settings-modal");
            const stepNum = Number(stepTab.dataset.articleFieldsStep);
            if (!Number.isFinite(stepNum)) return;
            syncArticleFieldsStepper(modal, stepNum, { focusPanel: true });
          });
          document.addEventListener("click", (evt) => {
            const prevBtn = evt.target?.closest?.(".article-fields-modal [data-article-fields-step-prev]");
            if (!prevBtn) return;
            const modal = prevBtn.closest(".article-fields-settings-modal");
            if (!modal) return;
            const currentStep = Number(modal.dataset.articleFieldsStep || articleFieldsStepperActive || 1);
            syncArticleFieldsStepper(modal, currentStep - 1, { focusPanel: true });
          });
          document.addEventListener("click", (evt) => {
            const nextBtn = evt.target?.closest?.(".article-fields-modal [data-article-fields-step-next]");
            if (!nextBtn) return;
            const modal = nextBtn.closest(".article-fields-settings-modal");
            if (!modal) return;
            const currentStep = Number(modal.dataset.articleFieldsStep || articleFieldsStepperActive || 1);
            syncArticleFieldsStepper(modal, currentStep + 1, { focusPanel: true });
          });
          document.addEventListener("click", (evt) => {
            const saveBtn = evt.target?.closest?.("[data-article-fields-modal-save]");
            if (!saveBtn) return;
            const modal = saveBtn.closest(".article-fields-settings-modal");
            commitArticleFieldSettings(modal);
          });
            document.addEventListener("change", (evt) => {
              const hidePurchaseToggle = evt.target?.closest?.(
                ".article-fields-modal input[data-article-fields-hide-purchase]"
              );
              if (hidePurchaseToggle) {
                setArticlePurchaseSectionEnabled(!!hidePurchaseToggle.checked);
                return;
              }
              const hideSalesToggle = evt.target?.closest?.(
                ".article-fields-modal input[data-article-fields-hide-sales]"
              );
              if (hideSalesToggle) {
                setArticleSalesSectionEnabled(!!hideSalesToggle.checked);
                return;
              }
              const toggle = evt.target?.closest?.(".article-fields-modal input[data-column-key]");
              if (!toggle) return;
              const key = toggle.dataset.columnKey;
              if (!key) return;
              updateArticleFieldVisibilityDraft({ [key]: toggle.checked });
            });
            document.addEventListener("input", (evt) => {
              const defaultInput = evt.target?.closest?.(".article-fields-modal input[data-article-default-input]");
              if (!defaultInput) return;
              const key = defaultInput.dataset.articleDefaultInput;
              if (!key) return;
              updateArticleFieldDefaultsDraft({ [key]: defaultInput.value }, { sourceInput: defaultInput });
            });
            document.addEventListener("input", (evt) => {
              const labelInput = evt.target?.closest?.(".article-fields-modal input[data-article-field-label-input]");
              if (!labelInput) return;
              updateArticleFieldLabelsDraft({
                [labelInput.dataset.articleFieldLabelInput]: labelInput.value
              }, { sourceInput: labelInput });
            });
            document.addEventListener("click", (evt) => {
              const resetBtn = evt.target?.closest?.(".article-fields-modal [data-article-field-label-reset]");
              if (!resetBtn) return;
              const key = resetBtn.dataset.articleFieldLabelReset;
              if (!key) return;
              const defaults = resolveArticleFieldLabelDefaults();
              const nextValue = defaults[key] ?? "";
              updateArticleFieldLabelsDraft({ [key]: nextValue });
            });
          document.addEventListener("click", (evt) => {
            const saveBtn = evt.target?.closest?.("[data-client-fields-modal-save]");
            if (!saveBtn) return;
            commitClientFieldVisibilityDraft();
            const modal = saveBtn.closest(".client-fields-modal");
            closeClientFieldsSettingsModal(modal);
          });
          document.addEventListener("change", (evt) => {
            const toggle = evt.target?.closest?.(".client-fields-modal input[data-field-key]");
            if (!toggle) return;
            updateClientFieldVisibilityDraft({ [toggle.dataset.fieldKey]: toggle.checked });
          });
          document.addEventListener("input", (evt) => {
            const labelInput = evt.target?.closest?.(".client-fields-modal input[data-field-label-input]");
            if (!labelInput) return;
            updateClientFieldLabelsDraft(
              { [labelInput.dataset.fieldLabelInput]: labelInput.value },
              { sourceInput: labelInput }
            );
          });
          document.addEventListener("click", (evt) => {
            const resetBtn = evt.target?.closest?.(".client-fields-modal [data-field-label-reset]");
            if (!resetBtn) return;
            const key = resetBtn.dataset.fieldLabelReset;
            if (!key) return;
            const defaults = resolveClientFieldLabelDefaults();
            const nextValue = defaults[key] ?? "";
            updateClientFieldLabelsDraft({ [key]: nextValue });
          });

  }, { order: 300 });

  registerCoreBootstrapRuntimeSource("saved-modals-article-prelude", function (ctx) {
          articleSavedListBtns = Array.from(
            document.querySelectorAll("#articleSavedListBtn, #articleSavedListToggleBtn, #btnAddArticleMenu")
          );
          articleCreateBtn = getEl("articleCreateBtn");
          articleSavedModal = getEl("articleSavedModal");
          articleSavedModalClose = articleSavedModal?.querySelector("#articleSavedModalClose") || getEl("articleSavedModalClose");
          articleSavedModalList = articleSavedModal?.querySelector("#articleSavedModalList") || getEl("articleSavedModalList");
          articleSavedModalStatus =
            articleSavedModal?.querySelector("#articleSavedModalStatus") || getEl("articleSavedModalStatus");
          articleSavedModalPage =
            articleSavedModal?.querySelector("#clientSavedModalPage, #articleSavedModalPage") || getEl("articleSavedModalPage");
          articleSavedModalPageInput =
            articleSavedModal?.querySelector("#clientSavedModalPageInput, #articleSavedModalPageInput");
          articleSavedModalTotalPages =
            articleSavedModal?.querySelector("#clientSavedModalTotalPages, #articleSavedModalTotalPages");
          articleSavedModalPrev =
            articleSavedModal?.querySelector("#clientSavedModalPrev, #articleSavedModalPrev") || getEl("articleSavedModalPrev");
          articleSavedModalNext =
            articleSavedModal?.querySelector("#clientSavedModalNext, #articleSavedModalNext") || getEl("articleSavedModalNext");
          docOptionsPanel = getEl("DocOptions");
          articleSavedModalCloseFooter =
            articleSavedModal?.querySelector("#clientSavedModalCloseFooter, #articleSavedModalCloseFooter") ||
            getEl("articleSavedModalCloseFooter");
          articleSavedModalRefresh =
            articleSavedModal?.querySelector("#articleSavedModalRefresh") || getEl("articleSavedModalRefresh");
          articleSavedSearchInput = getEl("articleSavedSearch");
          articleSavedSearchButton = getEl("articleSavedSearchBtn");
          ARTICLE_SAVED_PAGE_SIZE = 5;
          ARTICLE_SAVED_MIN_SEARCH_LENGTH = 2;
          getArticleSavedModalTotalPages = () => {
            const total = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items.length : 0;
            return total ? Math.max(1, Math.ceil(total / ARTICLE_SAVED_PAGE_SIZE)) : 1;
          };
          articleSavedModalState = {
            page: 1,
            query: "",
            items: [],
            loading: false,
            message: ""
          };
          setArticleSavedRefreshBusy = (isBusy) => {
            if (!articleSavedModalRefresh) return;
            articleSavedModalRefresh.disabled = !!isBusy;
            if (isBusy) articleSavedModalRefresh.setAttribute("aria-busy", "true");
            else articleSavedModalRefresh.removeAttribute("aria-busy");
          };
          articleSavedModalRestoreFocus = null;
          articleSavedSearchTimer = null;
          articleSavedModalRequestId = 0;
          articleSavedModalAllowAddAction = true;
          articleSavedModalForceAddActionForMainscreenScope = false;
          articleSavedModalFormScope = null;
          articleSavedModalFormScopeId = null;
          ADD_FORM_FIELD_IDS = new Set([
            "addRef",
            "addProduct",
            "addDesc",
            "addStockQty",
            "addUnit",
            "addPurchasePrice",
            "addPurchasePriceTtc",
            "addPurchaseTva",
            "addPurchaseFodecRate",
            "addPurchaseFodecTva",
            "addPrice",
            "addPriceTtc",
            "addPriceLabel",
            "addTva",
            "addDiscount"
          ]);

          ADD_FORM_SCOPE_SELECTOR = "#addItemBox, #addItemBoxMainscreen, #articleFormPopover";
          ADD_FORM_SCOPED_IDS = new Set([
            "articleSearch",
            "articleSearchBtn",
            "articleSearchResults",
            "addRef",
            "addProduct",
            "addDesc",
            "addStockQty",
            "addUnit",
            "addPurchasePrice",
            "addPurchasePriceTtc",
            "addPurchaseTva",
            "addPurchaseDiscount",
            "addPurchaseFodecRow",
            "addPurchaseFodecEnabled",
            "addPurchaseFodecRate",
            "addPurchaseFodecTva",
            "addPurchaseFodecAmount",
            "addPrice",
            "addPriceTtc",
            "addTva",
            "addDiscount",
            "addQty",
            "addFodecRow",
            "addFodecEnabled",
            "addFodecRate",
            "addFodecTva",
            "addFodecAmount",
            "addTotalPurchaseHt",
            "addTotalPurchaseTtc",
            "addTotalHt",
            "addTotalTtc",
            "btnSaveArticle",
            "btnAddArticleFromPopover",
            "btnAddAndSaveArticleFromPopover",
            "btnUpdateSavedArticle",
            "btnUpdateInvoiceItem",
            "btnNewItem"
          ]);
          SEM.__addFormScopedIds = ADD_FORM_SCOPED_IDS;
          activeAddFormScope = null;

          normalizeAddFormScope = (node) => {
            if (!node || typeof node.closest !== "function") return null;
            const root = node.closest(ADD_FORM_SCOPE_SELECTOR);
            return root && root.isConnected ? root : null;
          };

          resolveAddFormScope = (hint) => {
            const hintScope = normalizeAddFormScope(hint);
            if (hintScope) return hintScope;
            if (activeAddFormScope?.isConnected) return activeAddFormScope;
            const focusedScope = normalizeAddFormScope(document.activeElement);
            if (focusedScope) return focusedScope;
            return null;
          };

          setActiveAddFormScope = (scope) => {
            activeAddFormScope = normalizeAddFormScope(scope);
          };

          setDocOptionsCollapsed = (collapsed) => {
            if (!docOptionsPanel) return;
            docOptionsPanel.classList.toggle("is-collapsed", !!collapsed);
            if (collapsed && docOptionsPanel.contains(document.activeElement)) {
              try {
                document.activeElement.blur();
              } catch {}
            }
          };

          SEM.getScopedElement = (id, scopeHint) => {
            if (!ADD_FORM_SCOPED_IDS.has(id)) return null;
            const scope = resolveAddFormScope(scopeHint);
            return scope ? scope.querySelector(`#${id}`) : null;
          };
          SEM.resolveAddFormScope = resolveAddFormScope;
          SEM.setActiveAddFormScope = setActiveAddFormScope;

          Array.from(document.querySelectorAll(ADD_FORM_SCOPE_SELECTOR)).forEach((root) => {
            root?.addEventListener("pointerdown", () => setActiveAddFormScope(root));
            root?.addEventListener("focusin", () => setActiveAddFormScope(root));
          });

          articleSearchInput = getEl("articleSearch");
          articleSearchButton = getEl("articleSearchBtn");
          articleSearchResults = getEl("articleSearchResults");
          ARTICLE_SEARCH_PAGE_SIZE = 2;
          MIN_ARTICLE_SEARCH_LENGTH = 2;
          articleSearchTimer = null;
          articleSearchData = [];
          articleSearchPage = 1;
          lastArticleSearchQuery = "";

  }, { order: 500 });

  registerCoreBootstrapRuntimeSource("saved-modals-utils", function (ctx) {
          resolveClientSearchInputElement = (scopeNode = null) => {
            if (scopeNode) {
              return resolveScopedClientSearchInput(scopeNode);
            }
            return getDefaultClientSearchInput();
          };
          resolveClientSearchResultsElement = (scopeNode = null) => {
            if (scopeNode) {
              return resolveScopedClientSearchResults(scopeNode);
            }
            return getDefaultClientSearchResults();
          };
          getClientSearchStateHandle = ({ scopeNode = null, inputEl = null, resultsEl = null } = {}) =>
            getClientSearchBucketState({
              scopeNode: scopeNode || resolveClientSearchScope(inputEl, resultsEl),
              inputEl: inputEl || null,
              resultsEl: resultsEl || null
            });

          hideClientSearchResults = (resultsEl = getDefaultClientSearchResults()) => {
            if (!resultsEl) return;
            resultsEl.innerHTML = "";
            resultsEl.hidden = true;
            resultsEl.classList.remove("client-search--paged");
          };

          showClientSearchStatus = (html, resultsEl = getDefaultClientSearchResults()) => {
            if (!resultsEl) return;
            resultsEl.classList.remove("client-search--paged");
            resultsEl.innerHTML = html;
            resultsEl.hidden = false;
          };

          hideArticleSearchResults = (resultsEl = articleSearchResults) => {
            if (!resultsEl) return;
            resultsEl.innerHTML = "";
            resultsEl.hidden = true;
            resultsEl.classList.remove("article-search--paged");
          };

          showArticleSearchStatus = (html, resultsEl = articleSearchResults) => {
            if (!resultsEl) return;
            resultsEl.classList.remove("article-search--paged");
            resultsEl.innerHTML = html;
            resultsEl.hidden = false;
          };

          clearClientSearchInputValue = (inputEl = getDefaultClientSearchInput()) => {
            if (!inputEl) return;
            inputEl.value = "";
          };
          resetClientSearchSession = ({ scopeNode = null, inputEl = null, resultsEl = null } = {}) => {
            const resolvedScope =
              scopeNode ||
              resolveClientSearchScope(inputEl, resultsEl) ||
              resolveClientScopeFromNode(resultsEl);
            const resolvedInput = inputEl || resolveClientSearchInputElement(resolvedScope);
            const resolvedResults = resultsEl || resolveClientSearchResultsElement(resolvedScope);
            const searchState = getClientSearchStateHandle({
              scopeNode: resolvedScope,
              inputEl: resolvedInput,
              resultsEl: resolvedResults
            });
            const activeTimer = searchState?.getTimer?.();
            if (activeTimer) {
              clearTimeout(activeTimer);
            }
            searchState?.setTimer?.(null);
            searchState?.setData?.([]);
            searchState?.setPage?.(1);
            clearClientSearchInputValue(resolvedInput);
            hideClientSearchResults(resolvedResults);
          };

          clearArticleSearchInputValue = (inputEl = articleSearchInput) => {
            if (!inputEl) return;
            inputEl.value = "";
          };

          toggleStockMinimumInput = (selectEl) => {
            if (!selectEl) return;
            const stockBlock = selectEl.closest(".client-search__stock-min");
            const input = stockBlock?.querySelector("[data-stock-min-input]");
            const isCheckbox = selectEl.type === "checkbox";
            const active = isCheckbox ? selectEl.checked : selectEl.value === "active";
            if (input) {
              input.disabled = !active;
            }
            if (stockBlock) {
              stockBlock.dataset.stockMinActive = active ? "true" : "false";
            }
            updateStockMeterHandle(stockBlock || selectEl);
          };

          STOCK_METER_MAX_LEVEL = 5;
          requestStockAlertRefresh = () => {};

          normalizeStockQtyValue = (value) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return 0;
            const rounded = Math.round(num * 1000) / 1000;
            return rounded < 0 ? 0 : rounded;
          };

          getStockDeltaValue = (optionEl) => {
            const deltaInput = optionEl?.querySelector?.("[data-stock-qty-delta]");
            const raw = deltaInput?.value ?? "0";
            let delta = Number(raw);
            if (!Number.isFinite(delta) || delta < 0) delta = 0;
            delta = Math.round(delta);
            if (deltaInput && deltaInput.value !== String(delta)) deltaInput.value = String(delta);
            return delta;
          };

          setOptionStockQty = (optionEl, value) => {
            const normalized = normalizeStockQtyValue(value);
            const stockValueEl = optionEl?.querySelector?.("[data-stock-qty-value]");
            if (stockValueEl) {
              stockValueEl.dataset.stockQtyValue = String(normalized);
              stockValueEl.textContent = normalized.toFixed(3).replace(/\.?0+$/, "");
            }
            const handle = optionEl?.querySelector?.(".client-search__select-handle");
            if (handle) handle.dataset.stockQty = String(normalized);
            return normalized;
          };

          persistStockQty = async (optionEl, value) => {
            const normalizedValue = normalizeStockQtyValue(value);
            const savedIdxRaw = optionEl?.dataset?.articleSavedIndex;
            const searchIdxRaw = optionEl?.dataset?.articleIndex;
            let targetArticle = null;
            let articlePath = "";
            if (savedIdxRaw !== undefined) {
              const idx = Number(savedIdxRaw);
              const item = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items[idx] : null;
              if (item?.article && typeof item.article === "object") {
                item.article.stockQty = normalizedValue;
                targetArticle = item.article;
                articlePath = item.path || "";
              }
            }
            if (searchIdxRaw !== undefined) {
              const idx = Number(searchIdxRaw);
              const item = Array.isArray(articleSearchData) ? articleSearchData[idx] : null;
              const target = item?.article && typeof item.article === "object" ? item.article : item;
              if (target && typeof target === "object") {
                target.stockQty = normalizedValue;
                targetArticle = targetArticle || target;
                articlePath = articlePath || item?.path || target?.__path || "";
              }
            }

            if (articlePath && targetArticle && window.electronAPI?.updateArticle) {
              const payload = { ...targetArticle, stockQty: normalizedValue };
              const suggestedName =
                typeof SEM.forms?.pickSuggestedName === "function"
                  ? SEM.forms.pickSuggestedName(payload)
                  : payload.product || payload.ref || payload.desc || "article";
              try {
                await window.electronAPI.updateArticle({ path: articlePath, article: payload, suggestedName });
              } catch (err) {
                console.error("persistStockQty updateArticle", err);
              }
            }
            requestStockAlertRefresh();
            return normalizedValue;
          };

          persistStockPrefs = async (optionEl, active, value) => {
            const normalizedValue = Number.isFinite(value) && value >= 0 ? value : 1;
            const activeBool = !!active;
            const savedIdxRaw = optionEl?.dataset?.articleSavedIndex;
            const searchIdxRaw = optionEl?.dataset?.articleIndex;
            let targetArticle = null;
            let articlePath = "";
            if (savedIdxRaw !== undefined) {
              const idx = Number(savedIdxRaw);
              const item = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items[idx] : null;
              if (item?.article && typeof item.article === "object") {
                item.article.stockMin = normalizedValue;
                item.article.stockAlert = activeBool;
                targetArticle = item.article;
                articlePath = item.path || "";
              }
            }
            if (searchIdxRaw !== undefined) {
              const idx = Number(searchIdxRaw);
              const item = Array.isArray(articleSearchData) ? articleSearchData[idx] : null;
              const target = item?.article && typeof item.article === "object" ? item.article : item;
              if (target && typeof target === "object") {
                target.stockMin = normalizedValue;
                target.stockAlert = activeBool;
                targetArticle = targetArticle || target;
                articlePath = articlePath || item?.path || target?.__path || "";
              }
            }

            if (articlePath && targetArticle && window.electronAPI?.updateArticle) {
              const payload = { ...targetArticle, stockMin: normalizedValue, stockAlert: activeBool };
              const suggestedName =
                typeof SEM.forms?.pickSuggestedName === "function"
                  ? SEM.forms.pickSuggestedName(payload)
                  : payload.product || payload.ref || payload.desc || "article";
              try {
                await window.electronAPI.updateArticle({ path: articlePath, article: payload, suggestedName });
              } catch (err) {
                console.error("persistStockPrefs updateArticle", err);
              }
            }
            requestStockAlertRefresh();
          };

          resolveStockMeterState = (stockQty, stockMin, isActive) => {
            const qty = Number(stockQty);
            const min = Number(stockMin);
            const qtyValid = Number.isFinite(qty) && qty >= 0;
            const minValid = Number.isFinite(min) && min >= 0;
            if (!qtyValid) {
              return { level: 0, state: "off" };
            }
            if (!isActive) {
              const hasStock = qty > 0;
              return { level: hasStock ? STOCK_METER_MAX_LEVEL : 0, state: hasStock ? "ok" : "off" };
            }
            const minValue = minValid ? min : 0;
            if (qty <= minValue) {
              return { level: 1, state: "low" };
            }
            const base = Math.max(minValue, 1);
            const ratio = qty / base;
            let level = STOCK_METER_MAX_LEVEL;
            if (ratio <= 1.25) level = 2;
            else if (ratio <= 1.5) level = 3;
            else if (ratio <= 2) level = 4;
            else level = STOCK_METER_MAX_LEVEL;
            return { level, state: "ok" };
          };

          updateStockMeterHandle = (originEl) => {
            const option = originEl?.closest?.(".client-search__option");
            if (!option) return;
            const handle = option.querySelector?.(".client-search__select-handle");
            if (!handle) return;
            const stockBlock = option.querySelector(".client-search__stock-min");
            const toggle = stockBlock?.querySelector("[data-stock-min-toggle]");
            const input = stockBlock?.querySelector("[data-stock-min-input]");
            const stockValueEl = option.querySelector("[data-stock-qty-value]");
            const stockQtyRaw = handle.dataset.stockQty ?? stockValueEl?.dataset.stockQtyValue ?? "";
            const stockQty = stockQtyRaw === "" ? Number.NaN : Number(stockQtyRaw);
            const stockMinRaw = input?.value ?? "";
            const stockMin = stockMinRaw === "" ? Number.NaN : Number(stockMinRaw);
            const isActive =
              (stockBlock?.dataset.stockMinActive === "true") || (toggle ? toggle.checked : false);
            const { level, state: meterState } = resolveStockMeterState(stockQty, stockMin, isActive);
            handle.dataset.stockLevel = String(level);
            handle.dataset.stockState = meterState;
            const stockBadge = option.querySelector(".client-search__stock-badge");
            if (stockBadge) {
              stockBadge.dataset.stockState = meterState;
            }
            handle.setAttribute("aria-valuenow", String(level));
            handle.setAttribute("aria-valuemin", "0");
            handle.setAttribute("aria-valuemax", String(STOCK_METER_MAX_LEVEL));
            const sr = handle.querySelector(".sr-only");
            if (sr) sr.textContent = `Stock level ${level} of ${STOCK_METER_MAX_LEVEL}`;
          };

          refreshStockMeters = (rootEl) => {
            const scope = rootEl || document;
            scope.querySelectorAll?.(".client-search__option .client-search__select-handle").forEach((handle) => {
              updateStockMeterHandle(handle);
            });
          };

          resolveClientSearchPageSize = (resultsEl) => {
            const fallbackSize = Math.max(1, Number(CLIENT_SEARCH_PAGE_SIZE) || 1);
            if (
              resultsEl?.id === "clientSearchResults" ||
              resultsEl?.id === "fournisseurSearchResults" ||
              resultsEl?.id === "transporteurSearchResults"
            ) {
              return 2;
            }
            return fallbackSize;
          };

          renderClientSearchResults = (items, queryText, resultsEl = clientSearchResults, options = {}) => {
            if (!resultsEl) return;
            resultsEl.innerHTML = "";
            resultsEl.classList.remove("client-search--paged");
            const scopeNode = resolveClientScopeFromNode(resultsEl);
            const searchState =
              options?.searchState ||
              getClientSearchStateHandle({
                scopeNode,
                resultsEl
              });
            const currentPage = Math.max(1, Number(searchState?.getPage?.() || 1) || 1);
            const entityType = resolveClientEntityType(scopeNode);
            const labels = getClientSavedModalLabels(entityType);
            const scopedFieldLabels = getScopedClientFieldLabels(entityType);
            const resolveFieldLabel = (key) =>
              resolveScopedClientFieldLabel(key, entityType, scopedFieldLabels);
            const scopedVisibility = getScopedClientFieldVisibility(entityType);
            if (!items?.length) {
              if (queryText) {
                showClientSearchStatus(
                  `<div class="client-search__status">${escapeHTML(labels.noneFoundText)}</div>`,
                  resultsEl
                );
              } else {
                hideClientSearchResults(resultsEl);
              }
              return;
            }

            const total = items.length;
            const pageSize = resolveClientSearchPageSize(resultsEl);
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            let normalizedPage = currentPage;
            if (normalizedPage > totalPages) normalizedPage = totalPages;
            if (normalizedPage < 1) normalizedPage = 1;
            searchState?.setPage?.(normalizedPage);
            const startIdx = (normalizedPage - 1) * pageSize;
            const slice = items.slice(startIdx, startIdx + pageSize);

            const list = document.createElement("div");
            list.className = "article-search__list";
            const isMainScope = !!resultsEl?.closest?.("#clientBoxMainscreen");
            const allowAddAction = !isMainScope;
            const isClientSearchResults = resultsEl?.id === "clientSearchResults";
            const isFournisseurSearchResults = resultsEl?.id === "fournisseurSearchResults";
            const isTransporteurSearchResults = resultsEl?.id === "transporteurSearchResults";
            const isCompactSearchResults =
              isClientSearchResults || isFournisseurSearchResults || isTransporteurSearchResults;

            const formatValue = (value) => {
              if (!value) return '<span class="client-search__empty">N.R.</span>';
              return escapeHTML(String(value));
            };

            slice.forEach((item, offset) => {
              const actualIndex = startIdx + offset;
              const option = document.createElement("div");
              option.className = "client-search__option";
              option.dataset.clientIndex = String(actualIndex);
              const actionsHtml = [
                allowAddAction
                  ? `<button type="button" class="client-search__edit" data-client-edit="${actualIndex}">Ajouter</button>`
                  : "",
                `<button type="button" class="client-search__edit" data-client-saved-update="${actualIndex}">Mettre a jour</button>`,
                isCompactSearchResults
                  ? ""
                  : `<button type="button" class="client-search__delete" data-client-delete="${actualIndex}">Supprimer</button>`
              ]
                .filter(Boolean)
                .join("");
              if (entityType === "transporter") {
                const transporter = item?.client && typeof item.client === "object" ? item.client : item || {};
                const name = String(transporter.name || item?.name || "").trim();
                const codeTransporteur =
                  item?.codeTransporteur ||
                  item?.code_transporteur ||
                  item?.transporteurCode ||
                  item?.code ||
                  transporter.codeTransporteur ||
                  transporter.code_transporteur ||
                  transporter.transporteurCode ||
                  transporter.code ||
                  "";
                const codeTransporteurLabel = "Code transporteur";
                if (isTransporteurSearchResults) {
                  option.innerHTML = `
                    <button type="button" class="client-search__select client-search__select--detailed" data-client-select="${actualIndex}">
                      <div class="client-search__details-grid">
                        <div class="client-search__details-row">
                          <div class="client-search__detail client-search__detail--inline" data-client-field="codeTransporteur">
                            <span class="client-search__detail-label">${escapeHTML(codeTransporteurLabel)}</span>
                            <span class="client-search__detail-value">${formatValue(codeTransporteur)}</span>
                          </div>
                          <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                            <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("name"))}</span>
                            <span class="client-search__detail-value">${formatValue(name)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    <div class="client-search__actions">
                      ${actionsHtml}
                    </div>`;
                  list.appendChild(option);
                  return;
                }
                const driverName = item?.driverName || transporter.driverName || transporter.benefit || "";
                const vehiclePlate =
                  item?.vehiclePlate || transporter.vehiclePlate || transporter.account || "";
                const transportMode =
                  item?.transportMode || transporter.transportMode || transporter.stegRef || "";
                const phone =
                  item?.phone ||
                  item?.telephone ||
                  item?.tel ||
                  transporter.phone ||
                  transporter.telephone ||
                  transporter.tel ||
                  "";
                const email = item?.email || transporter.email || "";
                const address = item?.address || transporter.address || transporter.adresse || "";
                option.innerHTML = `
                  <button type="button" class="client-search__select client-search__select--detailed" data-client-select="${actualIndex}">
                    <div class="client-search__details-grid">
                      <div class="client-search__details-row">
                        <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("name"))}</span>
                          <span class="client-search__detail-value">${formatValue(name)}</span>
                        </div>
                        <div class="client-search__detail client-search__detail--inline" data-client-field="driverName">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("driverName"))}</span>
                          <span class="client-search__detail-value">${formatValue(driverName)}</span>
                        </div>
                      </div>
                      <div class="client-search__details-row">
                        <div class="client-search__detail client-search__detail--inline" data-client-field="vehiclePlate">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("vehiclePlate"))}</span>
                          <span class="client-search__detail-value">${formatValue(vehiclePlate)}</span>
                        </div>
                        <div class="client-search__detail client-search__detail--inline" data-client-field="transportMode">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("transportMode"))}</span>
                          <span class="client-search__detail-value">${formatValue(transportMode)}</span>
                        </div>
                      </div>
                      <div class="client-search__details-row">
                        <div class="client-search__detail client-search__detail--inline client-search__detail--phone" data-client-field="phone">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("phone"))}</span>
                          <span class="client-search__detail-value">${formatValue(phone)}</span>
                        </div>
                        <div class="client-search__detail client-search__detail--inline client-search__detail--email" data-client-field="email">
                          <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("email"))}</span>
                          <span class="client-search__detail-value">${formatValue(email)}</span>
                        </div>
                      </div>
                      <div class="client-search__detail client-search__detail--inline client-search__detail--full" data-client-field="address">
                        <span class="client-search__detail-label">${escapeHTML(resolveFieldLabel("address"))}</span>
                        <span class="client-search__detail-value">${formatValue(address)}</span>
                      </div>
                    </div>
                  </button>
                  <div class="client-search__actions">
                    ${actionsHtml}
                  </div>`;
                list.appendChild(option);
                return;
              }
              const safeClient =
                item?.client && typeof item.client === "object" ? item.client : {};
              const clientName = String(safeClient.name || item?.clientName || "").trim();
              const hasClientData = Object.keys(safeClient).length > 0;
              const fallbackName = !hasClientData ? String(item?.name || "").trim() : "";
              const name = clientName || (fallbackName.toLowerCase() === "client" ? "" : fallbackName);
              const codeClient =
                item?.codeClient ||
                item?.code_client ||
                item?.code ||
                safeClient.codeClient ||
                safeClient.code_client ||
                safeClient.code ||
                "";
              const codeFournisseur =
                item?.codeFournisseur ||
                item?.code_fournisseur ||
                item?.fournisseurCode ||
                item?.code ||
                safeClient.codeFournisseur ||
                safeClient.code_fournisseur ||
                safeClient.fournisseurCode ||
                safeClient.code ||
                "";
              const identifier = item.identifier || item.vat || item.identifiantFiscal || item.tva || item.nif || "";
              const phone = item.phone || item.telephone || item.tel || "";
              const nameLabel = resolveFieldLabel("name");
              const codeClientLabel = "Code client";
              const codeFournisseurLabel = "Code fournisseur";
              const taxIdLabel = resolveFieldLabel("taxId");
              const phoneLabel = resolveFieldLabel("phone");
              const nameRowHtml = isClientSearchResults
                ? `
                    <div class="client-search__details-row">
                      <div class="client-search__detail client-search__detail--inline" data-client-field="codeClient">
                        <span class="client-search__detail-label">${escapeHTML(codeClientLabel)}</span>
                        <span class="client-search__detail-value">${formatValue(codeClient)}</span>
                      </div>
                      <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                        <span class="client-search__detail-label">${escapeHTML(nameLabel)}</span>
                        <span class="client-search__detail-value">${formatValue(name)}</span>
                      </div>
                    </div>`
                : isFournisseurSearchResults
                  ? `
                    <div class="client-search__details-row">
                      <div class="client-search__detail client-search__detail--inline" data-client-field="codeFournisseur">
                        <span class="client-search__detail-label">${escapeHTML(codeFournisseurLabel)}</span>
                        <span class="client-search__detail-value">${formatValue(codeFournisseur)}</span>
                      </div>
                      <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                        <span class="client-search__detail-label">${escapeHTML(nameLabel)}</span>
                        <span class="client-search__detail-value">${formatValue(name)}</span>
                      </div>
                    </div>`
                : `
                    <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                      <span class="client-search__detail-label">${escapeHTML(nameLabel)}</span>
                      <span class="client-search__detail-value">${formatValue(name)}</span>
                    </div>`;
              const taxIdRowHtml = isCompactSearchResults
                ? ""
                : `
                    <div class="client-search__detail client-search__detail--inline" data-client-field="taxId">
                      <span class="client-search__detail-label">${escapeHTML(taxIdLabel)}</span>
                      <span class="client-search__detail-value">${formatValue(identifier)}</span>
                    </div>`;
              const phoneRowHtml = isCompactSearchResults
                ? ""
                : `
                    <div class="client-search__detail client-search__detail--inline client-search__detail--phone" data-client-field="phone">
                      <span class="client-search__detail-label">${escapeHTML(phoneLabel)}</span>
                      <span class="client-search__detail-value">${formatValue(phone)}</span>
                    </div>`;
              option.innerHTML = `
                <button type="button" class="client-search__select client-search__select--detailed" data-client-select="${actualIndex}">
                  <div class="client-search__details-grid">
                    ${nameRowHtml}
                    ${taxIdRowHtml}
                    ${phoneRowHtml}
                  </div>
                </button>
                <div class="client-search__actions">
                  ${actionsHtml}
                </div>`;
              list.appendChild(option);
            });

            resultsEl.appendChild(list);
            if (entityType === "transporter") {
              list.querySelectorAll("[data-client-field]").forEach((node) => {
                const key = String(node.dataset.clientField || "").trim();
                if (!key || !(key in scopedVisibility)) return;
                const isVisible = scopedVisibility[key] !== false;
                node.hidden = !isVisible;
                node.style.display = isVisible ? "" : "none";
                node.classList.toggle("is-hidden", !isVisible);
              });
              list.querySelectorAll(".client-search__details-row").forEach((row) => {
                const hasVisibleField = Array.from(row.querySelectorAll("[data-client-field]")).some(
                  (node) => !node.hidden
                );
                row.hidden = !hasVisibleField;
                row.style.display = hasVisibleField ? "" : "none";
              });
            } else {
              applyClientFieldVisibility(list, clientFieldVisibility);
            }

            const pager = document.createElement("div");
            pager.className = "article-search__pager";
            const disablePrev = normalizedPage <= 1;
            const disableNext = normalizedPage >= totalPages;
            pager.innerHTML = `
              <div class="article-search__pager-left">
                <button type="button" class="client-search__edit article-search__close" data-article-close="true">
                  Fermer
                </button>
              </div>
              <div class="article-search__pager-controls">
                <button type="button" class="client-search__edit" data-article-page="prev" ${disablePrev ? "disabled" : ""}>
                  Precedent
                </button>
                <span class="article-search__page">Page ${normalizedPage} / ${totalPages}</span>
                <button type="button" class="client-search__addSTK" data-article-page="next" ${disableNext ? "disabled" : ""}>
                  Suivant
                </button>
              </div>
            `;
            resultsEl.appendChild(pager);
            resultsEl.hidden = false;
            resultsEl.classList.add("client-search--paged");
          };

          renderArticleSearchResults = (items, queryText, resultsEl = articleSearchResults) => {
            if (!resultsEl) return;
            const isMainscreenScope = !!resultsEl?.closest?.("#addItemBoxMainscreen");
            resultsEl.innerHTML = "";
            resultsEl.classList.remove("article-search--paged");
            if (!items?.length) {
              if (queryText) {
                showArticleSearchStatus('<div class="client-search__status">Aucun article trouve</div>', resultsEl);
              } else {
                hideArticleSearchResults(resultsEl);
              }
              return;
            }

            const total = items.length;
            const totalPages = Math.max(1, Math.ceil(total / ARTICLE_SEARCH_PAGE_SIZE));
            if (articleSearchPage > totalPages) articleSearchPage = totalPages;
            if (articleSearchPage < 1) articleSearchPage = 1;
            const startIdx = (articleSearchPage - 1) * ARTICLE_SEARCH_PAGE_SIZE;
            const slice = items.slice(startIdx, startIdx + ARTICLE_SEARCH_PAGE_SIZE);

            const list = document.createElement("div");
            list.className = "article-search__list";

            slice.forEach((item, offset) => {
              const actualIndex = startIdx + offset;
              const option = document.createElement("div");
              option.className = "client-search__option";
              option.dataset.articleIndex = String(actualIndex);
              const article = item?.article || {};
              const title =
                article.product?.trim() ||
                article.desc?.trim() ||
                article.ref?.trim() ||
                item.name ||
                "Article";

              const formatValue = (value) => {
                const hasContent = value !== undefined && value !== null && String(value).trim() !== "";
                if (!hasContent) return '<span class="client-search__empty">N.R.</span>';
                return escapeHTML(String(value).trim());
              };

              const addButtonHtml = isMainscreenScope
                ? ""
                : `<button type="button" class="client-search__add" data-article-add="${actualIndex}">Ajouter</button>`;
              option.innerHTML = `
                <button type="button" class="client-search__select client-search__select--detailed" data-article-apply="${actualIndex}">
                  <div class="client-search__details-grid">
                    <div class="client-search__details-row">
                      <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                        <span class="client-search__detail-label">Désignation</span>
                        <span class="client-search__detail-value">${formatValue(title)}</span>
                      </div>
                      <div class="client-search__detail client-search__detail--inline">
                        <span class="client-search__detail-label">R\u00E9f.</span>
                        <span class="client-search__detail-value">${formatValue(article.ref)}</span>
                      </div>
                    </div>
                  </div>
                </button>
                <div class="client-search__actions">
                  ${addButtonHtml}
                  <button type="button" class="client-search__edit" data-article-saved-load="${actualIndex}">Mettre a jour</button>
                </div>`;
              list.appendChild(option);
            });

            resultsEl.appendChild(list);

            const pager = document.createElement("div");
            pager.className = "article-search__pager";
            const disablePrev = articleSearchPage <= 1;
            const disableNext = articleSearchPage >= totalPages;
            pager.innerHTML = `
              <div class="article-search__pager-left">
                <button type="button" class="client-search__edit article-search__close" data-article-close="true">
                  Fermer
                </button>
              </div>
              <div class="article-search__pager-controls">
                <button type="button" class="client-search__edit" data-article-page="prev" ${disablePrev ? "disabled" : ""}>
                  Precedent
                </button>
                <span class="article-search__page">Page ${articleSearchPage} / ${totalPages}</span>
                <button type="button" class="client-search__addSTK" data-article-page="next" ${disableNext ? "disabled" : ""}>
                  Suivant
                </button>
              </div>
            `;
            resultsEl.appendChild(pager);
            resultsEl.hidden = false;
            resultsEl.classList.add("article-search--paged");
            refreshStockMeters(resultsEl);
          };

        refreshArticleSearchResults = (scopeHint) => {
          if (!lastArticleSearchQuery || lastArticleSearchQuery.length < MIN_ARTICLE_SEARCH_LENGTH) return;
          scope = resolveAddFormScope(scopeHint);
          resultsEl = scope?.querySelector?.("#articleSearchResults") || articleSearchResults;
          performArticleSearch(lastArticleSearchQuery, { showResults: false, resultsEl });
        };
        SEM.refreshArticleSearchResults = refreshArticleSearchResults;

          normalizeClientFormScope = (scopeHint) => {
            if (!scopeHint) return null;
            if (scopeHint instanceof HTMLElement) {
              if (scopeHint.id === "clientBoxMainscreen") {
                return getActiveMainClientScope() || scopeHint;
              }
              return scopeHint;
            }
            if (typeof scopeHint === "string") {
              const el = document.querySelector(scopeHint);
              if (el) return el;
            }
            if (scopeHint?.target instanceof HTMLElement) {
              const match = scopeHint.target.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              if (match) return match;
            }
            if (scopeHint?.currentTarget instanceof HTMLElement) {
              const match = scopeHint.currentTarget.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
              if (match) return match;
            }
            return null;
          };

          syncClientFormFields = (client = {}, formScope = null) => {
            const scopeNode = normalizeClientFormScope(formScope);
            const resolvedEntityType = resolveClientEntityType(scopeNode);
            const CLIENT_TYPE_LABELS = {
              societe: "Societe / personne morale",
              particulier: "Particulier",
              personne_physique: "Personne physique"
            };
            const CLIENT_TAXES_LABELS = {
              non_exonore: "Non exon\u00E9r\u00E9e",
              exonore: "Exon\u00E9r\u00E9e"
            };
            const normalizeClientTaxesValue = (value, fallback = "non_exonore") => {
              const normalized = String(value || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s-]+/g, "_");
              if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
                return "exonore";
              }
              if (
                normalized === "non_exonore" ||
                normalized === "nonexonore" ||
                normalized === "non_exonoree" ||
                normalized === "nonexonoree" ||
                normalized === "non_exoneree" ||
                normalized === "nonexoneree"
              ) {
                return "non_exonore";
              }
              return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
            };
            const setScopedVal = (id, value = "") => {
              const canonicalId = toCanonicalClientFormId(id);
              const target = queryScopedClientFormElement(scopeNode, canonicalId);
              if (target) {
                target.value = value;
                return true;
              }
              if (!scopeNode) {
                resolveClientFormIdCandidates(canonicalId).forEach((candidate) => {
                  setVal(candidate, value);
                });
                return true;
              }
              return false;
            };
            const syncScopedSelectOptionState = (id, value) => {
              const target = queryScopedClientFormElement(scopeNode, id);
              if (!target || !("value" in target)) return;
              target.value = value;
              if (target instanceof HTMLSelectElement) {
                Array.from(target.options).forEach((option) => {
                  option.selected = option.value === value;
                });
              }
            };
            const updateClientIdLabelScoped = (typeValue) => {
              const labelEl = queryScopedClientFormElement(scopeNode, "clientIdLabel");
              const vatInput = queryScopedClientFormElement(scopeNode, "clientVat");
              const rawType = String(typeValue || "").toLowerCase();
              const resolvedType =
                rawType === "particulier" || rawType === "personne_physique" ? rawType : "societe";
              const isParticulier =
                resolvedType === "particulier" && resolvedEntityType === "client";
              const labelText = isParticulier ? "CIN / passeport" : "Matricule fiscal";
              const placeholder = isParticulier ? "CIN ou Passeport" : "ex: 1284118/W/A/M/000";
              const defaultTaxIdLabel = resolveClientFieldLabelDefaults().taxId;
              const customTaxIdLabel = clientFieldLabels?.taxId;
              const useCustomLabel =
                typeof customTaxIdLabel === "string" &&
                customTaxIdLabel.trim() &&
                customTaxIdLabel.trim() !== defaultTaxIdLabel;
              if (labelEl) labelEl.textContent = useCustomLabel ? customTaxIdLabel.trim() : labelText;
              if (vatInput) vatInput.placeholder = placeholder;
            };
            const syncClientTypeUiScopedFallback = (typeValue) => {
              if (!scopeNode) return;
              const resolvedType =
                String(typeValue || "").toLowerCase() === "particulier" ||
                String(typeValue || "").toLowerCase() === "personne_physique"
                  ? String(typeValue || "").toLowerCase()
                  : "societe";
              syncScopedSelectOptionState("clientType", resolvedType);
              const displayEl = queryScopedClientFormElement(scopeNode, "clientTypeDisplay");
              if (displayEl) {
                displayEl.textContent = CLIENT_TYPE_LABELS[resolvedType] || CLIENT_TYPE_LABELS.societe;
              }
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
            const syncClientTaxesUiScopedFallback = (taxesValue) => {
              if (!scopeNode) return;
              const resolvedTaxes = normalizeClientTaxesValue(taxesValue, "non_exonore");
              syncScopedSelectOptionState("clientTaxes", resolvedTaxes);
              const displayEl = queryScopedClientFormElement(scopeNode, "clientTaxesDisplay");
              if (displayEl) {
                displayEl.textContent =
                  CLIENT_TAXES_LABELS[resolvedTaxes] || CLIENT_TAXES_LABELS.non_exonore;
              }
              const panel = queryScopedClientFormElement(scopeNode, "clientTaxesPanel");
              if (panel) {
                panel.querySelectorAll("[data-client-taxes-option]").forEach((btn) => {
                  const isMatch = btn.dataset.clientTaxesOption === resolvedTaxes;
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                });
              }
              const menu = queryScopedClientFormElement(scopeNode, "clientTaxesMenu");
              if (menu && menu.open) {
                menu.open = false;
              }
              const toggle = menu?.querySelector("summary");
              if (toggle) {
                toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
              }
            };
            const norm = (value, fallback = "") => (value ?? fallback).toString();
            const typeRaw = String(client.type || "").toLowerCase();
            const typeResolved =
              typeRaw === "particulier" || typeRaw === "personne_physique" ? typeRaw : "societe";
            const type =
              resolvedEntityType === "vendor" && typeResolved === "particulier"
                ? "personne_physique"
                : typeResolved;
            const existingScopedTaxes =
              String(queryScopedClientFormElement(scopeNode, "clientTaxes")?.value || "").trim() || "non_exonore";
            const taxes = normalizeClientTaxesValue(
              client.taxes ?? client.taxesStatus ?? client.taxes_status,
              existingScopedTaxes
            );
            setScopedVal("clientType", type);
            setScopedVal("clientTaxes", taxes);
            setScopedVal(
              "clientCode",
              norm(client.codeClient || client.code_client || client.code)
            );
            setScopedVal("clientName", norm(client.name));
            setScopedVal("clientBeneficiary", norm(client.benefit || client.beneficiary));
            setScopedVal("clientAccount", norm(client.account || client.accountOf));
            setScopedVal("clientSoldClient", formatSoldClientValue(client.soldClient));
            const vat =
              client.vat ||
              client.identifiantFiscal ||
              client.identifiant ||
              client.tva ||
              client.nif ||
              (resolvedEntityType === "vendor" ? client.cin || client.passport || client.passeport || "" : "") ||
              "";
            setScopedVal("clientVat", norm(vat));
            setScopedVal("clientStegRef", norm(client.stegRef || client.refSteg || client.steg));
            setScopedVal("clientPhone", norm(client.phone || client.telephone || client.tel));
            setScopedVal("clientEmail", norm(client.email));
            setScopedVal("clientAddress", norm(client.address || client.adresse));
            if (scopeNode) {
              updateClientIdLabelScoped(type);
              if (typeof updateClientTypeDisplayScoped === "function") {
                updateClientTypeDisplayScoped(scopeNode, type);
              } else {
                syncClientTypeUiScopedFallback(type);
              }
              if (typeof updateClientTaxesDisplayScoped === "function") {
                updateClientTaxesDisplayScoped(scopeNode, taxes);
              } else {
                syncClientTaxesUiScopedFallback(taxes);
              }
            } else if (SEM.updateClientIdLabel) {
              SEM.updateClientIdLabel();
            }
          };

          applyClientToState = (client = {}, options = {}) => {
            const entityType =
              options.entityType ||
              client.__entityType ||
              resolveClientEntityType(normalizeClientFormScope(options.formScope)) ||
              clientSavedModalEntityType ||
              "client";
            const normalizeClientTaxesValue = (value, fallback = "non_exonore") => {
              const normalized = String(value || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s-]+/g, "_");
              if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
                return "exonore";
              }
              if (
                normalized === "non_exonore" ||
                normalized === "nonexonore" ||
                normalized === "non_exonoree" ||
                normalized === "nonexonoree" ||
                normalized === "non_exoneree" ||
                normalized === "nonexoneree"
              ) {
                return "non_exonore";
              }
              return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
            };
            const normalizedTaxes = normalizeClientTaxesValue(
              client.taxes ?? client.taxesStatus ?? client.taxes_status,
              "non_exonore"
            );
            const st = SEM.state || (SEM.state = {});
            const setEntityState = SEM.__bindingHelpers?.setEntityClientFormState;
            if (typeof setEntityState === "function") {
              setEntityState(entityType, { ...client, taxes: normalizedTaxes, __entityType: entityType });
            }
            const normalizedFormScope = normalizeClientFormScope(options.formScope);
            const isDocumentPartyScope =
              !!normalizedFormScope &&
              (normalizedFormScope.id === "clientBoxNewDoc" ||
                normalizedFormScope.id === "FournisseurBoxNewDoc" ||
                normalizedFormScope.id === "clientSavedModalNv" ||
                normalizedFormScope.id === "fournisseurSavedModalNv" ||
                normalizedFormScope.id === "transporteurSavedModalNv" ||
                (typeof normalizedFormScope.closest === "function" &&
                  !!normalizedFormScope.closest(
                    "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModalNv, #fournisseurSavedModalNv, #transporteurSavedModalNv"
                  )));
            const shouldMirrorHelper = SEM.__bindingHelpers?.shouldMirrorEntityClientStateToDocument;
            const shouldMirror =
              options.mirrorToDocumentState !== undefined
                ? !!options.mirrorToDocumentState
                : typeof shouldMirrorHelper === "function"
                  ? !!shouldMirrorHelper(normalizedFormScope)
                  : isDocumentPartyScope;
            if (!shouldMirror) return;
            st.client = { ...(st.client || {}), ...client, taxes: normalizedTaxes, __entityType: entityType };
            const targetVat =
              client.vat ||
              client.identifiantFiscal ||
              client.tva ||
              client.identifiant ||
              st.client?.vat ||
              "";
            st.client.vat = targetVat;
            refreshClientSummary();
          };

          loadClientRecordIntoForm = (record, options = {}) => {
            if (!record) return;
            const payload =
              record && typeof record === "object"
                ? record.client && typeof record.client === "object"
                  ? record.client
                  : record
                : {};
            const normalizeClientTaxesValue = (value, fallback = "non_exonore") => {
              const normalized = String(value || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s-]+/g, "_");
              if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
                return "exonore";
              }
              if (
                normalized === "non_exonore" ||
                normalized === "nonexonore" ||
                normalized === "non_exonoree" ||
                normalized === "nonexonoree" ||
                normalized === "non_exoneree" ||
                normalized === "nonexoneree"
              ) {
                return "non_exonore";
              }
              return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
            };
            const hasExplicitTaxesValue = (source) => {
              if (!source || typeof source !== "object") return false;
              return ["taxes", "taxesStatus", "taxes_status"].some((key) => {
                if (!Object.prototype.hasOwnProperty.call(source, key)) return false;
                return String(source[key] ?? "").trim().length > 0;
              });
            };
            const formScope = normalizeClientFormScope(options.formScope);
            const hasPayloadTaxes = hasExplicitTaxesValue(payload) || hasExplicitTaxesValue(record);
            const scopedTaxesFallback = normalizeClientTaxesValue(
              queryScopedClientFormElement(formScope, "clientTaxes")?.value,
              "non_exonore"
            );
            const resolvedPayloadTaxes = normalizeClientTaxesValue(
              payload?.taxes ??
                payload?.taxesStatus ??
                payload?.taxes_status ??
                record?.taxes ??
                record?.taxesStatus ??
                record?.taxes_status,
              hasPayloadTaxes ? "non_exonore" : scopedTaxesFallback
            );
            const normalizedPayload = {
              ...payload,
              taxes: resolvedPayloadTaxes
            };
            const selectedPath = record.path || normalizedPayload.__path || "";
            const entityType =
              record?.entityType ||
              normalizedPayload?.__entityType ||
              resolveClientEntityType(normalizeClientFormScope(options.formScope)) ||
              clientSavedModalEntityType ||
              "client";
            SEM.clientFormAllowUpdate = true;
            if (SEM.forms?.fillClientToForm && !formScope) {
              SEM.forms.fillClientToForm(normalizedPayload);
            } else {
              syncClientFormFields(normalizedPayload, formScope);
            }
            const isDocumentPartyScope =
              !!formScope &&
              (formScope.id === "clientBoxNewDoc" ||
                formScope.id === "FournisseurBoxNewDoc" ||
                formScope.id === "clientSavedModalNv" ||
                formScope.id === "fournisseurSavedModalNv" ||
                formScope.id === "transporteurSavedModalNv" ||
                (typeof formScope.closest === "function" &&
                  !!formScope.closest(
                    "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModalNv, #fournisseurSavedModalNv, #transporteurSavedModalNv"
                  )));
            const shouldMirrorHelper = SEM.__bindingHelpers?.shouldMirrorEntityClientStateToDocument;
            const shouldMirrorToDocument =
              typeof shouldMirrorHelper === "function"
                ? !!shouldMirrorHelper(formScope)
                : isDocumentPartyScope;
            applyClientToState(normalizedPayload, {
              formScope,
              entityType,
              mirrorToDocumentState: shouldMirrorToDocument
            });
            if (shouldMirrorToDocument && typeof SEM.setDocumentTaxesFromClientValue === "function") {
              SEM.setDocumentTaxesFromClientValue(resolvedPayloadTaxes, {
                formScope,
                entityType,
                clientPath: selectedPath,
                source: "client-selection"
              });
            }
            if (shouldMirrorToDocument && state().client) state().client.__path = selectedPath;

            const skipReadInputs = options.skipReadInputs || !!formScope;
            if (!skipReadInputs && typeof SEM.readInputs === "function") {
              SEM.readInputs();
            }

            if (SEM.setClientFormBaseline) {
              const baselineEntityType = formScope ? resolveClientEntityType(formScope) : entityType;
              const baselineScope = formScope || options.formScope || null;
              const snapshot =
                (typeof SEM.getClientFormSnapshot === "function" &&
                  SEM.getClientFormSnapshot(baselineScope)) ||
                (typeof SEM.forms?.captureClientFromForm === "function" &&
                  SEM.forms.captureClientFromForm(baselineScope)) ||
                { ...normalizedPayload };
              snapshot.__path = selectedPath;
              snapshot.__entityType = baselineEntityType;
              if (selectedPath) {
                SEM.setClientFormBaseline(snapshot, baselineEntityType);
              } else {
                SEM.setClientFormBaseline(null);
              }
            } else if (selectedPath) {
              SEM.clientFormBaseline = sanitizeClientSnapshot({
                ...normalizedPayload,
                __path: selectedPath
              });
              SEM.clientFormBaselineEntityType = formScope ? resolveClientEntityType(formScope) : null;
              SEM.clientFormDirty = false;
              SEM.clientFormAllowUpdate = true;
            } else {
              SEM.clientFormBaseline = null;
            }

            SEM.clientFormDirty = false;
            if (shouldMirrorToDocument && state().client) state().client.__dirty = false;
            SEM.__bindingHelpers?.setEntityClientFormDirty?.(
              resolveClientEntityType(formScope),
              false
            );

            if (!options.skipDirtyEval && typeof SEM.evaluateClientDirtyState === "function") {
              SEM.evaluateClientDirtyState(formScope || options.formScope || null);
            } else {
              SEM.refreshUpdateClientButton?.(formScope || options.formScope || null);
            }
          };

          SEM.syncClientFormFields = syncClientFormFields;
          SEM.applyClientToState = applyClientToState;
          SEM.loadClientRecordIntoForm = loadClientRecordIntoForm;

          resolveArticleSalesTvaValue = (source = {}, fallback = 19) => {
            const record = source && typeof source === "object" ? source : {};
            const raw =
              record.tva ??
              record.vat ??
              record.tax ??
              record.taxRate ??
              record.tax_rate ??
              record.tvaRate ??
              record.tva_rate ??
              record.tvaPct ??
              record.tva_pct ??
              fallback;
            const parsed = Number(typeof raw === "string" ? raw.replace(",", ".") : raw);
            return Number.isFinite(parsed) ? parsed : fallback;
          };

          resolveArticlePurchaseTvaValue = (source = {}, fallback = 0) => {
            const record = source && typeof source === "object" ? source : {};
            const raw =
              record.purchaseTva ??
              record.purchase_tva ??
              record.purchaseVat ??
              record.purchase_vat ??
              record.buyTva ??
              record.buy_tva ??
              record.tvaAchat ??
              record.tva_achat ??
              record.purchaseTax ??
              record.purchase_tax ??
              fallback;
            const parsed = Number(typeof raw === "string" ? raw.replace(",", ".") : raw);
            return Number.isFinite(parsed) ? parsed : fallback;
          };
          resolveArticleFodecTvaValue = (source = {}, fallback = 19) => {
            const record = source && typeof source === "object" ? source : {};
            const fodec = record.fodec && typeof record.fodec === "object" ? record.fodec : {};
            const raw =
              fodec.tva ??
              fodec.vat ??
              fodec.tax ??
              fodec.taxRate ??
              fodec.tax_rate ??
              fodec.tvaRate ??
              fodec.tva_rate ??
              fodec.tvaPct ??
              fodec.tva_pct ??
              record.fodecTva ??
              record.fodec_tva ??
              record.fodecTvaPct ??
              record.fodec_tva_pct ??
              fallback;
            const parsed = Number(typeof raw === "string" ? raw.replace(",", ".") : raw);
            return Number.isFinite(parsed) ? parsed : fallback;
          };
          resolveArticlePurchaseFodecTvaValue = (source = {}, fallback = 19) => {
            const record = source && typeof source === "object" ? source : {};
            const purchaseFodec =
              record.purchaseFodec && typeof record.purchaseFodec === "object" ? record.purchaseFodec : {};
            const raw =
              purchaseFodec.tva ??
              purchaseFodec.vat ??
              purchaseFodec.tax ??
              purchaseFodec.taxRate ??
              purchaseFodec.tax_rate ??
              purchaseFodec.tvaRate ??
              purchaseFodec.tva_rate ??
              purchaseFodec.tvaPct ??
              purchaseFodec.tva_pct ??
              record.purchaseFodecTva ??
              record.purchase_fodec_tva ??
              record.purchaseFodecTvaPct ??
              record.purchase_fodec_tva_pct ??
              fallback;
            const parsed = Number(typeof raw === "string" ? raw.replace(",", ".") : raw);
            return Number.isFinite(parsed) ? parsed : fallback;
          };

          applyArticleFromSearch = (article = {}, { applyUse = true, formScope = null } = {}) => {
            if (!article) return;
            const scope = resolveAddFormScope(formScope);
            if (scope) setActiveAddFormScope(scope);
            const articleForFill = applyUse ? article : { ...article, use: undefined }; // avoid toggling column checkboxes when not requested
            if (SEM.forms?.fillArticleToForm) {
              SEM.forms.fillArticleToForm(articleForFill);
            } else if (typeof SEM.fillAddFormFromItem === "function") {
              SEM.fillAddFormFromItem(articleForFill);
            } else {
              const purchaseTvaValue = Math.max(0, resolveArticlePurchaseTvaValue(articleForFill, 0));
              const salesTvaValue = Math.max(0, resolveArticleSalesTvaValue(articleForFill, 19));
              const saleFodecTvaValue = Math.max(0, resolveArticleFodecTvaValue(articleForFill, 19));
              const purchaseFodecTvaValue = Math.max(0, resolveArticlePurchaseFodecTvaValue(articleForFill, 19));
              setVal("addRef", articleForFill.ref ?? "");
              setVal("addProduct", articleForFill.product ?? "");
              setVal("addDesc", articleForFill.desc ?? "");
              setVal("addStockQty", String(articleForFill.stockQty ?? 0));
              setVal("addUnit", articleForFill.unit ?? "");
              setVal("addPurchasePrice", String(articleForFill.purchasePrice ?? 0));
              const purchaseFodecRateRaw = Number(articleForFill.purchaseFodec?.rate ?? 1);
              const purchaseFodecRate =
                articleForFill.purchaseFodec?.enabled && Number.isFinite(purchaseFodecRateRaw)
                  ? Math.max(0, purchaseFodecRateRaw)
                  : 0;
              const purchasePriceTtcRaw =
                (Number(articleForFill.purchasePrice ?? 0) || 0) *
                (1 + purchaseTvaValue / 100) *
                (1 + purchaseFodecRate / 100);
              setVal(
                "addPurchasePriceTtc",
                String(Math.round((purchasePriceTtcRaw + Number.EPSILON) * 1e3) / 1e3)
              );
              setVal("addPurchaseTva", String(purchaseTvaValue));
              setVal("addPurchaseDiscount", String(articleForFill.purchaseDiscount ?? 0));
              if (getEl("addPurchaseFodecEnabled")) {
                getEl("addPurchaseFodecEnabled").checked = !!articleForFill.purchaseFodec?.enabled;
              }
              setVal("addPurchaseFodecRate", String(articleForFill.purchaseFodec?.rate ?? 1));
              setVal("addPurchaseFodecTva", String(purchaseFodecTvaValue));
              setVal("addPrice", String(articleForFill.price ?? 0));
              setVal("addTva", String(salesTvaValue));
              if (getEl("addFodecEnabled")) {
                getEl("addFodecEnabled").checked = !!articleForFill.fodec?.enabled;
              }
              setVal("addFodecRate", String(articleForFill.fodec?.rate ?? 1));
              setVal("addFodecTva", String(saleFodecTvaValue));
              const saleFodecRateRaw = Number(articleForFill.fodec?.rate ?? 1);
              const saleFodecRate =
                articleForFill.fodec?.enabled && Number.isFinite(saleFodecRateRaw)
                  ? Math.max(0, saleFodecRateRaw)
                  : 0;
              const salePriceTtcRaw =
                (Number(articleForFill.price ?? 0) || 0) *
                (1 + salesTvaValue / 100) *
                (1 + saleFodecRate / 100);
              setVal(
                "addPriceTtc",
                String(Math.round((salePriceTtcRaw + Number.EPSILON) * 1e3) / 1e3)
              );
              setVal("addDiscount", String(articleForFill.discount ?? 0));
            }
            SEM.selectedItemIndex = null;
            if (typeof SEM.setSubmitMode === "function") SEM.setSubmitMode("add");
            if (typeof SEM.updateAddFormTotals === "function") SEM.updateAddFormTotals();
            if (applyUse && article.use && typeof article.use === "object") {
              Object.entries(article.use).forEach(([key, val]) => {
                if (typeof val === "boolean") SEM.forms?.setEnabled?.(key, val);
              });
              SEM.applyColumnHiding?.();
            }
            SEM.markItemFormDirty?.(false);
            SEM.enableNewItemButton?.();
            if (article.__articlePath || article.__path || article.path) {
              SEM.showSavedArticleButtons?.();
            } else {
              SEM.hideSavedArticleButtons?.();
            }
          };

          getActiveAddFormInput = (scopeHint = null) => {
            const activeEl = document.activeElement;
            if (!(activeEl instanceof HTMLElement)) return null;
            if (!ADD_FORM_FIELD_IDS.has(activeEl.id)) return null;
            const scope = resolveAddFormScope(scopeHint);
            if (scope && !scope.contains(activeEl)) return null;
            return activeEl;
          };

          applyArticleFieldToInput = (inputEl, article = {}, formScope = null) => {
            if (!inputEl) return false;
            const scope = resolveAddFormScope(formScope || inputEl);
            if (scope) setActiveAddFormScope(scope);
            const purchaseTvaValue = resolveArticlePurchaseTvaValue(article, 0);
            const salesTvaValue = resolveArticleSalesTvaValue(article, 19);
            const salesFodecTvaValue = resolveArticleFodecTvaValue(article, 19);
            const purchaseFodecTvaValue = resolveArticlePurchaseFodecTvaValue(article, 19);
            const valMap = {
              addRef: article.ref ?? "",
              addProduct: article.product ?? "",
              addDesc: article.desc ?? "",
              addStockQty: article.stockQty ?? 0,
              addUnit: article.unit ?? "",
              addPurchasePrice: article.purchasePrice ?? 0,
              addPurchasePriceTtc: (() => {
                const ht = Number(article.purchasePrice ?? 0);
                const tva = Number(purchaseTvaValue);
                const fodecRate = Number(article.purchaseFodec?.rate ?? 1);
                const fodecEnabled = !!article.purchaseFodec?.enabled;
                const safeHt = Number.isFinite(ht) ? Math.max(0, ht) : 0;
                const safeTva = Number.isFinite(tva) ? Math.max(0, tva) : 0;
                const safeFodec = fodecEnabled && Number.isFinite(fodecRate) ? Math.max(0, fodecRate) : 0;
                return Math.round(
                  (safeHt * (1 + safeTva / 100) * (1 + safeFodec / 100) + Number.EPSILON) * 1e3
                ) / 1e3;
              })(),
              addPurchaseTva: purchaseTvaValue,
              addPurchaseDiscount: article.purchaseDiscount ?? 0,
              addPurchaseFodecRate: article.purchaseFodec?.rate ?? 1,
              addPurchaseFodecTva: purchaseFodecTvaValue,
              addPrice: article.price ?? 0,
              addPriceTtc: (() => {
                const ht = Number(article.price ?? 0);
                const tva = Number(salesTvaValue);
                const fodecRate = Number(article.fodec?.rate ?? 1);
                const fodecEnabled = !!article.fodec?.enabled;
                const safeHt = Number.isFinite(ht) ? Math.max(0, ht) : 0;
                const safeTva = Number.isFinite(tva) ? Math.max(0, tva) : 0;
                const safeFodec = fodecEnabled && Number.isFinite(fodecRate) ? Math.max(0, fodecRate) : 0;
                return Math.round(
                  (safeHt * (1 + safeTva / 100) * (1 + safeFodec / 100) + Number.EPSILON) * 1e3
                ) / 1e3;
              })(),
              addTva: salesTvaValue,
              addFodecTva: salesFodecTvaValue,
              addDiscount: article.discount ?? 0
            };
            const id = inputEl.id;
            if (!(id in valMap)) return false;
            setVal(id, String(valMap[id]));
            if ([
              "addPurchasePrice",
              "addPurchasePriceTtc",
              "addPurchaseTva",
              "addPurchaseDiscount",
              "addPurchaseFodecRate",
              "addPurchaseFodecTva",
              "addPrice",
              "addPriceTtc",
              "addTva",
              "addDiscount"
            ].includes(id)) {
              SEM.updateAddFormTotals?.();
            }
            return true;
          };

          normalizeArticleRecord = (record = {}) => {
            const source =
              record && typeof record === "object" && record.article && typeof record.article === "object"
                ? record.article
                : record && typeof record === "object"
                ? record
                : {};
            const mapNumber = (value, fallback = 0) => {
              const normalizeCandidate = (candidate) =>
                Number(typeof candidate === "string" ? candidate.replace(",", ".") : candidate);
              const num = normalizeCandidate(value);
              if (Number.isFinite(num)) return num;
              const fallbackNum = normalizeCandidate(fallback);
              return Number.isFinite(fallbackNum) ? fallbackNum : fallback;
            };
            const normalizeFodecConfig = (rawConfig = {}, keys = {}) => {
              const cfg = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
              return {
                ...cfg,
                enabled: !!(cfg.enabled ?? source[keys.enabled] ?? source[keys.enabledLegacy]),
                rate: mapNumber(
                  cfg.rate ??
                    cfg.ratePct ??
                    source[keys.rate] ??
                    source[keys.rateLegacy] ??
                    source[keys.ratePct],
                  source[keys.ratePctLegacy]
                ),
                tva: mapNumber(
                  cfg.tva ??
                    cfg.vat ??
                    cfg.tax ??
                    cfg.taxRate ??
                    cfg.tax_rate ??
                    cfg.tvaRate ??
                    cfg.tva_rate ??
                    cfg.tvaPct ??
                    cfg.tva_pct ??
                    source[keys.tva] ??
                    source[keys.tvaLegacy] ??
                    source[keys.tvaPct],
                  source[keys.tvaPctLegacy]
                )
              };
            };
            const normalized = {
              ref:
                source.ref ??
                source.reference ??
                source.code ??
                "",
              product:
                source.product ??
                source.designation ??
                source.title ??
                source.name ??
                "",
              desc:
                source.desc ??
                source.description ??
                source.details ??
                "",
              stockQty:
                mapNumber(source.stockQty ?? source.stock ?? source.stockDisponible ?? source.quantity, 0),
              unit: source.unit ?? source.unite ?? "",
              purchasePrice: mapNumber(
                source.purchasePrice ??
                  source.purchase_price ??
                  source.buyPrice ??
                  source.buy_price ??
                  source.prixAchat ??
                  source.prix_achat ??
                  source.purchaseHt,
                0
              ),
              purchaseTva: mapNumber(
                source.purchaseTva ??
                  source.purchase_tva ??
                  source.buyTva ??
                  source.buy_tva ??
                  source.tvaAchat ??
                  source.tva_achat ??
                  source.purchaseVat,
                0
              ),
              price: mapNumber(source.price ?? source.priceHt ?? source.prix ?? source.prixHt, 0),
              tva: mapNumber(
                source.tva ??
                  source.vat ??
                  source.tax ??
                  source.taxRate ??
                  source.tax_rate ??
                  source.tvaRate ??
                  source.tva_rate ??
                  source.tvaPct ??
                  source.tva_pct,
                19
              ),
              purchaseDiscount: mapNumber(
                source.purchaseDiscount ??
                  source.purchase_discount ??
                  source.purchaseDiscountPct ??
                  source.purchase_discount_pct ??
                  source.purchaseDiscountPercent ??
                  source.purchase_discount_percent ??
                  source.purchaseDiscountRate ??
                  source.purchase_discount_rate ??
                  source.purchaseRemise ??
                  source.purchase_remise ??
                  source.remiseAchat ??
                  source.remise_achat,
                0
              ),
              discount: mapNumber(source.discount ?? source.remise ?? source.discountPct ?? source.remisePct, 0),
              fodec: normalizeFodecConfig(source.fodec, {
                enabled: "fodecEnabled",
                enabledLegacy: "fodec_enabled",
                rate: "fodecRate",
                rateLegacy: "fodec_rate",
                ratePct: "fodecRatePct",
                ratePctLegacy: "fodec_rate_pct",
                tva: "fodecTva",
                tvaLegacy: "fodec_tva",
                tvaPct: "fodecTvaPct",
                tvaPctLegacy: "fodec_tva_pct"
              }),
              purchaseFodec: normalizeFodecConfig(source.purchaseFodec, {
                enabled: "purchaseFodecEnabled",
                enabledLegacy: "purchase_fodec_enabled",
                rate: "purchaseFodecRate",
                rateLegacy: "purchase_fodec_rate",
                ratePct: "purchaseFodecRatePct",
                ratePctLegacy: "purchase_fodec_rate_pct",
                tva: "purchaseFodecTva",
                tvaLegacy: "purchase_fodec_tva",
                tvaPct: "purchaseFodecTvaPct",
                tvaPctLegacy: "purchase_fodec_tva_pct"
              })
            };
            const stockManagement =
              source.stockManagement && typeof source.stockManagement === "object"
                ? source.stockManagement
                : {};
            const depotsSource = Array.isArray(source.depots)
              ? source.depots
              : Array.isArray(stockManagement.depots)
              ? stockManagement.depots
              : [];
            const depots = depotsSource
              .map((entry) => ({
                id: String(entry?.id || "").trim(),
                name: String(entry?.name || entry?.label || "").trim(),
                linkedDepotId: String(
                  entry?.linkedDepotId ??
                  entry?.depotDbId ??
                  entry?.magasinId ??
                  entry?.magasin_id ??
                  ""
                ).trim(),
                stockQty: mapNumber(
                  entry?.stockQty ?? entry?.stock_qty ?? entry?.quantity ?? entry?.qty,
                  normalized.stockQty
                ),
                stockQtyCustomized: !!(
                  entry?.stockQtyCustomized ??
                  entry?.stock_qty_customized ??
                  entry?.depotStockCustomized ??
                  entry?.depot_stock_customized
                ),
                selectedLocationIds: (() => {
                  const sourceValue =
                    entry?.selectedLocationIds ??
                    entry?.selectedLocationId ??
                    entry?.selectedEmplacementIds ??
                    entry?.selectedEmplacements ??
                    entry?.defaultLocationIds ??
                    entry?.defaultLocationId ??
                    entry?.defaultLocation ??
                    [];
                  const sourceRows = Array.isArray(sourceValue)
                    ? sourceValue
                    : String(sourceValue || "").trim()
                    ? [sourceValue]
                    : [];
                  const seen = new Set();
                  return sourceRows
                    .map((value) => String(value || "").trim())
                    .filter((value) => {
                      if (!value) return false;
                      const key = value.toLowerCase();
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                })(),
                selectedEmplacementIds: (() => {
                  const sourceValue =
                    entry?.selectedEmplacementIds ??
                    entry?.selectedLocationIds ??
                    entry?.selectedEmplacements ??
                    entry?.defaultLocationIds ??
                    entry?.defaultLocationId ??
                    entry?.defaultLocation ??
                    [];
                  const sourceRows = Array.isArray(sourceValue)
                    ? sourceValue
                    : String(sourceValue || "").trim()
                    ? [sourceValue]
                    : [];
                  const seen = new Set();
                  return sourceRows
                    .map((value) => String(value || "").trim())
                    .filter((value) => {
                      if (!value) return false;
                      const key = value.toLowerCase();
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                })(),
                createdAt: String(entry?.createdAt || entry?.created_at || "").trim()
              }))
              .filter((entry) => entry.id);
            const depotStockCustomized = !!(
              source.depotStockCustomized ??
              source.depot_stock_customized ??
              stockManagement.depotStockCustomized ??
              stockManagement.depot_stock_customized ??
              depots.some((entry) => !!entry.stockQtyCustomized)
            );
            const selectedDepotId = String(
              source.activeDepotId ??
              source.selectedDepotId ??
              source.selected_depot_id ??
              stockManagement.activeDepotId ??
              stockManagement.selectedDepotId ??
              stockManagement.defaultDepot ??
              ""
            ).trim();
            const selectedEmplacements = (() => {
              const sourceValue =
                source.selectedEmplacements ??
                source.selected_emplacements ??
                stockManagement.selectedEmplacements ??
                stockManagement.defaultLocationIds ??
                stockManagement.defaultLocationId ??
                stockManagement.defaultLocation ??
                [];
              const rows = Array.isArray(sourceValue)
                ? sourceValue
                : String(sourceValue || "").trim()
                ? [sourceValue]
                : [];
              const seen = new Set();
              return rows
                .map((entry) => String(entry || "").trim())
                .filter((entry) => {
                  if (!entry) return false;
                  const key = entry.toLowerCase();
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
            })();
            if (depots.length) normalized.depots = depots;
            if (depotStockCustomized) normalized.depotStockCustomized = true;
            if (selectedDepotId) normalized.selectedDepotId = selectedDepotId;
            if (selectedDepotId) normalized.activeDepotId = selectedDepotId;
            if (selectedEmplacements.length) normalized.selectedEmplacements = selectedEmplacements.slice();
            if (stockManagement && typeof stockManagement === "object") {
              normalized.stockManagement = {
                ...stockManagement,
                activeDepotId: String(stockManagement.activeDepotId || "").trim() || selectedDepotId || "",
                defaultDepot:
                  String(stockManagement.defaultDepot || "").trim() || selectedDepotId || ""
              };
              if (depotStockCustomized) {
                normalized.stockManagement.depotStockCustomized = true;
              }
              if (selectedEmplacements.length) {
                normalized.stockManagement.defaultLocationIds = selectedEmplacements.slice();
                normalized.stockManagement.selectedEmplacements = selectedEmplacements.slice();
                normalized.stockManagement.defaultLocationId =
                  String(normalized.stockManagement.defaultLocationId || "").trim() ||
                  selectedEmplacements[0];
                normalized.stockManagement.defaultLocation =
                  String(normalized.stockManagement.defaultLocation || "").trim() ||
                  selectedEmplacements[0];
              }
              if (depots.length && !Array.isArray(normalized.stockManagement.depots)) {
                normalized.stockManagement.depots = depots.slice();
              }
            }
            const path = record.path || source.__articlePath || source.__path || source.path || "";
            if (path) normalized.__articlePath = path;
            return normalized;
          };

          loadArticleRecordIntoForm = (record = {}, options = {}) => {
            if (!record) return;
            const scope = resolveAddFormScope(options.formScope);
            if (scope) setActiveAddFormScope(scope);
            const article = normalizeArticleRecord(record);

            const scopedResults = scope?.querySelector?.("#articleSearchResults") || articleSearchResults;
            const scopedInput = scope?.querySelector?.("#articleSearch") || articleSearchInput;
            hideArticleSearchResults(scopedResults);
            clearArticleSearchInputValue(scopedInput);

            const forceFullLoad =
              options.forceFullLoad === true || scope?.id === "articleFormPopover";
            const activeInput = forceFullLoad ? null : getActiveAddFormInput(scope);
            const appliedSingleField = activeInput ? applyArticleFieldToInput(activeInput, article, scope) : false;
            if (!appliedSingleField) {
              applyArticleFromSearch(article, { applyUse: false, formScope: scope }); // preserve current field toggle state
            }
            const label = record.name || article.product || article.ref || "";
            const resolvedPath = record.path || article.__articlePath || article.__path || article.path || "";
            SEM.enterArticleEditContext?.({ path: resolvedPath || "", name: label || "" });
            SEM.showSavedArticleButtons?.();
          };

          openArticleRecordInPopover = (triggerEl, record, index, options = {}) => {
            if (!record) return false;
            const requestedMode = String(options?.mode || "edit").trim().toLowerCase();
            const mode = requestedMode === "view" ? "view" : "edit";
            const fallbackContextEl = options?.fallbackContextEl || null;
            const ctx =
              SEM.getArticleFormPopoverContext?.(triggerEl) ||
              SEM.getArticleFormPopoverContext?.(fallbackContextEl) ||
              SEM.getArticleFormPopoverContext?.(getEl("articleCreateBtn")) ||
              SEM.getArticleFormPopoverContext?.(getEl("articleFormToggleBtn"));
            if (!ctx?.popover || !ctx?.scope) return false;
            setTimeout(() => {
              SEM.setArticlePopoverSelectedRecord?.(ctx.popover, record, index);
              SEM.setArticleFormPopoverMode?.(ctx, mode);
              SEM.setArticleFormPopoverOpen?.(ctx, true);
              loadArticleRecordIntoForm(record, { formScope: ctx.scope, forceFullLoad: true });
            }, 0);
            return true;
          };

          normalizeArticleFodecForItem = (src = {}) => {
            const fodec = src.fodec && typeof src.fodec === "object" ? src.fodec : {};
            const resolveNum = (value, fallback = 0) => {
              const num = Number(value);
              return Number.isFinite(num) ? num : fallback;
            };
            const rate = resolveNum(
              fodec.rate ?? src.fodecRate ?? src.fodec_rate ?? src.fodec_rate_pct ?? src.fodecRatePct,
              0
            );
            const tva = resolveNum(
              fodec.tva ?? src.fodecTva ?? src.fodec_tva ?? src.fodecTvaPct ?? src.fodec_tva_pct,
              0
            );
            const enabledFlag = fodec.enabled ?? src.fodecEnabled ?? src.fodec_enabled;
            const labelCandidate = fodec.label || src.fodecLabel || state()?.meta?.addForm?.fodec?.label;
            const label = typeof labelCandidate === "string" && labelCandidate.trim() ? labelCandidate : "FODEC";
            const hasValue = Math.abs(rate) > 0 || Math.abs(tva) > 0;
            const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
            return { enabled, label, rate, tva };
          };
          normalizeArticlePurchaseFodecForItem = (src = {}) => {
            const purchaseFodec =
              src.purchaseFodec && typeof src.purchaseFodec === "object" ? src.purchaseFodec : {};
            const resolveNum = (value, fallback = 0) => {
              const num = Number(value);
              return Number.isFinite(num) ? num : fallback;
            };
            const rate = resolveNum(
              purchaseFodec.rate ??
                src.purchaseFodecRate ??
                src.purchase_fodec_rate ??
                src.purchase_fodec_rate_pct ??
                src.purchaseFodecRatePct,
              0
            );
            const tva = resolveNum(
              purchaseFodec.tva ??
                src.purchaseFodecTva ??
                src.purchase_fodec_tva ??
                src.purchaseFodecTvaPct ??
                src.purchase_fodec_tva_pct,
              0
            );
            const enabledFlag = purchaseFodec.enabled ?? src.purchaseFodecEnabled ?? src.purchase_fodec_enabled;
            const labelCandidate =
              purchaseFodec.label || src.purchaseFodecLabel || state()?.meta?.addForm?.purchaseFodec?.label;
            const label =
              typeof labelCandidate === "string" && labelCandidate.trim() ? labelCandidate : "FODEC ACHAT";
            const hasValue = Math.abs(rate) > 0 || Math.abs(tva) > 0;
            const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
            return { enabled, label, rate, tva };
          };

          addArticleToItems = (article = {}, options = {}) => {
            if (!article || !Array.isArray(state().items)) return;
            const toNumber = (value, fallback = 0) => {
              const num = Number(
                typeof value === "string" ? value.replace(",", ".") : value
              );
              return Number.isFinite(num) ? num : fallback;
            };
            const purchaseDiscountValue = toNumber(
              article.purchaseDiscount ??
                article.purchase_discount ??
                article.purchaseDiscountPct ??
                article.purchase_discount_pct ??
                article.purchaseDiscountPercent ??
                article.purchase_discount_percent ??
                0,
              0
            );
            const salesDiscountValue = toNumber(
              article.discount ??
                article.discountPct ??
                article.discount_pct ??
                article.discountRate ??
                article.discount_rate ??
                article.remise ??
                0,
              0
            );
            const docTypeRaw = String(state()?.meta?.docType || "")
              .trim()
              .toLowerCase();
            const usePurchasePricing = docTypeRaw === "fa";
            const normalized = {
              ref: article.ref ?? "",
              product: article.product ?? "",
              desc: article.desc ?? "",
              qty: toNumber(article.qty ?? 1, 1) || 1,
              unit: article.unit ?? "",
              purchasePrice: toNumber(article.purchasePrice ?? article.purchase_price ?? 0, 0),
              purchaseTva: toNumber(resolveArticlePurchaseTvaValue(article, 0), 0),
              purchaseDiscount: purchaseDiscountValue,
              price: toNumber(article.price ?? 0, 0),
              tva: toNumber(resolveArticleSalesTvaValue(article, 19), 19),
              discount: usePurchasePricing ? purchaseDiscountValue : salesDiscountValue,
              fodec: normalizeArticleFodecForItem(article),
              purchaseFodec: normalizeArticlePurchaseFodecForItem(article)
            };
            const path =
              options.path ||
              article.__articlePath ||
              article.__path ||
              article.path ||
              "";
            if (path) normalized.__articlePath = path;
            mergeItemIntoState(normalized);
            if (typeof SEM.renderItems === "function") {
              SEM.renderItems();
            } else {
              SEM.computeTotals?.();
            }
          };

          performArticleSearch = async (rawValue, { showResults = true, resultsEl } = {}) => {
            const targetResults = resultsEl || articleSearchResults;
            if (!targetResults) return;
            const query = String(rawValue || "").trim();
            if (!query) {
              articleSearchData = [];
              articleSearchPage = 1;
              hideArticleSearchResults(targetResults);
              return;
            }
            lastArticleSearchQuery = query;
            if (query.length < MIN_ARTICLE_SEARCH_LENGTH) {
              articleSearchData = [];
              articleSearchPage = 1;
              if (showResults) {
                showArticleSearchStatus(
                  `<div class="client-search__status">Tapez au moins ${MIN_ARTICLE_SEARCH_LENGTH} caracteres.</div>`,
                  targetResults
                );
              } else {
                hideArticleSearchResults(targetResults);
              }
              return;
            }

            if (showResults) {
              showArticleSearchStatus('<div class="client-search__status">Recherche...</div>', targetResults);
            }

            try {
              const res = await window.electronAPI?.searchArticles?.({ query });
              if (!res?.ok) {
                if (showResults) {
                  showArticleSearchStatus(
                    `<div class="client-search__status">${escapeHTML(res?.error || "Recherche impossible")}</div>`,
                    targetResults
                  );
                } else {
                  hideArticleSearchResults(targetResults);
                }
                return;
              }
              articleSearchData = Array.isArray(res.results) ? res.results : [];
              articleSearchPage = 1;
              lastArticleSearchQuery = query;
              if (showResults) {
                renderArticleSearchResults(articleSearchData, query, targetResults);
              } else {
                hideArticleSearchResults(targetResults);
              }
            } catch (err) {
              console.error("article search", err);
              if (showResults) {
                showArticleSearchStatus('<div class="client-search__status">Erreur de recherche</div>', targetResults);
              } else {
                hideArticleSearchResults(targetResults);
              }
            }
          };
          const normalizeClientTaxesForSearchResults = (value, fallback = "non_exonore") => {
            const normalized = String(value || "")
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[\s-]+/g, "_");
            if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
              return "exonore";
            }
            if (
              normalized === "non_exonore" ||
              normalized === "nonexonore" ||
              normalized === "non_exonoree" ||
              normalized === "nonexonoree" ||
              normalized === "non_exoneree" ||
              normalized === "nonexoneree"
            ) {
              return "non_exonore";
            }
            return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
          };
          const ensureClientSearchResultTaxes = (entry = {}) => {
            const source = entry && typeof entry === "object" ? entry : {};
            const nestedClient =
              source.client && typeof source.client === "object" ? source.client : {};
            const resolvedTaxes = normalizeClientTaxesForSearchResults(
              nestedClient.taxes ??
                nestedClient.taxesStatus ??
                nestedClient.taxes_status ??
                source.taxes ??
                source.taxesStatus ??
                source.taxes_status,
              "non_exonore"
            );
            return {
              ...source,
              taxes: resolvedTaxes,
              client: {
                ...nestedClient,
                taxes: resolvedTaxes
              }
            };
          };

          performClientSearch = async (rawValue, options = {}) => {
            const resultsEl = options.resultsEl || clientSearchResults;
            if (!resultsEl) return;
            const query = String(rawValue || "").trim();
            const scopeNode = options.scopeNode || resolveClientScopeFromNode(resultsEl);
            const searchState =
              options.searchState ||
              getClientSearchStateHandle({
                scopeNode,
                resultsEl
              });
            if (!query || query.length < MIN_CLIENT_SEARCH_LENGTH) {
              searchState?.setData?.([]);
              searchState?.setPage?.(1);
              hideClientSearchResults(resultsEl);
              return;
            }

            showClientSearchStatus('<div class="client-search__status">Recherche...</div>', resultsEl);

            try {
              const entityType = resolveClientEntityType(scopeNode);
              const res = await window.electronAPI?.searchClients?.({ query, entityType });
              if (!res?.ok) {
                showClientSearchStatus(
                  `<div class="client-search__status">${escapeHTML(res?.error || "Recherche impossible")}</div>`,
                  resultsEl
                );
                return;
              }
              const nextItems = (Array.isArray(res.results) ? res.results : []).map(
                ensureClientSearchResultTaxes
              );
              searchState?.setData?.(nextItems);
              searchState?.setPage?.(1);
              renderClientSearchResults(nextItems, query, resultsEl, { searchState });
            } catch (err) {
              console.error(err);
              showClientSearchStatus('<div class="client-search__status">Erreur de recherche</div>', resultsEl);
            }
          };

  }, { order: 700 });

  registerCoreBootstrapRuntimeSource("saved-modals-main", function (ctx) {
          const ensureClientSearchResultTaxesSafe = (entry = {}) => {
            if (typeof ensureClientSearchResultTaxes === "function") {
              try {
                return ensureClientSearchResultTaxes(entry);
              } catch (err) {
                console.warn("client taxes normalization fallback (saved modal)", err);
              }
            }
            const normalizeClientTaxesValue = (value, fallback = "non_exonore") => {
              const normalized = String(value || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s-]+/g, "_");
              if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
                return "exonore";
              }
              if (
                normalized === "non_exonore" ||
                normalized === "nonexonore" ||
                normalized === "non_exonoree" ||
                normalized === "nonexonoree" ||
                normalized === "non_exoneree" ||
                normalized === "nonexoneree"
              ) {
                return "non_exonore";
              }
              return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
            };
            const source = entry && typeof entry === "object" ? entry : {};
            const nestedClient = source.client && typeof source.client === "object" ? source.client : {};
            const resolvedTaxes = normalizeClientTaxesValue(
              nestedClient.taxes ??
                nestedClient.taxesStatus ??
                nestedClient.taxes_status ??
                source.taxes ??
                source.taxesStatus ??
                source.taxes_status,
              "non_exonore"
            );
            return {
              ...source,
              taxes: resolvedTaxes,
              client: {
                ...nestedClient,
                taxes: resolvedTaxes
              }
            };
          };
          renderClientSavedModal = () => {
            if (!clientSavedModalList) return;
            const { items, page, total, loading, message } = clientSavedModalState;
            const labels = getClientSavedModalLabels(clientSavedModalEntityType);
            const scopedFieldLabels = getScopedClientFieldLabels(clientSavedModalEntityType);
            const scopedVisibility = getScopedClientFieldVisibility(clientSavedModalEntityType);
            const disableRowDeleteAction =
              clientSavedModal?.id === "clientSavedModalNv" ||
              clientSavedModal?.id === "fournisseurSavedModalNv" ||
              clientSavedModal?.id === "transporteurSavedModalNv";
            const resolveFieldLabel = (key) =>
              resolveScopedClientFieldLabel(key, clientSavedModalEntityType, scopedFieldLabels);
            const totalPages = getClientSavedModalTotalPages();
            const hasPages = total > 0;
            const safePage = hasPages ? Math.min(Math.max(page, 1), totalPages) : 1;
            clientSavedModalState.page = safePage;
            clientSavedModalList.innerHTML = "";
            if (loading) {
              const loadingEl = document.createElement("div");
              loadingEl.className = "client-saved-modal__empty";
              loadingEl.textContent = labels.loadingText;
              clientSavedModalList.appendChild(loadingEl);
            } else if (!items.length) {
              const emptyEl = document.createElement("div");
              emptyEl.className = "client-saved-modal__empty";
              emptyEl.textContent = labels.emptyText;
              clientSavedModalList.appendChild(emptyEl);
            } else {
              items.forEach((item, index) => {
                const row = document.createElement("div");
                row.className = "client-search__option client-saved-item";
                const safeClient = item.client || {};
                if (clientSavedModalEntityType === "transporter") {
                  const transporter = safeClient && typeof safeClient === "object" ? safeClient : item || {};
                  const name = String(transporter.name || item.name || "").trim();
                  const driverName =
                    item.driverName || transporter.driverName || transporter.benefit || "";
                  const vehiclePlate =
                    item.vehiclePlate || transporter.vehiclePlate || transporter.account || "";
                  const transportMode =
                    item.transportMode || transporter.transportMode || transporter.stegRef || "";
                  const phone =
                    item.phone ||
                    item.telephone ||
                    item.tel ||
                    transporter.phone ||
                    transporter.telephone ||
                    transporter.tel ||
                    "";
                  const email = item.email || transporter.email || "";
                  const address =
                    item.address ||
                    item.adresse ||
                    transporter.address ||
                    transporter.adresse ||
                    "";
                  const formatValue = (value) => {
                    if (value === null || value === undefined || value === "") {
                      return '<span class="client-search__empty">N.R.</span>';
                    }
                    return escapeHTML(String(value));
                  };
                  const nameLabel = resolveFieldLabel("name");
                  const driverNameLabel = resolveFieldLabel("driverName");
                  const vehiclePlateLabel = resolveFieldLabel("vehiclePlate");
                  const transportModeLabel = resolveFieldLabel("transportMode");
                  const phoneLabel = resolveFieldLabel("phone");
                  const emailLabel = resolveFieldLabel("email");
                  const addressLabel = resolveFieldLabel("address");
                  const actionButtons = [];
                  if (clientSavedModalAllowAddAction) {
                    actionButtons.push(
                      `<button type="button" class="client-search__edit" data-client-saved-load="${index}">Ajouter</button>`
                    );
                  }
                  actionButtons.push(
                    `<button type="button" class="client-search__edit" data-client-saved-update="${index}">Mettre a jour</button>`
                  );
                  if (!disableRowDeleteAction) {
                    actionButtons.push(
                      `<button type="button" class="client-search__delete" data-client-saved-delete="${index}">Supprimer</button>`
                    );
                  }
                  row.innerHTML = `
                    <button type="button" class="client-search__select client-search__select--detailed" data-client-saved-load="${index}">
                      <div class="client-search__details-grid">
                        <div class="client-search__details-row">
                          <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                            <span class="client-search__detail-label">${escapeHTML(nameLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(name)}</span>
                          </div>
                          <div class="client-search__detail client-search__detail--inline" data-client-field="driverName">
                            <span class="client-search__detail-label">${escapeHTML(driverNameLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(driverName)}</span>
                          </div>
                        </div>
                        <div class="client-search__details-row">
                          <div class="client-search__detail client-search__detail--inline" data-client-field="vehiclePlate">
                            <span class="client-search__detail-label">${escapeHTML(vehiclePlateLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(vehiclePlate)}</span>
                          </div>
                          <div class="client-search__detail client-search__detail--inline" data-client-field="transportMode">
                            <span class="client-search__detail-label">${escapeHTML(transportModeLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(transportMode)}</span>
                          </div>
                        </div>
                        <div class="client-search__details-row">
                          <div class="client-search__detail client-search__detail--inline client-search__detail--phone" data-client-field="phone">
                            <span class="client-search__detail-label">${escapeHTML(phoneLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(phone)}</span>
                          </div>
                          <div class="client-search__detail client-search__detail--inline client-search__detail--email" data-client-field="email">
                            <span class="client-search__detail-label">${escapeHTML(emailLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(email)}</span>
                          </div>
                        </div>
                        <div class="client-search__detail client-search__detail--inline client-search__detail--full" data-client-field="address">
                          <span class="client-search__detail-label">${escapeHTML(addressLabel)} :</span>
                          <span class="client-search__detail-value">${formatValue(address)}</span>
                        </div>
                      </div>
                    </button>
                    <div class="client-search__actions">
                      ${actionButtons.join("\n              ")}
                    </div>`;
                  clientSavedModalList.appendChild(row);
                  return;
                }
                const clientName = String(safeClient.name || item.clientName || "").trim();
                const hasClientData = Object.keys(safeClient).length > 0;
                const fallbackName = !hasClientData ? String(item.name || "").trim() : "";
                const name = clientName || (fallbackName.toLowerCase() === "client" ? "" : fallbackName);
                const codeClient =
                  item.codeClient ||
                  item.code_client ||
                  item.code ||
                  safeClient.codeClient ||
                  safeClient.code_client ||
                  safeClient.code ||
                  "";
                const taxIdValue =
                  item.vat ||
                  item.identifiantFiscal ||
                  item.identifiant ||
                  item.tva ||
                  item.nif ||
                  item.cin ||
                  item.passport ||
                  item.passeport ||
                  safeClient.vat ||
                  safeClient.identifiantFiscal ||
                  safeClient.identifiant ||
                  safeClient.tva ||
                  safeClient.nif ||
                  safeClient.cin ||
                  safeClient.passport ||
                  safeClient.passeport ||
                  "";
                const formatValue = (value) => {
                  if (value === null || value === undefined || value === "") {
                    return '<span class="client-search__empty">N.R.</span>';
                  }
                  return escapeHTML(String(value));
                };
                const clientTypeRaw = String(safeClient.type || item.type || "").toLowerCase();
                const clientType =
                  clientTypeRaw === "particulier" || clientTypeRaw === "personne_physique" ? clientTypeRaw : "societe";
                const clientTypeLabels = {
                  societe: "Societe / personne morale",
                  personne_physique: "Personne physique",
                  particulier: "Particulier"
                };
                const typeLabel = labels.typeLabel;
                const typeDisplay = clientTypeLabels[clientType] || clientTypeLabels.societe;
                const defaultTaxIdLabel =
                  clientSavedModalEntityType === "transporter"
                    ? resolveTransporteurFieldLabelDefaults().taxId
                    : resolveClientFieldLabelDefaults().taxId;
                const customTaxIdLabel =
                  clientSavedModalEntityType === "transporter"
                    ? scopedFieldLabels?.taxId
                    : clientFieldLabels?.taxId;
                const customTaxIdValue = typeof customTaxIdLabel === "string" ? customTaxIdLabel.trim() : "";
                const useCustomTaxIdLabel = customTaxIdValue && customTaxIdValue !== defaultTaxIdLabel;
                const useCinPassportTaxLabel =
                  clientSavedModalEntityType === "client" && clientType === "particulier";
                const taxIdLabel = useCustomTaxIdLabel
                  ? customTaxIdValue
                  : useCinPassportTaxLabel
                    ? "CIN / passeport"
                    : resolveFieldLabel("taxId");
                const codeClientLabel = "Code Client";
                const nameLabel = resolveFieldLabel("name");
                const typeRowHtml = `
                        <div class="client-search__details-row">
                        <div class="client-search__detail client-search__detail--inline">
                          <span class="client-search__detail-label">${typeLabel} :</span>
                          <span class="client-search__detail-value">${formatValue(typeDisplay)}</span>
                        </div>
                        </div>
                      `;
                const taxIdRowHtml = `
                        <div class="client-search__details-row">
                        <div class="client-search__detail client-search__detail--inline" data-client-field="taxId">
                          <span class="client-search__detail-label">${escapeHTML(taxIdLabel)} :</span>
                          <span class="client-search__detail-value">${formatValue(taxIdValue)}</span>
                        </div>
                      `;
                  const actionButtons = [];
                  if (clientSavedModalAllowAddAction) {
                    actionButtons.push(
                      `<button type="button" class="client-search__edit" data-client-saved-load="${index}">Ajouter</button>`
                    );
                }
                actionButtons.push(
                  `<button type="button" class="client-search__edit" data-client-saved-update="${index}">Mettre a jour</button>`
                );
                if (!disableRowDeleteAction) {
                  actionButtons.push(
                    `<button type="button" class="client-search__delete" data-client-saved-delete="${index}">Supprimer</button>`
                  );
                }
                row.innerHTML = `
                  <button type="button" class="client-search__select client-search__select--detailed" data-client-saved-load="${index}">
                    <div class="client-search__details-grid">
                        <div class="client-search__details-row">
                          <div class="client-search__detail client-search__detail--inline" data-client-field="codeClient">
                            <span class="client-search__detail-label">${escapeHTML(codeClientLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(codeClient)}</span>
                          </div>
                          <div class="client-search__detail client-search__detail--inline client-search__detail--name" data-client-field="name">
                            <span class="client-search__detail-label">${escapeHTML(nameLabel)} :</span>
                            <span class="client-search__detail-value">${formatValue(name)}</span>
                          </div>
                        </div>
                        ${typeRowHtml}
                        ${taxIdRowHtml}
                    </div>
                  </button>
                  <div class="client-search__actions">
                    ${actionButtons.join("\n              ")}
                  </div>`;
                clientSavedModalList.appendChild(row);
              });
            }
            if (clientSavedModalEntityType === "transporter") {
              clientSavedModalList.querySelectorAll("[data-client-field]").forEach((node) => {
                const key = String(node.dataset.clientField || "").trim();
                const isVisible = !!key && scopedVisibility[key] !== false;
                node.hidden = !isVisible;
                node.style.display = isVisible ? "" : "none";
                node.classList.toggle("is-hidden", !isVisible);
              });
              clientSavedModalList.querySelectorAll(".client-search__details-row").forEach((row) => {
                const hasVisibleField = Array.from(row.querySelectorAll("[data-client-field]")).some(
                  (node) => !node.hidden
                );
                row.hidden = !hasVisibleField;
                row.style.display = hasVisibleField ? "" : "none";
              });
            } else {
              applyClientFieldVisibility(clientSavedModalList, clientFieldVisibility);
            }

            if (clientSavedModalPage) {
              clientSavedModalPage.setAttribute(
                "aria-label",
                `Page ${safePage} sur ${totalPages}`
              );
            }
            if (clientSavedModalTotalPages) {
              clientSavedModalTotalPages.textContent = String(totalPages);
            }
            if (clientSavedModalPageInput) {
              clientSavedModalPageInput.disabled = !hasPages;
              clientSavedModalPageInput.min = hasPages ? "1" : "0";
              clientSavedModalPageInput.max = String(totalPages);
              clientSavedModalPageInput.value = hasPages ? String(safePage) : "";
              clientSavedModalPageInput.setAttribute("aria-valuemin", hasPages ? "1" : "0");
              clientSavedModalPageInput.setAttribute("aria-valuemax", String(totalPages));
              clientSavedModalPageInput.setAttribute(
                "aria-valuenow",
                hasPages ? String(safePage) : "0"
              );
            } else if (clientSavedModalPage) {
              if (hasPages) {
                clientSavedModalPage.textContent = `Page ${safePage} / ${totalPages}`;
              } else {
                clientSavedModalPage.textContent = "Page 1 / 1";
              }
            }

            const startIdx = hasPages ? (safePage - 1) * CLIENT_SAVED_PAGE_SIZE + 1 : 0;
            const endIdx = hasPages ? startIdx + items.length - 1 : 0;
            let statusText = "";
            if (loading) {
              statusText = labels.loadingText;
            } else if (message) {
              statusText = message;
            } else if (total > 0 && items.length) {
              statusText = `Affichage ${startIdx}\u2013${endIdx} sur ${total} ${labels.singular}${total > 1 ? "s" : ""}`;
            } else {
              statusText = labels.emptyStatusText;
            }
            if (clientSavedModalStatus) clientSavedModalStatus.textContent = statusText;

            const disablePrev = loading || safePage <= 1 || !hasPages;
            const disableNext = loading || !hasPages || safePage >= totalPages;
            if (clientSavedModalPrev) clientSavedModalPrev.disabled = disablePrev;
            if (clientSavedModalNext) clientSavedModalNext.disabled = disableNext;
            if (clientSavedModalCloseFooter) clientSavedModalCloseFooter.disabled = false;
          };

          applyClientSavedModalPageInput = () => {
            if (!clientSavedModalPageInput || clientSavedModalState.loading) return;
            const rawValue = String(clientSavedModalPageInput.value || "").trim();
            if (!rawValue) {
              clientSavedModalPageInput.value = String(clientSavedModalState.page);
              return;
            }
            const requested = Number(rawValue);
            if (!Number.isFinite(requested)) {
              clientSavedModalPageInput.value = String(clientSavedModalState.page);
              return;
            }
            const totalPages = getClientSavedModalTotalPages();
            const targetPage = Math.min(Math.max(Math.trunc(requested), 1), totalPages);
            if (targetPage !== clientSavedModalState.page) {
              fetchSavedClientsPage(targetPage);
            } else {
              clientSavedModalPageInput.value = String(clientSavedModalState.page);
            }
          };

          fetchSavedClientsPage = async (targetPage = 1) => {
            if (!clientSavedModalList || clientSavedModalState.loading) return;
            const page = Math.max(1, Number(targetPage) || 1);
            const requestId = ++clientSavedModalRequestId;
            setClientSavedRefreshBusy(true);
            clientSavedModalState.loading = true;
            clientSavedModalState.page = page;
            clientSavedModalState.message = "";
            storeClientSavedModalEntityState(clientSavedModalEntityType);
            renderClientSavedModal();

            const trimmedQuery = (clientSavedModalState.query || "").trim();
            if (trimmedQuery && trimmedQuery.length < CLIENT_SAVED_MIN_SEARCH_LENGTH) {
              if (requestId !== clientSavedModalRequestId) return;
              clientSavedModalState.loading = false;
              clientSavedModalState.items = [];
              clientSavedModalState.total = 0;
              clientSavedModalState.message = `Tapez au moins ${CLIENT_SAVED_MIN_SEARCH_LENGTH} caracteres.`;
              clientSavedModalState.page = 1;
              renderClientSavedModal();
              setClientSavedRefreshBusy(false);
              return;
            }

            if (!window.electronAPI?.searchClients) {
              if (requestId !== clientSavedModalRequestId) return;
              clientSavedModalState.loading = false;
              clientSavedModalState.items = [];
              clientSavedModalState.total = 0;
              clientSavedModalState.message = "Recherche des clients indisponible.";
              renderClientSavedModal();
              setClientSavedRefreshBusy(false);
              return;
            }

            try {
              const offset = (page - 1) * CLIENT_SAVED_PAGE_SIZE;
              const res = await window.electronAPI.searchClients({
                query: trimmedQuery,
                limit: CLIENT_SAVED_PAGE_SIZE,
                offset,
                entityType: clientSavedModalEntityType
              });
              if (requestId !== clientSavedModalRequestId) return;
              if (!res?.ok) {
                clientSavedModalState.items = [];
                clientSavedModalState.total = 0;
                clientSavedModalState.message = res?.error || "Chargement impossible.";
                return;
              }
              const results = (Array.isArray(res.results) ? res.results : []).map(
                ensureClientSearchResultTaxesSafe
              );
              const totalRaw = Number(res.total);
              const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : offset + results.length;
              if (total > 0) {
                const maxPage = Math.max(1, Math.ceil(total / CLIENT_SAVED_PAGE_SIZE));
                if (page > maxPage) {
                  clientSavedModalState.loading = false;
                  clientSavedModalState.page = maxPage;
                  return fetchSavedClientsPage(maxPage);
                }
              } else if (page !== 1) {
                clientSavedModalState.loading = false;
                clientSavedModalState.page = 1;
                return fetchSavedClientsPage(1);
              }
              clientSavedModalState.items = results;
              clientSavedModalState.total = Math.max(0, total);
              clientSavedModalState.message = "";
            } catch (err) {
              console.error("client saved modal fetch", err);
              if (requestId !== clientSavedModalRequestId) return;
              clientSavedModalState.items = [];
              clientSavedModalState.total = 0;
              clientSavedModalState.message = "Chargement impossible.";
            } finally {
              if (requestId !== clientSavedModalRequestId) return;
              clientSavedModalState.loading = false;
              renderClientSavedModal();
              storeClientSavedModalEntityState(clientSavedModalEntityType);
              setClientSavedRefreshBusy(false);
            }
          };

          onClientSavedModalKeyDown = (evt) => {
            if (evt.key === "Escape") {
              evt.preventDefault();
              closeClientSavedModal();
            }
          };

          openClientSavedModal = () => {
            if (!clientSavedModal) return;
            clientSavedModalRestoreFocus =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            clientSavedModal.hidden = false;
            clientSavedModal.removeAttribute("hidden");
            clientSavedModal.setAttribute("aria-hidden", "false");
            clientSavedModal.classList.add("is-open");
            document.addEventListener("keydown", onClientSavedModalKeyDown);
            applyClientSavedModalEntityState(clientSavedModalEntityType);
            clientSavedModalState.query = (clientSavedSearchInput?.value || clientSavedModalState.query || "").trim();
            clientSavedModalState.loading = false;
            const targetPage = Math.max(1, Number(clientSavedModalState.page) || 1);
            fetchSavedClientsPage(targetPage);
          };

          isClientSavedModalOpen = () =>
            !!(
              clientSavedModal &&
              clientSavedModal.classList.contains("is-open") &&
              clientSavedModal.getAttribute("aria-hidden") === "false"
            );

          closeClientSavedModal = function closeClientSavedModal() {
            if (!clientSavedModal) return;
            clearTimeout(clientSavedSearchTimer);
            clientSavedSearchTimer = null;
            clientSavedModalRequestId += 1;
            resetClientSavedModalEntityState(clientSavedModalEntityType);
            delete clientSavedModal.dataset.bsTransportTarget;
            clientSavedModal.classList.remove("is-open");
            clientSavedModal.hidden = true;
            clientSavedModal.setAttribute("hidden", "");
            clientSavedModal.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", onClientSavedModalKeyDown);
            if (clientSavedModalRestoreFocus && typeof clientSavedModalRestoreFocus.focus === "function") {
              try {
                clientSavedModalRestoreFocus.focus();
              } catch {}
            }
          }

          handleClientSavedListClick = (evt) => {
            const trigger = evt.target?.closest?.(clientSavedListBtnSelector);
            if (!trigger || !clientSavedModal) return;
            storeClientSavedModalEntityState(clientSavedModalEntityType);
            const isItemsDocOptionsContext =
              !!trigger.closest("#itemsDocOptionsModal") || isItemsDocOptionsModalOpen();
            const isMainscreenContext = !!trigger.closest("#clientBoxMainscreen");
            const isHeaderClientTrigger = trigger.id === "btnAddClientMenu";
            const isHeaderFournisseurTrigger = trigger.id === "btnAddFournisseurMenu";
            const isBsTransportDocTrigger =
              trigger.id === "bsTransporteurSavedListBtn" ||
              trigger.dataset?.bsTransportSavedOpen === "true";
            const isTransporteurTrigger =
              isBsTransportDocTrigger ||
              trigger.id === "transporteurSavedModalOpenBtn" ||
              trigger.id === "TransporteurSavedListBtn";
            clientSavedModalAllowAddAction =
              !isMainscreenContext && !isHeaderFournisseurTrigger && !isHeaderClientTrigger;
            if (isHeaderFournisseurTrigger) {
              clientSavedModalFormScope = document.getElementById("FournisseurBoxNewDoc") || null;
              clientSavedModalEntityType = "vendor";
            } else if (isHeaderClientTrigger) {
              clientSavedModalFormScope = document.getElementById("clientBoxNewDoc") || null;
              clientSavedModalEntityType = "client";
            } else if (isTransporteurTrigger) {
              clientSavedModalFormScope =
                trigger.closest("#itemsDocOptionsModal") ||
                trigger.closest(`#${MAIN_TRANSPORTER_SCOPE_ID}`) ||
                document.getElementById(MAIN_TRANSPORTER_SCOPE_ID) ||
                null;
              clientSavedModalEntityType = "transporter";
            } else {
              clientSavedModalFormScope =
                trigger.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`) ||
                trigger.closest("#clientBoxMainscreen") ||
                getActiveMainClientScope() ||
                null;
              clientSavedModalEntityType = resolveClientEntityType(clientSavedModalFormScope);
            }
            clientSavedModal.dataset.bsTransportTarget = isBsTransportDocTrigger ? "true" : "false";
            setClientSavedModalId(clientSavedModalEntityType, { fromItemsModal: isItemsDocOptionsContext });
            setClientSavedModalPopoverIds(clientSavedModalEntityType);
            applyClientSavedModalLabels(clientSavedModalEntityType);
            applyClientSavedModalEntityState(clientSavedModalEntityType);
            if (!isClientSavedModalOpen()) {
              openClientSavedModal();
              return;
            }
            clearTimeout(clientSavedSearchTimer);
            clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
            const targetPage = Math.max(1, clientSavedModalState.page || 1);
            fetchSavedClientsPage(targetPage);
          };

          document.addEventListener("click", handleClientSavedListClick);
          clientSavedModalClose?.addEventListener("click", closeClientSavedModal);
          if (clientSavedModal) {
            clientSavedModal.addEventListener("click", (evt) => {
              if (evt.target === clientSavedModal) evt.stopPropagation();
            });
          }
          clientSavedModalRefresh?.addEventListener("click", () => {
            if (clientSavedModalState.loading) return;
            clearTimeout(clientSavedSearchTimer);
            clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
            const targetPage = Math.max(1, clientSavedModalState.page || 1);
            fetchSavedClientsPage(targetPage);
          });
          clientSavedModalPrev?.addEventListener("click", () => {
            if (clientSavedModalState.loading) return;
            const prevPage = Math.max(1, clientSavedModalState.page - 1);
            if (prevPage !== clientSavedModalState.page) {
              storeClientSavedModalEntityState(clientSavedModalEntityType);
              fetchSavedClientsPage(prevPage);
            }
          });
          clientSavedModalNext?.addEventListener("click", () => {
            if (clientSavedModalState.loading) return;
            if (clientSavedModalState.total <= 0) return;
            const totalPages = getClientSavedModalTotalPages();
            const nextPage = Math.min(totalPages, clientSavedModalState.page + 1);
            if (nextPage !== clientSavedModalState.page) {
              storeClientSavedModalEntityState(clientSavedModalEntityType);
              fetchSavedClientsPage(nextPage);
            }
          });
          clientSavedModalPageInput?.addEventListener("focus", (evt) => {
            if (evt?.target?.select) {
              try {
                evt.target.select();
              } catch {}
            }
          });
          clientSavedModalPageInput?.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") {
              evt.preventDefault();
              applyClientSavedModalPageInput();
            } else if (evt.key === "Escape") {
              clientSavedModalPageInput.value = String(clientSavedModalState.page);
              clientSavedModalPageInput.blur();
            }
          });
          clientSavedModalPageInput?.addEventListener("blur", applyClientSavedModalPageInput);
          clientSavedModalCloseFooter?.addEventListener("click", () => {
            closeClientSavedModal();
          });
          if (clientSavedSearchInput) {
            clientSavedSearchInput.addEventListener("input", (evt) => {
              const value = evt.target.value || "";
              clientSavedModalState.query = value.trim();
              clientSavedModalState.page = 1;
              storeClientSavedModalEntityState(clientSavedModalEntityType);
              clearTimeout(clientSavedSearchTimer);
              clientSavedSearchTimer = setTimeout(() => {
                fetchSavedClientsPage(1);
              }, 240);
            });
            clientSavedSearchInput.addEventListener("keydown", (evt) => {
              if (evt.key === "Enter") {
                evt.preventDefault();
                clearTimeout(clientSavedSearchTimer);
                clientSavedModalState.query = (clientSavedSearchInput.value || "").trim();
                clientSavedModalState.page = 1;
                storeClientSavedModalEntityState(clientSavedModalEntityType);
                fetchSavedClientsPage(1);
              }
            });
          }
          if (clientSavedSearchButton) {
            clientSavedSearchButton.addEventListener("click", () => {
              clearTimeout(clientSavedSearchTimer);
              clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
              clientSavedModalState.page = 1;
              storeClientSavedModalEntityState(clientSavedModalEntityType);
              fetchSavedClientsPage(1);
            });
          }
          if (clientSavedModalList) {
            clientSavedModalList.addEventListener("click", async (evt) => {
              const handleClientLoad = (index, options = {}) => {
                const selected = getNormalizedSavedModalItem(index);
                if (!selected) return;
                hideClientSearchResults();
                clearClientSearchInputValue();
                const allowMainscreen = !options.avoidMainscreen;
                const targetScope =
                  normalizeClientFormScope(options.formScope) ||
                  normalizeClientFormScope(clientSavedModalFormScope) ||
                  document.getElementById("clientBoxNewDoc") ||
                  document.getElementById("FournisseurBoxNewDoc") ||
                  document.getElementById("clientBoxMainscreenTransporteursPanel") ||
                  (allowMainscreen ? getActiveMainClientScope() : null);
                if (!targetScope && !allowMainscreen) return;
                loadClientRecordIntoForm(selected, { formScope: targetScope });
                const clientBox =
                  targetScope ||
                  document.getElementById("clientBoxNewDoc") ||
                  document.getElementById("FournisseurBoxNewDoc") ||
                  document.getElementById("clientBoxMainscreenTransporteursPanel") ||
                  (allowMainscreen ? getActiveMainClientScope() : null);
                const focusTarget =
                  queryScopedClientFormElement(clientBox, "clientName") ||
                  clientBox?.querySelector("input, textarea, select");
                if (focusTarget && typeof focusTarget.focus === "function") {
                  try {
                    focusTarget.focus({ preventScroll: true });
                  } catch {
                    try {
                      focusTarget.focus();
                    } catch {}
                  }
                  focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                closeClientSavedModal();
                return targetScope;
              };
              const syncClientFormScopeFromPayload = (payload) => {
                const targetScope =
                  normalizeClientFormScope(clientSavedModalFormScope) ||
                  document.getElementById("clientBoxNewDoc") ||
                  document.getElementById("FournisseurBoxNewDoc") ||
                  document.getElementById("clientBoxMainscreenTransporteursPanel") ||
                  getActiveMainClientScope();
                if (!targetScope) return null;
                syncClientFormFields(payload, targetScope);
                if (typeof SEM?.refreshClientActionButtons === "function") {
                  SEM.refreshClientActionButtons();
                }
                return targetScope;
              };
              const normalizeClientTaxesSelectionValue = (value, fallback = "non_exonore") => {
                const normalized = String(value || "")
                  .trim()
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[\s-]+/g, "_");
                if (normalized === "exonore" || normalized === "exonoree" || normalized === "exoneree") {
                  return "exonore";
                }
                if (
                  normalized === "non_exonore" ||
                  normalized === "nonexonore" ||
                  normalized === "non_exonoree" ||
                  normalized === "nonexonoree" ||
                  normalized === "non_exoneree" ||
                  normalized === "nonexoneree"
                ) {
                  return "non_exonore";
                }
                return String(fallback || "").trim().toLowerCase() === "exonore" ? "exonore" : "non_exonore";
              };
              const getNormalizedSavedModalItem = (index) => {
                const idx = Math.trunc(Number(index));
                if (!Number.isFinite(idx) || idx < 0) return null;
                const sourceItems = Array.isArray(clientSavedModalState?.items)
                  ? clientSavedModalState.items
                  : [];
                const current = sourceItems[idx];
                if (!current) return null;
                const normalized = ensureClientSearchResultTaxesSafe(current);
                if (normalized !== current) {
                  sourceItems[idx] = normalized;
                }
                return normalized;
              };
              const syncDocumentTaxesFromClientSelection = (payload, targetScope, entityType) => {
                if (!targetScope || typeof SEM.setDocumentTaxesFromClientValue !== "function") return;
                const resolvedEntityType =
                  entityType || resolveClientEntityType(targetScope) || clientSavedModalEntityType || "client";
                const shouldMirrorHelper = SEM.__bindingHelpers?.shouldMirrorEntityClientStateToDocument;
                const shouldMirror =
                  typeof shouldMirrorHelper === "function"
                    ? shouldMirrorHelper(targetScope) === true
                    : targetScope.id === "clientBoxNewDoc" ||
                      (typeof targetScope.closest === "function" && !!targetScope.closest("#clientBoxNewDoc"));
                if (!shouldMirror || resolvedEntityType !== "client") return;
                const scopedTaxesFallback = normalizeClientTaxesSelectionValue(
                  queryScopedClientFormElement(targetScope, "clientTaxes")?.value,
                  state().client?.taxes || "non_exonore"
                );
                const resolvedTaxes = normalizeClientTaxesSelectionValue(
                  payload?.taxes ??
                    payload?.taxesStatus ??
                    payload?.taxes_status ??
                    payload?.client?.taxes ??
                    payload?.client?.taxesStatus ??
                    payload?.client?.taxes_status,
                  scopedTaxesFallback
                );
                const resolvedPath = String(
                  payload?.path || payload?.clientPath || payload?.__path || payload?.client?.__path || ""
                ).trim();
                SEM.setDocumentTaxesFromClientValue(resolvedTaxes, {
                  formScope: targetScope,
                  entityType: resolvedEntityType,
                  clientPath: resolvedPath,
                  source: "client-selection"
                });
              };
              const applyClientPopoverModeFallback = (popoverNode, mode = "create") => {
                if (!popoverNode) return;
                const normalizedMode =
                  mode === "load" ? "view" : ["create", "edit", "view"].includes(mode) ? mode : "create";
                const rightActionsGroup = popoverNode.querySelector(".swbDialog__group.swbDialog__group--right");
                const updateBtn = queryScopedClientFormElement(popoverNode, "btnUpdateClient");
                const saveBtn = queryScopedClientFormElement(popoverNode, "btnSaveClient");
                const newBtn = queryScopedClientFormElement(popoverNode, "btnNewClient");
                const isView = normalizedMode === "view";
                if (rightActionsGroup) {
                  rightActionsGroup.hidden = isView;
                  rightActionsGroup.setAttribute("aria-hidden", isView ? "true" : "false");
                }
                if (updateBtn) {
                  const show = normalizedMode === "edit";
                  updateBtn.hidden = !show;
                  updateBtn.setAttribute("aria-hidden", show ? "false" : "true");
                }
                if (saveBtn) {
                  const show = normalizedMode === "create";
                  saveBtn.hidden = !show;
                  saveBtn.setAttribute("aria-hidden", show ? "false" : "true");
                }
                if (newBtn) {
                  const show = normalizedMode === "create";
                  newBtn.hidden = !show;
                  newBtn.setAttribute("aria-hidden", show ? "false" : "true");
                }
              };
              const openClientRecordInSavedModalPopover = (selected, mode = "view", entityType = null) => {
                if (!selected || !clientSavedModal) return false;
                const modalEntityType =
                  entityType || resolveClientEntityType(clientSavedModal) || clientSavedModalEntityType || "client";
                const modalPopoverSelector =
                  modalEntityType === "transporter"
                    ? "#transporteurFormPopover"
                    : modalEntityType === "vendor"
                      ? "#fournisseurFormPopover"
                      : "#clientFormPopover";
                const popover = clientSavedModal.querySelector(modalPopoverSelector);
                if (!popover) return false;
                loadClientRecordIntoForm(selected, { formScope: clientSavedModal });
                const ctx = buildClientSavedModalPopoverContext(modalEntityType) || {
                  scope: clientSavedModal,
                  popover,
                  toggle: clientSavedModal.querySelector("#clientFormToggleBtn")
                };
                if (ctx) {
                  if (typeof SEM.setClientFormPopoverMode === "function") {
                    SEM.setClientFormPopoverMode(ctx, mode);
                  }
                  const openFn = typeof SEM.setClientFormPopoverOpen === "function"
                    ? SEM.setClientFormPopoverOpen.bind(SEM)
                    : null;
                  if (openFn) {
                    setTimeout(() => {
                      openFn(ctx, true);
                      applyClientPopoverModeFallback(popover, mode);
                    }, 0);
                  } else {
                    popover.classList.add("is-open");
                    popover.hidden = false;
                    popover.removeAttribute("hidden");
                    popover.setAttribute("aria-hidden", "false");
                    applyClientPopoverModeFallback(popover, mode);
                  }
                  return true;
                }
                applyClientPopoverModeFallback(popover, mode);
                return true;
              };

              const loadBtn = evt.target.closest("[data-client-saved-load]");
              if (loadBtn) {
                const idx = Number(loadBtn.dataset.clientSavedLoad);
                const selected = getNormalizedSavedModalItem(idx);
                if (!selected) return;
                const isBsTransportTarget =
                  clientSavedModal?.dataset?.bsTransportTarget === "true" &&
                  (resolveClientEntityType(clientSavedModal) === "transporter" ||
                    clientSavedModalEntityType === "transporter");
                if (isBsTransportTarget) {
                  const payload = selected.client || selected;
                  const applyBsTransporteur =
                    typeof SEM.applyTransporteurSavedSelectionToBonSortie === "function"
                      ? SEM.applyTransporteurSavedSelectionToBonSortie
                      : null;
                  if (applyBsTransporteur) {
                    try {
                      const applied = await Promise.resolve(applyBsTransporteur(payload, selected));
                      if (applied !== false) {
                        closeClientSavedModal();
                        return;
                      }
                    } catch (err) {
                      console.warn("bs transporteur saved load failed", err);
                    }
                  }
                }
                if (
                  (clientSavedModal?.id === "clientSavedModalNv" ||
                    clientSavedModal?.id === "fournisseurSavedModalNv" ||
                    clientSavedModal?.id === "transporteurSavedModalNv") &&
                  !loadBtn.classList?.contains("client-search__edit")
                ) {
                  const payload = selected.client || selected;
                  const targetScope = syncClientFormScopeFromPayload(payload);
                  const resolvedEntityType = selected.entityType || clientSavedModalEntityType || "client";
                  applyClientToState(payload, {
                    formScope: targetScope,
                    entityType: resolvedEntityType
                  });
                  syncDocumentTaxesFromClientSelection(
                    selected?.client ? { ...selected, ...payload } : payload,
                    targetScope,
                    resolvedEntityType
                  );
                  const selectedPath = selected.path || payload.__path || "";
                  if (
                    targetScope &&
                    SEM.__bindingHelpers?.shouldMirrorEntityClientStateToDocument?.(targetScope) &&
                    state().client
                  ) {
                    state().client.__path = selectedPath;
                  }
                  closeClientSavedModal();
                  return;
                }
                if (loadBtn.classList?.contains("client-search__edit")) {
                  const payload = selected.client || selected;
                  const targetScope = syncClientFormScopeFromPayload(payload);
                  const resolvedEntityType = selected.entityType || clientSavedModalEntityType || "client";
                  applyClientToState(payload, {
                    formScope: targetScope,
                    entityType: resolvedEntityType
                  });
                  syncDocumentTaxesFromClientSelection(
                    selected?.client ? { ...selected, ...payload } : payload,
                    targetScope,
                    resolvedEntityType
                  );
                  const selectedPath = selected.path || payload.__path || "";
                  if (
                    targetScope &&
                    SEM.__bindingHelpers?.shouldMirrorEntityClientStateToDocument?.(targetScope) &&
                    state().client
                  ) {
                    state().client.__path = selectedPath;
                  }
                  closeClientSavedModal();
                  return;
                }
                const modalEntityType = resolveClientEntityType(clientSavedModal) || clientSavedModalEntityType;
                if (openClientRecordInSavedModalPopover(selected, "view", modalEntityType)) {
                  return;
                }
                handleClientLoad(idx, { avoidMainscreen: true });
                return;
              }
              const updateBtn = evt.target.closest("[data-client-saved-update]");
              if (updateBtn) {
                const idx = Number(updateBtn.dataset.clientSavedUpdate);
                const selected = getNormalizedSavedModalItem(idx);
                if (!selected) return;
                const modalEntityType = resolveClientEntityType(clientSavedModal) || clientSavedModalEntityType;
                if (openClientRecordInSavedModalPopover(selected, "edit", modalEntityType)) {
                  return;
                }
                const targetScope = handleClientLoad(idx, { avoidMainscreen: true });
                if (
                  targetScope?.id === "clientBoxNewDoc" ||
                  targetScope?.id === "FournisseurBoxNewDoc" ||
                  targetScope?.id === "clientBoxMainscreenTransporteursPanel"
                ) {
                  const ctx = SEM.getClientFormPopoverContext?.(targetScope);
                  if (ctx) {
                    SEM.setClientFormPopoverMode?.(ctx, "edit");
                    setTimeout(() => SEM.setClientFormPopoverOpen?.(ctx, true), 0);
                  }
                }
                return;
              }
              const deleteBtn = evt.target.closest("[data-client-saved-delete]");
              if (deleteBtn) {
                const idx = Number(deleteBtn.dataset.clientSavedDelete);
                const selected = getNormalizedSavedModalItem(idx);
                if (!selected) return;
                const label = selected.name ? ` \"${selected.name}\"` : "";
                const entityLabels = getClientSavedModalLabels(clientSavedModalEntityType);
                const confirmed = await showConfirm(`Supprimer le ${entityLabels.singular}${label} ?`, {
                  title: `Supprimer le ${entityLabels.singular}`,
                  okText: "Supprimer",
                  cancelText: "Annuler"
                });
                if (!confirmed) return;
                if (!window.electronAPI?.deleteClient) {
                  const deleteUnavailable = getMessage("CLIENT_DELETE_UNAVAILABLE");
                  await showDialog?.(deleteUnavailable.text, { title: deleteUnavailable.title });
                  return;
                }
                try {
                  const res = await window.electronAPI.deleteClient({
                    path: selected.path,
                    entityType: clientSavedModalEntityType
                  });
                  if (!res?.ok) {
                    const deleteError = getMessage("DELETE_FAILED");
                    await showDialog?.(res?.error || deleteError.text, { title: deleteError.title });
                    return;
                  }
                  clientSavedModalState.total = Math.max(0, clientSavedModalState.total - 1);
                  fetchSavedClientsPage(clientSavedModalState.page);
                } catch (err) {
                  console.error("client saved delete", err);
                  const deleteError = getMessage("DELETE_FAILED");
                  await showDialog?.(deleteError.text, { title: deleteError.title });
                }
              }
            });
          }
          const normalizeSavedModalEntityType = (value) => {
            const raw = String(value || "").trim().toLowerCase();
            if (raw === "vendor" || raw === "fournisseur") return "vendor";
            if (raw === "transporter" || raw === "transporteur") return "transporter";
            return "client";
          };
          const normalizeSavedModalMatchValue = (value) =>
            String(value || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
          const resolveSavedModalEntryPath = (entry = {}) =>
            String(
              entry.path ||
                entry.clientPath ||
                entry.__path ||
                entry?.client?.__path ||
                entry?.client?.path ||
                ""
            ).trim();
          const patchClientSavedModalEntryFromMutation = (detail = {}) => {
            if (!Array.isArray(clientSavedModalState?.items) || !clientSavedModalState.items.length) return false;
            const snapshot = detail?.snapshot && typeof detail.snapshot === "object" ? detail.snapshot : {};
            const expectedEntityType = normalizeSavedModalEntityType(
              detail?.entityType || clientSavedModalEntityType
            );
            const nextPath = String(detail?.path || snapshot.__path || "").trim();
            const normalizedName = normalizeSavedModalMatchValue(snapshot?.name);
            const normalizedVat = normalizeSavedModalMatchValue(
              snapshot?.vat ||
                snapshot?.mf ||
                snapshot?.identifiantFiscal ||
                snapshot?.identifiant ||
                snapshot?.tva ||
                snapshot?.nif
            );
            const targetIndex = clientSavedModalState.items.findIndex((entry) => {
              const entryEntityType = normalizeSavedModalEntityType(
                entry?.entityType || clientSavedModalEntityType
              );
              if (entryEntityType !== expectedEntityType) return false;
              if (nextPath) {
                const entryPath = resolveSavedModalEntryPath(entry);
                if (entryPath && entryPath === nextPath) return true;
              }
              const entryName = normalizeSavedModalMatchValue(entry?.name || entry?.client?.name);
              if (!entryName || !normalizedName || entryName !== normalizedName) return false;
              if (!normalizedVat) return true;
              const entryVat = normalizeSavedModalMatchValue(
                entry?.vat ||
                  entry?.mf ||
                  entry?.client?.vat ||
                  entry?.client?.mf ||
                  entry?.identifiantFiscal ||
                  entry?.identifiant ||
                  entry?.tva ||
                  entry?.nif
              );
              return !entryVat || entryVat === normalizedVat;
            });
            if (targetIndex < 0) return false;
            const current = clientSavedModalState.items[targetIndex] || {};
            const currentClient = current.client && typeof current.client === "object" ? current.client : {};
            const mergedClient = { ...currentClient, ...snapshot };
            if (nextPath) mergedClient.__path = nextPath;
            const mergedEntry = ensureClientSearchResultTaxesSafe({
              ...current,
              ...snapshot,
              entityType: expectedEntityType,
              client: mergedClient
            });
            if (nextPath) {
              mergedEntry.path = nextPath;
              mergedEntry.clientPath = nextPath;
              mergedEntry.__path = nextPath;
            }
            clientSavedModalState.items[targetIndex] = mergedEntry;
            return true;
          };
          const refreshClientSavedModalAfterExternalMutation = async (detail = {}) => {
            if (!isClientSavedModalOpen()) return;
            const modalEntityType = normalizeSavedModalEntityType(
              resolveClientEntityType(clientSavedModal) || clientSavedModalEntityType
            );
            const eventEntityType = normalizeSavedModalEntityType(
              detail?.entityType || modalEntityType
            );
            if (eventEntityType !== modalEntityType) return;
            if (clientSavedModalState?.loading) {
              const retryCount = Number(detail?.__refreshRetry || 0);
              if (retryCount < 3) {
                setTimeout(() => {
                  refreshClientSavedModalAfterExternalMutation({
                    ...detail,
                    __refreshRetry: retryCount + 1
                  }).catch((err) => {
                    console.error("client saved modal external refresh retry", err);
                  });
                }, 120);
              }
              return;
            }
            const listEl =
              clientSavedModal?.querySelector?.("#clientSavedModalList") ||
              document.getElementById("clientSavedModalList");
            const previousScrollTop = listEl && Number.isFinite(listEl.scrollTop) ? listEl.scrollTop : 0;
            const patched = patchClientSavedModalEntryFromMutation(detail);
            if (patched) {
              renderClientSavedModal();
              if (listEl && Number.isFinite(previousScrollTop)) {
                listEl.scrollTop = previousScrollTop;
              }
            }
            clientSavedModalState.query = (clientSavedSearchInput?.value || "").trim();
            const targetPage = Math.max(1, Number(clientSavedModalState.page) || 1);
            await fetchSavedClientsPage(targetPage);
            if (listEl && Number.isFinite(previousScrollTop)) {
              listEl.scrollTop = previousScrollTop;
            }
          };
          if (!SEM._clientSavedModalEntityUpdatedHandler) {
            SEM._clientSavedModalEntityUpdatedHandler = (evt) => {
              refreshClientSavedModalAfterExternalMutation(evt?.detail || {}).catch((err) => {
                console.error("client saved modal external refresh", err);
              });
            };
            w.addEventListener(
              "client-saved-modal-entity-updated",
              SEM._clientSavedModalEntityUpdatedHandler
            );
          }

          renderArticleSavedModal = () => {
            if (!articleSavedModalList) return;
            const { loading, message } = articleSavedModalState;
            const isArticleSavedMainscreenScope =
              normalizeAddFormScope(articleSavedModalFormScope)?.id === "addItemBoxMainscreen";
            const total = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items.length : 0;
            const totalPages = getArticleSavedModalTotalPages();
            const hasPages = total > 0;
            const safePage = hasPages ? Math.min(Math.max(1, articleSavedModalState.page), totalPages) : 1;
            articleSavedModalState.page = safePage;
            articleSavedModalList.innerHTML = "";

            if (loading) {
              const loadingEl = document.createElement("div");
              loadingEl.className = "client-saved-modal__empty article-saved-modal__empty";
              loadingEl.textContent = "Chargement des articles...";
              articleSavedModalList.appendChild(loadingEl);
            } else if (!total) {
              const emptyEl = document.createElement("div");
              emptyEl.className = "client-saved-modal__empty article-saved-modal__empty";
              emptyEl.textContent = "Aucun article enregistré.";
              articleSavedModalList.appendChild(emptyEl);
            } else {
              const startIndex = (safePage - 1) * ARTICLE_SAVED_PAGE_SIZE;
              const pageItems = articleSavedModalState.items.slice(startIndex, startIndex + ARTICLE_SAVED_PAGE_SIZE);
              pageItems.forEach((item, idx) => {
                const actualIndex = startIndex + idx;
                const row = document.createElement("div");
                row.className = "client-search__option article-saved-item";
                row.dataset.articleSavedIndex = String(actualIndex);
                const article = item.article || {};
                const title =
                  article.product?.trim() ||
                  article.desc?.trim() ||
                  article.ref?.trim() ||
                  item.name ||
                  "Article";
                const priceValue = Number(article.price);
                const tvaValue = Number(article.tva);
                const stockQtyValue = Number(article.stockQty);
                const stockMinValue = Number(article.stockMin ?? article.stock_min);
                const stockAlertRaw = article.stockAlert ?? article.stock_alert ?? article.stockMinAlert;
                const hasPrice = Number.isFinite(priceValue) && priceValue >= 0;
                const hasTva = Number.isFinite(tvaValue) && tvaValue >= 0;
                const hasStockQty = Number.isFinite(stockQtyValue) && stockQtyValue >= 0;
                const hasStockMin = Number.isFinite(stockMinValue) && stockMinValue >= 0;
                const stockQtyNormalized = hasStockQty ? normalizeStockQtyValue(stockQtyValue) : 0;
                const stockQtyData = hasStockQty ? String(stockQtyNormalized) : "";
                const stockMinNormalized = hasStockMin ? Math.round(stockMinValue) : 1;
                const stockAlertActive = stockAlertRaw !== undefined ? !!stockAlertRaw : false;
                const { level: stockMeterLevel, state: stockMeterState } = resolveStockMeterState(
                  hasStockQty ? stockQtyNormalized : Number.NaN,
                  stockMinNormalized,
                  stockAlertActive
                );
              const resolveFodec = (src = {}) => {
                const f = src.fodec && typeof src.fodec === "object" ? src.fodec : {};
                const rate = Number(
                  f.rate ?? src.fodecRate ?? src.fodec_rate ?? src.fodec_rate_pct ?? src.fodecRatePct
                );
                const tva = Number(f.tva ?? src.fodecTva ?? src.fodec_tva ?? src.fodecTvaPct ?? src.fodec_tva_pct);
                const enabledFlag = f.enabled ?? src.fodecEnabled ?? src.fodec_enabled;
                const hasValue = (Number.isFinite(rate) && Math.abs(rate) > 0) || (Number.isFinite(tva) && Math.abs(tva) > 0);
                const enabled = enabledFlag !== undefined ? !!enabledFlag : hasValue;
                return { rate, tva, enabled, hasValue };
              };
              const fodecResolved = resolveFodec(article);
              const fodecRateValue = fodecResolved.rate;
              const fodecTvaValue = fodecResolved.tva;
              const hasFodecEnabled = fodecResolved.enabled;
              const totalTtcValue = (() => {
                if (!hasPrice) return null;
                const tax = hasTva ? priceValue * (tvaValue / 100) : 0;
                const fodec = hasFodecEnabled && Number.isFinite(fodecRateValue) ? priceValue * (fodecRateValue / 100) : 0;
                const fodecTax = hasFodecEnabled && Number.isFinite(fodecTvaValue) ? fodec * (fodecTvaValue / 100) : 0;
                return priceValue + tax + fodec + fodecTax;
              })();
                const DESCRIPTION_MAX_LENGTH = 60;
                const rawDesc = typeof article.desc === "string" ? article.desc.trim() : "";
                const truncatedDesc =
                  rawDesc && rawDesc.length > DESCRIPTION_MAX_LENGTH
                    ? `${rawDesc.slice(0, DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`
                    : rawDesc;
                const formatValue = (value) => {
                  const hasContent = value !== undefined && value !== null && String(value).trim() !== "";
                  if (!hasContent) return '<span class="client-search__empty">N.R.</span>';
                  return escapeHTML(String(value).trim());
                };
                const formatPriceValue = (value) => {
                  if (!Number.isFinite(value) || value < 0) return '<span class="client-search__empty">N.R.</span>';
                  return escapeHTML(value.toFixed(2));
                };
                const formatStockValue = (value) => {
                  if (!Number.isFinite(value) || value < 0) return '<span class="client-search__empty">N.R.</span>';
                  const normalized = normalizeStockQtyValue(value);
                  const str = normalized.toFixed(3).replace(/\.?0+$/, "");
                  return escapeHTML(str);
                };
                const formatTvaValue = (value) => {
                  if (!Number.isFinite(value) || value < 0) return '<span class="client-search__empty">N.R.</span>';
                  const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
                  return escapeHTML(`${formatted}%`);
                };
              const formatFodecValue = (value, enabled) => {
                if (!enabled) return '<span class="client-search__empty">N.R.</span>';
                return formatTvaValue(value);
              };
                const showAddButton =
                  articleSavedModalAllowAddAction &&
                  (!isArticleSavedMainscreenScope || articleSavedModalForceAddActionForMainscreenScope);
                const actionButtons = [];
                if (showAddButton) {
                  actionButtons.push(
                    `<button type="button" class="client-search__add" data-article-add="${actualIndex}">Ajouter</button>`
                  );
                }
                actionButtons.push(
                  `<button type="button" class="client-search__edit" data-article-saved-load="${actualIndex}">Mettre a jour</button>`
                );
                actionButtons.push(
                  `<button type="button" class="client-search__delete" data-article-saved-delete="${actualIndex}">Supprimer</button>`
                );
                row.innerHTML = `
                  <div class="article-saved-modal__row article-saved-modal__content">
                    <div class="article-saved-modal__left">
                      <button type="button" class="client-search__select client-search__select--detailed" data-article-saved-load="${actualIndex}">
                          <div class="client-search__details-grid">
                          <div class="client-search__details-row client-search__details-row--metrics client-search__details-row--name">
                            <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                              <span class="client-search__detail-label">Désignation :</span>
                              <span class="client-search__detail-value">${formatValue(title)}</span>
                            </div>
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">R\u00E9f. :</span>
                              <span class="client-search__detail-value">${formatValue(article.ref)}</span>
                            </div>
                          </div>
                          <div class="client-search__detail client-search__detail--inline client-search__detail--full client-search__detail--description">
                            <span class="client-search__detail-label">Description :</span>
                            <span class="client-search__detail-value">${formatValue(truncatedDesc)}</span>
                          </div>
                        <div class="client-search__details-row client-search__details-row--metrics">
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">TVA :</span>
                              <span class="client-search__detail-value">${formatTvaValue(tvaValue)}</span>
                            </div>
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">Taux FODEC :</span>
                              <span class="client-search__detail-value">${formatFodecValue(fodecRateValue, hasFodecEnabled)}</span>
                            </div>
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">FODEC TVA :</span>
                              <span class="client-search__detail-value">${formatFodecValue(fodecTvaValue, hasFodecEnabled)}</span>
                            </div>
                          </div>
                          <div class="client-search__details-row client-search__details-row--metrics">
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">P.U. HT :</span>
                              <span class="client-search__detail-value">${formatPriceValue(priceValue)}</span>
                            </div>
                            <div class="client-search__detail client-search__detail--inline">
                              <span class="client-search__detail-label">PRIX UNITAIRE TTC :</span>
                              <span class="client-search__detail-value">${formatPriceValue(totalTtcValue)}</span>
                            </div>
                          </div>
                      </div>
                    </button>
                  </div>
                  <div class="article-saved-modal__item-actions article-saved-modal__actions">
                    ${actionButtons.join("\n                  ")}
                  </div>
                  <div class="article-saved-modal__stock-side">
                    <div class="article-saved-modal__stock-top">
                      <span
                        class="client-search__select-handle"
                        role="meter"
                        aria-label="Niveau de stock"
                        aria-valuemin="0"
                        aria-valuemax="${STOCK_METER_MAX_LEVEL}"
                        aria-valuenow="${stockMeterLevel}"
                        data-stock-level="${stockMeterLevel}"
                        data-stock-state="${stockMeterState}"
                        data-stock-qty="${stockQtyData}"
                      >
                        <span class="sr-only">Stock level ${stockMeterLevel} of ${STOCK_METER_MAX_LEVEL}</span>
                      </span>
                      <span class="client-search__stock-badge" data-stock-state="${stockMeterState}">
                        <span class="client-search__stock-badge-label">Stock</span>
                        <span class="client-search__stock-badge-value" data-stock-qty-value="${stockQtyData}">
                          ${formatStockValue(stockQtyValue)}
                        </span>
                      </span>
                      <div class="article-saved-modal__stock-controls article-saved-modal__stock-actions">
                        <div class="client-search__stock-min" data-stock-min-active="${stockAlertActive ? "true" : "false"}">
                          <label class="client-search__stock-field client-search__stock-field--toggle">
                            <input
                              type="checkbox"
                              class="client-search__stock-toggle"
                              data-stock-min-toggle
                              ${stockAlertActive ? "checked" : ""}
                            />
                            <span class="client-search__stock-label">Alerte stock</span>
                          </label>
                          <label class="client-search__stock-field">
                            <span class="client-search__stock-label">Stock min.</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputmode="numeric"
                              class="client-search__stock-input"
                              data-stock-min-input
                              value="${stockMinNormalized}"
                              ${stockAlertActive ? "" : "disabled"}
                            />
                          </label>
                        </div>
                        <div class="client-search__stock-qty-stepper">
                          <label class="client-search__stock-field">
                            <span class="client-search__stock-label">Quantite</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputmode="numeric"
                              class="client-search__stock-input client-search__stock-input--delta"
                              data-stock-qty-delta
                              value="0"
                            />
                          </label>
                          <div class="client-search__qty-buttons">
                            <button type="button" class="client-search__addSTK client-search__qty-btn client-search__qty-btn--add" data-stock-qty-inc>Ajouter au stock</button>
                            <button type="button" class="client-search__edit client-search__qty-btn client-search__qty-btn--remove" data-stock-qty-dec>Retirer du stock</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>`;
                articleSavedModalList.appendChild(row);
              });
              refreshStockMeters(articleSavedModalList);
            }

            if (articleSavedModalPage) {
              articleSavedModalPage.setAttribute("aria-label", `Page ${safePage} sur ${totalPages}`);
            }
            if (articleSavedModalTotalPages) {
              articleSavedModalTotalPages.textContent = String(totalPages);
            }
            if (articleSavedModalPageInput) {
              articleSavedModalPageInput.disabled = !hasPages;
              articleSavedModalPageInput.min = hasPages ? "1" : "0";
              articleSavedModalPageInput.max = String(totalPages);
              articleSavedModalPageInput.value = hasPages ? String(safePage) : "";
              articleSavedModalPageInput.setAttribute("aria-valuemin", hasPages ? "1" : "0");
              articleSavedModalPageInput.setAttribute("aria-valuemax", String(totalPages));
              articleSavedModalPageInput.setAttribute("aria-valuenow", hasPages ? String(safePage) : "0");
            } else if (articleSavedModalPage) {
              if (hasPages) {
                articleSavedModalPage.textContent = `Page ${safePage} / ${totalPages}`;
              } else {
                articleSavedModalPage.textContent = "Page 1 / 1";
              }
            }

            let statusText = "";
            if (loading) {
              statusText = "Chargement des articles...";
            } else if (message) {
              statusText = message;
            } else if (total) {
              const start = (articleSavedModalState.page - 1) * ARTICLE_SAVED_PAGE_SIZE + 1;
              const end = Math.min(total, start + ARTICLE_SAVED_PAGE_SIZE - 1);
              statusText = `Affichage ${start}–${end} sur ${total} article${total > 1 ? "s" : ""}`;
            } else {
              statusText = "Aucun article enregistré pour le moment.";
            }
            if (articleSavedModalStatus) articleSavedModalStatus.textContent = statusText;

            const totalPagesFinal = total ? Math.max(1, Math.ceil(total / ARTICLE_SAVED_PAGE_SIZE)) : 1;
            const disablePrev = loading || !total || articleSavedModalState.page <= 1;
            const disableNext = loading || !total || articleSavedModalState.page >= totalPagesFinal;
            if (articleSavedModalPrev) articleSavedModalPrev.disabled = disablePrev;
            if (articleSavedModalNext) articleSavedModalNext.disabled = disableNext;
            if (articleSavedModalCloseFooter) articleSavedModalCloseFooter.disabled = false;
          };

          fetchArticleSavedModalData = async () => {
            if (!articleSavedModalList) return;
            const requestId = ++articleSavedModalRequestId;
            setArticleSavedRefreshBusy(true);
            articleSavedModalState.loading = true;
            articleSavedModalState.message = "";
            renderArticleSavedModal();

            const trimmedQuery = (articleSavedModalState.query || "").trim();
            if (trimmedQuery && trimmedQuery.length < ARTICLE_SAVED_MIN_SEARCH_LENGTH) {
              articleSavedModalState.loading = false;
              articleSavedModalState.items = [];
              articleSavedModalState.message = `Tapez au moins ${ARTICLE_SAVED_MIN_SEARCH_LENGTH} caracteres.`;
              articleSavedModalState.page = 1;
              renderArticleSavedModal();
              setArticleSavedRefreshBusy(false);
              return;
            }

            if (!window.electronAPI?.searchArticles) {
              if (requestId !== articleSavedModalRequestId) return;
              articleSavedModalState.loading = false;
              articleSavedModalState.items = [];
              articleSavedModalState.message = "Recherche d'articles indisponible.";
              renderArticleSavedModal();
              setArticleSavedRefreshBusy(false);
              return;
            }

            try {
              const res = await window.electronAPI.searchArticles({
                query: trimmedQuery
              });
              if (requestId !== articleSavedModalRequestId) return;
              if (!res?.ok) {
                articleSavedModalState.items = [];
                articleSavedModalState.message = res?.error || "Chargement impossible.";
                articleSavedModalState.page = 1;
              } else {
                articleSavedModalState.items = Array.isArray(res.results) ? res.results : [];
                articleSavedModalState.message = "";
                articleSavedModalState.page = 1;
              }
            } catch (err) {
              console.error("article saved modal fetch", err);
              if (requestId !== articleSavedModalRequestId) return;
              articleSavedModalState.items = [];
              articleSavedModalState.message = "Chargement impossible.";
              articleSavedModalState.page = 1;
            } finally {
              if (requestId !== articleSavedModalRequestId) return;
              articleSavedModalState.loading = false;
              renderArticleSavedModal();
              setArticleSavedRefreshBusy(false);
            }
          };

          triggerArticleSavedSearch = () => {
            articleSavedModalState.query = (articleSavedSearchInput?.value || "").trim();
            articleSavedModalState.page = 1;
            fetchArticleSavedModalData();
          };

          applyArticleSavedModalPageInput = () => {
            if (!articleSavedModalPageInput || articleSavedModalState.loading) return;
            const rawValue = String(articleSavedModalPageInput.value || "").trim();
            if (!rawValue) {
              articleSavedModalPageInput.value = String(articleSavedModalState.page);
              return;
            }
            const requested = Number(rawValue);
            if (!Number.isFinite(requested)) {
              articleSavedModalPageInput.value = String(articleSavedModalState.page);
              return;
            }
            const total = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items.length : 0;
            const totalPages = total ? Math.max(1, Math.ceil(total / ARTICLE_SAVED_PAGE_SIZE)) : 1;
            const targetPage = Math.min(Math.max(1, requested), totalPages);
            if (targetPage !== articleSavedModalState.page) {
              articleSavedModalState.page = targetPage;
              renderArticleSavedModal();
            } else {
              articleSavedModalPageInput.value = String(articleSavedModalState.page);
            }
          };

          onArticleSavedModalKeyDown = (evt) => {
            if (evt.key === "Escape") {
              evt.preventDefault();
              closeArticleSavedModal();
            }
          };

          syncArticleSavedModalTriggers = (expanded, activeBtn = null) => {
            articleSavedListBtns.forEach((triggerBtn) => {
              if (!triggerBtn) return;
              const isActive = !!expanded && !!activeBtn && triggerBtn === activeBtn;
              triggerBtn.setAttribute("aria-expanded", isActive ? "true" : "false");
            });
          };

          openArticleSavedModal = ({ formScope = null, trigger = null } = {}) => {
            if (!articleSavedModal) return;
            const scope = resolveAddFormScope(formScope || articleSavedModalFormScope);
            if (scope) setActiveAddFormScope(scope);
            setDocOptionsCollapsed(true);
            syncArticleSavedModalTriggers(true, trigger);
            articleSavedModalRestoreFocus =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            articleSavedModal.hidden = false;
            articleSavedModal.removeAttribute("hidden");
            articleSavedModal.setAttribute("aria-hidden", "false");
            articleSavedModal.classList.add("is-open");
            document.addEventListener("keydown", onArticleSavedModalKeyDown);
            articleSavedModalState.query = (articleSavedSearchInput?.value || "").trim();
            articleSavedModalState.page = 1;
            renderArticleSavedModal();
            fetchArticleSavedModalData();
          };

          isArticleSavedModalOpen = () =>
            !!(
              articleSavedModal &&
              articleSavedModal.classList.contains("is-open") &&
              articleSavedModal.getAttribute("aria-hidden") === "false"
            );

          closeArticleSavedModal = function closeArticleSavedModal() {
            if (!articleSavedModal) return;
            clearTimeout(articleSavedSearchTimer);
            articleSavedSearchTimer = null;
            articleSavedModalRequestId += 1;
            if (articleSavedSearchInput) {
              articleSavedSearchInput.value = "";
            }
            articleSavedModalState.query = "";
            articleSavedModalState.page = 1;
            articleSavedModalState.items = [];
            articleSavedModalState.loading = false;
            articleSavedModalState.message = "";
            renderArticleSavedModal();
            fetchArticleSavedModalData();
            syncArticleSavedModalTriggers(false);
            articleSavedModal.classList.remove("is-open");
            articleSavedModal.hidden = true;
            articleSavedModal.setAttribute("hidden", "");
            articleSavedModal.setAttribute("aria-hidden", "true");
            setDocOptionsCollapsed(false);
            const articleFormPopover = getEl("articleFormPopover");
            const wasArticleFormOpen = articleFormPopover && !articleFormPopover.hidden;
            if (articleFormPopover) {
              articleFormPopover.classList.remove("is-open");
              articleFormPopover.hidden = true;
              articleFormPopover.setAttribute("hidden", "");
              articleFormPopover.setAttribute("aria-hidden", "true");
              SEM.setArticlePopoverSelectedRecord?.(articleFormPopover, null);
            }
            document
              .querySelectorAll("#articleFormToggleBtn, #articleCreateBtn")
              .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
            if (wasArticleFormOpen && typeof SEM.setActiveAddFormScope === "function") {
              SEM.setActiveAddFormScope(articleFormPopoverPrevScope);
              articleFormPopoverPrevScope = null;
            }
            articleSavedModalFormScope = null;
            articleSavedModalFormScopeId = null;
            articleSavedModalForceAddActionForMainscreenScope = false;
            document.removeEventListener("keydown", onArticleSavedModalKeyDown);
            if (articleSavedModalRestoreFocus && typeof articleSavedModalRestoreFocus.focus === "function") {
              try {
                articleSavedModalRestoreFocus.focus();
              } catch {}
            }
          }

          articleSavedListBtns.forEach((btn) => {
            if (!btn || !articleSavedModal) return;
            btn.addEventListener("click", () => {
              const isHeaderTrigger = btn.id === "btnAddArticleMenu";
              const isItemsDocOptionsToggleTrigger =
                btn.id === "articleSavedListToggleBtn" &&
                (!!btn.closest("#itemsDocOptionsModal") || isItemsDocOptionsModalOpen());
              articleSavedModalAllowAddAction = !isHeaderTrigger;
              articleSavedModalForceAddActionForMainscreenScope = isItemsDocOptionsToggleTrigger;
              const scope = isHeaderTrigger
                ? document.getElementById("addItemBox") ||
                  document.getElementById("addItemBoxMainscreen") ||
                  resolveAddFormScope(btn)
                : resolveAddFormScope(btn);
              articleSavedModalFormScope = scope || null;
              articleSavedModalFormScopeId = scope?.id || null;
              if (scope) setActiveAddFormScope(scope);
              if (!isArticleSavedModalOpen()) {
                openArticleSavedModal({ formScope: scope, trigger: btn });
                return;
              }
              syncArticleSavedModalTriggers(true, btn);
              clearTimeout(articleSavedSearchTimer);
              articleSavedModalState.query = (articleSavedSearchInput?.value || "").trim();
              fetchArticleSavedModalData();
            });
          });
          articleSavedModalClose?.addEventListener("click", closeArticleSavedModal);
          if (articleSavedModal) {
            articleSavedModal.addEventListener("click", (evt) => {
              if (evt.target === articleSavedModal) evt.stopPropagation();
            });
          }
          articleSavedModalRefresh?.addEventListener("click", () => {
            if (articleSavedModalState.loading) return;
            clearTimeout(articleSavedSearchTimer);
            articleSavedModalState.query = (articleSavedSearchInput?.value || "").trim();
            fetchArticleSavedModalData();
          });
          articleSavedModalPrev?.addEventListener("click", () => {
            if (articleSavedModalState.loading) return;
            if (articleSavedModalState.page <= 1) return;
            articleSavedModalState.page -= 1;
            renderArticleSavedModal();
          });
          articleSavedModalNext?.addEventListener("click", () => {
            if (articleSavedModalState.loading) return;
            const total = Array.isArray(articleSavedModalState.items) ? articleSavedModalState.items.length : 0;
            if (!total) return;
            const totalPages = Math.max(1, Math.ceil(total / ARTICLE_SAVED_PAGE_SIZE));
            if (articleSavedModalState.page >= totalPages) return;
            articleSavedModalState.page += 1;
            renderArticleSavedModal();
          });
          articleSavedModalPageInput?.addEventListener("focus", (evt) => {
            if (evt?.target?.select) {
              try {
                evt.target.select();
              } catch {}
            }
          });
          articleSavedModalPageInput?.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") {
              evt.preventDefault();
              applyArticleSavedModalPageInput();
            } else if (evt.key === "Escape") {
              articleSavedModalPageInput.value = String(articleSavedModalState.page);
              articleSavedModalPageInput.blur();
            }
          });
          articleSavedModalPageInput?.addEventListener("blur", applyArticleSavedModalPageInput);
          articleSavedModalCloseFooter?.addEventListener("click", () => {
            closeArticleSavedModal();
          });
          if (articleSavedSearchInput) {
            articleSavedSearchInput.addEventListener("input", (evt) => {
              const value = evt.target.value || "";
              articleSavedModalState.query = value.trim();
              articleSavedModalState.page = 1;
              clearTimeout(articleSavedSearchTimer);
              articleSavedSearchTimer = setTimeout(() => {
                fetchArticleSavedModalData();
              }, 240);
            });
            articleSavedSearchInput.addEventListener("keydown", (evt) => {
              if (evt.key === "Enter") {
                evt.preventDefault();
                clearTimeout(articleSavedSearchTimer);
                triggerArticleSavedSearch();
              }
            });
          }
          if (articleSavedSearchButton) {
            articleSavedSearchButton.addEventListener("click", () => {
              clearTimeout(articleSavedSearchTimer);
              triggerArticleSavedSearch();
            });
          }
          if (articleSavedModalList) {
            articleSavedModalList.addEventListener("click", async (evt) => {
              const stockIncBtn = evt.target.closest("[data-stock-qty-inc]");
              const stockDecBtn = evt.target.closest("[data-stock-qty-dec]");
              if (stockIncBtn || stockDecBtn) {
                const option = (stockIncBtn || stockDecBtn).closest(".client-search__option");
                if (!option) return;
                const delta = getStockDeltaValue(option);
                if (!delta) return;
                const currentRaw =
                  option.querySelector("[data-stock-qty-value]")?.dataset.stockQtyValue ??
                  option.querySelector(".client-search__select-handle")?.dataset.stockQty ??
                  "0";
                const currentQty = normalizeStockQtyValue(currentRaw);
                const nextQty = stockDecBtn ? Math.max(0, currentQty - delta) : currentQty + delta;
                setOptionStockQty(option, nextQty);
                updateStockMeterHandle(option);
                await persistStockQty(option, nextQty);
                return;
              }
              const addBtn = evt.target.closest("[data-article-add]");
              if (addBtn) {
                if (addBtn.disabled) return;
                const idx = Number(addBtn.dataset.articleAdd);
                const selected = articleSavedModalState.items[idx];
                if (!selected) return;
                addArticleToItems(selected.article || {}, { path: selected.path });
                return;
              }
              const loadBtn = evt.target.closest("[data-article-saved-load]");
              if (loadBtn) {
                const idx = Number(loadBtn.dataset.articleSavedLoad);
                const selected = articleSavedModalState.items[idx];
                if (!selected) return;
                const isEditAction = loadBtn.classList?.contains("client-search__edit");
                const isSelectAction = loadBtn.classList?.contains("client-search__select");
                if (
                  isEditAction &&
                  openArticleRecordInPopover(loadBtn, selected, idx, {
                    mode: "edit",
                    fallbackContextEl: articleSavedModal
                  })
                ) {
                  return;
                }
                if (
                  isSelectAction &&
                  openArticleRecordInPopover(loadBtn, selected, idx, {
                    mode: "view",
                    fallbackContextEl: articleSavedModal
                  })
                ) {
                  return;
                }
                const scope = articleSavedModalFormScopeId
                  ? normalizeAddFormScope(articleSavedModalFormScope) ||
                    normalizeAddFormScope(document.getElementById(articleSavedModalFormScopeId))
                  : resolveAddFormScope(articleSavedModalFormScope);
                if (articleSavedModalFormScopeId && (!scope || scope.id !== articleSavedModalFormScopeId)) {
                  return;
                }
                const isMainscreenScope = scope?.id === "addItemBoxMainscreen";
                if (scope) setActiveAddFormScope(scope);
                if (isSelectAction) {
                  if (isMainscreenScope) {
                    loadArticleRecordIntoForm(selected, { formScope: scope });
                  } else {
                    addArticleToItems(selected.article || {}, { path: selected.path });
                  }
                } else {
                  loadArticleRecordIntoForm(selected, { formScope: scope });
                }
                closeArticleSavedModal();
                return;
              }
              const deleteBtn = evt.target.closest("[data-article-saved-delete]");
              if (deleteBtn) {
                const idx = Number(deleteBtn.dataset.articleSavedDelete);
                const selected = articleSavedModalState.items[idx];
                if (!selected) return;
                const label = selected.article?.product || selected.article?.ref || selected.name || "";
                const confirmed = await showConfirm(
                  `Supprimer l'article${label ? ` "${label}"` : ""} ?`,
                  {
                    title: "Supprimer l'article",
                    okText: "Supprimer",
                    cancelText: "Annuler"
                  }
                );
                if (!confirmed) return;
                if (!window.electronAPI?.deleteArticle) {
                  const articleDeleteUnavailable = getMessage("ARTICLE_DELETE_UNAVAILABLE");
                  await showDialog?.(articleDeleteUnavailable.text, { title: articleDeleteUnavailable.title });
                  return;
                }
                try {
                  const res = await window.electronAPI.deleteArticle({ path: selected.path });
                  if (!res?.ok) {
                    const deleteError = getMessage("DELETE_FAILED");
                    await showDialog?.(res?.error || deleteError.text, { title: deleteError.title });
                    return;
                  }
                  articleSavedModalState.items.splice(idx, 1);
                  const total = articleSavedModalState.items.length;
                  const totalPages = total ? Math.max(1, Math.ceil(total / ARTICLE_SAVED_PAGE_SIZE)) : 1;
                  if (articleSavedModalState.page > totalPages) {
                    articleSavedModalState.page = totalPages;
                  }
                  renderArticleSavedModal();
                  requestStockAlertRefresh({ immediate: true });
                } catch (err) {
                  console.error("article saved delete", err);
                  const deleteError = getMessage("DELETE_FAILED");
                  await showDialog?.(deleteError.text, { title: deleteError.title });
                }
              }
            });
            articleSavedModalList.addEventListener("change", (evt) => {
              handleArticleSearchResultsChange(evt, articleSavedModalList);
            });
            articleSavedModalList.addEventListener("input", (evt) => {
              handleArticleSearchResultsInput(evt, articleSavedModalList);
            });
          }

          handleArticleSearchInput = (inputEl, resultsEl) => {
            if (!inputEl) return;
            const value = inputEl.value || "";
            clearTimeout(articleSearchTimer);
            if (!value.trim()) {
              articleSearchData = [];
              hideArticleSearchResults(resultsEl);
              return;
            }
            articleSearchTimer = setTimeout(() => performArticleSearch(value, { resultsEl }), 220);
          };

          handleArticleSearchFocus = (inputEl, resultsEl) => {
            if (!inputEl) return;
            const value = inputEl.value || "";
            if (articleSearchData.length) {
              renderArticleSearchResults(articleSearchData, value.trim(), resultsEl);
            } else if (!value.trim()) {
              hideArticleSearchResults(resultsEl);
            }
          };

          handleArticleSearchKeydown = (evt, inputEl, resultsEl) => {
            if (!inputEl || evt.key !== "Enter") return;
            evt.preventDefault();
            performArticleSearch(inputEl.value, { resultsEl });
          };

          handleArticleSearchButtonClick = (inputEl, resultsEl) => {
            performArticleSearch(inputEl?.value || "", { resultsEl });
          };

          handleArticleSearchResultsChange = (evt, resultsEl) => {
            if (!resultsEl) return;
            const toggle = evt.target.closest("[data-stock-min-toggle]");
            if (toggle) {
              toggleStockMinimumInput(toggle);
              const option = toggle.closest(".client-search__option");
              if (option) {
                const val = Number(option.querySelector("[data-stock-min-input]")?.value);
                persistStockPrefs(option, toggle.checked, val);
              }
              return;
            }
            const stockInput = evt.target.closest("[data-stock-min-input]");
            if (stockInput) {
              updateStockMeterHandle(stockInput);
              const option = stockInput.closest(".client-search__option");
              if (option) {
                persistStockPrefs(option, !!option.querySelector("[data-stock-min-toggle]")?.checked, Number(stockInput.value));
              }
            }
          };

          handleArticleSearchResultsInput = (evt, resultsEl) => {
            if (!resultsEl) return;
            const stockInput = evt.target.closest("[data-stock-min-input]");
            if (stockInput) {
              updateStockMeterHandle(stockInput);
              const option = stockInput.closest(".client-search__option");
              if (option) {
                persistStockPrefs(option, !!option.querySelector("[data-stock-min-toggle]")?.checked, Number(stockInput.value));
              }
            }
          };

          handleArticleSearchResultsClick = async (evt, inputEl, resultsEl) => {
            if (!resultsEl) return;
            const queryValue = (inputEl?.value || "").trim();
            const scope = resolveAddFormScope(resultsEl);
            const isMainscreenScope = scope?.id === "addItemBoxMainscreen";
            const pagerBtn = evt.target.closest("[data-article-page]");
            if (pagerBtn) {
              const direction = pagerBtn.getAttribute("data-article-page");
              const totalPages = Math.max(1, Math.ceil(articleSearchData.length / ARTICLE_SEARCH_PAGE_SIZE));
              if (direction === "prev" && articleSearchPage > 1) {
                articleSearchPage -= 1;
                renderArticleSearchResults(articleSearchData, queryValue, resultsEl);
              } else if (direction === "next" && articleSearchPage < totalPages) {
                articleSearchPage += 1;
                renderArticleSearchResults(articleSearchData, queryValue, resultsEl);
              }
              return;
            }

            const closeBtn = evt.target.closest("[data-article-close]");
            if (closeBtn) {
              articleSearchPage = 1;
              hideArticleSearchResults(resultsEl);
              return;
            }

            const addBtn = evt.target.closest("[data-article-add]");
            if (addBtn) {
              const idx = Number(addBtn.dataset.articleAdd);
              const selected = articleSearchData[idx];
              if (!selected) return;
              if (isMainscreenScope) {
                loadArticleRecordIntoForm(selected, { formScope: scope });
              } else {
                addArticleToItems(selected.article || {}, { path: selected.path });
                clearArticleSearchInputValue(inputEl);
              }
              return;
            }

            const deleteBtn = evt.target.closest("[data-article-delete]");
            if (deleteBtn) {
              const idx = Number(deleteBtn.dataset.articleDelete);
              const selected = articleSearchData[idx];
              if (!selected) return;
              const label = selected.name || selected.article?.product || selected.article?.ref || "";
              let confirmed = true;
              if (typeof showConfirm === "function") {
                confirmed = await showConfirm(`Supprimer l'article${label ? ` \"${label}\"` : ""} ?`, {
                  title: "Supprimer l'article",
                  okText: "Supprimer",
                  cancelText: "Annuler"
                });
              } else if (typeof window !== "undefined" && typeof window.confirm === "function") {
                confirmed = window.confirm(`Supprimer l'article${label ? ` \"${label}\"` : ""} ?`);
              }
              if (!confirmed) return;
              if (!window.electronAPI?.deleteArticle) {
                const deleteUnavailable = getMessage("DELETE_UNAVAILABLE");
                await showDialog?.(deleteUnavailable.text, { title: deleteUnavailable.title });
                return;
              }
              try {
                const res = await window.electronAPI.deleteArticle({ path: selected.path });
                if (!res?.ok) {
                  const deleteError = getMessage("DELETE_FAILED");
                  await showDialog?.(res?.error || deleteError.text, { title: deleteError.title });
                  return;
                }
                articleSearchData.splice(idx, 1);
                if (articleSearchData.length) {
                  const totalPages = Math.max(1, Math.ceil(articleSearchData.length / ARTICLE_SEARCH_PAGE_SIZE));
                  if (articleSearchPage > totalPages) articleSearchPage = totalPages;
                  renderArticleSearchResults(articleSearchData, queryValue, resultsEl);
                } else {
                  articleSearchPage = 1;
                  hideArticleSearchResults(resultsEl);
                }
              } catch (err) {
                console.error("article delete", err);
                const deleteError = getMessage("DELETE_FAILED");
                await showDialog?.(deleteError.text, { title: deleteError.title });
              }
              return;
            }

            const loadBtn = evt.target.closest("[data-article-saved-load]");
            if (loadBtn) {
              const idx = Number(loadBtn.dataset.articleSavedLoad);
              const selected = articleSearchData[idx];
              if (!selected) return;
              const isEditAction = loadBtn.classList?.contains("client-search__edit");
              const isSelectAction = loadBtn.classList?.contains("client-search__select");
              if (
                isEditAction &&
                openArticleRecordInPopover(loadBtn, selected, idx, {
                  mode: "edit",
                  fallbackContextEl: resultsEl || scope
                })
              ) {
                return;
              }
              if (
                isSelectAction &&
                openArticleRecordInPopover(loadBtn, selected, idx, {
                  mode: "view",
                  fallbackContextEl: resultsEl || scope
                })
              ) {
                return;
              }
              const targetScope = resolveAddFormScope(loadBtn) || scope;
              if (targetScope) setActiveAddFormScope(targetScope);
              loadArticleRecordIntoForm(selected, { formScope: targetScope });
              return;
            }

            const selectBtn = evt.target.closest("[data-article-apply]");
            if (!selectBtn) return;
            const idx = Number(selectBtn.dataset.articleApply);
            const selected = articleSearchData[idx];
            if (!selected) return;
            if (isMainscreenScope) {
              loadArticleRecordIntoForm(selected, { formScope: scope });
            } else {
              hideArticleSearchResults(resultsEl);
              addArticleToItems(selected.article || {}, { path: selected.path });
              clearArticleSearchInputValue(inputEl);
            }
          };

          if (articleSearchResults?.closest?.("#addItemBoxMainscreen")) {
            articleSearchResults.addEventListener("change", (evt) => {
              handleArticleSearchResultsChange(evt, articleSearchResults);
            });
            articleSearchResults.addEventListener("input", (evt) => {
              handleArticleSearchResultsInput(evt, articleSearchResults);
            });
            articleSearchResults.addEventListener("click", async (evt) => {
              await handleArticleSearchResultsClick(evt, articleSearchInput, articleSearchResults);
            });
          }

  }, { order: 800 });

  registerCoreBootstrapRuntimeSource("saved-modals-search", function (ctx) {
          handleClientSearchInput = (inputEl, resultsEl) => {
            if (!inputEl) return;
            const value = inputEl.value || "";
            const trimmed = value.trim();
            const scopeNode = resolveClientSearchScope(inputEl, resultsEl);
            const searchState = getClientSearchStateHandle({ scopeNode, inputEl, resultsEl });
            clearTimeout(searchState?.getTimer?.());
            if (trimmed.length < MIN_CLIENT_SEARCH_LENGTH) {
              searchState?.setData?.([]);
              searchState?.setPage?.(1);
              hideClientSearchResults(resultsEl);
              return;
            }
            searchState?.setTimer?.(
              setTimeout(() => performClientSearch(trimmed, { resultsEl, scopeNode, searchState }), 220)
            );
          };

          handleClientSearchFocus = (inputEl, resultsEl) => {
            if (!inputEl) return;
            const trimmed = (inputEl.value || "").trim();
            const scopeNode = resolveClientSearchScope(inputEl, resultsEl);
            const searchState = getClientSearchStateHandle({ scopeNode, inputEl, resultsEl });
            if (trimmed.length < MIN_CLIENT_SEARCH_LENGTH) {
              hideClientSearchResults(resultsEl);
              return;
            }
            const currentData = searchState?.getData?.() || [];
            if (currentData.length) {
              renderClientSearchResults(currentData, trimmed, resultsEl, { searchState });
            }
            performClientSearch(trimmed, { resultsEl, scopeNode, searchState });
          };

          handleClientSearchKeydown = (evt, inputEl, resultsEl) => {
            if (!inputEl) return;
            if (evt.key === "Escape") {
              evt.preventDefault();
              const scopeNode = resolveClientSearchScope(inputEl, resultsEl);
              resetClientSearchSession({ scopeNode, inputEl, resultsEl });
              return;
            }
            if (evt.key !== "Enter") return;
            evt.preventDefault();
            const trimmed = (inputEl.value || "").trim();
            if (trimmed.length >= MIN_CLIENT_SEARCH_LENGTH) {
              const scopeNode = resolveClientSearchScope(inputEl, resultsEl);
              const searchState = getClientSearchStateHandle({ scopeNode, inputEl, resultsEl });
              performClientSearch(trimmed, { resultsEl, scopeNode, searchState });
            }
          };

          handleClientSearchButtonClick = (inputEl, resultsEl) => {
            const trimmed = (inputEl?.value || "").trim();
            if (trimmed.length >= MIN_CLIENT_SEARCH_LENGTH) {
              const scopeNode = resolveClientSearchScope(inputEl, resultsEl);
              const searchState = getClientSearchStateHandle({ scopeNode, inputEl, resultsEl });
              performClientSearch(trimmed, { resultsEl, scopeNode, searchState });
            }
          };

          handleClientSearchResultsClick = async (evt, scopeNode, inputEl, resultsEl) => {
            if (!resultsEl) return;
            const queryValue = (inputEl?.value || "").trim();
            const resolvedScopeNode = scopeNode || resolveClientSearchScope(inputEl, resultsEl);
            const searchState = getClientSearchStateHandle({
              scopeNode: resolvedScopeNode,
              inputEl,
              resultsEl
            });
            const pageSize = resolveClientSearchPageSize(resultsEl);
            const getCurrentItems = () => searchState?.getData?.() || [];
            const getNormalizedSearchItem = (index) => {
              const idx = Math.trunc(Number(index));
              if (!Number.isFinite(idx) || idx < 0) return null;
              const currentItems = getCurrentItems();
              const current = currentItems[idx];
              if (!current) return null;
              const normalized = ensureClientSearchResultTaxes(current);
              if (normalized !== current) {
                const nextItems = [...currentItems];
                nextItems[idx] = normalized;
                searchState?.setData?.(nextItems);
              }
              return normalized;
            };
            const pagerBtn = evt.target.closest("[data-article-page]");
            if (pagerBtn) {
              const direction = pagerBtn.getAttribute("data-article-page");
              const currentItems = getCurrentItems();
              const currentPage = Math.max(1, Number(searchState?.getPage?.() || 1) || 1);
              const totalPages = Math.max(1, Math.ceil(currentItems.length / pageSize));
              if (direction === "prev" && currentPage > 1) {
                searchState?.setPage?.(currentPage - 1);
                renderClientSearchResults(currentItems, queryValue, resultsEl, { searchState });
              } else if (direction === "next" && currentPage < totalPages) {
                searchState?.setPage?.(currentPage + 1);
                renderClientSearchResults(currentItems, queryValue, resultsEl, { searchState });
              }
              return;
            }

            const closeBtn = evt.target.closest("[data-article-close]");
            if (closeBtn) {
              resetClientSearchSession({
                scopeNode: resolvedScopeNode,
                inputEl,
                resultsEl
              });
              return;
            }

            const editBtn = evt.target.closest("[data-client-edit]");
            if (editBtn) {
              const idx = Number(editBtn.dataset.clientEdit);
              const selected = getNormalizedSearchItem(idx);
              if (!selected) return;
              resetClientSearchSession({
                scopeNode: resolvedScopeNode,
                inputEl,
                resultsEl
              });
              const loadOptions = { skipReadInputs: true, skipDirtyEval: true };
              if (resolvedScopeNode) loadOptions.formScope = resolvedScopeNode;
              loadClientRecordIntoForm(selected, loadOptions);
              SEM.refreshUpdateClientButton?.(resolvedScopeNode);
              return;
            }

            const updateBtn = evt.target.closest("[data-client-saved-update]");
            if (updateBtn) {
              const idx = Number(updateBtn.dataset.clientSavedUpdate);
              const selected = getNormalizedSearchItem(idx);
              if (!selected) return;
              resetClientSearchSession({
                scopeNode: resolvedScopeNode,
                inputEl,
                resultsEl
              });
              const loadOptions = { skipReadInputs: true, skipDirtyEval: true };
              if (resolvedScopeNode) loadOptions.formScope = resolvedScopeNode;
              loadClientRecordIntoForm(selected, loadOptions);
              SEM.refreshUpdateClientButton?.(resolvedScopeNode);
              const ctx = resolvedScopeNode ? SEM.getClientFormPopoverContext?.(resolvedScopeNode) : null;
              if (ctx) {
                SEM.setClientFormPopoverMode?.(ctx, "edit");
                setTimeout(() => SEM.setClientFormPopoverOpen?.(ctx, true), 0);
              }
              return;
            }

            const deleteBtn = evt.target.closest("[data-client-delete]");
            if (deleteBtn) {
              const idx = Number(deleteBtn.dataset.clientDelete);
              const currentItems = getCurrentItems();
              const selected = getNormalizedSearchItem(idx);
              if (!selected) return;
              const label = selected.name ? ` \"${selected.name}\"` : "";
              const entityType = resolveClientEntityType(
                resolvedScopeNode || resolveClientScopeFromNode(resultsEl)
              );
              const entityLabels = getClientSavedModalLabels(entityType);
              const confirmed = await showConfirm(`Supprimer le ${entityLabels.singular}${label} ?`, {
                title: `Supprimer le ${entityLabels.singular}`,
                okText: "Supprimer",
                cancelText: "Annuler"
              });
              if (!confirmed) return;
              if (!window.electronAPI?.deleteClient) {
                const versionUnavailable = getMessage("CLIENT_DELETE_VERSION_UNAVAILABLE");
                await showDialog?.(versionUnavailable.text, { title: versionUnavailable.title });
                return;
              }
              try {
                const res = await window.electronAPI.deleteClient({ path: selected.path, entityType });
                if (!res?.ok) {
                  const deleteError = getMessage("DELETE_FAILED");
                  await showDialog?.(res?.error || deleteError.text, { title: deleteError.title });
                  return;
                }
                const nextItems = [...currentItems];
                nextItems.splice(idx, 1);
                searchState?.setData?.(nextItems);
                if (nextItems.length) {
                  const totalPages = Math.max(1, Math.ceil(nextItems.length / pageSize));
                  const currentPage = Math.max(1, Number(searchState?.getPage?.() || 1) || 1);
                  if (currentPage > totalPages) {
                    searchState?.setPage?.(totalPages);
                  }
                  renderClientSearchResults(nextItems, inputEl?.value || "", resultsEl, { searchState });
                } else {
                  searchState?.setPage?.(1);
                  hideClientSearchResults(resultsEl);
                }
                if (state().client && state().client.__path === (selected.path || "")) {
                  state().client.__path = "";
                  if (SEM.setClientFormBaseline) SEM.setClientFormBaseline(null);
                }
              } catch (err) {
                console.error(err);
                const deleteError = getMessage("DELETE_FAILED");
                await showDialog?.(deleteError.text, { title: deleteError.title });
              }
              return;
            }

            const selectBtn = evt.target.closest("[data-client-select]");
            if (!selectBtn) return;
            if (
              resultsEl?.id === "clientSearchResults" ||
              resultsEl?.id === "fournisseurSearchResults" ||
              resultsEl?.id === "transporteurSearchResults"
            ) {
              evt.preventDefault();
              return;
            }
            const idx = Number(selectBtn.dataset.clientSelect);
            const selected = getNormalizedSearchItem(idx);
            if (!selected) return;
            resetClientSearchSession({
              scopeNode: resolvedScopeNode,
              inputEl,
              resultsEl
            });
            loadClientRecordIntoForm(
              selected,
              resolvedScopeNode ? { formScope: resolvedScopeNode } : undefined
            );
          };

          if (articleSearchInput?.closest?.("#addItemBoxMainscreen")) {
            articleSearchInput.addEventListener("input", (e) => {
              handleArticleSearchInput(e.target, articleSearchResults);
            });
            articleSearchInput.addEventListener("focus", () => {
              handleArticleSearchFocus(articleSearchInput, articleSearchResults);
            });
            articleSearchInput.addEventListener("keydown", (e) => {
              handleArticleSearchKeydown(e, articleSearchInput, articleSearchResults);
            });
          }

          if (articleSearchButton?.closest?.("#addItemBoxMainscreen")) {
            articleSearchButton.addEventListener("click", () => {
              handleArticleSearchButtonClick(articleSearchInput, articleSearchResults);
            });
          }

          document.addEventListener("input", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.id !== "articleSearch") return;
            const scopeNode = target.closest("#addItemBox");
            if (!scopeNode) return;
            const resultsEl = scopeNode.querySelector("#articleSearchResults");
            handleArticleSearchInput(target, resultsEl);
          });

          document.addEventListener("focusin", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.id !== "articleSearch") return;
            const scopeNode = target.closest("#addItemBox");
            if (!scopeNode) return;
            const resultsEl = scopeNode.querySelector("#articleSearchResults");
            handleArticleSearchFocus(target, resultsEl);
          });

          document.addEventListener("keydown", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.id !== "articleSearch") return;
            const scopeNode = target.closest("#addItemBox");
            if (!scopeNode) return;
            const resultsEl = scopeNode.querySelector("#articleSearchResults");
            handleArticleSearchKeydown(evt, target, resultsEl);
          });

          document.addEventListener("click", (evt) => {
            const actionBtn = evt.target?.closest?.("#articleSearchBtn");
            if (!actionBtn) return;
            const scopeNode = actionBtn.closest("#addItemBox");
            if (!scopeNode) return;
            const inputEl = scopeNode.querySelector("#articleSearch");
            const resultsEl = scopeNode.querySelector("#articleSearchResults");
            handleArticleSearchButtonClick(inputEl, resultsEl);
          });

          document.addEventListener("change", (evt) => {
            const resultsEl = evt.target?.closest?.("#articleSearchResults");
            if (!resultsEl) return;
            const scopeNode = resultsEl.closest("#addItemBox");
            if (!scopeNode) return;
            handleArticleSearchResultsChange(evt, resultsEl);
          });

          document.addEventListener("input", (evt) => {
            const resultsEl = evt.target?.closest?.("#articleSearchResults");
            if (!resultsEl) return;
            const scopeNode = resultsEl.closest("#addItemBox");
            if (!scopeNode) return;
            handleArticleSearchResultsInput(evt, resultsEl);
          });

          document.addEventListener("click", async (evt) => {
            const resultsEl = evt.target?.closest?.("#articleSearchResults");
            if (!resultsEl) return;
            const scopeNode = resultsEl.closest("#addItemBox");
            if (!scopeNode) return;
            const inputEl = scopeNode.querySelector("#articleSearch");
            await handleArticleSearchResultsClick(evt, inputEl, resultsEl);
          });

          document.addEventListener("input", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (
              target.id !== "clientSearch" &&
              target.id !== "fournisseurSearch" &&
              target.id !== "transporteurSearch"
            ) {
              return;
            }
            const scopeNode = target.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`);
            if (!scopeNode) return;
            const resultsEl = resolveClientSearchResultsElement(scopeNode);
            handleClientSearchInput(target, resultsEl);
          });

          document.addEventListener("focusin", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (
              target.id !== "clientSearch" &&
              target.id !== "fournisseurSearch" &&
              target.id !== "transporteurSearch"
            ) {
              return;
            }
            const scopeNode = target.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`);
            if (!scopeNode) return;
            const resultsEl = resolveClientSearchResultsElement(scopeNode);
            handleClientSearchFocus(target, resultsEl);
          });

          document.addEventListener("keydown", (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (
              target.id !== "clientSearch" &&
              target.id !== "fournisseurSearch" &&
              target.id !== "transporteurSearch"
            ) {
              return;
            }
            const scopeNode = target.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`);
            if (!scopeNode) return;
            const resultsEl = resolveClientSearchResultsElement(scopeNode);
            handleClientSearchKeydown(evt, target, resultsEl);
          });

          document.addEventListener("click", (evt) => {
            const actionBtn = evt.target?.closest?.(
              "#clientSearchBtn, #fournisseurSearchBtn, #transporteurSearchBtn"
            );
            if (!actionBtn) return;
            const scopeNode = actionBtn.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`);
            if (!scopeNode) return;
            const inputEl = resolveClientSearchInputElement(scopeNode);
            const resultsEl = resolveClientSearchResultsElement(scopeNode);
            handleClientSearchButtonClick(inputEl, resultsEl);
          });

          document.addEventListener("click", async (evt) => {
            const resultsEl = evt.target?.closest?.(
              "#clientSearchResults, #fournisseurSearchResults, #transporteurSearchResults"
            );
            if (!resultsEl) return;
            const scopeNode = resultsEl.closest(`#clientBoxNewDoc, #FournisseurBoxNewDoc, ${MAIN_SCOPE_SELECTOR}`);
            if (!scopeNode) return;
            const inputEl = resolveClientSearchInputElement(scopeNode);
            await handleClientSearchResultsClick(evt, scopeNode, inputEl, resultsEl);
          });

          if (!SEM._articleSearchDocumentHandler) {
            SEM._articleSearchDocumentHandler = (evt) => {
              const target = evt.target;
              const scopes = Array.from(document.querySelectorAll(ADD_FORM_SCOPE_SELECTOR));
              if (!scopes.length) return;
              scopes.forEach((scope) => {
                const inputEl = scope.querySelector("#articleSearch");
                const resultsEl = scope.querySelector("#articleSearchResults");
                if (!inputEl || !resultsEl) return;
                if (target === inputEl) return;
                if (resultsEl.contains(target)) return;
                hideArticleSearchResults(resultsEl);
              });
            };
            document.addEventListener("click", SEM._articleSearchDocumentHandler, { capture: true });
          }

          if (!SEM._clientSearchDocumentHandler) {
            SEM._clientSearchDocumentHandler = (evt) => {
              const target = evt.target;
              const scopes = Array.from(document.querySelectorAll(CLIENT_SCOPE_SELECTOR));
              if (!scopes.length) return;
              scopes.forEach((scope) => {
                const inputEl = resolveClientSearchInputElement(scope);
                const resultsEl = resolveClientSearchResultsElement(scope);
                if (!inputEl || !resultsEl) return;
                if (target === inputEl) return;
                if (resultsEl.contains(target)) return;
                resetClientSearchSession({
                  scopeNode: scope,
                  inputEl,
                  resultsEl
                });
              });
            };
            document.addEventListener("click", SEM._clientSearchDocumentHandler, { capture: true });
          }
  }, { order: 1000 });
})(window);

