#!/usr/bin/env python3
"""Test whether the beta Newton upper factor absorbs the central inverse.

Write B=L U using the explicit Newton lower factor, and X=K J H J.  If U K
were TN, the full coefficient matrix B X would be a product of known TN
factors.  This exact probe records the first Neville obstruction for natural
partial products.
"""

from fast_bottom_forward import (
    beta_coefficients,
    central_k,
    eye,
    matmul,
    right_coefficient_matrix,
)
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from verify_bottom_derivative_completed_boundary_tn import rectangular_neville


def reverse_identity(n):
    return [row[::-1] for row in eye(n)]


def audit(matrix):
    return (
        rectangular_neville(matrix),
        rectangular_neville([list(row) for row in zip(*matrix)]),
    )


def status_pair(matrix):
    forward, transpose = audit(matrix)
    return forward["status"], transpose["status"], forward, transpose


def main():
    for q in range(2, 15):
        lower = beta_newton_lower(q)
        upper = matmul(inverse_lower_unit(lower), beta_coefficients(q))
        k = central_k(q + 1)
        j = reverse_identity(q)
        uk = matmul(upper, k)
        ukj = matmul(uk, j)
        full_right = right_coefficient_matrix(q)
        full = matmul(upper, full_right)
        print(
            f"q={q} UK={status_pair(uk)[:2]} "
            f"UKJ={status_pair(ukj)[:2]} U_right={status_pair(full)[:2]}"
        )
        if q <= 6:
            for name, matrix in (("UK", uk), ("UKJ", ukj)):
                forward, transpose = audit(matrix)
                if forward["status"] != "PASS" or transpose["status"] != "PASS":
                    print(f"  {name} forward={forward} transpose={transpose}")


if __name__ == "__main__":
    main()
