#!/usr/bin/env python3
"""Exact scans for the two shallow-branch closure moves at a fixed root.

Starting from a rooted tree (T,q), the diameter-core reconstruction uses

1. a new leaf adjacent to q;
2. a new vertex u adjacent to q, followed by leaves adjacent to u.

This scanner records increments of both the strong rank-6 margin S and
the rooted-cross margin C under these operations.
"""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(polynomial, rank):
    return polynomial[rank] if 0 <= rank < len(polynomial) else 0


def multiply(left, right, limit=6):
    out = [0] * min(limit + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= limit:
                out[i + j] += a * b
    return tuple(out)


def add(left, right):
    out = [0] * max(len(left), len(right))
    for rank in range(len(out)):
        out[rank] = coefficient(left, rank) + coefficient(right, rank)
    return tuple(out)


def shift(polynomial):
    return (0,) + tuple(polynomial)


def strong(whole, deleted):
    d, e = coefficient(whole, 4), coefficient(whole, 5)
    h, k = coefficient(deleted, 4), coefficient(deleted, 5)
    return d * (2 * e + d) - 24 * (e * h - d * k)


def cross(whole, deleted):
    d, e, f = (
        coefficient(whole, 4),
        coefficient(whole, 5),
        coefficient(whole, 6),
    )
    h, k = coefficient(deleted, 4), coefficient(deleted, 5)
    return d * (e * e - d * f) - 2 * e * (e * h - d * k)


def attach_root_star(whole, deleted, leaf_count):
    # Branch centered at u: when q is excluded its polynomial is
    # P_t=(1+x)^t+x; when q is included it contributes Q_t=(1+x)^t.
    isolates = tuple(
        coefficient([1], 0) for _ in ()
    )  # keeps this construction visibly integer-only
    del isolates
    q_branch = tuple(
        __import__("math").comb(leaf_count, j)
        for j in range(leaf_count + 1)
    )
    full_branch = list(q_branch)
    if len(full_branch) < 2:
        full_branch += [0] * (2 - len(full_branch))
    full_branch[1] += 1
    new_deleted = multiply(deleted, tuple(full_branch))
    included_part = multiply(deleted, q_branch)
    # I(T)=I(T-q)+x I(T-N[q]), so recover the included-root summand.
    old_included = [
        coefficient(whole, rank) - coefficient(deleted, rank)
        for rank in range(max(len(whole), len(deleted)))
    ]
    new_whole = add(new_deleted, multiply(tuple(old_included), q_branch))
    return new_whole, new_deleted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=8)
    parser.add_argument("--maximum-order", type=int, default=17)
    parser.add_argument("--maximum-star-leaves", type=int, default=8)
    args = parser.parse_args()

    for order in range(args.minimum_order, args.maximum_order + 1):
        minima = {
            "leaf_S": None,
            "leaf_C": None,
            "star_S": None,
            "star_C": None,
        }
        witnesses = {}
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            whole = engine.polynomial(full_mask)
            for root in range(order):
                deleted = engine.polynomial(
                    full_mask & ~(1 << engine.position[root])
                )
                old_s, old_c = strong(whole, deleted), cross(whole, deleted)
                graph6 = (
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip()
                )
                for leaf_count in range(0, args.maximum_star_leaves + 1):
                    extended, extended_deleted = attach_root_star(
                        whole, deleted, leaf_count
                    )
                    label = "leaf" if leaf_count == 0 else "star"
                    values = {
                        f"{label}_S": strong(
                            extended, extended_deleted
                        )
                        - old_s,
                        f"{label}_C": cross(
                            extended, extended_deleted
                        )
                        - old_c,
                    }
                    for name, value in values.items():
                        if minima[name] is None or value < minima[name]:
                            minima[name] = value
                            witnesses[name] = (
                                tree_index,
                                root,
                                leaf_count,
                                graph6,
                            )
        print(
            f"n={order} "
            + " ".join(f"{name}={value}" for name, value in minima.items()),
            flush=True,
        )
        print(" witnesses", witnesses, flush=True)


if __name__ == "__main__":
    main()
