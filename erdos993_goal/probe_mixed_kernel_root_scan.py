#!/usr/bin/env python3
"""Scan the confluent root in the mixed two-sided kernel."""

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
from probe_switch_gauge_quotient import confluent_switch_coefficients


def mixed_kernel(q, root):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    g_upper = matmul(lower_inverse, confluent_switch_coefficients(q, root))
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


def main():
    roots = [F(0), F(1, 10), F(1, 4), F(1, 2), F(3, 4), F(1), F(5, 4), F(3, 2), F(2)]
    for root in roots:
        last = 1
        obstruction = None
        for q in range(2, 31):
            fwd, rev = neville_pair(mixed_kernel(q, root))
            if fwd["status"] != "PASS" or rev["status"] != "PASS":
                obstruction = (q, fwd, rev)
                break
            last = q
        print(f"root={root} last={last} obstruction={obstruction}")


if __name__ == "__main__":
    main()
