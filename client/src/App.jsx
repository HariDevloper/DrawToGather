import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import ProfileModal from './components/ProfileModal';
import Notifications from './components/Notifications';
import Toast from './components/Toast';
import SystemDiagnostics from './components/SystemDiagnostics';
import DailyRewards from './components/DailyRewards';
import Social from './components/Social';
import RoomPlayers from './components/RoomPlayers';
import DrawingExport from './components/DrawingExport';
import CreateRoomModal from './components/CreateRoomModal';
import MusicPlayer from './components/MusicPlayer';
import RoomChat from './components/RoomChat';
import ThemeSelector from './components/ThemeSelector';
import {
  Pencil, Eraser, Trash2, Users, CreditCard, Plus,
  X, LogOut, RefreshCw, Pipette, User as UserIcon,
  Gift, Save, Zap, Copy, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, Share2, Maximize, MessageSquare, Download,
  Pen, Cloud, Music, Bell, Play, Pause, SkipBack, SkipForward, Check, Home
} from 'lucide-react';
import './App.css';
import './room_layout.css';
import { API_URL, SOCKET_URL } from './config';
import { DEFAULT_COLOR_PALETTE, generateColorShades } from './utils/colorUtils';
import { PLAYLIST } from './data/playlist';

const VIRTUAL_SIZE = 2000;

