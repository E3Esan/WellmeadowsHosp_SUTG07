<?php // Page: profile (rendered inside <main> in index.php) ?>
  <div id="profile" class="page">
    <h2>Profile</h2>
    <div class="profilePage">
      <div class="profileCard">
        <div id="profilePic" class="profilePicWidget" title="Profile picture">
          <img id="profile-avatar-img" src="" alt="Profile avatar">
        </div>
        <div style="margin-top:12px;">
          <div id="profile-display-name" class="profileDisplayName">-</div>
          <div class="profileSubRow">
            <span id="profile-username" class="profileUsername">-</span>
            <span id="profile-role-badge-wrap"></span>
          </div>
        </div>
        <div class="profileMetaList">
          <div class="profileMetaRow"><span>Position</span><b id="profile-meta-position">-</b></div>
          <div class="profileMetaRow"><span>Email</span><b id="profile-meta-email">-</b></div>
          <div class="profileMetaRow"><span>Phone</span><b id="profile-meta-phone">-</b></div>
          <div class="profileMetaRow"><span>Member since</span><b id="profile-meta-created">-</b></div>
          <div class="profileMetaRow"><span>Last login</span><b id="profile-meta-lastlogin">-</b></div>
        </div>
      </div>

      <div>
        <div class="profileCard profileInfoBlock">
          <div style="font-weight:700; font-size:13px; color:var(--primary-dk)">Info (click to edit)</div>
          <div id="profile-info" class="editable" contenteditable="true" placeholder="Add profile notes, bio, contact details..."></div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="act" onclick="saveProfileInfo()">Save</button>
          </div>
        </div>
        
        <div class="profileCard" style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:700;color:var(--primary-dk)">Setting</div>
            <button class="act" id="profile-settings-toggle" onclick="toggleProfileSettings()">Open</button>
          </div>
          <div id="profile-settings-panel" class="settingsPanel" style="margin-top:12px;gap:8px">
            <div style="font-weight:700;color:var(--primary-dk)">Avatar</div>
            <div style="display:flex;gap:12px;align-items:center">
              <img id="profile-avatar-settings-img" src="" alt="Avatar preview" style="width:82px;height:82px;object-fit:cover;border-radius:10px;border:1px solid var(--bd)">
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="act" onclick="profileDownloadImage()">Download</button>
                <button class="act" onclick="openProfileFileDialog()">Upload</button>
                <button class="act secondary" onclick="removeProfileAvatar()">Remove</button>
              </div>
            </div>

            <label>Username<input id="profile-username-input" class="wide" type="text" placeholder="username"></label>
            <label>Full name<input id="profile-full-name" class="wide" type="text" placeholder="Full name"></label>
            <label>Email<input id="profile-email" class="wide" type="email" placeholder="Email"></label>
            <label>Phone<input id="profile-phone" class="wide" type="text" placeholder="Phone"></label>
            <!-- Role is read-only here — only an admin can change a role, and
                 only from Admin > User Management (see pages/users.php).
                 This used to be an editable <select> that any logged-in user
                 (including themselves) could save straight to their own
                 account; the field + the API support behind it were removed
                 for that reason. -->
            <label>Role
              <span id="profile-role-readonly" class="profileRoleReadonly"></span>
              <small class="caption">Only an admin can change a role — see Admin &gt; User Management.</small>
            </label>
            <label>Position<input id="profile-position" class="wide" type="text" placeholder="Position / Title"></label>

            <div style="border-top:1px dashed var(--bd);padding-top:8px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:700;margin-bottom:6px">Account</div>
              <div class="actions" style="display:flex;gap:8px">
                <button class="act save" onclick="saveProfileSettings()">Save Settings</button>
                <button class="act danger" id="change-password-link" onclick="openChangePasswordModal()">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

