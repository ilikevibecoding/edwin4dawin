#!/usr/bin/env python3
"""Crop and magnify a region of an FX screenshot.

A particle or a decal that is thirty pixels across in a 1600 px frame cannot be
judged from the frame, and the interesting failures — a bullet hole that is
actually a black dot, a dust puff whose rim has a hard edge — are only visible
magnified. Not part of the game; a review tool for `shots/`.

    python3 src/fx/dev/fxcrop.py shots/fx/impact_concrete.png out.png \
        --box 0.35 0.2 0.65 0.6 --scale 3
"""
import argparse
import sys

from PIL import Image


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument(
        '--box',
        nargs=4,
        type=float,
        default=[0.3, 0.2, 0.7, 0.7],
        metavar=('X0', 'Y0', 'X1', 'Y1'),
        help='crop rectangle as fractions of the image',
    )
    ap.add_argument('--scale', type=float, default=2.0)
    args = ap.parse_args()

    img = Image.open(args.src).convert('RGB')
    w, h = img.size
    x0, y0, x1, y1 = args.box
    box = (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))
    crop = img.crop(box)
    if args.scale != 1.0:
        crop = crop.resize(
            (int(crop.width * args.scale), int(crop.height * args.scale)),
            Image.NEAREST,
        )
    crop.save(args.dst)
    print(f'{args.src} {w}x{h} -> {args.dst} {crop.width}x{crop.height} box={box}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
