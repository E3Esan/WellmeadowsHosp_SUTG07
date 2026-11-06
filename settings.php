<?php // Page: settings (rendered inside <main> in index.php) ?>
  <div id="settings" class="page"><h2>Settings</h2>
    <div class="settingsGrid">

      <div class="settingsCard">
        <h3>Appearance</h3>
        <div class="settingsRow">
          <label>Theme</label>
          <button class="act" onclick="toggleTheme()" id="settingsThemeBtn">Toggle Dark / Light</button>
        </div>
        <div class="settingsRow">
          <label>Table density</label>
          <select id="settings-density" onchange="applyDensityPreference(this.value)">
            <option value="normal">Normal</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </div>

      <div class="settingsCard">
        <h3>Preferences</h3>
        <div class="settingsRow">
          <label>Landing page after login</label>
          <select id="settings-landing">
            <option value="dashboard">Dashboard</option>
            <option value="beds">Bed Monitor</option>
            <option value="wards">Wards</option>
            <option value="staff">Staff</option>
            <option value="patients">Patients</option>
            <option value="reports">Report Hub</option>
          </select>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button class="act save" onclick="savePreferences()">Save Preferences</button>
        </div>
      </div>

      <div class="settingsCard">
        <h3>Account &amp; Security</h3>
        <div class="settingsRow"><label>Signed in as</label><span id="settings-username">-</span></div>
        <div class="settingsRow"><label>Role</label><span id="settings-role">-</span></div>
        <div class="settingsRow"><label>Account created</label><span id="settings-created">-</span></div>
        <div class="settingsRow"><label>Last login</label><span id="settings-lastlogin">-</span></div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;gap:8px">
          <button class="act danger" onclick="openChangePasswordModal()">Change Password</button>
        </div>
      </div>

      <div class="settingsCard" id="settings-admin-card" style="display:none">
        <h3>Administration</h3>
        <div class="settingsRow">
          <label>Manage all accounts</label>
          <button class="act" onclick="show('users')">Open User Management</button>
        </div>
      </div>

      <div class="settingsCard" style="grid-column:1/-1">
        <h3>System Status <span id="settings-status-pill" class="statusPill">Checking…</span></h3>
        <div id="settings-status-body">Checking database connection…</div>
      </div>

    </div>
  </div>

  <!-- Leave Requests page -->
