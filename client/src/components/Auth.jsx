import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Sun } from 'lucide-react';
import './Auth.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://drawtogather-backend.onrender.com';
const API_URL = `${BASE_URL}/api/auth`;

const Auth = ({ onLogin }) => {
    const [error, setError] = useState('');

    const handleSuccess = async (credentialResponse) => {
        try {
            const res = await axios.post(`${API_URL}/google`, {
                token: credentialResponse.credential
            });

            const userData = {
                ...res.data.user,
                id: res.data.user.id || res.data.user._id
            };

            onLogin(userData);
        } catch (err) {
            setError(err.response?.data?.message || 'Login Failed');
            console.error(err);
        }
    };

    return (
        <div className="auth-standard-container main-app-vibe">
            {/* Playful Background shapes */}
            <div className="bg-shape-1"></div>
            <div className="bg-shape-2"></div>

            <motion.div
                className="auth-main-card strong-style"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-card-left">
                    <div className="auth-brand">
                        <div className="brand-icon-box">
                            <Sun className="brand-sun" size={32} fill="#F4C430" />
                        </div>
                        <h1>DrawToGather</h1>
                    </div>

                    <div className="auth-welcome">
                        <h2>Start Drawing Together</h2>
                        <p>Join the community and create amazing art in real-time with your friends.</p>
                    </div>

                    <div className="auth-action-area">
                        <div className="google-btn-container-bold">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => setError('Login Failed')}
                                theme="filled_blue"
                                shape="pill"
                                size="large"
                                width="340"
                                text="continue_with"
                            />
                        </div>
                        {error && <p className="error-text-bold">{error}</p>}
                    </div>
                </div>

                <div className="auth-card-right highlight-yellow">
                    <div className="couple-animation-box vertical-center">
                        <svg viewBox="0 0 400 400" className="auth-animation realistic-scene">
                            <defs>
                                <filter id="soft-glow">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFF2CC" />
                                    <stop offset="60%" stopColor="#FFE066" />
                                    <stop offset="100%" stopColor="#F4C430" />
                                </linearGradient>
                                <filter id="butterflyShadow">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                                </filter>
                            </defs>

                            {/* Cinematic Background Light */}
                            <circle cx="200" cy="200" r="180" fill="url(#skinGradient)" opacity="0.1" />

                            {/* Realistic Hand */}
                            <motion.g
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                            >
                                {/* Wrist and Base of Hand */}
                                <path
                                    d="M0,380 L80,330 Q110,300 130,280 L140,295 Q100,340 20,400 Z"
                                    fill="url(#skinGradient)"
                                    stroke="#8B4513"
                                    strokeWidth="0.5"
                                    opacity="0.9"
                                />

                                <motion.g
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    {/* Detailed Palm Surface */}
                                    <path
                                        d="M130,280 Q160,240 200,235 Q230,230 250,250 L245,270 Q200,260 140,300 Z"
                                        fill="url(#skinGradient)"
                                    />

                                    {/* Index Finger (The Landing Spot) */}
                                    <g>
                                        <path
                                            d="M195,238 Q240,205 285,220 L275,238 Q235,225 195,245 Z"
                                            fill="url(#skinGradient)"
                                            stroke="#8B4513"
                                            strokeWidth="0.4"
                                        />
                                        {/* Fingernail and Knuckle Detail */}
                                        <path d="M265,222 Q280,222 282,228" fill="none" stroke="#D2B48C" strokeWidth="1" opacity="0.5" />
                                        <path d="M225,225 Q230,220 235,225" fill="none" stroke="#D2B48C" strokeWidth="0.5" opacity="0.3" />
                                    </g>

                                    {/* Middle Finger (Partial View) */}
                                    <path
                                        d="M210,245 Q250,235 270,260 L260,275 Q230,260 210,265 Z"
                                        fill="url(#skinGradient)"
                                        stroke="#8B4513"
                                        strokeWidth="0.3"
                                        opacity="0.8"
                                    />
                                </motion.g>
                            </motion.g>

                            {/* The Realistic Butterfly */}
                            <motion.g
                                initial={{ x: 380, y: -50, scale: 0.1, rotate: -30 }}
                                animate={{
                                    x: [380, 250, 200, 280],
                                    y: [-50, 100, 180, 218],
                                    scale: [0.1, 0.6, 0.8, 1],
                                    rotate: [-30, 15, -10, 0]
                                }}
                                transition={{
                                    duration: 6,
                                    times: [0, 0.4, 0.7, 1],
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                    repeatDelay: 3
                                }}
                                style={{ transformOrigin: "center", filter: "url(#butterflyShadow)" }}
                            >
                                {/* Butterfly Wing Layers for Flapping */}
                                <motion.g
                                    animate={{
                                        rotateY: [0, 75, 0],
                                        skewY: [0, 5, 0]
                                    }}
                                    transition={{ duration: 0.25, repeat: 24, repeatType: "mirror" }}
                                >
                                    {/* Wings with Details */}
                                    <g filter="url(#soft-glow)">
                                        <path d="M0,0 C10,-40 50,-50 40,-10 C35,10 10,5 0,0" fill="#F4C430" stroke="#2C2C2C" strokeWidth="1.5" />
                                        <path d="M10,-20 C25,-30 35,-25 30,-15" fill="none" stroke="#2C2C2C" strokeWidth="1" opacity="0.4" />
                                        <path d="M0,0 C15,5 35,35 15,40 C0,40 -5,10 0,0" fill="#FFD93D" stroke="#2C2C2C" strokeWidth="1.5" />
                                        <path d="M8,15 C18,25 22,30 15,35" fill="none" stroke="#2C2C2C" strokeWidth="1" opacity="0.4" />
                                    </g>
                                    <g transform="scale(-1, 1)" filter="url(#soft-glow)">
                                        <path d="M0,0 C10,-40 50,-50 40,-10 C35,10 10,5 0,0" fill="#F4C430" stroke="#2C2C2C" strokeWidth="1.5" />
                                        <path d="M10,-20 C25,-30 35,-25 30,-15" fill="none" stroke="#2C2C2C" strokeWidth="1" opacity="0.4" />
                                        <path d="M0,0 C15,5 35,35 15,40 C0,40 -5,10 0,0" fill="#FFD93D" stroke="#2C2C2C" strokeWidth="1.5" />
                                        <path d="M8,15 C18,25 22,30 15,35" fill="none" stroke="#2C2C2C" strokeWidth="1" opacity="0.4" />
                                    </g>
                                </motion.g>

                                <ellipse cx="0" cy="5" rx="3" ry="18" fill="#1a1a1a" />
                                <path d="M-2,-10 Q-6,-25 -12,-30 M2,-10 Q6,-25 12,-30" fill="none" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" />
                            </motion.g>
                        </svg>
                        <div className="animation-subtext bounce luxury">Moments Captured...</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
