#!/usr/bin/env bash
# Build all @elasticias/* libs and publish them to the local Verdaccio registry.
# Usage: ./publish-local.sh [lib1 lib2 ...]
#   No args  → builds and publishes ALL libs
#   With args → builds all (for deps) but publishes only specified libs
#   Example: ./publish-local.sh ui core
set -euo pipefail

REGISTRY="http://localhost:4874"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist/libs"
ALL_LIBS=(types utils core screens ui)

# Determine which libs to publish
if [ $# -gt 0 ]; then
  PUBLISH_LIBS=("$@")
else
  PUBLISH_LIBS=("${ALL_LIBS[@]}")
fi

# Ensure Verdaccio is running — start it in background if not
if ! curl -s "$REGISTRY" > /dev/null 2>&1; then
  echo "Verdaccio not running at $REGISTRY — starting..."
  npx verdaccio --listen 4874 --config "$SCRIPT_DIR/.verdaccio/config.yml" &
  VERDACCIO_PID=$!

  # Wait up to 10s for Verdaccio to be ready
  for i in $(seq 1 20); do
    if curl -s "$REGISTRY" > /dev/null 2>&1; then
      echo "Verdaccio started (PID $VERDACCIO_PID)"
      break
    fi
    sleep 0.5
  done

  if ! curl -s "$REGISTRY" > /dev/null 2>&1; then
    echo "Error: Verdaccio failed to start"
    kill "$VERDACCIO_PID" 2>/dev/null
    exit 1
  fi
fi

# Build all libs (Nx handles dependency order)
echo "Building all libraries..."
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Publish each lib to local registry with --force to skip version bump
for lib in "${PUBLISH_LIBS[@]}"; do
  if [ ! -d "$DIST_DIR/$lib" ]; then
    echo "Warning: dist/libs/$lib not found — skipping"
    continue
  fi
  echo "Publishing @elasticias/$lib..."
  cd "$DIST_DIR/$lib"
  VERSION=$(node -p "require('./package.json').version")
  npm unpublish --registry "$REGISTRY" "@elasticias/$lib@$VERSION" --force 2>/dev/null || true
  npm publish --registry "$REGISTRY" --tag latest
  cd "$SCRIPT_DIR"
done

echo ""
echo "Done! Published: ${PUBLISH_LIBS[*]}"
echo "In your consuming app, run: npm install"
