const { Pool } = require('pg');

let pool = null;

function formatDueDate(val) {
    if (!val) return null;
    if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(val).split('T')[0];
}

function formatTimestamp(val) {
    if (!val) return null;
    if (val instanceof Date) {
        return val.toISOString().replace('T', ' ').substring(0, 19);
    }
    return String(val);
}

function mapTodo(row) {
    if (!row) return null;
    return {
        id: Number(row.id),
        title: row.title,
        description: row.description || '',
        completed: Boolean(row.completed),
        priority: row.priority || 'medium',
        dueDate: formatDueDate(row.due_date),
        createdAt: formatTimestamp(row.created_at),
        updatedAt: formatTimestamp(row.updated_at)
    };
}

async function initDb(customUrl = null, customPool = null) {
    if (customPool) {
        pool = customPool;
    } else {
        const connectionString = customUrl || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required for PostgreSQL mode.');
        }

        const poolConfig = {
            connectionString,
            max: parseInt(process.env.DB_POOL_MAX || '10', 10),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        };

        // Enable SSL by default unless explicitly disabled via DATABASE_SSL=false
        if (process.env.DATABASE_SSL !== 'false') {
            poolConfig.ssl = { rejectUnauthorized: false };
        }

        pool = new Pool(poolConfig);
        pool.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client:', err.message || err);
        });
    }

    // Verify connection and create schema idempotently
    const client = await pool.connect();
    try {
        await client.query(`
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
        `);
    } finally {
        client.release();
    }

    return pool;
}

function getDb() {
    if (!pool) {
        throw new Error('PostgreSQL database not initialized. Call initDb() first.');
    }
    return pool;
}

async function closeDb() {
    if (pool) {
        try {
            await pool.end();
        } catch (e) {
            // Ignore if already ended
        }
        pool = null;
    }
}

async function getAllTodos(options = {}) {
    const db = getDb();
    const { status, priority, search, sortBy, sortOrder } = options;

    const conditions = [];
    const params = [];

    if (status === 'pending') {
        conditions.push('completed = FALSE');
    } else if (status === 'completed') {
        conditions.push('completed = TRUE');
    }

    if (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) {
        params.push(priority.toLowerCase());
        conditions.push(`priority = $${params.length}`);
    }

    if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        const idx = params.length;
        conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const direction = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    let orderClause = 'ORDER BY id DESC';
    if (sortBy === 'dueDate' || sortBy === 'due_date') {
        orderClause = `ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ${direction}, id DESC`;
    } else if (sortBy === 'priority') {
        orderClause = `ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ${direction}, id DESC`;
    } else if (sortBy === 'title') {
        orderClause = `ORDER BY LOWER(title) ${direction}`;
    } else if (sortBy === 'createdAt' || sortBy === 'created_at') {
        orderClause = `ORDER BY created_at ${direction}, id ${direction}`;
    }

    const sql = `SELECT * FROM todos ${whereClause} ${orderClause}`;
    const result = await db.query(sql, params);
    return result.rows.map(mapTodo);
}

async function getTodoById(id) {
    const db = getDb();
    const result = await db.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return mapTodo(result.rows[0]);
}

async function createTodo({ title, description = '', priority = 'medium', dueDate = null }) {
    const db = getDb();
    const sql = `
        INSERT INTO todos (title, description, priority, due_date, completed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
    `;
    const result = await db.query(sql, [
        title.trim(),
        (description || '').trim(),
        priority.toLowerCase(),
        dueDate || null
    ]);
    return mapTodo(result.rows[0]);
}

async function updateTodo(id, updates = {}) {
    const db = getDb();
    const existing = await getTodoById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        params.push(updates.title.trim());
    }

    if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        params.push((updates.description || '').trim());
    }

    if (updates.completed !== undefined) {
        fields.push(`completed = $${paramIndex++}`);
        params.push(Boolean(updates.completed));
    }

    if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        params.push(updates.priority.toLowerCase());
    }

    if (updates.dueDate !== undefined || updates.due_date !== undefined) {
        const val = updates.dueDate !== undefined ? updates.dueDate : updates.due_date;
        fields.push(`due_date = $${paramIndex++}`);
        params.push(val || null);
    }

    if (fields.length === 0) {
        return existing;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE todos SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(sql, params);
    return mapTodo(result.rows[0]);
}

async function deleteTodo(id) {
    const db = getDb();
    const result = await db.query('DELETE FROM todos WHERE id = $1', [id]);
    return result.rowCount > 0;
}

async function getDashboardCounts() {
    const db = getDb();
    const sql = `
        SELECT 
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE completed = FALSE)::int AS pending,
            COUNT(*) FILTER (WHERE completed = TRUE)::int AS completed,
            COUNT(*) FILTER (WHERE completed = FALSE AND due_date IS NOT NULL AND due_date < CURRENT_DATE)::int AS overdue
        FROM todos
    `;
    const result = await db.query(sql);
    const row = result.rows[0] || {};
    return {
        total: Number(row.total || 0),
        pending: Number(row.pending || 0),
        completed: Number(row.completed || 0),
        overdue: Number(row.overdue || 0)
    };
}

async function checkHealth() {
    try {
        const db = getDb();
        const result = await db.query('SELECT 1 as healthy');
        return Boolean(result.rows.length > 0 && Number(result.rows[0].healthy) === 1);
    } catch (err) {
        return false;
    }
}

function getDriverName() {
    return 'postgres';
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
    getDriverName,
    formatDueDate,
    formatTimestamp
};
