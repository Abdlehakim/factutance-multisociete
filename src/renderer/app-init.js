(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const AppInit = (w.AppInit = w.AppInit || {});
  const COMPANY_HISTORY_DOC_TYPES = [
    "facture",
    "fa",
    "devis",
    "bl",
    "bc",
    "avoir",
    "be",
    "bs",
    "retenue"
  ];
  const COMPANY_SWITCH_MIN_OVERLAY_MS = 5000;
  const COMPANY_SWITCH_OVERLAY_UNTIL_KEY = "companySwitchOverlayUntil";
  const COMPANY_SWITCH_OVERLAY_NAME_KEY = "companySwitchOverlayName";
  let initialized = false;
  let appReadyNotified = false;
  let companySwitchInProgress = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function resolveBootOverlay() {
    if (typeof document === "undefined") return null;
    return document.getElementById("bootOverlay") || document.getElementById("app-loader");
  }

  function setBootOverlayLabel(value) {
    const overlay = resolveBootOverlay();
    if (!overlay) return;
    const textEl = overlay.querySelector(".app-loader__text");
    if (!textEl) return;
    const label = String(value || "").trim();
    if (label) textEl.textContent = label;
  }

  function showBootOverlay(label) {
    const body = document.body;
    if (body) body.classList.remove("app-loaded");
    if (label) setBootOverlayLabel(label);
    const overlay = resolveBootOverlay();
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideBootOverlay() {
    const body = document.body;
    if (body) body.classList.add("app-loaded");
    const overlay = resolveBootOverlay();
    if (!overlay) return;
    overlay.setAttribute("aria-hidden", "true");
  }

  function notifyAppReadyOnce() {
    if (appReadyNotified) return;
    appReadyNotified = true;
    try {
      w.electronAPI?.notifyAppReady?.();
    } catch {
      // ignore bridge issues
    }
  }

  function resolveCompanySwitchOverlay() {
    if (typeof document === "undefined") return null;
    return document.getElementById("companySwitchOverlay");
  }

  function setCompanySwitchOverlayLabel(value) {
    const overlay = resolveCompanySwitchOverlay();
    if (!overlay) return;
    const textEl = overlay.querySelector(".company-switch-overlay__text");
    if (!textEl) return;
    const label = String(value || "").trim();
    if (!label) return;
    textEl.textContent = label;
  }

  function persistCompanySwitchOverlayState(untilTimestamp, displayName = "") {
    try {
      sessionStorage.setItem(COMPANY_SWITCH_OVERLAY_UNTIL_KEY, String(untilTimestamp));
      if (displayName) sessionStorage.setItem(COMPANY_SWITCH_OVERLAY_NAME_KEY, displayName);
      else sessionStorage.removeItem(COMPANY_SWITCH_OVERLAY_NAME_KEY);
    } catch {
      // ignore storage access errors
    }
  }

  function clearCompanySwitchOverlayState() {
    try {
      sessionStorage.removeItem(COMPANY_SWITCH_OVERLAY_UNTIL_KEY);
      sessionStorage.removeItem(COMPANY_SWITCH_OVERLAY_NAME_KEY);
    } catch {
      // ignore storage access errors
    }
  }

  function showCompanySwitchOverlay(displayName = "") {
    const body = document.body;
    if (body) body.classList.add("company-switch-loading");
    const overlay = resolveCompanySwitchOverlay();
    const label = String(displayName || "").trim();
    if (label) {
      setCompanySwitchOverlayLabel(`Chargement de ${label}...`);
    } else {
      setCompanySwitchOverlayLabel("Chargement de la societe...");
    }
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-visible");
  }

  function hideCompanySwitchOverlay() {
    const body = document.body;
    if (body) body.classList.remove("company-switch-loading");
    const overlay = resolveCompanySwitchOverlay();
    if (!overlay) return;
    overlay.classList.remove("is-visible");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function beginCompanySwitchLoading(payload = {}) {
    companySwitchInProgress = true;
    const now = Date.now();
    const label = String(payload?.label || "").trim();
    persistCompanySwitchOverlayState(now + COMPANY_SWITCH_MIN_OVERLAY_MS, label);
    showCompanySwitchOverlay(label);
    return now;
  }

  async function endCompanySwitchLoading(startedAt = Date.now(), options = {}) {
    if (!companySwitchInProgress) return;
    if (options?.keepVisible === true) {
      companySwitchInProgress = false;
      return;
    }
    const elapsed = Date.now() - Number(startedAt || Date.now());
    const remaining = COMPANY_SWITCH_MIN_OVERLAY_MS - elapsed;
    if (remaining > 0) await sleep(remaining);
    hideCompanySwitchOverlay();
    clearCompanySwitchOverlayState();
    companySwitchInProgress = false;
  }

  function normalizeCompanyId(raw) {
    if (typeof raw === "string") return raw.trim();
    if (!raw || typeof raw !== "object") return "";
    const fromId = String(raw.id || "").trim();
    if (fromId) return fromId;
    return String(raw.folder || "").trim();
  }

  function normalizeCompanyName(raw, fallback = "") {
    const normalized = String(raw ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return normalized || fallback || "";
  }

  function parseCompaniesList(raw) {
    const source = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.companies)
        ? raw.companies
        : [];
    const seen = new Set();
    const out = [];
    source.forEach((item) => {
      const id = normalizeCompanyId(item);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const nameCandidate =
        item && typeof item === "object"
          ? item.name ?? item.displayName ?? item.companyName
          : "";
      const name = normalizeCompanyName(nameCandidate, id);
      out.push({ id, name });
    });
    out.sort((a, b) => {
      const an = Number(String(a.id).replace(/[^\d]/g, "")) || 0;
      const bn = Number(String(b.id).replace(/[^\d]/g, "")) || 0;
      if (an !== bn) return an - bn;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    return out;
  }

  function resolveCompaniesApi() {
    const nested = w.facturance?.companies;
    if (nested && typeof nested === "object") return nested;
    if (w.electronAPI && typeof w.electronAPI === "object") return w.electronAPI;
    return null;
  }

  async function readActiveCompanyId(api) {
    if (!api) return "";
    if (typeof api.getActiveCompanyId === "function") {
      const res = await api.getActiveCompanyId();
      if (typeof res === "string") return res.trim();
      if (res && typeof res === "object") {
        const direct = String(res.activeCompanyId || "").trim();
        if (direct) return direct;
      }
      return "";
    }
    if (typeof api.getActiveCompanyPaths === "function") {
      const res = await api.getActiveCompanyPaths();
      return String(res?.activeCompanyId || res?.activeCompany?.id || "").trim();
    }
    return "";
  }

  function getDefaultCompanyTemplate() {
    const source =
      (w.DEFAULTS && typeof w.DEFAULTS.company === "object" && w.DEFAULTS.company) ||
      (w.DEFAULT_COMPANY_TEMPLATE && typeof w.DEFAULT_COMPANY_TEMPLATE === "object"
        ? w.DEFAULT_COMPANY_TEMPLATE
        : null) ||
      (w.DEFAULT_COMPANY && typeof w.DEFAULT_COMPANY === "object" ? w.DEFAULT_COMPANY : null) ||
      {};
    try {
      return JSON.parse(JSON.stringify(source));
    } catch {
      return { ...source };
    }
  }

  function applySwitchSnapshotToCompanyState(snapshot = {}) {
    const state = SEM.state || (SEM.state = {});
    const baseCompany = getDefaultCompanyTemplate();
    const nextCompany =
      snapshot?.company && typeof snapshot.company === "object" ? snapshot.company : {};
    state.company = { ...baseCompany, ...nextCompany };
    const smtpProfiles =
      snapshot?.smtpProfiles && typeof snapshot.smtpProfiles === "object"
        ? snapshot.smtpProfiles
        : null;
    if (smtpProfiles) {
      state.company.smtpProfiles = { ...(state.company.smtpProfiles || {}), ...smtpProfiles };
      if (!state.company.smtpPreset) {
        state.company.smtpPreset = state.company.smtpProfiles.professional ? "professional" : "gmail";
      }
    }
  }

  async function rebuildDocumentHistoryFromStorage(options = {}) {
    const isStale = typeof options?.isStale === "function" ? options.isStale : () => false;
    if (typeof w.clearDocumentHistory === "function") {
      COMPANY_HISTORY_DOC_TYPES.forEach((docType) => {
        try {
          w.clearDocumentHistory(docType);
        } catch (err) {
          console.warn("clearDocumentHistory failed", docType, err);
        }
      });
    }
    if (
      !w.electronAPI ||
      typeof w.electronAPI.listInvoiceFiles !== "function" ||
      typeof w.addDocumentHistory !== "function"
    ) {
      return;
    }

    for (const docType of COMPANY_HISTORY_DOC_TYPES) {
      if (isStale()) return;
      try {
        const res = await w.electronAPI.listInvoiceFiles({ docType });
        if (isStale()) return;
        if (!res?.ok) continue;
        const items = Array.isArray(res.items) ? res.items : [];
        items.forEach((entry) => {
          const pathValue = String(entry?.path || entry?.docPath || "").trim();
          if (!pathValue) return;
          w.addDocumentHistory({
            id: entry?.id,
            docType,
            path: pathValue,
            number: entry?.number || entry?.name || "",
            date: entry?.date || "",
            name: entry?.label || entry?.name || "",
            savedAt: entry?.modifiedAt || entry?.createdAt || new Date().toISOString(),
            createdAt: entry?.createdAt || entry?.modifiedAt || "",
            status: entry?.status || entry?.historyStatus || "",
            historyStatus: entry?.historyStatus || entry?.status || "",
            clientName: entry?.clientName || entry?.client?.name || "",
            clientAccount:
              entry?.clientAccount || entry?.client?.account || entry?.client?.accountOf || "",
            totalHT: entry?.totalHT,
            totalTTC: entry?.totalTTC,
            stampTT: entry?.stampTT,
            totalTTCExclStamp: entry?.totalTTCExclStamp,
            currency: entry?.currency,
            paymentMethod: entry?.paymentMethod || entry?.mode || "",
            paymentDate: entry?.paymentDate || "",
            paymentRef: entry?.paymentReference || entry?.paymentRef || "",
            paid: entry?.paid,
            balanceDue: entry?.balanceDue,
            acompteEnabled: entry?.acompteEnabled,
            reglementEnabled: entry?.reglementEnabled,
            reglementText: entry?.reglementText,
            note_interne: entry?.noteInterne || entry?.note_interne || "",
            has_comment: entry?.hasComment ?? entry?.has_comment,
            convertedFrom: entry?.convertedFrom,
            pdfPath: entry?.pdfPath || "",
            pdfExportedAt: entry?.pdfExportedAt || ""
          });
        });
      } catch (err) {
        console.warn("document history rebuild failed", docType, err);
      } finally {
        if (isStale()) return;
        if (typeof w.recomputeDocumentNumbering === "function") {
          try {
            w.recomputeDocumentNumbering(docType);
          } catch (err) {
            console.warn("recomputeDocumentNumbering failed", docType, err);
          }
        }
      }
    }
  }

  async function rehydrateCompanyRuntimeState(switchResult = {}, options = {}) {
    const isStale = typeof options?.isStale === "function" ? options.isStale : () => false;
    if (isStale()) return;
    if (typeof w.invalidatePdfPreviewCache === "function") {
      try {
        w.invalidatePdfPreviewCache({ closeModal: true });
      } catch (err) {
        console.warn("invalidatePdfPreviewCache failed", err);
      }
    }

    try {
      const activeHistoryPath = String(SEM?.state?.meta?.historyPath || "").trim();
      if (activeHistoryPath && typeof w.releaseDocumentEditLock === "function") {
        await w.releaseDocumentEditLock(activeHistoryPath);
      }
    } catch (err) {
      console.warn("releaseDocumentEditLock failed during company switch", err);
    }

    if (typeof SEM.newInvoice === "function") {
      SEM.newInvoice();
    }
    if (isStale()) return;

    if (typeof w.resetPaymentHistoryCache === "function") {
      try {
        w.resetPaymentHistoryCache();
      } catch (err) {
        console.warn("resetPaymentHistoryCache failed", err);
      }
    }

    const snapshot =
      switchResult?.snapshot && typeof switchResult.snapshot === "object"
        ? switchResult.snapshot
        : {};
    applySwitchSnapshotToCompanyState(snapshot);
    if (isStale()) return;

    const jobs = [];
    if (typeof SEM.loadCompanyFromLocal === "function") {
      jobs.push(
        Promise.resolve(SEM.loadCompanyFromLocal()).catch((err) => {
          console.warn("loadCompanyFromLocal failed during company switch", err);
        })
      );
    }
    if (typeof SEM.refreshModelSelect === "function") {
      jobs.push(
        Promise.resolve(SEM.refreshModelSelect(undefined, { force: true })).catch((err) => {
          console.warn("refreshModelSelect failed during company switch", err);
        })
      );
    }
    jobs.push(
      Promise.resolve(rebuildDocumentHistoryFromStorage({ isStale })).catch((err) => {
        console.warn("document history rebuild failed during company switch", err);
      })
    );
    await Promise.all(jobs);
    if (isStale()) return;

    if (typeof w.hydratePaymentHistory === "function") {
      try {
        await w.hydratePaymentHistory();
      } catch (err) {
        console.warn("hydratePaymentHistory failed during company switch", err);
      }
    }
    if (isStale()) return;

    const runtime = AppInit.__runtime && typeof AppInit.__runtime === "object" ? AppInit.__runtime : {};
    const historyApi = runtime.history || {};
    const selectedType =
      (typeof historyApi.getSelectedType === "function" && historyApi.getSelectedType()) ||
      String(getEl("docType")?.value || "facture");

    SEM.bind?.();
    SEM.setSubmitMode?.("add");
    SEM.renderItems?.();
    SEM.computeTotals?.();
    SEM.applyColumnHiding?.();

    if (typeof historyApi.renderHistoryList === "function") {
      historyApi.renderHistoryList(selectedType);
    }
    if (runtime.numbering && typeof runtime.numbering.syncInvoiceNumberControls === "function") {
      runtime.numbering.syncInvoiceNumberControls({
        force: true,
        useNextIfEmpty: true,
        overrideWithNext: true
      });
    }
  }

  async function initCompanySwitcher() {
    const sel = document.getElementById("companySwitchSelect");
    const menu = document.getElementById("companySwitchSelectMenu");
    const panel = document.getElementById("companySwitchSelectPanel");
    const display = document.getElementById("companySwitchSelectDisplay");
    const trigger = menu?.querySelector?.(".field-toggle-trigger");
    if (!sel) return;

    function setDisplayText(value) {
      if (!display) return;
      const text = String(value || "").trim();
      display.textContent = text || "Selectionner une societe";
    }

    function syncPanelSelection(value) {
      if (!panel) return;
      const active = String(value || "").trim();
      panel.querySelectorAll(".model-select-option[data-value]").forEach((btn) => {
        const isActive = btn.getAttribute("data-value") === active;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function chooseCompany(value, emitChange = false) {
      const id = String(value || "").trim();
      if (!id) return;
      if (sel.value !== id) sel.value = id;
      const selectedOption = Array.from(sel.options || []).find((option) => option.value === id);
      const label = normalizeCompanyName(selectedOption?.textContent, id);
      setDisplayText(label);
      syncPanelSelection(id);
      if (emitChange) {
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function setSwitcherDisabled(disabled) {
      sel.disabled = !!disabled;
      if (!trigger) return;
      if (disabled) trigger.setAttribute("aria-disabled", "true");
      else trigger.removeAttribute("aria-disabled");
    }

    function hasCompanyOption(id) {
      const targetId = String(id || "").trim();
      if (!targetId) return false;
      return Array.from(sel.options || []).some((option) => option.value === targetId);
    }

    function renderCompanyOptions(companies = []) {
      sel.innerHTML = "";
      if (panel) panel.innerHTML = "";
      companies.forEach((company) => {
        const opt = document.createElement("option");
        opt.value = company.id;
        opt.textContent = company.name || company.id;
        sel.appendChild(opt);

        if (panel) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-select-option";
          btn.setAttribute("role", "option");
          btn.setAttribute("data-value", company.id);
          btn.setAttribute("aria-selected", "false");
          btn.textContent = company.name || company.id;
          btn.addEventListener("click", () => {
            chooseCompany(company.id, true);
            menu?.removeAttribute("open");
          });
          panel.appendChild(btn);
        }
      });
    }

    if (menu && trigger) {
      menu.addEventListener("toggle", () => {
        trigger.setAttribute("aria-expanded", menu.open ? "true" : "false");
      });

      const closeMenu = () => {
        if (!menu.open) return;
        menu.open = false;
        trigger.setAttribute("aria-expanded", "false");
      };

      document.addEventListener("click", (event) => {
        if (!menu.open) return;
        if (menu.contains(event.target)) return;
        closeMenu();
      });

      menu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!menu.open) return;
        event.preventDefault();
        closeMenu();
        trigger.focus();
      });
    }

    const api = resolveCompaniesApi();
    if (
      !api ||
      typeof api.listCompanies !== "function" ||
      (typeof api.switchCompany !== "function" && typeof api.setActiveCompany !== "function")
    ) {
      menu?.setAttribute("hidden", "");
      sel.hidden = true;
      return;
    }

    const getSwitchFn = () =>
      typeof api.switchCompany === "function"
        ? api.switchCompany.bind(api)
        : (typeof api.setActiveCompany === "function" ? api.setActiveCompany.bind(api) : null);

    let currentCompanyId = "";
    let switching = false;
    let switchEpoch = 0;
    let pendingExternalPayload = null;
    let pendingCatalogRefresh = false;
    let catalogRefreshPromise = null;

    async function refreshCompaniesList(preferredId = "") {
      const rawList = await api.listCompanies();
      const companies = parseCompaniesList(rawList);
      renderCompanyOptions(companies);
      if (!companies.length) {
        setSwitcherDisabled(true);
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-";
        sel.appendChild(opt);
        setDisplayText("-");
        if (panel) {
          const empty = document.createElement("div");
          empty.className = "model-select-empty";
          empty.textContent = "Aucune societe";
          panel.appendChild(empty);
        }
        return companies;
      }
      setSwitcherDisabled(false);
      const candidate =
        (preferredId && companies.some((company) => company.id === preferredId) && preferredId) ||
        (currentCompanyId && companies.some((company) => company.id === currentCompanyId) && currentCompanyId) ||
        companies[0].id;
      chooseCompany(candidate);
      return companies;
    }

    async function runCompanySwitch(nextId, { source = "ui", label = "" } = {}) {
      if (switching) return;
      const targetId = String(nextId || "").trim();
      if (!targetId) return;
      if (targetId === currentCompanyId) {
        chooseCompany(currentCompanyId);
        return;
      }

      const previousId = currentCompanyId;
      chooseCompany(targetId);
      const selectedOption = Array.from(sel.options || []).find((option) => option.value === targetId);
      const selectedLabel = normalizeCompanyName(label || selectedOption?.textContent, targetId);

      switching = true;
      const currentToken = ++switchEpoch;
      setSwitcherDisabled(true);
      const switchOverlayStartedAt = beginCompanySwitchLoading({
        targetId,
        label: selectedLabel
      });
      let reloadTriggered = false;
      const onBeforeUnload = () => {
        reloadTriggered = true;
      };
      w.addEventListener("beforeunload", onBeforeUnload, { once: true });

      try {
        const switchFn = getSwitchFn();
        if (!switchFn) {
          throw new Error("Company switch API is unavailable.");
        }
        const result = await switchFn({
          id: targetId,
          source: source === "ui" ? "renderer-ui" : "renderer-sync"
        });
        if (result && typeof result === "object" && result.ok === false) {
          throw new Error(String(result.error || "Unable to switch company"));
        }
        if (reloadTriggered || currentToken !== switchEpoch) return;
        const switchedCompanyId = normalizeCompanyId(
          result?.activeCompanyId || result?.activeCompany?.id || targetId
        ) || targetId;
        await rehydrateCompanyRuntimeState(result || {}, {
          isStale: () => currentToken !== switchEpoch
        });
        if (reloadTriggered || currentToken !== switchEpoch) return;
        currentCompanyId = switchedCompanyId;
        chooseCompany(switchedCompanyId);
        if (source !== "ui" && typeof w.showToast === "function") {
          w.showToast("La societe active a change. Les donnees ont ete rechargees.");
        }
      } catch (err) {
        console.error("Unable to switch active company", err);
        try {
          const switchFn = getSwitchFn();
          if (switchFn && previousId && source === "ui") {
            const rollbackRes = await switchFn({ id: previousId, source: "renderer-rollback" });
            if ((!rollbackRes || rollbackRes.ok !== false) && currentToken === switchEpoch) {
              await rehydrateCompanyRuntimeState(rollbackRes || {}, {
                isStale: () => currentToken !== switchEpoch
              });
            }
          }
        } catch (rollbackErr) {
          console.error("Rollback after company switch failure failed", rollbackErr);
        }
        if (currentToken === switchEpoch) {
          currentCompanyId = previousId;
          if (previousId) chooseCompany(previousId);
          const errorMessage = String(err?.message || err || "Switch failed.");
          if (typeof w.showToast === "function") {
            if (source === "ui") {
              w.showToast(`Changement de societe impossible: ${errorMessage}`);
            } else {
              w.showToast(`Synchronisation de societe impossible: ${errorMessage}`);
            }
          }
        }
      } finally {
        w.removeEventListener("beforeunload", onBeforeUnload);
        switching = false;
        setSwitcherDisabled(false);
        await endCompanySwitchLoading(switchOverlayStartedAt, { keepVisible: reloadTriggered });
        if (!reloadTriggered && pendingExternalPayload) {
          const pending = pendingExternalPayload;
          pendingExternalPayload = null;
          void handleExternalCompanyChange(pending);
        }
        if (!reloadTriggered && pendingCatalogRefresh) {
          pendingCatalogRefresh = false;
          void handleCompanyCatalogChange({ reason: "deferred" });
        }
      }
    }

    async function handleExternalCompanyChange(payload = {}) {
      const incomingId = normalizeCompanyId(
        payload?.activeCompanyId || payload?.activeCompany?.id || payload?.active?.id || ""
      );
      if (!incomingId) return;
      if (incomingId === currentCompanyId || incomingId === String(sel.value || "").trim()) return;
      if (switching) {
        pendingExternalPayload = payload;
        return;
      }
      if (!hasCompanyOption(incomingId)) {
        try {
          await refreshCompaniesList(currentCompanyId || incomingId);
        } catch (err) {
          console.warn("Unable to refresh company list after external switch", err);
        }
      }
      if (!hasCompanyOption(incomingId)) return;
      const fallbackLabel = normalizeCompanyName(payload?.activeCompany?.name, incomingId);
      await runCompanySwitch(incomingId, { source: "external", label: fallbackLabel });
    }

    async function handleCompanyCatalogChange() {
      if (switching) {
        pendingCatalogRefresh = true;
        return;
      }
      if (catalogRefreshPromise) {
        await catalogRefreshPromise;
        return;
      }
      catalogRefreshPromise = (async () => {
        const [rawList, activeCompanyId] = await Promise.all([
          api.listCompanies(),
          readActiveCompanyId(api)
        ]);
        const companies = parseCompaniesList(rawList);
        renderCompanyOptions(companies);
        if (!companies.length) {
          currentCompanyId = "";
          setSwitcherDisabled(true);
          const opt = document.createElement("option");
          opt.value = "";
          opt.textContent = "-";
          sel.appendChild(opt);
          if (panel) {
            const empty = document.createElement("div");
            empty.className = "model-select-empty";
            empty.textContent = "Aucune societe";
            panel.appendChild(empty);
          }
          setDisplayText("-");
          return;
        }
        setSwitcherDisabled(false);
        const scopedCompanyId = normalizeCompanyId(activeCompanyId);
        const preferredCompanyId =
          scopedCompanyId ||
          normalizeCompanyId(currentCompanyId) ||
          normalizeCompanyId(sel.value) ||
          companies[0].id;

        if (!hasCompanyOption(preferredCompanyId)) {
          chooseCompany(companies[0].id);
          currentCompanyId = companies[0].id;
          return;
        }
        if (preferredCompanyId !== currentCompanyId) {
          await runCompanySwitch(preferredCompanyId, { source: "external" });
          return;
        }
        chooseCompany(preferredCompanyId);
      })()
        .catch((err) => {
          console.warn("Unable to refresh company catalog", err);
        })
        .finally(() => {
          catalogRefreshPromise = null;
        });
      await catalogRefreshPromise;
    }

    try {
      const [rawList, activeCompanyId] = await Promise.all([
        api.listCompanies(),
        readActiveCompanyId(api)
      ]);
      const companies = parseCompaniesList(rawList);
      renderCompanyOptions(companies);

      if (!companies.length) {
        setSwitcherDisabled(true);
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-";
        sel.appendChild(opt);
        setDisplayText("-");
        if (panel) {
          const empty = document.createElement("div");
          empty.className = "model-select-empty";
          empty.textContent = "Aucune societe";
          panel.appendChild(empty);
        }
        return;
      }

      if (activeCompanyId && companies.some((company) => company.id === activeCompanyId)) {
        chooseCompany(activeCompanyId);
      } else {
        chooseCompany(companies[0].id);
      }
      currentCompanyId = String(sel.value || "").trim();

      sel.addEventListener("change", async () => {
        const nextId = String(sel.value || "").trim();
        if (!nextId || nextId === currentCompanyId) {
          chooseCompany(currentCompanyId);
          return;
        }
        await runCompanySwitch(nextId, { source: "ui" });
      });

      if (typeof api.onActiveCompanyChanged === "function") {
        api.onActiveCompanyChanged((payload = {}) => {
          void handleExternalCompanyChange(payload);
        });
      }
      if (typeof api.onCompanyCatalogChanged === "function") {
        api.onCompanyCatalogChanged(() => {
          void handleCompanyCatalogChange();
        });
      }
    } catch (err) {
      console.error("initCompanySwitcher failed", err);
      setSwitcherDisabled(true);
    }
  }

  async function runCriticalInit() {
    if (typeof SEM.loadCompanyFromLocal === "function") {
      try {
        await SEM.loadCompanyFromLocal();
      } catch (err) {
        console.warn("loadCompanyFromLocal failed", err);
      }
    }
    await initCompanySwitcher();
    SEM.bind?.();
    SEM.wireLiveBindings?.();
    SEM.setSubmitMode?.("add");
    endCompanySwitchLoading();
  }

  async function runNonCriticalInit() {
    AppInit.ensurePdfWorker?.();
    AppInit.wireSignatureModal?.();

    const focus = SEM.ui || {};
    focus.installFocusGuards?.();
    [
      "addPurchasePrice",
      "addPurchaseTva",
      "addPurchaseDiscount",
      "addPurchaseFodecRate",
      "addPurchaseFodecTva",
      "addPrice",
      "addTva",
      "addDiscount",
      "addFodecRate",
      "addFodecTva",
      "addStockQty"
    ].forEach((id) => focus.enableFirstClickSelectSecondClickCaret?.(getEl(id)));

    AppInit.wireFodecAuto?.();

    const numbering = AppInit.createDocumentNumbering?.() || null;
    const history = AppInit.createDocumentHistory?.({ numbering }) || null;

    AppInit.registerDocumentActions?.({
      numbering,
      history,
      focus,
      forms: SEM.forms
    });
    AppInit.__runtime = {
      numbering,
      history,
      focus,
      forms: SEM.forms
    };
  }

  async function init() {
    showBootOverlay("Chargement de Facturance...");
    await runCriticalInit();
    notifyAppReadyOnce();
    hideBootOverlay();
    void runNonCriticalInit().catch((err) => {
      console.error("Non-critical startup failed", err);
    });
  }

  w.onReady(() => {
    if (initialized) return;
    initialized = true;
    Promise.resolve(init()).catch((err) => {
      console.error("App init error", err);
      setBootOverlayLabel("Echec du demarrage...");
      endCompanySwitchLoading();
    });
  });
})(window);
