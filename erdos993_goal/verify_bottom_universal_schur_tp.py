#!/usr/bin/env python3
"""Exact universal normalization and Schur-tail structure at the bottom endpoint.

After the positive Catalan connection is used, the coefficient matrix in the
monic derivative basis is diagonally equivalent to a universal truncation of

    (z+w)^(d-2) ((z+w)^2 - z w C(z)^2 C(w)^2),

where C is the Catalan generating function.  This script checks the exact
normalization, the Catalan-Toeplitz core factorization, the two triangular
M-matrix reductions, and finite exact evidence that the reversed negative
Schur tail is strictly totally positive.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_catalan_core_mmatrix import coefficient_matrix


OUT = Path("bottom_universal_schur_tp_certificate_20260803.json")


def shifted_catalan(index: int) -> sp.Integer:
    """Coefficient [z^index] C(z)^2 = Catalan(index+1)."""
    return sp.catalan(index + 1) if index >= 0 else sp.Integer(0)


def universal_matrix(N: int, d: int) -> sp.Matrix:
    """Truncation through indices 0..N of the universal coefficient kernel."""
    matrix = sp.zeros(N + 1, N + 1)
    for row in range(N + 1):
        for column in range(N + 1):
            if row + column == d:
                matrix[row, column] += sp.binomial(d, row)
            for pivot in range(1, d):
                matrix[row, column] -= (
                    sp.binomial(d - 2, pivot - 1)
                    * shifted_catalan(row - pivot)
                    * shifted_catalan(column - (d - pivot))
                )
    return matrix


def catalan_toeplitz(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda row, column: shifted_catalan(row - column),
    )


def core_factorization(d: int) -> sp.Matrix:
    size = d + 1
    toeplitz = catalan_toeplitz(size)
    first = sp.diag(*[sp.binomial(d, row) for row in range(size)])
    correction = sp.diag(
        *(
            [sp.Integer(0)]
            + [sp.binomial(d - 2, row - 1) for row in range(1, d)]
            + [sp.Integer(0)]
        )
    )
    return first - toeplitz * correction * toeplitz


def reverse_identity(size: int) -> sp.Matrix:
    return sp.eye(size)[:, ::-1]


def schur_tail(matrix: sp.Matrix, d: int) -> sp.Matrix:
    core = matrix[: d + 1, : d + 1]
    cross = matrix[: d + 1, d + 1 :]
    tail = matrix[d + 1 :, d + 1 :]
    return sp.simplify(tail - cross.T * core.inv() * cross)


def central_inverse_mmatrix(d: int) -> sp.Matrix:
    """The upper triangular matrix (J K_eff)^(-1), in closed form."""
    size = d - 1
    matrix = sp.zeros(size, size)
    for row0 in range(size):
        p = row0 + 1
        for column0 in range(row0, size):
            q = column0 + 1
            convolution = sum(
                shifted_catalan(r - p)
                * shifted_catalan(q - r)
                / sp.binomial(d, r)
                for r in range(p, q + 1)
            )
            matrix[row0, column0] = sp.cancel(
                (sp.Integer(1) / sp.binomial(d - 2, p - 1) if p == q else 0)
                - convolution
            )
    return matrix


def central_inverse_from_blocks(d: int) -> sp.Matrix:
    size = d - 1
    first = sp.zeros(d + 1, d + 1)
    correction = sp.zeros(size, size)
    top_connection = sp.zeros(d + 1, size)
    for row in range(d + 1):
        first[row, d - row] = sp.binomial(d, row)
    for p in range(1, d):
        correction[p - 1, d - p - 1] = sp.binomial(d - 2, p - 1)
        for row in range(d + 1):
            top_connection[row, p - 1] = shifted_catalan(row - p)
    effective_inverse = correction.inv() - top_connection.T * first.inv() * top_connection
    return sp.simplify(effective_inverse * reverse_identity(size))


def neville_parameters(matrix: sp.Matrix) -> tuple[list[sp.Expr], list[sp.Expr]]:
    """Return exact Neville multipliers and final diagonal pivots."""
    work = sp.Matrix(matrix)
    multipliers: list[sp.Expr] = []
    for column in range(work.cols - 1):
        for row in range(work.rows - 1, column, -1):
            assert work[row - 1, column] != 0
            multiplier = sp.cancel(work[row, column] / work[row - 1, column])
            multipliers.append(multiplier)
            work[row, :] = work[row, :] - multiplier * work[row - 1, :]
    return multipliers, [sp.factor(work[index, index]) for index in range(work.rows)]


def exhaustive_minor_audit(matrix: sp.Matrix) -> tuple[int, int]:
    total = 0
    strictly_positive = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                determinant = sp.factor(matrix.extract(rows, columns).det())
                assert determinant > 0
                total += 1
                strictly_positive += 1
    return total, strictly_positive


def main() -> None:
    normalization_checks = 0
    core_factorization_checks = 0
    core_sign_checks = 0
    central_formula_checks = 0
    central_sign_checks = 0
    exhaustive_minor_checks = 0
    neville_positive_checks = 0
    records = []

    # The exact diagonal equivalence with the original factorially normalized
    # coefficient matrix.
    for m in range(1, 9):
        N = 3 * m + 3
        d = 2 * m + 3
        original = coefficient_matrix(N, d)
        universal = universal_matrix(N, d)
        for row in range(N + 1):
            for column in range(N + 1):
                recovered = sp.cancel(
                    original[row, column]
                    * sp.factorial(N - row)
                    * sp.factorial(N - column)
                    * 4 ** (row + column - d)
                )
                assert recovered == universal[row, column]
                normalization_checks += 1

    # Core and central M-matrix identities are independent of the tail length.
    for d in range(3, 44):
        universal = universal_matrix(d, d)
        core = universal * reverse_identity(d + 1)
        factored = core_factorization(d)
        assert core == factored
        core_factorization_checks += (d + 1) ** 2
        for row in range(d + 1):
            for column in range(d + 1):
                value = core[row, column]
                if row < column:
                    assert value == 0
                elif row == column:
                    assert value > 0
                else:
                    assert value < 0
                core_sign_checks += 1

        closed = central_inverse_mmatrix(d)
        blocked = central_inverse_from_blocks(d)
        assert closed == blocked
        central_formula_checks += (d - 1) ** 2
        for row in range(d - 1):
            for column in range(d - 1):
                value = closed[row, column]
                if row > column:
                    assert value == 0
                elif row == column:
                    assert value > 0
                else:
                    assert value < 0
                central_sign_checks += 1

    # Exact strict-TP evidence.  Exhaust all minors through m=7, then certify
    # positive Neville parameters for the matrix and its transpose through m=20.
    for m in range(1, 21):
        d = 2 * m + 3
        N = d + m
        universal = universal_matrix(N, d)
        residual = -schur_tail(universal, d) * reverse_identity(m)
        assert residual.rows == m and residual.cols == m
        assert all(value > 0 for value in residual)

        if m <= 7:
            count, positive = exhaustive_minor_audit(residual)
            assert count == positive
            exhaustive_minor_checks += count

        row_multipliers, row_pivots = neville_parameters(residual)
        column_multipliers, column_pivots = neville_parameters(residual.T)
        assert all(value > 0 for value in row_multipliers)
        assert all(value > 0 for value in column_multipliers)
        assert all(value > 0 for value in row_pivots)
        assert all(value > 0 for value in column_pivots)
        neville_positive_checks += (
            len(row_multipliers)
            + len(column_multipliers)
            + len(row_pivots)
            + len(column_pivots)
        )
        records.append(
            {
                "m": m,
                "d": d,
                "N": N,
                "tail_size": m,
                "row_neville_multipliers": len(row_multipliers),
                "column_neville_multipliers": len(column_multipliers),
                "all_exact_parameters_positive": True,
            }
        )

    report = {
        "kind": "bottom_universal_schur_tp_certificate",
        "status": "PASS_EXACT_UNIVERSAL_SCHUR_STRUCTURE",
        "normalization_checks": normalization_checks,
        "core_factorization_checks": core_factorization_checks,
        "core_sign_checks": core_sign_checks,
        "central_inverse_formula_checks": central_formula_checks,
        "central_inverse_sign_checks": central_sign_checks,
        "exhaustive_strictly_positive_schur_minor_checks_m_le_7": exhaustive_minor_checks,
        "positive_schur_neville_parameter_checks_m_le_20": neville_positive_checks,
        "scope": (
            "All identities and sign claims preceding the Schur-tail claim are "
            "symbolic finite formulas valid for each checked d.  Strict total "
            "positivity of the Schur tail remains a conjectural all-m statement; "
            "the exhaustive minors and Neville parameters are finite exact evidence."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
