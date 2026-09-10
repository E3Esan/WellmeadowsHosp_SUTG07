# Wellmeadows Hospital — Administrator System
# Developed by Birth But WIth Me team from Suranaree University of Technology

A PHP + MySQL hospital administration system covering wards, staff, patients,
outpatients, appointments, medication, supplies, pharmaceuticals,
requisitions, suppliers, staff leave requests, a bed queue / admissions
monitor, a report hub, and a live analytics dashboard.

## What's new in this update

The previous version was a **structural split only** — all data lived in
`localStorage`/`sessionStorage` in the browser, nothing touched a real
database. This update makes it a real PHP + MySQL application:

- **Real database** — `sql/schema.sql` creates every table (`ward`, `staff`,
  `patient`, `outpatient`, `appointment`, `medication`, `supply`, `pharma`,
  `requisition`, `supplier`, `bedQueue`, `leave_request`, `users`) with the
  same fields the app already used, plus seed data matching the old
  prototype.
- **PHP + MySQL backend** (`api/`):
  - `db.php` — PDO connection
  - `auth.php` — login / register / logout / session / profile / password,
    with hashed passwords
  - `table.php` — generic CRUD for every table, with a column whitelist so
    nothing outside the schema can be read or written
  - `status.php` — live connection + row-count check, shown on the Settings
    page
- Every add/edit/delete now **persists to MySQL** — `crud.js`,
  `beds-queue.js`, and the requisition/leave approve-reject buttons all call
  the API instead of mutating a local array. Reads (`GET`) are open;
  writes (`POST`/`PUT`/`DELETE`) require a logged-in session.
- **Real login** — bcrypt-hashed passwords via PHP's `password_hash()` /
  `password_verify()`, PHP sessions instead of a plaintext user list in
  `localStorage`.
- **Improved Profile page** — profile edits, avatar, and password changes
  are now saved to the `users` table, not just the browser tab.
- **New Settings page** — theme, table density, default landing page, and a
  live "System Status" panel that proves the DB connection is working and
  shows row counts per table.
- **Real charts on the dashboard**
  (`assets/js/dashboard-charts.js`, using Chart.js from a CDN) — bed
  occupancy, patients by status, staff by position, ward occupancy, stock
  vs. reorder level, requisitions by status. (The dashboard previously had
  zero charts — `charts.js`'s SVG generators were only ever used inside
  printed reports.)
- **New page: Staff Leave Requests** (`pages/leave.php`) — a Personnel
  Officer use case (request/approve/reject staff leave), built on the same
  generic schema/table/form system as every other page, so it required no
  new UI code beyond the page markup itself.
- **Toast notifications** (`showToast()` in `utils.js`) for save/delete/login
  feedback, plus a confirmation prompt before deleting a record (previously
  delete had no confirmation at all).

Every existing id, class, and function name was kept exactly the same, so
nothing else in the app (reports, printing, the bed queue, detail modals,
the dashboard slideshow) needed to change.

## Setup

1. **Import the database.** Open phpMyAdmin, go to **Import**, choose
   `sql/schema.sql`, click **Go**. This creates the `wellmeadows` database,
   every table, and seed data — no need to create anything by hand first.
2. **Check the DB credentials.** Open `api/db.php` — the defaults
   (`localhost` / `wellmeadows` / user `root` / no password) match a
   default XAMPP or Laragon install. Edit the four variables at the top if
   your setup differs.
3. **Serve the app through PHP** — it won't work opened as a plain file; it
   needs Apache/PHP, or `php -S localhost:8000` from this folder.
4. **Log in.** Two seeded accounts:
   - `admin` / `admin123` (Administrator)
   - `Moiralnwza67` / `ILoveMyDog` (Charge Nurse)

   Or register a new account from the login screen.

## Notes / things worth knowing

- **Reads are public, writes require login.** `GET` requests to
  `api/table.php` don't check for a session (so dashboards/reports can be
  viewed freely); `POST`/`PUT`/`DELETE` require being logged in.
- **No per-role permission system** (e.g. a Nurse can edit Supplier
  records) — worth adding before this ever holds real patient data.
- **File/photo fields are stored as base64** in the database (`LONGTEXT`
  columns), matching how the original prototype stored them in
  `localStorage`. Fine for a class project; for anything real, store files
  on disk (or object storage) and keep only a path in the database.
- **Chart.js loads from a CDN** (`cdnjs.cloudflare.com`) in `index.php`. If
  you need this to work fully offline, download `chart.umd.min.js` into
  `assets/js/` and change the `<script src>` to point at it locally.
- **Most date/time inputs are plain text fields**, not
  `<input type="date">` — this matches the original prototype's forms.
  MySQL's `DATE`/`TIME` columns expect `YYYY-MM-DD` / `HH:MM`; typing a
  different format will fail to save. Switching those inputs to proper
  date/time pickers would be a good follow-up improvement.
- **Image assets:** `assets/js/dashboard-slideshow.js` references image
  paths like `commerical_ai_pics/2d5fff2f-....png`. Put your
  `commerical_ai_pics/` folder at the project root (same level as
  `index.php`), or move it into `assets/images/` and update the paths.
- **Script load order matters** — later files depend on earlier ones being
  loaded first (e.g. `data.js` defines `SCHEMA`/`apiGet`/`loadAll`, which
  almost everything else needs; `app-init.js` must load last since it
  actually starts the app). `index.php` already loads them in the right
  order — don't reorder the `<script src>` tags without checking.

## Possible next steps

- Per-role permissions (e.g. only Personnel Officers can approve leave,
  only Pharmacists can edit pharma).
- Proper `<input type="date">` / `<input type="time">` on every relevant
  field instead of plain text.
- Store uploaded files on disk instead of as base64 in the database.
- An "Applicants" page (job applicant tracking) — the other Personnel
  Officer use case mentioned in the original project brief, not yet built.
