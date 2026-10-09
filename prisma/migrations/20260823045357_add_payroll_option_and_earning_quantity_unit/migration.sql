-- CreateTable
CREATE TABLE "PayrollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayslipEarningLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payslipId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "contractorName" TEXT,
    "workType" TEXT,
    "hours" REAL NOT NULL,
    "quantityUnit" TEXT NOT NULL DEFAULT '時間',
    "rate" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "lineType" TEXT NOT NULL DEFAULT 'auto',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PayslipEarningLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayslipEarningLine" ("amount", "contractorName", "hours", "id", "lineType", "memo", "payslipId", "rate", "siteName", "sortOrder", "taxable", "workType") SELECT "amount", "contractorName", "hours", "id", "lineType", "memo", "payslipId", "rate", "siteName", "sortOrder", "taxable", "workType" FROM "PayslipEarningLine";
DROP TABLE "PayslipEarningLine";
ALTER TABLE "new_PayslipEarningLine" RENAME TO "PayslipEarningLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PayrollOption_type_name_key" ON "PayrollOption"("type", "name");

-- SeedData
INSERT INTO "PayrollOption" ("id", "type", "name", "sortOrder") VALUES
  ('payropt-qtyunit-hour', 'quantity_unit', '時間', 0),
  ('payropt-qtyunit-none', 'quantity_unit', '入力なし', 1);
