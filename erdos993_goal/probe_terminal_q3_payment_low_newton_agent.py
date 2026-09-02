#!/usr/bin/env python3
"""Exact diagnostic for the eight low Newton coefficients of terminal payment.

This is deliberately a probe, not a theorem certificate.  For each marked
tree and supported target rank it evaluates the literal untruncated payment
at t=1,...,8 and takes forward differences.  The m-th forward difference at
t=1 is the coefficient of binom(t-1,m).
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

import networkx as nx

from probe_terminal_payment_three_lemma_root import (
    coefficient,
    independence_polynomial,
    isolate_transform,
    one_edge_sequence,
)


def differences(values: list[int]) -> list[int]:
    output = []
    row = values[:]
    while row:
        output.append(row[0])
        row = [row[index + 1] - row[index] for index in range(len(row) - 1)]
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=15)
    parser.add_argument("--tree-start", type=int, default=0)
    parser.add_argument("--tree-stop", type=int)
    parser.add_argument("--min-j", type=int, default=3)
    args = parser.parse_args()

    minima: list[tuple[Fraction, tuple] | None] = [None] * 8
    negatives: list[tuple | None] = [None] * 8
    b_minima: list[tuple[Fraction, tuple] | None] = [None] * 5
    b_negatives: list[tuple | None] = [None] * 5
    star_minima: list[tuple[Fraction, tuple] | None] = [None] * 8
    star_negatives: list[tuple | None] = [None] * 8
    checks = 0
    trees = nx.nonisomorphic_trees(args.order)
    for tree_index, tree in enumerate(trees):
        if tree_index < args.tree_start:
            continue
        if args.tree_stop is not None and tree_index >= args.tree_stop:
            break
        tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
        graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
        g = independence_polynomial(tree)
        z_g = one_edge_sequence(tree)
        isolate_g = [isolate_transform(g, t) for t in range(1, 9)]
        isolate_z_g = [isolate_transform(z_g, t) for t in range(1, 9)]
        for root in tree:
            f_graph = tree.copy()
            f_graph.remove_node(root)
            h_graph = tree.copy()
            h_graph.remove_nodes_from({root, *tree.neighbors(root)})
            f = independence_polynomial(f_graph)
            z = one_edge_sequence(f_graph)
            h = independence_polynomial(h_graph)
            f2 = coefficient(f, 2)
            if f2 == 0:
                continue
            z2 = coefficient(z, 2)
            h2 = coefficient(h, 2)
            for j in range(args.min_j, len(f)):
                fj = coefficient(f, j)
                if fj == 0:
                    continue
                zj = coefficient(z, j)
                hj = coefficient(h, j)
                values = []
                b_values = []
                star_values = []
                for offset, t in enumerate(range(1, 9)):
                    A3 = coefficient(isolate_g[offset], 3)
                    c0 = coefficient(isolate_z_g[offset], 3)
                    c1 = z2 + h2 + t * f2
                    D1 = (j + 1) * fj
                    C1 = zj + hj + t * fj
                    M1 = c1 * D1 - 3 * f2 * C1
                    U = coefficient(isolate_g[offset], j + 1)
                    anchor = A3 * c1 - f2 * c0
                    weight = A3 * fj - f2 * U
                    b_values.append(
                        (j + 1) * fj * (c0 + c1)
                        - 3 * C1 * (A3 + f2)
                    )
                    # This is delta; the literal Delta in the recurrence is 9*delta.
                    margin = A3 * (A3 + f2) * M1 - (j + 1) * anchor * weight
                    values.append(margin)
                    star_values.append(
                        args.order * A3 * (A3 + f2) * M1
                        - (args.order + 3) * (j + 1) * anchor * weight
                    )
                newton = differences(values)
                b_newton = differences(b_values)
                star_newton = differences(star_values)
                scale = max(1, values[0])
                witness = (tree_index, graph6, root, j + 1, values, newton)
                for m, value in enumerate(newton):
                    ratio = Fraction(value, scale)
                    if minima[m] is None or ratio < minima[m][0]:
                        minima[m] = (ratio, witness)
                    if value < 0 and negatives[m] is None:
                        negatives[m] = witness
                b_scale = max(1, abs(b_values[0]))
                for m, value in enumerate(b_newton[:5]):
                    ratio = Fraction(value, b_scale)
                    if b_minima[m] is None or ratio < b_minima[m][0]:
                        b_minima[m] = (ratio, witness + (b_values, b_newton))
                    if value < 0 and b_negatives[m] is None:
                        b_negatives[m] = witness + (b_values, b_newton)
                star_scale = max(1, abs(star_values[0]))
                for m, value in enumerate(star_newton):
                    ratio = Fraction(value, star_scale)
                    if star_minima[m] is None or ratio < star_minima[m][0]:
                        star_minima[m] = (
                            ratio,
                            witness + (star_values, star_newton),
                        )
                    if value < 0 and star_negatives[m] is None:
                        star_negatives[m] = (
                            witness + (star_values, star_newton)
                        )
                checks += 1
        if tree_index % 100 == 0:
            print(f"tree={tree_index} checks={checks:,}", flush=True)

    print(f"checks={checks:,}")
    for m in range(8):
        print(f"m={m} negative={negatives[m]!r}")
        print(f"m={m} minimum={minima[m]!r}")
    for m in range(5):
        print(f"B_m={m} negative={b_negatives[m]!r}")
        print(f"B_m={m} minimum={b_minima[m]!r}")
    for m in range(8):
        print(f"star_m={m} negative={star_negatives[m]!r}")
        print(f"star_m={m} minimum={star_minima[m]!r}")


if __name__ == "__main__":
    main()
