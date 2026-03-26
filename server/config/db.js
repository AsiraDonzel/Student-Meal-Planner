const mongoose = require('mongoose');

// Connection caching for serverless environments
let isConnected = false;

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI is not set in environment variables.');
            return;
        }

        if (isConnected || mongoose.connection.readyState >= 1) {
            return;
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s
        });

        isConnected = true;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        // Do not use process.exit(1) in serverless as it kills the environment
    }
};

module.exports = connectDB;
