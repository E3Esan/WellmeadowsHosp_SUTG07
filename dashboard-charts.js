// ===== Dashboard charts (ApexCharts) =====
// renderDash() (dashboard-render.js) calls renderDashboardCharts() at the end
// of every dashboard render, so these always reflect the live DB data.
//
// Each chart can be switched between Pie / Bar / Line at any time — the
// buttons are built automatically next to each chart's title. The choice is
// remembered per chart (per browser) via localStorage.
const CHART_REGISTRY = {};   // canvasId -> live ApexCharts instance
const CHART_CONFIGS = {};    // canvasId -> { labels, datasets, type, pieDatasetIndex, indexAxis }

const CHART_PALETTE = ['#005EB8', '#61b878', '#f0a63a', '#c0392b', '#8b6eb4', '#2b7bd3', '#c9a227', '#6c757d', '#3fa7d6', '#e07a5f'];
const CHART_TYPES = [
  { value: 'pie', label: '🥧 Pie' },
  { value: 'bar', label: '📊 Bar' },
  { value: 'line', label: '📈 Line' }
];

function chartTextColor() {
  return document.body.classList.contains('dark-mode') ? '#dce6f2' : '#22303f';
}

// Builds/refreshes the Pie/Bar/Line button row for one chart.
function buildChartTypeSwitcher(canvasId) {
  const host = document.getElementById('switch-' + canvasId);
  if (!host) return;
  const cfg = CHART_CONFIGS[canvasId];

  host.innerHTML = CHART_TYPES.map(t =>
    `<button type="button" class="chartTypeBtn${t.value === cfg.type ? ' active' : ''}" onclick="setChartType('${canvasId}','${t.value}')">${t.label}</button>`
  ).join('');
}

// Called by the Pie/Bar/Line buttons.
function setChartType(canvasId, type) {
  const cfg = CHART_CONFIGS[canvasId];
  if (!cfg) return;
  cfg.type = type;
  localStorage.setItem('chartType:' + canvasId, type);
  drawChart(canvasId);
  buildChartTypeSwitcher(canvasId);
}

// Registers a chart's data + allowed shape, then draws it. Call this (not
// drawChart directly) whenever the dashboard re-renders, since the
// underlying labels/datasets may have changed.
//   registerChart(canvasId, labels, datasets, {
//     defaultType: 'bar' | 'pie' | 'line',
//     pieDatasetIndex: which dataset becomes the pie slice values when more
//                      than one dataset exists (default 0),
//     indexAxis: 'y' for horizontal bars
//   })
function registerChart(canvasId, labels, datasets, opts = {}) {
  const savedType = localStorage.getItem('chartType:' + canvasId);
  CHART_CONFIGS[canvasId] = {
    labels,
    datasets,
    type: savedType || opts.defaultType || 'bar',
    pieDatasetIndex: opts.pieDatasetIndex || 0,
    indexAxis: opts.indexAxis || 'x'
  };
  buildChartTypeSwitcher(canvasId);
  drawChart(canvasId);
}

function drawChart(canvasId) {
  const cfg = CHART_CONFIGS[canvasId];
  const host = document.getElementById(canvasId);
  if (!cfg || !host || typeof ApexCharts === 'undefined') return;

  if (CHART_REGISTRY[canvasId]) {
    CHART_REGISTRY[canvasId].destroy();
    delete CHART_REGISTRY[canvasId];
  }

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = chartTextColor();
  const baseOptions = {
    chart: {
      height: 240,
      background: 'transparent',
      foreColor: textColor,
      fontFamily: "'Segoe UI', Arial, sans-serif",
      toolbar: { show: false },
      animations: { speed: 300 }
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: CHART_PALETTE,
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    grid: { borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e0e0e0' }
  };

  let options;

  if (cfg.type === 'pie') {
    // Pie only shows one series — pick the configured dataset (or sum all
    // datasets if there's just conceptually one metric split by label).
    const primary = cfg.datasets[cfg.pieDatasetIndex] || cfg.datasets[0];
    options = {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'pie' },
      series: primary.data,
      labels: cfg.labels
    };
  } else if (cfg.type === 'line') {
    options = {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'line' },
      series: cfg.datasets.map(ds => ({ name: ds.label, data: ds.data })),
      xaxis: { categories: cfg.labels },
      yaxis: { forceNiceScale: true, labels: { formatter: v => Math.round(v) } },
      stroke: { curve: 'smooth', width: 3 },
      markers: { size: 4 },
      legend: { ...baseOptions.legend, show: cfg.datasets.length > 1 }
    };
  } else { // bar
    options = {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'bar' },
      series: cfg.datasets.map(ds => ({ name: ds.label, data: ds.data })),
      xaxis: { categories: cfg.labels },
      yaxis: { forceNiceScale: true, labels: { formatter: v => Math.round(v) } },
      plotOptions: { bar: { horizontal: cfg.indexAxis === 'y', borderRadius: 3 } },
      legend: { ...baseOptions.legend, show: cfg.datasets.length > 1 }
    };
  }

  CHART_REGISTRY[canvasId] = new ApexCharts(host, options);
  CHART_REGISTRY[canvasId].render();
}

