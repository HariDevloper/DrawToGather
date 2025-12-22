const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const RoomInvite = require('../models/RoomInvite');

// Search users
router.get('/search', async (req, res) => {
    const { q } = req.query;
    try {
        const users = await User.find({
            username: { $regex: q, $options: 'i' }
        }).select('username avatar credits');

        // Map _id to id for frontend consistency
        const mappedUsers = users.map(u => ({
            id: u._id,
            username: u.username,
            avatar: u.avatar,
            credits: u.credits
        }));
        res.json(mappedUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Discover users (random users excluding friends and self)
router.get('/discover', async (req, res) => {
    const { userId } = req.query;
    try {
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get users excluding self and current friends
        const excludeIds = [userId, ...currentUser.friends];

        const users = await User.find({
            _id: { $nin: excludeIds }
        })
            .select('username avatar credits onlineStatus')
            .limit(20)
            .sort({ createdAt: -1 }); // Show newest users first

        // Map _id to id for frontend consistency
        const mappedUsers = users.map(u => ({
            id: u._id,
            username: u.username,
            avatar: u.avatar,
            credits: u.credits,
            onlineStatus: u.onlineStatus
        }));

        res.json(mappedUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send friend request
router.post('/friend-request', async (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
        if (senderId === receiverId) return res.status(400).json({ message: "You can't friend yourself!" });

        // Check if they're already friends
        const sender = await User.findById(senderId);
        if (sender.friends.includes(receiverId)) {
            return res.status(400).json({ message: 'Already friends!' });
        }

        // Check if the OTHER person already sent YOU a request (mutual interest!)
        const reverseRequest = await FriendRequest.findOne({
            sender: receiverId,
            receiver: senderId,
            status: 'pending'
        });

        if (reverseRequest) {
            // Both users want to be friends! Auto-accept and make them friends
            console.log(`🎉 Mutual friend request detected! Auto-connecting ${senderId} and ${receiverId}`);

            // Update the existing request to accepted
            reverseRequest.status = 'accepted';
            await reverseRequest.save();

            // Add each other as friends
            await User.findByIdAndUpdate(senderId, {
                $addToSet: { friends: receiverId },
                $pull: { friendRequests: receiverId }
            });
            await User.findByIdAndUpdate(receiverId, {
                $addToSet: { friends: senderId },
                $pull: { friendRequests: senderId }
            });

            return res.json({ message: 'You are now friends! 🎉', autoAccepted: true });
        }

        // Check if YOU already sent THEM a request
        const existingRequest = await FriendRequest.findOne({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });
        if (existingRequest) {
            return res.status(400).json({ message: 'Request already sent' });
        }

        // Delete any old rejected/accepted requests between these users
        await FriendRequest.deleteMany({
            $or: [
                { sender: senderId, receiver: receiverId, status: { $in: ['rejected', 'accepted'] } },
                { sender: receiverId, receiver: senderId, status: { $in: ['rejected', 'accepted'] } }
            ]
        });

        // Create new friend request
        const request = new FriendRequest({ sender: senderId, receiver: receiverId });
        await request.save();

        // Add to receiver's friend requests array
        await User.findByIdAndUpdate(receiverId, { $addToSet: { friendRequests: senderId } });

        console.log(`Friend request sent from ${senderId} to ${receiverId}`);
        res.json({ message: 'Friend request sent!' });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ message: err.message });
    }
});

// Accept friend request
router.post('/friend-accept', async (req, res) => {
    const { userId, senderId } = req.body; // senderId is the person who sent the request
    try {
        console.log('Accepting friend request - userId:', userId, 'senderId:', senderId);

        // Update the FriendRequest status to accepted
        await FriendRequest.findOneAndUpdate(
            { sender: senderId, receiver: userId, status: 'pending' },
            { status: 'accepted' }
        );

        // Add each other as friends (using $addToSet to avoid duplicates)
        await User.findByIdAndUpdate(userId, {
            $addToSet: { friends: senderId },
            $pull: { friendRequests: senderId }
        });
        await User.findByIdAndUpdate(senderId, {
            $addToSet: { friends: userId }
        });

        res.json({ message: 'Friend request accepted!' });
    } catch (err) {
        console.error('Error accepting friend request:', err);
        res.status(500).json({ message: err.message });
    }
});

// Reject friend request
router.post('/friend-reject', async (req, res) => {
    const { userId, senderId } = req.body; // senderId is the person who sent the request
    try {
        console.log('Rejecting friend request - userId:', userId, 'senderId:', senderId);

        // Update the FriendRequest status to rejected
        await FriendRequest.findOneAndUpdate(
            { sender: senderId, receiver: userId, status: 'pending' },
            { status: 'rejected' }
        );

        // Remove from friend requests array
        await User.findByIdAndUpdate(userId, {
            $pull: { friendRequests: senderId }
        });

        res.json({ message: 'Friend request rejected' });
    } catch (err) {
        console.error('Error rejecting friend request:', err);
        res.status(500).json({ message: err.message });
    }
});

// Dismiss room invite
router.post('/room-invite-dismiss', async (req, res) => {
    const { userId, inviteId } = req.body;
    try {
        const RoomInvite = require('../models/RoomInvite');
        await RoomInvite.findByIdAndDelete(inviteId);
        await User.findByIdAndUpdate(userId, {
            $pull: { roomInvites: inviteId }
        });
        res.json({ message: 'Room invite dismissed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Clear all room invites for a user
router.post('/room-invite-clear', async (req, res) => {
    const { userId } = req.body;
    try {
        const RoomInvite = require('../models/RoomInvite');
        const user = await User.findById(userId);
        if (user && user.roomInvites.length > 0) {
            await RoomInvite.deleteMany({ _id: { $in: user.roomInvites } });
            user.roomInvites = [];
            await user.save();
        }
        res.json({ message: 'All room invites cleared' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user profile & friends
router.get('/:userId/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('friends', 'username avatar credits onlineStatus currentRoom')
            .populate('friendRequests', 'username avatar')
            .populate({
                path: 'roomInvites',
                populate: { path: 'sender', select: 'username avatar' }
            });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            credits: user.credits,
            onlineStatus: user.onlineStatus,
            friends: user.friends.map(f => ({
                id: f._id,
                username: f.username,
                avatar: f.avatar,
                credits: f.credits,
                onlineStatus: f.onlineStatus,
                currentRoom: f.currentRoom
            })),
            friendRequests: user.friendRequests.map(r => ({
                id: r._id,
                username: r.username,
                avatar: r.avatar
            })),
            roomInvites: user.roomInvites
                .filter(i => i && i.sender) // Filter out null invites or invites with missing senders
                .map(i => ({
                    id: i._id,
                    from: i.sender.username,
                    fromAvatar: i.sender.avatar,
                    fromUserId: i.sender._id,
                    roomId: i.roomId,
                    roomName: i.roomName,
                    timestamp: i.createdAt
                }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user profile (avatar, username, age, gender, isProfileComplete, country, timezone)
router.put('/:userId/update', async (req, res) => {
    const { avatar, username, age, gender, isProfileComplete, country, timezone } = req.body;
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (avatar) user.avatar = avatar;
        if (age) user.age = age;
        if (gender) user.gender = gender;
        if (country) user.country = country;
        if (timezone) user.timezone = timezone;
        if (isProfileComplete !== undefined) user.isProfileComplete = isProfileComplete;

        if (username) {
            // Check if username is taken
            const existing = await User.findOne({ username });
            if (existing && existing._id.toString() !== req.params.userId) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            user.username = username;
        }

        await user.save();
        res.json({
            message: 'Profile updated!',
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                credits: user.credits,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                age: user.age,
                gender: user.gender,
                country: user.country,
                timezone: user.timezone
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get players in a room
router.get('/room/:roomId/players', async (req, res) => {
    try {
        const users = await User.find({ currentRoom: req.params.roomId })
            .select('username avatar credits onlineStatus');

        const players = users.map(u => ({
            id: u._id,
            username: u.username,
            avatar: u.avatar,
            credits: u.credits,
            onlineStatus: u.onlineStatus
        }));

        res.json(players);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Remove friend
router.post('/friend-remove', async (req, res) => {
    const { userId, friendId } = req.body;
    try {
        console.log('Removing friend - userId:', userId, 'friendId:', friendId);

        // Remove from both users' friend lists
        await User.findByIdAndUpdate(userId, {
            $pull: { friends: friendId, friendRequests: friendId }
        });
        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: userId, friendRequests: userId }
        });

        // Delete all FriendRequest records between these two users (both directions)
        await FriendRequest.deleteMany({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        });

        console.log('Friend removed and all related requests cleaned up');
        res.json({ message: 'Friend removed successfully' });
    } catch (err) {
        console.error('Error removing friend:', err);
        res.status(500).json({ message: err.message });
    }
});

// Claim Daily Reward with Streak (Timezone Aware)
router.post('/:userId/claim-daily', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userTimezone = user.timezone || 'UTC';
        const now = new Date();
        const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;

        // Helper to get YYYY-MM-DD in user's timezone
        const getUserDateStr = (date) => {
            return date.toLocaleDateString('en-CA', { timeZone: userTimezone });
        };

        const todayStr = getUserDateStr(now);
        const lastClaimStr = lastClaim ? getUserDateStr(lastClaim) : null;

        console.log(`Checking Daily Claim for ${user.username} (${userTimezone})`);
        console.log(`Server Time: ${now.toISOString()}`);
        console.log(`User Local Today: ${todayStr}`);
        console.log(`User Last Claim Local: ${lastClaimStr}`);

        // Check if already claimed today (in user's local time)
        if (lastClaimStr === todayStr) {
            return res.status(400).json({
                message: 'Come back tomorrow for your next reward!',
                nextClaim: new Date(now.setHours(24, 0, 0, 0)), // Approx next midnight
                streak: user.streak,
                credits: user.credits,
                alreadyClaimed: true
            });
        }

        let newStreak = user.streak;

        if (!lastClaimStr) {
            newStreak = 1;
        } else {
            // Check if last claim was yesterday (in user's local time)
            // Create a date object for "yesterday" in user's timezone is tricky with just strings.
            // Better: Parse todayStr back to date, subtract 1 day? No, timezone shifts.

            // Robust way: Get "Yesterday's Date String" for this user.
            // We can subtract 24 hours from 'now' and check if it matches 'yesterday'? 
            // No, Daylight savings might mess that up (23/25 hours).

            // Safe approach: 
            // 1. Get today's date components in user TZ.
            // 2. Subtract 1 from day. Handle month/year rollover.
            // Actually, we can just check if lastClaimStr is NOT yesterday.

            const msPerDay = 24 * 60 * 60 * 1000;
            // This simple math doesn't work well across TZ boundaries for string comparison.

            // Let's rely on the Date object shifting.
            // Create a Date object that represents "Now" in the server's memory.
            // Subtract 24 hours. Get its string in User's TZ.
            // This generally works safely enough for "Yesterday".
            const yesterdayDate = new Date(now.getTime() - msPerDay);
            // BUT, if user is claiming at 00:01 AM, yesterday might be 23:59 PM.
            // We need the date string of "Yesterday relative to User's Today".

            const yesterdayInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
            yesterdayInUserTz.setDate(yesterdayInUserTz.getDate() - 1);
            const yesterdayStr = yesterdayInUserTz.toLocaleDateString('en-CA'); // Gets YYYY-MM-DD

            // Fallback: If strict yesterday match fails, we check if diff is > 1 day?
            // Let's stick to strict yesterday string check for streak continuity.

            if (lastClaimStr === yesterdayStr) {
                newStreak += 1;
            } else {
                // If it's not yesterday, and not today (checked above), it must be older. Reset.
                newStreak = 1;
            }
        }

        // Cycle Streak every 7 days
        if (newStreak > 7) {
            newStreak = 1;
        }

        // Determine Reward
        let reward = 100;
        if (newStreak === 4) reward = 200;
        if (newStreak === 7) reward = 500;

        user.streak = newStreak;
        user.lastDailyClaim = now; // Save exact server time, but logic uses TZ-converted string
        user.credits += reward; // Actually give credits! (Was missing in previous snippet? No, handled elsewhere? Ah, User model has credits)

        await user.save();

        res.json({
            message: `You claimed ${reward} credits!`,
            credits: user.credits,
            streak: user.streak,
            reward: reward,
            lastDailyClaim: user.lastDailyClaim
        });
    } catch (err) {
        console.error('Error claiming daily reward:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
