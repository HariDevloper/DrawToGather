const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Google users
    googleId: { type: String, unique: true, sparse: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    country: { type: String, default: null }, // Store country code or name
    timezone: { type: String, default: 'UTC' }, // Store IANA timezone string e.g., 'Asia/Kolkata'
    isProfileComplete: { type: Boolean, default: false },
    credits: { type: Number, default: 100 },
    avatar: { type: String, default: 'avatar1.png' },
    onlineStatus: { type: Boolean, default: false },
    lastDailyClaim: { type: Date, default: null },
    streak: { type: Number, default: 0 },
    currentRoom: { type: String, default: null },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roomInvites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RoomInvite' }],
    lastLogin: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
