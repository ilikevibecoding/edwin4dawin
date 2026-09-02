#!/usr/bin/env python3
"""Diagnostic for a branching-surplus lower floor on the rank-five V coordinate.

This does not claim a theorem.  It searches exact free-tree and deterministic
random-tree samples for a failure of

    V >= 8 e / (5 (n-2) (n-3)),

where V=1-Q5/(5 i4 i5) and e=sum_v binom(deg(v)-1,2).
"""

from __future__ import annotations

import argparse
import random
from fractions import Fraction

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(poly: tuple[int, ...] | list[int], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def row(tree: nx.Graph) -> tuple[Fraction, Fraction, int]:
    n = len(tree)
    _, poly = all_root_states(tree, 6)
    i4, i5, i6 = (coefficient(poly, rank) for rank in (4, 5, 6))
    if not i4 or not i5:
        raise ValueError("rank-five coordinate is inactive")
    q5 = 10 * i5 * i5 - i4 * i5 - 12 * i4 * i6
    v = Fraction(5 * i4 * i5 - q5, 5 * i4 * i5)
    surplus = sum(
        (tree.degree(vertex) - 1) * (tree.degree(vertex) - 2) // 2
        for vertex in tree
    )
    floor = Fraction(8 * surplus, 5 * (n - 2) * (n - 3))
    return v, v - floor, surplus


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exact-max-order", type=int, default=16)
    parser.add_argument("--random-per-order", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    global_min = None
    checked = 0
    for n in range(10, args.exact_max_order + 1):
        local = None
        trees = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            trees += 1
            v, slack, surplus = row(tree)
            candidate = (slack, v, surplus, index, nx.to_graph6_bytes(tree, header=False).decode().strip())
            if local is None or candidate < local:
                local = candidate
            if global_min is None or candidate < global_min:
                global_min = candidate
            checked += 1
        print(f"exact n={n} trees={trees:,} minimum={local}", flush=True)
        if local[0] < 0:
            raise SystemExit("FAIL_EXACT_SAMPLE")
    for n in (20, 30, 50, 80, 120, 200, 500, 1000):
        local = None
        for index in range(args.random_per_order):
            prufer = [rng.randrange(n) for _ in range(n - 2)]
            tree = nx.from_prufer_sequence(prufer)
            v, slack, surplus = row(tree)
            candidate = (slack, v, surplus, index, nx.to_graph6_bytes(tree, header=False).decode().strip())
            if local is None or candidate < local:
                local = candidate
            checked += 1
        print(f"random n={n} samples={args.random_per_order:,} minimum={local[:4]}", flush=True)
        if local[0] < 0:
            raise SystemExit("FAIL_RANDOM_SAMPLE")
    print(f"PASS_DIAGNOSTIC_BRANCHING_SURPLUS_V_FLOOR checked={checked:,} global_min={global_min}")


if __name__ == "__main__":
    main()
