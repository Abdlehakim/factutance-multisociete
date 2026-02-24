(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("finalize", function (ctx) {
    assignCoreValues = {
      helpers,
      state,
      getMessage,
      formatSoldClientValue,
      refreshClientSummary,
      refreshInvoiceSummary,
      setWhNoteEditorContent,
      MAIN_CLIENT_SCOPE_ID,
      MAIN_VENDOR_SCOPE_ID,
      MAIN_SCOPE_SELECTOR,
      CLIENT_SCOPE_SELECTOR,
      CLIENT_SCOPE_WITH_ROOT_SELECTOR,
      CLIENT_FORM_VENDOR_ID_ALIASES,
      uniqClientFormIds,
      toCanonicalClientFormId,
      queryScopedClientFormElement,
      queryGlobalClientFormElement,
      resolveClientEntityType,
      resolveClientFieldLabelDefaults,
      resolveClientFieldLabel,
      sanitizeClientSnapshot,
      applyClientFieldVisibility,
      applyClientFieldLabels,
      clientFieldVisibility,
      clientFieldVisibilityDraft,
      clientFieldLabels,
      clientFieldLabelsDraft,
      clientSavedModal,
      clientSavedModalState,
      clientSavedSearchInput,
      clientSavedListBtnSelector,
      clientSavedModalEntityType,
      clientSavedModalFormScope,
      isItemsDocOptionsModalOpen,
      getDefaultClientSearchInput,
      getDefaultClientSearchResults,
      hideClientSearchResults,
      clearClientSearchInputValue,
      renderClientSearchResults,
      renderClientSavedModal,
      fetchSavedClientsPage,
      setActiveAddFormScope,
      syncClientFormFields,
      addArticleToItems,
      isArticleSavedModalOpen,
      closeArticleSavedModal,
      scheduleModelDirtyCheck,
      syncTaxModeDependentColumnToggles,
      updateTaxDependentLabels:
        typeof updateTaxDependentLabels === "function"
          ? updateTaxDependentLabels
          : (typeof w.updateTaxDependentLabels === "function"
            ? w.updateTaxDependentLabels
            : () => {}),
      updateModelButtons,
      modelSelect,
      modelActionsSelect
    };
    Object.assign(ctx, assignCoreValues);

    defineCtxAccessor = (key, getter, setter) => {
      Object.defineProperty(ctx, key, {
        configurable: true,
        enumerable: true,
        get: getter,
        set: setter || (() => {})
      });
    };

    defineCtxAccessor("modelDirty", () => modelDirty, (value) => {
      modelDirty = !!value;
    });
    defineCtxAccessor("modelBaselineString", () => modelBaselineString, (value) => {
      modelBaselineString = value;
    });
    defineCtxAccessor("clientSearchData", () => clientSearchData, (value) => {
      clientSearchData = Array.isArray(value) ? value : [];
    });
    defineCtxAccessor("clientSearchPage", () => clientSearchPage, (value) => {
      const next = Number(value);
      clientSearchPage = Number.isFinite(next) && next > 0 ? Math.trunc(next) : 1;
    });
    defineCtxAccessor("clientSavedModalEntityType", () => clientSavedModalEntityType, (value) => {
      clientSavedModalEntityType = value === "vendor" ? "vendor" : "client";
    });
  }, { order: 1100 });
})(window);
