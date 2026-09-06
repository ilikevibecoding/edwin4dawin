#!/usr/bin/env python3
"""Pixel + metrics diff of two capture runs: python3 diff.py <outRootA> <outRootB> view1,view2,..."""
import json, sys, pathlib
from PIL import Image, ImageChops

a_root, b_root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
views = sys.argv[3].split(',')
KEYS = ['calls', 'triangles', 'points', 'lines', 'geometries', 'textures', 'programs', 'visibleObjects']

rows = []
for v in views:
    a, b = a_root / v, b_root / v
    ia, ib = Image.open(a / 'still.png').convert('RGB'), Image.open(b / 'still.png').convert('RGB')
    assert ia.size == ib.size, (v, ia.size, ib.size)
    d = ImageChops.difference(ia, ib)
    extrema = d.getextrema()                      # per channel (min, max)
    maxdiff = max(hi for _, hi in extrema)
    # pixels where any channel differs, and the bounding box of them (alpha_only=False: look at all channels)
    mask = d.convert('L', matrix=None).point(lambda x: 255 if x else 0)
    mask = Image.eval(d.split()[0].point(lambda x: 255 if x else 0), lambda x: x)
    for ch in d.split()[1:]:
        mask = ImageChops.lighter(mask, ch.point(lambda x: 255 if x else 0))
    ndiff = mask.histogram()[255]
    bbox = mask.getbbox(alpha_only=False)
    hist = [0] * 256
    for ch in d.split():
        h = ch.histogram()
        for i in range(256): hist[i] += h[i]
    ma = json.loads((a / 'metrics.json').read_text())['still']['metrics']
    mb = json.loads((b / 'metrics.json').read_text())['still']['metrics']
    m = {k: (ma.get(k), mb.get(k)) for k in KEYS if k in ma or k in mb}
    rows.append((v, ia.size, maxdiff, ndiff, bbox, hist, m))

print('| view | size | max abs channel diff | pixels with any channel diff | share of pixels | draw calls (base / split) | triangles (base / split) | other renderer counters |')
print('|---|---|---|---|---|---|---|---|')
for v, size, maxdiff, ndiff, bbox, hist, m in rows:
    others = all(x == y for k, (x, y) in m.items() if k not in ('calls', 'triangles'))
    total = size[0] * size[1]
    print(f'| {v} | {size[0]}x{size[1]} | {maxdiff} | {ndiff} | {100 * ndiff / total:.3f} % | {m["calls"][0]} / {m["calls"][1]} | {m["triangles"][0]} / {m["triangles"][1]} | {"equal" if others else "DIFFER: " + str({k: xy for k, xy in m.items() if xy[0] != xy[1]})} |')
for v, size, maxdiff, ndiff, bbox, hist, m in rows:
    if ndiff:
        nz = {i: hist[i] for i in range(1, 256) if hist[i]}
        print(f'  {v}: bbox of differing pixels {bbox}; channel-difference histogram (value: count) {nz}')
