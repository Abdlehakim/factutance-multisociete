(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const normalizeClientType = (value) => {
    const normalized = String(value || "").toLowerCase();
    return normalized === "particulier" || normalized === "personne_physique" ? normalized : "societe";
  };
  const formatSoldClientValue = (value) => {
    const cleaned = String(value ?? "").replace(",", ".").trim();
    if (!cleaned) return "";
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return String(value ?? "").trim();
    return num.toFixed(3);
  };

  const CLIENT_SNAPSHOT_FIELDS = [
    "type",
    "name",
    "benefit",
    "account",
    "soldClient",
    "vat",
    "stegRef",
    "phone",
    "email",
    "address",
    "__path"
  ];
  SEM.clientFormBaseline = null;
  SEM.clientFormDirty = false;
  SEM.clientFormAllowUpdate = false;
  SEM.clientUpdateInProgress = false;
  const CLIENT_CONTENT_FIELD_STATE_KEYS = {
    clientName: "name",
    clientBeneficiary: "benefit",
    clientAccount: "account",
    clientSoldClient: "soldClient",
    clientVat: "vat",
    clientStegRef: "stegRef",
    clientPhone: "phone",
    clientEmail: "email",
    clientAddress: "address"
  };
  const CLIENT_SNAPSHOT_FIELD_STATE_KEYS = {
    clientType: "type",
    ...CLIENT_CONTENT_FIELD_STATE_KEYS
  };
  const CLIENT_CONTENT_FIELD_IDS = Object.keys(CLIENT_CONTENT_FIELD_STATE_KEYS);
  const CLIENT_VENDOR_ID_ALIASES = {
    clientType: "fournisseurType",
    clientName: "fournisseurName",
    clientBeneficiary: "fournisseurBeneficiary",
    clientAccount: "fournisseurAccount",
    clientSoldClient: "fournisseurSoldClient",
    clientVat: "fournisseurVat",
    clientStegRef: "fournisseurStegRef",
    clientPhone: "fournisseurPhone",
    clientEmail: "fournisseurEmail",
    clientAddress: "fournisseurAddress",
    clientIdLabel: "fournisseurIdLabel",
    btnSaveClient: "btnSaveFournisseur",
    btnUpdateClient: "btnUpdateFournisseur",
    btnNewClient: "btnNewFournisseur"
  };
  const CLIENT_VENDOR_ID_REVERSE = Object.entries(CLIENT_VENDOR_ID_ALIASES).reduce(
    (acc, [clientId, vendorId]) => {
      if (vendorId) acc[vendorId] = clientId;
      return acc;
    },
    {}
  );
  const uniqIds = (ids = []) => Array.from(new Set(ids.filter(Boolean)));
  const toCanonicalClientFormId = (id) =>
    CLIENT_VENDOR_ID_REVERSE[id] || id;
  const resolveClientFormIdCandidates = (id, scopeNode = null) => {
    const canonical = toCanonicalClientFormId(id);
    const vendorId = CLIENT_VENDOR_ID_ALIASES[canonical] || "";
    const entityType = resolveClientEntityTypeFromScope(scopeNode);
    if (scopeNode && entityType === "vendor") {
      return uniqIds([vendorId, canonical]);
    }
    return uniqIds([canonical, vendorId]);
  };
  const queryScopedClientFormElement = (scopeNode, id) => {
    if (!scopeNode || typeof scopeNode.querySelector !== "function") return null;
    const candidates = resolveClientFormIdCandidates(id, scopeNode);
    for (const candidate of candidates) {
      const match = scopeNode.querySelector(`#${candidate}`);
      if (match) return match;
    }
    return null;
  };
  const queryGlobalClientFormElement = (id, scopeNode = null) => {
    const candidates = resolveClientFormIdCandidates(id, scopeNode);
    for (const candidate of candidates) {
      const input =
        typeof getEl === "function"
          ? getEl(candidate)
          : typeof document !== "undefined"
            ? document.getElementById(candidate)
            : null;
      if (input) return input;
    }
    return null;
  };

  function readClientFieldValue(id, scopeNode, fieldMap = CLIENT_CONTENT_FIELD_STATE_KEYS) {
    const canonicalId = toCanonicalClientFormId(id);
    const scopedInput = queryScopedClientFormElement(scopeNode, canonicalId);
    if (scopedInput && typeof scopedInput.value === "string") {
      return scopedInput.value.trim();
    }
    const input = queryGlobalClientFormElement(canonicalId, scopeNode);
    if (input && typeof input.value === "string") {
      return input.value.trim();
    }
    const key = fieldMap[canonicalId];
    const currentState = state()?.client || {};
    let fallback = key ? currentState[key] : "";
    if (fallback === undefined || fallback === null) return "";
    return String(fallback).trim();
  }

  function readClientContentValue(id, scopeNode) {
    return readClientFieldValue(id, scopeNode, CLIENT_CONTENT_FIELD_STATE_KEYS);
  }

  function clientFormHasContent(scopeNode) {
    return CLIENT_CONTENT_FIELD_IDS.some((id) => readClientContentValue(id, scopeNode).length > 0);
  }

  SEM.clientFormHasContent = function (scopeHint) {
    return clientFormHasContent(scopeHint);
  };

  SEM.refreshClientActionButtons = function () {
    const currentClientPath = state()?.client?.__path || "";
    const baselineEntityType = SEM.clientFormBaselineEntityType || "client";
    const hasSavedBaselineForScope = (scopeNode) => {
      const scopeEntityType = resolveClientEntityTypeFromScope(scopeNode);
      if (SEM.clientFormBaseline?.__path) {
        return baselineEntityType === scopeEntityType;
      }
      if (!currentClientPath) return false;
      return baselineEntityType === scopeEntityType;
    };

    const setDisabled = (target, disabled) => {
      if (!target) return;
      if (typeof target === "string") {
        resolveClientFormIdCandidates(target).forEach((id) => {
          const btn =
            typeof getEl === "function"
              ? getEl(id)
              : typeof document !== "undefined"
                ? document.getElementById(id)
                : null;
          if (btn) btn.disabled = !!disabled;
        });
        return;
      }
      target.disabled = !!disabled;
    };

    const scopeNodes =
      typeof document !== "undefined" && typeof document.querySelectorAll === "function"
        ? Array.from(document.querySelectorAll(CLIENT_SCOPE_SELECTOR))
        : [];
    if (!scopeNodes.length) {
      const hasContent = clientFormHasContent();
      const hasSavedBaseline = hasSavedBaselineForScope(null);
      setDisabled("btnNewClient", !hasContent);
      setDisabled("btnSaveClient", !hasContent || hasSavedBaseline);
      return;
    }
    scopeNodes.forEach((scopeNode) => {
      const hasContent = clientFormHasContent(scopeNode);
      const hasSavedBaseline = hasSavedBaselineForScope(scopeNode);
      setDisabled(queryScopedClientFormElement(scopeNode, "btnNewClient"), !hasContent);
      if (isMainscreenScope(scopeNode) || scopeNode.id === "clientBoxMainscreen") {
        setDisabled(queryScopedClientFormElement(scopeNode, "btnSaveClient"), !hasContent);
      } else {
        setDisabled(
          queryScopedClientFormElement(scopeNode, "btnSaveClient"),
          !hasContent || hasSavedBaseline
        );
      }
    });
  };

  function sanitizeClientSnapshot(source = {}) {
    const target = {};
    CLIENT_SNAPSHOT_FIELDS.forEach((field) => {
      let value = source?.[field];
      if (value === undefined || value === null) value = "";
      value = String(value);
      if (field !== "__path") value = value.trim();
      target[field] = value;
    });
    return target;
  }
  helpers.sanitizeClientSnapshot = sanitizeClientSnapshot;

  const MAIN_CLIENT_SCOPE_ID = "clientBoxMainscreenClientsPanel";
  const MAIN_VENDOR_SCOPE_ID = "clientBoxMainscreenFournisseursPanel";
  const MAIN_SCOPE_IDS = new Set([MAIN_CLIENT_SCOPE_ID, MAIN_VENDOR_SCOPE_ID]);
  const CLIENT_SCOPE_SELECTOR =
    "#clientBoxNewDoc, #FournisseurBoxNewDoc, #clientSavedModal, #clientSavedModalNv, #fournisseurSavedModal, #fournisseurSavedModalNv, #clientBoxMainscreenClientsPanel, #clientBoxMainscreenFournisseursPanel, #clientFormPopover, #fournisseurFormPopover";
  const CLIENT_SCOPE_WITH_ROOT_SELECTOR = `${CLIENT_SCOPE_SELECTOR}, #clientBoxMainscreen`;
  const NEW_DOC_SCOPE_IDS = new Set(["clientBoxNewDoc", "FournisseurBoxNewDoc"]);
  const VENDOR_SCOPE_IDS = new Set([
    "FournisseurBoxNewDoc",
    "fournisseurSavedModal",
    "fournisseurSavedModalNv",
    "fournisseurFormPopover",
    MAIN_VENDOR_SCOPE_ID
  ]);
  const isNewDocScope = (node) => !!node && NEW_DOC_SCOPE_IDS.has(node.id);
  const isMainscreenScope = (node) => !!node && MAIN_SCOPE_IDS.has(node.id);
  const resolveMainScopePanel = (node) => {
    const root = node?.id === "clientBoxMainscreen" ? node : node?.closest?.("#clientBoxMainscreen");
    if (!root) return null;
    const active = root.querySelector?.(
      `#${MAIN_CLIENT_SCOPE_ID}.is-active, #${MAIN_VENDOR_SCOPE_ID}.is-active`
    );
    if (active) return active;
    return root.querySelector?.(`#${MAIN_CLIENT_SCOPE_ID}, #${MAIN_VENDOR_SCOPE_ID}`) || null;
  };
  const resolveClientEntityTypeFromScope = (scopeNode) =>
    scopeNode && (scopeNode.dataset?.clientEntityType === "vendor" || VENDOR_SCOPE_IDS.has(scopeNode.id))
      ? "vendor"
      : "client";

  function normalizeClientFormScope(scopeHint) {
    if (!scopeHint || typeof document === "undefined") return null;
    if (scopeHint instanceof HTMLElement) {
      if (scopeHint.id === "clientBoxMainscreen") {
        const mainPanel = resolveMainScopePanel(scopeHint);
        if (mainPanel) return mainPanel;
      }
      if (scopeHint.matches?.(CLIENT_SCOPE_SELECTOR)) return scopeHint;
      const match = scopeHint.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
      if (match) return match;
    }
    if (typeof scopeHint === "string") {
      const el = document.querySelector(scopeHint);
      if (el) return el;
    }
    if (scopeHint?.target instanceof HTMLElement) {
      const match = scopeHint.target.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
      if (match) return match;
    }
    if (scopeHint?.currentTarget instanceof HTMLElement) {
      const match = scopeHint.currentTarget.closest(CLIENT_SCOPE_WITH_ROOT_SELECTOR);
      if (match) return match;
    }
    return null;
  }

  function isItemsModalOpen() {
    if (typeof document === "undefined") return false;
    const modal = document.getElementById("itemsDocOptionsModal");
    if (!modal) return false;
    if (modal.classList.contains("is-open")) return true;
    return modal.getAttribute("aria-hidden") === "false";
  }

  function normalizeDocType(value, fallback = "facture") {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized || fallback;
  }

  function resolveItemsModalDocType() {
    if (typeof document === "undefined") {
      return normalizeDocType(state()?.meta?.docType || "facture");
    }
    const itemsModal = document.getElementById("itemsDocOptionsModal");
    const modalDocType =
      itemsModal?.querySelector?.("#docMetaBoxNewDoc #docType")?.value ||
      itemsModal?.querySelector?.("#docType")?.value ||
      "";
    const stateDocType = state()?.meta?.docType || "";
    const globalDocType = document.getElementById("docType")?.value || "";
    return normalizeDocType(modalDocType || stateDocType || globalDocType || "facture");
  }

  function resolvePreferredItemsModalScopeId() {
    return resolveItemsModalDocType() === "fa" ? "FournisseurBoxNewDoc" : "clientBoxNewDoc";
  }

  function resolveClientFormScope(scopeHint) {
    if (typeof document === "undefined") return null;
    const hinted = normalizeClientFormScope(scopeHint);
    if (hinted && hinted.isConnected) return hinted;
    const scopes = Array.from(document.querySelectorAll(CLIENT_SCOPE_SELECTOR)).filter((node) => node?.isConnected);
    if (!scopes.length) return null;
    if (isItemsModalOpen()) {
      const itemsModal = document.getElementById("itemsDocOptionsModal");
      const newDocScopes = scopes.filter(isNewDocScope);
      const modalNewDocScopes =
        itemsModal && typeof itemsModal.contains === "function"
          ? newDocScopes.filter((node) => itemsModal.contains(node))
          : [];
      const candidates = modalNewDocScopes.length ? modalNewDocScopes : newDocScopes;
      if (candidates.length) {
        const preferredScopeId = resolvePreferredItemsModalScopeId();
        const preferredScope = candidates.find((node) => node.id === preferredScopeId);
        if (preferredScope) return preferredScope;
        const withContent = candidates.find((node) => clientFormHasContent(node));
        if (withContent) return withContent;
        return candidates[0];
      }
    }
    const activeScope = document.activeElement?.closest?.(CLIENT_SCOPE_SELECTOR);
    if (activeScope) return activeScope;
    if (scopes.length === 1) return scopes[0];
    const withContent = scopes.filter((node) => clientFormHasContent(node));
    if (withContent.length === 1) return withContent[0];
    if (withContent.length > 1) {
      const mainScope = withContent.find((node) => isMainscreenScope(node));
      if (mainScope) return mainScope;
      return withContent[0];
    }
    const mainScope = scopes.find((node) => isMainscreenScope(node));
    if (mainScope) return mainScope;
    const rootMainScope = resolveMainScopePanel(document.getElementById("clientBoxMainscreen"));
    return rootMainScope || scopes[0] || null;
  }

  function captureClientSnapshotFromScope(scopeNode) {
    const currentState = state()?.client || {};
    const readValue = (id) => readClientFieldValue(id, scopeNode, CLIENT_SNAPSHOT_FIELD_STATE_KEYS);
    const typeRaw = readValue("clientType") || currentState.type || "";
    const normalizedType = normalizeClientType(typeRaw);
      return {
        type: normalizedType,
        name: readValue("clientName"),
        benefit: readValue("clientBeneficiary"),
        account: readValue("clientAccount"),
        soldClient: formatSoldClientValue(readValue("clientSoldClient")),
        vat: readValue("clientVat"),
        stegRef: readValue("clientStegRef"),
        phone: readValue("clientPhone"),
      email: readValue("clientEmail"),
      address: readValue("clientAddress"),
      __path: currentState.__path || ""
    };
  }

  function captureClientFromDom(scopeHint) {
    const scopeNode = resolveClientFormScope(scopeHint);
    return captureClientSnapshotFromScope(scopeNode);
  }

  function getCurrentClientSnapshot(scopeHint) {
    const capture = captureClientFromDom(scopeHint);
    const sanitized = sanitizeClientSnapshot({ ...capture, __path: capture.__path || state()?.client?.__path || "" });
    const currentState = state()?.client || {};
    const contentKeys = Object.values(CLIENT_CONTENT_FIELD_STATE_KEYS);
    const numericKeys = new Set(["soldClient"]);
    const hasIdentityContent = (source) =>
      contentKeys.some(
        (key) => !numericKeys.has(key) && String(source?.[key] || "").trim().length > 0
      );
    const parseNumericField = (value) => {
      if (value === undefined || value === null) return NaN;
      const normalized = String(value).replace(",", ".").trim();
      if (!normalized) return NaN;
      const num = Number(normalized);
      return Number.isFinite(num) ? num : NaN;
    };
    const hasNumericContent = (source) => {
      const sold = parseNumericField(source?.soldClient);
      return (
        (Number.isFinite(sold) && Math.abs(sold) > 0.0001)
      );
    };
    const hasMeaningfulContent = (source) =>
      hasIdentityContent(source) || hasNumericContent(source);
    if (!hasMeaningfulContent(sanitized) && hasMeaningfulContent(currentState)) {
      return sanitizeClientSnapshot({ ...currentState, __path: currentState.__path || "" });
    }
    return sanitized;
  }

  SEM.confirmDiscardClientChanges = function confirmDiscardClientChanges(onConfirm) {
    const message =
      "Vous allez perdre les modifications non enregistr\u00E9es du client. Continuer ?";
    if (typeof window.showConfirm === "function") {
      Promise.resolve(
        window.showConfirm(message, {
          title: "Confirmation",
          okText: "Continuer",
          cancelText: "Annuler"
        })
      )
        .then((confirmed) => {
          if (confirmed) onConfirm?.();
        })
        .catch(() => {});
      return;
    }
    if (typeof window.confirm === "function") {
      if (window.confirm(message)) onConfirm?.();
      return;
    }
    onConfirm?.();
  };

  SEM.getClientFormSnapshot = function (scopeHint) {
    return getCurrentClientSnapshot(scopeHint);
  };

  SEM.refreshUpdateClientButton = function (scopeHint) {
    const hasSavedClient = !!SEM.clientFormBaseline?.__path;
    const baselineEntityType = SEM.clientFormBaselineEntityType || "client";
    const currentState = state()?.client || {};
    const isDirty = hasSavedClient && (SEM.clientFormDirty || !!currentState.__dirty);
    const allowUpdate = SEM.clientFormAllowUpdate !== false;
    const isSaving = !!SEM.clientUpdateInProgress;
    const applyState = (btn) => {
      if (!btn) return;
      const canUpdate = isDirty && allowUpdate && !isSaving;
      btn.disabled = !canUpdate;
      btn.setAttribute("aria-disabled", canUpdate ? "false" : "true");
      btn.classList.toggle("is-dirty", canUpdate);
    };
    const baselineMatchesScope = (scopeNode) => {
      if (!hasSavedClient) return false;
      if (!scopeNode) return true;
      return baselineEntityType === resolveClientEntityTypeFromScope(scopeNode);
    };
    const resolveScope = (hint) => {
      if (!hint) return null;
      if (hint instanceof HTMLElement) return hint;
      if (typeof hint === "string") {
        const el = document.querySelector(hint);
        if (el) return el;
      }
      if (hint?.target instanceof HTMLElement) {
        const match = hint.target.closest(CLIENT_SCOPE_SELECTOR);
        if (match) return match;
      }
      if (hint?.currentTarget instanceof HTMLElement) {
        const match = hint.currentTarget.closest(CLIENT_SCOPE_SELECTOR);
        if (match) return match;
      }
      return null;
    };

    const scopeNode = resolveScope(scopeHint);
    if (scopeNode) {
      if (!baselineMatchesScope(scopeNode)) {
        const btn = queryScopedClientFormElement(scopeNode, "btnUpdateClient");
        if (btn) {
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
          btn.classList.remove("is-dirty");
        }
        SEM.refreshClientActionButtons?.();
        return;
      }
      applyState(queryScopedClientFormElement(scopeNode, "btnUpdateClient"));
      SEM.refreshClientActionButtons?.();
      return;
    }
    const scopeNodes =
      typeof document !== "undefined" && typeof document.querySelectorAll === "function"
        ? Array.from(document.querySelectorAll(CLIENT_SCOPE_SELECTOR))
        : [];
    if (scopeNodes.length) {
      scopeNodes.forEach((node) => {
        if (!baselineMatchesScope(node)) {
          const btn = queryScopedClientFormElement(node, "btnUpdateClient");
          if (btn) {
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.classList.remove("is-dirty");
          }
          return;
        }
        applyState(queryScopedClientFormElement(node, "btnUpdateClient"));
      });
    } else {
      applyState(queryGlobalClientFormElement("btnUpdateClient"));
    }
    SEM.refreshClientActionButtons?.();
  };

  const normalizeSealRotation = (value, fallback = -2) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const wrapped = ((num % 360) + 360) % 360;
    return wrapped > 180 ? wrapped - 360 : wrapped;
  };

  const DEFAULT_SEAL_SIZE_MM = 40;
  const MIN_SEAL_SIZE_MM = 30;
  const normalizeSealSize = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return DEFAULT_SEAL_SIZE_MM;
    return Math.max(MIN_SEAL_SIZE_MM, Math.min(num, DEFAULT_SEAL_SIZE_MM));
  };

  const ensureSealState = () => {
    const st = state();
    st.company = st.company || {};
    const seal = st.company.seal;
    if (!seal || typeof seal !== "object") {
      st.company.seal = {
        enabled: false,
        image: "",
        path: "",
        maxWidthMm: DEFAULT_SEAL_SIZE_MM,
        maxHeightMm: DEFAULT_SEAL_SIZE_MM,
        opacity: 1,
        rotateDeg: -2
      };
    } else {
      seal.maxWidthMm = normalizeSealSize(seal.maxWidthMm);
      seal.maxHeightMm = normalizeSealSize(seal.maxHeightMm);
      seal.opacity = 1;
      seal.rotateDeg = normalizeSealRotation(seal.rotateDeg, -2);
      seal.path = typeof seal.path === "string" ? seal.path : (seal.path ? String(seal.path) : "");
    }
    return st.company.seal;
  };

  const ensureSignatureState = () => {
    const st = state();
    st.company = st.company || {};
    const signature = st.company.signature;
    if (!signature || typeof signature !== "object") {
      st.company.signature = {
        enabled: false,
        image: "",
        path: "",
        rotateDeg: 0
      };
    } else {
      signature.rotateDeg = normalizeSealRotation(signature.rotateDeg, 0);
      signature.path =
        typeof signature.path === "string"
          ? signature.path
          : signature.path
            ? String(signature.path)
            : "";
    }
    return st.company.signature;
  };

  function renderCompanySealPreview(sealState = {}) {
    if (typeof document === "undefined") return;
    const preview = document.getElementById("companySealPreview");
    const imageSrc = sealState.image || "";
    const rotation = normalizeSealRotation(sealState.rotateDeg, -2);
    if (preview) {
      preview.innerHTML = "";
      if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.alt = "Cachet de l'entreprise";
        if (Number.isFinite(rotation)) {
          img.style.transform = `rotate(${rotation}deg)`;
        }
        preview.appendChild(img);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "company-seal-preview__placeholder";
        placeholder.textContent = preview.dataset.placeholder || "Aucun cachet";
        preview.appendChild(placeholder);
      }
    }
    const deleteBtn = typeof document !== "undefined" ? document.getElementById("btnDeleteSeal") : null;
    if (deleteBtn) deleteBtn.disabled = !imageSrc;
    const rotateBtn = typeof document !== "undefined" ? document.getElementById("btnRotateSeal") : null;
    if (rotateBtn) rotateBtn.disabled = !imageSrc;
  }

  SEM.refreshSealPreview = function () {
    const seal = ensureSealState();
    renderCompanySealPreview(seal);
    SEM.updateAmountWordsBlock?.();
  };

  SEM.setSealImage = function (dataUrl) {
    const seal = ensureSealState();
    seal.image = dataUrl || "";
    seal.path = seal.image ? seal.path : "";
    seal.enabled = !!seal.image;
    seal.rotateDeg = normalizeSealRotation(seal.rotateDeg, -2);
    SEM.refreshSealPreview();
    SEM.saveCompanyToLocal?.();
  };

  SEM.rotateSealImage = function (stepDeg = 90) {
    const seal = ensureSealState();
    if (!seal.image) return;
    const current = normalizeSealRotation(seal.rotateDeg, 0);
    seal.rotateDeg = normalizeSealRotation(current + stepDeg, 0);
    seal.enabled = true;
    SEM.refreshSealPreview();
    SEM.saveCompanyToLocal?.();
  };

  function renderCompanySignaturePreview(imageSrc) {
    if (typeof document === "undefined") return;
    const preview = document.getElementById("companySignaturePreview");
    const signature = ensureSignatureState();
    const rotation = normalizeSealRotation(signature.rotateDeg, 0);
    if (preview) {
      preview.innerHTML = "";
      if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.alt = "Signature de l'entreprise";
        if (Number.isFinite(rotation)) {
          img.style.transform = `rotate(${rotation}deg)`;
        }
        preview.appendChild(img);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "company-seal-preview__placeholder";
        placeholder.textContent = preview.dataset.placeholder || "Aucune signature";
        preview.appendChild(placeholder);
      }
    }
    const deleteBtn =
      typeof document !== "undefined" ? document.getElementById("btnDeleteSignature") : null;
    if (deleteBtn) deleteBtn.disabled = !imageSrc;
    const rotateBtn =
      typeof document !== "undefined" ? document.getElementById("btnRotateSignature") : null;
    if (rotateBtn) rotateBtn.disabled = !imageSrc;
  }

  SEM.refreshSignaturePreview = function () {
    const signature = ensureSignatureState();
    const image = signature.image || "";
    renderCompanySignaturePreview(image);
    SEM.updateAmountWordsBlock?.();
  };

  SEM.setSignatureImage = function (dataUrl) {
    const signature = ensureSignatureState();
    const nextImage = dataUrl || "";
    signature.image = nextImage;
    signature.path = nextImage ? signature.path || "" : "";
    signature.enabled = !!nextImage;
    signature.rotateDeg = normalizeSealRotation(signature.rotateDeg, 0);
    SEM.refreshSignaturePreview();
    SEM.saveCompanyToLocal?.();
  };

  SEM.rotateSignatureImage = function (stepDeg = 90) {
    const signature = ensureSignatureState();
    if (!signature.image) return;
    const current = normalizeSealRotation(signature.rotateDeg, 0);
    signature.rotateDeg = normalizeSealRotation(current + stepDeg, 0);
    signature.enabled = true;
    SEM.refreshSignaturePreview();
    SEM.saveCompanyToLocal?.();
  };

  SEM.loadSignatureFromFile = async function (file, savedPath = "") {
    if (!file) return;
    const signature = ensureSignatureState();
    signature.rotateDeg = 0;
    const storedPath = typeof savedPath === "string" ? savedPath : "";
    if (file.type && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result || "");
        signature.path = data ? storedPath : "";
        SEM.setSignatureImage(data);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type === "application/pdf") {
      if (!w.pdfjsLib) {
        const missingPdf = getMessage("SIGNATURE_PDFJS_MISSING", { fallbackText: "Impossible de lire le PDF." });
        await showDialog(missingPdf.text, { title: missingPdf.title || "Signature" });
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png", 0.92);
        signature.path = dataUrl ? storedPath : "";
        SEM.setSignatureImage(dataUrl);
      } catch (err) {
        console.error(err);
        const loadError = getMessage("SIGNATURE_PDF_LOAD_FAILED", { fallbackText: "Impossible de charger ce PDF." });
        await showDialog(loadError.text, { title: loadError.title || "Signature" });
      }
      return;
    }

    const typeError = getMessage("SIGNATURE_UNSUPPORTED_FILE", { fallbackText: "Format de fichier non supporté." });
    await showDialog(typeError.text, { title: typeError.title || "Signature" });
  };

  SEM.loadSealFromFile = async function (file, savedPath = "") {
    if (!file) return;

    const storedPath = typeof savedPath === "string" ? savedPath : "";
    if (file.type && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result || "");
        const seal = ensureSealState();
        const nextPath = data ? storedPath : "";
        seal.path = nextPath;
        SEM.setSealImage(data);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type === "application/pdf") {
      if (!w.pdfjsLib) {
        const missingPdf = getMessage("SEAL_PDFJS_MISSING");
        await showDialog(missingPdf.text, { title: missingPdf.title });
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png", 0.92);
        const seal = ensureSealState();
        const nextPath = dataUrl ? storedPath : "";
        seal.path = nextPath;
        SEM.setSealImage(dataUrl);
      } catch (err) {
        console.error(err);
        const loadError = getMessage("SEAL_PDF_LOAD_FAILED");
        await showDialog(loadError.text, { title: loadError.title });
      }
      return;
    }

    const typeError = getMessage("SEAL_UNSUPPORTED_FILE");
    await showDialog(typeError.text, { title: typeError.title });
  };

  SEM.setClientFormBaseline = function (client, entityType) {
    const resolvedEntityType =
      entityType ||
      client?.__entityType ||
      resolveClientEntityTypeFromScope(resolveClientFormScope()) ||
      "client";
    if (client && client.__path) {
      SEM.clientFormBaseline = sanitizeClientSnapshot(client);
      SEM.clientFormBaselineEntityType = resolvedEntityType;
    } else {
      SEM.clientFormBaseline = null;
      SEM.clientFormBaselineEntityType = null;
    }
    SEM.clientFormDirty = false;
    if (state().client) state().client.__dirty = false;
    SEM.refreshUpdateClientButton();
  };

  if (window.electronAPI?.saveClientDirect && !window.electronAPI.__baselineWrappedSaveClientDirect) {
    const originalSaveClientDirect = window.electronAPI.saveClientDirect.bind(window.electronAPI);
    window.electronAPI.saveClientDirect = async (...args) => {
      const result = await originalSaveClientDirect(...args);
      try {
        if (result?.ok) {
          const path = result.path || state()?.client?.__path || "";
          setTimeout(() => {
            try {
              if (path && state().client) state().client.__path = path;
              SEM.clientFormAllowUpdate = true;
              if (SEM.setClientFormBaseline) {
                const snapshot = SEM.getClientFormSnapshot ? SEM.getClientFormSnapshot() : (SEM.forms?.captureClientFromForm?.() || {});
                snapshot.__path = path || snapshot.__path || state().client?.__path || "";
                if (snapshot.__path) SEM.setClientFormBaseline(snapshot);
                else SEM.setClientFormBaseline(null);
              }
              if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
            } catch (err) {
              console.error("client baseline update (save)", err);
            }
          }, 0);
        }
      } catch (err) {
        console.error("client baseline update (save wrapper)", err);
      }
      return result;
    };
    window.electronAPI.__baselineWrappedSaveClientDirect = true;
  }

  if (window.electronAPI?.updateClientDirect && !window.electronAPI.__baselineWrappedUpdateClientDirect) {
    const originalUpdateClientDirect = window.electronAPI.updateClientDirect.bind(window.electronAPI);
    window.electronAPI.updateClientDirect = async (...args) => {
      const result = await originalUpdateClientDirect(...args);
      try {
        if (result?.ok) {
          const path = result.path || state()?.client?.__path || "";
          setTimeout(() => {
            try {
              if (path && state().client) state().client.__path = path;
              SEM.clientFormAllowUpdate = false;
              if (SEM.setClientFormBaseline) {
                const snapshot = SEM.getClientFormSnapshot ? SEM.getClientFormSnapshot() : (SEM.forms?.captureClientFromForm?.() || {});
                snapshot.__path = path || snapshot.__path || state().client?.__path || "";
                if (snapshot.__path) SEM.setClientFormBaseline(snapshot);
                else SEM.setClientFormBaseline(null);
              }
              if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
            } catch (err) {
              console.error("client baseline update (update)", err);
            }
          }, 0);
        }
      } catch (err) {
        console.error("client baseline update (update wrapper)", err);
      }
      return result;
    };
    window.electronAPI.__baselineWrappedUpdateClientDirect = true;
  }

  if (window.electronAPI?.openClient && !window.electronAPI.__baselineWrappedOpenClient) {
    const originalOpenClient = window.electronAPI.openClient.bind(window.electronAPI);
    window.electronAPI.openClient = async (...args) => {
      const result = await originalOpenClient(...args);
      try {
          if (result?.ok) {
            setTimeout(() => {
              try {
                const path = result.path || state()?.client?.__path || "";
                if (path && state().client) state().client.__path = path;
                SEM.clientFormAllowUpdate = true;
                if (SEM.setClientFormBaseline) {
                const snapshot = SEM.getClientFormSnapshot ? SEM.getClientFormSnapshot() : (SEM.forms?.captureClientFromForm?.() || {});
                snapshot.__path = path || snapshot.__path || "";
                if (snapshot.__path) SEM.setClientFormBaseline(snapshot);
                else SEM.setClientFormBaseline(null);
              }
              if (SEM.evaluateClientDirtyState) SEM.evaluateClientDirtyState();
            } catch (err) {
              console.error("client baseline update (open)", err);
            }
          }, 0);
        }
      } catch (err) {
        console.error("client baseline update (open wrapper)", err);
      }
      return result;
    };
    window.electronAPI.__baselineWrappedOpenClient = true;
  }

  SEM.evaluateClientDirtyState = function () {
    const baseline = SEM.clientFormBaseline;
    const currentState = state().client || {};
    if (!baseline?.__path) {
      SEM.clientFormDirty = false;
      if (currentState) currentState.__dirty = false;
      SEM.refreshUpdateClientButton();
      return;
    }
    const current = getCurrentClientSnapshot();
    const dirty = CLIENT_SNAPSHOT_FIELDS.some((field) => current[field] !== baseline[field]);
    SEM.clientFormDirty = dirty;
    if (currentState) currentState.__dirty = dirty;
    SEM.refreshUpdateClientButton();
  };

  SEM.updateClientIdLabel = function () {
    const type = normalizeClientType(state().client?.type);
    const isParticulier = type === "particulier";
    const labelText = isParticulier ? "CIN / passeport" : "Matricule fiscal";
    const placeholder = isParticulier ? "CIN ou Passeport" : "ex: 1284118/W/A/M/000";
    if (typeof document !== "undefined") {
      document.querySelectorAll("#clientIdLabel, #fournisseurIdLabel").forEach((label) => {
        label.textContent = labelText;
      });
      document.querySelectorAll("#clientVat, #fournisseurVat").forEach((input) => {
        if ("placeholder" in input) input.placeholder = placeholder;
      });
      return;
    }
    setText("clientIdLabel", labelText);
    setText("fournisseurIdLabel", labelText);
    const idInput = getEl("clientVat") || getEl("fournisseurVat");
    if (idInput) idInput.placeholder = placeholder;
  };

  SEM.toggleWHFields = function (enabled) {
    const mainFields = getEl("whFields");
    if (mainFields) mainFields.style.display = enabled ? "" : "none";

    const modalFields = getEl("whFieldsModal");
    if (modalFields) {
      modalFields.style.display = "";
      modalFields.style.opacity = "";
      modalFields.querySelectorAll("input,select").forEach((el) => {
        el.disabled = false;
      });
    }
  };
  SEM.toggleShipFields = function (enabled) {
    const f = getEl("shipFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleDossierFields = function (enabled) {
    const f = getEl("dossierFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleDeplacementFields = function (enabled) {
    const f = getEl("deplacementFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleStampFields = function (enabled) {
    const f = getEl("stampFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleAcompteFields = function (enabled) {
    const f = getEl("acompteFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleSubventionFields = function (enabled) {
    const f = getEl("subventionFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleFinBankFields = function (enabled) {
    const f = getEl("finBankFields"); if (f) f.style.display = enabled ? "" : "none";
  };
  SEM.toggleFodecFields = function (enabled) {
    const row = getEl("addFodecRow") || getEl("fodecFields");
    if (row) row.style.display = enabled ? "" : "none";
    if (row) {
      row.querySelectorAll("input").forEach((input) => {
        if (input.id === "addFodecEnabled" || input.id === "fodecEnabled") return;
        input.disabled = !enabled;
      });
    }
    const purchaseRow = getEl("addPurchaseFodecRow");
    if (purchaseRow) purchaseRow.style.display = enabled ? "" : "none";
    if (purchaseRow) {
      purchaseRow.querySelectorAll("input").forEach((input) => {
        if (
          input.id === "addPurchaseFodecEnabled" ||
          input.id === "addPurchaseFodecRate" ||
          input.id === "addPurchaseFodecTva"
        )
          return;
        input.disabled = !enabled;
      });
    }
  };

  SEM.updateWHAmountPreview = function (totals) {
    const totalsData = totals || SEM.computeTotalsReturn();
    const wh = state().meta.withholding || {};
    const currency = state().meta.currency || totalsData.currency || "DT";
    const amount = Number(totalsData.whAmount || 0);
    const label = wh.label?.trim() || "Retenue a la source";

    setVal("whAmount", formatMoney(amount, currency));
    setVal("whAmountModal", formatMoney(amount, currency));
    setText("miniWHLabel", label);

    const whRow = getEl("miniWHRow");
    const netRow = getEl("miniNETRow");
    const showRows = !!wh.enabled && amount > 0;
    if (whRow) {
      whRow.style.display = showRows ? "" : "none";
      whRow.hidden = !showRows;
    }
    if (netRow) {
      netRow.style.display = showRows ? "" : "none";
      netRow.hidden = !showRows;
    }
    if (showRows) {
      setText("miniWH", "- " + formatMoney(amount, currency));
      setText("miniNET", formatMoney(Number(totalsData.net || 0), currency));
    }
  };

  SEM.updateAcomptePreview = function (totals) {
    const st = state();
    const totalsData = totals || SEM.computeTotalsReturn();
    const acompteState = st.meta?.acompte || {};
    const currency = st.meta?.currency || totalsData.currency || "DT";
    const totalsAcompte = totalsData.acompte || {};
    const enabled = !!(acompteState.enabled || totalsAcompte.enabled);
    const paidRaw = enabled ? Number(acompteState.paid ?? totalsAcompte.paid ?? 0) : 0;
    const paid = Number.isFinite(paidRaw) ? paidRaw : 0;
    const financingTotals = totalsData.financing || {};
    const netToPayRaw = Number(financingTotals.netToPay ?? NaN);
    const hasNetToPay =
      (financingTotals.subventionEnabled || financingTotals.bankEnabled) && Number.isFinite(netToPayRaw);
    const baseFromTotals = Number(totalsAcompte.base ?? NaN);
    const ttc = Number(totalsData.totalTTC || 0);
    const ht = Number(totalsData.totalHT || 0);
    const fallbackBase = Math.abs(ttc) > 1e-9 ? ttc : ht;
    const base = hasNetToPay
      ? netToPayRaw
      : (Number.isFinite(baseFromTotals) ? baseFromTotals : fallbackBase);
    const remainingTotals = hasNetToPay
      ? NaN
      : Number(totalsAcompte.remaining ?? totalsData.balanceDue ?? NaN);
    const remaining = Number.isFinite(remainingTotals)
      ? remainingTotals
      : (enabled ? Math.max(0, base - paid) : base);

    setVal("acompteDue", formatMoney(remaining, currency));
    setText("miniAcompteLabel", "Pay\u00e9");
    setText("miniBalanceLabel", "Solde d\u00fb");

    const acompteRow = getEl("miniAcompteRow");
    const balanceRow = getEl("miniBalanceRow");
    const showAcompte = enabled && Math.abs(paid) > 0;
    if (acompteRow) {
      acompteRow.style.display = showAcompte ? "" : "none";
      acompteRow.hidden = !showAcompte;
    }
    const showBalance = enabled && Math.abs(paid) > 0;
    if (balanceRow) {
      balanceRow.style.display = showBalance ? "" : "none";
      balanceRow.hidden = !showBalance;
    }
    if (showAcompte) {
      setText("miniAcompte", formatMoney(paid, currency));
    }
    if (showBalance) {
      setText("miniBalance", formatMoney(remaining, currency));
    }
  };

  SEM.updateFinancingPreview = function (totals) {
    const st = state();
    const totalsData = totals || SEM.computeTotalsReturn();
    const currency = st.meta?.currency || totalsData.currency || "DT";
    const financing = st.meta?.financing || {};
    const subvention = financing.subvention || {};
    const bank = financing.bank || {};
    const subventionAmount = subvention.enabled ? Number(subvention.amount || 0) : 0;
    const bankAmount = bank.enabled ? Number(bank.amount || 0) : 0;
    const totalDeduction = subventionAmount + bankAmount;
    const net = Number(totalsData?.totalTTC || 0) - totalDeduction;

    const netRow = getEl("financingNetRow");
    const showNet = !!subvention.enabled || !!bank.enabled;
    if (netRow) {
      netRow.style.display = showNet ? "" : "none";
      netRow.hidden = !showNet;
    }
    if (getEl("financingNet")) {
      setVal("financingNet", formatMoney(net, currency));
    }

    const subventionRow = getEl("miniSubventionRow");
    const showSubvention = !!subvention.enabled;
    if (subventionRow) {
      subventionRow.style.display = showSubvention ? "" : "none";
      subventionRow.hidden = !showSubvention;
    }
    if (showSubvention) {
      const subventionLabelRaw = String(subvention.label || "").trim();
      const subventionLabel =
        subventionLabelRaw && !subventionLabelRaw.toLowerCase().startsWith("subvention")
          ? `Subvention ${subventionLabelRaw}`
          : (subventionLabelRaw || "Subvention");
      setText("miniSubventionLabel", subventionLabel);
      setText("miniSubvention", formatMoney(subventionAmount, currency));
    }

    const bankRow = getEl("miniFinBankRow");
    const showBank = !!bank.enabled;
    if (bankRow) {
      bankRow.style.display = showBank ? "" : "none";
      bankRow.hidden = !showBank;
    }
    if (showBank) {
      const bankLabelRaw = String(bank.label || "").trim();
      const bankLabel =
        bankLabelRaw && !bankLabelRaw.toLowerCase().startsWith("financement bancaire")
          ? `Financement bancaire ${bankLabelRaw}`
          : (bankLabelRaw || "Financement bancaire");
      setText("miniFinBankLabel", bankLabel);
      setText("miniFinBank", formatMoney(bankAmount, currency));
    }

    const netToPayRow = getEl("miniNetToPayRow");
    if (netToPayRow) {
      netToPayRow.style.display = showNet ? "" : "none";
      netToPayRow.hidden = !showNet;
    }
    if (showNet) {
      setText("miniNetToPay", formatMoney(net, currency));
    }
  };

  SEM.updateReglementMiniRow = function () {
    const line = getEl("miniReglement");
    if (!line) return;
    const enabled = !!getEl("reglementEnabled")?.checked;
    line.style.display = enabled ? "" : "none";
    line.hidden = !enabled;
    if (!enabled) return;
    const daysSelected = !!getEl("reglementTypeDays")?.checked;
    let valueText = "A r\u00e9ception";
    if (daysSelected) {
      const daysInput = getEl("reglementDays");
      const raw = String(daysInput?.value ?? "").trim();
      let days = raw ? Number(raw) : Number(daysInput?.getAttribute("value") || 30);
      if (!Number.isFinite(days)) days = 30;
      valueText = `${days} jours`;
    }
    setText("miniReglementValue", valueText);
  };

  SEM.updateExtrasMiniRows = function (totals) {
    const st = state();
    const totalsData = totals || SEM.computeTotalsReturn();
    const extrasState = st.meta?.extras || {};
    const currency = st.meta?.currency || totalsData.currency || "DT";
    const extras = totalsData.extras || {};

    const updateRow = (rowId, labelId, valueId, labelText, enabled, amount) => {
      const row = getEl(rowId);
      if (row) {
        row.style.display = enabled ? "" : "none";
        row.hidden = !enabled;
      }
      if (labelId) setText(labelId, labelText);
      if (valueId) {
        const formatted = formatMoney(Number(enabled ? amount || 0 : 0), currency);
        setText(valueId, formatted);
      }
    };

    const shipEnabled = !!extrasState.shipping?.enabled;
    updateRow(
      "miniShipRow",
      "miniShipLabel",
      "miniShip",
      extrasState.shipping?.label?.trim() || "Frais de livraison",
      shipEnabled,
      extras.shipHT || 0
    );

    const dossierEnabled = !!extrasState.dossier?.enabled;
    updateRow(
      "miniDossierRow",
      "miniDossierLabel",
      "miniDossier",
      extrasState.dossier?.label?.trim() || "Frais du dossier",
      dossierEnabled,
      extras.dossierHT || 0
    );

    const deplacementEnabled = !!extrasState.deplacement?.enabled;
    updateRow(
      "miniDeplacementRow",
      "miniDeplacementLabel",
      "miniDeplacement",
      extrasState.deplacement?.label?.trim() || "Frais de deplacement",
      deplacementEnabled,
      extras.deplacementHT || 0
    );

    const fodecEnabled = !!extras.fodecEnabled;
    const fodecLabelRaw = extras.fodecLabel || extrasState.fodec?.label || "FODEC";
    const fodecRate = Number(extras.fodecRate);
    const fodecRateLabel = Number.isFinite(fodecRate) ? formatPct(fodecRate).replace(/\s/g, "") : "";
    const fodecLabelText = fodecRateLabel ? `${fodecLabelRaw} ${fodecRateLabel}%` : fodecLabelRaw;
    updateRow(
      "miniFODECRow",
      "miniFODECLabel",
      "miniFODEC",
      fodecLabelText,
      fodecEnabled,
      extras.fodecHT || 0
    );

    const stampEnabled = !!extrasState.stamp?.enabled;
    updateRow(
      "miniStampRow",
      "miniStampLabel",
      "miniStamp",
      extrasState.stamp?.label?.trim() || "Timbre fiscal",
      stampEnabled,
      extras.stampTT || 0
    );

    SEM.updateReglementMiniRow?.();

    document.querySelectorAll("[data-cur]").forEach((el) => {
      el.setAttribute("data-cur", currency);
    });
  };

})(window);


