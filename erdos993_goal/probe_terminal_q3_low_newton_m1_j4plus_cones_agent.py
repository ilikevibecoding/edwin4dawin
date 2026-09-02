#!/usr/bin/env python3
"""Probe exact positive-coordinate cones for the m=1,j>=4 lower bound."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build


def region_numerator(lower, symbols, region):
    j, r, d, R, B2, y = symbols
    N = j + r
    u, v, w, t = sp.symbols("u v w t", nonnegative=True)
    half = (N - 2) * u / 2
    if region == "low_d":
        dexpr = 1 + half
        Sexpr = N - dexpr
        yexpr = t
    else:
        Sexpr = 1 + half
        dexpr = N - Sexpr
        yexpr = Sexpr * t / dexpr
    Rexpr = 1 + (Sexpr - 1) * v
    blo = C(dexpr - 1, 2)
    bhi = sp.expand(blo + C(Rexpr, 2) + C(Sexpr - Rexpr, 2))
    Bexpr = blo + (bhi - blo) * w
    expression = lower.subs({
        d: dexpr, R: Rexpr, B2: Bexpr, y: yexpr,
    }, simultaneous=True)
    numerator, denominator = sp.together(expression).as_numer_denom()
    print(region, "denominator", sp.factor(denominator), flush=True)
    return sp.expand(numerator), (u, v, w, t)


def sign_report(expression, variables, label):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    negatives = [value for value in coefficients if value < 0]
    print(label, "degrees", [polynomial.degree(x) for x in variables],
          "terms", len(coefficients), "negative", len(negatives),
          "minimum", min(coefficients), flush=True)
    if negatives:
        print(label, "first_negatives", negatives[:8], flush=True)


def main():
    lower, symbols = build()
    j, r, *_ = symbols
    k, q = sp.symbols("k q", nonnegative=True)
    for region in ("low_d", "high_d"):
        numerator, box = region_numerator(lower, symbols, region)
        sign_report(
            numerator.subs({j: 4 + k, r: 11 + q}, simultaneous=True),
            (k, q, *box), f"{region}:r>=11",
        )
        for rv in range(1, 11):
            sign_report(
                numerator.subs({j: 15 - rv + q, r: rv}, simultaneous=True),
                (q, *box), f"{region}:r={rv}",
            )


if __name__ == "__main__":
    main()
