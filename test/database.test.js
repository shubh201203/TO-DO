const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db/database');
const postgres = require('../db/postgres');

test('Database Module Unit Tests (SQLite in-memory)', async (t) => {
    t.beforeEach(async () => {
        // Initialize fresh in-memory database before each test
        await db.closeDb();
        await db.initDb(':memory:');
    });

    t.after(async () => {
        await db.closeDb();
    });

    await t.test('Creates and retrieves tasks with default fields', async () => {
        const todo = await db.createTodo({ title: 'Buy Groceries' });
        assert.ok(todo.id > 0);
        assert.equal(todo.title, 'Buy Groceries');
        assert.equal(todo.description, '');
        assert.equal(todo.completed, false);
        assert.equal(todo.priority, 'medium');
        assert.equal(todo.dueDate, null);
        assert.ok(todo.createdAt);
        assert.ok(todo.updatedAt);

        const fetched = await db.getTodoById(todo.id);
        assert.deepEqual(fetched, todo);
    });

    await t.test('Creates task with custom metadata', async () => {
        const todo = await db.createTodo({
            title: 'Prepare Tax Returns',
            description: 'Gather all receipts and W2 forms',
            priority: 'high',
            dueDate: '2026-12-31'
        });

        assert.equal(todo.title, 'Prepare Tax Returns');
        assert.equal(todo.description, 'Gather all receipts and W2 forms');
        assert.equal(todo.priority, 'high');
        assert.equal(todo.dueDate, '2026-12-31');
        assert.equal(todo.completed, false);
    });

    await t.test('Updates task completion and fields', async () => {
        const todo = await db.createTodo({ title: 'Read Book' });
        const updated = await db.updateTodo(todo.id, {
            completed: true,
            priority: 'low',
            title: 'Read Book - Finished'
        });

        assert.equal(updated.completed, true);
        assert.equal(updated.priority, 'low');
        assert.equal(updated.title, 'Read Book - Finished');

        const reFetched = await db.getTodoById(todo.id);
        assert.equal(reFetched.completed, true);
    });

    await t.test('Ignores unsupported fields during update', async () => {
        const todo = await db.createTodo({ title: 'Test Task' });
        const originalId = todo.id;
        const updated = await db.updateTodo(todo.id, {
            id: 9999, // Should NOT overwrite primary key
            isAdmin: true, // Should be ignored
            title: 'Safe Title'
        });

        assert.equal(updated.id, originalId);
        assert.equal(updated.title, 'Safe Title');
        assert.equal(updated.isAdmin, undefined);
    });

    await t.test('Deletes task properly', async () => {
        const todo = await db.createTodo({ title: 'Temporary task' });
        assert.ok(await db.getTodoById(todo.id));

        const deleted = await db.deleteTodo(todo.id);
        assert.equal(deleted, true);
        assert.equal(await db.getTodoById(todo.id), null);

        // Deleting non-existent returns false
        assert.equal(await db.deleteTodo(999999), false);
    });

    await t.test('Filters and searches tasks accurately', async () => {
        await db.createTodo({ title: 'Write unit tests', description: 'Backend suite', priority: 'high' });
        await db.createTodo({ title: 'Review pull request', description: 'Security audit', priority: 'medium' });
        const t3 = await db.createTodo({ title: 'Water the plants', description: 'Living room', priority: 'low' });
        await db.updateTodo(t3.id, { completed: true });

        // Filter: Pending
        const pending = await db.getAllTodos({ status: 'pending' });
        assert.equal(pending.length, 2);

        // Filter: Completed
        const completed = await db.getAllTodos({ status: 'completed' });
        assert.equal(completed.length, 1);
        assert.equal(completed[0].title, 'Water the plants');

        // Filter: Priority
        const highPriority = await db.getAllTodos({ priority: 'high' });
        assert.equal(highPriority.length, 1);
        assert.equal(highPriority[0].title, 'Write unit tests');

        // Search: in title or description
        const searchAudit = await db.getAllTodos({ search: 'audit' });
        assert.equal(searchAudit.length, 1);
        assert.equal(searchAudit[0].title, 'Review pull request');
    });

    await t.test('Calculates dashboard summary counts including overdue tasks', async () => {
        // Pending task without due date
        await db.createTodo({ title: 'Task 1' });

        // Pending overdue task (past date)
        await db.createTodo({ title: 'Overdue task', dueDate: '2020-01-01' });

        // Pending future task
        await db.createTodo({ title: 'Future task', dueDate: '2099-01-01' });

        // Completed task that had a past due date (should NOT count as overdue)
        const t4 = await db.createTodo({ title: 'Completed old task', dueDate: '2020-01-01' });
        await db.updateTodo(t4.id, { completed: true });

        const counts = await db.getDashboardCounts();
        assert.equal(counts.total, 4);
        assert.equal(counts.pending, 3);
        assert.equal(counts.completed, 1);
        assert.equal(counts.overdue, 1);
    });

    await t.test('checkHealth reports true for operational database instance', async () => {
        const isHealthy = await db.checkHealth();
        assert.equal(isHealthy, true);
    });
});

