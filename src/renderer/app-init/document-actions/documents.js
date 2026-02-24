(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const DEFAULT_DOC_TYPES = [
    { label: "Facture", docType: "facture" },
    { label: "Facture d'achat", docType: "fa" },
    { label: "Facture d'avoir", docType: "avoir" },
    { label: "Devis", docType: "devis" },
    { label: "Bon de livraison", docType: "bl" }
  ];

  const DOC_TYPE_GRAMMAR = {
    facture: { article: "La", feminine: true },
    fa: { article: "La", feminine: true },
    devis: { article: "Le", feminine: false },
    bl: { article: "Le", feminine: false },
    avoir: { article: "La", feminine: true },
    retenue: { article: "La", feminine: true }
  };
  const PAYMENT_METHOD_OPTIONS = [
   { value: "cash", label: "Esp\u00E8ces" },
  { value: "cash_deposit", label: "Versement Esp\u00E8ces" },
  { value: "cheque", label: "Ch\u00E8que" },
  { value: "bill_of_exchange", label: "Effet" },
  { value: "transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "withholding_tax", label: "Retenue \u00E0 la source" }
  ];
  const FACTURE_STATUS_OPTIONS = [
    { value: "payee", label: "Pay\u00E9e" },
    { value: "partiellement-payee", label: "Partiellement pay\u00E9es" },
    { value: "pas-encore-payer", label: "Impay\u00E9e" },
    { value: "brouillon", label: "Brouillon" }
  ];
  const UNPAID_STATUS_VALUES = new Set(["pas-encore-payer", "impayee", "impaye"]);
  const NO_PAYMENT_METHOD_LABEL = "N.R";
  const NO_PAYMENT_METHOD_STATUS_VALUES = new Set([
    ...UNPAID_STATUS_VALUES,
    "brouillon",
    "avoir"
  ]);
  const normalizeFactureStatusValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "annule") return "brouillon";
    return normalized;
  };
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';

  AppInit.registerDocumentManagementActions = function registerDocumentManagementActions(ctx = {}) {
    const SEM = ctx.SEM || (w.SEM = w.SEM || {});
    const purchaseInvoiceImport =
      (w.AppInit && w.AppInit.DocHistoryPurchaseImport) || null;
    const modelTransferExport =
      (w.AppInit && w.AppInit.ModelTransferExport) || null;
    const modelTransferImport =
      (w.AppInit && w.AppInit.ModelTransferImport) || null;
    const getMessage = (key, options = {}) =>
      (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
        text: options?.fallbackText || key || "",
        title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
    const isUnpaidStatus = (value) => UNPAID_STATUS_VALUES.has(normalizeFactureStatusValue(value));
    const isNoPaymentMethodStatus = (value) =>
      NO_PAYMENT_METHOD_STATUS_VALUES.has(normalizeFactureStatusValue(value));
    const LEDGER_UNPAID_SOURCE = "invoice_unpaid";
    const LEDGER_PAYMENT_SOURCE = "invoice_payment";
    const normalizeLedgerField = (value) => String(value || "").trim().toLowerCase();
    const normalizeLedgerAmount = (value) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return null;
      return Math.round((num + Number.EPSILON) * 1000) / 1000;
    };
    const sanitizeLedgerInvoiceNumber = (value) => {
      const raw = String(value || "").trim();
      if (!raw || /^sqlite:\/\//i.test(raw)) return "";
      return raw;
    };
    const deriveInvoiceNumberFromPath = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const tail = raw.split(/[\\/]/).pop() || "";
      const withoutExt = tail.replace(/\.[^/.]+$/, "");
      return sanitizeLedgerInvoiceNumber(withoutExt);
    };
    const ledgerAmountsMatch = (left, right) =>
      Number.isFinite(left) &&
      Number.isFinite(right) &&
      Math.abs(left - right) <= 0.0005;
    const isPaidFactureStatus = (value) => {
      const normalized = normalizeFactureStatusValue(value);
      return normalized === "payee" || normalized === "partiellement-payee";
    };
    const syncInvoiceLedger = async ({
      clientPath,
      taxId,
      invoicePath,
      invoiceNumber,
      invoiceDate,
      invoiceTotal,
      status,
      paymentDate,
      paidAmount,
      paymentMethod,
      paymentReference,
      preserveEntryIds = false
    } = {}) => {
      if (
        !w.electronAPI?.addClientLedgerEntry ||
        !w.electronAPI?.readClientLedger ||
        !w.electronAPI?.deleteClientLedgerEntry
      ) {
        return false;
      }
      const normalizedClientPath = String(clientPath || "").trim();
      const normalizedInvoicePath = String(invoicePath || "").trim();
      if (!normalizedClientPath || !normalizedInvoicePath) return false;
      const normalizedStatus = normalizeFactureStatusValue(status);
      const normalizedTaxId = String(taxId || "").trim();
      const normalizedInvoiceNumber =
        sanitizeLedgerInvoiceNumber(invoiceNumber) ||
        deriveInvoiceNumberFromPath(normalizedInvoicePath);
      const normalizedInvoiceTotal = normalizeLedgerAmount(invoiceTotal);
      const normalizedPaidAmount = normalizeLedgerAmount(paidAmount);
      const normalizedInvoiceDate = String(invoiceDate || "").trim();
      const normalizedPaymentDate = String(paymentDate || "").trim();
      const normalizedPaymentMethod = String(paymentMethod || "").trim();
      const normalizedPaymentReference = String(paymentReference || "").trim();
      const ledgerRes = await w.electronAPI.readClientLedger({ path: normalizedClientPath });
      if (!ledgerRes?.ok) return false;
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      let changed = false;
      const resolveEffectiveDateForSource = (sourceValue) => {
        const sourceType = normalizeLedgerField(sourceValue);
        if (sourceType === LEDGER_UNPAID_SOURCE) return normalizedInvoiceDate;
        if (sourceType === LEDGER_PAYMENT_SOURCE) {
          return normalizedPaymentDate || normalizedInvoiceDate;
        }
        return normalizedPaymentDate || normalizedInvoiceDate;
      };

      const matchesForSource = (sourceValue) =>
        items.filter((item) => {
          const sourceType = normalizeLedgerField(item?.source);
          if (sourceType !== normalizeLedgerField(sourceValue)) return false;
          const itemSourceId = String(item?.sourceId || "").trim();
          const itemInvoicePath = String(item?.invoicePath || "").trim();
          const itemInvoiceNumber = String(item?.invoiceNumber || "").trim();
          if (
            normalizedInvoicePath &&
            (itemSourceId === normalizedInvoicePath || itemInvoicePath === normalizedInvoicePath)
          ) {
            return true;
          }
          if (normalizedInvoiceNumber && itemInvoiceNumber === normalizedInvoiceNumber) {
            return true;
          }
          return false;
        });

      const removeRows = async (rows) => {
        for (const row of rows) {
          const entryId = String(row?.id || "").trim();
          if (!entryId) continue;
          const res = await w.electronAPI.deleteClientLedgerEntry({ id: entryId });
          if (res?.ok) changed = true;
        }
      };

      const updateLedgerRowAmount = async (row, amount) => {
        const entryId = String(row?.id || "").trim();
        if (!entryId || !w.electronAPI?.updateClientLedgerAmount) return false;
        const updateRes = await w.electronAPI.updateClientLedgerAmount({
          id: entryId,
          amount
        });
        if (!updateRes?.ok) return false;
        const updated = Number(updateRes.updated || 0);
        if (updated > 0) {
          changed = true;
          return true;
        }
        return false;
      };

      const upsertRow = async ({
        source,
        type,
        amount,
        paymentMode = "",
        paymentRef = ""
      }) => {
        const normalizedAmount = normalizeLedgerAmount(amount);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
          await removeRows(matchesForSource(source));
          return;
        }
        const rows = matchesForSource(source);
        const matching = rows.find((row) => {
          const rowType = normalizeLedgerField(row?.type);
          const rowAmount = normalizeLedgerAmount(row?.amount);
          const rowMode = String(row?.paymentMode || "").trim();
          const rowRef = String(row?.paymentRef || "").trim();
          return (
            rowType === normalizeLedgerField(type) &&
            ledgerAmountsMatch(rowAmount, normalizedAmount) &&
            rowMode === String(paymentMode || "").trim() &&
            rowRef === String(paymentRef || "").trim()
          );
        });
        if (matching && rows.length === 1) return;
        if (preserveEntryIds) {
          if (!rows.length) return;
          const [primaryRow, ...duplicateRows] = rows;
          if (duplicateRows.length) {
            await removeRows(duplicateRows);
          }
          const primaryType = normalizeLedgerField(primaryRow?.type);
          const primaryAmount = normalizeLedgerAmount(primaryRow?.amount);
          const primaryMode = String(primaryRow?.paymentMode || "").trim();
          const primaryRef = String(primaryRow?.paymentRef || "").trim();
          const targetType = normalizeLedgerField(type);
          const targetMode = String(paymentMode || "").trim();
          const targetRef = String(paymentRef || "").trim();
          const canKeepRow =
            primaryType === targetType &&
            primaryMode === targetMode &&
            primaryRef === targetRef;
          if (canKeepRow && !ledgerAmountsMatch(primaryAmount, normalizedAmount)) {
            await updateLedgerRowAmount(primaryRow, normalizedAmount);
          } else if (!canKeepRow && !ledgerAmountsMatch(primaryAmount, normalizedAmount)) {
            // Preserve row identity for edit saves: update amount only, keep existing row metadata.
            await updateLedgerRowAmount(primaryRow, normalizedAmount);
          }
          return;
        }
        await removeRows(rows);
        const addRes = await w.electronAPI.addClientLedgerEntry({
          path: normalizedClientPath,
          taxId: normalizedTaxId,
          effectiveDate: resolveEffectiveDateForSource(source),
          type,
          amount: normalizedAmount,
          source,
          sourceId: normalizedInvoicePath,
          invoicePath: normalizedInvoicePath,
          invoiceNumber: normalizedInvoiceNumber,
          paymentMode: String(paymentMode || "").trim(),
          paymentRef: String(paymentRef || "").trim()
        });
        if (addRes?.ok) {
          changed = true;
        }
      };

      if (normalizedStatus === "brouillon") {
        await removeRows(matchesForSource(LEDGER_UNPAID_SOURCE));
        await removeRows(matchesForSource(LEDGER_PAYMENT_SOURCE));
      } else if (isUnpaidStatus(normalizedStatus)) {
        await upsertRow({
          source: LEDGER_UNPAID_SOURCE,
          type: "debit",
          amount: normalizedInvoiceTotal,
          paymentMode: "",
          paymentRef: ""
        });
        await removeRows(matchesForSource(LEDGER_PAYMENT_SOURCE));
      } else if (isPaidFactureStatus(normalizedStatus)) {
        await upsertRow({
          source: LEDGER_UNPAID_SOURCE,
          type: "debit",
          amount: normalizedInvoiceTotal,
          paymentMode: "",
          paymentRef: ""
        });
        await upsertRow({
          source: LEDGER_PAYMENT_SOURCE,
          type: "credit",
          amount: normalizedPaidAmount,
          paymentMode: normalizedPaymentMethod,
          paymentRef: normalizedPaymentReference
        });
      }

      if (changed) {
        window.dispatchEvent(new CustomEvent("payment-history-updated"));
      }
      return true;
    };
    AppInit.syncFactureLedger = syncInvoiceLedger;
    w.syncFactureLedger = syncInvoiceLedger;
    const bindingHelpers = SEM.__bindingHelpers || {};
    const docTypeChoices =
      Array.isArray(ctx.docTypeChoices) && ctx.docTypeChoices.length > 0 ? ctx.docTypeChoices : DEFAULT_DOC_TYPES;
    const pdfDocTypeChoices = (() => {
      const list = Array.isArray(docTypeChoices) ? docTypeChoices.slice() : [];
      const withoutRetenue = list.filter(
        (choice) => String(choice?.docType || "").toLowerCase() !== "retenue"
      );
      withoutRetenue.push(
        {
          label: "Retenue a la source FA",
          docType: "retenue",
          subDir: "factureAchat"
        },
        {
          label: "Retenue a la source Facture",
          docType: "retenue",
          subDir: "facture"
        }
      );
      const hasReportTax = withoutRetenue.some(
        (choice) => String(choice?.docType || "").toLowerCase() === "rapporttv"
      );
      if (!hasReportTax) {
        withoutRetenue.push({
          label: "Rapport de taxes a la vente",
          docType: "rapporttv"
        });
      }
      return withoutRetenue;
    })();
    let historyHydratedOnce = false;
    let historyHydrationAttempts = 0;
    async function hydrateHistoryFromDiskOnce() {
      if (historyHydratedOnce) return;
      if (typeof w.addDocumentHistory !== "function" || !w.electronAPI?.listInvoiceFiles) {
        if (historyHydrationAttempts < 5) {
          historyHydrationAttempts += 1;
          setTimeout(hydrateHistoryFromDiskOnce, 800);
        }
        return;
      }
      historyHydratedOnce = true;
      const types = docTypeChoices.map((t) => t?.docType).filter(Boolean);
      for (const type of types) {
        try {
          if (typeof w.clearDocumentHistory === "function") {
            w.clearDocumentHistory(type);
          }
          const res = await w.electronAPI.listInvoiceFiles({ docType: type });
          if (!res?.ok || !Array.isArray(res.items)) continue;
          res.items.forEach((item) => {
            const entryDocType = item?.docType || type;
              w.addDocumentHistory({
                docType: entryDocType,
                path: item?.path,
                number: item?.number,
                date: item?.date,
                createdAt: item?.createdAt || item?.modifiedAt,
                name: item?.name,
                clientName: item?.clientName,
                clientAccount: item?.clientAccount,
                totalHT: item?.totalHT,
              totalTTC: item?.totalTTC,
              currency: item?.currency,
              paid: item?.paid,
              balanceDue: item?.balanceDue,
              acompteEnabled: item?.acompteEnabled,
              reglementEnabled: item?.reglementEnabled,
              reglementText: item?.reglementText,
              paymentMethod: item?.paymentMethod || item?.mode,
              paymentRef: item?.paymentRef || item?.paymentReference,
              paymentReference: item?.paymentReference || item?.paymentRef,
              paymentDate: item?.paymentDate,
              status: item?.status,
              pdfPath: item?.pdfPath,
              pdfExportedAt: item?.pdfExportedAt,
              has_comment: item?.has_comment,
              convertedFrom: item?.convertedFrom
            });
          });
        } catch (err) {
          console.warn("hydrate history from disk failed", err);
        }
      }
    }

    if (typeof SEM.markDocumentDirty !== "function") {
      SEM.isDocumentDirty = typeof SEM.isDocumentDirty === "boolean" ? SEM.isDocumentDirty : false;
      SEM.markDocumentDirty = function markDocumentDirty(dirty = true) {
        SEM.isDocumentDirty = !!dirty;
      };
    }
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
          if (typeof SEM.markDocumentDirty === "function") SEM.markDocumentDirty(true);
        },
        true
      );
      SEM.__documentDirtyListenerAttached = true;
    }

    const confirmInvoiceResetIfUnsaved = async () => {
      return true;
    };

    const promptFacturePaymentMeta = async ({
      paymentMethod,
      status,
      paymentRef,
      paymentReference: paymentReferenceInput
    } = {}) => {
      const normalizeValue = (value, options) => {
        const raw = String(value || "").trim().toLowerCase();
        if (!raw) return "";
        return options.some((opt) => opt.value === raw) ? raw : "";
      };
      const normalizeMethodValue = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return "";
        const normalized = raw.toLowerCase().replace(/\s+/g, "");
        if (normalized === "n.r" || normalized === "nr") return NO_PAYMENT_METHOD_LABEL;
        return normalizeValue(raw, PAYMENT_METHOD_OPTIONS);
      };
      let selectedMethod = normalizeMethodValue(paymentMethod);
      let selectedStatus = normalizeValue(
        normalizeFactureStatusValue(status),
        FACTURE_STATUS_OPTIONS
      );
      let paymentReference =
        typeof paymentReferenceInput === "string"
          ? paymentReferenceInput.trim()
          : typeof paymentRef === "string"
            ? paymentRef.trim()
            : "";
      const paidInput = getEl("acomptePaid");
      const paidRaw = paidInput ? Number(paidInput.value) : NaN;
      const allowPartialStatus = Number.isFinite(paidRaw) && paidRaw > 0;
      if (!allowPartialStatus && selectedStatus === "partiellement-payee") {
        selectedStatus = "";
      }
      if (typeof w.showConfirm !== "function") {
        const fallbackStatus = selectedStatus || FACTURE_STATUS_OPTIONS[2]?.value || "pas-encore-payer";
        const fallbackMethod = isNoPaymentMethodStatus(fallbackStatus)
          ? NO_PAYMENT_METHOD_LABEL
          : selectedMethod || PAYMENT_METHOD_OPTIONS[0]?.value || "cash";
        return {
          paymentMethod: fallbackMethod,
          status: fallbackStatus,
          paymentRef: "",
          paymentReference: ""
        };
      }
      let confirmed = false;
      try {
        confirmed = await w.showConfirm("Renseignez les informations de paiement.", {
          title: "Paiement",
          okText: "Enregistrer",
          cancelText: "Annuler",
          renderMessage: (container) => {
            if (!container) return;
            container.textContent = "";
            container.style.maxHeight = "none";
            container.style.overflow = "visible";
            const doc = container.ownerDocument || document;
            const note = doc.createElement("p");
            note.className = "doc-dialog-question";
            note.textContent = "Renseignez les informations de paiement.";
            const wrapper = doc.createElement("div");
            wrapper.className = "doc-dialog-model-picker";

            const okBtn = doc.getElementById("swbDialogOk");
            const setOkState = () => {
              const hasValues = !!(selectedMethod && selectedStatus);
              if (okBtn) {
                okBtn.disabled = !hasValues;
                okBtn.setAttribute("aria-disabled", hasValues ? "false" : "true");
              }
            };
            let lastPaymentMethod =
              selectedMethod && selectedMethod !== NO_PAYMENT_METHOD_LABEL ? selectedMethod : "";
            let syncPaymentMethodState = () => {};
            let syncPaymentRefState = () => {};

            const createMenuGroup = ({
              idPrefix,
              labelText,
              placeholderText,
              options,
              selectedValue,
              isOptionDisabled,
              onChange
            }) => {
              const group = doc.createElement("div");
              group.className = "doc-history-convert__field";
              const label = doc.createElement("label");
              label.className = "doc-history-convert__label doc-dialog-model-picker__label";
              label.id = `${idPrefix}Label`;
              label.textContent = labelText;
              const field = doc.createElement("div");
              field.className = "doc-dialog-model-picker__field";

              const menu = doc.createElement("details");
              menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
              menu.dataset.wired = "1";
              const summary = doc.createElement("summary");
              summary.className = "btn success field-toggle-trigger";
              summary.setAttribute("role", "button");
              summary.setAttribute("aria-haspopup", "listbox");
              summary.setAttribute("aria-expanded", "false");
              summary.setAttribute("aria-labelledby", `${label.id} ${idPrefix}Display`);
              const display = doc.createElement("span");
              display.id = `${idPrefix}Display`;
              display.className = "model-select-display";
              display.textContent = placeholderText || "";
              summary.appendChild(display);
              summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
              menu.appendChild(summary);

              const panelPlaceholder = doc.createComment("doc-history-model-panel-placeholder");
              const panel = doc.createElement("div");
              panel.id = `${idPrefix}Panel`;
              panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
              panel.setAttribute("role", "listbox");
              panel.setAttribute("aria-labelledby", label.id);
              menu.appendChild(panelPlaceholder);
              menu.appendChild(panel);

              const hiddenSelect = doc.createElement("select");
              hiddenSelect.id = `${idPrefix}Select`;
              hiddenSelect.className = "model-select doc-dialog-model-select";
              hiddenSelect.setAttribute("aria-hidden", "true");
              hiddenSelect.tabIndex = -1;
              const placeholderOption = doc.createElement("option");
              placeholderOption.value = "";
              placeholderOption.textContent = placeholderText || "";
              hiddenSelect.appendChild(placeholderOption);

              label.htmlFor = hiddenSelect.id;

              const getOptionLabel = (value) => {
                if (!value) return "";
                const match = options.find((opt) => opt.value === value);
                return match?.label || "";
              };
              const isMenuDisabled = () => menu.dataset.disabled === "true";

              panel.textContent = "";
              options.forEach((opt) => {
                const value = opt.value || "";
                const labelText = opt.label || value;
                const btn = doc.createElement("button");
                btn.type = "button";
                btn.className = "model-select-option";
                btn.dataset.value = value;
                btn.setAttribute("role", "option");
                btn.setAttribute("aria-selected", "false");
                btn.textContent = labelText;
                if (typeof isOptionDisabled === "function" && isOptionDisabled(value)) {
                  btn.disabled = true;
                  btn.setAttribute("aria-disabled", "true");
                }
                panel.appendChild(btn);

                const option = doc.createElement("option");
                option.value = value;
                option.textContent = labelText;
                if (typeof isOptionDisabled === "function" && isOptionDisabled(value)) {
                  option.disabled = true;
                }
                hiddenSelect.appendChild(option);
              });

              const setSelection = (value, { closeMenu = true, notify = true, forceLabel } = {}) => {
                const nextValue = value || "";
                hiddenSelect.value = nextValue;
                const activeLabel =
                  typeof forceLabel === "string" ? forceLabel : getOptionLabel(nextValue);
                display.textContent = activeLabel || placeholderText || "";
                panel.querySelectorAll(".model-select-option").forEach((btn) => {
                  const isActive = btn.dataset.value === nextValue;
                  btn.classList.toggle("is-active", isActive);
                  btn.setAttribute("aria-selected", isActive ? "true" : "false");
                });
                if (notify && typeof onChange === "function") onChange(nextValue);
                if (closeMenu) {
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                }
              };
              const setDisabled = (disabled) => {
                const isDisabled = !!disabled;
                menu.dataset.disabled = isDisabled ? "true" : "false";
                summary.setAttribute("aria-disabled", isDisabled ? "true" : "false");
                if (isDisabled) {
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                  summary.tabIndex = -1;
                } else {
                  summary.removeAttribute("tabindex");
                }
                hiddenSelect.disabled = isDisabled;
                hiddenSelect.setAttribute("aria-disabled", isDisabled ? "true" : "false");
                panel.querySelectorAll(".model-select-option").forEach((btn) => {
                  btn.disabled = isDisabled;
                });
              };

              panel.addEventListener("click", (evt) => {
                if (isMenuDisabled()) return;
                const btn = evt.target.closest(".model-select-option");
                if (!btn) return;
                if (btn.disabled) return;
                setSelection(btn.dataset.value || "");
              });

              summary.addEventListener("click", (evt) => {
                if (isMenuDisabled()) return;
                evt.preventDefault();
                menu.open = !menu.open;
                summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
                if (!menu.open) summary.focus();
              });

              menu.addEventListener("keydown", (evt) => {
                if (isMenuDisabled()) return;
                if (evt.key === "Escape") {
                  evt.preventDefault();
                  menu.open = false;
                  summary.setAttribute("aria-expanded", "false");
                  summary.focus();
                }
              });

              doc.addEventListener("click", (evt) => {
                if (!menu.open) return;
                if (menu.contains(evt.target)) return;
                menu.open = false;
                summary.setAttribute("aria-expanded", "false");
              });

              field.append(menu, hiddenSelect);
              group.append(label, field);
              setSelection(selectedValue, { closeMenu: false, notify: false });
              return { group, hiddenSelect, setSelection, setDisabled };
            };

            const row = doc.createElement("div");
            row.className = "doc-dialog-model-picker__row";
            const statusGroup = createMenuGroup({
              idPrefix: "docPaymentStatus",
              labelText: "Statut de la facture",
              placeholderText: "Choisir un statut",
              options: FACTURE_STATUS_OPTIONS,
              selectedValue: selectedStatus,
              isOptionDisabled: (value) =>
                !allowPartialStatus && String(value || "").trim().toLowerCase() === "partiellement-payee",
              onChange: (value) => {
                selectedStatus = value || "";
                syncPaymentMethodState();
                syncPaymentRefState();
              }
            });
            const methodGroup = createMenuGroup({
              idPrefix: "docPaymentMethod",
              labelText: "Mode de paiement",
              placeholderText: "Choisir un mode",
              options: PAYMENT_METHOD_OPTIONS,
              selectedValue: selectedMethod,
              onChange: (value) => {
                selectedMethod = value || "";
                if (selectedMethod && selectedMethod !== NO_PAYMENT_METHOD_LABEL) {
                  lastPaymentMethod = selectedMethod;
                }
                syncPaymentRefState();
                setOkState();
              }
            });
            const refGroup = doc.createElement("div");
            refGroup.className = "doc-history-convert__field";
            const refLabel = doc.createElement("label");
            refLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
            refLabel.id = "docPaymentReferenceLabel";
            refLabel.textContent = "R\u00e9f. paiement";
            const refField = doc.createElement("div");
            refField.className = "doc-dialog-model-picker__field";
            const refInput = doc.createElement("input");
            refInput.id = "docPaymentReferenceInput";
            refInput.type = "text";
            refInput.className = "doc-history-convert__input";
            refInput.placeholder = "R\u00e9f. paiement";
            refInput.value = paymentReference;
            refInput.addEventListener("input", () => {
              paymentReference = String(refInput.value || "").trim();
            });
            refLabel.htmlFor = refInput.id;
            refField.appendChild(refInput);
            refGroup.append(refLabel, refField);
            syncPaymentMethodState = () => {
              if (!methodGroup) return;
              const shouldDisable = isNoPaymentMethodStatus(selectedStatus);
              if (shouldDisable) {
                if (selectedMethod && selectedMethod !== NO_PAYMENT_METHOD_LABEL) {
                  lastPaymentMethod = selectedMethod;
                }
                selectedMethod = NO_PAYMENT_METHOD_LABEL;
                methodGroup.setSelection(selectedMethod, {
                  closeMenu: false,
                  notify: false,
                  forceLabel: NO_PAYMENT_METHOD_LABEL
                });
                methodGroup.setDisabled(true);
              } else {
                methodGroup.setDisabled(false);
                if (selectedMethod === NO_PAYMENT_METHOD_LABEL) {
                  selectedMethod = lastPaymentMethod || "";
                }
                methodGroup.setSelection(selectedMethod, {
                  closeMenu: false,
                  notify: false
                });
              }
              syncPaymentRefState();
              setOkState();
            };
            syncPaymentRefState = () => {
              const hasMethod = !!(selectedMethod && selectedMethod !== NO_PAYMENT_METHOD_LABEL);
              refGroup.hidden = !hasMethod;
              refInput.disabled = !hasMethod;
              refInput.setAttribute("aria-disabled", hasMethod ? "false" : "true");
            };
            syncPaymentMethodState();
            syncPaymentRefState();
            row.append(statusGroup.group, methodGroup.group, refGroup);
            wrapper.appendChild(row);
            container.appendChild(note);
            container.appendChild(wrapper);
            setOkState();
          }
        });
      } finally {
        const okBtn = document.getElementById("swbDialogOk");
        if (okBtn) {
          okBtn.disabled = false;
          okBtn.setAttribute("aria-disabled", "false");
        }
      }
      if (!confirmed) return null;
      if (!selectedMethod || !selectedStatus) return null;
      const normalizedRef = String(paymentReference || "").trim();
      const canStoreReference =
        !!(selectedMethod && selectedMethod !== NO_PAYMENT_METHOD_LABEL);
      const storedRef = canStoreReference ? normalizedRef : "";
      return {
        paymentMethod: selectedMethod,
        status: selectedStatus,
        paymentRef: storedRef,
        paymentReference: storedRef
      };
    };

    const registerCloseGuard = () => {
      if (!w.electronAPI?.onAppCloseRequest || SEM.__closeGuardAttached) return;
      w.electronAPI.onAppCloseRequest(() => {
        w.electronAPI?.approveAppClose?.();
      });
      SEM.__closeGuardAttached = true;
    };
    registerCloseGuard();

    const ensureFaNumberPrefix = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (/^[a-z]/i.test(raw)) return raw;
      return `fa${raw}`;
    };

    const getInvoiceMeta =
      ctx.getInvoiceMeta ||
      (() => {
        const st = SEM.state || (SEM.state = {});
        return st.meta || (st.meta = {});
      });
    const normalizeInvoiceLength = ctx.normalizeInvoiceLength || ((value, fallback) => Number(value) || Number(fallback) || 4);
    const extractYearDigits = ctx.extractYearDigits || (() => null);
    const getInvoiceYear = ctx.getInvoiceYear || (() => null);
    const syncInvoiceNumberControls = ctx.syncInvoiceNumberControls || (() => {});
    const clearPendingNumberLocal = ctx.clearPendingNumberLocal || (() => {});
    const integerOrNull = ctx.integerOrNull || (() => null);

    const renderHistoryList = ctx.renderHistoryList || (() => {});
    const setHistorySelectedType = ctx.setHistorySelectedType || (() => {});
    const getHistorySelectedType = ctx.getHistorySelectedType || (() => getEl("docType")?.value || "facture");
    const openHistoryModal = ctx.openHistoryModal || (() => false);

    const invNumberLengthSelect = ctx.metaElements?.invNumberLengthSelect || getEl("invNumberLength");
    const dialogStrings = w.DialogMessageStrings || {};

    const saveStatusText = (isFeminine) =>
      dialogStrings[isFeminine ? "saveSuccessStatusFeminine" : "saveSuccessStatusMasculine"] ||
      `a ete ${isFeminine ? "enregistree" : "enregistre"} avec succes.`;
    const dialogTemplates = w.DialogMessageTemplates || {};

    const resolveSelectedDocType = () => {
      const docTypeSelect = getEl("docType");
      const docTypePanel = getEl("docTypePanel");
      const activeOption =
        docTypePanel?.querySelector?.("[data-doc-type-option].is-active") ||
        docTypePanel?.querySelector?.('[data-doc-type-option][aria-selected="true"]');
      const activeValue = String(activeOption?.dataset?.docTypeOption || "").trim();
      const selectValue = String(docTypeSelect?.value || "").trim();
      return (activeValue || selectValue || "facture").toLowerCase();
    };

    const captureHistorySummary = () => {
      try {
        const state = SEM.state || {};
        const clientName = String(state.client?.name || "").trim();
        const clientAccount = String(state.client?.account || state.client?.accountOf || "").trim();
        const totalsFn = SEM.computeTotalsReturn;
        const totals = typeof totalsFn === "function" ? totalsFn() : null;
        const totalHT = totals?.totalHT;
        const totalTTC = totals?.totalTTC ?? totals?.grand;
        const currency = totals?.currency || state.meta?.currency || "";
        const resolveReglementInfo = () => {
          if (typeof document === "undefined") return { enabled: false, valueText: "" };
          const enabled = !!document.getElementById("reglementEnabled")?.checked;
          const daysSelected = !!document.getElementById("reglementTypeDays")?.checked;
          let valueText = "A r\u00e9ception";
          if (daysSelected) {
            const daysInput = document.getElementById("reglementDays");
            const raw = String(daysInput?.value ?? "").trim();
            let days = raw ? Number(raw) : Number(daysInput?.getAttribute("value") || 30);
            if (!Number.isFinite(days)) days = 30;
            valueText = `${days} jours`;
          }
          return { enabled, valueText };
        };
        const reglementInfo = resolveReglementInfo();
        const acompteEnabled =
          totals && totals.acompte && typeof totals.acompte.enabled === "boolean"
            ? totals.acompte.enabled
            : undefined;
        const paid = totals?.acompte?.paid;
        const balanceDue = totals?.balanceDue ?? totals?.acompte?.remaining;
        return {
          clientName,
          clientAccount,
          totalHT,
          totalTTC,
          currency,
          paid,
          balanceDue,
          acompteEnabled,
          reglementEnabled: reglementInfo.enabled,
          reglementText: reglementInfo.enabled ? reglementInfo.valueText : ""
        };
      } catch {
        return {};
      }
    };

    const safeHtml = typeof escapeHTML === "function" ? escapeHTML : (value) => String(value ?? "");
    const formatMoneySafe =
      typeof formatMoney === "function"
        ? formatMoney
        : (value, currency) => {
            const num = Number(value || 0);
            const formatted = num.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            return currency ? `${formatted} ${currency}` : formatted;
          };
    const pdfDocFilterNumber = getEl("pdfDocFilterNumber");
    const pdfDocFilterQuery = getEl("pdfDocFilterQuery");
    const pdfDocFilterYear = getEl("pdfDocFilterYear");
    const pdfDocFilterYearMenu = getEl("pdfDocFilterYearMenu");
    const pdfDocFilterYearMenuToggle = pdfDocFilterYearMenu?.querySelector("summary") || null;
    const pdfDocFilterYearDisplay = getEl("pdfDocFilterYearDisplay");
    const pdfDocFilterYearPanel = getEl("pdfDocFilterYearPanel");
    const pdfDocFilterDate = getEl("pdfDocFilterDate");
    const pdfDocFilterClear = getEl("pdfDocFilterClear");
    const xmlDocFilterNumber = getEl("xmlDocFilterNumber");
    const xmlDocFilterQuery = getEl("xmlDocFilterQuery");
    const xmlDocFilterYear = getEl("xmlDocFilterYear");
    const xmlDocFilterYearMenu = getEl("xmlDocFilterYearMenu");
    const xmlDocFilterYearMenuToggle = xmlDocFilterYearMenu?.querySelector("summary") || null;
    const xmlDocFilterYearDisplay = getEl("xmlDocFilterYearDisplay");
    const xmlDocFilterYearPanel = getEl("xmlDocFilterYearPanel");
    const xmlDocFilterDate = getEl("xmlDocFilterDate");
    const xmlDocFilterClear = getEl("xmlDocFilterClear");
    const createDatePicker =
      w.AppDatePicker && typeof w.AppDatePicker.create === "function"
        ? w.AppDatePicker.create.bind(w.AppDatePicker)
        : null;
    let pdfDocDatePickerController = null;
    let xmlDocDatePickerController = null;

    const PDF_MODAL_PAGE_SIZE = 4;
    const pdfDocModalState = {
      overlay: null,
      list: null,
      status: null,
      title: null,
      closeFooterBtn: null,
      closeBtn: null,
      prevBtn: null,
      nextBtn: null,
      pageEl: null,
      pageInput: null,
      totalPagesEl: null,
      docType: "facture",
      docLabel: docTypeDisplayName("facture"),
      subDir: "",
      entries: [],
      page: 1,
      totalPages: 1,
      isOpen: false,
      listenersBound: false,
      previousFocus: null,
      loading: false,
      error: null,
      filters: {
        number: "",
        query: "",
        date: "",
        year: String(new Date().getFullYear())
      }
    };
    const xmlDocModalState = {
      overlay: null,
      list: null,
      status: null,
      title: null,
      closeFooterBtn: null,
      closeBtn: null,
      prevBtn: null,
      nextBtn: null,
      pageEl: null,
      pageInput: null,
      totalPagesEl: null,
      docType: "retenue",
      docLabel: "Retenue a la source XML",
      subDir: "",
      entries: [],
      page: 1,
      totalPages: 1,
      isOpen: false,
      listenersBound: false,
      previousFocus: null,
      loading: false,
      error: null,
      filters: {
        number: "",
        query: "",
        date: "",
        year: String(new Date().getFullYear())
      }
    };

    const normalizeFilterText = (value) => String(value || "").trim().toLowerCase();
    const getCurrentPdfDocYearValue = () => String(new Date().getFullYear());
    const normalizePdfDocYearValue = (value) => {
      const parsed = Number.parseInt(String(value || "").trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 9999) return "";
      return String(parsed);
    };
    const parsePdfDocDayMonthParts = (value) => {
      const text = String(value || "").trim();
      if (!text) return null;
      let dayRaw = "";
      let monthRaw = "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        monthRaw = text.slice(5, 7);
        dayRaw = text.slice(8, 10);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
        const [day, month] = text.split("-");
        dayRaw = day;
        monthRaw = month;
      } else {
        const match = text.match(/^(\d{1,2})[\\/.\-](\d{1,2})$/);
        if (!match) return null;
        dayRaw = match[1];
        monthRaw = match[2];
      }
      const day = Number(dayRaw);
      const month = Number(monthRaw);
      if (!Number.isFinite(day) || !Number.isFinite(month)) return null;
      if (day < 1 || day > 31 || month < 1 || month > 12) return null;
      return { day: String(day).padStart(2, "0"), month: String(month).padStart(2, "0") };
    };
    const normalizePdfDocDayMonthValue = (value) => {
      const parsed = parsePdfDocDayMonthParts(value);
      if (!parsed) return "";
      return `${parsed.day}-${parsed.month}`;
    };
    const isValidPdfDocDateParts = (year, month, day) => {
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
      const candidate = new Date(year, month - 1, day);
      return (
        !Number.isNaN(candidate.getTime()) &&
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      );
    };
    const composePdfDocFilterIsoDate = (dayMonthValue, yearValue) => {
      const parsed = parsePdfDocDayMonthParts(dayMonthValue);
      const year = normalizePdfDocYearValue(yearValue);
      if (!parsed || !year) return "";
      const yearNum = Number(year);
      const monthNum = Number(parsed.month);
      const dayNum = Number(parsed.day);
      if (!isValidPdfDocDateParts(yearNum, monthNum, dayNum)) return "";
      return `${year}-${parsed.month}-${parsed.day}`;
    };
    const normalizePdfDocIsoDate = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return "";
      const date = new Date(parsed);
      if (Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const isPdfDocDefaultYear = (value) =>
      normalizePdfDocYearValue(value) === getCurrentPdfDocYearValue();
    const getPdfDocYearFilterLabel = (value) => {
      if (!pdfDocFilterYear) return "";
      const options = Array.from(pdfDocFilterYear.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };
    const setPdfDocYearMenuState = (isOpen) => {
      const open = !!isOpen;
      if (pdfDocFilterYearMenu) pdfDocFilterYearMenu.open = open;
      if (pdfDocFilterYearMenuToggle) {
        pdfDocFilterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };
    const syncPdfDocYearMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!pdfDocFilterYear) return "";
      const nextValue =
        value !== undefined
          ? normalizePdfDocYearValue(value)
          : normalizePdfDocYearValue(pdfDocFilterYear.value);
      if (updateSelect) pdfDocFilterYear.value = nextValue;
      if (pdfDocFilterYearDisplay) {
        pdfDocFilterYearDisplay.textContent = getPdfDocYearFilterLabel(nextValue) || nextValue;
      }
      if (pdfDocFilterYearPanel) {
        pdfDocFilterYearPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = normalizePdfDocYearValue(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setPdfDocYearMenuState(false);
      return nextValue;
    };
    const syncPdfDocDatePickerFromState = () => {
      const selectedYear =
        normalizePdfDocYearValue(pdfDocModalState.filters.year) || getCurrentPdfDocYearValue();
      const dayMonth = normalizePdfDocDayMonthValue(pdfDocModalState.filters.date);
      pdfDocModalState.filters.year = selectedYear;
      pdfDocModalState.filters.date = dayMonth;
      const isoDate = composePdfDocFilterIsoDate(dayMonth, selectedYear);
      pdfDocDatePickerController?.setValue(isoDate || "", { silent: true });
      if (pdfDocFilterDate) pdfDocFilterDate.value = dayMonth;
    };
    const syncPdfDocYearFilterOptions = (entries = pdfDocModalState.entries) => {
      if (!pdfDocFilterYear) return;
      const parseYearNumber = (value) => {
        const normalized = normalizePdfDocYearValue(value);
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const currentYear = getCurrentPdfDocYearValue();
      const selectedYearRaw = normalizePdfDocYearValue(pdfDocModalState.filters.year) || currentYear;
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(entries) ? entries : [])
        .map((entry) => parseYearNumber(pdfDocEntryDate(entry).slice(0, 4)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum = minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      pdfDocFilterYear.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        pdfDocFilterYear.appendChild(option);
      });
      const nextYear = normalizePdfDocYearValue(pdfDocModalState.filters.year) || currentYear;
      pdfDocModalState.filters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        pdfDocFilterYear.insertBefore(option, pdfDocFilterYear.firstChild);
      }
      pdfDocFilterYear.value = nextYear;
      if (pdfDocFilterYearPanel) {
        pdfDocFilterYearPanel.innerHTML = "";
        Array.from(pdfDocFilterYear.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizePdfDocYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          pdfDocFilterYearPanel.appendChild(btn);
        });
      }
      syncPdfDocYearMenuUi(nextYear);
      syncPdfDocDatePickerFromState();
    };
    const wirePdfDocYearFilterMenu = () => {
      if (
        !pdfDocFilterYearMenu ||
        !pdfDocFilterYearMenuToggle ||
        !pdfDocFilterYearPanel ||
        !pdfDocFilterYear ||
        pdfDocFilterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      pdfDocFilterYearMenu.dataset.wired = "1";
      setPdfDocYearMenuState(pdfDocFilterYearMenu.open);
      pdfDocFilterYear.addEventListener("change", () => {
        const nextYear = normalizePdfDocYearValue(pdfDocFilterYear.value) || getCurrentPdfDocYearValue();
        pdfDocFilterYear.value = nextYear;
        pdfDocModalState.filters.year = nextYear;
        syncPdfDocYearMenuUi(nextYear);
        syncPdfDocDatePickerFromState();
        handlePdfFilterChange();
      });
      pdfDocFilterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizePdfDocYearValue(btn.dataset.value || "") || getCurrentPdfDocYearValue();
        const changed = normalizePdfDocYearValue(pdfDocFilterYear.value || "") !== nextValue;
        pdfDocFilterYear.value = nextValue;
        if (changed) {
          pdfDocFilterYear.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncPdfDocYearMenuUi(nextValue);
          pdfDocModalState.filters.year = nextValue;
          syncPdfDocDatePickerFromState();
          handlePdfFilterChange();
        }
        setPdfDocYearMenuState(false);
      });
      pdfDocFilterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setPdfDocYearMenuState(!pdfDocFilterYearMenu.open);
        if (!pdfDocFilterYearMenu.open) pdfDocFilterYearMenuToggle.focus();
      });
      pdfDocFilterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setPdfDocYearMenuState(false);
        pdfDocFilterYearMenuToggle.focus();
      });
      document.addEventListener("click", (evt) => {
        if (!pdfDocFilterYearMenu?.open) return;
        if (pdfDocFilterYearMenu.contains(evt.target)) return;
        setPdfDocYearMenuState(false);
      });
      syncPdfDocYearMenuUi(pdfDocFilterYear.value);
    };
    const pdfDocEntryDate = (entry) => {
      const source = entry?.modifiedAt || entry?.createdAt || "";
      return normalizePdfDocIsoDate(source);
    };
    const applyPdfDocFilters = (entries) => {
      const filters = pdfDocModalState.filters || {};
      const numberFilter = normalizeFilterText(filters.number);
      const query = normalizeFilterText(filters.query);
      const selectedYear = normalizePdfDocYearValue(filters.year) || getCurrentPdfDocYearValue();
      pdfDocModalState.filters.year = selectedYear;
      const dateFilterDayMonth = normalizePdfDocDayMonthValue(filters.date);
      pdfDocModalState.filters.date = dateFilterDayMonth;
      const dateFilter = composePdfDocFilterIsoDate(dateFilterDayMonth, selectedYear);
      return entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
          if (numberFilter) {
            const numberCandidates = [
              entry?.number,
              entry?.name,
              entry?.relativePath,
              entry?.path,
              pathBaseName(entry?.path)
            ];
            const hasNumberMatch = numberCandidates.some((candidate) =>
              normalizeFilterText(candidate).includes(numberFilter)
            );
            if (!hasNumberMatch) return false;
          }
          if (query) {
            const candidateFields = [
              entry?.clientName,
              entry?.name,
              entry?.relativePath,
              entry?.path
            ];
            const hasMatch = candidateFields.some((field) =>
              normalizeFilterText(field).includes(query)
            );
            if (!hasMatch) return false;
          }
          const entryDate = pdfDocEntryDate(entry);
          if (!entryDate) return false;
          if (!entryDate.startsWith(`${selectedYear}-`)) return false;
          if (dateFilter && entryDate !== dateFilter) return false;
          return true;
        });
    };
    function syncPdfDocFilterControls() {
      if (pdfDocFilterNumber && pdfDocFilterNumber.value !== (pdfDocModalState.filters.number || "")) {
        pdfDocFilterNumber.value = pdfDocModalState.filters.number || "";
      }
      if (pdfDocFilterQuery && pdfDocFilterQuery.value !== (pdfDocModalState.filters.query || "")) {
        pdfDocFilterQuery.value = pdfDocModalState.filters.query || "";
      }
      const selectedYear =
        normalizePdfDocYearValue(pdfDocModalState.filters.year) || getCurrentPdfDocYearValue();
      pdfDocModalState.filters.year = selectedYear;
      syncPdfDocYearMenuUi(selectedYear, { updateSelect: true });
      syncPdfDocDatePickerFromState();
      if (pdfDocFilterClear) {
        const hasFilters =
          Boolean(pdfDocModalState.filters.number) ||
          Boolean(pdfDocModalState.filters.query) ||
          Boolean(pdfDocModalState.filters.date) ||
          !isPdfDocDefaultYear(pdfDocModalState.filters.year);
        pdfDocFilterClear.disabled = !hasFilters;
      }
    }
    function handlePdfFilterChange() {
      pdfDocModalState.page = 1;
      if (pdfDocModalState.isOpen) {
        renderPdfDocModal();
      } else {
        syncPdfDocFilterControls();
      }
    }
    const handlePdfFilterInput = (target) => {
      if (!target) return;
      if (target.id === "pdfDocFilterNumber") {
        pdfDocModalState.filters.number = target.value || "";
        handlePdfFilterChange();
      } else if (target.id === "pdfDocFilterQuery") {
        pdfDocModalState.filters.query = target.value || "";
        handlePdfFilterChange();
      } else if (target.id === "pdfDocFilterYear") {
        pdfDocModalState.filters.year =
          normalizePdfDocYearValue(target.value || "") || getCurrentPdfDocYearValue();
        syncPdfDocYearMenuUi(pdfDocModalState.filters.year, { updateSelect: true });
        syncPdfDocDatePickerFromState();
        handlePdfFilterChange();
      } else if (target.id === "pdfDocFilterDate") {
        pdfDocModalState.filters.date = normalizePdfDocDayMonthValue(target.value || "");
        if (pdfDocFilterDate) {
          pdfDocFilterDate.value = pdfDocModalState.filters.date;
        }
        syncPdfDocDatePickerFromState();
        handlePdfFilterChange();
      }
    };
    if (pdfDocFilterNumber) {
      pdfDocFilterNumber.addEventListener("input", (evt) => handlePdfFilterInput(evt.target));
    }
    if (pdfDocFilterQuery) {
      pdfDocFilterQuery.addEventListener("input", (evt) => handlePdfFilterInput(evt.target));
    }
    if (pdfDocFilterYear) {
      wirePdfDocYearFilterMenu();
      syncPdfDocYearFilterOptions(pdfDocModalState.entries);
    }
    if (pdfDocFilterDate) {
      if (createDatePicker) {
        pdfDocDatePickerController = createDatePicker(pdfDocFilterDate, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois pr\u00E9c\u00E9dent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: false,
          onChange(value) {
            pdfDocModalState.filters.date = normalizePdfDocDayMonthValue(value || "");
            if (pdfDocFilterDate) {
              pdfDocFilterDate.value = pdfDocModalState.filters.date;
            }
            handlePdfFilterChange();
          }
        });
      } else {
        pdfDocFilterDate.readOnly = false;
      }
      pdfDocFilterDate.addEventListener("input", (evt) => handlePdfFilterInput(evt.target));
      pdfDocFilterDate.addEventListener("change", (evt) => handlePdfFilterInput(evt.target));
    }
    pdfDocFilterClear?.addEventListener("click", () => {
      if (
        !pdfDocModalState.filters.number &&
        !pdfDocModalState.filters.query &&
        !pdfDocModalState.filters.date &&
        isPdfDocDefaultYear(pdfDocModalState.filters.year)
      )
        return;
      pdfDocModalState.filters.number = "";
      pdfDocModalState.filters.query = "";
      pdfDocModalState.filters.date = "";
      pdfDocModalState.filters.year = getCurrentPdfDocYearValue();
      syncPdfDocYearFilterOptions(pdfDocModalState.entries);
      syncPdfDocYearMenuUi(pdfDocModalState.filters.year, { updateSelect: true, closeMenu: true });
      if (pdfDocDatePickerController) {
        pdfDocDatePickerController.setValue("", { silent: true });
        pdfDocDatePickerController.close();
      } else if (pdfDocFilterDate) {
        pdfDocFilterDate.value = "";
      }
      handlePdfFilterChange();
    });

    const getCurrentXmlDocYearValue = getCurrentPdfDocYearValue;
    const normalizeXmlDocYearValue = normalizePdfDocYearValue;
    const normalizeXmlDocDayMonthValue = normalizePdfDocDayMonthValue;
    const composeXmlDocFilterIsoDate = (dayMonthValue, yearValue) =>
      composePdfDocFilterIsoDate(dayMonthValue, yearValue);
    const normalizeXmlDocIsoDate = normalizePdfDocIsoDate;
    const isXmlDocDefaultYear = (value) =>
      normalizeXmlDocYearValue(value) === getCurrentXmlDocYearValue();
    const getXmlDocYearFilterLabel = (value) => {
      if (!xmlDocFilterYear) return "";
      const options = Array.from(xmlDocFilterYear.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };
    const setXmlDocYearMenuState = (isOpen) => {
      const open = !!isOpen;
      if (xmlDocFilterYearMenu) xmlDocFilterYearMenu.open = open;
      if (xmlDocFilterYearMenuToggle) {
        xmlDocFilterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };
    const syncXmlDocYearMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!xmlDocFilterYear) return "";
      const nextValue =
        value !== undefined
          ? normalizeXmlDocYearValue(value)
          : normalizeXmlDocYearValue(xmlDocFilterYear.value);
      if (updateSelect) xmlDocFilterYear.value = nextValue;
      if (xmlDocFilterYearDisplay) {
        xmlDocFilterYearDisplay.textContent = getXmlDocYearFilterLabel(nextValue) || nextValue;
      }
      if (xmlDocFilterYearPanel) {
        xmlDocFilterYearPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = normalizeXmlDocYearValue(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setXmlDocYearMenuState(false);
      return nextValue;
    };
    const syncXmlDocDatePickerFromState = () => {
      const selectedYear =
        normalizeXmlDocYearValue(xmlDocModalState.filters.year) || getCurrentXmlDocYearValue();
      const dayMonth = normalizeXmlDocDayMonthValue(xmlDocModalState.filters.date);
      xmlDocModalState.filters.year = selectedYear;
      xmlDocModalState.filters.date = dayMonth;
      const isoDate = composeXmlDocFilterIsoDate(dayMonth, selectedYear);
      xmlDocDatePickerController?.setValue(isoDate || "", { silent: true });
      if (xmlDocFilterDate) xmlDocFilterDate.value = dayMonth;
    };
    const xmlDocEntryDate = (entry) => {
      const source = entry?.modifiedAt || entry?.createdAt || "";
      return normalizeXmlDocIsoDate(source);
    };
    const syncXmlDocYearFilterOptions = (entries = xmlDocModalState.entries) => {
      if (!xmlDocFilterYear) return;
      const parseYearNumber = (value) => {
        const normalized = normalizeXmlDocYearValue(value);
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const currentYear = getCurrentXmlDocYearValue();
      const selectedYearRaw = normalizeXmlDocYearValue(xmlDocModalState.filters.year) || currentYear;
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(entries) ? entries : [])
        .map((entry) => parseYearNumber(xmlDocEntryDate(entry).slice(0, 4)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum = minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      xmlDocFilterYear.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        xmlDocFilterYear.appendChild(option);
      });
      const nextYear = normalizeXmlDocYearValue(xmlDocModalState.filters.year) || currentYear;
      xmlDocModalState.filters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        xmlDocFilterYear.insertBefore(option, xmlDocFilterYear.firstChild);
      }
      xmlDocFilterYear.value = nextYear;
      if (xmlDocFilterYearPanel) {
        xmlDocFilterYearPanel.innerHTML = "";
        Array.from(xmlDocFilterYear.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizeXmlDocYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          xmlDocFilterYearPanel.appendChild(btn);
        });
      }
      syncXmlDocYearMenuUi(nextYear);
      syncXmlDocDatePickerFromState();
    };
    const wireXmlDocYearFilterMenu = () => {
      if (
        !xmlDocFilterYearMenu ||
        !xmlDocFilterYearMenuToggle ||
        !xmlDocFilterYearPanel ||
        !xmlDocFilterYear ||
        xmlDocFilterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      xmlDocFilterYearMenu.dataset.wired = "1";
      setXmlDocYearMenuState(xmlDocFilterYearMenu.open);
      xmlDocFilterYear.addEventListener("change", () => {
        const nextYear = normalizeXmlDocYearValue(xmlDocFilterYear.value) || getCurrentXmlDocYearValue();
        xmlDocFilterYear.value = nextYear;
        xmlDocModalState.filters.year = nextYear;
        syncXmlDocYearMenuUi(nextYear);
        syncXmlDocDatePickerFromState();
        handleXmlFilterChange();
      });
      xmlDocFilterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizeXmlDocYearValue(btn.dataset.value || "") || getCurrentXmlDocYearValue();
        const changed = normalizeXmlDocYearValue(xmlDocFilterYear.value || "") !== nextValue;
        xmlDocFilterYear.value = nextValue;
        if (changed) {
          xmlDocFilterYear.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncXmlDocYearMenuUi(nextValue);
          xmlDocModalState.filters.year = nextValue;
          syncXmlDocDatePickerFromState();
          handleXmlFilterChange();
        }
        setXmlDocYearMenuState(false);
      });
      xmlDocFilterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setXmlDocYearMenuState(!xmlDocFilterYearMenu.open);
        if (!xmlDocFilterYearMenu.open) xmlDocFilterYearMenuToggle.focus();
      });
      xmlDocFilterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setXmlDocYearMenuState(false);
        xmlDocFilterYearMenuToggle.focus();
      });
      document.addEventListener("click", (evt) => {
        if (!xmlDocFilterYearMenu?.open) return;
        if (xmlDocFilterYearMenu.contains(evt.target)) return;
        setXmlDocYearMenuState(false);
      });
      syncXmlDocYearMenuUi(xmlDocFilterYear.value);
    };
    const applyXmlDocFilters = (entries) => {
      const filters = xmlDocModalState.filters || {};
      const numberFilter = normalizeFilterText(filters.number);
      const query = normalizeFilterText(filters.query);
      const selectedYear = normalizeXmlDocYearValue(filters.year) || getCurrentXmlDocYearValue();
      xmlDocModalState.filters.year = selectedYear;
      const dateFilterDayMonth = normalizeXmlDocDayMonthValue(filters.date);
      xmlDocModalState.filters.date = dateFilterDayMonth;
      const dateFilter = composeXmlDocFilterIsoDate(dateFilterDayMonth, selectedYear);
      return entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
          if (numberFilter) {
            const numberCandidates = [
              entry?.reference,
              entry?.name,
              entry?.relativePath,
              entry?.path,
              pathBaseName(entry?.path)
            ];
            const hasNumberMatch = numberCandidates.some((candidate) =>
              normalizeFilterText(candidate).includes(numberFilter)
            );
            if (!hasNumberMatch) return false;
          }
          if (query) {
            const candidateFields = [
              entry?.reference,
              entry?.name,
              entry?.relativePath,
              entry?.path
            ];
            const hasMatch = candidateFields.some((field) =>
              normalizeFilterText(field).includes(query)
            );
            if (!hasMatch) return false;
          }
          const entryDate = xmlDocEntryDate(entry);
          if (!entryDate) return false;
          if (!entryDate.startsWith(`${selectedYear}-`)) return false;
          if (dateFilter && entryDate !== dateFilter) return false;
          return true;
        });
    };
    function syncXmlDocFilterControls() {
      if (xmlDocFilterNumber && xmlDocFilterNumber.value !== (xmlDocModalState.filters.number || "")) {
        xmlDocFilterNumber.value = xmlDocModalState.filters.number || "";
      }
      if (xmlDocFilterQuery && xmlDocFilterQuery.value !== (xmlDocModalState.filters.query || "")) {
        xmlDocFilterQuery.value = xmlDocModalState.filters.query || "";
      }
      const selectedYear =
        normalizeXmlDocYearValue(xmlDocModalState.filters.year) || getCurrentXmlDocYearValue();
      xmlDocModalState.filters.year = selectedYear;
      syncXmlDocYearMenuUi(selectedYear, { updateSelect: true });
      syncXmlDocDatePickerFromState();
      if (xmlDocFilterClear) {
        const hasFilters =
          Boolean(xmlDocModalState.filters.number) ||
          Boolean(xmlDocModalState.filters.query) ||
          Boolean(xmlDocModalState.filters.date) ||
          !isXmlDocDefaultYear(xmlDocModalState.filters.year);
        xmlDocFilterClear.disabled = !hasFilters;
      }
    }
    function handleXmlFilterChange() {
      xmlDocModalState.page = 1;
      if (xmlDocModalState.isOpen) {
        renderXmlDocModal();
      } else {
        syncXmlDocFilterControls();
      }
    }
    const handleXmlFilterInput = (target) => {
      if (!target) return;
      if (target.id === "xmlDocFilterNumber") {
        xmlDocModalState.filters.number = target.value || "";
        handleXmlFilterChange();
      } else if (target.id === "xmlDocFilterQuery") {
        xmlDocModalState.filters.query = target.value || "";
        handleXmlFilterChange();
      } else if (target.id === "xmlDocFilterYear") {
        xmlDocModalState.filters.year =
          normalizeXmlDocYearValue(target.value || "") || getCurrentXmlDocYearValue();
        syncXmlDocYearMenuUi(xmlDocModalState.filters.year, { updateSelect: true });
        syncXmlDocDatePickerFromState();
        handleXmlFilterChange();
      } else if (target.id === "xmlDocFilterDate") {
        xmlDocModalState.filters.date = normalizeXmlDocDayMonthValue(target.value || "");
        if (xmlDocFilterDate) {
          xmlDocFilterDate.value = xmlDocModalState.filters.date;
        }
        syncXmlDocDatePickerFromState();
        handleXmlFilterChange();
      }
    };
    if (xmlDocFilterNumber) {
      xmlDocFilterNumber.addEventListener("input", (evt) => handleXmlFilterInput(evt.target));
    }
    if (xmlDocFilterQuery) {
      xmlDocFilterQuery.addEventListener("input", (evt) => handleXmlFilterInput(evt.target));
    }
    if (xmlDocFilterYear) {
      wireXmlDocYearFilterMenu();
      syncXmlDocYearFilterOptions(xmlDocModalState.entries);
    }
    if (xmlDocFilterDate) {
      if (createDatePicker) {
        xmlDocDatePickerController = createDatePicker(xmlDocFilterDate, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois precedent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: false,
          onChange(value) {
            xmlDocModalState.filters.date = normalizeXmlDocDayMonthValue(value || "");
            if (xmlDocFilterDate) {
              xmlDocFilterDate.value = xmlDocModalState.filters.date;
            }
            handleXmlFilterChange();
          }
        });
      } else {
        xmlDocFilterDate.readOnly = false;
      }
      xmlDocFilterDate.addEventListener("input", (evt) => handleXmlFilterInput(evt.target));
      xmlDocFilterDate.addEventListener("change", (evt) => handleXmlFilterInput(evt.target));
    }
    xmlDocFilterClear?.addEventListener("click", () => {
      if (
        !xmlDocModalState.filters.number &&
        !xmlDocModalState.filters.query &&
        !xmlDocModalState.filters.date &&
        isXmlDocDefaultYear(xmlDocModalState.filters.year)
      )
        return;
      xmlDocModalState.filters.number = "";
      xmlDocModalState.filters.query = "";
      xmlDocModalState.filters.date = "";
      xmlDocModalState.filters.year = getCurrentXmlDocYearValue();
      syncXmlDocYearFilterOptions(xmlDocModalState.entries);
      syncXmlDocYearMenuUi(xmlDocModalState.filters.year, { updateSelect: true, closeMenu: true });
      if (xmlDocDatePickerController) {
        xmlDocDatePickerController.setValue("", { silent: true });
        xmlDocDatePickerController.close();
      } else if (xmlDocFilterDate) {
        xmlDocFilterDate.value = "";
      }
      handleXmlFilterChange();
    });

    const pdfDateFormatter =
      typeof Intl !== "undefined" && Intl?.DateTimeFormat
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
        : null;

    function displayFileTitle(rawName, fallback = "Document") {
      const normalized =
        typeof rawName === "string" ? rawName.trim() : rawName == null ? "" : String(rawName);
      if (!normalized) return fallback;
      const slashNormalized = normalized.replace(/\\/g, "/");
      const base = slashNormalized.split("/").pop() || normalized;
      const dotIndex = base.lastIndexOf(".");
      return dotIndex > 0 ? base.slice(0, dotIndex) : base;
    }

    function formatDateTimeDisplay(value) {
      if (!value) return "";
      try {
        const dt = value instanceof Date ? value : new Date(value);
        if (!dt || Number.isNaN(dt.getTime())) return String(value);
        return pdfDateFormatter ? pdfDateFormatter.format(dt) : dt.toLocaleString();
      } catch {
        return String(value);
      }
    }

    function formatFileSizeDisplay(bytes) {
      const value = Number(bytes);
      if (!Number.isFinite(value) || value <= 0) return "";
      if (value < 1024) return `${value.toFixed(0)} o`;
      const units = ["Ko", "Mo", "Go", "To", "Po"];
      let remaining = value;
      let unitIndex = -1;
      while (remaining >= 1024 && unitIndex < units.length - 1) {
        remaining /= 1024;
        unitIndex += 1;
      }
      const digits = remaining >= 10 ? 1 : 2;
      return `${remaining.toFixed(digits)} ${units[unitIndex] || "Ko"}`;
    }

    function docTypeDisplayName(value) {
      const normalized = String(value || "facture").toLowerCase();
      if (typeof w.docTypeLabel === "function") {
        const label = w.docTypeLabel(normalized);
        if (label && label !== "Document") return label;
      }
      const fallback = docTypeChoices.find((x) => x.docType === normalized);
      if (fallback?.label) return fallback.label;
      const pdfFallback = pdfDocTypeChoices.find((x) => x.docType === normalized);
      return pdfFallback?.label || "Document";
    }

    const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const stripDocPrefixAndDate = (value, docTypeValue) => {
      const base = String(value || "").trim();
      if (!base) return "";
      const docTypeLower = String(docTypeValue || "").toLowerCase();
      const typeLabel = docTypeDisplayName(docTypeLower) || "";
      const labelPattern = typeLabel ? new RegExp(`^${escapeRegExp(typeLabel)}[-_\\s]*`, "i") : null;
      const needsSeparator = docTypeLower && docTypeLower.length <= 2;
      const typeSuffix = needsSeparator ? "[-_\\s]+" : "[-_\\s]*";
      const typePattern = docTypeLower ? new RegExp(`^${escapeRegExp(docTypeLower)}${typeSuffix}`, "i") : null;
      let name = base;
      if (labelPattern && labelPattern.test(name)) {
        name = name.replace(labelPattern, "");
      } else if (typePattern && typePattern.test(name)) {
        name = name.replace(typePattern, "");
      }
      name = name.replace(/[-_]\d{4}-\d{2}-\d{2}$/, "");
      return name || base;
    };

    const cleanDocNameForDialog = ({ rawName, docType, fallback } = {}) => {
      const cleaned = stripDocPrefixAndDate(rawName, docType);
      const safeFallback = fallback || rawName || "Document";
      return cleaned || safeFallback;
    };

    function pathBaseName(fullPath) {
      if (!fullPath) return "";
      const str = String(fullPath);
      const normalized = str.replace(/\\+/g, "/");
      const parts = normalized.split("/");
      return parts[parts.length - 1] || normalized;
    }

    async function selectDocTypeChoice({
      title,
      message,
      fallback,
      allowedDocTypes,
      renderMessage,
      onOptionsReady,
      choices,
      confirmChoice,
      confirmText,
      onChoiceChange,
      initialChoice
    } = {}) {
      const chooser = w.showOptionsDialog;
      const normalizeDocType = (value) => String(value || "").trim().toLowerCase();
      const choicesList = Array.isArray(choices) && choices.length ? choices : docTypeChoices;
      let allowedSet =
        Array.isArray(allowedDocTypes) && allowedDocTypes.length
          ? new Set(allowedDocTypes.map((x) => normalizeDocType(x)).filter(Boolean))
          : null;
      if (allowedSet && allowedSet.size) {
        const hasMatch = choicesList.some((choice) => allowedSet.has(normalizeDocType(choice.docType)));
        if (!hasMatch) allowedSet = null;
      }

      const isDisabled = (docTypeValue) => {
        if (!allowedSet || !allowedSet.size) return false;
        return !allowedSet.has(normalizeDocType(docTypeValue));
      };
      const optionsForDialog = choicesList.map((choice) => ({
        label: choice.label,
        disabled: isDisabled(choice.docType),
        value: choice.docType
      }));
      const enabledChoices = choicesList.filter((choice) => !isDisabled(choice.docType));

      if (typeof chooser === "function") {
        const choice = await chooser({
          title: title || "Choisir un type",
          message: message || "Selectionnez un type de document :",
          options: optionsForDialog,
          renderMessage,
          onOptionsReady,
          confirmChoice,
          confirmText,
          onChoiceChange,
          initialChoice
        });
        if (choice === null || choice === undefined) return null;
        const picked = choicesList[choice] || choicesList[0];
        if (isDisabled(picked?.docType) && enabledChoices.length) return enabledChoices[0];
        return picked;
      }
      const fallbackValue = fallback || getEl("docType")?.value || getHistorySelectedType() || "facture";
      const normalized = normalizeDocType(fallbackValue || "facture");
      const preferred = choicesList.find((x) => normalizeDocType(x.docType) === normalized);
      if (!isDisabled(preferred?.docType)) return preferred || choicesList[0];
      return enabledChoices[0] || choicesList[0];
    }

    const normalizeModelName = (value) => {
      const sanitizer =
        typeof bindingHelpers.sanitizeModelName === "function"
          ? bindingHelpers.sanitizeModelName
          : (val) => (val === null || val === undefined ? "" : String(val).trim());
      const normalized = sanitizer(value);
      return normalized ? normalized.toLowerCase() : "";
    };

    async function resolveModelConfigByName(modelName) {
      const normalizedName = normalizeModelName(modelName);
      if (!normalizedName) return null;
      try {
        if (typeof bindingHelpers.ensureModelCache === "function") {
          await bindingHelpers.ensureModelCache();
        }
        const models =
          typeof SEM.getModelEntries === "function"
            ? SEM.getModelEntries()
            : typeof bindingHelpers.getModelList === "function"
            ? bindingHelpers.getModelList()
            : [];
        const list = Array.isArray(models) ? models : [];
        const match = list.find((entry) => normalizeModelName(entry?.name) === normalizedName);
        const config = match?.config;
        return config && typeof config === "object" ? config : null;
      } catch (err) {
        console.error("model config lookup failed", err);
        return null;
      }
    }

    async function resolveModelDocType(modelName) {
      const config = await resolveModelConfigByName(modelName);
      if (!config) return "";
      return String(config.docType || "").trim().toLowerCase();
    }

    function ensurePdfDocModalElements() {
      if (pdfDocModalState.overlay && pdfDocModalState.listenersBound) return;
      const overlay = getEl("pdfDocModal");
      if (!overlay) return;
      pdfDocModalState.overlay = overlay;
      pdfDocModalState.list = getEl("pdfDocModalList");
      pdfDocModalState.status = getEl("pdfDocModalStatus");
      pdfDocModalState.title = getEl("pdfDocModalTitle");
      pdfDocModalState.closeFooterBtn = getEl("pdfDocModalCloseFooter");
      pdfDocModalState.closeBtn = getEl("pdfDocModalClose");
      pdfDocModalState.prevBtn = getEl("pdfDocModalPrev");
      pdfDocModalState.nextBtn = getEl("pdfDocModalNext");
      pdfDocModalState.pageEl = getEl("pdfDocModalPage");
      pdfDocModalState.pageInput = getEl("pdfDocModalPageInput");
      pdfDocModalState.totalPagesEl = getEl("pdfDocModalTotalPages");
      if (pdfDocModalState.listenersBound) return;
      pdfDocModalState.listenersBound = true;
      pdfDocModalState.list?.addEventListener("click", onPdfDocModalListClick);
      overlay.addEventListener("click", (evt) => {
        if (evt.target === overlay) evt.stopPropagation();
      });
      pdfDocModalState.closeBtn?.addEventListener("click", () => closePdfDocModal());
      pdfDocModalState.closeFooterBtn?.addEventListener("click", () => closePdfDocModal());
      pdfDocModalState.prevBtn?.addEventListener("click", () => {
        if (pdfDocModalState.page <= 1 || pdfDocModalState.loading) return;
        pdfDocModalState.page -= 1;
        renderPdfDocModal();
      });
      pdfDocModalState.nextBtn?.addEventListener("click", () => {
        if (pdfDocModalState.loading || pdfDocModalState.page >= pdfDocModalState.totalPages) return;
        pdfDocModalState.page += 1;
        renderPdfDocModal();
      });
      if (pdfDocModalState.pageInput) {
        pdfDocModalState.pageInput.addEventListener("focus", (evt) => {
          if (evt?.target?.select) {
            try {
              evt.target.select();
            } catch {}
          }
        });
        pdfDocModalState.pageInput.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") {
            evt.preventDefault();
            applyPdfDocModalPageInput();
          } else if (evt.key === "Escape") {
            pdfDocModalState.pageInput.value = String(pdfDocModalState.page);
            pdfDocModalState.pageInput.blur();
          }
        });
        pdfDocModalState.pageInput.addEventListener("blur", applyPdfDocModalPageInput);
      }
    }

    function applyPdfDocModalPageInput() {
      const input = pdfDocModalState.pageInput;
      if (!input) return;
      const rawValue = String(input.value || "").trim();
      const hasPages = Array.isArray(pdfDocModalState.entries) && pdfDocModalState.entries.length > 0;
      const totalPages = pdfDocModalState.totalPages || 1;
      if (!rawValue) {
        input.value = hasPages ? String(pdfDocModalState.page) : "";
        return;
      }
      const requested = Number(rawValue);
      if (!Number.isFinite(requested)) {
        input.value = hasPages ? String(pdfDocModalState.page) : "";
        return;
      }
      const target = Math.min(Math.max(Math.trunc(requested), hasPages ? 1 : 0), totalPages);
      if (!hasPages) {
        input.value = "";
        return;
      }
      if (target !== pdfDocModalState.page) {
        pdfDocModalState.page = target || 1;
        renderPdfDocModal();
      } else {
        input.value = String(pdfDocModalState.page);
      }
    }

    function renderPdfDocModal() {
      if (!pdfDocModalState.list) return;
      const rawEntries = Array.isArray(pdfDocModalState.entries) ? pdfDocModalState.entries : [];
      syncPdfDocYearFilterOptions(rawEntries);
      syncPdfDocFilterControls();
      const filteredEntries = applyPdfDocFilters(rawEntries);
      const typeLabel = pdfDocModalState.docLabel || docTypeDisplayName(pdfDocModalState.docType);
      const typeLabelLower = String(typeLabel || "Document").toLowerCase();
      const total = filteredEntries.length;
      const hasFilters =
        Boolean(pdfDocModalState.filters?.number) ||
        Boolean(pdfDocModalState.filters?.query) ||
        Boolean(pdfDocModalState.filters?.date) ||
        !isPdfDocDefaultYear(pdfDocModalState.filters?.year);
      const totalPages = total ? Math.max(1, Math.ceil(total / PDF_MODAL_PAGE_SIZE)) : 1;
      pdfDocModalState.totalPages = totalPages;
      if (pdfDocModalState.page > totalPages) pdfDocModalState.page = totalPages;
      if (pdfDocModalState.page < 1) pdfDocModalState.page = 1;
      const startIdx = (pdfDocModalState.page - 1) * PDF_MODAL_PAGE_SIZE;
      const endIdx = startIdx + PDF_MODAL_PAGE_SIZE;
      const slice = filteredEntries.slice(startIdx, endIdx);

      let listHtml = "";
      if (pdfDocModalState.loading) {
        listHtml = '<div class="doc-history-modal__empty">Chargement...</div>';
      } else if (pdfDocModalState.error) {
        listHtml = `<div class="doc-history-modal__empty">${safeHtml(pdfDocModalState.error)}</div>`;
      } else if (!slice.length) {
        const emptyText = hasFilters
          ? "Aucun PDF ne correspond aux filtres appliqu\u00E9s."
          : `Aucun PDF ${safeHtml(typeLabelLower)}.`;
        listHtml = `<div class="doc-history-modal__empty">${emptyText}</div>`;
      } else {
        listHtml = slice
          .map(({ entry, index: actualIndex }) => renderPdfDocListItem(entry, actualIndex))
          .join("");
      }
      pdfDocModalState.list.innerHTML = listHtml;

      if (pdfDocModalState.status) {
        if (pdfDocModalState.loading) {
          pdfDocModalState.status.textContent = "Chargement...";
        } else if (pdfDocModalState.error) {
          pdfDocModalState.status.textContent = pdfDocModalState.error;
        } else if (total === 0) {
          pdfDocModalState.status.textContent = hasFilters
            ? "Aucun document ne correspond aux filtres appliqu\u00E9s."
            : `Aucun PDF ${typeLabelLower}.`;
        } else {
          const startDisplay = startIdx + 1;
          const endDisplay = Math.min(total, endIdx);
          pdfDocModalState.status.textContent = `Affichage ${startDisplay}\u2013${endDisplay} sur ${total} PDF ${typeLabelLower}`;
        }
      }
      const hasPages = total > 0;
      if (pdfDocModalState.pageInput) {
        pdfDocModalState.pageInput.disabled = !hasPages;
        pdfDocModalState.pageInput.min = hasPages ? "1" : "0";
        pdfDocModalState.pageInput.max = String(totalPages);
        pdfDocModalState.pageInput.value = hasPages ? String(pdfDocModalState.page) : "";
        pdfDocModalState.pageInput.setAttribute("aria-valuemin", hasPages ? "1" : "0");
        pdfDocModalState.pageInput.setAttribute("aria-valuemax", String(totalPages));
        pdfDocModalState.pageInput.setAttribute(
          "aria-valuenow",
          hasPages ? String(pdfDocModalState.page) : "0"
        );
      }
      if (pdfDocModalState.totalPagesEl) {
        pdfDocModalState.totalPagesEl.textContent = String(totalPages);
      }
      const disablePrev = pdfDocModalState.loading || pdfDocModalState.page <= 1;
      const disableNext =
        pdfDocModalState.loading || pdfDocModalState.page >= totalPages || total === 0;
      if (pdfDocModalState.prevBtn) pdfDocModalState.prevBtn.disabled = disablePrev;
      if (pdfDocModalState.nextBtn) pdfDocModalState.nextBtn.disabled = disableNext;
    }

    async function refreshPdfDocEntries({ resetPage = false } = {}) {
      if (!pdfDocModalState.overlay) return;
      if (!w.electronAPI?.listPdfDocuments) {
        pdfDocModalState.entries = [];
        pdfDocModalState.error = "Indisponible dans ce mode.";
        pdfDocModalState.loading = false;
        renderPdfDocModal();
        return;
      }
      if (resetPage) pdfDocModalState.page = 1;
      pdfDocModalState.loading = true;
      pdfDocModalState.error = null;
      renderPdfDocModal();
      try {
        const res = await w.electronAPI.listPdfDocuments({
          docType: pdfDocModalState.docType,
          subDir: pdfDocModalState.subDir
        });
        if (res?.ok && Array.isArray(res.items)) {
          pdfDocModalState.entries = res.items;
          pdfDocModalState.error = null;
        } else {
          pdfDocModalState.entries = [];
          pdfDocModalState.error = res?.error || "Impossible de recuperer les documents PDF.";
        }
      } catch (err) {
        console.error("list pdf documents failed", err);
        pdfDocModalState.entries = [];
        pdfDocModalState.error = String(err?.message || err || "Erreur inconnue.");
      } finally {
        pdfDocModalState.loading = false;
        renderPdfDocModal();
      }
    }

    const formatPdfDocDisplayName = (entry) => {
      const rawName = entry?.name || pathBaseName(entry?.path) || "";
      const withoutExt = String(rawName).replace(/\.pdf$/i, "").trim();
      if (!withoutExt) return "Document";
      const docTypeValue = String(entry?.docType || pdfDocModalState.docType || "").toLowerCase();
      const typeLabel = docTypeDisplayName(docTypeValue) || "";
      const labelPattern = typeLabel ? new RegExp(`^${escapeRegExp(typeLabel)}[-_\\s]*`, "i") : null;
      const typePattern = docTypeValue ? new RegExp(`^${escapeRegExp(docTypeValue)}[-_\\s]*`, "i") : null;
      let name = withoutExt;
      if (labelPattern && labelPattern.test(name)) {
        name = name.replace(labelPattern, "");
      } else if (typePattern && typePattern.test(name)) {
        name = name.replace(typePattern, "");
      }
      name = name.replace(/[-_]\d{4}-\d{2}-\d{2}$/, "");
      return name || withoutExt || "Document";
    };

    function renderPdfDocListItem(entry, actualIndex) {
      if (!entry) return "";
      const displayName = safeHtml(formatPdfDocDisplayName(entry));
      const docTypeValue = String(entry?.docType || pdfDocModalState.docType || "").toLowerCase();
      const clientLabel = entry.clientName ? String(entry.clientName || "").trim() : "";
      const updatedText = formatDateTimeDisplay(entry.modifiedAt || entry.createdAt);
      const clientValue =
        clientLabel.length > 0
          ? safeHtml(clientLabel.length > 60 ? `${clientLabel.slice(0, 57).trimEnd()}...` : clientLabel)
          : '<span class="client-search__empty">N.R.</span>';
      const clientHtml = docTypeValue === "rapporttv"
        ? ""
        : `<div class="client-search__detail client-search__detail--inline">
            <span class="client-search__detail-label">Client</span>
            <span class="client-search__detail-value">${clientValue}</span>
          </div>`;
      const updatedHtml = updatedText
        ? `<div class="client-search__detail client-search__detail--inline">
            <span class="client-search__detail-label">Modifi\u00E9</span>
            <span class="client-search__detail-value">${safeHtml(updatedText)}</span>
          </div>`
        : "";
      return `
        <div class="client-search__option client-saved-item doc-history-item pdf-doc-item" role="listitem">
          <button type="button" class="client-search__select client-search__select--detailed" data-pdf-open="${actualIndex}">
            <div class="client-search__details-grid">
              <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                <span class="client-search__detail-label">Document</span>
                <span class="client-search__detail-value">${displayName}</span>
              </div>
              ${clientHtml}
              ${updatedHtml}
            </div>
          </button>
          <div class="client-search__actions pdf-doc-actions">
            <button type="button" class="client-search__edit" data-pdf-open="${actualIndex}">Ouvrir</button>
            <button type="button" class="client-search__edit pdf-doc-modal__folder-btn" data-pdf-folder="${actualIndex}">Afficher dans le dossier</button>
            <button type="button" class="client-search__delete" data-pdf-delete="${actualIndex}">Supprimer</button>
          </div>
        </div>
      `;
    }

    async function onPdfDocModalListClick(evt) {
      const entries = Array.isArray(pdfDocModalState.entries) ? pdfDocModalState.entries : [];
      const openBtn = evt.target.closest("[data-pdf-open]");
      if (openBtn) {
        evt.preventDefault();
        const idx = Number(openBtn.getAttribute("data-pdf-open"));
        const entry = entries[idx];
        handlePdfDocOpen(entry);
        return;
      }
      const folderBtn = evt.target.closest("[data-pdf-folder]");
      if (folderBtn) {
        evt.preventDefault();
        const idx = Number(folderBtn.getAttribute("data-pdf-folder"));
        const entry = entries[idx];
        if (!entry || !entry.path) return;
        try {
          const opened = await w.electronAPI?.showInFolder?.(entry.path);
          if (!opened) {
            const openError = getMessage("PDF_OPEN_UNAVAILABLE", {
              fallbackText: "Impossible d'ouvrir l'emplacement du fichier.",
              fallbackTitle: "Fichier PDF"
            });
            await w.showDialog?.(openError.text, { title: openError.title });
          }
        } catch (err) {
          console.error("open pdf folder failed", err);
          const openError = getMessage("PDF_OPEN_UNAVAILABLE", {
            fallbackText: "Impossible d'ouvrir l'emplacement du fichier.",
            fallbackTitle: "Fichier PDF"
          });
          await w.showDialog?.(openError.text, { title: openError.title });
        }
        return;
      }
      const deleteBtn = evt.target.closest("[data-pdf-delete]");
      if (deleteBtn) {
        evt.preventDefault();
        const idx = Number(deleteBtn.getAttribute("data-pdf-delete"));
        handlePdfDocDelete(idx);
      }
    }

    async function handlePdfDocOpen(entry) {
      if (!entry || !entry.path) return;
      if (typeof w.previewPdfFileInModal === "function") {
        const docTypeValue = String(entry?.docType || pdfDocModalState.docType || "").toLowerCase();
        const title = formatPdfDocDisplayName(entry) || "Document PDF";
        closePdfDocModal();
        w.previewPdfFileInModal(entry.path, {
          title,
          withholding: docTypeValue === "retenue"
        });
        return;
      }
      if (!w.electronAPI?.openPath) {
        const pdfUnavailable = getMessage("PDF_OPEN_UNAVAILABLE");
        await w.showDialog?.(pdfUnavailable.text, { title: pdfUnavailable.title });
        return;
      }
      try {
        const ok = await w.electronAPI.openPath(entry.path);
        if (!ok) {
          const docError = getMessage("DOCUMENT_OPEN_FAILED");
          await w.showDialog?.(docError.text, { title: docError.title });
        }
      } catch (err) {
        console.error("open pdf failed", err);
        const docError = getMessage("DOCUMENT_OPEN_FAILED");
        await w.showDialog?.(String(err?.message || err || docError.text), { title: docError.title });
      }
    }

    async function handlePdfDocDelete(index) {
      if (index === null || index === undefined) return;
      const entries = Array.isArray(pdfDocModalState.entries) ? pdfDocModalState.entries : [];
      const entry = entries[index];
      if (!entry || !entry.path) return;
      const confirmMessage = `Supprimer ce PDF ?\n\n${entry.path}`;
      let confirmed = true;
      if (typeof w.showConfirm === "function") {
        confirmed = await w.showConfirm(confirmMessage, {
          title: "Supprimer",
          okText: "Supprimer",
          cancelText: "Annuler"
        });
      } else if (typeof w.confirm === "function") {
        confirmed = w.confirm(confirmMessage);
      }
      if (!confirmed) return;
      if (!w.electronAPI?.deleteInvoiceFile) {
        const deleteUnavailable = getMessage("DELETE_UNAVAILABLE_MODE");
        await w.showDialog?.(deleteUnavailable.text, { title: deleteUnavailable.title });
        return;
      }
      try {
        const res = await w.electronAPI.deleteInvoiceFile({ path: entry.path, number: entry.number });
        if (!res?.ok) {
          const errorText = String(res?.error || "");
          const isMissing = !!res?.missing || /introuvable/i.test(errorText);
          if (!isMissing) {
            const deleteError = getMessage("DELETE_FAILED");
            await w.showDialog?.(errorText || deleteError.text, { title: deleteError.title });
            return;
          }
        }
        entries.splice(index, 1);
        if (pdfDocModalState.page > 1) {
          const maxPage = Math.max(1, Math.ceil(entries.length / PDF_MODAL_PAGE_SIZE));
          if (pdfDocModalState.page > maxPage) pdfDocModalState.page = maxPage;
        }
        pdfDocModalState.entries = entries;
        renderPdfDocModal();
      } catch (err) {
        console.error("delete pdf failed", err);
        const deleteError = getMessage("DELETE_FAILED");
        await w.showDialog?.(String(err?.message || err || deleteError.text), { title: deleteError.title });
      }
    }

    function onPdfDocModalKeyDown(evt) {
      if (evt.key === "Escape") {
        if (pdfDocFilterYearMenu?.open) {
          evt.preventDefault();
          setPdfDocYearMenuState(false);
          try {
            pdfDocFilterYearMenuToggle?.focus?.();
          } catch {}
          return;
        }
        evt.preventDefault();
        closePdfDocModal();
      }
    }

    function closePdfDocModal() {
      if (!pdfDocModalState.overlay || !pdfDocModalState.isOpen) return;
      setPdfDocYearMenuState(false);
      pdfDocDatePickerController?.close?.();
      pdfDocModalState.overlay.classList.remove("is-open");
      pdfDocModalState.overlay.setAttribute("aria-hidden", "true");
      pdfDocModalState.overlay.hidden = true;
      document.removeEventListener("keydown", onPdfDocModalKeyDown);
      if (pdfDocModalState.previousFocus && typeof pdfDocModalState.previousFocus.focus === "function") {
        try {
          pdfDocModalState.previousFocus.focus();
        } catch {}
      }
      pdfDocModalState.previousFocus = null;
      pdfDocModalState.isOpen = false;
    }

    async function showPdfDocModal({ docType, label, subDir } = {}) {
      ensurePdfDocModalElements();
      if (!pdfDocModalState.overlay) {
        const displayUnavailable = getMessage("PDF_DISPLAY_UNAVAILABLE");
        await w.showDialog?.(displayUnavailable.text, { title: displayUnavailable.title });
        return;
      }
      const normalized = String(docType || "facture").toLowerCase();
      pdfDocModalState.docType = normalized;
      pdfDocModalState.docLabel = label || docTypeDisplayName(normalized);
      pdfDocModalState.subDir = typeof subDir === "string" ? subDir : "";
      pdfDocModalState.page = 1;
      pdfDocModalState.entries = [];
      pdfDocModalState.error = null;
      pdfDocModalState.loading = false;
      if (pdfDocModalState.title) {
        pdfDocModalState.title.textContent = `Documents PDF - ${pdfDocModalState.docLabel}`;
      }
      pdfDocModalState.overlay.hidden = false;
      pdfDocModalState.overlay.setAttribute("aria-hidden", "false");
      pdfDocModalState.overlay.classList.add("is-open");
      pdfDocModalState.isOpen = true;
      pdfDocModalState.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onPdfDocModalKeyDown);
      renderPdfDocModal();
      await refreshPdfDocEntries({ resetPage: true });
      const firstFocusable =
        pdfDocFilterNumber ||
        pdfDocFilterQuery ||
        pdfDocFilterDate ||
        pdfDocModalState.closeFooterBtn ||
        pdfDocModalState.closeBtn ||
        pdfDocModalState.prevBtn;
      if (firstFocusable && typeof firstFocusable.focus === "function") {
        try {
          firstFocusable.focus();
        } catch {}
      }
    }

    function applyXmlDocModalPageInput() {
      const input = xmlDocModalState.pageInput;
      if (!input) return;
      const value = Number(input.value);
      const hasPages = Array.isArray(xmlDocModalState.entries) && xmlDocModalState.entries.length > 0;
      const totalPages = xmlDocModalState.totalPages || 1;
      if (!Number.isFinite(value) || value <= 0) {
        input.value = hasPages ? String(xmlDocModalState.page) : "";
        return;
      }
      const target = Math.max(1, Math.min(totalPages, Math.round(value)));
      if (target !== xmlDocModalState.page) {
        xmlDocModalState.page = target || 1;
        renderXmlDocModal();
      } else {
        input.value = String(xmlDocModalState.page);
      }
    }

    function renderXmlDocModal() {
      if (!xmlDocModalState.list) return;
      const rawEntries = Array.isArray(xmlDocModalState.entries) ? xmlDocModalState.entries : [];
      syncXmlDocYearFilterOptions(rawEntries);
      syncXmlDocFilterControls();
      const filteredEntries = applyXmlDocFilters(rawEntries);
      const typeLabel = xmlDocModalState.docLabel || "XML";
      const typeLabelLower = String(typeLabel || "XML").toLowerCase();
      const total = filteredEntries.length;
      const hasFilters =
        Boolean(xmlDocModalState.filters?.number) ||
        Boolean(xmlDocModalState.filters?.query) ||
        Boolean(xmlDocModalState.filters?.date) ||
        !isXmlDocDefaultYear(xmlDocModalState.filters?.year);
      const totalPages = total ? Math.max(1, Math.ceil(total / PDF_MODAL_PAGE_SIZE)) : 1;
      xmlDocModalState.totalPages = totalPages;
      if (xmlDocModalState.page > totalPages) xmlDocModalState.page = totalPages;
      if (xmlDocModalState.page < 1) xmlDocModalState.page = 1;
      const startIdx = (xmlDocModalState.page - 1) * PDF_MODAL_PAGE_SIZE;
      const endIdx = startIdx + PDF_MODAL_PAGE_SIZE;
      const slice = filteredEntries.slice(startIdx, endIdx);

      let listHtml = "";
      if (xmlDocModalState.loading) {
        listHtml = '<div class="doc-history-modal__empty">Chargement...</div>';
      } else if (xmlDocModalState.error) {
        listHtml = `<div class="doc-history-modal__empty">${safeHtml(xmlDocModalState.error)}</div>`;
      } else if (!slice.length) {
        const emptyText = hasFilters
          ? "Aucun fichier XML ne correspond aux filtres appliques."
          : `Aucun fichier XML ${safeHtml(typeLabelLower)}.`;
        listHtml = `<div class="doc-history-modal__empty">${emptyText}</div>`;
      } else {
        listHtml = slice
          .map(({ entry, index: actualIndex }) => renderXmlDocListItem(entry, actualIndex))
          .join("");
      }
      xmlDocModalState.list.innerHTML = listHtml;

      if (xmlDocModalState.status) {
        if (xmlDocModalState.loading) {
          xmlDocModalState.status.textContent = "Chargement...";
        } else if (xmlDocModalState.error) {
          xmlDocModalState.status.textContent = xmlDocModalState.error;
        } else if (total === 0) {
          xmlDocModalState.status.textContent = hasFilters
            ? "Aucun fichier ne correspond aux filtres appliques."
            : `Aucun fichier XML ${typeLabelLower}.`;
        } else {
          const startDisplay = startIdx + 1;
          const endDisplay = Math.min(total, endIdx);
          xmlDocModalState.status.textContent = `Affichage ${startDisplay}\u2013${endDisplay} sur ${total} fichiers XML`;
        }
      }
      const hasPages = total > 0;
      if (xmlDocModalState.pageInput) {
        xmlDocModalState.pageInput.disabled = !hasPages;
        xmlDocModalState.pageInput.min = hasPages ? "1" : "0";
        xmlDocModalState.pageInput.max = String(totalPages);
        xmlDocModalState.pageInput.value = hasPages ? String(xmlDocModalState.page) : "";
        xmlDocModalState.pageInput.setAttribute("aria-valuemin", hasPages ? "1" : "0");
        xmlDocModalState.pageInput.setAttribute("aria-valuemax", String(totalPages));
        xmlDocModalState.pageInput.setAttribute(
          "aria-valuenow",
          hasPages ? String(xmlDocModalState.page) : "0"
        );
      }
      if (xmlDocModalState.totalPagesEl) {
        xmlDocModalState.totalPagesEl.textContent = String(totalPages);
      }
      const disablePrev = xmlDocModalState.loading || xmlDocModalState.page <= 1;
      const disableNext =
        xmlDocModalState.loading || xmlDocModalState.page >= totalPages || total === 0;
      if (xmlDocModalState.prevBtn) xmlDocModalState.prevBtn.disabled = disablePrev;
      if (xmlDocModalState.nextBtn) xmlDocModalState.nextBtn.disabled = disableNext;
    }

    async function refreshXmlDocEntries({ resetPage = false } = {}) {
      if (!xmlDocModalState.overlay) return;
      if (!w.electronAPI?.listXmlDocuments) {
        xmlDocModalState.entries = [];
        xmlDocModalState.error = "Indisponible dans ce mode.";
        xmlDocModalState.loading = false;
        renderXmlDocModal();
        return;
      }
      if (resetPage) xmlDocModalState.page = 1;
      xmlDocModalState.loading = true;
      xmlDocModalState.error = null;
      renderXmlDocModal();
      try {
        const res = await w.electronAPI.listXmlDocuments({
          docType: xmlDocModalState.docType,
          subDir: xmlDocModalState.subDir
        });
        if (res?.ok && Array.isArray(res.items)) {
          xmlDocModalState.entries = res.items;
          xmlDocModalState.error = null;
        } else {
          xmlDocModalState.entries = [];
          xmlDocModalState.error = res?.error || "Impossible de recuperer les fichiers XML.";
        }
      } catch (err) {
        console.error("list xml documents failed", err);
        xmlDocModalState.entries = [];
        xmlDocModalState.error = String(err?.message || err || "Erreur inconnue.");
      } finally {
        xmlDocModalState.loading = false;
        renderXmlDocModal();
      }
    }

    const formatXmlDocDisplayName = (entry) => {
      const rawName = entry?.name || pathBaseName(entry?.path) || "";
      const withoutExt = String(rawName).replace(/\.xml$/i, "").trim();
      if (!withoutExt) return "Document";
      let name = withoutExt.replace(/^xmlrs/i, "");
      name = name.replace(/^[-_\s]+/, "");
      name = name.replace(/[-_]\d{4}-\d{2}-\d{2}$/, "");
      return name || withoutExt || "Document";
    };
    const formatXmlDocFullName = (entry) => {
      const rawName = entry?.name || pathBaseName(entry?.path) || "";
      const withoutExt = String(rawName).replace(/\.xml$/i, "").trim();
      return withoutExt || rawName || "Document";
    };

    function renderXmlDocListItem(entry, actualIndex) {
      if (!entry) return "";
      const displayName = safeHtml(formatXmlDocDisplayName(entry));
      const referenceLabel = entry?.reference ? String(entry.reference || "").trim() : "";
      const updatedText = formatDateTimeDisplay(entry.modifiedAt || entry.createdAt);
      const sizeText = formatFileSizeDisplay(entry.size);
      const referenceHtml = referenceLabel
        ? `<div class="client-search__detail client-search__detail--inline">
            <span class="client-search__detail-label">Reference</span>
            <span class="client-search__detail-value">${safeHtml(referenceLabel)}</span>
          </div>`
        : "";
      const updatedHtml = updatedText
        ? `<div class="client-search__detail client-search__detail--inline">
            <span class="client-search__detail-label">Modifie</span>
            <span class="client-search__detail-value">${safeHtml(updatedText)}</span>
          </div>`
        : "";
      const sizeHtml = sizeText
        ? `<div class="client-search__detail client-search__detail--inline">
            <span class="client-search__detail-label">Taille</span>
            <span class="client-search__detail-value">${safeHtml(sizeText)}</span>
          </div>`
        : "";
      return `
        <div class="client-search__option client-saved-item doc-history-item pdf-doc-item xml-doc-item" role="listitem">
          <button type="button" class="client-search__select client-search__select--detailed" data-xml-open="${actualIndex}">
            <div class="client-search__details-grid">
              <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                <span class="client-search__detail-label">Fichier</span>
                <span class="client-search__detail-value">${displayName}</span>
              </div>
              ${referenceHtml}
              ${updatedHtml}
              ${sizeHtml}
            </div>
          </button>
          <div class="client-search__actions pdf-doc-actions">
            <button type="button" class="client-search__edit" data-xml-open="${actualIndex}">Ouvrir</button>
            <button type="button" class="client-search__edit pdf-doc-modal__folder-btn" data-xml-folder="${actualIndex}">Afficher dans le dossier</button>
            <button type="button" class="client-search__delete" data-xml-delete="${actualIndex}">Supprimer</button>
          </div>
        </div>
      `;
    }

    async function onXmlDocModalListClick(evt) {
      const entries = Array.isArray(xmlDocModalState.entries) ? xmlDocModalState.entries : [];
      const openBtn = evt.target.closest("[data-xml-open]");
      if (openBtn) {
        evt.preventDefault();
        const idx = Number(openBtn.getAttribute("data-xml-open"));
        const entry = entries[idx];
        handleXmlDocOpen(entry);
        return;
      }
      const folderBtn = evt.target.closest("[data-xml-folder]");
      if (folderBtn) {
        evt.preventDefault();
        const idx = Number(folderBtn.getAttribute("data-xml-folder"));
        const entry = entries[idx];
        if (!entry || !entry.path) return;
        try {
          const opened = await w.electronAPI?.showInFolder?.(entry.path);
          if (!opened) {
            const openError = getMessage("XML_OPEN_UNAVAILABLE", {
              fallbackText: "Impossible d'ouvrir l'emplacement du fichier.",
              fallbackTitle: "Fichier XML"
            });
            await w.showDialog?.(openError.text, { title: openError.title });
          }
        } catch (err) {
          console.error("open xml folder failed", err);
          const openError = getMessage("XML_OPEN_UNAVAILABLE", {
            fallbackText: "Impossible d'ouvrir l'emplacement du fichier.",
            fallbackTitle: "Fichier XML"
          });
          await w.showDialog?.(openError.text, { title: openError.title });
        }
        return;
      }
      const deleteBtn = evt.target.closest("[data-xml-delete]");
      if (deleteBtn) {
        evt.preventDefault();
        const idx = Number(deleteBtn.getAttribute("data-xml-delete"));
        handleXmlDocDelete(idx);
      }
    }

    async function handleXmlDocOpen(entry) {
      if (!entry || !entry.path) return;
      if (typeof w.previewXmlFileInModal === "function") {
        const title = formatXmlDocFullName(entry) || "Document";
        closeXmlDocModal();
        w.previewXmlFileInModal(entry.path, { title });
        return;
      }
      if (!w.electronAPI?.openPath) {
        const docError = getMessage("DOCUMENT_OPEN_FAILED");
        await w.showDialog?.(docError.text, { title: docError.title });
        return;
      }
      try {
        const ok = await w.electronAPI.openPath(entry.path);
        if (!ok) {
          const docError = getMessage("DOCUMENT_OPEN_FAILED");
          await w.showDialog?.(docError.text, { title: docError.title });
        }
      } catch (err) {
        console.error("open xml failed", err);
        const docError = getMessage("DOCUMENT_OPEN_FAILED");
        await w.showDialog?.(String(err?.message || err || docError.text), { title: docError.title });
      }
    }

    async function handleXmlDocDelete(index) {
      if (index === null || index === undefined) return;
      const entries = Array.isArray(xmlDocModalState.entries) ? xmlDocModalState.entries : [];
      const entry = entries[index];
      if (!entry || !entry.path) return;
      const confirmMessage = `Supprimer ce fichier XML ?\n\n${entry.path}`;
      let confirmed = true;
      if (typeof w.showConfirm === "function") {
        confirmed = await w.showConfirm(confirmMessage, {
          title: "Supprimer",
          okText: "Supprimer",
          cancelText: "Annuler"
        });
      } else if (typeof w.confirm === "function") {
        confirmed = w.confirm(confirmMessage);
      }
      if (!confirmed) return;
      if (!w.electronAPI?.deleteInvoiceFile) {
        const deleteUnavailable = getMessage("DELETE_UNAVAILABLE_MODE");
        await w.showDialog?.(deleteUnavailable.text, { title: deleteUnavailable.title });
        return;
      }
      try {
        const res = await w.electronAPI.deleteInvoiceFile({ path: entry.path, number: entry.number });
        if (!res?.ok) {
          const errorText = String(res?.error || "");
          const isMissing = !!res?.missing || /introuvable/i.test(errorText);
          if (!isMissing) {
            const deleteError = getMessage("DELETE_FAILED");
            await w.showDialog?.(errorText || deleteError.text, { title: deleteError.title });
            return;
          }
        }
        entries.splice(index, 1);
        if (xmlDocModalState.page > 1) {
          const maxPage = Math.max(1, Math.ceil(entries.length / PDF_MODAL_PAGE_SIZE));
          if (xmlDocModalState.page > maxPage) xmlDocModalState.page = maxPage;
        }
        xmlDocModalState.entries = entries;
        renderXmlDocModal();
      } catch (err) {
        console.error("delete xml failed", err);
        const deleteError = getMessage("DELETE_FAILED");
        await w.showDialog?.(String(err?.message || err || deleteError.text), { title: deleteError.title });
      }
    }

    function onXmlDocModalKeyDown(evt) {
      if (evt.key === "Escape") {
        if (xmlDocFilterYearMenu?.open) {
          evt.preventDefault();
          setXmlDocYearMenuState(false);
          try {
            xmlDocFilterYearMenuToggle?.focus?.();
          } catch {}
          return;
        }
        evt.preventDefault();
        closeXmlDocModal();
      }
    }

    function closeXmlDocModal() {
      if (!xmlDocModalState.overlay || !xmlDocModalState.isOpen) return;
      setXmlDocYearMenuState(false);
      xmlDocDatePickerController?.close?.();
      xmlDocModalState.overlay.classList.remove("is-open");
      xmlDocModalState.overlay.setAttribute("aria-hidden", "true");
      xmlDocModalState.overlay.hidden = true;
      document.removeEventListener("keydown", onXmlDocModalKeyDown);
      if (xmlDocModalState.previousFocus && typeof xmlDocModalState.previousFocus.focus === "function") {
        try {
          xmlDocModalState.previousFocus.focus();
        } catch {}
      }
      xmlDocModalState.previousFocus = null;
      xmlDocModalState.isOpen = false;
    }

    function ensureXmlDocModalElements() {
      if (xmlDocModalState.overlay && xmlDocModalState.listenersBound) return;
      const overlay = getEl("xmlDocModal");
      if (!overlay) return;
      xmlDocModalState.overlay = overlay;
      xmlDocModalState.list = getEl("xmlDocModalList");
      xmlDocModalState.status = getEl("xmlDocModalStatus");
      xmlDocModalState.title = getEl("xmlDocModalTitle");
      xmlDocModalState.closeFooterBtn = getEl("xmlDocModalCloseFooter");
      xmlDocModalState.closeBtn = getEl("xmlDocModalClose");
      xmlDocModalState.prevBtn = getEl("xmlDocModalPrev");
      xmlDocModalState.nextBtn = getEl("xmlDocModalNext");
      xmlDocModalState.pageEl = getEl("xmlDocModalPage");
      xmlDocModalState.pageInput = getEl("xmlDocModalPageInput");
      xmlDocModalState.totalPagesEl = getEl("xmlDocModalTotalPages");
      if (xmlDocModalState.listenersBound) return;
      xmlDocModalState.listenersBound = true;
      xmlDocModalState.list?.addEventListener("click", onXmlDocModalListClick);
      overlay.addEventListener("click", (evt) => {
        if (evt.target === overlay) evt.stopPropagation();
      });
      xmlDocModalState.closeBtn?.addEventListener("click", () => closeXmlDocModal());
      xmlDocModalState.closeFooterBtn?.addEventListener("click", () => closeXmlDocModal());
      xmlDocModalState.prevBtn?.addEventListener("click", () => {
        if (xmlDocModalState.page <= 1 || xmlDocModalState.loading) return;
        xmlDocModalState.page -= 1;
        renderXmlDocModal();
      });
      xmlDocModalState.nextBtn?.addEventListener("click", () => {
        if (xmlDocModalState.loading || xmlDocModalState.page >= xmlDocModalState.totalPages) return;
        xmlDocModalState.page += 1;
        renderXmlDocModal();
      });
      if (xmlDocModalState.pageInput) {
        xmlDocModalState.pageInput.addEventListener("focus", (evt) => {
          if (evt?.target?.select) {
            try {
              evt.target.select();
            } catch {}
          }
        });
        xmlDocModalState.pageInput.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") {
            evt.preventDefault();
            applyXmlDocModalPageInput();
          } else if (evt.key === "Escape") {
            xmlDocModalState.pageInput.value = String(xmlDocModalState.page);
            xmlDocModalState.pageInput.blur();
          }
        });
        xmlDocModalState.pageInput.addEventListener("blur", applyXmlDocModalPageInput);
      }
    }

    async function showXmlDocModal({ docType, label, subDir } = {}) {
      ensureXmlDocModalElements();
      if (!xmlDocModalState.overlay) {
        const openError = getMessage("OPEN_FAILED_GENERIC");
        await w.showDialog?.(openError.text, { title: openError.title });
        return;
      }
      const normalized = String(docType || "retenue").toLowerCase();
      xmlDocModalState.docType = normalized;
      xmlDocModalState.docLabel = label || "Retenue a la source XML";
      xmlDocModalState.subDir = typeof subDir === "string" ? subDir : "";
      xmlDocModalState.page = 1;
      xmlDocModalState.entries = [];
      xmlDocModalState.error = null;
      xmlDocModalState.loading = false;
      if (xmlDocModalState.title) {
        xmlDocModalState.title.textContent = `Documents XML - ${xmlDocModalState.docLabel}`;
      }
      xmlDocModalState.overlay.hidden = false;
      xmlDocModalState.overlay.setAttribute("aria-hidden", "false");
      xmlDocModalState.overlay.classList.add("is-open");
      xmlDocModalState.isOpen = true;
      xmlDocModalState.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onXmlDocModalKeyDown);
      renderXmlDocModal();
      await refreshXmlDocEntries({ resetPage: true });
      const firstFocusable =
        xmlDocFilterNumber ||
        xmlDocFilterQuery ||
        xmlDocFilterDate ||
        xmlDocModalState.closeFooterBtn ||
        xmlDocModalState.closeBtn ||
        xmlDocModalState.prevBtn;
      if (firstFocusable && typeof firstFocusable.focus === "function") {
        try {
          firstFocusable.focus();
        } catch {}
      }
    }

    if (!SEM.__documentActionsMenuBound) {
      SEM.__documentActionsMenuBound = true;
      const documentActionsMenu = getEl("documentActionsMenu");
      const documentActionsPanel = getEl("documentActionsPanel");
      const documentActionsToggle = documentActionsMenu?.querySelector("summary") || null;

      const setDocumentActionsExpanded = (open) => {
        if (!documentActionsToggle) return;
        documentActionsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };

      const closeDocumentActionsMenu = ({ restoreFocus = false } = {}) => {
        if (!documentActionsMenu?.open) return;
        documentActionsMenu.open = false;
        setDocumentActionsExpanded(false);
        if (restoreFocus && documentActionsToggle && typeof documentActionsToggle.focus === "function") {
          try {
            documentActionsToggle.focus();
          } catch {}
        }
      };

      documentActionsMenu?.addEventListener("toggle", () => {
        setDocumentActionsExpanded(!!documentActionsMenu.open);
      });

      documentActionsPanel?.addEventListener("click", (evt) => {
        const actionBtn = evt.target.closest("button");
        if (!actionBtn) return;
        closeDocumentActionsMenu({ restoreFocus: true });
      });

      document.addEventListener("click", (evt) => {
        if (documentActionsMenu?.open && !documentActionsMenu.contains(evt.target)) {
          closeDocumentActionsMenu({ restoreFocus: false });
        }
      });

      document.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        if (!documentActionsMenu?.open) return;
        evt.preventDefault();
        closeDocumentActionsMenu({ restoreFocus: true });
      });

      w.addEventListener(
        "scroll",
        () => {
          if (!documentActionsMenu?.open) return;
          closeDocumentActionsMenu({ restoreFocus: false });
        },
        { passive: true }
      );
    }

    if (!SEM.__addMenuBound) {
      SEM.__addMenuBound = true;
      const addMenu = getEl("addMenu");
      const addMenuPanel = getEl("addMenuPanel");
      const addMenuToggle = addMenu?.querySelector("summary") || null;

      const setAddMenuExpanded = (open) => {
        if (!addMenuToggle) return;
        addMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };

      const closeAddMenu = ({ restoreFocus = false } = {}) => {
        if (!addMenu?.open) return;
        addMenu.open = false;
        setAddMenuExpanded(false);
        if (restoreFocus && addMenuToggle && typeof addMenuToggle.focus === "function") {
          try {
            addMenuToggle.focus();
          } catch {}
        }
      };

      addMenu?.addEventListener("toggle", () => {
        setAddMenuExpanded(!!addMenu.open);
      });

      addMenuPanel?.addEventListener("click", (evt) => {
        const actionBtn = evt.target.closest("button");
        if (!actionBtn) return;
        closeAddMenu({ restoreFocus: true });
      });

      document.addEventListener("click", (evt) => {
        if (addMenu?.open && !addMenu.contains(evt.target)) {
          closeAddMenu({ restoreFocus: false });
        }
      });

      document.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        if (!addMenu?.open) return;
        evt.preventDefault();
        closeAddMenu({ restoreFocus: true });
      });

      w.addEventListener(
        "scroll",
        () => {
          if (!addMenu?.open) return;
          closeAddMenu({ restoreFocus: false });
        },
        { passive: true }
      );
    }

    if (!SEM.__paymentsMenuBound) {
      SEM.__paymentsMenuBound = true;
      const paymentsMenu = getEl("paymentsMenu");
      const paymentsPanel = getEl("paymentsPanel");
      const paymentsToggle = paymentsMenu?.querySelector("summary") || null;

      const setPaymentsExpanded = (open) => {
        if (!paymentsToggle) return;
        paymentsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };

      const closePaymentsMenu = ({ restoreFocus = false } = {}) => {
        if (!paymentsMenu?.open) return;
        paymentsMenu.open = false;
        setPaymentsExpanded(false);
        if (restoreFocus && paymentsToggle && typeof paymentsToggle.focus === "function") {
          try {
            paymentsToggle.focus();
          } catch {}
        }
      };

      paymentsMenu?.addEventListener("toggle", () => {
        setPaymentsExpanded(!!paymentsMenu.open);
      });

      paymentsPanel?.addEventListener("click", (evt) => {
        const actionBtn = evt.target.closest("button");
        if (!actionBtn) return;
        closePaymentsMenu({ restoreFocus: true });
      });

      document.addEventListener("click", (evt) => {
        if (paymentsMenu?.open && !paymentsMenu.contains(evt.target)) {
          closePaymentsMenu({ restoreFocus: false });
        }
      });

      document.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        if (!paymentsMenu?.open) return;
        evt.preventDefault();
        closePaymentsMenu({ restoreFocus: true });
      });

      w.addEventListener(
        "scroll",
        () => {
          if (!paymentsMenu?.open) return;
          closePaymentsMenu({ restoreFocus: false });
        },
        { passive: true }
      );
    }

    if (!SEM.__generateXmlMenuBound) {
      SEM.__generateXmlMenuBound = true;
      const generateXmlMenu = getEl("generateXmlMenu");
      const generateXmlMenuPanel = getEl("generateXmlMenuPanel");
      const generateXmlMenuToggle = generateXmlMenu?.querySelector("summary") || null;

      const setGenerateXmlMenuExpanded = (open) => {
        if (!generateXmlMenuToggle) return;
        generateXmlMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };

      const closeGenerateXmlMenu = ({ restoreFocus = false } = {}) => {
        if (!generateXmlMenu?.open) return;
        generateXmlMenu.open = false;
        setGenerateXmlMenuExpanded(false);
        if (restoreFocus && generateXmlMenuToggle && typeof generateXmlMenuToggle.focus === "function") {
          try {
            generateXmlMenuToggle.focus();
          } catch {}
        }
      };

      generateXmlMenu?.addEventListener("toggle", () => {
        setGenerateXmlMenuExpanded(!!generateXmlMenu.open);
      });

      generateXmlMenuPanel?.addEventListener("click", (evt) => {
        const actionBtn = evt.target.closest("button");
        if (!actionBtn) return;
        closeGenerateXmlMenu({ restoreFocus: true });
      });

      document.addEventListener("click", (evt) => {
        if (generateXmlMenu?.open && !generateXmlMenu.contains(evt.target)) {
          closeGenerateXmlMenu({ restoreFocus: false });
        }
      });

      document.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        if (!generateXmlMenu?.open) return;
        evt.preventDefault();
        closeGenerateXmlMenu({ restoreFocus: true });
      });

      w.addEventListener(
        "scroll",
        () => {
          if (!generateXmlMenu?.open) return;
          closeGenerateXmlMenu({ restoreFocus: false });
        },
        { passive: true }
      );
    }

    if (!SEM.__reportsMenuBound) {
      SEM.__reportsMenuBound = true;
      const reportsMenu = getEl("reportsMenu");
      const reportsPanel = getEl("reportsPanel");
      const reportsToggle = reportsMenu?.querySelector("summary") || null;

      const setReportsExpanded = (open) => {
        if (!reportsToggle) return;
        reportsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };

      const closeReportsMenu = ({ restoreFocus = false } = {}) => {
        if (!reportsMenu?.open) return;
        reportsMenu.open = false;
        setReportsExpanded(false);
        if (restoreFocus && reportsToggle && typeof reportsToggle.focus === "function") {
          try {
            reportsToggle.focus();
          } catch {}
        }
      };

      reportsMenu?.addEventListener("toggle", () => {
        setReportsExpanded(!!reportsMenu.open);
      });

      reportsPanel?.addEventListener("click", (evt) => {
        const actionBtn = evt.target.closest("button");
        if (!actionBtn) return;
        closeReportsMenu({ restoreFocus: true });
      });

      document.addEventListener("click", (evt) => {
        if (reportsMenu?.open && !reportsMenu.contains(evt.target)) {
          closeReportsMenu({ restoreFocus: false });
        }
      });

      document.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        if (!reportsMenu?.open) return;
        evt.preventDefault();
        closeReportsMenu({ restoreFocus: true });
      });

      w.addEventListener(
        "scroll",
        () => {
          if (!reportsMenu?.open) return;
          closeReportsMenu({ restoreFocus: false });
        },
        { passive: true }
      );
    }

    getEl("btnOpen")?.addEventListener("click", async () => {
      const chooser = w.showOptionsDialog;
      const openHandler = typeof w.onOpenInvoiceClick === "function" ? w.onOpenInvoiceClick : null;
      if (!openHandler) {
        if (typeof w.openInvoiceFromFilePicker === "function") {
          await w.openInvoiceFromFilePicker();
          syncInvoiceNumberControls({ force: true });
        }
        return;
      }

      if (typeof chooser !== "function") {
        await openHandler();
        const currentType = String(SEM?.state?.meta?.docType || getHistorySelectedType() || "facture").toLowerCase();
        setHistorySelectedType(currentType);
        syncInvoiceNumberControls({ force: true });
        return;
      }

      const renderOpenDocDialogMessage = (container, safeMessage, rawMessage) => {
        const doc = container.ownerDocument;
        const question = doc.createElement("p");
        question.className = "doc-dialog-question";
        question.textContent = safeMessage || rawMessage || "";

        container.textContent = "";
        container.appendChild(question);
        return container;
      };

      const selected = await selectDocTypeChoice({
        title: "Ouvrir un document",
        message: "Choisissez le type de document a ouvrir :",
        fallback: getHistorySelectedType() || "facture",
        allowedDocTypes: null,
        renderMessage: renderOpenDocDialogMessage
      });
      if (!selected) return;

      setHistorySelectedType(selected.docType);
      try {
        const opened = openHistoryModal({ docType: selected.docType });
        if (!opened) {
          await openHandler({ docType: selected.docType });
          syncInvoiceNumberControls({ force: true });
        }
      } catch (err) {
        console.error("open invoice failed", err);
        const openError = getMessage("OPEN_FAILED_GENERIC");
        await w.showDialog?.(String(err?.message || err || openError.text), { title: openError.title });
      }
    });

    getEl("docHistoryImportBtn")?.addEventListener("click", async (evt) => {
      evt.preventDefault();
      if (
        !purchaseInvoiceImport ||
        typeof purchaseInvoiceImport.openImportPurchaseInvoiceModal !== "function"
      ) {
        const unavailable = getMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Import facture d'achat indisponible.",
          fallbackTitle: "Import facture d'achat"
        });
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }

      const trigger = evt.currentTarget;
      const previousDisabled = trigger ? trigger.disabled : false;
      if (trigger) trigger.disabled = true;
      try {
        const imported = await purchaseInvoiceImport.openImportPurchaseInvoiceModal(trigger || null);
        if (imported?.canceled) return;
        if (!imported?.ok) {
          const importError = getMessage("OPEN_FAILED_GENERIC", {
            fallbackText: "Import du fichier impossible.",
            fallbackTitle: "Import facture d'achat"
          });
          await w.showDialog?.(
            String(imported?.error || importError.text),
            { title: importError.title }
          );
          return;
        }

        setHistorySelectedType("fa");
        renderHistoryList("fa");
        if (typeof openHistoryModal === "function") {
          openHistoryModal({ docType: "fa" });
        }

        const importedNumber = String(imported.number || "").trim();
        const successText = importedNumber
          ? `Facture d'achat importee: ${importedNumber}`
          : "Facture d'achat importee.";
        if (typeof w.showToast === "function") {
          w.showToast(successText);
        }
        if (imported.numberChanged && imported.sourceNumber) {
          await w.showDialog?.(
            `Le numero demande (${imported.sourceNumber}) etait deja utilise.\n` +
              `Le document a ete enregistre sous ${importedNumber || "un autre numero"}.`,
            { title: "Import facture d'achat" }
          );
        }
      } catch (err) {
        console.error("purchase invoice import failed", err);
        const importError = getMessage("OPEN_FAILED_GENERIC", {
          fallbackText: "Import du fichier impossible.",
          fallbackTitle: "Import facture d'achat"
        });
        await w.showDialog?.(String(err?.message || err || importError.text), {
          title: importError.title
        });
      } finally {
        if (trigger) trigger.disabled = previousDisabled;
      }
    });

    getEl("docModeleExportBtn")?.addEventListener("click", async (evt) => {
      evt.preventDefault();
      if (
        !modelTransferExport ||
        typeof modelTransferExport.openModelExportModal !== "function"
      ) {
        const unavailable = getMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Export de modele indisponible.",
          fallbackTitle: "Export modele"
        });
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }

      const trigger = evt.currentTarget;
      const previousDisabled = trigger ? trigger.disabled : false;
      if (trigger) trigger.disabled = true;
      try {
        const exported = await modelTransferExport.openModelExportModal(trigger || null);
        if (exported?.canceled) return;
        if (!exported?.ok) {
          const exportError = getMessage("OPEN_FAILED_GENERIC", {
            fallbackText: "Export du modele impossible.",
            fallbackTitle: "Export modele"
          });
          await w.showDialog?.(
            String(exported?.error || exportError.text),
            { title: exportError.title }
          );
          return;
        }

        if (typeof w.showToast === "function") {
          const exportedName = String(exported.name || "").trim();
          w.showToast(exportedName ? `Modele exporte: ${exportedName}` : "Modele exporte.");
        }
      } catch (err) {
        console.error("model export failed", err);
        const exportError = getMessage("OPEN_FAILED_GENERIC", {
          fallbackText: "Export du modele impossible.",
          fallbackTitle: "Export modele"
        });
        await w.showDialog?.(String(err?.message || err || exportError.text), {
          title: exportError.title
        });
      } finally {
        if (trigger) trigger.disabled = previousDisabled;
      }
    });

    getEl("docModeleImportBtn")?.addEventListener("click", async (evt) => {
      evt.preventDefault();
      if (
        !modelTransferImport ||
        typeof modelTransferImport.openModelImportModal !== "function"
      ) {
        const unavailable = getMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Import de modele indisponible.",
          fallbackTitle: "Import modele"
        });
        await w.showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }

      const trigger = evt.currentTarget;
      const previousDisabled = trigger ? trigger.disabled : false;
      if (trigger) trigger.disabled = true;
      try {
        const imported = await modelTransferImport.openModelImportModal(trigger || null);
        if (imported?.canceled) return;
        if (!imported?.ok) {
          const importError = getMessage("OPEN_FAILED_GENERIC", {
            fallbackText: "Import du modele impossible.",
            fallbackTitle: "Import modele"
          });
          await w.showDialog?.(
            String(imported?.error || importError.text),
            { title: importError.title }
          );
          return;
        }

        if (typeof w.showToast === "function") {
          const importedName = String(imported.name || "").trim();
          w.showToast(importedName ? `Modele importe: ${importedName}` : "Modele importe.");
        }
      } catch (err) {
        console.error("model import failed", err);
        const importError = getMessage("OPEN_FAILED_GENERIC", {
          fallbackText: "Import du modele impossible.",
          fallbackTitle: "Import modele"
        });
        await w.showDialog?.(String(err?.message || err || importError.text), {
          title: importError.title
        });
      } finally {
        if (trigger) trigger.disabled = previousDisabled;
      }
    });

    getEl("btnAllPdf")?.addEventListener("click", async () => {
      let selected = null;
      try {
        selected = await selectDocTypeChoice({
          title: "Documents PDF",
          message: "Choisissez le document a afficher :",
          choices: pdfDocTypeChoices
        });
      } catch (err) {
        console.error("selectDocTypeChoice failed", err);
      }
      if (!selected) {
        selected = docTypeChoices[0] || { docType: "facture", label: "Facture" };
      }

      if (typeof w.electronAPI?.listPdfDocuments === "function") {
        await showPdfDocModal({
          docType: selected.docType,
          label: selected.label,
          subDir: selected.subDir
        });
        return;
      }

      const folderOpener = w.electronAPI?.openInvoiceFolder;
      if (!folderOpener) {
        const folderUnavailable = getMessage("FOLDER_OPEN_UNAVAILABLE");
        await w.showDialog?.(folderUnavailable.text, { title: folderUnavailable.title });
        return;
      }
      try {
        const res = await folderOpener({
          docType: selected.docType,
          scope: "pdf",
          subDir: selected.subDir
        });
        if (!res?.ok && !res?.canceled) {
          const folderError = getMessage("FOLDER_OPEN_FAILED");
          await w.showDialog?.(res?.error || folderError.text, { title: folderError.title });
        }
      } catch (err) {
        console.error("open pdf folder failed", err);
        const folderError = getMessage("FOLDER_OPEN_FAILED");
        await w.showDialog?.(String(err?.message || err) || folderError.text, { title: folderError.title });
      }
    });

    getEl("btnAllXml")?.addEventListener("click", async () => {
      let selected = null;
      const xmlChoices = [
        {
          label: "Retenue a la source FA",
          docType: "retenue",
          subDir: "retenues/factureAchat"
        },
        {
          label: "Retenue a la source Facture",
          docType: "retenue",
          subDir: "retenues/facture"
        }
      ];
      try {
        selected = await selectDocTypeChoice({
          title: "Documents XML",
          message: "Choisissez le document XML a afficher :",
          choices: xmlChoices
        });
      } catch (err) {
        console.error("selectDocTypeChoice failed", err);
      }
      if (!selected) return;

      await showXmlDocModal({
        docType: selected.docType,
        label: selected.label,
        subDir: selected.subDir
      });
    });

    getEl("btnOpenDataDir")?.addEventListener("click", async () => {
      const folderUnavailable = getMessage("FOLDER_OPEN_UNAVAILABLE");
      if (!w.electronAPI?.openFacturanceDataDir) {
        await w.showDialog?.(folderUnavailable.text, { title: folderUnavailable.title });
        return;
      }
      try {
        const res = await w.electronAPI.openFacturanceDataDir();
        if (!res?.ok && !res?.canceled) {
          const folderError = getMessage("FOLDER_OPEN_FAILED");
          await w.showDialog?.(res?.error || folderError.text, { title: folderError.title });
        }
      } catch (err) {
        console.error("open data dir failed", err);
        const folderError = getMessage("FOLDER_OPEN_FAILED");
        await w.showDialog?.(String(err?.message || err) || folderError.text, { title: folderError.title });
      }
    });

    getEl("docType")?.addEventListener(
      "change",
      (e) => {
      const next = String(e.target.value || "facture").toLowerCase();
      const meta = getInvoiceMeta();
      const previous = String(meta.docType || "facture").toLowerCase();
      const invInput = getEl("invNumber");
      const docTypeChanged = next !== previous;

      meta.docType = next;
      setHistorySelectedType(next);
      renderHistoryList(next);

      if (docTypeChanged) {
        if (meta.historyPath && typeof w.releaseDocumentEditLock === "function") {
          w.releaseDocumentEditLock(meta.historyPath);
        }
        delete meta.historyPath;
        delete meta.historyStatus;
        delete meta.status;
        delete meta.historyDocType;
        if (typeof meta === "object") {
          meta.number = "";
        }
        if (invInput) invInput.value = "";
      } else if (invInput && meta.number && invInput.value !== meta.number) {
        invInput.value = meta.number;
      }

      const hasExistingNumber = Boolean((invInput?.value || meta.number || "").trim());
      syncInvoiceNumberControls({
        force: true,
        useNextIfEmpty: !hasExistingNumber,
        overrideWithNext: docTypeChanged
      });
      },
      true
    );

    const normalizeNumberKey = (value) =>
      String(value ?? "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, "")
        .toLowerCase();
    const collectDocTypesForUniqueness = () => {
      const types = new Set();
      const collect = (items) => {
        if (!Array.isArray(items)) return;
        items.forEach((item) => {
          const docTypeValue = item && typeof item === "object" ? item.docType : item;
          const normalized = String(docTypeValue || "").trim().toLowerCase();
          if (normalized) types.add(normalized);
        });
      };
      collect(docTypeChoices);
      collect(pdfDocTypeChoices);
      return Array.from(types);
    };
    const findNumberConflicts = (number, currentPath) => {
      const key = normalizeNumberKey(number);
      if (!key) return [];
      const historyFn =
        typeof w.getDocumentHistoryFull === "function"
          ? w.getDocumentHistoryFull
          : typeof w.getDocumentHistory === "function"
            ? w.getDocumentHistory
            : null;
      if (!historyFn) return [];
      const seenPaths = new Set();
      const conflicts = [];
      const docTypes = collectDocTypesForUniqueness();
      docTypes.forEach((docTypeValue) => {
        const docType = String(docTypeValue || "").trim().toLowerCase();
        if (!docType || docType === "fa") return;
        const entries = historyFn(docType) || [];
        entries.forEach((entry) => {
          if (!entry) return;
          const entryNumber = normalizeNumberKey(entry.number ?? entry.meta?.number ?? entry.name ?? "");
          if (!entryNumber || entryNumber !== key) return;
          const entryPath = String(entry.path || "");
          if (currentPath && entryPath && entryPath === currentPath) return;
          if (entryPath && seenPaths.has(entryPath)) return;
          if (entryPath) seenPaths.add(entryPath);
          conflicts.push({
            docType,
            path: entryPath,
            number: entry.number ?? "",
            name: entry.name ?? ""
          });
        });
      });
      return conflicts;
    };
    const promptReplaceConflicts = async (number, conflicts) => {
      if (!conflicts.length) return true;
      const formatConflictLabel = (conflict) => {
        const storedPath = String(conflict?.path || "").trim();
        if (!storedPath) return "";
        return displayFileTitle(storedPath, "").trim();
      };
      const labels = new Set();
      conflicts.forEach((conflict) => {
        const label = formatConflictLabel(conflict);
        if (label) labels.add(label);
      });
      const typeList = Array.from(labels).join(", ");
      const displayNumber = String(number || "").trim();
      const numberText = displayNumber ? ` ${displayNumber}` : "";
      const targetSuffix = typeList ? ` pour ${typeList}` : "";
      const message = `Le numero${numberText} existe deja${targetSuffix}. Il sera remplace si vous continuez.`;
      if (typeof w.showConfirm === "function") {
        return await w.showConfirm(message, {
          title: "Fichier existant",
          okText: "Remplacer",
          cancelText: "Annuler"
        });
      }
      if (typeof w.confirm === "function") return w.confirm(message);
      return true;
    };
    const removeConflictingEntries = async (conflicts) => {
      if (!conflicts.length) return true;
      const recomputeTargets = new Set();
      for (const conflict of conflicts) {
        if (!conflict?.path) continue;
        if (w.electronAPI?.deleteInvoiceFile) {
          const res = await w.electronAPI.deleteInvoiceFile({ path: conflict.path, number: conflict.number });
          if (res?.ok === false) {
            const errorText = String(res?.error || "");
            const isMissing = !!res?.missing || /introuvable/i.test(errorText);
            if (!isMissing) {
              const msg = getMessage("HISTORY_FILE_DELETE_FAILED");
              await w.showDialog?.(errorText || msg.text, { title: msg.title || "Erreur" });
              return false;
            }
          }
        }
        if (typeof w.removeDocumentHistory === "function") {
          w.removeDocumentHistory(conflict.docType, conflict.path);
        }
        if (conflict.docType === "facture" && typeof w.removePaymentHistoryForInvoice === "function") {
          if (typeof w.hydratePaymentHistory === "function") {
            try {
              await w.hydratePaymentHistory();
            } catch {}
          }
          try {
            w.removePaymentHistoryForInvoice(conflict.path);
          } catch {}
        }
        recomputeTargets.add(conflict.docType);
      }
      if (typeof w.recomputeDocumentNumbering === "function") {
        recomputeTargets.forEach((docType) => {
          if (!docType || docType === "fa") return;
          try {
            w.recomputeDocumentNumbering(docType);
          } catch (err) {
            console.warn("recomputeDocumentNumbering failed", err);
          }
        });
      }
      return true;
    };

    const handleDocumentSave = async ({ skipClientLedger = false, preserveLedgerEntryIds = false } = {}) => {
      if (!w.electronAPI?.saveInvoiceJSON) {
        if (typeof w.saveInvoiceJSON === "function") await w.saveInvoiceJSON();
        return;
      }
      const hasServerNumbering = typeof w.electronAPI?.previewDocumentNumber === "function";
      try {
        try {
          w.__includeCompanyForSave = true;
        } catch {}
        if (w.SEM?.readInputs) w.SEM.readInputs();
        else if (typeof w.readInputs === "function") w.readInputs();
        if (w.SEM?.computeTotals) w.SEM.computeTotals();

        const snapshot = SEM.captureForm?.({ includeCompany: true }) || null;
        if (!snapshot || typeof snapshot !== "object") {
        const formError = getMessage("FORM_CAPTURE_FAILED");
        await w.showDialog?.(formError.text, { title: formError.title });
          return;
        }

        const st = SEM.state || (SEM.state = {});
        const baseMeta = {
          ...(snapshot.meta && typeof snapshot.meta === "object" ? snapshot.meta : {}),
          ...(st.meta && typeof st.meta === "object" ? st.meta : {})
        };
        const docTypeRaw = baseMeta.docType || getEl("docType")?.value || "facture";
        const docType = String(docTypeRaw || "facture").trim().toLowerCase() || "facture";
        const dateRaw = baseMeta.date || getEl("invDate")?.value;
        const date = String(dateRaw || "").trim() || new Date().toISOString().slice(0, 10);
        const numberRaw = baseMeta.number ?? getEl("invNumber")?.value ?? "";
        let number = String(numberRaw || "").trim();
        const lengthRaw =
          baseMeta.numberLength ??
          getEl("invNumberLength")?.value ??
          (st.meta && typeof st.meta.numberLength !== "undefined" ? st.meta.numberLength : 4);
        const numberLength = normalizeInvoiceLength(lengthRaw, st.meta?.numberLength || 4);

        const stateMeta = st.meta || (st.meta = {});
        const numberYear =
          extractYearDigits(date) ||
          extractYearDigits(baseMeta.numberYear) ||
          stateMeta.numberYear ||
          getInvoiceYear();
        stateMeta.docType = docType;
        stateMeta.date = date;
        stateMeta.number = number;
        stateMeta.numberLength = numberLength;
        stateMeta.numberYear = numberYear || null;
        if (snapshot.meta && typeof snapshot.meta === "object") {
          snapshot.meta.docType = docType;
          snapshot.meta.date = date;
          snapshot.meta.number = number;
          snapshot.meta.numberLength = numberLength;
          snapshot.meta.numberYear = numberYear || null;
        }

        const sanitizeModelNameForMeta =
          typeof bindingHelpers.sanitizeModelName === "function"
            ? bindingHelpers.sanitizeModelName
            : (value) => String(value ?? "").trim();
        const firstNonEmptyString = (...values) => {
          for (const value of values) {
            const str = String(value == null ? "" : value).trim();
            if (str) return str;
          }
          return "";
        };
        const resolvedModelName = sanitizeModelNameForMeta(
          firstNonEmptyString(
            stateMeta.documentModelName,
            stateMeta.docDialogModelName,
            stateMeta.modelName,
            stateMeta.modelKey,
            snapshot?.meta?.documentModelName,
            snapshot?.meta?.docDialogModelName,
            snapshot?.meta?.modelName,
            snapshot?.meta?.modelKey,
            baseMeta.documentModelName,
            baseMeta.docDialogModelName,
            baseMeta.modelName,
            baseMeta.modelKey
          )
        );
        if (resolvedModelName) {
          stateMeta.documentModelName = resolvedModelName;
          stateMeta.docDialogModelName = resolvedModelName;
          stateMeta.modelName = resolvedModelName;
          stateMeta.modelKey = resolvedModelName;
          baseMeta.documentModelName = resolvedModelName;
          baseMeta.docDialogModelName = resolvedModelName;
          baseMeta.modelName = resolvedModelName;
          baseMeta.modelKey = resolvedModelName;
          if (snapshot.meta && typeof snapshot.meta === "object") {
            snapshot.meta.documentModelName = resolvedModelName;
            snapshot.meta.docDialogModelName = resolvedModelName;
            snapshot.meta.modelName = resolvedModelName;
            snapshot.meta.modelKey = resolvedModelName;
          }

          let resolvedTemplate = firstNonEmptyString(
            stateMeta.template,
            snapshot?.meta?.template,
            baseMeta.template
          );
          if (!resolvedTemplate) {
            const modelConfig = await resolveModelConfigByName(resolvedModelName);
            resolvedTemplate = firstNonEmptyString(modelConfig?.template);
          }
          if (resolvedTemplate) {
            stateMeta.template = resolvedTemplate;
            baseMeta.template = resolvedTemplate;
            if (snapshot.meta && typeof snapshot.meta === "object") {
              snapshot.meta.template = resolvedTemplate;
            }
          }
        }

        const normalizedDocType = String(docType || "").trim().toLowerCase();
        if (!hasServerNumbering && normalizedDocType !== "fa" && number) {
          try {
            await hydrateHistoryFromDiskOnce();
          } catch {}
          const currentPath =
            typeof baseMeta.historyPath === "string" ? baseMeta.historyPath.trim() : "";
          const conflicts = findNumberConflicts(number, currentPath);
          if (conflicts.length) {
            const confirmed = await promptReplaceConflicts(number, conflicts);
            if (!confirmed) return;
            const removed = await removeConflictingEntries(conflicts);
            if (!removed) return;
          }
        }

        let payeePaymentDelta = null;
        const isItemsModalEditSave = (() => {
          const itemsModal = getEl("itemsDocOptionsModal");
          const isItemsModalOpen = !!(
            itemsModal &&
            itemsModal.classList.contains("is-open") &&
            itemsModal.getAttribute("aria-hidden") === "false"
          );
          if (!isItemsModalOpen) return false;
          const historyPath = String(
            stateMeta?.historyPath || baseMeta?.historyPath || snapshot?.meta?.historyPath || ""
          ).trim();
          return !!historyPath;
        })();
        if (docType === "facture" && !isItemsModalEditSave) {
          const statusFromMeta = stateMeta.status || baseMeta.status || "";
          const acompteEnabledForStatus = !!(baseMeta.acompte?.enabled || stateMeta.acompte?.enabled);
          const statusFallback = acompteEnabledForStatus ? "partiellement-payee" : "";
          const paymentSelection = await promptFacturePaymentMeta({
            paymentMethod: stateMeta.paymentMethod || baseMeta.paymentMethod || baseMeta.mode || "",
            status: statusFromMeta || statusFallback,
            paymentRef: stateMeta.paymentRef || baseMeta.paymentRef || "",
            paymentReference: stateMeta.paymentReference || baseMeta.paymentReference || ""
          });
          if (!paymentSelection) return;
          const { paymentMethod, status, paymentRef, paymentReference } = paymentSelection;
          const resolvedPaymentRef = paymentReference || paymentRef || "";
          stateMeta.paymentMethod = paymentMethod;
          stateMeta.status = status;
          stateMeta.paymentRef = resolvedPaymentRef;
          stateMeta.paymentReference = resolvedPaymentRef;
          if (snapshot.meta && typeof snapshot.meta === "object") {
            snapshot.meta.paymentMethod = paymentMethod;
            snapshot.meta.status = status;
            snapshot.meta.paymentRef = resolvedPaymentRef;
            snapshot.meta.paymentReference = resolvedPaymentRef;
          }
          baseMeta.paymentMethod = paymentMethod;
          baseMeta.status = status;
          baseMeta.paymentRef = resolvedPaymentRef;
          baseMeta.paymentReference = resolvedPaymentRef;
          const normalizedStatus = String(status || "").trim().toLowerCase();
          if (normalizedStatus === "payee") {
            const totals =
              snapshot.totals && typeof snapshot.totals === "object"
                ? snapshot.totals
                : (snapshot.totals = {});
            const totalsAcompte =
              totals.acompte && typeof totals.acompte === "object"
                ? totals.acompte
                : (totals.acompte = {});
            const metaObj =
              snapshot.meta && typeof snapshot.meta === "object" ? snapshot.meta : (snapshot.meta = {});
            const metaAcompte =
              metaObj.acompte && typeof metaObj.acompte === "object"
                ? metaObj.acompte
                : (metaObj.acompte = {});
            const totalValue = Number(
              totals.totalTTC ?? totals.total ?? totals.grand ?? totals.totalHT ?? totals.totalHt ?? NaN
            );
            const previousPaidRaw = Number(
              stateMeta.acompte?.paid ??
                baseMeta.acompte?.paid ??
                totalsAcompte.paid ??
                totals.paid ??
                metaAcompte.paid ??
                NaN
            );
            const previousPaid = Number.isFinite(previousPaidRaw) ? previousPaidRaw : 0;
            const paymentDateValue =
              stateMeta.paymentDate ||
              baseMeta.paymentDate ||
              date ||
              new Date().toISOString().slice(0, 10);
            if (paymentDateValue) {
              stateMeta.paymentDate = paymentDateValue;
              baseMeta.paymentDate = paymentDateValue;
              metaObj.paymentDate = paymentDateValue;
            }
            if (Number.isFinite(totalValue) && totalValue > 0) {
              totals.balanceDue = 0;
              totalsAcompte.enabled = true;
              totalsAcompte.paid = totalValue;
              totalsAcompte.base = totalValue;
              totalsAcompte.remaining = 0;
              metaAcompte.enabled = true;
              metaAcompte.paid = totalValue;
              stateMeta.acompte = metaAcompte;
              baseMeta.acompte = metaAcompte;
              payeePaymentDelta = Math.max(0, totalValue - previousPaid);
            }
          }
        }

        const meta = {
          ...baseMeta,
          docType,
          date,
          number,
          numberLength,
          numberYear,
          status: baseMeta.status || stateMeta.status || "",
          silent: true,
          to: "invoices"
        };
        const slugFile =
          typeof w.slugForFile === "function"
            ? w.slugForFile
            : (s) => String(s ?? "")
                .replace(/[\\/:*?"<>|]/g, "-")
                .replace(/\s+/g, "")
                .trim();
        const grammar = DOC_TYPE_GRAMMAR[docType] || {};
        const feminineDoc = grammar.feminine === true;
        const article = grammar.article || (feminineDoc ? "La" : "Le");

        if (baseMeta.historyPath && typeof w.docLockTouch === "function") {
          const lockResult = await w.docLockTouch(baseMeta.historyPath);
          if (!lockResult?.ok) {
            const lockMessage = getMessage("DOCUMENT_EDIT_LOCKED", {
              fallbackText: lockResult?.error || "Document deja ouvert en modification.",
              fallbackTitle: "Modification impossible"
            });
            await w.showDialog?.(lockMessage.text, { title: lockMessage.title });
            return;
          }
        }

        let res = await w.electronAPI.saveInvoiceJSON({ data: snapshot, meta });
        const outOfSequence = res?.reason === "number_out_of_sequence";
        if ((res?.reason === "number_changed" || outOfSequence) && res?.suggestedNumber) {
          const suggestedNumber = String(res.suggestedNumber || "").trim();
          if (!suggestedNumber) return;
          const activeNumber = String(number || "").trim();
          const previewNumber = activeNumber || suggestedNumber;
          const changeMessage = outOfSequence
            ? `Ce numero ne suit pas la sequence.\n` +
              `Le prochain numero disponible est ${suggestedNumber}.\n\n` +
              `Voulez-vous continuer avec ${previewNumber} ?`
            : `Un autre document utilise deja ce numero.\n` +
              `Le nouveau numero sera ${suggestedNumber}.\n\n` +
              "Voulez-vous continuer ?";
          let confirmed = false;
          if (typeof w.showConfirm === "function") {
            confirmed = await w.showConfirm(changeMessage, {
              title: outOfSequence ? "Numero hors sequence" : "Numero deja utilise",
              okText: "Continuer",
              cancelText: "Annuler"
            });
          } else if (typeof w.confirm === "function") {
            confirmed = w.confirm(changeMessage);
          }
          if (!confirmed) return;

          if (!outOfSequence) {
            number = suggestedNumber;
            meta.number = suggestedNumber;
            meta.previewNumber = suggestedNumber;
            if (snapshot.meta && typeof snapshot.meta === "object") {
              snapshot.meta.number = suggestedNumber;
              snapshot.meta.previewNumber = suggestedNumber;
            }
            baseMeta.number = suggestedNumber;
            baseMeta.previewNumber = suggestedNumber;
            stateMeta.number = suggestedNumber;
            stateMeta.previewNumber = suggestedNumber;

            const invNumberInput = getEl("invNumber");
            if (invNumberInput && invNumberInput.value !== suggestedNumber) {
              invNumberInput.value = suggestedNumber;
            }
            const invNumberSuffix = getEl("invNumberSuffix");
            if (invNumberSuffix) {
              const suffixValue = integerOrNull(suggestedNumber);
              if (suffixValue !== null) invNumberSuffix.value = String(suffixValue);
            }
          }

          res = await w.electronAPI.saveInvoiceJSON({
            data: snapshot,
            meta: outOfSequence
              ? { ...meta, acceptNumberChange: true, allowProvidedNumber: true }
              : { ...meta, acceptNumberChange: true }
          });
        }
        if (res?.ok) {
          try {
            if (typeof w.invalidatePdfPreviewCache === "function") {
              w.invalidatePdfPreviewCache({ closeModal: true });
            }
          } catch {}
          const savedNumberRaw = String(res?.number || number || "").trim();
          const savedNumber = savedNumberRaw || number || "";
          const previewNumber =
            String(res?.previewNumber || baseMeta.previewNumber || snapshot?.meta?.previewNumber || "").trim();
          const numberChanged =
            !!res?.numberChanged || (previewNumber && savedNumber && previewNumber !== savedNumber);

          if (savedNumber) {
            const prefixFromServer = typeof res?.prefix === "string" ? res.prefix.trim() : "";
            stateMeta.number = savedNumber;
            stateMeta.previewNumber = savedNumber;
            if (prefixFromServer) stateMeta.numberPrefix = prefixFromServer;
            if (snapshot.meta && typeof snapshot.meta === "object") {
              snapshot.meta.number = savedNumber;
              snapshot.meta.previewNumber = savedNumber;
              if (prefixFromServer) snapshot.meta.numberPrefix = prefixFromServer;
            }
            baseMeta.number = savedNumber;
            baseMeta.previewNumber = savedNumber;
            if (prefixFromServer) baseMeta.numberPrefix = prefixFromServer;
            meta.number = savedNumber;
            meta.previewNumber = savedNumber;
            if (prefixFromServer) meta.numberPrefix = prefixFromServer;
            const invNumberInput = getEl("invNumber");
            if (invNumberInput && invNumberInput.value !== savedNumber) {
              invNumberInput.value = savedNumber;
            }
            const invNumberSuffix = getEl("invNumberSuffix");
            if (invNumberSuffix) {
              const suffixValue = integerOrNull(savedNumber);
              if (suffixValue !== null) invNumberSuffix.value = String(suffixValue);
            }
            const invNumberPrefix = getEl("invNumberPrefix");
            if (invNumberPrefix && prefixFromServer && !invNumberPrefix.value.trim()) {
              invNumberPrefix.value = prefixFromServer;
            }
          }

          const label = typeof w.docTypeLabel === "function" ? w.docTypeLabel(docType) : "Document";
          const docReferenceRaw = String(savedNumber || "").trim();
          const docReference = docType === "fa" ? ensureFaNumberPrefix(docReferenceRaw) : docReferenceRaw;
          const fileDisplayName = cleanDocNameForDialog({
            rawName: docReference || displayFileTitle(res.path, label),
            docType,
            fallback: docReference || displayFileTitle(res.path, label)
          });
          const suffixStatus = saveStatusText(feminineDoc);
          const savedTemplate =
            typeof dialogTemplates.filenameStatusMessage === "function"
              ? dialogTemplates.filenameStatusMessage({
                  article,
                  filename: fileDisplayName,
                  suffixText: suffixStatus
                })
              : null;
          const successSentence = savedTemplate?.text || `${article} ${fileDisplayName} ${suffixStatus}`;
          let historyUpdated = false;
          let historySummary = null;
          if (typeof w.addDocumentHistory === "function") {
            try {
              historySummary = captureHistorySummary();
              w.addDocumentHistory({
                docType,
                path: res.path,
                number: savedNumber,
                date,
                name: res.name,
                clientName: historySummary.clientName,
                clientAccount: historySummary.clientAccount,
                totalHT: historySummary.totalHT,
                totalTTC: historySummary.totalTTC,
                currency: historySummary.currency,
                paid: historySummary.paid,
                balanceDue: historySummary.balanceDue,
                acompteEnabled: historySummary.acompteEnabled,
                reglementEnabled: historySummary.reglementEnabled,
                reglementText: historySummary.reglementText,
                status: stateMeta?.status,
                paymentMethod: stateMeta?.paymentMethod,
                paymentRef: stateMeta?.paymentRef || stateMeta?.paymentReference,
                paymentReference: stateMeta?.paymentReference || stateMeta?.paymentRef,
                hasComment: !!String(stateMeta?.noteInterne || "").trim(),
                convertedFrom: stateMeta?.convertedFrom
              });
              historyUpdated = true;
            } catch (historyErr) {
              console.warn("document history update failed", historyErr);
            }
          }
          const historyStatus = String(stateMeta?.status || "").trim().toLowerCase();
          const isPaidStatus = historyStatus === "payee";
          let paidValue = Number(historySummary?.paid ?? NaN);
          let balanceDueValue = historySummary?.balanceDue;
          if ((!Number.isFinite(paidValue) || paidValue <= 0) && isPaidStatus) {
            const totalValue = Number(historySummary?.totalTTC ?? historySummary?.totalHT ?? NaN);
            if (Number.isFinite(totalValue) && totalValue > 0) {
              paidValue = totalValue;
              balanceDueValue = 0;
            }
          }
          const canCheckHistory = typeof w.hasPaymentHistoryForInvoice === "function";
          if (
            Number.isFinite(paidValue) &&
            paidValue > 0 &&
            typeof w.addPaymentHistoryEntry === "function" &&
            (historyStatus !== "payee" || (Number.isFinite(payeePaymentDelta) && payeePaymentDelta > 0))
          ) {
            if (typeof w.hydratePaymentHistory === "function") {
              await w.hydratePaymentHistory({ skipInvoiceSync: true });
            }
            const paymentDate = stateMeta?.paymentDate || date;
            let paymentAmount =
              historyStatus === "payee" && Number.isFinite(payeePaymentDelta)
                ? payeePaymentDelta
                : paidValue;
            if (historyStatus !== "payee" && canCheckHistory && w.hasPaymentHistoryForInvoice(res.path)) {
              paymentAmount = 0;
            }
            if (Number.isFinite(paymentAmount) && paymentAmount > 0) {
              w.addPaymentHistoryEntry({
                invoiceNumber: savedNumber,
                invoicePath: res.path,
                clientName: historySummary?.clientName,
                clientAccount: historySummary?.clientAccount,
                paymentDate,
                amount: paymentAmount,
                balanceDue: balanceDueValue,
                currency: historySummary?.currency,
                mode: stateMeta?.paymentMethod,
                paymentRef: stateMeta?.paymentRef,
                entryType: "invoice"
              });
            }
          }
          if (
            isNoPaymentMethodStatus(historyStatus) &&
            typeof w.removePaymentHistoryForInvoice === "function" &&
            res?.path
          ) {
            if (typeof w.hydratePaymentHistory === "function") {
              await w.hydratePaymentHistory();
            }
            w.removePaymentHistoryForInvoice(res.path);
          }
          if (docType === "facture" && res?.path && !skipClientLedger) {
            try {
              const ledgerSummary = historySummary || captureHistorySummary();
              const clientPath =
                String(snapshot?.client?.__path || "").trim() ||
                String(SEM?.state?.client?.__path || "").trim() ||
                String(SEM?.clientFormBaseline?.__path || "").trim();
              if (clientPath) {
                const taxId = String(
                  snapshot?.client?.identifiantFiscal ||
                    snapshot?.client?.vat ||
                    snapshot?.client?.tva ||
                    ""
                ).trim();
                const invoiceTotal =
                  ledgerSummary?.totalTTC ??
                  ledgerSummary?.totalHT ??
                  snapshot?.totals?.totalTTC ??
                  snapshot?.totals?.totalHT ??
                  NaN;
                const paymentRefValue = String(
                  stateMeta?.paymentReference || stateMeta?.paymentRef || ""
                ).trim();
                await syncInvoiceLedger({
                  clientPath,
                  taxId,
                  invoicePath: res.path,
                  invoiceNumber: savedNumber,
                  invoiceDate: date,
                  invoiceTotal,
                  status: historyStatus,
                  paymentDate,
                  paidAmount: paidValue,
                  paymentMethod: stateMeta?.paymentMethod || "",
                  paymentReference: paymentRefValue,
                  preserveEntryIds: preserveLedgerEntryIds
                });
              } else {
                console.warn("client ledger entry skipped: client path missing");
              }
            } catch (ledgerErr) {
              console.warn("client ledger entry failed", ledgerErr);
            }
          }
          if (stateMeta && typeof stateMeta === "object") {
            stateMeta.historyPath = res.path;
            stateMeta.historyDocType = docType;
          }
          const numericValue = integerOrNull(savedNumber);
          if (typeof w.markDocumentNumberUsed === "function") {
            try {
              w.markDocumentNumberUsed({ docType, numberLength, number: savedNumber, year: numberYear });
            } catch (counterErr) {
              console.warn("document numbering update failed", counterErr);
            }
          }
          clearPendingNumberLocal(docType, numberLength, numberYear);
          if (res?.path && typeof w.updateDocumentHistoryComment === "function") {
            w.updateDocumentHistoryComment(docType, res.path, stateMeta?.noteInterne ?? "");
          }
          setHistorySelectedType(docType);
          renderHistoryList(docType);
          syncInvoiceNumberControls({ force: true });
          if (typeof closeItemsModal === "function") {
            closeItemsModal();
          }
          const numberNotice = numberChanged
            ? `Number was used by another document; saved as ${savedNumber}`
            : "";
          const finalMessage = numberNotice ? `${successSentence}\n\n${numberNotice}` : successSentence;
          await w.showDialog?.(finalMessage, {
            title: "Succes",
            renderMessage:
              savedTemplate?.renderMessage ||
              ((container) => {
                if (!container) return;
                try {
                  container.textContent = "";
                  const prefix = document.createTextNode(`${article} `);
                  const strong = document.createElement("strong");
                  strong.textContent = fileDisplayName;
                  const suffix = document.createTextNode(` ${suffixStatus}`);
                  container.append(prefix, strong, suffix);
                  if (numberNotice) {
                    const notice = document.createElement("p");
                    notice.className = "swbDialogMsg__notice";
                    notice.textContent = numberNotice;
                    container.appendChild(notice);
                  }
                } catch {
                  container.textContent = finalMessage;
                }
              })
          });
          if (typeof SEM.markDocumentDirty === "function") SEM.markDocumentDirty(false);
        } else if (res && !res.canceled) {
          const saveError = getMessage("DOCUMENT_SAVE_FAILED");
          await w.showDialog?.(res.error || saveError.text, { title: saveError.title });
        }
      } catch (err) {
        console.error("saveInvoiceJSON failed", err);
        const saveError = getMessage("DOCUMENT_SAVE_FAILED");
        await w.showDialog?.(String(err?.message || err || saveError.text), { title: saveError.title });
      }
    };

    const saveBtn = getEl("btnSave");
    if (saveBtn) {
      saveBtn.addEventListener("click", handleDocumentSave);
    }

    getEl("btnPDF")?.addEventListener("click", () => {
      if (typeof w.exportCurrentPDF === "function") w.exportCurrentPDF();
    });

    const previewSaveBtn = getEl("itemsPreviewSave");
    if (previewSaveBtn) {
      previewSaveBtn.addEventListener("click", async (evt) => {
        evt.preventDefault();
        const invInput = getEl("invNumber");
        const invValue = String(invInput?.value || "").trim();
        if (!invValue) {
          const missingNumber = getMessage("INVOICE_NUMBER_REQUIRED", {
            fallbackText: "Veuillez saisir un numero avant d'enregistrer.",
            fallbackTitle: "Enregistrement"
          });
          await w.showDialog?.(missingNumber.text, { title: missingNumber.title });
          invInput?.focus();
          return;
        }
        const partyNameEl = getEl("itemsClientName");
        const partyAccountEl = getEl("itemsClientAccount");
        const partyVatEl = getEl("itemsClientVat");
        const partyLegend = getEl("itemsPartyLegend");
        const partyLabelRaw = String(partyLegend?.textContent || "Client").trim();
        const partyLabel = partyLabelRaw || "Client";
        const isVendor = partyLabel.toLowerCase() === "fournisseur";
        const partyNameText = String(partyNameEl?.textContent || "").trim();
        const partyAccountText = String(partyAccountEl?.textContent || "").trim();
        const partyVatText = String(partyVatEl?.textContent || "").trim();
        const hasName =
          partyNameEl &&
          !partyNameEl.classList.contains("is-empty") &&
          !!partyNameText &&
          partyNameText !== "-";
        const hasAccount =
          partyAccountEl &&
          !partyAccountEl.classList.contains("is-empty") &&
          !!partyAccountText &&
          partyAccountText !== "-";
        const hasVat =
          partyVatEl &&
          !partyVatEl.classList.contains("is-empty") &&
          !!partyVatText &&
          partyVatText !== "-";
        const isPartyEmpty = !(hasName || hasAccount || hasVat);
        if (isPartyEmpty) {
          const partyKey = isVendor ? "SUPPLIER_REQUIRED_FIELDS" : "DOCUMENT_CLIENT_REQUIRED_FIELDS";
          const partyMessage = getMessage(partyKey, {
            fallbackText:
              isVendor
                ? "Veuillez renseigner les informations du fournisseur."
                : "Veuillez ajouter un client pour continuer.",
            fallbackTitle: isVendor ? "Fournisseur incomplet" : "Client incomplet"
          });
          await w.showDialog?.(partyMessage.text, { title: partyMessage.title });
          return;
        }
        const itemBody = getEl("itemBody");
        const hasItems = !!itemBody?.querySelector("tr");
        if (!hasItems) {
          const missingItems = getMessage("DOCUMENT_ITEM_REQUIRED_FIELDS", {
            fallbackText: "Veuillez ajouter au moins un article pour continuer.",
            fallbackTitle: "Document incomplet"
          });
          await w.showDialog?.(missingItems.text, { title: missingItems.title });
          return;
        }
        const readPreviewValue = (node) => {
          const raw = String(node?.textContent || "").trim();
          return raw && raw !== "-" ? raw : "";
        };
        const syncPreviewClientToState = () => {
          const st = SEM.state || (SEM.state = {});
          const client = st.client || (st.client = {});
          const name = readPreviewValue(getEl("itemsClientName"));
          const benefit = readPreviewValue(getEl("itemsClientBenefit"));
          const account = readPreviewValue(getEl("itemsClientAccount"));
          const vat = readPreviewValue(getEl("itemsClientVat"));
          const stegRef = readPreviewValue(getEl("itemsClientStegRef"));
          const phone = readPreviewValue(getEl("itemsClientPhone"));
          const email = readPreviewValue(getEl("itemsClientEmail"));
          const address = readPreviewValue(getEl("itemsClientAddress"));
          client.name = name;
          client.benefit = benefit;
          client.account = account;
          client.vat = vat;
          client.stegRef = stegRef;
          client.phone = phone;
          client.email = email;
          client.address = address;
          client.__entityType = isVendor ? "vendor" : "client";
          const setInput = (id, value) => {
            const itemsModal = getEl("itemsDocOptionsModal");
            const scoped =
              itemsModal && typeof itemsModal.querySelector === "function"
                ? itemsModal.querySelector(`#${id}`)
                : null;
            const el = scoped || getEl(id);
            if (el && "value" in el) el.value = value;
          };
          const CLIENT_VENDOR_INPUT_IDS = {
            clientType: "fournisseurType",
            clientName: "fournisseurName",
            clientBeneficiary: "fournisseurBeneficiary",
            clientAccount: "fournisseurAccount",
            clientVat: "fournisseurVat",
            clientStegRef: "fournisseurStegRef",
            clientPhone: "fournisseurPhone",
            clientEmail: "fournisseurEmail",
            clientAddress: "fournisseurAddress"
          };
          const setFormValue = (id, value) => {
            const vendorId = CLIENT_VENDOR_INPUT_IDS[id] || "";
            const ids = isVendor ? [vendorId, id] : [id, vendorId];
            ids.forEach((candidateId) => {
              if (!candidateId) return;
              setInput(candidateId, value);
            });
          };
          setFormValue("clientType", String(client.type || "societe"));
          setFormValue("clientName", name);
          setFormValue("clientBeneficiary", benefit);
          setFormValue("clientAccount", account);
          setFormValue("clientVat", vat);
          setFormValue("clientStegRef", stegRef);
          setFormValue("clientPhone", phone);
          setFormValue("clientEmail", email);
          setFormValue("clientAddress", address);
          SEM.refreshClientSummary?.();
        };
        syncPreviewClientToState();
        const previewMeta = SEM?.state?.meta || {};
        const isItemsModalEditSave = (() => {
          const itemsModal = getEl("itemsDocOptionsModal");
          const isItemsModalOpen = !!(
            itemsModal &&
            itemsModal.classList.contains("is-open") &&
            itemsModal.getAttribute("aria-hidden") === "false"
          );
          if (!isItemsModalOpen) return false;
          const historyPath = String(previewMeta?.historyPath || "").trim();
          return !!historyPath;
        })();
        handleDocumentSave({
          skipClientLedger: false,
          preserveLedgerEntryIds: isItemsModalEditSave
        });
      });
    }
    getEl("itemsPreviewPrint")?.addEventListener("click", () => {
      if (typeof w.printCurrentPDF === "function") {
        w.printCurrentPDF();
        return;
      }
      getEl("btnPDF")?.click();
    });

    const newDocumentModalApi =
      typeof AppInit.createNewDocumentModalApi === "function"
        ? AppInit.createNewDocumentModalApi({ getInvoiceMeta })
        : {};
    const {
      openItemsModal = () => false,
      closeItemsModal = () => {},
      openItemsPopupWindow = () => {},
      openItemsPopup = () => {},
      revealItemsAndOptions = () => {}
    } = newDocumentModalApi;

    const docTypeActionNewBtn = getEl("docTypeActionNew");
    const runNewDocumentAction = async () => {
      const fallbackDocType = (getEl("docType")?.value || getInvoiceMeta()?.docType || "facture").toLowerCase();
      let finalDocType = fallbackDocType;
      const MODEL_DOC_TYPE_ALL = "all";
      const DEFAULT_MODEL_DOC_TYPE = "facture";
      const MODEL_DOC_TYPE_LIST = ["facture", "fa", "devis", "bl", "avoir"];
      const normalizeDocType = (value) => String(value || "").trim().toLowerCase();
      const normalizeModelDocType = (value, fallback = "") => {
        const normalized = normalizeDocType(value);
        if (!normalized || normalized === "aucun") return fallback;
        if (normalized === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_ALL;
        return MODEL_DOC_TYPE_LIST.includes(normalized) ? normalized : fallback;
      };
      const normalizeModelDocTypeList = (value) => {
        const rawList = Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value.split(",")
            : [];
        const normalized = [];
        rawList.forEach((entry) => {
          const next = normalizeModelDocType(entry, "");
          if (!next || next === MODEL_DOC_TYPE_ALL) return;
          if (!normalized.includes(next)) normalized.push(next);
        });
        return normalized;
      };
      const expandModelDocTypes = (value, fallback = DEFAULT_MODEL_DOC_TYPE) => {
        const normalized = normalizeModelDocTypeList(value);
        if (normalized.length) return normalized;
        const single = normalizeModelDocType(value, "");
        if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
        if (single) return [single];
        const fallbackList = normalizeModelDocTypeList(fallback);
        return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
      };

        const getModelOptionsForDialog = () => {
          const fromEntries = [];
          if (typeof SEM.getModelEntries === "function") {
            try {
              const entries = SEM.getModelEntries();
              entries.forEach((entry = {}) => {
                const name = entry.name || "";
                if (!name) return;
                const docTypes = expandModelDocTypes(
                  entry?.config?.docTypes !== undefined ? entry?.config?.docTypes : entry?.config?.docType,
                  DEFAULT_MODEL_DOC_TYPE
                );
                fromEntries.push({ value: name, label: name, docTypes });
              });
            } catch {}
          }
          return fromEntries;
        };

        let dialogSelectedDocType = "";
        let dialogModelPickerApi = null;
        let selectedModel = "";
        let selectedModelDocTypes = [];
        const proceed = await confirmInvoiceResetIfUnsaved();
        if (!proceed) return;

        const renderNewDocDialogMessage = (container, safeMessage, rawMessage) => {
          const doc = container.ownerDocument;
          const wrapper = doc.createElement("div");
          wrapper.className = "doc-dialog-model-picker";
        const label = doc.createElement("label");
        label.className = "doc-dialog-model-picker__label";
        label.id = "docDialogModelLabel";
        label.textContent = "Mod\u00e8le";
        const field = doc.createElement("div");
        field.className = "doc-dialog-model-picker__field";
        if (container) {
          container.style.maxHeight = "none";
          container.style.overflow = "visible";
        }

        const menu = doc.createElement("details");
        menu.id = "docDialogModelSelectMenu";
        menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
        const summary = doc.createElement("summary");
        summary.className = "btn success field-toggle-trigger";
        summary.setAttribute("role", "button");
        summary.setAttribute("aria-haspopup", "listbox");
        summary.setAttribute("aria-expanded", "false");
        summary.setAttribute("aria-labelledby", "docDialogModelLabel docDialogModelDisplay");
        const display = doc.createElement("span");
        display.id = "docDialogModelDisplay";
        display.className = "model-select-display";
        display.textContent = "S\u00e9lectionner un mod\u00e8le";
        summary.appendChild(display);
        summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
        menu.appendChild(summary);

        const panel = doc.createElement("div");
        panel.className = "field-toggle-panel model-select-panel";
        panel.id = "docDialogModelPanel";
        panel.setAttribute("role", "listbox");
        panel.setAttribute("aria-labelledby", "docDialogModelLabel");
        menu.appendChild(panel);

          const hiddenSelect = doc.createElement("select");
          hiddenSelect.id = "docDialogModelSelect";
          hiddenSelect.className = "model-select doc-dialog-model-select";
          hiddenSelect.setAttribute("aria-hidden", "true");
          hiddenSelect.tabIndex = -1;
          const placeholder = doc.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "S\u00e9lectionner un mod\u00e8le";
          hiddenSelect.appendChild(placeholder);

          label.htmlFor = hiddenSelect.id;

          const modelOptions = getModelOptionsForDialog();
          let activeDocType = "";
          const isMenuDisabled = () => menu.dataset.disabled === "true";

          const okBtn = doc.getElementById("swbDialogOk");
          const getSelectedDocTypeButton = () => {
            const dialogRoot = container?.closest?.(".swbDialog") || doc.getElementById("swbDialog");
            if (!dialogRoot) return null;
            return (
              dialogRoot.querySelector(
                '.swbDialog__options [data-choice-value].is-selected'
              ) ||
              dialogRoot.querySelector(
                '.swbDialog__options [data-choice-value][aria-pressed="true"]'
              )
            );
          };
          const isSelectedModelValid = () => {
            const value = hiddenSelect.value || "";
            if (!value) return false;
            const opt =
              hiddenSelect.selectedOptions && hiddenSelect.selectedOptions.length
                ? hiddenSelect.selectedOptions[0]
                : null;
            if (!opt) return false;
            if (opt.disabled) return false;
            if (opt.dataset?.modelUnavailable === "true") return false;
            return true;
          };
          const updateCreateButtonState = () => {
            if (!okBtn) return;
            const hasDocType = !!getSelectedDocTypeButton();
            const hasModel = isSelectedModelValid();
            const isEnabled = hasDocType && hasModel;
            okBtn.disabled = !isEnabled;
            okBtn.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          };

          let refreshAvailability = () => {};
          const setMenuDisabled = (disabled) => {
            const isDisabled = !!disabled;
            menu.dataset.disabled = isDisabled ? "true" : "false";
            summary.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            if (isDisabled) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
              summary.tabIndex = -1;
            } else {
              summary.removeAttribute("tabindex");
            }
            hiddenSelect.disabled = isDisabled;
            hiddenSelect.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            if (isDisabled) {
              panel.querySelectorAll(".model-select-option").forEach((btn) => {
                btn.disabled = true;
                btn.dataset.unavailable = "true";
                btn.classList.add("is-disabled");
                btn.setAttribute("aria-disabled", "true");
                if (!btn.title) {
                  btn.title = "Indisponible pour ce type de document";
                }
              });
              hiddenSelect.querySelectorAll("option").forEach((opt) => {
                if (!opt.value) return;
                opt.disabled = true;
                opt.dataset.modelUnavailable = "true";
              });
            } else {
              refreshAvailability(activeDocType || DEFAULT_MODEL_DOC_TYPE);
            }
          };

          const optionIndex = new Map();
          const renderOptions = (options, { emptyText } = {}) => {
            panel.textContent = "";
            hiddenSelect.innerHTML = "";
            optionIndex.clear();
            hiddenSelect.appendChild(placeholder.cloneNode(true));
            if (!options.length) {
              const emptyMsg = doc.createElement("p");
              emptyMsg.className = "model-select-empty";
              emptyMsg.textContent = emptyText || "Aucun mod\u00e8le disponible";
              panel.appendChild(emptyMsg);
              return;
            }
            options.forEach((opt) => {
              const optVal = opt.value || "";
              const optLabel = opt.label || optVal || "Mod\u00e8le";
              const optDocTypes = expandModelDocTypes(opt.docTypes, DEFAULT_MODEL_DOC_TYPE);
              const optDocType = optDocTypes[0] || DEFAULT_MODEL_DOC_TYPE;
              const optDocTypesAttr = optDocTypes.join(",");

              const btn = doc.createElement("button");
              btn.type = "button";
              btn.className = "model-select-option";
              btn.dataset.value = optVal;
              btn.setAttribute("role", "option");
              btn.textContent = optLabel;
              panel.appendChild(btn);

              const optionEl = doc.createElement("option");
              optionEl.value = optVal;
              optionEl.textContent = optLabel;
              optionEl.dataset.modelDocType = optDocType;
              optionEl.dataset.modelDocTypes = optDocTypesAttr;
              hiddenSelect.appendChild(optionEl);
              optionIndex.set(optVal, { btn, optionEl, docTypes: optDocTypes });
            });
          };

          const updateAvailability = (docTypeValue) => {
            const normalizedDocType = normalizeDocType(docTypeValue || DEFAULT_MODEL_DOC_TYPE);
            optionIndex.forEach(({ btn, optionEl, docTypes }) => {
              const optDocTypes = Array.isArray(docTypes) && docTypes.length
                ? docTypes
                : [DEFAULT_MODEL_DOC_TYPE];
              const isAllowed = optDocTypes.includes(normalizedDocType);
              const isDisabled = !isAllowed;
              btn.disabled = isDisabled;
              btn.dataset.unavailable = isDisabled ? "true" : "false";
              btn.classList.toggle("is-disabled", isDisabled);
              btn.setAttribute("aria-disabled", isDisabled ? "true" : "false");
              if (isDisabled) {
                btn.title = "Indisponible pour ce type de document";
              } else {
                btn.removeAttribute("title");
              }
              optionEl.disabled = isDisabled;
              optionEl.dataset.modelUnavailable = isDisabled ? "true" : "false";
            });
          };
          refreshAvailability = updateAvailability;

          const applySelectionToUi = (value) => {
            const nextValue = value || "";
            hiddenSelect.value = nextValue;
            const fallbackLabel = "S\u00e9lectionner un mod\u00e8le";
            const activeLabel =
            modelOptions.find((opt) => String(opt.value || "") === nextValue)?.label || fallbackLabel;
          display.textContent = activeLabel;
          panel.querySelectorAll(".model-select-option").forEach((btn) => {
            const isActive = btn.dataset.value === nextValue;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
        };

          const setSelection = async (value, { dispatchMainChange = false, closeMenu = true } = {}) => {
            const nextValue = value || "";
            if (nextValue) {
              const opt = modelOptions.find((entry) => String(entry.value || "") === nextValue);
              const optDocTypes = expandModelDocTypes(opt?.docTypes, DEFAULT_MODEL_DOC_TYPE);
              if (activeDocType && !optDocTypes.includes(activeDocType)) {
                return;
              }
            }
            selectedModel = nextValue;
            if (nextValue) {
              const selectedOpt = modelOptions.find((entry) => String(entry.value || "") === nextValue);
              selectedModelDocTypes = expandModelDocTypes(selectedOpt?.docTypes, DEFAULT_MODEL_DOC_TYPE);
            } else {
              selectedModelDocTypes = [];
            }
            applySelectionToUi(nextValue);
            updateCreateButtonState();
            if (closeMenu) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
            }
          };

          const applyDocTypeFilter = (docTypeValue) => {
            const normalized = normalizeDocType(docTypeValue || DEFAULT_MODEL_DOC_TYPE);
            activeDocType = normalized;
            updateAvailability(normalized);
            const hasSelection = !normalized
              ? !!selectedModel
              : modelOptions.some((opt) => {
                  if (String(opt.value || "") !== selectedModel) return false;
                  const optDocTypes = expandModelDocTypes(opt.docTypes, DEFAULT_MODEL_DOC_TYPE);
                  return optDocTypes.includes(normalized);
                });
            if (normalized && !hasSelection) {
              selectedModel = "";
              selectedModelDocTypes = [];
            }
            applySelectionToUi(selectedModel);
            setMenuDisabled(false);
            updateCreateButtonState();
          };

          dialogModelPickerApi = { setDocType: applyDocTypeFilter };

          renderOptions(modelOptions, { emptyText: "Aucun mod\u00e8le disponible" });

          applyDocTypeFilter(dialogSelectedDocType);
          updateCreateButtonState();

        panel.addEventListener("click", (evt) => {
          if (isMenuDisabled()) return;
          const btn = evt.target.closest(".model-select-option");
          if (!btn || btn.disabled) return;
          const value = btn.dataset.value || "";
          setSelection(value, { dispatchMainChange: true });
        });

        summary.addEventListener("click", (evt) => {
          if (isMenuDisabled()) return;
          evt.preventDefault();
          menu.open = !menu.open;
          summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
          if (!menu.open) summary.focus();
        });

        doc.addEventListener(
          "click",
          (evt) => {
            if (!menu.contains(evt.target)) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
            }
          },
          { capture: true, passive: true }
        );

          if (selectedModel && modelOptions.some((opt) => String(opt.value || "") === selectedModel)) {
            setSelection(selectedModel, { dispatchMainChange: false, closeMenu: false });
          } else {
            panel.querySelectorAll(".model-select-option").forEach((btn) => {
              btn.setAttribute("aria-selected", "false");
            });
          }

        field.appendChild(menu);
        field.appendChild(hiddenSelect);
        wrapper.appendChild(label);
        wrapper.appendChild(field);

        const question = doc.createElement("p");
        question.className = "doc-dialog-question";
        question.textContent = safeMessage || rawMessage || "";

        const optionsSlot = doc.createElement("div");
        const dialogBody = doc.createElement("div");
        dialogBody.appendChild(question);
        dialogBody.appendChild(optionsSlot);
        dialogBody.appendChild(wrapper);

        container.textContent = "";
        container.appendChild(dialogBody);
        return optionsSlot;
      };

      const selectedDocType = await selectDocTypeChoice({
        title: "Nouveau document",
        message: "Quel document souhaitez-vous créer ?",
        fallback: fallbackDocType,
        allowedDocTypes: null,
        renderMessage: renderNewDocDialogMessage,
        confirmChoice: true,
        confirmText: "Cr\u00e9er",
        onChoiceChange: (option) => {
          const nextValue = normalizeDocType(option?.value || option?.docType || "");
          dialogSelectedDocType = nextValue;
          if (dialogModelPickerApi && typeof dialogModelPickerApi.setDocType === "function") {
            dialogModelPickerApi.setDocType(nextValue);
          }
        }
      });
      if (!selectedDocType) return;

      const currentDocType = String(selectedDocType.docType || fallbackDocType).toLowerCase();
      finalDocType = currentDocType;
      const currentLength = getEl("invNumberLength")?.value || getInvoiceMeta()?.numberLength || 4;

      if (typeof SEM.newInvoice === "function") SEM.newInvoice();

      const st = SEM.state || (SEM.state = {});
      const meta = st.meta || (st.meta = {});
      const sanitizeDialogModelName =
        typeof bindingHelpers.sanitizeModelName === "function"
          ? bindingHelpers.sanitizeModelName
          : (value) => String(value ?? "").trim();
      meta.documentModelName = sanitizeDialogModelName(selectedModel || "");
      meta.docDialogModelName = sanitizeDialogModelName(selectedModel || "");
      meta.modelName = sanitizeDialogModelName(selectedModel || "");
      meta.modelKey = sanitizeDialogModelName(selectedModel || "");
      if (selectedModelDocTypes.length) {
        meta.modelDocTypes = selectedModelDocTypes.slice();
        meta.modelDocType = selectedModelDocTypes[0] || DEFAULT_MODEL_DOC_TYPE;
      } else {
        const fallbackModelDocTypes = expandModelDocTypes(meta.docType || currentDocType, DEFAULT_MODEL_DOC_TYPE);
        meta.modelDocTypes = fallbackModelDocTypes.slice();
        meta.modelDocType = fallbackModelDocTypes[0] || DEFAULT_MODEL_DOC_TYPE;
      }
      meta.docType = currentDocType;
      meta.numberLength = normalizeInvoiceLength(currentLength, meta.numberLength || 4);
      meta.number = "";
      meta.numberYear = null;

      const docTypeEl = getEl("docType");
      if (docTypeEl) {
        docTypeEl.value = currentDocType;
        try {
          docTypeEl.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          if (typeof w.syncDocTypeMenuUi === "function") {
            w.syncDocTypeMenuUi(currentDocType, { updateSelect: true });
          }
        }
      } else if (typeof w.syncDocTypeMenuUi === "function") {
        w.syncDocTypeMenuUi(currentDocType, { updateSelect: true });
      }

      setHistorySelectedType(currentDocType);
      renderHistoryList(currentDocType);

      if (typeof SEM.bind === "function") SEM.bind();
      if (invNumberLengthSelect) {
        invNumberLengthSelect.value = String(meta.numberLength);
      }
      if (typeof w.syncInvNumberLengthUi === "function") {
        w.syncInvNumberLengthUi(meta.numberLength, { updateSelect: false });
      }

      if (typeof SEM.clearAddFormAndMode === "function") SEM.clearAddFormAndMode();
      if (typeof SEM.setClientFormBaseline === "function") SEM.setClientFormBaseline(null);
      if (typeof SEM.evaluateClientDirtyState === "function") SEM.evaluateClientDirtyState();
      if (typeof SEM.computeTotals === "function") SEM.computeTotals();

      if (selectedModel && typeof SEM.applyModelByName === "function") {
        try {
          await SEM.applyModelByName(selectedModel);
          const appliedDocType = String(SEM.state?.meta?.docType || getEl("docType")?.value || "").trim().toLowerCase();
          if (appliedDocType) finalDocType = appliedDocType;
        } catch (err) {
          console.error("model presets: apply on new", err);
        }
      }

      const enforceDocType = (docType) => {
        const normalized = String(docType || "facture").toLowerCase();
        const docTypeEl = getEl("docType");
        const st = SEM.state || (SEM.state = {});
        const meta = st.meta || (st.meta = {});
        meta.docType = normalized;
        if (docTypeEl) {
          docTypeEl.value = normalized;
          try {
            docTypeEl.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {
            // fallback below
          }
        }
        if (typeof w.syncDocTypeMenuUi === "function") {
          w.syncDocTypeMenuUi(normalized, { updateSelect: true });
        }
        setHistorySelectedType(normalized);
        renderHistoryList(normalized);
        syncInvoiceNumberControls({
          force: true,
          useNextIfEmpty: true,
          overrideWithNext: true
        });
      };

      enforceDocType(finalDocType);
      openItemsPopup({
        mode: "new",
        resetClient: true,
        docType: finalDocType,
        model: selectedModel
      });
      if (typeof w.showToast === "function") {
        w.showToast("Nouveau document est créé avec succès.", { duration: 5000 });
      }
      if (typeof SEM.markDocumentDirty === "function") SEM.markDocumentDirty(false);
    };

    docTypeActionNewBtn?.addEventListener("click", () => {
      if (docTypeActionNewBtn.disabled || docTypeActionNewBtn.getAttribute("aria-disabled") === "true") {
        return;
      }
      void runNewDocumentAction();
    });

    getEl("btnNew")?.addEventListener("click", () => {
      void runNewDocumentAction();
    });

    // Auto-hydrate history from existing invoice files on disk.
    hydrateHistoryFromDiskOnce();
  };
})(window);
