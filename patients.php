<?php // Page: patients (rendered inside <main> in index.php) ?>
  <div id="patients" class="page"><h2>Patients (In-ward / Waiting List)</h2>
  <div class="grid2" id="f-patient" style="display:none"></div><button class="act" onclick="openUploadDialog('patient')">Upload</button>
  <div class="searchWrap">
    <input class="search" id="search-patient" list="patient-search-suggestions" placeholder="Search patients by name or code..." oninput="render('patient', this.value, 'all')">
    <datalist id="patient-search-suggestions"></datalist>
    <select class="searchType" id="patient-allergy-select" onchange="render('patient', this.value, 'allergies')">
      <option value="">All allergies</option>
    </select>
    <select class="searchType" id="patient-medication-select" onchange="render('patient', this.value, 'medication')">
      <option value="">All medications</option>
    </select>
    <select class="searchType" id="patient-illness-select" onchange="render('patient', this.value, 'illness')">
      <option value="">All illness records</option>
    </select>
  </div>
  <table id="t-patient"></table></div>

  <!-- Outpatients page -->
