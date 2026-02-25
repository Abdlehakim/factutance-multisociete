(function (w) {
  const API = w.electronAPI || (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) || null;
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const EXPORT_TRIGGER_SELECTOR = "#depotMagasinExportBtn";
  const EXPORT_MODAL_ID = "depotMagasinExportModal";
  const EXPORT_OPEN_LOCATION_ID = "depotMagasinExportOpenLocation";
  const EXPORT_FETCH_LIMIT = 500;
  const EXPORT_FORMAT_LABELS = {
    xlsx: "XLSX",
    csv: "CSV"
  };

  const EXPORT_COPY = {
    title: "Exporter des depots/magasins",
    unavailable: "Export depots/magasins indisponible.",
    failed: "Export depots/magasins impossible.",
    empty: "Aucun depot/magasin enregistre.",
    sheetName: "DepotsMagasins",
    baseName: "depotMagasinData",
    locationSaved:
      "Le fichier des depots/magasins sera enregistre dans FacturanceData\\exportedData\\clientData.",
    locationDownload: "Le fichier des depots/magasins sera telecharge sur cet appareil."
  };

  const normalizeText = (value) => String(value ?? "").trim();

  const extractEmplacements = (record = {}) => {
    const source = Array.isArray(record.emplacements) ? record.emplacements : [];
    return source
      .map((entry) =>
        normalizeText(
          entry && typeof entry === "object"
            ? entry.code || entry.name || entry.label || entry.value
            : entry
        )
      )
      .filter(Boolean);
  };

  const fetchAllDepots = async () => {
    if (!API?.searchDepots) return [];
    let offset = 0;
    let total = null;
    const all = [];
    while (true) {
      const response = await API.searchDepots({
        query: "",
        limit: EXPORT_FETCH_LIMIT,
        offset
      });
      if (response && response.ok === false) {
        throw new Error(response.error || EXPORT_COPY.failed);
      }
      const results = Array.isArray(response?.results) ? response.results : [];
      if (total === null) total = Number(response?.total ?? results.length);
      all.push(...results);
      offset += results.length;
      if (!results.length || (Number.isFinite(total) && offset >= total)) break;
    }
    return all;
  };

  const buildExportRows = (depots = []) => {
    const headers = ["Nom", "Adresse", "Emplacements"];
    const rows = depots.map((entry) => [
      normalizeText(entry?.name),
      normalizeText(entry?.address),
      extractEmplacements(entry).join("; ")
    ]);
    return { headers, rows };
  };

  const buildSheetFromRows = (headers, rows) => {
    if (!w.XLSX) return null;
    return w.XLSX.utils.aoa_to_sheet([headers, ...rows]);
  };

  const buildWorkbook = (sheet) => {
    if (!w.XLSX || !sheet) return null;
    const workbook = w.XLSX.utils.book_new();
    w.XLSX.utils.book_append_sheet(workbook, sheet, EXPORT_COPY.sheetName);
    return workbook;
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

  const saveExportFile = async ({ format, xlsxData, csvData, baseName }) => {
    const ext = format === "csv" ? "csv" : "xlsx";
    if (API?.exportClientsFile) {
      const response = await API.exportClientsFile({
        ext,
        baseName,
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!response || response.canceled) return null;
      if (response.ok === false) throw new Error(response.error || EXPORT_COPY.failed);
      return response;
    }

    if (API?.saveFile) {
      const response = await API.saveFile({
        title: EXPORT_COPY.title,
        defaultPath: `${baseName}.${ext}`,
        filters: [
          { name: "Fichier Excel", extensions: ["xlsx"] },
          { name: "CSV", extensions: ["csv"] }
        ],
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!response || response.canceled) return null;
      if (response.ok === false) throw new Error(response.error || EXPORT_COPY.failed);
      return response;
    }

    const blobData = ext === "csv" ? csvData : xlsxData;
    if (!blobData || !w.Blob) throw new Error(EXPORT_COPY.unavailable);
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

  const exportDepots = async (format) => {
    if (!API?.searchDepots) {
      await showDialog?.(EXPORT_COPY.unavailable, { title: "Export" });
      return null;
    }
    const depots = await fetchAllDepots();
    if (!depots.length) {
      await showDialog?.(EXPORT_COPY.empty, { title: "Export" });
      return null;
    }

    if (format === "xlsx" && !w.XLSX) {
      throw new Error("Export XLSX indisponible. Choisissez le format CSV.");
    }

    const { headers, rows } = buildExportRows(depots);
    const sheet = buildSheetFromRows(headers, rows);
    const workbook = buildWorkbook(sheet);
    const xlsxData =
      workbook && w.XLSX
        ? w.XLSX.write(workbook, { bookType: "xlsx", type: "array" })
        : null;
    const csvData = sheet && w.XLSX ? w.XLSX.utils.sheet_to_csv(sheet) : buildCsvFromRows(headers, rows);

    return saveExportFile({
      format,
      xlsxData,
      csvData,
      baseName: EXPORT_COPY.baseName
    });
  };

  let modal = null;
  let refs = null;
  let restoreFocus = null;

  const getModalUtils = () => w.DepotMagasinModal || null;

  const ensureModalRefs = () => {
    if (refs && modal && modal.isConnected) return true;
    modal = document.getElementById(EXPORT_MODAL_ID);
    if (!modal) return false;
    refs = {
      closeBtn: modal.querySelector("#depotMagasinExportModalClose"),
      cancelBtn: modal.querySelector("#depotMagasinExportModalCancel"),
      saveBtn: modal.querySelector("#depotMagasinExportModalSave"),
      summary: modal.querySelector("#depotMagasinExportSummary"),
      formatMenu: modal.querySelector("#depotMagasinExportFormatMenu"),
      formatPanel: modal.querySelector("#depotMagasinExportFormatPanel"),
      formatDisplay: modal.querySelector("#depotMagasinExportFormatDisplay"),
      formatSelect: modal.querySelector("#depotMagasinExportFormat")
    };
    return true;
  };

  const renderSummary = () => {
    if (!refs?.summary) return;
    refs.summary.textContent = API?.exportClientsFile
      ? EXPORT_COPY.locationSaved
      : EXPORT_COPY.locationDownload;
  };

  const setModalBusy = (isBusy) => {
    if (!modal) return;
    modal.setAttribute("aria-busy", isBusy ? "true" : "false");
    modal.querySelectorAll("button, select").forEach((node) => {
      const allowClose = node.id === "depotMagasinExportModalClose" || node.id === "depotMagasinExportModalCancel";
      node.disabled = !!isBusy && !allowClose;
    });
    if (refs?.formatMenu) refs.formatMenu.style.pointerEvents = isBusy ? "none" : "";
  };

  const syncFormatUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
    if (!refs) return "xlsx";
    let nextValue = value !== undefined ? String(value) : String(refs.formatSelect?.value || "xlsx");
    if (!EXPORT_FORMAT_LABELS[nextValue]) nextValue = "xlsx";
    if (updateSelect && refs.formatSelect) refs.formatSelect.value = nextValue;
    if (refs.formatDisplay) refs.formatDisplay.textContent = EXPORT_FORMAT_LABELS[nextValue] || "XLSX";
    if (refs.formatPanel) {
      refs.formatPanel.querySelectorAll("[data-export-format-option]").forEach((btn) => {
        const active = String(btn.dataset.exportFormatOption || "") === nextValue;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
    if (closeMenu && refs.formatMenu) {
      refs.formatMenu.removeAttribute("open");
      refs.formatMenu.open = false;
      const summary = refs.formatMenu.querySelector(".field-toggle-trigger");
      if (summary) summary.setAttribute("aria-expanded", "false");
    }
    return nextValue;
  };

  const closeModal = () => {
    if (!modal) return;
    const modalUtils = getModalUtils();
    if (modalUtils?.close) {
      modalUtils.close(modal);
      return;
    }
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
  };

  const openModal = (trigger) => {
    if (!modal) return;
    restoreFocus =
      trigger && typeof trigger.focus === "function"
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    const modalUtils = getModalUtils();
    if (modalUtils?.open) {
      modalUtils.open(modal, {
        trigger: restoreFocus,
        focusSelector: "#depotMagasinExportFormat",
        onEscape: closeModal
      });
    } else {
      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
    }
    const openLocation = modal.querySelector(`#${EXPORT_OPEN_LOCATION_ID}`);
    if (openLocation) openLocation.checked = false;
    syncFormatUi("xlsx", { updateSelect: true, closeMenu: true });
    renderSummary();
    setModalBusy(false);
    refs?.formatSelect?.focus?.();
  };

  const wireModal = () => {
    if (!ensureModalRefs()) return false;
    if (modal.dataset.depotMagasinExportWired === "true") return true;

    refs.closeBtn?.addEventListener("click", closeModal);
    refs.cancelBtn?.addEventListener("click", closeModal);
    refs.saveBtn?.addEventListener("click", async () => {
      const format = refs?.formatSelect?.value === "csv" ? "csv" : "xlsx";
      const openLocation = !!modal?.querySelector?.(`#${EXPORT_OPEN_LOCATION_ID}`)?.checked;
      const saveBtn = refs?.saveBtn;
      try {
        saveBtn?.setAttribute("aria-busy", "true");
        if (saveBtn) saveBtn.disabled = true;
        const response = await exportDepots(format);
        if (openLocation && response?.path && (API?.showInFolder || API?.openPath)) {
          try {
            if (API?.showInFolder) await API.showInFolder(response.path);
            else await API.openPath(response.path);
          } catch {}
        }
        closeModal();
      } catch (err) {
        await showDialog?.(String(err?.message || err || EXPORT_COPY.failed), { title: "Export" });
      } finally {
        saveBtn?.removeAttribute("aria-busy");
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    refs.formatMenu?.addEventListener("toggle", () => {
      const summary = refs.formatMenu?.querySelector(".field-toggle-trigger");
      if (summary) summary.setAttribute("aria-expanded", refs.formatMenu.open ? "true" : "false");
    });

    refs.formatSelect?.addEventListener("change", (evt) => {
      syncFormatUi(evt.target?.value, { updateSelect: false });
    });

    modal.addEventListener("click", (evt) => {
      const option = evt.target?.closest?.("[data-export-format-option]");
      if (!option) return;
      evt.preventDefault();
      syncFormatUi(option.dataset.exportFormatOption, { updateSelect: true, closeMenu: true });
    });

    getModalUtils()?.wireBackdropPassthrough?.(modal);

    modal.dataset.depotMagasinExportWired = "true";
    return true;
  };

  const onDocumentClick = async (evt) => {
    const trigger = evt.target?.closest?.(EXPORT_TRIGGER_SELECTOR);
    if (!trigger || trigger.disabled) return;
    if (!wireModal()) return;
    trigger.disabled = true;
    try {
      openModal(trigger);
    } catch (err) {
      await showDialog?.(String(err?.message || err || EXPORT_COPY.failed), { title: "Export" });
    } finally {
      trigger.disabled = false;
    }
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
