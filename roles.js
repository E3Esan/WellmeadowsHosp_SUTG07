// ===== Role catalog & status-badge colors =====
// Single source of truth for every selectable account role. Both the
// registration form (#rg-role) and the profile "Role" select
// (#profile-role-input) are populated from ROLE_CATALOG at startup
// (see populateAllRoleSelects below) so the list only has to be edited
// in one place.
//
// The four roles the permission system keys off of (see permissions.js)
// get fixed, meaningful colors. Every other role gets a color assigned
// deterministically from ROLE_PALETTE, based on a hash of the role name
// — that keeps a given role's color stable across reloads/users instead
// of changing every time the badge is drawn (true per-render randomness
// would make the same role look like a different one on every visit).
const ROLE_FIXED_COLORS = {
  'Staff': '#6c757d',            // gray
  'Charge Nurse': '#2b7bd3',     // blue
  'Medical Director': '#2e8b57', // green
  'Admin': '#c0392b',            // red
  'Administrator': '#c0392b'     // alias of Admin (see isAdminRole in permissions.js)
};

// Generic roles beyond the four core ones — titles only, not tied to any
// specific ward/department, so the badge color logic works for any of
// them without special-casing.
const ROLE_CATALOG = [
  'Admin', 'Staff', 'Charge Nurse', 'Medical Director',
  'Doctor', 'Nurse', 'Manager', 'Personnel Officer', 'Receptionist', 'Pharmacist'
];

const ROLE_PALETTE = ['#8b6eb4', '#f0a63a', '#0f9b8e', '#d96c75', '#3fa7d6', '#c9a227', '#e07a5f', '#4a6fa5'];

function roleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// Stable color for any role string — falls back to gray for "no role".
function getRoleColor(role) {
  const key = (role || '').trim();
  if (!key) return ROLE_FIXED_COLORS['Staff'];
  if (ROLE_FIXED_COLORS[key]) return ROLE_FIXED_COLORS[key];
  return ROLE_PALETTE[roleHash(key) % ROLE_PALETTE.length];
}

function roleHexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255, g = (value >> 8) & 255, b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function roleEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

// Builds a colored status pill for a role, e.g. roleBadgeHtml('Charge Nurse').
// Pass { small: true } for a more compact badge (used in tight layouts).
function roleBadgeHtml(role, opts = {}) {
  const label = role && String(role).trim() ? role : 'No role';
  const color = getRoleColor(role);
  const style = `--role-color:${color};--role-bg:${roleHexToRgba(color, 0.14)};--role-border:${roleHexToRgba(color, 0.4)}`;
  const cls = 'roleBadge' + (opts.small ? ' roleBadge-sm' : '');
  return `<span class="${cls}" style="${style}">${roleEscapeHtml(label)}</span>`;
}

// Fills a <select> with the role catalog, keeping its currently selected
// value (if any) intact. Pass includeBlank=true for selects that should
// offer an empty "-- select role --" placeholder option.
function populateRoleSelect(select, includeBlank) {
  if (!select) return;
  const previous = select.value;
  const blank = includeBlank ? '<option value="">-- select role --</option>' : '';
  select.innerHTML = blank + ROLE_CATALOG.map(role => `<option value="${roleEscapeHtml(role)}">${roleEscapeHtml(role)}</option>`).join('');
  if (previous && ROLE_CATALOG.includes(previous)) select.value = previous;
}

function populateAllRoleSelects() {
  populateRoleSelect(document.getElementById('rg-role'), false);
  populateRoleSelect(document.getElementById('profile-role-input'), true);
}

// Elements already exist by the time this script runs (it's loaded at
// the end of <body>, after every include), so populate immediately
// rather than waiting on DOMContentLoaded, which may have already fired.
populateAllRoleSelects();
