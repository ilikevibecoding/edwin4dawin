#!/usr/bin/env python3
"""Exact certificate for three-quarters PGC at rank 3 on every tree.

For a pendant edge of a tree G, let F be obtained by deleting the leaf
and its support.  The script verifies

    3 H_3(I(G)) >= 4 H_2(I(F))

whenever rank 3 lies in the required prefix.  Stars are covered by the
separate all-rank star certificate; this file proves the nonstar case.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp


def continuous_quadratic_minimum(
    a: Fraction,
    b: Fraction,
    c: Fraction,
    left: Fraction,
    right: Fraction,
) -> tuple[Fraction, Fraction]:
    """Return the exact minimum and minimizer on a closed interval."""

    vertex = -b / (2 * a)
    point = max(left, min(right, vertex))
    return a * point * point + b * point + c, point


def finite_boundary_minima() -> list[dict[str, str | int]]:
    """Check the only edge counts not covered by the uniform certificate."""

    rows: list[dict[str, str | int]] = []
    for edges in (6, 7):
        excess = edges - 1
        for local_excess in range(1, edges - 1):
            lower_m2 = (
                local_excess**2 + excess - local_excess
            )
            upper_m2 = min(
                local_excess**2
                + (excess - local_excess) ** 2,
                excess**2 - 2 * excess + 2,
            )

            e = Fraction(edges)
            x = Fraction(local_excess)
            constant = (
                (36 - 24 / x)
                * e
                * (e - 1)
                * (e - 2)
                + 6 * e**5
                - 58 * e**4
                + 8 * e**3 * x
                + Fraction(331, 2) * e**3
                - 12 * e**2 * x**2
                - 36 * e**2 * x
                - Fraction(335, 2) * e**2
                - 4 * e * x**2
                + 28 * e * x
                + Fraction(81, 2) * e
                + Fraction(27, 2)
            )
            linear = (
                -9 * e**3
                + Fraction(69, 2) * e**2
                + Fraction(3, 2) * e
                - 27
            )

            candidates: list[
                tuple[Fraction, int, Fraction]
            ] = []

            left = Fraction(lower_m2)
            right = Fraction(min(upper_m2, 2 * excess))
            if left <= right:
                # M_3 >= 3 M_2 - 2E.
                value, point = continuous_quadratic_minimum(
                    Fraction(27, 2),
                    linear + 18 * e * (e - 1),
                    constant - 12 * e * (e - 1) ** 2,
                    left,
                    right,
                )
                candidates.append((value, 1, point))

            left = Fraction(max(lower_m2, 2 * excess))
            right = Fraction(upper_m2)
            if left <= right:
                # M_3 >= M_2^2/E.
                value, point = continuous_quadratic_minimum(
                    Fraction(27, 2) + 6 * e,
                    linear,
                    constant,
                    left,
                    right,
                )
                candidates.append((value, 2, point))

            value, region, point = min(candidates)
            assert value > 0
            rows.append(
                {
                    "edges": edges,
                    "local_excess": local_excess,
                    "lower_bound": str(value),
                    "moment_region": region,
                    "minimizing_M2": str(point),
                }
            )
    return rows


def main() -> None:
    n, e, z, t, d, s = sp.symbols(
        "n e Z T d S", integer=True, nonnegative=True
    )

    # Independent-set counts through rank four in a forest.  Here Z is
    # the number of incident edge pairs and T the number of connected
    # three-edge subtrees.
    i2 = n * (n - 1) / 2 - e
    i3 = n * (n - 1) * (n - 2) / 6 - e * (n - 2) + z
    i4 = (
        n * (n - 1) * (n - 2) * (n - 3) / 24
        - e * (n - 2) * (n - 3) / 2
        + z * (n - 3)
        + e * (e - 1) / 2
        - z
        - t
    )
    g3 = sp.expand(3 * i3**2 + i2 * i3 - 4 * i2 * i4)

    # Deleting a leaf and its support removes d edges.  If S is the sum
    # of deg(u)-1 over the support's neighbours, it removes C(d,2)+S
    # incident edge pairs.
    nf = n - 2
    ef = e - d
    zf = z - d * (d - 1) / 2 - s
    f2 = nf * (nf - 1) / 2 - ef
    f3 = nf * (nf - 1) * (nf - 2) / 6 - ef * (nf - 2) + zf
    g2f = sp.expand(2 * f2**2 + nf * f2 - 3 * nf * f3)

    # Multiplying 3H_3(G)-4H_2(F) by i_2(G)(n-2) gives this expression.
    cleared_strong_gap = sp.expand(9 * nf * g3 - 8 * i2 * g2f)

    m2, m3, j, x = sp.symbols(
        "M2 M3 J x", positive=True
    )
    excess = e - 1
    substitutions = {
        n: e + 1,
        z: (m2 + excess) / 2,
        t: (m3 - excess) / 6 + j,
        d: x + 1,
    }
    tree_gap = sp.factor(
        cleared_strong_gap.subs(substitutions)
    )

    linear_m2 = (
        -9 * e**3
        + sp.Rational(69, 2) * e**2
        + sp.Rational(3, 2) * e
        - 27
    )
    constant = (
        6 * e**5
        - 58 * e**4
        + 8 * e**3 * x
        + sp.Rational(331, 2) * e**3
        - 12 * e**2 * x**2
        - 36 * e**2 * x
        - sp.Rational(335, 2) * e**2
        - 4 * e * x**2
        + 28 * e * x
        + sp.Rational(81, 2) * e
        + sp.Rational(27, 2)
    )
    bracket = (
        36 * e * (e - 1) * j
        - 24 * e * (e - 1) * s
        + sp.Rational(27, 2) * m2**2
        + linear_m2 * m2
        + 6 * e * (e - 1) * m3
        + constant
    )
    assert sp.factor(tree_gap - (e - 1) * bracket / 2) == 0

    # If the tree is not a star, its positive-excess core contains at
    # least two vertices.  The exact structural estimates are
    #
    #   J >= xS,  J >= e-2,
    #   M3 >= 3M2-2(e-1),  M3 >= M2^2/(e-1).
    #
    # The first two reduce the J,S contribution to the following
    # explicit lower-bound constant.
    reduced_constant = sp.factor(
        constant
        + (36 - 24 / x) * e * (e - 1) * (e - 2)
    )

    # Above M2=2(e-1), Cauchy's moment bound is strongest.  Minimize the
    # resulting quadratic over the whole real line.
    quadratic_a = sp.Rational(27, 2) + 6 * e
    vertex_lower_bound = sp.factor(
        reduced_constant
        - linear_m2**2 / (4 * quadratic_a)
    )
    numerator, denominator = sp.together(
        vertex_lower_bound
    ).as_numer_denom()
    assert sp.factor(denominator - 8 * x * (4 * e + 9)) == 0

    # Uniform positivity for e>=8 and 1<=x<=e-2.  Put
    # e=8+y and x=1+u(e-3), with y>=0 and 0<=u<=1.  Exact Bernstein
    # coefficients in u all have nonnegative power coefficients in y.
    y, u = sp.symbols("y u", nonnegative=True)
    transformed = sp.Poly(
        sp.expand(
            numerator.subs(
                {e: y + 8, x: 1 + u * (y + 5)}
            )
        ),
        u,
    )
    degree = transformed.degree()
    assert degree == 3
    bernstein: list[sp.Poly] = []
    for index in range(degree + 1):
        coefficient = sum(
            transformed.coeff_monomial(u**power)
            * sp.Rational(
                comb(index, power),
                comb(degree, power),
            )
            for power in range(index + 1)
        )
        polynomial = sp.Poly(sp.expand(coefficient), y)
        assert polynomial.as_expr() != 0
        assert all(
            value > 0 for _, value in polynomial.terms()
        )
        bernstein.append(polynomial)

    # On E<=M2<=2E the other moment bound is strongest.  Its quadratic
    # is decreasing up to 2E for e>=8, and it agrees there with the
    # Cauchy quadratic already certified above.
    derivative_at_boundary = sp.factor(
        27 * 2 * (e - 1)
        + linear_m2
        + 18 * e * (e - 1)
    )
    assert sp.factor(
        derivative_at_boundary
        + sp.Rational(3, 2)
        * (e - 1)
        * (6 * e**2 - 29 * e - 54)
    ) == 0
    shifted_derivative_factor = sp.Poly(
        sp.expand((6 * e**2 - 29 * e - 54).subs(e, y + 8)),
        y,
    )
    assert all(
        value > 0
        for _, value in shifted_derivative_factor.terms()
    )

    boundary_rows = finite_boundary_minima()

    print("PASS")
    print(
        "3 H_3(I(G)) >= 4 H_2(I(F)) for every tree whenever "
        "rank 3 is in the prefix."
    )
    print("Bernstein coefficients for the e>=8 certificate:")
    for index, polynomial in enumerate(bernstein):
        print(f"  beta_{index}(y) = {sp.factor(polynomial.as_expr())}")
    print("Exact e=6,7 lower-bound minima:")
    for row in boundary_rows:
        print(
            "  e={edges}, x={local_excess}: {lower_bound} "
            "(region {moment_region}, M2={minimizing_M2})".format(
                **row
            )
        )


if __name__ == "__main__":
    main()
