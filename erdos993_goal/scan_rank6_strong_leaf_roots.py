#!/usr/bin/env python3
"""Fast finite scan of the strong rank-6 bound at leaf roots only."""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(polynomial, rank):
    return polynomial[rank] if rank < len(polynomial) else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=18)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--end-index", type=int)
    args = parser.parse_args()
    order = args.order
    minimum = None
    witness = None
    trees = 0
    roots = 0
    by_branch_vertices = {}
    for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
        if tree_index < args.start_index:
            continue
        if (
            args.end_index is not None
            and tree_index >= args.end_index
        ):
            break
        trees += 1
        engine = MaskIndependencePolynomial(tree)
        mask = (1 << order) - 1
        whole = engine.polynomial(mask)
        d = coefficient(whole, 4)
        e = coefficient(whole, 5)
        for root in (v for v in tree if tree.degree(v) == 1):
            roots += 1
            root_bit = 1 << engine.position[root]
            deleted = engine.polynomial(mask & ~root_bit)
            h = coefficient(deleted, 4)
            k = coefficient(deleted, 5)
            value = d * (2 * e + d) - 24 * (e * h - d * k)
            branch_vertices = sum(
                tree.degree(vertex) >= 3 for vertex in tree
            )
            previous = by_branch_vertices.get(branch_vertices)
            if previous is None or value < previous:
                by_branch_vertices[branch_vertices] = value
            if minimum is None or value < minimum:
                minimum = value
                witness = (
                    tree_index,
                    root,
                    next(iter(tree.neighbors(root))),
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip(),
                    tuple(sorted(dict(tree.degree()).values())),
                    (d, e, h, k),
                )
    print(
        f"n={order} trees={trees:,} leaf_roots={roots:,} "
        f"minimum={minimum} witness={witness}"
    )
    print(
        "by_branch_vertices",
        dict(sorted(by_branch_vertices.items())),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
