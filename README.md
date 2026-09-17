# Wellmeadows Hospital — Administrator System (G07)

A web-based hospital administration system based on the Wellmeadows Hospital
case study (Connolly & Begg, *Database Systems*). It manages wards, staff,
patients, outpatients, appointments, medication, supplies,
pharmaceuticals, requisitions, suppliers, staff leave, a bed monitor with an
admission queue, a report hub, and a live analytics dashboard.

**Stack:** PHP 8.3 · Microsoft SQL Server (T-SQL) · vanilla JavaScript ·
ApexCharts · served by Laragon (Apache).

> The database was migrated from **MySQL / phpMyAdmin** to **Microsoft SQL
> Server**. The full technical record — every defect found, why each fix
> was made, and how it was verified — is in `MIGRATION-REPORT-G07.md`.

---

## Contents

1. [Features](#1-features)
2. [Project structure](#2-project-structure)
3. [Reference environment](#3-reference-environment)
4. [Installation (from zero)](#4-installation-from-zero)
5. [Configuration](#5-configuration)
6. [Login accounts and roles](#6-login-accounts-and-roles)
7. [Database](#7-database)
8. [API reference](#8-api-reference)
9. [Command-line tools](#9-command-line-tools)
10. [Testing checklist](#10-testing-checklist)
11. [Troubleshooting](#11-troubleshooting)
12. [Security notes and known issues](#12-security-notes-and-known-issues)
13. [Maintenance](#13-maintenance)

---

## 1. Features

| Page | What it does |
|---|---|
| Dashboard | Summary cards, ApexCharts charts (bed occupancy, patients by status, staff by position, ward occupancy, stock vs reorder level, requisitions), staff board, slideshow |
| Bed Monitor | Bed grid per ward, waiting-list queue, admit / move / discharge |
| Wards, Staff, Patients, Outpatients, Appointments, Medication | Add / edit / delete / search, detail views, file attachments |
| Supplies, Pharmaceuticals, Suppliers, Requisitions | Stock, reorder levels, tax/total calculation, requisition approval |
| Leave Requests | Staff leave request / approve / reject |
| Report Hub | Printable reports with charts and explanations |
| User Management | Admin-only: edit accounts, change roles, reset passwords, delete accounts |
| Profile | Own name, contact details, avatar, password |
| Settings | Theme, table density, landing page, live **System Status** (DB connection, server version, row counts) |

Other behaviour:
- Passwords are bcrypt-hashed (`password_hash()` / `password_verify()`); logins use PHP sessions.
- Reading data is open; adding, editing and deleting require a logged-in session.
- Approving requisitions and leave is limited to Admin, Charge Nurse and Medical Director (checked in the UI **and** in the API).
- Save/delete feedback is shown as toast messages; deletes ask for confirmation.

---

## 2. Project structure

```
WellmeadowsHosp/
├── index.php                   Entry point: header, nav, pages, modals, scripts
├── README.md                   This file
├── MIGRATION-REPORT-G07.md     MySQL → SQL Server migration report
│
├── api/                        JSON backend (PHP + pdo_sqlsrv)
│   ├── config.php              ★ connection settings — the only file you edit
│   ├── sqlsrv_helpers.php      connection, type conversion, error messages
│   ├── db.php                  bootstrap: connect, JSON errors, session, permissions
│   ├── table.php               generic CRUD for all data tables (column whitelist)
│   ├── auth.php                login, register, logout, session, profile, password
│   ├── users.php               admin-only user management
│   └── status.php              connection + row counts for Settings page
│
├── sql/
│   ├── DatabaseG07.sql         creates database, 13 tables, seed data (RESETS data)
│   ├── add_role_accounts.sql   upgrade: add role accounts to an existing DB
│   ├── add_staff_board_positions.sql  upgrade: staff.boardX / boardY
│   └── add_bed_monitor_wards.sql      upgrade: wards 1–10 for the bed monitor
│
├── tools/                      command-line only (blocked from the browser)
│   ├── check_env.php           step-by-step environment check
│   ├── migrate_mysql_to_mssql.php   copy live data from MySQL
│   └── verify_migration.php    prove the data and its format are correct
│
├── includes/                   header, nav, login modal, detail modals
├── pages/                      one PHP file per page section
├── assets/
│   ├── css/style.css
│   └── js/                     front end (see load order below)
└── commerical_ai_pics/         images for the dashboard slideshow
```

**Script load order matters.** `index.php` loads `data.js` first (it defines
`SCHEMA`, `DB`, `apiGet`, `loadAll`) and `app-init.js` last (it starts the
app). Do not reorder the `<script>` tags.

The front end never contains SQL; it only talks to `api/` over JSON. That is
why the database migration required no JavaScript logic changes.

---

## 3. Reference environment

This is the setup the project was installed and verified on
(`tools/check_env.php` → *All checks passed*):

| Component | Version / value |
|---|---|
| OS | Windows 11 (Thai locale, th-TH) |
| Web server | Laragon at `E:\laragon` (Apache) |
| Project folder | `E:\laragon\www\WellmeadowsHosp` |
| URL | `http://localhost/WellmeadowsHosp/` |
| PHP | 8.3.33, x64, Thread Safe — `E:\laragon\bin\php\php-8.3.33-Win32-vs16-x64` |
| PHP SQL Server driver | Microsoft Drivers **5.13.3** — `php_sqlsrv_83_ts_x64.dll`, `php_pdo_sqlsrv_83_ts_x64.dll` |
| ODBC | Microsoft ODBC Driver 18 for SQL Server |
| SQL Server | **SQL Server 2025 Enterprise Evaluation** 17.0.1000.7 |
| Instance | `localhost\MSSQLSERVER01` |
| Authentication | Windows Authentication (`NTPLAPTOP-02\Lennvo`) |
| Database | `wellmeadows`, collation `Latin1_General_100_CI_AI_SC` |
| Management tool | SSMS |

Other versions work too: SQL Server 2016 or newer (Express, Developer,
Evaluation), PHP 8.1+. Driver choice: **PHP 8.1/8.2 → driver 5.12**,
**PHP 8.3/8.4/8.5 → driver 5.13.x**. The build must match PHP exactly
(version, x64, TS/NTS).

---

## 4. Installation (from zero)

Run PowerShell **as Administrator** for steps 1–2.

### Step 1 — SQL Server

Download SQL Server 2025 (Express, Developer or Evaluation) from Microsoft and
**run the installer by double-clicking it**, choosing *Basic*.

> On a Thai-language Windows, `winget install` fails with **exit code 1009**
> because the installer asks *"Continue in English?"* and nobody can answer.
> Run it manually and answer **Y**. If it still fails, set
> *Settings → Time & language → Regional format* to English (United States)
> for the install, then switch back.

Write down the **instance name** shown at the end (here: `MSSQLSERVER01`;
Express usually uses `SQLEXPRESS`). Click **Install SSMS**.

### Step 2 — ODBC driver
```powershell
winget install --id Microsoft.msodbcsql.18 --accept-package-agreements --accept-source-agreements
```

### Step 3 — Put the project in Laragon
Copy the `WellmeadowsHosp` folder into Laragon's `www` folder
(Laragon → **Menu → www** shows which one Laragon uses — here `E:\laragon\www`).

### Step 4 — Create the database (SSMS)
1. Connect: Server `localhost\MSSQLSERVER01`, *Windows Authentication*,
   ☑ **Trust Server Certificate**.
2. **File → Open → File…** → `sql\DatabaseG07.sql` → **F5**.
3. The last result grid must show **13 rows, all `OK`** (57 rows in total).

Command-line alternative (run from the project folder, not `system32`):
```powershell
cd E:\laragon\www\WellmeadowsHosp
sqlcmd -S "localhost\MSSQLSERVER01" -E -C -i sql\DatabaseG07.sql
```

### Step 5 — PHP driver
`php` is not on the system PATH, so use the full path (or Laragon's own
**Terminal** button). Define it once per PowerShell window:
```powershell
cd E:\laragon\www\WellmeadowsHosp
$php = "E:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe"
& $php tools/check_env.php
```
Step [1] prints the exact DLL names you need. To download and install them:
```powershell
$rel  = Invoke-RestMethod "https://api.github.com/repos/microsoft/msphpsql/releases/latest"
$dest = "$env:USERPROFILE\Downloads\msphpsql"
New-Item -ItemType Directory -Force $dest | Out-Null
foreach ($a in $rel.assets | Where-Object { $_.name -like "Windows*" }) {
    $zip = Join-Path $dest $a.name
    Invoke-WebRequest $a.browser_download_url -OutFile $zip
    Expand-Archive $zip -DestinationPath (Join-Path $dest $a.BaseName) -Force
}
$ext = "E:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\ext\"
Get-ChildItem $dest -Recurse -Filter "*sqlsrv*83*.dll" |
    Where-Object { $_.Name -notlike "*nts*" -and $_.FullName -like "*x64*" } |
    Copy-Item -Destination $ext
```
Enable them in `php.ini` (a backup is made first):
```powershell
$ini = "E:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.ini"
Copy-Item $ini "$ini.bak-sqlsrv"
Add-Content -Path $ini -Encoding ASCII -Value "`r`nextension=php_sqlsrv_83_ts_x64.dll`r`nextension=php_pdo_sqlsrv_83_ts_x64.dll"
& $php -m | Select-String sqlsrv      # must print pdo_sqlsrv and sqlsrv
```

### Step 6 — Check everything
```powershell
& $php tools/check_env.php
```
Must end with **All checks passed.**

### Step 7 — Restart Apache
Laragon → **Stop** → **Start All**. The command line reads `php.ini`
immediately, but **Apache only reads it when it starts**. If the website
still says *"The pdo_sqlsrv PHP extension is not loaded"*, see
[Troubleshooting](#11-troubleshooting).

### Step 8 — (Optional) Copy existing MySQL data
Only needed if records were entered while the app ran on phpMyAdmin.
Keep MySQL running in Laragon.
```powershell
& $php tools/migrate_mysql_to_mssql.php          # preview only — read it
& $php tools/migrate_mysql_to_mssql.php --run    # replaces SQL Server data
& $php tools/verify_migration.php --write-test
```

### Step 9 — Open the app
`http://localhost/WellmeadowsHosp/` → log in → **Settings → System Status**
should say *Connected to SQL Server database wellmeadows on Enterprise
Evaluation Edition …*.

---

## 5. Configuration

All connection settings are in **`api/config.php`**:

| Constant | Value here | Notes |
|---|---|---|
| `DB_SERVER` | `localhost\MSSQLSERVER01` | Express: `localhost\SQLEXPRESS`; default instance: `localhost`; with port: `localhost,1433` |
| `DB_NAME` | `wellmeadows` | Created by `DatabaseG07.sql` |
| `DB_AUTH` | `windows` | `windows` = Windows Authentication (Laragon runs Apache as your user). `sql` = SQL login |
| `DB_USER` / `DB_PASS` | `sa` / empty | Used only when `DB_AUTH = 'sql'` |
| `DB_TRUST_SERVER_CERT` | `true` | Required for a local install (self-signed certificate + ODBC 18) |
| `APP_TIMEZONE` | `Asia/Bangkok` | Browser UTC timestamps are stored in this time zone |
| `APP_DEBUG` | `true` | Adds the raw SQL Server message to API errors. Set `false` for anything public |

MySQL source settings for the migration tools are the `MY_*` constants at the
top of `tools/migrate_mysql_to_mssql.php` and `tools/verify_migration.php`
(defaults: `127.0.0.1:3306`, database `wellmeadows`, user `root`, no password).

---

## 6. Login accounts and roles

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `Moiralnwza67` | `ILoveMyDog` | Charge Nurse |
| `staff01` | `Staff@2026` | Staff |
| `nurse01` | `Nurse@2026` | Charge Nurse |
| `director01` | `Director@2026` | Medical Director |

Change the admin password before any demo on a shared network
(`check_env.php` warns until you do).

**Page access** (`assets/js/permissions.js`):

| Role | Pages |
|---|---|
| Everyone logged in | Dashboard, Bed Monitor, Staff, Outpatients, Appointments, Settings, Profile |
| Staff | + Medication, Patients, Wards, Reports, Leave, Requisitions, Supplies |
| Charge Nurse | + everything Staff has, Pharmaceuticals |
| Medical Director | + everything Charge Nurse has, Suppliers |
| Admin | All pages, including User Management |

Approve/reject (requisitions, leave): Admin, Charge Nurse, Medical Director.

---

## 7. Database

13 tables, no foreign keys (the app keeps references itself). Every table has
`id INT IDENTITY` as its primary key.

| Table | API key | Seed rows | Holds |
|---|---|---|---|
| `users` | (auth/users API) | 5 | Accounts, bcrypt hash, profile, UI settings |
| `ward` | `ward` | 12 | Ward number, name, location, beds, extension |
| `staff` | `staff` | 6 | Staff details, salary, qualifications, board position |
| `patient` | `patient` | 6 | In-patients, next of kin, ward/bed, dates, status |
| `outpatient` | `outpatient` | 0 | Outpatients and appointment date/time |
| `appointment` | `appointment` | 2 | Consultant appointments, fee, tax, payment |
| `medication` | `medication` | 3 | Drugs given to patients |
| `supply` | `supply` | 4 | Surgical/non-surgical stock |
| `pharma` | `pharma` | 13 | Pharmaceutical stock and drug information |
| `requisition` | `requisition` | 1 | Ward requisitions and approval |
| `supplier` | `supplier` | 2 | Suppliers |
| `bedQueue` | `bedQueue` | 1 | Bed waiting-list queue |
| `leave_request` | `leave` | 2 | Staff leave (`LEAVE` is a reserved word) |

**Type rules** (why the schema looks the way it does):

| Data | SQL Server type | Reason |
|---|---|---|
| Normal text | `NVARCHAR` | Thai and other Unicode text |
| Base64 files, photos, avatars, password hash | `VARCHAR(MAX)` / `VARCHAR(255)` | ASCII only, half the storage |
| Time | `TIME(0)` | PHP receives `09:30:00`, not `09:30:00.0000000` |
| Timestamp | `DATETIME2(0)` | PHP receives `2026-09-16 09:35:00` |
| Money | `DECIMAL(10,2)` | Exact values |
| `staff.staffNo` | filtered unique index | Allows many NULLs, like MySQL |
| Reserved words | `[user]`, `[file]`, `[desc]`, `[date]`, `[time]`, `[start]`, `[number]`, `[type]` | Must be bracket-quoted |

**Running `DatabaseG07.sql` again deletes all data** and restores the seed
data. To change an existing database without losing data, use the
`sql/add_*.sql` scripts; each is safe to run more than once.

---

## 8. API reference

All endpoints return JSON. Errors look like `{"error": "...", "detail": "..."}`
(`detail` only when `APP_DEBUG` is on).

### `api/table.php` — data tables
Allowed `table` keys: `ward, staff, patient, outpatient, appointment,
medication, supply, pharma, requisition, supplier, bedQueue, leave`.

| Request | Login | Result |
|---|---|---|
| `GET ?table=ward` | no | All rows |
| `GET ?table=ward&q=text` | no | Rows where any column contains the text |
| `POST ?table=ward` + JSON | yes | Inserts, returns the new row (201) |
| `PUT ?table=ward&id=5` + JSON | yes | Updates, returns the row (404 if missing) |
| `DELETE ?table=ward&id=5` | yes | `{"ok": true}` |

Only whitelisted columns are read or written. Values are converted to the
column's type before saving. Accepted formats: dates `YYYY-MM-DD` or
`DD/MM/YYYY`; times `HH:MM`, `HH:MM:SS`, `2:15 pm`; browser ISO timestamps.
Anything else returns 400 with the field name. Changing `status` on
`requisition` / `leave` requires an approver role (403 otherwise).

### `api/auth.php`
| Request | Body |
|---|---|
| `GET ?action=session` | — |
| `POST ?action=login` | `user, pass` |
| `POST ?action=register` | `user, pass, role, fullName, email, phone` |
| `POST ?action=logout` | — |
| `POST ?action=update_profile` | any of `user, fullName, email, phone, position, info, avatar, theme, density, landingPage` (not `role`) |
| `POST ?action=change_password` | `currentPass, newPass` (min 6 characters) |

### `api/users.php` — Admin only
| Request | Result |
|---|---|
| `GET` | All accounts (no password hashes) |
| `PUT ?id=5` | Update `user, fullName, email, phone, position, role`, optional `newPass` |
| `DELETE ?id=5` | Delete (not yourself, not the last admin) |

### `api/status.php`
Connection status, database name, server version, collation, PHP version and
row counts per table. Used by **Settings → System Status**.

---

## 9. Command-line tools

Run from the project folder with Laragon's PHP (`$php` from Step 5). They
refuse to run from a browser.

| Command | Purpose |
|---|---|
| `& $php tools/check_env.php` | Checks PHP build, driver, ODBC, connection, data-type handling, Unicode, database, tables, accounts. Stops at the first problem and says how to fix it |
| `& $php tools/migrate_mysql_to_mssql.php` | Preview of copying MySQL data (lists columns that exist only in MySQL) |
| `& $php tools/migrate_mysql_to_mssql.php --run` | Copies all rows, keeping original ids. Each table is one transaction. MySQL is only read |
| `& $php tools/migrate_mysql_to_mssql.php --run --force` | Copies even when some MySQL columns have no target (that data is dropped) |
| `& $php tools/verify_migration.php` | Compares MySQL vs SQL Server: row counts, every value, Unicode rows, and the data format PHP receives |
| `& $php tools/verify_migration.php --write-test` | Also re-saves every row through the API's conversion code, compares, then **rolls back** |

If MySQL is not running, `verify_migration.php` skips the comparison and
still checks the data format and the write path.

---

## 10. Testing checklist

| # | Test | Expected |
|---|---|---|
| 1 | Settings → System Status | Connected, server version, 13 tables with counts |
| 2 | Log in as each of the 5 accounts | Menu shows only that role's pages |
| 3 | User Management → **Edit** (admin) | Edit form opens |
| 4 | Supplies page | Costs show `0.15`, `0.80` (not `.15`) |
| 5 | Add a patient with a Thai name, refresh | Name displays correctly |
| 6 | Add an appointment at `09:30` | Saved, shows `09:30:00` |
| 7 | Type `abc` into a number field and save | Toast: *"… must be a whole number"* |
| 8 | Approve a requisition as `staff01` | Denied |
| 9 | Approve a requisition as `nurse01` | Status changes |
| 10 | Bed Monitor: admit a queued patient | Bed assigned, queue updated |
| 11 | Delete a test record | Confirmation, then removed |
| 12 | Report Hub → print a report | Report with charts |
| 13 | `& $php tools/verify_migration.php --write-test` | `RESULT: all checks passed.` |

---

## 11. Troubleshooting

### Installation

| Problem | Fix |
|---|---|
| SQL Server installer: **exit code 1009** | Thai Windows locale. Run the installer manually and answer **Y** to "Continue in English?" (see Step 1) |
| `Cannot find path ... sql\DatabaseG07.sql` | PowerShell is in `C:\WINDOWS\system32`. `cd` to the project folder first, or use the full file path |
| `'php' is not recognized` | Use the full path: `& "E:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe" ...`, or Laragon's Terminal |
| `Illegal characters in path` | A placeholder such as `<extracted folder>` was typed literally; use the real path |
| `cd : Cannot find path 'C:\laragon\www\...'` | Laragon is on another drive. Find the project: `Get-ChildItem -Path C:\,D:\,E:\ -Filter DatabaseG07.sql -Recurse -ErrorAction SilentlyContinue` |
| Several PHP / Laragon copies (D: and E:) | Use the one whose `www` holds the project. Check with `Get-Process laragon, httpd \| Select-Object Name, Path` |

### PHP driver

| Problem | Fix |
|---|---|
| `check_env` [2]: *pdo_sqlsrv is NOT loaded* | 1) DLLs in `ext`? `Get-ChildItem "<php>\ext\*sqlsrv*"` 2) Lines in php.ini? `Select-String -Path "<php>\php.ini" -Pattern sqlsrv` (no output = not saved; a leading `;` = commented out) 3) Build matches PHP (TS/NTS, x64, `83`) |
| `Unable to load dynamic library` | The file name in `php.ini` differs from the file in `ext` |
| Command line passes, **website says the extension is not loaded** | Apache has not reloaded `php.ini`, or uses another PHP. Laragon: **Stop → Start All** (or right-click tray → Exit, reopen). Still failing: see below |
| Find which PHP Apache uses | Create a test page:<br>`Set-Content whichphp.php '<?php echo php_ini_loaded_file(), " -- ", implode(",", PDO::getAvailableDrivers());'`<br>Open `http://localhost/WellmeadowsHosp/whichphp.php`. It must show the E: `php.ini` and include `sqlsrv`. Wrong path → Laragon **Menu → PHP → Version → php-8.3.33**, or start the E: Laragon. **Delete the file afterwards** |

### Connection

| Problem | Fix |
|---|---|
| *certificate chain … not trusted* | `DB_TRUST_SERVER_CERT = true` (SSMS: tick *Trust Server Certificate*) |
| *Cannot reach SQL Server* / network-related error | `services.msc`: **SQL Server (MSSQLSERVER01)** running; **SQL Server Browser** running (named instances need it); `DB_SERVER` correct |
| *ODBC Driver … install* | Install ODBC Driver 18 (Step 2) |
| *Login failed for user 'NT AUTHORITY\SYSTEM'* | Apache runs as a service. Use `DB_AUTH = 'sql'` or add that login in SSMS |
| *Login failed for user 'sa'* | Enable mixed-mode authentication and the `sa` login in SSMS, restart the service |
| *Database "wellmeadows" not found* | Run `sql/DatabaseG07.sql`, or `DB_SERVER` points at another instance |

### Application

| Problem | Fix |
|---|---|
| *A table is missing* / *A column is missing* | Run `DatabaseG07.sql` or the matching `sql/add_*.sql` |
| *A value is too long* | Text longer than its column; shorten it or widen the column |
| Times show `.0000000` / Thai shows `?????` | Database was created from an older script. Re-run `DatabaseG07.sql` (then re-run the migration tool if needed) |
| User Management Edit does nothing | Driver type setting missing; `check_env` step [4] must be all OK |
| Dashboard charts missing | ApexCharts loads from a CDN; an internet connection is needed |
| Slideshow images missing | `commerical_ai_pics/` must sit next to `index.php` |
| phpMyAdmin suddenly empty | A moved Laragon folder left `my.ini` pointing at an old data folder; fix `datadir` |

---

## 12. Security notes and known issues

These are intentionally **not** changed yet (outside the migration scope):

1. **Registration accepts any role** — anyone can register as Admin via
   `auth.php?action=register`. Fix this first: force new accounts to a
   non-admin role on the server.
2. **Reads need no login** — patient data is readable with a plain `GET`.
3. **Default passwords** are published above. Change them.
4. **Wards 1–10 cannot be deleted** — `GET table.php?table=ward` re-inserts
   them. Move that seeding into the SQL script only.
5. **Empty text becomes NULL on save** (existing behaviour, reported by
   `--write-test`).
6. **Blank first field** — `crud.js` generates a text id such as `WAR1234`,
   which is rejected for the numeric fields `ward.number` and `pharma.drugNo`.
7. **Files are stored as base64 in the database.** Fine for coursework; for
   real use, store files on disk and keep only the path.
8. For anything public: `APP_DEBUG = false`, `DB_TRUST_SERVER_CERT = false`
   with a real certificate, and remove the `tools/` folder.

---

## 13. Maintenance

- **Evaluation Edition expires 180 days after installation** — the SQL
  Server service will stop starting. Before then, run the SQL Server
  installer → **Maintenance → Edition Upgrade → Developer** (free, no time
  limit, data kept).
- **Backup:** SSMS → right-click `wellmeadows` → *Tasks → Back Up…*, or
  ```powershell
  sqlcmd -S "localhost\MSSQLSERVER01" -E -C -Q "BACKUP DATABASE wellmeadows TO DISK='E:\backup\wellmeadows.bak'"
  ```
- **Reset to seed data:** run `sql/DatabaseG07.sql` again.
- **Moving to another PC:** copy the project, install SQL Server + ODBC +
  the PHP driver matching that PC's PHP, set `DB_SERVER` in
  `api/config.php`, run `tools/check_env.php`.
- **Backups made during setup:** `php.ini.bak-sqlsrv` (in the PHP folder),
  `E:\laragon\www\WellmeadowsHosp_mysql_backup` (earlier project copy).
  The original MySQL database was never modified.
