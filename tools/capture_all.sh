#!/usr/bin/env bash
# Captures every chapter of the auto-demo in sequence and concatenates the
# result into a single video. Sequential on purpose: this box has four cores and
# a software rasteriser, so parallel captures just slow each other down.
set -u
cd "$(dirname "$0")/.."

W=${W:-854}
H=${H:-480}
FPS=${FPS:-15}
Q=${Q:-low}
BASE=${BASE:-http://localhost:4173}
OUT=${OUT:-recordings}

mkdir -p "$OUT"
LIST="$OUT/concat.txt"
: > "$LIST"

for CH in ch1 ch2 ch3 ch4 ch5; do
  echo "=== capturing $CH ==="
  node tools/record.mjs \
    --base="$BASE" --chapter="$CH" --only=true \
    --fps="$FPS" --w="$W" --h="$H" --q="$Q" \
    --seconds=220 --out="$OUT/$CH" 2>&1 | tail -40
  if [ -f "$OUT/$CH/video.mp4" ]; then
    echo "file '$CH/video.mp4'" >> "$LIST"
  else
    echo "!! $CH produced no video"
  fi
done

echo "=== concatenating ==="
ffmpeg -y -f concat -safe 0 -i "$LIST" -c copy "$OUT/deviant_demo.mp4" 2>&1 | tail -5
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT/deviant_demo.mp4"
echo "=== done ==="
