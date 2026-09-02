#!/usr/bin/env python3
"""Scan normalized relations in the rank-6 cross leaf-addition square."""

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
    parser.add_argument("--maximum-order", type=int, default=14)
    args = parser.parse_args()
    names = (
        "shift_ratio",
        "shift_additive",
        "root_influence_rank4",
        "root_influence_deleted_rank3",
        "retention_gap_over_s",
        "rank3_retention_minus_rank4_whole",
        "rank4_deleted_retention_minus_rank5_whole",
        "rank3_minus_rank4_deleted",
    )
    for order in range(args.minimum_order, args.maximum_order + 1):
        minima = {name: (None, None) for name in names}
        maxima = {name: (None, None) for name in names}
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            whole = engine.polynomial(full_mask)
            d, e = coeff(whole, 4), coeff(whole, 5)
            for attachment in range(order):
                deleted_attachment = engine.polynomial(
                    full_mask
                    & ~(1 << engine.position[attachment])
                )
                u, v = (
                    coeff(deleted_attachment, 3),
                    coeff(deleted_attachment, 4),
                )
                if not d * e * u * v:
                    continue
                for root in range(order):
                    if root == attachment:
                        continue
                    deleted_root = engine.polynomial(
                        full_mask & ~(1 << engine.position[root])
                    )
                    deleted_both = engine.polynomial(
                        full_mask
                        & ~(1 << engine.position[root])
                        & ~(1 << engine.position[attachment])
                    )
                    h, k = (
                        coeff(deleted_root, 4),
                        coeff(deleted_root, 5),
                    )
                    y, z = (
                        coeff(deleted_both, 3),
                        coeff(deleted_both, 4),
                    )
                    values = {
                        "shift_ratio": (v / u) / (e / d),
                        "shift_additive": v / u - 1.25 * e / d,
                        "root_influence_rank4": (
                            (e / d) * (1 - h / d)
                        ),
                        "root_influence_deleted_rank3": (
                            (v / u) * (1 - y / u)
                        ),
                        "retention_gap_over_s": (
                            (y / u - h / d) / (u / d)
                        ),
                        "rank3_retention_minus_rank4_whole": (
                            y / u - h / d
                        ),
                        "rank4_deleted_retention_minus_rank5_whole": (
                            z / v - k / e
                        ),
                        "rank3_minus_rank4_deleted": y / u - z / v,
                    }
                    for name, value in values.items():
                        previous, _ = minima[name]
                        if previous is None or value < previous:
                            minima[name] = (
                                value,
                                (
                                    tree_index,
                                    attachment,
                                    root,
                                    nx.to_graph6_bytes(
                                        tree, header=False
                                    )
                                    .decode("ascii")
                                    .strip(),
                                    (d, e, h, k, u, v, y, z),
                                ),
                            )
                        previous, _ = maxima[name]
                        if previous is None or value > previous:
                            maxima[name] = (
                                value,
                                (
                                    tree_index,
                                    attachment,
                                    root,
                                    nx.to_graph6_bytes(
                                        tree, header=False
                                    )
                                    .decode("ascii")
                                    .strip(),
                                    (d, e, h, k, u, v, y, z),
                                ),
                            )
        print(f"n={order}")
        for name in names:
            print(
                " ",
                name,
                "minimum",
                minima[name],
                "maximum",
                maxima[name],
                flush=True,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
