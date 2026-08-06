#!/usr/bin/env bash
# Keeps the offline capture going across browser crashes.
#
# A ten-minute recording is more than thirteen thousand frames and several hours
# of software rasterising; Chrome does not always survive that. The renderer
# resumes from the frames already on disk, so this just restarts it until the
# capture reports DONE.
set -u
cd "$(dirname "$0")/.."
for attempt in $(seq 1 40); do
  echo "=== attempt $attempt at $(date -u +%H:%M:%S) ===" >> .render/progress.log
  node tools/render-video.mjs "$@" >> .render/render.log 2>&1 && break
  echo "=== renderer exited $? ; retrying ===" >> .render/progress.log
  sleep 10
done
echo DONE >> .render/render.log
