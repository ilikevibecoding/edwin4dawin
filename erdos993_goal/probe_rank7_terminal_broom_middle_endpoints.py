#!/usr/bin/env python3
"""Exact endpoint Bernstein probes for rank-7 low Newton differences."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank7_terminal_broom_middle_differences import (
    CORE_ORDER,
    D4_CEILING,
)
from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


def mapped(rank: int, endpoints: tuple[int, int, int, int, int]):
    n, w, x = sp.symbols("n w x", positive=True)
    eu, ev, ez, es, ed = endpoints
    T, W, A, U = sp.symbols("T W A U", nonnegative=True)
    order = sp.Rational(CORE_ORDER, 1) / T
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)

    u_low = (2 + x) / 10
    if eu == 2:
        u_value = sp.factor(u_low + (D4_CEILING - u_low) * U)
    else:
        u_value = D4_CEILING if eu else u_low
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    c5 = sp.factor((1 - u_value) / x**2)
    x5 = sp.factor(c4 / c5)
    v_value = (sp.Rational(1, 6) + x5 / 2) if ev else ((2 + x5) / 12)
    c6 = sp.factor((1 - v_value) * c5**2 / c4)
    x6 = sp.factor(c5 / c6)
    z_value = (sp.Rational(1, 7) + x6 / 2) if ez else ((2 + x6) / 14)
    c7 = sp.factor((1 - z_value) * c6**2 / c5)
    s_value = sp.S.One if es else sp.Rational(1, 2)
    d_value = sp.S.One if ed else sp.Rational(1, 2)
    raw = newton_coefficients(exact_decomposition())[rank]
    endpoint_rational = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:8], h[5], h[6]),
                    (c0,c1,c2,c3,c4,c5,c6,c7,s_value*c5,d_value*c6),
                )
            ),
            simultaneous=True,
        )
    )
    endpoint_numerator, endpoint_denominator = sp.fraction(endpoint_rational)
    source_variables = (n, w, x, U) if eu == 2 else (n, w, x)
    print(
        "endpoint_abstract_terms",
        len(sp.Poly(sp.expand(endpoint_numerator), *source_variables).terms()),
        "degrees",
        sp.Poly(sp.expand(endpoint_numerator), *source_variables).degree_list(),
        flush=True,
    )
    box = (T, W, A, U) if eu == 2 else (T, W, A)
    maps = []
    for value in (order, w_value, x_value):
        numerator, denominator = sp.fraction(sp.cancel(value))
        maps.append((sp.expand(numerator), sp.expand(denominator)))
    if eu == 2:
        maps.append((U, sp.S.One))

    def clear_polynomial(polynomial):
        source = sp.Poly(
            sp.expand(polynomial), *source_variables, domain=sp.QQ
        )
        maxima = source.degree_list()
        target_maps = [
            (
                sp.Poly(num, *box, domain=sp.QQ),
                sp.Poly(den, *box, domain=sp.QQ),
            )
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

    cleared_numerator, numerator_maxima = clear_polynomial(endpoint_numerator)
    cleared_denominator, denominator_maxima = clear_polynomial(endpoint_denominator)
    print("cleared_source_degrees", numerator_maxima, denominator_maxima, flush=True)
    return cleared_numerator, cleared_denominator, box


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=range(3, 7), required=True)
    parser.add_argument("--u", type=int, choices=(0, 1, 2), required=True,
                        help="0/1 endpoint, or 2 to retain full D4 interval")
    for name in ("v", "z", "s", "d"):
        parser.add_argument(f"--{name}", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    endpoints = (args.u, args.v, args.z, args.s, args.d)
    numerator, denominator, box = mapped(args.rank, endpoints)
    print("rank", args.rank, "endpoints", endpoints, flush=True)
    print(
        "terms",
        len(sp.Poly(numerator, *box).terms()),
        "degrees",
        sp.Poly(numerator, *box).degree_list(),
        flush=True,
    )
    ddegrees, dcoeffs = tensor_bernstein_fast(denominator, box)
    dminimum, dindex = minimum_with_index(dcoeffs)
    print("denominator", ddegrees, dcoeffs.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    if minimum < 0:
        raise AssertionError((args.rank, endpoints, minimum, index))
    print("PASS_ENDPOINT", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
