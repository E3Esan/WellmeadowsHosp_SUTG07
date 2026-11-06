/* pdf printing function */
function printPDF() {
  const activePage = document.querySelector('.page.active') || document.getElementById('dashboard');
  const title = (activePage && activePage.querySelector('h2')) ? activePage.querySelector('h2').textContent : 'Hospital Report';
  const clone = activePage.cloneNode(true);

  /* this line is for removing unwanted elements from the print view */
  clone.querySelectorAll('button, input, select, .search, .searchWrap, .searchType, .grid2, #printBtn, #nothingBtn, nav, header, #authOverlay, #loginBox, #registerBox, canvas').forEach(node => node.remove());

  /* this line is for adding a title to the print view */
  const printWindow = window.open('', '_blank', 'width=980,height=700');
  printWindow.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page { margin: 14mm; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 24px;
            color: #22303f;
            background: #fff;
            color-scheme: light;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          h1, h2 {
            color: #33507a;
          }
          h2 {
            border-bottom: 2px solid #d3ddec;
            padding-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            background: #fff;
          }
          th, td {
            border: 1px solid #d3ddec;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #eef2f8;
            color: #33507a;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 18px;
          }
          .card {
            border: 1px solid #d3ddec;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .card b {
            display: block;
            color: #33507a;
            font-size: 28px;
          }
          .card span {
            color: #678;
            font-size: 12px;
          }
          .staffWidget {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          }
          .staffCard {
            border: 1px solid #d3ddec;
            border-radius: 8px;
            padding: 8px;
            background: #fff;
          }
          .wardbox {
            border: 1px solid #d3ddec;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            background: #fff;
          }
          .tag {
            display: inline-block;
            background: #eef2f8;
            color: #33507a;
            border-radius: 12px;
            padding: 3px 8px;
            font-size: 11px;
          }
          .free { color: #2e8b57; font-weight: 600; }
          .full { color: #c0392b; font-weight: 600; }
          .report-guide { margin: 12px 0 18px; padding: 12px 14px; border: 1px solid #c9dbee; border-left: 5px solid #2b7bd3; border-radius: 8px; background: linear-gradient(135deg,#f8fbff,#eef6ff); }
          .report-guide strong { color: #33507a; }
          .report-guide p { margin: 5px 0 0; font-size: 12px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="report-guide"><strong>How to read this page</strong><p>This PDF is a printable snapshot of the selected page. It contains the visible records and status information available when the report was generated.</p></div>
        ${clone.innerHTML}
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// ===== App startup =====
// 1. Ask the server who's logged in (also hides/shows the login overlay).
// 2. Load every table from the API into DB.
// 3. Render everything now that DB is actually populated.
// 4. Show the landing page (the user's saved preference, or Dashboard).
async function initApp() {
  const savedDensity = localStorage.getItem('wmDensity');
  if (savedDensity) document.body.classList.toggle('density-compact', savedDensity === 'compact');

  const overlay = document.getElementById('authOverlay');
  const user = await checkSession();

  if (user) {
    if (overlay) overlay.style.display = 'none';
    setTheme((user.theme || localStorage.getItem('wmTheme') || 'light') === 'dark');
    if (user.density) document.body.classList.toggle('density-compact', user.density === 'compact');
  } else {
    if (overlay) { overlay.style.display = 'flex'; toggleAuth('login'); }
    setTheme((localStorage.getItem('wmTheme') || 'light') === 'dark');
  }

  applyNavPermissions();

  await loadAll();

  Object.keys(SCHEMA).forEach(key => render(key));
  Object.keys(SCHEMA).forEach(key => {
    const table = document.getElementById('t-' + key);
    if (table) setupTableWindow(table);
  });
  const wardOverview = document.getElementById('wardOverview');
  if (wardOverview) setupTableWindow(wardOverview);

  let landing = (user && user.landingPage) || localStorage.getItem('wmLandingPage') || 'dashboard';
  if (!PAGES.some(p => p[0] === landing) || !canAccessPage(landing)) landing = 'dashboard';
  show(landing);
}

initApp();
