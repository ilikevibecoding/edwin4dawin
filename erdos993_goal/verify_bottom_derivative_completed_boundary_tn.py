#!/usr/bin/env python3
"""Exact replay audit for the derivative-completed boundary basis.

For the selected fixed-q polynomial columns, repeatedly cancel the leading
term of adjacent columns.  The right boundary of this cancellation triangle
has consecutive degrees.  We verify exactly that

    selected coefficient matrix = boundary coefficient matrix * transition,

and audit both the transition and the square basis obtained by prepending all
nonzero derivatives of the lowest-degree boundary polynomial.

The finite checks are reconnaissance, not an all-size proof.
"""

from __future__ import annotations

import json
from fractions import Fraction as F
from itertools import combinations
from math import comb, factorial
from pathlib import Path

from fast_bottom_forward import determinant, polynomial_coefficient_matrix, zeros


OUT = Path("bottom_derivative_completed_boundary_tn_certificate_20260803.json")


def cancellation_triangle(m: int):
    q = 2 * m + 2
    coefficients = polynomial_coefficient_matrix(q)
    stages = [
        [
            [coefficients[degree][column] for degree in range(q)]
            for column in range(q - m, q)
        ]
    ]
    multipliers = []
    for _stage in range(m - 1):
        current = stages[-1]
        following = []
        local = []
        for left, right in zip(current, current[1:]):
            multiplier = right[-1] / left[-1]
            reduced = [
                multiplier * left[degree] - right[degree]
                for degree in range(len(left) - 1)
            ]
            assert all(value > 0 for value in reduced)
            local.append(multiplier)
            following.append(reduced)
        multipliers.append(local)
        stages.append(following)
    return stages, multipliers


def boundary_columns(stages, m: int):
    q = 2 * m + 2
    out = []
    for boundary_index in range(m):
        stage = m - 1 - boundary_index
        coefficients = stages[stage][boundary_index]
        assert len(coefficients) == m + 3 + boundary_index
        out.append(coefficients + [F(0)] * (q - len(coefficients)))
    return out


def coefficient_matrix(columns):
    return [list(row) for row in zip(*columns)]


def boundary_transition(selected, boundary):
    """Solve selected = boundary * transition by descending degree."""
    q, m = len(selected), len(selected[0])
    first_degree = q - m
    transition = zeros(m, m)
    for target in range(m):
        residual = [selected[degree][target] for degree in range(q)]
        for source in range(m - 1, -1, -1):
            pivot_degree = first_degree + source
            value = residual[pivot_degree] / boundary[pivot_degree][source]
            transition[source][target] = value
            for degree in range(pivot_degree + 1):
                residual[degree] -= value * boundary[degree][source]
        assert all(value == 0 for value in residual)
    return transition


def derivative(coefficients, order: int):
    out = coefficients[:]
    for _ in range(order):
        out = [F(degree + 1) * out[degree + 1] for degree in range(len(out) - 1)]
    return out


def derivative_completed_matrix(boundary_columns_, m: int):
    q = 2 * m + 2
    phi0 = boundary_columns_[0]
    degree0 = m + 2
    assert all(value == 0 for value in phi0[degree0 + 1 :])
    columns = []
    for order in range(degree0, 0, -1):
        column = derivative(phi0[: degree0 + 1], order)
        columns.append(column + [F(0)] * (q - len(column)))
    columns.extend(boundary_columns_)
    assert len(columns) == q
    matrix = coefficient_matrix(columns)
    assert all(matrix[row][column] == 0 for row in range(q) for column in range(row))
    assert all(matrix[i][i] > 0 for i in range(q))
    return matrix


def exhaustive_nonnegative_minors(matrix):
    rows, columns = len(matrix), len(matrix[0])
    positive = zero = negative = 0
    by_order = []
    for order in range(1, min(rows, columns) + 1):
        local_positive = local_zero = 0
        for row_set in combinations(range(rows), order):
            for column_set in combinations(range(columns), order):
                value = determinant(
                    [[matrix[i][j] for j in column_set] for i in row_set]
                )
                positive += value > 0
                zero += value == 0
                negative += value < 0
                local_positive += value > 0
                local_zero += value == 0
        by_order.append(
            {"order": order, "positive": local_positive, "zero": local_zero}
        )
    assert negative == 0
    return positive, zero, by_order


def transpose_neville(matrix):
    """Neville-eliminate M^T; M itself is already upper triangular."""
    work = [list(row) for row in zip(*matrix)]
    n = len(work)
    multipliers = []
    for column in range(n - 1):
        for row in range(n - 1, column, -1):
            denominator = work[row - 1][column]
            assert denominator > 0, ("denominator", column, row)
            multiplier = work[row][column] / denominator
            assert multiplier > 0, ("multiplier", column, row, multiplier == 0)
            multipliers.append(multiplier)
            for j in range(column, n):
                work[row][j] -= multiplier * work[row - 1][j]
    pivots = [work[i][i] for i in range(n)]
    assert all(value > 0 for value in pivots)
    assert all(work[i][j] == 0 for j in range(n) for i in range(j + 1, n))
    return multipliers, pivots


