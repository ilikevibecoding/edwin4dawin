#!/usr/bin/env python3
"""Verify an exact motif formula for i_5 of a tree.

The inclusion-exclusion formula groups edge subsets by the number of
vertices in their union.  Besides wedges and connected 3-edge
subtrees, rank five needs the disconnected shape P3+K2 and the three
connected 4-edge tree shapes.
"""

from __future__ import annotations

from itertools import combinations
from math import comb

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def choose(n, k):
    return comb(n, k) if n >= k >= 0 else 0


def motifs(tree):
    edges = list(tree.edges())
    m = len(edges)
    wedge = sum(choose(tree.degree(v), 2) for v in tree)

    connected_three = 0
    disconnected_wedge_edge = 0
    for selected in combinations(edges, 3):
        vertices = set().union(*({a, b} for a, b in selected))
        if len(vertices) == 4:
            connected_three += 1
        elif len(vertices) == 5:
            disconnected_wedge_edge += 1

    connected_four = 0
    for selected in combinations(edges, 4):
        vertices = set().union(*({a, b} for a, b in selected))
        if len(vertices) == 5:
            connected_four += 1

    # Independent closed forms for the three motif totals.
    connected_three_formula = sum(
        choose(tree.degree(v), 3) for v in tree
    ) + sum(
        (tree.degree(a) - 1) * (tree.degree(b) - 1)
        for a, b in edges
    )
    disconnected_formula = (
        (m + 2) * wedge
        - sum(
            tree.degree(v) * choose(tree.degree(v), 2)
            for v in tree
        )
        - sum(
            (tree.degree(v) - 1)
            * sum(tree.degree(a) for a in tree.neighbors(v))
            for v in tree
        )
    )
    connected_four_formula = (
        sum(choose(tree.degree(v), 4) for v in tree)
        + sum(
            sum(
                (tree.degree(a) - 1)
                * choose(tree.degree(v) - 1, 2)
                for a in tree.neighbors(v)
            )
            for v in tree
        )
        + sum(
            sum(
                (tree.degree(a) - 1)
                * (tree.degree(b) - 1)
                for a, b in combinations(tree.neighbors(v), 2)
            )
            for v in tree
        )
    )
    assert connected_three == connected_three_formula
    assert disconnected_wedge_edge == disconnected_formula
    assert connected_four == connected_four_formula
    return (
        wedge,
        connected_three,
        disconnected_wedge_edge,
        connected_four,
    )


def predicted_i5(order, wedge, connected_three, disconnected, connected_four):
    m = order - 1
    return (
        choose(order, 5)
        - m * choose(order - 2, 3)
        + wedge * choose(order - 3, 2)
        + (choose(m, 2) - wedge) * (order - 4)
        - connected_three * (order - 4)
        - disconnected
        + connected_four
    )


def main() -> int:
    trees = 0
    for order in range(1, 13):
        iterator = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree in iterator:
            engine = MaskIndependencePolynomial(tree)
            polynomial = engine.polynomial((1 << order) - 1)
            actual = polynomial[5] if len(polynomial) > 5 else 0
            values = motifs(tree)
            assert predicted_i5(order, *values) == actual
            trees += 1
    print(
        "tree i5 motif formula: PASS "
        f"(all {trees:,} unlabeled trees through order 12)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
