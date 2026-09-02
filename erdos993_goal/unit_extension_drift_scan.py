#!/usr/bin/env python3
"""Exact scan of a one-unit extension-drift inequality for trees.

Let i_k be the number of independent k-sets and

    e_k = (k+1) i_{k+1}/i_k

the average number of extensions of a uniform independent k-set.  Ordered
log-concavity is equivalent to e_k <= e_{k-1}; this is false for trees.
The weaker inequality

    e_k <= e_{k-1}+1                                      (UD)

is nevertheless sufficient for unimodality: if i_k <= i_{k-1}, then
e_{k-1} <= k, so (UD) gives e_k <= k+1 and hence i_{k+1} <= i_k.

The exact coefficient form checked here is

    k i_k^2 + i_{k-1}i_k >= (k+1)i_{k-1}i_{k+1}.

Equivalently, for a uniform independent (k-1)-set S, if E(S) is the
number of undominated vertices and Q(S) is the number of residual edges,
(UD) says

    Var(E) <= 2 E[E] + 2 E[Q].

All decisions use integer arithmetic.  The exhaustive lane enumerates every
unlabeled tree through the requested order.  The random lane samples labelled
trees from Prufer codes.  Passing is evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx

from hit_curvature_reserve_stress import (
    core_generator,
    planted_state,
    tree_certificate,
)


def first_descent(p: list[int]) -> int | None:
    for k in range(1, len(p)):
        if p[k] < p[k - 1]:
            return k - 1
    return None


def first_reascent(p: list[int]) -> int | None:
    descent = first_descent(p)
    if descent is None:
        return None
    for k in range(descent + 1, len(p) - 1):
        if p[k + 1] > p[k]:
            return k
    return None


def scan_polynomial(p: list[int]) -> tuple[dict | None, dict | None, int]:
    """Return (failure, closest record, checks)."""
    closest = None
    checks = 0
    for k in range(1, len(p) - 1):
        checks += 1
        gap = (
            k * p[k] * p[k]
            + p[k - 1] * p[k]
            - (k + 1) * p[k - 1] * p[k + 1]
        )
        denominator = p[k - 1] * p[k]
        record = {
            "rank": k,
            "gap": gap,
            "denominator": denominator,
            "normalized_margin_numerator": gap,
            "normalized_margin_denominator": denominator,
            "normalized_margin_float": float(Fraction(gap, denominator)),
            "extension_drift_float": float(
                Fraction(denominator - gap, denominator)
            ),
            "coefficient_window": [p[k - 1], p[k], p[k + 1]],
        }
        if closest is None or (
            gap * closest["denominator"]
            < closest["gap"] * denominator
        ):
            closest = record
        if gap < 0:
            return record, closest, checks
    return None, closest, checks


def better(candidate: dict | None, incumbent: dict | None) -> bool:
    if candidate is None:
        return False
    if incumbent is None:
        return True
    return (
        candidate["gap"] * incumbent["denominator"]
        < incumbent["gap"] * candidate["denominator"]
    )


def attach_context(record: dict, graph: nx.Graph, context: dict) -> dict:
    return {
        **context,
        **record,
        "polynomial": planted_state(graph, 0, None, {}).t,
        "tree": tree_certificate(graph),
    }


def exhaustive_lane(max_order: int) -> tuple[dict, dict | None]:
    totals = {"trees": 0, "rank_checks": 0}
    per_order = []
    champion = None
    failure = None
    for n in range(1, max_order + 1):
        order_trees = 0
        order_checks = 0
        order_champion = None
        for tree_index, graph in enumerate(core_generator(n)):
            order_trees += 1
            p = planted_state(graph, 0, None, {}).t
            found, local, checks = scan_polynomial(p)
            order_checks += checks
            if better(local, order_champion):
                order_champion = {
                    "tree_index": tree_index,
                    **local,
                    "polynomial": p,
                    "tree": tree_certificate(graph),
                }
            if found is not None:
                failure = {
                    "lane": "exhaustive_unlabeled_trees",
                    "order": n,
                    "tree_index": tree_index,
                    **found,
                    "polynomial": p,
                    "first_descent": first_descent(p),
                    "first_reascent": first_reascent(p),
                    "tree": tree_certificate(graph),
                }
                break
        totals["trees"] += order_trees
        totals["rank_checks"] += order_checks
        if better(order_champion, champion):
            champion = {"order": n, **order_champion}
        per_order.append(
            {
                "order": n,
                "trees": order_trees,
                "rank_checks": order_checks,
                "closest_normalized_margin": order_champion,
            }
        )
        print(
            f"n={n}: trees={order_trees:,}, rank checks={order_checks:,}, "
            f"closest margin="
            f"{None if order_champion is None else order_champion['normalized_margin_float']:.8g}"
            if order_champion is not None
            else f"n={n}: trees={order_trees:,}, rank checks={order_checks:,}",
            flush=True,
        )
        if failure is not None:
            break
    return {
        "totals": totals,
        "per_order": per_order,
        "closest_normalized_margin": champion,
    }, failure


def random_lane(
    trials: int,
    min_order: int,
    max_order: int,
    seed: int,
) -> tuple[dict, dict | None]:
    rng = random.Random(seed)
    totals = {"trees": 0, "rank_checks": 0}
    champion = None
    for trial in range(trials):
        n = rng.randint(min_order, max_order)
        graph = (
            nx.empty_graph(1)
            if n == 1
            else nx.from_prufer_sequence(
                [rng.randrange(n) for _ in range(n - 2)]
            )
        )
        p = planted_state(graph, 0, None, {}).t
        found, local, checks = scan_polynomial(p)
        totals["trees"] += 1
        totals["rank_checks"] += checks
        if better(local, champion):
            champion = {
                "trial": trial,
                "seed": seed,
                "order": n,
                **local,
                "polynomial": p,
                "tree": tree_certificate(graph),
            }
        if found is not None:
            return {
                "totals": totals,
                "closest_normalized_margin": champion,
            }, {
                "lane": "random_labelled_trees",
                "trial": trial,
                "seed": seed,
                "order": n,
                **found,
                "polynomial": p,
                "first_descent": first_descent(p),
                "first_reascent": first_reascent(p),
                "tree": tree_certificate(graph),
            }
        if (trial + 1) % 1000 == 0:
            print(
                f"random {trial + 1:,}/{trials:,}: "
                f"rank checks={totals['rank_checks']:,}",
                flush=True,
            )
    return {
        "totals": totals,
        "closest_normalized_margin": champion,
    }, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=18)
    parser.add_argument("--random", type=int, default=0)
    parser.add_argument("--random-min-order", type=int, default=20)
    parser.add_argument("--random-max-order", type=int, default=200)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    exact, failure = exhaustive_lane(args.max_order)
    random_result = None
    if failure is None and args.random:
        random_result, failure = random_lane(
            args.random,
            args.random_min_order,
            args.random_max_order,
            args.seed,
        )

    report = {
        "claim_tested": (
            "For every tested tree, average independent-set extension counts "
            "satisfy e_k <= e_{k-1}+1 at every rank."
        ),
        "why_it_implies_unimodality": (
            "Once i_k <= i_{k-1}, e_{k-1} <= k; unit drift gives "
            "e_k <= k+1, hence i_{k+1} <= i_k. Therefore no reascent can "
            "follow a descent."
        ),
        "variance_form": (
            "For uniform independent (k-1)-set S with residual vertex count "
            "E and residual edge count Q: Var(E) <= 2 E[E] + 2 E[Q]."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "exact_integer_arithmetic": True,
        "exhaustive": exact,
        "random": random_result,
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
                "exhaustive_totals": exact["totals"],
                "closest_exact": exact["closest_normalized_margin"],
                "random_totals": (
                    None if random_result is None else random_result["totals"]
                ),
                "closest_random": (
                    None
                    if random_result is None
                    else random_result["closest_normalized_margin"]
                ),
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
