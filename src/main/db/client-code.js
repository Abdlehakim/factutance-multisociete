"use strict";

const crypto = require("crypto");

const CLIENT_CODE_PREFIX = "CL";
const FOURNISSEUR_CODE_PREFIX = "FR";
const TRANSPORTEUR_CODE_PREFIX = "TR";
const CODE_DIGIT_COUNT = 4;
const CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ENTITY_CODE_CONFIG = Object.freeze({
  client: Object.freeze({
    entityType: "client",
    prefix: CLIENT_CODE_PREFIX,
    column: "code_client",
    uniqueIndex: "idx_clients_code_client_unique",
    resultKey: "codeClient"
  }),
  vendor: Object.freeze({
    entityType: "vendor",
    prefix: FOURNISSEUR_CODE_PREFIX,
    column: "code_fournisseur",
    uniqueIndex: "idx_clients_code_fournisseur_unique",
    resultKey: "codeFournisseur"
  }),
  transporter: Object.freeze({
    entityType: "transporter",
    prefix: TRANSPORTEUR_CODE_PREFIX,
    column: "code_transporteur",
    uniqueIndex: "idx_clients_code_transporteur_unique",
    resultKey: "codeTransporteur"
  })
});

const normalizeEntityType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "vendor" || normalized === "fournisseur" || normalized === "supplier") return "vendor";
  if (normalized === "transporter" || normalized === "transporteur") return "transporter";
  return "client";
};

const resolveEntityCodeConfig = (entityType = "client") =>
  ENTITY_CODE_CONFIG[normalizeEntityType(entityType)] || ENTITY_CODE_CONFIG.client;

const normalizeCodeValue = (value) => String(value ?? "").trim().toUpperCase();

const buildCodeRegexForPrefix = (prefix = CLIENT_CODE_PREFIX) =>
  new RegExp(`^${String(prefix || "").toUpperCase()}\\d{${CODE_DIGIT_COUNT}}[A-Z]$`);

const isGeneratedEntityCodeFormat = (value, entityType = "client") => {
  const config = resolveEntityCodeConfig(entityType);
  return buildCodeRegexForPrefix(config.prefix).test(normalizeCodeValue(value));
};

const normalizeEntityCodeValue = (value, entityType = "client") => {
  const config = resolveEntityCodeConfig(entityType);
  const normalized = normalizeCodeValue(value);
  if (!normalized) return "";
  return normalized.startsWith(config.prefix) ? normalized : normalized;
};

const randomInt = (maxExclusive) => {
  const max = Math.max(1, Math.trunc(Number(maxExclusive) || 1));
  if (typeof crypto.randomInt === "function") {
    return crypto.randomInt(0, max);
  }
  return Math.floor(Math.random() * max);
};

const createRandomLikeEntityCode = (entityType = "client") => {
  const config = resolveEntityCodeConfig(entityType);
  const numericPart = String(randomInt(10 ** CODE_DIGIT_COUNT)).padStart(
    CODE_DIGIT_COUNT,
    "0"
  );
  const letterPart = CODE_LETTERS[randomInt(CODE_LETTERS.length)] || "A";
  return `${config.prefix}${numericPart}${letterPart}`;
};

const createDeterministicFallbackEntityCode = (entityType = "client", step = 0) => {
  const config = resolveEntityCodeConfig(entityType);
  const safeStep = Math.max(0, Math.trunc(Number(step) || 0));
  const totalNumericSpace = 10 ** CODE_DIGIT_COUNT;
  const numericPart = String(safeStep % totalNumericSpace).padStart(CODE_DIGIT_COUNT, "0");
  const letterIndex = Math.floor(safeStep / totalNumericSpace) % CODE_LETTERS.length;
  const letterPart = CODE_LETTERS[letterIndex] || "A";
  return `${config.prefix}${numericPart}${letterPart}`;
};

const generateUniqueEntityCode = ({ entityType = "client", exists, maxRandomAttempts = 128 } = {}) => {
  if (typeof exists !== "function") {
    throw new Error("generateUniqueEntityCode requires an exists(candidate) function.");
  }
  for (let attempt = 0; attempt < maxRandomAttempts; attempt += 1) {
    const candidate = createRandomLikeEntityCode(entityType);
    if (!exists(candidate)) return candidate;
  }
  const fallbackSpace = (10 ** CODE_DIGIT_COUNT) * CODE_LETTERS.length;
  for (let step = 0; step < fallbackSpace; step += 1) {
    const candidate = createDeterministicFallbackEntityCode(entityType, step);
    if (!exists(candidate)) return candidate;
  }
  throw new Error("Impossible de generer un code unique.");
};

const normalizeClientCodeValue = (value) => normalizeEntityCodeValue(value, "client");
const normalizeFournisseurCodeValue = (value) => normalizeEntityCodeValue(value, "vendor");
const normalizeTransporteurCodeValue = (value) => normalizeEntityCodeValue(value, "transporter");
const isGeneratedClientCodeFormat = (value) => isGeneratedEntityCodeFormat(value, "client");
const isGeneratedFournisseurCodeFormat = (value) => isGeneratedEntityCodeFormat(value, "vendor");
const isGeneratedTransporteurCodeFormat = (value) => isGeneratedEntityCodeFormat(value, "transporter");
const createRandomLikeClientCode = () => createRandomLikeEntityCode("client");
const generateUniqueClientCode = (options = {}) =>
  generateUniqueEntityCode({ ...options, entityType: "client" });

module.exports = {
  ENTITY_CODE_CONFIG,
  CODE_DIGIT_COUNT,
  CODE_LETTERS,
  CLIENT_CODE_PREFIX,
  FOURNISSEUR_CODE_PREFIX,
  TRANSPORTEUR_CODE_PREFIX,
  resolveEntityCodeConfig,
  normalizeEntityCodeValue,
  isGeneratedEntityCodeFormat,
  createRandomLikeEntityCode,
  createDeterministicFallbackEntityCode,
  generateUniqueEntityCode,
  normalizeClientCodeValue,
  normalizeFournisseurCodeValue,
  normalizeTransporteurCodeValue,
  isGeneratedClientCodeFormat,
  isGeneratedFournisseurCodeFormat,
  isGeneratedTransporteurCodeFormat,
  createRandomLikeClientCode,
  generateUniqueClientCode
};
