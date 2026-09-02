#!/usr/bin/env python3
"""Exact switch-product proof audit for the beta coefficient matrix.

After removing positive column scales, beta_p is

  prod_{i<p}(x+a_i) prod_{i>=p}(x+b_i),

with a_i=i+7/2 < b_i=i+5.  Every Gasca--Pena initial minor factors into a
full switch determinant and a solid minor of a lower-Toeplitz convolution
matrix.  The latter is a product of positive bidiagonal Toeplitz matrices.
This supplies an all-order proof that B is STP and therefore that Q0 is STP.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_bottom_affine_rank_defect import determinant_closed
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, initial_minors
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


OUT = Path("bottom_beta_switch_tp_certificate_20260803.json")
X = sp.symbols("x")


def a(index: int) -> sp.Rational:
    return sp.Rational(2 * index + 7, 2)


def b(index: int) -> sp.Integer:
    return sp.Integer(index + 5)


def product_polynomial(constants: list[sp.Expr]) -> sp.Poly:
    return sp.Poly(sp.prod(X + value for value in constants), X)


def polynomial_matrix(polynomials: list[sp.Poly], degree: int) -> sp.Matrix:
    return sp.Matrix(
        degree + 1,
        len(polynomials),
        lambda row, column: polynomials[column].nth(row),
    )


def toeplitz_convolution(polynomial: sp.Poly, rows: int, columns: int) -> sp.Matrix:
    return sp.Matrix(
        rows,
        columns,
        lambda row, column: polynomial.nth(row - column) if row >= column else 0,
    )


def switch_block(n: int, first: int, count: int) -> list[sp.Poly]:
    last_switch_index = first + count - 2
    polynomials = []
    for p in range(first, first + count):
        expression = sp.Integer(4) ** p
        expression *= sp.prod(X + a(i) for i in range(first, p))
        expression *= sp.prod(X + b(i) for i in range(p, last_switch_index + 1))
        polynomials.append(sp.Poly(expression, X))
    return polynomials


def q0_matrix(d: int, basis: sp.Matrix) -> sp.Matrix:
    q = d - 1
    reversal = reverse_identity(q)
    right_basis = reversal * basis.T * reversal
    signs = checker(q)
    central = central_inverse_from_blocks(d)
    diagonal = sp.diag(*central.diagonal())
    return sp.simplify(signs * right_basis.inv() * diagonal * basis.inv() * signs)


def main() -> None:
    basis_entry_checks = 0
    determinant_checks = 0
    prefix_factorization_checks = 0
    consecutive_factorization_checks = 0
    toeplitz_solid_minor_checks = 0
    switch_determinant_checks = 0
    positive_basis_initial_minors = 0
    positive_q0_initial_minors = 0

    for d in range(3, 26):
        q = d - 1
        n = q - 1
        basis = coefficient_matrix(cleared_catalan_basis(q))
        direct = polynomial_matrix(
            [
                sp.Poly(
                    sp.Integer(4) ** p
                    * sp.prod(X + a(i) for i in range(p))
                    * sp.prod(X + b(i) for i in range(p, n)),
                    X,
                )
                for p in range(q)
            ],
            n,
        )
        assert basis == direct
        basis_entry_checks += q * q
        assert sp.factor(basis.det() - determinant_closed(d)) == 0
        determinant_checks += 1

        if d <= 15:
            for order in range(1, q + 1):
                # First `order` columns, arbitrary consecutive coefficient rows.
                common = product_polynomial([b(i) for i in range(order - 1, n)])
                local = polynomial_matrix(switch_block(n, 0, order), order - 1)
                toeplitz = toeplitz_convolution(common, q, order)
                assert toeplitz * local == basis[:, :order]
                prefix_factorization_checks += q * order
                assert local.det() > 0
                switch_determinant_checks += 1
                for first_row in range(q - order + 1):
                    solid = toeplitz[first_row : first_row + order, :]
                    assert solid.det() > 0
                    toeplitz_solid_minor_checks += 1
                    value = basis[first_row : first_row + order, :order].det()
                    assert value == solid.det() * local.det()
                    assert value > 0
                    positive_basis_initial_minors += 1

                # First `order` coefficient rows, arbitrary consecutive columns.
                for first_column in range(1, q - order + 1):
                    common_constants = (
                        [a(i) for i in range(first_column)]
                        + [b(i) for i in range(first_column + order - 1, n)]
                    )
                    common = product_polynomial(common_constants)
                    local = polynomial_matrix(
                        switch_block(n, first_column, order), order - 1
                    )
                    toeplitz = toeplitz_convolution(common, q, order)
                    assert (
                        toeplitz * local
                        == basis[:, first_column : first_column + order]
                    )
                    consecutive_factorization_checks += q * order
                    assert local.det() > 0
                    switch_determinant_checks += 1
                    leading_toeplitz = toeplitz[:order, :]
                    assert leading_toeplitz.det() == common.nth(0) ** order > 0
                    value = basis[:order, first_column : first_column + order].det()
                    assert value == leading_toeplitz.det() * local.det()
                    assert value > 0
                    positive_basis_initial_minors += 1

            q0 = q0_matrix(d, basis)
            for minor in initial_minors(q0):
                assert sp.factor(minor.det(method="domain-ge")) > 0
                positive_q0_initial_minors += 1

    report = {
        "kind": "bottom_beta_switch_tp_certificate",
        "status": "PASS_EXACT_BETA_SWITCH_TP",
        "basis_identity_and_determinant_d_range": [3, 25],
        "initial_minor_factorization_d_range": [3, 15],
        "q0_initial_minor_d_range": [3, 15],
        "basis_entry_checks": basis_entry_checks,
        "basis_determinant_checks": determinant_checks,
        "prefix_block_factorization_entry_checks": prefix_factorization_checks,
        "consecutive_block_factorization_entry_checks": consecutive_factorization_checks,
        "positive_toeplitz_solid_minor_checks": toeplitz_solid_minor_checks,
        "positive_switch_determinant_checks": switch_determinant_checks,
        "positive_basis_initial_minor_checks": positive_basis_initial_minors,
        "positive_q0_initial_minor_checks": positive_q0_initial_minors,
        "all_order_conclusion": (
            "Every Gasca--Pena initial minor of B is a product of a positive "
            "switch determinant and a positive solid minor of a product of "
            "positive bidiagonal Toeplitz matrices. Hence B is STP. Checker-"
            "signed inverse closure and positive diagonal multiplication imply "
            "Q0 is STP for every d."
        ),
        "scope": (
            "This closes the constant t=0 endpoint in all orders. It does not "
            "prove the coefficientwise TN of the deflated mixed pencil."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
