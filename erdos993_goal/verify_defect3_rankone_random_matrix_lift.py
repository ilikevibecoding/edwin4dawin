#!/usr/bin/env python3
"""Rank-one Haar-product lift of the common defect-three factorization.

The reversed Chebyshev pair is the characteristic-polynomial pair of two
negative semidefinite matrices differing by one positive rank-one update.
Combining this with the common positive Laguerre factor and the MSS expected
characteristic-polynomial formula gives a coupled random-matrix model for
the reversed transformed seeds.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_defect3_common_finite_free_factor import (
    Z,
    chebyshev_direct,
    finite_free_multiplicative,
    laguerre_direct,
    reverse_at_degree,
    transformed_direct,
)


OUT = Path("defect3_rankone_random_matrix_lift_certificate_20260802.json")


def path_laplacian(n: int) -> sp.Matrix:
    matrix = 2 * sp.eye(n)
    for i in range(n - 1):
        matrix[i, i + 1] = -1
        matrix[i + 1, i] = -1
    return matrix


def path_inverse_closed(n: int) -> sp.Matrix:
    return sp.Matrix(
        n,
        n,
        lambda i, j: sp.Rational(
            (min(i, j) + 1) * (n - max(i, j)), n + 1
        ),
    )


def main() -> None:
    rank_one_checks = []
    for n in range(2, 51):
        inverse = path_inverse_closed(n)
        assert path_laplacian(n) * inverse == sp.eye(n)

        previous = sp.zeros(n)
        previous[: n - 1, : n - 1] = path_inverse_closed(n - 1)
        vector = sp.Matrix(range(1, n + 1))
        update = vector * vector.T / (n * (n + 1))
        assert inverse - previous == update
        assert update.rank() == 1
        rank_one_checks.append(n)

    characteristic_checks = []
    convolution_checks = []
    for n in range(2, 13):
        inverse = path_inverse_closed(n)
        previous = sp.zeros(n)
        previous[: n - 1, : n - 1] = path_inverse_closed(n - 1)
        current_matrix = -inverse
        previous_matrix = -previous

        current_char = sp.expand((Z * sp.eye(n) - current_matrix).det())
        previous_char = sp.expand((Z * sp.eye(n) - previous_matrix).det())
        current_input = reverse_at_degree(chebyshev_direct(n), n)
        previous_input = reverse_at_degree(chebyshev_direct(n - 1), n)
        assert sp.expand(current_char - current_input) == 0
        assert sp.expand(previous_char - previous_input) == 0
        characteristic_checks.append(n)

        laguerre_char = reverse_at_degree(laguerre_direct(n), n)
        current_output = reverse_at_degree(transformed_direct(n + 2), n)
        previous_output = reverse_at_degree(transformed_direct(n + 1), n)
        assert sp.expand(
            finite_free_multiplicative(current_char, laguerre_char, n)
            - current_output
        ) == 0
        assert sp.expand(
            finite_free_multiplicative(previous_char, laguerre_char, n)
            - previous_output
        ) == 0
        convolution_checks.append(n)

    report = {
        "kind": "defect3_rankone_random_matrix_lift_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_RANKONE_PATH_LIFT_WITH_HAAR_THEOREM",
        "path_matrix": "K_n=2I-A(P_n)",
        "current_matrix": "A_n=-K_n^(-1)",
        "previous_matrix": "A_(n-1)^pad=-diag(K_(n-1)^(-1),0)",
        "rank_one_identity": (
            "A_(n-1)^pad=A_n+vv^T, "
            "v=(1,2,...,n)/sqrt(n(n+1))"
        ),
        "rank_one_range_n": [2, 50],
        "rank_one_checks": len(rank_one_checks),
        "characteristic_range_n": [2, 12],
        "characteristic_checks": len(characteristic_checks),
        "common_positive_factor": "rev_n[1F1(-n;3;x)]",
        "finite_free_checks": len(convolution_checks),
        "theorem_invocation": (
            "MSS finite-free multiplicative convolution: for Hermitian A and "
            "positive semidefinite L, p_A boxtimes_n p_L is the expected "
            "characteristic polynomial of A Q L Q* over Haar Q."
        ),
        "coupled_model": (
            "For every Haar sample, the previous product matrix is a positive "
            "rank-one update of the current negative-definite product matrix; "
            "both transformed expected characteristic polynomials use the same Q and L."
        ),
        "warning": (
            "The coupled lift is exact, but expectation and the later "
            "two-variable coefficient extraction still require a separate "
            "stability argument."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
