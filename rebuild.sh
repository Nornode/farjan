#!/usr/bin/env bash
set -e

# Colours
BOLD="\033[1m"
RESET="\033[0m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
DIM="\033[2m"

step()  { echo -e "${CYAN}${BOLD}==>${RESET} $*"; }
ok()    { echo -e "    ${GREEN}✔${RESET}  $*"; }
skip()  { echo -e "    ${YELLOW}–${RESET}  $*"; }
fail()  { echo -e "    ${RED}✖${RESET}  $*"; }

NAME="farjan"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-$(pwd)/data}"
ANALYTICS_TOKEN="${ANALYTICS_TOKEN:-}"
LOG_ANALYTICS="${LOG_ANALYTICS:-true}"

# Hash all files that affect the image build
SOURCE_HASH=$(find Dockerfile client/ server/ -type f | sort | xargs sha256sum | sha256sum | awk '{print $1}')

# Hash stored in the existing image label (empty if image doesn't exist)
EXISTING_HASH=$(docker image inspect "$NAME" --format '{{ index .Config.Labels "build-hash" }}' 2>/dev/null || true)

NEW_IMAGE="${NAME}:new"

if [ "$SOURCE_HASH" = "$EXISTING_HASH" ]; then
  step "No source changes detected — skipping image rebuild."
else
  step "Source changes detected — building new image..."
  docker build --no-cache --label "build-hash=${SOURCE_HASH}" -t "$NEW_IMAGE" . \
    || { fail "Image build failed — existing container left untouched."; exit 1; }
  ok "Build succeeded."
fi

step "Stopping container '${NAME}' (if running)..."
docker stop "$NAME" 2>/dev/null && ok "Stopped." || skip "Not running."

step "Removing container '${NAME}' (if exists)..."
docker rm "$NAME" 2>/dev/null && ok "Removed." || skip "Not found."

if [ "$SOURCE_HASH" != "$EXISTING_HASH" ]; then
  step "Removing old image '${NAME}' (if exists)..."
  docker rmi "$NAME" 2>/dev/null && ok "Image removed." || skip "No image found."

  step "Tagging new image as '${NAME}'..."
  docker tag "$NEW_IMAGE" "$NAME"
  docker rmi "$NEW_IMAGE"
  ok "Tagged."
fi

step "Starting container '${NAME}'..."
mkdir -p "$DATA_DIR"

ANALYTICS_ARGS=()
if [ -n "$ANALYTICS_TOKEN" ]; then
  ANALYTICS_ARGS+=(-e "ANALYTICS_TOKEN=${ANALYTICS_TOKEN}")
fi

docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p "${PORT}:3000" \
  -v "${DATA_DIR}:/data" \
  -e TZ="${TZ:-Europe/Helsinki}" \
  -e LOG_ANALYTICS="${LOG_ANALYTICS}" \
  "${ANALYTICS_ARGS[@]}" \
  "$NAME"

echo ""
echo -e "    ${GREEN}${BOLD}Running at http://localhost:${PORT}${RESET}"
echo -e "    ${DIM}Tailing logs (Ctrl+C to stop tailing — container keeps running)...${RESET}"
echo ""
docker logs -f "$NAME"

