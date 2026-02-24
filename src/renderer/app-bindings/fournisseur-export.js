(function (w) {
  const API =
    w.electronAPI ||
    (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) ||
    null;
  const SEM = w.SEM || {};
  const state = () => SEM.state || {};
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const FOURNISSEUR_EXPORT_BTN_SELECTOR = "#FournisseurExportBtn";
  const FOURNISSEUR_EXPORT_MODAL_ID = "fournisseurExportModal";
  const FOURNISSEUR_EXPORT_LIMIT = 500;
  const FOURNISSEUR_EXPORT_DEFAULT_VISIBILITY = {
    type: true,
    name: true,
    taxId: true,
    phone: true,
    email: true,
    address: true
  };
  const FOURNISSEUR_EXPORT_DEFAULT_LABELS = {
    type: "Type de fournisseur",
    name: "Nom du fournisseur",
    taxId: "Matricule fiscal (ou CIN / passeport)",
    phone: "Telephone du fournisseur",
    email: "E-mail du fournisseur",
    address: "Adresse du fournisseur"
  };
  const FOURNISSEUR_TYPE_LABELS = {
    societe: "Societe / personne morale (PM)",
    personne_physique: "Personne physique (PP)",
    particulier: "Particulier"
  };
  const EXPORT_FORMAT_LABELS = {
    xlsx: "XLSX",
    csv: "CSV"
  };
  const EXPORT_OPEN_LOCATION_ID = "fournisseurExportOpenLocation";
  const VENDOR_EXPORT_SCOPE_SELECTOR =
    "#clientBoxMainscreenFournisseursPanel, #fournisseurSavedModal, #fournisseurSavedModalNv, #FournisseurBoxNewDoc, #fournisseurFormPopover";

  const FOURNISSEUR_EXPORT_COPY = {
    title: "Exporter des fournisseurs",
    unavailable: "Export fournisseurs indisponible.",
    failed: "Export fournisseurs impossible.",
    empty: "Aucun fournisseur enregistre.",
    sheetName: "Fournisseurs",
    baseName: "fournisseurs",
    locationSaved:
      "Le fichier des fournisseurs sera enregistre dans FacturanceData\\entrepriseN\\exportedData\\clientData.",
    locationDownload: "Le fichier des fournisseurs sera telecharge sur cet appareil."
  };

  const normalizeText = (value) => String(value ?? "").trim();
  const normalizeType = (value) => {
    const key = normalizeText(value).toLowerCase();
    if (key === "particulier" || key === "personne_physique") return key;
    return "societe";
  };
  const resolveTypeLabel = (value) =>
    FOURNISSEUR_TYPE_LABELS[normalizeType(value)] || FOURNISSEUR_TYPE_LABELS.societe;

  const isVendorExportTrigger = (trigger) => {
    if (!trigger || typeof trigger.closest !== "function") return false;
    if (trigger.id === "FournisseurExportBtn") return true;
    if (String(trigger.dataset?.clientExportEntity || "").toLowerCase() === "vendor") return true;
    if (trigger.closest(VENDOR_EXPORT_SCOPE_SELECTOR)) return true;
    const ariaLabel = String(trigger.getAttribute("aria-label") || "").toLowerCase();
    return ariaLabel.includes("fournisseur");
  };

  const resolveVisibility = () => {
    const current = state().fournisseurFieldVisibility;
    return {
      ...FOURNISSEUR_EXPORT_DEFAULT_VISIBILITY,
      ...(current && typeof current === "object" ? current : {})
    };
  };
  const resolveLabels = () => {
    const current = state().fournisseurFieldLabels;
    return {
      ...FOURNISSEUR_EXPORT_DEFAULT_LABELS,
      ...(current && typeof current === "object" ? current : {})
    };
  };

  const resolveIdentifier = (supplier = {}) =>
    normalizeText(
      supplier.vat ||
        supplier.identifiantFiscal ||
        supplier.identifiant ||
        supplier.nif ||
        supplier.cin ||
        supplier.passeport ||
        supplier.passport ||
        ""
    );
  const resolvePhone = (supplier = {}) =>
    normalizeText(supplier.phone || supplier.telephone || supplier.tel || "");

  const fetchAllFournisseurs = async () => {
    if (!API?.searchClients) return [];
    let offset = 0;
    let total = null;
    const all = [];
    while (true) {
      const res = await API.searchClients({
        query: "",
        limit: FOURNISSEUR_EXPORT_LIMIT,
        offset,
        entityType: "vendor"
      });
      if (res && res.ok === false) {
        throw new Error(res.error || FOURNISSEUR_EXPORT_COPY.failed);
      }
      const results = Array.isArray(res?.results) ? res.results : [];
      if (total === null) total = Number(res?.total ?? results.length);
      all.push(...results);
      offset += results.length;
      if (!results.length || (Number.isFinite(total) && offset >= total)) break;
    }
    return all;
  };

  const buildExportRows = (vendors, visibility, labels) => {
    const headers = [];
    if (visibility.name !== false) headers.push(labels.name || FOURNISSEUR_EXPORT_DEFAULT_LABELS.name);
    if (visibility.taxId !== false) headers.push(labels.taxId || FOURNISSEUR_EXPORT_DEFAULT_LABELS.taxId);
    if (visibility.type !== false) headers.push(labels.type || FOURNISSEUR_EXPORT_DEFAULT_LABELS.type);
    if (visibility.phone !== false) headers.push(labels.phone || FOURNISSEUR_EXPORT_DEFAULT_LABELS.phone);
    if (visibility.email !== false) headers.push(labels.email || FOURNISSEUR_EXPORT_DEFAULT_LABELS.email);
    if (visibility.address !== false) headers.push(labels.address || FOURNISSEUR_EXPORT_DEFAULT_LABELS.address);

    const rows = vendors.map((entry) => {
      const supplier = entry?.client || {};
      const row = [];
      if (visibility.name !== false) row.push(normalizeText(supplier.name || ""));
      if (visibility.taxId !== false) row.push(resolveIdentifier(supplier));
      if (visibility.type !== false) row.push(resolveTypeLabel(supplier.type));
      if (visibility.phone !== false) row.push(resolvePhone(supplier));
      if (visibility.email !== false) row.push(normalizeText(supplier.email || ""));
      if (visibility.address !== false) row.push(normalizeText(supplier.address || ""));
      return row;
    });

    return { headers, rows };
  };

  const buildSheetFromRows = (headers, rows) => {
    if (!w.XLSX) return null;
    return w.XLSX.utils.aoa_to_sheet([headers, ...rows]);
  };

  const buildCsvFromRows = (headers, rows) => {
    const escapeCsv = (value) => {
      const text = normalizeText(value);
      if (!text) return "";
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
      return text;
    };
    return `${[headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;
  };

  const buildWorkbook = (sheet) => {
    if (!w.XLSX || !sheet) return null;
    const workbook = w.XLSX.utils.book_new();
    w.XLSX.utils.book_append_sheet(workbook, sheet, FOURNISSEUR_EXPORT_COPY.sheetName);
    return workbook;
  };

  const saveExportFile = async ({ format, xlsxData, csvData, baseName }) => {
    const ext = format === "csv" ? "csv" : "xlsx";
    if (API?.exportClientsFile) {
      const res = await API.exportClientsFile({
        ext,
        baseName,
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!res || res.canceled) return null;
      if (res.ok === false) throw new Error(res.error || FOURNISSEUR_EXPORT_COPY.failed);
      return res;
    }
    if (API?.saveFile) {
      const res = await API.saveFile({
        title: FOURNISSEUR_EXPORT_COPY.title,
        defaultPath: `${baseName}.${ext}`,
        filters: [
          { name: "Fichier Excel", extensions: ["xlsx"] },
          { name: "CSV", extensions: ["csv"] }
        ],
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!res || res.canceled) return null;
      if (res.ok === false) throw new Error(res.error || FOURNISSEUR_EXPORT_COPY.failed);
      return res;
    }

    const blobData = ext === "csv" ? csvData : xlsxData;
    if (!blobData || !w.Blob) throw new Error(FOURNISSEUR_EXPORT_COPY.unavailable);
    const blob =
      typeof blobData === "string"
        ? new Blob([blobData], { type: "text/csv;charset=utf-8" })
        : new Blob([blobData], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { ok: true, name: `${baseName}.${ext}` };
  };

  let exportModal = null;
  let exportModalRestoreFocus = null;

  const renderSummary = () => {
    if (!exportModal) return;
    const summary = exportModal.querySelector("#fournisseurExportSummary");
    if (!summary) return;
    summary.textContent = API?.exportClientsFile
      ? FOURNISSEUR_EXPORT_COPY.locationSaved
      : FOURNISSEUR_EXPORT_COPY.locationDownload;
  };

  const updatePreviewVisibility = (
    visibility = resolveVisibility(),
    labels = resolveLabels()
  ) => {
    if (!exportModal) return;
    exportModal.querySelectorAll("[data-fournisseur-export-field]").forEach((node) => {
      const field = node.dataset.fournisseurExportField || "";
      if (!field) return;
      const isVisible = visibility[field] !== false;
      if (isVisible) node.removeAttribute("hidden");
      else node.setAttribute("hidden", "");
    });
    exportModal.querySelectorAll("[data-fournisseur-export-field-label]").forEach((node) => {
      const field = node.dataset.fournisseurExportFieldLabel || "";
      if (!field || !(field in FOURNISSEUR_EXPORT_DEFAULT_LABELS)) return;
      node.textContent = labels[field] || FOURNISSEUR_EXPORT_DEFAULT_LABELS[field] || node.textContent || "";
    });
  };

  const setExportModalBusy = (isBusy) => {
    if (!exportModal) return;
    exportModal.setAttribute("aria-busy", isBusy ? "true" : "false");
    exportModal.querySelectorAll("button, select").forEach((el) => {
      const allowClose =
        el.id === "fournisseurExportModalCancel" || el.id === "fournisseurExportModalClose";
      el.disabled = isBusy && !allowClose;
    });
    const menu = exportModal.querySelector("#fournisseurExportFormatMenu");
    if (menu) menu.style.pointerEvents = isBusy ? "none" : "";
  };

  const closeExportModal = () => {
    if (!exportModal) return;
    exportModal.classList.remove("is-open");
    exportModal.hidden = true;
    exportModal.setAttribute("hidden", "");
    exportModal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onExportModalKeyDown);
    if (exportModalRestoreFocus && typeof exportModalRestoreFocus.focus === "function") {
      try {
        exportModalRestoreFocus.focus();
      } catch {}
    }
  };

  const onExportModalKeyDown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    closeExportModal();
  };

  const syncExportFormatUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
    if (!exportModal) return "xlsx";
    const select = exportModal.querySelector("#fournisseurExportFormat");
    const display = exportModal.querySelector("#fournisseurExportFormatDisplay");
    const panel = exportModal.querySelector("#fournisseurExportFormatPanel");
    const menu = exportModal.querySelector("#fournisseurExportFormatMenu");
    let nextValue = value !== undefined ? String(value) : String(select?.value || "xlsx");
    if (!EXPORT_FORMAT_LABELS[nextValue]) nextValue = "xlsx";
    if (updateSelect && select) select.value = nextValue;
    if (display) display.textContent = EXPORT_FORMAT_LABELS[nextValue] || "XLSX";
    if (panel) {
      panel.querySelectorAll("[data-export-format-option]").forEach((btn) => {
        const isActive = String(btn.dataset.exportFormatOption || "") === nextValue;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }
    if (closeMenu && menu) {
      menu.removeAttribute("open");
      menu.open = false;
      const summary = menu.querySelector(".field-toggle-trigger");
      if (summary) summary.setAttribute("aria-expanded", "false");
    }
    return nextValue;
  };

  const exportFournisseurs = async (format) => {
    if (!API?.searchClients) {
      await showDialog?.(FOURNISSEUR_EXPORT_COPY.unavailable, { title: "Export" });
      return null;
    }
    const fournisseurs = await fetchAllFournisseurs();
    if (!fournisseurs.length) {
      await showDialog?.(FOURNISSEUR_EXPORT_COPY.empty, { title: "Export" });
      return null;
    }
    const visibility = resolveVisibility();
    const labels = resolveLabels();
    const { headers, rows } = buildExportRows(fournisseurs, visibility, labels);
    if (format === "xlsx" && !w.XLSX) {
      throw new Error("Export XLSX indisponible. Choisissez le format CSV.");
    }

    const sheet = buildSheetFromRows(headers, rows);
    const workbook = buildWorkbook(sheet);
    const xlsxData =
      workbook && w.XLSX
        ? w.XLSX.write(workbook, { bookType: "xlsx", type: "array" })
        : null;
    const csvData =
      sheet && w.XLSX
        ? w.XLSX.utils.sheet_to_csv(sheet)
        : buildCsvFromRows(headers, rows);

    return saveExportFile({
      format,
      xlsxData,
      csvData,
      baseName: FOURNISSEUR_EXPORT_COPY.baseName
    });
  };

  const ensureExportModal = () => {
    if (exportModal) return exportModal;
    const wrapper = document.createElement("div");
    wrapper.id = FOURNISSEUR_EXPORT_MODAL_ID;
    wrapper.className = "swbDialog client-export-modal fournisseur-export-modal";
    wrapper.hidden = true;
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="swbDialog__panel client-export-modal__panel" role="dialog" aria-modal="true" aria-labelledby="fournisseurExportModalTitle">
        <div class="swbDialog__header">
          <div id="fournisseurExportModalTitle" class="swbDialog__title">Exporter des fournisseurs</div>
          <button type="button" class="swbDialog__close" id="fournisseurExportModalClose" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-export-modal__body swbDialog__msg">
          <div class="client-export-modal__preview-title">Exemple d'apercu des fournisseurs qui seront exportes.</div>
          <div class="client-export-modal__preview">
            <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
              <table>
                <thead>
                  <tr>
                    <th data-fournisseur-export-field="name">
                      <span data-fournisseur-export-field-label="name">Nom du fournisseur</span>
                    </th>
                    <th data-fournisseur-export-field="taxId">
                      <span data-fournisseur-export-field-label="taxId">Matricule fiscal (ou CIN / passeport)</span>
                    </th>
                    <th data-fournisseur-export-field="type">
                      <span data-fournisseur-export-field-label="type">Type de fournisseur</span>
                    </th>
                    <th data-fournisseur-export-field="phone">
                      <span data-fournisseur-export-field-label="phone">Telephone du fournisseur</span>
                    </th>
                    <th data-fournisseur-export-field="email">
                      <span data-fournisseur-export-field-label="email">E-mail du fournisseur</span>
                    </th>
                    <th data-fournisseur-export-field="address">
                      <span data-fournisseur-export-field-label="address">Adresse du fournisseur</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-fournisseur-export-field="name">Sarl Atlas</td>
                    <td data-fournisseur-export-field="taxId">IF123456</td>
                    <td data-fournisseur-export-field="type">Societe / personne morale (PM)</td>
                    <td data-fournisseur-export-field="phone">21234567</td>
                    <td data-fournisseur-export-field="email">contact@atlas.tn</td>
                    <td data-fournisseur-export-field="address">12 Rue de l'Industrie, Tunis</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div id="fournisseurExportSummary" class="client-export-modal__summary"></div>
          <label class="client-export-modal__checkbox">
            <input id="fournisseurExportOpenLocation" type="checkbox" />
            <span>Ouvrir l'emplacement apres export</span>
          </label>
          <div class="doc-dialog-model-picker client-export-modal__format">
            <label class="doc-dialog-model-picker__label" id="fournisseurExportFormatLabel" for="fournisseurExportFormat">
              Format
            </label>
            <div class="doc-dialog-model-picker__field">
              <details id="fournisseurExportFormatMenu" class="field-toggle-menu model-select-menu doc-dialog-model-menu client-export-format-menu">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="fournisseurExportFormatLabel fournisseurExportFormatDisplay">
                  <span id="fournisseurExportFormatDisplay" class="model-select-display">XLSX</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div id="fournisseurExportFormatPanel" class="field-toggle-panel model-select-panel client-export-format-panel" role="listbox" aria-labelledby="fournisseurExportFormatLabel">
                  <button type="button" class="model-select-option is-active" data-export-format-option="xlsx" role="option" aria-selected="true">
                    XLSX
                  </button>
                  <button type="button" class="model-select-option" data-export-format-option="csv" role="option" aria-selected="false">
                    CSV
                  </button>
                </div>
              </details>
              <select id="fournisseurExportFormat" class="model-select doc-dialog-model-select client-export-format-select" aria-hidden="true" tabindex="-1">
                <option value="xlsx" selected>XLSX</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
        <div class="swbDialog__actions client-export-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="fournisseurExportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="fournisseurExportModalSave" type="button" class="swbDialog__ok">Exporter</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    exportModal = wrapper;

    exportModal.querySelector("#fournisseurExportModalClose")?.addEventListener("click", closeExportModal);
    exportModal.querySelector("#fournisseurExportModalCancel")?.addEventListener("click", closeExportModal);
    exportModal.querySelector("#fournisseurExportModalSave")?.addEventListener("click", async () => {
      const format =
        exportModal?.querySelector("#fournisseurExportFormat")?.value === "csv" ? "csv" : "xlsx";
      const openLocation = !!exportModal?.querySelector(`#${EXPORT_OPEN_LOCATION_ID}`)?.checked;
      const saveBtn = exportModal?.querySelector("#fournisseurExportModalSave");
      try {
        saveBtn?.setAttribute("aria-busy", "true");
        if (saveBtn) saveBtn.disabled = true;
        const res = await exportFournisseurs(format);
        if (openLocation && res?.path && (API?.showInFolder || API?.openPath)) {
          try {
            if (API?.showInFolder) await API.showInFolder(res.path);
            else await API.openPath(res.path);
          } catch {}
        }
        closeExportModal();
      } catch (err) {
        await showDialog?.(
          String(err?.message || err || FOURNISSEUR_EXPORT_COPY.failed),
          { title: "Export" }
        );
      } finally {
        saveBtn?.removeAttribute("aria-busy");
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    const formatMenu = exportModal.querySelector("#fournisseurExportFormatMenu");
    if (formatMenu) {
      formatMenu.addEventListener("toggle", () => {
        const summary = formatMenu.querySelector(".field-toggle-trigger");
        if (summary) summary.setAttribute("aria-expanded", formatMenu.open ? "true" : "false");
      });
    }
    exportModal.addEventListener("click", (evt) => {
      const option = evt.target?.closest?.("[data-export-format-option]");
      if (!option) return;
      evt.preventDefault();
      syncExportFormatUi(option.dataset.exportFormatOption, { updateSelect: true, closeMenu: true });
    });
    exportModal.querySelector("#fournisseurExportFormat")?.addEventListener("change", (evt) => {
      syncExportFormatUi(evt.target?.value, { updateSelect: false });
    });
    exportModal.addEventListener("click", (evt) => {
      if (evt.target === exportModal) evt.stopPropagation();
    });
    return exportModal;
  };

  const openExportModal = (trigger) => {
    const modal = ensureExportModal();
    if (!modal) return;
    exportModalRestoreFocus = trigger && trigger.focus ? trigger : document.activeElement;
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.addEventListener("keydown", onExportModalKeyDown);
    syncExportFormatUi("xlsx", { updateSelect: true, closeMenu: true });
    const openLocation = modal.querySelector(`#${EXPORT_OPEN_LOCATION_ID}`);
    if (openLocation) openLocation.checked = false;
    updatePreviewVisibility(resolveVisibility(), resolveLabels());
    renderSummary();
    setExportModalBusy(false);
    const format = modal.querySelector("#fournisseurExportFormat");
    if (format && typeof format.focus === "function") {
      try {
        format.focus();
      } catch {}
    }
  };

  document.addEventListener("click", async (evt) => {
    const trigger = evt.target?.closest?.(FOURNISSEUR_EXPORT_BTN_SELECTOR);
    if (!trigger || trigger.disabled || !isVendorExportTrigger(trigger)) return;
    trigger.disabled = true;
    try {
      openExportModal(trigger);
    } catch (err) {
      await showDialog?.(
        String(err?.message || err || FOURNISSEUR_EXPORT_COPY.failed),
        { title: "Export" }
      );
    } finally {
      trigger.disabled = false;
    }
  });
})(window);
