// Fix Duplicate Friend Requests
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FriendRequest = require('./models/FriendRequest');
const User = require('./models/User');

dotenv.config();

async function fixDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Delete ALL FriendRequest records to start fresh
        const deleteResult = await FriendRequest.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} FriendRequest records\n`);

        // Clear all friendRequests arrays in User documents
        const updateResult = await User.updateMany(
            {},
            { $set: { friendRequests: [] } }
        );
        console.log(`Cleared friendRequests from ${updateResult.modifiedCount} users\n`);

        console.log('✅ Database cleaned! You can now send friend requests again.');
        process.exit(0);
    } catch (err) {
        console.error('Fix error:', err);
        process.exit(1);
    }
}

fixDuplicates();
