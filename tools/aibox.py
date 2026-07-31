#!/usr/bin/env python3
"""Crop an exact pixel box out of a capture and upscale it (nearest, so the
original pixels stay legible rather than being smoothed into suggestion)."""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, scale = (int(a) for a in sys.argv[3:8])
im = Image.open(src).convert('RGB')
W, H = im.size
box = (max(0, x0), max(0, y0), min(W, x1), min(H, y1))
crop = im.crop(box)
crop = crop.resize((crop.width * scale, crop.height * scale), Image.NEAREST)
crop.save(dst)
print(f'{src} {box} -> {dst} {crop.size}')
