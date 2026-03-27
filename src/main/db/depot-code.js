"use strict";

const crypto = require("crypto");

const DEPOT_CODE_PREFIX = "DP";
const CODE_DIGIT_COUNT = 4;
const CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const normalizeDepotCodeValue = (value) => String(value ?? "").trim().toUpperCase();

const DEPOT_CODE_REGEX = new RegExp(
  `^${DEPOT_CODE_PREFIX}\\d{${CODE_DIGIT_COUNT}}[A-Z]$`
);

const isGeneratedDepotCodeFormat = (value) =>
  DEPOT_CODE_REGEX.test(normalizeDepotCodeValue(value));

const randomInt = (maxExclusive) => {
  const max = Math.max(1, Math.trunc(Number(maxExclusive) || 1));
  if (typeof crypto.randomInt === "function") {
    return crypto.randomInt(0, max);
  }
  return Math.floor(Math.random() * max);
};

const createRandomLikeDepotCode = () => {
  const numericPart = String(randomInt(10 ** CODE_DIGIT_COUNT)).padStart(
    CODE_DIGIT_COUNT,
    "0"
  );
  const letterPart = CODE_LETTERS[randomInt(CODE_LETTERS.length)] || "A";
  return `${DEPOT_CODE_PREFIX}${numericPart}${letterPart}`;
};

const createDeterministicFallbackDepotCode = (step = 0) => {
  const safeStep = Math.max(0, Math.trunc(Number(step) || 0));
  const totalNumericSpace = 10 ** CODE_DIGIT_COUNT;
  const numericPart = String(safeStep % totalNumericSpace).padStart(
    CODE_DIGIT_COUNT,
    "0"
  );
  const letterIndex = Math.floor(safeStep / totalNumericSpace) % CODE_LETTERS.length;
  const letterPart = CODE_LETTERS[letterIndex] || "A";
  return `${DEPOT_CODE_PREFIX}${numericPart}${letterPart}`;
};

const generateUniqueDepotCode = ({ exists, maxRandomAttempts = 128 } = {}) => {
  if (typeof exists !== "function") {
    throw new Error("generateUniqueDepotCode requires an exists(candidate) function.");
  }
  for (let attempt = 0; attempt < maxRandomAttempts; attempt += 1) {
    const candidate = createRandomLikeDepotCode();
    if (!exists(candidate)) return candidate;
  }
  const fallbackSpace = (10 ** CODE_DIGIT_COUNT) * CODE_LETTERS.length;
  for (let step = 0; step < fallbackSpace; step += 1) {
    const candidate = createDeterministicFallbackDepotCode(step);
    if (!exists(candidate)) return candidate;
  }
  throw new Error("Impossible de generer un code depot unique.");
};

module.exports = {
  DEPOT_CODE_PREFIX,
  CODE_DIGIT_COUNT,
  CODE_LETTERS,
  normalizeDepotCodeValue,
  isGeneratedDepotCodeFormat,
  createRandomLikeDepotCode,
  createDeterministicFallbackDepotCode,
  generateUniqueDepotCode
};
