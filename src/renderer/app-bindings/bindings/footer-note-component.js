(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const bindingShared = SEM.__bindingShared || {};
  const sharedConstants = bindingShared.constants || {};

  const FOOTER_NOTE_FONT_SIZES = sharedConstants.FOOTER_NOTE_FONT_SIZES || [7, 8, 9];
  const FOOTER_NOTE_DEFAULT_FONT_SIZE = sharedConstants.FOOTER_NOTE_DEFAULT_FONT_SIZE || 8;

  const normalizeFooterNoteFontSize =
    bindingShared.normalizeFooterNoteFontSize ||
    ((value) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) return null;
      return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : null;
    });
  const ensureFooterNoteSizeWrapper =
    bindingShared.ensureFooterNoteSizeWrapper ||
    ((html = "", size = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
      const effectiveSize = normalizeFooterNoteFontSize(size) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
      if (!html) return "";
      if (/data-size-root\s*=\s*"?true"?/i.test(html)) return html;
      return `<div data-size="${effectiveSize}" data-size-root="true">${html}</div>`;
    });
  const resolveFooterNoteRootSize =
    bindingShared.resolveFooterNoteRootSize ||
    ((html = "", fallback = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
      const fallbackSize = normalizeFooterNoteFontSize(fallback) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
      const str = String(html || "");
      const rootMatch =
        str.match(/<div[^>]*data-size-root="true"[^>]*data-size="(\d{1,3})"[^>]*>/i) ||
        str.match(/<div[^>]*data-size="(\d{1,3})"[^>]*data-size-root="true"[^>]*>/i);
      const rootSize = normalizeFooterNoteFontSize(rootMatch?.[1]);
      if (rootSize) return rootSize;
      const firstSize = normalizeFooterNoteFontSize(str.match(/data-size="(\d{1,3})"/i)?.[1]);
      return firstSize ?? fallbackSize;
    });
  const normalizeFooterNoteFromEditor =
    bindingShared.normalizeFooterNoteFromEditor || ((value = "") => String(value ?? ""));
  const sanitizeFooterNoteForEditor =
    bindingShared.sanitizeFooterNoteForEditor || ((value = "") => String(value ?? ""));
  const updateFooterNotePlaceholder = bindingShared.updateFooterNotePlaceholder || (() => {});

  const getNodeById = (id, root) => {
    if (!id || typeof document === "undefined") return null;
    if (root && typeof root.querySelector === "function") {
      const scoped = root.querySelector(`#${id}`);
      if (scoped) return scoped;
    }
    if (typeof getEl === "function") {
      const direct = getEl(id);
      if (direct) return direct;
    }
    return document.getElementById(id);
  };

  const resolveRefs = (config = {}) => {
    const ids = config.ids || {};
    const root = config.root && config.root.nodeType === 1 ? config.root : null;
    const editor = getNodeById(ids.editorId, root);
    const hidden = getNodeById(ids.hiddenId, root);
    const sizeSelect = getNodeById(ids.sizeId, root);
    const boldBtn = getNodeById(ids.boldId, root);
    const italicBtn = getNodeById(ids.italicId, root);
    const listBtn = getNodeById(ids.listId, root);
    return { root, editor, hidden, sizeSelect, boldBtn, italicBtn, listBtn };
  };

  const emitStateChange = (config, payload) => {
    if (typeof config?.onStateChange !== "function") return;
    try {
      config.onStateChange(payload);
    } catch (err) {
      console.error("[footer-note] state callback failed", err);
    }
  };

  const formatForPreview = (raw = "", size = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
    const preferredSize = normalizeFooterNoteFontSize(size) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    const serialized = ensureFooterNoteSizeWrapper(normalizeFooterNoteFromEditor(raw || ""), preferredSize);
    return sanitizeFooterNoteForEditor(serialized);
  };

  const setEditorContent = (config = {}, value = "", opts = {}) => {
    if (typeof document === "undefined") return "";
    const refs = resolveRefs(config);
    if (!refs.editor && !refs.hidden && !refs.sizeSelect) return "";

    const requestedSize = opts.size ?? refs.sizeSelect?.value;
    const preferredSize = normalizeFooterNoteFontSize(requestedSize) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    const serialized = ensureFooterNoteSizeWrapper(normalizeFooterNoteFromEditor(value || ""), preferredSize);
    const rendered = sanitizeFooterNoteForEditor(serialized);
    const resolvedSize = resolveFooterNoteRootSize(serialized, preferredSize);

    if (refs.editor) {
      refs.editor.innerHTML = rendered;
      updateFooterNotePlaceholder(refs.editor);
    }
    if (refs.hidden) refs.hidden.value = serialized;
    if (refs.sizeSelect) refs.sizeSelect.value = String(resolvedSize);

    if (opts.notify === true) {
      emitStateChange(config, {
        source: opts.source || "set-content",
        serialized,
        resolvedSize,
        editor: refs.editor,
        hidden: refs.hidden,
        sizeSelect: refs.sizeSelect
      });
    }

    return serialized;
  };

  const syncStateFromEditor = (config = {}, editor, opts = {}) => {
    if (typeof document === "undefined") return "";
    const refs = resolveRefs(config);
    const activeEditor = editor || refs.editor;
    if (!activeEditor) return "";

    const requestedSize =
      normalizeFooterNoteFontSize(refs.sizeSelect?.value) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
    const serialized = ensureFooterNoteSizeWrapper(
      normalizeFooterNoteFromEditor(activeEditor.innerHTML || ""),
      requestedSize
    );
    const resolvedSize = resolveFooterNoteRootSize(serialized, requestedSize);

    if (refs.hidden) refs.hidden.value = serialized;
    if (refs.sizeSelect) refs.sizeSelect.value = String(resolvedSize);
    updateFooterNotePlaceholder(activeEditor);

    emitStateChange(config, {
      source: opts.source || "editor",
      serialized,
      resolvedSize,
      editor: activeEditor,
      hidden: refs.hidden,
      sizeSelect: refs.sizeSelect
    });

    return serialized;
  };

  const wireEditor = (config = {}) => {
    if (typeof document === "undefined") return null;
    const refs = resolveRefs(config);
    const editor = refs.editor;
    if (!editor) return refs;

    const wireFlag = String(config.wireFlag || "footerNoteWired");
    if (editor.dataset[wireFlag] === "1") return refs;
    editor.dataset[wireFlag] = "1";

    let lastRange = null;
    const rememberSelection = () => {
      const selection = w.getSelection?.();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      lastRange = range.cloneRange();
    };
    const resolveSelection = () => {
      const selection = w.getSelection?.();
      if (!selection) return null;
      if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          lastRange = range.cloneRange();
          return { selection, range };
        }
      }
      if (!lastRange || !editor.contains(lastRange.commonAncestorContainer)) return null;
      const restoredRange = lastRange.cloneRange();
      selection.removeAllRanges();
      selection.addRange(restoredRange);
      return { selection, range: restoredRange };
    };

    const applyCommand = (command) => {
      editor.focus();
      resolveSelection();
      if (typeof document.execCommand === "function") {
        document.execCommand(command, false, null);
      }
      syncStateFromEditor(config, editor, { source: "command" });
      rememberSelection();
    };

    const applyFontSize = (rawSize) => {
      const size = normalizeFooterNoteFontSize(rawSize);
      if (!size) return;
      editor.focus();
      const selectionCtx = resolveSelection();
      if (!selectionCtx) return;
      const { selection, range } = selectionCtx;
      const hasSelection = !range.collapsed;

      if (hasSelection) {
        const fragment = range.extractContents();
        const wrapper = document.createElement("span");
        wrapper.setAttribute("data-size", String(size));
        wrapper.style.fontSize = `${size}px`;
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        newRange.collapse(false);
        selection.addRange(newRange);
        lastRange = newRange.cloneRange();
        syncStateFromEditor(config, editor, { source: "font-size-selection" });
        return;
      }

      const anchorNode = selection.anchorNode;
      const anchorElement =
        anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
      const existingNode = anchorElement?.closest?.("[data-size]");
      if (existingNode && editor.contains(existingNode)) {
        existingNode.setAttribute("data-size", String(size));
        existingNode.style.fontSize = `${size}px`;
        const newRange = document.createRange();
        newRange.selectNodeContents(existingNode);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        lastRange = newRange.cloneRange();
        syncStateFromEditor(config, editor, { source: "font-size-node" });
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-size", String(size));
      wrapper.setAttribute("data-size-root", "true");
      wrapper.style.fontSize = `${size}px`;
      while (editor.firstChild) {
        wrapper.appendChild(editor.firstChild);
      }
      editor.appendChild(wrapper);
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      lastRange = newRange.cloneRange();
      syncStateFromEditor(config, editor, { source: "font-size-root" });
    };

    editor.addEventListener("input", () => {
      syncStateFromEditor(config, editor, { source: "input" });
      rememberSelection();
    });
    editor.addEventListener("blur", () => syncStateFromEditor(config, editor, { source: "blur" }));
    editor.addEventListener("keyup", rememberSelection);
    editor.addEventListener("mouseup", rememberSelection);
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
      syncStateFromEditor(config, editor, { source: "paste" });
      rememberSelection();
    });

    const bindToolbarButton = (btn, command) => {
      if (!btn) return;
      btn.addEventListener("mousedown", (evt) => evt.preventDefault());
      btn.addEventListener("click", () => applyCommand(command));
    };
    bindToolbarButton(refs.boldBtn, "bold");
    bindToolbarButton(refs.italicBtn, "italic");
    bindToolbarButton(refs.listBtn, "insertUnorderedList");

    if (refs.hidden) {
      refs.hidden.addEventListener("input", () => {
        setEditorContent(config, refs.hidden.value || "", {
          size: refs.sizeSelect?.value,
          notify: false
        });
        syncStateFromEditor(config, editor, { source: "hidden-input" });
      });
    }

    if (refs.sizeSelect) {
      const normalized =
        normalizeFooterNoteFontSize(refs.sizeSelect.value) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
      refs.sizeSelect.value = String(normalized);
      refs.sizeSelect.addEventListener("mousedown", rememberSelection);
      refs.sizeSelect.addEventListener("change", () => {
        const resolved =
          normalizeFooterNoteFontSize(refs.sizeSelect.value) ?? FOOTER_NOTE_DEFAULT_FONT_SIZE;
        refs.sizeSelect.value = String(resolved);
        applyFontSize(resolved);
      });
    }

    return refs;
  };

  SEM.__footerNoteComponent = {
    FONT_SIZES: FOOTER_NOTE_FONT_SIZES.slice(),
    DEFAULT_FONT_SIZE: FOOTER_NOTE_DEFAULT_FONT_SIZE,
    normalizeFontSize: normalizeFooterNoteFontSize,
    formatForPreview,
    setEditorContent,
    syncStateFromEditor,
    wireEditor
  };
})(window);
