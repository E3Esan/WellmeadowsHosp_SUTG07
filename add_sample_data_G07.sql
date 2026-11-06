-- ============================================================
-- Adds 5 sample rows to every table, without touching any data you
-- already have. Each INSERT is guarded with an IF NOT EXISTS check
-- (T-SQL has no INSERT IGNORE) keyed on that table's natural code
-- (staffNo, patNo, reqNo, ward number, etc.), so it's safe to run more
-- than once — it will not error out or duplicate rows.
--
-- IDs/codes here (ward 13-17, staffNo/patNo in the 90xx/9xxx range,
-- etc.) were chosen to be unlikely to collide with data you already
-- entered through the app or SSMS. If one guard still finds a clash,
-- that single block is simply skipped — everything else still runs.
--
-- Run: SSMS > connect to your server > open this file > Execute (F5).
-- ============================================================

USE wellmeadows;
GO

-- ---------- ward ----------
-- (wards 1-10 auto-seed from the app itself; 11-12 were already in your DB)
IF NOT EXISTS (SELECT 1 FROM ward WHERE [number] = 13)
INSERT INTO ward ([number], name, location, beds, extn) VALUES (13, 'Cardiology',  'East Wing',     20, '7713');
IF NOT EXISTS (SELECT 1 FROM ward WHERE [number] = 14)
INSERT INTO ward ([number], name, location, beds, extn) VALUES (14, 'Dermatology', 'East Wing',     15, '7714');
IF NOT EXISTS (SELECT 1 FROM ward WHERE [number] = 15)
INSERT INTO ward ([number], name, location, beds, extn) VALUES (15, 'Orthopedics', 'West Wing',     25, '7715');
IF NOT EXISTS (SELECT 1 FROM ward WHERE [number] = 16)
INSERT INTO ward ([number], name, location, beds, extn) VALUES (16, 'Psychiatry',  'West Wing',     18, '7716');
IF NOT EXISTS (SELECT 1 FROM ward WHERE [number] = 17)
INSERT INTO ward ([number], name, location, beds, extn) VALUES (17, 'Radiology',   'Main Building', 10, '7717');
GO

-- ---------- staff ----------
IF NOT EXISTS (SELECT 1 FROM staff WHERE staffNo = 'S9001')
INSERT INTO staff (staffNo, first, last, address, tel, dob, sex, nin, position, salary, scale, ward, hours, contract, pay) VALUES
('S9001', 'John',  'Baker',  '12 Elm St, Edinburgh',   '01506-100011', '1985-03-14', 'M', 'NA123456A', 'Staff Nurse',     28000, 'S3', 13, 37.5, 'Perm', 'Mon');
IF NOT EXISTS (SELECT 1 FROM staff WHERE staffNo = 'S9002')
INSERT INTO staff (staffNo, first, last, address, tel, dob, sex, nin, position, salary, scale, ward, hours, contract, pay) VALUES
('S9002', 'Maria', 'Gomez',  '5 Oak Ave, Edinburgh',   '01506-100012', '1990-07-22', 'F', 'NA234567B', 'Ward Assistant',  21000, 'S1', 14, 37.5, 'Perm', 'Mon');
IF NOT EXISTS (SELECT 1 FROM staff WHERE staffNo = 'S9003')
INSERT INTO staff (staffNo, first, last, address, tel, dob, sex, nin, position, salary, scale, ward, hours, contract, pay) VALUES
('S9003', 'Kevin', 'Lee',    '9 Birch Rd, Edinburgh',  '01506-100013', '1982-11-02', 'M', 'NA345678C', 'Physiotherapist', 32000, 'S4', 15, 37.5, 'Temp', 'Mon');
IF NOT EXISTS (SELECT 1 FROM staff WHERE staffNo = 'S9004')
INSERT INTO staff (staffNo, first, last, address, tel, dob, sex, nin, position, salary, scale, ward, hours, contract, pay) VALUES
('S9004', 'Linda', 'Ho',     '3 Maple Dr, Edinburgh',  '01506-100014', '1978-01-30', 'F', 'NA456789D', 'Pharmacist',      34000, 'S5', 16, 37.5, 'Perm', 'Mon');
IF NOT EXISTS (SELECT 1 FROM staff WHERE staffNo = 'S9005')
INSERT INTO staff (staffNo, first, last, address, tel, dob, sex, nin, position, salary, scale, ward, hours, contract, pay) VALUES
('S9005', 'Ahmed', 'Khan',   '21 Cedar Ln, Edinburgh', '01506-100015', '1995-06-18', 'M', 'NA567890E', 'Porter',          19500, 'S1', 17, 37.5, 'Perm', 'Wk');
GO

