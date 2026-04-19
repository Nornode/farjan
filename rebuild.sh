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
LOG_ANALYTICS="${LOG_ANALYTICS:-true}"

ENV_FILE="$(pwd)/.env"

# Load persisted variables from .env (does not override env vars already exported)
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  set -a; source "$ENV_FILE"; set +a
fi

ANALYTICS_TOKEN="${ANALYTICS_TOKEN:-}"

# Prompt for ANALYTICS_TOKEN if it is not set (blank answer = analytics disabled)
if [ -z "$ANALYTICS_TOKEN" ]; then
  echo -e "${YELLOW}ANALYTICS_TOKEN is not set.${RESET}"
  read -r -s -p "    Enter analytics token (leave blank to disable analytics): " _input_token
  echo ""
  if [ -n "$_input_token" ]; then
    ANALYTICS_TOKEN="$_input_token"
    # Persist to .env for future runs, creating the file if needed
    if grep -q "^ANALYTICS_TOKEN=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^ANALYTICS_TOKEN=.*|ANALYTICS_TOKEN='${ANALYTICS_TOKEN}'|" "$ENV_FILE"
    else
      echo "ANALYTICS_TOKEN='${ANALYTICS_TOKEN}'" >> "$ENV_FILE"
    fi
    ok "Token saved to .env — future runs will use it automatically."
  else
    skip "Analytics dashboard will be disabled."
  fi
fi

# Regenerate sitemap from current ferries registry
step "Regenerating sitemap.xml from ferry registry..."
cd "$(dirname "$0")"

# Check if data/ferries.json exists
if [ -f "data/ferries.json" ]; then
  # Create a temporary container just to run the sitemap generator
  docker run --rm \
    -v "$(pwd)/data:/data" \
    -v "$(pwd)/scripts:/scripts" \
    -v "$(pwd)/client/public:/client/public" \
    node:20-alpine \
    sh -c "cd /scripts && node generate-sitemap.js" || { fail "Sitemap generation failed"; exit 1; }
  ok "Sitemap regenerated."
else
  skip "data/ferries.json not found - sitemap will be generated during Docker build"
fi
echo ""

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

