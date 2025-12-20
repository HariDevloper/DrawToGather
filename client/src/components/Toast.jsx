import React, { useState, useEffect } from 'react';
import { X, UserPlus, Send, LogIn, LogOut, Check } from 'lucide-react';
import './Toast.css';

const Toast = ({ toasts, onRemove }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <div className="toast-icon">
                        {toast.type === 'friend_request' && <UserPlus size={20} />}
                        {toast.type === 'invite' && <Send size={20} />}
                        {toast.type === 'join' && <LogIn size={20} />}
                        {toast.type === 'leave' && <LogOut size={20} />}
                        {toast.type === 'success' && <Check size={20} />}
                    </div>
                    <div className="toast-content">
                        <p className="toast-message">{toast.message}</p>
                    </div>
                    <button className="toast-close" onClick={() => onRemove(toast.id)}>
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;
