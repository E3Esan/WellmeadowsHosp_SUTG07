// ===== Report Hub explanations =====
// Gives every "Print X" PDF in the Report Hub a "How to read this report"
// guide, a plain-English purpose/audience note, a computed "At a glance"
// summary, and a column glossary for any non-obvious fields — instead of
// just dumping the raw table like before.

const REPORT_META = {
  ward: {
    purpose: 'Lists every ward/department in the hospital: its name, physical location, bed capacity, and internal phone extension.',
    audience: 'Personnel Officer, Charge Nurse, Medical Director.',
    howToRead: 'Each row is one ward. "Total Beds" is physical capacity, not current occupancy — cross-reference the Dashboard or Patients report to see how many of those beds are currently filled.',
    columnNotes: { extn: 'Internal telephone extension for that ward.' }
  },
  staff: {
    purpose: 'Employment records for every member of hospital staff: role, ward assignment, contract, pay, and qualifications.',
    audience: 'Personnel Officer (all staff), Charge Nurse (their ward), Medical Director.',
    howToRead: 'Each row is one staff member. "Medical Record" and "Working Experience" show Yes/No here to keep the printed sheet short — open the staff member\'s profile in the app to read the full text.',
    columnNotes: {
      scale: 'Salary scale/grade, not a monetary amount.',
      nin: 'National Insurance Number.',
      contract: '"P" = Permanent, "T" = Temporary.',
      pay: '"W" = paid weekly, "M" = paid monthly.'
    }
  },
  patient: {
    purpose: 'Admission and waiting-list records: who is currently in a ward, on the waiting list, or has been discharged.',
    audience: 'Clinical staff, Charge Nurse, Medical Director.',
    howToRead: '"Status" is the most important column — In Ward / Waiting List / Discharged. "Ward Required" and "Bed No" only apply once a patient has been placed. "Medical Record" is shown as Yes/No here for brevity; open the patient\'s profile for the full note.',
    columnNotes: {
      kinRel: 'Relationship of the listed next-of-kin to the patient.',
      expLeave: 'Expected discharge date.',
      actualLeave: 'Actual discharge date, once it has happened.'
    }
  },
  outpatient: {
    purpose: 'Patients scheduled for an outpatient clinic visit rather than a ward admission.',
    audience: 'Charge Nurse, reception/booking staff.',
    howToRead: 'Each row is one booked outpatient visit. "Appt Date"/"Appt Time" is the scheduled clinic slot, not an admission date.',
    columnNotes: {}
  },
  appointment: {
    purpose: 'Scheduled consultant appointments tied to a specific patient, including the associated billing.',
    audience: 'Charge Nurse, Medical Director, billing/finance.',
    howToRead: '"Fee", "Tax %" and "Total" describe the billing for that appointment. "Payment Status" tracks whether it has actually been paid yet — a scheduled appointment can still be "Pending" payment.',
    columnNotes: { referral: 'Where the appointment request originated from (e.g. GP referral, ward transfer).' }
  },
  medication: {
    purpose: 'Medication administered or prescribed to patients, one row per drug course.',
    audience: 'Charge Nurse, ward nursing staff.',
    howToRead: 'A patient with more than one drug course appears on multiple rows. "Units/Day" is the dosing frequency, and "Start Date"/"Finish Date" define the treatment window.',
    columnNotes: {}
  },
  supply: {
    purpose: 'Stock levels for non-pharmaceutical hospital supplies (dressings, syringes, protective equipment, etc).',
    audience: 'Charge Nurse (requisitioning), Medical Director (budget oversight).',
    howToRead: '"Reorder Level" is the stock threshold that should trigger a new requisition — the summary below flags any item at or under that threshold right now.',
    columnNotes: { taxRate: 'Tax percentage applied to this item\'s cost, used to calculate "Total".' }
  },
  pharma: {
    purpose: 'Stock levels and clinical reference information for pharmaceutical drugs held by the hospital pharmacy.',
    audience: 'Charge Nurse, pharmacist, Medical Director.',
    howToRead: '"Qty in Stock" vs "Reorder Level" is the stock-control pair to watch — see the summary below for anything currently at or under threshold. "Primary Use", "Side Effects" and "Warnings" are clinical reference notes, not stock data.',
    columnNotes: {}
  },
  requisition: {
    purpose: 'Requests raised by wards for more supplies or drugs, and their approval status.',
    audience: 'Charge Nurse (raises requests), Medical Director/Personnel Officer (approves).',
    howToRead: '"Status" shows where each request stands — Pending requests are awaiting a decision. "Subtotal", "Tax" and "Total" are the cost of the requested quantity, not the hospital\'s full stock value.',
    columnNotes: {}
  },
  supplier: {
    purpose: 'Contact directory for external suppliers the hospital orders supplies and drugs from.',
    audience: 'Medical Director, procurement.',
    howToRead: 'This is a contact list only — it does not show what has been ordered from each supplier. See Requisitions for order activity.',
    columnNotes: {}
  },
  leave: {
    purpose: 'Staff leave requests and their approval status.',
    audience: 'Charge Nurse, Personnel Officer.',
    howToRead: '"Status" shows Pending / Approved / Rejected. "Start Date"/"End Date" define the requested leave period; "Approved By" records who made the decision, once one has been made.',
    columnNotes: {}
  }
};

