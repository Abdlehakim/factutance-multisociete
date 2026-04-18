"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const FactDb = require("../../src/main/db");

function isNativeSqliteUnavailableError(err) {
  const text = String(err?.message || err || "");
  return (
    err?.code === "ERR_DLOPEN_FAILED" ||
    text.includes("better_sqlite3.node") ||
    text.includes("NODE_MODULE_VERSION")
  );
}

function withTempDatabase(t, fn) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "facturance-stock-movement-"));
  const companyDir = path.join(workspaceRoot, "entreprise1");
  fs.mkdirSync(companyDir, { recursive: true });
  FactDb.configure({
    getRootDir: () => companyDir,
    filename: "entreprise1.db"
  });
  const cleanup = () => {
    try {
      FactDb.resetConnection();
    } catch {
      // ignore cleanup failures in tests
    }
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  };
  try {
    FactDb.resetConnection();
  } catch (err) {
    if (isNativeSqliteUnavailableError(err)) {
      cleanup();
      t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
      return;
    }
    cleanup();
    throw err;
  }

  let result;
  try {
    result = fn({ workspaceRoot, companyDir });
  } catch (err) {
    if (isNativeSqliteUnavailableError(err)) {
      cleanup();
      t.skip("better-sqlite3 is not built for this Node runtime; run under Electron ABI.");
      return;
    }
    cleanup();
    throw err;
  }
  if (result && typeof result.then === "function") {
    return result.finally(() => cleanup());
  }
  cleanup();
  return result;
}

function createFixture({
  allowNegative = false,
  blockInsufficient = true
} = {}) {
  const savedDepot = FactDb.saveDepot({
    depot: {
      name: "Depot Principal",
      emplacements: [{ code: "E1" }, { code: "E2" }]
    }
  });
  const depot = FactDb.getDepotById(savedDepot?.id);
  const emplacementsByCode = new Map(
    (Array.isArray(depot?.emplacements) ? depot.emplacements : []).map((entry) => [
      String(entry?.code || "").trim(),
      String(entry?.id || "").trim()
    ])
  );
  const depotId = String(depot?.id || "").trim();
  const locationOneId = emplacementsByCode.get("E1") || "";
  const locationTwoId = emplacementsByCode.get("E2") || "";
  if (!depotId || !locationOneId || !locationTwoId) {
    throw new Error("Fixture depot/emplacements creation failed.");
  }

  const articleResult = FactDb.saveArticle({
    suggestedName: "Article Stock Test",
    article: {
      ref: "ART-STK-1",
      product: "Article Stock Test",
      qty: 1,
      stockQty: 0,
      allowNegative,
      blockInsufficient,
      depots: [
        {
          id: "depot-1",
          name: "Depot 1",
          linkedDepotId: depotId,
          stockQty: 0,
          selectedLocationIds: [locationOneId, locationTwoId],
          selectedEmplacementIds: [locationOneId, locationTwoId]
        }
      ],
      activeDepotId: "depot-1",
      selectedDepotId: "depot-1",
      selectedEmplacements: [locationOneId]
    }
  });
  const articlePath = String(articleResult?.path || "").trim();
  const articleId = FactDb.parseArticleIdFromPath(articlePath) || "";
  if (!articleId) {
    throw new Error("Fixture article creation failed.");
  }
  return {
    articleId,
    articlePath,
    depotId,
    locationOneId,
    locationTwoId,
    locationOneLabel: "E1",
    locationTwoLabel: "E2"
  };
}

function getArticleSnapshot(articleId) {
  const row = FactDb.getArticleById(articleId);
  if (!row || !row.article) throw new Error(`Article not found: ${articleId}`);
  return row.article;
}

function getDepotStock(article, depotId) {
  const safeDepotId = String(depotId || "").trim().toLowerCase();
  const depots = Array.isArray(article?.depots) ? article.depots : [];
  const match = depots.find((entry) => {
    const linked = String(entry?.linkedDepotId || "").trim().toLowerCase();
    return linked === safeDepotId;
  });
  return Number(match?.stockQty ?? 0) || 0;
}

function buildStockPayload({
  docType,
  articlePath,
  qty,
  depotId,
  emplacementId,
  emplacementLabel
} = {}) {
  const normalizedDocType = String(docType || "").trim().toLowerCase();
  const meta = {
    docType: normalizedDocType,
    date: "2026-03-29"
  };
  if (normalizedDocType === "be") {
    meta.beReception = {
      depotId,
      destinationId: emplacementId,
      destinationIds: [emplacementId],
      destinationLabels: [emplacementLabel],
      destination: emplacementLabel
    };
    meta.beReceptionDepotId = depotId;
    meta.beReceptionDestinationId = emplacementId;
    meta.beReceptionDestinationIds = [emplacementId];
    meta.beReceptionDestination = emplacementLabel;
  } else if (normalizedDocType === "bs") {
    meta.bsSortie = {
      depotId,
      locationId: emplacementId,
      locationIds: [emplacementId],
      locationLabels: [emplacementLabel],
      location: emplacementLabel
    };
    meta.bsDepotId = depotId;
    meta.bsLocationId = emplacementId;
    meta.bsLocationIds = [emplacementId];
    meta.bsLocation = emplacementLabel;
  }
  return {
    meta,
    items: [
      {
        ref: "ART-STK-1",
        product: "Article Stock Test",
        qty,
        unit: "u",
        __articlePath: articlePath
      }
    ],
    totals: {}
  };
}

