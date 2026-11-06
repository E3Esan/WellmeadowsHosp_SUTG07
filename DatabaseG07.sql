-- ============================================================
-- Wellmeadows Hospital System — Database Schema (SQL Server / T-SQL)
-- Target: SQL Server 2016 or newer (Express is fine). Tested syntax for
--         2019 / 2022 / 2025.
--
-- Run:  SSMS > File > Open > this file > Execute (F5)
--   or: sqlcmd -S "localhost\SQLEXPRESS" -E -C -i sql\DatabaseG07.sql
--
-- !! This script DROPS and re-creates every table. Running it again resets
-- !! the database to the seed data. To keep existing data, use the
-- !! sql/add_*.sql upgrade scripts instead, and use
-- !! tools/migrate_mysql_to_mssql.php to copy data over from MySQL.
--
-- Type rules used (see MIGRATION-REPORT-G07.md, PART F):
--   text            -> NVARCHAR   (Unicode: Thai names, em-dashes, £ ...)
--   base64 files    -> VARCHAR(MAX) (pure ASCII, half the storage)
--   TIME / DATETIME -> TIME(0) / DATETIME2(0)  (so PHP gets "09:30:00",
--                      not "09:30:00.0000000", same as MySQL returned)
--   `file`          -> [file]     (FILE is a reserved word in T-SQL)
-- ============================================================

SET NOCOUNT ON;
GO

IF DB_ID(N'wellmeadows') IS NULL
BEGIN
    -- CI = case-insensitive logins/searches (same as MySQL), AI = accent-
    -- insensitive (same as utf8mb4_0900_ai_ci), SC = full Unicode support.
    CREATE DATABASE wellmeadows COLLATE Latin1_General_100_CI_AI_SC;
END
GO

USE wellmeadows;
GO

-- Re-runnable: drop in any order (there are no foreign keys).
DROP TABLE IF EXISTS users, ward, staff, patient, outpatient, appointment,
    medication, supply, pharma, requisition, supplier, bedQueue, leave_request;
GO

-- ---------- users (login + profile + settings) ----------
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  [user] NVARCHAR(50) NOT NULL CONSTRAINT uq_users_user UNIQUE,
  pass VARCHAR(255) NOT NULL,             -- password_hash(), never stored/returned as plain text
  role NVARCHAR(50) NOT NULL DEFAULT 'Personnel Officer',
  fullName NVARCHAR(120),
  email NVARCHAR(120),
  phone NVARCHAR(40),
  position NVARCHAR(120),
  info NVARCHAR(MAX),                      -- profile bio / notes
  avatar VARCHAR(MAX),                    -- base64 profile picture, same pattern as other file fields below
  theme NVARCHAR(10) DEFAULT 'light',
  density NVARCHAR(10) DEFAULT 'normal',   -- 'normal' | 'compact' table rows
  landingPage NVARCHAR(30) DEFAULT 'dashboard',
  created_at DATETIME2(0) DEFAULT SYSDATETIME(),
  last_login DATETIME2(0) NULL
);
GO

-- Seed accounts (bcrypt hashes; plain-text passwords listed for testing only)
--   admin        / admin123       Admin
--   Moiralnwza67 / ILoveMyDog     Charge Nurse
--   staff01      / Staff@2026     Staff
--   nurse01      / Nurse@2026     Charge Nurse
--   director01   / Director@2026  Medical Director
-- (All five hashes verified with PHP password_verify().)
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('admin',        '$2b$10$hMpz0WfakGtEI0/MQmpgqeP.4hKeQjkgNMQBnxWOPwYsyKBj6btf.', 'Admin',            'Administrator',       NULL, NULL, NULL),
('Moiralnwza67', '$2b$10$EKsx5y56NS1ODFcACk7VmeK.ZbnNg97OWI5bLKrIauBCccZfP6KkO', 'Charge Nurse',     'Moira Samuel',        NULL, NULL, NULL),
('staff01',      '$2b$10$szQuJYuGjUlpPO/Td6PDB.6MNQWbV.77bf8P6b8J90S3/sBa24jxK', 'Staff',            'Alex Carter',         'staff01@wellmeadows.example',    '01506-100001', 'Ward Assistant'),
('nurse01',      '$2b$10$ONEZAxMWfloP8ulcaO0dR.wlaJq5NweIzFuysRDczfPXH.Lm7HKYi', 'Charge Nurse',     'Priya Shah',          'nurse01@wellmeadows.example',    '01506-100002', 'Charge Nurse'),
('director01',   '$2b$10$A3p9/Aeu.l7o.DccsO/CYOVTDuAHYJpzaHD2bdHvZfO48dyTI98ue', 'Medical Director', 'Dr. James Whitfield', 'director01@wellmeadows.example', '01506-100003', 'Medical Director');
GO

