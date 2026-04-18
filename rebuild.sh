#!/usr/bin/env bash
set -e

NAME="farjan"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-$(pwd)/data}"

echo "==> Stopping container '$NAME' (if running)..."
docker stop "$NAME" 2>/dev/null && echo "    Stopped." || echo "    Not running."

echo "==> Removing container '$NAME' (if exists)..."
docker rm "$NAME" 2>/dev/null && echo "    Removed." || echo "    Not found."

echo "==> Removing image '$NAME' (if exists)..."
docker rmi "$NAME" 2>/dev/null && echo "    Image removed." || echo "    No image found."

echo "==> Building image '$NAME'..."
docker build --no-cache -t "$NAME" .

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

