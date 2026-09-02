#!/usr/bin/env python3
"""Test the factorial cross-pair needed for pendant-hub CWF closure.

For an old rooted state let B be the root-excluded polynomial, D the
root-included contribution, and V=B+2D.  Attaching a new hub with r leaf
children reduces the new child-weighted invariant to the candidate

    F((1+x)^r V)  ~_p  F(xB),                 (PC)

where F multiplies the coefficient of x^k by k! and ~_p is partial
synchronization.  This script checks (PC) exactly on the complete minimal
HIT census and several values of r.
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


def transform(p: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(p)]


def failure(p: list[int], q: list[int]) -> dict | None:
    fp, fq = transform(p), transform(q)
    upper = max(len(fp), len(fq))
    for m in range(upper + 1):
        for n in range(m + 1):
            value = mixed_minor(fp, fq, m, n)
            if value < 0:
                return {"m": m, "n": n, "value": value}
    return None


def prefix_diagonal_failure(
    p: list[int], q: list[int], alpha_new: int
) -> dict | None:
    fp, fq = transform(p), transform(q)
    cutoff = (2 * alpha_new + 1) // 3
    for rank in range(cutoff):
        value = mixed_minor(fp, fq, rank, rank)
        if value < 0:
            return {
                "rank": rank,
                "cutoff": cutoff,
                "value": value,
            }
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=12)
    parser.add_argument("--leaf-counts", default="2,3,4,5,8,12")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    leaf_counts_to_test = [int(x) for x in args.leaf_counts.split(",")]
    started = time.time()
    totals = {"trees": 0, "states": 0, "pair_checks": 0, "minor_checks": 0}
    first = None
    first_prefix = None
    per_order = []

    for h in range(1, args.max_core + 1):
        order = {"core_order": h, "trees": 0, "states": 0, "pair_checks": 0}
        for core_index, core in enumerate(core_generator(h)):
            graph, padding = make_hit(core)
            totals["trees"] += 1
            order["trees"] += 1
            memo = {}
            for vertex in graph:
                parents = list(graph[vertex])
                if vertex < h:
                    parents.append(None)
                for parent in parents:
                    state = planted_state(graph, vertex, parent, memo)
                    b = state.e
                    d = [0] + state.j
                    v = add(b, [2 * x for x in d])
                    totals["states"] += 1
                    order["states"] += 1
                    for r in leaf_counts_to_test:
                        k = [comb(r, j) for j in range(r + 1)]
                        left = mul(k, v)
                        right = [0] + b
                        anew = add(mul(k, state.t), right)
                        totals["pair_checks"] += 1
                        order["pair_checks"] += 1
                        upper = max(len(left), len(right))
                        totals["minor_checks"] += (
                            (upper + 1) * (upper + 2) // 2
                        )
                        found = failure(left, right)
                        if found is not None and first is None:
                            first = {
                                "core_order": h,
                                "core_index": core_index,
                                "leaf_padding": padding,
                                "vertex": vertex,
                                "parent": parent,
                                "r": r,
                                "B": b,
                                "D": d,
                                "V": v,
                                "K_times_V": left,
                                "xB": right,
                                **found,
                            }
                        prefix_found = prefix_diagonal_failure(
                            left, right, len(anew) - 1
                        )
                        if prefix_found is not None:
                            first_prefix = {
                                "core_order": h,
                                "core_index": core_index,
                                "leaf_padding": padding,
                                "vertex": vertex,
                                "parent": parent,
                                "r": r,
                                "alpha_new": len(anew) - 1,
                                "B": b,
                                "D": d,
                                "V": v,
                                "K_times_V": left,
                                "xB": right,
                                **prefix_found,
                            }
                            break
                    if first_prefix is not None:
                        break
                if first_prefix is not None:
                    break
            if first_prefix is not None:
                break
        per_order.append(order)
        print(
            f"h={h}: trees={order['trees']:,} states={order['states']:,} "
            f"pairs={order['pair_checks']:,}",
            flush=True,
        )
        if first_prefix is not None:
            break

    payload = {
        "status": (
            "prefix_counterexample" if first_prefix else "no_prefix_failure"
        ),
        "parameters": {
            "max_core": args.max_core,
            "leaf_counts": leaf_counts_to_test,
            "out": str(args.out),
        },
        "totals": totals,
        "per_order": per_order,
        "first_failure": first,
        "first_prefix_diagonal_failure": first_prefix,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix else 0


if __name__ == "__main__":
    raise SystemExit(main())
