CREATE TABLE IF NOT EXISTS "counters" (
  "doc_type" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "last_number" INTEGER NOT NULL,
  "updated_at" TEXT,
  PRIMARY KEY (doc_type, period)
);

