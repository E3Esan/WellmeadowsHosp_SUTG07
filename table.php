<?php
// ============================================================
// Generic CRUD endpoint for every data table (not `users` — that has its
// own endpoint, auth.php, so password hashes are never exposed here).
//
//   GET    table.php?table=ward                -> list all rows
//   GET    table.php?table=ward&q=cardio        -> simple search across columns
//   POST   table.php?table=ward   (JSON body)   -> insert a row, returns new row incl. id
//   PUT    table.php?table=ward&id=5 (JSON body)-> update a row
//   DELETE table.php?table=ward&id=5            -> delete a row
//
// `key=leave` in the URL maps to the `leave_request` table (LEAVE is a
// reserved word in T-SQL too), everything else maps 1:1 to a table of the
// same name.
// ============================================================

require __DIR__ . '/db.php';

// Whitelist: table key => [real table name, allowed columns]. This is what
// stops a caller from reading/writing arbitrary tables or columns.
$TABLES = [
    'ward'        => ['ward', ['number','name','location','beds','extn']],
    'staff'       => ['staff', ['staffNo','first','last','address','tel','dob','sex','nin','position','salary','scale','ward','hours','contract','pay','qual','institution','workExperience','medicalRecord','photo','fileName','file','boardX','boardY']],
    'patient'     => ['patient', ['patNo','first','last','address','tel','dob','sex','marital','kinName','kinRel','localDoctor','allergies','medicalRecord','ward','bed','waitDate','placedDate','expLeave','actualLeave','status','priority','refDocName','refDoc','fileName','file']],
    'outpatient'  => ['outpatient', ['patNo','first','last','address','tel','dob','sex','localDoctor','apptDate','apptTime','refDocName','refDoc','fileName','file']],
    'appointment' => ['appointment', ['apptNo','patNo','consultant','staffNo','date','time','room','referral','reason','localDoctor','fee','taxRate','paymentStatus','total','uploadedAt','refDocName','refDoc','fileName','file']],
    'medication'  => ['medication', ['patNo','patName','ward','bed','drugNo','drugName','dosage','method','units','start','finish']],
    'supply'      => ['supply', ['itemNo','name','desc','qty','reorder','cost','taxRate','paymentStatus','total','uploadedAt','photo','fileName','file']],
    'pharma'      => ['pharma', ['drugNo','name','desc','dosage','method','qty','reorder','cost','category','uses','sideEffects','warnings','photo','fileName','file']],
    'requisition' => ['requisition', ['reqNo','requestedBy','ward','itemNo','itemName','dosage','method','cost','qty','subtotal','tax','total','status','date','uploadedAt','approvedAt','fileName','file']],
    'supplier'    => ['supplier', ['supNo','name','address','tel','fax','photo','fileName','file']],
    'bedQueue'    => ['bedQueue', ['patientNo','patientName','ward','priority','status','requestedAt','admittedAt']],
    'leave'       => ['leave_request', ['leaveNo','staffNo','staffName','ward','type','startDate','endDate','reason','status','approvedBy','requestedAt']],
];

$key = $_GET['table'] ?? '';
if (!isset($TABLES[$key])) {
    send(['error' => 'Unknown or disallowed table: ' . $key], 400);
}
[$table, $cols] = $TABLES[$key];

// Only use whitelisted columns that really exist in this database. This keeps
// older installations working (e.g. before sql/add_staff_board_positions.sql
// added boardX/boardY) and gives us each column's SQL type for normalisation.
$colTypes = table_columns($pdo, $table);
if (!$colTypes) {
    send(['error' => "Table [$table] does not exist. Run sql/DatabaseG07.sql in SSMS."], 500);
}
$cols = array_values(array_filter($cols, fn($c) => isset($colTypes[$c])));

$method = $_SERVER['REQUEST_METHOD'];
$colList = implode(',', array_map(fn($c) => "[$c]", $cols));

// Empty strings become NULL; dates, times and numbers are converted to the
// exact format SQL Server expects for that column (see normalize_value()).
function cleanValue($v, $col) {
    global $colTypes;
    return normalize_value($v, $colTypes[$col] ?? 'nvarchar', $col);
}

function read_id() {
    $id = $_GET['id'] ?? null;
    if ($id === null || !ctype_digit((string) $id)) send(['error' => 'Missing or invalid id'], 400);
    return (int) $id;
}

