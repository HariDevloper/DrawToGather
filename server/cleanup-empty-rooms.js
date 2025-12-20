// Clean up all empty rooms from database
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('./models/Room');
const User = require('./models/User');

dotenv.config();

async function cleanupEmptyRooms() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Get all rooms
        const allRooms = await Room.find({});
        console.log(`Total rooms in database: ${allRooms.length}\n`);

        if (allRooms.length === 0) {
            console.log('No rooms to clean up!');
            process.exit(0);
        }

        let deletedCount = 0;
        let keptCount = 0;

        for (const room of allRooms) {
            // Check if anyone is currently in this room
            const usersInRoom = await User.find({ currentRoom: room.roomId });

            if (usersInRoom.length === 0 && room.roomId !== 'default') {
                // Room is empty and not default - delete it
                await Room.deleteOne({ roomId: room.roomId });
                console.log(`❌ Deleted empty room: ${room.roomId} (created by ${room.createdBy})`);
                deletedCount++;
            } else {
                console.log(`✅ Kept room: ${room.roomId} (${usersInRoom.length} users)`);
                keptCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Summary:`);
        console.log(`  Deleted: ${deletedCount} empty rooms`);
        console.log(`  Kept: ${keptCount} active rooms`);
        console.log('='.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('Cleanup error:', err);
        process.exit(1);
    }
}

cleanupEmptyRooms();
