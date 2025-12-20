import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Check, User as UserIcon } from 'lucide-react';
import './ProfileModal.css';

const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar${i + 1}.png`);
import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const ProfileModal = ({ user, onClose, onUpdate, onLogout }) => {
    const [username, setUsername] = useState(user.username);
    const [selectedAvatar, setSelectedAvatar] = useState(
        (user.avatar && user.avatar.includes('avatar')) ? user.avatar : 'avatar1.png'
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.put(`${API_URL}/${user.id}/update`, {
                username,
                avatar: selectedAvatar
            });
            onUpdate(res.data.user);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <motion.div
                className="profile-modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="modal-header">
                    <h2>Edit Profile</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="profile-preview">
                    <div className="current-avatar-wrapper">
                        <img
                            src={`/profiles/${selectedAvatar}`}
                            alt="Current Avatar"
                            className="current-avatar-large"
                            onError={(e) => e.target.src = '/profiles/avatar1.png'}
                        />
                    </div>

                    <div className="input-group">
                        <label>Username</label>
                        <div className="input-with-icon">
                            <UserIcon size={20} className="input-icon" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>
                    </div>
                </div>

                <div className="avatars-section">
                    <h3>Choose Avatar</h3>
                    <div className="avatars-grid">
                        {AVATARS.map((avatar) => (
                            <motion.div
                                key={avatar}
                                className={`avatar-item ${selectedAvatar === avatar ? 'selected' : ''}`}
                                onClick={() => setSelectedAvatar(avatar)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <img src={`/profiles/${avatar}`} alt="Avatar Option" />
                                {selectedAvatar === avatar && (
                                    <div className="selected-overlay">
                                        <Check size={16} color="white" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {error && <p className="error-msg">{error}</p>}

                <div className="modal-actions">
                    <button className="logout-btn" onClick={onLogout}>
                        <LogOut size={20} />
                        Logout
                    </button>
                    <button className="save-btn" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfileModal;
