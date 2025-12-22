const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const authRoutes = require('./routes/authRoutes');
const Room = require('./models/Room');
const { cleanupEmptyRooms } = require('./utils/roomCleanup');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('DrawToGather Server is Running! 🚀');
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting'
    };
    res.json({
        server: 'Online',
        database: dbStatus[dbState] || 'Unknown',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// MongoDB Connection
const { initializeDefaultRooms, isDefaultRoom } = require('./utils/defaultRooms');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        // Initialize default rooms
        await initializeDefaultRooms();
        // Run initial cleanup
        cleanupEmptyRooms(io);
        // Schedule periodic cleanup every 30 minutes
        setInterval(() => cleanupEmptyRooms(io), 30 * 60 * 1000);
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Room occupancy tracking
const roomOccupancy = new Map(); // roomId -> Set of socketIds
const socketToRoom = new Map(); // socketId -> roomId
const socketToUser = new Map(); // socketId -> userId
const userToSocket = new Map(); // userId -> socketId (for notifications)
const roomCanvasData = new Map(); // roomId -> array of draw events
const User = require('./models/User');


// Socket.io Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('user-online', async (userId) => {
        socketToUser.set(socket.id, userId);
        userToSocket.set(userId, socket.id); // Map user to socket for notifications
        try {
            await User.findByIdAndUpdate(userId, { onlineStatus: true, lastSeen: new Date() });
            console.log(`User ${userId} is now online`);
        } catch (err) {
            console.error('Error updating user online status:', err);
        }
    });



    socket.on('join-room', async (data) => {
        console.log('join-room event received:', data);
        const { roomId, userId } = data;
        console.log('Extracted roomId:', roomId, 'userId:', userId);

        // Leave previous room if any
        const prevRoom = socketToRoom.get(socket.id);
        if (prevRoom) {
            socket.leave(prevRoom);
            if (roomOccupancy.has(prevRoom)) {
                roomOccupancy.get(prevRoom).delete(socket.id);

                // Clean up empty room (except default room and default rooms)
                if (roomOccupancy.get(prevRoom).size === 0 && prevRoom !== 'default' && !isDefaultRoom(prevRoom)) {
                    console.log(`Room ${prevRoom} is now empty. Deleting...`);
                    await Room.deleteOne({ roomId: prevRoom });
                    roomOccupancy.delete(prevRoom);
                }
            }
            // Emit player left to previous room with username and socketId
            const user = await User.findById(userId);
            socket.to(prevRoom).emit('player-left', { userId, roomId: prevRoom, username: user?.username, socketId: socket.id });
        }

        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        if (userId) {
            socketToUser.set(socket.id, userId);
        }

        if (!roomOccupancy.has(roomId)) {
            roomOccupancy.set(roomId, new Set());
        }
        roomOccupancy.get(roomId).add(socket.id);

        // Update user's current room in database
        if (userId) {
            try {
                const result = await User.findByIdAndUpdate(userId, { currentRoom: roomId }, { new: true });
                console.log('Updated user currentRoom:', result?.username, 'to room:', roomId);

                // Also update Room model participants if not default
                if (roomId !== 'default') {
                    const room = await Room.findOne({ roomId });
                    if (room) {
                        // Add user to participants if not already there
                        if (!room.participants.some(p => p.toString() === userId)) {
                            room.participants.push(userId);
                            room.lastActivity = Date.now();
                            await room.save();
                            console.log(`Added user ${userId} to room ${roomId} participants`);
                        }
                    }
                }

                // Emit player joined to room with username
                socket.to(roomId).emit('player-joined', { userId, roomId, username: result?.username });

                // Send existing canvas data to the new joiner
                if (roomCanvasData.has(roomId)) {
                    const canvasHistory = roomCanvasData.get(roomId);
                    console.log(`Sending ${canvasHistory.length} draw events to new joiner`);
                    socket.emit('canvas-sync', canvasHistory);
                }

                console.log(`User ${userId} joined room ${roomId}`);
                // Notify everyone to refresh room list
                io.emit('rooms-updated');
            } catch (err) {
                console.error('Error updating user room:', err);
            }
        } else {
            console.log('No userId provided in join-room event');
            // Even if no userId, someone joined the socket room
            io.emit('rooms-updated');
        }
    });

    socket.on('draw', (data) => {
        // Store draw event in room history
        if (!roomCanvasData.has(data.roomId)) {
            roomCanvasData.set(data.roomId, []);
        }
        roomCanvasData.get(data.roomId).push(data);

        // Limit history to last 10000 events to prevent memory issues
        const history = roomCanvasData.get(data.roomId);
        if (history.length > 10000) {
            history.shift(); // Remove oldest event
        }

        socket.to(data.roomId).emit('draw', data);
    });

    socket.on('mouse-move', (data) => {
        socket.to(data.roomId).emit('user-cursor', { ...data, socketId: socket.id });
    });

    socket.on('clear-canvas', (roomId) => {
        // Clear stored canvas history
        if (roomCanvasData.has(roomId)) {
            roomCanvasData.set(roomId, []);
            console.log(`Cleared canvas history for room ${roomId}`);
        }
        socket.to(roomId).emit('clear-canvas');
    });

    // Room chat messages
    socket.on('room-message', (data) => {
        console.log(`Chat message in room ${data.roomId} from ${data.username}: ${data.message}`);
        // Broadcast to all users in the room including sender
        io.to(data.roomId).emit('room-message', {
            username: data.username,
            message: data.message,
            timestamp: new Date()
        });
    });

    // Handle room invites - save to database like friend requests
    socket.on('send-room-invite', async (data) => {
        const { toUserId, fromUserId, fromUsername, roomId, roomName } = data;
        console.log(`📨 Room invite from ${fromUsername} (${fromUserId}) to user ${toUserId} for room ${roomId} (${roomName})`);

        try {
            const RoomInvite = require('./models/RoomInvite');

            // Check if invite already exists
            const existingInvite = await RoomInvite.findOne({
                sender: fromUserId,
                receiver: toUserId,
                roomId,
                status: 'pending'
            });

            if (existingInvite) {
                console.log('Invite already sent');
                return;
            }

            // Create new room invite in database
            const invite = new RoomInvite({
                sender: fromUserId,
                receiver: toUserId,
                roomId,
                roomName,
                status: 'pending'
            });
            await invite.save();

            // Add invite to receiver's roomInvites array
            await User.findByIdAndUpdate(toUserId, {
                $addToSet: { roomInvites: invite._id }
            });

            console.log(`✅ Room invite saved to database with ID: ${invite._id}`);

            // Also send real-time notification via socket
            const recipientSocketId = userToSocket.get(toUserId);
            if (recipientSocketId) {
                // Fetch sender avatar for real-time notification
                const sender = await User.findById(fromUserId).select('avatar');

                io.to(recipientSocketId).emit('room-invite-received', {
                    id: invite._id, // Send the actual database ID
                    fromUserId,
                    fromUsername,
                    fromAvatar: sender?.avatar || 'avatar1.png',
                    roomId,
                    roomName,
                    timestamp: invite.createdAt
                });
                console.log(`✅ Real-time notification sent to socket ${recipientSocketId}`);
            } else {
                console.log(`📴 User ${toUserId} is offline - invite saved for later`);
            }
        } catch (err) {
            console.error('Error sending room invite:', err);
        }
    });

    // Handle music synchronization
    socket.on('music-sync', (data) => {
        const { roomId, songIndex, isPlaying, currentTime } = data;
        // Broadcast to everyone else in the room
        socket.to(roomId).emit('music-state-update', {
            songIndex,
            isPlaying,
            currentTime,
            timestamp: Date.now()
        });
    });

    // Handle theme changes (host only)
    socket.on('change-theme', (data) => {
        const { roomId, theme } = data;
        console.log(`Theme changed in room ${roomId} to ${theme.name}`);
        // Broadcast to everyone else in the room
        socket.to(roomId).emit('theme-changed', { theme });
    });

    // Handle room deletion (notify all players)
    socket.on('room-deleted', (data) => {
        const { roomId } = data;
        console.log(`Room ${roomId} is being deleted by host`);

        // Notify all other players in the room
        socket.to(roomId).emit('room-deleted-notification', {
            roomId,
            message: 'The host has deleted this room'
        });

        // Clear canvas data for this room
        if (roomCanvasData.has(roomId)) {
            roomCanvasData.delete(roomId);
        }

        // Notify everyone to refresh room list
        io.emit('rooms-updated');
    });

    socket.on('leave-room', async (data) => {
        const { roomId, userId } = data;
        const currentRoom = socketToRoom.get(socket.id);

        if (currentRoom && currentRoom === roomId) {
            console.log(`User ${userId} leaving room ${roomId}`);

            socket.leave(roomId);
            socketToRoom.delete(socket.id);

            // Update occupancy
            if (roomOccupancy.has(roomId)) {
                roomOccupancy.get(roomId).delete(socket.id);

                // Update Room model - remove participant from ALL rooms (including default)
                try {
                    const room = await Room.findOne({ roomId });
                    if (room && userId) {
                        room.participants = room.participants.filter(p => p.toString() !== userId);

                        // If room is empty and NOT a default room, delete it
                        if (room.participants.length === 0 && !isDefaultRoom(roomId)) {
                            console.log(`Room ${roomId} is now empty. Deleting from database...`);
                            await Room.deleteOne({ roomId });
                            roomOccupancy.delete(roomId);
                        } else {
                            // If host left and room still has participants, assign new host
                            if (room.participants.length > 0 && room.host && room.host.toString() === userId) {
                                room.host = room.participants[0];
                                console.log(`New host assigned for room ${roomId}`);
                                io.to(roomId).emit('host-changed', { newHost: room.host.toString() });
                            }
                            room.lastActivity = Date.now();
                            await room.save();
                            console.log(`Updated room ${roomId}, ${room.participants.length} participants remaining`);
                        }
                    }
                } catch (err) {
                    console.error('Error updating room on leave:', err);
                }
            }
        }

        // Update user's current room to null and get username
        let username = null;
        if (userId) {
            const user = await User.findByIdAndUpdate(userId, { currentRoom: null });
            username = user?.username;
        }

        // Notify others in the room with username and socketId
        socket.to(roomId).emit('player-left', { userId, roomId, username, socketId: socket.id });

        // Notify everyone to refresh room list
        io.emit('rooms-updated');
    });

    socket.on('disconnect', async () => {
        const roomId = socketToRoom.get(socket.id);
        const userId = socketToUser.get(socket.id);

        // Update user status
        if (userId) {
            try {
                const user = await User.findByIdAndUpdate(userId, {
                    onlineStatus: false,
                    currentRoom: null,
                    lastSeen: new Date()
                });
                // Emit player left with username and socketId
                if (roomId) {
                    socket.to(roomId).emit('player-left', { userId, roomId, username: user?.username, socketId: socket.id });
                }
            } catch (err) {
                console.error('Error updating user on disconnect:', err);
            }
        }


        // Clean up room if empty (handle all rooms including default)
        if (roomId) {
            const occupancy = roomOccupancy.get(roomId);
            if (occupancy) {
                occupancy.delete(socket.id);

                // Also update Room model
                try {
                    const room = await Room.findOne({ roomId });
                    if (room && userId) {
                        room.participants = room.participants.filter(p => p.toString() !== userId);

                        // Delete room only if it's empty AND not a default room
                        if ((room.participants.length === 0 || occupancy.size === 0) && !isDefaultRoom(roomId)) {
                            console.log(`Room ${roomId} is empty. Cleaning up...`);
                            await Room.deleteOne({ roomId });
                            roomOccupancy.delete(roomId);
                        } else {
                            // If host disconnected and room still has participants, assign new host
                            if (room.participants.length > 0 && room.host && room.host.toString() === userId) {
                                room.host = room.participants[0];
                                console.log(`New host assigned for room ${roomId} after disconnect`);
                                io.to(roomId).emit('host-changed', { newHost: room.host.toString() });
                            }
                            room.lastActivity = Date.now();
                            await room.save();
                            console.log(`Updated room ${roomId} on disconnect, ${room.participants.length} participants remaining`);
                        }
                    }
                } catch (err) {
                    console.error('Error cleaning up room on disconnect:', err);
                }
            }
        }

        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);
        if (userId) {
            userToSocket.delete(userId); // Clean up user-to-socket mapping
        }

        // Notify everyone to refresh room list if they were in a room
        if (roomId) {
            io.emit('rooms-updated');
        }

        console.log('User disconnected:', socket.id);
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ message: 'Internal Server Error: ' + err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
