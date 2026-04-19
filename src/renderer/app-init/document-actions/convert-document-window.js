(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const getEl = w.getEl || ((id) => document.getElementById(id));
  const SEM = (w.SEM = w.SEM || {});
  const createDatePicker =
    w.AppDatePicker && typeof w.AppDatePicker.create === "function"
      ? w.AppDatePicker.create.bind(w.AppDatePicker)
      : null;

  const FETCH_LIMIT = 250;

  const ID = {
    modal: "convertDocumentWindowModal",
    sourceTypeDisplay: "convertDocumentWindowSourceTypeDisplay",
    partyLabel: "convertDocumentWindowPartyLabel",
    partyInput: "convertDocumentWindowPartyInput",
    partyPanel: "convertDocumentWindowPartyPanel",
    party: "convertDocumentWindowParty",
    search: "convertDocumentWindowSearch",
    year: "convertDocumentWindowYear",
    yearMenu: "convertDocumentWindowYearMenu",
    yearLabel: "convertDocumentWindowYearLabel",
    yearDisplay: "convertDocumentWindowYearDisplay",
    yearPanel: "convertDocumentWindowYearPanel",
    list: "convertDocumentWindowList",
    status1: "convertDocumentWindowStatus1",
    step1Prev: "convertDocumentWindowStep1Prev",
    step1Page: "convertDocumentWindowStep1Page",
    step1PageInput: "convertDocumentWindowStep1PageInput",
    step1TotalPages: "convertDocumentWindowStep1TotalPages",
    step1Next: "convertDocumentWindowStep1Next",
    step1: "convertDocumentWindowStep1",
    step2: "convertDocumentWindowStep2",
    summary: "convertDocumentWindowSummary",
    target: "convertDocumentWindowTarget",
    targetPanel: "convertDocumentWindowTargetPanel",
    model: "convertDocumentWindowModel",
    modelLabel: "convertDocumentWindowModelLabel",
    modelMenu: "convertDocumentWindowModelMenu",
    modelDisplay: "convertDocumentWindowModelDisplay",
    modelPanel: "convertDocumentWindowModelPanel",
    date: "convertDocumentWindowDate",
    datePicker: "convertDocumentWindowDatePicker",
    datePanel: "convertDocumentWindowDatePanel",
    beReceptionWrap: "convertDocumentWindowBeReceptionWrap",
    beDepot: "convertDocumentWindowBeReceptionDepotInput",
    beDepotMenu: "convertDocumentWindowBeReceptionDepotMenu",
    beDepotPanel: "convertDocumentWindowBeReceptionDepotPanel",
    beDepotDisplay: "convertDocumentWindowBeReceptionDepotDisplay",
    beDestination: "convertDocumentWindowBeReceptionDestinationInput",
    beDestinationMenu: "convertDocumentWindowBeReceptionDestinationMenu",
    beDestinationPanel: "convertDocumentWindowBeReceptionDestinationPanel",
    beDestinationDisplay: "convertDocumentWindowBeReceptionDestinationDisplay",
    beDate: "convertDocumentWindowBeReceptionDateInput",
    beDatePanel: "convertDocumentWindowBeReceptionDatePanel",
    beTime: "convertDocumentWindowBeReceptionTimeInput",
    beTimePanel: "convertDocumentWindowBeReceptionTimePanel",
    beSourceRef: "convertDocumentWindowBeReceptionSourceInput",
    bsSectionsWrap: "convertDocumentWindowBsSectionsWrap",
    bsSortieWrap: "convertDocumentWindowBsSortieWrap",
    bsDepot: "convertDocumentWindowBsSortieDepotInput",
    bsDepotMenu: "convertDocumentWindowBsSortieDepotMenu",
    bsDepotPanel: "convertDocumentWindowBsSortieDepotPanel",
    bsDepotDisplay: "convertDocumentWindowBsSortieDepotDisplay",
    bsLocation: "convertDocumentWindowBsSortieLocationInput",
    bsLocationMenu: "convertDocumentWindowBsSortieLocationMenu",
    bsLocationPanel: "convertDocumentWindowBsSortieLocationPanel",
    bsLocationDisplay: "convertDocumentWindowBsSortieLocationDisplay",
    bsDate: "convertDocumentWindowBsSortieDateInput",
    bsDatePanel: "convertDocumentWindowBsSortieDatePanel",
    bsTime: "convertDocumentWindowBsSortieTimeInput",
    bsTimePanel: "convertDocumentWindowBsSortieTimePanel",
    bsSourceRef: "convertDocumentWindowBsSortieSourceInput",
    bsTransportWrap: "convertDocumentWindowBsTransportWrap",
    bsTransportSavedList: "bsTransporteurSavedListBtn",
    bsTransporter: "convertDocumentWindowBsTransporterInput",
    bsDriverName: "convertDocumentWindowBsDriverNameInput",
    bsVehiclePlate: "convertDocumentWindowBsVehiclePlateInput",
    bsTransportMode: "convertDocumentWindowBsTransportModeInput",
    bsExitReason: "convertDocumentWindowBsExitReasonInput",
    paymentWrap: "convertDocumentWindowPaymentWrap",
    paymentMethod: "convertDocumentWindowPaymentMethod",
    paymentMethodLabel: "convertDocumentWindowPaymentMethodLabel",
    paymentMethodMenu: "convertDocumentWindowPaymentMethodMenu",
    paymentMethodDisplay: "convertDocumentWindowPaymentMethodDisplay",
    paymentMethodPanel: "convertDocumentWindowPaymentMethodPanel",
    paymentStatus: "convertDocumentWindowPaymentStatus",
    paymentStatusLabel: "convertDocumentWindowPaymentStatusLabel",
    paymentStatusMenu: "convertDocumentWindowPaymentStatusMenu",
    paymentStatusDisplay: "convertDocumentWindowPaymentStatusDisplay",
    paymentStatusPanel: "convertDocumentWindowPaymentStatusPanel",
    paymentRef: "convertDocumentWindowPaymentRef",
    acompteWrap: "convertDocumentWindowAcompteWrap",
    acomptePaid: "convertDocumentWindowAcomptePaid",
    acompteDue: "convertDocumentWindowAcompteDue",
    status2: "convertDocumentWindowStatus2",
    close: "convertDocumentWindowClose",
    back: "convertDocumentWindowBack",
    next: "convertDocumentWindowNext",
    confirm: "convertDocumentWindowConfirm"
  };

  const SOURCE_TYPES_FALLBACK = [
    {
      docType: "devis",
      label: "Devis",
      partyType: "client",
      targets: ["facture", "bl"],
      defaultTarget: "facture"
    },
    {
      docType: "facture",
      label: "Facture",
      partyType: "client",
      targets: ["avoir", "bs"],
      defaultTarget: "avoir"
    },
    {
      docType: "bl",
      label: "Bon de livraison",
      partyType: "client",
      targets: ["facture"],
      defaultTarget: "facture"
    },
    {
      docType: "bc",
      label: "Bon de commande",
      partyType: "vendor",
      targets: ["be"],
      defaultTarget: "be"
    },
    {
      docType: "fa",
      label: "Facture d'achat",
      partyType: "vendor",
      targets: ["be"],
      defaultTarget: "be"
    }
  ];
  const SOURCE_TYPE_DIALOG_ROW_VALUES = [
    ["devis", "facture", "bl", "bc"],
    ["fa"]
  ];

  const normalize = (value) => String(value || "").trim().toLowerCase();
  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const yearOf = (value) => {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "";
  };
  const labelOfType = (docType) =>
    (typeof w.docTypeLabel === "function" && w.docTypeLabel(docType)) ||
    String(docType || "").toUpperCase();
  const getCurrentYearValue = () => String(new Date().getFullYear());
  const NO_PAYMENT_METHOD_LABEL = "N.R";
  const PAYMENT_METHOD_OPTIONS = [
    { value: "cash", label: "Especes" },
    { value: "cash_deposit", label: "Versement Especes" },
    { value: "cheque", label: "Cheque" },
    { value: "bill_of_exchange", label: "Effet" },
    { value: "transfer", label: "Virement" },
    { value: "card", label: "Carte bancaire" },
    { value: "withholding_tax", label: "Retenue a la source" }
  ];
  const FACTURE_STATUS_OPTIONS = [
    { value: "payee", label: "Payee" },
    { value: "partiellement-payee", label: "Partiellement payees" },
    { value: "pas-encore-payer", label: "Impayee" },
    { value: "brouillon", label: "Brouillon" }
  ];
  const NO_PAYMENT_METHOD_STATUS_VALUES = new Set([
    "pas-encore-payer",
    "impayee",
    "impaye",
    "brouillon",
    "avoir"
  ]);
  const normalizeFactureStatusValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "annule") return "brouillon";
    return normalized;
  };
  const isNoPaymentMethodStatus = (value) =>
    NO_PAYMENT_METHOD_STATUS_VALUES.has(normalizeFactureStatusValue(value));
  const normalizePaidValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const parsed = Number(raw.replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';

  const getEntryPartyPath = (entry = {}) =>
    String(
      entry?.clientPath ||
        entry?.partyPath ||
        entry?.fournisseurPath ||
        entry?.vendorPath ||
        ""
    ).trim();

  const getTodayDate = () => new Date().toISOString().slice(0, 10);
  const getBeReceptionApi = () => w.AppInit?.DocConversion?.BonEntreeReception || {};
  const normalizeBeReceptionText = (value) => String(value ?? "").trim();
  const normalizeBeReceptionDepotId = (value = "") => {
    const api = getBeReceptionApi();
    if (typeof api.normalizeDepotId === "function") return api.normalizeDepotId(value);
    return String(value || "").trim();
  };
  const normalizeBeReceptionLocationId = (value = "") => {
    const api = getBeReceptionApi();
    if (typeof api.normalizeLocationId === "function") return api.normalizeLocationId(value);
    return String(value || "").trim();
  };
  const normalizeBeReceptionDestinationIds = (value = []) => {
    const api = getBeReceptionApi();
    if (typeof api.normalizeDestinationIds === "function") {
      return api.normalizeDestinationIds(value);
    }
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    const seen = new Set();
    return source
      .map((entry) => normalizeBeReceptionLocationId(entry))
      .filter((entry) => {
        if (!entry || seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });
  };
  const normalizeBeReceptionDestinationLabels = (value = []) => {
    const api = getBeReceptionApi();
    if (typeof api.normalizeDestinationLabels === "function") {
      return api.normalizeDestinationLabels(value);
    }
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    const seen = new Set();
    return source
      .map((entry) => normalizeBeReceptionText(entry))
      .filter((entry) => {
        if (!entry || seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });
  };
  const formatBeReceptionDestinationText = (labels = []) => {
    const api = getBeReceptionApi();
    if (typeof api.formatDestinationText === "function") {
      return api.formatDestinationText(labels);
    }
    return normalizeBeReceptionDestinationLabels(labels).join(", ");
  };
  const formatBeReceptionTime = () => {
    const api = getBeReceptionApi();
    if (typeof api.formatTime === "function") return api.formatTime();
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };
  const normalizeBeReceptionChoice = (value = {}, options = {}) => {
    const api = getBeReceptionApi();
    if (typeof api.normalizeChoice === "function") {
      return api.normalizeChoice(value, options);
    }
    const raw = value && typeof value === "object" ? value : {};
    const fallbackDate = String(options?.fallbackDate || "").trim();
    const destinationIds = normalizeBeReceptionDestinationIds(
      raw.destinationIds || raw.destinationSelection?.ids || raw.destinationId || raw.destinationLocationId || []
    );
    const destinationLabels = normalizeBeReceptionDestinationLabels(
      raw.destinationLabels || raw.destinationSelection?.labels || []
    );
    const destination = normalizeBeReceptionText(
      raw.destination ||
        raw.destinationLocation ||
        raw.location ||
        (destinationLabels.length ? formatBeReceptionDestinationText(destinationLabels) : "")
    );
    return {
      depot: normalizeBeReceptionText(raw.depot || raw.depotName || ""),
      depotId: normalizeBeReceptionDepotId(raw.depotId || raw.depotDbId || raw.magasinId || ""),
      destination,
      destinationId: normalizeBeReceptionLocationId(destinationIds[0] || raw.destinationId || ""),
      destinationIds,
      destinationLabels,
      date: String(raw.date || raw.receptionDate || fallbackDate || "").trim(),
      time: String(raw.time || raw.receptionTime || formatBeReceptionTime()).trim(),
      sourceRef: normalizeBeReceptionText(raw.sourceRef || raw.referenceSource || raw.source || ""),
      sourceSelection: raw.sourceSelection || raw.sourceDocuments || raw.sourceDocs || null,
      importedSourceKeys: Array.isArray(raw.importedSourceKeys) ? raw.importedSourceKeys.slice() : []
    };
  };
  const createDefaultBeReceptionChoice = ({ entry, sourceDocType, date } = {}) => {
    const api = getBeReceptionApi();
    if (typeof api.createDefaultChoice === "function") {
      return api.createDefaultChoice({ entry, sourceDocType, date });
    }
    const number = String(entry?.number || entry?.invNumber || entry?.name || "").trim();
    const label = labelOfType(sourceDocType || entry?.docType || "");
    return normalizeBeReceptionChoice(
      {
        date,
        time: formatBeReceptionTime(),
        sourceRef: number ? `${label} : ${number}` : label
      },
      { fallbackDate: date }
    );
  };
  const validateBeReceptionChoice = (value = {}, options = {}) => {
    const api = getBeReceptionApi();
    if (typeof api.validateChoice === "function") return api.validateChoice(value, options);
    const reception = normalizeBeReceptionChoice(value, options);
    const requireStorageFields = options?.requireStorageFields !== false;
    if (requireStorageFields) {
      if (!reception.depotId) return { ok: false, error: "Selectionnez un depot / magasin." };
      if (!reception.destinationIds.length) {
        return { ok: false, error: "Selectionnez un emplacement de destination." };
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reception.date)) {
      return { ok: false, error: "Renseignez une date de reception valide." };
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reception.time)) {
      return { ok: false, error: "Renseignez une heure de reception valide au format HH:MM." };
    }
    if (!reception.sourceRef) return { ok: false, error: "Renseignez la reference source." };
    return { ok: true, value: reception };
  };
  const fetchBeReceptionDepotRecords = async (options = {}) => {
    const api = getBeReceptionApi();
    if (typeof api.fetchDepotRecords === "function") {
      return api.fetchDepotRecords(options);
    }
    return [];
  };
  const fetchBeReceptionLocationsForDepot = async (depotId = "") => {
    const api = getBeReceptionApi();
    if (typeof api.fetchLocationsForDepot === "function") {
      return api.fetchLocationsForDepot(depotId);
    }
    return [];
  };
  const getBsSortieApi = () =>
    w.AppInit?.DocConversion?.BonSortieSortie || w.AppInit?.DocConversion?.BonSortie || {};
  const normalizeBsSortieDepotId = (value = "") => {
    const api = getBsSortieApi();
    if (typeof api.normalizeDepotId === "function") return api.normalizeDepotId(value);
    return normalizeBeReceptionDepotId(value);
  };
  const normalizeBsSortieLocationId = (value = "") => {
    const api = getBsSortieApi();
    if (typeof api.normalizeLocationId === "function") return api.normalizeLocationId(value);
    return normalizeBeReceptionLocationId(value);
  };
  const normalizeBsSortieLocationIds = (value = []) => {
    const api = getBsSortieApi();
    if (typeof api.normalizeLocationIds === "function") return api.normalizeLocationIds(value);
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    const seen = new Set();
    return source
      .map((entry) => normalizeBsSortieLocationId(entry))
      .filter((entry) => {
        if (!entry || seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });
  };
  const normalizeBsSortieLocationLabels = (value = []) => {
    const api = getBsSortieApi();
    if (typeof api.normalizeLocationLabels === "function") return api.normalizeLocationLabels(value);
    return normalizeBeReceptionDestinationLabels(value);
  };
  const formatBsSortieLocationText = (labels = []) => {
    const api = getBsSortieApi();
    if (typeof api.formatLocationText === "function") return api.formatLocationText(labels);
    return normalizeBsSortieLocationLabels(labels).join(", ");
  };
  const formatBsSortieTime = () => {
    const api = getBsSortieApi();
    if (typeof api.formatTime === "function") return api.formatTime();
    return formatBeReceptionTime();
  };
  const normalizeBsSortieChoice = (value = {}, options = {}) => {
    const api = getBsSortieApi();
    if (typeof api.normalizeChoice === "function") return api.normalizeChoice(value, options);
    const raw = value && typeof value === "object" ? value : {};
    const fallbackDate = String(options?.fallbackDate || "").trim();
    const locationIds = normalizeBsSortieLocationIds(
      raw.locationIds || raw.locationSelection?.ids || raw.locationId || raw.emplacementId || []
    );
    const locationLabels = normalizeBsSortieLocationLabels(
      raw.locationLabels || raw.locationSelection?.labels || []
    );
    return {
      depot: normalizeBeReceptionText(raw.depot || raw.depotName || raw.magasin || ""),
      depotId: normalizeBsSortieDepotId(raw.depotId || raw.depotDbId || raw.magasinId || ""),
      location: normalizeBeReceptionText(
        raw.location ||
          raw.emplacement ||
          (locationLabels.length ? formatBsSortieLocationText(locationLabels) : "")
      ),
      locationId: normalizeBsSortieLocationId(locationIds[0] || raw.locationId || ""),
      locationIds,
      locationLabels,
      sourceDocType: normalize(raw.sourceDocType || raw.sourceType || ""),
      date: String(raw.date || raw.sortieDate || fallbackDate || "").trim(),
      time: String(raw.time || raw.sortieTime || formatBsSortieTime()).trim(),
      sourceRef: normalizeBeReceptionText(raw.sourceRef || raw.referenceSource || raw.source || ""),
      sourceSelection: raw.sourceSelection || raw.sourceDocuments || raw.sourceDocs || null,
      transporter: normalizeBeReceptionText(raw.transporter || raw.transporteur || ""),
      driverName: normalizeBeReceptionText(raw.driverName || raw.chauffeur || ""),
      vehiclePlate: normalizeBeReceptionText(raw.vehiclePlate || raw.vehicle || raw.matriculeVehicule || ""),
      transportMode: normalizeBeReceptionText(raw.transportMode || raw.modeTransport || ""),
      exitReason: normalizeBeReceptionText(raw.exitReason || raw.reason || raw.motifSortie || "")
    };
  };
  const createDefaultBsSortieChoice = ({ entry, sourceDocType, date } = {}) => {
    const api = getBsSortieApi();
    if (typeof api.createDefaultChoice === "function") {
      return api.createDefaultChoice({ entry, sourceDocType, date });
    }
    const number = String(entry?.number || entry?.invNumber || entry?.name || "").trim();
    const label = labelOfType(sourceDocType || entry?.docType || "");
    return normalizeBsSortieChoice(
      {
        date,
        time: formatBsSortieTime(),
        sourceRef: number ? `${label} : ${number}` : label,
        sourceDocType
      },
      { fallbackDate: date }
    );
  };
  const validateBsSortieChoice = (value = {}, options = {}) => {
    const api = getBsSortieApi();
    if (typeof api.validateChoice === "function") return api.validateChoice(value, options);
    const sortie = normalizeBsSortieChoice(value, options);
    const requireStorageFields = options?.requireStorageFields !== false;
    if (requireStorageFields && !sortie.depotId) return { ok: false, error: "Selectionnez un depot / magasin source." };
    if (sortie.locationIds.length > 1) return { ok: false, error: "Selectionnez un seul emplacement source." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sortie.date)) {
      return { ok: false, error: "Renseignez une date de sortie valide." };
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sortie.time)) {
      return { ok: false, error: "Renseignez une heure de sortie valide au format HH:MM." };
    }
    if (!sortie.sourceRef) return { ok: false, error: "Renseignez la reference source." };
    return { ok: true, value: sortie };
  };
  const fetchBsSortieDepotRecords = async (options = {}) => {
    const api = getBsSortieApi();
    if (typeof api.fetchDepotRecords === "function") return api.fetchDepotRecords(options);
    return fetchBeReceptionDepotRecords(options);
  };
  const fetchBsSortieLocationsForDepot = async (depotId = "") => {
    const api = getBsSortieApi();
    if (typeof api.fetchLocationsForDepot === "function") return api.fetchLocationsForDepot(depotId);
    return fetchBeReceptionLocationsForDepot(depotId);
  };
  const renderBeReceptionSelectField = ({
    selectId,
    menuId,
    panelId,
    displayId,
    labelText,
    placeholder,
    multiple = false
  } = {}) => `
    <label class="items-be-reception-form__field doc-history-modal__filter article-stock-depot-filter">
      <span>${labelText}</span>
      <div class="doc-dialog-model-picker__field">
        <details id="${menuId}" class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu" data-disabled="false">
          <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-disabled="false">
            <span id="${displayId}" class="model-select-display">${placeholder}</span>
            ${CHEVRON_SVG}
          </summary>
          <div id="${panelId}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox"></div>
        </details>
        <select id="${selectId}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1" ${multiple ? "multiple" : ""}>
          <option value="">${placeholder}</option>
        </select>
      </div>
    </label>
  `;
  const renderBeReceptionTimeField = () =>
    typeof w.BeReceptionTimeField?.render === "function"
      ? w.BeReceptionTimeField.render({
          inputId: ID.beTime,
          panelId: ID.beTimePanel
        })
      : `
        <label class="items-be-reception-form__field">
          <span>Heure</span>
          <input id="${ID.beTime}" type="text" inputmode="numeric" placeholder="HH:MM" autocomplete="off">
        </label>
      `;
  const renderBsSortieTimeField = () =>
    typeof w.BeReceptionTimeField?.render === "function"
      ? w.BeReceptionTimeField.render({
          inputId: ID.bsTime,
          panelId: ID.bsTimePanel
        })
      : `
        <label class="items-be-reception-form__field">
          <span>Heure</span>
          <input id="${ID.bsTime}" type="text" inputmode="numeric" placeholder="HH:MM" autocomplete="off">
        </label>
      `;

  const ensureModal = () => {
    let modal = getEl(ID.modal);
    if (modal) return modal;
    const template = document.createElement("template");
    template.innerHTML = `
      <div id="${ID.modal}" class="swbDialog doc-history-modal convert-document-window-modal" hidden aria-hidden="true" aria-busy="false">
        <div class="swbDialog__panel doc-history-modal__panel convert-document-window-modal__panel" role="dialog" aria-modal="true" aria-labelledby="convertDocumentWindowTitle">
          <div class="swbDialog__header">
            <div class="doc-history-modal__header-row">
              <div id="convertDocumentWindowTitle" class="swbDialog__title">Convertir document</div>
              <span
                id="${ID.sourceTypeDisplay}"
                class="convert-document-window-modal__header-source"
                aria-live="polite"
              ></span>
            </div>
            <button id="${ID.close}" type="button" class="swbDialog__close" aria-label="Fermer">
              <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="swbDialog__msg doc-history-modal__body convert-document-window-modal__body">
            <div class="model-stepper__labels convert-document-window-modal__stepper">
              <div class="model-stepper__step is-active" data-step="1">
                <span class="model-stepper__badge">1</span>
                <span class="model-stepper__title">S&eacute;lection</span>
              </div>
              <div class="model-stepper__step" data-step="2">
                <span class="model-stepper__badge">2</span>
                <span class="model-stepper__title">Options</span>
              </div>
            </div>
            <section id="${ID.step1}" class="convert-document-window-modal__picker-step">
              <div class="be-source-document-picker-modal__toolbar convert-document-window-modal__toolbar">
                <div class="be-source-document-picker-modal__filters convert-document-window-modal__filters">
                  <label class="be-source-document-picker-modal__supplier convert-document-window-modal__filter-field">
                    <span id="${ID.partyLabel}" class="be-source-document-picker-modal__search-label">CLIENT</span>
                    <div class="be-source-document-picker-modal__supplier-field">
                      <input
                        id="${ID.partyInput}"
                        class="be-source-document-picker-modal__search-input be-source-document-picker-modal__supplier-input"
                        type="text"
                        autocomplete="off"
                        spellcheck="false"
                        placeholder="Selectionner..."
                        aria-haspopup="listbox"
                        aria-expanded="false"
                        aria-controls="${ID.partyPanel}"
                        aria-labelledby="${ID.partyLabel}"
                      />
                      <div
                        id="${ID.partyPanel}"
                        class="field-toggle-panel model-select-panel be-source-document-picker-modal__supplier-panel"
                        role="listbox"
                        aria-labelledby="${ID.partyLabel}"
                        hidden
                      ></div>
                    </div>
                    <select id="${ID.party}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Selectionner...</option>
                    </select>
                  </label>
                  <label class="be-source-document-picker-modal__search convert-document-window-modal__filter-field">
                    <span class="be-source-document-picker-modal__search-label">NUMERO</span>
                    <input
                      id="${ID.search}"
                      class="be-source-document-picker-modal__search-input"
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      placeholder="Rechercher par numero"
                    />
                  </label>
                  <label class="be-source-document-picker-modal__year convert-document-window-modal__filter-field">
                    <span id="${ID.yearLabel}" class="be-source-document-picker-modal__search-label">ANNEE</span>
                    <div class="doc-dialog-model-picker__field">
                      <details id="${ID.yearMenu}" class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu">
                        <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${ID.yearLabel} ${ID.yearDisplay}">
                          <span id="${ID.yearDisplay}" class="model-select-display">${getCurrentYearValue()}</span>
                          ${CHEVRON_SVG}
                        </summary>
                        <div id="${ID.yearPanel}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox" aria-labelledby="${ID.yearLabel}">
                          <button type="button" class="model-select-option" data-value="" role="option" aria-selected="false">Toutes</button>
                          <button type="button" class="model-select-option is-active" data-value="${getCurrentYearValue()}" role="option" aria-selected="true">${getCurrentYearValue()}</button>
                        </div>
                      </details>
                      <select id="${ID.year}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                        <option value="">Toutes</option>
                        <option value="${getCurrentYearValue()}" selected>${getCurrentYearValue()}</option>
                      </select>
                    </div>
                  </label>
                </div>
              </div>
              <div
                id="${ID.list}"
                class="doc-history-modal__list be-source-document-picker-modal__grid convert-document-window-modal__list"
                role="list"
              ></div>
              <div class="convert-document-window-modal__bottom-row">
                <div class="be-source-document-picker-modal__content-actions convert-document-window-modal__content-actions">
                  <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
                    <button id="${ID.step1Prev}" type="button" class="client-search__edit" disabled>Precedent</button>
                    <span id="${ID.step1Page}" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
                      Page
                      <input
                        id="${ID.step1PageInput}"
                        type="number"
                        inputmode="numeric"
                        min="1"
                        step="1"
                        size="3"
                        aria-label="Aller a la page"
                        class="client-saved-modal__page-input doc-history-modal__page-input"
                        value="1"
                      />
                      / <span id="${ID.step1TotalPages}">1</span>
                    </span>
                    <button id="${ID.step1Next}" type="button" class="client-search__edit" disabled>Suivant</button>
                  </div>
                </div>
                <p
                  id="${ID.status1}"
                  class="doc-history-modal__status be-source-document-picker-modal__status convert-document-window-modal__status"
                  aria-live="polite"
                ></p>
              </div>
            </section>
            <section id="${ID.step2}" hidden>
              <p id="${ID.summary}" class="doc-history-modal__status" hidden></p>
              <div class="doc-history-convert-form convert-document-window-modal__options-form">
                <div class="doc-history-convert__field doc-type-field">
                  <span class="model-save-dot">Convertir vers:</span>
                  <div class="doc-type-field__controls">
                    <div
                      id="${ID.targetPanel}"
                      class="doc-type-panel doc-type-panel--inline doc-history-convert-panel currency-panel currency-panel--inline"
                      role="radiogroup"
                      aria-label="Convertir vers"
                    ></div>
                    <select id="${ID.target}" class="doc-type-select doc-history-convert__select" aria-hidden="true" tabindex="-1"></select>
                  </div>
                </div>
                <div class="doc-history-convert__field">
                  <label id="${ID.modelLabel}" class="doc-history-convert__label doc-dialog-model-picker__label" for="${ID.model}">Modele</label>
                  <div class="doc-dialog-model-picker__field">
                    <details id="${ID.modelMenu}" class="field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu">
                      <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${ID.modelLabel} ${ID.modelDisplay}">
                        <span id="${ID.modelDisplay}" class="model-select-display">Selectionner...</span>
                        ${CHEVRON_SVG}
                      </summary>
                      <div id="${ID.modelPanel}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox" aria-labelledby="${ID.modelLabel}"></div>
                    </details>
                    <select id="${ID.model}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Selectionner...</option>
                    </select>
                  </div>
                </div>
                <label class="doc-history-convert__field doc-date-field">
                  <span>Date</span>
                  <div id="${ID.datePicker}" class="swb-date-picker" data-date-picker>
                    <input
                      id="${ID.date}"
                      type="text"
                      inputmode="numeric"
                      placeholder="AAAA-MM-JJ"
                      autocomplete="off"
                      spellcheck="false"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      role="combobox"
                      aria-controls="${ID.datePanel}"
                    />
                    <button
                      type="button"
                      class="swb-date-picker__toggle"
                      data-date-picker-toggle
                      aria-label="Choisir une date"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      aria-controls="${ID.datePanel}"
                    >
                      <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                        <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                      </svg>
                    </button>
                    <div
                      id="${ID.datePanel}"
                      class="swb-date-picker__panel"
                      data-date-picker-panel
                      hidden
                      role="dialog"
                      aria-modal="false"
                      aria-label="Choisir une date"
                      tabindex="-1"
                    ></div>
                  </div>
                </label>
              </div>
              <div id="${ID.paymentWrap}" hidden class="doc-dialog-model-picker__row">
                <div class="doc-history-convert__field">
                  <label id="${ID.paymentStatusLabel}" class="doc-history-convert__label doc-dialog-model-picker__label" for="${ID.paymentStatus}">Statut de la facture</label>
                  <div class="doc-dialog-model-picker__field">
                    <details id="${ID.paymentStatusMenu}" class="field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu">
                      <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${ID.paymentStatusLabel} ${ID.paymentStatusDisplay}">
                        <span id="${ID.paymentStatusDisplay}" class="model-select-display">Choisir un statut</span>
                        ${CHEVRON_SVG}
                      </summary>
                      <div id="${ID.paymentStatusPanel}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox" aria-labelledby="${ID.paymentStatusLabel}"></div>
                    </details>
                    <select id="${ID.paymentStatus}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Choisir un statut</option>
                    </select>
                  </div>
                </div>
                <div class="doc-history-convert__field">
                  <label id="${ID.paymentMethodLabel}" class="doc-history-convert__label doc-dialog-model-picker__label" for="${ID.paymentMethod}">Mode de paiement</label>
                  <div class="doc-dialog-model-picker__field">
                    <details id="${ID.paymentMethodMenu}" class="field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu">
                      <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${ID.paymentMethodLabel} ${ID.paymentMethodDisplay}">
                        <span id="${ID.paymentMethodDisplay}" class="model-select-display">Choisir un mode</span>
                        ${CHEVRON_SVG}
                      </summary>
                      <div id="${ID.paymentMethodPanel}" class="field-toggle-panel model-select-panel doc-history-model-panel" role="listbox" aria-labelledby="${ID.paymentMethodLabel}"></div>
                    </details>
                    <select id="${ID.paymentMethod}" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Choisir un mode</option>
                    </select>
                  </div>
                </div>
                <div class="doc-history-convert__field">
                  <label class="doc-history-convert__label doc-dialog-model-picker__label" for="${ID.paymentRef}">Ref. paiement</label>
                  <input id="${ID.paymentRef}" class="doc-history-convert__input" type="text" autocomplete="off" spellcheck="false" placeholder="Ref. paiement" />
                </div>
              </div>
              <div id="${ID.acompteWrap}" hidden class="doc-dialog-model-picker__row">
                <label class="doc-history-convert__field" for="${ID.acomptePaid}">
                  <span>Paye</span>
                  <input
                    id="${ID.acomptePaid}"
                    class="doc-history-convert__input"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.01"
                    value="0"
                  />
                </label>
                <label class="doc-history-convert__field" for="${ID.acompteDue}">
                  <span>Solde du</span>
                  <input
                    id="${ID.acompteDue}"
                    class="doc-history-convert__input"
                    type="text"
                    readonly
                  />
                </label>
              </div>
              <fieldset id="${ID.beReceptionWrap}" hidden class="items-be-reception-form doc-history-convert__be-reception convert-document-window-modal__be-reception convert-document-window-modal__stock-form">
                <legend>Informations de r&eacute;ception</legend>
                <div class="items-be-reception-form__grid">
                  ${renderBeReceptionSelectField({
                    selectId: ID.beDepot,
                    menuId: ID.beDepotMenu,
                    panelId: ID.beDepotPanel,
                    displayId: ID.beDepotDisplay,
                    labelText: "D&eacute;p&ocirc;t / Magasin",
                    placeholder: "Selectionner un depot"
                  })}
                  ${renderBeReceptionSelectField({
                    selectId: ID.beDestination,
                    menuId: ID.beDestinationMenu,
                    panelId: ID.beDestinationPanel,
                    displayId: ID.beDestinationDisplay,
                    labelText: "Emplacement de destination",
                    placeholder: "Aucun emplacement",
                    multiple: true
                  })}
                  <label class="items-be-reception-form__field">
                    <span>Date de r&eacute;ception</span>
                    <div class="swb-date-picker" data-date-picker>
                      <input
                        id="${ID.beDate}"
                        type="text"
                        inputmode="numeric"
                        placeholder="AAAA-MM-JJ"
                        autocomplete="off"
                        spellcheck="false"
                        aria-haspopup="dialog"
                        aria-expanded="false"
                        role="combobox"
                        aria-controls="${ID.beDatePanel}"
                      />
                      <button
                        type="button"
                        class="swb-date-picker__toggle"
                        data-date-picker-toggle
                        aria-label="Choisir une date de r&eacute;ception"
                        aria-haspopup="dialog"
                        aria-expanded="false"
                        aria-controls="${ID.beDatePanel}"
                      >
                        <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                          <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                        </svg>
                      </button>
                      <div
                        id="${ID.beDatePanel}"
                        class="swb-date-picker__panel"
                        data-date-picker-panel
                        hidden
                        role="dialog"
                        aria-modal="false"
                        aria-label="Choisir une date"
                        tabindex="-1"
                      ></div>
                    </div>
                  </label>
                  ${renderBeReceptionTimeField()}
                  <label class="items-be-reception-form__field items-be-reception-form__field--wide items-be-reception-form__field--source" for="${ID.beSourceRef}">
                    <span>R&eacute;f&eacute;rence source</span>
                    <div class="items-be-reception-form__input-group items-be-reception-form__input-group--source">
                      <input id="${ID.beSourceRef}" type="text" placeholder="ex : Facture d'achat / Bon de commande" autocomplete="off" spellcheck="false" />
                    </div>
                  </label>
                </div>
              </fieldset>
              <div id="${ID.bsSectionsWrap}" hidden class="convert-document-window-modal__bs-sections" aria-hidden="true">
                <fieldset id="${ID.bsSortieWrap}" hidden class="items-be-reception-form doc-history-convert__be-reception convert-document-window-modal__be-reception convert-document-window-modal__stock-form">
                  <legend>Informations de sortie</legend>
                  <div class="items-be-reception-form__grid">
                    ${renderBeReceptionSelectField({
                      selectId: ID.bsDepot,
                      menuId: ID.bsDepotMenu,
                      panelId: ID.bsDepotPanel,
                      displayId: ID.bsDepotDisplay,
                      labelText: "D&eacute;p&ocirc;t / Magasin source",
                      placeholder: "Selectionner un depot"
                    })}
                    ${renderBeReceptionSelectField({
                      selectId: ID.bsLocation,
                      menuId: ID.bsLocationMenu,
                      panelId: ID.bsLocationPanel,
                      displayId: ID.bsLocationDisplay,
                      labelText: "Emplacement source",
                      placeholder: "Aucun emplacement",
                      multiple: true
                    })}
                    <label class="items-be-reception-form__field">
                      <span>Date de sortie</span>
                      <div class="swb-date-picker" data-date-picker>
                        <input
                          id="${ID.bsDate}"
                          type="text"
                          inputmode="numeric"
                          placeholder="AAAA-MM-JJ"
                          autocomplete="off"
                          spellcheck="false"
                          aria-haspopup="dialog"
                          aria-expanded="false"
                          role="combobox"
                          aria-controls="${ID.bsDatePanel}"
                        />
                        <button
                          type="button"
                          class="swb-date-picker__toggle"
                          data-date-picker-toggle
                          aria-label="Choisir une date de sortie"
                          aria-haspopup="dialog"
                          aria-expanded="false"
                          aria-controls="${ID.bsDatePanel}"
                        >
                          <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                            <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                            <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                          </svg>
                        </button>
                        <div
                          id="${ID.bsDatePanel}"
                          class="swb-date-picker__panel"
                          data-date-picker-panel
                          hidden
                          role="dialog"
                          aria-modal="false"
                          aria-label="Choisir une date"
                          tabindex="-1"
                        ></div>
                      </div>
                    </label>
                    ${renderBsSortieTimeField()}
                    <label class="items-be-reception-form__field items-be-reception-form__field--wide items-be-reception-form__field--source" for="${ID.bsSourceRef}">
                      <span>R&eacute;f&eacute;rence source</span>
                      <div class="items-be-reception-form__input-group items-be-reception-form__input-group--source">
                        <input id="${ID.bsSourceRef}" type="text" placeholder="ex : Facture" autocomplete="off" spellcheck="false" />
                      </div>
                    </label>
                  </div>
                </fieldset>
                <fieldset id="${ID.bsTransportWrap}" hidden class="items-be-reception-form doc-history-convert__be-reception convert-document-window-modal__be-reception convert-document-window-modal__stock-form convert-document-window-modal__stock-form--transport">
                  <legend>Transport / exp&eacute;dition</legend>
                  <div class="items-be-reception-form__section-actions convert-document-window-modal__stock-form-actions" aria-label="Actions transport">
                    <button
                      id="${ID.bsTransportSavedList}"
                      type="button"
                      class="client-search__saved items-be-reception-form__picker-btn convert-document-window-modal__stock-form-picker"
                      aria-label="Afficher les transporteurs enregistres"
                      data-bs-transport-saved-open="true"
                      title="Afficher les transporteurs enregistres"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                        <circle cx="5" cy="6" r="1.5"></circle>
                        <circle cx="5" cy="12" r="1.5"></circle>
                        <circle cx="5" cy="18" r="1.5"></circle>
                        <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
                        <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
                        <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="items-be-reception-form__grid items-be-reception-form__grid--transport">
                    <label class="items-be-reception-form__field" for="${ID.bsTransporter}">
                      <span>Transporteur</span>
                      <input id="${ID.bsTransporter}" type="text" placeholder="Nom du transporteur" autocomplete="off" spellcheck="false" />
                    </label>
                    <label class="items-be-reception-form__field" for="${ID.bsDriverName}">
                      <span>Chauffeur</span>
                      <input id="${ID.bsDriverName}" type="text" placeholder="Nom du chauffeur" autocomplete="off" spellcheck="false" />
                    </label>
                    <label class="items-be-reception-form__field" for="${ID.bsVehiclePlate}">
                      <span>Matricule v&eacute;hicule</span>
                      <input id="${ID.bsVehiclePlate}" type="text" placeholder="Matricule du vehicule" autocomplete="off" spellcheck="false" />
                    </label>
                    <label class="items-be-reception-form__field" for="${ID.bsTransportMode}">
                      <span>Mode de transport</span>
                      <input id="${ID.bsTransportMode}" type="text" placeholder="Camion, utilitaire, etc." autocomplete="off" spellcheck="false" />
                    </label>
                    <label class="items-be-reception-form__field items-be-reception-form__field--wide" for="${ID.bsExitReason}">
                      <span>Motif de sortie</span>
                      <input id="${ID.bsExitReason}" type="text" placeholder="Motif / commentaire de sortie" autocomplete="off" spellcheck="false" />
                    </label>
                  </div>
                </fieldset>
              </div>
              <p id="${ID.status2}" class="doc-history-modal__status" aria-live="polite"></p>
            </section>
            <div class="convert-document-window-modal__step-actions model-stepper__actions-right">
              <button id="${ID.back}" type="button" class="btn ghost tiny model-stepper__nav model-stepper__nav--prev better-style">Etape precedente</button>
              <button id="${ID.next}" type="button" class="btn success tiny model-stepper__nav model-stepper__nav--next better-style">Etape suivante</button>
              <button id="${ID.confirm}" type="button" class="btn success tiny model-stepper__nav model-stepper__nav--next better-style">Convertir</button>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    modal = template.content.firstElementChild;
    document.body.appendChild(modal);
    return modal;
  };

  let api = null;

  const setup = () => {
    if (api) return api;

    const modal = ensureModal();
    const e = {};
    Object.values(ID).forEach((id) => {
      e[id] = modal.querySelector(`#${id}`);
    });
    const stepNodes = Array.from(modal.querySelectorAll("[data-step]"));

    const state = {
      open: false,
      busy: false,
      sourceTypes: [],
      source: null,
      pendingSourceDocType: "",
      parties: [],
      partyQuery: "",
      docs: [],
      selectedPath: "",
      search: "",
      year: "",
      page: 1,
      pageSize: 20,
      step: 1,
      models: [],
      modelsLoaded: false,
      selectedDocPaths: [],
      step2PrimaryDoc: null,
      step2Menus: {},
      step2BehaviorBound: false,
      lastPaymentMethod: "",
      step2CanConvert: false,
      beReception: null,
      beReceptionDateTouched: false,
      beReceptionBehaviorBound: false,
      beReceptionDatePickerInstance: null,
      beReceptionDatePickerBound: false,
      beReceptionTimeBound: false,
      beReceptionSyncToken: 0,
      bsSortie: null,
      bsSortieDateTouched: false,
      bsSortieBehaviorBound: false,
      bsSortieDatePickerInstance: null,
      bsSortieDatePickerBound: false,
      bsSortieTimeBound: false,
      bsSortieSyncToken: 0,
      bsTransporteurBridgeInstalled: false,
      bsTransporteurApplyBridge: null,
      bsTransporteurPreviousApply: null,
      datePickerInstance: null,
      datePickerBound: false,
      restoreFocus: null,
      suppressPartyOpenUntil: 0,
      suppressNextPartyFocusOpen: false
    };

    const setOpen = (open) => {
      modal.hidden = !open;
      modal.setAttribute("aria-hidden", open ? "false" : "true");
      modal.classList.toggle("is-open", open);
      state.open = open;
    };

    const setBusy = (busy) => {
      state.busy = !!busy;
      modal.setAttribute("aria-busy", state.busy ? "true" : "false");
      e[ID.close].disabled = state.busy;
      e[ID.back].disabled = state.busy;
      e[ID.next].disabled = state.busy;
      e[ID.confirm].disabled = state.busy;
      e[ID.party].disabled = state.busy;
      if (e[ID.partyInput]) e[ID.partyInput].disabled = state.busy;
      e[ID.search].disabled = state.busy;
      e[ID.year].disabled = state.busy;
      if (e[ID.yearMenu]) {
        const summary = e[ID.yearMenu].querySelector("summary");
        if (summary) summary.setAttribute("aria-disabled", state.busy ? "true" : "false");
      }
      e[ID.step1PageInput].disabled = state.busy;
      e[ID.target].disabled = state.busy;
      e[ID.model].disabled = state.busy;
      e[ID.date].disabled = state.busy;
      e[ID.paymentMethod].disabled = state.busy;
      e[ID.paymentStatus].disabled = state.busy;
      e[ID.paymentRef].disabled = state.busy;
      if (e[ID.acomptePaid]) e[ID.acomptePaid].disabled = state.busy;
      if (e[ID.acompteDue]) e[ID.acompteDue].disabled = state.busy;
      [e[ID.beDate], e[ID.beTime], e[ID.beSourceRef]].forEach((input) => {
        if (input) input.disabled = state.busy;
      });
      [e[ID.beDepot], e[ID.beDestination]].forEach((select) => {
        if (!select) return;
        select.disabled = state.busy || select.dataset.unavailable === "true";
      });
      if (state.busy) {
        setPartyPanelOpen(false);
        setYearMenuOpen(false);
        closeStep2Menus();
      }
      e[ID.list]
        ?.querySelectorAll('input[name="convertDocumentWindowPick"]')
        ?.forEach((input) => {
          input.disabled = state.busy;
        });
      syncStepActions();
    };

    const clearSelectedDocs = () => {
      state.selectedDocPaths = [];
      state.step2PrimaryDoc = null;
    };

    const getSelectedDocPathSet = () => new Set(state.selectedDocPaths || []);

    const setSelectedDocPaths = (paths = []) => {
      const unique = [];
      const seen = new Set();
      paths.forEach((path) => {
        const value = String(path || "").trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        unique.push(value);
      });
      state.selectedDocPaths = unique;
      if (!state.selectedDocPaths.length) {
        state.step2PrimaryDoc = null;
      }
    };

    const resolveSelectedDocsFromStep1 = () => {
      const paths = getSelectedDocPathSet();
      if (!paths.size) return [];
      const byPath = new Map((state.docs || []).map((doc) => [doc.path, doc]));
      return state.selectedDocPaths.map((path) => byPath.get(path)).filter(Boolean);
    };

    const getSelectedTargetValue = () => normalize(e[ID.target]?.value || "");
    const isFactureTarget = () => getSelectedTargetValue() === "facture";
    const isBonEntreeTarget = () => getSelectedTargetValue() === "be";
    const isBonSortieTarget = () => getSelectedTargetValue() === "bs";
    const isPartialStatus = () =>
      normalizeFactureStatusValue(e[ID.paymentStatus]?.value || "") === "partiellement-payee";
    const hasValidModelSelectionForTarget = () => {
      const selectedModel = String(e[ID.model]?.value || "").trim();
      if (!selectedModel) return false;
      return Array.from(e[ID.model]?.options || []).some(
        (opt) => String(opt.value || "") === selectedModel && !opt.disabled
      );
    };
    const resolveAcompteBase = () => {
      const totalTTC = Number(state.step2PrimaryDoc?.totalTTC);
      if (Number.isFinite(totalTTC)) return totalTTC;
      const totalHT = Number(state.step2PrimaryDoc?.totalHT);
      if (Number.isFinite(totalHT)) return totalHT;
      return null;
    };
    const resolveCurrency = () =>
      String(state.step2PrimaryDoc?.currency || SEM?.state?.meta?.currency || "").trim();
    const formatMoneyValue =
      typeof w.formatMoney === "function"
        ? w.formatMoney
        : (value, currency) => {
            const num = Number(value || 0);
            const formatted = num.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            return currency ? `${formatted} ${currency}` : formatted;
          };
    const updateAcompteAmounts = (paidValue) => {
      if (!e[ID.acompteDue]) return;
      const normalizedPaid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;
      const base = resolveAcompteBase();
      if (!Number.isFinite(base)) {
        e[ID.acompteDue].value = "";
        return;
      }
      const due = Math.max(0, base - normalizedPaid);
      e[ID.acompteDue].value = formatMoneyValue(due, resolveCurrency());
    };
    const getBeReceptionFallbackDate = () =>
      String(e[ID.date]?.value || getTodayDate()).trim() || getTodayDate();
    const requiresBeReceptionStorageFields = () => isBonEntreeTarget();
    const getBeReceptionValidationOptions = (fallbackDate = getBeReceptionFallbackDate()) => ({
      fallbackDate,
      requireStorageFields: requiresBeReceptionStorageFields()
    });
    const getSelectedOptionText = (select) => {
      if (!(select instanceof HTMLSelectElement)) return "";
      const selected =
        (select.selectedOptions && select.selectedOptions.length ? select.selectedOptions[0] : null) ||
        Array.from(select.options || []).find((option) => option.value === select.value) ||
        null;
      return normalizeBeReceptionText(selected?.textContent || "");
    };
    const readBeReceptionFormValues = (current = state.beReception) => {
      const fallbackDate = getBeReceptionFallbackDate();
      const base = normalizeBeReceptionChoice(current, { fallbackDate });
      const depotSelect = e[ID.beDepot];
      const destinationSelect = e[ID.beDestination];
      const destinationIds = normalizeBeReceptionDestinationIds(
        Array.from(destinationSelect?.selectedOptions || []).map((option) => option.value)
      );
      const destinationLabels = normalizeBeReceptionDestinationLabels(
        destinationIds
          .map((id) => {
            const option = Array.from(destinationSelect?.options || []).find(
              (entry) => String(entry.value || "").trim() === id
            );
            return option?.textContent || "";
          })
          .filter(Boolean)
      );
      return normalizeBeReceptionChoice(
        {
          ...base,
          depotId: normalizeBeReceptionDepotId(depotSelect?.value || base.depotId || ""),
          depot: normalizeBeReceptionDepotId(depotSelect?.value || "")
            ? getSelectedOptionText(depotSelect)
            : "",
          destinationId: destinationIds[0] || "",
          destinationIds,
          destinationLabels,
          destination: destinationLabels.length
            ? formatBeReceptionDestinationText(destinationLabels)
            : "",
          date: String(e[ID.beDate]?.value || base.date || fallbackDate).trim(),
          time: String(e[ID.beTime]?.value || base.time || "").trim(),
          sourceRef: normalizeBeReceptionText(e[ID.beSourceRef]?.value || base.sourceRef || "")
        },
        { fallbackDate }
      );
    };
    const getBsSortieFallbackDate = () =>
      String(e[ID.date]?.value || getTodayDate()).trim() || getTodayDate();
    const getBsSortieValidationOptions = (fallbackDate = getBsSortieFallbackDate()) => ({
      fallbackDate,
      requireStorageFields: isBonSortieTarget()
    });
    const readBsSortieFormValues = (current = state.bsSortie) => {
      const fallbackDate = getBsSortieFallbackDate();
      const base = normalizeBsSortieChoice(current, { fallbackDate });
      const depotSelect = e[ID.bsDepot];
      const locationSelect = e[ID.bsLocation];
      const locationIds = normalizeBsSortieLocationIds(
        Array.from(locationSelect?.selectedOptions || []).map((option) => option.value)
      );
      const locationLabels = normalizeBsSortieLocationLabels(
        locationIds
          .map((id) => {
            const option = Array.from(locationSelect?.options || []).find(
              (entry) => String(entry.value || "").trim() === id
            );
            return option?.textContent || "";
          })
          .filter(Boolean)
      );
      const depotId = normalizeBsSortieDepotId(depotSelect?.value || base.depotId || "");
      return normalizeBsSortieChoice(
        {
          ...base,
          depotId,
          depot: depotId ? getSelectedOptionText(depotSelect) : "",
          locationId: locationIds[0] || "",
          locationIds,
          locationLabels,
          location: locationLabels.length ? formatBsSortieLocationText(locationLabels) : "",
          date: String(e[ID.bsDate]?.value || base.date || fallbackDate).trim(),
          time: String(e[ID.bsTime]?.value || base.time || "").trim(),
          sourceRef: normalizeBeReceptionText(e[ID.bsSourceRef]?.value || base.sourceRef || ""),
          transporter: normalizeBeReceptionText(e[ID.bsTransporter]?.value || base.transporter || ""),
          driverName: normalizeBeReceptionText(e[ID.bsDriverName]?.value || base.driverName || ""),
          vehiclePlate: normalizeBeReceptionText(e[ID.bsVehiclePlate]?.value || base.vehiclePlate || ""),
          transportMode: normalizeBeReceptionText(e[ID.bsTransportMode]?.value || base.transportMode || ""),
          exitReason: normalizeBeReceptionText(e[ID.bsExitReason]?.value || base.exitReason || "")
        },
        { fallbackDate }
      );
    };
    const syncBeReceptionStaticInputs = () => {
      const fallbackDate = getBeReceptionFallbackDate();
      const reception = normalizeBeReceptionChoice(state.beReception, { fallbackDate });
      if (e[ID.beDate]) {
        e[ID.beDate].value = reception.date || fallbackDate;
        if (state.beReceptionDatePickerInstance) {
          try {
            state.beReceptionDatePickerInstance.setValue(e[ID.beDate].value, { silent: true });
          } catch {}
        }
      }
      if (e[ID.beTime]) {
        const timeValue = reception.time || formatBeReceptionTime();
        if (e[ID.beTime].__swbTimePickerController?.setValue) {
          e[ID.beTime].__swbTimePickerController.setValue(timeValue, { silent: true });
        } else {
          e[ID.beTime].value = timeValue;
        }
      }
      if (e[ID.beSourceRef]) e[ID.beSourceRef].value = reception.sourceRef || "";
    };
    const resetBeReceptionChoice = (entry = state.step2PrimaryDoc, selectedDocs = []) => {
      const fallbackDate = getBeReceptionFallbackDate();
      state.beReceptionDateTouched = false;
      const docs = Array.isArray(selectedDocs) ? selectedDocs : [];
      const numbers = docs
        .map((doc) => String(doc?.number || doc?.display || doc?.name || "").trim())
        .filter(Boolean);
      const defaultEntry =
        docs.length > 1
          ? {
              ...(entry || docs[0] || {}),
              number: numbers.join(", "),
              name: `${docs.length} document(s)`
            }
          : entry || docs[0] || {};
      let next = createDefaultBeReceptionChoice({
        entry: defaultEntry,
        sourceDocType: state.source?.docType || defaultEntry?.docType || "",
        date: fallbackDate
      });
      if (docs.length > 1 && numbers.length) {
        next = normalizeBeReceptionChoice(
          {
            ...next,
            sourceRef: `${labelOfType(state.source?.docType || "be")} : ${numbers.join(", ")}`
          },
          { fallbackDate }
        );
      }
      state.beReception = next;
      syncBeReceptionStaticInputs();
    };
    const syncBsSortieStaticInputs = () => {
      const fallbackDate = getBsSortieFallbackDate();
      const sortie = normalizeBsSortieChoice(state.bsSortie, { fallbackDate });
      if (e[ID.bsDate]) {
        e[ID.bsDate].value = sortie.date || fallbackDate;
        if (state.bsSortieDatePickerInstance) {
          try {
            state.bsSortieDatePickerInstance.setValue(e[ID.bsDate].value, { silent: true });
          } catch {}
        }
      }
      if (e[ID.bsTime]) {
        const timeValue = sortie.time || formatBsSortieTime();
        if (e[ID.bsTime].__swbTimePickerController?.setValue) {
          e[ID.bsTime].__swbTimePickerController.setValue(timeValue, { silent: true });
        } else {
          e[ID.bsTime].value = timeValue;
        }
      }
      if (e[ID.bsSourceRef]) e[ID.bsSourceRef].value = sortie.sourceRef || "";
      if (e[ID.bsTransporter]) e[ID.bsTransporter].value = sortie.transporter || "";
      if (e[ID.bsDriverName]) e[ID.bsDriverName].value = sortie.driverName || "";
      if (e[ID.bsVehiclePlate]) e[ID.bsVehiclePlate].value = sortie.vehiclePlate || "";
      if (e[ID.bsTransportMode]) e[ID.bsTransportMode].value = sortie.transportMode || "";
      if (e[ID.bsExitReason]) e[ID.bsExitReason].value = sortie.exitReason || "";
    };
    const resetBsSortieChoice = (entry = state.step2PrimaryDoc, selectedDocs = []) => {
      const fallbackDate = getBsSortieFallbackDate();
      state.bsSortieDateTouched = false;
      const docs = Array.isArray(selectedDocs) ? selectedDocs : [];
      const numbers = docs
        .map((doc) => String(doc?.number || doc?.display || doc?.name || "").trim())
        .filter(Boolean);
      const defaultEntry =
        docs.length > 1
          ? {
              ...(entry || docs[0] || {}),
              number: numbers.join(", "),
              name: `${docs.length} document(s)`
            }
          : entry || docs[0] || {};
      let next = createDefaultBsSortieChoice({
        entry: defaultEntry,
        sourceDocType: state.source?.docType || defaultEntry?.docType || "",
        date: fallbackDate
      });
      if (docs.length > 1 && numbers.length) {
        next = normalizeBsSortieChoice(
          {
            ...next,
            sourceRef: `${labelOfType(state.source?.docType || "facture")} : ${numbers.join(", ")}`
          },
          { fallbackDate }
        );
      }
      state.bsSortie = next;
      syncBsSortieStaticInputs();
    };
    const normalizeBsTransporteurSnapshot = (payload = null, selected = null) => {
      const raw = payload && typeof payload === "object" ? payload : {};
      const selectedRaw = selected && typeof selected === "object" ? selected : {};
      const client = raw.client && typeof raw.client === "object"
        ? raw.client
        : selectedRaw.client && typeof selectedRaw.client === "object"
          ? selectedRaw.client
          : {};
      const read = (...values) => {
        for (const value of values) {
          const normalized = normalizeBeReceptionText(value || "");
          if (normalized) return normalized;
        }
        return "";
      };
      return {
        transporter: read(raw.name, raw.transporteur, raw.label, selectedRaw.name, selectedRaw.label, client.name, client.transporteur, client.label),
        driverName: read(
          raw.driverName,
          raw.driver,
          raw.chauffeur,
          raw.benefit,
          selectedRaw.driverName,
          selectedRaw.driver,
          selectedRaw.chauffeur,
          selectedRaw.benefit,
          client.driverName,
          client.driver,
          client.chauffeur,
          client.benefit
        ),
        vehiclePlate: read(
          raw.vehiclePlate,
          raw.vehicle,
          raw.vehicule,
          raw.matriculeVehicule,
          raw.matriculeVehicle,
          raw.account,
          selectedRaw.vehiclePlate,
          selectedRaw.vehicle,
          selectedRaw.vehicule,
          selectedRaw.matriculeVehicule,
          selectedRaw.matriculeVehicle,
          selectedRaw.account,
          client.vehiclePlate,
          client.vehicle,
          client.vehicule,
          client.matriculeVehicule,
          client.matriculeVehicle,
          client.account
        ),
        transportMode: read(
          raw.transportMode,
          raw.modeTransport,
          raw.modeDeTransport,
          raw.transport,
          raw.stegRef,
          selectedRaw.transportMode,
          selectedRaw.modeTransport,
          selectedRaw.modeDeTransport,
          selectedRaw.transport,
          selectedRaw.stegRef,
          client.transportMode,
          client.modeTransport,
          client.modeDeTransport,
          client.transport,
          client.stegRef
        )
      };
    };
    const installBsTransporteurSelectionBridge = () => {
      const sem = w.SEM || null;
      if (!sem || state.bsTransporteurBridgeInstalled) return;
      const bridge = (payload = null, selected = null) => {
        const snapshot = normalizeBsTransporteurSnapshot(payload, selected);
        if (!snapshot.transporter && !snapshot.driverName && !snapshot.vehiclePlate && !snapshot.transportMode) {
          return false;
        }
        state.bsSortie = normalizeBsSortieChoice(
          {
            ...state.bsSortie,
            transporter: snapshot.transporter,
            driverName: snapshot.driverName,
            vehiclePlate: snapshot.vehiclePlate,
            transportMode: snapshot.transportMode
          },
          { fallbackDate: getBsSortieFallbackDate() }
        );
        syncBsSortieStaticInputs();
        syncStep2ConfirmState();
        return true;
      };
      state.bsTransporteurPreviousApply = sem.applyTransporteurSavedSelectionToBonSortie;
      state.bsTransporteurApplyBridge = bridge;
      sem.applyTransporteurSavedSelectionToBonSortie = bridge;
      state.bsTransporteurBridgeInstalled = true;
    };
    const restoreBsTransporteurSelectionBridge = () => {
      const sem = w.SEM || null;
      if (!sem || !state.bsTransporteurBridgeInstalled) return;
      if (sem.applyTransporteurSavedSelectionToBonSortie === state.bsTransporteurApplyBridge) {
        if (typeof state.bsTransporteurPreviousApply === "function") {
          sem.applyTransporteurSavedSelectionToBonSortie = state.bsTransporteurPreviousApply;
        } else {
          delete sem.applyTransporteurSavedSelectionToBonSortie;
        }
      }
      state.bsTransporteurBridgeInstalled = false;
      state.bsTransporteurApplyBridge = null;
      state.bsTransporteurPreviousApply = null;
    };
    const closeBeReceptionMenu = (menu) => {
      if (!(menu instanceof HTMLElement)) return;
      menu.removeAttribute("open");
      menu.querySelector("summary.field-toggle-trigger")?.setAttribute("aria-expanded", "false");
    };
    const setBeReceptionPickerDisabled = (menu, select, disabled) => {
      const isDisabled = !!disabled;
      if (menu instanceof HTMLElement) {
        menu.dataset.disabled = isDisabled ? "true" : "false";
        const summary = menu.querySelector("summary.field-toggle-trigger");
        summary?.setAttribute("aria-disabled", isDisabled ? "true" : "false");
        if (isDisabled) {
          closeBeReceptionMenu(menu);
          if (summary) summary.tabIndex = -1;
        } else if (summary) {
          summary.removeAttribute("tabindex");
        }
      }
      if (select instanceof HTMLSelectElement) {
        select.dataset.unavailable = isDisabled ? "true" : "false";
        select.disabled = state.busy || isDisabled;
        select.setAttribute("aria-disabled", state.busy || isDisabled ? "true" : "false");
      }
    };
    const wireBeReceptionMenu = (menu, panel) => {
      if (!(menu instanceof HTMLElement) || !(panel instanceof HTMLElement) || menu.dataset.convertWindowBeWired === "1") {
        return;
      }
      const summary = menu.querySelector("summary.field-toggle-trigger");
      summary?.addEventListener("click", (event) => {
        if (menu.dataset.disabled === "true") return;
        event.preventDefault();
        menu.open = !menu.open;
        summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
      });
      menu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closeBeReceptionMenu(menu);
        summary?.focus?.();
      });
      menu.dataset.convertWindowBeWired = "1";
    };
    const setBeReceptionSelectOptions = (
      select,
      records = [],
      { placeholder = "", selectedValue = "", selectedValues = [], valueKey = "id", labelKey = "name" } = {}
    ) => {
      if (!(select instanceof HTMLSelectElement)) return [];
      const isMultiple = !!select.multiple;
      const selectedSet = new Set(
        (isMultiple ? selectedValues : [selectedValue])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      );
      select.replaceChildren();
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = placeholder;
      select.appendChild(placeholderOption);
      const values = [];
      records.forEach((record) => {
        const value = String(record?.[valueKey] || "").trim();
        const label = normalizeBeReceptionText(record?.[labelKey] || value);
        if (!value) return;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label || value;
        option.selected = selectedSet.has(value);
        select.appendChild(option);
        if (option.selected) values.push(value);
      });
      if (!isMultiple) {
        const resolved = values[0] || "";
        select.value = resolved;
        return resolved ? [resolved] : [];
      }
      return values;
    };
    const renderBeReceptionDepotPanel = (records = [], selectedDepotId = "") => {
      const select = e[ID.beDepot];
      const menu = e[ID.beDepotMenu];
      const panel = e[ID.beDepotPanel];
      const display = e[ID.beDepotDisplay];
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedDepotId: "", selectedDepotLabel: "" };
      }
      const selectedValues = setBeReceptionSelectOptions(select, records, {
        placeholder: "Selectionner un depot",
        selectedValue: normalizeBeReceptionDepotId(selectedDepotId),
        valueKey: "id",
        labelKey: "name"
      });
      const selectedValue = selectedValues[0] || "";
      const selectedLabel = getSelectedOptionText(select);
      if (display) {
        display.textContent = selectedLabel || "Selectionner un depot";
        display.dataset.selected = selectedValue ? "true" : "false";
      }
      menu.dataset.selected = selectedValue ? "true" : "false";
      setBeReceptionPickerDisabled(menu, select, !records.length);
      panel.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun depot enregistre";
        panel.appendChild(empty);
      } else {
        records.forEach((record) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option";
          button.dataset.value = record.id;
          button.setAttribute("role", "option");
          button.textContent = record.name;
          const isActive = record.id === selectedValue;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", () => {
            if (select.disabled) return;
            select.value = record.id;
            closeBeReceptionMenu(menu);
            state.beReception = normalizeBeReceptionChoice(
              {
                ...state.beReception,
                depotId: record.id,
                depot: record.name,
                destinationId: "",
                destinationIds: [],
                destinationLabels: [],
                destination: ""
              },
              { fallbackDate: getBeReceptionFallbackDate() }
            );
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });
          panel.appendChild(button);
        });
      }
      wireBeReceptionMenu(menu, panel);
      return { selectedDepotId: selectedValue, selectedDepotLabel: selectedLabel };
    };
    const renderBeReceptionDestinationPanel = (
      locations = [],
      { selectedLocationIds = [], depotSelected = false } = {}
    ) => {
      const select = e[ID.beDestination];
      const menu = e[ID.beDestinationMenu];
      const panel = e[ID.beDestinationPanel];
      const display = e[ID.beDestinationDisplay];
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedLocationIds: [], selectedLocationLabels: [] };
      }
      const selectedIds = setBeReceptionSelectOptions(select, locations, {
        placeholder: depotSelected ? "Aucun emplacement" : "Selectionnez d'abord un depot",
        selectedValues: normalizeBeReceptionDestinationIds(selectedLocationIds),
        valueKey: "id",
        labelKey: "code"
      });
      const selectedLabels = normalizeBeReceptionDestinationLabels(
        selectedIds
          .map((id) => {
            const option = Array.from(select.options || []).find((entry) => entry.value === id);
            return option?.textContent || "";
          })
          .filter(Boolean)
      );
      const displayText = selectedLabels.length
        ? formatBeReceptionDestinationText(selectedLabels)
        : depotSelected
          ? "Aucun emplacement"
          : "Selectionnez d'abord un depot";
      if (display) {
        display.textContent = displayText;
        display.dataset.selected = selectedIds.length ? "true" : "false";
      }
      menu.dataset.selected = selectedIds.length ? "true" : "false";
      setBeReceptionPickerDisabled(menu, select, !depotSelected || !locations.length);
      panel.replaceChildren();
      if (!depotSelected) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Selectionnez d'abord un depot";
        panel.appendChild(empty);
      } else if (!locations.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun emplacement";
        panel.appendChild(empty);
      } else {
        Array.from(select.options || []).forEach((option) => {
          if (!option.value) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option model-select-option--multiselect stock-location-option";
          button.dataset.value = option.value;
          button.setAttribute("role", "option");
          const checkbox = document.createElement("span");
          checkbox.className = "stock-location-option__checkbox";
          checkbox.setAttribute("aria-hidden", "true");
          const checkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          checkIcon.classList.add("stock-location-option__check");
          checkIcon.setAttribute("viewBox", "0 0 20 20");
          checkIcon.setAttribute("fill", "none");
          checkIcon.setAttribute("focusable", "false");
          checkIcon.setAttribute("aria-hidden", "true");
          const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          checkPath.setAttribute("d", "M5 10.5L8.5 14L15 7.5");
          checkPath.setAttribute("stroke", "currentColor");
          checkPath.setAttribute("stroke-width", "2");
          checkPath.setAttribute("stroke-linecap", "round");
          checkPath.setAttribute("stroke-linejoin", "round");
          checkIcon.appendChild(checkPath);
          checkbox.appendChild(checkIcon);
          const label = document.createElement("span");
          label.className = "stock-location-option__label";
          label.textContent = normalizeBeReceptionText(option.textContent || "");
          button.append(checkbox, label);
          const isActive = selectedIds.includes(option.value);
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (select.disabled) return;
            const currentIds = normalizeBeReceptionDestinationIds(
              Array.from(select.selectedOptions || []).map((entry) => entry.value)
            );
            const hasValue = currentIds.includes(option.value);
            const nextIds = hasValue
              ? currentIds.filter((entry) => entry !== option.value)
              : [...currentIds, option.value];
            Array.from(select.options || []).forEach((entry) => {
              entry.selected = nextIds.includes(entry.value);
            });
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });
          panel.appendChild(button);
        });
      }
      wireBeReceptionMenu(menu, panel);
      return { selectedLocationIds: selectedIds, selectedLocationLabels: selectedLabels };
    };
    const syncBeReceptionSelectors = async () => {
      if (!e[ID.beReceptionWrap]) return false;
      const syncToken = String((Number(state.beReceptionSyncToken || 0) || 0) + 1);
      state.beReceptionSyncToken = syncToken;
      state.beReception = readBeReceptionFormValues(state.beReception);
      const depots = await fetchBeReceptionDepotRecords();
      if (state.beReceptionSyncToken !== syncToken) return false;
      const depotState = renderBeReceptionDepotPanel(depots, state.beReception.depotId);
      const depotId = normalizeBeReceptionDepotId(depotState.selectedDepotId || "");
      const depotLabel = normalizeBeReceptionText(depotState.selectedDepotLabel || "");
      let locations = [];
      if (depotId) locations = await fetchBeReceptionLocationsForDepot(depotId);
      if (state.beReceptionSyncToken !== syncToken) return false;
      const destinationState = renderBeReceptionDestinationPanel(locations, {
        selectedLocationIds: state.beReception.destinationIds || [],
        depotSelected: !!depotId
      });
      state.beReception = normalizeBeReceptionChoice(
        {
          ...state.beReception,
          depotId,
          depot: depotId ? depotLabel : "",
          destinationId: destinationState.selectedLocationIds[0] || "",
          destinationIds: destinationState.selectedLocationIds,
          destinationLabels: destinationState.selectedLocationLabels,
          destination: destinationState.selectedLocationLabels.length
            ? formatBeReceptionDestinationText(destinationState.selectedLocationLabels)
            : ""
        },
        { fallbackDate: getBeReceptionFallbackDate() }
      );
      syncStep2ConfirmState();
      return true;
    };
    const renderBsSortieDepotPanel = (records = [], selectedDepotId = "") => {
      const select = e[ID.bsDepot];
      const menu = e[ID.bsDepotMenu];
      const panel = e[ID.bsDepotPanel];
      const display = e[ID.bsDepotDisplay];
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedDepotId: "", selectedDepotLabel: "" };
      }
      const selectedValues = setBeReceptionSelectOptions(select, records, {
        placeholder: "Selectionner un depot",
        selectedValue: normalizeBsSortieDepotId(selectedDepotId),
        valueKey: "id",
        labelKey: "name"
      });
      const selectedValue = selectedValues[0] || "";
      const selectedLabel = getSelectedOptionText(select);
      if (display) {
        display.textContent = selectedLabel || "Selectionner un depot";
        display.dataset.selected = selectedValue ? "true" : "false";
      }
      menu.dataset.selected = selectedValue ? "true" : "false";
      setBeReceptionPickerDisabled(menu, select, !records.length);
      panel.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun depot enregistre";
        panel.appendChild(empty);
      } else {
        records.forEach((record) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option";
          button.dataset.value = record.id;
          button.setAttribute("role", "option");
          button.textContent = record.name;
          const isActive = record.id === selectedValue;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", () => {
            if (select.disabled) return;
            select.value = record.id;
            closeBeReceptionMenu(menu);
            state.bsSortie = normalizeBsSortieChoice(
              {
                ...state.bsSortie,
                depotId: record.id,
                depot: record.name,
                locationId: "",
                locationIds: [],
                locationLabels: [],
                location: ""
              },
              { fallbackDate: getBsSortieFallbackDate() }
            );
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });
          panel.appendChild(button);
        });
      }
      wireBeReceptionMenu(menu, panel);
      return { selectedDepotId: selectedValue, selectedDepotLabel: selectedLabel };
    };
    const renderBsSortieLocationPanel = (
      locations = [],
      { selectedLocationIds = [], depotSelected = false } = {}
    ) => {
      const select = e[ID.bsLocation];
      const menu = e[ID.bsLocationMenu];
      const panel = e[ID.bsLocationPanel];
      const display = e[ID.bsLocationDisplay];
      if (!(select instanceof HTMLSelectElement) || !(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return { selectedLocationIds: [], selectedLocationLabels: [] };
      }
      const selectedIds = setBeReceptionSelectOptions(select, locations, {
        placeholder: depotSelected ? "Aucun emplacement" : "Selectionnez d'abord un depot",
        selectedValues: normalizeBsSortieLocationIds(selectedLocationIds),
        valueKey: "id",
        labelKey: "code"
      });
      const selectedLabels = normalizeBsSortieLocationLabels(
        selectedIds
          .map((id) => {
            const option = Array.from(select.options || []).find((entry) => entry.value === id);
            return option?.textContent || "";
          })
          .filter(Boolean)
      );
      const displayText = selectedLabels.length
        ? selectedLabels.length > 1
          ? `${selectedLabels.length} emplacements`
          : formatBsSortieLocationText(selectedLabels)
        : depotSelected
          ? "Aucun emplacement"
          : "Selectionnez d'abord un depot";
      if (display) {
        display.textContent = displayText;
        display.dataset.selected = selectedIds.length ? "true" : "false";
      }
      menu.dataset.selected = selectedIds.length ? "true" : "false";
      setBeReceptionPickerDisabled(menu, select, !depotSelected || !locations.length);
      panel.replaceChildren();
      if (!depotSelected) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Selectionnez d'abord un depot";
        panel.appendChild(empty);
      } else if (!locations.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = "Aucun emplacement";
        panel.appendChild(empty);
      } else {
        Array.from(select.options || []).forEach((option) => {
          if (!option.value) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option model-select-option--multiselect stock-location-option";
          button.dataset.value = option.value;
          button.setAttribute("role", "option");
          const checkbox = document.createElement("span");
          checkbox.className = "stock-location-option__checkbox";
          checkbox.setAttribute("aria-hidden", "true");
          const checkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          checkIcon.classList.add("stock-location-option__check");
          checkIcon.setAttribute("viewBox", "0 0 20 20");
          checkIcon.setAttribute("fill", "none");
          checkIcon.setAttribute("focusable", "false");
          checkIcon.setAttribute("aria-hidden", "true");
          const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          checkPath.setAttribute("d", "M5 10.5L8.5 14L15 7.5");
          checkPath.setAttribute("stroke", "currentColor");
          checkPath.setAttribute("stroke-width", "2");
          checkPath.setAttribute("stroke-linecap", "round");
          checkPath.setAttribute("stroke-linejoin", "round");
          checkIcon.appendChild(checkPath);
          checkbox.appendChild(checkIcon);
          const label = document.createElement("span");
          label.className = "stock-location-option__label";
          label.textContent = normalizeBeReceptionText(option.textContent || "");
          button.append(checkbox, label);
          const isActive = selectedIds.includes(option.value);
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (select.disabled) return;
            const currentIds = normalizeBsSortieLocationIds(
              Array.from(select.selectedOptions || []).map((entry) => entry.value)
            );
            const hasValue = currentIds.includes(option.value);
            const nextIds = hasValue
              ? currentIds.filter((entry) => entry !== option.value)
              : [...currentIds, option.value];
            Array.from(select.options || []).forEach((entry) => {
              entry.selected = nextIds.includes(entry.value);
            });
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });
          panel.appendChild(button);
        });
      }
      wireBeReceptionMenu(menu, panel);
      return { selectedLocationIds: selectedIds, selectedLocationLabels: selectedLabels };
    };
    const syncBsSortieSelectors = async () => {
      if (!e[ID.bsSortieWrap]) return false;
      const syncToken = String((Number(state.bsSortieSyncToken || 0) || 0) + 1);
      state.bsSortieSyncToken = syncToken;
      state.bsSortie = readBsSortieFormValues(state.bsSortie);
      const depots = await fetchBsSortieDepotRecords();
      if (state.bsSortieSyncToken !== syncToken) return false;
      const depotState = renderBsSortieDepotPanel(depots, state.bsSortie.depotId);
      const depotId = normalizeBsSortieDepotId(depotState.selectedDepotId || "");
      const depotLabel = normalizeBeReceptionText(depotState.selectedDepotLabel || "");
      let locations = [];
      if (depotId) locations = await fetchBsSortieLocationsForDepot(depotId);
      if (state.bsSortieSyncToken !== syncToken) return false;
      const locationState = renderBsSortieLocationPanel(locations, {
        selectedLocationIds: state.bsSortie.locationIds || [],
        depotSelected: !!depotId
      });
      state.bsSortie = normalizeBsSortieChoice(
        {
          ...state.bsSortie,
          depotId,
          depot: depotId ? depotLabel : "",
          locationId: locationState.selectedLocationIds[0] || "",
          locationIds: locationState.selectedLocationIds,
          locationLabels: locationState.selectedLocationLabels,
          location: locationState.selectedLocationLabels.length
            ? formatBsSortieLocationText(locationState.selectedLocationLabels)
            : ""
        },
        { fallbackDate: getBsSortieFallbackDate() }
      );
      syncStep2ConfirmState();
      return true;
    };
    const parseConvertWindowTime = (value = "") => {
      const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return { hour, minute };
    };
    const formatConvertWindowTimeParts = (hour, minute) =>
      `${String(Math.max(0, Math.min(23, Number(hour) || 0))).padStart(2, "0")}:${String(
        Math.max(0, Math.min(59, Number(minute) || 0))
      ).padStart(2, "0")}`;
    const ensureConvertWindowTimePicker = (
      input,
      {
        panelId = "",
        titleText = "Heure",
        getNowValue = formatBeReceptionTime
      } = {}
    ) => {
      if (!(input instanceof HTMLInputElement)) return null;
      if (input.__swbTimePickerController) return input.__swbTimePickerController;
      const wrapper =
        input.closest("[data-time-picker]") || input.parentElement?.closest("[data-time-picker]");
      const toggle = wrapper?.querySelector?.("[data-time-picker-toggle]") || null;
      const panel = wrapper?.querySelector?.("[data-time-picker-panel]") || null;
      if (!(wrapper instanceof HTMLElement) || !(toggle instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return null;
      }

      input.type = "text";
      input.readOnly = true;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.inputMode = "numeric";
      input.setAttribute("aria-haspopup", "dialog");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("role", "combobox");
      toggle.setAttribute("aria-haspopup", "dialog");
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "false");
      panel.setAttribute("aria-label", "Choisir une heure");
      panel.tabIndex = -1;
      if (!panel.id) panel.id = panelId;
      input.setAttribute("aria-controls", panel.id);
      toggle.setAttribute("aria-controls", panel.id);

      const header = document.createElement("div");
      header.className = "swb-time-picker__header";
      const title = document.createElement("div");
      title.className = "swb-time-picker__title";
      title.textContent = String(titleText || "Heure");
      const currentValue = document.createElement("div");
      currentValue.className = "swb-time-picker__current";
      currentValue.setAttribute("aria-live", "polite");
      header.append(title, currentValue);

      const body = document.createElement("div");
      body.className = "swb-time-picker__body";
      const stepperRow = document.createElement("div");
      stepperRow.className = "swb-time-picker__stepper-row";
      const createStepper = (key, labelText) => {
        const root = document.createElement("section");
        root.className = "swb-time-picker__stepper";
        root.dataset.timePart = key;
        const label = document.createElement("div");
        label.className = "swb-time-picker__stepper-label";
        label.textContent = labelText;
        const controls = document.createElement("div");
        controls.className = "swb-time-picker__stepper-controls";
        const decrementBtn = document.createElement("button");
        decrementBtn.type = "button";
        decrementBtn.className = "swb-time-picker__stepper-control";
        decrementBtn.setAttribute("aria-label", `${labelText} moins`);
        decrementBtn.textContent = "-";
        const value = document.createElement("input");
        value.className = "swb-time-picker__stepper-value";
        value.type = "text";
        value.inputMode = "numeric";
        value.autocomplete = "off";
        value.spellcheck = false;
        value.maxLength = 2;
        value.setAttribute("aria-label", labelText);
        const incrementBtn = document.createElement("button");
        incrementBtn.type = "button";
        incrementBtn.className = "swb-time-picker__stepper-control";
        incrementBtn.setAttribute("aria-label", `${labelText} plus`);
        incrementBtn.textContent = "+";
        controls.append(decrementBtn, value, incrementBtn);
        root.append(label, controls);
        return { root, decrementBtn, incrementBtn, value };
      };
      const hourStepper = createStepper("hour", "Heure");
      const minuteStepper = createStepper("minute", "Minute");
      stepperRow.append(hourStepper.root, minuteStepper.root);
      body.append(stepperRow);

      const footer = document.createElement("div");
      footer.className = "swb-time-picker__footer";
      const nowBtn = document.createElement("button");
      nowBtn.type = "button";
      nowBtn.className = "swb-time-picker__footer-btn";
      nowBtn.textContent = "Maintenant";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "swb-time-picker__footer-btn swb-time-picker__footer-btn--muted";
      clearBtn.textContent = "Effacer";
      footer.append(nowBtn, clearBtn);

      panel.innerHTML = "";
      panel.append(header, body, footer);

      const panelPlaceholder = document.createComment("swb-time-picker__panel-placeholder");
      if (panel.parentNode) {
        try {
          panel.parentNode.insertBefore(panelPlaceholder, panel);
        } catch {}
      }

      let detachRelayout = null;
      let panelPortaled = false;
      let isOpen = false;
      let selectedTime = parseConvertWindowTime(input.value);
      if (!selectedTime && input.value) input.value = "";

      const emitInputAndChange = () => {
        try {
          input.dispatchEvent(new Event("input", { bubbles: true }));
        } catch {}
        try {
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      };
      const relayoutFloatingPanel = () => {
        const gap = 6;
        const gutter = 12;
        const wrapperRect = wrapper.getBoundingClientRect();
        const width = Math.min(420, Math.max(wrapperRect.width, 340));
        let left = Math.min(
          Math.max(wrapperRect.left, gutter),
          Math.max(gutter, window.innerWidth - width - gutter)
        );
        let top = wrapperRect.bottom + gap;
        const panelHeight = panel.offsetHeight || 0;
        if (panelHeight) {
          const overflowBottom = top + panelHeight + gutter - window.innerHeight;
          if (overflowBottom > 0) {
            const flippedTop = wrapperRect.top - panelHeight - gap;
            top =
              flippedTop >= gutter
                ? flippedTop
                : Math.max(gutter, window.innerHeight - panelHeight - gutter);
          }
        }
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.width = `${Math.round(width)}px`;
        panel.style.minWidth = `${Math.round(width)}px`;
        panel.style.maxWidth = "420px";
        panel.style.zIndex = "100030";
      };
      const detachPanelListeners = () => {
        if (detachRelayout) {
          detachRelayout();
          detachRelayout = null;
        }
      };
      const restorePanel = () => {
        detachPanelListeners();
        panel.classList.remove("is-floating");
        panel.style.position = "";
        panel.style.left = "";
        panel.style.top = "";
        panel.style.width = "";
        panel.style.minWidth = "";
        panel.style.maxWidth = "";
        panel.style.zIndex = "";
        if (panelPlaceholder.parentNode && panel.parentNode !== panelPlaceholder.parentNode) {
          try {
            panelPlaceholder.parentNode.insertBefore(panel, panelPlaceholder);
          } catch {}
        }
        panelPortaled = false;
      };
      const portalPanelToBody = () => {
        if (panelPortaled) {
          relayoutFloatingPanel();
          return;
        }
        if (panel.parentNode !== document.body) {
          try {
            document.body.appendChild(panel);
          } catch {}
        }
        panel.classList.add("is-floating");
        panel.style.position = "fixed";
        const handleRelayout = () => relayoutFloatingPanel();
        relayoutFloatingPanel();
        window.addEventListener("resize", handleRelayout);
        window.addEventListener("scroll", handleRelayout, true);
        detachRelayout = () => {
          window.removeEventListener("resize", handleRelayout);
          window.removeEventListener("scroll", handleRelayout, true);
        };
        panelPortaled = true;
      };
      const setSelectedTime = (parts, { silent = false } = {}) => {
        if (!parts) {
          selectedTime = null;
          input.value = "";
        } else {
          selectedTime = {
            hour: Math.max(0, Math.min(23, Number(parts.hour) || 0)),
            minute: Math.max(0, Math.min(59, Number(parts.minute) || 0))
          };
          input.value = formatConvertWindowTimeParts(selectedTime.hour, selectedTime.minute);
        }
        renderTimePanel();
        if (!silent) emitInputAndChange();
      };
      const getWorkingTime = () => {
        const active = selectedTime || parseConvertWindowTime(input.value);
        if (active) return { hour: active.hour, minute: active.minute };
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes() };
      };
      const clampStepperPartValue = (part, rawValue) => {
        const digits = String(rawValue || "")
          .replace(/\D+/g, "")
          .slice(0, 2);
        if (!digits) return { raw: "", numeric: null };
        const max = part === "hour" ? 23 : 59;
        const numeric = Math.max(0, Math.min(max, Number(digits)));
        return { raw: String(numeric), numeric };
      };
      const updateCurrentValueSummary = () => {
        const active = selectedTime || parseConvertWindowTime(input.value);
        currentValue.textContent = active
          ? formatConvertWindowTimeParts(active.hour, active.minute)
          : "Choisir une heure";
      };
      const adjustSelectedTime = (part, delta) => {
        const base = getWorkingTime();
        let nextHour = base.hour;
        let nextMinute = base.minute;
        if (part === "hour") {
          nextHour = (base.hour + delta + 24) % 24;
        } else {
          nextMinute = (base.minute + delta + 60) % 60;
        }
        setSelectedTime({ hour: nextHour, minute: nextMinute });
      };
      const commitStepperValue = (part, rawValue, { emit = true, finalize = false } = {}) => {
        const targetField = part === "hour" ? hourStepper.value : minuteStepper.value;
        const normalized = clampStepperPartValue(part, rawValue);
        if (targetField.value !== normalized.raw) targetField.value = normalized.raw;
        if (normalized.numeric === null) {
          if (finalize) renderTimePanel();
          else updateCurrentValueSummary();
          return;
        }
        const base = getWorkingTime();
        const next = {
          hour: part === "hour" ? normalized.numeric : base.hour,
          minute: part === "minute" ? normalized.numeric : base.minute
        };
        selectedTime = next;
        input.value = formatConvertWindowTimeParts(next.hour, next.minute);
        if (finalize) renderTimePanel();
        else updateCurrentValueSummary();
        if (emit) emitInputAndChange();
      };
      const handleStepperKeydown = (part, evt) => {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
        if (evt.key === "ArrowUp") {
          evt.preventDefault();
          adjustSelectedTime(part, part === "hour" ? 1 : 5);
          return;
        }
        if (evt.key === "ArrowDown") {
          evt.preventDefault();
          adjustSelectedTime(part, part === "hour" ? -1 : -5);
          return;
        }
        const allowedKeys = new Set([
          "Backspace",
          "Delete",
          "Tab",
          "Enter",
          "Escape",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End"
        ]);
        if (allowedKeys.has(evt.key) || /^\d$/.test(evt.key)) return;
        evt.preventDefault();
      };
      const renderTimePanel = () => {
        const active = selectedTime || parseConvertWindowTime(input.value);
        const display = active || getWorkingTime();
        updateCurrentValueSummary();
        hourStepper.value.value = String(display.hour).padStart(2, "0");
        minuteStepper.value.value = String(display.minute).padStart(2, "0");
      };
      const closePanel = () => {
        if (!isOpen) return;
        isOpen = false;
        wrapper.classList.remove("is-open");
        restorePanel();
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", outsideClick);
        document.removeEventListener("keydown", handleKeydown, true);
      };
      const openPanel = () => {
        if (input.disabled || isOpen) return;
        isOpen = true;
        wrapper.classList.add("is-open");
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-expanded", "true");
        renderTimePanel();
        portalPanelToBody();
        document.addEventListener("click", outsideClick);
        document.addEventListener("keydown", handleKeydown, true);
        requestAnimationFrame(() => {
          try {
            panel.focus();
          } catch {}
        });
      };
      const outsideClick = (evt) => {
        if (!isOpen) return;
        if (wrapper.contains(evt.target) || panel.contains(evt.target)) return;
        closePanel();
      };
      const handleKeydown = (evt) => {
        if (!isOpen) return;
        if (evt.key === "Escape") {
          evt.preventDefault();
          closePanel();
          try {
            toggle.focus();
          } catch {}
        }
      };

      nowBtn.addEventListener("click", () => {
        const fallback = new Date();
        const now = parseConvertWindowTime(typeof getNowValue === "function" ? getNowValue() : "") || {
          hour: fallback.getHours(),
          minute: fallback.getMinutes()
        };
        setSelectedTime(now);
        closePanel();
      });
      hourStepper.decrementBtn.addEventListener("click", () => adjustSelectedTime("hour", -1));
      hourStepper.incrementBtn.addEventListener("click", () => adjustSelectedTime("hour", 1));
      minuteStepper.decrementBtn.addEventListener("click", () => adjustSelectedTime("minute", -5));
      minuteStepper.incrementBtn.addEventListener("click", () => adjustSelectedTime("minute", 5));
      [
        ["hour", hourStepper.value],
        ["minute", minuteStepper.value]
      ].forEach(([part, field]) => {
        field.addEventListener("keydown", (evt) => handleStepperKeydown(part, evt));
        field.addEventListener("input", () =>
          commitStepperValue(part, field.value, { emit: true, finalize: false })
        );
        field.addEventListener("blur", () =>
          commitStepperValue(part, field.value, { emit: false, finalize: true })
        );
        field.addEventListener("focus", () => {
          try {
            field.select();
          } catch {}
        });
      });
      clearBtn.addEventListener("click", () => {
        setSelectedTime(null);
        closePanel();
      });
      toggle.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (isOpen) closePanel();
        else openPanel();
      });
      input.addEventListener("click", () => openPanel());
      input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" || evt.key === " " || evt.key === "ArrowDown") {
          evt.preventDefault();
          openPanel();
        }
        if (evt.key === "Escape") {
          evt.preventDefault();
          closePanel();
        }
      });

      const controller = {
        setValue(value, { silent = true } = {}) {
          const next = parseConvertWindowTime(value);
          setSelectedTime(next, { silent });
        },
        close: () => closePanel(),
        open: () => openPanel()
      };

      input.__swbTimePickerController = controller;
      renderTimePanel();
      return controller;
    };
    const closeConvertWindowTimePanel = (input) => {
      if (input?.__swbTimePickerController?.close) {
        input.__swbTimePickerController.close();
        return;
      }
      const wrapper = input?.closest?.("[data-time-picker]") || null;
      const toggle = wrapper?.querySelector?.("[data-time-picker-toggle]") || null;
      const panel = wrapper?.querySelector?.("[data-time-picker-panel]") || null;
      if (!wrapper || !panel) return;
      panel.hidden = true;
      wrapper.classList.remove("is-open");
      input?.setAttribute("aria-expanded", "false");
      toggle?.setAttribute("aria-expanded", "false");
    };
    const closeBeReceptionTimePanel = () => closeConvertWindowTimePanel(e[ID.beTime]);
    const closeBsSortieTimePanel = () => closeConvertWindowTimePanel(e[ID.bsTime]);
    const wireBeReceptionTimeInput = () => {
      if (state.beReceptionTimeBound) return;
      const controller = ensureConvertWindowTimePicker(e[ID.beTime], {
        panelId: ID.beTimePanel,
        titleText: "Heure de reception",
        getNowValue: formatBeReceptionTime
      });
      state.beReceptionTimeBound = !!controller;
    };
    const wireBsSortieTimeInput = () => {
      if (state.bsSortieTimeBound) return;
      const controller = ensureConvertWindowTimePicker(e[ID.bsTime], {
        panelId: ID.bsTimePanel,
        titleText: "Heure de sortie",
        getNowValue: formatBsSortieTime
      });
      state.bsSortieTimeBound = !!controller;
    };
    const syncBeReceptionDateFromDocumentDate = () => {
      if (state.beReceptionDateTouched) return;
      const fallbackDate = getBeReceptionFallbackDate();
      state.beReception = normalizeBeReceptionChoice(
        { ...state.beReception, date: fallbackDate },
        { fallbackDate }
      );
      if (e[ID.beDate]) {
        e[ID.beDate].value = fallbackDate;
        if (state.beReceptionDatePickerInstance) {
          try {
            state.beReceptionDatePickerInstance.setValue(fallbackDate, { silent: true });
          } catch {}
        }
      }
    };
    const syncBsSortieDateFromDocumentDate = () => {
      if (state.bsSortieDateTouched) return;
      const fallbackDate = getBsSortieFallbackDate();
      state.bsSortie = normalizeBsSortieChoice(
        { ...state.bsSortie, date: fallbackDate },
        { fallbackDate }
      );
      if (e[ID.bsDate]) {
        e[ID.bsDate].value = fallbackDate;
        if (state.bsSortieDatePickerInstance) {
          try {
            state.bsSortieDatePickerInstance.setValue(fallbackDate, { silent: true });
          } catch {}
        }
      }
    };
    const handleDocumentDateChanged = () => {
      if (isBonEntreeTarget()) syncBeReceptionDateFromDocumentDate();
      if (isBonSortieTarget()) syncBsSortieDateFromDocumentDate();
      syncStep2ConfirmState();
    };
    const updateBeReceptionVisibility = () => {
      if (!e[ID.beReceptionWrap]) return;
      const show = isBonEntreeTarget();
      e[ID.beReceptionWrap].hidden = !show;
      e[ID.beReceptionWrap].style.display = show ? "" : "none";
      e[ID.beReceptionWrap].setAttribute("aria-hidden", show ? "false" : "true");
      if (show && !state.beReception) resetBeReceptionChoice(state.step2PrimaryDoc);
      if (show) {
        state.beReception = readBeReceptionFormValues(state.beReception);
        void syncBeReceptionSelectors();
      }
      syncStep2ConfirmState();
    };
    const updateBsSortieVisibility = () => {
      if (!e[ID.bsSortieWrap]) return;
      const show = isBonSortieTarget();
      if (e[ID.bsSectionsWrap]) {
        e[ID.bsSectionsWrap].hidden = !show;
        e[ID.bsSectionsWrap].style.display = show ? "" : "none";
        e[ID.bsSectionsWrap].setAttribute("aria-hidden", show ? "false" : "true");
      }
      e[ID.bsSortieWrap].hidden = !show;
      e[ID.bsSortieWrap].style.display = show ? "" : "none";
      e[ID.bsSortieWrap].setAttribute("aria-hidden", show ? "false" : "true");
      if (e[ID.bsTransportWrap]) {
        e[ID.bsTransportWrap].hidden = !show;
        e[ID.bsTransportWrap].style.display = show ? "" : "none";
        e[ID.bsTransportWrap].setAttribute("aria-hidden", show ? "false" : "true");
      }
      if (show && !state.bsSortie) resetBsSortieChoice(state.step2PrimaryDoc);
      if (show) {
        state.bsSortie = readBsSortieFormValues(state.bsSortie);
        void syncBsSortieSelectors();
      }
      syncStep2ConfirmState();
    };
    const ensureBeReceptionWidgets = () => {
      if (!e[ID.beReceptionWrap]) return;
      wireBeReceptionTimeInput();
      if (!state.beReceptionDatePickerBound && e[ID.beDate]) {
        if (createDatePicker) {
          try {
            const picker = createDatePicker(e[ID.beDate], {
              allowManualInput: true,
              onChange(value) {
                state.beReceptionDateTouched = true;
                state.beReception = normalizeBeReceptionChoice(
                  { ...state.beReception, date: value || "" },
                  { fallbackDate: getBeReceptionFallbackDate() }
                );
                syncStep2ConfirmState();
              }
            });
            state.beReceptionDatePickerInstance = picker || null;
            if (state.beReceptionDatePickerInstance && e[ID.beDate].value) {
              try {
                state.beReceptionDatePickerInstance.setValue(e[ID.beDate].value, { silent: true });
              } catch {}
            }
          } catch {
            state.beReceptionDatePickerInstance = null;
          }
        }
        state.beReceptionDatePickerBound = true;
      }
      if (!state.beReceptionBehaviorBound) {
        e[ID.beDate]?.addEventListener("input", () => {
          if (state.busy) return;
          state.beReceptionDateTouched = true;
          state.beReception = readBeReceptionFormValues(state.beReception);
          syncStep2ConfirmState();
        });
        e[ID.beDate]?.addEventListener("change", () => {
          if (state.busy) return;
          state.beReceptionDateTouched = true;
          state.beReception = readBeReceptionFormValues(state.beReception);
          syncStep2ConfirmState();
        });
        e[ID.beTime]?.addEventListener("input", () => {
          if (state.busy) return;
          state.beReception = readBeReceptionFormValues(state.beReception);
          syncStep2ConfirmState();
        });
        e[ID.beTime]?.addEventListener("change", () => {
          if (state.busy) return;
          state.beReception = readBeReceptionFormValues(state.beReception);
          syncStep2ConfirmState();
        });
        e[ID.beSourceRef]?.addEventListener("input", () => {
          if (state.busy) return;
          state.beReception = readBeReceptionFormValues(state.beReception);
          syncStep2ConfirmState();
        });
        e[ID.beDepot]?.addEventListener("change", () => {
          if (state.busy) return;
          void syncBeReceptionSelectors();
        });
        e[ID.beDestination]?.addEventListener("change", () => {
          if (state.busy) return;
          state.beReception = readBeReceptionFormValues(state.beReception);
          void syncBeReceptionSelectors();
        });
        state.beReceptionBehaviorBound = true;
      }
    };
    const ensureBsSortieWidgets = () => {
      if (!e[ID.bsSortieWrap]) return;
      wireBsSortieTimeInput();
      if (!state.bsSortieDatePickerBound && e[ID.bsDate]) {
        if (createDatePicker) {
          try {
            const picker = createDatePicker(e[ID.bsDate], {
              allowManualInput: true,
              onChange(value) {
                state.bsSortieDateTouched = true;
                state.bsSortie = normalizeBsSortieChoice(
                  { ...state.bsSortie, date: value || "" },
                  { fallbackDate: getBsSortieFallbackDate() }
                );
                syncStep2ConfirmState();
              }
            });
            state.bsSortieDatePickerInstance = picker || null;
            if (state.bsSortieDatePickerInstance && e[ID.bsDate].value) {
              try {
                state.bsSortieDatePickerInstance.setValue(e[ID.bsDate].value, { silent: true });
              } catch {}
            }
          } catch {
            state.bsSortieDatePickerInstance = null;
          }
        }
        state.bsSortieDatePickerBound = true;
      }
      if (!state.bsSortieBehaviorBound) {
        e[ID.bsDate]?.addEventListener("input", () => {
          if (state.busy) return;
          state.bsSortieDateTouched = true;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          syncStep2ConfirmState();
        });
        e[ID.bsDate]?.addEventListener("change", () => {
          if (state.busy) return;
          state.bsSortieDateTouched = true;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          syncStep2ConfirmState();
        });
        e[ID.bsTime]?.addEventListener("input", () => {
          if (state.busy) return;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          syncStep2ConfirmState();
        });
        e[ID.bsTime]?.addEventListener("change", () => {
          if (state.busy) return;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          syncStep2ConfirmState();
        });
        e[ID.bsSourceRef]?.addEventListener("input", () => {
          if (state.busy) return;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          syncStep2ConfirmState();
        });
        [
          ID.bsTransporter,
          ID.bsDriverName,
          ID.bsVehiclePlate,
          ID.bsTransportMode,
          ID.bsExitReason
        ].forEach((fieldId) => {
          e[fieldId]?.addEventListener("input", () => {
            if (state.busy) return;
            state.bsSortie = readBsSortieFormValues(state.bsSortie);
            syncStep2ConfirmState();
          });
          e[fieldId]?.addEventListener("change", () => {
            if (state.busy) return;
            state.bsSortie = readBsSortieFormValues(state.bsSortie);
            syncStep2ConfirmState();
          });
        });
        e[ID.bsDepot]?.addEventListener("change", () => {
          if (state.busy) return;
          void syncBsSortieSelectors();
        });
        e[ID.bsLocation]?.addEventListener("change", () => {
          if (state.busy) return;
          state.bsSortie = readBsSortieFormValues(state.bsSortie);
          void syncBsSortieSelectors();
        });
        state.bsSortieBehaviorBound = true;
      }
    };
    const syncStep2ConfirmState = () => {
      const hasModel = hasValidModelSelectionForTarget();
      if (!hasModel) {
        state.step2CanConvert = false;
        syncStepActions();
        return;
      }
      if (isFactureTarget()) {
        const selectedStatus = String(e[ID.paymentStatus]?.value || "").trim();
        const selectedMethod = isNoPaymentMethodStatus(selectedStatus)
          ? NO_PAYMENT_METHOD_LABEL
          : String(e[ID.paymentMethod]?.value || "").trim();
        state.step2CanConvert = !!(selectedStatus && selectedMethod);
        syncStepActions();
        return;
      }
      if (isBonEntreeTarget()) {
        state.beReception = readBeReceptionFormValues(state.beReception);
        state.step2CanConvert = validateBeReceptionChoice(
          state.beReception,
          getBeReceptionValidationOptions()
        ).ok;
        syncStepActions();
        return;
      }
      if (isBonSortieTarget()) {
        state.bsSortie = readBsSortieFormValues(state.bsSortie);
        state.step2CanConvert = validateBsSortieChoice(
          state.bsSortie,
          getBsSortieValidationOptions()
        ).ok;
        syncStepActions();
        return;
      }
      state.step2CanConvert = true;
      syncStepActions();
    };
    const updateAcompteVisibility = () => {
      if (!e[ID.acompteWrap]) return;
      const shouldShow = isFactureTarget() && isPartialStatus();
      e[ID.acompteWrap].hidden = !shouldShow;
      e[ID.acompteWrap].style.display = shouldShow ? "grid" : "none";
      if (shouldShow) {
        updateAcompteAmounts(normalizePaidValue(e[ID.acomptePaid]?.value || ""));
      }
      syncStep2ConfirmState();
    };

    const syncStepActions = () => {
      const step = Number(state.step || 1);
      const hasSelectedSourceDoc = resolveSelectedDocsFromStep1().length > 0;
      e[ID.back].hidden = false;
      e[ID.next].hidden = step !== 1;
      e[ID.confirm].hidden = step !== 2;
      e[ID.back].disabled = state.busy || step <= 1;
      e[ID.next].disabled = state.busy || step !== 1 || !hasSelectedSourceDoc;
      e[ID.confirm].disabled = state.busy || step !== 2 || !state.step2CanConvert || !hasSelectedSourceDoc;
    };

    const setStep = (step) => {
      state.step = Number(step || 1);
      e[ID.step1].hidden = step !== 1;
      e[ID.step2].hidden = step !== 2;
      syncStepActions();
      stepNodes.forEach((node) => {
        const value = Number(node.dataset.step || "1");
        const isActive = value === step;
        node.classList.toggle("is-active", isActive);
        node.classList.toggle("is-complete", value < step);
        node.setAttribute("aria-current", isActive ? "step" : "false");
      });
    };

    const setStatus1 = (text) => {
      e[ID.status1].textContent = String(text || "");
    };

    const setStatus2 = (text) => {
      e[ID.status2].textContent = String(text || "");
    };

    const setStep2MenuOpen = (menuEl, open) => {
      if (!menuEl) return;
      menuEl.open = !!open;
      const summary = menuEl.querySelector("summary");
      if (summary) summary.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const bindStep2SelectMenu = ({
      selectEl,
      menuEl,
      panelEl,
      displayEl,
      placeholder = "Selectionner..."
    }) => {
      if (!selectEl || !menuEl || !panelEl || !displayEl) {
        return {
          refresh: () => {},
          close: () => {}
        };
      }
      const summary = menuEl.querySelector("summary");
      const closeMenu = () => setStep2MenuOpen(menuEl, false);
      let displayOverride = "";
      const isDisabled = () =>
        !!summary && (summary.getAttribute("aria-disabled") === "true" || selectEl.disabled);

      const refresh = () => {
        const options = Array.from(selectEl.options || []);
        const selected = options.find((opt) => String(opt.value || "") === String(selectEl.value || ""));
        const selectedLabel = String(selected?.textContent || selected?.label || "").trim();
        displayEl.textContent = displayOverride || selectedLabel || placeholder;
        panelEl.innerHTML = "";
        let hasEnabled = false;
        const menuDisabled = !!selectEl.disabled;
        options.forEach((opt) => {
          const value = String(opt.value || "");
          if (!value) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "model-select-option";
          button.dataset.value = value;
          button.setAttribute("role", "option");
          const isActive = value === String(selectEl.value || "");
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.textContent = String(opt.textContent || opt.label || value).trim() || value;
          button.disabled = menuDisabled || !!opt.disabled;
          if (!opt.disabled) hasEnabled = true;
          panelEl.appendChild(button);
        });
        const finalDisabled = menuDisabled || !hasEnabled;
        menuEl.dataset.disabled = finalDisabled ? "true" : "false";
        if (summary) {
          summary.setAttribute("aria-disabled", finalDisabled ? "true" : "false");
          summary.tabIndex = finalDisabled ? -1 : 0;
        }
      };

      const setDisabled = (disabled) => {
        const isDisabledState = !!disabled;
        selectEl.disabled = isDisabledState;
        menuEl.dataset.disabled = isDisabledState ? "true" : "false";
        if (summary) {
          summary.setAttribute("aria-disabled", isDisabledState ? "true" : "false");
          summary.tabIndex = isDisabledState ? -1 : 0;
        }
        panelEl.querySelectorAll(".model-select-option").forEach((btn) => {
          btn.disabled = isDisabledState;
        });
        if (isDisabledState) closeMenu();
      };

      const setDisplayOverride = (value = "") => {
        displayOverride = String(value || "").trim();
        refresh();
      };

      summary?.addEventListener("click", (evt) => {
        if (isDisabled()) {
          evt.preventDefault();
          return;
        }
        evt.preventDefault();
        setStep2MenuOpen(menuEl, !menuEl.open);
      });
      menuEl.addEventListener("keydown", (evt) => {
        if (evt.key !== "Escape" || !menuEl.open) return;
        evt.preventDefault();
        evt.stopPropagation();
        closeMenu();
        summary?.focus?.();
      });
      panelEl.addEventListener("click", (evt) => {
        const button = evt.target.closest(".model-select-option");
        if (!button || button.disabled || isDisabled()) return;
        const value = String(button.dataset.value || "");
        if (!value) return;
        selectEl.value = value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        closeMenu();
      });
      selectEl.addEventListener("change", refresh);
      refresh();

      return { refresh, close: closeMenu, setDisabled, setDisplayOverride };
    };

    const syncTargetPanelUi = () => {
      const panel = e[ID.targetPanel];
      const select = e[ID.target];
      if (!panel || !select) return;
      const currentValue = String(select.value || "");
      panel.innerHTML = "";
      Array.from(select.options || []).forEach((option) => {
        const value = String(option.value || "");
        if (!value) return;
        const isActive = value === currentValue;
        const label = document.createElement("label");
        label.className = `toggle-option doc-type-toggle currency-toggle${isActive ? " is-active" : ""}`;
        label.dataset.docTypeOption = value;
        label.setAttribute("aria-selected", isActive ? "true" : "false");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "convertDocumentWindowTarget";
        input.value = value;
        input.className = "col-toggle";
        input.checked = isActive;
        input.disabled = !!option.disabled;
        input.setAttribute("aria-checked", isActive ? "true" : "false");
        const dot = document.createElement("span");
        dot.className = "model-save-dot";
        dot.textContent = String(option.textContent || option.label || value).trim() || value;
        label.append(input, dot);
        panel.appendChild(label);
      });
    };

    const syncStep2SelectOptions = () => {
      const syncSelect = (selectEl, placeholder, options) => {
        if (!selectEl) return;
        const previous = String(selectEl.value || "").trim();
        selectEl.innerHTML = "";
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = placeholder;
        selectEl.appendChild(placeholderOption);
        options.forEach((option) => {
          const el = document.createElement("option");
          el.value = String(option.value || "");
          el.textContent = String(option.label || option.value || "").trim();
          selectEl.appendChild(el);
        });
        if (previous && options.some((option) => String(option.value || "") === previous)) {
          selectEl.value = previous;
        }
      };
      syncSelect(e[ID.paymentStatus], "Choisir un statut", FACTURE_STATUS_OPTIONS);
      syncSelect(e[ID.paymentMethod], "Choisir un mode", PAYMENT_METHOD_OPTIONS);
    };

    const syncPaymentMethodState = () => {
      if (!e[ID.paymentMethod] || !e[ID.paymentStatus]) return;
      const shouldDisablePaymentMethod = isFactureTarget() && isNoPaymentMethodStatus(e[ID.paymentStatus].value);
      if (shouldDisablePaymentMethod) {
        const currentMethod = String(e[ID.paymentMethod].value || "").trim();
        if (currentMethod && currentMethod !== NO_PAYMENT_METHOD_LABEL) {
          state.lastPaymentMethod = currentMethod;
        }
        e[ID.paymentMethod].value = "";
        state.step2Menus.paymentMethod?.setDisplayOverride?.(NO_PAYMENT_METHOD_LABEL);
        state.step2Menus.paymentMethod?.setDisabled?.(true);
        if (e[ID.paymentRef]) e[ID.paymentRef].disabled = true;
      } else {
        if (!e[ID.paymentMethod].value && state.lastPaymentMethod) {
          e[ID.paymentMethod].value = state.lastPaymentMethod;
        }
        state.step2Menus.paymentMethod?.setDisplayOverride?.("");
        state.step2Menus.paymentMethod?.setDisabled?.(false);
        if (e[ID.paymentRef]) e[ID.paymentRef].disabled = false;
      }
      state.step2Menus.paymentMethod?.refresh?.();
      syncStep2ConfirmState();
    };

    const updatePaymentVisibility = () => {
      if (!e[ID.paymentWrap]) return;
      const shouldShow = isFactureTarget();
      e[ID.paymentWrap].hidden = !shouldShow;
      e[ID.paymentWrap].style.display = shouldShow ? "grid" : "none";
      syncPaymentMethodState();
      updateAcompteVisibility();
      syncStep2ConfirmState();
    };

    const ensureStep2Widgets = () => {
      syncStep2SelectOptions();
      ensureBeReceptionWidgets();
      ensureBsSortieWidgets();
      if (!state.step2Menus.model) {
        state.step2Menus.model = bindStep2SelectMenu({
          selectEl: e[ID.model],
          menuEl: e[ID.modelMenu],
          panelEl: e[ID.modelPanel],
          displayEl: e[ID.modelDisplay],
          placeholder: "Selectionner..."
        });
      }
      if (!state.step2Menus.paymentStatus) {
        state.step2Menus.paymentStatus = bindStep2SelectMenu({
          selectEl: e[ID.paymentStatus],
          menuEl: e[ID.paymentStatusMenu],
          panelEl: e[ID.paymentStatusPanel],
          displayEl: e[ID.paymentStatusDisplay],
          placeholder: "Choisir un statut"
        });
      }
      if (!state.step2Menus.paymentMethod) {
        state.step2Menus.paymentMethod = bindStep2SelectMenu({
          selectEl: e[ID.paymentMethod],
          menuEl: e[ID.paymentMethodMenu],
          panelEl: e[ID.paymentMethodPanel],
          displayEl: e[ID.paymentMethodDisplay],
          placeholder: "Choisir un mode"
        });
      }
      state.step2Menus.model?.refresh?.();
      state.step2Menus.paymentStatus?.refresh?.();
      state.step2Menus.paymentMethod?.refresh?.();
      syncTargetPanelUi();
      if (!state.datePickerBound && e[ID.date]) {
        if (createDatePicker) {
          try {
            const picker = createDatePicker(e[ID.date], {
              allowManualInput: true,
              onChange(value) {
                if (e[ID.date]) e[ID.date].value = String(value || "");
                handleDocumentDateChanged();
              }
            });
            state.datePickerInstance = picker || null;
            if (state.datePickerInstance && e[ID.date].value) {
              try {
                state.datePickerInstance.setValue(e[ID.date].value, { silent: true });
              } catch {}
            }
          } catch {
            state.datePickerInstance = null;
          }
        }
        state.datePickerBound = true;
      }
      if (!state.step2BehaviorBound) {
        e[ID.model]?.addEventListener("change", () => {
          if (state.busy) return;
          syncStep2ConfirmState();
        });
        e[ID.date]?.addEventListener("input", () => {
          if (state.busy) return;
          handleDocumentDateChanged();
        });
        e[ID.date]?.addEventListener("change", () => {
          if (state.busy) return;
          handleDocumentDateChanged();
        });
        e[ID.paymentStatus]?.addEventListener("change", () => {
          if (state.busy) return;
          syncPaymentMethodState();
          updateAcompteVisibility();
        });
        e[ID.paymentMethod]?.addEventListener("change", () => {
          if (state.busy) return;
          const value = String(e[ID.paymentMethod]?.value || "").trim();
          if (value && value !== NO_PAYMENT_METHOD_LABEL) {
            state.lastPaymentMethod = value;
          }
          syncStep2ConfirmState();
        });
        e[ID.paymentRef]?.addEventListener("input", () => {
          if (state.busy) return;
          syncStep2ConfirmState();
        });
        e[ID.acomptePaid]?.addEventListener("input", () => {
          if (state.busy) return;
          updateAcompteAmounts(normalizePaidValue(e[ID.acomptePaid].value));
        });
        state.step2BehaviorBound = true;
      }
      updatePaymentVisibility();
      updateBeReceptionVisibility();
      updateBsSortieVisibility();
      syncStep2ConfirmState();
    };

    const closeStep2Menus = () => {
      state.step2Menus.model?.close?.();
      state.step2Menus.paymentStatus?.close?.();
      state.step2Menus.paymentMethod?.close?.();
      closeBeReceptionMenu(e[ID.beDepotMenu]);
      closeBeReceptionMenu(e[ID.beDestinationMenu]);
      closeBeReceptionMenu(e[ID.bsDepotMenu]);
      closeBeReceptionMenu(e[ID.bsLocationMenu]);
      closeBeReceptionTimePanel();
      closeBsSortieTimePanel();
    };

    const setPartyPanelOpen = (open) => {
      const shouldOpen = !!open;
      if (!e[ID.partyPanel] || !e[ID.partyInput]) return;
      e[ID.partyPanel].hidden = !shouldOpen;
      e[ID.partyPanel].style.display = shouldOpen ? "flex" : "none";
      e[ID.partyPanel].classList.toggle("is-open", shouldOpen);
      e[ID.partyInput].setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    };

    const syncPartyInputValue = (value = "") => {
      if (!e[ID.partyInput]) return;
      const next = String(value || "");
      if (e[ID.partyInput].value !== next) e[ID.partyInput].value = next;
    };

    const getSelectedPartyLabel = () => {
      const selected = state.parties.find((party) => party.value === state.selectedPath);
      return String(selected?.label || "").trim();
    };

    const rebuildPartyPanel = (query = "") => {
      const panel = e[ID.partyPanel];
      if (!panel) return;
      panel.innerHTML = "";
      const token = normalize(query);
      const filtered = (state.parties || []).filter((party) => {
        if (!token) return true;
        return normalize(party.label).includes(token);
      });
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "model-select-empty";
        empty.textContent = state.parties.length ? "Aucun partenaire." : "Aucun partenaire disponible.";
        panel.appendChild(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      filtered.forEach((party) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "model-select-option";
        button.dataset.partyValue = party.value;
        button.setAttribute("role", "option");
        const isActive = !!state.selectedPath && party.value === state.selectedPath;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.title = party.label;
        button.textContent = party.label;
        fragment.appendChild(button);
      });
      panel.appendChild(fragment);
    };

    const setYearMenuOpen = (open) => {
      if (!e[ID.yearMenu]) return;
      e[ID.yearMenu].open = !!open;
      const summary = e[ID.yearMenu].querySelector("summary");
      if (summary) summary.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const syncYearFilterMenuUi = (selectedValue = "") => {
      const value = String(selectedValue || "");
      if (e[ID.yearDisplay]) {
        e[ID.yearDisplay].textContent = value || "Toutes";
      }
      if (!e[ID.yearPanel]) return;
      const options = Array.from(e[ID.year].options || []);
      e[ID.yearPanel].innerHTML = "";
      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "model-select-option";
        button.dataset.value = String(option.value || "");
        button.setAttribute("role", "option");
        const isActive = String(option.value || "") === value;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.textContent = option.textContent || option.label || option.value || "Toutes";
        e[ID.yearPanel].appendChild(button);
      });
    };

    const getSourceTypes = () => {
      const fromApi = w.AppInit?.DocConversion?.getMainScreenSourceTypeConfigs?.();
      const source = Array.isArray(fromApi) && fromApi.length ? fromApi : SOURCE_TYPES_FALLBACK;
      return source
        .map((entry) => {
          const docType = normalize(entry?.docType);
          if (!docType) return null;
          const targetsRaw = Array.isArray(entry?.promptOptions?.targetDocTypes)
            ? entry.promptOptions.targetDocTypes
            : Array.isArray(entry?.targets)
              ? entry.targets
              : ["facture"];
          const targets = targetsRaw.map(normalize).filter(Boolean);
          return {
            docType,
            label: String(entry?.label || labelOfType(docType)).trim() || labelOfType(docType),
            partyType: normalize(entry?.partyType) === "vendor" ? "vendor" : "client",
            targets: targets.length ? targets : ["facture"],
            defaultTarget: normalize(
              entry?.promptOptions?.defaultTarget || entry?.defaultTarget || "facture"
            ),
            promptOptions:
              entry?.promptOptions && typeof entry.promptOptions === "object"
                ? { ...entry.promptOptions }
                : {}
          };
        })
        .filter(Boolean);
    };

    const chooseSourceType = async (trigger) => {
      const sources = getSourceTypes();
      if (!sources.length) return null;
      if (typeof w.showOptionsDialog !== "function") return sources[0];
      const sourceByType = new Map();
      sources.forEach((source) => {
        const docType = normalize(source?.docType);
        if (!docType || sourceByType.has(docType)) return;
        sourceByType.set(docType, source);
      });
      const orderedRows = SOURCE_TYPE_DIALOG_ROW_VALUES.map((row) =>
        row
          .map((docType) => sourceByType.get(normalize(docType)))
          .filter(Boolean)
      ).filter((row) => row.length > 0);
      const orderedOptions = orderedRows.flat();
      const optionsForDialog = (orderedOptions.length ? orderedOptions : sources).map((source) => ({
        label: source.label,
        value: source.docType
      }));
      const choiceRows = orderedRows.length
        ? orderedRows.map((row) =>
            row.map((source) => ({
              label: source.label,
              value: source.docType
            }))
          )
        : undefined;

      const pickedIndex = await w.showOptionsDialog({
        title: "Selectionner un document",
        message: "Choisissez le type de document source :",
        options: optionsForDialog,
        choiceRows,
        trigger
      });

      if (pickedIndex === null || pickedIndex === undefined) return null;
      const pool = orderedOptions.length ? orderedOptions : sources;
      return pool[pickedIndex] || pool[0];
    };

    const buildModelDocTypeSet = (value) => {
      if (Array.isArray(value)) {
        return new Set(value.map(normalize).filter(Boolean));
      }
      const raw = String(value || "").trim();
      if (!raw) return new Set();
      return new Set(
        raw
          .split(/[,\s;|/]+/)
          .map(normalize)
          .filter(Boolean)
      );
    };
    const normalizeModelName = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const renderModelChoices = () => {
      const targetDocType = normalize(e[ID.target].value);
      const allowedTargets = buildModelDocTypeSet(state.source?.promptOptions?.allowedModelDocTypes);
      const strictByDocTypeRaw =
        state.source?.promptOptions?.allowedModelsByDocType &&
        typeof state.source.promptOptions.allowedModelsByDocType === "object"
          ? state.source.promptOptions.allowedModelsByDocType
          : null;
      const strictNames = new Set(
        (Array.isArray(strictByDocTypeRaw?.[targetDocType]) ? strictByDocTypeRaw[targetDocType] : [])
          .map((name) => normalizeModelName(name))
          .filter(Boolean)
      );
      const useStrictList = strictNames.size > 0;
      const visibleModels = state.models.filter((model) => {
        if (!targetDocType) return true;
        if (allowedTargets.size && !allowedTargets.has(targetDocType)) return false;
        const modelTypes = model.docTypes;
        if (modelTypes.size && !modelTypes.has(targetDocType)) return false;
        if (!useStrictList) return true;
        const normalizedValue = normalizeModelName(model.value);
        const normalizedLabel = normalizeModelName(model.label);
        return strictNames.has(normalizedValue) || strictNames.has(normalizedLabel);
      });
      const previous = String(e[ID.model].value || "").trim();
      e[ID.model].innerHTML =
        '<option value="">Selectionner...</option>' +
        visibleModels
          .map(
            (model) =>
              `<option value="${escapeHtml(model.value)}">${escapeHtml(model.label)}</option>`
          )
          .join("");
      if (previous && visibleModels.some((model) => model.value === previous)) {
        e[ID.model].value = previous;
      }
      state.step2Menus.model?.refresh?.();
      syncStep2ConfirmState();
    };

    const syncTarget = () => {
      const targets = Array.isArray(state.source?.targets) ? state.source.targets : [];
      const previousTarget = normalize(e[ID.target].value);
      const targetValues = [];
      e[ID.target].innerHTML = "";
      targets.forEach((targetType) => {
        const value = normalize(targetType);
        if (!value) return;
        targetValues.push(value);
        const option = document.createElement("option");
        option.value = value;
        option.textContent = labelOfType(value);
        e[ID.target].appendChild(option);
      });
      const preferred = normalize(state.source?.defaultTarget);
      e[ID.target].value = targetValues.includes(previousTarget)
        ? previousTarget
        : targetValues.includes(preferred)
          ? preferred
          : targetValues[0] || "";
      renderModelChoices();
      syncTargetPanelUi();
      updatePaymentVisibility();
      updateBeReceptionVisibility();
      updateBsSortieVisibility();
    };

    const syncYearChoices = () => {
      const years = Array.from(
        new Set(state.docs.map((doc) => String(doc.year || "").trim()).filter(Boolean))
      ).sort((a, b) => Number(b) - Number(a));
      const previous = String(state.year || "");
      e[ID.year].innerHTML =
        '<option value="">Toutes</option>' +
        years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("");
      e[ID.year].value = years.includes(previous) ? previous : "";
      state.year = e[ID.year].value;
      syncYearFilterMenuUi(state.year);
    };

    const getFilteredDocs = () => {
      const searchToken = normalize(state.search);
      return state.docs.filter((doc) => {
        if (searchToken && !normalize(`${doc.number} ${doc.display}`).includes(searchToken)) {
          return false;
        }
        if (state.year && doc.year !== state.year) {
          return false;
        }
        return true;
      });
    };

    const getTotalPages = (totalItems) =>
      Math.max(1, Math.ceil(Number(totalItems || 0) / Math.max(1, state.pageSize)));

    const clampPage = (value, totalPages) => {
      const parsed = Number.parseInt(String(value || ""), 10);
      if (!Number.isFinite(parsed)) return 1;
      return Math.min(Math.max(parsed, 1), Math.max(1, totalPages));
    };

    const syncStep1Pager = (totalItems = 0) => {
      const totalPages = getTotalPages(totalItems);
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      e[ID.step1TotalPages].textContent = String(totalPages);
      e[ID.step1PageInput].value = String(state.page);
      e[ID.step1PageInput].max = String(totalPages);
      e[ID.step1PageInput].setAttribute("aria-valuemin", "1");
      e[ID.step1PageInput].setAttribute("aria-valuemax", String(totalPages));
      e[ID.step1PageInput].setAttribute("aria-valuenow", String(state.page));
      e[ID.step1Page].setAttribute("aria-label", `Page ${state.page} sur ${totalPages}`);
      e[ID.step1Prev].disabled = state.busy || totalPages <= 1 || state.page <= 1;
      e[ID.step1Next].disabled = state.busy || totalPages <= 1 || state.page >= totalPages;
    };

    const renderStep1Empty = (message) => {
      e[ID.list].innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "doc-history-modal__empty convert-document-window-modal__empty";
      empty.textContent = String(message || "Aucun resultat.");
      e[ID.list].appendChild(empty);
    };

    const renderList = () => {
      const filteredDocs = getFilteredDocs();
      const availablePaths = new Set((state.docs || []).map((doc) => String(doc.path || "").trim()));
      if (state.selectedDocPaths.length) {
        const nextPaths = state.selectedDocPaths.filter((path) => availablePaths.has(path));
        if (nextPaths.length !== state.selectedDocPaths.length) {
          setSelectedDocPaths(nextPaths);
        }
      }

      e[ID.list].innerHTML = "";

      if (!state.source) {
        renderStep1Empty("Selectionnez un type de document source.");
        syncStep1Pager(0);
        setStatus1("Selectionnez un type de document source.");
        syncStepActions();
        return;
      }
      if (!state.selectedPath) {
        const message = `Selectionnez ${
          state.source.partyType === "vendor" ? "FOURNISSEUR" : "CLIENT"
        } pour afficher les documents.`;
        renderStep1Empty(message);
        syncStep1Pager(0);
        setStatus1(message);
        syncStepActions();
        return;
      }
      if (!filteredDocs.length) {
        renderStep1Empty("Aucun document trouve.");
        syncStep1Pager(0);
        const selectedCount = resolveSelectedDocsFromStep1().length;
        setStatus1(
          selectedCount
            ? `${selectedCount} document(s) selectionne(s). Aucun document trouve pour les filtres actuels.`
            : "Aucun document trouve."
        );
        syncStepActions();
        return;
      }

      syncStep1Pager(filteredDocs.length);
      const startIndex = (state.page - 1) * state.pageSize;
      const visibleDocs = filteredDocs.slice(startIndex, startIndex + state.pageSize);
      const selectedPaths = getSelectedDocPathSet();

      visibleDocs.forEach((doc) => {
        const checked = selectedPaths.has(doc.path);
        const row = document.createElement("label");
        row.className = `convert-document-window-modal__item be-source-document-picker-modal__card${
          checked ? " is-selected" : ""
        }`;
        row.setAttribute("role", "listitem");
        row.innerHTML = `
          <span class="be-source-document-picker-modal__card-content">
            <span class="be-source-document-picker-modal__card-main">
              <input
                type="checkbox"
                class="be-source-document-picker-modal__checkbox"
                name="convertDocumentWindowPick"
                value="${escapeHtml(doc.path)}"
                ${checked ? "checked" : ""}
                ${state.busy ? "disabled" : ""}
              >
              <span class="be-source-document-picker-modal__card-title">${escapeHtml(doc.display)}</span>
            </span>
            <span class="be-source-document-picker-modal__card-meta">
              <span class="be-source-document-picker-modal__meta-chip">Date: ${escapeHtml(
                doc.date || "N.R."
              )}</span>
            </span>
          </span>
        `.trim();
        e[ID.list].appendChild(row);
      });

      const endIndex = Math.min(startIndex + visibleDocs.length, filteredDocs.length);
      const selectedCount = resolveSelectedDocsFromStep1().length;
      setStatus1(
        `${selectedCount} document(s) selectionne(s) sur ${filteredDocs.length} document(s) - Affichage ${
          startIndex + 1
        }-${endIndex}.`
      );
      syncStepActions();
    };

    const fillPartySelect = (parties) => {
      e[ID.party].innerHTML =
        '<option value="">Selectionner...</option>' +
        parties
          .map((party) => `<option value="${escapeHtml(party.value)}">${escapeHtml(party.label)}</option>`)
          .join("");
    };

    const fetchParties = async (entityType) => {
      if (typeof w.electronAPI?.searchClients !== "function") return [];
      const rows = [];
      let offset = 0;
      while (offset < 5000) {
        let response = null;
        try {
          response = await w.electronAPI.searchClients({
            query: "",
            limit: 200,
            offset,
            entityType
          });
        } catch {
          break;
        }
        if (!response?.ok) break;
        const batch = Array.isArray(response.results) ? response.results : [];
        rows.push(...batch);
        offset += batch.length;
        if (!batch.length || batch.length < 200) break;
      }

      const mapped = new Map();
      rows.forEach((row, index) => {
        const path = String(row?.path || row?.client?.__path || "").trim();
        const name = String(row?.name || row?.client?.name || "").trim() || "Sans nom";
        const code = String(
          row?.codeClient || row?.codeFournisseur || row?.code || row?.identifier || ""
        ).trim();
        const label = code ? `${name} (${code})` : name;
        const key = path || `${normalize(label)}:${index}`;
        if (!mapped.has(key)) {
          mapped.set(key, {
            value: path,
            label
          });
        }
      });
      return Array.from(mapped.values()).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );
    };

    const fetchDocs = async () => {
      state.docs = [];
      clearSelectedDocs();
      state.page = 1;
      if (!state.source || !state.selectedPath) {
        syncYearChoices();
        renderList();
        return;
      }

      setStatus1("Chargement des documents...");
      let offset = 0;
      const rows = [];
      while (offset < 5000) {
        let response = null;
        try {
          response = await w.electronAPI?.listInvoiceFiles?.({
            docType: state.source.docType,
            limit: FETCH_LIMIT,
            offset
          });
        } catch {
          response = null;
        }
        if (!response?.ok) break;
        const batch = Array.isArray(response.items) ? response.items : [];
        rows.push(...batch);
        offset += batch.length;
        if (!batch.length || batch.length < FETCH_LIMIT) break;
      }

      state.docs = rows
        .map((entry, index) => {
          const partyPath = getEntryPartyPath(entry);
          const parsedPaid = Number(
            entry?.paid ??
              entry?.meta?.acompte?.paid ??
              entry?.snapshot?.totals?.acompte?.paid ??
              NaN
          );
          const parsedTotalTTC = Number(
            entry?.totalTTC ??
              entry?.totals?.totalTTC ??
              entry?.meta?.totals?.totalTTC ??
              entry?.snapshot?.totals?.totalTTC ??
              NaN
          );
          const parsedTotalHT = Number(
            entry?.totalHT ??
              entry?.totals?.totalHT ??
              entry?.meta?.totals?.totalHT ??
              entry?.snapshot?.totals?.totalHT ??
              NaN
          );
          return {
            path: String(entry?.path || "").trim(),
            number: String(entry?.number || "").trim(),
            date: String(entry?.date || "").trim(),
            partyPath,
            clientPath: String(entry?.clientPath || partyPath || "").trim(),
            clientName: String(entry?.clientName || entry?.partyName || "").trim(),
            paymentReference: String(
              entry?.paymentReference ??
                entry?.paymentRef ??
                entry?.meta?.paymentReference ??
                entry?.meta?.paymentRef ??
                ""
            ).trim(),
            paid: Number.isFinite(parsedPaid) ? parsedPaid : null,
            totalTTC: Number.isFinite(parsedTotalTTC) ? parsedTotalTTC : null,
            totalHT: Number.isFinite(parsedTotalHT) ? parsedTotalHT : null,
            currency: String(
              entry?.currency ??
                entry?.totals?.currency ??
                entry?.meta?.currency ??
                entry?.snapshot?.totals?.currency ??
                ""
            ).trim(),
            display: String(entry?.number || entry?.name || `Document ${index + 1}`).trim(),
            year:
              yearOf(entry?.date) ||
              yearOf(entry?.modifiedAt) ||
              yearOf(entry?.createdAt) ||
              ""
          };
        })
        .filter((entry) => {
          if (!entry.path) return false;
          return !state.selectedPath || entry.partyPath === state.selectedPath;
        })
        .sort((a, b) =>
          String(b.display || "").localeCompare(String(a.display || ""), undefined, {
            numeric: true,
            sensitivity: "base"
          })
        );

      state.page = 1;
      syncYearChoices();
      renderList();
    };

    const syncModel = async () => {
      if (state.modelsLoaded) {
        renderModelChoices();
        return;
      }
      const models = [];
      const seen = new Set();
      const pushModel = (entry = {}) => {
        const name = String(entry?.name || "").trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        models.push({
          value: name,
          label: String(entry?.label || name).trim() || name,
          docTypes: buildModelDocTypeSet(entry?.config?.docTypes || entry?.config?.docType || "")
        });
      };

      if (typeof SEM?.__bindingHelpers?.ensureModelCache === "function") {
        try {
          await SEM.__bindingHelpers.ensureModelCache();
        } catch {}
      }
      if (typeof SEM?.getModelEntries === "function") {
        try {
          (SEM.getModelEntries() || []).forEach(pushModel);
        } catch {}
      }
      if (!models.length && typeof w.electronAPI?.listModels === "function") {
        try {
          const response = await w.electronAPI.listModels();
          (response?.models || []).forEach(pushModel);
        } catch {}
      }

      state.models = models;
      state.modelsLoaded = true;
      renderModelChoices();
    };

    const loadPartyOptionsForCurrentSource = async () => {
      e[ID.sourceTypeDisplay].textContent = state.source?.label
        ? `- ${state.source.label}`
        : "";
      const isVendor = state.source?.partyType === "vendor";
      e[ID.partyLabel].textContent = isVendor ? "FOURNISSEUR" : "CLIENT";
      if (e[ID.partyInput]) {
        e[ID.partyInput].placeholder = isVendor
          ? "Selectionner un fournisseur"
          : "Selectionner un client";
      }
      setStatus1("Chargement des partenaires...");
      const parties = await fetchParties(isVendor ? "vendor" : "client");
      state.parties = parties;
      fillPartySelect(parties);
      state.selectedPath = "";
      state.partyQuery = "";
      syncPartyInputValue("");
      rebuildPartyPanel("");
      setPartyPanelOpen(false);
      state.docs = [];
      clearSelectedDocs();
      state.year = "";
      state.page = 1;
      e[ID.year].innerHTML = '<option value="">Toutes</option>';
      syncYearFilterMenuUi("");
      renderList();
    };

    const reset = async () => {
      state.sourceTypes = getSourceTypes();
      state.source =
        state.sourceTypes.find(
          (source) => source.docType === normalize(state.pendingSourceDocType)
        ) ||
        state.sourceTypes[0] ||
        null;
      state.parties = [];
      state.docs = [];
      clearSelectedDocs();
      state.selectedPath = "";
      state.partyQuery = "";
      state.search = "";
      state.year = "";
      state.page = 1;

      e[ID.search].value = "";
      e[ID.date].value = new Date().toISOString().slice(0, 10);
      if (state.datePickerInstance) {
        try {
          state.datePickerInstance.setValue(e[ID.date].value, { silent: true });
        } catch {}
      }
      state.step2CanConvert = false;
      state.lastPaymentMethod = "";
      state.beReception = null;
      state.beReceptionDateTouched = false;
      state.beReceptionSyncToken = 0;
      state.bsSortie = null;
      state.bsSortieDateTouched = false;
      state.bsSortieSyncToken = 0;
      e[ID.paymentMethod].value = "";
      e[ID.paymentStatus].value = "";
      e[ID.paymentRef].value = "";
      if (e[ID.beDate]) e[ID.beDate].value = "";
      if (e[ID.beTime]) e[ID.beTime].value = "";
      if (e[ID.beSourceRef]) e[ID.beSourceRef].value = "";
      if (e[ID.bsDate]) e[ID.bsDate].value = "";
      if (e[ID.bsTime]) e[ID.bsTime].value = "";
      if (e[ID.bsSourceRef]) e[ID.bsSourceRef].value = "";
      if (e[ID.bsTransporter]) e[ID.bsTransporter].value = "";
      if (e[ID.bsDriverName]) e[ID.bsDriverName].value = "";
      if (e[ID.bsVehiclePlate]) e[ID.bsVehiclePlate].value = "";
      if (e[ID.bsTransportMode]) e[ID.bsTransportMode].value = "";
      if (e[ID.bsExitReason]) e[ID.bsExitReason].value = "";
      if (e[ID.acomptePaid]) e[ID.acomptePaid].value = "0";
      if (e[ID.acompteDue]) e[ID.acompteDue].value = "";
      if (e[ID.acompteWrap]) {
        e[ID.acompteWrap].hidden = true;
        e[ID.acompteWrap].style.display = "none";
      }
      if (e[ID.beReceptionWrap]) {
        e[ID.beReceptionWrap].hidden = true;
        e[ID.beReceptionWrap].style.display = "none";
      }
      if (e[ID.bsSectionsWrap]) {
        e[ID.bsSectionsWrap].hidden = true;
        e[ID.bsSectionsWrap].style.display = "none";
      }
      if (e[ID.bsSortieWrap]) {
        e[ID.bsSortieWrap].hidden = true;
        e[ID.bsSortieWrap].style.display = "none";
      }
      if (e[ID.bsTransportWrap]) {
        e[ID.bsTransportWrap].hidden = true;
        e[ID.bsTransportWrap].style.display = "none";
      }
      setStatus1("");
      setStatus2("");
      e[ID.summary].textContent = "";
      e[ID.paymentWrap].hidden = true;
      e[ID.paymentWrap].style.display = "none";

      setStep(1);

      await loadPartyOptionsForCurrentSource();
    };

    const close = (force = false) => {
      if (!state.open) return;
      if (state.busy && !force) return;
      setPartyPanelOpen(false);
      setYearMenuOpen(false);
      closeStep2Menus();
      restoreBsTransporteurSelectionBridge();
      setOpen(false);
      setStatus1("");
      setStatus2("");
      const focusTarget = state.restoreFocus;
      state.restoreFocus = null;
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus();
        } catch {}
      }
    };

    const open = async (trigger = null) => {
      if (state.open) return;
      const pickedSource = await chooseSourceType(trigger);
      if (!pickedSource) return;
      state.restoreFocus =
        trigger && typeof trigger.focus === "function"
          ? trigger
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      state.pendingSourceDocType = pickedSource.docType;
      installBsTransporteurSelectionBridge();
      setOpen(true);
      setBusy(false);
      await reset();
    };

    const applyStep1PageInput = () => {
      const totalPages = getTotalPages(getFilteredDocs().length);
      const nextPage = clampPage(e[ID.step1PageInput].value, totalPages);
      if (nextPage !== state.page) {
        state.page = nextPage;
        renderList();
        return;
      }
      syncStep1Pager(getFilteredDocs().length);
    };

    const openOptionsStepFromSelection = async () => {
      if (!state.source || state.busy) return;
      const selectedDocs = resolveSelectedDocsFromStep1();
      if (!selectedDocs.length) {
        setStatus1("Selectionnez au moins un document source avant de passer a l'etape suivante.");
        syncStepActions();
        return;
      }
      const primaryDoc = selectedDocs[0] || null;
      const sourceNumbers = selectedDocs
        .map((doc) => String(doc?.number || doc?.display || doc?.name || "").trim())
        .filter(Boolean);
      const aggregatedDoc =
        selectedDocs.length > 1
          ? {
              ...primaryDoc,
              number: sourceNumbers.join(", ") || primaryDoc?.number || primaryDoc?.display || "",
              sourceNumbers,
              totalTTC: selectedDocs.reduce((sum, doc) => {
                const value = Number(doc?.totalTTC);
                return Number.isFinite(value) ? sum + value : sum;
              }, 0),
              totalHT: selectedDocs.reduce((sum, doc) => {
                const value = Number(doc?.totalHT);
                return Number.isFinite(value) ? sum + value : sum;
              }, 0),
              paid: selectedDocs.reduce((sum, doc) => {
                const value = Number(doc?.paid);
                return Number.isFinite(value) ? sum + value : sum;
              }, 0)
            }
          : primaryDoc
            ? { ...primaryDoc, sourceNumbers }
            : primaryDoc;
      state.step2PrimaryDoc = aggregatedDoc;
      setStatus2("");
      e[ID.summary].textContent = "";
      state.step2CanConvert = false;
      state.lastPaymentMethod = "";
      e[ID.model].value = "";
      e[ID.paymentStatus].value = "";
      e[ID.paymentMethod].value = "";
      e[ID.paymentRef].value = String(
        selectedDocs.length > 1
          ? ""
          : primaryDoc?.paymentReference || primaryDoc?.paymentRef || ""
      ).trim();
      const initialPaid = Number(aggregatedDoc?.paid);
      if (e[ID.acomptePaid]) {
        e[ID.acomptePaid].value = String(Number.isFinite(initialPaid) ? initialPaid : 0);
      }
      if (e[ID.acompteDue]) e[ID.acompteDue].value = "";
      e[ID.date].value = new Date().toISOString().slice(0, 10);
      if (state.datePickerInstance) {
        try {
          state.datePickerInstance.setValue(e[ID.date].value, { silent: true });
        } catch {}
      }
      resetBeReceptionChoice(aggregatedDoc, selectedDocs);
      resetBsSortieChoice(aggregatedDoc, selectedDocs);
      setStatus2("Chargement des options...");
      try {
        ensureStep2Widgets();
        syncTarget();
        await syncModel();
        setStep(2);
        updatePaymentVisibility();
        updateBeReceptionVisibility();
        updateBsSortieVisibility();
        if (isBonEntreeTarget()) await syncBeReceptionSelectors();
        if (isBonSortieTarget()) await syncBsSortieSelectors();
        setStatus2("");
      } catch {
        setStatus2("Impossible de charger les options de conversion.");
        setStep(1);
      } finally {
        syncStep2ConfirmState();
      }
    };

    e[ID.close]?.addEventListener("click", close);
    e[ID.back]?.addEventListener("click", () => {
      if (state.busy) return;
      setStep(1);
    });
    e[ID.next]?.addEventListener("click", () => {
      if (state.busy) return;
      void openOptionsStepFromSelection();
    });
    e[ID.confirm]?.addEventListener("click", async () => {
      const choiceTarget = normalize(e[ID.target].value);
      const choiceModel = String(e[ID.model].value || "").trim();
      const choiceDate = String(e[ID.date].value || "").trim();
      const choiceStatus = String(e[ID.paymentStatus].value || "").trim();
      const noPaymentStatus = isNoPaymentMethodStatus(choiceStatus);
      const isPartialPaymentStatus =
        normalizeFactureStatusValue(choiceStatus) === "partiellement-payee";
      const choicePaymentMethod =
        choiceTarget === "facture"
          ? noPaymentStatus
            ? NO_PAYMENT_METHOD_LABEL
            : String(e[ID.paymentMethod].value || "").trim()
          : "";
      const choicePaymentReference =
        choiceTarget === "facture" && !noPaymentStatus
          ? String(e[ID.paymentRef].value || "").trim()
          : "";
      const choicePaidAmount =
        choiceTarget === "facture" && isPartialPaymentStatus
          ? normalizePaidValue(e[ID.acomptePaid]?.value || "")
          : null;
      let choiceBeReception = null;
      let choiceBsSortie = null;
      const selectedDocs = resolveSelectedDocsFromStep1();
      if (!selectedDocs.length || !state.source) {
        setStatus2("Documents source invalides.");
        return;
      }
      if (!choiceTarget) {
        setStatus2("Selectionnez un type cible.");
        return;
      }
      if (!choiceModel || !hasValidModelSelectionForTarget()) {
        setStatus2("Selectionnez un modele.");
        return;
      }
      if (choiceTarget === "facture") {
        if (!choiceStatus) {
          setStatus2("Selectionnez un statut.");
          return;
        }
        if (!noPaymentStatus && !choicePaymentMethod) {
          setStatus2("Selectionnez un mode de paiement.");
          return;
        }
      }
      if (choiceTarget === "be") {
        const beValidation = validateBeReceptionChoice(
          readBeReceptionFormValues(state.beReception),
          getBeReceptionValidationOptions(choiceDate || getBeReceptionFallbackDate())
        );
        if (!beValidation.ok) {
          setStatus2(beValidation.error || "Informations de reception incompletes.");
          syncStep2ConfirmState();
          return;
        }
        choiceBeReception = beValidation.value;
        state.beReception = choiceBeReception;
      }
      if (choiceTarget === "bs") {
        const bsValidation = validateBsSortieChoice(
          readBsSortieFormValues(state.bsSortie),
          getBsSortieValidationOptions(choiceDate || getBsSortieFallbackDate())
        );
        if (!bsValidation.ok) {
          setStatus2(bsValidation.error || "Informations de sortie incompletes.");
          syncStep2ConfirmState();
          return;
        }
        choiceBsSortie = bsValidation.value;
        state.bsSortie = choiceBsSortie;
      }

      const convertApi = w.AppInit?.DocConversion;
      if (!convertApi?.convertSourceEntryWithChoices) {
        setStatus2("Conversion indisponible.");
        return;
      }
      if (selectedDocs.length > 1 && !convertApi?.convertSourceEntriesWithChoices) {
        setStatus2("Conversion multiple indisponible.");
        return;
      }

      setBusy(true);
      setStatus2(
        selectedDocs.length > 1
          ? `Fusion et conversion de ${selectedDocs.length} document(s)...`
          : "Conversion en cours..."
      );
      try {
        const conversionEntries = selectedDocs.map((selectedDoc) => ({
          path: selectedDoc.path,
          number: selectedDoc.number || selectedDoc.display,
          name: selectedDoc.display,
          docType: state.source.docType,
          date: selectedDoc.date,
          clientName: selectedDoc.clientName,
          clientPath: selectedDoc.clientPath,
          paymentReference: selectedDoc.paymentReference || "",
          paid: selectedDoc.paid,
          totalTTC: selectedDoc.totalTTC,
          totalHT: selectedDoc.totalHT,
          currency: selectedDoc.currency
        }));
        const conversionOptions = {
          sourceDocType: state.source.docType,
          choices: {
            target: choiceTarget,
            model: choiceModel,
            date: choiceDate,
            paymentMethod: choicePaymentMethod,
            status: choiceTarget === "facture" ? choiceStatus : "",
            paymentReference: choicePaymentReference,
            paidAmount: choicePaidAmount,
            beReception: choiceTarget === "be" ? choiceBeReception : null,
            bsSortie: choiceTarget === "bs" ? choiceBsSortie : null
          },
          promptOptions: state.source.promptOptions || {}
        };
        const result =
          conversionEntries.length > 1
            ? await convertApi.convertSourceEntriesWithChoices(conversionEntries, conversionOptions)
            : await convertApi.convertSourceEntryWithChoices(conversionEntries[0], conversionOptions);
        const failedWithDetails = result && typeof result === "object" && result.ok === false;
        const ok = !failedWithDetails && result !== false;
        if (ok) {
          close(true);
          return;
        }
        const detailedError = failedWithDetails
          ? String(result.error || result.message || "").trim()
          : "";
        setStatus2(
          detailedError ||
            (conversionEntries.length > 1
              ? "Impossible de convertir les documents selectionnes."
              : "Impossible de convertir le document.")
        );
      } catch (err) {
        setStatus2(String(err?.message || "Impossible de convertir les documents."));
      } finally {
        setBusy(false);
      }
    });
    e[ID.party]?.addEventListener("change", (evt) => {
      if (state.busy) return;
      state.selectedPath = String(evt?.target?.value || "");
      state.partyQuery = getSelectedPartyLabel();
      syncPartyInputValue(state.partyQuery);
      rebuildPartyPanel(state.partyQuery);
      clearSelectedDocs();
      state.page = 1;
      void fetchDocs();
    });
    e[ID.partyInput]?.addEventListener("focus", () => {
      if (state.busy) return;
      if (state.suppressNextPartyFocusOpen) {
        state.suppressNextPartyFocusOpen = false;
        return;
      }
      if (Date.now() < state.suppressPartyOpenUntil) return;
      state.partyQuery = String(e[ID.partyInput].value || "");
      rebuildPartyPanel(state.partyQuery);
      setPartyPanelOpen(true);
    });
    e[ID.partyInput]?.addEventListener("click", () => {
      if (state.busy) return;
      if (Date.now() < state.suppressPartyOpenUntil) return;
      state.partyQuery = String(e[ID.partyInput].value || "");
      rebuildPartyPanel(state.partyQuery);
      setPartyPanelOpen(true);
    });
    e[ID.partyInput]?.addEventListener("input", (evt) => {
      if (state.busy) return;
      const query = String(evt?.target?.value || "");
      state.partyQuery = query;
      const selectedLabel = normalize(getSelectedPartyLabel());
      if (state.selectedPath && normalize(query) !== selectedLabel) {
        e[ID.party].value = "";
        state.selectedPath = "";
        clearSelectedDocs();
        state.docs = [];
        state.page = 1;
      }
      rebuildPartyPanel(query);
      setPartyPanelOpen(true);
      renderList();
    });
    e[ID.partyInput]?.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        if (e[ID.partyPanel]?.hidden) return;
        evt.preventDefault();
        evt.stopPropagation();
        setPartyPanelOpen(false);
        return;
      }
      if (evt.key === "Enter" && !e[ID.partyPanel]?.hidden) {
        const firstOption = e[ID.partyPanel].querySelector(".model-select-option");
        if (!firstOption) return;
        evt.preventDefault();
        const value = String(firstOption.dataset.partyValue || "");
        const found = state.parties.find((party) => party.value === value);
        if (!found) return;
        e[ID.party].value = found.value;
        e[ID.party].dispatchEvent(new Event("change", { bubbles: true }));
        setPartyPanelOpen(false);
      }
    });
    e[ID.partyPanel]?.addEventListener("click", (evt) => {
      const button = evt.target.closest(".model-select-option");
      if (!button || state.busy) return;
      const value = String(button.dataset.partyValue || "");
      const found = state.parties.find((party) => party.value === value);
      if (!found) return;
      e[ID.party].value = found.value;
      e[ID.party].dispatchEvent(new Event("change", { bubbles: true }));
      setPartyPanelOpen(false);
      state.suppressPartyOpenUntil = Date.now() + 120;
    });
    e[ID.search]?.addEventListener("input", (evt) => {
      if (state.busy) return;
      state.search = String(evt?.target?.value || "");
      state.page = 1;
      renderList();
    });
    e[ID.year]?.addEventListener("change", (evt) => {
      if (state.busy) return;
      state.year = String(evt?.target?.value || "");
      syncYearFilterMenuUi(state.year);
      setYearMenuOpen(false);
      state.page = 1;
      renderList();
    });
    e[ID.list]?.addEventListener("change", (evt) => {
      if (state.busy) return;
      const input = evt.target.closest('input[name="convertDocumentWindowPick"]');
      if (!input) return;
      const selectedPath = String(input.value || "").trim();
      if (!selectedPath) return;
      const selectedSet = getSelectedDocPathSet();
      if (input.checked) {
        selectedSet.add(selectedPath);
      } else {
        selectedSet.delete(selectedPath);
      }
      setSelectedDocPaths(Array.from(selectedSet));
      if (state.step2PrimaryDoc && !selectedSet.has(state.step2PrimaryDoc.path)) {
        state.step2PrimaryDoc = resolveSelectedDocsFromStep1()[0] || null;
      }
      renderList();
    });
    e[ID.targetPanel]?.addEventListener("change", (evt) => {
      if (state.busy) return;
      const input = evt.target.closest('input[name="convertDocumentWindowTarget"]');
      if (!input || input.disabled) return;
      e[ID.target].value = String(input.value || "");
      e[ID.target].dispatchEvent(new Event("change", { bubbles: true }));
    });
    e[ID.step1Prev]?.addEventListener("click", () => {
      if (state.busy || state.page <= 1) return;
      state.page -= 1;
      renderList();
    });
    e[ID.step1Next]?.addEventListener("click", () => {
      const totalPages = getTotalPages(getFilteredDocs().length);
      if (state.busy || state.page >= totalPages) return;
      state.page += 1;
      renderList();
    });
    e[ID.step1PageInput]?.addEventListener("focus", (evt) => {
      if (evt?.target?.select) {
        try {
          evt.target.select();
        } catch {}
      }
    });
    e[ID.step1PageInput]?.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        applyStep1PageInput();
      } else if (evt.key === "Escape") {
        syncStep1Pager(getFilteredDocs().length);
        e[ID.step1PageInput].blur();
      }
    });
    e[ID.step1PageInput]?.addEventListener("blur", applyStep1PageInput);
    e[ID.yearMenu]?.addEventListener("click", (evt) => {
      if (state.busy) return;
      const summary = evt.target.closest("summary");
      if (!summary) return;
      evt.preventDefault();
      setYearMenuOpen(!e[ID.yearMenu].open);
    });
    e[ID.yearPanel]?.addEventListener("click", (evt) => {
      const button = evt.target.closest(".model-select-option");
      if (!button || state.busy) return;
      const value = String(button.dataset.value || "");
      e[ID.year].value = value;
      e[ID.year].dispatchEvent(new Event("change", { bubbles: true }));
    });
    e[ID.yearMenu]?.addEventListener("keydown", (evt) => {
      if (evt.key !== "Escape" || !e[ID.yearMenu].open) return;
      evt.preventDefault();
      evt.stopPropagation();
      setYearMenuOpen(false);
      e[ID.yearMenu].querySelector("summary")?.focus?.();
    });
    document.addEventListener("click", (evt) => {
      if (!state.open) return;
      if (e[ID.partyPanel] && !e[ID.partyPanel].hidden) {
        const partyWrapper = e[ID.partyInput]?.closest(".be-source-document-picker-modal__supplier-field");
        if (partyWrapper && !partyWrapper.contains(evt.target)) {
          setPartyPanelOpen(false);
        }
      }
      if (e[ID.yearMenu]?.open && !e[ID.yearMenu].contains(evt.target)) {
        setYearMenuOpen(false);
      }
      [
        e[ID.modelMenu],
        e[ID.paymentStatusMenu],
        e[ID.paymentMethodMenu],
        e[ID.beDepotMenu],
        e[ID.beDestinationMenu],
        e[ID.bsDepotMenu],
        e[ID.bsLocationMenu]
      ].forEach((menuEl) => {
        if (menuEl?.open && !menuEl.contains(evt.target)) {
          setStep2MenuOpen(menuEl, false);
        }
      });
      const timeWrapper = e[ID.beTime]?.closest?.("[data-time-picker]");
      const timePanel = timeWrapper?.querySelector?.("[data-time-picker-panel]");
      if (timePanel && !timePanel.hidden && timeWrapper && !timeWrapper.contains(evt.target)) {
        closeBeReceptionTimePanel();
      }
      const bsTimeWrapper = e[ID.bsTime]?.closest?.("[data-time-picker]");
      const bsTimePanel = bsTimeWrapper?.querySelector?.("[data-time-picker-panel]");
      if (bsTimePanel && !bsTimePanel.hidden && bsTimeWrapper && !bsTimeWrapper.contains(evt.target)) {
        closeBsSortieTimePanel();
      }
    }, true);
    e[ID.target]?.addEventListener("change", () => {
      if (state.busy) return;
      renderModelChoices();
      syncTargetPanelUi();
      updatePaymentVisibility();
      updateBeReceptionVisibility();
      updateBsSortieVisibility();
      syncStep2ConfirmState();
    });

    api = { open, close };
    return api;
  };

  AppInit.ConvertDocumentWindow = {
    open: (trigger = null) => setup().open(trigger),
    close: () => setup().close()
  };
})(window);
