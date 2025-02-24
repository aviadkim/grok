const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function troubleshoot() {
  console.log("Troubleshooting Render build failure...");
  console.log("Current directory:", process.cwd());

  // Define paths
  const frontendPath = path.join(process.cwd(), 'frontend');
  const copyBuildPath = path.join(frontendPath, 'copy-build.js');
  const rootCopyBuildPath = path.join(process.cwd(), 'copy-build.js');

  // Step 1: Check if copy-build.js exists in frontend/
  try {
    await fs.access(copyBuildPath);
    console.log("✅ Found copy-build.js in frontend/");
  } catch (error) {
    console.log("❌ copy-build.js not found in frontend/");
    // Check root directory as a fallback
    try {
      await fs.access(rootCopyBuildPath);
      console.log("✅ Found copy-build.js in root directory instead");
    } catch {
      console.log("❌ copy-build.js not found in root either");
    }
  }

  // Step 2: Simulate the build command context
  const buildCommand = "cd backend && npm install && cd ../frontend && npm install && npm run build";
  console.log("\nSimulating build command context:", buildCommand);

  try {
    await execPromise("cd frontend");
    console.log("Switched to frontend/ directory:", process.cwd());

    // Test running copy-build.js from frontend/
    try {
      await execPromise("node copy-build.js");
      console.log("✅ node copy-build.js works from frontend/");
    } catch (error) {
      console.log("❌ node copy-build.js failed:", error.message);
      // Test with frontend/copy-build.js
      try {
        await execPromise("node frontend/copy-build.js");
        console.log("⚠️ node frontend/copy-build.js works, but this is likely wrong");
      } catch {
        console.log("❌ node frontend/copy-build.js also failed");
      }
    }
  } catch (error) {
    console.log("Error switching to frontend/:", error.message);
  }

  // Step 3: Provide fix instructions
  console.log("\n=== Fix Instructions ===");
  console.log("Based on the checks above:");
  
  if (await fs.access(copyBuildPath).then(() => true).catch(() => false)) {
    console.log("1. Your copy-build.js is in frontend/. Update your Render build command to:");
    console.log("   cd backend && npm install && cd ../frontend && npm install && npm run build && node copy-build.js");
  } else if (await fs.access(rootCopyBuildPath).then(() => true).catch(() => false)) {
    console.log("1. Your copy-build.js is in the root. Update your Render build command to:");
    console.log("   cd backend && npm install && cd ../frontend && npm install && npm run build && node ../copy-build.js");
  } else {
    console.log("1. copy-build.js is missing! You need to create it or ensure it’s committed.");
    console.log("   - If it’s a local file, add it with:");
    console.log("     git add frontend/copy-build.js");
    console.log("     git commit -m 'Add missing copy-build.js'");
    console.log("     git push");
    console.log("   - Then use this build command:");
    console.log("     cd backend && npm install && cd ../frontend && npm install && npm run build && node copy-build.js");
  }

  console.log("\n2. Go to your Render Dashboard, update the build command in the service settings, and redeploy.");
  console.log("3. If it still fails, check the Render logs or share the output of this script.");
}

troubleshoot().catch(err => console.error("Troubleshooting failed:", err));