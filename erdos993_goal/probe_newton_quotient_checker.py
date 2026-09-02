#!/usr/bin/env python3
"""Inspect checker-inverse Neville data of L_q^(-1) C_q."""

from probe_confluent_transition_sections import inverse_matrix
from probe_newton_full_neville_patterns import neville_parameters, transformed


def fmt(value):
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def main():
    for q in range(2, 10):
        inverse = inverse_matrix(transformed(q))
        checker = [
            [(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
            for i in range(q)
        ]
        forward, pivots = neville_parameters(checker)
        transpose, _ = neville_parameters([list(row) for row in zip(*checker)])
        print(f"\nq={q}")
        print("F", [[fmt(v) for _, v in level] for level in forward])
        print("T", [[fmt(v) for _, v in level] for level in transpose])
        print("P", [fmt(v) for v in pivots])


if __name__ == "__main__":
    main()
