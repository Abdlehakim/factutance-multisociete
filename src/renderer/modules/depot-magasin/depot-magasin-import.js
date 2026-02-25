(function (w) {
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const IMPORT_TRIGGER_SELECTOR = "#depotMagasinImportBtn";
  const IMPORT_MODAL_ID = "depotMagasinImportModal";
  const IMPORT_ERROR_LIMIT = 8;
  const DEPOT_IMPORT_SEARCH_LIMIT = 200;

  const normalizeText = (value) => String(value ?? "").trim();
  const normalizeHeaderKey = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const normalizeDepotNameKey = (value) => normalizeText(value).toLowerCase();

  const DEPOT_IMPORT_HEADER_MAP = {
    nom: "name",
    name: "name",
    nomdepot: "name",
    nommagasin: "name",
    nomdepotmagasin: "name",
    nomdudepot: "name",
    nomdumagasin: "name",
    nomdudepotmagasin: "name",
    depot: "name",
    magasin: "name",
    adresse: "address",
    address: "address",
    emplacement: "emplacements",
    emplacements: "emplacements",
    codeemplacement: "emplacements",
    codesemplacements: "emplacements",
    stockemplacements: "emplacements"
  };

  const resolveDepotImportField = (header) => {
    const key = normalizeHeaderKey(header);
    if (!key) return "";
    if (DEPOT_IMPORT_HEADER_MAP[key]) return DEPOT_IMPORT_HEADER_MAP[key];
    if (key.includes("emplacement") || key.includes("location")) return "emplacements";
    if (key.includes("adresse") || key.includes("address")) return "address";
    if (
      key === "nom" ||
      key.includes("depot") ||
      key.includes("magasin") ||
      key.includes("entrepot")
    ) {
      return "name";
    }
    return "";
  };

  const parseEmplacementsValue = (value) => {
    const source = normalizeText(value);
    if (!source) return [];
    const seen = new Set();
    const values = [];
    source
      .split(/[;,]/g)
      .map((entry) => normalizeText(entry))
      .forEach((entry) => {
        if (!entry) return;
        const key = entry.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        values.push(entry);
      });
    return values;
  };

  const detectImportDelimiter = (line = "") => {
    const candidates = [
      { char: ";", count: (line.match(/;/g) || []).length },
      { char: ",", count: (line.match(/,/g) || []).length },
      { char: "\t", count: (line.match(/\t/g) || []).length }
    ];
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0].count > 0 ? candidates[0].char : ";";
  };

  const parseDelimitedRows = (text, delimiter) => {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;
    const pushValue = () => {
      row.push(value);
      value = "";
    };

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            value += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          value += char;
        }
        continue;
      }
      if (char === '"') {
        inQuotes = true;
        continue;
      }
      if (char === delimiter) {
        pushValue();
        continue;
      }
      if (char === "\n") {
        pushValue();
        rows.push(row);
        row = [];
        continue;
      }
      if (char === "\r") continue;
      value += char;
    }

    if (value.length || row.length) {
      row.push(value);
      rows.push(row);
    }
    return rows;
  };

  const parseCsvRows = (text) => {
    const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLine = normalized.split("\n").find((line) => line.trim().length > 0) || "";
    const delimiter = detectImportDelimiter(firstLine);
    return parseDelimitedRows(normalized, delimiter).filter((row) =>
      row.some((cell) => normalizeText(cell).length > 0)
    );
  };

  const parseDepotImportRows = (rows = []) => {
    const result = { items: [], errors: [], totalRows: 0 };
    if (!Array.isArray(rows) || !rows.length) {
      result.errors.push("Fichier vide ou illisible.");
      return result;
    }

    const headerIndex = rows.findIndex((row) =>
      Array.isArray(row) && row.some((cell) => normalizeText(cell).length > 0)
    );
    const headerRow = headerIndex >= 0 ? rows[headerIndex] : [];
    const headerFields = headerRow.map((cell) => resolveDepotImportField(cell));
    if (!headerFields.some(Boolean)) {
      result.errors.push(
        "Colonnes non reconnues. Utilisez: Nom, Adresse, Emplacements."
      );
      return result;
    }

    const seenByName = new Map();
    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      if (!Array.isArray(row) || !row.some((cell) => normalizeText(cell).length > 0)) {
        continue;
      }
      result.totalRows += 1;
      const data = {};
      headerFields.forEach((field, idx) => {
        if (!field) return;
        data[field] = normalizeText(row[idx]);
      });

      const name = normalizeText(data.name);
      if (!name) {
        result.errors.push(`Ligne ${i + 1}: nom du depot/magasin manquant.`);
        continue;
      }

      const item = {
        name,
        address: normalizeText(data.address),
        emplacements: parseEmplacementsValue(data.emplacements)
      };
      const key = normalizeDepotNameKey(name);
      if (seenByName.has(key)) {
        result.items[seenByName.get(key)] = item;
        continue;
      }
      seenByName.set(key, result.items.length);
      result.items.push(item);
    }
    return result;
  };

  const parseImportFile = async (file) => {
    if (!file) {
      return { items: [], errors: ["Aucun fichier selectionne."], totalRows: 0 };
    }
    const fileName = normalizeText(file.name).toLowerCase();
    if (fileName.endsWith(".csv") || file.type === "text/csv") {
      const text = await file.text();
      return parseDepotImportRows(parseCsvRows(text));
    }
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      if (!w.XLSX) {
        return {
          items: [],
          errors: ["Lecture XLSX indisponible. Exportez le fichier au format CSV."],
          totalRows: 0
        };
      }
      const buffer = await file.arrayBuffer();
      const workbook = w.XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = w.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      return parseDepotImportRows(rows);
    }
    const fallback = await file.text();
    return parseDepotImportRows(parseCsvRows(fallback));
  };

  const copyTextToClipboard = async (text) => {
    const value = normalizeText(text);
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

  const fetchExistingDepotsByName = async () => {
    const existing = new Map();
    if (!w.electronAPI?.searchDepots) return existing;

    let offset = 0;
    let total = null;
    while (true) {
      const response = await w.electronAPI.searchDepots({
        query: "",
        limit: DEPOT_IMPORT_SEARCH_LIMIT,
        offset
      });
      if (!response?.ok) break;
      const results = Array.isArray(response.results) ? response.results : [];
      results.forEach((entry) => {
        const nameKey = normalizeDepotNameKey(entry?.name);
        if (!nameKey) return;
        const list = existing.get(nameKey) || [];
        list.push(entry);
        existing.set(nameKey, list);
      });
      const responseTotal = Number(response.total);
      if (Number.isFinite(responseTotal)) total = responseTotal;
      offset += results.length;
      if (results.length < DEPOT_IMPORT_SEARCH_LIMIT) break;
      if (total !== null && offset >= total) break;
    }
    return existing;
  };

  const buildDepotPayload = (item) => ({
    name: normalizeText(item?.name),
    address: normalizeText(item?.address),
    emplacements: (Array.isArray(item?.emplacements) ? item.emplacements : [])
      .map((code) => normalizeText(code))
      .filter(Boolean)
      .map((code) => ({ code }))
  });

  let modal = null;
  let refs = null;
  let restoreFocus = null;
  const state = {
    items: [],
    errors: [],
    fileName: "",
    totalRows: 0,
    busy: false
  };

  const getModalUtils = () => w.DepotMagasinModal || null;

  const ensureModalRefs = () => {
    if (refs && modal && modal.isConnected) return true;
    modal = document.getElementById(IMPORT_MODAL_ID);
    if (!modal) return false;
    refs = {
      closeBtn: modal.querySelector("#depotMagasinImportModalClose"),
      cancelBtn: modal.querySelector("#depotMagasinImportModalCancel"),
      saveBtn: modal.querySelector("#depotMagasinImportModalSave"),
      fileInput: modal.querySelector("#depotMagasinImportFile"),
      summary: modal.querySelector("#depotMagasinImportSummary"),
      errorsList: modal.querySelector("#depotMagasinImportErrors")
    };
    return true;
  };

  const setBusy = (isBusy) => {
    state.busy = !!isBusy;
    if (!modal || !refs) return;
    if (isBusy) modal.setAttribute("aria-busy", "true");
    else modal.removeAttribute("aria-busy");
    if (refs.fileInput) refs.fileInput.disabled = !!isBusy;
    if (refs.closeBtn) refs.closeBtn.disabled = !!isBusy;
    if (refs.cancelBtn) refs.cancelBtn.disabled = !!isBusy;
    if (refs.saveBtn) {
      refs.saveBtn.disabled = !!isBusy || state.items.length === 0;
      if (isBusy) refs.saveBtn.setAttribute("aria-busy", "true");
      else refs.saveBtn.removeAttribute("aria-busy");
    }
  };

  const renderSummary = () => {
    if (!refs?.summary) return;
    if (!state.fileName) {
      refs.summary.textContent = "";
      refs.summary.hidden = true;
      return;
    }
    const total = state.totalRows;
    const ready = state.items.length;
    const errorCount = state.errors.length;
    const totalLabel = `${total} ligne${total > 1 ? "s" : ""} detectee${total > 1 ? "s" : ""}`;
    const readyLabel = `${ready} depot/magasin${ready > 1 ? "s" : ""} pret${ready > 1 ? "s" : ""} a enregistrer`;
    let text = `${state.fileName} - ${totalLabel}. ${readyLabel}.`;
    if (errorCount) {
      text += ` ${errorCount} ligne${errorCount > 1 ? "s" : ""} ignoree${errorCount > 1 ? "s" : ""}.`;
    }
    refs.summary.textContent = text;
    refs.summary.hidden = false;
  };

  const renderErrors = () => {
    if (!refs?.errorsList) return;
    refs.errorsList.innerHTML = "";
    if (!state.errors.length) {
      refs.errorsList.hidden = true;
      return;
    }
    refs.errorsList.hidden = false;
    const top = state.errors.slice(0, IMPORT_ERROR_LIMIT);
    top.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      refs.errorsList.appendChild(item);
    });
    const remaining = state.errors.length - top.length;
    if (remaining > 0) {
      const more = document.createElement("li");
      more.textContent = `+ ${remaining} autre${remaining > 1 ? "s" : ""} erreur${remaining > 1 ? "s" : ""}`;
      refs.errorsList.appendChild(more);
    }
  };

  const resetState = () => {
    state.items = [];
    state.errors = [];
    state.fileName = "";
    state.totalRows = 0;
    if (refs?.fileInput) refs.fileInput.value = "";
    renderSummary();
    renderErrors();
    if (refs?.saveBtn) refs.saveBtn.disabled = true;
  };

  const updateExampleHeaderCopy = () => {
    if (!modal) return;
    const copyBtn = modal.querySelector("[data-depot-magasin-import-copy]");
    if (!copyBtn) return;
    const headers = Array.from(modal.querySelectorAll(".client-import-modal__example-table thead th"))
      .map((node) => normalizeText(node.textContent).replace(/\s+/g, " "))
      .filter(Boolean);
    if (headers.length) {
      copyBtn.dataset.docHistoryCopyValue = headers.join("\t");
    }
  };

  const handleHeaderCopy = async (evt) => {
    const copyBtn = evt.target?.closest?.("[data-depot-magasin-import-copy]");
    if (!copyBtn || !modal?.contains(copyBtn)) return;
    if (copyBtn.getAttribute("aria-disabled") === "true" || copyBtn.classList.contains("is-disabled")) {
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();
    updateExampleHeaderCopy();
    const copyValue = copyBtn.dataset.docHistoryCopyValue || "";
    if (copyValue) await copyTextToClipboard(copyValue);
  };

  const handleHeaderCopyKeydown = (evt) => {
    if (evt.key !== "Enter" && evt.key !== " ") return;
    handleHeaderCopy(evt);
  };

  const closeModal = () => {
    if (state.busy || !modal) return;
    const modalUtils = getModalUtils();
    if (modalUtils?.close) {
      modalUtils.close(modal);
    } else {
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
      if (restoreFocus && typeof restoreFocus.focus === "function") {
        try {
          restoreFocus.focus();
        } catch {}
      }
      restoreFocus = null;
    }
  };

  const openModal = (trigger) => {
    if (!modal) return;
    restoreFocus =
      trigger && typeof trigger.focus === "function"
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    resetState();
    const modalUtils = getModalUtils();
    if (modalUtils?.open) {
      modalUtils.open(modal, {
        trigger: restoreFocus,
        focusSelector: "#depotMagasinImportFile",
        onEscape: closeModal
      });
      return;
    }
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    refs?.fileInput?.focus?.();
  };

  const handleFileChange = async (file) => {
    state.items = [];
    state.errors = [];
    state.totalRows = 0;
    state.fileName = file?.name || "";
    renderSummary();
    renderErrors();
    if (!file) {
      setBusy(false);
      return;
    }
    setBusy(true);
    if (refs?.summary) {
      refs.summary.textContent = "Lecture du fichier...";
      refs.summary.hidden = false;
    }
    try {
      const parsed = await parseImportFile(file);
      state.items = parsed.items || [];
      state.errors = parsed.errors || [];
      state.totalRows = parsed.totalRows || 0;
    } catch (err) {
      console.error("depot import parse", err);
      state.items = [];
      state.errors = ["Impossible de lire ce fichier."];
      state.totalRows = 0;
    } finally {
      renderSummary();
      renderErrors();
      setBusy(false);
    }
  };

  const persistImportedDepots = async () => {
    if (state.busy || !state.items.length) return;
    if (!w.electronAPI?.saveDepotDirect || !w.electronAPI?.searchDepots) {
      await showDialog?.("La fonctionnalite d'import est indisponible.", {
        title: "Import depots/magasins"
      });
      return;
    }

    setBusy(true);
    let existingByName = new Map();
    try {
      existingByName = await fetchExistingDepotsByName();
    } catch (err) {
      console.warn("depot import existing lookup failed", err);
    }

    let savedCount = 0;
    let failedCount = 0;
    const saveErrors = [];

    for (let i = 0; i < state.items.length; i += 1) {
      const source = state.items[i];
      const payload = buildDepotPayload(source);
      const key = normalizeDepotNameKey(payload.name);
      const matches = key ? existingByName.get(key) || [] : [];
      const primaryMatch = matches.find((entry) => normalizeText(entry?.path));
      try {
        if (primaryMatch?.path && w.electronAPI?.updateDepotDirect) {
          const response = await w.electronAPI.updateDepotDirect({
            path: primaryMatch.path,
            depot: payload,
            suggestedName: payload.name || "depot-magasin"
          });
          if (response?.ok) {
            savedCount += 1;
            if (key) {
              existingByName.set(key, [
                {
                  path: normalizeText(response.path || primaryMatch.path),
                  name: payload.name
                }
              ]);
            }
            continue;
          }
          failedCount += 1;
          const message = response?.error || response?.message || "Echec de la mise a jour.";
          saveErrors.push(`Ligne ${i + 1}: ${message}`);
          continue;
        }

        const response = await w.electronAPI.saveDepotDirect({
          depot: payload,
          suggestedName: payload.name || "depot-magasin"
        });
        if (response?.ok) {
          savedCount += 1;
          if (key) {
            existingByName.set(key, [
              {
                path: normalizeText(response.path),
                name: payload.name
              }
            ]);
          }
        } else {
          failedCount += 1;
          const message = response?.error || response?.message || "Echec de l'enregistrement.";
          saveErrors.push(`Ligne ${i + 1}: ${message}`);
        }
      } catch (err) {
        console.error("depot import save", err);
        failedCount += 1;
        saveErrors.push(`Ligne ${i + 1}: erreur inattendue.`);
      }
    }

    if (saveErrors.length) {
      state.errors = [...state.errors, ...saveErrors];
    }
    state.items = [];
    renderErrors();
    const resultText =
      `${savedCount} depot/magasin${savedCount > 1 ? "s" : ""} enregistre${savedCount > 1 ? "s" : ""}.` +
      (failedCount ? ` ${failedCount} echec${failedCount > 1 ? "s" : ""}.` : "");
    if (refs?.summary) {
      refs.summary.textContent = resultText;
      refs.summary.hidden = false;
    }
    if (savedCount > 0 && typeof w.showToast === "function") {
      w.showToast(resultText);
    }

    if (savedCount > 0) {
      try {
        await w.SEM?.depotMagasin?.refresh?.("");
      } catch {}
      try {
        await w.SEM?.depotMagasinSavedModal?.refresh?.();
      } catch {}
    }
    setBusy(false);
  };

  const wireModal = () => {
    if (!ensureModalRefs()) return false;
    if (modal.dataset.depotMagasinImportWired === "true") return true;

    refs.closeBtn?.addEventListener("click", closeModal);
    refs.cancelBtn?.addEventListener("click", closeModal);
    refs.saveBtn?.addEventListener("click", persistImportedDepots);
    refs.fileInput?.addEventListener("change", (evt) => {
      const file = evt.target?.files?.[0] || null;
      handleFileChange(file);
    });
    modal.addEventListener("click", handleHeaderCopy);
    modal.addEventListener("keydown", handleHeaderCopyKeydown);
    getModalUtils()?.wireBackdropPassthrough?.(modal);
    updateExampleHeaderCopy();

    modal.dataset.depotMagasinImportWired = "true";
    return true;
  };

  const onDocumentClick = (evt) => {
    const trigger = evt.target?.closest?.(IMPORT_TRIGGER_SELECTOR);
    if (!trigger || trigger.disabled) return;
    if (!wireModal()) return;
    if (modal?.classList.contains("is-open")) return;
    openModal(trigger);
  };

  const init = () => {
    wireModal();
    document.addEventListener("click", onDocumentClick);
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
