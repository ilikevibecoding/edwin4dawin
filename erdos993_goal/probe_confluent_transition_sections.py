#!/usr/bin/env python3
"""Inspect the t=1 inverse-factorial transition and rational sections."""

from fractions import Fraction as F

from fast_bottom_forward import (
    beta_coefficients,
    matmul,
    polynomial_coefficient_matrix,
    right_coefficient_matrix,
)
from probe_beta_newton_coordinates import inverse_lower_unit
from probe_switch_gauge_quotient import (
    confluent_quotient,
    confluent_switch_coefficients,
)
from probe_beta_newton_compressed_factor import neville_pair


def inverse_matrix(a):
    n = len(a)
    aug = [row[:] + [F(i == j) for j in range(n)] for i, row in enumerate(a)]
    for col in range(n):
        pivot = next(i for i in range(col, n) if aug[i][col])
        aug[col], aug[pivot] = aug[pivot], aug[col]
        scale = aug[col][col]
        aug[col] = [v / scale for v in aug[col]]
        for i in range(n):
            if i != col and aug[i][col]:
                scale = aug[i][col]
                aug[i] = [u - scale * v for u, v in zip(aug[i], aug[col])]
    return [row[n:] for row in aug]


def fmt(v):
    return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"


def print_matrix(label, matrix):
    print(label)
    for row in matrix:
        print("  ", " ".join(f"{fmt(v):>14}" for v in row))


def main():
    for q in range(2, 8):
        g = confluent_switch_coefficients(q, F(1))
        transition = matmul(inverse_matrix(g), beta_coefficients(q))
        right = right_coefficient_matrix(q)
        direct_quotient = matmul(transition, right)
        upper_quotient = confluent_quotient(q, F(1))
        direct_status = tuple(x["status"] for x in neville_pair(direct_quotient))
        upper_status = tuple(x["status"] for x in neville_pair(upper_quotient))
        print(f"\nq={q}")
        print("direct G^-1 C status", direct_status)
        print("upper U_g^-1 C status", upper_status)
        print_matrix("S=G^-1 B", transition)
        print_matrix("R=KJHJ", right)
        print_matrix("direct Z=S R", direct_quotient)
        print_matrix("upper quotient", upper_quotient)


if __name__ == "__main__":
    main()
