<?php // Login/Register overlay, shown when no active session ?>
<div id="authOverlay">
 <div class="authBrand" aria-hidden="true">
  <div class="authBadge"></div>
  <div class="authBrandText">Wellmeadow's Hospital</div>
 </div>
 <div class="authBox" id="loginBox">
  <h2>🏥 Staff Login</h2>

  <input
    id="li-user"
    placeholder="Username"
  >
  <input
    id="li-pass"
    type="password"
    placeholder="Password"
  >
  <div class="authErr" id="li-err"></div>
  <button class="act" onclick="doLogin()">Login</button>
  <div class="authSwitch">No account?
    <a onclick="toggleAuth('register')">Register</a></div>
  <div class="authFooter" onclick="openFooterModal()">Made by <span class="brandLink">Birth But With Me</span></div>
 </div>

<!-- Register page-->
 <div class="authBox" id="registerBox" style="display:none">
  <h2>Create Account</h2>
  <input id="rg-user" placeholder="Username">
  <input id="rg-full-name" placeholder="Full name">
  <input id="rg-email" type="email" placeholder="Email address">
  <input id="rg-phone" placeholder="Phone number">
  <input id="rg-pass" type="password" placeholder="Password">
  <!-- Options are filled in from the shared ROLE_CATALOG in assets/js/roles.js
       so the register form and the profile "Role" select never drift apart. -->
  <select id="rg-role" style="width:100%;padding:9px;margin:6px 0;border:1px solid var(--bd);border-radius:6px;font-size:13px"></select>

  <div class="authErr" id="rg-err"></div>
  <button class="act" onclick="doRegister()">Register</button>
  <div class="authSwitch">Have an account? <a onclick="toggleAuth('login')">Login</a></div>
  <div class="authFooter" onclick="openFooterModal()">Made by <span class="brandLink">Birth But With Me</span></div>
 </div>
</div>

