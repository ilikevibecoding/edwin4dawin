#!/usr/bin/env bash
# Build, ensure preview is serving the fresh bundle, then capture named shots.
set -e
cd /workspace
npx vite build >/tmp/build.log 2>&1 || { echo "BUILD FAILED"; tail -25 /tmp/build.log; exit 1; }
grep -E "dist/assets|built in" /tmp/build.log | tail -2
TM="tmux -f /exec-daemon/tmux.portal.conf"
$TM has-session -t "=preview" 2>/dev/null || $TM new-session -d -s preview -c "$PWD" -- bash -lc "npx vite preview"
for i in $(seq 1 20); do curl -sf -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.5; done
for shot in "$@"; do
  node tools/shot.mjs --shot="$shot" --out="shots/$shot.png" --w="${CAP_W:-1600}" --h="${CAP_H:-900}" --timeout=600000 2>&1 | grep -Ev "^  page \[(warning|log)\]" | tail -6
done
