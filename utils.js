function generateCalendarHtml() {
  const events = [];
  const add = (dateStr, timeStr, title, details) => {
    if (!dateStr) return;
    let d = new Date(dateStr);
    if (isNaN(d)) {
      // try parsing common formats
      d = new Date(dateStr.replace(/-/g,'/'));
    }
    if (isNaN(d)) return;
    events.push({ date: d, time: timeStr||'', title, details });
  };

  // Appointments
  (DB.appointment||[]).forEach(ap => {
    const pat = (DB.patient||[]).find(p=>p.patNo===ap.patNo) || {};
    add(ap.date, ap.time, `Appointment: ${ap.consultant || ''}`, `${ap.apptNo || ap.apptNo || ''} — ${pat.first||''} ${pat.last||''} — ${ap.room || ap.room || ''} — ${ap.reason||''}`);
  });

  // Patient placement / waiting / expected leave / discharge
  (DB.patient||[]).forEach(p=>{
    if (p.waitDate) add(p.waitDate, '', 'Waiting list entry', `${p.patNo || ''} ${p.first||''} ${p.last||''}`);
    if (p.placedDate) add(p.placedDate, '', 'Placed in ward', `${p.patNo || ''} ${p.first||''} ${p.last||''} — Ward ${p.ward || ''}`);
    if (p.expLeave) add(p.expLeave, '', 'Expected discharge', `${p.patNo || ''} ${p.first||''} ${p.last||''}`);
    if (p.actualLeave) add(p.actualLeave, '', 'Discharged', `${p.patNo || ''} ${p.first||''} ${p.last||''}`);
  });

  // Medication schedules
  (DB.medication||[]).forEach(m => {
    add(m.start, '', 'Medication start', `${m.patName || ''} — ${m.drugName || ''} (${m.dosage||''})`);
    add(m.finish, '', 'Medication end', `${m.patName || ''} — ${m.drugName || ''}`);
  });

  if (!events.length) return '<p>No calendar events found.</p>';

  events.sort((a,b)=> a.date - b.date);
  // Render as grouped by date
  const rows = events.map(e=>{
    const d = e.date;
    const dateStr = d.toLocaleDateString();
    const timeStr = e.time || (d.toLocaleTimeString ? d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '');
    return `<tr><td style="vertical-align:top">${dateStr}</td><td style="vertical-align:top">${timeStr}</td><td style="vertical-align:top"><strong>${e.title}</strong></td><td style="vertical-align:top">${e.details}</td></tr>`;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse"><tr><th style="width:120px">Date</th><th style="width:80px">Time</th><th>Event</th><th>Details</th></tr>${rows}</table>`;
}

function formatMoney(value) {
  return '£' + Number(value || 0).toFixed(2);
}

function yesNo(value) {
  return value && String(value).trim() ? 'Yes' : 'No';
}

function calculateTax(amount, taxRate) {
  return Number(amount || 0) * (Number(taxRate || 0) / 100);
}

function stampRecord(record) {
  const now = new Date();
  record.uploadedAt = now.toISOString();
  record.createdAt = record.createdAt || now.toISOString();
  return record;
}

function normalizePaymentRow(row, key) {
  if (!row) return row;

  if (key === 'appointment') {
    const fee = Number(row.fee || 0);
    const taxRate = Number(row.taxRate || 20);
    const tax = Number(row.tax ?? calculateTax(fee, taxRate));
    const total = Number(row.total ?? fee + tax);
    return { ...row, fee, taxRate, tax, total, paymentStatus: row.paymentStatus || 'Pending' };
  }

  if (key === 'supply') {
    const cost = Number(row.cost || 0);
    const qty = Number(row.qty || 0);
    const subtotal = Number(row.subtotal ?? cost * qty);
    const taxRate = Number(row.taxRate || 20);
    const tax = Number(row.tax ?? calculateTax(subtotal, taxRate));
    const total = Number(row.total ?? subtotal + tax);
    return { ...row, cost, qty, subtotal, taxRate, tax, total, paymentStatus: row.paymentStatus || 'Pending' };
  }

  if (key === 'requisition') {
    const cost = Number(row.cost || 0);
    const qty = Number(row.qty || 0);
    const subtotal = Number(row.subtotal ?? cost * qty);
    const tax = Number(row.tax ?? calculateTax(subtotal, row.taxRate || 20));
    const total = Number(row.total ?? subtotal + tax);
    return { ...row, subtotal, tax, total, status: row.status || 'Pending' };
  }

  return row;
}

function idNo(prefix, arr, field) {
  return prefix + (1000 + arr.length + 1);
}

// ===== Toast notifications =====
// Small, non-blocking feedback for routine actions (save/delete/login/etc)
// so the app doesn't have to interrupt the user with alert() for every
// success message. Validation errors that need the user's full attention
// still use alert()/confirm() elsewhere — this is just for "it worked" /
// "here's what went wrong" feedback.
function ensureToastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toastHost';
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message, type = 'success', duration = 3200) {
  const host = ensureToastHost();
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = `<span class="toast-icon">${type === 'error' ? '⚠️' : '✅'}</span><span>${message}</span>`;
  host.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

