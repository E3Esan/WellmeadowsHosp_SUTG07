// Compares the live patient waiting list against DB.bedQueue and creates any
// missing queue rows in the database (patients don't disappear from the
// queue just because nobody looked at the Beds page in a while).
async function syncBedQueue() {
  if (!Array.isArray(DB.bedQueue)) DB.bedQueue = [];

  const waiting = DB.patient.filter(patient => {
    const status = String(patient.status || '').toLowerCase();
    return status === 'waiting list' || status === 'queued' || status === 'waiting';
  });

  // Drop queue rows for patients who are no longer waiting (already admitted
  // elsewhere, discharged, etc.) — these are stale rows in the DB, so delete
  // them for real instead of just filtering them out of the local array.
  const stale = DB.bedQueue.filter(entry => {
    if (entry.status === 'Admitted') return false;
    const patient = DB.patient.find(item => item.patNo === entry.patientNo);
    const stillWaiting = patient && ['waiting list', 'queued', 'waiting'].includes(String(patient.status || '').toLowerCase());
    return !stillWaiting;
  });
  for (const entry of stale) {
    if (entry.id) { try { await apiDelete('bedQueue', entry.id); } catch (e) { /* ignore */ } }
  }
  DB.bedQueue = DB.bedQueue.filter(entry => !stale.includes(entry));

  for (const patient of waiting) {
    const ward = patient.ward || '';
    const match = DB.bedQueue.find(entry => entry.patientNo === patient.patNo && String(entry.ward) === String(ward));
    if (!match) {
      const record = {
        patientNo: patient.patNo,
        patientName: `${patient.first || ''} ${patient.last || ''}`.trim(),
        ward,
        priority: patient.priority || 'Normal',
        status: 'Waiting',
        requestedAt: patient.waitDate || new Date().toISOString().slice(0, 10)
      };
      try {
        const saved = await apiPost('bedQueue', record);
        DB.bedQueue.push(saved);
      } catch (e) { console.error('Could not create bed queue entry:', e.message); }
    }
  }

  return DB.bedQueue;
}

function allocateBedNumber(targetWard, currentPatientNo = null) {
  const wardInfo = DB.ward.find(ward => String(ward.number) === String(targetWard));
  if (!wardInfo) return null;

  const occupied = DB.patient
    .filter(item => String(item.ward) === String(targetWard) && String(item.status).toLowerCase() === 'in ward' && String(item.patNo) !== String(currentPatientNo))
    .map(item => Number(item.bed || 0));

  for (let bed = 1; bed <= Number(wardInfo.beds || 0); bed++) {
    if (!occupied.includes(bed)) return bed;
  }
  return null;
}

async function admitQueuePatient(queueId, wardNo) {
  const queue = await syncBedQueue();
  const entry = queue.find(item => String(item.id) === String(queueId)) || queue.find(item => String(item.ward) === String(wardNo || ''));
  if (!entry) return;

  const patient = DB.patient.find(item => item.patNo === entry.patientNo);
  if (!patient) return;

  const targetWard = String(wardNo || entry.ward || patient.ward || '');
  const nextBed = allocateBedNumber(targetWard, patient.patNo);

  const patientPatch = {
    status: 'In Ward',
    ward: targetWard,
    placedDate: patient.placedDate || new Date().toISOString().slice(0, 10),
    bed: nextBed ? String(nextBed) : (patient.bed || 'Pending'),
    priority: entry.priority || patient.priority || 'Normal'
  };

  try {
    if (patient.id) await apiPut('patient', patient.id, patientPatch);
    Object.assign(patient, patientPatch);

    if (entry.id) await apiDelete('bedQueue', entry.id);
    DB.bedQueue = DB.bedQueue.filter(item => item.id !== entry.id);

    showToast(`${patient.first || ''} ${patient.last || ''} admitted to Ward ${targetWard}.`.trim());
  } catch (e) {
    showToast('Could not admit patient: ' + e.message, 'error');
  }

  renderBeds();
  render('patient');
}

async function updateQueuePriority(queueId, priority) {
  const entry = (DB.bedQueue || []).find(item => String(item.id) === String(queueId));
  if (!entry) return;
  try {
    if (entry.id) await apiPut('bedQueue', entry.id, { priority });
    entry.priority = priority;
  } catch (e) {
    showToast('Could not update priority: ' + e.message, 'error');
  }
  renderBeds();
}

