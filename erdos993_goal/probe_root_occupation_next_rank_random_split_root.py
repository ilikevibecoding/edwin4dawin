#!/usr/bin/env python3
"""Large exact random split-graph probe for rank-weighted root avoidance."""

from __future__ import annotations

import argparse
import json
import math
import random


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--seed", type=int, default=993220260832)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    checks = 0
    first_failure = None

    for sample in range(args.samples):
        independent_order = rng.randint(3, 120)
        clique_order = rng.randint(1, 40)
        # Bit mask of independent-side nonneighbors for each clique vertex.
        nonneighbors = []
        for _ in range(clique_order):
            probability = rng.random()
            mask = 0
            for vertex in range(independent_order):
                if rng.random() < probability:
                    mask |= 1 << vertex
            nonneighbors.append(mask)

        if rng.random() < 0.8:
            root_mask = 0
            for vertex in range(independent_order):
                if rng.random() < 0.35:
                    root_mask |= 1 << vertex
            rooted_clique = None
        else:
            rooted_clique = rng.randrange(clique_order)
            eligible = nonneighbors[rooted_clique]
            root_mask = 0
            for vertex in range(independent_order):
                if eligible & (1 << vertex) and rng.random() < 0.35:
                    root_mask |= 1 << vertex

        alpha = max(
            independent_order,
            1 + max(mask.bit_count() for mask in nonneighbors),
        )
        cutoff = (2 * alpha + 3) // 3
        roots_in_independent = root_mask.bit_count()
        remaining_independent = independent_order - roots_in_independent
        b = [0] * (alpha + 1)
        c = [0] * (alpha + 1)
        for rank in range(alpha + 1):
            b[rank] = choose(independent_order, rank) + sum(
                choose(mask.bit_count(), rank - 1) for mask in nonneighbors
            )
            c[rank] = choose(remaining_independent, rank)
            for clique_vertex, mask in enumerate(nonneighbors):
                if clique_vertex == rooted_clique:
                    continue
                remaining_nonneighbors = (mask & ~root_mask).bit_count()
                c[rank] += choose(remaining_nonneighbors, rank - 1)

        for j in range(1, alpha):
            if j + 1 >= cutoff:
                continue
            checks += 1
            left = (j + 2) * c[j] * b[j + 1]
            right = (j + 1) * c[j + 1] * b[j]
            if left < right:
                first_failure = {
                    "sample": sample,
                    "independent_order": independent_order,
                    "clique_order": clique_order,
                    "nonneighbor_masks": nonneighbors,
                    "root_mask": root_mask,
                    "rooted_clique": rooted_clique,
                    "alpha": alpha,
                    "cutoff": cutoff,
                    "j": j,
                    "b_window": [b[j], b[j + 1]],
                    "c_window": [c[j], c[j + 1]],
                    "left": left,
                    "right": right,
                }
                break
        if first_failure is not None:
            break

    print(
        json.dumps(
            {
                "status": (
                    "PASS_RANDOM_SPLIT_PROBE"
                    if first_failure is None
                    else "FAIL_RANDOM_SPLIT_NOT_FOREST_COUNTEREXAMPLE"
                ),
                "requested_samples": args.samples,
                "completed_samples": sample + 1,
                "checks": checks,
                "seed": args.seed,
                "first_failure": first_failure,
                "scope": "split graphs only; a failure is not a forest counterexample",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
