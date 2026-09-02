#!/usr/bin/env python3
"""Exact off-diagonal scan of the child-weighted factorial HIT invariant.

For a planted rooted HIT state with r children, let U be the root-excluded
polynomial and D the root-included contribution.  Write

    u_k = k! [x^k] U,       d_k = k! [x^k] D.

For m >= n define

    M_u(m,n) = u_m u_n - u_{m+1} u_{n-1},

    X_{u,d}(m,n)
      = u_m d_n + d_m u_n
        - u_{m+1} d_{n-1} - d_{m+1} u_{n-1}.

The candidate tested here is

    (r-2) M_u(m,n) + r X_{u,d}(m,n) >= 0.          (CWF)

At m=n this is exactly the child-weighted curvature inequality tested in
hit_child_weighted_curvature_scan.py.  The exhaustive lane covers every
planted orientation of every minimally leaf-padded HIT whose internal core
has at most max_core vertices.  The random lane uses arbitrary extra leaf
padding.  All comparisons are exact Python integer comparisons.

Passing is evidence, not a proof.
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


def check_state(state) -> tuple[dict | None, dict]:
    r = state.children
    stats = {
        "states": 1,
        "minor_checks": 0,
        "diagonal_checks": 0,
        "equalities": 0,
        "negative_interactions": 0,
    }
    if r < 2:
        return None, stats

    u = factorial_transform(state.e)
    d = factorial_transform([0] + state.j)
    upper = max(len(u), len(d))

    for m in range(upper + 1):
        um = coeff(u, m)
        up = coeff(u, m + 1)
        dm = coeff(d, m)
        dp = coeff(d, m + 1)
        for n in range(m + 1):
            stats["minor_checks"] += 1
            if m == n:
                stats["diagonal_checks"] += 1
            un = coeff(u, n)
            ub = coeff(u, n - 1)
            dn = coeff(d, n)
            db = coeff(d, n - 1)
            minor_u = um * un - up * ub
            interaction = um * dn + dm * un - up * db - dp * ub
            gap = (r - 2) * minor_u + r * interaction
            if interaction < 0:
                stats["negative_interactions"] += 1
            if gap == 0:
                stats["equalities"] += 1
            if gap < 0:
                return {
                    "children": r,
                    "m": m,
                    "n": n,
                    "u_entries": {
                        "u_m": um,
                        "u_n": un,
                        "u_m_plus_1": up,
                        "u_n_minus_1": ub,
                    },
                    "d_entries": {
                        "d_m": dm,
                        "d_n": dn,
                        "d_m_plus_1": dp,
                        "d_n_minus_1": db,
                    },
                    "minor_u": minor_u,
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
        "minor_checks": 0,
        "diagonal_checks": 0,
        "equalities": 0,
        "negative_interactions": 0,
    }


def merge(target: dict, part: dict) -> None:
    for key in (
        "states",
        "minor_checks",
        "diagonal_checks",
        "equalities",
        "negative_interactions",
    ):
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
            f"states={order['states']:,}, minors={order['minor_checks']:,}, "
            f"negative interactions={order['negative_interactions']:,}",
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
                f"minors={totals['minor_checks']:,}",
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
            "Every tested nonleaf planted HIT state with r children "
            "satisfies (r-2)M_U(m,n)+rX_UD(m,n)>=0 for every m>=n "
            "after factorial transformation."
        ),
        "scope": (
            "Exhaustive only for minimally leaf-padded HITs through the "
            "requested core order; optional random arbitrary leaf padding."
        ),
        "exact_integer_arithmetic": True,
        "parameters": vars(args) | {"output": str(args.output)},
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
