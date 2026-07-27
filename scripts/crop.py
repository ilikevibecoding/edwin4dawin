#!/usr/bin/env python3
"""Crop and magnify a region of a render, so the water can actually be looked at.

    python3 scripts/crop.py in.png out.png x y w h [scale]
"""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
x, y, w, h = (int(v) for v in sys.argv[3:7])
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 2
im = Image.open(src).convert('RGB').crop((x, y, x + w, y + h))
im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
im.save(dst)
print(f'{dst} {im.width}x{im.height}')
