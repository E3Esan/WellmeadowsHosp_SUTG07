// ===== Dashboard analysis & printing =====
function generateDashboardAnalysis() {
  const totalBeds = DB.ward.reduce((sum, w) => sum + Number(w.beds || 0), 0);
  const occupied = DB.patient.filter(p => p.status === 'In Ward').length;
  const waiting = DB.patient.filter(p => p.status === 'Waiting List').length;
  const patients = DB.patient.length;
  const staffCount = DB.staff.length;

  const occupancyRate = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
  const waitingPct = patients ? Math.round((waiting / patients) * 100) : 0;
  const staffToPatient = patients ? (staffCount / patients).toFixed(2) : 'N/A';

  // top 3 wards by occupancy
  const wardsWithOcc = DB.ward.map(w => {
    const occ = DB.patient.filter(p => String(p.ward) === String(w.number) && p.status === 'In Ward').length;
    return { number: w.number, name: w.name, occ, beds: Number(w.beds || 0) };
  }).map(w => ({...w, rate: w.beds ? Math.round((w.occ / w.beds) * 100) : 0}));

  wardsWithOcc.sort((a,b) => b.rate - a.rate);
  const topWards = wardsWithOcc.slice(0,3);

  const insights = [];
  if (occupancyRate > 90) insights.push('Alert: Overall bed occupancy is critically high (' + occupancyRate + '%). Consider diverting admissions or accelerating discharges.');
  else if (occupancyRate > 75) insights.push('Warning: Bed occupancy is high (' + occupancyRate + '%). Monitor capacity closely.');
  else insights.push('Bed occupancy is within normal bounds (' + occupancyRate + '%).');

  if (waitingPct > 20) insights.push('There is a significant waiting list (' + waiting + ' patients, ' + waitingPct + '% of all patients).');
  if (staffToPatient !== 'N/A' && Number(staffToPatient) < 0.2) insights.push('Staff-to-patient ratio is low (' + staffToPatient + ' staff per patient). Consider rostering review.');

  if (topWards.length) {
    insights.push('Top wards by occupancy: ' + topWards.map(w => `${w.name} (${w.rate}%)`).join(', ') + '.');
  }

  return {
    totalBeds, occupied, waiting, patients, staffCount, occupancyRate, waitingPct, staffToPatient, topWards, insights
  };
}

