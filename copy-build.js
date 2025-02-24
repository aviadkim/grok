const fs = require('fs');
const path = require('path');

// Get absolute paths
const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'frontend', 'build');
const targetDir = path.join(rootDir, 'backend', 'public');

console.log('Source directory:', sourceDir);
console.log('Target directory:', targetDir);

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
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source directory not found: ${sourceDir}`);
    }
    copyDir(sourceDir, targetDir);
    console.log('Build files copied successfully to backend/public');
} catch (error) {
    console.error('Error copying build files:', error);
    process.exit(1);
}
