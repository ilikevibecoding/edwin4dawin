#!/usr/bin/env python3
"""Scan the exact mixed-deletion compatibility for rank-6 cross closure."""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(polynomial, rank):
    return polynomial[rank] if rank < len(polynomial) else 0


def compatibility(d, e, f, h, u, v, w, y):
    """Positive clearing of the normalized compatibility expression."""
    # K = (d+u)(fv-ew)/(e^2 v)
    #     + 2(e+v)(dy-uh)/(eud).
    return (
        u * d * (d + u) * (f * v - e * w)
        + 2 * e * v * (e + v) * (d * y - u * h)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=10)
    parser.add_argument("--maximum-order", type=int, default=15)
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        minimum = None
        witness = None
        cases = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            whole = engine.polynomial(full_mask)
            d, e, f = (
                coefficient(whole, 4),
                coefficient(whole, 5),
                coefficient(whole, 6),
            )
            deleted = {
                vertex: engine.polynomial(
                    full_mask & ~(1 << engine.position[vertex])
                )
                for vertex in range(order)
            }
            for attachment in range(order):
                qpoly = deleted[attachment]
                u, v, w = (
                    coefficient(qpoly, 3),
                    coefficient(qpoly, 4),
                    coefficient(qpoly, 5),
                )
                if not d * e * u * v:
                    continue
                for root in range(order):
                    if root == attachment:
                        continue
                    rpoly = deleted[root]
                    h = coefficient(rpoly, 4)
                    both = engine.polynomial(
                        full_mask
                        & ~(1 << engine.position[attachment])
                        & ~(1 << engine.position[root])
                    )
                    y = coefficient(both, 3)
                    value = compatibility(d, e, f, h, u, v, w, y)
                    cases += 1
                    if minimum is None or value < minimum:
                        minimum = value
                        witness = (
                            tree_index,
                            attachment,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                            (d, e, f, h, u, v, w, y),
                        )
        print(
            f"n={order} cases={cases:,} minimum={minimum} "
            f"witness={witness}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
