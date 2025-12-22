const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');

// Get all public rooms
router.get('/public', async (req, res) => {
    try {
        const rooms = await Room.find({ isPublic: true })
            .populate('host', 'username avatar')
            .populate('participants', 'username avatar')
            .sort({ lastActivity: -1 })
            .limit(20);

        // Filter out empty rooms
        const activeRooms = rooms.filter(room => room.participants && room.participants.length > 0);

        const formattedRooms = activeRooms.map(room => ({
            id: room.roomId,
            name: room.name,
            creator: room.host?.username || 'System',
            players: room.participants.length,
            theme: room.theme,
            isPublic: room.isPublic,
            roomId: room.roomId // Include for joining
        }));

        res.json(formattedRooms);
    } catch (err) {
        console.error('Error fetching public rooms:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get random public room for Quick Play - Smart filling (max 10 per room)
router.get('/random-public', async (req, res) => {
    try {
        const MAX_PLAYERS_PER_ROOM = 10;
        const { isDefaultRoom } = require('../utils/defaultRooms');

        // Get all public rooms sorted by participant count (fill rooms in order)
        const allRooms = await Room.find({ isPublic: true })
            .populate('host', 'username avatar')
            .populate('participants')
            .sort({ 'participants': 1 }); // Rooms with fewer players first

        if (allRooms.length === 0) {
            return res.status(404).json({ message: 'No public rooms available' });
        }

        // Separate user-created rooms from default rooms
        const userRooms = allRooms.filter(room => !isDefaultRoom(room.roomId));
        const defaultRooms = allRooms.filter(room => isDefaultRoom(room.roomId));

        let targetRoom = null;

        // Priority 1: User-created rooms that aren't full
        if (userRooms.length > 0) {
            targetRoom = userRooms.find(room =>
                room.participants && room.participants.length < MAX_PLAYERS_PER_ROOM
            );
        }

        // Priority 2: If no user rooms available or all full, use default rooms
        if (!targetRoom && defaultRooms.length > 0) {
            targetRoom = defaultRooms.find(room =>
                room.participants && room.participants.length < MAX_PLAYERS_PER_ROOM
            );
        }

        // Priority 3: If all rooms are full, join the least full user room (or default if no user rooms)
        if (!targetRoom) {
            targetRoom = userRooms.length > 0 ? userRooms[0] : defaultRooms[0];
        }

        res.json({
            id: targetRoom.roomId,
            name: targetRoom.name,
            creator: targetRoom.host?.username || 'System',
            theme: targetRoom.theme,
            currentPlayers: targetRoom.participants?.length || 0,
            maxPlayers: MAX_PLAYERS_PER_ROOM
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new room
router.post('/create', async (req, res) => {
    const { roomId, name, isPublic, hostId, theme } = req.body;

    try {
        // Check if user has enough credits (cost: 10)
        const user = await User.findById(hostId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.credits < 10) {
            return res.status(400).json({ message: 'Insufficient credits. You need 10 credits to create a room.' });
        }

        const room = new Room({
            roomId,
            name,
            isPublic: isPublic !== undefined ? isPublic : true,
            host: hostId,
            theme: theme || {
                id: 'sunset',
                name: 'Sunset Beach',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)'
            },
            participants: [hostId]
        });

        await room.save();

        // Deduct credits and update user's current room
        const updatedUser = await User.findByIdAndUpdate(
            hostId,
            {
                $inc: { credits: -10 },
                $set: { currentRoom: roomId }
            },
            { new: true }
        );

        res.json({
            message: 'Room created successfully',
            room: {
                id: room.roomId,
                name: room.name,
                theme: room.theme,
                isPublic: room.isPublic
            },
            updatedCredits: updatedUser.credits
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get room details
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('host', 'username avatar')
            .populate('participants', 'username avatar onlineStatus');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json({
            id: room.roomId,
            name: room.name,
            host: room.host ? {
                id: room.host._id,
                username: room.host.username,
                avatar: room.host.avatar
            } : {
                id: 'system',
                username: 'System',
                avatar: 'avatar1.png'
            },
            theme: room.theme,
            isPublic: room.isPublic,
            participants: room.participants.map(p => ({
                id: p._id,
                username: p.username,
                avatar: p.avatar,
                onlineStatus: p.onlineStatus
            }))
        });
    } catch (err) {
        console.error('Error fetching room details:', err);
        res.status(500).json({ message: err.message });
    }
});

// Join a room
router.post('/:roomId/join', async (req, res) => {
    const { userId } = req.body;

    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Add user to participants if not already there
        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
            room.lastActivity = Date.now();
            await room.save();
        }

        // Update user's current room
        await User.findByIdAndUpdate(userId, { currentRoom: req.params.roomId });

        res.json({ message: 'Joined room successfully', theme: room.theme });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Leave a room
router.post('/:roomId/leave', async (req, res) => {
    const { userId } = req.body;

    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Remove user from participants
        room.participants = room.participants.filter(p => p.toString() !== userId);

        // If room is empty, delete it
        if (room.participants.length === 0) {
            await Room.deleteOne({ roomId: req.params.roomId });
            return res.json({ message: 'Room deleted (empty)' });
        }

        // If host left, assign new host
        if (room.host.toString() === userId && room.participants.length > 0) {
            room.host = room.participants[0];
        }

        room.lastActivity = Date.now();
        await room.save();

        // Update user's current room
        await User.findByIdAndUpdate(userId, { currentRoom: null });

        res.json({
            message: 'Left room successfully',
            newHost: room.host.toString() !== userId ? room.host : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update room theme (host only)
router.put('/:roomId/theme', async (req, res) => {
    const { userId, theme } = req.body;

    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is host
        if (room.host.toString() !== userId) {
            return res.status(403).json({ message: 'Only host can change theme' });
        }

        room.theme = theme;
        room.lastActivity = Date.now();
        await room.save();

        res.json({ message: 'Theme updated successfully', theme: room.theme });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete room (host only, not default rooms)
router.delete('/:roomId', async (req, res) => {
    try {
        const { isDefaultRoom } = require('../utils/defaultRooms');
        const roomId = req.params.roomId;

        // Check if it's a default room
        if (isDefaultRoom(roomId)) {
            return res.status(403).json({ message: 'Cannot delete default rooms' });
        }

        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Delete the room
        await Room.deleteOne({ roomId });

        // Clear all users' currentRoom if they were in this room
        await User.updateMany(
            { currentRoom: roomId },
            { currentRoom: null }
        );

        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
