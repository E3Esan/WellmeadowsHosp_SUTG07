<?php // Page: leave (rendered inside <main> in index.php) ?>
  <div id="leave" class="page"><h2>Staff Leave Requests</h2>
  <div class="grid2" id="f-leave" style="display:none"></div><button class="act" onclick="openUploadDialog('leave')">New Leave Request</button>
  <div class="searchWrap">
    <input class="search" id="search-leave" placeholder="Search leave requests..." oninput="render('leave', this.value, document.getElementById('type-leave').value)">
    <select class="searchType" id="type-leave" onchange="render('leave', document.getElementById('search-leave').value, this.value)">
      <option value="all">All</option>
      <option value="staffNo">Staff No</option>
      <option value="name">Staff Name</option>
      <option value="status">Status</option>
      <option value="ward">Ward</option>
    </select>
  </div>
  <table id="t-leave"></table></div>

  <!-- Report hub page -->
