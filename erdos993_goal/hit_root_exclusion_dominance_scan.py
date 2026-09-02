#!/usr/bin/env python3
"""Scan root-excluded versus root-included coefficients on exact HIT states.

For a planted root with r>=2 children, U counts independent sets excluding
the root and D counts those including it.  The candidate local fact is

    [x^k]D <= [x^k]U

through the unimodality-relevant prefix k<L(A), even though it can fail at
the top when including the root raises the maximum independent-set size.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from hit_curvature_reserve_stress import (
    core_generator,
    make_hit,
    planted_state,
)


def coeff(p, k):
    return p[k] if 0 <= k < len(p) else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=14)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()
    totals = {
        "trees": 0,
        "states": 0,
        "branched_states": 0,
        "coefficient_checks": 0,
        "full_failures": 0,
        "prefix_failures": 0,
    }
    first_full = None
    first_prefix = None
    per_order = []
    for h in range(1, args.max_core + 1):
        row = {"core_order": h, "trees": 0, "branched_states": 0}
        for core_index, core in enumerate(core_generator(h)):
            graph, padding = make_hit(core)
            totals["trees"] += 1
            row["trees"] += 1
            memo = {}
            for vertex in graph:
                parents = list(graph[vertex])
                if vertex < h:
                    parents.append(None)
                for parent in parents:
                    state = planted_state(graph, vertex, parent, memo)
                    totals["states"] += 1
                    if state.children < 2:
                        continue
                    totals["branched_states"] += 1
                    row["branched_states"] += 1
                    d = [0] + state.j
                    alpha = len(state.t) - 1
                    cutoff = (2 * alpha + 1) // 3
                    failed_full_here = False
                    for k in range(max(len(state.e), len(d))):
                        totals["coefficient_checks"] += 1
                        gap = coeff(state.e, k) - coeff(d, k)
                        if gap < 0:
                            if not failed_full_here:
                                totals["full_failures"] += 1
                                failed_full_here = True
                            witness = {
                                "core_order": h,
                                "core_index": core_index,
                                "padding": padding,
                                "vertex": vertex,
                                "parent": parent,
                                "children": state.children,
                                "alpha": alpha,
                                "cutoff": cutoff,
                                "k": k,
                                "gap": gap,
                                "U": state.e,
                                "D": d,
                            }
                            if first_full is None:
                                first_full = witness
                            if k < cutoff:
                                totals["prefix_failures"] += 1
                                if first_prefix is None:
                                    first_prefix = witness
                                break
        per_order.append(row)
        print(
            f"h={h}: trees={row['trees']:,} "
            f"branched={row['branched_states']:,}",
            flush=True,
        )
        if first_prefix is not None:
            break
    payload = {
        "status": "prefix_failure" if first_prefix else "no_prefix_failure",
        "parameters": vars(args) | {"out": str(args.out)},
        "totals": totals,
        "per_order": per_order,
        "first_full_failure": first_full,
        "first_prefix_failure": first_prefix,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix else 0


if __name__ == "__main__":
    raise SystemExit(main())
