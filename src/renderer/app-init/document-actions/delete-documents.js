(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl = w.getEl || ((id) => document.getElementById(id));

  const MODAL_ID = "docBulkDeleteModal";
  const TITLE_ID = "docBulkDeleteModalTitle";
  const GRID_ID = "docBulkDeleteGrid";
  const STATUS_ID = "docBulkDeleteStatus";
  const REFRESH_ID = "docBulkDeleteRefresh";
  const CLOSE_ID = "docBulkDeleteClose";
  const CLOSE_FOOTER_ID = "docBulkDeleteCancel";
  const SELECT_ALL_ID = "docBulkDeleteSelectAll";
  const UNSELECT_ALL_ID = "docBulkDeleteUnselectAll";
  const CONFIRM_DELETE_ID = "docBulkDeleteConfirm";
  const PAGE_ID = "docBulkDeletePage";
  const PAGE_INPUT_ID = "docBulkDeletePageInput";
  const TOTAL_PAGES_ID = "docBulkDeleteTotalPages";
  const PREV_ID = "docBulkDeletePrev";
  const NEXT_ID = "docBulkDeleteNext";
  const SEARCH_INPUT_ID = "docBulkDeleteSearchNumber";
  const YEAR_SELECT_ID = "docBulkDeleteYearFilter";
  const YEAR_MENU_ID = "docBulkDeleteYearMenu";
  const YEAR_LABEL_ID = "docBulkDeleteYearLabel";
  const YEAR_DISPLAY_ID = "docBulkDeleteYearDisplay";
  const YEAR_PANEL_ID = "docBulkDeleteYearPanel";
  const PAGE_SIZE = 20;

  const DOC_TYPE_LABELS = {
    facture: "Facture",
    fa: "Facture d'achat",
    avoir: "Facture d'avoir",
    devis: "Devis",
    bl: "Bon de livraison"
  };
  const SELECTABLE_DOC_TYPES = new Set(["facture", "fa", "avoir", "devis", "bl"]);

  const SUPPORTED_DOC_TYPES = new Set(Object.keys(DOC_TYPE_LABELS));

  const DEFAULT_DOC_TYPE_CHOICES = [
    { docType: "facture", label: DOC_TYPE_LABELS.facture },
    { docType: "fa", label: DOC_TYPE_LABELS.fa },
    { docType: "avoir", label: DOC_TYPE_LABELS.avoir },
    { docType: "devis", label: DOC_TYPE_LABELS.devis },
    { docType: "bl", label: DOC_TYPE_LABELS.bl }
  ];

  const CLOSE_ICON_SVG = `
    <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
    </svg>
  `;

  const REFRESH_ICON_SVG = `
    <svg class="doc-history-modal__refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
      <path d="M4.5 10.5a7 7 0 0 1 12-3.5l1 1" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M19.5 13.5a7 7 0 0 1-12 3.5l-1-1" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M18 5v4h-4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 19v-4h4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  const CHEVRON_ICON_SVG = `
    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" d="M0 0h24v24H0V0z"></path>
      <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path>
    </svg>
  `;

  const aliasDocType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const aliases = {
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    return aliases[raw] || raw;
  };

  const normalizeDocTypeStrict = (value) => {
    const normalized = aliasDocType(value);
    return SUPPORTED_DOC_TYPES.has(normalized) ? normalized : "";
  };

  const normalizeDocType = (value, fallback = "facture") => {
    const normalized = normalizeDocTypeStrict(value);
    if (normalized) return normalized;
    const normalizedFallback = normalizeDocTypeStrict(fallback);
    return normalizedFallback || "facture";
  };

  const docTypeLabel = (value) => DOC_TYPE_LABELS[normalizeDocType(value)] || "Document";

  const toDocTypeChoices = (choices) => {
    const source = Array.isArray(choices) && choices.length ? choices : DEFAULT_DOC_TYPE_CHOICES;
    const out = [];
    const seen = new Set();
    source.forEach((entry) => {
      const docType = normalizeDocTypeStrict(entry?.docType || entry?.value || entry?.type || entry);
      if (!docType || seen.has(docType)) return;
      if (!SELECTABLE_DOC_TYPES.has(docType)) return;
      seen.add(docType);
      const label = String(entry?.label || DOC_TYPE_LABELS[docType] || docType).trim() || DOC_TYPE_LABELS[docType];
      out.push({ docType, label });
    });
    if (!out.length) return DEFAULT_DOC_TYPE_CHOICES.slice();
    return out;
  };

  const extractDocumentLabel = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    const sqlitePrefix = "sqlite://documents/";
    if (str.startsWith(sqlitePrefix)) {
      return str.slice(sqlitePrefix.length);
    }
    const normalized = str.replace(/\\/g, "/");
    const base = normalized.split("/").filter(Boolean).pop() || str;
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
  };

  const stripJsonExtension = (value) => String(value || "").replace(/\.json$/i, "");

  const getDisplayName = (entry, index) => {
    const number = String(entry?.number || "").trim();
    if (number) return number;
    const name = String(entry?.name || "").trim();
    if (name) return stripJsonExtension(name);
    const pathValue = String(entry?.path || "").trim();
    if (pathValue) return stripJsonExtension(extractDocumentLabel(pathValue));
    return `Document ${index + 1}`;
  };

  const computeSortTime = (entry) => {
    const raw = entry?.modifiedAt || entry?.createdAt || entry?.date || "";
    const ts = Date.parse(String(raw || ""));
    return Number.isFinite(ts) ? ts : 0;
  };

  const getCurrentYearValue = () => String(new Date().getFullYear());

  const extractYearValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const match = raw.match(/\b(19|20)\d{2}\b/);
    if (match?.[0]) return match[0];
    const ts = Date.parse(raw);
    if (!Number.isFinite(ts)) return "";
    return String(new Date(ts).getFullYear());
  };

  const computeEntryYear = (entry) =>
    extractYearValue(entry?.date) ||
    extractYearValue(entry?.modifiedAt) ||
    extractYearValue(entry?.createdAt) ||
    "";

  const getSortValue = (entry) => {
    const primary = String(entry?.number || "").trim();
    if (primary) return primary;
    const secondary = String(entry?.displayName || "").trim();
    if (secondary) return secondary;
    return String(entry?.path || "").trim();
  };

  const buildModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog doc-history-modal doc-bulk-delete-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-history-modal__panel doc-bulk-delete-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="${TITLE_ID}" class="swbDialog__title">Supprimer des documents</div>
            <button
              id="${REFRESH_ID}"
              type="button"
              class="btn ghost doc-history-modal__refresh"
              aria-label="Rafraichir les documents"
            >
              ${REFRESH_ICON_SVG}
            </button>
          </div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="swbDialog__msg doc-history-modal__body doc-bulk-delete-modal__body">
          <div class="doc-bulk-delete-modal__toolbar">
            <div class="doc-bulk-delete-modal__filters">
              <label class="doc-bulk-delete-modal__search" for="${SEARCH_INPUT_ID}">
                <span class="doc-bulk-delete-modal__search-label">Numero</span>
                <input
                  id="${SEARCH_INPUT_ID}"
                  class="doc-bulk-delete-modal__search-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Rechercher par numero"
                  aria-label="Rechercher un document par numero"
                />
              </label>
              <label class="doc-bulk-delete-modal__year">
                <span id="${YEAR_LABEL_ID}" class="doc-bulk-delete-modal__search-label">Annee</span>
                <div class="doc-dialog-model-picker__field">
                  <details
                    id="${YEAR_MENU_ID}"
                    class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                  >
                    <summary
                      class="btn success field-toggle-trigger"
                      role="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="${YEAR_LABEL_ID} ${YEAR_DISPLAY_ID}"
                    >
                      <span id="${YEAR_DISPLAY_ID}" class="model-select-display">${getCurrentYearValue()}</span>
                      ${CHEVRON_ICON_SVG}
                    </summary>
                    <div
                      id="${YEAR_PANEL_ID}"
                      class="field-toggle-panel model-select-panel doc-history-model-panel"
                      role="listbox"
                      aria-labelledby="${YEAR_LABEL_ID}"
                    >
                      <button type="button" class="model-select-option" data-value="" role="option" aria-selected="false">
                        Toutes
                      </button>
                      <button type="button" class="model-select-option is-active" data-value="${getCurrentYearValue()}" role="option" aria-selected="true">
                        ${getCurrentYearValue()}
                      </button>
                    </div>
                  </details>
                  <select
                    id="${YEAR_SELECT_ID}"
                    class="model-select doc-dialog-model-select"
                    aria-hidden="true"
                    tabindex="-1"
                  >
                    <option value="">Toutes</option>
                    <option value="${getCurrentYearValue()}" selected>${getCurrentYearValue()}</option>
                  </select>
                </div>
              </label>
            </div>
            <div class="doc-bulk-delete-modal__selection-tools">
              <button id="${SELECT_ALL_ID}" type="button" class="client-search__edit">Tout selectionner</button>
              <button id="${UNSELECT_ALL_ID}" type="button" class="client-search__edit">Tout deselectionner</button>
              <button id="${CONFIRM_DELETE_ID}" type="button" class="client-search__deleteDoc" disabled>Supprimer</button>
            </div>
          </div>
          <div id="${GRID_ID}" class="doc-history-modal__list doc-bulk-delete-modal__grid" role="list"></div>
          <p id="${STATUS_ID}" class="doc-history-modal__status doc-bulk-delete-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="${CLOSE_FOOTER_ID}" type="button" class="btn btn-close client-search__close">Fermer</button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="${PREV_ID}" type="button" class="client-search__edit" disabled>Precedent</button>
            <span
              id="${PAGE_ID}"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="${PAGE_INPUT_ID}"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="${TOTAL_PAGES_ID}">1</span>
            </span>
            <button id="${NEXT_ID}" type="button" class="client-search__add" disabled>Suivant</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureModal = () => {
    if (typeof document === "undefined") return null;
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    const host = document.getElementById("app") || document.body;
    if (!host) return null;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildModalMarkup().trim();
    modal = wrapper.firstElementChild;
    if (!modal) return null;
    host.appendChild(modal);
    return modal;
  };

  const normalizeEntry = (rawEntry, index) => {
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const id = String(entry.id || "").trim();
    const path = String(entry.path || "").trim();
    const number = String(entry.number || "").trim();
    const date = String(entry.date || "").trim();
    const clientName = String(entry.clientName || "").trim();
    const modifiedAt = String(entry.modifiedAt || "").trim();
    const createdAt = String(entry.createdAt || "").trim();
    const displayName = getDisplayName(entry, index);
    const key =
      id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:${index}` : `idx:${index}`;
    return {
      key,
      id,
      path,
      number,
      date,
      clientName,
      modifiedAt,
      createdAt,
      year: computeEntryYear(entry),
      displayName,
      sortTime: computeSortTime(entry)
    };
  };

  const fetchAllInvoiceFiles = async (docType) => {
    if (!w.electronAPI?.listInvoiceFiles) {
      return { ok: false, error: "Chargement des documents indisponible." };
    }
    const normalizedDocType = normalizeDocType(docType);
    const FETCH_LIMIT = 250;
    const items = [];
    let offset = 0;
    let total = null;
    let loops = 0;
    while (loops < 250) {
      loops += 1;
      let res = null;
      try {
        res = await w.electronAPI.listInvoiceFiles({
          docType: normalizedDocType,
          limit: FETCH_LIMIT,
          offset
        });
      } catch (err) {
        return {
          ok: false,
          error: String(err?.message || err || "Chargement des documents impossible.")
        };
      }
      if (!res?.ok) {
        return {
          ok: false,
          error: String(res?.error || "Chargement des documents impossible.")
        };
      }
      const batch = Array.isArray(res.items) ? res.items : [];
      items.push(...batch);
      if (Number.isFinite(Number(res.total))) {
        total = Number(res.total);
      }
      offset += batch.length;
      if (!batch.length) break;
      if (total !== null && offset >= total) break;
      if (batch.length < FETCH_LIMIT) break;
    }
    return { ok: true, items };
  };

  let modalController = null;

  const createModalController = () => {
    if (modalController) return modalController;
    const modal = ensureModal();
    if (!modal) return null;

    const titleEl = modal.querySelector(`#${TITLE_ID}`);
    const gridEl = modal.querySelector(`#${GRID_ID}`);
    const statusEl = modal.querySelector(`#${STATUS_ID}`);
    const refreshBtn = modal.querySelector(`#${REFRESH_ID}`);
    const closeBtn = modal.querySelector(`#${CLOSE_ID}`);
    const closeFooterBtn = modal.querySelector(`#${CLOSE_FOOTER_ID}`);
    const selectAllBtn = modal.querySelector(`#${SELECT_ALL_ID}`);
    const unselectAllBtn = modal.querySelector(`#${UNSELECT_ALL_ID}`);
    const confirmDeleteBtn = modal.querySelector(`#${CONFIRM_DELETE_ID}`);
    const pageEl = modal.querySelector(`#${PAGE_ID}`);
    const pageInput = modal.querySelector(`#${PAGE_INPUT_ID}`);
    const totalPagesEl = modal.querySelector(`#${TOTAL_PAGES_ID}`);
    const prevBtn = modal.querySelector(`#${PREV_ID}`);
    const nextBtn = modal.querySelector(`#${NEXT_ID}`);
    const searchInput = modal.querySelector(`#${SEARCH_INPUT_ID}`);
    const yearSelect = modal.querySelector(`#${YEAR_SELECT_ID}`);
    const yearMenu = modal.querySelector(`#${YEAR_MENU_ID}`);
    const yearMenuToggle = yearMenu?.querySelector("summary") || null;
    const yearMenuDisplay = modal.querySelector(`#${YEAR_DISPLAY_ID}`);
    const yearMenuPanel = modal.querySelector(`#${YEAR_PANEL_ID}`);

    const state = {
      docType: "facture",
      busy: false,
      loading: false,
      error: "",
      entries: [],
      searchNumber: "",
      yearFilter: getCurrentYearValue(),
      page: 1,
      selectedKeys: new Set(),
      pendingPromise: null,
      resolvePending: null,
      restoreFocus: null
    };

    const normalizeSearchValue = (value) => String(value || "").trim().toLowerCase();
    const normalizeYearValue = (value) => String(value || "").trim();
    const hasSearchFilter = () => normalizeSearchValue(state.searchNumber).length > 0;
    const hasYearFilter = () => normalizeYearValue(state.yearFilter).length > 0;
    const hasActiveFilters = () => hasSearchFilter() || hasYearFilter();
    const buildFilterSummary = () => {
      const parts = [];
      const searchTerm = String(state.searchNumber || "").trim();
      const yearTerm = normalizeYearValue(state.yearFilter);
      if (searchTerm) parts.push(`numero "${searchTerm}"`);
      if (yearTerm) parts.push(`annee ${yearTerm}`);
      return parts.join(" et ");
    };
    const createOptionNode = (value, label) => {
      const option = document.createElement("option");
      option.value = String(value || "");
      option.textContent = String(label || "");
      return option;
    };
    const createYearOptionButton = (value, label, isActive = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `model-select-option${isActive ? " is-active" : ""}`;
      btn.dataset.value = String(value || "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.textContent = String(label || "");
      return btn;
    };
    const getYearFilterLabel = (value) => {
      if (!yearSelect) return "";
      const options = Array.from(yearSelect.options || []);
      const match = options.find((opt) => String(opt?.value || "") === String(value || ""));
      return String(match?.textContent || match?.label || "").trim();
    };
    const getYearFilterPlaceholder = () => getYearFilterLabel("") || "Toutes";
    const setYearFilterMenuState = (isOpen) => {
      const open = !!isOpen;
      if (yearMenu) yearMenu.open = open;
      if (yearMenuToggle) {
        yearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };
    const syncYearFilterMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!yearSelect) return "";
      const nextValue =
        value !== undefined ? String(value || "") : String(yearSelect.value || "");
      if (updateSelect) yearSelect.value = nextValue;
      if (yearMenuDisplay) {
        yearMenuDisplay.textContent = getYearFilterLabel(nextValue) || getYearFilterPlaceholder();
      }
      if (yearMenuPanel) {
        yearMenuPanel.querySelectorAll(".model-select-option").forEach((btn) => {
          const isActive = String(btn.dataset.value || "") === nextValue;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      }
      if (closeMenu) setYearFilterMenuState(false);
      return nextValue;
    };
    const wireYearFilterMenu = () => {
      if (
        !yearMenu ||
        !yearMenuToggle ||
        !yearMenuPanel ||
        !yearSelect ||
        yearMenu.dataset.wired === "1"
      ) {
        return;
      }
      yearMenu.dataset.wired = "1";
      setYearFilterMenuState(yearMenu.open);
      yearMenuPanel.addEventListener("click", (evt) => {
        if (state.busy) return;
        const btn = evt.target.closest(".model-select-option");
        if (!btn) return;
        const nextValue = String(btn.dataset.value || "");
        const changed = yearSelect.value !== nextValue;
        yearSelect.value = nextValue;
        if (changed) {
          yearSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          syncYearFilterMenuUi(nextValue);
          state.yearFilter = normalizeYearValue(nextValue);
          state.page = 1;
          renderEntries();
        }
        setYearFilterMenuState(false);
      });
      yearMenuToggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (state.busy) return;
        setYearFilterMenuState(!yearMenu.open);
        if (!yearMenu.open) yearMenuToggle.focus();
      });
      yearMenu.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape") return;
        evt.preventDefault();
        setYearFilterMenuState(false);
        yearMenuToggle.focus();
      });
      document.addEventListener("click", (evt) => {
        if (!yearMenu?.open) return;
        if (yearMenu.contains(evt.target)) return;
        setYearFilterMenuState(false);
      });
      syncYearFilterMenuUi(yearSelect.value);
    };
    const syncYearOptions = () => {
      if (!yearSelect) return;
      const currentYear = getCurrentYearValue();
      const selectedYear = normalizeYearValue(state.yearFilter);
      const parseYear = (value) => {
        const num = Number.parseInt(String(value || "").trim(), 10);
        return Number.isFinite(num) && num >= 1900 && num <= 9999 ? num : null;
      };
      const selectedYearNum = parseYear(selectedYear);
      const currentYearNum = parseYear(currentYear) || new Date().getFullYear();
      const minEntryYearNum = state.entries
        .map((entry) => parseYear(normalizeYearValue(entry?.year)))
        .filter((value) => value !== null)
        .reduce((min, value) => (min === null || value < min ? value : min), null);
      const topYearNum = selectedYearNum !== null ? selectedYearNum : currentYearNum;
      const bottomYearNum =
        minEntryYearNum !== null ? Math.min(minEntryYearNum, topYearNum) : topYearNum;
      const years = [];
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) {
        years.push(String(year));
      }
      yearSelect.innerHTML = "";
      const options = [{ value: "", label: "Toutes" }, ...years.map((year) => ({ value: year, label: year }))];
      options.forEach((option) => {
        yearSelect.appendChild(createOptionNode(option.value, option.label));
      });
      const nextValue =
        selectedYear === ""
          ? ""
          : selectedYearNum !== null
            ? String(selectedYearNum)
            : currentYear;
      state.yearFilter = nextValue;
      yearSelect.value = nextValue;
      if (yearMenuPanel) {
        yearMenuPanel.innerHTML = "";
        options.forEach((option) => {
          const isActive = String(option.value) === nextValue;
          yearMenuPanel.appendChild(createYearOptionButton(option.value, option.label, isActive));
        });
      }
      syncYearFilterMenuUi(nextValue);
    };
    const getFilteredEntries = () => {
      const term = normalizeSearchValue(state.searchNumber);
      const yearTerm = normalizeYearValue(state.yearFilter);
      if (!term && !yearTerm) return state.entries;
      return state.entries.filter((entry) => {
        const numberValue = String(entry?.number || "").trim().toLowerCase();
        const displayValue = String(entry?.displayName || "").trim().toLowerCase();
        const matchesSearch = !term || numberValue.includes(term) || displayValue.includes(term);
        const matchesYear = !yearTerm || String(entry?.year || "").trim() === yearTerm;
        return matchesSearch && matchesYear;
      });
    };
    const getSelectedEntries = () =>
      getFilteredEntries().filter((entry) => state.selectedKeys.has(entry.key));
    const selectedCount = () => getSelectedEntries().length;
    const totalCount = () => getFilteredEntries().length;
    const totalEntriesCount = () => state.entries.length;
    const sourceLabel = () => docTypeLabel(state.docType);
    const getTotalPages = () => {
      const total = totalCount();
      return total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    };
    const clampPage = (value) => {
      const totalPages = getTotalPages();
      const num = Number.parseInt(value, 10);
      if (!Number.isFinite(num)) return state.page;
      if (num < 1) return 1;
      if (num > totalPages) return totalPages;
      return num;
    };
    const getVisibleEntries = () => {
      const totalPages = getTotalPages();
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      const start = (state.page - 1) * PAGE_SIZE;
      return getFilteredEntries().slice(start, start + PAGE_SIZE);
    };

    const showModal = () => {
      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
    };

    const hideModal = () => {
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    };

    const setBusy = (busy) => {
      state.busy = !!busy;
      if (state.busy) modal.setAttribute("aria-busy", "true");
      else modal.removeAttribute("aria-busy");

      if (closeBtn) closeBtn.disabled = state.busy;
      if (closeFooterBtn) closeFooterBtn.disabled = state.busy;
      if (refreshBtn) refreshBtn.disabled = state.busy;
      if (selectAllBtn) selectAllBtn.disabled = state.busy;
      if (unselectAllBtn) unselectAllBtn.disabled = state.busy;
      if (searchInput) searchInput.disabled = state.busy;
      if (yearSelect) yearSelect.disabled = state.busy;
      if (yearMenuToggle) {
        yearMenuToggle.setAttribute("aria-disabled", state.busy ? "true" : "false");
      }
      if (state.busy) {
        setYearFilterMenuState(false);
      }
      syncActionButtons();
      syncPagerControls();
    };

    const ensureSelectionConsistency = () => {
      const available = new Set(state.entries.map((entry) => entry.key));
      const nextSelected = new Set();
      state.selectedKeys.forEach((key) => {
        if (available.has(key)) nextSelected.add(key);
      });
      state.selectedKeys = nextSelected;
    };

    const syncActionButtons = () => {
      const selected = selectedCount();
      const total = totalCount();
      const hasEntries = total > 0;
      if (confirmDeleteBtn) {
        confirmDeleteBtn.disabled = state.busy || !hasEntries || selected < 1;
      }
      if (selectAllBtn) {
        selectAllBtn.disabled = state.busy || !hasEntries || selected >= total;
      }
      if (unselectAllBtn) {
        unselectAllBtn.disabled = state.busy || selected < 1;
      }
    };

    const syncPagerControls = () => {
      const total = totalCount();
      const totalPages = getTotalPages();
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      if (prevBtn) prevBtn.disabled = state.busy || total === 0 || state.page <= 1;
      if (nextBtn) nextBtn.disabled = state.busy || total === 0 || state.page >= totalPages;
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
      if (pageEl) {
        pageEl.setAttribute("aria-label", `Page ${state.page} sur ${totalPages}`);
      }
      if (pageInput) {
        pageInput.disabled = state.busy || total === 0;
        pageInput.min = "1";
        pageInput.max = String(totalPages);
        pageInput.value = String(state.page);
        pageInput.setAttribute("aria-valuemin", "1");
        pageInput.setAttribute("aria-valuemax", String(totalPages));
        pageInput.setAttribute("aria-valuenow", String(state.page));
      }
    };

    const setStatus = (text) => {
      if (!statusEl) return;
      statusEl.textContent = String(text || "").trim();
    };

    const syncStatus = () => {
      if (state.loading) {
        setStatus("Chargement des documents...");
        return;
      }
      if (state.error) {
        setStatus(state.error);
        return;
      }
      const total = totalCount();
      if (!total) {
        if (hasActiveFilters()) {
          setStatus(`Aucun document trouve pour ${buildFilterSummary()}.`);
          return;
        }
        setStatus(`Aucun document disponible pour ${sourceLabel()}.`);
        return;
      }
      const selected = selectedCount();
      if (hasActiveFilters()) {
        setStatus(
          `${selected} document(s) selectionne(s) sur ${total} resultat(s) (${totalEntriesCount()} total).`
        );
        return;
      }
      setStatus(`${selected} document(s) selectionne(s) sur ${total}.`);
    };

    const createEmptyStateNode = (text) => {
      const empty = document.createElement("div");
      empty.className = "doc-history-modal__empty";
      empty.textContent = String(text || "").trim() || "Aucun resultat.";
      return empty;
    };

    const appendMetaChip = (container, label) => {
      const value = String(label || "").trim();
      if (!value) return;
      const chip = document.createElement("span");
      chip.className = "doc-bulk-delete-modal__meta-chip";
      chip.textContent = value;
      container.appendChild(chip);
    };

    const renderEntries = () => {
      if (!gridEl) return;
      gridEl.innerHTML = "";
      if (state.loading) {
        gridEl.appendChild(createEmptyStateNode("Chargement..."));
        syncActionButtons();
        syncStatus();
        syncPagerControls();
        return;
      }
      if (state.error) {
        gridEl.appendChild(createEmptyStateNode(state.error));
        syncActionButtons();
        syncStatus();
        syncPagerControls();
        return;
      }
      const filteredEntries = getFilteredEntries();
      if (!filteredEntries.length) {
        const emptyText = hasActiveFilters()
          ? `Aucun document trouve pour ${buildFilterSummary()}.`
          : `Aucun document pour ${sourceLabel()}.`;
        gridEl.appendChild(createEmptyStateNode(emptyText));
        syncActionButtons();
        syncStatus();
        syncPagerControls();
        return;
      }

      const visibleEntries = getVisibleEntries();
      const fragment = document.createDocumentFragment();
      visibleEntries.forEach((entry) => {
        const card = document.createElement("label");
        card.className = "doc-bulk-delete-modal__card";
        card.setAttribute("role", "listitem");
        card.setAttribute("data-entry-key", entry.key);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "doc-bulk-delete-modal__checkbox";
        checkbox.dataset.entryKey = entry.key;
        checkbox.checked = state.selectedKeys.has(entry.key);
        checkbox.disabled = state.busy;
        checkbox.setAttribute("aria-label", `Selectionner ${entry.displayName}`);

        const content = document.createElement("span");
        content.className = "doc-bulk-delete-modal__card-content";

        const mainRow = document.createElement("span");
        mainRow.className = "doc-bulk-delete-modal__card-main";

        const title = document.createElement("span");
        title.className = "doc-bulk-delete-modal__card-title";
        title.textContent = entry.displayName;

        const details = document.createElement("span");
        details.className = "doc-bulk-delete-modal__card-meta";
        appendMetaChip(details, entry.date ? `Date: ${entry.date}` : "");

        mainRow.appendChild(checkbox);
        mainRow.appendChild(title);
        content.appendChild(mainRow);
        if (details.childElementCount > 0) {
          content.appendChild(details);
        }
        card.appendChild(content);
        fragment.appendChild(card);
      });
      gridEl.appendChild(fragment);
      syncActionButtons();
      syncStatus();
      syncPagerControls();
    };

    const setDocType = (value) => {
      state.docType = normalizeDocType(value, state.docType || "facture");
      const label = sourceLabel();
      if (titleEl) titleEl.textContent = `Supprimer des documents - ${label}`;
    };

    const applyEntries = (items, { preserveSelection = false } = {}) => {
      const normalized = (Array.isArray(items) ? items : [])
        .map((item, index) => normalizeEntry(item, index))
        .sort((a, b) => {
          const valueA = getSortValue(a);
          const valueB = getSortValue(b);
          const byValueDesc = valueB.localeCompare(valueA, undefined, {
            numeric: true,
            sensitivity: "base"
          });
          if (byValueDesc !== 0) return byValueDesc;
          if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
          return b.displayName.localeCompare(a.displayName, undefined, {
            numeric: true,
            sensitivity: "base"
          });
        });
      state.entries = normalized;
      syncYearOptions();
      if (!preserveSelection) {
        state.selectedKeys.clear();
        state.page = 1;
      } else {
        ensureSelectionConsistency();
      }
      const totalPages = getTotalPages();
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
    };

    const loadEntries = async ({ preserveSelection = false } = {}) => {
      state.loading = true;
      state.error = "";
      setBusy(true);
      renderEntries();
      const res = await fetchAllInvoiceFiles(state.docType);
      if (!res?.ok) {
        state.loading = false;
        state.error = String(res?.error || "Chargement des documents impossible.");
        state.entries = [];
        state.selectedKeys.clear();
        setBusy(false);
        renderEntries();
        return false;
      }
      applyEntries(res.items || [], { preserveSelection });
      state.loading = false;
      state.error = "";
      setBusy(false);
      renderEntries();
      return true;
    };

    const finalizePending = (result) => {
      if (typeof state.resolvePending === "function") {
        state.resolvePending(result);
      }
      state.resolvePending = null;
      state.pendingPromise = null;
    };

    const closeModal = (result = { ok: false, canceled: true }) => {
      if (state.busy) return;
      setYearFilterMenuState(false);
      hideModal();
      document.removeEventListener("keydown", onKeydown, true);
      const focusTarget = state.restoreFocus;
      state.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
      finalizePending(result);
    };

    const selectAllEntries = () => {
      const filteredEntries = getFilteredEntries();
      if (state.busy || !filteredEntries.length) return;
      filteredEntries.forEach((entry) => state.selectedKeys.add(entry.key));
      renderEntries();
    };

    const unselectAll = () => {
      const filteredEntries = getFilteredEntries();
      if (state.busy || !state.selectedKeys.size || !filteredEntries.length) return;
      filteredEntries.forEach((entry) => state.selectedKeys.delete(entry.key));
      renderEntries();
    };

    const confirmDeleteSelection = async () => {
      if (state.busy) return;
      const selectedEntries = getSelectedEntries();
      if (!selectedEntries.length) return;

      const count = selectedEntries.length;
      const deleteSummaryText =
        count === 1
          ? `Supprimer le document ${selectedEntries[0].displayName} ?`
          : `Supprimer ${count} documents selectionnes ?`;

      const requiresFactureCodeConfirm = state.docType === "facture";
      if (requiresFactureCodeConfirm) {
        let confirmed = true;
        if (typeof w.confirmFactureDeleteWithCode === "function") {
          const displayName =
            count === 1
              ? selectedEntries[0].displayName
              : `${count} documents facture`;
          confirmed = await w.confirmFactureDeleteWithCode(deleteSummaryText, {
            title: "Suppression",
            okText: "Supprimer",
            cancelText: "Annuler",
            displayName,
            warningText: "seront supprimes definitivement."
          });
        } else if (typeof w.showConfirm === "function") {
          confirmed = await w.showConfirm(deleteSummaryText, {
            title: "Suppression",
            okText: "Supprimer",
            cancelText: "Annuler"
          });
        } else if (typeof w.confirm === "function") {
          confirmed = w.confirm(deleteSummaryText);
        }
        if (!confirmed) return;
      }

      if (!w.electronAPI?.deleteInvoiceFile) {
        await w.showDialog?.("Suppression de document indisponible.", { title: "Erreur" });
        return;
      }

      state.error = "";
      setBusy(true);
      syncStatus();

      let deletedCount = 0;
      const failed = [];
      for (const entry of selectedEntries) {
        const payload = {
          id: entry.id,
          path: entry.path,
          number: entry.number || entry.displayName,
          docType: state.docType
        };
        let res = null;
        try {
          res = await w.electronAPI.deleteInvoiceFile(payload);
        } catch (err) {
          res = {
            ok: false,
            error: String(err?.message || err || "Suppression impossible.")
          };
        }
        const errorText = String(res?.error || "");
        const isMissing = !!res?.missing || /introuvable/i.test(errorText);
        if (res?.ok || isMissing) {
          deletedCount += 1;
          if (entry.path) {
            if (typeof w.removeDocumentHistory === "function") {
              try {
                w.removeDocumentHistory(state.docType, entry.path);
              } catch {}
            } else {
              try {
                window.dispatchEvent(
                  new CustomEvent("document-history-updated", {
                    detail: { docType: state.docType, removed: entry.path }
                  })
                );
              } catch {}
            }
            if (state.docType === "facture" && typeof w.removePaymentHistoryForInvoice === "function") {
              try {
                w.removePaymentHistoryForInvoice(entry.path);
              } catch {}
            }
          }
        } else {
          failed.push(`${entry.displayName}: ${errorText || "Suppression impossible."}`);
        }
      }

      if (typeof w.recomputeDocumentNumbering === "function") {
        try {
          w.recomputeDocumentNumbering(state.docType);
        } catch (err) {
          console.warn("recomputeDocumentNumbering failed", err);
        }
      }

      setBusy(false);

      if (deletedCount > 0 && typeof w.showToast === "function") {
        w.showToast(`${deletedCount} document(s) supprime(s).`);
      }
      if (failed.length) {
        const title = deletedCount > 0 ? "Suppression partielle" : "Suppression impossible";
        const preview = failed.slice(0, 5).join("\n");
        await w.showDialog?.(preview, { title });
      }

      await loadEntries({ preserveSelection: false });
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      if (yearMenu?.open) {
        setYearFilterMenuState(false);
        yearMenuToggle?.focus?.();
        return;
      }
      closeModal({ ok: false, canceled: true });
    };

    const onGridChange = (evt) => {
      const checkbox = evt.target?.closest?.(".doc-bulk-delete-modal__checkbox");
      if (!checkbox || state.busy) return;
      const key = String(checkbox.dataset.entryKey || "").trim();
      if (!key) return;
      if (checkbox.checked) state.selectedKeys.add(key);
      else state.selectedKeys.delete(key);
      syncActionButtons();
      syncStatus();
    };

    const applyPageInput = () => {
      if (!pageInput) return;
      const nextPage = clampPage(pageInput.value);
      if (nextPage !== state.page) {
        state.page = nextPage;
        renderEntries();
        return;
      }
      syncPagerControls();
    };

    const openModal = async ({ docType, trigger } = {}) => {
      if (state.pendingPromise) return state.pendingPromise;

      state.pendingPromise = new Promise((resolve) => {
        state.resolvePending = resolve;
      });
      state.restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

      state.selectedKeys.clear();
      state.entries = [];
      state.searchNumber = "";
      state.yearFilter = getCurrentYearValue();
      state.error = "";
      state.loading = false;
      state.page = 1;
      if (searchInput) searchInput.value = "";
      syncYearOptions();
      setDocType(docType || "facture");

      showModal();
      document.addEventListener("keydown", onKeydown, true);
      renderEntries();

      await loadEntries({ preserveSelection: false });

      if (state.entries.length) {
        const firstCheck = modal.querySelector(".doc-bulk-delete-modal__checkbox");
        firstCheck?.focus?.();
      } else {
        closeFooterBtn?.focus?.();
      }
      return state.pendingPromise;
    };

    closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    closeFooterBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    refreshBtn?.addEventListener("click", () => {
      if (state.busy) return;
      void loadEntries({ preserveSelection: true });
    });
    selectAllBtn?.addEventListener("click", selectAllEntries);
    unselectAllBtn?.addEventListener("click", unselectAll);
    confirmDeleteBtn?.addEventListener("click", () => {
      void confirmDeleteSelection();
    });
    prevBtn?.addEventListener("click", () => {
      if (state.busy || state.page <= 1) return;
      state.page -= 1;
      renderEntries();
    });
    nextBtn?.addEventListener("click", () => {
      if (state.busy || state.page >= getTotalPages()) return;
      state.page += 1;
      renderEntries();
    });
    pageInput?.addEventListener("focus", (evt) => {
      if (evt?.target?.select) {
        try {
          evt.target.select();
        } catch {}
      }
    });
    pageInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        applyPageInput();
      } else if (evt.key === "Escape") {
        syncPagerControls();
        pageInput.blur();
      }
    });
    pageInput?.addEventListener("blur", applyPageInput);
    searchInput?.addEventListener("input", (evt) => {
      if (state.busy) return;
      state.searchNumber = String(evt?.target?.value || "");
      state.page = 1;
      renderEntries();
    });
    yearSelect?.addEventListener("change", (evt) => {
      if (state.busy) return;
      state.yearFilter = normalizeYearValue(evt?.target?.value);
      syncYearFilterMenuUi(state.yearFilter);
      state.page = 1;
      renderEntries();
    });
    wireYearFilterMenu();
    gridEl?.addEventListener("change", onGridChange);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) {
        evt.stopPropagation();
      }
    });

    modalController = {
      open: openModal,
      close: closeModal
    };
    return modalController;
  };

  const chooseDocumentSource = async ({ choices, fallbackDocType }) => {
    const normalizedChoices = toDocTypeChoices(choices);
    const fallback = normalizeDocType(
      fallbackDocType || normalizedChoices[0]?.docType || "facture",
      "facture"
    );
    if (typeof w.showOptionsDialog !== "function") {
      return fallback;
    }
    const initialChoice = normalizedChoices.findIndex((entry) => entry.docType === fallback);
    let pickedIndex = null;
    try {
      pickedIndex = await w.showOptionsDialog({
        title: "Selectionner un document",
        message: "Choisissez la source de document a supprimer :",
        options: normalizedChoices.map((entry) => ({
          label: entry.label,
          value: entry.docType
        })),
        initialChoice: initialChoice >= 0 ? initialChoice : 0
      });
    } catch (err) {
      console.warn("doc bulk delete source chooser failed", err);
      return fallback;
    }
    if (pickedIndex === null || pickedIndex === undefined) return "";
    const picked = normalizedChoices[Number(pickedIndex)] || normalizedChoices[0];
    return normalizeDocType(picked?.docType || fallback, fallback);
  };

  const openDocumentBulkDelete = async (trigger = null, choices = DEFAULT_DOC_TYPE_CHOICES) => {
    const fallbackDocType = normalizeDocType(getEl("docType")?.value || "facture", "facture");
    const pickedDocType = await chooseDocumentSource({
      choices,
      fallbackDocType
    });
    if (!pickedDocType) {
      return { ok: false, canceled: true };
    }
    const controller = createModalController();
    if (!controller || typeof controller.open !== "function") {
      await w.showDialog?.("Fenetre de suppression indisponible.", { title: "Erreur" });
      return { ok: false, canceled: false };
    }
    return await controller.open({ docType: pickedDocType, trigger });
  };

  AppInit.registerDocumentBulkDeleteActions = function registerDocumentBulkDeleteActions(ctx = {}) {
    const triggerBtn = getEl("docTypeActionDelete");
    if (!triggerBtn || triggerBtn.dataset.bulkDeleteBound === "1") return;
    triggerBtn.dataset.bulkDeleteBound = "1";
    const choices = toDocTypeChoices(ctx.docTypeChoices);
    triggerBtn.addEventListener("click", () => {
      void openDocumentBulkDelete(triggerBtn, choices);
    });
  };

  AppInit.DocumentBulkDelete = {
    open: (trigger = null, options = {}) =>
      openDocumentBulkDelete(
        trigger,
        options.docTypeChoices || options.choices || DEFAULT_DOC_TYPE_CHOICES
      )
  };
})(window);
