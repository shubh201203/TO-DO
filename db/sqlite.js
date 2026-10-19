const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbInstance = null;
let currentPath = null;

async function initDb(customPath = null) {
    const dbPath = customPath || process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'todos.db');

    if (dbPath !== ':memory:') {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    const db = new Database(dbPath);
    if (dbPath !== ':memory:') {
        db.pragma('journal_mode = WAL');
    }
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    db.exec(`
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
    `);

    dbInstance = db;
    currentPath = dbPath;
    return dbInstance;
}

function getDb(customPath = null) {
    if (!dbInstance) {
        initDb(customPath);
    }
    return dbInstance;
}

async function closeDb() {
    if (dbInstance) {
        try {
            dbInstance.close();
        } catch (e) {
            // Ignore if already closed
        }
        dbInstance = null;
        currentPath = null;
    }
}

function mapTodo(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        completed: Boolean(row.completed),
        priority: row.priority || 'medium',
        dueDate: row.due_date || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function getAllTodos(options = {}) {
    const db = getDb();
    const { status, priority, search, sortBy, sortOrder } = options;

    const conditions = [];
    const params = [];

    if (status === 'pending') {
        conditions.push('completed = 0');
    } else if (status === 'completed') {
        conditions.push('completed = 1');
    }

    if (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) {
        conditions.push('priority = ?');
        params.push(priority.toLowerCase());
    }

    if (search && search.trim()) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const direction = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    let orderClause = 'ORDER BY id DESC';
    if (sortBy === 'dueDate' || sortBy === 'due_date') {
        orderClause = `ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ${direction}, id DESC`;
    } else if (sortBy === 'priority') {
        orderClause = `ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ${direction}, id DESC`;
    } else if (sortBy === 'title') {
        orderClause = `ORDER BY title COLLATE NOCASE ${direction}`;
    } else if (sortBy === 'createdAt' || sortBy === 'created_at') {
        orderClause = `ORDER BY created_at ${direction}, id ${direction}`;
    }

    const sql = `SELECT * FROM todos ${whereClause} ${orderClause}`;
    const rows = db.prepare(sql).all(...params);
    return rows.map(mapTodo);
}

async function getTodoById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    return mapTodo(row);
}

async function createTodo({ title, description = '', priority = 'medium', dueDate = null }) {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO todos (title, description, priority, due_date, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `);
    const result = stmt.run(title.trim(), (description || '').trim(), priority.toLowerCase(), dueDate || null);
    return getTodoById(result.lastInsertRowid);
}

async function updateTodo(id, updates = {}) {
    const db = getDb();
    const existing = await getTodoById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];

    if (updates.title !== undefined) {
        fields.push('title = ?');
        params.push(updates.title.trim());
    }

    if (updates.description !== undefined) {
        fields.push('description = ?');
        params.push((updates.description || '').trim());
    }

    if (updates.completed !== undefined) {
        fields.push('completed = ?');
        params.push(updates.completed ? 1 : 0);
    }

    if (updates.priority !== undefined) {
        fields.push('priority = ?');
        params.push(updates.priority.toLowerCase());
    }

    if (updates.dueDate !== undefined || updates.due_date !== undefined) {
        const val = updates.dueDate !== undefined ? updates.dueDate : updates.due_date;
        fields.push('due_date = ?');
        params.push(val || null);
    }

    if (fields.length === 0) {
        return existing;
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    const sql = `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return getTodoById(id);
}

async function deleteTodo(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
}

async function getDashboardCounts() {
    const db = getDb();
    const totalRow = db.prepare('SELECT count(*) as count FROM todos').get();
    const pendingRow = db.prepare('SELECT count(*) as count FROM todos WHERE completed = 0').get();
    const completedRow = db.prepare('SELECT count(*) as count FROM todos WHERE completed = 1').get();
    const overdueRow = db.prepare(`
        SELECT count(*) as count FROM todos 
        WHERE completed = 0 
          AND due_date IS NOT NULL 
          AND due_date != '' 
          AND date(due_date) < date('now')
    `).get();

    return {
        total: totalRow.count,
        pending: pendingRow.count,
        completed: completedRow.count,
        overdue: overdueRow.count
    };
}

async function checkHealth() {
    try {
        const db = getDb();
        const row = db.prepare('SELECT 1 as healthy').get();
        return Boolean(row && row.healthy === 1);
    } catch (err) {
        return false;
    }
}

function getDriverName() {
    return 'sqlite';
}

module.exports = {
    initDb,
    getDb,
    closeDb,
    mapTodo,
    getAllTodos,
    getTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
    getDashboardCounts,
    checkHealth,
    getDriverName
};
