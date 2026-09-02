#!/usr/bin/env python3
"""Exact rising-factorial reduction of the two-sided reverse-TP target.

Let P be the coefficient matrix of the degree-graded rising factorials

    1, x, x(x+1), ..., (x)_(q-1).

P is the unit upper-triangular unsigned-Stirling matrix and is totally
nonnegative.  If S=B K J B^T is the symmetric monomial coefficient matrix,
put H=P^(-1) S P^(-T).  Then

    S J = P (H J) (J P^T J).

Both outside matrices are nonsingular and totally nonnegative.  Therefore
strict total positivity of HJ would imply the missing strict total positivity
of SJ.  The tempting stronger lemma is false: HJ is strictly totally positive
through d=9 but has a negative initial minor at d=10.  This script records the
exact factorization and that exact obstruction so the route is not reused.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import two_sided_data
from verify_bottom_universal_schur_tp import neville_parameters, reverse_identity


OUT = Path("bottom_newton_basis_obstruction_certificate_20260803.json")


def rising_factorial_matrix(q: int) -> sp.Matrix:
    return coefficient_matrix(
        [sp.Poly(sp.rf(X, degree), X) for degree in range(q)]
    )


def newton_data(d: int):
    q = d - 1
    reversal = reverse_identity(q)
    symmetric = two_sided_data(d)[2]
    rising = rising_factorial_matrix(q)
    newton_symmetric = sp.simplify(rising.inv() * symmetric * rising.inv().T)
    newton_target = newton_symmetric * reversal
    recovered = sp.simplify(
        rising * newton_target * reversal * rising.T * reversal
    )
    return rising, newton_symmetric, newton_target, recovered, symmetric * reversal


def all_minor_signs(matrix: sp.Matrix, strict: bool) -> tuple[int, int]:
    positive = zero = 0
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                assert value > 0 if strict else value >= 0
                positive += 1 if value > 0 else 0
                zero += 1 if value == 0 else 0
    return positive, zero


def main() -> None:
    exact_factorization_entries = 0
    exhaustive_positive_newton_minors = 0
    exhaustive_rising_nonnegative_minors = 0
    exhaustive_rising_zero_minors = 0
    positive_newton_neville_parameters = 0
    records = []
    obstruction = None

    for d in range(3, 11):
        q = d - 1
        rising, _symmetric, target, recovered, original_target = newton_data(d)
        assert recovered == original_target
        exact_factorization_entries += q * q

        local_parameters = 0
        if d <= 9:
            row_multipliers, row_pivots = neville_parameters(target)
            column_multipliers, column_pivots = neville_parameters(target.T)
            parameters = row_multipliers + row_pivots + column_multipliers + column_pivots
            assert all(value > 0 for value in parameters)
            local_parameters = len(parameters)
            positive_newton_neville_parameters += local_parameters
        else:
            bad_minor = sp.factor(target[:8, 1:9].det())
            expected = -sp.Rational(
                11915046396303567371257997459674502248021143547011103132640870400000000000000000000000000,
                19573,
            )
            assert bad_minor == expected
            obstruction = {
                "d": 10,
                "rows_zero_based": list(range(8)),
                "columns_zero_based": list(range(1, 9)),
                "minor_order": 8,
                "determinant": str(bad_minor),
            }

        local_exhaustive = 0
        if d <= 8:
            positive, zero = all_minor_signs(target, strict=True)
            assert zero == 0
            local_exhaustive = positive
            exhaustive_positive_newton_minors += positive

            positive, zero = all_minor_signs(rising, strict=False)
            exhaustive_rising_nonnegative_minors += positive
            exhaustive_rising_zero_minors += zero

        records.append(
            {
                "d": d,
                "q": q,
                "positive_newton_neville_parameters_if_d_le_9": local_parameters,
                "exhaustive_positive_newton_minors_if_d_le_8": local_exhaustive,
            }
        )

    report = {
        "kind": "bottom_newton_basis_obstruction_certificate",
        "status": "PASS_EXACT_NEWTON_BASIS_OBSTRUCTION",
        "d_range": [3, 10],
        "exact_factorization_entry_checks": exact_factorization_entries,
        "positive_newton_neville_parameters": positive_newton_neville_parameters,
        "exhaustive_positive_newton_minors_d_le_8": exhaustive_positive_newton_minors,
        "exhaustive_nonnegative_rising_basis_minors_d_le_8": (
            exhaustive_rising_nonnegative_minors + exhaustive_rising_zero_minors
        ),
        "positive_rising_basis_minors_d_le_8": exhaustive_rising_nonnegative_minors,
        "zero_rising_basis_minors_d_le_8": exhaustive_rising_zero_minors,
        "exact_obstruction": obstruction,
        "pruned_claim": "The Newton-basis matrix H_d J is strictly totally positive for every d.",
        "scope": (
            "The basis transformation and factorization are exact, but the "
            "stronger Newton-basis total-positivity route is disproved by "
            "the displayed exact d=10 initial minor."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
