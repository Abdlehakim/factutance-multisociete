"use strict";

const crypto = require("crypto");

const CLIENT_CODE_PREFIX = "CL";
const CLIENT_CODE_DIGIT_COUNT = 4;
const CLIENT_CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CLIENT_CODE_REGEX = /^CL\d{4}[A-Z]$/;

const normalizeClientCodeValue = (value) => String(value ?? "").trim().toUpperCase();

const isGeneratedClientCodeFormat = (value) =>
  CLIENT_CODE_REGEX.test(normalizeClientCodeValue(value));

const randomInt = (maxExclusive) => {
  const max = Math.max(1, Math.trunc(Number(maxExclusive) || 1));
  if (typeof crypto.randomInt === "function") {
    return crypto.randomInt(0, max);
  }
  return Math.floor(Math.random() * max);
};

const createRandomLikeClientCode = () => {
  const numericPart = String(randomInt(10 ** CLIENT_CODE_DIGIT_COUNT)).padStart(
    CLIENT_CODE_DIGIT_COUNT,
    "0"
  );
  const letterPart = CLIENT_CODE_LETTERS[randomInt(CLIENT_CODE_LETTERS.length)] || "A";
  return `${CLIENT_CODE_PREFIX}${numericPart}${letterPart}`;
};

const createDeterministicFallbackCode = (step = 0) => {
  const safeStep = Math.max(0, Math.trunc(Number(step) || 0));
  const totalNumericSpace = 10 ** CLIENT_CODE_DIGIT_COUNT;
  const numericPart = String(safeStep % totalNumericSpace).padStart(CLIENT_CODE_DIGIT_COUNT, "0");
  const letterIndex = Math.floor(safeStep / totalNumericSpace) % CLIENT_CODE_LETTERS.length;
  const letterPart = CLIENT_CODE_LETTERS[letterIndex] || "A";
  return `${CLIENT_CODE_PREFIX}${numericPart}${letterPart}`;
};

const generateUniqueClientCode = ({ exists, maxRandomAttempts = 128 } = {}) => {
  if (typeof exists !== "function") {
    throw new Error("generateUniqueClientCode requires an exists(candidate) function.");
  }
  for (let attempt = 0; attempt < maxRandomAttempts; attempt += 1) {
    const candidate = createRandomLikeClientCode();
    if (!exists(candidate)) return candidate;
  }
  const fallbackSpace = (10 ** CLIENT_CODE_DIGIT_COUNT) * CLIENT_CODE_LETTERS.length;
  for (let step = 0; step < fallbackSpace; step += 1) {
    const candidate = createDeterministicFallbackCode(step);
    if (!exists(candidate)) return candidate;
  }
  throw new Error("Impossible de generer un code client unique.");
};

module.exports = {
  CLIENT_CODE_PREFIX,
  CLIENT_CODE_DIGIT_COUNT,
  CLIENT_CODE_LETTERS,
  normalizeClientCodeValue,
  isGeneratedClientCodeFormat,
  createRandomLikeClientCode,
  generateUniqueClientCode
};

