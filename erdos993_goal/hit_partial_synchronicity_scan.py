#!/usr/bin/env python3
"""Scan exact HIT rooted states for partial-synchronicity relations."""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

from hit_curvature_reserve_stress import (
    core_generator,
    make_hit,
    planted_state,
)
from toeplitz_pair_closure_search import add, is_log_concave, mixed_minor, mul, shift


def first_partial_failure(p: list[int], q: list[int]) -> dict | None:
    upper = max(len(p), len(q))
    for m in range(upper + 1):
        for n in range(m + 1):
            value = mixed_minor(p, q, m, n)
            if value < 0:
                return {"m": m, "n": n, "value": value}
    return None


def first_sync_failure(p: list[int], q: list[int]) -> dict | None:
    upper = max(len(p), len(q))
    for k in range(upper + 1):
        pk = p[k] if k < len(p) else 0
        qk = q[k] if k < len(q) else 0
        pm = p[k - 1] if 0 <= k - 1 < len(p) else 0
        pp = p[k + 1] if k + 1 < len(p) else 0
        qm = q[k - 1] if 0 <= k - 1 < len(q) else 0
        qp = q[k + 1] if k + 1 < len(q) else 0
        left = pm * qp
        right = pp * qm
        middle = pk * qk
        if left > middle or right > middle:
            return {
                "k": k,
                "left": left,
                "middle": middle,
                "right": right,
            }
    return None


def first_ratio_dominance_failure(
    lower: list[int], upper: list[int]
) -> dict | None:
    """Test lower[k+1]/lower[k] <= upper[k+1]/upper[k]."""
    top = max(len(lower), len(upper))
    for k in range(top):
        left = (
            lower[k + 1] if k + 1 < len(lower) else 0
        ) * (upper[k] if k < len(upper) else 0)
        right = (
            lower[k] if k < len(lower) else 0
        ) * (upper[k + 1] if k + 1 < len(upper) else 0)
        if left > right:
            return {"k": k, "left": left, "right": right}
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-core", type=int, default=12)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("hit_partial_synchronicity_scan.json"),
    )
    args = parser.parse_args()

    names = (
        "A_D",
        "B_D",
        "A_B",
        "K2A_xB",
        "A_B_sync",
        "AplusD_lc",
        "E_J",
        "E_J_sync",
        "U_V_sync",
        "B_ratio_below_A",
        "J_ratio_below_B",
        "D_ratio_below_A",
    )
    first = {name: None for name in names}
    totals = {"trees": 0, "states": 0, **{name: 0 for name in names}}

    for h in range(1, args.max_core + 1):
        for core_index, core in enumerate(core_generator(h)):
            graph, leaves = make_hit(core)
            totals["trees"] += 1
            memo = {}
            for vertex in graph:
                parents = list(graph[vertex])
                if vertex < h:
                    parents.append(None)
                for parent in parents:
                    state = planted_state(graph, vertex, parent, memo)
                    a = state.t
                    b = state.e
                    d = shift(state.j)
                    pairs = {
                        "A_D": (a, d),
                        "B_D": (b, d),
                        "A_B": (a, b),
                        "K2A_xB": (mul([1, 2, 1], a), shift(b)),
                        "E_J": (b, state.j),
                    }
                    totals["states"] += 1
                    for name, (p, q) in pairs.items():
                        failure = first_partial_failure(p, q)
                        if failure is None:
                            totals[name] += 1
                        elif first[name] is None:
                            first[name] = {
                                "core_order": h,
                                "core_index": core_index,
                                "leaf_counts": leaves,
                                "vertex": vertex,
                                "parent": parent,
                                "A": a,
                                "B": b,
                                "D": d,
                                **failure,
                            }
                    failure = first_sync_failure(a, b)
                    if failure is None:
                        totals["A_B_sync"] += 1
                    elif first["A_B_sync"] is None:
                        first["A_B_sync"] = {
                            "core_order": h,
                            "core_index": core_index,
                            "leaf_counts": leaves,
                            "vertex": vertex,
                            "parent": parent,
                            "A": a,
                            "B": b,
                            "D": d,
                            **failure,
                        }
                    v = add(a, d)
                    if is_log_concave(v):
                        totals["AplusD_lc"] += 1
                    elif first["AplusD_lc"] is None:
                        first["AplusD_lc"] = {
                            "core_order": h,
                            "core_index": core_index,
                            "leaf_counts": leaves,
                            "vertex": vertex,
                            "parent": parent,
                            "A": a,
                            "B": b,
                            "D": d,
                            "A_plus_D": v,
                        }
                    failure = first_sync_failure(b, v)
                    if failure is None:
                        totals["U_V_sync"] += 1
                    elif first["U_V_sync"] is None:
                        first["U_V_sync"] = {
                            "core_order": h,
                            "core_index": core_index,
                            "leaf_counts": leaves,
                            "vertex": vertex,
                            "parent": parent,
                            "U": b,
                            "V": v,
                            **failure,
                        }
                    failure = first_sync_failure(b, state.j)
                    if failure is None:
                        totals["E_J_sync"] += 1
                    elif first["E_J_sync"] is None:
                        first["E_J_sync"] = {
                            "core_order": h,
                            "core_index": core_index,
                            "leaf_counts": leaves,
                            "vertex": vertex,
                            "parent": parent,
                            "E": b,
                            "J": state.j,
                            **failure,
                        }
                    ratio_pairs = {
                        "B_ratio_below_A": (b, a),
                        "J_ratio_below_B": (state.j, b),
                        "D_ratio_below_A": (d, a),
                    }
                    for name, (lower, upper) in ratio_pairs.items():
                        failure = first_ratio_dominance_failure(
                            lower, upper
                        )
                        if failure is None:
                            totals[name] += 1
                        elif first[name] is None:
                            first[name] = {
                                "core_order": h,
                                "core_index": core_index,
                                "leaf_counts": leaves,
                                "vertex": vertex,
                                "parent": parent,
                                "A": a,
                                "B": b,
                                "J": state.j,
                                "D": d,
                                **failure,
                            }
        print(f"h={h} trees={totals['trees']} states={totals['states']}", flush=True)

    result = {
        "max_core": args.max_core,
        "totals": totals,
        "first_failures": first,
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
