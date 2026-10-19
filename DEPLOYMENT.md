# Production Deployment Guide: Render with SQLite & Persistent Disk

This guide outlines how to deploy the **Full-Stack Task Manager & Web Hub** to **Render** as a Node.js Web Service using an attached **Persistent Disk** to ensure SQLite data persists across server restarts, redeployments, and code updates.

---

## 1. Architecture & Storage Model

```text
                               Render Web Service
                    ┌──────────────────────────────────────┐
                    │  Node.js + Express 5 Runtime         │
                    │  PORT: process.env.PORT (e.g., 10000)│
                    │  HOST: 0.0.0.0                       │
                    └──────────────────┬───────────────────┘
                                       │
                      Mounted Volume   │ Reads & Writes (WAL Mode)
                      (/var/data)      ▼
                    ┌──────────────────────────────────────┐
                    │  Render Persistent Disk (1 GB)       │
                    │  File: /var/data/todos.db            │
                    │  - Survives instance reboots         │
                    │  - Survives container redeployments  │
                    └──────────────────────────────────────┘
```

> [!IMPORTANT]
> **Why Persistent Disks are Required for SQLite on Render:**  
> Standard Render Web Service containers use an ephemeral filesystem. Any files written outside a persistent disk mount are wiped whenever the service redeploys or restarts. Attaching a persistent disk to `/var/data` ensures that `todos.db` and its SQLite write-ahead log (`WAL`) files remain durable and intact.

---

## 2. Prerequisites

