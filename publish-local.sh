#!/usr/bin/env bash
# Build all @elasticias/* libs and publish them to the local Verdaccio registry.
# Prerequisites: Verdaccio must be running (npx nx run @elasticias/framework-ui:local-registry)
set -euo pipefail

REGISTRY="http://localhost:4873"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist/libs"

# Build all libs (Nx handles dependency order)
echo "Building all libraries..."
npx nx run-many -t build --projects=types,utils,core,screens,ui

# Publish each lib to local registry
LIBS=(types utils core screens ui)
for lib in "${LIBS[@]}"; do
  echo "Publishing @elasticias/$lib..."
  cd "$DIST_DIR/$lib"
  npm publish --registry "$REGISTRY" --tag latest 2>/dev/null || \
    echo "  (already published at this version — skipping)"
  cd "$SCRIPT_DIR"
done

echo ""
echo "Done! All @elasticias/* packages published to $REGISTRY"
echo "In your consuming app, run: npm install"
