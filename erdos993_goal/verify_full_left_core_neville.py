#!/usr/bin/env python3
"""Exact audit of the twice-reduced full-left coefficient matrix.

Starting from paired columns E_m,O_m, make the two positive reductions

    D_m = E_m - 4 O_m,
    R_m = 8(m+1)(2m+7) O_m - D_{m+1}.

The original coefficient matrix is recovered from the interleaved core
matrix D_0,R_0,D_1,R_1,... by two totally nonnegative bidiagonal/block
bidiagonal right factors.  The complete Neville parameters of the core
have a particularly simple proposed all-order form.  This verifier builds
the columns independently and checks that form using exact arithmetic.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from pathlib import Path

import sympy as sp

from verify_full_left_factorial_factorization import falling_coefficient
from verify_left_newton_wronskian import polynomial_columns


OUT = Path("full_left_core_neville_20260803.json")


def rational(value):
    value = sp.Rational(value)
    return F(int(value.p), int(value.q))


def core_matrix(size):
    # Two extra original columns supply D_{m+1} for the final R_m.
    original = polynomial_columns(size + 2)
    pair_count = (size + 1) // 2
    d_columns = [
        sp.expand(original[2 * m] - 4 * original[2 * m + 1])
        for m in range(pair_count + 1)
    ]
    columns = []
    for m in range(pair_count):
        columns.append(d_columns[m])
        if len(columns) < size:
            columns.append(
                sp.expand(
                    8 * (m + 1) * (2 * m + 7) * original[2 * m + 1]
                    - d_columns[m + 1]
                )
            )
    return [
        [rational(falling_coefficient(columns[j], i)) for j in range(size)]
        for i in range(size)
    ]


def neville(matrix):
    a = [row[:] for row in matrix]
    size = len(a)
    multipliers = {}
    for column in range(size):
        for row in range(size - 1, column, -1):
            denominator = a[row - 1][column]
            numerator = a[row][column]
            if denominator:
                value = numerator / denominator
                if value:
                    multipliers[(row, column)] = value
                for k in range(column, size):
                    a[row][k] -= value * a[row - 1][k]
            elif numerator:
                raise AssertionError(f"exchange required at {(row, column)}")
    return [a[i][i] for i in range(size)], multipliers


def core_pivot(index):
    if index % 2 == 0:
        m = index // 2
        return F(2 * (2 * m + 1) * (2 * m + 5) * (4 * m + 3))
    m = (index - 1) // 2
    return F(
        2
        * (m + 1)
        * (2 * m + 3)
        * (2 * m + 5)
        * (2 * m + 7)
        * (4 * m + 5),
        m + 2,
    )


def core_left(row, column):
    if row != column + 1:
        return F(0)
    if column % 2 == 0:
        m = column // 2
        if m == 0:
            return F(0)
        return F(4 * m, (2 * m + 1) * (4 * m + 3))
    m = (column - 1) // 2
    return F(2 * m + 1, (m + 1) * (4 * m + 5))


def core_right(row, column):
    if row % 2 == 0:
        r = row // 2
        if r <= column <= 2 * r - 1:
            return F(1)
        return F(0)
    r = (row - 1) // 2
    if r + 1 <= column <= 2 * r:
        return F(2 * (r + 1) * (2 * r + 7))
    return F(0)


def compare(actual, formula, size):
    mismatches = []
    for column in range(size):
        for row in range(column + 1, size):
            got = actual.get((row, column), F(0))
            expected = formula(row, column)
            if got != expected:
                mismatches.append(
                    [row, column, str(got), str(expected)]
                )
    return mismatches


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=32)
    args = parser.parse_args()

    matrix = core_matrix(args.size)
    transpose = [list(row) for row in zip(*matrix)]
    pivots, left = neville(matrix)
    transpose_pivots, right = neville(transpose)
    expected_pivots = [core_pivot(i) for i in range(args.size)]
    pivot_mismatches = [
        [i, str(pivots[i]), str(transpose_pivots[i]), str(expected_pivots[i])]
        for i in range(args.size)
        if pivots[i] != expected_pivots[i]
        or transpose_pivots[i] != expected_pivots[i]
    ]
    left_mismatches = compare(left, core_left, args.size)
    right_mismatches = compare(right, core_right, args.size)
    all_positive = all(
        value > 0
        for value in expected_pivots + list(left.values()) + list(right.values())
    )
    status = "PASS" if not (
        pivot_mismatches or left_mismatches or right_mismatches
    ) and all_positive else "FAIL"
    report = {
        "status": status,
        "size": args.size,
        "pivots_checked": args.size,
        "left_nonzero_multipliers": len(left),
        "right_nonzero_multipliers": len(right),
        "pivot_mismatches": pivot_mismatches,
        "left_mismatches": left_mismatches,
        "right_mismatches": right_mismatches,
        "all_observed_and_proposed_nonzero_parameters_positive": all_positive,
        "scope": (
            "Exact finite verification of the twice-reduced core Neville "
            "pattern.  The two right reductions are algebraic and TN; the "
            "all-index derivation is supplied independently by "
            "prove_full_left_core_network.py."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status, report)


if __name__ == "__main__":
    main()
