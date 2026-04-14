#!/bin/bash
# ============================================
# Version Bump Script
# Auto-increments last digit: 0.0.1 -> 0.0.2
# Usage: ./scripts/bump_version.sh
# ============================================

VERSION_FILE="VERSION"

if [ ! -f "$VERSION_FILE" ]; then
    echo "0.0.1" > "$VERSION_FILE"
    echo "Created new version file: 0.0.1"
    # Update version.js
    node scripts/update_version.js
    exit 0
fi

# Read current version and trim whitespace
CURRENT=$(cat "$VERSION_FILE" | tr -d ' \t\n\r')

# Parse version parts
IFS='.' read -r major minor patch <<< "$CURRENT"

# Increment patch version
patch=$((patch + 1))

# Create new version
NEW_VERSION="${major}.${minor}.${patch}"

# Write new version
echo "$NEW_VERSION" > "$VERSION_FILE"

# Update version.js
node scripts/update_version.js

echo "Version bumped: $CURRENT -> $NEW_VERSION"

