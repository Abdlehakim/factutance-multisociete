(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.registerColumnToggleActions = function registerColumnToggleActions(ctx = {}) {
    const SEM = ctx.SEM || (w.SEM = w.SEM || {});
    const isArticleFieldsModalToggle = (input) =>
      !!(input && typeof input.closest === "function" && input.closest(".article-fields-modal"));

    const isModelToggle = (input) => {
      if (!input) return false;
      if (typeof input.closest === "function" && input.closest("#modelActionsModal")) return true;
      const id = typeof input.id === "string" ? input.id : "";
      return id.endsWith("Modal");
    };

    const getToggleScope = (input) => (isModelToggle(input) ? "model" : "main");
    const MODEL_CONTEXTUAL_FODEC_TOGGLE_IDS = new Set([
      "colToggleFodecModal",
      "colTogglePurchaseFodecModal"
    ]);
    const isContextualModelFodecToggle = (input, key, scope) =>
      scope === "model" &&
      String(key || "").toLowerCase() === "fodec" &&
      MODEL_CONTEXTUAL_FODEC_TOGGLE_IDS.has(String(input?.id || ""));

    const syncToggleGroup = (source) => {
      const key = source?.dataset?.columnKey;
      if (!key) return;
      if (isArticleFieldsModalToggle(source)) return;
      const checked = !!source.checked;
      const sourceScope = getToggleScope(source);
      if (isContextualModelFodecToggle(source, key, sourceScope)) {
        return;
      }
      document.querySelectorAll(`input.col-toggle[data-column-key="${key}"]`).forEach((el) => {
        if (el === source) return;
        if (isArticleFieldsModalToggle(el)) return;
        if (getToggleScope(el) !== sourceScope) return;
        el.checked = checked;
      });
      if (sourceScope === "main" && typeof SEM.applyColumnHiding === "function") {
        SEM.applyColumnHiding();
      }
    };

    const toggleInputs = Array.from(
      document.querySelectorAll("input.col-toggle[data-column-key]")
    ).filter((input) => !isArticleFieldsModalToggle(input));
    toggleInputs.forEach((input) => {
      input.addEventListener("change", () => syncToggleGroup(input));
    });
    // Align duplicate toggle sets on init (first occurrence per key wins)
    const seenByScope = {
      main: new Set(),
      model: new Set()
    };
    toggleInputs.forEach((input) => {
      const key = input.dataset.columnKey;
      if (!key) return;
      const scope = getToggleScope(input);
      if (isContextualModelFodecToggle(input, key, scope)) return;
      const scopedKey = `${scope}:${key}`;
      if (seenByScope[scope].has(scopedKey)) {
        syncToggleGroup(input);
      } else {
        seenByScope[scope].add(scopedKey);
      }
    });

    const toggleMenus = [getEl("fieldToggleMenu"), getEl("modelFieldToggleMenu")].filter(Boolean);
    toggleMenus.forEach((menu) => {
      document.addEventListener("click", (event) => {
        if (!menu.open) return;
        if (menu.contains(event.target)) return;
        menu.removeAttribute("open");
      });
      menu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        menu.removeAttribute("open");
        menu.querySelector("summary")?.focus();
      });
    });

    if (typeof SEM.applyColumnHiding === "function") SEM.applyColumnHiding();
  };
})(window);
