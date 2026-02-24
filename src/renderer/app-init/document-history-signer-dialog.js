(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.createDocHistorySignerDialog = function createDocHistorySignerDialog({
    getEntryByIndex,
    getDocType,
    getMessage,
    getDisplayFilename,
    openDigigoLogin
  } = {}) {
    const signerService =
      typeof AppInit.createDocHistorySignerService === "function"
        ? AppInit.createDocHistorySignerService({
            getMessage,
            getDocType,
            getElectronApi: () => w.electronAPI,
            showDialog: typeof w.showDialog === "function" ? w.showDialog : null,
            showToast: typeof w.showToast === "function" ? w.showToast : null,
            showConfirm: typeof w.showConfirm === "function" ? w.showConfirm : null
          })
        : null;

    const resolveMessage = (key, options = {}) =>
      (typeof getMessage === "function" && getMessage(key, options)) || {
        text: options?.fallbackText || key || "",
        title: options?.fallbackTitle || "TEIF"
      };

    const showDialogSafe = async (message, options = {}) => {
      if (typeof w.showDialog === "function") {
        await w.showDialog(message, options);
      }
    };

    const getEntry = (idx) =>
      typeof getEntryByIndex === "function" ? getEntryByIndex(idx) : null;

    const resolveDisplayFilename = (value) => {
      if (typeof getDisplayFilename === "function") {
        const resolved = getDisplayFilename(value);
        if (resolved) return resolved;
      }
      return String(value || "").trim();
    };

    const setHistoryActionLoading = (btn, loading, label) => {
      if (!btn) return;
      if (loading) {
        if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent || "";
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.textContent = label || "Generation...";
        return;
      }
      const defaultLabel = btn.dataset.defaultLabel || "";
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (defaultLabel) btn.textContent = defaultLabel;
    };

    const runOpenDigigo = () => {
      if (typeof openDigigoLogin === "function") {
        openDigigoLogin();
        return;
      }
      const digigoLoginUrl = "https://digigo.tuntrust.tn/login";
      try {
        if (w.electronAPI?.openExternal) {
          w.electronAPI.openExternal(digigoLoginUrl);
          return;
        }
      } catch {}
      if (typeof window !== "undefined") {
        window.open(digigoLoginUrl, "_blank", "noopener,noreferrer");
      }
    };

    async function handleTeifUnsigned(idx, actionBtn) {
      if (!signerService) {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Signature TEIF indisponible.",
          fallbackTitle: "TEIF"
        });
        await showDialogSafe(unavailable.text, { title: unavailable.title });
        return;
      }
      const entry = getEntry(idx);
      setHistoryActionLoading(actionBtn, true, "Generation...");
      try {
        await signerService.generateUnsigned(entry, { showToast: true, notifyErrors: true });
      } finally {
        setHistoryActionLoading(actionBtn, false);
      }
    }

    async function handleIdTrustSign(idx, actionBtn) {
      if (!signerService) {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Signature TEIF indisponible.",
          fallbackTitle: "TEIF"
        });
        await showDialogSafe(unavailable.text, { title: unavailable.title });
        return;
      }
      const entry = getEntry(idx);
      setHistoryActionLoading(actionBtn, true, "Signature...");
      try {
        const genRes = await signerService.generateUnsigned(entry, {
          showToast: false,
          notifyErrors: true
        });
        if (!genRes?.ok) return;
        const signRes = await signerService.signWithIdTrust(genRes.path, { notifyErrors: true });
        if (!signRes?.ok) return;
        await signerService.showIdTrustSuccess(signRes.path);
      } finally {
        setHistoryActionLoading(actionBtn, false);
      }
    }

    async function handleSignerFacture(idx) {
      if (!signerService) {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Signature TEIF indisponible.",
          fallbackTitle: "TEIF"
        });
        await showDialogSafe(unavailable.text, { title: unavailable.title });
        return;
      }

      const entry = getEntry(idx);
      const validation = await signerService.validateEntryForFacture(entry, {
        notifyErrors: true
      });
      if (!validation?.ok) return;

      if (typeof w.showDialog !== "function") {
        await handleTeifUnsigned(idx, null);
        return;
      }

      const signerState = {
        generating: false,
        signing: false,
        unsignedPath: "",
        idTrustSignedPath: "",
        digigoSignedPath: ""
      };

      await w.showDialog("", {
        title: "Signer Facture",
        renderMessage(container) {
          if (!container) return;
          container.innerHTML = "";
          container.style.maxHeight = "none";
          container.style.overflow = "visible";

          const dialogOverlay = container.closest("#swbDialog");
          const dialogActions = dialogOverlay?.querySelector(".swbDialog__actions") || null;
          const dialogGroupLeft = dialogActions?.querySelector(".swbDialog__group--left") || null;
          const dialogGroupRight = dialogActions?.querySelector(".swbDialog__group--right") || null;
          const dialogCloseBtn = dialogOverlay?.querySelector("#swbDialogCancel") || null;
          const dialogOkBtn = dialogOverlay?.querySelector("#swbDialogOk") || null;

          const removeStepNavButtons = () => {
            if (!dialogGroupRight) return;
            const existing = dialogGroupRight.querySelectorAll(
              ".doc-history-signer__step-nav-btn"
            );
            existing.forEach((btn) => btn.remove());
          };
          removeStepNavButtons();

          const root = document.createElement("div");
          root.className = "doc-history-signer";

          let currentStep = 1;
          let stepPrevBtn = null;
          let stepNextBtn = null;
          let cleanupActionBar = () => {};
          const stepper = document.createElement("div");
          stepper.className = "model-stepper__labels";
          stepper.setAttribute("role", "tablist");
          stepper.setAttribute("aria-label", "Etapes de signature");
          const stepperIdBase = `docHistorySignerStep-${Date.now()}`;

          const createStepBtn = (step, labelText) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "model-stepper__step";
            btn.dataset.step = String(step);
            btn.setAttribute("role", "tab");
            btn.id = `${stepperIdBase}-tab-${step}`;
            btn.setAttribute("aria-controls", `${stepperIdBase}-panel-${step}`);

            const badge = document.createElement("span");
            badge.className = "model-stepper__badge";
            badge.textContent = String(step);

            const title = document.createElement("span");
            title.className = "model-stepper__title";
            title.textContent = labelText;

            btn.append(badge, title);
            return btn;
          };
          const step1Btn = createStepBtn(1, "G\u00E9n\u00E9rer XML");
          const step2Btn = createStepBtn(2, "Signer XML");
          stepper.append(step1Btn, step2Btn);

          const step1Panel = document.createElement("div");
          step1Panel.className = "doc-history-signer__step-panel";
          step1Panel.dataset.step = "1";
          step1Panel.setAttribute("role", "tabpanel");
          step1Panel.id = `${stepperIdBase}-panel-1`;
          step1Panel.setAttribute("aria-labelledby", `${stepperIdBase}-tab-1`);

          const step2Panel = document.createElement("div");
          step2Panel.className = "doc-history-signer__step-panel";
          step2Panel.dataset.step = "2";
          step2Panel.setAttribute("role", "tabpanel");
          step2Panel.id = `${stepperIdBase}-panel-2`;
          step2Panel.setAttribute("aria-labelledby", `${stepperIdBase}-tab-2`);

          const subtitle = document.createElement("p");
          subtitle.className = "doc-history-signer__subtitle";
          subtitle.textContent = "G\u00E9n\u00E9rez d'abord le TEIF XML non sign\u00E9.";
          step1Panel.appendChild(subtitle);

          const step2Heading = document.createElement("p");
          step2Heading.className = "doc-history-signer__step2-heading";
          step2Heading.textContent = "Signez le document XML avec :";
          step2Panel.appendChild(step2Heading);

          root.append(stepper, step1Panel, step2Panel);

          const createSection = (
            parentEl,
            buttonLabel,
            {
              disabled = false,
              withProgress = false,
              alwaysVisibleResult = false,
              resultLabel = "",
              withResult = true
            } = {}
          ) => {
            const section = document.createElement("section");
            section.className = "doc-history-signer__section";

            const actionWrap = document.createElement("div");
            actionWrap.className = "doc-history-signer__action-wrap";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "client-search__edit doc-history-signer__action-btn";
            button.textContent = buttonLabel;
            button.disabled = !!disabled;
            actionWrap.appendChild(button);

            let progress = null;
            if (withProgress) {
              progress = document.createElement("div");
              progress.className = "doc-history-signer__progress";
              progress.dataset.state = "idle";
              progress.setAttribute("role", "progressbar");
              progress.setAttribute("aria-label", "XML generation progress");
              progress.setAttribute("aria-valuemin", "0");
              progress.setAttribute("aria-valuemax", "100");
              progress.setAttribute("aria-valuenow", "0");
              const progressBar = document.createElement("span");
              progressBar.className = "doc-history-signer__progress-bar";
              progress.appendChild(progressBar);
              actionWrap.appendChild(progress);
            }

            let result = null;
            if (withResult) {
              result = document.createElement("div");
              result.className = "doc-history-signer__result";
              result.hidden = !alwaysVisibleResult;
              if (resultLabel) {
                result.dataset.resultLabel = String(resultLabel);
              }
              if (alwaysVisibleResult) {
                result.dataset.alwaysVisible = "true";
              }
              section.append(actionWrap, result);
            } else {
              section.append(actionWrap);
            }
            parentEl.appendChild(section);
            return { section, actionWrap, button, result, progress };
          };

          const syncStepNavButtons = () => {
            const isStep1 = currentStep === 1;
            const busy = signerState.generating || signerState.signing;
            if (stepPrevBtn) {
              const prevDisabled = busy || isStep1;
              stepPrevBtn.disabled = prevDisabled;
              stepPrevBtn.setAttribute("aria-disabled", prevDisabled ? "true" : "false");
            }
            if (stepNextBtn) {
              const nextDisabled = busy || !isStep1;
              stepNextBtn.disabled = nextDisabled;
              stepNextBtn.setAttribute("aria-disabled", nextDisabled ? "true" : "false");
            }
          };
          const updateStepUi = () => {
            const isStep1 = currentStep === 1;
            step1Panel.toggleAttribute("hidden", !isStep1);
            step2Panel.toggleAttribute("hidden", isStep1);
            step1Panel.setAttribute("aria-hidden", isStep1 ? "false" : "true");
            step2Panel.setAttribute("aria-hidden", isStep1 ? "true" : "false");
            step1Btn.classList.toggle("is-active", isStep1);
            step2Btn.classList.toggle("is-active", !isStep1);
            step1Btn.setAttribute("aria-selected", isStep1 ? "true" : "false");
            step2Btn.setAttribute("aria-selected", isStep1 ? "false" : "true");
            step1Btn.tabIndex = isStep1 ? 0 : -1;
            step2Btn.tabIndex = isStep1 ? -1 : 0;
            syncStepNavButtons();
          };
          step1Btn.addEventListener("click", () => {
            currentStep = 1;
            updateStepUi();
          });
          step2Btn.addEventListener("click", () => {
            currentStep = 2;
            updateStepUi();
          });

          const renderResultRow = (resultNode, { path: filePath = "", error = "" } = {}) => {
            if (!resultNode) return;
            const resolvedPath = String(filePath || "").trim();
            const errorMessage = String(error || "").trim();
            const hasPath = !!resolvedPath;
            resultNode.innerHTML = "";

            const label = document.createElement("p");
            label.className = "doc-history-signer__result-label";
            label.textContent =
              resultNode.dataset.resultLabel || "Le fichier g\u00e9n\u00e9r\u00e9 est le suivant :";

            const name = document.createElement("p");
            name.className = "doc-history-signer__filename";
            if (errorMessage) {
              name.classList.add("is-error");
              name.textContent = errorMessage;
            } else if (hasPath) {
              name.textContent = resolveDisplayFilename(resolvedPath) || resolvedPath;
            } else {
              name.classList.add("is-placeholder");
              name.textContent = "--";
            }

            const textBlock = document.createElement("div");
            textBlock.className = "doc-history-signer__result-text";
            textBlock.append(label, name);

            const actions = document.createElement("div");
            actions.className = "doc-history-signer__result-actions";
            const openBtn = document.createElement("button");
            openBtn.type = "button";
            openBtn.className = "client-search__edit doc-history__open-folder doc-history-signer__open-folder";
            openBtn.title = "Open location";
            openBtn.setAttribute("aria-label", "Open location");
            openBtn.disabled = !hasPath;
            openBtn.setAttribute("aria-disabled", hasPath ? "false" : "true");
            openBtn.innerHTML = `
              <span class="doc-history__folder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                  <path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path>
                </svg>
              </span>
            `;
            openBtn.addEventListener("click", async (evt) => {
              evt.preventDefault();
              if (!hasPath) return;
              const api = signerService.getApi();
              if (typeof api?.showInFolder !== "function") {
                if (typeof w.showToast === "function") {
                  w.showToast("Open location is unavailable.");
                }
                return;
              }
              try {
                const opened = await api.showInFolder(resolvedPath);
                if (!opened && typeof w.showToast === "function") {
                  w.showToast("Unable to open file location.");
                }
              } catch (err) {
                console.warn("doc-history signer open location failed", err);
                if (typeof w.showToast === "function") {
                  w.showToast("Unable to open file location.");
                }
              }
            });
            actions.appendChild(openBtn);
            resultNode.append(textBlock, actions);
          };

          const showError = (resultNode, message) => {
            if (!resultNode) return;
            if (resultNode.dataset.alwaysVisible === "true") {
              resultNode.hidden = false;
              renderResultRow(resultNode, { error: message || "Operation impossible." });
              return;
            }
            resultNode.hidden = false;
            resultNode.innerHTML = "";
            const errorEl = document.createElement("p");
            errorEl.className = "doc-history-signer__error";
            errorEl.textContent = String(message || "Operation impossible.");
            resultNode.appendChild(errorEl);
          };

          const showFileResult = (resultNode, filePath) => {
            if (!resultNode) return;
            const resolvedPath = String(filePath || "").trim();
            const alwaysVisible = resultNode.dataset.alwaysVisible === "true";
            if (!resolvedPath && !alwaysVisible) {
              resultNode.hidden = true;
              resultNode.innerHTML = "";
              return;
            }
            resultNode.hidden = false;
            renderResultRow(resultNode, { path: resolvedPath });
          };

          const setLoading = (btn, loading, loadingLabel) => {
            if (!btn) return;
            if (loading) {
              if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent || "";
              btn.classList.add("is-loading");
              btn.textContent = loadingLabel || btn.dataset.defaultLabel || "";
              return;
            }
            btn.classList.remove("is-loading");
            if (btn.dataset.defaultLabel) btn.textContent = btn.dataset.defaultLabel;
          };

          const setGenerationProgressState = (sectionRef, state) => {
            const progress = sectionRef?.progress;
            if (!progress) return;
            const isGenerating = state === "generating";
            progress.dataset.state = isGenerating ? "generating" : "idle";
            progress.setAttribute("aria-valuenow", isGenerating ? "100" : "0");
            progress.setAttribute("aria-valuetext", isGenerating ? "Generating" : "Idle");
          };

          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const GENERATE_ACTION_START_DELAY_MS = 220;

          const generateSection = createSection(step1Panel, "Generate XML", {
            withProgress: true,
            alwaysVisibleResult: true,
            resultLabel: "Le fichier g\u00E9n\u00E9r\u00E9 est le suivant :"
          });
          const idTrustSection = createSection(step2Panel, "Signer ID-Trust (USB)", {
            disabled: true,
            alwaysVisibleResult: true,
            resultLabel: "Le fichier XML sign\u00E9 (ID-Trust) est le suivant :"
          });
          const digigoSection = createSection(step2Panel, "Signer DigiGo", {
            disabled: true,
            withResult: false
          });

          const canSignIdTrust = typeof signerService.getApi()?.signTeifIdTrust === "function";

          if (
            dialogOverlay &&
            dialogActions &&
            dialogGroupLeft &&
            dialogGroupRight &&
            dialogCloseBtn &&
            dialogOkBtn
          ) {
            dialogOverlay.classList.add("swbDialog--doc-history-signer");
            dialogCloseBtn.style.display = "";
            dialogCloseBtn.textContent = "Fermer";
            dialogCloseBtn.removeAttribute("aria-hidden");
            dialogOkBtn.style.display = "none";

            stepPrevBtn = document.createElement("button");
            stepPrevBtn.type = "button";
            stepPrevBtn.className = "swbDialog__ok doc-history-signer__step-nav-btn";
            stepPrevBtn.textContent = "\u00C9tape pr\u00E9c\u00E9dente";

            stepNextBtn = document.createElement("button");
            stepNextBtn.type = "button";
            stepNextBtn.className = "swbDialog__ok doc-history-signer__step-nav-btn";
            stepNextBtn.textContent = "\u00C9tape suivante";

            const goPrevStep = (evt) => {
              evt?.preventDefault?.();
              if (currentStep <= 1) return;
              currentStep = 1;
              updateStepUi();
            };
            const goNextStep = (evt) => {
              evt?.preventDefault?.();
              if (currentStep >= 2) return;
              currentStep = 2;
              updateStepUi();
            };
            const closeFromLeftButton = (evt) => {
              evt?.preventDefault?.();
              dialogOkBtn.click();
            };

            stepPrevBtn.addEventListener("click", goPrevStep);
            stepNextBtn.addEventListener("click", goNextStep);
            dialogCloseBtn.addEventListener("click", closeFromLeftButton);

            dialogGroupRight.insertBefore(stepPrevBtn, dialogOkBtn);
            dialogGroupRight.insertBefore(stepNextBtn, dialogOkBtn);

            let cleaned = false;
            const observer = new MutationObserver(() => {
              const hidden =
                dialogOverlay.getAttribute("aria-hidden") === "true" ||
                dialogOverlay.style.display === "none";
              if (!hidden) return;
              cleanupActionBar();
            });
            observer.observe(dialogOverlay, {
              attributes: true,
              attributeFilter: ["aria-hidden", "style"]
            });

            cleanupActionBar = () => {
              if (cleaned) return;
              cleaned = true;
              observer.disconnect();
              stepPrevBtn?.removeEventListener("click", goPrevStep);
              stepNextBtn?.removeEventListener("click", goNextStep);
              dialogCloseBtn.removeEventListener("click", closeFromLeftButton);
              removeStepNavButtons();
              dialogOverlay.classList.remove("swbDialog--doc-history-signer");
              dialogCloseBtn.style.display = "none";
              dialogOkBtn.style.display = "";
            };
          }

          const syncButtons = () => {
            const busy = signerState.generating || signerState.signing;
            generateSection.button.disabled = busy;
            idTrustSection.button.disabled =
              busy || !signerState.unsignedPath || !canSignIdTrust;
            digigoSection.button.disabled = busy || !signerState.unsignedPath;
            syncStepNavButtons();
          };

          generateSection.button.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (signerState.generating || signerState.signing) return;
            signerState.generating = true;
            syncButtons();
            setGenerationProgressState(generateSection, "generating");
            setLoading(generateSection.button, true, "Generation...");
            try {
              await wait(GENERATE_ACTION_START_DELAY_MS);
              const genRes = await signerService.generateUnsigned(entry, {
                showToast: false,
                notifyErrors: false
              });
              if (!genRes?.ok) {
                showError(generateSection.result, genRes?.error || "Generation TEIF echouee.");
                return;
              }
              const unsignedPath = String(genRes?.path || "").trim();
              if (!unsignedPath) {
                showError(generateSection.result, "TEIF non genere / fichier introuvable.");
                return;
              }
              signerState.unsignedPath = unsignedPath;
              signerState.idTrustSignedPath = "";
              signerState.digigoSignedPath = "";
              showFileResult(generateSection.result, signerState.unsignedPath);
              showFileResult(idTrustSection.result, "");
            } catch (err) {
              showError(generateSection.result, String(err?.message || err || "Generation TEIF echouee."));
            } finally {
              signerState.generating = false;
              setGenerationProgressState(generateSection, "idle");
              setLoading(generateSection.button, false);
              syncButtons();
            }
          });

          idTrustSection.button.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (signerState.generating || signerState.signing) return;
            const unsignedPath = String(signerState.unsignedPath || "").trim();
            if (!unsignedPath) {
              showError(idTrustSection.result, "TEIF non genere / fichier introuvable.");
              return;
            }
            if (!canSignIdTrust) {
              showError(idTrustSection.result, "Signature ID-Trust indisponible.");
              return;
            }
            signerState.signing = true;
            syncButtons();
            setLoading(idTrustSection.button, true, "Signature...");
            try {
              const signRes = await signerService.signWithIdTrust(unsignedPath, {
                notifyErrors: false
              });
              if (!signRes?.ok) {
                showError(idTrustSection.result, signRes?.error || "Signature TEIF echouee.");
                return;
              }
              signerState.idTrustSignedPath = String(signRes.path || "").trim();
              showFileResult(idTrustSection.result, signerState.idTrustSignedPath);
            } catch (err) {
              showError(
                idTrustSection.result,
                String(err?.message || err || "Signature TEIF echouee.")
              );
            } finally {
              signerState.signing = false;
              setLoading(idTrustSection.button, false);
              syncButtons();
            }
          });

          digigoSection.button.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (!signerState.unsignedPath || signerState.generating || signerState.signing) return;
            const unsignedPath = String(signerState.unsignedPath || "").trim();
            if (!unsignedPath) {
              if (typeof w.showToast === "function") {
                w.showToast("TEIF non genere / fichier introuvable.");
              }
              return;
            }
            if (typeof signerService.signWithDigigo !== "function") {
              runOpenDigigo();
              return;
            }
            signerState.signing = true;
            syncButtons();
            setLoading(digigoSection.button, true, "Signature...");
            try {
              const signRes = await signerService.signWithDigigo(unsignedPath, {
                notifyErrors: false
              });
              if (!signRes?.ok) {
                if (signRes?.unsupported) {
                  runOpenDigigo();
                  return;
                }
                if (typeof w.showToast === "function") {
                  w.showToast(signRes?.error || "Signature TEIF echouee.");
                }
                return;
              }
              signerState.digigoSignedPath = String(signRes.path || "").trim();
            } catch (err) {
              if (typeof w.showToast === "function") {
                w.showToast(String(err?.message || err || "Signature TEIF echouee."));
              }
            } finally {
              signerState.signing = false;
              setLoading(digigoSection.button, false);
              syncButtons();
            }
          });

          showFileResult(generateSection.result, "");
          showFileResult(idTrustSection.result, "");
          updateStepUi();
          setGenerationProgressState(generateSection, "idle");
          syncButtons();
          container.appendChild(root);
        }
      });
    }

    return {
      handleTeifUnsigned,
      handleIdTrustSign,
      handleSignerFacture
    };
  };
})(window);
