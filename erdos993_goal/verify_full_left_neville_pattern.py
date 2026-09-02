#!/usr/bin/env python3
"""Exact audit of the conjectured all-width Neville factorization.

For the falling-factorial coefficient matrix of

    rho X_0, rho h_0, rho X_1, rho h_1, ...,

the complete Neville elimination has an unexpectedly sparse closed form.
This program computes the matrix independently from the polynomial columns,
performs exact rational elimination on both the matrix and its transpose,
and compares every pivot and multiplier with the proposed formulas.

A finite PASS is not an all-order proof.  The formulas in this file are the
precise symbolic target whose direct verification would supply a positive
bidiagonal (Loewner--Whitney) factorization at every width.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from pathlib import Path

import sympy as sp

from verify_full_left_factorial_factorization import coefficient_matrix


OUT = Path("full_left_neville_pattern_20260803.json")


def rational(value):
    value = sp.Rational(value)
    return F(int(value.p), int(value.q))


def neville_elimination(matrix):
    """Return diagonal pivots and nonzero Neville multipliers exactly."""
    a = [row[:] for row in matrix]
    size = len(a)
    multipliers = {}
    for column in range(size):
        for row in range(size - 1, column, -1):
            denominator = a[row - 1][column]
            numerator = a[row][column]
            if denominator:
                multiplier = numerator / denominator
                if multiplier:
                    multipliers[(row, column)] = multiplier
                for k in range(column, size):
                    a[row][k] -= multiplier * a[row - 1][k]
            elif numerator:
                raise AssertionError(
                    f"Neville elimination requires an exchange at {(row, column)}"
                )
    off_diagonal = [
        (i, j, a[i][j])
        for i in range(size)
        for j in range(size)
        if i != j and a[i][j]
    ]
    # The first pass on a matrix is upper triangular, not diagonal.  The
    # caller needs only its diagonal, which consists of the Neville pivots.
    return [a[i][i] for i in range(size)], multipliers, off_diagonal


def pivot(index):
    if index % 2 == 0:
        m = index // 2
        return F(
            (m + 2) * (2 * m + 1) * (2 * m + 3) * (2 * m + 5) * (4 * m + 3),
            3,
        )
    m = (index - 1) // 2
    return F(3 * (2 * m + 5) * (4 * m + 5), 2 * (m + 1) * (m + 2))


def lower_multiplier(row, column):
    """Proposed multiplier for elimination of the original matrix."""
    if column % 2 == 0:
        m = column // 2
        gap = row - column
        if gap == 1:
            if m == 0:
                return F(5, 2)
            return F(4 * (m + 1) * (m + 3), (m + 2) * (2 * m + 1) * (4 * m + 3))
        if gap == 2:
            if m == 0:
                return F(12, 25)
            return F(3, (m + 1) * (2 * m + 5))
        if gap == 3:
            return F(1, (m + 3) * (2 * m + 3))
        return F(0)

    m = (column - 1) // 2
    if row == column + 1 and m >= 1:
        return F(
            (2 * m - 1) * (2 * m + 3),
            (m + 1) * (2 * m + 5) * (4 * m + 5),
        )
    return F(0)


def upper_multiplier(row, column):
    """Proposed multiplier for elimination of the transpose."""
    if row % 2 == 0:
        r = row // 2
        k = column - r
        if 0 <= k <= r - 1:
            return F(
                2 * r * (2 * r + 5) * (k + 1) * (k + 2) * (2 * k + 3) ** 2,
                9,
            )
        return F(0)

    r = (row - 1) // 2
    q = column - r - 1
    if 0 <= q <= r - 1:
        return F(9, (q + 1) * (q + 3) * (2 * q + 3) * (2 * q + 5))
    return F(0)


def compare(actual, proposed, size):
    mismatches = []
    for column in range(size):
        for row in range(column + 1, size):
            got = actual.get((row, column), F(0))
            expected = proposed(row, column)
            if got != expected:
                mismatches.append(
                    {
                        "row": row,
                        "column": column,
                        "actual": str(got),
                        "expected": str(expected),
                    }
                )
    return mismatches


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=24)
    args = parser.parse_args()

    symbolic = coefficient_matrix(args.size)
    matrix = [
        [rational(symbolic[i][j]) for j in range(args.size)]
        for i in range(args.size)
    ]
    transpose = [list(row) for row in zip(*matrix)]

    left_pivots, left, _ = neville_elimination(matrix)
    right_pivots, right, _ = neville_elimination(transpose)
    expected_pivots = [pivot(i) for i in range(args.size)]
    pivot_mismatches = [
        {
            "index": i,
            "left": str(left_pivots[i]),
            "right": str(right_pivots[i]),
            "expected": str(expected_pivots[i]),
        }
        for i in range(args.size)
        if left_pivots[i] != expected_pivots[i]
        or right_pivots[i] != expected_pivots[i]
    ]
    left_mismatches = compare(left, lower_multiplier, args.size)
    right_mismatches = compare(right, upper_multiplier, args.size)

    all_values = (
        expected_pivots
        + list(left.values())
        + list(right.values())
    )
    nonpositive = [str(value) for value in all_values if value <= 0]
    status = "PASS" if not (
        pivot_mismatches or left_mismatches or right_mismatches or nonpositive
    ) else "FAIL"
    report = {
        "status": status,
        "size": args.size,
        "pivots_checked": args.size,
        "left_nonzero_multipliers": len(left),
        "right_nonzero_multipliers": len(right),
        "pivot_mismatches": pivot_mismatches,
        "left_mismatches": left_mismatches,
        "right_mismatches": right_mismatches,
        "nonpositive_proposed_or_observed_values": nonpositive,
        "scope": (
            "Exact finite discovery/verification of the proposed complete "
            "Neville parameters.  An algebraic all-index verification is "
            "still required before invoking the Loewner--Whitney theorem."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status, report)


if __name__ == "__main__":
    main()
