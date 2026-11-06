<?php
// ============================================================
// Shared SQL Server helpers — used by api/db.php AND by the command-line
// tools in tools/, so the migration converts values with exactly the same
// rules the live API uses. No output, no connection in this file.
// Requires api/config.php to be loaded first.
// ============================================================

// Thrown by normalize_value() when the browser sends something that cannot
// go into the column's SQL type. Turned into a clean HTTP 400.
class ValidationError extends Exception {}

// Opens the SQL Server connection described in api/config.php.
// $database = null connects to the server's default DB (used by check_env
// to test the server before the wellmeadows database exists).
function mssql_open(?string $database = DB_NAME): PDO {
    if (!in_array('sqlsrv', PDO::getAvailableDrivers(), true)) {
        throw new RuntimeException('pdo_sqlsrv extension is not loaded');
    }
    $dsn = 'sqlsrv:Server=' . DB_SERVER . ';LoginTimeout=5';
    if ($database !== null) $dsn .= ';Database=' . $database;
    if (DB_TRUST_SERVER_CERT) $dsn .= ';TrustServerCertificate=1';

    // Windows Authentication = pass NULL user/pass (not empty strings).
    $user = DB_AUTH === 'sql' ? DB_USER : null;
    $pass = DB_AUTH === 'sql' ? DB_PASS : null;

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::SQLSRV_ATTR_ENCODING    => PDO::SQLSRV_ENCODING_UTF8,
        // pdo_sqlsrv returns INT columns as strings ("5") by default, while
        // pdo_mysql on PHP 8.1+ returns 5. The JS compares ids with ===
        // (e.g. admin-users.js: usersCache.find(u => u.id === id)), so
        // without this the User Management "Edit" button silently breaks.
        PDO::SQLSRV_ATTR_FETCHES_NUMERIC_TYPE => true,
        // Without this DECIMAL 0.15 comes back as ".15" (no leading zero),
        // which the Supplies page would display as-is.
        PDO::SQLSRV_ATTR_FORMAT_DECIMALS => true,
    ]);
    return $pdo;
}

// ------------------------------------------------------------
// Translate SQL Server errors into messages a user can act on.
// errorInfo[1] is SQL Server's native error number.
// ------------------------------------------------------------
function sqlsrv_friendly_error(PDOException $e): array {
    $native = (int) ($e->errorInfo[1] ?? 0);
    $state  = (string) ($e->errorInfo[0] ?? $e->getCode());
    $map = [
        2627  => [409, 'That value already exists (duplicate key).'],
        2601  => [409, 'That value already exists (duplicate key).'],
        515   => [400, 'A required field is empty.'],
        8152  => [400, 'A value is too long for its column.'],
        2628  => [400, 'A value is too long for its column.'],
        245   => [400, 'A number field received text.'],
        8114  => [400, 'A field received a value of the wrong type.'],
        8115  => [400, 'A number is too large for its column.'],
        241   => [400, 'A date/time field has an invalid format. Use YYYY-MM-DD / HH:MM.'],
        242   => [400, 'A date/time value is out of range.'],
        208   => [500, 'A table is missing. Run sql/DatabaseG07.sql in SSMS.'],
        207   => [500, 'A column is missing. Run the sql/add_*.sql upgrade scripts in SSMS.'],
        4060  => [500, 'Database "' . DB_NAME . '" not found. Run sql/DatabaseG07.sql in SSMS.'],
        18456 => [500, 'SQL Server refused the login. Check DB_AUTH / DB_USER / DB_PASS in api/config.php.'],
    ];
    if (isset($map[$native])) {
        [$code, $msg] = $map[$native];
    } elseif ($state === '08001' || $state === 'HYT00') {
        [$code, $msg] = [500, 'Cannot reach SQL Server "' . DB_SERVER . '". Is the SQL Server (SQLEXPRESS) service running, and is DB_SERVER correct?'];
    } else {
        [$code, $msg] = [500, 'Database error.'];
    }
    $out = ['error' => $msg];
    if (APP_DEBUG) $out['detail'] = $e->getMessage();
    return [$code, $out];
}

