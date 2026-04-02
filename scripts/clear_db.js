const mongoose = require('mongoose');
require('dotenv').config();

const clearDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI, {
            family: 4 // Use IPv4 for stability (hotspots)
        });
        console.log('Connected to MongoDB.');

        // Delete all users
        const User = require('../server/models/User');
        const userResult = await User.deleteMany({});
        console.log(`Successfully deleted ${userResult.deletedCount} users.`);

        // Delete all food items (Legacy)
        const FoodItem = require('../server/models/FoodItem');
        const foodResult = await FoodItem.deleteMany({});
        console.log(`Successfully deleted ${foodResult.deletedCount} legacy food items.`);

        console.log('Database cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup Error:', error);
        process.exit(1);
    }
};

clearDB();
