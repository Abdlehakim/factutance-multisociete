CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY,
  "document_type" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "document_number" TEXT,
  "line_identity" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "depot_id" TEXT,
  "emplacement_id" TEXT,
  "qty_delta" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'applied',
  "movement_timestamp" TEXT NOT NULL,
  "batch_hash" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT,
  "reversed_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_stock_movements_document" ON "stock_movements" ("document_type", "document_id");
CREATE INDEX IF NOT EXISTS "idx_stock_movements_article" ON "stock_movements" ("article_id");
CREATE INDEX IF NOT EXISTS "idx_stock_movements_location" ON "stock_movements" ("article_id", "depot_id", "emplacement_id");
CREATE INDEX IF NOT EXISTS "idx_stock_movements_status" ON "stock_movements" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_movements_active_line_unique" ON "stock_movements" ("document_id", "line_identity") WHERE status = 'applied';
