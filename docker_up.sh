#!/bin/bash

# ============================================
# Article Generator - Docker Build & Launch
# Single container serves both Frontend & API
# ============================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Docker image settings
IMAGE_NAME="article-generator"

# Container settings
PORT=5000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "==========================================="
echo "   Article Generator - Docker Setup"
echo "   (Single Container - Frontend + API)"
echo "==========================================="
echo ""

# Step 0: Bump version (auto-increment last digit)
echo "[0/7] Bumping version..."
if [ -f "scripts/bump_version.sh" ]; then
    chmod +x scripts/bump_version.sh
    source scripts/bump_version.sh
fi
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "0.0.1")
echo "     - Building version: $CURRENT_VERSION"

# Step 1: Stop existing container
echo ""
echo "[1/7] Stopping existing container..."
echo "     - Checking for existing container: article-generator"
CONTAINER_FOUND=true
while [ "$CONTAINER_FOUND" = true ]; do
    CONTAINER_EXISTS=$(docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2>&1)
    if [ "$CONTAINER_EXISTS" == "article-generator" ]; then
        CONTAINER_STATUS=$(docker ps -a --filter "name=article-generator" --format "{{.Status}}" 2>&1)
        echo "     - Found container: article-generator ($CONTAINER_STATUS)"
        echo "     - Stopping container: article-generator"
        docker stop article-generator 2>&1 || true
        echo "     - Removing container: article-generator"
        docker rm -f article-generator 2>&1 || true
        # Give Docker time to release the container name
        sleep 3
    else
        CONTAINER_FOUND=false
        echo "     - No existing container found or container removed successfully"
    fi
done
# Give Docker time to release the container name
sleep 2

# Step 2: Build Docker image
echo ""
echo "[2/7] Building Docker image..."
docker build \
    -t "${IMAGE_NAME}:${CURRENT_VERSION}" \
    --build-arg VERSION="$CURRENT_VERSION" \
    --no-cache \
    .

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Docker build failed!${NC}"
    exit 1
fi

echo ""
echo "[3/7] Image built successfully: ${IMAGE_NAME}:${CURRENT_VERSION}"
echo ""

# Step 4: Clean up old images
echo "[4/7] Cleaning up old images..."
# Get current version without whitespace
CURRENT_VERSION_CLEAN=$(echo "$CURRENT_VERSION" | tr -d ' \t\n\r')
# Get all tags except the current version
OLD_TAGS=$(docker images ${IMAGE_NAME} --format "{{.Tag}}" 2>&1 | while IFS= read -r tag; do
    TAG_CLEAN=$(echo "$tag" | tr -d ' \t\n\r')
    if [ "$TAG_CLEAN" != "$CURRENT_VERSION_CLEAN" ]; then
        echo "$tag"
    fi
done)
if [ -n "$OLD_TAGS" ]; then
    while IFS= read -r tag; do
        echo "     - Removing old image: ${IMAGE_NAME}:${tag}"
        docker rmi ${IMAGE_NAME}:${tag} 2>&1 || true
    done <<< "$OLD_TAGS"
else
    echo "     - No old images to clean up"
fi

echo ""
echo "[4/7] Image cleanup completed!"
echo ""

# Step 5: Final container check and removal
echo "[5/7] Final container check and removal..."
echo "     - Checking for existing container: article-generator"
CONTAINER_FOUND=true
while [ "$CONTAINER_FOUND" = true ]; do
    CONTAINER_EXISTS=$(docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2>&1)
    if [ "$CONTAINER_EXISTS" == "article-generator" ]; then
        CONTAINER_STATUS=$(docker ps -a --filter "name=article-generator" --format "{{.Status}}" 2>&1)
        echo "     - Found container: article-generator ($CONTAINER_STATUS)"
        echo "     - Stopping container: article-generator"
        docker stop article-generator 2>&1 || true
        echo "     - Removing container: article-generator"
        docker rm -f article-generator 2>&1 || true
        # Give Docker time to release the container name
        sleep 3
    else
        CONTAINER_FOUND=false
        echo "     - No existing container found or container removed successfully"
    fi
done
# Give Docker time to release the container name
sleep 2

# Step 6: Launch container
echo "[6/7] Launching container..."
docker run -d \
    --name article-generator \
    -p ${PORT}:5000 \
    -e PYTHONUNBUFFERED=1 \
    "${IMAGE_NAME}:${CURRENT_VERSION}"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Failed to start container!${NC}"
    docker logs article-generator 2>/dev/null || true
    exit 1
fi

echo ""
echo "[7/7] Setup complete!"
echo ""
echo "============================================"
echo "   Article Generator v${CURRENT_VERSION}"
echo "============================================"
echo ""
echo "   Application:  http://localhost:${PORT}"
echo "   Version:      ${CURRENT_VERSION}"
echo ""
echo -e "   API Key:      ${BLUE}Configure via Settings${NC}"
echo ""
echo "   To view logs:  docker logs -f article-generator"
echo "   To stop:       docker stop article-generator && docker rm article-generator"
echo ""
echo "============================================"
