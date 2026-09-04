#!/usr/bin/env bash
# Starts the live-preview dev server (port 5174) and a Cloudflare quick tunnel in front of it, then
# prints the public URL. Needs a `cloudflared` binary on PATH or at $CLOUDFLARED.
# Usage: tools/live.sh            (blocks; Ctrl-C stops both)
set -euo pipefail
cd "$(dirname "$0")/.."
CF="${CLOUDFLARED:-$(command -v cloudflared || echo /tmp/cloudflared)}"
LOG="${LIVE_LOG:-/tmp/live-tunnel.log}"

npx vite --config tools/vite.live.config.js >/tmp/live-vite.log 2>&1 &
VITE_PID=$!
trap 'kill $VITE_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -s -o /dev/null http://127.0.0.1:5174/ && break
  sleep 0.5
done

"$CF" tunnel --url http://127.0.0.1:5174 --no-autoupdate 2>&1 | tee "$LOG" | while IFS= read -r line; do
  if [[ "$line" =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
    echo "LIVE URL: ${BASH_REMATCH[1]}"
    echo "${BASH_REMATCH[1]}" >/tmp/live-url.txt
  fi
done
