import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Bell, Check, X, Copy, LogIn } from 'lucide-react';
import './Notifications.css';

const API_URL = 'http://localhost:5000/api/users';
const socket = io('http://localhost:5000');

const Notifications = ({ user, onUpdateUser, onJoinRoom }) => {
    const [notifications, setNotifications] = useState([]);
    const [showPanel, setShowPanel] = useState(false);
    const [roomInvites, setRoomInvites] = useState([]);

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
            // Refresh every 5 seconds
            const interval = setInterval(fetchNotifications, 5000);

            // Listen for room invites
            socket.on('room-invite-received', (data) => {
                console.log('Room invite received:', data);
                const newInvite = {
                    id: `invite-${Date.now()}`,
                    type: 'room_invite',
                    from: data.fromUsername,
                    roomId: data.roomId,
                    roomName: data.roomName,
                    timestamp: data.timestamp
                };
                setRoomInvites(prev => [newInvite, ...prev]);
                // Auto-remove after 20 seconds
                setTimeout(() => {
                    setRoomInvites(prev => prev.filter(inv => inv.id !== newInvite.id));
                }, 20000);
            });

            return () => {
                clearInterval(interval);
                socket.off('room-invite-received');
            };
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_URL}/${user.id}/profile`);
            const friendRequests = res.data.friendRequests || [];
            setNotifications(friendRequests.map(req => ({
                id: req.id,
                type: 'friend_request',
                from: req.username,
                avatar: req.avatar,
                data: req
            })));
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    // Combine friend requests and room invites
    const allNotifications = [...roomInvites, ...notifications];

    const acceptFriendRequest = async (senderId) => {
        try {
            await axios.post(`${API_URL}/friend-accept`, {
                userId: user.id,
                senderId: senderId
            });
            alert('Friend added!');
            fetchNotifications();
        } catch (err) {
            console.error('Accept error:', err);
            alert(err.response?.data?.message || 'Failed to accept request');
        }
    };

    const rejectFriendRequest = async (senderId) => {
        try {
            await axios.post(`${API_URL}/friend-reject`, {
                userId: user.id,
                senderId: senderId
            });
            alert('Friend request rejected');
            fetchNotifications();
        } catch (err) {
            console.error('Reject error:', err);
        }
    };

    const copyRoomId = (roomId) => {
        navigator.clipboard.writeText(roomId);
        alert('Room ID copied!');
    };

    const joinRoom = (roomId) => {
        if (onJoinRoom) {
            onJoinRoom(roomId);
            setShowPanel(false);
        } else {
            alert(`Joining room ${roomId}...`);
        }
    };

    return (
        <>
            <button className="notification-bell" onClick={() => setShowPanel(!showPanel)}>
                <Bell size={20} />
                {allNotifications.length > 0 && (
                    <span className="notification-badge">{allNotifications.length}</span>
                )}
            </button>

            {showPanel && (
                <div className="notifications-panel">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        <button className="close-notifications" onClick={() => setShowPanel(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="notifications-list">
                        {allNotifications.length === 0 ? (
                            <div className="empty-notifications">
                                <p>No notifications</p>
                            </div>
                        ) : (
                            allNotifications.map(notif => (
                                <div key={notif.id} className="notification-item">
                                    {notif.type === 'friend_request' && (
                                        <>
                                            <div className="notif-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                                <img
                                                    src={`/profiles/${notif.avatar || 'avatar1.png'}`}
                                                    alt="avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                                    onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                                />
                                            </div>
                                            <div className="notif-content">
                                                <p><strong>{notif.from}</strong> sent you a friend request</p>
                                            </div>
                                            <div className="notif-actions">
                                                <button
                                                    className="accept-notif-btn"
                                                    onClick={() => acceptFriendRequest(notif.id)}
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    className="reject-notif-btn"
                                                    onClick={() => rejectFriendRequest(notif.id)}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {notif.type === 'room_invite' && (
                                        <>
                                            <div className="notif-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                                <img
                                                    src={`/profiles/${notif.avatar || 'avatar1.png'}`}
                                                    alt="avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                                                    onError={(e) => e.target.src = '/profiles/avatar1.png'}
                                                />
                                            </div>
                                            <div className="notif-content">
                                                <p><strong>{notif.from}</strong> invited you to join</p>
                                                <span className="room-id-badge">#{notif.roomId}</span>
                                            </div>
                                            <div className="notif-actions">
                                                <button
                                                    className="join-notif-btn"
                                                    onClick={() => joinRoom(notif.roomId)}
                                                    title="Join Room"
                                                >
                                                    <LogIn size={16} />
                                                </button>
                                                <button
                                                    className="copy-notif-btn"
                                                    onClick={() => copyRoomId(notif.roomId)}
                                                    title="Copy Room ID"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Notifications;
