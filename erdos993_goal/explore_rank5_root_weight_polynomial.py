#!/usr/bin/env python3
"""Scan coefficients of Q5 for a single weighted root."""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coeff(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=10)
    parser.add_argument("--maximum-order", type=int, default=15)
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        minima = [None, None, None]
        witnesses = [None, None, None]
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full = (1 << order) - 1
            for root in range(order):
                hpoly = engine.polynomial(full & ~(1 << root))
                closed = 1 << root
                for neighbor in tree.neighbors(root):
                    closed |= 1 << neighbor
                jpoly = engine.polynomial(full & ~closed)
                h, k, ell = (
                    coeff(hpoly, 4),
                    coeff(hpoly, 5),
                    coeff(hpoly, 6),
                )
                u, v, w = (
                    coeff(jpoly, 3),
                    coeff(jpoly, 4),
                    coeff(jpoly, 5),
                )
                values = (
                    10 * k * k - h * k - 12 * h * ell,
                    -h * v
                    - 12 * h * w
                    - k * u
                    + 20 * k * v
                    - 12 * ell * u,
                    10 * v * v - u * v - 12 * u * w,
                )
                for index, value in enumerate(values):
                    if minima[index] is None or value < minima[index]:
                        minima[index] = value
                        witnesses[index] = (
                            tree_index,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                            (h, k, ell, u, v, w),
                        )
        print(
            f"n={order} minima={minima} witnesses={witnesses}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
