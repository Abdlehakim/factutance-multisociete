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
    setTimeout(refreshTransporteurActionButtons, 0);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(refreshTransporteurActionButtons, 0);
  });
})(window);
