<?php
// ============================================================
// Auth + profile + settings endpoint. Passwords are hashed with
// password_hash() — never stored or returned in plain text.
//
//   GET  auth.php?action=session          -> current logged-in user, or null
//   POST auth.php?action=login            {user, pass}
//   POST auth.php?action=register         {user, pass, role, fullName, email, phone}
//   POST auth.php?action=logout
//   POST auth.php?action=update_profile   {fullName?, email?, phone?, position?, info?,
//                                           avatar?, role?, user? (new username),
//                                           theme?, density?, landingPage?}
//   POST auth.php?action=change_password  {currentPass, newPass}
// ============================================================

require __DIR__ . '/db.php';

// Columns on `users` a client is allowed to read back (never `pass`).
// `user` is a reserved word in T-SQL (a niladic function), so it must be
// bracket-quoted whenever it's used as a column name.
const PUBLIC_USER_COLS = 'id, [user], role, fullName, email, phone, position, info, avatar, theme, density, landingPage, created_at, last_login';
$publicCols = PUBLIC_USER_COLS;
$action = $_GET['action'] ?? '';

if ($action === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $u = current_user();
    if (!$u) send(['user' => null]);
    // Re-fetch fresh from DB so profile edits made elsewhere are always current.
    $stmt = $pdo->prepare("SELECT $publicCols FROM users WHERE id = ?");
    $stmt->execute([$u['id']]);
    $row = $stmt->fetch();
    if (!$row) { unset($_SESSION['wmUser']); send(['user' => null]); }
    send(['user' => $row]);
}

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body();
    $user = trim($data['user'] ?? '');
    $pass = $data['pass'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE [user] = ?");
    $stmt->execute([$user]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($pass, $row['pass'])) {
        send(['error' => 'Invalid username or password'], 401);
    }

    $pdo->prepare("UPDATE users SET last_login = SYSDATETIME() WHERE id = ?")->execute([$row['id']]);

    unset($row['pass']);
    $_SESSION['wmUser'] = ['id' => $row['id'], 'user' => $row['user'], 'role' => $row['role']];
    send(['user' => $row]);
}

if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body();
    $user = trim($data['user'] ?? '');
    $pass = $data['pass'] ?? '';
    $role = $data['role'] ?? 'Personnel Officer';
    $fullName = trim($data['fullName'] ?? '') ?: $user;
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');

    if ($user === '' || $pass === '') {
        send(['error' => 'Username and password required'], 400);
    }
    if (strlen($pass) < 6) {
        send(['error' => 'Password must be at least 6 characters'], 400);
    }

    $check = $pdo->prepare("SELECT id FROM users WHERE [user] = ?");
    $check->execute([$user]);
    if ($check->fetch()) {
        send(['error' => 'Username already exists'], 409);
    }

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users ([user], pass, role, fullName, email, phone) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user, $hash, $role, $fullName, $email, $phone]);
    send(['ok' => true], 201);
}

if ($action === 'logout') {
    unset($_SESSION['wmUser']);
    session_destroy();
    send(['ok' => true]);
}

if ($action === 'update_profile' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $me = require_login();
    $data = body();

    // Username changes: check uniqueness before accepting.
    if (!empty($data['user']) && $data['user'] !== $me['user']) {
        $check = $pdo->prepare("SELECT id FROM users WHERE [user] = ? AND id != ?");
        $check->execute([$data['user'], $me['id']]);
        if ($check->fetch()) send(['error' => 'Username already exists. Choose another.'], 409);
    }

    // `role` is intentionally left out of self-service profile edits — see
    // isAdminRole()/api/users.php. Only an Admin/Administrator account may
    // change a role, and only through the admin-only User Management
    // endpoint (which can change *any* user's role, not just their own).
    // This stops any logged-in user from granting themselves admin rights
    // by editing their own profile, which the API previously allowed.
    $editable = ['user', 'fullName', 'email', 'phone', 'position', 'info', 'avatar', 'theme', 'density', 'landingPage'];
    if (array_key_exists('role', $data)) {
        send(['error' => "You don't have permission to change your role. Ask an administrator."], 403);
    }
    $set = [];
    $values = [];
    foreach ($editable as $col) {
        if (array_key_exists($col, $data)) {
            $set[] = "[$col] = ?";
            $values[] = $data[$col] === '' && $col === 'avatar' ? null : $data[$col];
        }
    }
    if (empty($set)) send(['error' => 'No profile fields supplied'], 400);

    $values[] = $me['id'];
    $pdo->prepare("UPDATE users SET " . implode(',', $set) . " WHERE id = ?")->execute($values);

    // Keep the session's username in sync if it changed.
    if (!empty($data['user'])) $_SESSION['wmUser']['user'] = $data['user'];

    $stmt = $pdo->prepare("SELECT $publicCols FROM users WHERE id = ?");
    $stmt->execute([$me['id']]);
    send(['user' => $stmt->fetch()]);
}

if ($action === 'change_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $me = require_login();
    $data = body();
    $current = $data['currentPass'] ?? '';
    $new = $data['newPass'] ?? '';

    if (!$current || !$new) send(['error' => 'Fill all password fields'], 400);
    if (strlen($new) < 6) send(['error' => 'Use a stronger password with at least 6 characters.'], 400);

    $stmt = $pdo->prepare("SELECT pass FROM users WHERE id = ?");
    $stmt->execute([$me['id']]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row['pass'])) {
        send(['error' => 'Current password is incorrect.'], 401);
    }

    $hash = password_hash($new, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET pass = ? WHERE id = ?")->execute([$hash, $me['id']]);
    send(['ok' => true]);
}

send(['error' => 'Unknown action'], 400);
