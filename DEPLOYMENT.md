# Production Deployment Guide: Render Free Web Service with Persistent PostgreSQL (Neon)

This guide explains how to deploy the **Full-Stack Task Manager** to **Render's Free Web Service** backed by persistent **PostgreSQL** storage (using [Neon](https://neon.tech), Supabase, or any external PostgreSQL provider).

---

## 1. Architecture & Storage Model

```text
[ Render Free Web Service ]                           [ External Managed PostgreSQL (Neon) ]
┌──────────────────────────────────────┐             ┌──────────────────────────────────────────────┐
│  Node.js + Express 5 Runtime         │   SSL/TLS   │  Serverless PostgreSQL 16+                   │
│  PORT: process.env.PORT (e.g. 10000) │ ──────────▶ │  DATABASE_URL=postgres://user:pass@host/db   │
│  Dual Driver: PostgreSQL (pg)        │  (Port 5432)│  - Durable, persistent cloud storage         │
│  Zero persistent disk required       │             │  - Survives container spin-downs & deploys   │
└──────────────────────────────────────┘             └──────────────────────────────────────────────┘
```

### Why Persistent PostgreSQL instead of SQLite on Render Free?
- **Render Free Web Services** use an ephemeral container filesystem. Any file written to the local disk (such as `data/todos.db`) is completely erased whenever the container restarts, sleeps after 15 minutes of inactivity, or redeploys with new code.
- Render Free does **not** support Persistent Disks.
- By connecting to an external cloud PostgreSQL provider with a free tier (such as [Neon Serverless Postgres](https://neon.tech)), your tasks and metrics persist permanently across all restarts, spin-downs, and deployments at **$0 cost**.

---

## 2. Dual Database Architecture

The application includes an intelligent dual-driver database layer (`db/database.js`):

| Environment | Driver Selected | Data Store | Trigger |
|---|---|---|---|
| **Local Development** | SQLite (`better-sqlite3`) | `data/todos.db` (local disk) or `:memory:` | `DATABASE_URL` is **not set** |
| **Production on Render** | PostgreSQL (`pg`) | Cloud PostgreSQL instance (Neon) | `DATABASE_URL` is **set** |

> [!IMPORTANT]
> **Strict Fail-Fast Guarantee:**
> When `DATABASE_URL` is set, the application strictly requires PostgreSQL. It will **never** silently fall back to ephemeral SQLite if PostgreSQL credentials fail or the remote database is unreachable. If the connection fails, the server reports the exact error and halts so that configuration issues can be fixed immediately.

---

## 3. Step-by-Step Neon PostgreSQL Setup (Free Tier)

### Step 1: Create a Free Neon Account
1. Visit [neon.tech](https://neon.tech) and sign up (GitHub sign-in is supported).
2. Click **Create Project**.
3. Choose a project name (e.g., `todo-database`) and select a region close to your Render deployment region (e.g., `US East (N. Virginia)` or `EU (Frankfurt)`).
4. Click **Create Project**.

### Step 2: Retrieve your Connection String
1. Once your project is created, the Neon Dashboard displays your **Connection String**.
2. Ensure **Connection Details** is set to **Pooled connection** or **Direct connection** (both work with Node `pg`; pooled connection is recommended for serverless deployments).
3. The connection string looks like:
   ```text
   postgres://username:password@ep-cool-frost-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy this connection string. **Never commit this string or your password into Git.**

---

## 4. Deploying to Render

### Deployment Method A: Blueprint Deployment (Recommended)

This repository includes a `render.yaml` Blueprint configured specifically for the Render Free Web Service tier.

1. Ensure your latest changes are pushed to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your GitHub repository (`shubh201203/TO-DO`).
5. Render will detect `render.yaml` with the following configuration:
   - **Service Name:** `todo-task-manager`
   - **Runtime:** `Node`
   - **Plan:** `Free`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Environment Variables:**
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: `sync: false` (prompts you to enter your Neon connection string)
6. Paste your Neon connection string into the `DATABASE_URL` prompt.
7. Click **Apply**. Render will deploy the application and establish the PostgreSQL connection.

---

### Deployment Method B: Manual Dashboard Configuration

If configuring manually via the Render UI:

1. In the Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository (`shubh201203/TO-DO`).
3. Set the configuration:
   - **Name:** `todo-app-shubh` (or your preferred service name)
   - **Region:** Same region as your Neon database (or closest to it).
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Plan:** `Free`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Expand **Advanced** and configure:
   - **Health Check Path:** `/health`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations. |
   | `DATABASE_URL` | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Your Neon connection string. |
   | `DATABASE_SSL` | `true` *(Optional, defaults to true)* | Forces TLS connection to external database. |
6. Click **Create Web Service**.

---

## 5. Verification & Health Monitoring

### 1. Verify Deployment Logs
Open the **Logs** tab in Render:
- Confirm dependencies installed: `pg` and `better-sqlite3`.
- Confirm startup messages:
  ```text
  Connecting to PostgreSQL database...
  PostgreSQL database connected and schema initialized.
  Task Manager & Web Hub (postgres) listening at http://0.0.0.0:10000
  ```

### 2. Verify Health Check Endpoint
Query your deployed service:
```bash
curl https://todo-app-shubh.onrender.com/health
```
**Expected Response (`200 OK`):**
```json
{
  "status": "ok",
  "database": "postgres",
  "uptime": 45,
  "timestamp": "2026-10-19T06:00:00.000Z"
}
```

### 3. Verify PostgreSQL Data Persistence
1. Open `https://todo-app-shubh.onrender.com/` in your browser.
2. Create a test task:
   - **Title:** `Neon PostgreSQL Persistence Check`
   - **Priority:** `High`
   - **Due Date:** A future date
3. In Render Dashboard, click **Manual Deploy** &rarr; **Deploy latest commit** (or restart the service).
4. Wait for Render to redeploy and restart the container.
5. Refresh your browser:
   - The task `Neon PostgreSQL Persistence Check` will still be present and intact.
   - Live KPI metrics and task status remain consistent.
6. Delete the test task after verification.

---

## 6. Local Development vs. Production

No database setup or credentials are required for local development or testing:

- **Local Machine:**
  Simply run `npm start`. Since `DATABASE_URL` is omitted, the app instantly boots with SQLite (`data/todos.db`) on `http://localhost:3000`.
- **Running Tests:**
  `npm test` executes all 52 automated tests in milliseconds using isolated in-memory SQLite and a mock PostgreSQL adapter. No live network or database credentials are required.
- **Testing PostgreSQL Locally (Optional):**
  If you have a local PostgreSQL container or wish to connect to Neon locally:
  ```bash
  DATABASE_URL="postgres://user:pass@localhost:5432/todos_dev" npm start
  ```

---

## 7. Troubleshooting Common Issues

| Issue | Cause | Solution |
|---|---|---|
| **Build Succeeded but App Crashes on Start** | `DATABASE_URL` is missing, misformatted, or unreachable. | Check Render Logs. If `DATABASE_URL` is set, the app refuses to fall back to SQLite to prevent data loss. Verify the connection string in Render Environment Variables. |
| **Self-signed Certificate / SSL Error** | PostgreSQL provider requires SSL. | The app defaults to SSL enabled (`rejectUnauthorized: false`). If your provider requires explicit plain TCP (rare), set `DATABASE_SSL=false`. |
| **Render Free Web Service Sleep/Spin-Down** | Free tier services sleep after 15 minutes of no HTTP traffic. | When a request arrives, Render wakes the service (cold start takes 20-40s). Because data is stored in Neon, **no data is ever lost during spin-down**. |
| **Due Date Shifting by One Day** | Timezone parsing discrepancy between SQL `DATE` and local browser time. | The PostgreSQL adapter formats `due_date` strictly as `YYYY-MM-DD` strings without timezone conversion, preventing calendar date shifts. |
