// ===== Settings page =====
function applyDensityPreference(value) {
  document.body.classList.toggle('density-compact', value === 'compact');
  localStorage.setItem('wmDensity', value);
  const current = getCurrentUser();
  if (current) persistProfileField({ density: value });
}

async function savePreferences() {
  const landing = document.getElementById('settings-landing').value;
  localStorage.setItem('wmLandingPage', landing);
  const current = getCurrentUser();
  if (current) {
    const updated = await persistProfileField({ landingPage: landing });
    if (updated) showToast('Preferences saved.');
  } else {
    showToast('Preferences saved on this device.');
  }
}

function renderSettingsPage() {
  const current = getCurrentUser();

  document.getElementById('settings-username').textContent = current ? current.user : 'Not logged in';
  const roleEl = document.getElementById('settings-role');
  if (roleEl) roleEl.innerHTML = current ? ((typeof roleBadgeHtml === 'function') ? roleBadgeHtml(current.role, { small: true }) : (current.role || '-')) : '-';
  document.getElementById('settings-created').textContent = current && current.created_at ? new Date(current.created_at).toLocaleString() : '-';
  document.getElementById('settings-lastlogin').textContent = current && current.last_login ? new Date(current.last_login).toLocaleString() : '-';

  const density = (current && current.density) || localStorage.getItem('wmDensity') || 'normal';
  document.getElementById('settings-density').value = density;

  const landing = (current && current.landingPage) || localStorage.getItem('wmLandingPage') || 'dashboard';
  document.getElementById('settings-landing').value = landing;

  // Admin-only shortcut into User Management — hidden for everyone else,
  // same rule as the nav entry (ADMIN_ONLY_PAGES in permissions.js).
  const adminCard = document.getElementById('settings-admin-card');
  if (adminCard) adminCard.style.display = (current && typeof isAdminRole === 'function' && isAdminRole(current.role)) ? '' : 'none';

  renderSystemStatus();
}

async function renderSystemStatus() {
  const pill = document.getElementById('settings-status-pill');
  const body = document.getElementById('settings-status-body');
  if (!pill || !body) return;

  try {
    const res = await fetch('api/status.php');
    const data = await res.json();
    if (!res.ok || !data.connected) throw new Error(data.error || 'Not connected');

    pill.textContent = 'Connected';
    pill.className = 'statusPill ok';

    const rows = Object.entries(data.tables).map(([table, count]) => `
      <tr><td>${table}</td><td>${count === null ? '<em>missing</em>' : count}</td></tr>
    `).join('');

    body.innerHTML = `
      <p style="margin:4px 0 10px;color:#456;font-size:13px">
        Connected to SQL Server database <b>${data.dbName}</b>${data.serverVersion ? ' on ' + data.serverVersion : ''} · PHP ${data.phpVersion} · Server time ${new Date(data.serverTime).toLocaleString()}
      </p>
      <table class="statusTable">
        <tr><th>Table</th><th>Rows</th></tr>
        ${rows}
      </table>
    `;
  } catch (e) {
    pill.textContent = 'Not connected';
    pill.className = 'statusPill bad';
    body.innerHTML = `<p style="color:var(--warn);font-size:13px">${e.message}. Check <code>api/config.php</code> settings, make sure the <code>sqlsrv</code>/<code>pdo_sqlsrv</code> PHP extensions are enabled, and that <code>sql/DatabaseG07.sql</code> has been run in SSMS.</p>`;
  }
}
