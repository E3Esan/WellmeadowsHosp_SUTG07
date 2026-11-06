// ===== Role-based page & action permissions =====
// Canonical role strings (must match the `role` column in `users`
// exactly): 'Admin', 'Staff', 'Charge Nurse', 'Medical Director'.
// ('Administrator' is treated as an alias for 'Admin' so older seeded
// accounts/installs keep working without a database edit.)

// Pages every logged-in user can open regardless of role — nothing in
// the requested access rules mentioned these, so they stay open to all.
const BASE_PAGES = ['dashboard', 'beds', 'staff', 'outpatients', 'appointments', 'settings', 'profile'];

// Additional pages granted per role, on top of BASE_PAGES. Admin isn't
// listed here — it always gets every page (see canAccessPage below).
const ROLE_PAGES = {
  'Staff': ['medication', 'patients', 'wards', 'reports', 'leave', 'requisitions', 'supplies'],
  'Charge Nurse': ['medication', 'patients', 'wards', 'reports', 'leave', 'requisitions', 'supplies', 'pharma'],
  'Medical Director': ['medication', 'patients', 'wards', 'reports', 'leave', 'requisitions', 'supplies', 'pharma', 'suppliers']
};

// Roles allowed to approve/reject leave requests and requisitions.
const APPROVER_ROLES = ['Admin', 'Administrator', 'Charge Nurse', 'Medical Director'];

// Pages that require an Admin/Administrator role, full stop — unlike
// ROLE_PAGES above, these are NEVER granted to a logged-out visitor or
// any other role, even while the session is still loading. Currently
// just the admin User Management page (pages/users.php / api/users.php
// enforces the same rule server-side, so this is UI convenience only —
// it is not the actual security boundary).
const ADMIN_ONLY_PAGES = ['users'];

function isAdminRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin' || r === 'administrator';
}

function currentRole() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  return user ? user.role : null;
}

// true = the current user may open this page. No session yet (still
// loading) always passes so the app doesn't flash a denial before we
// even know who's logged in — the auth overlay covers that case. Admin-
// only pages are the one exception: they stay hidden/blocked until we
// positively know the user is an admin.
function canAccessPage(page) {
  const role = currentRole();
  if (ADMIN_ONLY_PAGES.includes(page)) return !!role && isAdminRole(role);
  if (!role || isAdminRole(role)) return true;
  const allowed = BASE_PAGES.concat(ROLE_PAGES[role] || []);
  return allowed.includes(page);
}

function canApprove() {
  const role = String(currentRole() || '').trim().toLowerCase();
  if (!role) return false;
  return isAdminRole(role) || APPROVER_ROLES.some(r => r.trim().toLowerCase() === role);
}

function denyPermission() {
  showToast("You don't have permission.", 'error');
}

// Hides nav buttons for pages the current role can't open. Call this any
// time we learn (or re-learn) who's logged in: after the initial session
// check, after login, and after a profile save that might have changed
// the role.
function applyNavPermissions() {
  document.querySelectorAll('nav button[data-p]').forEach(btn => {
    btn.style.display = canAccessPage(btn.dataset.p) ? '' : 'none';
  });
  // If the page on screen just became off-limits (e.g. an admin changed
  // this user's role), don't leave a restricted page rendered — bounce
  // back to the dashboard, which every role can see.
  if (window.currentPage && !canAccessPage(window.currentPage)) {
    show('dashboard');
  }
}
