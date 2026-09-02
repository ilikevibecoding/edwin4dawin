#!/usr/bin/env python3
"""Inspect the mixed inverse-factorial/descending-monomial kernel."""

from fractions import Fraction as F

from fast_bottom_forward import (
    beta_coefficients,
    central_k,
    eye,
    inverse_upper,
    matmul,
)
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_switch_gauge_quotient import confluent_switch_coefficients


def mixed_kernel(q):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    g_upper = matmul(lower_inverse, confluent_switch_coefficients(q, F(1)))
    b_upper = matmul(lower_inverse, beta_coefficients(q))
    transition = matmul(inverse_upper(g_upper), b_upper)
    reversal = [row[::-1] for row in eye(q)]
    beta_transpose = [list(row) for row in zip(*beta_coefficients(q))]
    return matmul(
        matmul(
            matmul(matmul(transition, central_k(q + 1)), reversal),
            beta_transpose,
        ),
        reversal,
    )


def cross_ratio(a, i, j):
    return a[i][j] * a[0][0] / (a[i][0] * a[0][j])


def main():
    for q in range(2, 9):
        a = mixed_kernel(q)
        normalized = [
            [cross_ratio(a, i, j) for j in range(q)] for i in range(q)
        ]
        print(f"\nq={q}")
        for row in normalized:
            print(" ", " ".join(str(value) for value in row))


if __name__ == "__main__":
    main()