async function addBedQueueEntry(entry) {
  const clean = {
    patientNo: entry.patientNo || '',
    patientName: entry.patientName || '',
    ward: entry.ward || '',
    priority: entry.priority || 'Normal',
    status: entry.status || 'Waiting',
    requestedAt: entry.requestedAt || new Date().toISOString().slice(0, 10)
  };

  if (!clean.patientNo && !clean.patientName) {
    alert('Enter patient details before saving to the queue.');
    return;
  }

  try {
    if (entry.id) {
      const saved = await apiPut('bedQueue', entry.id, clean);
      const index = DB.bedQueue.findIndex(item => String(item.id) === String(entry.id));
      if (index >= 0) DB.bedQueue[index] = { ...DB.bedQueue[index], ...saved };
    } else {
      const saved = await apiPost('bedQueue', clean);
      DB.bedQueue.push(saved);
    }
    showToast('Queue entry saved.');
  } catch (e) {
    showToast('Could not save queue entry: ' + e.message, 'error');
  }

  renderBeds();
}

function editBedQueueEntry(queueId) {
  const entry = (DB.bedQueue || []).find(item => String(item.id) === String(queueId));
  if (!entry) return;

  document.getElementById('queue-patient-no').value = entry.patientNo || '';
  document.getElementById('queue-patient-name').value = entry.patientName || '';
  document.getElementById('queue-ward').value = entry.ward || '';
  document.getElementById('queue-priority').value = entry.priority || 'Normal';
  document.getElementById('queue-status').value = entry.status || 'Waiting';
  document.getElementById('queue-requested-at').value = entry.requestedAt || '';
  document.getElementById('queue-edit-id').value = entry.id;
  document.getElementById('queue-form-title').textContent = 'Edit Queue Entry';
}

async function removeBedQueueEntry(queueId) {
  if (!confirm('Remove this patient from the bed queue?')) return;
  try {
    await apiDelete('bedQueue', queueId);
    DB.bedQueue = (DB.bedQueue || []).filter(item => String(item.id) !== String(queueId));
    showToast('Removed from queue.');
  } catch (e) {
    showToast('Could not remove queue entry: ' + e.message, 'error');
  }
  renderBeds();
}

function submitBedQueueForm() {
  const patientNo = document.getElementById('queue-patient-no').value.trim();
  const patientName = document.getElementById('queue-patient-name').value.trim();
  const ward = document.getElementById('queue-ward').value.trim();
  const priority = document.getElementById('queue-priority').value;
  const status = document.getElementById('queue-status').value;
  const requestedAt = document.getElementById('queue-requested-at').value;
  const editId = document.getElementById('queue-edit-id').value;

  if (!patientNo && !patientName) {
    alert('Patient number or name is required.');
    return;
  }

  addBedQueueEntry({
    id: editId || undefined,
    patientNo,
    patientName,
    ward,
    priority,
    status,
    requestedAt
  });

  document.getElementById('queue-patient-no').value = '';
  document.getElementById('queue-patient-name').value = '';
  document.getElementById('queue-ward').value = '';
  document.getElementById('queue-priority').value = 'Normal';
  document.getElementById('queue-status').value = 'Waiting';
  document.getElementById('queue-requested-at').value = new Date().toISOString().slice(0, 10);
  document.getElementById('queue-edit-id').value = '';
  document.getElementById('queue-form-title').textContent = 'Add Queue Entry';
}

let bedQueueViewMode = 'table';
let bedBlockWardFilter = 'all';
let bedBlockStatusFilter = 'occupied';
let bedMonitorRefreshTimer = null;
let bedMonitorRefreshInProgress = false;
let bedMonitorSnapshot = '';

function startBedMonitorRefresh() {
  if (bedMonitorRefreshTimer) return;
  bedMonitorRefreshTimer = window.setInterval(refreshBedMonitorData, 5000);
}

