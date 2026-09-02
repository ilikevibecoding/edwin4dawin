#!/usr/bin/env python3
"""Apply the universal type-I moment functionals in both variables."""

from __future__ import annotations

import sympy as sp

from verify_defect3_typeI_typeII_pairing import typeI_moment
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form
from verify_bottom_universal_schur_tp import neville_parameters


Y = sp.symbols("y")


def bottom_target(N: int, d: int) -> sp.Poly:
    g = sp.expand(hypergeometric_form(N, 3))
    h = sp.expand(hypergeometric_form(N - 1, 3))
    expression = sum(
        sp.binomial(d, k) * sp.diff(g, X, k) * sp.diff(g, X, d - k).subs(X, Y)
        for k in range(d + 1)
    ) - sum(
        sp.binomial(d - 2, k) * sp.diff(h, X, k) * sp.diff(h, X, d - 2 - k).subs(X, Y)
        for k in range(d - 1)
    )
    # MOP variable x=-X/4 in each coordinate.
    return sp.Poly(sp.expand(expression.subs({X: -4 * X, Y: -4 * Y})), X, Y)


def double_dual(N: int, d: int, orders: list[int]) -> sp.Matrix:
    polynomial = bottom_target(N, d)
    matrix = sp.zeros(len(orders))
    terms = polynomial.terms()
    for i, left_order in enumerate(orders):
        left_moments = [typeI_moment(N, left_order, power) for power in range(N + 1)]
        for j, right_order in enumerate(orders):
            right_moments = [typeI_moment(N, right_order, power) for power in range(N + 1)]
            matrix[i, j] = sp.factor(
                sum(
                    coefficient * left_moments[powers[0]] * right_moments[powers[1]]
                    for powers, coefficient in terms
                )
            )
    return matrix


def shape(matrix: sp.Matrix):
    return ["".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i)) for i in range(matrix.rows)]


def main() -> None:
    for m in range(1, 5):
        N, d = 3 * m + 3, 2 * m + 3
        print(f"m={m}, N={N}, d={d}", flush=True)
        for name, orders in (
            ("2..d", list(range(2, d + 1))),
            ("N-d..N-2", list(range(N - d, N - 1))),
            ("balanced", list(range(m + 1, m + d))),
        ):
            matrix = double_dual(N, d, orders)
            neville = None
            if name == "balanced":
                try:
                    row, pivots = neville_parameters(matrix)
                    column, _ = neville_parameters(matrix.T)
                    values = row + pivots + column
                    neville = (sum(int(bool(v > 0)) for v in values), next((sp.factor(v) for v in values if v <= 0), None))
                except AssertionError:
                    neville = "zero predecessor"
            print(f" {name} orders={orders} rank={matrix.rank()} shape={shape(matrix)} neville={neville}", flush=True)
            if m <= 2:
                print(matrix.applyfunc(sp.factor), flush=True)


if __name__ == "__main__":
    main()
