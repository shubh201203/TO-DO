const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db/database');

test('SQLite Database Module Unit Tests', async (t) => {
    t.beforeEach(() => {
        // Initialize fresh in-memory database before each test
        db.closeDb();
        db.initDb(':memory:');
    });

    t.after(() => {
        db.closeDb();
    });

    await t.test('Creates and retrieves tasks with default fields', () => {
        const todo = db.createTodo({ title: 'Buy Groceries' });
        assert.ok(todo.id > 0);
        assert.equal(todo.title, 'Buy Groceries');
        assert.equal(todo.description, '');
        assert.equal(todo.completed, false);
        assert.equal(todo.priority, 'medium');
        assert.equal(todo.dueDate, null);
        assert.ok(todo.createdAt);
        assert.ok(todo.updatedAt);

        const fetched = db.getTodoById(todo.id);
        assert.deepEqual(fetched, todo);
    });

    await t.test('Creates task with custom metadata', () => {
        const todo = db.createTodo({
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

    await t.test('Updates task completion and fields', () => {
        const todo = db.createTodo({ title: 'Read Book' });
        const updated = db.updateTodo(todo.id, {
            completed: true,
            priority: 'low',
            title: 'Read Book - Finished'
        });

        assert.equal(updated.completed, true);
        assert.equal(updated.priority, 'low');
        assert.equal(updated.title, 'Read Book - Finished');

        const reFetched = db.getTodoById(todo.id);
        assert.equal(reFetched.completed, true);
    });

    await t.test('Ignores unsupported fields during update', () => {
        const todo = db.createTodo({ title: 'Test Task' });
        const originalId = todo.id;
        const updated = db.updateTodo(todo.id, {
            id: 9999, // Should NOT overwrite primary key
            isAdmin: true, // Should be ignored
            title: 'Safe Title'
        });

        assert.equal(updated.id, originalId);
        assert.equal(updated.title, 'Safe Title');
        assert.equal(updated.isAdmin, undefined);
    });

    await t.test('Deletes task properly', () => {
        const todo = db.createTodo({ title: 'Temporary task' });
        assert.ok(db.getTodoById(todo.id));

        const deleted = db.deleteTodo(todo.id);
        assert.equal(deleted, true);
        assert.equal(db.getTodoById(todo.id), null);

        // Deleting non-existent returns false
        assert.equal(db.deleteTodo(999999), false);
    });

    await t.test('Filters and searches tasks accurately', () => {
        db.createTodo({ title: 'Write unit tests', description: 'Backend suite', priority: 'high' });
        db.createTodo({ title: 'Review pull request', description: 'Security audit', priority: 'medium' });
        const t3 = db.createTodo({ title: 'Water the plants', description: 'Living room', priority: 'low' });
        db.updateTodo(t3.id, { completed: true });

        // Filter: Pending
        const pending = db.getAllTodos({ status: 'pending' });
        assert.equal(pending.length, 2);

        // Filter: Completed
        const completed = db.getAllTodos({ status: 'completed' });
        assert.equal(completed.length, 1);
        assert.equal(completed[0].title, 'Water the plants');

        // Filter: Priority
        const highPriority = db.getAllTodos({ priority: 'high' });
        assert.equal(highPriority.length, 1);
        assert.equal(highPriority[0].title, 'Write unit tests');

        // Search: in title or description
        const searchAudit = db.getAllTodos({ search: 'audit' });
        assert.equal(searchAudit.length, 1);
        assert.equal(searchAudit[0].title, 'Review pull request');
    });

    await t.test('Calculates dashboard summary counts including overdue tasks', () => {
        // Pending task without due date
        db.createTodo({ title: 'Task 1' });

        // Pending overdue task (past date)
        db.createTodo({ title: 'Overdue task', dueDate: '2020-01-01' });

        // Pending future task
        db.createTodo({ title: 'Future task', dueDate: '2099-01-01' });

        // Completed task that had a past due date (should NOT count as overdue)
        const t4 = db.createTodo({ title: 'Completed old task', dueDate: '2020-01-01' });
        db.updateTodo(t4.id, { completed: true });

        const counts = db.getDashboardCounts();
        assert.equal(counts.total, 4);
        assert.equal(counts.pending, 3);
        assert.equal(counts.completed, 1);
        assert.equal(counts.overdue, 1);
    });
});
