#!/usr/bin/env python3
"""Scan exact reserve compensation in the rank-6 cross closure identity."""

from __future__ import annotations

import argparse
from fractions import Fraction

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(polynomial, rank):
    return polynomial[rank] if rank < len(polynomial) else 0


def cross(d, e, f, h, k):
    return d * (e * e - d * f) - 2 * e * (e * h - d * k)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=10)
    parser.add_argument("--maximum-order", type=int, default=15)
    parser.add_argument("--leaf-roots", action="store_true")
    args = parser.parse_args()

    for order in range(args.minimum_order, args.maximum_order + 1):
        minimum_ratio = None
        minimum_g_ratio = None
        minimum_G_ratio = None
        minimum_total = None
        worst_ratio_witness = None
        worst_total_witness = None
        negative_mixed = 0
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
                s = Fraction(u, d)
                c = Fraction(v * d, u * e)
                cs = Fraction(v, e)
                D = Fraction(e * e - d * f, e * e)
                E = Fraction(v * v - u * w, v * v)
                root_vertices = (
                    [v for v in tree if tree.degree(v) == 1]
                    if args.leaf_roots
                    else range(order)
                )
                for root in root_vertices:
                    if root == attachment:
                        continue
                    h = coefficient(deleted[root], 4)
                    k = coefficient(deleted[root], 5)
                    both = engine.polynomial(
                        full_mask
                        & ~(1 << engine.position[attachment])
                        & ~(1 << engine.position[root])
                    )
                    y, z = coefficient(both, 3), coefficient(both, 4)
                    r, q = Fraction(h, d), Fraction(k, e)
                    R, S = Fraction(y, u), Fraction(z, v)
                    g = D - 2 * (r - q)
                    G = E - 2 * (R - S)
                    compatibility = (
                        (1 + s) * (1 - D - c * (1 - E))
                        + 2 * (1 + cs) * (R - r)
                    )
                    reserve = (1 + s) * (1 + cs) * (
                        g + cs * G
                    )
                    g_reserve = (1 + s) * (1 + cs) * g
                    G_reserve = (
                        (1 + s) * (1 + cs) * cs * G
                    )
                    mixed = s * (c - 1) * compatibility
                    total = reserve + mixed
                    cases += 1

                    direct_total = cross(
                        d + u,
                        e + v,
                        f + w,
                        h + y,
                        k + z,
                    )
                    assert total == Fraction(direct_total, d * e * e)

                    if minimum_total is None or total < minimum_total:
                        minimum_total = total
                        worst_total_witness = (
                            tree_index,
                            attachment,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                            (d, e, f, h, k, u, v, w, y, z),
                            (reserve, mixed),
                        )
                    if mixed < 0:
                        negative_mixed += 1
                        ratio = reserve / (-mixed)
                        g_ratio = g_reserve / (-mixed)
                        G_ratio = G_reserve / (-mixed)
                        if (
                            minimum_g_ratio is None
                            or g_ratio < minimum_g_ratio
                        ):
                            minimum_g_ratio = g_ratio
                        if (
                            minimum_G_ratio is None
                            or G_ratio < minimum_G_ratio
                        ):
                            minimum_G_ratio = G_ratio
                        if (
                            minimum_ratio is None
                            or ratio < minimum_ratio
                        ):
                            minimum_ratio = ratio
                            worst_ratio_witness = (
                                tree_index,
                                attachment,
                                root,
                                nx.to_graph6_bytes(tree, header=False)
                                .decode("ascii")
                                .strip(),
                                (d, e, f, h, k, u, v, w, y, z),
                                (reserve, mixed, total),
                            )
        print(
            f"n={order} cases={cases:,} negative_mixed={negative_mixed:,} "
            f"min_reserve_ratio="
            f"{None if minimum_ratio is None else float(minimum_ratio)} "
            f"min_g_ratio="
            f"{None if minimum_g_ratio is None else float(minimum_g_ratio)} "
            f"min_G_ratio="
            f"{None if minimum_G_ratio is None else float(minimum_G_ratio)} "
            f"min_total={float(minimum_total)}",
            flush=True,
        )
        print("  ratio_witness", worst_ratio_witness, flush=True)
        print("  total_witness", worst_total_witness, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
