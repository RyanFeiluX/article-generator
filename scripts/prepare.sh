#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt --quiet
cd ..

echo "Installing Node.js dependencies..."
cd frontend
pnpm install --prefer-offline
cd ..

echo "Prepare completed!"
