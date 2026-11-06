<?php
// ============================================================
// Copy the LIVE data from MySQL (phpMyAdmin) into SQL Server.
//
// sql/DatabaseG07.sql only contains seed data. Anything you added through
// the app while it ran on MySQL lives only in MySQL — this tool moves it.
//
//   php tools/migrate_mysql_to_mssql.php            (dry run: shows the plan)
//   php tools/migrate_mysql_to_mssql.php --run      (copies the data)
//   php tools/migrate_mysql_to_mssql.php --run --force   (continue even if a
//                                                  MySQL column has no target)
//
// Before --run:
//   1. MySQL must be running (Laragon "Start All") and hold the database.
//   2. sql/DatabaseG07.sql must have been run on SQL Server.
//   3. php must have BOTH pdo_mysql and pdo_sqlsrv (php tools/check_env.php).
//
// What it does per table (each table is its own transaction):
//   DELETE target rows -> SET IDENTITY_INSERT ON -> insert every MySQL row
//   with its ORIGINAL id -> IDENTITY_INSERT OFF -> reseed identity -> commit.
// Ids are kept, so anything that refers to a record id stays valid.
// MySQL is only READ. It is never modified.
// ============================================================

if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Command-line only.'); }

require __DIR__ . '/../api/config.php';
require __DIR__ . '/../api/sqlsrv_helpers.php';
date_default_timezone_set(APP_TIMEZONE);

// ---- MySQL source (Laragon / XAMPP defaults) ----
const MY_HOST = '127.0.0.1';
const MY_PORT = 3306;
const MY_DB   = 'wellmeadows';
const MY_USER = 'root';
const MY_PASS = '';

const TABLES = ['users','ward','staff','patient','outpatient','appointment','medication',
                'supply','pharma','requisition','supplier','bedQueue','leave_request'];

$run   = in_array('--run', $argv, true);
$force = in_array('--force', $argv, true);
$STRING_TYPES = ['varchar','nvarchar','char','nchar','text','ntext'];

function out($s = '') { echo $s, "\n"; }

