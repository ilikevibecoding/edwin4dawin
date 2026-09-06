#!/usr/bin/env bash
# Runs tools/progress-snapshot.sh once an hour (integration of every pushed builder branch, published to
# gh-pages) until stopped. Tags are h01, h02, ... continuing from whatever progress/shots/ already holds.
#   tmux new -d -s progress-hourly 'tools/progress-hourly.sh'
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL=${INTERVAL:-3600}
while :; do
  n=$(ls -d "$ROOT"/progress/shots/h[0-9][0-9] 2>/dev/null | wc -l)
  tag=$(printf 'h%02d' "$n")
  echo "[$(date -u +%H:%M)] snapshot $tag starting" 
  start=$(date +%s)
  bash "$ROOT/tools/progress-snapshot.sh" "$tag" --source integration --publish 2>&1 | tail -30
  echo "[$(date -u +%H:%M)] snapshot $tag done in $(( $(date +%s) - start )) s"
  # keep the cadence at one per INTERVAL measured from the start of the run
  sleep $(( INTERVAL - ($(date +%s) - start) > 60 ? INTERVAL - ($(date +%s) - start) : 60 ))
done
