<?php // All detail-view modal overlays (ward/drug/patient/staff/appointment/supply/supplier/medication) + upload dialog + change-password modal ?>
<!-- Ward Staff Detail modal (opened via Info button on Wards page) -->
<div class="wdOverlay" id="wardDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeWardDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="wd-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="wd-meta"></div>
   </div>
  </div>
  <div id="wd-supervisor"></div>
  <h3 class="wdSectionTitle">Assigned Staff &amp; Weekly Shift Rota</h3>
  <table id="wd-staffTable"></table>
  <div id="wd-empty" style="color:#889;font-size:13px;margin-top:8px"></div>
  <div class="wdNote">Shift rota shown is a generated demo schedule (no real rota data in this prototype's dataset).</div>
 </div>
</div>

<!-- hidden file input for profile upload -->
<input type="file" id="profile-file-input" accept="image/*" style="display:none" onchange="profileFileSelected(event)">

<!-- Change password modal -->
<div class="wdOverlay" id="changePassOverlay" style="display:none">
  <div class="wdBox" style="max-width:460px;width:92%">
    <button class="wdClose" onclick="closeChangePasswordModal()">✕</button>
    <h2 style="margin-top:0">Change Password</h2>
    <div style="display:grid;gap:8px">
      <input id="change-current-pass" type="password" placeholder="Current password">
      <div style="display:flex;gap:8px;align-items:center">
        <input id="change-new-pass" type="password" placeholder="New password" style="flex:1">
        <button class="act suggest" type="button" onclick="generatePasswordSuggestion()">Suggest</button>
      </div>
      <input id="change-confirm-pass" type="password" placeholder="Confirm new password">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="act secondary" onclick="closeChangePasswordModal()">Cancel</button>
        <button class="act danger" onclick="handleChangePasswordSubmit()">Change Password</button>
      </div>
    </div>

      <!-- profile picture modal removed; using inline overlay buttons in widget -->
  </div>
</div>

<div class="wdOverlay" id="drugDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeDrugDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="drug-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="drug-meta"></div>
   </div>
  </div>
  <div id="drug-details"></div>
 </div>
</div>

<div class="wdOverlay" id="supplyDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeSupplyDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="supply-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="supply-meta"></div>
   </div>
  </div>
  <div id="supply-details"></div>
 </div>
</div>

<div class="wdOverlay" id="supplierDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeSupplierDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="supplier-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="supplier-meta"></div>
   </div>
  </div>
  <div id="supplier-details"></div>
 </div>
</div>

<div class="wdOverlay" id="patientDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closePatientDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="patient-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="patient-meta"></div>
   </div>
  </div>
  <div id="patient-details"></div>
 </div>
</div>

<div class="wdOverlay" id="staffDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeStaffDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="staff-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="staff-meta"></div>
   </div>
  </div>
  <div id="staff-details"></div>
 </div>
</div>

<div class="wdOverlay" id="appointmentDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeAppointmentDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="appointment-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="appointment-meta"></div>
   </div>
  </div>
  <div id="appointment-details"></div>
 </div>
</div>

<div class="wdOverlay" id="medicationDetailOverlay">
 <div class="wdBox">
  <button class="wdClose" onclick="closeMedicationDetail()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="medication-title" style="margin:0;border:none;padding:0"></h2>
    <div class="wdMeta" id="medication-meta"></div>
   </div>
  </div>
  <div id="medication-details"></div>
 </div>
</div>

<div class="wdOverlay" id="uploadDialogOverlay">
 <div class="wdBox" style="max-width:980px;width:min(96vw,980px);">
  <button class="wdClose" onclick="closeUploadDialog()">✕</button>
  <div class="wdHead">
   <div>
    <h2 id="uploadDialogTitle" style="margin:0;border:none;padding:0">Upload</h2>
   </div>
  </div>
  <div id="uploadDialogBody"></div>
 </div>
</div>

<!-- Admin > User Management: edit-another-account modal (opened from pages/users.php) -->
<div class="wdOverlay" id="userEditOverlay">
 <div class="wdBox" style="max-width:520px;width:92%">
  <button class="wdClose" onclick="closeUserEditModal()">✕</button>
  <h2 style="margin-top:0">Edit User</h2>
  <div style="display:grid;gap:8px">
    <input type="hidden" id="ue-id">
    <label>Username<input id="ue-user" class="wide" type="text" placeholder="username"></label>
    <label>Full name<input id="ue-fullName" class="wide" type="text" placeholder="Full name"></label>
    <label>Email<input id="ue-email" class="wide" type="email" placeholder="Email"></label>
    <label>Phone<input id="ue-phone" class="wide" type="text" placeholder="Phone"></label>
    <label>Position<input id="ue-position" class="wide" type="text" placeholder="Position / Title"></label>
    <!-- Options are filled in from the shared ROLE_CATALOG in assets/js/roles.js. -->
    <label>Role<select id="ue-role"></select></label>
    <div style="display:flex;gap:8px;align-items:center">
      <input id="ue-newPass" type="password" placeholder="Reset password (leave blank to keep current)" style="flex:1">
      <button class="act suggest" type="button" onclick="generatePasswordSuggestion('ue-newPass')">Suggest</button>
    </div>
    <div class="authErr" id="ue-err"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
      <button class="act danger" onclick="deleteUserAccount()">Delete Account</button>
      <div style="display:flex;gap:8px">
        <button class="act secondary" onclick="closeUserEditModal()">Cancel</button>
        <button class="act save" onclick="saveUserEdit()">Save Changes</button>
      </div>
    </div>
  </div>
 </div>
</div>

