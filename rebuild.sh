#!/usr/bin/env bash
set -e

NAME="farjan"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-$(pwd)/data}"

# Hash all files that affect the image build
SOURCE_HASH=$(find Dockerfile client/ server/ -type f | sort | xargs sha256sum | sha256sum | awk '{print $1}')

# Hash stored in the existing image label (empty if image doesn't exist)
EXISTING_HASH=$(docker image inspect "$NAME" --format '{{ index .Config.Labels "build-hash" }}' 2>/dev/null || true)

NEW_IMAGE="${NAME}:new"

if [ "$SOURCE_HASH" = "$EXISTING_HASH" ]; then
  echo "==> No source changes detected, skipping image rebuild."
else
  echo "==> Source changes detected, building new image in the background..."
  docker build --no-cache --label "build-hash=${SOURCE_HASH}" -t "$NEW_IMAGE" . \
    || { echo "ERROR: Image build failed — existing container left untouched."; exit 1; }
  echo "    Build succeeded."
fi

echo "==> Stopping container '$NAME' (if running)..."
docker stop "$NAME" 2>/dev/null && echo "    Stopped." || echo "    Not running."

echo "==> Removing container '$NAME' (if exists)..."
docker rm "$NAME" 2>/dev/null && echo "    Removed." || echo "    Not found."

if [ "$SOURCE_HASH" != "$EXISTING_HASH" ]; then
  echo "==> Removing old image '$NAME' (if exists)..."
  docker rmi "$NAME" 2>/dev/null && echo "    Image removed." || echo "    No image found."

  echo "==> Tagging new image as '$NAME'..."
  docker tag "$NEW_IMAGE" "$NAME"
  docker rmi "$NEW_IMAGE"
fi

echo "==> Starting container '$NAME'..."
mkdir -p "$DATA_DIR"
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p "${PORT}:3000" \
  -v "${DATA_DIR}:/data" \
  -e TZ="${TZ:-Europe/Helsinki}" \
  "$NAME"

echo ""
echo "    Running at http://localhost:${PORT}"
echo "    Tailing logs (Ctrl+C to stop tailing — container keeps running)..."
echo ""
docker logs -f "$NAME"

