<?php
// ============================================================
// Prove the migration worked — not just "it ran without errors".
//
//   php tools/verify_migration.php               checks 1-4
//   php tools/verify_migration.php --write-test  also check 5 (safe: rolled back)
//
//   1. COUNT    row count per table, MySQL vs SQL Server
//   2. CONTENT  every row, every column, compared by id
//   3. UNICODE  rows with non-ASCII text (Thai, em-dash, £) survive
//   4. SHAPE    what PHP actually receives from SQL Server has the same
//               JSON shape the front end got from MySQL:
//                 INT     -> PHP int     ("5" would break === in the JS)
//                 DECIMAL -> "0.15"      (not ".15")
//                 TIME    -> "09:30:00"  (not "09:30:00.0000000")
//                 DATETIME2 -> "2026-09-16 09:35:00"
//   5. WRITE    re-save every row through the API's own conversion code
//               inside a transaction, re-read, compare, then ROLLBACK.
//
// If MySQL is not running, checks 1-3 are skipped and 4-5 still run —
// useful after MySQL has been retired.
// Exit code 0 = all passed.
// ============================================================

if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Command-line only.'); }

require __DIR__ . '/../api/config.php';
require __DIR__ . '/../api/sqlsrv_helpers.php';
date_default_timezone_set(APP_TIMEZONE);

const MY_HOST = '127.0.0.1';
const MY_PORT = 3306;
const MY_DB   = 'wellmeadows';
const MY_USER = 'root';
const MY_PASS = '';

const TABLES = ['users','ward','staff','patient','outpatient','appointment','medication',
                'supply','pharma','requisition','supplier','bedQueue','leave_request'];

$writeTest = in_array('--write-test', $argv, true);
$INT  = ['int','smallint','tinyint','bigint','bit'];
$DEC  = ['decimal','numeric','money','smallmoney','float','real'];
$STR  = ['varchar','nvarchar','char','nchar','text','ntext'];

function canon($v, string $type) {
    global $INT, $DEC;
    if ($v === null) return null;
    if (in_array($type, $INT, true)) return (int) $v;
    if (in_array($type, $DEC, true)) return sprintf('%.6F', (float) $v);
    if ($type === 'date') return substr((string) $v, 0, 10);
    if (in_array($type, ['datetime2','datetime','smalldatetime'], true)) return substr((string) $v, 0, 19);
    if ($type === 'time') return substr((string) $v, 0, 8);
    return (string) $v;
}
function has_non_ascii(array $row): bool {
    foreach ($row as $v) if (is_string($v) && preg_match('/[^\x00-\x7F]/', $v)) return true;
    return false;
}

