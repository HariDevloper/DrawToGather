const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isPublic: { type: Boolean, default: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    theme: {
        id: { type: String, default: 'sunset' },
        name: { type: String, default: 'Sunset Beach' },
        background: { type: String, default: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)' }
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Auto-delete rooms older than 24 hours with no activity
roomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Room', roomSchema);
