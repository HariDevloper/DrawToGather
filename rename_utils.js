const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client/public/profiles');
const files = fs.readdirSync(dir);

let count = 1;
files.forEach(file => {
    if (file.startsWith('Gemini_Generated_Image')) {
        const oldPath = path.join(dir, file);
        const newPath = path.join(dir, `avatar${count}.png`);
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${file} -> avatar${count}.png`);
        count++;
    }
});
console.log('Renaming complete.');
