#!/usr/bin/env python3
"""Crop and upscale a region of a capture so detail can be judged at pixel level.

Usage: world-crop.py IN OUT X Y W H [SCALE]

Coordinates are fractions of the source image, so the same call works whatever
resolution the shot was taken at.
"""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
fx, fy, fw, fh = (float(v) for v in sys.argv[3:7])
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 2.0

im = Image.open(src).convert('RGB')
W, H = im.size
box = (int(fx * W), int(fy * H), int((fx + fw) * W), int((fy + fh) * H))
crop = im.crop(box)
crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
crop.save(dst)
print(f'{dst} {crop.width}x{crop.height} from {box}')
