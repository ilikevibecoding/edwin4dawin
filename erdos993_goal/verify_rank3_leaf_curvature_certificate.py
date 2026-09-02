#!/usr/bin/env python3
"""Exact symbolic certificate for rank-3 leaf-curvature monotonicity."""

from __future__ import annotations

from math import comb

import networkx as nx
import sympy as sp


def add(left: list[int], right: list[int]) -> list[int]:
    result = [0] * max(len(left), len(right))
    for i in range(len(result)):
        result[i] = (
            (left[i] if i < len(left) else 0)
            + (right[i] if i < len(right) else 0)
        )
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def mul(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return result


def independence_polynomial(tree: nx.Graph, root: int = 0) -> list[int]:
    parent = {root: None}
    order = [root]
    for vertex in order:
        for neighbor in tree[vertex]:
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            order.append(neighbor)
    excluded: dict[int, list[int]] = {}
    total: dict[int, list[int]] = {}
    for vertex in reversed(order):
        e = [1]
        j = [1]
        for child in tree[vertex]:
            if parent.get(child) == vertex:
                e = mul(e, total[child])
                j = mul(j, excluded[child])
        excluded[vertex] = e
        total[vertex] = add(e, [0] + j)
    return total[root]


def rank3_curvature(poly: list[int]) -> int:
    transformed = [
        1,
        poly[1] if len(poly) > 1 else 0,
        2 * poly[2] if len(poly) > 2 else 0,
        6 * poly[3] if len(poly) > 3 else 0,
        24 * poly[4] if len(poly) > 4 else 0,
    ]
    return transformed[3] ** 2 - transformed[2] * transformed[4]


def bernstein_coefficients(poly: sp.Expr, variable: sp.Symbol, degree: int):
    power = sp.Poly(sp.expand(poly), variable)
    return [
        sp.factor(
            sum(
                power.coeff_monomial(variable**j)
                * sp.binomial(k, j)
                / sp.binomial(degree, j)
                for j in range(k + 1)
            )
        )
        for k in range(degree + 1)
    ]


def all_coefficients_nonnegative_after_shift(
    poly: sp.Expr,
    variable: sp.Symbol,
    shifted: sp.Symbol,
    offset: int,
) -> bool:
    expanded = sp.Poly(
        sp.expand(poly.subs(variable, shifted + offset)),
        shifted,
    )
    return all(coefficient >= 0 for coefficient in expanded.coeffs())


def main() -> int:
    n, e, S, R, d, Z = sp.symbols(
        "n e S R d Z", integer=True, nonnegative=True
    )
    t, u = sp.symbols("t u", nonnegative=True)

    edges = n - 1
    i2 = sp.expand_func(sp.binomial(n, 2) - edges)
    i3 = sp.expand_func(sp.binomial(n, 3) - edges * (n - 2) + S)
    i4 = sp.expand_func(
        sp.binomial(n, 4)
        - edges * sp.binomial(n - 2, 2)
        + S * (n - 4)
        + sp.binomial(edges, 2)
        - R
    )
    curvature = sp.expand(36 * i3**2 - 48 * i2 * i4)

    new_i2 = i2.subs(n, n + 1)
    # Rebuild rather than simultaneously substituting n,S,R.
    new_edges = n
    new_i2 = sp.expand_func(sp.binomial(n + 1, 2) - new_edges)
    new_i3 = sp.expand_func(
        sp.binomial(n + 1, 3)
        - new_edges * (n - 1)
        + (S + d)
    )
    new_i4 = sp.expand_func(
        sp.binomial(n + 1, 4)
        - new_edges * sp.binomial(n - 1, 2)
        + (S + d) * (n - 3)
        + sp.binomial(new_edges, 2)
        - (R + Z)
    )
    new_curvature = sp.expand(
        36 * new_i3**2 - 48 * new_i2 * new_i4
    )
    delta = sp.expand(new_curvature - curvature)
    expected_E = (
        24 * S * d
        - 12 * S * n**2
        + 28 * S * n
        - 16 * S
        + 16 * R * (n - 1)
        + 12 * d**2
        - 4 * d * n**3
        + 8 * d * n**2
        - 4 * d * n
        + 5 * n**4
        - 30 * n**3
        + 61 * n**2
        - 52 * n
        + 16
        + 8 * n * (n - 1) * Z
    )
    assert sp.expand(delta - 3 * expected_E) == 0

    # Global C3 lower bound from the line-graph inequality.
    line_bound = (2 * S**2 / e - S) / 3
    global_lower = sp.factor(
        curvature.subs({n: e + 1, R: line_bound})
    )
    expected_global = (
        16 * S**2 * e
        + 20 * S**2
        - 12 * S * e**3
        + 16 * S * e**2
        - 4 * S * e
        + 3 * e**5
        - 15 * e**4
        + 21 * e**3
        - 9 * e**2
    )
    assert sp.expand(global_lower - expected_global) == 0
    vertex = e * (e - 1) * (3 * e - 1) / (2 * (4 * e + 5))
    global_min = sp.factor(global_lower.subs(S, vertex))
    expected_min = (
        e**2
        * (e - 1) ** 2
        * (3 * e**2 - 15 * e - 46)
        / (4 * e + 5)
    )
    assert sp.cancel(global_min - expected_min) == 0

    # Leaf increment for e>=5, d<e.
    E = sp.expand(expected_E.subs(n, e + 1))
    A = d * (d - 1) / 2
    B = (e - d) * (e - d - 1) / 2
    S0 = sp.expand(A + B + 1)
    E_low = sp.factor(E.subs({R: line_bound, Z: A + 1}))
    E_high = sp.factor(E.subs({R: line_bound, Z: S - B}))

    derivative_low_at_boundary = sp.factor(
        3 * sp.diff(E_low, S).subs(S, S0) / 4
    )
    derivative_high_at_boundary = sp.factor(
        3 * sp.diff(E_high, S).subs(S, S0) / 4
    )
    expected_D_low = (
        16 * d**2 - 16 * d * e + 18 * d - e**2 - 9 * e + 16
    )
    expected_D_high = (
        16 * d**2
        - 16 * d * e
        + 18 * d
        + 5 * e**2
        - 3 * e
        + 16
    )
    assert sp.expand(derivative_low_at_boundary - expected_D_low) == 0
    assert sp.expand(derivative_high_at_boundary - expected_D_high) == 0
    assert sp.factor(expected_D_low.subs(d, 1)) == -e**2 - 25 * e + 50
    assert sp.factor(expected_D_low.subs(d, e - 1)) == -e**2 - 7 * e + 14
    real_min_high = sp.factor(
        expected_D_high.subs(d, (16 * e - 18) / 32)
    )
    assert sp.expand(
        real_min_high - (16 * e**2 + 96 * e + 175) / 16
    ) == 0

    junction = sp.factor(E_low.subs(S, S0))
    assert sp.expand(junction - E_high.subs(S, S0)) == 0
    in_t = sp.expand(junction.subs(d, 1 + (e - 2) * t))
    bernstein = bernstein_coefficients(in_t, t, 4)
    assert all(
        all_coefficients_nonnegative_after_shift(item, e, u, 5)
        for item in bernstein
    )

    expected_bernstein = [
        (e - 2) * (5 * e**3 - 28 * e**2 + 65 * e - 154) / 3,
        e * (e - 2) * (3 * e**2 + 4 * e - 59) / 3,
        (e - 2) * (23 * e**3 - 76 * e**2 - 7 * e - 46) / 9,
        e * (e - 2) * (3 * e**2 - 2 * e - 29) / 3,
        (e - 2) * (e + 1) * (5 * e**2 - 9 * e - 10) / 3,
    ]
    assert all(
        sp.expand(left - right) == 0
        for left, right in zip(bernstein, expected_bernstein)
    )

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
    assert star_delta == e**2 * (e - 1) * (5 * e - 1)

    # Finite exact checks below the symbolic ranges.
    curvature_minima = []
    for order in range(1, 9):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        values = [
            rank3_curvature(independence_polynomial(tree))
            for tree in trees
        ]
        curvature_minima.append(min(values))
    assert curvature_minima == [0, 0, 0, 0, 36, 420, 1584, 4608]

    increment_minima = []
    for order in range(1, 6):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        values = []
        for tree in trees:
            old = rank3_curvature(independence_polynomial(tree))
            for vertex in list(tree):
                extended = tree.copy()
                leaf = max(extended.nodes, default=-1) + 1
                extended.add_edge(vertex, leaf)
                new = rank3_curvature(
                    independence_polynomial(extended, root=vertex)
                )
                values.append(new - old)
        increment_minima.append(min(values))
    assert increment_minima == [0, 0, 0, 36, 276]

    print("rank-3 leaf-curvature symbolic certificate: PASS")
    print("small-order C3 minima:", curvature_minima)
    print("small-order leaf-increment minima:", increment_minima)
    print("Bernstein coefficients:", bernstein)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
