#!/usr/bin/env python3
"""Exact replay of the rank-3 three-halves leaf certificate."""

from __future__ import annotations

import networkx as nx
import sympy as sp

from verify_prefix_two_over_k_variance_reduction import (
    forest_independence_polynomial,
)
from verify_prefix_three_halves_leaf_reduction import (
    attach_leaf,
    q_reserve,
)


def bernstein_coefficients(
    expression: sp.Expr, variable: sp.Symbol, degree: int
) -> list[sp.Expr]:
    power = sp.Poly(sp.expand(expression), variable)
    return [
        sp.factor(
            sum(
                power.coeff_monomial(variable**index)
                * sp.binomial(rank, index)
                / sp.binomial(degree, index)
                for index in range(rank + 1)
            )
        )
        for rank in range(degree + 1)
    ]


def main() -> None:
    n, e, S, R, d, Z = sp.symbols(
        "n e S R d Z", integer=True, nonnegative=True
    )
    t, u = sp.symbols("t u", nonnegative=True)

    def coefficients(
        order: sp.Expr,
        edges: sp.Expr,
        adjacent_pairs: sp.Expr,
        connected_triples: sp.Expr,
    ) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        i2 = sp.expand_func(sp.binomial(order, 2) - edges)
        i3 = sp.expand_func(
            sp.binomial(order, 3)
            - edges * (order - 2)
            + adjacent_pairs
        )
        i4 = sp.expand_func(
            sp.binomial(order, 4)
            - edges * sp.binomial(order - 2, 2)
            + adjacent_pairs * (order - 4)
            + sp.binomial(edges, 2)
            - connected_triples
        )
        return i2, i3, i4

    def rank3_q(values: tuple[sp.Expr, sp.Expr, sp.Expr]) -> sp.Expr:
        i2, i3, i4 = values
        return sp.expand(6 * i3**2 - i2 * i3 - 8 * i2 * i4)

    old_q = rank3_q(coefficients(n, n - 1, S, R))
    expected_twelve_q = (
        48 * R * n**2
        - 144 * R * n
        + 96 * R
        + 72 * S**2
        - 24 * S * n**3
        + 114 * S * n**2
        - 174 * S * n
        + 84 * S
        + 5 * n**5
        - 48 * n**4
        + 173 * n**3
        - 294 * n**2
        + 236 * n
        - 72
    )
    assert sp.expand(12 * old_q - expected_twelve_q) == 0

    line_bound = (2 * S**2 / e - S) / 3
    global_lower_times_twelve = sp.factor(
        expected_twelve_q.subs({n: e + 1, R: line_bound})
    )
    expected_global = (
        32 * S**2 * e
        + 40 * S**2
        - 24 * S * e**3
        + 26 * S * e**2
        - 2 * S * e
        + 5 * e**5
        - 23 * e**4
        + 31 * e**3
        - 13 * e**2
    )
    assert sp.expand(global_lower_times_twelve - expected_global) == 0

    global_vertex = e * (e - 1) * (12 * e - 1) / (8 * (4 * e + 5))
    global_minimum = sp.factor(expected_global.subs(S, global_vertex))
    expected_minimum = (
        e**2
        * (e - 1) ** 2
        * (16 * e**2 - 192 * e - 521)
        / (8 * (4 * e + 5))
    )
    assert sp.cancel(global_minimum - expected_minimum) == 0
    assert sp.Poly(
        sp.expand((16 * e**2 - 192 * e - 521).subs(e, u + 15)),
        u,
    ).all_coeffs() == [16, 288, 199]

    new_q = rank3_q(coefficients(n + 1, n, S + d, R + Z))
    delta = sp.factor(new_q - old_q)
    expected_twelve_delta = (
        96 * R * e
        + 144 * S * d
        - 72 * S * e**2
        + 12 * S * e
        + 48 * Z * e**2
        + 48 * Z * e
        + 72 * d**2
        - 24 * d * e**3
        - 30 * d * e**2
        - 6 * d * e
        + 25 * e**4
        - 42 * e**3
        + 5 * e**2
    )
    assert sp.expand(
        12 * delta.subs(n, e + 1) - expected_twelve_delta
    ) == 0

    after_line = sp.factor(expected_twelve_delta.subs(R, line_bound))
    expected_after_line = (
        64 * S**2
        + 144 * S * d
        - 72 * S * e**2
        - 20 * S * e
        + 48 * Z * e**2
        + 48 * Z * e
        + 72 * d**2
        - 24 * d * e**3
        - 30 * d * e**2
        - 6 * d * e
        + 25 * e**4
        - 42 * e**3
        + 5 * e**2
    )
    assert sp.expand(after_line - expected_after_line) == 0

    A = d * (d - 1) / 2
    B = (e - d) * (e - d - 1) / 2
    S0 = sp.expand(A + B + 1)
    low = sp.factor(expected_after_line.subs(Z, A + 1))
    high = sp.factor(expected_after_line.subs(Z, S - B))
    assert sp.expand(low.subs(S, S0) - high.subs(S, S0)) == 0

    derivative_low = sp.factor(sp.diff(low, S).subs(S, S0) / 12)
    derivative_high = sp.factor(sp.diff(high, S).subs(S, S0) / 12)
    expected_derivative_low = (
        32 * d**2
        - 32 * d * e
        + 36 * d
        - 2 * e**2
        - 21 * e
        + 32
    ) / 3
    expected_derivative_high = (
        32 * d**2
        - 32 * d * e
        + 36 * d
        + 10 * e**2
        - 9 * e
        + 32
    ) / 3
    assert sp.expand(derivative_low - expected_derivative_low) == 0
    assert sp.expand(derivative_high - expected_derivative_high) == 0
    assert sp.simplify(
        expected_derivative_low.subs(d, 1)
        + (2 * e**2 + 53 * e - 100) / 3
    ) == 0
    assert sp.simplify(
        expected_derivative_low.subs(d, e - 1)
        + (2 * e**2 + 17 * e - 28) / 3
    ) == 0
    high_vertex = (32 * e - 36) / 64
    assert sp.simplify(
        expected_derivative_high.subs(d, high_vertex)
        - (16 * e**2 + 72 * e + 175) / 24
    ) == 0

    junction = sp.factor(low.subs(S, S0) / 12)
    in_t = sp.expand(junction.subs(d, 1 + (e - 2) * t))
    bernstein = bernstein_coefficients(in_t, t, 4)
    expected_bernstein = [
        (e - 2) * (5 * e**3 - 54 * e**2 + 145 * e - 308) / 12,
        e * (e - 2) * (2 * e**2 + 23 * e - 221) / 24,
        (e - 2) * (31 * e**3 - 143 * e**2 - 2 * e - 92) / 36,
        e * (e - 2) * (2 * e**2 - 7 * e - 107) / 24,
        (e - 2) * (5 * e**3 - 12 * e**2 - 29 * e - 20) / 12,
    ]
    assert all(
        sp.expand(left - right) == 0
        for left, right in zip(bernstein, expected_bernstein)
    )
    for item in bernstein:
        shifted = sp.Poly(sp.expand(item.subs(e, u + 10)), u)
        assert all(coefficient > 0 for coefficient in shifted.all_coeffs())

    star_delta = sp.factor(
        delta.subs(
            {
                n: e + 1,
                d: e,
                S: e * (e - 1) / 2,
                R: e * (e - 1) * (e - 2) / 6,
                Z: e * (e - 1) / 2,
            }
        )
    )
    assert star_delta == e**2 * (e - 1) * (5 * e - 1) / 12

    global_minima = []
    for order in range(1, 16):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        global_minima.append(
            min(
                q_reserve(forest_independence_polynomial(tree), 3)
                for tree in trees
            )
        )
    assert global_minima == [
        0,
        0,
        0,
        0,
        0,
        20,
        84,
        264,
        650,
        1410,
        2736,
        4936,
        8340,
        13440,
        20740,
    ]

    increment_minima = []
    for order in range(1, 11):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        values = []
        for tree in trees:
            old_poly = forest_independence_polynomial(tree)
            for support in tree:
                new_poly = forest_independence_polynomial(
                    attach_leaf(tree, support)
                )
                values.append(
                    q_reserve(new_poly, 3) - q_reserve(old_poly, 3)
                )
        increment_minima.append(min(values))
    assert increment_minima == [0, 0, 0, 0, 8, 35, 102, 240, 490, 903]

    print("PASS")
    print("global rank-3 minima:", global_minima)
    print("rank-3 leaf-increment minima:", increment_minima)


if __name__ == "__main__":
    main()
