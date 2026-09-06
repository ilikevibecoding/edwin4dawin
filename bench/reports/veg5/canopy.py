#!/usr/bin/env python3
"""Canopy mean of a 1920x1080 aerial-a still: box (700,560)-(1300,800), green-dominant mask (g > r and g > b),
plus the lit/shade spread (10th / 90th percentile of luminance) and the mean hue/saturation of the mask."""
import sys, colorsys
import numpy as np
from PIL import Image

def measure(path, box=(700, 560, 1300, 800)):
    im = Image.open(path).convert('RGB')
    if im.size != (1920, 1080):
        sx, sy = im.size[0] / 1920, im.size[1] / 1080
        box = (int(box[0] * sx), int(box[1] * sy), int(box[2] * sx), int(box[3] * sy))
    a = np.asarray(im.crop(box)).astype(np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mask = (g > r) & (g > b * 1.12) & (g > 20)
    px = a[mask]
    mean = px.mean(axis=0)
    lum = 0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2]
    p10, p50, p90 = np.percentile(lum, [10, 50, 90])
    hs = np.array([colorsys.rgb_to_hsv(*(p / 255.0)) for p in px[::37]])
    return dict(n=int(mask.sum()), frac=float(mask.mean()), mean=[round(float(x), 1) for x in mean], lum_p10=round(float(p10), 1), lum_p50=round(float(p50), 1), lum_p90=round(float(p90), 1), hue=round(float(hs[:, 0].mean() * 360), 1), sat=round(float(hs[:, 1].mean()), 3))

for p in sys.argv[1:]:
    print(p, measure(p))
