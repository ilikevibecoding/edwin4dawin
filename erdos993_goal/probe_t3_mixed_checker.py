#!/usr/bin/env python3
"""Inspect the barycentric-aligned t=3 mixed kernel and checker inverse."""

from fractions import Fraction as F

from probe_confluent_transition_sections import inverse_matrix
from probe_mixed_kernel_root_scan import mixed_kernel
from probe_newton_full_neville_patterns import neville_parameters


def fmt(v):
    return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"


def main():
    for q in range(2, 10):
        a = mixed_kernel(q, F(3))
        inv = inverse_matrix(a)
        checker = [
            [(-1 if (i + j) % 2 else 1) * inv[i][j] for j in range(q)]
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
