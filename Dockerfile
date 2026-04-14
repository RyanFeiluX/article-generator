FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Copy requirements
COPY backend/requirements.txt .

# Install minimal Python dependencies (no heavy SDK!)
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --upgrade pip && \
    pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# Copy project files
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY VERSION /app/VERSION

# Build frontend
WORKDIR /app/frontend

# Inject version into frontend
RUN VERSION=$(cat /app/VERSION | tr -d '\n\r') && echo "window.APP_VERSION = '${VERSION}';" > public/version.js

RUN pnpm install && pnpm build

# Return to app directory
WORKDIR /app

EXPOSE 5000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "5000"]
