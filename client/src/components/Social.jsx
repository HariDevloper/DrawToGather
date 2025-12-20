import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, UserPlus, Check, X, Users, MessageCircle, LogIn, UserMinus, RefreshCw } from 'lucide-react';
import './Social.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const Social = ({ user, onUpdateUser, onJoinFriend, onOpenChat }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API_URL}/${user.id}/profile`);
            setProfile(res.data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await axios.get(`${API_URL}/search?q=${query}`);
            setSearchResults(res.data.filter(u => u.id !== user.id));
        } catch (err) {
            console.error('Search failed', err);
        }
    };

    const sendRequest = async (receiverId) => {
        try {
            const response = await axios.post(`${API_URL}/friend-request`, { senderId: user.id, receiverId });
            if (response.data.autoAccepted) {
                // They both sent requests! Now friends
                alert(response.data.message);
                fetchProfile(); // Refresh to show new friend
            } else {
                alert('Friend request sent!');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send request');
        }
    };

    const acceptRequest = async (senderId) => {
        try {
            await axios.post(`${API_URL}/friend-accept`, { userId: user.id, senderId });
            fetchProfile();
            alert('Friend added!');
        } catch (err) {
            console.error('Failed to accept', err);
            alert('Failed to accept friend request');
        }
    };

    const rejectRequest = async (senderId) => {
        try {
            await axios.post(`${API_URL}/friend-reject`, { userId: user.id, senderId });
            fetchProfile();
            alert('Friend request rejected');
        } catch (err) {
            console.error('Failed to reject', err);
            alert('Failed to reject friend request');
        }
    };

    const removeFriend = async (friendId) => {
        if (!confirm('Are you sure you want to remove this friend?')) return;
        try {
            await axios.post(`${API_URL}/friend-remove`, { userId: user.id, friendId });
            fetchProfile();
            alert('Friend removed');
        } catch (err) {
            console.error('Failed to remove friend', err);
            alert('Failed to remove friend');
        }
    };

    const handleJoin = (friend) => {
        if (!friend.currentRoom || friend.currentRoom === 'default') {
            alert(`${friend.username} is not in a room right now`);
            return;
        }

        if (onJoinFriend) {
            onJoinFriend(friend.currentRoom);
        } else {
            alert(`Join ${friend.username} in room #${friend.currentRoom}!`);
        }
    };

    const handleChat = (friend) => {
        if (onOpenChat) {
            onOpenChat(friend);
        } else {
            alert(`Chat with ${friend.username}! (Feature coming soon)`);
        }
    };

    // Separate display logic
    const displayContent = () => {
        if (searchQuery) {
            // Show search results
            return searchResults.map(person => {
                const isFriend = profile?.friends?.some(f => f.id === person.id);
                const isRequest = profile?.friendRequests?.some(r => r.id === person.id);

                return (
                    <div key={`search-${person.id}`} className="social-item">
                        <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                            <img
                                src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                alt={person.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                onError={(e) => e.target.src = '/profiles/avatar1.png'}
                            />
                        </div>
                        <div className="social-info">
                            <span className="social-name">{person.username}</span>
                            {isFriend && <span className="friend-badge">Friend</span>}
                            {isRequest && <span className="request-badge">Request</span>}
                        </div>
                        <div className="social-actions">
                            {!isFriend && !isRequest && (
                                <button className="add-friend-btn" onClick={() => sendRequest(person.id)}>
                                    <UserPlus size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            });
        } else {
            // Show friends and requests separately
            const friends = profile?.friends || [];
            const requests = profile?.friendRequests || [];

            return (
                <>
                    {requests.length > 0 && (
                        <div className="social-section">
                            <h3 className="section-title">Friend Requests</h3>
                            {requests.map(person => (
                                <div key={`request-${person.id}`} className="social-item">
                                    <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                        <img
                                            src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                            alt={person.username}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                            onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                        />
                                    </div>
                                    <div className="social-info">
                                        <span className="social-name">{person.username}</span>
                                        <span className="request-badge">Request</span>
                                    </div>
                                    <div className="social-actions">
                                        <button className="accept-btn" onClick={() => acceptRequest(person.id)} title="Accept request">
                                            <Check size={18} />
                                        </button>
                                        <button className="reject-btn" onClick={() => rejectRequest(person.id)} title="Reject request">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {friends.length > 0 && (
                        <div className="social-section">
                            <h3 className="section-title">Friends</h3>
                            {friends.map(person => (
                                <div key={`friend-${person.id}`} className="social-item">
                                    <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                        <img
                                            src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                            alt={person.username}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                            onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                        />
                                    </div>
                                    <div className="social-info">
                                        <span className="social-name">{person.username}</span>
                                        {person.currentRoom && person.currentRoom !== 'default' ? (
                                            <span className="status-badge playing">Playing #{person.currentRoom}</span>
                                        ) : person.onlineStatus ? (
                                            <span className="status-badge online">Online</span>
                                        ) : (
                                            <span className="status-badge offline">Offline</span>
                                        )}
                                    </div>
                                    <div className="social-actions">
                                        {person.currentRoom && person.currentRoom !== 'default' ? (
                                            <button className="join-btn" onClick={() => handleJoin(person)} title="Join their room">
                                                <LogIn size={18} />
                                            </button>
                                        ) : (
                                            <button className="join-btn disabled" title="Not in a room" disabled>
                                                <LogIn size={18} />
                                            </button>
                                        )}
                                        <button className="chat-btn" onClick={() => handleChat(person)} title="Chat">
                                            <MessageCircle size={18} />
                                        </button>
                                        <button className="remove-friend-btn" onClick={() => removeFriend(person.id)} title="Remove friend">
                                            <UserMinus size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            );
        }
    };

    const hasContent = searchQuery ? searchResults.length > 0 : (profile?.friends?.length > 0 || profile?.friendRequests?.length > 0);

    return (
        <div className="social-container">
            <div className="social-search">
                <div className="search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <button className="refresh-icon-btn" onClick={fetchProfile} title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <div className="social-list">
                {!hasContent ? (
                    <div className="empty-social">
                        <p>{searchQuery ? 'No users found' : 'No friends yet... search to add!'}</p>
                    </div>
                ) : (
                    displayContent()
                )}
            </div>
        </div>
    );
};

export default Social;
