<?php
// ============================================================
// Read-only system status for the Settings page: proves the DB connection
// is live and shows how many rows are in each table right now.
//   GET status.php -> { connected, dbName, serverTime, tables: {ward: 2, ...} }
// ============================================================

require __DIR__ . '/db.php';

$tables = ['ward','staff','patient','outpatient','appointment','medication','supply','pharma','requisition','supplier','bedQueue','leave_request','users'];
$counts = [];
foreach ($tables as $t) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) AS c FROM [$t]");
        $counts[$t] = (int) $stmt->fetch()['c'];
    } catch (PDOException $e) {
        $counts[$t] = null; // table missing — DatabaseG07.sql probably not (re)imported yet
    }
}

$info = $pdo->query(
    "SELECT DB_NAME() AS db,
            CONVERT(VARCHAR(19), SYSDATETIME(), 126) AS [now],
            CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(50)) AS version,
            CAST(SERVERPROPERTY('Edition') AS NVARCHAR(100)) AS edition,
            CAST(SERVERPROPERTY('ServerName') AS NVARCHAR(100)) AS server,
            CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS NVARCHAR(100)) AS collation"
)->fetch();

send([
    'connected'     => true,
    'driver'        => 'sqlsrv',
    'dbName'        => $info['db'] ?? null,
    'serverTime'    => $info['now'] ?? null,
    'server'        => $info['server'] ?? null,
    'serverVersion' => trim(($info['edition'] ?? '') . ' ' . ($info['version'] ?? '')),
    'collation'     => $info['collation'] ?? null,
    'phpVersion'    => PHP_VERSION,
    'tables'        => $counts,
]);