-- ---------- patient ----------
IF NOT EXISTS (SELECT 1 FROM patient WHERE patNo = 'P9001')
INSERT INTO patient (patNo, first, last, address, tel, dob, sex, marital, kinName, kinRel, localDoctor, allergies, ward, bed, waitDate, placedDate, status, priority) VALUES
('P9001', 'Sarah', 'Jenkins', '14 River St, Edinburgh', '01506-200011', '1960-05-11', 'F', 'Married', 'Mike Jenkins', 'Husband', 'Dr. Adeyemi',   'Penicillin', 13, 'B01', '2026-09-10', '2026-09-12', 'Admitted', 'Normal');
IF NOT EXISTS (SELECT 1 FROM patient WHERE patNo = 'P9002')
INSERT INTO patient (patNo, first, last, address, tel, dob, sex, marital, kinName, kinRel, localDoctor, allergies, ward, bed, waitDate, placedDate, status, priority) VALUES
('P9002', 'Tom',   'Riley',   '2 Hill Rd, Edinburgh',   '01506-200012', '1972-09-25', 'M', 'Single',  'Jane Riley',   'Sister',  'Dr. Whitfield', 'None',       14, 'B03', '2026-09-11', '2026-09-13', 'Admitted', 'Normal');
IF NOT EXISTS (SELECT 1 FROM patient WHERE patNo = 'P9003')
INSERT INTO patient (patNo, first, last, address, tel, dob, sex, marital, kinName, kinRel, localDoctor, allergies, ward, bed, waitDate, placedDate, status, priority) VALUES
('P9003', 'Emily', 'Clarke',  '8 Park Ave, Edinburgh',  '01506-200013', '1988-12-03', 'F', 'Married', 'Ian Clarke',   'Husband', 'Dr. Adeyemi',   'Latex',      15, 'B02', '2026-09-15', NULL,         'Waiting',  'Urgent');
IF NOT EXISTS (SELECT 1 FROM patient WHERE patNo = 'P9004')
INSERT INTO patient (patNo, first, last, address, tel, dob, sex, marital, kinName, kinRel, localDoctor, allergies, ward, bed, waitDate, placedDate, status, priority) VALUES
('P9004', 'David', 'Chan',    '17 Queen St, Edinburgh', '01506-200014', '1955-02-19', 'M', 'Widowed', 'Amy Chan',     'Daughter','Dr. Whitfield', 'None',       16, 'B01', '2026-09-08', '2026-09-09', 'Admitted', 'Normal');
IF NOT EXISTS (SELECT 1 FROM patient WHERE patNo = 'P9005')
INSERT INTO patient (patNo, first, last, address, tel, dob, sex, marital, kinName, kinRel, localDoctor, allergies, ward, bed, waitDate, placedDate, status, priority) VALUES
('P9005', 'Grace', 'Osei',    '30 King St, Edinburgh',  '01506-200015', '1993-04-07', 'F', 'Single',  'Ben Osei',     'Brother', 'Dr. Adeyemi',   'None',       17, 'B04', '2026-09-14', '2026-09-16', 'Admitted', 'Normal');
GO

