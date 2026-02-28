"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  hasCompanyContextMismatch,
  normalizeCompanyId,
  resolveCompanyIdFromPath
} = require("../../src/main/company-context-guards");
const CompanyManager = require("../../src/main/company-manager");
const FactDb = require("../../src/main/db");

function createTempWorkspace() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "facturance-company-sync-"));
  const userDataDir = path.join(workspaceRoot, "userData");
  const dataRoot = path.join(workspaceRoot, "FacturanceData");
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(dataRoot, { recursive: true });
  return {
    workspaceRoot,
    userDataDir,
    dataRoot
  };
}

function withTempWorkspace(fn) {
  const workspace = createTempWorkspace();
  const cleanup = () => {
    try {
      FactDb.resetConnection();
    } catch {
      // ignore teardown failures in tests
    }
    fs.rmSync(workspace.workspaceRoot, { recursive: true, force: true });
  };
  let result;
  try {
    result = fn(workspace);
  } catch (err) {
    cleanup();
    throw err;
  }
  if (result && typeof result.then === "function") {
    return result.finally(() => cleanup());
  }
  cleanup();
  return result;
}

function isNativeSqliteUnavailableError(err) {
  const text = String(err?.message || err || "");
  return (
    err?.code === "ERR_DLOPEN_FAILED" ||
    text.includes("better_sqlite3.node") ||
    text.includes("NODE_MODULE_VERSION")
  );
}

test("normalizeCompanyId keeps valid entreprise ids", () => {
  assert.equal(normalizeCompanyId("entreprise12"), "entreprise12");
  assert.equal(normalizeCompanyId("Entreprise9"), "entreprise9");
  assert.equal(normalizeCompanyId("  ENTREPRISE3 "), "entreprise3");
});

test("normalizeCompanyId rejects invalid ids", () => {
  assert.equal(normalizeCompanyId(""), "");
  assert.equal(normalizeCompanyId("company1"), "");
  assert.equal(normalizeCompanyId("entreprise"), "");
});

test("resolveCompanyIdFromPath extracts entreprise folder id", () => {
  assert.equal(
    resolveCompanyIdFromPath("C:\\ProgramData\\Facturance\\FacturanceData\\entreprise4\\pdf\\Fact-0001.pdf"),
    "entreprise4"
  );
  assert.equal(resolveCompanyIdFromPath("/tmp/entreprise15/documents/Fact-9999.pdf"), "entreprise15");
  assert.equal(resolveCompanyIdFromPath("sqlite://documents/Fact-0001"), "");
});

test("hasCompanyContextMismatch detects expected/active mismatch", () => {
  assert.equal(
    hasCompanyContextMismatch({
      expectedCompanyId: "entreprise1",
      activeCompanyId: "entreprise2"
    }),
    true
  );
  assert.equal(
    hasCompanyContextMismatch({
      expectedCompanyId: "entreprise2",
      activeCompanyId: "entreprise2"
    }),
    false
  );
});

test("hasCompanyContextMismatch detects path/active mismatch", () => {
  assert.equal(
    hasCompanyContextMismatch({
      activeCompanyId: "entreprise2",
      path: "C:\\ProgramData\\Facturance\\FacturanceData\\entreprise1\\pdf\\Fact-0001.pdf"
    }),
    true
  );
  assert.equal(
    hasCompanyContextMismatch({
      activeCompanyId: "entreprise2",
      path: "C:\\ProgramData\\Facturance\\FacturanceData\\entreprise2\\pdf\\Fact-0001.pdf"
    }),
    false
  );
});

test("getCompanyPaths resolves explicit company without mutating persisted default active company", () => {
  withTempWorkspace(({ userDataDir, dataRoot }) => {
    CompanyManager.configure({
      getUserDataDir: () => userDataDir
    });
    const beforeActive = CompanyManager.getActiveCompanyId(dataRoot);
    const created = CompanyManager.createCompany(dataRoot, { setActive: false });
    assert.notEqual(created.id, beforeActive);

    const explicitPaths = CompanyManager.getCompanyPaths(dataRoot, created.id);
    const afterActive = CompanyManager.getActiveCompanyId(dataRoot);

    assert.equal(explicitPaths.id, created.id);
    assert.equal(afterActive, beforeActive);
  });
});