-- ---------- ward ----------
CREATE TABLE ward (
  id INT IDENTITY(1,1) PRIMARY KEY,
  [number] INT NOT NULL,
  name NVARCHAR(100),
  location NVARCHAR(100),
  beds INT DEFAULT 0,
  extn NVARCHAR(20)
);
GO

INSERT INTO ward ([number],name,location,beds,extn) VALUES
(1,'Emergency','Main Building',20,'7701'),
(2,'Medical','Main Building',20,'7702'),
(3,'Surgical','Main Building',20,'7703'),
(4,'Paediatric','North Wing',20,'7704'),
(5,'Maternity','North Wing',20,'7705'),
(6,'Oncology','North Wing',20,'7706'),
(7,'Neurology','South Wing',20,'7707'),
(8,'Intensive Care Unit','South Wing',20,'7708'),
(9,'Rehabilitation','South Wing',20,'7709'),
(10,'Geriatric','South Wing',20,'7710'),
(11,'Orthopaedic','Block E',87,'7711'),
(12,'Cardiology','Block E',20,'7712');
GO

-- ---------- staff ----------
CREATE TABLE staff (
  id INT IDENTITY(1,1) PRIMARY KEY,
  staffNo NVARCHAR(20) NULL,
  first NVARCHAR(60),
  last NVARCHAR(60),
  address NVARCHAR(200),
  tel NVARCHAR(30),
  dob DATE NULL,
  sex NVARCHAR(10),
  nin NVARCHAR(20),
  position NVARCHAR(60),
  salary DECIMAL(10,2),
  scale NVARCHAR(10),
  ward INT NULL,
  hours DECIMAL(5,2),
  contract NVARCHAR(5),
  pay NVARCHAR(5),
  qual NVARCHAR(150),
  institution NVARCHAR(150),
  workExperience NVARCHAR(MAX),
  medicalRecord NVARCHAR(MAX),
  photo VARCHAR(MAX),                     -- URL or base64 data URL
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX),
  boardX DECIMAL(6,2) NULL,
  boardY DECIMAL(6,2) NULL
);
GO

-- MySQL's UNIQUE allows many NULLs; SQL Server's allows only one.
-- A filtered unique index gives the MySQL behaviour.
CREATE UNIQUE INDEX uq_staff_staffNo ON staff(staffNo) WHERE staffNo IS NOT NULL;
GO

INSERT INTO staff (staffNo,first,last,address,tel,dob,sex,nin,position,salary,scale,ward,hours,contract,pay,qual,institution,workExperience,medicalRecord,photo) VALUES
('S011','Moira','Samuel','49 School Road, Broxburn','01506-45633','1961-05-30','Female','WB123423D','Charge Nurse',18760,'1C',11,37.5,'P','M','BSc Nursing Studies','Edinburgh University','12 years in acute elder care; led nurse training and ward coordination; previous experience in surgical recovery and rehabilitation.','Experienced senior charge nurse with strong clinical leadership, medication administration oversight, and patient safety monitoring.','photos/staff2.png'),
('S098','Carol','Cummings','15 High Street Edinburgh','0131-334-5677','1975-02-14','Female','','Staff Nurse',15000,'1B',11,37.5,'P','M','','','6 years in general ward nursing; experience with post-op care, patient assessment, and medication administration.','General ward nurse with post-operative care experience and routine patient education responsibilities.','photos/staff5.png'),
('S123','Morgan','Russell','23A George Street Broxburn','01506-67676','1980-07-01','Male','','Nurse',14000,'1A',11,37.5,'T','M','','','4 years in community nursing and emergency support; prior role in district health visiting.','Community and emergency care nurse with assessment skills and care-plan documentation experience.','photos/staff4.png'),
('S167','Robin','Plevin','7 Glen Terrace Edinburgh','0131-339-6123','1978-03-22','Male','','Staff Nurse',15200,'1B',11,37.5,'P','M','','','8 years in medical and geriatric wards; trained in observation rounds and rehabilitation support.','Medical and geriatric ward nurse focused on observations, rehabilitation support, and patient monitoring.','photos/staff1.png'),
('S234','Amy','O''Donnell','234 Princes Street Edinburgh','0131-334-9099','1985-11-09','Female','','Nurse',14000,'1A',11,37.5,'P','M','BSc Nursing Studies','University of Edinburgh','3 years in cardiology and elderly inpatient support; experience with medication rounds, risk assessment, and patient education.','Cardiology support nurse with medication-round experience, patient education responsibilities, and ongoing observational care.',''),
('S344','Laurence','Burns','1 Apple Drive Edinburgh','0131-334-9100','1970-01-15','Male','','Consultant',45000,'CON',11,40,'P','M','MD','Edinburgh University','18 years in specialist medicine; previous consultant posts in general medicine, cardiology, and long-term care oversight.','Consultant physician with specialist practice in medical oversight, patient review, and treatment planning.','photos/staff3.png');
GO

