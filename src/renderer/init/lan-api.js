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

  const api = {
    loadCompanyData: () => postJson("/api/company/load", {}),
    saveCompanyData: (payload) => postJson("/api/company/save", payload),
    saveInvoiceJSON: (payload) => postJson("/api/documents", payload),
    saveInvoiceRecord: (payload) => postJson("/api/documents", payload),
    openInvoiceJSON: async (payload) => {
      const res = await postJson("/api/invoices/open", payload);
      if (res && typeof res === "object" && res.ok) return res.data || null;
      return null;
    },
    openInvoiceRecord: async (payload) => {
      const res = await postJson("/api/invoices/open", payload);
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
