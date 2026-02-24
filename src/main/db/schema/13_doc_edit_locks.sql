CREATE TABLE IF NOT EXISTS "doc_edit_locks" (
  "doc_key" TEXT PRIMARY KEY,
  "lock_id" TEXT NOT NULL,
  "instance_id" TEXT NOT NULL,
  "acquired_at" INTEGER NOT NULL,
  "last_seen" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_edit_locks_last_seen ON doc_edit_locks (last_seen);