const socket = io(SOCKET_URL);

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [colorShades, setColorShades] = useState(generateColorShades('#000000'));
  const [brushSize, setBrushSize] = useState(30);
  const [brushType, setBrushType] = useState('pencil'); // 'pencil', 'marker', 'spray'
  const [isEraser, setIsEraser] = useState(false);
  const [isEyedropper, setIsEyedropper] = useState(false);
  const [roomId, setRoomId] = useState('default');

  // Use imported color palette
  const colorPalette = DEFAULT_COLOR_PALETTE;

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [selectedBaseColor, setSelectedBaseColor] = useState(DEFAULT_COLOR_PALETTE[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [userFriends, setUserFriends] = useState([]);
  const [inviteCooldowns, setInviteCooldowns] = useState({}); // Track invite cooldowns per friend
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [view, setView] = useState('lobby'); // 'lobby' or 'canvas'
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [roomTheme, setRoomTheme] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0, show: false });
  const [mobileActiveTab, setMobileActiveTab] = useState('canvas'); // 'canvas', 'chat', 'tools'
  const [lobbyActiveTab, setLobbyActiveTab] = useState('main'); // 'main', 'social'

  // Music Player State
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio(PLAYLIST[0].url));
  const currentSong = PLAYLIST[currentSongIndex];

  const ThemeAmbient = ({ theme }) => {
    if (!theme || !theme.particles || theme.particles.length === 0) return null;

    const particleCount = 15; // Number of particles to show

    return (
      <div className="theme-particles-container">
        {[...Array(particleCount)].map((_, i) => {
          const particle = theme.particles[i % theme.particles.length];
          return (
            <motion.div
              key={i}
              className="theme-particle"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -50,
                opacity: 0,
                rotate: 0
              }}
              animate={{
                y: window.innerHeight + 50,
                opacity: [0, 0.7, 0.7, 0],
                rotate: 360,
                x: `calc(${Math.random() * window.innerWidth}px + ${Math.sin(i) * 80}px)`
              }}
              transition={{
                duration: 8 + Math.random() * 12,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }}
              style={{
                color: theme.primaryColor || '#FFA500'
              }}
            >
              {particle}
            </motion.div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    // Sync user to local storage whenever it changes
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // Fetch fresh user data on load to ensure lastDailyClaim is up to date
  useEffect(() => {
    const refreshUser = async () => {
      if (user?.id) {
        try {
          const res = await axios.get(`${API_URL}/users/${user.id}/profile`);
          // Merge with existing session data to keep token etc if needed, 
          // but mostly we just want the fresh db fields
          const freshUser = { ...user, ...res.data };
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (err) {
          console.error('Failed to refresh user profile:', err);
        }
      }
    };
    refreshUser();
  }, []); // Run once on mount (if user exists in state from lazy init)

  // Persist room state to localStorage
  useEffect(() => {
    if (roomId && roomId !== 'default') {
      localStorage.setItem('currentRoom', JSON.stringify({
        roomId,
        roomName,
        roomTheme,
        view
      }));
    } else {
      localStorage.removeItem('currentRoom');
    }
  }, [roomId, roomName, roomTheme, view]);

  // Restore room state on mount
  useEffect(() => {
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom && user) {
      try {
        const { roomId: savedRoomId, roomName: savedRoomName, roomTheme: savedTheme, view: savedView } = JSON.parse(savedRoom);
        if (savedRoomId && savedRoomId !== 'default') {
          setRoomId(savedRoomId);
          setRoomName(savedRoomName);
          setRoomTheme(savedTheme);
          setView(savedView);
        }
      } catch (err) {
        console.error('Failed to restore room state:', err);
        localStorage.removeItem('currentRoom');
      }
    }
  }, [user]); // Only run when user is loaded

  useEffect(() => {
    if (user) {
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

      socket.on('rooms-updated', () => {
        console.log('Rooms updated, refreshing...');
        fetchPublicRooms();
      });

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        socket.off('rooms-updated');
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

  // Fetch friends when invite modal opens
  useEffect(() => {
    if (showInviteModal && user?.id) {
      fetchUserFriends();
    }
  }, [showInviteModal]);

  useEffect(() => {
    if (view !== 'canvas') return; // Only initialize when in canvas view

    const canvas = canvasRef.current;
    if (!canvas) return;

    // FIXED INTERNAL RESOLUTION for cross-device consistency
    canvas.width = VIRTUAL_SIZE;
    canvas.height = VIRTUAL_SIZE;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    console.log('Joining room:', roomId, 'with userId:', user?.id || user?._id);
    socket.emit('join-room', { roomId, userId: user?.id || user?._id });

    socket.on('draw', (data) => {
      const { x, y, prevX, prevY, color, size, type } = data;
      drawOnCanvas(x, y, prevX, prevY, color, size, type);
    });

    // Listen for canvas sync (existing drawings when joining)
    socket.on('canvas-sync', (drawHistory) => {
      console.log(`Received ${drawHistory.length} draw events to sync`);
      // Replay all draw events
      drawHistory.forEach(data => {
        const { x, y, prevX, prevY, color, size, type } = data;
        drawOnCanvas(x, y, prevX, prevY, color, size, type);
      });
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

    // Listen for room deletion
    socket.on('room-deleted-notification', (data) => {
      showToast('The host has deleted this room', 'error');
      // Kick user back to lobby
      setTimeout(() => {
        handleLeaveRoom();
      }, 2000);
    });

    // Listen for theme changes
    socket.on('theme-changed', (data) => {
      console.log('Theme changed to:', data.theme);
      setRoomTheme(data.theme);
      showToast(`Theme changed to ${data.theme.name}`, 'info');
    });

    const handleResize = () => {
      // With fixed internal resolution, we don't need to do anything on resize
      // except maybe ensuring the CSS keeps it square (which is handled in room_layout.css)
    };

    window.addEventListener('resize', handleResize);

    return () => {
      socket.off('draw');
      socket.off('canvas-sync');
      socket.off('clear-canvas');
      socket.off('user-cursor');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('room-deleted-notification');
      window.removeEventListener('resize', handleResize);
    };
  }, [roomId, view]);

  const drawOnCanvas = (x, y, prevX, prevY, drawColor, drawSize, type = 'pencil') => {
    if (!contextRef.current) return;
    const ctx = contextRef.current;

    ctx.lineWidth = drawSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'marker') {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize * 1.5;
    } else if (type === 'spray') {
      ctx.globalAlpha = 1;
      const density = 30;
      for (let i = density; i--;) {
        const radius = drawSize * 1.0;
        const offsetX = (Math.random() - 0.5) * 2 * radius;
        const offsetY = (Math.random() - 0.5) * 2 * radius;
        ctx.fillStyle = drawColor;
        ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
      }
      return;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = drawColor;
    }

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1; // reset alpha
  };

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX || event.nativeEvent?.clientX;
      clientY = event.clientY || event.nativeEvent?.clientY;
    }

    // Map screen position to virtual 0-2000 system
    const x = ((clientX - rect.left) / rect.width) * VIRTUAL_SIZE;
    const y = ((clientY - rect.top) / rect.height) * VIRTUAL_SIZE;

    return { offsetX: x, offsetY: y };
  };

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);

    // If eyedropper is active, pick color from canvas
    if (isEyedropper) {
      pickColorFromCanvas(offsetX, offsetY);
      return;
    }

    lastPos.current = { x: offsetX, y: offsetY };
    setIsDrawing(true);

    // Initial dot for spray or single click
    if (brushType === 'spray' && !isEraser) {
      drawOnCanvas(offsetX, offsetY, offsetX, offsetY, color, brushSize, 'spray');
    }
  };

  const pickColorFromCanvas = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    // x and y are in virtual 2000x2000 coordinates
    const pixelData = context.getImageData(x, y, 1, 1).data;

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

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);

    // Smoothing: Use higher factor for less lag, or 1.0 for direct drawing
    const lerpX = offsetX;
    const lerpY = offsetY;

    const prevX = lastPos.current.x;
    const prevY = lastPos.current.y;

    const currentColor = isEraser ? '#ffffff' : color;
    const currentType = isEraser ? 'pencil' : brushType;

    drawOnCanvas(lerpX, lerpY, prevX, prevY, currentColor, brushSize, currentType);

    socket.emit('draw', {
      roomId,
      x: lerpX,
      y: lerpY,
      prevX,
      prevY,
      color: currentColor,
      size: brushSize,
      type: currentType
    });

    lastPos.current = { x: lerpX, y: lerpY };
  };

  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);

    // Emit cursor position - throttle to reduce network noise
    if (!window.lastMouseMoveEmit || Date.now() - window.lastMouseMoveEmit > 33) {
      socket.emit('mouse-move', {
        roomId,
        socketId: socket.id,
        x: offsetX,
        y: offsetY,
        username: user?.username
      });
      window.lastMouseMoveEmit = Date.now();
    }

    // Update local cursor preview
    setLocalCursor({ x: offsetX, y: offsetY, show: true });

    // If drawing, call draw
    if (isDrawing) {
      draw(e);
    }
  };

  const handleTouchStart = (e) => {
    if (e.cancelable) e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e) => {
    if (e.cancelable) e.preventDefault();
    handleMouseMove(e);
  };

  const handleTouchEnd = (e) => {
    if (e.cancelable) e.preventDefault();
    finishDrawing();
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

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      showToast('Room ID copied! Share without the # symbol', 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy Room ID', 'error');
    });
  };

  const handleCreateRoom = async (roomData) => {
    console.log('Full user object:', user);
    console.log('User ID:', user?.id);

    if (!user || (!user.id && !user._id)) {
      alert('Please log in again - user session expired');
      return;
    }

    try {
      const userId = user.id || user._id;
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Creating room with userId:', userId, 'and theme:', roomData.theme);

      const res = await axios.post(`${API_URL}/rooms/create`, {
        roomId,
        name: roomData.name,
        hostId: userId,
        isPublic: roomData.isPublic,
        theme: {
          id: roomData.theme.id,
          name: roomData.theme.name,
          background: roomData.theme.background
        }
      });

      setRoomId(roomId);
      setRoomTheme(roomData.theme);
      setRoomName(roomData.name);
      setShowCreateModal(false);

      // Update local user credits
      if (res.data.updatedCredits !== undefined) {
        setUser(prev => ({ ...prev, credits: res.data.updatedCredits }));
      }

      setView('canvas');
      clearCanvas();

      showToast(`Room "${roomData.name}" created!`, 'success');
    } catch (err) {
      console.error('Room creation error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to create room');
    }
  };

  const handleQuickPlay = async () => {
    if (!user || (!user.id && !user._id)) {
      alert('Please log in first');
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/rooms/random-public`);
      const randomRoom = res.data;

      setRoomId(randomRoom.id);
      setRoomName(randomRoom.name);
      if (randomRoom.theme) {
        setRoomTheme(randomRoom.theme);
      }
      setView('canvas');
      showToast(`Joined ${randomRoom.name}!`, 'success');
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('No public rooms available. Create one!', 'info');
      } else {
        console.error('Quick play error:', err);
        showToast('Failed to find a room', 'error');
      }
    }
  };

  const handleJoinRoom = async (id) => {
    if (!id) return;
    // Remove # if present
    const cleanId = id.replace('#', '');

    try {
      // Fetch room details to get name and theme
      const res = await axios.get(`${API_URL}/rooms/${cleanId}`);
      const roomData = res.data;

      setRoomId(cleanId);
      setRoomName(roomData.name);
      if (roomData.theme) {
        setRoomTheme(roomData.theme);
      }
      setShowJoinModal(false);
      setJoinRoomId('');
      setView('canvas');
      clearCanvas();
    } catch (err) {
      console.error('Failed to fetch room details:', err);
      // Still join even if we can't get details
      setRoomId(cleanId);
      setRoomName('Unknown Room');
      // Fallback to first theme (Sunset)
      setRoomTheme({
        id: 'sunset',
        name: 'Sunset Beach',
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)',
        preview: '🌅'
      });
      setShowJoinModal(false);
      setJoinRoomId('');
      setView('canvas');
      clearCanvas();
    }
  };

  const handleLeaveRoom = () => {
    // Show confirmation modal instead of window.confirm
    setShowLeaveModal(true);
  };

  const confirmLeaveRoom = () => {
    // Emit leave-room event to server
    socket.emit('leave-room', { roomId, userId: user?.id || user?._id });

    // Clear room state from localStorage
    localStorage.removeItem('currentRoom');

    // Force a page refresh for the user who left to ensure clean state
    // as requested by the user: "the page should refresh"
    window.location.reload();
  };

  const handleDeleteRoom = async () => {
    // Check if it's a default room
    const defaultRoomIds = ['default_room_1', 'default_room_2', 'default_room_3', 'default_room_4', 'default_room_5'];
    if (defaultRoomIds.includes(roomId)) {
      showToast('Cannot delete default rooms', 'error');
      return;
    }

    // Check if user is the host
    const isHost = roomPlayers.length > 0 && roomPlayers[0]?.id === user?.id;
    if (!isHost) {
      showToast('Only the host can delete the room', 'error');
      return;
    }

    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${roomName}"?\n\nThis will remove the room permanently and all players will be kicked out.`
    );

    if (!confirmDelete) return;

    try {
      // Delete room via API
      await axios.delete(`${API_URL}/rooms/${roomId}`);

      // Emit to all players in room that it's being deleted
      socket.emit('room-deleted', { roomId });

      // Leave the room
      handleLeaveRoom();

      showToast('Room deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete room:', err);
      showToast('Failed to delete room', 'error');
    }
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
      roomName: roomName || 'Room'
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

  // Music Player Functions
  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(e => console.log("Play failed:", e));
      setIsPlaying(true);
    }
  };

  const changeSong = (index) => {
    const audio = audioRef.current;
    audio.pause();
    setCurrentSongIndex(index);
    audio.src = PLAYLIST[index].url;
    audio.load();
    audio.play().catch(e => console.log("Play failed:", e));
    setIsPlaying(true);
  };

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      const nextIndex = (currentSongIndex + 1) % PLAYLIST.length;
      changeSong(nextIndex);
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentSongIndex]);

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
        <SystemDiagnostics />
      </GoogleOAuthProvider>
    );
  }

  if (!user.isProfileComplete) {
    return (
      <>
        <Onboarding
          user={user}
          onComplete={(updatedUser) => setUser(updatedUser)}
        />
        <SystemDiagnostics />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* 1. TOP BAR (Always Visible) */}
      <motion.nav
        className="top-bar"
      >
        <div className="logo brand-logo" onClick={() => setView('lobby')} style={{ cursor: 'pointer' }}>DrawToGather</div>

        <div className="top-stats">

          {view === 'lobby' && (
            <>
              <div className="stat-pill credits">
                <CreditCard size={18} />
                <span>{user?.credits || 0}</span>
              </div>

              <div
                className="stat-pill profile-img-btn"
                onClick={() => setShowProfile(true)}
              >
                <img
                  src={`/profiles/${user?.avatar || 'avatar1.png'}`}
                  alt="profile"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => e.target.src = '/profiles/avatar1.png'}
                />
              </div>

              <div
                className="stat-pill username-btn"
                onClick={() => {
                  navigator.clipboard.writeText(user?.username || '');
                  alert('Username copied to clipboard!');
                }}
                title="Click to copy username"
              >
                <span>{user?.username}</span>
              </div>

              <motion.div
                className="stat-pill gift-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDailyRewards(true)}
              >
                <Gift size={18} />
              </motion.div>
            </>
          )}

          {view === 'canvas' && (
            <>
              <div className="stat-pill room-name-display" style={{
                background: '#FF9A3D', // Match dark orange in diagram
                border: '3px solid #D67A1F',
                padding: '10px 25px',
                borderRadius: '15px',
                fontWeight: '900',
                fontSize: '1rem',
                color: 'white',
                boxShadow: '0 4px 0 #D67A1F',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ opacity: 0.9 }}>Room ID: #{roomId?.substring(0, 6) || '12345'}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={copyRoomId}
                  style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
                >
                  <Copy size={16} />
                </motion.button>
              </div>
            </>
          )}

        </div>

        <div className="top-right">
          {view === 'canvas' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="action-btn invite"
                style={{
                  background: 'var(--orange)',
                  color: 'var(--white)',
                  border: '4px solid #D67A1F',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 0 #D67A1F'
                }}
                onClick={() => setShowInviteModal(true)}
              >
                <Users size={18} />
                <span>Invite</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="action-btn leave"
                style={{
                  background: '#FF6B6B',
                  color: 'white',
                  border: '4px solid #E85555',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 0 #E85555'
                }}
                onClick={handleLeaveRoom}
              >
                <LogOut size={18} />
                <span>Leave</span>
              </motion.button>

              <div className="music-player-nav-wrap">
                <MusicPlayer
                  socket={socket}
                  roomId={roomId}
                  isHost={true} // EVERYONE CAN CHANGE MUSIC
                  externalShow={showMusicPlayer}
                  onToggle={() => {
                    setShowMusicPlayer(!showMusicPlayer);
                    if (!showMusicPlayer) setShowNotifications(false);
                  }}
                />
              </div>
            </>
          )}
          <Notifications
            socket={socket}
            user={user}
            onUpdateUser={setUser}
            onJoinRoom={handleJoinRoom}
            externalShow={showNotifications}
            onToggle={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) setShowMusicPlayer(false);
            }}
          />
        </div>
      </motion.nav>


      {/* 2. LOBBY VIEW */}
      {view === 'lobby' && (
        <motion.div
          className={`lobby-container lobby-active-${lobbyActiveTab}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile Lobby Navigation */}
          <div className="mobile-lobby-nav">
            <button
              className={`mobile-nav-item ${lobbyActiveTab === 'main' ? 'active' : ''}`}
              onClick={() => setLobbyActiveTab('main')}
            >
              <Home size={20} />
            </button>
            <button
              className={`mobile-nav-item ${lobbyActiveTab === 'social' ? 'active' : ''}`}
              onClick={() => setLobbyActiveTab('social')}
            >
              <Users size={20} />
            </button>
          </div>

          {/* LEFT SIDE - Social Club (Fixed) */}
          <motion.div
            className="lobby-social-panel"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="social-panel-header">
              <h2>Friends & Community</h2>
            </div>
            <Social socket={socket} user={user} onUpdateUser={setUser} onJoinFriend={handleJoinRoom} />
          </motion.div>

          {/* RIGHT/CENTER SIDE - Main Content */}
          <div className="lobby-main-content">
            {/* Playful Floating Party Animation - Top */}
            <motion.div
              className="lobby-party-hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <div className="party-scene">
                {/* Floating Balloons */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`balloon balloon-${i + 1}`}
                    animate={{
                      y: [0, -40, 0],
                      x: [0, i % 2 === 0 ? 20 : -20, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 4 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.5
                    }}
                  >
                    🎈
                  </motion.div>
                ))}

                <div className="party-content">
                  <motion.div
                    className="party-face"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    😊
                  </motion.div>

                  <div className="logo-group">
                    <motion.h1
                      className="party-title"
                      animate={{
                        color: ['#FF9A3D', '#FFD93D', '#FF6B6B', '#FF9A3D']
                      }}
                      transition={{ duration: 5, repeat: Infinity }}
                    >
                      DrawToGather
                    </motion.h1>

                    <motion.div
                      className="shhh-bubble"
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.2, 1, 0.8],
                        y: [0, -20, -30, -40]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                    >
                      🤫 Shhh... it's a masterpiece!
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Public Rooms Section (Smaller) */}
            <motion.div
              className="lobby-rooms-section"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="section-header">
                <h2>Public Rooms</h2>
                <button className="refresh-btn" onClick={fetchPublicRooms}>Refresh</button>
              </div>
              <div className="rooms-list">
                {publicRooms.length === 0 ? (
                  <div className="empty-state">
                    <p>No rooms active... be the first!</p>
                  </div>
                ) : (
                  <div className="lobby-rooms-grid">
                    {publicRooms.map((room, index) => (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        key={room.roomId || room.id}
                        className="lobby-room-card"
                        onClick={() => handleJoinRoom(room.roomId || room.id)}
                        style={{
                          background: room.theme?.background || 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(10px)'
                        }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div className="room-details">
                            <span className="name">{room.name}</span>
                            <span className="creator">by {room.creator?.username || room.creator || 'System'}</span>
                          </div>
                          <div className="room-join">
                            <span className="id" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Users size={14} />
                              {room.players || 0}/10
                            </span>
                            <button className="join-pill">Join</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons - Bottom */}
            <motion.div
              className="lobby-action-buttons"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <motion.button
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="lobby-action-btn create-new"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={22} /> Create New Room
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="lobby-action-btn join-id"
                onClick={() => setShowJoinModal(true)}
              >
                <Users size={22} /> Join by ID
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* 3. ROOM VIEW - INTEGRATED WITH EXISTING TOP BAR */}
      {view === 'canvas' && (
        <div className="room-layout">
          {/* Background with Theme Particles */}
          <div
            className="room-background"
            style={{
              background: roomTheme?.background || 'linear-gradient(135deg, #FFE66D 0%, #FFA500 50%, #FFD700 100%)'
            }}
          >
            <ThemeAmbient theme={roomTheme} />
          </div>

          {/* Mobile Bottom Navigation - Only visible on small vertical screens */}
          <div className="mobile-room-nav">
            <button
              className={`mobile-nav-item ${mobileActiveTab === 'canvas' ? 'active' : ''}`}
              onClick={() => setMobileActiveTab('canvas')}
            >
              <Pencil size={20} />
            </button>
            <button
              className={`mobile-nav-item ${mobileActiveTab === 'chat' ? 'active' : ''}`}
              onClick={() => setMobileActiveTab('chat')}
            >
              <MessageSquare size={20} />
            </button>
            <button
              className={`mobile-nav-item ${mobileActiveTab === 'tools' ? 'active' : ''}`}
              onClick={() => setMobileActiveTab('tools')}
            >
              <Zap size={20} />
            </button>
          </div>

          {/* Main Room Container */}
          <div className={`room-main-container mobile-active-${mobileActiveTab}`}>
            {/* Left Sidebar - Tools, Colors, Chat */}
            <div className="room-left-sidebar" onClick={() => { setShowMusicPlayer(false); setShowNotifications(false); }}>
              {/* 1st: Group Chat - Higher priority */}
              <div className="sidebar-section chat-section">
                <span className="sidebar-title">
                  <MessageSquare size={18} /> Group Chat
                </span>
                <div className="chat-container-fixed">
                  <RoomChat socket={socket} roomId={roomId} user={user} />
                </div>
              </div>

              {/* 2nd: Color Palette & Shades */}
              <div className="sidebar-section">
                <span className="sidebar-title">
                  <Pipette size={18} /> Color Palette
                </span>
                <div className="color-palette-compact">
                  <div className="color-grid-compact">
                    {colorPalette.map(c => (
                      <motion.button
                        key={c}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`color-dot-small ${selectedBaseColor === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setSelectedBaseColor(c);
                          setColor(c);
                          setColorShades(generateColorShades(c));
                          setIsEraser(false);
                          setIsEyedropper(false);
                        }}
                      />
                    ))}
                  </div>

                  {/* Color Shades - Gradient Bar */}
                  <div className="shades-compact" style={{ marginTop: '15px' }}>
                    <div
                      className="shades-grid-compact"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;

                        // Use the state-tracked base color
                        const shades = generateColorShades(selectedBaseColor);
                        const index = Math.round(percentage * (shades.length - 1));
                        const selectedShade = shades[Math.max(0, Math.min(index, shades.length - 1))];

                        setColor(selectedShade);
                        setIsEraser(false);
                        setIsEyedropper(false);
                      }}
                    >
                      <div
                        className="shade-gradient-bar"
                        style={{
                          background: `linear-gradient(to right, ${generateColorShades(selectedBaseColor).join(', ')})`
                        }}
                      >
                        <div
                          className="shade-selector"
                          style={{
                            left: (() => {
                              const shades = generateColorShades(selectedBaseColor);
                              const index = shades.indexOf(color);
                              return index >= 0 ? `${(index / (shades.length - 1)) * 100}%` : '0%';
                            })()
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Canvas Area */}
            <div className="room-canvas-area" onClick={() => { setShowMusicPlayer(false); setShowNotifications(false); }}>
              <motion.div
                className="canvas-frame"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  borderColor: roomTheme?.primaryColor || '#FFA500'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={VIRTUAL_SIZE}
                  height={VIRTUAL_SIZE}
                  onMouseDown={startDrawing}
                  onMouseUp={finishDrawing}
                  onMouseMove={handleMouseMove}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseEnter={() => setLocalCursor(prev => ({ ...prev, show: true }))}
                  onMouseLeave={() => setLocalCursor(prev => ({ ...prev, show: false }))}
                  className={`the-canvas ${isEyedropper ? 'cursor-eyedropper' : ''} ${localCursor.show ? 'hide-default-cursor' : ''}`}
                />

                {/* Remote Cursors Overlay */}
                <div className="cursors-layer">
                  {/* Local Brush Preview */}
                  {localCursor.show && !isEyedropper && (
                    <div
                      className="local-brush-preview"
                      style={{
                        left: (localCursor.x / VIRTUAL_SIZE) * 100 + "%",
                        top: (localCursor.y / VIRTUAL_SIZE) * 100 + "%",
                        width: (brushSize / VIRTUAL_SIZE) * 100 + "%",
                        height: (brushSize / VIRTUAL_SIZE) * 100 + "%",
                        background: isEraser ? '#ffffff' : color,
                        border: `2px solid ${isEraser ? '#ccc' : 'rgba(0,0,0,0.2)'}`,
                      }}
                    />
                  )}
                  {Object.entries(remoteCursors).map(([id, pos]) => (
                    <div
                      key={id}
                      className="remote-cursor"
                      style={{
                        left: (pos.x / VIRTUAL_SIZE) * 100 + "%",
                        top: (pos.y / VIRTUAL_SIZE) * 100 + "%"
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 3L19 12L12 13L9 21L5 3Z"
                          fill={roomTheme?.primaryColor || '#FFA500'}
                          stroke="white"
                          strokeWidth="2"
                        />
                      </svg>
                      <span className="cursor-label">{pos.username}</span>
                    </div>
                  ))}
                </div>

              </motion.div>

              {/* BOTTOM FLOATING TOOLBAR - Now outside the frame but centered with it */}
              <div className="canvas-bottom-toolbar-container">
                <div className="canvas-bottom-toolbar">
                  {/* Top Row: Brushes */}
                  <div className="toolbar-row tools-row">
                    <div className="toolbar-group brushes">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`tool-btn-floating ${!isEraser && !isEyedropper && brushType === 'pencil' ? 'active' : ''}`}
                        onClick={() => { setBrushType('pencil'); setIsEraser(false); setIsEyedropper(false); }}
                        title="Pencil"
                      >
                        <Pencil size={20} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`tool-btn-floating ${!isEraser && !isEyedropper && brushType === 'marker' ? 'active' : ''}`}
                        onClick={() => { setBrushType('marker'); setIsEraser(false); setIsEyedropper(false); }}
                        title="Marker"
                      >
                        <Pen size={20} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`tool-btn-floating ${!isEraser && !isEyedropper && brushType === 'spray' ? 'active' : ''}`}
                        onClick={() => { setBrushType('spray'); setIsEraser(false); setIsEyedropper(false); }}
                        title="Spray"
                      >
                        <Cloud size={20} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`tool-btn-floating ${isEraser ? 'active' : ''}`}
                        onClick={() => { setIsEraser(true); setIsEyedropper(false); }}
                        title="Eraser"
                      >
                        <Eraser size={20} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Bottom Row: Slider + Utilities */}
                  <div className="toolbar-row slider-row">
                    <div className="toolbar-group slider-group">
                      <div className="brush-dot-preview-mini" style={{ background: isEraser ? '#fff' : color, border: isEraser ? '2px solid #ccc' : 'none' }} />
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={brushSize}
                        onChange={(e) => setBrushSize(e.target.value)}
                        className="canvas-brush-slider"
                      />
                      <span className="brush-size-label">{brushSize}px</span>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group utility">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`tool-btn-floating ${isEyedropper ? 'active' : ''}`}
                        onClick={() => { setIsEyedropper(true); setIsEraser(false); }}
                        title="Color Picker"
                      >
                        <Pipette size={20} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="tool-btn-floating clear"
                        onClick={clearCanvas}
                        title="Clear Canvas"
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Theme, Music, Members, Actions */}
            <div className="room-right-sidebar">
              {/* 1st: Room Theme */}
              <div className="sidebar-section">
                <span className="sidebar-title">
                  <Zap size={18} /> Room Theme
                </span>
                <ThemeSelector
                  socket={socket}
                  roomId={roomId}
                  currentTheme={roomTheme}
                  isHost={true} // EVERYONE CAN CHANGE THEME
                />
              </div>

              {/* 2nd: Room Members - Stretches to fill space */}
              <div className="sidebar-section members-section">
                <span className="sidebar-title">
                  <Users size={18} /> Room Members
                </span>
                <div className="members-container-fixed">
                  <RoomPlayers roomId={roomId} currentUserId={user?.id || user?._id} />
                </div>
              </div>

              {/* 3rd: Quick Actions - At the bottom */}
              <div className="sidebar-section">
                <span className="sidebar-title">
                  <Zap size={18} /> Quick Actions
                </span>
                <div className="action-buttons-grid">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="action-btn share"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 size={18} />
                    <span>Share Room</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="action-btn save"
                    onClick={() => setShowExport(true)}
                  >
                    <Download size={18} />
                    <span>Save Drawing</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODALS & OVERLAYS */}
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
        {showDailyRewards && (
          <DailyRewards
            user={user}
            onClose={() => setShowDailyRewards(false)}
            onUpdateUser={setUser}
          />
        )}
        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
          />
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

              <p className="modal-desc" style={{ fontSize: '0.9rem', color: '#666' }}>
                💡 Paste the Room ID without the # symbol
              </p>

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

      <AnimatePresence>
        {showExport && (
          <DrawingExport
            canvasRef={canvasRef}
            user={user}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
                  <Share2 size={24} />
                  Share Room
                </h2>
                <button className="modal-close" onClick={() => setShowShareModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem', color: '#2C2C2C', marginBottom: '10px' }}>
                    Room Name
                  </label>
                  <div style={{
                    background: '#FFFBEA',
                    border: '3px solid #FFD93D',
                    borderRadius: '15px',
                    padding: '15px 20px',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#2C2C2C',
                    textAlign: 'center'
                  }}>
                    {roomName || 'Untitled Room'}
                  </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem', color: '#2C2C2C', marginBottom: '10px' }}>
                    Room ID
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #6C63FF 0%, #5A52E0 100%)',
                      border: '3px solid #5A52E0',
                      borderRadius: '15px',
                      padding: '15px 20px',
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: 'white',
                      textAlign: 'center',
                      letterSpacing: '1px',
                      fontFamily: 'monospace'
                    }}>
                      {roomId}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        copyRoomId();
                        showToast('Room ID copied!', 'success');
                      }}
                      style={{
                        background: '#4ECDC4',
                        border: '3px solid #3DBDB4',
                        borderRadius: '15px',
                        padding: '15px 20px',
                        cursor: 'pointer',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 0 #3DBDB4',
                        transition: 'all 0.2s'
                      }}
                      title="Copy Room ID"
                    >
                      <Copy size={20} />
                    </motion.button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem', color: '#2C2C2C', marginBottom: '10px' }}>
                    Share Link
                  </label>
                  <div style={{
                    background: '#F5F5F5',
                    border: '2px solid #E0E0E0',
                    borderRadius: '12px',
                    padding: '12px 15px',
                    fontSize: '0.85rem',
                    color: '#666',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {window.location.origin}/?join={roomId}
                  </div>
                </div>

                <div style={{ marginTop: '25px' }}>
                  <label style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem', color: '#2C2C2C', marginBottom: '12px' }}>
                    Share Via
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const shareText = `Join my drawing room "${roomName || 'Untitled Room'}"! Room ID: ${roomId}`;
                        const shareUrl = `${window.location.origin}/?join=${roomId}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
                      }}
                      style={{
                        background: '#25D366',
                        border: '3px solid #1DA851',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 0 #1DA851'
                      }}
                    >
                      <MessageSquare size={18} />
                      WhatsApp
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const shareText = `Join my drawing room "${roomName || 'Untitled Room'}"! Room ID: ${roomId}`;
                        const shareUrl = `${window.location.origin}/?join=${roomId}`;
                        window.location.href = `mailto:?subject=${encodeURIComponent('Join my DrawTogether room!')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
                      }}
                      style={{
                        background: '#EA4335',
                        border: '3px solid #C5221F',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 0 #C5221F'
                      }}
                    >
                      📧 Email
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const shareText = `Join my drawing room "${roomName || 'Untitled Room'}"!`;
                        const shareUrl = `${window.location.origin}/?join=${roomId}`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                      }}
                      style={{
                        background: '#1DA1F2',
                        border: '3px solid #1A8CD8',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 0 #1A8CD8'
                      }}
                    >
                      🐦 Twitter
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/?join=${roomId}`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                      }}
                      style={{
                        background: '#1877F2',
                        border: '3px solid #166FE5',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 0 #166FE5'
                      }}
                    >
                      👍 Facebook
                    </motion.button>
                  </div>
                </div>

                <div style={{
                  marginTop: '25px',
                  padding: '15px',
                  background: '#FFF9E6',
                  borderRadius: '12px',
                  border: '2px solid #FFD93D',
                  fontSize: '0.85rem',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  💡 Share the Room ID with friends so they can join!
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaveModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
                  <LogOut size={24} />
                  Leave Room?
                </h2>
                <button className="modal-close" onClick={() => setShowLeaveModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', color: '#2C2C2C', marginBottom: '15px' }}>
                    Are you sure you want to leave <strong>"{roomName}"</strong>?
                  </p>

                  {roomPlayers.length > 1 && roomPlayers[0]?.id === user?.id && (
                    <div style={{
                      padding: '12px',
                      background: '#FFF9E6',
                      borderRadius: '10px',
                      border: '2px solid #FFD93D',
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      ⚠️ You are the host. The next player will become the new host.
                    </div>
                  )}

                  {roomPlayers.length === 1 && (
                    <div style={{
                      padding: '12px',
                      background: '#FFE8E8',
                      borderRadius: '10px',
                      border: '2px solid #FF6B6B',
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      ⚠️ You are the only player. The room will be deleted.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLeaveModal(false)}
                    style={{
                      flex: 1,
                      background: 'white',
                      border: '3px solid #E0E0E0',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmLeaveRoom}
                    style={{
                      flex: 1,
                      background: '#FF6B6B',
                      border: '3px solid #E85555',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      color: 'white',
                      boxShadow: '0 4px 0 #E85555'
                    }}
                  >
                    Leave Room
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div >
  );
}

export default App;