$ms = mssql_open();
try {
    $my = new PDO('mysql:host=' . MY_HOST . ';port=' . MY_PORT . ';dbname=' . MY_DB . ';charset=utf8mb4',
        MY_USER, MY_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $myTables = [];
    foreach ($my->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()") as $r) {
        $myTables[strtolower($r['TABLE_NAME'])] = $r['TABLE_NAME'];
    }
} catch (Throwable $e) {
    $my = null;
    echo "MySQL not reachable — skipping checks 1-3 (" . $e->getMessage() . ")\n";
}

$fail = 0;
$totMy = 0; $totMs = 0;
printf("\n%-14s %7s %7s %6s %8s %8s %s\n", 'TABLE', 'MYSQL', 'MSSQL', 'COUNT', 'CONTENT', 'UNICODE', 'SHAPE');
echo str_repeat('-', 72), "\n";

$allRows = [];
foreach (TABLES as $t) {
    $types = table_columns($ms, $t);
    $msRows = [];
    foreach ($ms->query("SELECT * FROM [$t] ORDER BY id") as $r) $msRows[$r['id']] = $r;
    $allRows[$t] = [$types, $msRows];
    $totMs += count($msRows);

    // ---- 4. SHAPE ----
    $shapeErr = [];
    foreach ($msRows as $r) {
        foreach ($r as $c => $v) {
            if ($v === null) continue;
            $ty = $types[$c];
            if (in_array($ty, $INT, true) && !is_int($v))                         $shapeErr[$c] = "INT as " . gettype($v);
            if (in_array($ty, ['decimal','numeric'], true) && !preg_match('/^-?\d+(\.\d+)?$/', $v)) $shapeErr[$c] = "DECIMAL \"$v\"";
            if ($ty === 'time' && !preg_match('/^\d\d:\d\d:\d\d$/', $v))          $shapeErr[$c] = "TIME \"$v\"";
            if ($ty === 'datetime2' && !preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/', $v)) $shapeErr[$c] = "DATETIME2 \"$v\"";
        }
    }
    $shape = $shapeErr ? 'FAIL' : 'ok';

    // ---- 1-3 ----
    $countRes = $contentRes = $uniRes = '-';
    $myCount = '-';
    $diffs = [];
    if ($my && isset($myTables[strtolower($t)])) {
        $myRows = [];
        foreach ($my->query("SELECT * FROM `{$myTables[strtolower($t)]}`") as $r) $myRows[$r['id']] = $r;
        $myCount = count($myRows);
        $totMy += $myCount;
        $countRes = $myCount === count($msRows) ? 'ok' : 'FAIL';

        $uniMy = count(array_filter($myRows, 'has_non_ascii'));
        $uniMs = count(array_filter(array_intersect_key($msRows, $myRows), 'has_non_ascii'));
        $uniRes = $uniMy === $uniMs ? "ok($uniMy)" : "FAIL";

        foreach ($myRows as $id => $mr) {
            if (!isset($msRows[$id])) { $diffs[] = "id $id missing in SQL Server"; continue; }
            foreach ($mr as $c => $mv) {
                $msKey = null;
                foreach ($types as $k => $_) if (strcasecmp($k, $c) === 0) { $msKey = $k; break; }
                if ($msKey === null) continue;
                $a = canon($mv, $types[$msKey]);
                $b = canon($msRows[$id][$msKey], $types[$msKey]);
                if (is_string($mv) && str_starts_with($mv, '0000-00-00') && $b === null) continue;
                if ($a !== $b) $diffs[] = "id $id .$msKey: MySQL=" . json_encode($a, JSON_UNESCAPED_UNICODE) . ' MSSQL=' . json_encode($b, JSON_UNESCAPED_UNICODE);
            }
        }
        $contentRes = $diffs ? 'FAIL' : 'ok';
    }

    printf("%-14s %7s %7d %6s %8s %8s %s\n", $t, $myCount, count($msRows), $countRes, $contentRes, $uniRes, $shape);
    foreach (array_slice($diffs, 0, 5) as $d) echo "     diff: $d\n";
    if (count($diffs) > 5) echo "     ... " . (count($diffs) - 5) . " more\n";
    foreach ($shapeErr as $c => $e) echo "     shape: $c -> $e\n";
    if ($countRes === 'FAIL' || $contentRes === 'FAIL' || $uniRes === 'FAIL' || $shape === 'FAIL') $fail++;
}
echo str_repeat('-', 72), "\n";
printf("%-14s %7s %7d\n", 'TOTAL', $my ? $totMy : '-', $totMs);

// ---- 5. WRITE round-trip ----
if ($writeTest) {
    echo "\nWrite round-trip (inside a transaction, rolled back at the end):\n";
    $ms->beginTransaction();
    try {
        foreach ($allRows as $t => [$types, $rows]) {
            $cols = array_values(array_filter(array_keys($types), fn($c) => $c !== 'id'));
            $upd = $ms->prepare("UPDATE [$t] SET " . implode(',', array_map(fn($c) => "[$c] = ?", $cols)) . " WHERE id = ?");
            $blankToNull = 0;
            foreach ($rows as $id => $r) {
                $vals = [];
                foreach ($cols as $c) {
                    if ($r[$c] === '' ) $blankToNull++;
                    $vals[] = normalize_value($r[$c], $types[$c], $c);   // the API's own path
                }
                $vals[] = $id;
                $upd->execute($vals);
            }
            $bad = 0;
            foreach ($ms->query("SELECT * FROM [$t] ORDER BY id") as $after) {
                $before = $rows[$after['id']];
                foreach ($cols as $c) {
                    $a = canon($before[$c] === '' ? null : $before[$c], $types[$c]);
                    if ($a !== canon($after[$c], $types[$c])) $bad++;
                }
            }
            printf("  %-14s %5d rows  %s%s\n", $t, count($rows), $bad ? "FAIL ($bad values changed)" : 'unchanged',
                $blankToNull ? "  (note: $blankToNull empty string(s) become NULL on save — existing app behaviour)" : '');
            if ($bad) $fail++;
        }
    } finally {
        $ms->rollBack();
        echo "  rolled back — database untouched\n";
    }
}

echo "\n", $fail ? "RESULT: $fail table(s) with problems.\n" : "RESULT: all checks passed.\n";
exit($fail ? 1 : 0);
