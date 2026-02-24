CREATE TABLE IF NOT EXISTS "model_fields" (
  "model_name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  PRIMARY KEY (model_name, path),
  FOREIGN KEY (model_name) REFERENCES models(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_model_fields_path ON model_fields (path);

