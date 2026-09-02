#!/usr/bin/env python3
"""Exact certificate for the no-sibling terminal-broom rank-6 cone.

This verifies a purely algebraic lemma.  No numerical approximation is
used in any assertion.

For positive X and rooted retention ratios r,q, put

  Phi =
      -2 D r - 26 D - 2 D/X
      + X^2 r^2 + 2 X^2 r + X^2
      + 2 X q r + 26 X q - 20 X r + 4 X
      + 2 q + 2 r + 5 + 2/X.

The structural inputs used elsewhere are

  1/2 <= r <= 1,
  q >= 1/2,
  q >= r-D/2,
  D <= 1559/3575.

The script proves Phi > 0 throughout this cone.
"""

from __future__ import annotations

from math import comb

import sympy as sp


def bernstein_coefficients_on_unit_interval(polynomial, variable):
    """Return exact Bernstein coefficients on [0,1]."""

    poly = sp.Poly(sp.expand(polynomial), variable)
    degree = poly.degree()
    power = [
        poly.coeff_monomial(variable**index)
        for index in range(degree + 1)
    ]
    return [
        sp.factor(
            sum(
                power[index]
                * sp.Rational(comb(rank, index), comb(degree, index))
                for index in range(rank + 1)
            )
        )
        for rank in range(degree + 1)
    ]


def main() -> int:
    X, r, q, D, t = sp.symbols("X r q D t", positive=True)
    d0 = sp.Rational(1559, 3575)
    switch = (1 + d0) / 2

    phi = (
        -2 * D * r
        - 26 * D
        - 2 * D / X
        + X**2 * r**2
        + 2 * X**2 * r
        + X**2
        + 2 * X * q * r
        + 26 * X * q
        - 20 * X * r
        + 4 * X
        + 2 * q
        + 2 * r
        + 5
        + 2 / X
    )

    # Phi decreases with D and increases with q.  Therefore it is enough
    # to set D=d0 and q=max(1/2,r-d0/2).
    assert sp.factor(
        sp.diff(phi, D) - (-2 * r - 26 - 2 / X)
    ) == 0
    assert sp.factor(
        sp.diff(phi, q) - 2 * (X * r + 13 * X + 1)
    ) == 0

    half = sp.factor(phi.subs({D: d0, q: sp.Rational(1, 2)}))
    cross = sp.factor(phi.subs(D, d0).subs(q, r - d0 / 2))

    # On the cross branch r>=switch, the derivative is increasing in r
    # and is already positive at the switch.
    cross_derivative_at_switch = sp.factor(
        sp.diff(cross, r).subs(r, switch)
    )
    expected_cross_derivative = sp.factor(
        (X + 2) * (d0 * X - d0 + 3 * X + 2)
    )
    assert (
        sp.factor(
            cross_derivative_at_switch - expected_cross_derivative
        )
        == 0
    )
    assert d0 < 2

    switch_value = sp.factor(half.subs(r, switch))
    assert sp.factor(cross.subs(r, switch) - switch_value) == 0
    expected_switch_value = (
        2
        * (X + 2)
        * (18862082 * X**2 - 16270589 * X + 3603600)
        / (12780625 * X)
    )
    assert sp.factor(switch_value - expected_switch_value) == 0
    switch_quadratic = (
        18862082 * X**2 - 16270589 * X + 3603600
    )
    switch_discriminant = sp.discriminant(switch_quadratic, X)
    assert switch_discriminant == -7153528373879

    # The half branch is a convex quadratic in r.  Four X-regions give
    # short exact certificates for its constrained minimum.
    half_derivative = sp.factor(sp.diff(half, r))
    assert sp.diff(half_derivative, r) == 2 * X**2

    # Region 1: 0<X<=1/20.  The derivative at r=1/2 is positive,
    # so the minimum is the lower endpoint.
    lower_derivative_numerator = (
        10725 * X**2 - 67925 * X + 4032
    )
    assert sp.factor(
        half_derivative.subs(r, sp.Rational(1, 2))
        - lower_derivative_numerator / 3575
    ) == 0
    assert 4032 - sp.Rational(67925, 20) > 0
    lower_value = sp.factor(half.subs(r, sp.Rational(1, 2)))
    expected_lower_value = (
        32175 * X**3
        + 107250 * X**2
        - 68272 * X
        + 16128
    ) / (14300 * X)
    assert sp.factor(lower_value - expected_lower_value) == 0
    assert 16128 - sp.Rational(68272, 20) > 0

    # Regions 2 and 4: the unconstrained quadratic minimum is positive.
    vertex = sp.solve(half_derivative, r)[0]
    vertex_value = sp.factor(half.subs(r, vertex))
    vertex_numerator = (
        204490000 * X**3
        - 549373825 * X**2
        + 67267200 * X
        - 1806336
    )
    expected_vertex_value = (
        9 * vertex_numerator / (51122500 * X**2)
    )
    assert sp.factor(vertex_value - expected_vertex_value) == 0

    small_substitution = sp.expand(
        vertex_numerator.subs(
            X, sp.Rational(1, 20) + t / 30
        )
    )
    small_bernstein = bernstein_coefficients_on_unit_interval(
        small_substitution, t
    )
    assert small_bernstein == [
        sp.Rational(3346411, 16),
        sp.Rational(52299287, 144),
        sp.Rational(140450573, 432),
        sp.Rational(44283073, 432),
    ]
    assert all(coefficient > 0 for coefficient in small_bernstein)

    # X>=3 is compactified by t=3/X, 0<t<=1.
    reciprocal = sp.expand(
        (t / 3) ** 3 * vertex_numerator.subs(X, 3 / t)
    )
    large_bernstein = bernstein_coefficients_on_unit_interval(
        reciprocal, t
    )
    assert large_bernstein == [
        204490000,
        sp.Rational(1291036175, 9),
        sp.Rational(764084750, 9),
        sp.Rational(86317871, 3),
    ]
    assert all(coefficient > 0 for coefficient in large_bernstein)

    # Region 3: 1/12<=X<=3.  The derivative at the upper r endpoint
    # is nonpositive, so the minimum is the switch value.  Its numerator
    # is a convex quadratic in X and is negative at both interval ends.
    upper_derivative_numerator = (
        12284 * X**2 - 67925 * X + 4032
    )
    assert sp.factor(
        half_derivative.subs(r, switch)
        - upper_derivative_numerator / 3575
    ) == 0
    assert sp.diff(upper_derivative_numerator, X, 2) > 0
    assert (
        upper_derivative_numerator.subs(X, sp.Rational(1, 12))
        == -sp.Rational(13888, 9)
    )
    assert upper_derivative_numerator.subs(X, 3) == -89187

    print(
        "rank-6 terminal no-sibling cone: PASS "
        "(exact rational/symbolic certificate)"
    )
    print(f"D ceiling = {d0} = {float(d0):.12f}")
    print(f"switch quadratic discriminant = {switch_discriminant}")
    print(f"small-X Bernstein coefficients = {small_bernstein}")
    print(f"large-X Bernstein coefficients = {large_bernstein}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
