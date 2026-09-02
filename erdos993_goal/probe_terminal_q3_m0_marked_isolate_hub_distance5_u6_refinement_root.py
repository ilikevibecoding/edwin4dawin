#!/usr/bin/env python3
"""Probe the order-six endpoint simplex for distance-five double brooms.

The earlier order-five endpoint leaves three negative top-homogeneous
coefficients in the large-side middle chart.  For j >= 9 we have the sharper
disjoint-event simplex

    rho/u_a6 + tau/u_b6 <= 1,

where u_a6=(a)_6/(a+b)_6 (and likewise for b).  At j=8 these are the exact
weights.  This script checks the resulting middle and tail chart partition.
It is a route probe, not a promoted theorem certificate.
"""

from __future__ import annotations

import sympy as sp


def C(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def stats(expression, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    coefficients = polynomial.coeffs()
    negatives = [
        (monomial, coefficient)
        for monomial, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]
    return {
        "denominator": sp.factor(denominator),
        "terms": len(polynomial.terms()),
        "total_degree": polynomial.total_degree(),
        "negative": len(negatives),
        "minimum": min(coefficients),
        "negative_terms": negatives[:40],
    }


def build_delta():
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b
    order = n + 6
    edges = n + 5
    wedges = C(a + 1, 2) + C(b + 1, 2) + 4
    connected_four = C(a + 1, 3) + C(b + 1, 3) + n + 3
    f2 = C(order, 2) - edges
    f3 = C(order, 3) - edges * (order - 2) + wedges
    z2 = edges
    z3 = edges * (order - 2) - 2 * wedges
    z4 = (
        edges * C(order - 2, 2)
        - 2 * C(edges, 2)
        - 2 * wedges * (order - 4)
        + 3 * connected_four
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown1 = (j - 2) / (n - j + 3)
    ndown2 = (j - 2) * (j - 3) / ((n - j + 3) * (n - j + 4))
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown1 = (j - 2) / (a - j + 3)
    bdown1 = (j - 2) / (b - j + 3)
    adown2 = (j - 2) * (j - 3) / ((a - j + 3) * (a - j + 4))
    bdown2 = (j - 2) * (j - 3) / ((b - j + 3) * (b - j + 4))

    fj = (
        3 + 4 * nup1 + nup2
        + rho * (3 + aup1 + adown1)
        + tau * (3 + bup1 + bdown1)
    )
    fprev = (
        3 * ndown1 + 4 + nup1
        + rho * (1 + 3 * adown1 + adown2)
        + tau * (1 + 3 * bdown1 + bdown2)
    )
    fnext = (
        3 * nup1 + 4 * nup2 + nup3
        + rho * (1 + 3 * aup1 + aup2)
        + tau * (1 + 3 * bup1 + bup2)
    )
    znext = (
        2 + 3 * nup1
        + rho * ((b + 1) * aup1 + (3 * b + 4) + b * adown1)
        + tau * ((a + 1) * bup1 + (3 * a + 4) + a * bdown1)
    )
    delta = sp.factor(
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )
    assert sp.Poly(sp.together(delta), rho, tau).total_degree() == 1
    return (a, b, j, rho, tau), delta, determinant


def main() -> None:
    (a, b, j, rho, tau), delta, determinant = build_delta()
    n = a + b
    q, v, y, r, s = sp.symbols(
        "q v y r s", integer=True, nonnegative=True
    )
    u_a6 = sp.prod(a - offset for offset in range(6)) / sp.prod(
        n - offset for offset in range(6)
    )
    u_b6 = sp.prod(b - offset for offset in range(6)) / sp.prod(
        n - offset for offset in range(6)
    )

    print("determinant", stats(determinant, (a, b)), flush=True)

    seam8 = delta.subs(
        {j: 8, rho: u_a6, tau: u_b6}, simultaneous=True
    ).subs({b: q + 6, a: q + v + 6}, simultaneous=True)
    print("j8_seam", stats(seam8, (q, v)), flush=True)

    middle_substitution = {
        j: y + 9,
        b: q + y + 7,
        a: q + v + y + 7,
    }
    for label, rv, tv in (
        ("middle_00_jge9", 0, 0),
        ("middle_10_u6_jge9", u_a6, 0),
        ("middle_01_u6_jge9", 0, u_b6),
    ):
        expression = delta.subs({rho: rv, tau: tv}, simultaneous=True).subs(
            middle_substitution, simultaneous=True
        )
        print(label, stats(expression, (q, v, y)), flush=True)

    # b=5 is the first tail missed by the already-positive b<=4 charts.
    tail_b5 = delta.subs(
        {b: 5, j: y + 8, rho: u_a6, tau: 0}, simultaneous=True
    ).subs(a, y + s + 6)
    print("tail_b5_jge8_u6", stats(tail_b5, (s, y)), flush=True)

    # For b>=6 and j>=b+3 put b=r+6, j=b+3+y, a=j-2+s.
    tail_general = delta.subs(
        {rho: u_a6, tau: 0}, simultaneous=True
    ).subs(
        {b: r + 6, j: r + y + 9, a: r + y + s + 7},
        simultaneous=True,
    )
    print("tail_bge6_jgeb3_u6", stats(tail_general, (r, s, y)), flush=True)


if __name__ == "__main__":
    main()
