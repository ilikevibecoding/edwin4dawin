#!/usr/bin/env python3
"""Objective comparison of a captured run against the Reference A analysis and the scoring anchors.

    python3 bench/scripts/metrics.py --tag iter01 [--view aerial-a]

Writes bench/out/<tag>/objective.json and prints a table. Positional anchors: 10 within 1% of the frame,
9 within 2%, 8 within 4%, 7 within 6%, else 5 (composition failure). Overlap anchors: 10 >= 98%,
9 >= 95%, 8 >= 90%, 6.5 >= 80%, else 4. Colour anchors use CIE76 dE: 10 < 5, 9 < 10, 8 < 18, 7 < 25, else 6.
"""
import argparse, json, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refanalysis import analyse  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pos_score(d):
    if d is None: return 0
    if d <= 0.01: return 10
    if d <= 0.02: return 9
    if d <= 0.04: return 8
    if d <= 0.06: return 7
    return 5


def overlap_score(iou):
    if iou is None: return 0
    if iou >= 0.98: return 10
    if iou >= 0.95: return 9
    if iou >= 0.90: return 8
    if iou >= 0.80: return 6.5
    return 4


def color_score(de):
    if de is None: return 0
    if de < 5: return 10
    if de < 10: return 9
    if de < 18: return 8
    if de < 25: return 7
    return 6


def srgb_to_lab(rgb):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(float(v)) for v in rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 1.0
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    if a is None or b is None: return None
    la, lb = srgb_to_lab(a), srgb_to_lab(b)
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(la, lb)))


