# Full-Stack Task Manager & Web Hub

A production-hardened, full-stack Task Management dashboard and interactive multi-utility web hub built with Node.js, Express, PostgreSQL, SQLite, and Vanilla JavaScript.

Designed for production deployment on **Render's Free Web Service** with persistent cloud **PostgreSQL** storage (e.g. Neon, Supabase, or Render PostgreSQL), and seamless zero-configuration **SQLite** for local development.

---

## Overview

This project provides a persistent task manager alongside utility web tools, engineered with clear separation of concerns between client, REST API layer, and an intelligent dual-engine persistence layer:

- **Task Manager (`/` & `/todo`):** Production-ready full-stack task workspace served as the primary application homepage, featuring persistent CRUD operations, live KPI summary metrics, debounced search, status and priority filters, due date tracking with overdue flags, and accessible modal editing and delete confirmations.
- **EMI Loan Calculator (`/emi`):** Dynamic monthly loan installment and amortization calculator.
- **Hotel Bill Screen (`/hotel`):** Receipt generator with itemized selection and automated GST calculation.
- **Deploying React Case Study (`/q1`):** Technical case study examining deployment strategies for modern dynamic Single-Page Applications.
- **Legacy Assignment Hub (`/hub`):** Preserved assignment navigation portal.

---

## Architecture & Technology Stack

```text
[ Browser Client (HTML5 / CSS3 / Vanilla JS) ]
      │
      ├── Static Assets (/public)
      │
      └── Fetch API ──▶ [ Express REST API (/api/todos) ]
                              │
                              ├── HTTP Security Headers (CSP, nosniff, frame-guard)
                              ├── JSON Payload Limit (100kb) & Validation
                              ├── Mass-Assignment Whitelist Filter
                              │
                              └── [ Dual-Engine Persistence Layer (db/database.js) ]
                                    │
                                    ├── Production: PostgreSQL (pg) via DATABASE_URL (Neon / Cloud)
                                    └── Local Dev & Test: SQLite (better-sqlite3) via data/todos.db or :memory:
```

- **Backend Runtime:** Node.js (v18+)
- **Server Framework:** Express 5 (`server.js`)
- **Database Engine (Dual-Driver):**
  - **Production:** PostgreSQL via `pg` with connection pooling, SSL/TLS support, and automated schema migration.
  - **Local Development:** SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL` mode).
- **Frontend:** Vanilla HTML5, modern CSS3 (CSS Variables, Flexbox, CSS Grid), ES6+ JavaScript
- **Styling:** Linear-inspired modern dark productivity theme with Google Font `Outfit`
- **Testing:** Node.js native test runner (`node:test` and `node:assert/strict`) — 52 automated tests
- **Deployment:** Render Free Web Service with cloud PostgreSQL (`render.yaml` Blueprint included)

---

## Dual Database Architecture

The backend utilizes an adapter architecture (`db/database.js`) that automatically switches storage engines based on the presence of the `DATABASE_URL` environment variable:

| Environment | Engine | Configuration | Behavior |
|---|---|---|---|
| **Production (Render)** | PostgreSQL (`pg`) | `DATABASE_URL=postgres://...` | Connects via pooled TLS connection; fails fast if unreachable (no silent fallback). |
| **Local Development** | SQLite (`better-sqlite3`) | Default (no env var required) | Stores data locally in `data/todos.db` with WAL mode enabled. |
| **Automated Tests** | In-Memory SQLite & Mock PG | Isolated test environments | Runs all 52 tests offline without live credentials or external databases. |

### Database Schemas

Both SQLite and PostgreSQL schemas are managed idempotently on server startup:

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
```

---

## REST API Documentation

All API endpoints return standard JSON responses with a `success: boolean` property and appropriate HTTP status codes.

### Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Lightweight service and database health check for Render monitoring. |
| `GET` | `/api/todos` | Retrieve tasks with optional filtering and sorting. |
| `GET` | `/api/todos/summary` | Retrieve live dashboard task metrics (total, pending, completed, overdue). |
| `GET` | `/api/todos/:id` | Retrieve a single task by ID. |
| `POST` | `/api/todos` | Create a new task. |
| `PATCH` | `/api/todos/:id` | Update specific fields of an existing task. |
| `DELETE` | `/api/todos/:id` | Delete a task by ID. |

---

### Example Requests & Responses

#### 1. Health Check (`GET /health`)
**Response (`200 OK`):**
```json
{
  "status": "ok",
  "uptime": 142,
  "timestamp": "2026-10-19T05:15:00.000Z"
}
```

#### 2. Create a Task (`POST /api/todos`)
**Request:**
```http
POST /api/todos HTTP/1.1
Content-Type: application/json

{
  "title": "Migrate to Neon PostgreSQL",
  "description": "Verify persistent data across Render container restarts",
  "priority": "high",
  "dueDate": "2026-10-30"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "id": 1,
    "title": "Migrate to Neon PostgreSQL",
    "description": "Verify persistent data across Render container restarts",
    "completed": false,
    "priority": "high",
    "dueDate": "2026-10-30",
    "createdAt": "2026-10-19 01:10:00",
    "updatedAt": "2026-10-19 01:10:00"
  }
}
```

#### 3. Get All Tasks with Query Filters (`GET /api/todos`)
Supported query parameters:
- `status`: `all`, `pending`, `completed`
- `priority`: `low`, `medium`, `high`
- `search`: Filter by string in title or description
- `sortBy`: `createdAt`, `dueDate`, `priority`, `title`
- `sortOrder`: `asc`, `desc`

**Request:**
```http
GET /api/todos?status=pending&priority=high&sortBy=dueDate HTTP/1.1
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "title": "Migrate to Neon PostgreSQL",
      "description": "Verify persistent data across Render container restarts",
      "completed": false,
      "priority": "high",
      "dueDate": "2026-10-30",
      "createdAt": "2026-10-19 01:10:00",
      "updatedAt": "2026-10-19 01:10:00"
    }
  ]
}
```

#### 4. Update Task Status or Fields (`PATCH /api/todos/:id`)
**Request:**
```http
PATCH /api/todos/1 HTTP/1.1
Content-Type: application/json

