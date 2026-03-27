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
    let syncItemsModalHeaderLayoutForDocType = null;
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
        bc: "BC",
        be: "BE",
        bs: "BS",
        devis: "Dev",
        bl: "BL",
        avoir: "AV"
      };
      const normalized = String(docType || "facture").toLowerCase();
      if (prefixMap[normalized]) return prefixMap[normalized];
      const letters = normalized.replace(/[^a-z]/gi, "").slice(0, 3);
      return letters ? letters.toUpperCase() : "DOC";
    };
    const PURCHASE_DOC_TYPE_VALUES = new Set(["fa", "bc", "be"]);
    const STOCK_EXCLUSIVE_DOC_TYPE_VALUES = new Set(["be", "bs"]);
    const isPurchaseDocType = (value) =>
      PURCHASE_DOC_TYPE_VALUES.has(String(value || "").trim().toLowerCase());

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
      if (isPurchaseDocType(docTypeValue)) {
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
      if (isPurchaseDocType(docTypeValue)) {
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
      if (isPurchaseDocType(docTypeValue)) {
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
      if (isPurchaseDocType(docTypeValue)) {
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
      if (typeof syncItemsModalHeaderLayoutForDocType === "function") {
        syncItemsModalHeaderLayoutForDocType(docTypeValue);
      }
      syncItemsModalStockMovementBoxesFromState();
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

    const setItemsModalSectionInteractiveState = (section, enabled) => {
      if (!section || typeof section.querySelectorAll !== "function") return;
      const interactive = !!enabled;
      section.setAttribute("aria-disabled", interactive ? "false" : "true");
      section.querySelectorAll("input, select, textarea, button").forEach((field) => {
        if ("disabled" in field) {
          field.disabled = !interactive;
        }
      });
      section.querySelectorAll("[contenteditable]").forEach((node) => {
        node.setAttribute("contenteditable", interactive ? "true" : "false");
        node.setAttribute("aria-disabled", interactive ? "false" : "true");
        if (!interactive) {
          node.setAttribute("tabindex", "-1");
        } else if (node.getAttribute("tabindex") === "-1") {
          node.removeAttribute("tabindex");
        }
      });
    };

    const syncItemsModalDocOptionsNotesForDocType = (docTypeValue) => {
      const docOptionsRoot =
        itemsDocOptionsModalContent?.querySelector?.("#DocOptions") || getEl("DocOptions") || null;
      if (!docOptionsRoot) return false;
      const normalizedDocType = String(docTypeValue || "").trim().toLowerCase();
      const isBonEntree = normalizedDocType === "be";
      const isBonSortie = normalizedDocType === "bs";
      const isStockMovement = isBonEntree || isBonSortie;

      ["#whNoteBox", "#NoteBasDePage"].forEach((selector) => {
        const section = docOptionsRoot.querySelector(selector);
        if (!section) return;
        const visible = !isStockMovement;
        section.hidden = !visible;
        section.setAttribute("aria-hidden", visible ? "false" : "true");
        section.style.display = visible ? "" : "none";
        setItemsModalSectionInteractiveState(section, visible);
      });

      const beRemarksSection =
        docOptionsRoot.querySelector("#beRemarksNoteBox") ||
        docOptionsRoot.querySelector("#beRemarksNoteBoxModal") ||
        null;
      if (beRemarksSection) {
        beRemarksSection.hidden = !isBonEntree;
        beRemarksSection.setAttribute("aria-hidden", isBonEntree ? "false" : "true");
        beRemarksSection.style.display = isBonEntree ? "" : "none";
        setItemsModalSectionInteractiveState(beRemarksSection, isBonEntree);
      }
      const bsRemarksSection =
        docOptionsRoot.querySelector("#bsRemarksNoteBox") ||
        docOptionsRoot.querySelector("#bsRemarksNoteBoxModal") ||
        null;
      if (bsRemarksSection) {
        bsRemarksSection.hidden = !isBonSortie;
        bsRemarksSection.setAttribute("aria-hidden", isBonSortie ? "false" : "true");
        bsRemarksSection.style.display = isBonSortie ? "" : "none";
        setItemsModalSectionInteractiveState(bsRemarksSection, isBonSortie);
      }
      return true;
    };

    const ITEMS_BE_RECEPTION_BOX_ID = "beReceptionBoxNewDoc";
    const ITEMS_BE_RECEPTION_FIELDS = {
      depot: "beReceptionDepotInput",
      destination: "beReceptionDestinationInput",
      date: "beReceptionDateInput",
      time: "beReceptionTimeInput",
      sourceRef: "beReceptionSourceInput"
    };
    const ITEMS_BE_RECEPTION_PICKERS = {
      depotLabel: "beReceptionDepotLabel",
      depotMenu: "beReceptionDepotMenu",
      depotPanel: "beReceptionDepotPanel",
      depotDisplay: "beReceptionDepotDisplay",
      destinationLabel: "beReceptionDestinationLabel",
      destinationMenu: "beReceptionDestinationMenu",
      destinationPanel: "beReceptionDestinationPanel",
      destinationDisplay: "beReceptionDestinationDisplay"
    };
    const ITEMS_BE_RECEPTION_TIME_PANEL_ID = "beReceptionTimePanel";
    const ITEMS_BS_SORTIE_TIME_PANEL_ID = "bsSortieTimePanel";
    const ITEMS_BE_RECEPTION_SOURCE_PICKER_ID = "beReceptionSourcePickerBtn";
    const ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID = "beReceptionSourceReviewBtn";
    const ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID = "beReceptionSourceManager";
    const ITEMS_BE_RECEPTION_SOURCE_MANAGER_COUNT_ID = "beReceptionSourceManagerCount";
    const ITEMS_BE_RECEPTION_SOURCE_MANAGER_LIST_ID = "beReceptionSourceManagerList";
    const ITEMS_BE_RECEPTION_DEPOT_PLACEHOLDER = "Selectionner un depot";
    const ITEMS_BE_RECEPTION_LOCATION_PLACEHOLDER = "Aucun emplacement";
    const ITEMS_BE_RECEPTION_LOCATION_DEPOT_REQUIRED = "Selectionnez d'abord un depot";
    const ITEMS_BS_SORTIE_BOX_ID = "bsSortieBoxNewDoc";
    const ITEMS_BS_TRANSPORT_BOX_ID = "bsTransportBoxNewDoc";
    const ITEMS_BS_TRANSPORT_SAVED_LIST_BTN_ID = "bsTransporteurSavedListBtn";
    const ITEMS_BS_SORTIE_FIELDS = {
      depot: "bsSortieDepotInput",
      location: "bsSortieLocationInput",
      date: "bsSortieDateInput",
      time: "bsSortieTimeInput",
      sourceRef: "bsSortieSourceInput",
      transporter: "bsTransporterInput",
      driverName: "bsDriverNameInput",
      vehiclePlate: "bsVehiclePlateInput",
      transportMode: "bsTransportModeInput",
      exitReason: "bsExitReasonInput"
    };
    const ITEMS_BS_SORTIE_PICKERS = {
      depotLabel: "bsSortieDepotLabel",
      depotMenu: "bsSortieDepotMenu",
      depotPanel: "bsSortieDepotPanel",
      depotDisplay: "bsSortieDepotDisplay",
      locationLabel: "bsSortieLocationLabel",
      locationMenu: "bsSortieLocationMenu",
      locationPanel: "bsSortieLocationPanel",
      locationDisplay: "bsSortieLocationDisplay"
    };
    const ITEMS_BS_SORTIE_SOURCE_PICKER_ID = "bsSortieSourcePickerBtn";
    const ITEMS_BS_SORTIE_SOURCE_REVIEW_ID = "bsSortieSourceReviewBtn";
    const ITEMS_BS_SORTIE_SOURCE_MANAGER_ID = "bsSortieSourceManager";
    const ITEMS_BS_SORTIE_SOURCE_MANAGER_COUNT_ID = "bsSortieSourceManagerCount";
    const ITEMS_BS_SORTIE_SOURCE_MANAGER_LIST_ID = "bsSortieSourceManagerList";
    const ITEMS_BS_SORTIE_DEPOT_PLACEHOLDER = "Selectionner un depot";
    const ITEMS_BS_SORTIE_LOCATION_PLACEHOLDER = "Aucun emplacement";
    const ITEMS_BS_SORTIE_LOCATION_DEPOT_REQUIRED = "Selectionnez d'abord un depot";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_DIALOG_ID = "bsSortieSourceTypeDialog";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_TITLE_ID = "bsSortieSourceTypeDialogTitle";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_MESSAGE_ID = "bsSortieSourceTypeDialogMessage";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_OPTIONS_ID = "bsSortieSourceTypeDialogOptions";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_CLOSE_ID = "bsSortieSourceTypeDialogClose";
    const ITEMS_BS_SORTIE_SOURCE_TYPE_CANCEL_ID = "bsSortieSourceTypeDialogCancel";
    const ITEMS_BS_SORTIE_SOURCE_DOC_TYPE_CHOICES = [
      { docType: "facture", label: "Facture" },
      { docType: "bl", label: "Bon de livraison" }
    ];
    const ITEMS_BS_SORTIE_SOURCE_REF_PLACEHOLDER_DEFAULT =
      "ex : Bon de commande interne / Demande de sortie";
    const ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_LABELS = {
      fa: "Facture d'achat",
      bc: "Bon de commande"
    };
    const ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_CHOICES = [
      { docType: "fa", label: ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_LABELS.fa },
      { docType: "bc", label: ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_LABELS.bc }
    ];
    const normalizeItemsModalBeReceptionSourceDocType = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      const aliases = {
        fa: "fa",
        factureachat: "fa",
        "facture d'achat": "fa",
        "facture_achat": "fa",
        "facture-achat": "fa",
        bc: "bc",
        bondecommande: "bc",
        "bon de commande": "bc",
        "bon_de_commande": "bc",
        "bon-de-commande": "bc"
      };
      return aliases[raw] || "";
    };
    const normalizeItemsModalBsSortieSourceDocType = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      const aliases = {
        facture: "facture",
        fact: "facture",
        "bon de livraison": "bl",
        "bonde livraison": "bl",
        bondelivraison: "bl",
        bonlivraison: "bl",
        bon_livraison: "bl",
        "bon-livraison": "bl",
        bl: "bl"
      };
      return aliases[raw] || "";
    };
    const getItemsModalBsSortieSourceDocTypeLabel = (value) => {
      const normalized = normalizeItemsModalBsSortieSourceDocType(value);
      if (normalized === "facture") return "Facture";
      if (normalized === "bl") return "Bon de livraison";
      return "";
    };
    const normalizeItemsModalBsSortieSourceSelection = (value) => {
      const raw = value && typeof value === "object" ? value : {};
      const rawParty = (() => {
        if (raw.party && typeof raw.party === "object") return raw.party;
        if (raw.client && typeof raw.client === "object") return raw.client;
        if (raw.supplier && typeof raw.supplier === "object") return raw.supplier;
        return {};
      })();
      const rawItems = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.documents)
          ? raw.documents
          : [];
      const normalizedItems = rawItems
        .map((entry, index) => {
          const item = entry && typeof entry === "object" ? entry : {};
          const id = String(item.id || "").trim();
          const path = String(item.path || "").trim();
          const number = String(item.number || "").trim();
          const date = String(item.date || "").trim();
          const clientName = String(item.clientName || "").trim();
          const clientPath = String(item.clientPath || "").trim();
          const displayName = String(item.displayName || item.name || number || "").trim() || `Document ${index + 1}`;
          const docType = normalizeItemsModalBsSortieSourceDocType(
            item.docType || item.type || raw.docType || raw.type || ""
          );
          const key =
            String(item.key || "").trim() ||
            (id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:${index}` : `idx:${index}`);
          if (!id && !path && !number && !displayName) return null;
          return { key, id, path, number, date, displayName, docType, clientName, clientPath };
        })
        .filter(Boolean);
      const docType = normalizeItemsModalBsSortieSourceDocType(
        raw.docType || raw.type || normalizedItems[0]?.docType || ""
      );
      if (!normalizedItems.length || !docType) return null;
      const partyPath = String(rawParty.path || normalizedItems[0]?.clientPath || "").trim();
      const partyName = String(rawParty.name || normalizedItems[0]?.clientName || "").trim();
      const partyLabel = String(rawParty.label || partyName || "").trim();
      const partyIdentifier = String(rawParty.identifier || "").trim();
      return {
        docType,
        party:
          partyPath || partyName || partyLabel || partyIdentifier
            ? {
                path: partyPath,
                name: partyName,
                label: partyLabel || partyName,
                identifier: partyIdentifier
              }
            : null,
        items: normalizedItems.map((item) => ({
          ...item,
          docType: item.docType || docType
        }))
      };
    };
    const formatItemsModalBsSortieSourceSelectionText = (selection) => {
      const normalized = normalizeItemsModalBsSortieSourceSelection(selection);
      if (!normalized) return "";
      const label = getItemsModalBsSortieSourceDocTypeLabel(normalized.docType) || "Document";
      const refs = normalized.items
        .map((item) => String(item.number || item.displayName || "").trim())
        .filter(Boolean);
      if (!refs.length) return label;
      return `${label} : ${refs.join(", ")}`;
    };
    const normalizeItemsModalBeReceptionSourceSelection = (value) => {
      const raw = value && typeof value === "object" ? value : {};
      const rawSupplier = raw.supplier && typeof raw.supplier === "object" ? raw.supplier : {};
      const rawItems = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.documents)
          ? raw.documents
          : [];
      const normalizedItems = rawItems
        .map((entry, index) => {
          const item = entry && typeof entry === "object" ? entry : {};
          const id = String(item.id || "").trim();
          const path = String(item.path || "").trim();
          const number = String(item.number || "").trim();
          const date = String(item.date || "").trim();
          const clientName = String(item.clientName || "").trim();
          const clientPath = String(item.clientPath || "").trim();
          const displayName = String(item.displayName || item.name || number || "").trim() || `Document ${index + 1}`;
          const docType = normalizeItemsModalBeReceptionSourceDocType(
            item.docType || item.type || raw.docType || raw.type || ""
          );
          const key =
            String(item.key || "").trim() ||
            (id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:${index}` : `idx:${index}`);
          if (!id && !path && !number && !displayName) return null;
          return { key, id, path, number, date, displayName, docType, clientName, clientPath };
        })
        .filter(Boolean);
      const docType = normalizeItemsModalBeReceptionSourceDocType(
        raw.docType || raw.type || normalizedItems[0]?.docType || ""
      );
      if (!normalizedItems.length || !docType) return null;
      const supplierPath = String(rawSupplier.path || normalizedItems[0]?.clientPath || "").trim();
      const supplierName = String(rawSupplier.name || normalizedItems[0]?.clientName || "").trim();
      const supplierLabel = String(rawSupplier.label || supplierName || "").trim();
      const supplierIdentifier = String(rawSupplier.identifier || "").trim();
      return {
        docType,
        supplier:
          supplierPath || supplierName || supplierLabel || supplierIdentifier
            ? {
                path: supplierPath,
                name: supplierName,
                label: supplierLabel || supplierName,
                identifier: supplierIdentifier
              }
            : null,
        items: normalizedItems.map((item) => ({
          ...item,
          docType: item.docType || docType
        }))
      };
    };
    const normalizeItemsModalBeReceptionImportedSourceKeys = (value = [], fallbackSelection = null) => {
      const fallbackItems = normalizeItemsModalBeReceptionSourceSelection(fallbackSelection)?.items || [];
      const hasExplicitValue =
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && !String(value).trim());
      const source = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [];
      const seen = new Set();
      return [...source, ...(!hasExplicitValue ? fallbackItems.map((entry) => entry?.key || "") : [])]
        .map((entry) => String(entry || "").trim())
        .filter((entry) => {
          if (!entry) return false;
          const key = entry.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const formatItemsModalBeReceptionSourceSelectionText = (selection) => {
      const normalized = normalizeItemsModalBeReceptionSourceSelection(selection);
      if (!normalized) return "";
      const label = ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_LABELS[normalized.docType] || "Document";
      const refs = normalized.items
        .map((item) => String(item.number || item.displayName || "").trim())
        .filter(Boolean);
      if (!refs.length) return label;
      return `${label} : ${refs.join(", ")}`;
    };
    const formatItemsModalReceptionTime = (value = new Date()) => {
      const date = value instanceof Date ? value : new Date(value);
      const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
      return `${String(safeDate.getHours()).padStart(2, "0")}:${String(safeDate.getMinutes()).padStart(2, "0")}`;
    };
    const parseItemsModalReceptionTime = (value) => {
      const match = String(value || "")
        .trim()
        .match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
      return { hour, minute };
    };
    const formatItemsModalReceptionTimeParts = (hour, minute) =>
      `${String(Math.max(0, Math.min(23, Number(hour) || 0))).padStart(2, "0")}:${String(
        Math.max(0, Math.min(59, Number(minute) || 0))
      ).padStart(2, "0")}`;
    const normalizeItemsModalBeReceptionDepotId = (value = "") =>
      String(value || "")
        .trim()
        .replace(/^sqlite:\/\/depots\//i, "");
    const normalizeItemsModalBeReceptionLocationId = (value = "") =>
      String(value || "")
        .trim()
        .replace(/^sqlite:\/\/emplacements\//i, "");
    const getItemsModalBeReceptionStockUtils = () => SEM?.stockWindow?.utils || {};
    const normalizeItemsModalBeReceptionDestinationIds = (value = []) => {
      const stockUtils = getItemsModalBeReceptionStockUtils();
      if (typeof stockUtils.normalizeLocationSelection === "function") {
        return stockUtils.normalizeLocationSelection(value);
      }
      const source = Array.isArray(value) ? value : [value];
      const seen = new Set();
      return source
        .map((entry) => normalizeItemsModalBeReceptionLocationId(entry))
        .filter((entry) => {
          if (!entry) return false;
          const key = entry.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const normalizeItemsModalBeReceptionDestinationLabels = (value = []) => {
      const source = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [value];
      return source
        .map((entry) => normalizeItemsModalBeReceptionText(entry))
        .filter(Boolean);
    };
    const formatItemsModalBeReceptionDestinationText = (labels = []) =>
      normalizeItemsModalBeReceptionDestinationLabels(labels).join(", ");
    const normalizeItemsModalBsSortieLocationIds = (value = []) =>
      normalizeItemsModalBeReceptionDestinationIds(value);
    const normalizeItemsModalBsSortieLocationLabels = (value = []) =>
      normalizeItemsModalBeReceptionDestinationLabels(value);
    const formatItemsModalBsSortieLocationText = (labels = []) =>
      normalizeItemsModalBsSortieLocationLabels(labels).join(", ");
    const normalizeItemsModalBeReceptionText = (value = "") =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    const normalizeItemsModalBeReceptionDepotRecord = (record = {}, indexHint = -1) => {
      const source = record && typeof record === "object" ? record : {};
      const id = normalizeItemsModalBeReceptionDepotId(
        source.id || source.value || source.depotId || source.path?.replace?.(/^sqlite:\/\/depots\//i, "") || ""
      );
      const fallbackNumber = Number.isFinite(indexHint) && indexHint >= 0 ? indexHint + 1 : null;
      const fallbackName = Number.isFinite(fallbackNumber) ? `Depot ${fallbackNumber}` : "Depot";
      const name = normalizeItemsModalBeReceptionText(source.name || source.label || source.title || fallbackName);
      if (!id) return null;
      return {
        id,
        name: name || fallbackName,
        emplacements: Array.isArray(source.emplacements) ? source.emplacements : []
      };
    };
    const normalizeItemsModalBeReceptionDepotRecords = (records = []) => {
      const source = Array.isArray(records) ? records : [];
      const seen = new Set();
      return source
        .map((entry, index) => normalizeItemsModalBeReceptionDepotRecord(entry, index))
        .filter((entry) => {
          if (!entry?.id) return false;
          const key = entry.id.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const normalizeItemsModalBeReceptionLocationRecord = (entry = {}, depotIdHint = "") => {
      const source = entry && typeof entry === "object" ? entry : { code: entry };
      const id = normalizeItemsModalBeReceptionLocationId(
        source.id ||
          source.value ||
          source.emplacementId ||
          source.emplacement_id ||
          source.path?.replace?.(/^sqlite:\/\/emplacements\//i, "") ||
          ""
      );
      const code = normalizeItemsModalBeReceptionText(source.code || source.name || source.label || source.value || "");
      const depotId = normalizeItemsModalBeReceptionDepotId(source.depotId || source.depot_id || depotIdHint || "");
      if (!id && !code) return null;
      return {
        id: id || code,
        code: code || id,
        depotId
      };
    };
    const normalizeItemsModalBeReceptionLocationRecords = (entries = [], depotIdHint = "") => {
      const source = Array.isArray(entries) ? entries : [];
      const seen = new Set();
      return source
        .map((entry) => normalizeItemsModalBeReceptionLocationRecord(entry, depotIdHint))
        .filter((entry) => {
          if (!entry?.id) return false;
          const key = String(entry.id || "").toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const findItemsModalBeReceptionDepotRecord = (records = [], reception = {}) => {
      const targetId = normalizeItemsModalBeReceptionDepotId(reception?.depotId || "");
      const targetLabel = normalizeItemsModalBeReceptionText(reception?.depot || "").toLowerCase();
      return (
        records.find((entry) => normalizeItemsModalBeReceptionDepotId(entry?.id || "") === targetId) ||
        records.find((entry) => normalizeItemsModalBeReceptionText(entry?.name || "").toLowerCase() === targetLabel) ||
        null
      );
    };
    const findItemsModalBeReceptionLocationRecord = (records = [], reception = {}) => {
      const targetId = normalizeItemsModalBeReceptionLocationId(reception?.destinationId || "");
      const targetLabel = normalizeItemsModalBeReceptionText(reception?.destination || "").toLowerCase();
      return (
        records.find((entry) => normalizeItemsModalBeReceptionLocationId(entry?.id || "") === targetId) ||
        records.find((entry) => normalizeItemsModalBeReceptionText(entry?.code || "").toLowerCase() === targetLabel) ||
        null
      );
    };
    const resolveItemsModalBeReceptionSelectedLocationIds = (records = [], reception = {}) => {
      const byId = new Map(
        (Array.isArray(records) ? records : [])
          .map((entry) => [normalizeItemsModalBeReceptionLocationId(entry?.id || ""), entry])
          .filter(([id]) => !!id)
      );
      const explicitIds = normalizeItemsModalBeReceptionDestinationIds(
        reception?.destinationIds?.length
          ? reception.destinationIds
          : reception?.destinationId
            ? [reception.destinationId]
            : []
      ).filter((id) => byId.has(id));
      if (explicitIds.length) return explicitIds;
      const targetLabels = normalizeItemsModalBeReceptionDestinationLabels(
        reception?.destinationLabels?.length
          ? reception.destinationLabels
          : reception?.destination
            ? reception.destination
            : []
      );
      return normalizeItemsModalBeReceptionDestinationIds(
        targetLabels
          .map((label) =>
            (Array.isArray(records) ? records : []).find(
              (entry) => normalizeItemsModalBeReceptionText(entry?.code || "").toLowerCase() === label.toLowerCase()
            )?.id || ""
          )
          .filter(Boolean)
      );
    };
    const resolveItemsModalBsSortieSelectedLocationIds = (records = [], sortie = {}) => {
      const byId = new Map(
        (Array.isArray(records) ? records : [])
          .map((entry) => [normalizeItemsModalBeReceptionLocationId(entry?.id || ""), entry])
          .filter(([id]) => !!id)
      );
      const explicitIds = normalizeItemsModalBsSortieLocationIds(
        sortie?.locationIds?.length
          ? sortie.locationIds
          : sortie?.locationId
            ? [sortie.locationId]
            : []
      ).filter((id) => byId.has(id));
      if (explicitIds.length) return explicitIds;
      const targetLabels = normalizeItemsModalBsSortieLocationLabels(
        sortie?.locationLabels?.length
          ? sortie.locationLabels
          : sortie?.location
            ? sortie.location
            : []
      );
      return normalizeItemsModalBsSortieLocationIds(
        targetLabels
          .map((label) =>
            (Array.isArray(records) ? records : []).find(
              (entry) => normalizeItemsModalBeReceptionText(entry?.code || "").toLowerCase() === label.toLowerCase()
            )?.id || ""
          )
          .filter(Boolean)
      );
    };
    const getItemsModalBeReceptionPickerRefs = (section) => ({
      depotSelect: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.depot}`) || null,
      depotMenu: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.depotMenu}`) || null,
      depotPanel: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.depotPanel}`) || null,
      depotDisplay: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.depotDisplay}`) || null,
      destinationSelect: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.destination}`) || null,
      destinationMenu: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.destinationMenu}`) || null,
      destinationPanel: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.destinationPanel}`) || null,
      destinationDisplay: section?.querySelector?.(`#${ITEMS_BE_RECEPTION_PICKERS.destinationDisplay}`) || null
    });
    const getItemsModalBsSortiePickerRefs = (section) => ({
      depotSelect: section?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.depot}`) || null,
      depotMenu: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.depotMenu}`) || null,
      depotPanel: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.depotPanel}`) || null,
      depotDisplay: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.depotDisplay}`) || null,
      locationSelect: section?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.location}`) || null,
      locationMenu: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.locationMenu}`) || null,
      locationPanel: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.locationPanel}`) || null,
      locationDisplay: section?.querySelector?.(`#${ITEMS_BS_SORTIE_PICKERS.locationDisplay}`) || null
    });
    const getItemsModalBeReceptionDepotRecords = async ({ refresh = false } = {}) => {
      let records = normalizeItemsModalBeReceptionDepotRecords(
        SEM?.stockWindow?.getDepotRecords?.() || SEM?.depotMagasin?.getRecords?.() || []
      );
      if ((!records.length || refresh) && typeof SEM?.stockWindow?.refreshDepotRecords === "function") {
        try {
          records = normalizeItemsModalBeReceptionDepotRecords(await SEM.stockWindow.refreshDepotRecords());
        } catch {}
      }
      if ((!records.length || refresh) && typeof w.electronAPI?.listDepots === "function") {
        try {
          const response = await w.electronAPI.listDepots();
          if (response?.ok && Array.isArray(response.results)) {
            records = normalizeItemsModalBeReceptionDepotRecords(response.results);
            if (typeof SEM?.stockWindow?.setDepotRecords === "function") {
              SEM.stockWindow.setDepotRecords(records);
            }
          }
        } catch {}
      }
      return records;
    };
    const getItemsModalBeReceptionLocationsForDepot = async (depotId = "") => {
      const targetDepotId = normalizeItemsModalBeReceptionDepotId(depotId);
      if (!targetDepotId) return [];
      let records = normalizeItemsModalBeReceptionDepotRecords(
        SEM?.stockWindow?.getDepotRecords?.() || SEM?.depotMagasin?.getRecords?.() || []
      );
      let depotRecord =
        records.find((entry) => normalizeItemsModalBeReceptionDepotId(entry?.id || "") === targetDepotId) || null;
      let locations = normalizeItemsModalBeReceptionLocationRecords(depotRecord?.emplacements || [], targetDepotId);
      if (locations.length) return locations;
      if (typeof w.electronAPI?.listEmplacementsByDepot === "function") {
        try {
          const response = await w.electronAPI.listEmplacementsByDepot({ depotId: targetDepotId });
          if (response?.ok && Array.isArray(response.results)) {
            locations = normalizeItemsModalBeReceptionLocationRecords(response.results, targetDepotId);
            if (locations.length) {
              const nextRecords = (records.length ? records : [{ id: targetDepotId, name: depotRecord?.name || targetDepotId }]).map((entry) =>
                normalizeItemsModalBeReceptionDepotId(entry?.id || "") === targetDepotId
                  ? { ...entry, emplacements: locations }
                  : entry
              );
              if (typeof SEM?.stockWindow?.setDepotRecords === "function") {
                SEM.stockWindow.setDepotRecords(nextRecords);
              }
            }
          }
        } catch {}
      }
      return locations;
    };
    const getItemsModalDocumentState = () => {
      const st =
        SEM?.state && typeof SEM.state === "object"
          ? SEM.state
          : w.state && typeof w.state === "object"
            ? w.state
            : null;
      if (st && !Array.isArray(st.items)) st.items = [];
      return st;
    };
    const pickItemsModalBeSourceDocumentData = (raw) => {
      let resolved = raw && typeof raw === "object" ? raw : {};
      for (let depth = 0; depth < 3; depth += 1) {
        if (!(resolved && typeof resolved === "object")) break;
        if (resolved.data && typeof resolved.data === "object") {
          resolved = resolved.data;
          continue;
        }
        break;
      }
      return resolved && typeof resolved === "object" ? resolved : {};
    };
    const hasItemsModalBeSourceValue = (value) =>
      value !== undefined && value !== null && String(value).trim() !== "";
    const parseItemsModalBeSourceNumber = (value, fallback = 0) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
      const raw = String(value ?? "").replace(/\u00A0/g, " ").trim();
      if (!raw) return fallback;
      const wrappedNegative = /^\(.*\)$/.test(raw);
      const unsignedRaw = wrappedNegative ? raw.slice(1, -1) : raw;
      const cleaned = unsignedRaw.replace(/[^0-9,.\-+]/g, "");
      if (!cleaned || !/[0-9]/.test(cleaned)) return fallback;
      const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
      const digitsOnly = cleaned.replace(/[+\-]/g, "");
      if (!digitsOnly || !/[0-9]/.test(digitsOnly)) return fallback;
      const commaCount = (digitsOnly.match(/,/g) || []).length;
      const dotCount = (digitsOnly.match(/\./g) || []).length;
      const lastComma = digitsOnly.lastIndexOf(",");
      const lastDot = digitsOnly.lastIndexOf(".");
      let decimalSep = "";
      if (commaCount > 0 && dotCount > 0) decimalSep = lastComma > lastDot ? "," : ".";
      else if (commaCount === 1 && dotCount === 0) decimalSep = ",";
      else if (dotCount === 1 && commaCount === 0) decimalSep = ".";
      let normalized = "";
      if (decimalSep) {
        const sepIndex = digitsOnly.lastIndexOf(decimalSep);
        const intPart = digitsOnly.slice(0, sepIndex).replace(/[.,]/g, "");
        const fracPart = digitsOnly.slice(sepIndex + 1).replace(/[.,]/g, "");
        normalized = fracPart ? `${intPart || "0"}.${fracPart}` : intPart || "0";
      } else {
        normalized = digitsOnly.replace(/[.,]/g, "");
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? sign * parsed : fallback;
    };
    const pickItemsModalBeSourceField = (source, keys = []) => {
      const record = source && typeof source === "object" ? source : {};
      for (const key of keys) {
        if (hasItemsModalBeSourceValue(record?.[key])) return record[key];
      }
      return undefined;
    };
    const normalizeItemsModalBeSourceFodec = (value, fallbackLabel) => {
      const raw = value && typeof value === "object" ? value : {};
      const rate = parseItemsModalBeSourceNumber(raw.rate, 0);
      const tva = parseItemsModalBeSourceNumber(raw.tva, 0);
      return {
        enabled:
          typeof raw.enabled === "boolean"
            ? raw.enabled
            : rate > 0,
        label: String(raw.label || fallbackLabel || "").trim() || fallbackLabel,
        rate,
        tva
      };
    };
    const normalizeItemsModalBeImportedItem = (entry, sourceMeta = {}) => {
      const source = entry && typeof entry === "object" ? entry : {};
      const sourceDocType = normalizeItemsModalBeReceptionSourceDocType(sourceMeta.docType || "");
      const isPurchaseLike = sourceDocType === "fa" || sourceDocType === "bc";
      const refValue = pickItemsModalBeSourceField(source, ["ref", "reference", "code", "sku"]);
      const productValue = pickItemsModalBeSourceField(source, [
        "product",
        "designation",
        "designationName",
        "name",
        "article",
        "itemName"
      ]);
      const descValue = pickItemsModalBeSourceField(source, ["desc", "description", "detail", "details"]);
      const unitValue = pickItemsModalBeSourceField(source, ["unit", "unite", "unitLabel"]);
      const qtyValue = pickItemsModalBeSourceField(source, ["qty", "quantity", "qte", "quantite"]);
      const stockQtyValue = pickItemsModalBeSourceField(source, ["stockQty", "stockQuantity", "stock"]);
      const priceSource = pickItemsModalBeSourceField(source, [
        "price",
        "unitPrice",
        "unit_price",
        "pu",
        "puHt",
        "pu_ht",
        "prixUnitaire",
        "prix_unitaire"
      ]);
      const tvaSource = pickItemsModalBeSourceField(source, [
        "tva",
        "vat",
        "tax",
        "taxRate",
        "tax_rate",
        "tvaRate",
        "tva_rate"
      ]);
      const purchasePriceSource = pickItemsModalBeSourceField(source, [
        "purchasePrice",
        "purchase_price",
        "buyPrice",
        "buy_price",
        "prixAchat",
        "prix_achat",
        "purchaseHt",
        "purchase_ht",
        "puAchat",
        "pu_achat",
        "puAchatHt",
        "pu_achat_ht",
        "puAHt",
        "pu_a_ht"
      ]);
      const purchaseTvaSource = pickItemsModalBeSourceField(source, [
        "purchaseTva",
        "purchase_tva",
        "purchaseVat",
        "purchase_vat",
        "buyTva",
        "buy_tva",
        "tvaAchat",
        "tva_achat",
        "purchaseTax",
        "purchase_tax"
      ]);
      const discountSource = pickItemsModalBeSourceField(source, [
        "discount",
        "discountPct",
        "discount_pct",
        "discountRate",
        "discount_rate",
        "remise"
      ]);
      const purchaseDiscountSource = pickItemsModalBeSourceField(source, [
        "purchaseDiscount",
        "purchase_discount",
        "purchaseDiscountPct",
        "purchase_discount_pct",
        "purchaseDiscountPercent",
        "purchase_discount_percent",
        "purchaseDiscountRate",
        "purchase_discount_rate",
        "purchaseRemise",
        "purchase_remise",
        "remiseAchat",
        "remise_achat"
      ]);
      let price = hasItemsModalBeSourceValue(priceSource)
        ? parseItemsModalBeSourceNumber(priceSource, 0)
        : 0;
      let tva = hasItemsModalBeSourceValue(tvaSource)
        ? parseItemsModalBeSourceNumber(tvaSource, 0)
        : 0;
      let discount = hasItemsModalBeSourceValue(discountSource)
        ? parseItemsModalBeSourceNumber(discountSource, 0)
        : 0;
      let purchasePrice = hasItemsModalBeSourceValue(purchasePriceSource)
        ? parseItemsModalBeSourceNumber(purchasePriceSource, 0)
        : 0;
      let purchaseTva = hasItemsModalBeSourceValue(purchaseTvaSource)
        ? parseItemsModalBeSourceNumber(purchaseTvaSource, 0)
        : 0;
      let purchaseDiscount = hasItemsModalBeSourceValue(purchaseDiscountSource)
        ? parseItemsModalBeSourceNumber(purchaseDiscountSource, 0)
        : 0;
      if (isPurchaseLike) {
        if (!hasItemsModalBeSourceValue(purchasePriceSource) && price !== 0) purchasePrice = price;
        if (!hasItemsModalBeSourceValue(purchaseTvaSource) && tva !== 0) purchaseTva = tva;
        if (!hasItemsModalBeSourceValue(purchaseDiscountSource) && discount !== 0) {
          purchaseDiscount = discount;
        }
        if (!hasItemsModalBeSourceValue(priceSource) && purchasePrice !== 0) price = purchasePrice;
        if (!hasItemsModalBeSourceValue(tvaSource) && purchaseTva !== 0) tva = purchaseTva;
        if (!hasItemsModalBeSourceValue(discountSource) && purchaseDiscount !== 0) {
          discount = purchaseDiscount;
        }
      }
      const normalizedItem = {
        ...source,
        ref: String(refValue ?? source.ref ?? "").trim(),
        product: String(productValue ?? source.product ?? "").trim(),
        desc: String(descValue ?? source.desc ?? "").trim(),
        qty: hasItemsModalBeSourceValue(qtyValue)
          ? parseItemsModalBeSourceNumber(qtyValue, 1)
          : 1,
        stockQty: hasItemsModalBeSourceValue(stockQtyValue)
          ? parseItemsModalBeSourceNumber(stockQtyValue, 0)
          : parseItemsModalBeSourceNumber(source.stockQty, 0),
        unit: String(unitValue ?? source.unit ?? "").trim(),
        price,
        tva,
        discount,
        purchasePrice,
        purchaseTva,
        purchaseDiscount,
        fodec: normalizeItemsModalBeSourceFodec(source.fodec, "FODEC"),
        purchaseFodec: normalizeItemsModalBeSourceFodec(
          source.purchaseFodec ?? source.fodec,
          "FODEC ACHAT"
        ),
        __beSourceImported: true,
        __beSourceDocKey: String(sourceMeta.key || "").trim(),
        __beSourceDocType: sourceDocType,
        __beSourceDocNumber: String(sourceMeta.number || "").trim()
      };
      if (!normalizedItem.ref && !normalizedItem.product && !normalizedItem.desc) return null;
      return normalizedItem;
    };
    const loadItemsModalBeSourceDocumentItems = async (entry = {}) => {
      const normalizedEntry =
        normalizeItemsModalBeReceptionSourceSelection({
          docType: entry?.docType,
          items: [entry]
        })?.items?.[0] || null;
      if (!normalizedEntry) {
        return { ok: false, error: "Document source invalide.", entry: null, items: [] };
      }
      const docType = normalizeItemsModalBeReceptionSourceDocType(normalizedEntry.docType || "");
      if (!docType) {
        return {
          ok: false,
          error: "Type de document source non pris en charge.",
          entry: normalizedEntry,
          items: []
        };
      }
      if (
        typeof w.openInvoiceFromFilePicker !== "function" &&
        typeof w.electronAPI?.openInvoiceJSON !== "function"
      ) {
        return {
          ok: false,
          error: "Chargement du document source indisponible.",
          entry: normalizedEntry,
          items: []
        };
      }
      try {
        const raw =
          typeof w.openInvoiceFromFilePicker === "function"
            ? await w.openInvoiceFromFilePicker({
                path: normalizedEntry.path,
                number: normalizedEntry.number,
                docType
              })
            : await w.electronAPI.openInvoiceJSON({
                path: normalizedEntry.path,
                number: normalizedEntry.number,
                docType
              });
        if (!raw || (raw.ok === false && !(raw.data && typeof raw.data === "object"))) {
          return {
            ok: false,
            error: String(raw?.error || "Chargement du document source impossible."),
            entry: normalizedEntry,
            items: []
          };
        }
        const data = pickItemsModalBeSourceDocumentData(raw);
        const sourceItems = Array.isArray(data.items) ? data.items : [];
        const items = sourceItems
          .map((item) => normalizeItemsModalBeImportedItem(item, normalizedEntry))
          .filter(Boolean);
        return {
          ok: true,
          entry: normalizedEntry,
          items,
          empty: !items.length
        };
      } catch (err) {
        return {
          ok: false,
          error: String(err?.message || err || "Chargement du document source impossible."),
          entry: normalizedEntry,
          items: []
        };
      }
    };
    const appendItemsModalBeImportedItems = (items = []) => {
      const st = getItemsModalDocumentState();
      if (!st) return 0;
      const importedItems = Array.isArray(items) ? items.filter(Boolean) : [];
      importedItems.forEach((item) => {
        const candidate = item && typeof item === "object" ? { ...item } : null;
        if (!candidate) return;
        st.items.push(candidate);
      });
      if (importedItems.length) {
        if (typeof SEM.renderItems === "function") SEM.renderItems();
        else if (typeof SEM.computeTotals === "function") SEM.computeTotals();
      }
      return importedItems.length;
    };
    const removeItemsModalBeImportedItemsBySourceKeys = (sourceKeys = []) => {
      const st = getItemsModalDocumentState();
      if (!st || !Array.isArray(st.items)) return 0;
      const normalizedKeys = normalizeItemsModalBeReceptionImportedSourceKeys(sourceKeys);
      if (!normalizedKeys.length) return 0;
      const keySet = new Set(normalizedKeys.map((entry) => entry.toLowerCase()));
      const currentItems = Array.isArray(st.items) ? st.items : [];
      const nextItems = currentItems.filter((item) => {
        const sourceKey = String(item?.__beSourceDocKey || "").trim().toLowerCase();
        return !sourceKey || !keySet.has(sourceKey);
      });
      const removedCount = currentItems.length - nextItems.length;
      if (removedCount > 0) {
        st.items = nextItems;
        if (typeof SEM.renderItems === "function") SEM.renderItems();
        else if (typeof SEM.computeTotals === "function") SEM.computeTotals();
      }
      return removedCount;
    };
    const pickItemsModalBsSourceDocumentItems = (data = {}) => {
      const payload = data && typeof data === "object" ? data : {};
      const candidates = [
        payload.items,
        payload.lines,
        payload.articleLines,
        payload.articles,
        payload.rows,
        payload.products
      ];
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
      }
      return [];
    };
    const normalizeItemsModalBsImportedItem = (entry, sourceMeta = {}) => {
      const normalized = normalizeItemsModalBeImportedItem(entry, sourceMeta);
      if (!normalized) return null;
      const sourceDocType = normalizeItemsModalBsSortieSourceDocType(sourceMeta?.docType || "");
      const nextItem = {
        ...normalized,
        __bsSourceImported: true,
        __bsSourceDocKey: String(sourceMeta?.key || "").trim(),
        __bsSourceDocType: sourceDocType,
        __bsSourceDocNumber: String(sourceMeta?.number || "").trim()
      };
      delete nextItem.__beSourceImported;
      delete nextItem.__beSourceDocKey;
      delete nextItem.__beSourceDocType;
      delete nextItem.__beSourceDocNumber;
      return nextItem;
    };
    const pickItemsModalBsSourcePartyCandidate = (data = {}) => {
      const payload = data && typeof data === "object" ? data : {};
      const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
      const candidates = [
        payload.client,
        payload.clientSnapshot,
        payload.party,
        payload.destination,
        payload.destinationSnapshot,
        payload.destinataire,
        payload.recipient,
        payload.customer,
        meta.client,
        meta.clientSnapshot,
        meta.party,
        meta.destination,
        meta.destinationSnapshot,
        meta.destinataire
      ];
      for (const candidate of candidates) {
        if (candidate && typeof candidate === "object") return candidate;
      }
      return null;
    };
    const normalizeItemsModalBsSourcePartySnapshot = (value = {}, fallback = {}) => {
      const raw = value && typeof value === "object" ? value : {};
      const fallbackData = fallback && typeof fallback === "object" ? fallback : {};
      const read = (...values) => {
        for (const value of values) {
          if (!hasItemsModalBeSourceValue(value)) continue;
          return String(value).trim();
        }
        return "";
      };
      const normalized = {
        type: read(raw.type, raw.clientType, raw.personType, fallbackData.type, "societe").toLowerCase(),
        name: read(
          raw.name,
          raw.clientName,
          raw.raisonSociale,
          raw.displayName,
          fallbackData.name,
          fallbackData.clientName
        ),
        benefit: read(
          raw.benefit,
          raw.beneficiary,
          raw.beneficiaire,
          raw.clientBeneficiary,
          fallbackData.benefit
        ),
        account: read(raw.account, raw.clientAccount, raw.accountOf, fallbackData.account),
        soldClient: read(raw.soldClient, raw.solde, raw.balance, fallbackData.soldClient),
        vat: read(
          raw.vat,
          raw.matriculeFiscal,
          raw.identifiantFiscal,
          raw.identifiant,
          raw.identifier,
          raw.tva,
          raw.nif,
          fallbackData.vat,
          fallbackData.identifier
        ),
        stegRef: read(raw.stegRef, raw.referenceSteg, raw.refSteg, raw.steg, fallbackData.stegRef),
        phone: read(raw.phone, raw.telephone, raw.tel, raw.mobile, fallbackData.phone),
        email: read(raw.email, raw.mail, fallbackData.email),
        address: read(raw.address, raw.adresse, raw.location, fallbackData.address),
        codeClient: read(
          raw.codeClient,
          raw.code_client,
          raw.clientCode,
          raw.code,
          fallbackData.codeClient,
          fallbackData.code
        ),
        codeFournisseur: "",
        __path: read(
          raw.__path,
          raw.path,
          raw.clientPath,
          fallbackData.__path,
          fallbackData.path,
          fallbackData.clientPath
        ),
        __entityType: "client"
      };
      if (normalized.type !== "particulier") normalized.type = "societe";
      const hasContent =
        normalized.name ||
        normalized.vat ||
        normalized.phone ||
        normalized.email ||
        normalized.address ||
        normalized.codeClient ||
        normalized.__path;
      return hasContent ? normalized : null;
    };
    const loadItemsModalBsSourceDocumentData = async (entry = {}) => {
      const normalizedEntry =
        normalizeItemsModalBsSortieSourceSelection({
          docType: entry?.docType,
          items: [entry]
        })?.items?.[0] || null;
      if (!normalizedEntry) {
        return {
          ok: false,
          error: "Document source invalide.",
          entry: null,
          items: [],
          partySnapshot: null
        };
      }
      const docType = normalizeItemsModalBsSortieSourceDocType(normalizedEntry.docType || "");
      if (!docType) {
        return {
          ok: false,
          error: "Type de document source non pris en charge.",
          entry: normalizedEntry,
          items: [],
          partySnapshot: null
        };
      }
      if (
        typeof w.openInvoiceFromFilePicker !== "function" &&
        typeof w.electronAPI?.openInvoiceJSON !== "function"
      ) {
        return {
          ok: false,
          error: "Chargement du document source indisponible.",
          entry: normalizedEntry,
          items: [],
          partySnapshot: null
        };
      }
      try {
        const raw =
          typeof w.openInvoiceFromFilePicker === "function"
            ? await w.openInvoiceFromFilePicker({
                path: normalizedEntry.path,
                number: normalizedEntry.number,
                docType
              })
            : await w.electronAPI.openInvoiceJSON({
                path: normalizedEntry.path,
                number: normalizedEntry.number,
                docType
              });
        if (!raw || (raw.ok === false && !(raw.data && typeof raw.data === "object"))) {
          return {
            ok: false,
            error: String(raw?.error || "Chargement du document source impossible."),
            entry: normalizedEntry,
            items: [],
            partySnapshot: null
          };
        }
        const data = pickItemsModalBeSourceDocumentData(raw);
        const sourceItems = pickItemsModalBsSourceDocumentItems(data);
        const items = sourceItems
          .map((item) => normalizeItemsModalBsImportedItem(item, normalizedEntry))
          .filter(Boolean);
        const partyCandidate = pickItemsModalBsSourcePartyCandidate(data);
        const partySnapshot = normalizeItemsModalBsSourcePartySnapshot(partyCandidate, {
          clientName: normalizedEntry.clientName,
          clientPath: normalizedEntry.clientPath
        });
        return {
          ok: true,
          entry: normalizedEntry,
          items,
          partySnapshot,
          empty: !items.length
        };
      } catch (err) {
        return {
          ok: false,
          error: String(err?.message || err || "Chargement du document source impossible."),
          entry: normalizedEntry,
          items: [],
          partySnapshot: null
        };
      }
    };
    const removeItemsModalBsImportedItemsBySourceKeys = (sourceKeys = []) => {
      const st = getItemsModalDocumentState();
      if (!st || !Array.isArray(st.items)) return 0;
      const normalizedKeys = normalizeItemsModalBsSortieSourceKeys(sourceKeys);
      if (!normalizedKeys.length) return 0;
      const keySet = new Set(normalizedKeys.map((entry) => entry.toLowerCase()));
      const currentItems = Array.isArray(st.items) ? st.items : [];
      const nextItems = currentItems.filter((item) => {
        const sourceKey = String(item?.__bsSourceDocKey || "").trim().toLowerCase();
        return !sourceKey || !keySet.has(sourceKey);
      });
      const removedCount = currentItems.length - nextItems.length;
      if (removedCount > 0) {
        st.items = nextItems;
        if (typeof SEM.renderItems === "function") SEM.renderItems();
        else if (typeof SEM.computeTotals === "function") SEM.computeTotals();
      }
      return removedCount;
    };
    const getItemsModalBsSortieDestinationScope = () =>
      itemsDocOptionsModalContent?.querySelector?.("#clientBoxNewDoc") || getEl("clientBoxNewDoc") || null;
    const syncItemsModalBsSortieDestinationSearchUi = (scopeNode, label = "") => {
      if (!scopeNode) return;
      const searchInput = scopeNode.querySelector?.("#clientSearch") || null;
      if (searchInput && "value" in searchInput) {
        searchInput.value = String(label || "").trim();
      }
      const searchResults = scopeNode.querySelector?.("#clientSearchResults") || null;
      if (searchResults) {
        searchResults.innerHTML = "";
        searchResults.hidden = true;
        searchResults.classList.remove("client-search--paged");
      }
    };
    const buildItemsModalBsSortieDestinationRecord = (snapshot = null) => {
      const payload = normalizeItemsModalBsSourcePartySnapshot(snapshot || {}) || null;
      if (!payload) return null;
      const resolvedPath = String(payload.__path || "").trim();
      return {
        entityType: "client",
        path: resolvedPath,
        name: String(payload.name || "").trim(),
        client: {
          ...payload,
          __entityType: "client",
          __path: resolvedPath
        }
      };
    };
    const loadItemsModalBsSortieDestinationIntoForm = (section, snapshot = null) => {
      const scopeNode = getItemsModalBsSortieDestinationScope();
      if (!scopeNode) return false;
      const record = buildItemsModalBsSortieDestinationRecord(snapshot);
      if (!record) return false;
      const payload =
        record?.client && typeof record.client === "object" ? record.client : { ...record };
      if (typeof SEM.loadClientRecordIntoForm === "function") {
        SEM.loadClientRecordIntoForm(record, {
          formScope: scopeNode,
          skipReadInputs: true
        });
      } else {
        if (typeof SEM.syncClientFormFields === "function") {
          SEM.syncClientFormFields(payload, scopeNode);
        }
        if (typeof SEM.applyClientToState === "function") {
          SEM.applyClientToState(payload, {
            formScope: scopeNode,
            entityType: "client",
            mirrorToDocumentState: true
          });
        } else {
          const st = SEM.state || (SEM.state = {});
          st.client = {
            ...(st.client || {}),
            ...(payload || {}),
            __entityType: "client",
            __path: String(record?.path || payload?.__path || "").trim()
          };
          SEM.refreshClientSummary?.();
        }
      }
      syncItemsModalBsSortieDestinationSearchUi(scopeNode, payload?.name || record.name || "");
      return true;
    };
    const syncItemsModalBsSortieDestinationFromSourceSelection = (
      section,
      sourcePartySnapshot = null
    ) => {
      const normalizedSnapshot = normalizeItemsModalBsSourcePartySnapshot(sourcePartySnapshot || {});
      if (normalizedSnapshot) {
        return loadItemsModalBsSortieDestinationIntoForm(section, normalizedSnapshot);
      }
      const scopeNode = getItemsModalBsSortieDestinationScope();
      if (!scopeNode) return false;
      resetItemsModalClientState(scopeNode);
      return true;
    };
    const normalizeItemsModalBeReceptionSupplierInfo = (value = {}) => {
      const raw = value && typeof value === "object" ? value : {};
      const path = String(raw.path || raw.clientPath || raw.__path || "").trim();
      const name = String(raw.name || raw.clientName || "").trim();
      const label = String(raw.label || name || "").trim();
      const identifier = String(raw.identifier || raw.vat || raw.identifiantFiscal || "").trim();
      if (!path && !name && !label && !identifier) return null;
      return {
        path,
        name,
        label: label || name,
        identifier
      };
    };
    const resolveItemsModalBeReceptionSupplierFromSelection = (selection) => {
      const normalized = normalizeItemsModalBeReceptionSourceSelection(selection);
      if (!normalized) return null;
      const directSupplier = normalizeItemsModalBeReceptionSupplierInfo(normalized.supplier || null);
      if (directSupplier) return directSupplier;
      const firstItem = Array.isArray(normalized.items) ? normalized.items[0] : null;
      return normalizeItemsModalBeReceptionSupplierInfo({
        path: firstItem?.clientPath || "",
        name: firstItem?.clientName || ""
      });
    };
    const normalizeItemsModalBeReceptionSupplierMatchToken = (value = "") =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const matchesItemsModalBeReceptionSupplierInfo = (supplierInfo, client = {}) => {
      const normalizedSupplier = normalizeItemsModalBeReceptionSupplierInfo(supplierInfo);
      if (!normalizedSupplier) return false;
      const current = client && typeof client === "object" ? client : {};
      const currentPath = String(current.__path || current.path || "").trim();
      if (normalizedSupplier.path && currentPath) {
        return currentPath === normalizedSupplier.path;
      }
      const supplierName = normalizeItemsModalBeReceptionSupplierMatchToken(
        normalizedSupplier.name || normalizedSupplier.label || ""
      );
      const currentName = normalizeItemsModalBeReceptionSupplierMatchToken(current.name || "");
      return !!supplierName && !!currentName && supplierName === currentName;
    };
    const getItemsModalBeReceptionSupplierScope = () =>
      itemsDocOptionsModalContent?.querySelector?.("#FournisseurBoxNewDoc") || getEl("FournisseurBoxNewDoc") || null;
    const syncItemsModalBeReceptionSupplierSearchUi = (scopeNode, label = "") => {
      if (!scopeNode) return;
      const searchInput = scopeNode.querySelector?.("#clientSearch") || null;
      if (searchInput && "value" in searchInput) {
        searchInput.value = String(label || "").trim();
      }
      const searchResults = scopeNode.querySelector?.("#clientSearchResults") || null;
      if (searchResults) {
        searchResults.innerHTML = "";
        searchResults.hidden = true;
        searchResults.classList.remove("client-search--paged");
      }
    };
    const buildItemsModalBeReceptionSupplierRecord = (client, supplierInfo = null) => {
      const payload = client && typeof client === "object" ? client : {};
      const supplier = normalizeItemsModalBeReceptionSupplierInfo(supplierInfo || payload) || null;
      const resolvedPath = String(payload.__path || payload.path || supplier?.path || "").trim();
      return {
        entityType: "vendor",
        path: resolvedPath,
        name: String(payload.name || supplier?.name || supplier?.label || "").trim(),
        client: {
          ...payload,
          __entityType: "vendor",
          __path: resolvedPath
        }
      };
    };
    const resolveItemsModalBeReceptionSupplierRecord = async (supplierInfo) => {
      const supplier = normalizeItemsModalBeReceptionSupplierInfo(supplierInfo);
      if (!supplier) return null;
      if (supplier.path && typeof w.electronAPI?.openClient === "function") {
        try {
          const openRes = await w.electronAPI.openClient({
            path: supplier.path,
            entityType: "vendor"
          });
          if (openRes?.ok && openRes.client && typeof openRes.client === "object") {
            return buildItemsModalBeReceptionSupplierRecord(
              { ...openRes.client, __path: String(openRes.path || supplier.path || "").trim() },
              supplier
            );
          }
        } catch (err) {
          console.warn("be reception supplier open failed", err);
        }
      }
      if (typeof w.electronAPI?.searchClients === "function") {
        const queries = [
          supplier.name,
          supplier.label,
          supplier.identifier
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean);
        for (const query of queries) {
          try {
            const res = await w.electronAPI.searchClients({
              query,
              entityType: "vendor",
              limit: 25,
              offset: 0
            });
            const results = Array.isArray(res?.results) ? res.results : [];
            const exactMatch =
              results.find((entry) => matchesItemsModalBeReceptionSupplierInfo(supplier, entry?.client || entry)) ||
              results[0] ||
              null;
            if (exactMatch) {
              const payload =
                exactMatch.client && typeof exactMatch.client === "object"
                  ? exactMatch.client
                  : exactMatch;
              return buildItemsModalBeReceptionSupplierRecord(
                { ...payload, __path: String(exactMatch.path || payload.__path || "").trim() },
                supplier
              );
            }
          } catch (err) {
            console.warn("be reception supplier search failed", err);
          }
        }
      }
      const fallbackName = String(supplier.name || supplier.label || "").trim();
      if (!fallbackName && !supplier.path) return null;
      return buildItemsModalBeReceptionSupplierRecord(
        {
          type: "societe",
          name: fallbackName,
          vat: supplier.identifier || "",
          phone: "",
          email: "",
          address: "",
          __path: ""
        },
        supplier
      );
    };
    const loadItemsModalBeReceptionSupplierIntoForm = (section, record, supplierInfo = null) => {
      const scopeNode = getItemsModalBeReceptionSupplierScope();
      if (!scopeNode || !record) return false;
      const supplier = normalizeItemsModalBeReceptionSupplierInfo(
        supplierInfo || record?.client || record
      );
      if (typeof SEM.loadClientRecordIntoForm === "function") {
        SEM.loadClientRecordIntoForm(record, {
          formScope: scopeNode,
          skipReadInputs: true
        });
      } else {
        const payload =
          record?.client && typeof record.client === "object" ? record.client : record;
        if (typeof SEM.syncClientFormFields === "function") {
          SEM.syncClientFormFields(payload, scopeNode);
        }
        if (typeof SEM.applyClientToState === "function") {
          SEM.applyClientToState(payload, {
            formScope: scopeNode,
            entityType: "vendor",
            mirrorToDocumentState: true
          });
        } else {
          const st = SEM.state || (SEM.state = {});
          st.client = {
            ...(st.client || {}),
            ...(payload || {}),
            __entityType: "vendor",
            __path: String(record?.path || payload?.__path || "").trim()
          };
          SEM.refreshClientSummary?.();
        }
      }
      syncItemsModalBeReceptionSupplierSearchUi(
        scopeNode,
        supplier?.label || record?.name || record?.client?.name || ""
      );
      return true;
    };
    const syncItemsModalBeReceptionSupplierFromSourceSelection = async (
      section,
      { previousSelection = null, nextSelection = null } = {}
    ) => {
      const scopeNode = getItemsModalBeReceptionSupplierScope();
      if (!scopeNode) return false;
      const nextSupplier = resolveItemsModalBeReceptionSupplierFromSelection(nextSelection);
      const nextSelectionSignature = JSON.stringify(
        normalizeItemsModalBeReceptionSourceSelection(nextSelection) || null
      );
      if (nextSupplier) {
        const record = await resolveItemsModalBeReceptionSupplierRecord(nextSupplier);
        const currentReception = ensureItemsModalBeReceptionMeta(getInvoiceMeta() || {});
        const currentSelectionSignature = JSON.stringify(
          normalizeItemsModalBeReceptionSourceSelection(currentReception.sourceSelection) || null
        );
        if (currentSelectionSignature !== nextSelectionSignature) {
          return false;
        }
        if (record) {
          return loadItemsModalBeReceptionSupplierIntoForm(section, record, nextSupplier);
        }
        return false;
      }
      const previousSupplier = resolveItemsModalBeReceptionSupplierFromSelection(previousSelection);
      if (!previousSupplier) return false;
      const currentClient = SEM?.state?.client && typeof SEM.state.client === "object" ? SEM.state.client : {};
      if (!matchesItemsModalBeReceptionSupplierInfo(previousSupplier, currentClient)) {
        return false;
      }
      resetItemsModalClientState(scopeNode);
      return true;
    };
    const formatItemsModalBeSourceEntryList = (entries = []) =>
      (Array.isArray(entries) ? entries : [])
        .map((entry) =>
          String(entry?.displayName || entry?.number || entry?.name || "Document").trim()
        )
        .filter(Boolean)
        .join(", ");
    const setItemsModalBeReceptionSourceManagerOpen = (section, open) => {
      const panel =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}`) || null;
      const reviewBtn =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID}`) || null;
      const shouldOpen = !!open;
      if (panel instanceof HTMLElement) {
        panel.hidden = !shouldOpen;
        panel.style.display = shouldOpen ? "" : "none";
      }
      if (reviewBtn instanceof HTMLElement) {
        reviewBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      }
    };
    const renderItemsModalBeReceptionSourceSelectionList = (section, selection = null) => {
      const panel =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}`) || null;
      const list =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_LIST_ID}`) || null;
      const count =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_COUNT_ID}`) || null;
      const reviewBtn =
        section?.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID}`) || null;
      if (!(list instanceof HTMLElement)) return;
      const normalizedSelection = normalizeItemsModalBeReceptionSourceSelection(selection);
      const items = Array.isArray(normalizedSelection?.items) ? normalizedSelection.items : [];
      list.innerHTML = "";
      if (count instanceof HTMLElement) {
        count.textContent = `${items.length} document${items.length > 1 ? "s" : ""}`;
      }
      if (reviewBtn instanceof HTMLButtonElement) {
        reviewBtn.disabled = items.length < 1;
        reviewBtn.title =
          items.length > 0
            ? "Voir ou gerer les documents source selectionnes"
            : "Aucun document source selectionne";
      }
      if (!items.length) {
        setItemsModalBeReceptionSourceManagerOpen(section, false);
        return;
      }
      const fragment = document.createDocumentFragment();
      items.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "items-be-reception-form__source-manager-item";
        row.dataset.sourceKey = String(entry?.key || "").trim();
        const meta = document.createElement("div");
        meta.className = "items-be-reception-form__source-manager-meta";
        const type = document.createElement("span");
        type.className = "items-be-reception-form__source-manager-type";
        type.textContent =
          ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_LABELS[
            normalizeItemsModalBeReceptionSourceDocType(entry?.docType || normalizedSelection?.docType || "")
          ] || "Document";
        meta.appendChild(type);
        const text = document.createElement("span");
        text.className = "items-be-reception-form__source-manager-text";
        text.textContent = String(entry?.number || entry?.displayName || "Document").trim();
        meta.appendChild(text);
        row.appendChild(meta);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "items-be-reception-form__source-manager-remove";
        removeBtn.dataset.sourceRemoveKey = String(entry?.key || "").trim();
        removeBtn.setAttribute(
          "aria-label",
          `Retirer ${String(entry?.displayName || entry?.number || "ce document").trim()}`
        );
        removeBtn.textContent = "Retirer";
        row.appendChild(removeBtn);
        fragment.appendChild(row);
      });
      list.appendChild(fragment);
      if (panel instanceof HTMLElement && panel.hidden !== true) {
        panel.style.display = "";
      }
    };
    const setItemsModalBeReceptionSelectOptions = (
      select,
      entries = [],
      {
        placeholder = "",
        selectedValue = "",
        valueKey = "id",
        labelKey = "name",
        dataFactory = null,
        normalizeValue = (value) => String(value || "").trim()
      } = {}
    ) => {
      if (!(select instanceof HTMLSelectElement)) return "";
      const normalizedValue = normalizeValue(selectedValue || "");
      select.replaceChildren();
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = placeholder;
      select.appendChild(placeholderOption);
      let resolvedValue = "";
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        const option = document.createElement("option");
        option.value = String(entry?.[valueKey] || "").trim();
        option.textContent = String(entry?.[labelKey] || "").trim();
        if (typeof dataFactory === "function") {
          const data = dataFactory(entry) || {};
          Object.entries(data).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            option.dataset[key] = String(value);
          });
        }
        if (!resolvedValue && option.value === normalizedValue) {
          resolvedValue = option.value;
        }
        select.appendChild(option);
      });
      select.value = resolvedValue || "";
      return select.value;
    };
    const setItemsModalBeReceptionPickerDisabled = (menu, select, disabled) => {
      if (select instanceof HTMLSelectElement) {
        select.disabled = !!disabled;
        select.setAttribute("aria-disabled", disabled ? "true" : "false");
      }
      if (!(menu instanceof HTMLElement)) return;
      menu.dataset.disabled = disabled ? "true" : "false";
      const summary = menu.querySelector("summary.field-toggle-trigger");
      if (summary instanceof HTMLElement) {
        summary.setAttribute("aria-disabled", disabled ? "true" : "false");
      }
      if (disabled && menu.hasAttribute("open")) {
        menu.removeAttribute("open");
        summary?.setAttribute("aria-expanded", "false");
      }
    };
    const closeItemsModalBeReceptionPickerMenu = (menu) => {
      if (!(menu instanceof HTMLElement)) return;
      menu.removeAttribute("open");
      menu.querySelector("summary.field-toggle-trigger")?.setAttribute("aria-expanded", "false");
    };
    const renderItemsModalBeReceptionTimeField = () =>
      typeof w.BeReceptionTimeField?.render === "function"
        ? w.BeReceptionTimeField.render({
            inputId: ITEMS_BE_RECEPTION_FIELDS.time,
            panelId: ITEMS_BE_RECEPTION_TIME_PANEL_ID
          })
        : "";
    const renderItemsModalBsSortieTimeField = () =>
      typeof w.BeReceptionTimeField?.render === "function"
        ? w.BeReceptionTimeField.render({
            inputId: ITEMS_BS_SORTIE_FIELDS.time,
            panelId: ITEMS_BS_SORTIE_TIME_PANEL_ID,
            toggleAriaLabel: "Choisir une heure de sortie"
          })
        : "";
    const ensureItemsModalBeReceptionMeta = (metaInput = null) => {
      const meta =
        metaInput && typeof metaInput === "object"
          ? metaInput
          : (getInvoiceMeta() || {});
      const raw = meta.beReception && typeof meta.beReception === "object" ? meta.beReception : {};
      const docType = String(meta.docType || "").trim().toLowerCase();
      const normalizedSourceSelection = normalizeItemsModalBeReceptionSourceSelection(
        raw.sourceSelection ?? raw.sourceDocuments ?? raw.sourceDocs ?? meta.beSourceSelection ?? null
      );
      const normalizedDestinationIds = normalizeItemsModalBeReceptionDestinationIds(
        raw.destinationIds ??
          raw.destinationIdList ??
          raw.destinationSelection?.ids ??
          raw.destinationSelection ??
          raw.destinationId ??
          raw.destinationLocationId ??
          raw.locationId ??
          raw.emplacementId ??
          raw.emplacement_id ??
          meta.beReceptionDestinationIds ??
          meta.beReceptionDestinationId ??
          []
      );
      const normalizedDestinationLabels = normalizeItemsModalBeReceptionDestinationLabels(
        raw.destinationLabels ??
          raw.destinationLabelList ??
          raw.destinationSelection?.labels ??
          []
      );
      const normalized = {
        depot: String(raw.depot ?? raw.depotName ?? meta.beReceptionDepot ?? meta.beDepot ?? "").trim(),
        depotId: normalizeItemsModalBeReceptionDepotId(
          raw.depotId ?? raw.depotDbId ?? raw.magasinId ?? raw.magasin_id ?? meta.beReceptionDepotId ?? ""
        ),
        destination: String(
          raw.destination ??
            raw.destinationLocation ??
            raw.location ??
            meta.beReceptionDestination ??
            meta.beDestination ??
            ""
        ).trim(),
        destinationId: normalizeItemsModalBeReceptionLocationId(
          normalizedDestinationIds[0] ??
            raw.destinationId ??
            raw.destinationLocationId ??
            raw.locationId ??
            raw.emplacementId ??
            raw.emplacement_id ??
            meta.beReceptionDestinationId ??
            ""
        ),
        destinationIds: normalizedDestinationIds,
        destinationLabels: normalizedDestinationLabels,
        date: String(raw.date ?? raw.receptionDate ?? meta.beReceptionDate ?? "").trim(),
        time: String(raw.time ?? raw.receptionTime ?? meta.beReceptionTime ?? "").trim(),
        sourceRef: String(
          raw.sourceRef ??
            raw.referenceSource ??
            raw.source ??
            meta.beSourceRef ??
            ""
        ).trim(),
        sourceSelection: normalizedSourceSelection,
        importedSourceKeys: normalizeItemsModalBeReceptionImportedSourceKeys(
          raw.importedSourceKeys ??
            raw.sourceImportedKeys ??
            raw.importedSources ??
            meta.beSourceImportedKeys,
          normalizedSourceSelection
        )
      };
      if (!normalized.sourceRef && normalized.sourceSelection) {
        normalized.sourceRef = formatItemsModalBeReceptionSourceSelectionText(normalized.sourceSelection);
      }
      if (normalized.destinationLabels.length && !normalized.destination) {
        normalized.destination = formatItemsModalBeReceptionDestinationText(normalized.destinationLabels);
      }
      if (normalized.destination && !normalized.destinationLabels.length) {
        normalized.destinationLabels = normalizeItemsModalBeReceptionDestinationLabels(normalized.destination);
      }
      if (docType === "be") {
        if (!normalized.date) {
          normalized.date = String(meta.date || "").trim() || new Date().toISOString().slice(0, 10);
        }
        if (!normalized.time) {
          normalized.time = formatItemsModalReceptionTime();
        }
      }
      meta.beReception = normalized;
      return normalized;
    };
    const ensureItemsModalBsSortieMeta = (metaInput = null) => {
      const meta =
        metaInput && typeof metaInput === "object"
          ? metaInput
          : (getInvoiceMeta() || {});
      const raw = meta.bsSortie && typeof meta.bsSortie === "object" ? meta.bsSortie : {};
      const docType = String(meta.docType || "").trim().toLowerCase();
      const normalizedSourceSelection = normalizeItemsModalBsSortieSourceSelection(
        raw.sourceSelection ?? raw.sourceDocuments ?? raw.sourceDocs ?? meta.bsSourceSelection ?? null
      );
      const normalizedLocationIds = normalizeItemsModalBsSortieLocationIds(
        raw.locationIds ??
          raw.locationIdList ??
          raw.locationSelection?.ids ??
          raw.locationSelection ??
          raw.locationId ??
          raw.destinationId ??
          raw.emplacementId ??
          raw.emplacement_id ??
          meta.bsLocationIds ??
          meta.bsLocationId ??
          []
      );
      const normalizedLocationLabels = normalizeItemsModalBsSortieLocationLabels(
        raw.locationLabels ??
          raw.locationLabelList ??
          raw.locationSelection?.labels ??
          []
      );
      const normalized = {
        depot: String(raw.depot ?? raw.depotName ?? raw.magasin ?? meta.bsDepot ?? "").trim(),
        depotId: normalizeItemsModalBeReceptionDepotId(
          raw.depotId ?? raw.depotDbId ?? raw.magasinId ?? raw.magasin_id ?? meta.bsDepotId ?? ""
        ),
        location: String(raw.location ?? raw.emplacement ?? raw.destination ?? meta.bsLocation ?? "").trim(),
        locationId: normalizeItemsModalBeReceptionLocationId(
          normalizedLocationIds[0] ??
            raw.locationId ??
            raw.destinationId ??
            raw.emplacementId ??
            raw.emplacement_id ??
            meta.bsLocationId ??
            ""
        ),
        locationIds: normalizedLocationIds,
        locationLabels: normalizedLocationLabels,
        sourceDocType: normalizeItemsModalBsSortieSourceDocType(
          raw.sourceDocType ??
            raw.sourceType ??
            normalizedSourceSelection?.docType ??
            meta.bsSourceDocType ??
            ""
        ),
        date: String(raw.date ?? raw.sortieDate ?? raw.movementDate ?? meta.bsSortieDate ?? "").trim(),
        time: String(raw.time ?? raw.sortieTime ?? raw.movementTime ?? meta.bsSortieTime ?? "").trim(),
        sourceRef: String(raw.sourceRef ?? raw.referenceSource ?? raw.source ?? meta.bsSourceRef ?? "").trim(),
        sourceSelection: normalizedSourceSelection,
        transporter: String(raw.transporter ?? raw.transporteur ?? meta.bsTransporter ?? "").trim(),
        driverName: String(raw.driverName ?? raw.chauffeur ?? meta.bsDriverName ?? "").trim(),
        vehiclePlate: String(raw.vehiclePlate ?? raw.vehicle ?? raw.matriculeVehicule ?? meta.bsVehiclePlate ?? "").trim(),
        transportMode: String(raw.transportMode ?? raw.modeTransport ?? meta.bsTransportMode ?? "").trim(),
        exitReason: String(raw.exitReason ?? raw.reason ?? raw.motifSortie ?? meta.bsExitReason ?? "").trim()
      };
      if (!normalized.sourceRef && normalized.sourceSelection) {
        normalized.sourceRef = formatItemsModalBsSortieSourceSelectionText(normalized.sourceSelection);
      }
      if (normalized.locationLabels.length && !normalized.location) {
        normalized.location = formatItemsModalBsSortieLocationText(normalized.locationLabels);
      }
      if (normalized.location && !normalized.locationLabels.length) {
        normalized.locationLabels = normalizeItemsModalBsSortieLocationLabels(normalized.location);
      }
      if (docType === "bs") {
        if (!normalized.date) {
          normalized.date = String(meta.date || "").trim() || new Date().toISOString().slice(0, 10);
        }
        if (!normalized.time) {
          normalized.time = formatItemsModalReceptionTime();
        }
      }
      meta.bsSortie = normalized;
      meta.bsDepot = normalized.depot;
      meta.bsDepotId = normalized.depotId;
      meta.bsLocation = normalized.location;
      meta.bsLocationId = normalized.locationId;
      meta.bsLocationIds = normalized.locationIds;
      meta.bsLocationLabels = normalized.locationLabels;
      meta.bsSourceDocType = normalized.sourceDocType;
      meta.bsSourceSelection = normalized.sourceSelection;
      meta.bsSortieDate = normalized.date;
      meta.bsSortieTime = normalized.time;
      meta.bsSourceRef = normalized.sourceRef;
      meta.bsTransporter = normalized.transporter;
      meta.bsDriverName = normalized.driverName;
      meta.bsVehiclePlate = normalized.vehiclePlate;
      meta.bsTransportMode = normalized.transportMode;
      meta.bsExitReason = normalized.exitReason;
      return normalized;
    };
    const getItemsModalBeReceptionBox = () =>
      itemsDocOptionsModalContent?.querySelector?.(`#${ITEMS_BE_RECEPTION_BOX_ID}`) || null;
    const getItemsModalBsSortieBox = () =>
      itemsDocOptionsModalContent?.querySelector?.(`#${ITEMS_BS_SORTIE_BOX_ID}`) || null;
    const getItemsModalBsTransportBox = () =>
      itemsDocOptionsModalContent?.querySelector?.(`#${ITEMS_BS_TRANSPORT_BOX_ID}`) || null;
    const ensureItemsModalBeReceptionDatePicker = (section) => {
      const dateInput = section?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.date}`);
      if (!dateInput || dateInput.dataset.datePickerBound === "1") return;
      if (w.AppDatePicker?.create) {
        w.AppDatePicker.create(dateInput, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois precedent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: true
        });
      } else {
        dateInput.readOnly = false;
      }
      dateInput.dataset.datePickerBound = "1";
    };
    const ensureItemsModalBsSortieDatePicker = (section) => {
      const dateInput = section?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.date}`);
      if (!dateInput || dateInput.dataset.datePickerBound === "1") return;
      if (w.AppDatePicker?.create) {
        w.AppDatePicker.create(dateInput, {
          labels: {
            today: "Aujourd'hui",
            clear: "Effacer",
            prevMonth: "Mois precedent",
            nextMonth: "Mois suivant",
            dialog: "Choisir une date"
          },
          allowManualInput: true
        });
      } else {
        dateInput.readOnly = false;
      }
      dateInput.dataset.datePickerBound = "1";
    };
    const ensureItemsModalBeReceptionTimePicker = (
      section,
      {
        inputId = ITEMS_BE_RECEPTION_FIELDS.time,
        panelId = ITEMS_BE_RECEPTION_TIME_PANEL_ID,
        titleText = "Heure de reception"
      } = {}
    ) => {
      const input = section?.querySelector?.(`#${inputId}`);
      if (!input || input.__swbTimePickerController) return input?.__swbTimePickerController || null;
      const wrapper =
        input.closest("[data-time-picker]") || input.parentElement?.closest("[data-time-picker]");
      const toggle = wrapper?.querySelector?.("[data-time-picker-toggle]") || null;
      const panel = wrapper?.querySelector?.("[data-time-picker-panel]") || null;
      if (!wrapper || !toggle || !panel) return null;

      input.type = "text";
      input.readOnly = true;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.inputMode = "numeric";
      input.setAttribute("aria-haspopup", "dialog");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("role", "combobox");
      toggle.setAttribute("aria-haspopup", "dialog");
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "false");
      panel.setAttribute("aria-label", "Choisir une heure");
      panel.tabIndex = -1;
      if (!panel.id) {
        panel.id = panelId;
      }
      input.setAttribute("aria-controls", panel.id);
      toggle.setAttribute("aria-controls", panel.id);

      const header = document.createElement("div");
      header.className = "swb-time-picker__header";
      const title = document.createElement("div");
      title.className = "swb-time-picker__title";
      title.textContent = String(titleText || "Heure");
      const currentValue = document.createElement("div");
      currentValue.className = "swb-time-picker__current";
      currentValue.setAttribute("aria-live", "polite");
      header.append(title, currentValue);

      const body = document.createElement("div");
      body.className = "swb-time-picker__body";
      const stepperRow = document.createElement("div");
      stepperRow.className = "swb-time-picker__stepper-row";
      const createStepper = (key, labelText) => {
        const root = document.createElement("section");
        root.className = "swb-time-picker__stepper";
        root.dataset.timePart = key;
        const label = document.createElement("div");
        label.className = "swb-time-picker__stepper-label";
        label.textContent = labelText;
        const controls = document.createElement("div");
        controls.className = "swb-time-picker__stepper-controls";
        const decrementBtn = document.createElement("button");
        decrementBtn.type = "button";
        decrementBtn.className = "swb-time-picker__stepper-control";
        decrementBtn.setAttribute("aria-label", `${labelText} moins`);
        decrementBtn.textContent = "-";
        const value = document.createElement("input");
        value.className = "swb-time-picker__stepper-value";
        value.type = "text";
        value.inputMode = "numeric";
        value.autocomplete = "off";
        value.spellcheck = false;
        value.maxLength = 2;
        value.setAttribute("aria-label", labelText);
        const incrementBtn = document.createElement("button");
        incrementBtn.type = "button";
        incrementBtn.className = "swb-time-picker__stepper-control";
        incrementBtn.setAttribute("aria-label", `${labelText} plus`);
        incrementBtn.textContent = "+";
        controls.append(decrementBtn, value, incrementBtn);
        root.append(label, controls);
        return { root, decrementBtn, incrementBtn, value };
      };
      const hourStepper = createStepper("hour", "Heure");
      const minuteStepper = createStepper("minute", "Minute");
      stepperRow.append(hourStepper.root, minuteStepper.root);

      body.append(stepperRow);

      const footer = document.createElement("div");
      footer.className = "swb-time-picker__footer";
      const nowBtn = document.createElement("button");
      nowBtn.type = "button";
      nowBtn.className = "swb-time-picker__footer-btn";
      nowBtn.textContent = "Maintenant";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "swb-time-picker__footer-btn swb-time-picker__footer-btn--muted";
      clearBtn.textContent = "Effacer";
      footer.append(nowBtn, clearBtn);

      panel.innerHTML = "";
      panel.append(header, body, footer);

      const panelPlaceholder = document.createComment("swb-time-picker__panel-placeholder");
      if (panel.parentNode) {
        try {
          panel.parentNode.insertBefore(panelPlaceholder, panel);
        } catch {}
      }

      let detachRelayout = null;
      let panelPortaled = false;
      let isOpen = false;
      let selectedTime = parseItemsModalReceptionTime(input.value);
      if (!selectedTime && input.value) {
        input.value = "";
      }

      const relayoutFloatingPanel = () => {
        const gap = 6;
        const gutter = 12;
        const wrapperRect = wrapper.getBoundingClientRect();
        const width = Math.min(420, Math.max(wrapperRect.width, 340));
        let left = Math.min(
          Math.max(wrapperRect.left, gutter),
          Math.max(gutter, window.innerWidth - width - gutter)
        );
        let top = wrapperRect.bottom + gap;
        const panelHeight = panel.offsetHeight || 0;
        if (panelHeight) {
          const overflowBottom = top + panelHeight + gutter - window.innerHeight;
          if (overflowBottom > 0) {
            const flippedTop = wrapperRect.top - panelHeight - gap;
            top =
              flippedTop >= gutter
                ? flippedTop
                : Math.max(gutter, window.innerHeight - panelHeight - gutter);
          }
        }
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.width = `${Math.round(width)}px`;
        panel.style.minWidth = `${Math.round(width)}px`;
        panel.style.maxWidth = "420px";
        panel.style.zIndex = "100030";
      };
      const detachPanelListeners = () => {
        if (detachRelayout) {
          detachRelayout();
          detachRelayout = null;
        }
      };
      const restorePanel = () => {
        detachPanelListeners();
        panel.classList.remove("is-floating");
        panel.style.position = "";
        panel.style.left = "";
        panel.style.top = "";
        panel.style.width = "";
        panel.style.minWidth = "";
        panel.style.maxWidth = "";
        panel.style.zIndex = "";
        if (panelPlaceholder.parentNode && panel.parentNode !== panelPlaceholder.parentNode) {
          try {
            panelPlaceholder.parentNode.insertBefore(panel, panelPlaceholder);
          } catch {}
        }
        panelPortaled = false;
      };
      const portalPanelToBody = () => {
        if (panelPortaled) {
          relayoutFloatingPanel();
          return;
        }
        if (panel.parentNode !== document.body) {
          try {
            document.body.appendChild(panel);
          } catch {}
        }
        panel.classList.add("is-floating");
        panel.style.position = "fixed";
        const handleRelayout = () => relayoutFloatingPanel();
        relayoutFloatingPanel();
        window.addEventListener("resize", handleRelayout);
        window.addEventListener("scroll", handleRelayout, true);
        detachRelayout = () => {
          window.removeEventListener("resize", handleRelayout);
          window.removeEventListener("scroll", handleRelayout, true);
        };
        panelPortaled = true;
      };
      const emitInputAndChange = () => {
        try {
          input.dispatchEvent(new Event("input", { bubbles: true }));
        } catch {}
        try {
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      };
      const setSelectedTime = (parts, { silent = false } = {}) => {
        if (!parts) {
          selectedTime = null;
          input.value = "";
        } else {
          selectedTime = {
            hour: Math.max(0, Math.min(23, Number(parts.hour) || 0)),
            minute: Math.max(0, Math.min(59, Number(parts.minute) || 0))
          };
          input.value = formatItemsModalReceptionTimeParts(selectedTime.hour, selectedTime.minute);
        }
        renderTimePanel();
        if (!silent) emitInputAndChange();
      };
      const getWorkingTime = () => {
        const active = selectedTime || parseItemsModalReceptionTime(input.value);
        if (active) return { hour: active.hour, minute: active.minute };
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes() };
      };
      const clampStepperPartValue = (part, rawValue) => {
        const digits = String(rawValue || "")
          .replace(/\D+/g, "")
          .slice(0, 2);
        if (!digits) return { raw: "", numeric: null };
        const max = part === "hour" ? 23 : 59;
        const numeric = Math.max(0, Math.min(max, Number(digits)));
        return { raw: String(numeric), numeric };
      };
      const updateCurrentValueSummary = () => {
        const active = selectedTime || parseItemsModalReceptionTime(input.value);
        currentValue.textContent = active
          ? formatItemsModalReceptionTimeParts(active.hour, active.minute)
          : "Choisir une heure";
      };
      const adjustSelectedTime = (part, delta) => {
        const base = getWorkingTime();
        let nextHour = base.hour;
        let nextMinute = base.minute;
        if (part === "hour") {
          nextHour = (base.hour + delta + 24) % 24;
        } else {
          nextMinute = (base.minute + delta + 60) % 60;
        }
        setSelectedTime({ hour: nextHour, minute: nextMinute });
      };
      const commitStepperValue = (part, rawValue, { emit = true, finalize = false } = {}) => {
        const targetField = part === "hour" ? hourStepper.value : minuteStepper.value;
        const normalized = clampStepperPartValue(part, rawValue);
        if (targetField.value !== normalized.raw) {
          targetField.value = normalized.raw;
        }
        if (normalized.numeric === null) {
          if (finalize) {
            renderTimePanel();
          } else {
            updateCurrentValueSummary();
          }
          return;
        }
        const base = getWorkingTime();
        const next = {
          hour: part === "hour" ? normalized.numeric : base.hour,
          minute: part === "minute" ? normalized.numeric : base.minute
        };
        selectedTime = next;
        input.value = formatItemsModalReceptionTimeParts(next.hour, next.minute);
        if (finalize) {
          renderTimePanel();
        } else {
          updateCurrentValueSummary();
        }
        if (emit) emitInputAndChange();
      };
      const handleStepperKeydown = (part, evt) => {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
        if (evt.key === "ArrowUp") {
          evt.preventDefault();
          adjustSelectedTime(part, part === "hour" ? 1 : 5);
          return;
        }
        if (evt.key === "ArrowDown") {
          evt.preventDefault();
          adjustSelectedTime(part, part === "hour" ? -1 : -5);
          return;
        }
        const allowedKeys = new Set([
          "Backspace",
          "Delete",
          "Tab",
          "Enter",
          "Escape",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End"
        ]);
        if (allowedKeys.has(evt.key)) return;
        if (/^\d$/.test(evt.key)) return;
        evt.preventDefault();
      };
      const renderTimePanel = () => {
        const active = selectedTime || parseItemsModalReceptionTime(input.value);
        const display = active || getWorkingTime();
        updateCurrentValueSummary();
        hourStepper.value.value = String(display.hour).padStart(2, "0");
        minuteStepper.value.value = String(display.minute).padStart(2, "0");
      };
      const closePanel = () => {
        if (!isOpen) return;
        isOpen = false;
        wrapper.classList.remove("is-open");
        restorePanel();
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", outsideClick);
        document.removeEventListener("keydown", handleKeydown, true);
      };
      const openPanel = () => {
        if (isOpen) return;
        isOpen = true;
        wrapper.classList.add("is-open");
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-expanded", "true");
        renderTimePanel();
        portalPanelToBody();
        document.addEventListener("click", outsideClick);
        document.addEventListener("keydown", handleKeydown, true);
        requestAnimationFrame(() => {
          try {
            panel.focus();
          } catch {}
        });
      };
      const outsideClick = (evt) => {
        if (!isOpen) return;
        if (wrapper.contains(evt.target) || panel.contains(evt.target)) return;
        closePanel();
      };
      const handleKeydown = (evt) => {
        if (!isOpen) return;
        if (evt.key === "Escape") {
          evt.preventDefault();
          closePanel();
          try {
            toggle.focus();
          } catch {}
        }
      };

      nowBtn.addEventListener("click", () => {
        const now = new Date();
        setSelectedTime({ hour: now.getHours(), minute: now.getMinutes() });
        closePanel();
      });
      hourStepper.decrementBtn.addEventListener("click", () => adjustSelectedTime("hour", -1));
      hourStepper.incrementBtn.addEventListener("click", () => adjustSelectedTime("hour", 1));
      minuteStepper.decrementBtn.addEventListener("click", () => adjustSelectedTime("minute", -5));
      minuteStepper.incrementBtn.addEventListener("click", () => adjustSelectedTime("minute", 5));
      [
        ["hour", hourStepper.value],
        ["minute", minuteStepper.value]
      ].forEach(([part, field]) => {
        field.addEventListener("keydown", (evt) => handleStepperKeydown(part, evt));
        field.addEventListener("input", () => commitStepperValue(part, field.value, { emit: true, finalize: false }));
        field.addEventListener("blur", () => commitStepperValue(part, field.value, { emit: false, finalize: true }));
        field.addEventListener("focus", () => {
          try {
            field.select();
          } catch {}
        });
      });
      clearBtn.addEventListener("click", () => {
        setSelectedTime(null);
        closePanel();
      });
      toggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (isOpen) closePanel();
        else openPanel();
      });
      input.addEventListener("click", () => {
        openPanel();
      });
      input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" || evt.key === " " || evt.key === "ArrowDown") {
          evt.preventDefault();
          openPanel();
        }
        if (evt.key === "Escape") {
          evt.preventDefault();
          closePanel();
        }
      });

      const controller = {
        setValue(value, { silent = true } = {}) {
          const next = parseItemsModalReceptionTime(value);
          setSelectedTime(next, { silent });
        },
        close: () => {
          closePanel();
        },
        open: () => {
          openPanel();
        }
      };

      input.__swbTimePickerController = controller;
      renderTimePanel();
      return controller;
    };
    const ensureItemsModalBsSortieTimePicker = (section) =>
      ensureItemsModalBeReceptionTimePicker(section, {
        inputId: ITEMS_BS_SORTIE_FIELDS.time,
        panelId: ITEMS_BS_SORTIE_TIME_PANEL_ID,
        titleText: "Heure de sortie"
      });
    const renderItemsModalBeReceptionSelectField = ({
      fieldKey = "depot",
      labelText = "",
      labelId = "",
      menuId = "",
      panelId = "",
      displayId = "",
      placeholder = "",
      useLocationStyle = false,
      multiple = false,
      fieldId = ""
    } = {}) => `
      <label class="items-be-reception-form__field doc-history-modal__filter article-stock-depot-filter${
        useLocationStyle ? " article-stock-location-filter" : ""
      }">
        <span id="${labelId}">${labelText}</span>
        <div class="doc-dialog-model-picker__field">
          <details
            id="${menuId}"
            class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
            data-disabled="false"
          >
            <summary
              class="btn success field-toggle-trigger"
              role="button"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-labelledby="${labelId} ${displayId}"
              aria-disabled="false"
            >
              <span id="${displayId}" class="model-select-display">${placeholder}</span>
              <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
            </summary>
            <div
              class="field-toggle-panel model-select-panel doc-history-model-panel"
              id="${panelId}"
              role="listbox"
              aria-labelledby="${labelId}"
            ></div>
          </details>
          <select
            id="${fieldId || ITEMS_BE_RECEPTION_FIELDS[fieldKey]}"
            class="model-select doc-dialog-model-select"
            aria-hidden="true"
            tabindex="-1"
            aria-disabled="false"${multiple ? " multiple" : ""}
          >
            <option value="">${placeholder}</option>
          </select>
        </div>
      </label>
    `;
    const renderItemsModalBeReceptionBox = () => {
      const template = document.createElement("template");
      template.innerHTML = `
        <fieldset id="${ITEMS_BE_RECEPTION_BOX_ID}" class="section-box items-be-reception-form" hidden>
          <legend>Informations de r&eacute;ception</legend>
          <div class="items-be-reception-form__grid">
            ${renderItemsModalBeReceptionSelectField({
              fieldKey: "depot",
              labelText: "D&eacute;p&ocirc;t / Magasin",
              labelId: ITEMS_BE_RECEPTION_PICKERS.depotLabel,
              menuId: ITEMS_BE_RECEPTION_PICKERS.depotMenu,
              panelId: ITEMS_BE_RECEPTION_PICKERS.depotPanel,
              displayId: ITEMS_BE_RECEPTION_PICKERS.depotDisplay,
              placeholder: ITEMS_BE_RECEPTION_DEPOT_PLACEHOLDER
            })}
            ${renderItemsModalBeReceptionSelectField({
              fieldKey: "destination",
              labelText: "Emplacement de destination",
              labelId: ITEMS_BE_RECEPTION_PICKERS.destinationLabel,
              menuId: ITEMS_BE_RECEPTION_PICKERS.destinationMenu,
              panelId: ITEMS_BE_RECEPTION_PICKERS.destinationPanel,
              displayId: ITEMS_BE_RECEPTION_PICKERS.destinationDisplay,
              placeholder: ITEMS_BE_RECEPTION_LOCATION_PLACEHOLDER,
              useLocationStyle: true,
              multiple: true
            })}
            <label class="items-be-reception-form__field">
              <span>Date de r&eacute;ception</span>
              <div class="swb-date-picker" data-date-picker="">
                <input
                  id="${ITEMS_BE_RECEPTION_FIELDS.date}"
                  type="text"
                  inputmode="numeric"
                  placeholder="AAAA-MM-JJ"
                  autocomplete="off"
                  spellcheck="false"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  role="combobox"
                  aria-controls="beReceptionDatePanel"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle=""
                  aria-label="Choisir une date de r&eacute;ception"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="beReceptionDatePanel"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div
                  class="swb-date-picker__panel"
                  data-date-picker-panel=""
                  role="dialog"
                  aria-modal="false"
                  aria-label="Choisir une date"
                  tabindex="-1"
                  id="beReceptionDatePanel"
                  hidden
                ></div>
              </div>
            </label>
            ${renderItemsModalBeReceptionTimeField()}
            <label class="items-be-reception-form__field items-be-reception-form__field--wide items-be-reception-form__field--source" for="${ITEMS_BE_RECEPTION_FIELDS.sourceRef}">
              <span>R&eacute;f&eacute;rence source</span>
              <div class="items-be-reception-form__input-group items-be-reception-form__input-group--source">
                <input
                  id="${ITEMS_BE_RECEPTION_FIELDS.sourceRef}"
                  type="text"
                  placeholder="ex : BL fournisseur / Bon de commande / Facture d&apos;achat"
                  autocomplete="off"
                />
                <button
                  id="${ITEMS_BE_RECEPTION_SOURCE_PICKER_ID}"
                  type="button"
                  class="client-search__saved items-be-reception-form__picker-btn"
                  aria-label="S&eacute;lectionner un document source"
                  aria-haspopup="dialog"
                  title="S&eacute;lectionner un document source"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <circle cx="5" cy="6" r="1.5"></circle>
                    <circle cx="5" cy="12" r="1.5"></circle>
                    <circle cx="5" cy="18" r="1.5"></circle>
                    <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
                    <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
                    <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
                  </svg>
                </button>
                <button
                  id="${ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID}"
                  type="button"
                  class="client-search__saved items-be-reception-form__picker-btn"
                  aria-label="Voir les documents source selectionnes"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}"
                  title="Voir les documents source selectionnes"
                  disabled
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div
                id="${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}"
                class="items-be-reception-form__source-manager"
                hidden
                aria-live="polite"
                role="dialog"
                aria-modal="false"
                aria-label="Documents source selectionnes"
              >
                <div class="items-be-reception-form__source-manager-header">
                  <strong>Documents source selectionnes</strong>
                  <span id="${ITEMS_BE_RECEPTION_SOURCE_MANAGER_COUNT_ID}" class="items-be-reception-form__source-manager-count">0 document</span>
                </div>
                <div
                  id="${ITEMS_BE_RECEPTION_SOURCE_MANAGER_LIST_ID}"
                  class="items-be-reception-form__source-manager-list"
                ></div>
              </div>
            </label>
          </div>
        </fieldset>
      `.trim();
      return template.content.firstElementChild;
    };
    const renderItemsModalBsSortieBox = () => {
      const template = document.createElement("template");
      template.innerHTML = `
        <fieldset id="${ITEMS_BS_SORTIE_BOX_ID}" class="section-box items-be-reception-form" hidden>
          <legend>Informations de sortie</legend>
          <div class="items-be-reception-form__grid">
            ${renderItemsModalBeReceptionSelectField({
              labelText: "D&eacute;p&ocirc;t / Magasin",
              labelId: ITEMS_BS_SORTIE_PICKERS.depotLabel,
              menuId: ITEMS_BS_SORTIE_PICKERS.depotMenu,
              panelId: ITEMS_BS_SORTIE_PICKERS.depotPanel,
              displayId: ITEMS_BS_SORTIE_PICKERS.depotDisplay,
              placeholder: ITEMS_BS_SORTIE_DEPOT_PLACEHOLDER,
              fieldId: ITEMS_BS_SORTIE_FIELDS.depot
            })}
            ${renderItemsModalBeReceptionSelectField({
              labelText: "Emplacement de sortie",
              labelId: ITEMS_BS_SORTIE_PICKERS.locationLabel,
              menuId: ITEMS_BS_SORTIE_PICKERS.locationMenu,
              panelId: ITEMS_BS_SORTIE_PICKERS.locationPanel,
              displayId: ITEMS_BS_SORTIE_PICKERS.locationDisplay,
              placeholder: ITEMS_BS_SORTIE_LOCATION_PLACEHOLDER,
              useLocationStyle: true,
              multiple: true,
              fieldId: ITEMS_BS_SORTIE_FIELDS.location
            })}
            <label class="items-be-reception-form__field" for="${ITEMS_BS_SORTIE_FIELDS.date}">
              <span>Date de sortie</span>
              <div class="swb-date-picker" data-date-picker="">
                <input
                  id="${ITEMS_BS_SORTIE_FIELDS.date}"
                  type="text"
                  inputmode="numeric"
                  placeholder="AAAA-MM-JJ"
                  autocomplete="off"
                  spellcheck="false"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  role="combobox"
                  aria-controls="bsSortieDatePanel"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle=""
                  aria-label="Choisir une date de sortie"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="bsSortieDatePanel"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div
                  class="swb-date-picker__panel"
                  data-date-picker-panel=""
                  role="dialog"
                  aria-modal="false"
                  aria-label="Choisir une date"
                  tabindex="-1"
                  id="bsSortieDatePanel"
                  hidden
                ></div>
              </div>
            </label>
            ${renderItemsModalBsSortieTimeField()}
            <label class="items-be-reception-form__field items-be-reception-form__field--wide items-be-reception-form__field--source" for="${ITEMS_BS_SORTIE_FIELDS.sourceRef}">
              <span>R&eacute;f&eacute;rence source</span>
              <div class="items-be-reception-form__input-group items-be-reception-form__input-group--source">
                <input
                  id="${ITEMS_BS_SORTIE_FIELDS.sourceRef}"
                  type="text"
                  placeholder="${ITEMS_BS_SORTIE_SOURCE_REF_PLACEHOLDER_DEFAULT}"
                  autocomplete="off"
                />
                <button
                  id="${ITEMS_BS_SORTIE_SOURCE_PICKER_ID}"
                  type="button"
                  class="client-search__saved items-be-reception-form__picker-btn"
                  aria-label="Selectionner le type de document source"
                  aria-haspopup="dialog"
                  title="Selectionner le type de document source"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <circle cx="5" cy="6" r="1.5"></circle>
                    <circle cx="5" cy="12" r="1.5"></circle>
                    <circle cx="5" cy="18" r="1.5"></circle>
                    <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
                    <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
                    <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
                  </svg>
                </button>
                <button
                  id="${ITEMS_BS_SORTIE_SOURCE_REVIEW_ID}"
                  type="button"
                  class="client-search__saved items-be-reception-form__picker-btn"
                  aria-label="Voir les documents source selectionnes"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}"
                  title="Voir les documents source selectionnes"
                  disabled
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div
                id="${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}"
                class="items-be-reception-form__source-manager"
                hidden
                aria-live="polite"
                role="dialog"
                aria-modal="false"
                aria-label="Documents source selectionnes"
              >
                <div class="items-be-reception-form__source-manager-header">
                  <strong>Documents source selectionnes</strong>
                  <span id="${ITEMS_BS_SORTIE_SOURCE_MANAGER_COUNT_ID}" class="items-be-reception-form__source-manager-count">0 document</span>
                </div>
                <div
                  id="${ITEMS_BS_SORTIE_SOURCE_MANAGER_LIST_ID}"
                  class="items-be-reception-form__source-manager-list"
                ></div>
              </div>
            </label>
          </div>
        </fieldset>
      `.trim();
      return template.content.firstElementChild;
    };
    const renderItemsModalBsTransportBox = () => {
      const template = document.createElement("template");
      template.innerHTML = `
        <fieldset id="${ITEMS_BS_TRANSPORT_BOX_ID}" class="section-box items-be-reception-form" hidden>
          <legend>Transport / exp&eacute;dition</legend>
          <div class="items-be-reception-form__section-actions" aria-label="Actions transport">
            <button
              id="${ITEMS_BS_TRANSPORT_SAVED_LIST_BTN_ID}"
              type="button"
              class="client-search__saved items-be-reception-form__picker-btn"
              aria-label="Afficher les transporteurs enregistres"
              data-bs-transport-saved-open="true"
              title="Afficher les transporteurs enregistres"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                <circle cx="5" cy="6" r="1.5"></circle>
                <circle cx="5" cy="12" r="1.5"></circle>
                <circle cx="5" cy="18" r="1.5"></circle>
                <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
                <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
                <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
              </svg>
            </button>
          </div>
          <div class="items-be-reception-form__grid items-be-reception-form__grid--transport">
            <label class="items-be-reception-form__field" for="${ITEMS_BS_SORTIE_FIELDS.transporter}">
              <span>Transporteur</span>
              <input
                id="${ITEMS_BS_SORTIE_FIELDS.transporter}"
                type="text"
                placeholder="Nom du transporteur"
                autocomplete="off"
              />
            </label>
            <label class="items-be-reception-form__field" for="${ITEMS_BS_SORTIE_FIELDS.driverName}">
              <span>Chauffeur</span>
              <input
                id="${ITEMS_BS_SORTIE_FIELDS.driverName}"
                type="text"
                placeholder="Nom du chauffeur"
                autocomplete="off"
              />
            </label>
            <label class="items-be-reception-form__field" for="${ITEMS_BS_SORTIE_FIELDS.vehiclePlate}">
              <span>Matricule v&eacute;hicule</span>
              <input
                id="${ITEMS_BS_SORTIE_FIELDS.vehiclePlate}"
                type="text"
                placeholder="Matricule du vehicule"
                autocomplete="off"
              />
            </label>
            <label class="items-be-reception-form__field" for="${ITEMS_BS_SORTIE_FIELDS.transportMode}">
              <span>Mode de transport</span>
              <input
                id="${ITEMS_BS_SORTIE_FIELDS.transportMode}"
                type="text"
                placeholder="Camion, utilitaire, etc."
                autocomplete="off"
              />
            </label>
            <label class="items-be-reception-form__field items-be-reception-form__field--wide" for="${ITEMS_BS_SORTIE_FIELDS.exitReason}">
              <span>Motif de sortie</span>
              <input
                id="${ITEMS_BS_SORTIE_FIELDS.exitReason}"
                type="text"
                placeholder="Motif / commentaire de sortie"
                autocomplete="off"
              />
            </label>
          </div>
        </fieldset>
      `.trim();
      return template.content.firstElementChild;
    };
    const wireItemsModalBeReceptionPickerMenu = (menu, panel) => {
      if (!(menu instanceof HTMLElement) || !(panel instanceof HTMLElement) || menu.dataset.beReceptionWired === "1") return;
      const summary = menu.querySelector("summary.field-toggle-trigger");
      if (!(summary instanceof HTMLElement)) return;
      menu.dataset.beReceptionWired = "1";
      summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
      summary.addEventListener("click", (event) => {
        if (menu.dataset.disabled !== "true") return;
        event.preventDefault();
        event.stopPropagation();
      });
      menu.addEventListener("toggle", () => {
        const isDisabled = menu.dataset.disabled === "true";
        if (isDisabled && menu.open) {
          closeItemsModalBeReceptionPickerMenu(menu);
          return;
        }
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (!menu.open) return;
        menu
          .closest?.(".items-be-reception-form")
          ?.querySelectorAll?.(".field-toggle-menu[open]")
          ?.forEach?.((otherMenu) => {
            if (otherMenu === menu) return;
            closeItemsModalBeReceptionPickerMenu(otherMenu);
          });
        panel.querySelector(".model-select-option:not([disabled])")?.focus?.();
      });
      panel.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closeItemsModalBeReceptionPickerMenu(menu);
        summary.focus?.();
      });
    };
    const renderItemsModalBeReceptionDepotPanel = (section, records = [], selectedDepotId = "") => {
      const refs = getItemsModalBeReceptionPickerRefs(section);
      const select = refs.depotSelect;
      const panel = refs.depotPanel;
      const menu = refs.depotMenu;
      const display = refs.depotDisplay;
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedDepotId: "", selectedDepotLabel: "" };
      }
      const selectedValue = setItemsModalBeReceptionSelectOptions(select, records, {
        placeholder: ITEMS_BE_RECEPTION_DEPOT_PLACEHOLDER,
        selectedValue: selectedDepotId,
        valueKey: "id",
        labelKey: "name",
        normalizeValue: normalizeItemsModalBeReceptionDepotId
      });
      const selectedOption = Array.from(select.options || []).find((option) => option.value === selectedValue) || null;
      const selectedLabel = normalizeItemsModalBeReceptionText(selectedOption?.textContent || "");
      if (display instanceof HTMLElement) {
        display.textContent = selectedLabel || ITEMS_BE_RECEPTION_DEPOT_PLACEHOLDER;
        display.dataset.selected = selectedValue ? "true" : "false";
      }
      menu.dataset.selected = selectedValue ? "true" : "false";
      setItemsModalBeReceptionPickerDisabled(menu, select, !records.length);
      panel.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun depot enregistre";
        panel.appendChild(empty);
      } else {
        records.forEach((record) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option";
          button.dataset.value = record.id;
          button.setAttribute("role", "option");
          button.textContent = record.name;
          const isActive = record.id === selectedValue;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", () => {
            if (select.disabled) return;
            const changed = select.value !== record.id;
            select.value = record.id;
            closeItemsModalBeReceptionPickerMenu(menu);
            if (changed) {
              try {
                select.dispatchEvent(new Event("change", { bubbles: true }));
              } catch {}
            }
          });
          panel.appendChild(button);
        });
      }
      wireItemsModalBeReceptionPickerMenu(menu, panel);
      return {
        selectedDepotId: selectedValue,
        selectedDepotLabel: selectedLabel
      };
    };
    const renderItemsModalBeReceptionLocationPanel = (
      section,
      locations = [],
      { selectedLocationIds = [], depotSelected = false } = {}
    ) => {
      const refs = getItemsModalBeReceptionPickerRefs(section);
      const select = refs.destinationSelect;
      const panel = refs.destinationPanel;
      const menu = refs.destinationMenu;
      const display = refs.destinationDisplay;
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedLocationIds: [], selectedLocationLabels: [], displayText: "" };
      }
      const stockUtils = getItemsModalBeReceptionStockUtils();
      const normalizeSelectedIds = (value = []) => normalizeItemsModalBeReceptionDestinationIds(value);
      const getSelectedIds =
        typeof stockUtils.getSelectedLocationIds === "function"
          ? stockUtils.getSelectedLocationIds
          : (node) => normalizeSelectedIds(Array.from(node?.selectedOptions || []).map((option) => option.value));
      const setSelectedIds =
        typeof stockUtils.setSelectedLocationIds === "function"
          ? stockUtils.setSelectedLocationIds
          : (node, values = []) => {
              const normalized = normalizeSelectedIds(values);
              const selectedSet = new Set(normalized.map((entry) => entry.toLowerCase()));
              Array.from(node?.options || []).forEach((option) => {
                const optionValue = String(option.value || "").trim();
                option.selected = !!optionValue && selectedSet.has(optionValue.toLowerCase());
              });
              return normalized;
            };
      const resolvedIds =
        typeof stockUtils.setLocationSelectOptions === "function"
          ? stockUtils.setLocationSelectOptions(select, locations, selectedLocationIds)
          : (() => {
              select.replaceChildren();
              (Array.isArray(locations) ? locations : []).forEach((entry) => {
                const option = document.createElement("option");
                option.value = String(entry?.id || "").trim();
                option.textContent = String(entry?.code || "").trim();
                if (entry?.depotId) option.dataset.depotId = String(entry.depotId);
                select.appendChild(option);
              });
              return setSelectedIds(select, selectedLocationIds);
            })();
      const selectedLabels = normalizeItemsModalBeReceptionDestinationLabels(
        resolvedIds
          .map((locationId) => {
            const option = Array.from(select.options || []).find(
              (entry) => String(entry.value || "").trim() === locationId
            );
            return normalizeItemsModalBeReceptionText(option?.textContent || "");
          })
          .filter(Boolean)
      );
      const displayText = depotSelected
        ? (
            (typeof stockUtils.getLocationDisplayLabel === "function"
              ? stockUtils.getLocationDisplayLabel(select, resolvedIds)
              : selectedLabels.length > 1
                ? `${selectedLabels.length} emplacements`
                : selectedLabels[0]) || ITEMS_BE_RECEPTION_LOCATION_PLACEHOLDER
          )
        : ITEMS_BE_RECEPTION_LOCATION_DEPOT_REQUIRED;
      if (display instanceof HTMLElement) {
        display.textContent = displayText;
        display.dataset.selected = resolvedIds.length ? "true" : "false";
      }
      menu.dataset.selected = resolvedIds.length ? "true" : "false";
      setItemsModalBeReceptionPickerDisabled(menu, select, !depotSelected || !locations.length);
      panel.replaceChildren();
      panel.setAttribute("aria-multiselectable", "true");
      if (!depotSelected) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = ITEMS_BE_RECEPTION_LOCATION_DEPOT_REQUIRED;
        panel.appendChild(empty);
      } else if (!locations.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = ITEMS_BE_RECEPTION_LOCATION_PLACEHOLDER;
        panel.appendChild(empty);
      } else {
        Array.from(select.options || []).forEach((option) => {
          if (!option.value) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option model-select-option--multiselect stock-location-option";
          button.dataset.value = option.value;
          button.setAttribute("role", "option");
          const checkbox = document.createElement("span");
          checkbox.className = "stock-location-option__checkbox";
          checkbox.setAttribute("aria-hidden", "true");
          const checkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          checkIcon.classList.add("stock-location-option__check");
          checkIcon.setAttribute("viewBox", "0 0 20 20");
          checkIcon.setAttribute("fill", "none");
          checkIcon.setAttribute("focusable", "false");
          checkIcon.setAttribute("aria-hidden", "true");
          const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          checkPath.setAttribute("d", "M5 10.5L8.5 14L15 7.5");
          checkPath.setAttribute("stroke", "currentColor");
          checkPath.setAttribute("stroke-width", "2");
          checkPath.setAttribute("stroke-linecap", "round");
          checkPath.setAttribute("stroke-linejoin", "round");
          checkIcon.appendChild(checkPath);
          checkbox.appendChild(checkIcon);
          const label = document.createElement("span");
          label.className = "stock-location-option__label";
          label.textContent = normalizeItemsModalBeReceptionText(option.textContent || "");
          button.append(checkbox, label);
          const isDisabled = !!option.disabled || !!select.disabled;
          button.disabled = isDisabled;
          button.classList.toggle("is-disabled", isDisabled);
          button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
          const isActive = resolvedIds.some((entry) => entry === option.value);
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled || select.disabled) return;
            const nextValue = String(option.value || "").trim();
            const currentIds = getSelectedIds(select);
            const hasValue = currentIds.some((entry) => entry === nextValue);
            const nextIds = hasValue
              ? currentIds.filter((entry) => entry !== nextValue)
              : [...currentIds, nextValue];
            const updatedIds = setSelectedIds(select, nextIds);
            renderItemsModalBeReceptionLocationPanel(section, locations, {
              selectedLocationIds: updatedIds,
              depotSelected
            });
            try {
              select.dispatchEvent(new Event("change", { bubbles: true }));
            } catch {}
          });
          panel.appendChild(button);
        });
      }
      wireItemsModalBeReceptionPickerMenu(menu, panel);
      return {
        selectedLocationIds: resolvedIds,
        selectedLocationLabels: selectedLabels,
        displayText
      };
    };
    const syncItemsModalBeReceptionSelectors = async (section = getItemsModalBeReceptionBox()) => {
      if (!section) return false;
      const syncToken = String((Number(section.dataset.beReceptionSyncToken || "0") || 0) + 1);
      section.dataset.beReceptionSyncToken = syncToken;
      const meta = getInvoiceMeta() || {};
      const reception = ensureItemsModalBeReceptionMeta(meta);
      const depotRecords = await getItemsModalBeReceptionDepotRecords();
      if (section.dataset.beReceptionSyncToken !== syncToken) return false;
      const matchedDepot = findItemsModalBeReceptionDepotRecord(depotRecords, reception);
      const depotPanelState = renderItemsModalBeReceptionDepotPanel(
        section,
        depotRecords,
        matchedDepot?.id || reception.depotId || ""
      );
      const selectedDepotId = normalizeItemsModalBeReceptionDepotId(depotPanelState.selectedDepotId || "");
      const selectedDepotLabel = normalizeItemsModalBeReceptionText(
        depotPanelState.selectedDepotLabel || matchedDepot?.name || reception.depot || ""
      );
      let locations = [];
      if (selectedDepotId) {
        locations = await getItemsModalBeReceptionLocationsForDepot(selectedDepotId);
      }
      if (section.dataset.beReceptionSyncToken !== syncToken) return false;
      const resolvedLocationIds = resolveItemsModalBeReceptionSelectedLocationIds(locations, reception);
      const locationPanelState = renderItemsModalBeReceptionLocationPanel(section, locations, {
        selectedLocationIds: resolvedLocationIds,
        depotSelected: !!selectedDepotId
      });
      const selectedLocationIds = normalizeItemsModalBeReceptionDestinationIds(
        locationPanelState.selectedLocationIds || []
      );
      const selectedLocationLabels = normalizeItemsModalBeReceptionDestinationLabels(
        locationPanelState.selectedLocationLabels || []
      );
      let touched = false;
      if (reception.depotId !== selectedDepotId) {
        reception.depotId = selectedDepotId;
        touched = true;
      }
      const nextDepotText = selectedDepotId ? selectedDepotLabel : "";
      if (reception.depot !== nextDepotText) {
        reception.depot = nextDepotText;
        touched = true;
      }
      const nextPrimaryLocationId = selectedLocationIds[0] || "";
      if (reception.destinationId !== nextPrimaryLocationId) {
        reception.destinationId = nextPrimaryLocationId;
        touched = true;
      }
      const currentDestinationIds = normalizeItemsModalBeReceptionDestinationIds(reception.destinationIds || []);
      if (JSON.stringify(currentDestinationIds) !== JSON.stringify(selectedLocationIds)) {
        reception.destinationIds = selectedLocationIds;
        touched = true;
      }
      if (JSON.stringify(normalizeItemsModalBeReceptionDestinationLabels(reception.destinationLabels || [])) !== JSON.stringify(selectedLocationLabels)) {
        reception.destinationLabels = selectedLocationLabels;
        touched = true;
      }
      const nextLocationText = selectedLocationLabels.length
        ? formatItemsModalBeReceptionDestinationText(selectedLocationLabels)
        : "";
      if (reception.destination !== nextLocationText) {
        reception.destination = nextLocationText;
        touched = true;
      }
      meta.beReception = reception;
      if (touched && typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      return true;
    };
    const renderItemsModalBsSortieDepotPanel = (section, records = [], selectedDepotId = "") => {
      const refs = getItemsModalBsSortiePickerRefs(section);
      const select = refs.depotSelect;
      const panel = refs.depotPanel;
      const menu = refs.depotMenu;
      const display = refs.depotDisplay;
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedDepotId: "", selectedDepotLabel: "" };
      }
      const selectedValue = setItemsModalBeReceptionSelectOptions(select, records, {
        placeholder: ITEMS_BS_SORTIE_DEPOT_PLACEHOLDER,
        selectedValue: selectedDepotId,
        valueKey: "id",
        labelKey: "name",
        normalizeValue: normalizeItemsModalBeReceptionDepotId
      });
      const selectedOption = Array.from(select.options || []).find((option) => option.value === selectedValue) || null;
      const selectedLabel = normalizeItemsModalBeReceptionText(selectedOption?.textContent || "");
      if (display instanceof HTMLElement) {
        display.textContent = selectedLabel || ITEMS_BS_SORTIE_DEPOT_PLACEHOLDER;
        display.dataset.selected = selectedValue ? "true" : "false";
      }
      menu.dataset.selected = selectedValue ? "true" : "false";
      setItemsModalBeReceptionPickerDisabled(menu, select, !records.length);
      panel.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun depot enregistre";
        panel.appendChild(empty);
      } else {
        records.forEach((record) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option";
          button.dataset.value = record.id;
          button.setAttribute("role", "option");
          button.textContent = record.name;
          const isActive = record.id === selectedValue;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", () => {
            if (select.disabled) return;
            const changed = select.value !== record.id;
            select.value = record.id;
            closeItemsModalBeReceptionPickerMenu(menu);
            if (changed) {
              try {
                select.dispatchEvent(new Event("change", { bubbles: true }));
              } catch {}
            }
          });
          panel.appendChild(button);
        });
      }
      wireItemsModalBeReceptionPickerMenu(menu, panel);
      return {
        selectedDepotId: selectedValue,
        selectedDepotLabel: selectedLabel
      };
    };
    const renderItemsModalBsSortieLocationPanel = (
      section,
      locations = [],
      { selectedLocationIds = [], depotSelected = false } = {}
    ) => {
      const refs = getItemsModalBsSortiePickerRefs(section);
      const select = refs.locationSelect;
      const panel = refs.locationPanel;
      const menu = refs.locationMenu;
      const display = refs.locationDisplay;
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedLocationIds: [], selectedLocationLabels: [], displayText: "" };
      }
      const stockUtils = getItemsModalBeReceptionStockUtils();
      const normalizeSelectedIds = (value = []) => normalizeItemsModalBsSortieLocationIds(value);
      const getSelectedIds =
        typeof stockUtils.getSelectedLocationIds === "function"
          ? stockUtils.getSelectedLocationIds
          : (node) => normalizeSelectedIds(Array.from(node?.selectedOptions || []).map((option) => option.value));
      const setSelectedIds =
        typeof stockUtils.setSelectedLocationIds === "function"
          ? stockUtils.setSelectedLocationIds
          : (node, values = []) => {
              const normalized = normalizeSelectedIds(values);
              const selectedSet = new Set(normalized.map((entry) => entry.toLowerCase()));
              Array.from(node?.options || []).forEach((option) => {
                const optionValue = String(option.value || "").trim();
                option.selected = !!optionValue && selectedSet.has(optionValue.toLowerCase());
              });
              return normalized;
            };
      const resolvedIds =
        typeof stockUtils.setLocationSelectOptions === "function"
          ? stockUtils.setLocationSelectOptions(select, locations, selectedLocationIds)
          : (() => {
              select.replaceChildren();
              (Array.isArray(locations) ? locations : []).forEach((entry) => {
                const option = document.createElement("option");
                option.value = String(entry?.id || "").trim();
                option.textContent = String(entry?.code || "").trim();
                if (entry?.depotId) option.dataset.depotId = String(entry.depotId);
                select.appendChild(option);
              });
              return setSelectedIds(select, selectedLocationIds);
            })();
      const selectedLabels = normalizeItemsModalBsSortieLocationLabels(
        resolvedIds
          .map((locationId) => {
            const option = Array.from(select.options || []).find(
              (entry) => String(entry.value || "").trim() === locationId
            );
            return normalizeItemsModalBeReceptionText(option?.textContent || "");
          })
          .filter(Boolean)
      );
      const displayText = depotSelected
        ? (
            (typeof stockUtils.getLocationDisplayLabel === "function"
              ? stockUtils.getLocationDisplayLabel(select, resolvedIds)
              : selectedLabels.length > 1
                ? `${selectedLabels.length} emplacements`
                : selectedLabels[0]) || ITEMS_BS_SORTIE_LOCATION_PLACEHOLDER
          )
        : ITEMS_BS_SORTIE_LOCATION_DEPOT_REQUIRED;
      if (display instanceof HTMLElement) {
        display.textContent = displayText;
        display.dataset.selected = resolvedIds.length ? "true" : "false";
      }
      menu.dataset.selected = resolvedIds.length ? "true" : "false";
      setItemsModalBeReceptionPickerDisabled(menu, select, !depotSelected || !locations.length);
      panel.replaceChildren();
      panel.setAttribute("aria-multiselectable", "true");
      if (!depotSelected) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = ITEMS_BS_SORTIE_LOCATION_DEPOT_REQUIRED;
        panel.appendChild(empty);
      } else if (!locations.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = ITEMS_BS_SORTIE_LOCATION_PLACEHOLDER;
        panel.appendChild(empty);
      } else {
        Array.from(select.options || []).forEach((option) => {
          if (!option.value) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option model-select-option--multiselect stock-location-option";
          button.dataset.value = option.value;
          button.setAttribute("role", "option");
          const checkbox = document.createElement("span");
          checkbox.className = "stock-location-option__checkbox";
          checkbox.setAttribute("aria-hidden", "true");
          const checkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          checkIcon.classList.add("stock-location-option__check");
          checkIcon.setAttribute("viewBox", "0 0 20 20");
          checkIcon.setAttribute("fill", "none");
          checkIcon.setAttribute("focusable", "false");
          checkIcon.setAttribute("aria-hidden", "true");
          const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          checkPath.setAttribute("d", "M5 10.5L8.5 14L15 7.5");
          checkPath.setAttribute("stroke", "currentColor");
          checkPath.setAttribute("stroke-width", "2");
          checkPath.setAttribute("stroke-linecap", "round");
          checkPath.setAttribute("stroke-linejoin", "round");
          checkIcon.appendChild(checkPath);
          checkbox.appendChild(checkIcon);
          const label = document.createElement("span");
          label.className = "stock-location-option__label";
          label.textContent = normalizeItemsModalBeReceptionText(option.textContent || "");
          button.append(checkbox, label);
          const isDisabled = !!option.disabled || !!select.disabled;
          button.disabled = isDisabled;
          button.classList.toggle("is-disabled", isDisabled);
          button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
          const isActive = resolvedIds.some((entry) => entry === option.value);
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled || select.disabled) return;
            const nextValue = String(option.value || "").trim();
            const currentIds = getSelectedIds(select);
            const hasValue = currentIds.some((entry) => entry === nextValue);
            const nextIds = hasValue
              ? currentIds.filter((entry) => entry !== nextValue)
              : [...currentIds, nextValue];
            const updatedIds = setSelectedIds(select, nextIds);
            renderItemsModalBsSortieLocationPanel(section, locations, {
              selectedLocationIds: updatedIds,
              depotSelected
            });
            try {
              select.dispatchEvent(new Event("change", { bubbles: true }));
            } catch {}
          });
          panel.appendChild(button);
        });
      }
      wireItemsModalBeReceptionPickerMenu(menu, panel);
      return {
        selectedLocationIds: resolvedIds,
        selectedLocationLabels: selectedLabels,
        displayText
      };
    };
    const syncItemsModalBsSortieSelectors = async (section = getItemsModalBsSortieBox()) => {
      if (!section) return false;
      const syncToken = String((Number(section.dataset.bsSortieSyncToken || "0") || 0) + 1);
      section.dataset.bsSortieSyncToken = syncToken;
      const meta = getInvoiceMeta() || {};
      const sortie = ensureItemsModalBsSortieMeta(meta);
      const depotRecords = await getItemsModalBeReceptionDepotRecords();
      if (section.dataset.bsSortieSyncToken !== syncToken) return false;
      const matchedDepot = findItemsModalBeReceptionDepotRecord(depotRecords, {
        depotId: sortie.depotId,
        depot: sortie.depot
      });
      const depotPanelState = renderItemsModalBsSortieDepotPanel(
        section,
        depotRecords,
        matchedDepot?.id || sortie.depotId || ""
      );
      const selectedDepotId = normalizeItemsModalBeReceptionDepotId(depotPanelState.selectedDepotId || "");
      const selectedDepotLabel = normalizeItemsModalBeReceptionText(
        depotPanelState.selectedDepotLabel || matchedDepot?.name || sortie.depot || ""
      );
      let locations = [];
      if (selectedDepotId) {
        locations = await getItemsModalBeReceptionLocationsForDepot(selectedDepotId);
      }
      if (section.dataset.bsSortieSyncToken !== syncToken) return false;
      const resolvedLocationIds = resolveItemsModalBsSortieSelectedLocationIds(locations, sortie);
      const locationPanelState = renderItemsModalBsSortieLocationPanel(section, locations, {
        selectedLocationIds: resolvedLocationIds,
        depotSelected: !!selectedDepotId
      });
      const selectedLocationIds = normalizeItemsModalBsSortieLocationIds(
        locationPanelState.selectedLocationIds || []
      );
      const selectedLocationLabels = normalizeItemsModalBsSortieLocationLabels(
        locationPanelState.selectedLocationLabels || []
      );
      let touched = false;
      if (sortie.depotId !== selectedDepotId) {
        sortie.depotId = selectedDepotId;
        touched = true;
      }
      const nextDepotText = selectedDepotId ? selectedDepotLabel : "";
      if (sortie.depot !== nextDepotText) {
        sortie.depot = nextDepotText;
        touched = true;
      }
      const nextPrimaryLocationId = selectedLocationIds[0] || "";
      if (sortie.locationId !== nextPrimaryLocationId) {
        sortie.locationId = nextPrimaryLocationId;
        touched = true;
      }
      if (
        JSON.stringify(normalizeItemsModalBsSortieLocationIds(sortie.locationIds || [])) !==
        JSON.stringify(selectedLocationIds)
      ) {
        sortie.locationIds = selectedLocationIds;
        touched = true;
      }
      if (
        JSON.stringify(normalizeItemsModalBsSortieLocationLabels(sortie.locationLabels || [])) !==
        JSON.stringify(selectedLocationLabels)
      ) {
        sortie.locationLabels = selectedLocationLabels;
        touched = true;
      }
      const nextLocationText = selectedLocationLabels.length
        ? formatItemsModalBsSortieLocationText(selectedLocationLabels)
        : "";
      if (sortie.location !== nextLocationText) {
        sortie.location = nextLocationText;
        touched = true;
      }
      meta.bsSortie = sortie;
      meta.bsDepot = sortie.depot;
      meta.bsDepotId = sortie.depotId;
      meta.bsLocation = sortie.location;
      meta.bsLocationId = sortie.locationId;
      meta.bsLocationIds = sortie.locationIds;
      meta.bsLocationLabels = sortie.locationLabels;
      if (touched && typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      return true;
    };
    const applyItemsModalBeReceptionSourceSelection = async (section, selection) => {
      const meta = getInvoiceMeta() || {};
      const reception = ensureItemsModalBeReceptionMeta(meta);
      const previousSelection = normalizeItemsModalBeReceptionSourceSelection(reception.sourceSelection);
      const previousSelectionSignature = JSON.stringify(previousSelection || null);
      const previousImportedSourceKeys = normalizeItemsModalBeReceptionImportedSourceKeys(
        reception.importedSourceKeys || [],
        previousSelection
      );
      const normalizedSelection = normalizeItemsModalBeReceptionSourceSelection(selection);
      reception.sourceSelection = normalizedSelection;
      reception.sourceRef = normalizedSelection
        ? formatItemsModalBeReceptionSourceSelectionText(normalizedSelection)
        : "";
      const importedKeysSet = new Set(previousImportedSourceKeys.map((entry) => entry.toLowerCase()));
      const duplicateEntries = [];
      const entriesToImport = [];
      (normalizedSelection?.items || []).forEach((entry) => {
        const key = String(entry?.key || "").trim();
        if (!key) return;
        if (importedKeysSet.has(key.toLowerCase())) duplicateEntries.push(entry);
        else entriesToImport.push(entry);
      });
      const emptyEntries = [];
      const failedEntries = [];
      const successfullyImportedKeys = [];
      const importedItems = [];
      for (const entry of entriesToImport) {
        const result = await loadItemsModalBeSourceDocumentItems(entry);
        if (!result?.ok) {
          failedEntries.push({
            ...entry,
            error: String(result?.error || "Chargement impossible.")
          });
          continue;
        }
        if (!Array.isArray(result.items) || !result.items.length) {
          emptyEntries.push(entry);
          continue;
        }
        importedItems.push(...result.items);
        successfullyImportedKeys.push(String(entry.key || "").trim());
      }
      reception.importedSourceKeys = normalizeItemsModalBeReceptionImportedSourceKeys([
        ...previousImportedSourceKeys,
        ...successfullyImportedKeys
      ]);
      meta.beReception = reception;
      const sourceInput = section?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.sourceRef}`) || null;
      if (sourceInput && sourceInput.value !== reception.sourceRef) {
        sourceInput.value = reception.sourceRef;
      }
      renderItemsModalBeReceptionSourceSelectionList(section, normalizedSelection);
      if (importedItems.length) {
        appendItemsModalBeImportedItems(importedItems);
      }
      await syncItemsModalBeReceptionSupplierFromSourceSelection(section, {
        previousSelection,
        nextSelection: normalizedSelection
      });
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      const selectionChanged =
        previousSelectionSignature !== JSON.stringify(normalizedSelection || null);
      if ((selectionChanged || importedItems.length) && typeof SEM.markDocumentDirty === "function") {
        SEM.markDocumentDirty(true);
      }
      const notices = [];
      if (duplicateEntries.length) {
        notices.push(
          `Les articles des documents deja importes n'ont pas ete ajoutes de nouveau : ${formatItemsModalBeSourceEntryList(
            duplicateEntries
          )}.`
        );
      }
      if (emptyEntries.length) {
        notices.push(
          `Aucun article n'a ete trouve dans : ${formatItemsModalBeSourceEntryList(emptyEntries)}.`
        );
      }
      if (failedEntries.length) {
        notices.push(
          `Impossible de charger : ${failedEntries
            .map((entry) => `${String(entry.displayName || entry.number || "Document").trim()} (${entry.error})`)
            .join(", ")}.`
        );
      }
      if (notices.length) {
        await w.showDialog?.(notices.join("\n\n"), { title: "Import des articles" });
      }
    };
    const removeItemsModalBeReceptionSourceEntries = (section, sourceKeys = []) => {
      const meta = getInvoiceMeta() || {};
      const reception = ensureItemsModalBeReceptionMeta(meta);
      const normalizedKeys = normalizeItemsModalBeReceptionImportedSourceKeys(sourceKeys);
      if (!normalizedKeys.length) return false;
      const keySet = new Set(normalizedKeys.map((entry) => entry.toLowerCase()));
      const previousSelection = normalizeItemsModalBeReceptionSourceSelection(reception.sourceSelection);
      const nextSelectionItems = (previousSelection?.items || []).filter(
        (entry) => !keySet.has(String(entry?.key || "").trim().toLowerCase())
      );
      const nextSelection =
        nextSelectionItems.length && previousSelection?.docType
          ? {
              docType: previousSelection.docType,
              items: nextSelectionItems
            }
          : null;
      const removedRowCount = removeItemsModalBeImportedItemsBySourceKeys(normalizedKeys);
      reception.sourceSelection = nextSelection;
      reception.sourceRef = nextSelection
        ? formatItemsModalBeReceptionSourceSelectionText(nextSelection)
        : "";
      reception.importedSourceKeys = normalizeItemsModalBeReceptionImportedSourceKeys(
        (reception.importedSourceKeys || []).filter(
          (entry) => !keySet.has(String(entry || "").trim().toLowerCase())
        ),
        null
      );
      meta.beReception = reception;
      const sourceInput = section?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.sourceRef}`) || null;
      if (sourceInput && sourceInput.value !== reception.sourceRef) {
        sourceInput.value = reception.sourceRef;
      }
      renderItemsModalBeReceptionSourceSelectionList(section, nextSelection);
      void syncItemsModalBeReceptionSupplierFromSourceSelection(section, {
        previousSelection,
        nextSelection
      });
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      if ((removedRowCount > 0 || previousSelection) && typeof SEM.markDocumentDirty === "function") {
        SEM.markDocumentDirty(true);
      }
      return true;
    };
    const openItemsModalBeReceptionSourcePicker = async (trigger, section) => {
      const pickerApi = w.AppInit?.BonEntreeSourceDocumentPicker?.open;
      if (typeof pickerApi !== "function") {
        await w.showDialog?.("Selection de document indisponible.", { title: "Erreur" });
        return;
      }
      const meta = getInvoiceMeta() || {};
      const reception = ensureItemsModalBeReceptionMeta(meta);
      const fallbackDocType =
        normalizeItemsModalBeReceptionSourceDocType(reception?.sourceSelection?.docType) || "fa";
      const res = await pickerApi(trigger, {
        choices: ITEMS_BE_RECEPTION_SOURCE_DOC_TYPE_CHOICES,
        fallbackDocType,
        initialSelection: reception?.sourceSelection || null,
        sourceChooserTitle: "Selectionner un document",
        sourceChooserMessage:
          "Choisissez le type de document source pour la reference de reception :",
        searchPlaceholder: "Rechercher par numero"
      });
      if (!res?.ok || !Array.isArray(res.items) || !res.items.length) return;
      await applyItemsModalBeReceptionSourceSelection(section, {
        docType: res.docType,
        items: res.items
      });
    };
    let itemsModalBsSortieSourceTypeDialogController = null;
    const buildItemsModalBsSortieSourceTypeDialogMarkup = () => `
      <div id="${ITEMS_BS_SORTIE_SOURCE_TYPE_DIALOG_ID}" class="swbDialog be-reception-source-type-dialog" hidden aria-hidden="true">
        <div
          class="swbDialog__panel be-reception-source-type-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="${ITEMS_BS_SORTIE_SOURCE_TYPE_TITLE_ID}"
          aria-describedby="${ITEMS_BS_SORTIE_SOURCE_TYPE_MESSAGE_ID}"
        >
          <div class="swbDialog__header">
            <div id="${ITEMS_BS_SORTIE_SOURCE_TYPE_TITLE_ID}" class="swbDialog__title">Selectionner un document</div>
            <button id="${ITEMS_BS_SORTIE_SOURCE_TYPE_CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="swbDialog__msg be-reception-source-type-dialog__body">
            <p id="${ITEMS_BS_SORTIE_SOURCE_TYPE_MESSAGE_ID}" class="be-reception-source-type-dialog__message">
              Choisissez le type de document source :
            </p>
            <div
              id="${ITEMS_BS_SORTIE_SOURCE_TYPE_OPTIONS_ID}"
              class="swbDialog__options be-reception-source-type-dialog__options"
              role="group"
              aria-labelledby="${ITEMS_BS_SORTIE_SOURCE_TYPE_TITLE_ID}"
            ></div>
          </div>
          <div class="swbDialog__actions">
            <div class="swbDialog__group swbDialog__group--left">
              <button id="${ITEMS_BS_SORTIE_SOURCE_TYPE_CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const ensureItemsModalBsSortieSourceTypeDialog = () => {
      let modal = getEl(ITEMS_BS_SORTIE_SOURCE_TYPE_DIALOG_ID);
      if (modal) return modal;
      const template = document.createElement("template");
      template.innerHTML = buildItemsModalBsSortieSourceTypeDialogMarkup().trim();
      modal = template.content.firstElementChild;
      document.body.appendChild(modal);
      return modal;
    };
    const createItemsModalBsSortieSourceTypeDialogController = () => {
      if (itemsModalBsSortieSourceTypeDialogController) return itemsModalBsSortieSourceTypeDialogController;
      const modal = ensureItemsModalBsSortieSourceTypeDialog();
      if (!modal) return null;
      const titleEl = modal.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_TYPE_TITLE_ID}`);
      const messageEl = modal.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_TYPE_MESSAGE_ID}`);
      const optionsEl = modal.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_TYPE_OPTIONS_ID}`);
      const closeBtn = modal.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_TYPE_CLOSE_ID}`);
      const cancelBtn = modal.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_TYPE_CANCEL_ID}`);
      let resolveSelection = null;
      let restoreFocusTarget = null;

      const closeDialog = (value = "") => {
        if (typeof resolveSelection !== "function") return;
        const resolve = resolveSelection;
        resolveSelection = null;
        modal.classList.remove("is-open");
        modal.hidden = true;
        modal.setAttribute("hidden", "");
        modal.setAttribute("aria-hidden", "true");
        optionsEl?.replaceChildren();
        if (restoreFocusTarget && typeof restoreFocusTarget.focus === "function") {
          try {
            restoreFocusTarget.focus();
          } catch {}
        }
        restoreFocusTarget = null;
        resolve(value);
      };

      const renderChoices = (choices = [], fallbackDocType = "") => {
        if (!(optionsEl instanceof HTMLElement)) return;
        optionsEl.replaceChildren();
        const sourceChoices = Array.isArray(choices) && choices.length
          ? choices
          : ITEMS_BS_SORTIE_SOURCE_DOC_TYPE_CHOICES;
        const preferredDocType =
          normalizeItemsModalBsSortieSourceDocType(fallbackDocType) ||
          normalizeItemsModalBsSortieSourceDocType(sourceChoices[0]?.docType) ||
          "facture";
        let preferredButton = null;
        sourceChoices.forEach((entry) => {
          const docType = normalizeItemsModalBsSortieSourceDocType(entry?.docType || entry?.value || entry);
          if (!docType) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn better-style-v2";
          button.dataset.docType = docType;
          button.textContent =
            String(entry?.label || getItemsModalBsSortieSourceDocTypeLabel(docType) || "Document").trim() ||
            "Document";
          if (docType === preferredDocType && !preferredButton) preferredButton = button;
          button.addEventListener("click", () => closeDialog(docType));
          optionsEl.appendChild(button);
        });
        const focusTarget = preferredButton || optionsEl.querySelector("button");
        if (focusTarget && typeof focusTarget.focus === "function") {
          setTimeout(() => {
            try {
              focusTarget.focus({ preventScroll: true });
            } catch {
              focusTarget.focus();
            }
          }, 0);
        }
      };

      closeBtn?.addEventListener("click", () => closeDialog(""));
      cancelBtn?.addEventListener("click", () => closeDialog(""));
      modal.addEventListener("click", (event) => {
        if (event.target === modal) event.stopPropagation();
      });
      document.addEventListener("keydown", (event) => {
        if (modal.hidden || modal.getAttribute("aria-hidden") === "true") return;
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        closeDialog("");
      });

      itemsModalBsSortieSourceTypeDialogController = {
        open: ({
          choices = ITEMS_BS_SORTIE_SOURCE_DOC_TYPE_CHOICES,
          fallbackDocType = "facture",
          title = "Selectionner un document",
          message = "Choisissez le type de document source :",
          trigger = null
        } = {}) =>
          new Promise((resolve) => {
            if (typeof resolveSelection === "function") {
              const previousResolve = resolveSelection;
              resolveSelection = null;
              previousResolve("");
            }
            resolveSelection = resolve;
            restoreFocusTarget = trigger || document.activeElement;
            if (titleEl) {
              titleEl.textContent = String(title || "Selectionner un document").trim() || "Selectionner un document";
            }
            if (messageEl) {
              messageEl.textContent =
                String(message || "Choisissez le type de document source :").trim() ||
                "Choisissez le type de document source :";
            }
            renderChoices(choices, fallbackDocType);
            modal.hidden = false;
            modal.removeAttribute("hidden");
            modal.setAttribute("aria-hidden", "false");
            modal.classList.add("is-open");
          })
      };
      return itemsModalBsSortieSourceTypeDialogController;
    };
    const getItemsModalBsSortieSourceRefPlaceholder = (sourceDocType = "") => {
      const normalized = normalizeItemsModalBsSortieSourceDocType(sourceDocType);
      if (normalized === "facture") return "ex : Reference facture";
      if (normalized === "bl") return "ex : Reference bon de livraison";
      return ITEMS_BS_SORTIE_SOURCE_REF_PLACEHOLDER_DEFAULT;
    };
    const setItemsModalBsSortieSourceManagerOpen = (section, open) => {
      const panel =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}`) || null;
      const reviewBtn =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_REVIEW_ID}`) || null;
      const shouldOpen = !!open;
      if (panel instanceof HTMLElement) {
        panel.hidden = !shouldOpen;
        panel.style.display = shouldOpen ? "" : "none";
      }
      if (reviewBtn instanceof HTMLElement) {
        reviewBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      }
    };
    const renderItemsModalBsSortieSourceSelectionList = (section, selection = null) => {
      const panel =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}`) || null;
      const list =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_LIST_ID}`) || null;
      const count =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_COUNT_ID}`) || null;
      const reviewBtn =
        section?.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_REVIEW_ID}`) || null;
      if (!(list instanceof HTMLElement)) return;
      const normalizedSelection = normalizeItemsModalBsSortieSourceSelection(selection);
      const items = Array.isArray(normalizedSelection?.items) ? normalizedSelection.items : [];
      list.innerHTML = "";
      if (count instanceof HTMLElement) {
        count.textContent = `${items.length} document${items.length > 1 ? "s" : ""}`;
      }
      if (reviewBtn instanceof HTMLButtonElement) {
        reviewBtn.disabled = items.length < 1;
        reviewBtn.title =
          items.length > 0
            ? "Voir ou gerer les documents source selectionnes"
            : "Aucun document source selectionne";
      }
      if (!items.length) {
        setItemsModalBsSortieSourceManagerOpen(section, false);
        return;
      }
      const fragment = document.createDocumentFragment();
      items.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "items-be-reception-form__source-manager-item";
        row.dataset.sourceKey = String(entry?.key || "").trim();
        const meta = document.createElement("div");
        meta.className = "items-be-reception-form__source-manager-meta";
        const type = document.createElement("span");
        type.className = "items-be-reception-form__source-manager-type";
        type.textContent =
          getItemsModalBsSortieSourceDocTypeLabel(
            normalizeItemsModalBsSortieSourceDocType(entry?.docType || normalizedSelection?.docType || "")
          ) || "Document";
        meta.appendChild(type);
        const text = document.createElement("span");
        text.className = "items-be-reception-form__source-manager-text";
        text.textContent = String(entry?.number || entry?.displayName || "Document").trim();
        meta.appendChild(text);
        row.appendChild(meta);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "items-be-reception-form__source-manager-remove";
        removeBtn.dataset.sourceRemoveKey = String(entry?.key || "").trim();
        removeBtn.setAttribute(
          "aria-label",
          `Retirer ${String(entry?.displayName || entry?.number || "ce document").trim()}`
        );
        removeBtn.textContent = "Retirer";
        row.appendChild(removeBtn);
        fragment.appendChild(row);
      });
      list.appendChild(fragment);
      if (panel instanceof HTMLElement && panel.hidden !== true) {
        panel.style.display = "";
      }
    };
    const normalizeItemsModalBsSortieSourceKeys = (value = []) => {
      const source = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [];
      const seen = new Set();
      return source
        .map((entry) => String(entry || "").trim())
        .filter((entry) => {
          if (!entry) return false;
          const key = entry.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const applyItemsModalBsSortieSourceSelection = async (section, selection) => {
      const meta = getInvoiceMeta() || {};
      const sortie = ensureItemsModalBsSortieMeta(meta);
      const previousSelection = normalizeItemsModalBsSortieSourceSelection(sortie.sourceSelection);
      const previousSelectionSignature = JSON.stringify(previousSelection || null);
      const previousSourceKeys = normalizeItemsModalBsSortieSourceKeys(
        (previousSelection?.items || []).map((entry) => entry?.key || "")
      );
      const removedRowCount = removeItemsModalBsImportedItemsBySourceKeys(previousSourceKeys);
      const normalizedSelection = normalizeItemsModalBsSortieSourceSelection(selection);
      const entriesToImport = Array.isArray(normalizedSelection?.items) ? normalizedSelection.items : [];
      const importedItems = [];
      const emptyEntries = [];
      const failedEntries = [];
      let sourcePartySnapshot = null;

      for (const entry of entriesToImport) {
        const result = await loadItemsModalBsSourceDocumentData(entry);
        if (!result?.ok) {
          failedEntries.push({
            ...entry,
            error: String(result?.error || "Chargement impossible.")
          });
          continue;
        }
        if (!sourcePartySnapshot && result.partySnapshot) {
          sourcePartySnapshot = normalizeItemsModalBsSourcePartySnapshot(result.partySnapshot);
        }
        if (!Array.isArray(result.items) || !result.items.length) {
          emptyEntries.push(entry);
          continue;
        }
        importedItems.push(...result.items);
      }

      const resolvedPartySnapshot =
        sourcePartySnapshot ||
        normalizeItemsModalBsSourcePartySnapshot(normalizedSelection?.party || null);
      const resolvedPartySummary = resolvedPartySnapshot
        ? {
            path: String(resolvedPartySnapshot.__path || "").trim(),
            name: String(resolvedPartySnapshot.name || "").trim(),
            label: String(resolvedPartySnapshot.name || "").trim(),
            identifier: String(resolvedPartySnapshot.vat || "").trim()
          }
        : null;
      const selectionForState = normalizedSelection
        ? {
            ...normalizedSelection,
            party: resolvedPartySummary || normalizedSelection.party || null
          }
        : null;

      sortie.sourceSelection = selectionForState;
      sortie.sourceDocType = selectionForState
        ? normalizeItemsModalBsSortieSourceDocType(selectionForState.docType || "")
        : "";
      sortie.sourceRef = selectionForState
        ? formatItemsModalBsSortieSourceSelectionText(selectionForState)
        : "";
      meta.bsSortie = sortie;
      meta.bsSourceSelection = selectionForState;
      meta.bsSourceDocType = sortie.sourceDocType;
      meta.bsSourceRef = sortie.sourceRef;
      const sourceInput = section?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.sourceRef}`);
      if (sourceInput && sourceInput.value !== sortie.sourceRef) {
        sourceInput.value = sortie.sourceRef;
      }
      renderItemsModalBsSortieSourceSelectionList(section, selectionForState);
      syncItemsModalBsSortieSourcePickerUi(section, sortie);
      if (importedItems.length) {
        appendItemsModalBeImportedItems(importedItems);
      }
      const destinationSynced = syncItemsModalBsSortieDestinationFromSourceSelection(
        section,
        selectionForState ? resolvedPartySnapshot : null
      );
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      const selectionChanged =
        previousSelectionSignature !== JSON.stringify(selectionForState || null);
      if (
        (selectionChanged || removedRowCount > 0 || importedItems.length > 0 || destinationSynced) &&
        typeof SEM.markDocumentDirty === "function"
      ) {
        SEM.markDocumentDirty(true);
      }
      const notices = [];
      if (emptyEntries.length) {
        notices.push(
          `Aucun article n'a ete trouve dans : ${formatItemsModalBeSourceEntryList(emptyEntries)}.`
        );
      }
      if (failedEntries.length) {
        notices.push(
          `Impossible de charger : ${failedEntries
            .map((entry) => `${String(entry.displayName || entry.number || "Document").trim()} (${entry.error})`)
            .join(", ")}.`
        );
      }
      if (notices.length) {
        await w.showDialog?.(notices.join("\n\n"), { title: "Import des articles" });
      }
      return {
        selectionChanged,
        removedRowCount,
        importedCount: importedItems.length
      };
    };
    const removeItemsModalBsSortieSourceEntries = async (section, sourceKeys = []) => {
      const meta = getInvoiceMeta() || {};
      const sortie = ensureItemsModalBsSortieMeta(meta);
      const normalizedKeys = normalizeItemsModalBsSortieSourceKeys(sourceKeys);
      if (!normalizedKeys.length) return false;
      const keySet = new Set(normalizedKeys.map((entry) => entry.toLowerCase()));
      const previousSelection = normalizeItemsModalBsSortieSourceSelection(sortie.sourceSelection);
      const nextSelectionItems = (previousSelection?.items || []).filter(
        (entry) => !keySet.has(String(entry?.key || "").trim().toLowerCase())
      );
      const nextSelection =
        nextSelectionItems.length && previousSelection?.docType
          ? {
              docType: previousSelection.docType,
              party: previousSelection.party || null,
              items: nextSelectionItems
            }
          : null;
      await applyItemsModalBsSortieSourceSelection(section, nextSelection);
      return true;
    };
    const syncItemsModalBsSortieSourcePickerUi = (section, sortieInput = null) => {
      if (!section) return;
      const sortie =
        sortieInput && typeof sortieInput === "object"
          ? sortieInput
          : ensureItemsModalBsSortieMeta(getInvoiceMeta() || {});
      const sourceInput = section.querySelector(`#${ITEMS_BS_SORTIE_FIELDS.sourceRef}`);
      const sourcePickerBtn = section.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_PICKER_ID}`);
      const sourceReviewBtn = section.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_REVIEW_ID}`);
      const linkedSelection = normalizeItemsModalBsSortieSourceSelection(sortie?.sourceSelection);
      const hasLinkedSource = !!linkedSelection?.items?.length;
      const sourceDocType = normalizeItemsModalBsSortieSourceDocType(sortie?.sourceDocType || "");
      const sourceLabel = getItemsModalBsSortieSourceDocTypeLabel(sourceDocType);
      const placeholder = getItemsModalBsSortieSourceRefPlaceholder(sourceDocType);
      if (sourceInput instanceof HTMLElement) {
        sourceInput.placeholder = placeholder;
        sourceInput.dataset.sourceDocType = sourceDocType;
      }
      if (sourcePickerBtn instanceof HTMLElement) {
        sourcePickerBtn.dataset.sourceDocType = sourceDocType;
        sourcePickerBtn.title = sourceLabel
          ? `Type source selectionne: ${sourceLabel}`
          : "Selectionner le type de document source";
        sourcePickerBtn.setAttribute(
          "aria-label",
          sourceLabel
            ? `Type source selectionne: ${sourceLabel}. Changer le type de document source`
            : "Selectionner le type de document source"
        );
      }
      if (sourceReviewBtn instanceof HTMLElement) {
        sourceReviewBtn.disabled = !hasLinkedSource;
        sourceReviewBtn.title = hasLinkedSource
          ? "Voir ou gerer les documents source selectionnes"
          : "Aucun document source selectionne";
        sourceReviewBtn.setAttribute(
          "aria-label",
          hasLinkedSource
            ? "Voir ou gerer les documents source selectionnes"
            : "Aucun document source selectionne"
        );
      }
    };
    const openItemsModalBsSortieSourcePicker = async (trigger, section) => {
      const controller = createItemsModalBsSortieSourceTypeDialogController();
      if (!controller || typeof controller.open !== "function") {
        await w.showDialog?.("Selection de document indisponible.", { title: "Erreur" });
        return;
      }
      const pickerApi = w.AppInit?.BonSortieSourceDocumentPicker?.open;
      if (typeof pickerApi !== "function") {
        await w.showDialog?.("Fenetre de selection indisponible.", { title: "Erreur" });
        return;
      }
      const meta = getInvoiceMeta() || {};
      const sortie = ensureItemsModalBsSortieMeta(meta);
      const initialStateSignature = JSON.stringify({
        sourceDocType: normalizeItemsModalBsSortieSourceDocType(sortie?.sourceDocType || ""),
        sourceRef: String(sortie?.sourceRef || ""),
        sourceSelection: normalizeItemsModalBsSortieSourceSelection(sortie?.sourceSelection) || null
      });
      const fallbackDocType =
        normalizeItemsModalBsSortieSourceDocType(sortie?.sourceDocType || "") || "facture";
      let selectedDocType = "";
      try {
        selectedDocType = await controller.open({
          choices: ITEMS_BS_SORTIE_SOURCE_DOC_TYPE_CHOICES,
          fallbackDocType,
          title: "Selectionner un document source",
          message: "Choisissez le type de document source pour la reference de sortie :",
          trigger
        });
      } catch (err) {
        console.warn("bs source type chooser failed", err);
        selectedDocType = "";
      }
      const normalizedDocType = normalizeItemsModalBsSortieSourceDocType(selectedDocType);
      if (!normalizedDocType) return;
      const previousSelection = normalizeItemsModalBsSortieSourceSelection(sortie.sourceSelection);
      const previousSelectionText = formatItemsModalBsSortieSourceSelectionText(previousSelection);
      const previousSourceKeys = normalizeItemsModalBsSortieSourceKeys(
        (previousSelection?.items || []).map((entry) => entry?.key || "")
      );
      let removedRowCount = 0;
      let destinationReset = false;
      sortie.sourceDocType = normalizedDocType;
      if (
        previousSelection &&
        normalizeItemsModalBsSortieSourceDocType(previousSelection.docType || "") !== normalizedDocType
      ) {
        removedRowCount = removeItemsModalBsImportedItemsBySourceKeys(previousSourceKeys);
        destinationReset = syncItemsModalBsSortieDestinationFromSourceSelection(section, null);
        sortie.sourceSelection = null;
        if (!sortie.sourceRef || sortie.sourceRef === previousSelectionText) {
          sortie.sourceRef = "";
        }
      }
      meta.bsSortie = sortie;
      meta.bsSourceDocType = normalizedDocType;
      meta.bsSourceSelection = sortie.sourceSelection || null;
      meta.bsSourceRef = sortie.sourceRef || "";
      const sourceInput = section?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.sourceRef}`);
      if (sourceInput && sourceInput.value !== String(sortie.sourceRef || "")) {
        sourceInput.value = String(sortie.sourceRef || "");
      }
      syncItemsModalBsSortieSourcePickerUi(section, sortie);
      renderItemsModalBsSortieSourceSelectionList(section, sortie.sourceSelection);
      let pickerResult = null;
      try {
        pickerResult = await pickerApi(trigger, {
          docType: normalizedDocType,
          choices: ITEMS_BS_SORTIE_SOURCE_DOC_TYPE_CHOICES,
          fallbackDocType: normalizedDocType,
          initialSelection: sortie?.sourceSelection || null,
          initialSupplier:
            sortie?.sourceSelection?.party ||
            sortie?.sourceSelection?.client ||
            sortie?.sourceSelection?.supplier ||
            null,
          sourceChooserTitle: "Selectionner un document source",
          sourceChooserMessage:
            "Choisissez le type de document source pour la reference de sortie :",
          searchPlaceholder: "Rechercher par numero"
        });
      } catch (err) {
        console.warn("bs source document picker failed", err);
        pickerResult = null;
      }
      if (pickerResult?.ok && Array.isArray(pickerResult.items) && pickerResult.items.length) {
        const normalizedSelection = normalizeItemsModalBsSortieSourceSelection({
          docType: pickerResult.docType || normalizedDocType,
          items: pickerResult.items,
          party:
            pickerResult.party ||
            pickerResult.client ||
            pickerResult.supplier ||
            null
        });
        await applyItemsModalBsSortieSourceSelection(section, normalizedSelection);
      }
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      const finalSortie = ensureItemsModalBsSortieMeta(meta);
      const finalStateSignature = JSON.stringify({
        sourceDocType: normalizeItemsModalBsSortieSourceDocType(finalSortie?.sourceDocType || ""),
        sourceRef: String(finalSortie?.sourceRef || ""),
        sourceSelection: normalizeItemsModalBsSortieSourceSelection(finalSortie?.sourceSelection) || null
      });
      if (
        (finalStateSignature !== initialStateSignature || removedRowCount > 0 || destinationReset) &&
        typeof SEM.markDocumentDirty === "function"
      ) {
        SEM.markDocumentDirty(true);
      }
      try {
        sourceInput?.focus?.();
      } catch {}
    };
    const syncItemsModalBeReceptionBoxFromState = (section = getItemsModalBeReceptionBox()) => {
      if (!section) return false;
      const meta = getInvoiceMeta() || {};
      const isBonEntree = String(meta.docType || "facture").trim().toLowerCase() === "be";
      const isBonSortie = String(meta.docType || "facture").trim().toLowerCase() === "bs";
      syncItemsModalDocOptionsNotesForDocType(meta.docType || "");
      syncItemsModalBeRemarksFromState({ hydrateFromModel: isBonEntree });
      syncItemsModalBsRemarksFromState({ hydrateFromModel: isBonSortie });
      const reception = ensureItemsModalBeReceptionMeta(meta);
      ensureItemsModalBeReceptionDatePicker(section);
      const timePicker = ensureItemsModalBeReceptionTimePicker(section);
      const sourcePickerBtn = section.querySelector(`#${ITEMS_BE_RECEPTION_SOURCE_PICKER_ID}`);
      const sourceReviewBtn = section.querySelector(`#${ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID}`);
      Object.entries(ITEMS_BE_RECEPTION_FIELDS).forEach(([key, id]) => {
        const input = section.querySelector(`#${id}`);
        if (!input) return;
        if (key === "depot" || key === "destination") return;
        const nextValue = String(reception?.[key] || "");
        if (key === "time" && timePicker) {
          timePicker.setValue(nextValue, { silent: true });
          return;
        }
        if (input.value !== nextValue) {
          input.value = nextValue;
        }
      });
      if (sourcePickerBtn) {
        sourcePickerBtn.disabled = !isBonEntree;
        sourcePickerBtn.setAttribute("aria-hidden", isBonEntree ? "false" : "true");
      }
      if (sourceReviewBtn) {
        sourceReviewBtn.disabled = !isBonEntree || !normalizeItemsModalBeReceptionSourceSelection(reception.sourceSelection)?.items?.length;
      }
      renderItemsModalBeReceptionSourceSelectionList(section, reception.sourceSelection);
      section.hidden = !isBonEntree;
      section.setAttribute("aria-hidden", isBonEntree ? "false" : "true");
      section.style.display = isBonEntree ? "" : "none";
      if (!isBonEntree) {
        setItemsModalBeReceptionSourceManagerOpen(section, false);
        try {
          timePicker?.close?.();
        } catch {}
        const refs = getItemsModalBeReceptionPickerRefs(section);
        closeItemsModalBeReceptionPickerMenu(refs.depotMenu);
        closeItemsModalBeReceptionPickerMenu(refs.destinationMenu);
      } else {
        void syncItemsModalBeReceptionSelectors(section);
      }
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      return true;
    };
    const wireItemsModalBeReceptionBox = (section) => {
      if (!section || section.dataset.wired === "1") return;
      section.dataset.wired = "1";
      ensureItemsModalBeReceptionDatePicker(section);
      ensureItemsModalBeReceptionTimePicker(section);
      const pickerRefs = getItemsModalBeReceptionPickerRefs(section);
      wireItemsModalBeReceptionPickerMenu(pickerRefs.depotMenu, pickerRefs.depotPanel);
      wireItemsModalBeReceptionPickerMenu(pickerRefs.destinationMenu, pickerRefs.destinationPanel);
      if (!SEM.__itemsBeReceptionPickerDocBound) {
        SEM.__itemsBeReceptionPickerDocBound = true;
        document.addEventListener(
          "click",
          (event) => {
            if (!(event.target instanceof Element)) return;
            document
              .querySelectorAll?.(
                `#${ITEMS_BE_RECEPTION_BOX_ID} .field-toggle-menu[open]`
              )
              ?.forEach?.((menu) => {
              if (!(menu instanceof HTMLElement)) return;
              if (menu.contains(event.target)) return;
              closeItemsModalBeReceptionPickerMenu(menu);
            });
            document
              .querySelectorAll?.(`#${ITEMS_BE_RECEPTION_BOX_ID}`)
              ?.forEach?.((box) => {
                if (!(box instanceof HTMLElement)) return;
                if (box.contains(event.target)) return;
                setItemsModalBeReceptionSourceManagerOpen(box, false);
              });
          },
          true
        );
      }
      pickerRefs.depotSelect?.addEventListener("change", () => {
        const meta = getInvoiceMeta() || {};
        const reception = ensureItemsModalBeReceptionMeta(meta);
        const selectedOption =
          (pickerRefs.depotSelect.selectedOptions && pickerRefs.depotSelect.selectedOptions.length
            ? pickerRefs.depotSelect.selectedOptions[0]
            : null) ||
          Array.from(pickerRefs.depotSelect.options || []).find(
            (option) => option.value === pickerRefs.depotSelect.value
          ) ||
          null;
        reception.depotId = normalizeItemsModalBeReceptionDepotId(pickerRefs.depotSelect.value || "");
        reception.depot = reception.depotId
          ? normalizeItemsModalBeReceptionText(selectedOption?.textContent || "")
          : "";
        reception.destinationId = "";
        reception.destinationIds = [];
        reception.destinationLabels = [];
        reception.destination = "";
        meta.beReception = reception;
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        void syncItemsModalBeReceptionSelectors(section);
      });
      pickerRefs.destinationSelect?.addEventListener("change", () => {
        const meta = getInvoiceMeta() || {};
        const reception = ensureItemsModalBeReceptionMeta(meta);
        const stockUtils = getItemsModalBeReceptionStockUtils();
        const selectedIds = normalizeItemsModalBeReceptionDestinationIds(
          typeof stockUtils.getSelectedLocationIds === "function"
            ? stockUtils.getSelectedLocationIds(pickerRefs.destinationSelect)
            : Array.from(pickerRefs.destinationSelect.selectedOptions || []).map((option) => option.value)
        );
        const selectedLabels = normalizeItemsModalBeReceptionDestinationLabels(
          selectedIds
            .map((locationId) => {
              const option = Array.from(pickerRefs.destinationSelect.options || []).find(
                (entry) => String(entry.value || "").trim() === locationId
              );
              return normalizeItemsModalBeReceptionText(option?.textContent || "");
            })
            .filter(Boolean)
        );
        reception.destinationId = selectedIds[0] || "";
        reception.destinationIds = selectedIds;
        reception.destinationLabels = selectedLabels;
        reception.destination = selectedLabels.length
          ? formatItemsModalBeReceptionDestinationText(selectedLabels)
          : "";
        meta.beReception = reception;
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        void syncItemsModalBeReceptionSelectors(section);
      });
      Object.entries(ITEMS_BE_RECEPTION_FIELDS).forEach(([key, id]) => {
        const input = section.querySelector(`#${id}`);
        if (!input) return;
        if (key === "depot" || key === "destination") return;
        const syncValue = () => {
          const meta = getInvoiceMeta() || {};
          const reception = ensureItemsModalBeReceptionMeta(meta);
          reception[key] = String(input.value || "").trim();
          if (key === "sourceRef") {
            const selectedText = formatItemsModalBeReceptionSourceSelectionText(reception.sourceSelection);
            if (!reception[key] || reception[key] !== selectedText) {
              reception.sourceSelection = null;
            }
            renderItemsModalBeReceptionSourceSelectionList(section, reception.sourceSelection);
          }
          meta.beReception = reception;
          if (typeof SEM.refreshInvoiceSummary === "function") {
            SEM.refreshInvoiceSummary();
          }
        };
        input.addEventListener("input", syncValue);
        input.addEventListener("change", syncValue);
      });
      const sourcePickerBtn = section.querySelector(`#${ITEMS_BE_RECEPTION_SOURCE_PICKER_ID}`);
      const sourceReviewBtn = section.querySelector(`#${ITEMS_BE_RECEPTION_SOURCE_REVIEW_ID}`);
      sourcePickerBtn?.addEventListener("click", () => {
        setItemsModalBeReceptionSourceManagerOpen(section, false);
        void openItemsModalBeReceptionSourcePicker(sourcePickerBtn, section);
      });
      sourceReviewBtn?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (sourceReviewBtn.disabled) return;
        const panel =
          section.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}`) || null;
        const isOpen = panel instanceof HTMLElement && !panel.hidden;
        setItemsModalBeReceptionSourceManagerOpen(section, !isOpen);
      });
      section.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const panel =
          section.querySelector?.(`#${ITEMS_BE_RECEPTION_SOURCE_MANAGER_ID}`) || null;
        if (!(panel instanceof HTMLElement) || panel.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        setItemsModalBeReceptionSourceManagerOpen(section, false);
        sourceReviewBtn?.focus?.();
      });
      section.addEventListener("click", (event) => {
        const removeBtn = event.target?.closest?.("[data-source-remove-key]");
        if (!(removeBtn instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        const sourceKey = String(removeBtn.dataset.sourceRemoveKey || "").trim();
        if (!sourceKey) return;
        removeItemsModalBeReceptionSourceEntries(section, [sourceKey]);
      });
    };
    const syncItemsModalBsSortieBoxFromState = (
      sortieSection = getItemsModalBsSortieBox(),
      transportSection = getItemsModalBsTransportBox()
    ) => {
      const meta = getInvoiceMeta() || {};
      const isBonSortie = String(meta.docType || "facture").trim().toLowerCase() === "bs";
      syncItemsModalDocOptionsNotesForDocType(meta.docType || "");
      syncItemsModalBsRemarksFromState({ hydrateFromModel: isBonSortie });
      if (!sortieSection && !transportSection) {
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        if (typeof SEM.updateAmountWordsBlock === "function") {
          SEM.updateAmountWordsBlock();
        }
        return false;
      }
      const sortie = ensureItemsModalBsSortieMeta(meta);
      ensureItemsModalBsSortieDatePicker(sortieSection);
      const timePicker = ensureItemsModalBsSortieTimePicker(sortieSection);
      Object.entries(ITEMS_BS_SORTIE_FIELDS).forEach(([key, id]) => {
        if (key === "depot" || key === "location") return;
        const input =
          itemsDocOptionsModalContent?.querySelector?.(`#${id}`) ||
          sortieSection?.querySelector?.(`#${id}`) ||
          transportSection?.querySelector?.(`#${id}`) ||
          null;
        if (!input) return;
        const nextValue = String(sortie?.[key] || "");
        if (key === "time" && timePicker) {
          timePicker.setValue(nextValue, { silent: true });
          return;
        }
        if (input.value !== nextValue) {
          input.value = nextValue;
        }
      });
      [sortieSection, transportSection].forEach((section) => {
        if (!section) return;
        section.hidden = !isBonSortie;
        section.setAttribute("aria-hidden", isBonSortie ? "false" : "true");
        section.style.display = isBonSortie ? "" : "none";
      });
      if (sortieSection) {
        syncItemsModalBsSortieSourcePickerUi(sortieSection, sortie);
        renderItemsModalBsSortieSourceSelectionList(sortieSection, sortie.sourceSelection);
      }
      if (isBonSortie && sortieSection) {
        void syncItemsModalBsSortieSelectors(sortieSection);
      } else if (sortieSection) {
        try {
          timePicker?.close?.();
        } catch {}
        const refs = getItemsModalBsSortiePickerRefs(sortieSection);
        closeItemsModalBeReceptionPickerMenu(refs.depotMenu);
        closeItemsModalBeReceptionPickerMenu(refs.locationMenu);
        setItemsModalBsSortieSourceManagerOpen(sortieSection, false);
      }
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      return true;
    };
    const bindItemsModalBsSortieFields = (section, fieldKeys = []) => {
      if (!section) return;
      fieldKeys.forEach((key) => {
        const id = ITEMS_BS_SORTIE_FIELDS[key];
        if (!id) return;
        const input = section.querySelector(`#${id}`);
        if (!input) return;
        const syncValue = () => {
          const meta = getInvoiceMeta() || {};
          const sortie = ensureItemsModalBsSortieMeta(meta);
          sortie[key] = String(input.value || "").trim();
          if (key === "sourceRef") {
            const selectedText = formatItemsModalBsSortieSourceSelectionText(sortie.sourceSelection);
            if (!sortie[key] || sortie[key] !== selectedText) {
              sortie.sourceSelection = null;
            }
            meta.bsSourceRef = sortie[key];
            meta.bsSourceSelection = sortie.sourceSelection || null;
            renderItemsModalBsSortieSourceSelectionList(section, sortie.sourceSelection);
          } else if (key === "date") {
            meta.bsSortieDate = sortie[key];
          } else if (key === "time") {
            meta.bsSortieTime = sortie[key];
          } else if (key === "transporter") {
            meta.bsTransporter = sortie[key];
          } else if (key === "driverName") {
            meta.bsDriverName = sortie[key];
          } else if (key === "vehiclePlate") {
            meta.bsVehiclePlate = sortie[key];
          } else if (key === "transportMode") {
            meta.bsTransportMode = sortie[key];
          } else if (key === "exitReason") {
            meta.bsExitReason = sortie[key];
          }
          meta.bsSortie = sortie;
          if (key === "sourceRef") {
            syncItemsModalBsSortieSourcePickerUi(section, sortie);
          }
          if (typeof SEM.refreshInvoiceSummary === "function") {
            SEM.refreshInvoiceSummary();
          }
          if (typeof SEM.updateAmountWordsBlock === "function") {
            SEM.updateAmountWordsBlock();
          }
          if (typeof SEM.markDocumentDirty === "function") {
            SEM.markDocumentDirty(true);
          }
        };
        input.addEventListener("input", syncValue);
        input.addEventListener("change", syncValue);
      });
    };
    const wireItemsModalBsSortieBox = (section) => {
      if (!section || section.dataset.wired === "1") return;
      section.dataset.wired = "1";
      ensureItemsModalBsSortieDatePicker(section);
      ensureItemsModalBsSortieTimePicker(section);
      const pickerRefs = getItemsModalBsSortiePickerRefs(section);
      wireItemsModalBeReceptionPickerMenu(pickerRefs.depotMenu, pickerRefs.depotPanel);
      wireItemsModalBeReceptionPickerMenu(pickerRefs.locationMenu, pickerRefs.locationPanel);
      if (!SEM.__itemsBsSortiePickerDocBound) {
        SEM.__itemsBsSortiePickerDocBound = true;
        document.addEventListener(
          "click",
          (event) => {
            if (!(event.target instanceof Element)) return;
            document
              .querySelectorAll?.(
                `#${ITEMS_BS_SORTIE_BOX_ID} .field-toggle-menu[open]`
              )
              ?.forEach?.((menu) => {
                if (!(menu instanceof HTMLElement)) return;
                if (menu.contains(event.target)) return;
                closeItemsModalBeReceptionPickerMenu(menu);
              });
            document
              .querySelectorAll?.(`#${ITEMS_BS_SORTIE_BOX_ID}`)
              ?.forEach?.((box) => {
                if (!(box instanceof HTMLElement)) return;
                if (box.contains(event.target)) return;
                setItemsModalBsSortieSourceManagerOpen(box, false);
              });
          },
          true
        );
      }
      pickerRefs.depotSelect?.addEventListener("change", () => {
        const meta = getInvoiceMeta() || {};
        const sortie = ensureItemsModalBsSortieMeta(meta);
        const selectedOption =
          (pickerRefs.depotSelect.selectedOptions && pickerRefs.depotSelect.selectedOptions.length
            ? pickerRefs.depotSelect.selectedOptions[0]
            : null) ||
          Array.from(pickerRefs.depotSelect.options || []).find(
            (option) => option.value === pickerRefs.depotSelect.value
          ) ||
          null;
        sortie.depotId = normalizeItemsModalBeReceptionDepotId(pickerRefs.depotSelect.value || "");
        sortie.depot = sortie.depotId
          ? normalizeItemsModalBeReceptionText(selectedOption?.textContent || "")
          : "";
        sortie.locationId = "";
        sortie.locationIds = [];
        sortie.locationLabels = [];
        sortie.location = "";
        meta.bsSortie = sortie;
        meta.bsDepot = sortie.depot;
        meta.bsDepotId = sortie.depotId;
        meta.bsLocation = sortie.location;
        meta.bsLocationId = sortie.locationId;
        meta.bsLocationIds = sortie.locationIds;
        meta.bsLocationLabels = sortie.locationLabels;
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        if (typeof SEM.markDocumentDirty === "function") {
          SEM.markDocumentDirty(true);
        }
        void syncItemsModalBsSortieSelectors(section);
      });
      pickerRefs.locationSelect?.addEventListener("change", () => {
        const meta = getInvoiceMeta() || {};
        const sortie = ensureItemsModalBsSortieMeta(meta);
        const stockUtils = getItemsModalBeReceptionStockUtils();
        const selectedLocationIds = normalizeItemsModalBsSortieLocationIds(
          typeof stockUtils.getSelectedLocationIds === "function"
            ? stockUtils.getSelectedLocationIds(pickerRefs.locationSelect)
            : Array.from(pickerRefs.locationSelect.selectedOptions || []).map((option) => option.value)
        );
        const selectedLocationLabels = normalizeItemsModalBsSortieLocationLabels(
          selectedLocationIds
            .map((locationId) => {
              const selectedOption = Array.from(pickerRefs.locationSelect.options || []).find(
                (option) => normalizeItemsModalBeReceptionLocationId(option.value || "") === locationId
              );
              return normalizeItemsModalBeReceptionText(selectedOption?.textContent || "");
            })
            .filter(Boolean)
        );
        sortie.locationId = selectedLocationIds[0] || "";
        sortie.locationIds = selectedLocationIds;
        sortie.locationLabels = selectedLocationLabels;
        sortie.location = selectedLocationLabels.length
          ? formatItemsModalBsSortieLocationText(selectedLocationLabels)
          : "";
        meta.bsSortie = sortie;
        meta.bsLocation = sortie.location;
        meta.bsLocationId = sortie.locationId;
        meta.bsLocationIds = sortie.locationIds;
        meta.bsLocationLabels = sortie.locationLabels;
        if (typeof SEM.refreshInvoiceSummary === "function") {
          SEM.refreshInvoiceSummary();
        }
        if (typeof SEM.markDocumentDirty === "function") {
          SEM.markDocumentDirty(true);
        }
        void syncItemsModalBsSortieSelectors(section);
      });
      bindItemsModalBsSortieFields(section, ["date", "time", "sourceRef"]);
      const sourcePickerBtn = section.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_PICKER_ID}`);
      const sourceReviewBtn = section.querySelector(`#${ITEMS_BS_SORTIE_SOURCE_REVIEW_ID}`);
      sourcePickerBtn?.addEventListener("click", () => {
        void openItemsModalBsSortieSourcePicker(sourcePickerBtn, section);
      });
      sourceReviewBtn?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (sourceReviewBtn.disabled) return;
        const panel =
          section.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}`) || null;
        const isOpen = panel instanceof HTMLElement && !panel.hidden;
        setItemsModalBsSortieSourceManagerOpen(section, !isOpen);
      });
      section.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const panel =
          section.querySelector?.(`#${ITEMS_BS_SORTIE_SOURCE_MANAGER_ID}`) || null;
        if (!(panel instanceof HTMLElement) || panel.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        setItemsModalBsSortieSourceManagerOpen(section, false);
        sourceReviewBtn?.focus?.();
      });
      section.addEventListener("click", (event) => {
        const removeBtn = event.target?.closest?.("[data-source-remove-key]");
        if (!(removeBtn instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        const sourceKey = String(removeBtn.dataset.sourceRemoveKey || "").trim();
        if (!sourceKey) return;
        void removeItemsModalBsSortieSourceEntries(section, [sourceKey]);
      });
      renderItemsModalBsSortieSourceSelectionList(
        section,
        ensureItemsModalBsSortieMeta(getInvoiceMeta() || {}).sourceSelection
      );
      syncItemsModalBsSortieSourcePickerUi(section);
    };
    const wireItemsModalBsTransportBox = (section) => {
      if (!section || section.dataset.wired === "1") return;
      section.dataset.wired = "1";
      bindItemsModalBsSortieFields(section, [
        "transporter",
        "driverName",
        "vehiclePlate",
        "transportMode",
        "exitReason"
      ]);
    };
    const resolveItemsModalBsTransporteurSnapshot = (input = null) => {
      const raw = input && typeof input === "object" ? input : {};
      const client = raw.client && typeof raw.client === "object" ? raw.client : {};
      const read = (...values) => {
        for (const value of values) {
          const normalized = normalizeItemsModalBeReceptionText(value || "");
          if (normalized) return normalized;
        }
        return "";
      };
      return {
        name: read(raw.name, raw.transporteur, raw.label, client.name, client.transporteur, client.label),
        driverName: read(
          raw.driverName,
          raw.driver,
          raw.chauffeur,
          raw.benefit,
          client.driverName,
          client.driver,
          client.chauffeur,
          client.benefit
        ),
        vehiclePlate: read(
          raw.vehiclePlate,
          raw.vehicle,
          raw.vehicule,
          raw.matriculeVehicule,
          raw.matriculeVehicle,
          raw.account,
          client.vehiclePlate,
          client.vehicle,
          client.vehicule,
          client.matriculeVehicule,
          client.matriculeVehicle,
          client.account
        ),
        transportMode: read(
          raw.transportMode,
          raw.modeTransport,
          raw.modeDeTransport,
          raw.transport,
          raw.stegRef,
          client.transportMode,
          client.modeTransport,
          client.modeDeTransport,
          client.transport,
          client.stegRef
        ),
        codeTransporteur: read(
          raw.codeTransporteur,
          raw.code_transporteur,
          raw.codeClient,
          raw.code_client,
          raw.code,
          client.codeTransporteur,
          client.code_transporteur,
          client.codeClient,
          client.code_client,
          client.code
        ),
        phone: read(raw.phone, raw.telephone, raw.tel, client.phone, client.telephone, client.tel),
        email: read(raw.email, client.email),
        address: read(raw.address, raw.adresse, client.address, client.adresse)
      };
    };
    const applyItemsModalBsTransporteurSnapshot = (payload = null) => {
      const meta = getInvoiceMeta() || {};
      const isBonSortie = String(meta.docType || "").trim().toLowerCase() === "bs";
      if (!isBonSortie) return false;
      const snapshot = resolveItemsModalBsTransporteurSnapshot(payload);
      if (!snapshot.name && !snapshot.driverName && !snapshot.vehiclePlate && !snapshot.transportMode) {
        return false;
      }
      const sortie = ensureItemsModalBsSortieMeta(meta);
      sortie.transporter = snapshot.name;
      sortie.driverName = snapshot.driverName;
      sortie.vehiclePlate = snapshot.vehiclePlate;
      sortie.transportMode = snapshot.transportMode;
      meta.bsSortie = sortie;
      meta.bsTransporter = sortie.transporter;
      meta.bsDriverName = sortie.driverName;
      meta.bsVehiclePlate = sortie.vehiclePlate;
      meta.bsTransportMode = sortie.transportMode;
      syncItemsModalBsSortieBoxFromState();
      if (typeof SEM.refreshInvoiceSummary === "function") {
        SEM.refreshInvoiceSummary();
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      if (typeof SEM.markDocumentDirty === "function") {
        SEM.markDocumentDirty(true);
      }
      return true;
    };
    SEM.applyTransporteurSavedSelectionToBonSortie = (payload = null) =>
      applyItemsModalBsTransporteurSnapshot(payload);
    const syncItemsModalStockMovementBoxesFromState = () => {
      syncItemsModalBeReceptionBoxFromState();
      syncItemsModalBsSortieBoxFromState();
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
    const MODEL_DOC_TYPE_LIST = ["facture", "fa", "bc", "be", "bs", "devis", "bl", "avoir"];
    const MODEL_DOC_TYPE_SWITCH_FACTURE = "facture";
    const MODEL_DOC_TYPE_SWITCH_EXCLUSIVE_WITH_PURCHASE = new Set([
      MODEL_DOC_TYPE_SWITCH_FACTURE,
      "bs",
      "avoir",
      "devis",
      "bl"
    ]);
    const MODEL_DOC_TYPE_ALIAS_MAP = {
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir",
      bonentree: "be",
      bon_entree: "be",
      "bon-entree": "be",
      "bon entree": "be",
      "bon d'entree": "be",
      "bon d'entrée": "be",
      bonsortie: "bs",
      bon_sortie: "bs",
      "bon-sortie": "bs",
      "bon sortie": "bs",
      "bon de sortie": "bs"
    };
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

    const normalizeItemsModalBeRemarksFontSize = (value, fallback = 12) => {
      const parsed = Number.parseInt(value, 10);
      if ([10, 12, 14].includes(parsed)) return parsed;
      const fallbackParsed = Number.parseInt(fallback, 10);
      return [10, 12, 14].includes(fallbackParsed) ? fallbackParsed : 12;
    };

    const hasItemsModalBeRemarksText = (value) =>
      String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|\u00a0/gi, " ")
        .trim().length > 0;

    const hydrateItemsModalBeRemarksFromModelIfNeeded = (metaInput = null) => {
      const meta =
        metaInput && typeof metaInput === "object"
          ? metaInput
          : (getInvoiceMeta() || {});
      if (!meta || typeof meta !== "object") return false;

      const docTypeValue = String(meta.docType || "").trim().toLowerCase();
      if (docTypeValue !== "be") return false;
      if (isItemsModalEditMode()) return false;
      if (String(meta.historyPath || meta.historyDocType || "").trim()) return false;

      if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
      if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
      const pdfState = meta.extras.pdf;

      const existingValue = String(pdfState.beRemarks ?? "");
      const touched = pdfState.beRemarksTouched === true;
      if (hasItemsModalBeRemarksText(existingValue) || touched) return false;

      const modelName = sanitizeModelSeed(
        meta.documentModelName ||
          meta.docDialogModelName ||
          meta.modelName ||
          meta.modelKey ||
          ""
      );
      if (!modelName) return false;
      const modelConfig = resolveItemsModalModelConfigByName(modelName);
      const modelPdf = modelConfig?.pdf && typeof modelConfig.pdf === "object" ? modelConfig.pdf : null;
      const seededValue = typeof modelPdf?.beRemarks === "string" ? modelPdf.beRemarks : "";
      if (!hasItemsModalBeRemarksText(seededValue)) return false;

      pdfState.beRemarks = seededValue;
      pdfState.beRemarksSize = normalizeItemsModalBeRemarksFontSize(
        modelPdf?.beRemarksSize,
        pdfState.beRemarksSize ?? 12
      );
      pdfState.beRemarksTouched = false;
      return true;
    };

    const syncItemsModalBeRemarksFromState = ({ hydrateFromModel = false } = {}) => {
      const meta = getInvoiceMeta() || {};
      if (!meta || typeof meta !== "object") return false;
      if (hydrateFromModel) {
        hydrateItemsModalBeRemarksFromModelIfNeeded(meta);
      }
      if (!meta.extras || typeof meta.extras !== "object") return false;
      if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
      const pdfState = meta.extras.pdf;

      const value = String(pdfState.beRemarks ?? "");
      const size = normalizeItemsModalBeRemarksFontSize(pdfState.beRemarksSize, 12);
      pdfState.beRemarksSize = size;

      const hiddenInput = itemsDocOptionsModalContent?.querySelector?.("#beRemarks") || getEl("beRemarks");
      if (hiddenInput && hiddenInput.value !== value) {
        hiddenInput.value = value;
      }

      const sizeInput =
        itemsDocOptionsModalContent?.querySelector?.("#beRemarksFontSize") || getEl("beRemarksFontSize");
      if (sizeInput && sizeInput.value !== String(size)) {
        sizeInput.value = String(size);
      }

      const setEditorContent = SEM?.__bindingHelpers?.setWhNoteEditorContent;
      if (typeof setEditorContent === "function") {
        setEditorContent(value, { group: "beRemarksMain" });
      } else {
        const editor =
          itemsDocOptionsModalContent?.querySelector?.("#beRemarksEditor") || getEl("beRemarksEditor");
        if (editor) {
          if (editor.innerHTML !== value) editor.innerHTML = value;
          editor.dataset.empty = hasItemsModalBeRemarksText(value) ? "false" : "true";
        }
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      return true;
    };
    const normalizeItemsModalBsRemarksFontSize = (value, fallback = 12) => {
      const parsed = Number.parseInt(value, 10);
      if ([10, 12, 14].includes(parsed)) return parsed;
      const fallbackParsed = Number.parseInt(fallback, 10);
      return [10, 12, 14].includes(fallbackParsed) ? fallbackParsed : 12;
    };
    const hasItemsModalBsRemarksText = (value) =>
      String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|\u00a0/gi, " ")
        .trim().length > 0;
    const hydrateItemsModalBsRemarksFromModelIfNeeded = (metaInput = null) => {
      const meta =
        metaInput && typeof metaInput === "object"
          ? metaInput
          : (getInvoiceMeta() || {});
      if (!meta || typeof meta !== "object") return false;

      const docTypeValue = String(meta.docType || "").trim().toLowerCase();
      if (docTypeValue !== "bs") return false;
      if (isItemsModalEditMode()) return false;
      if (String(meta.historyPath || meta.historyDocType || "").trim()) return false;

      if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
      if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
      const pdfState = meta.extras.pdf;

      const existingValue = String(pdfState.bsRemarks ?? "");
      const touched = pdfState.bsRemarksTouched === true;
      if (hasItemsModalBsRemarksText(existingValue) || touched) return false;

      const modelName = sanitizeModelSeed(
        meta.documentModelName ||
          meta.docDialogModelName ||
          meta.modelName ||
          meta.modelKey ||
          ""
      );
      if (!modelName) return false;
      const modelConfig = resolveItemsModalModelConfigByName(modelName);
      const modelPdf = modelConfig?.pdf && typeof modelConfig.pdf === "object" ? modelConfig.pdf : null;
      const seededValue = typeof modelPdf?.bsRemarks === "string" ? modelPdf.bsRemarks : "";
      if (!hasItemsModalBsRemarksText(seededValue)) return false;

      pdfState.bsRemarks = seededValue;
      pdfState.bsRemarksSize = normalizeItemsModalBsRemarksFontSize(
        modelPdf?.bsRemarksSize,
        pdfState.bsRemarksSize ?? 12
      );
      pdfState.bsRemarksTouched = false;
      return true;
    };
    const syncItemsModalBsRemarksFromState = ({ hydrateFromModel = false } = {}) => {
      const meta = getInvoiceMeta() || {};
      if (!meta || typeof meta !== "object") return false;
      if (hydrateFromModel) {
        hydrateItemsModalBsRemarksFromModelIfNeeded(meta);
      }
      if (!meta.extras || typeof meta.extras !== "object") return false;
      if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
      const pdfState = meta.extras.pdf;

      const value = String(pdfState.bsRemarks ?? "");
      const size = normalizeItemsModalBsRemarksFontSize(pdfState.bsRemarksSize, 12);
      pdfState.bsRemarksSize = size;

      const hiddenInput = itemsDocOptionsModalContent?.querySelector?.("#bsRemarks") || getEl("bsRemarks");
      if (hiddenInput && hiddenInput.value !== value) {
        hiddenInput.value = value;
      }

      const sizeInput =
        itemsDocOptionsModalContent?.querySelector?.("#bsRemarksFontSize") || getEl("bsRemarksFontSize");
      if (sizeInput && sizeInput.value !== String(size)) {
        sizeInput.value = String(size);
      }

      const setEditorContent = SEM?.__bindingHelpers?.setWhNoteEditorContent;
      if (typeof setEditorContent === "function") {
        setEditorContent(value, { group: "bsRemarksMain" });
      } else {
        const editor =
          itemsDocOptionsModalContent?.querySelector?.("#bsRemarksEditor") || getEl("bsRemarksEditor");
        if (editor) {
          if (editor.innerHTML !== value) editor.innerHTML = value;
          editor.dataset.empty = hasItemsModalBsRemarksText(value) ? "false" : "true";
        }
      }
      if (typeof SEM.updateAmountWordsBlock === "function") {
        SEM.updateAmountWordsBlock();
      }
      return true;
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
          containers: [
            docOptionsRoot.querySelector("#shippingBox"),
            ...resolveItemsModalFeeOptionContainers(docOptionsRoot, "shipEnabled", "shipFields")
          ].filter((node, index, list) => !!node && list.indexOf(node) === index)
        },
        {
          used: readUsedFlag(sourceConfig?.stamp?.used),
          containers: [
            docOptionsRoot.querySelector("#stampBox"),
            ...resolveItemsModalFeeOptionContainers(docOptionsRoot, "stampEnabled", "stampFields")
          ].filter((node, index, list) => !!node && list.indexOf(node) === index)
        },
        {
          used: readUsedFlag(sourceConfig?.dossier?.used),
          containers: [
            docOptionsRoot.querySelector("#dossierBox"),
            ...resolveItemsModalFeeOptionContainers(docOptionsRoot, "dossierEnabled", "dossierFields")
          ].filter((node, index, list) => !!node && list.indexOf(node) === index)
        },
        {
          used: readUsedFlag(sourceConfig?.deplacement?.used),
          containers: [
            docOptionsRoot.querySelector("#deplacementBox"),
            ...resolveItemsModalFeeOptionContainers(docOptionsRoot, "deplacementEnabled", "deplacementFields")
          ].filter((node, index, list) => !!node && list.indexOf(node) === index)
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
      const mapped = MODEL_DOC_TYPE_ALIAS_MAP[normalized] || normalized;
      return MODEL_DOC_TYPE_LIST.includes(mapped) ? mapped : fallback;
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

    const normalizeModelDocTypeSwitchSelection = (value, preferredSwitchValue = "") => {
      let normalizedList = expandModelDocTypes(value, []);
      if (!normalizedList.length) normalizedList = [DEFAULT_MODEL_DOC_TYPE];
      const preferred = normalizeModelDocType(preferredSwitchValue, "");
      if (STOCK_EXCLUSIVE_DOC_TYPE_VALUES.has(preferred)) {
        return [preferred];
      }
      const exclusiveSelections = normalizedList.filter((entry) =>
        STOCK_EXCLUSIVE_DOC_TYPE_VALUES.has(entry)
      );
      if (exclusiveSelections.length) {
        return [exclusiveSelections[exclusiveSelections.length - 1]];
      }
      const hasPurchaseDocType = normalizedList.some((entry) => isPurchaseDocType(entry));
      const hasExclusiveWithPurchase = normalizedList.some(
        (entry) =>
          !isPurchaseDocType(entry) &&
          MODEL_DOC_TYPE_SWITCH_EXCLUSIVE_WITH_PURCHASE.has(entry)
      );
      if (!hasPurchaseDocType || !hasExclusiveWithPurchase) return normalizedList;
      if (isPurchaseDocType(preferred)) {
        const purchaseDocTypes = normalizedList.filter((entry) => isPurchaseDocType(entry));
        return purchaseDocTypes.length ? purchaseDocTypes : [preferred];
      }
      return normalizedList.filter((entry) => !isPurchaseDocType(entry));
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
          if (/^bon\s+de\s+commande\b/.test(normalizedDisplay)) return "bc";
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
      const isPurchaseDocTypeActive = normalizedList.some((entry) => isPurchaseDocType(entry));
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

      if (isPurchaseDocTypeActive) {
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
      const beReceptionBox = getItemsModalBeReceptionBox();
      const beReceptionTimeInput = beReceptionBox?.querySelector?.(`#${ITEMS_BE_RECEPTION_FIELDS.time}`) || null;
      const bsSortieBox = getItemsModalBsSortieBox();
      const bsSortieTimeInput = bsSortieBox?.querySelector?.(`#${ITEMS_BS_SORTIE_FIELDS.time}`) || null;
      try {
        beReceptionTimeInput?.__swbTimePickerController?.close?.();
      } catch {}
      try {
        bsSortieTimeInput?.__swbTimePickerController?.close?.();
      } catch {}
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
      syncItemsModalHeaderLayoutForDocType = null;
    };

    const buildItemsModalContent = () => {
      if (!itemsDocOptionsModalContent) return false;
      itemsModalMoved = false;
      const fragment = document.createDocumentFragment();
      const rowTop = document.createElement("section");
      rowTop.className = "grid two items-options-modal__top-row";
      const bePartyRow = document.createElement("section");
      bePartyRow.className = "grid two items-options-modal__be-party-row";
      bePartyRow.hidden = true;
      bePartyRow.setAttribute("aria-hidden", "true");
      const bsThirdColumn = document.createElement("div");
      bsThirdColumn.className = "items-options-modal__bs-third-column";
      bsThirdColumn.hidden = true;
      bsThirdColumn.setAttribute("aria-hidden", "true");
      const rowBottom = document.createElement("div");
      rowBottom.className = "section-row";
      let beReceptionBox = null;
      let bsSortieBox = null;
      let bsTransportBox = null;

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
      const isBonEntreeDocType = (docTypeValue) =>
        String(docTypeValue || "").trim().toLowerCase() === "be";
      const isBonSortieDocType = (docTypeValue) =>
        String(docTypeValue || "").trim().toLowerCase() === "bs";
      const shouldUseVendorBox = (docTypeValue) => isPurchaseDocType(docTypeValue);
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
      const syncHeaderRowsForDocType = (docTypeValue) => {
        const isBonEntree = isBonEntreeDocType(docTypeValue);
        const isBonSortie = isBonSortieDocType(docTypeValue);
        const isStockMovement = isBonEntree || isBonSortie;
        const activeClientBox =
          rowTop.querySelector(CLIENT_BOX_SELECTOR) || bePartyRow.querySelector(CLIENT_BOX_SELECTOR);
        rowTop.classList.toggle("three", isStockMovement);
        rowTop.classList.toggle("two", !isStockMovement);
        rowTop.classList.toggle("items-options-modal__top-row--be", isBonEntree);
        rowTop.classList.toggle("items-options-modal__top-row--bs", isBonSortie);
        if (isBonSortie) {
          if (bsThirdColumn.parentNode !== rowTop) {
            rowTop.appendChild(bsThirdColumn);
          }
          bsThirdColumn.hidden = false;
          bsThirdColumn.setAttribute("aria-hidden", "false");
          bsThirdColumn.style.display = "";
        } else {
          if (bsThirdColumn.parentNode !== bePartyRow) {
            bePartyRow.appendChild(bsThirdColumn);
          }
          bsThirdColumn.hidden = true;
          bsThirdColumn.setAttribute("aria-hidden", "true");
          bsThirdColumn.style.display = "none";
        }
        if (activeClientBox) {
          if (isBonSortie) {
            if (activeClientBox.parentNode !== bsThirdColumn) {
              bsThirdColumn.insertBefore(activeClientBox, bsThirdColumn.firstChild || null);
            }
          } else if (activeClientBox.parentNode !== rowTop) {
            rowTop.appendChild(activeClientBox);
          }
        }
        if (beReceptionBox) {
          if (isBonEntree) {
            const clientReference =
              rowTop.querySelector(CLIENT_BOX_SELECTOR) || null;
            rowTop.insertBefore(beReceptionBox, clientReference);
          } else if (beReceptionBox.parentNode !== bePartyRow) {
            bePartyRow.appendChild(beReceptionBox);
          }
        }
        if (bsSortieBox) {
          if (isBonSortie) {
            const bsColumnReference = bsThirdColumn.parentNode === rowTop ? bsThirdColumn : null;
            rowTop.insertBefore(bsSortieBox, bsColumnReference);
          } else if (bsSortieBox.parentNode !== bePartyRow) {
            bePartyRow.appendChild(bsSortieBox);
          }
        }
        if (bsTransportBox) {
          if (isBonSortie) {
            if (activeClientBox && activeClientBox.parentNode === bsThirdColumn) {
              if (activeClientBox.nextSibling !== bsTransportBox) {
                bsThirdColumn.insertBefore(bsTransportBox, activeClientBox.nextSibling);
              }
            } else {
              bsThirdColumn.appendChild(bsTransportBox);
            }
          } else if (bsTransportBox.parentNode !== bePartyRow) {
            bePartyRow.appendChild(bsTransportBox);
          }
        }
        bePartyRow.hidden = true;
        bePartyRow.setAttribute("aria-hidden", "true");
      };
      syncItemsModalHeaderLayoutForDocType = syncHeaderRowsForDocType;
      const swapClientBoxForDocType = (docTypeValue) => {
        const targetBox = renderClientBox(docTypeValue);
        if (!targetBox) {
          syncHeaderRowsForDocType(docTypeValue);
          return;
        }
        const existing =
          rowTop.querySelector(CLIENT_BOX_SELECTOR) || bePartyRow.querySelector(CLIENT_BOX_SELECTOR);
        if (existing && existing.id === targetBox.id) {
          if (existing.parentNode !== rowTop) {
            rowTop.appendChild(existing);
          }
          syncHeaderRowsForDocType(docTypeValue);
          return;
        }
        const snapshot = snapshotClientBoxValues(existing);
        if (existing && existing.parentNode) {
          existing.parentNode.replaceChild(targetBox, existing);
        } else {
          rowTop.appendChild(targetBox);
        }
        applyClientBoxValues(targetBox, snapshot);
        wireClientBox(targetBox);
        syncHeaderRowsForDocType(docTypeValue);
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
        ensureItemsModalBeReceptionMeta(meta);
        ensureItemsModalBsSortieMeta(meta);
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
            syncItemsModalStockMovementBoxesFromState();
          });
          invDateInput.addEventListener("change", () => {
            meta.date = String(invDateInput.value || "").trim();
            updateNumberFromDate(docMetaBox);
            syncItemsModalStockMovementBoxesFromState();
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
          ensureItemsModalBeReceptionMeta(meta);
          ensureItemsModalBsSortieMeta(meta);
          if (typeof w.syncDocTypeMenuUi === "function") {
            w.syncDocTypeMenuUi(meta.docType, { updateSelect: true });
          }
          void applyNextNumberToDocMetaBox(docMetaBox);
          swapClientBoxForDocType(meta.docType);
          syncItemsModalStockMovementBoxesFromState();
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

      beReceptionBox = renderItemsModalBeReceptionBox();
      if (beReceptionBox) {
        wireItemsModalBeReceptionBox(beReceptionBox);
        bePartyRow.appendChild(beReceptionBox);
      }
      bsSortieBox = renderItemsModalBsSortieBox();
      if (bsSortieBox) {
        wireItemsModalBsSortieBox(bsSortieBox);
        bePartyRow.appendChild(bsSortieBox);
      }
      bsTransportBox = renderItemsModalBsTransportBox();
      if (bsTransportBox) {
        wireItemsModalBsTransportBox(bsTransportBox);
        bePartyRow.appendChild(bsTransportBox);
      }
      syncHeaderRowsForDocType(resolveDocTypeValue());

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
      fragment.appendChild(bePartyRow);
      if (rowBottom.childElementCount) fragment.appendChild(rowBottom);
      itemsDocOptionsModalContent.appendChild(fragment);
      syncHeaderRowsForDocType(resolveDocTypeValue());
      syncItemsModalStockMovementBoxesFromState();
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
        syncItemsModalStockMovementBoxesFromState();
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
        syncItemsModalStockMovementBoxesFromState();
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
      syncItemsModalBeRemarksFromState({ hydrateFromModel: true });
      syncItemsModalBsRemarksFromState({ hydrateFromModel: true });
      syncItemsModalStockMovementBoxesFromState();
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


