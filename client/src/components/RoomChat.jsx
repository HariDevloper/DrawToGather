import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import './RoomChat.css';

const RoomChat = ({ socket, roomId, user }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!socket || !roomId) return;

        // Listen for room messages
        socket.on('room-message', (data) => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                username: data.username,
                message: data.message,
                timestamp: new Date()
            }]);
        });

        return () => {
            socket.off('room-message');
        };
    }, [socket, roomId]);

    const sendMessage = () => {
        if (!inputMessage.trim()) return;

        socket.emit('room-message', {
            roomId,
            username: user?.username || 'Anonymous',
            message: inputMessage
        });

        setInputMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="room-chat-container">
            <div className="chat-panel">
                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty">
                            <p>Start chatting!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const prevMsg = index > 0 ? messages[index - 1] : null;
                            const showUsername = !prevMsg || prevMsg.username !== msg.username;

                            return (
                                <div
                                    key={msg.id}
                                    className={`chat-message ${msg.username === user?.username ? 'own' : ''}`}
                                >
                                    {showUsername && (
                                        <div className="message-header">
                                            <span className="message-username">{msg.username}</span>
                                            <span className="message-time">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="message-content">{msg.message}</div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type a message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                    >
                        <Send size={18} color="white" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomChat;
