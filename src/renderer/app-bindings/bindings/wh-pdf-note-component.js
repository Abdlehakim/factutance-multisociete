(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const bindingShared = SEM.__bindingShared || {};
  const sharedConstants = bindingShared.constants || {};

  const WH_NOTE_DEFAULT_FONT_SIZE = sharedConstants.WH_NOTE_DEFAULT_FONT_SIZE || 12;
  const WH_NOTE_GROUPS = sharedConstants.WH_NOTE_GROUPS || {
    main: {
      boxId: "whNoteBox",
      hiddenId: "whNote",
      editorId: "whNoteEditor",
      sizeId: "whNoteFontSize",
      boldId: "whNoteBold",
      italicId: "whNoteItalic",
      listId: "whNoteList"
    },
    modal: {
      boxId: "whNoteBoxModal",
      hiddenId: "whNoteModal",
      editorId: "whNoteEditorModal",
      sizeId: "whNoteFontSizeModal",
      boldId: "whNoteBoldModal",
      italicId: "whNoteItalicModal",
      listId: "whNoteListModal"
    }
  };

  const resolveWhNoteGroups =
    bindingShared.resolveWhNoteGroups ||
    ((target) => {
      if (target === "all") return Object.keys(WH_NOTE_GROUPS);
      if (target && WH_NOTE_GROUPS[target]) return [target];
      return ["main"];
    });
  const normalizeWhNoteFontSize =
    bindingShared.normalizeWhNoteFontSize ||
    ((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    });
  const getWhNoteContext = bindingShared.getWhNoteContext || (() => ({}));
  const cleanWhNoteEditor = bindingShared.cleanWhNoteEditor || (() => {});
  const setWhNoteEditorContent = bindingShared.setWhNoteEditorContent || (() => {});
  const syncWhNoteStateFromEditor = bindingShared.syncWhNoteStateFromEditor || (() => {});

  const updateWhNoteEmptyState = (editor) => {
    if (!editor) return;
    const text = (editor.textContent || "").replace(/\u00a0/g, " ").trim();
    editor.dataset.empty = text ? "false" : "true";
  };

  const safeCall = (fn, payload) => {
    if (typeof fn !== "function") return;
    try {
      fn(payload);
    } catch (err) {
      console.error("[wh-pdf-note] callback failed", err);
    }
  };

  const resolveState = (stateResolver) => {
    if (typeof stateResolver === "function") {
      try {
        return stateResolver();
      } catch {
        return SEM.state;
      }
    }
    return SEM.state;
  };

  const applyWhNoteCommand = (command, triggerEl, groupHint) => {
    const ctx = getWhNoteContext(triggerEl || document.activeElement, groupHint);
    const cfg = WH_NOTE_GROUPS[ctx.group || groupHint || "main"] || WH_NOTE_GROUPS.main;
    const editor = ctx.editor || getEl(cfg.editorId);
    if (!editor) return;
    editor.focus();
    if (typeof document.execCommand === "function") {
      document.execCommand(command, false, null);
    }
    syncWhNoteStateFromEditor(editor, { clean: true, group: ctx.group || groupHint });
  };

  const applyWhNoteFontSize = (rawSize, triggerEl, groupHint) => {
    const size = normalizeWhNoteFontSize(rawSize);
    if (!size) return;
    const ctx = getWhNoteContext(triggerEl || document.activeElement, groupHint);
    const cfg = WH_NOTE_GROUPS[ctx.group || groupHint || "main"] || WH_NOTE_GROUPS.main;
    const editor = ctx.editor || getEl(cfg.editorId);
    if (!editor) return;
    editor.focus();
    const selection = w.getSelection?.();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const hasSelection = !range.collapsed;

    if (hasSelection) {
      const fragment = range.extractContents();
      const wrapper = document.createElement("span");
      wrapper.setAttribute("data-size", String(size));
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      newRange.collapse(false);
      selection.addRange(newRange);
      syncWhNoteStateFromEditor(editor, { clean: true, group: ctx.group || groupHint });
      return;
    }

    const anchorNode = selection.anchorNode;
    const anchorElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
    const existingSpan = anchorElement?.closest?.("[data-size]");
    if (existingSpan && editor.contains(existingSpan)) {
      existingSpan.setAttribute("data-size", String(size));
      const newRange = document.createRange();
      newRange.selectNodeContents(existingSpan);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      syncWhNoteStateFromEditor(editor, { group: ctx.group || groupHint });
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-size", String(size));
    wrapper.setAttribute("data-size-root", "true");
    while (editor.firstChild) {
      wrapper.appendChild(editor.firstChild);
    }
    editor.appendChild(wrapper);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    newRange.collapse(false);
    selection.addRange(newRange);
    cleanWhNoteEditor(editor);
    syncWhNoteStateFromEditor(editor, { clean: true, group: ctx.group || groupHint });
  };

  const wireWhNoteGroup = (group, options = {}) => {
    if (typeof document === "undefined") return;
    const cfg = WH_NOTE_GROUPS[group];
    if (!cfg) return;

    const onChange = typeof options.onChange === "function" ? options.onChange : null;
    const stateResolver = options.state;
    const wireKeySuffix = group === "modal" ? "Modal" : "Main";
    const hiddenWireKey = `whPdfNoteHiddenWired${wireKeySuffix}`;
    const editorWireKey = `whPdfNoteEditorWired${wireKeySuffix}`;
    const buttonWireKey = `whPdfNoteButtonWired${wireKeySuffix}`;
    const selectWireKey = `whPdfNoteSelectWired${wireKeySuffix}`;

    const whNoteHiddens = Array.from(document.querySelectorAll(`#${cfg.hiddenId}`));
    const whNoteEditors = Array.from(document.querySelectorAll(`#${cfg.editorId}`));

    const syncNoteFromEditor = (evt) => {
      const editor = evt?.currentTarget || evt?.target;
      const clean = evt?.type === "blur" || evt?.type === "paste";
      syncWhNoteStateFromEditor(editor, { clean, group });
      whNoteEditors.forEach((ed) => updateWhNoteEmptyState(ed));
      safeCall(onChange, { group, source: evt?.type || "editor", editor });
    };

    whNoteHiddens.forEach((hidden) => {
      if (!hidden || hidden.dataset[hiddenWireKey] === "1") return;
      hidden.dataset[hiddenWireKey] = "1";
      hidden.addEventListener("input", () => {
        const value = hidden.value || "";
        whNoteHiddens.forEach((h) => {
          if (h !== hidden && h.value !== value) h.value = value;
        });
        setWhNoteEditorContent(value, { group });
        if (group === "main") {
          const st = resolveState(stateResolver);
          if (st?.meta?.withholding) st.meta.withholding.note = value;
        }
        safeCall(onChange, { group, source: "hidden-input", value });
      });
    });

    whNoteEditors.forEach((editor) => {
      if (!editor || editor.dataset[editorWireKey] === "1") return;
      editor.dataset[editorWireKey] = "1";
      editor.addEventListener("input", syncNoteFromEditor);
      editor.addEventListener("blur", syncNoteFromEditor);
      editor.addEventListener("paste", (evt) => {
        evt.preventDefault();
        const text = (evt.clipboardData || w.clipboardData)?.getData("text/plain") || "";
        if (typeof document.execCommand === "function") {
          document.execCommand("insertText", false, text);
        } else if (typeof w.getSelection === "function") {
          const selection = w.getSelection();
          if (selection?.rangeCount) {
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(text));
          }
        }
        syncNoteFromEditor(evt);
      });
    });

    document.querySelectorAll(`#${cfg.boldId}`).forEach((btn) => {
      if (!btn || btn.dataset[buttonWireKey] === "1") return;
      btn.dataset[buttonWireKey] = "1";
      btn.addEventListener("click", () => applyWhNoteCommand("bold", btn, group));
    });
    document.querySelectorAll(`#${cfg.italicId}`).forEach((btn) => {
      if (!btn || btn.dataset[buttonWireKey] === "1") return;
      btn.dataset[buttonWireKey] = "1";
      btn.addEventListener("click", () => applyWhNoteCommand("italic", btn, group));
    });
    document.querySelectorAll(`#${cfg.listId}`).forEach((btn) => {
      if (!btn || btn.dataset[buttonWireKey] === "1") return;
      btn.dataset[buttonWireKey] = "1";
      btn.addEventListener("click", () => applyWhNoteCommand("insertUnorderedList", btn, group));
    });
    document.querySelectorAll(`#${cfg.sizeId}`).forEach((select) => {
      if (!select || select.dataset[selectWireKey] === "1") return;
      select.dataset[selectWireKey] = "1";
      if (!normalizeWhNoteFontSize(select.value)) {
        select.value = String(WH_NOTE_DEFAULT_FONT_SIZE);
      }
      select.addEventListener("change", () => {
        const normalized = normalizeWhNoteFontSize(select.value) ?? WH_NOTE_DEFAULT_FONT_SIZE;
        select.value = String(normalized);
        applyWhNoteFontSize(normalized, select, group);
      });
    });
  };

  const wireWhPdfNotes = (target = "all", options = {}) => {
    resolveWhNoteGroups(target).forEach((group) => {
      wireWhNoteGroup(group, options);
    });
  };

  SEM.__whPdfNoteComponent = {
    GROUPS: WH_NOTE_GROUPS,
    DEFAULT_FONT_SIZE: WH_NOTE_DEFAULT_FONT_SIZE,
    normalizeFontSize: normalizeWhNoteFontSize,
    wireGroup: wireWhNoteGroup,
    wireAll: wireWhPdfNotes
  };
})(window);
