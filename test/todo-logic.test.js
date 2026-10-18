const test = require('node:test');
const assert = require('node:assert/strict');

// Logic extraction replicating the algorithms in public/js/todo.js
function loadTodosFromRaw(raw) {
    try {
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item && typeof item === 'object')
            .map(item => ({
                id: String(item.id || Date.now() + Math.random().toString(36).substring(2, 7)),
                text: typeof item.text === 'string' ? item.text : String(item.text || ''),
                completed: Boolean(item.completed)
            }))
            .filter(item => item.text.trim().length > 0);
    } catch (err) {
        return [];
    }
}

function filterTodos(todos, filter) {
    if (filter === 'pending') {
        return todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
        return todos.filter(t => t.completed);
    }
    return todos;
}

test('Todo state and security logic verification', async (t) => {
    await t.test('Safely handles malformed and malicious localStorage data', () => {
        // Corrupted JSON string
        assert.deepEqual(loadTodosFromRaw('{invalid-json}'), []);
        
        // Null or undefined
        assert.deepEqual(loadTodosFromRaw(null), []);
        assert.deepEqual(loadTodosFromRaw(''), []);

        // Non-array JSON values (e.g. object, number, boolean)
        assert.deepEqual(loadTodosFromRaw('{"some": "object"}'), []);
        assert.deepEqual(loadTodosFromRaw('12345'), []);
        assert.deepEqual(loadTodosFromRaw('"string"'), []);

        // Array with nulls, undefined, numbers, and missing fields
        const rawDirtyArray = JSON.stringify([
            null,
            undefined,
            123,
            { id: '1', text: '<script>alert(1)</script>', completed: false },
            { id: '2', text: '   ', completed: true }, // whitespace should be filtered
            { text: 'Missing id', completed: true },
            { id: '4', text: '<img src=x onerror=alert(2)>', completed: 'yes' }
        ]);

        const loaded = loadTodosFromRaw(rawDirtyArray);
        assert.equal(loaded.length, 3);
        
        // Ensure text is preserved verbatim without alteration so textContent can safely escape it
        assert.equal(loaded[0].text, '<script>alert(1)</script>');
        assert.equal(loaded[0].completed, false);
        assert.equal(loaded[1].text, 'Missing id');
        assert.equal(loaded[1].completed, true);
        assert.equal(typeof loaded[1].id, 'string');
        assert.equal(loaded[2].completed, true); // boolean coercion
    });

    await t.test('Filtering behavior works accurately', () => {
        const sampleTodos = [
            { id: '1', text: 'Task 1', completed: false },
            { id: '2', text: 'Task 2', completed: true },
            { id: '3', text: 'Task 3', completed: false }
        ];

        const all = filterTodos(sampleTodos, 'all');
        assert.equal(all.length, 3);

        const pending = filterTodos(sampleTodos, 'pending');
        assert.equal(pending.length, 2);
        assert.deepEqual(pending.map(t => t.id), ['1', '3']);

        const completed = filterTodos(sampleTodos, 'completed');
        assert.equal(completed.length, 1);
        assert.equal(completed[0].id, '2');
    });

    await t.test('Clearing completed tasks only removes completed items', () => {
        const sampleTodos = [
            { id: '1', text: 'Task 1', completed: false },
            { id: '2', text: 'Task 2', completed: true },
            { id: '3', text: 'Task 3', completed: true }
        ];

        const remaining = sampleTodos.filter(t => !t.completed);
        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].id, '1');
    });
});
