#!/usr/bin/env python3
"""Exact residual after inserting the five-subtree reserve into q4<=q3.

This derives a sufficient degree-moment inequality for every nonstar tree.
It is an algebraic reduction only, not a proof that the residual is positive.
"""

from __future__ import annotations

import argparse
from math import comb

import networkx as nx
import sympy as sp


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe-min-order", type=int, default=4)
    parser.add_argument("--probe-max-order", type=int, default=0)
    args = parser.parse_args()
    n, N, B2, B3, B4, X, Omega = sp.symbols(
        "n N B2 B3 B4 X Omega", integer=True
    )
    i3 = sp.binomial(n - 2, 3) + B2
    i4 = sp.binomial(n - 3, 4) + (n - 5) * B2 - B3 - X
    s3 = 3 * sp.binomial(n - 3, 3) + (-2 * n + 11) * B2 + 3 * B3 + 3 * X
    s4 = (
        -24 * Omega
        + 18 * X * n
        - 108 * X
        + 18 * B3 * n
        - 126 * B3
        - 6 * B2 * n**2
        + 90 * B2 * n
        - 300 * B2
        + n**4
        - 22 * n**3
        + 179 * n**2
        - 638 * n
        + 840
    ) / 6
    margin = sp.expand_func(4 * i4 * s3 - 3 * i3 * s4).expand()
    omega_floor = B4 + B3 + B2 + X - (n - 4)
    residual_n = sp.factor(margin.subs(Omega, omega_floor))
    residual_N = sp.factor(sp.expand(residual_n.subs(n, N + 2)))
    omega_coefficient = sp.factor(sp.diff(margin, Omega))
    assert sp.expand_func(omega_coefficient - 12 * i3).expand() == 0
    assert sp.expand(
        margin - residual_n - omega_coefficient * (Omega - omega_floor)
    ) == 0

    print("omega_coefficient =", omega_coefficient)
    print("residual_n =")
    print(residual_n)
    print("residual_N =")
    print(residual_N)
    print("residual_N expanded =")
    print(sp.Poly(sp.expand(residual_N), B4, X, B3, B2, N))

    if args.probe_max_order:
        numerator, denominator = sp.together(residual_n).as_numer_denom()
        evaluate_numerator = sp.lambdify(
            (n, B2, B3, B4, X), numerator, modules="math"
        )
        checks = negatives = 0
        minimum = None
        witness = None
        compensation_ratio_minimum = None
        compensation_witness = None
        for order in range(args.probe_min_order, args.probe_max_order + 1):
            for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
                excess = {vertex: tree.degree(vertex) - 1 for vertex in tree}
                if max(excess.values()) == order - 2:
                    continue
                b2 = sum(comb(value, 2) for value in excess.values())
                b3 = sum(comb(value, 3) for value in excess.values())
                b4 = sum(comb(value, 4) for value in excess.values())
                x_value = (
                    sum(
                        excess[left] * excess[right]
                        for left, right in tree.edges()
                    )
                    - (order - 3)
                )
                value = int(evaluate_numerator(order, b2, b3, b4, x_value)) // int(denominator)
                y_value = sum(
                    comb(excess[left], 2) * excess[right]
                    + excess[left] * comb(excess[right], 2)
                    for left, right in tree.edges()
                )
                z_value = sum(
                    sum(
                        excess[left] * excess[right]
                        for index, left in enumerate(tree.neighbors(center))
                        for right in list(tree.neighbors(center))[index + 1 :]
                    )
                    for center in tree
                )
                surplus = y_value - b2 - x_value + z_value
                i3_value = comb(order - 2, 3) + b2
                actual_margin = value + 12 * i3_value * surplus
                assert actual_margin >= 0
                checks += 1
                negatives += value < 0
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                        "B2": b2,
                        "B3": b3,
                        "B4": b4,
                        "X": x_value,
                        "residual": value,
                    }
                if value < 0:
                    ratio = sp.Rational(12 * i3_value * surplus, -value)
                    if (
                        compensation_ratio_minimum is None
                        or ratio < compensation_ratio_minimum
                    ):
                        compensation_ratio_minimum = ratio
                        compensation_witness = {
                            "order": order,
                            "tree_index": tree_index,
                            "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                            "B2": b2,
                            "B3": b3,
                            "B4": b4,
                            "X": x_value,
                            "Y": y_value,
                            "Z": z_value,
                            "surplus": surplus,
                            "residual": value,
                            "actual_margin": actual_margin,
                            "compensation_ratio": str(ratio),
                        }
            print(f"probe n={order}: checks={checks:,} negatives={negatives:,}")
        print("probe minimum:", minimum, witness)
        print("probe compensation minimum:", compensation_ratio_minimum, compensation_witness)


if __name__ == "__main__":
    main()
