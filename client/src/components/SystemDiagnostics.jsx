import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Database, Server, Wifi, RefreshCw, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL as BASE_API_URL } from '../config';
const API_URL = BASE_API_URL.replace('/api', '');

const SystemDiagnostics = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState({
        backend: 'checking', // checking, online, offline
        database: 'checking',
        auth: 'checking',
        latency: null,
        lastChecked: null
    });

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const runDiagnostics = async () => {
        setStatus(prev => ({ ...prev, backend: 'checking', database: 'checking', auth: 'checking' }));
        const start = Date.now();

        try {
            // Check Backend & DB
            const res = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
            const latency = Date.now() - start;

            setStatus(prev => ({
                ...prev,
                backend: 'online',
                database: res.data.database === 'Connected' ? 'online' : 'error',
                latency: latency,
                auth: GOOGLE_CLIENT_ID ? 'online' : 'error',
                lastChecked: new Date()
            }));

        } catch (err) {
            console.error('Diagnostics failed:', err);
            setStatus(prev => ({
                ...prev,
                backend: 'offline',
                database: 'offline',
                auth: GOOGLE_CLIENT_ID ? 'online' : 'error',
                latency: null,
                lastChecked: new Date()
            }));
        }
    };

    useEffect(() => {
        if (isOpen) runDiagnostics();
    }, [isOpen]);

    return (
        <>
            {/* Floating Trigger Button */}
            <motion.button
                className="diagnostics-trigger"
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    padding: '10px',
                    borderRadius: '50%',
                    color: '#fff',
                    zIndex: 9999,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                <Activity size={20} color={status.backend === 'offline' ? '#ff4d4d' : '#00ff88'} />
            </motion.button>

            {/* Diagnostics Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#1e1e1e',
                                padding: '24px',
                                borderRadius: '16px',
                                width: '400px',
                                border: '1px solid #333',
                                color: '#fff',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={20} color="#00ff88" /> System Status
                                </h2>
                                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* API URL Info */}
                            <div style={{ marginBottom: '20px', fontSize: '0.8rem', color: '#666', background: '#111', padding: '8px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                API: {API_URL}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* 1. Backend Status */}
                                <StatusItem
                                    icon={<Server size={18} />}
                                    label="Backend API"
                                    status={status.backend}
                                    subtext={status.latency ? `${status.latency}ms latency` : 'Connecting...'}
                                />

                                {/* 2. Database Status */}
                                <StatusItem
                                    icon={<Database size={18} />}
                                    label="MongoDB Database"
                                    status={status.database}
                                    subtext={status.database === 'online' ? 'Connected to Cluster' : 'Connection Failed'}
                                />

                                {/* 3. Auth Config */}
                                <StatusItem
                                    icon={<ShieldCheck size={18} />}
                                    label="Google Auth Config"
                                    status={status.auth}
                                    subtext={status.auth === 'online' ? 'Client ID Loaded' : 'Missing VITE_GOOGLE_CLIENT_ID'}
                                />

                            </div>

                            <button
                                onClick={runDiagnostics}
                                style={{
                                    marginTop: '24px',
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--blue-gradient, linear-gradient(135deg, #4facfe, #00f2fe))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <RefreshCw size={16} /> Run Diagnostics
                            </button>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

const StatusItem = ({ icon, label, status, subtext }) => {
    const getColor = (s) => {
        if (s === 'checking') return '#fbbf24'; // Yellow
        if (s === 'online') return '#34d399';   // Green
        return '#ef4444';                       // Red
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: '8px',
            borderLeft: `4px solid ${getColor(status)}`
        }}>
            <div style={{ color: getColor(status) }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{subtext}</div>
            </div>
            {status === 'checking' && <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
            {status === 'online' && <div style={{ width: 8, height: 8, background: '#34d399', borderRadius: '50%', boxShadow: '0 0 8px #34d399' }}></div>}
            {status === 'error' && <AlertTriangle size={16} color="#ef4444" />}
        </div>
    );
};

// Add css for spin
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);

export default SystemDiagnostics;
