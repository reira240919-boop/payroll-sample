-- CreateTable
CREATE TABLE "InvoiceOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceOption_type_name_key" ON "InvoiceOption"("type", "name");

-- SeedData
INSERT INTO "InvoiceOption" ("id", "type", "name", "sortOrder") VALUES
  ('invopt-unit-hour', 'unit', '時間', 0),
  ('invopt-unit-set', 'unit', '式', 1),
  ('invopt-unit-piece', 'unit', '個', 2),
  ('invopt-unit-trip', 'unit', '往復', 3),
  ('invopt-unit-day', 'unit', '工', 4);
