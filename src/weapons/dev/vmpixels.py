#!/usr/bin/env python3
"""Sample the frames a vmprobe run produced inside the rectangles it reported.

A viewmodel bug of the "renders as a black smudge" kind is a claim about pixel
values, and the only way to settle it is to read the pixels. probe.json carries
the screen rectangle of every part, so this reports, per part: mean sRGB
luminance, mean linear luminance, HSV saturation and the 5th/50th/95th
percentiles of luminance. A lit glove and a black blob are then a number apart
rather than a matter of opinion.

Usage: python3 src/weapons/dev/vmpixels.py shots/vm1 [--parts armLeft,handRight]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Parts worth reporting by default; the rest are in probe.json for the asking.
DEFAULT_PARTS = [
    'viewmodel',
    'armLeft',
    'armRight',
    'handLeft',
    'handRight',
    'receiver',
    'upperRail',
    'barrel',
    'handguard',
    'magazine',
    'optic',
    'stock',
    'pistolGrip',
]

BT709 = np.array([0.2126, 0.7152, 0.0722])


def to_linear(srgb: np.ndarray) -> np.ndarray:
    low = srgb / 12.92
    high = ((srgb + 0.055) / 1.055) ** 2.4
    return np.where(srgb <= 0.04045, low, high)


def saturation(rgb: np.ndarray) -> np.ndarray:
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)


def stats(pixels: np.ndarray) -> dict:
    if pixels.size == 0:
        return {}
    luma = pixels @ BT709
    linear = to_linear(pixels) @ BT709
    sat = saturation(pixels)
    return {
        'n': int(luma.size),
        'srgbLuma': round(float(luma.mean()), 4),
        'srgb255': round(float(luma.mean() * 255), 1),
        'linear': round(float(linear.mean()), 5),
        'sat': round(float(sat.mean()), 4),
        'p5': round(float(np.percentile(luma, 5)) * 255, 1),
        'p50': round(float(np.percentile(luma, 50)) * 255, 1),
        'p95': round(float(np.percentile(luma, 95)) * 255, 1),
        'meanRgb255': [round(float(v) * 255, 1) for v in pixels.mean(axis=0)],
    }


def frame(root: Path, shot: str):
    """The delivered frame, preferring the canvas grab over the page capture.

    Under swiftshader `Page.captureScreenshot` composites the DOM but not the
    WebGL canvas, so the page capture is the HUD over black — which is also what
    made the review's own hipfire frame look corrupt. `__GRAB__` calls
    `toDataURL` immediately after a render, so it is the only reliable image, at
    the cost of being at the drawing buffer's size rather than the window's.
    """
    for name in (f'{shot}_gl.png', f'{shot}.png'):
        path = root / name
        if not path.exists():
            continue
        image = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
        # A frame whose brightest pixel outside the HUD strip is near-black is a
        # failed composite, not a dark scene.
        if name.endswith('_gl.png') or image[:, 200:1400].max() > 0.08:
            return image, name
    return None, None


def viewmodel_mask(root: Path, shot: str):
    """Exact viewmodel coverage, from the matched with/without pair.

    Anything else is guesswork: the weapon has no colour the street does not also
    have, so thresholding cannot separate them, and a bounding box around a
    forearm is two thirds cobblestone. Dynamic resolution can still move the
    buffer between the two grabs, in which case this gives up and the exact
    figure comes from the probe's own `coverage` pass instead.
    """
    a = root / f'{shot}_gl.png'
    b = root / f'{shot}_noview.png'
    if not a.exists() or not b.exists():
        return None, None
    with_view = np.asarray(Image.open(a).convert('RGB'), dtype=np.float32) / 255.0
    without = np.asarray(Image.open(b).convert('RGB'), dtype=np.float32) / 255.0
    if with_view.shape != without.shape:
        return None, None
    delta = np.abs(with_view - without).max(axis=-1)
    return with_view, delta > (2.0 / 255.0)


def masked(image: np.ndarray, mask: np.ndarray, rect=None, scale: float = 1.0) -> np.ndarray:
    sel = mask
    if rect is not None:
        box = np.zeros_like(mask)
        h, w = mask.shape
        x0 = max(0, min(w - 1, int(rect[0] * scale)))
        y0 = max(0, min(h - 1, int(rect[1] * scale)))
        x1 = max(x0 + 1, min(w, int(rect[2] * scale)))
        y1 = max(y0 + 1, min(h, int(rect[3] * scale)))
        box[y0:y1, x0:x1] = True
        sel = mask & box
    return image[sel].reshape(-1, 3)


def crop(image: np.ndarray, rect, scale: float = 1.0) -> np.ndarray:
    """Rect coordinates are in drawing-buffer space, which is not the PNG's.

    The renderer runs at a resolution scale set by the quality tier — 1039x584
    for a 1600x900 window on high — and the capture is of the composited page,
    so every rectangle has to be scaled or the samples land on the wrong part.
    """
    h, w = image.shape[:2]
    x0 = max(0, min(w - 1, int(rect[0] * scale)))
    y0 = max(0, min(h - 1, int(rect[1] * scale)))
    x1 = max(x0 + 1, min(w, int(rect[2] * scale)))
    y1 = max(y0 + 1, min(h, int(rect[3] * scale)))
    return image[y0:y1, x0:x1].reshape(-1, 3)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    root = Path(sys.argv[1])
    parts = DEFAULT_PARTS
    if '--parts' in sys.argv:
        parts = sys.argv[sys.argv.index('--parts') + 1].split(',')

    report = json.loads((root / 'probe.json').read_text())
    for shot, data in report.items():
        image, source = frame(root, shot)
        if image is None or 'rects' not in data:
            print(f'{shot}: no frame or no rects ({data.get("error", "")})')
            continue
        buffer = data.get('size') or [image.shape[1], image.shape[0]]
        scale = image.shape[1] / buffer[0]
        print(f'\n=== {shot}  {source} {image.shape[1]}x{image.shape[0]}  '
              f'buffer {buffer[0]}x{buffer[1]}  scale {scale:.3f} ===')
        pose = data.get('pose') or {}
        if pose:
            print(
                f'  ads={pose.get("ads")} fov={pose.get("viewFov")} '
                f'sightPx={pose.get("sightPixelOffset")} muzzleNdc={pose.get("muzzleNdc")}'
            )
        gl, mask = viewmodel_mask(root, shot)
        if mask is not None:
            covered = int(mask.sum())
            total = mask.size
            s = stats(gl[mask].reshape(-1, 3))
            print(f'  viewmodel pixels: {covered} of {total} = {covered / total * 100:.2f}% '
                  f'of frame; srgb {s["srgb255"]} linear {s["linear"]} sat {s["sat"]}')

        print(f'  {"part":<12} {"box%":>6} {"srgb":>6} {"linear":>8} {"sat":>6} '
              f'{"p5":>6} {"p50":>6} {"p95":>6} {"n":>7}  source')
        for name in parts:
            rect = data['rects'].get(name)
            if not rect or not rect.get('px'):
                continue
            # Inside the part's box but only on pixels the weapon actually covers.
            if mask is not None:
                pixels = masked(gl, mask, rect['px'], 1.0)
                source = 'masked'
            else:
                pixels = crop(image, rect['px'], scale)
                source = 'box'
            s = stats(pixels)
            if not s:
                continue
            print(
                f'  {name:<12} {rect["frameArea"]:>6} {s["srgb255"]:>6} {s["linear"]:>8} '
                f'{s["sat"]:>6} {s["p5"]:>6} {s["p50"]:>6} {s["p95"]:>6} {s["n"]:>7}  {source}'
            )

        coverage = data.get('coverage') or {}
        if coverage:
            order = ['viewmodel', 'weapon', 'hands', 'armLeft', 'armRight', 'handLeft', 'handRight']
            shown = [k for k in order if k in coverage]
            print('  silhouette% ' + '  '.join(f'{k}={coverage[k]:.2f}' for k in shown))
            if 'decalPixels' in coverage:
                print(f'  markings visible on {coverage["decalPixels"]:.0f} px of a '
                      f'640x360 render = {coverage["decalVisible"]:.4f}% of frame')

        # Per-material radiance, straight off the GPU. The screenshot-differencing
        # route this replaced could not work: dynamic resolution moves the buffer
        # size between grabs and the atmosphere still draws with the world hidden,
        # so every mask built from "not background" came back as the whole frame.
        radiance = data.get('radiance') or {}
        if radiance:
            print(f'  {"material":<16} {"cover%":>7} {"luma":>8} {"p5":>8} {"p50":>8} '
                  f'{"p95":>8}  {"mean rgb":<26} hue (r,g,b / max)')
            for name, r in radiance.items():
                mean = r.get('mean')
                if not mean or not r.get('pixels'):
                    print(f'  {name:<16} {"absent":>7}')
                    continue
                luma = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2]
                m = '[' + ', '.join(f'{v:.4f}' for v in mean) + ']'
                hue = '[' + ', '.join(f'{v:.2f}' for v in r['hue']) + ']'
                print(
                    f'  {name:<16} {r["coverage"]:>7.3f} {luma:>8.4f} {r["p5"]:>8.4f} '
                    f'{r["p50"]:>8.4f} {r["p95"]:>8.4f}  {m:<26} {hue}'
                )

        for r in data.get('reticles', []):
            if not r.get('pixel'):
                continue
            x, y = r['pixel']
            half = max(6.0, (r.get('heightPx') or 40) * 0.6)
            box = [x - half, y - half, x + half, y + half]
            s = stats(crop(image, box, scale))
            print(
                f'  reticle {r["name"]} vis={r["visible"]}/{r["chainVisible"]} '
                f'opacity={r["opacity"]} peak={r["peakRadiance"]} h={r["heightPx"]}px '
                f'at {r["pixel"]} -> srgb {s.get("srgb255")} p95 {s.get("p95")} '
                f'sat {s.get("sat")} rgb {s.get("meanRgb255")}'
            )
    return 0


if __name__ == '__main__':
    sys.exit(main())
