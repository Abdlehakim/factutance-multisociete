CREATE TABLE IF NOT EXISTS "client_ledger" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL,
  "tax_id" TEXT,
  "created_at" TEXT,
  "effective_date" TEXT,
  "type" TEXT,
  "amount" REAL,
  "source" TEXT,
  "source_id" TEXT,
  "invoice_path" TEXT,
  "invoice_number" TEXT,
  "payment_mode" TEXT,
  "payment_ref" TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_ledger_client_id ON client_ledger (client_id);

CREATE INDEX IF NOT EXISTS idx_client_ledger_created_at ON client_ledger (created_at);

CREATE INDEX IF NOT EXISTS idx_client_ledger_effective_date ON client_ledger (effective_date);

