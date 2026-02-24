CREATE TABLE IF NOT EXISTS "app_setting_fields" (
  "setting_key" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  PRIMARY KEY (setting_key, path),
  FOREIGN KEY (setting_key) REFERENCES app_settings(key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_setting_fields_path ON app_setting_fields (path);

