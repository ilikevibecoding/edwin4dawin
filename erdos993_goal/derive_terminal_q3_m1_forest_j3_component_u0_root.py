#!/usr/bin/env python3
"""Derive the forest m=1, j=3 lower using the component U0 reserve.

For F=G-w, deleting w splits its marked tree component into d components,
while the other h components of G remain.  Thus F has d+h components.
Every independent 3-set of F therefore has at least d+h-3 unoccupied
component choices for an extension, so
4*i4(F)>=(d+h-3)*i3(F).  Together with the usual H
shadow term this gives

    U0/i3(F) >= (d+h+1)/4 + y + 3*y/(N-3).

The target identity U1=i3(G)+i2(G)=p0 is retained exactly.
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
    b = sp.expand(C(N, 3) - (m - d) * (N - 2) + W - C(d, 2) - R)

    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)
    ebar = sp.factor(1 + y + 3 * z2 / (2 * a))
    Q0 = sp.expand(4 * c0 - 3 * ebar * (p0 + a))
    Q1 = sp.expand(4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1))
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)

    U1 = sp.cancel(p0 / b)
    U0 = sp.factor((d + h + 1) / 4 + y + 3 * y / r)
    gap = sp.expand(2 * p1 * c0 - 3 * a * R1)
    lower = sp.cancel(
        4 * (
            sp.Rational(3, 2) * p0 * R1
            + p0 * U1 * gap / (2 * p1)
            + A1 * (U0 + U1)
        )
        + remainder
    )
    numerator, denominator = sp.together(lower).as_numer_denom()
    return (
        sp.expand(numerator),
        sp.factor(denominator),
        (N, h, d, R, W, y),
        b,
    )


def main():
    numerator, denominator, variables, b = build()
    _N, _h, _d, _R, W, y = variables
    print("denominator", denominator, flush=True)
    print("denominator_over_b", sp.factor(denominator / b), flush=True)
    print("terms", len(sp.Poly(numerator, *variables).terms()), flush=True)
    print("W_degree", sp.Poly(numerator, W).degree(), flush=True)
    print("y_degree", sp.Poly(numerator, y).degree(), flush=True)


if __name__ == "__main__":
    main()
