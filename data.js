// ===== Data schema =====
// This defines every editable table: which fields exist and what labels to
// show. Everything else in the app (forms, tables, search, reports) is
// generated from this — add a field here and it shows up everywhere.
const SCHEMA = {
  ward: {
    fields: ['number', 'name', 'location', 'beds', 'extn'],
    labels: ['Ward No', 'Ward Name', 'Location', 'Total Beds', 'Tel Extn']
  },
  staff: {
    fields: ['staffNo', 'first', 'last', 'address', 'tel', 'dob', 'sex', 'nin', 'position', 'salary', 'scale', 'ward', 'hours', 'contract', 'pay', 'qual', 'institution', 'workExperience', 'medicalRecord', 'photo', 'file'],
    labels: ['Staff No', 'First Name', 'Last Name', 'Address', 'Tel No', 'DOB', 'Sex', 'NIN', 'Position', 'Salary', 'Salary Scale', 'Ward Assigned', 'Hours/Week', 'Perm/Temp', 'Pay(W/M)', 'Qualification', 'Institution', 'Working Experience', 'Medical Record', 'Photo URL', 'Attachment']
  },
  patient: {
    fields: ['patNo', 'first', 'last', 'address', 'tel', 'dob', 'sex', 'marital', 'kinName', 'kinRel', 'localDoctor', 'allergies', 'medicalRecord', 'ward', 'bed', 'waitDate', 'placedDate', 'expLeave', 'actualLeave', 'status', 'refDoc', 'file'],
    labels: ['Patient No', 'First Name', 'Last Name', 'Address', 'Tel No', 'DOB', 'Sex', 'Marital Status', 'Next-of-Kin', 'Kin Relation', 'Local Doctor', 'Allergies', 'Medical Record', 'Ward Required', 'Bed No', 'Waitlist Date', 'Date Placed', 'Expected Leave', 'Actual Leave', 'Status', "Patient's Referral Document", 'Attachment']
  },
  outpatient: {
    fields: ['patNo', 'first', 'last', 'address', 'tel', 'dob', 'sex', 'localDoctor', 'apptDate', 'apptTime', 'refDoc', 'file'],
    labels: ['Patient No', 'First Name', 'Last Name', 'Address', 'Tel No', 'DOB', 'Sex', 'Local Doctor', 'Appt Date', 'Appt Time', "Patient's Referral Document", 'Attachment']
  },
  appointment: {
    fields: ['apptNo', 'patNo', 'consultant', 'staffNo', 'date', 'time', 'room', 'referral', 'reason', 'localDoctor', 'fee', 'taxRate', 'paymentStatus', 'total', 'uploadedAt', 'refDoc', 'file'],
    labels: ['Appointment No', 'Patient No', 'Consultant Name', 'Consultant Staff No', 'Date', 'Time', 'Exam Room', 'Referral Source', 'Reason/Notes', 'Local Doctor', 'Fee(£)', 'Tax %', 'Payment Status', 'Total(£)', 'Uploaded At', "Patient's Referral Document", 'Attachment']
  },
  medication: {
    fields: ['patNo', 'patName', 'ward', 'bed', 'drugNo', 'drugName', 'dosage', 'method', 'units', 'start', 'finish'],
    labels: ['Patient No', 'Patient Name', 'Ward', 'Bed No', 'Drug No', 'Drug Name', 'Dosage', 'Method', 'Units/Day', 'Start Date', 'Finish Date']
  },
  supply: {
    fields: ['itemNo', 'name', 'desc', 'qty', 'reorder', 'cost', 'taxRate', 'paymentStatus', 'total', 'uploadedAt', 'photo', 'file'],
    labels: ['Item No', 'Name', 'Description', 'Qty in Stock', 'Reorder Level', 'Cost/Unit(£)', 'Tax %', 'Payment Status', 'Total(£)', 'Uploaded At', 'Picture', 'Attachment']
  },
  pharma: {
    fields: ['drugNo', 'name', 'desc', 'dosage', 'method', 'qty', 'reorder', 'cost', 'category', 'uses', 'sideEffects', 'warnings', 'file'],
    labels: ['Drug No', 'Name', 'Description', 'Dosage', 'Method', 'Qty in Stock', 'Reorder Level', 'Cost/Unit(£)', 'Category', 'Primary Use', 'Side Effects', 'Warnings', 'Product Image']
  },
  requisition: {
    fields: ['reqNo', 'requestedBy', 'ward', 'itemNo', 'itemName', 'dosage', 'method', 'cost', 'qty', 'subtotal', 'tax', 'total', 'status', 'date', 'uploadedAt', 'file'],
    labels: ['Requisition No', 'Requested By', 'Ward', 'Item/Drug No', 'Name', 'Dosage', 'Method', 'Cost/Unit', 'Qty', 'Subtotal', 'Tax', 'Total', 'Status', 'Date Ordered', 'Uploaded At', 'Attachment']
  },
  supplier: {
    fields: ['supNo', 'name', 'address', 'tel', 'fax', 'photo', 'file'],
    labels: ['Supplier No', 'Name', 'Address', 'Tel No', 'Fax No', 'Picture', 'Attachment']
  },
  leave: {
    fields: ['leaveNo', 'staffNo', 'staffName', 'ward', 'type', 'startDate', 'endDate', 'reason', 'status', 'approvedBy'],
    labels: ['Leave No', 'Staff No', 'Staff Name', 'Ward', 'Leave Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Approved By']
  }
};

// ===== In-memory database, populated from the API on load (see loadAll()) =====
// Every other script (crud.js, render-table.js, charts.js, detail-views.js,
// dashboard-render.js, reports-hub.js, beds-queue.js) reads/writes this same
// `DB` object, exactly as it did when it was localStorage-backed — only the
// loading/saving mechanics changed.
let DB = {
  ward: [], staff: [], patient: [], outpatient: [], appointment: [],
  medication: [], supply: [], pharma: [], requisition: [], supplier: [],
  leave: [], bedQueue: []
};

// ===== Thin fetch() wrapper around api/table.php =====
const TABLE_API = 'api/table.php';

async function apiGet(table, q) {
  const url = TABLE_API + '?table=' + encodeURIComponent(table) + (q ? '&q=' + encodeURIComponent(q) : '');
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Failed to load ' + table));
  return data;
}

async function apiPost(table, obj) {
  const res = await fetch(TABLE_API + '?table=' + encodeURIComponent(table), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Failed to save ' + table));
  return data;
}

async function apiPut(table, id, obj) {
  const res = await fetch(TABLE_API + '?table=' + encodeURIComponent(table) + '&id=' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Failed to update ' + table));
  return data;
}

async function apiDelete(table, id) {
  const res = await fetch(TABLE_API + '?table=' + encodeURIComponent(table) + '&id=' + encodeURIComponent(id), { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Failed to delete ' + table));
  return data;
}

// Loads every table from the database (SQL Server) into DB. Called once on startup (see app-init.js)
// and again any time a full refresh is useful (e.g. after login).
async function loadAll() {
  const keys = Object.keys(DB);
  await Promise.all(keys.map(async key => {
    try {
      DB[key] = await apiGet(key);
    } catch (e) {
      console.error('Could not load ' + key + ':', e.message);
      DB[key] = DB[key] || [];
    }
  }));
}

// Kept for backward compatibility: a lot of code across this app calls
// save() right after mutating a DB[key] array in place (that pattern comes
// from the old localStorage version). Real persistence now happens per
// action via apiPost/apiPut/apiDelete in crud.js and beds-queue.js, so this
// is now a harmless no-op — nothing else needs to change.
function save() {}
