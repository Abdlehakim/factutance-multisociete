CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "name" TEXT,
  "client_type" TEXT,
  "benefit" TEXT,
  "account" TEXT,
  "account_normalized" TEXT,
  "vat" TEXT,
  "identifiant_fiscal" TEXT,
  "cin" TEXT,
  "passport" TEXT,
  "steg_ref" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "sold_client" TEXT,
  "search_text" TEXT,
  "legacy_path" TEXT UNIQUE,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_search_text ON clients (search_text);

CREATE INDEX IF NOT EXISTS idx_clients_account_normalized ON clients (account_normalized);

