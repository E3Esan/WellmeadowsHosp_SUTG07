<?php // Page: users — Admin-only User Management (rendered inside <main> in index.php) ?>
  <div id="users" class="page">
    <h2>User Management</h2>
    <p class="pageIntro">Every account in the <code>users</code> table. Only Admin/Administrator
      accounts can see this page — edits here save straight to the database and take effect
      immediately for that user, including on their next request.</p>

    <div class="searchWrap">
      <input class="search" id="users-search" placeholder="Search by username, name, email, or role..." oninput="renderUsersPage(this.value)">
      <button class="act" onclick="renderUsersPage()">Refresh</button>
    </div>
    <table id="t-users">
      <tr><th>User</th><th>Full name</th><th>Role</th><th>Email</th><th>Phone</th><th>Last login</th><th></th></tr>
    </table>
    <div id="users-empty" style="display:none;color:#889;font-size:13px;padding:14px">No accounts found.</div>
  </div>
