#!/usr/bin/env python3
"""Scan the rank-(3,4,5) curvature under generalized tree shifts.

For a tree T put

    R(T) = i_3(T) i_5(T) / i_4(T)^2,
    D(T) = 1 - R(T).

The path-envelope conjecture says D(T) <= D(P_n).  A sufficient
explanation would be that every proper generalized tree shift T -> T'
has D(T') <= D(T), equivalently R(T') >= R(T).

This script checks that statement using exact integer cross-products.
It is an exploratory falsification scan, not a proof.
"""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficients(tree):
    engine = MaskIndependencePolynomial(tree)
    polynomial = engine.polynomial((1 << len(tree)) - 1)
    return tuple(
        polynomial[rank] if rank < len(polynomial) else 0
        for rank in range(6)
    )


def proper_shift_candidates(tree):
    """Yield one representative of each endpoint-pair GTS."""

    vertices = list(tree)
    for left_index, left in enumerate(vertices):
        if tree.degree(left) < 2:
            continue
        for right in vertices[left_index + 1 :]:
            if tree.degree(right) < 2:
                continue
            path = nx.shortest_path(tree, left, right)
            if not all(tree.degree(vertex) == 2 for vertex in path[1:-1]):
                continue

            # Moving either endpoint's off-path branches gives isomorphic
            # images, so one orientation is enough.
            source = right
            target = left
            path_neighbor = path[-2]
            moving = [
                neighbor
                for neighbor in tree.neighbors(source)
                if neighbor != path_neighbor
            ]
            shifted = tree.copy()
            for neighbor in moving:
                shifted.remove_edge(source, neighbor)
                shifted.add_edge(target, neighbor)
            assert nx.is_tree(shifted)
            assert shifted.degree(source) == 1
            yield left, right, shifted


def ratio_comparison(old, new):
    """Return the numerator of R(new)-R(old)."""

    return (
        new[3] * new[5] * old[4] ** 2
        - old[3] * old[5] * new[4] ** 2
    )


def x_comparison(old, new):
    """Return the numerator of X(new)-X(old), X=i_3/i_4."""

    return new[3] * old[4] - old[3] * new[4]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=6)
    parser.add_argument("--maximum-order", type=int, default=15)
    parser.add_argument("--failure-limit", type=int, default=10)
    args = parser.parse_args()

    total_trees = 0
    total_shifts = 0
    failures = []
    x_failures = []

    for order in range(args.minimum_order, args.maximum_order + 1):
        order_trees = 0
        order_shifts = 0
        minimum_ratio_delta = None
        minimum_x_delta = None
        order_failures = []
        order_x_failures = []

        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            order_trees += 1
            old = coefficients(tree)
            for left, right, shifted in proper_shift_candidates(tree):
                order_shifts += 1
                new = coefficients(shifted)
                ratio_delta = ratio_comparison(old, new)
                x_delta = x_comparison(old, new)
                witness = (
                    tree_index,
                    left,
                    right,
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip(),
                    nx.to_graph6_bytes(shifted, header=False)
                    .decode("ascii")
                    .strip(),
                    old[3:6],
                    new[3:6],
                )

                if (
                    minimum_ratio_delta is None
                    or ratio_delta < minimum_ratio_delta[0]
                ):
                    minimum_ratio_delta = (ratio_delta, witness)
                if (
                    minimum_x_delta is None
                    or x_delta < minimum_x_delta[0]
                ):
                    minimum_x_delta = (x_delta, witness)
                if ratio_delta < 0:
                    order_failures.append((ratio_delta, witness))
                    failures.append((order, ratio_delta, witness))
                if x_delta > 0:
                    order_x_failures.append((x_delta, witness))
                    x_failures.append((order, x_delta, witness))

        total_trees += order_trees
        total_shifts += order_shifts
        print(
            f"n={order} trees={order_trees:,} shifts={order_shifts:,} "
            f"min_R_cross={minimum_ratio_delta} "
            f"R_failures={len(order_failures):,} "
            f"min_X_cross={minimum_x_delta} "
            f"X_direction_failures={len(order_x_failures):,}",
            flush=True,
        )
        if order_failures:
            print(f"  first R failures={order_failures[:3]}", flush=True)
        if order_x_failures:
            print(
                f"  first X failures={order_x_failures[:3]}",
                flush=True,
            )
        if len(failures) >= args.failure_limit:
            break

    print(
        f"scanned trees={total_trees:,} shifts={total_shifts:,}; "
        f"R failures={len(failures):,}; "
        f"X-direction failures={len(x_failures):,}"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
