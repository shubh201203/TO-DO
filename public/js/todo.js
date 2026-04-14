document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const list = document.getElementById('todo-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let todos = JSON.parse(localStorage.getItem('todos')) || [];
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
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

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
        localStorage.setItem('todos', JSON.stringify(todos));
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
            
            li.innerHTML = `
                <div class="checkbox" data-id="${todo.id}"></div>
                <span class="task-text">${todo.text}</span>
                <button class="delete-btn" data-id="${todo.id}">&times;</button>
            `;
            
            list.appendChild(li);
        });

        // Add event listeners to generated elements
        document.querySelectorAll('.checkbox').forEach(box => {
            box.addEventListener('click', (e) => toggleTodo(e.target.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteTodo(e.target.dataset.id));
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