function compileReportHtml(options = {}) {
  const a = generateDashboardAnalysis();
  // doctor and nurse counts
  const doctorCount = (DB.staff||[]).filter(s=>/(doctor|consultant|physician)/i.test(s.position||'')).length;
  const nurseCount = (DB.staff||[]).filter(s=>/nurse/i.test(s.position||'')).length;
  const header = `<h1>Wellmeadows Dashboard Report</h1><p>Generated: ${new Date().toLocaleString()}</p><div class="report-guide"><strong>How to read this report</strong><p>This report is a point-in-time snapshot of the hospital database. Summary values describe current patients, beds, and staffing. Tables provide the underlying records, while charts show counts, capacity, occupancy, and stock levels. Empty or zero values mean no matching records were available when the report was created.</p></div>`;

  const summary = `
    <h2>Summary</h2>
    <ul>
      <li>Total patients: ${a.patients}</li>
      <li>Waiting patients: ${a.waiting}</li>
      <li>Total beds: ${a.totalBeds}</li>
      <li>Occupied beds: ${a.occupied}</li>
      <li>Available beds: ${a.totalBeds - a.occupied}</li>
      <li>Staff members: ${a.staffCount}</li>
      <li>Bed occupancy rate: ${a.occupancyRate}%</li>
      <li>Waiting as % of patients: ${a.waitingPct}%</li>
      <li>Staff-to-patient ratio: ${a.staffToPatient}</li>
      <li>Estimated wait time: ${estimateWaitTime(a.waiting)}</li>
      <li>Doctors: ${doctorCount}</li>
      <li>Nurses: ${nurseCount}</li>
    </ul>
  `;

  const insightsHtml = `<h2>Insights</h2><ul>${a.insights.map(s => `<li>${s}</li>`).join('')}</ul>`;

  const wardTableRows = DB.ward.map(w => {
    const occ = DB.patient.filter(p => String(p.ward) === String(w.number) && p.status === 'In Ward').length;
    return `<tr><td>${w.number}</td><td>${w.name}</td><td>${w.location || ''}</td><td>${w.beds}</td><td>${occ}</td><td>${w.beds - occ}</td></tr>`;
  }).join('');

  const includeWards = options.includeWards !== false;
  const includeStaff = options.includeStaff !== false;
  const includePatients = options.includePatients === true;
  const includeCharts = options.includeCharts === true;
  const chartIndexes = Array.isArray(options.chartIndexes) ? options.chartIndexes : [0, 1, 2, 3, 4, 5];
  const includeCalendar = options.includeCalendar === true || options.includeCalendar === undefined;

  let parts = [];
  parts.push(header);
  parts.push(summary);
  parts.push(insightsHtml);

  if (includeCharts) {
    parts.push(`<h2>Charts</h2>`);
    parts.push(generateSelectedDashboardCharts(chartIndexes, a, options.chartType || 'bar'));
  }

  if (includeWards) {
    const wardHtml = `<h2>Ward Overview</h2><table style="width:100%;border-collapse:collapse"><tr><th>Ward</th><th>Name</th><th>Location</th><th>Beds</th><th>Occupied</th><th>Free</th></tr>${wardTableRows}</table>`;
    parts.push(wardHtml);
  }

  if (includeStaff) {
    const staffRows = DB.staff.map(s => `<tr><td>${s.staffNo}</td><td>${s.first} ${s.last}</td><td>${s.position}</td><td>${s.ward || '-'}</td></tr>`).join('');
    const staffHtml = `<h2>Staff List</h2><table style="width:100%;border-collapse:collapse"><tr><th>Staff No</th><th>Name</th><th>Position</th><th>Ward</th></tr>${staffRows}</table>`;
    parts.push(staffHtml);
    const staffBoardRows = DB.ward.map(ward => {
      const staff = DB.staff.filter(item => String(item.ward) === String(ward.number));
      return staff.length ? `<tr><td>Ward ${ward.number}</td><td>${ward.name || ''}</td><td>${staff.map(item => `${item.first || ''} ${item.last || ''}`.trim()).join(', ')}</td></tr>` : '';
    }).join('');
    parts.push(`<h2>Staff Ward Board</h2><table style="width:100%;border-collapse:collapse"><tr><th>Ward</th><th>Ward Name</th><th>Assigned Staff</th></tr>${staffBoardRows || '<tr><td colspan="3">No staff assignments</td></tr>'}</table>`);
  }

  if (includePatients) {
    const patientRows = DB.patient.map(p => {
      const gender = (p.sex || p.gender || '').toString().toLowerCase();
      let bg = '';
      if (gender.startsWith('m')) bg = '#eaf4ff';
      else if (gender.startsWith('f')) bg = '#fff0f6';
      const wardName = (DB.ward.find(w=>String(w.number)===String(p.ward))||{}).name || p.ward || '';
      return `<tr style="background:${bg};color:#111"><td>${p.patNo || '-'}</td><td>${p.first || ''} ${p.last || ''}</td><td>${p.status || ''}</td><td>${wardName}</td></tr>`;
    }).join('');
    parts.push(`<h2>Patients</h2><table style="width:100%;border-collapse:collapse"><tr><th>Pat No</th><th>Name</th><th>Status</th><th>Ward</th></tr>${patientRows}</table>`);

    // Bed allocations: list occupied beds and assigned patients
    const bedAllocRows = (DB.patient || []).filter(p=>p.bed).map(p=>{
      const wardName = (DB.ward.find(w=>String(w.number)===String(p.ward))||{}).name || p.ward || '';
      return { bed: p.bed, name: (p.first||'') + ' ' + (p.last||''), status: p.status||'', ward: wardName };
    }).sort((a,b)=> Number(a.bed) - Number(b.bed)).map(r=>`<tr><td>${r.bed}</td><td>${r.name}</td><td>${r.status}</td><td>${r.ward}</td></tr>`).join('');
    if (bedAllocRows.length) parts.push(`<h2>Bed Allocations</h2><table style="width:100%;border-collapse:collapse"><tr><th>Bed No</th><th>Patient</th><th>Status</th><th>Ward</th></tr>${bedAllocRows}</table>`);

    // Staff allocations grouped by ward
    const staffByWard = {};
    (DB.staff||[]).forEach(s=>{
      const key = s.ward || 'Unassigned';
      if (!staffByWard[key]) staffByWard[key]=[];
      staffByWard[key].push((s.first||'') + ' ' + (s.last||'') + (s.position ? ' ('+s.position+')' : ''));
    });
    const staffAllocRows = Object.keys(staffByWard).map(k=>{
      const wardName = (DB.ward.find(w=>String(w.number)===String(k))||{}).name || (k==='Unassigned'? 'Unassigned' : k);
      const list = staffByWard[k].join(', ');
      return `<tr><td>${wardName}</td><td>${staffByWard[k].length}</td><td>${list}</td></tr>`;
    }).join('');
    if (staffAllocRows) parts.push(`<h2>Staff Allocations</h2><table style="width:100%;border-collapse:collapse"><tr><th>Ward</th><th>Staff Count</th><th>Staff Members</th></tr>${staffAllocRows}</table>`);
  }

  if (includeCalendar) {
    parts.push(`<h2>Calendar / Events</h2>`);
    parts.push(generateCalendarHtml());
  }

  // discover current user for footer
  let userDisplay = 'Unknown';
  try {
    const s = sessionStorage.getItem('wmSession');
    if (s) {
      const cur = JSON.parse(s);
      userDisplay = (cur.fullName || cur.user || cur.username) || userDisplay;
    }
  } catch (e) {}

  const footer = `<div style="margin-top:18px;border-top:1px solid #ddd;padding-top:8px;color:#555;font-size:12px">Printed by: ${userDisplay} — ${new Date().toLocaleString()}</div>`;

  return `
    <div style="font-family:Arial, Helvetica, sans-serif;color:#111">
      ${parts.join('\n')}
      ${footer}
    </div>
  `;
}

