const express = require('express');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';");
    next();
});

// Parse JSON bodies with size limit
app.use(express.json({ limit: '100kb' }));

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

// Health check endpoint for uptime and Render deployment verification
app.get('/health', async (req, res) => {
    const isHealthy = await db.checkHealth();
    if (!isHealthy) {
        return res.status(503).json({
            status: 'error',
            database: db.getDriverName(),
            error: 'Database check failed'
        });
    }
    res.status(200).json({
        status: 'ok',
        database: db.getDriverName(),
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Helper to safely send html files with error handling
function servePage(res, next, filename) {
    const filePath = path.join(__dirname, 'public', filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err);
        }
    });
}

// Default homepage: Serve the To-do application directly on / and /todo
app.get('/', (req, res, next) => {
    servePage(res, next, 'todo.html');
});

app.get('/todo', (req, res, next) => {
    servePage(res, next, 'todo.html');
});

// Serve static files from the 'public' directory (with index: false to prevent serving index.html on /)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Mount Todo REST API router
const todosRouter = require('./routes/todos');
app.use('/api/todos', todosRouter);

// Preserved utility assignment routes
app.get('/q1', (req, res, next) => {
    servePage(res, next, 'q1.html');
});

app.get('/emi', (req, res, next) => {
    servePage(res, next, 'emi.html');
});

app.get('/hotel', (req, res, next) => {
    servePage(res, next, 'hotel.html');
});

// Legacy assignment hub accessible at /hub
app.get('/hub', (req, res, next) => {
    servePage(res, next, 'index.html');
});

// 404 handler for unmatched routes
app.use((req, res) => {
    if (req.path && req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found.'
        });
    }
    res.status(404).send('Page not found');
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err.message || err);
    if (req.path && req.path.startsWith('/api')) {
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
    res.status(500).send('Internal Server Error');
});

// Graceful process termination
async function handleShutdown(signal) {
    console.log(`Received ${signal}, shutting down database connection...`);
    try {
        await db.closeDb();
    } catch (err) {
        console.error('Error during shutdown database cleanup:', err.message || err);
    }
    process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
    const HOST = process.env.HOST || '0.0.0.0';
    db.initDb().then(() => {
        app.listen(PORT, HOST, () => {
            console.log(`Task Manager & Web Hub (${db.getDriverName()}) listening at http://${HOST}:${PORT}`);
        });
    }).catch(err => {
        console.error('Failed to initialize database on startup:', err.message || err);
        process.exit(1);
    });
}

module.exports = app;
