#!/usr/bin/env python3
"""Exact Neville-quotient factorization of the deflated constant core.

The null-coordinate right bidiagonal is precisely the first Neville row-
elimination factor of the beta coefficient matrix.  Therefore

    H = (E B^{-1} E) Rbar^{-1}

is TN: its checker inverse is the block-triangular matrix consisting of the
first beta pivot and the strictly-TP unreduced Neville block.  The left
quotient is J H^T J.  Their product around the positive diagonal is M0.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, initial_minors
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


OUT = Path("bottom_beta_neville_quotient_certificate_20260803.json")


def all_minors(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                yield matrix.extract(rows, columns)


def audit_nonnegative_minors(matrix: sp.Matrix, exhaustive: bool) -> tuple[int, int]:
    positive = 0
    zero = 0
    source = all_minors(matrix) if exhaustive else initial_minors(matrix)
    for minor in source:
        value = sp.factor(minor.det(method="domain-ge"))
        assert value >= 0
        positive += int(bool(value > 0))
        zero += int(bool(value == 0))
    return positive, zero


def main() -> None:
    quotient_identity_entry_checks = 0
    neville_block_entry_checks = 0
    left_right_symmetry_entry_checks = 0
    constant_core_factorization_entry_checks = 0
    positive_neville_block_initial_minors = 0
    quotient_initial_positive = 0
    quotient_initial_zero = 0
    core_initial_positive = 0
    core_initial_zero = 0
    exhaustive_positive = 0
    exhaustive_zero = 0

    for d in range(3, 16):
        q = d - 1
        basis = coefficient_matrix(cleared_catalan_basis(q))
        signs = checker(q)
        reversal = reverse_identity(q)
        _, left_full, right_full, middle0, _ = null_coordinate_data(d)

        beta_dual = sp.simplify(signs * basis.inv() * signs)
        right_quotient = sp.simplify(beta_dual * right_full.inv())
        neville_matrix = sp.simplify(signs * right_full * signs * basis)
        assert sp.simplify(signs * right_quotient.inv() * signs - neville_matrix) == sp.zeros(q)
        quotient_identity_entry_checks += q * q

        # The lower-right block is the unreduced matrix after the first
        # bottom-to-top Neville stage.  It is STP because B is STP.
        assert neville_matrix[1:, 0] == sp.zeros(q - 1, 1)
        assert neville_matrix[0, 0] > 0
        neville_block = neville_matrix[1:, 1:]
        for minor in initial_minors(neville_block):
            assert sp.factor(minor.det(method="domain-ge")) > 0
            positive_neville_block_initial_minors += 1
        neville_block_entry_checks += neville_block.rows * neville_block.cols

        left_quotient = sp.simplify(left_full.inv() * signs * (reversal * basis.T * reversal).inv() * signs)
        assert sp.simplify(left_quotient - reversal * right_quotient.T * reversal) == sp.zeros(q)
        left_right_symmetry_entry_checks += q * q

        central = central_inverse_from_blocks(d)
        diagonal = sp.diag(*central.diagonal())
        reconstructed = sp.simplify(left_quotient * diagonal * right_quotient)
        assert sp.simplify(reconstructed - middle0) == sp.zeros(q)
        constant_core_factorization_entry_checks += q * q

        for matrix in (right_quotient, left_quotient):
            positive, zero = audit_nonnegative_minors(matrix, exhaustive=False)
            quotient_initial_positive += positive
            quotient_initial_zero += zero
        positive, zero = audit_nonnegative_minors(middle0, exhaustive=False)
        core_initial_positive += positive
        core_initial_zero += zero

        if d <= 7:
            for matrix in (right_quotient, left_quotient, middle0):
                positive, zero = audit_nonnegative_minors(matrix, exhaustive=True)
                exhaustive_positive += positive
                exhaustive_zero += zero

    report = {
        "kind": "bottom_beta_neville_quotient_certificate",
        "status": "PASS_EXACT_BETA_NEVILLE_QUOTIENT",
        "d_range_initial_minors": [3, 15],
        "d_range_exhaustive_minors": [3, 7],
        "quotient_identity_entry_checks": quotient_identity_entry_checks,
        "neville_block_entry_checks": neville_block_entry_checks,
        "left_right_symmetry_entry_checks": left_right_symmetry_entry_checks,
        "constant_core_factorization_entry_checks": constant_core_factorization_entry_checks,
        "positive_neville_block_initial_minor_checks": positive_neville_block_initial_minors,
        "quotient_initial_positive_minor_checks": quotient_initial_positive,
        "quotient_initial_zero_minor_checks": quotient_initial_zero,
        "constant_core_initial_positive_minor_checks": core_initial_positive,
        "constant_core_initial_zero_minor_checks": core_initial_zero,
        "exhaustive_positive_minor_checks": exhaustive_positive,
        "exhaustive_zero_minor_checks": exhaustive_zero,
        "all_order_conclusion": (
            "The right quotient is the checker inverse of the first-pivot "
            "Neville block of B and is TN; the left quotient is its reversed "
            "transpose and is TN. Hence M0=left*D*right is TN for every d."
        ),
        "scope": (
            "This closes total nonnegativity of the deflated constant core. "
            "The variable corner W and mixed coefficient compatibility remain."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
