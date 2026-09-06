#!/usr/bin/env python3
"""side-by-side crops: cmp.py out.png x0,y0,x1,y1[,scale] a.png[:label] b.png[:label] [c.png[:label] ...]"""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
box = [float(v) for v in sys.argv[2].split(',')]
scale = box[4] if len(box) > 4 else 1.0
x0, y0, x1, y1 = [int(v) for v in box[:4]]
tiles = []
for spec in sys.argv[3:]:
    path, _, label = spec.partition(':')
    im = Image.open(path).convert('RGB').crop((x0, y0, x1, y1))
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    if label:
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 8 + 7 * len(label), 16), fill=(0, 0, 0))
        d.text((4, 2), label, fill=(255, 255, 255))
    tiles.append(im)
gap = 6
W = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
H = max(t.height for t in tiles)
sheet = Image.new('RGB', (W, H), (40, 40, 40))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width + gap
sheet.save(out)
print(out, sheet.size)
