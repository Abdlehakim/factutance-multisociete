(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const POPOVER_SELECTOR = "#transporteurFormPopover";
  const FIELD_IDS = [
    "transporteurName",
    "transporteurVat",
    "transporteurPhone",
    "transporteurEmail",
    "transporteurAddress",
    "transporteurBeneficiary",
    "transporteurAccount",
    "transporteurStegRef"
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
    const isDirty =
      hasBaseline && (SEM.clientFormDirty || !!SEM.state?.client?.__dirty);
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
