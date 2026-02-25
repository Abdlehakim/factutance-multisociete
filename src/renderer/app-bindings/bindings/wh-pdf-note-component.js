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
  const setWhNoteEditorContent = bindingShared.setWhNoteEditorContent || (() => {});
  const syncWhNoteStateFromEditor = bindingShared.syncWhNoteStateFromEditor || (() => {});

  const getEditorRuntime = (editor) => editor?.__whNoteRuntime || null;
  const getNodeById = (id) =>
    typeof document !== "undefined" ? Array.from(document.querySelectorAll(`#${id}`)) : [];

  const updateToolbarButtonState = (btn, active) => {
    if (!btn) return;
    btn.classList.toggle("is-active", !!active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  };

  const updateWhNoteEmptyState = (editor) => {
    if (!editor) return;
    const text = (editor.textContent || "").replace(/\u00a0/g, " ").replace(/\u200b/g, "").trim();
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

  const isSelectionInsideEditor = (editor) => {
    const selection = w.getSelection?.();
    if (!selection?.rangeCount) return false;
    const anchor = selection.anchorNode;
    if (!anchor) return false;
    return editor.contains(anchor);
  };

  const resolveSelectionSize = (editor) => {
    const selection = w.getSelection?.();
    const anchor = selection?.anchorNode || null;
    let node = anchor && anchor.nodeType === Node.TEXT_NODE ? anchor.parentNode : anchor;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const attrSize = normalizeWhNoteFontSize(node.getAttribute("data-size"));
        if (attrSize) return attrSize;
        const inlineSize = normalizeWhNoteFontSize(node.style?.fontSize || "");
        if (inlineSize) return inlineSize;
      }
      node = node.parentNode;
    }
    return null;
  };

  const readSelectionFormat = (editor) => {
    const activeEl = document.activeElement;
    const canQuery = editor === activeEl || editor.contains(activeEl) || isSelectionInsideEditor(editor);
    const queryState = (command) => {
      if (!canQuery || typeof document.queryCommandState !== "function") return false;
      try {
        return !!document.queryCommandState(command);
      } catch {
        return false;
      }
    };
    return {
      bold: queryState("bold"),
      italic: queryState("italic"),
      list: queryState("insertUnorderedList"),
      size: resolveSelectionSize(editor)
    };
  };

  const syncToolbarState = (editor, group, cfg) => {
    const runtime = getEditorRuntime(editor);
    if (!runtime) return;
    const sizeSelect = runtime.sizeSelect;
    const boldBtn = runtime.boldBtn;
    const italicBtn = runtime.italicBtn;
    const listBtn = runtime.listBtn;
    const selectionFormat = readSelectionFormat(editor);
    const selectedSize =
      normalizeWhNoteFontSize(selectionFormat.size) ??
      normalizeWhNoteFontSize(sizeSelect?.value) ??
      runtime.lastSize ??
      WH_NOTE_DEFAULT_FONT_SIZE;
    if (sizeSelect) sizeSelect.value = String(selectedSize);
    updateToolbarButtonState(boldBtn, !!selectionFormat.bold);
    updateToolbarButtonState(italicBtn, !!selectionFormat.italic);
    updateToolbarButtonState(listBtn, !!selectionFormat.list);
    runtime.lastSize = selectedSize;
    runtime.group = group;
    runtime.cfg = cfg;
  };

  const applyWhNoteCommand = (command, triggerEl, groupHint) => {
    const ctx = getWhNoteContext(triggerEl || document.activeElement, groupHint);
    const group = ctx.group || groupHint || "main";
    const cfg = WH_NOTE_GROUPS[group] || WH_NOTE_GROUPS.main;
    const editor = ctx.editor || getNodeById(cfg.editorId)[0];
    if (!editor) return;

    editor.focus();
    if (typeof document.execCommand === "function") {
      document.execCommand(command, false, null);
    }
    syncWhNoteStateFromEditor(editor, { clean: true, group });
    updateWhNoteEmptyState(editor);
    syncToolbarState(editor, group, cfg);
  };

  const applyWhNoteFontSize = (rawSize, triggerEl, groupHint) => {
    const size = normalizeWhNoteFontSize(rawSize);
    if (!size) return;
    const ctx = getWhNoteContext(triggerEl || document.activeElement, groupHint);
    const group = ctx.group || groupHint || "main";
    const cfg = WH_NOTE_GROUPS[group] || WH_NOTE_GROUPS.main;
    const editor = ctx.editor || getNodeById(cfg.editorId)[0];
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
      syncWhNoteStateFromEditor(editor, { clean: true, group });
      updateWhNoteEmptyState(editor);
      syncToolbarState(editor, group, cfg);
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
    syncWhNoteStateFromEditor(editor, { clean: true, group });
    updateWhNoteEmptyState(editor);
    syncToolbarState(editor, group, cfg);
  };

  const bindToolbarHandlers = (runtime, group, cfg) => {
    const editor = runtime.editor;
    if (!editor) return;

    const addButtonHandler = (btn, action) => {
      if (!btn) return;
      const clickHandler = () => {
        applyWhNoteCommand(action, btn, group);
        safeCall(runtime.onChange, { group, source: "toolbar", editor });
      };
      const mouseDownHandler = (evt) => evt.preventDefault();
      btn.addEventListener("mousedown", mouseDownHandler);
      btn.addEventListener("click", clickHandler);
      runtime.cleanup.push(() => {
        btn.removeEventListener("mousedown", mouseDownHandler);
        btn.removeEventListener("click", clickHandler);
      });
    };

    addButtonHandler(runtime.boldBtn, "bold");
    addButtonHandler(runtime.italicBtn, "italic");
    addButtonHandler(runtime.listBtn, "insertUnorderedList");

    if (runtime.sizeSelect) {
      const normalized = normalizeWhNoteFontSize(runtime.sizeSelect.value) ?? WH_NOTE_DEFAULT_FONT_SIZE;
      runtime.sizeSelect.value = String(normalized);
      runtime.lastSize = normalized;
      const changeHandler = () => {
        const resolved = normalizeWhNoteFontSize(runtime.sizeSelect.value) ?? WH_NOTE_DEFAULT_FONT_SIZE;
        runtime.sizeSelect.value = String(resolved);
        applyWhNoteFontSize(resolved, runtime.sizeSelect, group);
        safeCall(runtime.onChange, { group, source: "font-size", editor, size: resolved });
      };
      runtime.sizeSelect.addEventListener("change", changeHandler);
      runtime.cleanup.push(() => runtime.sizeSelect.removeEventListener("change", changeHandler));
    }
    syncToolbarState(editor, group, cfg);
  };

  const bindHiddenHandlers = (runtime, group, stateResolver) => {
    const editor = runtime.editor;
    if (!editor) return;
    runtime.hiddens.forEach((hidden) => {
      if (!hidden) return;
      const hiddenHandler = () => {
        const value = hidden.value || "";
        runtime.hiddens.forEach((h) => {
          if (h !== hidden && h.value !== value) h.value = value;
        });
        setWhNoteEditorContent(value, { group });
        if (group === "main") {
          const st = resolveState(stateResolver);
          if (st?.meta?.withholding) st.meta.withholding.note = value;
        }
        safeCall(runtime.onChange, { group, source: "hidden-input", value, editor });
      };
      hidden.addEventListener("input", hiddenHandler);
      runtime.cleanup.push(() => hidden.removeEventListener("input", hiddenHandler));
    });
  };

  const bindEditorHandlers = (runtime, group, cfg) => {
    const editor = runtime.editor;
    if (!editor) return;

    editor.setAttribute("contenteditable", "true");
    const onInput = () => {
      syncWhNoteStateFromEditor(editor, { clean: false, group });
      updateWhNoteEmptyState(editor);
      syncToolbarState(editor, group, cfg);
      safeCall(runtime.onChange, { group, source: "editor", editor });
    };
    const onBlur = () => {
      syncWhNoteStateFromEditor(editor, { clean: true, group });
      updateWhNoteEmptyState(editor);
      syncToolbarState(editor, group, cfg);
      safeCall(runtime.onChange, { group, source: "blur", editor });
    };
    const onSelectionLikeEvent = () => {
      if (editor === document.activeElement || editor.contains(document.activeElement) || isSelectionInsideEditor(editor)) {
        syncToolbarState(editor, group, cfg);
      }
    };
    editor.addEventListener("input", onInput);
    editor.addEventListener("blur", onBlur);
    editor.addEventListener("focus", onSelectionLikeEvent);
    editor.addEventListener("keyup", onSelectionLikeEvent);
    editor.addEventListener("mouseup", onSelectionLikeEvent);
    document.addEventListener("selectionchange", onSelectionLikeEvent);
    runtime.cleanup.push(() => {
      editor.removeEventListener("input", onInput);
      editor.removeEventListener("blur", onBlur);
      editor.removeEventListener("focus", onSelectionLikeEvent);
      editor.removeEventListener("keyup", onSelectionLikeEvent);
      editor.removeEventListener("mouseup", onSelectionLikeEvent);
      document.removeEventListener("selectionchange", onSelectionLikeEvent);
    });
    updateWhNoteEmptyState(editor);
    syncToolbarState(editor, group, cfg);
  };

  const initWhNoteEditor = (group, options = {}) => {
    if (typeof document === "undefined") return;
    const cfg = WH_NOTE_GROUPS[group];
    if (!cfg) return;
    const onChange = typeof options.onChange === "function" ? options.onChange : null;
    const stateResolver = options.state;

    const editors = getNodeById(cfg.editorId);
    const hiddens = getNodeById(cfg.hiddenId);
    const sizeSelect = getNodeById(cfg.sizeId)[0] || null;
    const boldBtn = getNodeById(cfg.boldId)[0] || null;
    const italicBtn = getNodeById(cfg.italicId)[0] || null;
    const listBtn = getNodeById(cfg.listId)[0] || null;

    const initialValue = (hiddens.find((h) => String(h?.value || "").trim())?.value || hiddens[0]?.value || "");

    editors.forEach((editor) => {
      if (!editor) return;
      const existing = getEditorRuntime(editor);
      if (existing?.initialized) return;

      const runtime = {
        initialized: true,
        group,
        cfg,
        onChange,
        editor,
        hiddens,
        sizeSelect,
        boldBtn,
        italicBtn,
        listBtn,
        lastSize: normalizeWhNoteFontSize(sizeSelect?.value) ?? WH_NOTE_DEFAULT_FONT_SIZE,
        cleanup: []
      };
      editor.__whNoteRuntime = runtime;
      bindHiddenHandlers(runtime, group, stateResolver);
      bindEditorHandlers(runtime, group, cfg);
      bindToolbarHandlers(runtime, group, cfg);
    });

    setWhNoteEditorContent(initialValue, { group });
  };

  const destroyWhNoteEditor = (group) => {
    if (typeof document === "undefined") return;
    const cfg = WH_NOTE_GROUPS[group];
    if (!cfg) return;
    const editors = getNodeById(cfg.editorId);
    editors.forEach((editor) => {
      if (!editor) return;
      const runtime = getEditorRuntime(editor);
      runtime?.cleanup?.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.warn("[wh-pdf-note] cleanup failed", err);
        }
      });
      delete editor.__whNoteRuntime;
      delete editor.__whNoteSyncing;
      editor.removeAttribute("contenteditable");
      editor.innerHTML = "";
      editor.dataset.empty = "true";
    });
  };

  const wireWhNoteGroup = (group, options = {}) => {
    initWhNoteEditor(group, options);
  };

  const wireWhPdfNotes = (target = "all", options = {}) => {
    resolveWhNoteGroups(target).forEach((group) => {
      initWhNoteEditor(group, options);
    });
  };

  const destroyWhPdfNotes = (target = "all") => {
    resolveWhNoteGroups(target).forEach((group) => {
      destroyWhNoteEditor(group);
    });
  };

  SEM.__whPdfNoteComponent = {
    GROUPS: WH_NOTE_GROUPS,
    DEFAULT_FONT_SIZE: WH_NOTE_DEFAULT_FONT_SIZE,
    normalizeFontSize: normalizeWhNoteFontSize,
    initGroup: initWhNoteEditor,
    destroyGroup: destroyWhNoteEditor,
    destroyAll: destroyWhPdfNotes,
    wireGroup: wireWhNoteGroup,
    wireAll: wireWhPdfNotes
  };
})(window);
