#!/usr/bin/env python3
"""Exact certificate for the strong 32-vertex log-concavity defect.

This tree was retained by the older evolutionary search because its terminal
independence coefficients are (11818, 89, 1), giving the unusually large
log-concavity ratio 11818/89^2.  The script reconstructs the graph from an
edge list, verifies that it is a tree, recomputes its full independence
polynomial by generic vertex-level DP, and checks every claimed property.
"""

from __future__ import annotations

from verify_perfect_matching_lc_failure import generic_tree_polynomial


EDGES = [
    (0, 20),
    (0, 31),
    (1, 11),
    (1, 20),
    (2, 12),
    (2, 21),
    (3, 13),
    (3, 21),
    (4, 14),
    (4, 21),
    (5, 15),
    (5, 21),
    (6, 16),
    (6, 22),
    (7, 17),
    (7, 22),
    (8, 18),
    (8, 22),
    (9, 19),
    (9, 22),
    (10, 20),
    (10, 21),
    (10, 22),
    (20, 23),
    (23, 24),
    (25, 28),
    (25, 31),
    (26, 29),
    (26, 31),
    (27, 30),
    (27, 31),
]

EXPECTED = [
    1,
    32,
    465,
    4079,
    24208,
    103176,
    326882,
    785311,
    1444705,
    2038009,
    2189235,
    1760579,
    1027270,
    411255,
    101405,
    11818,
    89,
    1,
]


def adjacency() -> list[list[int]]:
    result = [[] for _ in range(32)]
    for left, right in EDGES:
        result[left].append(right)
        result[right].append(left)
    return result


def main() -> None:
    graph = adjacency()
    assert len(EDGES) == len(graph) - 1

    seen = {0}
    stack = [0]
    while stack:
        vertex = stack.pop()
        for neighbour in graph[vertex]:
            if neighbour not in seen:
                seen.add(neighbour)
                stack.append(neighbour)
    assert seen == set(range(32))

    polynomial = generic_tree_polynomial(graph)
    assert polynomial == EXPECTED
    assert len(polynomial) - 1 == 17

    failures = [
        k
        for k in range(1, len(polynomial) - 1)
        if polynomial[k] ** 2 < polynomial[k - 1] * polynomial[k + 1]
    ]
    assert failures == [16]
    assert polynomial[15:18] == [11818, 89, 1]
    defect = polynomial[15] * polynomial[17] - polynomial[16] ** 2
    assert defect == 3897

    first_descent = next(
        k
        for k in range(len(polynomial) - 1)
        if polynomial[k + 1] < polynomial[k]
    )
    assert first_descent == 10
    assert all(
        polynomial[k + 1] <= polynomial[k]
        for k in range(first_descent, len(polynomial) - 1)
    )

    print("order: 32")
    print("edges: 31")
    print("independence degree: 17")
    print("first descent: 10")
    print("log-concavity failures: [16]")
    print("terminal defect 11818*1-89^2: 3897")
    print("all exact assertions passed")


if __name__ == "__main__":
    main()
