#!/usr/bin/env python3
"""Scan a five-coefficient reduction of the strong rank-6 margin."""

from __future__ import annotations

import argparse
from fractions import Fraction

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def reduced_margin(x, y, z, u, v):
    t = y + u
    total_next = z + v
    return (
        x * x
        + t * t
        + 2 * x * (t + y)
        + 26 * x * total_next
        + 2 * t * total_next
        - 22 * y * t
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=16)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--end-index", type=int)
    args = parser.parse_args()

    minimum_exact = None
    minimum_half = None
    minimum_path = None
    minimum_reverse = None
    minimum_path_drop = None
    minimum_paired = None
    minimum_paired_7_4 = None
    minimum_paired_inequality = {}
    witness_exact = None
    witness_half = None
    witness_path = None
    witness_reverse = None
    witness_path_drop = None
    witness_paired = None
    witness_paired_7_4 = None
    trees = 0
    roots = 0
    for tree_index, tree in enumerate(nx.nonisomorphic_trees(args.order)):
        if tree_index < args.start_index:
            continue
        if (
            args.end_index is not None
            and tree_index >= args.end_index
        ):
            break
        trees += 1
        engine = MaskIndependencePolynomial(tree)
        full_mask = (1 << args.order) - 1
        for root in (v for v in tree if tree.degree(v) == 1):
            roots += 1
            support = next(iter(tree.neighbors(root)))
            root_bit = 1 << engine.position[root]
            support_bit = 1 << engine.position[support]
            b_mask = full_mask & ~root_bit & ~support_bit
            c_mask = b_mask
            for neighbor in tree.neighbors(support):
                c_mask &= ~(1 << engine.position[neighbor])
            b_poly = engine.polynomial(b_mask)
            c_poly = engine.polynomial(c_mask)
            x = coefficient(b_poly, 3)
            y = coefficient(b_poly, 4)
            z = coefficient(b_poly, 5)
            u = coefficient(c_poly, 3)
            v = coefficient(c_poly, 4)
            exact = reduced_margin(x, y, z, u, v)
            # Twice the lower bound obtained from 2*z >= y.
            half_twice = 2 * reduced_margin(x, y, 0, u, v)
            t = y + u
            half_twice += 26 * x * y + 2 * t * y

            # The path-ratio candidate for a forest B of order N=n-2:
            # z/y >= (N-7)(N-8)/(5(N-3)).
            path_numerator = (args.order - 9) * (args.order - 10)
            path_denominator = 5 * (args.order - 5)
            path_scaled = path_denominator * reduced_margin(
                x, y, 0, u, v
            )
            path_scaled += (
                (26 * x + 2 * t) * path_numerator * y
            )

            # Candidate reverse rank-4 forest curvature:
            # 10*x*z >= 8*y^2 - 5*x*y, equivalently
            # lambda_3-lambda_4 <= 5/2.
            reverse_denominator = 10 * x
            reverse_numerator = 8 * y * y - 5 * x * y
            reverse_scaled = reverse_denominator * reduced_margin(
                x, y, 0, u, v
            )
            reverse_scaled += (
                (26 * x + 2 * t) * reverse_numerator
            )

            forest_order = args.order - 2
            path_drop = (
                Fraction(
                    (forest_order - 5) * (forest_order - 6),
                    forest_order - 2,
                )
                - Fraction(
                    (forest_order - 7) * (forest_order - 8),
                    forest_order - 3,
                )
            )
            path_drop_denominator = 5 * x * path_drop.denominator
            path_drop_numerator = (
                4 * y * y * path_drop.denominator
                - path_drop.numerator * x * y
            )
            path_drop_scaled = (
                path_drop_denominator
                * reduced_margin(x, y, 0, u, v)
                + (26 * x + 2 * t) * path_drop_numerator
            )
            paired_denominator = 10 * x * path_drop.denominator
            paired_numerator = (
                2 * path_drop_numerator
                + 15 * u * x * path_drop.denominator
            )
            paired_scaled = (
                paired_denominator
                * reduced_margin(x, y, 0, u, 0)
                + (26 * x + 2 * t) * paired_numerator
            )
            paired_7_4_denominator = (
                20 * x * path_drop.denominator
            )
            paired_7_4_numerator = (
                4 * path_drop_numerator
                + 35 * u * x * path_drop.denominator
            )
            paired_7_4_scaled = (
                paired_7_4_denominator
                * reduced_margin(x, y, 0, u, 0)
                + (26 * x + 2 * t) * paired_7_4_numerator
            )
            paired_inequality_slack = (
                (z + v) * paired_7_4_denominator
                - paired_7_4_numerator
            )
            branch_vertices = sum(
                tree.degree(vertex) >= 3 for vertex in tree
            )

            # Independently reconstruct the original definition.
            h = y + u
            k = z + v
            d = h + x
            e = k + y
            original = d * (2 * e + d) - 24 * (e * h - d * k)
            assert exact == original

            graph6 = (
                nx.to_graph6_bytes(tree, header=False)
                .decode("ascii")
                .strip()
            )
            if minimum_exact is None or exact < minimum_exact:
                minimum_exact = exact
                witness_exact = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                )
            if minimum_half is None or half_twice < minimum_half:
                minimum_half = half_twice
                witness_half = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                )
            if minimum_path is None or path_scaled < minimum_path:
                minimum_path = path_scaled
                witness_path = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                    (path_numerator, path_denominator),
                )
            if (
                minimum_reverse is None
                or reverse_scaled < minimum_reverse
            ):
                minimum_reverse = reverse_scaled
                witness_reverse = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                    (reverse_numerator, reverse_denominator),
                )
            if (
                minimum_path_drop is None
                or path_drop_scaled < minimum_path_drop
            ):
                minimum_path_drop = path_drop_scaled
                witness_path_drop = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                    (
                        path_drop_numerator,
                        path_drop_denominator,
                        path_drop,
                    ),
                )
            if minimum_paired is None or paired_scaled < minimum_paired:
                minimum_paired = paired_scaled
                witness_paired = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                    (paired_numerator, paired_denominator),
                )
            if (
                minimum_paired_7_4 is None
                or paired_7_4_scaled < minimum_paired_7_4
            ):
                minimum_paired_7_4 = paired_7_4_scaled
                witness_paired_7_4 = (
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                    (
                        paired_7_4_numerator,
                        paired_7_4_denominator,
                    ),
                )
            previous_paired = minimum_paired_inequality.get(
                branch_vertices
            )
            if (
                previous_paired is None
                or paired_inequality_slack < previous_paired[0]
            ):
                minimum_paired_inequality[branch_vertices] = (
                    paired_inequality_slack,
                    tree_index,
                    root,
                    support,
                    graph6,
                    (x, y, z, u, v),
                )
    print(
        f"n={args.order} trees={trees:,} roots={roots:,} "
        f"minimum_exact={minimum_exact} witness_exact={witness_exact}"
    )
    print(
        "  minimum_twice_zhalf_bound="
        f"{minimum_half} witness={witness_half}"
    )
    print(
        "  minimum_scaled_path_ratio_bound="
        f"{minimum_path} witness={witness_path}"
    )
    print(
        "  minimum_scaled_reverse_curvature_bound="
        f"{minimum_reverse} witness={witness_reverse}"
    )
    print(
        "  minimum_scaled_path_drop_bound="
        f"{minimum_path_drop} witness={witness_path_drop}"
    )
    print(
        "  minimum_scaled_paired_3half_bound="
        f"{minimum_paired} witness={witness_paired}"
    )
    print(
        "  minimum_scaled_paired_7over4_bound="
        f"{minimum_paired_7_4} witness={witness_paired_7_4}"
    )
    print(
        "  paired_7over4_inequality_by_branch_vertices="
        f"{dict(sorted(minimum_paired_inequality.items()))}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
