#!/usr/bin/env python3
"""Exact certificate for a perfect-matching tree that is not log-concave.

The tree starts from the six-vertex skeleton

    2--1--0--3--4
          |
          5

and attaches t[v] vertex-disjoint paths of length two at skeleton vertex v.
All arithmetic is exact.  Two unrelated computations of the independence
polynomial are compared:

1. the closed decorated-skeleton recurrence; and
2. ordinary vertex-level tree dynamic programming on all 102 vertices.
"""

from __future__ import annotations

from flint import fmpz_poly


SKELETON_EDGES = [(0, 1), (0, 3), (0, 5), (1, 2), (3, 4)]
DECORATIONS = [1, 8, 13, 9, 12, 5]


def decorated_polynomial() -> list[int]:
    """Use the exact two-state recurrence on the decorated skeleton."""

    adjacency = [[] for _ in range(6)]
    for u, v in SKELETON_EDGES:
        adjacency[u].append(v)
        adjacency[v].append(u)

    parent = {0: -1}
    order = [0]
    for v in order:
        for w in adjacency[v]:
            if w != parent[v]:
                parent[w] = v
                order.append(w)

    x = fmpz_poly([0, 1])
    one_plus_x = fmpz_poly([1, 1])
    one_plus_2x = fmpz_poly([1, 2])
    excluded: dict[int, fmpz_poly] = {}
    included: dict[int, fmpz_poly] = {}

    for v in reversed(order):
        e = one_plus_2x ** DECORATIONS[v]
        i = x * (one_plus_x ** DECORATIONS[v])
        for w in adjacency[v]:
            if parent.get(w) == v:
                e *= excluded[w] + included[w]
                i *= excluded[w]
        excluded[v] = e
        included[v] = i

    return [int(c) for c in excluded[0] + included[0]]


def explicit_tree() -> list[list[int]]:
    """Expand every decoration into paths v--a--b."""

    adjacency = [[] for _ in range(6 + 2 * sum(DECORATIONS))]

    def add_edge(u: int, v: int) -> None:
        adjacency[u].append(v)
        adjacency[v].append(u)

    for u, v in SKELETON_EDGES:
        add_edge(u, v)

    nxt = 6
    for v, count in enumerate(DECORATIONS):
        for _ in range(count):
            add_edge(v, nxt)
            add_edge(nxt, nxt + 1)
            nxt += 2
    assert nxt == len(adjacency)
    return adjacency


def generic_tree_polynomial(adjacency: list[list[int]]) -> list[int]:
    """Ordinary vertex-level include/exclude DP."""

    parent = {0: -1}
    order = [0]
    for v in order:
        for w in adjacency[v]:
            if w != parent[v]:
                parent[w] = v
                order.append(w)

    x = fmpz_poly([0, 1])
    excluded: dict[int, fmpz_poly] = {}
    included: dict[int, fmpz_poly] = {}
    for v in reversed(order):
        e = fmpz_poly([1])
        i = x
        for w in adjacency[v]:
            if parent.get(w) == v:
                e *= excluded[w] + included[w]
                i *= excluded[w]
        excluded[v] = e
        included[v] = i
    return [int(c) for c in excluded[0] + included[0]]


def main() -> None:
    adjacency = explicit_tree()
    fast = decorated_polynomial()
    slow = generic_tree_polynomial(adjacency)
    assert fast == slow

    n = len(adjacency)
    alpha = len(fast) - 1
    assert n == 102
    assert alpha == 51
    assert sum(len(row) for row in adjacency) // 2 == n - 1

    # An explicit perfect matching: match the skeleton by
    # (0,5),(1,2),(3,4), and match the two internal vertices on every
    # attached length-two path.
    matching = {(0, 5), (1, 2), (3, 4)}
    for a in range(6, n, 2):
        matching.add((a, a + 1))
    covered = {v for edge in matching for v in edge}
    assert len(matching) == n // 2
    assert covered == set(range(n))
    assert all(v in adjacency[u] for u, v in matching)

    lc_failures = [
        k
        for k in range(1, alpha)
        if fast[k] * fast[k] < fast[k - 1] * fast[k + 1]
    ]
    assert lc_failures == [50]
    assert fast[49:52] == [
        154683872968704,
        111690907648,
        82051072,
    ]
    defect = fast[49] * fast[51] - fast[50] ** 2
    assert defect == 217118746959920758784

    first_descent = next(
        k for k in range(alpha) if fast[k] >= fast[k + 1]
    )
    assert first_descent == 32
    assert all(fast[k] >= fast[k + 1] for k in range(first_descent, alpha))

    # Prefix 2SB from TWO_STEP_EXTENSION_REDUCTION_2026-07-24.md.
    tail_start = (2 * alpha + 1) // 3
    assert tail_start == 34
    for k in range(tail_start - 2):
        left = (k + 3) * fast[k + 3] * fast[k]
        right = ((k + 1) * fast[k + 1] + 2 * fast[k]) * fast[k + 2]
        assert left <= right

    print(f"order: {n}")
    print(f"independence degree: {alpha}")
    print(f"perfect matching size: {len(matching)}")
    print(f"first descent: {first_descent}")
    print(f"log-concavity failures: {lc_failures}")
    print(f"top defect a49*a51-a50^2: {defect}")
    print("prefix 2SB: passed")
    print("all exact assertions passed")


if __name__ == "__main__":
    main()
