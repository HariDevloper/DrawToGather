import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, X } from 'lucide-react';
import './DrawingExport.css';

const DrawingExport = ({ canvasRef, user, onClose }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportedImage, setExportedImage] = useState(null);

    const handleExport = () => {
        setIsExporting(true);

        // Create a temporary canvas for the styled export
        const exportCanvas = document.createElement('canvas');
        const ctx = exportCanvas.getContext('2d');

        // Set canvas size (larger for better quality)
        exportCanvas.width = 1000;
        exportCanvas.height = 1200; // Extra space for user info at bottom

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 1000, 1200);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1000, 1200);

        // Draw the actual canvas content
        const originalCanvas = canvasRef.current;
        if (originalCanvas) {
            // Keep drawing SQUARE to match canvas
            const drawingSize = 900;
            const x = 50;
            const y = 80;

            // White background for drawing
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 20;
            ctx.fillRect(x, y, drawingSize, drawingSize);
            ctx.shadowBlur = 0; // Reset shadow

            // Draw the actual canvas
            ctx.drawImage(originalCanvas, x, y, drawingSize, drawingSize);

            // Add border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 15;
            ctx.strokeRect(x, y, drawingSize, drawingSize);
        }

        // Add user info at bottom
        const bottomY = 1040;
        const middleX = 500; // Horizontal center

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, bottomY - 30, 1000, 190);

        // User avatar (circle)
        if (user.avatar) {
            const avatarImg = new Image();
            avatarImg.crossOrigin = 'anonymous';
            avatarImg.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(80, bottomY + 50, 45, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatarImg, 35, bottomY + 5, 90, 90);
                ctx.restore();

                // Border around avatar
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(80, bottomY + 50, 45, 0, Math.PI * 2);
                ctx.stroke();

                finishExport();
            };
            avatarImg.onerror = () => {
                finishExport();
            };
            avatarImg.src = `/profiles/${user.avatar}`;
        } else {
            finishExport();
        }

        function finishExport() {
            // Username
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.fillText(user.username || 'Artist', 145, bottomY + 45);

            // Timestamp
            ctx.font = '22px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const date = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            ctx.fillText(date, 145, bottomY + 80);

            // "DrawTogether" watermark
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.textAlign = 'right';
            ctx.fillText('DrawTogether', 950, bottomY + 65);

            // Convert to data URL
            const dataUrl = exportCanvas.toDataURL('image/png');
            setExportedImage(dataUrl);
            setIsExporting(false);
        }
    };

    const handleDownload = () => {
        if (!exportedImage) return;

        const link = document.createElement('a');
        link.download = `drawing-${user.username}-${Date.now()}.png`;
        link.href = exportedImage;
        link.click();
    };

    const handleShare = async () => {
        if (!exportedImage) return;

        try {
            // Convert data URL to blob
            const response = await fetch(exportedImage);
            const blob = await response.blob();
            const file = new File([blob], 'drawing.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Drawing',
                    text: `Check out my drawing from DrawTogether!`
                });
            } else {
                // Fallback: copy link to clipboard
                alert('Sharing not supported. Image will be downloaded instead.');
                handleDownload();
            }
        } catch (err) {
            console.error('Share failed:', err);
            handleDownload();
        }
    };

    // Auto-export on mount
    React.useEffect(() => {
        handleExport();
    }, []);

    return (
        <div className="export-overlay">
            <motion.div
                className="export-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="export-header">
                    <h2>Save Your Masterpiece</h2>
                    <button className="export-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="export-preview">
                    {isExporting ? (
                        <div className="export-loading">
                            <div className="spinner"></div>
                            <p>Creating your styled drawing...</p>
                        </div>
                    ) : exportedImage ? (
                        <img src={exportedImage} alt="Exported Drawing" />
                    ) : null}
                </div>

                <div className="export-actions">
                    <button
                        className="export-btn download-btn"
                        onClick={handleDownload}
                        disabled={!exportedImage}
                    >
                        <Download size={20} />
                        Download
                    </button>
                    <button
                        className="export-btn share-btn"
                        onClick={handleShare}
                        disabled={!exportedImage}
                    >
                        <Share2 size={20} />
                        Share
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default DrawingExport;
