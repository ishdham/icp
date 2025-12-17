const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitInfo() {
    try {
        const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
        const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
        const commitDate = execSync('git log -1 --format=%cd').toString().trim();
        const buildDate = new Date().toISOString();

        return {
            commitHash,
            commitMessage,
            commitDate,
            buildDate
        };
    } catch (e) {
        console.warn('Failed to get git info, using defaults', e.message);
        return {
            commitHash: 'unknown',
            commitMessage: 'Development Build',
            commitDate: new Date().toISOString(),
            buildDate: new Date().toISOString()
        };
    }
}

const info = getGitInfo();
const content = JSON.stringify(info, null, 2);

// Write to Frontend
const frontendPath = path.join(__dirname, 'frontend/src/build-info.json');
fs.writeFileSync(frontendPath, content);
console.log(`Generated build info for Frontend at ${frontendPath}`);

// Write to Backend
const backendPath = path.join(__dirname, 'backend/src/build-info.json');
fs.writeFileSync(backendPath, content);
console.log(`Generated build info for Backend at ${backendPath}`);
