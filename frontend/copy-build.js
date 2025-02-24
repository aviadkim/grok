const fs = require("fs-extra");
const path = require("path");

const sourceDir = path.join(__dirname, "build");
const destDir = path.join(__dirname, "..", "backend", "public");

fs.copySync(sourceDir, destDir, { overwrite: true });
console.log("Build files copied to backend/public");
