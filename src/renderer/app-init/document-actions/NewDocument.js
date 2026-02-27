(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.createNewDocumentModalApi = function createNewDocumentModalApi(ctx = {}) {
    const getInvoiceMeta = typeof ctx.getInvoiceMeta === "function" ? ctx.getInvoiceMeta : () => ({});
    const SEM = (w.SEM = w.SEM || {});
    const itemsDocOptionsModal = getEl("itemsDocOptionsModal");
    const itemsDocOptionsModalContent = getEl("itemsDocOptionsModalContent");
    const itemsDocOptionsModalClose = getEl("itemsDocOptionsModalClose");
    const itemsDocOptionsModalCloseFooter = getEl("itemsDocOptionsModalCloseFooter");
    const itemsDocOptionsModalTitle = getEl("itemsDocOptionsModalTitle");
    let itemsDocOptionsRestoreFocus = null;
    let itemsModalMoved = false;
    let itemsModalMode = "new";
    const movableRefs = {
      itemsSection: { node: null, parent: null, next: null },
      docOptions: { node: null, parent: null, next: null }
    };

    const normalizeItemsModalMode = (value, fallback = "new") => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "edit") return "edit";
      if (normalized === "new") return "new";
      return fallback;
    };
    const resolveItemsModalMode = (requestedMode) => {
      const explicitMode = normalizeItemsModalMode(requestedMode, "");
      if (explicitMode) return explicitMode;
      const meta = getInvoiceMeta() || {};
      return meta.historyPath ? "edit" : "new";
    };
    const isItemsModalEditMode = () => itemsModalMode === "edit";

    const normalizeInvNumberLength = (value, fallback) => {
      if (typeof normalizeInvoiceNumberLength === "function") {
        try {
          return normalizeInvoiceNumberLength(value, fallback);
        } catch {}
      }
      const num = Number(value);
      if ([4, 6, 8, 12].includes(num)) return num;
      const fb = Number(fallback);
      return [4, 6, 8, 12].includes(fb) ? fb : 4;
    };

    const NUMBER_FORMAT_DEFAULT = "prefix_date_counter";
    const normalizeNumberFormat = (value, fallback = NUMBER_FORMAT_DEFAULT) => {
      const raw = String(value || "").trim().toLowerCase();
      if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
      const fb = String(fallback || "").trim().toLowerCase();
      if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
      return NUMBER_FORMAT_DEFAULT;
    };
    const numberFormatHasPrefix = (format) => format !== "counter";
    const numberFormatHasDate = (format) => format === "prefix_date_counter";
    const getNumberFormat = (meta) =>
      normalizeNumberFormat(meta?.numberFormat, NUMBER_FORMAT_DEFAULT);

    const docTypePrefixFor = (docType) => {
      const prefixMap = {
        facture: "Fact",
        fa: "FA",
        devis: "Dev",
        bl: "BL",
        avoir: "AV"
      };
      const normalized = String(docType || "facture").toLowerCase();
      if (prefixMap[normalized]) return prefixMap[normalized];
      const letters = normalized.replace(/[^a-z]/gi, "").slice(0, 3);
      return letters ? letters.toUpperCase() : "DOC";
    };

    const parseNumericSuffix = (value) => {
      const match = String(value ?? "").match(/(\d+)\s*$/);
      if (!match) return null;
      const num = Number(match[1]);
      return Number.isFinite(num) ? num : null;
    };

    const computeNextNumberForDocType = async (docType, length, meta, prefix) => {
      const numberFormat = getNumberFormat(meta);
      if (typeof w.electronAPI?.previewDocumentNumber === "function") {
        try {
          const res = await w.electronAPI.previewDocumentNumber({
            docType,
            date: meta?.date,
            numberLength: length,
            prefix,
            numberFormat
          });
          if (res?.ok && res.number) {
            return { formatted: res.number, numeric: parseNumericSuffix(res.number) };
          }
        } catch (err) {
          console.warn("preview number failed", err);
        }
      }

      const readHistory =
        typeof w.getDocumentHistoryFull === "function" ? w.getDocumentHistoryFull : w.getDocumentHistory;
      const historyEntries = typeof readHistory === "function" ? readHistory(docType) || [] : [];
      let highestSuffix = null;
      historyEntries.forEach((entry) => {
        const num = parseNumericSuffix(entry?.number);
        if (num !== null && (highestSuffix === null || num > highestSuffix)) highestSuffix = num;
      });
      const metaSuffix = parseNumericSuffix(meta?.number);
      if (metaSuffix !== null && (highestSuffix === null || metaSuffix > highestSuffix)) highestSuffix = metaSuffix;

      let formattedCandidate = null;
      let candidateNext = null;
      if (typeof getNextDocumentNumber === "function") {
        formattedCandidate = getNextDocumentNumber(docType, length);
        candidateNext = parseNumericSuffix(formattedCandidate);
      }

      const candidateHighest = Number.isFinite(candidateNext) ? candidateNext - 1 : null;
      const resolvedHighest =
        highestSuffix !== null && candidateHighest !== null
          ? Math.max(highestSuffix, candidateHighest)
          : highestSuffix ?? candidateHighest;

      const nextNumeric = (resolvedHighest ?? 0) + 1;

      if (formattedCandidate && Number.isFinite(candidateNext) && candidateNext >= nextNumeric) {
        return { formatted: formattedCandidate, numeric: candidateNext };
      }

      if (typeof formatInvoiceNumber === "function") {
        const formatted = formatInvoiceNumber(nextNumeric, length, {
          docType,
          date: meta?.date,
          meta,
          numberFormat,
          prefixOverride: numberFormatHasPrefix(numberFormat) ? prefix : ""
        });
        return { formatted, numeric: nextNumeric };
      }

      const fallbackDate = meta?.date ? new Date(meta.date) : new Date();
      const safeDate = Number.isFinite(fallbackDate.getTime()) ? fallbackDate : new Date();
      const year = String(safeDate.getFullYear());
      const month = String(safeDate.getMonth() + 1).padStart(2, "0");
      const shortYear = year.slice(-2);
      return {
        formatted: `${docTypePrefixFor(docType)}_${shortYear}-${month}-${nextNumeric}`,
        numeric: nextNumeric
      };
    };

    const applyNextNumberToDocMetaBox = async (docMetaBox) => {
      if (!docMetaBox) return;
      const meta = getInvoiceMeta() || {};
      const numberFormat = getNumberFormat(meta);
      const docTypeValue = String(meta.docType || getEl("docType")?.value || "facture").toLowerCase();
      const hiddenInput = docMetaBox.querySelector("#invNumber");
      if (docTypeValue === "fa") {
        const inputValue = hiddenInput ? String(hiddenInput.value || "") : "";
        const metaValue = meta.number ?? "";
        const resolved = inputValue.trim() ? inputValue.trim() : String(metaValue || "").trim();
        if (hiddenInput && hiddenInput.value !== resolved) hiddenInput.value = resolved;
        meta.number = resolved;
        meta.docType = docTypeValue;
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }

      const suffixInput = docMetaBox.querySelector("#invNumberSuffix");
      const prefixInput = docMetaBox.querySelector("#invNumberPrefix");
      const datePartInput = docMetaBox.querySelector("#invNumberDatePart");
      const lengthSelect = docMetaBox.querySelector("#invNumberLength");
      if (!suffixInput || !prefixInput || !datePartInput || !hiddenInput || !lengthSelect) return;
      const normalizedLength = normalizeInvNumberLength(lengthSelect.value || meta.numberLength || 4, meta.numberLength || 4);
      if (lengthSelect.value !== String(normalizedLength)) {
        lengthSelect.value = String(normalizedLength);
      }

      const { formatted, numeric } = await computeNextNumberForDocType(
        docTypeValue,
        normalizedLength,
        meta,
        prefixInput?.value || ""
      );
      if (!formatted) return;

      const suffixStr = String(
        Number.isFinite(numeric) ? numeric : parseNumericSuffix(formatted) ?? ""
      )
        .replace(/\D+/g, "")
        .slice(-normalizedLength);
      suffixInput.value = suffixStr;

      let resolvedPrefix = "";
      if (numberFormatHasPrefix(numberFormat)) {
        const prefixFromFormatted = String(formatted).match(/^([^_-]+)/)?.[1] || "";
        resolvedPrefix =
          (prefixInput.value || "").trim() || prefixFromFormatted || docTypePrefixFor(docTypeValue);
        if (!prefixInput.value.trim()) {
          prefixInput.value = resolvedPrefix;
        }
      }

      if (numberFormatHasDate(numberFormat)) {
        const dateMatch = String(formatted).match(/^[^_-]+[_-](\d{2,4})-(\d{1,2})-/);
        const fallbackDate = meta?.date ? new Date(meta.date) : new Date();
        const safeDate = Number.isFinite(fallbackDate.getTime()) ? fallbackDate : new Date();
        const shortYear =
          (dateMatch ? dateMatch[1].slice(-2) : String(safeDate.getFullYear()).slice(-2)) || "";
        const month =
          (dateMatch ? String(dateMatch[2]).padStart(2, "0") : String(safeDate.getMonth() + 1).padStart(2, "0")) || "";
        datePartInput.value = `_${shortYear}-${month}-`;
      } else {
        datePartInput.value = "";
      }

      const finalNumber = numberFormatHasPrefix(numberFormat) && resolvedPrefix
        ? String(formatted).replace(/^[^_-]+/, resolvedPrefix)
        : String(formatted);
      hiddenInput.value = finalNumber;
      meta.number = finalNumber;
      meta.numberLength = normalizedLength;
      meta.docType = docTypeValue;
      if (typeof SEM?.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    };

    const getDateParts = (value) => {
      const raw = String(value || "").trim();
      const match = raw.match(/^(\d{4})-(\d{2})/);
      if (match) {
        return { shortYear: match[1].slice(-2), month: match[2] };
      }
      const parsed = new Date(raw);
      if (Number.isFinite(parsed.getTime())) {
        const year = String(parsed.getFullYear());
        return { shortYear: year.slice(-2), month: String(parsed.getMonth() + 1).padStart(2, "0") };
      }
      const now = new Date();
      const year = String(now.getFullYear());
      return { shortYear: year.slice(-2), month: String(now.getMonth() + 1).padStart(2, "0") };
    };

    const updateNumberFromDate = (docMetaBox) => {
      if (!docMetaBox) return;
      const meta = getInvoiceMeta() || {};
      const numberFormat = getNumberFormat(meta);
      const docTypeValue = String(meta.docType || getEl("docType")?.value || "facture").toLowerCase();
      if (docTypeValue === "fa") {
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }
      if (!numberFormatHasDate(numberFormat)) {
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }
      const dateValue = String(meta.date || "").trim();
      if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }
      const suffixInput = docMetaBox.querySelector("#invNumberSuffix");
      const prefixInput = docMetaBox.querySelector("#invNumberPrefix");
      const datePartInput = docMetaBox.querySelector("#invNumberDatePart");
      const hiddenInput = docMetaBox.querySelector("#invNumber");
      const lengthSelect = docMetaBox.querySelector("#invNumberLength");
      if (!suffixInput || !prefixInput || !datePartInput || !hiddenInput || !lengthSelect) return;

      const normalizedLength = normalizeInvNumberLength(
        lengthSelect.value || meta.numberLength || 4,
        meta.numberLength || 4
      );
      if (lengthSelect.value !== String(normalizedLength)) {
        lengthSelect.value = String(normalizedLength);
      }

      const prefixValue = (prefixInput.value || "").trim() || docTypePrefixFor(docTypeValue);
      const suffixRaw = String(suffixInput.value || "").replace(/\D+/g, "");
      const suffixValue = (suffixRaw || String(meta.number || "1").replace(/\D+/g, "") || "1").slice(-normalizedLength);
      const { shortYear, month } = getDateParts(dateValue);
      const datePart = `_${shortYear}-${month}-`;
      if (datePartInput.value !== datePart) datePartInput.value = datePart;
      if (suffixInput.value !== suffixValue) suffixInput.value = suffixValue;
      if (!prefixInput.value.trim()) prefixInput.value = prefixValue;

      const finalNumber = `${prefixValue}${datePart}${suffixValue}`;
      hiddenInput.value = finalNumber;
      meta.number = finalNumber;
      meta.numberLength = normalizedLength;
      meta.docType = docTypeValue;
      if (typeof SEM?.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    };

    const formatNumberWithPrefix = (value, length, { docType, date, meta, prefixOverride } = {}) => {
      const numberFormat = getNumberFormat(meta);
      const prefixValue = (prefixOverride || "").trim() || docTypePrefixFor(docType);
      if (typeof formatInvoiceNumber === "function") {
        return formatInvoiceNumber(value, length, {
          docType,
          date,
          meta,
          numberFormat,
          prefixOverride: numberFormatHasPrefix(numberFormat) ? prefixValue : ""
        });
      }
      const digits = String(value ?? "").replace(/\D+/g, "");
      const numeric = Number(digits);
      const safeNumeric = Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
      const trimmed = String(safeNumeric).slice(-length) || "1";
      if (!numberFormatHasDate(numberFormat)) {
        const padded = trimmed.padStart(length, "0");
        return numberFormatHasPrefix(numberFormat) ? `${prefixValue}_${padded}` : padded;
      }
      const { shortYear, month } = getDateParts(date);
      return `${prefixValue}_${shortYear}-${month}-${trimmed}`;
    };

    const updateNumberFromSplitInputs = (docMetaBox) => {
      if (!docMetaBox) return;
      const meta = getInvoiceMeta() || {};
      const numberFormat = getNumberFormat(meta);
      const docTypeValue = String(
        docMetaBox.querySelector("#docType")?.value || meta.docType || getEl("docType")?.value || "facture"
      ).toLowerCase();
      const hiddenInput = docMetaBox.querySelector("#invNumber");
      if (!hiddenInput) return;
      if (docTypeValue === "fa") {
        meta.number = String(hiddenInput.value || "").trim();
        meta.docType = docTypeValue;
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return;
      }
      const suffixInput = docMetaBox.querySelector("#invNumberSuffix");
      const prefixInput = docMetaBox.querySelector("#invNumberPrefix");
      const datePartInput = docMetaBox.querySelector("#invNumberDatePart");
      const lengthSelect = docMetaBox.querySelector("#invNumberLength");
      const invDateInput = docMetaBox.querySelector("#invDate");
      if (!suffixInput || !prefixInput || !datePartInput || !lengthSelect) return;

      const normalizedLength = normalizeInvNumberLength(
        lengthSelect.value || meta.numberLength || 4,
        meta.numberLength || 4
      );
      if (lengthSelect.value !== String(normalizedLength)) {
        lengthSelect.value = String(normalizedLength);
      }

      const rawDigits = String(suffixInput.value || "").replace(/\D+/g, "");
      let suffixValue = rawDigits.slice(-normalizedLength);
      if (!suffixValue) {
        const metaDigits = String(meta.number || "").match(/(\d+)\s*$/)?.[1] || "1";
        suffixValue = metaDigits.replace(/\D+/g, "").slice(-normalizedLength) || "1";
      }
      if (suffixInput.value !== suffixValue) suffixInput.value = suffixValue;

      let prefixValue = "";
      if (numberFormatHasPrefix(numberFormat)) {
        prefixValue = (prefixInput.value || "").trim() || docTypePrefixFor(docTypeValue);
        if (!prefixInput.value.trim()) prefixInput.value = prefixValue;
      }

      const dateValue = String(invDateInput?.value || meta.date || "").trim();
      if (numberFormatHasDate(numberFormat)) {
        const { shortYear, month } = getDateParts(dateValue);
        const datePart = `_${shortYear}-${month}-`;
        if (datePartInput.value !== datePart) datePartInput.value = datePart;
      } else if (datePartInput.value) {
        datePartInput.value = "";
      }

      const formatted = formatNumberWithPrefix(suffixValue || "1", normalizedLength, {
        docType: docTypeValue,
        date: dateValue,
        meta,
        prefixOverride: prefixValue
      });
      const finalNumber = typeof formatted === "string" ? formatted : String(formatted || "");
      hiddenInput.value = finalNumber;
      meta.number = finalNumber;
      meta.numberLength = normalizedLength;
      meta.docType = docTypeValue;
      if (typeof SEM?.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
    };

    const syncDocMetaBoxFromState = (docMetaBox) => {
      const metaBox =
        docMetaBox ||
        itemsDocOptionsModalContent?.querySelector?.("#docMetaBoxNewDoc") ||
        null;
      if (!metaBox) return false;
      const meta = getInvoiceMeta() || {};
      const docTypeValue = String(
        meta.docType || metaBox.querySelector("#docType")?.value || getEl("docType")?.value || "facture"
      ).toLowerCase();
      const docTypeSelect = metaBox.querySelector("#docType");
      if (docTypeSelect && docTypeSelect.value !== docTypeValue) {
        docTypeSelect.value = docTypeValue;
      }
      if (typeof w.syncDocTypeMenuUi === "function") {
        w.syncDocTypeMenuUi(docTypeValue, { updateSelect: true });
      }
      syncItemsModalModelFieldVisibility(metaBox);
      syncItemsModalModelSelectorUi(metaBox, {
        docTypeValue,
        preferredModelName:
          meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || "",
        autoSelectFallback: false
      });

      const invDateInput = metaBox.querySelector("#invDate");
      const metaDate = String(meta.date || "").trim();
      if (invDateInput && metaDate && invDateInput.value !== metaDate) {
        invDateInput.value = metaDate;
      }
      const currencySelect = metaBox.querySelector("#currency");
      const currencyValue = String(meta.currency || currencySelect?.value || "DT").toUpperCase();
      if (currencySelect && currencySelect.value !== currencyValue) {
        currencySelect.value = currencyValue;
      }
      const currencyDisplay = metaBox.querySelector("#currencyDisplay");
      if (currencyDisplay) currencyDisplay.textContent = currencyValue;
      const taxSelect = metaBox.querySelector("#taxMode");
      const taxValue = meta.taxesEnabled === false ? "without" : "with";
      if (taxSelect && taxSelect.value !== taxValue) {
        taxSelect.value = taxValue;
      }
      const taxDisplay = metaBox.querySelector("#taxDisplay");
      if (taxDisplay) taxDisplay.textContent = taxValue === "without" ? "Sans taxe" : "Avec taxe";

      const hiddenInput = metaBox.querySelector("#invNumber");
      if (!hiddenInput) return true;
      const numberValue = String(meta.number || "").trim();
      if (docTypeValue === "fa") {
        if (hiddenInput.value !== numberValue) hiddenInput.value = numberValue;
        if (typeof SEM?.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        return true;
      }

      const suffixInput = metaBox.querySelector("#invNumberSuffix");
      const prefixInput = metaBox.querySelector("#invNumberPrefix");
      const datePartInput = metaBox.querySelector("#invNumberDatePart");
      const lengthSelect = metaBox.querySelector("#invNumberLength");
      if (!suffixInput || !prefixInput || !datePartInput || !lengthSelect) return true;
      const numberFormat = getNumberFormat(meta);

      const suffixDigits = numberValue.match(/(\d+)\s*$/)?.[1] || "";
      const requestedLength = suffixDigits.length || meta.numberLength || lengthSelect.value || 4;
      const normalizedLength = normalizeInvNumberLength(requestedLength, meta.numberLength || 4);
      if (lengthSelect.value !== String(normalizedLength)) {
        lengthSelect.value = String(normalizedLength);
      }

      let prefixRaw = "";
      if (numberFormatHasDate(numberFormat)) {
        const match = numberValue.match(/^(.*?)[_-]?(\d{2})-(\d{2})-(\d+)\s*$/);
        prefixRaw = match?.[1] || "";
      } else if (numberFormatHasPrefix(numberFormat)) {
        const match = numberValue.match(/^(.*?)[_-]?(\d+)\s*$/);
        prefixRaw = match?.[1] || "";
      }
      if (numberFormatHasPrefix(numberFormat)) {
        const prefixValue = prefixRaw || docTypePrefixFor(docTypeValue);
        if (prefixInput.value !== prefixValue) prefixInput.value = prefixValue;
      }

      if (numberFormatHasDate(numberFormat)) {
        const match = numberValue.match(/^(.*?)[_-]?(\d{2})-(\d{2})-(\d+)\s*$/);
        let shortYear = match?.[2] || "";
        let month = match?.[3] || "";
        if (!shortYear || !month) {
          const dateParts = getDateParts(meta.date || "");
          shortYear = dateParts.shortYear;
          month = dateParts.month;
        }
        const datePart = `_${shortYear}-${month}-`;
        if (datePartInput.value !== datePart) datePartInput.value = datePart;
      } else if (datePartInput.value) {
        datePartInput.value = "";
      }

      const trimmedSuffix = suffixDigits ? suffixDigits.replace(/\D+/g, "").slice(-normalizedLength) : "";
      if (suffixInput.value !== trimmedSuffix) suffixInput.value = trimmedSuffix;

      if (numberValue && hiddenInput.value !== numberValue) hiddenInput.value = numberValue;
      if (typeof SEM?.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      return true;
    };

    const syncDocMetaBoxModelDefaults = (docMetaBox) => {
      if (!docMetaBox) return;
      const meta = getInvoiceMeta() || {};
      const docTypeValue = String(meta.docType || "facture").toLowerCase();
      const docTypeSelect = docMetaBox.querySelector("#docType");
      if (docTypeSelect && docTypeSelect.value !== docTypeValue) {
        docTypeSelect.value = docTypeValue;
      }
      const docTypeDisplay = docMetaBox.querySelector("#docTypeDisplay");
      if (docTypeDisplay) {
        const label =
          (typeof w.docTypeLabel === "function" && w.docTypeLabel(docTypeValue)) || docTypeValue || "document";
        docTypeDisplay.textContent = label ? label.charAt(0).toUpperCase() + label.slice(1) : "Document";
      }
      docMetaBox.querySelectorAll("[data-doc-type-option]").forEach((btn) => {
        const isMatch = btn.dataset.docTypeOption === docTypeValue;
        btn.classList.toggle("is-active", isMatch);
        btn.setAttribute("aria-selected", isMatch ? "true" : "false");
      });
      syncItemsModalModelFieldVisibility(docMetaBox);
      syncItemsModalModelSelectorUi(docMetaBox, {
        docTypeValue,
        preferredModelName:
          meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || "",
        autoSelectFallback: false
      });

      const invDateInput = docMetaBox.querySelector("#invDate");
      const metaDate = String(meta.date || "").trim();
      if (invDateInput && metaDate && invDateInput.value !== metaDate) {
        invDateInput.value = metaDate;
      }

      const lengthSelect = docMetaBox.querySelector("#invNumberLength");
      if (lengthSelect && meta.numberLength) {
        const normalizedLength = normalizeInvNumberLength(meta.numberLength, lengthSelect.value || meta.numberLength);
        if (lengthSelect.value !== String(normalizedLength)) {
          lengthSelect.value = String(normalizedLength);
        }
      }

      const currencySelect = docMetaBox.querySelector("#currency");
      const currencyValue = String(meta.currency || currencySelect?.value || "DT").toUpperCase();
      if (currencySelect && currencySelect.value !== currencyValue) {
        currencySelect.value = currencyValue;
      }
      const currencyDisplay = docMetaBox.querySelector("#currencyDisplay");
      if (currencyDisplay) currencyDisplay.textContent = currencyValue;

      const taxSelect = docMetaBox.querySelector("#taxMode");
      const taxValue = meta.taxesEnabled === false ? "without" : "with";
      if (taxSelect && taxSelect.value !== taxValue) {
        taxSelect.value = taxValue;
      }
      const taxDisplay = docMetaBox.querySelector("#taxDisplay");
      if (taxDisplay) taxDisplay.textContent = taxValue === "without" ? "Sans taxe" : "Avec taxe";
    };

    const setItemsModalTitle = ({ mode, docType } = {}) => {
      if (!itemsDocOptionsModalTitle) return;
      if (mode !== undefined) {
        itemsModalMode = resolveItemsModalMode(mode);
      }
      const docTypeValue = docType || getEl("docType")?.value || getInvoiceMeta()?.docType || "";
      const normalized = String(docTypeValue || "").toLowerCase();
      const label =
        (typeof w.docTypeLabel === "function" && w.docTypeLabel(normalized)) || normalized || "document";
      const formatted = label ? label.charAt(0).toUpperCase() + label.slice(1) : "Document";
      const resolvedMode =
        mode !== undefined ? resolveItemsModalMode(mode) : normalizeItemsModalMode(itemsModalMode, "new");
      const action = resolvedMode === "edit" ? "Modifier" : "Nouveau";
      itemsDocOptionsModalTitle.textContent = `${action} document (${formatted})`;
    };

    const setItemsModalAcompteReadOnly = (readOnly = false) => {
      const disabled = !!readOnly;
      const acompteBox =
        itemsDocOptionsModalContent?.querySelector?.("#acompteBox") || getEl("acompteBox");
      if (!acompteBox) return;
      if ("disabled" in acompteBox) acompteBox.disabled = disabled;
      acompteBox.setAttribute("aria-disabled", disabled ? "true" : "false");

      const acompteToggle =
        acompteBox.querySelector?.("#acompteEnabled") || getEl("acompteEnabled");
      if (acompteToggle) acompteToggle.disabled = disabled;

      const acompteFields =
        acompteBox.querySelector?.("#acompteFields") || getEl("acompteFields");
      if (acompteFields && typeof acompteFields.querySelectorAll === "function") {
        acompteFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
          field.disabled = disabled;
        });
      }

      const acomptePaid =
        acompteBox.querySelector?.("#acomptePaid") || getEl("acomptePaid");
      if (acomptePaid) acomptePaid.disabled = disabled;
      const acompteDue =
        acompteBox.querySelector?.("#acompteDue") || getEl("acompteDue");
      if (acompteDue) acompteDue.disabled = disabled;
    };

    const CLIENT_SCOPE_SELECTOR = "#clientBoxNewDoc, #FournisseurBoxNewDoc";
    const CLIENT_FORM_FIELD_TO_KEY = {
      clientType: "type",
      clientName: "name",
      clientBeneficiary: "benefit",
      clientAccount: "account",
      clientSoldClient: "soldClient",
      clientVat: "vat",
      clientStegRef: "stegRef",
      clientPhone: "phone",
      clientEmail: "email",
      clientAddress: "address"
    };
    const CLIENT_VENDOR_FORM_ID_ALIASES = {
      clientType: "fournisseurType",
      clientTypeLabel: "fournisseurTypeLabel",
      clientTypeMenu: "fournisseurTypeMenu",
      clientTypeDisplay: "fournisseurTypeDisplay",
      clientTypePanel: "fournisseurTypePanel",
      clientName: "fournisseurName",
      clientBeneficiary: "fournisseurBeneficiary",
      clientAccount: "fournisseurAccount",
      clientSoldClient: "fournisseurSoldClient",
      clientVat: "fournisseurVat",
      clientStegRef: "fournisseurStegRef",
      clientPhone: "fournisseurPhone",
      clientEmail: "fournisseurEmail",
      clientAddress: "fournisseurAddress",
      clientIdLabel: "fournisseurIdLabel",
      btnSaveClient: "btnSaveFournisseur",
      btnUpdateClient: "btnUpdateFournisseur",
      btnNewClient: "btnNewFournisseur"
    };
    const CLIENT_VENDOR_FORM_ID_REVERSE = Object.entries(CLIENT_VENDOR_FORM_ID_ALIASES).reduce(
      (acc, [clientId, vendorId]) => {
        if (vendorId) acc[vendorId] = clientId;
        return acc;
      },
      {}
    );
    const uniqClientFormIds = (ids = []) => Array.from(new Set(ids.filter(Boolean)));
    const toCanonicalClientFormId = (id) => CLIENT_VENDOR_FORM_ID_REVERSE[id] || id;
    const resolveClientScopeEntityType = (scopeNode) =>
      scopeNode?.id === "FournisseurBoxNewDoc" ||
      scopeNode?.id === "fournisseurFormPopover" ||
      !!scopeNode?.querySelector?.("#fournisseurFormPopover")
        ? "vendor"
        : "client";
    const resolveClientFormIdCandidates = (id, scopeNode = null) => {
      const canonicalId = toCanonicalClientFormId(id);
      const vendorId = CLIENT_VENDOR_FORM_ID_ALIASES[canonicalId] || "";
      if (resolveClientScopeEntityType(scopeNode) === "vendor") {
        return uniqClientFormIds([vendorId, canonicalId]);
      }
      return uniqClientFormIds([canonicalId, vendorId]);
    };
    const queryClientFormElement = (scopeNode, id) => {
      if (!scopeNode || typeof scopeNode.querySelector !== "function") return null;
      const candidates = resolveClientFormIdCandidates(id, scopeNode);
      for (const candidate of candidates) {
        const match = scopeNode.querySelector(`#${candidate}`);
        if (match) return match;
      }
      return null;
    };
    const buildBlankClientSnapshot = () => ({
      type: "societe",
      name: "",
      benefit: "",
      account: "",
      soldClient: "",
      vat: "",
      stegRef: "",
      phone: "",
      email: "",
      address: "",
      __path: ""
    });

    const resetItemsModalClientState = (scopeNode = null) => {
      const blankClient = buildBlankClientSnapshot();
      const st = SEM.state || (SEM.state = {});
      st.client = { ...blankClient };
      if (st.client && "__dirty" in st.client) delete st.client.__dirty;

      const targetScope =
        scopeNode ||
        itemsDocOptionsModalContent?.querySelector?.(CLIENT_SCOPE_SELECTOR) ||
        null;
      if (targetScope) {
        Object.entries(CLIENT_FORM_FIELD_TO_KEY).forEach(([id, key]) => {
          const input = queryClientFormElement(targetScope, id);
          if (input && "value" in input) input.value = String(blankClient[key] || "");
        });
        const labelEl = queryClientFormElement(targetScope, "clientIdLabel");
        if (labelEl) labelEl.textContent = "Matricule fiscal";
        const vatInput = queryClientFormElement(targetScope, "clientVat");
        if (vatInput) vatInput.placeholder = "ex: 1284118/W/A/M/000";
        const typeDisplay = queryClientFormElement(targetScope, "clientTypeDisplay");
        if (typeDisplay) typeDisplay.textContent = "Societe / personne morale";
        targetScope.querySelectorAll("[data-client-type-option]").forEach((btn) => {
          const isSociete = btn.dataset.clientTypeOption === "societe";
          btn.classList.toggle("is-active", isSociete);
          btn.setAttribute("aria-selected", isSociete ? "true" : "false");
        });
        const typeMenu = queryClientFormElement(targetScope, "clientTypeMenu");
        const typeToggle = typeMenu?.querySelector("summary");
        if (typeMenu) typeMenu.open = false;
        if (typeToggle) typeToggle.setAttribute("aria-expanded", "false");
        const formToggle = targetScope.querySelector("#clientFormToggleBtn");
        if (formToggle) formToggle.setAttribute("aria-expanded", "false");
        const popover = targetScope.querySelector("#clientFormPopover, #fournisseurFormPopover");
        if (popover) {
          popover.classList.remove("is-open");
          popover.hidden = true;
          popover.setAttribute("hidden", "");
          popover.setAttribute("aria-hidden", "true");
        }
        const searchInput = targetScope.querySelector("#clientSearch");
        if (searchInput && "value" in searchInput) searchInput.value = "";
        const searchResults = targetScope.querySelector("#clientSearchResults");
        if (searchResults) {
          searchResults.innerHTML = "";
          searchResults.hidden = true;
          searchResults.classList.remove("client-search--paged");
        }
      }

      SEM.clientFormAllowUpdate = false;
      SEM.clientFormDirty = false;
      if (typeof SEM.setClientFormBaseline === "function") SEM.setClientFormBaseline(null);
      if (typeof SEM.evaluateClientDirtyState === "function") SEM.evaluateClientDirtyState();
      if (typeof SEM.refreshClientSummary === "function") SEM.refreshClientSummary();
      if (typeof SEM.refreshClientActionButtons === "function") SEM.refreshClientActionButtons();
      if (typeof SEM.refreshUpdateClientButton === "function") SEM.refreshUpdateClientButton(targetScope);
    };

    const sanitizeModelSeed = (value) => {
      const helper = SEM?.__bindingHelpers?.sanitizeModelName;
      if (typeof helper === "function") return helper(value);
      return String(value ?? "").trim();
    };

    const MODEL_DOC_TYPE_ALL = "all";
    const DEFAULT_MODEL_DOC_TYPE = "facture";
    const MODEL_DOC_TYPE_LIST = ["facture", "fa", "devis", "bl", "avoir"];
    const MODEL_DOC_TYPE_SWITCH_FACTURE = "facture";
    const MODEL_DOC_TYPE_SWITCH_FA = "fa";
    const ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY = "docTypeFaPrevChecked";
    const ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY = "docTypeFaForced";
    const ITEMS_DOC_TYPE_FA_VENTE_COLUMN_KEYS = [
      "price",
      "tva",
      "totalht",
      "totalttc"
    ];
    const ITEMS_DOC_TYPE_FA_PURCHASE_COLUMN_KEYS = [
      "purchaseprice",
      "purchasetva",
      "totalpurchaseht",
      "totalpurchasettc"
    ];
    const ITEMS_DOC_TYPE_FA_TRACKED_COLUMN_KEYS = new Set([
      ...ITEMS_DOC_TYPE_FA_VENTE_COLUMN_KEYS,
      ...ITEMS_DOC_TYPE_FA_PURCHASE_COLUMN_KEYS
    ]);
    const ITEMS_MODAL_MODEL_SELECT_ID = "docMetaModelSelect";
    const ITEMS_MODAL_MODEL_MENU_ID = "docMetaModelMenu";
    const ITEMS_MODAL_MODEL_PANEL_ID = "docMetaModelPanel";
    const ITEMS_MODAL_MODEL_DISPLAY_ID = "docMetaModelDisplay";
    const ITEMS_MODAL_MODEL_SELECT_PLACEHOLDER = "Selectionner un modele";
    const ITEMS_MODAL_MODEL_SELECT_EMPTY = "Aucun modele compatible";
    let itemsModalModelSelectSyncing = false;
    let itemsModalModelApplySeq = 0;

    const normalizeOptionalModelFlag = (value) => {
      if (value === true || value === false) return value;
      const normalized = String(value || "").trim().toLowerCase();
      if (["1", "true", "oui", "yes"].includes(normalized)) return true;
      if (["0", "false", "non", "no"].includes(normalized)) return false;
      return undefined;
    };

    const resolveItemsModalModelConfigByName = (modelName = "") => {
      const normalizedName = sanitizeModelSeed(modelName || "");
      if (!normalizedName || typeof SEM.getModelEntries !== "function") return null;
      try {
        const entries = SEM.getModelEntries();
        const match = Array.isArray(entries)
          ? entries.find((entry) => sanitizeModelSeed(entry?.name || "") === normalizedName)
          : null;
        return match?.config && typeof match.config === "object" ? match.config : null;
      } catch {
        return null;
      }
    };

    const resolveItemsModalDocOptionsRoot = () =>
      itemsDocOptionsModalContent?.querySelector?.("#DocOptions") || getEl("DocOptions") || null;

    const setItemsModalContainerVisibility = (node, visible) => {
      if (!node || typeof node !== "object") return;
      const show = visible !== false;
      node.hidden = !show;
      if (show) {
        if (typeof node.removeAttribute === "function") {
          node.removeAttribute("hidden");
          node.removeAttribute("aria-hidden");
        }
        node.style.display = "";
        return;
      }
      if (typeof node.setAttribute === "function") {
        node.setAttribute("hidden", "");
        node.setAttribute("aria-hidden", "true");
      }
      node.style.display = "none";
    };

    const resolveItemsModalFeeOptionContainers = (root, enabledId, fieldsId) => {
      if (!root || typeof root.querySelector !== "function") return [];
      const containers = [];
      const enabledInput = root.querySelector(`#${enabledId}`);
      const enabledContainer = enabledInput?.closest?.(".full") || enabledInput?.parentElement || null;
      const fieldsNode = root.querySelector(`#${fieldsId}`);
      const fieldsContainer = fieldsNode?.closest?.(".full") || fieldsNode || null;
      [enabledContainer, fieldsContainer].forEach((node) => {
        if (!node || containers.includes(node)) return;
        containers.push(node);
      });
      return containers;
    };

    const applyItemsModalOptionalSectionsVisibility = ({ modelName = "", config = null } = {}) => {
      const docOptionsRoot = resolveItemsModalDocOptionsRoot();
      if (!docOptionsRoot) return false;

      const normalizedModel = sanitizeModelSeed(modelName || "");
      const sourceConfig =
        config && typeof config === "object"
          ? config
          : resolveItemsModalModelConfigByName(normalizedModel);
      const readUsedFlag = (...values) => {
        for (const value of values) {
          const normalized = normalizeOptionalModelFlag(value);
          if (typeof normalized === "boolean") return normalized;
        }
        return undefined;
      };

      const sections = [
        {
          used: readUsedFlag(sourceConfig?.shipping?.used),
          containers: resolveItemsModalFeeOptionContainers(docOptionsRoot, "shipEnabled", "shipFields")
        },
        {
          used: readUsedFlag(sourceConfig?.stamp?.used),
          containers: resolveItemsModalFeeOptionContainers(docOptionsRoot, "stampEnabled", "stampFields")
        },
        {
          used: readUsedFlag(sourceConfig?.dossier?.used),
          containers: resolveItemsModalFeeOptionContainers(docOptionsRoot, "dossierEnabled", "dossierFields")
        },
        {
          used: readUsedFlag(sourceConfig?.deplacement?.used),
          containers: resolveItemsModalFeeOptionContainers(docOptionsRoot, "deplacementEnabled", "deplacementFields")
        },
        {
          used: readUsedFlag(sourceConfig?.financing?.used),
          containers: [docOptionsRoot.querySelector("#financingBox")].filter(Boolean)
        },
        {
          used: readUsedFlag(sourceConfig?.acompte?.used),
          containers: [docOptionsRoot.querySelector("#acompteBox")].filter(Boolean)
        },
        {
          used: readUsedFlag(sourceConfig?.reglement?.used, sourceConfig?.conditions?.used),
          containers: [docOptionsRoot.querySelector("#reglementBox")].filter(Boolean)
        }
      ];

      sections.forEach((section) => {
        const visible = section.used !== false;
        section.containers.forEach((node) => setItemsModalContainerVisibility(node, visible));
      });
      return true;
    };

    const syncItemsModalModelFieldVisibility = (metaBox) => {
      if (!metaBox) return false;
      const showModelField = isItemsModalEditMode();
      const modelField = metaBox.querySelector(".doc-model-field");
      if (modelField) {
        modelField.hidden = !showModelField;
        if (showModelField) {
          modelField.removeAttribute("hidden");
          modelField.removeAttribute("aria-hidden");
        } else {
          modelField.setAttribute("hidden", "");
          modelField.setAttribute("aria-hidden", "true");
        }
      }
      const modelSelect = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_SELECT_ID}`);
      if (modelSelect) {
        if (showModelField) {
          modelSelect.removeAttribute("aria-hidden");
          modelSelect.removeAttribute("tabindex");
        } else {
          modelSelect.setAttribute("aria-hidden", "true");
          modelSelect.setAttribute("tabindex", "-1");
        }
      }
      const modelMenu = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_MENU_ID}`);
      if (modelMenu) {
        if (showModelField) {
          modelMenu.removeAttribute("aria-hidden");
        } else {
          modelMenu.removeAttribute("open");
          modelMenu.setAttribute("aria-hidden", "true");
        }
      }
      return showModelField;
    };

    const closeItemsModalModelMenu = (metaBox) => {
      const modelMenu = metaBox?.querySelector?.(`#${ITEMS_MODAL_MODEL_MENU_ID}`) || null;
      if (!modelMenu) return false;
      if (modelMenu.open) {
        modelMenu.removeAttribute("open");
      }
      const summary = modelMenu.querySelector("summary.field-toggle-trigger");
      if (summary) {
        summary.setAttribute("aria-expanded", "false");
      }
      return true;
    };

    const syncItemsModalModelMenuUi = (
      metaBox,
      {
        menuOptions = [],
        selectedModel = "",
        displayModelName = "",
        placeholderText = ITEMS_MODAL_MODEL_SELECT_PLACEHOLDER,
        showModelField = true
      } = {}
    ) => {
      if (!metaBox) return;
      const modelMenu = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_MENU_ID}`);
      const modelPanel = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_PANEL_ID}`);
      const modelDisplay = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_DISPLAY_ID}`);
      if (!modelMenu || !modelPanel || !modelDisplay) return;

      const visibleOptions = Array.isArray(menuOptions)
        ? menuOptions.filter((entry) => entry && entry.available !== false)
        : [];
      const activeModel = normalizeItemsModalModelKey(selectedModel);
      const selectedOption = visibleOptions.find(
        (entry) => normalizeItemsModalModelKey(entry?.name || "") === activeModel
      );
      const activeLabel = selectedOption?.name || sanitizeModelSeed(displayModelName || "");
      modelDisplay.textContent = activeLabel || placeholderText || ITEMS_MODAL_MODEL_SELECT_PLACEHOLDER;

      modelPanel.innerHTML = "";
      if (!visibleOptions.length) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "model-select-empty";
        emptyMsg.textContent = ITEMS_MODAL_MODEL_SELECT_EMPTY;
        modelPanel.appendChild(emptyMsg);
      } else {
        visibleOptions.forEach((entry) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-select-option";
          btn.dataset.value = entry.name || "";
          btn.setAttribute("role", "option");
          btn.textContent = entry.name || "";
          btn.disabled = false;
          btn.dataset.unavailable = "false";
          btn.classList.remove("is-disabled");
          btn.setAttribute("aria-disabled", "false");
          btn.removeAttribute("title");
          const isActive = normalizeItemsModalModelKey(entry?.name || "") === activeModel;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          modelPanel.appendChild(btn);
        });
      }

      const summary = modelMenu.querySelector("summary.field-toggle-trigger");
      const hasAvailable = visibleOptions.length > 0;
      const isDisabled = !showModelField || !hasAvailable;
      if (summary) {
        summary.setAttribute("aria-disabled", isDisabled ? "true" : "false");
        summary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
      }
      if (isDisabled) {
        closeItemsModalModelMenu(metaBox);
      }
    };

    const wireItemsModalModelMenu = (metaBox) => {
      if (!metaBox) return;
      const modelMenu = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_MENU_ID}`);
      const modelPanel = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_PANEL_ID}`);
      const modelSelect = metaBox.querySelector(`#${ITEMS_MODAL_MODEL_SELECT_ID}`);
      if (!modelMenu || !modelPanel || !modelSelect || modelMenu.dataset.wired === "1") return;
      const summary = modelMenu.querySelector("summary.field-toggle-trigger");
      if (!summary) return;
      modelMenu.dataset.wired = "1";
      summary.setAttribute("aria-expanded", "false");

      summary.addEventListener("click", (evt) => {
        if (summary.getAttribute("aria-disabled") === "true") {
          evt.preventDefault();
          evt.stopPropagation();
        }
      });
      modelMenu.addEventListener("toggle", () => {
        summary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
        if (!modelMenu.open) return;
        const firstOption = modelPanel.querySelector(".model-select-option");
        firstOption?.focus();
      });
      modelPanel.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closeItemsModalModelMenu(metaBox);
        summary.focus();
      });
      modelPanel.addEventListener("click", (event) => {
        const btn = event.target?.closest?.(".model-select-option");
        if (!btn) return;
        const nextValue = sanitizeModelSeed(btn.dataset.value || "");
        if (!nextValue) return;
        const changed = modelSelect.value !== nextValue;
        modelSelect.value = nextValue;
        if (changed) {
          try {
            modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        }
        closeItemsModalModelMenu(metaBox);
      });
    };

    const normalizeModelDocType = (value, fallback = "") => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized || normalized === "aucun") return fallback;
      if (normalized === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_ALL;
      return MODEL_DOC_TYPE_LIST.includes(normalized) ? normalized : fallback;
    };

    const normalizeModelDocTypeList = (value, fallback = []) => {
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
      if (!normalized.length && fallback && fallback.length) {
        return normalizeModelDocTypeList(fallback, []);
      }
      return normalized;
    };

    const expandModelDocTypes = (value, fallback = []) => {
      const normalized = normalizeModelDocTypeList(value, []);
      if (normalized.length) return normalized;
      const single = normalizeModelDocType(value, "");
      if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
      if (single) return [single];
      const fallbackList = normalizeModelDocTypeList(fallback, []);
      return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
    };

    const normalizeModelDocTypeSwitchSelection = (value) => {
      let normalizedList = expandModelDocTypes(value, []);
      if (!normalizedList.length) normalizedList = [DEFAULT_MODEL_DOC_TYPE];
      const hasFacture = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FACTURE);
      const hasFa = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FA);
      if (!hasFacture || !hasFa) return normalizedList;
      return normalizedList.filter((entry) => entry !== MODEL_DOC_TYPE_SWITCH_FACTURE);
    };

    const setColumnToggleDisabledState = (input, disabled) => {
      if (!input) return;
      input.disabled = !!disabled;
      const label = input.closest?.("label.toggle-option");
      if (!label) return;
      label.classList.toggle("is-disabled", !!disabled);
      if (disabled) {
        label.setAttribute("aria-disabled", "true");
      } else {
        label.removeAttribute("aria-disabled");
      }
    };

    const setColumnToggleChecked = (input, checked) => {
      if (!input) return false;
      const changed = input.checked !== checked;
      input.checked = checked;
      input.setAttribute("aria-checked", checked ? "true" : "false");
      if (changed) {
        try {
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      }
      return changed;
    };

    const normalizeColumnKeyValue = (value) => String(value || "").trim().toLowerCase();

    const resolveItemsModalColumnTogglesByKeys = (columnKeys = []) => {
      const keySet = new Set(
        (Array.isArray(columnKeys) ? columnKeys : [])
          .map((entry) => normalizeColumnKeyValue(entry))
          .filter(Boolean)
      );
      if (!keySet.size || typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
        return [];
      }
      const queryByKeys = (selector) => {
        const list = [];
        const seenLocal = new Set();
        document.querySelectorAll(selector).forEach((input) => {
          if (!input || typeof input !== "object") return;
          if (typeof input.closest === "function" && input.closest(".article-fields-modal")) return;
          const key = normalizeColumnKeyValue(input.dataset?.columnKey);
          if (!keySet.has(key)) return;
          if (seenLocal.has(input)) return;
          seenLocal.add(input);
          list.push(input);
        });
        return list;
      };
      const itemsModalScoped = queryByKeys("#itemsDocOptionsModal input.col-toggle[data-column-key]");
      if (itemsModalScoped.length) return itemsModalScoped;
      const toggles = [];
      const seen = new Set();
      document.querySelectorAll("input.col-toggle[data-column-key]").forEach((input) => {
        if (!input || typeof input !== "object") return;
        if (typeof input.closest === "function" && input.closest("#modelActionsModal")) return;
        if (typeof input.closest === "function" && input.closest(".article-fields-modal")) return;
        const key = normalizeColumnKeyValue(input.dataset?.columnKey);
        if (!keySet.has(key)) return;
        if (seen.has(input)) return;
        seen.add(input);
        toggles.push(input);
      });
      return toggles;
    };

    const resolveModelDocTypesFromModelOptions = (modelName = "") => {
      const normalizedName = sanitizeModelSeed(modelName || "");
      const selectIds = ["docTypeModelSelect", "modelSelect"];
      for (const selectId of selectIds) {
        const selectEl = getEl(selectId);
        if (!selectEl) continue;
        let option = null;
        if (normalizedName) {
          option = Array.from(selectEl.options || []).find((opt) => sanitizeModelSeed(opt?.value || "") === normalizedName) || null;
        } else if (selectEl.selectedOptions?.length) {
          option = selectEl.selectedOptions[0] || null;
        }
        if (!option?.dataset) continue;
        const rawList = option.dataset.modelDocTypes;
        const rawSingle = option.dataset.modelDocType;
        const resolved = expandModelDocTypes(rawList !== undefined ? rawList : rawSingle, []);
        if (resolved.length) return resolved;
      }
      return [];
    };

    const resolveModelDocTypesFromEntries = (modelName = "") => {
      const normalizedName = sanitizeModelSeed(modelName || "");
      if (!normalizedName || typeof SEM.getModelEntries !== "function") return [];
      try {
        const entries = SEM.getModelEntries();
        const match = Array.isArray(entries)
          ? entries.find((entry) => sanitizeModelSeed(entry?.name || "") === normalizedName)
          : null;
        if (!match?.config) return [];
        return expandModelDocTypes(
          match.config.docTypes !== undefined ? match.config.docTypes : match.config.docType,
          []
        );
      } catch {
        return [];
      }
    };

    const resolveItemsModalModelDocTypes = ({ preferredModelName = "" } = {}) => {
      const meta = getInvoiceMeta() || {};
      const fromMeta = expandModelDocTypes(
        meta.modelDocTypes !== undefined ? meta.modelDocTypes : meta.modelDocType,
        []
      );
      if (fromMeta.length) return normalizeModelDocTypeSwitchSelection(fromMeta);
      const modelName = sanitizeModelSeed(
        preferredModelName ||
          meta.documentModelName ||
          meta.docDialogModelName ||
          meta.modelName ||
          meta.modelKey ||
          ""
      );
      if (!modelName) return [];
      const fromOptions = resolveModelDocTypesFromModelOptions(modelName);
      if (fromOptions.length) return normalizeModelDocTypeSwitchSelection(fromOptions);
      const fromEntries = resolveModelDocTypesFromEntries(modelName);
      if (fromEntries.length) return normalizeModelDocTypeSwitchSelection(fromEntries);
      return [];
    };

    function normalizeItemsModalModelKey(value) {
      const seed = sanitizeModelSeed(value || "");
      return seed ? seed.toLowerCase() : "";
    }
    function collectItemsModalModelEntries() {
      const byKey = new Map();
      const upsert = (rawName, rawDocTypes) => {
        const name = sanitizeModelSeed(rawName || "");
        if (!name) return;
        const key = normalizeItemsModalModelKey(name);
        if (!key) return;
        const normalizedDocTypes = normalizeModelDocTypeSwitchSelection(expandModelDocTypes(rawDocTypes, []));
        if (!byKey.has(key)) {
          byKey.set(key, { name, docTypes: normalizedDocTypes.slice() });
          return;
        }
        const entry = byKey.get(key);
        const nextDocTypes = new Set(entry.docTypes || []);
        normalizedDocTypes.forEach((docType) => nextDocTypes.add(docType));
        entry.docTypes = normalizeModelDocTypeSwitchSelection(Array.from(nextDocTypes));
      };

      if (typeof SEM.getModelEntries === "function") {
        try {
          const entries = SEM.getModelEntries();
          if (Array.isArray(entries)) {
            entries.forEach((entry = {}) => {
              upsert(
                entry.name,
                entry?.config?.docTypes !== undefined ? entry?.config?.docTypes : entry?.config?.docType
              );
            });
          }
        } catch {}
      }

      const selectIds = ["docTypeModelSelect", "modelSelect", "modelActionsSelect"];
      selectIds.forEach((selectId) => {
        const selectEl = getEl(selectId);
        if (!selectEl) return;
        Array.from(selectEl.options || []).forEach((option) => {
          const name = sanitizeModelSeed(option?.value || "");
          if (!name) return;
          const rawDocTypes =
            option?.dataset?.modelDocTypes !== undefined
              ? option.dataset.modelDocTypes
              : option?.dataset?.modelDocType;
          upsert(name, rawDocTypes);
        });
      });

      return Array.from(byKey.values()).sort((left, right) =>
        String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
          sensitivity: "base"
        })
      );
    }

    const toComparableBool = (value) => {
      if (typeof value === "boolean") return value;
      if (value === 1 || value === "1" || value === "true") return true;
      if (value === 0 || value === "0" || value === "false") return false;
      return null;
    };

    const toComparableNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const toComparableText = (value) => String(value == null ? "" : value).trim().toLowerCase();

    function inferItemsModalModelNameFromState(docTypeValue) {
      const normalizedDocType = normalizeModelDocType(docTypeValue, DEFAULT_MODEL_DOC_TYPE);
      const meta = getInvoiceMeta() || {};
      if (!meta || typeof meta !== "object") return "";
      if (typeof SEM.getModelEntries !== "function") return "";
      let entries = [];
      try {
        entries = SEM.getModelEntries();
      } catch {
        entries = [];
      }
      if (!Array.isArray(entries) || !entries.length) return "";

      const metaColumns =
        meta.modelColumns && typeof meta.modelColumns === "object"
          ? meta.modelColumns
          : meta.columns && typeof meta.columns === "object"
            ? meta.columns
            : {};

      const candidates = [];
      entries.forEach((entry = {}) => {
        const name = sanitizeModelSeed(entry?.name || "");
        if (!name) return;
        const config = entry?.config && typeof entry.config === "object" ? entry.config : {};
        const docTypes = normalizeModelDocTypeSwitchSelection(
          expandModelDocTypes(
            config.docTypes !== undefined ? config.docTypes : config.docType,
            DEFAULT_MODEL_DOC_TYPE
          )
        );
        if (!docTypes.includes(normalizedDocType)) return;

        let matches = 0;
        let mismatches = 0;

        const compareText = (docValue, modelValue) => {
          const modelText = toComparableText(modelValue);
          if (!modelText) return;
          const docText = toComparableText(docValue);
          if (!docText) return;
          if (docText === modelText) matches += 1;
          else mismatches += 1;
        };
        const compareNumber = (docValue, modelValue) => {
          const modelNum = toComparableNumber(modelValue);
          if (modelNum === null) return;
          const docNum = toComparableNumber(docValue);
          if (docNum === null) return;
          if (docNum === modelNum) matches += 1;
          else mismatches += 1;
        };
        const compareBool = (docValue, modelValue) => {
          const modelBool = toComparableBool(modelValue);
          if (modelBool === null) return;
          const docBool = toComparableBool(docValue);
          if (docBool === null) return;
          if (docBool === modelBool) matches += 1;
          else mismatches += 1;
        };

        compareText(meta.template, config.template);
        compareText(meta.currency, config.currency);
        compareText(meta.numberFormat, config.numberFormat);
        compareNumber(meta.numberLength, config.numberLength);
        compareBool(meta.taxesEnabled, config.taxesEnabled);

        const cfgColumns = config.columns && typeof config.columns === "object" ? config.columns : null;
        if (cfgColumns) {
          Object.keys(cfgColumns).forEach((key) => {
            compareBool(metaColumns?.[key], cfgColumns[key]);
          });
        }

        if (mismatches > 0 || matches <= 0) return;
        candidates.push({ name, matches });
      });

      if (!candidates.length) return "";
      candidates.sort((left, right) => right.matches - left.matches);
      const best = candidates[0];
      const tied = candidates.filter((candidate) => candidate.matches === best.matches);
      if (tied.length !== 1) return "";
      return best.name;
    }

    function resolveItemsModalModelEntriesForDocType(docTypeValue) {
      const normalizedDocType = normalizeModelDocType(docTypeValue, DEFAULT_MODEL_DOC_TYPE);
      return collectItemsModalModelEntries().filter((entry) => {
        const docTypes = normalizeModelDocTypeSwitchSelection(entry?.docTypes || []);
        return docTypes.includes(normalizedDocType);
      });
    }

    function resolveItemsModalCurrentModelName(metaBox) {
      const meta = getInvoiceMeta() || {};
      const selectValue = String(
        metaBox?.querySelector?.(`#${ITEMS_MODAL_MODEL_SELECT_ID}`)?.value || ""
      ).trim();
      return sanitizeModelSeed(
        meta.documentModelName ||
          meta.docDialogModelName ||
          meta.modelName ||
          meta.modelKey ||
          selectValue ||
          ""
      );
    }

    function resolveItemsModalActiveDocType(metaBox, fallbackDocType = "") {
      const fromModalSelect = normalizeModelDocType(metaBox?.querySelector?.("#docType")?.value, "");
      if (fromModalSelect) return fromModalSelect;

      const fromActiveOption = normalizeModelDocType(
        metaBox
          ?.querySelector?.("#docTypeMenu [data-doc-type-option].is-active, #docTypeMenu [data-doc-type-option][aria-selected='true']")
          ?.dataset?.docTypeOption,
        ""
      );
      if (fromActiveOption) return fromActiveOption;

      const docTypeDisplay = String(metaBox?.querySelector?.("#docTypeDisplay")?.textContent || "")
        .trim()
        .toLowerCase();
      if (docTypeDisplay) {
        const normalizedDisplay = String(docTypeDisplay)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const fromDisplay = (() => {
          if (/^facture\s+d\s+achat\b/.test(normalizedDisplay)) return "fa";
          if (/^facture\s+d\s+avoir\b/.test(normalizedDisplay)) return "avoir";
          if (/^devis\b/.test(normalizedDisplay)) return "devis";
          if (/^bon\s+de\s+livraison\b/.test(normalizedDisplay)) return "bl";
          if (/^facture\b/.test(normalizedDisplay)) return "facture";
          return "";
        })();
        const normalizedDisplayDocType = normalizeModelDocType(fromDisplay, "");
        if (normalizedDisplayDocType) return normalizedDisplayDocType;
      }

      const fromFallback = normalizeModelDocType(
        fallbackDocType || getInvoiceMeta()?.docType || getEl("docType")?.value,
        ""
      );
      return fromFallback || DEFAULT_MODEL_DOC_TYPE;
    }

    function syncItemsModalModelSelectorUi(
      metaBox,
      { docTypeValue, preferredModelName = "", autoSelectFallback = false } = {}
    ) {
      const modelSelect = metaBox?.querySelector?.(`#${ITEMS_MODAL_MODEL_SELECT_ID}`) || null;
      if (!modelSelect) {
        return {
          selectedModel: "",
          previousModel: "",
          docTypeValue: normalizeModelDocType(docTypeValue, DEFAULT_MODEL_DOC_TYPE),
          options: []
        };
      }
      const normalizedDocType = resolveItemsModalActiveDocType(metaBox, docTypeValue);
      const options = resolveItemsModalModelEntriesForDocType(normalizedDocType).map((entry) => ({
        name: entry?.name || "",
        docTypes: normalizeModelDocTypeSwitchSelection(entry?.docTypes || []),
        available: true
      }));
      const previousModel = sanitizeModelSeed(modelSelect.value || "");
      const inferred = inferItemsModalModelNameFromState(normalizedDocType);
      const preferred = sanitizeModelSeed(
        preferredModelName || resolveItemsModalCurrentModelName(metaBox) || inferred
      );
      const preferredKey = normalizeItemsModalModelKey(preferred);
      const selectedMatch = options.find(
        (entry) => normalizeItemsModalModelKey(entry?.name || "") === preferredKey
      );
      const nextModel = selectedMatch?.name || "";
      const displayModelName = nextModel || preferred || "";
      const showModelField = syncItemsModalModelFieldVisibility(metaBox);

      itemsModalModelSelectSyncing = true;
      try {
        modelSelect.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = options.length
          ? ITEMS_MODAL_MODEL_SELECT_PLACEHOLDER
          : ITEMS_MODAL_MODEL_SELECT_EMPTY;
        modelSelect.appendChild(placeholder);
        options.forEach((entry) => {
          const optionEl = document.createElement("option");
          optionEl.value = entry.name;
          optionEl.textContent = entry.name;
          optionEl.dataset.modelDocType = entry.docTypes?.[0] || DEFAULT_MODEL_DOC_TYPE;
          optionEl.dataset.modelDocTypes = (entry.docTypes || []).join(",");
          optionEl.dataset.modelUnavailable = "false";
          modelSelect.appendChild(optionEl);
        });
        modelSelect.disabled = !showModelField || !options.length;
        modelSelect.setAttribute("aria-disabled", modelSelect.disabled ? "true" : "false");
        modelSelect.value = nextModel || "";
        syncItemsModalModelMenuUi(metaBox, {
          menuOptions: options,
          selectedModel: modelSelect.value || "",
          displayModelName,
          placeholderText: options.length
            ? ITEMS_MODAL_MODEL_SELECT_PLACEHOLDER
            : ITEMS_MODAL_MODEL_SELECT_EMPTY,
          showModelField
        });
      } finally {
        itemsModalModelSelectSyncing = false;
      }

      return {
        selectedModel: sanitizeModelSeed(displayModelName || ""),
        previousModel,
        docTypeValue: normalizedDocType,
        options
      };
    }

    async function applyItemsModalModelByNameSilent(modelName) {
      const nextModel = sanitizeModelSeed(modelName || "");
      if (!nextModel || typeof SEM.applyModelByNameSilent !== "function") return false;
      const isEditMode = isItemsModalEditMode();
      const prevForceOverwrite = w.__itemsModalForceModelOwnedOverwrite;
      w.__itemsModalForceModelOwnedOverwrite = !isEditMode;
      try {
        return !!(
          await SEM.applyModelByNameSilent(nextModel, {
            scope: isEditMode ? "items-section" : "full",
            persistMeta: !isEditMode
          })
        );
      } finally {
        w.__itemsModalForceModelOwnedOverwrite = prevForceOverwrite;
      }
    }

    async function applyItemsModalSelectedModel(
      modelName,
      { docMetaBox = null, enforceDocType = false, skipSelectorRefresh = false } = {}
    ) {
      const meta = getInvoiceMeta() || {};
      const nextModel = sanitizeModelSeed(modelName || "");
      if (!nextModel) {
        meta.documentModelName = "";
        meta.docDialogModelName = "";
        meta.modelName = "";
        meta.modelKey = "";
        delete meta.modelDocTypes;
        delete meta.modelDocType;
        applyItemsModalModelDocTypes([], { enforceDocType: false });
        if (!skipSelectorRefresh && docMetaBox) {
          syncItemsModalModelSelectorUi(docMetaBox, {
            preferredModelName: "",
            autoSelectFallback: false
          });
        }
        if (typeof SEM?.markDocumentDirty === "function") {
          SEM.markDocumentDirty(true);
        }
        try {
          if (typeof w.invalidatePdfPreviewCache === "function") {
            w.invalidatePdfPreviewCache({ closeModal: true });
          }
        } catch {}
        applyItemsModalOptionalSectionsVisibility({ config: null });
        syncDocMetaBoxFromState(docMetaBox);
        return false;
      }

      const currentModel = sanitizeModelSeed(
        meta.documentModelName ||
          meta.docDialogModelName ||
          meta.modelName ||
          meta.modelKey ||
          ""
      );
      const isSameModel =
        normalizeItemsModalModelKey(currentModel) === normalizeItemsModalModelKey(nextModel);
      if (isSameModel) {
        let reapplied = false;
        try {
          reapplied = await applyItemsModalModelByNameSilent(nextModel);
        } catch (err) {
          console.warn("items modal same-model reapply failed", err);
        }
        const modelDocTypes = resolveItemsModalModelDocTypes({ preferredModelName: nextModel });
        applyItemsModalModelDocTypes(modelDocTypes, { enforceDocType });
        if (!skipSelectorRefresh && docMetaBox) {
          syncItemsModalModelSelectorUi(docMetaBox, {
            preferredModelName: nextModel,
            autoSelectFallback: false
          });
        }
        applyItemsModalOptionalSectionsVisibility({ modelName: nextModel });
        syncDocMetaBoxFromState(docMetaBox);
        return reapplied || true;
      }

      const applySeq = ++itemsModalModelApplySeq;
      let applied = false;
      try {
        applied = await applyItemsModalModelByNameSilent(nextModel);
      } catch (err) {
        console.warn("items modal model apply failed", err);
      }
      if (applySeq !== itemsModalModelApplySeq) return applied;

      meta.documentModelName = nextModel;
      meta.docDialogModelName = nextModel;
      meta.modelName = nextModel;
      meta.modelKey = nextModel;
      const modelDocTypes = resolveItemsModalModelDocTypes({ preferredModelName: nextModel });
      applyItemsModalModelDocTypes(modelDocTypes, { enforceDocType });

      if (!skipSelectorRefresh && docMetaBox) {
        syncItemsModalModelSelectorUi(docMetaBox, {
          preferredModelName: nextModel,
          autoSelectFallback: false
        });
      }
      if (typeof SEM?.markDocumentDirty === "function") {
        SEM.markDocumentDirty(true);
      }
      try {
        if (typeof w.invalidatePdfPreviewCache === "function") {
          w.invalidatePdfPreviewCache({ closeModal: true });
        }
      } catch {}
      applyItemsModalOptionalSectionsVisibility({ modelName: nextModel });
      syncDocMetaBoxFromState(docMetaBox);
      return applied;
    }

    async function ensureItemsModalModelForDocType(
      docMetaBox,
      { docTypeValue, autoSelectFallback = true, enforceDocType = false } = {}
    ) {
      if (!docMetaBox) return { selectedModel: "", changed: false };
      const metaBeforeSync = getInvoiceMeta() || {};
      const modelFromMetaBeforeSync = sanitizeModelSeed(
        metaBeforeSync.documentModelName ||
          metaBeforeSync.docDialogModelName ||
          metaBeforeSync.modelName ||
          metaBeforeSync.modelKey ||
          ""
      );
      const syncResult = syncItemsModalModelSelectorUi(docMetaBox, {
        docTypeValue,
        preferredModelName: modelFromMetaBeforeSync,
        autoSelectFallback
      });
      const selectedModel = sanitizeModelSeed(syncResult.selectedModel || "");
      if (!selectedModel) {
        const meta = getInvoiceMeta() || {};
        meta.documentModelName = "";
        meta.docDialogModelName = "";
        meta.modelName = "";
        meta.modelKey = "";
        delete meta.modelDocTypes;
        delete meta.modelDocType;
        applyItemsModalModelDocTypes([], { enforceDocType: false });
        applyItemsModalOptionalSectionsVisibility({ config: null });
        return { selectedModel: "", changed: !!modelFromMetaBeforeSync };
      }
      const changed =
        normalizeItemsModalModelKey(selectedModel) !==
        normalizeItemsModalModelKey(modelFromMetaBeforeSync);
      const metaCurrent = getInvoiceMeta() || {};
      const hasLoadedHistoryDoc = !!String(metaCurrent.historyPath || "").trim();
      if (changed && !modelFromMetaBeforeSync && hasLoadedHistoryDoc && isItemsModalEditMode()) {
        metaCurrent.documentModelName = selectedModel;
        metaCurrent.docDialogModelName = selectedModel;
        metaCurrent.modelName = selectedModel;
        metaCurrent.modelKey = selectedModel;
        const inferredDocTypes = resolveItemsModalModelDocTypes({ preferredModelName: selectedModel });
        applyItemsModalModelDocTypes(inferredDocTypes, { enforceDocType });
        applyItemsModalOptionalSectionsVisibility({ modelName: selectedModel });
        return { selectedModel, changed: false };
      }
      if (changed) {
        await applyItemsModalSelectedModel(selectedModel, {
          docMetaBox,
          enforceDocType,
          skipSelectorRefresh: true
        });
        syncItemsModalModelSelectorUi(docMetaBox, {
          docTypeValue: syncResult.docTypeValue,
          preferredModelName: selectedModel,
          autoSelectFallback: false
        });
        syncDocMetaBoxFromState(docMetaBox);
        return { selectedModel, changed: true };
      }
      const modelDocTypes = resolveItemsModalModelDocTypes({ preferredModelName: selectedModel });
      applyItemsModalModelDocTypes(modelDocTypes, { enforceDocType });
      applyItemsModalOptionalSectionsVisibility({ modelName: selectedModel });
      return { selectedModel, changed: false };
    }

    const applyItemsModalFaColumnLocks = (modelDocTypes = []) => {
      const normalizedList = normalizeModelDocTypeSwitchSelection(modelDocTypes);
      const hasModelDocTypes = normalizedList.length > 0;
      const isFaActive = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FA);
      const isFactureActive = normalizedList.includes(MODEL_DOC_TYPE_SWITCH_FACTURE);
      const saleToggles = resolveItemsModalColumnTogglesByKeys(ITEMS_DOC_TYPE_FA_VENTE_COLUMN_KEYS);
      const purchaseToggles = resolveItemsModalColumnTogglesByKeys(ITEMS_DOC_TYPE_FA_PURCHASE_COLUMN_KEYS);
      const syncTaxLocks = SEM?.__bindingHelpers?.syncTaxModeDependentColumnToggles;
      const allToggles = [...saleToggles, ...purchaseToggles];
      const syncScope = allToggles.some((toggle) => {
        if (!toggle) return false;
        if (typeof toggle.closest === "function" && toggle.closest("#modelActionsModal")) return true;
        return String(toggle.id || "").endsWith("Modal");
      })
        ? "model"
        : "main";

      if (!hasModelDocTypes) {
        allToggles.forEach((toggle) => {
          setColumnToggleDisabledState(toggle, false);
          const prevValue = toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY];
          if (prevValue === "true" || prevValue === "false") {
            setColumnToggleChecked(toggle, prevValue === "true");
          }
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY];
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY];
        });
        if (typeof syncTaxLocks === "function") {
          syncTaxLocks({ scope: syncScope });
        }
        if (typeof SEM?.applyColumnHiding === "function") {
          SEM.applyColumnHiding();
        }
        return;
      }

      if (isFaActive) {
        saleToggles.forEach((toggle) => {
          if (toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY] !== "1") {
            toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY] = String(!!toggle.checked);
          }
          setColumnToggleChecked(toggle, false);
          setColumnToggleDisabledState(toggle, true);
          toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY] = "1";
        });

        purchaseToggles.forEach((toggle) => {
          setColumnToggleDisabledState(toggle, false);
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY];
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY];
          setColumnToggleChecked(toggle, true);
        });
      } else {
        saleToggles.forEach((toggle) => {
          const wasForced = toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY] === "1";
          setColumnToggleDisabledState(toggle, false);
          if (wasForced) {
            const prevValue = toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY];
            if (prevValue === "true" || prevValue === "false") {
              setColumnToggleChecked(toggle, prevValue === "true");
            }
          }
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY];
          delete toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY];
        });

        if (typeof syncTaxLocks === "function") {
          syncTaxLocks({ scope: syncScope });
        }

        if (isFactureActive) {
          saleToggles.forEach((toggle) => {
            setColumnToggleDisabledState(toggle, false);
            setColumnToggleChecked(toggle, true);
          });
        }

        purchaseToggles.forEach((toggle) => {
          if (toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY] !== "1") {
            toggle.dataset[ITEMS_DOC_TYPE_FA_LOCK_DATASET_KEY] = String(!!toggle.checked);
          }
          setColumnToggleChecked(toggle, false);
          setColumnToggleDisabledState(toggle, true);
          toggle.dataset[ITEMS_DOC_TYPE_FA_FORCED_DATASET_KEY] = "1";
        });
      }

      if (typeof SEM?.applyColumnHiding === "function") {
        SEM.applyColumnHiding();
      }
    };

    const applyItemsModalModelDocTypes = (modelDocTypes = [], { enforceDocType = false } = {}) => {
      const normalizedList = normalizeModelDocTypeSwitchSelection(modelDocTypes);
      const meta = getInvoiceMeta() || {};

      if (normalizedList.length) {
        meta.modelDocTypes = normalizedList.slice();
        meta.modelDocType = normalizedList[0] || DEFAULT_MODEL_DOC_TYPE;
      } else {
        delete meta.modelDocTypes;
        delete meta.modelDocType;
      }

      if (normalizedList.length && enforceDocType) {
        if (typeof w.syncDocTypeMenuUi === "function") {
          const currentDocType = String(meta.docType || getEl("docType")?.value || DEFAULT_MODEL_DOC_TYPE).toLowerCase();
          w.syncDocTypeMenuUi(currentDocType, { updateSelect: true, allowedDocTypes: normalizedList });
        } else if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
          w.setDocTypeMenuAllowedDocTypes(normalizedList, { enforceSelection: false });
        }
      } else if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
        w.setDocTypeMenuAllowedDocTypes(null, { enforceSelection: false });
      }

      if (enforceDocType && normalizedList.length) {
        const docTypeSelect = itemsDocOptionsModalContent?.querySelector?.("#docMetaBoxNewDoc #docType") || null;
        if (docTypeSelect) {
          const currentDocType = String(docTypeSelect.value || meta.docType || DEFAULT_MODEL_DOC_TYPE).toLowerCase();
          if (!normalizedList.includes(currentDocType)) {
            const nextDocType = normalizedList[0] || DEFAULT_MODEL_DOC_TYPE;
            if (docTypeSelect.value !== nextDocType) {
              docTypeSelect.value = nextDocType;
              try {
                docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
              } catch {}
            }
          }
        }
      }

      applyItemsModalFaColumnLocks(normalizedList);
      return normalizedList;
    };

    const reapplyItemsModalModelState = ({ modelName = "", enforceDocType = false, allowPanel = true } = {}) => {
      const resolved = resolveItemsModalModelDocTypes({ preferredModelName: modelName, allowPanel });
      return applyItemsModalModelDocTypes(resolved, { enforceDocType });
    };

    const applyModalSeed = (options = {}) => {
      const meta = getInvoiceMeta() || {};
      const rawDocType = String(options.docType || "").trim();
      if (rawDocType) {
        meta.docType = rawDocType.toLowerCase();
      }
      const modelName = sanitizeModelSeed(options.model);
      if (!modelName) {
        if (Object.prototype.hasOwnProperty.call(options, "model")) {
          meta.documentModelName = "";
          meta.docDialogModelName = "";
          meta.modelName = "";
          meta.modelKey = "";
          delete meta.modelDocTypes;
          delete meta.modelDocType;
        }
        return null;
      }
      meta.documentModelName = modelName;
      meta.docDialogModelName = modelName;
      meta.modelName = modelName;
      meta.modelKey = modelName;
      const resolvedDocTypes = resolveItemsModalModelDocTypes({ preferredModelName: modelName, allowPanel: true });
      meta.modelDocTypes = resolvedDocTypes.slice();
      meta.modelDocType = resolvedDocTypes[0] || DEFAULT_MODEL_DOC_TYPE;
      try {
        return applyItemsModalModelByNameSilent(modelName);
      } catch {}
      if (typeof SEM.applyModelByNameSilent === "function") {
        try {
          return SEM.applyModelByNameSilent(modelName);
        } catch {}
      }
      return null;
    };

    const rememberOriginalLocation = (ref, node) => {
      if (!ref || !node || ref.parent) return;
      ref.node = node;
      ref.parent = node.parentNode || null;
      ref.next = node.nextSibling || null;
    };

    const restoreMovedContent = () => {
      if (!itemsModalMoved || !itemsDocOptionsModalContent) return;
      Object.entries(movableRefs).forEach(([key, ref]) => {
        if (!ref?.node || !ref.parent) return;
        try {
          ref.parent.insertBefore(ref.node, ref.next);
        } catch {}
        if (key === "itemsSection" || key === "docOptions") {
          ref.node.hidden = true;
          ref.node.setAttribute("hidden", "");
        }
      });
      itemsDocOptionsModalContent.innerHTML = "";
      itemsModalMoved = false;
    };

    const buildItemsModalContent = () => {
      if (!itemsDocOptionsModalContent) return false;
      itemsModalMoved = false;
      const fragment = document.createDocumentFragment();
      const rowTop = document.createElement("section");
      rowTop.className = "grid two";
      const rowBottom = document.createElement("div");
      rowBottom.className = "section-row";

      const renderDocMetaBox = () => {
        try {
          if (typeof w.DocMetaBoxNewDoc?.render === "function") return w.DocMetaBoxNewDoc.render();
          if (typeof w.NewDocMetaBox?.render === "function") return w.NewDocMetaBox.render();
        } catch (err) {
          console.error("render new document doc meta failed", err);
        }
        return null;
      };

      const CLIENT_BOX_SELECTOR = "#clientBoxNewDoc, #FournisseurBoxNewDoc";
      const resolveDocTypeValue = () =>
        String(getInvoiceMeta()?.docType || getEl("docType")?.value || "facture").toLowerCase();
      const shouldUseVendorBox = (docTypeValue) => String(docTypeValue || "").toLowerCase() === "fa";
      const renderClientBox = (docTypeValue) => {
        try {
          if (shouldUseVendorBox(docTypeValue) && typeof w.FournisseurBoxNewDoc?.render === "function") {
            return w.FournisseurBoxNewDoc.render();
          }
          if (typeof w.ClientBoxNewDoc?.render === "function") return w.ClientBoxNewDoc.render();
        } catch (err) {
          console.error("render new document client box failed", err);
        }
        return null;
      };
      const snapshotClientBoxValues = (box) => {
        const snapshot = {};
        if (!box) return snapshot;
        Object.keys(CLIENT_FORM_FIELD_TO_KEY).forEach((id) => {
          const input = queryClientFormElement(box, id);
          if (input && "value" in input) snapshot[id] = input.value;
        });
        return snapshot;
      };
      const syncClientTypeUi = (box, typeValue) => {
        if (!box) return;
        const typeRaw = String(typeValue || "").toLowerCase();
        const resolvedType =
          typeRaw === "particulier" || typeRaw === "personne_physique" ? typeRaw : "societe";
        const isParticulier = resolvedType === "particulier";
        const labelText = isParticulier ? "CIN / passeport" : "Matricule fiscal";
        const placeholder = isParticulier ? "CIN ou Passeport" : "ex: 1284118/W/A/M/000";
        const labelEl = queryClientFormElement(box, "clientIdLabel");
        const vatInput = queryClientFormElement(box, "clientVat");
        if (labelEl) labelEl.textContent = labelText;
        if (vatInput) vatInput.placeholder = placeholder;
        const displayEl = queryClientFormElement(box, "clientTypeDisplay");
        if (displayEl) {
          displayEl.textContent =
            resolvedType === "particulier"
              ? "Particulier"
              : resolvedType === "personne_physique"
                ? "Personne physique"
                : "Societe / personne morale";
        }
        const panel = queryClientFormElement(box, "clientTypePanel");
        if (panel) {
          panel.querySelectorAll("[data-client-type-option]").forEach((btn) => {
            const isMatch = btn.dataset.clientTypeOption === resolvedType;
            btn.classList.toggle("is-active", isMatch);
            btn.setAttribute("aria-selected", isMatch ? "true" : "false");
          });
        }
        const menu = queryClientFormElement(box, "clientTypeMenu");
        if (menu && menu.open) menu.open = false;
        const toggle = menu?.querySelector("summary");
        if (toggle) {
          toggle.setAttribute("aria-expanded", menu?.open ? "true" : "false");
        }
      };
      const applyClientBoxValues = (box, snapshot = {}) => {
        if (!box) return;
        Object.keys(CLIENT_FORM_FIELD_TO_KEY).forEach((id) => {
          const input = queryClientFormElement(box, id);
          if (input && "value" in input && snapshot[id] !== undefined) {
            input.value = snapshot[id];
          }
        });
        syncClientTypeUi(box, queryClientFormElement(box, "clientType")?.value);
      };
      const wireClientBox = (box) => {
        if (!box) return;
        box.addEventListener("input", () => {
          if (typeof SEM.refreshClientActionButtons === "function") {
            SEM.refreshClientActionButtons();
          }
        });
      };
      const swapClientBoxForDocType = (docTypeValue) => {
        const targetBox = renderClientBox(docTypeValue);
        if (!targetBox) return;
        const existing = rowTop.querySelector(CLIENT_BOX_SELECTOR);
        if (existing && existing.id === targetBox.id) return;
        const snapshot = snapshotClientBoxValues(existing);
        if (existing && existing.parentNode) {
          existing.parentNode.replaceChild(targetBox, existing);
        } else {
          rowTop.appendChild(targetBox);
        }
        applyClientBoxValues(targetBox, snapshot);
        wireClientBox(targetBox);
      };

      const docMetaBox = renderDocMetaBox();
      const clientBox = renderClientBox(resolveDocTypeValue());
      if (docMetaBox) {
        const isEditMode = isItemsModalEditMode();
        docMetaBox.classList.toggle("doc-meta-box--new-mode", !isEditMode);
        if (!isEditMode) {
          const modelField = docMetaBox.querySelector(".doc-model-field");
          const modelFieldItem = modelField?.closest?.(".doc-meta-grid__item") || null;
          if (modelFieldItem?.parentNode) {
            modelFieldItem.parentNode.removeChild(modelFieldItem);
          } else if (modelField?.parentNode) {
            modelField.parentNode.removeChild(modelField);
          }
        }
        const meta = getInvoiceMeta() || {};
        syncDocMetaBoxModelDefaults(docMetaBox);
        if (meta.historyPath) {
          syncDocMetaBoxFromState(docMetaBox);
        } else {
          void applyNextNumberToDocMetaBox(docMetaBox);
        }
        const invDateInput = docMetaBox.querySelector("#invDate");
        if (invDateInput) {
          if (meta.date && !invDateInput.value) {
            invDateInput.value = meta.date;
          }
          if (w.AppDatePicker?.create) {
            w.AppDatePicker.create(invDateInput, {
              labels: {
                today: "Aujourd'hui",
                clear: "Effacer",
                prevMonth: "Mois prAccAcdent",
                nextMonth: "Mois suivant",
                dialog: "Choisir une date"
              },
              allowManualInput: true
            });
          } else {
            invDateInput.readOnly = false;
          }
          invDateInput.addEventListener("input", () => {
            meta.date = String(invDateInput.value || "").trim();
          });
          invDateInput.addEventListener("change", () => {
            meta.date = String(invDateInput.value || "").trim();
            updateNumberFromDate(docMetaBox);
          });
        }
        const docTypeSelectModal = docMetaBox.querySelector("#docType");
        const docModelSelectModal = docMetaBox.querySelector(`#${ITEMS_MODAL_MODEL_SELECT_ID}`);
        wireItemsModalModelMenu(docMetaBox);
        docModelSelectModal?.addEventListener("change", () => {
          if (itemsModalModelSelectSyncing) return;
          const selectedModel = sanitizeModelSeed(docModelSelectModal.value || "");
          void applyItemsModalSelectedModel(selectedModel, {
            docMetaBox,
            enforceDocType: false
          });
        });
        docTypeSelectModal?.addEventListener("change", () => {
          const meta = getInvoiceMeta() || {};
          meta.docType = String(docTypeSelectModal.value || meta.docType || "facture").toLowerCase();
          if (typeof w.syncDocTypeMenuUi === "function") {
            w.syncDocTypeMenuUi(meta.docType, { updateSelect: true });
          }
          void applyNextNumberToDocMetaBox(docMetaBox);
          swapClientBoxForDocType(meta.docType);
          void ensureItemsModalModelForDocType(docMetaBox, {
            docTypeValue: meta.docType,
            autoSelectFallback: true,
            enforceDocType: false
          });
        });
        const invNumberLengthSelect = docMetaBox.querySelector("#invNumberLength");
        invNumberLengthSelect?.addEventListener("change", () => void applyNextNumberToDocMetaBox(docMetaBox));
        const invNumberPrefixInput = docMetaBox.querySelector("#invNumberPrefix");
        const invNumberSuffixInput = docMetaBox.querySelector("#invNumberSuffix");
        const invNumberInput = docMetaBox.querySelector("#invNumber");
        invNumberPrefixInput?.addEventListener("input", () => updateNumberFromSplitInputs(docMetaBox));
        invNumberSuffixInput?.addEventListener("input", () => updateNumberFromSplitInputs(docMetaBox));
        invNumberSuffixInput?.addEventListener("blur", () => updateNumberFromSplitInputs(docMetaBox));
        invNumberInput?.addEventListener("input", () => updateNumberFromSplitInputs(docMetaBox));
        syncItemsModalModelSelectorUi(docMetaBox, {
          docTypeValue: meta.docType || docTypeSelectModal?.value || "facture",
          preferredModelName:
            meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || "",
          autoSelectFallback: true
        });
        rowTop.appendChild(docMetaBox);
      }
      if (clientBox) {
        rowTop.appendChild(clientBox);
        wireClientBox(clientBox);
      }

      if (!docMetaBox || !clientBox) {
        console.warn("new document modal missing dedicated components", {
          docMetaBox: !!docMetaBox,
          clientBox: !!clientBox
        });
        return false;
      }

      const itemsSection = getEl("itemsSection");
      if (itemsSection) {
        rememberOriginalLocation(movableRefs.itemsSection, itemsSection);
        itemsSection.hidden = false;
        itemsSection.removeAttribute("hidden");
        rowBottom.appendChild(itemsSection);
        itemsModalMoved = true;
      }

      const docOptions = getEl("DocOptions");
      if (docOptions) {
        rememberOriginalLocation(movableRefs.docOptions, docOptions);
        docOptions.hidden = false;
        docOptions.removeAttribute("hidden");
        rowBottom.appendChild(docOptions);
        itemsModalMoved = true;
      }

      itemsDocOptionsModalContent.innerHTML = "";
      fragment.appendChild(rowTop);
      if (rowBottom.childElementCount) fragment.appendChild(rowBottom);
      itemsDocOptionsModalContent.appendChild(fragment);
      if (typeof w.syncDocTypeMenuUi === "function") {
        const meta = getInvoiceMeta() || {};
        const docTypeValue = String(
          meta.docType || docMetaBox?.querySelector("#docType")?.value || "facture"
        ).toLowerCase();
        w.syncDocTypeMenuUi(docTypeValue, { updateSelect: true });
      }
      reapplyItemsModalModelState({
        enforceDocType: false,
        allowPanel: true
      });
      applyItemsModalOptionalSectionsVisibility({
        modelName: sanitizeModelSeed(
          getInvoiceMeta()?.documentModelName ||
            getInvoiceMeta()?.docDialogModelName ||
            getInvoiceMeta()?.modelName ||
            getInvoiceMeta()?.modelKey ||
            ""
        )
      });
      void ensureItemsModalModelForDocType(docMetaBox, {
        autoSelectFallback: true,
        enforceDocType: false
      });
      return true;
    };

    const isItemsModalOpen = () =>
      itemsDocOptionsModal &&
      itemsDocOptionsModal.classList.contains("is-open") &&
      itemsDocOptionsModal.getAttribute("aria-hidden") === "false";

    const openItemsModal = (options = {}) => {
      if (!itemsDocOptionsModal || !itemsDocOptionsModalContent) return false;
      itemsModalMode = resolveItemsModalMode(options.mode);
      if (isItemsModalOpen()) {
        if (typeof SEM?.renderItems === "function") {
          SEM.renderItems();
        }
        syncDocMetaBoxFromState();
        applyItemsModalOptionalSectionsVisibility({
          modelName: sanitizeModelSeed(
            getInvoiceMeta()?.documentModelName ||
              getInvoiceMeta()?.docDialogModelName ||
              getInvoiceMeta()?.modelName ||
              getInvoiceMeta()?.modelKey ||
              ""
          )
        });
        setItemsModalTitle({ mode: itemsModalMode, docType: options.docType || getInvoiceMeta()?.docType });
        setItemsModalAcompteReadOnly(isItemsModalEditMode());
        return true;
      }

      const finishOpen = () => {
        if (isItemsModalOpen()) return true;
        const built = buildItemsModalContent();
        if (!built) {
          console.warn("new document modal unavailable; dedicated components not ready");
          return false;
        }
        if (typeof SEM?.renderItems === "function") {
          SEM.renderItems();
        }
        if (typeof SEM?.applyColumnHiding === "function") {
          SEM.applyColumnHiding();
        }
        const modelName = sanitizeModelSeed(
          options.model ||
            getInvoiceMeta()?.documentModelName ||
            getInvoiceMeta()?.docDialogModelName ||
            getInvoiceMeta()?.modelName ||
            getInvoiceMeta()?.modelKey ||
            ""
        );
        reapplyItemsModalModelState({
          modelName,
          enforceDocType: false,
          allowPanel: true
        });
        applyItemsModalOptionalSectionsVisibility({ modelName });
        const metaBox = itemsDocOptionsModalContent?.querySelector?.("#docMetaBoxNewDoc") || null;
        if (metaBox) {
          syncItemsModalModelSelectorUi(metaBox, {
            preferredModelName: modelName,
            autoSelectFallback: true
          });
        }
        if (options.resetClient === true) {
          const scopeNode = itemsDocOptionsModalContent?.querySelector?.(CLIENT_SCOPE_SELECTOR) || null;
          resetItemsModalClientState(scopeNode);
        }

        itemsDocOptionsRestoreFocus = document.activeElement || null;
        setItemsModalTitle({ mode: itemsModalMode, docType: options.docType || getInvoiceMeta()?.docType });
        setItemsModalAcompteReadOnly(isItemsModalEditMode());
        itemsDocOptionsModal.hidden = false;
        itemsDocOptionsModal.removeAttribute("hidden");
        itemsDocOptionsModal.setAttribute("aria-hidden", "false");
        itemsDocOptionsModal.classList.add("is-open");
        try {
          itemsDocOptionsModal.focus({ preventScroll: true });
        } catch (focusErr) {
          try {
            itemsDocOptionsModal.focus();
          } catch {}
        }
        return true;
      };

      const seedPromise = applyModalSeed(options);
      if (seedPromise && typeof seedPromise.then === "function") {
        seedPromise
          .catch(() => {})
          .finally(() => {
            if (!finishOpen()) return;
            setItemsModalTitle({ mode: itemsModalMode, docType: options.docType || getInvoiceMeta()?.docType });
            syncDocMetaBoxFromState();
          });
        return true;
      }

      return finishOpen();
    };

    const closeItemsModal = () => {
      itemsModalModelApplySeq += 1;
      itemsModalModelSelectSyncing = false;
      itemsModalMode = "new";
      setItemsModalAcompteReadOnly(false);
      restoreMovedContent();
      if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
        w.setDocTypeMenuAllowedDocTypes(null, { enforceSelection: false });
      }
      if (!itemsDocOptionsModal) return;
      itemsDocOptionsModal.classList.remove("is-open");
      itemsDocOptionsModal.hidden = true;
      itemsDocOptionsModal.setAttribute("hidden", "");
      itemsDocOptionsModal.setAttribute("aria-hidden", "true");
      const restoreTarget = itemsDocOptionsRestoreFocus;
      itemsDocOptionsRestoreFocus = null;
      if (restoreTarget && typeof restoreTarget.focus === "function") {
        try {
          restoreTarget.focus();
        } catch {}
      }
    };

    [itemsDocOptionsModalClose, itemsDocOptionsModalCloseFooter].forEach((btn) => {
      btn?.addEventListener("click", closeItemsModal);
    });
    itemsDocOptionsModal?.addEventListener("click", (evt) => {
      if (evt.target === itemsDocOptionsModal) {
        evt.stopPropagation();
      }
    });
    itemsDocOptionsModal?.addEventListener(
      "keydown",
      (evt) => {
        if (evt.key === "Escape") {
          evt.preventDefault();
          closeItemsModal();
        }
      },
      true
    );

    itemsDocOptionsModalContent?.addEventListener("change", (evt) => {
      if (!isItemsModalOpen()) return;
      const input = evt.target?.closest?.("input.col-toggle[data-column-key]");
      if (!input) return;
      const key = normalizeColumnKeyValue(input.dataset?.columnKey);
      if (!ITEMS_DOC_TYPE_FA_TRACKED_COLUMN_KEYS.has(key)) return;
      const docTypes = resolveItemsModalModelDocTypes({ allowPanel: true });
      applyItemsModalFaColumnLocks(docTypes);
    });
    itemsDocOptionsModalContent?.addEventListener("click", (evt) => {
      if (!isItemsModalOpen()) return;
      const metaBox = itemsDocOptionsModalContent?.querySelector?.("#docMetaBoxNewDoc") || null;
      if (!metaBox) return;
      const modelMenu = metaBox.querySelector?.(`#${ITEMS_MODAL_MODEL_MENU_ID}`) || null;
      if (!modelMenu || !modelMenu.open) return;
      if (modelMenu.contains(evt.target)) return;
      closeItemsModalModelMenu(metaBox);
    });

    document.addEventListener("sem:model-applied", (evt) => {
      if (!isItemsModalOpen()) return;
      const detail = evt?.detail && typeof evt.detail === "object" ? evt.detail : {};
      const meta = getInvoiceMeta() || {};
      const activeModelName = sanitizeModelSeed(
        meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || ""
      );
      const eventModelName = sanitizeModelSeed(detail.name || "");
      if (eventModelName && activeModelName && eventModelName !== activeModelName) return;
      const resolved = expandModelDocTypes(
        detail.docTypes !== undefined ? detail.docTypes : detail.docType,
        resolveItemsModalModelDocTypes({ allowPanel: true })
      );
      applyItemsModalModelDocTypes(resolved, { enforceDocType: false });
      applyItemsModalOptionalSectionsVisibility({
        modelName: activeModelName || eventModelName,
        config: detail.config && typeof detail.config === "object" ? detail.config : null
      });
      syncDocMetaBoxFromState();
    });

    const revealItemsAndOptions = () => {
      const itemsSection = getEl("itemsSection");
      const docOptions = getEl("DocOptions");
      [itemsSection, docOptions].forEach((el) => {
        if (!el) return;
        el.hidden = false;
        if (typeof el.removeAttribute === "function") el.removeAttribute("hidden");
      });
      const scrollTarget =
        itemsSection && itemsSection.offsetParent !== null ? itemsSection : docOptions || itemsSection;
      scrollTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openItemsPopupWindow = () => {
      const itemsSection = getEl("itemsSection");
      const docOptions = getEl("DocOptions");
      if (!itemsSection && !docOptions) return;

      const popup = window.open("", "itemsDocOptionsPopup", "width=1200,height=800,noopener,noreferrer");
      if (!popup) return;

      try {
        const popupDoc = popup.document;
        popupDoc.open();
        popupDoc.write("<!doctype html><html><head><title>DActails du document</title></head><body></body></html>");
        popupDoc.close();

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
          const clone = node.cloneNode(true);
          popupDoc.head.appendChild(clone);
        });

        const container = popupDoc.createElement("div");
        container.style.display = "grid";
        container.style.gap = "16px";
        container.style.padding = "16px";

        if (itemsSection) {
          const cloneSection = itemsSection.cloneNode(true);
          cloneSection.hidden = false;
          if (typeof cloneSection.removeAttribute === "function") cloneSection.removeAttribute("hidden");
          container.appendChild(cloneSection);
        }

        if (docOptions) {
          const cloneOptions = docOptions.cloneNode(true);
          cloneOptions.hidden = false;
          if (typeof cloneOptions.removeAttribute === "function") cloneOptions.removeAttribute("hidden");
          container.appendChild(cloneOptions);
        }

        popupDoc.body.appendChild(container);
        if (typeof popup.focus === "function") popup.focus();
      } catch (err) {
        console.error("open items popup failed", err);
      }
    };

    const openItemsPopup = (options = {}) => {
      const openedModal = openItemsModal(options);
      if (!openedModal) {
        console.warn("items modal unavailable; skipping new document popup");
      }
    };

    const api = {
      openItemsModal,
      closeItemsModal,
      openItemsPopupWindow,
      openItemsPopup,
      revealItemsAndOptions,
      setItemsModalTitle,
      syncDocMetaBoxFromState
    };
    AppInit.itemsDocOptionsModalApi = api;
    return api;
  };
})(window);


