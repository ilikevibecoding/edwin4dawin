#!/usr/bin/env python3
"""Scan leaf-addition increments of the strong rank-6 cross margin."""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coeff(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def add_leaf(whole, deleted):
    size = max(len(whole), len(deleted) + 1)
    out = [0] * size
    for rank in range(size):
        out[rank] = coeff(whole, rank) + coeff(deleted, rank - 1)
    return tuple(out)


def add_isolate(poly):
    return add_leaf(poly, poly)


def strong_margin(whole, root_deleted):
    d = coeff(whole, 4)
    e = coeff(whole, 5)
    h = coeff(root_deleted, 4)
    k = coeff(root_deleted, 5)
    return d * (2 * e + d) - 24 * (e * h - d * k)


def cross_margin(whole, root_deleted):
    d = coeff(whole, 4)
    e = coeff(whole, 5)
    f = coeff(whole, 6)
    h = coeff(root_deleted, 4)
    k = coeff(root_deleted, 5)
    return d * (e * e - d * f) - 2 * e * (e * h - d * k)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=8)
    parser.add_argument("--maximum-order", type=int, default=14)
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        minimum = None
        cross_minimum = None
        witness = None
        cross_witness = None
        cases = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            whole = engine.polynomial(full_mask)
            deleted_one = {
                vertex: engine.polynomial(
                    full_mask & ~(1 << engine.position[vertex])
                )
                for vertex in range(order)
            }
            old_margins = {
                root: strong_margin(whole, deleted_one[root])
                for root in range(order)
            }
            old_cross_margins = {
                root: cross_margin(whole, deleted_one[root])
                for root in range(order)
            }
            for attachment in range(order):
                extended_whole = add_leaf(
                    whole, deleted_one[attachment]
                )
                for root in range(order):
                    cases += 1
                    if root == attachment:
                        extended_root_deleted = add_isolate(
                            deleted_one[root]
                        )
                    else:
                        deleted_both = engine.polynomial(
                            full_mask
                            & ~(1 << engine.position[root])
                            & ~(1 << engine.position[attachment])
                        )
                        extended_root_deleted = add_leaf(
                            deleted_one[root], deleted_both
                        )
                    increment = strong_margin(
                        extended_whole, extended_root_deleted
                    ) - old_margins[root]
                    cross_increment = cross_margin(
                        extended_whole, extended_root_deleted
                    ) - old_cross_margins[root]
                    if minimum is None or increment < minimum:
                        minimum = increment
                        witness = (
                            tree_index,
                            attachment,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                        )
                    if (
                        cross_minimum is None
                        or cross_increment < cross_minimum
                    ):
                        cross_minimum = cross_increment
                        cross_witness = (
                            tree_index,
                            attachment,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                        )
        print(
            f"n={order} cases={cases:,} minimum_increment={minimum} "
            f"witness={witness} "
            f"cross_minimum_increment={cross_minimum} "
            f"cross_witness={cross_witness}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
