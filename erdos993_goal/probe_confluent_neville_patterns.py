#!/usr/bin/env python3
"""Inspect exact Neville parameters of the t=1 confluent quotient."""

from fractions import Fraction as F

from probe_newton_full_neville_patterns import neville_parameters
from probe_switch_gauge_quotient import confluent_quotient


def compact(value):
    return f"{value.numerator}/{value.denominator}"


def main():
    for q in range(2, 9):
        matrix = confluent_quotient(q, F(1))
        forward, _ = neville_parameters(matrix)
        transposed, _ = neville_parameters([list(row) for row in zip(*matrix)])
        print(f"q={q}")
        print("  forward0", [compact(value) for _, value in forward[0]])
        print("  transpose0", [compact(value) for _, value in transposed[0]])
        print("  forward_last", compact(forward[-1][0][1]))
        print("  transpose_last", compact(transposed[-1][0][1]))


if __name__ == "__main__":
    main()
