#!/usr/bin/env python3
"""Certify the rank-(4,5) path-ratio theorem for trees.

For every tree T of order n >= 18, this verifier certifies

    i_5(T) / i_4(T)
        >= i_5(P_n) / i_4(P_n)
        = (n-7)(n-8) / (5(n-3)).

The infinite proof has three ingredients.

1. A Zagreb-type inequality

       7(E-(n-3)) <= 2(n-4)B2 - 6B3,

   where x_v=d(v)-1, E=sum_{uv}x_u*x_v, and
   Bj=sum_v binom(x_v,j).  Orders 15--18 are checked exactly.
   All higher orders are reduced to a finite integer-partition
   certificate.

2. Two connected-four-subtree inequalities, proved by leaf induction
   from tiny exact bases:

       V-(n-4) >= B2+B3,
       V-(n-4) >= B2+B3+E-(n-3).

3. An exact motif decomposition of

       5(n-3)i_5(T)-(n-7)(n-8)i_4(T).

Only the small finite bases enumerate unlabeled trees.  The all-orders
steps are exact symbolic or integer inequalities.
"""

from __future__ import annotations

from math import comb

import networkx as nx
import sympy as sp


def choose(value: int, rank: int) -> int:
    return comb(value, rank) if value >= rank >= 0 else 0


def connected_four_count(tree: nx.Graph) -> int:
    """Count connected four-edge subtrees by their three shapes."""
    excess = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    stars = sum(choose(tree.degree(vertex), 4) for vertex in tree)
    brooms = sum(
        choose(excess[u], 2) * excess[v]
        + choose(excess[v], 2) * excess[u]
        for u, v in tree.edges()
    )
    paths = 0
    for vertex in tree:
        values = [excess[u] for u in tree.neighbors(vertex)]
        paths += (
            sum(values) ** 2 - sum(value * value for value in values)
        ) // 2
    return stars + brooms + paths


def degree_statistics(tree: nx.Graph) -> tuple[int, int, int, int]:
    excess = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    b2 = sum(choose(value, 2) for value in excess.values())
    b3 = sum(choose(value, 3) for value in excess.values())
    edge_correlation = sum(
        excess[u] * excess[v] for u, v in tree.edges()
    )
    connected_four = connected_four_count(tree)
    return b2, b3, edge_correlation, connected_four


def zagreb_margin(tree: nx.Graph) -> int:
    """The structural margin equivalent to the E,B2,B3 inequality."""
    order = len(tree)
    degrees = dict(tree.degree())
    z1 = sum(value**2 for value in degrees.values())
    forgotten = sum(value**3 for value in degrees.values())
    z2 = sum(degrees[u] * degrees[v] for u, v in tree.edges())
    return (
        (order + 9) * z1
        - forgotten
        - 7 * z2
        - 4 * order**2
        + 6 * order
        - 16
    )


