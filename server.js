const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = require('./db/database');
db.initDb();

// Parse JSON bodies
app.use(express.json());

// Handle malformed JSON gracefully
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Malformed JSON payload in request body.'
        });
    }
    next(err);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount Todo REST API router
const todosRouter = require('./routes/todos');
app.use('/api/todos', todosRouter);

// Helper to safely send html files with error handling
function servePage(res, next, filename) {
    const filePath = path.join(__dirname, 'public', filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err);
        }
    });
}

// Root route to serve the Hub page
app.get('/', (req, res, next) => {
    servePage(res, next, 'index.html');
});

// Q1 route
app.get('/q1', (req, res, next) => {
    servePage(res, next, 'q1.html');
});

// Q2 route
app.get('/emi', (req, res, next) => {
    servePage(res, next, 'emi.html');
});

// Q3 route
app.get('/todo', (req, res, next) => {
    servePage(res, next, 'todo.html');
});

// Q4 route
app.get('/hotel', (req, res, next) => {
    servePage(res, next, 'hotel.html');
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).send('Internal Server Error');
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Task Manager & Web Hub listening at http://localhost:${PORT}`);
    });
}

module.exports = app;

