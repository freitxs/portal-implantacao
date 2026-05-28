/*
  Warnings:

  - Added the required column `updatedAt` to the `Upload` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVADO',
    "createdByUserId" TEXT NOT NULL,
    "externalCalendarProvider" TEXT,
    "externalCalendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StageAcceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONCLUIDA',
    "version" INTEGER NOT NULL,
    "summarySnapshot" TEXT NOT NULL,
    "acceptedByUserId" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageAcceptance_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StageAcceptance_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImplementationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImplementationLog_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImplementationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "uploadId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileLog_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileLog_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NAO_ENVIADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Upload_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Upload" ("createdAt", "filename", "formId", "id", "mimetype", "path", "size", "type") SELECT "createdAt", "filename", "formId", "id", "mimetype", "path", "size", "type" FROM "Upload";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
CREATE UNIQUE INDEX "Upload_formId_type_key" ON "Upload"("formId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_formId_key" ON "Appointment"("formId");

-- CreateIndex
CREATE INDEX "Appointment_startAt_endAt_idx" ON "Appointment"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_createdByUserId_idx" ON "Appointment"("createdByUserId");

-- CreateIndex
CREATE INDEX "StageAcceptance_formId_stageKey_acceptedAt_idx" ON "StageAcceptance"("formId", "stageKey", "acceptedAt");

-- CreateIndex
CREATE INDEX "StageAcceptance_acceptedByUserId_acceptedAt_idx" ON "StageAcceptance"("acceptedByUserId", "acceptedAt");

-- CreateIndex
CREATE INDEX "ImplementationLog_formId_createdAt_idx" ON "ImplementationLog"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "ImplementationLog_userId_createdAt_idx" ON "ImplementationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImplementationLog_entityType_createdAt_idx" ON "ImplementationLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "FileLog_formId_createdAt_idx" ON "FileLog"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "FileLog_uploadId_createdAt_idx" ON "FileLog"("uploadId", "createdAt");

-- CreateIndex
CREATE INDEX "FileLog_type_createdAt_idx" ON "FileLog"("type", "createdAt");
