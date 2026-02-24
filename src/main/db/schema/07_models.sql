CREATE TABLE IF NOT EXISTS "models" (
  "name" TEXT PRIMARY KEY,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS idx_models_updated_at ON models (updated_at);

