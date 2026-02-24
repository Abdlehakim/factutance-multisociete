(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  const DEFAULT_SECRET = "facturance confirmation";

  function confirmFactureDeleteWithCode(
    message,
    {
      title = "Confirmation",
      okText = "Supprimer",
      cancelText = "Annuler",
      secret = DEFAULT_SECRET,
      displayName = "",
      warningText = ""
    } = {}
  ) {
    if (typeof w.showConfirm !== "function") {
      if (typeof w.confirm === "function") return Promise.resolve(w.confirm(message));
      return Promise.resolve(false);
    }
    const expected = String(secret || DEFAULT_SECRET);
    const msgText = String(message || "").trim();
    const displayLabel = String(displayName || "").trim();
    const warningLabel = String(warningText || "").trim();

    return w.showConfirm(msgText, {
      title,
      okText,
      cancelText,
      renderMessage: (container) => {
        if (!container) return;
        container.textContent = "";

        const line = document.createElement("p");
        if (displayLabel) {
          const strong = document.createElement("strong");
          strong.textContent = displayLabel;
          line.appendChild(strong);
          if (warningLabel) {
            line.appendChild(document.createTextNode(` ${warningLabel}`));
          }
        } else {
          line.textContent = warningLabel || msgText;
        }
        line.className = "swbDialog__confirm-summary";
        container.appendChild(line);

        const field = document.createElement("div");
        field.className = "swbDialog__confirm-field";
        const label = document.createElement("label");
        label.className = "swbDialog__confirm-label";
        label.textContent = "Code secret ";
        const labelNote = document.createElement("span");
        labelNote.className = "swbDialog__confirm-label-note";
        labelNote.textContent = "(Tapez le code secret pour confirmer la suppression.)";
        label.appendChild(labelNote);
        label.htmlFor = "swbDialogConfirmCode";
        field.appendChild(label);

        const input = document.createElement("input");
        input.id = "swbDialogConfirmCode";
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.placeholder = "Code secret";
        input.setAttribute("aria-label", "Code de suppression");
        field.appendChild(input);
        container.appendChild(field);

        const okBtn = document.getElementById("swbDialogOk");
        const setOkState = (enabled) => {
          if (!okBtn) return;
          okBtn.disabled = !enabled;
          okBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
        };
        const syncState = () => {
          const match = String(input.value || "").trim() === expected;
          setOkState(match);
        };
        setOkState(false);
        input.addEventListener("input", syncState);
        setTimeout(() => {
          try {
            input.focus();
            input.select();
          } catch {}
        }, 0);
      }
    });
  }

  w.registerHelpers({
    confirmFactureDeleteWithCode
  });
})(window);
