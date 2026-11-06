<?php // Page: dashboard (rendered inside <main> in index.php) ?>
  <div id="dashboard" class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <h2>Dashboard</h2>
      <div>
        <a class="printLink" onclick="showPrintOptions()" role="button" style="cursor:pointer">Print Report</a>
      </div>
    </div>

    <h2>At a Glance</h2>
    <div class="chartsGrid">
      <div class="chartCard"><div class="chartCardHead"><h3>Bed Occupancy</h3><div class="chartTypeSwitch" id="switch-chartBedOccupancy"></div></div><div id="chartBedOccupancy"></div></div>
      <div class="chartCard"><div class="chartCardHead"><h3>Patients by Status</h3><div class="chartTypeSwitch" id="switch-chartPatientStatus"></div></div><div id="chartPatientStatus"></div></div>
      <div class="chartCard"><div class="chartCardHead"><h3>Staff by Position</h3><div class="chartTypeSwitch" id="switch-chartStaffPosition"></div></div><div id="chartStaffPosition"></div></div>
      <div class="chartCard"><div class="chartCardHead"><h3>Ward Occupancy</h3><div class="chartTypeSwitch" id="switch-chartWardOccupancy"></div></div><div id="chartWardOccupancy"></div></div>
      <div class="chartCard"><div class="chartCardHead"><h3>Stock vs Reorder Level</h3><div class="chartTypeSwitch" id="switch-chartStockLevels"></div></div><div id="chartStockLevels"></div></div>
      <div class="chartCard"><div class="chartCardHead"><h3>Requisitions by Status</h3><div class="chartTypeSwitch" id="switch-chartRequisitionStatus"></div></div><div id="chartRequisitionStatus"></div></div>
    </div>

  <h2>Staff on Duty</h2><div class="staffWidget" id="staffWidget"></div>
  <div id="dashboardStaffBoard"></div>
  <h2>Wards Overview</h2><table id="wardOverview"></table>
  <div id="dashboardSlideshow" class="dashboardSlideshow" aria-label="Hospital gallery slideshow"></div>
  </div>

  <!-- Bed page -->
