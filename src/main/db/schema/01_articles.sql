CREATE TABLE IF NOT EXISTS "articles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "ref" TEXT,
  "product" TEXT,
  "desc" TEXT,
  "qty" REAL,
  "stock_qty" REAL,
  "stock_min" REAL,
  "stock_alert" INTEGER,
  "stock_default_depot_id" TEXT,
  "stock_depots_json" TEXT,
  "stock_default_emplacement_id" TEXT,
  "stock_allow_negative" INTEGER NOT NULL DEFAULT 0,
  "stock_block_insufficient" INTEGER NOT NULL DEFAULT 1,
  "stock_alert_enabled" INTEGER NOT NULL DEFAULT 0,
  "stock_min_qty" INTEGER NOT NULL DEFAULT 0,
  "stock_max_qty" INTEGER,
  "unit" TEXT,
  "purchase_price" REAL,
  "purchase_tva" REAL,
  "purchase_discount" REAL DEFAULT 0,
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
  "use_ref" INTEGER,
  "use_product" INTEGER,
  "use_desc" INTEGER,
  "use_unit" INTEGER,
  "use_price" INTEGER,
  "use_fodec" INTEGER,
  "use_tva" INTEGER,
  "use_discount" INTEGER,
  "use_total_ht" INTEGER,
  "use_total_ttc" INTEGER,
  "search_text" TEXT,
  "ref_normalized" TEXT,
  "product_normalized" TEXT,
  "desc_normalized" TEXT,
  "legacy_path" TEXT UNIQUE,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_search_text ON articles (search_text);

CREATE INDEX IF NOT EXISTS idx_articles_ref_normalized ON articles (ref_normalized);

CREATE INDEX IF NOT EXISTS idx_articles_product_normalized ON articles (product_normalized);

CREATE INDEX IF NOT EXISTS idx_articles_desc_normalized ON articles (desc_normalized);

