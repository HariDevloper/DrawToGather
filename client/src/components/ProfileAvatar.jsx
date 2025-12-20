import React from 'react';
import { getAvatarEmoji } from '../utils/avatars';
import './ProfileAvatar.css';

const ProfileAvatar = ({ avatar, username, credits, size = 'medium', showTooltip = true, online = false }) => {
    const sizeClass = `avatar-${size}`;

    return (
        <div className={`profile-avatar ${sizeClass}`}>
            <div className="avatar-circle">
                <span className="avatar-emoji">{getAvatarEmoji(avatar)}</span>
                {online && <span className="online-dot" />}
            </div>
            {showTooltip && (
                <div className="avatar-tooltip">
                    <div className="tooltip-header">
                        <span className="tooltip-emoji">{getAvatarEmoji(avatar)}</span>
                        <span className="tooltip-username">{username}</span>
                    </div>
                    <div className="tooltip-credits">{credits} 🪙</div>
                </div>
            )}
        </div>
    );
};

export default ProfileAvatar;
