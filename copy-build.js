const fs = require('fs');
const path = require('path');

// Get absolute paths from root directory
const rootDir = path.resolve(__dirname);
const sourceDir = path.join(rootDir, 'frontend', 'build');
const targetDir = path.join(rootDir, 'backend', 'public');

console.log('Root directory:', rootDir);
console.log('Source directory:', sourceDir);
console.log('Target directory:', targetDir);
console.log('Checking if directories exist...');

// Check frontend directory
if (!fs.existsSync(path.join(rootDir, 'frontend'))) {
    console.error('Frontend directory not found at:', path.join(rootDir, 'frontend'));
    process.exit(1);
}

// Check build directory
if (!fs.existsSync(sourceDir)) {
    console.error('Build directory not found at:', sourceDir);
    process.exit(1);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    console.log('Creating target directory...');
    fs.mkdirSync(targetDir, { recursive: true });
}

// Copy function
function copyDir(src, dest) {
    console.log(`Copying from ${src} to ${dest}`);
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
            console.log(`Copied ${entry.name}`);
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
