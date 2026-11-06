function showPrintOptions() {
  // build modal
  const printLinkEl = document.querySelector('.printLink');
  if (printLinkEl) printLinkEl.classList.add('active');
  const overlay = document.createElement('div');
  overlay.id = 'printOptionsOverlay';
  overlay.className = 'print-options-overlay';
  const box = document.createElement('div');
  box.className = 'print-options-box';
  box.innerHTML = `
    <h3>Print Dashboard Report</h3>
    <p class="print-options-help">Choose the sections and charts to include in the PDF preview.</p>
    <div class="print-section-options">
      <label class="print-option-card"><input type="checkbox" id="optWards" checked><span class="print-option-swatch swatch-blue"></span><span><strong>Ward Overview</strong><small>Capacity and occupancy by ward</small></span></label>
      <label class="print-option-card"><input type="checkbox" id="optStaff" checked><span class="print-option-swatch swatch-green"></span><span><strong>Staff Information</strong><small>Staff list and ward assignments</small></span></label>
      <label class="print-option-card"><input type="checkbox" id="optPatients"><span class="print-option-swatch swatch-pink"></span><span><strong>Patient Information</strong><small>Patients, beds, and allocations</small></span></label>
      <label class="print-option-card"><input type="checkbox" id="optCalendar" checked><span class="print-option-swatch swatch-yellow"></span><span><strong>Calendar and Events</strong><small>Scheduled events and dates</small></span></label>
    </div>
    <label class="print-chart-heading"><input type="checkbox" id="optCharts" checked><strong>Charts</strong><small>Choose individual data visualisations</small></label>
    <label class="print-chart-type-row">
      <span>Chart style</span>
      <select id="optChartType">
        <option value="bar" selected>📊 Bar</option>
        <option value="line">📈 Line</option>
      </select>
    </label>
    <div id="chartPrintChoices" class="print-chart-grid">
      ${['Bed Occupancy','Patients by Status','Staff by Position','Ward Occupancy','Stock vs Reorder Level','Requisitions by Status'].map((label, index) => `<label class="print-chart-card chart-color-${index}"><input type="checkbox" class="chartPrintChoice" data-chart-index="${index}" checked><span>${label}</span></label>`).join('')}
    </div>
    <div class="print-options-actions">
      <button id="optCancel" class="infoBtn">Cancel</button>
      <button id="optPrint" class="act">Preview PDF</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const chartToggle = document.getElementById('optCharts');
  const chartChoices = [...document.querySelectorAll('.chartPrintChoice')];
  const chartTypeSelect = document.getElementById('optChartType');
  chartToggle.onchange = () => {
    chartChoices.forEach(input => { input.disabled = !chartToggle.checked; });
    if (chartTypeSelect) chartTypeSelect.disabled = !chartToggle.checked;
  };
  document.getElementById('optCancel').onclick = ()=> { overlay.remove(); if (printLinkEl) printLinkEl.classList.remove('active'); };
  document.getElementById('optPrint').onclick = ()=>{
    const options = {
      includeWards: document.getElementById('optWards').checked,
      includeStaff: document.getElementById('optStaff').checked,
      includePatients: document.getElementById('optPatients').checked,
      includeCharts: document.getElementById('optCharts').checked,
      chartIndexes: [...document.querySelectorAll('.chartPrintChoice:checked')].map(input => Number(input.dataset.chartIndex)),
      chartType: chartTypeSelect ? chartTypeSelect.value : 'bar',
      includeCalendar: document.getElementById('optCalendar').checked
    };
    overlay.remove();
    if (printLinkEl) printLinkEl.classList.remove('active');
    printDashboardReport(options);
  };
}

