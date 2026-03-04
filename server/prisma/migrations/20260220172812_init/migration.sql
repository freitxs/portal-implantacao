-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "stepData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "rows" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingTable_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaveHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaveHistory_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sector" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "rows" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE INDEX "OnboardingForm_userId_idx" ON "OnboardingForm"("userId");

-- CreateIndex
CREATE INDEX "OnboardingForm_status_idx" ON "OnboardingForm"("status");

-- CreateIndex
CREATE INDEX "PricingTable_regime_idx" ON "PricingTable"("regime");

-- CreateIndex
CREATE INDEX "PricingTable_sector_idx" ON "PricingTable"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTable_formId_sector_regime_key" ON "PricingTable"("formId", "sector", "regime");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_formId_type_key" ON "Upload"("formId", "type");

-- CreateIndex
CREATE INDEX "SaveHistory_formId_savedAt_idx" ON "SaveHistory"("formId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTemplate_sector_regime_key" ON "PricingTemplate"("sector", "regime");
