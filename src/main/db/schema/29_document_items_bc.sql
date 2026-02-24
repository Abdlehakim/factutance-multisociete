CREATE TABLE IF NOT EXISTS "document_items_bc" (
  "document_id" TEXT NOT NULL,
  "position" INTEGER,
  "ref" TEXT,
  "product" TEXT,
  "desc" TEXT,
  "qty" REAL,
  "unit" TEXT,
  "purchase_price" REAL,
  "purchase_tva" REAL,
  "price" REAL,
  "tva" REAL,
  "discount" REAL,
  "fodec_enabled" INTEGER,
  "fodec_label" TEXT,
  "fodec_rate" REAL,
  "fodec_tva" REAL,
  "purchase_fodec_enabled" INTEGER,
  "purchase_fodec_label" TEXT,
  "purchase_fodec_rate" REAL,
  "purchase_fodec_tva" REAL,
  "article_path" TEXT,
  PRIMARY KEY (document_id, position)
);

CREATE INDEX IF NOT EXISTS "idx_document_items_bc_document_id" ON "document_items_bc" ("document_id");

