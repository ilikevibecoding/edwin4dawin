#!/usr/bin/env python3
"""Brown-glaze metric on a frame region: share of pixels whose hue is in the orange-brown range (15-50 deg) with
moderate saturation and mid value (the glaze), share of near-white highlight pixels, and mean sRGB of the region.
usage: brown.py img.png [y0 y1 x0 x1]  (fractions of the frame; default = lower 55 %)"""
import sys
import numpy as np
from PIL import Image

def stats(path, y0=0.45, y1=1.0, x0=0.0, x1=1.0):
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
    h, w, _ = im.shape
    r = im[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    mx = r.max(axis=2); mn = r.min(axis=2)
    v = mx; s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    R, G, B = r[..., 0], r[..., 1], r[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == R, (G - B) / d % 6, np.where(mx == G, (B - R) / d + 2, (R - G) / d + 4)) * 60
    brown = (hue >= 15) & (hue <= 50) & (s >= 0.22) & (v >= 0.18) & (v <= 0.8)
    white = (v >= 0.92) & (s <= 0.12)
    warm_bright = (hue >= 15) & (hue <= 60) & (v > 0.8) & (s > 0.12)
    return dict(brown=float(brown.mean()), white=float(white.mean()), warmBright=float(warm_bright.mean()),
                mean=[float(x) for x in (r.mean(axis=(0, 1)) * 255).round(1)])

if __name__ == '__main__':
    p = sys.argv[1]
    args = [float(a) for a in sys.argv[2:6]]
    st = stats(p, *args) if args else stats(p)
    print(p.split('/')[-2:], {k: (round(v, 4) if isinstance(v, float) else v) for k, v in st.items()})
