(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const buildArticleDialog = (key) => {
    const base = getMessage(key);
    const trimmedBase = base.text.replace(/\s*\.*$/, "");
    const message = `${trimmedBase}.`;
    return { message, options: { title: base.title } };
  };

  const getArticleDuplicateLabel = (field) => {
    const labels = w.APP_MESSAGE_DATA?.articleDuplicateFieldLabels || {};
    return labels[field] || labels.reference || field || "reference";
  };

  const buildDuplicateArticleDialog = (conflict = {}) => {
    const label = getArticleDuplicateLabel(conflict.field || "reference");
    const base = getMessage("ARTICLE_DUPLICATE_FOUND", { values: { fieldLabel: label } });
    const trimmedBase = base.text.replace(/\s*\.*$/, "");
    const message = `${trimmedBase}.`;
    return { message, options: { title: base.title } };
  };

  AppInit.registerRecordActions = function registerRecordActions(ctx = {}) {
    const formsApi = ctx.formsApi || ctx.forms || w.SEM?.forms || {};
    const SEM = ctx.SEM || (w.SEM = w.SEM || {});
    let clientFolderFallbackWarned = false;
    const shouldUseBindingsClientSave = () => w.SEM?.__clientSavePipeline === "bindings";

    const handleArticleSave = async ({ requireUpdate = false, trigger = null } = {}) => {
      const closeArticleFormPopoverIfOpen = () => {
        const popover =
          trigger?.closest?.("#articleFormPopover") ||
          document.querySelector("#articleFormPopover:not([hidden])");
        popover?.querySelector?.("[data-article-form-close]")?.click?.();
        return popover || null;
      };
      const isValidRowIndex = (value) => {
        if (!Number.isFinite(value) || value < 0) return false;
        const items = Array.isArray(SEM.state?.items) ? SEM.state.items : [];
        return value < items.length;
      };
      const resolveEditedItemIndex = () => {
        const selectedIdx = Number(SEM.selectedItemIndex);
        if (isValidRowIndex(selectedIdx)) return Math.trunc(selectedIdx);
        const popover =
          trigger?.closest?.("#articleFormPopover") ||
          document.querySelector("#articleFormPopover:not([hidden])");
        const popoverIdx = Number(popover?.dataset?.itemEditIndex);
        if (isValidRowIndex(popoverIdx)) return Math.trunc(popoverIdx);
        return null;
      };
      const captureScope =
        trigger?.closest?.("#addItemBox, #addItemBoxMainscreen, #articleFormPopover") ||
        SEM.resolveAddFormScope?.(trigger) ||
        document.querySelector?.("#articleFormPopover:not([hidden])");
      if (captureScope && typeof SEM.setActiveAddFormScope === "function") {
        SEM.setActiveAddFormScope(captureScope);
      }
      const article = formsApi.captureArticleFromForm?.() || {};
      const hasRef = article.use?.ref && String(article.ref || "").trim().length > 0;
      const hasProduct = article.use?.product && String(article.product || "").trim().length > 0;
      const hasDesc = article.use?.desc && String(article.desc || "").trim().length > 0;
      if (!hasRef && !hasProduct && !hasDesc) {
        const missingItemMessage = getMessage("ARTICLE_REQUIRED_FIELDS");
        await w.showDialog?.(missingItemMessage.text, { title: missingItemMessage.title });
        return;
      }
      const suggested = formsApi.pickSuggestedName?.(article) || "article";
      const editCtx = SEM.articleEditContext;
      const isUpdate = !!editCtx?.path;
      if (requireUpdate && !isUpdate) {
        const editedItemIndex = resolveEditedItemIndex();
        if (editedItemIndex !== null) {
          SEM.selectedItemIndex = editedItemIndex;
          SEM.setSubmitMode?.("update");
          const updated = await SEM.submitItemForm?.();
          if (updated !== false) {
            closeArticleFormPopoverIfOpen();
          }
          return;
        }
        const notRegistered = getMessage("ARTICLE_NOT_REGISTERED");
        await w.showDialog?.(notRegistered.text, { title: notRegistered.title });
        // Still allow updating the invoice line even if the article is not yet saved.
        await SEM.submitItemForm?.();
        return;
      }
      const shouldUpdate = requireUpdate || isUpdate;
      if (shouldUpdate && !w.electronAPI?.updateArticle) {
        const unavailable = getMessage("ARTICLE_UPDATE_UNAVAILABLE");
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }
      const lockUpdateButton = requireUpdate;
      if (lockUpdateButton && (SEM.articleUpdateInProgress || trigger?.dataset?.updateInProgress === "1")) {
        return;
      }
      if (lockUpdateButton) {
        SEM.setArticleUpdateBusyState?.(true, trigger);
      }
      try {
        let res = null;
        if (shouldUpdate) {
          res = await w.electronAPI.updateArticle({ path: editCtx.path, article, suggestedName: suggested });
        } else {
          res = await w.electronAPI?.saveArticleAuto?.({ article, suggestedName: suggested });
        }
        if (res?.ok) {
          const resultPath = res?.path || editCtx?.path || "";
          const entryLabel = (article.product || article.ref || res?.name || "").trim();
          if (resultPath) {
            SEM.enterArticleEditContext?.({ path: resultPath, name: entryLabel });
          }
          if (shouldUpdate) {
            SEM.updateLinkedInvoiceItemsFromArticle?.(editCtx.path, article);
            const { message, options } = buildArticleDialog("ARTICLE_UPDATE_SUCCESS", res?.name);
            await w.showDialog?.(message, options);
            SEM.refreshArticleSearchResults?.();
          } else {
            const { message, options } = buildArticleDialog("ARTICLE_SAVE_SUCCESS", res?.name);
            await w.showDialog?.(message, options);
          }
          const activeScope = SEM.resolveAddFormScope?.();
          const popoverScope =
            activeScope?.id === "articleFormPopover"
              ? activeScope
              : document.querySelector("#articleFormPopover:not([hidden])");
          const shouldRefreshSaved = !!popoverScope;
          if (popoverScope) {
            closeArticleFormPopoverIfOpen();
          }
          if (shouldRefreshSaved) {
            const refreshBtn =
              document.querySelector("#articleSavedModal #articleSavedModalRefresh") ||
              document.getElementById("articleSavedModalRefresh");
            refreshBtn?.click?.();
          }
        } else if (!res?.canceled) {
          if (res?.code === "duplicate_article") {
            const duplicateDialog = buildDuplicateArticleDialog(res?.conflict || { field: res?.field, name: res?.name });
            await w.showDialog?.(duplicateDialog.message, duplicateDialog.options);
            return;
          }
          const duplicateTitle = getMessage("ARTICLE_SAVE_DUPLICATE");
          const saveFailed = getMessage("ARTICLE_SAVE_FAILED");
          const errMsg = res?.message || res?.error || saveFailed.text;
          const title = res?.code === "duplicate_article" ? duplicateTitle.title : saveFailed.title;
          await w.showDialog?.(errMsg, { title });
        }
      } finally {
        if (lockUpdateButton) {
          SEM.setArticleUpdateBusyState?.(false, trigger);
        }
      }
    };
    SEM.handleArticleSave = handleArticleSave;

    if (!SEM.__articleSaveDelegated) {
      SEM.__articleSaveDelegated = true;
      document.addEventListener("click", (evt) => {
        const btn = evt.target?.closest?.("#btnSaveArticle, #btnUpdateSavedArticle");
        if (!btn) return;
        const isUpdateAction = btn.id === "btnUpdateSavedArticle";
        if (isUpdateAction && (SEM.articleUpdateInProgress || btn.dataset.updateInProgress === "1")) {
          return;
        }
        const formScope = btn.closest("#addItemBoxMainscreen, #articleFormPopover");
        if (formScope && typeof SEM.setActiveAddFormScope === "function") {
          SEM.setActiveAddFormScope(formScope);
        }
        handleArticleSave({ requireUpdate: isUpdateAction, trigger: btn });
      });
    }
    const bindLegacyClientSave = (buttonId, entityType = "client") => {
      const trigger = getEl(buttonId);
      if (!trigger || shouldUseBindingsClientSave()) return;
      trigger.addEventListener("click", async () => {
        if (shouldUseBindingsClientSave()) return;
        const client = formsApi.captureClientFromForm?.(trigger) || {};
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
          const validationMessage =
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
          await w.showDialog?.(validationMessage.text, { title: validationMessage.title });
          return;
        }
        const suggested =
          formsApi.pickSuggestedClientName?.(client) ||
          (entityType === "vendor" ? "fournisseur" : entityType === "transporter" ? "transporteur" : "client");
        if (w.electronAPI?.ensureClientsSystemFolder && w.electronAPI?.saveClientDirect) {
          const ensured = await w.electronAPI.ensureClientsSystemFolder({ entityType });
          if (!ensured?.ok) {
            const folderErrorMessage = getMessage("CLIENT_FOLDER_ADMIN_ERROR");
            await w.showDialog?.(ensured?.message || folderErrorMessage.text, { title: folderErrorMessage.title });
            return;
          }
          if (ensured?.fallback && ensured?.message && !clientFolderFallbackWarned) {
            const infoMessage = getMessage("GENERIC_INFO");
            await w.showDialog?.(ensured.message, { title: infoMessage.title });
            clientFolderFallbackWarned = true;
          }

          const normalize = (value) => String(value || "").trim().toLowerCase();
          const nameKey = normalize(client.name);
          const vatKey = normalize(
            client.vat || client.identifiantFiscal || client.identifiant || client.tva || client.nif
          );
          const cinKey = normalize(client.cin || client.passeport || client.passport);

          if (w.electronAPI?.searchClients && (nameKey || vatKey || cinKey)) {
            const queries = [nameKey, vatKey, cinKey].filter(Boolean);
            let duplicate = null;
            const seenPaths = new Set();
            for (const q of queries) {
              if (!q) continue;
              try {
                const res = await w.electronAPI.searchClients({ query: q, entityType });
                if (!res?.ok) continue;
                for (const item of res.results || []) {
                  if (seenPaths.has(item.path)) continue;
                  seenPaths.add(item.path);
                  const existing = item.client || {};
                  if (nameKey && normalize(existing.name) === nameKey) {
                    duplicate = item;
                    break;
                  }
                  const existingVat = normalize(
                    existing.vat || existing.identifiantFiscal || existing.identifiant || existing.tva || existing.nif
                  );
                  if (vatKey && existingVat && existingVat === vatKey) {
                    duplicate = item;
                    break;
                  }
                  const existingCin = normalize(existing.cin || existing.passeport || existing.passport);
                  if (cinKey && existingCin && existingCin === cinKey) {
                    duplicate = item;
                    break;
                  }
                }
                if (duplicate) break;
              } catch (err) {
                console.warn("Client search failed", err);
              }
            }

            if (duplicate) {
              const dupName = duplicate.name || duplicate.identifier || duplicate.fileName || "client existant";
              const duplicateMessage =
                entityType === "transporter"
                  ? getMessage("TRANSPORTER_DUPLICATE_FOUND", {
                      values: { dupName },
                      fallbackText: `Un transporteur avec les memes informations existe deja (${dupName}).`,
                      fallbackTitle: "Transporteur deja enregistre"
                    })
                  : getMessage("CLIENT_DUPLICATE_FOUND", { values: { dupName } });
              await w.showDialog?.(duplicateMessage.text, { title: duplicateMessage.title });
              return;
            }
          }

          const res = await w.electronAPI.saveClientDirect({ client, suggestedName: suggested, entityType });
          if (res?.ok) {
          const returnedCode = String(
            entityType === "vendor"
              ? res.codeFournisseur || res.codeClient || res.code || ""
              : entityType === "transporter"
                ? res.codeTransporteur || res.codeClient || res.code || ""
                : res.codeClient || res.code || ""
          ).trim();
          if (returnedCode) {
            const codeInputId =
              entityType === "vendor"
                ? "fournisseurCode"
                : entityType === "transporter"
                  ? "transporteurCode"
                  : "clientCode";
            const codeInput =
              trigger.closest?.("#clientFormPopover, #fournisseurFormPopover, #transporteurFormPopover")?.querySelector?.(
                `#${codeInputId}`
              ) || document.getElementById(codeInputId);
            if (codeInput) codeInput.value = returnedCode;
            if (client && typeof client === "object") {
              client.codeClient = returnedCode;
              client.codeFournisseur = entityType === "vendor" ? returnedCode : "";
              client.codeTransporteur = entityType === "transporter" ? returnedCode : "";
            }
          }
          const successMessage =
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
            if (typeof w.showToast === "function") {
              w.showToast(successMessage.text);
            } else {
              await w.showDialog?.(successMessage.text, { title: successMessage.title });
            }
            try {
              const snapshot =
                (typeof SEM.getClientFormSnapshot === "function"
                  ? SEM.getClientFormSnapshot()
                  : { ...client }) || {};
              const path = res.path || snapshot.__path || SEM.state?.client?.__path || "";
              if (returnedCode) {
                snapshot.codeClient = returnedCode;
                snapshot.codeFournisseur = entityType === "vendor" ? returnedCode : "";
                snapshot.codeTransporteur = entityType === "transporter" ? returnedCode : "";
              }
              if (path && SEM.state?.client) SEM.state.client.__path = path;
              if (path) snapshot.__path = path;
              if (typeof SEM.setClientFormBaseline === "function") {
                SEM.setClientFormBaseline(snapshot, entityType);
              }
            } catch (err) {
              console.warn("client baseline update (saveClientDirect handler)", err);
            }
          } else if (!res?.canceled) {
            const saveError =
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
            await w.showDialog?.(res?.error || saveError.text, { title: saveError.title });
          }
          return;
        }
        const featureUnavailable = getMessage("FEATURE_UNAVAILABLE");
        await w.showDialog?.(featureUnavailable.text, { title: featureUnavailable.title });
      });
    };
    bindLegacyClientSave("btnSaveClient", "client");
    bindLegacyClientSave("btnSaveFournisseur", "vendor");
    bindLegacyClientSave("btnSaveTransporteur", "transporter");
  };
})(window);
