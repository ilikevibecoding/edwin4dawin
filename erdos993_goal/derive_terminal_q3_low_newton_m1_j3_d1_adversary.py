#!/usr/bin/env python3
"""Correlation-preserving m=1,j=3 search when the marked degree is one.

Derivation aid only.  Here F=G-w is a tree, so the quantitative all-tree
q3<=q2 reserve is retained twice: once in A0 for G disjoint K1 and once in
the terminal z3 bound for F.  This is the asymptotically tight path lane.
"""

from __future__ import annotations

import sympy as sp


def standard_tree_margin_floor(order: sp.Expr, excess: sp.Expr) -> sp.Expr:
    """Lower 3*i3*s2-2*i2*s3 from tau<=(order-1)excess/3."""
    return sp.factor((
        -12 * excess**2
        + 4 * excess * order**2 - 36 * excess * order + 56 * excess
        + order**4 - 8 * order**3 + 17 * order**2 + 2 * order - 24
    ) / 2)


def main() -> None:
    N, R, e, y = sp.symbols("N R e y", nonnegative=True)
    d = sp.Integer(1)
    j = sp.Integer(3)
    W = e + (N - 2) + R
    n = N + 1

    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W

    a = (N - 1) * (N - 2) / 2
    AF = e + N - 2
    z2 = sp.expand((N - 1) * (N - 2) - 2 * AF)
    h2 = sp.expand((N - 1) * (N - 2) / 2 - (N - 1 - R))
    b = sp.expand(N * (N - 1) * (N - 2) / 6 - (N - 1) * (N - 2) + AF)
    c0 = sp.expand(z2 + h2 + a)
    g = sp.factor(2 * p1 * c0 - 3 * a * R1)

    # Quantitative reserve for Q=G disjoint K1.  G has order n and excess
    # W-(n-2)=e+R-1.
    excess_G = e + R - 1
    tree_i2 = (n - 1) * (n - 2) / 2
    tree_i3 = (n - 2) * (n - 3) * (n - 4) / 6 + excess_G
    tree_m2 = (n - 2) * (n - 3) / 2 - excess_G
    tree_s2 = 2 * tree_m2
    tree_s3_cap = (
        (n - 3) * (n - 4) * (n - 5) / 2
        - 2 * (n - 4) * excess_G + (n - 1) * excess_G
    )
    margin_Q = sp.factor(
        3 * (tree_i3 + tree_i2) * (tree_s2 + n - 1)
        - 2 * (tree_i2 + n) * (tree_s3_cap + tree_s2)
    )
    A0 = sp.factor((p0 * g + a * margin_Q) / (2 * p1))
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    # F is a nonstar tree of order N.  Its exact q3-q2 margin is at least
    # the quantitative floor below.  This strengthens the terminal z3
    # upper bound and is equality for the path (e=0).
    margin_F = standard_tree_margin_floor(N, e)
    z3_over_b = sp.factor(3 * z2 / (2 * a) - margin_F / (2 * a * b))
    ebar = 1 + y + z3_over_b
    # R0=s3(G disjoint K1)=s3(G)+s2(G).  The path-surplus coordinate
    # tau_G is nonnegative, so setting tau_G=0 gives a second path-tight
    # positive lower term in Q0.
    R0_floor = sp.factor(
        (n - 3) * (n - 4) * (n - 5) / 2
        - 2 * (n - 4) * excess_G
        + 2 * ((n - 2) * (n - 3) / 2 - excess_G)
    )
    q0bar = (j + 1) * (c0 + R0_floor) - 3 * (p0 + a) * ebar
    q1bar = (
        (j + 1) * (a + R1)
        - 3 * p1 * ebar - 3 * (p0 + a + p1)
    )
    pq1_over_b = sp.expand(p0 * q1bar + p1 * q0bar + p1 * q1bar)

    h1 = N - 1
    U1_over_b = sp.factor((b + h2 + a + h1) / b)
    path_i4 = (N - 3) * (N - 4) * (N - 5) * (N - 6) / 24
    U0_over_b = sp.factor(path_i4 / b + y + 1 + h2 / b)
    lower = sp.factor(
        (j + 1) * a * (
            A0 * U1_over_b + A1 * (U0_over_b + U1_over_b)
        ) + a * pq1_over_b
    )

    lower_numerator, lower_denominator = sp.together(lower).as_numer_denom()
    print("numerator_degrees", {
        "R": sp.Poly(lower_numerator, R).degree(),
        "e": sp.Poly(lower_numerator, e).degree(),
        "y": sp.Poly(lower_numerator, y).degree(),
    })
    print("denominator", sp.factor(lower_denominator))
    print("y_slope", sp.factor(sp.diff(lower, y)))

    function = sp.lambdify((N, R, e, y), lower, "math")
    minimum = None
    negatives = []
    checks = 0
    for Nv in range(15, 201):
        emax = (Nv - 3) * (Nv - 4) // 2
        for Rv in range(1, Nv - 1):
            emin = (Rv - 1) * (Rv - 2) // 2
            if emin > emax:
                continue
            for ev in {emin, emax}:
                for yv in (0, 1):
                    value = function(Nv, Rv, ev, yv)
                    item = (value, Nv, Rv, ev, yv)
                    checks += 1
                    if minimum is None or value < minimum[0]:
                        minimum = item
                    if value < 0:
                        negatives.append(item)
    print("endpoint_checks", checks)
    print("endpoint_minimum", minimum)
    print("endpoint_negatives", len(negatives), sorted(negatives)[:10])

    # Exact path specialization, including its actual y ratio.
    path_y = sp.factor(
        ((N - 3) * (N - 4) * (N - 5) / 6)
        / ((N - 2) * (N - 3) * (N - 4) / 6)
    )
    print("path_factor", sp.factor(lower.subs({R: 1, e: 0, y: path_y})))


if __name__ == "__main__":
    main()
