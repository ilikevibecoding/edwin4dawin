#!/usr/bin/env bash
# Screenshot with automatic retake when SwiftShader/HMR yields a black frame.
# Usage: scripts/shoot-retry.sh <out.png> <screenshot.mjs args...>
out="$1"; shift
for i in 1 2 3 4 5; do
  node scripts/screenshot.mjs --out "$out" "$@"
  mean=$(python3 - "$out" <<'EOF'
import sys
from PIL import Image, ImageStat
print(ImageStat.Stat(Image.open(sys.argv[1]).convert('L')).mean[0])
EOF
)
  ok=$(python3 -c "print(1 if float('$mean') > 4.0 else 0)")
  if [ "$ok" = "1" ]; then echo "OK (mean=$mean, try $i)"; exit 0; fi
  echo "black frame (mean=$mean), retry $i..."
done
echo "FAILED: still black after retries"; exit 1
