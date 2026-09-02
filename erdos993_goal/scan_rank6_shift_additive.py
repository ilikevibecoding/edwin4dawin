#!/usr/bin/env python3
"""Scan the rank-(3,4)/(4,5) coefficient shift under one vertex deletion."""

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
    parser.add_argument("--minimum-order", type=int, default=12)
    parser.add_argument("--maximum-order", type=int, default=16)
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        maximum = None
        minimum_ratio = None
        maximum_ratio = None
        maximum_witness = None
        cases = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            whole = engine.polynomial(full_mask)
            d, e = coefficient(whole, 4), coefficient(whole, 5)
            for vertex in range(order):
                deleted = engine.polynomial(
                    full_mask & ~(1 << engine.position[vertex])
                )
                u, v = coefficient(deleted, 3), coefficient(deleted, 4)
                if d * u == 0:
                    continue
                cases += 1
                additive = v / u - 5 * e / (4 * d)
                ratio = (v / u) / (e / d)
                if maximum is None or additive > maximum:
                    maximum = additive
                    maximum_witness = (
                        tree_index,
                        vertex,
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        (d, e, u, v),
                    )
                if minimum_ratio is None or ratio < minimum_ratio:
                    minimum_ratio = ratio
                if maximum_ratio is None or ratio > maximum_ratio:
                    maximum_ratio = ratio
        print(
            f"n={order} cases={cases:,} max_additive={maximum} "
            f"ratio_range=({minimum_ratio}, {maximum_ratio}) "
            f"witness={maximum_witness}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
