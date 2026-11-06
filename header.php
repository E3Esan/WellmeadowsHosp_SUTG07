<?php // Top header bar (logo, nav toggle, theme toggle, profile button) ?>
<!-- Literally header on every page -->
<header>
  <div style="display:flex;align-items:center;gap:10px;">
    <button id="navToggleBtn" aria-label="Open navigation menu" onclick="toggleNav()" style="margin-right:20px;">☰</button>
    <div class="headerBrand">
      <div class="headerBadge" aria-label="Wellmeadows Hospital logo"></div>
	<div class="headerText" onclick="show('dashboard')" style="cursor:pointer;" role="button" aria-label="Go to dashboard" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){show('dashboard');}"> 
        <h1>Wellmeadows Hospital</h1>
        <span>Edinburgh • Elderly Care • Management System</span>
      </div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;">
    <button class="themeToggle" type="button" onclick="toggleTheme()" id="themeToggleBtn">Dark</button>
    <button id="authBtn" onclick="openUserProfile()">
      <span class="authAvatar" id="authBtnAvatar">👤</span>
      <span id="authBtnUser">User</span>
	</button>
	<button class="themeToggle" type="button" onclick="logout()" id="logoutBtn">Logout</button>
  </div>
</header>
