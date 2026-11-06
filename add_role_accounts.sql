-- ============================================================
-- Adds the three new role accounts (Staff, Charge Nurse, Medical
-- Director) plus normalizes the seeded admin's role string, without
-- touching any other data. Safe to run on a database that already has
-- sql/DatabaseG07.sql imported — each INSERT is guarded with an
-- IF NOT EXISTS check (T-SQL has no INSERT IGNORE) so it won't error or
-- duplicate rows if it's ever run twice.
--
-- Run: SSMS > connect to your server > open this file > Execute (F5).
--
-- If you're setting up fresh instead, just run sql/DatabaseG07.sql —
-- it already includes these accounts, you don't need this file too.
-- ============================================================

USE wellmeadows;
GO

-- 'Administrator' -> 'Admin' so it matches the role strings the new
-- permission system checks (assets/js/permissions.js). Harmless if your
-- admin row is already 'Admin' or something else you've since changed.
UPDATE users SET role = 'Admin' WHERE [user] = 'admin' AND role = 'Administrator';
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'staff01')
BEGIN
    INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
    ('staff01', '$2b$10$szQuJYuGjUlpPO/Td6PDB.6MNQWbV.77bf8P6b8J90S3/sBa24jxK', 'Staff', 'Alex Carter', 'staff01@wellmeadows.example', '01506-100001', 'Ward Assistant');
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'nurse01')
BEGIN
    INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
    ('nurse01', '$2b$10$ONEZAxMWfloP8ulcaO0dR.wlaJq5NweIzFuysRDczfPXH.Lm7HKYi', 'Charge Nurse', 'Priya Shah', 'nurse01@wellmeadows.example', '01506-100002', 'Charge Nurse');
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'director01')
BEGIN
    INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
    ('director01', '$2b$10$A3p9/Aeu.l7o.DccsO/CYOVTDuAHYJpzaHD2bdHvZfO48dyTI98ue', 'Medical Director', 'Dr. James Whitfield', 'director01@wellmeadows.example', '01506-100003', 'Medical Director');
END
GO

-- Login credentials (plain text here only so you have them — the `pass`
-- column above stores bcrypt hashes, never the real password):
--   staff01    / Staff@2026     (role: Staff)
--   nurse01    / Nurse@2026     (role: Charge Nurse)
--   director01 / Director@2026  (role: Medical Director)
--   admin      / admin123       (role: Admin — already existed)
