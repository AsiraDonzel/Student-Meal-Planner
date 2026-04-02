const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env variables
dotenv.config({ quiet: true });

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection Check Middleware
const mongoose = require('mongoose');
app.use('/api', (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            success: false, 
            error: 'Database connection is not ready. Please verify your MongoDB Atlas IP Whitelist at https://www.mongodb.com/docs/atlas/security-whitelist/ or check your internet.' 
        });
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/food', require('./routes/food'));
app.use('/api/ai', require('./routes/ai'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Server Error' });
});

// For production: Serve frontend from public folder
const publicDir = path.resolve(__dirname, '../');
app.use(express.static(publicDir));
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
        return res.sendFile(path.join(publicDir, 'index.html'), err => {
            if (err) next();
        });
    }
    next();
});

const PORT = process.env.PORT || 5001;

// Only listen if not being imported (e.g., during local dev)
if (require.main === module) {
    app.listen(PORT, console.log(`🚀 Server running on port ${PORT}`));
}

// Export app for Vercel
module.exports = app;
