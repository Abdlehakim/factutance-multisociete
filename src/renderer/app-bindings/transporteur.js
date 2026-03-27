(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const POPOVER_SELECTOR = "#transporteurFormPopover";
  const FIELD_IDS = [
    "transporteurName",
    "transporteurDriverName",
    "transporteurVehiclePlate",
    "transporteurTransportMode",
    "transporteurPhone",
    "transporteurEmail",
    "transporteurAddress"
  ];

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
    String(scope?.dataset?.transporteurFormMode || scope?.dataset?.clientFormMode || "create")
      .trim()
      .toLowerCase();
  const resolvePopoverFromNode = (node) => {
    const scopedPopover = node?.closest?.(
      "#clientBoxMainscreenTransporteursPanel, #transporteurSavedModal, #transporteurSavedModalNv"
    )?.querySelector?.(POPOVER_SELECTOR);
    return scopedPopover || resolvePopover();
  };
  const parseTransporteurCodeResult = (result) =>
    String(
      (typeof result === "string" ? result : "") ||
        result?.codeTransporteur ||
        result?.codeClient ||
        result?.code ||
        ""
    ).trim();
  const syncTransporteurCodeState = (scope, codeValue) => {
    const resolvedCode = String(codeValue || "").trim();
    if (!resolvedCode) return;
    const helpers = getBindingHelpers();
    const getState = helpers.getEntityClientStateForScope;
    const setState = helpers.setEntityClientFormState;
    const shouldMirror = helpers.shouldMirrorEntityClientStateToDocument;
    const currentState =
      typeof getState === "function" ? getState(scope) || {} : {};
    if (typeof setState === "function") {
      setState("transporter", {
        ...currentState,
        codeClient: resolvedCode,
        codeTransporteur: resolvedCode,
        __entityType: "transporter"
      });
    }
    if (
      typeof shouldMirror === "function" &&
      shouldMirror(scope) &&
      SEM.state &&
      SEM.state.client &&
      (SEM.state.client.__entityType === "transporter" || !SEM.state.client.__entityType)
    ) {
      SEM.state.client.codeClient = resolvedCode;
      SEM.state.client.codeTransporteur = resolvedCode;
      SEM.state.client.__entityType = "transporter";
    }
  };
  const hydrateTransporteurCode = async (scope, { force = false } = {}) => {
    const codeInput = scope?.querySelector?.("#transporteurCode");
    if (!(codeInput instanceof HTMLInputElement)) return "";
    const current = String(codeInput.value || "").trim();
    if (!force && current) return current;
    if (typeof window?.electronAPI?.previewClientCode !== "function") return current;
    try {
      const preview = await window.electronAPI.previewClientCode({ entityType: "transporter" });
      const nextCode = parseTransporteurCodeResult(preview);
      if (!nextCode) return current;
      codeInput.value = nextCode;
      codeInput.readOnly = true;
      codeInput.setAttribute("readonly", "");
      codeInput.setAttribute("aria-readonly", "true");
      syncTransporteurCodeState(scope, nextCode);
      refreshTransporteurActionButtons();
      return nextCode;
    } catch (error) {
      console.warn("transporteur code preview failed", error);
      return current;
    }
  };
  const buildSnapshot = (scope) => ({
    type: readValue(scope, "transporteurType") || "societe",
    name: readValue(scope, "transporteurName"),
    benefit: readValue(scope, "transporteurDriverName"),
    account: readValue(scope, "transporteurVehiclePlate"),
    soldClient: readValue(scope, "transporteurSoldClient"),
    vat: readValue(scope, "transporteurVat"),
    stegRef: readValue(scope, "transporteurTransportMode"),
    phone: readValue(scope, "transporteurPhone"),
    email: readValue(scope, "transporteurEmail"),
    address: readValue(scope, "transporteurAddress"),
    __path: String(SEM.clientFormBaseline?.__path || "").trim()
  });
  const isDirtyFromBaseline = (scope) => {
    const baseline =
      SEM.clientFormBaselineEntityType === "transporter" && SEM.clientFormBaseline
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

  const refreshTransporteurActionButtons = () => {
    const scope = resolvePopover();
    if (!scope) return;
    if (scope.hidden || scope.getAttribute("aria-hidden") === "true") return;
    const mode = String(
      scope.dataset?.transporteurFormMode || scope.dataset?.clientFormMode || "create"
    ).toLowerCase();
    const isEditMode = mode === "edit";
    const isCreateMode = mode === "create" || mode === "default";
    const codeInput = scope.querySelector?.("#transporteurCode");
    if (codeInput instanceof HTMLInputElement) {
      codeInput.readOnly = true;
      codeInput.setAttribute("readonly", "");
      codeInput.setAttribute("aria-readonly", "true");
      if (
        isCreateMode &&
        !String(codeInput.value || "").trim() &&
        scope.dataset.transporteurCodeHydrating !== "1"
      ) {
        scope.dataset.transporteurCodeHydrating = "1";
        void hydrateTransporteurCode(scope).finally(() => {
          if (scope.dataset.transporteurCodeHydrating === "1") {
            delete scope.dataset.transporteurCodeHydrating;
          }
        });
      }
    }
    const content = hasContent(scope);
    setDisabled(scope, "btnSaveTransporteur", !isCreateMode || !content);
    setDisabled(scope, "btnNewTransporteur", !isCreateMode || !content);
    const hasBaseline =
      !!SEM.clientFormBaseline?.__path && SEM.clientFormBaselineEntityType === "transporter";
    const transporterState = getBindingHelpers().getEntityClientFormState?.("transporter") || {};
    const isDirty = hasBaseline && (isDirtyFromBaseline(scope) || !!transporterState.__dirty);
    setDisabled(scope, "btnUpdateTransporteur", !isEditMode || !isDirty);
  };

  SEM.refreshTransporteurActionButtons = refreshTransporteurActionButtons;

  const handleInput = (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    const scope = target.closest(POPOVER_SELECTOR);
    if (!scope) return;
    refreshTransporteurActionButtons();
  };

  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("click", (evt) => {
    const toggle = evt.target?.closest?.('[aria-controls="transporteurFormPopover"]');
    if (!toggle) return;
    setTimeout(() => {
      const scope = resolvePopoverFromNode(toggle);
      if (!scope) return;
      const mode = resolveFormMode(scope);
      if (
        mode === "create" ||
        mode === "default" ||
        !String(scope.querySelector?.("#transporteurCode")?.value || "").trim()
      ) {
        void hydrateTransporteurCode(scope);
      }
      refreshTransporteurActionButtons();
    }, 0);
  });
  document.addEventListener("click", (evt) => {
    const newBtn = evt.target?.closest?.(`${POPOVER_SELECTOR} #btnNewTransporteur`);
    if (!newBtn) return;
    setTimeout(() => {
      const scope = resolvePopoverFromNode(newBtn);
      if (!scope) return;
      void hydrateTransporteurCode(scope, { force: true });
      refreshTransporteurActionButtons();
    }, 0);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      const scope = resolvePopover();
      if (scope && (resolveFormMode(scope) === "create" || resolveFormMode(scope) === "default")) {
        void hydrateTransporteurCode(scope);
      }
      refreshTransporteurActionButtons();
    }, 0);
  });
})(window);
