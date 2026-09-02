#!/usr/bin/env python3
"""Prove a sharp rank-(3,4,5) coefficient defect bound for trees.

The theorem is

    3575 i_3(T) i_5(T) - 2016 i_4(T)^2 >= 0

for every tree T of order at least 16.  Equality occurs for P_16.

Orders 16, 17, and 18 are checked over all unlabeled trees.  Every
order n>=19 follows from two exact double-counting/Cauchy inequalities.
"""

from __future__ import annotations

from math import comb

import networkx as nx
import sympy as sp


TREE_COUNTS = {
    16: 19320,
    17: 48629,
    18: 123867,
}

EXPECTED_MINIMA = {
    16: 0,
    17: 73432359,
    18: 251742400,
}


def add(left, right, rank=5):
    result = [0] * (rank + 1)
    for index in range(rank + 1):
        result[index] = (
            (left[index] if index < len(left) else 0)
            + (right[index] if index < len(right) else 0)
        )
    return result


def multiply(left, right, rank=5):
    result = [0] * (rank + 1)
    for left_index, left_value in enumerate(left):
        if not left_value:
            continue
        for right_index, right_value in enumerate(right):
            if left_index + right_index > rank:
                break
            result[left_index + right_index] += (
                left_value * right_value
            )
    return result


def independence_prefix(tree, rank=5):
    """Return i_0,...,i_rank by a rooted tree recurrence."""

    root = next(iter(tree))
    parent = {root: None}
    order = [root]
    for vertex in order:
        for neighbor in tree[vertex]:
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            order.append(neighbor)

    excluded = {}
    total = {}
    for vertex in reversed(order):
        out = [1] + [0] * rank
        inside = [0, 1] + [0] * (rank - 1)
        for neighbor in tree[vertex]:
            if parent.get(neighbor) != vertex:
                continue
            out = multiply(out, total[neighbor], rank)
            inside = multiply(inside, excluded[neighbor], rank)
        excluded[vertex] = out
        total[vertex] = add(out, inside, rank)
    return total[root]


def defect(polynomial):
    return (
        3575 * polynomial[3] * polynomial[5]
        - 2016 * polynomial[4] ** 2
    )


def finite_verification():
    results = {}
    for order, expected_count in TREE_COUNTS.items():
        count = 0
        minimum = None
        witnesses = []
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            polynomial = independence_prefix(tree)
            value = defect(polynomial)
            if minimum is None or value < minimum:
                minimum = value
                witnesses = [
                    (
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        tuple(polynomial[3:6]),
                    )
                ]
            elif value == minimum:
                witnesses.append(
                    (
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        tuple(polynomial[3:6]),
                    )
                )

        assert count == expected_count
        assert minimum == EXPECTED_MINIMA[order]
        assert minimum >= 0

        path = nx.path_graph(order)
        path_polynomial = independence_prefix(path)
        assert defect(path_polynomial) == minimum
        assert tuple(path_polynomial[3:6]) == (
            comb(order - 2, 3),
            comb(order - 3, 4),
            comb(order - 4, 5),
        )
        results[order] = (count, minimum, witnesses)
    return results


def symbolic_large_order_verification():
    n = sp.symbols("n", integer=True, positive=True)
    i2, i3, i4, i5 = sp.symbols(
        "i2 i3 i4 i5", positive=True
    )

    # For any forest G and k>=0, double-count two-vertex extensions of
    # independent k-sets.  If e is the number of available extension
    # vertices, the residual induced graph is a forest and has at least
    # e(e-3)/2 independent pairs.  Cauchy then gives, for k=3,
    #
    # i5 >= 4 i4^2/(5 i3) - 3 i4/5.
    i5_lower = 4 * i4**2 / (5 * i3) - 3 * i4 / 5
    reduced_defect = sp.factor(
        (
            3575 * i3 * i5 - 2016 * i4**2
        ).subs(i5, i5_lower)
    )
    assert sp.expand(
        reduced_defect - i4 * (844 * i4 - 2145 * i3)
    ) == 0

    # The same extension inequality at k=2 gives
    # i4/i3 >= (3/4)(i3/i2-1).
    ratio_lower_from_extension = sp.Rational(3, 4) * (
        i3 / i2 - 1
    )

    # For an n-vertex tree, i2=C(n-1,2).  Inclusion-exclusion gives
    # i3 >= C(n-2,3), because sum_v C(d(v),2)>=n-2.
    tree_ratio_lower = sp.factor(
        ratio_lower_from_extension.subs(
            {
                i2: sp.binomial(n - 1, 2),
                i3: sp.binomial(n - 2, 3),
            }
        )
    )
    expected_ratio_lower = (n**2 - 10 * n + 15) / (
        4 * (n - 1)
    )
    assert sp.simplify(
        tree_ratio_lower - expected_ratio_lower
    ) == 0
    tree_ratio_lower = expected_ratio_lower

    threshold_numerator = sp.factor(
        844 * (n**2 - 10 * n + 15)
        - 4 * 2145 * (n - 1)
    )
    assert sp.expand(
        threshold_numerator
        - 4 * (211 * n**2 - 4255 * n + 5310)
    ) == 0
    threshold_core = 211 * n**2 - 4255 * n + 5310
    assert threshold_core.subs(n, 19) == 636
    assert sp.diff(threshold_core, n).subs(n, 19) > 0
    assert sp.diff(threshold_core, n, 2) > 0

    return {
        "i5_lower": i5_lower,
        "reduced_defect": reduced_defect,
        "tree_ratio_lower": tree_ratio_lower,
        "threshold_numerator": threshold_numerator,
    }


def main() -> int:
    symbolic = symbolic_large_order_verification()
    finite = finite_verification()

    print(
        "tree rank-(3,4,5) defect ceiling: PASS "
        "(symbolic n>=19; exhaustive n=16,17,18)"
    )
    print(
        "large-order ratio lower bound: "
        f"i4/i3 >= {symbolic['tree_ratio_lower']}"
    )
    for order, (count, minimum, witnesses) in finite.items():
        print(
            f"n={order}: trees={count:,}, minimum={minimum}, "
            f"minimizers={len(witnesses)}, first={witnesses[0]}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
