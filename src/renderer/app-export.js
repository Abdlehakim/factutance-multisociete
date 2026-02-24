// app-export.js (Electron-first, dialog like the screenshot)
(function () {
  const defaultCompanyApiKey = (() => {
    const nameRaw = window.DEFAULT_COMPANY?.name;
    if (typeof nameRaw !== "string") return "";
    const trimmed = nameRaw.trim();
    if (!trimmed) return "";
    const normalized = trimmed
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/[^\w$]+/g, "");
    if (!normalized) return "";
    return /^[A-Za-z_$]/.test(normalized) ? normalized : `_${normalized}`;
  })();
  const API =
    window.electronAPI ||
    (defaultCompanyApiKey ? window[defaultCompanyApiKey] : null) ||
    null;
  const dialogTemplates = window.DialogMessageTemplates || {};
  const dialogStrings = window.DialogMessageStrings || {};
  const getMessage = (key, options = {}) =>
    (typeof window.getAppMessage === "function" && window.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || window.DialogMessages?.defaultTitle || "Information"
    };
  const getEl = (id) =>
    (typeof window.getEl === "function" ? window.getEl(id) : document?.getElementById?.(id));

  // ---- tiny fallbacks if your helpers aren't loaded yet ----
  const _slug = (s) => String(s || "")
    .normalize("NFKD").replace(/[\u0300-\u036F]/g, "")
    .replace(/[^\w.-]+/g, " ").trim().replace(/\s+/g, "-");
  function ensurePdfExt(n)  { n = String(n || "document"); return n.toLowerCase().endsWith(".pdf")  ? n : n + ".pdf"; }
  function docTypeLabel(v) {
    const raw = String(v || "").toLowerCase();
    const aliasMap = {
      bonentree: "be",
      bon_entree: "be",
      "bon-entree": "be",
      "bon entree": "be",
      "bon d'entree": "be",
      "bon d'entr\u00e9e": "be",
      bonsortie: "bs",
      bon_sortie: "bs",
      "bon-sortie": "bs",
      "bon sortie": "bs",
      "bon de sortie": "bs",
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const t = aliasMap[raw] || raw;
    if (t === "be") return "Bon d'entr\u00e9e";
    if (t === "bs") return "Bon de sortie";
    if (t === "avoir") return "Facture d'avoir";
    if (t === "fa") return "Facture d'achat";
    if (t === "devis") return "Devis";
    if (t === "bl")    return "Bon de livraison";
    if (t === "bc")    return "Bon de commande";
    if (t === "retenue") return "Retenue";
    return "Facture";
  }
  function normalizeDocTypeKey(value, fallback = "facture") {
    const raw = String(value || fallback || "facture").trim().toLowerCase();
    const aliasMap = {
      factureachat: "fa",
      facture_achat: "fa",
      "facture-achat": "fa",
      "facture achat": "fa",
      "facture d'achat": "fa",
      "facture dachat": "fa",
      bonentree: "be",
      bon_entree: "be",
      "bon-entree": "be",
      "bon entree": "be",
      "bon d'entree": "be",
      "bon d'entrée": "be",
      bonsortie: "bs",
      bon_sortie: "bs",
      "bon-sortie": "bs",
      "bon sortie": "bs",
      "bon de sortie": "bs",
      factureavoir: "avoir",
      facture_avoir: "avoir",
      "facture-avoir": "avoir",
      "facture avoir": "avoir",
      "facture d'avoir": "avoir",
      "facture davoir": "avoir"
    };
    const normalized = aliasMap[raw] || raw;
    const allowed = new Set(["facture", "fa", "devis", "bl", "bc", "be", "bs", "avoir", "retenue"]);
    return allowed.has(normalized) ? normalized : "facture";
  }
  const FEMININE_DOC_TYPES = new Set(["facture", "fa", "retenue", "avoir"]);
  function resolveDocGrammar(docTypeKey, fallbackName = "") {
    const normalizedType = String(docTypeKey || "").trim().toLowerCase();
    if (normalizedType) {
      const feminine = FEMININE_DOC_TYPES.has(normalizedType);
      return { article: feminine ? "La" : "Le", feminine };
    }
    const normalizedName = String(fallbackName || "").trim().toLowerCase();
    if (normalizedName.startsWith("facture")) return { article: "La", feminine: true };
    if (normalizedName.startsWith("retenue")) return { article: "La", feminine: true };
    if (normalizedName.startsWith("bon d'entr")) return { article: "Le", feminine: false };
    if (normalizedName.startsWith("bon de sortie")) return { article: "Le", feminine: false };
    if (normalizedName.startsWith("devis")) return { article: "Le", feminine: false };
    if (normalizedName.startsWith("bon de livraison")) return { article: "Le", feminine: false };
    if (normalizedName.startsWith("bon de commande")) return { article: "Le", feminine: false };
    return { article: "Le", feminine: false };
  }
  const slugForFile = (window.slugForFile || _slug);
  const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripDocPrefixAndDate = (value, docTypeValue) => {
    const base = String(value || "").trim();
    if (!base) return "";
    const docTypeLower = String(docTypeValue || "").toLowerCase();
    const typeLabel = docTypeLabel(docTypeLower) || "";
    const labelPattern = typeLabel ? new RegExp(`^${escapeRegExp(typeLabel)}[-_\\s]*`, "i") : null;
    const typePattern = docTypeLower ? new RegExp(`^${escapeRegExp(docTypeLower)}[-_\\s]*`, "i") : null;
    let name = base;
    if (labelPattern && labelPattern.test(name)) {
      name = name.replace(labelPattern, "");
    } else if (typePattern && typePattern.test(name)) {
      name = name.replace(typePattern, "");
    }
    name = name.replace(/[-_]\d{4}-\d{2}-\d{2}$/, "");
    return name || base;
  };
  const cleanDocNameForDialog = ({ rawName, docType, fallback } = {}) => {
    const cleaned = stripDocPrefixAndDate(rawName, docType);
    const safeFallback = fallback || rawName || "Document";
    return cleaned || safeFallback;
  };
  function buildCompactBaseName(typeLabel, invNum, dateStr, fallback = "Document") {
    const safeType = String(typeLabel || "").replace(/\s+/g, "");
    const safeNum = String(invNum || "");
    const safeDate = String(dateStr || "");
    const head = safeType + safeNum;
    if (head && safeDate) return `${head}-${safeDate}`;
    if (head) return head;
    if (safeDate) return safeDate;
    return fallback;
  }
  function buildPdfBaseName(invNum, fallback = "Document") {
    const safeNum = String(invNum || "").trim();
    return safeNum || fallback;
  }
  function resolvePdfBaseNameByDocType({ docType, invNum, historyPath, fallback = "Document" } = {}) {
    const normalizedType = String(docType || "").trim().toLowerCase();
    if (normalizedType === "fa") {
      const historyBase = historyPath ? displayFileTitle(historyPath, "") : "";
      const cleaned = String(historyBase || "").trim();
      if (cleaned) return cleaned;
    }
    return buildPdfBaseName(invNum, fallback);
  }
  function buildWithholdingBaseName(typeLabel, invNum) {
    const safeNum = String(invNum || "").trim();
    if (safeNum) return `RS-${safeNum}`;
    const safeLabel = String(typeLabel || "").trim();
    const fallback = safeLabel ? slugForFile(safeLabel) : "Document";
    return `RS-${fallback || "Document"}`;
  }

  function displayFileTitle(rawName, fallback = "Document") {
    const normalized =
      typeof rawName === "string" ? rawName.trim() : rawName == null ? "" : String(rawName);
    if (!normalized) return fallback;
    const slashNormalized = normalized.replace(/\\/g, "/");
    const base = slashNormalized.split("/").pop() || normalized;
    const dotIndex = base.lastIndexOf(".");
    return dotIndex > 0 ? base.slice(0, dotIndex) : base;
  }

  const pickInvoiceData = (raw) =>
    raw && typeof raw === "object"
      ? (raw.data && typeof raw.data === "object" ? raw.data : raw)
      : {};

  function cloneInvoiceData(raw) {
    try {
      return JSON.parse(JSON.stringify(pickInvoiceData(raw) || {}));
    } catch {
      const src = pickInvoiceData(raw) || {};
      return { ...src };
    }
  }

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  function sanitizeModelName(value) {
    return String(value == null ? "" : value).trim();
  }

  function clonePlain(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }
  function hasObjectEntries(value) {
    return !!(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
  }

  function collectModelEntriesFromRuntime() {
    if (typeof window.SEM?.getModelEntries === "function") {
      try {
        const entries = window.SEM.getModelEntries();
        if (Array.isArray(entries)) return entries;
      } catch {}
    }
    const helpers = window.SEM?.__bindingHelpers;
    if (typeof helpers?.getModelList === "function") {
      try {
        const list = helpers.getModelList();
        if (Array.isArray(list)) {
          return list.map((entry) => ({ name: entry?.name, config: entry?.config }));
        }
      } catch {}
    }
    return [];
  }

  async function resolveModelConfigFromDocumentMeta(meta = {}) {
    const modelName = sanitizeModelName(
      meta.documentModelName || meta.docDialogModelName || meta.modelName || meta.modelKey || ""
    );
    if (!modelName) return { modelName: "", config: null };

    const helpers = window.SEM?.__bindingHelpers;
    if (typeof helpers?.ensureModelCache === "function") {
      try {
        await helpers.ensureModelCache();
      } catch (err) {
        console.warn("model cache hydrate for preview failed", err);
      }
    }

    const normalizedTarget = modelName.toLowerCase();
    const runtimeEntry = collectModelEntriesFromRuntime().find(
      (entry) => sanitizeModelName(entry?.name || "").toLowerCase() === normalizedTarget
    );
    if (runtimeEntry?.config && typeof runtimeEntry.config === "object") {
      return {
        modelName: sanitizeModelName(runtimeEntry.name || modelName),
        config: clonePlain(runtimeEntry.config, { ...runtimeEntry.config })
      };
    }

    if (typeof API?.loadModel === "function") {
      try {
        const res = await API.loadModel({ name: modelName });
        const config = res?.model?.config;
        if (res?.ok && config && typeof config === "object") {
          return { modelName, config: clonePlain(config, { ...config }) };
        }
      } catch (err) {
        console.warn("model load for preview failed", err);
      }
    }

    return { modelName, config: null };
  }

  async function hydrateStateWithModelDefaults(stateInput) {
    const st = ensureStateDefaults(stateInput || {});
    const meta = st.meta && typeof st.meta === "object" ? st.meta : (st.meta = {});
    const { modelName, config } = await resolveModelConfigFromDocumentMeta(meta);
    if (!modelName || !config || typeof config !== "object") return st;

    const hasSavedTemplate =
      typeof meta.template === "string" && String(meta.template).trim().length > 0;
    if (hasOwn(config, "template") && !hasSavedTemplate) meta.template = config.template;
    if (hasOwn(config, "itemsHeaderColor")) meta.itemsHeaderColor = config.itemsHeaderColor;
    if (hasOwn(config, "currency")) meta.currency = config.currency;
    if (hasOwn(config, "taxesEnabled")) meta.taxesEnabled = config.taxesEnabled;
    if (hasOwn(config, "numberLength")) meta.numberLength = config.numberLength;
    if (hasOwn(config, "numberFormat")) meta.numberFormat = config.numberFormat;
    if (config.columns && typeof config.columns === "object") {
      const savedModelColumns = hasObjectEntries(meta.modelColumns)
        ? clonePlain(meta.modelColumns, { ...meta.modelColumns })
        : null;
      const savedColumns = hasObjectEntries(meta.columns)
        ? clonePlain(meta.columns, { ...meta.columns })
        : null;
      if (savedModelColumns || savedColumns) {
        const preferredColumns = savedModelColumns || savedColumns;
        meta.modelColumns = clonePlain(preferredColumns, { ...(preferredColumns || {}) });
        meta.columns = clonePlain(savedColumns || preferredColumns, { ...(savedColumns || preferredColumns || {}) });
      } else {
        const modelColumns = clonePlain(config.columns, { ...config.columns });
        meta.columns = modelColumns;
        meta.modelColumns = clonePlain(modelColumns, { ...modelColumns });
      }
    }
    if (config.addForm && typeof config.addForm === "object") {
      meta.addForm = clonePlain(config.addForm, { ...config.addForm });
    }
    if (config.withholding && typeof config.withholding === "object") {
      meta.withholding = clonePlain(config.withholding, { ...config.withholding });
    }
    if (config.acompte && typeof config.acompte === "object") {
      meta.acompte = clonePlain(config.acompte, { ...config.acompte });
    }
    if (config.financing && typeof config.financing === "object") {
      meta.financing = clonePlain(config.financing, { ...config.financing });
    }

    let extrasOverridden = false;
    const extras = meta.extras && typeof meta.extras === "object" ? { ...meta.extras } : {};
    if (config.pdf && typeof config.pdf === "object") {
      extras.pdf = clonePlain(config.pdf, { ...config.pdf });
      extrasOverridden = true;
    }
    if (config.shipping && typeof config.shipping === "object") {
      extras.shipping = clonePlain(config.shipping, { ...config.shipping });
      extrasOverridden = true;
    }
    if (config.dossier && typeof config.dossier === "object") {
      extras.dossier = clonePlain(config.dossier, { ...config.dossier });
      extrasOverridden = true;
    }
    if (config.deplacement && typeof config.deplacement === "object") {
      extras.deplacement = clonePlain(config.deplacement, { ...config.deplacement });
      extrasOverridden = true;
    }
    if (config.stamp && typeof config.stamp === "object") {
      extras.stamp = clonePlain(config.stamp, { ...config.stamp });
      extrasOverridden = true;
    }
    if (extrasOverridden) meta.extras = extras;
    meta.documentModelName = modelName;
    meta.docDialogModelName = modelName;
    meta.modelName = modelName;
    meta.modelKey = modelName;
    return st;
  }

  function ensureStateDefaults(target = {}) {
    const st = target && typeof target === "object" ? target : {};
    const semState = window.SEM?.state || {};
    if (!Array.isArray(st.items)) st.items = [];
    if (typeof st.meta !== "object" || !st.meta) st.meta = {};
    if (typeof st.company !== "object" || !st.company) st.company = {};
    if (typeof st.client !== "object" || !st.client) st.client = {};
    if (typeof st.notes !== "string") st.notes = st.notes == null ? "" : String(st.notes);
    if (!st.clientFieldVisibility || typeof st.clientFieldVisibility !== "object") {
      st.clientFieldVisibility =
        semState.clientFieldVisibility || window.DEFAULT_CLIENT_FIELD_VISIBILITY || {};
    }
    if (!st.clientFieldLabels || typeof st.clientFieldLabels !== "object") {
      st.clientFieldLabels =
        semState.clientFieldLabels || window.DEFAULT_CLIENT_FIELD_LABELS || {};
    }
    if (typeof st.meta.extras !== "object" || !st.meta.extras) {
      st.meta.extras = { shipping: {}, dossier: {}, deplacement: {}, stamp: {} };
    } else {
      st.meta.extras.shipping = st.meta.extras.shipping || {};
      st.meta.extras.dossier = st.meta.extras.dossier || {};
      st.meta.extras.deplacement = st.meta.extras.deplacement || {};
      st.meta.extras.stamp = st.meta.extras.stamp || {};
    }
    if (typeof st.meta.addForm !== "object" || !st.meta.addForm) st.meta.addForm = {};
    if (typeof st.meta.addForm.fodec !== "object" || !st.meta.addForm.fodec) {
      st.meta.addForm.fodec = { enabled: false, label: "FODEC", rate: 1, tva: 19 };
    }
    return st;
  }

  function computeTotalsForSnapshot(snapshot, fallbackTotals = null) {
    const sem = window.SEM;
    if (!sem || typeof sem.computeTotalsReturn !== "function") return fallbackTotals;
    const originalState = sem.state;
    if (originalState === snapshot) {
      return sem.computeTotalsReturn();
    }
    let totals = fallbackTotals || null;
    try {
      sem.state = snapshot;
      totals = sem.computeTotalsReturn();
    } catch (err) {
      console.warn("computeTotalsForSnapshot failed", err);
    } finally {
      if (sem.state !== originalState) sem.state = originalState;
    }
    return totals;
  }

  function captureHistorySummary() {
    try {
      const st = window.SEM?.state || {};
      const clientName = String(st.client?.name || "").trim();
      const clientAccount = String(st.client?.account || st.client?.accountOf || "").trim();
      const totalsFn = window.SEM?.computeTotalsReturn;
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
  }

  // Prefer OS viewer (Electron), else open in browser tab
  const openPDF = async (resOrUrl) => {
    if (!resOrUrl) return;
    // If an export result object was passed
    if (typeof resOrUrl === "object") {
      const p = resOrUrl.path || null;
      const u = resOrUrl.url  || (p ? `file://${String(p).replace(/\\/g, "/")}` : null);
      // Electron-first
      if (API?.openPath && p) {
        try { await API.openPath(p); return; } catch {}
      }
      // Fallback to URL
      if (u) {
        const a = document.createElement("a");
        a.href = u; a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      }
      return;
    }
    // If a plain URL/path was passed
    const urlOrPath = String(resOrUrl);
    if (API?.openExternal && /^https?:|^file:/i.test(urlOrPath)) {
      try { await API.openExternal(urlOrPath); return; } catch {}
    }
    const a = document.createElement("a");
    a.href = urlOrPath; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };

  async function confirmOverwritePrompt(name, docTypeKey) {
    const displayName = displayFileTitle(name);
    const cleanDisplayName = cleanDocNameForDialog({
      rawName: displayName,
      docType: docTypeKey,
      fallback: displayName || "document"
    });
    const safeDisplayName = cleanDisplayName || "document";
    const grammar = resolveDocGrammar(docTypeKey, safeDisplayName);
    const article = grammar.article;
    const feminine = grammar.feminine;
    const pronoun = feminine ? "Elle" : "Il";
    const overwriteNotice = `${pronoun} sera remplace${feminine ? "e" : ""} par la nouvelle version si vous continuez.`;
    const template =
      typeof dialogTemplates.fileExistsWarning === "function"
        ? dialogTemplates.fileExistsWarning({
            article,
            filename: safeDisplayName,
            noticeText: overwriteNotice,
            noticeValues: { pronoun, feminineSuffix: feminine ? "e" : "" }
          })
        : null;
    const message = template?.text || `${article} ${safeDisplayName} existe deja.\n\n${overwriteNotice}`;
    if (typeof showConfirm === "function") {
      return !!(await showConfirm(message, {
        title: "Fichier existant",
        okText: "Remplacer",
        cancelText: "Annuler",
        renderMessage:
          template?.renderMessage ||
          ((container) => {
            container.innerHTML = "";
            const firstLine = document.createElement("p");
            firstLine.append(`${article} `);
            const highlighted = document.createElement("strong");
            highlighted.className = "swbDialogMsg__filename";
            highlighted.textContent = safeDisplayName;
            firstLine.appendChild(highlighted);
            firstLine.append(" existe deja.");
            const secondLine = document.createElement("p");
            secondLine.textContent = overwriteNotice;
            container.appendChild(firstLine);
            container.appendChild(secondLine);
          })
      }));
    }
    if (typeof window.confirm === "function") return window.confirm(message);
    return false;
  }

  async function confirmOverwriteAllPrompt(docTypeKey) {
    const message =
      "Un ou plusieurs fichiers PDF exportes existent deja.\n\n" +
      "Ils seront remplaces par les nouvelles versions si vous continuez.";
    if (typeof showConfirm === "function") {
      return !!(await showConfirm(message, {
        title: "Fichiers existants",
        okText: "Tout remplacer",
        cancelText: "Annuler"
      }));
    }
    if (typeof window.confirm === "function") return window.confirm(message);
    return false;
  }

  async function exportWithOverwrite(payload, fallbackName, overwritePolicy = null) {
    if (!API?.exportPDFFromHTML) return null;
    const initial = await API.exportPDFFromHTML(payload);
    if (initial?.reason === "exists") {
      const displayName = initial.name || fallbackName || payload?.meta?.filename || "Document.pdf";
      const sharedPolicy = overwritePolicy && typeof overwritePolicy === "object" ? overwritePolicy : null;
      let confirmed = false;
      if (sharedPolicy?.askOnce === true) {
        if (sharedPolicy.replaceAll === true) {
          confirmed = true;
        } else if (sharedPolicy.replaceAll === false) {
          confirmed = false;
        } else {
          confirmed = await confirmOverwriteAllPrompt(payload?.meta?.docType);
          sharedPolicy.replaceAll = !!confirmed;
        }
      } else {
        confirmed = await confirmOverwritePrompt(displayName, payload?.meta?.docType);
      }
      if (!confirmed) return { ok: false, canceled: true };
      const retryPayload = {
        ...payload,
        meta: { ...(payload.meta || {}), forceOverwrite: true }
      };
      return await API.exportPDFFromHTML(retryPayload);
    }
    return initial;
  }

  async function saveInvoiceJSON() {
    if (window.SEM?.readInputs) window.SEM.readInputs(); else if (typeof readInputs === "function") readInputs();

    const snapshot = (window.SEM?.captureForm
      ? window.SEM.captureForm({ includeCompany: true })
      : (typeof captureForm === "function" ? captureForm({ includeCompany: true }) : (window.SEM?.state || {})));

    const st = (window.SEM?.state || window.state || {});
    const typeLbl = docTypeLabel(st?.meta?.docType);
    const invRaw  = String(st?.meta?.number || "").trim();
    const invNum  = invRaw ? slugForFile(invRaw) : "";
    const dateStr = slugForFile(st?.meta?.date || new Date().toISOString().slice(0, 10));
    // Electron path
    if (API?.saveInvoiceJSON) {
      try {
        let res = await API.saveInvoiceJSON({ data: snapshot, meta: snapshot.meta || {} });
        const outOfSequence = res?.reason === "number_out_of_sequence";
        if ((res?.reason === "number_changed" || outOfSequence) && res?.suggestedNumber) {
          const suggestedNumber = String(res.suggestedNumber || "").trim();
          if (suggestedNumber) {
            const activeNumber = String(snapshot?.meta?.number || st?.meta?.number || "").trim();
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
            } else if (typeof window.confirm === "function") {
              confirmed = window.confirm(changeMessage);
            }
            if (!confirmed) return;

            if (!outOfSequence) {
              if (snapshot?.meta && typeof snapshot.meta === "object") {
                snapshot.meta.number = suggestedNumber;
                snapshot.meta.previewNumber = suggestedNumber;
              }
              if (st.meta && typeof st.meta === "object") {
                st.meta.number = suggestedNumber;
                st.meta.previewNumber = suggestedNumber;
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

            res = await API.saveInvoiceJSON({
              data: snapshot,
              meta: outOfSequence
                ? { ...(snapshot.meta || {}), acceptNumberChange: true, allowProvidedNumber: true }
                : { ...(snapshot.meta || {}), acceptNumberChange: true }
            });
          }
        }
        if (res?.ok && res.path) {
          invalidatePdfPreviewCache({ closeModal: true });
          const metaInfo = (snapshot && typeof snapshot.meta === "object") ? snapshot.meta : (st.meta || {});
          const savedNumberRaw = String(res?.number || metaInfo?.number || "").trim();
          const savedNumber = savedNumberRaw || metaInfo?.number || "";
          const previewNumber =
            String(res?.previewNumber || metaInfo?.previewNumber || "").trim();
          const numberChanged =
            !!res?.numberChanged || (previewNumber && savedNumber && previewNumber !== savedNumber);

          if (savedNumber) {
            metaInfo.number = savedNumber;
            metaInfo.previewNumber = savedNumber;
            if (snapshot?.meta && typeof snapshot.meta === "object") {
              snapshot.meta.number = savedNumber;
              snapshot.meta.previewNumber = savedNumber;
            }
            if (st.meta && typeof st.meta === "object") {
              st.meta.number = savedNumber;
              st.meta.previewNumber = savedNumber;
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
          const historySummary = captureHistorySummary();
          if (typeof window.addDocumentHistory === "function") {
            try {
              window.addDocumentHistory({
                docType: metaInfo?.docType,
                number: savedNumber || metaInfo?.number,
                date: metaInfo?.date,
                path: res.path,
                name: res.name,
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
                hasComment: !!String(metaInfo?.noteInterne || "").trim(),
                convertedFrom: metaInfo?.convertedFrom
              });
            } catch (historyErr) {
              console.warn("document history update failed", historyErr);
            }
          }
          if (res?.path && typeof window.updateDocumentHistoryComment === "function") {
            const historyDocType = String(metaInfo?.docType || "facture").toLowerCase();
            window.updateDocumentHistoryComment(historyDocType, res.path, metaInfo?.noteInterne ?? "");
          }
          try {
            if (st.meta) {
              const normalizedType = String(metaInfo?.docType || st.meta.docType || "facture").toLowerCase();
              st.meta.historyPath = res.path;
              st.meta.historyDocType = normalizedType;
              if (normalizedType === "facture" && typeof window.getDocumentHistoryEntry === "function") {
                const savedEntry = window.getDocumentHistoryEntry(normalizedType, res.path);
                if (savedEntry?.status) st.meta.status = savedEntry.status;
              } else if (normalizedType !== "facture" && "status" in st.meta) {
                delete st.meta.status;
              }
              if ("historyStatus" in st.meta) delete st.meta.historyStatus;
            }
          } catch (metaErr) {
            console.warn("history meta sync failed", metaErr);
          }
          const saveMessage = getMessage("DOCUMENT_SAVE_SUCCESS", { values: { path: res.path || "" } });
          const numberNotice = numberChanged && savedNumber
            ? `Number was used by another document; saved as ${savedNumber}`
            : "";
          const finalMessage = numberNotice ? `${saveMessage.text}\n\n${numberNotice}` : saveMessage.text;
          await showDialog?.(finalMessage, { title: saveMessage.title });
        } else {
          const canceledMessage = getMessage("DOCUMENT_SAVE_CANCELED");
          await showDialog?.(canceledMessage.text, { title: canceledMessage.title });
        }
        return;
      } catch {}
    }
    const missingMessage = getMessage("DOCUMENT_SAVE_UNAVAILABLE", {
      fallbackText: "Enregistrement indisponible.",
      fallbackTitle: "Enregistrement"
    });
    await showDialog?.(missingMessage.text, { title: missingMessage.title });
  }

  async function openInvoiceFromFilePicker(options = {}) {
    if (options?.path && !API?.openInvoiceJSON) {
      console.warn("Chargement direct par chemin indisponible hors application desktop.");
      return null;
    }
    if (API?.openInvoiceJSON) {
      const resolveDocNumberFromPath = (pathValue) => {
        if (!pathValue || typeof pathValue !== "string") return "";
        const sqlitePrefix = "sqlite://documents/";
        if (pathValue.startsWith(sqlitePrefix)) {
          return pathValue.slice(sqlitePrefix.length);
        }
        const normalized = pathValue.replace(/\\/g, "/");
        const base = normalized.split("/").filter(Boolean).pop() || "";
        const dot = base.lastIndexOf(".");
        return dot > 0 ? base.slice(0, dot) : base;
      };
      const directNumber = String(options?.number || options?.docNumber || "").trim();
      const pathNumber = resolveDocNumberFromPath(options?.path);
      const number = directNumber || pathNumber;
      return await API.openInvoiceJSON({ ...options, number });
    }
    const missingMessage = getMessage("DOCUMENT_OPEN_UNAVAILABLE", {
      fallbackText: "Ouverture indisponible.",
      fallbackTitle: "Ouverture"
    });
    await showDialog?.(missingMessage.text, { title: missingMessage.title });
    return null;
  }

  function mergeInvoiceDataIntoState(data, options = {}) {
    if (!data || typeof data !== "object") return;
    const srcLevel1 = data.data && typeof data.data === "object" ? data.data : data;
    const src = srcLevel1 && typeof srcLevel1 === "object" && srcLevel1.data && typeof srcLevel1.data === "object"
      ? srcLevel1.data
      : srcLevel1;
    const st = (window.SEM?.state || window.state || {});
    const incomingCompany = src.company && typeof src.company === "object" ? src.company : null;
    const existingCompany = st.company && typeof st.company === "object" ? st.company : {};
    const existingCompanyName = existingCompany.name;
    // Keep already-loaded company info (notably the displayed name) from being overwritten by the document.
    st.company = { ...(incomingCompany || {}), ...existingCompany };
    st.company.name = existingCompanyName;
    if (src.client && typeof src.client === "object") {
      st.client = { ...(st.client || {}), ...src.client };
      const normalizedPath =
        typeof src.client.__path === "string"
          ? src.client.__path
          : typeof src.client.path === "string"
            ? src.client.path
            : st.client.__path;
      st.client.__path = normalizedPath ? String(normalizedPath) : "";
    } else {
      st.client = { ...(st.client || {}) };
      if (typeof st.client.__path !== "string") st.client.__path = "";
    }
    if (src.meta) {
      const cur = st.meta || {};
        const incoming = src.meta;
        const mergedWH = { ...(cur.withholding || {}), ...(incoming.withholding || {}) };
      const cx = cur.extras || {}, ix = incoming.extras || {};
      const currentPdf = cx.pdf && typeof cx.pdf === "object" ? cx.pdf : {};
      const incomingPdfLegacy = incoming.pdf && typeof incoming.pdf === "object" ? incoming.pdf : {};
      const incomingPdf = ix.pdf && typeof ix.pdf === "object" ? ix.pdf : {};
      const mergedExtras = {
        pdf: { ...currentPdf, ...incomingPdfLegacy, ...incomingPdf },
        shipping: { ...(cx.shipping || {}), ...(ix.shipping || {}) },
        dossier: { ...(cx.dossier || {}), ...(ix.dossier || {}) },
        deplacement: { ...(cx.deplacement || {}), ...(ix.deplacement || {}) },
        stamp:    { ...(cx.stamp    || {}), ...(ix.stamp    || {}) }
      };
      const mergedAddForm = { ...(cur.addForm || {}), ...(incoming.addForm || {}) };
      const currentFodec = cur.addForm?.fodec || cur.extras?.fodec || {};
      const incomingFodec = incoming.addForm?.fodec || incoming.extras?.fodec || {};
      const currentRate = Number(currentFodec.rate);
      const incomingRate = Number(incomingFodec.rate);
      const currentTva = Number(currentFodec.tva);
      const incomingTva = Number(incomingFodec.tva);
      mergedAddForm.fodec = {
        enabled: !!(incomingFodec.enabled ?? currentFodec.enabled),
        label: incomingFodec.label || currentFodec.label || "FODEC",
        rate: Number.isFinite(incomingRate) ? incomingRate : (Number.isFinite(currentRate) ? currentRate : 1),
        tva: Number.isFinite(incomingTva) ? incomingTva : (Number.isFinite(currentTva) ? currentTva : 19)
      };
      const incomingNoteInterne =
        Object.prototype.hasOwnProperty.call(incoming, "noteInterne") ? incoming.noteInterne : "";
      const normalizedNoteInterne =
        typeof incomingNoteInterne === "string"
          ? incomingNoteInterne
          : (incomingNoteInterne == null ? "" : String(incomingNoteInterne));
        st.meta = {
          ...cur,
          ...incoming,
          withholding: mergedWH,
          extras: mergedExtras,
          addForm: mergedAddForm,
          noteInterne: normalizedNoteInterne
        };
        if (!Object.prototype.hasOwnProperty.call(incoming, "documentModelName")) {
          const fallbackDocumentModelName =
            typeof incoming.docDialogModelName === "string"
              ? incoming.docDialogModelName
              : typeof incoming.modelName === "string"
                ? incoming.modelName
                : typeof incoming.modelKey === "string"
                  ? incoming.modelKey
                  : "";
          st.meta.documentModelName = String(fallbackDocumentModelName || "").trim();
        }
        if (!Object.prototype.hasOwnProperty.call(incoming, "docDialogModelName")) {
          st.meta.docDialogModelName = String(st.meta.documentModelName || "").trim();
        }
        const mergedModelName = String(st.meta.documentModelName || "").trim();
        if (mergedModelName) {
          if (!Object.prototype.hasOwnProperty.call(incoming, "modelName")) {
            st.meta.modelName = mergedModelName;
          }
          if (!Object.prototype.hasOwnProperty.call(incoming, "modelKey")) {
            st.meta.modelKey = mergedModelName;
          }
        }
        const normalizeReglementFromMeta = (metaObj = {}) => {
          const fromReglementObj =
            metaObj.reglement && typeof metaObj.reglement === "object" ? metaObj.reglement : {};
          const reglementEnabled =
            typeof fromReglementObj.enabled === "boolean"
              ? fromReglementObj.enabled
              : typeof metaObj.reglementEnabled === "boolean"
                ? metaObj.reglementEnabled
                : Boolean(metaObj.reglementText || metaObj.reglementValue || metaObj.reglement);
          const typeRaw =
            typeof fromReglementObj.type === "string"
              ? fromReglementObj.type
              : typeof metaObj.reglementType === "string"
                ? metaObj.reglementType
                : metaObj.reglementText && (metaObj.reglementText || "").includes("jours")
                  ? "days"
                  : "reception";
          const normalizedType = String(typeRaw || "reception").trim().toLowerCase() === "days" ? "days" : "reception";
          const daysCandidate =
            typeof fromReglementObj.days !== "undefined"
              ? fromReglementObj.days
              : typeof metaObj.reglementDays !== "undefined"
                ? metaObj.reglementDays
                : null;
          const parsedDays = Number.isFinite(Number(daysCandidate)) ? Math.max(0, Math.trunc(Number(daysCandidate))) : null;
          const textFromObj =
            typeof fromReglementObj.valueText === "string"
              ? fromReglementObj.valueText
              : typeof fromReglementObj.text === "string"
                ? fromReglementObj.text
                : typeof metaObj.reglementText === "string"
                  ? metaObj.reglementText
                  : typeof metaObj.reglementValue === "string"
                    ? metaObj.reglementValue
                    : "";
          const textFromDays =
            parsedDays !== null ? `${parsedDays} jours` : normalizedType === "days" ? "" : "A réception";
          const resolvedText =
            textFromObj?.trim() ||
            (normalizedType === "days" ? textFromDays || "A réception" : "A réception");
          return {
            enabled: reglementEnabled,
            type: normalizedType,
            days: parsedDays,
            valueText: resolvedText,
            text: resolvedText
          };
        };
        const normalizedReglement = normalizeReglementFromMeta(st.meta);
        st.meta.reglement = normalizedReglement;
        st.meta.reglementEnabled = normalizedReglement.enabled;
        st.meta.reglementType = normalizedReglement.type;
        st.meta.reglementDays = normalizedReglement.days;
    }
    if (Array.isArray(src.items)) {
      const hintedDocType = normalizeDocTypeKey(
        options?.docType ||
          options?.docTypeHint ||
          src?.meta?.docType ||
          st.meta?.docType ||
          "facture"
      );
      const isPurchaseDoc = hintedDocType === "fa";
      const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
      const parseLooseNumber = (value) => {
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (value === undefined || value === null) return null;

        const raw = String(value).replace(/\u00A0/g, " ").trim();
        if (!raw) return null;

        const wrappedNegative = /^\(.*\)$/.test(raw);
        const unwrapped = wrappedNegative ? raw.slice(1, -1) : raw;
        const cleaned = unwrapped.replace(/[^0-9,.\-+]/g, "");
        if (!cleaned || !/[0-9]/.test(cleaned)) return null;

        const sign = wrappedNegative || cleaned.trim().startsWith("-") ? -1 : 1;
        const unsigned = cleaned.replace(/[+\-]/g, "");
        if (!unsigned || !/[0-9]/.test(unsigned)) return null;

        const commaCount = (unsigned.match(/,/g) || []).length;
        const dotCount = (unsigned.match(/\./g) || []).length;
        const lastComma = unsigned.lastIndexOf(",");
        const lastDot = unsigned.lastIndexOf(".");
        let decimalSep = "";
        if (commaCount > 0 && dotCount > 0) {
          decimalSep = lastComma > lastDot ? "," : ".";
        } else if (commaCount === 1 && dotCount === 0) {
          decimalSep = ",";
        } else if (dotCount === 1 && commaCount === 0) {
          decimalSep = ".";
        }

        let normalized = "";
        if (decimalSep) {
          const sepIndex = unsigned.lastIndexOf(decimalSep);
          const intPart = unsigned.slice(0, sepIndex).replace(/[.,]/g, "");
          const fracPart = unsigned.slice(sepIndex + 1).replace(/[.,]/g, "");
          normalized = fracPart ? `${intPart || "0"}.${fracPart}` : (intPart || "0");
        } else {
          normalized = unsigned.replace(/[.,]/g, "");
        }
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed)) return null;
        return sign * parsed;
      };
      const toNumber = (value, fallback = 0) => {
        const num = parseLooseNumber(value);
        return Number.isFinite(num) ? num : fallback;
      };
      const pickFirstValue = (source, keys = []) => {
        const target = source && typeof source === "object" ? source : {};
        for (const key of keys) {
          if (hasValue(target?.[key])) return target[key];
        }
        return undefined;
      };
      st.items = src.items.map((entry) => {
        const source = entry && typeof entry === "object" ? entry : {};
        const priceSource = pickFirstValue(source, [
          "price",
          "unitPrice",
          "unit_price",
          "pu",
          "puHt",
          "pu_ht",
          "prixUnitaire",
          "prix_unitaire"
        ]);
        const tvaSource = pickFirstValue(source, [
          "tva",
          "vat",
          "tax",
          "taxRate",
          "tax_rate",
          "tvaRate",
          "tva_rate"
        ]);
        const purchasePriceSource = pickFirstValue(source, [
          "purchasePrice",
          "purchase_price",
          "buyPrice",
          "buy_price",
          "prixAchat",
          "prix_achat",
          "purchaseHt",
          "purchase_ht",
          "puAchat",
          "pu_achat",
          "puAchatHt",
          "pu_achat_ht",
          "puAHt",
          "pu_a_ht"
        ]);
        const purchaseTvaSource = pickFirstValue(source, [
          "purchaseTva",
          "purchase_tva",
          "purchaseVat",
          "purchase_vat",
          "buyTva",
          "buy_tva",
          "tvaAchat",
          "tva_achat",
          "purchaseTax",
          "purchase_tax"
        ]);
        const qtySource = pickFirstValue(source, ["qty", "quantity", "qte", "quantite"]);
        const discountSource = pickFirstValue(source, [
          "discount",
          "discountPct",
          "discount_pct",
          "discountRate",
          "discount_rate",
          "remise"
        ]);
        const price = hasValue(priceSource) ? toNumber(priceSource, 0) : 0;
        const tva = hasValue(tvaSource) ? toNumber(tvaSource, 0) : 0;
        const qty = hasValue(qtySource) ? toNumber(qtySource, 0) : toNumber(source.qty, 0);
        const discount = hasValue(discountSource)
          ? toNumber(discountSource, 0)
          : toNumber(source.discount, 0);
        const purchasePriceRaw = hasValue(purchasePriceSource)
          ? toNumber(purchasePriceSource, 0)
          : (isPurchaseDoc ? price : 0);
        const purchaseTvaRaw = hasValue(purchaseTvaSource)
          ? toNumber(purchaseTvaSource, 0)
          : (isPurchaseDoc ? tva : 0);
        const purchasePrice =
          isPurchaseDoc && purchasePriceRaw === 0 && price !== 0
            ? price
            : purchasePriceRaw;
        const purchaseTva =
          isPurchaseDoc && purchaseTvaRaw === 0 && tva !== 0
            ? tva
            : purchaseTvaRaw;
        return {
          ...source,
          qty,
          discount,
          price,
          tva,
          purchasePrice,
          purchaseTva
        };
      });
    }
    if (typeof src.notes === "string") st.notes = src.notes;
  }

  async function exportStateSnapshot(
    stateInput,
    {
      totalsSnapshot,
      historyPath,
      historyDocType,
      suppressPrompt = false,
      openAfterExport = false,
      overwritePolicy = null
    } = {}
  ) {
    const st = ensureStateDefaults(stateInput || {});
    const docTypeKey = (String(st.meta?.docType || "").trim().toLowerCase()) || "facture";
    const resolvedHistoryPath = historyPath || st.meta?.historyPath || "";
    const resolvedHistoryDocType =
      String(historyDocType || st.meta?.historyDocType || docTypeKey).trim().toLowerCase() || docTypeKey;
    const persistPdfPath = (pdfPath) => {
      if (!pdfPath || !resolvedHistoryPath) return;
      if (typeof window.setDocumentHistoryPdfPath === "function") {
        try {
          window.setDocumentHistoryPdfPath(resolvedHistoryDocType, resolvedHistoryPath, pdfPath);
        } catch (err) {
          console.warn("setDocumentHistoryPdfPath failed", err);
        }
      }
    };
    const buildResult = (overrides = {}) => ({
      ok: false,
      canceled: false,
      invoicePath: null,
      invoiceName: null,
      docType: docTypeKey,
      historyPath: resolvedHistoryPath || null,
      historyDocType: resolvedHistoryDocType,
      hasWithholdingCertificate: false,
      withholdingPath: null,
      ...overrides
    });

    const assets = API?.assets || {};
    const htmlInv = window.PDFView.build(st, assets);
    const cssInv  = window.PDFView.css;

    const typeLbl = docTypeLabel(st.meta?.docType);
    const invRaw  = String(st.meta?.number || "").trim();
    const invNum  = invRaw ? slugForFile(invRaw) : "";
    const base = resolvePdfBaseNameByDocType({
      docType: docTypeKey,
      invNum,
      historyPath: resolvedHistoryPath,
      fallback: "Document"
    });
    const fileName = ensurePdfExt(base);

    const clientName = String(st.client?.name || "").trim();
    const clientVat = String(st.client?.vat || "").trim();
    const invoicePayload = {
      html: htmlInv,
      css:  cssInv,
      meta: {
        number: st.meta?.number,
        docType: st.meta?.docType,
        filename: fileName,
        date: st.meta?.date,
        clientName,
        clientVat,
        silent: true,
        to: "pdf",
        deferOpen: true
      }
    };
    const resInv = await exportWithOverwrite(invoicePayload, fileName, overwritePolicy);
    if (resInv && resInv.ok === false) {
      if (resInv.canceled) return buildResult({ canceled: true });
      const pdfError = getMessage("PDF_EXPORT_FAILED");
      await showDialog?.(resInv.error || pdfError.text, { title: pdfError.title });
      return buildResult();
    }

    // Optionally export withholding certificate (from pdfWH.js)
    let resWH = null;
    const totalsSnapshotResolved = totalsSnapshot || computeTotalsForSnapshot(st, null);
    const whAmountComputed = totalsSnapshotResolved?.whAmount ?? 0;
    if (st.meta?.withholding?.enabled && whAmountComputed > 0 && window.PDFWH) {
      const htmlWH = window.PDFWH.build(st, assets);
      const cssWH  = window.PDFWH.css;
      const baseWH = ensurePdfExt(buildWithholdingBaseName(typeLbl, invNum));
      const resCert = await exportWithOverwrite({
        html: htmlWH,
        css:  cssWH,
        meta: {
          number: st.meta?.number,
          docType: "retenue",
          filename: baseWH,
          date: st.meta?.date,
          withholdingDocType: st.meta?.docType,
          silent: true,
          to: "pdf",
          deferOpen: true
        }
      }, baseWH, overwritePolicy);
      if (resCert?.ok) resWH = resCert;
      else if (resCert && !resCert.canceled) {
        const certificateError = getMessage("WITHHOLDING_EXPORT_FAILED");
        await showDialog?.(resCert.error || certificateError.text, { title: certificateError.title });
      }
    }

    const invLabel = cleanDocNameForDialog({
      rawName: displayFileTitle(resInv?.name || fileName),
      docType: docTypeKey,
      fallback: displayFileTitle(resInv?.name || fileName)
    });
    const hasWithholdingCertificate = !!(resWH && whAmountComputed > 0);
    const whLabel  = hasWithholdingCertificate
      ? displayFileTitle(resWH?.name || "Retenue la source.pdf")
      : null;

    const grammar = resolveDocGrammar(docTypeKey, invLabel);
    const docPrefix = grammar.article;
    const readyText = (isFeminine = false) =>
      (isFeminine ? dialogStrings.exportReadyFeminine : dialogStrings.exportReadyMasculine) ||
      (isFeminine ? "a ete exportee et peut maintenant etre ouverte." : "a ete exporte et peut maintenant etre ouvert.");
    const docSummaries = [
      {
        prefix: docPrefix,
        name: invLabel,
        feminine: grammar.feminine
      }
    ];
    if (whLabel) {
      docSummaries.push({
        prefix: "Le certificat",
        name: whLabel,
        feminine: false
      });
    }

    const summaryEntries = docSummaries.map((doc) => ({
      prefix: doc.prefix,
      name: doc.name,
      suffix: readyText(doc.feminine)
    }));

    const summaryTemplate =
      typeof dialogTemplates.documentReadySummary === "function"
        ? dialogTemplates.documentReadySummary({ entries: summaryEntries })
        : null;
    const msg =
      summaryTemplate?.text ||
      summaryEntries
        .map((entry) => {
          const safeName = entry.name || "document";
          return `${entry.prefix} ${safeName} ${entry.suffix}`.trim();
        })
        .join("\n\n");

    const okBtnText = (() => {
      const t = docTypeKey;
      if (t === "facture") return "Ouvrir la facture";
      if (t === "fa")      return "Ouvrir la facture d'achat";
      if (t === "devis")   return "Ouvrir le devis";
      if (t === "bl")      return "Ouvrir le bon de livraison";
      if (t === "bc")      return "Ouvrir le bon de commande";
      return "Ouvrir le document";
    })();

    persistPdfPath(resInv?.path);

    if (!suppressPrompt) {
      await showConfirm?.(msg, {
        title: "Ouvrir les documents",
        okText: okBtnText,
        cancelText: "Fermer",
        okKeepsOpen: true,
        renderMessage:
          summaryTemplate?.renderMessage ||
          ((container) => {
            container.innerHTML = "";
            summaryEntries.forEach((entry) => {
              const line = document.createElement("p");
              if (entry.prefix) line.append(`${entry.prefix} `);
              const strong = document.createElement("strong");
              strong.className = "swbDialogMsg__filename";
              strong.textContent =
                cleanDocNameForDialog({
                  rawName: entry.name,
                  docType: docTypeKey,
                  fallback: entry.name
                }) || "";
              line.appendChild(strong);
              if (entry.suffix) line.append(` ${entry.suffix}`);
              container.appendChild(line);
            });
          }),
        // This button opens the certificate generated by pdfWH.js
        extra: hasWithholdingCertificate ? {
          text: "Ouvrir le certificat",
          onClick: () => { try { openPDF(resWH); } catch {} }
        } : undefined,
        onOk: () => { try { openPDF(resInv); } catch {} }
      });
    } else if (openAfterExport) {
      try {
        openPDF(resInv);
      } catch {}
    }

    return buildResult({
      ok: !!resInv?.ok,
      canceled: !!resInv?.canceled,
      invoicePath: resInv?.path || null,
      invoiceName: resInv?.name || null,
      hasWithholdingCertificate,
      withholdingPath: resWH?.path || null
    });
  }

  async function onOpenInvoiceClick(options = {}) {
    const raw = await openInvoiceFromFilePicker(options);
    if (!raw) {
      const openError = getMessage("OPEN_FAILED_GENERIC");
      throw new Error(openError.text || "Impossible de charger le document.");
    }
    const data = raw.data && typeof raw.data === "object" ? raw.data : raw;
    const incomingMeta = (data && typeof data.meta === "object" ? data.meta : {}) || {};
    const mergeDocTypeHint = normalizeDocTypeKey(
      incomingMeta.docType || options.docType || "facture"
    );
    mergeInvoiceDataIntoState(raw, { docType: mergeDocTypeHint });
    const skipClientInputs = options?.skipClientInputs === true;

    const st = (window.SEM?.state || window.state || {});
    const metaTarget = st.meta || (st.meta = {});
    const resolvedDocType = normalizeDocTypeKey(
      incomingMeta.docType || options.docType || metaTarget.docType || "facture"
    );
    metaTarget.docType = resolvedDocType;
    if (options?.path) {
      const normalizedType = String(options.docType || metaTarget.docType || "facture").toLowerCase();
      metaTarget.historyPath = options.path;
      metaTarget.historyDocType = normalizedType;
      if (normalizedType === "facture" && typeof window.getDocumentHistoryEntry === "function") {
        try {
          const entry = window.getDocumentHistoryEntry(normalizedType, options.path);
          if (entry?.status) metaTarget.status = entry.status;
        } catch (err) {
          console.warn("history status lookup failed", err);
        }
      } else if (normalizedType !== "facture" && "status" in metaTarget) {
        delete metaTarget.status;
      }
      if ("historyStatus" in metaTarget) delete metaTarget.historyStatus;
    } else {
      if (metaTarget.historyPath && typeof window.releaseDocumentEditLock === "function") {
        window.releaseDocumentEditLock(metaTarget.historyPath);
      }
      delete metaTarget.historyPath;
      delete metaTarget.historyDocType;
      delete metaTarget.status;
    }
    if (!data.company && st.company && !st.company.logo) {
      const headerLogoEl = document.getElementById("companyLogo");
      const domLogo =
        headerLogoEl && headerLogoEl.dataset.logoState !== "empty"
          ? headerLogoEl.getAttribute("src") || ""
          : "";
      st.company.logo = st.company.logo || domLogo || "";
    }

    // Keep doc type UI and history selectors aligned with the loaded document type.
    try {
      if (typeof window.syncDocTypeMenuUi === "function") {
        window.syncDocTypeMenuUi(resolvedDocType, { updateSelect: true });
      } else {
        const docTypeSelect = document.getElementById("docType");
        if (docTypeSelect) docTypeSelect.value = resolvedDocType;
      }

      // Ensure core meta inputs reflect the loaded document immediately.
      const setIfPresent = (id, value) => {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) {
          const str = String(value);
          if (el.value !== str) el.value = str;
        }
      };
      setIfPresent("invNumber", metaTarget?.number);
      setIfPresent("invDate", metaTarget?.date);
      const lengthValue =
        metaTarget?.numberLength ||
        (typeof normalizeInvoiceNumberLength === "function"
          ? normalizeInvoiceNumberLength(metaTarget?.number?.length, 4)
          : undefined);
      if (lengthValue) {
        setIfPresent("invNumberLength", lengthValue);
      }

    } catch (err) {
      console.warn("sync doc type after open failed", err);
    }

    // Skip the automatic model reapply that would otherwise overwrite loaded document fields.
    window.__suppressModelApplyOnce = 2;
    (window.SEM?.bind ? window.SEM.bind({ skipClientInputs }) : (typeof bind === "function" && bind()));
    if (typeof window.syncInvoiceNumberControls === "function") {
      window.syncInvoiceNumberControls({
        force: true,
        useNextIfEmpty: false,
        advanceSequence: false,
        overrideWithNext: false
      });
    }

    if (!skipClientInputs) {
      // Ensure client fields reflect the loaded document (historique click) even if other UI sync paths skip it.
      try {
        const stAfterBind = (window.SEM?.state || window.state || {});
        const rawData = pickInvoiceData(raw) || {};
        const clientLoaded =
          (rawData && typeof rawData.client === "object" && rawData.client) ||
          stAfterBind.client ||
          {};
        const hasClientContent = ["name", "vat", "phone", "email", "address"].some(
          (key) => typeof clientLoaded[key] === "string" && clientLoaded[key].trim() !== ""
        );
        const hasClientPath = typeof clientLoaded.__path === "string" && clientLoaded.__path.trim() !== "";

        if (hasClientContent || hasClientPath) {
          if (window.SEM?.forms?.fillClientToForm) {
            window.SEM.forms.fillClientToForm(clientLoaded);
          } else {
            const setIfPresent = (id, value) => {
              const el = document.getElementById(id);
              if (el && value !== undefined && value !== null) el.value = String(value);
            };
            setIfPresent("clientType", clientLoaded.type || "societe");
            setIfPresent("clientName", clientLoaded.name || "");
            setIfPresent(
              "clientVat",
              clientLoaded.vat ||
                clientLoaded.identifiantFiscal ||
                clientLoaded.identifiant ||
                clientLoaded.tva ||
                clientLoaded.nif ||
                ""
            );
            setIfPresent("clientPhone", clientLoaded.phone || clientLoaded.telephone || clientLoaded.tel || "");
            setIfPresent("clientEmail", clientLoaded.email || "");
            setIfPresent("clientAddress", clientLoaded.address || clientLoaded.adresse || "");
            if (typeof window.SEM?.updateClientIdLabel === "function") window.SEM.updateClientIdLabel();
          }
        }
        if (typeof window.SEM?.refreshClientSummary === "function") window.SEM.refreshClientSummary();
        if (typeof window.SEM?.setClientFormBaseline === "function") {
          const baseline =
            (typeof window.SEM.getClientFormSnapshot === "function" && window.SEM.getClientFormSnapshot()) ||
            { ...clientLoaded };
          baseline.__path = baseline.__path || clientLoaded.__path || "";
          window.SEM.setClientFormBaseline(hasClientContent || hasClientPath ? baseline : null);
        } else if (stAfterBind.client) {
          stAfterBind.client.__dirty = false;
        }
        if (typeof window.SEM?.evaluateClientDirtyState === "function") {
          window.SEM.evaluateClientDirtyState();
        } else {
          window.SEM?.refreshUpdateClientButton?.();
        }
      } catch (err) {
        console.warn("client rebind after open failed", err);
      }
    }

    if (typeof window.SEM?.markDocumentDirty === "function") {
      window.SEM.markDocumentDirty(false);
    }

    return raw;
  }

    function syncActiveInvoiceHistoryStatus() {
      try {
        const st = (window.SEM?.state || window.state || null);
        const meta = st?.meta;
        if (!meta || typeof meta !== "object") return;
        const historyPath = meta.historyPath;
        if (!historyPath || typeof window.getDocumentHistoryEntry !== "function") return;
        const docTypeHint = meta.historyDocType || meta.docType || "facture";
        const normalizedType = String(docTypeHint || "facture").toLowerCase();
        if (normalizedType !== "facture") return;
        const entry = window.getDocumentHistoryEntry(normalizedType, historyPath);
        if ("historyStatus" in meta) delete meta.historyStatus;
      } catch (err) {
        console.warn("syncActiveInvoiceHistoryStatus failed", err);
      }
    }

  async function exportCurrentPDF() {
    if (window.SEM?.readInputs) window.SEM.readInputs(); else if (typeof readInputs === "function") readInputs();
    if (window.SEM?.computeTotals) window.SEM.computeTotals(); else if (typeof computeTotals === "function") computeTotals();
    syncActiveInvoiceHistoryStatus();

    const st = (window.SEM?.state || window.state || {});
    const totalsSnapshot = typeof window.SEM?.computeTotalsReturn === "function"
      ? window.SEM.computeTotalsReturn()
      : null;
    return await exportStateSnapshot(st, { totalsSnapshot });
  }

  async function printCurrentPDF() {
    if (window.SEM?.readInputs) window.SEM.readInputs(); else if (typeof readInputs === "function") readInputs();
    if (window.SEM?.computeTotals) window.SEM.computeTotals(); else if (typeof computeTotals === "function") computeTotals();
    syncActiveInvoiceHistoryStatus();

    const st = (window.SEM?.state || window.state || {});
    if (!window.PDFView) {
      const pdfUnavailable = getMessage("PDF_OPEN_UNAVAILABLE");
      await showDialog?.(pdfUnavailable.text, { title: pdfUnavailable.title });
      return;
    }

    if (typeof API?.printHTML === "function") {
      try {
        const assets = API?.assets || {};
        const htmlInv = window.PDFView.build(st, assets);
        const cssInv = window.PDFView.css || "";
        const res = await API.printHTML({
          html: htmlInv,
          css: cssInv,
          print: { silent: true, printBackground: true }
        });
        if (res?.ok) return;
        const printError = getMessage("PRINT_FAILED", {
          fallbackTitle: "Impression",
          fallbackText: "Impossible d'imprimer le document."
        });
        showDialog?.(String(res?.error || printError.text), { title: printError.title });
        return;
      } catch (err) {
        const printError = getMessage("PRINT_FAILED", {
          fallbackTitle: "Impression",
          fallbackText: "Impossible d'imprimer le document."
        });
        showDialog?.(String(err?.message || err || printError.text), { title: printError.title });
        return;
      }
    }
    const printError = getMessage("PRINT_FAILED", {
      fallbackTitle: "Impression",
      fallbackText: "Impression silencieuse indisponible."
    });
    showDialog?.(printError.text, { title: printError.title });
  }

  async function exportInvoiceDataAsPDF(rawData, options = {}) {
    if (!rawData) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      await showDialog?.(loadError.text, { title: loadError.title });
      return;
    }
    const strictDbSnapshot =
      options?.strictDb === true || options?.strictFromDb === true || options?.strictPreview === true;
    let cloned = ensureStateDefaults(cloneInvoiceData(rawData));
    if (strictDbSnapshot) {
      if (!cloned.meta || typeof cloned.meta !== "object") cloned.meta = {};
      cloned.meta.__pdfPreviewStrict = true;
    } else {
      cloned = await hydrateStateWithModelDefaults(cloned);
    }
    const totalsSnapshot = computeTotalsForSnapshot(cloned, null);
    return await exportStateSnapshot(cloned, {
      totalsSnapshot,
      historyPath: options.historyPath,
      historyDocType: options.historyDocType,
      overwritePolicy: options?.overwritePolicy || null,
      suppressPrompt:
        options?.suppressPrompt === true ||
        options?.suppressOpenDialog === true ||
        options?.silentBatch === true,
      openAfterExport: options?.openAfterExport === true
    });
  }

  async function exportWithholdingDataAsPDF(rawData, options = {}) {
    const forceExport = options?.force === true;
    if (!rawData) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      await showDialog?.(loadError.text, { title: loadError.title });
      return null;
    }
    if (!window.PDFWH) {
      const unavailable = getMessage("WITHHOLDING_EXPORT_UNAVAILABLE", {
        fallbackText: "Certificat de retenue indisponible.",
        fallbackTitle: "Retenue a la source"
      });
      await showDialog?.(unavailable.text, { title: unavailable.title });
      return null;
    }
    if (!API?.exportPDFFromHTML) {
      const directUnavailable = getMessage("HISTORY_EXPORT_DIRECT_UNAVAILABLE");
      await showDialog?.(directUnavailable.text, { title: directUnavailable.title });
      return null;
    }
    const cloned = await hydrateStateWithModelDefaults(ensureStateDefaults(cloneInvoiceData(rawData)));
    const totalsSnapshot = computeTotalsForSnapshot(cloned, null);
    const whAmountComputed = totalsSnapshot?.whAmount ?? 0;
    const whEnabled = !!cloned.meta?.withholding?.enabled;
    if (!forceExport && (!whEnabled || !(whAmountComputed > 0))) {
      const nothingToExport = getMessage("WITHHOLDING_EXPORT_EMPTY", {
        fallbackText: "Aucune retenue a la source a exporter pour ce document.",
        fallbackTitle: "Retenue a la source"
      });
      await showDialog?.(nothingToExport.text, { title: nothingToExport.title });
      return null;
    }

    const assets = API?.assets || {};
    const htmlWH = window.PDFWH.build(cloned, assets);
    const cssWH = window.PDFWH.css || "";

    const typeLbl = docTypeLabel(cloned.meta?.docType);
    const invRaw = String(cloned.meta?.number || "").trim();
    const invNum = invRaw ? slugForFile(invRaw) : "";
    const fileName = ensurePdfExt(buildWithholdingBaseName(typeLbl, invNum));

    const resCert = await exportWithOverwrite({
      html: htmlWH,
      css: cssWH,
      meta: {
        number: cloned.meta?.number,
        docType: "retenue",
        filename: fileName,
        date: cloned.meta?.date,
        withholdingDocType: cloned.meta?.docType,
        silent: true,
        to: "pdf",
        deferOpen: true
      }
    }, fileName);
    if (resCert && resCert.ok === false) {
      if (resCert.canceled) return { ok: false, canceled: true };
      const certificateError = getMessage("WITHHOLDING_EXPORT_FAILED");
      await showDialog?.(resCert.error || certificateError.text, { title: certificateError.title });
      return { ok: false, canceled: false };
    }
    if (!resCert?.ok) return { ok: false, canceled: false };

    const whLabel = cleanDocNameForDialog({
      rawName: displayFileTitle(resCert?.name || fileName),
      docType: "retenue",
      fallback: displayFileTitle(resCert?.name || fileName)
    });
    const readyText = () =>
      dialogStrings.exportReadyMasculine || "a ete exporte et peut maintenant etre ouvert.";
    const summaryTemplate =
      typeof dialogTemplates.documentReadySummary === "function"
        ? dialogTemplates.documentReadySummary({
            entries: [
              {
                prefix: "Le certificat",
                name: whLabel,
                suffix: readyText()
              }
            ]
          })
        : null;
    const msg =
      summaryTemplate?.text ||
      `Le certificat ${whLabel || "document"} ${readyText()}`.trim();
    await showConfirm?.(msg, {
      title: "Ouvrir le document",
      okText: "Ouvrir le certificat",
      cancelText: "Fermer",
      okKeepsOpen: false,
      renderMessage:
        summaryTemplate?.renderMessage ||
        ((container) => {
          container.innerHTML = "";
          const line = document.createElement("p");
          line.append("Le certificat ");
          const strong = document.createElement("strong");
          strong.className = "swbDialogMsg__filename";
          strong.textContent = whLabel || "document";
          line.appendChild(strong);
          line.append(` ${readyText()}`);
          container.appendChild(line);
        }),
      onOk: () => { try { previewWithholdingDataAsPDF(cloned); } catch {} }
    });

    return {
      ok: true,
      canceled: false,
      path: resCert?.path || null,
      name: resCert?.name || null
    };
  }

  let lastPreviewState = null;
  let lastPreviewTotals = null;
  let lastPreviewMode = "invoice";
  let lastPreviewHtml = "";
  let lastPreviewCss = "";
  let lastPreviewPdfPath = "";

  function resetLastPreviewState() {
    lastPreviewState = null;
    lastPreviewTotals = null;
    lastPreviewMode = "invoice";
    lastPreviewHtml = "";
    lastPreviewCss = "";
    lastPreviewPdfPath = "";
  }

  function invalidatePdfPreviewCache(options = {}) {
    const closeModal = options?.closeModal !== false;
    resetLastPreviewState();
    const overlay = document.getElementById("pdfPreviewModal");
    if (!overlay) return;
    if (closeModal) {
      closePdfPreviewModal();
      return;
    }
    const content = overlay.querySelector("#pdfPreviewContent");
    if (content) content.innerHTML = "";
  }

  function ensurePdfPreviewOptions(meta = {}) {
    if (!meta || typeof meta !== "object") return null;
    if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
    if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
    return meta.extras.pdf;
  }

  function resolvePdfPreviewOption(pdfOptions, key, fallback) {
    if (pdfOptions && typeof pdfOptions[key] === "boolean") return pdfOptions[key];
    return fallback;
  }

  function applyPdfPreviewMode(overlay, mode) {
    if (!overlay) return;
    const actions = overlay.querySelector(".pdf-preview-modal__actions");
    const toggles = overlay.querySelector(".pdf-preview-modal__toggles");
    const exportBtn = overlay.querySelector("#pdfPreviewModalExport");
    const printBtn = overlay.querySelector("#pdfPreviewModalPrint");
    const isInvoice = mode === "invoice";
    const isWithholding = mode === "withholding" || mode === "pdf-file-withholding";
    const isPdfFile = mode === "pdf-file" || mode === "pdf-file-withholding";
    const isXmlFile = mode === "xml-file";
    const showActions = isInvoice || isWithholding || isPdfFile;
    if (actions) {
      actions.style.display = showActions ? "" : "none";
      actions.style.justifyContent = isWithholding || isPdfFile ? "flex-end" : "";
    }
    if (toggles) toggles.style.display = isInvoice ? "" : "none";
    if (exportBtn) exportBtn.style.display = isInvoice ? "" : "none";
    if (printBtn) printBtn.style.display = isInvoice || isWithholding || isPdfFile ? "" : "none";
    if (isXmlFile && printBtn) printBtn.style.display = "none";
  }

  function refreshPdfPreviewContent(overlay) {
    if (!overlay) return;
    const content = overlay.querySelector("#pdfPreviewContent");
    if (!content) return;
    content.classList.add("pdf-preview-surface");
    let root = content.querySelector("#pdfRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "pdfRoot";
      root.className = "pdf-preview-root";
      content.innerHTML = "";
      content.appendChild(root);
    }
    if (lastPreviewMode === "withholding") {
      root.innerHTML = lastPreviewHtml || "";
      return;
    }
    if (
      lastPreviewMode === "pdf-file" ||
      lastPreviewMode === "pdf-file-withholding" ||
      lastPreviewMode === "xml-file"
    ) {
      const iframe = document.createElement("iframe");
      iframe.className = "pdf-preview-embed";
      iframe.src = toFileUrl(lastPreviewPdfPath || "");
      iframe.title = lastPreviewMode === "xml-file" ? "XML" : "PDF";
      iframe.setAttribute("frameborder", "0");
      root.innerHTML = "";
      root.appendChild(iframe);
      return;
    }
    if (!lastPreviewState || !window.PDFView) return;
    const assets = API?.assets || {};
    window.PDFView.render(lastPreviewState, assets, { root });
  }

  function updatePdfPreviewOptionsFromToggles(overlay) {
    if (!overlay || lastPreviewMode !== "invoice" || !lastPreviewState) return;
    const showSealInput = overlay.querySelector("#pdfPreviewShowSeal");
    const showSignatureInput = overlay.querySelector("#pdfPreviewShowSignature");
    const showSeal = showSealInput ? !!showSealInput.checked : undefined;
    const showSignature = showSignatureInput ? !!showSignatureInput.checked : undefined;
    const pdfOptions = ensurePdfPreviewOptions(lastPreviewState.meta) || {};
    if (typeof showSeal === "boolean") pdfOptions.showSeal = showSeal;
    if (typeof showSignature === "boolean") pdfOptions.showSignature = showSignature;
    refreshPdfPreviewContent(overlay);
  }

  function withPrintMode(callback) {
    const cleanup = () => {
      document.body.classList.remove("printing", "print-mode");
      window.removeEventListener("afterprint", onAfterPrint);
    };
    const onAfterPrint = () => cleanup();
    window.addEventListener("afterprint", onAfterPrint);
    document.body.classList.add("printing", "print-mode");
    try {
      callback();
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  async function exportPreviewedPDFInBrowser() {
    const root = document.getElementById("pdfPreviewModal")?.querySelector("#pdfRoot");
    const html2canvas = window.html2canvas;
    const jsPDF = window.jspdf?.jsPDF;
    if (!root || !html2canvas || !jsPDF) {
      const pdfError = getMessage("PDF_EXPORT_FAILED");
      await showDialog?.(pdfError.text, { title: pdfError.title });
      return null;
    }

    const st = lastPreviewState;
    const invRaw = String(st?.meta?.number || "").trim();
    const invNum = invRaw ? slugForFile(invRaw) : "";
    const baseName = resolvePdfBaseNameByDocType({
      docType: st?.meta?.docType,
      invNum,
      historyPath: st?.meta?.historyPath,
      fallback: "Document"
    });
    const fileName = ensurePdfExt(baseName);

    document.body.classList.add("exporting-pdf");
    try {
      root.style.display = "block";
      const pages = Array.from(root.querySelectorAll(".pdf-page"));
      const targets = pages.length ? pages : [root];
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let idx = 0; idx < targets.length; idx += 1) {
        const target = targets[idx];
        const rect = target.getBoundingClientRect();
        const canvas = await html2canvas(target, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          width: rect.width,
          height: rect.height,
          windowWidth: rect.width,
          windowHeight: rect.height
        });
        const imgData = canvas.toDataURL("image/png", 1.0);
        if (idx > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(fileName);
      const downloadMessage = getMessage("DOCUMENT_DOWNLOAD_SUCCESS");
      await showDialog?.(downloadMessage.text, { title: downloadMessage.title });
      return { ok: true, filename: fileName };
    } catch (err) {
      console.warn("browser pdf export failed", err);
      const pdfError = getMessage("PDF_EXPORT_FAILED");
      await showDialog?.(String(err?.message || err || pdfError.text), { title: pdfError.title });
      return null;
    } finally {
      document.body.classList.remove("exporting-pdf");
    }
  }

  const PRINT_URL_PARAMS = "toolbar=0&navpanes=0&statusbar=0&view=FitH&print=1";

  function toFileUrl(pathLike) {
    if (!pathLike) return "";
    const normalized = String(pathLike).replace(/\\/g, "/");
    if (normalized.startsWith("file://")) return normalized;
    const prefix = normalized.startsWith("/") ? "file://" : "file:///";
    return prefix + normalized;
  }

  function buildBrowserPrintUrl(resOrUrl) {
    const base =
      typeof resOrUrl === "object" && resOrUrl
        ? resOrUrl.url || (resOrUrl.path ? toFileUrl(resOrUrl.path) : "")
        : typeof resOrUrl === "string"
          ? resOrUrl
          : "";
    if (!base) return "";
    return base.includes("#") ? `${base}&${PRINT_URL_PARAMS}` : `${base}#${PRINT_URL_PARAMS}`;
  }

  async function openPdfInBrowserForPrint(resOrUrl) {
    const url = buildBrowserPrintUrl(resOrUrl);
    if (!url) return false;
    try {
      if (API?.openExternal) {
        await API.openExternal(url);
        return true;
      }
    } catch (err) {
      console.warn("openExternal failed", err);
    }
    try {
      const w = window.open(url, "_blank", "noopener");
      if (w) {
        w.focus?.();
        return true;
      }
    } catch (err) {
      console.warn("window.open failed", err);
    }
    return false;
  }

  function legacyInlinePrint() {
    const overlay = document.getElementById("pdfPreviewModal");
    const root = overlay?.querySelector("#pdfRoot");
    if (!overlay || !root) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      showDialog?.(loadError.text, { title: loadError.title });
      return false;
    }
    try {
      root.style.display = "block";
      root.style.pointerEvents = "auto";
      root.removeAttribute("aria-hidden");
      withPrintMode(() => {
        try {
          window.print();
        } catch (err) {
          const printError = getMessage("PRINT_FAILED", {
            fallbackTitle: "Impression",
            fallbackText: "Impossible d'imprimer le document."
          });
          showDialog?.(String(err?.message || err || printError.text), { title: printError.title });
        }
      });
      return true;
    } catch (err) {
      const printError = getMessage("PRINT_FAILED", {
        fallbackTitle: "Impression",
        fallbackText: "Impossible d'imprimer le document."
      });
      showDialog?.(String(err?.message || err || printError.text), { title: printError.title });
      return false;
    }
  }

  async function printPreviewedPDF() {
    if (lastPreviewMode === "withholding") {
      if (!lastPreviewState) {
        const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
        showDialog?.(loadError.text, { title: loadError.title });
        return;
      }
      if (!window.PDFWH) {
        const unavailable = getMessage("WITHHOLDING_EXPORT_UNAVAILABLE", {
          fallbackText: "Certificat de retenue indisponible.",
          fallbackTitle: "Retenue a la source"
        });
        await showDialog?.(unavailable.text, { title: unavailable.title });
        return;
      }
      const st = lastPreviewState;
      const assets = API?.assets || {};
      const htmlWH = lastPreviewHtml || window.PDFWH.build(st, assets);
      const cssWH = lastPreviewCss || window.PDFWH.css || "";

      if (typeof API?.printHTML === "function") {
        try {
          const res = await API.printHTML({
            html: htmlWH,
            css: cssWH,
            print: { silent: true, printBackground: true }
          });
          if (res?.ok) return;
        } catch (err) {
          console.warn("direct withholding print failed", err);
        }
      }

      const canExportToPdf = !!API?.exportPDFFromHTML;
      if (canExportToPdf) {
        try {
          const typeLbl = docTypeLabel(st.meta?.docType);
          const invRaw = String(st.meta?.number || "").trim();
          const invNum = invRaw ? slugForFile(invRaw) : "";
          const fileName = ensurePdfExt(buildWithholdingBaseName(typeLbl, invNum));

          const res = await API.exportPDFFromHTML({
            html: htmlWH,
            css: cssWH,
            meta: {
              number: st.meta?.number,
              docType: "retenue",
              filename: fileName,
              date: st.meta?.date,
              withholdingDocType: st.meta?.docType,
              silent: true,
              to: "pdf",
              forceOverwrite: true
            }
          });
          if (res?.ok) {
            const opened = await openPdfInBrowserForPrint(res);
            if (opened) return;
          } else if (res && !res.canceled) {
            const printError = getMessage("PRINT_FAILED", {
              fallbackTitle: "Impression",
              fallbackText: "Impossible d'imprimer le document."
            });
            showDialog?.(res.error || printError.text, { title: printError.title });
            return;
          }
        } catch (err) {
          console.warn("withholding print export failed", err);
        }
      }

      legacyInlinePrint();
      return;
    }
    if (lastPreviewMode === "pdf-file-withholding") {
      const opened = await openPdfInBrowserForPrint(lastPreviewPdfPath || "");
      if (!opened && lastPreviewPdfPath && typeof API?.openPath === "function") {
        try {
          await API.openPath(lastPreviewPdfPath);
        } catch {}
      }
      return;
    }
    if (lastPreviewMode === "pdf-file") {
      const opened = await openPdfInBrowserForPrint(lastPreviewPdfPath || "");
      if (!opened && lastPreviewPdfPath && typeof API?.openPath === "function") {
        try {
          await API.openPath(lastPreviewPdfPath);
        } catch {}
      }
      return;
    }
    if (!lastPreviewState) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      showDialog?.(loadError.text, { title: loadError.title });
      return;
    }
    updatePdfPreviewOptionsFromToggles(document.getElementById("pdfPreviewModal"));

    if (window.PDFView && typeof API?.printHTML === "function") {
      try {
        const st = lastPreviewState;
        const assets = API?.assets || {};
        const htmlInv = window.PDFView.build(st, assets);
        const cssInv = window.PDFView.css || "";
        const res = await API.printHTML({
          html: htmlInv,
          css: cssInv,
          print: { silent: true, printBackground: true }
        });
        if (res?.ok) return;
        console.warn("direct preview print failed", res?.error || res);
      } catch (err) {
        console.warn("direct preview print failed", err);
      }
    }

    const canExportToPdf = !!(API?.exportPDFFromHTML && window.PDFView);
    if (canExportToPdf) {
      try {
        const st = lastPreviewState;
        const assets = API?.assets || {};
        const htmlInv = window.PDFView.build(st, assets);
        const cssInv = window.PDFView.css || "";

        const invRaw = String(st.meta?.number || "").trim();
        const invNum = invRaw ? slugForFile(invRaw) : "";
        const baseName = resolvePdfBaseNameByDocType({
          docType: st.meta?.docType,
          invNum,
          historyPath: st.meta?.historyPath,
          fallback: "Document"
        });
        // Use the same filename as export and overwrite the existing PDF when printing
        const fileName = ensurePdfExt(baseName);

        const clientName = String(st.client?.name || "").trim();
        const clientVat = String(st.client?.vat || "").trim();

        const res = await API.exportPDFFromHTML({
          html: htmlInv,
          css: cssInv,
          meta: {
            number: st.meta?.number,
            docType: st.meta?.docType,
            filename: fileName,
            date: st.meta?.date,
            clientName,
            clientVat,
            silent: true,
            to: "pdf",
            forceOverwrite: true
          }
        });

        if (res?.ok) {
          const opened = await openPdfInBrowserForPrint(res);
          if (opened) return;
        } else if (res && !res.canceled) {
          const printError = getMessage("PRINT_FAILED", {
            fallbackTitle: "Impression",
            fallbackText: "Impossible d'imprimer le document."
          });
          showDialog?.(res.error || printError.text, { title: printError.title });
        }
      } catch (err) {
        console.warn("Browser print failed, falling back to inline print", err);
      }
    }

    legacyInlinePrint();
  }

  async function exportPreviewedPDF() {
    if (lastPreviewMode !== "invoice") return;
    if (!lastPreviewState) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      await showDialog?.(loadError.text, { title: loadError.title });
      return;
    }
    if (!API?.exportPDFFromHTML) {
      await exportPreviewedPDFInBrowser();
      return;
    }
    if (!window.PDFView) {
      const pdfUnavailable = getMessage("PDF_OPEN_UNAVAILABLE");
      await showDialog?.(pdfUnavailable.text, { title: pdfUnavailable.title });
      return;
    }
    updatePdfPreviewOptionsFromToggles(document.getElementById("pdfPreviewModal"));
    return await exportStateSnapshot(lastPreviewState, { totalsSnapshot: lastPreviewTotals });
  }

  function closePdfPreviewModal() {
    const overlay = document.getElementById("pdfPreviewModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    const content = overlay.querySelector("#pdfPreviewContent");
    if (content) content.innerHTML = "";
  }

  function ensurePdfPreviewModal() {
    let overlay = document.getElementById("pdfPreviewModal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "pdfPreviewModal";
    overlay.className = "swbDialog doc-history-modal pdf-preview-modal";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel" role="dialog" aria-modal="true" aria-labelledby="pdfPreviewModalTitle">
        <div class="swbDialog__header">
          <div id="pdfPreviewModalTitle" class="swbDialog__title">Aperçu PDF</div>
          <button id="pdfPreviewModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="pdf-preview-modal__body swbDialog__msg">
          <style id="pdfPreviewModalStyle"></style>
          <div id="pdfPreviewContent" class="pdf-preview-modal__content"></div>
        </div>
        <div class="pdf-preview-modal__actions">
          <div class="pdf-preview-modal__toggles">
            <label class="pdf-preview-modal__toggle">
              <input id="pdfPreviewShowSeal" type="checkbox" />
              <span>Afficher le cachet</span>
            </label>
            <label class="pdf-preview-modal__toggle">
              <input id="pdfPreviewShowSignature" type="checkbox" />
              <span>Afficher la signature</span>
            </label>
          </div>
          <div class="pdf-preview-modal__buttons">
            <button id="pdfPreviewModalPrint" type="button" class="client-search__addSTK">Imprimer</button>
            <button id="pdfPreviewModalExport" type="button" class="client-search__edit">Exporter PDF</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector("#pdfPreviewModalClose");
    closeBtn?.addEventListener("click", closePdfPreviewModal);
    overlay.addEventListener("click", (evt) => {
      if (evt.target === overlay) closePdfPreviewModal();
    });
    overlay.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") closePdfPreviewModal();
    });
    const exportBtn = overlay.querySelector("#pdfPreviewModalExport");
    exportBtn?.addEventListener("click", exportPreviewedPDF);
    const printBtn = overlay.querySelector("#pdfPreviewModalPrint");
    printBtn?.addEventListener("click", printPreviewedPDF);

    const showSealInput = overlay.querySelector("#pdfPreviewShowSeal");
    const showSignatureInput = overlay.querySelector("#pdfPreviewShowSignature");
    const onToggleChange = () => updatePdfPreviewOptionsFromToggles(overlay);
    showSealInput?.addEventListener("change", onToggleChange);
    showSignatureInput?.addEventListener("change", onToggleChange);

    return overlay;
  }

  async function previewInvoiceDataAsPDF(rawData) {
    resetLastPreviewState();
    if (!rawData) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      await showDialog?.(loadError.text, { title: loadError.title });
      return;
    }
    if (!window.PDFView) {
      const pdfUnavailable = getMessage("PDF_OPEN_UNAVAILABLE");
      await showDialog?.(pdfUnavailable.text, { title: pdfUnavailable.title });
      return;
    }
    // Preview modal must reflect persisted document data only (no model-default overrides).
    const st = ensureStateDefaults(cloneInvoiceData(rawData));
    if (!st.meta || typeof st.meta !== "object") st.meta = {};
    st.meta.__pdfPreviewStrict = true;
    const pdfOptions = ensurePdfPreviewOptions(st.meta) || {};
    const showSeal = resolvePdfPreviewOption(pdfOptions, "showSeal", true);
    const showSignature = resolvePdfPreviewOption(pdfOptions, "showSignature", true);
    if (typeof pdfOptions.showSeal !== "boolean") pdfOptions.showSeal = showSeal;
    if (typeof pdfOptions.showSignature !== "boolean") pdfOptions.showSignature = showSignature;
    const assets = API?.assets || {};
    const cssInv = window.PDFView.css || "";
    const viewTitleParts = [
      docTypeLabel(st.meta?.docType),
      st.meta?.number ? ` ${st.meta.number}` : "",
      st.meta?.date ? ` • ${st.meta.date}` : ""
    ].filter(Boolean);
    const viewTitle = viewTitleParts.join("") || "Facture";

    const overlay = ensurePdfPreviewModal();
    applyPdfPreviewMode(overlay, "invoice");
    const titleEl = overlay.querySelector("#pdfPreviewModalTitle");
    if (titleEl) titleEl.textContent = viewTitle;
    const styleEl = overlay.querySelector("#pdfPreviewModalStyle");
    if (styleEl) styleEl.textContent = cssInv || "";
    const showSealInput = overlay.querySelector("#pdfPreviewShowSeal");
    if (showSealInput) showSealInput.checked = showSeal;
    const showSignatureInput = overlay.querySelector("#pdfPreviewShowSignature");
    if (showSignatureInput) showSignatureInput.checked = showSignature;
    const content = overlay.querySelector("#pdfPreviewContent");
    if (content) {
      content.innerHTML = "";
      content.classList.add("pdf-preview-surface");
      const root = document.createElement("div");
      root.id = "pdfRoot";
      root.className = "pdf-preview-root";
      content.appendChild(root);
      window.PDFView.render(st, assets, { root });
      content.scrollTop = 0;
    }
    lastPreviewState = st;
    lastPreviewTotals = computeTotalsForSnapshot(st, null);
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const exportBtn = overlay.querySelector("#pdfPreviewModalExport");
    if (exportBtn) {
      const docLabel = docTypeLabel(st.meta?.docType);
      exportBtn.textContent = docLabel ? `Exporter ${docLabel} PDF` : "Exporter PDF";
      exportBtn.disabled = false;
    }
    const printBtn = overlay.querySelector("#pdfPreviewModalPrint");
    if (printBtn) {
      const docLabel = docTypeLabel(st.meta?.docType);
      printBtn.textContent = docLabel ? `Imprimer ${docLabel}` : "Imprimer";
      printBtn.disabled = false;
    }
    const closeBtn = overlay.querySelector("#pdfPreviewModalClose");
    closeBtn?.focus();
  }

  async function previewWithholdingDataAsPDF(rawData) {
    resetLastPreviewState();
    lastPreviewMode = "withholding";
    if (!rawData) {
      const loadError = getMessage("PDF_DOCUMENT_LOAD_FAILED");
      await showDialog?.(loadError.text, { title: loadError.title });
      return;
    }
    if (!window.PDFWH) {
      const unavailable = getMessage("WITHHOLDING_EXPORT_UNAVAILABLE", {
        fallbackText: "Certificat de retenue indisponible.",
        fallbackTitle: "Retenue a la source"
      });
      await showDialog?.(unavailable.text, { title: unavailable.title });
      return;
    }
    const st = ensureStateDefaults(cloneInvoiceData(rawData));
    const assets = API?.assets || {};
    const htmlWH = window.PDFWH.build(st, assets);
    const cssWH = window.PDFWH.css || "";
    lastPreviewState = st;
    lastPreviewHtml = htmlWH;
    lastPreviewCss = cssWH;

    const viewTitleParts = [
      "Certificat de retenue",
      st.meta?.number ? ` ${st.meta.number}` : "",
      st.meta?.date ? ` - ${st.meta.date}` : ""
    ].filter(Boolean);
    const viewTitle = viewTitleParts.join("") || "Certificat de retenue";

    const overlay = ensurePdfPreviewModal();
    applyPdfPreviewMode(overlay, "withholding");
    const titleEl = overlay.querySelector("#pdfPreviewModalTitle");
    if (titleEl) titleEl.textContent = viewTitle;
    const styleEl = overlay.querySelector("#pdfPreviewModalStyle");
    if (styleEl) styleEl.textContent = cssWH || "";
    const content = overlay.querySelector("#pdfPreviewContent");
    if (content) {
      content.innerHTML = "";
      content.classList.add("pdf-preview-surface");
      const root = document.createElement("div");
      root.id = "pdfRoot";
      root.className = "pdf-preview-root";
      root.innerHTML = htmlWH;
      content.appendChild(root);
      content.scrollTop = 0;
    }
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const printBtn = overlay.querySelector("#pdfPreviewModalPrint");
    if (printBtn) {
      printBtn.textContent = "Imprimer le certificat";
      printBtn.disabled = false;
    }
    const closeBtn = overlay.querySelector("#pdfPreviewModalClose");
    closeBtn?.focus();
  }

  function previewPdfFileInModal(filePath, options = {}) {
    if (!filePath) return;
    resetLastPreviewState();
    const isWithholding = options?.withholding === true;
    lastPreviewMode = isWithholding ? "pdf-file-withholding" : "pdf-file";
    lastPreviewPdfPath = String(filePath || "");

    const overlay = ensurePdfPreviewModal();
    applyPdfPreviewMode(overlay, lastPreviewMode);
    const titleEl = overlay.querySelector("#pdfPreviewModalTitle");
    const titleText = String(options?.title || "Document PDF");
    if (titleEl) titleEl.textContent = titleText;
    const styleEl = overlay.querySelector("#pdfPreviewModalStyle");
    if (styleEl) styleEl.textContent = "";
    const content = overlay.querySelector("#pdfPreviewContent");
    if (content) {
      content.innerHTML = "";
      content.classList.add("pdf-preview-surface");
      const root = document.createElement("div");
      root.id = "pdfRoot";
      root.className = "pdf-preview-root";
      const iframe = document.createElement("iframe");
      iframe.className = "pdf-preview-embed";
      iframe.src = toFileUrl(lastPreviewPdfPath);
      iframe.title = titleText;
      iframe.setAttribute("frameborder", "0");
      root.appendChild(iframe);
      content.appendChild(root);
      content.scrollTop = 0;
    }
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const printBtn = overlay.querySelector("#pdfPreviewModalPrint");
    if (printBtn) {
      printBtn.textContent = isWithholding ? "Imprimer le certificat" : "Imprimer le document";
      printBtn.disabled = false;
    }
    const closeBtn = overlay.querySelector("#pdfPreviewModalClose");
    closeBtn?.focus();
  }

  function closeXmlPreviewModal() {
    const overlay = document.getElementById("xmlPreviewModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    const content = overlay.querySelector("#xmlPreviewContent");
    if (content) content.innerHTML = "";
  }

  function ensureXmlPreviewModal() {
    let overlay = document.getElementById("xmlPreviewModal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "xmlPreviewModal";
    overlay.className = "swbDialog doc-history-modal pdf-preview-modal xml-preview-modal";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="swbDialog__panel doc-history-modal__panel pdf-preview-modal__panel" role="dialog" aria-modal="true" aria-labelledby="xmlPreviewModalTitle">
        <div class="swbDialog__header">
          <div id="xmlPreviewModalTitle" class="swbDialog__title">Fichier XML</div>
          <button id="xmlPreviewModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="pdf-preview-modal__body swbDialog__msg">
          <style id="xmlPreviewModalStyle"></style>
          <div id="xmlPreviewContent" class="pdf-preview-modal__content"></div>
        </div>
        <div class="pdf-preview-modal__actions" style="display: none;">
          <div class="pdf-preview-modal__toggles" style="display: none;">
            <label class="pdf-preview-modal__toggle">
              <input id="xmlPreviewShowSeal" type="checkbox" />
              <span>Afficher le cachet</span>
            </label>
            <label class="pdf-preview-modal__toggle">
              <input id="xmlPreviewShowSignature" type="checkbox" />
              <span>Afficher la signature</span>
            </label>
          </div>
          <div class="pdf-preview-modal__buttons">
            <button id="xmlPreviewModalPrint" type="button" class="client-search__addSTK" style="display: none;">Imprimer</button>
            <button id="xmlPreviewModalExport" type="button" class="client-search__edit" style="display: none;">Exporter PDF</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector("#xmlPreviewModalClose");
    closeBtn?.addEventListener("click", closeXmlPreviewModal);
    overlay.addEventListener("click", (evt) => {
      if (evt.target === overlay) closeXmlPreviewModal();
    });
    overlay.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") closeXmlPreviewModal();
    });

    return overlay;
  }

  async function readXmlPreviewText(filePath) {
    if (!filePath) return null;
    if (window.electronAPI?.readXmlFile) {
      try {
        const res = await window.electronAPI.readXmlFile({ path: filePath });
        if (res?.ok && typeof res.xml === "string") return res.xml;
      } catch (err) {
        console.warn("xml preview read failed", err);
      }
    }
    try {
      const response = await fetch(toFileUrl(filePath));
      if (response?.ok) return await response.text();
    } catch {}
    return null;
  }

  const XML_SECTION_ORDER = [
    "Declarant",
    "ReferenceDeclaration",
    "Beneficiaire",
    "Operation",
    "TotalPayement"
  ];
  const XML_SECTION_LABELS = {
    Declarant: "Declarant",
    ReferenceDeclaration: "Reference declaration",
    Beneficiaire: "Beneficiaire",
    Operation: "Operation",
    TotalPayement: "Total paiement"
  };
  const XML_FIELD_LABELS = {
    TypeIdentifiant: "Type d'identifiant",
    Identifiant: "Identifiant",
    CategorieContribuable: "Categorie contribuable",
    ActeDepot: "Acte de depot",
    AnneeDepot: "Annee de depot",
    MoisDepot: "Mois de depot",
    Resident: "Resident",
    NomPrenomOuRaisonSociale: "Nom et prenom ou raison sociale",
    NometprenonOuRaisonsociale: "Nom et prenom ou raison sociale",
    Adresse: "Adresse",
    InfosContact: "Infos contact",
    AdresseMail: "Adresse email",
    NumTel: "Numero de telephone",
    DatePayement: "Date de paiement",
    Ref_certif_chez_declarant: "Reference certificat (declarant)",
    Ref_Certif_chez_Declarant: "Reference certificat (declarant)",
    IdTypeOperation: "Type d'operation",
    AnneeFacturation: "Annee de facturation",
    CNPC: "CNPC",
    P_Charge: "P. charge",
    MontantHT: "Montant HT",
    TauxRS: "Taux RS",
    TauxTVA: "Taux TVA",
    MontantTVA: "Montant TVA",
    MontantTTC: "Montant TTC",
    MontantRS: "Montant RS",
    MontantNetServi: "Montant net servi",
    TotalMontantHT: "Total montant HT",
    TotalMontantTVA: "Total montant TVA",
    TotalMontantTTC: "Total montant TTC",
    TotalMontantRS: "Total montant RS",
    TotalMontantNetServi: "Total montant net servi"
  };

  function xmlFieldLabel(name) {
    if (!name) return "Champ";
    const cleaned = name.startsWith("@") ? name.slice(1) : name;
    if (XML_FIELD_LABELS[cleaned]) return XML_FIELD_LABELS[cleaned];
    const spaced = cleaned
      .replace(/_/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
    return spaced || cleaned;
  }

  function xmlSectionKey(path) {
    for (const key of XML_SECTION_ORDER) {
      if (path.includes(key)) return key;
    }
    return path[0] || "Document";
  }

  function collectXmlFieldsFromNode(node) {
    const rows = collectXmlLeafNodes(node, []);
    return rows
      .map((row) => ({
        label: xmlFieldLabel(row.path[row.path.length - 1]),
        value: row.value
      }))
      .filter((field) => field.value);
  }

  function readXmlTagValue(node, tagName) {
    if (!node || !tagName) return "";
    const tag = node.getElementsByTagName(tagName)[0];
    return tag ? String(tag.textContent || "").trim() : "";
  }

  function collectXmlLeafNodes(node, path = [], rows = []) {
    if (!node || node.nodeType !== 1) return rows;
    const nextPath = path.concat(node.nodeName);
    if (node.attributes && node.attributes.length) {
      Array.from(node.attributes).forEach((attr) => {
        const value = String(attr?.value ?? "").trim();
        if (value) rows.push({ path: nextPath.concat(`@${attr.name}`), value });
      });
    }
    const children = Array.from(node.children || []);
    if (!children.length) {
      const value = String(node.textContent || "").trim();
      if (value) rows.push({ path: nextPath, value });
      return rows;
    }
    children.forEach((child) => collectXmlLeafNodes(child, nextPath, rows));
    return rows;
  }

  function renderXmlPreviewContent(container, xmlText) {
    if (!container) return;
    const root = document.createElement("div");
    root.id = "xmlPreviewRoot";
    root.className = "xml-preview-root";

    let xmlDoc = null;
    try {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlText || "", "application/xml");
      if (xmlDoc?.getElementsByTagName("parsererror")?.length) {
        xmlDoc = null;
      }
    } catch {
      xmlDoc = null;
    }

    if (!xmlDoc) {
      const error = document.createElement("div");
      error.className = "xml-preview-error";
      error.textContent = "Impossible de lire le fichier XML. Affichage brut ci-dessous.";
      const raw = document.createElement("pre");
      raw.className = "xml-preview-raw";
      raw.textContent = String(xmlText || "").trim();
      root.append(error, raw);
      container.appendChild(root);
      return;
    }

    const rows = collectXmlLeafNodes(xmlDoc.documentElement || xmlDoc, []);
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "xml-preview-error";
      empty.textContent = "Aucune donnee lisible dans ce fichier XML.";
      root.appendChild(empty);
      container.appendChild(root);
      return;
    }

    const intro = document.createElement("div");
    intro.className = "xml-preview-intro";
    intro.textContent = "Champs extraits du fichier XML";
    root.appendChild(intro);

    const certificateNodes = Array.from(xmlDoc.getElementsByTagName("Certificat") || []);
    if (certificateNodes.length) {
      const declarantNode = xmlDoc.getElementsByTagName("Declarant")[0];
      if (declarantNode) {
        const fields = collectXmlFieldsFromNode(declarantNode);
        if (fields.length) {
          const section = document.createElement("section");
          section.className = "xml-preview-section";
          const title = document.createElement("h3");
          title.className = "xml-preview-section__title";
          title.textContent = XML_SECTION_LABELS.Declarant || "Declarant";
          const list = document.createElement("dl");
          list.className = "xml-preview-list";
          fields.forEach((field) => {
            const row = document.createElement("div");
            row.className = "xml-preview-row";
            const dt = document.createElement("dt");
            dt.textContent = field.label || "Champ";
            const dd = document.createElement("dd");
            dd.textContent = field.value;
            row.append(dt, dd);
            list.appendChild(row);
          });
          section.append(title, list);
          root.appendChild(section);
        }
      }

      const referenceNode = xmlDoc.getElementsByTagName("ReferenceDeclaration")[0];
      if (referenceNode) {
        const fields = collectXmlFieldsFromNode(referenceNode);
        if (fields.length) {
          const section = document.createElement("section");
          section.className = "xml-preview-section";
          const title = document.createElement("h3");
          title.className = "xml-preview-section__title";
          title.textContent = XML_SECTION_LABELS.ReferenceDeclaration || "Reference declaration";
          const list = document.createElement("dl");
          list.className = "xml-preview-list";
          fields.forEach((field) => {
            const row = document.createElement("div");
            row.className = "xml-preview-row";
            const dt = document.createElement("dt");
            dt.textContent = field.label || "Champ";
            const dd = document.createElement("dd");
            dd.textContent = field.value;
            row.append(dt, dd);
            list.appendChild(row);
          });
          section.append(title, list);
          root.appendChild(section);
        }
      }

      certificateNodes.forEach((certNode, certIndex) => {
        const certNumber = certIndex + 1;
        const paymentValue = readXmlTagValue(certNode, "DatePayement");
        const refValue =
          readXmlTagValue(certNode, "Ref_certif_chez_declarant") ||
          readXmlTagValue(certNode, "Ref_Certif_chez_Declarant");

        const beneficiaryNode = certNode.getElementsByTagName("Beneficiaire")[0];
        if (beneficiaryNode) {
          const fields = collectXmlFieldsFromNode(beneficiaryNode);
          if (paymentValue) {
            fields.push({ label: xmlFieldLabel("DatePayement"), value: paymentValue });
          }
          if (refValue) {
            fields.push({
              label: xmlFieldLabel("Ref_certif_chez_declarant"),
              value: refValue
            });
          }
          if (fields.length) {
            const section = document.createElement("section");
            section.className = "xml-preview-section";
            const title = document.createElement("h3");
            title.className = "xml-preview-section__title";
            title.textContent = `${XML_SECTION_LABELS.Beneficiaire || "Beneficiaire"} ${certNumber}`;
            const list = document.createElement("dl");
            list.className = "xml-preview-list";
            fields.forEach((field) => {
              const row = document.createElement("div");
              row.className = "xml-preview-row";
              const dt = document.createElement("dt");
              dt.textContent = field.label || "Champ";
              const dd = document.createElement("dd");
              dd.textContent = field.value;
              row.append(dt, dd);
              list.appendChild(row);
            });
            section.append(title, list);
            root.appendChild(section);
          }
        }

        const operationNodes = Array.from(certNode.getElementsByTagName("Operation") || []);
        operationNodes.forEach((opNode, opIndex) => {
          const fields = collectXmlFieldsFromNode(opNode);
          if (!fields.length) return;
          const section = document.createElement("section");
          section.className = "xml-preview-section";
          const title = document.createElement("h3");
          title.className = "xml-preview-section__title";
          title.textContent = `${XML_SECTION_LABELS.Operation || "Operation"} ${certNumber}.${opIndex + 1}`;
          const list = document.createElement("dl");
          list.className = "xml-preview-list";
          fields.forEach((field) => {
            const row = document.createElement("div");
            row.className = "xml-preview-row";
            const dt = document.createElement("dt");
            dt.textContent = field.label || "Champ";
            const dd = document.createElement("dd");
            dd.textContent = field.value;
            row.append(dt, dd);
            list.appendChild(row);
          });
          section.append(title, list);
          root.appendChild(section);
        });

        const totalNode = certNode.getElementsByTagName("TotalPayement")[0];
        if (totalNode) {
          const fields = collectXmlFieldsFromNode(totalNode);
          if (fields.length) {
            const section = document.createElement("section");
            section.className = "xml-preview-section";
            const title = document.createElement("h3");
            title.className = "xml-preview-section__title";
            title.textContent = `${XML_SECTION_LABELS.TotalPayement || "Total paiement"} ${certNumber}`;
            const list = document.createElement("dl");
            list.className = "xml-preview-list";
            fields.forEach((field) => {
              const row = document.createElement("div");
              row.className = "xml-preview-row";
              const dt = document.createElement("dt");
              dt.textContent = field.label || "Champ";
              const dd = document.createElement("dd");
              dd.textContent = field.value;
              row.append(dt, dd);
              list.appendChild(row);
            });
            section.append(title, list);
            root.appendChild(section);
          }
        }
      });

      container.appendChild(root);
      return;
    }

    const sections = new Map();
    rows.forEach((row) => {
      const section = xmlSectionKey(row.path);
      if (!sections.has(section)) sections.set(section, []);
      const label = xmlFieldLabel(row.path[row.path.length - 1]);
      sections.get(section).push({ label, value: row.value });
    });

    const orderedSections = [];
    XML_SECTION_ORDER.forEach((key) => {
      if (sections.has(key)) orderedSections.push(key);
    });
    sections.forEach((_value, key) => {
      if (!orderedSections.includes(key)) orderedSections.push(key);
    });

    orderedSections.forEach((key) => {
      const fields = sections.get(key) || [];
      if (!fields.length) return;
      const section = document.createElement("section");
      section.className = "xml-preview-section";
      const title = document.createElement("h3");
      title.className = "xml-preview-section__title";
      title.textContent = XML_SECTION_LABELS[key] || key;
      const list = document.createElement("dl");
      list.className = "xml-preview-list";
      fields.forEach((field) => {
        if (!field || !field.value) return;
        const row = document.createElement("div");
        row.className = "xml-preview-row";
        const dt = document.createElement("dt");
        dt.textContent = field.label || "Champ";
        const dd = document.createElement("dd");
        dd.textContent = field.value;
        row.append(dt, dd);
        list.appendChild(row);
      });
      section.append(title, list);
      root.appendChild(section);
    });

    container.appendChild(root);
  }

  async function previewXmlFileInModal(filePath, options = {}) {
    if (!filePath) return;
    const overlay = ensureXmlPreviewModal();
    const titleEl = overlay.querySelector("#xmlPreviewModalTitle");
    const rawTitle = String(options?.title || "Document").trim();
    const titleText = rawTitle ? `XML - ${rawTitle}` : "XML";
    if (titleEl) titleEl.textContent = titleText;
    const styleEl = overlay.querySelector("#xmlPreviewModalStyle");
    if (styleEl) styleEl.textContent = "";
    const content = overlay.querySelector("#xmlPreviewContent");
    if (content) {
      content.innerHTML = "";
      content.classList.add("pdf-preview-surface", "xml-preview-content");
      const loading = document.createElement("div");
      loading.className = "xml-preview-loading";
      loading.textContent = "Chargement du XML...";
      content.appendChild(loading);
    }
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const closeBtn = overlay.querySelector("#xmlPreviewModalClose");
    closeBtn?.focus();

    const xmlText = await readXmlPreviewText(filePath);
    if (!content) return;
    content.innerHTML = "";
    content.classList.add("pdf-preview-surface", "xml-preview-content");
    if (!xmlText) {
      const root = document.createElement("div");
      root.id = "xmlPreviewRoot";
      root.className = "xml-preview-root";
      const error = document.createElement("div");
      error.className = "xml-preview-error";
      error.textContent = "Impossible de lire le fichier XML.";
      root.appendChild(error);
      content.appendChild(root);
      return;
    }
    renderXmlPreviewContent(content, xmlText);
    content.scrollTop = 0;
  }

  // expose
  window.saveInvoiceJSON = saveInvoiceJSON;
  window.openInvoiceFromFilePicker = openInvoiceFromFilePicker;
  window.mergeInvoiceDataIntoState = mergeInvoiceDataIntoState;
  window.onOpenInvoiceClick = onOpenInvoiceClick;
  window.exportCurrentPDF = exportCurrentPDF;
  window.printCurrentPDF = printCurrentPDF;
  window.exportInvoiceDataAsPDF = exportInvoiceDataAsPDF;
  window.exportWithholdingDataAsPDF = exportWithholdingDataAsPDF;
  window.previewInvoiceDataAsPDF = previewInvoiceDataAsPDF;
  window.previewWithholdingDataAsPDF = previewWithholdingDataAsPDF;
  window.previewPdfFileInModal = previewPdfFileInModal;
  window.previewXmlFileInModal = previewXmlFileInModal;
  window.invalidatePdfPreviewCache = invalidatePdfPreviewCache;
})();
