(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerDocumentActions = function registerDocumentActions({
    numbering,
    history,
    focus,
    forms
  } = {}) {
    const SEM = (w.SEM = w.SEM || {});
    const focusApi = focus || SEM.ui || {};
    const formsApi = forms || SEM.forms || {};
    const metaApi = numbering || {};

    const getInvoiceMeta = metaApi.getInvoiceMeta || (() => (SEM.state || (SEM.state = {})).meta || (SEM.state.meta = {}));
    const normalizeInvoiceLength = metaApi.normalizeInvoiceLength || ((value, fallback) => Number(value) || Number(fallback) || 4);
    const extractYearDigits = metaApi.extractYearDigits || (() => null);
    const getInvoiceYear = metaApi.getInvoiceYear || (() => null);
    const syncInvoiceNumberControls = metaApi.syncInvoiceNumberControls || (() => {});
    const clearPendingNumberLocal = metaApi.clearPendingNumberLocal || (() => {});
    const integerOrNull = metaApi.integerOrNull || (() => null);

    const historyApi = history || {};
    const renderHistoryList = historyApi.renderHistoryList || (() => {});
    const setHistorySelectedType = historyApi.setSelectedType || (() => {});
    const getHistorySelectedType = historyApi.getSelectedType || (() => getEl("docType")?.value || "facture");
    const openHistoryModal = historyApi.openModal || (() => false);

    const docTypeChoices = [
      { label: "Facture", docType: "facture" },
      { label: "Facture d'achat", docType: "fa" },
      { label: "Facture d'avoir", docType: "avoir" },
      { label: "Devis", docType: "devis" },
      { label: "Bon de livraison", docType: "bl" }
    ];

    const context = {
      w,
      SEM,
      focusApi,
      formsApi,
      docTypeChoices,
      getInvoiceMeta,
      normalizeInvoiceLength,
      extractYearDigits,
      getInvoiceYear,
      syncInvoiceNumberControls,
      clearPendingNumberLocal,
      integerOrNull,
      renderHistoryList,
      setHistorySelectedType,
      getHistorySelectedType,
      openHistoryModal,
      metaElements: metaApi.elements || {}
    };

    AppInit.registerDocumentManagementActions?.(context);
    AppInit.registerDocumentBulkExportActions?.(context);
    AppInit.registerDocumentBulkDeleteActions?.(context);
    AppInit.registerWithholdingXmlFaActions?.(context);
    AppInit.registerSalesTaxReportActions?.(context);
    AppInit.registerPurchaseTaxReportActions?.(context);
    AppInit.registerClientStatementReportActions?.(context);
    AppInit.registerPaymentActions?.(context);
    AppInit.registerCreditClientActions?.(context);
    AppInit.registerClientStatementsActions?.(context);
    AppInit.registerClientLedgerActions?.(context);
    AppInit.registerItemAndUiActions?.(context);
    AppInit.registerColumnToggleActions?.(context);
    AppInit.registerRecordActions?.(context);
  };
})(window);
