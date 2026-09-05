#!/usr/bin/env python3
"""Post-process a capture run: 8x8 grid overlays (cells A1-H8), crops (aircraft, key environment,
medium, distant), temporal-flicker metric from clip frames, and a compact JPEG copy for the results
folder.

    python3 bench/scripts/postprocess.py --tag iter01 [--results]
"""
import argparse, json, os, sys, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CROPS = {
    # view: name -> (cx, cy, size) in normalised frame coordinates; aircraft crop uses the projected centroid
    'default': {'environment': (0.5, 0.5, 0.36), 'medium': (0.3, 0.45, 0.28), 'distant': (0.5, 0.27, 0.42)},
    'aerial-a': {'environment': (0.42, 0.62, 0.42), 'medium': (0.62, 0.42, 0.3), 'distant': (0.32, 0.24, 0.36)},
    'skyline-high': {'environment': (0.36, 0.42, 0.4), 'medium': (0.62, 0.55, 0.3), 'distant': (0.3, 0.3, 0.3)},
    'bridge-low': {'environment': (0.5, 0.6, 0.4), 'medium': (0.3, 0.5, 0.3), 'distant': (0.5, 0.35, 0.36)},
    'night': {'environment': (0.4, 0.45, 0.42), 'medium': (0.62, 0.5, 0.3), 'distant': (0.45, 0.3, 0.36)},
}


def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def grid_overlay(img):
    w, h = img.size
    out = img.copy().convert('RGB')
    d = ImageDraw.Draw(out, 'RGBA')
    f = font(max(14, w // 90))
    for i in range(1, 8):
        d.line([(w * i / 8, 0), (w * i / 8, h)], fill=(255, 255, 255, 140), width=1)
        d.line([(0, h * i / 8), (w, h * i / 8)], fill=(255, 255, 255, 140), width=1)
    for r in range(8):
        for c in range(8):
            label = f"{'ABCDEFGH'[c]}{r + 1}"
            x, y = w * c / 8 + 6, h * r / 8 + 4
            d.rectangle([x - 2, y - 1, x + f.getlength(label) + 4, y + f.size + 2], fill=(0, 0, 0, 110))
            d.text((x, y), label, fill=(255, 255, 60, 230), font=f)
    return out


def crop(img, cx, cy, size, out_size=768):
    w, h = img.size
    s = int(size * h)
    x0 = int(max(0, min(w - s, cx * w - s / 2)))
    y0 = int(max(0, min(h - s, cy * h - s / 2)))
    return img.crop((x0, y0, x0 + s, y0 + s)).resize((out_size, out_size), Image.LANCZOS), (x0, y0, s)


def flicker(clip_dir):
    frames = sorted(glob.glob(os.path.join(clip_dir, 'f*.png')))
    if len(frames) < 2:
        return None
    import numpy as np
    prev = None
    diffs = []
    for f in frames:
        a = np.asarray(Image.open(f).convert('L').resize((320, 180)), dtype=np.float32)
        if prev is not None:
            diffs.append(float(np.mean(np.abs(a - prev))))
        prev = a
    return {'meanAbsDiff': sum(diffs) / len(diffs), 'maxAbsDiff': max(diffs), 'frames': len(frames)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', required=True)
    ap.add_argument('--results', action='store_true', help='also write compact JPEGs to bench/results/<tag>')
    a = ap.parse_args()
    run = os.path.join(ROOT, 'out', a.tag)
    summary_path = os.path.join(run, 'summary.json')
    summary = json.load(open(summary_path)) if os.path.exists(summary_path) else {'views': {}}
    res_dir = os.path.join(ROOT, 'results', a.tag)
    if a.results:
        os.makedirs(res_dir, exist_ok=True)
    for view in sorted(os.listdir(run)):
        vdir = os.path.join(run, view)
        still = os.path.join(vdir, 'still.png')
        if not os.path.isfile(still):
            continue
        img = Image.open(still).convert('RGB')
        grid_overlay(img).save(os.path.join(vdir, 'still_grid.png'))
        metrics_path = os.path.join(vdir, 'metrics.json')
        metrics = json.load(open(metrics_path)) if os.path.exists(metrics_path) else {}
        crops_dir = os.path.join(vdir, 'crops')
        os.makedirs(crops_dir, exist_ok=True)
        spec = CROPS.get(view, CROPS['default'])
        crop_info = {}
        lm = (metrics.get('still') or {}).get('landmarks') or {}
        pc = lm.get('planeCentroid')
        if pc:
            c, box = crop(img, pc[0], pc[1], 0.3)
            c.save(os.path.join(crops_dir, 'aircraft.png'))
            crop_info['aircraft'] = box
        for name, (cx, cy, size) in spec.items():
            c, box = crop(img, cx, cy, size)
            c.save(os.path.join(crops_dir, f'{name}.png'))
            crop_info[name] = box
        fl = flicker(os.path.join(vdir, 'clip'))
        metrics['crops'] = crop_info
        metrics['flicker'] = fl
        json.dump(metrics, open(metrics_path, 'w'), indent=2)
        if view in summary.get('views', {}):
            summary['views'][view]['flicker'] = fl
        if a.results:
            img.save(os.path.join(res_dir, f'{view}_still.jpg'), quality=86)
            fp = os.path.join(vdir, 'flight.png')
            if os.path.exists(fp):
                Image.open(fp).convert('RGB').save(os.path.join(res_dir, f'{view}_flight.jpg'), quality=86)
            if pc:
                Image.open(os.path.join(crops_dir, 'aircraft.png')).save(os.path.join(res_dir, f'{view}_crop_aircraft.jpg'), quality=88)
            json.dump({k: v for k, v in metrics.items() if k != 'clip'} | {'clip': {k: v for k, v in (metrics.get('clip') or {}).items() if k != 'frameTimesMs'} | {'frameTimesMs': (metrics.get('clip') or {}).get('frameTimesMs')}}, open(os.path.join(res_dir, f'{view}_metrics.json'), 'w'), indent=1)
        print(f'{view}: grid + {len(crop_info)} crops' + (f", flicker {fl['meanAbsDiff']:.2f}" if fl else ''))
    if os.path.exists(summary_path):
        json.dump(summary, open(summary_path, 'w'), indent=2)
        if a.results:
            json.dump(summary, open(os.path.join(res_dir, 'summary.json'), 'w'), indent=2)


if __name__ == '__main__':
    main()
