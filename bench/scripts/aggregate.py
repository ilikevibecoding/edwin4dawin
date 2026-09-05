#!/usr/bin/env python3
"""Aggregate critic JSON files for a round: median per criterion per frame, spread (disagreement > 2
flagged), per-category medians across frames, component pass/fail against the targets, and a markdown
score table with the collected defects/fixes.

    python3 bench/scripts/aggregate.py --tag iter01-baseline [--prev iter00]
"""
import argparse, json, os, statistics, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(tag):
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'results', tag, 'critics', '*.json'))):
        try:
            d = json.load(open(f))
        except Exception as e:  # noqa: BLE001
            print('bad json', f, e)
            continue
        out[d.get('critic', os.path.basename(f))] = d
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', required=True)
    ap.add_argument('--prev', default=None)
    a = ap.parse_args()
    rubric = json.load(open(os.path.join(ROOT, 'rubric.json')))
    cats = {str(c['id']): c for c in rubric['categories']}
    critics = load(a.tag)
    prev = None
    if a.prev:
        pp = os.path.join(ROOT, 'results', a.prev, 'scores.json')
        if os.path.exists(pp):
            prev = json.load(open(pp))
    frames = sorted({v for c in critics.values() for v in c.get('frames', {})})
    result = {'tag': a.tag, 'critics': list(critics), 'frames': {}, 'categories': {}, 'disagreements': [], 'defects': {}}
    per_cat_all = {cid: [] for cid in cats}
    for view in frames:
        fr = {'median': {}, 'spread': {}, 'n': {}}
        for cid in cats:
            vals = []
            for cname, c in critics.items():
                sc = c.get('frames', {}).get(view, {}).get('scores', {})
                v = sc.get(cid, sc.get(int(cid)) if isinstance(sc, dict) else None)
                if v is not None:
                    try:
                        vals.append(float(v))
                    except (TypeError, ValueError):
                        pass
            if vals:
                med = statistics.median(vals)
                fr['median'][cid] = med
                fr['spread'][cid] = max(vals) - min(vals)
                fr['n'][cid] = len(vals)
                per_cat_all[cid].append(med)
                if max(vals) - min(vals) > 2:
                    result['disagreements'].append({'view': view, 'category': cid, 'name': cats[cid]['name'], 'values': vals})
        result['frames'][view] = fr
        # defects: collect entries with lowest scores
        entries = []
        for cname, c in critics.items():
            for e in c.get('frames', {}).get(view, {}).get('entries', []):
                entries.append({'critic': cname, **{k: e.get(k) for k in ('category', 'score', 'cells', 'defect', 'fix', 'hardFailure', 'kind')}})
        entries.sort(key=lambda e: (e.get('score') if isinstance(e.get('score'), (int, float)) else 99))
        result['defects'][view] = entries[:12]
    for cid, meds in per_cat_all.items():
        if meds:
            m = statistics.median(meds)
            target = rubric['targets']['critical'] if cats[cid]['critical'] else rubric['targets']['ordinary']
            result['categories'][cid] = {'name': cats[cid]['name'], 'median': m, 'min': min(meds), 'target': target, 'pass': min(meds) >= target, 'critical': cats[cid]['critical']}
    hard = []
    for cname, c in critics.items():
        for view, fr in c.get('frames', {}).items():
            for e in fr.get('entries', []):
                if e.get('hardFailure'):
                    hard.append({'critic': cname, 'view': view, 'category': e.get('category'), 'cells': e.get('cells'), 'defect': e.get('defect')})
            for h in fr.get('hardArtifacts', []) or []:
                hard.append({'critic': cname, 'view': view, 'artifact': h})
    result['hardFailures'] = hard
    out_dir = os.path.join(ROOT, 'results', a.tag)
    json.dump(result, open(os.path.join(out_dir, 'scores.json'), 'w'), indent=1)
    # markdown
    lines = [f'# Scores — {a.tag}', '', f"Critics: {', '.join(critics)}. Median per criterion; spread > 2 flagged for disagreement review.", '']
    lines.append('## Category medians across frames')
    lines.append('')
    lines.append('| # | category | median | min | target | pass | Δ vs prev |')
    lines.append('|---|---|---|---|---|---|---|')
    for cid in sorted(result['categories'], key=int):
        c = result['categories'][cid]
        d = ''
        if prev and cid in prev.get('categories', {}):
            d = f"{c['median'] - prev['categories'][cid]['median']:+.1f}"
        lines.append(f"| {cid} | {c['name']}{' *' if c['critical'] else ''} | {c['median']:.1f} | {c['min']:.1f} | {c['target']} | {'yes' if c['pass'] else 'no'} | {d} |")
    lines.append('')
    lines.append('`*` critical category (target 9.0); others 8.5.')
    lines.append('')
    lines.append('## Per-frame medians')
    lines.append('')
    header = '| category | ' + ' | '.join(frames) + ' |'
    lines.append(header)
    lines.append('|---|' + '---|' * len(frames))
    for cid in sorted(cats, key=int):
        row = [f"{cid} {cats[cid]['name']}"]
        for view in frames:
            m = result['frames'][view]['median'].get(cid)
            sp = result['frames'][view]['spread'].get(cid, 0)
            row.append('' if m is None else (f'{m:.1f}' + ('!' if sp > 2 else '')))
        lines.append('| ' + ' | '.join(row) + ' |')
    lines.append('')
    lines.append(f"`!` = critic spread > 2 (disagreement review). {len(result['disagreements'])} disagreements, {len(hard)} hard-failure flags.")
    lines.append('')
    lines.append('## Lowest-scored defects per frame')
    lines.append('')
    for view in frames:
        lines.append(f'### {view}')
        for e in result['defects'][view][:8]:
            lines.append(f"- [{e['critic']}] cat {e['category']} = {e['score']} @ {e.get('cells')}: {e.get('defect')} → **fix:** {e.get('fix')}")
        lines.append('')
    open(os.path.join(out_dir, 'scores.md'), 'w').write('\n'.join(lines))
    print('\n'.join(lines[:45]))
    print(f"... written {out_dir}/scores.md ({len(result['disagreements'])} disagreements, {len(hard)} hard flags)")


if __name__ == '__main__':
    main()
