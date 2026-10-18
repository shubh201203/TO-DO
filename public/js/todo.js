document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const list = document.getElementById('todo-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let todos = loadTodos();
    let currentFilter = 'all';

    // Initial render
    renderTodos();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            addTodo(text);
            input.value = '';
        }
    });

    clearCompletedBtn.addEventListener('click', () => {
        todos = todos.filter(todo => !todo.completed);
        saveTodos();
        renderTodos();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            renderTodos();
        });
    });

    function loadTodos() {
        try {
            const raw = localStorage.getItem('todos');
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
            console.error('Error reading todos from localStorage:', err);
            return [];
        }
    }

    function addTodo(text) {
        const todo = {
            id: Date.now().toString(),
            text,
            completed: false
        };
        todos.unshift(todo);
        saveTodos();
        renderTodos();
    }

    function toggleTodo(id) {
        todos = todos.map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        saveTodos();
        renderTodos();
    }

    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
    }

    function saveTodos() {
        try {
            localStorage.setItem('todos', JSON.stringify(todos));
        } catch (err) {
            console.error('Failed to save todos to localStorage:', err);
        }
    }

    function renderTodos() {
        list.innerHTML = '';
        
        let filteredTodos = todos;
        if (currentFilter === 'pending') {
            filteredTodos = todos.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTodos = todos.filter(t => t.completed);
        }

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox';
            checkbox.dataset.id = todo.id;
            checkbox.setAttribute('role', 'checkbox');
            checkbox.setAttribute('aria-checked', todo.completed ? 'true' : 'false');
            checkbox.setAttribute('tabindex', '0');
            checkbox.setAttribute('aria-label', `Mark task "${todo.text}" as ${todo.completed ? 'pending' : 'completed'}`);
            checkbox.addEventListener('click', () => toggleTodo(todo.id));
            checkbox.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleTodo(todo.id);
                }
            });

            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = todo.text; // Safe: textContent ensures plain text rendering, zero XSS execution

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = todo.id;
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('aria-label', `Delete task "${todo.text}"`);
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            li.appendChild(checkbox);
            li.appendChild(taskText);
            li.appendChild(deleteBtn);
            
            list.appendChild(li);
        });

        updateFooter();
    }

    function updateFooter() {
        const activeCount = todos.filter(t => !t.completed).length;
        taskCount.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
        
        const hasCompleted = todos.some(t => t.completed);
        clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
    }
});
