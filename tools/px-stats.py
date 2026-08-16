#!/usr/bin/env python3
# Quick region luminance stats for iteration comparisons (lighting agent).
# Usage: python3 tools/px-stats.py imgA.png imgB.png
# Prints mean luminance for named fractional regions of each image.
import sys
from PIL import Image

REGIONS = {
    'crown_top':     (0.25, 0.00, 0.75, 0.16),  # tunnel vault near camera
    'crown_mid':     (0.35, 0.16, 0.65, 0.34),  # vault mid-depth
    'upper_left':    (0.00, 0.05, 0.22, 0.35),
    'upper_right':   (0.78, 0.05, 1.00, 0.35),
    'mid_band':      (0.30, 0.38, 0.70, 0.58),  # eye-level far wall
    'deck':          (0.30, 0.70, 0.70, 0.95),  # walkway
    'whole':         (0.00, 0.00, 1.00, 1.00),
}

def stats(path):
    im = Image.open(path).convert('L')
    w, h = im.size
    px = im.load()
    out = {}
    for name, (x0, y0, x1, y1) in REGIONS.items():
        xa, ya, xb, yb = int(x0*w), int(y0*h), int(x1*w), int(y1*h)
        total = 0
        n = 0
        hot = 0
        for y in range(ya, yb, 2):
            for x in range(xa, xb, 2):
                v = px[x, y]
                total += v
                n += 1
                if v > 215:
                    hot += 1
        out[name] = (total / max(1, n), 100.0 * hot / max(1, n))
    return out

paths = sys.argv[1:]
allstats = [(p, stats(p)) for p in paths]
names = list(REGIONS.keys())
hdr = 'region'.ljust(12) + ''.join(p.split('/')[-3][:14].rjust(16) if len(p.split('/')) > 2 else p[-16:].rjust(16) for p, _ in allstats)
print(hdr)
for name in names:
    row = name.ljust(12)
    for _, s in allstats:
        mean, hotpct = s[name]
        row += f'{mean:7.1f} ({hotpct:4.1f}%)'.rjust(16)
    print(row)