-- ---------- patient ----------
CREATE TABLE patient (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patNo NVARCHAR(20),
  first NVARCHAR(60),
  last NVARCHAR(60),
  address NVARCHAR(200),
  tel NVARCHAR(30),
  dob DATE NULL,
  sex NVARCHAR(10),
  marital NVARCHAR(20),
  kinName NVARCHAR(100),
  kinRel NVARCHAR(50),
  localDoctor NVARCHAR(100),
  allergies NVARCHAR(200),
  medicalRecord NVARCHAR(MAX),
  ward INT NULL,
  bed NVARCHAR(10) NULL,
  waitDate DATE NULL,
  placedDate DATE NULL,
  expLeave DATE NULL,
  actualLeave DATE NULL,
  status NVARCHAR(30),
  priority NVARCHAR(20),
  refDocName NVARCHAR(150),
  refDoc VARCHAR(MAX),
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO patient (patNo,first,last,address,tel,dob,sex,marital,kinName,kinRel,localDoctor,allergies,medicalRecord,ward,bed,waitDate,placedDate,expLeave,actualLeave,status) VALUES
('P10451','Robert','Drumtree','','',NULL,'','','','','Dr. A. Morrison','Penicillin','History of hip surgery and post-operative pain management. Allergic to penicillin. Regular monitoring for mobility and medication tolerance.',11,84,'2004-01-12','2004-01-12','2004-01-17','2004-01-16','Discharged'),
('P10480','Steven','Parks','','',NULL,'','','','','Dr. S. Patel','None','Post-operative recovery following orthopaedic treatment. No known drug allergies. Mobility improved and discharged on schedule.',11,79,'2004-01-12','2004-01-14','2004-01-18','2004-01-18','Discharged'),
('P10563','David','Black','','',NULL,'','','','','Dr. L. Graham','Peanuts','Diabetes review and wound care treatment. Peanut allergy noted. Requires careful dietary review and medication charting.',11,80,'2004-01-13','2004-01-13','2004-01-27',NULL,'In Ward'),
('P10604','Ian','Thomson','','',NULL,'','','','','Dr. H. Singh','Latex','Cardiac monitoring and mobility assessment. Latex allergy needs documentation on all care notes and equipment planning.',11,87,'2004-01-14','2004-01-15','2004-01-25',NULL,'In Ward'),
('P10787','Peter','Smith','','',NULL,'','','','','Dr. M. Osborne','Sulphur drugs','Short-stay assessment following infection treatment. Sulphur allergy documented; review antibiotics before prescribing.',11,84,'2004-01-17','2004-01-17','2004-01-22',NULL,'In Ward'),
('P10234','Anne','Phelps','44 North Bridges, Cannonmills, Edinburgh EH1 5GH','0131-332-4111','1933-12-12','Female','Single','James Phelps','Son','Dr. C. Allen','None','Awaiting placement for rehabilitation review. No major allergies. Needs slow mobility support and regular observation.',NULL,NULL,'2004-02-21',NULL,NULL,NULL,'Waiting List');
GO

-- ---------- outpatient ----------
CREATE TABLE outpatient (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patNo NVARCHAR(20),
  first NVARCHAR(60),
  last NVARCHAR(60),
  address NVARCHAR(200),
  tel NVARCHAR(30),
  dob DATE NULL,
  sex NVARCHAR(10),
  localDoctor NVARCHAR(100),
  apptDate DATE NULL,
  apptTime TIME(0) NULL,
  refDocName NVARCHAR(150),
  refDoc VARCHAR(MAX),
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

-- ---------- appointment ----------
CREATE TABLE appointment (
  id INT IDENTITY(1,1) PRIMARY KEY,
  apptNo NVARCHAR(20),
  patNo NVARCHAR(20),
  consultant NVARCHAR(100),
  staffNo NVARCHAR(20),
  [date] DATE NULL,
  [time] TIME(0) NULL,
  room NVARCHAR(30),
  referral NVARCHAR(100),
  reason NVARCHAR(255),
  localDoctor NVARCHAR(100),
  fee DECIMAL(10,2),
  taxRate DECIMAL(5,2) DEFAULT 20,
  paymentStatus NVARCHAR(20) DEFAULT 'Pending',
  total DECIMAL(10,2),
  uploadedAt DATETIME2(0) NULL,
  refDocName NVARCHAR(150),
  refDoc VARCHAR(MAX),
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO appointment (apptNo,patNo,consultant,staffNo,[date],[time],room,referral,reason,localDoctor) VALUES
('A1001','P10563','Dr Laurence Burns','S344','2004-02-18','09:30','Room 3','GP Referral','Post-operative review and mobility assessment','Dr. L. Graham'),
('A1002','P10604','Dr Laurence Burns','S344','2004-02-20','11:00','Clinic 2','Ward transfer review','Cardiac follow-up and treatment planning','Dr. H. Singh');
GO

-- ---------- medication ----------
CREATE TABLE medication (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patNo NVARCHAR(20),
  patName NVARCHAR(100),
  ward INT NULL,
  bed NVARCHAR(10) NULL,
  drugNo INT NULL,
  drugName NVARCHAR(100),
  dosage NVARCHAR(50),
  method NVARCHAR(30),
  units INT NULL,
  [start] DATE NULL,
  finish DATE NULL
);
GO

INSERT INTO medication (patNo,patName,ward,bed,drugNo,drugName,dosage,method,units,[start],finish) VALUES
('P10034','Robert MacDonald',11,84,10223,'Morphine','10mg/ml','Oral',50,'2004-03-24','2004-04-24'),
('P10034','Robert MacDonald',11,84,10334,'Tetracycline','0.5mg/ml','IV',10,'2004-03-24','2004-04-17'),
('P10034','Robert MacDonald',11,84,10223,'Morphine','10mg/ml','Oral',10,'2004-04-25','2004-05-02');
GO

-- ---------- supply ----------
CREATE TABLE supply (
  id INT IDENTITY(1,1) PRIMARY KEY,
  itemNo NVARCHAR(20),
  name NVARCHAR(100),
  [desc] NVARCHAR(200),
  qty INT,
  reorder INT,
  cost DECIMAL(10,2),
  taxRate DECIMAL(5,2) DEFAULT 20,
  paymentStatus NVARCHAR(20) DEFAULT 'Pending',
  total DECIMAL(10,2),
  uploadedAt DATETIME2(0) NULL,
  photo VARCHAR(MAX),                     -- URL or base64 data URL
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO supply (itemNo,name,[desc],qty,reorder,cost,photo) VALUES
('IT001','Syringes','Sterile disposable syringes',500,100,0.15,'https://placehold.co/120x90/7ea5d8/ffffff?text=Syringes'),
('IT002','Sterile Dressings','Wound dressing pads',300,50,0.80,'https://placehold.co/120x90/d8c7b5/ffffff?text=Dressings'),
('IT003','Plastic Bags','Non-surgical clinical waste bags',1000,200,0.05,'https://placehold.co/120x90/9fc7b3/ffffff?text=Bags'),
('IT004','Aprons','Disposable plastic aprons',600,150,0.10,'https://placehold.co/120x90/dfb5b5/ffffff?text=Aprons');
GO

-- ---------- pharma ----------
CREATE TABLE pharma (
  id INT IDENTITY(1,1) PRIMARY KEY,
  drugNo INT,
  name NVARCHAR(100),
  [desc] NVARCHAR(200),
  dosage NVARCHAR(50),
  method NVARCHAR(30),
  qty INT,
  reorder INT,
  cost DECIMAL(10,2),
  category NVARCHAR(60),
  uses NVARCHAR(255),
  sideEffects NVARCHAR(255),
  warnings NVARCHAR(255),
  photo VARCHAR(MAX),
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO pharma (drugNo,name,[desc],dosage,method,qty,reorder,cost,category,uses,sideEffects,warnings) VALUES
(10223,'Morphine','Strong opioid analgesic for severe pain','10mg/ml','Oral',200,50,27.75,'Analgesic','Severe pain control after surgery or trauma','Drowsiness, nausea, constipation, respiratory depression','Use only under clinical supervision; avoid alcohol and sedatives'),
(10334,'Tetracycline','Broad-spectrum antibiotic','0.5mg/ml','IV',150,40,12.50,'Antibiotic','Treatment of bacterial infections','Nausea, photosensitivity, stomach upset','Avoid in pregnancy and with calcium-rich products'),
(10401,'Amoxicillin','Penicillin-type antibiotic','250mg','Oral',300,80,8.20,'Antibiotic','Respiratory, ear, and urinary tract infections','Diarrhoea, rash, nausea','Check for penicillin allergy before administration'),
(10402,'Ciprofloxacin','Fluoroquinolone antibiotic','500mg','Oral',180,60,14.40,'Antibiotic','Urinary, gastrointestinal, and bone infections','Dizziness, tendon irritation, stomach upset','Avoid in pregnancy and use cautiously with tendon disorders'),
(10403,'Ceftriaxone','Third-generation cephalosporin','1g','IV',120,30,18.60,'Antibiotic','Severe bacterial infections and hospital treatment','Injection-site pain, diarrhoea, rash','Monitor for allergic reactions and biliary issues'),
(10404,'Lisinopril','ACE inhibitor for blood pressure','10mg','Oral',240,75,6.80,'Cardiovascular','Hypertension and heart failure management','Cough, dizziness, low blood pressure','Monitor kidney function and potassium levels'),
(10405,'Metoprolol','Beta-blocker for heart rhythm and blood pressure','50mg','Oral',260,90,7.30,'Cardiovascular','Hypertension, angina, and arrhythmia control','Fatigue, slow pulse, dizziness','Use with caution in asthma or bradycardia'),
(10406,'Atorvastatin','Cholesterol-lowering statin','20mg','Oral',220,70,9.10,'Lipid regulator','Lower LDL cholesterol and reduce cardiovascular risk','Muscle aches, nausea, headache','Monitor liver function and avoid grapefruit juice'),
(10407,'Paracetamol','Pain and fever reliever','500mg','Oral',500,120,2.15,'Analgesic','Mild to moderate pain and fever reduction','Rare liver issues with overdose','Do not exceed recommended dose'),
(10408,'Ibuprofen','Non-steroidal anti-inflammatory drug','400mg','Oral',350,100,3.10,'Anti-inflammatory','Pain and inflammation relief','Stomach irritation, heartburn, dizziness','Avoid in kidney disease or gastric ulcers'),
(10409,'Salbutamol','Bronchodilator for asthma relief','2mg/ml','Inhaled',160,40,11.20,'Respiratory','Relief of bronchospasm and wheezing','Tremor, palpitations, anxiety','Use inhaler technique correctly and monitor tachycardia'),
(10410,'Omeprazole','Proton pump inhibitor','20mg','Oral',210,65,6.40,'Gastrointestinal','Acid reflux, gastric ulcers, dyspepsia','Headache, nausea, diarrhoea','Avoid long-term use without review'),
(10411,'Metformin','Biguanide for type 2 diabetes','500mg','Oral',240,80,5.60,'Diabetes','Glycaemic control in type 2 diabetes','Nausea, stomach upset, diarrhoea','Monitor renal function and avoid alcohol misuse');
GO

-- ---------- requisition ----------
CREATE TABLE requisition (
  id INT IDENTITY(1,1) PRIMARY KEY,
  reqNo NVARCHAR(20),
  requestedBy NVARCHAR(100),
  ward INT NULL,
  itemNo NVARCHAR(20),
  itemName NVARCHAR(100),
  dosage NVARCHAR(50),
  method NVARCHAR(30),
  cost DECIMAL(10,2),
  qty INT,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  status NVARCHAR(20) DEFAULT 'Pending',
  [date] DATE NULL,
  uploadedAt DATETIME2(0) NULL,
  approvedAt DATETIME2(0) NULL,
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO requisition (reqNo,requestedBy,ward,itemNo,itemName,dosage,method,cost,qty,subtotal,tax,total,status,[date]) VALUES
('034567712','Moira Samuel',11,'10223','Morphine','10mg/ml','Oral',27.75,50,1387.50,277.50,1665.00,'Pending','2004-02-15');
GO

-- ---------- supplier ----------
CREATE TABLE supplier (
  id INT IDENTITY(1,1) PRIMARY KEY,
  supNo NVARCHAR(20),
  name NVARCHAR(100),
  address NVARCHAR(200),
  tel NVARCHAR(30),
  fax NVARCHAR(30),
  photo VARCHAR(MAX),                     -- URL or base64 data URL
  fileName NVARCHAR(150),
  [file] VARCHAR(MAX)
);
GO

INSERT INTO supplier (supNo,name,address,tel,fax,photo) VALUES
('SU01','MediSupply Ltd','12 Industrial Est, Edinburgh','0131-500-1000','0131-500-1001','https://placehold.co/120x90/4d7ea8/ffffff?text=MediSupply'),
('SU02','PharmaCorp UK','8 Fife Road, Glasgow','0141-600-2000','0141-600-2001','https://placehold.co/120x90/8b6eb4/ffffff?text=PharmaCorp');
GO

-- ---------- bedQueue (bed request / waiting list queue shown on the Beds page) ----------
CREATE TABLE bedQueue (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patientNo NVARCHAR(20),
  patientName NVARCHAR(120),
  ward INT NULL,
  priority NVARCHAR(20) DEFAULT 'Normal',
  status NVARCHAR(20) DEFAULT 'Waiting',
  requestedAt DATE NULL,
  admittedAt DATETIME2(0) NULL
);
GO

INSERT INTO bedQueue (patientNo,patientName,ward,priority,status,requestedAt) VALUES
('P10234','Anne Phelps',11,'Urgent','Waiting','2004-02-21');
GO

-- ---------- leave (staff leave / absence requests — new page, Personnel Officer use case) ----------
-- Named leave_request because LEAVE is a reserved word in both MySQL and T-SQL.
CREATE TABLE leave_request (
  id INT IDENTITY(1,1) PRIMARY KEY,
  leaveNo NVARCHAR(20),
  staffNo NVARCHAR(20),
  staffName NVARCHAR(120),
  ward INT NULL,
  [type] NVARCHAR(30) DEFAULT 'Annual Leave',
  startDate DATE NULL,
  endDate DATE NULL,
  reason NVARCHAR(255),
  status NVARCHAR(20) DEFAULT 'Pending',
  approvedBy NVARCHAR(120),
  requestedAt DATETIME2(0) NULL
);
GO

INSERT INTO leave_request (leaveNo,staffNo,staffName,ward,[type],startDate,endDate,reason,status) VALUES
('LV1001','S098','Carol Cummings',11,'Annual Leave','2004-03-01','2004-03-07','Family holiday','Approved'),
('LV1002','S167','Robin Plevin',11,'Sick Leave','2004-02-10','2004-02-12','Flu','Approved');
GO

-- ---------- self-check: the load reports on itself ----------
SELECT t.tbl AS [table], t.expected, ISNULL(p.rows_now, 0) AS actual,
       CASE WHEN t.expected = ISNULL(p.rows_now, 0) THEN 'OK' ELSE '<< MISMATCH' END AS result
FROM (VALUES ('users',5),('ward',12),('staff',6),('patient',6),('outpatient',0),
             ('appointment',2),('medication',3),('supply',4),('pharma',13),
             ('requisition',1),('supplier',2),('bedQueue',1),('leave_request',2)) AS t(tbl, expected)
LEFT JOIN (SELECT o.name, SUM(ps.row_count) AS rows_now
           FROM sys.dm_db_partition_stats ps JOIN sys.objects o ON o.object_id = ps.object_id
           WHERE ps.index_id IN (0,1) GROUP BY o.name) p ON p.name = t.tbl
ORDER BY t.tbl;
GO
