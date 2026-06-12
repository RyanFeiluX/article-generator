# syntax=docker/dockerfile:1.4

# ---- Build base: Python + Node.js (for frontend build & pip install) ----
FROM nikolaik/python-nodejs:python3.11-nodejs20 AS base

WORKDIR /app

# Install pnpm version compatible with Node.js 20
RUN npm install -g --force pnpm@9.12.2

# ---- Backend dependencies (pip install) ----
FROM base AS backend-deps

COPY backend/requirements.txt /app/backend/

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r /app/backend/requirements.txt

# ---- Frontend build (pnpm build) ----
FROM base AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml* ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install

COPY frontend/src /app/frontend/src
COPY frontend/index.html /app/frontend/
RUN mkdir -p /app/frontend/public
COPY frontend/tsconfig.json /app/frontend/
COPY frontend/tsconfig.node.json /app/frontend/
COPY frontend/vite.config.ts /app/frontend/
COPY frontend/postcss.config.js /app/frontend/
COPY frontend/tailwind.config.js /app/frontend/
COPY VERSION /app/VERSION

RUN if [ -f /app/VERSION ]; then \
        VERSION=$(cat /app/VERSION | tr -d '\n\r'); \
    else \
        VERSION="0.1.0"; \
    fi && \
    echo "window.APP_VERSION = '${VERSION}';" > /app/frontend/public/version.js && \
    pnpm build

# ---- Runtime: slim Python-only image ----
FROM python:3.11-slim AS final

WORKDIR /app

# Copy installed Python packages from build stage
COPY --from=backend-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin

# Copy backend source
COPY backend/ /app/backend/
COPY VERSION /app/VERSION

# Copy built frontend assets only (no Node.js needed at runtime)
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 5000

CMD ["python", "backend/entrypoint.py"]