1. A [GitHub](https://github.com) account with this repository pushed to `main`.
2. A [Render](https://render.com) account.
3. Node.js v18+ and npm installed locally for local development and testing.

---

## 3. Deployment Method A: Blueprint Deployment (Recommended)

This repository includes a `render.yaml` blueprint that automates service creation, disk provisioning, environment variables, and health checks.

### Steps:
1. Ensure your latest changes are pushed to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your GitHub repository (`shubh201203/TO-DO`).
5. Render will detect `render.yaml` and display the resources to be created:
   - **Service Name:** `todo-task-manager`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Persistent Disk:** `todo-data` mounted at `/var/data` (1 GB)
   - **Environment Variables:** `DATABASE_PATH=/var/data/todos.db`, `NODE_ENV=production`
6. Click **Apply**. Render will provision the disk, build the dependencies, and start the application.

---

## 4. Deployment Method B: Manual Dashboard Configuration

If you prefer configuring the Web Service manually via the Render UI:

### Step 1: Create Web Service
1. In the Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select your repository (`shubh201203/TO-DO`).
3. Set the following configuration options:
   - **Name:** `todo-task-manager`
   - **Region:** Choose the region closest to your users (e.g., Oregon, Frankfurt, Singapore).
   - **Branch:** `main`
   - **Root Directory:** Leave blank (root).
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Select a plan that supports Persistent Disks (Starter plan or higher).

### Step 2: Attach Persistent Disk
1. Scroll down to the **Disks** section (or click **Advanced** &rarr; **Add Disk**).
2. Click **Add Disk** and configure:
   - **Name:** `todo-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB` (sufficient for hundreds of thousands of tasks).

### Step 3: Configure Environment Variables
In the **Environment Variables** section, add:
| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and disables debug traces. |
| `DATABASE_PATH` | `/var/data/todos.db` | Directs SQLite to store data on the persistent volume. |

*(Note: Render automatically supplies `PORT`, which our server reads dynamically).*

### Step 4: Configure Health Check Path
1. Under **Advanced Settings**, locate **Health Check Path**.
2. Enter: `/health`.
3. Click **Create Web Service**.

---

## 5. Verification & Health Monitoring

### 1. Verify Deployment Logs
Once deployment completes, open the **Logs** tab in Render:
- Confirm dependencies installed cleanly: `better-sqlite3` compiled with prebuilt binaries.
- Confirm the server startup message:
  ```text
  Task Manager & Web Hub listening at http://0.0.0.0:10000
  ```

### 2. Verify Health Check Endpoint
Send an HTTP GET request to your service's `/health` endpoint:
```bash
curl https://your-service-name.onrender.com/health
```
**Expected Response (`200 OK`):**
```json
{
  "status": "ok",
  "uptime": 124,
  "timestamp": "2026-10-19T05:30:00.000Z"
}
```

### 3. Verify Application Hub & Tasks
- Open `https://your-service-name.onrender.com/` to verify the Navigation Hub.
- Open `https://your-service-name.onrender.com/todo` to verify the Task Manager.
- Verify utility pages: `/q1`, `/emi`, `/hotel`.

---

## 6. Verifying Data Persistence

To confirm your data survives redeployments and restarts:

1. Open `/todo` on your live Render URL.
2. Create a test task:
   - **Title:** `Production Persistence Test`
   - **Priority:** `High`
   - **Due Date:** Tomorrow's date
3. In the Render Dashboard for your service, navigate to **Manual Deploy** &rarr; **Clear build cache & deploy** (or **Restart Service**).
4. Wait for the service to come back online.
5. Refresh `/todo`:
   - Confirm `Production Persistence Test` remains in the task list.
   - Confirm the dashboard summary counts match the persisted state.
6. Delete the test task after verification.

---

## 7. SQLite Backup & Restoration Procedures

Because SQLite stores all data in a single file on the persistent disk, backups are fast and reliable.

### Creating a Backup via Render Shell
1. In the Render Dashboard, navigate to your Web Service and open the **Shell** tab.
2. Create a timestamped backup inside the persistent directory:
   ```bash
   sqlite3 /var/data/todos.db ".backup '/var/data/todos_backup_$(date +%F).db'"
   ```
3. Alternatively, copy the database using standard file commands while SQLite is in WAL mode:
   ```bash
   cp /var/data/todos.db /var/data/todos_backup.db
   ```

### Restoring from Backup
If you ever need to restore the database from a backup file:
1. In the Render Shell:
   ```bash
   # Stop server writes or restart service immediately after restore
   cp /var/data/todos_backup.db /var/data/todos.db
   ```
2. Restart the service from the Render Dashboard to ensure any active database connections re-read the file.

---

## 8. Operational Characteristics & Architecture Limitations

### A. Single Instance (Horizontal Scaling Constraint)
- SQLite relies on filesystem-level locks (POSIX locks) for concurrency control.
- Because Render persistent disks can only be mounted to a single Web Service instance at a time, this application must run as a **single instance** (`numInstances: 1`).
- Attempting to scale horizontally across multiple instances would result in database corruption or locked database errors.

### B. Single-User / Public Workspace Model
- This application currently operates without user authentication or tenant isolation.
- Anyone with the public URL can create, complete, edit, or delete tasks.
- **Security Recommendation:** Do not store proprietary or sensitive personal information in task descriptions. If required for private use, restrict access using HTTP Basic Authentication or keep the service private.

---

## 9. Troubleshooting Common Issues

| Issue | Cause | Solution |
|---|---|---|
| **Health Check Failed (503)** | SQLite cannot open `/var/data/todos.db` due to missing directory or permissions. | Verify the disk mount path in Render settings is `/var/data` and `DATABASE_PATH` is `/var/data/todos.db`. The application automatically calls `fs.mkdirSync(dir, { recursive: true })` on startup. |
| **Data Resets on Restart** | The persistent disk is not attached, or `DATABASE_PATH` points to the default local path (`data/todos.db`) on the ephemeral container disk. | Confirm in the Render Dashboard under **Disks** that `todo-data` is mounted to `/var/data`, and `DATABASE_PATH=/var/data/todos.db` is set under Environment Variables. |
| **`better-sqlite3` Build Error** | Missing build tools or incompatibility during `npm install`. | The project uses `better-sqlite3` v13+, which ships with precompiled binaries for Linux x64 (glibc). Standard Node 18/20/22/24 environments on Render install cleanly without needing `node-gyp`. |
| **API Returns 400 on Updates** | Client passed empty JSON body or protected fields (`id`, `created_at`). | Ensure PATCH payloads include at least one valid editable field (`title`, `description`, `completed`, `priority`, `dueDate`). |
