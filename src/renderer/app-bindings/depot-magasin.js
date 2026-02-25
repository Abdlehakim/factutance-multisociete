(function (w) {
  const SEM = (w.SEM = w.SEM || {});

  const PANEL_ID = "clientBoxMainscreenDepotsPanel";
  const POPOVER_ID = "depotMagasinFormPopover";
  const RESULTS_ID = "depotMagasinSearchResults";
  const SEARCH_INPUT_ID = "depotMagasinSearch";
  const SEARCH_LIMIT = 120;

  let depotsCache = [];
  let activeDepotPath = "";
  let searchTimer = null;
  let draftEmplacements = [];

  const getEl = (id, scope = document) => scope?.querySelector?.(`#${id}`) || document.getElementById(id);
  const normalizeText = (value) => String(value || "").trim();
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

  const getPanel = () =>
    document.querySelector(`#${PANEL_ID}.is-active`) || document.getElementById(PANEL_ID);
  const getPopover = () => document.getElementById(POPOVER_ID);

  const resolveDepotId = (record = {}) =>
    normalizeText(record.id) ||
    normalizeText(record.path).replace(/^sqlite:\/\/depots\//i, "");

  const normalizeDepotRecord = (record = {}) => {
    const emplacements = Array.isArray(record.emplacements)
      ? record.emplacements
          .map((entry) => {
            const source = entry && typeof entry === "object" ? entry : {};
            const name = normalizeText(source.name || source.code || source.label);
            return {
              id: normalizeText(source.id),
              name
            };
          })
          .filter((entry) => entry.name)
      : [];
    const id = resolveDepotId(record);
    const path = normalizeText(record.path) || (id ? `sqlite://depots/${id}` : "");
    return {
      id,
      path,
      name: normalizeText(record.name),
      address: normalizeText(record.address),
      emplacements,
      emplacementCount: Number(record.emplacementCount) || emplacements.length
    };
  };

  const syncStockDepots = () => {
    const normalized = depotsCache.map((entry) => normalizeDepotRecord(entry));
    SEM.depotMagasin = SEM.depotMagasin || {};
    SEM.depotMagasin.records = normalized;
    if (SEM.stockWindow?.setDepotRecords) {
      SEM.stockWindow.setDepotRecords(normalized);
    }
  };

  const setResultsHidden = (hidden) => {
    const results = getEl(RESULTS_ID);
    if (!results) return;
    results.hidden = !!hidden;
    if (hidden) results.setAttribute("hidden", "");
    else results.removeAttribute("hidden");
  };

  const closePopover = () => {
    const popover = getPopover();
    const panel = getPanel();
    if (popover) {
      popover.classList.remove("is-open");
      popover.hidden = true;
      popover.setAttribute("hidden", "");
      popover.setAttribute("aria-hidden", "true");
      popover.dataset.depotFormMode = "create";
      popover.dataset.depotPath = "";
    }
    activeDepotPath = "";
    const toggleBtn = getEl("depotMagasinFormToggleBtn", panel || document);
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  };

  const openPopover = () => {
    const popover = getPopover();
    const panel = getPanel();
    if (!popover) return false;
    popover.hidden = false;
    popover.removeAttribute("hidden");
    popover.setAttribute("aria-hidden", "false");
    popover.classList.add("is-open");
    const toggleBtn = getEl("depotMagasinFormToggleBtn", panel || document);
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
    return true;
  };

  const getEmplacementsInput = () => getEl("depotMagasinEmplacementInput");
  const getEmplacementsChipsContainer = () => getEl("depotMagasinEmplacementsChips");
  const toEmplacementKey = (value) => normalizeText(value).toLowerCase();

  const renderEmplacements = (entries = draftEmplacements) => {
    const chips = getEmplacementsChipsContainer();
    if (!chips) return;
    const list = Array.isArray(entries) ? entries : [];
    chips.replaceChildren();
    list.forEach((entry, index) => {
      const chip = document.createElement("div");
      chip.className = "depot-magasin-modal__emplacement-chip";
      chip.innerHTML = `
        <span class="depot-magasin-modal__emplacement-chip-text">${escapeHtml(
          normalizeText(entry.name)
        )}</span>
        <button
          type="button"
          class="depot-magasin-modal__emplacement-chip-remove"
          data-emplacement-remove-index="${index}"
          aria-label="Supprimer l'emplacement ${escapeHtml(normalizeText(entry.name))}"
        >
          &times;
        </button>
      `;
      chips.appendChild(chip);
    });
  };

  const setDraftEmplacements = (entries = []) => {
    const source = Array.isArray(entries) ? entries : [];
    const seen = new Set();
    draftEmplacements = source
      .map((entry) => ({
        id: normalizeText(entry?.id),
        name: normalizeText(entry?.name)
      }))
      .filter((entry) => {
        if (!entry.name) return false;
        const key = toEmplacementKey(entry.name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    renderEmplacements(draftEmplacements);
  };

  const readEmplacementsFromForm = () =>
    draftEmplacements.map((entry) => ({
      id: normalizeText(entry.id),
      name: normalizeText(entry.name)
    }));

  const addEmplacementFromInput = async () => {
    const input = getEmplacementsInput();
    if (!input) return;
    const name = normalizeText(input.value);
    if (!name) {
      input.focus();
      return;
    }
    const key = toEmplacementKey(name);
    if (draftEmplacements.some((entry) => toEmplacementKey(entry.name) === key)) {
      await showMessage("Cet emplacement existe deja.");
      input.focus();
      input.select?.();
      return;
    }
    draftEmplacements.push({ id: "", name });
    renderEmplacements(draftEmplacements);
    input.value = "";
    input.focus();
    refreshActionButtons();
  };

  const removeEmplacementByIndex = (indexValue) => {
    const index = Number(indexValue);
    if (!Number.isInteger(index) || index < 0 || index >= draftEmplacements.length) return;
    draftEmplacements.splice(index, 1);
    renderEmplacements(draftEmplacements);
    refreshActionButtons();
  };

  const formHasContent = () => {
    const name = normalizeText(getEl("depotMagasinName")?.value);
    const address = normalizeText(getEl("depotMagasinAddress")?.value);
    const hasEmplacementContent =
      draftEmplacements.length > 0 ||
      normalizeText(getEmplacementsInput()?.value).length > 0;
    return !!(name || address || hasEmplacementContent);
  };

  const refreshActionButtons = () => {
    const popover = getPopover();
    if (!popover || popover.hidden || popover.getAttribute("aria-hidden") === "true") return;
    const mode = normalizeText(popover.dataset.depotFormMode).toLowerCase() || "create";
    const hasName = normalizeText(getEl("depotMagasinName")?.value).length > 0;
    const hasContent = formHasContent();

    const btnSave = getEl("btnSaveDepotMagasin");
    const btnUpdate = getEl("btnUpdateDepotMagasin");
    const btnNew = getEl("btnNewDepotMagasin");
    if (btnSave) {
      const showSave = mode !== "edit";
      btnSave.hidden = !showSave;
      btnSave.setAttribute("aria-hidden", showSave ? "false" : "true");
      btnSave.disabled = !showSave || !hasName;
    }
    if (btnUpdate) {
      const showUpdate = mode === "edit";
      btnUpdate.hidden = !showUpdate;
      btnUpdate.setAttribute("aria-hidden", showUpdate ? "false" : "true");
      btnUpdate.disabled = !showUpdate || !hasName;
    }
    if (btnNew) {
      btnNew.disabled = !hasContent;
    }
  };

  const resetForm = () => {
    const popover = getPopover();
    if (popover) {
      popover.dataset.depotFormMode = "create";
      popover.dataset.depotPath = "";
    }
    activeDepotPath = "";
    const nameInput = getEl("depotMagasinName");
    const addressInput = getEl("depotMagasinAddress");
    if (nameInput) nameInput.value = "";
    if (addressInput) addressInput.value = "";
    const emplacementInput = getEmplacementsInput();
    if (emplacementInput) emplacementInput.value = "";
    setDraftEmplacements([]);
    refreshActionButtons();
  };

  const fillForm = (record = {}) => {
    const normalized = normalizeDepotRecord(record);
    const popover = getPopover();
    if (popover) {
      popover.dataset.depotFormMode = "edit";
      popover.dataset.depotPath = normalized.path || "";
    }
    activeDepotPath = normalized.path || "";
    const nameInput = getEl("depotMagasinName");
    const addressInput = getEl("depotMagasinAddress");
    if (nameInput) nameInput.value = normalized.name;
    if (addressInput) addressInput.value = normalized.address;
    const emplacementInput = getEmplacementsInput();
    if (emplacementInput) emplacementInput.value = "";
    setDraftEmplacements(normalized.emplacements);
    refreshActionButtons();
  };

  const buildPayloadFromForm = () => ({
    name: normalizeText(getEl("depotMagasinName")?.value),
    address: normalizeText(getEl("depotMagasinAddress")?.value),
    emplacements: readEmplacementsFromForm()
  });

  const findDepotByPath = (pathValue = "") => {
    const targetPath = normalizeText(pathValue);
    if (!targetPath) return null;
    return depotsCache.find((entry) => normalizeText(entry.path) === targetPath) || null;
  };

  const openCreateForm = () => {
    resetForm();
    if (!openPopover()) return;
    getEl("depotMagasinName")?.focus?.();
  };

  const openEditForm = async (pathValue = "") => {
    const path = normalizeText(pathValue);
    if (!path) return;
    let record = findDepotByPath(path);
    if (!record && w.electronAPI?.openDepot) {
      const opened = await w.electronAPI.openDepot({ path });
      if (opened?.ok && opened.depot) {
        record = normalizeDepotRecord(opened.depot);
      }
    }
    if (!record) {
      await showMessage("Depot/magasin introuvable.");
      return;
    }
    if (!openPopover()) return;
    fillForm(record);
    getEl("depotMagasinName")?.focus?.();
  };

  const renderSearchResults = (records = []) => {
    const results = getEl(RESULTS_ID);
    if (!results) return;
    results.replaceChildren();

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "client-search__option";
      empty.innerHTML = `<div class="client-search__empty">Aucun depot/magasin trouve.</div>`;
      results.appendChild(empty);
      setResultsHidden(false);
      return;
    }

    records.forEach((rawRecord) => {
      const record = normalizeDepotRecord(rawRecord);
      const row = document.createElement("div");
      row.className = "client-search__option depot-magasin-search__option";
      const safePath = escapeHtml(record.path);
      const safeName = escapeHtml(record.name || "-");
      const safeAddress = escapeHtml(record.address || "N.R.");
      row.innerHTML = `
        <button
          type="button"
          class="client-search__select client-search__select--detailed depot-magasin-search__select"
          data-depot-edit-path="${safePath}"
        >
          <span class="client-search__details-grid">
            <span class="client-search__details-row">
              <span class="client-search__detail client-search__detail--inline">
                <span class="client-search__detail-label">Depot/Magasin</span>
                <span class="client-search__detail-value">${safeName}</span>
              </span>
              <span class="client-search__detail client-search__detail--inline">
                <span class="client-search__detail-label">Emplacements</span>
                <span class="client-search__detail-value">${record.emplacementCount || 0}</span>
              </span>
            </span>
            <span class="client-search__details-row">
              <span class="client-search__detail client-search__detail--description">
                <span class="client-search__detail-label">Adresse</span>
                <span class="client-search__detail-value">${safeAddress}</span>
              </span>
            </span>
          </span>
        </button>
        <div class="client-search__actions depot-magasin-search__actions">
          <button
            type="button"
            class="client-search__edit"
            data-depot-edit-path="${safePath}"
          >
            Modifier
          </button>
          <button
            type="button"
            class="client-search__delete"
            data-depot-delete-path="${safePath}"
          >
            Supprimer
          </button>
        </div>
      `;
      results.appendChild(row);
    });
    setResultsHidden(false);
  };

  const fetchDepots = async (query = "") => {
    if (!w.electronAPI?.searchDepots) {
      return { ok: false, results: [], total: 0, error: "API depots indisponible." };
    }
    return w.electronAPI.searchDepots({
      query: normalizeText(query),
      limit: SEARCH_LIMIT,
      offset: 0
    });
  };

  const refreshDepots = async ({ query = "", showDropdown = false } = {}) => {
    const response = await fetchDepots(query);
    if (!response?.ok) {
      if (showDropdown) {
        renderSearchResults([]);
      }
      return response;
    }
    depotsCache = Array.isArray(response.results)
      ? response.results.map((entry) => normalizeDepotRecord(entry))
      : [];
    syncStockDepots();
    if (showDropdown) renderSearchResults(depotsCache);
    return response;
  };

  const deleteDepotByPath = async (pathValue = "") => {
    const path = normalizeText(pathValue);
    if (!path || !w.electronAPI?.deleteDepot) return;
    const confirmed = await askConfirm(
      "Supprimer ce depot/magasin et tous ses emplacements ?",
      "Suppression"
    );
    if (!confirmed) return;
    const response = await w.electronAPI.deleteDepot({ path });
    if (!response?.ok) {
      await showMessage(response?.error || "Suppression impossible.");
      return;
    }
    const query = normalizeText(getEl(SEARCH_INPUT_ID)?.value);
    await refreshDepots({ query, showDropdown: true });
    if (normalizeText(activeDepotPath) === path) {
      closePopover();
    }
  };

  const saveDepot = async ({ forceCreate = false } = {}) => {
    const payload = buildPayloadFromForm();
    if (!payload.name) {
      await showMessage("Le nom du depot/magasin est obligatoire.");
      getEl("depotMagasinName")?.focus?.();
      return;
    }

    const popover = getPopover();
    const mode = normalizeText(popover?.dataset?.depotFormMode).toLowerCase() || "create";
    const shouldUpdate = mode === "edit" && !forceCreate;
    const suggestedName = payload.name;

    let response = null;
    if (shouldUpdate) {
      if (!w.electronAPI?.updateDepotDirect) {
        await showMessage("Mise a jour indisponible.");
        return;
      }
      const path = normalizeText(popover?.dataset?.depotPath || activeDepotPath);
      response = await w.electronAPI.updateDepotDirect({
        path,
        depot: payload,
        suggestedName
      });
    } else {
      if (!w.electronAPI?.saveDepotDirect) {
        await showMessage("Enregistrement indisponible.");
        return;
      }
      response = await w.electronAPI.saveDepotDirect({
        depot: payload,
        suggestedName
      });
    }

    if (!response?.ok) {
      await showMessage(response?.error || "Operation impossible.");
      return;
    }

    const query = normalizeText(getEl(SEARCH_INPUT_ID)?.value);
    await refreshDepots({ query, showDropdown: true });
    if (forceCreate) {
      resetForm();
      getEl("depotMagasinName")?.focus?.();
    } else {
      closePopover();
    }
  };

  const handleSearchInput = () => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    searchTimer = setTimeout(() => {
      const query = normalizeText(getEl(SEARCH_INPUT_ID)?.value);
      refreshDepots({ query, showDropdown: true });
    }, 170);
  };

  const bindEvents = () => {
    if (SEM.__depotMagasinBound || typeof document === "undefined") return;
    SEM.__depotMagasinBound = true;

    document.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (!target.closest(`#${PANEL_ID}, #${POPOVER_ID}`)) {
        setResultsHidden(true);
      }

      if (target.closest("#depotMagasinFormToggleBtn")) {
        openCreateForm();
        return;
      }
      if (target.closest("[data-depot-form-close]")) {
        closePopover();
        return;
      }
      if (target.closest("#depotMagasinAddEmplacement")) {
        await addEmplacementFromInput();
        return;
      }
      const removeChipBtn = target.closest("[data-emplacement-remove-index]");
      if (removeChipBtn) {
        removeEmplacementByIndex(removeChipBtn.getAttribute("data-emplacement-remove-index"));
        return;
      }
      if (target.closest("#btnSaveDepotMagasin")) {
        await saveDepot({ forceCreate: false });
        return;
      }
      if (target.closest("#btnUpdateDepotMagasin")) {
        await saveDepot({ forceCreate: false });
        return;
      }
      if (target.closest("#btnNewDepotMagasin")) {
        await saveDepot({ forceCreate: true });
        return;
      }
      if (target.closest("#depotMagasinSearchBtn")) {
        const query = normalizeText(getEl(SEARCH_INPUT_ID)?.value);
        await refreshDepots({ query, showDropdown: true });
        return;
      }
      if (target.closest("#depotMagasinSettingsBtn")) {
        await showMessage("Cette action sera disponible dans une prochaine mise a jour.");
        return;
      }

      const editBtn = target.closest("[data-depot-edit-path]");
      if (editBtn) {
        const pathValue = normalizeText(editBtn.getAttribute("data-depot-edit-path"));
        await openEditForm(pathValue);
        return;
      }

      const deleteBtn = target.closest("[data-depot-delete-path]");
      if (deleteBtn) {
        const pathValue = normalizeText(deleteBtn.getAttribute("data-depot-delete-path"));
        await deleteDepotByPath(pathValue);
      }
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.id === SEARCH_INPUT_ID) {
        handleSearchInput();
        return;
      }
      if (target.closest(`#${POPOVER_ID}`)) {
        refreshActionButtons();
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(`#${POPOVER_ID}`)) {
        refreshActionButtons();
      }
    });

    document.addEventListener("keydown", async (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.key === "Enter" && event.target.id === SEARCH_INPUT_ID) {
        event.preventDefault();
        const query = normalizeText(getEl(SEARCH_INPUT_ID)?.value);
        await refreshDepots({ query, showDropdown: true });
        return;
      }
      if (event.key === "Enter" && event.target.id === "depotMagasinEmplacementInput") {
        event.preventDefault();
        await addEmplacementFromInput();
      }
      if (event.key === "Escape") {
        if (!getPopover()?.hidden) {
          closePopover();
          return;
        }
        setResultsHidden(true);
      }
    });
  };

  const init = async () => {
    bindEvents();
    setDraftEmplacements([]);
    refreshActionButtons();
    await refreshDepots({ query: "", showDropdown: false });
  };

  SEM.depotMagasin = {
    init,
    refresh: (query = "") => refreshDepots({ query, showDropdown: false }),
    getRecords: () => depotsCache.slice(),
    openCreateForm,
    openEditForm
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
