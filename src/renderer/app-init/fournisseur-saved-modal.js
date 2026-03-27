(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl =
    w.getEl ||
    ((id) => (typeof document !== "undefined" ? document.getElementById(id) : null));

  const MODAL_ID = "fournisseurSavedModalDedicated";
  const OPEN_BTN_ID = "fournisseurSavedModalOpenBtn";
  const TITLE_ID = "fournisseurSavedModalTitle";
  const SEARCH_ID = "fournisseurSavedSearch";
  const SEARCH_BTN_ID = "fournisseurSavedSearchBtn";
  const LIST_ID = "fournisseurSavedList";
  const STATUS_ID = "fournisseurSavedStatus";
  const CLOSE_ID = "fournisseurSavedClose";
  const CLOSE_FOOTER_ID = "fournisseurSavedCloseFooter";
  const REFRESH_ID = "fournisseurSavedRefresh";
  const PAGE_ID = "fournisseurSavedPage";
  const PAGE_INPUT_ID = "fournisseurSavedPageInput";
  const TOTAL_PAGES_ID = "fournisseurSavedTotalPages";
  const PREV_ID = "fournisseurSavedPrev";
  const NEXT_ID = "fournisseurSavedNext";
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

  const buildModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog client-saved-modal fournisseur-saved-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel client-saved-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="${TITLE_ID}" class="swbDialog__title">Fournisseurs enregistres</div>
            <button id="${REFRESH_ID}" type="button" class="btn ghost doc-history-modal__refresh" aria-label="Rafraichir les fournisseurs enregistres">
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
                <input id="${SEARCH_ID}" type="search" placeholder="Rechercher un fournisseur enregistre" autocomplete="off" />
                <button id="${SEARCH_BTN_ID}" type="button" class="client-search__action" aria-label="Rechercher un fournisseur enregistre">
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
    const name = normalizeText(raw.name || client.name || "");
    const vat = normalizeText(raw.identifier || raw.vat || client.vat || client.identifiantFiscal || "");
    const phone = normalizeText(raw.phone || client.phone || client.telephone || "");
    const email = normalizeText(raw.email || client.email || "");
    const type = normalizeText(client.type || raw.type || "societe");
    return { id, path, name, vat, phone, email, type, raw };
  };

  const getTotalPages = () => (state.total > 0 ? Math.max(1, Math.ceil(state.total / PAGE_SIZE)) : 1);

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
      els.statusEl.textContent = "Chargement des fournisseurs...";
      return;
    }
    if (state.message) {
      els.statusEl.textContent = state.message;
      return;
    }
    if (state.total <= 0) {
      els.statusEl.textContent = state.query ? "Aucun fournisseur trouve." : "Aucun fournisseur enregistre.";
      return;
    }
    const start = (state.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + state.entries.length - 1, state.total);
    els.statusEl.textContent = `Affichage ${start}-${end} sur ${state.total} fournisseurs.`;
  };

  const renderList = () => {
    if (!els?.listEl) return;
    renderPager();
    if (state.loading) {
      els.listEl.innerHTML = '<div class="client-saved-modal__empty">Chargement des fournisseurs...</div>';
      renderStatus();
      return;
    }
    if (!state.entries.length) {
      const msg = state.query ? "Aucun fournisseur trouve." : "Aucun fournisseur enregistre.";
      els.listEl.innerHTML = `<div class="client-saved-modal__empty">${escapeHTML(msg)}</div>`;
      renderStatus();
      return;
    }
    els.listEl.innerHTML = state.entries
      .map((entry, idx) => {
        const name = escapeHTML(entry.name || "N.R.");
        const vat = escapeHTML(entry.vat || "N.R.");
        const phone = escapeHTML(entry.phone || "N.R.");
        const typeLabel = entry.type === "particulier" ? "Personne physique" : "Societe / personne morale";
        return `
          <div class="client-search__option client-saved-item">
            <div class="client-search__row">
              <button type="button" class="client-search__select client-search__select--detailed" data-fournisseur-saved-load="${idx}">
                <div class="client-search__details-grid">
                  <div class="client-search__details-row">
                    <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                      <span class="client-search__detail-label">Nom :</span>
                      <span class="client-search__detail-value">${name}</span>
                    </div>
                  </div>
                  <div class="client-search__details-row">
                    <div class="client-search__detail client-search__detail--inline">
                      <span class="client-search__detail-label">Type :</span>
                      <span class="client-search__detail-value">${escapeHTML(typeLabel)}</span>
                    </div>
                    <div class="client-search__detail client-search__detail--inline">
                      <span class="client-search__detail-label">Matricule fiscal :</span>
                      <span class="client-search__detail-value">${vat}</span>
                    </div>
                    <div class="client-search__detail client-search__detail--inline">
                      <span class="client-search__detail-label">Telephone :</span>
                      <span class="client-search__detail-value">${phone}</span>
                    </div>
                  </div>
                </div>
              </button>
              <div class="client-search__actions">
                <button type="button" class="client-search__edit" data-fournisseur-saved-update="${idx}">Mettre a jour</button>
                <button type="button" class="client-search__delete" data-fournisseur-saved-delete="${idx}">Supprimer</button>
              </div>
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
      state.message = "Recherche des fournisseurs indisponible.";
      renderList();
      return;
    }

    try {
      const offset = (state.page - 1) * PAGE_SIZE;
      const res = await w.electronAPI.searchClients({
        query: trimmedQuery,
        limit: PAGE_SIZE,
        offset,
        entityType: "vendor"
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

  const dispatchFournisseurMutationEvent = (entry = {}) => {
    const path = normalizeText(entry.path || "");
    if (!path) return;
    try {
      w.dispatchEvent(
        new CustomEvent("client-saved-modal-entity-updated", {
          detail: { entityType: "vendor", path, snapshot: {} }
        })
      );
    } catch {}
  };

  const refreshFournisseurViews = () => {
    const scopes = Array.from(
      document.querySelectorAll("#clientBoxMainscreenFournisseursPanel, #FournisseurBoxNewDoc")
    );
    scopes.forEach((scope) => {
      const input = scope.querySelector?.("#fournisseurSearch");
      const results = scope.querySelector?.("#fournisseurSearchResults");
      if (!input || !results || results.hidden) return;
      const searchBtn = scope.querySelector?.("#fournisseurSearchBtn");
      if (searchBtn) searchBtn.click();
      else input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const legacyModal =
      document.getElementById("fournisseurSavedModal") ||
      document.getElementById("fournisseurSavedModalNv");
    if (
      legacyModal &&
      legacyModal.classList.contains("is-open") &&
      legacyModal.getAttribute("aria-hidden") === "false"
    ) {
      const refreshBtn = legacyModal.querySelector("#clientSavedModalRefresh");
      refreshBtn?.click?.();
    }
  };

  const getFormScope = () => document.getElementById("clientBoxMainscreenFournisseursPanel");

  const openFournisseurForm = (entry, mode = "view") => {
    if (!entry) return false;
    const formScope = getFormScope();
    if (!formScope) return false;
    if (typeof w.SEM?.loadClientRecordIntoForm === "function") {
      w.SEM.loadClientRecordIntoForm(entry.raw || entry, { formScope });
    } else {
      return false;
    }
    const ctx = w.SEM?.getClientFormPopoverContext?.(formScope);
    if (ctx) {
      w.SEM?.setClientFormPopoverMode?.(ctx, mode);
      w.SEM?.setClientFormPopoverOpen?.(ctx, true);
    }
    return true;
  };

  const onListClick = async (evt) => {
    const loadBtn = evt.target?.closest?.("[data-fournisseur-saved-load]");
    if (loadBtn) {
      const idx = Number(loadBtn.dataset.fournisseurSavedLoad);
      const entry = state.entries[idx];
      if (!entry) return;
      if (openFournisseurForm(entry, "view")) closeModal();
      return;
    }

    const updateBtn = evt.target?.closest?.("[data-fournisseur-saved-update]");
    if (updateBtn) {
      const idx = Number(updateBtn.dataset.fournisseurSavedUpdate);
      const entry = state.entries[idx];
      if (!entry) return;
      if (openFournisseurForm(entry, "edit")) closeModal();
      return;
    }

    const deleteBtn = evt.target?.closest?.("[data-fournisseur-saved-delete]");
    if (!deleteBtn) return;
    const idx = Number(deleteBtn.dataset.fournisseurSavedDelete);
    const entry = state.entries[idx];
    if (!entry) return;
    const confirmed = await showConfirmDialog(`Supprimer le fournisseur "${entry.name || "N.R."}" ?`, {
      title: "Supprimer le fournisseur",
      okText: "Supprimer",
      cancelText: "Annuler"
    });
    if (!confirmed) return;
    if (!w.electronAPI?.deleteClient) {
      await showMessageDialog("Suppression des fournisseurs indisponible.", { title: "Erreur" });
      return;
    }
    try {
      const res = await w.electronAPI.deleteClient({ path: entry.path, entityType: "vendor" });
      if (!res?.ok) {
        await showMessageDialog(normalizeText(res?.error || "Suppression impossible."), { title: "Erreur" });
        return;
      }
      dispatchFournisseurMutationEvent(entry);
      refreshFournisseurViews();
      w.showToast?.("Fournisseur supprime.");
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
  };

  const registerOpenTrigger = () => {
    if (openTriggerBound) return;
    openTriggerBound = true;
    document.addEventListener(
      "click",
      (evt) => {
        const trigger = evt.target?.closest?.(`#${OPEN_BTN_ID}, #FournisseurSavedListBtn`);
        if (!trigger) return;
        const inMainFournisseurPanel = !!trigger.closest("#clientBoxMainscreenFournisseursPanel");
        if (!inMainFournisseurPanel) return;
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

  AppInit.registerFournisseurSavedModalActions = function registerFournisseurSavedModalActions() {
    ensureModal();
    captureEls();
    bindEvents();
    registerOpenTrigger();
  };

  AppInit.FournisseurSavedModal = {
    open: (trigger = null) => openModal(trigger),
    close: () => closeModal(),
    reload: () => loadPage(state.page || 1)
  };
})(window);
