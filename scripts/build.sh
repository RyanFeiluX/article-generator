#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "Updating version..."
node scripts/update_version.js

echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt --quiet
cd ..

echo "Installing Node.js dependencies..."
cd frontend
pnpm install --prefer-offline
pnpm build
cd ..

echo "Build completed successfully!"
