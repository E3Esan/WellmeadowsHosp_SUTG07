<?php
// ============================================================
// SQL Server connection settings — the ONLY file you should need to edit
// when moving this project to another machine.
//
// Typical setups:
//   SQL Server Express (default install)  DB_SERVER = 'localhost\SQLEXPRESS'
//   SQL Server Developer / full default   DB_SERVER = 'localhost'
//   Docker / remote with a port           DB_SERVER = 'localhost,1433'
//
// Authentication:
//   'windows' -> Windows Authentication (Express default; sa is DISABLED
//                after a Basic install). The login used is the Windows
//                account Apache runs under. Laragon runs Apache as you,
//                so this "just works". XAMPP-as-a-service runs as SYSTEM
//                and will be refused -> use 'sql' there.
//   'sql'     -> SQL Server login (e.g. sa). Requires "SQL Server and
//                Windows Authentication mode" enabled on the instance.
// ============================================================

const DB_SERVER   = 'localhost\MSSQLSERVER01';   // this project's instance (Express default: localhost\SQLEXPRESS)
const DB_NAME     = 'wellmeadows';
const DB_AUTH     = 'windows';          // 'windows' | 'sql'
const DB_USER     = 'sa';               // used only when DB_AUTH = 'sql'
const DB_PASS     = '';                 // used only when DB_AUTH = 'sql'

// ODBC Driver 18 encrypts by default, and a local Express install only has
// a self-signed certificate -> without this the connection is refused with
// "The certificate chain was issued by an authority that is not trusted".
// Fine for a local/lab machine; set to false on a server with a real cert.
const DB_TRUST_SERVER_CERT = true;

// Timestamps sent by the browser are UTC ISO strings (toISOString()).
// They are converted to this time zone before being stored in DATETIME2.
const APP_TIMEZONE = 'Asia/Bangkok';

// true  -> API error responses include the raw SQL Server message (lab use)
// false -> generic message only (use this for anything public)
const APP_DEBUG = true;
