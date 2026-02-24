(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  const getEl = w.getEl || ((id) => document.getElementById(id));
  const dialogMessages = w.DialogMessages || {};
  const getDialogText = (key, fallback) => {
    const raw = dialogMessages && Object.prototype.hasOwnProperty.call(dialogMessages, key)
      ? dialogMessages[key]
      : undefined;
    if (typeof raw === "string" && raw.trim().length) return raw;
    return fallback;
  };
  const DIALOG_TEXT = {
    closeButton: getDialogText("closeButton", "x"),
    okButton: getDialogText("okButton", "OK"),
    cancelButton: getDialogText("cancelButton", "Fermer"),
    alertButton: getDialogText("alertButton", getDialogText("cancelButton", "Fermer")),
    defaultTitle: getDialogText("defaultTitle", "Information"),
    confirmTitle: getDialogText("confirmTitle", "Export termine"),
    confirmOk: getDialogText("confirmOkButton", "Ouvrir"),
    confirmCancel: getDialogText("confirmCancelButton", getDialogText("cancelButton", "Fermer")),
    optionsTitle: getDialogText("optionsTitle", "Choisir"),
    optionsCancel: getDialogText("optionsCancelButton", "Annuler")
  };
  const CLOSE_ICON_SVG = `
    <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
    </svg>
  `;
  const FIELD_TOGGLE_CHEVRON_SVG =
    '<svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>';
  const FILE_PATH_REGEX = /(?:[A-Za-z]:(?:\\|\/)|\\\\)[^\r\n]+/g;
  const DOC_NAME_PREFIXES = [
    "facture",
    "factureachat",
    "factureavoir",
    "fa",
    "avoir",
    "devis",
    "bondelivraison",
    "bondecommande",
    "bondentree",
    "bonentree",
    "bondesortie",
    "bonsortie",
    "bl",
    "bc",
    "be",
    "bs"
  ];

  function stripFilePaths(value) {
    if (value == null) return "";
    const text = String(value);
    return text.replace(FILE_PATH_REGEX, (match) => {
      const parts = match.replace(/\\/g, "/").split("/");
      const last = parts[parts.length - 1];
      return last || "";
    });
  }

  const stripKnownDocPrefix = (value) => {
    const str = String(value || "");
    const lower = str.toLowerCase();
    const prefix = DOC_NAME_PREFIXES.find((p) => {
      if (!lower.startsWith(p)) return false;
      const next = lower.charAt(p.length);
      if (!next) return true;
      if (/[-_\s]/.test(next)) return true;
      return /\d/.test(next) && p.length > 2;
    });
    if (!prefix) return str;
    return str.slice(prefix.length).replace(/^[-_\s]+/, "");
  };

  const cleanDocFilenameToken = (value) => {
    if (!value) return "";
    const withoutExt = String(value).replace(/\.pdf$/i, "");
    const noPrefix = stripKnownDocPrefix(withoutExt);
    const noDate = noPrefix.replace(/[-_]\d{4}-\d{2}-\d{2}$/, "");
    const cleaned = noDate.trim();
    return cleaned || withoutExt.trim() || String(value).trim();
  };

  const cleanDocNamesInText = (text) =>
    String(text || "").replace(
      /\b(?:FactureAchat|FactureAvoir|Facture|Avoir|Devis|Bondelivraison|Bondecommande|Bondentree|Bonentree|Bondesortie|Bonsortie|FA|BL|BC|BE|BS)[-_]?[A-Za-z0-9][\w.-]*/gi,
      (match) => {
        const cleaned = cleanDocFilenameToken(match);
        return cleaned && cleaned !== match ? cleaned : match;
      }
    );

  const sanitizeDialogMessage = (value) => cleanDocNamesInText(stripFilePaths(value || ""));

  function ensureDialog() {
    let overlay = getEl("swbDialog");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "swbDialog";
    overlay.className = "swbDialog";
    overlay.setAttribute("aria-hidden", "true");

    const panel = document.createElement("div");
    panel.className = "swbDialog__panel";
    const header = document.createElement("div");
    header.className = "swbDialog__header";
    const title = document.createElement("div");
    title.id = "swbDialogTitle";
    title.className = "swbDialog__title";
    const closeX = document.createElement("button");
    closeX.type = "button";
    closeX.className = "swbDialog__close";
    closeX.setAttribute("aria-label", DIALOG_TEXT.cancelButton || "Fermer");
    closeX.innerHTML = CLOSE_ICON_SVG;
    header.appendChild(title);
    header.appendChild(closeX);

    const msg = document.createElement("div");
    msg.id = "swbDialogMsg";
    msg.className = "swbDialog__msg";
    const actions = document.createElement("div");
    actions.className = "swbDialog__actions";
    const groupLeft = document.createElement("div");
    groupLeft.className = "swbDialog__group swbDialog__group--left";
    const groupRight = document.createElement("div");
    groupRight.className = "swbDialog__group swbDialog__group--right";
    const cancel = document.createElement("button");
    cancel.id = "swbDialogCancel";
    cancel.type = "button";
    cancel.className = "swbDialog__cancel";
    cancel.textContent = DIALOG_TEXT.cancelButton;
    const ok = document.createElement("button");
    ok.id = "swbDialogOk";
    ok.type = "button";
    ok.className = "swbDialog__ok";
    ok.textContent = DIALOG_TEXT.okButton;
    const extra = document.createElement("button");
    extra.id = "swbDialogExtra";
    extra.type = "button";
    extra.className = "swbDialog__ok";
    extra.style.display = "none";

    groupLeft.appendChild(cancel);
    groupRight.appendChild(ok);
    groupRight.appendChild(extra);
    actions.appendChild(groupLeft);
    actions.appendChild(groupRight);
    panel.appendChild(header);
    panel.appendChild(msg);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    closeX.addEventListener("click", () => {
      const okBtn = getEl("swbDialogOk");
      const cancelBtn = getEl("swbDialogCancel");
      const cancelVisible =
        cancelBtn &&
        cancelBtn.style.display !== "none" &&
        cancelBtn.getAttribute("aria-hidden") !== "true" &&
        !cancelBtn.hidden;
      if (cancelVisible && typeof cancelBtn.click === "function") {
        cancelBtn.click();
        return;
      }
      if (okBtn && typeof okBtn.click === "function") {
        okBtn.click();
      }
    });
    return overlay;
  }

  function setSiblingsInert(exceptEl, inertOn) {
    const kids = Array.from(document.body.children);
    for (const el of kids) {
      if (el === exceptEl) continue;
      if (inertOn) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    }
  }

  function openOverlayA11y(overlay, focusEl) {
    const panel = overlay.querySelector(".swbDialog__panel");
    if (panel) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    }
    overlay.style.display = "flex";
    overlay.removeAttribute("aria-hidden");
    setSiblingsInert(overlay, true);
    if (focusEl) {
      try {
        focusEl.focus();
      } catch {}
    }
  }

  function closeOverlayA11y(overlay, prevFocusEl, buttonsToBlur = []) {
    buttonsToBlur.forEach((btn) => {
      try {
        btn.blur();
      } catch {}
    });
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.display = "none";
    setSiblingsInert(overlay, false);
    if (prevFocusEl && typeof prevFocusEl.focus === "function") {
      try {
        prevFocusEl.focus();
      } catch {}
    }
  }

  function showDialog(message, { title = DIALOG_TEXT.defaultTitle, renderMessage } = {}) {
    return new Promise((resolve) => {
      const normalizedTitle = String(title || "").trim().toLowerCase();
      const normalizedTitleNoDiacritics = normalizedTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const shouldToast =
        normalizedTitle === "succes" ||
        normalizedTitle === "success" ||
        normalizedTitleNoDiacritics.includes("mis a jour") ||
        normalizedTitleNoDiacritics.includes("mise a jour");
      if (shouldToast) {
        const safeMessage = sanitizeDialogMessage(message);
        if (typeof w.showToast === "function") {
          w.showToast(safeMessage);
          resolve();
          return;
        }
      }
      const overlay = ensureDialog();
      const isArticlePopoverOpen = !!document.querySelector?.("#articleFormPopover:not([hidden])");
      const isArticleIncompleteDialog =
        normalizedTitleNoDiacritics === "article incomplet" ||
        normalizedTitleNoDiacritics.includes("article incomplet");
      overlay.classList.toggle(
        "swbDialog--above-popover",
        isArticlePopoverOpen && isArticleIncompleteDialog
      );
      const msg = getEl("swbDialogMsg");
      const ok = getEl("swbDialogOk");
      const ttl = getEl("swbDialogTitle");
      const cancel = overlay.querySelector("#swbDialogCancel");
      if (cancel) cancel.style.display = "none";
      const extra = overlay.querySelector("#swbDialogExtra");
      if (extra) extra.style.display = "none";
      if (ok) {
        ok.disabled = false;
        ok.removeAttribute("aria-disabled");
        ok.removeAttribute("disabled");
      }
      ok.textContent = DIALOG_TEXT.alertButton;
      const previouslyFocused = document.activeElement;
      const safeMessage = sanitizeDialogMessage(message);
      if (typeof renderMessage === "function") {
        try {
          msg.textContent = "";
          renderMessage(msg, safeMessage, message);
        } catch {
          msg.textContent = safeMessage;
        }
      } else {
        msg.textContent = safeMessage;
      }
      ttl.textContent = title;

      function close() {
        ok.removeEventListener("click", onOk);
        document.removeEventListener("keydown", onKey);
        overlay.classList.remove("swbDialog--above-popover");
        closeOverlayA11y(overlay, previouslyFocused, [ok]);
        resolve();
      }
      function onOk() {
        close();
      }
      function onBackdrop(e) {
        if (e.target === overlay) e.stopPropagation();
      }
      function onKey(e) {
        if (e.key === "Enter" || e.key === "Escape") close();
      }

      openOverlayA11y(overlay, ok);
      ok.addEventListener("click", onOk);
      document.addEventListener("keydown", onKey);
    });
  }

  function showOptionsDialog({
    message = "",
    title = DIALOG_TEXT.optionsTitle,
    options = [],
    renderMessage,
    onOptionsReady,
    confirmChoice = false,
    confirmText,
    onChoiceChange,
    initialChoice,
    choiceLayout = "buttons",
    choiceLabel = "Modele",
    choicePlaceholder = "Selectionner"
  } = {}) {
    if (!Array.isArray(options) || options.length === 0) return Promise.resolve(null);

    return new Promise((resolve) => {
      const overlay = ensureDialog();
      const panel = overlay.querySelector(".swbDialog__panel");
      const actions = overlay.querySelector(".swbDialog__actions");
      const msg = getEl("swbDialogMsg");
      const ttl = getEl("swbDialogTitle");
      const ok = getEl("swbDialogOk");
      const cancel = getEl("swbDialogCancel");
      const extra = getEl("swbDialogExtra");

      ttl.textContent = title || DIALOG_TEXT.optionsTitle;
      msg.textContent = sanitizeDialogMessage(message);
      const prevOkDisplay = ok ? ok.style.display : "";
      const prevOkText = ok ? ok.textContent : "";
      const prevOkDisabled = ok ? ok.disabled : false;
      const prevOkAriaDisabled = ok ? ok.getAttribute("aria-disabled") : null;
      const prevCancelDisplay = cancel ? cancel.style.display : "";
      const prevCancelText = cancel ? cancel.textContent : "";
      if (ok) {
        ok.style.display = confirmChoice ? "" : "none";
        ok.textContent = confirmChoice ? confirmText || DIALOG_TEXT.okButton : ok.textContent;
      }
      if (cancel) {
        cancel.textContent = DIALOG_TEXT.optionsCancel;
        cancel.style.display = "";
      }
      if (extra) extra.style.display = "none";
      const buttons = [];
      const handlers = [];
      const cleanupCallbacks = [];
      let selectedIndex =
        typeof initialChoice === "number" && Number.isFinite(initialChoice) ? Math.trunc(initialChoice) : null;

      const previouslyFocused = document.activeElement;
      const safeMessage = sanitizeDialogMessage(message);
      const prevMsgMaxHeight = msg ? msg.style.maxHeight : "";
      const prevMsgOverflow = msg ? msg.style.overflow : "";
      const prevMsgOverflowX = msg ? msg.style.overflowX : "";
      const prevMsgOverflowY = msg ? msg.style.overflowY : "";
      const normalizedChoiceLayout = String(choiceLayout || "")
        .trim()
        .toLowerCase();
      const useModelPicker =
        normalizedChoiceLayout === "model" ||
        normalizedChoiceLayout === "model-picker" ||
        normalizedChoiceLayout === "dropdown";
      const pickerLabel = String(choiceLabel || "Modele").trim() || "Modele";
      const pickerPlaceholder = String(choicePlaceholder || "Selectionner").trim() || "Selectionner";

      let customMessageRendered = false;
      let optionsMount = null;
      if (typeof renderMessage === "function") {
        try {
          msg.textContent = "";
          const result = renderMessage(msg, safeMessage, message);
          if (result && result.nodeType === 1) {
            optionsMount = result;
          } else if (result?.optionsMount && result.optionsMount.nodeType === 1) {
            optionsMount = result.optionsMount;
          } else if (msg?.dataset?.optionsMount === "message") {
            optionsMount = msg;
          }
          customMessageRendered = true;
        } catch {}
      }
      if (msg?.dataset?.optionsMount) {
        delete msg.dataset.optionsMount;
      }
      if (!customMessageRendered) {
        msg.textContent = safeMessage;
      }
      if (useModelPicker && msg) {
        msg.style.maxHeight = "none";
        msg.style.overflow = "visible";
        msg.style.overflowX = "visible";
        msg.style.overflowY = "visible";
      }

      const normalizedOptions = options.map((opt, index) => {
        if (opt && typeof opt === "object" && !Array.isArray(opt)) {
          const rawLabel = opt.label ?? opt.text ?? `Option ${index + 1}`;
          const label = String(rawLabel || `Option ${index + 1}`).trim() || `Option ${index + 1}`;
          const value = opt.value ?? opt.docType ?? opt.id ?? label;
          return { label, disabled: !!opt.disabled, value };
        }
        const fallbackLabel = `Option ${index + 1}`;
        const label = String(opt ?? fallbackLabel).trim() || fallbackLabel;
        return { label, disabled: false, value: opt };
      });
      const getOptionValue = (opt) => String(opt?.value ?? "");
      const getOptionLabel = (opt) => String(opt?.label ?? "").trim();
      let optionsRoot = null;
      let modelMenu = null;
      let modelSummary = null;
      let modelDisplay = null;
      let modelSelect = null;
      let modelPanel = null;
      const isModelPickerDisabled = () =>
        useModelPicker && modelSummary?.getAttribute("aria-disabled") === "true";
      const createOptionButton = ({ option, index, className = "btn better-style-v2", parent }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = className;
        btn.textContent = option.label;
        btn.dataset.choice = String(index);
        btn.dataset.choiceValue = getOptionValue(option);
        if (useModelPicker) {
          btn.dataset.value = getOptionValue(option);
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", "false");
        }
        const handler = () => {
          if (btn.disabled) return;
          if (confirmChoice) {
            setSelection(index);
          } else {
            choose(index);
          }
        };
        btn.addEventListener("click", handler);
        handlers.push({ btn, handler });
        if (option.disabled) {
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
        }
        buttons.push(btn);
        parent.appendChild(btn);
        return btn;
      };

      function cleanup(choice) {
        handlers.forEach(({ btn, handler }) => btn.removeEventListener("click", handler));
        cleanupCallbacks.forEach((fn) => {
          try {
            fn();
          } catch {}
        });
        cleanupCallbacks.length = 0;
        ok?.removeEventListener("click", onOk);
        cancel?.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        if (optionsRoot?.parentElement) optionsRoot.remove();
        if (msg) {
          msg.style.maxHeight = prevMsgMaxHeight;
          msg.style.overflow = prevMsgOverflow;
          msg.style.overflowX = prevMsgOverflowX;
          msg.style.overflowY = prevMsgOverflowY;
        }
        if (ok) {
          ok.style.display = prevOkDisplay || "";
          ok.textContent = prevOkText || ok.textContent;
          ok.disabled = prevOkDisabled;
          if (prevOkAriaDisabled === null) ok.removeAttribute("aria-disabled");
          else ok.setAttribute("aria-disabled", prevOkAriaDisabled);
        }
        if (cancel) {
          cancel.textContent = prevCancelText || DIALOG_TEXT.cancelButton;
          cancel.style.display = prevCancelDisplay || "";
        }
        const focusables = [...buttons];
        if (confirmChoice && ok) focusables.unshift(ok);
        if (cancel) focusables.unshift(cancel);
        closeOverlayA11y(overlay, previouslyFocused, focusables);
        resolve(choice);
      }

      function choose(index) {
        cleanup(index);
      }

      function updateOkState() {
        if (!ok || !confirmChoice) return;
        const hasSelection = selectedIndex !== null && selectedIndex !== undefined && selectedIndex >= 0;
        ok.disabled = !hasSelection;
        ok.setAttribute("aria-disabled", hasSelection ? "false" : "true");
      }

      function setSelection(index, { notify = true, closePicker = true } = {}) {
        selectedIndex = index;
        buttons.forEach((btn, idx) => {
          const isSelected = idx === index;
          btn.classList.toggle("is-selected", isSelected);
          btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
          if (useModelPicker) {
            btn.classList.toggle("is-active", isSelected);
            btn.setAttribute("aria-selected", isSelected ? "true" : "false");
          }
        });
        if (useModelPicker) {
          const selectedOption = normalizedOptions[index];
          if (modelSelect) {
            modelSelect.value = selectedOption ? getOptionValue(selectedOption) : "";
          }
          if (modelDisplay) {
            modelDisplay.textContent =
              (selectedOption && getOptionLabel(selectedOption)) || pickerPlaceholder;
          }
          if (closePicker && modelMenu?.open) {
            modelMenu.open = false;
            modelSummary?.setAttribute("aria-expanded", "false");
          }
        }
        updateOkState();
        if (notify && typeof onChoiceChange === "function") {
          try {
            onChoiceChange(normalizedOptions[index], index, buttons);
          } catch {}
        }
      }

      function onOk() {
        if (!confirmChoice) return;
        const hasSelection = selectedIndex !== null && selectedIndex !== undefined && selectedIndex >= 0;
        if (!hasSelection) return;
        cleanup(selectedIndex);
      }

      function onCancel() {
        cleanup(null);
      }

      function onBackdrop(e) {
        if (e.target === overlay) e.stopPropagation();
      }

      function onKey(e) {
        if (e.key === "Escape") {
          if (useModelPicker && modelMenu?.open) {
            e.preventDefault();
            modelMenu.open = false;
            modelSummary?.setAttribute("aria-expanded", "false");
            modelSummary?.focus?.();
            return;
          }
          cleanup(null);
          return;
        }
        if (e.key === "Enter") {
          const active = document.activeElement;
          if (active === cancel) {
            cleanup(null);
            return;
          }
          if (confirmChoice && active === ok) {
            onOk();
            return;
          }
          const idx = active && active.dataset ? active.dataset.choice : undefined;
          if (idx !== undefined) {
            const target = buttons[Number(idx)];
            if (target && !target.disabled) {
              if (confirmChoice) setSelection(Number(idx));
              else choose(Number(idx));
            }
          }
        }
      }

      if (useModelPicker) {
        const wrapper = document.createElement("div");
        wrapper.className = "doc-dialog-model-picker doc-history-convert-form";
        const group = document.createElement("div");
        group.className = "doc-history-convert__field";
        const label = document.createElement("label");
        label.className = "doc-history-convert__label doc-dialog-model-picker__label";
        label.id = "swbDialogChoiceLabel";
        label.textContent = pickerLabel;

        const field = document.createElement("div");
        field.className = "doc-dialog-model-picker__field";

        modelMenu = document.createElement("details");
        modelMenu.id = "swbDialogChoiceMenu";
        modelMenu.className = "field-toggle-menu model-select-menu doc-dialog-model-menu";
        modelMenu.dataset.wired = "1";
        modelSummary = document.createElement("summary");
        modelSummary.className = "btn success field-toggle-trigger";
        modelSummary.setAttribute("role", "button");
        modelSummary.setAttribute("aria-haspopup", "listbox");
        modelSummary.setAttribute("aria-expanded", "false");
        modelSummary.setAttribute("aria-labelledby", "swbDialogChoiceLabel swbDialogChoiceDisplay");
        modelDisplay = document.createElement("span");
        modelDisplay.id = "swbDialogChoiceDisplay";
        modelDisplay.className = "model-select-display";
        modelDisplay.textContent = pickerPlaceholder;
        modelSummary.appendChild(modelDisplay);
        modelSummary.insertAdjacentHTML("beforeend", FIELD_TOGGLE_CHEVRON_SVG);
        modelMenu.appendChild(modelSummary);

        modelPanel = document.createElement("div");
        modelPanel.id = "swbDialogChoicePanel";
        modelPanel.className = "field-toggle-panel model-select-panel doc-history-model-panel";
        modelPanel.setAttribute("role", "listbox");
        modelPanel.setAttribute("aria-labelledby", label.id);
        modelMenu.appendChild(modelPanel);

        modelSelect = document.createElement("select");
        modelSelect.id = "swbDialogChoiceSelect";
        modelSelect.className = "model-select doc-dialog-model-select";
        modelSelect.setAttribute("aria-hidden", "true");
        modelSelect.tabIndex = -1;
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = pickerPlaceholder;
        modelSelect.appendChild(placeholderOption);
        label.htmlFor = modelSelect.id;

        normalizedOptions.forEach((option, index) => {
          createOptionButton({
            option,
            index,
            className: "model-select-option",
            parent: modelPanel
          });
          const opt = document.createElement("option");
          opt.value = getOptionValue(option);
          opt.textContent = option.label;
          if (option.disabled) opt.disabled = true;
          modelSelect.appendChild(opt);
        });

        const hasEnabledChoice = normalizedOptions.some((option) => !option.disabled);
        if (!hasEnabledChoice) {
          modelSummary.setAttribute("aria-disabled", "true");
          modelSummary.tabIndex = -1;
          modelMenu.dataset.disabled = "true";
          modelSelect.disabled = true;
          modelSelect.setAttribute("aria-disabled", "true");
        }

        const onSummaryClick = (evt) => {
          if (isModelPickerDisabled()) {
            evt.preventDefault();
            return;
          }
          evt.preventDefault();
          modelMenu.open = !modelMenu.open;
          modelSummary.setAttribute("aria-expanded", modelMenu.open ? "true" : "false");
          if (!modelMenu.open) modelSummary.focus();
        };
        modelSummary.addEventListener("click", onSummaryClick);
        cleanupCallbacks.push(() => modelSummary.removeEventListener("click", onSummaryClick));

        const onMenuKeydown = (evt) => {
          if (evt.key !== "Escape") return;
          if (!modelMenu.open) return;
          evt.preventDefault();
          evt.stopPropagation();
          modelMenu.open = false;
          modelSummary.setAttribute("aria-expanded", "false");
          modelSummary.focus();
        };
        modelMenu.addEventListener("keydown", onMenuKeydown);
        cleanupCallbacks.push(() => modelMenu.removeEventListener("keydown", onMenuKeydown));

        const onDocumentClick = (evt) => {
          if (!modelMenu?.open) return;
          if (modelMenu.contains(evt.target)) return;
          modelMenu.open = false;
          modelSummary?.setAttribute("aria-expanded", "false");
        };
        document.addEventListener("click", onDocumentClick, true);
        cleanupCallbacks.push(() => document.removeEventListener("click", onDocumentClick, true));

        field.append(modelMenu, modelSelect);
        group.append(label, field);
        wrapper.appendChild(group);
        optionsRoot = wrapper;
      } else {
        const list = document.createElement("div");
        list.className = "swbDialog__options";
        normalizedOptions.forEach((option, index) => {
          createOptionButton({
            option,
            index,
            className: "btn better-style-v2",
            parent: list
          });
        });
        optionsRoot = list;
      }

      if (optionsMount) {
        optionsMount.appendChild(optionsRoot);
      } else if (panel) {
        if (actions) panel.insertBefore(optionsRoot, actions);
        else panel.appendChild(optionsRoot);
      } else {
        overlay.appendChild(optionsRoot);
      }

      if (confirmChoice) {
        if (typeof selectedIndex === "number" && selectedIndex >= 0 && selectedIndex < buttons.length) {
          setSelection(selectedIndex, { notify: false, closePicker: false });
        } else if (panel) {
          updateOkState();
        }
      }
      const firstEnabled = buttons.find((btn) => !btn.disabled);
      const focusTarget =
        useModelPicker && modelSummary && !isModelPickerDisabled()
          ? modelSummary
          : firstEnabled || cancel;
      openOverlayA11y(overlay, focusTarget);
      if (typeof onOptionsReady === "function") {
        try {
          onOptionsReady(buttons, normalizedOptions);
        } catch {}
      }
      if (confirmChoice) ok?.addEventListener("click", onOk);
      cancel?.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);
    });
  }

  function showConfirm(
    message,
    {
      title = DIALOG_TEXT.confirmTitle,
      okText = DIALOG_TEXT.confirmOk,
      cancelText = DIALOG_TEXT.confirmCancel,
      onOk,
      openUrls,
      extra,
      okKeepsOpen = false,
      renderMessage
    } = {}
  ) {
    const overlay = ensureDialog();
    const msg = getEl("swbDialogMsg");
    const ok = getEl("swbDialogOk");
    const ttl = getEl("swbDialogTitle");
    const cancel = getEl("swbDialogCancel");
    const extraBtn = getEl("swbDialogExtra");
    if (ok) {
      ok.disabled = false;
      ok.removeAttribute("aria-disabled");
      ok.removeAttribute("disabled");
    }
    ok.textContent = okText;
    cancel.textContent = cancelText;
    cancel.style.display = "";
    if (extra && extra.text) {
      extraBtn.textContent = extra.text;
      extraBtn.style.display = "";
    } else {
      extraBtn.style.display = "none";
    }
    const previouslyFocused = document.activeElement;
    const safeMessage = sanitizeDialogMessage(message);
    let customMessageRendered = false;
    msg.textContent = "";
    if (typeof renderMessage === "function") {
      try {
        renderMessage(msg, safeMessage, message);
        customMessageRendered = true;
      } catch {}
    }
    if (!customMessageRendered) {
      msg.textContent = safeMessage;
    }
    ttl.textContent = title;
    const urls = Array.isArray(openUrls) ? openUrls.filter(Boolean) : openUrls ? [openUrls] : [];
    return new Promise((resolve) => {
      function isOkDisabled() {
        return !!(ok && (ok.disabled || ok.getAttribute("aria-disabled") === "true"));
      }
      function close(result) {
        ok.removeEventListener("click", onOkClick);
        cancel.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        extraBtn.removeEventListener("click", onExtraClick);
        closeOverlayA11y(overlay, previouslyFocused, [ok, cancel, extraBtn]);
        resolve(result);
      }
      function runOpeners() {
        try {
          onOk && onOk();
        } catch {}
        urls.forEach((u) => {
          try {
            window.open(u, "_blank", "noopener,noreferrer");
          } catch {}
        });
      }
      function onOkClick() {
        if (isOkDisabled()) return;
        runOpeners();
        if (!okKeepsOpen) close(true);
      }
      function onCancel() {
        close(false);
      }
      function onBackdrop(e) {
        if (e.target === overlay) e.stopPropagation();
      }
      function onKey(e) {
        if (e.key === "Enter") onOkClick();
        else if (e.key === "Escape") close(false);
      }
      function onExtraClick() {
        try {
          extra?.onClick && extra.onClick();
        } catch {}
      }
      if (extra && extra.text) extraBtn.addEventListener("click", onExtraClick);
      openOverlayA11y(overlay, ok);
      ok.addEventListener("click", onOkClick);
      cancel.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);
    });
  }

  w.registerHelpers({
    ensureDialog,
    showDialog,
    showOptionsDialog,
    showConfirm
  });
})(window);
