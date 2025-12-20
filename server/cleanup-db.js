// Database Cleanup Script
// Run this once to clean up old FriendRequest records

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FriendRequest = require('./models/FriendRequest');
const User = require('./models/User');

dotenv.config();

async function cleanupDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all accepted/rejected FriendRequests (keep only pending ones)
        const result = await FriendRequest.deleteMany({
            status: { $in: ['accepted', 'rejected'] }
        });
        console.log(`Deleted ${result.deletedCount} old FriendRequest records`);

        // Optional: Clean up any orphaned friendRequests in User documents
        const users = await User.find({});
        for (const user of users) {
            if (user.friendRequests.length > 0) {
                // Verify each friend request still exists as pending
                const validRequests = [];
                for (const requesterId of user.friendRequests) {
                    const exists = await FriendRequest.findOne({
                        sender: requesterId,
                        receiver: user._id,
                        status: 'pending'
                    });
                    if (exists) {
                        validRequests.push(requesterId);
                    }
                }

                if (validRequests.length !== user.friendRequests.length) {
                    user.friendRequests = validRequests;
                    await user.save();
                    console.log(`Cleaned up friendRequests for user: ${user.username}`);
                }
            }
        }

        console.log('Database cleanup completed!');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup error:', err);
        process.exit(1);
    }
}

cleanupDatabase();
