#!/usr/bin/env python3
"""Inspect checker-inverse Neville data of the surviving t=1 quotient."""

from probe_confluent_transition_sections import inverse_matrix
from probe_newton_full_neville_patterns import neville_parameters
from probe_switch_gauge_quotient import confluent_quotient


def fmt(value):
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def checker_inverse(q):
    inverse = inverse_matrix(confluent_quotient(q, 1))
    return [
        [(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
        for i in range(q)
    ]


def main():
    for q in range(2, 10):
        matrix = checker_inverse(q)
        forward, pivots = neville_parameters(matrix)
        transpose, _ = neville_parameters([list(row) for row in zip(*matrix)])
        print(f"\nq={q}")
        print("F", [[fmt(v) for _, v in level] for level in forward])
        print("T", [[fmt(v) for _, v in level] for level in transpose])
        print("P", [fmt(v) for v in pivots])


if __name__ == "__main__":
    main()
