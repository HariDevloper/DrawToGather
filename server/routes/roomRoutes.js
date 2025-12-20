const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');

// Create a room (costs 10 credits)
router.post('/create', async (req, res) => {
    const { name, userId, isPublic, password } = req.body;
    const ROOM_COST = 10;

    try {
        console.log('Room creation request for userId:', userId, 'name:', name);
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found for ID:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.credits < ROOM_COST) {
            console.log('Insufficient credits for user:', user.username, 'Credits:', user.credits);
            return res.status(400).json({ message: `Insufficient credits! You need ${ROOM_COST} 🪙` });
        }

        const roomId = Math.random().toString(36).substring(2, 9);
        const newRoom = new Room({
            roomId,
            name: name || 'Untitled Room',
            creator: userId,
            isPublic: isPublic !== undefined ? isPublic : true,
            password
        });

        await newRoom.save();

        // Deduct credits
        user.credits -= ROOM_COST;
        await user.save();

        console.log('Room created successfully:', roomId);
        res.json({ room: newRoom, credits: user.credits });
    } catch (err) {
        console.error('Room creation error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// Get all public rooms
router.get('/public', async (req, res) => {
    try {
        const rooms = await Room.find({ isPublic: true }).populate('creator', 'username');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
