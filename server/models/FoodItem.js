const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a food name'],
        trim: true
    },
    category: {
        type: String,
        enum: ['healthy', 'moderate', 'unhealthy'],
        default: 'moderate'
    },
    type: {
        type: String,
        enum: ['fixed', 'portion'],
        default: 'fixed'
    },
    price: {
        type: Number,
        min: 0
    },
    prices: [{
        cafeteria: { type: String, required: true },
        price: { type: Number, required: true, min: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', FoodItemSchema);