async function refreshBedMonitorData() {
  if (window.currentPage && window.currentPage !== 'beds') return;
  if (bedMonitorRefreshInProgress) return;

  bedMonitorRefreshInProgress = true;
  try {
    const [wards, patients, queue] = await Promise.all([
      apiGet('ward'),
      apiGet('patient'),
      apiGet('bedQueue')
    ]);
    const nextSnapshot = JSON.stringify({ wards, patients, queue });
    if (nextSnapshot !== bedMonitorSnapshot) {
      DB.ward = wards;
      DB.patient = patients;
      DB.bedQueue = queue;
      bedMonitorSnapshot = nextSnapshot;
      await renderBeds();
    }
  } catch (e) {
    // Keep the current monitor visible if a background refresh temporarily fails.
  } finally {
    bedMonitorRefreshInProgress = false;
  }
}

function canMoveBedBlocks() {
  return typeof canApprove === 'function' && canApprove();
}

function toggleBedQueueMode() {
  bedQueueViewMode = bedQueueViewMode === 'table' ? 'blocks' : 'table';
  renderBeds();
}

function updateBedBlockFilter(type, value) {
  if (type === 'ward') bedBlockWardFilter = value;
  if (type === 'status') bedBlockStatusFilter = value;
  renderBeds();
}

function bedBlockStatus(patient, hasUrgentQueue) {
  return patient ? 'occupied' : (hasUrgentQueue ? 'attention' : 'available');
}

function renderBedBlocks() {
  const eligibleWards = DB.ward.filter(ward => bedBlockWardFilter === 'all' || String(ward.number) === String(bedBlockWardFilter));
  const canMove = canMoveBedBlocks();
  const blocks = [];

  eligibleWards.forEach(ward => {
    const wardPatients = DB.patient.filter(patient => String(patient.ward) === String(ward.number) && String(patient.status || '').toLowerCase() === 'in ward');
    const urgentQueue = (DB.bedQueue || []).some(item => String(item.ward) === String(ward.number) && String(item.priority || '').toLowerCase() === 'urgent');
    const occupiedByBed = {};
    wardPatients.forEach(patient => {
      if (patient.bed !== '' && patient.bed !== null && patient.bed !== undefined) occupiedByBed[String(patient.bed)] = patient;
    });
    const totalBeds = Math.max(Number(ward.beds || 0), ...wardPatients.map(patient => Number(patient.bed || 0)), 0);

    for (let bedNumber = 1; bedNumber <= totalBeds; bedNumber += 1) {
      const patient = occupiedByBed[String(bedNumber)] || null;
      const status = bedBlockStatus(patient, urgentQueue);
      if (bedBlockStatusFilter !== 'all' && status !== bedBlockStatusFilter) continue;
      const patientName = patient ? `${patient.first || ''} ${patient.last || ''}`.trim() : '';
      blocks.push(`<article class="bed-block ${status}" draggable="${canMove}" data-ward="${ward.number}" data-bed="${bedNumber}"
        ondragstart="startBedBlockDrag(event)" ondragover="allowBedBlockDrop(event)" ondrop="dropBedBlock(event, ${ward.number}, ${bedNumber})">
        <div class="bed-block-top"><strong>Bed ${bedNumber}</strong><span>Ward ${ward.number}</span></div>
        <div class="bed-block-icon" aria-hidden="true">▱</div>
        <strong>${patient ? 'Occupied' : status === 'attention' ? 'Needs bed' : 'Available'}</strong>
        <small>${patientName || (status === 'attention' ? 'Urgent queue' : 'Ready for allocation')}</small>
      </article>`);
    }
  });

  return `<section class="bed-block-panel">
    <div class="bed-block-toolbar">
      <div><h3>Bed Block Management</h3><p>Physical bed view for allocation and urgent placement.</p></div>
      <div class="bed-block-filters">
        <label>Ward <select onchange="updateBedBlockFilter('ward', this.value)">
          <option value="all" ${bedBlockWardFilter === 'all' ? 'selected' : ''}>All wards</option>
          ${DB.ward.map(ward => `<option value="${ward.number}" ${String(bedBlockWardFilter) === String(ward.number) ? 'selected' : ''}>Ward ${ward.number} - ${ward.name}</option>`).join('')}
        </select></label>
        <label>Show <select onchange="updateBedBlockFilter('status', this.value)">
          <option value="occupied" ${bedBlockStatusFilter === 'occupied' ? 'selected' : ''}>Occupied</option>
          <option value="available" ${bedBlockStatusFilter === 'available' ? 'selected' : ''}>Available</option>
          <option value="attention" ${bedBlockStatusFilter === 'attention' ? 'selected' : ''}>Needs attention</option>
          <option value="all" ${bedBlockStatusFilter === 'all' ? 'selected' : ''}>All beds</option>
        </select></label>
      </div>
    </div>
    <div class="bed-block-legend"><span><i class="legend-dot available"></i>Available</span><span><i class="legend-dot occupied"></i>Occupied</span><span><i class="legend-dot attention"></i>Needs attention</span></div>
    <div class="bed-block-grid">${blocks.join('') || '<p class="bed-block-empty">No beds match the selected filters.</p>'}</div>
    ${canMove ? '<p class="bed-block-note">Drag a bed block onto another bed to change its ward or bed position.</p>' : '<p class="bed-block-note">Only Admin, Charge Nurse, and Medical Director can move bed blocks.</p>'}
  </section>`;
}

