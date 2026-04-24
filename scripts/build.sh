#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Determine version info
COMMIT_ID=$(git rev-parse --short HEAD)
LATEST_TAG=$(git describe --tags --abbrev=0 --match "v*" 2>/dev/null || echo "")
TAG_COMMIT=""
if [ -n "$LATEST_TAG" ]; then
  TAG_COMMIT=$(git rev-parse --short "$LATEST_TAG")
fi

if [ -n "$LATEST_TAG" ] && [ "$TAG_COMMIT" = "$COMMIT_ID" ]; then
  VERSION="$LATEST_TAG"
else
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  VERSION="$BRANCH"
fi

LDFLAGS="-X RollCall/internal/version.Version=${VERSION} -X RollCall/internal/version.CommitID=${COMMIT_ID}"

echo "Version: ${VERSION}"
echo "Commit:  ${COMMIT_ID}"

TARGET="${1:-all}"
GOOS="${GOOS:-$(go env GOOS)}"
GOARCH="${GOARCH:-$(go env GOARCH)}"

build_frontend() {
  echo "Building frontend..."
  cd frontend && npm ci && npm run build && cd ..
}

build_desktop() {
  echo "Building desktop app for ${GOOS}/${GOARCH}..."
  if [ "$GOOS" = "darwin" ]; then
    wails build -ldflags "$LDFLAGS"
  elif [ "$GOOS" = "windows" ]; then
    wails build -ldflags "$LDFLAGS"
  else
    wails build -ldflags "$LDFLAGS"
  fi
}

build_server() {
  echo "Building server for ${GOOS}/${GOARCH}..."
  build_frontend
  EXT=""
  if [ "$GOOS" = "windows" ]; then
    EXT=".exe"
  fi
  CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
    -tags server \
    -ldflags "$LDFLAGS" \
    -o "build/bin/rollcall-server${EXT}" .
}

case "$TARGET" in
  desktop)  build_desktop ;;
  server)   build_server ;;
  frontend) build_frontend ;;
  all)      build_desktop; build_server ;;
  *)        echo "Usage: $0 {desktop|server|frontend|all}"; exit 1 ;;
esac

echo "Build complete."
