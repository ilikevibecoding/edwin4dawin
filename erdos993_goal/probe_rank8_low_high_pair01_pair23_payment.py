#!/usr/bin/env python3
"""Exact probe of a two-pair payment for the low/high strong auxiliary."""

from __future__ import annotations

import sympy as sp


def main() -> None:
    h, c, a0, y, d4, d5, d6 = sp.symbols(
        "h c a0 y d4 d5 d6", nonnegative=True
    )
    C = 6 * h + c
    A1 = C + h
    A0 = C + 3 * h + a0
    p0 = sp.Integer(1)
    p1 = A0
    p2 = A0 * A1 / 2
    p3 = A0 * A1 * C / 6

    B7 = h + y
    B6 = B7 + h + d6
    B5 = B6 + h + d5
    B4 = B5 + h + d4
    q4 = sp.Integer(1)
    q5 = q4 * B4 / 5
    q6 = q5 * B5 / 6
    q7 = q6 * B6 / 7
    q8 = q7 * B7 / 8
    K01 = sp.expand(q7**2 - q6 * q8)
    K12 = sp.expand(q6**2 - q5 * q7)
    K23 = sp.expand(q5**2 - q4 * q6)
    target = sp.together(p0 * p1 * K01 + p2 * p3 * K23 - p1 * p2 * K12)
    numerator, denominator = sp.fraction(target)
    polynomial = sp.Poly(sp.expand(numerator), h, c, a0, y, d4, d5, d6)
    coefficients = [int(value) for value in polynomial.coeffs()]
    negative = [
        (monomial, int(value))
        for monomial, value in polynomial.terms()
        if value < 0
    ]
    print(
        {
            "denominator": int(denominator),
            "terms": len(coefficients),
            "negative": len(negative),
            "minimum": min(coefficients),
            "maximum": max(coefficients),
            "first_negative": negative[:5],
        }
    )


if __name__ == "__main__":
    main()
