#!/usr/bin/env bash
# Render the demo as chapter segments so the whole arc is covered even when
# wall-clock time is limited. Each segment starts from a script label.
set -u
cd /workspace
render () {
  local name="$1" from="$2" secs="$3"
  echo "=== segment $name (from $from, ${secs}s) ==="
  node tools/render-demo.mjs --out "render/seg-$name" --from "$from" \
    --w 960 --h 540 --q balanced --fps 24 --stride 2 --encodeFps 12 --outFps 24 \
    --settle 1.5 --maxSeconds "$secs" --jq 94 --encode false
}
render ledge     ch3.hold  55
render interro   ch4.start 30
render garden    ch5.warn  35
render ending    epi.free  30
echo "ALL SEGMENTS DONE"
