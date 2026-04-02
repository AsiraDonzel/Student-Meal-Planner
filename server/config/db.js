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
            serverSelectionTimeoutMS: 30000, // Timeout after 30s to allow slow connections
            family: 4 // Force IPv4 (fixes "secureConnect timed out" on Mobile Hotspots with broken IPv6 routing)
        });

        isConnected = true;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        if(error.message.includes('timed out')) {
            console.error(`💡 HINT: Are you sure your current IP address is whitelisted in MongoDB Atlas? Check here: https://www.mongodb.com/docs/atlas/security-whitelist/`);
        }
        // Do not use process.exit(1) in serverless as it kills the environment
    }
};

module.exports = connectDB;
