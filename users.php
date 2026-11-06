<?php
// ============================================================
// Admin-only User Management endpoint. Every action here requires an
// active session AND an Admin/Administrator role (require_admin() in
// db.php) — this is deliberately separate from auth.php's
// `update_profile`, which only ever touches the logged-in user's own
// row and can no longer change `role` at all.
//
//   GET    users.php               -> list every account (no password hashes)
//   PUT    users.php?id=5          -> update another user's fields, incl. role
//                                      (JSON body: any of fullName, email,
//                                      phone, position, role, user, newPass)
//   DELETE users.php?id=5          -> delete an account (not your own, and
//                                      not the last remaining admin)
// ============================================================

require __DIR__ . '/db.php';

$me = require_admin();

// `user` is a reserved word in T-SQL (a niladic function), so it must be
// bracket-quoted whenever it's used as a column name.
const PUBLIC_USER_COLS = 'id, [user], role, fullName, email, phone, position, info, avatar, theme, density, landingPage, created_at, last_login';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT " . PUBLIC_USER_COLS . " FROM users ORDER BY id");
    send($stmt->fetchAll());
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) send(['error' => 'Missing id'], 400);
    $data = body();

    $target = $pdo->prepare('SELECT id, [user], role FROM users WHERE id = ?');
    $target->execute([$id]);
    $targetRow = $target->fetch();
    if (!$targetRow) send(['error' => 'User not found'], 404);

    // Username changes: check uniqueness before accepting.
    if (!empty($data['user']) && $data['user'] !== $targetRow['user']) {
        $check = $pdo->prepare('SELECT id FROM users WHERE [user] = ? AND id != ?');
        $check->execute([$data['user'], $id]);
        if ($check->fetch()) send(['error' => 'Username already exists. Choose another.'], 409);
    }

    // Don't allow demoting the very last remaining admin — locks everyone
    // (including the person doing it) out of user management for good.
    if (array_key_exists('role', $data) && is_admin_role($targetRow['role']) && !is_admin_role($data['role'] ?? '')) {
        $adminCount = $pdo->query("SELECT COUNT(*) c FROM users WHERE role IN ('Admin','Administrator')")->fetch()['c'];
        if ((int) $adminCount <= 1) {
            send(['error' => 'Cannot remove the last remaining admin. Promote another account first.'], 400);
        }
    }

    $editable = ['user', 'fullName', 'email', 'phone', 'position', 'role'];
    $set = [];
    $values = [];
    foreach ($editable as $col) {
        if (array_key_exists($col, $data)) {
            $set[] = "[$col] = ?";
            $values[] = $data[$col];
        }
    }

    // Optional admin password reset — same hashing as auth.php.
    if (!empty($data['newPass'])) {
        if (strlen($data['newPass']) < 6) send(['error' => 'New password must be at least 6 characters.'], 400);
        $set[] = '[pass] = ?';
        $values[] = password_hash($data['newPass'], PASSWORD_DEFAULT);
    }

    if (empty($set)) send(['error' => 'No fields supplied'], 400);

    $values[] = $id;
    $pdo->prepare('UPDATE users SET ' . implode(',', $set) . ' WHERE id = ?')->execute($values);

    // If the admin edited their own account (role, username, etc.), keep
    // this session in sync immediately instead of waiting for next login.
    if ((int) $id === (int) $me['id']) {
        if (!empty($data['user'])) $_SESSION['wmUser']['user'] = $data['user'];
        if (!empty($data['role'])) $_SESSION['wmUser']['role'] = $data['role'];
    }

    $stmt = $pdo->prepare('SELECT ' . PUBLIC_USER_COLS . ' FROM users WHERE id = ?');
    $stmt->execute([$id]);
    send(['user' => $stmt->fetch()]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) send(['error' => 'Missing id'], 400);

    if ((int) $id === (int) $me['id']) {
        send(['error' => "You can't delete your own account while logged in as it."], 400);
    }

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $target->execute([$id]);
    $targetRow = $target->fetch();
    if (!$targetRow) send(['error' => 'User not found'], 404);

    if (is_admin_role($targetRow['role'])) {
        $adminCount = $pdo->query("SELECT COUNT(*) c FROM users WHERE role IN ('Admin','Administrator')")->fetch()['c'];
        if ((int) $adminCount <= 1) {
            send(['error' => 'Cannot delete the last remaining admin.'], 400);
        }
    }

    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    send(['ok' => true]);
}

send(['error' => 'Method not allowed'], 405);
