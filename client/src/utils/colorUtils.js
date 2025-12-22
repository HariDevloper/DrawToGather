// Helper function to generate color shades
export const generateColorShades = (baseColor) => {
    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Convert RGB to hex
    const rgbToHex = (r, g, b) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const rgb = hexToRgb(baseColor);
    if (!rgb) return [baseColor];

    const shades = [];

    // Generate 7 shades from base color to white
    for (let i = 0; i <= 6; i++) {
        const factor = i / 6; // 0 to 1
        const r = Math.round(rgb.r + (255 - rgb.r) * factor);
        const g = Math.round(rgb.g + (255 - rgb.g) * factor);
        const b = Math.round(rgb.b + (255 - rgb.b) * factor);
        shades.push(rgbToHex(r, g, b));
    }

    return shades;
};

// Default color palette with base colors
export const DEFAULT_COLOR_PALETTE = [
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