-- ---------- outpatient ----------
IF NOT EXISTS (SELECT 1 FROM outpatient WHERE patNo = 'O9001')
INSERT INTO outpatient (patNo, first, last, address, tel, dob, sex, localDoctor, apptDate, apptTime) VALUES
('O9001', 'Peter',  'Wong',   '4 Bridge St, Edinburgh',   '01506-300011', '1980-01-15', 'M', 'Dr. Adeyemi',   '2026-09-22', '09:30');
IF NOT EXISTS (SELECT 1 FROM outpatient WHERE patNo = 'O9002')
INSERT INTO outpatient (patNo, first, last, address, tel, dob, sex, localDoctor, apptDate, apptTime) VALUES
('O9002', 'Nadia',  'Ali',    '11 Market St, Edinburgh',  '01506-300012', '1991-03-28', 'F', 'Dr. Whitfield', '2026-09-22', '10:00');
IF NOT EXISTS (SELECT 1 FROM outpatient WHERE patNo = 'O9003')
INSERT INTO outpatient (patNo, first, last, address, tel, dob, sex, localDoctor, apptDate, apptTime) VALUES
('O9003', 'Carlos', 'Mendez', '6 Church Rd, Edinburgh',   '01506-300013', '1975-08-09', 'M', 'Dr. Adeyemi',   '2026-09-23', '11:15');
IF NOT EXISTS (SELECT 1 FROM outpatient WHERE patNo = 'O9004')
INSERT INTO outpatient (patNo, first, last, address, tel, dob, sex, localDoctor, apptDate, apptTime) VALUES
('O9004', 'Aisha',  'Bello',  '19 Station Rd, Edinburgh', '01506-300014', '1998-10-21', 'F', 'Dr. Whitfield', '2026-09-24', '13:00');
IF NOT EXISTS (SELECT 1 FROM outpatient WHERE patNo = 'O9005')
INSERT INTO outpatient (patNo, first, last, address, tel, dob, sex, localDoctor, apptDate, apptTime) VALUES
('O9005', 'Liam',   'Fraser', '2 Mill Ln, Edinburgh',     '01506-300015', '1966-06-12', 'M', 'Dr. Adeyemi',   '2026-09-25', '14:30');
GO

-- ---------- appointment ----------
IF NOT EXISTS (SELECT 1 FROM appointment WHERE apptNo = 'A9001')
INSERT INTO appointment (apptNo, patNo, consultant, staffNo, [date], [time], room, referral, reason, localDoctor, fee, taxRate, paymentStatus, total) VALUES
('A9001', 'P9001', 'Dr. Whitfield', 'S9001', '2026-09-20', '09:00', 'R101', 'GP', 'Follow-up',         'Dr. Adeyemi',   150, 20, 'Pending', 180);
IF NOT EXISTS (SELECT 1 FROM appointment WHERE apptNo = 'A9002')
INSERT INTO appointment (apptNo, patNo, consultant, staffNo, [date], [time], room, referral, reason, localDoctor, fee, taxRate, paymentStatus, total) VALUES
('A9002', 'P9002', 'Dr. Whitfield', 'S9003', '2026-09-20', '09:30', 'R102', 'GP', 'Consultation',      'Dr. Whitfield', 200, 20, 'Pending', 240);
IF NOT EXISTS (SELECT 1 FROM appointment WHERE apptNo = 'A9003')
INSERT INTO appointment (apptNo, patNo, consultant, staffNo, [date], [time], room, referral, reason, localDoctor, fee, taxRate, paymentStatus, total) VALUES
('A9003', 'P9003', 'Dr. Adeyemi',   'S9001', '2026-09-21', '10:15', 'R103', 'GP', 'Post-op check',     'Dr. Adeyemi',   120, 20, 'Paid',    144);
IF NOT EXISTS (SELECT 1 FROM appointment WHERE apptNo = 'A9004')
INSERT INTO appointment (apptNo, patNo, consultant, staffNo, [date], [time], room, referral, reason, localDoctor, fee, taxRate, paymentStatus, total) VALUES
('A9004', 'P9004', 'Dr. Adeyemi',   'S9004', '2026-09-22', '11:00', 'R101', 'GP', 'Medication review', 'Dr. Whitfield', 180, 20, 'Pending', 216);
IF NOT EXISTS (SELECT 1 FROM appointment WHERE apptNo = 'A9005')
INSERT INTO appointment (apptNo, patNo, consultant, staffNo, [date], [time], room, referral, reason, localDoctor, fee, taxRate, paymentStatus, total) VALUES
('A9005', 'P9005', 'Dr. Whitfield', 'S9005', '2026-09-23', '13:30', 'R104', 'GP', 'Consultation',      'Dr. Adeyemi',   160, 20, 'Paid',    192);
GO

