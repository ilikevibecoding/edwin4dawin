#!/usr/bin/env python3
"""Exact cone probe for the omitted marked-star-centre boundary d=N."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build


def report(expression, variables, label):
    numerator, denominator = sp.together(sp.factor(expression)).as_numer_denom()
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    negatives = [value for value in polynomial.coeffs() if value < 0]
    print(label, "den", sp.factor(denominator), "degrees", polynomial.degree_list(),
          "terms", len(polynomial.terms()), "failed", len(negatives),
          "minimum", min(polynomial.coeffs()), flush=True)
    if negatives:
        print("first negatives", negatives[:10], flush=True)


def main():
    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    N = j + r
    center = sp.factor(lower.subs({
        d: N,
        R: 0,
        B2: C(N - 1, 2),
        y: 0,
    }, simultaneous=True))
    k, q = sp.symbols("k q", nonnegative=True)
    # Main all-order cone N>=15, j>=4: r>=11, plus r=0..10 strips.
    report(center.subs({j: 4 + k, r: 11 + q}), (k, q), "r>=11")
    for rv in range(0, 11):
        jmin = max(4, 15 - rv)
        report(center.subs({r: rv, j: jmin + q}), (q,), f"r={rv}")


if __name__ == "__main__":
    main()
