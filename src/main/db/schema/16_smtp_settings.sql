CREATE TABLE IF NOT EXISTS "smtp_settings" (
  "preset" TEXT PRIMARY KEY,
  "enabled" INTEGER,
  "host" TEXT,
  "port" INTEGER,
  "secure" INTEGER,
  "user" TEXT,
  "pass" TEXT,
  "from_email" TEXT,
  "from_name" TEXT,
  "updated_at" TEXT
);

