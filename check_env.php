<?php
// ============================================================
// Step-by-step environment check for the SQL Server version.
//
//   php tools/check_env.php
//
// IMPORTANT: run it with the SAME php.exe that Apache uses (Laragon:
// Menu > PHP > the version shown; XAMPP: C:\xampp\php\php.exe), otherwise
// you are testing a different php.ini.
// Stops at the first failing step and tells you what to do.
// ============================================================

if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Command-line only.'); }

require __DIR__ . '/../api/config.php';
require __DIR__ . '/../api/sqlsrv_helpers.php';
date_default_timezone_set(APP_TIMEZONE);

$n = 0;
function step($title) { global $n; $n++; echo "\n[$n] $title\n"; }
function ok($msg)     { echo "    OK    $msg\n"; }
function warn($msg)   { echo "    WARN  $msg\n"; }
function fail($msg, $fix) {
    echo "    FAIL  $msg\n";
    foreach ((array) $fix as $line) echo "          -> $line\n";
    echo "\nStopped. Fix the step above and run this again.\n";
    exit(1);
}

echo "Wellmeadows G07 — SQL Server environment check\n";
echo str_repeat('=', 60) . "\n";

// ------------------------------------------------------------
step('PHP build');
$ver  = PHP_MAJOR_VERSION . PHP_MINOR_VERSION;           // e.g. 83
$ts   = ZEND_THREAD_SAFE ? 'ts' : 'nts';
$arch = PHP_INT_SIZE === 8 ? 'x64' : 'x86';
ok('PHP ' . PHP_VERSION . " ($arch, " . strtoupper($ts) . ')  php.ini: ' . (php_ini_loaded_file() ?: 'none'));
if (PHP_VERSION_ID < 80100) {
    fail('PHP ' . PHP_VERSION . ' is too old for the current SQL Server drivers.', 'Use PHP 8.1 or newer.');
}
$driverRelease = PHP_VERSION_ID < 80300 ? '5.12' : '5.13.x (latest)';
echo "          Driver files you need (Microsoft Drivers $driverRelease for PHP):\n";
echo "            php_sqlsrv_{$ver}_{$ts}_{$arch}.dll\n";
echo "            php_pdo_sqlsrv_{$ver}_{$ts}_{$arch}.dll\n";

// ------------------------------------------------------------
step('PHP extensions');
$drivers = PDO::getAvailableDrivers();
if (!in_array('sqlsrv', $drivers, true)) {
    fail('pdo_sqlsrv is NOT loaded. PDO drivers available: ' . implode(', ', $drivers), [
        "Download from https://github.com/microsoft/msphpsql/releases (release $driverRelease)",
        'Copy the two DLLs above into: ' . (ini_get('extension_dir') ?: '<PHP>\\ext'),
        "Add to php.ini:  extension=php_sqlsrv_{$ver}_{$ts}_{$arch}.dll",
        "                 extension=php_pdo_sqlsrv_{$ver}_{$ts}_{$arch}.dll",
        'Restart Apache. A wrong build (TS/NTS, x86/x64, PHP version) fails SILENTLY.',
    ]);
}
ok('pdo_sqlsrv loaded (PDO drivers: ' . implode(', ', $drivers) . ')');
in_array('mysql', $drivers, true)
    ? ok('pdo_mysql also loaded (needed only by tools/migrate_mysql_to_mssql.php)')
    : warn('pdo_mysql not loaded — fine unless you want to copy data from MySQL');

