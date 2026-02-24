CREATE TABLE IF NOT EXISTS "article_fields" (
  "article_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  PRIMARY KEY (article_id, path),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_fields_path ON article_fields (path);