-- ---------- medication ----------
IF NOT EXISTS (SELECT 1 FROM medication WHERE patNo = 'P9001' AND drugNo = 9101)
INSERT INTO medication (patNo, patName, ward, bed, drugNo, drugName, dosage, method, units, [start], finish) VALUES
('P9001', 'Sarah Jenkins', 13, 'B01', 9101, 'Amoxicillin', '500mg', 'Oral', 21, '2026-09-15', '2026-09-22');
IF NOT EXISTS (SELECT 1 FROM medication WHERE patNo = 'P9002' AND drugNo = 9102)
INSERT INTO medication (patNo, patName, ward, bed, drugNo, drugName, dosage, method, units, [start], finish) VALUES
('P9002', 'Tom Riley',     14, 'B03', 9102, 'Paracetamol', '500mg', 'Oral', 12, '2026-09-16', '2026-09-19');
IF NOT EXISTS (SELECT 1 FROM medication WHERE patNo = 'P9003' AND drugNo = 9103)
INSERT INTO medication (patNo, patName, ward, bed, drugNo, drugName, dosage, method, units, [start], finish) VALUES
('P9003', 'Emily Clarke',  15, 'B02', 9103, 'Ibuprofen',   '400mg', 'Oral', 18, '2026-09-14', '2026-09-20');
IF NOT EXISTS (SELECT 1 FROM medication WHERE patNo = 'P9004' AND drugNo = 9104)
INSERT INTO medication (patNo, patName, ward, bed, drugNo, drugName, dosage, method, units, [start], finish) VALUES
('P9004', 'David Chan',    16, 'B01', 9104, 'Metformin',   '850mg', 'Oral', 60, '2026-09-10', '2026-10-10');
IF NOT EXISTS (SELECT 1 FROM medication WHERE patNo = 'P9005' AND drugNo = 9105)
INSERT INTO medication (patNo, patName, ward, bed, drugNo, drugName, dosage, method, units, [start], finish) VALUES
('P9005', 'Grace Osei',    17, 'B04', 9105, 'Warfarin',    '5mg',   'Oral', 18, '2026-09-12', '2026-09-30');
GO

-- ---------- supply ----------
IF NOT EXISTS (SELECT 1 FROM supply WHERE itemNo = 'IT901')
INSERT INTO supply (itemNo, name, [desc], qty, reorder, cost, taxRate, paymentStatus, total) VALUES
('IT901', 'Surgical Gloves (box)', 'Latex-free, size M',  300, 50,  8.50, 20, 'Paid',    2550.00);
IF NOT EXISTS (SELECT 1 FROM supply WHERE itemNo = 'IT902')
INSERT INTO supply (itemNo, name, [desc], qty, reorder, cost, taxRate, paymentStatus, total) VALUES
('IT902', 'Syringes 10ml',         'Sterile, single-use',  500, 100, 0.75, 20, 'Pending',  375.00);
IF NOT EXISTS (SELECT 1 FROM supply WHERE itemNo = 'IT903')
INSERT INTO supply (itemNo, name, [desc], qty, reorder, cost, taxRate, paymentStatus, total) VALUES
('IT903', 'Gauze Rolls',           '10cm x 4.5m',           200, 40,  1.20, 20, 'Paid',     240.00);
IF NOT EXISTS (SELECT 1 FROM supply WHERE itemNo = 'IT904')
INSERT INTO supply (itemNo, name, [desc], qty, reorder, cost, taxRate, paymentStatus, total) VALUES
('IT904', 'IV Cannulas',           '20G, sterile',          250, 60,  2.30, 20, 'Pending',  575.00);
IF NOT EXISTS (SELECT 1 FROM supply WHERE itemNo = 'IT905')
INSERT INTO supply (itemNo, name, [desc], qty, reorder, cost, taxRate, paymentStatus, total) VALUES
('IT905', 'Face Masks (box)',      'Type IIR, box of 50',   400, 80,  6.00, 20, 'Paid',    2400.00);
GO

