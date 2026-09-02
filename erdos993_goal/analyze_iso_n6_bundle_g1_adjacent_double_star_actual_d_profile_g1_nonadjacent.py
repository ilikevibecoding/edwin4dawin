#!/usr/bin/env python3
"""Exact sparse profile of the remaining adjacent-double-star g1 polynomial."""

from __future__ import annotations

import os

import sympy as sp

from explore_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import marked_rows
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def build(keep_u: int, keep_v: int):
    expression = reconstruct(1)
    names = {str(x): x for x in expression.free_symbols}
    t, a, b, rx, ry, rz = sp.symbols("t a b rx ry rz", nonnegative=True)
    n, m = t + 8, t + 6
    x_count = m * a
    y_count = m * (1 - a) * b
    z_count = m * (1 - a) * (1 - b)
    crows = marked_rows(m, x_count, y_count, 1, 1)
    retained_x = x_count * rx
    retained_y = y_count * ry
    retained_z = z_count * rz
    drows = marked_rows(
        retained_x + retained_y + retained_z,
        retained_x,
        retained_y,
        keep_u,
        keep_v,
    )
    substitutions = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for family, row in zip("EUVW", rows):
            for rank in range(8):
                name = f"{prefix}{family}{rank}"
                if name in names:
                    substitutions[names[name]] = row[rank]
    value = sp.expand_func(expression.subs(substitutions))
    return value, (t, a, b, rx, ry, rz)


def main():
    case = os.environ.get("G1_KEEP_CASE", "00")
    value, variables = build(int(case[0]), int(case[1]))
    polynomial = sp.Poly(value, *variables)
    print("CASE", case)
    print("DEGREES", [polynomial.degree(variable) for variable in variables])
    print("TERMS", len(polynomial.terms()))
    print("NEGATIVE_POWER_COEFFICIENTS", sum(coefficient < 0 for coefficient in polynomial.coeffs()))


if __name__ == "__main__":
    main()
