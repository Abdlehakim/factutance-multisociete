(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl =
    w.getEl ||
    ((id) => (typeof document !== "undefined" ? document.getElementById(id) : null));

  const MODAL_ID = "transporteurSavedModalDedicated";
  const OPEN_BTN_ID = "transporteurSavedModalOpenBtn";
  const TITLE_ID = "transporteurSavedModalTitle";
  const SEARCH_ID = "transporteurSavedSearch";
  const SEARCH_BTN_ID = "transporteurSavedSearchBtn";
  const LIST_ID = "transporteurSavedList";
  const STATUS_ID = "transporteurSavedStatus";
  const CLOSE_ID = "transporteurSavedClose";
  const CLOSE_FOOTER_ID = "transporteurSavedCloseFooter";
  const REFRESH_ID = "transporteurSavedRefresh";
  const PAGE_ID = "transporteurSavedPage";
  const PAGE_INPUT_ID = "transporteurSavedPageInput";
  const TOTAL_PAGES_ID = "transporteurSavedTotalPages";
  const PREV_ID = "transporteurSavedPrev";
  const NEXT_ID = "transporteurSavedNext";
  const PAGE_SIZE = 5;
  const MIN_SEARCH_LENGTH = 2;

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

  const state = {
    page: 1,
    total: 0,
    query: "",
    entries: [],
    loading: false,
    message: "",
    requestId: 0,
    searchTimer: null,
    restoreFocus: null
  };

  let els = null;
  let eventsBound = false;
  let openTriggerBound = false;
  let mutationEventBound = false;

  const normalizeText = (value) => String(value || "").trim();
  const escapeHTML = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const showConfirmDialog = async (message, options = {}) => {
    if (typeof w.showConfirm === "function") return !!(await w.showConfirm(message, options));
    return !!w.confirm?.(String(message || ""));
  };

  const showMessageDialog = async (message, options = {}) => {
    if (typeof w.showDialog === "function") {
      await w.showDialog(message, options);
      return;
    }
    w.alert?.(String(message || ""));
  };

  const resolveDriverName = (raw = {}, client = {}) =>
    normalizeText(
      raw.driverName ||
        raw.driver ||
        raw.chauffeur ||
        raw.benefit ||
        client.driverName ||
        client.driver ||
        client.chauffeur ||
        client.benefit ||
        ""
    );

  const resolveVehiclePlate = (raw = {}, client = {}) =>
    normalizeText(
      raw.vehiclePlate ||
        raw.vehicle ||
        raw.vehicule ||
        raw.matriculeVehicule ||
        raw.matriculeVehicle ||
        raw.plate ||
        raw.account ||
        raw.accountOf ||
        client.vehiclePlate ||
        client.vehicle ||
        client.vehicule ||
        client.matriculeVehicule ||
        client.matriculeVehicle ||
        client.plate ||
        client.account ||
        client.accountOf ||
        ""
    );

  const resolveTransportMode = (raw = {}, client = {}) =>
    normalizeText(
      raw.transportMode ||
        raw.modeTransport ||
        raw.modeDeTransport ||
        raw.transport ||
        raw.stegRef ||
        client.transportMode ||
        client.modeTransport ||
        client.modeDeTransport ||
        client.transport ||
        client.stegRef ||
        ""
    );

  const buildModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog client-saved-modal transporteur-saved-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel client-saved-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="${TITLE_ID}" class="swbDialog__title">Transporteurs enregistres</div>
            <button id="${REFRESH_ID}" type="button" class="btn ghost doc-history-modal__refresh" aria-label="Rafraichir les transporteurs enregistres">
              ${REFRESH_ICON_SVG}
            </button>
          </div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="client-saved-modal__body swbDialog__msg">
          <div class="client-saved-modal__search article-saved-modal__search article-search client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input id="${SEARCH_ID}" type="search" placeholder="Rechercher un transporteur enregistre" autocomplete="off" />
                <button id="${SEARCH_BTN_ID}" type="button" class="client-search__action" aria-label="Rechercher un transporteur enregistre">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
            </div>
          </div>
          <div id="${LIST_ID}" class="client-saved-modal__list" role="list"></div>
          <p id="${STATUS_ID}" class="client-saved-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button id="${CLOSE_FOOTER_ID}" type="button" class="btn btn-close client-search__close">Fermer</button>
          </div>
          <div class="client-search__actions client-saved-modal__pager">
            <button id="${PREV_ID}" type="button" class="client-search__edit">Precedent</button>
            <span id="${PAGE_ID}" class="client-saved-modal__page" aria-live="polite">
              Page
              <input
                id="${PAGE_INPUT_ID}"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input"
              />
              /
              <span id="${TOTAL_PAGES_ID}">1</span>
            </span>
            <button id="${NEXT_ID}" type="button" class="client-search__add">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureModal = () => {
    if (getEl(MODAL_ID)) return getEl(MODAL_ID);
    if (!document?.body) return null;
    document.body.insertAdjacentHTML("beforeend", buildModalMarkup());
    return getEl(MODAL_ID);
  };

  const captureEls = () => {
    const modal = getEl(MODAL_ID);
    if (!modal) return null;
    els = {
      modal,
      searchInput: getEl(SEARCH_ID),
      searchBtn: getEl(SEARCH_BTN_ID),
      listEl: getEl(LIST_ID),
      statusEl: getEl(STATUS_ID),
      closeBtn: getEl(CLOSE_ID),
      closeFooterBtn: getEl(CLOSE_FOOTER_ID),
      refreshBtn: getEl(REFRESH_ID),
      pageEl: getEl(PAGE_ID),
      pageInput: getEl(PAGE_INPUT_ID),
      totalPagesEl: getEl(TOTAL_PAGES_ID),
      prevBtn: getEl(PREV_ID),
      nextBtn: getEl(NEXT_ID)
    };
    return els;
  };

  const normalizeEntry = (raw = {}) => {
    const client = raw?.client && typeof raw.client === "object" ? raw.client : {};
    const id = normalizeText(raw.id || client.id || "");
    const path = normalizeText(raw.path || (id ? `sqlite://clients/${id}` : ""));
    const codeTransporteur = normalizeText(
      raw.codeTransporteur ||
        client.codeTransporteur ||
        raw.code_transporteur ||
        client.code_transporteur ||
        raw.codeClient ||
        client.codeClient ||
        ""
    );
    const name = normalizeText(raw.name || client.name || "");
    const driverName = resolveDriverName(raw, client);
    const vehiclePlate = resolveVehiclePlate(raw, client);
    const transportMode = resolveTransportMode(raw, client);
    const phone = normalizeText(raw.phone || client.phone || client.telephone || client.tel || "");
    const email = normalizeText(raw.email || client.email || "");
    return { id, path, codeTransporteur, name, driverName, vehiclePlate, transportMode, phone, email, raw };
  };

  const getTotalPages = () => (state.total > 0 ? Math.max(1, Math.ceil(state.total / PAGE_SIZE)) : 1);

  const normalizeEntityType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "vendor" || raw === "fournisseur") return "vendor";
    if (raw === "transporter" || raw === "transporteur") return "transporter";
    return "client";
  };

  const normalizeMatchValue = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const patchEntryFromMutation = (detail = {}) => {
    if (!Array.isArray(state.entries) || !state.entries.length) return false;
    const expectedType = normalizeEntityType(detail?.entityType);
    if (expectedType !== "transporter") return false;
    const snapshot = detail?.snapshot && typeof detail.snapshot === "object" ? detail.snapshot : {};
    const nextPath = normalizeText(detail?.path || snapshot.__path || "");
    const nextCode = normalizeMatchValue(
      snapshot.codeTransporteur || snapshot.code_transporteur || snapshot.codeClient || ""
    );
    const nextName = normalizeMatchValue(snapshot.name || snapshot.nomTransporteur || snapshot.nom || "");
    const nextPhone = normalizeMatchValue(snapshot.phone || snapshot.telephone || snapshot.tel || "");
    const nextVehicle = normalizeMatchValue(
      snapshot.vehiclePlate ||
        snapshot.vehicle ||
        snapshot.vehicule ||
        snapshot.matriculeVehicule ||
        snapshot.matriculeVehicle ||
        snapshot.plate ||
        ""
    );
    const targetIndex = state.entries.findIndex((entry) => {
      const entryPath = normalizeText(entry?.path || entry?.raw?.path || entry?.raw?.__path || "");
      if (nextPath && entryPath && entryPath === nextPath) return true;
      const entryCode = normalizeMatchValue(entry?.codeTransporteur || entry?.raw?.codeTransporteur || "");
      if (nextCode && entryCode && nextCode === entryCode) return true;
      const entryName = normalizeMatchValue(entry?.name || entry?.raw?.name || entry?.raw?.nomTransporteur || "");
      if (!entryName || !nextName || entryName !== nextName) return false;
      if (nextPhone) {
        const entryPhone = normalizeMatchValue(entry?.phone || entry?.raw?.phone || entry?.raw?.telephone || "");
        if (entryPhone && entryPhone === nextPhone) return true;
      }
      if (nextVehicle) {
        const entryVehicle = normalizeMatchValue(
          entry?.vehiclePlate || entry?.raw?.vehiclePlate || entry?.raw?.matriculeVehicule || entry?.raw?.plate || ""
        );
        if (entryVehicle && entryVehicle === nextVehicle) return true;
      }
      return !nextPhone && !nextVehicle;
    });
    if (targetIndex < 0) return false;
    const current = state.entries[targetIndex] || {};
    const nextRaw = {
      ...(current.raw && typeof current.raw === "object" ? current.raw : {}),
      ...snapshot
    };
    if (nextPath) {
      nextRaw.path = nextPath;
      nextRaw.__path = nextPath;
    }
    state.entries[targetIndex] = normalizeEntry(nextRaw);
    return true;
  };

  const refreshAfterMutation = async (detail = {}) => {
    if (!isOpen()) return;
    if (normalizeEntityType(detail?.entityType) !== "transporter") return;
    const listEl = els?.listEl || null;
    const previousScrollTop = listEl && Number.isFinite(listEl.scrollTop) ? listEl.scrollTop : 0;
    const patched = patchEntryFromMutation(detail);
    if (patched) {
      renderList();
      if (listEl && Number.isFinite(previousScrollTop)) {
        listEl.scrollTop = previousScrollTop;
      }
    }
    if (state.loading) return;
    const currentPage = Math.max(1, Number(state.page) || 1);
    await loadPage(currentPage);
    if (listEl && Number.isFinite(previousScrollTop)) {
      listEl.scrollTop = previousScrollTop;
    }
  };

  const renderPager = () => {
    if (!els) return;
    const totalPages = getTotalPages();
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    if (els.totalPagesEl) els.totalPagesEl.textContent = String(totalPages);
    if (els.pageInput) {
      els.pageInput.disabled = state.total <= 0;
      els.pageInput.value = state.total > 0 ? String(state.page) : "";
      els.pageInput.max = String(totalPages);
      els.pageInput.setAttribute("aria-valuemin", state.total > 0 ? "1" : "0");
      els.pageInput.setAttribute("aria-valuemax", String(totalPages));
      els.pageInput.setAttribute("aria-valuenow", state.total > 0 ? String(state.page) : "0");
    }
    if (els.pageEl) {
      els.pageEl.setAttribute("aria-label", state.total > 0 ? `Page ${state.page} sur ${totalPages}` : "Page 1 sur 1");
    }
    if (els.prevBtn) els.prevBtn.disabled = state.loading || state.page <= 1 || state.total <= 0;
    if (els.nextBtn) els.nextBtn.disabled = state.loading || state.page >= totalPages || state.total <= 0;
  };

  const renderStatus = () => {
    if (!els?.statusEl) return;
    if (state.loading) {
      els.statusEl.textContent = "Chargement des transporteurs...";
      return;
    }
    if (state.message) {
      els.statusEl.textContent = state.message;
      return;
    }
    if (state.total <= 0) {
      els.statusEl.textContent = state.query ? "Aucun transporteur trouve." : "Aucun transporteur enregistre.";
      return;
    }
    const start = (state.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + state.entries.length - 1, state.total);
    els.statusEl.textContent = `Affichage ${start}-${end} sur ${state.total} transporteurs.`;
  };

  const renderList = () => {
    if (!els?.listEl) return;
    renderPager();
    if (state.loading) {
      els.listEl.innerHTML = '<div class="client-saved-modal__empty">Chargement des transporteurs...</div>';
      renderStatus();
      return;
    }
    if (!state.entries.length) {
      const msg = state.query ? "Aucun transporteur trouve." : "Aucun transporteur enregistre.";
      els.listEl.innerHTML = `<div class="client-saved-modal__empty">${escapeHTML(msg)}</div>`;
      renderStatus();
      return;
    }
    els.listEl.innerHTML = state.entries
      .map((entry, idx) => {
        const codeTransporteur = escapeHTML(entry.codeTransporteur || "N.R.");
        const name = escapeHTML(entry.name || "N.R.");
        const driverName = escapeHTML(entry.driverName || "N.R.");
        const vehiclePlate = escapeHTML(entry.vehiclePlate || "N.R.");
        const transportMode = escapeHTML(entry.transportMode || "N.R.");
        const phone = escapeHTML(entry.phone || "N.R.");
        return `
          <div class="client-search__option client-saved-item">
            <button type="button" class="client-search__select client-search__select--detailed" data-transporteur-saved-load="${idx}">
              <div class="client-search__details-grid">
                <div class="client-search__details-row">
                  <div class="client-search__detail client-search__detail--inline">
                    <span class="client-search__detail-label">Code transporteur :</span>
                    <span class="client-search__detail-value">${codeTransporteur}</span>
                  </div>
                  <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                    <span class="client-search__detail-label">Nom :</span>
                    <span class="client-search__detail-value">${name}</span>
                  </div>
                </div>
                <div class="client-search__details-row">
                  <div class="client-search__detail client-search__detail--inline">
                    <span class="client-search__detail-label">Chauffeur :</span>
                    <span class="client-search__detail-value">${driverName}</span>
                  </div>
                  <div class="client-search__detail client-search__detail--inline">
                    <span class="client-search__detail-label">Matricule vehicule :</span>
                    <span class="client-search__detail-value">${vehiclePlate}</span>
                  </div>
                </div>
                <div class="client-search__details-row">
                  <div class="client-search__detail client-search__detail--inline">
                    <span class="client-search__detail-label">Mode de transport :</span>
                    <span class="client-search__detail-value">${transportMode}</span>
                  </div>
                  <div class="client-search__detail client-search__detail--inline">
                    <span class="client-search__detail-label">Telephone :</span>
                    <span class="client-search__detail-value">${phone}</span>
                  </div>
                </div>
              </div>
            </button>
            <div class="client-search__actions">
              <button type="button" class="client-search__edit" data-transporteur-saved-update="${idx}">Mettre a jour</button>
              <button type="button" class="client-search__delete" data-transporteur-saved-delete="${idx}">Supprimer</button>
            </div>
          </div>
        `;
      })
      .join("");
    renderStatus();
  };

  const loadPage = async (targetPage = 1) => {
    if (!els?.listEl || state.loading) return;
    state.page = Math.max(1, Number(targetPage) || 1);
    state.loading = true;
    state.message = "";
    const requestId = ++state.requestId;
    renderList();

    const trimmedQuery = normalizeText(state.query);
    if (trimmedQuery && trimmedQuery.length < MIN_SEARCH_LENGTH) {
      if (requestId !== state.requestId) return;
      state.loading = false;
      state.total = 0;
      state.entries = [];
      state.page = 1;
      state.message = `Tapez au moins ${MIN_SEARCH_LENGTH} caracteres.`;
      renderList();
      return;
    }

    if (!w.electronAPI?.searchClients) {
      if (requestId !== state.requestId) return;
      state.loading = false;
      state.total = 0;
      state.entries = [];
      state.message = "Recherche des transporteurs indisponible.";
      renderList();
      return;
    }

    try {
      const offset = (state.page - 1) * PAGE_SIZE;
      const res = await w.electronAPI.searchClients({
        query: trimmedQuery,
        limit: PAGE_SIZE,
        offset,
        entityType: "transporter"
      });
      if (requestId !== state.requestId) return;
      if (!res?.ok) {
        state.total = 0;
        state.entries = [];
        state.message = normalizeText(res?.error || "Chargement impossible.");
      } else {
        const entries = Array.isArray(res.results) ? res.results.map(normalizeEntry) : [];
        const totalRaw = Number(res.total);
        const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : offset + entries.length;
        state.total = Math.max(0, total);
        const totalPages = getTotalPages();
        if (state.page > totalPages) {
          state.loading = false;
          state.page = totalPages;
          return loadPage(totalPages);
        }
        state.entries = entries;
        state.message = "";
      }
    } catch (err) {
      if (requestId !== state.requestId) return;
      state.total = 0;
      state.entries = [];
      state.message = normalizeText(err?.message || "Chargement impossible.");
    } finally {
      if (requestId !== state.requestId) return;
      state.loading = false;
      renderList();
    }
  };

  const dispatchTransporteurMutationEvent = (entry = {}) => {
    const path = normalizeText(entry.path || "");
    if (!path) return;
    try {
      w.dispatchEvent(
        new CustomEvent("client-saved-modal-entity-updated", {
          detail: { entityType: "transporter", path, snapshot: {} }
        })
      );
    } catch {}
  };

  const refreshTransporteurViews = () => {
    const scopes = Array.from(
      document.querySelectorAll("#clientBoxMainscreenTransporteursPanel, #TransporteurBoxNewDoc")
    );
    scopes.forEach((scope) => {
      const input = scope.querySelector?.("#transporteurSearch");
      const results = scope.querySelector?.("#transporteurSearchResults");
      if (!input || !results || results.hidden) return;
      const searchBtn = scope.querySelector?.("#transporteurSearchBtn");
      if (searchBtn) searchBtn.click();
      else input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const legacyModal =
      document.getElementById("transporteurSavedModal") ||
      document.getElementById("transporteurSavedModalNv");
    if (
      legacyModal &&
      legacyModal.classList.contains("is-open") &&
      legacyModal.getAttribute("aria-hidden") === "false"
    ) {
      const refreshBtn = legacyModal.querySelector("#clientSavedModalRefresh");
      refreshBtn?.click?.();
    }
  };

  const getFormScope = () => document.getElementById("clientBoxMainscreenTransporteursPanel");

  const normalizeTransporteurMode = (mode = "view") => {
    const raw = String(mode || "view").trim().toLowerCase();
    if (raw === "load") return "view";
    if (raw === "edit" || raw === "create" || raw === "view") return raw;
    return "view";
  };

  const forceTransporteurPopoverMode = (popoverNode, mode = "view") => {
    if (!(popoverNode instanceof HTMLElement)) return;
    const normalized = normalizeTransporteurMode(mode);
    const isView = normalized === "view";
    const isEdit = normalized === "edit";
    const isCreate = normalized === "create";
    popoverNode.dataset.clientFormMode = normalized;
    popoverNode.dataset.transporteurFormMode = normalized;
    const rightActions = popoverNode.querySelector(".swbDialog__group.swbDialog__group--right");
    if (rightActions) {
      rightActions.hidden = isView;
      rightActions.setAttribute("aria-hidden", isView ? "true" : "false");
    }
    const setBtn = (id, show, disabledWhenShown = false) => {
      const btn = popoverNode.querySelector(`#${id}`);
      if (!btn) return;
      btn.hidden = !show;
      btn.setAttribute("aria-hidden", show ? "false" : "true");
      btn.disabled = show ? !!disabledWhenShown : true;
      btn.setAttribute("aria-disabled", btn.disabled ? "true" : "false");
    };
    setBtn("btnUpdateTransporteur", isEdit, false);
    setBtn("btnSaveTransporteur", isCreate, false);
    setBtn("btnNewTransporteur", isCreate, false);
  };

  const openTransporteurForm = (entry, mode = "view") => {
    if (!entry) return false;
    const formScope = getFormScope();
    const requestedMode = normalizeTransporteurMode(mode);
    const payload =
      entry && typeof entry === "object"
        ? {
            ...(entry.raw && typeof entry.raw === "object" ? entry.raw : entry),
            entityType: "transporter"
          }
        : entry;
    if (formScope && typeof w.SEM?.loadClientRecordIntoForm === "function") {
      w.SEM.loadClientRecordIntoForm(payload, { formScope });
    }
    const popoverNode =
      formScope?.querySelector?.("#transporteurFormPopover") ||
      document.getElementById("transporteurFormPopover") ||
      null;
    if (!popoverNode) return false;
    if (typeof w.SEM?.loadClientRecordIntoForm !== "function") {
      const norm = (value) => String(value || "").trim();
      const setVal = (selector, value) => {
        const input = popoverNode.querySelector(selector);
        if (!input || !("value" in input)) return;
        input.value = value;
      };
      setVal("#transporteurCode", norm(payload.codeTransporteur || payload.code_transporteur || payload.codeClient || ""));
      setVal("#transporteurName", norm(payload.name || payload.nomTransporteur || payload.nom || ""));
      setVal(
        "#transporteurDriverName",
        norm(payload.driverName || payload.driver || payload.chauffeur || payload.benefit || "")
      );
      setVal(
        "#transporteurVehiclePlate",
        norm(
          payload.vehiclePlate ||
            payload.vehicle ||
            payload.vehicule ||
            payload.matriculeVehicule ||
            payload.matriculeVehicle ||
            payload.plate ||
            payload.account ||
            payload.accountOf ||
            ""
        )
      );
      setVal(
        "#transporteurTransportMode",
        norm(payload.transportMode || payload.modeTransport || payload.modeDeTransport || payload.transport || payload.stegRef || "")
      );
      setVal("#transporteurPhone", norm(payload.telephone || payload.phone || payload.tel || ""));
      setVal("#transporteurEmail", norm(payload.email || ""));
      setVal("#transporteurAddress", norm(payload.adresse || payload.address || ""));
      setVal("#transporteurType", norm(payload.typeTransporteur || payload.type || "societe"));
      setVal("#transporteurVat", norm(payload.matriculeFiscal || payload.matricule_fiscal || payload.vat || ""));
    }
    const ctx =
      w.SEM?.getClientFormPopoverContext?.(formScope) ||
      (popoverNode ? w.SEM?.getClientFormPopoverContext?.(popoverNode) : null);
    if (ctx) {
      w.SEM?.setClientFormPopoverMode?.(ctx, requestedMode);
      setTimeout(() => {
        w.SEM?.setClientFormPopoverOpen?.(ctx, true);
        w.SEM?.setClientFormPopoverMode?.(ctx, requestedMode);
        forceTransporteurPopoverMode(ctx.popover || popoverNode, requestedMode);
        w.SEM?.refreshTransporteurActionButtons?.();
        setTimeout(() => {
          w.SEM?.setClientFormPopoverMode?.(ctx, requestedMode);
          forceTransporteurPopoverMode(ctx.popover || popoverNode, requestedMode);
          w.SEM?.refreshTransporteurActionButtons?.();
        }, 30);
      }, 0);
      return true;
    }
    const effectiveMode = requestedMode;
    popoverNode.dataset.clientFormMode = effectiveMode;
    popoverNode.dataset.transporteurFormMode = effectiveMode === "view" ? "view" : effectiveMode;
    forceTransporteurPopoverMode(popoverNode, effectiveMode);
    popoverNode.classList.add("is-open");
    popoverNode.hidden = false;
    popoverNode.removeAttribute("hidden");
    popoverNode.setAttribute("aria-hidden", "false");
    const focusTarget =
      popoverNode.querySelector("#transporteurName") ||
      popoverNode.querySelector("[data-client-form-close]") ||
      popoverNode.querySelector("input,textarea,select");
    if (focusTarget && typeof focusTarget.focus === "function") {
      setTimeout(() => {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch {
          try {
            focusTarget.focus();
          } catch {}
        }
      }, 0);
    }
    return true;
  };

  const onListClick = async (evt) => {
    const loadBtn = evt.target?.closest?.("[data-transporteur-saved-load]");
    if (loadBtn) {
      evt.preventDefault();
      evt.stopPropagation();
      const idx = Number(loadBtn.dataset.transporteurSavedLoad);
      const entry = state.entries[idx];
      if (!entry) return;
      openTransporteurForm(entry, "view");
      return;
    }

    const updateBtn = evt.target?.closest?.("[data-transporteur-saved-update]");
    if (updateBtn) {
      evt.preventDefault();
      evt.stopPropagation();
      const idx = Number(updateBtn.dataset.transporteurSavedUpdate);
      const entry = state.entries[idx];
      if (!entry) return;
      openTransporteurForm(entry, "edit");
      return;
    }

    const deleteBtn = evt.target?.closest?.("[data-transporteur-saved-delete]");
    if (!deleteBtn) return;
    const idx = Number(deleteBtn.dataset.transporteurSavedDelete);
    const entry = state.entries[idx];
    if (!entry) return;
    const confirmed = await showConfirmDialog(`Supprimer le transporteur "${entry.name || "N.R."}" ?`, {
      title: "Supprimer le transporteur",
      okText: "Supprimer",
      cancelText: "Annuler"
    });
    if (!confirmed) return;
    if (!w.electronAPI?.deleteClient) {
      await showMessageDialog("Suppression des transporteurs indisponible.", { title: "Erreur" });
      return;
    }
    try {
      const res = await w.electronAPI.deleteClient({ path: entry.path, entityType: "transporter" });
      if (!res?.ok) {
        await showMessageDialog(normalizeText(res?.error || "Suppression impossible."), { title: "Erreur" });
        return;
      }
      dispatchTransporteurMutationEvent(entry);
      refreshTransporteurViews();
      w.showToast?.("Transporteur supprime.");
      const maxPage = Math.max(1, Math.ceil(Math.max(0, state.total - 1) / PAGE_SIZE));
      state.page = Math.min(state.page, maxPage);
      await loadPage(state.page);
    } catch (err) {
      await showMessageDialog(normalizeText(err?.message || "Suppression impossible."), { title: "Erreur" });
    }
  };

  const onKeydown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    closeModal();
  };

  const isOpen = () =>
    !!(els?.modal && els.modal.classList.contains("is-open") && els.modal.getAttribute("aria-hidden") === "false");

  const openModal = async (trigger = null) => {
    ensureModal();
    captureEls();
    bindEvents();
    state.restoreFocus =
      trigger && typeof trigger.focus === "function"
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    state.page = 1;
    state.total = 0;
    state.query = "";
    state.entries = [];
    state.loading = false;
    state.message = "";
    state.requestId += 1;
    if (els.searchInput) els.searchInput.value = "";
    els.modal.hidden = false;
    els.modal.removeAttribute("hidden");
    els.modal.setAttribute("aria-hidden", "false");
    els.modal.classList.add("is-open");
    document.addEventListener("keydown", onKeydown, true);
    renderList();
    await loadPage(1);
    els.searchInput?.focus?.();
  };

  const closeModal = () => {
    if (!els?.modal) return;
    clearTimeout(state.searchTimer);
    state.searchTimer = null;
    state.requestId += 1;
    state.loading = false;
    state.entries = [];
    state.total = 0;
    state.query = "";
    state.page = 1;
    state.message = "";
    els.modal.classList.remove("is-open");
    els.modal.hidden = true;
    els.modal.setAttribute("hidden", "");
    els.modal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown, true);
    if (state.restoreFocus && typeof state.restoreFocus.focus === "function") {
      try {
        state.restoreFocus.focus();
      } catch {}
    }
    state.restoreFocus = null;
  };

  const bindEvents = () => {
    if (eventsBound || !els?.modal) return;
    eventsBound = true;
    els.closeBtn?.addEventListener("click", closeModal);
    els.closeFooterBtn?.addEventListener("click", closeModal);
    els.modal.addEventListener("click", (evt) => {
      if (evt.target === els.modal) closeModal();
    });
    els.refreshBtn?.addEventListener("click", () => {
      if (state.loading) return;
      clearTimeout(state.searchTimer);
      state.query = normalizeText(els.searchInput?.value || "");
      void loadPage(state.page);
    });
    els.prevBtn?.addEventListener("click", () => {
      if (state.loading) return;
      const prev = Math.max(1, state.page - 1);
      if (prev !== state.page) void loadPage(prev);
    });
    els.nextBtn?.addEventListener("click", () => {
      if (state.loading || state.total <= 0) return;
      const next = Math.min(getTotalPages(), state.page + 1);
      if (next !== state.page) void loadPage(next);
    });
    els.pageInput?.addEventListener("focus", (evt) => {
      try {
        evt.target.select();
      } catch {}
    });
    els.pageInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const target = Number(els.pageInput?.value);
        if (!Number.isFinite(target) || target < 1) {
          renderPager();
          return;
        }
        void loadPage(Math.min(getTotalPages(), Math.floor(target)));
      } else if (evt.key === "Escape") {
        evt.preventDefault();
        renderPager();
        els.pageInput.blur();
      }
    });
    els.pageInput?.addEventListener("blur", () => {
      const target = Number(els.pageInput?.value);
      if (!Number.isFinite(target) || target < 1) {
        renderPager();
        return;
      }
      void loadPage(Math.min(getTotalPages(), Math.floor(target)));
    });
    els.searchInput?.addEventListener("input", (evt) => {
      state.query = normalizeText(evt?.target?.value || "");
      state.page = 1;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        void loadPage(1);
      }, 240);
    });
    els.searchInput?.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter") return;
      evt.preventDefault();
      clearTimeout(state.searchTimer);
      state.query = normalizeText(els.searchInput?.value || "");
      state.page = 1;
      void loadPage(1);
    });
    els.searchBtn?.addEventListener("click", () => {
      clearTimeout(state.searchTimer);
      state.query = normalizeText(els.searchInput?.value || "");
      state.page = 1;
      void loadPage(1);
    });
    els.listEl?.addEventListener("click", (evt) => {
      void onListClick(evt);
    });
    if (!mutationEventBound) {
      mutationEventBound = true;
      w.addEventListener("client-saved-modal-entity-updated", (evt) => {
        void refreshAfterMutation(evt?.detail || {});
      });
    }
  };

  const registerOpenTrigger = () => {
    if (openTriggerBound) return;
    openTriggerBound = true;
    document.addEventListener(
      "click",
      (evt) => {
        const trigger = evt.target?.closest?.(`#${OPEN_BTN_ID}, #TransporteurSavedListBtn`);
        if (!trigger) return;
        const inMainTransporteurPanel = !!trigger.closest("#clientBoxMainscreenTransporteursPanel");
        if (!inMainTransporteurPanel) return;
        evt.preventDefault();
        evt.stopImmediatePropagation();
        if (!isOpen()) {
          void openModal(trigger);
          return;
        }
        clearTimeout(state.searchTimer);
        state.query = normalizeText(els?.searchInput?.value || "");
        void loadPage(state.page);
      },
      true
    );
  };

  AppInit.registerTransporteurSavedModalActions = function registerTransporteurSavedModalActions() {
    ensureModal();
    captureEls();
    bindEvents();
    registerOpenTrigger();
  };

  AppInit.TransporteurSavedModal = {
    open: (trigger = null) => openModal(trigger),
    close: () => closeModal(),
    reload: () => loadPage(state.page || 1)
  };
})(window);