// Computes a short, entity-specific "At a glance" bullet list from the
// current data — real numbers, not boilerplate, so the PDF says something
// different every time it's printed.
function computeReportSummary(key, rows) {
  const list = [];
  if (!rows.length) return ['No records were found for this report at the time of printing.'];

  if (key === 'ward') {
    const totalBeds = rows.reduce((sum, w) => sum + Number(w.beds || 0), 0);
    const biggest = [...rows].sort((a, b) => Number(b.beds || 0) - Number(a.beds || 0))[0];
    list.push(`${rows.length} ward${rows.length === 1 ? '' : 's'} listed, ${totalBeds} beds of total physical capacity.`);
    if (biggest) list.push(`Largest ward by bed count: ${biggest.name || biggest.number} (${biggest.beds} beds).`);
  }

  if (key === 'staff') {
    const byPosition = {};
    rows.forEach(s => { const p = s.position || 'Other'; byPosition[p] = (byPosition[p] || 0) + 1; });
    const permanent = rows.filter(s => s.contract === 'P').length;
    const unassigned = rows.filter(s => !s.ward).length;
    list.push(`${rows.length} staff record${rows.length === 1 ? '' : 's'}: ` + Object.entries(byPosition).map(([p, c]) => `${c} ${p}`).join(', ') + '.');
    list.push(`${permanent} permanent, ${rows.length - permanent} temporary contract${rows.length - permanent === 1 ? '' : 's'}.`);
    if (unassigned) list.push(`⚠ ${unassigned} staff member${unassigned === 1 ? '' : 's'} with no ward assignment.`);
  }

  if (key === 'patient') {
    const byStatus = {};
    rows.forEach(p => { const s = p.status || 'Unknown'; byStatus[s] = (byStatus[s] || 0) + 1; });
    list.push(`${rows.length} patient record${rows.length === 1 ? '' : 's'}: ` + Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(', ') + '.');
    const withAllergies = rows.filter(p => p.allergies && String(p.allergies).toLowerCase() !== 'none').length;
    if (withAllergies) list.push(`${withAllergies} patient${withAllergies === 1 ? '' : 's'} have a recorded allergy — check individual records before administering medication.`);
    const waiting = rows.filter(p => p.status === 'Waiting List' && p.waitDate).sort((a, b) => new Date(a.waitDate) - new Date(b.waitDate));
    if (waiting.length) list.push(`Longest-waiting patient: ${waiting[0].first || ''} ${waiting[0].last || ''} (waiting since ${waiting[0].waitDate}).`);
  }

  if (key === 'outpatient') {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = rows.filter(o => o.apptDate && o.apptDate >= today).length;
    list.push(`${rows.length} outpatient record${rows.length === 1 ? '' : 's'}, ${upcoming} with an appointment date today or later.`);
  }

  if (key === 'appointment') {
    const totalFees = rows.reduce((sum, a) => sum + Number(a.total || a.fee || 0), 0);
    const byStatus = {};
    rows.forEach(a => { const s = a.paymentStatus || 'Pending'; byStatus[s] = (byStatus[s] || 0) + 1; });
    list.push(`${rows.length} appointment${rows.length === 1 ? '' : 's'}, ${formatMoney(totalFees)} total billed.`);
    list.push('Payment status: ' + Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(', ') + '.');
  }

  if (key === 'medication') {
    const uniquePatients = new Set(rows.map(m => m.patNo)).size;
    const byDrug = {};
    rows.forEach(m => { const d = m.drugName || 'Unknown'; byDrug[d] = (byDrug[d] || 0) + 1; });
    const topDrug = Object.entries(byDrug).sort((a, b) => b[1] - a[1])[0];
    list.push(`${rows.length} medication entr${rows.length === 1 ? 'y' : 'ies'} across ${uniquePatients} patient${uniquePatients === 1 ? '' : 's'}.`);
    if (topDrug) list.push(`Most-prescribed drug in this list: ${topDrug[0]} (${topDrug[1]} entries).`);
  }

  if (key === 'supply' || key === 'pharma') {
    const low = rows.filter(item => Number(item.qty || 0) <= Number(item.reorder || 0));
    const totalValue = rows.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.cost || 0), 0);
    list.push(`${rows.length} item${rows.length === 1 ? '' : 's'} listed, ${formatMoney(totalValue)} total stock value at current cost.`);
    if (low.length) list.push(`⚠ ${low.length} item${low.length === 1 ? '' : 's'} at or below reorder level: ${low.map(i => i.name).join(', ')}.`);
    else list.push('All items are currently above their reorder level.');
  }

  if (key === 'requisition') {
    const byStatus = {};
    rows.forEach(r => { const s = r.status || 'Pending'; byStatus[s] = (byStatus[s] || 0) + 1; });
    const pendingValue = rows.filter(r => (r.status || 'Pending') === 'Pending').reduce((sum, r) => sum + Number(r.total || 0), 0);
    list.push(`${rows.length} requisition${rows.length === 1 ? '' : 's'}: ` + Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(', ') + '.');
    if (pendingValue) list.push(`${formatMoney(pendingValue)} worth of requisitions are still Pending approval.`);
  }

  if (key === 'supplier') {
    list.push(`${rows.length} supplier${rows.length === 1 ? '' : 's'} on file.`);
  }

  if (key === 'leave') {
    const byStatus = {};
    rows.forEach(l => { const s = l.status || 'Pending'; byStatus[s] = (byStatus[s] || 0) + 1; });
    const today = new Date().toISOString().slice(0, 10);
    const onLeaveNow = rows.filter(l => l.status === 'Approved' && l.startDate <= today && (!l.endDate || l.endDate >= today)).length;
    list.push(`${rows.length} leave request${rows.length === 1 ? '' : 's'}: ` + Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(', ') + '.');
    if (onLeaveNow) list.push(`${onLeaveNow} staff member${onLeaveNow === 1 ? ' is' : 's are'} on approved leave today.`);
    if (byStatus.Pending) list.push(`⚠ ${byStatus.Pending} request${byStatus.Pending === 1 ? '' : 's'} still awaiting a decision.`);
  }

  return list;
}