test('Database Driver Selection and Fail-Fast Tests', async (t) => {
    t.beforeEach(async () => {
        await db.closeDb();
    });

    t.afterEach(async () => {
        delete process.env.DATABASE_URL;
        await db.closeDb();
        await db.initDb(':memory:');
    });

    await t.test('Defaults to SQLite driver when DATABASE_URL is not set', async () => {
        delete process.env.DATABASE_URL;
        assert.equal(db.getDriverType(), 'sqlite');
        await db.initDb(':memory:');
        assert.equal(await db.checkHealth(), true);
    });

    await t.test('Selects PostgreSQL driver when DATABASE_URL is present', () => {
        process.env.DATABASE_URL = 'postgres://fakeuser:fakepass@localhost:5432/fakedb';
        assert.equal(db.getDriverType(), 'postgres');
    });

    await t.test('Fails fast when DATABASE_URL is set but connection is invalid (no silent fallback)', async () => {
        // Use a non-routable port on localhost to trigger connection failure quickly
        process.env.DATABASE_URL = 'postgres://fakeuser:fakepass@127.0.0.1:1/fakedb';
        await assert.rejects(
            async () => {
                await db.initDb();
            },
            (err) => {
                assert.ok(err);
                // Ensure it failed rather than silently switching back to SQLite
                assert.equal(db.getDriverType(), 'postgres');
                return true;
            }
        );
    });
});

