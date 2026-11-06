<?php
/**
 * Wellmeadows Hospital Administrator System
 * Entry point — assembles header, nav, all page sections, modals, and scripts.
 * Data lives in SQL Server and is reached through the JSON API in api/
 * (assets/js/data.js loads it into the in-memory DB object). See README.md.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wellmeadows Hospital Administrator System</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="assets/css/style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/apexcharts/3.45.2/apexcharts.min.js" onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/apexcharts@3.45.2/dist/apexcharts.min.js';"></script>
</head>
<body>

<?php include 'includes/auth-modal.php'; ?>

<?php include 'includes/header.php'; ?>

<?php include 'includes/nav.php'; ?>

<main>

  <?php include 'pages/dashboard.php'; ?>
  <?php include 'pages/beds.php'; ?>
  <?php include 'pages/wards.php'; ?>
  <?php include 'pages/staff.php'; ?>
  <?php include 'pages/patients.php'; ?>
  <?php include 'pages/outpatients.php'; ?>
  <?php include 'pages/appointments.php'; ?>
  <?php include 'pages/medication.php'; ?>
  <?php include 'pages/supplies.php'; ?>
  <?php include 'pages/pharma.php'; ?>
  <?php include 'pages/requisitions.php'; ?>
  <?php include 'pages/suppliers.php'; ?>
  <?php include 'pages/leave.php'; ?>
  <?php include 'pages/reports.php'; ?>
  <?php include 'pages/profile.php'; ?>
  <?php include 'pages/settings.php'; ?>
  <?php include 'pages/users.php'; ?>

  <div id="printBtn"><button class="printBtn" onclick="printPDF()"> Print Data</button></div>

</main>

<div class="pageFooter" onclick="openFooterModal()">Made by <span class="brandLink">Birth But With Me</span></div>

<?php include 'includes/detail-modals.php'; ?>

<!-- Scripts must load in this order: later files reference functions/
     consts defined in earlier ones (SCHEMA/DB from data.js, PAGES from
     nav.js, etc.) -->
<script src="assets/js/data.js"></script>
<script src="assets/js/dashboard-reports.js"></script>
<script src="assets/js/print-options.js"></script>
<script src="assets/js/charts.js"></script>
<script src="assets/js/dashboard-charts.js"></script>
<script src="assets/js/utils.js"></script>
<script src="assets/js/roles.js"></script>
<script src="assets/js/permissions.js"></script>
<script src="assets/js/nav.js"></script>
<script src="assets/js/report-explanations.js"></script>
<script src="assets/js/reports-hub.js"></script>
<script src="assets/js/forms.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/render-table.js"></script>
<script src="assets/js/dashboard-render.js"></script>
<script src="assets/js/dashboard-slideshow.js"></script>
<script src="assets/js/detail-views.js"></script>
<script src="assets/js/beds-queue.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/profile.js"></script>
<script src="assets/js/admin-users.js"></script>
<script src="assets/js/settings.js"></script>
<script src="assets/js/login.js"></script>
<script src="assets/js/app-init.js"></script>
</body>
</html>