-- ---------- pharma ----------
IF NOT EXISTS (SELECT 1 FROM pharma WHERE drugNo = 9101)
INSERT INTO pharma (drugNo, name, [desc], dosage, method, qty, reorder, cost, category, uses, sideEffects, warnings) VALUES
(9101, 'Amoxicillin', 'Broad-spectrum antibiotic', '500mg', 'Oral', 800,  150, 0.30, 'Antibiotic',   'Bacterial infections',  'Nausea, rash',        'Avoid if penicillin-allergic');
IF NOT EXISTS (SELECT 1 FROM pharma WHERE drugNo = 9102)
INSERT INTO pharma (drugNo, name, [desc], dosage, method, qty, reorder, cost, category, uses, sideEffects, warnings) VALUES
(9102, 'Paracetamol',  'Analgesic/antipyretic',    '500mg', 'Oral', 1500, 300, 0.05, 'Analgesic',    'Pain, fever',           'Rare at normal dose', 'Do not exceed 4g/day');
IF NOT EXISTS (SELECT 1 FROM pharma WHERE drugNo = 9103)
INSERT INTO pharma (drugNo, name, [desc], dosage, method, qty, reorder, cost, category, uses, sideEffects, warnings) VALUES
(9103, 'Ibuprofen',    'NSAID',                    '400mg', 'Oral', 1000, 200, 0.08, 'NSAID',        'Pain, inflammation',    'Stomach upset',       'Avoid with peptic ulcers');
IF NOT EXISTS (SELECT 1 FROM pharma WHERE drugNo = 9104)
INSERT INTO pharma (drugNo, name, [desc], dosage, method, qty, reorder, cost, category, uses, sideEffects, warnings) VALUES
(9104, 'Metformin',    'Biguanide antidiabetic',   '850mg', 'Oral', 600,  120, 0.15, 'Antidiabetic', 'Type 2 diabetes',       'GI upset',            'Monitor renal function');
IF NOT EXISTS (SELECT 1 FROM pharma WHERE drugNo = 9105)
INSERT INTO pharma (drugNo, name, [desc], dosage, method, qty, reorder, cost, category, uses, sideEffects, warnings) VALUES
(9105, 'Warfarin',     'Anticoagulant',            '5mg',   'Oral', 300,  60,  0.40, 'Anticoagulant','Blood clot prevention', 'Bleeding risk',       'Requires INR monitoring');
GO

-- ---------- requisition ----------
IF NOT EXISTS (SELECT 1 FROM requisition WHERE reqNo = 'RQ901')
INSERT INTO requisition (reqNo, requestedBy, ward, itemNo, itemName, cost, qty, subtotal, tax, total, status, [date]) VALUES
('RQ901', 'John Baker',  13, 'IT901', 'Surgical Gloves (box)', 8.50, 20, 170.00, 34.00, 204.00, 'Pending',     '2026-09-16');
IF NOT EXISTS (SELECT 1 FROM requisition WHERE reqNo = 'RQ902')
INSERT INTO requisition (reqNo, requestedBy, ward, itemNo, itemName, cost, qty, subtotal, tax, total, status, [date]) VALUES
('RQ902', 'Maria Gomez', 14, 'IT902', 'Syringes 10ml',         0.75, 100, 75.00, 15.00, 90.00,  'Pending',     '2026-09-16');
IF NOT EXISTS (SELECT 1 FROM requisition WHERE reqNo = 'RQ903')
INSERT INTO requisition (reqNo, requestedBy, ward, itemNo, itemName, cost, qty, subtotal, tax, total, status, [date]) VALUES
('RQ903', 'Kevin Lee',   15, 'IT903', 'Gauze Rolls',           1.20, 30,  36.00,  7.20,  43.20, 'Approved',    '2026-09-15');
IF NOT EXISTS (SELECT 1 FROM requisition WHERE reqNo = 'RQ904')
INSERT INTO requisition (reqNo, requestedBy, ward, itemNo, itemName, cost, qty, subtotal, tax, total, status, [date]) VALUES
('RQ904', 'Linda Ho',    16, 'IT905', 'Face Masks (box)',      6.00, 40, 240.00, 48.00, 288.00, 'Pending',     '2026-09-17');
IF NOT EXISTS (SELECT 1 FROM requisition WHERE reqNo = 'RQ905')
INSERT INTO requisition (reqNo, requestedBy, ward, itemNo, itemName, cost, qty, subtotal, tax, total, status, [date]) VALUES
('RQ905', 'Ahmed Khan',  17, 'IT904', 'IV Cannulas',           2.30, 40,  92.00, 18.40, 110.40, 'Disapproved', '2026-09-14');
GO

