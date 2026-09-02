#!/usr/bin/env python3
"""Exact staged Bernstein probe for the exceptional target j=4 lane."""

from __future__ import annotations

import argparse

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build
from probe_terminal_q3_low_newton_m1_staged_bernstein_agent import (
    tensor_bernstein_2d,
)


def split_vector(values):
    """de Casteljau split at 1/2 for a Bernstein coefficient vector."""
    levels = [list(values)]
    while len(levels[-1]) > 1:
        previous = levels[-1]
        levels.append([
            (previous[index] + previous[index + 1]) / 2
            for index in range(len(previous) - 1)
        ])
    degree = len(values) - 1
    left = [levels[index][0] for index in range(degree + 1)]
    right = [levels[degree - index][index] for index in range(degree + 1)]
    return left, right


def split_grid(cells, degrees, axis):
    """Split every tensor-Bernstein grid at the midpoint of one axis."""
    du, dv = degrees
    result = []
    for coefficients in cells:
        children = [dict(), dict()]
        if axis == 0:
            for iv in range(dv + 1):
                left, right = split_vector([
                    coefficients[(iu, iv)] for iu in range(du + 1)
                ])
                for iu in range(du + 1):
                    children[0][(iu, iv)] = left[iu]
                    children[1][(iu, iv)] = right[iu]
        else:
            for iu in range(du + 1):
                left, right = split_vector([
                    coefficients[(iu, iv)] for iv in range(dv + 1)
                ])
                for iv in range(dv + 1):
                    children[0][(iu, iv)] = left[iv]
                    children[1][(iu, iv)] = right[iv]
        result.extend(children)
    return result


def subdivide(coefficients, degrees, split_u, split_v):
    assert split_u >= 1 and split_u & (split_u - 1) == 0
    assert split_v >= 1 and split_v & (split_v - 1) == 0
    cells = [coefficients]
    count = 1
    while count < split_u:
        cells = split_grid(cells, degrees, 0)
        count *= 2
    count = 1
    while count < split_v:
        cells = split_grid(cells, degrees, 1)
        count *= 2
    return cells


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=("small_d", "d4plus"), required=True)
    parser.add_argument("--split-u", type=int, default=1)
    parser.add_argument("--split-v", type=int, default=1)
    args = parser.parse_args()

    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    q = sp.symbols("q", nonnegative=True)
    N = 15 + q
    numerator, denominator = sp.together(lower).as_numer_denom()
    assert B2 not in denominator.free_symbols
    numerator = sp.expand(numerator.subs({j: 4, r: 11 + q}))
    S = N - d
    blo = C(d - 1, 2)
    bhi = sp.expand(blo + C(R, 2) + C(S - R, 2))
    width = sp.expand(bhi - blo)
    derivative = sp.diff(numerator, B2)
    bmap = {
        "b0": numerator.subs(B2, blo),
        "b1": numerator.subs(B2, blo) + width * derivative.subs(B2, blo) / 2,
        "b2": numerator.subs(B2, bhi),
    }

    total = failed = 0
    if args.case == "small_d":
        v = sp.symbols("v", nonnegative=True)
        for dv in (1, 2, 3):
            Sv = N - dv
            Rexpr = 1 + (Sv - 1) * v
            for bname, expression in bmap.items():
                for yname, yvalue in (("y0", 0), ("y1", 1)):
                    boxed = expression.subs(
                        {d: dv, R: Rexpr, y: yvalue}, simultaneous=True
                    )
                    boxed_num = sp.together(boxed).as_numer_denom()[0]
                    polynomial = sp.Poly(sp.expand(boxed_num), v)
                    degree = polynomial.degree()
                    case_failed = 0
                    for index in range(degree + 1):
                        coefficient = sum(
                            polynomial.coeff_monomial(v**power)
                            * sp.binomial(index, power) / sp.binomial(degree, power)
                            for power in range(index + 1)
                        )
                        values = sp.Poly(sp.expand(coefficient), q).coeffs()
                        total += 1
                        if any(value < 0 for value in values):
                            failed += 1
                            case_failed += 1
                            print("FAIL", dv, bname, yname, index, flush=True)
                    print("CASE", dv, bname, yname, "degree", degree,
                          "failed", case_failed, flush=True)
    else:
        u, v = sp.symbols("u v", nonnegative=True)
        dexpr = 4 + (N - 5) * u
        Sexpr = N - dexpr
        Rexpr = 1 + (Sexpr - 1) * v
        root4 = C(dexpr, 4)
        hcap = C(Sexpr, 4)
        for bname, expression in bmap.items():
            yzero = expression.subs(y, 0)
            yslope = sp.diff(expression, y)
            yfaces = {
                "y0": yzero,
                "ycap": (root4 + hcap) * yzero + hcap * yslope,
            }
            for yname, yexpression in yfaces.items():
                boxed = yexpression.subs(
                    {d: dexpr, R: Rexpr}, simultaneous=True
                )
                boxed_num = sp.together(boxed).as_numer_denom()[0]
                degrees, coefficients = tensor_bernstein_2d(boxed_num, u, v)
                cells = subdivide(
                    coefficients, degrees, args.split_u, args.split_v
                )
                case_failed = 0
                case_coefficients = 0
                for cell_index, coefficients in enumerate(cells):
                    case_coefficients += len(coefficients)
                    for index, coefficient in coefficients.items():
                            values = sp.Poly(sp.expand(coefficient), q).coeffs()
                            total += 1
                            if any(value < 0 for value in values):
                                failed += 1
                                case_failed += 1
                                if case_failed <= 10:
                                    print(
                                        "FAIL", bname, yname,
                                        "cell", cell_index, "index", index,
                                        flush=True,
                                    )
                print("CASE", bname, yname, "degrees", degrees,
                      "coefficients", case_coefficients, "failed", case_failed,
                      flush=True)
    print("TOTAL", total, "FAILED", failed)


if __name__ == "__main__":
    main()
