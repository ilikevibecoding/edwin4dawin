#!/usr/bin/env python3
"""Report the tone of named regions of a capture, so value judgements are numbers.

"Too bright" is the single most common note on a piece of environment art and the
single hardest to act on, because a screenshot is viewed next to whatever else is
in the frame and the eye is a comparator, not a light meter. This prints, for
each region, the mean sRGB byte value and the mean linear luma — the latter being
the one that can be reasoned about, since it is proportional to the light coming
off the surface and therefore to albedo times irradiance.

Usage: world-sample.py IMAGE NAME:X,Y,W,H [NAME:X,Y,W,H ...]

Region coordinates are fractions of the image, as in world-crop.py.
"""
import sys
from PIL import Image


def to_linear(c: float) -> float:
    """sRGB byte (normalised) to linear. The display transfer function."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


src = sys.argv[1]
im = Image.open(src).convert('RGB')
W, H = im.size

print(f'{src} {W}x{H}')
print(f'{"region":22s} {"sRGB (r,g,b)":>18s} {"lin luma":>9s} {"lin (r,g,b)":>21s}')
rows = []
for spec in sys.argv[2:]:
    name, coords = spec.split(':')
    fx, fy, fw, fh = (float(v) for v in coords.split(','))
    box = (int(fx * W), int(fy * H), int((fx + fw) * W), int((fy + fh) * H))
    px = list(im.crop(box).getdata())
    n = len(px)
    srgb = [sum(p[i] for p in px) / n for i in range(3)]
    lin = [sum(to_linear(p[i] / 255) for p in px) / n for i in range(3)]
    luma = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    rows.append((name, luma))
    print(f'{name:22s} {srgb[0]:5.0f},{srgb[1]:5.0f},{srgb[2]:5.0f} '
          f'{luma:9.4f}   {lin[0]:6.3f},{lin[1]:6.3f},{lin[2]:6.3f}')

if len(rows) > 1:
    base = rows[0]
    print(f'\nrelative to "{base[0]}":')
    for name, luma in rows[1:]:
        print(f'  {name:20s} {luma / max(base[1], 1e-6):5.2f}x')
