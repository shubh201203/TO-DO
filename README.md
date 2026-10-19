# Full-Stack Task Manager & Web Hub

A full-stack, database-backed Task Management application and interactive multi-utility web hub built with Node.js, Express, SQLite (`better-sqlite3`), and Vanilla JavaScript.

---

## Overview

This project provides a persistent task manager alongside utility web tools, engineered with separation of concerns between client, REST API layer, and an embedded SQLite database:

- **Task Manager (`/todo`):** Production-ready full-stack task management interface with persistent CRUD operations, live dashboard metrics, full-text search, multi-factor filtering, priority levels, due date tracking, and inline modal editing.
- **Navigation Hub (`/`):** Unified portal providing access to all tools.
- **EMI Loan Calculator (`/emi`):** Dynamic monthly loan installment and amortization calculator.
- **Hotel Bill Screen (`/hotel`):** Receipt generator with itemized selection and automated GST calculation.
- **Deploying React Case Study (`/q1`):** Technical case study examining deployment strategies for modern dynamic Single-Page Applications.

---

## Architecture & Technology Stack

```text
[ Browser Client ]
      │
      ├── Static Assets (HTML5, CSS3, ES6+ JS)
      │
      └── Fetch API ──▶ [ Express REST API (/api/todos) ]
                               │
                               ├── Request Validation & Mass-Assignment Filter
                               │
                               └── [ SQLite Database (better-sqlite3) ]
                                     └── Persistent Storage: data/todos.db
```

- **Backend Runtime:** Node.js (v18+)
- **Server Framework:** Express 5 (`server.js`)
- **Database:** SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL` mode)
- **Frontend:** Vanilla HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid), ES6+ JavaScript
- **Styling:** Custom dark-mode design system with Google Font `Outfit`
- **Testing:** Node.js native test runner (`node:test` and `node:assert`)

---

## Database Schema & Persistence

The application automatically initializes the SQLite schema on startup in a local directory (`data/todos.db`). Database files and SQLite journal/WAL artifacts are excluded from Git tracking via `.gitignore`.

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
- `due_date`: Optional ISO date string (`YYYY-MM-DD` or parseable date string).
- `created_at` / `updated_at`: UTC timestamps generated automatically via SQLite `datetime('now')`.

---

## REST API Documentation

All API endpoints return standard JSON responses with a `success: boolean` property and appropriate HTTP status codes.

### Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/todos` | Retrieve tasks with optional filtering and sorting. |
| `GET` | `/api/todos/summary` | Retrieve live dashboard task counts. |
| `GET` | `/api/todos/:id` | Retrieve a single task by ID. |
| `POST` | `/api/todos` | Create a new task. |
| `PATCH` | `/api/todos/:id` | Update specific fields of an existing task. |
| `DELETE` | `/api/todos/:id` | Delete a task by ID. |

---

### Example Requests & Responses

#### 1. Create a Task (`POST /api/todos`)
**Request:**
```http
POST /api/todos HTTP/1.1
Content-Type: application/json

{
  "title": "Implement API Rate Limiting",
  "description": "Add token bucket middleware to express routes",
  "priority": "high",
  "dueDate": "2026-11-01"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "id": 1,
    "title": "Implement API Rate Limiting",
    "description": "Add token bucket middleware to express routes",
    "completed": false,
    "priority": "high",
    "dueDate": "2026-11-01",
    "createdAt": "2026-10-19 01:10:00",
    "updatedAt": "2026-10-19 01:10:00"
  }
}
```

#### 2. Get All Tasks with Query Filters (`GET /api/todos`)
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
      "title": "Implement API Rate Limiting",
      "description": "Add token bucket middleware to express routes",
      "completed": false,
      "priority": "high",
      "dueDate": "2026-11-01",
      "createdAt": "2026-10-19 01:10:00",
      "updatedAt": "2026-10-19 01:10:00"
    }
  ]
}
```

#### 3. Update Task Status or Fields (`PATCH /api/todos/:id`)
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
    "title": "Implement API Rate Limiting",
    "description": "Add token bucket middleware to express routes",
    "completed": true,
    "priority": "high",
    "dueDate": "2026-11-01",
    "createdAt": "2026-10-19 01:10:00",
    "updatedAt": "2026-10-19 01:15:20"
  }
}
```

#### 4. Dashboard Summary Metrics (`GET /api/todos/summary`)
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

#### 5. Validation Error Example (`400 Bad Request`)
```json
{
  "success": false,
  "error": "Validation Error: Title is required and cannot be empty."
}
```

---

## Security & Reliability Engineering

1. **Mass Assignment Prevention:** The update and creation handlers enforce an explicit property whitelist (`title`, `description`, `completed`, `priority`, `dueDate`). Internal keys such as `id`, `created_at`, or foreign properties are discarded.
2. **SQL Injection Defense:** All SQLite interactions use parameterized prepared statements (`?` placeholders) via `better-sqlite3`. No raw string concatenation is executed against the database.
3. **Cross-Site Scripting (XSS) Prevention:** User-supplied task names and descriptions are injected into the DOM exclusively via `textContent` and native DOM element creation.
4. **Defensive Error Handling:**
   - Malformed JSON payloads return a clean `400 Bad Request` instead of triggering unhandled syntax exceptions.
   - Centralized 500 handler avoids leaking internal server stack traces to clients.
   - Non-numeric or negative task IDs return descriptive `400 Bad Request` responses.

---

## Prerequisites

- **Node.js:** v18.0.0 or later (Node.js v20+ or v24+ recommended)
- **npm:** v9.0.0 or later

---

## Installation & Setup

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
   The application will initialize `data/todos.db` automatically and listen on `http://localhost:3000` (or the port defined by `process.env.PORT`).

---

## Running Automated Tests

The test suite runs with Node.js built-in `node:test` runner and uses an isolated `:memory:` SQLite instance to avoid touching local development data:

```bash
npm test
```

### Test Coverage (30 automated tests):
- **Database Unit Tests:** Schema creation, CRUD operations, metadata handling, search/filter queries, overdue count calculations, and unsupported field rejection.
- **REST API Integration Tests:** Endpoint status codes, body validation, 400 for empty title, 400 for invalid dates/priorities, 400 for malformed JSON, 404 for missing IDs, PATCH updates, and DELETE operations.
- **Web Hub Route Verification:** Confirms `/`, `/todo`, `/q1`, `/emi`, `/hotel`, and static asset endpoints return `200 OK`.
- **404 Not Found Handling:** Unmatched routes return clean 404 responses.

---

## Known Limitations & Deployment Considerations

- **SQLite Storage on Ephemeral Platforms:** SQLite writes to a local file (`data/todos.db`). When deploying to serverless platforms (e.g. Vercel Serverless Functions) or container platforms with ephemeral storage (e.g. standard Render/Heroku instances without persistent volumes), the database file will reset on each redeployment or sleep cycle. For persistent multi-instance production hosting, a managed relational database (such as PostgreSQL or MySQL) or a persistent volume mount should be configured.
- **Single-Tenant Operation:** Operates in single-user mode; does not currently enforce multi-user account authentication or tenant isolation.
