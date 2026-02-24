(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const AppInit = (w.AppInit = w.AppInit || {});
  let initialized = false;

  function normalizeCompanyId(raw) {
    if (typeof raw === "string") return raw.trim();
    if (!raw || typeof raw !== "object") return "";
    const fromId = String(raw.id || "").trim();
    if (fromId) return fromId;
    return String(raw.folder || "").trim();
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
      out.push({ id });
    });
    out.sort((a, b) => {
      const an = Number(String(a.id).replace(/[^\d]/g, "")) || 0;
      const bn = Number(String(b.id).replace(/[^\d]/g, "")) || 0;
      return an - bn;
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
      display.textContent = text || "Sélectionner une société";
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
      setDisplayText(id);
      syncPanelSelection(id);
      if (emitChange) {
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    if (menu && trigger) {
      menu.addEventListener("toggle", () => {
        trigger.setAttribute("aria-expanded", menu.open ? "true" : "false");
      });
    }

    const api = resolveCompaniesApi();
    if (
      !api ||
      typeof api.listCompanies !== "function" ||
      typeof api.setActiveCompany !== "function"
    ) {
      menu?.setAttribute("hidden", "");
      sel.hidden = true;
      return;
    }

    try {
      const [rawList, activeCompanyId] = await Promise.all([
        api.listCompanies(),
        readActiveCompanyId(api)
      ]);
      const companies = parseCompaniesList(rawList);

      sel.innerHTML = "";
      if (panel) panel.innerHTML = "";
      companies.forEach((company) => {
        const opt = document.createElement("option");
        opt.value = company.id;
        opt.textContent = company.id;
        sel.appendChild(opt);

        if (panel) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-select-option";
          btn.setAttribute("role", "option");
          btn.setAttribute("data-value", company.id);
          btn.setAttribute("aria-selected", "false");
          btn.textContent = company.id;
          btn.addEventListener("click", () => {
            chooseCompany(company.id, true);
            menu?.removeAttribute("open");
          });
          panel.appendChild(btn);
        }
      });

      if (!companies.length) {
        sel.disabled = true;
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-";
        sel.appendChild(opt);
        setDisplayText("-");
        if (panel) {
          const empty = document.createElement("div");
          empty.className = "model-select-empty";
          empty.textContent = "Aucune société";
          panel.appendChild(empty);
        }
        return;
      }

      if (activeCompanyId && companies.some((c) => c.id === activeCompanyId)) {
        chooseCompany(activeCompanyId);
      } else {
        chooseCompany(companies[0].id);
      }

      let switching = false;
      sel.addEventListener("change", async () => {
        if (switching) return;
        const nextId = String(sel.value || "").trim();
        if (!nextId) return;
        chooseCompany(nextId);
        switching = true;
        sel.disabled = true;
        if (trigger) trigger.setAttribute("aria-disabled", "true");
        try {
          const result = await api.setActiveCompany(nextId);
          if (result && typeof result === "object" && result.ok === false) {
            throw new Error(String(result.error || "Unable to set active company"));
          }
          w.location.reload();
        } catch (err) {
          console.error("Unable to switch active company", err);
          switching = false;
          sel.disabled = false;
          if (trigger) trigger.removeAttribute("aria-disabled");
        }
      });
    } catch (err) {
      console.error("initCompanySwitcher failed", err);
      sel.disabled = true;
      if (trigger) trigger.setAttribute("aria-disabled", "true");
    }
  }

  async function init() {
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

    AppInit.ensurePdfWorker?.();
    AppInit.wireSignatureModal?.();

    const focus = SEM.ui || {};
    focus.installFocusGuards?.();
    ["addPurchasePrice", "addPurchaseTva", "addPurchaseFodecRate", "addPurchaseFodecTva", "addPrice", "addTva", "addDiscount", "addFodecRate", "addFodecTva", "addStockQty"].forEach((id) =>
      focus.enableFirstClickSelectSecondClickCaret?.(getEl(id))
    );

    AppInit.wireFodecAuto?.();

    const numbering = AppInit.createDocumentNumbering?.() || null;
    const history = AppInit.createDocumentHistory?.({ numbering }) || null;

    AppInit.registerDocumentActions?.({
      numbering,
      history,
      focus,
      forms: SEM.forms
    });
  }

  w.onReady(() => {
    if (initialized) return;
    initialized = true;
    Promise.resolve(init()).catch((err) => console.error("App init error", err));
  });
})(window);
