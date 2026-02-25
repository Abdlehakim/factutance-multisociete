(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("models", function (ctx) {
          modelSelect = getEl("modelSelect");
          modelActionsSelect = getEl("modelActionsSelect");
          modelNameInput = getEl("modelName");
          modelSaveBtn = getEl("btnModelSave");
          modelUpdateBtn = getEl("btnModelUpdate");
          modelDeleteBtn = getEl("btnModelDelete");
          modelNewBtn = getEl("btnModelNew");
          modelActionsNewBtn = getEl("modelActionNew");
          modelActionsToggle = getEl("modelActionsToggle");
          modelActionsRow = getEl("modelActionsRow");
          modelActionsModal = getEl("modelActionsModal");
          modelActionsClose = getEl("modelActionsClose");
          modelActionsCloseFooter = getEl("modelActionsCloseFooter");
          modelCreateFlowBtn = getEl("modelCreateFlowBtn");
          modelActionsButtons = modelCreateFlowBtn?.closest(".model-actions-buttons");
          modelActionsWrapper = modelCreateFlowBtn?.closest(".model-actions-wrapper");
          modelStepperShell = getEl("modelStepperShell");
          modelActionsSelectMenu = getEl("modelActionsSelectMenu");
          modelCancelFlowBtn = getEl("modelCancelFlowBtn");
          modelStepperTabs = modelActionsModal
            ? Array.from(modelActionsModal.querySelectorAll("[data-model-step]"))
            : [];
          modelStepperPanels = modelActionsModal
            ? Array.from(modelActionsModal.querySelectorAll("[data-model-step-panel]"))
            : [];
          modelStepperPrev = modelActionsModal?.querySelector("[data-model-step-prev]");
          modelStepperNext = modelActionsModal?.querySelector("[data-model-step-next]");
          modelStepperCurrent = modelActionsModal?.querySelector("[data-model-step-current]");
          modelStepperTotal = modelActionsModal?.querySelector("[data-model-step-total]");
          modelStepperActive = 1;
          modelStepperMax = modelStepperPanels.length || 1;
          if (modelStepperTotal) modelStepperTotal.textContent = String(modelStepperMax);
          modelSaveLocked = false;
          modelBaselineString = null;
          modelDirty = false;
          modelDirtyCheckTimer = null;
          modelActionsOpen = false;
          modelActionsRestoreFocus = null;
          modelApplying = false;
          modelNotePlaceholderEnabled = false;
          modelPreviewNumberLengthOverride = null;
          MODEL_PREVIEW_ZOOM_MIN = 0.4;
          MODEL_PREVIEW_ZOOM_MAX = 1.4;
          MODEL_PREVIEW_ZOOM_STEP = 0.02;
          modelPreviewScaleDefault = null;
          modelPreviewScaleCurrent = null;
          clampModelPreviewScale = (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
              return modelPreviewScaleCurrent || modelPreviewScaleDefault || 0.64;
            }
            return Math.min(MODEL_PREVIEW_ZOOM_MAX, Math.max(MODEL_PREVIEW_ZOOM_MIN, parsed));
          };
          readModelPreviewScale = () => {
            const root = modelActionsModal || getEl("modelActionsModal");
            const styles = root && typeof getComputedStyle === "function"
              ? getComputedStyle(root)
              : null;
            const raw = styles?.getPropertyValue("--model-preview-scale") || "";
            const parsed = Number.parseFloat(String(raw).trim());
            if (Number.isFinite(parsed)) {
              return clampModelPreviewScale(parsed);
            }
            return clampModelPreviewScale(modelPreviewScaleDefault || modelPreviewScaleCurrent || 0.64);
          };
          syncModelPreviewZoomControls = () => {
            const root = modelActionsModal || getEl("modelActionsModal");
            if (!root) return;
            const zoomRange = root.querySelector("#modelPreviewZoomRange");
            const zoomValue = root.querySelector("#modelPreviewZoomValue");
            const zoomInBtn = root.querySelector("#modelPreviewZoomIn");
            const zoomOutBtn = root.querySelector("#modelPreviewZoomOut");
            const effective = clampModelPreviewScale(modelPreviewScaleCurrent || readModelPreviewScale());
            modelPreviewScaleCurrent = effective;
            const percent = Math.round(effective * 100);
            if (zoomRange) {
              zoomRange.min = String(Math.round(MODEL_PREVIEW_ZOOM_MIN * 100));
              zoomRange.max = String(Math.round(MODEL_PREVIEW_ZOOM_MAX * 100));
              zoomRange.step = "1";
              if (zoomRange.value !== String(percent)) zoomRange.value = String(percent);
            }
            if (zoomValue) zoomValue.textContent = `${percent}%`;
            if (zoomInBtn) zoomInBtn.disabled = effective >= MODEL_PREVIEW_ZOOM_MAX - 0.0001;
            if (zoomOutBtn) zoomOutBtn.disabled = effective <= MODEL_PREVIEW_ZOOM_MIN + 0.0001;
          };
          applyModelPreviewScale = (nextScale, options = {}) => {
            const opts = options && typeof options === "object" ? options : {};
            const effective = clampModelPreviewScale(nextScale);
            if (!Number.isFinite(modelPreviewScaleDefault) || opts.setDefault) {
              modelPreviewScaleDefault = effective;
            }
            modelPreviewScaleCurrent = effective;
            const root = modelActionsModal || getEl("modelActionsModal");
            if (root) {
              root.style.setProperty("--model-preview-scale", String(effective));
            }
            syncModelPreviewZoomControls();
          };
          stepModelPreviewScale = (steps = 1) => {
            const count = Number(steps);
            const base = modelPreviewScaleCurrent || readModelPreviewScale();
            const next = base + (Number.isFinite(count) ? count : 1) * MODEL_PREVIEW_ZOOM_STEP;
            applyModelPreviewScale(next);
          };
          resetModelPreviewScale = () => {
            const fallback = modelPreviewScaleDefault || readModelPreviewScale();
            applyModelPreviewScale(fallback);
          };
          wireModelPreviewZoomControls = () => {
            if (!modelActionsModal || modelActionsModal.dataset.previewZoomWired === "1") return;
            modelActionsModal.dataset.previewZoomWired = "1";

            modelActionsModal.addEventListener("click", (event) => {
              const btn = event.target?.closest?.("[data-model-preview-zoom]");
              if (!btn || !modelActionsModal.contains(btn)) return;
              const action = btn.dataset.modelPreviewZoom;
              if (action === "in") {
                stepModelPreviewScale(1);
                return;
              }
              if (action === "out") {
                stepModelPreviewScale(-1);
                return;
              }
              if (action === "reset") {
                resetModelPreviewScale();
              }
            });

            modelActionsModal.addEventListener("input", (event) => {
              const target = event.target;
              if (!target || target.id !== "modelPreviewZoomRange") return;
              const percent = Number(target.value);
              if (!Number.isFinite(percent)) return;
              applyModelPreviewScale(percent / 100);
            });

            modelActionsModal.addEventListener(
              "wheel",
              (event) => {
                if (!event.ctrlKey) return;
                const inPreview = event.target?.closest?.(".model-actions-layout__preview");
                if (!inPreview) return;
                event.preventDefault();
                const direction = event.deltaY < 0 ? 1 : -1;
                stepModelPreviewScale(direction);
              },
              { passive: false }
            );
          };
          setModelNotePlaceholder = (value) => {
            modelNotePlaceholderEnabled = !!value;
          };
          const whPdfNoteComponent = SEM.__whPdfNoteComponent || {};
          const whNoteLexicalModal = SEM.__whNoteLexicalModal || {};
          const initModalWhNoteEditor = () => {
            const onChange = () => {
              if (typeof scheduleModelPreviewUpdate === "function") scheduleModelPreviewUpdate();
            };
            const lexicalApi = SEM.__whNoteLexicalModal || whNoteLexicalModal;
            if (typeof lexicalApi.mount === "function") {
              lexicalApi.mount({ onChange });
              return;
            }
            if (typeof whPdfNoteComponent.initGroup !== "function") return;
            whPdfNoteComponent.initGroup("modal", { state, onChange });
          };
          const destroyModalWhNoteEditor = () => {
            const lexicalApi = SEM.__whNoteLexicalModal || whNoteLexicalModal;
            if (typeof lexicalApi.unmount === "function") {
              lexicalApi.unmount();
              return;
            }
            if (typeof whPdfNoteComponent.destroyGroup !== "function") return;
            whPdfNoteComponent.destroyGroup("modal");
          };
          let modalWhNoteMountFrameA = 0;
          let modalWhNoteMountFrameB = 0;
          const cancelModalWhNoteMount = () => {
            if (modalWhNoteMountFrameA && typeof cancelAnimationFrame === "function") {
              cancelAnimationFrame(modalWhNoteMountFrameA);
            }
            if (modalWhNoteMountFrameB && typeof cancelAnimationFrame === "function") {
              cancelAnimationFrame(modalWhNoteMountFrameB);
            }
            modalWhNoteMountFrameA = 0;
            modalWhNoteMountFrameB = 0;
          };
          const scheduleModalWhNoteMount = () => {
            cancelModalWhNoteMount();
            const raf = typeof requestAnimationFrame === "function"
              ? requestAnimationFrame
              : (cb) => setTimeout(cb, 16);
            modalWhNoteMountFrameA = raf(() => {
              modalWhNoteMountFrameA = 0;
              modalWhNoteMountFrameB = raf(() => {
                modalWhNoteMountFrameB = 0;
                if (!modelActionsOpen || !modelActionsModal || modelActionsModal.hidden) return;
                initModalWhNoteEditor();
              });
            });
          };
          const footerNoteComponent = SEM.__footerNoteComponent || {};
          const FOOTER_NOTE_FONT_SIZES =
            Array.isArray(footerNoteComponent.FONT_SIZES) && footerNoteComponent.FONT_SIZES.length
              ? footerNoteComponent.FONT_SIZES.slice()
              : [7, 8, 9];
          const FOOTER_NOTE_DEFAULT_FONT_SIZE = Number.isFinite(Number(footerNoteComponent.DEFAULT_FONT_SIZE))
            ? Number(footerNoteComponent.DEFAULT_FONT_SIZE)
            : 8;
          const normalizeFooterNoteFontSize = (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return null;
            return FOOTER_NOTE_FONT_SIZES.includes(parsed) ? parsed : null;
          };
          const formatFooterNoteForPreview = (raw = "", size = FOOTER_NOTE_DEFAULT_FONT_SIZE) => {
            if (typeof footerNoteComponent.formatForPreview === "function") {
              return footerNoteComponent.formatForPreview(raw, size);
            }
            return String(raw ?? "");
          };
          const setFooterNoteEditorContent = (value = "", opts = {}) => {
            if (typeof footerNoteComponent.setEditorContent !== "function") {
              return String(value ?? "");
            }
            return footerNoteComponent.setEditorContent(
              {
                root: modelActionsModal || getEl("modelActionsModal"),
                ids: {
                  editorId: "footerNoteEditorModal",
                  hiddenId: "footerNoteModal",
                  sizeId: "footerNoteFontSizeModal",
                  boldId: "footerNoteBoldModal",
                  italicId: "footerNoteItalicModal",
                  listId: "footerNoteListModal"
                }
              },
              value,
              { size: opts.size }
            );
          };
          const wireFooterNoteEditor = () => {
            if (typeof footerNoteComponent.wireEditor !== "function") return;
            footerNoteComponent.wireEditor({
              root: modelActionsModal || getEl("modelActionsModal"),
              ids: {
                editorId: "footerNoteEditorModal",
                hiddenId: "footerNoteModal",
                sizeId: "footerNoteFontSizeModal",
                boldId: "footerNoteBoldModal",
                italicId: "footerNoteItalicModal",
                listId: "footerNoteListModal"
              },
              wireFlag: "footerNoteWired",
              onStateChange: () => {
                if (typeof scheduleModelPreviewUpdate === "function") scheduleModelPreviewUpdate();
              }
            });
          };
          updateStepperNextUI = (step) => {
            if (!modelStepperNext) return;
            const isLast = step >= modelStepperMax;
            const hasName = !!sanitizeModelName(modelNameInput?.value || "");
            modelStepperNext.textContent = isLast ? "Finaliser" : "Suivant";
            modelStepperNext.dataset.finalize = isLast ? "true" : "false";
            modelStepperNext.setAttribute(
              "aria-label",
              isLast ? "Finaliser et cr\u00e9ez le mod\u00e8le" : "Aller \u00e0 l'\u00e9tape suivante"
            );
            modelStepperNext.disabled = isLast ? !hasName : false;
          };

          syncModelStepper = (targetStep) => {
            if (!modelStepperPanels.length) return;
            const maxStep = modelStepperPanels.length;
            const nextStep = Math.min(Math.max(1, Number(targetStep) || modelStepperActive || 1), maxStep);
            modelStepperActive = nextStep;
            if (modelStepperActive === 1 && modelNameInput) {
              modelNameInput.focus();
            }
            modelStepperTabs.forEach((tab) => {
              const stepNum = Number(tab.dataset.modelStep);
              const isActive = stepNum === nextStep;
              tab.classList.toggle("is-active", isActive);
              tab.setAttribute("aria-selected", isActive ? "true" : "false");
              tab.setAttribute("tabindex", isActive ? "0" : "-1");
            });
            modelStepperPanels.forEach((panel) => {
              const stepNum = Number(panel.dataset.modelStepPanel);
              const isActive = stepNum === nextStep;
              panel.classList.toggle("is-active", isActive);
              panel.hidden = !isActive;
              panel.setAttribute("aria-hidden", isActive ? "false" : "true");
            });
            if (modelStepperPrev) modelStepperPrev.disabled = nextStep <= 1;
            updateStepperNextUI(nextStep);
            if (modelStepperCurrent) modelStepperCurrent.textContent = String(nextStep);
          };

            DOC_TYPE_LABELS = {
              all: "Compatible avec tous les types",
              aucun: "Compatible avec tous les types",
              facture: "Facture",
              fa: "Facture d'achat",
              devis: "Devis",
              bl: "Bon de livraison",
              avoir: "Facture d'avoir"
            };

          MODEL_PREVIEW_CURRENCY_SYMBOLS = {
            DT: "DT",
            EUR: "\u20AC",
            USD: "$"
          };

          MODEL_PREVIEW_CURRENCY_WORDS = {
            DT: { major: { singular: "dinar", plural: "dinars" }, minor: { singular: "millime", plural: "millimes" } },
            EUR: { major: { singular: "euro", plural: "euros" }, minor: { singular: "centime", plural: "centimes" } },
            USD: { major: { singular: "dollar", plural: "dollars" }, minor: { singular: "cent", plural: "cents" } }
          };

          applyModelPreviewCurrencySymbol = (root, currencyValue) => {
            if (!root || typeof document === "undefined") return;
            const normalized = String(currencyValue || "").toUpperCase();
            const symbol = MODEL_PREVIEW_CURRENCY_SYMBOLS[normalized] || normalized || "DT";
            const config = {
              DT: { decimals: 3, position: "suffix" },
              EUR: { decimals: 2, position: "prefix" },
              USD: { decimals: 2, position: "prefix" }
            }[normalized] || { decimals: 2, position: "prefix" };
            const doc = root.ownerDocument || document;
            const nodeFilter =
              doc.defaultView?.NodeFilter || doc.NodeFilter || (typeof NodeFilter !== "undefined" ? NodeFilter : null);
            const showText = nodeFilter?.SHOW_TEXT || 4;
            const currencyPattern = /(?:([€$]|DT|EUR|USD)\s*([\d.,]+)|([\d.,]+)\s*([€$]|DT|EUR|USD))/g;
            const formatAmount = (raw = "") => {
              const cleaned = String(raw || "").replace(/[,\s\u00A0]/g, "");
              const parsed = Number.parseFloat(cleaned);
              if (!Number.isFinite(parsed)) return raw;
              return parsed.toLocaleString("en-US", {
                minimumFractionDigits: config.decimals,
                maximumFractionDigits: config.decimals
              });
            };
            const renderAmount = (num) => {
              const formatted = formatAmount(num);
              return config.position === "suffix" ? `${formatted}\u00A0${symbol}` : `${symbol}\u00A0${formatted}`;
            };
            const replaceNode = (node) => {
              const value = node?.nodeValue;
              if (!value) return;
              currencyPattern.lastIndex = 0;
              const nextValue = value.replace(currencyPattern, (_m, leadSym, leadNum, trailNum, trailSym) => {
                const numericPart = leadNum || trailNum || "";
                const matchedSym = leadSym || trailSym || "";
                // If the matched symbol is not a known currency, keep original.
                if (!matchedSym && !numericPart) return _m;
                return renderAmount(numericPart);
              });
              if (nextValue !== value) {
                node.nodeValue = nextValue;
              }
            };
            const walker = doc.createTreeWalker ? doc.createTreeWalker(root, showText, null) : null;
            if (walker) {
              while (walker.nextNode()) {
                replaceNode(walker.currentNode);
              }
            } else if (root.childNodes) {
              const traverse = (node) => {
                if (node.nodeType === 3) {
                  replaceNode(node);
                  return;
                }
                node.childNodes?.forEach(traverse);
              };
              traverse(root);
            }
            if (root.dataset) {
              root.dataset.currency = normalized || "DT";
              root.dataset.currencySymbol = symbol;
            }
          };

          applyModelPreviewCurrencyWords = (root, currencyValue) => {
            if (!root || typeof document === "undefined") return;
            const normalized = String(currencyValue || "").trim().toUpperCase() || "DT";
            const cfg = MODEL_PREVIEW_CURRENCY_WORDS[normalized] || MODEL_PREVIEW_CURRENCY_WORDS.DT;
            const amountWordsContainer = root.querySelector?.(".doc-design1__amount-words");
            if (!amountWordsContainer) return;
            const strong = amountWordsContainer.querySelector?.("strong");
            if (!strong) return;

            if (!strong.dataset.modelPreviewBaseWords) {
              strong.dataset.modelPreviewBaseWords = strong.textContent || "";
            }
            const baseText = strong.dataset.modelPreviewBaseWords || "";
            const majorWordRe = /\b(dinars?|euros?|dollars?)\b/gi;
            const minorWordRe = /\b(millimes?|centimes?|cents?)\b/gi;
            const selectPlural = (matched, term) => (String(matched || "").toLowerCase().endsWith("s") ? term.plural : term.singular);
            const nextText = baseText
              .replace(majorWordRe, (matched) => selectPlural(matched, cfg.major))
              .replace(minorWordRe, (matched) => selectPlural(matched, cfg.minor));
            if (strong.textContent !== nextText) strong.textContent = nextText;
          };

          updateModelPreview = () => {
            const previewRoot = getEl("modelActionsPreview");
            if (!previewRoot) return;
            syncModelPreviewZoomControls();
            const modelPreviewDoc = getEl("modelPreviewDoc");
            const modelPreviewCurrency = getEl("modelPreviewCurrency");
            const modelPreviewTax = getEl("modelPreviewTax");
            const modelPreviewExtras = getEl("modelPreviewExtras");
            const setTextWithFallback = (id, value) => {
              const el = getEl(id);
              if (!el) return;
              const fallback = el.dataset?.default || el.textContent || "";
              const text = typeof value === "string" ? value.trim() : "";
              el.textContent = text || fallback;
            };
            const checkedValue = (container) => {
              const input = container?.querySelector("input:checked");
              return input?.value || "";
            };
            const getSelectedModelDocTypes = () => {
              const panelValues = Array.from(
                getEl("modelDocTypePanel")?.querySelectorAll?.('input[type="checkbox"][name="modelDocTypeChoice"]:checked') || []
              )
                .map((input) => String(input.value || "").trim().toLowerCase())
                .filter(Boolean);
              if (panelValues.length) return panelValues;
              const selectValues = Array.from(getEl("modelDocType")?.selectedOptions || [])
                .map((opt) => String(opt.value || "").trim().toLowerCase())
                .filter(Boolean);
              if (selectValues.length) return selectValues;
              const fallback = String(getEl("modelDocType")?.value || "").trim().toLowerCase();
              return fallback ? [fallback] : [];
            };
            const selectedModelDocTypes = getSelectedModelDocTypes();
            const hasDocTypes = Array.isArray(selectedModelDocTypes) && selectedModelDocTypes.length > 0;
            const effectiveDocType = selectedModelDocTypes[0] || "facture";
            const currency =
              checkedValue(getEl("modelCurrencyPanel")) || getEl("modelCurrency")?.value || "DT";
            const taxMode =
              checkedValue(getEl("modelTaxPanel")) || getEl("modelTaxMode")?.value || "with";
            const numberFormatRaw =
              checkedValue(getEl("modelNumberFormatPanel")) ||
              getEl("modelNumberFormat")?.value ||
              state()?.meta?.numberFormat ||
              "prefix_date_counter";
            const normalizeNumberFormatLocal = (value, fallback = "prefix_date_counter") => {
              const raw = String(value || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
              const fb = String(fallback || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
              return "prefix_date_counter";
            };
            const numberFormat = normalizeNumberFormatLocal(numberFormatRaw, state()?.meta?.numberFormat);
            const shipEnabled = !!getEl("shipEnabledModal")?.checked;
            const dossierEnabled = !!getEl("dossierEnabledModal")?.checked;
            const deplacementEnabled = !!getEl("deplacementEnabledModal")?.checked;
            const extras = [];
            if (shipEnabled) extras.push("Livraison");
            if (dossierEnabled) extras.push("Dossier");
            if (deplacementEnabled) extras.push("Deplacement");
            const stampEnabled = !!getEl("stampEnabledModal")?.checked;
            if (stampEnabled) extras.push("Timbre");
            if (getEl("whEnabledModal")?.checked) extras.push("Retenue");
            const company = state()?.company || {};
            const pdfOptions = state()?.meta?.extras?.pdf || {};
            const showSeal = getEl("pdfShowSealModal")?.checked ?? (pdfOptions.showSeal !== false);
            const showSignature = getEl("pdfShowSignatureModal")?.checked ?? (pdfOptions.showSignature !== false);
            const showAmountWords = getEl("pdfShowAmountWordsModal")?.checked ?? (pdfOptions.showAmountWords !== false);

            if (modelPreviewDoc) {
              modelPreviewDoc.textContent = DOC_TYPE_LABELS[effectiveDocType] || effectiveDocType || "N/A";
            }
            const prefixMap = {
              facture: "Fact",
              fa: "FA",
              devis: "Dev",
              bl: "BL",
              avoir: "AV"
            };
            const previewNumberEl = getEl("modelPreviewNumber");
            const rawNumber = String(state()?.meta?.number || previewNumberEl?.textContent || "").trim();
            if (previewNumberEl) {
              const previewDocType = hasDocTypes ? effectiveDocType : "facture";
              const numberLengthSource =
                modelPreviewNumberLengthOverride ??
                getEl("invNumberLength")?.value ??
                state()?.meta?.numberLength ??
                4;
              const numberLengthRaw = Number(numberLengthSource);
              const numberLength = [4, 6, 8, 12].includes(numberLengthRaw) ? numberLengthRaw : 4;
              const rawDigits = String(rawNumber.match(/(\d+)\s*$/)?.[1] || "");
              const baseDigits = rawDigits || "1";
              const paddedCounter =
                baseDigits.length > numberLength
                  ? baseDigits.slice(-numberLength)
                  : baseDigits.padStart(numberLength, "0");
              const counterValue = numberFormat === "prefix_date_counter" ? baseDigits : paddedCounter;
              if (typeof formatInvoiceNumber === "function") {
                const formatted = formatInvoiceNumber(counterValue, numberLength, {
                  docType: previewDocType,
                  date: state()?.meta?.date,
                  numberFormat
                });
                previewNumberEl.textContent = formatted;
              } else {
                const numberPrefix = prefixMap[previewDocType] || prefixMap.facture;
                const counter = counterValue;
                if (numberFormat === "counter") {
                  previewNumberEl.textContent = counter;
                } else if (numberFormat === "prefix_counter") {
                  previewNumberEl.textContent = `${numberPrefix}_${counter}`;
                } else {
                  const dateRaw = state()?.meta?.date ? new Date(state().meta.date) : new Date();
                  const safeDate = Number.isFinite(dateRaw.getTime()) ? dateRaw : new Date();
                  const year = String(safeDate.getFullYear());
                  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
                  const shortYear = year.slice(-2);
                  previewNumberEl.textContent = `${numberPrefix}_${shortYear}-${month}-${counter}`;
                }
              }
            }
            if (modelPreviewCurrency) modelPreviewCurrency.textContent = currency || "N/A";
            if (modelPreviewTax) modelPreviewTax.textContent = taxMode === "without" ? "Sans taxe" : "Avec taxe";
            if (modelPreviewExtras) modelPreviewExtras.textContent = extras.length ? extras.join(", ") : "Aucune option active";
            setTextWithFallback("modelPreviewCompanyName", company.name);
            setTextWithFallback("modelPreviewCompanyMf", company.vat || company.mf);
            setTextWithFallback("modelPreviewCompanyPhone", company.phone);
            setTextWithFallback("modelPreviewCompanyEmail", company.email);
            setTextWithFallback("modelPreviewCompanyAddress", company.address);
            const shippingRow = previewRoot.querySelector('[data-mini-key="shipping"]');
            if (shippingRow) {
              shippingRow.hidden = !shipEnabled;
              shippingRow.style.display = shipEnabled ? "" : "none";
            }
            const dossierRow = previewRoot.querySelector('[data-mini-key="dossier"]');
            if (dossierRow) {
              dossierRow.hidden = !dossierEnabled;
              dossierRow.style.display = dossierEnabled ? "" : "none";
            }
            const deplacementRow = previewRoot.querySelector('[data-mini-key="deplacement"]');
            if (deplacementRow) {
              deplacementRow.hidden = !deplacementEnabled;
              deplacementRow.style.display = deplacementEnabled ? "" : "none";
            }
            const stampRow = previewRoot.querySelector('[data-mini-key="stamp"]');
            if (stampRow) {
              stampRow.hidden = !stampEnabled;
              stampRow.style.display = stampEnabled ? "" : "none";
            }
            const amountWordsContainer = previewRoot.querySelector(".doc-design1__amount-words");
            if (amountWordsContainer) {
              amountWordsContainer.hidden = !showAmountWords;
              amountWordsContainer.style.display = showAmountWords ? "" : "none";
            }
            const noteContainer = previewRoot.querySelector("#modelPreviewNote");
            const noteValue = (getEl("whNoteModal")?.value || "").trim();
            if (noteContainer) {
              if (!noteContainer.dataset.defaultNote) {
                noteContainer.dataset.defaultNote = noteContainer.innerHTML || "";
              }
              const stripHtml = (html) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;|\u00a0/g, " ").trim();
              const hasNote = !!stripHtml(noteValue);
              const fallback = modelNotePlaceholderEnabled ? (noteContainer.dataset.defaultNote || "") : "";
              const html = hasNote ? noteValue : fallback;
              noteContainer.innerHTML = html;
              noteContainer.hidden = !html;
              noteContainer.style.display = html ? "" : "none";
            }
            const footerNoteEl = previewRoot.querySelector("#modelPreviewFooterNote");
            if (footerNoteEl) {
              const footerNoteValue = getEl("footerNoteModal")?.value || "";
              const footerNoteSizeRaw = Number.parseInt(getEl("footerNoteFontSizeModal")?.value, 10);
              const footerNoteSize = [7, 8, 9].includes(footerNoteSizeRaw) ? footerNoteSizeRaw : 8;
              const sanitizedFooterNote = formatFooterNoteForPreview(footerNoteValue, footerNoteSize);
              const hasFooterNote =
                !!sanitizedFooterNote.replace(/<[^>]+>/g, "").replace(/&nbsp;|\u00a0/g, " ").trim();
              footerNoteEl.innerHTML = sanitizedFooterNote;
              footerNoteEl.style.fontSize = `${footerNoteSize}px`;
              footerNoteEl.hidden = !hasFooterNote;
              footerNoteEl.style.display = hasFooterNote ? "" : "none";
            }
            const logoEl = getEl("modelPreviewLogo");
            const companyLogoSrc = state()?.company?.logo || getEl("companyLogo")?.getAttribute("src") || "";
            if (logoEl) {
              if (companyLogoSrc) {
                if (logoEl.getAttribute("src") !== companyLogoSrc) logoEl.src = companyLogoSrc;
                logoEl.hidden = false;
              } else {
                logoEl.removeAttribute("src");
                logoEl.hidden = true;
              }
            }

            const sealOverlay = previewRoot.querySelector("#modelPreviewSealOverlay");
            const sealImg = previewRoot.querySelector("#modelPreviewSealImg");
            const sealSrc = company?.seal?.image || "";
            if (sealOverlay && sealImg) {
              if (showSeal && sealSrc) {
                if (sealImg.getAttribute("src") !== sealSrc) sealImg.setAttribute("src", sealSrc);
                const rotation = Number(company?.seal?.rotateDeg);
                sealImg.style.transform = Number.isFinite(rotation) ? `rotate(${rotation}deg)` : "";
                const opacity = Number(company?.seal?.opacity);
                sealImg.style.opacity = Number.isFinite(opacity) ? String(opacity) : "";
                sealOverlay.hidden = false;
              } else {
                sealImg.removeAttribute("src");
                sealImg.style.transform = "";
                sealImg.style.opacity = "";
                sealOverlay.hidden = true;
              }
            }

            const signatureOverlay = previewRoot.querySelector("#modelPreviewSignatureOverlay");
            const signatureImg = previewRoot.querySelector("#modelPreviewSignatureImg");
            const signatureSrc = company?.signature?.image || "";
            if (signatureOverlay && signatureImg) {
              if (showSignature && signatureSrc) {
                if (signatureImg.getAttribute("src") !== signatureSrc) signatureImg.setAttribute("src", signatureSrc);
                const rotation = Number(company?.signature?.rotateDeg);
                signatureImg.style.transform = Number.isFinite(rotation) ? `rotate(${rotation}deg)` : "";
                signatureOverlay.hidden = false;
              } else {
                signatureImg.removeAttribute("src");
                signatureImg.style.transform = "";
                signatureOverlay.hidden = true;
              }
            }

            applyModelPreviewCurrencySymbol(previewRoot, currency);
            applyModelPreviewCurrencyWords(previewRoot, currency);
            const colToggles = {};
            (modelActionsModal?.querySelectorAll("input.col-toggle[data-column-key]") || []).forEach((input) => {
              const key = normalizeColumnKey(input?.dataset?.columnKey);
              if (!key) return;
              colToggles[key] = !!input.checked;
            });
            const saleFodecToggle = getEl("colToggleFodecModal");
            const purchaseFodecToggle = getEl("colTogglePurchaseFodecModal");
            const contextualFodecToggle =
              effectiveDocType === "fa"
                ? purchaseFodecToggle || saleFodecToggle
                : saleFodecToggle || purchaseFodecToggle;
            if (contextualFodecToggle) {
              colToggles.fodec = !!contextualFodecToggle.checked;
            }
            const taxesEnabled = taxMode !== "without";
            const isColumnChecked = (key) => colToggles[key] === true;
            const priceVis = isColumnChecked("price");
            const purchasePriceVis = isColumnChecked("purchasePrice");
            const readModalNumber = (id, fallback = 0) => {
              const raw = getEl(id)?.value;
              const cleaned = String(raw ?? "").replace(/\u00a0|\s/g, "").trim();
              if (!cleaned) return fallback;
              let normalized = cleaned;
              if (normalized.includes(",") && normalized.includes(".")) {
                normalized = normalized.replace(/,/g, "");
              } else if (normalized.includes(",") && !normalized.includes(".")) {
                normalized = normalized.replace(/,/g, ".");
              }
              const parsed = Number.parseFloat(normalized);
              return Number.isFinite(parsed) ? parsed : fallback;
            };
            const parsePreviewMoney = (value) => {
              const raw = String(value || "").replace(/\u00a0/g, " ").trim();
              if (!raw) return 0;
              const cleaned = raw.replace(/[^0-9,.\-]/g, "");
              if (!cleaned) return 0;
              let normalized = cleaned;
              if (normalized.includes(",") && normalized.includes(".")) {
                normalized = normalized.replace(/,/g, "");
              } else if (normalized.includes(",") && !normalized.includes(".")) {
                normalized = normalized.replace(/,/g, ".");
              }
              const parsed = Number.parseFloat(normalized);
              return Number.isFinite(parsed) ? parsed : 0;
            };
            const sumPreviewColumn = (colKey) => {
              const cells = previewRoot.querySelectorAll(`.doc-design1__table tbody [data-col="${colKey}"]`);
              let sum = 0;
              cells.forEach((cell) => {
                sum += parsePreviewMoney(cell?.textContent || "");
              });
              return sum;
            };
            const currencyCode = String(currency || "DT").trim().toUpperCase() || "DT";
            const currencySymbol = MODEL_PREVIEW_CURRENCY_SYMBOLS[currencyCode] || currencyCode || "DT";
            const currencyDisplayConfig = {
              DT: { decimals: 3, position: "suffix" },
              EUR: { decimals: 2, position: "prefix" },
              USD: { decimals: 2, position: "prefix" }
            }[currencyCode] || { decimals: 2, position: "prefix" };
            const formatPreviewMoney = (value) => {
              const amount = Number(value);
              const safeAmount = Number.isFinite(amount) ? amount : 0;
              const formatted = safeAmount.toLocaleString("en-US", {
                minimumFractionDigits: currencyDisplayConfig.decimals,
                maximumFractionDigits: currencyDisplayConfig.decimals
              });
              return currencyDisplayConfig.position === "suffix"
                ? `${formatted}\u00a0${currencySymbol}`
                : `${currencySymbol}\u00a0${formatted}`;
            };
            const setMiniRowValue = (key, amount) => {
              const row = previewRoot.querySelector(`[data-mini-key="${key}"]`);
              if (!row) return;
              const valueCell = row.querySelector(".right");
              if (!valueCell) return;
              valueCell.textContent = formatPreviewMoney(amount);
            };
            const setMiniRowVisibility = (key, visible) => {
              const row = previewRoot.querySelector(`[data-mini-key="${key}"]`);
              if (!row) return;
              row.hidden = !visible;
              row.style.display = visible ? "" : "none";
            };
            const shipAmount = shipEnabled ? readModalNumber("shipAmountModal", 0) : 0;
            const shipTva = taxesEnabled && shipEnabled ? readModalNumber("shipTvaModal", 0) : 0;
            const shipTax = taxesEnabled && shipEnabled ? shipAmount * (shipTva / 100) : 0;
            const dossierAmount = dossierEnabled ? readModalNumber("dossierAmountModal", 0) : 0;
            const dossierTva = taxesEnabled && dossierEnabled ? readModalNumber("dossierTvaModal", 0) : 0;
            const dossierTax = taxesEnabled && dossierEnabled ? dossierAmount * (dossierTva / 100) : 0;
            const deplacementAmount = deplacementEnabled ? readModalNumber("deplacementAmountModal", 0) : 0;
            const deplacementTva = taxesEnabled && deplacementEnabled ? readModalNumber("deplacementTvaModal", 0) : 0;
            const deplacementTax = taxesEnabled && deplacementEnabled ? deplacementAmount * (deplacementTva / 100) : 0;
            const stampAmount = stampEnabled ? readModalNumber("stampAmountModal", 0) : 0;
            const totalPurchaseHtAmount = sumPreviewColumn("totalPurchaseHt");
            const totalPurchaseTtcAmount = taxesEnabled ? sumPreviewColumn("totalPurchaseTtc") : totalPurchaseHtAmount;
            const totalHtItemsAmount = sumPreviewColumn("totalHt");
            const totalTtcItemsAmount = taxesEnabled ? sumPreviewColumn("ttc") : totalHtItemsAmount;
            const totalHtDisplayAmount = totalHtItemsAmount + shipAmount;
            const totalTtcDisplayAmount =
              totalTtcItemsAmount +
              shipAmount +
              shipTax +
              dossierAmount +
              dossierTax +
              deplacementAmount +
              deplacementTax +
              stampAmount;
            setMiniRowValue("total-ht", totalHtDisplayAmount);
            setMiniRowValue("total-purchase-ht", totalPurchaseHtAmount);
            setMiniRowValue("total-purchase-ttc", totalPurchaseTtcAmount);
            setMiniRowValue("total-ttc", totalTtcDisplayAmount);
            const setPreviewLabels = (enabled) => {
              const priceHeader = previewRoot.querySelector('th[data-col="price"]');
              const totalHtHeader = previewRoot.querySelector('th[data-col="totalHt"]');
              const miniTotalHt = previewRoot.querySelector('[data-mini-key="total-ht"] th:first-child');
              if (priceHeader) priceHeader.textContent = enabled ? "P.U. HT" : "Prix unitaire";
              if (totalHtHeader) totalHtHeader.textContent = enabled ? "Total HT" : "Total";
              if (miniTotalHt) miniTotalHt.textContent = enabled ? "Total HT" : "Total";
            };
            setPreviewLabels(taxesEnabled);
            previewRoot.classList.toggle("tax-disabled", !taxesEnabled);
            const isPurchaseDocType = effectiveDocType === "fa";
            const saleFodecChecked = saleFodecToggle ? !!saleFodecToggle.checked : isColumnChecked("fodec");
            const purchaseFodecChecked = purchaseFodecToggle
              ? !!purchaseFodecToggle.checked
              : isColumnChecked("fodecPurchase");
            const visibility = {
              ref: isColumnChecked("ref"),
              product: isColumnChecked("product"),
              desc: isColumnChecked("desc"),
              qty: isColumnChecked("qty"),
              unit: isColumnChecked("unit"),
              purchasePrice: purchasePriceVis,
              purchaseTva: isColumnChecked("purchaseTva") && purchasePriceVis && taxesEnabled,
              price: priceVis,
              fodecSale: saleFodecChecked && taxesEnabled && !isPurchaseDocType,
              fodecPurchase: purchaseFodecChecked && taxesEnabled && isPurchaseDocType,
              tva: isColumnChecked("tva") && priceVis && taxesEnabled,
              discount: isColumnChecked("discount"),
              totalPurchaseHt: isColumnChecked("totalPurchaseHt") && purchasePriceVis,
              totalHt: isColumnChecked("totalHt") && priceVis,
              totalPurchaseTtc: isColumnChecked("totalPurchaseTtc") && purchasePriceVis && taxesEnabled,
              totalTtc: isColumnChecked("totalTtc") && priceVis && taxesEnabled
            };
            const classMap = {
              ref: "hide-col-ref",
              product: "hide-col-product",
              desc: "hide-col-desc",
              qty: "hide-col-qty",
              unit: "hide-col-unit",
              purchasePrice: "hide-col-purchase-price",
              purchaseTva: "hide-col-purchase-tva",
              price: "hide-col-price",
              fodecSale: "hide-col-fodec-sale",
              fodecPurchase: "hide-col-fodec-purchase",
              tva: "hide-col-tva",
              discount: "hide-col-discount",
              totalPurchaseHt: "hide-col-total-purchase-ht",
              totalHt: "hide-col-total-ht",
              totalPurchaseTtc: "hide-col-total-purchase-ttc",
              totalTtc: "hide-col-ttc"
            };
            Object.entries(classMap).forEach(([key, cls]) => {
              const visible = visibility[key] !== false;
              previewRoot.classList.toggle(cls, !visible);
            });
            previewRoot.classList.remove("hide-col-fodec");
            // Mini summary totals depend on selected document type, not table column toggles.
            const miniRowVisibility = {
              totalHt: !isPurchaseDocType,
              totalPurchaseHt: isPurchaseDocType,
              totalPurchaseTtc: isPurchaseDocType,
              totalTtc: !isPurchaseDocType
            };
            setMiniRowVisibility("total-ht", miniRowVisibility.totalHt);
            setMiniRowVisibility("total-purchase-ht", miniRowVisibility.totalPurchaseHt);
            setMiniRowVisibility("total-purchase-ttc", miniRowVisibility.totalPurchaseTtc);
            setMiniRowVisibility("total-ttc", miniRowVisibility.totalTtc);

            const miniSummary = previewRoot.querySelector(".doc-design1__mini-sum");
            if (miniSummary) {
              const hasVisibleMiniRow = Object.values(miniRowVisibility).some(Boolean);
              miniSummary.hidden = !hasVisibleMiniRow;
              miniSummary.style.display = hasVisibleMiniRow ? "" : "none";
            }
          };
          helpers.updateModelPreview = updateModelPreview;
          raf = w.requestAnimationFrame?.bind(w) || ((fn) => setTimeout(fn, 16));
          caf = w.cancelAnimationFrame?.bind(w) || clearTimeout;
          modelPreviewUpdateFrame = null;
          scheduleModelPreviewUpdate = () => {
            if (modelPreviewUpdateFrame) caf(modelPreviewUpdateFrame);
            modelPreviewUpdateFrame = raf(() => {
              modelPreviewUpdateFrame = null;
              updateModelPreview();
            });
          };

          liveBindingsContext = (SEM.__liveBindingsContext = SEM.__liveBindingsContext || {});
          liveBindingsContext.ADD_FORM_SCOPE_SELECTOR = ADD_FORM_SCOPE_SELECTOR;
          liveBindingsContext.normalizeAddFormScope = normalizeAddFormScope;
          liveBindingsContext.scheduleModelPreviewUpdate = scheduleModelPreviewUpdate;

          MODEL_COLUMN_VISIBILITY_DEFAULTS = {
            ref: true,
            product: true,
            desc: false,
            qty: true,
            unit: true,
            purchasePrice: false,
            purchaseTva: false,
            price: true,
            fodec: true,
            fodecPurchase: false,
            tva: true,
            discount: true,
            totalPurchaseHt: false,
            totalHt: true,
            totalPurchaseTtc: false,
            totalTtc: true
          };
          resolveModelColumnVisibilityDefaults = () => {
            const defaults =
              w.DEFAULT_ARTICLE_FIELD_VISIBILITY && typeof w.DEFAULT_ARTICLE_FIELD_VISIBILITY === "object"
                ? w.DEFAULT_ARTICLE_FIELD_VISIBILITY
                : {};
            return { ...MODEL_COLUMN_VISIBILITY_DEFAULTS, ...defaults };
          };
          COLUMN_KEY_ALIASES = (() => {
            const aliases = Object.create(null);
            const defaults = resolveModelColumnVisibilityDefaults();
            Object.keys(defaults).forEach((key) => {
              aliases[String(key).toLowerCase()] = key;
            });
            aliases.ttc = "totalTtc";
            aliases.totalttc = "totalTtc";
            aliases.totalht = "totalHt";
            return aliases;
          })();
          normalizeColumnKey = (raw) => {
            const str = String(raw || "").trim();
            if (!str) return "";
            const cleaned = str.replace(/[^a-zA-Z0-9]+/g, "");
            if (!cleaned) return "";
            const aliasKey = cleaned.toLowerCase();
            if (COLUMN_KEY_ALIASES[aliasKey]) return COLUMN_KEY_ALIASES[aliasKey];
            return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
          };
          readColumnConfigValue = (config, key) => {
            if (!config || typeof config !== "object") return undefined;
            const normalizedKey = normalizeColumnKey(key);
            if (!normalizedKey) return undefined;
            for (const [rawKey, rawValue] of Object.entries(config)) {
              if (normalizeColumnKey(rawKey) === normalizedKey) return rawValue;
            }
            return undefined;
          };
          TAX_DEPENDENT_COLUMN_KEYS = new Set([
            "fodec",
            "fodecPurchase",
            "tva",
            "purchaseTva",
            "totalPurchaseTtc",
            "totalTtc"
          ]);
          isModelColumnToggle = (input) => {
            if (!input) return false;
            if (typeof input.closest === "function" && input.closest("#modelActionsModal")) return true;
            const id = typeof input.id === "string" ? input.id : "";
            return id.endsWith("Modal");
          };
          getColumnToggleInputs = (scope) => {
            const inputs = Array.from(document.querySelectorAll("input.col-toggle[data-column-key]"));
            const nonArticleInputs = inputs.filter(
              (input) => !(typeof input.closest === "function" && input.closest(".article-fields-modal"))
            );
            if (scope === "all") return nonArticleInputs;
            return nonArticleInputs.filter((input) => {
              const isModel = isModelColumnToggle(input);
              return scope === "model" ? isModel : !isModel;
            });
          };
          getEffectiveTaxModeForColumnLocks = (scope = "main") => {
            const readCheckedValue = (container) => {
              const input = container?.querySelector?.("input:checked");
              return input?.value || "";
            };
            if (scope === "model") {
              const modelTaxValue = readCheckedValue(getEl("modelTaxPanel")) || getEl("modelTaxMode")?.value || "";
              return String(modelTaxValue || "with").toLowerCase();
            }
            const taxValue = getEl("taxMode")?.value || "";
            const fallback = state()?.meta?.taxesEnabled === false ? "without" : "with";
            return String(taxValue || fallback || "with").toLowerCase();
          };
          syncTaxModeDependentColumnToggles = ({ forceReset = false, scope = "main" } = {}) => {
            if (typeof document === "undefined" || !document.querySelectorAll) return;
            if (scope === "all") {
              syncTaxModeDependentColumnToggles({ forceReset, scope: "main" });
              syncTaxModeDependentColumnToggles({ forceReset, scope: "model" });
              return;
            }
            const taxesEnabled = getEffectiveTaxModeForColumnLocks(scope) !== "without";
            const inputs = getColumnToggleInputs(scope);
            inputs.forEach((input) => {
              const key = normalizeColumnKey(input?.dataset?.columnKey);
              if (!TAX_DEPENDENT_COLUMN_KEYS.has(key)) return;
              const label = input.closest?.("label.toggle-option");
              const prevDisabled = !!input.disabled;

              if (forceReset) {
                delete input.dataset.taxLockPrevChecked;
              }

              if (!taxesEnabled) {
                if (!prevDisabled) {
                  input.dataset.taxLockPrevChecked = String(!!input.checked);
                }
                if (input.checked) {
                  input.checked = false;
                  try {
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  } catch {}
                }
                input.disabled = true;
                if (label) {
                  label.classList.add("is-disabled");
                  label.setAttribute("aria-disabled", "true");
                }
                return;
              }

              input.disabled = false;
              if (label) {
                label.classList.remove("is-disabled");
                label.removeAttribute("aria-disabled");
              }
              if (typeof input.dataset.taxLockPrevChecked === "string" && input.dataset.taxLockPrevChecked.length) {
                const restoreChecked = input.dataset.taxLockPrevChecked === "true";
                if (input.checked !== restoreChecked) {
                  input.checked = restoreChecked;
                  try {
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  } catch {}
                }
                // Consume the snapshot once: keep manual toggles editable until taxes are disabled again.
                delete input.dataset.taxLockPrevChecked;
              }
            });
          };
          helpers.syncTaxModeDependentColumnToggles = syncTaxModeDependentColumnToggles;

          resetModelWizardFields = () => {
            if (typeof w.setDocTypeMenuAllowedDocTypes === "function") {
              w.setDocTypeMenuAllowedDocTypes(null);
            }
            if (modelNameInput) modelNameInput.value = "";
            if (modelSelect) modelSelect.value = "";
            if (modelActionsSelect) modelActionsSelect.value = "";
            const st = state && typeof state === "function" ? state() : null;
            if (st?.meta && typeof st.meta === "object") {
              st.meta.template = "";
            }
            if (st && typeof st === "object" && "template" in st) {
              st.template = "";
            }
            const templateSelect = getEl("modelTemplate");
            if (templateSelect) {
              templateSelect.value = "template1";
              Array.from(templateSelect.options || []).forEach((opt) => {
                opt.selected = opt.value === "template1";
              });
            }
            const templateDisplay = getEl("modelTemplateDisplay");
            if (templateDisplay) templateDisplay.textContent = "Facturence";
            const templatePanel = getEl("modelTemplatePanel");
            if (templatePanel) {
              templatePanel.querySelectorAll(".model-select-option").forEach((btn) => {
                const isActive = btn.dataset.value === "template1";
                btn.classList.toggle("is-active", isActive);
                btn.setAttribute("aria-selected", isActive ? "true" : "false");
              });
            }
            if (typeof helpers.updateTemplateSelectDisplay === "function") {
              helpers.updateTemplateSelectDisplay({ applyToDocument: false });
            }
            modelBaselineString = null;
            modelDirty = false;
            const selectRadio = (panelId, attr, value, selectId) => {
              const panel = getEl(panelId);
              const attrKebab = String(attr || "").replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
              const datasetKey = `${attr}Option`;
              if (panel) {
                panel.querySelectorAll(`[data-${attrKebab}-option]`).forEach((btn) => {
                  const isMatch = btn.dataset?.[datasetKey] === value;
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                  const input = btn.querySelector("input");
                  if (input) {
                    input.checked = isMatch;
                    input.setAttribute("aria-checked", isMatch ? "true" : "false");
                  }
                });
              }
              const selectEl = selectId ? getEl(selectId) : null;
              if (selectEl) selectEl.value = value;
            };
            const setModelDocTypeSelection = (values) => {
              const panel = getEl("modelDocTypePanel");
              const selectEl = getEl("modelDocType");
              const list = Array.isArray(values) ? values : [values];
              const normalized = list
                .map((val) => String(val || "").trim().toLowerCase())
                .filter(Boolean);
              const selectedSet = new Set(normalized.length ? normalized : ["facture"]);
              if (panel) {
                panel.querySelectorAll("[data-doc-type-option]").forEach((btn) => {
                  const key = String(btn.dataset?.docTypeOption || "").toLowerCase();
                  const isMatch = selectedSet.has(key);
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                  const input = btn.querySelector("input");
                  if (input) {
                    input.checked = isMatch;
                    input.setAttribute("aria-checked", isMatch ? "true" : "false");
                  }
                });
              }
              if (selectEl) {
                Array.from(selectEl.options || []).forEach((opt) => {
                  if (!opt?.value) return;
                  opt.selected = selectedSet.has(String(opt.value || "").toLowerCase());
                });
              }
            };
            setModelDocTypeSelection(["facture"]);
            selectRadio("modelCurrencyPanel", "currency", "DT", "modelCurrency");
            selectRadio("modelTaxPanel", "tax", "with", "modelTaxMode");
            const defaults = resolveModelColumnVisibilityDefaults();
            (modelActionsModal?.querySelectorAll("input.col-toggle[data-column-key]") || []).forEach((input) => {
              delete input.dataset.taxLockPrevChecked;
              delete input.dataset.docTypeFaPrevChecked;
              delete input.dataset.docTypeFaForced;
              input.disabled = false;
              input.closest?.("label.toggle-option")?.classList.remove("is-disabled");
              input.closest?.("label.toggle-option")?.removeAttribute("aria-disabled");
              const key = normalizeColumnKey(input?.dataset?.columnKey);
              input.checked = key ? defaults[key] !== false : true;
            });
            syncTaxModeDependentColumnToggles({ forceReset: true, scope: "model" });
            if (typeof w.applyModelDocTypeFaColumnLocks === "function") {
              w.applyModelDocTypeFaColumnLocks();
            }
            const setChecked = (id, value) => {
              const el = getEl(id);
              if (el) el.checked = !!value;
            };
            const setScopedChecked = (id, value) => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              el.checked = !!value;
              el.setAttribute("aria-checked", value ? "true" : "false");
            };
            const setScopedValue = (id, value = "") => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              el.value = value === undefined || value === null ? "" : String(value);
            };
            const setScopedDisplay = (id, visible) => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              const isVisible = !!visible;
              el.hidden = !isVisible;
              el.style.display = isVisible ? "" : "none";
            };
            const setFeesOptionChecked = (id, value) => {
              const input = getEl(id);
              if (!input) return null;
              const checked = !!value;
              input.checked = checked;
              input.setAttribute("aria-checked", checked ? "true" : "false");
              const label = input.closest?.("label.toggle-option");
              if (label) label.setAttribute("aria-selected", checked ? "true" : "false");
              return input;
            };
            const setFeesOptionGroupVisibility = (entry, visible) => {
              const isVisible = !!visible;
              if (entry?.targetId) {
                const target = modelActionsModal?.querySelector?.(`#${entry.targetId}`) || getEl(entry.targetId);
                if (!target) return;
                target.hidden = !isVisible;
                target.style.display = isVisible ? "" : "none";
                return;
              }
              const enabledInput = getEl(entry?.enabledModalId);
              const group = enabledInput?.closest?.(".shipping-flex-group");
              if (!group) return;
              group.hidden = !isVisible;
              group.style.display = isVisible ? "" : "none";
            };
            setChecked("shipEnabledModal", false);
            setChecked("dossierEnabledModal", false);
            setChecked("deplacementEnabledModal", false);
            setChecked("stampEnabledModal", false);
            setChecked("whEnabledModal", false);
            setScopedChecked("subventionEnabled", false);
            setScopedChecked("finBankEnabled", false);
            setScopedDisplay("subventionFields", false);
            setScopedDisplay("finBankFields", false);
            setScopedDisplay("financingNetRow", false);
            setScopedValue("subventionLabel");
            setScopedValue("subventionAmount", "0");
            setScopedValue("finBankLabel");
            setScopedValue("finBankAmount", "0");
            setScopedValue("financingNet");
            const feesOptions = [
              { optionId: "shipOptToggleModal", enabledModalId: "shipEnabledModal", checked: true },
              { optionId: "stampOptToggleModal", enabledModalId: "stampEnabledModal", checked: true },
              { optionId: "dossierOptToggleModal", enabledModalId: "dossierEnabledModal", checked: false },
              { optionId: "deplacementOptToggleModal", enabledModalId: "deplacementEnabledModal", checked: false },
              { optionId: "financingOptToggleModal", targetId: "financingBox", checked: false }
            ];
            const feesOptionInputs = feesOptions
              .map((entry) => ({ ...entry, input: setFeesOptionChecked(entry.optionId, entry.checked) }))
              .filter((entry) => !!entry.input);
            if (typeof w.syncFeesTaxesOptionsUi === "function") {
              w.syncFeesTaxesOptionsUi();
            } else if (typeof w.handleFeesOptionsToggle === "function") {
              feesOptionInputs.forEach((entry) => {
                w.handleFeesOptionsToggle(entry.input, { schedulePreview: false });
              });
            } else {
              feesOptionInputs.forEach((entry) => {
                setFeesOptionGroupVisibility(entry, entry.input.checked);
              });
            }
            const setValPlain = (id, value = "") => {
              const el = getEl(id);
              if (el) el.value = value;
            };
            setValPlain("shipLabelModal");
            setValPlain("shipAmountModal", "7");
            setValPlain("shipTvaModal", "7");
            setValPlain("dossierLabelModal");
            setValPlain("dossierAmountModal", "0");
            setValPlain("dossierTvaModal", "0");
            setValPlain("deplacementLabelModal");
            setValPlain("deplacementAmountModal", "0");
            setValPlain("deplacementTvaModal", "0");
            setValPlain("stampLabelModal");
            setValPlain("stampAmountModal", "1");
            setValPlain("whRateModal", "1.5");
            setValPlain("whThresholdModal", "1000");
            setValPlain("whLabelModal");
            const noteHidden = getEl("whNoteModal");
            if (noteHidden) noteHidden.value = "";
            if (typeof setWhNoteEditorContent === "function") {
              setWhNoteEditorContent("", { group: "modal" });
            }
            setModelNotePlaceholder(true);
            setValPlain("footerNoteModal");
            setValPlain("footerNoteFontSizeModal", "8");
            setFooterNoteEditorContent("");
            const defaultColor = "#15335e";
            const colorHex = getEl("modelItemsHeaderHex");
            const colorNative = getEl("modelItemsHeaderColor");
            if (colorHex) colorHex.value = defaultColor;
            if (colorNative) colorNative.value = defaultColor;
            if (typeof SEM.applyModelItemsHeaderColor === "function") {
              SEM.applyModelItemsHeaderColor(defaultColor, { setBaseline: true });
            } else if (typeof SEM.applyItemsHeaderColor === "function") {
              SEM.applyItemsHeaderColor(defaultColor, { setBaseline: true });
            }
            if (typeof SEM.resetModelItemsColorPicker === "function") {
              SEM.resetModelItemsColorPicker(defaultColor);
            }
            updateModelButtons();
            scheduleModelPreviewUpdate();
          };

          setModelSelectMenuVisibility = (hidden) => {
            if (!modelActionsSelectMenu) return;
            modelActionsSelectMenu.hidden = !!hidden;
            modelActionsSelectMenu.setAttribute("aria-hidden", hidden ? "true" : "false");
            modelActionsSelectMenu.style.display = hidden ? "none" : "";
            if (hidden) {
              modelActionsSelectMenu.removeAttribute("open");
            }
          };

          setModelCreateBtnVisibility = (hidden) => {
            if (modelActionsButtons) {
              modelActionsButtons.hidden = !!hidden;
              modelActionsButtons.setAttribute("aria-hidden", hidden ? "true" : "false");
              modelActionsButtons.style.display = hidden ? "none" : "";
            }
            if (!modelCreateFlowBtn) return;
            modelCreateFlowBtn.hidden = !!hidden;
            modelCreateFlowBtn.setAttribute("aria-hidden", hidden ? "true" : "false");
            modelCreateFlowBtn.style.display = hidden ? "none" : "";
          };

          setModelActionsWrapperVisibility = (hidden) => {
            if (!modelActionsWrapper) return;
            modelActionsWrapper.hidden = !!hidden;
            modelActionsWrapper.setAttribute("aria-hidden", hidden ? "true" : "false");
            modelActionsWrapper.style.display = hidden ? "none" : "";
          };

          openModelStepperFlow = () => {
            modelStepperShell?.classList.remove("is-collapsed");
            setModelActionsWrapperVisibility(true);
            setModelSelectMenuVisibility(true);
            setModelCreateBtnVisibility(true);
            syncModelStepper(1);
            if (modelNameInput) {
              modelNameInput.focus();
              try {
                modelNameInput.select();
              } catch {}
            }
            if (modelActionsRow) {
              modelActionsRow.hidden = false;
              modelActionsRow.classList.remove("is-collapsed");
            }
            updateModelPreview();
          };

          resetModelStepperFlow = () => {
            modelStepperShell?.classList.add("is-collapsed");
            setModelActionsWrapperVisibility(false);
            setModelSelectMenuVisibility(false);
            setModelCreateBtnVisibility(false);
            syncModelStepper(1);
          };
          finalizeModelCreation = null;

          setModelActionsOpen = (open) => {
            const wasOpen = modelActionsOpen;
            modelActionsOpen = !!open;
            if (modelActionsModal) {
              if (modelActionsOpen) {
                modelActionsRestoreFocus = document.activeElement;
                modelActionsModal.hidden = false;
                modelActionsModal.removeAttribute("hidden");
                modelActionsModal.setAttribute("aria-hidden", "false");
                modelActionsModal.classList.add("is-open");
                scheduleModalWhNoteMount();
                if (!wasOpen) {
                  resetModelStepperFlow();
                }
              } else {
                cancelModalWhNoteMount();
                destroyModalWhNoteEditor();
                modelActionsModal.classList.remove("is-open");
                modelActionsModal.hidden = true;
                modelActionsModal.setAttribute("hidden", "");
                modelActionsModal.setAttribute("aria-hidden", "true");
                resetModelStepperFlow();
                if (modelActionsRestoreFocus && typeof modelActionsRestoreFocus.focus === "function") {
                  modelActionsRestoreFocus.focus();
                }
                modelActionsRestoreFocus = null;
              }
            }
            if (modelActionsRow) {
              modelActionsRow.hidden = !modelActionsOpen;
              modelActionsRow.classList.toggle("is-collapsed", !modelActionsOpen);
            }
            if (modelActionsToggle) {
              modelActionsToggle.setAttribute("aria-expanded", modelActionsOpen ? "true" : "false");
              modelActionsToggle.classList.toggle("is-open", modelActionsOpen);
            }
          };
          helpers.setModelActionsOpen = setModelActionsOpen;

          clearModelActionsSelection = () => {
            const actionsSelect = modelActionsSelect || getEl("modelActionsSelect");
            if (!actionsSelect) return;
            actionsSelect.value = "";

            const actionsMenu = getEl("modelActionsSelectMenu");
            if (actionsMenu) {
              actionsMenu.removeAttribute("open");
              actionsMenu.querySelector("summary")?.setAttribute("aria-expanded", "false");
            }

            const actionsPanel = getEl("modelActionsSelectPanel");
            if (actionsPanel) {
              actionsPanel.querySelectorAll(".model-select-option").forEach((btn) => {
                btn.classList.remove("is-active");
                btn.setAttribute("aria-selected", "false");
              });
            }

            const actionsDisplay = getEl("modelActionsSelectDisplay");
            if (actionsDisplay) {
              const placeholderOption = Array.from(actionsSelect.options || []).find(
                (option) => !String(option?.value || "").trim()
              );
              const placeholderText = String(
                placeholderOption?.textContent || placeholderOption?.label || "Sélectionner un modèle"
              ).trim();
              actionsDisplay.textContent = placeholderText || "Sélectionner un modèle";
            }

            if (typeof helpers.updateModelSelectDisplay === "function") {
              helpers.updateModelSelectDisplay();
            }
            modelPreviewNumberLengthOverride = null;
            if (typeof scheduleModelPreviewUpdate === "function") {
              scheduleModelPreviewUpdate();
            }
            updateModelButtons();
          };

          syncModelStepper(1);
          modelStepperTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
              const stepNum = Number(tab.dataset.modelStep);
              if (Number.isFinite(stepNum)) syncModelStepper(stepNum);
            });
            tab.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                const stepNum = Number(tab.dataset.modelStep);
                if (Number.isFinite(stepNum)) syncModelStepper(stepNum);
              }
            });
          });
          modelStepperPrev?.addEventListener("click", () => syncModelStepper(modelStepperActive - 1));
          modelStepperNext?.addEventListener("click", () => {
            const isLast = modelStepperActive >= modelStepperMax;
            if (isLast) {
              if (typeof finalizeModelCreation === "function") {
                finalizeModelCreation();
              }
            } else {
              syncModelStepper(modelStepperActive + 1);
            }
          });
          previewInputs = modelActionsModal?.querySelectorAll("input, select, textarea") || [];
          previewInputs.forEach((input) => {
            if (input?.id === "modelPreviewZoomRange") return;
            input.addEventListener("change", scheduleModelPreviewUpdate);
            input.addEventListener("input", scheduleModelPreviewUpdate);
          });
          if (modelActionsModal) {
            modelActionsModal.addEventListener(
              "change",
              (evt) => {
                if (evt?.target?.id === "modelPreviewZoomRange") return;
                scheduleModelPreviewUpdate();
              },
              true
            );
            modelActionsModal.addEventListener(
              "input",
              (evt) => {
                if (evt?.target?.id === "modelPreviewZoomRange") return;
                scheduleModelPreviewUpdate();
              },
              true
            );
            modelActionsModal.addEventListener(
              "click",
              (evt) => {
                if (evt.target?.closest?.(".toggle-option")) scheduleModelPreviewUpdate();
              },
              true
            );
          }
          ensurePreviewOnCurrencyToggle = (container) => {
            if (!container) return;
            container.querySelectorAll('input[name="modelCurrencyChoice"]').forEach((input) => {
              input.addEventListener("change", scheduleModelPreviewUpdate);
              input.addEventListener("input", scheduleModelPreviewUpdate);
              input.addEventListener("click", scheduleModelPreviewUpdate);
            });
          };
          ensurePreviewOnCurrencyToggle(getEl("modelCurrencyPanel"));
          ensurePreviewOnCurrencyToggle(getEl("modelCurrency"));
          wireModelPreviewZoomControls();
          wireFooterNoteEditor();
          setFooterNoteEditorContent(getEl("footerNoteModal")?.value || "");
          applyModelPreviewScale(readModelPreviewScale(), { setDefault: true });
          updateModelPreview();

          toJsonString = (value) => {
            try {
              return JSON.stringify(value);
            } catch {
              return null;
            }
          };

          captureCurrentModelSnapshot = () => {
            if (typeof SEM.captureModelConfiguration !== "function") return null;
            try {
              return toJsonString(SEM.captureModelConfiguration());
            } catch {
              return null;
            }
          };

          syncModelBaselineFromSelection = () => {
            const selectedName = sanitizeModelName(modelSelect?.value || "");
            if (!selectedName) {
              modelBaselineString = null;
              modelDirty = false;
              return;
            }
            const entry = getModelList().find((m) => sanitizeModelName(m.name) === selectedName);
            modelBaselineString = entry ? toJsonString(entry.config) : null;
            modelDirty = false;
          };

          recomputeModelDirty = () => {
            if (!modelBaselineString) {
              modelDirty = false;
              return false;
            }
            const current = captureCurrentModelSnapshot();
            const nextDirty = !!(current && current !== modelBaselineString);
            if (nextDirty !== modelDirty) {
              modelDirty = nextDirty;
            }
            return modelDirty;
          };

          scheduleModelDirtyCheck = () => {
            if (!modelSelect?.value || !modelBaselineString) return;
            if (modelDirtyCheckTimer) clearTimeout(modelDirtyCheckTimer);
            modelDirtyCheckTimer = setTimeout(() => {
              modelDirtyCheckTimer = null;
              const changed = recomputeModelDirty();
              if (changed !== undefined) updateModelButtons();
            }, 150);
          };

          updateModelButtons = () => {
            const actionsSelection = sanitizeModelName(modelActionsSelect?.value || "");
            const hasSelection = !!actionsSelection;
            const hasModelName = !!sanitizeModelName(modelNameInput?.value || "");
            const selectedName = actionsSelection;
            const inputName = sanitizeModelName(modelNameInput?.value || "");
            const nameChanged = !!selectedName && !!inputName && inputName !== selectedName;
            if (modelDeleteBtn) modelDeleteBtn.disabled = !hasSelection;
            if (modelUpdateBtn) modelUpdateBtn.disabled = !hasSelection;
            if (modelSaveBtn) modelSaveBtn.disabled = modelSaveLocked || hasSelection;
            if (modelNewBtn) modelNewBtn.disabled = !hasModelName;
          };

          applyModelConfigToActionsPreview = (rawName) => {
            const selectedName = sanitizeModelName(rawName || "");
            if (!selectedName) {
              modelPreviewNumberLengthOverride = null;
              return false;
            }
            const entry = getModelList().find((item) => sanitizeModelName(item?.name || "") === selectedName);
            const config = entry?.config && typeof entry.config === "object" ? entry.config : null;
            if (!config) {
              modelPreviewNumberLengthOverride = null;
              return false;
            }

            const normalizeDocTypeValue = (value) => {
              const raw = String(value || "").trim().toLowerCase();
              if (!raw || raw === "aucun") return "";
              if (raw === "all") return "all";
              if (["facture", "fa", "devis", "bl", "avoir"].includes(raw)) return raw;
              return "";
            };
            const expandDocTypesLocal = (value, fallback = "facture") => {
              if (typeof helpers.expandModelDocTypes === "function") {
                try {
                  return helpers.expandModelDocTypes(value, fallback);
                } catch {}
              }
              const rawList = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
              const normalizedList = rawList
                .map((entry) => normalizeDocTypeValue(entry))
                .filter((entry) => entry && entry !== "all");
              if (normalizedList.length) return Array.from(new Set(normalizedList));
              const single = normalizeDocTypeValue(value);
              if (single === "all") return ["facture", "fa", "devis", "bl", "avoir"];
              if (single) return [single];
              const normalizedFallback = normalizeDocTypeValue(fallback);
              return normalizedFallback ? [normalizedFallback] : ["facture"];
            };
            const selectRadio = (panelId, attr, value, selectId) => {
              const panel = getEl(panelId);
              const attrKebab = String(attr || "").replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
              const datasetKey = `${attr}Option`;
              if (panel) {
                panel.querySelectorAll(`[data-${attrKebab}-option]`).forEach((btn) => {
                  const isMatch = String(btn.dataset?.[datasetKey] || "") === String(value || "");
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                  const input = btn.querySelector("input");
                  if (input) {
                    input.checked = isMatch;
                    input.setAttribute("aria-checked", isMatch ? "true" : "false");
                  }
                });
              }
              const selectEl = selectId ? getEl(selectId) : null;
              if (selectEl) selectEl.value = value;
            };
            const setModelDocTypeSelection = (values) => {
              const panel = getEl("modelDocTypePanel");
              const selectEl = getEl("modelDocType");
              const list = Array.isArray(values) ? values : [values];
              const normalized = list
                .map((val) => String(val || "").trim().toLowerCase())
                .filter(Boolean);
              const selectedSet = new Set(normalized.length ? normalized : ["facture"]);
              if (panel) {
                panel.querySelectorAll("[data-doc-type-option]").forEach((btn) => {
                  const key = String(btn.dataset?.docTypeOption || "").toLowerCase();
                  const isMatch = selectedSet.has(key);
                  btn.classList.toggle("is-active", isMatch);
                  btn.setAttribute("aria-selected", isMatch ? "true" : "false");
                  const input = btn.querySelector("input");
                  if (input) {
                    input.checked = isMatch;
                    input.setAttribute("aria-checked", isMatch ? "true" : "false");
                  }
                });
              }
              if (selectEl) {
                Array.from(selectEl.options || []).forEach((opt) => {
                  if (!opt?.value) return;
                  opt.selected = selectedSet.has(String(opt.value || "").toLowerCase());
                });
              }
            };
            const setChecked = (id, value) => {
              const el = getEl(id);
              if (el) el.checked = !!value;
            };
            const setScopedChecked = (id, value) => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              el.checked = !!value;
              el.setAttribute("aria-checked", value ? "true" : "false");
            };
            const setScopedValPlain = (id, value = "") => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              if (value === undefined || value === null) {
                el.value = "";
                return;
              }
              el.value = String(value);
            };
            const setScopedDisplay = (id, visible) => {
              const el = modelActionsModal?.querySelector?.(`#${id}`);
              if (!el) return;
              const isVisible = !!visible;
              el.hidden = !isVisible;
              el.style.display = isVisible ? "" : "none";
            };
            const setFeesOptionChecked = (id, value) => {
              const input = modelActionsModal?.querySelector?.(`#${id}`) || getEl(id);
              if (!input) return null;
              const checked = !!value;
              input.checked = checked;
              input.setAttribute("aria-checked", checked ? "true" : "false");
              const label = input.closest?.("label.toggle-option");
              if (label) label.setAttribute("aria-selected", checked ? "true" : "false");
              return input;
            };
            const setValPlain = (id, value = "") => {
              const el = getEl(id);
              if (!el) return;
              if (value === undefined || value === null) {
                el.value = "";
                return;
              }
              el.value = String(value);
            };
            const normalizeHex = (value, fallback = "#15335e") => {
              const raw = String(value || "").trim();
              const hex = raw.startsWith("#") ? raw.slice(1) : raw;
              if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
              if (/^[0-9a-f]{3}$/i.test(hex)) {
                return `#${hex
                  .split("")
                  .map((char) => `${char}${char}`)
                .join("")
                .toLowerCase()}`;
              }
              return fallback;
            };
            const resolveFeeOptionUsed = (feeConfig, fallbackUsed = false) => {
              const used = feeConfig?.used;
              if (used === true || used === false) return !!used;
              return feeConfig?.enabled === true ? true : !!fallbackUsed;
            };
            const setFeesOptionGroupVisibility = (entry, visible) => {
              const isVisible = !!visible;
              if (entry?.targetId) {
                const target = modelActionsModal?.querySelector?.(`#${entry.targetId}`) || getEl(entry.targetId);
                if (!target) return;
                target.hidden = !isVisible;
                target.style.display = isVisible ? "" : "none";
                return;
              }
              const enabledInput = getEl(entry?.enabledModalId);
              const group = enabledInput?.closest?.(".shipping-flex-group");
              if (!group) return;
              group.hidden = !isVisible;
              group.style.display = isVisible ? "" : "none";
            };
            const normalizeNumberFormatLocal = (value, fallback = "prefix_date_counter") => {
              const raw = String(value || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(raw)) return raw;
              const fb = String(fallback || "").trim().toLowerCase();
              if (["prefix_date_counter", "prefix_counter", "counter"].includes(fb)) return fb;
              return "prefix_date_counter";
            };

            const docTypes = expandDocTypesLocal(
              config.docTypes !== undefined ? config.docTypes : config.docType,
              "facture"
            );
            if (typeof w.syncModelDocTypeMenuUi === "function") {
              w.syncModelDocTypeMenuUi(docTypes, { updateSelect: true });
            } else {
              setModelDocTypeSelection(docTypes);
            }

            const currency = String(config.currency || "DT").trim().toUpperCase() || "DT";
            if (typeof w.syncModelCurrencyMenuUi === "function") {
              w.syncModelCurrencyMenuUi(currency, { updateSelect: true });
            } else {
              selectRadio("modelCurrencyPanel", "currency", currency, "modelCurrency");
            }

            const taxMode = config.taxesEnabled === false ? "without" : "with";
            if (typeof w.syncModelTaxMenuUi === "function") {
              w.syncModelTaxMenuUi(taxMode, { updateSelect: true });
            } else {
              selectRadio("modelTaxPanel", "tax", taxMode, "modelTaxMode");
            }

            const numberFormat = normalizeNumberFormatLocal(config.numberFormat, state()?.meta?.numberFormat);
            if (typeof w.syncModelNumberFormatUi === "function") {
              w.syncModelNumberFormatUi(numberFormat, { updateSelect: true });
            } else {
              selectRadio("modelNumberFormatPanel", "numberFormat", numberFormat, "modelNumberFormat");
            }

            const numberLengthRaw = Number(config.numberLength);
            modelPreviewNumberLengthOverride = [4, 6, 8, 12].includes(numberLengthRaw)
              ? numberLengthRaw
              : null;

            const columnConfig = config.columns && typeof config.columns === "object" ? config.columns : {};
            (modelActionsModal?.querySelectorAll("input.col-toggle[data-column-key]") || []).forEach((input) => {
              delete input.dataset.docTypeFaPrevChecked;
              delete input.dataset.docTypeFaForced;
              const key = normalizeColumnKey(input?.dataset?.columnKey);
              if (!key) return;
              const configured = readColumnConfigValue(columnConfig, key);
              if (typeof configured === "boolean") {
                input.checked = configured;
              }
            });
            syncTaxModeDependentColumnToggles({ scope: "model" });
            if (typeof w.applyModelDocTypeFaColumnLocks === "function") {
              w.applyModelDocTypeFaColumnLocks();
            }

            const ship = config.shipping && typeof config.shipping === "object" ? config.shipping : {};
            setChecked("shipEnabledModal", ship.enabled);
            setValPlain("shipLabelModal", ship.label ?? "");
            setValPlain("shipAmountModal", ship.amount ?? 0);
            setValPlain("shipTvaModal", ship.tva ?? 7);

            const dossier = config.dossier && typeof config.dossier === "object" ? config.dossier : {};
            setChecked("dossierEnabledModal", dossier.enabled);
            setValPlain("dossierLabelModal", dossier.label ?? "");
            setValPlain("dossierAmountModal", dossier.amount ?? 0);
            setValPlain("dossierTvaModal", dossier.tva ?? 0);

            const deplacement = config.deplacement && typeof config.deplacement === "object" ? config.deplacement : {};
            setChecked("deplacementEnabledModal", deplacement.enabled);
            setValPlain("deplacementLabelModal", deplacement.label ?? "");
            setValPlain("deplacementAmountModal", deplacement.amount ?? 0);
            setValPlain("deplacementTvaModal", deplacement.tva ?? 0);

            const stamp = config.stamp && typeof config.stamp === "object" ? config.stamp : {};
            setChecked("stampEnabledModal", stamp.enabled);
            setValPlain("stampLabelModal", stamp.label ?? "");
            setValPlain("stampAmountModal", stamp.amount ?? 1);

            const financing = config.financing && typeof config.financing === "object" ? config.financing : {};
            const subvention =
              financing.subvention && typeof financing.subvention === "object" ? financing.subvention : {};
            const bank = financing.bank && typeof financing.bank === "object" ? financing.bank : {};
            setScopedChecked("subventionEnabled", !!subvention.enabled);
            setScopedValPlain("subventionLabel", subvention.label ?? "");
            setScopedValPlain("subventionAmount", subvention.amount ?? 0);
            setScopedDisplay("subventionFields", !!subvention.enabled);
            setScopedChecked("finBankEnabled", !!bank.enabled);
            setScopedValPlain("finBankLabel", bank.label ?? "");
            setScopedValPlain("finBankAmount", bank.amount ?? 0);
            setScopedDisplay("finBankFields", !!bank.enabled);
            setScopedDisplay("financingNetRow", !!subvention.enabled || !!bank.enabled);
            w.updateModelFinancingNetPreview?.();

            const feesOptions = [
              {
                optionId: "shipOptToggleModal",
                enabledModalId: "shipEnabledModal",
                checked: resolveFeeOptionUsed(ship, true)
              },
              {
                optionId: "stampOptToggleModal",
                enabledModalId: "stampEnabledModal",
                checked: resolveFeeOptionUsed(stamp, true)
              },
              {
                optionId: "dossierOptToggleModal",
                enabledModalId: "dossierEnabledModal",
                checked: resolveFeeOptionUsed(dossier, false)
              },
              {
                optionId: "deplacementOptToggleModal",
                enabledModalId: "deplacementEnabledModal",
                checked: resolveFeeOptionUsed(deplacement, false)
              },
              {
                optionId: "financingOptToggleModal",
                targetId: "financingBox",
                checked: resolveFeeOptionUsed(
                  { used: financing.used, enabled: subvention.enabled || bank.enabled },
                  false
                )
              }
            ];
            const optionInputs = feesOptions
              .map((entry) => ({ ...entry, input: setFeesOptionChecked(entry.optionId, entry.checked) }))
              .filter((entry) => !!entry.input);
            if (typeof w.syncFeesTaxesOptionsUi === "function") {
              w.syncFeesTaxesOptionsUi();
            } else if (typeof w.handleFeesOptionsToggle === "function") {
              optionInputs.forEach((entry) => {
                w.handleFeesOptionsToggle(entry.input, { schedulePreview: false });
              });
            } else {
              optionInputs.forEach((entry) => {
                setFeesOptionGroupVisibility(entry, entry.input.checked);
              });
            }

            const withholding =
              config.withholding && typeof config.withholding === "object" ? config.withholding : {};
            setChecked("whEnabledModal", withholding.enabled);
            setValPlain("whRateModal", withholding.rate ?? 1.5);
            setValPlain("whThresholdModal", withholding.threshold ?? 1000);
            setValPlain("whLabelModal", withholding.label ?? "Retenue a la source");
            const noteValue = typeof withholding.note === "string" ? withholding.note : "";
            setValPlain("whNoteModal", noteValue);
            if (typeof setWhNoteEditorContent === "function") {
              setWhNoteEditorContent(noteValue, { group: "modal" });
            }
            setModelNotePlaceholder(false);

            const pdf = config.pdf && typeof config.pdf === "object" ? config.pdf : {};
            setChecked("pdfShowSealModal", pdf.showSeal !== false);
            setChecked("pdfShowSignatureModal", pdf.showSignature !== false);
            setChecked("pdfShowAmountWordsModal", pdf.showAmountWords !== false);
            const footerNoteValue = typeof pdf.footerNote === "string" ? pdf.footerNote : "";
            const footerNoteSizeRaw = Number(pdf.footerNoteSize);
            const footerNoteSize = [7, 8, 9].includes(footerNoteSizeRaw) ? footerNoteSizeRaw : 8;
            setValPlain("footerNoteModal", footerNoteValue);
            setValPlain("footerNoteFontSizeModal", footerNoteSize);
            setFooterNoteEditorContent(footerNoteValue);

            const templateSelect = getEl("modelTemplate");
            const templatePanel = getEl("modelTemplatePanel");
            const requestedTemplate = String(config.template || "template1").trim() || "template1";
            if (templateSelect) {
              const availableValues = Array.from(templateSelect.options || []).map((opt) => opt.value);
              const resolvedTemplate = availableValues.includes(requestedTemplate)
                ? requestedTemplate
                : (availableValues[0] || "template1");
              templateSelect.value = resolvedTemplate;
              Array.from(templateSelect.options || []).forEach((opt) => {
                opt.selected = opt.value === resolvedTemplate;
              });
              if (templatePanel) {
                templatePanel.querySelectorAll(".model-select-option").forEach((btn) => {
                  const isActive = btn.dataset.value === resolvedTemplate;
                  btn.classList.toggle("is-active", isActive);
                  btn.setAttribute("aria-selected", isActive ? "true" : "false");
                });
              }
            }

            const color = normalizeHex(config.itemsHeaderColor, "#15335e");
            const colorHex = getEl("modelItemsHeaderHex");
            const colorNative = getEl("modelItemsHeaderColor");
            if (colorHex) colorHex.value = color;
            if (colorNative) colorNative.value = color;
            if (typeof SEM.applyModelItemsHeaderColor === "function") {
              SEM.applyModelItemsHeaderColor(color, { setBaseline: true });
            }

            return true;
          };

          applySelectedModel = async (targetName) => {
            setModelNotePlaceholder(false);
            if (modelApplying) {
              syncModelBaselineFromSelection();
              modelDirty = false;
              updateModelButtons();
              return;
            }
            const target = sanitizeModelName(targetName || modelSelect?.value || "");
            if (!target) {
              syncModelBaselineFromSelection();
              modelDirty = false;
              updateModelButtons();
              return;
            }
            modelApplying = true;
            try {
              const applied = await SEM.applyModelByName(target);
              if (!applied) {
                const notFoundMessage = getMessage("TEMPLATE_NOT_FOUND");
                await showDialog?.(notFoundMessage.text, { title: notFoundMessage.title });
              } else if (typeof scheduleModelPreviewUpdate === "function") {
                scheduleModelPreviewUpdate();
                SEM.updateWhNoteEditor?.(getEl("whNote")?.value || "");
              }
            } catch (err) {
              console.error("model presets: apply", err);
              const applyError = getMessage("TEMPLATE_APPLY_FAILED");
              await showDialog?.(err?.message || applyError.text, { title: applyError.title });
            } finally {
              modelApplying = false;
            }
            syncModelBaselineFromSelection();
            modelDirty = false;
            updateModelButtons();
          };

          actionsPreviewSyncing = false;
          syncActionsPreviewToSelection = async ({ applyToDocument = true } = {}) => {
            if (actionsPreviewSyncing) return;
            actionsPreviewSyncing = true;
            try {
              const actionsSelect = modelActionsSelect || getEl("modelActionsSelect");
              const actionsPanel = getEl("modelActionsSelectPanel");
              const actionsDisplay = getEl("modelActionsSelectDisplay");
              const optionList = Array.from(actionsSelect?.options || []);
              const hasOptionValue = (val) =>
                !!val && optionList.some((opt) => sanitizeModelName(opt.value) === val);

              let selectedValue = sanitizeModelName(actionsSelect?.value || "");
              if (!selectedValue && actionsPanel) {
                const activeBtn =
                  actionsPanel.querySelector(".model-select-option.is-active") ||
                  actionsPanel.querySelector('[aria-selected="true"]');
                selectedValue = sanitizeModelName(activeBtn?.dataset?.value || "");
              }
              if (!selectedValue && actionsDisplay && optionList.length) {
                const displayText = sanitizeModelName(actionsDisplay.textContent || "");
                if (displayText) {
                  const match = optionList.find(
                    (opt) =>
                      sanitizeModelName(opt.value) === displayText ||
                      sanitizeModelName(opt.textContent) === displayText
                  );
                  selectedValue = sanitizeModelName(match?.value || "");
                }
              }
              if (selectedValue && actionsSelect && actionsSelect.value !== selectedValue) {
                actionsSelect.value = selectedValue;
              }
              if (typeof helpers.updateModelSelectDisplay === "function") {
                helpers.updateModelSelectDisplay();
              }
              if (!selectedValue || !hasOptionValue(selectedValue)) {
                modelPreviewNumberLengthOverride = null;
                if (typeof helpers.updateTemplateSelectDisplay === "function") {
                  helpers.updateTemplateSelectDisplay({ applyToDocument });
                }
                return;
              }
              if (applyToDocument) {
                modelPreviewNumberLengthOverride = null;
                await applySelectedModel(selectedValue);
              } else {
                applyModelConfigToActionsPreview(selectedValue);
              }
              if (typeof helpers.updateTemplateSelectDisplay === "function") {
                helpers.updateTemplateSelectDisplay({ applyToDocument });
              }
              if (typeof scheduleModelPreviewUpdate === "function") {
                scheduleModelPreviewUpdate();
              }
            } finally {
              actionsPreviewSyncing = false;
            }
          };
          helpers.syncActionsPreviewToSelection = syncActionsPreviewToSelection;


          modelCrudBindings =
            typeof helpers.bindModelCrudActions === "function"
              ? helpers.bindModelCrudActions({
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
                  setModelSaveLocked: (value) => {
                    modelSaveLocked = !!value;
                  },
                  setModelBaselineString: (value) => {
                    modelBaselineString = value;
                  },
                  setModelDirty: (value) => {
                    modelDirty = !!value;
                  }
                })
              : {};
          if (typeof modelCrudBindings?.finalizeModelCreation === "function") {
            finalizeModelCreation = modelCrudBindings.finalizeModelCreation;
          }

          if (modelNameInput) {
            modelNameInput.addEventListener("input", () => {
              updateModelButtons();
              if (modelStepperActive >= modelStepperMax) {
                updateStepperNextUI(modelStepperActive);
              }
            });
          }

          syncModelSelects = (source, target) => {
            if (!source || !target) return;
            if (target.value !== source.value) {
              target.value = source.value;
            }
          };
          if (modelSelect) {
            modelSelect.addEventListener("change", async (evt) => {
              const suppressRaw = w.__suppressModelApplyOnce;
              const suppressCount =
                typeof suppressRaw === "number" && Number.isFinite(suppressRaw)
                  ? Math.max(0, Math.trunc(suppressRaw))
                  : suppressRaw === true
                    ? 1
                    : 0;
              const suppressAutoApply = suppressCount > 0 && evt?.isTrusted === false;
              if (suppressCount > 0) {
                const nextCount = suppressCount - 1;
                w.__suppressModelApplyOnce = nextCount > 0 ? nextCount : false;
              }
              const suppressSyncRaw = w.__suppressModelActionsSync;
              const suppressSyncCount =
                typeof suppressSyncRaw === "number" && Number.isFinite(suppressSyncRaw)
                  ? Math.max(0, Math.trunc(suppressSyncRaw))
                  : suppressSyncRaw === true
                    ? 1
                    : 0;
              if (suppressSyncCount > 0) {
                const nextCount = suppressSyncCount - 1;
                w.__suppressModelActionsSync = nextCount > 0 ? nextCount : false;
              } else {
                syncModelSelects(modelSelect, modelActionsSelect);
              }
              if (modelNameInput) modelNameInput.value = modelSelect.value;
              if (suppressAutoApply) {
                syncModelBaselineFromSelection();
                modelDirty = false;
                updateModelButtons();
                return;
              }
              await applySelectedModel(modelSelect.value);
            });
          }

          if (modelActionsSelect) {
            modelActionsSelect.addEventListener("change", async () => {
              if (modelNameInput) modelNameInput.value = modelActionsSelect.value;
              await syncActionsPreviewToSelection({ applyToDocument: false });
              updateModelButtons();
            });
          }

          if (modelActionsToggle) {
            setModelActionsOpen(false);
            modelActionsToggle.addEventListener("click", () => {
              const shouldOpen = !modelActionsOpen;
              setModelActionsOpen(shouldOpen);
              if (shouldOpen) {
                clearModelActionsSelection();
              }
            });
          } else {
            setModelActionsOpen(true);
          }
          modelActionsNewBtn?.addEventListener("click", () => {
            setModelActionsOpen(true);
            const createFlowBtn = modelCreateFlowBtn || getEl("modelCreateFlowBtn");
            createFlowBtn?.click();
          });

          modelActionsClose?.addEventListener("click", () => setModelActionsOpen(false));
          modelActionsCloseFooter?.addEventListener("click", () => setModelActionsOpen(false));
          if (modelActionsModal) {
            modelActionsModal.addEventListener("click", (evt) => {
              if (evt.target === modelActionsModal) return;
            });
          }

          if (typeof document !== "undefined") {
            const dirtyHandler = () => {
              if (!modelSelect?.value || !modelBaselineString) return;
              scheduleModelDirtyCheck();
            };
            document.addEventListener("input", dirtyHandler, true);
            document.addEventListener("change", dirtyHandler, true);
            const colorDirtyHandler = () => {
              if (!modelSelect?.value || !modelBaselineString) return;
              modelDirty = true;
              updateModelButtons();
            };
            document.addEventListener("itemsHeaderColorChanged", colorDirtyHandler);
            document.addEventListener("modelItemsHeaderColorChanged", colorDirtyHandler);
          }

          updateModelButtons();

          getDefaultClientSearchInput = () =>
            getActiveMainClientScope()?.querySelector?.("#clientSearch") || clientSearchInput;
          getDefaultClientSearchResults = () =>
            getActiveMainClientScope()?.querySelector?.("#clientSearchResults") || clientSearchResults;

  }, { order: 600 });
})(window);
