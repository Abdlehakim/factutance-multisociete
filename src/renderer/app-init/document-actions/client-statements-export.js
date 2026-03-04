(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const showDialogMessage = async (message, title = "Solde clients") => {
    const text = String(message || "").trim();
    if (!text) return;
    if (typeof w.showDialog === "function") {
      await w.showDialog(text, { title });
      return;
    }
    if (typeof w.alert === "function") w.alert(text);
  };

  AppInit.registerClientStatementsExportActions = function registerClientStatementsExportActions() {
    const SEM = (w.SEM = w.SEM || {});
    if (SEM.__clientStatementsExportBound) return;
    SEM.__clientStatementsExportBound = true;

    const ui = AppInit.ClientStatementsExportUi;
    const dialog = AppInit.ClientStatementsExportDialog;
    const business = AppInit.ClientStatementsExportBusiness;
    const preview = AppInit.ClientStatementsExportPreview;
    if (!ui || !dialog || !business || !preview) {
      console.warn("client statements export modules are missing");
      return;
    }

    let inFlight = false;
    const onExportClick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const currentFilters =
          typeof business.getClientStatementsModalFilters === "function"
            ? business.getClientStatementsModalFilters()
            : {};
        const options = await dialog.openClientStatementsExportDialog({ currentFilters });
        if (!options) return;

        const dataset = await business.buildExportDataset({
          modalFilters: currentFilters,
          scope: options.scope,
          soldFilter: options.soldFilter,
          startDate: options.startDate,
          endDate: options.endDate
        });

        if (!Array.isArray(dataset.rows) || !dataset.rows.length) {
          await showDialogMessage(
            "Aucun client ne correspond aux filtres et a la periode selectionnes.",
            "Export PDF"
          );
          return;
        }

        await preview.showClientStatementsExportPreview({
          snapshot: {
            company: w.SEM?.state?.company || {},
            rows: dataset.rows,
            rowCount: dataset.rowCount || 0,
            totalDebit: dataset.totalDebit || 0,
            totalCredit: dataset.totalCredit || 0,
            totalSold: dataset.totalSold || 0,
            totalDebitLabel: dataset.totalDebitLabel || "0.000",
            totalCreditLabel: dataset.totalCreditLabel || "0.000",
            totalSoldLabel: dataset.totalSoldLabel || "0.000",
            startDate: dataset.startDate || options.startDate,
            endDate: dataset.endDate || options.endDate
          }
        });
      } catch (err) {
        await showDialogMessage(String(err?.message || err || "Export impossible."), "Export PDF");
      } finally {
        inFlight = false;
      }
    };

    const bindOnce = () => !!ui.bindClientStatementsExportButton(onExportClick);
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
