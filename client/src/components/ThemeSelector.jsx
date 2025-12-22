import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check } from 'lucide-react';
import { THEMES } from '../data/themes';
import './ThemeSelector.css';

const ThemeSelector = ({ socket, roomId, currentTheme, isHost }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleThemeChange = (theme) => {
        if (!isHost) {
            alert('Only the host can change the theme');
            return;
        }

        socket.emit('change-theme', {
            roomId,
            theme
        });

        setIsExpanded(false);
    };

    return (
        <div className="theme-selector-container">
            <motion.button
                className="theme-toggle-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!isHost}
                title={isHost ? 'Change Theme' : 'Only host can change theme'}
            >
                <Palette size={20} />
                <span>Theme</span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="theme-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="theme-panel-header">
                            <h3>Select Theme</h3>
                            <button className="theme-close" onClick={() => setIsExpanded(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="themes-grid">
                            {THEMES.map((theme) => (
                                <motion.div
                                    key={theme.id}
                                    className={`theme-option ${currentTheme?.id === theme.id ? 'active' : ''}`}
                                    onClick={() => handleThemeChange(theme)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div
                                        className="theme-preview"
                                        style={{ background: theme.background }}
                                    >
                                        <span className="theme-emoji">{theme.preview}</span>
                                    </div>
                                    <div className="theme-name">{theme.name}</div>
                                    {currentTheme?.id === theme.id && (
                                        <div className="theme-check">
                                            <Check size={16} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeSelector;
