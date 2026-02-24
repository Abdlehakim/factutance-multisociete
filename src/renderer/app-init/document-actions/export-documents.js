(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl = w.getEl || ((id) => document.getElementById(id));

  const MODAL_ID = "docBulkExportModal";
  const TITLE_ID = "docBulkExportModalTitle";
  const GRID_ID = "docBulkExportGrid";
  const STATUS_ID = "docBulkExportStatus";
  const REFRESH_ID = "docBulkExportRefresh";
  const CLOSE_ID = "docBulkExportClose";
  const CLOSE_FOOTER_ID = "docBulkExportCancel";
  const SELECT_ALL_ID = "docBulkExportSelectAll";
  const UNSELECT_ALL_ID = "docBulkExportUnselectAll";
  const CONFIRM_EXPORT_ID = "docBulkExportConfirm";
  const PAGE_ID = "docBulkExportPage";
  const PAGE_INPUT_ID = "docBulkExportPageInput";
  const TOTAL_PAGES_ID = "docBulkExportTotalPages";
  const PREV_ID = "docBulkExportPrev";
  const NEXT_ID = "docBulkExportNext";
  const SEARCH_INPUT_ID = "docBulkExportSearchNumber";
  const YEAR_SELECT_ID = "docBulkExportYearFilter";
  const YEAR_MENU_ID = "docBulkExportYearMenu";
  const YEAR_LABEL_ID = "docBulkExportYearLabel";
  const YEAR_DISPLAY_ID = "docBulkExportYearDisplay";
  const YEAR_PANEL_ID = "docBulkExportYearPanel";
  const OPEN_LOCATION_ID = "docBulkExportOpenLocation";
  const EMAIL_ENABLED_ID = "docBulkExportSendEmail";
  const EMAIL_MODAL_ID = "docBulkExportEmailModal";
  const EMAIL_MODAL_TITLE_ID = "docBulkExportEmailModalTitle";
  const EMAIL_MODAL_CLOSE_ID = "docBulkExportEmailModalClose";
  const EMAIL_MODAL_FORM_ID = "docBulkExportEmailModalForm";
  const EMAIL_MODAL_TO_ID = "docBulkExportEmailTo";
  const EMAIL_MODAL_SUBJECT_ID = "docBulkExportEmailSubject";
  const EMAIL_MODAL_BODY_ID = "docBulkExportEmailBody";
  const EMAIL_MODAL_ATTACHMENTS_ID = "docBulkExportEmailAttachments";
  const EMAIL_MODAL_STATUS_ID = "docBulkExportEmailModalStatus";
  const EMAIL_MODAL_CANCEL_ID = "docBulkExportEmailModalCancel";
  const EMAIL_MODAL_SEND_ID = "docBulkExportEmailModalSend";
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
  const normalizeEmailText = (value) => String(value ?? "").trim().replace(/\s+/g, "");

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
    <div id="${MODAL_ID}" class="swbDialog doc-history-modal doc-bulk-export-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-history-modal__panel doc-bulk-export-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="${TITLE_ID}" class="swbDialog__title">Exporter des documents</div>
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
        <div class="swbDialog__msg doc-history-modal__body doc-bulk-export-modal__body">
          <div class="doc-bulk-export-modal__toolbar">
            <div class="doc-bulk-export-modal__filters">
              <label class="doc-bulk-export-modal__search" for="${SEARCH_INPUT_ID}">
                <span class="doc-bulk-export-modal__search-label">Numero</span>
                <input
                  id="${SEARCH_INPUT_ID}"
                  class="doc-bulk-export-modal__search-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Rechercher par numero"
                  aria-label="Rechercher un document par numero"
                />
              </label>
              <label class="doc-bulk-export-modal__year">
                <span id="${YEAR_LABEL_ID}" class="doc-bulk-export-modal__search-label">Annee</span>
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
            <div class="doc-bulk-export-modal__selection-tools">
              <div class="doc-bulk-export-modal__selection-buttons">
                <button id="${SELECT_ALL_ID}" type="button" class="client-search__edit">Tout selectionner</button>
                <button id="${UNSELECT_ALL_ID}" type="button" class="client-search__edit">Tout deselectionner</button>
              </div>
            </div>
          </div>
          <div id="${GRID_ID}" class="doc-history-modal__list doc-bulk-export-modal__grid" role="list"></div>
          <p id="${STATUS_ID}" class="doc-history-modal__status doc-bulk-export-modal__status" aria-live="polite"></p>
        </div>
        <div class="doc-bulk-export-modal__post-body-tools">
          <div class="doc-bulk-export-modal__post-body-main-action">
            <button id="${CONFIRM_EXPORT_ID}" type="button" class="client-search__add" disabled>Exporter PDF</button>
          </div>
          <div class="doc-bulk-export-modal__post-body-secondary">
            <div class="doc-bulk-export-modal__folder-tools">
              <label class="doc-bulk-export-modal__open-location">
                <input id="${OPEN_LOCATION_ID}" type="checkbox" />
                <span>Ouvrir l'emplacement apres export</span>
              </label>
            </div>
            <div class="doc-bulk-export-modal__email-tools">
              <label class="doc-bulk-export-modal__send-email-toggle">
                <input id="${EMAIL_ENABLED_ID}" type="checkbox" />
                <span>Envoyer les PDF exportes par e-mail</span>
              </label>
            </div>
          </div>
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

  const buildEmailModalMarkup = () => `
    <div id="${EMAIL_MODAL_ID}" class="swbDialog doc-bulk-export-email-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-bulk-export-email-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${EMAIL_MODAL_TITLE_ID}">
        <div class="swbDialog__header">
          <div id="${EMAIL_MODAL_TITLE_ID}" class="swbDialog__title">Envoyer les PDF exportes par e-mail</div>
          <button id="${EMAIL_MODAL_CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <form id="${EMAIL_MODAL_FORM_ID}" class="swbDialog__msg doc-bulk-export-email-modal__body" novalidate>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_TO_ID}">
            <span>Destinataire</span>
            <input id="${EMAIL_MODAL_TO_ID}" type="email" autocomplete="off" placeholder="client@email.com" />
          </label>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_SUBJECT_ID}">
            <span>Objet</span>
            <input id="${EMAIL_MODAL_SUBJECT_ID}" type="text" autocomplete="off" />
          </label>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_BODY_ID}">
            <span>Message</span>
            <textarea id="${EMAIL_MODAL_BODY_ID}" rows="6"></textarea>
          </label>
          <div class="doc-bulk-export-email-modal__attachments-block">
            <span class="doc-bulk-export-email-modal__attachments-title">Pieces jointes PDF</span>
            <div id="${EMAIL_MODAL_ATTACHMENTS_ID}" class="doc-bulk-export-email-modal__attachments"></div>
          </div>
          <p id="${EMAIL_MODAL_STATUS_ID}" class="doc-bulk-export-email-modal__status" aria-live="polite"></p>
        </form>
        <div class="swbDialog__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${EMAIL_MODAL_CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="${EMAIL_MODAL_SEND_ID}" type="submit" form="${EMAIL_MODAL_FORM_ID}" class="swbDialog__ok">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureEmailModal = () => {
    if (typeof document === "undefined") return null;
    let modal = document.getElementById(EMAIL_MODAL_ID);
    if (modal) return modal;
    const host = document.getElementById("app") || document.body;
    if (!host) return null;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildEmailModalMarkup().trim();
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
    const confirmExportBtn = modal.querySelector(`#${CONFIRM_EXPORT_ID}`);
    const openLocationInput = modal.querySelector(`#${OPEN_LOCATION_ID}`);
    const sendEmailInput = modal.querySelector(`#${EMAIL_ENABLED_ID}`);
    const emailModal = ensureEmailModal();
    const emailModalCloseBtn = emailModal?.querySelector(`#${EMAIL_MODAL_CLOSE_ID}`) || null;
    const emailModalForm = emailModal?.querySelector(`#${EMAIL_MODAL_FORM_ID}`) || null;
    const emailModalToInput = emailModal?.querySelector(`#${EMAIL_MODAL_TO_ID}`) || null;
    const emailModalSubjectInput = emailModal?.querySelector(`#${EMAIL_MODAL_SUBJECT_ID}`) || null;
    const emailModalBodyInput = emailModal?.querySelector(`#${EMAIL_MODAL_BODY_ID}`) || null;
    const emailModalAttachments = emailModal?.querySelector(`#${EMAIL_MODAL_ATTACHMENTS_ID}`) || null;
    const emailModalStatusEl = emailModal?.querySelector(`#${EMAIL_MODAL_STATUS_ID}`) || null;
    const emailModalCancelBtn = emailModal?.querySelector(`#${EMAIL_MODAL_CANCEL_ID}`) || null;
    const emailModalSendBtn = emailModal?.querySelector(`#${EMAIL_MODAL_SEND_ID}`) || null;
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
    const canOpenExportFolder =
      !!w.electronAPI?.showInFolder ||
      !!w.electronAPI?.openInvoiceFolder ||
      !!w.electronAPI?.openPath;
    const canSendEmailApi = typeof w.electronAPI?.sendSmtpEmail === "function";

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
      lastExportPath: "",
      emailDraft: {
        to: "",
        subject: "",
        body: ""
      },
      pendingPromise: null,
      resolvePending: null,
      restoreFocus: null
    };

    const emailComposerState = {
      attachments: [],
      busy: false,
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
    const resolveCompanySmtpSettings = () => {
      const company = w.SEM?.state?.company || {};
      const profiles =
        company.smtpProfiles && typeof company.smtpProfiles === "object"
          ? company.smtpProfiles
          : company.smtp && typeof company.smtp === "object"
            ? { professional: company.smtp }
            : {};
      const preset =
        (company.smtpPreset && profiles[company.smtpPreset] && company.smtpPreset) ||
        (profiles.gmail && !profiles.professional ? "gmail" : "professional");
      const smtpRaw =
        profiles[preset] && typeof profiles[preset] === "object" ? profiles[preset] : {};
      const secure = !!smtpRaw.secure;
      const portValue = Number(smtpRaw.port);
      const fallbackPort = preset === "gmail" ? (secure ? 465 : 587) : secure ? 465 : 587;
      const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : fallbackPort;
      const hostValue = preset === "gmail" ? "smtp.gmail.com" : smtpRaw.host;
      return {
        enabled: !!smtpRaw.enabled,
        host: String(hostValue || "").trim(),
        port,
        secure,
        user: String(smtpRaw.user || "").trim(),
        pass: String(smtpRaw.pass ?? ""),
        fromEmail: normalizeEmailText(smtpRaw.fromEmail || company.email || smtpRaw.user || ""),
        fromName: String(smtpRaw.fromName || company.name || "").trim()
      };
    };
    const isSmtpReady = (smtp) =>
      !!(
        smtp &&
        smtp.enabled &&
        smtp.host &&
        smtp.port &&
        smtp.fromEmail &&
        canSendEmailApi
      );
    const buildDefaultEmailSubject = (count = 1) =>
      `${sourceLabel()}${count > 1 ? "s" : ""} exporte${count > 1 ? "s" : ""} - PDF`;
    const buildDefaultEmailBody = (count = 1) =>
      `Bonjour,\n\nVeuillez trouver en pieces jointes le${count > 1 ? "s" : ""} document${count > 1 ? "s" : ""} exporte${count > 1 ? "s" : ""}.\n\nCordialement.`;
    const isEmailSendingEnabled = () => !!sendEmailInput?.checked;
    const syncEmailControls = () => {
      if (!sendEmailInput) return;
      const shouldDisable = state.busy || !canSendEmailApi;
      sendEmailInput.disabled = shouldDisable;
      // Preserve user choice while export is running; only clear when API is unavailable.
      if (!canSendEmailApi && sendEmailInput.checked) {
        sendEmailInput.checked = false;
      }
    };
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
      if (openLocationInput) openLocationInput.disabled = state.busy || !canOpenExportFolder;
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
      syncEmailControls();
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
      if (confirmExportBtn) {
        confirmExportBtn.disabled = state.busy || !hasEntries || selected < 1;
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
          `${selected} document(s) selectionne(s) pour export sur ${total} resultat(s) (${totalEntriesCount()} total).`
        );
        return;
      }
      setStatus(`${selected} document(s) selectionne(s) pour export sur ${total}.`);
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
      chip.className = "doc-bulk-export-modal__meta-chip";
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
        card.className = "doc-bulk-export-modal__card";
        card.setAttribute("role", "listitem");
        card.setAttribute("data-entry-key", entry.key);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "doc-bulk-export-modal__checkbox";
        checkbox.dataset.entryKey = entry.key;
        checkbox.checked = state.selectedKeys.has(entry.key);
        checkbox.disabled = state.busy;
        checkbox.setAttribute("aria-label", `Selectionner ${entry.displayName}`);

        const content = document.createElement("span");
        content.className = "doc-bulk-export-modal__card-content";

        const mainRow = document.createElement("span");
        mainRow.className = "doc-bulk-export-modal__card-main";

        const title = document.createElement("span");
        title.className = "doc-bulk-export-modal__card-title";
        title.textContent = entry.displayName;

        const details = document.createElement("span");
        details.className = "doc-bulk-export-modal__card-meta";
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
      if (titleEl) titleEl.textContent = `Exporter des documents - ${label}`;
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
      if (emailComposerState.pendingPromise && !emailComposerState.busy) {
        closeEmailComposeModal({ ok: false, canceled: true });
      }
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

    const openExportDirectory = async (filePath = "") => {
      const resolvedPath = String(filePath || "").trim();
      if (resolvedPath && typeof w.electronAPI?.showInFolder === "function") {
        try {
          const opened = await w.electronAPI.showInFolder(resolvedPath);
          if (opened) return { ok: true, path: resolvedPath };
        } catch {}
      }
      if (typeof w.electronAPI?.openInvoiceFolder === "function") {
        try {
          const res = await w.electronAPI.openInvoiceFolder({
            docType: state.docType,
            scope: "pdf"
          });
          if (res?.ok) return { ok: true, path: String(res.path || "").trim() };
          if (res?.error) return { ok: false, error: String(res.error) };
        } catch (err) {
          return {
            ok: false,
            error: String(err?.message || err || "Ouverture du dossier d'export impossible.")
          };
        }
      }
      if (resolvedPath && typeof w.electronAPI?.openPath === "function") {
        try {
          const opened = await w.electronAPI.openPath(resolvedPath);
          if (opened) return { ok: true, path: resolvedPath };
        } catch {}
      }
      return { ok: false, error: "Ouverture du dossier d'export impossible." };
    };

    const basenameFromPath = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const normalized = raw.replace(/\\/g, "/");
      const parts = normalized.split("/").filter(Boolean);
      return parts[parts.length - 1] || raw;
    };

    const setEmailModalStatus = (message, variant = "") => {
      if (!emailModalStatusEl) return;
      emailModalStatusEl.textContent = String(message || "");
      emailModalStatusEl.classList.toggle("is-warning", variant === "warning");
      emailModalStatusEl.classList.toggle("is-success", variant === "success");
    };

    const setEmailModalBusy = (busy) => {
      emailComposerState.busy = !!busy;
      if (emailModal) {
        if (emailComposerState.busy) emailModal.setAttribute("aria-busy", "true");
        else emailModal.removeAttribute("aria-busy");
      }
      if (emailModalCloseBtn) emailModalCloseBtn.disabled = emailComposerState.busy;
      if (emailModalCancelBtn) emailModalCancelBtn.disabled = emailComposerState.busy;
      if (emailModalSendBtn) {
        emailModalSendBtn.disabled =
          emailComposerState.busy || emailComposerState.attachments.length < 1;
      }
      if (emailModalToInput) emailModalToInput.disabled = emailComposerState.busy;
      if (emailModalSubjectInput) emailModalSubjectInput.disabled = emailComposerState.busy;
      if (emailModalBodyInput) emailModalBodyInput.disabled = emailComposerState.busy;
    };

    const renderEmailModalAttachments = () => {
      if (!emailModalAttachments) return;
      emailModalAttachments.innerHTML = "";
      if (!emailComposerState.attachments.length) {
        const empty = document.createElement("div");
        empty.className = "doc-bulk-export-email-modal__attachments-empty";
        empty.textContent = "Aucune piece jointe.";
        emailModalAttachments.appendChild(empty);
        return;
      }
      const list = document.createElement("ul");
      list.className = "doc-bulk-export-email-modal__attachments-list";
      emailComposerState.attachments.forEach((pathValue, index) => {
        const item = document.createElement("li");
        item.className = "doc-bulk-export-email-modal__attachments-item";
        item.title = String(pathValue || "");

        const name = document.createElement("span");
        name.className = "email-compose-modal__attachment-name doc-bulk-export-email-modal__attachment-name";
        name.textContent = basenameFromPath(pathValue);
        name.title = String(pathValue || "");

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "email-compose-modal__attachment-remove";
        removeBtn.dataset.historyEmailAttachmentRemove = "pdf";
        removeBtn.dataset.bulkExportAttachmentIndex = String(index);
        removeBtn.setAttribute("aria-label", "Retirer PDF");
        removeBtn.title = "Retirer PDF";
        removeBtn.innerHTML = CLOSE_ICON_SVG;

        item.append(name, removeBtn);
        list.appendChild(item);
      });
      emailModalAttachments.appendChild(list);
    };

    const showEmailModal = () => {
      if (!emailModal) return;
      emailModal.hidden = false;
      emailModal.removeAttribute("hidden");
      emailModal.setAttribute("aria-hidden", "false");
      emailModal.classList.add("is-open");
    };

    const hideEmailModal = () => {
      if (!emailModal) return;
      emailModal.classList.remove("is-open");
      emailModal.hidden = true;
      emailModal.setAttribute("hidden", "");
      emailModal.setAttribute("aria-hidden", "true");
    };

    const finalizeEmailModal = (result) => {
      if (typeof emailComposerState.resolvePending === "function") {
        emailComposerState.resolvePending(result);
      }
      emailComposerState.resolvePending = null;
      emailComposerState.pendingPromise = null;
    };

    const closeEmailComposeModal = (result = { ok: false, canceled: true }) => {
      if (emailComposerState.busy) return;
      hideEmailModal();
      document.removeEventListener("keydown", onEmailModalKeydown, true);
      const focusTarget = emailComposerState.restoreFocus;
      emailComposerState.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
      finalizeEmailModal(result);
    };

    const onEmailModalKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      closeEmailComposeModal({ ok: false, canceled: true });
    };

    const handleEmailComposeSubmit = async () => {
      if (emailComposerState.busy) return;
      if (!emailComposerState.attachments.length) {
        setEmailModalStatus("Aucune piece jointe PDF a envoyer.", "warning");
        return;
      }
      const to = normalizeEmailText(emailModalToInput?.value || "");
      if (!to) {
        const message = "Veuillez saisir un destinataire.";
        setEmailModalStatus(message, "warning");
        emailModalToInput?.focus?.();
        return;
      }

      const smtp = resolveCompanySmtpSettings();
      if (!isSmtpReady(smtp)) {
        const message =
          "SMTP desactive ou incomplet. Configurez SMTP dans Donnees generales pour envoyer les pieces jointes.";
        setEmailModalStatus(message, "warning");
        return;
      }

      const subject =
        String(emailModalSubjectInput?.value || "").trim() ||
        buildDefaultEmailSubject(emailComposerState.attachments.length);
      const body =
        String(emailModalBodyInput?.value || "").trim() ||
        buildDefaultEmailBody(emailComposerState.attachments.length);
      const attachments = emailComposerState.attachments.map((pathValue) => ({ path: pathValue }));

      setEmailModalBusy(true);
      setEmailModalStatus("Envoi e-mail en cours...");
      let res = null;
      try {
        res = await w.electronAPI.sendSmtpEmail({
          smtp,
          message: { to, subject, text: body, attachments }
        });
      } catch (err) {
        res = { ok: false, error: String(err?.message || err || "Envoi SMTP impossible.") };
      }
      if (res?.ok) {
        state.emailDraft.to = to;
        state.emailDraft.subject = subject;
        state.emailDraft.body = body;
        setEmailModalBusy(false);
        if (typeof w.showToast === "function") {
          w.showToast("E-mail envoye avec pieces jointes.");
        }
        closeEmailComposeModal({ ok: true, canceled: false });
        return;
      }
      const errorText = String(res?.error || "Envoi SMTP impossible.");
      setEmailModalBusy(false);
      setEmailModalStatus(errorText, "warning");
    };

    const openEmailComposeModal = ({ attachments = [], trigger = null } = {}) => {
      if (!emailModal || !emailModalToInput || !emailModalSubjectInput || !emailModalBodyInput) {
        return Promise.resolve({
          ok: false,
          canceled: false,
          error: "Fenetre d'e-mail indisponible."
        });
      }
      if (emailComposerState.pendingPromise) return emailComposerState.pendingPromise;
      const uniquePaths = Array.from(
        new Set(
          (Array.isArray(attachments) ? attachments : [])
            .map((pathValue) => String(pathValue || "").trim())
            .filter(Boolean)
        )
      );
      emailComposerState.pendingPromise = new Promise((resolve) => {
        emailComposerState.resolvePending = resolve;
      });
      emailComposerState.restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      emailComposerState.attachments = uniquePaths;
      emailModalToInput.value = state.emailDraft.to || "";
      emailModalSubjectInput.value =
        state.emailDraft.subject || buildDefaultEmailSubject(uniquePaths.length);
      emailModalBodyInput.value =
        state.emailDraft.body || buildDefaultEmailBody(uniquePaths.length);
      setEmailModalBusy(false);
      renderEmailModalAttachments();
      const smtpReady = isSmtpReady(resolveCompanySmtpSettings());
      setEmailModalStatus(
        smtpReady
          ? "Verifiez les champs puis cliquez sur Envoyer."
          : "SMTP desactive ou incomplet. Configurez SMTP avant l'envoi.",
        smtpReady ? "" : "warning"
      );
      showEmailModal();
      document.addEventListener("keydown", onEmailModalKeydown, true);
      emailModalToInput.focus?.();
      return emailComposerState.pendingPromise;
    };

    const sendExportedDocumentsByEmail = async (exportedPaths = []) => {
      if (!canSendEmailApi) {
        const message = "Envoi e-mail indisponible dans ce mode.";
        await w.showDialog?.(message, { title: "E-mail" });
        return false;
      }
      const uniquePaths = Array.from(
        new Set(
          (Array.isArray(exportedPaths) ? exportedPaths : [])
            .map((pathValue) => String(pathValue || "").trim())
            .filter(Boolean)
        )
      );
      if (!uniquePaths.length) {
        const message = "Aucun fichier PDF exporte a envoyer.";
        await w.showDialog?.(message, { title: "E-mail" });
        return false;
      }
      const res = await openEmailComposeModal({ attachments: uniquePaths, trigger: confirmExportBtn });
      return !!res?.ok;
    };

    const confirmExportSelection = async () => {
      if (state.busy) return;
      const selectedEntries = getSelectedEntries();
      if (!selectedEntries.length) return;

      if (!w.electronAPI?.openInvoiceJSON || typeof w.exportInvoiceDataAsPDF !== "function") {
        await w.showDialog?.("Export PDF de document indisponible.", { title: "Erreur" });
        return;
      }

      state.error = "";
      setBusy(true);
      syncStatus();

      let exportedCount = 0;
      let canceledCount = 0;
      let firstExportPath = "";
      const exportedPaths = [];
      const failed = [];
      const overwritePolicy = {
        askOnce: true,
        replaceAll: null
      };
      for (const entry of selectedEntries) {
        let raw = null;
        let loadError = "";
        try {
          raw = await w.electronAPI.openInvoiceJSON({
            path: entry.path,
            number: entry.number || entry.displayName,
            docType: state.docType
          });
        } catch (err) {
          raw = null;
          loadError = String(err?.message || err || "Chargement impossible.");
        }
        if (!raw) {
          failed.push(`${entry.displayName}: ${loadError || "Chargement du document impossible."}`);
          continue;
        }
        const rawObject = raw && typeof raw === "object" ? raw : null;
        const dataObject =
          rawObject && rawObject.data && typeof rawObject.data === "object"
            ? rawObject.data
            : rawObject;
        if (dataObject && typeof dataObject === "object") {
          const meta =
            dataObject.meta && typeof dataObject.meta === "object"
              ? dataObject.meta
              : (dataObject.meta = {});
          if (!String(meta.docType || "").trim()) meta.docType = state.docType;
        }

        let exportRes = null;
        try {
          exportRes = await w.exportInvoiceDataAsPDF(raw, {
            historyPath: entry.path,
            historyDocType: state.docType,
            suppressPrompt: true,
            suppressOpenDialog: true,
            overwritePolicy
          });
        } catch (err) {
          exportRes = {
            ok: false,
            canceled: false,
            error: String(err?.message || err || "Export PDF impossible.")
          };
        }

        if (exportRes?.ok) {
          exportedCount += 1;
          const pathValue = String(exportRes?.invoicePath || "").trim();
          if (pathValue) {
            if (!firstExportPath) firstExportPath = pathValue;
            exportedPaths.push(pathValue);
          }
          continue;
        }
        if (exportRes?.canceled) {
          canceledCount += 1;
          continue;
        }
        failed.push(`${entry.displayName}: ${String(exportRes?.error || "Export PDF impossible.")}`);
      }

      setBusy(false);
      if (firstExportPath) state.lastExportPath = firstExportPath;

      if (exportedCount > 0 && typeof w.showToast === "function") {
        w.showToast(`${exportedCount} document(s) exporte(s) en PDF.`);
      }
      if (failed.length) {
        const title = exportedCount > 0 ? "Export partiel" : "Export impossible";
        const preview = failed.slice(0, 5).join("\n");
        await w.showDialog?.(preview, { title });
      }
      if (canceledCount > 0 && exportedCount < 1 && failed.length < 1) {
        await w.showDialog?.("Export annule.", { title: "Export PDF" });
      }

      if (exportedCount > 0 && isEmailSendingEnabled()) {
        await sendExportedDocumentsByEmail(exportedPaths);
      }

      if (exportedCount > 0 && openLocationInput?.checked) {
        const openRes = await openExportDirectory(firstExportPath || state.lastExportPath);
        if (!openRes?.ok) {
          await w.showDialog?.(
            String(openRes?.error || "Ouverture du dossier d'export impossible."),
            { title: "Export PDF" }
          );
        }
      }

      await loadEntries({ preserveSelection: false });
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      if (emailComposerState.pendingPromise) {
        closeEmailComposeModal({ ok: false, canceled: true });
        return;
      }
      if (yearMenu?.open) {
        setYearFilterMenuState(false);
        yearMenuToggle?.focus?.();
        return;
      }
      closeModal({ ok: false, canceled: true });
    };

    const onGridChange = (evt) => {
      const checkbox = evt.target?.closest?.(".doc-bulk-export-modal__checkbox");
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
      state.lastExportPath = "";
      if (searchInput) searchInput.value = "";
      if (openLocationInput) {
        openLocationInput.checked = false;
        if (!canOpenExportFolder) openLocationInput.disabled = true;
      }
      setDocType(docType || "facture");
      if (sendEmailInput) sendEmailInput.checked = false;
      if (emailComposerState.pendingPromise && !emailComposerState.busy) {
        closeEmailComposeModal({ ok: false, canceled: true });
      }
      syncYearOptions();
      syncEmailControls();

      showModal();
      document.addEventListener("keydown", onKeydown, true);
      renderEntries();

      await loadEntries({ preserveSelection: false });

      if (state.entries.length) {
        const firstCheck = modal.querySelector(".doc-bulk-export-modal__checkbox");
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
    confirmExportBtn?.addEventListener("click", () => {
      void confirmExportSelection();
    });
    sendEmailInput?.addEventListener("change", () => {
      syncEmailControls();
    });
    emailModalCloseBtn?.addEventListener("click", () =>
      closeEmailComposeModal({ ok: false, canceled: true })
    );
    emailModalCancelBtn?.addEventListener("click", () =>
      closeEmailComposeModal({ ok: false, canceled: true })
    );
    emailModalForm?.addEventListener("submit", (evt) => {
      evt.preventDefault();
      void handleEmailComposeSubmit();
    });
    emailModalAttachments?.addEventListener("click", (evt) => {
      const targetEl = evt.target instanceof Element ? evt.target : null;
      const removeBtn = targetEl?.closest("[data-history-email-attachment-remove]");
      if (!removeBtn || emailComposerState.busy) return;
      evt.preventDefault();
      const rawIndex = String(removeBtn.dataset.bulkExportAttachmentIndex || "").trim();
      const idx = Number.parseInt(rawIndex, 10);
      if (!Number.isFinite(idx) || idx < 0 || idx >= emailComposerState.attachments.length) return;
      const removed = emailComposerState.attachments.splice(idx, 1);
      renderEmailModalAttachments();
      setEmailModalBusy(false);
      if (!emailComposerState.attachments.length) {
        setEmailModalStatus("Aucune piece jointe. Ajoutez des PDF avant l'envoi.", "warning");
        return;
      }
      setEmailModalStatus(`Piece jointe retiree: ${basenameFromPath(removed[0])}.`);
    });
    emailModal?.addEventListener("click", (evt) => {
      if (evt.target === emailModal) {
        evt.stopPropagation();
      }
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
        message: "Choisissez la source de document a exporter :",
        options: normalizedChoices.map((entry) => ({
          label: entry.label,
          value: entry.docType
        })),
        initialChoice: initialChoice >= 0 ? initialChoice : 0
      });
    } catch (err) {
      console.warn("doc bulk export source chooser failed", err);
      return fallback;
    }
    if (pickedIndex === null || pickedIndex === undefined) return "";
    const picked = normalizedChoices[Number(pickedIndex)] || normalizedChoices[0];
    return normalizeDocType(picked?.docType || fallback, fallback);
  };

  const openDocumentBulkExport = async (trigger = null, choices = DEFAULT_DOC_TYPE_CHOICES) => {
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
      await w.showDialog?.("Fenetre d'export indisponible.", { title: "Erreur" });
      return { ok: false, canceled: false };
    }
    return await controller.open({ docType: pickedDocType, trigger });
  };

  AppInit.registerDocumentBulkExportActions = function registerDocumentBulkExportActions(ctx = {}) {
    const triggerBtn = getEl("docTypeActionExport");
    if (!triggerBtn || triggerBtn.dataset.bulkExportBound === "1") return;
    triggerBtn.dataset.bulkExportBound = "1";
    const choices = toDocTypeChoices(ctx.docTypeChoices);
    triggerBtn.addEventListener("click", () => {
      void openDocumentBulkExport(triggerBtn, choices);
    });
  };

  AppInit.DocumentBulkExport = {
    open: (trigger = null, options = {}) =>
      openDocumentBulkExport(
        trigger,
        options.docTypeChoices || options.choices || DEFAULT_DOC_TYPE_CHOICES
      )
  };
})(window);