if ($method === 'GET') {
    // Ensure the standard bed-monitor wards exist on older installations too.
    // This keeps every client reading the same ward set from the database.
    if ($key === 'ward') {
        $defaultWards = [
            [1, 'Emergency', 'Main Building', 20, '7701'],
            [2, 'Medical', 'Main Building', 20, '7702'],
            [3, 'Surgical', 'Main Building', 20, '7703'],
            [4, 'Paediatric', 'North Wing', 20, '7704'],
            [5, 'Maternity', 'North Wing', 20, '7705'],
            [6, 'Oncology', 'North Wing', 20, '7706'],
            [7, 'Neurology', 'South Wing', 20, '7707'],
            [8, 'Intensive Care Unit', 'South Wing', 20, '7708'],
            [9, 'Rehabilitation', 'South Wing', 20, '7709'],
            [10, 'Geriatric', 'South Wing', 20, '7710']
        ];
        // One set-based statement instead of 10 round trips per page load.
        $values = implode(',', array_fill(0, count($defaultWards), '(?,?,?,?,?)'));
        $pdo->prepare(
            "INSERT INTO [ward] ([number],[name],[location],[beds],[extn])
             SELECT v.n, v.nm, v.loc, v.b, v.e
             FROM (VALUES $values) AS v(n, nm, loc, b, e)
             WHERE NOT EXISTS (SELECT 1 FROM [ward] w WHERE w.[number] = v.n)"
        )->execute(array_merge(...$defaultWards));
    }

    $q = trim($_GET['q'] ?? '');
    if ($q !== '') {
        $like = '%' . like_escape($q) . '%';
        // CAST so INT/DATE/DECIMAL columns are searchable as text too.
        $stmt = $pdo->prepare("SELECT id, $colList FROM [$table] WHERE " .
            implode(' OR ', array_map(fn($c) => "CAST([$c] AS NVARCHAR(MAX)) LIKE ? ESCAPE '\\'", $cols)) . " ORDER BY id");
        $stmt->execute(array_fill(0, count($cols), $like));
    } else {
        $stmt = $pdo->prepare("SELECT id, $colList FROM [$table] ORDER BY id");
        $stmt->execute();
    }
    send($stmt->fetchAll());
}

if ($method === 'POST') {
    require_login();
    $data = body();
    $insertCols = [];
    $placeholders = [];
    $values = [];
    foreach ($cols as $c) {
        if (array_key_exists($c, $data)) {
            $insertCols[] = "[$c]";
            $placeholders[] = '?';
            $values[] = cleanValue($data[$c], $c);
        }
    }
    if (empty($insertCols)) send(['error' => 'No valid columns supplied'], 400);
    // OUTPUT INSERTED.id returns the new IDENTITY value from the same
    // statement — more reliable than lastInsertId() with pdo_sqlsrv.
    $sql = "INSERT INTO [$table] (" . implode(',', $insertCols) . ") OUTPUT INSERTED.id VALUES (" . implode(',', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    $newId = (int) $stmt->fetchColumn();
    $get = $pdo->prepare("SELECT id, $colList FROM [$table] WHERE id = ?");
    $get->execute([$newId]);
    send($get->fetch(), 201);
}

// Roles allowed to approve/reject requisitions and leave requests.
// Mirrors assets/js/permissions.js — keep both lists in sync.
const APPROVER_ROLES = ['Admin', 'Administrator', 'Charge Nurse', 'Medical Director'];

if ($method === 'PUT') {
    $me = require_login();
    $id = read_id();
    $data = body();

    // Status changes on these two tables are approve/reject actions —
    // restrict them to approver roles even if someone calls the API
    // directly (the UI already hides/blocks this for other roles).
    if (($key === 'requisition' || $key === 'leave') && array_key_exists('status', $data)) {
        $myRole = strtolower(trim((string) ($me['role'] ?? '')));
        $allowed = array_map(fn($r) => strtolower(trim($r)), APPROVER_ROLES);
        if ($myRole === '' || !in_array($myRole, $allowed, true)) {
            send(['error' => "You don't have permission."], 403);
        }
    }
    $setParts = [];
    $values = [];
    foreach ($cols as $c) {
        if (array_key_exists($c, $data)) {
            $setParts[] = "[$c] = ?";
            $values[] = cleanValue($data[$c], $c);
        }
    }
    if (empty($setParts)) send(['error' => 'No valid columns supplied'], 400);
    $values[] = $id;
    $sql = "UPDATE [$table] SET " . implode(',', $setParts) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    if ($stmt->rowCount() === 0) send(['error' => 'Record not found'], 404);
    $get = $pdo->prepare("SELECT id, $colList FROM [$table] WHERE id = ?");
    $get->execute([$id]);
    send($get->fetch());
}

if ($method === 'DELETE') {
    require_login();
    $id = read_id();
    $stmt = $pdo->prepare("DELETE FROM [$table] WHERE id = ?");
    $stmt->execute([$id]);
    send(['ok' => true]);
}

send(['error' => 'Method not allowed'], 405);
