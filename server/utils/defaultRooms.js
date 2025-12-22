const Room = require('../models/Room');

const DEFAULT_ROOMS = [
    {
        roomId: 'default_room_1',
        name: '🎨 Art Studio',
        theme: {
            id: 'sunset',
            name: 'Sunset Beach',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)'
        }
    },
    {
        roomId: 'default_room_2',
        name: '🌊 Ocean Lounge',
        theme: {
            id: 'ocean',
            name: 'Deep Ocean',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
    },
    {
        roomId: 'default_room_3',
        name: '🌲 Forest Canvas',
        theme: {
            id: 'forest',
            name: 'Mystic Forest',
            background: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)'
        }
    },
    {
        roomId: 'default_room_4',
        name: '🌌 Space Gallery',
        theme: {
            id: 'space',
            name: 'Cosmic Space',
            background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)'
        }
    },
    {
        roomId: 'default_room_5',
        name: '🍭 Candy Workshop',
        theme: {
            id: 'candy',
            name: 'Candy Land',
            background: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 50%, #DDA0DD 100%)'
        }
    }
];

async function initializeDefaultRooms() {
    try {
        console.log('Initializing default rooms...');

        for (const roomData of DEFAULT_ROOMS) {
            const existing = await Room.findOne({ roomId: roomData.roomId });

            if (!existing) {
                // Create a system user ID (you might want to create an actual system user)
                const systemUserId = '000000000000000000000000'; // Placeholder

                const room = new Room({
                    roomId: roomData.roomId,
                    name: roomData.name,
                    isPublic: true,
                    host: systemUserId,
                    theme: roomData.theme,
                    participants: [], // Start empty
                    createdAt: new Date(),
                    lastActivity: new Date()
                });

                await room.save();
                console.log(`Created default room: ${roomData.name}`);
            } else {
                // Update theme if needed
                existing.theme = roomData.theme;
                existing.isPublic = true;
                await existing.save();
                console.log(`Updated default room: ${roomData.name}`);
            }
        }

        console.log('Default rooms initialized successfully');
    } catch (err) {
        console.error('Error initializing default rooms:', err);
    }
}

// Prevent default rooms from being deleted
function isDefaultRoom(roomId) {
    return DEFAULT_ROOMS.some(room => room.roomId === roomId);
}

module.exports = {
    initializeDefaultRooms,
    isDefaultRoom,
    DEFAULT_ROOMS
};
