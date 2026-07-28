#!/usr/bin/env python3
"""Crop and upscale a region of a screenshot so small figures can be judged."""
import sys
from PIL import Image

src, dst, x, y, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 4
img = Image.open(src).convert('RGB')
box = img.crop((x, y, x + w, y + h))
box = box.resize((w * scale, h * scale), Image.LANCZOS)
box.save(dst)
print(f'{dst} {box.size}')
