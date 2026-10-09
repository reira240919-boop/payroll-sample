-- CreateTable
CREATE TABLE "PaydayOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PaydayOption_name_key" ON "PaydayOption"("name");

-- SeedData
INSERT INTO "PaydayOption" ("id", "name", "sortOrder") VALUES
  ('payday-seed-15', '15日', 0),
  ('payday-seed-25', '25日', 1),
  ('payday-seed-eom', '月末', 2);