test("FactDb runWithContext isolates company-scoped settings between two companies", (t) => {
  withTempWorkspace(({ userDataDir, dataRoot }) => {
    CompanyManager.configure({
      getUserDataDir: () => userDataDir
    });
    CompanyManager.createCompany(dataRoot, { setActive: false });
    CompanyManager.createCompany(dataRoot, { setActive: false });
    const companyOne = CompanyManager.getCompanyPaths(dataRoot, "entreprise1");
    const companyTwo = CompanyManager.getCompanyPaths(dataRoot, "entreprise2");

    FactDb.configure({
      getRootDir: () => companyOne.companyDir,
      filename: companyOne.dbFileName
    });
    try {
      FactDb.resetConnection();
    } catch (err) {
      if (isNativeSqliteUnavailableError(err)) {
        t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
        return;
      }
      throw err;
    }

    try {
      const settingKey = "company-context-regression";
      FactDb.runWithContext(
        { rootDir: companyOne.companyDir, filename: companyOne.dbFileName },
        () => FactDb.saveSetting({ key: settingKey, value: { owner: "company-one" } })
      );
      FactDb.runWithContext(
        { rootDir: companyTwo.companyDir, filename: companyTwo.dbFileName },
        () => FactDb.saveSetting({ key: settingKey, value: { owner: "company-two" } })
      );

      const valueOne = FactDb.runWithContext(
        { rootDir: companyOne.companyDir, filename: companyOne.dbFileName },
        () => FactDb.loadSetting(settingKey)
      );
      const valueTwo = FactDb.runWithContext(
        { rootDir: companyTwo.companyDir, filename: companyTwo.dbFileName },
        () => FactDb.loadSetting(settingKey)
      );

      assert.equal(valueOne?.value?.owner, "company-one");
      assert.equal(valueTwo?.value?.owner, "company-two");
    } catch (err) {
      if (isNativeSqliteUnavailableError(err)) {
        t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
        return;
      }
      throw err;
    }
  });
});

test("FactDb runWithContext preserves async company isolation for concurrent requests", async (t) => {
  await withTempWorkspace(async ({ userDataDir, dataRoot }) => {
    CompanyManager.configure({
      getUserDataDir: () => userDataDir
    });
    CompanyManager.createCompany(dataRoot, { setActive: false });
    CompanyManager.createCompany(dataRoot, { setActive: false });
    const companyOne = CompanyManager.getCompanyPaths(dataRoot, "entreprise1");
    const companyTwo = CompanyManager.getCompanyPaths(dataRoot, "entreprise2");

    FactDb.configure({
      getRootDir: () => companyOne.companyDir,
      filename: companyOne.dbFileName
    });
    try {
      FactDb.resetConnection();
    } catch (err) {
      if (isNativeSqliteUnavailableError(err)) {
        t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
        return;
      }
      throw err;
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const [dbPathOne, dbPathTwo] = await Promise.all([
        FactDb.runWithContext(
          { rootDir: companyOne.companyDir, filename: companyOne.dbFileName },
          async () => {
            await sleep(25);
            FactDb.saveSetting({ key: "async-company-marker", value: { owner: "company-one" } });
            return FactDb.getDatabasePath();
          }
        ),
        FactDb.runWithContext(
          { rootDir: companyTwo.companyDir, filename: companyTwo.dbFileName },
          async () => {
            await sleep(5);
            FactDb.saveSetting({ key: "async-company-marker", value: { owner: "company-two" } });
            return FactDb.getDatabasePath();
          }
        )
      ]);

      assert.notEqual(dbPathOne, dbPathTwo);

      const markerOne = FactDb.runWithContext(
        { rootDir: companyOne.companyDir, filename: companyOne.dbFileName },
        () => FactDb.loadSetting("async-company-marker")
      );
      const markerTwo = FactDb.runWithContext(
        { rootDir: companyTwo.companyDir, filename: companyTwo.dbFileName },
        () => FactDb.loadSetting("async-company-marker")
      );

      assert.equal(markerOne?.value?.owner, "company-one");
      assert.equal(markerTwo?.value?.owner, "company-two");
    } catch (err) {
      if (isNativeSqliteUnavailableError(err)) {
        t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
        return;
      }
      throw err;
    }
  });
});
