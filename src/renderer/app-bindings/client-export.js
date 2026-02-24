(function (w) {
  const API =
    w.electronAPI ||
    (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) ||
    null;
  const SEM = w.SEM || {};
  const state = () => SEM.state || {};
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const CLIENT_EXPORT_BTN_SELECTOR = "#clientExportBtn";
  const CLIENT_EXPORT_MODAL_ID = "clientExportModal";
  const CLIENT_EXPORT_LIMIT = 500;
  const CLIENT_EXPORT_DEFAULT_VISIBILITY = {
    benefit: true,
    account: true,
    soldClient: true,
    stegRef: true
  };
  const CLIENT_EXPORT_DEFAULT_LABELS = {
    benefit: "Au profit de",
    account: "Pour le compte de",
    soldClient: "Solde client initial",
    stegRef: "Ref STEG"
  };
  const CLIENT_TYPE_LABELS = {
    societe: "Societe / personne morale (PM)",
    personne_physique: "Personne physique (PP)",
    particulier: "Particulier"
  };
  const EXPORT_FORMAT_LABELS = {
    xlsx: "XLSX",
    csv: "CSV"
  };
  const EXPORT_OPEN_LOCATION_ID = "clientExportOpenLocation";

  const CLIENT_EXPORT_COPY = {
    title: "Exporter des clients",
    unavailable: "Export clients indisponible.",
    failed: "Export clients impossible.",
    empty: "Aucun client enregistre.",
    sheetName: "Clients",
    baseName: "clients",
    locationSaved:
      "Le fichier des clients sera enregistre dans FacturanceData\\entrepriseN\\exportedData\\clientData.",
    locationDownload: "Le fichier des clients sera telecharge sur cet appareil."
  };

  const normalizeText = (value) => String(value ?? "").trim();

  const normalizeType = (value) => {
    const key = normalizeText(value).toLowerCase();
    if (key === "particulier" || key === "personne_physique") return key;
    return "societe";
  };
  const resolveTypeLabel = (value) => CLIENT_TYPE_LABELS[normalizeType(value)] || CLIENT_TYPE_LABELS.societe;

  const resolveVisibility = () => {
    const current = state().clientFieldVisibility;
    return { ...CLIENT_EXPORT_DEFAULT_VISIBILITY, ...(current && typeof current === "object" ? current : {}) };
  };
  const resolveLabels = () => {
    const current = state().clientFieldLabels;
    return { ...CLIENT_EXPORT_DEFAULT_LABELS, ...(current && typeof current === "object" ? current : {}) };
  };

  const resolveIdentifier = (client = {}) =>
    normalizeText(
      client.vat ||
        client.identifiantFiscal ||
        client.identifiant ||
        client.nif ||
        client.cin ||
        client.passeport ||
        client.passport ||
        ""
    );
  const resolvePhone = (client = {}) => normalizeText(client.phone || client.telephone || client.tel || "");
  const resolveSoldClient = (client = {}) => normalizeText(client.soldClient || "");
  const resolveBenefit = (client = {}) => normalizeText(client.benefit || client.beneficiary || "");
  const resolveAccount = (client = {}) => normalizeText(client.account || client.accountOf || "");
  const resolveStegRef = (client = {}) => normalizeText(client.stegRef || client.refSteg || client.steg || "");

  const fetchAllClients = async () => {
    if (!API?.searchClients) return [];
    let offset = 0;
    let total = null;
    const all = [];
    while (true) {
      const res = await API.searchClients({
        query: "",
        limit: CLIENT_EXPORT_LIMIT,
        offset,
        entityType: "client"
      });
      if (res && res.ok === false) {
        throw new Error(res.error || CLIENT_EXPORT_COPY.failed);
      }
      const results = Array.isArray(res?.results) ? res.results : [];
      if (total === null) total = Number(res?.total ?? results.length);
      all.push(...results);
      offset += results.length;
      if (!results.length || (Number.isFinite(total) && offset >= total)) break;
    }
    return all;
  };

  const buildExportRows = (clients, visibility, labels) => {
    const headers = ["Nom", "Matricule fiscal", "Type"];
    if (visibility.soldClient !== false) headers.push(labels.soldClient || CLIENT_EXPORT_DEFAULT_LABELS.soldClient);
    headers.push("Telephone", "Email", "Adresse");
    if (visibility.benefit !== false) headers.push(labels.benefit || CLIENT_EXPORT_DEFAULT_LABELS.benefit);
    if (visibility.account !== false) headers.push(labels.account || CLIENT_EXPORT_DEFAULT_LABELS.account);
    if (visibility.stegRef !== false) headers.push(labels.stegRef || CLIENT_EXPORT_DEFAULT_LABELS.stegRef);

    const rows = clients.map((entry) => {
      const client = entry?.client || {};
      const base = [
        normalizeText(client.name || ""),
        resolveIdentifier(client),
        resolveTypeLabel(client.type)
      ];
      if (visibility.soldClient !== false) base.push(resolveSoldClient(client));
      base.push(
        resolvePhone(client),
        normalizeText(client.email || ""),
        normalizeText(client.address || "")
      );
      if (visibility.benefit !== false) base.push(resolveBenefit(client));
      if (visibility.account !== false) base.push(resolveAccount(client));
      if (visibility.stegRef !== false) base.push(resolveStegRef(client));
      return base;
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
    w.XLSX.utils.book_append_sheet(workbook, sheet, CLIENT_EXPORT_COPY.sheetName);
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
      if (res.ok === false) throw new Error(res.error || CLIENT_EXPORT_COPY.failed);
      return res;
    }
    if (API?.saveFile) {
      const res = await API.saveFile({
        title: CLIENT_EXPORT_COPY.title,
        defaultPath: `${baseName}.${ext}`,
        filters: [
          { name: "Fichier Excel", extensions: ["xlsx"] },
          { name: "CSV", extensions: ["csv"] }
        ],
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!res || res.canceled) return null;
      if (res.ok === false) throw new Error(res.error || CLIENT_EXPORT_COPY.failed);
      return res;
    }

    const blobData = ext === "csv" ? csvData : xlsxData;
    if (!blobData || !w.Blob) throw new Error(CLIENT_EXPORT_COPY.unavailable);
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
    const summary = exportModal.querySelector("#clientExportSummary");
    if (!summary) return;
    summary.textContent = API?.exportClientsFile
      ? CLIENT_EXPORT_COPY.locationSaved
      : CLIENT_EXPORT_COPY.locationDownload;
  };

  const updatePreviewVisibility = (visibility = resolveVisibility(), labels = resolveLabels()) => {
    if (!exportModal) return;
    exportModal.querySelectorAll("[data-client-field]").forEach((node) => {
      const field = node.dataset.clientField || "";
      if (!field) return;
      const isVisible = visibility[field] !== false;
      if (isVisible) node.removeAttribute("hidden");
      else node.setAttribute("hidden", "");
    });
    exportModal.querySelectorAll("[data-client-field-label]").forEach((node) => {
      const field = node.dataset.clientFieldLabel || "";
      if (!field || !(field in CLIENT_EXPORT_DEFAULT_LABELS)) return;
      node.textContent = labels[field] || CLIENT_EXPORT_DEFAULT_LABELS[field] || node.textContent || "";
    });
  };

  const setExportModalBusy = (isBusy) => {
    if (!exportModal) return;
    exportModal.setAttribute("aria-busy", isBusy ? "true" : "false");
    exportModal.querySelectorAll("button, select").forEach((el) => {
      const allowClose =
        el.id === "clientExportModalCancel" || el.id === "clientExportModalClose";
      el.disabled = isBusy && !allowClose;
    });
    const menu = exportModal.querySelector("#clientExportFormatMenu");
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
    const select = exportModal.querySelector("#clientExportFormat");
    const display = exportModal.querySelector("#clientExportFormatDisplay");
    const panel = exportModal.querySelector("#clientExportFormatPanel");
    const menu = exportModal.querySelector("#clientExportFormatMenu");
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

  const exportClients = async (format) => {
    if (!API?.searchClients) {
      await showDialog?.(CLIENT_EXPORT_COPY.unavailable, { title: "Export" });
      return null;
    }
    const clients = await fetchAllClients();
    if (!clients.length) {
      await showDialog?.(CLIENT_EXPORT_COPY.empty, { title: "Export" });
      return null;
    }
    const visibility = resolveVisibility();
    const labels = resolveLabels();
    const { headers, rows } = buildExportRows(clients, visibility, labels);
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
      baseName: CLIENT_EXPORT_COPY.baseName
    });
  };

  const ensureExportModal = () => {
    if (exportModal) return exportModal;
    const wrapper = document.createElement("div");
    wrapper.id = CLIENT_EXPORT_MODAL_ID;
    wrapper.className = "swbDialog client-export-modal";
    wrapper.hidden = true;
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="swbDialog__panel client-export-modal__panel" role="dialog" aria-modal="true" aria-labelledby="clientExportModalTitle">
        <div class="swbDialog__header">
          <div id="clientExportModalTitle" class="swbDialog__title">Exporter des clients</div>
          <button type="button" class="swbDialog__close" id="clientExportModalClose" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-export-modal__body swbDialog__msg">
          <div class="client-export-modal__preview-title">Exemple d'apercu des donnees qui seront exportees.</div>
          <div class="client-export-modal__preview">
            <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Matricule fiscal (ou CIN / passeport)</th>
                    <th>Type</th>
                    <th data-client-field="soldClient">
                      <span data-client-field-label="soldClient">Solde client initial</span>
                    </th>
                    <th>Telephone</th>
                    <th>Email</th>
                    <th>Adresse</th>
                    <th data-client-field="benefit">
                      <span data-client-field-label="benefit">Au profit de</span>
                    </th>
                    <th data-client-field="account">
                      <span data-client-field-label="account">Pour le compte de</span>
                    </th>
                    <th data-client-field="stegRef">
                      <span data-client-field-label="stegRef">Ref STEG</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sarl Demo</td>
                    <td>IF123456</td>
                    <td>Societe / personne morale (PM)</td>
                    <td data-client-field="soldClient">1000</td>
                    <td>0612345678</td>
                    <td>demo@exemple.com</td>
                    <td>12 Rue Exemple, Casablanca</td>
                    <td data-client-field="benefit">Beneficiaire Demo</td>
                    <td data-client-field="account">Compte Demo</td>
                    <td data-client-field="stegRef">STEG-001</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div id="clientExportSummary" class="client-export-modal__summary"></div>
          <label class="client-export-modal__checkbox">
            <input id="clientExportOpenLocation" type="checkbox" />
            <span>Ouvrir l'emplacement apres export</span>
          </label>
          <div class="doc-dialog-model-picker client-export-modal__format">
            <label class="doc-dialog-model-picker__label" id="clientExportFormatLabel" for="clientExportFormat">
              Format
            </label>
            <div class="doc-dialog-model-picker__field">
              <details id="clientExportFormatMenu" class="field-toggle-menu model-select-menu doc-dialog-model-menu client-export-format-menu">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="clientExportFormatLabel clientExportFormatDisplay">
                  <span id="clientExportFormatDisplay" class="model-select-display">XLSX</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div id="clientExportFormatPanel" class="field-toggle-panel model-select-panel client-export-format-panel" role="listbox" aria-labelledby="clientExportFormatLabel">
                  <button type="button" class="model-select-option is-active" data-export-format-option="xlsx" role="option" aria-selected="true">
                    XLSX
                  </button>
                  <button type="button" class="model-select-option" data-export-format-option="csv" role="option" aria-selected="false">
                    CSV
                  </button>
                </div>
              </details>
              <select id="clientExportFormat" class="model-select doc-dialog-model-select client-export-format-select" aria-hidden="true" tabindex="-1">
                <option value="xlsx" selected>XLSX</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
        <div class="swbDialog__actions client-export-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="clientExportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="clientExportModalSave" type="button" class="swbDialog__ok">Exporter</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    exportModal = wrapper;

    exportModal.querySelector("#clientExportModalClose")?.addEventListener("click", closeExportModal);
    exportModal.querySelector("#clientExportModalCancel")?.addEventListener("click", closeExportModal);
    exportModal.querySelector("#clientExportModalSave")?.addEventListener("click", async () => {
      const format =
        exportModal?.querySelector("#clientExportFormat")?.value === "csv" ? "csv" : "xlsx";
      const openLocation = !!exportModal?.querySelector(`#${EXPORT_OPEN_LOCATION_ID}`)?.checked;
      const saveBtn = exportModal?.querySelector("#clientExportModalSave");
      try {
        saveBtn?.setAttribute("aria-busy", "true");
        if (saveBtn) saveBtn.disabled = true;
        const res = await exportClients(format);
        if (openLocation && res?.path && (API?.showInFolder || API?.openPath)) {
          try {
            if (API?.showInFolder) await API.showInFolder(res.path);
            else await API.openPath(res.path);
          } catch {}
        }
        closeExportModal();
      } catch (err) {
        await showDialog?.(
          String(err?.message || err || CLIENT_EXPORT_COPY.failed),
          { title: "Export" }
        );
      } finally {
        saveBtn?.removeAttribute("aria-busy");
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    const formatMenu = exportModal.querySelector("#clientExportFormatMenu");
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
    exportModal.querySelector("#clientExportFormat")?.addEventListener("change", (evt) => {
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
    const format = modal.querySelector("#clientExportFormat");
    if (format && typeof format.focus === "function") {
      try {
        format.focus();
      } catch {}
    }
  };

  document.addEventListener("click", async (evt) => {
    const trigger = evt.target?.closest?.(CLIENT_EXPORT_BTN_SELECTOR);
    if (!trigger || trigger.disabled) return;
    trigger.disabled = true;
    try {
      openExportModal(trigger);
    } catch (err) {
      await showDialog?.(
        String(err?.message || err || CLIENT_EXPORT_COPY.failed),
        { title: "Export" }
      );
    } finally {
      trigger.disabled = false;
    }
  });
})(window);