function startBedBlockDrag(event) {
  if (!canMoveBedBlocks()) { event.preventDefault(); return; }
  event.dataTransfer.setData('text/plain', JSON.stringify({ ward: event.currentTarget.dataset.ward, bed: event.currentTarget.dataset.bed }));
  event.dataTransfer.effectAllowed = 'move';
}

function allowBedBlockDrop(event) {
  if (canMoveBedBlocks()) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
}

async function dropBedBlock(event, targetWard, targetBed) {
  event.preventDefault();
  if (!canMoveBedBlocks()) { denyPermission(); return; }
  let source;
  try { source = JSON.parse(event.dataTransfer.getData('text/plain')); } catch (e) { return; }
  if (!source || (String(source.ward) === String(targetWard) && String(source.bed) === String(targetBed))) return;

  const sourcePatient = DB.patient.find(patient => String(patient.ward) === String(source.ward) && String(patient.bed) === String(source.bed) && String(patient.status || '').toLowerCase() === 'in ward');
  if (!sourcePatient) return;
  const targetPatient = DB.patient.find(patient => String(patient.ward) === String(targetWard) && String(patient.bed) === String(targetBed) && String(patient.status || '').toLowerCase() === 'in ward');
  try {
    await apiPut('patient', sourcePatient.id, { ward: String(targetWard), bed: String(targetBed) });
    Object.assign(sourcePatient, { ward: String(targetWard), bed: String(targetBed) });
    if (targetPatient) {
      await apiPut('patient', targetPatient.id, { ward: String(source.ward), bed: String(source.bed) });
      Object.assign(targetPatient, { ward: String(source.ward), bed: String(source.bed) });
    }
    showToast('Bed position updated.');
    renderBeds();
  } catch (e) {
    showToast('Could not move bed: ' + e.message, 'error');
  }
}

