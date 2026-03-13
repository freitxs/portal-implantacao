BEGIN TRY

BEGIN TRAN;

-- This migration originated in SQLite. Keep it SQL Server-safe and idempotent.
IF OBJECT_ID(N'[dbo].[OnboardingUser]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OnboardingUser] (
        [id] NVARCHAR(1000) NOT NULL,
        [formId] NVARCHAR(1000) NOT NULL,
        [name] NVARCHAR(1000) NOT NULL,
        [email] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [OnboardingUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [OnboardingUser_pkey] PRIMARY KEY CLUSTERED ([id])
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'OnboardingUser_formId_idx'
      AND object_id = OBJECT_ID(N'[dbo].[OnboardingUser]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [OnboardingUser_formId_idx] ON [dbo].[OnboardingUser]([formId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'OnboardingUser_formId_fkey'
      AND parent_object_id = OBJECT_ID(N'[dbo].[OnboardingUser]')
)
BEGIN
    ALTER TABLE [dbo].[OnboardingUser]
    ADD CONSTRAINT [OnboardingUser_formId_fkey]
    FOREIGN KEY ([formId]) REFERENCES [dbo].[OnboardingForm]([id])
    ON DELETE CASCADE
    ON UPDATE CASCADE;
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
