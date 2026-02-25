(function (w) {
  const SEM = (w.SEM = w.SEM || {});

  const MODAL_ID = "depotMagasinSavedModal";
  const PAGE_SIZE = 3;
  const MIN_SEARCH_LENGTH = 2;

  let searchTimer = null;
  let restoreFocusTarget = null;
  let requestId = 0;

  const state = {
    loading: false,
    query: "",
    page: 1,
    total: 0,
    items: [],
    message: ""
  };

  const refs = {
    modal: null,
    closeBtn: null,
    closeFooterBtn: null,
    refreshBtn: null,
    searchInput: null,
    searchBtn: null,
    list: null,
    status: null,
    prevBtn: null,
    nextBtn: null,
    pageInput: null,
    totalPages: null
  };

  const normalizeText = (value) => String(value || "").trim();
  const normalizeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const showMessage = async (message, title = "Depot/Magasin") => {
    if (typeof w.showDialog === "function") {
      await w.showDialog(message, { title });
      return;
    }
    if (typeof w.alert === "function") w.alert(message);
  };

  const askConfirm = async (message, title = "Confirmation") => {
    if (typeof w.showConfirm === "function") {
      return !!(await w.showConfirm(message, { title, okText: "Continuer", cancelText: "Annuler" }));
    }
    if (typeof w.confirm === "function") return !!w.confirm(message);
    return true;
  };

  const hydrateRefs = () => {
    if (refs.modal && refs.modal.isConnected) return refs;
    refs.modal = document.getElementById(MODAL_ID);
    refs.closeBtn = document.getElementById("depotMagasinSavedModalClose");
    refs.closeFooterBtn = document.getElementById("depotMagasinSavedModalCloseFooter");
    refs.refreshBtn = document.getElementById("depotMagasinSavedModalRefresh");
    refs.searchInput = document.getElementById("depotMagasinSavedSearch");
    refs.searchBtn = document.getElementById("depotMagasinSavedSearchBtn");
    refs.list = document.getElementById("depotMagasinSavedModalList");
    refs.status = document.getElementById("depotMagasinSavedModalStatus");
    refs.prevBtn = document.getElementById("depotMagasinSavedModalPrev");
    refs.nextBtn = document.getElementById("depotMagasinSavedModalNext");
    refs.pageInput = document.getElementById("depotMagasinSavedModalPageInput");
    refs.totalPages = document.getElementById("depotMagasinSavedModalTotalPages");
    return refs;
  };

  const isOpen = () => {
    const { modal } = hydrateRefs();
    if (!modal) return false;
    return !modal.hidden && modal.getAttribute("aria-hidden") !== "true";
  };

  const depotPathFromRecord = (record = {}) => {
    const rawPath = normalizeText(record.path);
    const rawId = normalizeText(record.id) || rawPath.replace(/^sqlite:\/\/depots\//i, "");
    if (rawPath) return rawPath;
    return rawId ? `sqlite://depots/${rawId}` : "";
  };

  const normalizeDepotRecord = (record = {}) => {
    const path = depotPathFromRecord(record);
    const id = normalizeText(record.id) || path.replace(/^sqlite:\/\/depots\//i, "");
    const emplacements = Array.isArray(record.emplacements) ? record.emplacements : [];
    const emplacementCount = Math.max(
      0,
      normalizeNumber(record.emplacementCount || record.emplacementsCount || emplacements.length)
    );
    return {
      id,
      path,
      name: normalizeText(record.name),
      address: normalizeText(record.address),
      emplacementCount
    };
  };

  const totalPages = () => {
    if (!state.total) return 1;
    return Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  };

  const clearSearchTimer = () => {
    if (!searchTimer) return;
    clearTimeout(searchTimer);
    searchTimer = null;
  };

  const renderStatus = () => {
    const { status } = hydrateRefs();
    if (!status) return;
    if (state.loading) {
      status.textContent = "Chargement...";
      return;
    }
    if (state.message) {
      status.textContent = state.message;
      return;
    }
    if (!state.total) {
      status.textContent = "Aucun depot/magasin enregistre.";
      return;
    }
    const start = (state.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.total, start + Math.max(0, state.items.length - 1));
    status.textContent = `${state.total} resultat(s) (${start}-${end}).`;
  };

  const renderPagination = () => {
    const { prevBtn, nextBtn, pageInput, totalPages: totalPagesNode } = hydrateRefs();
    const pages = totalPages();
    if (totalPagesNode) totalPagesNode.textContent = String(pages);
    if (pageInput) {
      pageInput.value = String(state.page || 1);
      pageInput.min = "1";
      pageInput.max = String(pages);
      pageInput.setAttribute("aria-valuemin", "1");
      pageInput.setAttribute("aria-valuemax", String(pages));
      pageInput.setAttribute("aria-valuenow", String(state.page || 1));
    }
    if (prevBtn) prevBtn.disabled = state.loading || state.total <= 0 || state.page <= 1;
    if (nextBtn) nextBtn.disabled = state.loading || state.total <= 0 || state.page >= pages;
  };

  const renderList = () => {
    const { list } = hydrateRefs();
    if (!list) return;
    list.replaceChildren();

    if (!state.items.length) {
      if (state.loading) return;
      const empty = document.createElement("div");
      empty.className = "client-saved-modal__empty";
      empty.textContent = state.message || "Aucun depot/magasin enregistre.";
      list.appendChild(empty);
      return;
    }

    state.items.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "client-search__option";
      const name = escapeHtml(entry.name || "N.R.");
      const address = escapeHtml(entry.address || "N.R.");
      const count = Math.max(0, normalizeNumber(entry.emplacementCount));
      const countLabel = count > 1 ? `${count} emplacements` : `${count} emplacement`;

      row.innerHTML = `
        <button
          type="button"
          class="client-search__select client-search__select--detailed"
          data-depot-saved-edit-index="${index}"
        >
          <span class="client-search__details-grid">
            <span class="client-search__details-row">
              <span class="client-search__detail client-search__detail--inline client-search__detail--name">
                <span class="client-search__detail-label">Nom</span>
                <span class="client-search__detail-value">${name}</span>
              </span>
              <span class="client-search__detail client-search__detail--inline">
                <span class="client-search__detail-label">Emplacements</span>
                <span class="client-search__detail-value">${escapeHtml(countLabel)}</span>
              </span>
            </span>
            <span class="client-search__details-row">
              <span class="client-search__detail client-search__detail--description">
                <span class="client-search__detail-label">Adresse</span>
                <span class="client-search__detail-value">${address}</span>
              </span>
            </span>
          </span>
        </button>
        <div class="client-search__actions">
          <button
            type="button"
            class="client-search__edit"
            data-depot-saved-edit-index="${index}"
          >
            Mettre a jour
          </button>
          <button
            type="button"
            class="client-search__delete"
            data-depot-saved-delete-index="${index}"
          >
            Supprimer
          </button>
        </div>
      `;
      list.appendChild(row);
    });
  };

  const render = () => {
    renderList();
    renderStatus();
    renderPagination();
  };

  const fetchDepotsPage = async (page = 1) => {
    const currentRequest = ++requestId;
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const query = normalizeText(state.query);

    state.loading = true;
    state.page = safePage;
    state.message = "";
    render();

    if (query && query.length < MIN_SEARCH_LENGTH) {
      if (currentRequest !== requestId) return;
      state.loading = false;
      state.page = 1;
      state.total = 0;
      state.items = [];
      state.message = `Tapez au moins ${MIN_SEARCH_LENGTH} caracteres.`;
      render();
      return;
    }

    if (!w.electronAPI?.searchDepots) {
      if (currentRequest !== requestId) return;
      state.loading = false;
      state.total = 0;
      state.items = [];
      state.message = "Recherche des depots/magasins indisponible.";
      render();
      return;
    }

    try {
      const offset = (safePage - 1) * PAGE_SIZE;
      const response = await w.electronAPI.searchDepots({
        query,
        limit: PAGE_SIZE,
        offset
      });
      if (currentRequest !== requestId) return;
      if (!response?.ok) {
        state.loading = false;
        state.total = 0;
        state.items = [];
        state.message = response?.error || "Chargement impossible.";
        render();
        return;
      }

      const total = Math.max(0, normalizeNumber(response?.total));
      const pages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
      const boundedPage = Math.min(safePage, pages);

      if (boundedPage !== safePage) {
        state.loading = false;
        state.page = boundedPage;
        renderPagination();
        await fetchDepotsPage(boundedPage);
        return;
      }

      state.items = Array.isArray(response?.results)
        ? response.results.map((entry) => normalizeDepotRecord(entry))
        : [];
      state.total = total;
      state.page = total ? safePage : 1;
      state.message = "";
    } catch (err) {
      if (currentRequest !== requestId) return;
      state.total = 0;
      state.items = [];
      state.message = "Chargement impossible.";
      console.error("depot saved modal fetch", err);
    } finally {
      if (currentRequest !== requestId) return;
      state.loading = false;
      render();
    }
  };

  const openModal = (trigger = null) => {
    const { modal, searchInput } = hydrateRefs();
    if (!modal) return;
    restoreFocusTarget =
      trigger instanceof HTMLElement
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");

    state.query = normalizeText(searchInput?.value);
    state.page = 1;
    state.total = 0;
    state.items = [];
    state.message = "";
    render();

    fetchDepotsPage(1);

    if (searchInput && typeof searchInput.focus === "function") {
      setTimeout(() => {
        try {
          searchInput.focus({ preventScroll: true });
        } catch {
          searchInput.focus();
        }
      }, 0);
    }
  };

  const closeModal = ({ restoreFocus = true } = {}) => {
    const { modal } = hydrateRefs();
    if (!modal) return;
    clearSearchTimer();
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");

    if (restoreFocus && restoreFocusTarget && typeof restoreFocusTarget.focus === "function") {
      try {
        restoreFocusTarget.focus();
      } catch {}
    }
    restoreFocusTarget = null;
  };

  const applyPageInput = async () => {
    const { pageInput } = hydrateRefs();
    if (!pageInput || state.loading) return;
    const raw = normalizeText(pageInput.value);
    if (!raw) {
      pageInput.value = String(state.page || 1);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      pageInput.value = String(state.page || 1);
      return;
    }
    const targetPage = Math.min(totalPages(), Math.max(1, Math.floor(parsed)));
    if (targetPage === state.page) {
      pageInput.value = String(state.page || 1);
      return;
    }
    await fetchDepotsPage(targetPage);
  };

  const scheduleSearch = () => {
    clearSearchTimer();
    searchTimer = setTimeout(() => {
      const { searchInput } = hydrateRefs();
      state.query = normalizeText(searchInput?.value);
      state.page = 1;
      fetchDepotsPage(1);
    }, 170);
  };

  const refreshDepotCache = async () => {
    if (typeof SEM.depotMagasin?.refresh !== "function") return;
    try {
      await SEM.depotMagasin.refresh("");
    } catch {}
  };

  const openDepotEditByIndex = async (indexValue) => {
    const index = Number(indexValue);
    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) return;
    const selected = state.items[index];
    const path = depotPathFromRecord(selected);
    if (!path) {
      await showMessage("Depot/magasin introuvable.");
      return;
    }
    closeModal({ restoreFocus: false });
    if (typeof SEM.depotMagasin?.openEditForm === "function") {
      await SEM.depotMagasin.openEditForm(path);
      return;
    }
    await showMessage("Ouverture de la fiche depot/magasin indisponible.");
  };

  const deleteDepotByIndex = async (indexValue) => {
    const index = Number(indexValue);
    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) return;
    const selected = state.items[index];
    const path = depotPathFromRecord(selected);
    const id = normalizeText(selected.id);
    if (!path && !id) {
      await showMessage("Depot/magasin introuvable.");
      return;
    }
    const confirmed = await askConfirm(
      "Supprimer ce depot/magasin et tous ses emplacements ?",
      "Suppression"
    );
    if (!confirmed) return;

    if (!w.electronAPI?.deleteDepot) {
      await showMessage("Suppression indisponible.");
      return;
    }

    const response = await w.electronAPI.deleteDepot({ path, id });
    if (!response?.ok) {
      await showMessage(response?.error || "Suppression impossible.");
      return;
    }

    await refreshDepotCache();
    await fetchDepotsPage(state.page || 1);
  };

  const bindEvents = () => {
    if (SEM.__depotMagasinSavedModalBound || typeof document === "undefined") return;
    SEM.__depotMagasinSavedModalBound = true;

    document.addEventListener("click", async (evt) => {
      const target = evt.target instanceof Element ? evt.target : null;
      if (!target) return;

      const openBtn = target.closest("#depotMagasinSavedListBtn");
      if (openBtn) {
        evt.preventDefault();
        openModal(openBtn);
        return;
      }

      if (!isOpen()) return;

      const { modal } = hydrateRefs();
      if (target === modal) {
        closeModal();
        return;
      }
      if (
        target.closest("#depotMagasinSavedModalClose") ||
        target.closest("#depotMagasinSavedModalCloseFooter")
      ) {
        closeModal();
        return;
      }
      if (target.closest("#depotMagasinSavedModalRefresh")) {
        if (state.loading) return;
        const { searchInput } = hydrateRefs();
        state.query = normalizeText(searchInput?.value);
        await fetchDepotsPage(Math.max(1, state.page || 1));
        return;
      }
      if (target.closest("#depotMagasinSavedSearchBtn")) {
        const { searchInput } = hydrateRefs();
        state.query = normalizeText(searchInput?.value);
        state.page = 1;
        await fetchDepotsPage(1);
        return;
      }
      if (target.closest("#depotMagasinSavedModalPrev")) {
        if (state.loading) return;
        const prevPage = Math.max(1, state.page - 1);
        if (prevPage !== state.page) await fetchDepotsPage(prevPage);
        return;
      }
      if (target.closest("#depotMagasinSavedModalNext")) {
        if (state.loading || !state.total) return;
        const nextPage = Math.min(totalPages(), state.page + 1);
        if (nextPage !== state.page) await fetchDepotsPage(nextPage);
        return;
      }

      const editBtn = target.closest("[data-depot-saved-edit-index]");
      if (editBtn) {
        await openDepotEditByIndex(editBtn.getAttribute("data-depot-saved-edit-index"));
        return;
      }

      const deleteBtn = target.closest("[data-depot-saved-delete-index]");
      if (deleteBtn) {
        await deleteDepotByIndex(deleteBtn.getAttribute("data-depot-saved-delete-index"));
      }
    });

    document.addEventListener("input", (evt) => {
      const target = evt.target instanceof HTMLElement ? evt.target : null;
      if (!target || target.id !== "depotMagasinSavedSearch") return;
      if (!isOpen()) return;
      scheduleSearch();
    });

    document.addEventListener("keydown", async (evt) => {
      const target = evt.target instanceof HTMLElement ? evt.target : null;
      if (!isOpen()) return;

      if (evt.key === "Escape") {
        if (target?.id === "depotMagasinSavedModalPageInput") {
          const { pageInput } = hydrateRefs();
          if (pageInput) pageInput.value = String(state.page || 1);
        }
        closeModal();
        return;
      }

      if (evt.key === "Enter" && target?.id === "depotMagasinSavedSearch") {
        evt.preventDefault();
        clearSearchTimer();
        state.query = normalizeText(target.value);
        state.page = 1;
        await fetchDepotsPage(1);
        return;
      }

      if (evt.key === "Enter" && target?.id === "depotMagasinSavedModalPageInput") {
        evt.preventDefault();
        clearSearchTimer();
        await applyPageInput();
        target.blur();
      }
    });

    document.addEventListener(
      "focusout",
      async (evt) => {
        const target = evt.target instanceof HTMLElement ? evt.target : null;
        if (!target || target.id !== "depotMagasinSavedModalPageInput") return;
        if (!isOpen()) return;
        await applyPageInput();
      },
      true
    );
  };

  const init = () => {
    hydrateRefs();
    bindEvents();
    render();
  };

  SEM.depotMagasinSavedModal = {
    init,
    open: openModal,
    close: closeModal,
    refresh: () => fetchDepotsPage(Math.max(1, state.page || 1))
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