async function renderBeds() {
  startBedMonitorRefresh();
  await syncBedQueue();

  bedMonitorSnapshot = JSON.stringify({
    wards: DB.ward,
    patients: DB.patient,
    queue: DB.bedQueue
  });

  const queuePanel = document.getElementById('bedQueuePanel');
  const bedsHtml = DB.ward.map(ward => {
    const occupied = DB.patient.filter(patient => String(patient.ward) === String(ward.number) && patient.status === 'In Ward').length;
    const free = ward.beds - occupied;
    const percent = Math.min(100, Math.round((occupied / ward.beds) * 100));
    const queueItems = (DB.bedQueue || []).filter(item => String(item.ward) === String(ward.number));

    return `<div class="wardbox" style="padding:12px;border:1px solid var(--bd);border-radius:12px;background:#fff;">
      <h3>Ward ${ward.number} – ${ward.name}</h3>
      <span class="tag">${ward.location}</span>
      <div class="bar"><div style="width:${percent}%"></div></div>
      <div>${occupied}/${ward.beds} occupied</div>
      <div class="${free > 0 ? 'free' : 'full'}">${free > 0 ? free + ' beds free' : 'FULL'}</div>
      <div style="margin-top:12px;font-size:12px;color:#456;">
        <strong>Queue (${queueItems.length})</strong>
        ${queueItems.length ? queueItems.slice(0, 3).map(item => `<div style="margin-top:6px;display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>${item.patientName}</span><span style="font-size:11px;padding:2px 6px;border-radius:999px;background:#eef5ff;color:#234;">${item.priority}</span></div>`).join('') : '<div style="margin-top:6px; color:#678;">No patients waiting</div>'}
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
        <button class="act" onclick="admitQueuePatient('${queueItems[0] ? queueItems[0].id : ''}', ${ward.number})" ${queueItems.length ? '' : 'disabled'}>Admit next</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('bedGrid').innerHTML = bedsHtml;

  const queueRows = (DB.bedQueue || []).map(item => `
    <tr>
      <td>${item.patientName}</td>
      <td>${item.patientNo}</td>
      <td>${item.ward || '-'}</td>
      <td>
        <select onchange="updateQueuePriority('${item.id}', this.value)">
          <option value="Urgent" ${item.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
          <option value="Normal" ${item.priority === 'Normal' ? 'selected' : ''}>Normal</option>
          <option value="Routine" ${item.priority === 'Routine' ? 'selected' : ''}>Routine</option>
        </select>
      </td>
      <td>${item.status || 'Waiting'}</td>
      <td>${item.requestedAt || '-'}</td>
      <td>
        <button class="infoBtn" onclick="editBedQueueEntry('${item.id}')">Edit</button>
        <button class="act" onclick="admitQueuePatient('${item.id}', ${item.ward || 0})">Admit</button>
        <button class="del" onclick="removeBedQueueEntry('${item.id}')">Del</button>
      </td>
    </tr>
  `).join('');

  const modeButton = `<div class="bed-mode-toolbar"><button class="infoBtn" onclick="toggleBedQueueMode()">${bedQueueViewMode === 'table' ? 'Block Mode' : 'Table Mode'}</button><span>${bedQueueViewMode === 'table' ? 'Use bed blocks for a visual allocation view.' : 'Use the table for detailed queue management.'}</span></div>`;
  queuePanel.innerHTML = bedQueueViewMode === 'blocks' ? modeButton + renderBedBlocks() : modeButton + `
    <div style="border:1px solid var(--bd); border-radius:12px; padding:14px; background:#fff;">
      <h3 style="margin:0 0 10px;">Bed Queue Management</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px; margin-bottom:12px; border:1px solid var(--bd); border-radius:8px; padding:10px; background:#f8fbff;">
        <div><label style="display:block;font-size:11px;color:#456;">Patient No</label><input id="queue-patient-no" style="width:100%;"></div>
        <div><label style="display:block;font-size:11px;color:#456;">Patient Name</label><input id="queue-patient-name" style="width:100%;"></div>
        <div><label style="display:block;font-size:11px;color:#456;">Ward</label><input id="queue-ward" style="width:100%;"></div>
        <div><label style="display:block;font-size:11px;color:#456;">Priority</label><select id="queue-priority" style="width:100%;"><option value="Urgent">Urgent</option><option value="Normal" selected>Normal</option><option value="Routine">Routine</option></select></div>
        <div><label style="display:block;font-size:11px;color:#456;">Status</label><select id="queue-status" style="width:100%;"><option value="Waiting" selected>Waiting</option><option value="Review">Review</option><option value="Admitted">Admitted</option></select></div>
        <div><label style="display:block;font-size:11px;color:#456;">Requested</label><input id="queue-requested-at" type="date" style="width:100%;" value="${new Date().toISOString().slice(0, 10)}"></div>
        <input id="queue-edit-id" type="hidden" value="">
      </div>
      <div style="display:flex;gap:8px;align-items:center; margin-bottom:12px;">
        <strong id="queue-form-title">Add Queue Entry</strong>
        <button class="act" onclick="submitBedQueueForm()">Save Queue Entry</button>
      </div>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr><th>Patient</th><th>Patient No</th><th>Ward</th><th>Priority</th><th>Status</th><th>Requested</th><th>Action</th></tr>
        </thead>
        <tbody>${queueRows || '<tr><td colspan="7" style="padding:10px; color:#678;">No patients in the bed queue.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// NOTE: setTheme()/show('dashboard') used to run right here at module-load
// time. They now run from initApp() in app-init.js, after loadAll()
// resolves — see the note in render-table.js for why.
