#!/usr/bin/env python3
"""Test Schur-complement nesting of consecutive full Newton matrices."""

from probe_newton_full_neville_patterns import transformed
from probe_selected_nested_embedding import diagonally_equivalent


def schur_delete(matrix, pivot_row, pivot_column):
    rows = [row for row in range(len(matrix)) if row != pivot_row]
    columns = [column for column in range(len(matrix)) if column != pivot_column]
    pivot = matrix[pivot_row][pivot_column]
    return [
        [
            matrix[row][column]
            - matrix[row][pivot_column] * matrix[pivot_row][column] / pivot
            for column in columns
        ]
        for row in rows
    ]


def matches(q):
    small = transformed(q)
    large = transformed(q + 1)
    out = []
    for pivot_row in range(q + 1):
        for pivot_column in range(q + 1):
            candidate = schur_delete(large, pivot_row, pivot_column)
            if all(value > 0 for row in candidate for value in row):
                if diagonally_equivalent(small, candidate) is not None:
                    out.append((pivot_row, pivot_column))
    return out


def main():
    for q in range(2, 10):
        print(f"q={q} schur_matches={matches(q)}")


if __name__ == "__main__":
    main()
