#!/usr/bin/env python3
"""Inspect Neville factors of the mixed kernel's checker inverse."""

from probe_confluent_transition_sections import inverse_matrix
from probe_mixed_confluent_kernel import mixed_kernel
from probe_newton_full_neville_patterns import neville_parameters


def fmt(v):
    return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"


def checked_inverse(q):
    inv = inverse_matrix(mixed_kernel(q))
    return [
        [(-1 if (i + j) % 2 else 1) * inv[i][j] for j in range(q)]
        for i in range(q)
    ]


def main():
    for q in range(2, 10):
        matrix = checked_inverse(q)
        forward, pivots = neville_parameters(matrix)
        transpose, _ = neville_parameters([list(row) for row in zip(*matrix)])
        print(f"\nq={q}")
        print(" F0", [(row, fmt(v)) for row, v in forward[0]])
        print(" T0", [(row, fmt(v)) for row, v in transpose[0]])
        print(" Flast", fmt(forward[-1][0][1]))
        print(" Tlast", fmt(transpose[-1][0][1]))
        print(" pivots", [fmt(v) for v in pivots])
        if q <= 5:
            print(" F", [[fmt(v) for _, v in level] for level in forward])
            print(" T", [[fmt(v) for _, v in level] for level in transpose])


if __name__ == "__main__":
    main()
