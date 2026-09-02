#!/usr/bin/env python3
"""Coefficientwise audit of the checker-core off-diagonal homotopy.

Let UJ be the good Jacobi upper factor, Vbar the universal beta checker
inverse, and M=E Z E the checker form of the central Catalan M-matrix.
Writing M=M0+t*M1 with M0 diagonal, define

    T_q(t) = UJ * (M0 + t*M1) * Vbar.

This is upper triangular.  Its transpose-Neville initial minors are

    Delta(q,c,r;t) = det T_q(t)[0:c+1, r-c:r+1].

Coefficientwise nonnegativity of every Delta, with positive constant term,
would prove T_q(t) TN for t>=0.  This verifier uses exact FLINT polynomial
Bareiss elimination.  Passing a finite range is evidence, not the missing
all-order coefficient formula.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from math import prod
from pathlib import Path

from flint import fmpq, fmpq_poly

from fast_bottom_forward import (
    beta_coefficients,
    catalan,
    central_z,
    matmul,
)
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_confluent_transition_sections import inverse_matrix


OUT = Path("newton_checker_offdiag_homotopy_20260803.json")


def jacobi_upper(q: int):
    hankel = [[F(catalan(i + j + 3)) for j in range(q)] for i in range(q)]
    inverse = inverse_matrix(hankel)
    work = [
        [
            F(-1 if (i + j) % 2 else 1) * inverse[q - 1 - i][q - 1 - j]
            for j in range(q)
        ]
        for i in range(q)
    ]
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    return work


def beta_checker_inverse(q: int):
    n = q - 1
    upper = matmul(
        inverse_lower_unit(beta_newton_lower(q)), beta_coefficients(q)
    )
    universal = [
        [upper[i][j] / prod(range(i + 5, n + 5)) for j in range(q)]
        for i in range(q)
    ]
    inverse = inverse_matrix(universal)
    return [
        [F(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
        for i in range(q)
    ]


def constant_and_linear(q: int):
    uj = jacobi_upper(q)
    vbar = beta_checker_inverse(q)
    z = central_z(q + 1)
    checker = [
        [F(-1 if (i + j) % 2 else 1) * z[i][j] for j in range(q)]
        for i in range(q)
    ]
    diagonal = [
        [checker[i][j] if i == j else F(0) for j in range(q)]
        for i in range(q)
    ]
    off_diagonal = [
        [F(0) if i == j else checker[i][j] for j in range(q)]
        for i in range(q)
    ]
    return (
        matmul(matmul(uj, diagonal), vbar),
        matmul(matmul(uj, off_diagonal), vbar),
    )


def poly(value0: F, value1: F):
    return fmpq_poly(
        [
            fmpq(value0.numerator, value0.denominator),
            fmpq(value1.numerator, value1.denominator),
        ]
    )


def bareiss_determinant(matrix):
    n = len(matrix)
    if n == 1:
        return matrix[0][0]
    work = [row[:] for row in matrix]
    previous = fmpq_poly(1)
    for k in range(n - 1):
        pivot = work[k][k]
        assert pivot != 0
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                numerator = work[i][j] * pivot - work[i][k] * work[k][j]
                work[i][j] = numerator / previous
        previous = pivot
    return work[-1][-1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=20)
    args = parser.parse_args()
    records = []
    minor_total = positive_coefficients = zero_coefficients = 0
    for q in range(2, args.max_q + 1):
        constant, linear = constant_and_linear(q)
        local_minors = local_positive = local_zero = 0
        max_degree = 0
        for c in range(q):
            for r in range(c, q):
                columns = range(r - c, r + 1)
                matrix = [
                    [poly(constant[i][j], linear[i][j]) for j in columns]
                    for i in range(c + 1)
                ]
                determinant = bareiss_determinant(matrix)
                assert determinant[0] > 0
                max_degree = max(max_degree, determinant.degree())
                for degree in range(c + 2):
                    coefficient = determinant[degree]
                    assert coefficient >= 0, (q, c, r, degree, coefficient)
                    if coefficient > 0:
                        local_positive += 1
                    else:
                        local_zero += 1
                local_minors += 1
        minor_total += local_minors
        positive_coefficients += local_positive
        zero_coefficients += local_zero
        records.append(
            {
                "q": q,
                "initial_minors": local_minors,
                "positive_coefficients": local_positive,
                "zero_coefficients": local_zero,
                "max_degree": max_degree,
            }
        )
        print(
            f"q={q} PASS minors={local_minors} "
            f"positive={local_positive} zero={local_zero}",
            flush=True,
        )

    report = {
        "status": "PASS",
        "range": [2, args.max_q],
        "initial_minors": minor_total,
        "positive_coefficients": positive_coefficients,
        "zero_coefficients": zero_coefficients,
        "homotopy": "T_q(t)=U_q^(J)*(diag(EZE)+t*offdiag(EZE))*Vbar_q",
        "minor": "det T_q(t)[0:c+1, r-c:r+1]",
        "scope": (
            "Exact finite evidence for coefficientwise TN.  An all-order "
            "formula or recurrence for these coefficients is still needed."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
