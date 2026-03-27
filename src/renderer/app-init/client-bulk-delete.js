(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl =
    w.getEl ||
    ((id) => (typeof document !== "undefined" ? document.getElementById(id) : null));

  const MODAL_ID = "clientBulkDeleteModal";
  const OPEN_BTN_ID = "clientBulkDeleteOpenBtn";
  const TITLE_ID = "clientBulkDeleteTitle";
  const SEARCH_ID = "clientBulkDeleteSearch";
  const LIST_ID = "clientBulkDeleteList";
  const STATUS_ID = "clientBulkDeleteStatus";
  const CLOSE_ID = "clientBulkDeleteCloseBtn";
  const CANCEL_ID = "clientBulkDeleteCancelBtn";
  const SELECT_ALL_ID = "clientBulkDeleteSelectAll";
  const UNSELECT_ALL_ID = "clientBulkDeleteUnselectAll";
  const CONFIRM_ID = "clientBulkDeleteConfirmBtn";
  const PAGE_LABEL_ID = "clientBulkDeletePage";
  const PAGE_INPUT_ID = "clientBulkDeletePageInput";
  const TOTAL_PAGES_ID = "clientBulkDeleteTotalPages";
  const PREV_ID = "clientBulkDeletePrev";
  const NEXT_ID = "clientBulkDeleteNext";
  const PAGE_SIZE = 12;

  const CLOSE_ICON_SVG = `
    <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
    </svg>
  `;

  const state = {
    page: 1,
    total: 0,
    query: "",
    entries: [],
    loading: false,
    busy: false,
    error: "",
    selectedKeys: new Set(),
    selectedEntriesByKey: new Map(),
    visibleEntriesByKey: new Map(),
    requestId: 0,
    searchTimer: null,
    restoreFocus: null,
    pendingPromise: null,
    resolvePending: null
  };

  let controller = null;
  let modalEls = null;
  let eventsBound = false;
  let openTriggerDelegationBound = false;

  const escapeHTML = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const normalizeText = (value) => String(value || "").trim();
  const showConfirmDialog = async (message, options = {}) => {
    if (typeof w.showConfirm === "function") {
      return !!(await w.showConfirm(message, options));
    }
    return !!w.confirm?.(String(message || ""));
  };
  const showMessageDialog = async (message, options = {}) => {
    if (typeof w.showDialog === "function") {
      await w.showDialog(message, options);
      return;
    }
    w.alert?.(String(message || ""));
  };

  const getClientEntryKey = (entry = {}) =>
    normalizeText(entry.path || entry.id || entry.name || "");

  const clampPage = (value) => {
    const totalPages = Math.max(1, Math.ceil((Number(state.total) || 0) / PAGE_SIZE));
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return 1;
    return Math.max(1, Math.min(totalPages, Math.floor(normalized)));
  };

  const resolveTotalPages = () =>
    state.total > 0 ? Math.max(1, Math.ceil(state.total / PAGE_SIZE)) : 1;

  const resolveModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog doc-history-modal client-bulk-delete-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-history-modal__panel client-bulk-delete-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div id="${TITLE_ID}" class="swbDialog__title">Supprimer des clients</div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="swbDialog__msg doc-history-modal__body client-bulk-delete-modal__body">
          <div class="client-bulk-delete-modal__toolbar">
            <label class="client-bulk-delete-modal__search" for="${SEARCH_ID}">
              <span class="client-bulk-delete-modal__search-label">Recherche</span>
              <input
                id="${SEARCH_ID}"
                class="client-bulk-delete-modal__search-input"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="Nom, code client, matricule fiscal ou telephone"
                aria-label="Rechercher un client"
              />
            </label>
            <div class="client-bulk-delete-modal__selection-tools">
              <button id="${SELECT_ALL_ID}" type="button" class="client-search__edit">Tout selectionner</button>
              <button id="${UNSELECT_ALL_ID}" type="button" class="client-search__deleteDoc">Tout deselectionner</button>
            </div>
          </div>
          <div id="${LIST_ID}" class="client-bulk-delete-modal__list doc-history-modal__list" role="listbox" aria-multiselectable="true"></div>
          <div class="client-bulk-delete-modal__actions-row">
            <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
              <button id="${PREV_ID}" type="button" class="client-search__edit" disabled>Precedent</button>
              <span id="${PAGE_LABEL_ID}" class="client-saved-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
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
                  value="1"
                />
                / <span id="${TOTAL_PAGES_ID}">1</span>
              </span>
              <button id="${NEXT_ID}" type="button" class="client-search__add" disabled>Suivant</button>
            </div>
            <button id="${CONFIRM_ID}" type="button" class="client-search__deleteDoc" disabled>
              Supprimer la selection
            </button>
          </div>
          <p id="${STATUS_ID}" class="doc-history-modal__status client-bulk-delete-modal__status" aria-live="polite"></p>
        </div>
        <div class="swbDialog__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${CANCEL_ID}" type="button" class="btn btn-close client-search__close">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const ensureModal = () => {
    if (getEl(MODAL_ID)) return getEl(MODAL_ID);
    if (!document?.body) return null;
    document.body.insertAdjacentHTML("beforeend", resolveModalMarkup());
    return getEl(MODAL_ID);
  };

  const captureModalElements = () => {
    const modal = getEl(MODAL_ID);
    if (!modal) return null;
    modalEls = {
      modal,
      searchInput: getEl(SEARCH_ID),
      listEl: getEl(LIST_ID),
      statusEl: getEl(STATUS_ID),
      closeBtn: getEl(CLOSE_ID),
      cancelBtn: getEl(CANCEL_ID),
      selectAllBtn: getEl(SELECT_ALL_ID),
      unselectAllBtn: getEl(UNSELECT_ALL_ID),
      confirmBtn: getEl(CONFIRM_ID),
      pageLabel: getEl(PAGE_LABEL_ID),
      pageInput: getEl(PAGE_INPUT_ID),
      totalPagesEl: getEl(TOTAL_PAGES_ID),
      prevBtn: getEl(PREV_ID),
      nextBtn: getEl(NEXT_ID)
    };
    return modalEls;
  };

  const setBusy = (isBusy) => {
    state.busy = !!isBusy;
    if (!modalEls?.modal) return;
    modalEls.modal.setAttribute("aria-busy", isBusy ? "true" : "false");
    if (modalEls.confirmBtn) modalEls.confirmBtn.disabled = isBusy || state.selectedKeys.size === 0;
    if (modalEls.selectAllBtn) modalEls.selectAllBtn.disabled = isBusy || state.entries.length === 0;
    if (modalEls.unselectAllBtn) modalEls.unselectAllBtn.disabled = isBusy || state.selectedKeys.size === 0;
  };

  const renderPager = () => {
    if (!modalEls) return;
    const totalPages = resolveTotalPages();
    state.page = clampPage(state.page);
    if (modalEls.totalPagesEl) modalEls.totalPagesEl.textContent = String(totalPages);
    if (modalEls.pageInput) {
      modalEls.pageInput.value = String(state.page);
      modalEls.pageInput.max = String(totalPages);
      modalEls.pageInput.setAttribute("aria-valuemin", "1");
      modalEls.pageInput.setAttribute("aria-valuemax", String(totalPages));
      modalEls.pageInput.setAttribute("aria-valuenow", String(state.page));
    }
    if (modalEls.pageLabel) {
      modalEls.pageLabel.setAttribute("aria-label", `Page ${state.page} sur ${totalPages}`);
    }
    if (modalEls.prevBtn) modalEls.prevBtn.disabled = state.loading || state.busy || state.page <= 1;
    if (modalEls.nextBtn) {
      modalEls.nextBtn.disabled = state.loading || state.busy || state.page >= totalPages;
    }
  };

  const syncActionButtons = () => {
    if (!modalEls) return;
    const selectedCount = state.selectedKeys.size;
    if (modalEls.selectAllBtn) modalEls.selectAllBtn.disabled = state.loading || state.busy || state.entries.length === 0;
    if (modalEls.unselectAllBtn) {
      modalEls.unselectAllBtn.disabled = state.loading || state.busy || selectedCount === 0;
    }
    if (modalEls.confirmBtn) {
      modalEls.confirmBtn.disabled = state.loading || state.busy || selectedCount === 0;
      modalEls.confirmBtn.textContent =
        selectedCount > 0
          ? `Supprimer la selection (${selectedCount})`
          : "Supprimer la selection";
    }
  };

  const syncStatus = () => {
    if (!modalEls?.statusEl) return;
    if (state.loading) {
      modalEls.statusEl.textContent = "Chargement des clients...";
      return;
    }
    if (state.error) {
      modalEls.statusEl.textContent = state.error;
      return;
    }
    const total = Number(state.total) || 0;
    if (!total) {
      modalEls.statusEl.textContent = state.query
        ? "Aucun client trouve pour cette recherche."
        : "Aucun client enregistre.";
      return;
    }
    const start = (state.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + state.entries.length - 1, total);
    const selected = state.selectedKeys.size;
    const selectionInfo = selected > 0 ? ` - ${selected} selectionne(s)` : "";
    modalEls.statusEl.textContent = `Affichage ${start}-${end} sur ${total} clients${selectionInfo}.`;
  };

  const normalizeEntry = (raw = {}) => {
    const client = raw?.client && typeof raw.client === "object" ? raw.client : {};
    const id = normalizeText(raw.id || client.id || "");
    const path = normalizeText(raw.path || client.path || (id ? `sqlite://clients/${id}` : ""));
    const name = normalizeText(raw.name || client.name || "");
    const codeClient = normalizeText(raw.codeClient || client.codeClient || "");
    const identifier = normalizeText(raw.identifier || raw.vat || client.vat || client.identifiantFiscal || "");
    const phone = normalizeText(raw.phone || client.phone || client.telephone || "");
    const email = normalizeText(raw.email || client.email || "");
    const updatedAt = normalizeText(raw.updatedAt || raw.modifiedAt || client.updatedAt || "");
    return {
      id,
      path,
      name,
      codeClient,
      identifier,
      phone,
      email,
      updatedAt
    };
  };

  const renderEntries = () => {
    if (!modalEls?.listEl) return;
    renderPager();
    const { listEl } = modalEls;
    listEl.innerHTML = "";
    state.visibleEntriesByKey = new Map();
    if (state.loading) {
      listEl.innerHTML = '<div class="client-bulk-delete-modal__empty">Chargement...</div>';
      syncActionButtons();
      syncStatus();
      return;
    }
    if (state.error) {
      listEl.innerHTML = `<div class="client-bulk-delete-modal__empty">${escapeHTML(state.error)}</div>`;
      syncActionButtons();
      syncStatus();
      return;
    }
    if (!state.entries.length) {
      listEl.innerHTML = `<div class="client-bulk-delete-modal__empty">${
        state.query ? "Aucun client trouve." : "Aucun client enregistre."
      }</div>`;
      syncActionButtons();
      syncStatus();
      return;
    }
    const cards = state.entries
      .map((entry) => {
        const key = getClientEntryKey(entry);
        if (!key) return "";
        state.visibleEntriesByKey.set(key, entry);
        const checked = state.selectedKeys.has(key) ? "checked" : "";
        const codeClient = escapeHTML(entry.codeClient || "N.R.");
        const name = escapeHTML(entry.name || "N.R.");
        return `
          <label class="client-bulk-delete-modal__card" data-client-bulk-delete-key="${escapeHTML(key)}">
            <div class="client-bulk-delete-modal__card-main">
              <input type="checkbox" class="client-bulk-delete-modal__checkbox" data-client-bulk-delete-check="${escapeHTML(
                key
              )}" ${checked} />
              <div class="client-bulk-delete-modal__card-title">${codeClient}</div>
            </div>
            <div class="client-bulk-delete-modal__card-meta">
              <span class="client-bulk-delete-modal__meta-chip">Nom: ${name}</span>
            </div>
          </label>
        `;
      })
      .join("");
    listEl.innerHTML = cards;
    syncActionButtons();
    syncStatus();
  };

  const loadEntries = async ({ page = state.page } = {}) => {
    if (!modalEls || state.busy) return;
    if (!w.electronAPI?.searchClients) {
      state.loading = false;
      state.error = "Recherche des clients indisponible.";
      state.entries = [];
      state.total = 0;
      renderEntries();
      return;
    }
    const requestId = ++state.requestId;
    state.loading = true;
    state.error = "";
    state.page = clampPage(page);
    renderEntries();
    try {
      const offset = (state.page - 1) * PAGE_SIZE;
      const response = await w.electronAPI.searchClients({
        query: state.query,
        limit: PAGE_SIZE,
        offset,
        entityType: "client"
      });
      if (requestId !== state.requestId) return;
      if (!response?.ok) {
        state.entries = [];
        state.total = 0;
        state.error = normalizeText(response?.error || "Chargement impossible.");
        return;
      }
      const rawItems = Array.isArray(response.results) ? response.results : [];
      state.entries = rawItems.map(normalizeEntry).filter((entry) => getClientEntryKey(entry));
      const totalRaw = Number(response.total);
      state.total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : state.entries.length;
      const totalPages = resolveTotalPages();
      if (state.page > totalPages) {
        state.page = totalPages;
        return await loadEntries({ page: totalPages });
      }
    } catch (err) {
      if (requestId !== state.requestId) return;
      state.entries = [];
      state.total = 0;
      state.error = normalizeText(err?.message || "Chargement impossible.");
    } finally {
      if (requestId !== state.requestId) return;
      state.loading = false;
      renderEntries();
    }
  };

  const selectAllVisible = () => {
    if (!state.entries.length || state.loading || state.busy) return;
    state.entries.forEach((entry) => {
      const key = getClientEntryKey(entry);
      if (!key) return;
      state.selectedKeys.add(key);
      state.selectedEntriesByKey.set(key, entry);
    });
    renderEntries();
  };

  const unselectAll = () => {
    state.selectedKeys.clear();
    state.selectedEntriesByKey.clear();
    renderEntries();
  };

  const dispatchClientMutationEvent = (entry) => {
    const path = normalizeText(entry?.path || "");
    if (!path) return;
    try {
      w.dispatchEvent(
        new CustomEvent("client-saved-modal-entity-updated", {
          detail: {
            entityType: "client",
            path,
            snapshot: {}
          }
        })
      );
    } catch {}
  };

  const refreshClientSearchViews = () => {
    const scopes = Array.from(
      document.querySelectorAll(
        "#clientBoxMainscreenClientsPanel, #clientBoxNewDoc, #clientSavedModalNv, #clientSavedModal"
      )
    );
    scopes.forEach((scope) => {
      const input = scope.querySelector?.("#clientSearch");
      const results = scope.querySelector?.("#clientSearchResults");
      if (!input || !results || results.hidden) return;
      const clickBtn = scope.querySelector?.("#clientSearchBtn");
      if (clickBtn) {
        clickBtn.click();
      } else {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    const savedModal =
      document.getElementById("clientSavedModal") ||
      document.getElementById("clientSavedModalNv");
    if (
      savedModal &&
      savedModal.classList.contains("is-open") &&
      savedModal.getAttribute("aria-hidden") === "false"
    ) {
      const refreshBtn = savedModal.querySelector("#clientSavedModalRefresh");
      refreshBtn?.click?.();
    }
  };

  const confirmDeleteSelection = async () => {
    if (state.busy || state.loading || !state.selectedKeys.size) return;
    const selectedEntries = Array.from(state.selectedKeys)
      .map((key) => state.selectedEntriesByKey.get(key) || state.visibleEntriesByKey.get(key))
      .filter((entry) => normalizeText(entry?.path));
    if (!selectedEntries.length) {
      unselectAll();
      return;
    }
    const confirmed = await showConfirmDialog(
      `Supprimer ${selectedEntries.length} client(s) selectionne(s) ?`,
      {
        title: "Supprimer des clients",
        okText: "Supprimer",
        cancelText: "Annuler"
      }
    );
    if (!confirmed) return;
    if (!w.electronAPI?.deleteClient) {
      await showMessageDialog("Suppression des clients indisponible.", { title: "Erreur" });
      return;
    }

    setBusy(true);
    const failed = [];
    const deletedEntries = [];
    for (const entry of selectedEntries) {
      try {
        const response = await w.electronAPI.deleteClient({ path: entry.path, entityType: "client" });
        if (response?.ok) {
          deletedEntries.push(entry);
          const key = getClientEntryKey(entry);
          if (key) {
            state.selectedKeys.delete(key);
            state.selectedEntriesByKey.delete(key);
          }
          if (w.SEM?.state?.client && normalizeText(w.SEM.state.client.__path) === entry.path) {
            w.SEM.state.client.__path = "";
            w.SEM.setClientFormBaseline?.(null);
          }
        } else {
          failed.push(`${entry.name || entry.path}: ${normalizeText(response?.error || "Suppression impossible.")}`);
        }
      } catch (err) {
        failed.push(`${entry.name || entry.path}: ${normalizeText(err?.message || "Suppression impossible.")}`);
      }
    }
    setBusy(false);

    if (deletedEntries.length) {
      deletedEntries.forEach(dispatchClientMutationEvent);
      refreshClientSearchViews();
      w.showToast?.(`${deletedEntries.length} client(s) supprime(s).`);
    }
    if (failed.length) {
      await showMessageDialog(failed.slice(0, 8).join("\n"), { title: "Suppression partielle" });
    }
    await loadEntries({ page: state.page });
  };

  const onModalKeydown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    closeModal({ ok: false, canceled: true });
  };

  const showModal = () => {
    if (!modalEls?.modal) return;
    modalEls.modal.hidden = false;
    modalEls.modal.removeAttribute("hidden");
    modalEls.modal.setAttribute("aria-hidden", "false");
    modalEls.modal.classList.add("is-open");
  };

  const hideModal = () => {
    if (!modalEls?.modal) return;
    modalEls.modal.classList.remove("is-open");
    modalEls.modal.hidden = true;
    modalEls.modal.setAttribute("hidden", "");
    modalEls.modal.setAttribute("aria-hidden", "true");
  };

  const closeModal = (result = { ok: false, canceled: true }) => {
    clearTimeout(state.searchTimer);
    state.searchTimer = null;
    state.requestId += 1;
    hideModal();
    document.removeEventListener("keydown", onModalKeydown, true);
    state.entries = [];
    state.total = 0;
    state.query = "";
    state.page = 1;
    state.error = "";
    state.loading = false;
    state.busy = false;
    state.selectedKeys.clear();
    state.selectedEntriesByKey.clear();
    state.visibleEntriesByKey.clear();
    if (modalEls?.searchInput) modalEls.searchInput.value = "";
    if (state.restoreFocus && typeof state.restoreFocus.focus === "function") {
      try {
        state.restoreFocus.focus();
      } catch {}
    }
    state.restoreFocus = null;
    if (state.resolvePending) {
      state.resolvePending(result);
    }
    state.resolvePending = null;
    state.pendingPromise = null;
  };

  const openModal = async (trigger = null) => {
    initClientBulkDelete();
    if (!modalEls?.modal) {
      await showMessageDialog("Fenetre de suppression des clients indisponible.", { title: "Erreur" });
      return { ok: false, canceled: false };
    }
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
    state.page = 1;
    state.total = 0;
    state.query = "";
    state.entries = [];
    state.error = "";
    state.loading = false;
    state.busy = false;
    state.selectedKeys.clear();
    state.selectedEntriesByKey.clear();
    state.visibleEntriesByKey.clear();
    if (modalEls.searchInput) modalEls.searchInput.value = "";
    showModal();
    document.addEventListener("keydown", onModalKeydown, true);
    renderEntries();
    await loadEntries({ page: 1 });
    modalEls.searchInput?.focus?.();
    return state.pendingPromise;
  };

  const bindEvents = () => {
    if (eventsBound || !modalEls?.modal) return;
    eventsBound = true;
    modalEls.closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    modalEls.cancelBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    modalEls.modal.addEventListener("click", (evt) => {
      if (evt.target === modalEls.modal) {
        closeModal({ ok: false, canceled: true });
      }
    });
    modalEls.searchInput?.addEventListener("input", (evt) => {
      state.query = normalizeText(evt?.target?.value || "");
      state.page = 1;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        void loadEntries({ page: 1 });
      }, 220);
    });
    modalEls.searchInput?.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter") return;
      evt.preventDefault();
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
      state.query = normalizeText(modalEls.searchInput?.value || "");
      state.page = 1;
      void loadEntries({ page: 1 });
    });
    modalEls.selectAllBtn?.addEventListener("click", selectAllVisible);
    modalEls.unselectAllBtn?.addEventListener("click", unselectAll);
    modalEls.confirmBtn?.addEventListener("click", () => {
      void confirmDeleteSelection();
    });
    modalEls.prevBtn?.addEventListener("click", () => {
      if (state.loading || state.busy || state.page <= 1) return;
      state.page -= 1;
      void loadEntries({ page: state.page });
    });
    modalEls.nextBtn?.addEventListener("click", () => {
      const totalPages = resolveTotalPages();
      if (state.loading || state.busy || state.page >= totalPages) return;
      state.page += 1;
      void loadEntries({ page: state.page });
    });
    modalEls.pageInput?.addEventListener("focus", (evt) => {
      try {
        evt.target.select();
      } catch {}
    });
    modalEls.pageInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const nextPage = clampPage(modalEls.pageInput?.value || state.page);
        if (nextPage !== state.page) {
          state.page = nextPage;
          void loadEntries({ page: nextPage });
          return;
        }
        renderPager();
      } else if (evt.key === "Escape") {
        evt.preventDefault();
        renderPager();
        modalEls.pageInput.blur();
      }
    });
    modalEls.pageInput?.addEventListener("blur", () => {
      const nextPage = clampPage(modalEls.pageInput?.value || state.page);
      if (nextPage !== state.page) {
        state.page = nextPage;
        void loadEntries({ page: nextPage });
        return;
      }
      renderPager();
    });
    modalEls.listEl?.addEventListener("change", (evt) => {
      const checkbox = evt.target?.closest?.("[data-client-bulk-delete-check]");
      if (!checkbox || state.loading || state.busy) return;
      const key = normalizeText(checkbox.dataset.clientBulkDeleteCheck || "");
      if (!key) return;
      if (checkbox.checked) {
        state.selectedKeys.add(key);
        const entry = state.visibleEntriesByKey.get(key);
        if (entry) state.selectedEntriesByKey.set(key, entry);
      } else {
        state.selectedKeys.delete(key);
        state.selectedEntriesByKey.delete(key);
      }
      syncActionButtons();
      syncStatus();
    });
  };

  const initClientBulkDelete = () => {
    ensureModal();
    captureModalElements();
    bindEvents();
    return controller;
  };

  AppInit.registerClientBulkDeleteActions = function registerClientBulkDeleteActions() {
    initClientBulkDelete();
    if (openTriggerDelegationBound) return;
    openTriggerDelegationBound = true;
    document.addEventListener("click", (evt) => {
      const triggerBtn = evt.target?.closest?.(`#${OPEN_BTN_ID}`);
      if (!triggerBtn) return;
      evt.preventDefault();
      void openModal(triggerBtn);
    });
  };

  controller = {
    init: initClientBulkDelete,
    open: openModal,
    close: closeModal,
    render: renderEntries,
    deleteSelection: confirmDeleteSelection
  };

  AppInit.ClientBulkDelete = controller;
})(window);