function reportChartText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function generateReportChart(title, labels, datasets, palette, type = 'bar') {
  if (type === 'line') return generateReportLineChart(title, labels, datasets, palette);
  const width = 760;
  const left = 170;
  const rowHeight = 34;
  const height = Math.max(100, labels.length * rowHeight + 62);
  const max = Math.max(1, ...datasets.flatMap(dataset => dataset.data.map(value => Number(value || 0))));
  const legend = datasets.map((dataset, index) => `<span style="display:inline-flex;align-items:center;margin-right:16px;color:#456"><i style="display:inline-block;width:10px;height:10px;margin-right:5px;background:${palette[index % palette.length]}"></i>${reportChartText(dataset.label)}</span>`).join('');
  const rows = labels.map((label, rowIndex) => {
    const y = 34 + rowIndex * rowHeight;
    const bars = datasets.map((dataset, datasetIndex) => {
      const value = Number(dataset.data[rowIndex] || 0);
      const barY = y + datasetIndex * 9;
      const barWidth = Math.max(value ? 2 : 0, Math.round((value / max) * (width - left - 36)));
      return `<rect x="${left}" y="${barY}" width="${barWidth}" height="7" rx="3" fill="${palette[datasetIndex % palette.length]}"/><text x="${Math.min(width - 24, left + barWidth + 5)}" y="${barY + 7}" font-size="9" fill="#456">${reportChartText(value)}</text>`;
    }).join('');
    return `<text x="8" y="${y + 12}" font-size="11" fill="#22303f">${reportChartText(label)}</text>${bars}`;
  }).join('');
  return `<div style="margin:12px 0 18px;padding:12px;border:1px solid #d3ddec;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff);page-break-inside:avoid"><h3 style="margin:0 0 5px;color:#33507a">${reportChartText(title)}</h3><div style="font-size:11px;margin-bottom:4px">${legend}</div><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${reportChartText(title)} chart"><rect width="100%" height="100%" fill="#ffffff" opacity=".55" rx="6"/>${rows}</svg></div>`;
}

// Line-chart variant of generateReportChart, used when the print options
// dialog's "Chart style" dropdown is set to Line instead of the default
// Bar. Draws each dataset as its own polyline across evenly spaced x
// positions (one per label), with a light gridline scale and value dots.
function generateReportLineChart(title, labels, datasets, palette) {
  const width = 760, height = 260, left = 46, right = 20, top = 20, bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(1, ...datasets.flatMap(dataset => dataset.data.map(value => Number(value || 0))));
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
  const xFor = index => left + (labels.length > 1 ? index * stepX : plotWidth / 2);
  const yFor = value => top + plotHeight - (Number(value || 0) / max) * plotHeight;

  const legend = datasets.map((dataset, index) => `<span style="display:inline-flex;align-items:center;margin-right:16px;color:#456"><i style="display:inline-block;width:10px;height:10px;margin-right:5px;background:${palette[index % palette.length]}"></i>${reportChartText(dataset.label)}</span>`).join('');

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(fraction => {
    const y = top + plotHeight - fraction * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e3e9f2" stroke-width="1"/><text x="${left - 8}" y="${y + 3}" font-size="9" text-anchor="end" fill="#8393a8">${Math.round(fraction * max)}</text>`;
  }).join('');

  const axisLabels = labels.map((label, index) => `<text x="${xFor(index)}" y="${height - 10}" font-size="9" fill="#456" text-anchor="middle">${reportChartText(label)}</text>`).join('');

  const series = datasets.map((dataset, datasetIndex) => {
    const color = palette[datasetIndex % palette.length];
    const points = dataset.data.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
    const line = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    const dots = dataset.data.map((value, index) => `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="3" fill="${color}"/><text x="${xFor(index)}" y="${yFor(value) - 6}" font-size="9" text-anchor="middle" fill="#22303f">${reportChartText(value)}</text>`).join('');
    return line + dots;
  }).join('');

  return `<div style="margin:12px 0 18px;padding:12px;border:1px solid #d3ddec;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff);page-break-inside:avoid"><h3 style="margin:0 0 5px;color:#33507a">${reportChartText(title)}</h3><div style="font-size:11px;margin-bottom:4px">${legend}</div><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${reportChartText(title)} chart"><rect width="100%" height="100%" fill="#ffffff" opacity=".55" rx="6"/>${gridLines}${series}${axisLabels}</svg></div>`;
}

