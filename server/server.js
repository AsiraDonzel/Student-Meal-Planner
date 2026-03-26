const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

app.listen(PORT, console.log(`🚀 Server running on port ${PORT}`));
