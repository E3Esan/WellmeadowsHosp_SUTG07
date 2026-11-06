-- Add the full bed-monitor ward set to an existing Wellmeadows database.
-- Existing patient bed assignments are preserved. Ward 11 has seeded occupied
-- bed numbers in the 80s, so its capacity must cover bed 87 as well as the
-- normal minimum of 20 beds.
USE wellmeadows;
GO

INSERT INTO ward (number, name, location, beds, extn)
SELECT 1, 'Emergency', 'Main Building', 20, '7701'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 1);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 2, 'Medical', 'Main Building', 20, '7702'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 2);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 3, 'Surgical', 'Main Building', 20, '7703'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 3);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 4, 'Paediatric', 'North Wing', 20, '7704'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 4);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 5, 'Maternity', 'North Wing', 20, '7705'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 5);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 6, 'Oncology', 'North Wing', 20, '7706'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 6);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 7, 'Neurology', 'South Wing', 20, '7707'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 7);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 8, 'Intensive Care Unit', 'South Wing', 20, '7708'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 8);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 9, 'Rehabilitation', 'South Wing', 20, '7709'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 9);

INSERT INTO ward (number, name, location, beds, extn)
SELECT 10, 'Geriatric', 'South Wing', 20, '7710'
WHERE NOT EXISTS (SELECT 1 FROM ward WHERE number = 10);
GO

-- T-SQL has no GREATEST() before SQL Server 2022, so use IIF for broad
-- compatibility with SQL Server Express / older versions.
UPDATE ward SET beds = IIF(beds < 87, 87, beds) WHERE number = 11;
UPDATE ward SET beds = IIF(beds < 20, 20, beds) WHERE number = 12;
GO
