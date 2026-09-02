#!/usr/bin/env python3
"""Test a child-count weighted factorial curvature inequality on planted HITs.

For a planted state with r children, write U for the root-excluded polynomial
and D for the root-included polynomial.  Set u_k=k![x^k]U and
d_k=k![x^k]D, and define

    C_k = u_k^2-u_{k-1}u_{k+1},
    X_k = 2u_kd_k-u_{k-1}d_{k+1}-d_{k-1}u_{k+1}.

The exact candidate is

    (r-2) C_k + r X_k >= 0                         (CW)

for each nonleaf planted state (r>=2) of a homeomorphically irreducible
tree.  For r=2 this says X_k>=0.  For r>=3, (CW) implies
C_k+X_k>=0 whenever C_k>=0, hence the diagonal case of factorial
wide-minor dominance.  A root with r pendant leaves has equality at k=2,
so the child-count weights are sharp.

The exhaustive lane covers all minimally padded HITs formed from unlabeled
core trees.  The random lane adds arbitrary extra leaves.  All comparisons
are exact integer comparisons.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from math import factorial
from pathlib import Path

from hit_curvature_reserve_stress import (
    core_generator,
    make_hit,
    planted_state,
    random_core,
    tree_certificate,
)


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def factorial_transform(p: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(p)]


def shift(p: list[int]) -> list[int]:
    return [0] + p


def check_state(state) -> tuple[dict | None, dict]:
    r = state.children
    stats = {
        "states": 1,
        "ranks": 0,
        "equalities": 0,
        "negative_interactions": 0,
        "minimum_gap": None,
    }
    if r < 2:
        return None, stats
    u = factorial_transform(state.e)
    d = factorial_transform(shift(state.j))
    for k in range(1, max(len(u), len(d)) - 1):
        stats["ranks"] += 1
        um, uk, up = (coeff(u, k - 1), coeff(u, k), coeff(u, k + 1))
        dm, dk, dp = (coeff(d, k - 1), coeff(d, k), coeff(d, k + 1))
        curvature = uk * uk - um * up
        interaction = 2 * uk * dk - um * dp - dm * up
        gap = (r - 2) * curvature + r * interaction
        if interaction < 0:
            stats["negative_interactions"] += 1
        if gap == 0:
            stats["equalities"] += 1
        if stats["minimum_gap"] is None or gap < stats["minimum_gap"]:
            stats["minimum_gap"] = gap
        if gap < 0:
            return {
                "children": r,
                "rank": k,
                "u_window": [um, uk, up],
                "d_window": [dm, dk, dp],
                "curvature": curvature,
                "interaction": interaction,
                "weighted_gap": gap,
                "U": state.e,
                "J": state.j,
            }, stats
    return None, stats


def empty_totals() -> dict:
    return {
        "trees": 0,
        "states": 0,
        "ranks": 0,
        "equalities": 0,
        "negative_interactions": 0,
    }


def merge(target: dict, part: dict) -> None:
    for key in ("states", "ranks", "equalities", "negative_interactions"):
        target[key] += part[key]


def all_records(graph, core_order: int):
    memo = {}
    for vertex in graph:
        for parent in graph[vertex]:
            yield vertex, parent, planted_state(graph, vertex, parent, memo)
        if vertex < core_order:
            yield vertex, None, planted_state(graph, vertex, None, memo)


def exhaustive(max_core: int) -> tuple[dict, dict | None]:
    totals = empty_totals()
    per_order = []
    for h in range(1, max_core + 1):
        order = empty_totals()
        for core_index, core in enumerate(core_generator(h)):
            graph, leaf_counts = make_hit(core)
            order["trees"] += 1
            for vertex, parent, state in all_records(graph, h):
                failure, part = check_state(state)
                merge(order, part)
                if failure is not None:
                    totals["trees"] += order["trees"]
                    merge(totals, order)
                    return {
                        "totals": totals,
                        "per_core_order": per_order
                        + [{"core_order": h, **order}],
                    }, {
                        "lane": "exhaustive_minimal_hit",
                        "core_order": h,
                        "core_index": core_index,
                        "leaf_counts": leaf_counts,
                        "vertex": vertex,
                        "parent": parent,
                        "tree": tree_certificate(graph),
                        **failure,
                    }
        totals["trees"] += order["trees"]
        merge(totals, order)
        per_order.append({"core_order": h, **order})
        print(
            f"exact h={h}: trees={order['trees']:,}, "
            f"states={order['states']:,}, ranks={order['ranks']:,}, "
            f"equalities={order['equalities']:,}",
            flush=True,
        )
    return {"totals": totals, "per_core_order": per_order}, None


def random_lane(
    trials: int,
    max_core: int,
    max_extra: int,
    seed: int,
) -> tuple[dict, dict | None]:
    rng = random.Random(seed)
    totals = empty_totals()
    for trial in range(trials):
        h = rng.randint(1, max_core)
        core = random_core(rng, h)
        extras = [rng.randint(0, max_extra) for _ in range(h)]
        graph, leaf_counts = make_hit(core, extras)
        totals["trees"] += 1
        vertex = rng.randrange(h)
        parent = rng.choice([None, *graph[vertex]])
        state = planted_state(graph, vertex, parent, {})
        failure, part = check_state(state)
        merge(totals, part)
        if failure is not None:
            return totals, {
                "lane": "random_arbitrarily_padded_hit",
                "trial": trial,
                "seed": seed,
                "core_order": h,
                "extra_leaves": extras,
                "leaf_counts": leaf_counts,
                "vertex": vertex,
                "parent": parent,
                "tree": tree_certificate(graph),
                **failure,
            }
        if (trial + 1) % 1000 == 0:
            print(
                f"random {trial + 1:,}/{trials:,}: "
                f"states={totals['states']:,}, ranks={totals['ranks']:,}",
                flush=True,
            )
    return totals, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=14)
    parser.add_argument("--random", type=int, default=0)
    parser.add_argument("--random-max-core", type=int, default=60)
    parser.add_argument("--max-extra-leaves", type=int, default=8)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    exact, failure = exhaustive(args.max_core)
    random_result = None
    if failure is None and args.random:
        random_result, failure = random_lane(
            args.random,
            args.random_max_core,
            args.max_extra_leaves,
            args.seed,
        )

    report = {
        "claim_tested": (
            "Every tested nonleaf planted HIT state with r children satisfies "
            "(r-2)C_k+rX_k >= 0 at every rank."
        ),
        "sharpness": (
            "The r-leaf star has equality at rank 2 for every r>=3."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "exact_integer_arithmetic": True,
        "exhaustive_minimal_hit": exact,
        "random_arbitrary_padding": random_result,
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
                "exact_totals": exact["totals"],
                "random_totals": random_result,
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
