#!/usr/bin/env python3
"""Inspect Neville weights of the two compatible interleaved factors."""

from __future__ import annotations

import argparse
from fractions import Fraction as F

from fast_bottom_forward import catalan, eye, matmul
from probe_newton_full_neville_patterns import neville_parameters
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse, jacobi_upper


def compact(x):
    return f"{x.numerator}/{x.denominator}"


def pruned_neville(matrix):
    work = [row[:] for row in matrix]
    parameters = []
    for column in range(len(work[0])):
        local = []
        for row in range(len(work) - 1, column, -1):
            denominator = work[row - 1][column]
            assert denominator != 0, (column, row)
            multiplier = work[row][column] / denominator
            assert multiplier >= 0
            local.append((row, multiplier))
            for j in range(column, len(work[0])):
                work[row][j] -= multiplier * work[row - 1][j]
        parameters.append(local)
        if column + 1 < len(work) and not any(work[column + 1]):
            work.pop(column + 1)
    return parameters, work


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=7)
    args = parser.parse_args()
    q = args.q
    u, v = jacobi_upper(q), beta_checker_inverse(q)
    r = [
        [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
        for i in range(q)
    ]
    identity = eye(q)
    p = [[identity[i][j] - r[i][j] for j in range(q)] for i in range(q)]
    up, rv, pv = matmul(u, p), matmul(r, v), matmul(p, v)

    left_rows = []
    for s in range(q):
        left_rows.extend(([up[i][s] for i in range(q)], [u[i][s] for i in range(q)]))
    left_rows = left_rows[1:]  # discard the identically zero UP column at s=0
    params, reduced = pruned_neville(left_rows)
    print("LEFT reduced", reduced)
    for c, level in enumerate(params):
        print("L", c, [(row, compact(x)) for row, x in level])

    # Reverse both axes of the right factor to turn its upper staircase into a
    # lower staircase, then discard the forced zero extreme row if present.
    right = []
    for s in range(q):
        right.extend((list(rv[s]), list(pv[s])))
    right_reversed = [list(reversed(row)) for row in reversed(right)]
    while right_reversed and not any(right_reversed[0]):
        right_reversed.pop(0)
    params, reduced = pruned_neville(right_reversed)
    print("RIGHT reduced", reduced)
    for c, level in enumerate(params):
        print("R", c, [(row, compact(x)) for row, x in level])


if __name__ == "__main__":
    main()
