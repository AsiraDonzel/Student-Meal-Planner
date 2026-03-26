const express = require('express');
const { protect } = require('../middleware/auth');
const FoodItem = require('../models/FoodItem');

const router = express.Router();

// @route   GET /api/food
// @desc    Get all food items for the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const items = await FoodItem.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   POST /api/food
// @desc    Add a new food item
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, price, category, type, prices } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Please provide a food name' });
        }

        if (type === 'portion' && (!prices || prices.length === 0)) {
            return res.status(400).json({ success: false, error: 'Portion items must have at least one cafeteria price' });
        }

        const item = await FoodItem.create({
            name,
            price,
            category: category || 'moderate',
            type: type || 'fixed',
            prices: prices || [],
            userId: req.user.id
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   PUT /api/food/:id
// @desc    Update a food item
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let item = await FoodItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, error: 'Food item not found' });
        }

        // Make sure user owns the item
        if (item.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to update this item' });
        }

        item = await FoodItem.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   DELETE /api/food/:id
// @desc    Delete a food item
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const item = await FoodItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, error: 'Food item not found' });
        }

        // Make sure user owns the item
        if (item.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this item' });
        }

        await item.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
