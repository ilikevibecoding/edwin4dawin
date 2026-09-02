#!/usr/bin/env python3
"""Exact Chebyshev reduction of the universal Schur tail.

For fixed d, the infinite Schur tail has rank q=d-1.  Its maximal q by q
reversed block can be written as a collocation matrix of q rational functions.
After removing one common positive Catalan factor and one common denominator,
these functions become degree-(q-1) polynomials.  A strictly totally positive
monomial coefficient matrix would prove strict total positivity of every
smaller Schur tail.  This script certifies the identities and finite exact
evidence for that final coefficient-array theorem.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    neville_parameters,
    reverse_identity,
    schur_tail,
    universal_matrix,
)


OUT = Path("bottom_schur_chebyshev_coefficient_certificate_20260803.json")
X = sp.symbols("x")


def maximal_tail_data(d: int) -> tuple[sp.Matrix, list[sp.Poly], sp.Expr]:
    q = d - 1
    reversal = reverse_identity(q)

    # If M_eff is the symmetric central Schur factor, then
    # K=J M_eff and K^{-1}=M_eff^{-1}J is the explicit upper M-matrix.
    central = central_inverse_from_blocks(d).inv()
    catalan_hankel = sp.Matrix(q, q, lambda row, column: sp.catalan(row + column + 3))
    right_coefficients = sp.simplify(
        central * reversal * catalan_hankel * reversal
    )

    # C_{x+p+3}/C_{x+3}=4^p (x+7/2)_p/(x+5)_p.
    rational_basis = sp.Matrix(
        1,
        q,
        lambda _, p: 4**p * sp.rf(X + sp.Rational(7, 2), p) / sp.rf(X + 5, p),
    )
    common_denominator = sp.prod(X + 5 + index for index in range(q - 1))
    polynomials = []
    for column in range(q):
        expression = sp.cancel(
            common_denominator * (rational_basis * right_coefficients[:, column])[0]
        )
        polynomial = sp.Poly(expression, X)
        assert polynomial.degree() == q - 1
        polynomials.append(polynomial)
    return right_coefficients, polynomials, common_denominator


def coefficient_matrix(polynomials: list[sp.Poly]) -> sp.Matrix:
    size = len(polynomials)
    return sp.Matrix(size, size, lambda power, column: polynomials[column].nth(power))


def exhaustive_positive_minors(matrix: sp.Matrix) -> int:
    total = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                assert sp.factor(matrix.extract(rows, columns).det()) > 0
                total += 1
    return total


def main() -> None:
    maximal_tail_identity_checks = 0
    positive_polynomial_coefficient_checks = 0
    exhaustive_coefficient_minor_checks = 0
    positive_wronskian_coefficient_checks = 0
    positive_neville_parameter_checks = 0
    records = []

    for d in range(3, 13):
        q = d - 1
        _, polynomials, denominator = maximal_tail_data(d)
        coefficients = coefficient_matrix(polynomials)

        # Directly recover the maximal reversed Schur tail at x=0,...,q-1.
        maximal = universal_matrix(d + q, d)
        residual = -schur_tail(maximal, d) * reverse_identity(q)
        for row in range(q):
            catalan_factor = sp.catalan(row + 3)
            denominator_value = denominator.subs(X, row)
            for column in range(q):
                recovered = sp.cancel(
                    catalan_factor
                    * polynomials[column].eval(row)
                    / denominator_value
                )
                assert recovered == residual[row, column]
                maximal_tail_identity_checks += 1

        for value in coefficients:
            assert value > 0
            positive_polynomial_coefficient_checks += 1

        if d <= 7:
            exhaustive_coefficient_minor_checks += exhaustive_positive_minors(coefficients)
            for order in range(1, q + 1):
                wronskian = sp.Poly(
                    sp.factor(
                        sp.det(
                            sp.Matrix(
                                order,
                                order,
                                lambda derivative, column: sp.diff(
                                    polynomials[column].as_expr(), X, derivative
                                ),
                            )
                        )
                    ),
                    X,
                )
                assert wronskian.degree() == order * (q - order)
                for value in wronskian.all_coeffs():
                    assert value > 0
                    positive_wronskian_coefficient_checks += 1

        row_multipliers, row_pivots = neville_parameters(coefficients)
        column_multipliers, column_pivots = neville_parameters(coefficients.T)
        parameters = row_multipliers + row_pivots + column_multipliers + column_pivots
        assert all(value > 0 for value in parameters)
        positive_neville_parameter_checks += len(parameters)
        records.append(
            {
                "d": d,
                "maximal_tail_rank": q,
                "polynomial_degree": q - 1,
                "coefficient_neville_parameters": len(parameters),
                "all_exact_parameters_positive": True,
            }
        )

    report = {
        "kind": "bottom_schur_chebyshev_coefficient_certificate",
        "status": "PASS_EXACT_SCHUR_CHEBYSHEV_REDUCTION",
        "d_range": [3, 12],
        "maximal_tail_identity_checks": maximal_tail_identity_checks,
        "positive_polynomial_coefficient_checks": positive_polynomial_coefficient_checks,
        "exhaustive_positive_coefficient_minor_checks_d_le_7": exhaustive_coefficient_minor_checks,
        "positive_wronskian_coefficient_checks_d_le_7": positive_wronskian_coefficient_checks,
        "positive_coefficient_neville_parameter_checks_d_le_12": positive_neville_parameter_checks,
        "scope": (
            "The rational-collocation representation and the reduction to a "
            "degree-(d-2) polynomial coefficient matrix are exact for each d. "
            "Strict total positivity of that coefficient matrix for all d is "
            "the remaining conjectural statement; exhaustive minors, Wronskians, "
            "and complete Neville parameters are finite exact evidence."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
