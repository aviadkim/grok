const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'frontend', 'build');
const targetDir = path.join(__dirname, 'backend', 'public');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Copy function
function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    entries.forEach(entry => {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

try {
    copyDir(sourceDir, targetDir);
    console.log('Build files copied successfully to backend/public');
} catch (error) {
    console.error('Error copying build files:', error);
    process.exit(1);
}
