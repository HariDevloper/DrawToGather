import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, UserPlus, Check, X, Users, MessageCircle, LogIn, UserMinus, RefreshCw } from 'lucide-react';
import './Social.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const Social = ({ socket, user, onUpdateUser, onJoinFriend, onOpenChat }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'discover'
    const [discoverUsers, setDiscoverUsers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const userId = user?.id || user?._id;
        if (userId) {
            fetchProfile();
        }
    }, [user]);

    useEffect(() => {
        if (socket) {
            socket.on('rooms-updated', fetchProfile);
            return () => socket.off('rooms-updated', fetchProfile);
        }
    }, [socket]);

    useEffect(() => {
        if (activeTab === 'discover') {
            fetchDiscoverUsers();
        }
    }, [activeTab]);

    const fetchProfile = async () => {
        const userId = user?.id || user?._id;
        try {
            setError(null);
            const res = await axios.get(`${API_URL}/${userId}/profile`);
            setProfile(res.data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
            setError('Failed to load social data');
        }
    };

    const fetchDiscoverUsers = async () => {
        const userId = user?.id || user?._id;
        try {
            const res = await axios.get(`${API_URL}/discover?userId=${userId}`);
            setDiscoverUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch discover users', err);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            return;
        }
        try {
            const userId = user?.id || user?._id;
            const res = await axios.get(`${API_URL}/search?q=${query}`);
            setSearchResults(res.data.filter(u => (u.id || u._id) !== userId));
        } catch (err) {
            console.error('Search failed', err);
        }
    };

    const sendRequest = async (receiverId) => {
        const userId = user?.id || user?._id;
        try {
            const response = await axios.post(`${API_URL}/friend-request`, { senderId: userId, receiverId });
            if (response.data.autoAccepted) {
                alert(response.data.message);
                fetchProfile();
                if (activeTab === 'discover') fetchDiscoverUsers();
            } else {
                alert('Friend request sent!');
                if (activeTab === 'discover') fetchDiscoverUsers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send request');
        }
    };

    const acceptRequest = async (senderId) => {
        const userId = user?.id || user?._id;
        try {
            await axios.post(`${API_URL}/friend-accept`, { userId, senderId });
            fetchProfile();
            alert('Friend added!');
        } catch (err) {
            console.error('Failed to accept', err);
            alert('Failed to accept friend request');
        }
    };

    const rejectRequest = async (senderId) => {
        const userId = user?.id || user?._id;
        try {
            await axios.post(`${API_URL}/friend-reject`, { userId, senderId });
            fetchProfile();
            alert('Friend request rejected');
        } catch (err) {
            console.error('Failed to reject', err);
            alert('Failed to reject friend request');
        }
    };

    const removeFriend = async (friendId) => {
        const userId = user?.id || user?._id;
        if (!confirm('Are you sure you want to remove this friend?')) return;
        try {
            await axios.post(`${API_URL}/friend-remove`, { userId, friendId });
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
        }
    };

    if (!profile) {
        return (
            <div className="social-loading">
                {error ? (
                    <div className="social-error">
                        <p>{error}</p>
                        <button onClick={fetchProfile} className="retry-btn">
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                ) : (
                    <p>Loading...</p>
                )}
            </div>
        );
    }

    const friends = profile?.friends || [];
    const requests = profile?.friendRequests || [];

    return (
        <>
            {/* Tab Navigation */}
            <div className="social-tabs">
                <button
                    className={`social-tab ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    <Users size={18} />
                    Friends
                </button>
                <button
                    className={`social-tab ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    <UserPlus size={18} />
                    Discover
                </button>
            </div>

            {/* Search Bar */}
            <div className="social-search">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder={activeTab === 'friends' ? "Search friends..." : "Search users..."}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
                <div className="social-section">
                    <h3 className="section-title">Search Results</h3>
                    {searchResults.map(person => {
                        const isFriend = friends.some(f => f.id === person.id);
                        const hasPendingRequest = requests.some(r => r.id === person.id);

                        return (
                            <div key={`search-${person.id}`} className="social-item">
                                <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                    <img
                                        src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                        alt={person.username}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                    />
                                </div>
                                <div className="social-info">
                                    <span className="social-name">{person.username}</span>
                                    {isFriend && <span className="status-badge friend">Friend</span>}
                                    {hasPendingRequest && <span className="status-badge pending">Pending</span>}
                                </div>
                                <div className="social-actions">
                                    {!isFriend && !hasPendingRequest && (
                                        <button className="add-btn" onClick={() => sendRequest(person.id)} title="Send friend request">
                                            <UserPlus size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && !searchQuery && (
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
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 className="section-title">Friends</h3>
                                <button className="refresh-btn-small" onClick={fetchProfile} title="Refresh">
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            {friends
                                .sort((a, b) => {
                                    // Sort by status: Playing (3) > Online (2) > Offline (1)
                                    const getStatusPriority = (person) => {
                                        if (person.currentRoom && person.currentRoom !== 'default') return 3; // Playing
                                        if (person.onlineStatus) return 2; // Online
                                        return 1; // Offline
                                    };
                                    return getStatusPriority(b) - getStatusPriority(a);
                                })
                                .map(person => (
                                    <div key={`friend-${person.id}`} className="social-item">
                                        <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                            <img
                                                src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                                alt={person.username}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                            />
                                        </div>
                                        <div className="social-info">
                                            <span className="social-name">{person.username}</span>
                                            {person.currentRoom && person.currentRoom !== 'default' ? (
                                                <span className="status-badge playing">🎨 Playing</span>
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
                                            ) : null}
                                            <button className="remove-btn" onClick={() => removeFriend(person.id)} title="Remove friend">
                                                <UserMinus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {friends.length === 0 && requests.length === 0 && (
                        <div className="social-empty">
                            <p>No friends yet!</p>
                            <p>Search for users or check the Discover tab</p>
                        </div>
                    )}
                </>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && !searchQuery && (
                <div className="social-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 className="section-title">Discover Users</h3>
                        <button className="refresh-btn-small" onClick={fetchDiscoverUsers} title="Refresh">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {discoverUsers.length > 0 ? (
                        discoverUsers.map(person => {
                            const isFriend = friends.some(f => f.id === person.id);
                            const hasPendingRequest = requests.some(r => r.id === person.id);

                            return (
                                <div key={`discover-${person.id}`} className="social-item">
                                    <div className="social-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                        <img
                                            src={`/profiles/${person.avatar || 'avatar1.png'}`}
                                            alt={person.username}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                        />
                                    </div>
                                    <div className="social-info">
                                        <span className="social-name">{person.username}</span>
                                        {person.onlineStatus ? (
                                            <span className="status-badge online">Online</span>
                                        ) : (
                                            <span className="status-badge offline">Offline</span>
                                        )}
                                    </div>
                                    <div className="social-actions">
                                        {!isFriend && !hasPendingRequest && (
                                            <button className="add-btn" onClick={() => sendRequest(person.id)} title="Send friend request">
                                                <UserPlus size={18} />
                                            </button>
                                        )}
                                        {isFriend && <span className="status-badge friend">Friend</span>}
                                        {hasPendingRequest && <span className="status-badge pending">Pending</span>}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="social-empty">
                            <p>No users to discover right now</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default Social;
