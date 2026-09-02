#!/usr/bin/env python3
"""Inspect checker-signed inverse of direct inverse-factorial quotient."""

from fractions import Fraction as F

from probe_confluent_transition_sections import inverse_matrix, print_matrix
from probe_direct_confluent_quotient import direct_confluent_quotient


def main():
    for q in range(2, 9):
        inv = inverse_matrix(direct_confluent_quotient(q))
        checked = [
            [(-1 if (i + j) % 2 else 1) * inv[i][j] for j in range(q)]
            for i in range(q)
        ]
        diagonal_scaled = [
            [checked[i][j] / checked[i][i] for j in range(q)] for i in range(q)
        ]
        print(f"\nq={q}")
        print_matrix("checker inverse", checked)
        print_matrix("row diagonal normalized", diagonal_scaled)


if __name__ == "__main__":
    main()
