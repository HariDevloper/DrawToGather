import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Check, X, Copy, LogIn } from 'lucide-react';
import './Notifications.css';
import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const Notifications = ({ socket, user, onUpdateUser, onJoinRoom, externalShow, onToggle }) => {
    const [notifications, setNotifications] = useState([]);
    const [internalShow, setInternalShow] = useState(false);
    const showPanel = externalShow !== undefined ? externalShow : internalShow;
    const togglePanel = onToggle || (() => setInternalShow(!internalShow));
    const [roomInvites, setRoomInvites] = useState([]);

    useEffect(() => {
        const userId = user?.id || user?._id;
        if (userId) {
            fetchNotifications();
            // Refresh every 5 seconds
            const interval = setInterval(fetchNotifications, 5000);

            socket.on('room-invite-received', (data) => {
                console.log('Room invite received:', data);
                // Trigger immediate fetch to show the new invite synchronized with DB
                fetchNotifications();
            });

            return () => {
                clearInterval(interval);
                socket.off('room-invite-received');
            };
        }
    }, [user]);

    const fetchNotifications = async () => {
        const userId = user?.id || user?._id;
        try {
            const res = await axios.get(`${API_URL}/${userId}/profile`);
            const friendRequests = res.data.friendRequests || [];
            const dbRoomInvites = res.data.roomInvites || [];

            setNotifications(friendRequests.map(req => ({
                id: req.id,
                type: 'friend_request',
                from: req.username,
                avatar: req.avatar,
                data: req
            })));

            // 2. Handle Room Invites - replace state to avoid duplicates/stale items
            setRoomInvites(dbRoomInvites.map(dbi => ({
                id: dbi.id,
                type: 'room_invite',
                from: dbi.from,
                avatar: dbi.fromAvatar || 'avatar1.png',
                roomId: dbi.roomId,
                roomName: dbi.roomName,
                timestamp: dbi.timestamp,
                isPersistent: true
            })));
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    const handleInviteAction = async (invite, action) => {
        const userId = user?.id || user?._id;
        if (action === 'accept') {
            onJoinRoom(invite.roomId);
        }

        // Remove from UI
        setRoomInvites(prev => prev.filter(i => i.id !== invite.id));

        // Delete from DB if it was persistent
        if (invite.id && !invite.id.startsWith('invite-')) {
            try {
                await axios.post(`${API_URL}/room-invite-dismiss`, {
                    userId,
                    inviteId: invite.id
                });
            } catch (err) {
                console.error('Failed to delete invite from DB', err);
            }
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
            togglePanel(false);
        } else {
            alert(`Joining room ${roomId}...`);
        }
    };

    return (
        <>
            <button className="notification-bell" onClick={(e) => {
                e.stopPropagation();
                togglePanel();
            }}>
                <Bell size={24} />
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
                                                <p><strong>{notif.from}</strong> wants to play with you! 🎮</p>
                                                <p className="notif-subtext">Room: <strong>{notif.roomName || 'Untitled'}</strong></p>
                                            </div>
                                            <div className="notif-actions">
                                                <button
                                                    className="join-notif-btn"
                                                    onClick={() => handleInviteAction(notif, 'accept')}
                                                    title="Join Room"
                                                >
                                                    <LogIn size={16} />
                                                </button>
                                                <button
                                                    className="reject-notif-btn"
                                                    onClick={() => handleInviteAction(notif, 'dismiss')}
                                                    title="Dismiss"
                                                >
                                                    <X size={16} />
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