// Builds the "How to read this report" + "At a glance" + column-glossary
// block that goes above the table in every Report Hub PDF.
function buildReportExplanationHtml(key) {
  const meta = REPORT_META[key];
  const schema = SCHEMA[key];
  const rows = DB[key] || [];
  if (!meta || !schema) return '';

  const summary = computeReportSummary(key, rows);
  const summaryHtml = summary.length
    ? `<div class="report-summary"><strong>At a glance</strong><ul>${summary.map(s => `<li>${s}</li>`).join('')}</ul></div>`
    : '';

  const columnNotes = meta.columnNotes || {};
  const columnHtml = Object.keys(columnNotes).length
    ? `<div class="report-columns"><strong>Column guide</strong><ul>${Object.entries(columnNotes).map(([field, note]) => {
        const idx = schema.fields.indexOf(field);
        const label = idx >= 0 ? schema.labels[idx] : field;
        return `<li><strong>${label}:</strong> ${note}</li>`;
      }).join('')}</ul></div>`
    : '';

  return `
    <div class="report-guide">
      <strong>How to read this report</strong>
      <p>${meta.purpose}</p>
      <p><strong>Intended for:</strong> ${meta.audience}</p>
      <p>${meta.howToRead}</p>
    </div>
    ${summaryHtml}
    ${columnHtml}
  `;
}
