"""Exhaustive exact verification over ALL unlabeled forests on n vertices.

For every n <= NMAX every non-isomorphic forest is enumerated exactly once as a
multiset of non-isomorphic trees (the count is asserted against the Euler
transform of Otter's formula), its independence polynomial is computed with
exact integers, and the following are checked:

  unimodality, log-concavity, ISO_r (all r and the prefix 2<=r<=L-1),
  weakened Newton NW_r, WR_r on the prefix, the decreasing tail r >= L,
  and the data-level descent-lemma implication.

Usage:  python3 run_forests.py NMAX [--nmin N0] [--procs P] [--out DIR]
"""

from __future__ import annotations

import argparse
import json
import os
import time
from array import array
from multiprocessing import Pool
from typing import Dict, List, Tuple

from aggregate import Aggregate
from checks import analyze, descent_lemma_holds
from counts import forest_counts, free_tree_counts
from indpoly import poly_mul, tree_independence_polynomial
from treegen import level_sequence_to_parents, wrom_level_sequences

# Flat packed tables (few large objects => no copy-on-write blow-up in workers).
TREES_LS: Dict[int, bytes] = {}          # size s -> concatenated level sequences (stride s)
TREES_PO: Dict[int, array] = {}          # size s -> packed coefficients, stride s+1 (uint32, zero padded)
NTREES: Dict[int, int] = {}
KEEP_COEFFS_UPTO = 14


def build_trees(nmax: int) -> None:
    t = free_tree_counts(nmax)
    for s in range(1, nmax + 1):
        ls_buf = bytearray()
        po_buf = array("I")
        stride = s + 1
        cnt = 0
        for ls in wrom_level_sequences(s):
            poly = tree_independence_polynomial(level_sequence_to_parents(ls))
            assert len(poly) <= stride and max(poly) < (1 << 32)
            ls_buf += bytes(ls)
            po_buf.extend(poly)
            po_buf.extend([0] * (stride - len(poly)))
            cnt += 1
        assert cnt == t[s], f"tree count mismatch at {s}: {cnt} vs {t[s]}"
        TREES_LS[s] = bytes(ls_buf)
        TREES_PO[s] = po_buf
        NTREES[s] = cnt


def tree_poly(s: int, i: int) -> List[int]:
    stride = s + 1
    coeffs = TREES_PO[s][i * stride:(i + 1) * stride].tolist()
    while coeffs[-1] == 0:
        coeffs.pop()
    return coeffs


def tree_level_sequence(s: int, i: int) -> List[int]:
    return list(TREES_LS[s][i * s:(i + 1) * s])


def _rec(remaining: int, max_size: int, max_idx: int, poly: List[int], comps: List[Tuple[int, int]], agg: Aggregate) -> None:
    if remaining == 0:
        coeffs = tuple(poly)
        rep = analyze(coeffs)
        agg.add(rep, coeffs, tuple(comps), descent_lemma_holds(coeffs))
        return
    for s in range(min(remaining, max_size), 0, -1):
        top = max_idx if s == max_size else NTREES[s] - 1
        for i in range(top, -1, -1):
            comps.append((s, i))
            _rec(remaining - s, s, i, poly_mul(poly, tree_poly(s, i)), comps, agg)
            comps.pop()


def work(task: Tuple[int, int, int, int]) -> Aggregate:
    n, s, i_lo, i_hi = task
    agg = Aggregate(keep_coeffs=(n <= KEEP_COEFFS_UPTO))
    for i in range(i_lo, i_hi):
        _rec(n - s, s, i, tree_poly(s, i), [(s, i)], agg)
    return agg


def tasks_for(n: int, chunk: int) -> List[Tuple[int, int, int, int]]:
    out = []
    for s in range(n, 0, -1):
        m = NTREES[s]
        for lo in range(0, m, chunk):
            out.append((n, s, lo, min(m, lo + chunk)))
    return out


def resolve_label(label) -> List[List[int]]:
    return [tree_level_sequence(s, i) for s, i in label]


def resolve_all(obj):
    """Recursively replace argmin/forest labels (tuples of (size,idx)) by level sequences."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("argmin", "forest") and isinstance(v, (list, tuple)):
                out[k] = {"component_level_sequences": resolve_label(v), "component_orders": [s for s, _ in v]}
            else:
                out[k] = resolve_all(v)
        return out
    if isinstance(obj, list):
        return [resolve_all(v) for v in obj]
    return obj


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("nmax", type=int)
    ap.add_argument("--nmin", type=int, default=0)
    ap.add_argument("--procs", type=int, default=os.cpu_count() or 1)
    ap.add_argument("--chunk", type=int, default=4000)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    t0 = time.time()
    build_trees(args.nmax)
    print(f"built {sum(NTREES.values())} trees up to n={args.nmax} in {time.time()-t0:.1f}s", flush=True)
    fcounts = forest_counts(args.nmax)

    tcounts = free_tree_counts(args.nmax)
    summary = []
    with Pool(args.procs) as pool:
        for n in range(args.nmin, args.nmax + 1):
            t1 = time.time()
            agg = Aggregate(keep_coeffs=(n <= KEEP_COEFFS_UPTO))
            agg_trees = Aggregate(keep_coeffs=(n <= KEEP_COEFFS_UPTO))  # single-component forests only
            if n == 0:
                coeffs = (1,)
                agg.add(analyze(coeffs), coeffs, tuple(), descent_lemma_holds(coeffs))
            else:
                tasks = tasks_for(n, args.chunk)
                for task, part in zip(tasks, pool.imap(work, tasks)):
                    agg.merge(part)
                    if task[1] == n:
                        agg_trees.merge(part)
            assert agg.c["count"] == fcounts[n], f"forest count mismatch at n={n}: {agg.c['count']} vs {fcounts[n]}"
            rep = resolve_all(agg.to_json(n))
            rep["forest_count_formula_A005195"] = fcounts[n]
            rep["count_check"] = "PASS"
            rep["seconds"] = round(time.time() - t1, 2)
            with open(os.path.join(args.out, f"forests_n{n:02d}.json"), "w") as fh:
                json.dump(rep, fh, indent=1, sort_keys=True)
            if n >= 1:
                assert agg_trees.c["count"] == tcounts[n], f"tree count mismatch at n={n}"
                trep = resolve_all(agg_trees.to_json(n))
                trep["tree_count_formula_A000055"] = tcounts[n]
                trep["count_check"] = "PASS"
                with open(os.path.join(args.out, f"trees_n{n:02d}.json"), "w") as fh:
                    json.dump(trep, fh, indent=1, sort_keys=True)
            line = {k: rep[k] for k in ("n", "count", "all_unimodal", "all_log_concave", "all_iso", "all_iso_prefix", "all_wr_prefix", "all_tail", "seconds")}
            line["iso_min_prefix_ratio"] = (rep["iso_min_prefix_2<=r<=L-1"] or {}).get("ratio_float")
            line["iso_min_all_ratio"] = (rep["iso_min_all_r"] or {}).get("ratio_float")
            line["nw_all_count"] = rep["nw_all"]
            summary.append(line)
            print(json.dumps(line), flush=True)
    with open(os.path.join(args.out, "forests_summary.json"), "w") as fh:
        json.dump({"nmax": args.nmax, "nmin": args.nmin, "rows": summary, "total_seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
