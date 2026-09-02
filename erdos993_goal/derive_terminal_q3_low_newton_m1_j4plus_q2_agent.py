#!/usr/bin/env python3
"""Exact symbolic derivation aid for terminal-q3 Newton m=1, j>=4.

This keeps the exact R0 term and uses only the strong-induction cap
q_j(F)<=q_2(F), the global reduced-surplus cap, the coupled U0 floor,
and the elementary rooted-component bound y<=min(1,(N-d)/d).
"""

from __future__ import annotations

import sympy as sp


def C(x, k):
    return sp.prod(x - i for i in range(k)) / sp.factorial(k)


def rank3(order, edges, wedges, connected_four):
    independent = C(order, 3) - edges * (order - 2) + wedges
    matchings = C(edges, 2) - wedges
    one_edge = (
        edges * C(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.expand(independent), sp.expand(one_edge)


def build():
    N, j, r, d, R, B2, tau, y = sp.symbols(
        "N j r d R B2 tau y", nonnegative=True
    )
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = C(N, 2) - S
    wedges_forest = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_forest
    h2 = C(S, 2) - (S - R)
    c0 = sp.expand(a + z2 + h2)

    p0_check, R0 = rank3(N + 2, N, W, N - 2 + B2 + tau)
    assert sp.expand(p0_check - p0) == 0
    A0 = sp.expand(p0 * c0 - a * R0)
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    ebar = sp.factor(1 + y + j * z2 / (2 * a))
    Q0 = sp.expand((j + 1) * (c0 + R0) - 3 * ebar * (p0 + a))
    Q1 = sp.expand(
        (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    )
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)
    S1 = j / (r + 1)
    H1 = j * y / r
    U1 = 1 + S1 + H1
    U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + H1
    gap = sp.factor((j + 1) * (A0 * U1 + A1 * (U0 + U1)) + remainder)
    lower = sp.factor(gap.subs({N: j + r, tau: (j + r - 3) * B2 / 3}))
    return lower, (j, r, d, R, B2, y)


def main():
    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    num, den = sp.together(lower).as_numer_denom()
    print("denominator", sp.factor(den))
    print("degrees", {str(x): sp.Poly(num, x).degree() for x in symbols})
    bpoly = sp.Poly(lower, B2)
    print("B2_degree", bpoly.degree())
    print("B2_LC", sp.factor(bpoly.LC()))
    k, q, u = sp.symbols("k q u", nonnegative=True)
    lc_opposite = sp.factor(-bpoly.LC())
    for yv in (0, 1):
        shifted_lc_num = sp.together(lc_opposite.subs({
            j: 4 + k, r: 1 + q, d: 1 + u, y: yv,
        })).as_numer_denom()[0]
        shifted_lc_poly = sp.Poly(sp.expand(shifted_lc_num), k, q, u)
        coefficients = shifted_lc_poly.coeffs()
        print("B2_concavity_y", yv, "terms", len(coefficients),
              "negative", sum(1 for value in coefficients if value < 0),
              "minimum", min(coefficients))
    print("y_degree", sp.Poly(lower, y).degree())
    blo = C(d - 1, 2)
    bhi = sp.expand(blo + C(R, 2) + C(j + r - d - R, 2))
    for bend, bvalue in (("lo", blo), ("hi", bhi)):
        expression = sp.factor(lower.subs(B2, bvalue))
        for yend, yvalue in (("zero", 0), ("one", 1), ("ratio", (j + r - d) / d)):
            item = sp.factor(expression.subs(y, yvalue))
            item_num, item_den = sp.together(item).as_numer_denom()
            print(bend, yend, "den", sp.factor(item_den))
            print(bend, yend, "degrees", {
                str(x): sp.Poly(item_num, x).degree() for x in (j, r, d, R)
            })


if __name__ == "__main__":
    main()
