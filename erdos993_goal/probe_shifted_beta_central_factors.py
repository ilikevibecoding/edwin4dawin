#!/usr/bin/env python3
"""Test whether shifting the beta basis lets its upper factor absorb K."""

from fractions import Fraction as F

from fast_bottom_forward import central_k, eye, matmul, zeros
from probe_beta_newton_compressed_factor import neville_pair, reversal
from probe_beta_newton_coordinates import inverse_lower_unit
from probe_switch_gauge_quotient import multiply_linear


def shifted_beta_coefficients(q, shift):
    n = q - 1
    out = zeros(q, q)
    for p in range(q):
        polynomial = [F(4**p)]
        for i in range(p):
            polynomial = multiply_linear(polynomial, F(7, 2) - shift + i)
        for i in range(p, n):
            polynomial = multiply_linear(polynomial, F(5) - shift + i)
        for degree, value in enumerate(polynomial):
            out[degree][p] = value
    return out


def shifted_newton_lower(q, shift):
    n = q - 1
    out = zeros(q, q)
    for r in range(q):
        polynomial = [F(0)] * r + [F(1)]
        for i in range(r, n):
            constant = F(5) - shift + i
            following = [F(0)] * (len(polynomial) + 1)
            for degree, value in enumerate(polynomial):
                following[degree] += value
                following[degree + 1] += value / constant
            polynomial = following
        for degree, value in enumerate(polynomial):
            out[degree][r] = value
    return out


def status(matrix):
    forward, transposed = neville_pair(matrix)
    return forward["status"], transposed["status"], forward, transposed


def main():
    for shift in (F(0), F(1, 2), F(1), F(3, 2), F(2)):
        last_pass = 1
        obstruction = None
        for q in range(2, 31):
            lower = shifted_newton_lower(q, shift)
            upper = matmul(
                inverse_lower_unit(lower),
                shifted_beta_coefficients(q, shift),
            )
            product = matmul(upper, central_k(q + 1))
            result = status(product)
            if result[:2] != ("PASS", "PASS"):
                obstruction = (q, result[2], result[3])
                break
            last_pass = q
        print(
            f"shift={shift} U_shift_K_last_pass={last_pass} "
            f"obstruction={obstruction}"
        )


if __name__ == "__main__":
    main()
