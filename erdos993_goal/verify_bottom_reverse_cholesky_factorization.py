#!/usr/bin/env python3
"""Exact reverse-Cholesky reduction of the missing two-sided TP kernel.

Let K be the positive upper-triangular central matrix, D=diag(K), J reversal,
and X#=J X^T J.  Since K#=K and D#=D, the principal unipotent square root

    U = (K D^(-1))^(1/2)

satisfies D U# = U D and hence

    K = U D U#,             KJ = U D J U^T.

Consequently the missing matrix factors as

    B K J B^T J = (B U) D J (B U)^T J.

Strict total positivity of the single transformed basis matrix B U would be
sufficient for the missing theorem.  That tempting strengthening is false:
an exact 2 by 2 minor is negative at d=6.  This script records both the exact
reverse-Cholesky identity and the obstruction so the route is not reused.
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
    neville_parameters,
    reverse_identity,
)


OUT = Path("bottom_reverse_cholesky_obstruction_certificate_20260803.json")


def unipotent_square_root(matrix: sp.Matrix) -> sp.Matrix:
    """Principal square root of a unipotent matrix, as a finite series."""
    nilpotent = matrix - sp.eye(matrix.rows)
    return sp.simplify(
        sum(
            (sp.binomial(sp.Rational(1, 2), power) * nilpotent**power
             for power in range(matrix.rows)),
            sp.zeros(matrix.rows),
        )
    )


def reverse_cholesky_data(d: int):
    q = d - 1
    reversal = reverse_identity(q)
    basis = coefficient_matrix(cleared_catalan_basis(q))
    central = central_inverse_from_blocks(d).inv()
    diagonal = sp.diag(*central.diagonal())
    root = unipotent_square_root(central * diagonal.inv())
    sharp_root = reversal * root.T * reversal
    transformed_basis = sp.simplify(basis * root)
    target = sp.simplify(basis * central * reversal * basis.T * reversal)
    factored_target = sp.simplify(
        transformed_basis
        * diagonal
        * reversal
        * transformed_basis.T
        * reversal
    )
    return (
        basis,
        central,
        diagonal,
        root,
        sharp_root,
        transformed_basis,
        target,
        factored_target,
    )


def exhaustive_positive_minors(matrix: sp.Matrix) -> int:
    count = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                assert sp.factor(matrix.extract(rows, columns).det()) > 0
                count += 1
    return count


def main() -> None:
    square_root_entry_checks = 0
    sharp_symmetry_entry_checks = 0
    reverse_cholesky_entry_checks = 0
    target_factorization_entry_checks = 0
    positive_transformed_neville_parameters = 0
    exhaustive_positive_transformed_minors = 0
    records = []
    obstruction = None

    for d in range(3, 7):
        q = d - 1
        (
            _basis,
            central,
            diagonal,
            root,
            sharp_root,
            transformed_basis,
            target,
            factored_target,
        ) = reverse_cholesky_data(d)

        normalized = central * diagonal.inv()
        assert sp.simplify(root * root - normalized) == sp.zeros(q)
        square_root_entry_checks += q * q

        assert sp.simplify(diagonal * sharp_root - root * diagonal) == sp.zeros(q)
        sharp_symmetry_entry_checks += q * q

        assert sp.simplify(central - root * diagonal * sharp_root) == sp.zeros(q)
        reverse_cholesky_entry_checks += q * q

        assert target == factored_target
        target_factorization_entry_checks += q * q

        local_parameters = 0
        if d <= 5:
            row_multipliers, row_pivots = neville_parameters(transformed_basis)
            column_multipliers, column_pivots = neville_parameters(transformed_basis.T)
            parameters = row_multipliers + row_pivots + column_multipliers + column_pivots
            assert all(value > 0 for value in parameters)
            local_parameters = len(parameters)
            positive_transformed_neville_parameters += local_parameters
        else:
            bad_minor = sp.factor(transformed_basis.extract((0, 1), (3, 4)).det())
            assert bad_minor == -sp.Rational(2049740942388, 33275)
            obstruction = {
                "d": 6,
                "rows_zero_based": [0, 1],
                "columns_zero_based": [3, 4],
                "minor_order": 2,
                "determinant": str(bad_minor),
            }

        local_exhaustive = 0
        if d <= 5:
            local_exhaustive = exhaustive_positive_minors(transformed_basis)
            exhaustive_positive_transformed_minors += local_exhaustive

        records.append(
            {
                "d": d,
                "q": q,
                "positive_transformed_basis_neville_parameters_if_d_le_5": local_parameters,
                "exhaustive_positive_minors_if_d_le_5": local_exhaustive,
            }
        )

    report = {
        "kind": "bottom_reverse_cholesky_obstruction_certificate",
        "status": "PASS_EXACT_REVERSE_CHOLESKY_OBSTRUCTION",
        "d_range": [3, 6],
        "square_root_entry_checks": square_root_entry_checks,
        "sharp_symmetry_entry_checks": sharp_symmetry_entry_checks,
        "reverse_cholesky_entry_checks": reverse_cholesky_entry_checks,
        "target_factorization_entry_checks": target_factorization_entry_checks,
        "positive_transformed_basis_neville_parameters": positive_transformed_neville_parameters,
        "exhaustive_positive_transformed_basis_minors_d_le_5": exhaustive_positive_transformed_minors,
        "exact_obstruction": obstruction,
        "pruned_claim": "The reverse-Cholesky transformed basis B_d U_d is strictly totally positive for every d.",
        "scope": (
            "The reverse-Cholesky identities are exact, but the proposed "
            "strict-total-positivity strengthening is disproved by the "
            "displayed exact d=6 minor."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
