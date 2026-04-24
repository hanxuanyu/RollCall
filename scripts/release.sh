#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Usage: $0 <tag>"
  echo "Example: $0 v0.0.1"
  exit 1
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: tag must match vX.Y.Z format (e.g. v0.0.1)"
  exit 1
fi

MAIN_BRANCH="main"

echo "Switching to ${MAIN_BRANCH}..."
git checkout "$MAIN_BRANCH"

echo "Pulling latest changes..."
git pull origin "$MAIN_BRANCH"

echo "Creating and force-pushing tag ${TAG}..."
git tag -f "$TAG"
git push origin "$TAG" --force

echo "Done. Tag ${TAG} pushed to origin."
