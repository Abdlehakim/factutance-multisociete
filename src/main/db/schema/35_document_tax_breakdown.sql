CREATE TABLE IF NOT EXISTS "document_tax_breakdown" (
  "document_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "position" INTEGER,
  "rate" REAL,
  "tva_rate" REAL,
  "base" REAL,
  "ht" REAL,
  "tva" REAL,
  "fodec" REAL,
  "fodec_tva" REAL,
  PRIMARY KEY (document_id, kind, position)
);

CREATE INDEX IF NOT EXISTS idx_doc_tax_breakdown_doc ON document_tax_breakdown (document_id);

