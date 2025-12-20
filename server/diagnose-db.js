// Diagnostic Script - Check FriendRequest records
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FriendRequest = require('./models/FriendRequest');
const User = require('./models/User');

dotenv.config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Get all FriendRequests
        const allRequests = await FriendRequest.find({})
            .populate('sender', 'username')
            .populate('receiver', 'username');

        console.log(`Total FriendRequest records: ${allRequests.length}\n`);

        if (allRequests.length > 0) {
            console.log('FriendRequest Records:');
            console.log('='.repeat(80));
            allRequests.forEach((req, index) => {
                console.log(`${index + 1}. From: ${req.sender?.username || 'Unknown'} → To: ${req.receiver?.username || 'Unknown'}`);
                console.log(`   Status: ${req.status}`);
                console.log(`   Created: ${req.createdAt}`);
                console.log(`   ID: ${req._id}`);
                console.log('-'.repeat(80));
            });
        }

        // Get all users with their friend data
        const users = await User.find({}).select('username friends friendRequests');
        console.log(`\nTotal Users: ${users.length}\n`);

        users.forEach(user => {
            if (user.friends.length > 0 || user.friendRequests.length > 0) {
                console.log(`User: ${user.username}`);
                console.log(`  Friends: ${user.friends.length}`);
                console.log(`  Pending Requests: ${user.friendRequests.length}`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic error:', err);
        process.exit(1);
    }
}

diagnose();
