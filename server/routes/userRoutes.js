const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

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

// Get user profile & friends
router.get('/:userId/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('friends', 'username avatar credits onlineStatus currentRoom')
            .populate('friendRequests', 'username avatar');

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
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user profile (avatar, username, age, gender, isProfileComplete)
router.put('/:userId/update', async (req, res) => {
    const { avatar, username, age, gender, isProfileComplete } = req.body;
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (avatar) user.avatar = avatar;
        if (age) user.age = age;
        if (gender) user.gender = gender;
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
                gender: user.gender
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

module.exports = router;
