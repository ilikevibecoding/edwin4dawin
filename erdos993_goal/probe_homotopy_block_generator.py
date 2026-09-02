#!/usr/bin/env python3
"""Inspect the support and signs of G=A_block^{-1}B_block."""

from __future__ import annotations

import argparse

from probe_confluent_transition_sections import inverse_matrix
from fast_bottom_forward import matmul
from verify_newton_checker_offdiag_homotopy import constant_and_linear


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, required=True)
    parser.add_argument("--c", type=int, required=True)
    parser.add_argument("--r", type=int, required=True)
    args = parser.parse_args()
    a, b = constant_and_linear(args.q)
    cols = range(args.r - args.c, args.r + 1)
    aa = [[a[i][j] for j in cols] for i in range(args.c + 1)]
    bb = [[b[i][j] for j in cols] for i in range(args.c + 1)]
    g = matmul(inverse_matrix(aa), bb)
    print("sign/support")
    for row in g:
        print(" ".join("+" if x > 0 else "-" if x < 0 else "0" for x in row))
    print("values")
    for row in g:
        print(row)


if __name__ == "__main__":
    main()
