#!/usr/bin/env python3
"""Side-by-side before/after crop with a label: compare.py before.png after.png x0 y0 x1 y1 "title" out.jpg [scale]
The 8x8 grid cells (A-H columns / 1-8 rows of the 1920x1080 frame) covered by the box are added to the label."""
import sys
from PIL import Image, ImageDraw, ImageFont

before, after, x0, y0, x1, y1, title, out = sys.argv[1:9]
scale = float(sys.argv[9]) if len(sys.argv) > 9 else 1.0
box = tuple(int(v) for v in (x0, y0, x1, y1))
a = Image.open(before).convert('RGB').crop(box)
b = Image.open(after).convert('RGB').crop(box)
if scale != 1.0:
    a = a.resize((int(a.width * scale), int(a.height * scale)), Image.LANCZOS)
    b = b.resize((int(b.width * scale), int(b.height * scale)), Image.LANCZOS)
cols = 'ABCDEFGH'
c0, c1 = cols[min(7, box[0] // 240)], cols[min(7, (box[2] - 1) // 240)]
r0, r1 = box[1] // 135 + 1, (box[3] - 1) // 135 + 1
cells = f"{c0}{r0}-{c1}{r1}" if (c0, r0) != (c1, r1) else f"{c0}{r0}"
pad, head = 6, 26
W = a.width + b.width + pad * 3
H = a.height + head + pad * 2
im = Image.new('RGB', (W, H), (24, 24, 24))
im.paste(a, (pad, head + pad))
im.paste(b, (a.width + pad * 2, head + pad))
d = ImageDraw.Draw(im)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception:
    font = ImageFont.load_default()
d.text((pad, 5), f"{title}  [{cells}]   before (left) / after (right)", fill=(235, 235, 235), font=font)
im.save(out, quality=88)
print(out, im.size, cells)
