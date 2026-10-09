-- AlterTable
ALTER TABLE "DailyReport" ADD COLUMN "contractorName" TEXT;

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
    "rate" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "lineType" TEXT NOT NULL DEFAULT 'auto',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PayslipEarningLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayslipEarningLine" ("amount", "hours", "id", "lineType", "memo", "payslipId", "rate", "siteName", "sortOrder", "workType") SELECT "amount", "hours", "id", "lineType", "memo", "payslipId", "rate", "siteName", "sortOrder", "workType" FROM "PayslipEarningLine";
DROP TABLE "PayslipEarningLine";
ALTER TABLE "new_PayslipEarningLine" RENAME TO "PayslipEarningLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
