(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerClientStatementsActions = function registerClientStatementsActions() {
    const state = {
      button: null,
      reportButton: null,
      modal: null,
      closeBtn: null,
      closeFooterBtn: null,
      list: null,
      filterClientInput: null,
      filterSoldSelect: null,
      filterSoldMenu: null,
      filterSoldMenuToggle: null,
      filterSoldMenuDisplay: null,
      filterSoldMenuPanel: null,
      filterYearSelect: null,
      filterYearMenu: null,
      filterYearMenuToggle: null,
      filterYearDisplay: null,
      filterYearPanel: null,
      filterStartInput: null,
      filterEndInput: null,
      filterClear: null,
      totalDebit: null,
      totalCredit: null,
      totalSold: null,
      prevBtn: null,
      nextBtn: null,
      pageLabel: null,
      pageInput: null,
      totalLabel: null,
      isOpen: false,
      previousFocus: null,
      listenersBound: false,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      data: [],
      rows: [],
      loading: false,
      error: "",
      refreshTimer: null,
      ledgerEntries: [],
      paymentHistoryById: new Map(),
      paymentHistoryByInvoicePath: new Map(),
      startDatePicker: null,
      endDatePicker: null,
      filters: {
        client: "",
        sold: "",
        dateFrom: "",
        dateTo: "",
        year: String(new Date().getFullYear())
      }
    };

    const copyTextToClipboard = async (text) => {
      const value = String(text || "").trim();
      if (!value) return false;
      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          return true;
        } catch {}
      }
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand && document.execCommand("copy");
        textarea.remove();
        return !!ok;
      } catch {
        return false;
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

    const getSoldFilterLabel = (value) => {
      if (!state.filterSoldSelect) return "";
      const options = Array.from(state.filterSoldSelect.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };

    const getSoldFilterPlaceholder = () => getSoldFilterLabel("") || "Tous les soldes";

    const setSoldFilterMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.filterSoldMenu) state.filterSoldMenu.open = open;
      if (state.filterSoldMenuToggle) {
        state.filterSoldMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };

    const syncSoldFilterMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!state.filterSoldSelect) return "";
      const nextValue =
        value !== undefined
          ? String(value || "")
          : String(state.filterSoldSelect.value || "");
      if (updateSelect) state.filterSoldSelect.value = nextValue;
      if (state.filterSoldMenuDisplay) {
        state.filterSoldMenuDisplay.textContent =
          getSoldFilterLabel(nextValue) || getSoldFilterPlaceholder();
      }
      if (state.filterSoldMenuPanel) {
        state.filterSoldMenuPanel
          .querySelectorAll(".model-select-option")
          .forEach((btn) => {
            const isActive = String(btn.dataset.value || "") === nextValue;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
      }
      if (closeMenu) setSoldFilterMenuState(false);
      return nextValue;
    };

    const wireSoldFilterMenu = (onFilterChange) => {
      if (
        !state.filterSoldMenu ||
        !state.filterSoldMenuToggle ||
        !state.filterSoldMenuPanel ||
        !state.filterSoldSelect ||
        state.filterSoldMenu.dataset.wired === "1"
      ) {
        return;
      }
      state.filterSoldMenu.dataset.wired = "1";
      setSoldFilterMenuState(state.filterSoldMenu.open);

      state.filterSoldSelect.addEventListener("change", () => {
        syncSoldFilterMenuUi(state.filterSoldSelect.value);
        if (typeof onFilterChange === "function") onFilterChange();
      });

      state.filterSoldMenuPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = String(btn.dataset.value || "");
        const changed = state.filterSoldSelect.value !== nextValue;
        state.filterSoldSelect.value = nextValue;
        if (changed) {
          state.filterSoldSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncSoldFilterMenuUi(nextValue);
          if (typeof onFilterChange === "function") onFilterChange();
        }
        setSoldFilterMenuState(false);
      });

      state.filterSoldMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setSoldFilterMenuState(!state.filterSoldMenu.open);
        if (!state.filterSoldMenu.open) state.filterSoldMenuToggle.focus();
      });

      state.filterSoldMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setSoldFilterMenuState(false);
        state.filterSoldMenuToggle.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!state.filterSoldMenu?.open) return;
        if (state.filterSoldMenu.contains(evt.target)) return;
        setSoldFilterMenuState(false);
      });

      syncSoldFilterMenuUi(state.filterSoldSelect.value);
    };

    const isDefaultYear = (value) => normalizeYearValue(value) === getCurrentYearValue();

    const getYearFilterLabel = (value) => {
      if (!state.filterYearSelect) return "";
      const options = Array.from(state.filterYearSelect.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };

    const setYearFilterMenuState = (isOpen) => {
      const open = !!isOpen;
      if (state.filterYearMenu) state.filterYearMenu.open = open;
      if (state.filterYearMenuToggle) {
        state.filterYearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };

    const syncYearFilterMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
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
        state.filterYearPanel
          .querySelectorAll(".model-select-option")
          .forEach((btn) => {
            const isActive = normalizeYearValue(btn.dataset.value || "") === nextValue;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
      }
      if (closeMenu) setYearFilterMenuState(false);
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

    const syncYearFilterOptions = (entries = state.ledgerEntries) => {
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
      const minEntryYearNum = (Array.isArray(entries) ? entries : [])
        .map((entry) =>
          parseYearNumber(
            normalizeLedgerDate(entry?.effectiveDate || entry?.createdAt).slice(0, 4)
          )
        )
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
      syncYearFilterMenuUi(nextYear);
      syncDatePickerFromState();
    };

    const wireYearFilterMenu = (onFilterChange) => {
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
      setYearFilterMenuState(state.filterYearMenu.open);

      state.filterYearSelect.addEventListener("change", () => {
        const nextYear =
          normalizeYearValue(state.filterYearSelect.value || "") || getCurrentYearValue();
        state.filterYearSelect.value = nextYear;
        state.filters.year = nextYear;
        syncYearFilterMenuUi(nextYear);
        syncDatePickerFromState();
        if (typeof onFilterChange === "function") onFilterChange();
      });

      state.filterYearPanel.addEventListener("click", (evt) => {
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = normalizeYearValue(btn.dataset.value || "") || getCurrentYearValue();
        const changed = normalizeYearValue(state.filterYearSelect.value || "") !== nextValue;
        state.filterYearSelect.value = nextValue;
        if (changed) {
          state.filterYearSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncYearFilterMenuUi(nextValue);
          state.filters.year = nextValue;
          syncDatePickerFromState();
          if (typeof onFilterChange === "function") onFilterChange();
        }
        setYearFilterMenuState(false);
      });

      state.filterYearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        setYearFilterMenuState(!state.filterYearMenu.open);
        if (!state.filterYearMenu.open) state.filterYearMenuToggle.focus();
      });

      state.filterYearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setYearFilterMenuState(false);
        state.filterYearMenuToggle.focus();
      });

      document.addEventListener("click", (evt) => {
        if (!state.filterYearMenu?.open) return;
        if (state.filterYearMenu.contains(evt.target)) return;
        setYearFilterMenuState(false);
      });

      syncYearFilterMenuUi(state.filterYearSelect.value);
    };

    const parseBalanceValue = (value) => {
      const cleaned = String(value ?? "").replace(",", ".").trim();
      if (!cleaned) return null;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    };

    const formatBalanceValue = (value, precision = 3) => {
      if (!Number.isFinite(value)) return "-";
      const scale = Math.pow(10, precision);
      const rounded = Math.round((value + Number.EPSILON) * scale) / scale;
      return rounded.toFixed(precision);
    };

    const formatDateValue = (ms) => {
      const ts = Number(ms);
      if (!Number.isFinite(ts) || ts <= 0) return "";
      const date = new Date(ts);
      if (Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const normalizeLedgerDate = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (raw.includes("T")) return raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return "";
      const date = new Date(parsed);
      if (Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const isSoldClientMode = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return false;
      return raw === "sold_client" || raw === "solde client";
    };

    const buildPaymentHistoryIndexes = (items) => {
      const byId = new Map();
      const byInvoicePath = new Map();
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
      return { byId, byInvoicePath };
    };

    const isLedgerSoldClientMode = (entry) => {
      const sourceType = String(entry?.source || "").trim().toLowerCase();
      const sourceId = String(entry?.sourceId || "").trim();
      const historyEntry =
        sourceType === "payment"
          ? state.paymentHistoryById.get(sourceId)
          : sourceType === "invoice" ||
              sourceType === "invoice_payment" ||
              sourceType === "invoice_unpaid"
            ? state.paymentHistoryByInvoicePath.get(sourceId)
            : null;
      const rawMode =
        historyEntry?.mode ||
        (sourceType === "invoice" ||
        sourceType === "invoice_payment" ||
        sourceType === "invoice_unpaid"
          ? "sold_client"
          : "");
      return isSoldClientMode(rawMode);
    };

    const resolveClientRow = (record) => {
      const client = record?.client && typeof record.client === "object" ? record.client : record || {};
      const name = String(record?.name || client.name || "").trim();
      const account = String(client.account || client.accountOf || record.account || record.accountOf || "").trim();
      const identifier = String(
        record?.identifier ||
          client.vat ||
          client.identifiantFiscal ||
          client.cin ||
          client.passport ||
          client.email ||
          client.phone ||
          ""
      ).trim();
      const soldRaw = client.soldClient ?? record.soldClient ?? "";
      const rawFactureCount = record?.factureCount ?? client.factureCount ?? 0;
      const factureCount = Number.isFinite(Number(rawFactureCount)) ? Number(rawFactureCount) : 0;
      const soldValue = parseBalanceValue(soldRaw);
      const soldText = soldValue === null ? "-" : formatBalanceValue(soldValue);
      const dateText = formatDateValue(record?.modifiedMs);
      return {
        id: record?.id || client?.id || record?.clientId || "",
        name: name || "Sans nom",
        account,
        identifier,
        soldValue,
        soldText,
        factureCount,
        dateText
      };
    };

    const hasFilters = () => {
      return (
        Boolean(state.filters.client.trim()) ||
        Boolean(state.filters.sold.trim()) ||
        Boolean(state.filters.dateFrom.trim()) ||
        Boolean(state.filters.dateTo.trim()) ||
        !isDefaultYear(state.filters.year)
      );
    };

    const computeClientSoldValue = (item, ledgerTotals) => {
      const totals = ledgerTotals?.get(item.id);
      if (totals) {
        return Number(totals.credit || 0) - Number(totals.debit || 0);
      }
      return Number(item?.soldValue);
    };

    const matchesFilter = (item, ledgerTotals) => {
      const clientQuery = normalizeLookup(state.filters.client);
      if (clientQuery) {
        const clientText = normalizeLookup(`${item.name} ${item.account} ${item.identifier}`);
        if (!clientText.includes(clientQuery)) return false;
      }
      const soldFilter = String(state.filters.sold || "").trim().toLowerCase();
      if (soldFilter) {
        const soldValue = computeClientSoldValue(item, ledgerTotals);
        if (!Number.isFinite(soldValue)) return false;
        const epsilon = 0.0005;
        if (soldFilter === "eq0" && Math.abs(soldValue) > epsilon) return false;
        if (soldFilter === "lt0" && soldValue >= -epsilon) return false;
        if (soldFilter === "gt0" && soldValue <= epsilon) return false;
      }
      const hasTemporalFilter =
        Boolean(normalizeDayMonthValue(state.filters.dateFrom)) ||
        Boolean(normalizeDayMonthValue(state.filters.dateTo)) ||
        Boolean(normalizeYearValue(state.filters.year));
      if (hasTemporalFilter) {
        const totals = ledgerTotals?.get(item.id);
        const hasMovement =
          totals && (Number(totals.debit) > 0 || Number(totals.credit) > 0);
        if (!hasMovement) return false;
      }
      return true;
    };

    const setPage = (value, totalPages) => {
      const normalized = Math.max(1, Math.min(totalPages, Math.floor(value)));
      if (normalized === state.page) return false;
      state.page = normalized;
      return true;
    };

    const updatePagination = (totalPages) => {
      const prevBtn = state.prevBtn;
      const nextBtn = state.nextBtn;
      const pageLabel = state.pageLabel;
      const pageInput = state.pageInput;
      const totalLabel = state.totalLabel;
      const pages = Math.max(1, totalPages || 1);
      if (pageLabel) {
        pageLabel.setAttribute("aria-label", `Page ${state.page} sur ${pages}`);
      }
      if (pageInput) {
        pageInput.value = String(state.page);
        pageInput.max = String(pages);
        pageInput.setAttribute("aria-valuemax", String(pages));
        pageInput.setAttribute("aria-valuenow", String(state.page));
        pageInput.disabled = pages <= 1;
      }
      if (totalLabel) totalLabel.textContent = String(pages);
      if (prevBtn) prevBtn.disabled = state.page <= 1 || pages <= 1;
      if (nextBtn) nextBtn.disabled = state.page >= pages || pages <= 1;
      if (state.filterClear) {
        state.filterClear.disabled = !hasFilters();
      }
    };

    const setTotals = (items) => {
      const totals = (Array.isArray(items) ? items : []).reduce(
        (acc, item) => {
          const debitValue = Number(item?.totalDebit);
          const creditValue = Number(item?.totalCredit);
          if (Number.isFinite(debitValue)) acc.debit += debitValue;
          if (Number.isFinite(creditValue)) acc.credit += creditValue;
          return acc;
        },
        { debit: 0, credit: 0 }
      );
      const soldTotal = totals.credit - totals.debit;
      if (state.totalDebit) state.totalDebit.textContent = formatBalanceValue(totals.debit);
      if (state.totalCredit) state.totalCredit.textContent = formatBalanceValue(totals.credit);
      if (state.totalSold) state.totalSold.textContent = formatBalanceValue(soldTotal);
    };

    const renderStatements = () => {
      if (!state.list) return;
      state.list.innerHTML = "";
      if (state.loading) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "Chargement...";
        row.appendChild(cell);
        state.list.appendChild(row);
        setTotals([]);
        updatePagination(1);
        return;
      }
      if (state.error) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = state.error;
        row.appendChild(cell);
        state.list.appendChild(row);
        setTotals([]);
        updatePagination(1);
        return;
      }
      const selectedYear = normalizeYearValue(state.filters.year) || getCurrentYearValue();
      state.filters.year = selectedYear;
      const dateFromDayMonth = normalizeDayMonthValue(state.filters.dateFrom);
      const dateToDayMonth = normalizeDayMonthValue(state.filters.dateTo);
      state.filters.dateFrom = dateFromDayMonth;
      state.filters.dateTo = dateToDayMonth;
      const dateFrom = composeFilterIsoDate(dateFromDayMonth, selectedYear);
      const dateTo = composeFilterIsoDate(dateToDayMonth, selectedYear);
      const ledgerTotals = buildLedgerTotals(state.ledgerEntries, {
        dateFrom,
        dateTo,
        year: selectedYear
      });
      const filtered = Array.isArray(state.rows)
        ? state.rows.filter((item) => matchesFilter(item, ledgerTotals))
        : [];
      if (!filtered.length) {
        const row = document.createElement("tr");
        row.className = "payments-panel__empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "Aucun client.";
        row.appendChild(cell);
        state.list.appendChild(row);
        setTotals([]);
        updatePagination(1);
        return;
      }
      const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      state.totalPages = totalPages;
      const start = (state.page - 1) * state.pageSize;
      const pageItems = filtered.slice(start, start + state.pageSize);
      pageItems.forEach((item) => {
        const totals = ledgerTotals.get(item.id) || { debit: 0, credit: 0 };
        item.totalDebit = totals.debit;
        item.totalCredit = totals.credit;
        const soldValue = Number(totals.credit || 0) - Number(totals.debit || 0);
        item.soldValue = soldValue;
        item.soldText = Number.isFinite(soldValue) ? formatBalanceValue(soldValue) : "-";
      });
      setTotals(pageItems);
      pageItems.forEach((item) => {
        const row = document.createElement("tr");

        const clientCell = document.createElement("td");
        clientCell.className = "credit-clients__client-cell";
        const clientWrap = document.createElement("div");
        clientWrap.className = "credit-clients__client-lines";
        const addLine = (label, value, copyLabel) => {
          const line = document.createElement("div");
          line.className = "payment-modal__invoice-number";
          const text = document.createElement("span");
          text.textContent = `${label} : ${value}`;
          if (copyLabel) {
            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "payment-modal__amount-transfer payment-modal__copy";
            copyBtn.setAttribute("aria-label", copyLabel);
            copyBtn.title = copyLabel;
            copyBtn.dataset.creditCopy = "client";
            copyBtn.dataset.creditCopyValue = value;
            copyBtn.innerHTML =
              '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/></svg>';
            if (!value) copyBtn.disabled = true;
            line.append(text, copyBtn);
          } else {
            line.appendChild(text);
          }
          clientWrap.appendChild(line);
        };
        const clientNameValue = String(item.name || "").trim() || "Sans nom";
        const clientAccountValue = String(item.account || "").trim();
        addLine("Client", clientNameValue, "Copier le client");
        if (clientAccountValue) {
          addLine("Pour le compte de", clientAccountValue);
        }
        clientCell.appendChild(clientWrap);

        const debitCell = document.createElement("td");
        debitCell.className = "num";
        debitCell.textContent = Number.isFinite(Number(item.totalDebit))
          ? formatBalanceValue(item.totalDebit)
          : "-";

        const creditCell = document.createElement("td");
        creditCell.className = "num";
        creditCell.textContent = Number.isFinite(Number(item.totalCredit))
          ? formatBalanceValue(item.totalCredit)
          : "-";

        const soldCell = document.createElement("td");
        soldCell.className = "num";
        soldCell.textContent = item.soldText;

        row.append(clientCell, debitCell, creditCell, soldCell);
        state.list.appendChild(row);
      });
      updatePagination(totalPages);
    };

    const buildLedgerTotals = (entries, { dateFrom, dateTo, year } = {}) => {
      const totals = new Map();
      const normalizedFrom = String(dateFrom || "").trim();
      const normalizedTo = String(dateTo || "").trim();
      const selectedYear = normalizeYearValue(year) || getCurrentYearValue();
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        const clientId = String(entry?.clientId || "").trim();
        if (!clientId) return;
        const entryDate = normalizeLedgerDate(entry?.effectiveDate || entry?.createdAt);
        if (!entryDate) return;
        if (!entryDate.startsWith(`${selectedYear}-`)) return;
        if (normalizedFrom && entryDate < normalizedFrom) return;
        if (normalizedTo && entryDate > normalizedTo) return;
        const amount = Number(entry?.amount);
        if (!Number.isFinite(amount)) return;
        const type = String(entry?.type || "").trim().toLowerCase();
        if (type !== "credit" && type !== "debit") return;
        const bucket = totals.get(clientId) || { debit: 0, credit: 0 };
        if (type === "debit") bucket.debit += amount;
        if (type === "credit") bucket.credit += amount;
        totals.set(clientId, bucket);
      });
      return totals;
    };

    const loadClientStatements = async () => {
      if (w.electronAPI?.readClientLedger) {
        try {
          const [ledgerRes, paymentHistoryRes] = await Promise.all([
            w.electronAPI.readClientLedger({}),
            w.electronAPI.readPaymentHistory ? w.electronAPI.readPaymentHistory() : Promise.resolve(null)
          ]);
          state.ledgerEntries = Array.isArray(ledgerRes?.items) ? ledgerRes.items : [];
          const paymentItems = Array.isArray(paymentHistoryRes?.items) ? paymentHistoryRes.items : [];
          const indexes = buildPaymentHistoryIndexes(paymentItems);
          state.paymentHistoryById = indexes.byId;
          state.paymentHistoryByInvoicePath = indexes.byInvoicePath;
        } catch {
          state.ledgerEntries = [];
          state.paymentHistoryById = new Map();
          state.paymentHistoryByInvoicePath = new Map();
        }
      } else {
        state.ledgerEntries = [];
        state.paymentHistoryById = new Map();
        state.paymentHistoryByInvoicePath = new Map();
      }
      syncYearFilterOptions(state.ledgerEntries);
      if (!w.electronAPI?.searchClients) {
        state.loading = false;
        state.error = "Recherche des clients indisponible.";
        state.rows = [];
        renderStatements();
        return;
      }
      state.loading = true;
      state.error = "";
      renderStatements();
      const items = [];
      const limit = 200;
      let offset = 0;
      let total = null;
      try {
        while (true) {
          const res = await w.electronAPI.searchClients({
            query: "",
            limit,
            offset,
            entityType: "client"
          });
          if (!res?.ok) {
            state.error = res?.error || "Chargement impossible.";
            state.rows = [];
            break;
          }
          const results = Array.isArray(res.results) ? res.results : [];
          items.push(...results);
          const resTotal = Number(res.total);
          if (Number.isFinite(resTotal)) total = resTotal;
          offset += results.length;
          if (results.length < limit) break;
          if (total !== null && offset >= total) break;
        }
      } catch (err) {
        state.error = "Chargement impossible.";
      }
      state.loading = false;
      if (!state.error) {
        const rows = items
          .map((record) => resolveClientRow(record))
          .filter((record) => (Number(record.factureCount) || 0) > 0);
        rows.sort((a, b) => {
          const nameCompare = String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base"
          });
          if (nameCompare !== 0) return nameCompare;
          return String(a.account || "").localeCompare(String(b.account || ""), undefined, {
            sensitivity: "base"
          });
        });
        state.data = items;
        state.rows = rows;
      }
      renderStatements();
    };

    const scheduleRefresh = () => {
      if (state.refreshTimer) return;
      state.refreshTimer = setTimeout(() => {
        state.refreshTimer = null;
        if (state.isOpen) loadClientStatements();
      }, 200);
    };

    const closeModal = () => {
      if (!state.modal || !state.isOpen) return;
      setSoldFilterMenuState(false);
      setYearFilterMenuState(false);
      state.startDatePicker?.close?.();
      state.endDatePicker?.close?.();
      state.modal.classList.remove("is-open");
      state.modal.hidden = true;
      state.modal.setAttribute("hidden", "");
      state.modal.setAttribute("aria-hidden", "true");
      state.isOpen = false;
      document.removeEventListener("keydown", onKeyDown);
      if (state.previousFocus && typeof state.previousFocus.focus === "function") {
        try {
          state.previousFocus.focus();
        } catch {}
      }
      state.previousFocus = null;
    };

    const openModal = () => {
      ensureBindings();
      if (!state.modal || state.isOpen) return;
      state.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      state.page = 1;
      state.modal.hidden = false;
      state.modal.removeAttribute("hidden");
      state.modal.setAttribute("aria-hidden", "false");
      state.modal.classList.add("is-open");
      state.isOpen = true;
      state.filters.client = String(state.filterClientInput?.value || "").trim();
      state.filters.sold = String(state.filterSoldSelect?.value || "").trim();
      state.filters.dateFrom = normalizeDayMonthValue(state.filterStartInput?.value || "");
      state.filters.dateTo = normalizeDayMonthValue(state.filterEndInput?.value || "");
      state.filters.year =
        normalizeYearValue(state.filterYearSelect?.value || "") || getCurrentYearValue();
      syncSoldFilterMenuUi(state.filters.sold, { updateSelect: true, closeMenu: true });
      syncYearFilterOptions(state.ledgerEntries);
      syncYearFilterMenuUi(state.filters.year, { updateSelect: true, closeMenu: true });
      syncDatePickerFromState();
      loadClientStatements();
      document.addEventListener("keydown", onKeyDown);
      const focusTarget = state.closeBtn || state.closeFooterBtn;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    };

    const onKeyDown = (evt) => {
      if (evt.key === "Escape") {
        if (state.filterYearMenu?.open) {
          evt.preventDefault();
          setYearFilterMenuState(false);
          try {
            state.filterYearMenuToggle?.focus?.();
          } catch {}
          return;
        }
        if (state.filterSoldMenu?.open) {
          evt.preventDefault();
          setSoldFilterMenuState(false);
          try {
            state.filterSoldMenuToggle?.focus?.();
          } catch {}
          return;
        }
        evt.preventDefault();
        closeModal();
      }
    };

    const ensureBindings = () => {
      if (state.listenersBound) return;
      state.button = getElSafe("btnPaymentClientStatements");
      state.modal = getElSafe("clientStatementsModal");
      state.closeBtn = getElSafe("clientStatementsClose");
      state.closeFooterBtn = getElSafe("clientStatementsCloseFooter");
      state.list = getElSafe("clientStatementsList");
      state.filterClientInput = getElSafe("clientStatementsFilterClient");
      state.filterSoldSelect = getElSafe("clientStatementsFilterSold");
      state.filterSoldMenu = getElSafe("clientStatementsFilterSoldMenu");
      state.filterSoldMenuToggle = state.filterSoldMenu?.querySelector("summary") || null;
      state.filterSoldMenuDisplay = getElSafe("clientStatementsFilterSoldDisplay");
      state.filterSoldMenuPanel = getElSafe("clientStatementsFilterSoldPanel");
      state.filterYearSelect = getElSafe("clientStatementsFilterYear");
      state.filterYearMenu = getElSafe("clientStatementsFilterYearMenu");
      state.filterYearMenuToggle = state.filterYearMenu?.querySelector("summary") || null;
      state.filterYearDisplay = getElSafe("clientStatementsFilterYearDisplay");
      state.filterYearPanel = getElSafe("clientStatementsFilterYearPanel");
      state.filterStartInput = getElSafe("clientStatementsFilterStart");
      state.filterEndInput = getElSafe("clientStatementsFilterEnd");
      state.filterClear = getElSafe("clientStatementsFilterClear");
      state.totalDebit = getElSafe("clientStatementsTotalDebit");
      state.totalCredit = getElSafe("clientStatementsTotalCredit");
      state.totalSold = getElSafe("clientStatementsTotalSold");
      state.prevBtn = getElSafe("clientStatementsPrev");
      state.nextBtn = getElSafe("clientStatementsNext");
      state.pageLabel = getElSafe("clientStatementsPage");
      state.pageInput = getElSafe("clientStatementsPageInput");
      state.totalLabel = getElSafe("clientStatementsTotalPages");
      if (!state.button || !state.modal) return;
      state.listenersBound = true;
      state.button.addEventListener("click", () => openModal());
      state.closeBtn?.addEventListener("click", () => closeModal());
      state.closeFooterBtn?.addEventListener("click", () => closeModal());
      state.modal?.addEventListener("click", (evt) => {
        if (evt.target === state.modal) evt.stopPropagation();
      });
      state.list?.addEventListener("click", async (evt) => {
        const btn = evt.target.closest("[data-credit-copy]");
        if (!btn) return;
        evt.preventDefault();
        const value = btn.dataset.creditCopyValue || "";
        if (value) await copyTextToClipboard(value);
      });
      const onFilterInput = () => {
        state.filters.client = String(state.filterClientInput?.value || "").trim();
        state.filters.sold = String(state.filterSoldSelect?.value || "").trim();
        state.filters.dateFrom = normalizeDayMonthValue(state.filterStartInput?.value || "");
        state.filters.dateTo = normalizeDayMonthValue(state.filterEndInput?.value || "");
        state.filters.year =
          normalizeYearValue(state.filterYearSelect?.value || "") || getCurrentYearValue();
        if (state.filterStartInput) state.filterStartInput.value = state.filters.dateFrom;
        if (state.filterEndInput) state.filterEndInput.value = state.filters.dateTo;
        syncSoldFilterMenuUi(state.filters.sold, { updateSelect: true });
        syncYearFilterMenuUi(state.filters.year, { updateSelect: true });
        syncDatePickerFromState();
        state.page = 1;
        renderStatements();
      };
      state.filterClientInput?.addEventListener("input", onFilterInput);
      state.filterStartInput?.addEventListener("input", onFilterInput);
      state.filterEndInput?.addEventListener("input", onFilterInput);
      wireSoldFilterMenu(onFilterInput);
      wireYearFilterMenu(onFilterInput);
      syncYearFilterOptions(state.ledgerEntries);
      state.filterClear?.addEventListener("click", () => {
        state.filters.client = "";
        state.filters.sold = "";
        state.filters.dateFrom = "";
        state.filters.dateTo = "";
        state.filters.year = getCurrentYearValue();
        if (state.filterClientInput) state.filterClientInput.value = "";
        if (state.filterSoldSelect) state.filterSoldSelect.value = "";
        syncSoldFilterMenuUi("", { updateSelect: true, closeMenu: true });
        if (state.filterStartInput) state.filterStartInput.value = "";
        if (state.filterEndInput) state.filterEndInput.value = "";
        syncYearFilterOptions(state.ledgerEntries);
        syncYearFilterMenuUi(state.filters.year, { updateSelect: true, closeMenu: true });
        syncDatePickerFromState();
        state.page = 1;
        renderStatements();
      });
      state.prevBtn?.addEventListener("click", () => {
        const pages = Math.max(1, state.totalPages || 1);
        if (state.page > 1 && setPage(state.page - 1, pages)) renderStatements();
      });
      state.nextBtn?.addEventListener("click", () => {
        const pages = Math.max(1, state.totalPages || 1);
        if (state.page < pages && setPage(state.page + 1, pages)) renderStatements();
      });
      state.pageInput?.addEventListener("change", (evt) => {
        const pages = Math.max(1, state.totalPages || 1);
        const raw = Number(evt.target?.value);
        if (!Number.isFinite(raw)) return;
        if (setPage(raw, pages)) renderStatements();
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
            renderStatements();
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
            renderStatements();
          }
        });
      }
    };

    const boot = () => {
      if (state.listenersBound) return;
      ensureBindings();
      if (state.listenersBound) return;
      let attempts = 0;
      const retry = () => {
        if (state.listenersBound) return;
        attempts += 1;
        ensureBindings();
        if (!state.listenersBound && attempts < 10) {
          setTimeout(retry, 200);
        }
      };
      setTimeout(retry, 200);
    };

    window.addEventListener("document-history-updated", () => {
      if (state.isOpen) scheduleRefresh();
    });
    window.addEventListener("payment-history-updated", () => {
      if (state.isOpen) scheduleRefresh();
    });
    window.addEventListener("client-sold-updated", () => {
      if (state.isOpen) scheduleRefresh();
    });

    boot();
  };
})(window);
