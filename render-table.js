function render(key, query = '', filterType = 'all') {
  buildSearchSuggestions();
  const schema = SCHEMA[key];
  const rows = DB[key] || [];
  const normalized = rows.map((row, index) => ({ ...normalizePaymentRow(row, key), __index: index }));
  const searchText = String(query || '').trim().toLowerCase();
  const filtered = searchText
    ? normalized.filter(row => getSearchFieldValue(row, filterType).includes(searchText))
    : normalized;

  let html = '<tr>' + schema.labels.map(label => `<th>${label}</th>`).join('') + (key === 'ward' || key === 'staff' || key === 'patient' || key === 'pharma' || key === 'medication' || key === 'supply' || key === 'supplier' || key === 'appointment' ? '<th>Details</th>' : '') + '<th>Actions</th></tr>';

  filtered.forEach(row => {
    const realIndex = row.__index;

    html += '<tr>' + schema.fields.map(field => {
      if (field === 'photo') {
        return `<td>${row.photo ? `<img src="${row.photo}" alt="${row.name || 'image'}" onerror="this.style.display='none'; this.parentElement.innerHTML='-';">` : '-'}</td>`;
      }
      if (field === 'file' || field === 'refDoc') {
        const value = row[field];
        const name = row[field + 'Name'] || (field === 'refDoc' ? "Patient's Referral Document" : 'file');
        return `<td>${value ? `<a href="${value}" download="${name}">📎 ${name}</a>` : '-'}</td>`;
      }
      if (field === 'total' || field === 'subtotal' || field === 'tax' || field === 'fee') {
        return `<td>${formatMoney(row[field])}</td>`;
      }
      if (field === 'uploadedAt') {
        return `<td>${row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '-'}</td>`;
      }
      if (field === 'medicalRecord' || field === 'workExperience') {
        return `<td>${yesNo(row[field])}</td>`;
      }
      return `<td>${row[field] ?? ''}</td>`;
    }).join('')
      + (key === 'ward' ? `<td><button class="infoBtn" onclick="openWardDetail('${row.number}')">ℹ️ Info</button></td>` : '')
      + (key === 'staff' ? `<td><button class="infoBtn" onclick="openStaffDetail('${row.staffNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'patient' ? `<td><button class="infoBtn" onclick="openPatientDetail('${row.patNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'pharma' ? `<td><button class="infoBtn" onclick="openDrugDetail('${row.drugNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'medication' ? `<td><button class="infoBtn" onclick="openMedicationDetail('${row.patNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'supply' ? `<td><button class="infoBtn" onclick="openSupplyDetail('${row.itemNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'supplier' ? `<td><button class="infoBtn" onclick="openSupplierDetail('${row.supNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'appointment' ? `<td><button class="infoBtn" onclick="openAppointmentDetail('${row.apptNo}')">ℹ️ Info</button></td>` : '')
      + (key === 'requisition'
        ? `<td><button class="infoBtn" onclick="openUploadDialog('requisition', ${realIndex})">Edit</button> <button class="act" onclick="updateRequisitionStatus(${realIndex}, 'Approved')">Approve</button> <button class="del" onclick="updateRequisitionStatus(${realIndex}, 'Disapproved')">Disapprove</button> <button class="del" onclick="delRow('${key}',${realIndex})">Del</button></td>`
        : key === 'leave'
        ? `<td><button class="infoBtn" onclick="openUploadDialog('leave', ${realIndex})">Edit</button> <button class="act" onclick="updateLeaveStatus(${realIndex}, 'Approved')">Approve</button> <button class="del" onclick="updateLeaveStatus(${realIndex}, 'Rejected')">Reject</button> <button class="del" onclick="delRow('${key}',${realIndex})">Del</button></td>`
        : `<td><button class="infoBtn" onclick="openUploadDialog('${key}', ${realIndex})">Edit</button> <button class="del" onclick="delRow('${key}',${realIndex})">Del</button></td>`)
      + '</tr>';
  });

  const targetTable = document.getElementById('t-' + key);
  if (targetTable) {
    targetTable.innerHTML = html;
    setupTableWindow(targetTable);
  }

  if (['supply', 'requisition', 'appointment'].includes(key)) renderPaymentSummary(key);
}

function printSpecificReport(type, id) {
  let target = null;
  let title = '';
  let rows = [];
  let extras = '';

  if (type === 'patient') {
    target = DB.patient.find(item => String(item.patNo) === String(id));
    if (!target) return;
    title = `${target.first || ''} ${target.last || ''} — Patient Report`;
    rows = [
      ['Patient No', target.patNo || '-'],
      ['Name', `${target.first || ''} ${target.last || ''}`.trim() || '-'],
      ['Status', target.status || '-'],
      ['Ward', target.ward || '-'],
      ['Bed', target.bed || '-'],
      ['DOB', target.dob || '-'],
      ['Sex', target.sex || '-'],
      ['Marital Status', target.marital || '-'],
      ['Local Doctor', target.localDoctor || '-'],
      ['Allergies', target.allergies || '-'],
      ['Medical Record', yesNo(target.medicalRecord)],
      ['Next of Kin', `${target.kinName || ''} (${target.kinRel || '-'})`],
      ['Waitlist Date', target.waitDate || '-'],
      ['Placed Date', target.placedDate || '-'],
      ['Expected Leave', target.expLeave || '-'],
      ['Actual Leave', target.actualLeave || '-']
    ];
    extras = `<h3>Clinical Summary</h3><p>${target.medicalRecord || 'No medical record summary recorded.'}</p>`;
  }

  if (type === 'staff') {
    target = DB.staff.find(item => String(item.staffNo) === String(id));
    if (!target) return;
    title = `${target.first || ''} ${target.last || ''} — Staff Report`;
    rows = [
      ['Staff No', target.staffNo || '-'],
      ['Name', `${target.first || ''} ${target.last || ''}`.trim() || '-'],
      ['Position', target.position || '-'],
      ['Qualification', target.qual || '-'],
      ['Ward', target.ward || '-'],
      ['Address', target.address || '-'],
      ['Telephone', target.tel || '-'],
      ['DOB', target.dob || '-'],
      ['Sex', target.sex || '-'],
      ['NIN', target.nin || '-'],
      ['Contract', target.contract === 'P' ? 'Permanent' : target.contract === 'T' ? 'Temporary' : (target.contract || '-')],
      ['Medical Record', target.medicalRecord || '-'],
      ['Working Experience', yesNo(target.workExperience)],
      ['Hours / Week', target.hours || '-'],
      ['Salary', formatMoney(target.salary || 0)]
    ];
    extras = `<h3>Experience Summary</h3><p>${target.workExperience || 'No work experience details recorded.'}</p><h3>Clinical Notes</h3><p>${target.medicalRecord || 'No medical record details recorded for this staff member.'}</p>`;
  }

  if (type === 'drug') {
    target = DB.pharma.find(item => String(item.drugNo) === String(id));
    if (!target) return;
    title = `${target.name || 'Drug'} — Pharmaceutical Report`;
    rows = [
      ['Drug No', target.drugNo || '-'],
      ['Name', target.name || '-'],
      ['Category', target.category || '-'],
      ['Description', target.desc || '-'],
      ['Dosage', target.dosage || '-'],
      ['Route', target.method || '-'],
      ['Qty in Stock', target.qty || 0],
      ['Reorder Level', target.reorder || 0],
      ['Cost / Unit', formatMoney(target.cost || 0)],
      ['Primary Use', target.uses || '-'],
      ['Common Side Effects', target.sideEffects || '-'],
      ['Warnings', target.warnings || '-']
    ];
    extras = `<h3>Detailed Notes</h3><p>${target.desc || 'No detailed description provided.'}</p>`;
  }

  if (type === 'supplier') {
    target = DB.supplier.find(item => String(item.supNo) === String(id));
    if (!target) return;
    title = `${target.name || 'Supplier'} — Supplier Report`;
    rows = [
      ['Supplier No', target.supNo || '-'],
      ['Name', target.name || '-'],
      ['Address', target.address || '-'],
      ['Tel', target.tel || '-'],
      ['Fax', target.fax || '-'],
      ['Status', 'Active Supplier']
    ];
    extras = `<h3>Supplier Summary</h3><p>${target.name || 'Supplier'} provides supply and pharmaceutical support to the hospital. Contact records and address details are listed above.</p>`;
  }

  if (type === 'ward') {
    target = DB.ward.find(item => String(item.number) === String(id));
    if (!target) return;
    title = `Ward ${target.number || id} — Ward Report`;
    const occupied = DB.patient.filter(patient => String(patient.ward) === String(target.number) && patient.status === 'In Ward').length;
    rows = [
      ['Ward No', target.number || '-'],
      ['Ward Name', target.name || '-'],
      ['Location', target.location || '-'],
      ['Total Beds', target.beds || 0],
      ['Occupied Beds', occupied],
      ['Free Beds', Number(target.beds || 0) - occupied],
      ['Telephone Extn', target.extn || '-']
    ];
    extras = `<h3>Ward Summary</h3><p>Ward ${target.number || id} is located at ${target.location || '-'} and currently has ${occupied} occupied and ${Number(target.beds || 0) - occupied} free beds.</p>`;
  }

  if (type === 'appointment') {
    target = DB.appointment.find(item => String(item.apptNo) === String(id));
    if (!target) return;
    const patient = DB.patient.find(item => String(item.patNo) === String(target.patNo)) || {};
    title = `Appointment ${target.apptNo} — Appointment Report`;
    rows = [
      ['Appointment No', target.apptNo || '-'],
      ['Patient No', target.patNo || '-'],
      ['Patient Name', `${patient.first || ''} ${patient.last || ''}`.trim() || '-'],
      ['Consultant', target.consultant || '-'],
      ['Staff No', target.staffNo || '-'],
      ['Date', target.date || '-'],
      ['Time', target.time || '-'],
      ['Room', target.room || '-'],
      ['Referral Source', target.referral || '-'],
      ['Reason / Notes', target.reason || '-'],
      ['Local Doctor', target.localDoctor || patient.localDoctor || '-']
    ];
    extras = `<h3>Visit Summary</h3><p>${target.reason || 'No appointment notes recorded.'}</p>`;
  }

  if (type === 'supply') {
    target = DB.supply.find(item => String(item.itemNo) === String(id));
    if (!target) return;
    title = `${target.name || 'Supply'} — Supply Report`;
    rows = [
      ['Item No', target.itemNo || '-'],
      ['Name', target.name || '-'],
      ['Description', target.desc || '-'],
      ['Qty in Stock', target.qty || 0],
      ['Reorder Level', target.reorder || 0],
      ['Cost / Unit', formatMoney(target.cost || 0)],
      ['Status', 'Available']
    ];
    extras = `<h3>Supply Summary</h3><p>${target.desc || 'No description recorded for this item.'}</p>`;
  }

  if (type === 'medication') {
    const meds = DB.medication.filter(item => String(item.patNo) === String(id));
    target = meds[0] || null;
    if (!target) return;
    title = `${target.patName || target.patNo || 'Medication'} — Medication Report`;
    rows = meds.map(med => [
      med.drugName || med.drugNo || '-',
      med.dosage || '-',
      med.method || '-',
      med.units || '-',
      med.start || '-',
      med.finish || '-'
    ]);
    const medTable = rows.map(([drug, dose, method, units, start, finish]) => `<tr><td>${drug}</td><td>${dose}</td><td>${method}</td><td>${units}</td><td>${start}</td><td>${finish}</td></tr>`).join('');
    extras = `<h3>Medication Summary</h3><p>Medication schedule for patient ${target.patName || target.patNo || '-'}.</p><table style="width:100%;border-collapse:collapse;margin-top:12px;"><tr><th>Drug</th><th>Dose</th><th>Method</th><th>Units</th><th>Start</th><th>Finish</th></tr>${medTable}</table>`;
    const printWindow = window.open('', '_blank', 'width=980,height=720');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:14mm}body{font-family:Arial,sans-serif;margin:24px;color:#22303f;background:#fff;color-scheme:light;print-color-adjust:exact;-webkit-print-color-adjust:exact} table{border-collapse:collapse;width:100%;margin-top:12px;} th,td{border:1px solid #d3ddec;padding:10px;text-align:left;vertical-align:top;} th{background:#eef2f8;} h1,h2,h3{color:#33507a;} p{line-height:1.5}.report-guide{margin:12px 0 18px;padding:12px 14px;border:1px solid #c9dbee;border-left:5px solid #2b7bd3;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff)}.report-guide p{margin:5px 0 0;font-size:12px}</style></head><body><h1>${title}</h1><div class="report-guide"><strong>How to read this report</strong><p>This report is a snapshot of the selected record from the hospital database. The details below describe the record at the time of printing.</p></div>${extras}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }

  if (!target) return;

  const tableHtml = rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('');
  const printWindow = window.open('', '_blank', 'width=980,height=720');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:14mm}body{font-family:Arial,sans-serif;margin:24px;color:#22303f;background:#fff;color-scheme:light;print-color-adjust:exact;-webkit-print-color-adjust:exact} table{border-collapse:collapse;width:100%;margin-top:12px;} th,td{border:1px solid #d3ddec;padding:10px;text-align:left;vertical-align:top;} th{background:#eef2f8;width:220px;} h1,h2,h3{color:#33507a;} p{line-height:1.5}.report-guide{margin:12px 0 18px;padding:12px 14px;border:1px solid #c9dbee;border-left:5px solid #2b7bd3;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff)}.report-guide p{margin:5px 0 0;font-size:12px}</style></head><body><h1>${title}</h1><div class="report-guide"><strong>How to read this report</strong><p>This report is a snapshot of the selected record from the hospital database. The details below describe the record at the time of printing.</p></div>${extras}<table>${tableHtml}</table></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function renderPaymentSummary(key) {
  const rows = (DB[key] || []).map(row => normalizePaymentRow(row, key));
  const total = rows.reduce((sum, row) => sum + Number((row.total ?? row.subtotal ?? row.fee ?? 0) || 0), 0);
  const tax = rows.reduce((sum, row) => sum + Number(row.tax || 0), 0);
  const summaryEl = document.getElementById(key + 'Summary');
  if (!summaryEl) return;

  const labels = {
    supply: 'Supply Payment Summary',
    requisition: 'Requisition Payment Summary',
    appointment: 'Appointment Payment Summary'
  };

  summaryEl.innerHTML = `<strong>${labels[key]}</strong><br>Subtotal: ${formatMoney(total - tax)} &nbsp;•&nbsp; Tax: ${formatMoney(tax)} &nbsp;•&nbsp; Total: ${formatMoney(total)}`;
}

async function updateRequisitionStatus(index, status) {
  if (!canApprove()) { denyPermission(); return; }
  const row = DB.requisition[index];
  if (!row) return;
  const patch = { status, approvedAt: new Date().toISOString() };
  try {
    if (row.id) await apiPut('requisition', row.id, patch);
    Object.assign(row, patch);
    showToast('Requisition ' + status.toLowerCase() + '.');
  } catch (e) {
    showToast('Could not update requisition: ' + e.message, 'error');
  }
  render('requisition');
}

async function updateLeaveStatus(index, status) {
  if (!canApprove()) { denyPermission(); return; }
  const row = DB.leave[index];
  if (!row) return;
  const patch = { status, approvedBy: (JSON.parse(sessionStorage.getItem('wmSession') || 'null') || {}).fullName || row.approvedBy || '' };
  try {
    if (row.id) await apiPut('leave', row.id, patch);
    Object.assign(row, patch);
    showToast('Leave request ' + status.toLowerCase() + '.');
  } catch (e) {
    showToast('Could not update leave request: ' + e.message, 'error');
  }
  render('leave');
}

function setupTableWindow(table) {
  if (!table || table.closest('.tableWindow')) return;

  const parent = table.parentNode;
  if (!parent) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'tableWindow';

  const header = document.createElement('div');
  header.className = 'tableWindowHeader';
  header.innerHTML = `<span>${(table.id || 'Table').replace(/^t-/, '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</span><span>↕</span>`;

  const body = document.createElement('div');
  body.className = 'tableWindowBody';

  parent.replaceChild(wrapper, table);
  wrapper.appendChild(header);
  wrapper.appendChild(body);
  body.appendChild(table);
}

// NOTE: the initial "render every table" pass used to happen right here at
// module-load time, back when DB was a static object already filled in by
// data.js. Now DB is populated asynchronously from the API, so that pass
// happens in app-init.js's initApp(), after loadAll() resolves.

