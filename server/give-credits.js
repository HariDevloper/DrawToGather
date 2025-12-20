// Give all users 10,000 credits for testing
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function giveCredits() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const TESTING_CREDITS = 10000;

        // Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users\n`);

        if (users.length === 0) {
            console.log('No users found!');
            process.exit(0);
        }

        console.log('Updating credits...\n');
        console.log('='.repeat(60));

        for (const user of users) {
            const oldCredits = user.credits;
            user.credits = TESTING_CREDITS;
            await user.save();

            console.log(`✅ ${user.username}`);
            console.log(`   Old credits: ${oldCredits} 🪙`);
            console.log(`   New credits: ${TESTING_CREDITS} 🪙`);
            console.log('-'.repeat(60));
        }

        console.log('\n🎉 All users now have 10,000 credits for testing!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

giveCredits();
