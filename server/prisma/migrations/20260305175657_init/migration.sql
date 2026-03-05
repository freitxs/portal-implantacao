BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'CLIENT',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expiresAt] DATETIME2 NOT NULL,
    CONSTRAINT [RefreshSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OnboardingForm] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [OnboardingForm_status_df] DEFAULT 'RASCUNHO',
    [currentStep] INT NOT NULL CONSTRAINT [OnboardingForm_currentStep_df] DEFAULT 0,
    [stepData] NVARCHAR(1000) NOT NULL CONSTRAINT [OnboardingForm_stepData_df] DEFAULT '{}',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OnboardingForm_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OnboardingForm_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OnboardingUser] (
    [id] NVARCHAR(1000) NOT NULL,
    [formId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OnboardingUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OnboardingUser_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PricingTable] (
    [id] NVARCHAR(1000) NOT NULL,
    [formId] NVARCHAR(1000) NOT NULL,
    [sector] NVARCHAR(1000) NOT NULL,
    [regime] NVARCHAR(1000) NOT NULL,
    [rows] NVARCHAR(1000) NOT NULL CONSTRAINT [PricingTable_rows_df] DEFAULT '[]',
    [updatedAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PricingTable_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PricingTable_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PricingTable_formId_sector_regime_key] UNIQUE NONCLUSTERED ([formId],[sector],[regime])
);

-- CreateTable
CREATE TABLE [dbo].[Upload] (
    [id] NVARCHAR(1000) NOT NULL,
    [formId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [filename] NVARCHAR(1000) NOT NULL,
    [path] NVARCHAR(1000) NOT NULL,
    [mimetype] NVARCHAR(1000) NOT NULL,
    [size] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Upload_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Upload_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Upload_formId_type_key] UNIQUE NONCLUSTERED ([formId],[type])
);

-- CreateTable
CREATE TABLE [dbo].[SaveHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [formId] NVARCHAR(1000) NOT NULL,
    [stepIndex] INT NOT NULL,
    [savedAt] DATETIME2 NOT NULL CONSTRAINT [SaveHistory_savedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SaveHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PricingTemplate] (
    [id] NVARCHAR(1000) NOT NULL,
    [sector] NVARCHAR(1000) NOT NULL,
    [regime] NVARCHAR(1000) NOT NULL,
    [rows] NVARCHAR(1000) NOT NULL CONSTRAINT [PricingTemplate_rows_df] DEFAULT '[]',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PricingTemplate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PricingTemplate_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PricingTemplate_sector_regime_key] UNIQUE NONCLUSTERED ([sector],[regime])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_userId_idx] ON [dbo].[RefreshSession]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OnboardingForm_userId_idx] ON [dbo].[OnboardingForm]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OnboardingForm_status_idx] ON [dbo].[OnboardingForm]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OnboardingUser_formId_idx] ON [dbo].[OnboardingUser]([formId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PricingTable_regime_idx] ON [dbo].[PricingTable]([regime]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PricingTable_sector_idx] ON [dbo].[PricingTable]([sector]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaveHistory_formId_savedAt_idx] ON [dbo].[SaveHistory]([formId], [savedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshSession] ADD CONSTRAINT [RefreshSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OnboardingForm] ADD CONSTRAINT [OnboardingForm_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OnboardingUser] ADD CONSTRAINT [OnboardingUser_formId_fkey] FOREIGN KEY ([formId]) REFERENCES [dbo].[OnboardingForm]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PricingTable] ADD CONSTRAINT [PricingTable_formId_fkey] FOREIGN KEY ([formId]) REFERENCES [dbo].[OnboardingForm]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Upload] ADD CONSTRAINT [Upload_formId_fkey] FOREIGN KEY ([formId]) REFERENCES [dbo].[OnboardingForm]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SaveHistory] ADD CONSTRAINT [SaveHistory_formId_fkey] FOREIGN KEY ([formId]) REFERENCES [dbo].[OnboardingForm]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
