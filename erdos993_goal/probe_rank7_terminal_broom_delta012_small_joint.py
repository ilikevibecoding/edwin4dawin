#!/usr/bin/env python3
"""Joint (i4(J),i5(J),c5(A)) small-J cutoff certificate probe."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import choose_polynomial, normalized_low
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def mapped(
    rank: int,
    cutoff: int,
    m: int,
    q_endpoint: int,
    b_bound: str,
    a_region: str,
):
    expression, (x, y, z, q, s, d) = normalized_low(rank)
    T, X, Y, U, V, Z, A, W = sp.symbols(
        "T X Y U V Z A W", nonnegative=True
    )
    n = sp.Rational(cutoff, 1) / T
    t_n = (n - 7) * (n - 8) / (n - 3)
    if rank == 0:
        mu6_lower = (t_n - 3 + 2 / t_n) / 6
        z_low = 6 / (n - 5)
        z_high = 1 / mu6_lower
        z_value = sp.factor(z_low + (z_high - z_low) * Z)
        x_value = y_value = sp.Integer(1)
        coefficient_box = (Z,)
    elif rank == 1:
        y_low = 5 / (n - 4)
        y_high = 5 / t_n
        y_value = sp.factor(y_low + (y_high - y_low) * Y)
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        x_value = sp.Integer(1)
        coefficient_box = (Y, V)
    else:
        x_low = 4 / (n - 3)
        x_high = 4 * (n - 2) / ((n - 5) * (n - 6))
        x_value = sp.factor(x_low + (x_high - x_low) * X)
        d4_low = (2 + x_value) / 10
        d4_value = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
        y_value = sp.factor(x_value / (1 - d4_value))
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        coefficient_box = (X, U, V)
    q_value = (
        sp.Rational(1, 7) + z_value / 2
        if q_endpoint
        else (2 + z_value) / 14
    )

    c5_lower = choose_polynomial(n - 4, 5)
    c4j = sp.Integer(sp.binomial(m, 4))
    c5j = sp.Integer(sp.binomial(m, 5))
    if m <= 4:
        breakpoint = sp.Integer(0)
    else:
        breakpoint = sp.Max(
            sp.Integer(0), c4j - sp.Rational(3, m - 4) * c5j
        )
        breakpoint = sp.simplify(breakpoint)
    if a_region == "all":
        a_value = c4j * A
    elif a_region == "low":
        a_value = breakpoint * A
    elif a_region == "high":
        a_value = breakpoint + (c4j - breakpoint) * A
    else:
        raise AssertionError(a_region)
    inverse_c5 = W / c5_lower
    s_value = 1 - a_value * inverse_c5
    if b_bound == "zero":
        b_value = sp.Integer(0)
    elif b_bound == "badset":
        b_value = c5j - sp.Rational(max(m - 4, 0), 3) * (c4j - a_value)
    else:
        raise AssertionError(b_bound)
    # d=1-i5(J)/c6 and z=c5/c6.
    d_value = 1 - b_value * z_value * inverse_c5

    box = (T, *coefficient_box, A, W)
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    source = sp.Poly(expression, x, y, z, q, s, d, domain=sp.QQ)
    maxima = source.degree_list()
    maps = []
    for value in (x_value, y_value, z_value, q_value, s_value, d_value):
        numerator, denominator = sp.fraction(sp.cancel(value))
        if denominator.subs(midpoint) < 0:
            numerator, denominator = -numerator, -denominator
        assert denominator.subs(midpoint) > 0
        maps.append(
            (
                sp.Poly(sp.expand(numerator), *box, domain=sp.QQ),
                sp.Poly(sp.expand(denominator), *box, domain=sp.QQ),
            )
        )
    powers = [
        [num**power * den**(maximum - power) for power in range(maximum + 1)]
        for maximum, (num, den) in zip(maxima, maps)
    ]
    cleared = sp.Poly(0, *box, domain=sp.QQ)
    for monomial, coefficient in source.terms():
        term = sp.Poly(coefficient, *box, domain=sp.QQ)
        for axis, power in enumerate(monomial):
            term *= powers[axis][power]
        cleared += term
    denominator = sp.Poly(1, *box, domain=sp.QQ)
    for maximum, (_, den) in zip(maxima, maps):
        denominator *= den**maximum
    return cleared.as_expr(), denominator.as_expr(), box


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--rank", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--m", type=int, choices=range(18), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--b-bound", choices=("zero", "badset"), required=True)
    parser.add_argument("--a-region", choices=("all", "low", "high"), default="all")
    args = parser.parse_args()
    numerator, denominator, box = mapped(
        args.rank, args.cutoff, args.m, args.q, args.b_bound, args.a_region
    )
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    print("branch", args.rank, args.cutoff, args.m, args.q, args.b_bound, args.a_region)
    ddegrees, dcoefficients = tensor_bernstein_fast(dpoly.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(npoly.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print(
        "PASS_DELTA012_SMALL_JOINT",
        args.cutoff,
        args.rank,
        args.m,
        args.q,
        args.b_bound,
        args.a_region,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
