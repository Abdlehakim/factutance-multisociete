(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  const SCHEMA_VERSION = "facturance.model-template.v1";

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const cloneValue = (value, fallback = null) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  const sanitizeModelName = (rawName) => {
    if (rawName === null || rawName === undefined) return "";
    return String(rawName).trim().replace(/\s+/g, " ").slice(0, 80);
  };

  const normalizeComparableModelName = (rawName) => {
    const safeName = sanitizeModelName(rawName);
    const compactAlphaNum = safeName
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
    if (compactAlphaNum) return compactAlphaNum;
    return safeName.toLowerCase().replace(/\s+/g, "");
  };

  const sanitizeFilenameToken = (value, fallback = "modele") => {
    const raw = sanitizeModelName(value);
    if (!raw) return fallback;
    const normalized = raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  };

  const buildModelExportEnvelope = (record) => {
    const source = isPlainObject(record) ? record : {};
    const name = sanitizeModelName(source.name);
    const config = isPlainObject(source.config) ? cloneValue(source.config, {}) : {};
    if (!name) return null;
    return {
      schemaVersion: SCHEMA_VERSION,
      payload: {
        exportType: "modele",
        exportedAt: new Date().toISOString(),
        model: {
          name,
          config
        }
      }
    };
  };

  const parseModelImportEnvelope = (raw) => {
    const source = isPlainObject(raw) ? raw : {};
    const schemaVersion = String(source.schemaVersion || "").trim();
    if (!schemaVersion) {
      return { ok: false, error: "Fichier invalide: schemaVersion manquant." };
    }
    if (schemaVersion !== SCHEMA_VERSION) {
      return {
        ok: false,
        error: `Schema non pris en charge (${schemaVersion}). Version attendue: ${SCHEMA_VERSION}.`
      };
    }

    const payload = isPlainObject(source.payload) ? source.payload : null;
    if (!payload) return { ok: false, error: "Fichier invalide: payload manquant." };

    const exportType = String(payload.exportType || "").trim().toLowerCase();
    if (exportType && exportType !== "modele") {
      return { ok: false, error: "Ce fichier n'est pas un export de modele." };
    }

    const rawModel = isPlainObject(payload.model) ? payload.model : null;
    if (!rawModel) return { ok: false, error: "Fichier invalide: modele manquant." };

    const name = sanitizeModelName(rawModel.name);
    if (!name) return { ok: false, error: "Nom du modele manquant dans le fichier." };

    if (!isPlainObject(rawModel.config)) {
      return { ok: false, error: "Configuration du modele invalide dans le fichier." };
    }
    const config = cloneValue(rawModel.config, {});
    return {
      ok: true,
      schemaVersion,
      payload: cloneValue(payload, {}),
      model: { name, config }
    };
  };

  const resolveEntryName = (entry) => {
    if (typeof entry === "string") return sanitizeModelName(entry);
    if (isPlainObject(entry)) return sanitizeModelName(entry.name);
    return "";
  };

  const findEquivalentModel = (targetName, entries = []) => {
    const target = normalizeComparableModelName(targetName);
    if (!target) return "";
    const list = Array.isArray(entries) ? entries : [];
    for (const entry of list) {
      const candidate = resolveEntryName(entry);
      if (!candidate) continue;
      if (normalizeComparableModelName(candidate) === target) {
        return candidate;
      }
    }
    return "";
  };

  AppInit.ModelTransferValidation = {
    SCHEMA_VERSION,
    isPlainObject,
    cloneValue,
    sanitizeModelName,
    normalizeComparableModelName,
    sanitizeFilenameToken,
    buildModelExportEnvelope,
    parseModelImportEnvelope,
    findEquivalentModel
  };
})(window);