function buildNonStockPayload({
  articlePath,
  qty
} = {}) {
  return {
    meta: {
      docType: "facture",
      date: "2026-03-29"
    },
    items: [
      {
        ref: "ART-STK-1",
        product: "Article Stock Test",
        qty,
        unit: "u",
        __articlePath: articlePath
      }
    ],
    totals: {}
  };
}

function saveDocument({
  docType,
  payload,
  status = "valide",
  number = "",
  allowExisting = false
} = {}) {
  return FactDb.saveDocumentWithNumber({
    docType,
    date: "2026-03-29",
    data: payload,
    status,
    number,
    allowExisting
  });
}

test("BE create increases stock", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const res = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 5,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(res.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 5);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 5);
  });
});

test("Converted FA to BE with depot applies stock", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const payload = buildStockPayload({
      docType: "be",
      articlePath: fixture.articlePath,
      qty: 4,
      depotId: fixture.depotId,
      emplacementId: fixture.locationOneId,
      emplacementLabel: fixture.locationOneLabel
    });
    payload.meta.convertedFrom = {
      docType: "fa",
      type: "fa",
      number: "FA_20260329-1"
    };
    payload.meta.beReception = {
      ...(payload.meta.beReception || {}),
      date: "2026-03-29",
      time: "09:00",
      sourceRef: "Facture d'achat : FA_20260329-1"
    };

    const res = saveDocument({
      docType: "be",
      payload
    });

    assert.equal(res.ok, true);
    assert.equal(res.stockAdjusted, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 4);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 4);
  });
});

test("Converted FA to BE without depot is rejected", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const payload = buildStockPayload({
      docType: "be",
      articlePath: fixture.articlePath,
      qty: 4,
      depotId: "",
      emplacementId: "",
      emplacementLabel: ""
    });
    payload.meta.convertedFrom = {
      docType: "fa",
      type: "fa",
      number: "FA_20260329-1"
    };
    payload.meta.beReception = {
      ...(payload.meta.beReception || {}),
      date: "2026-03-29",
      time: "09:00",
      sourceRef: "Facture d'achat : FA_20260329-1"
    };

    const res = saveDocument({
      docType: "be",
      payload
    });

    assert.equal(res.ok, false);
    assert.match(String(res.error || ""), /depot de destination requis/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("Non-converted BE without depot is still rejected", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const res = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 4,
        depotId: "",
        emplacementId: "",
        emplacementLabel: ""
      })
    });

    assert.equal(res.ok, false);
    assert.match(String(res.error || ""), /depot de destination requis/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("BS create decreases stock", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const beRes = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 8,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(beRes.ok, true);
    const bsRes = saveDocument({
      docType: "bs",
      payload: buildStockPayload({
        docType: "bs",
        articlePath: fixture.articlePath,
        qty: 3,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(bsRes.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 5);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 5);
  });
});

test("Converted Facture to BS with depot applies stock exit", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const beRes = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 8,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(beRes.ok, true);

    const payload = buildStockPayload({
      docType: "bs",
      articlePath: fixture.articlePath,
      qty: 3,
      depotId: fixture.depotId,
      emplacementId: fixture.locationOneId,
      emplacementLabel: fixture.locationOneLabel
    });
    payload.meta.convertedFrom = {
      docType: "facture",
      type: "facture",
      number: "Fact_20260329-1"
    };
    payload.meta.bsSortie = {
      ...(payload.meta.bsSortie || {}),
      date: "2026-03-29",
      time: "09:00",
      sourceRef: "Facture : Fact_20260329-1",
      sourceDocType: "facture"
    };

    const bsRes = saveDocument({
      docType: "bs",
      payload
    });

    assert.equal(bsRes.ok, true);
    assert.equal(bsRes.stockAdjusted, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 5);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 5);
  });
});

