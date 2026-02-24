(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  AppInit.createDocHistorySignerService = function createDocHistorySignerService({
    getMessage,
    getDocType,
    getElectronApi,
    showDialog,
    showToast,
    showConfirm
  } = {}) {
    const resolveMessage = (key, options = {}) =>
      (typeof getMessage === "function" && getMessage(key, options)) || {
        text: options?.fallbackText || key || "",
        title: options?.fallbackTitle || "TEIF"
      };

    const getApi = () =>
      (typeof getElectronApi === "function" ? getElectronApi() : null) || w.electronAPI || null;

    const showDialogSafe = async (message, options = {}) => {
      const dialogFn =
        (typeof showDialog === "function" && showDialog) ||
        (typeof w.showDialog === "function" ? w.showDialog : null);
      if (typeof dialogFn === "function") {
        await dialogFn(message, options);
      }
    };

    const showToastSafe = (message) => {
      const toastFn =
        (typeof showToast === "function" && showToast) ||
        (typeof w.showToast === "function" ? w.showToast : null);
      if (typeof toastFn === "function") toastFn(message);
    };

    const showConfirmSafe = async (message, options = {}) => {
      const confirmFn =
        (typeof showConfirm === "function" && showConfirm) ||
        (typeof w.showConfirm === "function" ? w.showConfirm : null);
      if (typeof confirmFn === "function") {
        await confirmFn(message, options);
        return { supported: true };
      }
      return { supported: false };
    };

    const currentDocType = () =>
      String((typeof getDocType === "function" ? getDocType() : "facture") || "facture").toLowerCase();

    const resolveEntryType = (entry) =>
      String(entry?.docType || currentDocType() || "facture").toLowerCase();

    async function validateEntryForFacture(entry, { notifyErrors = true } = {}) {
      if (!entry || !entry.path) {
        const notFound = resolveMessage("HISTORY_EXPORT_NOT_FOUND", {
          fallbackText: "Document introuvable.",
          fallbackTitle: "TEIF"
        });
        if (notifyErrors) await showDialogSafe(notFound.text, { title: notFound.title });
        return { ok: false, error: notFound.text };
      }
      const entryType = resolveEntryType(entry);
      if (entryType !== "facture") {
        const invalidType = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Action disponible uniquement pour les factures.",
          fallbackTitle: "TEIF"
        });
        if (notifyErrors) await showDialogSafe(invalidType.text, { title: invalidType.title });
        return { ok: false, error: invalidType.text };
      }
      return { ok: true, entryType };
    }

    async function generateUnsigned(entry, { showToast: shouldToast = false, notifyErrors = true } = {}) {
      const validation = await validateEntryForFacture(entry, { notifyErrors });
      if (!validation?.ok) return validation;
      const api = getApi();
      if (!api?.generateTeifUnsigned) {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Generation TEIF indisponible.",
          fallbackTitle: "TEIF"
        });
        if (notifyErrors) await showDialogSafe(unavailable.text, { title: unavailable.title });
        return { ok: false, error: unavailable.text };
      }
      try {
        const res = await api.generateTeifUnsigned({
          historyPath: entry.path,
          docType: validation.entryType
        });
        if (!res?.ok) {
          const errMsg = res?.error || "Generation TEIF echouee.";
          if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
          return { ok: false, error: errMsg };
        }
        if (shouldToast) {
          const baseMessage = "TEIF XML generated (unsigned)";
          const pathSuffix = res.path ? `: ${res.path}` : "";
          if (typeof showToastSafe === "function") {
            showToastSafe(`${baseMessage}${pathSuffix}`);
          } else {
            await showDialogSafe(`${baseMessage}${pathSuffix}`, { title: "TEIF" });
          }
        }
        return { ok: true, path: res.path, result: res };
      } catch (err) {
        const errMsg = String(err?.message || err || "Generation TEIF echouee.");
        if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
        return { ok: false, error: errMsg };
      }
    }

    async function signWithIdTrust(unsignedPath, { notifyErrors = true } = {}) {
      const api = getApi();
      if (!api?.signTeifIdTrust) {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Signature ID-Trust indisponible.",
          fallbackTitle: "TEIF"
        });
        if (notifyErrors) await showDialogSafe(unavailable.text, { title: unavailable.title });
        return { ok: false, error: unavailable.text };
      }
      const resolvedUnsignedPath = String(unsignedPath || "").trim();
      if (!resolvedUnsignedPath) {
        const missing = "TEIF non genere / fichier introuvable";
        if (notifyErrors) await showDialogSafe(missing, { title: "TEIF" });
        return { ok: false, error: missing };
      }
      try {
        const signRes = await api.signTeifIdTrust({ unsignedPath: resolvedUnsignedPath });
        if (!signRes?.ok) {
          const errMsg =
            signRes?.error ||
            signRes?.stderr ||
            signRes?.stdout ||
            "Signature TEIF echouee.";
          if (signRes?.stderr) {
            console.warn("idtrust signer stderr:", signRes.stderr);
          }
          if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
          return { ok: false, error: errMsg, result: signRes };
        }
        const signedPath = String(signRes?.signedPath || signRes?.path || "").trim();
        if (!signedPath) {
          const missing = "TEIF signe introuvable.";
          if (notifyErrors) await showDialogSafe(missing, { title: "TEIF" });
          return { ok: false, error: missing, result: signRes };
        }
        return { ok: true, path: signedPath, result: signRes };
      } catch (err) {
        const errMsg = String(err?.message || err || "Signature TEIF echouee.");
        if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
        return { ok: false, error: errMsg };
      }
    }

    async function signWithDigigo(unsignedPath, { notifyErrors = true } = {}) {
      const api = getApi();
      const digigoSigner =
        api?.signTeifDigigo || api?.signTeifDigiGo || api?.signTeifWithDigigo || null;
      if (typeof digigoSigner !== "function") {
        const unavailable = resolveMessage("FEATURE_UNAVAILABLE", {
          fallbackText: "Signature DigiGo indisponible.",
          fallbackTitle: "TEIF"
        });
        if (notifyErrors) await showDialogSafe(unavailable.text, { title: unavailable.title });
        return { ok: false, unsupported: true, error: unavailable.text };
      }
      const resolvedUnsignedPath = String(unsignedPath || "").trim();
      if (!resolvedUnsignedPath) {
        const missing = "TEIF non genere / fichier introuvable";
        if (notifyErrors) await showDialogSafe(missing, { title: "TEIF" });
        return { ok: false, error: missing };
      }
      try {
        let signRes = null;
        try {
          signRes = await digigoSigner.call(api, { unsignedPath: resolvedUnsignedPath });
        } catch {
          signRes = await digigoSigner.call(api, resolvedUnsignedPath);
        }
        if (!signRes?.ok) {
          const errMsg =
            signRes?.error ||
            signRes?.stderr ||
            signRes?.stdout ||
            "Signature DigiGo echouee.";
          if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
          return { ok: false, error: errMsg, result: signRes };
        }
        const signedPath = String(
          signRes?.signedPath || signRes?.path || signRes?.outputPath || ""
        ).trim();
        if (!signedPath) {
          const missing = "TEIF signe introuvable.";
          if (notifyErrors) await showDialogSafe(missing, { title: "TEIF" });
          return { ok: false, error: missing, result: signRes };
        }
        return { ok: true, path: signedPath, result: signRes };
      } catch (err) {
        const errMsg = String(err?.message || err || "Signature DigiGo echouee.");
        if (notifyErrors) await showDialogSafe(errMsg, { title: "TEIF" });
        return { ok: false, error: errMsg };
      }
    }

    async function showIdTrustSuccess(signedPath) {
      const api = getApi();
      const resolvedSignedPath = String(signedPath || "").trim();
      const successMessage = "TEIF signe avec ID-Trust.";
      const confirmState = await showConfirmSafe(successMessage, {
        title: "TEIF",
        okText: "Ouvrir le dossier",
        cancelText: "Fermer",
        onOk: () => {
          if (resolvedSignedPath) api?.showInFolder?.(resolvedSignedPath);
        }
      });
      if (confirmState?.supported) return;

      if (typeof showToastSafe === "function") {
        showToastSafe(successMessage);
        if (resolvedSignedPath) await api?.showInFolder?.(resolvedSignedPath);
        return;
      }
      await showDialogSafe(successMessage, { title: "TEIF" });
      if (resolvedSignedPath) await api?.showInFolder?.(resolvedSignedPath);
    }

    return {
      getApi,
      validateEntryForFacture,
      generateUnsigned,
      signWithIdTrust,
      signWithDigigo,
      showIdTrustSuccess
    };
  };
})(window);
