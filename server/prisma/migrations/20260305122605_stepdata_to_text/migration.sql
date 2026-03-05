-- CreateTable
CREATE TABLE "OnboardingUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingUser_formId_fkey" FOREIGN KEY ("formId") REFERENCES "OnboardingForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OnboardingUser_formId_idx" ON "OnboardingUser"("formId");
