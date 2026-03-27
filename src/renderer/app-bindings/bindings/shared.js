(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  SEM.__clientSavePipeline = "bindings";
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const COMPANY_PHONE_INPUT_IDS = ["companyPhone", "companyPhoneAlt1", "companyPhoneAlt2"];
  const MAX_COMPANY_PHONE_COUNT = COMPANY_PHONE_INPUT_IDS.length;
  const WH_NOTE_FONT_SIZES = [10, 12, 14];
  const WH_NOTE_DEFAULT_FONT_SIZE = 12;
  const WH_NOTE_SIZE_SET = new Set(WH_NOTE_FONT_SIZES);
  const WH_NOTE_BLOCK_TAGS = new Set(["div", "p", "section", "article", "header", "footer", "blockquote", "pre", "address"]);
  const pushWhNoteBreak = (parts = []) => {
    if (!parts.length) return;
    if (parts[parts.length - 1] !== "<br>") parts.push("<br>");
  };
  const FOOTER_NOTE_FONT_SIZES = [7, 8, 9];
  const FOOTER_NOTE_DEFAULT_FONT_SIZE = 8;
  const FOOTER_NOTE_ALLOWED_TAGS = new Set(["strong", "em", "ul", "ol", "li", "br", "span", "div"]);
  const FOOTER_NOTE_BLOCK_TAGS = new Set(["div", "p", "section", "article", "header", "footer", "blockquote", "pre", "address"]);
  const pushFooterNoteBreak = (parts = []) => {
    if (!parts.length) return;
    if (parts[parts.length - 1] !== "<br>") parts.push("<br>");
  };
  const WH_NOTE_GROUPS = {
    main: {
      boxId: "whNoteBox",
      hiddenId: "whNote",
      editorId: "whNoteEditor",
      sizeId: "whNoteFontSize",
      boldId: "whNoteBold",
      italicId: "whNoteItalic",
      listId: "whNoteList"
    },
    modal: {
      boxId: "whNoteBoxModal",
      hiddenId: "whNoteModal",
      editorId: "whNoteEditorModal",
      sizeId: "whNoteFontSizeModal",
      boldId: "whNoteBoldModal",
      italicId: "whNoteItalicModal",
      listId: "whNoteListModal"
    },
    beRemarks: {
      boxId: "beRemarksNoteBoxModal",
      hiddenId: "beRemarksModal",
      editorId: "beRemarksEditorModal",
      sizeId: "beRemarksFontSizeModal",
      boldId: "beRemarksBoldModal",
      italicId: "beRemarksItalicModal",
      listId: "beRemarksListModal"
    },
    beRemarksMain: {
      boxId: "beRemarksNoteBox",
      hiddenId: "beRemarks",
      editorId: "beRemarksEditor",
      sizeId: "beRemarksFontSize",
      boldId: "beRemarksBold",
      italicId: "beRemarksItalic",
      listId: "beRemarksList"
    },
    bsRemarks: {
      boxId: "bsRemarksNoteBoxModal",
      hiddenId: "bsRemarksModal",
      editorId: "bsRemarksEditorModal",
      sizeId: "bsRemarksFontSizeModal",
      boldId: "bsRemarksBoldModal",
      italicId: "bsRemarksItalicModal",
      listId: "bsRemarksListModal"
    },
    bsRemarksMain: {
      boxId: "bsRemarksNoteBox",
      hiddenId: "bsRemarks",
      editorId: "bsRemarksEditor",
      sizeId: "bsRemarksFontSize",
      boldId: "bsRemarksBold",
      italicId: "bsRemarksItalic",
      listId: "bsRemarksList"
    }
  };
  const resolveWhNoteGroups = (target) => {
    if (target === "all") return Object.keys(WH_NOTE_GROUPS);
    if (target && WH_NOTE_GROUPS[target]) return [target];
    return ["main"];
  };
  const normalizeWhNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    const min = Math.min(...WH_NOTE_FONT_SIZES);
    const max = Math.max(...WH_NOTE_FONT_SIZES);
    const clamped = Math.min(Math.max(parsed, min), max);
    return WH_NOTE_SIZE_SET.has(clamped) ? clamped : null;
  };
  const ensureWhNoteSizeWrapper = (html = "", size = WH_NOTE_DEFAULT_FONT_SIZE) => {
    const effectiveSize = normalizeWhNoteFontSize(size) ?? WH_NOTE_DEFAULT_FONT_SIZE;
    if (!html) return "";
    if (/data-size="/.test(html)) return html;
    return `<div data-size="${effectiveSize}" data-size-root="true">${html}</div>`;
  };
  const normalizeFooterNoteFontSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : null;
  };
  const ensureFooterNoteSizeWrapper = (html = "", size = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
    const effectiveSize = normalizeFooterNoteFontSize(size) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    if (!html) return "";
    if (/data-size-root\s*=\s*"?true"?/i.test(html)) return html;
    return `<div data-size="${effectiveSize}" data-size-root="true">${html}</div>`;
  };
  const resolveFooterNoteRootSize = (html = "", fallback = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
    const fallbackSize = normalizeFooterNoteFontSize(fallback) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    const str = String(html || "");
    const rootMatch =
      str.match(/<div[^>]*data-size-root="true"[^>]*data-size="(\d{1,3})"[^>]*>/i) ||
      str.match(/<div[^>]*data-size="(\d{1,3})"[^>]*data-size-root="true"[^>]*>/i);
    const rootSize = normalizeFooterNoteFontSize(rootMatch?.[1]);
    if (rootSize) return rootSize;
    const firstSize = normalizeFooterNoteFontSize(str.match(/data-size="(\d{1,3})"/i)?.[1]);
    return firstSize ?? fallbackSize;
  };

  const formatSoldClientValue = (value) => {
    const cleaned = String(value ?? "").replace(",", ".").trim();
    if (!cleaned) return "";
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return String(value ?? "").trim();
    return num.toFixed(3);
  };

  const getWhNoteContext = (sourceNode, groupHint) => {
    if (typeof document === "undefined") return {};
    const group =
      groupHint ||
      (sourceNode?.closest?.(`#${WH_NOTE_GROUPS.modal.boxId}`) ||
      sourceNode?.closest?.('[data-wh-note-group="modal"]')
        ? "modal"
        : "main");
    const cfg = WH_NOTE_GROUPS[group] || WH_NOTE_GROUPS.main;
    const container =
      (sourceNode?.closest ? sourceNode.closest(".note-field") : null) ||
      document.getElementById(cfg.boxId)?.querySelector(".note-field") ||
      document.getElementById(cfg.boxId) ||
      null;
    const editor = container?.querySelector(`#${cfg.editorId}`) || getEl(cfg.editorId);
    const hidden = container?.querySelector(`#${cfg.hiddenId}`) || getEl(cfg.hiddenId);
    const sizeSelect = container?.querySelector(`#${cfg.sizeId}`) || getEl(cfg.sizeId);
    return { container, editor, hidden, sizeSelect, group };
  };

  const getAllWhNoteNodes = (group = "main") => {
    if (typeof document === "undefined") {
      return { editors: [], hiddens: [], sizeSelects: [] };
    }
    const editors = [];
    const hiddens = [];
    const sizeSelects = [];
    resolveWhNoteGroups(group).forEach((key) => {
      const cfg = WH_NOTE_GROUPS[key];
      if (!cfg) return;
      editors.push(...document.querySelectorAll(`#${cfg.editorId}`));
      hiddens.push(...document.querySelectorAll(`#${cfg.hiddenId}`));
      sizeSelects.push(...document.querySelectorAll(`#${cfg.sizeId}`));
    });
    return { editors, hiddens, sizeSelects };
  };

  const getWhNoteLexicalModalApi = () => {
    const api = SEM.__whNoteLexicalModal || null;
    return api && typeof api === "object" ? api : null;
  };

  function cleanWhNoteEditor(editor) {
    if (!editor) return;
    const isEmptyText = (node) =>
      node?.nodeType === Node.TEXT_NODE && !node.textContent.replace(/\u00A0|\u200b|\s/g, "");
    // Remove zero-width/whitespace-only text nodes anywhere.
    if (document.createTreeWalker) {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
      const toRemove = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (isEmptyText(node)) toRemove.push(node);
      }
      toRemove.forEach((n) => n.parentNode?.removeChild(n));
    }
    editor.querySelectorAll("span[data-size]").forEach((span) => {
      const text = span.textContent.replace(/\u00A0|\u200b/g, "").trim();
      const hasRich = span.querySelector("strong, em, ul, ol, li, br");
      if (!text && !hasRich) {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        span.remove();
      }
    });
    editor.querySelectorAll("li").forEach((li) => {
      const text = li.textContent.replace(/\u00A0|\u200b/g, "").trim();
      const hasInline = li.querySelector("strong, em, span");
      const hasBr = Array.from(li.childNodes || []).some((n) => n.nodeName === "BR");
      if (!text && !hasInline && !hasBr) {
        li.remove();
      }
    });
    const isBreak = (node) => node?.nodeName === "BR";
    while (editor.firstChild && (isBreak(editor.firstChild) || isEmptyText(editor.firstChild))) {
      editor.removeChild(editor.firstChild);
    }
    while (editor.lastChild && (isBreak(editor.lastChild) || isEmptyText(editor.lastChild))) {
      editor.removeChild(editor.lastChild);
    }
    editor.querySelectorAll("p, div").forEach((el) => {
      const text = el.textContent.replace(/\u00A0|\u200b/g, "").trim();
      const hasRich = el.querySelector("strong, em, ul, ol, li, br, span[data-size]");
      if (!text && !hasRich) {
        el.remove();
      }
    });
  }

  function parseCompanyPhoneList(raw = "") {
    return String(raw || "")
      .replace(/\s+-\s+/g, "\n")
      .split(/[\n,;\/]+/u)
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .slice(0, MAX_COMPANY_PHONE_COUNT);
  }

  function formatCompanyPhoneList(list = []) {
    return (Array.isArray(list) ? list : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  function getCompanyPhoneInputs() {
    return COMPANY_PHONE_INPUT_IDS.map((id) => getEl(id));
  }

  function setCompanyPhoneInputs(values = []) {
    const normalized = Array.isArray(values) && values.length ? values.slice(0, MAX_COMPANY_PHONE_COUNT) : [""];
    while (normalized.length < MAX_COMPANY_PHONE_COUNT) normalized.push("");
    const inputs = getCompanyPhoneInputs();
    inputs.forEach((input, idx) => {
      if (!input) return;
      const value = normalized[idx] || "";
      if (input.value !== value) input.value = value;
      if (SEM.COMPANY_LOCKED) {
        input.readOnly = true;
        input.classList.add("locked");
        input.setAttribute("tabindex", "-1");
      } else {
        input.readOnly = false;
        input.classList.remove("locked");
        input.removeAttribute("tabindex");
      }
      const wrapper = input.closest(".company-phone-display__item");
      if (wrapper) wrapper.classList.toggle("is-visible", idx === 0 || !!value);
    });
  }

  function collectCompanyPhoneInputs() {
    return getCompanyPhoneInputs()
      .map((input) => (input ? input.value.trim() : ""))
      .filter(Boolean)
      .slice(0, MAX_COMPANY_PHONE_COUNT);
  }

  function persistCompanyProfile() {
    if (typeof w.electronAPI?.saveCompanyData !== "function") return;
    const companySnapshot = { ...(state().company || {}) };
    if ("smtp" in companySnapshot) delete companySnapshot.smtp;
    if ("smtpProfiles" in companySnapshot) delete companySnapshot.smtpProfiles;
    if ("smtpPreset" in companySnapshot) delete companySnapshot.smtpPreset;
    w.electronAPI
      .saveCompanyData(companySnapshot)
      .catch((err) => console.warn("company/saveCompanyData failed", err));
  }

  function persistSmtpSettings(payload) {
    if (typeof w.electronAPI?.saveSmtpSettings !== "function") return;
    const settingsPayload = payload && typeof payload === "object" ? payload : {};
    w.electronAPI
      .saveSmtpSettings(settingsPayload)
      .catch((err) => console.warn("smtp/saveSmtpSettings failed", err));
  }

  function updateCompanyPhoneStateFromInputs(values) {
    const phones = Array.isArray(values) ? values : collectCompanyPhoneInputs();
    const formatted = formatCompanyPhoneList(phones);
    state().company.phone = formatted;
    if (!SEM.COMPANY_LOCKED) {
      persistCompanyProfile();
    }
    refreshCompanySummary();
  }

  function updateCompanyLogoImage(src) {
    const logoImages = [
      document.getElementById("companyLogo"),
      document.getElementById("itemsLogo")
    ].filter(Boolean);
    if (!logoImages.length) return;
    logoImages.forEach((logoImage) => {
      if (src) {
        logoImage.dataset.logoState = "set";
        if (logoImage.getAttribute("src") !== src) {
          logoImage.src = src;
        }
        logoImage.classList.remove("company-logo--placeholder");
      } else {
        logoImage.dataset.logoState = "empty";
        logoImage.removeAttribute("src");
        logoImage.classList.add("company-logo--placeholder");
      }
    });
  }
  SEM.updateCompanyLogoImage = updateCompanyLogoImage;

  const COMPANY_SUMMARY_DISPLAY_IDS = {
    name: ["companyNameDisplay", "itemsCompanyName"],
    vat: ["itemsCompanyVat"],
    customsCode: ["companyCustomsDisplay", "itemsCompanyCustoms"],
    iban: ["itemsCompanyIban"],
    phone: ["itemsCompanyPhone"],
    email: ["itemsCompanyEmail"],
    address: ["itemsCompanyAddress"]
  };
  const COMPANY_HEADER_IDS = {
    subtitle: "companyHeaderSubtitle",
    avatarImage: "companyHeaderAvatarImage",
    avatarFallback: "companyHeaderAvatarFallback"
  };

  function computeCompanyInitials(name) {
    const normalized = String(name || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return "FA";
    const letters = normalized
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return letters || "FA";
  }

  function buildCompanyHeaderSubtitle(company = {}) {
    const vat = String(company.vat || "").trim();
    const email = String(company.email || "").trim();
    const phones = parseCompanyPhoneList(company.phone || "");
    const firstPhone = String(phones[0] || "").trim();
    if (vat && email) return { kind: "mf", value: `${vat} | ${email}` };
    if (vat && firstPhone) return { kind: "mf", value: `${vat} | ${firstPhone}` };
    if (vat) return { kind: "mf", value: vat };
    if (email && firstPhone) return { kind: "plain", value: `${email} | ${firstPhone}` };
    if (email) return { kind: "plain", value: email };
    if (firstPhone) return { kind: "plain", value: firstPhone };
    return { kind: "empty", value: "Renseignez les coordonnees de l'entreprise." };
  }

  function refreshCompanyHeader(company = {}) {
    const subtitleEl = getEl(COMPANY_HEADER_IDS.subtitle);
    if (subtitleEl) {
      const subtitle = buildCompanyHeaderSubtitle(company);
      subtitleEl.textContent = "";
      if (subtitle.kind === "mf") {
        const prefix = document.createElement("strong");
        prefix.className = "company-header__subtitle-prefix";
        prefix.textContent = "MF:";
        subtitleEl.appendChild(prefix);
        subtitleEl.appendChild(document.createTextNode(` ${subtitle.value}`));
      } else {
        subtitleEl.textContent = subtitle.value;
      }
      subtitleEl.classList.toggle("is-empty", subtitle.kind === "empty");
    }

    const avatarImageEl = getEl(COMPANY_HEADER_IDS.avatarImage);
    const avatarFallbackEl = getEl(COMPANY_HEADER_IDS.avatarFallback);
    const logoSrc = String(company.logo || "").trim();
    const displayName = String(company.name || "").trim();
    const initials = computeCompanyInitials(displayName);
    if (avatarFallbackEl) {
      avatarFallbackEl.textContent = initials;
      avatarFallbackEl.hidden = !!logoSrc;
    }
    if (avatarImageEl) {
      if (logoSrc) {
        if (avatarImageEl.getAttribute("src") !== logoSrc) {
          avatarImageEl.setAttribute("src", logoSrc);
        }
        avatarImageEl.alt = displayName ? `Logo ${displayName}` : "Logo entreprise";
        avatarImageEl.hidden = false;
      } else {
        avatarImageEl.hidden = true;
        avatarImageEl.removeAttribute("src");
      }
    }
  }

  function refreshCompanySummary() {
    const company = state().company || {};
    Object.entries(COMPANY_SUMMARY_DISPLAY_IDS).forEach(([key, displayIds]) => {
      const ids = Array.isArray(displayIds) ? displayIds : [displayIds];
      ids.forEach((displayId) => {
        const el = getEl(displayId);
        if (!el) return;
        let rawValue = company[key] || "";
        if (key === "phone") {
          const phones = parseCompanyPhoneList(company.phone || "");
          rawValue = phones.length ? phones.join("\n") : "";
        }
        const text = String(rawValue || "").trim();
        if (key === "customsCode" || key === "iban") {
          el.textContent = text;
          el.classList.toggle("is-empty", !text);
          const row =
            el.closest(".company-info-summary__row") ||
            el.closest(".items-party__item") ||
            el.closest(".pdf-meta-line");
          if (row) row.hidden = !text;
          return;
        }
        if (key === "name") {
          const fallbackName = "Societe";
          el.textContent = text || fallbackName;
          el.classList.toggle("is-empty", !text);
          return;
        }
        el.textContent = text || "—";
        el.classList.toggle("is-empty", !text);
      });
    });
    refreshCompanyHeader(company);
  }
  SEM.refreshCompanySummary = refreshCompanySummary;

  const CLIENT_SUMMARY_DISPLAY_IDS = {
    name: "itemsClientName",
    codeClient: "itemsClientCode",
    benefit: "itemsClientBenefit",
    account: "itemsClientAccount",
    vat: "itemsClientVat",
    stegRef: "itemsClientStegRef",
    phone: "itemsClientPhone",
    email: "itemsClientEmail",
    address: "itemsClientAddress"
  };
  const SUPPLIER_PARTY_DOC_TYPES = new Set(["fa", "bc", "be"]);
  const DESTINATION_PARTY_DOC_TYPES = new Set(["bs"]);
  const isSupplierPartyDocType = (docType = state().meta?.docType) =>
    SUPPLIER_PARTY_DOC_TYPES.has(String(docType || "").trim().toLowerCase());
  const resolveItemsPartyCodeLabel = (docType = state().meta?.docType) =>
    isSupplierPartyDocType(docType) ? "Code fournisseur" : "Code client";
  const updateItemsPartyCodeLabel = (docType = state().meta?.docType) => {
    const labelText = resolveItemsPartyCodeLabel(docType);
    document.querySelectorAll("#itemsSection [data-client-field-label=\"codeClient\"]").forEach((node) => {
      node.textContent = labelText;
    });
  };
  const resolveItemsPartyCodeValue = (client = {}, docType = state().meta?.docType) => {
    if (isSupplierPartyDocType(docType)) {
      return (
        client.codeFournisseur ||
        client.code_fournisseur ||
        client.codeClient ||
        client.code_client ||
        client.code ||
        ""
      );
    }
    return (
      client.codeClient ||
      client.code_client ||
      client.code ||
      ""
    );
  };

  const CLIENT_TAX_LABEL_FALLBACK = "Matricule fiscal";
  const CLIENT_TAX_LABEL_PARTICULIER = "CIN / passeport";
  const resolveItemsClientTaxLabel = (client = {}) => {
    const typeRaw = String(client.type || "").toLowerCase();
    const isParticulier = typeRaw === "particulier";
    const defaultLabel = String(w.DEFAULT_CLIENT_FIELD_LABELS?.taxId || CLIENT_TAX_LABEL_FALLBACK);
    const labelState = state().clientFieldLabels || {};
    const customLabel = typeof labelState.taxId === "string" ? labelState.taxId.trim() : "";
    const hasCustomLabel = customLabel && customLabel !== defaultLabel;
    if (hasCustomLabel) return customLabel;
    return isParticulier ? CLIENT_TAX_LABEL_PARTICULIER : defaultLabel;
  };
  const updateItemsClientTaxLabel = (client = {}) => {
    const labelText = resolveItemsClientTaxLabel(client);
    document.querySelectorAll("#itemsSection [data-client-field-label=\"taxId\"]").forEach((node) => {
      node.textContent = labelText;
    });
  };

  function refreshClientSummary() {
    const client = state().client || {};
    Object.entries(CLIENT_SUMMARY_DISPLAY_IDS).forEach(([key, displayIds]) => {
      const ids = Array.isArray(displayIds) ? displayIds : [displayIds];
      let value = client[key];
      if (key === "codeClient") {
        value = resolveItemsPartyCodeValue(client);
      }
      ids.forEach((displayId) => {
        const el = getEl(displayId);
        if (!el) return;
        const text = String(value || "").trim();
        el.textContent = text || "-";
        el.classList.toggle("is-empty", !text);
      });
    });
    updateItemsPartyCodeLabel(state().meta?.docType);
    updateItemsClientTaxLabel(client);
  }
  SEM.refreshClientSummary = refreshClientSummary;

  const formatItemsReceptionTimeValue = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    const hours = String(safeDate.getHours()).padStart(2, "0");
    const minutes = String(safeDate.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const ITEMS_BE_SOURCE_DOC_TYPE_LABELS = {
    fa: "Facture d'achat",
    bc: "Bon de commande"
  };
  const normalizeItemsBeSourceDocType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const aliases = {
      fa: "fa",
      factureachat: "fa",
      "facture d'achat": "fa",
      "facture_achat": "fa",
      "facture-achat": "fa",
      bc: "bc",
      bondecommande: "bc",
      "bon de commande": "bc",
      "bon_de_commande": "bc",
      "bon-de-commande": "bc"
    };
    return aliases[raw] || "";
  };
  const normalizeItemsBeSourceSelection = (value) => {
    const raw = value && typeof value === "object" ? value : {};
    const rawSupplier = raw.supplier && typeof raw.supplier === "object" ? raw.supplier : {};
    const rawItems = Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.documents)
        ? raw.documents
        : [];
    const items = rawItems
      .map((entry, index) => {
        const item = entry && typeof entry === "object" ? entry : {};
        const id = String(item.id || "").trim();
        const path = String(item.path || "").trim();
        const number = String(item.number || "").trim();
        const date = String(item.date || "").trim();
        const clientName = String(item.clientName || "").trim();
        const clientPath = String(item.clientPath || "").trim();
        const displayName = String(item.displayName || item.name || number || "").trim() || `Document ${index + 1}`;
        const docType = normalizeItemsBeSourceDocType(
          item.docType || item.type || raw.docType || raw.type || ""
        );
        const key =
          String(item.key || "").trim() ||
          (id ? `id:${id}` : path ? `path:${path}` : number ? `number:${number}:${index}` : `idx:${index}`);
        if (!id && !path && !number && !displayName) return null;
        return { key, id, path, number, date, displayName, docType, clientName, clientPath };
      })
      .filter(Boolean);
    const docType = normalizeItemsBeSourceDocType(
      raw.docType || raw.type || items[0]?.docType || ""
    );
    if (!items.length || !docType) return null;
    const supplierPath = String(rawSupplier.path || items[0]?.clientPath || "").trim();
    const supplierName = String(rawSupplier.name || items[0]?.clientName || "").trim();
    const supplierLabel = String(rawSupplier.label || supplierName || "").trim();
    const supplierIdentifier = String(rawSupplier.identifier || "").trim();
    return {
      docType,
      supplier:
        supplierPath || supplierName || supplierLabel || supplierIdentifier
          ? {
              path: supplierPath,
              name: supplierName,
              label: supplierLabel || supplierName,
              identifier: supplierIdentifier
            }
          : null,
      items: items.map((item) => ({
        ...item,
        docType: item.docType || docType
      }))
    };
  };
  const normalizeItemsBeImportedSourceKeys = (value = [], fallbackSelection = null) => {
    const fallbackItems = normalizeItemsBeSourceSelection(fallbackSelection)?.items || [];
    const hasExplicitValue =
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && !String(value).trim());
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];
    const seen = new Set();
    return [...source, ...(!hasExplicitValue ? fallbackItems.map((entry) => entry?.key || "") : [])]
      .map((entry) => String(entry || "").trim())
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const formatItemsBeSourceSelectionText = (selection) => {
    const normalized = normalizeItemsBeSourceSelection(selection);
    if (!normalized) return "";
    const label = ITEMS_BE_SOURCE_DOC_TYPE_LABELS[normalized.docType] || "Document";
    const refs = normalized.items
      .map((item) => String(item.number || item.displayName || "").trim())
      .filter(Boolean);
    if (!refs.length) return label;
    return `${label} : ${refs.join(", ")}`;
  };
  const normalizeItemsBeDestinationIds = (value = []) => {
    const source = Array.isArray(value) ? value : [value];
    const seen = new Set();
    return source
      .map((entry) =>
        String(entry ?? "")
          .trim()
          .replace(/^sqlite:\/\/emplacements\//i, "")
      )
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const normalizeItemsBeDestinationLabels = (value = []) => {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [value];
    return source
      .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  };
  const formatItemsBeDestinationText = (labels = []) =>
    normalizeItemsBeDestinationLabels(labels).join(", ");
  const normalizeItemsBsLocationIds = (value = []) => {
    const source = Array.isArray(value) ? value : [value];
    const seen = new Set();
    return source
      .map((entry) =>
        String(entry ?? "")
          .trim()
          .replace(/^sqlite:\/\/emplacements\//i, "")
      )
      .filter((entry) => {
        if (!entry) return false;
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const normalizeItemsBsLocationLabels = (value = []) => {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [value];
    return source
      .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  };
  const formatItemsBsLocationText = (labels = []) =>
    normalizeItemsBsLocationLabels(labels).join(", ");
  const normalizeItemsBeReceptionMeta = (metaInput = null) => {
    const meta =
      metaInput && typeof metaInput === "object"
        ? metaInput
        : (state().meta || (state().meta = {}));
    const raw = meta.beReception && typeof meta.beReception === "object" ? meta.beReception : {};
    const docType = String(meta.docType || "").trim().toLowerCase();
    const normalizedSourceSelection = normalizeItemsBeSourceSelection(
      raw.sourceSelection ?? raw.sourceDocuments ?? raw.sourceDocs ?? meta.beSourceSelection ?? null
    );
    const destinationIds = normalizeItemsBeDestinationIds(
      raw.destinationIds ??
        raw.destinationIdList ??
        raw.destinationSelection?.ids ??
        raw.destinationSelection ??
        raw.destinationId ??
        raw.destinationLocationId ??
        raw.locationId ??
        raw.emplacementId ??
        raw.emplacement_id ??
        meta.beReceptionDestinationIds ??
        meta.beReceptionDestinationId ??
        []
    );
    const destinationLabels = normalizeItemsBeDestinationLabels(
      raw.destinationLabels ??
        raw.destinationLabelList ??
        raw.destinationSelection?.labels ??
        []
    );
    const normalized = {
      depot: String(raw.depot ?? raw.depotName ?? meta.beReceptionDepot ?? meta.beDepot ?? "").trim(),
      depotId: String(
        raw.depotId ?? raw.depotDbId ?? raw.magasinId ?? raw.magasin_id ?? meta.beReceptionDepotId ?? ""
      )
        .trim()
        .replace(/^sqlite:\/\/depots\//i, ""),
      destination: String(
        raw.destination ??
          raw.destinationLocation ??
          raw.location ??
          meta.beReceptionDestination ??
          meta.beDestination ??
          ""
      ).trim(),
      destinationId: String(
        destinationIds[0] ??
          raw.destinationId ??
          raw.destinationLocationId ??
          raw.locationId ??
          raw.emplacementId ??
          raw.emplacement_id ??
          meta.beReceptionDestinationId ??
          ""
      )
        .trim()
        .replace(/^sqlite:\/\/emplacements\//i, ""),
      destinationIds,
      destinationLabels,
      date: String(raw.date ?? raw.receptionDate ?? meta.beReceptionDate ?? "").trim(),
      time: String(raw.time ?? raw.receptionTime ?? meta.beReceptionTime ?? "").trim(),
      sourceRef: String(
        raw.sourceRef ??
          raw.referenceSource ??
          raw.source ??
          meta.beSourceRef ??
          ""
      ).trim(),
      sourceSelection: normalizedSourceSelection,
      importedSourceKeys: normalizeItemsBeImportedSourceKeys(
        raw.importedSourceKeys ??
          raw.sourceImportedKeys ??
          raw.importedSources ??
          meta.beSourceImportedKeys,
        normalizedSourceSelection
      )
    };
    if (!normalized.sourceRef && normalized.sourceSelection) {
      normalized.sourceRef = formatItemsBeSourceSelectionText(normalized.sourceSelection);
    }
    if (normalized.destinationLabels.length && !normalized.destination) {
      normalized.destination = formatItemsBeDestinationText(normalized.destinationLabels);
    }
    if (normalized.destination && !normalized.destinationLabels.length) {
      normalized.destinationLabels = normalizeItemsBeDestinationLabels(normalized.destination);
    }
    if (docType === "be") {
      if (!normalized.date) {
        normalized.date = String(meta.date || "").trim() || new Date().toISOString().slice(0, 10);
      }
      if (!normalized.time) {
        normalized.time = formatItemsReceptionTimeValue();
      }
    }
    meta.beReception = normalized;
    return normalized;
  };
  function refreshBonEntreeReceptionSummary() {
    const meta = state().meta || (state().meta = {});
    const block = getEl("itemsBeReceptionBlock");
    if (!block) return;
    const isBonEntree = String(meta.docType || "facture").trim().toLowerCase() === "be";
    const reception = normalizeItemsBeReceptionMeta(meta);
    const fields = [
      ["depot", "itemsBeReceptionDepotRow", "itemsBeReceptionDepot"],
      ["destination", "itemsBeReceptionDestinationRow", "itemsBeReceptionDestination"],
      ["date", "itemsBeReceptionDateRow", "itemsBeReceptionDate"],
      ["time", "itemsBeReceptionTimeRow", "itemsBeReceptionTime"],
      ["sourceRef", "itemsBeReceptionSourceRow", "itemsBeReceptionSource"]
    ];
    let visibleCount = 0;
    fields.forEach(([key, rowId, valueId]) => {
      const row = getEl(rowId);
      const valueEl = getEl(valueId);
      const text = String(reception?.[key] || "").trim();
      if (valueEl) {
        valueEl.textContent = text || "-";
        valueEl.classList.toggle("is-empty", !text);
      }
      const show = isBonEntree && !!text;
      if (row) {
        row.hidden = !show;
        row.style.display = show ? "" : "none";
      }
      if (show) visibleCount += 1;
    });
    const showBlock = isBonEntree && visibleCount > 0;
    block.hidden = !showBlock;
    block.style.display = showBlock ? "" : "none";
  }
  SEM.refreshBonEntreeReceptionSummary = refreshBonEntreeReceptionSummary;

  const normalizeItemsBsSortieMeta = (metaInput = null) => {
    const meta =
      metaInput && typeof metaInput === "object"
        ? metaInput
        : (state().meta || (state().meta = {}));
    const raw = meta.bsSortie && typeof meta.bsSortie === "object" ? meta.bsSortie : {};
    const docType = String(meta.docType || "").trim().toLowerCase();
    const locationIds = normalizeItemsBsLocationIds(
      raw.locationIds ??
        raw.locationIdList ??
        raw.locationSelection?.ids ??
        raw.locationSelection ??
        raw.locationId ??
        raw.destinationId ??
        raw.emplacementId ??
        raw.emplacement_id ??
        meta.bsLocationIds ??
        meta.bsLocationId ??
        []
    );
    const locationLabels = normalizeItemsBsLocationLabels(
      raw.locationLabels ??
        raw.locationLabelList ??
        raw.locationSelection?.labels ??
        []
    );
    const normalized = {
      depot: String(raw.depot ?? raw.depotName ?? raw.magasin ?? meta.bsDepot ?? "").trim(),
      depotId: String(
        raw.depotId ?? raw.depotDbId ?? raw.magasinId ?? raw.magasin_id ?? meta.bsDepotId ?? ""
      )
        .trim()
        .replace(/^sqlite:\/\/depots\//i, ""),
      location: String(raw.location ?? raw.emplacement ?? raw.destination ?? meta.bsLocation ?? "").trim(),
      locationId: String(
        locationIds[0] ??
          raw.locationId ??
          raw.destinationId ??
          raw.emplacementId ??
          raw.emplacement_id ??
          meta.bsLocationId ??
          ""
      )
        .trim()
        .replace(/^sqlite:\/\/emplacements\//i, ""),
      locationIds,
      locationLabels,
      date: String(raw.date ?? raw.sortieDate ?? raw.movementDate ?? meta.bsSortieDate ?? "").trim(),
      time: String(raw.time ?? raw.sortieTime ?? raw.movementTime ?? meta.bsSortieTime ?? "").trim(),
      sourceRef: String(raw.sourceRef ?? raw.referenceSource ?? raw.source ?? meta.bsSourceRef ?? "").trim(),
      transporter: String(raw.transporter ?? raw.transporteur ?? meta.bsTransporter ?? "").trim(),
      driverName: String(raw.driverName ?? raw.chauffeur ?? meta.bsDriverName ?? "").trim(),
      vehiclePlate: String(raw.vehiclePlate ?? raw.vehicle ?? raw.matriculeVehicule ?? meta.bsVehiclePlate ?? "").trim(),
      transportMode: String(raw.transportMode ?? raw.modeTransport ?? meta.bsTransportMode ?? "").trim(),
      exitReason: String(raw.exitReason ?? raw.reason ?? raw.motifSortie ?? meta.bsExitReason ?? "").trim()
    };
    if (normalized.locationLabels.length && !normalized.location) {
      normalized.location = formatItemsBsLocationText(normalized.locationLabels);
    }
    if (normalized.location && !normalized.locationLabels.length) {
      normalized.locationLabels = normalizeItemsBsLocationLabels(normalized.location);
    }
    if (docType === "bs" && !normalized.date) {
      normalized.date = String(meta.date || "").trim() || new Date().toISOString().slice(0, 10);
    }
    meta.bsSortie = normalized;
    meta.bsDepot = normalized.depot;
    meta.bsDepotId = normalized.depotId;
    meta.bsLocation = normalized.location;
    meta.bsLocationId = normalized.locationId;
    meta.bsLocationIds = normalized.locationIds;
    meta.bsLocationLabels = normalized.locationLabels;
    return normalized;
  };
  function refreshBonSortieSummary() {
    const meta = state().meta || (state().meta = {});
    const sortieBlock = getEl("itemsBsSortieBlock");
    const transportBlock = getEl("itemsBsTransportBlock");
    const contextRow = getEl("itemsBsContextRow");
    if (!sortieBlock && !transportBlock && !contextRow) return;
    const isBonSortie = String(meta.docType || "facture").trim().toLowerCase() === "bs";
    const sortie = normalizeItemsBsSortieMeta(meta);
    const sortieFields = [
      ["depot", "itemsBsSortieDepotRow", "itemsBsSortieDepot"],
      ["location", "itemsBsSortieLocationRow", "itemsBsSortieLocation"],
      ["date", "itemsBsSortieDateRow", "itemsBsSortieDate"],
      ["time", "itemsBsSortieTimeRow", "itemsBsSortieTime"],
      ["sourceRef", "itemsBsSortieSourceRow", "itemsBsSortieSource"]
    ];
    const transportFields = [
      ["transporter", "itemsBsTransporterRow", "itemsBsTransporter"],
      ["driverName", "itemsBsDriverNameRow", "itemsBsDriverName"],
      ["vehiclePlate", "itemsBsVehiclePlateRow", "itemsBsVehiclePlate"],
      ["transportMode", "itemsBsTransportModeRow", "itemsBsTransportMode"],
      ["exitReason", "itemsBsExitReasonRow", "itemsBsExitReason"]
    ];
    let visibleSortieCount = 0;
    let visibleTransportCount = 0;
    const renderField = ([key, rowId, valueId], incrementCounter) => {
      const row = getEl(rowId);
      const valueEl = getEl(valueId);
      const text = String(sortie?.[key] || "").trim();
      if (valueEl) {
        valueEl.textContent = text || "-";
        valueEl.classList.toggle("is-empty", !text);
      }
      const show = isBonSortie && !!text;
      if (row) {
        row.hidden = !show;
        row.style.display = show ? "" : "none";
      }
      if (show) incrementCounter();
    };
    sortieFields.forEach((field) => renderField(field, () => { visibleSortieCount += 1; }));
    transportFields.forEach((field) => renderField(field, () => { visibleTransportCount += 1; }));
    if (sortieBlock) {
      const showSortieBlock = isBonSortie && visibleSortieCount > 0;
      sortieBlock.hidden = !showSortieBlock;
      sortieBlock.style.display = showSortieBlock ? "" : "none";
    }
    if (transportBlock) {
      const showTransportBlock = isBonSortie && visibleTransportCount > 0;
      transportBlock.hidden = !showTransportBlock;
      transportBlock.style.display = showTransportBlock ? "" : "none";
    }
    if (contextRow) {
      const showSortieBlock = isBonSortie && visibleSortieCount > 0;
      const showTransportBlock = isBonSortie && visibleTransportCount > 0;
      const visibleCount = (showSortieBlock ? 1 : 0) + (showTransportBlock ? 1 : 0);
      contextRow.hidden = visibleCount < 1;
      contextRow.style.display = visibleCount > 0 ? "" : "none";
      if (visibleCount > 0) {
        contextRow.dataset.visibleCount = String(visibleCount);
      } else {
        delete contextRow.dataset.visibleCount;
      }
    }
  }
  SEM.refreshBonSortieSummary = refreshBonSortieSummary;

  const DOC_TYPE_SUMMARY_LABELS = {
    facture: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    fa: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    devis: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    bl: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    bc: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    be: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    bs: {
      number: "N\u00B0 :",
      date: "Date :"
    },
    avoir: {
      number: "N\u00B0 :",
      date: "Date :"
    }
  };

  const DOC_TYPE_TITLES = {
    facture: "FACTURE",
    fa: "FACTURE D'ACHAT",
    devis: "DEVIS",
    bl: "BON DE LIVRAISON",
    bc: "BON DE COMMANDE",
    be: "BON D\u2019ENTR\u00C9E",
    bs: "BON DE SORTIE",
    avoir: "FACTURE D'AVOIR"
  };

  function updateItemsMetaSummaryLabels(docType) {
    const normalized = String(docType || state().meta?.docType || "facture").toLowerCase();
    const labels = DOC_TYPE_SUMMARY_LABELS[normalized] || DOC_TYPE_SUMMARY_LABELS.facture;
    const numberLabelEl = getEl("itemsInvoiceNumberLabel");
    const dateLabelEl = getEl("itemsInvoiceDateLabel");
    const docTitleEl = getEl("itemsDocTitle");
    const partyLegendEl = getEl("itemsPartyLegend");
    if (numberLabelEl && labels?.number) numberLabelEl.textContent = labels.number;
    if (dateLabelEl && labels?.date) dateLabelEl.textContent = labels.date;
    if (docTitleEl) {
      docTitleEl.textContent = DOC_TYPE_TITLES[normalized] || DOC_TYPE_TITLES.facture;
    }
    if (partyLegendEl) {
      partyLegendEl.textContent = SUPPLIER_PARTY_DOC_TYPES.has(normalized)
        ? "Fournisseur"
        : DESTINATION_PARTY_DOC_TYPES.has(normalized)
          ? "Destinataire"
          : "Client";
    }
    updateItemsPartyCodeLabel(normalized);
  }
  SEM.updateItemsMetaSummaryLabels = updateItemsMetaSummaryLabels;

  function refreshInvoiceSummary() {
    const meta = state().meta || {};
    updateItemsMetaSummaryLabels(meta.docType);
    const entries = [
      ["itemsInvoiceNumber", meta.number],
      ["itemsInvoiceDate", meta.date]
    ];
    entries.forEach(([id, value]) => {
      const el = getEl(id);
      if (!el) return;
      const text = String(value || "").trim();
      el.textContent = text || "-";
      el.classList.toggle("is-empty", !text);
    });
    refreshBonEntreeReceptionSummary();
    refreshBonSortieSummary();
  }
  SEM.refreshInvoiceSummary = refreshInvoiceSummary;

  const getWhNoteEditorHtml = (editor) => {
    return editor?.innerHTML || "";
  };

  const setWhNoteEditorHtml = (editor, html = "") => {
    if (!editor) return;
    editor.innerHTML = html;
  };

  function sanitizeWhNoteForEditor(raw = "") {
    if (typeof document === "undefined") return String(raw ?? "");
    const normalized = normalizeWhNoteFromEditor(String(raw ?? ""));
    const sized = ensureWhNoteSizeWrapper(normalized, WH_NOTE_DEFAULT_FONT_SIZE);
    return sized
      .replace(/<(span|div) data-size="(\d{1,3})"([^>]*)>/g, (_, tag, size, attrs) => {
        return `<${tag} data-size="${size}"${attrs || ""} style="font-size:${size}px"${tag === "div" ? ' data-size-root="true"' : ""}>`;
      });
  }

  function normalizeWhNoteFromEditor(html = "") {
    if (typeof document === "undefined") return String(html ?? "");
    const normalizedHTML = String(html ?? "")
      .replace(/\r\n|\r/g, "\n")
      .replace(/\n/g, "<br>");
    const container = document.createElement("div");
    container.innerHTML = normalizedHTML || "";

    container.querySelectorAll("ol").forEach((list) => {
      const items = Array.from(list.children || []).filter(
        (child) => child?.nodeType === Node.ELEMENT_NODE && child.tagName?.toLowerCase() === "li"
      );
      if (!items.length) return;
      const hasDataList = items.some((item) => item.hasAttribute("data-list"));
      if (!hasDataList) return;
      const isBulletList = items.every(
        (item) => String(item.getAttribute("data-list") || "").toLowerCase() === "bullet"
      );
      items.forEach((item) => item.removeAttribute("data-list"));
      if (!isBulletList) return;
      const ul = document.createElement("ul");
      while (list.firstChild) {
        ul.appendChild(list.firstChild);
      }
      list.replaceWith(ul);
    });
    container.querySelectorAll("li[data-list]").forEach((item) => item.removeAttribute("data-list"));

    const allowed = new Set(["strong", "em", "ul", "ol", "li", "br", "span", "div"]);
    const resolveNodeSize = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
      const direct = normalizeWhNoteFontSize(node.getAttribute("data-size"));
      if (direct) return direct;
      const inline = normalizeWhNoteFontSize(node.style?.fontSize || "");
      if (inline) return inline;
      if (node.classList?.contains("ql-size-small")) return 10;
      if (node.classList?.contains("ql-size-large")) return 14;
      if (node.classList?.contains("ql-size-huge")) return 14;
      return null;
    };
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(
          node.textContent
            .replace(/\u00A0/g, " ")
            .replace(/\u200b/g, "")
        );
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (tag === "span" || tag === "div") {
        const size = resolveNodeSize(node);
        if (!size) {
          const isBlock = WH_NOTE_BLOCK_TAGS.has(tag);
          if (isBlock) pushWhNoteBreak(parts);
          node.childNodes.forEach(walk);
          if (isBlock) pushWhNoteBreak(parts);
          return;
        }
        const isRoot = tag === "div" && node.getAttribute("data-size-root");
        const open = `<div data-size="${size}"${isRoot ? ' data-size-root="true"' : ""}>`;
        const close = `</div>`;
        parts.push(tag === "span" ? `<span data-size="${size}">` : open);
        node.childNodes.forEach(walk);
        parts.push(tag === "span" ? `</span>` : close);
        return;
      }
      if (!allowed.has(tag) && !(tag === "b" || tag === "i")) {
        const isBlock = WH_NOTE_BLOCK_TAGS.has(tag);
        if (isBlock) pushWhNoteBreak(parts);
        node.childNodes.forEach(walk);
        if (isBlock) pushWhNoteBreak(parts);
        return;
      }
      const normalizedTag =
        tag === "b" ? "strong" :
        tag === "i" ? "em" :
        tag;
      if (normalizedTag === "br") {
        parts.push("<br>");
        return;
      }
      parts.push(`<${normalizedTag}>`);
      node.childNodes.forEach(walk);
      parts.push(`</${normalizedTag}>`);
    };
    container.childNodes.forEach(walk);
    let result = parts.join("");
    result = result.replace(/(<br>){3,}/g, "<br><br>");
    result = result.replace(/^(<br>)+/, "");
    result = result.replace(/(<br>)+$/, "");
    return result;
  }

  function normalizeFooterNoteFromEditor(html = "") {
    if (typeof document === "undefined") return String(html ?? "");
    const normalizedHTML = String(html ?? "")
      .replace(/\r\n|\r/g, "\n")
      .replace(/\n/g, "<br>");
    const container = document.createElement("div");
    container.innerHTML = normalizedHTML || "";
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(
          node.textContent
            .replace(/\u00A0/g, " ")
            .replace(/\u200b/g, "")
        );
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      let tag = node.tagName.toLowerCase();
      if (tag === "b") tag = "strong";
      if (tag === "i") tag = "em";
      if (tag === "span" || tag === "div") {
        const size = normalizeFooterNoteFontSize(node.getAttribute("data-size"));
        if (!size) {
          const isBlock = FOOTER_NOTE_BLOCK_TAGS.has(tag);
          if (isBlock) pushFooterNoteBreak(parts);
          node.childNodes.forEach(walk);
          if (isBlock) pushFooterNoteBreak(parts);
          return;
        }
        const isRoot = tag === "div" && node.getAttribute("data-size-root");
        const open = `<div data-size="${size}"${isRoot ? ' data-size-root="true"' : ""}>`;
        parts.push(tag === "span" ? `<span data-size="${size}">` : open);
        node.childNodes.forEach(walk);
        parts.push(tag === "span" ? "</span>" : "</div>");
        return;
      }
      if (!FOOTER_NOTE_ALLOWED_TAGS.has(tag)) {
        const isBlock = FOOTER_NOTE_BLOCK_TAGS.has(tag);
        if (isBlock) pushFooterNoteBreak(parts);
        node.childNodes.forEach(walk);
        if (isBlock) pushFooterNoteBreak(parts);
        return;
      }
      if (tag === "br") {
        parts.push("<br>");
        return;
      }
      parts.push(`<${tag}>`);
      node.childNodes.forEach(walk);
      parts.push(`</${tag}>`);
    };
    container.childNodes.forEach(walk);
    let result = parts.join("");
    result = result.replace(/(<br>){3,}/g, "<br><br>");
    result = result.replace(/^(<br>)+/, "");
    result = result.replace(/(<br>)+$/, "");
    return result;
  }

  function sanitizeFooterNoteForEditor(raw = "") {
    if (typeof document === "undefined") return String(raw ?? "");
    const normalized = normalizeFooterNoteFromEditor(String(raw ?? ""));
    const sized = ensureFooterNoteSizeWrapper(normalized, FOOTER_NOTE_DEFAULT_FONT_SIZE);
    return sized.replace(/<(span|div) data-size="(\d{1,3})"([^>]*)>/g, (_match, tag, size, attrs) => {
      const normalizedSize = normalizeFooterNoteFontSize(size) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
      const attrsValue = attrs || "";
      const hasRoot = /data-size-root\s*=\s*"?true"?/i.test(attrsValue);
      const rootAttr = tag === "div" && !hasRoot ? ' data-size-root="true"' : "";
      return `<${tag} data-size="${normalizedSize}"${attrsValue}${rootAttr} style="font-size:${normalizedSize}px">`;
    });
  }

  function updateWhNotePlaceholder(editor) {
    if (!editor && typeof document !== "undefined") {
      editor = getEl("whNoteEditor");
    }
    if (!editor) return;
    const text = (editor.textContent || "")
      .replace(/\u00A0/g, " ")
      .replace(/\u200b/g, "")
      .trim();
    editor.dataset.empty = text ? "false" : "true";
  }

  function updateFooterNotePlaceholder(editor) {
    if (!editor && typeof document !== "undefined") {
      editor = getEl("footerNoteEditor");
    }
    if (!editor) return;
    const text = editor.textContent
      .replace(/\u00A0/g, " ")
      .replace(/\u200b/g, "")
      .trim();
    editor.dataset.empty = text ? "false" : "true";
  }

  function setWhNoteEditorContent(value = "", opts = {}) {
    if (typeof document === "undefined") return;
    const group = opts.group || "main";
    const { editors, hiddens, sizeSelects } = getAllWhNoteNodes(group);
    if (!editors.length && !hiddens.length) return;
    const rawValue = typeof value === "string" ? value : "";

    if (group === "modal") {
      const lexicalModalApi = getWhNoteLexicalModalApi();
      if (typeof lexicalModalApi?.setContent === "function") {
        hiddens.forEach((hidden) => {
          hidden.value = rawValue;
        });
        lexicalModalApi.setContent(rawValue, { syncHidden: false, source: "shared-set" });
        return;
      }
    }

    const sanitized = sanitizeWhNoteForEditor(value || "");
    const sizeMatch = sanitized.match(/data-size="(\d{1,3})"/);
    const resolvedSize = normalizeWhNoteFontSize(sizeMatch?.[1]) ?? WH_NOTE_DEFAULT_FONT_SIZE;
    editors.forEach((editor) => {
      setWhNoteEditorHtml(editor, sanitized);
      updateWhNotePlaceholder(editor);
    });
    hiddens.forEach((hidden) => {
      hidden.value = rawValue;
    });
    sizeSelects.forEach((select) => {
      select.value = String(resolvedSize);
    });
  }

  function setFooterNoteEditorContent(value = "", opts = {}) {
    if (typeof document === "undefined") return "";
    const editor = getEl("footerNoteEditor");
    const hidden = getEl("footerNote");
    const sizeSelect = getEl("footerNoteFontSize");
    if (!editor && !hidden && !sizeSelect) return "";
    const requested = opts.size ?? sizeSelect?.value;
    const preferredSize = normalizeFooterNoteFontSize(requested) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    const serialized = ensureFooterNoteSizeWrapper(normalizeFooterNoteFromEditor(value || ""), preferredSize);
    const rendered = sanitizeFooterNoteForEditor(serialized);
    if (editor) {
      editor.innerHTML = rendered;
      updateFooterNotePlaceholder(editor);
    }
    if (hidden) hidden.value = serialized;
    if (sizeSelect) {
      const resolved = resolveFooterNoteRootSize(serialized, preferredSize);
      sizeSelect.value = String(resolved);
    }
    return serialized;
  }

  function syncWhNoteStateFromEditor(sourceEditor, { clean = true, group: groupHint } = {}) {
    if (typeof document === "undefined") return;
    const ctx = getWhNoteContext(sourceEditor, groupHint);
    const group = ctx.group || "main";
    const { editors, hiddens, sizeSelects } = getAllWhNoteNodes(group);
    if (!editors.length || !hiddens.length) return;
    const editor = ctx.editor || (sourceEditor && sourceEditor.nodeType ? sourceEditor : editors[0]);
    if (!editor) return;
    if (clean) cleanWhNoteEditor(editor);
    const sizeSelect = ctx.sizeSelect || sizeSelects[0];
    const preferredSize = normalizeWhNoteFontSize(sizeSelect?.value) ?? WH_NOTE_DEFAULT_FONT_SIZE;
    const sourceHtml = getWhNoteEditorHtml(editor);
    const serialized = ensureWhNoteSizeWrapper(normalizeWhNoteFromEditor(sourceHtml), preferredSize);
    hiddens.forEach((hidden) => {
      hidden.value = serialized;
    });
    if (group === "main" && state().meta?.withholding) state().meta.withholding.note = serialized;
    const sanitized = sanitizeWhNoteForEditor(serialized);
    editors.forEach((ed) => {
      if (ed !== editor) setWhNoteEditorHtml(ed, sanitized);
      updateWhNotePlaceholder(ed);
    });
    sizeSelects.forEach((select) => {
      select.value = String(preferredSize);
    });
    if (typeof scheduleModelPreviewUpdate === "function") scheduleModelPreviewUpdate();
    SEM.updateAmountWordsBlock?.();
  }

  function syncWhNoteEditorFromHidden(group = "main") {
    resolveWhNoteGroups(group).forEach((key) => {
      const cfg = WH_NOTE_GROUPS[key];
      const hidden = cfg ? getEl(cfg.hiddenId) : null;
      if (!hidden) return;
      setWhNoteEditorContent(hidden.value || "", { group: key });
    });
  }

  SEM.updateWhNoteEditor = function (value, opts = {}) {
    const group = opts.group || "main";
    const hiddenId = WH_NOTE_GROUPS[group]?.hiddenId || "whNote";
    const resolved =
      value !== undefined && value !== null
        ? String(value)
        : (getEl(hiddenId)?.value || "");
    setWhNoteEditorContent(resolved, { group });
    const { hiddens } = getAllWhNoteNodes(group);
    hiddens.forEach((hidden) => {
      hidden.value = resolved;
    });
    if (group === "main" && state().meta?.withholding) state().meta.withholding.note = resolved;
    if (typeof scheduleModelPreviewUpdate === "function") scheduleModelPreviewUpdate();
    SEM.updateAmountWordsBlock?.();
  };

  SEM.updateFooterNoteEditor = function (value, opts = {}) {
    const resolved =
      value !== undefined && value !== null
        ? String(value)
        : (getEl("footerNote")?.value || "");
    const sanitized = setFooterNoteEditorContent(resolved, { size: opts.size });
    const meta = state()?.meta;
    if (meta) {
      if (!meta.extras || typeof meta.extras !== "object") meta.extras = {};
      if (!meta.extras.pdf || typeof meta.extras.pdf !== "object") meta.extras.pdf = {};
      meta.extras.pdf.footerNote = sanitized;
      const sizeSelect = getEl("footerNoteFontSize");
      const resolvedSize = resolveFooterNoteRootSize(
        sanitized,
        normalizeFooterNoteFontSize(opts.size ?? sizeSelect?.value) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE
      );
      if (sizeSelect) sizeSelect.value = String(resolvedSize);
      meta.extras.pdf.footerNoteSize = resolvedSize;
    }
    SEM.updateAmountWordsBlock?.();
  };

  function ensureCompanyPhoneInputsListeners() {
    if (SEM._companyPhoneInputsWired) return;
    SEM._companyPhoneInputsWired = true;
    getCompanyPhoneInputs().forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        const values = collectCompanyPhoneInputs();
        setCompanyPhoneInputs(values);
        updateCompanyPhoneStateFromInputs(values);
      });
    });
  }

  const bindingShared = (SEM.__bindingShared = SEM.__bindingShared || {});
  Object.assign(bindingShared, {
    state,
    getMessage,
    resolveWhNoteGroups,
    normalizeWhNoteFontSize,
    formatSoldClientValue,
    getWhNoteContext,
    cleanWhNoteEditor,
    parseCompanyPhoneList,
    formatCompanyPhoneList,
    getCompanyPhoneInputs,
    setCompanyPhoneInputs,
    collectCompanyPhoneInputs,
    persistCompanyProfile,
    persistSmtpSettings,
    updateCompanyPhoneStateFromInputs,
    updateCompanyLogoImage,
    refreshCompanySummary,
    refreshClientSummary,
    updateItemsMetaSummaryLabels,
    refreshInvoiceSummary,
    refreshBonSortieSummary,
    sanitizeWhNoteForEditor,
    normalizeWhNoteFromEditor,
    updateWhNotePlaceholder,
    normalizeFooterNoteFontSize,
    ensureFooterNoteSizeWrapper,
    resolveFooterNoteRootSize,
    normalizeFooterNoteFromEditor,
    sanitizeFooterNoteForEditor,
    updateFooterNotePlaceholder,
    setWhNoteEditorContent,
    setFooterNoteEditorContent,
    syncWhNoteStateFromEditor,
    syncWhNoteEditorFromHidden,
    ensureCompanyPhoneInputsListeners
  });

  const sharedConstants = (bindingShared.constants = bindingShared.constants || {});
  sharedConstants.COMPANY_PHONE_INPUT_IDS = COMPANY_PHONE_INPUT_IDS.slice();
  sharedConstants.MAX_COMPANY_PHONE_COUNT = MAX_COMPANY_PHONE_COUNT;
  sharedConstants.WH_NOTE_FONT_SIZES = WH_NOTE_FONT_SIZES.slice();
  sharedConstants.WH_NOTE_DEFAULT_FONT_SIZE = WH_NOTE_DEFAULT_FONT_SIZE;
  sharedConstants.WH_NOTE_GROUPS = WH_NOTE_GROUPS;
  sharedConstants.FOOTER_NOTE_FONT_SIZES = FOOTER_NOTE_FONT_SIZES.slice();
  sharedConstants.FOOTER_NOTE_DEFAULT_FONT_SIZE = FOOTER_NOTE_DEFAULT_FONT_SIZE;
})(window);
