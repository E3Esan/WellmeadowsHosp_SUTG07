// ===== Auth =====
// `sessionStorage.wmSession` is kept as a client-side CACHE of the logged-in
// user, refreshed after every login/save/session-check. Real authentication
// lives in the PHP session on the server (api/auth.php) — this cache just
// lets the rest of the app (profile.js, dashboard-reports.js, etc.) keep
// reading `sessionStorage.getItem('wmSession')` exactly as before.
const AUTH_API = 'api/auth.php';

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('wmSession') || 'null'); }
  catch (e) { return null; }
}

function setCurrentUser(user) {
  if (user) sessionStorage.setItem('wmSession', JSON.stringify(user));
  else sessionStorage.removeItem('wmSession');
}

function toggleAuth(which) {
  document.getElementById('loginBox').style.display = which === 'login' ? 'block' : 'none';
  document.getElementById('registerBox').style.display = which === 'register' ? 'block' : 'none';
}

function updateAuthButton() {
  const current = getCurrentUser();
  const btn = document.getElementById('authBtn');
  const userText = document.getElementById('authBtnUser');
  if (!btn || !userText) return;

  if (!current) {
    userText.textContent = 'Login';
    btn.onclick = () => {
      document.getElementById('authOverlay').style.display = 'flex';
      toggleAuth('login');
    };
    return;
  }

  userText.textContent = (current.user || 'User').trim();
  btn.onclick = openUserProfile;
  renderAuthAvatar(current);
}

// Fills the header's round profile button with the user's actual avatar
// photo when they have one, or a colored initial (tinted by their role,
// see roles.js) when they don't. Previously this was always a plain
// person emoji regardless of whether a profile picture existed.
function renderAuthAvatar(current) {
  const avatarEl = document.getElementById('authBtnAvatar');
  if (!avatarEl) return;
  avatarEl.innerHTML = '';
  avatarEl.style.background = '';
  avatarEl.style.color = '';

  if (!current) { avatarEl.textContent = '👤'; return; }

  if (current.avatar) {
    const img = document.createElement('img');
    img.src = current.avatar;
    img.alt = (current.fullName || current.user || 'User') + ' avatar';
    img.className = 'authAvatarImg';
    avatarEl.appendChild(img);
    return;
  }

  const initial = (current.fullName || current.user || '?').trim().charAt(0).toUpperCase() || '?';
  avatarEl.textContent = initial;
  if (typeof getRoleColor === 'function') {
    avatarEl.style.background = getRoleColor(current.role);
    avatarEl.style.color = '#fff';
  }
}

// Ask the server who (if anyone) is logged in. This is the source of truth;
// sessionStorage is just a cache refreshed from this call.
async function checkSession() {
  try {
    const res = await fetch(AUTH_API + '?action=session');
    const data = await res.json();
    setCurrentUser(data.user || null);
  } catch (e) {
    console.error('Could not reach the server to check session:', e.message);
  }
  updateAuthButton();
  return getCurrentUser();
}

function populateProfileFields(current) {
  if (!current) return;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };

  setText('profile-username', current.user || 'User');
  setText('profile-display-name', current.fullName || current.user || 'User');
  setVal('profile-full-name', current.fullName || current.user || '');
  setVal('profile-email', current.email || '');
  setVal('profile-phone', current.phone || '');
  setVal('profile-username-input', current.user || '');
  // Role is read-only on this page now — see pages/profile.php note.
  const roleReadonly = document.getElementById('profile-role-readonly');
  if (roleReadonly) roleReadonly.innerHTML = (typeof roleBadgeHtml === 'function') ? roleBadgeHtml(current.role) : (current.role || '-');
  const pos = document.getElementById('profile-position'); if (pos) pos.value = current.position || '';

  // Status badge — colored by role (see roles.js), and connected to the
  // real `role` column via `current.role` from the users table.
  const badgeWrap = document.getElementById('profile-role-badge-wrap');
  if (badgeWrap) badgeWrap.innerHTML = (typeof roleBadgeHtml === 'function') ? roleBadgeHtml(current.role) : '';

  // Read-only account overview — these columns (position/email/phone/
  // created_at/last_login) were already sent by the API but weren't
  // shown anywhere on the profile page itself.
  setText('profile-meta-position', current.position || '-');
  setText('profile-meta-email', current.email || '-');
  setText('profile-meta-phone', current.phone || '-');
  setText('profile-meta-created', current.created_at ? new Date(current.created_at).toLocaleString() : '-');
  setText('profile-meta-lastlogin', current.last_login ? new Date(current.last_login).toLocaleString() : '-');
}

function openUserProfile() {
  const current = getCurrentUser();
  if (!current) {
    document.getElementById('authOverlay').style.display = 'flex';
    toggleAuth('login');
    return;
  }

  populateProfileFields(current);
  const profilePage = document.getElementById('profile');
  if (profilePage) show('profile'); else console.log('profile page not present');
}

