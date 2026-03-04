(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const showDialogMessage = async (message, title = "Historique paiements") => {
    const text = String(message || "").trim();
    if (!text) return;
    if (typeof w.showDialog === "function") {
      await w.showDialog(text, { title });
      return;
    }
    if (typeof w.alert === "function") w.alert(text);
  };

  const resolveScopeLabel = (scope) =>
    scope === "all-records" ? "Tous les paiements" : "Filtres actifs du tableau";

  const loadPaymentHistoryEntries = async () => {
    if (!w.electronAPI?.readPaymentHistory) return [];
    try {
      const res = await w.electronAPI.readPaymentHistory();
      if (res?.ok && Array.isArray(res.items)) return res.items;
      return [];
    } catch (err) {
      console.warn("payment history read failed", err);
      return [];
    }
  };

  const loadDocumentHistoryEntries = () => {
    if (typeof w.getDocumentHistoryFull !== "function") return [];
    try {
      return w.getDocumentHistoryFull("facture") || [];
    } catch (err) {
      console.warn("invoice history read failed", err);
      return [];
    }
  };

  AppInit.registerPaymentHistoryExportActions = function registerPaymentHistoryExportActions() {
    const SEM = (w.SEM = w.SEM || {});
    if (SEM.__paymentHistoryExportBound) return;
    SEM.__paymentHistoryExportBound = true;

    const ui = AppInit.PaymentHistoryExportUi;
    const dialog = AppInit.PaymentHistoryExportDialog;
    const business = AppInit.PaymentHistoryExportBusiness;
    const preview = AppInit.PaymentHistoryExportPreview;
    if (!ui || !dialog || !business || !preview) {
      console.warn("payment history export modules are missing");
      return;
    }

    let inFlight = false;
    const onExportClick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const currentFilters =
          typeof business.getPaymentHistoryModalFilters === "function"
            ? business.getPaymentHistoryModalFilters()
            : {};
        const options = await dialog.openPaymentHistoryExportDialog({ currentFilters });
        if (!options) return;

        const paymentEntries = await loadPaymentHistoryEntries();
        const documentEntries = loadDocumentHistoryEntries();
        const dataset = business.buildExportDataset({
          paymentEntries,
          documentEntries,
          modalFilters: currentFilters,
          scope: options.scope,
          startDate: options.startDate,
          endDate: options.endDate
        });

        if (!Array.isArray(dataset.rows) || !dataset.rows.length) {
          await showDialogMessage(
            "Aucun paiement ne correspond aux filtres et a la periode selectionnes.",
            "Export PDF"
          );
          return;
        }

        await preview.showPaymentHistoryExportPreview({
          snapshot: {
            company: w.SEM?.state?.company || {},
            rows: dataset.rows,
            rowCount: dataset.rowCount || 0,
            totalAmount: dataset.totalAmount || 0,
            totalAmountLabel: dataset.totalAmountLabel || "0.000",
            currency: dataset.currency || "",
            startDate: dataset.startDate || options.startDate,
            endDate: dataset.endDate || options.endDate,
            scopeLabel: resolveScopeLabel(options.scope)
          }
        });
      } catch (err) {
        await showDialogMessage(String(err?.message || err || "Export impossible."), "Export PDF");
      } finally {
        inFlight = false;
      }
    };

    const bindOnce = () => !!ui.bindPaymentHistoryExportButton(onExportClick);
    if (bindOnce()) return;

    let attempts = 0;
    const retry = () => {
      if (bindOnce()) return;
      attempts += 1;
      if (attempts < 15) setTimeout(retry, 200);
    };
    setTimeout(retry, 200);
  };
})(window);