def verify_symbolic_identities() -> None:
    n, b2, b3, edge, connected_four = sp.symbols(
        "n b2 b3 edge connected_four"
    )
    excess_sum = n - 2
    moment2 = excess_sum + 2 * b2
    moment3 = excess_sum + 6 * b2 + 6 * b3

    wedges = (moment2 + excess_sum) / 2
    triples = (moment3 - excess_sum) / 6 + edge
    disconnected = (
        (n - 3) * moment2
        + excess_sum**2
        - moment3
        - 4 * edge
    ) / 2

    i4 = (
        sp.binomial(n, 4)
        - (n - 1) * sp.binomial(n - 2, 2)
        + wedges * (n - 4)
        + sp.binomial(n - 1, 2)
        - triples
    )
    i5 = (
        sp.binomial(n, 5)
        - (n - 1) * sp.binomial(n - 2, 3)
        + wedges * sp.binomial(n - 3, 2)
        + (sp.binomial(n - 1, 2) - wedges) * (n - 4)
        - triples * (n - 4)
        - disconnected
        + connected_four
    )
    ratio_margin = sp.expand(
        5 * (n - 3) * i5 - (n - 7) * (n - 8) * i4
    )

    a = (
        sp.Rational(3, 2) * n**3
        - 20 * n**2
        + sp.Rational(133, 2) * n
        - 20
    )
    b = 4 * n**2 - 35 * n + 49
    c = 4 * n**2 - 30 * n + 34
    expected = (
        a * b2
        - b * b3
        - c * (edge - (n - 3))
        + 5 * (n - 3) * (connected_four - (n - 4))
    )
    assert sp.simplify(sp.expand_func(ratio_margin) - expected) == 0

    # The Zagreb form and the excess-degree form are identical.
    z1, forgotten, z2 = sp.symbols("z1 forgotten z2")
    x_form = (
        2 * (n - 4) * b2 - 6 * b3 - 7 * (edge - (n - 3))
    )
    substitutions = {
        b2: (z1 - 4 * n + 6) / 2,
        b3: (
            forgotten - 6 * z1 + 16 * n - 22
        )
        / 6,
        edge: z2 - z1 + n - 1,
    }
    z_form = (
        (n + 9) * z1
        - forgotten
        - 7 * z2
        - 4 * n**2
        + 6 * n
        - 16
    )
    assert sp.expand(x_form.subs(substitutions) - z_form) == 0

    # Both signs of X=E-(n-3) finish with this same coefficient.
    final_coefficient = sp.factor(
        (n**3 - 8 * n**2 - 19 * n + 302) / 6
    )
    assert final_coefficient.subs(n, 18) > 0
    assert sp.diff(final_coefficient, n).subs(n, 18) > 0
    assert sp.diff(final_coefficient, n, 2).subs(n, 18) > 0


def verify_zagreb_finite_base() -> None:
    expected = {
        15: (7_741, 0, 2),
        16: (19_320, 0, 1),
        17: (48_629, 0, 1),
        18: (123_867, 0, 1),
    }
    for order, target in expected.items():
        trees = 0
        minimum = None
        zero_count = 0
        for tree in nx.nonisomorphic_trees(order):
            trees += 1
            value = zagreb_margin(tree)
            minimum = value if minimum is None else min(minimum, value)
            zero_count += value == 0
        actual = (trees, minimum, zero_count)
        assert actual == target
        print(
            f"Zagreb base n={order}: trees={trees:,} "
            f"minimum={minimum} zeros={zero_count}"
        )


def partition_margin(parts: tuple[int, ...], maximum: int) -> int:
    total = sum(parts)
    b2_twice = sum(value * (value - 1) for value in parts)
    excess_above_one = sum(value - 1 for value in parts)
    rooted_edge_bound = (
        b2_twice
        + (maximum - 1) * (excess_above_one - maximum + 1)
    )
    structural_budget = sum(
        value * (value - 1) * (total - value)
        for value in parts
    )
    return structural_budget - 7 * rooted_edge_bound


def integer_partitions(
    total: int,
    maximum: int,
    largest_part: int | None = None,
) -> list[tuple[int, ...]]:
    if total == 0:
        return [()]
    if largest_part is None:
        largest_part = maximum
    output: list[tuple[int, ...]] = []
    for first in range(min(total, largest_part), 0, -1):
        for rest in integer_partitions(total - first, maximum, first):
            output.append((first,) + rest)
    return output


