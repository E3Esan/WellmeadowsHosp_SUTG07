const SHIFTS = ['Early', 'Late', 'Night', 'Off'];
const SHIFT_TIME = {
  Early: '07:00–15:00',
  Late: '15:00–22:00',
  Night: '22:00–07:00',
  Off: 'Off duty'
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function shiftFor(staffNo, dayIndex) {
  return SHIFTS[hashStr(staffNo + '-' + dayIndex) % SHIFTS.length];
}

function staffAvatar(staff) {
  return staff.photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + staff.first + staff.last + '&backgroundColor=005EB8';
}

function openWardDetail(wardNo) {
  const ward = DB.ward.find(item => String(item.number) === String(wardNo));
  if (!ward) return;

  const staffList = DB.staff.filter(staff => String(staff.ward) === String(wardNo));
  const occupied = DB.patient.filter(patient => String(patient.ward) === String(wardNo) && patient.status === 'In Ward').length;

  document.getElementById('wd-title').textContent = 'Ward ' + ward.number + ' – ' + ward.name;
  document.getElementById('wd-meta').innerHTML = `
    <span>📍 ${ward.location}</span>
    <span>🛏️ ${ward.beds} beds (${occupied} occupied, ${ward.beds - occupied} free)</span>
    <span>☎️ Extn ${ward.extn}</span>
    <span>👥 ${staffList.length} staff assigned</span>
  `;

  const supervisor = staffList.find(staff => staff.position === 'Charge Nurse') || staffList.find(staff => staff.position === 'Consultant');
  document.getElementById('wd-supervisor').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('ward', '${ward.number}')">Print ward report</button>
    </div>
    ${supervisor
      ? `<div class="supCard"><img src="${staffAvatar(supervisor)}" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${supervisor.first}${supervisor.last}&backgroundColor=005EB8'"><div><b style="display:block;font-size:15px;color:var(--primary-dk)">${supervisor.first} ${supervisor.last} — Ward Supervisor</b><span style="font-size:12px;color:#567">${supervisor.position} • ☎️ ${supervisor.tel || '-'} • ${supervisor.qual || 'No qualification on file'}</span></div></div>`
      : '<div style="color:#889;font-size:13px;margin-bottom:16px">No Charge Nurse currently assigned to this ward.</div>'}
  `;

  if (staffList.length === 0) {
    document.getElementById('wd-staffTable').innerHTML = '';
    document.getElementById('wd-empty').textContent = 'No staff members are currently assigned to this ward.';
  } else {
    document.getElementById('wd-empty').textContent = '';

    let html = '<tr><th>Staff No</th><th>Name</th><th>Position</th><th>Contract</th><th>Hrs/Wk</th>' + DAYS.map(day => `<th>${day}</th>`).join('') + '</tr>';

    staffList.forEach(staff => {
      html += `<tr><td>${staff.staffNo}</td><td>${staff.first} ${staff.last}</td><td>${staff.position}</td><td>${staff.contract === 'P' ? 'Permanent' : staff.contract === 'T' ? 'Temporary' : (staff.contract || '-')}</td><td>${staff.hours || '-'}</td>`;
      DAYS.forEach((day, index) => {
        const shift = shiftFor(staff.staffNo, index);
        html += `<td title="${SHIFT_TIME[shift]}"><span class="shiftTag sh-${shift}">${shift}</span></td>`;
      });
      html += '</tr>';
    });

    document.getElementById('wd-staffTable').innerHTML = html;
  }

  document.getElementById('wardDetailOverlay').classList.add('show');
}

function closeWardDetail() {
  document.getElementById('wardDetailOverlay').classList.remove('show');
}

function openDrugDetail(drugNo) {
  const drug = DB.pharma.find(item => String(item.drugNo) === String(drugNo));
  if (!drug) return;

  document.getElementById('drug-title').textContent = drug.name + ' (' + drug.drugNo + ')';
  document.getElementById('drug-meta').innerHTML = `
    <span>💊 ${drug.category || 'Medication'}</span>
    <span>📦 ${drug.qty || 0} units in stock</span>
    <span>🔁 Reorder at ${drug.reorder || 0}</span>
    <span>£${Number(drug.cost || 0).toFixed(2)} / unit</span>
  `;

  document.getElementById('drug-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('drug', '${drug.drugNo}')">Print drug report</button>
    </div>
    <div class="supCard" style="margin-top:8px">
      <div class="drugPhoto">
        ${drug.photo
          ? `<img src="${drug.photo}" alt="${drug.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='💊';">`
          : '💊'}
      </div>
      <div>
        <b style="display:block;font-size:16px;color:var(--primary-dk)">${drug.name}</b>
        <span style="font-size:12px;color:#567">${drug.desc || 'Prescription medication'}</span>
      </div>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Dose</th><td style="padding:8px;border:1px solid var(--bd)">${drug.dosage || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Route</th><td style="padding:8px;border:1px solid var(--bd)">${drug.method || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Primary Use</th><td style="padding:8px;border:1px solid var(--bd)">${drug.uses || 'Not specified'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Common Side Effects</th><td style="padding:8px;border:1px solid var(--bd)">${drug.sideEffects || 'Not specified'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Warnings</th><td style="padding:8px;border:1px solid var(--bd)">${drug.warnings || 'Follow clinical guidance'}</td></tr>
    </table>
  `;

  document.getElementById('drugDetailOverlay').classList.add('show');
}

function closeDrugDetail() {
  document.getElementById('drugDetailOverlay').classList.remove('show');
}

function openPatientDetail(patNo) {
  const patient = DB.patient.find(item => String(item.patNo) === String(patNo));
  if (!patient) return;

  document.getElementById('patient-title').textContent = patient.first + ' ' + patient.last + ' (' + patient.patNo + ')';
  document.getElementById('patient-meta').innerHTML = `
    <span>🏥 ${patient.status || 'Unknown status'}</span>
    <span>🛏️ ${patient.ward || '-'} / Bed ${patient.bed || '-'}</span>
    <span>📅 DOB ${patient.dob || '-'}</span>
  `;

  document.getElementById('patient-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('patient', '${patient.patNo}')">Print patient report</button>
    </div>
    <div class="supCard" style="margin-top:8px">
      <div class="drugPhoto" style="border-radius:50%">👤</div>
      <div>
        <b style="display:block;font-size:16px;color:var(--primary-dk)">${patient.first} ${patient.last}</b>
        <span style="font-size:12px;color:#567">${patient.address || 'No address on file'} • ${patient.tel || 'No phone on file'}</span>
      </div>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Patient No</th><td style="padding:8px;border:1px solid var(--bd)">${patient.patNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Sex</th><td style="padding:8px;border:1px solid var(--bd)">${patient.sex || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Marital Status</th><td style="padding:8px;border:1px solid var(--bd)">${patient.marital || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Next of Kin</th><td style="padding:8px;border:1px solid var(--bd)">${patient.kinName || '-'} (${patient.kinRel || '-'})</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Local Doctor</th><td style="padding:8px;border:1px solid var(--bd)">${patient.localDoctor || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Allergies</th><td style="padding:8px;border:1px solid var(--bd)">${patient.allergies || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Medical Record</th><td style="padding:8px;border:1px solid var(--bd)">${patient.medicalRecord || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Waitlist Date</th><td style="padding:8px;border:1px solid var(--bd)">${patient.waitDate || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Placed Date</th><td style="padding:8px;border:1px solid var(--bd)">${patient.placedDate || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Expected Leave</th><td style="padding:8px;border:1px solid var(--bd)">${patient.expLeave || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Actual Leave</th><td style="padding:8px;border:1px solid var(--bd)">${patient.actualLeave || '-'}</td></tr>
    </table>
  `;

  document.getElementById('patientDetailOverlay').classList.add('show');
}

function closePatientDetail() {
  document.getElementById('patientDetailOverlay').classList.remove('show');
}

function openStaffDetail(staffNo) {
  const staff = DB.staff.find(item => String(item.staffNo) === String(staffNo));
  if (!staff) return;

  document.getElementById('staff-title').textContent = staff.first + ' ' + staff.last + ' (' + staff.staffNo + ')';
  document.getElementById('staff-meta').innerHTML = `
    <span>👤 ${staff.position || 'Staff Member'}</span>
    <span>🏥 Ward ${staff.ward || '-'}</span>
    <span>📞 ${staff.tel || '-'}</span>
  `;

  document.getElementById('staff-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('staff', '${staff.staffNo}')">Print staff report</button>
    </div>
    <div class="supCard" style="margin-top:8px">
      <div class="drugPhoto" style="border-radius:50%">
        ${staff.photo
          ? `<img src="${staff.photo}" alt="${staff.first} ${staff.last}" onerror="this.style.display='none'; this.parentElement.innerHTML='👤';">`
          : '👤'}
      </div>
      <div>
        <b style="display:block;font-size:16px;color:var(--primary-dk)">${staff.first} ${staff.last}</b>
        <span style="font-size:12px;color:#567">${staff.address || 'No address on file'} • ${staff.email || 'No email on file'}</span>
      </div>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Staff No</th><td style="padding:8px;border:1px solid var(--bd)">${staff.staffNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Position</th><td style="padding:8px;border:1px solid var(--bd)">${staff.position || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Address</th><td style="padding:8px;border:1px solid var(--bd)">${staff.address || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">DOB</th><td style="padding:8px;border:1px solid var(--bd)">${staff.dob || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Sex</th><td style="padding:8px;border:1px solid var(--bd)">${staff.sex || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">NIN</th><td style="padding:8px;border:1px solid var(--bd)">${staff.nin || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Qualification</th><td style="padding:8px;border:1px solid var(--bd)">${staff.qual || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Medical Record</th><td style="padding:8px;border:1px solid var(--bd)">${staff.medicalRecord || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Working Experience</th><td style="padding:8px;border:1px solid var(--bd)">${staff.workExperience || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Contract</th><td style="padding:8px;border:1px solid var(--bd)">${staff.contract === 'P' ? 'Permanent' : staff.contract === 'T' ? 'Temporary' : (staff.contract || '-')}</td></tr>
    </table>
  `;

  document.getElementById('staffDetailOverlay').classList.add('show');
}

function closeStaffDetail() {
  document.getElementById('staffDetailOverlay').classList.remove('show');
}

function openAppointmentDetail(apptNo) {
  const appointment = DB.appointment.find(item => String(item.apptNo) === String(apptNo));
  if (!appointment) return;

  const patient = DB.patient.find(item => String(item.patNo) === String(appointment.patNo)) || {};

  document.getElementById('appointment-title').textContent = 'Appointment ' + appointment.apptNo;
  document.getElementById('appointment-meta').innerHTML = `
    <span>👤 ${patient.first || 'Patient'} ${patient.last || ''}</span>
    <span>📅 ${appointment.date || '-'} • ${appointment.time || '-'}</span>
    <span>🩺 ${appointment.consultant || '-'}</span>
  `;

  document.getElementById('appointment-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('appointment', '${appointment.apptNo}')">Print appointment report</button>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Patient No</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.patNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Consultant</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.consultant || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Staff No</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.staffNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Referral Source</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.referral || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Reason / Notes</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.reason || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Local Doctor</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.localDoctor || patient.localDoctor || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Room</th><td style="padding:8px;border:1px solid var(--bd)">${appointment.room || '-'}</td></tr>
    </table>
  `;

  document.getElementById('appointmentDetailOverlay').classList.add('show');
}

function closeAppointmentDetail() {
  document.getElementById('appointmentDetailOverlay').classList.remove('show');
}

function openSupplyDetail(itemNo) {
  const supply = DB.supply.find(item => String(item.itemNo) === String(itemNo));
  if (!supply) return;

  document.getElementById('supply-title').textContent = supply.name + ' (' + supply.itemNo + ')';
  document.getElementById('supply-meta').innerHTML = `
    <span>📦 ${supply.qty || 0} units in stock</span>
    <span>🔁 Reorder at ${supply.reorder || 0}</span>
    <span>£${Number(supply.cost || 0).toFixed(2)} / unit</span>
  `;

  document.getElementById('supply-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('supply', '${supply.itemNo}')">Print supply report</button>
    </div>
    <div class="supCard" style="margin-top:8px">
      <div class="drugPhoto">
        ${supply.photo
          ? `<img src="${supply.photo}" alt="${supply.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='📦';">`
          : '📦'}
      </div>
      <div>
        <b style="display:block;font-size:16px;color:var(--primary-dk)">${supply.name}</b>
        <span style="font-size:12px;color:#567">${supply.desc || 'Medical supply item'}</span>
      </div>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Item No</th><td style="padding:8px;border:1px solid var(--bd)">${supply.itemNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Description</th><td style="padding:8px;border:1px solid var(--bd)">${supply.desc || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Qty in Stock</th><td style="padding:8px;border:1px solid var(--bd)">${supply.qty || 0}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Reorder Level</th><td style="padding:8px;border:1px solid var(--bd)">${supply.reorder || 0}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Cost</th><td style="padding:8px;border:1px solid var(--bd)">£${Number(supply.cost || 0).toFixed(2)}</td></tr>
    </table>
  `;

  document.getElementById('supplyDetailOverlay').classList.add('show');
}

function closeSupplyDetail() {
  document.getElementById('supplyDetailOverlay').classList.remove('show');
}

function openSupplierDetail(supNo) {
  const supplier = DB.supplier.find(item => String(item.supNo) === String(supNo));
  if (!supplier) return;

  document.getElementById('supplier-title').textContent = supplier.name + ' (' + supplier.supNo + ')';
  document.getElementById('supplier-meta').innerHTML = `
    <span>🏢 Supplier</span>
    <span>☎️ ${supplier.tel || '-'}</span>
    <span>📠 ${supplier.fax || '-'}</span>
  `;

  document.getElementById('supplier-details').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
      <button class="act" onclick="printSpecificReport('supplier', '${supplier.supNo}')">Print supplier report</button>
    </div>
    <div class="supCard" style="margin-top:8px">
      <div class="drugPhoto">
        ${supplier.photo
          ? `<img src="${supplier.photo}" alt="${supplier.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='🏢';">`
          : '🏢'}
      </div>
      <div>
        <b style="display:block;font-size:16px;color:var(--primary-dk)">${supplier.name}</b>
        <span style="font-size:12px;color:#567">${supplier.address || 'No address on file'}</span>
      </div>
    </div>
    <table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff">
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Supplier No</th><td style="padding:8px;border:1px solid var(--bd)">${supplier.supNo || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Address</th><td style="padding:8px;border:1px solid var(--bd)">${supplier.address || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Telephone</th><td style="padding:8px;border:1px solid var(--bd)">${supplier.tel || '-'}</td></tr>
      <tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Fax</th><td style="padding:8px;border:1px solid var(--bd)">${supplier.fax || '-'}</td></tr>
    </table>
  `;

  document.getElementById('supplierDetailOverlay').classList.add('show');
}

function closeSupplierDetail() {
  document.getElementById('supplierDetailOverlay').classList.remove('show');
}

function openMedicationDetail(patNo) {
  const patientMeds = DB.medication.filter(item => String(item.patNo) === String(patNo));
  if (!patientMeds.length) return;

  const patientName = patientMeds[0].patName || 'Patient';
  const wardNo = patientMeds[0].ward || '-';
  const bedNo = patientMeds[0].bed || '-';

  document.getElementById('medication-title').textContent = patientName + ' (' + patNo + ')';
  document.getElementById('medication-meta').innerHTML = `
    <span>🏥 Ward ${wardNo}</span>
    <span>🛏️ Bed ${bedNo}</span>
    <span>💊 ${patientMeds.length} medication entries</span>
  `;

  let html = '<div style="display:flex;justify-content:flex-end;margin:8px 0 12px;"><button class="act" onclick="printSpecificReport(\'medication\', \'${patNo}\')">Print medication report</button></div><table style="width:100%;margin-top:10px;border-collapse:collapse;background:#fff"><tr><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Drug</th><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Dose</th><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Method</th><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Units/Day</th><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Start</th><th style="padding:8px;border:1px solid var(--bd);background:var(--primary-lt);text-align:left">Finish</th></tr>';

  patientMeds.forEach(med => {
    html += `<tr><td style="padding:8px;border:1px solid var(--bd)">${med.drugName || '-'}</td><td style="padding:8px;border:1px solid var(--bd)">${med.dosage || '-'}</td><td style="padding:8px;border:1px solid var(--bd)">${med.method || '-'}</td><td style="padding:8px;border:1px solid var(--bd)">${med.units || '-'}</td><td style="padding:8px;border:1px solid var(--bd)">${med.start || '-'}</td><td style="padding:8px;border:1px solid var(--bd)">${med.finish || '-'}</td></tr>`;
  });

  html += '</table>';
  document.getElementById('medication-details').innerHTML = html;
  document.getElementById('medicationDetailOverlay').classList.add('show');
}

function closeMedicationDetail() {
  document.getElementById('medicationDetailOverlay').classList.remove('show');
}

const overlayIds = [
  'wardDetailOverlay',
  'drugDetailOverlay',
  'supplyDetailOverlay',
  'supplierDetailOverlay',
  'patientDetailOverlay',
  'staffDetailOverlay',
  'appointmentDetailOverlay',
  'medicationDetailOverlay',
  'userProfileOverlay'
];

overlayIds.forEach(id => {
  const overlay = document.getElementById(id);
  if (!overlay) return;

  overlay.addEventListener('click', event => {
    if (event.target.id === id) {
      if (id === 'wardDetailOverlay') closeWardDetail();
      if (id === 'drugDetailOverlay') closeDrugDetail();
      if (id === 'supplyDetailOverlay') closeSupplyDetail();
      if (id === 'supplierDetailOverlay') closeSupplierDetail();
      if (id === 'patientDetailOverlay') closePatientDetail();
      if (id === 'staffDetailOverlay') closeStaffDetail();
      if (id === 'appointmentDetailOverlay') closeAppointmentDetail();
      if (id === 'medicationDetailOverlay') closeMedicationDetail();
      if (id === 'userProfileOverlay') closeUserProfile();
    }
  });
});

