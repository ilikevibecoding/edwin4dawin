#!/usr/bin/env python3
"""Decompose the pendant-hub child-weighted curvature reserve.

For an old rooted state A=B+D and a new hub with r leaf children,

    P = (1+x)^r A = P1+P2,
    P1=(1+x)^r B,  P2=(1+x)^r D,  Q=xB.

The new root has r+1 children and its CWF minor is

    H=(r-1)M_P+(r+1)B(P,Q).

We split H into the common-factor star reserve

    H1=(r-1)M_P1+(r+1)B(P1,Q)

and the remainder H2=H-H1.  H1 follows from a binomial-kernel lemma when
B is factorial-log-concave.  This scanner determines whether H2 is the
missing nonnegative old-state reserve.
"""

from __future__ import annotations

import argparse
import json
import time
from math import comb, factorial
from pathlib import Path

from hit_curvature_reserve_stress import (
    add,
    core_generator,
    make_hit,
    mul,
    planted_state,
)
from synthetic_child_weighted_closure_search import coeff, mixed_minor


def ft(p):
    return [factorial(k) * v for k, v in enumerate(p)]


def minor(p, m, n):
    return coeff(p, m) * coeff(p, n) - coeff(p, m + 1) * coeff(p, n - 1)


def check(state, r: int, prefix_only: bool) -> dict | None:
    b = state.e
    d = [0] + state.j
    kernel = [comb(r, k) for k in range(r + 1)]
    p1, p2 = mul(kernel, b), mul(kernel, d)
    p = add(p1, p2)
    q = [0] + b
    fp1, fp2, fp, fq = map(ft, (p1, p2, p, q))
    upper = max(len(fp), len(fq))
    if prefix_only:
        anew = add(p, q)
        upper = (2 * (len(anew) - 1) + 1) // 3 - 1
    for m in range(upper + 1):
        ns = (m,) if prefix_only else range(m + 1)
        for n in ns:
            total = (r - 1) * minor(fp, m, n)
            total += (r + 1) * mixed_minor(fp, fq, m, n)
            base = (r - 1) * minor(fp1, m, n)
            base += (r + 1) * mixed_minor(fp1, fq, m, n)
            remainder = total - base
            if base < 0 or remainder < 0 or total < 0:
                return {
                    "m": m,
                    "n": n,
                    "base": base,
                    "remainder": remainder,
                    "total": total,
                    "failed_parts": [
                        name
                        for name, value in (
                            ("base", base),
                            ("remainder", remainder),
                            ("total", total),
                        )
                        if value < 0
                    ],
                    "B": b,
                    "D": d,
                    "P1": p1,
                    "P2": p2,
                    "Q": q,
                }
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=10)
    parser.add_argument("--leaf-counts", default="2,3,4,5,8,12")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    rs = [int(x) for x in args.leaf_counts.split(",")]
    started = time.time()
    totals = {"trees": 0, "states": 0, "parameter_checks": 0}
    first_full = None
    first_prefix = None

    for h in range(1, args.max_core + 1):
        order_states = 0
        for core_index, core in enumerate(core_generator(h)):
            graph, padding = make_hit(core)
            totals["trees"] += 1
            memo = {}
            for vertex in graph:
                parents = list(graph[vertex])
                if vertex < h:
                    parents.append(None)
                for parent in parents:
                    state = planted_state(graph, vertex, parent, memo)
                    totals["states"] += 1
                    order_states += 1
                    for r in rs:
                        totals["parameter_checks"] += 1
                        full = check(state, r, prefix_only=False)
                        if full is not None and first_full is None:
                            first_full = {
                                "core_order": h,
                                "core_index": core_index,
                                "padding": padding,
                                "vertex": vertex,
                                "parent": parent,
                                "r": r,
                                **full,
                            }
                        prefix = check(state, r, prefix_only=True)
                        if prefix is not None:
                            first_prefix = {
                                "core_order": h,
                                "core_index": core_index,
                                "padding": padding,
                                "vertex": vertex,
                                "parent": parent,
                                "r": r,
                                **prefix,
                            }
                            break
                    if first_prefix is not None:
                        break
                if first_prefix is not None:
                    break
            if first_prefix is not None:
                break
        print(f"h={h}: states={order_states:,}", flush=True)
        if first_prefix is not None:
            break

    payload = {
        "status": "prefix_failure" if first_prefix else "no_prefix_failure",
        "parameters": {
            "max_core": args.max_core,
            "leaf_counts": rs,
            "out": str(args.out),
        },
        "totals": totals,
        "first_full_part_failure": first_full,
        "first_prefix_part_failure": first_prefix,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix else 0


if __name__ == "__main__":
    raise SystemExit(main())
