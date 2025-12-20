const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const user = new User({ username, email, password });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, username: user.username, avatar: user.avatar, credits: user.credits } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Google Auth
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { sub: googleId, email, name, picture } = ticket.getPayload();

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        let isNewUser = false;

        if (user) {
            // Link googleId if not already present
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user
            isNewUser = true;
            // Generate a temporary unique username based on name or email
            let baseUsername = name.replace(/\s+/g, '').toLowerCase().slice(0, 10);
            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await User.exists({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter++}`;
            }

            user = new User({
                username: uniqueUsername,
                email,
                googleId,
                avatar: 'avatar1.png', // Default
                isProfileComplete: false
            });
            await user.save();
        }

        // Daily Bonus Logic (same as login)
        const now = new Date();
        const lastLogin = new Date(user.lastLogin);
        if (Math.abs(now - lastLogin) / 36e5 >= 24) {
            user.credits += 20;
            user.lastLogin = now;
            await user.save();
        }

        const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                credits: user.credits,
                isProfileComplete: user.isProfileComplete
            },
            isNewUser, // Frontend can use this to redirect to onboarding
            message: isNewUser ? 'Welcome! Let\'s set up your profile.' : 'Welcome back!'
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ message: 'Invalid Google Token' });
    }
});

// Legacy Login (Keep for now or remove if strictly Google)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Daily Bonus Logic
        const now = new Date();
        const lastLogin = new Date(user.lastLogin);
        const diffHours = Math.abs(now - lastLogin) / 36e5;

        if (diffHours >= 24) {
            user.credits += 20;
            user.lastLogin = now;
            await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, username: user.username, avatar: user.avatar, credits: user.credits } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