// ------------------------------------------------------------
step('Reach SQL Server "' . DB_SERVER . '" (auth: ' . DB_AUTH . ')');
try {
    $srv = mssql_open(null);
} catch (PDOException $e) {
    $m = $e->getMessage();
    $fix = ['Raw error: ' . $m];
    if (stripos($m, 'ODBC Driver') !== false && stripos($m, 'install') !== false) {
        $fix[] = 'Install "Microsoft ODBC Driver 18 for SQL Server" (x64), then restart Apache.';
    } elseif (stripos($m, 'certificate') !== false) {
        $fix[] = 'Set DB_TRUST_SERVER_CERT = true in api/config.php.';
    } elseif (stripos($m, 'Login failed') !== false) {
        $fix[] = DB_AUTH === 'windows'
            ? 'Windows login refused. If Apache runs as a service (XAMPP), switch DB_AUTH to \'sql\', or add that account as a login in SSMS.'
            : 'SQL login refused. In SSMS: Server Properties > Security > "SQL Server and Windows Authentication mode", enable the login, restart the service.';
    } else {
        $fix[] = 'Is the service "SQL Server (SQLEXPRESS)" running? (services.msc)';
        $fix[] = 'Is DB_SERVER right? Express = localhost\\SQLEXPRESS, full/Developer = localhost';
        $fix[] = 'Named instances also need the "SQL Server Browser" service, or use localhost,<port>.';
    }
    fail('Cannot connect.', $fix);
}
$info = $srv->query("SELECT CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(50)) v,
                            CAST(SERVERPROPERTY('Edition') AS NVARCHAR(100)) e,
                            SUSER_SNAME() who")->fetch();
ok("Connected: {$info['e']} {$info['v']} as {$info['who']}");
if ((int) explode('.', $info['v'])[0] < 13) {
    fail('SQL Server 2016 (v13) or newer is required (DROP TABLE IF EXISTS).', 'Install SQL Server 2022/2025 Express.');
}

// ------------------------------------------------------------
step('Driver type handling (the two silent defects)');
$r = $srv->query("SELECT CAST(5001 AS INT) AS i, CAST(0.14 AS DECIMAL(15,2)) AS d,
                         CAST('09:30' AS TIME(0)) AS t, N'ทดสอบ — £' AS u")->fetch();
is_int($r['i']) ? ok('INT arrives as PHP int (5001), not "5001"')
                : fail('INT arrived as ' . gettype($r['i']), 'PDO::SQLSRV_ATTR_FETCHES_NUMERIC_TYPE is not taking effect — update the driver.');
$r['d'] === '0.14' ? ok('DECIMAL arrives as "0.14" (leading zero kept)')
                   : fail('DECIMAL arrived as "' . $r['d'] . '"', 'PDO::SQLSRV_ATTR_FORMAT_DECIMALS needs driver 5.6+.');
$r['t'] === '09:30:00' ? ok('TIME(0) arrives as "09:30:00"') : warn('TIME arrived as "' . $r['t'] . '"');
$r['u'] === 'ทดสอบ — £' ? ok('Unicode round-trip OK (Thai, em-dash, £)')
                        : fail('Unicode came back as "' . $r['u'] . '"', 'Check PDO::SQLSRV_ATTR_ENCODING = UTF8 and that the .php files are saved as UTF-8.');

// ------------------------------------------------------------
step('Database "' . DB_NAME . '"');
$exists = $srv->query("SELECT DB_ID(N'" . str_replace("'", "''", DB_NAME) . "') AS id")->fetch()['id'];
if ($exists === null) {
    fail('Database does not exist yet.', [
        'SSMS: open sql/DatabaseG07.sql and press F5, or',
        'sqlcmd -S "' . DB_SERVER . '" ' . (DB_AUTH === 'windows' ? '-E' : '-U ' . DB_USER . ' -P ***') . ' -C -i sql\\DatabaseG07.sql',
    ]);
}
$pdo = mssql_open();
$coll = $pdo->query("SELECT CAST(DATABASEPROPERTYEX(DB_NAME(),'Collation') AS NVARCHAR(100)) c")->fetch()['c'];
ok("Exists, collation $coll");
if (stripos($coll, '_CI_') === false) warn('Collation is case-SENSITIVE — logins will become case-sensitive (MySQL was not).');

// ------------------------------------------------------------
step('Tables and columns');
$expect = ['users','ward','staff','patient','outpatient','appointment','medication',
           'supply','pharma','requisition','supplier','bedQueue','leave_request'];
$missing = [];
foreach ($expect as $t) {
    $cols = table_columns($pdo, $t);
    if (!$cols) { $missing[] = $t; continue; }
    $rows = $pdo->query("SELECT COUNT(*) c FROM [$t]")->fetch()['c'];
    printf("    %-14s %4d rows  %2d columns\n", $t, $rows, count($cols));
}
if ($missing) fail('Missing tables: ' . implode(', ', $missing), 'Run sql/DatabaseG07.sql');
$staff = table_columns($pdo, 'staff');
isset($staff['boardX']) ? ok('staff.boardX/boardY present') : warn('staff.boardX/boardY missing — run sql/add_staff_board_positions.sql');
$pt = table_columns($pdo, 'outpatient')['apptTime'] ?? '';
$prec = $pdo->query("SELECT DATETIME_PRECISION p FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='outpatient' AND COLUMN_NAME='apptTime'")->fetch()['p'];
(int) $prec === 0 ? ok('TIME/DATETIME2 precision is 0 (matches MySQL output)')
                  : warn("outpatient.apptTime is $pt($prec) — times will show as 09:30:00.0000000. Re-create with the new sql/DatabaseG07.sql.");

// ------------------------------------------------------------
step('Login accounts');
$admins = $pdo->query("SELECT COUNT(*) c FROM users WHERE role IN ('Admin','Administrator')")->fetch()['c'];
$admins > 0 ? ok("$admins admin account(s)") : warn('No admin account — User Management will be unreachable.');
$row = $pdo->query("SELECT pass FROM users WHERE [user] = 'admin'")->fetch();
if ($row) {
    password_verify('admin123', $row['pass'])
        ? warn('admin still uses the default password admin123 — change it before a demo on a shared network.')
        : ok('admin password has been changed from the default');
}

echo "\nAll checks passed. Open the app and go to Settings > System Status.\n";
