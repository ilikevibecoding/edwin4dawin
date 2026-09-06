#!/usr/bin/env python3
"""Canopy statistics over a fixed canopy region of the aerial-a still (box (700,560)-(1080,800), all pixels that
are neither water (b >= g) nor sand (lum > 170)), so the dark shaded crowns count too: mean sRGB, luminance
percentiles, the lit (top 20 %) and shade (bottom 20 %) bands with hue/saturation, and the fraction of dark
pixels (lum < 60)."""
import sys, colorsys
import numpy as np
from PIL import Image

def band(px):
    m = px.mean(axis=0) / 255.0
    h, s, v = colorsys.rgb_to_hsv(*m)
    return [int(round(x * 255)) for x in m], round(h * 360), round(s, 2), round(v, 2)

def measure(path, box=(700, 560, 1080, 800)):
    im = Image.open(path).convert('RGB')
    if im.size != (1920, 1080):
        sx, sy = im.size[0] / 1920, im.size[1] / 1080
        box = (int(box[0] * sx), int(box[1] * sy), int(box[2] * sx), int(box[3] * sy))
    a = np.asarray(im.crop(box)).astype(np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mask = (b < g) & (lum < 170)
    px = a[mask]
    l = lum[mask]
    p10, p50, p90 = np.percentile(l, [10, 50, 90])
    order = np.argsort(l)
    n = len(order)
    shade = band(px[order[: n // 5]])
    lit = band(px[order[-(n // 5):]])
    mean = [round(float(x), 1) for x in px.mean(axis=0)]
    return dict(frac=round(float(mask.mean()), 3), mean=mean, p10=round(float(p10), 1), p50=round(float(p50), 1), p90=round(float(p90), 1), dark=round(float((l < 60).mean()), 3), shade=shade, lit=lit)

for p in sys.argv[1:]:
    print(p.split('/')[-1], measure(p))
