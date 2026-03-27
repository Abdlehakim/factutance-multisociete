(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl =
    w.getEl ||
    ((id) => (typeof document !== "undefined" ? document.getElementById(id) : null));

  const MODAL_ID = "fournisseurBulkDeleteModal";
  const OPEN_BTN_ID = "fournisseurBulkDeleteOpenBtn";
  const TITLE_ID = "fournisseurBulkDeleteTitle";
  const SEARCH_ID = "fournisseurBulkDeleteSearch";
  const LIST_ID = "fournisseurBulkDeleteList";
  const STATUS_ID = "fournisseurBulkDeleteStatus";
  const CLOSE_ID = "fournisseurBulkDeleteCloseBtn";
  const CANCEL_ID = "fournisseurBulkDeleteCancelBtn";
  const SELECT_ALL_ID = "fournisseurBulkDeleteSelectAll";
  const UNSELECT_ALL_ID = "fournisseurBulkDeleteUnselectAll";
  const CONFIRM_ID = "fournisseurBulkDeleteConfirmBtn";
  const PAGE_LABEL_ID = "fournisseurBulkDeletePage";
  const PAGE_INPUT_ID = "fournisseurBulkDeletePageInput";
  const TOTAL_PAGES_ID = "fournisseurBulkDeleteTotalPages";
  const PREV_ID = "fournisseurBulkDeletePrev";
  const NEXT_ID = "fournisseurBulkDeleteNext";
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

  const getEntryKey = (entry = {}) => normalizeText(entry.path || entry.id || entry.name || "");
  const getTotalPages = () => (state.total > 0 ? Math.max(1, Math.ceil(state.total / PAGE_SIZE)) : 1);
  const clampPage = (value) => {
    const totalPages = getTotalPages();
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return 1;
    return Math.max(1, Math.min(totalPages, Math.floor(normalized)));
  };

  const buildModalMarkup = () => `
    <div id="${MODAL_ID}" class="swbDialog doc-history-modal fournisseur-bulk-delete-modal" hidden aria-hidden="true" aria-busy="false">
      <div class="swbDialog__panel doc-history-modal__panel fournisseur-bulk-delete-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="swbDialog__header">
          <div id="${TITLE_ID}" class="swbDialog__title">Supprimer des fournisseurs</div>
          <button id="${CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${CLOSE_ICON_SVG}
          </button>
        </div>
        <div class="swbDialog__msg doc-history-modal__body fournisseur-bulk-delete-modal__body">
          <div class="fournisseur-bulk-delete-modal__toolbar">
            <label class="fournisseur-bulk-delete-modal__search" for="${SEARCH_ID}">
              <span class="fournisseur-bulk-delete-modal__search-label">Recherche</span>
              <input
                id="${SEARCH_ID}"
                class="fournisseur-bulk-delete-modal__search-input"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="Code fournisseur, nom du fournisseur, matricule fiscal ou telephone"
                aria-label="Rechercher un fournisseur"
              />
            </label>
            <div class="fournisseur-bulk-delete-modal__selection-tools">
              <button id="${SELECT_ALL_ID}" type="button" class="client-search__edit">Tout selectionner</button>
              <button id="${UNSELECT_ALL_ID}" type="button" class="client-search__deleteDoc">Tout deselectionner</button>
            </div>
          </div>
          <div id="${LIST_ID}" class="fournisseur-bulk-delete-modal__list doc-history-modal__list" role="listbox" aria-multiselectable="true"></div>
          <div class="fournisseur-bulk-delete-modal__actions-row">
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
          <p id="${STATUS_ID}" class="doc-history-modal__status fournisseur-bulk-delete-modal__status" aria-live="polite"></p>
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
    document.body.insertAdjacentHTML("beforeend", buildModalMarkup());
    return getEl(MODAL_ID);
  };

  const captureEls = () => {
    const modal = getEl(MODAL_ID);
    if (!modal) return null;
    els = {
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
    return els;
  };

  const normalizeEntry = (raw = {}) => {
    const client = raw?.client && typeof raw.client === "object" ? raw.client : {};
    const id = normalizeText(raw.id || client.id || "");
    const path = normalizeText(raw.path || (id ? `sqlite://clients/${id}` : ""));
    const codeFournisseur = normalizeText(
      raw.codeFournisseur ||
        client.codeFournisseur ||
        raw.code_fournisseur ||
        client.code_fournisseur ||
        raw.codeClient ||
        client.codeClient ||
        ""
    );
    const name = normalizeText(raw.name || client.name || "");
    const phone = normalizeText(raw.phone || client.phone || client.telephone || "");
    return { id, path, codeFournisseur, name, phone };
  };

  const renderPager = () => {
    if (!els) return;
    const totalPages = getTotalPages();
    state.page = clampPage(state.page);
    if (els.totalPagesEl) els.totalPagesEl.textContent = String(totalPages);
    if (els.pageInput) {
      els.pageInput.value = String(state.page);
      els.pageInput.max = String(totalPages);
      els.pageInput.setAttribute("aria-valuemin", "1");
      els.pageInput.setAttribute("aria-valuemax", String(totalPages));
      els.pageInput.setAttribute("aria-valuenow", String(state.page));
    }
    if (els.pageLabel) els.pageLabel.setAttribute("aria-label", `Page ${state.page} sur ${totalPages}`);
    if (els.prevBtn) els.prevBtn.disabled = state.loading || state.busy || state.page <= 1;
    if (els.nextBtn) els.nextBtn.disabled = state.loading || state.busy || state.page >= totalPages;
  };

  const syncActionButtons = () => {
    if (!els) return;
    const selectedCount = state.selectedKeys.size;
    if (els.selectAllBtn) els.selectAllBtn.disabled = state.loading || state.busy || state.entries.length === 0;
    if (els.unselectAllBtn) els.unselectAllBtn.disabled = state.loading || state.busy || selectedCount === 0;
    if (els.confirmBtn) {
      els.confirmBtn.disabled = state.loading || state.busy || selectedCount === 0;
      els.confirmBtn.textContent =
        selectedCount > 0 ? `Supprimer la selection (${selectedCount})` : "Supprimer la selection";
    }
  };

  const syncStatus = () => {
    if (!els?.statusEl) return;
    if (state.loading) {
      els.statusEl.textContent = "Chargement des fournisseurs...";
      return;
    }
    if (state.error) {
      els.statusEl.textContent = state.error;
      return;
    }
    if (state.total <= 0) {
      els.statusEl.textContent = state.query
        ? "Aucun fournisseur trouve pour cette recherche."
        : "Aucun fournisseur enregistre.";
      return;
    }
    const start = (state.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + state.entries.length - 1, state.total);
    const selected = state.selectedKeys.size;
    const selection = selected > 0 ? ` - ${selected} selectionne(s)` : "";
    els.statusEl.textContent = `Affichage ${start}-${end} sur ${state.total} fournisseurs${selection}.`;
  };

  const renderEntries = () => {
    if (!els?.listEl) return;
    renderPager();
    state.visibleEntriesByKey = new Map();
    if (state.loading) {
      els.listEl.innerHTML = '<div class="fournisseur-bulk-delete-modal__empty">Chargement...</div>';
      syncActionButtons();
      syncStatus();
      return;
    }
    if (state.error) {
      els.listEl.innerHTML = `<div class="fournisseur-bulk-delete-modal__empty">${escapeHTML(state.error)}</div>`;
      syncActionButtons();
      syncStatus();
      return;
    }
    if (!state.entries.length) {
      els.listEl.innerHTML = `<div class="fournisseur-bulk-delete-modal__empty">${
        state.query ? "Aucun fournisseur trouve." : "Aucun fournisseur enregistre."
      }</div>`;
      syncActionButtons();
      syncStatus();
      return;
    }
    els.listEl.innerHTML = state.entries
      .map((entry) => {
        const key = getEntryKey(entry);
        if (!key) return "";
        state.visibleEntriesByKey.set(key, entry);
        const checked = state.selectedKeys.has(key) ? "checked" : "";
        const codeFournisseur = escapeHTML(entry.codeFournisseur || "N.R.");
        const name = escapeHTML(entry.name || "N.R.");
        return `
          <label class="fournisseur-bulk-delete-modal__card" data-fournisseur-bulk-delete-key="${escapeHTML(key)}">
            <div class="fournisseur-bulk-delete-modal__card-main">
              <input type="checkbox" class="fournisseur-bulk-delete-modal__checkbox" data-fournisseur-bulk-delete-check="${escapeHTML(
                key
              )}" ${checked} />
              <div class="fournisseur-bulk-delete-modal__card-title">${codeFournisseur}</div>
            </div>
            <div class="fournisseur-bulk-delete-modal__card-meta">
              <span class="fournisseur-bulk-delete-modal__meta-chip">Nom: ${name}</span>
            </div>
          </label>
        `;
      })
      .join("");
    syncActionButtons();
    syncStatus();
  };

  const loadEntries = async ({ page = state.page } = {}) => {
    if (!els || state.busy) return;
    if (!w.electronAPI?.searchClients) {
      state.loading = false;
      state.error = "Recherche des fournisseurs indisponible.";
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
      const res = await w.electronAPI.searchClients({
        query: state.query,
        limit: PAGE_SIZE,
        offset,
        entityType: "vendor"
      });
      if (requestId !== state.requestId) return;
      if (!res?.ok) {
        state.entries = [];
        state.total = 0;
        state.error = normalizeText(res?.error || "Chargement impossible.");
        return;
      }
      const entries = Array.isArray(res.results) ? res.results.map(normalizeEntry) : [];
      const totalRaw = Number(res.total);
      state.total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : offset + entries.length;
      const totalPages = getTotalPages();
      if (state.page > totalPages) {
        state.page = totalPages;
        return await loadEntries({ page: totalPages });
      }
      state.entries = entries.filter((entry) => getEntryKey(entry));
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
      const key = getEntryKey(entry);
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

  const dispatchMutationEvent = (entry = {}) => {
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

  const refreshSupplierViews = () => {
    const scopes = Array.from(
      document.querySelectorAll("#clientBoxMainscreenFournisseursPanel, #FournisseurBoxNewDoc")
    );
    scopes.forEach((scope) => {
      const input = scope.querySelector?.("#fournisseurSearch");
      const results = scope.querySelector?.("#fournisseurSearchResults");
      if (!input || !results || results.hidden) return;
      const btn = scope.querySelector?.("#fournisseurSearchBtn");
      if (btn) btn.click();
      else input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const savedModal = document.getElementById("fournisseurSavedModalDedicated");
    if (savedModal && savedModal.classList.contains("is-open")) {
      const refreshBtn = savedModal.querySelector("#fournisseurSavedRefresh");
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
      `Supprimer ${selectedEntries.length} fournisseur(s) selectionne(s) ?`,
      { title: "Supprimer des fournisseurs", okText: "Supprimer", cancelText: "Annuler" }
    );
    if (!confirmed) return;
    if (!w.electronAPI?.deleteClient) {
      await showMessageDialog("Suppression des fournisseurs indisponible.", { title: "Erreur" });
      return;
    }

    state.busy = true;
    renderEntries();
    const failed = [];
    const deleted = [];
    for (const entry of selectedEntries) {
      try {
        const res = await w.electronAPI.deleteClient({ path: entry.path, entityType: "vendor" });
        if (res?.ok) {
          deleted.push(entry);
          const key = getEntryKey(entry);
          if (key) {
            state.selectedKeys.delete(key);
            state.selectedEntriesByKey.delete(key);
          }
        } else {
          failed.push(`${entry.name || entry.path}: ${normalizeText(res?.error || "Suppression impossible.")}`);
        }
      } catch (err) {
        failed.push(`${entry.name || entry.path}: ${normalizeText(err?.message || "Suppression impossible.")}`);
      }
    }
    state.busy = false;

    if (deleted.length) {
      deleted.forEach(dispatchMutationEvent);
      refreshSupplierViews();
      w.showToast?.(`${deleted.length} fournisseur(s) supprime(s).`);
    }
    if (failed.length) {
      await showMessageDialog(failed.slice(0, 8).join("\n"), { title: "Suppression partielle" });
    }
    await loadEntries({ page: state.page });
  };

  const onKeydown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    closeModal({ ok: false, canceled: true });
  };

  const showModal = () => {
    if (!els?.modal) return;
    els.modal.hidden = false;
    els.modal.removeAttribute("hidden");
    els.modal.setAttribute("aria-hidden", "false");
    els.modal.classList.add("is-open");
  };

  const hideModal = () => {
    if (!els?.modal) return;
    els.modal.classList.remove("is-open");
    els.modal.hidden = true;
    els.modal.setAttribute("hidden", "");
    els.modal.setAttribute("aria-hidden", "true");
  };

  const closeModal = (result = { ok: false, canceled: true }) => {
    clearTimeout(state.searchTimer);
    state.searchTimer = null;
    state.requestId += 1;
    hideModal();
    document.removeEventListener("keydown", onKeydown, true);
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
    if (els?.searchInput) els.searchInput.value = "";
    if (state.restoreFocus && typeof state.restoreFocus.focus === "function") {
      try {
        state.restoreFocus.focus();
      } catch {}
    }
    state.restoreFocus = null;
    if (state.resolvePending) state.resolvePending(result);
    state.resolvePending = null;
    state.pendingPromise = null;
  };

  const openModal = async (trigger = null) => {
    ensureModal();
    captureEls();
    bindEvents();
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
    if (els.searchInput) els.searchInput.value = "";
    showModal();
    document.addEventListener("keydown", onKeydown, true);
    renderEntries();
    await loadEntries({ page: 1 });
    els.searchInput?.focus?.();
    return state.pendingPromise;
  };

  const bindEvents = () => {
    if (eventsBound || !els?.modal) return;
    eventsBound = true;
    els.closeBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    els.cancelBtn?.addEventListener("click", () => closeModal({ ok: false, canceled: true }));
    els.modal.addEventListener("click", (evt) => {
      if (evt.target === els.modal) closeModal({ ok: false, canceled: true });
    });
    els.searchInput?.addEventListener("input", (evt) => {
      state.query = normalizeText(evt?.target?.value || "");
      state.page = 1;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        void loadEntries({ page: 1 });
      }, 220);
    });
    els.searchInput?.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter") return;
      evt.preventDefault();
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
      state.query = normalizeText(els.searchInput?.value || "");
      state.page = 1;
      void loadEntries({ page: 1 });
    });
    els.selectAllBtn?.addEventListener("click", selectAllVisible);
    els.unselectAllBtn?.addEventListener("click", unselectAll);
    els.confirmBtn?.addEventListener("click", () => {
      void confirmDeleteSelection();
    });
    els.prevBtn?.addEventListener("click", () => {
      if (state.loading || state.busy || state.page <= 1) return;
      state.page -= 1;
      void loadEntries({ page: state.page });
    });
    els.nextBtn?.addEventListener("click", () => {
      const totalPages = getTotalPages();
      if (state.loading || state.busy || state.page >= totalPages) return;
      state.page += 1;
      void loadEntries({ page: state.page });
    });
    els.pageInput?.addEventListener("focus", (evt) => {
      try {
        evt.target.select();
      } catch {}
    });
    els.pageInput?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const nextPage = clampPage(els.pageInput?.value || state.page);
        if (nextPage !== state.page) {
          state.page = nextPage;
          void loadEntries({ page: nextPage });
          return;
        }
        renderPager();
      } else if (evt.key === "Escape") {
        evt.preventDefault();
        renderPager();
        els.pageInput.blur();
      }
    });
    els.pageInput?.addEventListener("blur", () => {
      const nextPage = clampPage(els.pageInput?.value || state.page);
      if (nextPage !== state.page) {
        state.page = nextPage;
        void loadEntries({ page: nextPage });
        return;
      }
      renderPager();
    });
    els.listEl?.addEventListener("change", (evt) => {
      const checkbox = evt.target?.closest?.("[data-fournisseur-bulk-delete-check]");
      if (!checkbox || state.loading || state.busy) return;
      const key = normalizeText(checkbox.dataset.fournisseurBulkDeleteCheck || "");
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

  const registerOpenTrigger = () => {
    if (openTriggerBound) return;
    openTriggerBound = true;
    document.addEventListener("click", (evt) => {
      const trigger = evt.target?.closest?.(`#${OPEN_BTN_ID}`);
      if (!trigger) return;
      evt.preventDefault();
      void openModal(trigger);
    });
  };

  AppInit.registerFournisseurBulkDeleteActions = function registerFournisseurBulkDeleteActions() {
    ensureModal();
    captureEls();
    bindEvents();
    registerOpenTrigger();
  };

  AppInit.FournisseurBulkDelete = {
    open: (trigger = null) => openModal(trigger),
    close: () => closeModal({ ok: false, canceled: true })
  };
})(window);
