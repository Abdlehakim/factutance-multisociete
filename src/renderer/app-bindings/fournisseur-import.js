(function (w) {
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const ENTITY_TYPE = "vendor";
  const FOURNISSEUR_IMPORT_TRIGGER_SELECTOR = "#FournisseurImportBtn";
  const FOURNISSEUR_IMPORT_MODAL_ID = "fournisseurImportModal";
  const FOURNISSEUR_IMPORT_ERROR_LIMIT = 8;

  const normalizeImportValue = (value) => String(value ?? "").trim();
  const isPlaceholderValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return false;
    const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return compact === "nr";
  };
  const normalizeFournisseurValue = (value) => {
    const normalized = normalizeImportValue(value);
    return isPlaceholderValue(normalized) ? "" : normalized;
  };
  const normalizeImportHeaderKey = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const normalizeFournisseurKeyId = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw || isPlaceholderValue(raw)) return "";
    return raw.toLowerCase().replace(/\s+/g, "");
  };

  const FOURNISSEUR_IMPORT_HEADER_MAP = {
    nom: "name",
    name: "name",
    raisonsociale: "name",
    societe: "name",
    entreprise: "name",
    fournisseur: "name",
    type: "type",
    typefournisseur: "type",
    identifiant: "vat",
    identifiantfiscal: "vat",
    identifiantfiscaltva: "vat",
    matriculefiscal: "vat",
    matriculefiscaloucinpasseport: "vat",
    cinpasseport: "vat",
    cinpassport: "vat",
    cinoupasseport: "vat",
    cinetpasseport: "vat",
    tva: "vat",
    vat: "vat",
    nif: "vat",
    cin: "cin",
    passeport: "passeport",
    passport: "passeport",
    telephone: "phone",
    tel: "phone",
    phone: "phone",
    gsm: "phone",
    mobile: "phone",
    email: "email",
    mail: "email",
    courriel: "email",
    adresse: "address",
    address: "address"
  };

  const resolveFournisseurImportField = (header) => {
    const key = normalizeImportHeaderKey(header);
    if (!key) return "";
    if (FOURNISSEUR_IMPORT_HEADER_MAP[key]) return FOURNISSEUR_IMPORT_HEADER_MAP[key];
    if (
      key.includes("identifiant") ||
      key.includes("fiscal") ||
      key.includes("matricule") ||
      key.includes("tva") ||
      key.includes("vat") ||
      key.includes("nif")
    ) {
      return "vat";
    }
    if (key.includes("passeport") || key.includes("passport")) return "passeport";
    if (key.includes("cin")) return "cin";
    if (
      key.includes("telephone") ||
      key.startsWith("tel") ||
      key.includes("phone") ||
      key.includes("gsm") ||
      key.includes("mobile")
    ) {
      return "phone";
    }
    if (key.includes("email") || key.includes("mail") || key.includes("courriel")) return "email";
    if (key.includes("adresse") || key.includes("address")) return "address";
    if (key.includes("type")) return "type";
    if (
      key.includes("nom") ||
      key.includes("raison") ||
      key.includes("fournisseur") ||
      key.includes("societe") ||
      key.includes("entreprise")
    ) {
      return "name";
    }
    return "";
  };

  const normalizeFournisseurType = (value) => {
    const key = normalizeImportHeaderKey(value);
    if (!key) return "societe";
    if (
      key.includes("personnephysique") ||
      key.includes("physique") ||
      key.includes("particulier") ||
      key === "pp"
    ) {
      return "personne_physique";
    }
    return "societe";
  };

  const isLikelyCinValue = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return false;
    if (/[a-z]/i.test(trimmed)) return false;
    const digits = trimmed.replace(/\D+/g, "");
    if (!digits) return false;
    return digits.length >= 6 && digits.length <= 12;
  };

  const resolveFournisseurIdentifier = (supplier = {}) =>
    supplier.vat ||
    supplier.identifiantFiscal ||
    supplier.identifiant ||
    supplier.tva ||
    supplier.nif ||
    supplier.cin ||
    supplier.passeport ||
    supplier.passport ||
    "";

  const resolveFournisseurFallbackKey = (supplier = {}) =>
    normalizeFournisseurKeyId(supplier.name || supplier.company || "");

  const getFournisseurDedupeKey = (supplier = {}) => {
    const identifier = normalizeFournisseurKeyId(resolveFournisseurIdentifier(supplier));
    return identifier || resolveFournisseurFallbackKey(supplier);
  };

  const getFournisseurDedupeKeyFromRecord = (record = {}) => {
    const supplier = record.client || {};
    const identifier = normalizeFournisseurKeyId(
      resolveFournisseurIdentifier(supplier) ||
        record.identifier ||
        record.vat ||
        record.identifiantFiscal ||
        record.identifiant ||
        record.tva ||
        record.nif ||
        record.cin ||
        record.passeport ||
        record.passport ||
        ""
    );
    if (identifier) return identifier;
    return normalizeFournisseurKeyId(record.name || supplier.name || "");
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

  const parseImportDelimitedRows = (text, delimiter) => {
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

  const parseImportCsvRows = (text) => {
    const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLine = normalized.split("\n").find((line) => line.trim().length > 0) || "";
    const delimiter = detectImportDelimiter(firstLine);
    return parseImportDelimitedRows(normalized, delimiter).filter((row) =>
      row.some((cell) => String(cell ?? "").trim().length > 0)
    );
  };

  const parseFournisseurImportRows = (rows = []) => {
    const result = { items: [], errors: [], totalRows: 0 };
    if (!Array.isArray(rows) || !rows.length) {
      result.errors.push("Fichier vide ou illisible.");
      return result;
    }

    const headerIndex = rows.findIndex((row) =>
      Array.isArray(row) && row.some((cell) => String(cell ?? "").trim().length > 0)
    );
    const headerRow = headerIndex >= 0 ? rows[headerIndex] : [];
    const headerFields = headerRow.map((cell) => resolveFournisseurImportField(cell));
    if (!headerFields.some(Boolean)) {
      result.errors.push(
        "Colonnes non reconnues. Utilisez: Nom, Matricule fiscal (ou CIN / passeport), Type, Telephone, Email, Adresse."
      );
      return result;
    }

    const seen = new Map();
    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      if (!Array.isArray(row) || !row.some((cell) => String(cell ?? "").trim().length > 0)) {
        continue;
      }
      result.totalRows += 1;
      const data = {};
      headerFields.forEach((field, idx) => {
        if (!field) return;
        data[field] = normalizeFournisseurValue(row[idx]);
      });

      const name = String(data.name || "").trim();
      const identifier = String(data.vat || data.cin || data.passeport || "").trim();
      if (!name && !identifier) {
        result.errors.push(`Ligne ${i + 1}: nom ou identifiant fiscal manquant.`);
        continue;
      }

      const supplierType = normalizeFournisseurType(data.type);
      const supplier = {
        type: supplierType,
        name,
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || ""
      };

      if (supplierType === "personne_physique") {
        let cinValue = data.cin || "";
        let passeportValue = data.passeport || "";
        if (!cinValue && !passeportValue && data.vat) {
          const rawIdentifier = String(data.vat || "").trim();
          if (rawIdentifier) {
            if (isLikelyCinValue(rawIdentifier)) cinValue = rawIdentifier;
            else passeportValue = rawIdentifier;
          }
        }
        if (cinValue) supplier.cin = cinValue;
        if (passeportValue) supplier.passeport = passeportValue;
      } else {
        if (identifier) supplier.vat = identifier;
        if (data.cin) supplier.cin = data.cin;
        if (data.passeport) supplier.passeport = data.passeport;
      }

      const dedupeKey = getFournisseurDedupeKey(supplier);
      if (dedupeKey && seen.has(dedupeKey)) {
        result.items[seen.get(dedupeKey)] = supplier;
        continue;
      }
      if (dedupeKey) seen.set(dedupeKey, result.items.length);
      result.items.push(supplier);
    }
    return result;
  };

  const parseFournisseurImportFile = async (file) => {
    if (!file) {
      return { items: [], errors: ["Aucun fichier selectionne."], totalRows: 0 };
    }
    const name = String(file.name || "");
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith(".csv") || file.type === "text/csv") {
      const text = await file.text();
      return parseFournisseurImportRows(parseImportCsvRows(text));
    }
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
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
      return parseFournisseurImportRows(rows);
    }
    const fallbackText = await file.text();
    return parseFournisseurImportRows(parseImportCsvRows(fallbackText));
  };

  const copyTextToClipboard = async (text) => {
    const value = String(text || "").trim();
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

  const initFournisseurImportModal = () => {
    if (typeof document === "undefined") return;
    const modal = document.getElementById(FOURNISSEUR_IMPORT_MODAL_ID);
    if (!modal || modal.dataset.fournisseurImportWired === "true") return;

    const modalClose = modal.querySelector("#fournisseurImportModalClose");
    const modalCancel = modal.querySelector("#fournisseurImportModalCancel");
    const modalSave = modal.querySelector("#fournisseurImportModalSave");
    const fileInput = modal.querySelector("#fournisseurImportFile");
    const summary = modal.querySelector("#fournisseurImportSummary");
    const errorsList = modal.querySelector("#fournisseurImportErrors");
    const state = {
      items: [],
      errors: [],
      fileName: "",
      totalRows: 0,
      busy: false
    };
    let restoreFocus = null;
    let folderFallbackWarned = false;

    const updateExampleHeaderCopy = () => {
      const copyBtn = modal.querySelector("[data-fournisseur-import-copy]");
      if (!copyBtn) return;
      const headers = Array.from(
        modal.querySelectorAll(".client-import-modal__example-table thead th")
      )
        .map((node) => String(node.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (headers.length) {
        copyBtn.dataset.docHistoryCopyValue = headers.join("\t");
      }
    };

    const handleImportHeaderCopy = async (evt) => {
      const copyBtn = evt.target?.closest?.("[data-fournisseur-import-copy]");
      if (!copyBtn || !modal.contains(copyBtn)) return;
      if (copyBtn.getAttribute("aria-disabled") === "true" || copyBtn.classList.contains("is-disabled")) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      updateExampleHeaderCopy();
      const copyValue = copyBtn.dataset.docHistoryCopyValue || "";
      if (copyValue) await copyTextToClipboard(copyValue);
    };

    const handleImportHeaderCopyKeydown = (evt) => {
      if (evt.key !== "Enter" && evt.key !== " ") return;
      handleImportHeaderCopy(evt);
    };

    const setBusy = (isBusy) => {
      state.busy = !!isBusy;
      if (isBusy) modal.setAttribute("aria-busy", "true");
      else modal.removeAttribute("aria-busy");
      if (fileInput) fileInput.disabled = !!isBusy;
      if (modalClose) modalClose.disabled = !!isBusy;
      if (modalCancel) modalCancel.disabled = !!isBusy;
      if (modalSave) {
        modalSave.disabled = !!isBusy || state.items.length === 0;
        if (isBusy) modalSave.setAttribute("aria-busy", "true");
        else modalSave.removeAttribute("aria-busy");
      }
    };

    const renderSummary = () => {
      if (!summary) return;
      if (!state.fileName) {
        summary.textContent = "";
        summary.hidden = true;
        return;
      }
      const total = state.totalRows;
      const ready = state.items.length;
      const errorCount = state.errors.length;
      const totalLabel = `${total} ligne${total > 1 ? "s" : ""} detectee${total > 1 ? "s" : ""}`;
      const readyLabel = `${ready} fournisseur${ready > 1 ? "s" : ""} pret${ready > 1 ? "s" : ""} a enregistrer`;
      let text = `${state.fileName} - ${totalLabel}. ${readyLabel}.`;
      if (errorCount) {
        text += ` ${errorCount} ligne${errorCount > 1 ? "s" : ""} ignoree${errorCount > 1 ? "s" : ""}.`;
      }
      summary.textContent = text;
      summary.hidden = false;
    };

    const renderErrors = () => {
      if (!errorsList) return;
      errorsList.innerHTML = "";
      if (!state.errors.length) {
        errorsList.hidden = true;
        return;
      }
      errorsList.hidden = false;
      const topErrors = state.errors.slice(0, FOURNISSEUR_IMPORT_ERROR_LIMIT);
      topErrors.forEach((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        errorsList.appendChild(item);
      });
      const remaining = state.errors.length - topErrors.length;
      if (remaining > 0) {
        const more = document.createElement("li");
        more.textContent = `+ ${remaining} autre${remaining > 1 ? "s" : ""} erreur${remaining > 1 ? "s" : ""}`;
        errorsList.appendChild(more);
      }
    };

    const resetState = () => {
      state.items = [];
      state.errors = [];
      state.fileName = "";
      state.totalRows = 0;
      if (fileInput) fileInput.value = "";
      renderSummary();
      renderErrors();
      if (modalSave) modalSave.disabled = true;
    };

    const onModalKeydown = (evt) => {
      if (evt.key !== "Escape") return;
      evt.preventDefault();
      closeModal();
    };

    const openModal = (trigger) => {
      restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      resetState();
      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
      document.addEventListener("keydown", onModalKeydown);
      if (fileInput && typeof fileInput.focus === "function") {
        try {
          fileInput.focus({ preventScroll: true });
        } catch {
          try {
            fileInput.focus();
          } catch {}
        }
      }
    };

    const closeModal = () => {
      if (state.busy) return;
      modal.classList.remove("is-open");
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onModalKeydown);
      if (restoreFocus && typeof restoreFocus.focus === "function") {
        try {
          restoreFocus.focus();
        } catch {}
      }
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
      if (summary) {
        summary.textContent = "Lecture du fichier...";
        summary.hidden = false;
      }
      try {
        const parsed = await parseFournisseurImportFile(file);
        state.items = parsed.items || [];
        state.errors = parsed.errors || [];
        state.totalRows = parsed.totalRows || 0;
      } catch (err) {
        console.error("fournisseur import parse", err);
        state.items = [];
        state.errors = ["Impossible de lire ce fichier."];
        state.totalRows = 0;
      } finally {
        renderSummary();
        renderErrors();
        setBusy(false);
      }
    };

    const fetchExistingFournisseursByKey = async () => {
      const existing = new Map();
      if (!w.electronAPI?.searchClients) return existing;
      const limit = 100;
      let offset = 0;
      let total = null;
      while (true) {
        const res = await w.electronAPI.searchClients({
          query: "",
          limit,
          offset,
          entityType: ENTITY_TYPE
        });
        if (!res?.ok) break;
        const results = Array.isArray(res.results) ? res.results : [];
        results.forEach((record) => {
          const key = getFournisseurDedupeKeyFromRecord(record);
          if (!key) return;
          const list = existing.get(key) || [];
          list.push(record);
          existing.set(key, list);
        });
        const resTotal = Number(res.total);
        if (Number.isFinite(resTotal)) total = resTotal;
        offset += results.length;
        if (results.length < limit) break;
        if (total !== null && offset >= total) break;
      }
      return existing;
    };

    const persistImportedFournisseurs = async () => {
      if (state.busy || !state.items.length) return;
      if (!w.electronAPI?.saveClientDirect) {
        await showDialog?.("La fonctionnalite d'import est indisponible.", {
          title: "Import fournisseurs"
        });
        return;
      }

      setBusy(true);
      let existingByKey = new Map();
      if (w.electronAPI?.deleteClient || w.electronAPI?.updateClientDirect) {
        try {
          existingByKey = await fetchExistingFournisseursByKey();
        } catch (err) {
          console.warn("fournisseur import existing lookup failed", err);
        }
      }

      if (w.electronAPI?.ensureClientsSystemFolder) {
        try {
          const ensured = await w.electronAPI.ensureClientsSystemFolder({ entityType: ENTITY_TYPE });
          if (!ensured?.ok) {
            await showDialog?.(
              ensured?.message || "Impossible de preparer le dossier fournisseurs.",
              { title: "Import fournisseurs" }
            );
            setBusy(false);
            return;
          }
          if (ensured?.fallback && ensured?.message && !folderFallbackWarned) {
            await showDialog?.(ensured.message, { title: "Information" });
            folderFallbackWarned = true;
          }
        } catch (err) {
          console.error(err);
          await showDialog?.("Impossible de preparer le dossier fournisseurs.", {
            title: "Import fournisseurs"
          });
          setBusy(false);
          return;
        }
      }

      let savedCount = 0;
      let failedCount = 0;
      const saveErrors = [];
      for (let i = 0; i < state.items.length; i += 1) {
        const supplier = state.items[i];
        const dedupeKey = getFournisseurDedupeKey(supplier);
        const suggested =
          supplier.name ||
          supplier.vat ||
          supplier.email ||
          supplier.phone ||
          "fournisseur";

        try {
          const matches = dedupeKey ? existingByKey.get(dedupeKey) || [] : [];
          const primaryMatch = matches.find((match) => match?.path);

          if (primaryMatch?.path && w.electronAPI?.updateClientDirect) {
            const res = await w.electronAPI.updateClientDirect({
              client: supplier,
              path: primaryMatch.path,
              suggestedName: suggested,
              entityType: ENTITY_TYPE
            });
            if (res?.ok) {
              savedCount += 1;
              if (w.electronAPI?.deleteClient && matches.length > 1) {
                for (const match of matches) {
                  if (!match?.path || match.path === primaryMatch.path) continue;
                  try {
                    const delRes = await w.electronAPI.deleteClient({
                      path: match.path,
                      entityType: ENTITY_TYPE
                    });
                    if (!delRes?.ok) {
                      saveErrors.push(
                        `Ligne ${i + 1}: suppression de l'ancien fournisseur impossible.`
                      );
                    }
                  } catch (err) {
                    console.error("fournisseur import delete", err);
                    saveErrors.push(
                      `Ligne ${i + 1}: suppression de l'ancien fournisseur impossible.`
                    );
                  }
                }
              }
              if (dedupeKey) {
                existingByKey.set(dedupeKey, [
                  { path: res.path || primaryMatch.path, client: supplier }
                ]);
              }
              continue;
            }
            if (!res?.canceled) {
              failedCount += 1;
              const msg = res?.error || res?.message || "Echec de la mise a jour.";
              saveErrors.push(`Ligne ${i + 1}: ${msg}`);
            }
            continue;
          }

          const res = await w.electronAPI.saveClientDirect({
            client: supplier,
            suggestedName: suggested,
            entityType: ENTITY_TYPE
          });
          if (res?.ok) {
            savedCount += 1;
            if (dedupeKey && w.electronAPI?.deleteClient) {
              const previousMatches = existingByKey.get(dedupeKey) || [];
              if (previousMatches.length) {
                for (const match of previousMatches) {
                  if (!match?.path) continue;
                  try {
                    const delRes = await w.electronAPI.deleteClient({
                      path: match.path,
                      entityType: ENTITY_TYPE
                    });
                    if (!delRes?.ok) {
                      saveErrors.push(
                        `Ligne ${i + 1}: suppression de l'ancien fournisseur impossible.`
                      );
                    }
                  } catch (err) {
                    console.error("fournisseur import delete", err);
                    saveErrors.push(
                      `Ligne ${i + 1}: suppression de l'ancien fournisseur impossible.`
                    );
                  }
                }
              }
              existingByKey.set(dedupeKey, [{ path: res.path, client: supplier }]);
            }
          } else if (!res?.canceled) {
            failedCount += 1;
            const msg = res?.error || res?.message || "Echec de l'enregistrement.";
            saveErrors.push(`Ligne ${i + 1}: ${msg}`);
          }
        } catch (err) {
          console.error("fournisseur import save", err);
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
        `${savedCount} fournisseur${savedCount > 1 ? "s" : ""} enregistre${savedCount > 1 ? "s" : ""}.` +
        (failedCount ? ` ${failedCount} echec${failedCount > 1 ? "s" : ""}.` : "");
      if (summary) {
        summary.textContent = resultText;
        summary.hidden = false;
      }
      if (savedCount > 0 && typeof w.showToast === "function") {
        w.showToast(resultText);
      }
      setBusy(false);
    };

    document.addEventListener("click", (evt) => {
      const trigger = evt.target?.closest?.(FOURNISSEUR_IMPORT_TRIGGER_SELECTOR);
      if (!trigger || trigger.disabled) return;
      if (modal.classList.contains("is-open")) return;
      openModal(trigger);
    });

    modalClose?.addEventListener("click", closeModal);
    modalCancel?.addEventListener("click", closeModal);
    modalSave?.addEventListener("click", persistImportedFournisseurs);
    fileInput?.addEventListener("change", (evt) => {
      const file = evt.target?.files?.[0] || null;
      handleFileChange(file);
    });
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) evt.stopPropagation();
    });
    modal.addEventListener("click", handleImportHeaderCopy);
    modal.addEventListener("keydown", handleImportHeaderCopyKeydown);
    updateExampleHeaderCopy();

    modal.dataset.fournisseurImportWired = "true";
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          initFournisseurImportModal();
        },
        { once: true }
      );
    } else {
      initFournisseurImportModal();
    }
  }
})(window);
