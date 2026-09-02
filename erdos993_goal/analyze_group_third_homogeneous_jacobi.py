#!/usr/bin/env python3
"""Extract the trailing Jacobi coupling for the third homogeneous layer.

For layer deficit s=2, the gamma-transformed residual row is a linear
combination of four consecutive monic Jacobi polynomials

    Q = p_n + A p_(n-1) + B p_(n-2) + C p_(n-3).

Any such polynomial is the characteristic polynomial of the Jacobi matrix
for p_n with only its final 2-by-2 block changed, provided one explicit
new squared coupling u^2 is positive.  This script extracts that rational
quantity exactly across the endpoint cone to discover and audit an
all-order positivity formula.
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
REPORT = HERE / "group_third_homogeneous_jacobi_probe_20260804.json"


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


def one_cell(N: int, d: int) -> dict[str, object]:
    s = 2
    r = N - d
    assert r >= s
    row = residual_formula_row(N, d, s)
    p = d + s
    alpha = r - s
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
    for k in range(degree, max(-1, degree - 4), -1):
        coefficient = sp.factor(remainder.LC())
        coefficients.append(coefficient)
        remainder = sp.Poly(
            remainder.as_expr() - coefficient * basis[k].as_expr(), y, domain=sp.QQ
        )
    assert remainder.is_zero
    one, A, B, C = coefficients
    assert one == 1

    a_last = diagonals[degree - 1]
    a_previous = diagonals[degree - 2]
    b_last = subdiagonals[degree - 2]
    b_previous = subdiagonals[degree - 3]

    # Comparing the P_(n-3) coefficient fixes the new last diagonal;
    # comparing the P_(n-2) coefficient then fixes the new squared coupling.
    delta_last = sp.factor(a_last - A + C / b_previous)
    delta_previous = sp.factor(a_previous - C / b_previous)
    coupling_squared = sp.factor(
        delta_last * delta_previous
        - ((a_last - A) * a_previous + B - b_last)
    )
    ratio = sp.factor(coupling_squared / b_last)
    assert coupling_squared > 0

    return {
        "N": N,
        "d": d,
        "p": p,
        "jacobi_degree": degree,
        "alpha": alpha,
        "beta": str(beta),
        "A": str(A),
        "B": str(B),
        "C": str(C),
        "new_coupling_squared": str(coupling_squared),
        "original_coupling_squared": str(b_last),
        "coupling_ratio": str(ratio),
    }


def main() -> None:
    records = []
    for d in range(9, 25):
        for r in range(2, d - 4):
            records.append(one_cell(d + r, d))
    report = {
        "status": "PASS_EXACT_POSITIVITY_PROBE",
        "layer_deficit": 2,
        "cell_count": len(records),
        "records": records,
        "scope": (
            "Exact finite extraction of the one remaining Jacobi coupling. "
            "A symbolic all-order positive formula is still required."
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
