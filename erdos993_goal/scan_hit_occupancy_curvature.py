#!/usr/bin/env python3
"""Exact extremal scan for the diagonal factorial HIT reserve.

For a planted state let U be the root-excluded polynomial, D the
root-included polynomial, and put u_k=k![x^k]U, d_k=k![x^k]D.  The diagonal
case of factorial wide-minor dominance is

    R_k = u_k^2 + 2u_k d_k
          - u_{k-1}u_{k+1} - u_{k-1}d_{k+1} - d_{k-1}u_{k+1} >= 0.

Write R_k=C_k+X_k, where C_k is the log-concavity curvature of u and X_k
is the mixed root-occupancy interaction.  When X_k<0, the key question is
how tightly C_k pays the demand -X_k.  This script enumerates exact planted
states of minimally padded homeomorphically irreducible trees and records the
smallest ratios C_k/(-X_k), plus exact extremal certificates.

All decisions use Python integers.  Floating-point values are display only.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from math import factorial
from pathlib import Path

from hit_curvature_reserve_stress import (
    core_generator,
    make_hit,
    planted_state,
    tree_certificate,
)


def coefficient(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def factorial_transform(p: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(p)]


def shift(p: list[int]) -> list[int]:
    return [0] + p


def certificate(
    graph,
    core_order: int,
    core_index: int,
    leaf_counts: list[int],
    vertex: int,
    parent: int | None,
    children: int,
    k: int,
    u: list[int],
    d: list[int],
    curvature: int,
    interaction: int,
) -> dict:
    demand = -interaction
    reserve = curvature + interaction
    return {
        "core_order": core_order,
        "core_index": core_index,
        "leaf_counts": leaf_counts,
        "vertex": vertex,
        "parent": parent,
        "children": children,
        "rank": k,
        "u_window": [coefficient(u, k + delta) for delta in (-1, 0, 1)],
        "d_window": [coefficient(d, k + delta) for delta in (-1, 0, 1)],
        "curvature": curvature,
        "negative_interaction_demand": demand,
        "reserve": reserve,
        "ratio_numerator": curvature,
        "ratio_denominator": demand,
        "ratio_float": float(Fraction(curvature, demand)),
        "tree": tree_certificate(graph),
    }


def update_best(best: list[dict], item: dict, limit: int) -> None:
    best.append(item)
    best.sort(
        key=lambda x: Fraction(
            x["ratio_numerator"], x["ratio_denominator"]
        )
    )
    del best[limit:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=14)
    parser.add_argument("--keep", type=int, default=30)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "states": 0,
        "ranks": 0,
        "negative_interaction_ranks": 0,
        "zero_reserves": 0,
    }
    by_children: dict[str, dict] = {}
    best: list[dict] = []
    failure = None

    for h in range(1, args.max_core + 1):
        order_trees = 0
        order_states = 0
        for core_index, core in enumerate(core_generator(h)):
            graph, leaf_counts = make_hit(core)
            order_trees += 1
            totals["trees"] += 1
            memo = {}
            records = []
            for vertex in graph:
                for parent in graph[vertex]:
                    records.append((vertex, parent))
                if vertex < h:
                    records.append((vertex, None))

            for vertex, parent in records:
                state = planted_state(graph, vertex, parent, memo)
                order_states += 1
                totals["states"] += 1
                u = factorial_transform(state.e)
                d = factorial_transform(shift(state.j))
                child_key = str(state.children)
                bucket = by_children.setdefault(
                    child_key,
                    {
                        "states": 0,
                        "ranks": 0,
                        "negative_interaction_ranks": 0,
                        "minimum_ratio": None,
                        "minimum_reserve": None,
                    },
                )
                bucket["states"] += 1

                for k in range(1, max(len(u), len(d)) - 1):
                    totals["ranks"] += 1
                    bucket["ranks"] += 1
                    um, uk, up = (
                        coefficient(u, k - 1),
                        coefficient(u, k),
                        coefficient(u, k + 1),
                    )
                    dm, dk, dp = (
                        coefficient(d, k - 1),
                        coefficient(d, k),
                        coefficient(d, k + 1),
                    )
                    curvature = uk * uk - um * up
                    interaction = 2 * uk * dk - um * dp - dm * up
                    reserve = curvature + interaction

                    old_min = bucket["minimum_reserve"]
                    if old_min is None or reserve < old_min:
                        bucket["minimum_reserve"] = reserve
                    if reserve == 0:
                        totals["zero_reserves"] += 1
                    if reserve < 0:
                        failure = certificate(
                            graph,
                            h,
                            core_index,
                            leaf_counts,
                            vertex,
                            parent,
                            state.children,
                            k,
                            u,
                            d,
                            curvature,
                            interaction,
                        )
                        break

                    if interaction < 0:
                        totals["negative_interaction_ranks"] += 1
                        bucket["negative_interaction_ranks"] += 1
                        demand = -interaction
                        ratio = Fraction(curvature, demand)
                        old_ratio = bucket["minimum_ratio"]
                        if (
                            old_ratio is None
                            or ratio
                            < Fraction(
                                old_ratio["numerator"],
                                old_ratio["denominator"],
                            )
                        ):
                            bucket["minimum_ratio"] = {
                                "numerator": curvature,
                                "denominator": demand,
                                "float": float(ratio),
                                "core_order": h,
                                "core_index": core_index,
                                "vertex": vertex,
                                "parent": parent,
                                "children": state.children,
                                "rank": k,
                            }
                        update_best(
                            best,
                            certificate(
                                graph,
                                h,
                                core_index,
                                leaf_counts,
                                vertex,
                                parent,
                                state.children,
                                k,
                                u,
                                d,
                                curvature,
                                interaction,
                            ),
                            args.keep,
                        )
                if failure is not None:
                    break
            if failure is not None:
                break
        print(
            f"h={h}: trees={order_trees:,}, states={order_states:,}, "
            f"negative interactions={totals['negative_interaction_ranks']:,}",
            flush=True,
        )
        if failure is not None:
            break

    report = {
        "claim_tested": (
            "For each planted state of each minimally padded HIT in scope, "
            "the factorial curvature of U pays every negative diagonal "
            "root-occupancy interaction."
        ),
        "parameters": {
            "max_core": args.max_core,
            "keep": args.keep,
            "output": str(args.output),
        },
        "exact_integer_arithmetic": True,
        "totals": totals,
        "by_child_count": by_children,
        "closest_curvature_to_demand_ratios": best,
        "failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "totals": totals,
                "minimum_ratio": best[0] if best else None,
                "failure": failure,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
