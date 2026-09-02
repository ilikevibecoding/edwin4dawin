#!/usr/bin/env python3
"""Search sparse two-sided generators for the deflated affine pencil.

For each choice of sub/super diagonal support, solve the exact linear system

    M1 = X M0 + M0 Y

with X,Y supported on one adjacent diagonal.  If it exists, also test the
higher coefficients in exp(tX) M0 exp(tY).
"""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def sparse_generator(q: int, orientation: str, prefix: str, diagonal: bool = False):
    variables = list(sp.symbols(f"{prefix}0:{q-1}"))
    matrix = sp.zeros(q)
    for i, variable in enumerate(variables):
        if orientation == "super":
            matrix[i, i + 1] = variable
        else:
            matrix[i + 1, i] = variable
    if diagonal:
        diagonal_variables = list(sp.symbols(f"{prefix}d0:{q}"))
        variables += diagonal_variables
        for i, variable in enumerate(diagonal_variables):
            matrix[i, i] = variable
    return matrix, variables


for d in range(3, 9):
    _, _, _, m0, m1 = null_coordinate_data(d)
    q = d - 1
    print(f"d={d}")
    for xo in ("super", "sub"):
        for yo in ("super", "sub"):
            x, xv = sparse_generator(q, xo, "x", diagonal=True)
            y, yv = sparse_generator(q, yo, "y", diagonal=True)
            variables = list(xv) + list(yv)
            equations = list(x * m0 + m0 * y - m1)
            solution_set = sp.linsolve(equations, variables)
            if solution_set is sp.EmptySet:
                print(f" {xo}/{yo}: no linear solution")
                continue
            solutions = list(solution_set)
            if not solutions:
                print(f" {xo}/{yo}: no linear solution")
                continue
            solution = solutions[0]
            xs = x.subs(dict(zip(variables, solution)))
            ys = y.subs(dict(zip(variables, solution)))
            quadratic = sp.simplify(xs**2 * m0 / 2 + xs * m0 * ys + m0 * ys**2 / 2)
            numeric = all(not value.free_symbols for value in solution)
            print(
                f" {xo}/{yo}: solution={tuple(map(sp.factor, solution))}, "
                f"nonnegative={all(value >= 0 for value in solution) if numeric else 'parametric'}, "
                f"quadratic_zero={quadratic == sp.zeros(q)}"
            )
