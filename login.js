async function doLogin() {
  const username = document.getElementById('li-user').value.trim();
  const password = document.getElementById('li-pass').value;
  const errEl = document.getElementById('li-err');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Enter your username and password';
    return;
  }

  try {
    const res = await fetch(AUTH_API + '?action=login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, pass: password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Login failed'; return; }

    setCurrentUser(data.user);
    document.getElementById('authOverlay').style.display = 'none';
    updateAuthButton();
    applyNavPermissions();
    showToast(`Welcome back, ${data.user.fullName || data.user.user}.`);

    // Data is public-read, but refresh it so anything mutated by another
    // user while this tab was logged out shows up right away.
    await loadAll();
    Object.keys(SCHEMA).forEach(key => render(key));
    if (typeof renderDash === 'function') renderDash();
    if (typeof renderBeds === 'function') renderBeds();
  } catch (e) {
    errEl.textContent = 'Could not reach the server';
  }
}

async function doRegister() {
  const username = document.getElementById('rg-user').value.trim();
  const password = document.getElementById('rg-pass').value;
  const role = document.getElementById('rg-role').value;
  const fullName = document.getElementById('rg-full-name') ? document.getElementById('rg-full-name').value.trim() : '';
  const email = document.getElementById('rg-email') ? document.getElementById('rg-email').value.trim() : '';
  const phone = document.getElementById('rg-phone') ? document.getElementById('rg-phone').value.trim() : '';
  const errEl = document.getElementById('rg-err');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Username and password required';
    return;
  }

  try {
    const res = await fetch(AUTH_API + '?action=register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, pass: password, role, fullName, email, phone })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Registration failed'; return; }

    toggleAuth('login');
    document.getElementById('li-user').value = username;
    showToast('Account created — you can log in now.');
  } catch (e) {
    errEl.textContent = 'Could not reach the server';
  }
}

async function logout() {
  try { await fetch(AUTH_API + '?action=logout', { method: 'POST' }); } catch (e) { /* ignore */ }
  setCurrentUser(null);
  closeUserProfile();
  document.getElementById('authOverlay').style.display = 'flex';
  toggleAuth('login');
  updateAuthButton();
}