test("Converted Facture to BS without source depot is rejected", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const payload = buildStockPayload({
      docType: "bs",
      articlePath: fixture.articlePath,
      qty: 2,
      depotId: "",
      emplacementId: "",
      emplacementLabel: ""
    });
    payload.meta.convertedFrom = {
      docType: "facture",
      type: "facture",
      number: "Fact_20260329-1"
    };
    payload.meta.bsSortie = {
      ...(payload.meta.bsSortie || {}),
      date: "2026-03-29",
      time: "09:00",
      sourceRef: "Facture : Fact_20260329-1",
      sourceDocType: "facture"
    };

    const res = saveDocument({
      docType: "bs",
      payload
    });

    assert.equal(res.ok, false);
    assert.match(String(res.error || ""), /depot source requis/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("Converted Facture to BS propagates insufficient stock failure", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture({
      allowNegative: false,
      blockInsufficient: true
    });
    const payload = buildStockPayload({
      docType: "bs",
      articlePath: fixture.articlePath,
      qty: 1,
      depotId: fixture.depotId,
      emplacementId: fixture.locationOneId,
      emplacementLabel: fixture.locationOneLabel
    });
    payload.meta.convertedFrom = {
      docType: "facture",
      type: "facture",
      number: "Fact_20260329-1"
    };
    payload.meta.bsSortie = {
      ...(payload.meta.bsSortie || {}),
      date: "2026-03-29",
      time: "09:00",
      sourceRef: "Facture : Fact_20260329-1",
      sourceDocType: "facture"
    };

    const res = saveDocument({
      docType: "bs",
      payload
    });

    assert.equal(res.ok, false);
    assert.equal(res.reason, "insufficient_stock");
    assert.match(String(res.error || ""), /Stock insuffisant/i);
    assert.match(String(res.error || ""), /ART-STK-1/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("BS blocked when insufficient and negative stock is not allowed", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture({
      allowNegative: false,
      blockInsufficient: true
    });
    const res = saveDocument({
      docType: "bs",
      payload: buildStockPayload({
        docType: "bs",
        articlePath: fixture.articlePath,
        qty: 1,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.reason, "insufficient_stock");
    assert.match(String(res.error || ""), /Stock insuffisant/i);
    assert.match(String(res.error || ""), /ART-STK-1/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
  });
});

test("BS allowed when allowNegative is enabled", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture({
      allowNegative: true,
      blockInsufficient: true
    });
    const res = saveDocument({
      docType: "bs",
      payload: buildStockPayload({
        docType: "bs",
        articlePath: fixture.articlePath,
        qty: 2,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(res.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), -2);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), -2);
  });
});

test("Edit of validated BE reverses old movement then applies new quantity", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const firstSave = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 10,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(firstSave.ok, true);
    const secondSave = saveDocument({
      docType: "be",
      number: firstSave.number,
      allowExisting: true,
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 4,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(secondSave.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 4);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 4);
  });
});

test("Delete reverses stock movement", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const created = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 6,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(created.ok, true);
    const deleted = FactDb.deleteDocumentByNumber(created.number);
    assert.equal(deleted.ok, true);
    assert.equal(deleted.restoredStock, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("Non-stock documents do not affect stock", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const res = saveDocument({
      docType: "facture",
      status: "payee",
      payload: buildNonStockPayload({
        articlePath: fixture.articlePath,
        qty: 9
      })
    });
    assert.equal(res.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 0);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 0);
  });
});

test("Per-depot/emplacement stock is enforced for BS validation", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture({
      allowNegative: false,
      blockInsufficient: true
    });
    const beRes = saveDocument({
      docType: "be",
      payload: buildStockPayload({
        docType: "be",
        articlePath: fixture.articlePath,
        qty: 5,
        depotId: fixture.depotId,
        emplacementId: fixture.locationOneId,
        emplacementLabel: fixture.locationOneLabel
      })
    });
    assert.equal(beRes.ok, true);
    const bsRes = saveDocument({
      docType: "bs",
      payload: buildStockPayload({
        docType: "bs",
        articlePath: fixture.articlePath,
        qty: 1,
        depotId: fixture.depotId,
        emplacementId: fixture.locationTwoId,
        emplacementLabel: fixture.locationTwoLabel
      })
    });
    assert.equal(bsRes.ok, false);
    assert.equal(bsRes.reason, "insufficient_stock");
    assert.match(String(bsRes.error || ""), /E2/i);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 5);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 5);
  });
});

test("Duplicate save/finalize does not duplicate movement application", (t) => {
  withTempDatabase(t, () => {
    const fixture = createFixture();
    const payload = buildStockPayload({
      docType: "be",
      articlePath: fixture.articlePath,
      qty: 3,
      depotId: fixture.depotId,
      emplacementId: fixture.locationOneId,
      emplacementLabel: fixture.locationOneLabel
    });
    const firstSave = saveDocument({
      docType: "be",
      payload
    });
    assert.equal(firstSave.ok, true);
    const secondSave = saveDocument({
      docType: "be",
      number: firstSave.number,
      allowExisting: true,
      payload
    });
    assert.equal(secondSave.ok, true);
    const finalizeAgain = FactDb.updateDocumentStatus(firstSave.number, "valide");
    assert.equal(finalizeAgain.ok, true);
    const article = getArticleSnapshot(fixture.articleId);
    assert.equal(Number(article.stockQty), 3);
    assert.equal(Number(getDepotStock(article, fixture.depotId)), 3);
  });
});
