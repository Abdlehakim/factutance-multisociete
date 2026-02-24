CREATE TABLE IF NOT EXISTS "client_fields" (
  "client_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  PRIMARY KEY (client_id, path),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_fields_path ON client_fields (path);

CREATE INDEX IF NOT EXISTS idx_client_fields_path_value ON client_fields (path, value);

