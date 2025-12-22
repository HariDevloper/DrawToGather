import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Globe, Check } from 'lucide-react';
import { THEMES } from '../data/themes';
import './CreateRoomModal.css';

const CreateRoomModal = ({ onClose, onCreate }) => {
    const [roomName, setRoomName] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    // Default theme is 'studies' - theme can be changed by host inside the room
    const defaultTheme = THEMES[0]; // Studies theme
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!roomName.trim()) {
            alert('Please enter a room name');
            return;
        }

        setIsCreating(true);
        await onCreate({
            name: roomName,
            isPublic,
            theme: defaultTheme
        });
        setIsCreating(false);
    };

    return (
        <div className="modal-overlay">
            <motion.div
                className="create-room-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="modal-header">
                    <h2>Create Your Room</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="create-room-content">
                    {/* Room Name */}
                    <div className="form-section">
                        <label>Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Enter a creative name..."
                            maxLength={30}
                            autoFocus
                        />
                    </div>

                    {/* Privacy Toggle */}
                    <div className="form-section">
                        <label>Room Privacy</label>
                        <div className="privacy-toggle">
                            <button
                                className={`privacy-btn ${isPublic ? 'active' : ''}`}
                                onClick={() => setIsPublic(true)}
                            >
                                <Globe size={20} />
                                <span>Public</span>
                                {isPublic && <Check size={16} className="check-mark" />}
                            </button>
                            <button
                                className={`privacy-btn ${!isPublic ? 'active' : ''}`}
                                onClick={() => setIsPublic(false)}
                            >
                                <Lock size={20} />
                                <span>Private</span>
                                {!isPublic && <Check size={16} className="check-mark" />}
                            </button>
                        </div>
                        <p className="privacy-hint">
                            {isPublic
                                ? '🌍 Anyone can find and join your room'
                                : '🔒 Only people with the link can join'}
                        </p>
                    </div>

                    <div className="credit-info" style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#ff8c00', fontWeight: 'bold' }}>
                        💎 Costs 10 credits to create a room
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="create-btn"
                        onClick={handleCreate}
                        disabled={isCreating || !roomName.trim()}
                    >
                        {isCreating ? 'Creating...' : 'Create Room'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateRoomModal;
