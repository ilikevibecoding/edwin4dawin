#!/usr/bin/env python3
"""Derive the forest m=1, j=3 lower with the exact identity U1=p0.

Exploratory until an all-order cone certificate is supplied.
"""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C


def build():
    N, h, d, R, W, y = sp.symbols(
        "N h d R W y", integer=True, nonnegative=True
    )
    j = sp.Integer(3)
    r = N - j
    m = N - h

    p0 = sp.expand(C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m)
    p1 = sp.expand(C(N + 1, 2) - m + N + 1)
    R1 = sp.expand(m * N - 2 * W)
    a = sp.expand(C(N, 2) - (m - d))
    z2 = sp.expand((m - d) * (N - 2) - 2 * (W - C(d, 2) - R))
    h2 = sp.expand(C(N - d, 2) - (m - d - R))
    c0 = sp.expand(a + z2 + h2)
    b = sp.expand(
        C(N, 3) - (m - d) * (N - 2) + W - C(d, 2) - R
    )
    assert sp.Poly(b, W).degree() == 1

    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)
    ebar = sp.factor(1 + y + 3 * z2 / (2 * a))
    Q0 = sp.expand(4 * c0 - 3 * ebar * (p0 + a))
    Q1 = sp.expand(4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1))
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)

    # Exact target-j=3 identity U1=i3(G)+i2(G)=p0.
    U1 = sp.cancel(p0 / b)
    # Retain the established coupled lower only for U0/b.
    U0 = sp.factor((N - 3 + 2 * y) / 4 + 3 * y / r)
    gap = sp.expand(2 * p1 * c0 - 3 * a * R1)
    lower = sp.cancel(
        4 * (
            sp.Rational(3, 2) * p0 * R1
            + p0 * U1 * gap / (2 * p1)
            + A1 * (U0 + U1)
        )
        + remainder
    )
    mcoef = sp.cancel(a * U1 - p1)
    numerator, denominator = sp.together(lower).as_numer_denom()
    mnum, mden = sp.together(mcoef).as_numer_denom()
    return (
        sp.expand(numerator), sp.factor(denominator),
        sp.expand(mnum), sp.factor(mden),
        (N, h, d, R, W, y), b,
    )


def main():
    numerator, denominator, mnum, mden, variables, b = build()
    N, h, d, R, W, y = variables
    print("denominator", denominator, flush=True)
    print("terms", len(sp.Poly(numerator, *variables).terms()), flush=True)
    print("W_degree", sp.Poly(numerator, W).degree(), flush=True)
    print("y_degree", sp.Poly(numerator, y).degree(), flush=True)
    print("mden", mden, flush=True)
    print("mnum_y0", sp.factor(mnum.subs(y, 0)), flush=True)
    print("mnum_slope", sp.factor(sp.diff(mnum, y)), flush=True)
    print("b", sp.factor(b), flush=True)


if __name__ == "__main__":
    main()
