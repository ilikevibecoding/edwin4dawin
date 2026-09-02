#!/usr/bin/env python3
"""Exact null-coordinate deflation of the affine checker pencil.

The rank-q-1 coefficient Q1 has canonical positive bidiagonal column- and
row-space bases derived from its alternating null vectors.  Completing them
at opposite boundaries gives square TN bidiagonal matrices Lbar and Rbar and

    Q0 + t Q1 = Lbar (M0 + t M1) Rbar,

where M1 has only a top-right (q-1)-square block.  This script audits whether
the deflated pencil retains coefficientwise total nonnegativity.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import T, homotopy_data, initial_minors


OUT = Path("bottom_q_pencil_null_deflation_certificate_20260803.json")
X = sp.symbols("x")


def null_coordinate_data(d: int):
    q = d - 1
    n = q - 1
    _, _, q0, q1, _ = homotopy_data(d)
    polynomial = sp.expand(sp.rf(X + 5, n))
    coefficients = [polynomial.coeff(X, i) for i in range(q)]

    left = sp.zeros(q, n)
    right = sp.zeros(n, q)
    for j in range(n):
        left[j, j] = coefficients[n - j - 1]
        left[j + 1, j] = coefficients[n - j]
        right[j, j] = coefficients[j + 1]
        right[j, j + 1] = coefficients[j]

    left_full = sp.Matrix.hstack(left, sp.eye(q)[:, q - 1])
    right_full = sp.Matrix.vstack(sp.eye(q)[0, :], right)
    middle0 = sp.simplify(left_full.inv() * q0 * right_full.inv())
    middle1 = sp.simplify(left_full.inv() * q1 * right_full.inv())
    return coefficients, left_full, right_full, middle0, middle1


def polynomial_nonnegative(expression: sp.Expr):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert denominator > 0
    coefficients = sp.Poly(numerator, T).all_coeffs()
    assert all(value >= 0 for value in coefficients)
    return (
        sum(int(bool(value > 0)) for value in coefficients),
        sum(int(bool(value == 0)) for value in coefficients),
    )


def all_minors(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                yield matrix.extract(rows, columns)


def main() -> None:
    factorization_entry_checks = 0
    bidiagonal_entry_checks = 0
    support_checks = 0
    positive_middle0_entries = 0
    zero_middle0_entries = 0
    initial_minor_checks = 0
    initial_positive_coefficients = 0
    initial_zero_coefficients = 0
    exhaustive_minor_checks = 0
    exhaustive_positive_coefficients = 0
    exhaustive_zero_coefficients = 0
    records = []

    for d in range(3, 13):
        q = d - 1
        coefficients, left, right, middle0, middle1 = null_coordinate_data(d)
        _, _, q0, q1, _ = homotopy_data(d)
        assert sp.simplify(left * middle0 * right - q0) == sp.zeros(q)
        assert sp.simplify(left * middle1 * right - q1) == sp.zeros(q)
        factorization_entry_checks += 2 * q * q

        assert all(value >= 0 for value in left)
        assert all(value >= 0 for value in right)
        assert left.det() > 0 and right.det() > 0
        bidiagonal_entry_checks += left.rows * left.cols + right.rows * right.cols

        for i in range(q):
            for j in range(q):
                expected_nonzero = i < q - 1 and j > 0
                assert (middle1[i, j] != 0) == expected_nonzero
                if expected_nonzero:
                    assert middle1[i, j] > 0
                support_checks += 1

        local_middle0_zeros = 0
        for value in middle0:
            assert value >= 0
            positive_middle0_entries += int(bool(value > 0))
            zero_middle0_entries += int(bool(value == 0))
            local_middle0_zeros += int(bool(value == 0))
        assert middle0[q - 1, 0] == 0
        assert local_middle0_zeros == 1

        pencil = middle0 + T * middle1
        local_initial = 0
        local_positive = 0
        local_zero = 0
        for minor in initial_minors(pencil):
            positive, zero = polynomial_nonnegative(minor.det(method="domain-ge"))
            local_initial += 1
            local_positive += positive
            local_zero += zero
        initial_minor_checks += local_initial
        initial_positive_coefficients += local_positive
        initial_zero_coefficients += local_zero

        local_exhaustive = 0
        local_exhaustive_positive = 0
        local_exhaustive_zero = 0
        if d <= 7:
            for minor in all_minors(pencil):
                positive, zero = polynomial_nonnegative(minor.det(method="domain-ge"))
                local_exhaustive += 1
                local_exhaustive_positive += positive
                local_exhaustive_zero += zero
            exhaustive_minor_checks += local_exhaustive
            exhaustive_positive_coefficients += local_exhaustive_positive
            exhaustive_zero_coefficients += local_exhaustive_zero

        records.append(
            {
                "d": d,
                "q": q,
                "initial_minors": local_initial,
                "initial_positive_coefficients": local_positive,
                "initial_zero_coefficients": local_zero,
                "exhaustive_minors_if_d_le_7": local_exhaustive,
                "exhaustive_positive_coefficients_if_d_le_7": local_exhaustive_positive,
                "exhaustive_zero_coefficients_if_d_le_7": local_exhaustive_zero,
            }
        )

    report = {
        "kind": "bottom_q_pencil_null_deflation_certificate",
        "status": "PASS_EXACT_Q_PENCIL_NULL_DEFLATION",
        "d_range_initial_minors": [3, 12],
        "d_range_exhaustive_minors": [3, 7],
        "factorization_entry_checks": factorization_entry_checks,
        "bidiagonal_entry_checks": bidiagonal_entry_checks,
        "rank_coefficient_support_checks": support_checks,
        "positive_constant_core_entries": positive_middle0_entries,
        "zero_constant_core_entries": zero_middle0_entries,
        "coefficientwise_nonnegative_initial_minor_checks": initial_minor_checks,
        "initial_positive_coefficient_checks": initial_positive_coefficients,
        "initial_zero_coefficient_checks": initial_zero_coefficients,
        "coefficientwise_nonnegative_exhaustive_minor_checks": exhaustive_minor_checks,
        "exhaustive_positive_coefficient_checks": exhaustive_positive_coefficients,
        "exhaustive_zero_coefficient_checks": exhaustive_zero_coefficients,
        "remaining_lemma": (
            "For every d, the deflated pencil M0+t M1 is totally nonnegative "
            "coefficientwise (strict in the minors needed after multiplying "
            "by the two boundary bidiagonal factors)."
        ),
        "scope": (
            "The null-coordinate factorization and support pattern are exact. "
            "The all-d coefficientwise TN assertion for the deflated pencil "
            "remains unproved."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
