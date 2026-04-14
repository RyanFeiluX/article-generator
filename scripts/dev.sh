#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT="${DEPLOY_RUN_PORT:-5000}"
cd "${COZE_WORKSPACE_PATH}"

echo "Checking port ${PORT}..."
pids=$(ss -H -lntp 2>/dev/null | awk -v port="${PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
if [[ -n "${pids}" ]]; then
    echo "Port ${PORT} in use by PIDs: ${pids} (killing)"
    echo "${pids}" | xargs -I {} kill -9 {} 2>/dev/null || true
    sleep 1
fi

echo "Building frontend..."
cd frontend
pnpm build
cd ..

echo "Starting FastAPI server on port ${PORT}..."
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}
