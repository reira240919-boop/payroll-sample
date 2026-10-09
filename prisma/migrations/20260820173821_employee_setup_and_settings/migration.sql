-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" REAL NOT NULL DEFAULT 0,
    "overtimeMultiplier" REAL NOT NULL DEFAULT 1.25,
    "closingDay" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "needsSetup" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "birthDate" DATETIME,
    "emergencyContactName" TEXT,
    "emergencyContactRelation" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Employee" ("active", "address", "birthDate", "closingDay", "createdAt", "email", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "hourlyRate", "id", "name", "overtimeMultiplier", "passwordHash", "phone", "postalCode", "role", "updatedAt") SELECT "active", "address", "birthDate", "closingDay", "createdAt", "email", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "hourlyRate", "id", "name", "overtimeMultiplier", "passwordHash", "phone", "postalCode", "role", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_name_key" ON "Employee"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
