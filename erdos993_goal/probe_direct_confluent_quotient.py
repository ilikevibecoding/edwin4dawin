#!/usr/bin/env python3
"""Audit the genuine G_q(1)^(-1) C_q inverse-factorial quotient."""

from fractions import Fraction as F

from fast_bottom_forward import beta_coefficients, matmul, right_coefficient_matrix
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_switch_gauge_quotient import confluent_switch_coefficients


def direct_confluent_quotient(q, root=F(1)):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    g_upper = matmul(lower_inverse, confluent_switch_coefficients(q, root))
    b_upper = matmul(lower_inverse, beta_coefficients(q))
    from fast_bottom_forward import inverse_upper
    transition = matmul(inverse_upper(g_upper), b_upper)
    return matmul(transition, right_coefficient_matrix(q))


def main():
    for q in range(2, 41):
        matrix = direct_confluent_quotient(q)
        fwd, rev = neville_pair(matrix)
        if fwd["status"] != "PASS" or rev["status"] != "PASS":
            print(f"q={q} FAIL forward={fwd} transpose={rev}")
            return
        print(
            f"q={q} PASS f+={fwd['positive']} t+={rev['positive']} "
            f"pivots={fwd['positive_pivots']}",
            flush=True,
        )


if __name__ == "__main__":
    main()
