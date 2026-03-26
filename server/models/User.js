const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false, // Don't return password by default
    },
    allowance: {
        type: Number,
        default: 50000,
    },
    savingsGoal: {
        type: Number,
        default: 10000,
    },
    budgetStartDate: {
        type: Date,
        default: Date.now,
    },
    budgetEndDate: {
        type: Date,
        default: () => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d;
        }
    },
    profilePicture: {
        type: String, // Base64 encoded string
        default: '',
    }
}, { timestamps: true });

// Encrypt password before saving
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
