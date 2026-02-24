CREATE TABLE IF NOT EXISTS "payment_history" (
  "id" TEXT PRIMARY KEY,
  "position" INTEGER NOT NULL,
  "paymentNumber" INTEGER,
  "entryType" TEXT,
  "invoiceNumber" TEXT,
  "invoicePath" TEXT,
  "clientName" TEXT,
  "clientAccount" TEXT,
  "clientPath" TEXT,
  "clientId" TEXT,
  "paymentDate" TEXT,
  "paymentRef" TEXT,
  "amount" REAL,
  "balanceDue" REAL,
  "currency" TEXT,
  "mode" TEXT,
  "savedAt" TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_history_position ON payment_history (position);

