# Full-Stack Task Manager & Web Hub

A production-hardened, full-stack Task Management dashboard and interactive multi-utility web hub built with Node.js, Express, SQLite (`better-sqlite3`), and Vanilla JavaScript.

Designed for production deployment on **Render** with persistent disk volume storage.

---

## Overview

This project provides a persistent task manager alongside utility web tools, engineered with clear separation of concerns between client, REST API layer, and an embedded SQLite database:

- **Task Manager (`/todo`):** Production-ready full-stack task workspace featuring persistent CRUD operations, live KPI summary metrics, debounced search, status and priority filters, due date tracking with overdue flags, and accessible modal editing and delete confirmations.
- **Navigation Hub (`/`):** Unified portal providing access to all tools.
- **EMI Loan Calculator (`/emi`):** Dynamic monthly loan installment and amortization calculator.
- **Hotel Bill Screen (`/hotel`):** Receipt generator with itemized selection and automated GST calculation.
- **Deploying React Case Study (`/q1`):** Technical case study examining deployment strategies for modern dynamic Single-Page Applications.

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
                              └── [ SQLite Database (better-sqlite3) ]
                                    ├── WAL Mode & Pragmas
                                    ├── Local Dev: data/todos.db
                                    └── Render Production: /var/data/todos.db (Persistent Disk)
```

- **Backend Runtime:** Node.js (v18+)
- **Server Framework:** Express 5 (`server.js`)
- **Database:** SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL` mode) and configurable `DATABASE_PATH`
- **Frontend:** Vanilla HTML5, modern CSS3 (CSS Variables, Flexbox, CSS Grid), ES6+ JavaScript
- **Styling:** Linear-inspired modern dark productivity theme with Google Font `Outfit`
- **Testing:** Node.js native test runner (`node:test` and `node:assert/strict`) — 38 automated tests
- **Deployment:** Render Web Service with attached Persistent Disk (`render.yaml` Blueprint included)

---

## Database Schema & Persistence

The application automatically initializes the SQLite schema on startup in a local directory (`data/todos.db` by default, or configured via `process.env.DATABASE_PATH`). Database files and SQLite journal/WAL artifacts are excluded from Git tracking via `.gitignore`.

### Schema Definition
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

### Field Defaults & Validation:
- `id`: Auto-incrementing positive integer primary key.
- `title`: Required non-empty string, maximum 255 characters.
- `description`: Optional text, maximum 1000 characters.
- `completed`: Boolean flag (stored as integer `0` or `1`).
- `priority`: Validated against `'low'`, `'medium'`, or `'high'` (defaults to `'medium'`).
- `due_date`: Optional date string (`YYYY-MM-DD` or valid date string).
- `created_at` / `updated_at`: UTC timestamps generated automatically via SQLite `datetime('now')`.

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
  "title": "Configure Render persistent disk",
  "description": "Mount /var/data and verify database persistence across deploys",
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
    "title": "Configure Render persistent disk",
    "description": "Mount /var/data and verify database persistence across deploys",
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
      "title": "Configure Render persistent disk",
      "description": "Mount /var/data and verify database persistence across deploys",
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
    "title": "Configure Render persistent disk",
    "description": "Mount /var/data and verify database persistence across deploys",
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
4. **SQL Injection Defense:** All SQLite interactions use parameterized prepared statements (`?` placeholders) via `better-sqlite3`. No raw string concatenation is executed against the database.
5. **Cross-Site Scripting (XSS) Prevention:** User-supplied task names and descriptions are injected into the DOM exclusively via `textContent` and native DOM element creation.
6. **Defensive Error Handling:**
   - Centralized error handlers return clean JSON errors for `/api/*` requests without leaking internal server stack traces to clients.
   - Non-numeric or negative task IDs return descriptive `400 Bad Request` responses.
   - Empty update requests are validated and rejected with `400 Bad Request`.

---

## Production Deployment on Render

This application is ready to deploy on **Render** as a Node.js Web Service with a **Persistent Disk**.

For complete step-by-step instructions, backup procedures, and troubleshooting, consult **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

### Quick Start with Render Blueprint:
1. Push your repository to GitHub.
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint** and connect this repository (`shubh201203/TO-DO`).
4. Render automatically parses `render.yaml`, provisions a 1 GB persistent disk mounted at `/var/data`, sets `DATABASE_PATH=/var/data/todos.db`, and deploys the application.

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
   The application will initialize `data/todos.db` automatically and listen on `http://0.0.0.0:3000` (or the port defined by `process.env.PORT`).

4. **Access the web tools:**
   - Task Dashboard: `http://localhost:3000/todo`
   - Navigation Portal: `http://localhost:3000/`
   - Health Status: `http://localhost:3000/health`

---

## Automated Test Suite

The test suite runs with Node.js built-in `node:test` runner and uses an isolated `:memory:` SQLite instance to avoid touching local development data:

```bash
npm test
```

### Test Coverage (38 passing automated tests):
- **Database Unit Tests (8 tests):** Schema creation, CRUD operations, metadata handling, search/filter queries, overdue count calculations, health check query, and unsupported field rejection.
- **REST API Integration Tests (11 tests):** Endpoint status codes, body validation, 400 for empty title, 400 for invalid dates/priorities, 400 for malformed JSON, 400 for empty PATCH payload, 400 for non-object bodies, 404 for missing IDs, PATCH updates, and DELETE operations.
- **Web Hub Route Verification (10 tests):** Confirms `/`, `/todo`, `/q1`, `/emi`, `/hotel`, `/health`, and static asset endpoints return `200 OK`, validates security headers, and verifies clean 404 responses.
- **Todo Logic & State Verification (5 tests):** Validates sanitization of untrusted payloads, filtering algorithms, completion clearing, overdue date calculation, and ISO date formatting.

---

## Dependency Audit

```bash
npm audit
# found 0 vulnerabilities
```

---

## Known Limitations & Architecture Notes

- **Single Web Instance Constraint:** SQLite relies on filesystem-level locks (POSIX locks). Render Persistent Disks can only be mounted to a single Web Service instance at a time. The application is therefore configured for single-instance deployment (`numInstances: 1`).
- **Single-Tenant Workspace:** Operates in single-user mode without user authentication. Anyone with the public URL can view or edit tasks. Do not store sensitive or private credentials in task descriptions.
