const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

test('Server route verification and error handling', async (t) => {
    let server;
    let baseUrl;

    t.before(() => {
        return new Promise((resolve) => {
            // Bind to an ephemeral port (port 0) for isolated testing
            server = app.listen(0, '127.0.0.1', () => {
                const address = server.address();
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    });

    t.after(() => {
        return new Promise((resolve) => {
            server.close(resolve);
        });
    });

    function request(path) {
        return new Promise((resolve, reject) => {
            http.get(`${baseUrl}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
                });
            }).on('error', reject);
        });
    }

    await t.test('GET / serves Hub page with status 200', async () => {
        const res = await request('/');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /<title>WT Lab Assignment 12<\/title>/);
    });

    await t.test('GET /todo serves Todo App with status 200', async () => {
        const res = await request('/todo');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /<title>Node\.js Todo App<\/title>/);
        assert.match(res.body, /id="todo-form"/);
    });

    await t.test('GET /q1 serves Q1 Case Study with status 200', async () => {
        const res = await request('/q1');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /Deploying React/);
    });

    await t.test('GET /emi serves EMI Calculator with status 200', async () => {
        const res = await request('/emi');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /EMI Loan Calculator/);
    });

    await t.test('GET /hotel serves Hotel Bill Screen with status 200', async () => {
        const res = await request('/hotel');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /GREEN STAR HOTEL/);
    });

    await t.test('GET /js/todo.js serves hardened script with status 200', async () => {
        const res = await request('/js/todo.js');
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /textContent/);
        assert.match(res.body, /loadTodos/);
    });

    await t.test('GET /non-existent-route returns 404 Page not found', async () => {
        const res = await request('/non-existent-route');
        assert.equal(res.statusCode, 404);
        assert.match(res.body, /Page not found/);
    });
});
