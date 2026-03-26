(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl = w.getEl || ((id) => document.getElementById(id));

  const SOURCE_TYPE_DIALOG_ID = "beReceptionSourcePickerDialog";
  const SOURCE_TYPE_DIALOG_TITLE_ID = "beReceptionSourcePickerDialogTitle";
  const SOURCE_TYPE_DIALOG_MESSAGE_ID = "beReceptionSourcePickerDialogMessage";
  const SOURCE_TYPE_DIALOG_OPTIONS_ID = "beReceptionSourcePickerDialogOptions";
  const SOURCE_TYPE_DIALOG_CLOSE_ID = "beReceptionSourcePickerDialogClose";
  const SOURCE_TYPE_DIALOG_CANCEL_ID = "beReceptionSourcePickerDialogCancel";
  const MODAL_ID = "beSourceDocumentPickerModal";
  const TITLE_ID = "beSourceDocumentPickerTitle";
  const GRID_ID = "beSourceDocumentPickerGrid";
  const STATUS_ID = "beSourceDocumentPickerStatus";
  const REFRESH_ID = "beSourceDocumentPickerRefresh";
  const CLOSE_ID = "beSourceDocumentPickerClose";
  const CLOSE_FOOTER_ID = "beSourceDocumentPickerCancel";
  const SELECT_ALL_ID = "beSourceDocumentPickerSelectAll";
  const UNSELECT_ALL_ID = "beSourceDocumentPickerUnselectAll";
  const CONFIRM_ID = "beSourceDocumentPickerConfirm";
  const PAGE_ID = "beSourceDocumentPickerPage";
  const PAGE_INPUT_ID = "beSourceDocumentPickerPageInput";
  const TOTAL_PAGES_ID = "beSourceDocumentPickerTotalPages";
  const PREV_ID = "beSourceDocumentPickerPrev";
  const NEXT_ID = "beSourceDocumentPickerNext";
  const SEARCH_INPUT_ID = "beSourceDocumentPickerSearchNumber";
  const SUPPLIER_FIELD_ID = "beSourceDocumentPickerSupplierField";
  const SUPPLIER_INPUT_ID = "beSourceDocumentPickerSupplier";
  const SUPPLIER_PANEL_ID = "beSourceDocumentPickerSupplierPanel";
  const SUPPLIER_LABEL_ID = "beSourceDocumentPickerSupplierLabel";
  const YEAR_SELECT_ID = "beSourceDocumentPickerYearFilter";
  const YEAR_MENU_ID = "beSourceDocumentPickerYearMenu";
  const YEAR_LABEL_ID = "beSourceDocumentPickerYearLabel";
  const YEAR_DISPLAY_ID = "beSourceDocumentPickerYearDisplay";
  const YEAR_PANEL_ID = "beSourceDocumentPickerYearPanel";
  const PAGE_SIZE = 20;
  const SUPPLIER_FETCH_LIMIT = 200;

  const DOC_TYPE_LABELS = {
    fa: "Facture d'achat",
    bc: "Bon de commande"
  };
  const SELECTABLE_DOC_TYPES = new Set(Object.keys(DOC_TYPE_LABELS));
  const DEFAULT_DOC_TYPE_CHOICES = [
    { docType: "fa", label: DOC_TYPE_LABELS.fa },
    { docType: "bc", label: DOC_TYPE_LABELS.bc }
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

  const normalizeDocType = (value, fallback = "fa") => {
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
    const normalized = aliases[raw] || raw;
    if (SELECTABLE_DOC_TYPES.has(normalized)) return normalized;
    return SELECTABLE_DOC_TYPES.has(fallback) ? fallback : "fa";
  };

  const docTypeLabel = (value) => DOC_TYPE_LABELS[normalizeDocType(value)] || "Document";

  const toDocTypeChoices = (choices) => {
    const source = Array.isArray(choices) && choices.length ? choices : DEFAULT_DOC_TYPE_CHOICES;
    const out = [];
    const seen = new Set();
    source.forEach((entry) => {
      const docType = normalizeDocType(entry?.docType || entry?.value || entry?.type || entry, "");
      if (!docType || seen.has(docType) || !SELECTABLE_DOC_TYPES.has(docType)) return;
      seen.add(docType);
      const label = String(entry?.label || DOC_TYPE_LABELS[docType] || docType).trim() || DOC_TYPE_LABELS[docType];
      out.push({ docType, label });
    });
    return out.length ? out : DEFAULT_DOC_TYPE_CHOICES.slice();
  };

  const extractDocumentLabel = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    const sqlitePrefix = "sqlite://documents/";
    if (str.startsWith(sqlitePrefix)) return str.slice(sqlitePrefix.length);
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

  const normalizeSearchToken = (value) => {
    const base = String(value || "").trim().toLowerCase();
    if (!base) return "";
    try {
      return base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch {
      return base;
    }
  };

  const truncatePanelLabel = (value, maxChars = 40) => {
    const text = String(value || "");
    if (!text || text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}...`;
  };

  const buildSupplierOptionLabel = (supplier = {}) => {
    const name = String(supplier?.name || supplier?.client?.name || "").trim() || "Sans nom";
    const identifier = String(supplier?.identifier || "").trim();
    return identifier ? `${name} (${identifier})` : name;
  };

  const normalizeSupplierOption = (rawSupplier, index = 0) => {
    const supplier = rawSupplier && typeof rawSupplier === "object" ? rawSupplier : {};
    const path = String(supplier?.path || supplier?.client?.__path || "").trim();
    const name = String(supplier?.name || supplier?.client?.name || "").trim();
    const identifier = String(supplier?.identifier || "").trim();
    const label = buildSupplierOptionLabel(supplier);
    const key =
      path ||
      String(supplier?.id || "").trim() ||
      `${normalizeSearchToken(label) || "supplier"}:${index}`;
    return {
      key,
      path,
      name,
      identifier,
      label,
      searchToken: normalizeSearchToken(`${label} ${name} ${identifier}`)
    };
  };

  const getSortValue = (entry) => {
    const primary = String(entry?.number || "").trim();
    if (primary) return primary;
    const secondary = String(entry?.displayName || "").trim();
    if (secondary) return secondary;
    return String(entry?.path || "").trim();
  };

  const buildEntryKey = (entry, index = 0) => {
    const id = String(entry?.id || "").trim();
    const path = String(entry?.path || "").trim();
    const number = String(entry?.number || "").trim();
    const key = String(entry?.key || "").trim();
    if (key) return key;
    if (id) return `id:${id}`;
    if (path) return `path:${path}`;
    if (number) return `number:${number}:${index}`;
    return `idx:${index}`;
  };

  const normalizeEntry = (rawEntry, index) => {
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const id = String(entry.id || "").trim();
    const path = String(entry.path || "").trim();
    const number = String(entry.number || "").trim();
    const date = String(entry.date || "").trim();
    const displayName = getDisplayName(entry, index);
    return {
      key: buildEntryKey(entry, index),
      id,
      path,
      number,
      date,
      clientName: String(entry.clientName || "").trim(),
      clientPath: String(entry.clientPath || "").trim(),
      clientAccount: String(entry.clientAccount || "").trim(),
      clientEntityType: String(entry.clientEntityType || "").trim(),
      modifiedAt: String(entry.modifiedAt || "").trim(),
      createdAt: String(entry.createdAt || "").trim(),
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
        return { ok: false, error: String(err?.message || err || "Chargement des documents impossible.") };
      }
      if (!res?.ok) {
        return { ok: false, error: String(res?.error || "Chargement des documents impossible.") };
      }
      const batch = Array.isArray(res.items) ? res.items : [];
      items.push(...batch);
      if (Number.isFinite(Number(res.total))) total = Number(res.total);
      offset += batch.length;
      if (!batch.length) break;
      if (total !== null && offset >= total) break;
      if (batch.length < FETCH_LIMIT) break;
    }
    return { ok: true, items };
  };

  const buildSourceTypeDialogMarkup = () => `
    <div id="${SOURCE_TYPE_DIALOG_ID}" class="swbDialog be-reception-source-type-dialog" hidden aria-hidden="true">
      <div class="swbDialog__panel be-reception-source-type-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="${SOURCE_TYPE_DIALOG_TITLE_ID}" aria-describedby="${SOURCE_TYPE_DIALOG_MESSAGE_ID}">
        <div class="swbDialog__header">
          <div id="${SOURCE_TYPE_DIALOG_TITLE_ID}" class="swbDialog__title">Selectionner un document</div>
          <button id="${SOURCE_TYPE_DIALOG_CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="swbDialog__msg be-reception-source-type-dialog__body">
          <p id="${SOURCE_TYPE_DIALOG_MESSAGE_ID}" class="be-reception-source-type-dialog__message">
            Choisissez le type de document source :
          </p>
          <div id="${SOURCE_TYPE_DIALOG_OPTIONS_ID}" class="swbDialog__options be-reception-source-type-dialog__options" role="group" aria-labelledby="${SOURCE_TYPE_DIALOG_TITLE_ID}"></div>
        </div>
        <div class="swbDialog__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${SOURCE_TYPE_DIALOG_CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureSourceTypeDialog = () => {
    let modal = getEl(SOURCE_TYPE_DIALOG_ID);
    if (modal) return modal;
    const template = document.createElement("template");
    template.innerHTML = buildSourceTypeDialogMarkup().trim();
    modal = template.content.firstElementChild;
    document.body.appendChild(modal);
    return modal;
  };

  let sourceTypeDialogController = null;

  const createSourceTypeDialogController = () => {
    if (sourceTypeDialogController) return sourceTypeDialogController;
    const modal = ensureSourceTypeDialog();
    if (!modal) return null;

    const titleEl = modal.querySelector(`#${SOURCE_TYPE_DIALOG_TITLE_ID}`);
    const messageEl = modal.querySelector(`#${SOURCE_TYPE_DIALOG_MESSAGE_ID}`);
    const optionsEl = modal.querySelector(`#${SOURCE_TYPE_DIALOG_OPTIONS_ID}`);
    const closeBtn = modal.querySelector(`#${SOURCE_TYPE_DIALOG_CLOSE_ID}`);
    const cancelBtn = modal.querySelector(`#${SOURCE_TYPE_DIALOG_CANCEL_ID}`);

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

    const renderChoices = (choices, fallbackDocType) => {
      if (!optionsEl) return;
      optionsEl.replaceChildren();
      const choiceList = Array.isArray(choices) && choices.length ? choices : DEFAULT_DOC_TYPE_CHOICES;
      const preferredDocType = normalizeDocType(fallbackDocType || choiceList[0]?.docType || "fa", "fa");
      let preferredButton = null;
      choiceList.forEach((entry) => {
        const docType = normalizeDocType(entry?.docType || entry?.value || entry, "");
        if (!docType) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn better-style-v2";
        button.dataset.docType = docType;
        button.textContent = String(entry?.label || DOC_TYPE_LABELS[docType] || docType).trim() || DOC_TYPE_LABELS[docType];
        if (docType === preferredDocType && !preferredButton) {
          preferredButton = button;
        }
        button.addEventListener("click", () => {
          closeDialog(docType);
        });
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
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) evt.stopPropagation();
    });
    document.addEventListener("keydown", (evt) => {
      if (modal.hidden || modal.getAttribute("aria-hidden") === "true") return;
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      evt.stopPropagation();
      closeDialog("");
    });

    sourceTypeDialogController = {
      open: ({ choices, fallbackDocType, title, message, trigger } = {}) =>
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
          renderChoices(toDocTypeChoices(choices), fallbackDocType);
          modal.hidden = false;
          modal.removeAttribute("hidden");
          modal.setAttribute("aria-hidden", "false");
          modal.classList.add("is-open");
        })
    };

    return sourceTypeDialogController;
  };

  const buildModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog doc-history-modal be-source-document-picker-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-history-modal__panel be-source-document-picker-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="${TITLE_ID}" class="swbDialog__title">Selectionner un document</div>
            <button id="${REFRESH_ID}" type="button" class="btn ghost doc-history-modal__refresh" aria-label="Rafraichir les documents">
              ${REFRESH_ICON_SVG}
            </button>
          </div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="swbDialog__msg doc-history-modal__body be-source-document-picker-modal__body">
          <div class="be-source-document-picker-modal__toolbar">
            <div class="be-source-document-picker-modal__filters">
              <label id="${SUPPLIER_FIELD_ID}" class="be-source-document-picker-modal__supplier" for="${SUPPLIER_INPUT_ID}">
                <span id="${SUPPLIER_LABEL_ID}" class="be-source-document-picker-modal__search-label">Fournisseur</span>
                <div class="be-source-document-picker-modal__supplier-field">
                  <input
                    id="${SUPPLIER_INPUT_ID}"
                    class="be-source-document-picker-modal__search-input be-source-document-picker-modal__supplier-input"
                    type="text"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Selectionner un fournisseur"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-controls="${SUPPLIER_PANEL_ID}"
                    aria-labelledby="${SUPPLIER_LABEL_ID}"
                  />
                  <div
                    id="${SUPPLIER_PANEL_ID}"
                    class="field-toggle-panel model-select-panel be-source-document-picker-modal__supplier-panel"
                    role="listbox"
                    aria-labelledby="${SUPPLIER_LABEL_ID}"
                    hidden
                  ></div>
                </div>
              </label>
              <label class="be-source-document-picker-modal__search" for="${SEARCH_INPUT_ID}">
                <span class="be-source-document-picker-modal__search-label">Numero</span>
                <input id="${SEARCH_INPUT_ID}" class="be-source-document-picker-modal__search-input" type="text" autocomplete="off" spellcheck="false" placeholder="Rechercher par numero" aria-label="Rechercher un document par numero" />
              </label>
              <label class="be-source-document-picker-modal__year">
                <span id="${YEAR_LABEL_ID}" class="be-source-document-picker-modal__search-label">Annee</span>
                <div class="doc-dialog-model-picker__field">
                  <details id="${YEAR_MENU_ID}" class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu">
                    <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${YEAR_LABEL_ID} ${YEAR_DISPLAY_ID}">
                      <span id="${YEAR_DISPLAY_ID}" class="model-select-display">${getCurrentYearValue()}</span>
                      ${CHEVRON_ICON_SVG}
                    </summary>
                    <div id="${YEAR_PANEL_ID}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox" aria-labelledby="${YEAR_LABEL_ID}">
                      <button type="button" class="model-select-option" data-value="" role="option" aria-selected="false">Toutes</button>
                      <button type="button" class="model-select-option is-active" data-value="${getCurrentYearValue()}" role="option" aria-selected="true">${getCurrentYearValue()}</button>
                    </div>
                  </details>
                  <select id="${YEAR_SELECT_ID}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                    <option value="">Toutes</option>
                    <option value="${getCurrentYearValue()}" selected>${getCurrentYearValue()}</option>
                  </select>
                </div>
              </label>
            </div>
          </div>
          <div class="be-source-document-picker-modal__selection-tools">
            <div class="be-source-document-picker-modal__selection-buttons">
              <button id="${SELECT_ALL_ID}" type="button" class="client-search__edit">Tout selectionner</button>
              <button id="${UNSELECT_ALL_ID}" type="button" class="client-search__edit">Tout deselectionner</button>
            </div>
          </div>
          <div id="${GRID_ID}" class="doc-history-modal__list be-source-document-picker-modal__grid" role="list"></div>
          <div class="be-source-document-picker-modal__content-actions">
            <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
              <button id="${PREV_ID}" type="button" class="client-search__edit" disabled>Precedent</button>
              <span id="${PAGE_ID}" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
                Page
                <input id="${PAGE_INPUT_ID}" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input doc-history-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1" value="1" />
                / <span id="${TOTAL_PAGES_ID}">1</span>
              </span>
              <button id="${NEXT_ID}" type="button" class="client-search__edit" disabled>Suivant</button>
            </div>
            <div class="client-search__actions be-source-document-picker-modal__content-confirm">
              <button id="${CONFIRM_ID}" type="button" class="client-search__add" disabled>Ajouter</button>
            </div>
          </div>
          <p id="${STATUS_ID}" class="doc-history-modal__status be-source-document-picker-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions be-source-document-picker-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button id="${CLOSE_FOOTER_ID}" type="button" class="btn btn-close client-search__close">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureModal = () => {
    let modal = getEl(MODAL_ID);
    if (modal) return modal;
    const template = document.createElement("template");
    template.innerHTML = buildModalMarkup().trim();
    modal = template.content.firstElementChild;
    document.body.appendChild(modal);
    return modal;
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
    const confirmBtn = modal.querySelector(`#${CONFIRM_ID}`);
    const pageEl = modal.querySelector(`#${PAGE_ID}`);
    const pageInput = modal.querySelector(`#${PAGE_INPUT_ID}`);
    const totalPagesEl = modal.querySelector(`#${TOTAL_PAGES_ID}`);
    const prevBtn = modal.querySelector(`#${PREV_ID}`);
    const nextBtn = modal.querySelector(`#${NEXT_ID}`);
    const supplierField = modal.querySelector(`#${SUPPLIER_FIELD_ID}`);
    const supplierInput = modal.querySelector(`#${SUPPLIER_INPUT_ID}`);
    const supplierPanel = modal.querySelector(`#${SUPPLIER_PANEL_ID}`);
    const searchInput = modal.querySelector(`#${SEARCH_INPUT_ID}`);
    const yearSelect = modal.querySelector(`#${YEAR_SELECT_ID}`);
    const yearMenu = modal.querySelector(`#${YEAR_MENU_ID}`);
    const yearMenuToggle = yearMenu?.querySelector("summary") || null;
    const yearMenuDisplay = modal.querySelector(`#${YEAR_DISPLAY_ID}`);
    const yearMenuPanel = modal.querySelector(`#${YEAR_PANEL_ID}`);

    const state = {
      docType: "fa",
      busy: false,
      loading: false,
      error: "",
      entries: [],
      supplierOptions: [],
      suppliersLoaded: false,
      suppliersLoading: false,
      supplierQuery: "",
      selectedSupplier: null,
      suppressSupplierOpenUntil: 0,
      suppressNextSupplierFocusOpen: false,
      searchNumber: "",
      yearFilter: getCurrentYearValue(),
      page: 1,
      selectedKeys: new Set(),
      initialSelectedKeys: new Set(),
      loadToken: 0,
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
    const getSelectedSupplierLabel = () => String(state.selectedSupplier?.label || "").trim();
    const hasSelectedSupplier = () => !!getSelectedSupplierLabel();
    const getSelectedSupplierName = () =>
      String(state.selectedSupplier?.name || state.selectedSupplier?.label || "").trim();
    const setSupplierPanelOpen = (open) => {
      if (!supplierPanel || !supplierInput) return;
      const shouldOpen = !!open;
      supplierPanel.hidden = !shouldOpen;
      supplierPanel.style.display = shouldOpen ? "flex" : "none";
      supplierPanel.classList.toggle("is-open", shouldOpen);
      supplierInput.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    };
    const resetSupplierPanel = () => {
      if (!supplierPanel) return;
      supplierPanel.innerHTML = "";
      supplierPanel.hidden = true;
      supplierPanel.style.display = "none";
      supplierPanel.classList.remove("is-open");
      supplierInput?.setAttribute("aria-expanded", "false");
    };
    const listSupplierOptions = () => state.supplierOptions.slice();
    const filterSupplierOptions = (query) => {
      const token = normalizeSearchToken(query);
      const options = listSupplierOptions();
      if (!token) return options;
      return options.filter((item) => String(item?.searchToken || "").includes(token));
    };
    const rebuildSupplierPanel = (query) => {
      if (!supplierPanel) return;
      const panelDoc = supplierPanel.ownerDocument || document;
      supplierPanel.innerHTML = "";
      if (state.suppliersLoading) {
        const loading = panelDoc.createElement("p");
        loading.className = "model-select-empty";
        loading.textContent = "Chargement...";
        supplierPanel.appendChild(loading);
        return;
      }
      const filtered = filterSupplierOptions(query);
      if (!filtered.length) {
        const empty = panelDoc.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = state.supplierOptions.length
          ? "Aucun fournisseur."
          : "Aucun fournisseur disponible.";
        supplierPanel.appendChild(empty);
        return;
      }
      const fragment = panelDoc.createDocumentFragment();
      const activeKey = String(state.selectedSupplier?.key || "").trim();
      filtered.forEach((item) => {
        const btn = panelDoc.createElement("button");
        btn.type = "button";
        btn.className = "model-select-option";
        btn.dataset.supplierKey = item.key;
        btn.setAttribute("role", "option");
        const isActive = !!activeKey && item.key === activeKey;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.title = item.label;
        btn.textContent = truncatePanelLabel(item.label, 42);
        fragment.appendChild(btn);
      });
      supplierPanel.appendChild(fragment);
    };
    const syncSupplierInputValue = (value = "") => {
      if (!supplierInput) return;
      const nextValue = String(value || "");
      if (supplierInput.value !== nextValue) {
        supplierInput.value = nextValue;
      }
    };
    const clearLoadedEntries = () => {
      state.entries = [];
      state.selectedKeys = new Set();
      state.page = 1;
      state.error = "";
      syncYearOptions();
    };
    const clearSelectedSupplier = ({ keepInputValue = false } = {}) => {
      state.loadToken += 1;
      state.loading = false;
      state.selectedSupplier = null;
      clearLoadedEntries();
      setBusy(false);
      if (!keepInputValue) {
        state.supplierQuery = "";
        syncSupplierInputValue("");
      }
      renderEntries();
    };
    const resolveSupplierMatchesEntry = (entry, supplier) => {
      if (!entry || !supplier) return false;
      const entryPath = String(entry?.clientPath || "").trim();
      const supplierPath = String(supplier?.path || "").trim();
      if (supplierPath && entryPath) {
        return entryPath === supplierPath;
      }
      const entryName = normalizeSearchToken(entry?.clientName || "");
      const supplierName = normalizeSearchToken(supplier?.name || supplier?.label || "");
      return !!entryName && !!supplierName && entryName === supplierName;
    };
    const filterEntriesBySupplier = (items, supplier) =>
      (Array.isArray(items) ? items : []).filter((entry) =>
        resolveSupplierMatchesEntry(entry, supplier)
      );
    const loadSupplierOptions = async () => {
      if (state.suppliersLoading || state.suppliersLoaded) {
        rebuildSupplierPanel(state.supplierQuery || supplierInput?.value || "");
        return;
      }
      state.suppliersLoading = true;
      rebuildSupplierPanel(state.supplierQuery || supplierInput?.value || "");
      const suppliers = [];
      if (w.electronAPI?.searchClients) {
        let offset = 0;
        let total = null;
        try {
          while (true) {
            const res = await w.electronAPI.searchClients({
              query: "",
              limit: SUPPLIER_FETCH_LIMIT,
              offset,
              entityType: "vendor"
            });
            if (!res?.ok) break;
            const results = Array.isArray(res.results) ? res.results : [];
            suppliers.push(...results);
            const nextTotal = Number(res.total);
            if (Number.isFinite(nextTotal)) total = nextTotal;
            offset += results.length;
            if (!results.length) break;
            if (total !== null && offset >= total) break;
            if (results.length < SUPPLIER_FETCH_LIMIT) break;
          }
        } catch (err) {
          console.warn("be source supplier list failed", err);
        }
      }
      const deduped = new Map();
      suppliers.forEach((item, index) => {
        const normalized = normalizeSupplierOption(item, index);
        const mapKey = normalized.path || normalized.key || normalized.label;
        if (!normalized.label || deduped.has(mapKey)) return;
        deduped.set(mapKey, normalized);
      });
      state.supplierOptions = Array.from(deduped.values()).sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), undefined, {
          sensitivity: "base"
        })
      );
      state.suppliersLoaded = true;
      state.suppliersLoading = false;
      rebuildSupplierPanel(state.supplierQuery || supplierInput?.value || "");
    };
    const focusFirstSupplierOption = () => {
      const firstOption = supplierPanel?.querySelector?.(".model-select-option");
      if (firstOption && typeof firstOption.focus === "function") {
        try {
          firstOption.focus({ preventScroll: true });
        } catch {
          firstOption.focus();
        }
      }
    };
    const applySupplierSelection = async (option, { closePanel = true } = {}) => {
      if (!option || !option.label) return;
      state.selectedSupplier = option;
      state.supplierQuery = option.label;
      syncSupplierInputValue(option.label);
      rebuildSupplierPanel(option.label);
      if (closePanel) {
        state.suppressSupplierOpenUntil = Date.now() + 140;
        setSupplierPanelOpen(false);
      }
      state.page = 1;
      await loadEntries({ preserveSelection: false });
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
      if (yearMenuToggle) yearMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const syncYearFilterMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
      if (!yearSelect) return "";
      const nextValue = value !== undefined ? String(value || "") : String(yearSelect.value || "");
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
      if (!yearMenu || !yearMenuToggle || !yearMenuPanel || !yearSelect || yearMenu.dataset.wired === "1") return;
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
      for (let year = topYearNum; year >= bottomYearNum; year -= 1) years.push(String(year));
      yearSelect.innerHTML = "";
      const options = [{ value: "", label: "Toutes" }, ...years.map((year) => ({ value: year, label: year }))];
      options.forEach((option) => yearSelect.appendChild(createOptionNode(option.value, option.label)));
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
      if (!hasSelectedSupplier()) return [];
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
      state.entries.filter((entry) => state.selectedKeys.has(entry.key));
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
      if (supplierInput) supplierInput.disabled = state.busy;
      if (searchInput) searchInput.disabled = state.busy;
      if (yearSelect) yearSelect.disabled = state.busy;
      if (yearMenuToggle) yearMenuToggle.setAttribute("aria-disabled", state.busy ? "true" : "false");
      if (state.busy) setYearFilterMenuState(false);
      if (state.busy) setSupplierPanelOpen(false);
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
      if (confirmBtn) confirmBtn.disabled = state.busy || !hasEntries || selected < 1;
      if (selectAllBtn) selectAllBtn.disabled = state.busy || !hasEntries || selected >= total;
      if (unselectAllBtn) unselectAllBtn.disabled = state.busy || selected < 1;
    };

    const syncPagerControls = () => {
      const total = totalCount();
      const totalPages = getTotalPages();
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      if (prevBtn) prevBtn.disabled = state.busy || total === 0 || state.page <= 1;
      if (nextBtn) nextBtn.disabled = state.busy || total === 0 || state.page >= totalPages;
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
      if (pageEl) pageEl.setAttribute("aria-label", `Page ${state.page} sur ${totalPages}`);
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
      if (statusEl) statusEl.textContent = String(text || "").trim();
    };

    const syncStatus = () => {
      if (!hasSelectedSupplier()) {
        setStatus("Selectionnez un fournisseur pour charger les documents.");
        return;
      }
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
          setStatus(`Aucun document trouve pour ce fournisseur avec ${buildFilterSummary()}.`);
          return;
        }
        setStatus(`Aucun document disponible pour ce fournisseur (${sourceLabel()}).`);
        return;
      }
      const selected = selectedCount();
      const supplierLabel = getSelectedSupplierName();
      if (hasActiveFilters()) {
        setStatus(
          `${selected} document(s) selectionne(s) sur ${total} resultat(s) pour ${supplierLabel} (${totalEntriesCount()} total).`
        );
        return;
      }
      setStatus(`${selected} document(s) selectionne(s) sur ${total} pour ${supplierLabel}.`);
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
      chip.className = "be-source-document-picker-modal__meta-chip";
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
      if (!hasSelectedSupplier()) {
        gridEl.appendChild(createEmptyStateNode("Selectionnez un fournisseur pour afficher les documents."));
        syncActionButtons();
        syncStatus();
        syncPagerControls();
        return;
      }
      const filteredEntries = getFilteredEntries();
      if (!filteredEntries.length) {
        const emptyText = hasActiveFilters()
          ? `Aucun document trouve pour ce fournisseur avec ${buildFilterSummary()}.`
          : `Aucun document pour ce fournisseur (${sourceLabel()}).`;
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
        card.className = "be-source-document-picker-modal__card";
        card.setAttribute("role", "listitem");
        card.setAttribute("data-entry-key", entry.key);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "be-source-document-picker-modal__checkbox";
        checkbox.dataset.entryKey = entry.key;
        checkbox.checked = state.selectedKeys.has(entry.key);
        checkbox.disabled = state.busy;
        checkbox.setAttribute("aria-label", `Selectionner ${entry.displayName}`);

        const content = document.createElement("span");
        content.className = "be-source-document-picker-modal__card-content";

        const mainRow = document.createElement("span");
        mainRow.className = "be-source-document-picker-modal__card-main";

        const title = document.createElement("span");
        title.className = "be-source-document-picker-modal__card-title";
        title.textContent = entry.displayName;

        const details = document.createElement("span");
        details.className = "be-source-document-picker-modal__card-meta";
        appendMetaChip(details, entry.date ? `Date: ${entry.date}` : "");

        mainRow.appendChild(checkbox);
        mainRow.appendChild(title);
        content.appendChild(mainRow);
        if (details.childElementCount > 0) content.appendChild(details);
        card.appendChild(content);
        fragment.appendChild(card);
      });
      gridEl.appendChild(fragment);
      syncActionButtons();
      syncStatus();
      syncPagerControls();
    };

    const setDocType = (value) => {
      state.docType = normalizeDocType(value, state.docType || "fa");
      if (titleEl) titleEl.textContent = `Selectionner un document - ${sourceLabel()}`;
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
        state.selectedKeys = new Set(state.initialSelectedKeys);
        state.page = 1;
      } else {
        ensureSelectionConsistency();
      }
      ensureSelectionConsistency();
      const totalPages = getTotalPages();
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
    };

    const loadEntries = async ({ preserveSelection = false } = {}) => {
      const requestToken = ++state.loadToken;
      const selectedSupplier = state.selectedSupplier
        ? { ...state.selectedSupplier }
        : null;
      if (!selectedSupplier) {
        state.loading = false;
        state.error = "";
        clearLoadedEntries();
        setBusy(false);
        renderEntries();
        return false;
      }
      state.loading = true;
      state.error = "";
      setBusy(true);
      renderEntries();
      const res = await fetchAllInvoiceFiles(state.docType);
      if (requestToken !== state.loadToken) return false;
      if (!res?.ok) {
        state.loading = false;
        state.error = String(res?.error || "Chargement des documents impossible.");
        state.entries = [];
        state.selectedKeys.clear();
        setBusy(false);
        renderEntries();
        return false;
      }
      applyEntries(filterEntriesBySupplier(res.items || [], selectedSupplier), { preserveSelection });
      state.loading = false;
      state.error = "";
      setBusy(false);
      renderEntries();
      return true;
    };

    const finalizePending = (result) => {
      if (typeof state.resolvePending === "function") state.resolvePending(result);
      state.resolvePending = null;
      state.pendingPromise = null;
    };

    const closeModal = (result = { ok: false, canceled: true }) => {
      if (state.busy) return;
      setSupplierPanelOpen(false);
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

    const confirmSelection = () => {
      if (state.busy) return;
      const selectedEntries = getSelectedEntries();
      if (!selectedEntries.length) return;
      closeModal({
        ok: true,
        canceled: false,
        docType: state.docType,
        supplier: state.selectedSupplier
          ? {
              path: state.selectedSupplier.path,
              name: state.selectedSupplier.name,
              label: state.selectedSupplier.label,
              identifier: state.selectedSupplier.identifier
            }
          : null,
        items: selectedEntries.map((entry) => ({
          ...entry,
          docType: state.docType,
          docTypeLabel: sourceLabel()
        }))
      });
    };

    const onKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      if (!supplierPanel?.hidden) {
        setSupplierPanelOpen(false);
        supplierInput?.focus?.();
        return;
      }
      if (yearMenu?.open) {
        setYearFilterMenuState(false);
        yearMenuToggle?.focus?.();
        return;
      }
      closeModal({ ok: false, canceled: true });
    };

    const onSupplierOptionSelect = async (optionKey) => {
      const key = String(optionKey || "").trim();
      if (!key || state.busy) return;
      const option = state.supplierOptions.find((entry) => entry.key === key);
      if (!option) return;
      await applySupplierSelection(option, { closePanel: true });
    };

    const onSupplierFieldDocumentClick = (evt) => {
      if (modal.hidden || supplierPanel?.hidden) return;
      if (supplierField?.contains(evt.target)) return;
      setSupplierPanelOpen(false);
    };

    const onGridChange = (evt) => {
      const checkbox = evt.target?.closest?.(".be-source-document-picker-modal__checkbox");
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

    const resolveInitialSelectedKeys = (selection, activeDocType) => {
      const raw = selection && typeof selection === "object" ? selection : {};
      const docType = normalizeDocType(raw.docType || activeDocType || "fa", activeDocType || "fa");
      if (docType !== activeDocType) return new Set();
      const items = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.documents)
          ? raw.documents
          : [];
      const keys = new Set();
      items.forEach((entry, index) => {
        keys.add(buildEntryKey(entry, index));
      });
      return keys;
    };

    const resolveInitialSupplier = (selection, explicitSupplier = null) => {
      const rawSelection = selection && typeof selection === "object" ? selection : {};
      const rawSupplier =
        explicitSupplier && typeof explicitSupplier === "object"
          ? explicitSupplier
          : rawSelection?.supplier && typeof rawSelection.supplier === "object"
            ? rawSelection.supplier
            : null;
      if (rawSupplier) {
        const normalizedSupplier = normalizeSupplierOption(rawSupplier);
        if (normalizedSupplier.label) return normalizedSupplier;
      }
      const firstItem = Array.isArray(rawSelection.items) ? rawSelection.items[0] : null;
      if (firstItem && typeof firstItem === "object") {
        const derivedSupplier = normalizeSupplierOption({
          path: firstItem.clientPath,
          name: firstItem.clientName
        });
        if (derivedSupplier.label && (derivedSupplier.path || derivedSupplier.name)) {
          return derivedSupplier;
        }
      }
      return null;
    };

    const openModal = async ({ docType, trigger, initialSelection, initialSupplier } = {}) => {
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

      state.entries = [];
      state.selectedSupplier = resolveInitialSupplier(initialSelection, initialSupplier);
      state.supplierQuery = state.selectedSupplier?.label || "";
      syncSupplierInputValue(state.selectedSupplier?.label || "");
      state.searchNumber = "";
      state.yearFilter = getCurrentYearValue();
      state.error = "";
      state.loading = false;
      state.page = 1;
      state.loadToken += 1;
      if (searchInput) searchInput.value = "";
      setDocType(docType || "fa");
      state.initialSelectedKeys = resolveInitialSelectedKeys(initialSelection, state.docType);
      state.selectedKeys = new Set(state.initialSelectedKeys);
      syncYearOptions();
      resetSupplierPanel();
      state.suppressNextSupplierFocusOpen = true;

      showModal();
      document.addEventListener("keydown", onKeydown, true);
      renderEntries();

      if (state.selectedSupplier) {
        await loadEntries({ preserveSelection: false });
      }

      if (state.entries.length) {
        modal.querySelector(".be-source-document-picker-modal__checkbox")?.focus?.();
      } else if (!state.selectedSupplier) {
        supplierInput?.focus?.();
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
    confirmBtn?.addEventListener("click", confirmSelection);
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
    supplierInput?.addEventListener("focus", () => {
      if (state.busy) return;
      if (state.suppressNextSupplierFocusOpen) {
        state.suppressNextSupplierFocusOpen = false;
        return;
      }
      if (Date.now() < state.suppressSupplierOpenUntil) return;
      state.supplierQuery = String(supplierInput.value || "");
      void loadSupplierOptions();
      rebuildSupplierPanel(state.supplierQuery);
      setSupplierPanelOpen(true);
    });
    supplierInput?.addEventListener("click", () => {
      if (state.busy) return;
      if (Date.now() < state.suppressSupplierOpenUntil) return;
      state.supplierQuery = String(supplierInput.value || "");
      void loadSupplierOptions();
      rebuildSupplierPanel(state.supplierQuery);
      setSupplierPanelOpen(true);
    });
    supplierInput?.addEventListener("input", (evt) => {
      if (state.busy) return;
      const query = String(evt?.target?.value || "");
      state.supplierQuery = query;
      const selectedLabelToken = normalizeSearchToken(getSelectedSupplierLabel());
      if (state.selectedSupplier && normalizeSearchToken(query) !== selectedLabelToken) {
        clearSelectedSupplier({ keepInputValue: true });
      }
      rebuildSupplierPanel(query);
      setSupplierPanelOpen(true);
    });
    supplierInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "ArrowDown") {
        evt.preventDefault();
        if (state.busy) return;
        state.supplierQuery = String(supplierInput.value || "");
        void loadSupplierOptions();
        rebuildSupplierPanel(state.supplierQuery);
        setSupplierPanelOpen(true);
        setTimeout(focusFirstSupplierOption, 0);
        return;
      }
      if (evt.key === "Escape") {
        if (supplierPanel?.hidden) return;
        evt.preventDefault();
        evt.stopPropagation();
        setSupplierPanelOpen(false);
        return;
      }
      if (evt.key === "Enter" && !supplierPanel?.hidden) {
        const firstOption = supplierPanel.querySelector(".model-select-option");
        if (!firstOption) return;
        evt.preventDefault();
        void onSupplierOptionSelect(firstOption.dataset.supplierKey || "");
      }
    });
    supplierPanel?.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".model-select-option");
      if (!btn) return;
      evt.preventDefault();
      void onSupplierOptionSelect(btn.dataset.supplierKey || "");
    });
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
    document.addEventListener("click", onSupplierFieldDocumentClick, true);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) evt.stopPropagation();
    });

    modalController = {
      open: openModal,
      close: closeModal
    };
    return modalController;
  };

  const chooseDocumentSource = async ({
    choices,
    fallbackDocType,
    title = "Selectionner un document",
    message = "Choisissez le type de document source :",
    trigger = null
  }) => {
    const normalizedChoices = toDocTypeChoices(choices);
    const fallback = normalizeDocType(fallbackDocType || normalizedChoices[0]?.docType || "fa", "fa");
    const controller = createSourceTypeDialogController();
    if (!controller || typeof controller.open !== "function") {
      return fallback;
    }
    let pickedDocType = "";
    try {
      pickedDocType = await controller.open({
        choices: normalizedChoices,
        fallbackDocType: fallback,
        title,
        message
      });
    } catch (err) {
      console.warn("be source document chooser failed", err);
      return fallback;
    }
    if (!pickedDocType) return "";
    return normalizeDocType(pickedDocType || fallback, fallback);
  };

  const openSourceDocumentPicker = async (trigger = null, options = {}) => {
    const choices = toDocTypeChoices(options.docTypeChoices || options.choices);
    const selection =
      options.initialSelection && typeof options.initialSelection === "object"
        ? options.initialSelection
        : null;
    const fallbackDocType = normalizeDocType(
      options.fallbackDocType || selection?.docType || choices[0]?.docType || "fa",
      choices[0]?.docType || "fa"
    );
    const pickedDocType = options.docType
      ? normalizeDocType(options.docType, fallbackDocType)
      : await chooseDocumentSource({
          choices,
          fallbackDocType,
          title: options.sourceChooserTitle || "Selectionner un document",
          message: options.sourceChooserMessage || "Choisissez le type de document source :",
          trigger
        });
    if (!pickedDocType) return { ok: false, canceled: true };
    const controller = createModalController();
    if (!controller || typeof controller.open !== "function") {
      await w.showDialog?.("Fenetre de selection indisponible.", { title: "Erreur" });
      return { ok: false, canceled: false };
    }
    return await controller.open({
      docType: pickedDocType,
      trigger,
      initialSelection: selection,
      initialSupplier: options.initialSupplier || selection?.supplier || null
    });
  };

  AppInit.BonEntreeSourceDocumentPicker = {
    open: (trigger = null, options = {}) => openSourceDocumentPicker(trigger, options)
  };
})(window);
