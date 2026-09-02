#!/usr/bin/env python3
"""Inspect row-production matrices of the reversed affine sandwich."""

from __future__ import annotations

import argparse
from fractions import Fraction as F

from fast_bottom_forward import matmul
from probe_confluent_transition_sections import inverse_matrix
from verify_newton_checker_offdiag_homotopy import constant_and_linear


def production(matrix):
    q = len(matrix)
    top = [row[: q - 1] for row in matrix[: q - 1]]
    shifted = [row[:] for row in matrix[1:]]
    return matmul(inverse_matrix(top), shifted)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=8)
    args = parser.parse_args()
    a, b = constant_and_linear(args.q)
    for label, t in (("zero", F(0)), ("one", F(1)), ("two", F(2))):
        upper = [[a[i][j] + t * b[i][j] for j in range(args.q)] for i in range(args.q)]
        lower = [list(reversed(row)) for row in reversed(upper)]
        # Positive row scaling to unit diagonal does not affect support/sign
        # phenomena but gives the standard output-matrix normalization.
        unit = [[x / lower[i][i] for x in lower[i]] for i in range(args.q)]
        p = production(unit)
        print(label)
        for row in p:
            print(" ".join("+" if x > 0 else "-" if x < 0 else "0" for x in row))
        print("values")
        for row in p:
            print(row)


if __name__ == "__main__":
    main()
