#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT="${DEPLOY_RUN_PORT:-5000}"
cd "${COZE_WORKSPACE_PATH}"

echo "Starting FastAPI production server on port ${PORT}..."
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 2
