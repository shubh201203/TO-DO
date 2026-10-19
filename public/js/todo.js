document.addEventListener('DOMContentLoaded', () => {
    // DOM elements - Creation form
    const form = document.getElementById('todo-form');
    const inputTitle = document.getElementById('todo-input');
    const inputDesc = document.getElementById('todo-desc');
    const selectPriority = document.getElementById('todo-priority');
    const inputDueDate = document.getElementById('todo-due-date');
    const addBtn = document.getElementById('add-btn');
    const quickAddLink = document.getElementById('quick-add-link');

    // DOM elements - Controls & Filters
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterPriority = document.getElementById('filter-priority');
    const sortBySelect = document.getElementById('sort-by');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // DOM elements - List & States
    const list = document.getElementById('todo-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const emptyStateText = document.getElementById('empty-state-text');
    const statusBanner = document.getElementById('status-banner');

    // DOM elements - Dashboard summary metrics
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statCompleted = document.getElementById('stat-completed');
    const statOverdue = document.getElementById('stat-overdue');

    // DOM elements - Edit Modal
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editIdInput = document.getElementById('edit-id');
    const editTitleInput = document.getElementById('edit-title');
    const editDescInput = document.getElementById('edit-desc');
    const editPriorityInput = document.getElementById('edit-priority');
    const editDueDateInput = document.getElementById('edit-due-date');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const editCloseX = document.getElementById('edit-close-x');
    const editSaveBtn = document.getElementById('edit-save-btn');

    // DOM elements - Delete Modal
    const deleteModal = document.getElementById('delete-modal');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    const deleteCloseX = document.getElementById('delete-close-x');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteModalText = document.getElementById('delete-modal-text');

    // Filter & Sort State
    let currentFilter = 'all';
    let currentPriority = '';
    let currentSearch = '';
    let currentSort = 'createdAt';
    let searchDebounceTimeout = null;

    // Race condition prevention: tracks active fetch request sequence
    let latestFetchId = 0;

    // Focus tracking for accessibility modal return
    let lastActiveTriggerElement = null;
    let taskPendingDeleteId = null;

    // Initial load
    fetchTodos();
    fetchSummary();

    // Quick add focus
    if (quickAddLink) {
        quickAddLink.addEventListener('click', (e) => {
            e.preventDefault();
            inputTitle.focus();
            inputTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // Event: Create Task
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = inputTitle.value.trim();
        if (!title) {
            showBanner('Please provide a task title.', 'error');
            inputTitle.focus();
            return;
        }

        const description = inputDesc.value.trim();
        const priority = selectPriority.value;
        const dueDate = inputDueDate.value || null;

        addBtn.disabled = true;
        const originalBtnText = addBtn.innerHTML;
        addBtn.textContent = 'Adding...';

        try {
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, dueDate })
            });

            const data = await safeParseJson(res);
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create task.');
            }

            // Reset form fields
            inputTitle.value = '';
            inputDesc.value = '';
            selectPriority.value = 'medium';
            inputDueDate.value = '';

            showBanner('Task created successfully.', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message || 'Error creating task.', 'error');
        } finally {
            addBtn.disabled = false;
            addBtn.innerHTML = originalBtnText;
        }
    });

    // Event: Search Input (debounced to avoid excessive requests)
    searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        clearSearchBtn.style.display = query ? 'block' : 'none';

        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            currentSearch = query.trim();
            fetchTodos();
        }, 200);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
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

    // Event: Clear Completed Tasks
    clearCompletedBtn.addEventListener('click', async () => {
        try {
            clearCompletedBtn.disabled = true;
            const res = await fetch('/api/todos?status=completed');
            const data = await safeParseJson(res);
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
            showBanner(err.message || 'Error clearing completed tasks.', 'error');
        } finally {
            clearCompletedBtn.disabled = false;
        }
    });

    // Edit Modal Events
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editCloseX) editCloseX.addEventListener('click', closeEditModal);

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const title = editTitleInput.value.trim();
        if (!title) {
            showBanner('Title cannot be empty.', 'error');
            editTitleInput.focus();
            return;
        }

        const description = editDescInput.value.trim();
        const priority = editPriorityInput.value;
        const dueDate = editDueDateInput.value || null;

        editSaveBtn.disabled = true;
        editSaveBtn.textContent = 'Saving...';

        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, dueDate })
            });

            const data = await safeParseJson(res);
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update task.');
            }

            closeEditModal();
            showBanner('Task updated successfully.', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message || 'Error updating task.', 'error');
        } finally {
            editSaveBtn.disabled = false;
            editSaveBtn.textContent = 'Save Changes';
        }
    });

    // Delete Modal Events
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (deleteCloseX) deleteCloseX.addEventListener('click', closeDeleteModal);

    deleteConfirmBtn.addEventListener('click', async () => {
        if (!taskPendingDeleteId) return;
        const id = taskPendingDeleteId;
        closeDeleteModal();

        try {
            const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
            const data = await safeParseJson(res);
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete task.');
            }

            showBanner('Task deleted successfully.', 'success');
            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message || 'Error deleting task.', 'error');
        }
    });

    // Overlay backdrop click to close
    [editModal, deleteModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeEditModal();
                    closeDeleteModal();
                }
            });
        }
    });

    // Keyboard support: Escape closes open dialogs
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editModal.style.display !== 'none') closeEditModal();
            if (deleteModal.style.display !== 'none') closeDeleteModal();
        }
    });

    // API: Fetch Todos (with race condition prevention)
    async function fetchTodos() {
        const thisFetchId = ++latestFetchId;
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';

        const params = new URLSearchParams();
        if (currentFilter !== 'all') params.append('status', currentFilter);
        if (currentPriority) params.append('priority', currentPriority);
        if (currentSearch) params.append('search', currentSearch);
        if (currentSort) params.append('sortBy', currentSort);

        try {
            const res = await fetch(`/api/todos?${params.toString()}`);
            const data = await safeParseJson(res);

            // Ignore stale response if a newer query has fired
            if (thisFetchId !== latestFetchId) return;

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Could not load tasks.');
            }

            renderTodoList(data.data);
        } catch (err) {
            if (thisFetchId === latestFetchId) {
                list.innerHTML = '';
                showBanner(err.message || 'Error loading tasks from server.', 'error');
            }
        } finally {
            if (thisFetchId === latestFetchId) {
                loadingState.style.display = 'none';
            }
        }
    }

    // API: Fetch Dashboard Summary Counts
    async function fetchSummary() {
        try {
            const res = await fetch('/api/todos/summary');
            const data = await safeParseJson(res);
            if (res.ok && data.success) {
                const s = data.data;
                statTotal.textContent = s.total;
                statPending.textContent = s.pending;
                statCompleted.textContent = s.completed;
                statOverdue.textContent = s.overdue;

                taskCount.textContent = `${s.pending} item${s.pending !== 1 ? 's' : ''} left`;
                clearCompletedBtn.style.display = s.completed > 0 ? 'inline-block' : 'none';
            }
        } catch (err) {
            console.error('Failed to update summary metrics:', err);
        }
    }

    // Safe DOM Rendering for Todo List (XSS proof via textContent only)
    function renderTodoList(todos) {
        list.innerHTML = '';

        if (!todos || todos.length === 0) {
            emptyState.style.display = 'flex';
            if (currentSearch || currentPriority || currentFilter !== 'all') {
                emptyStateText.textContent = 'No tasks match your current search or filters.';
            } else {
                emptyStateText.textContent = 'No tasks found. Create your first task using the form above!';
            }
            return;
        }

        emptyState.style.display = 'none';

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            // Custom accessible Checkbox
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox';
            checkbox.setAttribute('role', 'checkbox');
            checkbox.setAttribute('aria-checked', todo.completed ? 'true' : 'false');
            checkbox.setAttribute('tabindex', '0');
            checkbox.setAttribute('aria-label', `Mark task "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`);
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
            title.textContent = todo.title; // Safe plain text insertion
            body.appendChild(title);

            if (todo.description && todo.description.trim()) {
                const desc = document.createElement('span');
                desc.className = 'task-description';
                desc.textContent = todo.description; // Safe plain text insertion
                body.appendChild(desc);
            }

            // Metadata tags
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

            if (todo.createdAt) {
                const createdDate = document.createElement('span');
                createdDate.className = 'task-created-at';
                createdDate.textContent = `Created ${formatDateSimple(todo.createdAt)}`;
                metaTags.appendChild(createdDate);
            }

            body.appendChild(metaTags);

            // Action Buttons
            const actions = document.createElement('div');
            actions.className = 'task-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'icon-btn edit-btn';
            editBtn.setAttribute('aria-label', `Edit task "${todo.title}"`);
            editBtn.setAttribute('title', 'Edit task');
            editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editBtn.addEventListener('click', (e) => {
                lastActiveTriggerElement = e.currentTarget;
                openEditModal(todo);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'icon-btn delete-btn';
            deleteBtn.setAttribute('aria-label', `Delete task "${todo.title}"`);
            deleteBtn.setAttribute('title', 'Delete task');
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            deleteBtn.addEventListener('click', (e) => {
                lastActiveTriggerElement = e.currentTarget;
                openDeleteModal(todo.id, todo.title);
            });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(checkbox);
            li.appendChild(body);
            li.appendChild(actions);

            list.appendChild(li);
        });
    }

    // API: Toggle Completed status
    async function toggleTodo(id, newStatus) {
        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: newStatus })
            });

            const data = await safeParseJson(res);
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update task status.');
            }

            await fetchTodos();
            await fetchSummary();
        } catch (err) {
            showBanner(err.message || 'Error updating status.', 'error');
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
        if (lastActiveTriggerElement) {
            lastActiveTriggerElement.focus();
            lastActiveTriggerElement = null;
        }
    }

    function openDeleteModal(id, title) {
        taskPendingDeleteId = id;
        deleteModalText.textContent = `Are you sure you want to delete "${title}"? This action cannot be undone.`;
        deleteModal.style.display = 'flex';
        deleteConfirmBtn.focus();
    }

    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        taskPendingDeleteId = null;
        if (lastActiveTriggerElement) {
            lastActiveTriggerElement.focus();
            lastActiveTriggerElement = null;
        }
    }

    function isDatePast(dateStr) {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        return target < today;
    }

    function formatDateSimple(isoString) {
        if (!isoString) return '';
        try {
            return String(isoString).split(/[ T]/)[0] || '';
        } catch (e) {
            return '';
        }
    }

    async function safeParseJson(res) {
        try {
            return await res.json();
        } catch (e) {
            return { success: false, error: 'Server returned an invalid JSON response.' };
        }
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
