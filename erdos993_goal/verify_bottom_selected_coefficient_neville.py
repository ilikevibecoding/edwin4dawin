#!/usr/bin/env python3
"""Exact two-sided Neville audit of the selected coefficient rectangle.

For q=2m+2, let C_m be the q by m matrix consisting of the monomial
coefficient columns of p_{q-m},...,p_{q-1}.  Strict total positivity of C_m
would imply strict total positivity of the bottom forward-difference matrix
by Cauchy--Binet with the Stirling transform.

This script records finite exact evidence and the equivalent low-endpoint
cancellation hierarchy.  It does not claim an all-size theorem.
"""

from __future__ import annotations

import json
from pathlib import Path

from fast_bottom_forward import polynomial_coefficient_matrix


OUT = Path("bottom_selected_coefficient_neville_certificate_20260803.json")


def strict_neville(matrix):
    work = [row[:] for row in matrix]
    rows, columns = len(work), len(work[0])
    multipliers = 0
    for column in range(min(rows - 1, columns)):
        for row in range(rows - 1, column, -1):
            denominator = work[row - 1][column]
            assert denominator > 0
            multiplier = work[row][column] / denominator
            assert multiplier > 0
            multipliers += 1
            for j in range(column, columns):
                work[row][j] -= multiplier * work[row - 1][j]
    pivots = [work[i][i] for i in range(min(rows, columns))]
    assert all(value > 0 for value in pivots)
    return multipliers, len(pivots)


def low_endpoint_hierarchy(columns):
    current = [column[:] for column in columns]
    positive_coefficients = 0
    positive_multipliers = 0
    stages = []
    while current:
        assert all(value > 0 for column in current for value in column)
        stage_coefficients = sum(len(column) for column in current)
        positive_coefficients += stage_coefficients
        stages.append(
            {
                "polynomials": len(current),
                "degree": len(current[0]) - 1,
                "positive_coefficients": stage_coefficients,
            }
        )
        following = []
        for left, right in zip(current, current[1:]):
            multiplier = right[0] / left[0]
            assert multiplier > 0
            reduced = [
                right[degree] - multiplier * left[degree]
                for degree in range(1, len(left))
            ]
            assert all(value > 0 for value in reduced)
            positive_multipliers += 1
            following.append(reduced)
        current = following
    return stages, positive_coefficients, positive_multipliers


def main() -> None:
    records = []
    total_multipliers = 0
    total_pivots = 0
    total_hierarchy_coefficients = 0
    for m in range(1, 31):
        q = 2 * m + 2
        full = polynomial_coefficient_matrix(q)
        selected = [row[q - m : q] for row in full]
        selected_transpose = [list(row) for row in zip(*selected)]
        forward_multipliers, forward_pivots = strict_neville(selected)
        transpose_multipliers, transpose_pivots = strict_neville(
            selected_transpose
        )
        assert forward_multipliers == 3 * m * (m + 1) // 2
        assert transpose_multipliers == m * (m - 1) // 2

        columns = [list(column) for column in zip(*selected)]
        stages, hierarchy_coefficients, hierarchy_multipliers = (
            low_endpoint_hierarchy(columns)
        )
        assert hierarchy_multipliers == transpose_multipliers
        records.append(
            {
                "m": m,
                "q": q,
                "forward_positive_multipliers": forward_multipliers,
                "transpose_positive_multipliers": transpose_multipliers,
                "positive_pivots_each_orientation": forward_pivots,
                "low_endpoint_positive_coefficients": hierarchy_coefficients,
                "low_endpoint_stages": stages,
            }
        )
        total_multipliers += forward_multipliers + transpose_multipliers
        total_pivots += forward_pivots + transpose_pivots
        total_hierarchy_coefficients += hierarchy_coefficients
        print(
            f"m={m} selected_neville="
            f"{forward_multipliers}+{transpose_multipliers} "
            f"low_endpoint_coefficients={hierarchy_coefficients}",
            flush=True,
        )

    report = {
        "kind": "bottom_selected_coefficient_neville_certificate",
        "status": "PASS_EXACT_SELECTED_COEFFICIENT_NEVILLE_AUDIT",
        "range": [1, 30],
        "records": records,
        "totals": {
            "positive_neville_multipliers": total_multipliers,
            "positive_neville_pivots": total_pivots,
            "positive_low_endpoint_hierarchy_coefficients": (
                total_hierarchy_coefficients
            ),
        },
        "scope": (
            "All arithmetic is exact.  These finite strict Neville and endpoint-"
            "hierarchy checks are evidence for, not a proof of, strict total "
            "positivity for every m."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
