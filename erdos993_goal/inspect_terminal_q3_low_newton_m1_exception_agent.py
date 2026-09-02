#!/usr/bin/env python3
"""Extract and certify one exceptional staged-Bernstein coefficient."""

from __future__ import annotations

import argparse

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build
from probe_terminal_q3_low_newton_m1_staged_bernstein_agent import (
    nonnegative_power,
    tensor_bernstein_2d,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", choices=("low_d", "high_d"), required=True)
    parser.add_argument("--b", choices=("b0", "b1", "b2"), required=True)
    parser.add_argument("--y", choices=("y0", "y1", "yratio"), required=True)
    parser.add_argument("--u-index", type=int, required=True)
    parser.add_argument("--v-index", type=int, required=True)
    args = parser.parse_args()

    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    N = j + r
    S = N - d
    numerator, denominator = sp.together(lower).as_numer_denom()
    assert B2 not in denominator.free_symbols
    blo = C(d - 1, 2)
    bhi = sp.expand(blo + C(R, 2) + C(S - R, 2))
    width = sp.expand(bhi - blo)
    derivative = sp.diff(numerator, B2)
    bmap = {
        "b0": numerator.subs(B2, blo),
        "b1": numerator.subs(B2, blo) + width * derivative.subs(B2, blo) / 2,
        "b2": numerator.subs(B2, bhi),
    }
    expression = bmap[args.b]

    u, v = sp.symbols("u v", nonnegative=True)
    half = (N - 2) * u / 2
    if args.region == "low_d":
        dexpr = 1 + half
        Sexpr = N - dexpr
    else:
        Sexpr = 1 + half
        dexpr = N - Sexpr
    Rexpr = 1 + (Sexpr - 1) * v
    if args.y == "yratio":
        yzero = expression.subs(y, 0)
        yslope = sp.diff(expression, y)
        boxed = (
            dexpr * yzero.subs({d: dexpr, R: Rexpr}, simultaneous=True)
            + Sexpr * yslope.subs({d: dexpr, R: Rexpr}, simultaneous=True)
        )
    else:
        yvalue = 0 if args.y == "y0" else 1
        boxed = expression.subs(
            {d: dexpr, R: Rexpr, y: yvalue}, simultaneous=True
        )
    boxed_numerator = sp.together(boxed).as_numer_denom()[0]
    degrees, coefficients = tensor_bernstein_2d(boxed_numerator, u, v)
    selected = coefficients[(args.u_index, args.v_index)]
    print("box_degrees", degrees)
    print("selected_factor", sp.factor(selected))

    k, q = sp.symbols("k q", nonnegative=True)
    quadrant = sp.expand(selected.subs({j: 4 + k, r: 11 + q}))
    print("quadrant_degrees", sp.Poly(quadrant, k, q).degree_list())
    print("quadrant_factor", sp.factor(quadrant))
    print("quadrant_expression", quadrant)

    for shift_q in range(0, 201):
        tail = quadrant.subs(q, q + shift_q)
        if not nonnegative_power(tail, (k, q)):
            continue
        if all(
            nonnegative_power(quadrant.subs(q, value), (k,))
            for value in range(shift_q)
        ):
            print("q_shift_certificate", shift_q)
            return
    for shift_k in range(0, 201):
        tail = quadrant.subs(k, k + shift_k)
        if not nonnegative_power(tail, (k, q)):
            continue
        if all(
            nonnegative_power(quadrant.subs(k, value), (q,))
            for value in range(shift_k)
        ):
            print("k_shift_certificate", shift_k)
            return
    print("no_axis_shift_through_200")


if __name__ == "__main__":
    main()