def iou(a, b):
    if not a or not b: return None
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x1 - x0) * max(0, y1 - y0)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', required=True)
    ap.add_argument('--view', default='aerial-a')
    a = ap.parse_args()
    ref = json.load(open(os.path.join(ROOT, 'reference', 'reference_a.json')))
    run = os.path.join(ROOT, 'out', a.tag, a.view)
    still = os.path.join(run, 'still.png')
    cur = analyse(still)
    metrics = json.load(open(os.path.join(run, 'metrics.json')))
    lm = (metrics.get('still') or {}).get('landmarks') or {}
    rows = []

    def add(name, value, score, note=''):
        rows.append({'metric': name, 'value': value, 'score': score, 'note': note})

    # horizon: the bench projects the exact horizontal ray when available (the image detector is fooled by
    # cloud bases and haze bands); fall back to the detector otherwise
    cur_h = lm['horizon'][1] if lm.get('horizon') else cur['horizonY']
    dh = abs(cur_h - ref['horizonY'])
    add('horizon displacement (frac of height)', round(dh, 4), pos_score(dh), f"ref {ref['horizonY']:.3f} vs {cur_h:.3f}" + ('' if lm.get('horizon') else ' (image detector)'))
    # aircraft: compare the projected model bounding box with the whole-aircraft reference measurement
    # (`aircraftFull`, measured by hand incl. the white wing) rather than the yellow-body-only masks
    ref_ac = ref.get('aircraftFull') or ref['aircraft']
    if lm.get('planeBoxMin') and lm.get('planeBoxMax'):
        bb = [lm['planeBoxMin'][0], lm['planeBoxMin'][1], lm['planeBoxMax'][0], lm['planeBoxMax'][1]]
        cen = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]
        d = math.dist(cen, ref_ac['centroid'])
        add('aircraft centroid displacement', round(d, 4), pos_score(d), f"ref {ref_ac['centroid']} vs {[round(v, 3) for v in cen]} (projected model box centre)")
        dw = abs((bb[2] - bb[0]) - (ref_ac['widthFraction'] or 0))
        add('aircraft bbox width difference', round(dw, 4), pos_score(dw), f"ref {ref_ac['widthFraction']:.3f} vs {bb[2] - bb[0]:.3f} (projected model box)")
        add('aircraft bbox IoU', round(iou(bb, ref_ac['bbox']) or 0, 3), overlap_score(iou(bb, ref_ac['bbox'])), f"ref {ref_ac['bbox']} vs {[round(v, 3) for v in bb]}")
    elif cur['aircraft']['centroid'] and ref['aircraft']['centroid']:
        d = math.dist(cur['aircraft']['centroid'], ref['aircraft']['centroid'])
        add('aircraft centroid displacement', round(d, 4), pos_score(d), f"ref {ref['aircraft']['centroid']} vs {[round(v, 3) for v in cur['aircraft']['centroid']]} (yellow mask)")
        dw = abs((cur['aircraft']['widthFraction'] or 0) - (ref['aircraft']['widthFraction'] or 0))
        add('aircraft bbox width difference', round(dw, 4), pos_score(dw), 'projected span as fraction of frame width (yellow mask)')
        add('aircraft bbox IoU', round(iou(cur['aircraft']['bbox'], ref['aircraft']['bbox']) or 0, 3), overlap_score(iou(cur['aircraft']['bbox'], ref['aircraft']['bbox'])))
    else:
        add('aircraft centroid displacement', None, 0, 'aircraft not detected')
    if lm.get('bridgeStart') and lm.get('bridgeEnd'):
        ann = ref.get('annotations', {})
        d0 = math.dist(lm['bridgeStart'], ann['bridgeStart']); d1 = math.dist(lm['bridgeEnd'], ann['bridgeEnd'])
        add('bridge start displacement', round(d0, 4), pos_score(d0), f"proj {[round(v, 3) for v in lm['bridgeStart']]} vs ann {ann['bridgeStart']}")
        add('bridge end displacement', round(d1, 4), pos_score(d1), f"proj {[round(v, 3) for v in lm['bridgeEnd']]} vs ann {ann['bridgeEnd']}")
    tall = [v for k, v in lm.items() if k.startswith('landmark:') and v]
    if tall:
        ann = ref.get('annotations', {}).get('skylineTallest')
        best = min(tall, key=lambda p: p[1])  # highest on screen
        d = math.dist(best, ann)
        add('skyline tallest-tower displacement', round(d, 4), pos_score(d), f"proj {[round(v, 3) for v in best]} vs ann {ann}")
    ii = iou(cur['largestIsland']['bbox'], ref['largestIsland']['bbox'])
    add('largest island bbox IoU', round(ii or 0, 3), overlap_score(ii), f"ref {ref['largestIsland']['bbox']} vs {cur['largestIsland']['bbox']}")
    dc = abs(cur['cloudCoverAboveHorizon'] - ref['cloudCoverAboveHorizon'])
    add('cloud cover above horizon difference', round(dc, 3), 10 if dc < 0.05 else 9 if dc < 0.1 else 8 if dc < 0.2 else 6, f"ref {ref['cloudCoverAboveHorizon']:.2f} vs {cur['cloudCoverAboveHorizon']:.2f}")
    dw = abs(cur['waterAreaFraction'] - ref['waterAreaFraction'])
    add('water area fraction difference', round(dw, 3), 10 if dw < 0.03 else 9 if dw < 0.06 else 8 if dw < 0.1 else 6, f"ref {ref['waterAreaFraction']:.2f} vs {cur['waterAreaFraction']:.2f}")
    for key in ['skyTop', 'skyHorizon', 'waterNear', 'waterFar', 'vegetation', 'sand', 'clouds', 'aircraftYellow']:
        de = delta_e(cur['dominantColors'].get(key), ref['dominantColors'].get(key))
        add(f'colour dE {key}', None if de is None else round(de, 1), color_score(de), f"ref {ref['dominantColors'].get(key)} vs {cur['dominantColors'].get(key)}")
    fl = metrics.get('flicker')
    if fl:
        s = 10 if fl['meanAbsDiff'] < 2.5 else 9 if fl['meanAbsDiff'] < 4 else 8 if fl['meanAbsDiff'] < 7 else 6
        add('temporal mean |diff| between clip frames (0-255, includes motion)', round(fl['meanAbsDiff'], 2), s, 'lower is steadier; camera motion contributes')
    out = {'tag': a.tag, 'view': a.view, 'build': metrics.get('still', {}).get('metrics', {}).get('build'), 'rows': rows, 'current': cur}
    json.dump(out, open(os.path.join(run, 'objective.json'), 'w'), indent=2)
    print(f"| metric | value | score | note |\n|---|---|---|---|")
    for r in rows:
        print(f"| {r['metric']} | {r['value']} | {r['score']} | {r['note']} |")


if __name__ == '__main__':
    main()
