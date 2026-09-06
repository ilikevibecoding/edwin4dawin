#!/usr/bin/env python3
"""Temporal-flicker metric of a clip directory (f000.png ...), as bench/scripts/postprocess.py computes it
(mean |difference| of consecutive frames, greyscale, 320x180), plus the same over the lower half of the frame
(mostly water in the water-landing / island-pass clips) and the per-step series, so two builds' clips of the
same view can be compared step by step.  usage: flicker.py <clipdir> [<clipdir> ...]"""
import glob, os, sys
import numpy as np
from PIL import Image

def series(d):
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    prev = None; full = []; low = []
    for f in frames:
        a = np.asarray(Image.open(f).convert('L').resize((320, 180)), dtype=np.float32)
        if prev is not None:
            full.append(float(np.mean(np.abs(a - prev))))
            low.append(float(np.mean(np.abs(a[90:] - prev[90:]))))
        prev = a
    return full, low, len(frames)

for d in sys.argv[1:]:
    full, low, n = series(d)
    if not full:
        print(f'{d}: no frames'); continue
    print(f'{d}: {n} frames  meanAbsDiff {np.mean(full):.2f} (max {np.max(full):.2f})  lower half {np.mean(low):.2f} (max {np.max(low):.2f})')
    print('  steps: ' + ' '.join(f'{x:.1f}' for x in full))