{
  "completed": true
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Task updated successfully.",
  "data": {
    "id": 1,
    "title": "Migrate to Neon PostgreSQL",
    "description": "Verify persistent data across Render container restarts",
    "completed": true,
    "priority": "high",
    "dueDate": "2026-10-30",
    "createdAt": "2026-10-19 01:10:00",
    "updatedAt": "2026-10-19 01:15:20"
  }
}
```

#### 5. Dashboard Summary Metrics (`GET /api/todos/summary`)
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "pending": 7,
    "completed": 5,
    "overdue": 2
  }
}
```

---

## Security & Reliability Engineering

1. **HTTP Security Headers:** Integrated middleware enforces defensive HTTP response headers:
   - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
   - `X-Frame-Options: SAMEORIGIN` (mitigates clickjacking attacks)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
   - `Content-Security-Policy` restricting script, style, and font origins.
2. **Body Parser Limits & JSON Guard:** Request bodies are restricted to `100kb` with graceful handling of malformed JSON payloads.
3. **Mass Assignment Prevention:** The update and creation handlers enforce an explicit property whitelist (`title`, `description`, `completed`, `priority`, `dueDate`). Internal keys such as `id`, `created_at`, or extraneous client properties are discarded.
4. **SQL Injection Defense:** All database interactions use parameterized queries (`$1, $2` for PostgreSQL, `?` for SQLite). No raw string concatenation is executed against either engine.
5. **Cross-Site Scripting (XSS) Prevention:** User-supplied task names and descriptions are injected into the DOM exclusively via `textContent` and native DOM element creation.
6. **Fail-Fast Configuration:** If `DATABASE_URL` is set, the application will not silently fall back to SQLite if PostgreSQL connection fails.
7. **Defensive Error Handling:**
   - Centralized error handlers return clean JSON errors for `/api/*` requests without leaking internal database errors or stack traces to clients.
   - Non-numeric or negative task IDs return descriptive `400 Bad Request` responses.
   - Empty update requests are validated and rejected with `400 Bad Request`.

---

## Production Deployment on Render

This application is ready to deploy on **Render's Free Web Service** with external **PostgreSQL** storage (such as [Neon](https://neon.tech)).

For detailed instructions and troubleshooting, see **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

### Quick Start with Render Blueprint:
1. Push this repository to GitHub.
2. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy your connection string.
3. In [Render Dashboard](https://dashboard.render.com), click **New +** &rarr; **Blueprint** and select your repository.
4. When prompted, enter your Neon connection string for `DATABASE_URL`.
5. Render deploys your application on the **Free Plan** with full data persistence.

---

## Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shubh201203/TO-DO.git
   cd TO-DO
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```
   The application automatically detects that `DATABASE_URL` is not set, initializes local SQLite storage at `data/todos.db`, and listens on `http://0.0.0.0:3000` (or `PORT`).

4. **Access the application:**
   - Primary Task Dashboard (Homepage): `http://localhost:3000/` or `http://localhost:3000/todo`
   - Health Status: `http://localhost:3000/health`
   - Preserved Tools: `http://localhost:3000/emi`, `http://localhost:3000/hotel`, `http://localhost:3000/q1`, `http://localhost:3000/hub`

---

## Automated Test Suite

The test suite runs with Node.js built-in `node:test` runner. All tests run completely offline without requiring any live database:

```bash
npm test
```

### Test Coverage (52 passing automated tests):
- **Database Module Unit Tests (8 tests):** Schema creation, CRUD operations, metadata handling, search/filter queries, overdue count calculations, health check query, and unsupported field rejection on SQLite.
- **Database Driver Selection & Fail-Fast Tests (3 tests):** Validates default fallback to SQLite when `DATABASE_URL` is unset, PostgreSQL driver selection when `DATABASE_URL` is present, and fail-fast behavior when connection fails.
- **PostgreSQL Adapter Unit Tests with Mock Pool (8 tests):** Validates schema creation DDL, parameterized query generation, Date formatting (`formatDueDate`), update timestamp triggers, delete reporting, aggregate count queries, and pool health checking.
- **REST API Integration Tests (11 tests):** Endpoint status codes, body validation, 400 for empty title, 400 for invalid dates/priorities, 400 for malformed JSON, 400 for empty PATCH payload, 400 for non-object bodies, 404 for missing IDs, PATCH updates, and DELETE operations.
- **Web Hub Route Verification (11 tests):** Confirms `/` and `/todo` serve the To-do app directly, verifies `/q1`, `/emi`, `/hotel`, `/hub`, `/health`, and static asset endpoints return `200 OK`, validates security headers, and verifies clean 404 responses.
- **Todo Logic & State Verification (5 tests):** Validates sanitization of untrusted payloads, filtering algorithms, completion clearing, overdue date calculation, and ISO date formatting.

---

## Dependency Audit

```bash
npm audit
# found 0 vulnerabilities
```

---

## License

MIT
