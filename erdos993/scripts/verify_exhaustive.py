#!/usr/bin/env python3
"""Exhaustive exact verification of WR / ISO / TAIL / unimodality / log-concavity
over every non-isomorphic tree of order <= --trees-max and every non-isomorphic
forest of order <= --forests-max.

Usage:
    python scripts/verify_exhaustive.py --trees-max 21 --forests-max 20 \
        --out reports/exhaustive_trees_forests.json

Progress lines are printed per order.  The JSON report contains per-order
statistics, all failures (there should be none), the extremal witnesses for the
ISO margin and the WR ratio, the OEIS count cross-check, and SHA-256
provenance of this script.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.indpoly import indpoly_parent_array  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.scan import ScanStats  # noqa: E402
from erdos993lib.trees import A000055, A005195, forest_polys, free_tree_layouts, layout_to_parent, tree_polys  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trees-min", type=int, default=1)
    ap.add_argument("--trees-max", type=int, default=18)
    ap.add_argument("--forests-min", type=int, default=1)
    ap.add_argument("--forests-max", type=int, default=16)
    ap.add_argument("--out", default="reports/exhaustive_trees_forests.json")
    args = ap.parse_args()

    per_order_trees = {}
    per_order_forests = {}
    overall_trees = ScanStats()
    overall_forests = ScanStats()
    count_check = {"trees": {}, "forests": {}}

    for n in range(args.trees_min, args.trees_max + 1):
        t0 = time.time()
        st = ScanStats()
        for layout in free_tree_layouts(n):
            p = indpoly_parent_array(layout_to_parent(layout))
            st.add(p, {"n": n, "level_sequence": layout})
            overall_trees.add(p, {"n": n, "level_sequence": layout})
        ok = st.count == A000055[n] if n < len(A000055) else None
        count_check["trees"][n] = {"count": st.count, "oeis_A000055": A000055[n] if n < len(A000055) else None, "match": ok}
        per_order_trees[n] = st.summary()
        s = per_order_trees[n]
        print(
            f"trees n={n:2d} count={st.count:>10d} oeis_ok={ok} nonunimodal={s['not_unimodal_count']} "
            f"lcfail={s['log_concavity_failures_count']} wrfail={s['wr_prefix_failures_count']} "
            f"isofail={s['iso_prefix_failures_count']} tailfail={s['tail_failures_count']} "
            f"min_iso_margin={s['min_iso_margin_prefix']['float'] if s['min_iso_margin_prefix'] else None} "
            f"max_wr_ratio={s['max_wr_ratio_prefix']['float'] if s['max_wr_ratio_prefix'] else None} "
            f"({time.time() - t0:.1f}s)",
            flush=True,
        )
        if ok is False:
            print("COUNT MISMATCH", file=sys.stderr)
            return 2

    cache = {}
    for n in range(args.forests_min, args.forests_max + 1):
        t0 = time.time()
        st = ScanStats()
        for sizes, idxs, p in forest_polys(n, cache):
            w = {"n": n, "component_orders": list(sizes), "tree_indices": list(idxs)}
            st.add(p, w)
            overall_forests.add(p, w)
        ok = st.count == A005195[n] if n < len(A005195) else None
        count_check["forests"][n] = {"count": st.count, "oeis_A005195": A005195[n] if n < len(A005195) else None, "match": ok}
        per_order_forests[n] = st.summary()
        s = per_order_forests[n]
        print(
            f"forests n={n:2d} count={st.count:>10d} oeis_ok={ok} nonunimodal={s['not_unimodal_count']} "
            f"lcfail={s['log_concavity_failures_count']} wrfail={s['wr_prefix_failures_count']} "
            f"isofail={s['iso_prefix_failures_count']} tailfail={s['tail_failures_count']} "
            f"min_iso_margin={s['min_iso_margin_prefix']['float'] if s['min_iso_margin_prefix'] else None} "
            f"max_wr_ratio={s['max_wr_ratio_prefix']['float'] if s['max_wr_ratio_prefix'] else None} "
            f"({time.time() - t0:.1f}s)",
            flush=True,
        )
        if ok is False:
            print("COUNT MISMATCH", file=sys.stderr)
            return 2

    ot = overall_trees.summary()
    of = overall_forests.summary()
    verdict = {
        "all_trees_unimodal": ot["not_unimodal_count"] == 0,
        "all_forests_unimodal": of["not_unimodal_count"] == 0,
        "wr_prefix_holds_all": ot["wr_prefix_failures_count"] == 0 and of["wr_prefix_failures_count"] == 0,
        "iso_prefix_holds_all": ot["iso_prefix_failures_count"] == 0 and of["iso_prefix_failures_count"] == 0,
        "tail_theorem_holds_all": ot["tail_failures_count"] == 0 and of["tail_failures_count"] == 0,
        "iso_holds_at_every_index_all": ot["iso_any_index_failures_count"] == 0 and of["iso_any_index_failures_count"] == 0,
    }
    payload = {
        "title": "Exhaustive exact WR/ISO/TAIL/unimodality scan over all non-isomorphic trees and forests",
        "scope": {
            "trees_orders": [args.trees_min, args.trees_max],
            "forests_orders": [args.forests_min, args.forests_max],
        },
        "definitions": {
            "L": "ceil((2*alpha-1)/3)",
            "WR_r": "p[r-1] <= r*p[r] for 1 <= r <= L-1",
            "ISO_r": "r*p[r]^2 + p[r-1]^2 - (r+1)*p[r-1]*p[r+1] >= 0 for 1 <= r <= min(L-1, alpha-1)",
            "TAIL": "p[r] >= p[r+1] for L <= r <= alpha-1",
            "iso_margin": "Q_r / (p[r-1]*p[r])",
            "wr_ratio": "p[r-1] / (r*p[r])",
        },
        "verdict": verdict,
        "count_check": count_check,
        "overall_trees": ot,
        "overall_forests": of,
        "per_order_trees": per_order_trees,
        "per_order_forests": per_order_forests,
        "caveat": "Finite enumeration is falsification evidence only; it proves nothing about larger orders.",
        "provenance": provenance(os.path.abspath(__file__)),
    }
    digest = write_report(args.out, payload)
    print("verdict:", verdict)
    print("report:", args.out, "SHA256", digest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
