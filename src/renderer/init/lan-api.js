(function () {
  if (window.electronAPI) return;
  const proto = window.location && window.location.protocol;
  if (proto !== "http:" && proto !== "https:") return;

  const postJson = async (endpoint, payload) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        if (data && typeof data === "object") return { ok: false, ...data };
        return { ok: false, error: res.statusText || "Network error." };
      }
      return data;
    } catch (err) {
      return { ok: false, error: "Network error." };
    }
  };

  const getJson = async (endpoint, params) => {
    try {
      let url = endpoint;
      if (params && typeof params === "object") {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          search.set(key, String(value));
        });
        const query = search.toString();
        if (query) url += `?${query}`;
      }
      const res = await fetch(url, { method: "GET" });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        if (data && typeof data === "object") return { ok: false, ...data };
        return { ok: false, error: res.statusText || "Network error." };
      }
      return data;
    } catch {
      return { ok: false, error: "Network error." };
    }
  };

  const COMPANY_CATALOG_EVENT = "company-catalog-changed";
  let activeCompanyIdCache = "";
  const activeCompanyListeners = new Set();
  const companyCatalogListeners = new Set();
  let companyCatalogEventSource = null;

  const extractActiveCompanyId = (value) => {
    if (!value || typeof value !== "object") return "";
    return String(value.activeCompanyId || value.activeCompany?.id || value.active?.id || "").trim();
  };

  const rememberActiveCompanyId = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    activeCompanyIdCache = normalized;
    return normalized;
  };

  const withExpectedCompanyId = (payload = {}) => {
    if (!payload || typeof payload !== "object") return payload;
    if (payload.expectedCompanyId || payload.activeCompanyId || payload.companyId) return payload;
    const activeId = String(activeCompanyIdCache || "").trim();
    if (!activeId) return payload;
    return { ...payload, expectedCompanyId: activeId };
  };

  const emitActiveCompanyChange = (payload = {}) => {
    const nextId = extractActiveCompanyId(payload);
    if (nextId) rememberActiveCompanyId(nextId);
    activeCompanyListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // ignore listener failures
      }
    });
  };

  const emitCompanyCatalogChange = (payload = {}) => {
    const safePayload = payload && typeof payload === "object" ? payload : {};
    companyCatalogListeners.forEach((listener) => {
      try {
        listener(safePayload);
      } catch {
        // ignore listener failures
      }
    });
  };

  const ensureCompanyCatalogEventSource = () => {
    if (companyCatalogEventSource || typeof window.EventSource !== "function") return;
    try {
      const source = new window.EventSource("/api/companies/events");
      source.addEventListener(COMPANY_CATALOG_EVENT, (event) => {
        let payload = {};
        try {
          payload = event?.data ? JSON.parse(event.data) : {};
        } catch {
          payload = {};
        }
        emitCompanyCatalogChange(payload);
      });
      source.onerror = () => {
        // native EventSource handles retry automatically
      };
      companyCatalogEventSource = source;
    } catch {
      companyCatalogEventSource = null;
    }
  };

  const maybeTearDownCompanyCatalogEventSource = () => {
    if (companyCatalogListeners.size > 0) return;
    if (!companyCatalogEventSource) return;
    try {
      companyCatalogEventSource.close();
    } catch {}
    companyCatalogEventSource = null;
  };

  const api = {
    listCompanies: async () => {
      const res = await postJson("/api/companies/list", {});
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.companies)) return res.companies;
      return [];
    },
    createCompany: async (payload) => {
      const res = await postJson("/api/companies/create", payload || {});
      const nextId = extractActiveCompanyId(res);
      if (nextId) {
        rememberActiveCompanyId(nextId);
        emitActiveCompanyChange({
          activeCompanyId: nextId,
          activeCompany: res?.activeCompany || res?.active || null
        });
      }
      return res;
    },
    setActiveCompany: (payload = {}) => {
      const normalizedPayload =
        typeof payload === "string" ? { id: payload } : (payload || {});
      if (typeof payload === "string") {
        return postJson("/api/companies/set-active", normalizedPayload).then((res) => {
          const nextId = extractActiveCompanyId(res);
          if (nextId) {
            rememberActiveCompanyId(nextId);
            emitActiveCompanyChange({
              activeCompanyId: nextId,
              activeCompany: res?.activeCompany || res?.active || null
            });
          }
          return res;
        });
      }
      return postJson("/api/companies/set-active", normalizedPayload).then((res) => {
        const nextId = extractActiveCompanyId(res);
        if (nextId) {
          rememberActiveCompanyId(nextId);
          emitActiveCompanyChange({
            activeCompanyId: nextId,
            activeCompany: res?.activeCompany || res?.active || null
          });
        }
        return res;
      });
    },
    switchCompany: (payload = {}) => {
      const normalizedPayload =
        typeof payload === "string" ? { id: payload } : (payload || {});
      if (typeof payload === "string") {
        return postJson("/api/companies/switch", normalizedPayload).then((res) => {
          const nextId = extractActiveCompanyId(res);
          if (nextId) {
            rememberActiveCompanyId(nextId);
            emitActiveCompanyChange({
              activeCompanyId: nextId,
              activeCompany: res?.activeCompany || res?.active || null
            });
          }
          return res;
        });
      }
      return postJson("/api/companies/switch", normalizedPayload).then((res) => {
        const nextId = extractActiveCompanyId(res);
        if (nextId) {
          rememberActiveCompanyId(nextId);
          emitActiveCompanyChange({
            activeCompanyId: nextId,
            activeCompany: res?.activeCompany || res?.active || null
          });
        }
        return res;
      });
    },
    getActiveCompanyId: async () => {
      const res = await postJson("/api/companies/active-paths", {});
      const nextId = extractActiveCompanyId(res);
      if (nextId) {
        rememberActiveCompanyId(nextId);
        emitActiveCompanyChange({
          activeCompanyId: nextId,
          activeCompany: res?.activeCompany || res?.active || null
        });
      }
      return nextId;
    },
    getActiveCompanyPaths: async () => {
      const res = await postJson("/api/companies/active-paths", {});
      const nextId = extractActiveCompanyId(res);
      if (nextId) {
        rememberActiveCompanyId(nextId);
        emitActiveCompanyChange({
          activeCompanyId: nextId,
          activeCompany: res?.activeCompany || res?.active || null
        });
      }
      return res;
    },
    onActiveCompanyChanged: (cb) => {
      if (typeof cb !== "function") return () => {};
      activeCompanyListeners.add(cb);
      return () => {
        activeCompanyListeners.delete(cb);
      };
    },
    onCompanyCatalogChanged: (cb) => {
      if (typeof cb !== "function") return () => {};
      companyCatalogListeners.add(cb);
      ensureCompanyCatalogEventSource();
      return () => {
        companyCatalogListeners.delete(cb);
        maybeTearDownCompanyCatalogEventSource();
      };
    },
    loadCompanyData: () => postJson("/api/company/load", {}),
    saveCompanyData: (payload) => postJson("/api/company/save", payload),
    saveInvoiceJSON: (payload) => postJson("/api/documents", payload),
    saveInvoiceRecord: (payload) => postJson("/api/documents", payload),
    openInvoiceJSON: async (payload) => {
      const res = await postJson("/api/invoices/open", withExpectedCompanyId(payload));
      if (res && typeof res === "object" && res.ok) return res.data || null;
      return null;
    },
    openInvoiceRecord: async (payload) => {
      const res = await postJson("/api/invoices/open", withExpectedCompanyId(payload));
      if (res && typeof res === "object" && res.ok) return res.data || null;
      return null;
    },
    listInvoiceFiles: (payload) => postJson("/api/invoices/list", payload),
    updateDocumentPdfPath: (payload) => postJson("/api/documents/pdf-path", payload),
    deleteInvoiceFile: (payload) => postJson("/api/invoices/delete", payload),
    docLockAcquire: (payload) => postJson("/api/documents/lock/acquire", payload),
    docLockTouch: (payload) => postJson("/api/documents/lock/touch", payload),
    docLockRelease: (payload) => postJson("/api/documents/lock/release", payload),
    previewDocumentNumber: (payload) =>
      getJson("/api/number/preview", {
        docType: payload?.docType,
        date: payload?.date,
        numberLength: payload?.numberLength,
        length: payload?.length,
        prefix: payload?.prefix,
        numberFormat: payload?.numberFormat
      }),
    readPaymentHistory: () => postJson("/api/payments/read", {}),
    writePaymentHistory: (items) =>
      postJson("/api/payments/write", { items: Array.isArray(items) ? items : [] }),

    ensureClientsSystemFolder: (payload) => postJson("/api/clients/ensure", payload),
    saveClientDirect: (payload) => postJson("/api/clients/save", payload),
    updateClientDirect: (payload) => postJson("/api/clients/update", payload),
    adjustClientSold: (payload) => postJson("/api/clients/adjustSold", payload),
    readClientLedger: (payload) => postJson("/api/clients/ledger", payload),
    deleteClientLedgerEntry: (payload) => postJson("/api/clients/ledger/delete", payload),
    addClientLedgerEntry: (payload) => postJson("/api/clients/ledger/add", payload),
    updateClientLedgerAmount: (payload) => postJson("/api/clients/ledger/update-amount", payload),
    searchClients: (payload) => {
      if (typeof payload === "string") return postJson("/api/clients/search", { query: payload });
      return postJson("/api/clients/search", payload);
    },
    openClient: (payload) => postJson("/api/clients/open", payload),
    deleteClient: (payload) => postJson("/api/clients/delete", payload),

    saveArticle: (payload) => postJson("/api/articles/save", payload),
    saveArticleAuto: (payload) => postJson("/api/articles/save-auto", payload),
    updateArticle: (payload) => postJson("/api/articles/update", payload),
    adjustArticleStock: (payload) => postJson("/api/articles/adjust-stock", payload),
    listArticles: () => postJson("/api/articles/list", {}),
    searchArticles: (payload) => {
      if (typeof payload === "string") return postJson("/api/articles/search", { query: payload });
      return postJson("/api/articles/search", payload);
    },
    deleteArticle: (payload) => postJson("/api/articles/delete", payload),

    listModels: () => postJson("/api/models/list", {}),
    loadModel: (payload) => postJson("/api/models/load", payload),
    saveModel: (payload) => postJson("/api/models/save", payload),
    deleteModel: (payload) => postJson("/api/models/delete", payload),
    loadClientFieldSettings: () => postJson("/api/client-fields/load", {}),
    saveClientFieldSettings: (payload) => postJson("/api/client-fields/save", payload),
    loadArticleFieldSettings: () => postJson("/api/article-fields/load", {}),
    saveArticleFieldSettings: (payload) => postJson("/api/article-fields/save", payload),
    loadWithholdingFaSettings: () => postJson("/api/withholding-fa-settings/load", {}),
    saveWithholdingFaSettings: (payload) =>
      postJson("/api/withholding-fa-settings/save", payload),

    openExternal: async (url) => {
      try {
        window.open(url, "_blank", "noopener");
        return true;
      } catch {
        return false;
      }
    }
  };

  window.electronAPI = api;
})();
