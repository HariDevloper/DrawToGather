// Avatar constants
export const AVATARS = [
    { id: 'cat', emoji: '🐱', name: 'Cat' },
    { id: 'dog', emoji: '🐶', name: 'Dog' },
    { id: 'fox', emoji: '🦊', name: 'Fox' },
    { id: 'bear', emoji: '🐻', name: 'Bear' },
    { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
    { id: 'panda', emoji: '🐼', name: 'Panda' },
    { id: 'robot', emoji: '🤖', name: 'Robot' },
    { id: 'astronaut', emoji: '👨‍🚀', name: 'Astronaut' },
    { id: 'wizard', emoji: '🧙', name: 'Wizard' },
    { id: 'ninja', emoji: '🥷', name: 'Ninja' },
    { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirate' },
    { id: 'knight', emoji: '⚔️', name: 'Knight' }
];

export const getAvatarEmoji = (avatarId) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? avatar.emoji : '🐱';
};

export const getAvatarName = (avatarId) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? avatar.name : 'Cat';
};
