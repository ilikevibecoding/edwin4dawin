#!/usr/bin/env python3
"""Low-memory source-coordinate curvature probe for rank-eight Delta4."""

from __future__ import annotations

import argparse
import itertools
import sys

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
    raw = newton_coefficients(residual())[4]
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
    parser.add_argument("--sample", action="store_true", help="sample exact mapped cube instead of expanding curvatures")
    parser.add_argument("--only", choices=("U", "V", "Z"), help="expand only one curvature")
    args = parser.parse_args()
    value, variables = build(args.k, args.piece)
    if args.sample:
        sys.setrecursionlimit(20000)
        n, w, x, U, V, Z = variables
        probes = [value, sp.diff(value, U, 2), sp.diff(value, V, 2)]
        functions = [sp.lambdify(variables, probe, modules="math", cse=True) for probe in probes]
        extrema = [[None, None] for _ in probes]
        witnesses = [[None, None] for _ in probes]
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
                for index, function in enumerate(functions):
                    result = float(function(*point))
                    if extrema[index][0] is None or result < extrema[index][0]:
                        extrema[index][0] = result
                        witnesses[index][0] = (order, Wv, Av, Uv, Vv, Zv)
                    if extrema[index][1] is None or result > extrema[index][1]:
                        extrema[index][1] = result
                        witnesses[index][1] = (order, Wv, Av, Uv, Vv, Zv)
        for label, bounds, points in zip(("value", "d2U", "d2V"), extrema, witnesses):
            print(label, bounds, points)
        return 0
    numerator, denominator = sp.fraction(value)
    numerator_poly = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    denominator_poly = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    print("source_terms", len(numerator_poly.terms()), len(denominator_poly.terms()))
    print("source_degrees", numerator_poly.degree_list(), denominator_poly.degree_list())
    requested = {str(variable) for variable in variables[3:]}
    if args.only:
        requested = {args.only}
    for variable in variables[3:]:
        if str(variable) not in requested:
            continue
        derivative = sp.factor(sp.diff(value, variable, 2))
        dnum, dden = sp.fraction(sp.cancel(derivative))
        dpoly = sp.Poly(sp.expand(dnum), *variables, domain=sp.QQ)
        coefficients = dpoly.coeffs()
        print(
            "d2", variable, "terms", len(dpoly.terms()), "degrees", dpoly.degree_list(),
            "negative", sum(bool(coefficient < 0) for coefficient in coefficients),
            "positive", sum(bool(coefficient > 0) for coefficient in coefficients),
        )
        if len(dpoly.terms()) <= 30:
            print("d2_factor", variable, sp.factor(dnum), "/", sp.factor(dden))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
