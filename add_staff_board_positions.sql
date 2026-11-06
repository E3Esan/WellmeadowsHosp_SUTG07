-- Add saved dashboard board coordinates to an existing Wellmeadows database.
-- Coordinates are percentages within the staff member's ward space.
-- T-SQL has no "ADD COLUMN IF NOT EXISTS", so check sys.columns first.
USE wellmeadows;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('staff') AND name = 'boardX')
BEGIN
    ALTER TABLE staff ADD boardX DECIMAL(6,2) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('staff') AND name = 'boardY')
BEGIN
    ALTER TABLE staff ADD boardY DECIMAL(6,2) NULL;
END
GO