// ---------- connect ----------
try {
    $my = new PDO('mysql:host=' . MY_HOST . ';port=' . MY_PORT . ';dbname=' . MY_DB . ';charset=utf8mb4',
        MY_USER, MY_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (PDOException $e) {
    out('Cannot connect to MySQL: ' . $e->getMessage());
    out('-> Start MySQL in Laragon/XAMPP, check MY_* constants at the top of this file.');
    exit(1);
}
try {
    $ms = mssql_open();
} catch (Throwable $e) {
    out('Cannot connect to SQL Server: ' . $e->getMessage());
    out('-> Run php tools/check_env.php first.');
    exit(1);
}

out('MySQL      : ' . MY_DB . ' @ ' . MY_HOST . ' (' . $my->query('SELECT VERSION()')->fetchColumn() . ')');
out('SQL Server : ' . DB_NAME . ' @ ' . DB_SERVER);
out($run ? 'Mode       : RUN — target tables will be REPLACED' : 'Mode       : DRY RUN — nothing will be written (add --run)');
out(str_repeat('-', 72));

// ---------- plan ----------
// MySQL on Windows stores table names in lower case (bedqueue), so match
// case-insensitively and remember the real name.
$myTables = [];
foreach ($my->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()") as $r) {
    $myTables[strtolower($r['TABLE_NAME'])] = $r['TABLE_NAME'];
}
$extraMy = array_diff(array_keys($myTables), array_map('strtolower', TABLES));

$plan = [];
$blocking = false;
foreach (TABLES as $t) {
    $msCols = table_columns($ms, $t);
    if (!$msCols) { out("  $t: missing on SQL Server — run sql/DatabaseG07.sql"); exit(1); }
    if (!isset($myTables[strtolower($t)])) { out(sprintf('  %-14s not in MySQL — skipped (SQL Server keeps its seed rows)', $t)); continue; }
    $myName = $myTables[strtolower($t)];

    $msByLower = [];
    foreach ($msCols as $c => $type) $msByLower[strtolower($c)] = $c;
    $myCols = [];
    foreach ($my->query("SHOW COLUMNS FROM `$myName`") as $c) $myCols[] = $c['Field'];

    $map = [];   // mysql column => sql server column
    $lost = [];
    foreach ($myCols as $c) {
        if (isset($msByLower[strtolower($c)])) $map[$c] = $msByLower[strtolower($c)];
        else $lost[] = $c;
    }
    $newOnly = array_diff(array_keys($msByLower), array_map('strtolower', $myCols));
    $count = (int) $my->query("SELECT COUNT(*) FROM `$myName`")->fetchColumn();
    $plan[$t] = compact('myName', 'map', 'count', 'msCols');

    out(sprintf('  %-14s %5d rows  %2d columns mapped', $t, $count, count($map)));
    if (!isset($map['id']))  { out('      !! MySQL table has no `id` column — cannot keep ids'); $blocking = true; }
    if ($lost)    { out('      !! MySQL-only columns (data would be LOST): ' . implode(', ', $lost)); $blocking = true; }
    if ($newOnly) out('      .. SQL Server-only columns (left NULL/default): ' . implode(', ', $newOnly));
}
if ($extraMy) out('  Other MySQL tables not copied: ' . implode(', ', $extraMy));
out(str_repeat('-', 72));

if (!$run) { out('Dry run finished. Re-run with --run to copy.'); exit(0); }
if ($blocking && !$force) {
    out('Stopped: fix the "!!" items (add the columns to sql/DatabaseG07.sql), or re-run with --force.');
    exit(1);
}

// ---------- copy ----------
$zeroDates = 0;
$failed = [];
foreach ($plan as $t => $p) {
    $myCols = array_keys($p['map']);
    $msColsUsed = array_values($p['map']);
    $insert = $ms->prepare(
        "INSERT INTO [$t] (" . implode(',', array_map(fn($c) => "[$c]", $msColsUsed)) . ') VALUES (' .
        implode(',', array_fill(0, count($msColsUsed), '?')) . ')'
    );
    $hasId = in_array('id', $msColsUsed, true);

    $ms->beginTransaction();
    try {
        $ms->exec("DELETE FROM [$t]");
        if ($hasId) $ms->exec("SET IDENTITY_INSERT [$t] ON");

        $src = $my->query('SELECT ' . implode(',', array_map(fn($c) => "`$c`", $myCols)) . " FROM `{$p['myName']}` ORDER BY 1");
        $n = 0;
        while ($row = $src->fetch()) {
            $vals = [];
            foreach ($p['map'] as $myCol => $msCol) {
                $v = $row[$myCol];
                $type = $p['msCols'][$msCol];
                if (in_array($type, $STRING_TYPES, true) || $v === null) {
                    $vals[] = $v;                       // keep '' as '' for exact parity
                } elseif (is_string($v) && str_starts_with($v, '0000-00-00')) {
                    $vals[] = null; $zeroDates++;       // MySQL zero-date has no SQL Server equivalent
                } else {
                    $vals[] = normalize_value($v, $type, "$t.$msCol");
                }
            }
            $insert->execute($vals);
            $n++;
        }
        if ($hasId) {
            $ms->exec("SET IDENTITY_INSERT [$t] OFF");
            $ms->exec("DBCC CHECKIDENT ('$t', RESEED) WITH NO_INFOMSGS");
        }
        $ms->commit();
        out(sprintf('  %-14s %5d rows copied', $t, $n));
    } catch (Throwable $e) {
        $ms->rollBack();
        try { if ($hasId) $ms->exec("SET IDENTITY_INSERT [$t] OFF"); } catch (Throwable $ignored) {}
        $failed[$t] = $e->getMessage();
        out(sprintf('  %-14s FAILED (rolled back, target unchanged): %s', $t, $e->getMessage()));
    }
}
if ($zeroDates) out("  note: $zeroDates MySQL zero-date value(s) (0000-00-00) stored as NULL");
out(str_repeat('-', 72));
if ($failed) { out(count($failed) . ' table(s) failed. Fix and re-run — finished tables are simply replaced again.'); exit(1); }
out('Copy finished. Now prove it:  php tools/verify_migration.php');
