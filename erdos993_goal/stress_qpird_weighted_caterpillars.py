#!/usr/bin/env python3
"""Adversarial exact QPIRD scan on weighted caterpillar trees."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

from verify_rooted_forest_two_ratio_dominance import (
    ONE_PLUS_X,
    X,
    coeff,
    rooted_pair,
    stable_float,
)


def caterpillar(leaves: list[int]) -> list[list[int]]:
    spine = len(leaves)
    order = spine + sum(leaves)
    adjacency = [[] for _ in range(order)]
    for vertex in range(spine - 1):
        adjacency[vertex].append(vertex + 1)
        adjacency[vertex + 1].append(vertex)
    next_vertex = spine
    for center, count in enumerate(leaves):
        for _ in range(count):
            adjacency[center].append(next_vertex)
            adjacency[next_vertex].append(center)
            next_vertex += 1
    return adjacency


def random_leaf_count(rng: random.Random, maximum: int) -> int:
    mode = rng.randrange(5)
    if mode == 0:
        return 0
    if mode == 1:
        return rng.randrange(min(4, maximum + 1))
    if mode == 2:
        return maximum
    if mode == 3:
        value = int((maximum + 1) ** rng.random()) - 1
        return max(0, min(maximum, value))
    return rng.randrange(maximum + 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--min-spine", type=int, default=2)
    parser.add_argument("--max-spine", type=int, default=12)
    parser.add_argument("--max-leaves", type=int, default=60)
    parser.add_argument("--seed", type=int, default=993_20260738)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "qpird_weighted_caterpillars_20260729.json"
        ),
    )
    args = parser.parse_args()

    checks = 0
    first_failure = None
    minimum_margin = None
    minimum_item = None

    for sample in range(args.samples):
        spine = rng_spine = random.Random(
            args.seed + 1_000_003 * sample
        )
        spine_order = rng_spine.randint(
            args.min_spine, args.max_spine
        )
        leaves = [
            random_leaf_count(rng_spine, args.max_leaves)
            for _ in range(spine_order)
        ]
        if sum(leaves) == 0:
            leaves[rng_spine.randrange(spine_order)] = 1
        adjacency = caterpillar(leaves)

        root_candidates = list(range(spine_order))
        rng_spine.shuffle(root_candidates)
        root_candidates = root_candidates[: min(3, spine_order)]
        for root in root_candidates:
            c_poly, d_poly = rooted_pair(adjacency, root)
            h_poly = c_poly + ONE_PLUS_X * d_poly
            b_poly = ONE_PLUS_X * (c_poly + X * d_poly)
            for k in range(1, c_poly.degree() + 1):
                c = coeff(c_poly, k)
                cp = coeff(c_poly, k + 1)
                hm = coeff(h_poly, k - 1)
                h = coeff(h_poly, k)
                if c <= 0 or hm <= 0:
                    continue
                if coeff(b_poly, k + 1) < coeff(b_poly, k):
                    continue

                margin_numerator = (
                    (k + 1) * (c * h - cp * hm) - c * hm
                )
                margin = Fraction(margin_numerator, c * hm)
                checks += 1
                item = {
                    "sample": sample,
                    "spine_leaves": leaves,
                    "order": len(adjacency),
                    "root_spine_index": root,
                    "root_degree": len(adjacency[root]),
                    "k": k,
                    "margin": str(margin),
                    "decimal": stable_float(margin),
                }
                if minimum_margin is None or margin < minimum_margin:
                    minimum_margin = margin
                    minimum_item = item
                if margin < 0 and first_failure is None:
                    first_failure = item

    report = {
        "status": (
            "PASS_NOT_PROOF"
            if first_failure is None
            else "COUNTEREXAMPLE"
        ),
        "samples": args.samples,
        "roots_per_sample": 3,
        "seed": args.seed,
        "spine_range": [args.min_spine, args.max_spine],
        "max_leaves_per_spine_vertex": args.max_leaves,
        "operative_checks": checks,
        "minimum_margin": minimum_item,
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
