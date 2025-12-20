import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import './RoomPlayers.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const RoomPlayers = ({ roomId, currentUserId }) => {
    const [players, setPlayers] = useState([]);
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        if (roomId && roomId !== 'default') {
            fetchPlayers();
            fetchFriends();
            // Refresh every 3 seconds
            const interval = setInterval(() => {
                fetchPlayers();
                fetchFriends();
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setPlayers([]);
        }
    }, [roomId]);

    const fetchPlayers = async () => {
        // Clean roomId - remove # if present
        const cleanRoomId = roomId.replace('#', '').trim();
        if (!cleanRoomId || cleanRoomId === 'default') {
            console.log('Invalid roomId:', roomId);
            return;
        }

        try {
            console.log('Fetching players for room:', cleanRoomId);
            const res = await axios.get(`${API_URL}/room/${cleanRoomId}/players`);
            console.log('Room players:', res.data);
            setPlayers(res.data);
        } catch (err) {
            console.error('Failed to fetch players', err);
        }
    };

    const fetchFriends = async () => {
        if (!currentUserId) return;
        try {
            const res = await axios.get(`${API_URL}/${currentUserId}/profile`);
            setFriends(res.data.friends || []);
        } catch (err) {
            console.error('Failed to fetch friends', err);
        }
    };

    const sendFriendRequest = async (receiverId) => {
        try {
            const response = await axios.post(`${API_URL}/friend-request`, {
                senderId: currentUserId,
                receiverId
            });
            if (response.data.autoAccepted) {
                alert(response.data.message);
                fetchFriends(); // Refresh friends list
            } else {
                alert('Friend request sent!');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send request');
        }
    };

    const isFriend = (playerId) => {
        return friends.some(f => f.id === playerId || f._id === playerId);
    };

    // Always show the sidebar when in a room
    if (roomId === 'default') {
        return null;
    }

    return (
        <div className="room-players-sidebar">
            <div className="players-header">
                <Users size={20} />
                <h3>Players ({players.length})</h3>
            </div>
            <div className="players-list">
                {players.length === 0 ? (
                    <div className="empty-players">
                        <p>Loading players...</p>
                    </div>
                ) : (
                    players.map(player => (
                        <div key={player.id} className={`player-item ${player.id === currentUserId ? 'current-user' : ''}`}>
                            <div className="player-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                {player.avatar && player.avatar.includes('.') ? (
                                    <img
                                        src={`/profiles/${player.avatar}`}
                                        alt={player.username}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                        onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                    />
                                ) : (
                                    player.avatar || '🐱'
                                )}
                            </div>
                            <div className="player-info">
                                <span className="player-name">{player.username}</span>
                                {player.id === currentUserId && <span className="you-badge">You</span>}
                            </div>
                            {player.id !== currentUserId && (
                                isFriend(player.id) ? (
                                    <div className="friend-icon" title="Friend">
                                        <UserCheck size={16} />
                                    </div>
                                ) : (
                                    <button
                                        className="add-friend-btn-small"
                                        onClick={() => sendFriendRequest(player.id)}
                                        title="Send Friend Request"
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                )
                            )}
                            {player.id === currentUserId && (
                                <span className="player-credits">{player.credits} 🪙</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RoomPlayers;
