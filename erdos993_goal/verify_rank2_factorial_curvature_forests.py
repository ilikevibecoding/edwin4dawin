#!/usr/bin/env python3
"""Exact proof of rank-2 factorial curvature for every forest."""

from __future__ import annotations

import sympy as sp


def main() -> int:
    n, m, S = sp.symbols(
        "n m S", integer=True, nonnegative=True
    )
    i2 = sp.binomial(n, 2) - m
    i3 = sp.binomial(n, 3) - m * (n - 2) + S
    curvature = sp.expand_func(4 * i2**2 - 6 * n * i3)
    expected = (
        n**3
        - n**2
        + 2 * m * n**2
        - 8 * m * n
        + 4 * m**2
        - 6 * n * S
    )
    assert sp.expand(curvature - expected) == 0

    # S counts adjacent pairs of edges.  It is at most all pairs of
    # edges, so S<=binom(m,2).  Since its coefficient is negative, this
    # gives the following lower bound.
    lower = sp.factor(
        curvature.subs(S, m * (m - 1) / 2)
    )
    assert sp.expand(
        sp.diff(lower, m, 2) - 2 * (4 - 3 * n)
    ) == 0
    at_zero = sp.factor(lower.subs(m, 0))
    at_maximum = sp.factor(lower.subs(m, n - 1))
    assert sp.expand(at_zero - n**2 * (n - 1)) == 0
    assert sp.expand(
        at_maximum - 2 * (n - 1) * (n - 2)
    ) == 0

    # For n>=2 the lower bound is concave in m, hence its minimum on
    # 0<=m<=n-1 occurs at an endpoint.  Both endpoints are nonnegative.
    # Orders zero and one are immediate from the defining expression.
    for order in (0, 1):
        assert curvature.subs({n: order, m: 0, S: 0}) == 0

    print("rank-2 factorial curvature for forests: PASS")
    print("curvature:", curvature)
    print("lower endpoint m=0:", at_zero)
    print("lower endpoint m=n-1:", at_maximum)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
