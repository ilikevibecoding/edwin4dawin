#!/usr/bin/env python3
"""Exact off-diagonal homotopy for the two-sided reverse-TP target.

Let Z be the explicit upper triangular M-matrix, D=diag(Z), and

    Z(t) = D + t (Z-D).

For the cleared Catalan basis matrix B and reversal J, set

    A(t) = B Z(t)^(-1) J B^T J.

Thus A(1)=S J is the missing reverse-total-positivity target, while A(0)
is a product of two strictly totally positive basis matrices and a positive
diagonal matrix.  Since Z(t) is triangular with t-independent diagonal,
its determinant is a positive constant and A(t) has polynomial entries.

Jacobi's complementary-minor identity moves the homotopy to the affine
checker-signed inverse pencil

    Q(t) = E A(t)^(-1) E
         = E (J B^T J)^(-1) Z(t) B^(-1) E,

where E=diag(1,-1,...).  This script certifies these identities and finite
exact evidence that every minor numerator has nonnegative t-coefficients.
The coefficientwise all-d assertion remains a conjectural lemma.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    reverse_identity,
)


OUT = Path("bottom_reverse_tp_offdiagonal_homotopy_certificate_20260803.json")
T = sp.symbols("t")


def checker(size: int) -> sp.Matrix:
    return sp.diag(*[(-1) ** index for index in range(size)])


def homotopy_data(
    d: int,
) -> tuple[sp.Matrix, sp.Matrix, sp.Matrix, sp.Matrix, sp.Matrix]:
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    reversal = reverse_identity(q)
    central_inverse = central_inverse_from_blocks(d)
    central_diagonal = sp.diag(*central_inverse.diagonal())
    central_pencil = central_diagonal + T * (central_inverse - central_diagonal)
    right_basis = reversal * basis.T * reversal
    target = sp.simplify(
        basis * central_pencil.inv() * right_basis
    )
    signs = checker(q)
    inverse_pencil = sp.simplify(
        signs
        * right_basis.inv()
        * central_pencil
        * basis.inv()
        * signs
    )
    inverse_constant = inverse_pencil.subs(T, 0)
    inverse_linear = sp.diff(inverse_pencil, T)
    return target, inverse_pencil, inverse_constant, inverse_linear, central_pencil


def polynomial_is_strictly_coefficient_positive(expression: sp.Expr) -> tuple[int, int]:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert denominator > 0
    polynomial = sp.Poly(numerator, T)
    coefficients = polynomial.all_coeffs()
    assert coefficients
    assert all(value > 0 for value in coefficients)
    return polynomial.degree(), len(coefficients)


def initial_minors(matrix: sp.Matrix):
    """Gasca--Pena initial minors, without duplicating leading blocks."""
    size = matrix.rows
    for order in range(1, size + 1):
        for last_row in range(order - 1, size):
            yield matrix[last_row - order + 1 : last_row + 1, :order]
        for last_column in range(order, size):
            yield matrix[:order, last_column - order + 1 : last_column + 1]


def all_minors(matrix: sp.Matrix):
    size = matrix.rows
    for order in range(1, size + 1):
        for rows in itertools.combinations(range(size), order):
            for columns in itertools.combinations(range(size), order):
                yield matrix.extract(rows, columns)


def constant_minor_audit(matrix: sp.Matrix, rank_deficient: bool) -> tuple[int, int]:
    positive = 0
    zero = 0
    for minor in all_minors(matrix):
        value = sp.factor(minor.det())
        assert value >= 0
        positive += 1 if value > 0 else 0
        zero += 1 if value == 0 else 0
    if rank_deficient:
        assert zero == 1
        assert matrix.rank() == matrix.rows - 1
    else:
        assert zero == 0
    return positive, zero


def main() -> None:
    identity_entry_checks = 0
    positive_inverse_constant_entries = 0
    positive_inverse_linear_entries = 0
    initial_minor_checks = 0
    initial_coefficient_checks = 0
    exhaustive_minor_checks = 0
    exhaustive_coefficient_checks = 0
    inverse_constant_positive_minors = 0
    inverse_linear_positive_minors = 0
    inverse_linear_zero_minors = 0
    records = []

    # Initial minors are the complete TP test set and remain manageable through
    # d=9.  Exhausting every minor as a polynomial is restricted to d<=7.
    for d in range(3, 10):
        q = d - 1
        target, inverse_pencil, inverse_constant, inverse_linear, central_pencil = (
            homotopy_data(d)
        )
        signs = checker(q)

        assert sp.det(central_pencil) == sp.prod(central_pencil.diagonal())
        assert all(not value.has(T) and value > 0 for value in central_pencil.diagonal())
        assert sp.simplify(inverse_pencil - signs * target.inv() * signs) == sp.zeros(q)
        identity_entry_checks += q * q

        for value in inverse_constant:
            assert value > 0
            positive_inverse_constant_entries += 1
        for value in inverse_linear:
            assert value > 0
            positive_inverse_linear_entries += 1

        local_initial_minors = 0
        local_initial_coefficients = 0
        local_max_degree = 0
        for minor in initial_minors(target):
            degree, coefficient_count = polynomial_is_strictly_coefficient_positive(
                minor.det()
            )
            assert degree <= q - minor.rows
            local_max_degree = max(local_max_degree, degree)
            local_initial_minors += 1
            local_initial_coefficients += coefficient_count
        assert local_initial_minors == q * q
        initial_minor_checks += local_initial_minors
        initial_coefficient_checks += local_initial_coefficients

        local_exhaustive = 0
        local_exhaustive_coefficients = 0
        if d <= 7:
            for minor in all_minors(target):
                degree, coefficient_count = polynomial_is_strictly_coefficient_positive(
                    minor.det()
                )
                assert degree <= q - minor.rows
                local_exhaustive += 1
                local_exhaustive_coefficients += coefficient_count
            exhaustive_minor_checks += local_exhaustive
            exhaustive_coefficient_checks += local_exhaustive_coefficients

            positive, zero = constant_minor_audit(inverse_constant, False)
            inverse_constant_positive_minors += positive
            assert zero == 0
            positive, zero = constant_minor_audit(inverse_linear, True)
            inverse_linear_positive_minors += positive
            inverse_linear_zero_minors += zero

        records.append(
            {
                "d": d,
                "q": q,
                "initial_minors": local_initial_minors,
                "initial_positive_coefficients": local_initial_coefficients,
                "maximum_initial_minor_degree": local_max_degree,
                "exhaustive_minors_if_d_le_7": local_exhaustive,
                "exhaustive_positive_coefficients_if_d_le_7": local_exhaustive_coefficients,
            }
        )

    report = {
        "kind": "bottom_reverse_tp_offdiagonal_homotopy_certificate",
        "status": "PASS_EXACT_OFFDIAGONAL_HOMOTOPY_REDUCTION",
        "d_range_initial_minors": [3, 9],
        "d_range_exhaustive_minors": [3, 7],
        "inverse_pencil_identity_entry_checks": identity_entry_checks,
        "positive_inverse_constant_entries": positive_inverse_constant_entries,
        "positive_inverse_linear_entries": positive_inverse_linear_entries,
        "coefficientwise_positive_initial_minor_checks": initial_minor_checks,
        "positive_initial_minor_coefficient_checks": initial_coefficient_checks,
        "coefficientwise_positive_exhaustive_minor_checks_d_le_7": exhaustive_minor_checks,
        "positive_exhaustive_minor_coefficient_checks_d_le_7": exhaustive_coefficient_checks,
        "inverse_constant_positive_minor_checks_d_le_7": inverse_constant_positive_minors,
        "inverse_linear_positive_minor_checks_d_le_7": inverse_linear_positive_minors,
        "inverse_linear_zero_full_determinants_d_le_7": inverse_linear_zero_minors,
        "remaining_lemma": (
            "For every d>=3, every initial minor of A_d(t) has a numerator "
            "with nonnegative coefficients and positive constant term."
        ),
        "consequence_if_proved": (
            "The Gasca--Pena initial-minor criterion gives strict total "
            "positivity of A_d(t) for every t>=0; t=1 proves the two-sided "
            "reverse-TP lemma."
        ),
        "scope": (
            "The matrix and inverse-pencil identities are exact for every "
            "checked d.  Coefficientwise positivity is finite exact evidence, "
            "not an all-d proof."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
