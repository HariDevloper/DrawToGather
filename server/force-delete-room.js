// Force delete a specific room
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('./models/Room');
const User = require('./models/User');

dotenv.config();

async function forceDeleteRoom() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const roomId = 'mly8qzt'; // The room to delete

        // Check who's in the room
        const usersInRoom = await User.find({ currentRoom: roomId });
        console.log(`Users in room ${roomId}: ${usersInRoom.length}`);

        if (usersInRoom.length > 0) {
            console.log('\nUsers currently in this room:');
            usersInRoom.forEach(u => {
                console.log(`  - ${u.username} (online: ${u.onlineStatus})`);
            });

            // Clear their currentRoom field
            console.log('\nClearing currentRoom for all users...');
            await User.updateMany(
                { currentRoom: roomId },
                { $set: { currentRoom: null } }
            );
            console.log('✅ Cleared currentRoom for all users');
        }

        // Delete the room
        const result = await Room.deleteOne({ roomId });
        if (result.deletedCount > 0) {
            console.log(`\n✅ Deleted room: ${roomId}`);
        } else {
            console.log(`\n❌ Room ${roomId} not found in database`);
        }

        // Show remaining rooms
        const remainingRooms = await Room.find({});
        console.log(`\nRemaining rooms: ${remainingRooms.length}`);
        remainingRooms.forEach(r => {
            console.log(`  - ${r.roomId} (${r.name})`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

forceDeleteRoom();
