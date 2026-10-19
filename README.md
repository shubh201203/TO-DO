# Full-Stack Task Manager & Web Hub

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Render](https://img.shields.io/badge/Render-Deployment-46E3B7?logo=render&logoColor=black)](https://render.com/)
[![Tests](https://img.shields.io/badge/Tests-52%20Passing-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org/api/test.html)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)

A production-grade, responsive task management platform and interactive web utility hub engineered with **Node.js**, **Express 5**, a dual-engine persistence layer supporting **PostgreSQL** and **SQLite**, and a modern dark-mode frontend built with vanilla HTML5, CSS3, and JavaScript.

---

## Quick Links

- **GitHub Repository:** [https://github.com/shubh201203/TO-DO](https://github.com/shubh201203/TO-DO)
- **Live Application Demo:** [https://todo-task-manager-786m.onrender.com](https://todo-task-manager-786m.onrender.com) *(Hosted on Render Free Tier; may take 20–40 seconds to wake on initial load)*
- **Health Check Endpoint:** [https://todo-task-manager-786m.onrender.com/health](https://todo-task-manager-786m.onrender.com/health)
- **Deployment Documentation:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)

---

## Table of Contents

- [Overview & Problem Solved](#overview--problem-solved)
- [Feature Highlights](#feature-highlights)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Architecture & Persistence Strategy](#database-architecture--persistence-strategy)
- [REST API Reference](#rest-api-reference)
- [Local Setup & Installation](#local-setup--installation)
- [Environment Variables](#environment-variables)
- [Automated Testing](#automated-testing)
- [Production Deployment (Render & Neon)](#production-deployment-render--neon)
- [Health Monitoring](#health-monitoring)
- [Security Considerations & Verified Limitations](#security-considerations--verified-limitations)
- [Project Directory Structure](#project-directory-structure)
- [Planned Future Enhancements](#planned-future-enhancements)
- [License](#license)

---

## Overview & Problem Solved

Many portfolio task managers face two common architectural limitations:
1. **Client-only storage (`localStorage`):** Confined to a single browser profile, easily wiped when clearing cache, and inaccessible across devices.
2. **Ephemeral cloud container storage:** Free hosting providers (such as Render Free Web Services) use ephemeral container filesystems. Embedded file-based databases like SQLite are completely wiped every time the container sleeps, restarts, or redeploys.

**How This Project Solves It:**
This application implements an **intelligent dual-engine database architecture**:
- **Production Persistence:** Uses managed **PostgreSQL** (via [Neon](https://neon.tech)) over SSL connection pooling. Tasks, completions, and KPI metrics persist indefinitely across cloud container restarts and cold starts at **$0 hosting cost**.
- **Frictionless Local Development:** Operates on an embedded **SQLite** database (`better-sqlite3` in WAL mode) with zero external setup, zero credentials required, and instant boot time.
- **Strict Fail-Fast Protection:** When `DATABASE_URL` is set, the application strictly requires a valid PostgreSQL connection. It **never** silently falls back to ephemeral local storage, protecting production environments against silent data loss.

---

## Feature Highlights

### Core Task Management (`/` and `/todo`)
- **Full CRUD Workflow:** Create tasks with titles, descriptions, priorities, and due dates; edit tasks inline via accessible dialogs; toggle completions with instant status updates; delete tasks with safety confirmation.
- **Real-Time KPI Dashboard:** Live metrics display Total Tasks, In Progress, Completed, and Overdue tasks, recalculated on every database state change.
- **Debounced Search:** Instant title and description search powered by an input debounce timer to minimize unnecessary requests.
- **Multi-Criteria Filtering:** Filter by completion status (`all`, `pending`, `completed`) and priority level (`all`, `low`, `medium`, `high`).
- **Overdue Task Intelligence:** Dynamic calendar comparison flags past-due unfinished tasks with high-visibility badges.
- **Accessible UI/UX:** Clean, modern dark-mode aesthetic with modal dialogs supporting keyboard traps, `Escape` key dismissal, focus restoration, and ARIA labels.

### Preserved Web Utility Tools
- **EMI Loan Calculator (`/emi`):** Calculates monthly loan repayments, total payable amounts, and interest breakdowns with dynamic formula validation.
- **Hotel Bill Generator (`/hotel`):** Generates itemized customer receipts with automated GST computation and print-friendly layouts.
- **Dynamic SPA Case Study (`/q1`):** In-depth technical case study detailing dynamic Single-Page Application deployment strategies.
- **Legacy Assignment Portal (`/hub`):** Preserved navigation hub providing direct access to academic lab exercises.

---

## Screenshots

> [!NOTE]
> Screenshots can be captured and saved in `docs/screenshots/` to display previews directly in this section.
>
> | Dashboard Overview | Task Editing Modal |
> | :---: | :---: |
> | *(Placeholder: Add `docs/screenshots/dashboard.png`)* | *(Placeholder: Add `docs/screenshots/edit-modal.png`)* |
>
> To add screenshots to this repository:
> 1. Create a `docs/screenshots/` directory.
> 2. Capture application screenshots of the dashboard and edit modal.
> 3. Update the image links above with relative paths: `![Dashboard](docs/screenshots/dashboard.png)`.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) | `>= 18.0.0` | Server-side JavaScript execution environment. |
| **Web Framework** | [Express](https://expressjs.com/) | `^5.2.1` | HTTP routing, REST API endpoints, middleware, and static asset delivery. |
| **Production Database** | [PostgreSQL (`pg`)](https://node-postgres.com/) | `^8.13.1` | Production connection pooling, parameterized SQL queries, and SSL communication with Neon. |
| **Development Database** | [SQLite (`better-sqlite3`)](https://github.com/WiseLibs/better-sqlite3) | `^13.0.3` | Zero-configuration local database with Write-Ahead Logging (`WAL` mode). |
| **Frontend Core** | Vanilla HTML5, CSS3, ES6+ JS | Native | Lightweight, dependency-free client with no heavy framework bundle overhead. |
| **Styling & Theme** | CSS Custom Properties | Native | Linear/Raycast-inspired dark interface with Google Font `Outfit`. |
| **Automated Testing** | Node.js Native Test Runner | Native (`node:test`) | Unit and integration test execution with `node:assert/strict`. |
| **Cloud Hosting** | [Render](https://render.com/) | Free Web Service | Automated Git-triggered deployments via `render.yaml` Blueprint. |
| **Cloud Database** | [Neon](https://neon.tech/) | Serverless Postgres | Free-tier managed PostgreSQL instance with connection pooling. |

---

## System Architecture

```text
                                 [ Web Browser Client ]
                    (HTML5 / CSS3 / Vanilla JavaScript / Fetch API)
                                          │
                                          │ HTTPS (Port 443)
                                          ▼
                         [ Render Cloud Infrastructure ]
                           (Reverse Proxy & SSL Offload)
                                          │
                                          ▼
                             [ Express 5 Web Server ]
                                  (server.js)
    ┌─────────────────────────────────────┴─────────────────────────────────────┐
    │                                                                           │
    ▼                                                                           ▼
[ Static Assets & Web Tools ]                                         [ Security Middleware ]
- Primary Task UI (/ & /todo)                                        - nosniff, SAMEORIGIN, CSP
- Preserved Tools (/emi, /hotel, /q1)                                - 100kb JSON Body Parser
- Legacy Hub (/hub)                                                  - Malformed JSON Handler
                                                                                │
                                                                                ▼
                                                                      [ REST API Router ]
                                                                       (routes/todos.js)
                                                                      - Input Validation
                                                                      - Whitelist Sanitization
                                                                                │
                                                                                ▼
                                                             [ Dual-Engine Database Router ]
                                                                    (db/database.js)
                                                                    (Checks DATABASE_URL)
                                                                                │
                                           ┌────────────────────────────────────┴────────────────────────────────────┐
                                           │ (DATABASE_URL is set)                                                   │ (DATABASE_URL is unset)
                                           ▼                                                                         ▼
                             [ PostgreSQL Adapter ]                                                    [ SQLite Adapter ]
                               (db/postgres.js)                                                          (db/sqlite.js)
                                           │                                                                         │
                                           ▼ SSL / TLS (Port 5432)                                                   ▼ Local File System
                        [ Neon Managed PostgreSQL ]                                                    [ Local Disk File ]
                        (Remote Persistent Storage)                                                     (data/todos.db)
```

---

## Database Architecture & Persistence Strategy

### Dynamic Storage Selection
The database layer (`db/database.js`) inspects `process.env.DATABASE_URL` upon initialization:
- **`DATABASE_URL` Present:** Boots [`db/postgres.js`](db/postgres.js) using `pg.Pool`. Establishes an SSL connection to the remote PostgreSQL cluster and verifies connectivity via `SELECT 1`.
- **`DATABASE_URL` Absent:** Boots [`db/sqlite.js`](db/sqlite.js) using `better-sqlite3`. Creates the local database file at `data/todos.db` (or `process.env.DATABASE_PATH`) with `WAL` journaling mode enabled.
- **Fail-Fast Safety:** If `DATABASE_URL` is configured but invalid or unreachable, `initDb()` throws an immediate exception and halts the process. It will **never** silently revert to SQLite in production, preventing deceptive silent data loss.

### Database Schemas

Both database engines run idempotent initialization scripts on application startup:

#### PostgreSQL Schema (`db/postgres.js`)
```sql
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date DATE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
```

#### SQLite Schema (`db/sqlite.js`)
```sql
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
```

### Data Normalization
- **Dates:** Cloud PostgreSQL returns SQL `DATE` columns as JavaScript `Date` instances. The PostgreSQL adapter explicitly formats these values to `YYYY-MM-DD` strings before returning them to the API layer, eliminating timezone-induced calendar day offsets.
- **Booleans:** PostgreSQL uses native `BOOLEAN` types (`true`/`false`), while SQLite uses `INTEGER` flags (`1`/`0`). Both adapters return normalized JavaScript booleans.

---

## REST API Reference

All API routes return responses formatted with `application/json; charset=utf-8`.

| Method | Endpoint | Query / Body Parameters | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/health` | *None* | Verifies application uptime and active database health (`SELECT 1`). | `200`, `503` |
| `GET` | `/api/todos` | Query: `status` (`all`\|`pending`\|`completed`), `priority` (`low`\|`medium`\|`high`), `search` (string), `sortBy` (`createdAt`\|`dueDate`\|`priority`\|`title`), `sortOrder` (`asc`\|`desc`) | Retrieves task list matching criteria with count. | `200`, `400` |
| `GET` | `/api/todos/summary` | *None* | Returns dashboard metrics: total, pending, completed, overdue. | `200` |
| `GET` | `/api/todos/:id` | Route Param: `:id` (positive integer) | Retrieves single task record by ID. | `200`, `400`, `404` |
| `POST` | `/api/todos` | JSON Body: `title` (required, max 255), `description` (optional, max 1000), `priority` (`low`\|`medium`\|`high`), `dueDate` (ISO date `YYYY-MM-DD`) | Creates new task record. | `201`, `400` |
| `PATCH` | `/api/todos/:id` | Route Param: `:id`<br>JSON Body (at least one): `title`, `description`, `completed`, `priority`, `dueDate` | Updates fields on an existing task. Discards non-whitelisted properties. | `200`, `400`, `404` |
| `DELETE` | `/api/todos/:id` | Route Param: `:id` (positive integer) | Permanently deletes a task record. | `200`, `400`, `404` |

### Sample API Payloads

#### Create Task Request (`POST /api/todos`)
```http
POST /api/todos HTTP/1.1
Content-Type: application/json

{
  "title": "Complete portfolio deployment audit",
  "description": "Verify Render Free Web Service with Neon PostgreSQL",
  "priority": "high",
  "dueDate": "2026-10-31"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "id": 1,
    "title": "Complete portfolio deployment audit",
    "description": "Verify Render Free Web Service with Neon PostgreSQL",
    "completed": false,
    "priority": "high",
    "dueDate": "2026-10-31",
    "createdAt": "2026-10-19 06:15:00",
    "updatedAt": "2026-10-19 06:15:00"
  }
}
```

#### Dashboard Summary Response (`GET /api/todos/summary`)
```json
{
  "success": true,
  "data": {
    "total": 8,
    "pending": 5,
    "completed": 3,
    "overdue": 1
  }
}
```

---

## Local Setup & Installation

Follow these steps to run the application on Windows, macOS, or Linux:

### Prerequisites
- [Node.js](https://nodejs.org/) version **18.x** or higher
- `npm` package manager (included with Node.js)
- `git` version control tool

### 1. Clone the Repository
```bash
git clone https://github.com/shubh201203/TO-DO.git
cd TO-DO
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

The application detects that `DATABASE_URL` is unset and automatically initializes SQLite at `data/todos.db`:
```text
Task Manager & Web Hub (sqlite) listening at http://0.0.0.0:3000
```

### 4. Open in Browser
- **Task Management Dashboard:** [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/todo](http://localhost:3000/todo)
- **Health Check Status:** [http://localhost:3000/health](http://localhost:3000/health)
- **EMI Calculator:** [http://localhost:3000/emi](http://localhost:3000/emi)
- **Hotel Bill Generator:** [http://localhost:3000/hotel](http://localhost:3000/hotel)
- **Deployment Case Study:** [http://localhost:3000/q1](http://localhost:3000/q1)
- **Legacy Hub:** [http://localhost:3000/hub](http://localhost:3000/hub)

*(Optional)* To test with a local PostgreSQL instance:
```bash
DATABASE_URL="postgres://user:password@localhost:5432/todos_dev" npm start
```

---

## Environment Variables

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port on which the HTTP server listens. Provided dynamically by Render in production. |
| `HOST` | No | `0.0.0.0` | Network binding address. |
| `NODE_ENV` | No | `development` | Set to `production` in deployment to disable debug messages and optimize responses. |
| `DATABASE_URL` | Production | *Unset* | Full PostgreSQL connection URI (e.g. `postgres://user:pass@host/db?sslmode=require`). When set, the server switches to PostgreSQL mode. |
| `DATABASE_SSL` | No | `true` | When in PostgreSQL mode, enables SSL with `rejectUnauthorized: false` for managed cloud databases. Set to `false` for unencrypted local databases. |
| `DB_POOL_MAX` | No | `10` | Maximum number of concurrent database client connections in the PostgreSQL pool. |
| `DATABASE_PATH` | No | `data/todos.db` | File path for the local SQLite database. |

> [!WARNING]
> **Credential Safety:** Never commit `.env` files, database passwords, or connection strings to version control. Pass credentials exclusively through your cloud provider's dashboard or local environment.

---

## Automated Testing

The automated test suite runs via Node.js native test runner (`node:test`) and requires no additional testing frameworks or external databases.

```bash
npm test
```

### Test Suite Breakdown (52 Total Passing Tests)

```text
▶ REST API Endpoint Integration Tests (11 tests)
  ✔ POST /api/todos creates task (201)
  ✔ POST rejects empty/missing title (400)
  ✔ POST rejects invalid priority and date format (400)
  ✔ POST rejects malformed JSON payload (400)
  ✔ GET /api/todos returns task list and count
  ✔ GET /api/todos/:id returns single task or 404
  ✔ PATCH /api/todos/:id updates task fields
  ✔ PATCH rejects empty payload (400)
  ✔ POST rejects non-object body and oversized fields (400)
  ✔ DELETE /api/todos/:id removes task
  ✔ GET /api/todos/summary returns dashboard metrics

▶ Database Module Unit Tests - SQLite (8 tests)
  ✔ Creates and retrieves tasks with default fields
  ✔ Creates task with custom metadata
  ✔ Updates task completion and fields
  ✔ Ignores unsupported fields during update
  ✔ Deletes task properly
  ✔ Filters and searches tasks accurately
  ✔ Calculates dashboard summary counts including overdue tasks
  ✔ checkHealth reports true for operational database instance

▶ Database Driver Selection and Fail-Fast Tests (3 tests)
  ✔ Defaults to SQLite driver when DATABASE_URL is not set
  ✔ Selects PostgreSQL driver when DATABASE_URL is present
  ✔ Fails fast when DATABASE_URL is set but connection is invalid

▶ PostgreSQL Adapter Unit Tests with Mock Pool (8 tests)
  ✔ Initializes schema and runs idempotent DDL
  ✔ Creates task with parameterized query
  ✔ Fetches task by ID and formats Date objects cleanly
  ✔ Updates task and updates updated_at column
  ✔ Deletes task and reports true/false based on rowCount
  ✔ Calculates dashboard metrics accurately
  ✔ checkHealth returns true on operational pool
  ✔ formatDueDate correctly handles Date instances, strings, and nulls

▶ Server Route Verification & Error Handling (11 tests)
  ✔ GET / serves Todo App directly as default homepage (200)
  ✔ GET /todo serves Todo App (200)
  ✔ GET /hub serves preserved Hub page (200)
  ✔ GET /q1, /emi, /hotel serve respective utility tools (200)
  ✔ GET /health returns status 200 and healthy status JSON
  ✔ Server includes security headers in HTTP responses
  ✔ Handles unmatched web routes (404 Page not found)
  ✔ Handles unmatched API routes (404 Endpoint not found JSON)

▶ Todo Logic & State Verification (5 tests)
  ✔ Safely handles malformed and malicious localStorage data
  ✔ Filtering behavior works accurately
  ✔ Clearing completed tasks only removes completed items
  ✔ Overdue date detection accurately flags past dates
  ✔ formatDateSimple extracts ISO calendar date cleanly
```

### Dependency Vulnerability Audit
```bash
npm audit
# found 0 vulnerabilities
```

---

## Production Deployment (Render & Neon)

For complete step-by-step instructions and troubleshooting, consult **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

### Deployment Summary
1. **Provision Free PostgreSQL on Neon:**
   - Sign up at [neon.tech](https://neon.tech) and create a project.
   - Copy the connection string (`postgres://...`).
2. **Deploy on Render:**
   - Log in to [Render Dashboard](https://dashboard.render.com).
   - Create a new **Blueprint** and connect this repository (`shubh201203/TO-DO`).
   - Render detects [`render.yaml`](render.yaml) (configured for the **Free Plan** with zero disk fees).
   - Provide your Neon connection string when prompted for `DATABASE_URL`.
   - Click **Apply**. Render builds the service with `npm install` and starts it with `npm start`.

---

## Health Monitoring

The application exposes a `/health` endpoint designed for uptime monitors and Render deployment checks:

### Request
```bash
curl -i https://todo-task-manager-786m.onrender.com/health
```

### Healthy Response (`200 OK`)
```json
{
  "status": "ok",
  "database": "postgres",
  "uptime": 240,
  "timestamp": "2026-10-19T06:30:00.000Z"
}
```

### Unhealthy Response (`503 Service Unavailable`)
```json
{
  "status": "error",
  "database": "postgres",
  "error": "Database check failed"
}
```

---

## Security Considerations & Verified Limitations

### Implemented Protections
- **SQL Injection Prevention:** All database queries utilize parameterized statements (`$1, $2, ...` in PostgreSQL; `?` in SQLite). No raw string interpolation is performed.
- **Cross-Site Scripting (XSS) Mitigation:** User input is rendered to the DOM strictly via `textContent` or sanitized element properties.
- **Defensive HTTP Headers:** Security middleware applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy`.
- **Payload Size Restrictions:** The JSON body parser is restricted to `100kb`. Malformed JSON payloads are trapped gracefully without server crashes.
- **Mass Assignment Whitelist:** Updating tasks enforces an explicit whitelist (`title`, `description`, `completed`, `priority`, `dueDate`). Internal attributes (`id`, `created_at`, `updated_at`) cannot be overwritten by clients.
- **Fail-Fast Database Initialization:** If a PostgreSQL connection string is provided, startup will abort if the database cannot be contacted, preventing accidental fallback to ephemeral storage.

### Verified Limitations (Transparent Disclosure)
- **Public Workspace Model:** No user authentication or user account system is implemented. Any visitor to the public URL can view, create, edit, and delete tasks.
- **No Rate Limiting:** Request rate limiting (e.g. `express-rate-limit`) is not installed.
- **No Server-Side Pagination:** The `GET /api/todos` endpoint returns all tasks matching the specified filter criteria in a single response array.
- **Render Free Tier Cold Starts:** On Render's Free tier, services spin down after 15 minutes of inactivity. When a new request arrives, a cold start latency of 20–40 seconds is expected before the application responds. All database records remain durable in Neon throughout sleep periods.

---

## Project Directory Structure

```text
TO-DO/
├── .gitignore               # Excludes node_modules, data/*.db, .env, OS files
├── DEPLOYMENT.md            # Detailed Neon & Render production deployment guide
├── Q1_CaseStudy.md          # Technical documentation on SPA deployment strategies
├── README.md                # Comprehensive portfolio and developer documentation
├── package-lock.json        # Deterministic dependency lockfile
├── package.json             # Project metadata, scripts, and production dependencies
├── render.yaml              # Render Blueprint configuration for Free Web Service
├── server.js                # Express app setup, security headers, routing, lifecycle
├── db/
│   ├── database.js          # Central database router (dispatches to postgres or sqlite)
│   ├── postgres.js          # PostgreSQL adapter (pg.Pool, parameterized SQL, DDL, SSL)
│   └── sqlite.js            # SQLite adapter (better-sqlite3, WAL mode, memory mode)
├── public/
│   ├── emi.html             # EMI Loan Calculator page
│   ├── hotel.html           # Hotel Bill Generator page
│   ├── index.html           # Preserved legacy assignment navigation hub
│   ├── q1.html              # Dynamic SPA Deployment case study page
│   ├── todo.html            # Main task management dashboard page
│   ├── css/
│   │   ├── emi.css          # Styling for EMI calculator
│   │   ├── hotel.css        # Styling for Hotel bill generator
│   │   └── todo.css         # Modern dark-mode styling for To-Do dashboard
│   └── js/
│       ├── emi.js           # Client logic for EMI calculator
│       ├── hotel.js         # Client logic for Hotel bill generator
│       └── todo.js          # Client logic for To-Do dashboard (API, modals, search)
├── routes/
│   └── todos.js             # REST API router (/api/todos) with input validation
└── test/
    ├── api-todos.test.js    # Integration tests for REST API endpoints
    ├── database.test.js     # Unit tests for SQLite, PG mock pool, and driver router
    ├── server.test.js       # Route verification, security headers, and 404 tests
    └── todo-logic.test.js   # Unit tests for client-side state and security algorithms
```

---

## Planned Future Enhancements

The following features represent architectural additions planned for future iterations:
- **User Authentication & Authorization:** Multi-tenant workspace separation using JWT and bcrypt or OAuth2 authentication.
- **Pagination & Infinite Scrolling:** Server-side `limit` and `offset` query parameters for high-volume task collections.
- **Rate Limiting Middleware:** Abuse prevention using `express-rate-limit` on public write endpoints (`POST`, `PATCH`, `DELETE`).
- **Automated CI/CD Pipeline:** GitHub Actions workflow executing `npm test` and `npm audit` on every pull request.
- **Drag-and-Drop Task Organization:** Visual Kanban board layout with reorderable status columns.

---

## License

This project's package manifest specifies the **ISC** license in [`package.json`](package.json). No standalone `LICENSE` text file is currently included in the root repository.
