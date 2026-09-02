#!/usr/bin/env python3
"""Compute the cumulative barycentric bridge for the t=3 confluent basis."""

from fractions import Fraction as F
from math import factorial

from fast_bottom_forward import matmul, zeros
from probe_beta_newton_superballot_bridge import super_ballot
from probe_confluent_transition_sections import inverse_matrix, print_matrix
from probe_switch_gauge_quotient import confluent_switch_coefficients


def evaluate_coefficients(coefficients, x):
    return sum(value * x**degree for degree, value in enumerate(coefficients))


def cumulative_bridge(q, root=F(3)):
    coefficient_matrix = confluent_switch_coefficients(q, root)
    out = zeros(q, q)
    for p in range(q):
        cumulative = F(0)
        polynomial = [coefficient_matrix[r][p] for r in range(q)]
        for a in range(q):
            node = F(-3 - a)
            derivative = F((-1) ** a * factorial(a) * factorial(q - a))
            cumulative += evaluate_coefficients(polynomial, node) / derivative
            out[a][p] = cumulative
    return out


def main():
    for q in range(2, 9):
        bridge = cumulative_bridge(q)
        transition = matmul(inverse_matrix(bridge), super_ballot(q))
        print(f"\nq={q}")
        print_matrix("T_g", bridge)
        print_matrix("T_g^-1 Tau", transition)


if __name__ == "__main__":
    main()
