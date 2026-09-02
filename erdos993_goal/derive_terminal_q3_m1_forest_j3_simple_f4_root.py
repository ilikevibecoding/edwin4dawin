#!/usr/bin/env python3
"""Exact-U1 j=3 lower using polynomial root-neighbor tangent floors."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C


def build():
    N, h, d, R, W, y = sp.symbols(
        "N h d R W y", integer=True, nonnegative=True
    )
    r = N - 3
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
    S = N - d
    p2 = C(S - 1, 2)
    p3 = C(S - 2, 3)
    coarse_f4 = sp.expand(
        d * p3 - R * C(S - 3, 2)
        + C(d, 2) * p2 - (d - 1) * R * (S - 2)
        + C(d, 3) * S - C(d - 1, 2) * R + C(d, 4)
    )
    U0 = sp.cancel(1 + y + (h2 + coarse_f4) / b)
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
    return sp.expand(numerator), sp.factor(denominator), (N, h, d, R, W, y), b


def main():
    numerator, denominator, variables, b = build()
    W, y = variables[-2:]
    print("denominator_over_b", sp.factor(denominator / b))
    print("terms", len(sp.Poly(numerator, *variables).terms()))
    print("W_degree", sp.Poly(numerator, W).degree())
    print("y_degree", sp.Poly(numerator, y).degree())


if __name__ == "__main__":
    main()
