#!/usr/bin/env python3
"""Certify the order-23 strong rank-6 inequality at roots of degree >=5.

Degree at least six follows from the degree-sensitive path-ratio cone.
For degree five, F=T-N[p] has order 17.  A sharp forest ratio handles
every nonempty F; the edgeless depth-two case is enumerated exactly.
"""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank6_all_roots_n26 import compositions
from verify_rank6_all_roots_n27 import add, multiply, strong


def degree_sensitive_endpoint():
    n = sp.Integer(23)
    degree = sp.symbols("degree", integer=True, positive=True)
    x = (n - 7) * (n - 8) / (5 * (n - 3))
    L = (n - degree - 4) / 4
    lower = sp.factor(
        2 * x + 1 - 24 * (L - x) / (1 + L)
    )
    derivative = sp.factor(sp.diff(lower, degree))
    assert x == sp.Rational(12, 5)
    assert derivative == sp.Rational(1632, 5) / (
        degree - 23
    ) ** 2
    endpoint = sp.factor(lower.subs(degree, 6))
    assert endpoint == 1
    return lower, endpoint


def degree_five_forest_ratio():
    """Prove i4/i3 < 317/91 for every nonempty 17-vertex forest."""

    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )
    a = sp.binomial(17, 3) - 15 * e + W
    b = (
        sp.binomial(17, 4)
        - e * sp.binomial(15, 2)
        + 13 * W
        + sp.binomial(e, 2)
        - R
    )
    margin = sp.expand(317 * a - 91 * b)
    line_lower = (2 * W**2 / e - W) / 3
    relaxed = sp.factor(margin.subs(R, line_lower))
    derivative = sp.factor(sp.diff(relaxed, W))
    assert sp.simplify(
        derivative
        - (364 * W - 2689 * e) / (3 * e)
    ) == 0

    for edge_count in range(1, 16):
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
        91 * e**3
        - 3144 * e**2
        + 31853 * e
        - 6120
    ) / 6
    assert sp.simplify(endpoint - expected) == 0
    values = [
        endpoint.subs(e, edge_count)
        for edge_count in range(1, 16)
    ]
    # For e=16 the convex quadratic has its real minimum inside the
    # W interval, at W=2689e/364.  Even that relaxed value is positive.
    critical_w = sp.Rational(2689, 364) * e
    edge_16_minimum = sp.factor(
        relaxed.subs({e: 16, W: critical_w.subs(e, 16)})
    )
    assert edge_16_minimum == sp.Rational(3245338, 273)
    values.append(edge_16_minimum)
    assert min(values) == 3780
    assert all(value > 0 for value in values)

    x = sp.Rational(12, 5)
    y = sp.Rational(317, 91)
    normalized = sp.factor(
        2 * x + 1 - 24 * (y - x) / (1 + y)
    )
    assert normalized == 0
    return min(values), normalized


def edgeless_depth_two_case():
    forest = tuple(comb(17, rank) for rank in range(6))
    count = 0
    minimum = None
    witness = None

    for leaf_counts in compositions(17, 5):
        root_deleted = (1,)
        for leaves in leaf_counts:
            excluded_center = tuple(
                comb(leaves, rank)
                for rank in range(min(5, leaves) + 1)
            )
            branch = add(excluded_center, (0, 1))
            root_deleted = multiply(root_deleted, branch)

        whole = add(root_deleted, (0,) + forest)
        value = strong(whole, root_deleted)
        count += 1
        if minimum is None or value < minimum:
            minimum = value
            witness = leaf_counts

    assert count == comb(21, 4) == 5985
    assert minimum == 116712216
    assert witness == (3, 3, 3, 4, 4)
    return count, minimum, witness


def main():
    degree_bound = degree_sensitive_endpoint()
    forest_ratio = degree_five_forest_ratio()
    edgeless = edgeless_depth_two_case()
    print(
        "rank-6 strong inequality at every order-23 root "
        "of degree at least five: CERTIFIED"
    )
    print("degree>=6 endpoint:", degree_bound[1])
    print("degree-five forest ratio:", forest_ratio)
    print("degree-five edgeless case:", edgeless)


if __name__ == "__main__":
    main()
