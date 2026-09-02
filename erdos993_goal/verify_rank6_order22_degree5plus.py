#!/usr/bin/env python3
"""Certify the order-22 strong rank-6 inequality at roots of degree >=5."""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank6_order23_degrees2to4 import sparse_enumeration


def degree_sensitive_endpoint():
    n = sp.Integer(22)
    degree = sp.symbols("degree", integer=True, positive=True)
    x = (n - 7) * (n - 8) / (5 * (n - 3))
    L = (n - degree - 4) / 4
    lower = sp.factor(
        2 * x + 1 - 24 * (L - x) / (1 + L)
    )
    derivative = sp.factor(sp.diff(lower, degree))
    assert x == sp.Rational(42, 19)
    assert derivative == sp.Rational(5856, 19) / (
        degree - 22
    ) ** 2
    endpoint = sp.factor(lower.subs(degree, 6))
    assert endpoint == sp.Rational(13, 19)
    return lower, endpoint


def degree_five_forest_ratio():
    """Prove i4/i3 < 1111/353 for 16-vertex forests with e>=2."""

    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )
    a = sp.binomial(16, 3) - 14 * e + W
    b = (
        sp.binomial(16, 4)
        - e * sp.binomial(14, 2)
        + 12 * W
        + sp.binomial(e, 2)
        - R
    )
    margin = sp.expand(1111 * a - 353 * b)
    relaxed = sp.factor(
        margin.subs(R, (2 * W**2 / e - W) / 3)
    )
    derivative = sp.factor(sp.diff(relaxed, W))
    assert sp.simplify(
        derivative
        - (1412 * W - 9728 * e) / (3 * e)
    ) == 0

    for edge_count in range(2, 15):
        assert derivative.subs(
            {
                e: edge_count,
                W: comb(edge_count, 2),
            }
        ) < 0

    endpoint = sp.factor(
        relaxed.subs(W, e * (e - 1) / 2)
    )
    expected = (
        353 * e**3
        - 11493 * e**2
        + 110554 * e
        - 121800
    ) / 6
    assert sp.simplify(endpoint - expected) == 0
    values = [
        endpoint.subs(e, edge_count)
        for edge_count in range(2, 15)
    ]

    critical_w = sp.Rational(2432, 353) * e
    edge_15_minimum = sp.factor(
        relaxed.subs({e: 15, W: critical_w.subs(e, 15)})
    )
    assert edge_15_minimum == sp.Rational(8336770, 353)
    values.append(edge_15_minimum)
    assert min(values) == 9360
    assert all(value > 0 for value in values)

    x = sp.Rational(42, 19)
    y = sp.Rational(1111, 353)
    normalized = sp.factor(
        2 * x + 1 - 24 * (y - x) / (1 + y)
    )
    assert normalized == 0
    return min(values), normalized


def sparse_cases():
    return sparse_enumeration(
        16,
        5,
        1,
        2,
        {
            0: 4845,
            1: 15300,
        },
        {
            0: 69468429,
            1: 68682808,
        },
        expected_types={1: 1},
    )


def main():
    degree_bound = degree_sensitive_endpoint()
    forest_ratio = degree_five_forest_ratio()
    sparse = sparse_cases()
    print(
        "rank-6 strong inequality at every order-22 root "
        "of degree at least five: CERTIFIED"
    )
    print("degree>=6 endpoint:", degree_bound[1])
    print("degree-five forest ratio:", forest_ratio)
    print("degree-five sparse:", sparse)


if __name__ == "__main__":
    main()
