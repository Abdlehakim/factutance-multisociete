import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getSelectionStyleValueForProperty, $patchStyleText } from "@lexical/selection";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  mergeRegister
} from "lexical";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
  $isListNode
} from "@lexical/list";

(function initWhNoteLexicalModalModule(w) {
  const SEM = (w.SEM = w.SEM || {});

  const FONT_SIZES = [10, 12, 14];
  const FONT_SIZE_SET = new Set(FONT_SIZES);
  const DEFAULT_FONT_SIZE = 12;
  const EXTERNAL_UPDATE_TAG = "wh-note-lexical-modal-external";
  const PLACEHOLDER = "Texte libre pour le PDF";
  const EDITOR_ID = "whNoteEditorModal";
  const HIDDEN_ID = "whNoteModal";
  const MOUNT_ID = "whNoteLexicalRootModal";
  const LABEL_ID = "whNoteLabelModal";

  const state = {
    root: null,
    mountNode: null,
    valueVersion: 0,
    serializedValue: "",
    onChange: null
  };

  const safeCall = (fn, payload) => {
    if (typeof fn !== "function") return;
    try {
      fn(payload);
    } catch (err) {
      console.error("[wh-note-lexical-modal] callback failed", err);
    }
  };

  const getBindingShared = () => SEM.__bindingShared || {};

  const normalizeFontSize = (value) => {
    const parsed = Number.parseInt(String(value ?? "").replace(/px$/i, ""), 10);
    if (!Number.isFinite(parsed)) return null;
    return FONT_SIZE_SET.has(parsed) ? parsed : null;
  };

  const resolveFontSize = (value, fallback = DEFAULT_FONT_SIZE) =>
    normalizeFontSize(value) ?? normalizeFontSize(fallback) ?? DEFAULT_FONT_SIZE;

  const resolveRootSize = (html = "", fallback = DEFAULT_FONT_SIZE) => {
    const str = String(html || "");
    const rootMatch =
      str.match(/<div[^>]*data-size-root="true"[^>]*data-size="(\d{1,3})"[^>]*>/i) ||
      str.match(/<div[^>]*data-size="(\d{1,3})"[^>]*data-size-root="true"[^>]*>/i);
    const rootSize = normalizeFontSize(rootMatch?.[1]);
    if (rootSize) return rootSize;
    const anyMatch = str.match(/data-size="(\d{1,3})"/i);
    return resolveFontSize(anyMatch?.[1], fallback);
  };

  const ensureSizeWrapper = (html = "", size = DEFAULT_FONT_SIZE) => {
    const effectiveSize = resolveFontSize(size, DEFAULT_FONT_SIZE);
    if (!html) return "";
    if (/data-size-root\s*=\s*"?true"?/i.test(html)) return html;
    return `<div data-size="${effectiveSize}" data-size-root="true">${html}</div>`;
  };

  const normalizeNoteHtml = (rawHtml = "") => {
    const normalize = getBindingShared().normalizeWhNoteFromEditor;
    if (typeof normalize === "function") {
      return String(normalize(rawHtml || "") || "");
    }
    return String(rawHtml || "");
  };

  const normalizePlainText = (value = "") =>
    String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\u200b/g, "")
      .trim();

  const isBlankHtml = (html = "") => {
    const raw = String(html || "");
    if (!raw.trim()) return true;
    if (typeof DOMParser === "undefined") {
      return !normalizePlainText(raw.replace(/<[^>]+>/g, " "));
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="wh-note-blank-check">${raw}</div>`, "text/html");
    const host = doc.getElementById("wh-note-blank-check");
    if (!host) return true;
    const source = host.querySelector('div[data-size-root="true"]') || host;
    const hasMeaningfulNode = (node) => {
      if (!node) return false;
      if (node.nodeType === Node.TEXT_NODE) {
        return !!normalizePlainText(node.textContent || "");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = String(node.tagName || "").toLowerCase();
      if (tag === "br") return false;
      if (["img", "video", "audio", "iframe", "object", "embed", "svg", "hr", "table"].includes(tag)) {
        return true;
      }
      return Array.from(node.childNodes || []).some(hasMeaningfulNode);
    };
    return !Array.from(source.childNodes || []).some(hasMeaningfulNode);
  };

  const sanitizeForEditor = (rawHtml = "") => {
    const sanitize = getBindingShared().sanitizeWhNoteForEditor;
    if (typeof sanitize === "function") {
      return String(sanitize(rawHtml || "") || "");
    }
    return String(rawHtml || "");
  };

  const getHiddenNode = () =>
    typeof document !== "undefined" ? document.getElementById(HIDDEN_ID) : null;

  const getHiddenValue = () => String(getHiddenNode()?.value || "");

  const setHiddenValue = (value = "") => {
    const hidden = getHiddenNode();
    if (!hidden) return;
    const next = String(value || "");
    if (hidden.value !== next) hidden.value = next;
  };

  const setEditorEmpty = (isEmpty) => {
    if (typeof document === "undefined") return;
    const editor = document.getElementById(EDITOR_ID);
    if (!editor) return;
    editor.dataset.empty = isEmpty ? "true" : "false";
  };

  const styleWithFontSize = (style = "", size = DEFAULT_FONT_SIZE) => {
    const nextSize = resolveFontSize(size, DEFAULT_FONT_SIZE);
    const base = String(style || "")
      .replace(/(^|;)\s*font-size\s*:[^;]+;?/gi, "$1")
      .replace(/;;+/g, ";")
      .trim()
      .replace(/;$/, "");
    return base ? `${base}; font-size: ${nextSize}px;` : `font-size: ${nextSize}px;`;
  };

  const parseEditorImportPayload = (serializedValue, fallbackSize = DEFAULT_FONT_SIZE) => {
    const resolvedSize = resolveRootSize(serializedValue, fallbackSize);
    const safeHtml = sanitizeForEditor(serializedValue || "");
    if (!safeHtml) {
      return { html: "", size: resolvedSize };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="wh-note-lexical-import">${safeHtml}</div>`, "text/html");
    const host = doc.getElementById("wh-note-lexical-import");
    if (!host) {
      return { html: safeHtml, size: resolvedSize };
    }
    const sizeRoot = host.querySelector('div[data-size-root="true"]');
    const source = sizeRoot || host;
    const html = source.innerHTML || "";
    return { html, size: resolvedSize };
  };

  const selectionIsBulletList = (selection) => {
    if (!$isRangeSelection(selection)) return false;
    const nodes = selection.getNodes();
    const inBulletList = (node) => {
      let current = node;
      while (current) {
        if ($isListNode(current)) {
          return current.getListType() === "bullet";
        }
        current = current.getParent?.();
      }
      return false;
    };
    if (inBulletList(selection.anchor.getNode())) return true;
    return nodes.some((node) => inBulletList(node));
  };

  const applyFontSizeToUnstyledNodes = (size) => {
    const root = $getRoot();
    const textNodes = root.getAllTextNodes();
    if (!textNodes.length) {
      const firstChild = root.getFirstChild();
      if (firstChild?.getType?.() === "paragraph" && firstChild.getChildrenSize?.() === 0) {
        const text = $createTextNode("");
        text.setStyle(styleWithFontSize("", size));
        firstChild.append(text);
        return;
      }
      const paragraph = $createParagraphNode();
      const text = $createTextNode("");
      text.setStyle(styleWithFontSize("", size));
      paragraph.append(text);
      root.append(paragraph);
      return;
    }
    textNodes.forEach((node) => {
      const style = String(node.getStyle() || "");
      if (/font-size\s*:/i.test(style)) return;
      node.setStyle(styleWithFontSize(style, size));
    });
  };

  const normalizeEmptyImportedRoot = () => {
    const root = $getRoot();
    const children = root.getChildren();
    if (!children.length) {
      root.append($createParagraphNode());
      return;
    }
    const allEmpty = children.every((node) =>
      !String(node.getTextContent() || "")
        .replace(/\u00a0/g, " ")
        .replace(/\u200b/g, "")
        .trim()
    );
    if (allEmpty && children.length > 1) {
      root.clear();
      root.append($createParagraphNode());
    }
  };

  function ExternalValuePlugin({ serializedValue, valueVersion, onHydrated, setFontSize }) {
    const [editor] = useLexicalComposerContext();
    const lastVersionRef = useRef(-1);

    useEffect(() => {
      if (valueVersion === lastVersionRef.current) return;
      lastVersionRef.current = valueVersion;
      const payload = parseEditorImportPayload(serializedValue, DEFAULT_FONT_SIZE);
      setFontSize(payload.size);
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();

          if (isBlankHtml(payload.html)) {
            root.append($createParagraphNode());
          } else {
            const parser = new DOMParser();
            const dom = parser.parseFromString(payload.html, "text/html");
            const nodes = $generateNodesFromDOM(editor, dom);
            if (nodes.length) {
              root.append(...nodes);
            } else {
              root.append($createParagraphNode());
            }
            const children = root.getChildren();
            const allEmpty =
              children.length === 0 ||
              children.every((node) => !normalizePlainText(node.getTextContent() || ""));
            if (allEmpty) {
              root.clear();
              root.append($createParagraphNode());
            }
          }

          normalizeEmptyImportedRoot();
          applyFontSizeToUnstyledNodes(payload.size);
          root.selectStart();
          const text = root
            .getTextContent()
            .replace(/\u00a0/g, " ")
            .replace(/\u200b/g, "")
            .trim();
          safeCall(onHydrated, { isEmpty: !text, size: payload.size });
        },
        { tag: EXTERNAL_UPDATE_TAG }
      );
    }, [editor, onHydrated, serializedValue, setFontSize, valueVersion]);

    return null;
  }

  function ModalToolbar({ fontSize, setFontSize }) {
    const [editor] = useLexicalComposerContext();
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isBulletList, setIsBulletList] = useState(false);

    const refreshToolbar = useCallback(() => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          setIsBold(false);
          setIsItalic(false);
          setIsBulletList(false);
          return;
        }
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsBulletList(selectionIsBulletList(selection));

        const selectionSize = normalizeFontSize(
          $getSelectionStyleValueForProperty(selection, "font-size", `${fontSize}px`)
        );
        if (selectionSize && selectionSize !== fontSize) {
          setFontSize(selectionSize);
        }
      });
    }, [editor, fontSize, setFontSize]);

    useEffect(
      () =>
        mergeRegister(
          editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
              refreshToolbar();
              return false;
            },
            COMMAND_PRIORITY_LOW
          ),
          editor.registerUpdateListener(() => {
            refreshToolbar();
          })
        ),
      [editor, refreshToolbar]
    );

    const applyFontSize = useCallback(
      (nextRaw) => {
        const nextSize = resolveFontSize(nextRaw, DEFAULT_FONT_SIZE);
        setFontSize(nextSize);
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            if (selection.isCollapsed()) {
              const textNodes = $getRoot().getAllTextNodes();
              if (!textNodes.length) {
                const paragraph = $createParagraphNode();
                const text = $createTextNode("");
                text.setStyle(styleWithFontSize("", nextSize));
                paragraph.append(text);
                $getRoot().append(paragraph);
              } else {
                textNodes.forEach((node) => {
                  node.setStyle(styleWithFontSize(node.getStyle(), nextSize));
                });
              }
              return;
            }
            $patchStyleText(selection, { "font-size": `${nextSize}px` });
            return;
          }
          const textNodes = $getRoot().getAllTextNodes();
          textNodes.forEach((node) => {
            node.setStyle(styleWithFontSize(node.getStyle(), nextSize));
          });
        });
      },
      [editor, setFontSize]
    );

    const toggleBulletList = useCallback(() => {
      let isActive = false;
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        isActive = selectionIsBulletList(selection);
      });
      editor.dispatchCommand(
        isActive ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined
      );
    }, [editor]);

    return (
      <div className="note-toolbar" aria-label="Mise en forme de la note">
        <label className="note-size-control" htmlFor="whNoteFontSizeModal">
          <span className="note-size-label">Taille</span>
          <select
            id="whNoteFontSizeModal"
            className="note-tool note-size-select"
            title="Taille de la police de la note"
            aria-label="Taille de la police"
            value={String(fontSize)}
            onChange={(event) => applyFontSize(event.target.value)}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          id="whNoteBoldModal"
          className={`note-tool${isBold ? " is-active" : ""}`}
          title="Texte en gras"
          aria-pressed={isBold ? "true" : "false"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        >
          <span aria-hidden="true">B</span>
          <span className="sr-only">Gras</span>
        </button>
        <button
          type="button"
          id="whNoteItalicModal"
          className={`note-tool${isItalic ? " is-active" : ""}`}
          title="Texte en italique"
          aria-pressed={isItalic ? "true" : "false"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        >
          <span aria-hidden="true">
            <em>I</em>
          </span>
          <span className="sr-only">Italique</span>
        </button>
        <button
          type="button"
          id="whNoteListModal"
          className={`note-tool${isBulletList ? " is-active" : ""}`}
          title="Liste a puces"
          aria-pressed={isBulletList ? "true" : "false"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleBulletList}
        >
          <span aria-hidden="true">&bull;</span>
          <span className="sr-only">Liste a puces</span>
        </button>
      </div>
    );
  }

  function ModalLexicalEditor({ serializedValue, valueVersion, onSerializedChange }) {
    const [fontSize, setFontSizeState] = useState(() => resolveRootSize(serializedValue, DEFAULT_FONT_SIZE));
    const [isEmpty, setIsEmpty] = useState(true);
    const fontSizeRef = useRef(fontSize);

    useEffect(() => {
      fontSizeRef.current = fontSize;
    }, [fontSize]);

    const setFontSize = useCallback((value) => {
      setFontSizeState((prev) => {
        const next = resolveFontSize(value, prev);
        return prev === next ? prev : next;
      });
    }, []);

    const onHydrated = useCallback(({ isEmpty: nextIsEmpty, size }) => {
      setIsEmpty(!!nextIsEmpty);
      setFontSize(size);
    }, [setFontSize]);

    const onChange = useCallback(
      (editorState, editor, tags) => {
        if (tags?.has?.(EXTERNAL_UPDATE_TAG)) return;
        editorState.read(() => {
          const rawHtml = $generateHtmlFromNodes(editor, null);
          const normalized = normalizeNoteHtml(rawHtml);
          const nextEmpty = isBlankHtml(normalized);
          const serialized = nextEmpty ? "" : ensureSizeWrapper(normalized, fontSizeRef.current);
          setIsEmpty(nextEmpty);
          safeCall(onSerializedChange, { serialized, isEmpty: nextEmpty, source: "editor" });
        });
      },
      [onSerializedChange]
    );

    const initialConfig = {
      namespace: "whNoteModal",
      theme: {},
      editable: true,
      onError(error) {
        console.error("[wh-note-lexical-modal] editor error", error);
      },
      nodes: [ListNode, ListItemNode]
    };

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div className="note-lexical-shell">
          <ModalToolbar fontSize={fontSize} setFontSize={setFontSize} />
          <div
            id={EDITOR_ID}
            className="note-editor note-editor--lexical"
            aria-labelledby={LABEL_ID}
            data-placeholder={PLACEHOLDER}
            data-empty={isEmpty ? "true" : "false"}
            data-editor-engine="lexical"
            tabIndex="0"
          >
            <div className="note-editor-lexical-body lexical-note-wrap">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="note-editor lexical-note-editor"
                    aria-labelledby={LABEL_ID}
                  />
                }
                placeholder={
                  <div className="lexical-note-placeholder">{PLACEHOLDER}</div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            </div>
          </div>
          <AutoFocusPlugin />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin ignoreSelectionChange={false} onChange={onChange} />
          <ExternalValuePlugin
            serializedValue={serializedValue}
            valueVersion={valueVersion}
            onHydrated={onHydrated}
            setFontSize={setFontSize}
          />
        </div>
      </LexicalComposer>
    );
  }

  const render = () => {
    if (!state.root) return;
    state.root.render(
      <ModalLexicalEditor
        serializedValue={state.serializedValue}
        valueVersion={state.valueVersion}
        onSerializedChange={({ serialized, isEmpty, source }) => {
          state.serializedValue = String(serialized || "");
          setHiddenValue(state.serializedValue);
          setEditorEmpty(!!isEmpty);
          safeCall(state.onChange, {
            group: "modal",
            source: source || "editor",
            value: state.serializedValue,
            isEmpty: !!isEmpty
          });
        }}
      />
    );
  };

  const mount = (opts = {}) => {
    if (typeof document === "undefined") return false;
    const mountNode = document.getElementById(MOUNT_ID);
    if (!mountNode) return false;

    state.onChange = typeof opts.onChange === "function" ? opts.onChange : null;
    state.serializedValue = getHiddenValue();
    state.valueVersion += 1;

    if (!state.root || state.mountNode !== mountNode) {
      try {
        state.root?.unmount?.();
      } catch {}
      state.root = createRoot(mountNode);
      state.mountNode = mountNode;
    }

    render();
    return true;
  };

  const unmount = () => {
    if (!state.root) return;
    try {
      state.root.unmount();
    } catch (err) {
      console.warn("[wh-note-lexical-modal] unmount failed", err);
    } finally {
      state.root = null;
      state.mountNode = null;
    }
  };

  const setContent = (value = "", opts = {}) => {
    const next = String(value || "");
    state.serializedValue = next;
    if (opts.syncHidden !== false) {
      setHiddenValue(next);
    }
    if (!state.root) return;
    state.valueVersion += 1;
    render();
  };

  const syncFromHidden = () => {
    setContent(getHiddenValue(), { syncHidden: false });
  };

  SEM.__whNoteLexicalModal = {
    mount,
    unmount,
    setContent,
    syncFromHidden,
    isMounted: () => !!state.root,
    getValue: () => String(state.serializedValue || "")
  };
})(window);