// Re-renders every currently-registered chart with the current theme's
// colors. Called by setTheme()/toggleTheme() (nav.js) so charts don't stay
// stuck with the old light/dark foreColor after switching themes.
function refreshChartsTheme() {
  Object.keys(CHART_CONFIGS).forEach(drawChart);
}

function renderDashboardCharts() {
  if (typeof ApexCharts === 'undefined') return; // ApexCharts CDN not reachable — dashboard still works without it

  // ---- Bed occupancy ----
  const totalBeds = DB.ward.reduce((sum, w) => sum + Number(w.beds || 0), 0);
  const occupied = DB.patient.filter(p => p.status === 'In Ward').length;
  registerChart('chartBedOccupancy',
    ['Occupied', 'Free'],
    [{ label: 'Beds', data: [occupied, Math.max(0, totalBeds - occupied)] }],
    { defaultType: 'pie' }
  );

  // ---- Patients by status ----
  const statusCounts = {};
  DB.patient.forEach(p => { const s = p.status || 'Unknown'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
  registerChart('chartPatientStatus',
    Object.keys(statusCounts),
    [{ label: 'Patients', data: Object.values(statusCounts) }],
    { defaultType: 'bar' }
  );

  // ---- Staff by position ----
  const posCounts = {};
  DB.staff.forEach(s => { const p = s.position || 'Other'; posCounts[p] = (posCounts[p] || 0) + 1; });
  registerChart('chartStaffPosition',
    Object.keys(posCounts),
    [{ label: 'Staff', data: Object.values(posCounts) }],
    { defaultType: 'pie' }
  );

  // ---- Ward occupancy (beds vs occupied) ----
  const wardLabels = DB.ward.map(w => `Ward ${w.number}`);
  const wardBeds = DB.ward.map(w => Number(w.beds || 0));
  const wardOcc = DB.ward.map(w => DB.patient.filter(p => String(p.ward) === String(w.number) && p.status === 'In Ward').length);
  registerChart('chartWardOccupancy',
    wardLabels,
    [
      { label: 'Total Beds', data: wardBeds },
      { label: 'Occupied', data: wardOcc }
    ],
    { defaultType: 'bar', indexAxis: 'y', pieDatasetIndex: 1 }
  );

  // ---- Stock vs reorder level (supplies + pharma combined, top 10) ----
  const stockItems = [
    ...DB.supply.map(s => ({ name: s.name, qty: Number(s.qty || 0), reorder: Number(s.reorder || 0) })),
    ...DB.pharma.map(p => ({ name: p.name, qty: Number(p.qty || 0), reorder: Number(p.reorder || 0) }))
  ].slice(0, 10);
  registerChart('chartStockLevels',
    stockItems.map(i => i.name),
    [
      { label: 'In Stock', data: stockItems.map(i => i.qty) },
      { label: 'Reorder Level', data: stockItems.map(i => i.reorder) }
    ],
    { defaultType: 'bar', pieDatasetIndex: 0 }
  );

  // ---- Requisitions by status ----
  const reqCounts = {};
  DB.requisition.forEach(r => { const s = r.status || 'Pending'; reqCounts[s] = (reqCounts[s] || 0) + 1; });
  registerChart('chartRequisitionStatus',
    Object.keys(reqCounts),
    [{ label: 'Requisitions', data: Object.values(reqCounts) }],
    { defaultType: 'pie' }
  );
}
