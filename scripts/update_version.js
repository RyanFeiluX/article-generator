#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read the current version from VERSION file
const versionFile = path.join(__dirname, '..', 'VERSION');
const currentVersion = fs.readFileSync(versionFile, 'utf8').replace(/\s+/g, '').trim();

// Update frontend/public/version.js
const versionJsPath = path.join(__dirname, '..', 'frontend', 'public', 'version.js');
const versionJsContent = `window.APP_VERSION = '${currentVersion}';`;

fs.writeFileSync(versionJsPath, versionJsContent);

console.log(`Updated version.js to ${currentVersion}`);
