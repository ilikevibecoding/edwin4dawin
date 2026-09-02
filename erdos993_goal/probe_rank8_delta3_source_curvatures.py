#!/usr/bin/env python3
"""Low-memory source-coordinate probe for rank-eight terminal Delta3.

The coordinates and the four root-capacity pieces are the exact ones used by
the completed Delta4 proof.  This file only audits the smaller Delta3 source;
it does not assert a sign on an enlarged box.
"""

from __future__ import annotations

import argparse
import itertools

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def build(k_value: int, piece: str):
    n, w, x = sp.symbols("n w x", positive=True)
    U, V, Z = sp.symbols("U V Z", nonnegative=True)
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    d4_low = (2 + x) / 10
    d4 = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c5 = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(c4 / c5)
    a = n - 7
    q_low = sp.factor((30 / x5 - 18 - 3 * k_value) / (7 * a))
    q = sp.factor(q_low + 15 * V / (7 * a))
    c6 = sp.factor(c5 * (7 * a * q + 3 * k_value) / 36)
    c7 = sp.factor(a * q * c6 / 6)
    c8 = sp.factor(c7 * (14 * c7 - c6) / (16 * c6))
    if piece == "l0":
        S = (1 - q) * Z
        h7 = sp.S.Zero
    elif piece == "lcross":
        S = 1 - q + q * Z
        h7 = c7 * Z
    elif piece == "ucap":
        S = 7 * q * Z / 6
        h7 = a * S * c6 / 7
    elif piece == "full":
        S = sp.S.One
        h7 = c7
    else:
        raise ValueError(piece)
    h6 = sp.factor(S * c6)
    raw = newton_coefficients(residual())[3]
    value = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:9], h[6], h[7]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, c8, h6, h7),
                )
            ),
            simultaneous=True,
        )
    )
    return value, (n, w, x, U, V, Z)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("l0", "lcross", "ucap", "full"), required=True)
    parser.add_argument("--sample", action="store_true")
    args = parser.parse_args()
    value, variables = build(args.k, args.piece)
    numerator, denominator = sp.fraction(value)
    numerator_poly = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    denominator_poly = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    print("source_terms", len(numerator_poly.terms()), len(denominator_poly.terms()))
    print("source_degrees", numerator_poly.degree_list(), denominator_poly.degree_list())
    if not args.sample:
        return 0

    source_terms = [
        (monomial, float(coefficient))
        for monomial, coefficient in numerator_poly.terms()
    ]
    source_degrees = numerator_poly.degree_list()

    def evaluate_numerator(point):
        powers = [
            [float(coordinate) ** exponent for exponent in range(degree + 1)]
            for coordinate, degree in zip(point, source_degrees)
        ]
        total = 0.0
        for monomial, coefficient in source_terms:
            term = coefficient
            for axis, exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            total += term
        return total
    extrema = [[None, None]]
    witnesses = [[None, None]]
    for order in (23, 24, 28, 40, 80, 200, 1000):
        w_low = sp.Rational(3, order - 3)
        w_high = sp.Rational(3 * (order - 1), (order - 3) * (order - 4))
        for Wv, Av, Uv, Vv, Zv in itertools.product(
            (sp.Rational(0), sp.Rational(1, 2), sp.Rational(1)), repeat=5
        ):
            wv = w_low + (w_high - w_low) * Wv
            x_low = 8 * wv / (6 - wv)
            x_high = 4 * wv / (3 * (1 - wv))
            xv = x_low + (x_high - x_low) * Av
            point = (order, wv, xv, Uv, Vv, Zv)
            result = evaluate_numerator(point)
            if extrema[0][0] is None or result < extrema[0][0]:
                extrema[0][0] = result
                witnesses[0][0] = point
            if extrema[0][1] is None or result > extrema[0][1]:
                extrema[0][1] = result
                witnesses[0][1] = point
    print("value", extrema[0], witnesses[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
