// ===== Dashboard rendering =====
function renderDash() {
  // render compact staff-on-duty list (Name | Time | Status)
  const staffHtml = [];
  staffHtml.push('<table class="staffList"><tr><th>Name</th><th style="width:110px">Time</th><th>Status</th><th style="width:70px">&nbsp;</th></tr>');
  DB.staff.forEach(staff => {
    const name = (staff.first + ' ' + (staff.last || '')).trim();
    const time = staff.hours ? (String(staff.hours) + 'h') : '-';
    const status = (staff.position ? staff.position + (staff.ward ? ' • Ward ' + staff.ward : '') : '');
    staffHtml.push(`<tr><td><b>${name}</b></td><td>${time}</td><td class="status">${status || '-'}</td><td><button class="infoBtn" onclick="openStaffDetail('${staff.staffNo}')">ℹ️</button></td></tr>`);
  });
  staffHtml.push('</table>');
  document.getElementById('staffWidget').innerHTML = staffHtml.join('');
  renderDashboardStaffBoard();

  let wardHtml = '<tr><th>Ward No</th><th>Name</th><th>Location</th><th>Beds</th><th>Occupied</th><th>Free</th><th>Charge Nurse</th><th>Info</th></tr>';

  DB.ward.forEach(ward => {
    const occupiedBeds = DB.patient.filter(patient => String(patient.ward) === String(ward.number) && patient.status === 'In Ward').length;
    const chargeNurse = DB.staff.find(staff => String(staff.ward) === String(ward.number) && staff.position === 'Charge Nurse');

    wardHtml += `<tr><td>${ward.number}</td><td>${ward.name}</td><td>${ward.location}</td><td>${ward.beds}</td><td>${occupiedBeds}</td><td>${ward.beds - occupiedBeds}</td><td>${chargeNurse ? chargeNurse.first + ' ' + chargeNurse.last : '-'}</td><td><button class="infoBtn" onclick="openWardDetail('${ward.number}')">ℹ️ Info</button></td></tr>`;
  });

  document.getElementById('wardOverview').innerHTML = wardHtml;

  const patientQuick = DB.patient.slice(0, 5).map(patient => `
    <tr>
      <td>${patient.patNo || '-'}</td>
      <td>${patient.first || '-'} ${patient.last || ''}</td>
      <td>${patient.status || '-'}</td>
      <td><button class="infoBtn" onclick="openPatientDetail('${patient.patNo}')">ℹ️ Info</button></td>
    </tr>
  `).join('');

  const supplierQuick = DB.supplier.map(supplier => `
    <tr>
      <td>${supplier.supNo || '-'}</td>
      <td>${supplier.name || '-'}</td>
      <td><button class="infoBtn" onclick="openSupplierDetail('${supplier.supNo}')">ℹ️ Info</button></td>
    </tr>
  `).join('');

  const medicationQuick = DB.medication.slice(0, 5).map(med => `
    <tr>
      <td>${med.patNo || '-'}</td>
      <td>${med.drugName || '-'}</td>
      <td>${med.dosage || '-'}</td>
      <td><button class="infoBtn" onclick="openMedicationDetail('${med.patNo}')">ℹ️ Info</button></td>
    </tr>
  `).join('');

  const dashboardInfo = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:16px; margin-top:24px;">
      <div>
        <h2>Patient Snapshot</h2>
        <table>
          <tr><th>Patient No</th><th>Name</th><th>Status</th><th>Info</th></tr>
          ${patientQuick || '<tr><td colspan="4">No patients</td></tr>'}
        </table>
      </div>
      <div>
        <h2>Supplier Directory</h2>
        <table>
          <tr><th>Supplier No</th><th>Name</th><th>Info</th></tr>
          ${supplierQuick || '<tr><td colspan="3">No suppliers</td></tr>'}
        </table>
      </div>
      <div>
        <h2>Medication Snapshot</h2>
        <table>
          <tr><th>Patient</th><th>Drug</th><th>Dose</th><th>Info</th></tr>
          ${medicationQuick || '<tr><td colspan="4">No medications</td></tr>'}
        </table>
      </div>
    </div>
  `;

  const dashboardRoot = document.getElementById('dashboard');
  if (dashboardRoot) {
    const existing = dashboardRoot.querySelector('#dashboard-info-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'dashboard-info-panel';
    panel.innerHTML = dashboardInfo;
    dashboardRoot.appendChild(panel);
  }

  renderDashboardSlideshow();
  renderDashboardCharts();
}

const STAFF_BOARD_COLORS = ['#b9e5ff', '#ffd6a5', '#cdeccf', '#f7c8d8', '#d9c8f5', '#ffe89a', '#c8e6df', '#f4d5bd'];
let staffBoardRefreshTimer = null;
let staffBoardRefreshInProgress = false;
let staffBoardSnapshot = '';

function staffBoardCanMove() {
  return typeof getCurrentUser === 'function' && !!getCurrentUser();
}

function startStaffBoardRefresh() {
  if (staffBoardRefreshTimer) return;
  staffBoardRefreshTimer = window.setInterval(refreshStaffBoardData, 5000);
}

async function refreshStaffBoardData() {
  if (window.currentPage && window.currentPage !== 'dashboard') return;
  if (staffBoardRefreshInProgress) return;
  staffBoardRefreshInProgress = true;
  try {
    const [staff, wards] = await Promise.all([apiGet('staff'), apiGet('ward')]);
    const nextSnapshot = JSON.stringify({ staff, wards });
    if (nextSnapshot !== staffBoardSnapshot) {
      DB.staff = staff;
      DB.ward = wards;
      renderDash();
    }
  } catch (e) {
    // Keep the current dashboard visible if a background refresh fails.
  } finally {
    staffBoardRefreshInProgress = false;
  }
}

function staffBoardColorMap() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const key = 'wmStaffBoardColors:' + (user ? (user.id || user.user) : 'guest');
  let colors = {};
  try { colors = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { colors = {}; }
  let changed = false;
  (DB.staff || []).forEach(staff => {
    if (!colors[staff.staffNo]) {
      colors[staff.staffNo] = STAFF_BOARD_COLORS[Math.floor(Math.random() * STAFF_BOARD_COLORS.length)];
      changed = true;
    }
  });
  if (changed) localStorage.setItem(key, JSON.stringify(colors));
  return colors;
}

function staffBoardPosition(staff, index) {
  const x = Number(staff.boardX);
  const y = Number(staff.boardY);
  return {
    x: Number.isFinite(x) ? Math.max(2, Math.min(64, x)) : 3 + (index % 2) * 49,
    y: Number.isFinite(y) ? Math.max(2, Math.min(78, y)) : 24 + (Math.floor(index / 2) % 3) * 25
  };
}

function renderDashboardStaffBoard() {
  const board = document.getElementById('dashboardStaffBoard');
  if (!board) return;
  startStaffBoardRefresh();
  staffBoardSnapshot = JSON.stringify({ staff: DB.staff, wards: DB.ward });
  const colors = staffBoardColorMap();
  const canMove = staffBoardCanMove();
  const wards = [...(DB.ward || []), { number: 'unassigned', name: 'Unassigned', location: 'Staff without a ward' }];
  const staffByWard = {};
  (DB.staff || []).forEach(staff => {
    const ward = staff.ward === '' || staff.ward === null || staff.ward === undefined ? 'unassigned' : String(staff.ward);
    if (!staffByWard[ward]) staffByWard[ward] = [];
    staffByWard[ward].push(staff);
  });

  board.innerHTML = `<section class="staff-board-panel">
    <div class="staff-board-head"><div><h2>Staff Ward Board</h2><p>Drag staff cards around a ward space to organise the live staff layout.</p></div><span class="staff-board-permission">${canMove ? 'Layout editing enabled' : 'Sign in to move cards'}</span></div>
    <div class="staff-board-grid">${wards.map(ward => {
      const wardStaff = staffByWard[String(ward.number)] || [];
      return `<section class="staff-ward-space" data-ward="${ward.number}" ondragover="allowStaffBoardDrop(event)" ondrop="dropStaffBoardCard(event, '${ward.number}')">
        <div class="staff-ward-label"><strong>Ward ${ward.number === 'unassigned' ? '' : ward.number}</strong><span>${ward.name}</span><small>${ward.location || ''}</small></div>
        ${wardStaff.map((staff, index) => {
          const position = staffBoardPosition(staff, index);
          const name = `${staff.first || ''} ${staff.last || ''}`.trim() || staff.staffNo || 'Unnamed staff';
          return `<article class="staff-board-card" draggable="${canMove}" data-staff-no="${staff.staffNo}" style="left:${position.x}%;top:${position.y}%;--staff-card-color:${colors[staff.staffNo] || STAFF_BOARD_COLORS[0]}" ondragstart="startStaffBoardDrag(event)">
            <strong>${name}</strong><span>${staff.position || 'Staff'}</span><small>${staff.staffNo || ''}</small>
          </article>`;
        }).join('') || '<div class="staff-ward-empty">Drop staff here</div>'}
      </section>`;
    }).join('')}</div>
  </section>`;
}

function startStaffBoardDrag(event) {
  if (!staffBoardCanMove()) { event.preventDefault(); return; }
  event.dataTransfer.setData('text/plain', event.currentTarget.dataset.staffNo);
  event.dataTransfer.effectAllowed = 'move';
}

function allowStaffBoardDrop(event) {
  if (staffBoardCanMove()) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }
}

async function dropStaffBoardCard(event, targetWard) {
  event.preventDefault();
  if (!staffBoardCanMove()) { denyPermission(); return; }
  const staffNo = event.dataTransfer.getData('text/plain');
  const staff = (DB.staff || []).find(item => String(item.staffNo) === String(staffNo));
  if (!staff) return;

  const space = event.currentTarget;
  const bounds = space.getBoundingClientRect();
  const x = Math.max(2, Math.min(64, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(2, Math.min(78, ((event.clientY - bounds.top) / bounds.height) * 100));
  const patch = { ward: targetWard === 'unassigned' ? '' : targetWard, boardX: Number(x.toFixed(2)), boardY: Number(y.toFixed(2)) };

  try {
    await apiPut('staff', staff.id, patch);
    Object.assign(staff, patch);
    showToast('Staff board position updated.');
    renderDash();
  } catch (e) {
    showToast('Could not move staff card: ' + e.message, 'error');
  }
}

// ===== Dashboard slideshow and image modal =====