function generateSelectedDashboardCharts(chartIndexes, analysis, chartType = 'bar') {
  const wardData = DB.ward.map(ward => ({ label: `Ward ${ward.number}`, total: Number(ward.beds || 0), occupied: DB.patient.filter(patient => String(patient.ward) === String(ward.number) && patient.status === 'In Ward').length }));
  const stockData = [
    ...DB.supply.map(item => ({ label: item.name, stock: Number(item.qty || 0), reorder: Number(item.reorder || 0) })),
    ...DB.pharma.map(item => ({ label: item.name, stock: Number(item.qty || 0), reorder: Number(item.reorder || 0) }))
  ].slice(0, 10);
  const statusCounts = {};
  const positionCounts = {};
  const requisitionCounts = {};
  DB.patient.forEach(patient => { const key = patient.status || 'Unknown'; statusCounts[key] = (statusCounts[key] || 0) + 1; });
  DB.staff.forEach(staff => { const key = staff.position || 'Other'; positionCounts[key] = (positionCounts[key] || 0) + 1; });
  DB.requisition.forEach(item => { const key = item.status || 'Pending'; requisitionCounts[key] = (requisitionCounts[key] || 0) + 1; });

  const charts = [
    () => generateReportChart('Bed Occupancy', ['Occupied beds', 'Free beds'], [{ label: 'Beds', data: [analysis.occupied, Math.max(0, analysis.totalBeds - analysis.occupied)] }], ['#c0392b', '#61b878'], chartType),
    () => generateReportChart('Patients by Status', Object.keys(statusCounts), [{ label: 'Patients', data: Object.values(statusCounts) }], ['#2b7bd3', '#61b878', '#f0a63a', '#8b6eb4'], chartType),
    () => generateReportChart('Staff by Position', Object.keys(positionCounts), [{ label: 'Staff', data: Object.values(positionCounts) }], ['#005EB8', '#f0a63a', '#61b878', '#d96c75'], chartType),
    () => generateReportChart('Ward Occupancy', wardData.map(item => item.label), [{ label: 'Total beds', data: wardData.map(item => item.total) }, { label: 'Occupied', data: wardData.map(item => item.occupied) }], ['#2b7bd3', '#c0392b'], chartType),
    () => generateReportChart('Stock vs Reorder Level', stockData.map(item => item.label), [{ label: 'In stock', data: stockData.map(item => item.stock) }, { label: 'Reorder level', data: stockData.map(item => item.reorder) }], ['#61b878', '#f0a63a'], chartType),
    () => generateReportChart('Requisitions by Status', Object.keys(requisitionCounts), [{ label: 'Requisitions', data: Object.values(requisitionCounts) }], ['#8b6eb4', '#2b7bd3', '#c0392b'], chartType)
  ];
  return chartIndexes.filter(index => charts[index]).map(index => charts[index]()).join('') || '<p>No charts selected.</p>';
}

function printDashboardReport(options = {}) {
  const html = compileReportHtml(options);
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Pop-up blocked. Please allow popups to print reports.'); return; }
  w.document.write('<!doctype html><html><head><title>Dashboard Report</title>');
  w.document.write('<style>@page{size:auto;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;padding:18px;color:#111;background:#fff;color-scheme:light}h1{color:#0b3d91}h2{color:#333;border-bottom:2px solid #d3ddec;padding-bottom:5px}h3{color:#33507a}table,th,td{border:1px solid #ddd;padding:8px}table{border-collapse:collapse;width:100%}th{background:#f4f4f4;color:#33507a}.report-guide{margin:12px 0 18px;padding:12px 14px;border:1px solid #c9dbee;border-left:5px solid #2b7bd3;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#eef6ff)}.report-guide p{margin:5px 0 0;font-size:12px;line-height:1.5}svg{max-width:100%;height:auto;print-color-adjust:exact;-webkit-print-color-adjust:exact}div{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style>');
  w.document.write('</head><body>');
  w.document.write(html);
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); /* w.close(); */ }, 400);
}

