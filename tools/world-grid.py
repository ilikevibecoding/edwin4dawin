#!/usr/bin/env python3
"""Overlay a labelled fractional grid on a capture.

Judging a shot and *measuring* a shot need different pictures. Eyeballing a
region's coordinates off a rendered frame is guesswork, and a mis-aimed sample
window is worse than no measurement — it returns a confident number for the
wrong surface, which is how a patch of sky came to be diagnosed as a blown-out
rust highlight on the drip rail. This draws the coordinate system the sampler
uses directly onto a copy of the frame, so a region can be read off rather than
estimated.

Usage: world-grid.py IN OUT [DIVISIONS]
"""
import sys
from PIL import Image, ImageDraw

src, dst = sys.argv[1], sys.argv[2]
div = int(sys.argv[3]) if len(sys.argv) > 3 else 10

im = Image.open(src).convert('RGB')
W, H = im.size
d = ImageDraw.Draw(im)

for i in range(1, div):
    f = i / div
    x, y = int(f * W), int(f * H)
    d.line([(x, 0), (x, H)], fill=(255, 0, 255), width=1)
    d.line([(0, y), (W, y)], fill=(255, 0, 255), width=1)
    d.text((x + 2, 2), f'{f:.1f}', fill=(255, 255, 0))
    d.text((2, y + 2), f'{f:.1f}', fill=(0, 255, 255))

im.save(dst)
print(f'{dst} {W}x{H} grid={div}')
