const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('REST API Endpoint Integration Tests', async (t) => {
    let server;
    let baseUrl;

    t.before(() => {
        // Use an isolated in-memory SQLite database for the test server run
        db.closeDb();
        db.initDb(':memory:');

        return new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                const address = server.address();
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    });

    t.after(() => {
        return new Promise((resolve) => {
            server.close(() => {
                db.closeDb();
                resolve();
            });
        });
    });

    function request(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = `${baseUrl}${path}`;
            const reqOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            };

            const req = http.request(url, reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    let parsed = null;
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {
                        parsed = data;
                    }
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
                });
            });

            req.on('error', reject);

            if (options.body) {
                const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                req.write(bodyStr);
            }
            req.end();
        });
    }

    await t.test('POST /api/todos creates a task and returns 201', async () => {
        const payload = {
            title: 'Audit Codebase',
            description: 'Run automated checks and review diffs',
            priority: 'high',
            dueDate: '2026-10-30'
        };

        const res = await request('/api/todos', { method: 'POST', body: payload });
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.title, 'Audit Codebase');
        assert.equal(res.body.data.priority, 'high');
        assert.equal(res.body.data.completed, false);
        assert.ok(res.body.data.id > 0);
    });

    await t.test('POST /api/todos rejects empty or missing title with 400', async () => {
        const resEmpty = await request('/api/todos', { method: 'POST', body: { title: '   ' } });
        assert.equal(resEmpty.statusCode, 400);
        assert.equal(resEmpty.body.success, false);
        assert.match(resEmpty.body.error, /Title is required/);

        const resMissing = await request('/api/todos', { method: 'POST', body: { description: 'No title' } });
        assert.equal(resMissing.statusCode, 400);
        assert.equal(resMissing.body.success, false);
    });

    await t.test('POST /api/todos rejects invalid priority and date with 400', async () => {
        const resPriority = await request('/api/todos', {
            method: 'POST',
            body: { title: 'Valid title', priority: 'urgent_now' }
        });
        assert.equal(resPriority.statusCode, 400);
        assert.match(resPriority.body.error, /Priority must be 'low', 'medium', or 'high'/);

        const resDate = await request('/api/todos', {
            method: 'POST',
            body: { title: 'Valid title', dueDate: 'not-a-date' }
        });
        assert.equal(resDate.statusCode, 400);
        assert.match(resDate.body.error, /valid date string/);
    });

    await t.test('POST with malformed JSON payload returns 400', async () => {
        const res = await request('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{invalid json'
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
        assert.match(res.body.error, /Malformed JSON payload/);
    });

    await t.test('GET /api/todos returns task list and count', async () => {
        const res = await request('/api/todos');
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.count >= 1);
    });

    await t.test('GET /api/todos/:id returns single task or 404', async () => {
        const created = await request('/api/todos', {
            method: 'POST',
            body: { title: 'Inspect Item' }
        });
        const id = created.body.data.id;

        const res = await request(`/api/todos/${id}`);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data.id, id);
        assert.equal(res.body.data.title, 'Inspect Item');

        const notFound = await request('/api/todos/999999');
        assert.equal(notFound.statusCode, 404);
        assert.equal(notFound.body.success, false);

        const badId = await request('/api/todos/not-numeric');
        assert.equal(badId.statusCode, 400);
        assert.match(badId.body.error, /Invalid task ID format/);
    });

    await t.test('PATCH /api/todos/:id updates task completion and fields', async () => {
        const created = await request('/api/todos', {
            method: 'POST',
            body: { title: 'Initial Name', priority: 'low' }
        });
        const id = created.body.data.id;

        const updateRes = await request(`/api/todos/${id}`, {
            method: 'PATCH',
            body: { completed: true, title: 'Updated Name', priority: 'high' }
        });

        assert.equal(updateRes.statusCode, 200);
        assert.equal(updateRes.body.data.completed, true);
        assert.equal(updateRes.body.data.title, 'Updated Name');
        assert.equal(updateRes.body.data.priority, 'high');
    });

    await t.test('DELETE /api/todos/:id removes task', async () => {
        const created = await request('/api/todos', {
            method: 'POST',
            body: { title: 'To Be Deleted' }
        });
        const id = created.body.data.id;

        const delRes = await request(`/api/todos/${id}`, { method: 'DELETE' });
        assert.equal(delRes.statusCode, 200);
        assert.equal(delRes.body.success, true);

        const checkRes = await request(`/api/todos/${id}`);
        assert.equal(checkRes.statusCode, 404);
    });

    await t.test('GET /api/todos/summary returns dashboard metrics', async () => {
        const res = await request('/api/todos/summary');
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(typeof res.body.data.total === 'number');
        assert.ok(typeof res.body.data.pending === 'number');
        assert.ok(typeof res.body.data.completed === 'number');
        assert.ok(typeof res.body.data.overdue === 'number');
    });
});
