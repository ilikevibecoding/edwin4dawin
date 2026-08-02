#!/usr/bin/env python3
"""Tile rendered frames into labelled contact sheets."""
import sys, os, glob
from PIL import Image, ImageDraw

src, out, cols, rows = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
files = sorted(glob.glob(os.path.join(src, '*.png')))
if not files:
    print('no frames'); sys.exit(1)

w, h = Image.open(files[0]).size
per = cols * rows
pad, lab = 4, 18

for s in range((len(files) + per - 1) // per):
    chunk = files[s * per:(s + 1) * per]
    sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + lab + pad) + pad), (16, 16, 18))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + lab + pad)
        sheet.paste(Image.open(f).convert('RGB'), (x, y))
        t = os.path.basename(f).split('_')[1][:-4]
        d.text((x + 4, y + h + 3), f't = {t}s', fill=(230, 210, 120))
    p = os.path.join(out, f'sheet{s:02d}.png')
    sheet.save(p)
    print(p, f'({len(chunk)} frames: {os.path.basename(chunk[0])} .. {os.path.basename(chunk[-1])})')