function closeUserProfile() {
  const overlay = document.getElementById('userProfileOverlay');
  if (overlay) overlay.classList.remove('show');
}

async function saveProfileSettings() {
  const current = getCurrentUser();
  if (!current) return;

  const fullNameEl = document.getElementById('profile-full-name');
  const emailEl = document.getElementById('profile-email');
  const phoneEl = document.getElementById('profile-phone');
  const usernameEl = document.getElementById('profile-username-input');
  const posEl = document.getElementById('profile-position');

  // `role` is deliberately never sent here — the API rejects it anyway
  // (see api/auth.php). Role changes only happen via Admin > User
  // Management (api/users.php), by an admin, for any account.
  const payload = {
    fullName: fullNameEl ? fullNameEl.value.trim() : current.fullName,
    email: emailEl ? emailEl.value.trim() : current.email,
    phone: phoneEl ? phoneEl.value.trim() : current.phone,
    user: usernameEl ? usernameEl.value.trim() : current.user,
    position: posEl ? posEl.value.trim() : current.position
  };

  try {
    const res = await fetch(AUTH_API + '?action=update_profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not save profile.', 'error'); return; }
    setCurrentUser(data.user);
    populateProfileFields(data.user);
    updateAuthButton();
    applyNavPermissions();
    showToast('Profile information updated.');
  } catch (e) {
    showToast('Could not reach the server: ' + e.message, 'error');
  }
}

function toggleProfileSettings() {
  const panel = document.getElementById('profile-settings-panel');
  const btn = document.getElementById('profile-settings-toggle');
  if (!panel || !btn) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  btn.textContent = !isOpen ? 'Close' : 'Open';
}

function renderProfilePage() {
  const current = getCurrentUser();
  const avatarEl = document.getElementById('profile-avatar-img');
  const usernameEl = document.getElementById('profile-username');
  const infoEl = document.getElementById('profile-info');
  if (!current) {
    if (usernameEl) usernameEl.textContent = 'Guest';
    const displayNameEl = document.getElementById('profile-display-name');
    if (displayNameEl) displayNameEl.textContent = 'Guest';
    const badgeWrap = document.getElementById('profile-role-badge-wrap');
    if (badgeWrap) badgeWrap.innerHTML = '';
    ['profile-meta-position', 'profile-meta-email', 'profile-meta-phone', 'profile-meta-created', 'profile-meta-lastlogin'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '-';
    });
    if (avatarEl) avatarEl.src = '';
    const settingsPreview = document.getElementById('profile-avatar-settings-img');
    if (settingsPreview) settingsPreview.src = '';
    if (infoEl) infoEl.textContent = '';
    return;
  }

  if (usernameEl) usernameEl.textContent = current.user || current.fullName || 'User';
  populateProfileFields(current);
  const avatar = current.avatar || '';
  if (avatarEl) avatarEl.src = avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23eef2f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23144e97" font-size="36">No Image</text></svg>';
  const settingsPreview = document.getElementById('profile-avatar-settings-img');
  if (settingsPreview) settingsPreview.src = avatar || '';
  if (infoEl) infoEl.textContent = current.info || '';
}

function openProfileFileDialog() {
  const input = document.getElementById('profile-file-input');
  if (input) input.click();
}

function profileFileSelected(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = function (ev) { profileUploadImage(ev.target.result); };
  reader.readAsDataURL(f);
}

function openChangePasswordModal() {
  const overlay = document.getElementById('changePassOverlay');
  if (!overlay) return;
  if (!getCurrentUser()) {
    document.getElementById('authOverlay').style.display = 'flex';
    toggleAuth('login');
    return;
  }
  document.getElementById('change-current-pass').value = '';
  document.getElementById('change-new-pass').value = '';
  document.getElementById('change-confirm-pass').value = '';
  overlay.style.display = 'flex';
}

function closeChangePasswordModal() {
  const overlay = document.getElementById('changePassOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
}

async function handleChangePasswordSubmit() {
  if (!getCurrentUser()) return;
  const cur = document.getElementById('change-current-pass').value;
  const nw = document.getElementById('change-new-pass').value;
  const conf = document.getElementById('change-confirm-pass').value;
  if (!cur || !nw || !conf) { alert('Fill all password fields'); return; }
  if (nw !== conf) { alert('New password and confirmation do not match'); return; }
  if (nw.length < 6) { alert('Use a stronger password with at least 6 characters.'); return; }

  try {
    const res = await fetch(AUTH_API + '?action=change_password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPass: cur, newPass: nw })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Could not change password.'); return; }
    closeChangePasswordModal();
    showToast('Password changed successfully.');
  } catch (e) {
    alert('Could not reach the server: ' + e.message);
  }
}
