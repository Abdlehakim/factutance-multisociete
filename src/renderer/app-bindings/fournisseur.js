(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const POPOVER_SELECTOR = "#fournisseurFormPopover";
  const FIELD_IDS = [
    "fournisseurType",
    "fournisseurName",
    "fournisseurVat",
    "fournisseurPhone",
    "fournisseurEmail",
    "fournisseurAddress"
  ];
  const TYPE_LABELS = {
    societe: "Societe / personne morale",
    personne_physique: "Personne physique"
  };

  const resolvePopover = () => {
    if (typeof document === "undefined") return null;
    return (
      document.querySelector(`${POPOVER_SELECTOR}.is-open`) ||
      document.querySelector(`${POPOVER_SELECTOR}:not([hidden])`) ||
      document.querySelector(POPOVER_SELECTOR)
    );
  };

  const readValue = (scope, id) => {
    const input = scope?.querySelector?.(`#${id}`);
    if (input && "value" in input) return String(input.value || "").trim();
    return "";
  };

  const hasContent = (scope) => FIELD_IDS.some((id) => readValue(scope, id).length > 0);

  const setDisabled = (scope, id, disabled) => {
    const btn = scope?.querySelector?.(`#${id}`);
    if (btn) btn.disabled = !!disabled;
  };
  const getBindingHelpers = () => SEM.__bindingHelpers || {};
  const resolveFormMode = (scope) =>
    String(scope?.dataset?.fournisseurFormMode || scope?.dataset?.clientFormMode || "create")
      .trim()
      .toLowerCase();
  const resolvePopoverFromNode = (node) => {
    const scopedPopover = node?.closest?.(
      "#clientBoxMainscreenFournisseursPanel, #FournisseurBoxNewDoc, #fournisseurSavedModal, #fournisseurSavedModalNv"
    )?.querySelector?.(POPOVER_SELECTOR);
    return scopedPopover || resolvePopover();
  };
  const parseFournisseurCodeResult = (result) =>
    String(
      (typeof result === "string" ? result : "") ||
        result?.codeFournisseur ||
        result?.codeClient ||
        result?.code ||
        ""
    ).trim();
  const syncFournisseurCodeState = (scope, codeValue) => {
    const resolvedCode = String(codeValue || "").trim();
    if (!resolvedCode) return;
    const helpers = getBindingHelpers();
    const getState = helpers.getEntityClientStateForScope;
    const setState = helpers.setEntityClientFormState;
    const shouldMirror = helpers.shouldMirrorEntityClientStateToDocument;
    const currentState =
      typeof getState === "function" ? getState(scope) || {} : {};
    if (typeof setState === "function") {
      setState("vendor", {
        ...currentState,
        codeClient: resolvedCode,
        codeFournisseur: resolvedCode,
        __entityType: "vendor"
      });
    }
    if (
      typeof shouldMirror === "function" &&
      shouldMirror(scope) &&
      SEM.state &&
      SEM.state.client &&
      (SEM.state.client.__entityType === "vendor" || !SEM.state.client.__entityType)
    ) {
      SEM.state.client.codeClient = resolvedCode;
      SEM.state.client.codeFournisseur = resolvedCode;
      SEM.state.client.__entityType = "vendor";
    }
  };
  const hydrateFournisseurCode = async (scope, { force = false } = {}) => {
    const codeInput = scope?.querySelector?.("#fournisseurCode");
    if (!(codeInput instanceof HTMLInputElement)) return "";
    const current = String(codeInput.value || "").trim();
    if (!force && current) return current;
    if (typeof window?.electronAPI?.previewClientCode !== "function") return current;
    try {
      const preview = await window.electronAPI.previewClientCode({ entityType: "vendor" });
      const nextCode = parseFournisseurCodeResult(preview);
      if (!nextCode) return current;
      codeInput.value = nextCode;
      codeInput.readOnly = true;
      codeInput.setAttribute("readonly", "");
      codeInput.setAttribute("aria-readonly", "true");
      syncFournisseurCodeState(scope, nextCode);
      refreshFournisseurActionButtons();
      return nextCode;
    } catch (error) {
      console.warn("fournisseur code preview failed", error);
      return current;
    }
  };
  const normalizeType = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "particulier") return "personne_physique";
    return TYPE_LABELS[normalized] ? normalized : "societe";
  };
  const resolveTypePopover = (target) =>
    target?.closest?.(POPOVER_SELECTOR) || resolvePopover();
  const syncMenuExpandedState = (scope) => {
    const menu = scope?.querySelector?.("#fournisseurTypeMenu");
    const summary = menu?.querySelector?.("summary");
    if (summary instanceof HTMLElement) {
      summary.setAttribute("aria-expanded", menu?.open ? "true" : "false");
    }
  };
  const closeTypeMenu = (scope, { focusToggle = false } = {}) => {
    const menu = scope?.querySelector?.("#fournisseurTypeMenu");
    if (!(menu instanceof HTMLElement)) return;
    if (menu.open) {
      menu.open = false;
    } else {
      menu.removeAttribute("open");
    }
    const summary = menu.querySelector("summary");
    syncMenuExpandedState(scope);
    if (focusToggle && summary instanceof HTMLElement) {
      try {
        summary.focus();
      } catch {}
    }
  };
  const persistVendorType = (scope, typeValue) => {
    const helpers = getBindingHelpers();
    const normalized = normalizeType(typeValue);
    const getState = helpers.getEntityClientStateForScope;
    const setState = helpers.setEntityClientFormState;
    const shouldMirror = helpers.shouldMirrorEntityClientStateToDocument;
    const current =
      typeof getState === "function" ? getState(scope) || {} : {};
    if (typeof setState === "function") {
      setState("vendor", {
        ...current,
        type: normalized,
        __entityType: "vendor"
      });
    }
    if (
      typeof shouldMirror === "function" &&
      shouldMirror(scope) &&
      SEM.state &&
      SEM.state.client &&
      (SEM.state.client.__entityType === "vendor" || !SEM.state.client.__entityType)
    ) {
      SEM.state.client.type = normalized;
      SEM.state.client.__entityType = "vendor";
    }
  };
  const syncFournisseurTypeUi = (scope, typeValue, { persist = true } = {}) => {
    if (!scope) return "societe";
    const normalized = normalizeType(typeValue);
    const select = scope.querySelector("#fournisseurType");
    if (select instanceof HTMLSelectElement) {
      select.value = normalized;
      Array.from(select.options).forEach((option) => {
        option.selected = option.value === normalized;
      });
    }
    const display = scope.querySelector("#fournisseurTypeDisplay");
    if (display) display.textContent = TYPE_LABELS[normalized] || TYPE_LABELS.societe;
    const panel = scope.querySelector("#fournisseurTypePanel");
    panel?.querySelectorAll?.("[data-client-type-option]")?.forEach((btn) => {
      const isActive = btn.dataset.clientTypeOption === normalized;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    const label = scope.querySelector("#fournisseurIdLabel");
    const vatInput = scope.querySelector("#fournisseurVat");
    if (label) label.textContent = "Matricule fiscal";
    if (vatInput) {
      vatInput.placeholder = "ex: 1284118/W/A/M/000";
    }
    syncMenuExpandedState(scope);
    if (persist) persistVendorType(scope, normalized);
    refreshFournisseurActionButtons();
    return normalized;
  };
  const getStoredVendorType = (scope) => {
    const helpers = getBindingHelpers();
    const getState = helpers.getEntityClientStateForScope;
    const current =
      typeof getState === "function" ? getState(scope) || {} : {};
    return current?.type || readValue(scope, "fournisseurType") || "societe";
  };
  const buildSnapshot = (scope) => ({
    type: readValue(scope, "fournisseurType") || "societe",
    name: readValue(scope, "fournisseurName"),
    benefit: "",
    account: "",
    soldClient: "",
    vat: readValue(scope, "fournisseurVat"),
    stegRef: "",
    phone: readValue(scope, "fournisseurPhone"),
    email: readValue(scope, "fournisseurEmail"),
    address: readValue(scope, "fournisseurAddress"),
    __path: String(SEM.clientFormBaseline?.__path || "").trim()
  });
  const isDirtyFromBaseline = (scope) => {
    const baseline =
      SEM.clientFormBaselineEntityType === "vendor" && SEM.clientFormBaseline
        ? SEM.clientFormBaseline
        : null;
    if (!baseline?.__path) return false;
    const sanitize = getBindingHelpers().sanitizeClientSnapshot;
    const current = typeof sanitize === "function" ? sanitize(buildSnapshot(scope)) : buildSnapshot(scope);
    const expected = typeof sanitize === "function" ? sanitize(baseline) : baseline;
    return [
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
    ].some((key) => String(current[key] || "") !== String(expected[key] || ""));
  };

  const refreshFournisseurActionButtons = () => {
    const scope = resolvePopover();
    if (!scope) return;
    if (scope.hidden || scope.getAttribute("aria-hidden") === "true") return;
    const mode = String(
      scope.dataset?.fournisseurFormMode || scope.dataset?.clientFormMode || "create"
    ).toLowerCase();
    const isEditMode = mode === "edit";
    const isCreateMode = mode === "create" || mode === "default";
    const codeInput = scope.querySelector?.("#fournisseurCode");
    if (codeInput instanceof HTMLInputElement) {
      codeInput.readOnly = true;
      codeInput.setAttribute("readonly", "");
      codeInput.setAttribute("aria-readonly", "true");
      if (
        isCreateMode &&
        !String(codeInput.value || "").trim() &&
        scope.dataset.fournisseurCodeHydrating !== "1"
      ) {
        scope.dataset.fournisseurCodeHydrating = "1";
        void hydrateFournisseurCode(scope).finally(() => {
          if (scope.dataset.fournisseurCodeHydrating === "1") {
            delete scope.dataset.fournisseurCodeHydrating;
          }
        });
      }
    }
    const content = hasContent(scope);
    setDisabled(scope, "btnSaveFournisseur", !isCreateMode || !content);
    setDisabled(scope, "btnNewFournisseur", !isCreateMode || !content);
    const hasBaseline =
      !!SEM.clientFormBaseline?.__path && SEM.clientFormBaselineEntityType === "vendor";
    const vendorState = getBindingHelpers().getEntityClientFormState?.("vendor") || {};
    const isDirty = hasBaseline && (isDirtyFromBaseline(scope) || !!vendorState.__dirty);
    setDisabled(scope, "btnUpdateFournisseur", !isEditMode || !isDirty);
  };

  SEM.refreshFournisseurActionButtons = refreshFournisseurActionButtons;

  const handleInput = (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    const scope = target.closest(POPOVER_SELECTOR);
    if (!scope) return;
    refreshFournisseurActionButtons();
  };

  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("click", (evt) => {
    const optionBtn = evt.target?.closest?.(`${POPOVER_SELECTOR} [data-client-type-option]`);
    if (!(optionBtn instanceof HTMLElement)) return;
    const scope = resolveTypePopover(optionBtn);
    if (!scope) return;
    evt.preventDefault();
    const normalized = syncFournisseurTypeUi(scope, optionBtn.dataset.clientTypeOption);
    const select = scope.querySelector("#fournisseurType");
    if (select instanceof HTMLSelectElement) {
      select.value = normalized;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeTypeMenu(scope, { focusToggle: true });
  });
  document.addEventListener("change", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id !== "fournisseurType") return;
    const scope = resolveTypePopover(target);
    if (!scope) return;
    syncFournisseurTypeUi(scope, target.value);
  });
  document.addEventListener("click", (evt) => {
    const summary = evt.target?.closest?.(`${POPOVER_SELECTOR} #fournisseurTypeMenu > summary`);
    if (!(summary instanceof HTMLElement)) return;
    const scope = resolveTypePopover(summary);
    if (!scope) return;
    requestAnimationFrame(() => {
      syncMenuExpandedState(scope);
      syncFournisseurTypeUi(scope, getStoredVendorType(scope), { persist: false });
    });
  });
  document.addEventListener("click", (evt) => {
    document.querySelectorAll(`${POPOVER_SELECTOR} #fournisseurTypeMenu[open]`).forEach((menu) => {
      if (!(menu instanceof HTMLElement)) return;
      if (menu.contains(evt.target)) return;
      const scope = resolveTypePopover(menu);
      if (!scope) return;
      closeTypeMenu(scope);
    });
  });
  document.addEventListener("keydown", (evt) => {
    if (evt.key !== "Escape") return;
    document.querySelectorAll(`${POPOVER_SELECTOR} #fournisseurTypeMenu[open]`).forEach((menu) => {
      if (!(menu instanceof HTMLElement)) return;
      const scope = resolveTypePopover(menu);
      if (!scope) return;
      evt.preventDefault();
      closeTypeMenu(scope, { focusToggle: true });
    });
  });
  document.addEventListener("click", (evt) => {
    const toggle = evt.target?.closest?.('[aria-controls="fournisseurFormPopover"]');
    if (!toggle) return;
    setTimeout(() => {
      const scope = resolvePopoverFromNode(toggle);
      if (!scope) return;
      syncFournisseurTypeUi(scope, getStoredVendorType(scope), { persist: false });
      const mode = resolveFormMode(scope);
      if (mode === "create" || mode === "default" || !String(scope.querySelector?.("#fournisseurCode")?.value || "").trim()) {
        void hydrateFournisseurCode(scope);
      }
      refreshFournisseurActionButtons();
    }, 0);
  });
  document.addEventListener("click", (evt) => {
    const newBtn = evt.target?.closest?.(`${POPOVER_SELECTOR} #btnNewFournisseur`);
    if (!newBtn) return;
    setTimeout(() => {
      const scope = resolvePopoverFromNode(newBtn);
      if (!scope) return;
      void hydrateFournisseurCode(scope, { force: true });
      refreshFournisseurActionButtons();
    }, 0);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      const scope = resolvePopover();
      if (scope) syncFournisseurTypeUi(scope, getStoredVendorType(scope), { persist: false });
      if (scope && (resolveFormMode(scope) === "create" || resolveFormMode(scope) === "default")) {
        void hydrateFournisseurCode(scope);
      }
      refreshFournisseurActionButtons();
    }, 0);
  });
})(window);
