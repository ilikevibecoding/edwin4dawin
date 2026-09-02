#!/usr/bin/env python3
"""Verify the universal fixed-rank leaf-payment identity."""

from __future__ import annotations

import argparse
from dataclasses import dataclass

import networkx as nx
import sympy as sp

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


def q_reserve(polynomial, rank: int) -> int:
    return (
        2 * rank * coefficient(polynomial, rank) ** 2
        - coefficient(polynomial, rank - 1)
        * coefficient(polynomial, rank)
        - 2
        * (rank + 1)
        * coefficient(polynomial, rank - 1)
        * coefficient(polynomial, rank + 1)
    )


def payment(
    rank: int,
    a: int,
    b: int,
    d: int,
    e: int,
    f: int,
) -> int:
    previous = (
        2 * (rank - 1) * e * e
        - d * e
        - 2 * rank * d * f
    )
    return (
        (rank + 1) * a * (a + d) * previous
        + a * d * e * (a + d + 2 * e)
        + 2 * a * a * e * e
        - 2 * rank * rank * (b * d - a * e) ** 2
    )


def symbolic_identity() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    a, b, c, d, e, f = sp.symbols(
        "a b c d e f", positive=True
    )
    old = 2 * k * b**2 - a * b - 2 * (k + 1) * a * c
    new = (
        2 * k * (b + e) ** 2
        - (a + d) * (b + e)
        - 2 * (k + 1) * (a + d) * (c + f)
    )
    previous = (
        2 * (k - 1) * e**2 - d * e - 2 * k * d * f
    )
    rooted_payment = (
        (k + 1) * a * (a + d) * previous
        + a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 2 * k**2 * (b * d - a * e) ** 2
    )
    assert sp.expand(
        k * a * d * (new - old)
        - k * d**2 * old
        - rooted_payment
    ) == 0


@dataclass
class Minimum:
    value: int
    order: int
    tree_index: int
    vertex: int
    graph6: str
    window: tuple[int, int, int, int, int]


def exhaustive(rank: int, minimum_order: int, maximum_order: int) -> None:
    for order in range(minimum_order, maximum_order + 1):
        all_minimum = None
        terminal_minimum = None
        trees = 0
        roots = 0
        terminal_roots = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            deleted_states, whole = all_root_states(tree, rank + 1)
            for vertex, deleted in deleted_states.items():
                roots += 1
                a = coefficient(whole, rank - 1)
                b = coefficient(whole, rank)
                d = coefficient(deleted, rank - 2)
                e = coefficient(deleted, rank - 1)
                f = coefficient(deleted, rank)
                if a == 0 or d == 0:
                    continue
                value = payment(rank, a, b, d, e, f)
                item = Minimum(
                    value,
                    order,
                    tree_index,
                    vertex,
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip(),
                    (a, b, d, e, f),
                )
                if all_minimum is None or value < all_minimum.value:
                    all_minimum = item
                nonleaf_neighbors = sum(
                    tree.degree(neighbor) > 1
                    for neighbor in tree.neighbors(vertex)
                )
                if nonleaf_neighbors <= 1:
                    terminal_roots += 1
                    if (
                        terminal_minimum is None
                        or value < terminal_minimum.value
                    ):
                        terminal_minimum = item
        print(
            f"rank={rank} n={order} trees={trees:,} roots={roots:,} "
            f"terminal_roots={terminal_roots:,} "
            f"min_all={None if all_minimum is None else all_minimum.value} "
            f"min_terminal="
            f"{None if terminal_minimum is None else terminal_minimum.value}",
            flush=True,
        )
        if all_minimum is not None and all_minimum.value < 0:
            print("ALL_WITNESS", all_minimum, flush=True)
        if terminal_minimum is not None and terminal_minimum.value < 0:
            print("TERMINAL_WITNESS", terminal_minimum, flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, default=6)
    parser.add_argument("--minimum-order", type=int, default=10)
    parser.add_argument("--maximum-order", type=int, default=17)
    parser.add_argument("--identity-only", action="store_true")
    args = parser.parse_args()
    symbolic_identity()
    print("general leaf-payment identity: PASS")
    if not args.identity_only:
        exhaustive(
            args.rank, args.minimum_order, args.maximum_order
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
