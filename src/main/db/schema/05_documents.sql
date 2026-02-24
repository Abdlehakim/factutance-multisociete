CREATE TABLE IF NOT EXISTS "documents" (
  "id" TEXT PRIMARY KEY,
  "doc_type" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "period_key" TEXT,
  "number" TEXT NOT NULL UNIQUE,
  "idx" INTEGER,
  "custom_number" TEXT,
  "status" TEXT,
  "note_interne" TEXT,
  "converted_from_type" TEXT,
  "converted_from_id" TEXT,
  "converted_from_number" TEXT,
  "pdf_path" TEXT,
  "pdf_exported_at" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents (doc_type);

CREATE INDEX IF NOT EXISTS idx_documents_period ON documents (period);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type_period_idx ON documents (doc_type, period, idx);

CREATE INDEX IF NOT EXISTS idx_documents_converted_from ON documents (converted_from_type, converted_from_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_doc_type_period_key_idx ON documents (doc_type, period_key, idx);

