(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const helpers = (SEM.__bindingHelpers = SEM.__bindingHelpers || {});
  const state = () => SEM.state;
  const getMessage = (key, options = {}) =>
    (typeof w.getAppMessage === "function" && w.getAppMessage(key, options)) || {
      text: options?.fallbackText || key || "",
      title: options?.fallbackTitle || w.DialogMessages?.defaultTitle || "Information"
    };
  const bindingShared = SEM.__bindingShared || {};
  const sharedConstants = bindingShared.constants || {};
  const MAX_COMPANY_PHONE_COUNT = sharedConstants.MAX_COMPANY_PHONE_COUNT || 3;
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
  const formatSoldClientValue =
    bindingShared.formatSoldClientValue ||
    ((value) => {
      const cleaned = String(value ?? "").replace(",", ".").trim();
      if (!cleaned) return "";
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return String(value ?? "").trim();
      return num.toFixed(3);
    });
  const getWhNoteContext = bindingShared.getWhNoteContext || (() => ({}));
  const cleanWhNoteEditor = bindingShared.cleanWhNoteEditor || (() => {});
  const formatCompanyPhoneList = bindingShared.formatCompanyPhoneList || ((list = []) =>
    (Array.isArray(list) ? list : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ")
  );
  const setCompanyPhoneInputs = bindingShared.setCompanyPhoneInputs || (() => {});
  const collectCompanyPhoneInputs = bindingShared.collectCompanyPhoneInputs || (() => []);
  const persistCompanyProfile = bindingShared.persistCompanyProfile || (() => {});
  const persistSmtpSettings = bindingShared.persistSmtpSettings || (() => {});
  const updateCompanyLogoImage = bindingShared.updateCompanyLogoImage || (() => {});
  const refreshCompanySummary = bindingShared.refreshCompanySummary || (() => {});
  const refreshClientSummary = bindingShared.refreshClientSummary || (() => {});
  const refreshInvoiceSummary = bindingShared.refreshInvoiceSummary || (() => {});
  const setWhNoteEditorContent = bindingShared.setWhNoteEditorContent || (() => {});
  const syncWhNoteStateFromEditor = bindingShared.syncWhNoteStateFromEditor || (() => {});

  const registerLiveBindingSet = SEM.registerLiveBindingSet;
  if (typeof registerLiveBindingSet !== "function") {
    console.warn("[live-bindings] registerLiveBindingSet is unavailable");
    return;
  }

  registerLiveBindingSet("company", () => {
      if (!SEM.COMPANY_LOCKED) {
        const map = [
          ["companyName", v => state().company.name = v],
          ["companyVat", v => state().company.vat = v],
          ["companyCustomsCode", v => state().company.customsCode = v],
          ["companyIban", v => state().company.iban = v],
          ["companyEmail", v => state().company.email = v],
          ["companyAddress", v => state().company.address = v],
        ];
        map.forEach(([id, set]) => getEl(id)?.addEventListener("input", () => {
          set(getStr(id, ""));
          persistCompanyProfile();
          refreshCompanySummary();
        }));
      }
      if (!SEM._companyContactModalInitialized) {
        SEM._companyContactModalInitialized = true;
        initCompanyContactModal();
      }
      const companySmtpBtn = getEl("btnCompanySmtpSettings");
      if (!SEM._companySmtpModalInitialized) {
        SEM._companySmtpModalInitialized = initCompanySmtpModal();
      }
      const companyLanServerBtn = getEl("btnCompanyLanServerSettings");
      const companyLanServerModal = getEl("companyLanServerModal");
      const lanServerSupported = typeof w.electronAPI?.lanServerStatus === "function";
      if (!lanServerSupported) {
        companyLanServerBtn?.remove();
        companyLanServerModal?.remove();
      } else if (!SEM._companyLanServerModalInitialized) {
        SEM._companyLanServerModalInitialized = true;
        initCompanyLanServerModal();
      }

      function initCompanyContactModal() {
        const overlay = getEl("companyContactModal");
        const openBtn = getEl("btnCompanyContactEdit");
        const form = getEl("companyContactModalForm");
        const videoBtn = getEl("companyContactModalVideo");
        const closeBtn = getEl("companyContactModalClose");
        const cancelBtn = getEl("companyContactModalCancel");
        const prevBtn = getEl("companyContactModalPrev");
        const nextBtn = getEl("companyContactModalNext");
        const saveBtn = getEl("companyContactModalSave");
        const modalFields = {
          mfIdentifiant: getEl("companyModalMfIdentifiant"),
          mfKey: getEl("companyModalMfKey"),
          mfCodeTva: getEl("companyModalMfCodeTva"),
          mfCategory: getEl("companyModalMfCategory"),
          mfEstablishment: getEl("companyModalMfEstablishment"),
          customsCode: getEl("companyModalCustomsCode"),
          iban: getEl("companyModalIban"),
          email: getEl("companyModalEmail"),
          addressStreet: getEl("companyModalAddressStreet"),
          addressPostal: getEl("companyModalAddressPostal"),
          addressCity: getEl("companyModalAddressCity")
        };
        const companyTypeSelectEl = getEl("companyType");
        const companyTypeMenu = getEl("companyTypeMenu");
        const companyTypePanel = getEl("companyTypePanel");
        const companyTypeDisplay = getEl("companyTypeDisplay");
        const companyTypeToggle = companyTypeMenu?.querySelector("summary") || null;
        const COMPANY_TYPE_LABELS = {
          societe: "Societe / personne morale (PM)",
          personne_physique: "Personne physique (PP)"
        };
        const normalizeCompanyTypeValue = (value) =>
          COMPANY_TYPE_LABELS[String(value || "").toLowerCase()]
            ? String(value || "").toLowerCase()
            : "societe";
        const phoneList = getEl("companyModalPhones");
        const phoneAddBtn = getEl("companyModalPhoneAdd");
        const logoPreview = overlay?.querySelector("#companyLogoPreview");
        const pickLogoBtn = overlay?.querySelector("#btnPickLogo");
        const deleteLogoBtn = overlay?.querySelector("#btnDeleteLogo");
        const pickSealBtn = overlay?.querySelector("#btnPickSeal");
        const rotateSealBtn = overlay?.querySelector("#btnRotateSeal");
        const deleteSealBtn = overlay?.querySelector("#btnDeleteSeal");
        const pickSignatureBtn = overlay?.querySelector("#btnPickSignature");
        const rotateSignatureBtn = overlay?.querySelector("#btnRotateSignature");
        const deleteSignatureBtn = overlay?.querySelector("#btnDeleteSignature");
        const stepTabs = Array.from(
          overlay?.querySelectorAll("[data-company-contact-step]") || []
        );
        const stepPanels = Array.from(
          overlay?.querySelectorAll("[data-company-contact-step-panel]") || []
        );
        if (!overlay || !openBtn || !form) return;

        const mainFieldIds = {
          vat: "companyVat",
          customsCode: "companyCustomsCode",
          iban: "companyIban",
          email: "companyEmail",
          address: "companyAddress"
        };

        let restoreFocusEl = null;
        let companyContactStep = 1;
        const updateModalLogoPreview = (src) => {
          if (!logoPreview) return;
          logoPreview.innerHTML = "";
          if (src) {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "Logo actuel";
            logoPreview.appendChild(img);
          } else {
            const placeholder = document.createElement("span");
            placeholder.className = "company-logo-preview__placeholder";
            placeholder.textContent = "Aucun logo";
            logoPreview.appendChild(placeholder);
          }
        };

        const syncCompanyTypeMenuUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
          const normalized = normalizeCompanyTypeValue(value);
          if (updateSelect && companyTypeSelectEl) {
            companyTypeSelectEl.value = normalized;
          }
          if (companyTypeDisplay) {
            companyTypeDisplay.textContent = COMPANY_TYPE_LABELS[normalized];
          }
          if (companyTypePanel) {
            companyTypePanel.querySelectorAll("[data-company-type-option]").forEach((btn) => {
              const isMatch = btn.dataset.companyTypeOption === normalized;
              btn.classList.toggle("is-active", isMatch);
              btn.setAttribute("aria-selected", isMatch ? "true" : "false");
            });
          }
          if (closeMenu && companyTypeMenu?.open) {
            companyTypeMenu.open = false;
          }
          if (companyTypeToggle) {
            companyTypeToggle.setAttribute("aria-expanded", companyTypeMenu?.open ? "true" : "false");
          }
          return normalized;
        };

        const normalizeMatriculePart = (value, { digits = false, upper = false, maxLen = null } = {}) => {
          let normalized = String(value ?? "").trim();
          if (!normalized) return "";
          normalized = normalized.replace(/\s+/g, "");
          if (digits) normalized = normalized.replace(/\D/g, "");
          if (upper) normalized = normalized.toUpperCase();
          if (Number.isFinite(maxLen)) normalized = normalized.slice(0, maxLen);
          return normalized;
        };

        const parseMatriculeFiscal = (raw) => {
          const empty = {
            identifiant: "",
            key: "",
            codeTva: "",
            category: "",
            establishment: ""
          };
          const compact = String(raw ?? "").trim().replace(/\s+/g, "").toUpperCase();
          if (!compact) return empty;
          const match = compact.match(
            /^(\d{0,7})([A-Z0-9]?)(?:\/([A-Z0-9]?)(?:\/([A-Z0-9]?)(?:\/(\d{0,3}))?)?)?$/
          );
          if (match) {
            return {
              identifiant: match[1] || "",
              key: match[2] || "",
              codeTva: match[3] || "",
              category: match[4] || "",
              establishment: match[5] || ""
            };
          }
          const parts = compact.split("/");
          const head = parts[0] || "";
          const headMatch = head.match(/^(\d+)([A-Z0-9]?)$/);
          return {
            identifiant: headMatch ? headMatch[1].slice(0, 7) : head.replace(/\D/g, "").slice(0, 7),
            key: headMatch ? headMatch[2] : head.replace(/\d/g, "").charAt(0),
            codeTva: (parts[1] || "").charAt(0),
            category: (parts[2] || "").charAt(0),
            establishment: (parts[3] || "").replace(/\D/g, "").slice(0, 3)
          };
        };

        const setMatriculeFiscalInputs = (raw) => {
          const parsed = parseMatriculeFiscal(raw);
          if (modalFields.mfIdentifiant) modalFields.mfIdentifiant.value = parsed.identifiant;
          if (modalFields.mfKey) modalFields.mfKey.value = parsed.key;
          if (modalFields.mfCodeTva) modalFields.mfCodeTva.value = parsed.codeTva;
          if (modalFields.mfCategory) modalFields.mfCategory.value = parsed.category;
          if (modalFields.mfEstablishment) modalFields.mfEstablishment.value = parsed.establishment;
        };

        const getMatriculeFiscalFromModal = () => {
          const identifiant = normalizeMatriculePart(modalFields.mfIdentifiant?.value, {
            digits: true,
            maxLen: 7
          });
          const key = normalizeMatriculePart(modalFields.mfKey?.value, { upper: true, maxLen: 1 });
          const codeTva = normalizeMatriculePart(modalFields.mfCodeTva?.value, { upper: true, maxLen: 1 });
          const category = normalizeMatriculePart(modalFields.mfCategory?.value, { upper: true, maxLen: 1 });
          const establishment = normalizeMatriculePart(modalFields.mfEstablishment?.value, {
            digits: true,
            maxLen: 3
          });
          if (!identifiant && !key && !codeTva && !category && !establishment) return "";
          const head = `${identifiant}${key}`;
          if (!head) return "";
          const tail = [codeTva, category, establishment];
          if (!tail.some(Boolean)) return head;
          return `${head}/${tail.map((part) => part || "").join("/")}`;
        };

        const syncFromMain = () => {
          setMatriculeFiscalInputs(getStr(mainFieldIds.vat, ""));
          if (modalFields.customsCode) modalFields.customsCode.value = getStr(mainFieldIds.customsCode, "");
          if (modalFields.iban) modalFields.iban.value = getStr(mainFieldIds.iban, "");
          if (modalFields.email) modalFields.email.value = getStr(mainFieldIds.email, "");
          const addressParts = parseAddressParts(getStr(mainFieldIds.address, ""));
          if (modalFields.addressStreet) modalFields.addressStreet.value = addressParts.street;
          if (modalFields.addressPostal) modalFields.addressPostal.value = addressParts.postal;
          if (modalFields.addressCity) modalFields.addressCity.value = addressParts.city;
          syncCompanyTypeMenuUi(state().company?.type || "societe", { updateSelect: true });
          const phoneValues = collectCompanyPhoneInputs();
          setPhoneInputs(phoneValues.length ? phoneValues : [""]);
          updateModalLogoPreview(state().company?.logo || "");
          SEM.refreshSealPreview?.();
          SEM.refreshSignaturePreview?.();
        };

        const applyToMain = () => {
          const phoneValues = collectModalPhoneInputs();
          const vat = getMatriculeFiscalFromModal();
          const values = {
            type: syncCompanyTypeMenuUi(
              companyTypeSelectEl?.value || state().company?.type || "societe",
              { updateSelect: true }
            ),
            vat,
            customsCode: modalFields.customsCode?.value ?? "",
            iban: modalFields.iban?.value ?? "",
            phone: formatCompanyPhoneList(phoneValues),
            email: modalFields.email?.value ?? "",
            address: formatModalAddress()
          };
          setMainValue(mainFieldIds.vat, values.vat);
          setMainValue(mainFieldIds.customsCode, values.customsCode);
          setMainValue(mainFieldIds.iban, values.iban);
          setMainValue(mainFieldIds.email, values.email);
          setMainValue(mainFieldIds.address, values.address);
          setCompanyPhoneInputs(phoneValues);
          const company = state().company || (state().company = {});
          company.type = values.type;
          company.vat = values.vat;
          company.customsCode = values.customsCode;
          company.iban = values.iban;
          company.phone = values.phone;
          company.email = values.email;
          company.address = values.address;
          persistCompanyProfile();
          refreshCompanySummary();
          updateCompanyLogoImage(company.logo);
        };

        function parseAddressParts(raw = "") {
          const parts = String(raw || "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          return {
            street: parts[0] || "",
            postal: parts[1] || "",
            city: parts[2] || ""
          };
        }

        function formatModalAddress() {
          const parts = [
            String(modalFields.addressStreet?.value ?? "").trim(),
            String(modalFields.addressPostal?.value ?? "").trim(),
            String(modalFields.addressCity?.value ?? "").trim()
          ].filter(Boolean);
          return parts.join(", ");
        }

        const collectModalPhoneInputs = () => {
          if (!phoneList) return [];
          return Array.from(phoneList.querySelectorAll(".company-phone-input"))
            .map((input) => {
              const row = input.closest(".company-phone-item");
              const codeInput = row?.querySelector(".company-phone-code");
              const code = codeInput ? codeInput.value.trim() : "";
              const number = input.value.trim();
              return [code, number].filter(Boolean).join(" ").trim();
            })
            .filter(Boolean)
            .slice(0, MAX_COMPANY_PHONE_COUNT);
        };

        const parsePhoneParts = (raw = "") => {
          const trimmed = String(raw || "").trim();
          if (!trimmed) return { code: "+216", number: "" };
          const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
          if (match) {
            return { code: match[1], number: match[2].trim() };
          }
          return { code: "+216", number: trimmed };
        };

        const createPhoneItem = (value = "", index = 0) => {
          const row = document.createElement("div");
          row.className = "company-phone-item";
          row.dataset.phoneIndex = String(index);
          const codeInput = document.createElement("input");
          codeInput.type = "tel";
          codeInput.className = "company-phone-code";
          codeInput.autocomplete = "off";
          const input = document.createElement("input");
          input.type = "tel";
          input.className = "company-phone-input";
          input.autocomplete = "off";
          const parsed = parsePhoneParts(value);
          codeInput.value = parsed.code || "";
          input.value = parsed.number || "";
          row.appendChild(codeInput);
          row.appendChild(input);
          if (index > 0) {
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "company-phone-remove";
            removeBtn.setAttribute("aria-label", "Supprimer ce numéro");
            removeBtn.innerHTML = `
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M16 1.75V3h5.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H8V1.75C8 .784 8.784 0 9.75 0h4.5C15.216 0 16 .784 16 1.75Zm-6.5 0V3h5V1.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25ZM4.997 6.178a.75.75 0 1 0-1.493.144L4.916 20.92a1.75 1.75 0 0 0 1.742 1.58h10.684a1.75 1.75 0 0 0 1.742-1.581l1.413-14.597a.75.75 0 0 0-1.494-.144l-1.412 14.596a.25.25 0 0 1-.249.226H6.658a.25.25 0 0 0-.249-.226L4.997 6.178Z"></path>
                <path d="M9.206 7.501a.75.75 0 0 1 .793.705l.5 8.5A.75.75 0 1 1 9 16.794l-.5-8.5a.75.75 0 0 1 .705-.793Zm6.293.793A.75.75 0 1 0 14 8.206l-.5 8.5a.75.75 0 0 0 1.498.088l.5-8.5Z"></path>
              </svg>
            `;
            row.appendChild(removeBtn);
          }
          return row;
        };

        const reindexPhoneRows = () => {
          if (!phoneList) return;
          const rows = Array.from(phoneList.querySelectorAll(".company-phone-item"));
          rows.forEach((row, idx) => {
            row.dataset.phoneIndex = String(idx);
            const input = row.querySelector(".company-phone-input");
            if (!input) return;
            if (idx === 0) {
              input.id = "companyModalPhonePrimary";
            } else {
              input.removeAttribute("id");
            }
            const codeInput = row.querySelector(".company-phone-code");
            if (!codeInput) return;
            if (idx === 0) {
              codeInput.id = "companyModalPhoneCodePrimary";
            } else {
              codeInput.removeAttribute("id");
            }
          });
        };

        const refreshPhoneButtons = () => {
          if (!phoneList) return;
          const rows = Array.from(phoneList.querySelectorAll(".company-phone-item"));
          rows.forEach((row, idx) => {
            const removeBtn = row.querySelector(".company-phone-remove");
            if (!removeBtn) return;
            removeBtn.hidden = rows.length <= 1 || idx === 0;
          });
          if (phoneAddBtn) {
            phoneAddBtn.disabled = rows.length >= MAX_COMPANY_PHONE_COUNT;
          }
        };

        const setPhoneInputs = (values = []) => {
          if (!phoneList) return;
          const normalized = Array.isArray(values) && values.length ? values.slice(0, MAX_COMPANY_PHONE_COUNT) : [""];
          phoneList.innerHTML = "";
          normalized.forEach((value, idx) => {
            phoneList.appendChild(createPhoneItem(value, idx));
          });
          reindexPhoneRows();
          refreshPhoneButtons();
        };

        const setMainValue = (id, value) => {
          const field = getEl(id);
          if (!field) return;
          const next = String(value ?? "").trim();
          if (field.value === next) return;
          field.value = next;
          field.dispatchEvent(new Event("input", { bubbles: true }));
        };

        const resolveCompanyContactStep = (value, fallback = 1) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed)) return fallback;
          return Math.trunc(parsed);
        };

        const focusCompanyContactStepPanel = (stepNum) => {
          const panel = overlay.querySelector(
            `[data-company-contact-step-panel="${stepNum}"]`
          );
          if (!panel) return;
          let focusTarget = null;
          if (stepNum === 1) {
            focusTarget = modalFields.mfIdentifiant || null;
          } else if (stepNum === 2) {
            focusTarget = modalFields.customsCode || null;
          } else if (stepNum === 3) {
            focusTarget = pickLogoBtn || null;
          }
          if (!focusTarget) {
            focusTarget = panel.querySelector(
              'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
            );
          }
          if (focusTarget && typeof focusTarget.focus === "function") {
            try {
              focusTarget.focus({ preventScroll: true });
            } catch {
              try {
                focusTarget.focus();
              } catch {}
            }
          }
        };

        const syncCompanyContactStepper = (targetStep, options = {}) => {
          const maxStep = stepPanels.length || stepTabs.length || 1;
          const fallbackStep = companyContactStep || 1;
          const requestedStep = resolveCompanyContactStep(targetStep, fallbackStep);
          const nextStep = Math.min(Math.max(1, requestedStep), maxStep);
          companyContactStep = nextStep;
          overlay.dataset.companyContactStep = String(nextStep);
          overlay.dataset.companyContactStepMax = String(maxStep);

          stepTabs.forEach((tab) => {
            const stepNum = resolveCompanyContactStep(tab.dataset.companyContactStep, 0);
            const isActive = stepNum === nextStep;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
            tab.setAttribute("tabindex", isActive ? "0" : "-1");
          });

          stepPanels.forEach((panel) => {
            const stepNum = resolveCompanyContactStep(panel.dataset.companyContactStepPanel, 0);
            const isActive = stepNum === nextStep;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
            if (isActive) panel.removeAttribute("hidden");
            else panel.setAttribute("hidden", "");
          });

          const isFirstStep = nextStep <= 1;
          const isLastStep = nextStep >= maxStep;
          if (prevBtn) {
            prevBtn.disabled = isFirstStep;
            prevBtn.hidden = isFirstStep;
            prevBtn.setAttribute("aria-hidden", isFirstStep ? "true" : "false");
          }
          if (nextBtn) {
            nextBtn.disabled = isLastStep;
            nextBtn.hidden = false;
            nextBtn.removeAttribute("hidden");
            nextBtn.setAttribute("aria-hidden", "false");
          }
          if (saveBtn) {
            saveBtn.disabled = !isLastStep;
            saveBtn.hidden = false;
            saveBtn.removeAttribute("hidden");
            saveBtn.setAttribute("aria-hidden", "false");
          }

          if (options.focusPanel) {
            focusCompanyContactStepPanel(nextStep);
          }
        };

        companyTypeMenu?.addEventListener("toggle", () => {
          if (!companyTypeToggle) return;
          companyTypeToggle.setAttribute("aria-expanded", companyTypeMenu.open ? "true" : "false");
        });

        companyTypePanel?.addEventListener("click", (evt) => {
          const btn = evt.target.closest("[data-company-type-option]");
          if (!btn) return;
          evt.preventDefault();
          const optionValue = btn.dataset.companyTypeOption;
          if (!optionValue) return;
          syncCompanyTypeMenuUi(optionValue, { updateSelect: true, closeMenu: true });
          companyTypeToggle?.focus();
        });

        if (companyTypeMenu) {
          document.addEventListener("click", (evt) => {
            if (!companyTypeMenu.open) return;
            if (companyTypeMenu.contains(evt.target)) return;
            companyTypeMenu.open = false;
            companyTypeToggle?.setAttribute("aria-expanded", "false");
          });
        }

        const stepperStepMax = stepPanels.length || stepTabs.length || 1;
        const focusStepTab = (stepNum, { activate = false } = {}) => {
          const resolvedStep = Math.min(Math.max(1, stepNum), stepperStepMax);
          const tab = stepTabs.find(
            (item) =>
              resolveCompanyContactStep(item.dataset.companyContactStep, 0) === resolvedStep
          );
          if (!tab) return;
          if (activate) {
            syncCompanyContactStepper(resolvedStep);
          }
          if (typeof tab.focus === "function") {
            try {
              tab.focus({ preventScroll: true });
            } catch {
              try {
                tab.focus();
              } catch {}
            }
          }
        };

        stepTabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const targetStep = resolveCompanyContactStep(tab.dataset.companyContactStep, 1);
            syncCompanyContactStepper(targetStep, { focusPanel: true });
          });
          tab.addEventListener("keydown", (evt) => {
            const currentStep = resolveCompanyContactStep(tab.dataset.companyContactStep, 1);
            if (evt.key === "ArrowRight" || evt.key === "ArrowDown") {
              evt.preventDefault();
              const targetStep = currentStep >= stepperStepMax ? 1 : currentStep + 1;
              focusStepTab(targetStep, { activate: true });
            } else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp") {
              evt.preventDefault();
              const targetStep = currentStep <= 1 ? stepperStepMax : currentStep - 1;
              focusStepTab(targetStep, { activate: true });
            } else if (evt.key === "Home") {
              evt.preventDefault();
              focusStepTab(1, { activate: true });
            } else if (evt.key === "End") {
              evt.preventDefault();
              focusStepTab(stepperStepMax, { activate: true });
            } else if (evt.key === " " || evt.key === "Enter") {
              evt.preventDefault();
              syncCompanyContactStepper(currentStep, { focusPanel: true });
            }
          });
        });

        prevBtn?.addEventListener("click", () => {
          syncCompanyContactStepper(companyContactStep - 1, { focusPanel: true });
        });
        nextBtn?.addEventListener("click", () => {
          syncCompanyContactStepper(companyContactStep + 1, { focusPanel: true });
        });

        phoneAddBtn?.addEventListener("click", () => {
          if (!phoneList) return;
          const count = phoneList.querySelectorAll(".company-phone-item").length;
          if (count >= MAX_COMPANY_PHONE_COUNT) return;
          const row = createPhoneItem("", count);
          phoneList.appendChild(row);
          reindexPhoneRows();
          refreshPhoneButtons();
          row.querySelector(".company-phone-input")?.focus();
        });

        phoneList?.addEventListener("click", (evt) => {
          const target = evt.target;
          if (!(target instanceof Element)) return;
          const targetBtn = target.closest(".company-phone-remove");
          if (!targetBtn || targetBtn.hidden) return;
          const row = targetBtn.closest(".company-phone-item");
          if (!row) return;
          row.remove();
          if (!phoneList.querySelector(".company-phone-item")) {
            phoneList.appendChild(createPhoneItem("", 0));
          }
          reindexPhoneRows();
          refreshPhoneButtons();
          phoneList.querySelector(".company-phone-input")?.focus();
        });

        if (phoneList) {
          reindexPhoneRows();
          refreshPhoneButtons();
        }

        pickLogoBtn?.addEventListener("click", async () => {
          const res = await window.electronAPI?.pickLogo?.();
          if (res?.dataUrl) {
            state().company.logo = res.dataUrl;
            state().company.logoPath = res.path || "";
            updateCompanyLogoImage(res.dataUrl);
            updateModalLogoPreview(res.dataUrl);
            persistCompanyProfile();
          }
        });

        deleteLogoBtn?.addEventListener("click", () => {
          state().company.logo = "";
          state().company.logoPath = "";
          updateCompanyLogoImage("");
          updateModalLogoPreview("");
          persistCompanyProfile();
        });

        const openSealFilePicker = () => {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.accept = "image/*,application/pdf";
          inp.onchange = async () => {
            const f = inp.files && inp.files[0];
            if (!f) return;
            let savedPath = "";
            if (f.path && window.electronAPI?.saveSealFile) {
              try {
                const res = await window.electronAPI.saveSealFile({ path: f.path, name: f.name });
                if (res?.ok && res.path) savedPath = res.path;
              } catch (err) {
                console.warn("saveSealFile failed", err);
              }
            }
            try {
              await SEM.loadSealFromFile?.(f, savedPath);
            } catch (err) {
              console.error("loadSealFromFile failed", err);
            }
          };
          inp.click();
        };

        pickSealBtn?.addEventListener("click", openSealFilePicker);
        rotateSealBtn?.addEventListener("click", (evt) => {
          const step = evt?.shiftKey ? -90 : 90;
          SEM.rotateSealImage?.(step);
        });
        deleteSealBtn?.addEventListener("click", () => {
          SEM.setSealImage?.("");
        });

        const openSignatureFilePicker = () => {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.accept = "image/*,application/pdf";
          inp.onchange = async () => {
            const f = inp.files && inp.files[0];
            if (!f) return;
            let savedPath = "";
            if (f.path && window.electronAPI?.saveSignatureFile) {
              try {
                const res = await window.electronAPI.saveSignatureFile({ path: f.path, name: f.name });
                if (res?.ok && res.path) savedPath = res.path;
              } catch (err) {
                console.warn("saveSignatureFile failed", err);
              }
            }
            try {
              await SEM.loadSignatureFromFile?.(f, savedPath);
            } catch (err) {
              console.error("loadSignatureFromFile failed", err);
            }
          };
          inp.click();
        };

        pickSignatureBtn?.addEventListener("click", openSignatureFilePicker);
        rotateSignatureBtn?.addEventListener("click", (evt) => {
          const step = evt?.shiftKey ? -90 : 90;
          SEM.rotateSignatureImage?.(step);
        });
        deleteSignatureBtn?.addEventListener("click", () => {
          SEM.setSignatureImage?.("");
        });

        const onKeyDown = (evt) => {
          if (evt.key === "Escape") {
            evt.preventDefault();
            closeModal();
          }
        };

        const openModal = () => {
          syncFromMain();
          syncCompanyContactStepper(1);
          restoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          overlay.hidden = false;
          overlay.removeAttribute("hidden");
          overlay.setAttribute("aria-hidden", "false");
          overlay.classList.add("is-open");
          document.body.classList.add("company-modal-open");
          modalFields.mfIdentifiant?.focus();
          document.addEventListener("keydown", onKeyDown);
        };

        const closeModal = () => {
          syncCompanyContactStepper(1);
          overlay.classList.remove("is-open");
          overlay.hidden = true;
          overlay.setAttribute("hidden", "");
          overlay.setAttribute("aria-hidden", "true");
          document.body.classList.remove("company-modal-open");
          document.removeEventListener("keydown", onKeyDown);
          if (restoreFocusEl && typeof restoreFocusEl.focus === "function") {
            try {
              restoreFocusEl.focus();
            } catch {}
          }
        };

        syncCompanyContactStepper(1);
        openBtn.addEventListener("click", openModal);
        closeBtn?.addEventListener("click", closeModal);
        cancelBtn?.addEventListener("click", closeModal);
        videoBtn?.addEventListener("click", async () => {
          const url = "https://www.facebook.com/reel/1502016851087523";
          if (window.electronAPI?.openExternal) {
            try {
              await window.electronAPI.openExternal(url);
              return;
            } catch {}
          }
          window.open(url, "_blank");
        });
        form.addEventListener("submit", (evt) => {
          evt.preventDefault();
          const maxStep = stepPanels.length || stepTabs.length || 1;
          if (companyContactStep < maxStep) {
            syncCompanyContactStepper(companyContactStep + 1, { focusPanel: true });
            return;
          }
          applyToMain();
          closeModal();
        });
      }

      function initCompanySmtpModal() {
        const overlay = getEl("companySmtpModal");
        const openBtn = getEl("btnCompanySmtpSettings");
        const form = getEl("companySmtpModalForm");
        const closeBtn = getEl("companySmtpModalClose");
        const cancelBtn = getEl("companySmtpModalCancel");
        const testBtn = getEl("companySmtpModalTest");
        const passToggle = getEl("companySmtpPassToggle");
        const presetSelect = getEl("companySmtpPresetSelect");
        const presetMenu = getEl("companySmtpPresetMenu");
        const presetPanel = getEl("companySmtpPresetPanel");
        const presetDisplay = getEl("companySmtpPresetDisplay");
        const passLabel = form?.querySelector?.('label[for="companySmtpPass"]') || null;
        const userLabel = form?.querySelector?.('label[for="companySmtpUser"]') || null;
        const fields = {
          enabled: getEl("companySmtpEnabled"),
          host: getEl("companySmtpHost"),
          port: getEl("companySmtpPort"),
          secure: getEl("companySmtpSecure"),
          user: getEl("companySmtpUser"),
          pass: getEl("companySmtpPass"),
          fromName: getEl("companySmtpFromName"),
          fromEmail: getEl("companySmtpFromEmail")
        };
        if (!overlay || !openBtn || !form) return false;

        const PRESET_PRO = "professional";
        const PRESET_GMAIL = "gmail";
        const GMAIL_HOST = "smtp.gmail.com";

        let restoreFocusEl = null;
        let testPending = false;
        let activePreset = PRESET_PRO;
        let smtpProfiles = null;

        const normalizeText = (value) => String(value ?? "").trim();
        const normalizeEmail = (value) => normalizeText(value).replace(/\s+/g, "");
        const normalizePort = (raw, isSecure) => {
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
          return isSecure ? 465 : 587;
        };
        const normalizePreset = (value) => (value === PRESET_GMAIL ? PRESET_GMAIL : PRESET_PRO);
        const buildSmtpFromFields = (preset = activePreset) => {
          const company = state().company || {};
          const secure = !!fields.secure?.checked;
          const user = normalizeText(fields.user?.value);
          const fromEmail = normalizeEmail(fields.fromEmail?.value || company.email || user);
          const smtp = {
            enabled: !!fields.enabled?.checked,
            host: normalizeText(fields.host?.value),
            secure,
            port: normalizePort(fields.port?.value, secure),
            user,
            pass: String(fields.pass?.value ?? ""),
            fromName: normalizeText(fields.fromName?.value || company.name || ""),
            fromEmail
          };
          if (preset === PRESET_GMAIL) {
            smtp.host = GMAIL_HOST;
            smtp.port = secure ? 465 : 587;
          }
          return smtp;
        };
        const isGmailHost = (value) => normalizeText(value).toLowerCase() === GMAIL_HOST;
        const getPresetValue = () => presetSelect?.value || PRESET_PRO;
        const resolvePresetLabel = (value) =>
          value === PRESET_GMAIL ? "Gmail" : "Email professionnel";
        const syncPresetUi = (value) => {
          if (presetDisplay) presetDisplay.textContent = resolvePresetLabel(value);
          if (presetPanel) {
            presetPanel.querySelectorAll("[data-value]").forEach((btn) => {
              const match = btn.dataset.value === value;
              btn.classList.toggle("is-active", match);
              btn.setAttribute("aria-selected", match ? "true" : "false");
            });
          }
          if (presetMenu && presetMenu.open) {
            presetMenu.open = false;
          }
          const toggle = presetMenu?.querySelector("summary");
          if (toggle) {
            toggle.setAttribute("aria-expanded", presetMenu?.open ? "true" : "false");
          }
        };
        const setPassLabelText = (isGmail) => {
          if (!passLabel) return;
          passLabel.textContent = isGmail ? "Gmail requires an App Password." : "Mot de passe";
        };
        const setUserLabelText = (isGmail) => {
          if (!userLabel) return;
          userLabel.textContent = isGmail ? "Gmail account" : "Utilisateur";
        };
        const ensureProfiles = () => {
          const company = state().company || (state().company = {});
          if (!smtpProfiles || typeof smtpProfiles !== "object") {
            smtpProfiles =
              company.smtpProfiles && typeof company.smtpProfiles === "object"
                ? { ...company.smtpProfiles }
                : {};
            if (!Object.keys(smtpProfiles).length) {
              const legacy = company.smtp && typeof company.smtp === "object" ? { ...company.smtp } : null;
              if (legacy) {
                smtpProfiles[PRESET_PRO] = { ...legacy };
              }
            }
          }
          company.smtpProfiles = smtpProfiles;
          if ("smtp" in company) delete company.smtp;
          return smtpProfiles;
        };
        const normalizeProfile = (profile = {}, base = {}) => {
          const company = state().company || {};
          const secure = !!(profile.secure ?? base.secure ?? false);
          const port = normalizePort(profile.port ?? base.port, secure);
          return {
            enabled: !!(profile.enabled ?? base.enabled ?? false),
            host: normalizeText(profile.host ?? base.host ?? ""),
            secure,
            port,
            user: normalizeText(profile.user ?? base.user ?? ""),
            pass: String(profile.pass ?? base.pass ?? ""),
            fromName: normalizeText(profile.fromName ?? base.fromName ?? company.name ?? ""),
            fromEmail: normalizeEmail(profile.fromEmail ?? base.fromEmail ?? company.email ?? "")
          };
        };
        const snapshotActiveProfile = () => {
          const profiles = ensureProfiles();
          profiles[activePreset] = buildSmtpFromFields(activePreset);
        };
        const applyProfileToFields = (preset) => {
          const profiles = ensureProfiles();
          const hasProfile = !!profiles[preset];
          const normalized = normalizeProfile(profiles[preset] || {}, {});
          if (preset === PRESET_GMAIL) {
            if (!hasProfile) {
              normalized.user = "";
              normalized.pass = "";
              normalized.fromName = "";
              normalized.fromEmail = "";
            }
            normalized.host = GMAIL_HOST;
            normalized.secure = !!normalized.secure;
            normalized.port = normalized.secure ? 465 : 587;
          }
          if (fields.enabled) fields.enabled.checked = !!normalized.enabled;
          if (fields.host) fields.host.value = normalized.host;
          if (fields.secure) fields.secure.checked = !!normalized.secure;
          if (fields.port) fields.port.value = String(normalized.port || "");
          if (fields.user) fields.user.value = normalized.user;
          if (fields.pass) fields.pass.value = normalized.pass;
          if (fields.fromName) fields.fromName.value = normalized.fromName;
          if (fields.fromEmail) fields.fromEmail.value = normalized.fromEmail;
          const isGmail = preset === PRESET_GMAIL;
          setPassLabelText(isGmail);
          setUserLabelText(isGmail);
        };
        const setActivePreset = (preset, { skipSnapshot = false } = {}) => {
          const nextPreset = normalizePreset(preset);
          if (!skipSnapshot && nextPreset !== activePreset) {
            snapshotActiveProfile();
          }
          activePreset = nextPreset;
          if (presetSelect) presetSelect.value = nextPreset;
          syncPresetUi(nextPreset);
          applyProfileToFields(nextPreset);
          updateSmtpEnabledState();
          const company = state().company || (state().company = {});
          company.smtpPreset = nextPreset;
        };
        const setPasswordVisibility = (visible) => {
          if (!fields.pass || !passToggle) return;
          fields.pass.type = visible ? "text" : "password";
          passToggle.classList.toggle("is-visible", visible);
          passToggle.setAttribute("aria-pressed", visible ? "true" : "false");
          passToggle.setAttribute(
            "aria-label",
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          );
        };
        const updateSmtpEnabledState = () => {
          const enabled = !!fields.enabled?.checked;
          const targets = [
            presetSelect,
            fields.host,
            fields.port,
            fields.secure,
            fields.user,
            fields.pass,
            fields.fromName,
            fields.fromEmail
          ];
          targets.forEach((field) => {
            if (field) field.disabled = !enabled;
          });
          if (passToggle) passToggle.disabled = !enabled;
          if (testBtn) testBtn.disabled = !enabled;
          if (!enabled) {
            setPasswordVisibility(false);
          }
        };
        const setFormTestingState = (isTesting) => {
          if (!form) return;
          const controls = form.querySelectorAll("input, select, textarea, button");
          controls.forEach((control) => {
            if (isTesting) {
              control.dataset.smtpWasDisabled = control.disabled ? "true" : "false";
              control.disabled = true;
            } else if (control.dataset.smtpWasDisabled) {
              control.disabled = control.dataset.smtpWasDisabled === "true";
              delete control.dataset.smtpWasDisabled;
            }
          });
          if (isTesting) {
            form.setAttribute("aria-disabled", "true");
          } else {
            form.removeAttribute("aria-disabled");
          }
        };
        const requestTestRecipient = async (fallback) => {
          const normalizedFallback = normalizeEmail(fallback || "");
          if (typeof w.showConfirm === "function") {
            let value = normalizedFallback;
            const confirmed = await w.showConfirm("Adresse e-mail de test :", {
              title: "SMTP",
              okText: "Envoyer",
              cancelText: "Annuler",
              renderMessage: (container) => {
                if (!container) return;
                const doc = container.ownerDocument || document;
                container.textContent = "";
                const label = doc.createElement("label");
                label.className = "label-text";
                label.textContent = "Adresse e-mail de test";
                const input = doc.createElement("input");
                input.type = "email";
                input.autocomplete = "off";
                input.value = normalizedFallback;
                input.id = "smtpTestRecipient";
                label.setAttribute("for", input.id);
                container.append(label, input);

                const okBtn = doc.getElementById("swbDialogOk");
                const syncOk = () => {
                  value = normalizeEmail(input.value);
                  const hasValue = !!value;
                  if (okBtn) {
                    okBtn.disabled = !hasValue;
                    okBtn.setAttribute("aria-disabled", hasValue ? "false" : "true");
                  }
                };
                input.addEventListener("input", syncOk);
                syncOk();
                try {
                  input.focus();
                  input.select();
                } catch {}
              }
            });
            return confirmed ? value : "";
          }
          if (typeof w.prompt === "function") {
            const value = w.prompt("Adresse e-mail de test :", normalizedFallback);
            if (value == null) return "";
            return normalizeEmail(value);
          }
          return normalizedFallback;
        };

        const syncFromState = () => {
          ensureProfiles();
          const company = state().company || {};
          const desiredPreset = normalizePreset(company.smtpPreset || PRESET_PRO);
          activePreset = desiredPreset;
          setActivePreset(desiredPreset, { skipSnapshot: true });
          updateSmtpEnabledState();
        };

        const applyToState = () => {
          const company = state().company || (state().company = {});
          const profiles = ensureProfiles();
          profiles[activePreset] = buildSmtpFromFields(activePreset);
          company.smtpProfiles = profiles;
          company.smtpPreset = activePreset;
          persistSmtpSettings({ preset: activePreset, settings: profiles[activePreset] });
        };

        const handleSmtpTest = async () => {
          if (testPending) return;
          if (typeof w.electronAPI?.sendSmtpEmail !== "function") {
            await w.showDialog?.("Envoi SMTP indisponible.", { title: "SMTP" });
            return;
          }
          const smtp = buildSmtpFromFields();
          if (!smtp.host || !smtp.port || !smtp.fromEmail) {
            await w.showDialog?.(
              "Veuillez renseigner le serveur SMTP, le port et l'adresse expediteur.",
              { title: "SMTP" }
            );
            return;
          }
          const to = await requestTestRecipient(smtp.fromEmail || smtp.user || "");
          if (!to) return;
          testPending = true;
          if (testBtn) testBtn.disabled = true;
          setFormTestingState(true);
          try {
            const subject = "Test SMTP";
            const text = "Ceci est un e-mail de test envoye depuis Facturance.";
            const res = await w.electronAPI.sendSmtpEmail({
              smtp,
              message: { to, subject, text }
            });
            if (res?.ok) {
              if (typeof w.showToast === "function") {
                w.showToast("Test SMTP reussi.");
              } else {
                await w.showDialog?.("Test SMTP reussi.", { title: "SMTP" });
              }
            } else {
              await w.showDialog?.(res?.error || "Test SMTP impossible.", { title: "SMTP" });
            }
          } catch (err) {
            await w.showDialog?.(String(err?.message || err || "Test SMTP impossible."), {
              title: "SMTP"
            });
          } finally {
            testPending = false;
            if (testBtn) testBtn.disabled = false;
            setFormTestingState(false);
          }
        };

        fields.secure?.addEventListener("change", () => {
          if (!fields.port) return;
          if (activePreset === PRESET_GMAIL || isGmailHost(fields.host?.value || "")) {
            fields.port.value = fields.secure.checked ? "465" : "587";
            return;
          }
          if (String(fields.port.value || "").trim()) return;
          fields.port.value = fields.secure.checked ? "465" : "587";
        });
        fields.enabled?.addEventListener("change", updateSmtpEnabledState);
        fields.host?.addEventListener("change", () => {
          if (isGmailHost(fields.host?.value || "")) {
            if (activePreset !== PRESET_GMAIL) setActivePreset(PRESET_GMAIL);
          } else {
            if (activePreset !== PRESET_PRO) setActivePreset(PRESET_PRO);
          }
        });
        presetPanel?.addEventListener("click", (evt) => {
          const option = evt.target.closest("[data-value]");
          if (!option || !presetSelect) return;
          const value = option.dataset.value || PRESET_PRO;
          presetSelect.value = value;
          syncPresetUi(value);
          presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });
        if (presetMenu) {
          const presetSummary = presetMenu.querySelector("summary");
          if (presetSummary && presetMenu.dataset.wired !== "1") {
            presetMenu.dataset.wired = "1";
            presetSummary.setAttribute("aria-expanded", "false");
            presetMenu.addEventListener("toggle", () => {
              presetSummary.setAttribute("aria-expanded", presetMenu.open ? "true" : "false");
              if (presetMenu.open) {
                const firstOption = presetPanel?.querySelector("[data-value]:not([disabled])");
                firstOption?.focus();
              } else {
                presetSummary.focus();
              }
            });
            presetPanel?.addEventListener("keydown", (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                presetMenu.removeAttribute("open");
                presetSummary.setAttribute("aria-expanded", "false");
              }
            });
            document.addEventListener("click", (event) => {
              if (!presetMenu.open) return;
              if (presetMenu.contains(event.target)) return;
              presetMenu.removeAttribute("open");
              presetSummary.setAttribute("aria-expanded", "false");
            });
          }
        }
        presetSelect?.addEventListener("change", () => {
          const preset = getPresetValue();
          setActivePreset(preset);
        });

        const onKeyDown = (evt) => {
          if (evt.key === "Escape") {
            evt.preventDefault();
            closeModal();
          }
        };

        const openModal = () => {
          try {
            syncFromState();
          } catch (err) {
            console.warn("smtp modal sync failed", err);
          }
          setPasswordVisibility(false);
          restoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          overlay.hidden = false;
          overlay.removeAttribute("hidden");
          overlay.setAttribute("aria-hidden", "false");
          overlay.classList.add("is-open");
          fields.host?.focus();
          document.addEventListener("keydown", onKeyDown);
        };

        const closeModal = () => {
          overlay.classList.remove("is-open");
          overlay.hidden = true;
          overlay.setAttribute("hidden", "");
          overlay.setAttribute("aria-hidden", "true");
          document.removeEventListener("keydown", onKeyDown);
          if (restoreFocusEl && typeof restoreFocusEl.focus === "function") {
            try {
              restoreFocusEl.focus();
            } catch {}
          }
        };

        openBtn.addEventListener("click", openModal);
        closeBtn?.addEventListener("click", closeModal);
        cancelBtn?.addEventListener("click", closeModal);
        testBtn?.addEventListener("click", handleSmtpTest);
        passToggle?.addEventListener("click", () => {
          const isVisible = fields.pass?.type === "text";
          setPasswordVisibility(!isVisible);
          fields.pass?.focus();
        });
        form.addEventListener("submit", (evt) => {
          evt.preventDefault();
          applyToState();
          closeModal();
        });
        return true;
      }

      function initCompanyLanServerModal() {
        const overlay = getEl("companyLanServerModal");
        const openBtn = getEl("btnCompanyLanServerSettings");
        const form = getEl("companyLanServerModalForm");
        const closeBtn = getEl("companyLanServerModalClose");
        const cancelBtn = getEl("companyLanServerModalCancel");
        const copyBtn = getEl("companyLanServerCopyUrl");
        const statusEl = getEl("companyLanServerStatus");
        const aliasEl = getEl("companyLanServerAlias");
        const redirectStatusEl = getEl("companyLanServerRedirectStatus");
        const urlList = getEl("companyLanServerUrlList");
        const fields = {
          enabled: getEl("companyLanServerEnabled"),
          redirectHttp80: getEl("companyLanServerRedirectHttp80"),
          port: getEl("companyLanServerPort")
        };
        if (!overlay || !openBtn || !form) return;

        const DEFAULT_LAN_PORT = 8080;
        let restoreFocusEl = null;
        let lastUrls = [];

        const normalizePort = (raw) => {
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
            return Math.trunc(parsed);
          }
          return DEFAULT_LAN_PORT;
        };

        const renderUrlList = (urls = []) => {
          if (!urlList) return;
          urlList.textContent = "";
          if (!urls.length) {
            const empty = document.createElement("div");
            empty.className = "server-modal__url-empty";
            empty.textContent = "Serveur inactif.";
            urlList.appendChild(empty);
            return;
          }
          urls.forEach((url) => {
            const row = document.createElement("div");
            row.className = "server-modal__url";
            const text = document.createElement("span");
            text.className = "server-modal__url-text";
            text.textContent = url;
            row.appendChild(text);
            urlList.appendChild(row);
          });
        };

        const updateStatus = (status = {}) => {
          const running = !!status.running;
          const urls = Array.isArray(status.urls) ? status.urls : [];
          const warnings = Array.isArray(status.warnings) ? status.warnings.filter(Boolean) : [];
          const mdnsHost = String(status?.mdns?.host || "facturance.local").trim() || "facturance.local";
          const redirectState =
            status?.redirectHttp80 && typeof status.redirectHttp80 === "object"
              ? status.redirectHttp80
              : {};
          lastUrls = urls;
          renderUrlList(urls);
          if (statusEl) {
            if (status.ok === false) {
              statusEl.textContent = status.error || "Serveur LAN indisponible.";
            } else if (running) {
              const suffix = warnings.length ? ` ${warnings.join(" ")}` : "";
              statusEl.textContent = `Serveur actif (port ${status.port || normalizePort(fields.port?.value)}).${suffix}`;
            } else {
              statusEl.textContent = warnings.length ? warnings.join(" ") : "Serveur inactif.";
            }
          }
          if (aliasEl) {
            if (status?.mdns?.error) {
              aliasEl.textContent = `Alias mDNS: ${mdnsHost} (${status.mdns.error})`;
            } else {
              aliasEl.textContent = `Alias mDNS: ${mdnsHost}`;
            }
          }
          if (redirectStatusEl) {
            if (redirectState.enabled && redirectState.running) {
              redirectStatusEl.textContent = "Redirection HTTP active sur le port 80.";
            } else if (redirectState.enabled && redirectState.error) {
              redirectStatusEl.textContent = `Redirection HTTP: ${redirectState.error}`;
            } else if (redirectState.enabled) {
              redirectStatusEl.textContent = "Redirection HTTP demandee.";
            } else {
              redirectStatusEl.textContent = "Redirection HTTP inactive.";
            }
          }
          if (copyBtn) copyBtn.disabled = urls.length === 0;
        };

        const refreshStatus = async () => {
          if (typeof w.electronAPI?.lanServerStatus !== "function") {
            updateStatus({ ok: false, error: "Serveur LAN disponible uniquement sur PC principal." });
            return;
          }
          try {
            const status = await w.electronAPI.lanServerStatus();
            if (status?.running && fields.port && status.port) {
              fields.port.value = String(status.port);
            }
            if (fields.redirectHttp80 && status?.redirectHttp80) {
              fields.redirectHttp80.checked = status.redirectHttp80.enabled === true;
            }
            updateStatus(status || {});
          } catch (err) {
            updateStatus({ ok: false, error: String(err?.message || err || "Statut indisponible.") });
          }
        };

        const syncFromState = () => {
          const company = state().company || {};
          const config = company.lanServer && typeof company.lanServer === "object" ? company.lanServer : {};
          if (fields.enabled) fields.enabled.checked = !!config.enabled;
          if (fields.redirectHttp80) fields.redirectHttp80.checked = config.redirectHttp80 === true;
          if (fields.port) {
            const port = normalizePort(config.port);
            fields.port.value = String(port);
          }
        };

        const applyToState = async () => {
          const enabled = !!fields.enabled?.checked;
          const redirectHttp80 = !!fields.redirectHttp80?.checked;
          const port = normalizePort(fields.port?.value);
          const company = state().company || (state().company = {});
          company.lanServer = { ...(company.lanServer || {}), enabled, redirectHttp80, port };
          persistCompanyProfile();

          if (typeof w.electronAPI?.lanServerStart !== "function") {
            updateStatus({ ok: false, error: "Serveur LAN indisponible." });
            return;
          }

          let result = null;
          if (enabled) {
            result = await w.electronAPI.lanServerStart({ port, redirectHttp80 });
          } else if (typeof w.electronAPI?.lanServerStop === "function") {
            result = await w.electronAPI.lanServerStop();
          }

          if (result?.ok === false) {
            await w.showDialog?.(result.error || "Impossible de demarrer le serveur.", { title: "Serveur LAN" });
          }
          updateStatus(result || {});
        };

        const copyFirstUrl = async () => {
          const candidates = Array.isArray(lastUrls) ? lastUrls.filter(Boolean) : [];
          const url =
            candidates.find((entry) => /\.local(?::|\/|$)/i.test(entry)) ||
            candidates.find((entry) => !/^http:\/\/localhost(?::|\/|$)/i.test(entry)) ||
            candidates[0];
          if (!url) return;
          const baseLabel = copyBtn?.dataset.baseLabel || copyBtn?.textContent || "Copier URL";
          const setCopyLabel = (label) => {
            if (!copyBtn) return;
            if (!copyBtn.dataset.baseLabel) copyBtn.dataset.baseLabel = baseLabel;
            copyBtn.textContent = label;
          };
          try {
            if (navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(url);
            } else {
              const area = document.createElement("textarea");
              area.value = url;
              area.setAttribute("readonly", "");
              area.style.position = "absolute";
              area.style.left = "-9999px";
              document.body.appendChild(area);
              area.select();
              document.execCommand("copy");
              area.remove();
            }
            setCopyLabel("Copiee");
            setTimeout(() => setCopyLabel(baseLabel), 1500);
          } catch (err) {
            await w.showDialog?.(String(err?.message || err || "Copie impossible."), { title: "Serveur LAN" });
          }
        };

        const onKeyDown = (evt) => {
          if (evt.key === "Escape") {
            evt.preventDefault();
            closeModal();
          }
        };

        const openModal = () => {
          syncFromState();
          restoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          overlay.hidden = false;
          overlay.removeAttribute("hidden");
          overlay.setAttribute("aria-hidden", "false");
          overlay.classList.add("is-open");
          fields.port?.focus();
          refreshStatus();
          document.addEventListener("keydown", onKeyDown);
        };

        const closeModal = () => {
          overlay.classList.remove("is-open");
          overlay.hidden = true;
          overlay.setAttribute("hidden", "");
          overlay.setAttribute("aria-hidden", "true");
          document.removeEventListener("keydown", onKeyDown);
          if (restoreFocusEl && typeof restoreFocusEl.focus === "function") {
            try {
              restoreFocusEl.focus();
            } catch {}
          }
        };

        openBtn.addEventListener("click", openModal);
        closeBtn?.addEventListener("click", closeModal);
        cancelBtn?.addEventListener("click", closeModal);
        copyBtn?.addEventListener("click", copyFirstUrl);
        form.addEventListener("submit", async (evt) => {
          evt.preventDefault();
          await applyToState();
          await refreshStatus();
          closeModal();
        });

        if (!SEM._lanServerAutoStarted) {
          SEM._lanServerAutoStarted = true;
          const config = state().company?.lanServer;
          if (config?.enabled && typeof w.electronAPI?.lanServerStart === "function") {
            w.electronAPI
              .lanServerStart({
                port: normalizePort(config.port),
                redirectHttp80: config.redirectHttp80 === true
              })
              .then((status) => updateStatus(status || {}))
              .catch(() => {});
          }
        }
      }
  });
})(window);
