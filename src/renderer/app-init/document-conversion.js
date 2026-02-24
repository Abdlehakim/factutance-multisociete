(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});
  const SEM = (w.SEM = w.SEM || {});
  const createDatePicker =
    w.AppDatePicker && typeof w.AppDatePicker.create === "function"
      ? w.AppDatePicker.create.bind(w.AppDatePicker)
      : null;

  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';
  const extractDocNumberFromPath = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    const sqlitePrefix = "sqlite://documents/";
    if (str.startsWith(sqlitePrefix)) {
      return str.slice(sqlitePrefix.length);
    }
    const normalized = str.replace(/\\/g, "/");
    const filename = normalized.split("/").filter(Boolean).pop() || normalized;
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
  };
  const extractYearDigits = (value) => {
    const match = String(value ?? "").match(/(\d{4})/);
    return match ? match[1] : null;
  };
  const getConvertedFromInfo = (entry, raw, sourceDocType = "devis") => {
    if (!entry) return null;
    const candidates = [
      entry.number,
      entry.invNumber,
      raw?.data?.meta?.number,
      raw?.meta?.number,
      entry.name,
      entry.label
    ];
    let number = "";
    for (const value of candidates) {
      const str = String(value ?? "").trim();
      if (!str) continue;
      number = extractDocNumberFromPath(str);
      break;
    }
    if (!number) {
      number = extractDocNumberFromPath(entry.path);
    }
    const normalizedDocType = String(sourceDocType || "devis").trim().toLowerCase() || "devis";
    const convertedFrom = { docType: normalizedDocType, type: normalizedDocType };
    const sourceId = String(entry.id || raw?.id || raw?.meta?.id || raw?.data?.meta?.id || "").trim();
    if (sourceId) convertedFrom.id = sourceId;
    if (number) convertedFrom.number = number;
    if (entry.path) convertedFrom.path = String(entry.path);
    return convertedFrom;
  };
  const normalizeConvertedFrom = (value) => {
    if (!value || typeof value !== "object") return null;
    const docType = String(value.docType || value.type || "").trim().toLowerCase();
    const id = String(value.id || value.documentId || value.rowid || "").trim();
    const number = String(value.number || "").trim();
    const path = String(value.path || "").trim();
    const date = String(value.date || "").trim();
    if (!docType && !id && !number && !path && !date) return null;
    const normalized = {};
    if (docType) {
      normalized.docType = docType;
      normalized.type = docType;
    }
    if (id) normalized.id = id;
    if (number) normalized.number = number;
    if (path) normalized.path = path;
    if (date) normalized.date = date;
    return normalized;
  };
  const captureHistorySummary = () => {
    try {
      const st = w.SEM?.state || {};
      const clientName = String(st.client?.name || "").trim();
      const clientAccount = String(st.client?.account || st.client?.accountOf || "").trim();
      const totalsFn = w.SEM?.computeTotalsReturn;
      const totals = typeof totalsFn === "function" ? totalsFn() : null;
      const totalHT = totals?.totalHT;
      const totalTTC = totals?.totalTTC ?? totals?.grand;
      const currency = totals?.currency || st.meta?.currency || "";
      const resolveReglementInfo = () => {
        if (typeof document === "undefined") return { enabled: false, valueText: "" };
        const enabled = !!document.getElementById("reglementEnabled")?.checked;
        const daysSelected = !!document.getElementById("reglementTypeDays")?.checked;
        let valueText = "A r\u00e9ception";
        if (daysSelected) {
          const daysInput = document.getElementById("reglementDays");
          const raw = String(daysInput?.value ?? "").trim();
          let days = raw ? Number(raw) : Number(daysInput?.getAttribute("value") || 30);
          if (!Number.isFinite(days)) days = 30;
          valueText = `${days} jours`;
        }
        return { enabled, valueText };
      };
      const reglementInfo = resolveReglementInfo();
      const acompteEnabled =
        totals && totals.acompte && typeof totals.acompte.enabled === "boolean"
          ? totals.acompte.enabled
          : undefined;
      const paid = totals?.acompte?.paid;
      const balanceDue = totals?.balanceDue ?? totals?.acompte?.remaining;
      return {
        clientName,
        clientAccount,
        totalHT,
        totalTTC,
        currency,
        paid,
        balanceDue,
        acompteEnabled,
        reglementEnabled: reglementInfo.enabled,
        reglementText: reglementInfo.enabled ? reglementInfo.valueText : ""
      };
    } catch {
      return {};
    }
  };
  const PAYMENT_METHOD_OPTIONS = [
   { value: "cash", label: "Esp\u00E8ces" },
  { value: "cash_deposit", label: "Versement Esp\u00E8ces" },
  { value: "cheque", label: "Ch\u00E8que" },
  { value: "bill_of_exchange", label: "Effet" },
  { value: "transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "withholding_tax", label: "Retenue \u00E0 la source" }
  ];
  const FACTURE_STATUS_OPTIONS = [
    { value: "payee", label: "Pay\u00E9e" },
    { value: "partiellement-payee", label: "Partiellement pay\u00E9es" },
    { value: "pas-encore-payer", label: "Impay\u00E9e" },
    { value: "brouillon", label: "Brouillon" }
  ];
  const NO_PAYMENT_METHOD_LABEL = "N.R";
  const UNPAID_STATUS_VALUES = new Set(["pas-encore-payer", "impayee", "impaye"]);
  const NO_PAYMENT_METHOD_STATUS_VALUES = new Set([
    "pas-encore-payer",
    "impayee",
    "impaye",
    "brouillon",
    "avoir"
  ]);
  const AVOIR_DOC_TYPE = "avoir";
  const AVOIR_NUMBER_PREFIX = "AV";
  const AVOIR_NUMBER_FORMAT = "prefix_date_counter";
  const normalizeFactureStatusValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "annule") return "brouillon";
    return normalized;
  };
  const isNoPaymentMethodStatus = (value) =>
    NO_PAYMENT_METHOD_STATUS_VALUES.has(normalizeFactureStatusValue(value));
  const isUnpaidStatus = (value) =>
    UNPAID_STATUS_VALUES.has(normalizeFactureStatusValue(value));
  const normalizeLedgerAmount = (value) => {
    const num = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(num)) return null;
    return Math.round((num + Number.EPSILON) * 1000) / 1000;
  };

  function collectModelChoices() {
    const models = [];
    const seen = new Set();
    if (typeof SEM?.getModelEntries === "function") {
      try {
        const entries = SEM.getModelEntries() || [];
        entries.forEach((entry = {}) => {
          const name = (entry.name || "").trim();
          if (!name || seen.has(name)) return;
          seen.add(name);
          models.push({
            value: name,
            label: name,
            docTypes: entry?.config?.docTypes !== undefined ? entry?.config?.docTypes : entry?.config?.docType || ""
          });
        });
      } catch (err) {
        console.warn("collectModelChoices failed", err);
      }
    }
    if (!models.length) {
      const selectEl = typeof getEl === "function" ? getEl("modelSelect") : null;
      if (selectEl?.options) {
        Array.from(selectEl.options).forEach((opt) => {
          if (!opt.value || seen.has(opt.value)) return;
          seen.add(opt.value);
          models.push({
            value: opt.value,
            label: (opt.textContent || opt.label || opt.value).trim() || opt.value,
            docTypes: ""
          });
        });
      }
    }
    return models;
  }

  async function promptDevisConversion(entry, options = {}) {
    if (!entry) return null;
    let selectedModel = "";
    let selectedDate = "";
    let selectedPaymentMethod = "";
    let selectedPaymentReference = String(
      entry?.paymentReference || entry?.paymentRef || ""
    ).trim();
    let selectedFactureStatus = "";
    let lastPaymentMethod = "";
    let selectedPaidAmount = 0;
    const promptOptions = options && typeof options === "object" ? options : {};
    const SELECTABLE_DOC_TYPES = new Set(["facture", "fa", "avoir", "devis", "bl"]);
    const targetDocTypesRaw = Array.isArray(promptOptions.targetDocTypes)
      ? promptOptions.targetDocTypes
      : ["facture", "bl"];
    const normalizedTargetDocTypes = Array.from(
      new Set(
        targetDocTypesRaw
          .map((value) => String(value || "").trim().toLowerCase())
          .filter((value) => SELECTABLE_DOC_TYPES.has(value))
      )
    );
    const defaultTargetCandidate = String(
      promptOptions.defaultTarget || normalizedTargetDocTypes[0] || "facture"
    ).trim().toLowerCase();
    const defaultTargetDocType = SELECTABLE_DOC_TYPES.has(defaultTargetCandidate)
      ? defaultTargetCandidate
      : normalizedTargetDocTypes[0] || "facture";
    if (defaultTargetDocType && !normalizedTargetDocTypes.includes(defaultTargetDocType)) {
      normalizedTargetDocTypes.unshift(defaultTargetDocType);
    }
    const showTargetChoice =
      typeof promptOptions.showTargetChoice === "boolean"
        ? promptOptions.showTargetChoice
        : normalizedTargetDocTypes.length > 1;
    const MODEL_DOC_TYPE_ALL = "all";
    const DEFAULT_MODEL_DOC_TYPE = "facture";
    const DOC_TYPE_LABELS = {
      facture: "Facture",
      fa: "Facture d'achat",
      avoir: "Facture d'avoir",
      devis: "Devis",
      bl: "Bon de livraison"
    };
    const getDocTypeDisplayLabel = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "Document";
      if (typeof w.docTypeLabel === "function") {
        const fromGlobal = String(w.docTypeLabel(normalized) || "").trim();
        if (fromGlobal) return fromGlobal;
      }
      return DOC_TYPE_LABELS[normalized] || normalized.toUpperCase();
    };
    const escapeHtmlText = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const allowedModelDocTypes = Array.isArray(promptOptions.allowedModelDocTypes)
      ? promptOptions.allowedModelDocTypes
      : [MODEL_DOC_TYPE_ALL, ...normalizedTargetDocTypes];
    let targetDocType = defaultTargetDocType || "facture";
    const dialogTitle = promptOptions.titleText || "Convertir le devis";
    const okText = promptOptions.okText || "Convertir";
    const cancelText = promptOptions.cancelText || "Annuler";
    const models = collectModelChoices();
    const today = new Date().toISOString().slice(0, 10);
    const confirmed = await showConfirm(dialogTitle, {
      title: dialogTitle,
      okText,
      cancelText,
      renderMessage(container) {
        container.innerHTML = "";
        container.style.maxHeight = "none";
        container.style.overflow = "visible";
        const wrapper = document.createElement("div");
        wrapper.className = "doc-history-convert-form";

        const modelGroup = document.createElement("div");
        modelGroup.className = "doc-history-convert__field";
        const modelLabel = document.createElement("label");
        modelLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
        modelLabel.id = "docHistoryConvertModelLabel";
        modelLabel.textContent = "Mod\u00E8le";

        const modelField = document.createElement("div");
        modelField.className = "doc-dialog-model-picker__field";

        const modelMenu = document.createElement("details");
        modelMenu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
        modelMenu.dataset.wired = "1";
        const modelSummary = document.createElement("summary");
        modelSummary.className = "btn success field-toggle-trigger";
        modelSummary.setAttribute("role", "button");
        modelSummary.setAttribute("aria-haspopup", "listbox");
        modelSummary.setAttribute("aria-expanded", "false");
        modelSummary.setAttribute("aria-labelledby", "docHistoryConvertModelLabel docHistoryConvertModelDisplay");
        const modelDisplay = document.createElement("span");
        modelDisplay.id = "docHistoryConvertModelDisplay";
        modelDisplay.className = "model-select-display";
        modelDisplay.textContent = "Aucun";
        modelSummary.appendChild(modelDisplay);
        modelSummary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
        modelMenu.appendChild(modelSummary);

        const modelPanel = document.createElement("div");
        modelPanel.id = "docHistoryConvertModelPanel";
        modelPanel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
        modelPanel.setAttribute("role", "listbox");
        modelPanel.setAttribute("aria-labelledby", "docHistoryConvertModelLabel");
        modelMenu.appendChild(modelPanel);
        const modelPanelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
        if (modelPanel.parentNode) {
          try {
            modelPanel.parentNode.insertBefore(modelPanelPlaceholder, modelPanel);
          } catch {}
        }
        let modelPanelPortaled = false;

        const modelSelect = document.createElement("select");
        modelSelect.id = "docHistoryConvertModelSelect";
        modelSelect.className = "model-select doc-dialog-model-select";
        modelSelect.setAttribute("aria-hidden", "true");
        modelSelect.tabIndex = -1;
        modelLabel.htmlFor = modelSelect.id;

        const seenModels = new Set();
        const MODEL_DOC_TYPE_LIST = ["facture", "fa", "devis", "bl", "avoir"];
        const normalizeModelDocType = (value, fallback = "") => {
          const normalized = String(value || "").trim().toLowerCase();
          if (!normalized || normalized === "aucun") return fallback;
          if (normalized === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_ALL;
          return MODEL_DOC_TYPE_LIST.includes(normalized) ? normalized : fallback;
        };
        const normalizeModelDocTypeList = (value) => {
          const rawList = Array.isArray(value)
            ? value
            : typeof value === "string"
              ? value.split(",")
              : [];
          const normalized = [];
          rawList.forEach((entry) => {
            const next = normalizeModelDocType(entry, "");
            if (!next || next === MODEL_DOC_TYPE_ALL) return;
            if (!normalized.includes(next)) normalized.push(next);
          });
          return normalized;
        };
        const expandModelDocTypes = (value, fallback = DEFAULT_MODEL_DOC_TYPE) => {
          const normalized = normalizeModelDocTypeList(value);
          if (normalized.length) return normalized;
          const single = normalizeModelDocType(value, "");
          if (single === MODEL_DOC_TYPE_ALL) return MODEL_DOC_TYPE_LIST.slice();
          if (single) return [single];
          const fallbackList = normalizeModelDocTypeList(fallback);
          return fallbackList.length ? fallbackList : [DEFAULT_MODEL_DOC_TYPE];
        };
        const allowedDocTypes = new Set(
          allowedModelDocTypes
            .map((value) => normalizeModelDocType(value, ""))
            .filter(Boolean)
        );
        const allowAllModels = !allowedDocTypes.size || allowedDocTypes.has(MODEL_DOC_TYPE_ALL);
        const normalizeModelName = (value) =>
          String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const strictAllowedModelsByDocTypeRaw =
          promptOptions.allowedModelsByDocType &&
          typeof promptOptions.allowedModelsByDocType === "object"
            ? promptOptions.allowedModelsByDocType
            : {
                facture: ["facture", "facture sans remise"]
              };
        const strictAllowedModelsByDocType = {};
        Object.entries(strictAllowedModelsByDocTypeRaw).forEach(([docTypeKey, modelNames]) => {
          const normalizedDocType = String(docTypeKey || "").trim().toLowerCase();
          if (!normalizedDocType) return;
          const normalizedNames = new Set(
            (Array.isArray(modelNames) ? modelNames : [])
              .map((name) => normalizeModelName(name))
              .filter(Boolean)
          );
          strictAllowedModelsByDocType[normalizedDocType] = normalizedNames;
        });
        const allModelOptions = [];
        let visibleModelOptions = [];
        const selectOptions = [{ value: "", label: "Aucun" }];
        models.forEach((model) => {
          const value = model.value || "";
          if (!value || seenModels.has(value)) return;
          const modelDocTypes = expandModelDocTypes(model.docTypes, DEFAULT_MODEL_DOC_TYPE);
          const isAllowed =
            allowAllModels || modelDocTypes.some((docType) => allowedDocTypes.has(docType));
          if (!isAllowed) return;
          seenModels.add(value);
          const label = model.label || value;
          allModelOptions.push({ value, label, docTypes: modelDocTypes });
        });

        const getModelLabel = (value) => {
          const match =
            allModelOptions.find((opt) => opt.value === value) ||
            visibleModelOptions.find((opt) => opt.value === value);
          return match?.label || "Aucun";
        };
        const okBtn = document.getElementById("swbDialogOk");
        const setOkEnabled = (enabled) => {
          if (!okBtn) return;
          okBtn.disabled = !enabled;
          okBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
        };
        let targetRadios = [];
        let targetSelect = null;
        let syncTargetToggle = () => {};
        let paymentMethodSelectEl = null;
        let paymentStatusSelectEl = null;
        let paymentReferenceInputEl = null;
        let paymentRow = null;
        let acompteRow = null;
        let acomptePaidInput = null;
        let acompteDueInput = null;
        let updateAcompteVisibility = () => {};
        const normalizeDocTypeValue = (value) => String(value || "").trim().toLowerCase();
        const allowedTargetDocTypes = new Set(
          (normalizedTargetDocTypes.length ? normalizedTargetDocTypes : ["facture"])
            .map((value) => normalizeDocTypeValue(value))
            .filter(Boolean)
        );
        if (!allowedTargetDocTypes.size) allowedTargetDocTypes.add("facture");
        if (!allowedTargetDocTypes.has(normalizeDocTypeValue(targetDocType))) {
          targetDocType = Array.from(allowedTargetDocTypes)[0] || "facture";
        }
        const getSelectedTargetValue = () => {
          const chosen = targetRadios.find((radio) => radio.checked);
          return normalizeDocTypeValue(chosen?.value || targetSelect?.value || targetDocType);
        };
        const hasValidModelSelectionForTarget = (targetValue) => {
          if (!selectedModel) return false;
          const normalizedTarget = normalizeDocTypeValue(targetValue) || normalizeDocTypeValue(targetDocType);
          return resolveVisibleModelOptions(normalizedTarget).some((opt) => opt.value === selectedModel);
        };
        const resolveVisibleModelOptions = (targetValue) => {
          const normalizedTarget = normalizeDocTypeValue(targetValue);
          const strictNames = strictAllowedModelsByDocType[normalizedTarget];
          const useStrictList = strictNames instanceof Set && strictNames.size > 0;
          return allModelOptions.filter((opt) => {
            const docTypes = Array.isArray(opt?.docTypes) ? opt.docTypes : [];
            if (normalizedTarget && !docTypes.includes(normalizedTarget)) return false;
            if (!useStrictList) return true;
            const normalizedValue = normalizeModelName(opt?.value || "");
            const normalizedLabel = normalizeModelName(opt?.label || "");
            return strictNames.has(normalizedValue) || strictNames.has(normalizedLabel);
          });
        };
        const isFactureTarget = () => {
          if (!targetRadios.length) {
            return normalizeDocTypeValue(targetDocType) === "facture";
          }
          const factureRadio = targetRadios.find(
            (radio) => normalizeDocTypeValue(radio?.value) === "facture"
          );
          if (!factureRadio) return false;
          const label = factureRadio.closest(".doc-type-toggle");
          const isSelected =
            !!factureRadio.checked ||
            label?.classList.contains("is-active") ||
            label?.getAttribute("aria-selected") === "true";
          const isDisabled =
            !!factureRadio.disabled ||
            label?.classList.contains("is-disabled") ||
            label?.getAttribute("aria-disabled") === "true";
          return isSelected && !isDisabled;
        };
        const isPartialStatus = () =>
          normalizeFactureStatusValue(selectedFactureStatus) === "partiellement-payee";
        const normalizePaidValue = (value) => {
          const raw = String(value ?? "").trim();
          if (!raw) return 0;
          const parsed = Number(raw.replace(",", "."));
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        };
        const resolveAcompteBase = () => {
          const totalTTC = Number(entry?.totalTTC);
          if (Number.isFinite(totalTTC)) return totalTTC;
          const totalHT = Number(entry?.totalHT);
          if (Number.isFinite(totalHT)) return totalHT;
          return null;
        };
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
        const resolveCurrency = () => String(entry?.currency || SEM?.state?.meta?.currency || "").trim();
        const updateAcompteAmounts = (paidValue) => {
          const normalizedPaid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;
          selectedPaidAmount = normalizedPaid;
          if (!acompteDueInput) return;
          const base = resolveAcompteBase();
          if (!Number.isFinite(base)) {
            acompteDueInput.value = "";
            return;
          }
          const due = Math.max(0, base - normalizedPaid);
          acompteDueInput.value = formatMoneyValue(due, resolveCurrency());
        };
        const updateConfirmState = () => {
          const hasValidModel = hasValidModelSelectionForTarget(getSelectedTargetValue());
          if (!hasValidModel) {
            setOkEnabled(false);
            return;
          }
          if (!targetRadios.length) {
            if (isFactureTarget()) {
              const hasPayment = !!(selectedPaymentMethod && selectedFactureStatus);
              setOkEnabled(hasPayment);
              return;
            }
            setOkEnabled(true);
            return;
          }
          const hasEnabled = targetRadios.some((radio) => !radio.disabled);
          if (!hasEnabled) {
            setOkEnabled(false);
            return;
          }
          if (isFactureTarget()) {
            const hasPayment = !!(selectedPaymentMethod && selectedFactureStatus);
            setOkEnabled(hasPayment);
            return;
          }
          setOkEnabled(true);
        };
        const updatePaymentVisibility = () => {
          if (!paymentRow) return;
          const show = isFactureTarget();
          paymentRow.hidden = !show;
          paymentRow.style.display = show ? "grid" : "none";
          updateAcompteVisibility();
          updateConfirmState();
        };
        const updateTargetDocTypeAvailability = () => {
          const fallbackTarget =
            normalizeDocTypeValue(targetDocType) ||
            Array.from(allowedTargetDocTypes)[0] ||
            "facture";
          if (!targetRadios.length) {
            targetDocType = allowedTargetDocTypes.has(fallbackTarget)
              ? fallbackTarget
              : Array.from(allowedTargetDocTypes)[0] || fallbackTarget;
            updateConfirmState();
            updatePaymentVisibility();
            return;
          }
          let firstAllowed = null;
          targetRadios.forEach((radio) => {
            const value = normalizeDocTypeValue(radio.value);
            const isAllowed = allowedTargetDocTypes.has(value);
            radio.disabled = !isAllowed;
            radio.setAttribute("aria-disabled", isAllowed ? "false" : "true");
            const label = radio.closest(".doc-type-toggle");
            if (label) {
              label.classList.toggle("is-disabled", !isAllowed);
              label.setAttribute("aria-disabled", isAllowed ? "false" : "true");
            }
            if (isAllowed && !firstAllowed) firstAllowed = value;
          });
          if (targetSelect) {
            targetSelect.disabled = !firstAllowed;
            targetSelect.setAttribute("aria-disabled", firstAllowed ? "false" : "true");
            Array.from(targetSelect.options || []).forEach((opt) => {
              if (!opt.value) return;
              const optValue = normalizeDocTypeValue(opt.value);
              opt.disabled = !allowedTargetDocTypes.has(optValue);
            });
          }
          const currentValue = getSelectedTargetValue();
          const nextValue =
            (currentValue && allowedTargetDocTypes.has(currentValue) && currentValue) ||
            firstAllowed ||
            Array.from(allowedTargetDocTypes)[0] ||
            fallbackTarget;
          if (nextValue && currentValue !== nextValue) {
            syncTargetToggle(nextValue);
            return;
          }
          targetDocType = nextValue || targetDocType;
          if (targetSelect && targetDocType) {
            targetSelect.value = targetDocType;
          }
          updatePaymentVisibility();
        };

        const createMenuGroup = ({
          idPrefix,
          labelText,
          placeholderText,
          options,
          selectedValue,
          onChange
        }) => {
          const group = document.createElement("div");
          group.className = "doc-history-convert__field";
          const label = document.createElement("label");
          label.className = "doc-history-convert__label doc-dialog-model-picker__label";
          label.id = `${idPrefix}Label`;
          label.textContent = labelText;
          const field = document.createElement("div");
          field.className = "doc-dialog-model-picker__field";

          const menu = document.createElement("details");
          menu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
          menu.dataset.wired = "1";
          const summary = document.createElement("summary");
          summary.className = "btn success field-toggle-trigger";
          summary.setAttribute("role", "button");
          summary.setAttribute("aria-haspopup", "listbox");
          summary.setAttribute("aria-expanded", "false");
          summary.setAttribute("aria-labelledby", `${label.id} ${idPrefix}Display`);
          const display = document.createElement("span");
          display.id = `${idPrefix}Display`;
          display.className = "model-select-display";
          display.textContent = placeholderText || "";
          summary.appendChild(display);
          summary.insertAdjacentHTML("beforeend", CHEVRON_SVG);
          menu.appendChild(summary);

          const panelPlaceholder = document.createComment("doc-history-model-panel-placeholder");
          const panel = document.createElement("div");
          panel.id = `${idPrefix}Panel`;
          panel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
          panel.setAttribute("role", "listbox");
          panel.setAttribute("aria-labelledby", label.id);
          menu.appendChild(panelPlaceholder);
          menu.appendChild(panel);

          const hiddenSelect = document.createElement("select");
          hiddenSelect.id = `${idPrefix}Select`;
          hiddenSelect.className = "model-select doc-dialog-model-select";
          hiddenSelect.setAttribute("aria-hidden", "true");
          hiddenSelect.tabIndex = -1;
          const placeholderOption = document.createElement("option");
          placeholderOption.value = "";
          placeholderOption.textContent = placeholderText || "";
          hiddenSelect.appendChild(placeholderOption);

          label.htmlFor = hiddenSelect.id;

          const getOptionLabel = (value) => {
            if (!value) return "";
            const match = options.find((opt) => opt.value === value);
            return match?.label || "";
          };
          const isMenuDisabled = () => menu.dataset.disabled === "true";

          panel.textContent = "";
          options.forEach((opt) => {
            const value = opt.value || "";
            const optionLabel = opt.label || value;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "model-select-option";
            btn.dataset.value = value;
            btn.setAttribute("role", "option");
            btn.setAttribute("aria-selected", "false");
            btn.textContent = optionLabel;
            panel.appendChild(btn);

            const option = document.createElement("option");
            option.value = value;
            option.textContent = optionLabel;
            hiddenSelect.appendChild(option);
          });

          const setSelection = (value, { closeMenu = true, notify = true, forceLabel } = {}) => {
            const nextValue = value || "";
            hiddenSelect.value = nextValue;
            const activeLabel =
              typeof forceLabel === "string" ? forceLabel : getOptionLabel(nextValue);
            display.textContent = activeLabel || placeholderText || "";
            panel.querySelectorAll(".model-select-option").forEach((btn) => {
              const isActive = btn.dataset.value === nextValue;
              btn.classList.toggle("is-active", isActive);
              btn.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            if (notify && typeof onChange === "function") onChange(nextValue);
            if (closeMenu) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
            }
          };
          const setDisabled = (disabled) => {
            const isDisabled = !!disabled;
            menu.dataset.disabled = isDisabled ? "true" : "false";
            summary.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            if (isDisabled) {
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
              summary.tabIndex = -1;
            } else {
              summary.removeAttribute("tabindex");
            }
            hiddenSelect.disabled = isDisabled;
            hiddenSelect.setAttribute("aria-disabled", isDisabled ? "true" : "false");
            panel.querySelectorAll(".model-select-option").forEach((btn) => {
              btn.disabled = isDisabled;
            });
          };

          panel.addEventListener("click", (evt) => {
            if (isMenuDisabled()) return;
            const btn = evt.target.closest(".model-select-option");
            if (!btn) return;
            setSelection(btn.dataset.value || "");
          });

          summary.addEventListener("click", (evt) => {
            if (isMenuDisabled()) return;
            evt.preventDefault();
            menu.open = !menu.open;
            summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
            if (!menu.open) summary.focus();
          });

          menu.addEventListener("keydown", (evt) => {
            if (isMenuDisabled()) return;
            if (evt.key === "Escape") {
              evt.preventDefault();
              menu.open = false;
              summary.setAttribute("aria-expanded", "false");
              summary.focus();
            }
          });

          document.addEventListener("click", (evt) => {
            if (!menu.open) return;
            if (menu.contains(evt.target)) return;
            menu.open = false;
            summary.setAttribute("aria-expanded", "false");
          });

          field.append(menu, hiddenSelect);
          group.append(label, field);
          setSelection(selectedValue, { closeMenu: false, notify: false });
          return { group, hiddenSelect, setSelection, setDisabled };
        };

        let floatingScrollContainers = [];
        let outsideClickHandler = null;

        const detachFloatingListeners = () => {
          window.removeEventListener("resize", positionModelPanel, true);
          window.removeEventListener("scroll", positionModelPanel, true);
          floatingScrollContainers.forEach((node) => {
            try {
              node.removeEventListener("scroll", positionModelPanel, true);
            } catch {}
          });
          if (outsideClickHandler) {
            document.removeEventListener("click", outsideClickHandler, true);
            outsideClickHandler = null;
          }
          floatingScrollContainers = [];
        };

        const collectFloatingScrollContainers = () => {
          const parents = [];
          let node = modelMenu?.parentElement || null;
          while (node && node !== document.body) {
            try {
              const style = window.getComputedStyle(node);
              const overflowY = style?.overflowY || style?.overflow || "";
              const overflowX = style?.overflowX || style?.overflow || "";
              if (/(auto|scroll)/i.test(overflowY) || /(auto|scroll)/i.test(overflowX)) {
                parents.push(node);
              }
            } catch {}
            node = node.parentElement;
          }
          return parents;
        };

        const clearFloatingPanelStyles = () => {
          modelPanel.classList.remove("is-floating");
          modelPanel.style.position = "";
          modelPanel.style.display = "";
          modelPanel.style.top = "";
          modelPanel.style.left = "";
          modelPanel.style.right = "";
          modelPanel.style.minWidth = "";
          modelPanel.style.maxHeight = "";
          modelPanel.style.zIndex = "";
        };

        const restoreFloatingPanel = () => {
          if (modelPanelPlaceholder.parentNode && modelPanel.parentNode !== modelPanelPlaceholder.parentNode) {
            try {
              modelPanelPlaceholder.parentNode.insertBefore(modelPanel, modelPanelPlaceholder);
            } catch {}
          }
          modelPanelPortaled = false;
        };

        const resetFloatingPanel = () => {
          detachFloatingListeners();
          clearFloatingPanelStyles();
          restoreFloatingPanel();
        };

        const setModelSelection = (value, { closeMenu = true } = {}) => {
          selectedModel = value || "";
          modelSelect.value = selectedModel;
          modelDisplay.textContent = getModelLabel(selectedModel);
          modelPanel.querySelectorAll(".model-select-option").forEach((btn) => {
            const isActive = btn.dataset.value === selectedModel;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          updateConfirmState();
          if (closeMenu) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
          }
        };

        const shouldFloatModelPanel = () => {
          if (!modelPanel || !modelSummary) return false;
          const panelHeight = modelPanel.offsetHeight || modelPanel.scrollHeight || 0;
          if (!panelHeight) return false;
          const containers = collectFloatingScrollContainers();
          if (!containers.length) return false;
          const container = containers[0];
          const containerRect = container.getBoundingClientRect();
          const summaryRect = modelSummary.getBoundingClientRect();
          const gap = 4;
          const availableBelow = containerRect.bottom - summaryRect.bottom - gap;
          return availableBelow < panelHeight;
        };

        const positionModelPanel = () => {
          if (!modelPanel || !modelSummary) return;
          const rect = modelSummary.getBoundingClientRect();
          const gap = 4;
          const panelWidth = Math.max(rect.width, 180);
          const viewportPadding = 8;
          const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
          const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);
          const top = rect.bottom + gap;
          modelPanel.style.top = `${Math.round(top)}px`;
          modelPanel.style.left = `${Math.round(left)}px`;
          modelPanel.style.right = "auto";
          modelPanel.style.minWidth = `${Math.round(panelWidth)}px`;
          modelPanel.style.maxHeight = "fit-content";
        };

        const attachFloatingListeners = () => {
          detachFloatingListeners();
          floatingScrollContainers = collectFloatingScrollContainers();
          window.addEventListener("resize", positionModelPanel, true);
          window.addEventListener("scroll", positionModelPanel, true);
          floatingScrollContainers.forEach((node) => {
            try {
              node.addEventListener("scroll", positionModelPanel, true);
            } catch {}
          });
          outsideClickHandler = (evt) => {
            if (modelMenu.contains(evt.target) || modelPanel.contains(evt.target)) return;
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
          };
          document.addEventListener("click", outsideClickHandler, true);
        };

        const portalFloatingPanel = () => {
          if (modelPanelPortaled) {
            positionModelPanel();
            return;
          }
          if (modelPanel.parentNode !== document.body) {
            try {
              document.body.appendChild(modelPanel);
            } catch {}
          }
          modelPanel.classList.add("is-floating");
          modelPanel.style.position = "fixed";
          modelPanel.style.display = "flex";
          modelPanel.style.zIndex = "100010";
          positionModelPanel();
          attachFloatingListeners();
          modelPanelPortaled = true;
        };

        const openFloatingPanel = () => {
          if (!shouldFloatModelPanel()) {
            resetFloatingPanel();
            return;
          }
          portalFloatingPanel();
        };
        const isModelPickerDisabled = () => modelMenu.dataset.disabled === "true";
        const setModelPickerEnabled = (enabled) => {
          const isEnabled = !!enabled;
          modelMenu.dataset.disabled = isEnabled ? "false" : "true";
          modelSummary.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          if (!isEnabled) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            modelSummary.tabIndex = -1;
            resetFloatingPanel();
          } else {
            modelSummary.removeAttribute("tabindex");
          }
          modelSelect.disabled = !isEnabled;
          modelSelect.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          modelPanel.querySelectorAll(".model-select-option").forEach((btn) => {
            btn.disabled = !isEnabled;
            btn.setAttribute("aria-disabled", isEnabled ? "false" : "true");
          });
        };

        const renderModelOptions = () => {
          modelPanel.textContent = "";
          modelSelect.innerHTML = "";
          selectOptions.forEach((opt) => {
            const optEl = document.createElement("option");
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            modelSelect.appendChild(optEl);
          });
          visibleModelOptions.forEach((opt) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "model-select-option";
            btn.dataset.value = opt.value;
            btn.setAttribute("role", "option");
            btn.setAttribute("aria-selected", opt.value === selectedModel ? "true" : "false");
            btn.textContent = opt.label;
            btn.addEventListener("click", () => setModelSelection(opt.value));
            modelPanel.appendChild(btn);
            const optEl = document.createElement("option");
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            modelSelect.appendChild(optEl);
          });
        };
        const applyModelFilterForTarget = (targetValue) => {
          visibleModelOptions = resolveVisibleModelOptions(targetValue);
          renderModelOptions();
          setModelPickerEnabled(visibleModelOptions.length > 0);
          const hasSelectedModel = visibleModelOptions.some((opt) => opt.value === selectedModel);
          const fallbackModel = hasSelectedModel ? selectedModel : "";
          setModelSelection(fallbackModel, { closeMenu: false });
        };

        visibleModelOptions = resolveVisibleModelOptions(getSelectedTargetValue() || targetDocType);
        renderModelOptions();
        setModelPickerEnabled(visibleModelOptions.length > 0);
        setModelSelection(selectedModel, { closeMenu: false });

        modelSummary.addEventListener("click", (evt) => {
          if (isModelPickerDisabled()) {
            evt.preventDefault();
            return;
          }
          evt.preventDefault();
          const nextOpen = !modelMenu.open;
          modelMenu.open = nextOpen;
          modelSummary.setAttribute("aria-expanded", nextOpen ? "true" : "false");
          if (nextOpen) {
            openFloatingPanel();
            const firstBtn = modelPanel.querySelector(".model-select-option:not([disabled])");
            firstBtn?.focus();
          } else {
            resetFloatingPanel();
            modelSummary.focus();
          }
        });

        modelMenu.addEventListener("toggle", () => {
          if (isModelPickerDisabled()) {
            modelMenu.open = false;
            modelSummary.setAttribute("aria-expanded", "false");
            resetFloatingPanel();
            return;
          }
          modelSummary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
          if (modelMenu.open) openFloatingPanel();
          else {
            resetFloatingPanel();
          }
        });

        modelPanel.addEventListener("keydown", (evt) => {
          if (isModelPickerDisabled()) return;
          if (evt.key === "Escape") {
            evt.preventDefault();
            setModelSelection(selectedModel);
            modelSummary.focus();
          }
        });

        wrapper.addEventListener(
          "click",
          (evt) => {
            if (!modelMenu.contains(evt.target) && !modelPanel.contains(evt.target)) {
              modelMenu.open = false;
              modelSummary.setAttribute("aria-expanded", "false");
              resetFloatingPanel();
            }
          },
          { capture: true }
        );

        modelField.appendChild(modelMenu);
        modelField.appendChild(modelSelect);
        modelGroup.appendChild(modelLabel);
        modelGroup.appendChild(modelField);

        let targetGroup = null;
        if (showTargetChoice) {
          const targetOptionValues = (
            normalizedTargetDocTypes.length ? normalizedTargetDocTypes : [defaultTargetDocType || "facture"]
          ).filter(Boolean);
          const activeTargetValue =
            (targetDocType && targetOptionValues.includes(targetDocType) && targetDocType) ||
            (defaultTargetDocType &&
              targetOptionValues.includes(defaultTargetDocType) &&
              defaultTargetDocType) ||
            targetOptionValues[0] ||
            "facture";
          targetDocType = activeTargetValue;
          const targetOptionsMarkup = targetOptionValues
            .map((docTypeValue) => {
              const isSelected = docTypeValue === activeTargetValue;
              const selectedClass = isSelected ? " is-active" : "";
              const ariaSelected = isSelected ? "true" : "false";
              const ariaChecked = isSelected ? "true" : "false";
              const checkedAttr = isSelected ? " checked" : "";
              const label = escapeHtmlText(getDocTypeDisplayLabel(docTypeValue));
              return `<label class="toggle-option doc-type-toggle currency-toggle${selectedClass}" data-doc-type-option="${docTypeValue}" aria-selected="${ariaSelected}">
                  <input type="radio" name="docHistoryConvertTarget" value="${docTypeValue}" class="col-toggle"${checkedAttr} aria-checked="${ariaChecked}">
                  <span class="model-save-dot">${label}</span>
                </label>`;
            })
            .join("");
          const targetSelectMarkup = targetOptionValues
            .map((docTypeValue) => {
              const isSelected = docTypeValue === activeTargetValue;
              const selectedAttr = isSelected ? " selected" : "";
              const label = escapeHtmlText(getDocTypeDisplayLabel(docTypeValue));
              return `<option value="${docTypeValue}"${selectedAttr}>${label}</option>`;
            })
            .join("");
          targetGroup = document.createElement("label");
          targetGroup.className = "doc-history-convert__field doc-type-field";
          targetGroup.innerHTML = `
            <span class="model-save-dot">Convertir vers:</span>
            <div class="doc-type-field__controls">
              <div class="doc-type-panel doc-type-panel--inline doc-history-convert-panel currency-panel currency-panel--inline" role="radiogroup" aria-label="Convertir vers">
                ${targetOptionsMarkup}
              </div>
              <select class="doc-type-select" aria-hidden="true" tabindex="-1">
                ${targetSelectMarkup}
              </select>
            </div>
          `;
          const targetPanel = targetGroup.querySelector(".doc-type-panel");
          targetRadios = Array.from(targetGroup.querySelectorAll('input[name="docHistoryConvertTarget"]'));
          targetSelect = targetGroup.querySelector(".doc-type-select");
          syncTargetToggle = (value) => {
            const nextValue = String(value || "").toLowerCase();
            targetDocType = nextValue || targetDocType;
            targetRadios.forEach((radio) => {
              const isMatch = String(radio.value || "").toLowerCase() === nextValue;
              if (isMatch && radio.disabled) return;
              radio.checked = isMatch;
              radio.setAttribute("aria-checked", isMatch ? "true" : "false");
              const label = radio.closest(".doc-type-toggle");
              if (label) {
                label.classList.toggle("is-active", isMatch);
                label.setAttribute("aria-selected", isMatch ? "true" : "false");
              }
            });
            if (targetSelect) targetSelect.value = nextValue;
            applyModelFilterForTarget(nextValue);
            updatePaymentVisibility();
          };
          targetRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
              if (radio.disabled) return;
              syncTargetToggle(radio.value);
            });
          });
          if (targetPanel) {
            targetPanel.addEventListener("click", (evt) => {
              const btn = evt.target.closest(".doc-type-toggle input[type=\"radio\"]");
              if (btn && !btn.disabled) syncTargetToggle(btn.value);
            });
          }
          updateTargetDocTypeAvailability();
          syncTargetToggle(
            targetDocType ||
              getSelectedTargetValue() ||
              defaultTargetDocType ||
              targetOptionValues[0] ||
              "facture"
          );
        } else {
          targetDocType = defaultTargetDocType || targetDocType || "facture";
          updateTargetDocTypeAvailability();
          applyModelFilterForTarget(targetDocType);
        }

        const dateGroup = document.createElement("label");
        dateGroup.className = "doc-history-convert__field doc-date-field";
        dateGroup.innerHTML = `
          <span>Date</span>
          <div class="swb-date-picker" data-date-picker>
            <input
              id="docHistoryConvertDate"
              type="text"
              inputmode="numeric"
              placeholder="AAAA-MM-JJ"
              autocomplete="off"
              spellcheck="false"
              aria-haspopup="dialog"
              aria-expanded="false"
              role="combobox"
              aria-controls="docHistoryConvertDatePanel"
            >
            <button
              type="button"
              class="swb-date-picker__toggle"
              data-date-picker-toggle
              aria-label="Choisir une date"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-controls="docHistoryConvertDatePanel"
            >
              <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
              </svg>
            </button>
            <div
              class="swb-date-picker__panel"
              data-date-picker-panel
              hidden
              role="dialog"
              aria-modal="false"
              aria-label="Choisir une date"
              tabindex="-1"
              id="docHistoryConvertDatePanel"
            ></div>
          </div>
        `;
        const dateInput = dateGroup.querySelector("#docHistoryConvertDate");
        const initialDate = today;
        selectedDate = initialDate;
        if (dateInput) {
          dateInput.value = initialDate;
          if (createDatePicker) {
            const picker = createDatePicker(dateInput, {
              allowManualInput: true,
              onChange(value) {
                selectedDate = value || "";
              }
            });
            if (picker) picker.setValue(initialDate, { silent: true });
          } else {
            dateInput.readOnly = false;
            dateInput.addEventListener("input", () => {
              selectedDate = dateInput.value || "";
            });
          }
        }

        paymentRow = document.createElement("div");
        paymentRow.className = "doc-dialog-model-picker__row";
        paymentRow.style.gridColumn = "1 / -1";
        let syncPaymentMethodState = () => {};
        const paymentStatusGroup = createMenuGroup({
          idPrefix: "docPaymentStatus",
          labelText: "Statut de la facture",
          placeholderText: "Choisir un statut",
          options: FACTURE_STATUS_OPTIONS,
          selectedValue: selectedFactureStatus,
          onChange: (value) => {
            selectedFactureStatus = value || "";
            syncPaymentMethodState();
            updateAcompteVisibility();
          }
        });
        paymentStatusSelectEl = paymentStatusGroup.hiddenSelect;
        const paymentMethodGroup = createMenuGroup({
          idPrefix: "docPaymentMethod",
          labelText: "Mode de paiement",
          placeholderText: "Choisir un mode",
          options: PAYMENT_METHOD_OPTIONS,
          selectedValue: selectedPaymentMethod,
          onChange: (value) => {
            selectedPaymentMethod = value || "";
            if (selectedPaymentMethod && selectedPaymentMethod !== NO_PAYMENT_METHOD_LABEL) {
              lastPaymentMethod = selectedPaymentMethod;
            }
            updateConfirmState();
          }
        });
        paymentMethodSelectEl = paymentMethodGroup.hiddenSelect;
        const paymentReferenceField = document.createElement("div");
        paymentReferenceField.className = "doc-history-convert__field";
        const paymentReferenceLabel = document.createElement("label");
        paymentReferenceLabel.className = "doc-history-convert__label doc-dialog-model-picker__label";
        const paymentReferenceId = `docHistoryPaymentReferenceInput-${Date.now()}`;
        paymentReferenceLabel.setAttribute("for", paymentReferenceId);
        paymentReferenceLabel.textContent = "R\u00e9f. paiement";
        const paymentReferenceInput = document.createElement("input");
        paymentReferenceInput.id = paymentReferenceId;
        paymentReferenceInput.type = "text";
        paymentReferenceInput.className = "doc-history-convert__input";
        paymentReferenceInput.placeholder = "R\u00e9f. paiement";
        paymentReferenceInput.value = selectedPaymentReference;
        paymentReferenceInput.addEventListener("input", () => {
          selectedPaymentReference = String(paymentReferenceInput.value || "").trim();
        });
        paymentReferenceField.append(paymentReferenceLabel, paymentReferenceInput);
        paymentReferenceInputEl = paymentReferenceInput;
        syncPaymentMethodState = () => {
          if (!paymentMethodGroup) return;
          const shouldDisable = isNoPaymentMethodStatus(selectedFactureStatus);
          if (shouldDisable) {
            if (selectedPaymentMethod && selectedPaymentMethod !== NO_PAYMENT_METHOD_LABEL) {
              lastPaymentMethod = selectedPaymentMethod;
            }
            selectedPaymentMethod = NO_PAYMENT_METHOD_LABEL;
            paymentMethodGroup.setSelection(selectedPaymentMethod, {
              closeMenu: false,
              notify: false,
              forceLabel: NO_PAYMENT_METHOD_LABEL
            });
            paymentMethodGroup.setDisabled(true);
            if (paymentReferenceInputEl) paymentReferenceInputEl.disabled = true;
          } else {
            paymentMethodGroup.setDisabled(false);
            if (selectedPaymentMethod === NO_PAYMENT_METHOD_LABEL) {
              selectedPaymentMethod = lastPaymentMethod || "";
            }
            paymentMethodGroup.setSelection(selectedPaymentMethod, {
              closeMenu: false,
              notify: false
            });
            if (paymentReferenceInputEl) paymentReferenceInputEl.disabled = false;
          }
          updateConfirmState();
        };
        syncPaymentMethodState();
        paymentRow.append(
          paymentStatusGroup.group,
          paymentMethodGroup.group,
          paymentReferenceField
        );

        acompteRow = document.createElement("div");
        acompteRow.className = "doc-dialog-model-picker__row";
        acompteRow.style.gridColumn = "1 / -1";
        acompteRow.hidden = true;
        acompteRow.style.display = "none";
        const paidField = document.createElement("label");
        paidField.className = "doc-history-convert__field";
        paidField.innerHTML = `
          <span>Pay\u00e9</span>
          <input id="acomptePaid" class="doc-history-convert__input" type="number" inputmode="decimal" min="0" step="0.01" value="0">
        `;
        acomptePaidInput = paidField.querySelector("#acomptePaid");
        if (acomptePaidInput) {
          const entryPaid = Number(entry?.paid);
          const initialPaid = Number.isFinite(entryPaid) ? entryPaid : 0;
          acomptePaidInput.value = String(initialPaid);
          selectedPaidAmount = initialPaid;
          acomptePaidInput.addEventListener("input", () => {
            updateAcompteAmounts(normalizePaidValue(acomptePaidInput.value));
          });
        }
        const dueField = document.createElement("label");
        dueField.className = "doc-history-convert__field";
        dueField.innerHTML = `
          <span>Solde d\u00fb</span>
          <input id="acompteDue" class="doc-history-convert__input" readonly>
        `;
        acompteDueInput = dueField.querySelector("#acompteDue");
        if (acompteDueInput) acompteDueInput.readOnly = true;
        acompteRow.append(paidField, dueField);
        updateAcompteVisibility = () => {
          if (!acompteRow) return;
          const show = isFactureTarget() && isPartialStatus();
          acompteRow.hidden = !show;
          acompteRow.style.display = show ? "grid" : "none";
          if (show) updateAcompteAmounts(selectedPaidAmount);
        };

        if (targetGroup) wrapper.appendChild(targetGroup);
        wrapper.appendChild(modelGroup);
        wrapper.appendChild(dateGroup);
        wrapper.appendChild(paymentRow);
        wrapper.appendChild(acompteRow);
        container.appendChild(wrapper);
        updatePaymentVisibility();

        if (okBtn) {
          okBtn.addEventListener(
            "click",
            () => {
              selectedModel = modelSelect.value || "";
              const chosen = wrapper.querySelector('input[name="docHistoryConvertTarget"]:checked');
              targetDocType = chosen?.value || targetDocType || defaultTargetDocType || "facture";
              if (dateInput) selectedDate = dateInput.value || selectedDate || "";
              if (paymentMethodSelectEl) {
                const selectValue = paymentMethodSelectEl.value || "";
                if (selectValue) selectedPaymentMethod = selectValue;
              }
              if (paymentStatusSelectEl) selectedFactureStatus = paymentStatusSelectEl.value || "";
              if (acomptePaidInput) {
                selectedPaidAmount = normalizePaidValue(acomptePaidInput.value);
              }
            },
            { once: true }
          );
        }
      }
    });
    if (!confirmed) return null;
    const normalizedTarget = String(targetDocType || "").trim().toLowerCase();
    const paymentMethod = normalizedTarget === "facture" ? selectedPaymentMethod : "";
    const paymentReference = normalizedTarget === "facture" ? selectedPaymentReference : "";
    const status = normalizedTarget === "facture" ? selectedFactureStatus : "";
    const paidAmount =
      normalizedTarget === "facture" &&
      normalizeFactureStatusValue(selectedFactureStatus) === "partiellement-payee"
        ? selectedPaidAmount
        : null;
    return {
      model: selectedModel,
      target: targetDocType,
      date: selectedDate,
      paymentMethod,
      paymentReference,
      status,
      paidAmount
    };
  }

  function forceDocTypeSelection(docType) {
    const normalized = String(docType || "facture").toLowerCase();
    const docTypeEl = getEl("docType");
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    meta.docType = normalized;
    if (docTypeEl) {
      docTypeEl.value = normalized;
      try {
        docTypeEl.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    }
    if (typeof w.syncDocTypeMenuUi === "function") {
      w.syncDocTypeMenuUi(normalized, { updateSelect: true });
    }
    if (typeof w.syncInvoiceNumberControls === "function") {
      w.syncInvoiceNumberControls({
        force: true,
        useNextIfEmpty: true,
        overrideWithNext: true
      });
    }
  }

  function syncModelSelectionUi(modelName) {
    const name = String(modelName || "").trim();
    if (!name || typeof getEl !== "function") return;
    const modelSelect = getEl("modelSelect");
    const modelActionsSelect = getEl("modelActionsSelect");
    if (modelSelect && modelSelect.value !== name) modelSelect.value = name;
    if (modelActionsSelect && modelActionsSelect.value !== name) modelActionsSelect.value = name;
    if (modelSelect) {
      w.__suppressModelApplyOnce = true;
      try {
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    }
  }

  const ensureNextNumberForDocType = async (docType = "facture") => {
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    const normalizedDocType = String(docType || meta.docType || "facture").toLowerCase();
    meta.docType = normalizedDocType;
    if (normalizedDocType === "fa") {
      const inputNumber = getEl("invNumber")?.value;
      const resolved = String(inputNumber ?? meta.number ?? "").trim();
      if (resolved && meta.number !== resolved) meta.number = resolved;
      return resolved || "";
    }
    const lengthRaw = getEl("invNumberLength")?.value ?? meta.numberLength ?? 4;
    const normalizedLength =
      typeof normalizeInvoiceNumberLength === "function"
        ? normalizeInvoiceNumberLength(lengthRaw, meta.numberLength || 4)
        : Number(lengthRaw) || Number(meta.numberLength) || 4;
    meta.numberLength = normalizedLength;
    const dateValue = meta.date || getEl("invDate")?.value || "";
    const prefixValue = getEl("invNumberPrefix")?.value || "";
    if (typeof w.electronAPI?.previewDocumentNumber === "function") {
      try {
        const res = await w.electronAPI.previewDocumentNumber({
          docType: normalizedDocType,
          date: dateValue,
          numberLength: normalizedLength,
          prefix: prefixValue,
          numberFormat: meta.numberFormat
        });
        if (res?.ok && res.number) {
          meta.number = res.number;
          meta.previewNumber = res.number;
        }
      } catch (err) {
        console.warn("preview number failed", err);
      }
    }
    if (typeof w.syncInvoiceNumberControls === "function") {
      w.syncInvoiceNumberControls({ force: true });
      const inputNumber = getEl("invNumber")?.value;
      if (inputNumber) meta.number = inputNumber;
    }
    return meta.number || "";
  };


  async function saveConvertedDocument(
    docType,
    { dateOverride, convertedFrom, paymentMethod, paymentReference, historyStatus, paidAmount } = {}
  ) {
    const normalizedDocType = String(docType || "facture").toLowerCase();
    const isFacture = normalizedDocType === "facture";
    const normalizedPaymentMethod = String(paymentMethod || "").trim();
    const normalizedPaymentReference = String(paymentReference || "").trim();
    const normalizedStatus = normalizeFactureStatusValue(historyStatus);
    let payeePaymentDelta = null;
    const resolvedPaymentMethod = isNoPaymentMethodStatus(normalizedStatus)
      ? NO_PAYMENT_METHOD_LABEL
      : normalizedPaymentMethod === NO_PAYMENT_METHOD_LABEL
        ? ""
        : normalizedPaymentMethod;
    const st = SEM.state || (SEM.state = {});
    const meta = st.meta || (st.meta = {});
    meta.docType = normalizedDocType;
    const normalizedConvertedFrom = normalizeConvertedFrom(convertedFrom);
    if (normalizedConvertedFrom) {
      meta.convertedFrom = normalizedConvertedFrom;
    } else if ("convertedFrom" in meta) {
      delete meta.convertedFrom;
    }
    if (normalizedDocType === AVOIR_DOC_TYPE) {
      // Credit notes must keep their own numbering identity.
      meta.numberFormat = AVOIR_NUMBER_FORMAT;
      meta.numberPrefix = AVOIR_NUMBER_PREFIX;
      const invNumberPrefixInput = getEl("invNumberPrefix");
      if (invNumberPrefixInput && invNumberPrefixInput.value !== AVOIR_NUMBER_PREFIX) {
        invNumberPrefixInput.value = AVOIR_NUMBER_PREFIX;
      }
      const invNumberInput = getEl("invNumber");
      if (invNumberInput && invNumberInput.value) invNumberInput.value = "";
      meta.number = "";
      meta.previewNumber = "";
    }
    const assignedNumber = await ensureNextNumberForDocType(normalizedDocType);
    const date =
      (dateOverride || meta.date || getEl("invDate")?.value || new Date().toISOString().slice(0, 10)).slice(0, 10);
    meta.date = date;
    meta.number = assignedNumber || meta.number || getEl("invNumber")?.value || meta.number || "";
      const normalizedLength =
        typeof normalizeInvoiceNumberLength === "function"
          ? normalizeInvoiceNumberLength(meta.numberLength || getEl("invNumberLength")?.value || 4, meta.numberLength || 4)
          : Number(meta.numberLength || getEl("invNumberLength")?.value || 4) || 4;
      meta.numberLength = normalizedLength;
      meta.numberYear = extractYearDigits(date) || meta.numberYear || null;
      if (meta.historyPath && typeof w.releaseDocumentEditLock === "function") {
        w.releaseDocumentEditLock(meta.historyPath);
      }
    meta.historyPath = null;
    meta.historyDocType = normalizedDocType;
    if (isFacture) {
      if (resolvedPaymentMethod) meta.paymentMethod = resolvedPaymentMethod;
      else if ("paymentMethod" in meta) delete meta.paymentMethod;
      if (!isNoPaymentMethodStatus(normalizedStatus) && normalizedPaymentReference) {
        meta.paymentReference = normalizedPaymentReference;
        meta.paymentRef = normalizedPaymentReference;
      } else {
        if ("paymentReference" in meta) delete meta.paymentReference;
        if ("paymentRef" in meta) delete meta.paymentRef;
      }
      const normalizedStatusValue = normalizedStatus;
      if (
        (normalizedStatusValue === "payee" || normalizedStatusValue === "partiellement-payee") &&
        !String(meta.paymentDate || "").trim()
      ) {
        meta.paymentDate = date;
      }
      if (isNoPaymentMethodStatus(normalizedStatusValue) && "paymentDate" in meta) {
        delete meta.paymentDate;
      }
      meta.status = normalizedStatus;
    } else {
      if ("paymentMethod" in meta) delete meta.paymentMethod;
      if ("paymentReference" in meta) delete meta.paymentReference;
      if ("paymentRef" in meta) delete meta.paymentRef;
      if ("paymentDate" in meta) delete meta.paymentDate;
      if ("status" in meta) delete meta.status;
    }
    if (!meta.number && normalizedDocType !== "fa") {
      const fallbackPrefix =
        normalizedDocType === "facture"
          ? "Fact"
          : normalizedDocType === "avoir"
            ? "AV"
          : normalizedDocType === "devis"
            ? "Dev"
            : normalizedDocType
              ? normalizedDocType.toUpperCase()
              : "Doc";
      const fallbackNumber =
        typeof formatInvoiceNumber === "function"
          ? formatInvoiceNumber(1, normalizedLength, { docType: normalizedDocType, date, meta })
          : `${fallbackPrefix}_${date.replace(/-/g, "") || "1"}-1`;
      meta.number = fallbackNumber;
    }
    const invNumberInput = getEl("invNumber");
    if (invNumberInput && invNumberInput.value !== meta.number) {
      invNumberInput.value = meta.number;
    }

    try {
      if (w.SEM?.readInputs) w.SEM.readInputs();
      else if (typeof w.readInputs === "function") w.readInputs();
    } catch {}
    const paidAmountValue = Number(paidAmount);
    if (
      isFacture &&
      normalizedStatus === "partiellement-payee" &&
      Number.isFinite(paidAmountValue)
    ) {
      const paidValue = Math.max(0, paidAmountValue);
      const acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : (meta.acompte = {});
      acompte.enabled = true;
      acompte.paid = paidValue;
      const acompteEnabledInput = getEl("acompteEnabled");
      if (acompteEnabledInput) acompteEnabledInput.checked = true;
      const acomptePaidInput = getEl("acomptePaid");
      if (acomptePaidInput) acomptePaidInput.value = String(paidValue);
    }
    if (isFacture && normalizedStatus === "payee") {
      const previousPaidRaw = Number(
        meta.acompte?.paid ?? meta?.acompte?.paid ?? NaN
      );
      const previousPaid = Number.isFinite(previousPaidRaw) ? previousPaidRaw : 0;
      const paymentDateValue =
        meta.paymentDate || date || new Date().toISOString().slice(0, 10);
      if (paymentDateValue) meta.paymentDate = paymentDateValue;
      const totalsSnapshot = typeof w.SEM?.computeTotalsReturn === "function"
        ? w.SEM.computeTotalsReturn()
        : null;
      const totalValue = Number(
        totalsSnapshot?.totalTTC ?? totalsSnapshot?.totalHT ?? totalsSnapshot?.grand ?? NaN
      );
      if (Number.isFinite(totalValue) && totalValue > 0) {
        const acompte = meta.acompte && typeof meta.acompte === "object" ? meta.acompte : (meta.acompte = {});
        acompte.enabled = true;
        acompte.paid = totalValue;
        acompte.base = totalValue;
        acompte.remaining = 0;
        payeePaymentDelta = Math.max(0, totalValue - previousPaid);
      }
    }
    try {
      w.SEM?.computeTotals?.();
    } catch {}

    const snapshot =
      (w.SEM?.captureForm && w.SEM.captureForm({ includeCompany: true })) ||
      (w.SEM?.state ? { ...w.SEM.state } : st);
    const snapMeta = snapshot.meta && typeof snapshot.meta === "object" ? snapshot.meta : (snapshot.meta = {});
    Object.assign(snapMeta, meta);
    snapMeta.docType = normalizedDocType;
    snapMeta.date = date;
    snapMeta.number = meta.number;
    snapMeta.numberLength = meta.numberLength;
    snapMeta.numberYear = meta.numberYear;
    snapMeta.historyPath = null;
    snapMeta.historyDocType = normalizedDocType;
    if (isFacture) {
      if (resolvedPaymentMethod) snapMeta.paymentMethod = resolvedPaymentMethod;
      else if ("paymentMethod" in snapMeta) delete snapMeta.paymentMethod;
      snapMeta.status = normalizedStatus;
      if (meta.paymentDate) snapMeta.paymentDate = meta.paymentDate;
    } else {
      if ("paymentMethod" in snapMeta) delete snapMeta.paymentMethod;
      if ("status" in snapMeta) delete snapMeta.status;
      if ("paymentDate" in snapMeta) delete snapMeta.paymentDate;
    }
    if (normalizedConvertedFrom) {
      snapMeta.convertedFrom = normalizedConvertedFrom;
    } else if ("convertedFrom" in snapMeta) {
      delete snapMeta.convertedFrom;
    }

    if (isFacture && normalizedStatus === "payee") {
      const totals =
        snapshot.totals && typeof snapshot.totals === "object"
          ? snapshot.totals
          : (snapshot.totals = {});
      const totalsAcompte =
        totals.acompte && typeof totals.acompte === "object"
          ? totals.acompte
          : (totals.acompte = {});
      const metaAcompte =
        snapMeta.acompte && typeof snapMeta.acompte === "object"
          ? snapMeta.acompte
          : (snapMeta.acompte = {});
      const totalValue = Number(
        totals.totalTTC ?? totals.total ?? totals.grand ?? totals.totalHT ?? totals.totalHt ?? NaN
      );
      if (Number.isFinite(totalValue) && totalValue > 0) {
        totals.balanceDue = 0;
        totalsAcompte.enabled = true;
        totalsAcompte.paid = totalValue;
        totalsAcompte.base = totalValue;
        totalsAcompte.remaining = 0;
        metaAcompte.enabled = true;
        metaAcompte.paid = totalValue;
      }
    }

    const savePayload = {
      data: snapshot,
      meta: { ...snapMeta, status: isFacture ? normalizedStatus : "", silent: true }
    };

    const handleMarkNumber = () => {
      if (typeof w.markDocumentNumberUsed === "function") {
        try {
          w.markDocumentNumberUsed({
            docType: normalizedDocType,
            numberLength: snapMeta.numberLength,
            number: snapMeta.number,
            year: snapMeta.numberYear
          });
        } catch (err) {
          console.warn("convert numbering update failed", err);
        }
      }
    };

    const handleHistoryUpdate = async (resPath, resName) => {
      const historySummary = captureHistorySummary();
      if (typeof w.addDocumentHistory === "function" && resPath) {
        try {
          w.addDocumentHistory({
            docType: normalizedDocType,
            path: resPath,
            number: snapMeta.number,
            date: snapMeta.date,
            name: resName,
            clientName: historySummary.clientName,
            clientAccount: historySummary.clientAccount,
            totalHT: historySummary.totalHT,
            totalTTC: historySummary.totalTTC,
            currency: historySummary.currency,
            paid: historySummary.paid,
            balanceDue: historySummary.balanceDue,
            acompteEnabled: historySummary.acompteEnabled,
            reglementEnabled: historySummary.reglementEnabled,
            reglementText: historySummary.reglementText,
            status: isFacture ? normalizedStatus : undefined,
            paymentMethod: isFacture ? resolvedPaymentMethod || snapMeta.paymentMethod : undefined,
            hasComment: !!String(snapMeta.noteInterne || "").trim(),
            convertedFrom: normalizedConvertedFrom || undefined
          });
        } catch (historyErr) {
          console.warn("convert history update failed", historyErr);
        }
      }
      if (
        isFacture &&
        resPath &&
        normalizedStatus === "payee" &&
        Number.isFinite(payeePaymentDelta) &&
        payeePaymentDelta > 0 &&
        typeof w.addPaymentHistoryEntry === "function"
      ) {
        if (typeof w.hydratePaymentHistory === "function") {
          await w.hydratePaymentHistory({ skipInvoiceSync: true });
        }
        const paymentDate = snapMeta.paymentDate || snapMeta.date || new Date().toISOString().slice(0, 10);
        w.addPaymentHistoryEntry({
          invoiceNumber: snapMeta.number,
          invoicePath: resPath,
          clientName: historySummary?.clientName,
          clientAccount: historySummary?.clientAccount,
          paymentDate,
          amount: payeePaymentDelta,
          balanceDue: 0,
          currency: historySummary?.currency,
          mode: resolvedPaymentMethod || snapMeta.paymentMethod || "",
          paymentRef: snapMeta.paymentRef || "",
          entryType: "invoice"
        });
      }
      if (
        isFacture &&
        resPath &&
        typeof w.syncFactureLedger === "function"
      ) {
        try {
          const clientPath =
            String(snapshot?.client?.__path || "").trim() ||
            String(w.SEM?.state?.client?.__path || "").trim() ||
            String(w.SEM?.clientFormBaseline?.__path || "").trim();
          if (clientPath) {
            const taxId = String(
              snapshot?.client?.identifiantFiscal ||
                snapshot?.client?.vat ||
                snapshot?.client?.tva ||
                ""
            ).trim();
            const invoiceTotal =
              historySummary?.totalTTC ??
              historySummary?.totalHT ??
              snapshot?.totals?.totalTTC ??
              snapshot?.totals?.totalHT ??
              NaN;
            const paidAmountForLedger =
              normalizedStatus === "payee"
                ? invoiceTotal
                : Number(String(paidAmount ?? "").replace(",", "."));
            await w.syncFactureLedger({
              clientPath,
              taxId,
              invoicePath: resPath,
              invoiceNumber: snapMeta.number,
              invoiceTotal,
              status: normalizedStatus,
              paidAmount: paidAmountForLedger,
              paymentMethod: resolvedPaymentMethod || snapMeta.paymentMethod || "",
              paymentReference: snapMeta.paymentReference || snapMeta.paymentRef || ""
            });
          } else {
            console.warn("client ledger entry skipped: client path missing");
          }
        } catch (ledgerErr) {
          console.warn("client ledger entry failed", ledgerErr);
        }
      }
      meta.historyPath = resPath || meta.historyPath || null;
      meta.historyDocType = normalizedDocType;
      if (!isFacture && "paymentMethod" in meta) delete meta.paymentMethod;
      if (typeof w.syncInvoiceNumberControls === "function") {
        w.syncInvoiceNumberControls({ force: true });
      }
      handleMarkNumber();
      if (typeof w.SEM?.markDocumentDirty === "function") {
        w.SEM.markDocumentDirty(false);
      }
    };

    if (w.electronAPI?.saveInvoiceJSON) {
      try {
        let res = await w.electronAPI.saveInvoiceJSON(savePayload);
        const outOfSequence = res?.reason === "number_out_of_sequence";
        if ((res?.reason === "number_changed" || outOfSequence) && res?.suggestedNumber) {
          const suggestedNumber = String(res.suggestedNumber || "").trim();
          if (suggestedNumber) {
            const activeNumber = String(meta.number || snapMeta.number || "").trim();
            const previewNumber = activeNumber || suggestedNumber;
            const changeMessage = outOfSequence
              ? `Ce numero ne suit pas la sequence.\n` +
                `Le prochain numero disponible est ${suggestedNumber}.\n\n` +
                `Voulez-vous continuer avec ${previewNumber} ?`
              : `Un autre document utilise deja ce numero.\n` +
                `Le nouveau numero sera ${suggestedNumber}.\n\n` +
                "Voulez-vous continuer ?";
            let confirmed = false;
            if (typeof showConfirm === "function") {
              confirmed = await showConfirm(changeMessage, {
                title: outOfSequence ? "Numero hors sequence" : "Numero deja utilise",
                okText: "Continuer",
                cancelText: "Annuler"
              });
            } else if (typeof w.confirm === "function") {
              confirmed = w.confirm(changeMessage);
            }
            if (!confirmed) return false;

            if (!outOfSequence) {
              meta.number = suggestedNumber;
              meta.previewNumber = suggestedNumber;
              snapMeta.number = suggestedNumber;
              snapMeta.previewNumber = suggestedNumber;
              if (snapshot?.meta && typeof snapshot.meta === "object") {
                snapshot.meta.number = suggestedNumber;
                snapshot.meta.previewNumber = suggestedNumber;
              }
              const invNumberInput = getEl("invNumber");
              if (invNumberInput && invNumberInput.value !== suggestedNumber) {
                invNumberInput.value = suggestedNumber;
              }
              const invNumberSuffix = getEl("invNumberSuffix");
              if (invNumberSuffix) {
                const suffixMatch = suggestedNumber.match(/(\d+)\s*$/);
                if (suffixMatch?.[1]) invNumberSuffix.value = suffixMatch[1];
              }
            }

            res = await w.electronAPI.saveInvoiceJSON({
              data: snapshot,
              meta: outOfSequence
                ? { ...savePayload.meta, acceptNumberChange: true, allowProvidedNumber: true }
                : { ...savePayload.meta, number: suggestedNumber, previewNumber: suggestedNumber, acceptNumberChange: true }
            });
          }
        }
        if (res?.ok) {
          const savedNumberRaw = String(res?.number || snapMeta.number || "").trim();
          const savedNumber = savedNumberRaw || snapMeta.number || "";
          const previewNumber = String(res?.previewNumber || snapMeta.previewNumber || "").trim();
          const numberChanged =
            !!res?.numberChanged || (previewNumber && savedNumber && previewNumber !== savedNumber);

          if (savedNumber) {
            snapMeta.number = savedNumber;
            snapMeta.previewNumber = savedNumber;
            meta.number = savedNumber;
            meta.previewNumber = savedNumber;
            if (snapshot?.meta && typeof snapshot.meta === "object") {
              snapshot.meta.number = savedNumber;
              snapshot.meta.previewNumber = savedNumber;
            }
            const invNumberInput = getEl("invNumber");
            if (invNumberInput && invNumberInput.value !== savedNumber) {
              invNumberInput.value = savedNumber;
            }
            const invNumberSuffix = getEl("invNumberSuffix");
            if (invNumberSuffix) {
              const suffixMatch = savedNumber.match(/(\d+)\s*$/);
              if (suffixMatch?.[1]) invNumberSuffix.value = suffixMatch[1];
            }
          }
          await handleHistoryUpdate(res.path, res.name);
          if (numberChanged && savedNumber) {
            await w.showDialog?.(`Number was used by another document; saved as ${savedNumber}`, {
              title: getMessage("GENERIC_INFO").title
            });
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error("convert devis save failed", err);
        return false;
      }
    }

    if (typeof w.saveInvoiceJSON === "function") {
      try {
        await w.saveInvoiceJSON();
        meta.historyDocType = normalizedDocType;
        if (!isFacture && "paymentMethod" in meta) delete meta.paymentMethod;
        if (typeof w.syncInvoiceNumberControls === "function") {
          w.syncInvoiceNumberControls({ force: true });
        }
        handleMarkNumber();
        if (typeof w.SEM?.markDocumentDirty === "function") {
          w.SEM.markDocumentDirty(false);
        }
        return true;
      } catch (err) {
        console.error("convert devis fallback save failed", err);
        return false;
      }
    }

    return false;
  }

  async function convertHistoryEntry(entry, { onClose, sourceDocType, promptOptions } = {}) {
    if (!entry || !entry.path) return false;
    const normalizedSource = String(sourceDocType || "").trim().toLowerCase();
    const entryDocType = String(entry.docType || "").trim().toLowerCase();
    if (entryDocType && normalizedSource && entryDocType !== normalizedSource) return false;
    const choices = await promptDevisConversion(entry, promptOptions);
    if (!choices) return false;
    const resolvedSourceDocType = normalizedSource || entryDocType || "facture";
    let raw = null;
    try {
      raw = await w.openInvoiceFromFilePicker({ path: entry.path, docType: resolvedSourceDocType });
    } catch (err) {
      console.error("convert document open failed", err);
    }
    if (!raw) {
      const sourceLabel =
        typeof w.docTypeLabel === "function" ? w.docTypeLabel(resolvedSourceDocType) : "document";
      const lowerLabel = String(sourceLabel || "document").toLowerCase();
      const isFeminine = ["facture", "fa", "retenue", "avoir"].includes(resolvedSourceDocType);
      const article = isFeminine ? "la" : "le";
      const notFound = getMessage("HISTORY_EXPORT_DOC_LOAD_FAILED", {
        fallbackText: `Impossible de charger ${article} ${lowerLabel}.`
      });
      await w.showDialog?.(notFound.text, { title: notFound.title });
      return false;
    }
    const convertedFrom = getConvertedFromInfo(entry, raw, resolvedSourceDocType);
    let cloned = null;
    try {
      cloned = JSON.parse(JSON.stringify(raw));
    } catch {
      cloned = raw;
    }
    const metaTarget =
      (cloned && typeof cloned === "object" && cloned.data && typeof cloned.data === "object" ? cloned.data.meta : null) ||
      (cloned && typeof cloned === "object" ? cloned.meta : null) ||
      (cloned.data && (cloned.data.meta = {})) ||
      (cloned.meta = {});
    const fallbackTarget = String(promptOptions?.defaultTarget || "facture").trim().toLowerCase();
    const normalizedTarget = String(choices.target || fallbackTarget || "facture").toLowerCase();
    metaTarget.docType = normalizedTarget || "facture";
    if (choices.date) metaTarget.date = choices.date;
    metaTarget.historyPath = null;
    metaTarget.historyDocType = null;
    if (normalizedTarget === "facture") {
      if (choices.paymentMethod) metaTarget.paymentMethod = choices.paymentMethod;
      else if ("paymentMethod" in metaTarget) delete metaTarget.paymentMethod;
      if (choices.paymentReference) {
        metaTarget.paymentReference = choices.paymentReference;
        metaTarget.paymentRef = choices.paymentReference;
      } else {
        if ("paymentReference" in metaTarget) delete metaTarget.paymentReference;
        if ("paymentRef" in metaTarget) delete metaTarget.paymentRef;
      }
    } else {
      if ("paymentMethod" in metaTarget) delete metaTarget.paymentMethod;
      if ("paymentReference" in metaTarget) delete metaTarget.paymentReference;
      if ("paymentRef" in metaTarget) delete metaTarget.paymentRef;
    }
    if (typeof w.mergeInvoiceDataIntoState === "function") {
      try {
        w.mergeInvoiceDataIntoState(cloned);
      } catch (err) {
        console.warn("mergeInvoiceDataIntoState failed", err);
      }
    }
    if (typeof w.SEM?.bind === "function") {
      w.__suppressModelApplyOnce = 2;
      w.SEM.bind();
    }
    forceDocTypeSelection(metaTarget.docType);
    if (choices.date) {
      const dateInput = getEl("invDate");
      if (dateInput) {
        dateInput.value = choices.date;
        try {
          dateInput.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {}
      }
      const st = SEM.state || (SEM.state = {});
      const meta = st.meta || (st.meta = {});
      meta.date = choices.date;
    }
    const targetDocType = String(choices.target || fallbackTarget || "facture").toLowerCase();
    if (choices.model && typeof SEM?.applyModelByName === "function") {
      try {
        await SEM.applyModelByName(choices.model);
      } catch (err) {
        console.warn("apply model on convert failed", err);
      }
      syncModelSelectionUi(choices.model);
    }
    if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
      w.setDocTypeMenuAllowedDocTypes(null);
    }
    forceDocTypeSelection(targetDocType);
    if (typeof SEM?.computeTotals === "function") {
      try {
        SEM.computeTotals();
      } catch {}
    }
    const saved = await saveConvertedDocument(targetDocType, {
      dateOverride: choices.date,
      convertedFrom,
      paymentMethod: choices.paymentMethod,
      paymentReference: choices.paymentReference,
      historyStatus: choices.status,
      paidAmount: choices.paidAmount
    });
    if (!saved) {
      const label = typeof w.docTypeLabel === "function" ? w.docTypeLabel(targetDocType) : "document";
      const isFeminine = ["facture", "retenue", "avoir"].includes(targetDocType);
      const article = isFeminine ? "la" : "le";
      const fallbackText = `Impossible de cr\u00e9er ${article} ${String(label || "document").toLowerCase()}.`;
      const saveError = getMessage("DOCUMENT_SAVE_FAILED", { fallbackText });
      await w.showDialog?.(saveError.text, { title: saveError.title });
    }
    try {
      const st = SEM.state || {};
      const meta = st.meta || {};
      const invNumber = getEl("invNumber")?.value;
      const invDate = getEl("invDate")?.value;
      if (invNumber) meta.number = invNumber;
      if (invDate) meta.date = invDate;
      if (typeof SEM.refreshInvoiceSummary === "function") SEM.refreshInvoiceSummary();
    } catch {}
    if (typeof onClose === "function") onClose();
    return true;
  }

  async function convertDevisEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, { onClose, sourceDocType: "devis" });
  }

  async function convertBlEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, {
      onClose,
      sourceDocType: "bl",
      promptOptions: {
        titleText: "Convertir le bon de livraison",
        targetDocTypes: ["facture"]
      }
    });
  }

  async function convertFactureEntry(entry, { onClose } = {}) {
    return convertHistoryEntry(entry, {
      onClose,
      sourceDocType: "facture",
      promptOptions: {
        titleText: "Convertir le devis",
        targetDocTypes: ["avoir"],
        defaultTarget: "avoir",
        showTargetChoice: true,
        allowedModelDocTypes: ["avoir"]
      }
    });
  }

  AppInit.DocConversion = {
    convertDevisEntry,
    convertBlEntry,
    convertFactureEntry
  };
})(window);
