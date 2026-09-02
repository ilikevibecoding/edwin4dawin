#!/usr/bin/env python3
"""Scan rising-root switch coordinates for the mixed two-sided kernel."""

from fractions import Fraction as F

from fast_bottom_forward import (
    beta_coefficients,
    central_k,
    eye,
    inverse_upper,
    matmul,
)
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_switch_gauge_quotient import switch_coefficients


def mixed_kernel(q, alpha):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    gamma_upper = matmul(lower_inverse, switch_coefficients(q, alpha))
    beta_upper = matmul(lower_inverse, beta_coefficients(q))
    transition = matmul(inverse_upper(gamma_upper), beta_upper)
    reversal = [row[::-1] for row in eye(q)]
    beta_transpose = [list(row) for row in zip(*beta_coefficients(q))]
    return matmul(
        matmul(
            matmul(matmul(transition, central_k(q + 1)), reversal),
            beta_transpose,
        ),
        reversal,
    )


def main():
    values = [F(0), F(1, 2), F(1), F(3, 2), F(2), F(5, 2), F(3), F(13, 4), F(7, 2)]
    for alpha in values:
        last = 1
        obstruction = None
        for q in range(2, 31):
            forward, transpose = neville_pair(mixed_kernel(q, alpha))
            if forward["status"] != "PASS" or transpose["status"] != "PASS":
                obstruction = (q, forward, transpose)
                break
            last = q
        print(f"alpha={alpha} last={last} obstruction={obstruction}", flush=True)


if __name__ == "__main__":
    main()
