#!/usr/bin/env bash
# Per-agent build + capture, isolated so parallel agents don't collide.
#
#   AGENT=weapons PORT=4191 ./tools/agentcap.sh gameplay ads
#
# Builds into dist-$AGENT, serves it on $PORT, and writes shots/$AGENT-<shot>.png.
set -euo pipefail
cd /workspace

AGENT="${AGENT:?set AGENT to a unique name}"
PORT="${PORT:?set PORT to your assigned port}"
OUT="dist-$AGENT"
W="${CAP_W:-1600}"
H="${CAP_H:-900}"
TM="tmux -f /exec-daemon/tmux.portal.conf"

echo "== building ($OUT) =="
npx vite build --outDir "$OUT" --emptyOutDir >"/tmp/build-$AGENT.log" 2>&1 || {
  echo "BUILD FAILED"; tail -30 "/tmp/build-$AGENT.log"; exit 1; }
grep -E "built in" "/tmp/build-$AGENT.log" | tail -1

SESSION="preview-$AGENT"
if ! $TM has-session -t "=$SESSION" 2>/dev/null; then
  $TM new-session -d -s "$SESSION" -c "$PWD" -- \
    bash -lc "npx vite preview --outDir '$OUT' --port $PORT --strictPort"
fi
for i in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.5
done

for shot in "$@"; do
  echo "== capturing $shot =="
  node tools/shot.mjs \
    --url="http://127.0.0.1:$PORT/" \
    --shot="$shot" \
    --out="shots/$AGENT-$shot.png" \
    --w="$W" --h="$H" --timeout=900000 2>&1 \
    | grep -Ev '^  page \[(warning|log)\]' | tail -8
done
