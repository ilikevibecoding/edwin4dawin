#!/usr/bin/env python3
"""Enumerate exact leaf-support frontiers for the Delta0 boundary coupling."""

from __future__ import annotations

import argparse
from math import comb

from verify_rank7_terminal_broom_rooted_c4_moment import partitions


def balanced_completion(lower, target):
    values = list(lower)
    while sum(values) < target:
        index = min(range(len(values)), key=lambda i: (values[i], i))
        values[index] += 1
    assert sum(values) == target
    return tuple(sorted(values, reverse=True))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--b2-floor", type=int, default=0)
    args = parser.parse_args()
    n = args.n
    rows = set()
    for leaves in range(2, n - 1):
        internal = n - leaves
        for part in partitions(leaves, leaves):
            part = tuple(part)
            supports = len(part)
            if supports < 2 or supports > internal:
                continue
            lower = part + (1,) * (internal - supports)
            excess = balanced_completion(lower, n - 2)
            beta = sum(comb(value, 2) for value in excess)
            boundary_one = sum(comb(value, 5) for value in part)
            rows.add((max(args.b2_floor, beta), boundary_one, leaves, part, excess))

    pairs = sorted({(row[0], row[1]) for row in rows})
    frontier = []
    for beta, boundary_one in pairs:
        if any(
            other_beta <= beta
            and other_boundary >= boundary_one
            and (other_beta, other_boundary) != (beta, boundary_one)
            for other_beta, other_boundary in pairs
        ):
            continue
        frontier.append((beta, boundary_one))

    witnesses = {}
    for beta, boundary_one in frontier:
        witness = min(
            row for row in rows if row[0] == beta and row[1] == boundary_one
        )
        witnesses[(beta, boundary_one)] = witness
    print("n", n, "rows", len(rows), "pairs", len(pairs), "frontier", len(frontier))
    for beta, boundary_one in sorted(frontier):
        _, _, leaves, part, excess = witnesses[(beta, boundary_one)]
        print(beta, boundary_one, "L", leaves, "leaf_partition", part, "excess", excess)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
