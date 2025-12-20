// Periodic room cleanup - runs every 30 minutes
const Room = require('../models/Room');
const User = require('../models/User');

async function cleanupEmptyRooms() {
    try {
        console.log('🧹 Running periodic room cleanup...');

        const allRooms = await Room.find({});
        let deletedCount = 0;

        for (const room of allRooms) {
            // Skip default room
            if (room.roomId === 'default') continue;

            // Check if anyone is currently in this room
            const usersInRoom = await User.find({ currentRoom: room.roomId });

            if (usersInRoom.length === 0) {
                // Room is empty - delete it
                await Room.deleteOne({ roomId: room.roomId });
                console.log(`  ❌ Deleted empty room: ${room.roomId}`);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`✅ Cleanup complete: Deleted ${deletedCount} empty rooms`);
        } else {
            console.log('✅ No empty rooms to clean up');
        }
    } catch (err) {
        console.error('❌ Room cleanup error:', err);
    }
}

// Export the cleanup function
module.exports = { cleanupEmptyRooms };