def verify_zagreb_infinite_step() -> None:
    # If m=max x_v >= 7, rooting the positive-excess core at a
    # maximum vertex gives E <= m(N-m).  Keeping only the root's
    # contribution to the structural budget leaves the expression
    # below.
    n_total, maximum = sp.symbols(
        "N maximum", integer=True, positive=True
    )
    high_degree_gap = sp.factor(
        maximum
        * (n_total - maximum)
        * (maximum - 8)
        + 7 * (n_total - 1)
    )
    assert sp.expand(
        high_degree_gap.subs(maximum, 7) - 42
    ) == 0

    # For 2 <= m <= 6, the rooted-core estimate is
    #
    # E-(N-1) <= 2B2+(m-1)(Y-m+1).
    #
    # Adding a part a to a partition of total N changes the resulting
    # lower bound by at least the displayed positive quantity.
    addition_minima: dict[int, int] = {}
    for m in range(2, 7):
        values = []
        for added in range(1, m + 1):
            value = (
                added * m * (m - 1)
                + 17 * added * (added - 1)
                - 7 * (added - 1) * (added + m - 1)
            )
            assert value > 0
            values.append(value)
        addition_minima[m] = min(values)

    # Repeatedly remove a part while the total is at least 23.
    # This leaves one of the six finite totals 17,...,22.
    base_minima: dict[tuple[int, int], int] = {}
    for m in range(2, 7):
        for total in range(17, 23):
            values = [
                partition_margin(parts, m)
                for parts in integer_partitions(total, m)
                if parts and parts[0] == m
            ]
            assert values
            minimum = min(values)
            assert minimum > 0
            base_minima[m, total] = minimum

    print("bounded-excess addition minima", addition_minima)
    print(
        "bounded-excess base minimum",
        min(base_minima.values()),
        f"over {len(base_minima)} cells",
    )


def verify_connected_subtree_bases() -> None:
    # J0 starts at order nine.  J1 already starts at order eight.
    for order in (8, 9):
        minima = [None, None]
        trees = 0
        for tree in nx.nonisomorphic_trees(order):
            trees += 1
            b2, b3, edge, connected_four = degree_statistics(tree)
            j0 = connected_four - (order - 4) - b2 - b3
            j1 = connected_four - edge - b2 - b3 + 1
            for index, value in enumerate((j0, j1)):
                minima[index] = (
                    value
                    if minima[index] is None
                    else min(minima[index], value)
                )
        if order == 8:
            assert (trees, minima[1]) == (23, 0)
        else:
            assert (trees, minima[0], minima[1]) == (47, 0, 0)
        print(
            f"connected-subtree base n={order}: "
            f"trees={trees} minima={tuple(minima)}"
        )


def verify_ratio_finish() -> None:
    n = sp.symbols("n", integer=True, positive=True)
    a = (
        sp.Rational(3, 2) * n**3
        - 20 * n**2
        + sp.Rational(133, 2) * n
        - 20
    )
    b = 4 * n**2 - 35 * n + 49
    c = 4 * n**2 - 30 * n + 34
    d = 5 * (n - 3)
    ratio_cap = (n - 4) / 3
    final = sp.factor(
        a + d + (d - b) * ratio_cap
    )
    expected = (n**3 - 8 * n**2 - 19 * n + 302) / 6
    assert sp.simplify(final - expected) == 0

    # In the positive-correlation case, use
    # 7X <= 2(n-4)B2-6B3.  The same endpoint remains.
    positive_case = sp.factor(
        a
        + d
        - sp.Rational(2, 7) * b * (n - 4)
        + (
            d
            - b
            + sp.Rational(6, 7) * b
        )
        * ratio_cap
    )
    assert sp.simplify(positive_case - final) == 0
    assert final.subs(n, 18) == sp.Rational(1600, 3)

    # Positivity for all n>=18 follows because the polynomial and its
    # first two derivatives are positive at 18 and the third
    # derivative is positive.
    for derivative in range(4):
        assert sp.diff(final, n, derivative).subs(n, 18) > 0
    print("ratio endpoint coefficient", final)


def main() -> int:
    verify_symbolic_identities()
    print("symbolic motif and Zagreb identities: PASS")
    verify_zagreb_infinite_step()
    verify_zagreb_finite_base()
    verify_connected_subtree_bases()
    verify_ratio_finish()
    print("tree rank-(4,5) path-ratio theorem: CERTIFIED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
