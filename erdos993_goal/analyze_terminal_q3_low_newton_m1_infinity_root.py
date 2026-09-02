#!/usr/bin/env python3
"""Compactified-quadrant audit for the remaining tree m=1 coefficients."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build
from probe_terminal_q3_low_newton_m1_staged_bernstein_agent import tensor_bernstein_2d


def compactified_coefficients(expression, left, right):
    x, y = sp.symbols("compact_x compact_y", nonnegative=True)
    polynomial = sp.Poly(sp.expand(expression), left, right)
    dl, dr = polynomial.degree(left), polynomial.degree(right)
    compact = sp.cancel(
        (1 - x) ** dl
        * (1 - y) ** dr
        * expression.subs(
            {left: x / (1 - x), right: y / (1 - y)},
            simultaneous=True,
        )
    )
    numerator, denominator = sp.together(compact).as_numer_denom()
    assert sp.expand(denominator) == 1
    degrees, coefficients = tensor_bernstein_2d(sp.expand(numerator), x, y)
    return (dl, dr), degrees, coefficients


def main() -> None:
    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    N = j + r
    lower_numerator = sp.together(lower).as_numer_denom()[0]
    blo = C(d - 1, 2)
    b0 = sp.expand(lower_numerator.subs(B2, blo))

    u, v = sp.symbols("u v", nonnegative=True)
    dexpr = 1 + (N - 2) * u / 2
    Sexpr = N - dexpr
    Rexpr = 1 + (Sexpr - 1) * v
    expression = b0.subs(
        {d: dexpr, R: Rexpr, y: 1},
        simultaneous=True,
    )
    numerator = sp.together(expression).as_numer_denom()[0]
    _, uv_coefficients = tensor_bernstein_2d(numerator, u, v)

    k, q = sp.symbols("k q", nonnegative=True)
    for index in ((4, 0), (4, 1)):
        coefficient = sp.factor(uv_coefficients[index])
        main = sp.factor(coefficient.subs({j: 4 + k, r: 11 + q}))
        power = sp.Poly(sp.expand(main), k, q)
        negative_power = [value for value in power.coeffs() if value < 0]
        original_degrees, compact_degrees, compact = compactified_coefficients(main, k, q)
        negative_compact = [
            (cell, value) for cell, value in compact.items() if value < 0
        ]
        print(
            "index", index,
            "power_degrees", original_degrees,
            "power_negative", negative_power,
            "compact_degrees", compact_degrees,
            "compact_negative", negative_compact,
            "compact_min", min(compact.values()),
            flush=True,
        )
        if not negative_compact:
            print("PASS_COMPACTIFIED_BERNSTEIN", index, flush=True)


if __name__ == "__main__":
    main()
