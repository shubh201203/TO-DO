const express = require('express');
const router = express.Router();
const db = require('../db/database');

function isValidDate(dateStr) {
    if (!dateStr) return true;
    if (typeof dateStr !== 'string') return false;
    const timestamp = Date.parse(dateStr);
    return !isNaN(timestamp);
}

// GET /api/todos/summary - Dashboard counts
router.get('/summary', async (req, res, next) => {
    try {
        const summary = await db.getDashboardCounts();
        res.json({
            success: true,
            data: summary
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/todos - List todos with filtering and sorting
router.get('/', async (req, res, next) => {
    try {
        const { status, priority, search, sortBy, sortOrder } = req.query;

        // Validate priority query param if supplied
        if (priority && !['low', 'medium', 'high'].includes(priority.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: "Invalid priority filter. Must be 'low', 'medium', or 'high'."
            });
        }

        // Validate status query param if supplied
        if (status && !['all', 'pending', 'completed'].includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: "Invalid status filter. Must be 'all', 'pending', or 'completed'."
            });
        }

        const todos = await db.getAllTodos({
            status: status ? status.toLowerCase() : 'all',
            priority: priority ? priority.toLowerCase() : undefined,
            search,
            sortBy,
            sortOrder
        });

        res.json({
            success: true,
            count: todos.length,
            data: todos
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/todos/:id - Retrieve single todo
router.get('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task ID format. ID must be a positive integer.'
            });
        }

        const todo = await db.getTodoById(id);
        if (!todo) {
            return res.status(404).json({
                success: false,
                error: 'Task not found.'
            });
        }

        res.json({
            success: true,
            data: todo
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/todos - Create new task
router.post('/', async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Request body must be a JSON object.'
            });
        }

        const { title, description, priority, dueDate, due_date } = req.body;

        // Title validation
        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Title is required and cannot be empty.'
            });
        }

        if (title.trim().length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Title cannot exceed 255 characters.'
            });
        }

        // Description validation
        if (description !== undefined && description !== null && typeof description !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Description must be text.'
            });
        }

        if (description && description.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Description cannot exceed 1000 characters.'
            });
        }

        // Priority validation
        const normalizedPriority = priority ? String(priority).toLowerCase() : 'medium';
        if (!['low', 'medium', 'high'].includes(normalizedPriority)) {
            return res.status(400).json({
                success: false,
                error: "Validation Error: Priority must be 'low', 'medium', or 'high'."
            });
        }

        // Due date validation
        const rawDate = dueDate !== undefined ? dueDate : due_date;
        if (rawDate && !isValidDate(rawDate)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: Due date must be a valid date string (YYYY-MM-DD).'
            });
        }

        const newTodo = await db.createTodo({
            title: title.trim(),
            description: description || '',
            priority: normalizedPriority,
            dueDate: rawDate || null
        });

        res.status(201).json({
            success: true,
            message: 'Task created successfully.',
            data: newTodo
        });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/todos/:id - Update task fields
router.patch('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task ID format. ID must be a positive integer.'
            });
        }

        const existing = await db.getTodoById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Task not found.'
            });
        }

        const allowedFields = ['title', 'description', 'completed', 'priority', 'dueDate', 'due_date'];
        const updates = {};

        // Explicit field whitelist to prevent mass assignment
        for (const field of allowedFields) {
            if (req.body && req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error: No valid fields provided for update.'
            });
        }

        // Validate title if provided
        if (updates.title !== undefined) {
            if (typeof updates.title !== 'string' || !updates.title.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Title cannot be empty.'
                });
            }
            if (updates.title.trim().length > 255) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Title cannot exceed 255 characters.'
                });
            }
        }

        // Validate description if provided
        if (updates.description !== undefined && updates.description !== null) {
            if (typeof updates.description !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Description must be text.'
                });
            }
            if (updates.description.length > 1000) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Description cannot exceed 1000 characters.'
                });
            }
        }

        // Validate completed status if provided
        if (updates.completed !== undefined) {
            if (typeof updates.completed !== 'boolean' && updates.completed !== 0 && updates.completed !== 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Completed must be a boolean.'
                });
            }
            updates.completed = Boolean(updates.completed);
        }

        // Validate priority if provided
        if (updates.priority !== undefined) {
            const p = String(updates.priority).toLowerCase();
            if (!['low', 'medium', 'high'].includes(p)) {
                return res.status(400).json({
                    success: false,
                    error: "Validation Error: Priority must be 'low', 'medium', or 'high'."
                });
            }
            updates.priority = p;
        }

        // Validate due date if provided
        const dateInput = updates.dueDate !== undefined ? updates.dueDate : updates.due_date;
        if (dateInput !== undefined && dateInput !== null && dateInput !== '') {
            if (!isValidDate(dateInput)) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error: Due date must be a valid date string.'
                });
            }
        }

        const updatedTodo = await db.updateTodo(id, updates);

        res.json({
            success: true,
            message: 'Task updated successfully.',
            data: updatedTodo
        });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/todos/:id - Delete task
router.delete('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task ID format. ID must be a positive integer.'
            });
        }

        const deleted = await db.deleteTodo(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Task not found.'
            });
        }

        res.json({
            success: true,
            message: 'Task deleted successfully.'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