test('PostgreSQL Adapter Unit Tests with Mock Pool', async (t) => {
    let queries = [];
    const mockClient = {
        query: async (sql, params) => {
            queries.push({ sql, params });
            return { rows: [] };
        },
        release: () => {}
    };
    const mockPool = {
        connect: async () => mockClient,
        query: async (sql, params) => {
            queries.push({ sql, params });
            if (sql.includes('SELECT 1 as healthy')) {
                return { rows: [{ healthy: 1 }] };
            }
            if (sql.includes('INSERT INTO todos')) {
                return {
                    rows: [{
                        id: 42,
                        title: params[0],
                        description: params[1],
                        completed: false,
                        priority: params[2],
                        due_date: params[3],
                        created_at: new Date('2026-01-01T12:00:00Z'),
                        updated_at: new Date('2026-01-01T12:00:00Z')
                    }]
                };
            }
            if (sql.includes('SELECT * FROM todos WHERE id = $1')) {
                if (params[0] === 42) {
                    return {
                        rows: [{
                            id: 42,
                            title: 'Mock Task',
                            description: 'Mock Description',
                            completed: false,
                            priority: 'high',
                            due_date: '2026-12-31',
                            created_at: '2026-01-01 12:00:00',
                            updated_at: '2026-01-01 12:00:00'
                        }]
                    };
                }
                return { rows: [] };
            }
            if (sql.includes('UPDATE todos SET')) {
                return {
                    rows: [{
                        id: params[params.length - 1],
                        title: 'Updated Task',
                        description: '',
                        completed: true,
                        priority: 'low',
                        due_date: null,
                        created_at: '2026-01-01 12:00:00',
                        updated_at: '2026-01-02 12:00:00'
                    }]
                };
            }
            if (sql.includes('DELETE FROM todos WHERE id = $1')) {
                return { rowCount: params[0] === 42 ? 1 : 0 };
            }
            if (sql.includes('COUNT(*)')) {
                return {
                    rows: [{
                        total: 10,
                        pending: 7,
                        completed: 3,
                        overdue: 2
                    }]
                };
            }
            return { rows: [] };
        },
        end: async () => {}
    };

    t.beforeEach(async () => {
        queries = [];
        await postgres.initDb(null, mockPool);
    });

    t.afterEach(async () => {
        await postgres.closeDb();
    });

    await t.test('Initializes schema and runs idempotent DDL', async () => {
        assert.ok(queries.length > 0);
        assert.match(queries[0].sql, /CREATE TABLE IF NOT EXISTS todos/);
    });

    await t.test('Creates task with parameterized query', async () => {
        const item = await postgres.createTodo({
            title: 'Deploy to Render',
            description: 'Neon PG backend',
            priority: 'high',
            dueDate: '2026-04-01'
        });
        assert.equal(item.id, 42);
        assert.equal(item.title, 'Deploy to Render');
        assert.equal(item.priority, 'high');
        assert.equal(item.dueDate, '2026-04-01');

        const insertQuery = queries.find(q => q.sql.includes('INSERT INTO todos'));
        assert.ok(insertQuery);
        assert.equal(insertQuery.params[0], 'Deploy to Render');
        assert.equal(insertQuery.params[1], 'Neon PG backend');
        assert.equal(insertQuery.params[2], 'high');
        assert.equal(insertQuery.params[3], '2026-04-01');
    });

    await t.test('Fetches task by ID and formats Date objects cleanly', async () => {
        const item = await postgres.getTodoById(42);
        assert.equal(item.id, 42);
        assert.equal(item.title, 'Mock Task');
        assert.equal(item.dueDate, '2026-12-31');

        const notFound = await postgres.getTodoById(999);
        assert.equal(notFound, null);
    });

    await t.test('Updates task and updates updated_at column', async () => {
        const updated = await postgres.updateTodo(42, { completed: true, priority: 'low' });
        assert.equal(updated.completed, true);
        assert.equal(updated.priority, 'low');

        const updateQuery = queries.find(q => q.sql.includes('UPDATE todos SET'));
        assert.ok(updateQuery);
        assert.match(updateQuery.sql, /updated_at = CURRENT_TIMESTAMP/);
    });

    await t.test('Deletes task and reports true/false based on rowCount', async () => {
        const deleted = await postgres.deleteTodo(42);
        assert.equal(deleted, true);

        const notDeleted = await postgres.deleteTodo(999);
        assert.equal(notDeleted, false);
    });

    await t.test('Calculates dashboard metrics accurately', async () => {
        const counts = await postgres.getDashboardCounts();
        assert.deepEqual(counts, {
            total: 10,
            pending: 7,
            completed: 3,
            overdue: 2
        });
    });

    await t.test('checkHealth returns true on operational pool', async () => {
        const healthy = await postgres.checkHealth();
        assert.equal(healthy, true);
    });

    await t.test('formatDueDate correctly handles Date instances, strings, and nulls', () => {
        assert.equal(postgres.formatDueDate(null), null);
        assert.equal(postgres.formatDueDate(undefined), null);
        assert.equal(postgres.formatDueDate('2026-05-15'), '2026-05-15');
        assert.equal(postgres.formatDueDate('2026-05-15T00:00:00.000Z'), '2026-05-15');
        const dt = new Date(2026, 4, 15); // May 15, 2026
        assert.equal(postgres.formatDueDate(dt), '2026-05-15');
    });
});
