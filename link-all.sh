#!/bin/bash
# Build, copy, and clear cache for @elasticias/* shared libs.
# Usage:
#   ./link-all.sh              # build + copy ALL libs
#   ./link-all.sh ui           # build + copy only ui
#   ./link-all.sh ui core      # build + copy ui and core
#   ./link-all.sh --unlink     # restore from registry

WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRAMEWORK_UI="$WORKSPACE_ROOT/shared/elasticias-framework-ui"
CLIENT_APP="$WORKSPACE_ROOT/apps/elasticerp/src/Web/ClientApp"
DIST_DIR="$FRAMEWORK_UI/dist/libs"
TARGET_DIR="$CLIENT_APP/node_modules/@elasticias"
ALL_LIBS=(types utils core screens ui)

set -e

if [ "$1" = "--unlink" ]; then
  echo "Restoring @elasticias/* packages from registry..."
  for lib in "${ALL_LIBS[@]}"; do
    rm -rf "$TARGET_DIR/$lib"
  done
  cd "$CLIENT_APP"
  npm install
  echo "Done. Packages restored from registry."
  exit 0
fi

# Determine which libs to process
if [ $# -gt 0 ]; then
  LIBS=("$@")
else
  LIBS=("${ALL_LIBS[@]}")
fi

cd "$FRAMEWORK_UI"

echo "Building: ${LIBS[*]}..."
npx nx run-many -t build --projects="$(IFS=,; echo "${LIBS[*]}")" --skip-nx-cache

mkdir -p "$TARGET_DIR"
for lib in "${LIBS[@]}"; do
  rm -rf "$TARGET_DIR/$lib"
  cp -r "$DIST_DIR/$lib" "$TARGET_DIR/$lib"
  echo "  @elasticias/$lib updated"
done

rm -rf "$CLIENT_APP/.angular/cache"
echo "Done!"
