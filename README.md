# To-Do Task Manager & Web Hub

A lightweight, responsive Task Management application and multi-utility web hub built with Node.js, Express, and Vanilla JavaScript.

---

## Overview

This repository provides an interactive task manager alongside utility web tools served via an Express web server:
- **Todo Application (`/todo`):** Dark-mode task manager featuring task creation, status toggling, deletion, filtering, and local persistence.
- **EMI Loan Calculator (`/emi`):** Dynamic monthly loan installment and amortization calculator.
- **Hotel Bill Screen (`/hotel`):** Receipt generator with itemized selection and automated GST calculation.
- **Deploying React Case Study (`/q1`):** Technical case study on deployment strategies for modern dynamic Single-Page Applications.
- **Navigation Hub (`/`):** Unified portal providing access to all tools.

---

## Prerequisites

- **Node.js:** v18.0.0 or later (v20+ recommended)
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
   The application will start on `http://localhost:3000` (or the port specified by the `PORT` environment variable).

---

## Running Automated Tests

The project includes an automated test suite utilizing Node.js native test runner (`node:test` and `node:assert`):

```bash
npm test
```

### What is tested:
- Express server route resolution (`/`, `/todo`, `/q1`, `/emi`, `/hotel`, `/css/todo.css`, `/js/todo.js`)
- Unmatched route handling (404 status and message)
- Resilience against corrupted or malformed `localStorage` data
- XSS prevention (ensuring raw HTML tags and script payloads are treated strictly as text)
- Task filtering logic (All, Pending, Completed)
- Batch removal of completed tasks

---

## Implemented Features

### Task Management (`/todo`)
- **Add Tasks:** Enter task titles with automatic whitespace trimming and empty submission guards.
- **Toggle Completion:** Click or press Space/Enter on checkboxes to switch between active and completed states.
- **Delete Tasks:** Remove individual tasks with accessible delete buttons.
- **Filter Views:** Filter between `All`, `Pending`, and `Completed` tasks.
- **Clear Completed:** Conditionally visible button to batch remove completed tasks.
- **Live Counter:** Dynamic counter reflecting remaining active items.
- **Local Persistence:** Automatic synchronization to browser `localStorage`.
- **Keyboard Accessibility:** Full keyboard support (`Tab`, `Space`, `Enter`) and ARIA attributes for screen readers.
- **Security Hardening:** Safe DOM creation and `textContent` injection preventing Cross-Site Scripting (XSS).

---

## Architecture & Technology Stack

- **Runtime & Server:** Node.js, Express 5 (`server.js`)
- **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript
- **Styling:** Custom CSS variables, dark-mode design system, Google Fonts (`Outfit`, `Inter`, `Roboto`)
- **State Management:** Native browser `localStorage`
- **Testing:** Node.js built-in `node:test` runner

---

## Known Limitations

- **No Remote Database:** Data is stored exclusively in the browser's `localStorage`; tasks do not sync across different browsers or devices.
- **No User Accounts:** Operates in single-user anonymous mode without authentication or authorization.
- **No Inline Editing:** Existing tasks cannot be edited in place (they must be deleted and recreated).
- **No Advanced Metadata:** Tasks do not currently support due dates, priority tags, categories, or text search.
