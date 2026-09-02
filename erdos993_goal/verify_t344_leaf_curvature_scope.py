#!/usr/bin/env python3
"""Verify the tail-only leaf-curvature failure of T_{3,4,4}."""

from __future__ import annotations

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    coeff,
    factorial_transform,
)
from random_acwf_leaf_monotonicity_scan import rooted_state


def build_t3mn(m: int, n: int) -> tuple[nx.Graph, int, list[int]]:
    tree = nx.Graph()
    root = 0
    next_vertex = 1
    outer_leaves: list[int] = []
    for child_count in (3, m, n):
        first_child = next_vertex
        next_vertex += 1
        tree.add_edge(root, first_child)
        for _ in range(child_count):
            second_child = next_vertex
            leaf = next_vertex + 1
            next_vertex += 2
            tree.add_edge(first_child, second_child)
            tree.add_edge(second_child, leaf)
            outer_leaves.append(leaf)
    return tree, root, outer_leaves


def curvature(factorial_coefficients: list[int], k: int) -> int:
    return (
        coeff(factorial_coefficients, k) ** 2
        - coeff(factorial_coefficients, k - 1)
        * coeff(factorial_coefficients, k + 1)
    )


def main() -> int:
    tree, root, outer_leaves = build_t3mn(4, 4)
    assert tree.number_of_nodes() == 26
    assert tree.number_of_edges() == 25
    assert len(outer_leaves) == 11

    _U, _D, polynomial, _q = rooted_state(tree, root)
    expected = [
        1,
        26,
        300,
        2040,
        9142,
        28551,
        63933,
        103736,
        121376,
        100144,
        55499,
        18683,
        2979,
        51,
        1,
    ]
    assert polynomial == expected
    alpha = len(polynomial) - 1
    cutoff = (2 * alpha + 1) // 3
    assert alpha == 14
    assert cutoff == 9

    transformed = factorial_transform(polynomial)
    negative_curvatures = [
        (k, curvature(transformed, k))
        for k in range(len(transformed))
        if curvature(transformed, k) < 0
    ]
    assert [k for k, _value in negative_curvatures] == [13]

    for leaf in outer_leaves:
        reduced = tree.copy()
        reduced.remove_node(leaf)
        reduced_polynomial = rooted_state(reduced, root)[2]
        reduced_transformed = factorial_transform(reduced_polynomial)
        negative_deltas = [
            (
                k,
                curvature(transformed, k)
                - curvature(reduced_transformed, k),
            )
            for k in range(
                max(len(transformed), len(reduced_transformed))
            )
            if (
                curvature(transformed, k)
                - curvature(reduced_transformed, k)
            )
            < 0
        ]
        assert negative_deltas
        assert all(k == 13 for k, _value in negative_deltas)
        assert all(k >= cutoff for k, _value in negative_deltas)

    print("T_{3,4,4} leaf-curvature scope certificate: PASS")
    print("alpha:", alpha, "cutoff:", cutoff)
    print("negative curvature:", negative_curvatures)
    print("outer leaves checked:", len(outer_leaves))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
