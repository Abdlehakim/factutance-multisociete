(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const CLIENT_LEDGER_PAGE_SIZE = 15;

  AppInit.registerClientLedgerActions = function registerClientLedgerActions() {
    const state = {
      button: null,
      modal: null,
      closeBtn: null,
      closeFooterBtn: null,
      list: null,
      filterClientInput: null,
      filterInvoiceInput: null,
      filterStartInput: null,
      filterEndInput: null,
      filterYearSelect: null,
      filterYearMenu: null,
      filterYearMenuToggle: null,
      filterYearDisplay: null,
      filterYearPanel: null,
      filterClear: null,
      totalDebit: null,
      totalCredit: null,
      prevBtn: null,
      nextBtn: null,
      pageLabel: null,
      pageInput: null,
      totalLabel: null,
      isOpen: false,
      previousFocus: null,
      listenersBound: false,
      page: 1,
      pageSize: CLIENT_LEDGER_PAGE_SIZE,
      entries: [],
      filtered: [],
      loading: false,
      error: "",
      paymentHistoryById: new Map(),
      paymentHistoryByInvoicePath: new Map(),
      invoiceNumberByPaymentId: new Map(),
      invoiceNumberByPath: new Map(),
      startDatePicker: null,
      endDatePicker: null,
      suppressHistoryRefresh: false,
      filters: {
        client: "",
        invoiceNumber: "",
        dateFrom: "",
        dateTo: "",
        year: String(new Date().getFullYear())
      }
    };

    const getElSafe = (id) =>
      typeof getEl === "function"
        ? getEl(id)
        : typeof document !== "undefined"
          ? document.getElementById(id)
          : null;

    const normalizeLookup = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const getCurrentYearValue = () => String(new Date().getFullYear());

    const normalizeYearValue = (value) => {
      const num = Number.parseInt(String(value || "").trim(), 10);
      if (!Number.isFinite(num) || num < 1900 || num > 9999) return "";
      return String(num);
    };

    const parseDayMonthParts = (value) => {
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

    const normalizeDayMonthValue = (value) => {
      const parsed = parseDayMonthParts(value);
      if (!parsed) return "";
      return `${parsed.day}-${parsed.month}`;
    };

    const isValidDateParts = (year, month, day) => {
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
      const candidate = new Date(year, month - 1, day);
      return (
        !Number.isNaN(candidate.getTime()) &&
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      );
    };

    const composeFilterIsoDate = (dayMonthValue, yearValue) => {
      const parsed = parseDayMonthParts(dayMonthValue);
      const year = normalizeYearValue(yearValue);
      if (!parsed || !year) return "";
      const yearNum = Number(year);
      const monthNum = Number(parsed.month);
      const dayNum = Number(parsed.day);
      if (!isValidDateParts(yearNum, monthNum, dayNum)) return "";
      return `${year}-${parsed.month}-${parsed.day}`;
    };

    const normalizeIsoDateValue = (value) => {
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

    const formatAmountValue = (value, precision = 3) => {
      const num = Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(num)) return "-";
      const scale = Math.pow(10, precision);
      const rounded = Math.round((num + Number.EPSILON) * scale) / scale;
      return rounded.toFixed(precision);
    };

    const formatDateValue = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "-";
      if (raw.includes("T")) return raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return "-";
      const date = new Date(parsed);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const resolveEntryEffectiveDate = (entry) => {
      const effective = formatDateValue(entry?.effectiveDate);
      if (effective !== "-") return effective;
      return formatDateValue(entry?.createdAt);
    };

    const resolveDateSortKey = (value) => {
      const normalized = formatDateValue(value);
      if (normalized === "-") return null;
      const parsed = Date.parse(`${normalized}T00:00:00.000Z`);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const formatPaymentModeLabel = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return "-";
      if (raw === "cash") return "Esp\u00e8ces";
      if (raw === "cash_deposit") return "Versement Esp\u00e8ces";
      if (raw === "cheque") return "Ch\u00e8que";
      if (raw === "bill_of_exchange") return "Effet";
      if (raw === "transfer") return "Virement";
      if (raw === "card") return "Carte bancaire";
      if (raw === "withholding_tax") return "Retenue \u00e0 la source";
      if (raw === "sold_client") return "Solde client";
      if (raw === "bank") return "D\u00e9p\u00f4t bancaire";
      return value;
    };

    const buildPaymentHistoryIndexes = (items) => {
      const byId = new Map();
      const byInvoicePath = new Map();
      const invoiceNumberByPaymentId = new Map();
      const toTimestamp = (entry) => {
        const primary = String(entry?.savedAt || entry?.paymentDate || "");
        const parsed = Date.parse(primary);
        if (Number.isFinite(parsed)) return parsed;
        return 0;
      };
      (Array.isArray(items) ? items : []).forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const id = String(entry.id || "").trim();
        if (id) byId.set(id, entry);
        const invoiceNumber = String(entry.invoiceNumber || "").trim();
        if (id && invoiceNumber && !/^sqlite:\/\//i.test(invoiceNumber)) {
          invoiceNumberByPaymentId.set(id, invoiceNumber);
        }
        const invoicePath = String(entry.invoicePath || "").trim();
        if (!invoicePath) return;
        if (!byInvoicePath.has(invoicePath)) {
          byInvoicePath.set(invoicePath, entry);
          return;
        }
        const existing = byInvoicePath.get(invoicePath);
        if (toTimestamp(entry) >= toTimestamp(existing)) {
          byInvoicePath.set(invoicePath, entry);
        }
      });
      return { byId, byInvoicePath, invoiceNumberByPaymentId };
    };

    const buildInvoiceNumberIndex = () => {
      const index = new Map();
      if (typeof w.getDocumentHistoryFull !== "function") return index;
      const entries = w.getDocumentHistoryFull("facture") || [];
      entries.forEach((entry) => {
        const path = String(entry?.path || "").trim();
        const number = String(entry?.number || entry?.name || "").trim();
        const date = String(entry?.date || "").trim();
        const key = number && date ? `${number}__${date}` : "";
        if (path && number && !index.has(path)) {
          index.set(path, number);
        }
        if (key && !index.has(key)) {
          index.set(key, number);
        }
      });
      return index;
    };

    const isDefaultYear = (value) => normalizeYearValue(value) === getCurrentYearValue();

    const hasFilters = () =>
      Boolean(state.filters.client.trim()) ||
      Boolean(state.filters.invoiceNumber.trim()) ||
      Boolean(state.filters.dateFrom.trim()) ||
      Boolean(state.filters.dateTo.trim()) ||
      !isDefaultYear(state.filters.year);

    const getYearFilterLabel = (value) => {
      if (!state.filterYearSelect) return "";
      const options = Array.from(state.filterYearSelect.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };

    const setYearMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.filterYearMenu) state.filterYearMenu.open = open;
      if (state.filterYearMenuToggle) {
        state.filterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };

    const syncYearMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!state.filterYearSelect) return "";
      const nextValue =
        value !== undefined
          ? normalizeYearValue(value)
          : normalizeYearValue(state.filterYearSelect.value);
      if (updateSelect) state.filterYearSelect.value = nextValue;
      if (state.filterYearDisplay) {
        state.filterYearDisplay.textContent = getYearFilterLabel(nextValue) || nextValue;
      }
      if (state.filterYearPanel) {
        state.filterYearPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = normalizeYearValue(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setYearMenuState(false);
      return nextValue;
    };

    const syncDatePickerFromState = () => {
      const selectedYear = normalizeYearValue(state.filters.year) || getCurrentYearValue();
      const fromDayMonth = normalizeDayMonthValue(state.filters.dateFrom);
      const toDayMonth = normalizeDayMonthValue(state.filters.dateTo);
      state.filters.dateFrom = fromDayMonth;
      state.filters.dateTo = toDayMonth;
      const fromIso = composeFilterIsoDate(fromDayMonth, selectedYear);
      const toIso = composeFilterIsoDate(toDayMonth, selectedYear);
      state.startDatePicker?.setValue(fromIso || "", { silent: true });
      state.endDatePicker?.setValue(toIso || "", { silent: true });
      if (state.filterStartInput) state.filterStartInput.value = fromDayMonth;
      if (state.filterEndInput) state.filterEndInput.value = toDayMonth;
    };

    const syncYearFilterOptions = (items = state.entries) => {
      if (!state.filterYearSelect) return;
      const parseYearNumber = (value) => {
        const normalized = normalizeYearValue(value);
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const currentYear = getCurrentYearValue();
      const selectedYearRaw = normalizeYearValue(state.filters.year) || currentYear;
      const selectedYearNum =
        parseYearNumber(selectedYearRaw) || parseYearNumber(currentYear) || new Date().getFullYear();
      const minEntryYearNum = (Array.isArray(items) ? items : [])
        .map((entry) => parseYearNumber(normalizeIsoDateValue(resolveEntryEffectiveDate(entry)).slice(0, 4)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum;
      const bottomYearNum = minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      state.filterYearSelect.innerHTML = "";
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        state.filterYearSelect.appendChild(option);
      });
      const nextYear = normalizeYearValue(state.filters.year) || currentYear;
      state.filters.year = nextYear;
      if (!years.includes(nextYear)) {
        const option = document.createElement("option");
        option.value = nextYear;
        option.textContent = nextYear;
        state.filterYearSelect.insertBefore(option, state.filterYearSelect.firstChild);
      }
      state.filterYearSelect.value = nextYear;
      if (state.filterYearPanel) {
        state.filterYearPanel.innerHTML = "";
        Array.from(state.filterYearSelect.options || []).forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const value = normalizeYearValue(opt?.value || "");
          const isActive = value === nextYear;
          btn.className = `model-select-option${isActive ? " is-active" : ""}`;
          btn.dataset.value = value;
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.textContent = String(opt?.textContent || opt?.label || value || "");
          state.filterYearPanel.appendChild(btn);
        });
      }
      syncYearMenuUi(nextYear);
      syncDatePickerFromState();
    };

    const wireYearFilterMenu = () => {
      if (
        !state.filterYearMenu ||
        !state.filterYearMenuToggle ||
        !state.filterYearPanel ||
        !state.filterYearSelect ||
        state.filterYearMenu.dataset.wired === "1"
      ) {
        return;
      }
      state.filterYearMenu.dataset.wired = "1";
      setYearMenuState(state.filterYearMenu.open);
      state.filterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizeYearValue(btn.dataset.value || "") || getCurrentYearValue();
        const changed = normalizeYearValue(state.filterYearSelect.value || "") !== nextValue;
        state.filterYearSelect.value = nextValue;
        if (changed) {
          state.filterYearSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncYearMenuUi(nextValue);
          state.filters.year = nextValue;
          state.page = 1;
          applyFilters();
        }
        setYearMenuState(false);
      });
      state.filterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setYearMenuState(!state.filterYearMenu.open);
        if (!state.filterYearMenu.open) state.filterYearMenuToggle.focus();
      });
      state.filterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setYearMenuState(false);
        state.filterYearMenuToggle.focus();
      });
      document.addEventListener("click", (evt) => {
        if (!state.filterYearMenu?.open) return;
        if (state.filterYearMenu.contains(evt.target)) return;
        setYearMenuState(false);
      });
      syncYearMenuUi(state.filterYearSelect.value);
    };

    const resolveLedgerHistoryEntry = (entry) => {
      const sourceType = String(entry?.source || "").trim().toLowerCase();
      const sourceId = String(entry?.sourceId || "").trim();
      const entryInvoicePath = String(entry?.invoicePath || "").trim();
      const resolvedSourceId =
        sourceType === "payment" ? sourceId : sourceId || entryInvoicePath;
      if (sourceType === "payment") {
        return state.paymentHistoryById.get(resolvedSourceId) || null;
      }
      if (sourceType === "invoice_payment") {
        return (
          state.paymentHistoryById.get(resolvedSourceId) ||
          state.paymentHistoryByInvoicePath.get(resolvedSourceId) ||
          null
        );
      }
      if (sourceType === "invoice" || sourceType === "invoice_unpaid") {
        return state.paymentHistoryByInvoicePath.get(resolvedSourceId) || null;
      }
      return null;
    };

    const resolveEntryInvoiceNumber = (entry) => {
      const sourceType = String(entry?.source || "").trim().toLowerCase();
      const sourceId = String(entry?.sourceId || "").trim();
      const entryInvoicePath = String(entry?.invoicePath || "").trim();
      const entryInvoiceNumber = String(entry?.invoiceNumber || "").trim();
      const historyEntry = resolveLedgerHistoryEntry(entry);
      let facture = "";
      if (sourceType === "payment" || sourceType === "invoice_payment") {
        const historyInvoicePath = String(historyEntry?.invoicePath || "").trim();
        facture =
          String(state.invoiceNumberByPaymentId.get(sourceId) || "").trim() ||
          String(historyEntry?.invoiceNumber || "").trim() ||
          String(state.invoiceNumberByPath.get(sourceId) || "").trim() ||
          String(state.invoiceNumberByPath.get(historyInvoicePath) || "").trim();
      } else {
        facture =
          entryInvoiceNumber ||
          String(historyEntry?.invoiceNumber || "").trim() ||
          String(state.invoiceNumberByPath.get(sourceId) || "").trim() ||
          String(state.invoiceNumberByPath.get(entryInvoicePath) || "").trim();
      }
      if (/^sqlite:\/\//i.test(facture)) return "";
      return facture;
    };

    const showLedgerError = async (message) => {
      const text = String(message || "Suppression impossible.");
      if (typeof w.showToast === "function") {
        w.showToast(text);
        return;
      }
      if (typeof w.showDialog === "function") {
        await w.showDialog(text, { title: "Releve clients" });
        return;
      }
      if (typeof window.alert === "function") window.alert(text);
    };

    const setTotals = (items) => {
      const totals = items.reduce(
        (acc, entry) => {
          const amount = Number(entry?.amount);
          if (!Number.isFinite(amount)) return acc;
          const type = String(entry?.type || "").trim().toLowerCase();
          if (type === "debit") acc.debit += amount;
          if (type === "credit") acc.credit += amount;
          return acc;
        },
        { debit: 0, credit: 0 }
      );
      if (state.totalDebit) state.totalDebit.textContent = formatAmountValue(totals.debit);
      if (state.totalCredit) state.totalCredit.textContent = formatAmountValue(totals.credit);
    };

    const updatePagination = (totalPages) => {
      const pages = Math.max(1, totalPages || 1);
      if (state.pageLabel) {
        state.pageLabel.setAttribute("aria-label", `Page ${state.page} sur ${pages}`);
      }
      if (state.pageInput) {
        state.pageInput.value = String(state.page);
        state.pageInput.max = String(pages);
        state.pageInput.setAttribute("aria-valuemax", String(pages));
        state.pageInput.setAttribute("aria-valuenow", String(state.page));
        state.pageInput.disabled = pages <= 1;
      }
      if (state.totalLabel) state.totalLabel.textContent = String(pages);
      if (state.prevBtn) state.prevBtn.disabled = state.page <= 1 || pages <= 1;
      if (state.nextBtn) state.nextBtn.disabled = state.page >= pages || pages <= 1;
      if (state.filterClear) state.filterClear.disabled = !hasFilters();
    };

    const filterEntries = (items) => {
      const clientQuery = normalizeLookup(state.filters.client);
      const invoiceQuery = normalizeLookup(state.filters.invoiceNumber);
      const selectedYear = normalizeYearValue(state.filters.year) || getCurrentYearValue();
      state.filters.year = selectedYear;
      const dateFromDayMonth = normalizeDayMonthValue(state.filters.dateFrom);
      const dateToDayMonth = normalizeDayMonthValue(state.filters.dateTo);
      const dateFrom = composeFilterIsoDate(dateFromDayMonth, selectedYear);
      const dateTo = composeFilterIsoDate(dateToDayMonth, selectedYear);
      return (Array.isArray(items) ? items : []).filter((entry) => {
        if (clientQuery) {
          const clientText = normalizeLookup(`${entry.clientName || ""}`);
          if (!clientText.includes(clientQuery)) return false;
        }
        if (invoiceQuery) {
          const invoiceText = normalizeLookup(resolveEntryInvoiceNumber(entry));
          if (!invoiceText.includes(invoiceQuery)) return false;
        }
        const entryDate = normalizeIsoDateValue(resolveEntryEffectiveDate(entry));
        if (!entryDate) return false;
        if (!entryDate.startsWith(`${selectedYear}-`)) return false;
        if (dateFrom && entryDate < dateFrom) return false;
        if (dateTo && entryDate > dateTo) return false;
        return true;
      });
    };

    const loadClientLedgerFromDb = async () => {
      if (!w.electronAPI?.readClientLedger) {
        throw new Error("Lecture du releve indisponible.");
      }
      const [ledgerRes, paymentHistoryRes] = await Promise.all([
        w.electronAPI.readClientLedger({}),
        w.electronAPI.readPaymentHistory ? w.electronAPI.readPaymentHistory() : Promise.resolve(null)
      ]);
      if (!ledgerRes?.ok) {
        throw new Error(ledgerRes?.error || "Chargement impossible.");
      }
      const items = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
      const paymentItems = Array.isArray(paymentHistoryRes?.items) ? paymentHistoryRes.items : [];
      const indexes = buildPaymentHistoryIndexes(paymentItems);
      state.paymentHistoryById = indexes.byId;
      state.paymentHistoryByInvoicePath = indexes.byInvoicePath;
      state.invoiceNumberByPaymentId = indexes.invoiceNumberByPaymentId;
      state.invoiceNumberByPath = buildInvoiceNumberIndex();
      return items;
    };

    const renderRows = (items) => {
      if (!state.list) return;
      state.list.innerHTML = "";
      if (state.loading) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = "Chargement...";
        row.appendChild(cell);
        state.list.appendChild(row);
        updatePagination(1);
        return;
      }
      if (state.error) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = state.error;
        row.appendChild(cell);
        state.list.appendChild(row);
        updatePagination(1);
        return;
      }
      if (!items.length) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = hasFilters()
          ? "Aucun releve ne correspond aux filtres."
          : "Aucun releve trouve.";
        row.appendChild(cell);
        state.list.appendChild(row);
        updatePagination(1);
        return;
      }

      const sortedItems = items.slice().sort((a, b) => {
        const aEffectiveDate = resolveDateSortKey(a?.effectiveDate || a?.createdAt || "");
        const bEffectiveDate = resolveDateSortKey(b?.effectiveDate || b?.createdAt || "");
        const aEffectiveValid = Number.isFinite(aEffectiveDate);
        const bEffectiveValid = Number.isFinite(bEffectiveDate);
        if (aEffectiveValid && bEffectiveValid && aEffectiveDate !== bEffectiveDate) {
          return bEffectiveDate - aEffectiveDate;
        }
        if (aEffectiveValid && !bEffectiveValid) return -1;
        if (!aEffectiveValid && bEffectiveValid) return 1;
        const aCreatedAt = Date.parse(String(a?.createdAt || ""));
        const bCreatedAt = Date.parse(String(b?.createdAt || ""));
        const aCreatedValid = Number.isFinite(aCreatedAt);
        const bCreatedValid = Number.isFinite(bCreatedAt);
        if (aCreatedValid && bCreatedValid && aCreatedAt !== bCreatedAt) {
          return bCreatedAt - aCreatedAt;
        }
        if (aCreatedValid && !bCreatedValid) return -1;
        if (!aCreatedValid && bCreatedValid) return 1;
        const aRowid = Number(a?.rowid);
        const bRowid = Number(b?.rowid);
        if (Number.isFinite(aRowid) && Number.isFinite(bRowid) && aRowid !== bRowid) {
          return bRowid - aRowid;
        }
        const aId = String(a?.id || "");
        const bId = String(b?.id || "");
        if (aId !== bId) return bId.localeCompare(aId);
        return 0;
      });

      const totalPages = Math.max(1, Math.ceil(sortedItems.length / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      updatePagination(totalPages);

      const startIdx = (state.page - 1) * state.pageSize;
      const slice = sortedItems.slice(startIdx, startIdx + state.pageSize);
      const fragment = document.createDocumentFragment();
      slice.forEach((entry) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.className = "payment-history__align-left";
        dateCell.textContent = resolveEntryEffectiveDate(entry);

        const sourceCell = document.createElement("td");
        sourceCell.className = "payment-history__align-center";
        const sourceType = String(entry.source || "").trim().toLowerCase();
        const historyEntry = resolveLedgerHistoryEntry(entry);
        const facture = resolveEntryInvoiceNumber(entry);
        sourceCell.textContent = facture;

        const clientCell = document.createElement("td");
        clientCell.textContent = entry.clientName || "N.R.";

        const modeCell = document.createElement("td");
        let modeValue = "";
        if (sourceType === "payment") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice_payment") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice") {
          modeValue = String(historyEntry?.mode || "").trim();
        } else if (sourceType === "invoice_unpaid") {
          modeValue = "";
        }
        modeCell.textContent = modeValue ? formatPaymentModeLabel(modeValue) : "";

        const paymentRefCell = document.createElement("td");
        paymentRefCell.className = "payment-history__align-center";
        let paymentRefLabel = "";
        if (
          sourceType === "payment" ||
          sourceType === "invoice_payment" ||
          sourceType === "invoice"
        ) {
          paymentRefLabel = String(
            historyEntry?.paymentRef || historyEntry?.paymentReference || ""
          ).trim();
        }
        paymentRefCell.textContent = paymentRefLabel;

        const debitCell = document.createElement("td");
        debitCell.className = "num";
        debitCell.textContent =
          String(entry.type || "").toLowerCase() === "debit"
            ? formatAmountValue(entry.amount)
            : "-";

        const creditCell = document.createElement("td");
        creditCell.className = "num";
        creditCell.textContent =
          String(entry.type || "").toLowerCase() === "credit"
            ? formatAmountValue(entry.amount)
            : "-";

        const actionCell = document.createElement("td");
        actionCell.className = "payment-history__align-center";
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "payment-history__copy payment-history__delete";
        deleteBtn.setAttribute("aria-label", "Supprimer l'operation");
        deleteBtn.title = "Supprimer l'operation";
        deleteBtn.dataset.ledgerDeleteId = String(entry.id || "").trim();
        deleteBtn.innerHTML =
          '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5z"></path></svg>';
        if (!deleteBtn.dataset.ledgerDeleteId) deleteBtn.disabled = true;
        actionCell.appendChild(deleteBtn);

        row.append(
          dateCell,
          sourceCell,
          clientCell,
          paymentRefCell,
          modeCell,
          debitCell,
          creditCell,
          actionCell
        );
        fragment.appendChild(row);
      });
      state.list.appendChild(fragment);
    };

    const applyFilters = () => {
      const filtered = filterEntries(state.entries);
      state.filtered = filtered;
      setTotals(filtered);
      renderRows(filtered);
    };

    const fetchLedger = async () => {
      if (!w.electronAPI?.readClientLedger) {
        state.error = "Lecture du releve indisponible.";
        state.loading = false;
        applyFilters();
        return;
      }
      state.loading = true;
      state.error = "";
      renderRows([]);
      try {
        const selectedYear = normalizeYearValue(state.filters.year) || getCurrentYearValue();
        const payloadDateFrom = composeFilterIsoDate(state.filters.dateFrom, selectedYear);
        const payloadDateTo = composeFilterIsoDate(state.filters.dateTo, selectedYear);
        const payload = {
          dateFrom: payloadDateFrom,
          dateTo: payloadDateTo
        };
        const [ledgerRes, paymentHistoryRes] = await Promise.all([
          w.electronAPI.readClientLedger(payload),
          w.electronAPI.readPaymentHistory ? w.electronAPI.readPaymentHistory() : Promise.resolve(null)
        ]);
        if (!ledgerRes?.ok) {
          state.error = ledgerRes?.error || "Chargement impossible.";
          state.entries = [];
        } else {
          state.entries = Array.isArray(ledgerRes.items) ? ledgerRes.items : [];
        }
        const paymentItems = Array.isArray(paymentHistoryRes?.items) ? paymentHistoryRes.items : [];
        const indexes = buildPaymentHistoryIndexes(paymentItems);
        state.paymentHistoryById = indexes.byId;
        state.paymentHistoryByInvoicePath = indexes.byInvoicePath;
        state.invoiceNumberByPaymentId = indexes.invoiceNumberByPaymentId;
        state.invoiceNumberByPath = buildInvoiceNumberIndex();
      } catch (err) {
        state.error = "Chargement impossible.";
        state.entries = [];
        state.paymentHistoryById = new Map();
        state.paymentHistoryByInvoicePath = new Map();
        state.invoiceNumberByPaymentId = new Map();
        state.invoiceNumberByPath = new Map();
      } finally {
        state.loading = false;
        syncYearFilterOptions(state.entries);
        applyFilters();
      }
    };

    const openModal = () => {
      if (!state.modal || state.isOpen) return;
      state.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      state.modal.hidden = false;
      state.modal.removeAttribute("hidden");
      state.modal.setAttribute("aria-hidden", "false");
      state.modal.classList.add("is-open");
      state.isOpen = true;
      state.page = 1;
      state.entries = [];
      state.filtered = [];
      state.error = "";
      state.filters.client = String(state.filterClientInput?.value || "").trim();
      state.filters.invoiceNumber = String(state.filterInvoiceInput?.value || "").trim();
      state.filters.dateFrom = normalizeDayMonthValue(state.filterStartInput?.value || "");
      state.filters.dateTo = normalizeDayMonthValue(state.filterEndInput?.value || "");
      state.filters.year =
        normalizeYearValue(state.filterYearSelect?.value || "") || getCurrentYearValue();
      syncYearFilterOptions(state.entries);
      fetchLedger();
      const focusTarget = state.filterClientInput || state.closeBtn;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    };

    const closeModal = () => {
      if (!state.modal || !state.isOpen) return;
      setYearMenuState(false);
      state.startDatePicker?.close?.();
      state.endDatePicker?.close?.();
      state.modal.classList.remove("is-open");
      state.modal.hidden = true;
      state.modal.setAttribute("hidden", "");
      state.modal.setAttribute("aria-hidden", "true");
      state.isOpen = false;
      if (state.previousFocus && typeof state.previousFocus.focus === "function") {
        try {
          state.previousFocus.focus();
        } catch {}
      }
    };

    const bindListeners = () => {
      if (state.listenersBound) return;
      state.button = getElSafe("btnClientLedger");
      state.modal = getElSafe("clientLedgerModal");
      if (!state.button || !state.modal) return;

      state.closeBtn = getElSafe("clientLedgerClose");
      state.closeFooterBtn = getElSafe("clientLedgerCloseFooter");
      state.list = getElSafe("clientLedgerList");
      state.filterClientInput = getElSafe("clientLedgerFilterClient");
      state.filterInvoiceInput = getElSafe("clientLedgerFilterInvoiceNumber");
      state.filterStartInput = getElSafe("clientLedgerFilterStart");
      state.filterEndInput = getElSafe("clientLedgerFilterEnd");
      state.filterYearSelect = getElSafe("clientLedgerFilterYear");
      state.filterYearMenu = getElSafe("clientLedgerFilterYearMenu");
      state.filterYearMenuToggle = state.filterYearMenu?.querySelector("summary") || null;
      state.filterYearDisplay = getElSafe("clientLedgerFilterYearDisplay");
      state.filterYearPanel = getElSafe("clientLedgerFilterYearPanel");
      state.filterClear = getElSafe("clientLedgerFilterClear");
      state.totalDebit = getElSafe("clientLedgerTotalDebit");
      state.totalCredit = getElSafe("clientLedgerTotalCredit");
      state.prevBtn = getElSafe("clientLedgerPrev");
      state.nextBtn = getElSafe("clientLedgerNext");
      state.pageLabel = getElSafe("clientLedgerPage");
      state.pageInput = getElSafe("clientLedgerPageInput");
      state.totalLabel = getElSafe("clientLedgerTotalPages");

      state.button?.addEventListener("click", openModal);
      state.closeBtn?.addEventListener("click", closeModal);
      state.closeFooterBtn?.addEventListener("click", closeModal);
      state.modal?.addEventListener("click", (evt) => {
        if (evt.target === state.modal) evt.stopPropagation();
      });

      const onFilterInput = () => {
        state.filters.client = String(state.filterClientInput?.value || "").trim();
        state.filters.invoiceNumber = String(state.filterInvoiceInput?.value || "").trim();
        state.filters.dateFrom = normalizeDayMonthValue(state.filterStartInput?.value || "");
        state.filters.dateTo = normalizeDayMonthValue(state.filterEndInput?.value || "");
        state.filters.year =
          normalizeYearValue(state.filterYearSelect?.value || "") || getCurrentYearValue();
        if (state.filterStartInput) state.filterStartInput.value = state.filters.dateFrom;
        if (state.filterEndInput) state.filterEndInput.value = state.filters.dateTo;
        syncYearMenuUi(state.filters.year, { updateSelect: true });
        syncDatePickerFromState();
        state.page = 1;
        applyFilters();
      };
      state.filterClientInput?.addEventListener("input", onFilterInput);
      state.filterInvoiceInput?.addEventListener("input", onFilterInput);
      state.filterStartInput?.addEventListener("input", onFilterInput);
      state.filterEndInput?.addEventListener("input", onFilterInput);
      state.filterYearSelect?.addEventListener("change", onFilterInput);
      state.filterClear?.addEventListener("click", () => {
        state.filters.client = "";
        state.filters.invoiceNumber = "";
        state.filters.dateFrom = "";
        state.filters.dateTo = "";
        state.filters.year = getCurrentYearValue();
        if (state.filterClientInput) state.filterClientInput.value = "";
        if (state.filterInvoiceInput) state.filterInvoiceInput.value = "";
        if (state.filterStartInput) state.filterStartInput.value = "";
        if (state.filterEndInput) state.filterEndInput.value = "";
        syncYearFilterOptions(state.entries);
        syncYearMenuUi(state.filters.year, { updateSelect: true, closeMenu: true });
        syncDatePickerFromState();
        state.page = 1;
        applyFilters();
      });
      state.list?.addEventListener("click", async (evt) => {
        const deleteBtn = evt.target.closest("button[data-ledger-delete-id]");
        if (!deleteBtn) return;
        evt.preventDefault();
        const ledgerId = String(deleteBtn.dataset.ledgerDeleteId || "").trim();
        if (!ledgerId) return;
        let confirmed = true;
        if (typeof w.showConfirm === "function") {
          try {
            confirmed = await w.showConfirm("Supprimer cette operation ?", {
              title: "Releve clients",
              okText: "Supprimer",
              cancelText: "Annuler"
            });
          } catch {
            confirmed = true;
          }
        } else if (typeof window.confirm === "function") {
          confirmed = window.confirm("Supprimer cette operation ?");
        }
        if (!confirmed) return;
        state.suppressHistoryRefresh = true;
        try {
          if (!w.electronAPI?.deleteClientLedgerEntry) {
            throw new Error("Suppression indisponible.");
          }
          const deleteRes = await w.electronAPI.deleteClientLedgerEntry({ id: ledgerId });
          if (!deleteRes?.ok) {
            throw new Error(deleteRes?.error || "Suppression impossible.");
          }
          const freshRows = await loadClientLedgerFromDb();
          state.entries = freshRows;
          const filtered = filterEntries(freshRows);
          state.filtered = filtered;
          setTotals(filtered);
          renderRows(filtered);
        } catch (err) {
          await showLedgerError(err?.message || err);
        } finally {
          state.suppressHistoryRefresh = false;
        }
      });

      state.prevBtn?.addEventListener("click", () => {
        if (state.page > 1) {
          state.page -= 1;
          renderRows(state.filtered);
        }
      });
      state.nextBtn?.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
        if (state.page < totalPages) {
          state.page += 1;
          renderRows(state.filtered);
        }
      });
      state.pageInput?.addEventListener("change", (evt) => {
        const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
        const nextValue = Number(evt.target?.value || "");
        if (!Number.isFinite(nextValue)) return;
        const nextPage = Math.min(totalPages, Math.max(1, Math.floor(nextValue)));
        state.page = nextPage;
        renderRows(state.filtered);
      });
      state.pageInput?.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          state.pageInput?.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      if (state.filterStartInput && w.AppDatePicker?.create) {
        state.startDatePicker = w.AppDatePicker.create(state.filterStartInput, {
          allowManualInput: false,
          onChange(value) {
            state.filters.dateFrom = normalizeDayMonthValue(value);
            if (state.filterStartInput) {
              state.filterStartInput.value = state.filters.dateFrom || "";
            }
            state.page = 1;
            applyFilters();
          }
        });
      }
      if (state.filterEndInput && w.AppDatePicker?.create) {
        state.endDatePicker = w.AppDatePicker.create(state.filterEndInput, {
          allowManualInput: false,
          onChange(value) {
            state.filters.dateTo = normalizeDayMonthValue(value);
            if (state.filterEndInput) {
              state.filterEndInput.value = state.filters.dateTo || "";
            }
            state.page = 1;
            applyFilters();
          }
        });
      }

      document.addEventListener("keydown", (evt) => {
        if (!state.isOpen) return;
        if (evt.key === "Escape") {
          if (state.filterYearMenu?.open) {
            evt.preventDefault();
            setYearMenuState(false);
            try {
              state.filterYearMenuToggle?.focus?.();
            } catch {}
            return;
          }
          evt.preventDefault();
          closeModal();
        }
      });

      syncYearFilterOptions(state.entries);
      wireYearFilterMenu();

      state.listenersBound = true;
    };

    const boot = () => {
      bindListeners();
      if (state.listenersBound) return;
      let attempts = 0;
      const retry = () => {
        if (state.listenersBound) return;
        attempts += 1;
        bindListeners();
        if (!state.listenersBound && attempts < 10) {
          setTimeout(retry, 200);
        }
      };
      setTimeout(retry, 200);
    };

    window.addEventListener("client-sold-updated", () => {
      if (state.suppressHistoryRefresh) return;
      if (state.isOpen) fetchLedger();
    });
    window.addEventListener("payment-history-updated", () => {
      if (state.suppressHistoryRefresh) return;
      if (state.isOpen) fetchLedger();
    });

    boot();
  };
})(window);
