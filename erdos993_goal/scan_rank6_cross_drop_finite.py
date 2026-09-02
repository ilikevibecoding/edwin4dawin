#!/usr/bin/env python3
"""Finite scan of the rooted rank-6 cross-drop inequality."""

from __future__ import annotations

import argparse

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=13)
    parser.add_argument("--maximum-order", type=int, default=17)
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        minimum = None
        minimum_strong = None
        witness = None
        strong_witness = None
        by_degree = {}
        trees = 0
        roots = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            deleted_states, whole = all_root_states(tree, 7)
            d = coefficient(whole, 4)
            e = coefficient(whole, 5)
            f = coefficient(whole, 6)
            for root, deleted in deleted_states.items():
                roots += 1
                h = coefficient(deleted, 4)
                k = coefficient(deleted, 5)
                value = (
                    d * (e * e - d * f)
                    - 2 * e * (e * h - d * k)
                )
                strong_value = d * (2 * e + d) - 24 * (
                    e * h - d * k
                )
                root_degree = tree.degree(root)
                previous = by_degree.get(root_degree)
                if previous is None:
                    by_degree[root_degree] = [value, strong_value]
                else:
                    previous[0] = min(previous[0], value)
                    previous[1] = min(previous[1], strong_value)
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (
                        tree_index,
                        root,
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        (d, e, f, h, k),
                    )
                if (
                    minimum_strong is None
                    or strong_value < minimum_strong
                ):
                    minimum_strong = strong_value
                    strong_witness = (
                        tree_index,
                        root,
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        (d, e, f, h, k),
                    )
        print(
            f"n={order} trees={trees:,} roots={roots:,} "
            f"minimum={minimum} witness={witness} "
            f"strong_minimum={minimum_strong} "
            f"strong_witness={strong_witness}",
            flush=True,
        )
        print("by_degree", dict(sorted(by_degree.items())), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
