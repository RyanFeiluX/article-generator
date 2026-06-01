# syntax=docker/dockerfile:1.4
# Use nikolaik/python-nodejs image which has both Python and Node.js pre-installed
FROM nikolaik/python-nodejs:python3.11-nodejs20 AS base

WORKDIR /app

# Install pnpm version compatible with Node.js 20
RUN npm install -g --force pnpm@9.12.2

FROM base AS backend-deps

COPY backend/requirements.txt /app/backend/

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -i https://pypi.tuna.tsinghua.edu.cn/simple --upgrade pip && \
    pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r /app/backend/requirements.txt

FROM base AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml* ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install

COPY frontend/src /app/frontend/src
COPY frontend/index.html /app/frontend/
COPY frontend/public /app/frontend/public
COPY frontend/tsconfig.json /app/frontend/
COPY frontend/tsconfig.node.json /app/frontend/
COPY frontend/vite.config.ts /app/frontend/
COPY frontend/postcss.config.js /app/frontend/
COPY frontend/tailwind.config.js /app/frontend/
COPY VERSION /app/VERSION

RUN VERSION=$(cat /app/VERSION | tr -d '\n\r') && echo "window.APP_VERSION = '${VERSION}';" > /app/frontend/public/version.js && \
    pnpm build

FROM base AS final

WORKDIR /app

COPY --from=backend-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin

COPY backend/ /app/backend/
COPY VERSION /app/VERSION

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 5000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "5000"]