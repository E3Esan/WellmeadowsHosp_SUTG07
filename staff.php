<?php // Page: staff (rendered inside <main> in index.php) ?>
  <div id="staff" class="page"><h2>Staff</h2>
  <div class="grid2" id="f-staff" style="display:none"></div><button class="act" onclick="openUploadDialog('staff')">Upload</button>
  <div class="searchWrap">
    <input class="search" id="search-staff" list="staff-search-suggestions" placeholder="Search staff by name or code..." oninput="render('staff', this.value, document.getElementById('type-staff').value)">
    <datalist id="staff-search-suggestions"></datalist>
    <select class="searchType" id="type-staff" onchange="render('staff', document.getElementById('search-staff').value, this.value)">
      <option value="all">All</option>
      <option value="staffNo">Staff No</option>
      <option value="name">Name</option>
      <option value="position">Position</option>
      <option value="qualification">Qualification</option>
      <option value="ward">Ward Assigned</option>
    </select>
    <select class="searchType" id="staff-qualification-select" onchange="render('staff', this.value, 'qualification')">
      <option value="">All qualifications</option>
    </select>
  </div>
  <table id="t-staff"></table></div>

  <!-- Patients page-->
