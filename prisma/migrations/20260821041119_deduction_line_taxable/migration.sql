-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayslipDeductionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payslipId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "lineType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PayslipDeductionLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayslipDeductionLine" ("amount", "id", "itemName", "lineType", "memo", "payslipId", "sortOrder") SELECT "amount", "id", "itemName", "lineType", "memo", "payslipId", "sortOrder" FROM "PayslipDeductionLine";
DROP TABLE "PayslipDeductionLine";
ALTER TABLE "new_PayslipDeductionLine" RENAME TO "PayslipDeductionLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
