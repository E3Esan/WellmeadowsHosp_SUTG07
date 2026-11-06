// ===== Report hub and rendering helpers =====
function renderReportsHub(query = '') {
  const reportHub = document.getElementById('reportHub');
  if (!reportHub) return;

  const reportKeys = [
    ['ward', 'Wards'],
    ['staff', 'Staff'],
    ['patient', 'Patients'],
    ['outpatient', 'Outpatients'],
    ['appointment', 'Appointments'],
    ['medication', 'Medication'],
    ['supply', 'Supplies'],
    ['pharma', 'Pharmaceuticals'],
    ['requisition', 'Requisitions'],
    ['supplier', 'Suppliers'],
    ['leave', 'Leave Requests']
  ];

  const search = String(query || '').trim().toLowerCase();
  const filtered = reportKeys.filter(([key, label]) => !search || key.toLowerCase().includes(search) || label.toLowerCase().includes(search));

  reportHub.innerHTML = filtered.map(([key, label]) => {
    const rows = DB[key] || [];
    const itemCount = rows.length;
    const purpose = (typeof REPORT_META !== 'undefined' && REPORT_META[key]) ? REPORT_META[key].purpose : '';
    return `
      <div class="bubble" style="border:1px solid var(--bd); border-radius:12px; padding:14px; background:#fff; margin-bottom:12px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <strong>${label}</strong>
          <div style="font-size:12px; color:#667; margin-top:4px;">${itemCount} record${itemCount === 1 ? '' : 's'}</div>
          ${purpose ? `<div style="font-size:12px; color:#889; margin-top:4px; max-width:420px;">${purpose}</div>` : ''}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="act" onclick="printReportByKey('${key}')">Print ${label}</button>
        </div>
      </div>
    `;
  }).join('') + (filtered.length ? `<div style="margin-top:12px;"><button class="act" onclick="printAllReports()">Print All Reports</button></div>` : '<div style="color:#667; margin-top:12px;">No matching report groups found.</div>');
}

function buildReportTable(key) {
  const schema = SCHEMA[key];
  const rows = DB[key] || [];
  if (!schema || !rows.length) {
    return '<p>No data available for this report.</p>';
  }

  const headers = schema.labels.slice(0, Math.min(schema.labels.length, 8));
  const body = rows.map(row => {
    const cells = schema.fields.slice(0, Math.min(schema.fields.length, 8)).map(field => {
      const value = row[field];
      return `<td>${value === undefined || value === null || value === '' ? '-' : value}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:18px;">
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function printedByFooter() {
  let userDisplay = 'Unknown user';
  try {
    const s = sessionStorage.getItem('wmSession');
    if (s) {
      const cur = JSON.parse(s);
      userDisplay = cur.fullName || cur.user || cur.username || userDisplay;
    }
  } catch (e) {}
  return `<div style="margin-top:18px;border-top:1px solid #ddd;padding-top:8px;color:#555;font-size:12px">Printed by: ${userDisplay} — ${new Date().toLocaleString()}</div>`;
}

const REPORT_PRINT_STYLE = `
  @page{margin:14mm}
  body{font-family:Arial,sans-serif;margin:24px;color:#22303f;background:#fff;color-scheme:light;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  table{border-collapse:collapse;width:100%;margin-bottom:18px}
  th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top;font-size:12px}
  th{background:#eef2f8;color:#33507a}
  h1{color:#0b3d91}
  h2{margin:24px 0 10px;color:#33507a;border-bottom:2px solid #d3ddec;padding-bottom:5px}
  .report-guide{margin:12px 0 14px;padding:12px 14px;border:1px solid #c9dbee;border-left:5px solid #2b7bd3;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff)}
  .report-guide p{margin:5px 0 0;font-size:12px;line-height:1.5}
  .report-summary{margin:0 0 14px;padding:10px 14px;border:1px solid #d7ecd9;border-left:5px solid #61b878;border-radius:8px;background:#f3fbf4}
  .report-summary ul{margin:6px 0 0;padding-left:18px;font-size:12px;line-height:1.6}
  .report-columns{margin:0 0 16px;padding:10px 14px;border:1px solid #eee1c2;border-left:5px solid #e0a640;border-radius:8px;background:#fffbf0}
  .report-columns ul{margin:6px 0 0;padding-left:18px;font-size:12px;line-height:1.6}
`;

function printReportByKey(key) {
  const label = (SCHEMA[key] && SCHEMA[key].labels) ? key.charAt(0).toUpperCase() + key.slice(1) : 'Report';
  const rows = DB[key] || [];
  if (!rows.length) {
    showToast ? showToast('There is no data available for this report.', 'info') : alert('There is no data available for this report.');
    return;
  }
  const win = window.open('', '_blank', 'width=980,height=700');
  if (!win) { alert('Pop-up blocked. Please allow popups to print reports.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>${label} Report</title><style>${REPORT_PRINT_STYLE}</style></head><body>
    <h1>${label} Report</h1>
    ${buildReportExplanationHtml(key)}
    ${buildReportTable(key)}
    ${printedByFooter()}
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function printAllReports() {
  const keys = Object.keys(SCHEMA).filter(key => Array.isArray(DB[key]));
  const body = keys.map(key => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return `<h2>${label} Report</h2>${buildReportExplanationHtml(key)}${buildReportTable(key)}`;
  }).join('');
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) { alert('Pop-up blocked. Please allow popups to print reports.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>All Hospital Reports</title><style>${REPORT_PRINT_STYLE}</style></head><body>
    <h1>Wellmeadows Hospital Report Hub</h1>
    <div class="report-guide"><strong>How to read this document</strong><p>This is a combined export of every report group in the Report Hub, generated as a point-in-time snapshot of the hospital database. Each section below has its own "How to read this report" guide, an "At a glance" summary computed from the current data, and a column guide for any less obvious fields.</p></div>
    ${body}
    ${printedByFooter()}
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

