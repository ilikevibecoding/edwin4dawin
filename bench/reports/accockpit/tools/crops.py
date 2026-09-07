#!/usr/bin/env python3
"""Before/after crop pairs for the gauntlet report.

  crops.py <out.jpg> <before.png> <after.png> <x,y,w,h> [--scale S] [--label-before T] [--label-after T]

The same crop box (in the after image's pixels; the before image is resampled to the after image's size first, so
1280x720 baselines line up with 1920x1080 stills) is cut from both stills at 100 % (or scaled by S for small
details) and placed side by side with a thin divider and captions.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('out'); ap.add_argument('before'); ap.add_argument('after'); ap.add_argument('box')
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--label-before', default='before'); ap.add_argument('--label-after', default='after')
    ap.add_argument('--quality', type=int, default=92)
    a = ap.parse_args()
    x, y, w, h = [int(v) for v in a.box.split(',')]
    after = Image.open(a.after).convert('RGB')
    before = Image.open(a.before).convert('RGB')
    if before.size != after.size:
        before = before.resize(after.size, Image.LANCZOS)
    tiles = []
    for im in (before, after):
        t = im.crop((x, y, x + w, y + h))
        if a.scale != 1.0:
            t = t.resize((round(w * a.scale), round(h * a.scale)), Image.LANCZOS if a.scale < 1 else Image.NEAREST)
        tiles.append(t)
    tw, th = tiles[0].size
    gap, cap = 6, 26
    out = Image.new('RGB', (tw * 2 + gap, th + cap), (18, 18, 20))
    out.paste(tiles[0], (0, cap)); out.paste(tiles[1], (tw + gap, cap))
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except OSError:
        font = ImageFont.load_default()
    d.text((8, 5), a.label_before, fill=(230, 230, 230), font=font)
    d.text((tw + gap + 8, 5), a.label_after, fill=(230, 230, 230), font=font)
    out.save(a.out, quality=a.quality)
    print(a.out, out.size)


if __name__ == '__main__':
    main()
