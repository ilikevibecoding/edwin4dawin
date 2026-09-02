#!/usr/bin/env python3
"""Exact M-matrix core after eliminating the consecutive type-II chain.

Expand the bottom target in the monic derivative basis P_k(x), x=-X/4,
using the positive Catalan connection for every H_a.  Reverse the column
order inside the leading 0..d block.  The resulting (d+1)-square
core is lower triangular, has a positive diagonal, and has strictly negative
entries below the diagonal.  Hence its inverse is entrywise nonnegative.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("bottom_catalan_core_mmatrix_certificate_20260803.json")


def falling(value: int, order: int) -> sp.Integer:
    return sp.factorial(value) // sp.factorial(value - order)


def connection(remaining: int, index: int) -> sp.Expr:
    return sp.cancel(falling(remaining, index) * sp.catalan(index + 1) / 4**index)


def first_weight(N: int, d: int, order: int) -> sp.Expr:
    return sp.Rational(sp.binomial(d, order), sp.factorial(N - order) * sp.factorial(N - d + order))


def correction_weight(N: int, d: int, order: int) -> sp.Expr:
    return sp.Rational(
        sp.binomial(d - 2, order),
        sp.factorial(N - 1 - order) * sp.factorial(N - d + order + 1),
    )


def coefficient_matrix(N: int, d: int) -> sp.Matrix:
    matrix = sp.zeros(N + 1, N + 1)
    for order in range(d + 1):
        matrix[order, d - order] += first_weight(N, d, order)

    for left in range(d - 1):
        right = d - 2 - left
        weight = correction_weight(N, d, left)
        left_remaining = N - left - 1
        right_remaining = N - right - 1
        for i in range(left_remaining + 1):
            row = left + 1 + i
            left_coefficient = connection(left_remaining, i)
            for j in range(right_remaining + 1):
                column = right + 1 + j
                matrix[row, column] -= (
                    weight * left_coefficient * connection(right_remaining, j)
                )
    return matrix


def core_matrix(N: int, d: int) -> sp.Matrix:
    matrix = coefficient_matrix(N, d)
    offset = N - d
    return sp.Matrix(
        d + 1,
        d + 1,
        lambda row, column: matrix[row, N - (offset + column)],
    )


def inverse_nonnegative_by_substitution(core: sp.Matrix) -> sp.Matrix:
    size = core.rows
    inverse = sp.zeros(size, size)
    for column in range(size):
        for row in range(size):
            rhs = sp.Integer(1) if row == column else sp.Integer(0)
            accumulated = sum(core[row, k] * inverse[k, column] for k in range(row))
            inverse[row, column] = sp.cancel((rhs - accumulated) / core[row, row])
    return inverse


def main() -> None:
    zero_above_checks = 0
    positive_diagonal_checks = 0
    negative_below_checks = 0
    inverse_nonnegative_checks = 0
    construction_symmetry_checks = 0
    inverse_not_totally_nonnegative_witness = None
    records = []

    for m in range(1, 21):
        N = 3 * m + 3
        d = 2 * m + 3
        full = coefficient_matrix(N, d)
        assert full == full.T
        construction_symmetry_checks += (N + 1) ** 2
        core = core_matrix(N, d)
        for row in range(d + 1):
            for column in range(d + 1):
                value = sp.factor(core[row, column])
                if row < column:
                    assert value == 0
                    zero_above_checks += 1
                elif row == column:
                    assert value > 0
                    expected = first_weight(N, d, row)
                    if 1 <= row <= d - 1:
                        expected -= correction_weight(N, d, row - 1)
                    assert sp.cancel(value - expected) == 0
                    positive_diagonal_checks += 1
                else:
                    assert value < 0
                    negative_below_checks += 1

        inverse = inverse_nonnegative_by_substitution(core)
        assert core * inverse == sp.eye(d + 1)
        for value in inverse:
            assert value >= 0
            inverse_nonnegative_checks += 1
        if m == 1:
            witness = sp.factor(inverse.extract((1, 2), (0, 1)).det())
            assert witness < 0
            inverse_not_totally_nonnegative_witness = {
                "m": 1,
                "rows": [1, 2],
                "columns": [0, 1],
                "determinant": str(witness),
            }
        records.append(
            {
                "m": m,
                "N": N,
                "d": d,
                "core_size": d + 1,
                "strictly_positive_inverse_entries": sum(1 for value in inverse if value > 0),
            }
        )

    report = {
        "kind": "bottom_catalan_core_mmatrix_certificate",
        "status": "PASS_EXACT_NONSINGULAR_M_MATRIX_CORE",
        "m_range": [1, 20],
        "full_matrix_symmetry_checks": construction_symmetry_checks,
        "zero_above_diagonal_checks": zero_above_checks,
        "positive_diagonal_checks": positive_diagonal_checks,
        "negative_below_diagonal_checks": negative_below_checks,
        "inverse_nonnegative_checks": inverse_nonnegative_checks,
        "inverse_not_totally_nonnegative_witness": inverse_not_totally_nonnegative_witness,
        "consequence": (
            "After the positive Catalan basis change and column reversal, the "
            "main d+1 anti-diagonal core is a lower-triangular nonsingular "
            "M-matrix and therefore has an entrywise nonnegative inverse."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_NONSINGULAR_M_MATRIX_CORE")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
