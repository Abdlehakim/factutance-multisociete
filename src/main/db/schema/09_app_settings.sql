CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT PRIMARY KEY,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings (updated_at);

