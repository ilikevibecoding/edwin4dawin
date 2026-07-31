#!/usr/bin/env python3
"""Crop and upscale a region of a capture so small figures can be judged."""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
cx, cy, w, h, scale = (float(a) for a in sys.argv[3:8])
im = Image.open(src).convert('RGB')
W, H = im.size
left = int(cx * W - w / 2)
top = int(cy * H - h / 2)
box = (max(0, left), max(0, top), min(W, left + int(w)), min(H, top + int(h)))
crop = im.crop(box)
crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
crop.save(dst)
print(f'{src} {box} -> {dst} {crop.size}')
