require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize database then start server
initDatabase().then(() => {
    // Routes (loaded after DB init)
    const profileRoutes = require('./routes/profile');
    const queryRoutes = require('./routes/query');
    const projectRoutes = require('./routes/projects');
    
    app.use('/profile', profileRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/', queryRoutes);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
        console.log(`Me-API server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