def rectangular_neville(matrix):
    """Neville elimination with exact zero handling for a rectangle."""
    work = [row[:] for row in matrix]
    rows, columns = len(work), len(work[0])
    positive = zero = 0
    for column in range(min(rows - 1, columns)):
        for row in range(rows - 1, column, -1):
            numerator = work[row][column]
            denominator = work[row - 1][column]
            if denominator == 0:
                if numerator != 0:
                    return {
                        "status": "ZERO_DENOMINATOR_OBSTRUCTION",
                        "column": column,
                        "row": row,
                        "positive": positive,
                        "zero": zero,
                    }
                zero += 1
                continue
            multiplier = numerator / denominator
            if multiplier < 0:
                return {
                    "status": "NEGATIVE_MULTIPLIER",
                    "column": column,
                    "row": row,
                    "positive": positive,
                    "zero": zero,
                }
            if multiplier == 0:
                zero += 1
            else:
                positive += 1
            for j in range(column, columns):
                work[row][j] -= multiplier * work[row - 1][j]
    pivots = [work[i][i] for i in range(min(rows, columns))]
    if any(value <= 0 for value in pivots):
        return {
            "status": "NONPOSITIVE_PIVOT",
            "pivot": next(i for i, value in enumerate(pivots) if value <= 0),
            "positive": positive,
            "zero": zero,
        }
    return {
        "status": "PASS",
        "positive": positive,
        "zero": zero,
        "positive_pivots": len(pivots),
    }


def matmul(a, b):
    rows, inner, columns = len(a), len(b), len(b[0])
    out = zeros(rows, columns)
    for i in range(rows):
        for k in range(inner):
            if a[i][k]:
                for j in range(columns):
                    out[i][j] += a[i][k] * b[k][j]
    return out


def first_transpose_neville_failure(matrix):
    work = [list(row) for row in zip(*matrix)]
    n = len(work)
    positive = 0
    for column in range(n - 1):
        for row in range(n - 1, column, -1):
            denominator = work[row - 1][column]
            if denominator <= 0:
                return {
                    "status": "NONPOSITIVE_DENOMINATOR",
                    "column": column,
                    "row": row,
                    "positive_before_failure": positive,
                }
            multiplier = work[row][column] / denominator
            if multiplier <= 0:
                return {
                    "status": "NONPOSITIVE_MULTIPLIER",
                    "column": column,
                    "row": row,
                    "zero": multiplier == 0,
                    "positive_before_failure": positive,
                }
            positive += 1
            for j in range(column, n):
                work[row][j] -= multiplier * work[row - 1][j]
    return {"status": "PASS", "positive_multipliers": positive}


