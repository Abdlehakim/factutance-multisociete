(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});

  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };

  helpers.bindModelCrudActions = function bindModelCrudActions(ctx = {}) {
    const {
      modelCreateFlowBtn,
      modelCancelFlowBtn,
      modelSaveBtn,
      modelUpdateBtn,
      modelDeleteBtn,
      modelNewBtn,
      modelSelect,
      modelActionsSelect,
      modelNameInput,
      modelActionsSelectMenu,
      resetModelWizardFields,
      openModelStepperFlow,
      resetModelStepperFlow,
      setModelSelectMenuVisibility,
      syncActionsPreviewToSelection,
      syncModelStepper,
      applySelectedModel,
      updateModelButtons,
      updateModelPreview,
      setModelNotePlaceholder,
      captureCurrentModelSnapshot,
      sanitizeModelName,
      getModelList,
      setModelSaveLocked,
      setModelBaselineString,
      setModelDirty
    } = ctx;

    const safeSanitize =
      sanitizeModelName ||
      ((value) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80));
    const setSaveLocked = typeof setModelSaveLocked === "function" ? setModelSaveLocked : () => {};
    const setBaseline = typeof setModelBaselineString === "function" ? setModelBaselineString : () => {};
    const setDirty = typeof setModelDirty === "function" ? setModelDirty : () => {};
    const setNotePlaceholder =
      typeof setModelNotePlaceholder === "function" ? setModelNotePlaceholder : () => {};
    const refreshPreview = typeof updateModelPreview === "function" ? updateModelPreview : null;
    const refreshModelSelect = typeof SEM.refreshModelSelect === "function" ? SEM.refreshModelSelect.bind(SEM) : null;
    const getList = typeof getModelList === "function" ? getModelList : () => [];
    const normalizeName = (value) => safeSanitize(value).toLowerCase();
    const getSelectedName = () =>
      safeSanitize(modelActionsSelect?.value || "");
    const hasDuplicateName = (candidate, selectedName) => {
      const sanitizedCandidate = safeSanitize(candidate);
      const sanitizedSelected = safeSanitize(selectedName || "");
      const normalizedCandidate = normalizeName(sanitizedCandidate);
      if (!normalizedCandidate) return false;
      if (sanitizedSelected && sanitizedCandidate === sanitizedSelected) return false;
      return getList().some((entry) => normalizeName(entry?.name) === normalizedCandidate);
    };
    const ensureUniqueName = async (candidate) => {
      const selectedName = getSelectedName();
      if (!hasDuplicateName(candidate, selectedName)) return true;
      const duplicateMessage = getMessage("TEMPLATE_NAME_EXISTS", {
        fallbackText: "Un modele avec ce nom existe deja.",
        fallbackTitle: "Doublon"
      });
      await w.showDialog?.(duplicateMessage.text, { title: duplicateMessage.title });
      modelNameInput?.focus();
      return false;
    };

    const finalizeModelCreation = async () => {
      const rawName = modelNameInput?.value || "";
      const sanitized = safeSanitize(rawName);
      if (!sanitized) {
        const nameRequired = getMessage("TEMPLATE_NAME_REQUIRED", {
          fallbackText: "Nom du mod\u00e8le requis"
        });
        await w.showDialog?.(nameRequired.text, { title: nameRequired.title || "Nom du mod\u00e8le requis" });
        modelNameInput?.focus();
        return;
      }
      if (!(await ensureUniqueName(sanitized))) return;
      try {
        const savedName = await SEM.saveModel(rawName);
        setSaveLocked(true);
        setBaseline(typeof captureCurrentModelSnapshot === "function" ? captureCurrentModelSnapshot() : null);
        setDirty(false);
        if (refreshModelSelect) {
          try {
            await refreshModelSelect(savedName);
          } catch (err) {
            console.warn("refreshModelSelect failed", err);
          }
        }
        if (modelSelect) {
          modelSelect.value = savedName;
        }
        if (modelNameInput && modelNameInput.value !== savedName) {
          modelNameInput.value = savedName;
        }
        updateModelButtons?.();
        setNotePlaceholder(false);
        if (refreshPreview) refreshPreview();
        if (typeof w.showDialog === "function") {
          const successMessage = getMessage("TEMPLATE_SAVE_SUCCESS", { values: { savedName } });
          await w.showDialog(successMessage.text, { title: successMessage.title });
        }
        resetModelStepperFlow?.();
        modelActionsSelectMenu?.focus();
      } catch (err) {
        const saveError = getMessage("TEMPLATE_SAVE_FAILED");
        await w.showDialog?.(err?.message || saveError.text, { title: saveError.title });
      }
    };

    if (modelCreateFlowBtn) {
      modelCreateFlowBtn.addEventListener("click", () => {
        resetModelWizardFields?.();
        openModelStepperFlow?.();
      });
    }

    if (modelCancelFlowBtn) {
      modelCancelFlowBtn.addEventListener("click", () => {
        resetModelStepperFlow?.();
        setModelSelectMenuVisibility?.(false);
        syncActionsPreviewToSelection?.({ applyToDocument: false });
      });
    }

    if (modelSaveBtn) {
      modelSaveBtn.addEventListener("click", async () => {
        const rawName = modelNameInput?.value || "";
        if (!(await ensureUniqueName(rawName))) return;
        try {
          let confirmed = true;
          if (typeof w.showConfirm === "function") {
            const prettyName = safeSanitize(rawName) || "nouveau modele";
            confirmed = await w.showConfirm(`Enregistrer le modele \"${prettyName}\" ?`, {
              title: "Confirmer l'enregistrement",
              okText: "Enregistrer",
              cancelText: "Annuler"
            });
          }
          if (!confirmed) return;

          const savedName = await SEM.saveModel(rawName);
          setSaveLocked(true);
          setBaseline(typeof captureCurrentModelSnapshot === "function" ? captureCurrentModelSnapshot() : null);
          setDirty(false);
          updateModelButtons?.();
          setNotePlaceholder(false);
          if (refreshPreview) refreshPreview();
          if (typeof w.showDialog === "function") {
            const successMessage = getMessage("TEMPLATE_SAVE_SUCCESS", { values: { savedName } });
            await w.showDialog(successMessage.text, { title: successMessage.title });
          }
        } catch (err) {
          const saveError = getMessage("TEMPLATE_SAVE_FAILED");
          await w.showDialog?.(err?.message || saveError.text, { title: saveError.title });
        }
      });
    }

    if (modelUpdateBtn) {
      modelUpdateBtn.addEventListener("click", async () => {
        const selectedName = safeSanitize(modelActionsSelect?.value || "");
        if (!selectedName) return;
        if (modelNameInput && !modelNameInput.value) modelNameInput.value = selectedName;
        if (modelSelect && modelSelect.value !== selectedName) modelSelect.value = selectedName;
        if (modelActionsSelect && modelActionsSelect.value !== selectedName) modelActionsSelect.value = selectedName;
        try {
          await applySelectedModel?.(selectedName);
        } catch (err) {
          console.error("model presets: reopen update failed", err);
        }
        openModelStepperFlow?.();
        syncModelStepper?.(1);
        updateModelButtons?.();
      });
    }

    if (modelDeleteBtn) {
      modelDeleteBtn.addEventListener("click", async () => {
        const target = modelActionsSelect?.value || "";
        if (!target) return;
        let confirmed = true;
        if (typeof w.showConfirm === "function") {
          confirmed = await w.showConfirm(`Supprimer le modele \"${target}\" ?`, {
            title: "Supprimer le modele",
            okText: "Supprimer",
            cancelText: "Annuler"
          });
        }
        if (!confirmed) return;
        try {
          const removed = await SEM.deleteModel(target);
          if (!removed) {
            const notFoundMessage = getMessage("TEMPLATE_NOT_FOUND");
            await w.showDialog?.(notFoundMessage.text, { title: notFoundMessage.title });
          } else if (typeof SEM.resetItemsSection === "function") {
            SEM.resetItemsSection();
          }
        } catch (err) {
          console.error("model presets: delete", err);
          const deleteError = getMessage("TEMPLATE_DELETE_FAILED");
          await w.showDialog?.(err?.message || deleteError.text, { title: deleteError.title });
        }
        updateModelButtons?.();
      });
    }

    if (modelNewBtn) {
      modelNewBtn.addEventListener("click", () => {
        if (modelSelect) {
          modelSelect.value = "";
          modelSelect.dispatchEvent(new Event("change"));
        }
        if (modelNameInput) modelNameInput.value = "";
        setSaveLocked(false);
        setBaseline(null);
        setDirty(false);
        updateModelButtons?.();
        modelNameInput?.focus();
      });
    }

    return { finalizeModelCreation };
  };
})(window);
