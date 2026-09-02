#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at high-degree roots of order 25.

For a rooted 25-vertex tree (T,p), roots of degree at least five are
covered by the degree-sensitive path-ratio cone.  At degree four put
F=T-N[p], so |F|=20.  If F has an edge, an exact edge/wedge/connected-
triple calculation proves

    i4(F) / i3(F) <= 4033 / 959,

which is exactly the ratio needed by the strong-margin cone.  If F is
edgeless, the tree has depth two at p and all 1,771 distributions of
the twenty distance-two leaves among the four neighbors are checked
exactly.
"""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank6_all_roots_n26 import compositions
from verify_rank6_all_roots_n27 import add, multiply, strong


def degree_sensitive_endpoint():
    n = sp.Integer(25)
    degree = sp.symbols("degree", integer=True, positive=True)
    x = (n - 7) * (n - 8) / (5 * (n - 3))
    L = (n - degree - 4) / 4
    lower = sp.factor(
        2 * x + 1 - 24 * (L - x) / (1 + L)
    )
    derivative = sp.factor(sp.diff(lower, degree))
    assert derivative == sp.Rational(19968, 55) / (
        degree - 25
    ) ** 2
    endpoint = sp.factor(lower.subs(degree, 5))
    assert endpoint == sp.Rational(197, 275)
    return lower, endpoint


def degree_four_forest_ratio():
    """Prove i4/i3 <= 4033/959 for 20-vertex forests with e>=1."""

    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )
    a = sp.binomial(20, 3) - 18 * e + W
    b = (
        sp.binomial(20, 4)
        - e * sp.binomial(18, 2)
        + 16 * W
        + sp.binomial(e, 2)
        - R
    )
    margin = sp.expand(4033 * a - 959 * b)

    # In the line graph of a forest, the number R of connected
    # three-edge subtrees obeys R >= (2W^2/e-W)/3.
    line_lower = (2 * W**2 / e - W) / 3
    relaxed = sp.factor(margin.subs(R, line_lower))
    derivative = sp.factor(sp.diff(relaxed, W))
    assert sp.simplify(
        derivative - 4 * (959 * W - 8723 * e) / (3 * e)
    ) == 0

    # Since W<=C(e,2) and 1<=e<=19, the derivative is negative.
    for edge_count in range(1, 20):
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
        959 * e**3
        - 39687 * e**2
        + 483526 * e
        - 292410
    ) / 6
    assert sp.simplify(endpoint - expected) == 0
    values = [
        endpoint.subs(e, edge_count)
        for edge_count in range(1, 20)
    ]
    assert min(values) == 25398
    assert all(value > 0 for value in values)

    # This ratio is exactly the zero boundary of the rooted cone at
    # n=25.  Here x is the sharp whole-tree i5/i4 path ratio.
    x = sp.Rational(153, 55)
    y = sp.Rational(4033, 959)
    normalized = sp.factor(
        2 * x + 1 - 24 * (y - x) / (1 + y)
    )
    assert normalized == 0
    return min(values), normalized


def edgeless_depth_two_case():
    """Enumerate F=20K1 over the four branches at p."""

    forest = tuple(comb(20, rank) for rank in range(6))
    count = 0
    minimum = None
    witness = None

    for leaf_counts in compositions(20, 4):
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

    assert count == comb(23, 3) == 1771
    assert minimum == 281275424
    assert witness == (5, 5, 5, 5)
    return count, minimum, witness


def main():
    degree_bound = degree_sensitive_endpoint()
    forest_ratio = degree_four_forest_ratio()
    edgeless = edgeless_depth_two_case()
    print(
        "rank-6 strong inequality at every order-25 root "
        "of degree at least four: CERTIFIED"
    )
    print("degree>=5 endpoint:", degree_bound[1])
    print("degree-four forest ratio:", forest_ratio)
    print("degree-four edgeless case:", edgeless)


if __name__ == "__main__":
    main()
