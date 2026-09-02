#!/usr/bin/env python3
"""Exact rank-defect structure of the affine inverse pencil coefficient.

Let Q1 be the coefficient of t in the checker-signed inverse pencil from
Section 43.  Its central factor is the strictly upper-triangular matrix
Z-diag(Z), hence Q1 has rank q-1.  This script audits closed right/left null
polynomials and an explicit formula for every maximal minor.

The displayed formulas have elementary all-index proofs; the finite checks
are an independent replayable audit.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    central_inverse_mmatrix,
    reverse_identity,
)


OUT = Path("bottom_affine_rank_defect_certificate_20260803.json")
ZVAR = sp.symbols("z")


def basis_matrix(d: int) -> sp.Matrix:
    return coefficient_matrix(cleared_catalan_basis(d - 1))


def determinant_closed(d: int) -> sp.Expr:
    n = d - 2
    unscaled = sp.prod(
        sp.Rational(2 * (j - i) + 3, 2)
        for i in range(n)
        for j in range(i, n)
    )
    return sp.Integer(4) ** (n * (n + 1) // 2) * unscaled


def q1_data(d: int) -> tuple[sp.Matrix, sp.Matrix, sp.Matrix]:
    q = d - 1
    basis = basis_matrix(d)
    reversal = reverse_identity(q)
    right_basis = reversal * basis.T * reversal
    signs = checker(q)
    central = central_inverse_from_blocks(d)
    offdiagonal = central - sp.diag(*central.diagonal())
    q1 = sp.simplify(signs * right_basis.inv() * offdiagonal * basis.inv() * signs)
    return basis, central, q1


def gamma_closed(d: int, basis_determinant: sp.Expr, central: sp.Matrix) -> sp.Expr:
    q = d - 1
    alpha = (-1) ** (q - 1) * sp.prod(central[i, i + 1] for i in range(q - 1))
    return sp.factor(alpha / basis_determinant**2)


def main() -> None:
    determinant_checks = 0
    superdiagonal_checks = 0
    nullvector_entry_checks = 0
    null_polynomial_checks = 0
    rank_checks = 0
    adjugate_entry_checks = 0
    maximal_minor_checks = 0

    # The switch-product determinant is cheap to audit to high order.
    for d in range(3, 26):
        basis = basis_matrix(d)
        assert sp.factor(basis.det() - determinant_closed(d)) == 0
        determinant_checks += 1

    # The central superdiagonal has a two-term Catalan-convolution formula.
    for d in range(3, 61):
        central = central_inverse_mmatrix(d)
        for i in range(d - 2):
            closed = -2 * (
                sp.Rational(1, sp.binomial(d, i + 1))
                + sp.Rational(1, sp.binomial(d, i + 2))
            )
            assert sp.factor(central[i, i + 1] - closed) == 0
            assert closed < 0
            superdiagonal_checks += 1

    # Matrix inversions and adjugates are more expensive, so use moderate
    # exact ranges.  The note supplies the all-index derivation.
    for d in range(3, 16):
        q = d - 1
        n = q - 1
        basis, central, q1 = q1_data(d)
        coefficients = [sp.expand(sp.rf(sp.Symbol("x") + 5, n)).coeff(sp.Symbol("x"), i) for i in range(q)]
        right_null = sp.Matrix([(-1) ** i * coefficients[i] for i in range(q)])
        left_null = sp.Matrix([(-1) ** i * coefficients[n - i] for i in range(q)])
        assert q1 * right_null == sp.zeros(q, 1)
        assert q1.T * left_null == sp.zeros(q, 1)
        nullvector_entry_checks += 2 * q
        assert q1.rank() == q - 1
        rank_checks += 1

        right_polynomial = sp.expand(sum(right_null[i] * ZVAR**i for i in range(q)))
        left_polynomial = sp.expand(sum(left_null[i] * ZVAR**i for i in range(q)))
        expected_right = sp.expand(sp.prod(r - ZVAR for r in range(5, d + 3)))
        expected_left = sp.expand(sp.prod(1 - r * ZVAR for r in range(5, d + 3)))
        assert right_polynomial == expected_right
        assert left_polynomial == expected_left
        null_polynomial_checks += 2

        if d <= 10:
            basis_determinant = determinant_closed(d)
            gamma = gamma_closed(d, basis_determinant, central)
            assert gamma > 0
            expected_adjugate = gamma * right_null * left_null.T
            actual_adjugate = q1.adjugate()
            assert sp.simplify(actual_adjugate - expected_adjugate) == sp.zeros(q)
            adjugate_entry_checks += q * q

            for deleted_row, deleted_column in itertools.product(range(q), repeat=2):
                rows = [i for i in range(q) if i != deleted_row]
                columns = [j for j in range(q) if j != deleted_column]
                value = sp.factor(q1.extract(rows, columns).det())
                closed = sp.factor(
                    gamma
                    * coefficients[deleted_column]
                    * coefficients[n - deleted_row]
                )
                assert value == closed
                assert value > 0
                maximal_minor_checks += 1

    report = {
        "kind": "bottom_affine_rank_defect_certificate",
        "status": "PASS_EXACT_AFFINE_RANK_DEFECT",
        "basis_determinant_d_range": [3, 25],
        "central_superdiagonal_d_range": [3, 60],
        "nullvector_d_range": [3, 15],
        "adjugate_and_all_maximal_minors_d_range": [3, 10],
        "basis_determinant_checks": determinant_checks,
        "central_superdiagonal_checks": superdiagonal_checks,
        "nullvector_entry_checks": nullvector_entry_checks,
        "null_polynomial_checks": null_polynomial_checks,
        "rank_checks": rank_checks,
        "adjugate_entry_checks": adjugate_entry_checks,
        "strictly_positive_maximal_minor_checks": maximal_minor_checks,
        "all_order_formulas": {
            "right_null_polynomial": "prod_{r=5}^{d+2}(r-z)",
            "left_null_polynomial": "prod_{r=5}^{d+2}(1-r z)",
            "basis_determinant": (
                "4^((d-2)(d-1)/2) prod_{0<=i<=j<d-2} "
                "(j-i+3/2)"
            ),
            "central_superdiagonal": (
                "Z[i,i+1]=-2(1/binom(d,i+1)+1/binom(d,i+2))"
            ),
            "maximal_minor": (
                "det Q1[delete row i, delete col j]="
                "gamma*[x^j](x+5)_(d-2)*[x^(d-2-i)](x+5)_(d-2), gamma>0"
            ),
        },
        "scope": (
            "This proves the exact rank defect, null roots, and positivity of "
            "every maximal minor of Q1. It does not prove its lower-order "
            "minors, mixed pencil coefficients, or the full reverse-TP lemma."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
