///commonEvents.js

(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const UI = () => SEM.ui;
  const F = () => SEM.forms;
  let clientFolderFallbackWarned = false;
  const shouldUseBindingsClientSave = () => w.SEM?.__clientSavePipeline === "bindings";
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  SEM.isDocumentDirty = SEM.isDocumentDirty !== undefined ? !!SEM.isDocumentDirty : false;
  SEM.markDocumentDirty = function markDocumentDirty(dirty = true) {
    SEM.isDocumentDirty = !!dirty;
  };
  if (typeof document !== "undefined" && !SEM.__documentDirtyListenerAttached) {
    document.addEventListener(
      "input",
      (event) => {
        const t = event?.target;
        if (
          t &&
          typeof t.closest === "function" &&
          (
            t.closest("#whNoteBox") ||
            t.closest("#whNoteBoxModal") ||
            t.closest('[data-footer-note-section]')
          )
        )
          return;
        SEM.markDocumentDirty?.(true);
      },
      true
    );
    SEM.__documentDirtyListenerAttached = true;
  }
  if (w.electronAPI?.onAppCloseRequest && !SEM.__closeGuardAttached) {
    w.electronAPI.onAppCloseRequest(() => {
      w.electronAPI?.approveAppClose?.();
    });
    SEM.__closeGuardAttached = true;
  }

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

  SEM.initCommon = function initCommon(platform) {
    SEM.bind?.();
    SEM.wireLiveBindings?.();
    SEM.setSubmitMode?.("add");

    UI()?.installFocusGuards?.();
  ["addPurchasePrice","addPurchaseTva","addPrice","addTva","addDiscount","addStockQty"].forEach(id =>
    UI()?.enableFirstClickSelectSecondClickCaret?.(getEl(id))
  );

    getEl("btnNew")?.addEventListener("click", async () => {
      SEM.newInvoice?.();

      const meta = SEM.state?.meta;
      if (meta) meta.number = "";

      SEM.clearAddFormAndMode?.();
      SEM.bind?.();
      if (typeof setVal === "function") setVal("invNumber", SEM.state?.meta?.number || "");

      if (SEM.setClientFormBaseline) SEM.setClientFormBaseline(null);
      if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
      SEM.markDocumentDirty?.(false);
    });
    getEl("btnOpen")?.addEventListener("click", () => { w.onOpenInvoiceClick?.(); });
    getEl("btnSave")?.addEventListener("click", async () => {
      try { w.__includeCompanyForSave = true; } catch {}
      (w.SEM?.readInputs ? w.SEM.readInputs() : w.readInputs?.());
      const payload = { data: SEM.captureForm?.({ includeCompany: true }) || null };
      await platform?.saveInvoiceJSON?.(payload);
      SEM.markDocumentDirty?.(false);
    });
    getEl("btnPDF")?.addEventListener("click", () => { w.exportCurrentPDF?.(); });
    const hookPreviewButton = (sourceId, targetId) => {
      const source = getEl(sourceId);
      if (!source) return;
      source.addEventListener("click", () => {
        const target = getEl(targetId);
        target?.click();
      });
    };
    hookPreviewButton("itemsPreviewSave", "btnSave");
    getEl("itemsPreviewPrint")?.addEventListener("click", () => {
      if (typeof w.printCurrentPDF === "function") {
        w.printCurrentPDF();
      } else {
        w.exportCurrentPDF?.();
      }
    });

    if (typeof document !== "undefined" && !SEM.__newItemHandlerWired) {
      SEM.__newItemHandlerWired = true;
      document.addEventListener("click", (event) => {
        const btn = event?.target?.closest?.("#btnNewItem");
        if (!btn) return;
        const scope = typeof btn.closest === "function"
          ? btn.closest("#addItemBoxMainscreen, #articleFormPopover")
          : null;
        if (scope && typeof SEM.setActiveAddFormScope === "function") {
          SEM.setActiveAddFormScope(scope);
        }
        SEM.clearAddFormAndMode?.();
        if (scope && (scope.id === "addItemBoxMainscreen" || scope.id === "articleFormPopover")) {
          const fodecRow = scope.querySelector("#addFodecRow");
          const fodecToggle = scope.querySelector("#addFodecEnabled");
          if (fodecRow?.dataset?.fodecActive === "true" && fodecToggle?.checked) {
            fodecToggle.checked = false;
            fodecToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const purchaseFodecRow = scope.querySelector("#addPurchaseFodecRow");
          const purchaseFodecToggle = scope.querySelector("#addPurchaseFodecEnabled");
          if (purchaseFodecRow?.dataset?.fodecActive === "true" && purchaseFodecToggle?.checked) {
            purchaseFodecToggle.checked = false;
            purchaseFodecToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        w.updateFodecAutoField?.();
      });
    }

  ["addRef","addProduct","addDesc","addUnit","addStockQty","addPurchasePrice","addPurchaseTva","addPurchaseFodecRate","addPurchaseFodecTva","addPrice","addTva","addDiscount","addFodecRate","addFodecTva"].forEach((id) => {
      const el = getEl(id);
      el?.addEventListener("keydown", (e) => { if (e.key === "Enter"){ e.preventDefault(); SEM.submitItemForm?.(); } });
      el?.addEventListener("focus", () => { try { el.select(); } catch {} });
      el?.addEventListener("click", () => { try { el.select(); } catch {} });
    });

    getEl("companyLogo")?.addEventListener("click", async () => {
      const res = await w.electronAPI?.pickLogo?.();
      if (res?.dataUrl){
        SEM.state.company.logo = res.dataUrl;
        SEM.state.company.logoPath = res.path || "";
        if (typeof SEM.updateCompanyLogoImage === "function") {
          SEM.updateCompanyLogoImage(res.dataUrl);
        } else {
          setSrc("companyLogo", res.dataUrl);
          const img = document.getElementById("companyLogo");
          if (img) {
            img.dataset.logoState = "set";
            img.classList.remove("company-logo--placeholder");
          }
        }
        SEM.saveCompanyToLocal?.();
      }
    });

    w.electronAPI?.onEnterPrintMode?.(() => { w.PDFView?.show?.(SEM.state, w.electronAPI?.assets || {}); });
    w.electronAPI?.onExitPrintMode?.(() => { w.PDFView?.hide?.(); UI().recoverFocus?.(); });

    document.querySelectorAll("input.col-toggle[data-column-key]").forEach((input) => {
      if (input.closest?.("#modelActionsModal")) return;
      if (input.closest?.(".article-fields-modal")) return;
      input.addEventListener("change", () => SEM.applyColumnHiding?.());
    });
    SEM.applyColumnHiding?.();

    const handleArticleSave = async ({ requireUpdate = false } = {}) => {
      const article = F().captureArticleFromForm();
      const hasRef = article.use?.ref && (article.ref || "").trim();
      const hasProduct = article.use?.product && (article.product || "").trim();
      const hasDesc = article.use?.desc && (article.desc || "").trim();
      if (!hasRef && !hasProduct && !hasDesc) {
        const missingItemMessage = getMessage("ARTICLE_REQUIRED_FIELDS");
        await showDialog(missingItemMessage.text, { title: missingItemMessage.title });
        return;
      }
      const editCtx = SEM.articleEditContext;
      const isUpdate = !!editCtx?.path;
      if (requireUpdate && !isUpdate) {
        const notRegistered = getMessage("ARTICLE_NOT_REGISTERED");
        await showDialog(notRegistered.text, { title: notRegistered.title });
        return;
      }
      const shouldUpdate = requireUpdate || isUpdate;
      if (shouldUpdate && !platform?.updateArticle) {
        const unavailable = getMessage("ARTICLE_UPDATE_UNAVAILABLE");
        await showDialog(unavailable.text, { title: unavailable.title });
        return;
      }
      const suggestedName = typeof F().pickSuggestedName === "function" ? F().pickSuggestedName(article) : undefined;
      const res = shouldUpdate
        ? await platform.updateArticle({ path: editCtx.path, article, suggestedName })
        : await platform?.saveArticleAuto?.({ article, suggestedName });
      if (res?.ok) {
        const resultPath = res?.path || editCtx?.path || "";
        const entryLabel = (article.product || article.ref || res?.name || "").trim();
        if (resultPath) {
          SEM.enterArticleEditContext?.({ path: resultPath, name: entryLabel });
        }
        if (shouldUpdate) {
          SEM.updateLinkedInvoiceItemsFromArticle?.(editCtx.path, article);
          const { message, options } = buildArticleDialog("ARTICLE_UPDATE_SUCCESS", res?.name);
          await showDialog(message, options);
          SEM.refreshArticleSearchResults?.();
        } else {
          const { message, options } = buildArticleDialog("ARTICLE_SAVE_SUCCESS", res?.name);
          await showDialog(message, options);
        }
        const activeScope = SEM.resolveAddFormScope?.();
        const popoverScope =
          activeScope?.id === "articleFormPopover"
            ? activeScope
            : document.querySelector("#articleFormPopover:not([hidden])");
        const shouldRefreshSaved = !!popoverScope;
        if (popoverScope) {
          popoverScope.querySelector("[data-article-form-close]")?.click?.();
        }
        if (shouldRefreshSaved) {
          const refreshBtn =
            document.querySelector("#articleSavedModal #articleSavedModalRefresh") ||
            document.getElementById("articleSavedModalRefresh");
          refreshBtn?.click?.();
        }
      } else if (res) {
          if (res?.code === "duplicate_article") {
            const duplicateDialog = buildDuplicateArticleDialog(res?.conflict || { field: res?.field, name: res?.name });
            await showDialog(duplicateDialog.message, duplicateDialog.options);
            return;
          }
          const duplicateTitle = getMessage("ARTICLE_SAVE_DUPLICATE");
          const saveFailed = getMessage("ARTICLE_SAVE_FAILED");
          const errMsg = res?.message || res?.error || saveFailed.text;
          const title = res?.code === "duplicate_article" ? duplicateTitle.title : saveFailed.title;
          await showDialog(errMsg, { title });
        }
      };

        getEl("btnSaveArticle")?.addEventListener("click", () => handleArticleSave({ requireUpdate: false }));
    getEl("btnUpdateSavedArticle")?.addEventListener("click", () => handleArticleSave({ requireUpdate: true }));
    if (!shouldUseBindingsClientSave()) getEl("btnSaveClient")?.addEventListener("click", async () => {
      if (shouldUseBindingsClientSave()) return;
      const client = F().captureClientFromForm();
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
        await showDialog(validationMessage.text, { title: validationMessage.title });
        return;
      }
      if (w.electronAPI?.ensureClientsSystemFolder) {
        try {
          const ensured = await w.electronAPI.ensureClientsSystemFolder();
          if (!ensured?.ok) {
            const folderErrorMessage = getMessage("CLIENT_FOLDER_ADMIN_ERROR");
            await showDialog(ensured?.message || folderErrorMessage.text, { title: folderErrorMessage.title });
            return;
          }
          if (ensured?.fallback && ensured?.message && !clientFolderFallbackWarned) {
            const infoMessage = getMessage("GENERIC_INFO");
            await showDialog(ensured.message, { title: infoMessage.title });
            clientFolderFallbackWarned = true;
          }
        } catch (err) {
          console.error(err);
          const genericFolderError = getMessage("CLIENT_FOLDER_GENERIC_ERROR");
          await showDialog(genericFolderError.text, { title: genericFolderError.title });
          return;
        }
      }

      const ok = await platform?.saveClient?.({ client, suggestedName: F().pickSuggestedClientName(client) });
      if (ok) {
        const successMessage = getMessage("CLIENT_SAVE_SUCCESS");
        if (typeof w.showToast === "function") {
          w.showToast(successMessage.text);
        } else {
          await showDialog(successMessage.text, { title: successMessage.title });
        }
        try {
          const snapshot =
            (typeof SEM.getClientFormSnapshot === "function"
              ? SEM.getClientFormSnapshot()
              : { ...client }) || {};
          const currentState = (SEM.state && SEM.state.client) || {};
          const fallbackPath =
            snapshot.__path ||
            currentState.__path ||
            `client-browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          snapshot.__path = fallbackPath;
          if (SEM.state && SEM.state.client) SEM.state.client.__path = snapshot.__path;
          if (typeof SEM.setClientFormBaseline === "function") {
            SEM.setClientFormBaseline(snapshot);
          } else {
            SEM.clientFormBaseline = snapshot;
            SEM.clientFormDirty = false;
            if (SEM.refreshClientActionButtons) SEM.refreshClientActionButtons();
          }
        } catch (err) {
          console.warn("client baseline update (saveClient)", err);
        }
      }
    });


  };
})(window);
