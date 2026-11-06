<?php
// ============================================================
// Database layer (SQL Server via pdo_sqlsrv).
// Connection settings live in api/config.php — edit that file, not this one.
//
// Requires:
//   - Microsoft ODBC Driver 17 or 18 for SQL Server
//   - Microsoft Drivers for PHP for SQL Server (php_sqlsrv + php_pdo_sqlsrv)
//     matching your PHP version / x64 / Thread Safe (TS) or not (NTS)
// Run  php tools/check_env.php  to test all of this in one go.
// ============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sqlsrv_helpers.php';   // type conversion + error messages (shared with tools/)

date_default_timezone_set(APP_TIMEZONE);

if (PHP_SAPI !== 'cli') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json; charset=utf-8');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Any uncaught exception becomes JSON instead of a PHP HTML error page,
// so the front end always gets something it can show in a toast.
set_exception_handler(function (Throwable $e) {
    if ($e instanceof ValidationError) {
        send(['error' => $e->getMessage()], 400);
    }
    if ($e instanceof PDOException) {
        [$code, $out] = sqlsrv_friendly_error($e);
        send($out, $code);
    }
    send(APP_DEBUG ? ['error' => 'Server error', 'detail' => $e->getMessage()] : ['error' => 'Server error'], 500);
});

// ------------------------------------------------------------
// Connect
// ------------------------------------------------------------
function db_connect(): PDO {
    if (!in_array('sqlsrv', PDO::getAvailableDrivers(), true)) {
        send([
            'error' => 'The pdo_sqlsrv PHP extension is not loaded.',
            'hint'  => 'Copy php_pdo_sqlsrv_<ver>_<ts|nts>_x64.dll into PHP\'s ext folder, add the extension= line to php.ini, restart Apache. Run: php tools/check_env.php',
            'phpVersion' => PHP_VERSION,
        ], 500);
    }
    return mssql_open();
}

try {
    $pdo = db_connect();
} catch (PDOException $e) {
    [$code, $out] = sqlsrv_friendly_error($e);
    $out['hint'] = 'Run  php tools/check_env.php  for a step-by-step diagnosis.';
    send($out, $code);
}

// ------------------------------------------------------------
// Session + permission helpers (unchanged behaviour)
// ------------------------------------------------------------
if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require an active session for actions that change data (POST/PUT/DELETE).
function require_login() {
    if (empty($_SESSION['wmUser'])) {
        send(['error' => 'You must be logged in to do that.'], 401);
    }
    return $_SESSION['wmUser'];
}

function current_user() {
    return $_SESSION['wmUser'] ?? null;
}

// Mirrors isAdminRole() in assets/js/permissions.js — keep both in sync.
function is_admin_role($role) {
    $r = strtolower(trim((string) $role));
    return $r === 'admin' || $r === 'administrator';
}

function require_admin() {
    $me = require_login();
    if (!is_admin_role($me['role'] ?? '')) {
        send(['error' => "You don't have permission. Admins only."], 403);
    }
    return $me;
}