-- ---------- supplier ----------
IF NOT EXISTS (SELECT 1 FROM supplier WHERE supNo = 'SUP901')
INSERT INTO supplier (supNo, name, address, tel, fax) VALUES
('SUP901', 'MedSupply Co.',            '1 Industrial Est, Glasgow',  '01506-400011', '01506-400012');
IF NOT EXISTS (SELECT 1 FROM supplier WHERE supNo = 'SUP902')
INSERT INTO supplier (supNo, name, address, tel, fax) VALUES
('SUP902', 'PharmaDirect Ltd',         '22 Trade Park, Glasgow',     '01506-400013', '01506-400014');
IF NOT EXISTS (SELECT 1 FROM supplier WHERE supNo = 'SUP903')
INSERT INTO supplier (supNo, name, address, tel, fax) VALUES
('SUP903', 'HealthGear UK',            '9 Logistics Way, Dundee',    '01506-400015', '01506-400016');
IF NOT EXISTS (SELECT 1 FROM supplier WHERE supNo = 'SUP904')
INSERT INTO supplier (supNo, name, address, tel, fax) VALUES
('SUP904', 'CareLine Distributors',    '4 Enterprise Rd, Dundee',    '01506-400017', '01506-400018');
IF NOT EXISTS (SELECT 1 FROM supplier WHERE supNo = 'SUP905')
INSERT INTO supplier (supNo, name, address, tel, fax) VALUES
('SUP905', 'NHS Procurement Partners', '77 Supply Chain Ave, Perth', '01506-400019', '01506-400020');
GO

-- ---------- bedQueue ----------
IF NOT EXISTS (SELECT 1 FROM bedQueue WHERE patientNo = 'P9101')
INSERT INTO bedQueue (patientNo, patientName, ward, priority, status, requestedAt) VALUES
('P9101', 'Ellen Marsh', 13, 'Urgent', 'Waiting',  '2026-09-16');
IF NOT EXISTS (SELECT 1 FROM bedQueue WHERE patientNo = 'P9102')
INSERT INTO bedQueue (patientNo, patientName, ward, priority, status, requestedAt) VALUES
('P9102', 'Ryan Patel',  15, 'Normal', 'Waiting',  '2026-09-16');
IF NOT EXISTS (SELECT 1 FROM bedQueue WHERE patientNo = 'P9103')
INSERT INTO bedQueue (patientNo, patientName, ward, priority, status, requestedAt) VALUES
('P9103', 'Sofia Rossi', 16, 'Urgent', 'Admitted', '2026-09-15');
IF NOT EXISTS (SELECT 1 FROM bedQueue WHERE patientNo = 'P9104')
INSERT INTO bedQueue (patientNo, patientName, ward, priority, status, requestedAt) VALUES
('P9104', 'Ben Foster',  17, 'Normal', 'Waiting',  '2026-09-17');
IF NOT EXISTS (SELECT 1 FROM bedQueue WHERE patientNo = 'P9105')
INSERT INTO bedQueue (patientNo, patientName, ward, priority, status, requestedAt) VALUES
('P9105', 'Chloe Adams', 14, 'Normal', 'Waiting',  '2026-09-17');
GO

