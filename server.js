const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve the Hub page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Q1 route
app.get('/q1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'q1.html'));
});

// Q2 route
app.get('/emi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'emi.html'));
});

// Q3 route
app.get('/todo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'todo.html'));
});

// Q4 route
app.get('/hotel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hotel.html'));
});

app.listen(port, () => {
    console.log(`WT Lab 12 application listening at http://localhost:${port}`);
});
