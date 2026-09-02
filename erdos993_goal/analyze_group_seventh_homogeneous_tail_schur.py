#!/usr/bin/env python3
"""Direct exact quintic/quartic tail extraction for homogeneous deficit s=6."""

from __future__ import annotations

import sympy as sp

from analyze_group_fifth_homogeneous_tail_schur import recurrence_data
from verify_group_general_homogeneous_layers import (
    gamma_coefficients,
    residual_formula_row,
    t,
    y,
)


x, z = sp.symbols("x z")


def bezout_matrix(A: sp.Poly, B: sp.Poly) -> sp.Matrix:
    order = A.degree()
    expression = sp.cancel(
        (A.as_expr().subs(y, x) * B.as_expr().subs(y, z)
         - A.as_expr().subs(y, z) * B.as_expr().subs(y, x))
        / (x - z)
    )
    polynomial = sp.Poly(expression, x, z, domain=sp.QQ)
    return sp.Matrix(
        order,
        order,
        lambda i, j: polynomial.coeff_monomial(x**i * z**j),
    )


def one_cell(N: int, d: int, s: int = 6) -> dict[str, object]:
    tail_order = s // 2 + 2
    r = N - d
    row = residual_formula_row(N, d, s)
    p = N - abs(r - s)
    alpha = abs(r - s)
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    gamma = gamma_coefficients(row, p)
    F = sum(coefficient * t**k for k, coefficient in enumerate(gamma))
    K = sp.Poly(
        sp.cancel((1 - y) ** degree * F.subs(t, -y / (4 * (1 - y)))),
        y,
        domain=sp.QQ,
    )
    K = sp.Poly(K.as_expr() / K.LC(), y, domain=sp.QQ)

    diagonals, subdiagonals, basis = recurrence_data(degree, alpha, beta)
    remainder = K
    coefficients: list[sp.Expr] = []
    for k in range(degree, degree - tail_order - 1, -1):
        coefficient = sp.factor(remainder.LC())
        coefficients.append(coefficient)
        remainder = sp.Poly(
            remainder.as_expr() - coefficient * basis[k].as_expr(), y, domain=sp.QQ
        )
    assert remainder.is_zero and coefficients[0] == 1

    m = degree - tail_order
    U_previous, U = sp.Poly(0, y), sp.Poly(1, y)
    V_previous, V = sp.Poly(-1, y), sp.Poly(0, y)
    U_values = [U]
    V_values = [V]
    for step in range(tail_order):
        diagonal = diagonals[m + step]
        subdiagonal = subdiagonals[m + step - 1]
        U_next = sp.Poly(
            (y - diagonal) * U.as_expr() - subdiagonal * U_previous.as_expr(),
            y,
            domain=sp.QQ,
        )
        V_next = sp.Poly(
            (y - diagonal) * V.as_expr() - subdiagonal * V_previous.as_expr(),
            y,
            domain=sp.QQ,
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    A = sp.Poly(
        sum(
            coefficients[j] * U_values[tail_order - j].as_expr()
            for j in range(tail_order + 1)
        ),
        y,
        domain=sp.QQ,
    )
    B = sp.Poly(
        sum(
            coefficients[j] * V_values[tail_order - j].as_expr()
            for j in range(tail_order + 1)
        ),
        y,
        domain=sp.QQ,
    )
    assert sp.Poly(
        K.as_expr() - A.as_expr() * basis[m].as_expr()
        + B.as_expr() * basis[m - 1].as_expr(),
        y,
        domain=sp.QQ,
    ).is_zero
    assert A.degree() == 5 and B.degree() == 4 and B.LC() > 0
    B_monic = sp.Poly(B.as_expr() / B.LC(), y, domain=sp.QQ)
    matrix = bezout_matrix(A, B_monic)
    minors = [sp.factor(matrix[:k, :k].det()) for k in range(1, 6)]
    if not all(value > 0 for value in minors):
        matrix = -matrix
        minors = [sp.factor(matrix[:k, :k].det()) for k in range(1, 6)]
    assert all(value > 0 for value in minors)
    return {
        "N": N,
        "d": d,
        "r": r,
        "p": p,
        "degree": degree,
        "alpha": alpha,
        "beta": str(beta),
        "connection_coefficients": list(map(str, coefficients)),
        "A5": str(A.as_expr()),
        "B4": str(B.as_expr()),
        "B4_leading_coefficient": str(B.LC()),
        "bezout_leading_principal_minors": list(map(str, minors)),
    }
