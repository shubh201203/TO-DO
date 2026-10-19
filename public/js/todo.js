document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const form = document.getElementById('todo-form');
    const inputTitle = document.getElementById('todo-input');
    const inputDesc = document.getElementById('todo-desc');
    const selectPriority = document.getElementById('todo-priority');
    const inputDueDate = document.getElementById('todo-due-date');
    const addBtn = document.getElementById('add-btn');

    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterPriority = document.getElementById('filter-priority');
    const sortBySelect = document.getElementById('sort-by');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    const list = document.getElementById('todo-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const statusBanner = document.getElementById('status-banner');

    // Dashboard stat elements
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statCompleted = document.getElementById('stat-completed');
    const statOverdue = document.getElementById('stat-overdue');

    // Edit modal elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editIdInput = document.getElementById('edit-id');
    const editTitleInput = document.getElementById('edit-title');
    const editDescInput = document.getElementById('edit-desc');
    const editPriorityInput = document.getElementById('edit-priority');
    const editDueDateInput = document.getElementById('edit-due-date');
    const editCancelBtn = document.getElementById('edit-cancel-btn');

    // Delete modal elements
    const deleteModal = document.getElementById('delete-modal');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    let taskPendingDeleteId = null;

    // Filter & sort state
    let currentFilter = 'all';
    let currentPriority = '';
    let currentSearch = '';
    let currentSort = 'createdAt';
    let searchDebounceTimeout = null;

    // Initial load
    fetchTodos();
    fetchSummary();

    // Event: Create Task
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = inputTitle.value.trim();
        if (!title) return;

        const description = inputDesc.value.trim();
        const priority = selectPriority.value;
        const dueDate = inputDueDate.value || null;

        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        try {
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, dueDate })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create task.');
            }

            // Reset form fields
            inputTitle.value = '';
            inputDesc.value = '';
            selectPriority.value = 'medium';
            inputDueDate.value = '';

            showBanner('Task created successfully!', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message, 'error');
        } finally {
            addBtn.disabled = false;
            addBtn.textContent = 'Add Task';
        }
    });

    // Event: Search Input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        clearSearchBtn.style.display = query ? 'block' : 'none';

        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            currentSearch = query.trim();
            fetchTodos();
        }, 250);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        fetchTodos();
    });

    // Event: Status Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            fetchTodos();
        });
    });

    // Event: Priority Filter
    filterPriority.addEventListener('change', () => {
        currentPriority = filterPriority.value;
        fetchTodos();
    });

    // Event: Sort Option
    sortBySelect.addEventListener('change', () => {
        currentSort = sortBySelect.value;
        fetchTodos();
    });

    // Event: Reset Filters
    resetFiltersBtn.addEventListener('click', () => {
        currentFilter = 'all';
        currentPriority = '';
        currentSearch = '';
        currentSort = 'createdAt';

        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        filterPriority.value = '';
        sortBySelect.value = 'createdAt';

        filterBtns.forEach(b => {
            if (b.dataset.filter === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });

        fetchTodos();
    });

    // Event: Clear Completed
    clearCompletedBtn.addEventListener('click', async () => {
        try {
            // Fetch completed tasks to delete
            const res = await fetch('/api/todos?status=completed');
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to retrieve completed tasks.');
            }

            const completedTasks = data.data;
            if (completedTasks.length === 0) return;

            // Delete completed tasks concurrently
            await Promise.all(completedTasks.map(t =>
                fetch(`/api/todos/${t.id}`, { method: 'DELETE' })
            ));

            showBanner(`Cleared ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''}.`, 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message, 'error');
        }
    });

    // Modal: Cancel Edit
    editCancelBtn.addEventListener('click', () => {
        closeEditModal();
    });

    // Modal: Save Edit
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const title = editTitleInput.value.trim();
        if (!title) return;

        const description = editDescInput.value.trim();
        const priority = editPriorityInput.value;
        const dueDate = editDueDateInput.value || null;

        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, dueDate })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update task.');
            }

            closeEditModal();
            showBanner('Task updated successfully.', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message, 'error');
        }
    });

    // Modal: Delete Confirm & Cancel
    deleteCancelBtn.addEventListener('click', () => {
        closeDeleteModal();
    });

    deleteConfirmBtn.addEventListener('click', async () => {
        if (!taskPendingDeleteId) return;
        const id = taskPendingDeleteId;
        closeDeleteModal();

        try {
            const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete task.');
            }

            showBanner('Task deleted.', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message, 'error');
        }
    });

    // Keyboard support: Escape closes open modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeDeleteModal();
        }
    });

    // API: Fetch Todos
    async function fetchTodos() {
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';

        const params = new URLSearchParams();
        if (currentFilter !== 'all') params.append('status', currentFilter);
        if (currentPriority) params.append('priority', currentPriority);
        if (currentSearch) params.append('search', currentSearch);
        if (currentSort) params.append('sortBy', currentSort);

        try {
            const res = await fetch(`/api/todos?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Could not load tasks.');
            }

            renderTodoList(data.data);
        } catch (err) {
            list.innerHTML = '';
            showBanner(err.message, 'error');
        } finally {
            loadingState.style.display = 'none';
        }
    }

    // API: Fetch Dashboard Summary Counts
    async function fetchSummary() {
        try {
            const res = await fetch('/api/todos/summary');
            const data = await res.json();
            if (res.ok && data.success) {
                const s = data.data;
                statTotal.textContent = s.total;
                statPending.textContent = s.pending;
                statCompleted.textContent = s.completed;
                statOverdue.textContent = s.overdue;

                taskCount.textContent = `${s.pending} item${s.pending !== 1 ? 's' : ''} left`;
                clearCompletedBtn.style.display = s.completed > 0 ? 'block' : 'none';
            }
        } catch (err) {
            console.error('Failed to update summary counts:', err);
        }
    }

    // Safe DOM Rendering for Todo List
    function renderTodoList(todos) {
        list.innerHTML = '';

        if (!todos || todos.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            // Custom Checkbox
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox';
            checkbox.setAttribute('role', 'checkbox');
            checkbox.setAttribute('aria-checked', todo.completed ? 'true' : 'false');
            checkbox.setAttribute('tabindex', '0');
            checkbox.setAttribute('aria-label', `Mark task "${todo.title}" as ${todo.completed ? 'pending' : 'completed'}`);
            checkbox.addEventListener('click', () => toggleTodo(todo.id, !todo.completed));
            checkbox.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleTodo(todo.id, !todo.completed);
                }
            });

            // Task Body
            const body = document.createElement('div');
            body.className = 'task-body';

            const title = document.createElement('span');
            title.className = 'task-title';
            title.textContent = todo.title; // Safe plain text
            body.appendChild(title);

            if (todo.description && todo.description.trim()) {
                const desc = document.createElement('span');
                desc.className = 'task-description';
                desc.textContent = todo.description;
                body.appendChild(desc);
            }

            // Meta tags (Priority & Due Date)
            const metaTags = document.createElement('div');
            metaTags.className = 'task-meta-tags';

            const priorityBadge = document.createElement('span');
            priorityBadge.className = `badge priority-${todo.priority}`;
            priorityBadge.textContent = todo.priority;
            metaTags.appendChild(priorityBadge);

            if (todo.dueDate) {
                const dueDateBadge = document.createElement('span');
                const isOverdue = !todo.completed && isDatePast(todo.dueDate);
                dueDateBadge.className = `badge due-date ${isOverdue ? 'overdue' : ''}`;
                dueDateBadge.textContent = isOverdue ? `Overdue: ${todo.dueDate}` : `Due: ${todo.dueDate}`;
                metaTags.appendChild(dueDateBadge);
            }

            body.appendChild(metaTags);

            // Task Actions (Edit & Delete)
            const actions = document.createElement('div');
            actions.className = 'task-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'icon-btn edit-btn';
            editBtn.setAttribute('aria-label', `Edit task "${todo.title}"`);
            editBtn.textContent = '✎';
            editBtn.addEventListener('click', () => openEditModal(todo));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'icon-btn delete-btn';
            deleteBtn.setAttribute('aria-label', `Delete task "${todo.title}"`);
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => openDeleteModal(todo.id, todo.title));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(checkbox);
            li.appendChild(body);
            li.appendChild(actions);

            list.appendChild(li);
        });
    }

    // API: Toggle Completed
    async function toggleTodo(id, newStatus) {
        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: newStatus })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update task status.');
            }

            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message, 'error');
        }
    }

    // Modal Helpers
    function openEditModal(todo) {
        editIdInput.value = todo.id;
        editTitleInput.value = todo.title;
        editDescInput.value = todo.description || '';
        editPriorityInput.value = todo.priority || 'medium';
        editDueDateInput.value = todo.dueDate || '';

        editModal.style.display = 'flex';
        editTitleInput.focus();
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
    }

    function openDeleteModal(id, title) {
        taskPendingDeleteId = id;
        const text = document.getElementById('delete-modal-text');
        text.textContent = `Are you sure you want to delete "${title}"? This cannot be undone.`;
        deleteModal.style.display = 'flex';
        deleteConfirmBtn.focus();
    }

    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        taskPendingDeleteId = null;
    }

    function isDatePast(dateStr) {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        return target < today;
    }

    function showBanner(message, type = 'info') {
        statusBanner.textContent = message;
        statusBanner.className = `status-banner ${type}`;
        statusBanner.style.display = 'flex';

        setTimeout(() => {
            if (statusBanner.textContent === message) {
                statusBanner.style.display = 'none';
            }
        }, 4000);
    }
});
