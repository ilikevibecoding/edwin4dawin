#!/usr/bin/env python3
"""Exact replay checks for Section 8 of the local Poincare subagent note.

This script is not the proof: the TP2/MLR argument in the note is all-order.
It verifies the symbolic normalizations, the final positive polynomial, and
finite exact instances of the partial-Bell TP2 statement used there.
"""

from fractions import Fraction
import math

import sympy as sp


def symbolic_checks() -> None:
    Y, s, h, m, q, c = sp.symbols("Y s h m q c", positive=True)

    alpha1 = (13 * Y + 2 * s) / (6 * Y**2)
    kappa = -Y * sp.diff(sp.log(alpha1), Y)
    assert sp.simplify(kappa - (13 * Y + 4 * s) / (13 * Y + 2 * s)) == 0
    assert sp.simplify(kappa * alpha1 - (13 * Y + 4 * s) / (6 * Y**2)) == 0

    n = sp.symbols("n", integer=True, positive=True)
    cn = sp.binomial(2 * n, n) / 4**n
    cprev = cn * 2 * n / (2 * n - 1)
    cnext = cn * (2 * n + 1) / (2 * n + 2)
    second_difference = sp.simplify(cprev - 2 * cn + cnext)
    assert sp.simplify(second_difference - 3 * cn / (2 * (n + 1) * (2 * n - 1))) == 0

    Y0 = 3 * m + s
    a = m + h - 1
    lower = (Y0 * (Y0 - 3) - 7 * (h - 1)) / (Y0 - 3) ** 2
    target = (16 * a**2 - 12 * a + 5) / (8 * (a - 1) * (2 * a - 1))
    num, den = sp.together(lower - target).as_numer_denom()
    wanted_den = 8 * (h + m - 2) * (2 * h + 2 * m - 3) * (3 * m + s - 3) ** 2
    assert sp.simplify(den - wanted_den) == 0

    positive_num = sp.Poly(sp.expand(num.subs(m, s + 4 + q).subs(s, 2 * h + c)), h, q, c)
    assert all(coef > 0 for coef in positive_num.coeffs())
    assert len(positive_num.terms()) == 19
    print("symbolic identities: PASS")
    print("final cleared numerator: 19 positive coefficients; minimum =", min(positive_num.coeffs()))


def series_mul(a: list[Fraction], b: list[Fraction], degree: int) -> list[Fraction]:
    out = [Fraction(0) for _ in range(degree + 1)]
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b[: degree + 1 - i]):
                out[i + j] += ai * bj
    return out


def finite_bell_tp2_check(max_n: int = 12) -> None:
    # A representative decreasing-ratio log-concave sequence.  The theorem in
    # the note applies to every such sequence; this only audits conventions.
    alpha = {i: Fraction(i + 1, i + 2) for i in range(2, max_n + 1)}
    c = [Fraction(0), Fraction(1), Fraction(1)]
    for j in range(3, max_n + 1):
        ratio = math.prod((alpha[i] for i in range(2, j)), start=Fraction(1))
        c.append(c[-1] * ratio)

    G = [Fraction(0)] + [c[j] / j for j in range(1, max_n + 1)]
    powers = [[Fraction(0) for _ in range(max_n + 1)] for _ in range(max_n + 1)]
    powers[0][0] = Fraction(1)
    e = [[Fraction(0) for _ in range(max_n + 1)] for _ in range(max_n + 1)]
    e[0][0] = Fraction(1)
    for k in range(1, max_n + 1):
        powers[k] = series_mul(powers[k - 1], G, max_n)
        for n in range(max_n + 1):
            e[n][k] = powers[k][n] / math.factorial(k)

    for n in range(1, max_n + 1):
        for k in range(1, n + 1):
            lhs = n * e[n][k]
            rhs = sum(c[ell] * e[n - ell][k - 1] for ell in range(1, n + 1))
            assert lhs == rhs

    for k in range(1, max_n):
        for n in range(k, max_n):
            determinant = e[n][k - 1] * e[n + 1][k] - e[n][k] * e[n + 1][k - 1]
            assert determinant >= 0
    print(f"partial-Bell recurrence and adjacent TP2 through N={max_n}: PASS")


if __name__ == "__main__":
    symbolic_checks()
    finite_bell_tp2_check()
