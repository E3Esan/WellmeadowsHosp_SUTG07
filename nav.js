// ===== Page navigation setup =====
const PAGES = [
  ['dashboard', 'Dashboard'],
  ['beds', 'Bed Monitor'],
  ['wards', 'Wards'],
  ['staff', 'Staff'],
  ['patients', 'Patients'],
  ['outpatients', 'Outpatients'],
  ['appointments', 'Appointments'],
  ['medication', 'Medication'],
  ['supplies', 'Supplies'],
  ['pharma', 'Pharmaceuticals'],
  ['requisitions', 'Requisitions'],
  ['suppliers', 'Suppliers'],
  ['leave', 'Leave Requests'],
  ['reports', 'Report Hub'],
  ['users', 'User Management'],
  ['settings', 'Settings']
];

// Navigation menu
document.getElementById('nav').innerHTML = `
  <div class="navBrand" aria-label="Wellmeadows Hospital brand">
    <div class="headerBadge" aria-label="Wellmeadows Hospital logo"></div>
    <div class="navBrandText">
      <strong>Wellmeadows Hospital</strong>
      <span>Care Management</span>
      <span class="navBrandLink" onclick="openFooterModal()">Birth But With Me</span>
    </div>
  </div>
  ${PAGES.map(p => `<button data-p="${p[0]}" onclick="show('${p[0]}')">${p[1]}</button>`).join('')}
`;

function toggleNav(forceOpen = null) {
  const nav = document.getElementById('nav');
  const overlay = document.getElementById('navOverlay');
  if (!nav || !overlay) return;

  const nextState = forceOpen === null ? !nav.classList.contains('open') : forceOpen;
  nav.classList.toggle('open', nextState);
  overlay.classList.toggle('show', nextState);
  document.body.style.overflow = nextState ? 'hidden' : '';
}

function setTheme(isDark) {
  document.body.classList.toggle('dark-mode', !!isDark);
  const button = document.getElementById('themeToggleBtn');
  if (button) button.textContent = isDark ? 'Light' : 'Dark';
  localStorage.setItem('wmTheme', isDark ? 'dark' : 'light');
  if (typeof refreshChartsTheme === 'function') refreshChartsTheme();
}

function toggleTheme() {
  const nextDark = !document.body.classList.contains('dark-mode');
  setTheme(nextDark);
  // Persist the choice to the account (users.theme) when logged in, so it
  // follows the user to another device/browser instead of only living in
  // this browser's localStorage. The column and API support already
  // existed (auth.php update_profile / app-init.js reads it back on
  // login) — this was just never wired up to the toggle button.
  const current = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (current && typeof persistProfileField === 'function') {
    persistProfileField({ theme: nextDark ? 'dark' : 'light' });
  }
}

function show(p) {
  if (typeof canAccessPage === 'function' && !canAccessPage(p)) {
    denyPermission();
    return;
  }

  document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
  document.getElementById(p).classList.add('active');
  window.currentPage = p;

  document.querySelectorAll('nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.p === p);
  });

  toggleNav(false);

  if (p === 'dashboard') renderDash();
  if (p === 'beds') renderBeds();
  if (p === 'reports') {
    const searchValue = document.getElementById('reportSearchInput') ? document.getElementById('reportSearchInput').value : '';
    renderReportsHub(searchValue);
  }
  if (p === 'profile') renderProfilePage();
  if (p === 'settings') renderSettingsPage();
  if (p === 'users') renderUsersPage();
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') toggleNav(false);
});

