#!/usr/bin/env python3
"""Test whether consecutive selected rectangles are diagonally nested.

For each m, C_m has shape (2m+2) by m and C_{m+1} has shape
(2m+4) by (m+1).  We test every submatrix of the latter having the former
shape, and ask whether it differs from C_m only by positive row and column
scalings.  Failure rules out the most direct embedding in one master array.
All comparisons use exact rational arithmetic.
"""

from itertools import combinations

from fast_bottom_forward import polynomial_coefficient_matrix


def selected(m):
    q = 2 * m + 2
    full = polynomial_coefficient_matrix(q)
    return [row[q - m : q] for row in full]


def diagonally_equivalent(a, b):
    """Return positive gauges A=diag(r) B diag(c), or None."""
    rows, columns = len(a), len(a[0])
    row_gauge = [a[i][0] / b[i][0] for i in range(rows)]
    column_gauge = [
        a[0][j] / (row_gauge[0] * b[0][j]) for j in range(columns)
    ]
    if not all(value > 0 for value in row_gauge + column_gauge):
        return None
    if any(
        a[i][j] != row_gauge[i] * b[i][j] * column_gauge[j]
        for i in range(rows)
        for j in range(columns)
    ):
        return None
    return row_gauge, column_gauge


def embeddings(m):
    small = selected(m)
    large = selected(m + 1)
    large_rows, large_columns = len(large), len(large[0])
    hits = []
    for deleted_rows in combinations(range(large_rows), 2):
        kept_rows = [i for i in range(large_rows) if i not in deleted_rows]
        for deleted_column in range(large_columns):
            kept_columns = [
                j for j in range(large_columns) if j != deleted_column
            ]
            submatrix = [
                [large[i][j] for j in kept_columns] for i in kept_rows
            ]
            gauges = diagonally_equivalent(small, submatrix)
            if gauges is not None:
                hits.append((deleted_rows, deleted_column, gauges))
    return hits


def main():
    for m in range(2, 9):
        hits = embeddings(m)
        signatures = [
            {"deleted_rows": rows, "deleted_column": column}
            for rows, column, _ in hits
        ]
        print(f"m={m} hits={len(hits)} signatures={signatures}")


if __name__ == "__main__":
    main()
