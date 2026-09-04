#!/usr/bin/env python3
"""Compare two capture runs (candidate vs approved) on identical views: renderer counters, sync frame time,
memory, objective composition scores, flicker, and a per-pixel difference summary. Also writes side-by-side
images so critics can A/B the same view.

    python3 bench/scripts/compare.py --base iter02 --cand iter03 [--views aerial-a,...]
"""
import argparse, json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_metrics(tag, view):
    p = os.path.join(ROOT, 'out', tag, view, 'metrics.json')
    return json.load(open(p)) if os.path.exists(p) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--cand', required=True)
    ap.add_argument('--views', default=None)
    a = ap.parse_args()
    base_dir = os.path.join(ROOT, 'out', a.base)
    cand_dir = os.path.join(ROOT, 'out', a.cand)
    views = a.views.split(',') if a.views else sorted(v for v in os.listdir(cand_dir) if os.path.isdir(os.path.join(cand_dir, v)) and os.path.isdir(os.path.join(base_dir, v)))
    out_dir = os.path.join(ROOT, 'out', f'compare-{a.base}-vs-{a.cand}')
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for v in views:
        mb, mc = load_metrics(a.base, v), load_metrics(a.cand, v)
        if not mb or not mc:
            continue
        sb, sc = mb['still']['metrics'], mc['still']['metrics']
        pb, pc = mb.get('profile') or {}, mc.get('profile') or {}
        row = {
            'view': v,
            'calls': (sb['calls'], sc['calls']), 'triangles': (sb['triangles'], sc['triangles']),
            'heapMB': (round(sb.get('jsHeapMB') or 0), round(sc.get('jsHeapMB') or 0)),
            'swFrameMs': (round(pb.get('avgMs', 0)), round(pc.get('avgMs', 0))),
            'flicker': ((mb.get('flicker') or {}).get('meanAbsDiff'), (mc.get('flicker') or {}).get('meanAbsDiff')),
        }
        ib = Image.open(os.path.join(base_dir, v, 'still.png')).convert('RGB')
        ic = Image.open(os.path.join(cand_dir, v, 'still.png')).convert('RGB')
        if ib.size == ic.size:
            A = np.asarray(ib, dtype=np.float32); B = np.asarray(ic, dtype=np.float32)
            d = np.abs(A - B).mean(axis=2)
            row['pixelMeanAbsDiff'] = float(d.mean())
            row['pixelChangedFraction'] = float((d > 12).mean())
            # 8x8 grid of change so critics know where to look
            h, w = d.shape
            grid = [[float(d[r * h // 8:(r + 1) * h // 8, c * w // 8:(c + 1) * w // 8].mean()) for c in range(8)] for r in range(8)]
            row['gridMeanDiff'] = grid
            side = Image.new('RGB', (ib.width * 2 + 8, ib.height), (0, 0, 0))
            side.paste(ib, (0, 0)); side.paste(ic, (ib.width + 8, 0))
            side.resize((side.width // 2, side.height // 2), Image.LANCZOS).save(os.path.join(out_dir, f'{v}_ab.jpg'), quality=88)
        rows.append(row)
    for tag in (a.base, a.cand):
        ob = os.path.join(ROOT, 'out', tag, 'aerial-a', 'objective.json')
        if os.path.exists(ob):
            o = json.load(open(ob))
            for r in rows:
                if r['view'] == 'aerial-a':
                    r.setdefault('objective', {})[tag] = {x['metric']: x['score'] for x in o['rows']}
    json.dump({'base': a.base, 'cand': a.cand, 'rows': rows}, open(os.path.join(out_dir, 'compare.json'), 'w'), indent=1)
    print(f"| view | draw calls | triangles | heap MB | sw frame ms | flicker | pixel Δ mean | changed % |")
    print('|---|---|---|---|---|---|---|---|')
    for r in rows:
        f = r['flicker']
        print(f"| {r['view']} | {r['calls'][0]}→{r['calls'][1]} | {r['triangles'][0]/1e6:.1f}M→{r['triangles'][1]/1e6:.1f}M | {r['heapMB'][0]}→{r['heapMB'][1]} | {r['swFrameMs'][0]}→{r['swFrameMs'][1]} | {'' if f[0] is None else round(f[0],2)}→{'' if f[1] is None else round(f[1],2)} | {r.get('pixelMeanAbsDiff', 0):.1f} | {100*r.get('pixelChangedFraction', 0):.0f}% |")
    for r in rows:
        if 'objective' in r:
            print('\nobjective (aerial-a):')
            keys = sorted({k for d in r['objective'].values() for k in d})
            for k in keys:
                vals = [r['objective'].get(t, {}).get(k) for t in (a.base, a.cand)]
                print(f"  {k}: {vals[0]} → {vals[1]}")
    print(f"\nwrote {out_dir}")


if __name__ == '__main__':
    main()
