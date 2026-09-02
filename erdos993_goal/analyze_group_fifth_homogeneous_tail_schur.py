#!/usr/bin/env python3
"""Probe a fixed quartic/cubic Schur realization for homogeneous deficit s=4.

After the gamma transform the row is a combination of five consecutive
monic Jacobi polynomials.  Dividing at p_(n-4) gives

    K_n = A_4(y) p_(n-4)(y) - B_3(y) p_(n-5)(y).

If B_3 has positive leading coefficient and strictly interlaces A_4, the
pair is the characteristic-polynomial pair of a real symmetric four-vertex
Jacobi tail.  This script tests that exact fixed-degree criterion throughout
a finite cone grid and records the Bezout principal minors.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_group_general_homogeneous_layers import (
    gamma_coefficients,
    residual_formula_row,
    t,
    y,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fifth_homogeneous_tail_schur_probe_20260804.json"
x, z = sp.symbols("x z")


def monic_jacobi(k: int, alpha: int, beta: sp.Rational) -> sp.Poly:
    polynomial = sp.Poly(sp.jacobi(k, alpha, beta, 1 - 2 * y), y, domain=sp.QQ)
    return sp.Poly(polynomial.as_expr() / polynomial.LC(), y, domain=sp.QQ)


def recurrence_data(
    degree: int, alpha: int, beta: sp.Rational
) -> tuple[list[sp.Expr], list[sp.Expr], list[sp.Poly]]:
    basis = [monic_jacobi(k, alpha, beta) for k in range(degree + 1)]
    diagonals: list[sp.Expr] = []
    subdiagonals: list[sp.Expr] = []
    for k in range(degree):
        residual = sp.Poly(
            y * basis[k].as_expr() - basis[k + 1].as_expr(), y, domain=sp.QQ
        )
        diagonal = residual.coeff_monomial(y**k)
        diagonals.append(diagonal)
        if k >= 1:
            remainder = sp.Poly(
                residual.as_expr() - diagonal * basis[k].as_expr(), y, domain=sp.QQ
            )
            subdiagonal = sp.factor(remainder.LC())
            assert sp.Poly(
                remainder.as_expr() - subdiagonal * basis[k - 1].as_expr(),
                y,
                domain=sp.QQ,
            ).is_zero
            subdiagonals.append(subdiagonal)
    return diagonals, subdiagonals, basis


def bezout_matrix(A: sp.Poly, B: sp.Poly) -> sp.Matrix:
    expression = sp.cancel(
        (A.as_expr().subs(y, x) * B.as_expr().subs(y, z)
         - A.as_expr().subs(y, z) * B.as_expr().subs(y, x))
        / (x - z)
    )
    polynomial = sp.Poly(expression, x, z, domain=sp.QQ)
    return sp.Matrix(
        4,
        4,
        lambda i, j: polynomial.coeff_monomial(x**i * z**j),
    )


def one_cell(N: int, d: int, s: int = 4) -> dict[str, object]:
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
    for k in range(degree, degree - 5, -1):
        coefficient = sp.factor(remainder.LC())
        coefficients.append(coefficient)
        remainder = sp.Poly(
            remainder.as_expr() - coefficient * basis[k].as_expr(), y, domain=sp.QQ
        )
    assert remainder.is_zero and coefficients[0] == 1

    m = degree - 4
    U_previous, U = sp.Poly(0, y), sp.Poly(1, y)
    V_previous, V = sp.Poly(-1, y), sp.Poly(0, y)
    # The V seed is chosen so p_(m+1)=(y-a_m)p_m-b_m p_(m-1).
    U_values = [U]
    V_values = [V]
    for step in range(4):
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
        sum(coefficients[j] * U_values[4 - j].as_expr() for j in range(5)),
        y,
        domain=sp.QQ,
    )
    V_combo = sp.Poly(
        sum(coefficients[j] * V_values[4 - j].as_expr() for j in range(5)),
        y,
        domain=sp.QQ,
    )
    # Our V convention gives p_(m+k)=U_k*p_m-V_k*p_(m-1).
    B = V_combo
    assert sp.Poly(
        K.as_expr() - A.as_expr() * basis[m].as_expr()
        + B.as_expr() * basis[m - 1].as_expr(),
        y,
        domain=sp.QQ,
    ).is_zero
    assert A.degree() == 4 and B.degree() == 3 and B.LC() > 0
    B_monic = sp.Poly(B.as_expr() / B.LC(), y, domain=sp.QQ)
    roots_A = sorted(float(sp.re(root)) for root in sp.nroots(A.as_expr(), n=60))
    roots_B = sorted(float(sp.re(root)) for root in sp.nroots(B_monic.as_expr(), n=60))
    interlaces = all(
        roots_A[j] < roots_B[j] < roots_A[j + 1] for j in range(3)
    )
    matrix = bezout_matrix(A, B_monic)
    minors = [sp.factor(matrix[:k, :k].det()) for k in range(1, 5)]
    if not all(value > 0 for value in minors):
        matrix = -matrix
        minors = [sp.factor(matrix[:k, :k].det()) for k in range(1, 5)]
    assert interlaces and all(value > 0 for value in minors)
    return {
        "N": N,
        "d": d,
        "r": r,
        "p": p,
        "degree": degree,
        "alpha": alpha,
        "beta": str(beta),
        "connection_coefficients": list(map(str, coefficients)),
        "A4": str(A.as_expr()),
        "B3": str(B.as_expr()),
        "B3_leading_coefficient": str(B.LC()),
        "bezout_leading_principal_minors": list(map(str, minors)),
    }


def main() -> None:
    records = []
    for d in range(11, 19):
        for r in range(0, d - 4):
            N = d + r
            p = N - abs(r - 4)
            if p // 2 >= 5:
                records.append(one_cell(N, d))
    report = {
        "status": "PASS_EXACT_TAIL_SCHUR_PROBE",
        "layer_deficit": 4,
        "cell_count": len(records),
        "records": records,
        "scope": (
            "Finite exact quartic/cubic Bezout certificates.  Uniform "
            "positive formulas for the four principal minors remain open."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "cell_count": len(records),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
