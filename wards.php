<?php // Page: wards (rendered inside <main> in index.php) ?>
  <div id="wards" class="page"><h2>Wards</h2>
  <div class="grid2" id="f-ward" style="display:none"></div><button class="act" onclick="openUploadDialog('ward')">Upload</button>
  <div class="searchWrap">
    <input class="search" id="search-ward" placeholder="Search wards..." oninput="render('ward', this.value, document.getElementById('type-ward').value)">
    <select class="searchType" id="type-ward" onchange="render('ward', document.getElementById('search-ward').value, this.value)">
      <option value="all">All</option>
      <option value="number">Ward No</option>
      <option value="name">Ward Name</option>
      <option value="location">Location</option>
      <option value="beds">Beds</option>
    </select>
  </div>
  <table id="t-ward"></table></div>

  <!-- Staff page -->
