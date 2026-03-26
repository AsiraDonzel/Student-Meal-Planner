const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate token helper
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        const user = await User.create({ name, email, password });

        // Send token + user data
        res.status(201).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                allowance: user.allowance,
                savingsGoal: user.savingsGoal,
                budgetStartDate: user.budgetStartDate,
                budgetEndDate: user.budgetEndDate,
                profilePicture: user.profilePicture || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                allowance: user.allowance,
                savingsGoal: user.savingsGoal,
                budgetStartDate: user.budgetStartDate,
                budgetEndDate: user.budgetEndDate,
                profilePicture: user.profilePicture || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile / settings
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const { allowance, savingsGoal, budgetStartDate, budgetEndDate, name, profilePicture } = req.body;
        
        const user = await User.findById(req.user.id);
        if (name) user.name = name;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (allowance !== undefined) user.allowance = allowance;
        if (savingsGoal !== undefined) user.savingsGoal = savingsGoal;
        if (budgetStartDate) user.budgetStartDate = budgetStartDate;
        if (budgetEndDate) user.budgetEndDate = budgetEndDate;

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                allowance: user.allowance,
                savingsGoal: user.savingsGoal,
                budgetStartDate: user.budgetStartDate,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   PUT /api/auth/password
// @desc    Update user password
// @access  Private
router.put('/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');
        
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