// ------------------------------------------------------------
// Column type lookup + value normalisation
// ------------------------------------------------------------

// Returns ['colName' => 'data_type', ...] for a dbo table (cached per request).
function table_columns(PDO $pdo, string $table): array {
    static $cache = [];
    if (!isset($cache[$table])) {
        $stmt = $pdo->prepare(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION"
        );
        $stmt->execute([$table]);
        $cache[$table] = array_column($stmt->fetchAll(), 'DATA_TYPE', 'COLUMN_NAME');
    }
    return $cache[$table];
}

function parse_date_value(string $v, string $field): DateTime {
    $v = trim($v);
    // ISO forms: 2004-01-12, 2004-01-12 10:00:00, 2026-09-16T02:35:00.123Z
    if (preg_match('/^\d{4}-\d{2}-\d{2}([ T].*)?$/', $v)) {
        try {
            $dt = new DateTime($v);
            $dt->setTimezone(new DateTimeZone(APP_TIMEZONE));
            return $dt;
        } catch (Exception $e) { /* fall through */ }
    }
    // Day-first forms typed by hand: 12/01/2004, 12-01-2004
    foreach (['!d/m/Y', '!d-m-Y', '!d/m/Y H:i', '!d/m/Y H:i:s'] as $fmt) {
        $dt = DateTime::createFromFormat($fmt, $v);
        $err = DateTime::getLastErrors();   // false on PHP 8.2+, array on 8.1
        if ($dt && ($err === false || ($err['warning_count'] === 0 && $err['error_count'] === 0))) return $dt;
    }
    throw new ValidationError("\"$field\" must be a date like 2004-01-31 (got \"$v\").");
}

// Converts one incoming JSON value into something SQL Server will accept
// for the column's type. '' becomes NULL (same behaviour as before).
function normalize_value($v, string $type, string $field) {
    if ($v === '' || $v === null) return null;
    if (is_bool($v)) return $v ? 1 : 0;
    if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);

    switch ($type) {
        case 'int': case 'smallint': case 'tinyint': case 'bigint':
            if (is_numeric($v) && (float) $v == (int) $v) return (int) $v;
            throw new ValidationError("\"$field\" must be a whole number (got \"$v\").");

        case 'decimal': case 'numeric': case 'float': case 'real': case 'money': case 'smallmoney':
            if (is_numeric($v)) return (string) $v;
            throw new ValidationError("\"$field\" must be a number (got \"$v\").");

        case 'bit':
            return in_array(strtolower((string) $v), ['1', 'true', 'yes', 'on'], true) ? 1 : 0;

        case 'date':
            return parse_date_value((string) $v, $field)->format('Y-m-d');

        case 'datetime2': case 'datetime': case 'smalldatetime':
            return parse_date_value((string) $v, $field)->format('Y-m-d H:i:s');

        case 'time':
            $s = trim((string) $v);
            if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?$/', $s, $m)) {
                $h = (int) $m[1];
                if (!empty($m[4])) {
                    $pm = strtolower($m[4]) === 'pm';
                    if ($h === 12) $h = 0;
                    if ($pm) $h += 12;
                }
                $min = (int) $m[2];
                $sec = isset($m[3]) && $m[3] !== '' ? (int) $m[3] : 0;
                if ($h < 24 && $min < 60 && $sec < 60) return sprintf('%02d:%02d:%02d', $h, $min, $sec);
            }
            throw new ValidationError("\"$field\" must be a time like 09:30 (got \"$s\").");

        default:
            return (string) $v;
    }
}

// Escape user text for use inside LIKE ... ESCAPE '\'
function like_escape(string $s): string {
    return strtr($s, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_', '[' => '\\[']);
}
