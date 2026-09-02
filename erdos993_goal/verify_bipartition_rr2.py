#!/usr/bin/env python3
"""Exact bipartition-count array for the 102-vertex certificate.

For a bipartite graph with sides X,Y, let c[p,q] count independent sets
using p vertices of X and q vertices of Y.  The oriented matching-block
model suggests that this array should be reverse-TP2:

    c[p,q] c[p+1,q+1] <= c[p+1,q] c[p,q+1].

This script computes the complete array by an independent bivariate tree DP,
checks every adjacent minor, and verifies that its antidiagonal sums recover
the univariate independence polynomial.
"""

from __future__ import annotations

from collections import defaultdict

from verify_perfect_matching_lc_failure import (
    decorated_polynomial,
    explicit_tree,
)


Polynomial = dict[tuple[int, int], int]


def add(left: Polynomial, right: Polynomial) -> Polynomial:
    result: defaultdict[tuple[int, int], int] = defaultdict(int)
    for key, value in left.items():
        result[key] += value
    for key, value in right.items():
        result[key] += value
    return dict(result)


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    result: defaultdict[tuple[int, int], int] = defaultdict(int)
    for (p, q), value in left.items():
        for (r, s), other in right.items():
            result[p + r, q + s] += value * other
    return dict(result)


def bivariate_polynomial(
    adjacency: list[list[int]],
) -> tuple[Polynomial, list[int]]:
    n = len(adjacency)
    side = [-1] * n
    side[0] = 0
    stack = [0]
    for v in stack:
        for w in adjacency[v]:
            if side[w] == -1:
                side[w] = 1 - side[v]
                stack.append(w)
            else:
                assert side[w] != side[v]

    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for v in order:
        for w in adjacency[v]:
            if w != parent[v]:
                parent[w] = v
                order.append(w)

    excluded: list[Polynomial] = [{} for _ in range(n)]
    included: list[Polynomial] = [{} for _ in range(n)]
    for v in reversed(order):
        e: Polynomial = {(0, 0): 1}
        i: Polynomial = {(1, 0): 1} if side[v] == 0 else {(0, 1): 1}
        for w in adjacency[v]:
            if parent[w] == v:
                e = multiply(e, add(excluded[w], included[w]))
                i = multiply(i, excluded[w])
        excluded[v] = e
        included[v] = i
    return add(excluded[0], included[0]), side


def main() -> None:
    adjacency = explicit_tree()
    bivariate, side = bivariate_polynomial(adjacency)
    size_x = side.count(0)
    size_y = side.count(1)
    assert size_x == size_y == 51

    array = [
        [bivariate.get((p, q), 0) for q in range(size_y + 1)]
        for p in range(size_x + 1)
    ]
    rr2_failures = []
    for p in range(size_x):
        for q in range(size_y):
            left = array[p][q] * array[p + 1][q + 1]
            right = array[p + 1][q] * array[p][q + 1]
            if left > right:
                rr2_failures.append((p, q, left, right))

    diagonal = [0] * (size_x + size_y + 1)
    for (p, q), value in bivariate.items():
        diagonal[p + q] += value
    while diagonal and diagonal[-1] == 0:
        diagonal.pop()
    assert diagonal == decorated_polynomial()

    row_lc_failures = []
    column_lc_failures = []
    for p, row in enumerate(array):
        positive = [value for value in row if value]
        for q in range(1, len(positive) - 1):
            if positive[q] ** 2 < positive[q - 1] * positive[q + 1]:
                row_lc_failures.append((p, q))
    for q in range(size_y + 1):
        positive = [array[p][q] for p in range(size_x + 1) if array[p][q]]
        for p in range(1, len(positive) - 1):
            if positive[p] ** 2 < positive[p - 1] * positive[p + 1]:
                column_lc_failures.append((p, q))

    print(f"bipartition sizes: {size_x}, {size_y}")
    print(f"nonzero bivariate coefficients: {len(bivariate)}")
    print(f"RR2 failures: {len(rr2_failures)}")
    print(f"row log-concavity failures: {len(row_lc_failures)}")
    print(f"column log-concavity failures: {len(column_lc_failures)}")
    print(f"diagonal degree: {len(diagonal) - 1}")
    if rr2_failures:
        print("first RR2 failure:", rr2_failures[0])
    if row_lc_failures:
        print("first row LC failure:", row_lc_failures[0])
    if column_lc_failures:
        print("first column LC failure:", column_lc_failures[0])
    print("diagonal reconstruction: passed")


if __name__ == "__main__":
    main()