def main() -> None:
    construction_records = []
    exhaustive_records = []
    neville_records = []

    for m in range(1, 20):
        q = 2 * m + 2
        stages, cancellation_multipliers = cancellation_triangle(m)
        boundary_columns_ = boundary_columns(stages, m)
        boundary = coefficient_matrix(boundary_columns_)
        full = polynomial_coefficient_matrix(q)
        selected = [row[q - m : q] for row in full]
        transition = boundary_transition(selected, boundary)
        assert matmul(boundary, transition) == selected
        assert all(value >= 0 for row in transition for value in row)
        transition_positive_entries = sum(
            value > 0 for row in transition for value in row
        )
        assert transition_positive_entries == m * (m + 1) // 2

        boundary_neville = rectangular_neville(boundary)
        boundary_transpose_neville = rectangular_neville(
            [list(row) for row in zip(*boundary)]
        )
        transition_neville = rectangular_neville(transition)
        transition_transpose_neville = rectangular_neville(
            [list(row) for row in zip(*transition)]
        )
        assert boundary_neville["status"] == "PASS"
        assert boundary_transpose_neville["status"] == "PASS"
        assert transition_neville["status"] == "PASS"
        assert transition_transpose_neville["status"] == "PASS"

        completed = derivative_completed_matrix(boundary_columns_, m)
        neville_multipliers, pivots = transpose_neville(completed)
        construction_records.append(
            {
                "m": m,
                "q": q,
                "positive_cancellation_multipliers": sum(
                    len(row) for row in cancellation_multipliers
                ),
                "positive_transition_entries": transition_positive_entries,
                "boundary_neville": boundary_neville,
                "boundary_transpose_neville": boundary_transpose_neville,
                "transition_neville": transition_neville,
                "transition_transpose_neville": transition_transpose_neville,
            }
        )
        neville_records.append(
            {
                "m": m,
                "q": q,
                "positive_transpose_neville_multipliers": len(neville_multipliers),
                "positive_pivots": len(pivots),
            }
        )
        print(
            f"m={m} exact_identity transition_positive={transition_positive_entries} "
            f"neville_positive={len(neville_multipliers)}",
            flush=True,
        )

        if m <= 4:
            t_positive, t_zero, t_by_order = exhaustive_nonnegative_minors(transition)
            c_positive, c_zero, c_by_order = exhaustive_nonnegative_minors(completed)
            expected_completed = comb(2 * q, q) - 1
            assert c_positive + c_zero == expected_completed
            exhaustive_records.append(
                {
                    "m": m,
                    "transition": {
                        "positive": t_positive,
                        "zero": t_zero,
                        "by_order": t_by_order,
                    },
                    "derivative_completed": {
                        "positive": c_positive,
                        "zero": c_zero,
                        "all_minors": expected_completed,
                        "by_order": c_by_order,
                    },
                }
            )

    # The tempting square derivative completion first fails at m=20.
    # Its exact negative minor is recorded explicitly, while the smaller
    # boundary and transition factors still pass their direct eliminations.
    obstruction_m = 20
    obstruction_q = 2 * obstruction_m + 2
    stages, cancellation_multipliers = cancellation_triangle(obstruction_m)
    obstruction_boundary_columns = boundary_columns(stages, obstruction_m)
    obstruction_boundary = coefficient_matrix(obstruction_boundary_columns)
    full = polynomial_coefficient_matrix(obstruction_q)
    selected = [row[obstruction_q - obstruction_m : obstruction_q] for row in full]
    transition = boundary_transition(selected, obstruction_boundary)
    assert matmul(obstruction_boundary, transition) == selected
    boundary_neville_m20 = rectangular_neville(obstruction_boundary)
    boundary_transpose_neville_m20 = rectangular_neville(
        [list(row) for row in zip(*obstruction_boundary)]
    )
    transition_neville_m20 = rectangular_neville(transition)
    transition_transpose_neville_m20 = rectangular_neville(
        [list(row) for row in zip(*transition)]
    )
    assert all(
        record["status"] == "PASS"
        for record in (
            boundary_neville_m20,
            boundary_transpose_neville_m20,
            transition_neville_m20,
            transition_transpose_neville_m20,
        )
    )
    completed_m20 = derivative_completed_matrix(
        obstruction_boundary_columns, obstruction_m
    )
    completion_obstruction = first_transpose_neville_failure(completed_m20)
    assert completion_obstruction == {
        "status": "NONPOSITIVE_MULTIPLIER",
        "column": 25,
        "row": 41,
        "zero": False,
        "positive_before_failure": completion_obstruction["positive_before_failure"],
    }
    witness_rows = list(range(26))
    witness_columns = list(range(16, 42))
    witness = determinant(
        [[completed_m20[i][j] for j in witness_columns] for i in witness_rows]
    )
    assert witness < 0
    completion_obstruction["negative_minor_witness"] = {
        "matrix_rows": witness_rows,
        "matrix_columns": witness_columns,
        "order": 26,
        "sign": -1,
        "absolute_numerator_bits": abs(witness.numerator).bit_length(),
        "denominator_bits": witness.denominator.bit_length(),
    }
    construction_records.append(
        {
            "m": obstruction_m,
            "q": obstruction_q,
            "positive_cancellation_multipliers": sum(
                len(row) for row in cancellation_multipliers
            ),
            "positive_transition_entries": obstruction_m * (obstruction_m + 1) // 2,
            "boundary_neville": boundary_neville_m20,
            "boundary_transpose_neville": boundary_transpose_neville_m20,
            "transition_neville": transition_neville_m20,
            "transition_transpose_neville": transition_transpose_neville_m20,
        }
    )

    report = {
        "kind": "bottom_derivative_completed_boundary_tn_certificate",
        "status": "PASS_EXACT_BOUNDARY_AUDIT_WITH_COMPLETION_OBSTRUCTION_M20",
        "construction_range": [1, 20],
        "exhaustive_minor_range": [1, 4],
        "construction_records": construction_records,
        "exhaustive_records": exhaustive_records,
        "neville_records": neville_records,
        "derivative_completion_exact_obstruction_m20": completion_obstruction,
        "totals": {
            "exhaustive_completed_minors": sum(
                item["derivative_completed"]["all_minors"]
                for item in exhaustive_records
            ),
            "positive_transpose_neville_multipliers": sum(
                item["positive_transpose_neville_multipliers"]
                for item in neville_records
            ),
        },
        "scope": (
            "All arithmetic is exact.  The derivative-completed square matrix is "
            "not totally nonnegative in every size: the explicit m=20 minor is "
            "negative.  The direct boundary and transition eliminations still "
            "pass through m=20, but these finite audits are not an all-size proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
