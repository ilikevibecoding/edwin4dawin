#!/usr/bin/env python3
"""Verify the rank-6 prefix cases below the order-13 theorem threshold."""

from __future__ import annotations

import networkx as nx

from verify_prefix_two_over_k_variance_reduction import (
    forest_independence_polynomial,
)


EXPECTED_TREES = {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 3,
    6: 6,
    7: 11,
    8: 23,
    9: 47,
    10: 106,
    11: 235,
    12: 551,
}


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def main() -> None:
    rows = []
    for order in range(1, 13):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        tree_count = 0
        applicable = 0
        minimum = None
        for tree in trees:
            tree_count += 1
            poly = forest_independence_polynomial(tree)
            alpha = len(poly) - 1
            cutoff = (2 * alpha + 1) // 3
            if 6 >= cutoff:
                continue
            applicable += 1
            q6 = (
                12 * coefficient(poly, 6) ** 2
                - coefficient(poly, 5) * coefficient(poly, 6)
                - 14
                * coefficient(poly, 5)
                * coefficient(poly, 7)
            )
            assert q6 >= 0
            minimum = q6 if minimum is None else min(minimum, q6)
        assert tree_count == EXPECTED_TREES[order]
        rows.append((order, tree_count, applicable, minimum))

    assert rows[-2][2:] == (1, 52920)
    assert rows[-1][2:] == (10, 43624)
    print(
        "rank-6 prefix cases below order 13: CERTIFIED "
        "applicable_trees=11"
    )
    print("order 11: applicable=1 minimum_Q6=52920")
    print("order 12: applicable=10 minimum_Q6=43624")


if __name__ == "__main__":
    main()