-- ---------- leave_request ----------
IF NOT EXISTS (SELECT 1 FROM leave_request WHERE leaveNo = 'LV9001')
INSERT INTO leave_request (leaveNo, staffNo, staffName, ward, [type], startDate, endDate, reason, status) VALUES
('LV9001', 'S9001', 'John Baker',  13, 'Annual Leave',    '2026-10-01', '2026-10-07', 'Family holiday',  'Pending');
IF NOT EXISTS (SELECT 1 FROM leave_request WHERE leaveNo = 'LV9002')
INSERT INTO leave_request (leaveNo, staffNo, staffName, ward, [type], startDate, endDate, reason, status) VALUES
('LV9002', 'S9002', 'Maria Gomez', 14, 'Sick Leave',      '2026-09-18', '2026-09-19', 'Flu',             'Approved');
IF NOT EXISTS (SELECT 1 FROM leave_request WHERE leaveNo = 'LV9003')
INSERT INTO leave_request (leaveNo, staffNo, staffName, ward, [type], startDate, endDate, reason, status) VALUES
('LV9003', 'S9003', 'Kevin Lee',   15, 'Annual Leave',    '2026-11-05', '2026-11-12', 'Personal trip',   'Pending');
IF NOT EXISTS (SELECT 1 FROM leave_request WHERE leaveNo = 'LV9004')
INSERT INTO leave_request (leaveNo, staffNo, staffName, ward, [type], startDate, endDate, reason, status) VALUES
('LV9004', 'S9004', 'Linda Ho',    16, 'Maternity Leave', '2026-10-15', '2027-01-15', 'Maternity',       'Approved');
IF NOT EXISTS (SELECT 1 FROM leave_request WHERE leaveNo = 'LV9005')
INSERT INTO leave_request (leaveNo, staffNo, staffName, ward, [type], startDate, endDate, reason, status) VALUES
('LV9005', 'S9005', 'Ahmed Khan',  17, 'Unpaid Leave',    '2026-09-25', '2026-09-26', 'Personal matter', 'Rejected');
GO

-- ---------- users ----------
-- pass is bcrypt-hashed for the plain password 'Passw0rd!2026'
-- ($2b$ hashes are accepted by PHP's password_verify() the same as $2y$).
-- Change these passwords after testing.
IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'jbaker9')
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('jbaker9', '$2b$10$CYp0ATHH203qgfkCSLaPD..1K0fCMoDEbibYgK7x5XIxhzKxreM1a', 'Staff',            'John Baker',  'jbaker9@wellmeadows.example', '01506-100011', 'Staff Nurse');
IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'mgomez9')
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('mgomez9', '$2b$10$CYp0ATHH203qgfkCSLaPD..1K0fCMoDEbibYgK7x5XIxhzKxreM1a', 'Charge Nurse',     'Maria Gomez', 'mgomez9@wellmeadows.example', '01506-100012', 'Ward Assistant');
IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'klee9')
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('klee9',   '$2b$10$CYp0ATHH203qgfkCSLaPD..1K0fCMoDEbibYgK7x5XIxhzKxreM1a', 'Charge Nurse',     'Kevin Lee',   'klee9@wellmeadows.example',   '01506-100013', 'Physiotherapist');
IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'lho9')
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('lho9',    '$2b$10$CYp0ATHH203qgfkCSLaPD..1K0fCMoDEbibYgK7x5XIxhzKxreM1a', 'Medical Director', 'Linda Ho',    'lho9@wellmeadows.example',    '01506-100014', 'Pharmacist');
IF NOT EXISTS (SELECT 1 FROM users WHERE [user] = 'akhan9')
INSERT INTO users ([user], pass, role, fullName, email, phone, position) VALUES
('akhan9',  '$2b$10$CYp0ATHH203qgfkCSLaPD..1K0fCMoDEbibYgK7x5XIxhzKxreM1a', 'Staff',            'Ahmed Khan',  'akhan9@wellmeadows.example',  '01506-100015', 'Porter');
GO

PRINT 'Sample data added (or already present). Refresh any page in the web app to see it -- same database, no import step needed.';
