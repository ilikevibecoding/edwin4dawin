#!/usr/bin/env python3
"""Exact Delta3 cutoff probe retaining the full D4 and D5 intervals."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank7_terminal_broom_reduction import c, exact_decomposition, h, newton_coefficients


def mapped(cutoff: int, endpoints: tuple[int, int, int]):
    n, w, x, U, V = sp.symbols("n w x U V", positive=True)
    ez, es, ed = endpoints
    T, W, A = sp.symbols("T W A", nonnegative=True)
    order = sp.Rational(cutoff, 1) / T
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)

    d4_low = (2 + x) / 10
    d4_value = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    c5 = sp.factor((1 - d4_value) / x**2)
    x5 = sp.factor(c4 / c5)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
    c6 = sp.factor((1 - d5_value) * c5**2 / c4)
    x6 = sp.factor(c5 / c6)
    d6_value = (
        sp.Rational(1, 7) + x6 / 2 if ez else (2 + x6) / 14
    )
    c7 = sp.factor((1 - d6_value) * c6**2 / c5)
    s_value = sp.S.One if es else sp.Rational(1, 2)
    root_d = sp.S.One if ed else sp.Rational(1, 2)

    raw = newton_coefficients(exact_decomposition())[3]
    value = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:8], h[5], h[6]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, s_value*c5, root_d*c6),
                )
            ),
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(value)
    source_variables = (n, w, x, U, V)
    box = (T, W, A, U, V)
    maps = []
    for mapped_value in (order, w_value, x_value, U, V):
        num, den = sp.fraction(sp.cancel(mapped_value))
        maps.append((sp.expand(num), sp.expand(den)))

    def clear(polynomial):
        source = sp.Poly(sp.expand(polynomial), *source_variables, domain=sp.QQ)
        maxima = source.degree_list()
        target_maps = [
            (sp.Poly(num, *box, domain=sp.QQ), sp.Poly(den, *box, domain=sp.QQ))
            for num, den in maps
        ]
        powers = [
            [num**power * den**(maximum-power) for power in range(maximum+1)]
            for maximum, (num, den) in zip(maxima, target_maps)
        ]
        result = sp.Poly(0, *box, domain=sp.QQ)
        for monomial, coefficient in source.terms():
            term = sp.Poly(coefficient, *box, domain=sp.QQ)
            for axis, power in enumerate(monomial):
                term *= powers[axis][power]
            result += term
        return result.as_expr(), maxima

    cleared_numerator, numerator_degrees = clear(numerator)
    cleared_denominator, denominator_degrees = clear(denominator)
    print("cleared_source_degrees", numerator_degrees, denominator_degrees, flush=True)
    return cleared_numerator, cleared_denominator, box


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    for name in ("z", "s", "d"):
        parser.add_argument(f"--{name}", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    endpoints = (args.z, args.s, args.d)
    numerator, denominator, box = mapped(args.cutoff, endpoints)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    print("branch", args.cutoff, endpoints, "terms", len(npoly.terms()), "degrees", npoly.degree_list(), flush=True)
    ddegrees, dcoefficients = tensor_bernstein_fast(denominator, box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print("PASS_DELTA3_FULL_D5_CUTOFF", args.cutoff, *endpoints)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
