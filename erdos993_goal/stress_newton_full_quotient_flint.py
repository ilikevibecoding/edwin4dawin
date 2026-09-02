#!/usr/bin/env python3
"""Fast exact FLINT stress test of the full Newton quotient Y_q.

This is independent of the Fraction-based verifier.  It constructs

    Y_q = L_q^(-1) B_q K_d J H_q J,   d=q+1,

over FLINT rationals and checks the signs in both complete Neville
eliminations.  Passing a size is finite evidence, not an all-order proof.
"""

from __future__ import annotations

import argparse
from math import comb
from time import perf_counter

from flint import fmpq, fmpq_mat


def catalan(n: int) -> int:
    return comb(2 * n, n) // (n + 1)


def multiply_linear(poly, constant):
    out = [fmpq(0) for _ in range(len(poly) + 1)]
    for degree, value in enumerate(poly):
        out[degree] += constant * value
        out[degree + 1] += value
    return out


def beta_matrix(q: int):
    matrix = fmpq_mat(q, q)
    for p in range(q):
        poly = [fmpq(4**p)]
        for i in range(p):
            poly = multiply_linear(poly, fmpq(7 + 2 * i, 2))
        for i in range(q - 1 - p):
            poly = multiply_linear(poly, fmpq(p + 5 + i))
        for degree, value in enumerate(poly):
            matrix[degree, p] = value
    return matrix


def newton_lower(q: int):
    matrix = fmpq_mat(q, q)
    n = q - 1
    for r in range(q):
        poly = [fmpq(0)] * r + [fmpq(1)]
        for i in range(r, n):
            following = [fmpq(0) for _ in range(len(poly) + 1)]
            for degree, value in enumerate(poly):
                following[degree] += value
                following[degree + 1] += value / (i + 5)
            poly = following
        for degree, value in enumerate(poly):
            matrix[degree, r] = value
    return matrix


def central_inverse(q: int):
    """Return Z_d=K_d^(-1), where d=q+1."""
    d = q + 1
    matrix = fmpq_mat(q, q)
    for i in range(q):
        p = i + 1
        for j in range(i, q):
            end = j + 1
            convolution = sum(
                (
                    fmpq(
                        catalan(r - p + 1) * catalan(end - r + 1),
                        comb(d, r),
                    )
                    for r in range(p, end + 1)
                ),
                fmpq(0),
            )
            diagonal = fmpq(1, comb(d - 2, i)) if i == j else fmpq(0)
            matrix[i, j] = diagonal - convolution
    return matrix


def reversed_catalan_hankel(q: int):
    return fmpq_mat(
        q,
        q,
        [catalan(2 * q + 1 - i - j) for i in range(q) for j in range(q)],
    )


def quotient(q: int):
    lower = newton_lower(q)
    beta = beta_matrix(q)
    z = central_inverse(q)
    return lower.inv() * beta * z.inv() * reversed_catalan_hankel(q)


def neville(matrix, transpose=False):
    q = matrix.nrows()
    if transpose:
        work = [[matrix[j, i] for j in range(q)] for i in range(q)]
    else:
        work = [[matrix[i, j] for j in range(q)] for i in range(q)]
    positive = 0
    minimum = None
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            denominator = work[row - 1][column]
            if denominator == 0:
                return "ZERO_DENOMINATOR", positive, (column, row, denominator)
            multiplier = work[row][column] / denominator
            if multiplier <= 0:
                return "NONPOSITIVE", positive, (column, row, multiplier)
            positive += 1
            minimum = multiplier if minimum is None or multiplier < minimum else minimum
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    for i in range(q):
        if work[i][i] <= 0:
            return "NONPOSITIVE_PIVOT", positive, (i, i, work[i][i])
    return "PASS", positive, minimum


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sizes", nargs="+", type=int)
    args = parser.parse_args()
    for q in args.sizes:
        started = perf_counter()
        matrix = quotient(q)
        built = perf_counter()
        forward = neville(matrix)
        middle = perf_counter()
        transpose = neville(matrix, transpose=True)
        finished = perf_counter()
        assert forward[0] == transpose[0] == "PASS", (q, forward, transpose)
        print(
            f"q={q} PASS build={built-started:.3f}s "
            f"forward={middle-built:.3f}s transpose={finished-middle:.3f}s "
            f"multipliers={forward[1]}+{transpose[1]}",
            flush=True,
        )


if __name__ == "__main__":
    main()
