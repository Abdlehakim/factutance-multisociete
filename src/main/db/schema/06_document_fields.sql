CREATE TABLE IF NOT EXISTS "document_fields" (
  "document_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  PRIMARY KEY (document_id, path),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_fields_path ON document_fields (path);

