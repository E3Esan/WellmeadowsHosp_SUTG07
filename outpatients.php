<?php // Page: outpatients (rendered inside <main> in index.php) ?>
  <div id="outpatients" class="page"><h2>Outpatients</h2>
  <div class="grid2" id="f-outpatient" style="display:none"></div><button class="act" onclick="openUploadDialog('outpatient')">Upload</button>
  <div class="searchWrap">
    <input class="search" id="search-outpatient" placeholder="Search outpatients..." oninput="render('outpatient', this.value, document.getElementById('type-outpatient').value)">
    <select class="searchType" id="type-outpatient" onchange="render('outpatient', document.getElementById('search-outpatient').value, this.value)">
      <option value="all">All</option>
      <option value="patNo">Patient No</option>
      <option value="name">Name</option>
      <option value="localDoctor">Local Doctor</option>
      <option value="apptDate">Appointment Date</option>
      <option value="apptTime">Appointment Time</option>
      <option value="status">Status</option>
    </select>
  </div>
  <table id="t-outpatient"></table></div>

  <!-- Patients Appointments page -->
