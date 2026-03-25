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
    const toggle = evt.target?.closest?.('[aria-controls="fournisseurFormPopover"]');
    if (!toggle) return;
    setTimeout(refreshFournisseurActionButtons, 0);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(refreshFournisseurActionButtons, 0);
  });
})(window);
