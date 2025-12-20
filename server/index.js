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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Run initial cleanup
        cleanupEmptyRooms();
        // Schedule periodic cleanup every 30 minutes
        setInterval(cleanupEmptyRooms, 30 * 60 * 1000);
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Room occupancy tracking
const roomOccupancy = new Map(); // roomId -> Set of socketIds
const socketToRoom = new Map(); // socketId -> roomId
const socketToUser = new Map(); // socketId -> userId
const userToSocket = new Map(); // userId -> socketId (for notifications)
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

    socket.on('send-room-invite', (data) => {
        const { fromUserId, fromUsername, toUserId, roomId, roomName } = data;
        const targetSocketId = userToSocket.get(toUserId);

        if (targetSocketId) {
            // Send notification to the target user
            io.to(targetSocketId).emit('room-invite-received', {
                fromUserId,
                fromUsername,
                roomId,
                roomName,
                timestamp: new Date()
            });
            console.log(`Room invite sent from ${fromUsername} to user ${toUserId} for room ${roomId}`);
        } else {
            console.log(`User ${toUserId} is not online to receive invite`);
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

                // Clean up empty room (except default room)
                if (roomOccupancy.get(prevRoom).size === 0 && prevRoom !== 'default') {
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
                // Emit player joined to room with username
                socket.to(roomId).emit('player-joined', { userId, roomId, username: result?.username });
                console.log(`User ${userId} joined room ${roomId}`);
            } catch (err) {
                console.error('Error updating user room:', err);
            }
        } else {
            console.log('No userId provided in join-room event');
        }
    });

    socket.on('draw', (data) => {
        socket.to(data.roomId).emit('draw', data);
    });

    socket.on('mouse-move', (data) => {
        socket.to(data.roomId).emit('user-cursor', { ...data, socketId: socket.id });
    });

    socket.on('clear-canvas', (roomId) => {
        socket.to(roomId).emit('clear-canvas');
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

                // Clean up empty room (except default)
                if (roomOccupancy.get(roomId).size === 0 && roomId !== 'default') {
                    console.log(`Room ${roomId} is now empty. Deleting...`);
                    await Room.deleteOne({ roomId });
                    roomOccupancy.delete(roomId);
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
        }
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

        // Clean up room if empty
        if (roomId && roomId !== 'default') {
            const occupancy = roomOccupancy.get(roomId);
            if (occupancy) {
                occupancy.delete(socket.id);
                if (occupancy.size === 0) {
                    console.log(`Room ${roomId} is empty. Cleaning up...`);
                    await Room.deleteOne({ roomId });
                    roomOccupancy.delete(roomId);
                }
            }
        }

        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);
        if (userId) {
            userToSocket.delete(userId); // Clean up user-to-socket mapping
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
