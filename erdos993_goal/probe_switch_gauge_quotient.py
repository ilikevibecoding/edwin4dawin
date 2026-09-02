#!/usr/bin/env python3
"""Scan switch-basis gauges for a TN quotient of the full coefficient matrix."""

from fractions import Fraction as F

from fast_bottom_forward import (
    inverse_upper,
    matmul,
    polynomial_coefficient_matrix,
    zeros,
)
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit


def multiply_linear(polynomial, constant):
    out = [F(0)] * (len(polynomial) + 1)
    for degree, value in enumerate(polynomial):
        out[degree] += constant * value
        out[degree + 1] += value
    return out


def switch_coefficients(q, alpha):
    n = q - 1
    out = zeros(q, q)
    for p in range(q):
        polynomial = [F(1)]
        for i in range(p):
            polynomial = multiply_linear(polynomial, alpha + i)
        for i in range(p, n):
            polynomial = multiply_linear(polynomial, F(5 + i))
        for degree, value in enumerate(polynomial):
            out[degree][p] = value
    return out


def confluent_switch_coefficients(q, root):
    n = q - 1
    out = zeros(q, q)
    for p in range(q):
        polynomial = [F(1)]
        for _ in range(p):
            polynomial = multiply_linear(polynomial, root)
        for i in range(p, n):
            polynomial = multiply_linear(polynomial, F(5 + i))
        for degree, value in enumerate(polynomial):
            out[degree][p] = value
    return out


def quotient(q, alpha):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    switch_upper = matmul(lower_inverse, switch_coefficients(q, alpha))
    assert all(
        switch_upper[row][column] == 0
        for row in range(q)
        for column in range(row)
    )
    return matmul(inverse_upper(switch_upper), polynomial_coefficient_matrix(q))


def confluent_quotient(q, root):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    switch_upper = matmul(
        lower_inverse, confluent_switch_coefficients(q, root)
    )
    assert all(
        switch_upper[row][column] == 0
        for row in range(q)
        for column in range(row)
    )
    return matmul(inverse_upper(switch_upper), polynomial_coefficient_matrix(q))


def status(matrix):
    forward, transposed = neville_pair(matrix)
    return forward["status"], transposed["status"], forward, transposed


def main():
    alphas = [F(0), F(1, 4), F(1, 2), F(3, 4), F(1), F(3, 2), F(2), F(5, 2), F(3)]
    for alpha in alphas:
        last_pass = 1
        obstruction = None
        for q in range(2, 21):
            result = status(quotient(q, alpha))
            if result[:2] != ("PASS", "PASS"):
                obstruction = (q, result[2], result[3])
                break
            last_pass = q
        print(
            f"alpha={alpha} last_pass={last_pass} obstruction={obstruction}"
        )
    roots = [
        F(0), F(1, 100), F(1, 20), F(1, 10), F(1, 4), F(1, 2),
        F(1), F(3, 2), F(2), F(3), F(4),
    ]
    for root in roots:
        last_pass = 1
        obstruction = None
        for q in range(2, 31):
            result = status(confluent_quotient(q, root))
            if result[:2] != ("PASS", "PASS"):
                obstruction = (q, result[2], result[3])
                break
            last_pass = q
        print(
            f"confluent_root={root} last_pass={last_pass} "
            f"obstruction={obstruction}"
        )


if __name__ == "__main__":
    main()
