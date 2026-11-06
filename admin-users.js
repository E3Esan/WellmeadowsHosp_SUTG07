// ===== Admin > User Management =====
// Talks to api/users.php (admin-only: require_admin() rejects anyone else
// server-side, regardless of what the UI shows/hides). This is a separate
// endpoint from api/auth.php's self-service `update_profile` on purpose —
// it can read and edit *every* account, including role.
const USERS_API = 'api/users.php';

let usersCache = [];

async function fetchAllUsers() {
  const res = await fetch(USERS_API);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load users.');
  return data;
}

function userMatchesQuery(user, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [user.user, user.fullName, user.role, user.email, user.phone]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(needle));
}

async function renderUsersPage(query) {
  const table = document.getElementById('t-users');
  const empty = document.getElementById('users-empty');
  if (!table) return;

  const q = query !== undefined ? query : (document.getElementById('users-search') ? document.getElementById('users-search').value : '');

  const headerRow = '<tr><th>User</th><th>Full name</th><th>Role</th><th>Email</th><th>Phone</th><th>Last login</th><th></th></tr>';

  try {
    usersCache = await fetchAllUsers();
  } catch (e) {
    table.innerHTML = headerRow;
    if (empty) { empty.style.display = 'block'; empty.textContent = e.message; }
    return;
  }

  const rows = usersCache.filter(u => userMatchesQuery(u, q));

  if (!rows.length) {
    table.innerHTML = headerRow;
    setupTableWindow(table);
    if (empty) { empty.style.display = 'block'; empty.textContent = 'No accounts found.'; }
    return;
  }
  if (empty) empty.style.display = 'none';

  const me = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;

  table.innerHTML = headerRow + rows.map(u => `
    <tr>
      <td>${roleEscapeHtml(u.user || '-')}${me && me.id === u.id ? ' <small style="color:#889">(you)</small>' : ''}</td>
      <td>${roleEscapeHtml(u.fullName || '-')}</td>
      <td>${(typeof roleBadgeHtml === 'function') ? roleBadgeHtml(u.role) : roleEscapeHtml(u.role || '-')}</td>
      <td>${roleEscapeHtml(u.email || '-')}</td>
      <td>${roleEscapeHtml(u.phone || '-')}</td>
      <td>${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
      <td><button class="infoBtn" onclick="openUserEditModal(${u.id})">Edit</button></td>
    </tr>
  `).join('');

  setupTableWindow(table);
}

function openUserEditModal(id) {
  const user = usersCache.find(u => u.id === id);
  if (!user) return;

  document.getElementById('ue-id').value = user.id;
  document.getElementById('ue-user').value = user.user || '';
  document.getElementById('ue-fullName').value = user.fullName || '';
  document.getElementById('ue-email').value = user.email || '';
  document.getElementById('ue-phone').value = user.phone || '';
  document.getElementById('ue-position').value = user.position || '';
  document.getElementById('ue-newPass').value = '';
  document.getElementById('ue-err').textContent = '';

  const roleSelect = document.getElementById('ue-role');
  if (typeof populateRoleSelect === 'function') populateRoleSelect(roleSelect, false);
  if (roleSelect) roleSelect.value = user.role || '';

  const overlay = document.getElementById('userEditOverlay');
  if (overlay) overlay.classList.add('show');
}

function closeUserEditModal() {
  const overlay = document.getElementById('userEditOverlay');
  if (overlay) overlay.classList.remove('show');
}

async function saveUserEdit() {
  const id = document.getElementById('ue-id').value;
  if (!id) return;

  const payload = {
    user: document.getElementById('ue-user').value.trim(),
    fullName: document.getElementById('ue-fullName').value.trim(),
    email: document.getElementById('ue-email').value.trim(),
    phone: document.getElementById('ue-phone').value.trim(),
    position: document.getElementById('ue-position').value.trim(),
    role: document.getElementById('ue-role').value
  };
  const newPass = document.getElementById('ue-newPass').value;
  if (newPass) payload.newPass = newPass;

  const errEl = document.getElementById('ue-err');
  if (errEl) errEl.textContent = '';

  try {
    const res = await fetch(USERS_API + '?id=' + encodeURIComponent(id), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save user.');

    // If the admin just edited their own account, keep the header/profile
    // UI (avatar, role badge, nav permissions) in sync immediately instead
    // of only picking up the change on next login.
    const me = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (me && String(me.id) === String(id) && typeof setCurrentUser === 'function') {
      setCurrentUser(data.user);
      if (typeof updateAuthButton === 'function') updateAuthButton();
      if (typeof applyNavPermissions === 'function') applyNavPermissions();
    }

    closeUserEditModal();
    showToast('User updated.');
    renderUsersPage();
  } catch (e) {
    if (errEl) errEl.textContent = e.message; else showToast(e.message, 'error');
  }
}

async function deleteUserAccount() {
  const id = document.getElementById('ue-id').value;
  if (!id) return;
  const username = document.getElementById('ue-user').value || 'this account';
  if (!confirm(`Delete ${username}? This cannot be undone.`)) return;

  try {
    const res = await fetch(USERS_API + '?id=' + encodeURIComponent(id), { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not delete user.');
    closeUserEditModal();
    showToast('Account deleted.');
    renderUsersPage();
  } catch (e) {
    const errEl = document.getElementById('ue-err');
    if (errEl) errEl.textContent = e.message; else showToast(e.message, 'error');
  }
}
