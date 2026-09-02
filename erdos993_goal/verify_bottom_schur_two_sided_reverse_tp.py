#!/usr/bin/env python3
"""Exact two-sided rational-Bernstein factorization of the Schur-tail target.

For q=d-1, clear the common denominator in the continuous Catalan row

    C_{x+p+3}/C_{x+3}=4^p (x+7/2)_p/(x+5)_p

and write the resulting polynomial basis as

    beta_p(x)=4^p (x+7/2)_p (x+p+5)_{q-1-p}.

If B is its monomial coefficient matrix, Z is the explicit upper triangular
M-matrix from the central Schur complement, K=Z^{-1}, and J is reversal, the
two-sided coefficient kernel is

    S = B K J B^T.

The Chebyshev coefficient matrix from the preceding certificate factors as

    M = (S J) (J V_dec) Delta,

where V_dec evaluates monomials at q-1,...,0 and Delta is positive diagonal.
Thus strict total positivity of S J for every d would imply strict total
positivity of M: J V_dec is totally nonnegative and nonsingular, while Delta
is positive.  This script certifies the identities and finite exact evidence;
it does not claim the remaining all-d theorem.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import (
    X,
    coefficient_matrix,
    maximal_tail_data,
)
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    neville_parameters,
    reverse_identity,
)


OUT = Path("bottom_schur_two_sided_reverse_tp_certificate_20260803.json")


def cleared_catalan_basis(q: int) -> list[sp.Poly]:
    return [
        sp.Poly(
            4**p
            * sp.rf(X + sp.Rational(7, 2), p)
            * sp.rf(X + p + 5, q - 1 - p),
            X,
        )
        for p in range(q)
    ]


def two_sided_data(d: int) -> tuple[sp.Matrix, sp.Matrix, sp.Matrix, sp.Matrix]:
    q = d - 1
    reversal = reverse_identity(q)
    basis = cleared_catalan_basis(q)
    basis_coefficients = coefficient_matrix(basis)
    upper_m_inverse = central_inverse_from_blocks(d)
    kernel = upper_m_inverse.inv()
    symmetric_coefficients = sp.simplify(
        basis_coefficients * kernel * reversal * basis_coefficients.T
    )
    reverse_tp_target = symmetric_coefficients * reversal
    return basis_coefficients, kernel, symmetric_coefficients, reverse_tp_target


def exhaustive_positive_minors(matrix: sp.Matrix) -> int:
    count = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                assert sp.factor(matrix.extract(rows, columns).det()) > 0
                count += 1
    return count


def exhaustive_nonnegative_minors(matrix: sp.Matrix) -> tuple[int, int]:
    count = 0
    positive = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                determinant = sp.factor(matrix.extract(rows, columns).det())
                assert determinant >= 0
                count += 1
                positive += 1 if determinant > 0 else 0
    return count, positive


def positive_complete_neville_count(matrix: sp.Matrix) -> int:
    row_multipliers, row_pivots = neville_parameters(matrix)
    column_multipliers, column_pivots = neville_parameters(matrix.T)
    parameters = row_multipliers + row_pivots + column_multipliers + column_pivots
    assert all(value > 0 for value in parameters)
    return len(parameters)


def main() -> None:
    basis_formula_checks = 0
    symmetry_checks = 0
    coefficient_factorization_checks = 0
    positive_diagonal_checks = 0
    exhaustive_basis_minor_checks = 0
    exhaustive_reverse_kernel_minor_checks = 0
    exhaustive_reversed_vandermonde_checks = 0
    positive_reversed_vandermonde_minors = 0
    positive_basis_neville_parameters = 0
    positive_reverse_kernel_neville_parameters = 0
    records = []

    # Exact identities and complete Neville tests remain inexpensive through
    # d=15.  Exhausting every minor is restricted to d<=7.
    for d in range(3, 16):
        q = d - 1
        reversal = reverse_identity(q)
        basis, kernel, symmetric, reverse_target = two_sided_data(d)

        # Check the denominator-cleared Catalan interpolation formula.
        denominator = sp.prod(X + 5 + index for index in range(q - 1))
        for p, polynomial in enumerate(cleared_catalan_basis(q)):
            rational = 4**p * sp.rf(X + sp.Rational(7, 2), p) / sp.rf(X + 5, p)
            assert sp.cancel(denominator * rational - polynomial.as_expr()) == 0
            basis_formula_checks += 1

        # KJ, hence B KJ B^T, is symmetric.
        assert kernel * reversal == (kernel * reversal).T
        assert symmetric == symmetric.T
        symmetry_checks += 2 * q * q

        # Recover the one-sided coefficient matrix exactly.  At the decreasing
        # nodes y_j=q-1-j, the Catalan Hankel column contributes
        # Delta_j=C_{y_j+3}/D(y_j).
        _, one_sided_polynomials, one_sided_denominator = maximal_tail_data(d)
        one_sided_coefficients = coefficient_matrix(one_sided_polynomials)
        nodes = [q - 1 - column for column in range(q)]
        vandermonde = sp.Matrix(q, q, lambda power, column: nodes[column] ** power)
        diagonal = sp.diag(
            *[
                sp.cancel(sp.catalan(node + 3) / one_sided_denominator.subs(X, node))
                for node in nodes
            ]
        )
        assert all(value > 0 for value in diagonal.diagonal())
        positive_diagonal_checks += q
        factored = sp.simplify(reverse_target * reversal * vandermonde * diagonal)
        assert factored == one_sided_coefficients
        coefficient_factorization_checks += q * q

        basis_neville = positive_complete_neville_count(basis)
        reverse_neville = positive_complete_neville_count(reverse_target)
        positive_basis_neville_parameters += basis_neville
        positive_reverse_kernel_neville_parameters += reverse_neville

        if d <= 7:
            exhaustive_basis_minor_checks += exhaustive_positive_minors(basis)
            exhaustive_reverse_kernel_minor_checks += exhaustive_positive_minors(reverse_target)
            checked, positive = exhaustive_nonnegative_minors(reversal * vandermonde)
            exhaustive_reversed_vandermonde_checks += checked
            positive_reversed_vandermonde_minors += positive

        records.append(
            {
                "d": d,
                "q": q,
                "basis_complete_neville_parameters": basis_neville,
                "reverse_kernel_complete_neville_parameters": reverse_neville,
                "exact_factorization": True,
                "all_exact_neville_parameters_positive": True,
            }
        )

    report = {
        "kind": "bottom_schur_two_sided_reverse_tp_certificate",
        "status": "PASS_EXACT_TWO_SIDED_REVERSE_TP_REDUCTION",
        "d_range": [3, 15],
        "cleared_catalan_basis_formula_checks": basis_formula_checks,
        "kernel_symmetry_entry_checks": symmetry_checks,
        "one_sided_coefficient_factorization_checks": coefficient_factorization_checks,
        "positive_diagonal_checks": positive_diagonal_checks,
        "exhaustive_positive_basis_minor_checks_d_le_7": exhaustive_basis_minor_checks,
        "exhaustive_positive_reverse_kernel_minor_checks_d_le_7": exhaustive_reverse_kernel_minor_checks,
        "exhaustive_nonnegative_reversed_vandermonde_minor_checks_d_le_7": exhaustive_reversed_vandermonde_checks,
        "positive_reversed_vandermonde_minors_d_le_7": positive_reversed_vandermonde_minors,
        "positive_basis_complete_neville_parameters_d_le_15": positive_basis_neville_parameters,
        "positive_reverse_kernel_complete_neville_parameters_d_le_15": positive_reverse_kernel_neville_parameters,
        "remaining_lemma": "For every d>=3, S_d J is strictly totally positive.",
        "scope": (
            "The rational-basis identity, symmetry, and factorization are exact "
            "for every checked d.  The minor and complete-Neville audits are "
            "finite exact evidence only.  No all-d strict-total-positivity proof "
            "is claimed by this certificate."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
