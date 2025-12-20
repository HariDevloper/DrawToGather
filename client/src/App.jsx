import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import ProfileModal from './components/ProfileModal';
import { Pencil, Eraser, Trash2, Users, CreditCard, Plus, X, LogOut, RefreshCw, Pipette, User as UserIcon } from 'lucide-react';
import Social from './components/Social';
import RoomPlayers from './components/RoomPlayers';
import Notifications from './components/Notifications';
import Toast from './components/Toast';
import './App.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const socket = io(BASE_URL);

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [isEyedropper, setIsEyedropper] = useState(false);
  const [roomId, setRoomId] = useState('default');

  // Default color palette
  const colorPalette = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF8800', // Orange
    '#8800FF', // Purple
    '#00FF88', // Mint
    '#FF0088', // Pink
  ];
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userFriends, setUserFriends] = useState([]);
  const [inviteCooldowns, setInviteCooldowns] = useState({}); // Track invite cooldowns per friend
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [view, setView] = useState('lobby'); // 'lobby' or 'canvas'
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser) {
        // Ensure id is present
        const userWithId = { ...savedUser, id: savedUser.id || savedUser._id };
        setUser(userWithId);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      // Emit user online status
      socket.emit('user-online', user.id || user._id);

      // Cleanup when tab/browser is closed
      const handleBeforeUnload = () => {
        if (roomId && roomId !== 'default') {
          socket.emit('leave-room', { roomId, userId: user.id || user._id });
        }
        socket.disconnect();
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user, roomId]);

  // Auto-refresh public rooms when in lobby
  useEffect(() => {
    if (view === 'lobby') {
      fetchPublicRooms();
      const interval = setInterval(fetchPublicRooms, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'canvas') return; // Only initialize when in canvas view

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    console.log('Joining room:', roomId, 'with userId:', user?.id || user?._id);
    socket.emit('join-room', { roomId, userId: user?.id || user?._id });

    socket.on('draw', (data) => {
      const { x, y, prevX, prevY, color, size } = data;
      drawOnCanvas(x, y, prevX, prevY, color, size);
    });

    socket.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('user-cursor', (data) => {
      const { socketId, x, y, username } = data;
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { x, y, username }
      }));
    });

    socket.on('player-joined', (data) => {
      // Refresh room players when someone joins
      if (roomId !== 'default') {
        fetchRoomPlayers();
        if (data.username && data.userId !== user?.id) {
          showToast(`${data.username} joined the room`, 'join');
        }
      }
    });

    socket.on('player-left', (data) => {
      // Refresh room players when someone leaves
      if (roomId !== 'default') {
        fetchRoomPlayers();

        // Remove their cursor if they had one
        if (data.socketId) {
          setRemoteCursors(prev => {
            const newCursors = { ...prev };
            delete newCursors[data.socketId];
            return newCursors;
          });
        }

        if (data.username && data.userId !== user?.id) {
          showToast(`${data.username} left the room`, 'leave');
        }
      }
    });

    const handleResize = () => {
      if (!canvas) return;
      // Save current content
      const tempImage = canvas.toDataURL();

      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      contextRef.current = context;

      // Restore content
      const img = new Image();
      img.src = tempImage;
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      };
    };

    window.addEventListener('resize', handleResize);

    return () => {
      socket.off('draw');
      socket.off('clear-canvas');
      socket.off('user-cursor');
      socket.off('player-joined');
      socket.off('player-left');
      window.removeEventListener('resize', handleResize);
    };
  }, [roomId, view]);

  const drawOnCanvas = (x, y, prevX, prevY, drawColor, drawSize) => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = drawColor;
    contextRef.current.lineWidth = drawSize;
    contextRef.current.beginPath();
    contextRef.current.moveTo(prevX, prevY);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    contextRef.current.closePath();
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;

    // If eyedropper is active, pick color from canvas
    if (isEyedropper) {
      pickColorFromCanvas(offsetX, offsetY);
      return;
    }

    lastPos.current = { x: offsetX, y: offsetY };
    setIsDrawing(true);
  };

  const pickColorFromCanvas = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    // Get pixel data at the clicked position (multiply by 2 for retina display)
    const pixelData = context.getImageData(x * 2, y * 2, 1, 1).data;

    // Convert RGB to hex
    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    setColor(hexColor);
    setIsEyedropper(false);
    setIsEraser(false);
  };

  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const prevX = lastPos.current.x;
    const prevY = lastPos.current.y;

    const currentColor = isEraser ? '#ffffff' : color;
    drawOnCanvas(offsetX, offsetY, prevX, prevY, currentColor, brushSize);

    socket.emit('draw', {
      roomId,
      x: offsetX,
      y: offsetY,
      prevX,
      prevY,
      color: currentColor,
      size: brushSize
    });

    lastPos.current = { x: offsetX, y: offsetY };
  };

  const handleMouseMove = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;

    // Emit cursor position
    socket.emit('mouse-move', {
      roomId,
      socketId: socket.id,
      x: offsetX,
      y: offsetY,
      username: user?.username
    });

    // If drawing, call draw
    if (isDrawing) {
      draw({ nativeEvent });
    }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchRoomPlayers = async () => {
    if (!roomId || roomId === 'default') return;
    try {
      const res = await axios.get(`${API_URL}/users/room/${roomId}/players`);
      setRoomPlayers(res.data);
    } catch (err) {
      console.error('Failed to fetch room players', err);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not ready yet');
      return;
    }
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-canvas', roomId);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName) return;

    console.log('Full user object:', user);
    console.log('User ID:', user?.id);
    console.log('User _ID:', user?._id);

    if (!user || (!user.id && !user._id)) {
      alert('Please log in again - user session expired');
      return;
    }

    try {
      const userId = user.id || user._id;
      console.log('Creating room with userId:', userId);

      const res = await axios.post(`${API_URL}/rooms/create`, {
        name: newRoomName,
        userId: userId,
        isPublic: true
      });
      setRoomId(res.data.room.roomId);
      setUser({ ...user, credits: res.data.credits });
      setShowCreateModal(false);
      setNewRoomName('');
      setView('canvas');
      clearCanvas();
    } catch (err) {
      console.error('Room creation error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(err.response?.data?.message || err.message || 'Failed to create room');
    }
  };

  const handleJoinRoom = (id) => {
    if (!id) return;
    // Remove # if present
    const cleanId = id.replace('#', '');
    setRoomId(cleanId);
    setShowJoinModal(false);
    setJoinRoomId('');
    setView('canvas');
    clearCanvas();
  };

  const handleLeaveRoom = () => {
    // Emit leave-room event to server
    socket.emit('leave-room', { roomId, userId: user?.id || user?._id });

    // Set view back to lobby instead of reloading
    setView('lobby');
    setRoomId('default');
  };

  const fetchPublicRooms = async () => {
    try {
      const res = await axios.get(`${API_URL}/rooms/public`);
      setPublicRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  const fetchUserFriends = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API_URL}/users/${user.id}/profile`);
      setUserFriends(res.data.friends || []);
    } catch (err) {
      console.error('Failed to fetch friends', err);
    }
  };

  const handleInviteFriend = (friend) => {
    // Check cooldown
    if (inviteCooldowns[friend.id]) {
      const timeLeft = Math.ceil((inviteCooldowns[friend.id] - Date.now()) / 1000);
      alert(`Please wait ${timeLeft} seconds before inviting ${friend.username} again`);
      return;
    }

    // Send room invitation via socket
    socket.emit('send-room-invite', {
      fromUserId: user.id,
      fromUsername: user.username,
      toUserId: friend.id,
      roomId: roomId,
      roomName: `Room #${roomId}`
    });
    alert(`Invitation sent to ${friend.username}!`);

    // Set 20-second cooldown
    const cooldownEnd = Date.now() + 20000;
    setInviteCooldowns(prev => ({ ...prev, [friend.id]: cooldownEnd }));

    // Remove cooldown after 20 seconds
    setTimeout(() => {
      setInviteCooldowns(prev => {
        const newCooldowns = { ...prev };
        delete newCooldowns[friend.id];
        return newCooldowns;
      });
    }, 20000);
  };

  const handleLogout = () => {
    // Leave room if in one
    if (roomId && roomId !== 'default') {
      socket.emit('leave-room', { roomId, userId: user?.id || user?._id });
    }

    // Disconnect from socket
    socket.disconnect();

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Reload page to clean state
    window.location.reload();
  };

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Auth onLogin={(userData) => setUser(userData)} />
      </GoogleOAuthProvider>
    );
  }

  if (!user.isProfileComplete) {
    return (
      <Onboarding
        user={user}
        onComplete={(updatedUser) => setUser(updatedUser)}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top Bar */}
      <motion.div
        className="top-bar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="logo" onClick={() => setView('lobby')} style={{ cursor: 'pointer' }}>DrawToGather</div>

        <div className="top-stats">
          <div className="stat-pill credits">
            <CreditCard size={18} />
            <span>{user?.credits || 0}</span>
          </div>

          <div
            className="stat-pill profile-btn"
            onClick={() => setShowProfile(true)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 5px', background: 'var(--white)', border: '2px solid var(--yellow-primary)', borderRadius: '20px' }}
          >
            <div className="profile-img-small" style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--text-dark)' }}>
              <img
                src={`/profiles/${user?.avatar || 'avatar1.png'}`}
                alt="profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                onError={(e) => e.target.src = '/profiles/avatar1.png'}
              />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{user?.username}</span>
          </div>

          {view === 'canvas' && (
            <div className="stat-pill room">
              <Users size={18} />
              <span>#{roomId}</span>
            </div>
          )}
          {view === 'canvas' && roomId !== 'default' && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="invite-friends-btn"
                onClick={() => {
                  fetchUserFriends();
                  setShowInviteModal(true);
                }}
                title="Invite Friends"
              >
                <Users size={18} />
                Invite
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="leave-btn"
                onClick={handleLeaveRoom}
              >
                Leave
              </motion.button>
            </>
          )}
        </div>

        <div className="top-right">
          <Notifications user={user} onUpdateUser={setUser} onJoinRoom={handleJoinRoom} />
        </div>
      </motion.div >

      {view === 'lobby' ? (
        <motion.div
          className="lobby-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="lobby-header">
            <h1>Welcome back, {user.username}!</h1>
            <p>Ready to create some masterpieces?</p>
          </div>

          <div className="lobby-grid">
            <div className="lobby-section rooms">
              <div className="section-header">
                <h2>Public Rooms</h2>
                <button className="refresh-btn" onClick={fetchPublicRooms}>Refresh</button>
              </div>
              <div className="rooms-list">
                {publicRooms.length === 0 ? (
                  <div className="empty-state">
                    <p>No rooms active... be the first!</p>
                    <button className="lobby-action-btn create" onClick={() => setShowCreateModal(true)}>
                      <Plus size={20} /> Create Room
                    </button>
                  </div>
                ) : (
                  <div className="lobby-rooms-grid">
                    {publicRooms.map(room => (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        key={room.roomId}
                        className="lobby-room-card"
                        onClick={() => handleJoinRoom(room.roomId)}
                      >
                        <div className="room-details">
                          <span className="name">{room.name}</span>
                          <span className="creator">by {room.creator?.username}</span>
                        </div>
                        <div className="room-join">
                          <span className="id">#{room.roomId}</span>
                          <button className="join-pill">Join</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lobby-section social">
              <div className="section-header">
                <h2>Social Club</h2>
              </div>
              <Social user={user} onUpdateUser={setUser} onJoinFriend={handleJoinRoom} />
            </div>
          </div>

          <div className="lobby-footer-actions">
            <button className="lobby-big-btn create" onClick={() => setShowCreateModal(true)}>
              <Plus size={24} />
              <span>Create New Room</span>
            </button>
            <button className="lobby-big-btn join" onClick={() => setShowJoinModal(true)}>
              <Users size={24} />
              <span>Join by ID</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Canvas Area */}
          <div className="canvas-wrapper">
            <canvas
              onMouseDown={startDrawing}
              onMouseUp={finishDrawing}
              onMouseMove={handleMouseMove}
              ref={canvasRef}
              className={`drawing-canvas ${isEyedropper ? 'eyedropper-active' : ''}`}
            />

            {Object.entries(remoteCursors).map(([id, pos]) => (
              <motion.div
                key={id}
                className="remote-cursor"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  pointerEvents: 'none'
                }}
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              >
                <div className="cursor-pencil" />
                <span className="cursor-label">{pos.username}</span>
              </motion.div>
            ))}
          </div>

          {/* Left Tools Sidebar */}
          <motion.div
            className="tools-sidebar"
            initial={{ x: -100 }}
            animate={{ x: 0 }}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`tool-btn ${!isEraser && !isEyedropper ? 'active' : ''}`}
              onClick={() => {
                setIsEraser(false);
                setIsEyedropper(false);
              }}
              title="Pencil"
            >
              <Pencil size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`tool-btn ${isEraser ? 'active' : ''}`}
              onClick={() => {
                setIsEraser(true);
                setIsEyedropper(false);
              }}
              title="Eraser"
            >
              <Eraser size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`tool-btn ${isEyedropper ? 'active' : ''}`}
              onClick={() => {
                setIsEyedropper(true);
                setIsEraser(false);
              }}
              title="Eyedropper"
            >
              <Pipette size={24} />
            </motion.button>
            <div className="sidebar-divider" />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="tool-btn clear"
              onClick={clearCanvas}
              title="Clear Canvas"
            >
              <Trash2 size={24} />
            </motion.button>
          </motion.div>

          {/* Bottom Properties Bar */}
          <motion.div
            className="properties-bar"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
          >
            <div className="properties-section">
              <div className="color-palette">
                {colorPalette.map((paletteColor) => (
                  <motion.button
                    key={paletteColor}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`color-swatch-small ${color === paletteColor ? 'active' : ''}`}
                    style={{ backgroundColor: paletteColor }}
                    onClick={() => {
                      setColor(paletteColor);
                      setIsEraser(false);
                      setIsEyedropper(false);
                    }}
                    title={paletteColor}
                  />
                ))}
              </div>
              <div className="vertical-divider" />
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setIsEraser(false);
                    setIsEyedropper(false);
                  }}
                  disabled={isEraser}
                  title="Custom Color"
                />
              </div>
              <div className="vertical-divider" />
              <div className="brush-slider-wrapper">
                <span className="slider-label">Size: {brushSize}px</span>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          {/* Side Actions */}
          <div className="side-actions">
            <motion.button
              whileHover={{ x: -5 }}
              className={`side-btn social ${showSocial ? 'active' : ''}`}
              onClick={() => setShowSocial(!showSocial)}
            >
              <Users size={24} />
              <span>Social</span>
            </motion.button>
            <motion.button
              whileHover={{ x: -5 }}
              className="side-btn lobby"
              onClick={() => setView('lobby')}
            >
              <Plus size={24} />
              <span>Lobby</span>
            </motion.button>
          </div>

          {/* Room Players Sidebar */}
          <RoomPlayers roomId={roomId} currentUserId={user?.id || user?._id} />
        </>
      )
      }

      <AnimatePresence>
        {showSocial && (
          <motion.div
            className="social-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="panel-header">
              <h2>Social Club</h2>
              <button className="close-panel" onClick={() => setShowSocial(false)}><X /></button>
            </div>
            <Social user={user} onUpdateUser={setUser} onJoinFriend={handleJoinRoom} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
            >
              <div className="modal-header">
                <h2>New Room!</h2>
                <button className="close-btn" onClick={() => setShowCreateModal(false)}><X /></button>
              </div>
              <p className="modal-desc">Creating a room costs 10 credits!</p>
              <input
                type="text"
                placeholder="Name your room..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="modal-input"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="confirm-btn"
                onClick={handleCreateRoom}
              >
                Let's Go! (10 🪙)
              </motion.button>
            </motion.div>
          </div>
        )}

        {showJoinModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
            >
              <div className="modal-header">
                <h2>Join Room</h2>
                <button className="close-btn" onClick={() => setShowJoinModal(false)}><X /></button>
              </div>

              <div className="join-input-group">
                <input
                  type="text"
                  placeholder="Enter Room ID..."
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="modal-input"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="confirm-btn"
                  onClick={() => handleJoinRoom(joinRoomId)}
                >
                  Join Now!
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {showInviteModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content invite-modal"
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
            >
              <div className="modal-header">
                <h2>Invite Friends</h2>
                <button className="close-btn" onClick={() => setShowInviteModal(false)}><X /></button>
              </div>

              <div className="friends-invite-list">
                {userFriends.length === 0 ? (
                  <div className="empty-friends">
                    <p>No friends yet! Add some friends to invite them</p>
                  </div>
                ) : (
                  userFriends.map(friend => {
                    const isInRoom = friend.currentRoom && friend.currentRoom !== 'default';
                    const isOnline = friend.onlineStatus;

                    return (
                      <div key={friend.id} className="friend-invite-item">
                        <div className="friend-info">
                          <div className="friend-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                            <img
                              src={`/profiles/${friend.avatar || 'avatar1.png'}`}
                              alt="friend"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                              onError={(e) => e.target.src = '/profiles/avatar1.png'}
                            />
                          </div>
                          <div className="friend-details">
                            <span className="friend-name">{friend.username}</span>
                            {isInRoom ? (
                              <span className="friend-status playing">Playing</span>
                            ) : isOnline ? (
                              <span className="friend-status online">Online</span>
                            ) : (
                              <span className="friend-status offline">Offline</span>
                            )}
                          </div>
                        </div>
                        {isOnline && !isInRoom ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="invite-btn-small"
                            onClick={() => handleInviteFriend(friend)}
                          >
                            Invite
                          </motion.button>
                        ) : isInRoom ? (
                          <span className="status-badge playing-badge">Playing</span>
                        ) : (
                          <span className="status-badge offline-badge">Offline</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onUpdate={(updatedUser) => {
              setUser({ ...user, ...updatedUser });
              // Update local storage
              const stored = JSON.parse(localStorage.getItem('user') || '{}');
              localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
            }}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div >
  );
}

export default App;
