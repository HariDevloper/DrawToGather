import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, X } from 'lucide-react';
import { PLAYLIST } from '../data/playlist';
import './MusicPlayer.css';

const MusicPlayer = ({ socket, roomId, externalShow, onToggle }) => {
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(new Audio(PLAYLIST[0].url));

    const currentSong = PLAYLIST[currentSongIndex];
    const [internalShow, setInternalShow] = useState(false);
    const showPanel = externalShow !== undefined ? externalShow : internalShow;
    const togglePanel = onToggle || (() => setInternalShow(!internalShow));

    useEffect(() => {
        const audio = audioRef.current;

        const handleEnded = () => {
            const nextIndex = (currentSongIndex + 1) % PLAYLIST.length;
            changeSong(nextIndex);
        };

        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [currentSongIndex]);

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

    return (
        <div className="music-container" style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
                className="notification-bell"
                onClick={(e) => {
                    e.stopPropagation();
                    togglePanel();
                }}
                title="Music Player"
            >
                <Music size={26} color="white" strokeWidth={2.5} className={isPlaying ? 'spinning-icon' : ''} />
            </button>

            {/* Panel - Same style as Notifications */}
            {showPanel && (
                <div className="notifications-panel">
                    <div className="notifications-header">
                        <h3>Music Player</h3>
                        <button className="close-notifications" onClick={togglePanel}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="notifications-list" style={{ padding: '20px' }}>
                        {/* Song Info */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '20px',
                            padding: '15px',
                            background: '#FFFBEA',
                            borderRadius: '15px',
                            border: '3px solid #FFD93D'
                        }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2C2C2C', marginBottom: '5px' }}>
                                {currentSong.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                {currentSong.artist}
                            </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
                            <button
                                className="popover-track-btn"
                                onClick={() => changeSong((currentSongIndex - 1 + PLAYLIST.length) % PLAYLIST.length)}
                                title="Previous Track"
                                style={{ color: '#2C2C2C' }}
                            >
                                <SkipBack size={20} strokeWidth={2.5} style={{ color: '#2C2C2C', stroke: '#2C2C2C' }} />
                            </button>

                            <button
                                className="popover-play-btn"
                                onClick={togglePlay}
                                title={isPlaying ? 'Pause' : 'Play'}
                                style={{ color: 'white' }}
                            >
                                {isPlaying ?
                                    <Pause size={26} strokeWidth={2.5} style={{ color: 'white', stroke: 'white' }} /> :
                                    <Play size={26} strokeWidth={2.5} style={{ color: 'white', stroke: 'white' }} />
                                }
                            </button>

                            <button
                                className="popover-track-btn"
                                onClick={() => changeSong((currentSongIndex + 1) % PLAYLIST.length)}
                                title="Next Track"
                                style={{ color: '#2C2C2C' }}
                            >
                                <SkipForward size={20} strokeWidth={2.5} style={{ color: '#2C2C2C', stroke: '#2C2C2C' }} />
                            </button>
                        </div>

                        {/* Playlist */}
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2C2C2C', marginBottom: '10px' }}>
                                Playlist
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {PLAYLIST.map((song, index) => (
                                    <div
                                        key={index}
                                        onClick={() => changeSong(index)}
                                        style={{
                                            padding: '10px',
                                            marginBottom: '5px',
                                            background: currentSongIndex === index ? '#FFD93D' : '#FFFBEA',
                                            border: `2px solid ${currentSongIndex === index ? '#F4C430' : '#FFD93D'}`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (currentSongIndex !== index) {
                                                e.currentTarget.style.background = '#FFF4A3';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (currentSongIndex !== index) {
                                                e.currentTarget.style.background = '#FFFBEA';
                                            }
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2C2C2C' }}>
                                            {song.title}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                            {song.artist}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MusicPlayer;
